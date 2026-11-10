# Claude Code prompts

How to use: open this folder in Claude Code (`cd hosil-demo && claude`). It reads `CLAUDE.md` automatically. Paste **one prompt at a time**, check the result in the browser, then move to the next. Each prompt names the spec it must follow, so you don't have to re-explain the project.

---

## Part A: polishing the demo (today, optional)

The demo already works. Only use these if you want changes before recording.

**A1 · Change the names and numbers**
```
Read CLAUDE.md and js/data.js. Change the demo data so that: [describe, e.g. "the farmer I play is Ikrom's uncle's farm in Parkent, growing tomatoes, cucumbers and peppers"]. Keep every entity shape exactly as in docs/BACKEND_SPEC.md §2. Keep all business names invented. Make sure Karimov Agro (or the new f1) still ranks as the best match for tomatoes for Lola Kitchen so the demo script still works. Bump nothing else.
```

**A2 · Uzbek / Russian language toggle**
```
Add a language switch (EN / O'Z / РУ) to the top bar in js/app.js. Put all UI strings in a dictionary object at the top of app.js, keyed by English text, and translate the farmer window fully into Uzbek (Latin) and Russian. Keep product names from HOSIL_PRODUCTS translated too. Save the choice in localStorage. Don't change layout or colours (docs/DESIGN_SYSTEM.md). Then run the demo flow in docs/DEMO_SCRIPT.md and confirm nothing broke.
```

**A3 · Mobile view of the farmer app**
```
Farmers will use phones. Make the farmer window responsive below 760px: the sidebar becomes a bottom tab bar (Overview, Harvest, Restaurants, Contracts), KPI cards go 2 per row, tables become stacked cards, and modals go full screen. Use only tokens from docs/DESIGN_SYSTEM.md. Test at 390×844.
```

**A4 · Harvest volunteers tab (from the original feature list)**
```
Add a "Volunteers" page to the farmer window per docs/PRODUCT_SPEC.md roadmap phase 2: the farmer posts a harvest day (crop, date, location, number of people, what volunteers get: meals, produce, certificate). Show posts on a new public page #/volunteers with a "Join" button that increments the count and notifies the farmer through addActivity. Add a Volunteer entity to docs/BACKEND_SPEC.md §2 first, then build it. Keep it clearly voluntary in the copy.
```

---

## Part B: building the real Phase 1 MVP (next weeks)

Run these in a **new folder** (`hosil-app`). Copy the `docs/` folder and `CLAUDE.md` from this demo into it first, so the specs travel with the code.

**B0 · Plan before code**
```
Read CLAUDE.md and every file in docs/. We are starting Phase 1 (pilot MVP) from docs/PRODUCT_SPEC.md §8. Don't write code yet. Produce PLAN.md with: the folder structure for a Next.js 15 App Router + TypeScript + Prisma + PostgreSQL app; the Prisma schema derived exactly from docs/BACKEND_SPEC.md §2; the list of API routes from §6; milestones of 1–2 days each, each ending with something I can click; and open questions for me. Update CLAUDE.md so its "Current phase" section describes Phase 1 and the new stack.
```

**B1 · Project skeleton and database**
```
Follow PLAN.md milestone 1. Create the Next.js app, Prisma schema and a seed script that loads the same farmers, restaurants, products, listings and contracts as the demo's js/data.js (port that file to prisma/seed.ts). Use integer so'm and integer kg. Add npm scripts: dev, db:migrate, db:seed. Give me exact commands to run Postgres locally with Docker. Stop when `npm run dev` shows a page that lists products from the database.
```

**B2 · Phone login**
```
Implement phone + OTP login per docs/BACKEND_SPEC.md §1 and §6 (/api/auth/otp, /api/auth/verify, /api/me). In development, print the OTP code to the server console instead of sending SMS; put the Eskiz.uz SMS sender behind an interface so it can be switched on later with env vars. Sessions use an httpOnly cookie. Three roles: farmer, restaurant_member, admin. Add middleware so /farmer/*, /restaurant/* and /admin/* require the right role. Write tests for the OTP rate limit (max 3 per 10 minutes per phone).
```

**B3 · Port the UI**
```
Port the demo UI from the old repo (css/styles.css and the page functions in js/app.js) into React server and client components under app/(farmer), app/(restaurant) and app/(admin). Keep the look pixel-identical: reuse the CSS tokens from docs/DESIGN_SYSTEM.md as a global stylesheet, and keep the same class names. Data comes from the API instead of localStorage. Start with the farmer Overview and My harvest pages (F2, F3), then stop and show me.
```

**B4 · Listings and matching**
```
Implement /api/listings (GET, POST, PATCH) and /api/match exactly per docs/BACKEND_SPEC.md §5 and §6. Port parseQuery and matchListings from the demo into lib/matching.ts as pure functions with unit tests: "200 kg tomatoes and 120 kg cucumbers every week" must parse to two items; "30 kg kashnich twice a week" must give greens with perWeek 2; "under 4000 so'm" must set maxPrice 4000. Wire up the restaurant Hosil AI page (R1) and Find farmers page (R2).
```

**B5 · Contracts and the state machine**
```
Implement contracts per docs/BACKEND_SPEC.md §4 and §6: create (the initiator signs), bulk create, sign (counterparty only), decline. Return 409 on illegal transitions and 403 if a non-counterparty tries to sign. On sign: snap startDate to the next delivery weekday, increase listing.soldKg, and write Activity rows. Write tests for every transition. Wire up the contract builder modal, the contract document view and the contracts tables in both apps (F4, F5, R3, R4).
```

**B6 · Notifications and live updates**
```
Add /api/activity?since= and a client hook that polls every 10 seconds and shows the same toasts as the demo. Add a Telegram bot notifier (env TELEGRAM_BOT_TOKEN) behind the same interface as SMS: users link Telegram by sending /start <code> to the bot. Send a notification when a proposal arrives, when a contract is signed, and on an admin nudge.
```

**B7 · Hosil HQ admin**
```
Build the admin pages per docs/PRODUCT_SPEC.md H1–H4 with /api/admin/metrics, /api/admin/pending, nudge and introduce. Metrics must be computed with SQL aggregates, not by loading every contract into memory. Add a CSV export of contracts.
```

**B8 · Deploy the pilot**
```
Prepare the app for a pilot with 10 farmers and 10 restaurants: a Dockerfile, environment variable docs, database backups, error tracking (Sentry), and a /api/health route. Write DEPLOY.md with step-by-step instructions for (a) Vercel + Neon and (b) a single VPS with Docker Compose, and note that we must confirm data-localization requirements in Uzbekistan before choosing. Run the full test suite and the end-to-end flow from docs/DEMO_SCRIPT.md against the deployed URL.
```

---

## Tips for working with Claude Code on this project
- Start each session with: `Read CLAUDE.md and docs/, then tell me in 5 lines what you're about to change.`
- If a change touches behaviour, add: `Update docs/PRODUCT_SPEC.md or docs/BACKEND_SPEC.md in the same change.`
- After each milestone: `Run the demo flow from docs/DEMO_SCRIPT.md and list anything that broke.`
- Commit after every working milestone so you can roll back.
