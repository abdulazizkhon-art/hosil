# Hosil — Backend Spec (source of truth for data, APIs and rules)

> Status: v0.1 · 9 Nov 2026. The demo (`js/data.js`, `js/app.js`) already uses these exact entity shapes, so the real backend can replace the localStorage store without changing the UI's data model.

## 1. Recommended stack for Phase 1
| Layer | Choice | Why |
|---|---|---|
| App | **Next.js 15 (App Router) + TypeScript**, one repo | Two people can ship web UI and API in one codebase |
| DB | **PostgreSQL** (Neon or Supabase) + **Prisma** | Relational data (contracts, listings), easy migrations |
| Auth | Phone number + SMS OTP (Eskiz.uz), session cookie | Farmers don't use email; phone is the identity |
| Notifications | SMS (Eskiz) + Telegram bot, in-app feed | Telegram is how Uzbek businesses communicate |
| Jobs | Cron route / pg-boss for reminders and delivery scheduling | Nudges, "waiting 24 h" alerts |
| Hosting | Vercel + Neon, or one VPS (Docker) in-region | Cheap; switch to a local host if data-residency rules require |
| Payments (Phase 2) | Click / Payme with split settlement | Local standard |

## 2. Entities
All IDs are strings (cuid). Money is **integer so'm**. Weights are **integer kg**. Timestamps are ISO 8601 UTC.

```ts
type Role = "farmer" | "restaurant_member" | "admin";

User        { id, phone, name, role, farmerId?, restaurantId?, createdAt }

Farmer      { id, name, farm, region, district, km /* to Tashkent centre */, hectares,
              rating /* 0–5 */, reviews, verified: boolean, color, createdAt }

Restaurant  { id, name, cuisine, district, rating, seats, color,
              demand: DemandLine[], createdAt }
DemandLine  { productId, kgPerWeek }            // stored as its own table in SQL

Product     { id /* slug */, name, emoji, unit: "kg", market /* so'm/kg today */, synonyms: string[] }
PricePoint  { productId, weekStart, price }      // market history, 1 row per product per week

Listing     { id, farmerId, productId, variety, qtyKg, soldKg, pricePerKg, grade: "A"|"B",
              harvestFrom, harvestTo, createdAt }

Contract    { id, code /* HSL-0001 */, farmerId, restaurantId, listingId, productId,
              kgPerDelivery, perWeek: 1|2, deliveryDay, pricePerKg, weeks, startDate,
              status: ContractStatus, initiatedBy: "farmer"|"restaurant",
              signedByFarmer?: timestamp, signedByRestaurant?: timestamp,
              note?, createdAt, updatedAt }

Delivery    { id, contractId, scheduledFor, kg, status: "scheduled"|"picked_up"|"on_the_way"|"delivered"|"paid"|"rejected",
              handoverPhotoUrl?, deliveryFee /* paid by restaurant */, partnerRef?,
              supplierFarmerId, pricePerKg /* differ from the contract's when replaced */ }   // Phase 2
              // Demo: derived from active contracts; state in S.deliv["<contractId>|<yyyy-mm-dd>"] = { status, at }
Replacement { id, deliveryId, contractId, fromFarmerId, toFarmerId, listingId, pricePerKg, score, ts }
              // One delivery only. Chosen as the top matchListings() result from another farm with
              // available stock >= kgPerDelivery. Stock moves: original listing -kg, replacement listing +kg.
              // Demo: S.subs, keyed by the same delivery key.

Connection  { id, type: "farmer-farmer", fromId, toId, status: "pending"|"accepted"|"declined", topic, createdAt }

Activity    { id, ts, actor /* "farmer:f1" | "restaurant:r1" | "admin" */, to: string[],
              icon, title?, text, ref? /* contract id */, link? }
```

## 3. Derived values (compute, never store)
```
deliveries      = perWeek × weeks
perDelivery     = kgPerDelivery × pricePerKg
contractValue   = perDelivery × deliveries                 // GMV
restaurantPays  = contractValue × 1.01
farmerReceives  = contractValue × 0.99
hosilFee        = contractValue × 0.02
monthlyValue    = kgPerDelivery × pricePerKg × perWeek × 4.33
listing.available = qtyKg − soldKg
coverage(restaurant, product) = Σ active contracts (kgPerDelivery × perWeek) ÷ demand.kgPerWeek
```
Round money to whole so'm only when displaying or settling. Delivery fees are **not** part of the contract value.

## 4. Contract state machine
```
            ┌──────── decline (counterparty) ───────► declined
proposed ───┤
            └──────── sign (counterparty) ──────────► active ──(last delivery done)──► completed
                                                        └──(7-day notice)──► cancelled   [Phase 1]
```
- On create: `status = proposed`, and the initiator's `signedBy*` is set to now.
- `sign` is allowed only by the counterparty (farmer if `initiatedBy = restaurant`, and the other way round).
- On `active`: snap `startDate` to the next delivery weekday, generate `Delivery` rows (Phase 2), and reserve stock: `listing.soldKg += kgPerDelivery × deliveries` (capped at `qtyKg`).
- Every transition writes an `Activity` row addressed to the counterparty and `admin`.

