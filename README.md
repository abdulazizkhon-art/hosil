# Hosil — demo build

A clickable, good-looking simulation of the Hosil platform for the investor demo video. Three windows: **Farmer app**, **Restaurant app**, **Hosil HQ**. There's no server, no database and no install: data lives in your browser and syncs live between tabs.

## Run it (pick one)
1. **Easiest:** double-click `start-mac.command` (Mac) or `start-windows.bat` (Windows). It opens http://localhost:5173.
   - On a Mac, the first time: right-click → Open (macOS blocks unsigned scripts on double-click).
2. **Terminal:** `cd hosil-demo` then `python3 -m http.server 5173` or `node server.js`, and open http://localhost:5173.
3. **No terminal at all:** double-click `index.html`. It works in Chrome; the localhost options are safer for two-window sync.

## Run it on Streamlit
`streamlit_app.py` bundles the same files into one page. Locally: `pip install -r requirements.txt`, then `streamlit run streamlit_app.py`. On Streamlit Community Cloud, point the app at this repo with `streamlit_app.py` as the main file. It opens in split screen (restaurant left, farmer right); "Single window" shows the start page.

## Record the demo
Follow `docs/DEMO_SCRIPT.md`. Short version: click **Reset demo data**, put the Restaurant window on the left and the Farmer window on the right, then:

**Add produce → Hosil AI "Fill my supply gaps" → Send all → the farmer reviews → Accept & sign → Restaurant contracts → HQ dashboard → Nudge.**

## What's real and what's simulated
| Works for real (in the browser) | Simulated |
|---|---|
| Adding listings, matching and ranking, contract creation, signing, declining, live cross-window notifications, KPIs and charts recalculated from the data | No login, no server, no SMS/Telegram, AI = a deterministic parser and ranking (no LLM), seed data is invented, deliveries are generated from contracts |

## Repo map
```
index.html            entry point
css/styles.css        all styles (design tokens at the top)
js/data.js            seed data: farmers, restaurants, listings, contracts (invented)
js/app.js             the whole app: store, matching, pages, modals, live sync
server.js             zero-dependency local server
streamlit_app.py      Streamlit wrapper (split-screen or single window)
requirements.txt      Streamlit dependency for the wrapper
docs/PRODUCT_SPEC.md      what the product does: source of truth for product
docs/BACKEND_SPEC.md      entities, state machine, matching, API: source of truth for backend
docs/DESIGN_SYSTEM.md     colours, type, components: source of truth for UI
docs/DEMO_SCRIPT.md       shot-by-shot recording script
docs/CLAUDE_CODE_PROMPTS.md  prompts to keep building with Claude Code
CLAUDE.md             instructions Claude Code reads automatically
```

## Change the demo data
Edit `js/data.js` (names, prices, quantities), then click **Reset demo data** in the app. The farmer you play is `f1` and the restaurant is `r1` (`me` at the bottom of the file).
