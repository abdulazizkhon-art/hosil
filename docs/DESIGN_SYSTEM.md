# Hosil — Design System (source of truth for UI)

Tokens live in `css/styles.css` under `:root`. Any new screen uses these and nothing else.

## Brand
| Token | Hex | Use |
|---|---|---|
| `--green` | `#007A33` (PANTONE 356 C) | Primary buttons, active nav, key numbers, hero KPI |
| `--green-700` | `#00612A` | Hover |
| `--green-950` | `#072B16` | Sidebar, toasts, splash background |
| `--mint` | `#E6F2EA` | Icon tiles, positive chips, selected states |
| `--paper` | `#F4F5F0` (PANTONE 11-0601 TCX) | App background |
| `--card` | `#FFFFFF` | Cards, modals |
| `--ink` / `--muted` | `#15241A` / `#6B776E` | Text |
| `--amber` | `#B7791F` on `#FFF5DC` | Pending, low stock, above market |
| `--red` | `#B42318` on `#FDECEA` | Declined, over budget |
| `--blue` | `#2B6CB0` on `#E8F1FB` | Verified, in transit |

Rule: green is for money, success and the primary action. One `primary` button per view area.

## Type
Inter (Google Fonts), falling back to the system UI font. Page title 26/700 at −0.02em; card title 15/700; body 14/400; meta 12.5 muted. Numbers use `tabular-nums` (`.tnum`).

## Shape and depth
Cards: radius 14, 1px border `#E3E7DE`, a very soft shadow. Modals: radius 18 with a large shadow and a blurred backdrop. Buttons are 40 px high (32 small, 48 large) with radius 10.

## Components (class names)
`.btn` (`.primary .ghost .sm .lg`), `.card .pad`, `.kpi` (`.hero` = green), `.chip` (`.green .amber .red .blue .dark`), `.avatar` (initials on the entity colour), `.emoji` tile for produce, `.progress`, ring chart, `table.t`, `.tabs`, `.seg` (segmented choice), `.field` + `.input`, `.toast`, `.modal` (`.wide`), `.doc` (contract), `.pipe` (kanban).

## Patterns
- **Every number has a unit and a comparison** ("12,800 so'm · 9% below market").
- **Money:** short form in KPIs (`30.7M so'm`), full form inside contracts (`30,720,000 so'm`).
- **Status chips:** Awaiting X (amber, clock icon), Active (green, check icon), Completed (grey), Declined (red).
- **Live feel:** new rows flash mint for 2.4 s; changed KPIs pulse; toasts slide in bottom-right and link to the page they're about.
- **Empty states:** icon tile + one sentence saying what will appear there.
- **Copy:** plain English, sentence case, no jargon ("Needs your signature", not "Pending counterparty action").
