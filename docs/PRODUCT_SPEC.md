# Hosil — Product Spec (source of truth for product)

> Status: v0.1 · 9 Nov 2026 · Owner: Abdulazizkhon Abdulmajid (CEO) · Tech owner: Ikrom Abdullayev (CTO)
> If any other doc or the code disagrees with this file on *what the product does*, this file wins.
> `BACKEND_SPEC.md` wins on *how data and APIs work*. `DESIGN_SYSTEM.md` wins on *how it looks*.

## 1. One-line pitch
Hosil connects Uzbek farmers directly with restaurants. Farmers list their harvest; restaurants find farmers, sign supply contracts and track deliveries. Hosil earns **1% from the restaurant and 1% from the farmer** on every order. No subscription.

## 2. Problem
- Restaurants buy produce through bazaars and resellers: prices vary daily, quality is inconsistent, and someone has to go to the bazaar.
- Farmers sell to intermediaries at low prices, with no guaranteed demand and no view of what restaurants need.
- Neither side has contracts, delivery tracking or sales data.

## 3. Users
| User | Who | Main job |
|---|---|---|
| Farmer | Small and mid-size farms (2–40 ha), Tashkent region first | Sell more of the harvest at a fair price, with guaranteed buyers |
| Restaurant | Restaurants, cafés, plov centres in Tashkent | Get reliable produce at stable prices without bazaar runs |
| Hosil HQ (ops) | The Hosil team | Grow deals, unblock pending connections, watch platform health |

Out of scope: bazaars, retailers and supermarkets.

## 4. Three windows (MVP scope)

### 4.1 Farmer window
| ID | Feature | Acceptance criteria |
|---|---|---|
| F1 | **Available restaurants to partner with** | Lists restaurants whose weekly demand overlaps the farmer's listed crops. Each demand line shows kg/week, estimated monthly value at the farmer's price, and its status: Partner, Pending or Open. "Offer partnership" opens the contract builder. |
| F2 | **Add produce (listing)** | Farmer types crop, variety, quantity (kg), price (so'm/kg), harvest window and grade. The form shows today's market price as a hint. When published, the listing is visible to restaurants and to Hosil AI immediately, and restaurants that buy that crop get a notification. |
| F3 | **Infographics** | (a) % of each harvest sold (ring per crop) and in total; (b) the farmer's price vs the Tashkent market average over 12 weeks; (c) net revenue by month; (d) season revenue after the 1% fee. |
| F4 | **Partnership requests** | Incoming contract proposals from restaurants, newest first, with value to the farmer. The farmer can review the auto-generated contract, then Accept & sign or Decline. |
| F5 | **Contracts** | Tabs: All, Needs your signature, Sent, Active, Past. |
| F6 | **Deliveries and payouts** | Overview lists the farmer's next deliveries and recent payouts. A payout is the delivery value minus 1%, paid when the restaurant confirms quality. "Can't deliver" on a scheduled delivery triggers automatic replacement (see R5). |

### 4.2 Restaurant window
| ID | Feature | Acceptance criteria |
|---|---|---|
| R1 | **AI connector to order flow ("Hosil AI")** | A free-text box ("200 kg tomatoes and 120 kg cucumbers every week, under 13 000 so'm"). It understands English, Uzbek and Russian product names, quantities in kg or tonnes, weekly or twice-weekly frequency, and a budget ceiling. It returns ranked farmers per product with a score and reasons. "Fill my supply gaps" builds the request from uncovered weekly needs. "Send all" turns the best matches into contract proposals in one click. |
| R2 | **Recommendations of available farmers** | Grid of farms with stock, ranked for this restaurant. Filters: search, produce, distance; sort by best match, price, distance or rating. |
| R3 | **Approach and make the contract** | The contract builder takes produce, kg per delivery, price, frequency, length (4/8/12/24 weeks), first delivery and a note. A live summary shows contract value, +1%/−1% fees and the Hosil fee. "Sign & send" creates the contract with the restaurant's signature. |
| R4 | **Supply tracking** | Weekly coverage per product (needed vs contracted), deliveries this week, KPIs: active suppliers, monthly spend, savings vs market, next delivery. Each delivery opens a tracker: Picked up (handover photo) → On the way → Delivered → Quality confirmed, farmer paid. The restaurant confirms or rejects after delivery. |
| R5 | **Automatic farm replacement** | When a farm can't make a delivery (flagged by the farmer, or by HQ on the farmer's behalf), Hosil moves that one delivery to the next-best farm with enough stock, using the same ranking as Hosil AI. The restaurant and the replacement farm are notified at once; the delivery is marked "Replaced". The rest of the contract stays with the original farm. If no farm has stock, the restaurant and HQ are alerted. |