## 5. Matching ("Hosil AI") — v1 is deterministic
Input: `productId`, `kgPerWeek`, optional `maxPrice`. Candidates: listings with `available > 0`.
```
priceS = clamp((market × 1.15 − price) / (market × 0.35), 0, 1)
distS  = clamp(1 − km / 400, 0, 1)
rateS  = clamp(rating − 4, 0, 1)
availS = clamp((available / kgPerWeek) / 12, 0, 1)        // 12 weeks of stock = full marks
score  = round(100 × (0.35·priceS + 0.25·distS + 0.20·rateS + 0.20·availS)) + (verified ? 4 : 0)
if price > maxPrice: score −= 25
score  = clamp(score, 35, 98)
```
Reasons shown to the user: % vs market, km, rating, weeks of stock, verified, over budget.
**Parsing** free text: match product synonyms (EN/UZ/RU), take the nearest number before the product as kg (`t`/`tonne` × 1000), "twice/2x" → `perWeek = 2`, "under/below/max N" → `maxPrice`. If no quantity is given, fall back to the restaurant's demand line. Phase 2 can swap the parser for an LLM call that returns this same JSON shape: `{ items: [{productId, kgPerWeek}], twice, maxPrice }`.

## 6. REST API (Phase 1)
All endpoints are JSON, auth by session cookie. `:id` paths check ownership.

| Method | Path | Who | Body / query | Returns |
|---|---|---|---|---|
| POST | `/api/auth/otp` | public | `{ phone }` | 204 |
| POST | `/api/auth/verify` | public | `{ phone, code }` | `{ user }` + cookie |
| GET | `/api/me` | any | — | `{ user, farmer?, restaurant? }` |
| GET | `/api/products` | any | — | `Product[]` with `market` |
| GET | `/api/products/:id/prices` | any | `?weeks=12` | `PricePoint[]` |
| GET | `/api/listings` | any | `?productId&farmerId&available=true` | `Listing[]` |
| POST | `/api/listings` | farmer | `{ productId, variety, qtyKg, pricePerKg, grade, harvestFrom, harvestTo }` | `Listing` (notifies matching restaurants) |
| PATCH | `/api/listings/:id` | owner farmer | partial | `Listing` |
| GET | `/api/farmers` | restaurant | `?productId&maxKm&sort=match\|price\|distance\|rating` | `FarmerCard[]` (farmer + listings + score) |
| GET | `/api/restaurants/matching` | farmer | — | restaurants with demand overlap + line status |
| POST | `/api/match` | restaurant | `{ text }` or `{ items, twice, maxPrice }` | `{ parsed, results: [{ productId, kgPerWeek, matches: [{listing, farmer, score, reasons}] }] }` |
| GET | `/api/coverage` | restaurant | — | coverage per demand line |
| GET | `/api/contracts` | farmer / restaurant / admin | `?status` | `Contract[]` (scoped to the caller) |
| POST | `/api/contracts` | farmer / restaurant | `{ listingId, restaurantId, kgPerDelivery, perWeek, weeks, pricePerKg, startDate, note }` | `Contract` (status `proposed`, initiator signed) |
| POST | `/api/contracts/bulk` | restaurant | `{ items: [...] }` | `Contract[]` ("Send all") |
| POST | `/api/contracts/:id/sign` | counterparty | — | `Contract` (status `active`) |
| POST | `/api/contracts/:id/decline` | counterparty | `{ reason? }` | `Contract` |
| GET | `/api/deliveries` | restaurant / farmer | `?from&to` | `Delivery[]` |
| GET | `/api/activity` | any | `?since` | `Activity[]` addressed to the caller |
| GET | `/api/admin/metrics` | admin | — | `{ dealsClosed, dealsToday, gmv, hosilRevenue, pending, weeklyGmv[] }` |
| GET | `/api/admin/pending` | admin | — | proposals + farmer↔farmer connections |
| POST | `/api/admin/contracts/:id/nudge` | admin | — | 204 (SMS + Telegram + activity to the counterparty) |
| POST | `/api/admin/connections/:id/introduce` | admin | — | `Connection` |

Errors: `{ error: { code, message } }` with 400 (validation), 401, 403 (not owner / not counterparty), 404, 409 (illegal state transition).

## 7. Real-time
Phase 1: the client polls `/api/activity?since=` every 10 s, or uses Server-Sent Events. The demo uses `localStorage` + the browser `storage` event to imitate this between tabs.

## 8. Validation rules
- `qtyKg` 1–1,000,000; `pricePerKg` 100–1,000,000; `kgPerDelivery` ≥ 1 and ≤ `listing.available`.
- `perWeek` ∈ {1, 2}; `weeks` ∈ {4, 8, 12, 24}; `startDate` ≥ tomorrow.
- A restaurant can't have two `proposed` contracts with the same farmer for the same product.

## 9. Security and data (Phase 1 minimum)
Rate-limit OTP; store phone numbers as E.164; scope every query by the caller's farmerId or restaurantId; give admin a separate role; keep an audit log of contract transitions (the Activity table works as one). Before launch, check with a lawyer where the database must be hosted: Uzbekistan's personal-data law has a localization requirement for citizens' personal data (this is one of the legal questions for AgroVentures).
