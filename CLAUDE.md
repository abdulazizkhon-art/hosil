# CLAUDE.md — Hosil

Hosil is a farm-to-restaurant platform for Uzbekistan: a farmer app, a restaurant app and a Hosil HQ admin, all on one platform. The business model is 1% from the restaurant and 1% from the farmer on every order.

## Sources of truth (read before changing anything)
1. `docs/PRODUCT_SPEC.md`: what the product does. Feature IDs (F1–F5, R1–R4, H1–H4) are referenced in commits.
2. `docs/BACKEND_SPEC.md`: entities, derived values, contract state machine, matching formula, API.
3. `docs/DESIGN_SYSTEM.md`: tokens and components. Never invent new colours.
If the code and a doc disagree, ask which one is right. If you change behaviour, update the doc in the same change.

## Current phase: 0 (demo)
- Plain HTML/CSS/JS, **no build step, no frameworks, no npm dependencies**. It must keep working by opening `index.html` or running `node server.js`.
- State: one object `S` in `js/app.js`, persisted to `localStorage` under key `hosil-demo-v1`. Seed data is in `js/data.js`. Bump `version` in the seed and the check in `app.js` if you change the data shape (currently 2).
- `streamlit_app.py` inlines the CSS and JS into an iframe and sets `window.HOSIL_EMBED`. In that mode the route is held in memory (`curHash()`), not in the URL hash, so always navigate with `go()` or plain `href="#/…"` links and never read `location.hash` directly.
- Deliveries are derived from active contracts by `deliveriesFor()`; tracking state is in `S.deliv` and one-off replacements in `S.subs`.
- Cross-tab live sync uses the `storage` event. Anything that should notify the other window must call `addActivity({ actor, to, icon, title, text, ref, link })` and then `persist()`.
- Pages are functions returning HTML strings (`farmerOverview`, `restaurantAssistant`, `adminDashboard`, …) registered in `PAGES`. Clicks go through `data-act="name"`, which maps to `actions.name(dataset, el, event)`.
- Always escape user text with `esc()`. Money is integer so'm; use `som()` (full) or `short()` (KPIs).

## Rules
- Don't break the demo flow in `docs/DEMO_SCRIPT.md`. After any change, run through it once in a browser: add produce → Hosil AI "Fill my supply gaps" → Send all → the farmer accepts → HQ deal count goes up.
- Delivery is paid by the restaurant, per order, and is never deducted from Hosil's 2%.
- All business names in seed data are invented. Don't use real restaurants or farms.
- UI copy: plain English, sentence case, short.