### 4.3 Hosil HQ window
| ID | Feature | Acceptance criteria |
|---|---|---|
| H1 | **Number of deals** | KPI: contracts that are active or completed, plus how many were added today. |
| H2 | **Track of contracts** | Pipeline board (Proposed, Active, Completed, Declined) and a full table with GMV and Hosil fee per contract. |
| H3 | **Pending connections** | (a) Farmer↔restaurant proposals waiting for a signature, showing who it's waiting on and a **Nudge** action that notifies that party. (b) Farmer↔farmer connection requests (shared transport, seed swaps), with an **Introduce** action. |
| H4 | **Platform health** | GMV, Hosil revenue (2% of GMV), weekly order volume chart (the latest week equals what active contracts deliver per week), live activity feed. |
| H5 | **Path to break-even** | Active restaurants against 66 and monthly orders against 2.2B so'm, with Hosil's monthly revenue and average orders per restaurant. |

## 5. Core flows
1. **Restaurant-initiated:** the restaurant asks Hosil AI → gets ranked farmers → proposes a contract (signed by the restaurant) → the farmer gets a notification → the farmer reviews and signs → the contract becomes active → deliveries are scheduled → HQ deal count goes up.
2. **Farmer-initiated:** the farmer sees an open restaurant demand → offers a partnership (signed by the farmer) → the restaurant reviews and signs → active.
3. **New harvest:** the farmer adds produce → matching restaurants get a notification → the listing shows up in Hosil AI results.
4. **Ops:** HQ sees a proposal waiting more than 24 h → nudges → the party signs.

## 6. Business rules (must hold in demo and production)
- Fee: the restaurant pays the price × 1.01 and the farmer receives the price × 0.99. Hosil revenue is 2% of contract value.
- **Delivery is paid by the ordering business (the restaurant), per order, directly to the delivery partner.** It is never taken out of Hosil's 2%.
- Contracts have a fixed price per kg for their whole term.
- A contract becomes active only when **both** sides have signed. The initiator signs at proposal time.
- Either side can end a contract with 7 days' notice (v1: manual via support).
- Quality: handover photo at pickup; the restaurant can reject within 2 hours of delivery.
- Payout: the farmer is paid per delivery, when the restaurant confirms quality.
- Replacement: a replaced delivery is charged at the replacement farm's listed price for that one delivery (assumption, to be confirmed by the CEO).

## 7. Success metrics
- Activation: % of restaurants with ≥1 active contract within 14 days.
- Coverage: % of a restaurant's weekly produce needs under contract.
- Liquidity: median time from proposal to signature (target < 24 h).
- GMV and Hosil revenue per week; break-even at about 2.2B so'm of monthly orders (about 66 active restaurants).

## 8. Roadmap
| Phase | When | Scope |
|---|---|---|
| **0 · Demo** | Now | Front-end simulation in this repo (no server), for the investor demo video. |
| **1 · Pilot MVP** | Next 8–10 weeks | Real backend: phone/OTP login, listings, matching, contracts, e-sign, notifications (SMS + Telegram), HQ admin. 10 farmers × 10 restaurants in Tashkent. |
| **2 · Operations** | +3 months | Delivery partner integration (pickup slots, tracking, handover photo), payments through Click/Payme with automatic fee split, ratings, harvest volunteers. |
| **3 · Scale** | 2027+ | Other regions, own delivery (buying out partners), exports. |

## 9. Explicitly not in Phase 0
Real auth, a real database, payments, real AI/LLM calls, file uploads, Uzbek/Russian UI translation, mobile apps, volunteer recruiting.
