/* Hosil demo app — farmer window, restaurant window, Hosil HQ window.
   No build step, no server. State lives in localStorage and syncs live between browser tabs,
   so you can put the farmer and restaurant windows side by side during the recording. */
(function () {
  "use strict";

  // ===================================================================== store
  const KEY = "hosil-demo-v1";
  const P = window.HOSIL_PRODUCTS;
  const DAY = 86400000;
  let S = null;

  function load() { try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
  function persist() { S.rev = (S.rev || 0) + 1; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private mode: memory only */ } }
  S = load();
  if (!S || S.version !== 2) { S = window.hosilSeed(); persist(); }

  // Embedded mode (Streamlit iframe): the URL hash isn't ours, so the route lives in memory.
  const EMBED = !!window.HOSIL_EMBED;
  let vhash = window.HOSIL_START || "#/";
  const curHash = () => (EMBED ? vhash : location.hash);

  const ui = {
    modal: null, notifOpen: false, thread: [], fresh: new Set(), prevKpi: {},
    tabs: { fContracts: "all", rContracts: "all", aContracts: "all" },
    priceCrop: null,
    ffilter: { q: "", product: "", km: "", sort: "match" },
    aq: "",
  };

  // ===================================================================== utils
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (n) => Math.round(n).toLocaleString("en-US");
  const som = (n) => num(n) + " so'm";
  const short = (n) => {
    const a = Math.abs(n);
    if (a >= 1e9) return (n / 1e9).toFixed(a >= 1e10 ? 0 : 1).replace(/\.0$/, "") + "B";
    if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e8 ? 0 : 1).replace(/\.0$/, "") + "M";
    if (a >= 1e3) return Math.round(n / 1e3) + "K";
    return String(Math.round(n));
  };
  const kg = (n) => num(n) + " kg";
  const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const fmtDay = (d) => new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const fmtLong = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const ago = (iso) => {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 45) return "just now";
    if (s < 3600) return Math.max(1, Math.floor(s / 60)) + " min ago";
    if (s < 86400) return Math.floor(s / 3600) + " h ago";
    const d = Math.floor(s / 86400);
    return d === 1 ? "yesterday" : d + " days ago";
  };
  const initials = (n) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const uid = (p) => p + Math.random().toString(36).slice(2, 8);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };

  const F = (id) => S.farmers.find((x) => x.id === id);
  const R = (id) => S.restaurants.find((x) => x.id === id);
  const PR = (id) => P.find((x) => x.id === id);
  const LI = (id) => S.listings.find((x) => x.id === id);
  const CT = (id) => S.contracts.find((x) => x.id === id);

  // contract math (fees: restaurant +1%, farmer −1%)
  const FEE = 0.01;
  const deliveries = (c) => c.perWeek * c.weeks;
  const perDelivery = (c) => c.kgPerDelivery * c.pricePerKg;
  const cValue = (c) => perDelivery(c) * deliveries(c);
  const cMonthly = (c) => c.kgPerDelivery * c.pricePerKg * c.perWeek * 4.33;
  const cKgTotal = (c) => c.kgPerDelivery * deliveries(c);

  function identity(role) { role = role || route().role; return role === "farmer" ? "farmer:" + S.me.farmer : role === "restaurant" ? "restaurant:" + S.me.restaurant : role === "admin" ? "admin" : null; }

  function addActivity(a) {
    const ev = Object.assign({ id: uid("a"), ts: new Date().toISOString() }, a);
    if (!ev.to.includes("admin")) ev.to.push("admin");
    S.activity.unshift(ev);
    ui.fresh.add(ev.id);
    return ev;
  }

  function nextWeekday(fromDays, weekday) { // weekday: 1 = Mon … 4 = Thu
    const d = new Date(Date.now() + fromDays * DAY); d.setHours(9, 0, 0, 0);
    while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
    return d;
  }

  // ===================================================================== icons
  const ICONS = {
    sprout: '<path d="M7 20h10"/><path d="M12 20v-8"/><path d="M12 12c0-4.2 2.8-7 7.5-7 0 4.4-2.9 7-7.5 7z"/><path d="M12 12.5C12 9 9.8 6.5 5 6.5c0 3.8 2.5 6 7 6z"/>',
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    utensils: '<path d="M5 3v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3"/><path d="M7 12v9"/><path d="M18 21V3c-2.3 0-4 2.2-4 6v5h4"/>',
    file: '<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
    sparkles: '<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z"/>',
    users: '<circle cx="9" cy="8" r="3.6"/><path d="M2.5 20.5c0-3.9 2.9-6.5 6.5-6.5s6.5 2.6 6.5 6.5"/><path d="M16 4.6a3.6 3.6 0 0 1 0 6.8"/><path d="M21.5 20.5c0-2.9-1.6-5.2-4-6.1"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5.5-6"/>',
    link: '<path d="M10 14a4.2 4.2 0 0 0 6 0l3-3a4.2 4.2 0 0 0-6-6l-1 1"/><path d="M14 10a4.2 4.2 0 0 0-6 0l-3 3a4.2 4.2 0 0 0 6 6l1-1"/>',
    bell: '<path d="M6 8.5a6 6 0 0 1 12 0c0 6.5 2.5 8 2.5 8h-17S6 15 6 8.5"/><path d="M10 20a2.2 2.2 0 0 0 4 0"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    send: '<path d="M21.5 2.5 10.8 13.2"/><path d="M21.5 2.5 14.8 21.5l-4-8.3-8.3-4z"/>',
    truck: '<path d="M1.5 6h12.5v10H1.5z"/><path d="M14 9.5h4l3.5 3.5v3H14z"/><circle cx="5.5" cy="18" r="2"/><circle cx="17.5" cy="18" r="2"/>',
    pin: '<path d="M12 21.5s7-6.4 7-11.8a7 7 0 0 0-14 0c0 5.4 7 11.8 7 11.8z"/><circle cx="12" cy="9.7" r="2.5"/>',
    star: '<path d="M12 3.2l2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.4-4.2 6-.9z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20.5 20.5 16 16"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.4 8.2-8 9-4.6-.8-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
    refresh: '<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"/><path d="M20.5 3.5v5h-5"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 15v2c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.6-2.4-2.9-5.5-3"/>',
    handshake: '<path d="M11 17l2 2a1.5 1.5 0 0 0 2-2"/><path d="M14 16l2 2a1.5 1.5 0 0 0 2-2l-3.5-3.5"/><path d="M2.5 12.5 7 8l4 1 2-2 5.5 5.5"/><path d="M21.5 11.5 17 7l-4 1"/><path d="M7 13l3 3a1.5 1.5 0 0 0 2-2"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    leaf: '<path d="M5 19c0-8 5.5-14 15-14 0 9.5-6 15-14 15"/><path d="M5 19c3-4 6-6.5 10-8.5"/>',
    message: '<path d="M21 12a8.5 8.5 0 0 1-12.4 7.5L3.5 21l1.4-4.6A8.5 8.5 0 1 1 21 12z"/>',
    bolt: '<path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12z"/>',
    filter: '<path d="M3.5 5h17l-6.5 8v6l-4 2v-8z"/>',
  };
  const I = (n, cls) => `<svg class="i ${cls || ""}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ""}</svg>`;

  // ===================================================================== charts
  function lineChart({ series, labels, h = 220, w = 640, fmt = short, area = true }) {
    const pl = 46, pr = 14, pt = 14, pb = 28;
    const all = series.flatMap((s) => s.data);
    let mn = Math.min(...all), mx = Math.max(...all);
    const padv = (mx - mn) * 0.15 || mx * 0.1 || 1; mn = Math.max(0, mn - padv); mx = mx + padv;
    const X = (i) => pl + (i * (w - pl - pr)) / (labels.length - 1);
    const Y = (v) => pt + (1 - (v - mn) / (mx - mn)) * (h - pt - pb);
    let g = "";
    for (let k = 0; k <= 4; k++) {
      const v = mn + ((mx - mn) * k) / 4, y = Y(v);
      g += `<line x1="${pl}" x2="${w - pr}" y1="${y}" y2="${y}" stroke="#EEF1EA"/><text x="${pl - 8}" y="${y + 4}" text-anchor="end">${fmt(v)}</text>`;
    }
    labels.forEach((l, i) => { if (labels.length <= 8 || i % 2 === 1 || i === labels.length - 1) g += `<text x="${X(i)}" y="${h - 8}" text-anchor="middle">${esc(l)}</text>`; });
    series.forEach((s, si) => {
      const pts = s.data.map((v, i) => `${X(i)},${Y(v)}`).join(" ");
      if (area && si === 0) g += `<polygon points="${X(0)},${h - pb} ${pts} ${X(s.data.length - 1)},${h - pb}" fill="${s.color}" opacity=".08"/>`;
      g += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2.5}" stroke-linejoin="round" stroke-linecap="round" ${s.dash ? 'stroke-dasharray="5 5"' : ""}/>`;
      const li = s.data.length - 1;
      g += `<circle cx="${X(li)}" cy="${Y(s.data[li])}" r="4.5" fill="#fff" stroke="${s.color}" stroke-width="2.5"/>`;
    });
    return `<svg class="chart" viewBox="0 0 ${w} ${h}">${g}</svg>`;
  }

  function barChart({ data, h = 200, w = 520, color = "#007A33", fmt = short, highlight = -1 }) {
    const pl = 8, pr = 8, pt = 24, pb = 26;
    const mx = Math.max(...data.map((d) => d.value)) * 1.1;
    const bw = (w - pl - pr) / data.length;
    let g = "";
    data.forEach((d, i) => {
      const bh = (d.value / mx) * (h - pt - pb), x = pl + i * bw + bw * 0.2, y = h - pb - bh;
      const hl = i === highlight;
      g += `<rect x="${x}" y="${y}" width="${bw * 0.6}" height="${bh}" rx="6" fill="${hl ? color : "#CFE5D7"}"/>`;
      g += `<text x="${x + bw * 0.3}" y="${y - 7}" text-anchor="middle" style="font-weight:600;fill:${hl ? "#15241A" : "#6B776E"}">${fmt(d.value)}</text>`;
      g += `<text x="${x + bw * 0.3}" y="${h - 8}" text-anchor="middle">${esc(d.label)}</text>`;
    });
    return `<svg class="chart" viewBox="0 0 ${w} ${h}">${g}</svg>`;
  }

  function ring(pct, size = 64, stroke = 7, color = "#007A33", label) {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - Math.min(1, pct));
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="flex:none">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#EEF1EA" stroke-width="${stroke}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 ${size / 2} ${size / 2})" style="transition:stroke-dashoffset .8s ease"/>
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" style="font: 700 ${size / 4.6}px var(--font); fill:#15241A">${label != null ? label : Math.round(pct * 100) + "%"}</text></svg>`;
  }

  // ===================================================================== matching ("Hosil AI")
  function matchListings(productId, kgPerWeek, maxPrice) {
    const p = PR(productId);
    return S.listings.filter((l) => l.productId === productId && l.qtyKg - l.soldKg > 0).map((l) => {
      const f = F(l.farmerId);
      const avail = l.qtyKg - l.soldKg;
      const weeks = avail / Math.max(1, kgPerWeek);
      const priceS = Math.max(0, Math.min(1, (p.market * 1.15 - l.pricePerKg) / (p.market * 0.35)));
      const distS = Math.max(0, 1 - f.km / 400);
      const rateS = Math.max(0, f.rating - 4);
      const availS = Math.min(1, weeks / 12);
      let score = Math.round(100 * (0.35 * priceS + 0.25 * distS + 0.2 * rateS + 0.2 * availS)) + (f.verified ? 4 : 0);
      const over = !!(maxPrice && l.pricePerKg > maxPrice);
      if (over) score -= 25;
      score = Math.max(35, Math.min(98, score));
      const diff = (l.pricePerKg - p.market) / p.market;
      const reasons = [
        diff < 0 ? { t: Math.round(-diff * 100) + "% below market", c: "green" } : { t: "+" + Math.round(diff * 100) + "% vs market", c: "amber" },
        { t: f.km + " km from Tashkent", c: f.km < 80 ? "green" : "" },
        { t: "★ " + f.rating + " (" + f.reviews + ")", c: "" },
        weeks >= 12 ? { t: "Stock for 12+ weeks", c: "green" } : { t: "Stock for ~" + Math.max(1, Math.floor(weeks)) + " weeks", c: weeks >= 6 ? "" : "amber" },
      ];
      if (f.verified) reasons.push({ t: "Verified farm", c: "blue" });
      if (over) reasons.unshift({ t: "Above your budget", c: "red" });
      return { l, f, score, avail, weeks, reasons };
    }).sort((a, b) => b.score - a.score);
  }

  function parseQuery(q) {
    const text = " " + q.toLowerCase().replace(/[’`]/g, "'") + " ";
    const twice = /twice|2x|two times|2 times|ikki marta|дважды/.test(text);
    let maxPrice = null;
    const mp = text.match(/(?:under|below|max(?:imum)?|up to|no more than|less than)\s*([\d][\d\s,.]*)\s*(k\b|thousand)?/);
    if (mp) { let v = parseFloat(mp[1].replace(/[\s,]/g, "")); if (mp[2] || v < 100) v *= 1000; maxPrice = v; }
    const items = [];
    P.forEach((p) => {
      let best = -1;
      p.synonyms.forEach((s) => {
        const re = new RegExp("[^a-zа-яё']" + s.replace(/ /g, "\\s+") + "(?=[^a-zа-яё'])", "i");
        const m = text.match(re);
        if (m && (best === -1 || m.index < best)) best = m.index;
      });
      if (best >= 0) {
        const before = text.slice(Math.max(0, best - 28), best + 1);
        const nm = before.match(/(\d[\d,.]*)\s*(kg|kilo\w*|tonnes?|tons?|t)?\s*(?:of\s+)?[^\d]*$/);
        let v = null;
        if (nm) { v = parseFloat(nm[1].replace(/,/g, "")); if (nm[2] && /^t/.test(nm[2])) v *= 1000; if (mp && mp[1].trim().startsWith(nm[1].trim())) v = null; }
        items.push({ productId: p.id, kgPerWeek: v, idx: best });
      }
    });
    items.sort((a, b) => a.idx - b.idx);
    return { items, twice, maxPrice };
  }

  function coverage(rid) {
    const r = R(rid);
    return r.demand.map((dm) => {
      const act = S.contracts.filter((c) => c.restaurantId === rid && c.productId === dm.productId && c.status === "active");
      const pend = S.contracts.filter((c) => c.restaurantId === rid && c.productId === dm.productId && c.status === "proposed");
      const covered = act.reduce((s, c) => s + c.kgPerDelivery * c.perWeek, 0);
      return { ...dm, covered, pct: Math.min(1, covered / dm.kgPerWeek), pending: pend };
    });
  }

  // ===================================================================== deliveries, tracking, replacements
  const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  // Deliveries of active contracts between two day offsets from today. Past ones default to paid.
  // f / price are the effective supplier and price (a one-off replacement overrides the contract's).
  function deliveriesFor(filter, from, to) {
    const out = [];
    S.contracts.filter((c) => c.status === "active" && filter(c)).forEach((c) => {
      const days = c.perWeek === 2 ? [1, 4] : [4];
      const start = new Date(new Date(c.startDate).setHours(0, 0, 0, 0));
      for (let k = from; k <= to; k++) {
        const d = new Date(Date.now() + k * DAY); d.setHours(9, 0, 0, 0);
        if (!days.includes(d.getDay()) || d < start) continue;
        const key = c.id + "|" + ymd(d);
        const sub = S.subs.find((s) => s.key === key);
        const st = S.deliv[key] || { status: k < 0 ? "paid" : "scheduled", at: {} };
        out.push({ c, d, key, sub, st, f: F(sub ? sub.toFarmerId : c.farmerId), price: sub ? sub.pricePerKg : c.pricePerKg });
      }
    });
    return out.sort((a, b) => a.d - b.d);
  }
  const deliveryByKey = (key) => deliveriesFor((c) => c.id === key.split("|")[0], -15, 15).find((x) => x.key === key);
  const DST = { scheduled: ["", "Scheduled", "calendar"], picked: ["blue", "Picked up", "box"], way: ["blue", "On the way", "truck"], delivered: ["amber", "Check quality", "clock"], paid: ["green", "Confirmed · paid", "check"], rejected: ["red", "Rejected", "x"] };
  const dChip = (x) => { const [c, t, ic] = DST[x.st.status]; return `<span class="chip ${c}">${I(ic)}${t}</span>`; };

  // Pilot break-even targets (from the financial model, see PRODUCT_SPEC §7).
  const BE = { restaurants: 66, monthly: 2.2e9, fixed: 44e6, basket: 34e6 };

  // ===================================================================== routing
  function route() {
    const parts = (curHash() || "#/").replace(/^#\/?/, "").split("/");
    const role = ["farmer", "restaurant", "admin"].includes(parts[0]) ? parts[0] : null;
    const def = { farmer: "overview", restaurant: "assistant", admin: "dashboard" };
    return { role, page: role ? (parts[1] || def[role]) : null };
  }
  const go = (hash) => { if (curHash() === hash) render(); else if (EMBED) { vhash = hash; onRoute(); } else location.hash = hash; };

  // ===================================================================== layout
  const NAV = {
    farmer: [["overview", "Overview", "home"], ["harvest", "My harvest", "sprout"], ["restaurants", "Restaurants", "utensils"], ["contracts", "Contracts", "file"]],
    restaurant: [["assistant", "Hosil AI", "sparkles"], ["farmers", "Find farmers", "users"], ["contracts", "Contracts & supply", "file"]],
    admin: [["dashboard", "Dashboard", "grid"], ["contracts", "All contracts", "file"], ["connections", "Connections", "link"]],
  };
  const ROLE_LABEL = { farmer: "Farmer app", restaurant: "Restaurant app", admin: "Hosil HQ" };
  const ROLE_ICON = { farmer: "sprout", restaurant: "utensils", admin: "grid" };

  function navCount(role, page) {
    if (role === "farmer" && page === "contracts") return S.contracts.filter((c) => c.farmerId === S.me.farmer && c.status === "proposed" && c.initiatedBy === "restaurant").length;
    if (role === "restaurant" && page === "contracts") return S.contracts.filter((c) => c.restaurantId === S.me.restaurant && c.status === "proposed" && c.initiatedBy === "farmer").length;
    if (role === "admin" && page === "connections") return pendingCount();
    return 0;
  }
  const pendingCount = () => S.contracts.filter((c) => c.status === "proposed").length + S.connections.filter((n) => n.status === "pending").length;

  function sidebar(role, page) {
    let who;
    if (role === "farmer") { const f = F(S.me.farmer); who = `<div class="avatar" style="background:${f.color}">${initials(f.name)}</div><div class="meta"><b>${esc(f.name)}</b><span>${esc(f.farm)}</span></div>`; }
    else if (role === "restaurant") { const r = R(S.me.restaurant); who = `<div class="avatar" style="background:${r.color}">${initials(r.name)}</div><div class="meta"><b>${esc(r.name)}</b><span>${esc(r.district)}, Tashkent</span></div>`; }
    else who = `<div class="avatar" style="background:#007A33">HQ</div><div class="meta"><b>Hosil Operations</b><span>Admin</span></div>`;
    return `<aside class="side">
      <a class="brand" href="#/"><span class="mark">${I("sprout")}</span><span><b>Hosil</b><small>${ROLE_LABEL[role]}</small></span></a>
      <div class="group">Menu</div>
      <nav class="nav">${NAV[role].map(([k, label, ic]) => { const n = navCount(role, k); return `<a href="#/${role}/${k}" class="${k === page ? "on" : ""}">${I(ic)}<span>${label}</span>${n ? `<span class="count">${n}</span>` : ""}</a>`; }).join("")}</nav>
      <div class="spacer"></div>
      <div class="whoami">${who}</div>
      <button class="reset" data-act="reset">${I("refresh")} Reset demo data</button>
    </aside>`;
  }

  function topbar(role) {
    const id = identity(role);
    const mine = S.activity.filter((a) => id === "admin" || a.to.includes(id)).sort((a, b) => new Date(b.ts) - new Date(a.ts));
    const unread = mine.filter((a) => new Date(a.ts).getTime() > (S.seen[id] || 0) && a.actor !== id).length;
    return `<header class="top">
      <div class="roles">${["farmer", "restaurant", "admin"].map((r) => `<a href="#/${r}" class="${r === role ? "on" : ""}">${I(ROLE_ICON[r])}${ROLE_LABEL[r]}</a>`).join("")}</div>
      <div class="grow"></div>
      <div class="livepill"><i></i>Live · synced</div>
      <button class="bell" data-act="bell" aria-label="Notifications">${I("bell")}${unread ? `<span class="dot">${unread}</span>` : ""}</button>
      ${ui.notifOpen ? `<div class="notif"><h4>Notifications</h4>${mine.slice(0, 7).map((a) => `<div class="row ${new Date(a.ts).getTime() > (S.seen[id] || 0) ? "new" : ""}"><div class="ic">${I(a.icon || "bell")}</div><div>${esc(a.text)}<small>${ago(a.ts)}</small></div></div>`).join("") || `<div class="row muted">Nothing yet</div>`}</div>` : ""}
    </header>`;
  }

  function kpi(key, label, icon, value, unit, delta, hero) {
    const changed = ui.prevKpi[key] !== undefined && ui.prevKpi[key] !== value;
    ui.prevKpi[key] = value;
    return `<div class="card kpi ${hero ? "hero" : ""} ${changed ? "flash" : ""}"><div class="lab"><span class="ic">${I(icon)}</span>${label}</div>
      <div class="val tnum">${value}${unit ? `<small>${unit}</small>` : ""}</div>${delta ? `<div class="delta">${delta}</div>` : ""}</div>`;
  }

  const statusChip = (c) => ({
    proposed: `<span class="chip amber">${I("clock")}Awaiting ${c.initiatedBy === "restaurant" ? "farmer" : "restaurant"}</span>`,
    active: `<span class="chip green">${I("check")}Active</span>`,
    completed: `<span class="chip">Completed</span>`,
    declined: `<span class="chip red">Declined</span>`,
  }[c.status]);

  const empty = (icon, title, sub) => `<div class="empty"><div class="ic">${I(icon)}</div><div class="strong" style="color:var(--ink)">${title}</div><div class="small">${sub || ""}</div></div>`;

  // ===================================================================== splash
  function splash() {
    return `<div class="splash">
      <div class="nav-s"><div class="brand" style="padding:0"><span class="mark">${I("sprout")}</span><span><b>Hosil</b><small>Farm to restaurant, direct</small></span></div></div>
      <div class="hero">
        <span class="eyebrow">${I("leaf")} Uzbekistan's farm-to-restaurant platform</span>
        <h1>Restaurants buy <em>straight from farmers</em>. No middlemen, no bazaar runs.</h1>
        <p class="lead">One platform, two apps. Farmers list their harvest and track sales. Restaurants find farmers, sign supply contracts and track deliveries. Hosil earns 1% from each side.</p>
        <div class="rolecards">
          <a class="rolecard" href="#/farmer"><div class="ic">${I("sprout")}</div><h3>Farmer app</h3><p>List your harvest, see which restaurants need it, and watch how much you've sold and at what price.</p><span class="go">Open as Bahodir, Karimov Agro ${I("arrow")}</span></a>
          <a class="rolecard" href="#/restaurant"><div class="ic">${I("utensils")}</div><h3>Restaurant app</h3><p>Tell Hosil AI what you need. It finds the best farmers and drafts the supply contract for you.</p><span class="go">Open as Lola Kitchen ${I("arrow")}</span></a>
          <a class="rolecard" href="#/admin"><div class="ic">${I("grid")}</div><h3>Hosil HQ</h3><p>Every deal, contract and pending connection on the platform, live.</p><span class="go">Open the dashboard ${I("arrow")}</span></a>
        </div>
      </div>
      <div class="foot"><span>Demo build · simulated data</span><span>Tip: open two windows side by side. Actions sync live between them.</span></div>
    </div>`;
  }

  // ===================================================================== FARMER
  const myListings = () => S.listings.filter((l) => l.farmerId === S.me.farmer);
  const myFarmerContracts = () => S.contracts.filter((c) => c.farmerId === S.me.farmer);

  function farmerOverview() {
    const f = F(S.me.farmer);
    const ls = myListings();
    const tot = ls.reduce((s, l) => s + l.qtyKg, 0), sold = ls.reduce((s, l) => s + l.soldKg, 0);
    const revenue = ls.reduce((s, l) => s + l.soldKg * l.pricePerKg * (1 - FEE), 0);
    const cs = myFarmerContracts();
    const active = cs.filter((c) => c.status === "active");
    const reqs = cs.filter((c) => c.status === "proposed" && c.initiatedBy === "restaurant").sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const monthly = active.reduce((s, c) => s + cMonthly(c) * (1 - FEE), 0);
    if (!ui.priceCrop || !ls.find((l) => l.productId === ui.priceCrop)) ui.priceCrop = ls[0] && ls[0].productId;
    const pl = ls.find((l) => l.productId === ui.priceCrop);
    const p = pl && PR(pl.productId);
    const hist = p ? S.priceHistory[p.id] : [];
    const ratio = pl ? pl.pricePerKg / p.market : 1;
    const mine = hist.map((v, i) => Math.round((v * ratio * (1 + 0.015 * Math.sin(i * 1.7))) / 100) * 100);
    if (pl) mine[11] = pl.pricePerKg;
    const labels = hist.map((_, i) => fmtDate(new Date(Date.now() - (11 - i) * 7 * DAY)));
    const diff = pl ? (pl.pricePerKg - p.market) / p.market : 0;
    const trend = hist.length ? (hist[11] - hist[7]) / hist[7] : 0;
    const now = new Date();
    const revBars = S.farmerRevenue.concat([{ label: now.toLocaleDateString("en-GB", { month: "short" }), value: Math.max(0, revenue - S.farmerRevenue.reduce((s, m) => s + m.value, 0) - cs.filter((c) => c.live && c.status === "active").reduce((s, c) => s + (c.soldAdded || 0) * c.pricePerKg * (1 - FEE), 0)) }]);
    const myDel = (from, to) => deliveriesFor(() => true, from, to).filter((x) => x.f.id === f.id || x.c.farmerId === f.id);
    const nextDel = myDel(0, 7).slice(0, 4);
    const payouts = myDel(-14, 7).filter((x) => x.f.id === f.id && x.st.status === "paid").sort((a, b) => new Date(b.st.at.paid || b.d) - new Date(a.st.at.paid || a.d)).slice(0, 4);
    const openDemand = S.restaurants.flatMap((r) => r.demand.filter((d) => ls.some((l) => l.productId === d.productId)).map((d) => ({ r, d }))).filter(({ r, d }) => !S.contracts.some((c) => c.restaurantId === r.id && c.farmerId === f.id && c.productId === d.productId && ["active", "proposed"].includes(c.status)));

    return `<div class="ph"><div><h1>${greeting()}, ${esc(f.name.split(" ")[0])}</h1><p>${esc(f.farm)} · ${esc(f.district)}, ${esc(f.region)} · ${fmtLong(new Date().toISOString())}</p></div>
      <div class="actions"><button class="btn primary" data-act="addListing">${I("plus")}Add produce</button></div></div>
    <div class="grid g4">
      ${kpi("f-sold", "Harvest sold", "box", Math.round((sold / Math.max(1, tot)) * 100), "%", `${kg(sold)} of ${kg(tot)}`, true)}
      ${kpi("f-rev", "Season revenue", "coins", short(revenue), "so'm", "after Hosil's 1% fee")}
      ${kpi("f-act", "Active contracts", "handshake", active.length, "", `<b>${short(monthly)} so'm</b> a month guaranteed`)}
      ${kpi("f-req", "New requests", "bell", reqs.length, "", reqs.length ? "restaurants waiting for your answer" : "you're all caught up")}
    </div>
    <div class="grid g-1-2 mt">
      <div class="card pad"><div class="card-h"><div><h3>How much of each harvest is sold</h3><div class="sub">Sold vs total listed, per crop</div></div></div>
        <div class="list">${ls.map((l) => { const pp = PR(l.productId); const pct = l.soldKg / l.qtyKg; return `<div class="item">${ring(pct, 58, 7, pct > 0.85 ? "#B7791F" : "#007A33")}<div class="grow"><div class="t">${pp.emoji} ${pp.name}</div><div class="s">${kg(l.soldKg)} sold · ${kg(l.qtyKg - l.soldKg)} left</div></div><div style="text-align:right"><div class="strong tnum">${short(l.soldKg * l.pricePerKg)}</div><div class="s small muted">so'm earned</div></div></div>`; }).join("") || empty("sprout", "No produce listed yet", "Add your first harvest to start selling.")}</div>
      </div>
      <div class="card pad"><div class="card-h"><div><h3>Your price vs the market</h3><div class="sub">Last 12 weeks, so'm per kg</div></div>
        <div class="right"><div class="tabs">${ls.map((l) => `<button class="${l.productId === ui.priceCrop ? "on" : ""}" data-act="priceCrop" data-id="${l.productId}">${PR(l.productId).emoji} ${PR(l.productId).name}</button>`).join("")}</div></div></div>
        ${p ? `<div class="row" style="gap:28px;margin-bottom:6px">
            <div><div class="small muted">Your price</div><div class="strong tnum" style="font-size:19px;white-space:nowrap">${som(pl.pricePerKg)}</div></div>
            <div><div class="small muted">Market average</div><div class="strong tnum" style="font-size:19px;white-space:nowrap">${som(p.market)}</div></div>
            <div><div class="small muted">4-week trend</div><div class="strong tnum" style="font-size:19px;white-space:nowrap;color:${trend >= 0 ? "var(--green)" : "var(--red)"}">${trend >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(trend * 100))}%</div></div>
            <div class="grow"></div><span class="chip ${diff <= 0 ? "green" : "amber"}">${diff <= 0 ? Math.round(-diff * 100) + "% below market: restaurants rank you higher" : Math.round(diff * 100) + "% above market"}</span></div>
          ${lineChart({ series: [{ data: hist, color: "#9AA79E", width: 2, dash: true }, { data: mine, color: "#007A33" }], labels, h: 210, fmt: (v) => short(v), area: false })}
          <div class="legend"><span><i style="background:#007A33"></i>Your price</span><span><i style="background:#9AA79E"></i>Market average (Tashkent)</span></div>` : empty("chart", "No prices yet")}
      </div>
    </div>
    <div class="grid g-2-1 mt">
      <div class="card pad"><div class="card-h"><div><h3>Partnership requests</h3><div class="sub">Restaurants that want a supply contract with you</div></div><div class="right"><a class="btn sm" href="#/farmer/contracts">All contracts ${I("arrow")}</a></div></div>
        <div class="list">${reqs.map((c) => { const r = R(c.restaurantId), pp = PR(c.productId); return `<div class="item"><div class="avatar" style="background:${r.color}">${initials(r.name)}</div><div class="grow"><div class="t">${esc(r.name)} <span class="muted" style="font-weight:500">wants ${pp.name.toLowerCase()}</span></div><div class="s">${kg(c.kgPerDelivery)} × ${c.perWeek}/week · ${c.weeks} weeks · ${som(c.pricePerKg)}/kg · sent ${ago(c.createdAt)}</div></div><div style="text-align:right;margin-right:6px"><div class="strong tnum">${short(cValue(c) * (1 - FEE))}</div><div class="small muted">so'm to you</div></div><button class="btn primary sm" data-act="openContract" data-id="${c.id}">Review</button></div>`; }).join("") || empty("bell", "No new requests", "When a restaurant wants your produce, it shows up here.")}</div>
      </div>
      <div class="card pad"><div class="card-h"><div><h3>Revenue by month</h3><div class="sub">Net, so'm · ${revBars[5].label} is this month so far</div></div></div>${barChart({ data: revBars, h: 210, w: 420, highlight: 5 })}</div>
    </div>
    <div class="grid g2 mt">
      <div class="card pad"><div class="card-h"><div><h3>Your next deliveries</h3><div class="sub">Collected at your farm by Hosil's delivery partner</div></div></div>
        <div class="list">${nextDel.map((x) => { const pp = PR(x.c.productId), r = R(x.c.restaurantId); const away = x.sub && x.c.farmerId === f.id;
          return `<div class="item click" data-act="openDelivery" data-key="${x.key}"><div style="width:46px;text-align:center"><div class="small muted">${x.d.toLocaleDateString("en-GB", { weekday: "short" })}</div><div class="strong" style="font-size:18px">${x.d.getDate()}</div></div><span class="emoji sm">${pp.emoji}</span><div class="grow"><div class="t">${kg(x.c.kgPerDelivery)} ${pp.name.toLowerCase()}</div><div class="s">${esc(r.name)}${away ? " · handed to " + esc(x.f.farm) : ""}</div></div>
            ${away ? `<span class="chip amber">${I("refresh")}Replaced</span>` : x.sub ? `<span class="chip blue">${I("bolt")}Replacement order</span>` : x.st.status === "scheduled" ? `<button class="btn sm" data-act="cantDeliver" data-id="${x.c.id}" data-key="${x.key}">Can't deliver</button>` : dChip(x)}</div>`; }).join("") || empty("truck", "No deliveries this week")}</div></div>
      <div class="card pad"><div class="card-h"><div><h3>Payouts</h3><div class="sub">Paid when the restaurant confirms the delivery · after Hosil's 1% fee</div></div></div>
        <div class="list">${payouts.map((x) => { const pp = PR(x.c.productId), r = R(x.c.restaurantId);
          return `<div class="item ${ui.fresh.has(x.c.id) && x.st.at.paid ? "fresh" : ""}"><span class="emoji sm">${pp.emoji}</span><div class="grow"><div class="t">${kg(x.c.kgPerDelivery)} ${pp.name.toLowerCase()} · ${esc(r.name)}</div><div class="s">${I("check")} Paid on delivery · ${fmtDay(x.st.at.paid || x.d)}</div></div><div class="strong tnum green-t">+${som(x.c.kgPerDelivery * x.price * (1 - FEE))}</div></div>`; }).join("") || empty("coins", "No payouts yet", "You're paid as soon as a delivery is confirmed.")}</div></div>
    </div>
    <div class="card pad mt"><div class="card-h"><div><h3>Restaurants looking for what you grow</h3><div class="sub">${openDemand.length} open demands you could supply</div></div><div class="right"><a class="btn sm" href="#/farmer/restaurants">See all ${I("arrow")}</a></div></div>
      <div class="grid g3">${openDemand.filter((x, i, arr) => arr.findIndex((y) => y.r.id === x.r.id) === i).slice(0, 3).map(({ r, d }) => { const pp = PR(d.productId); return `<div class="row" style="background:var(--paper);border-radius:12px;padding:12px"><div class="avatar sm" style="background:${r.color}">${initials(r.name)}</div><div style="flex:1;min-width:0"><div class="strong small">${esc(r.name)}</div><div class="small muted">${pp.emoji} ${kg(d.kgPerWeek)} ${pp.name.toLowerCase()} / week</div></div><button class="btn sm" data-act="offer" data-r="${r.id}" data-p="${d.productId}">Offer</button></div>`; }).join("")}</div>
    </div>`;
  }

  function farmerHarvest() {
    const ls = myListings();
    return `<div class="ph"><div><h1>My harvest</h1><p>What you're selling right now. Restaurants see these listings and Hosil AI recommends them.</p></div>
      <div class="actions"><button class="btn primary" data-act="addListing">${I("plus")}Add produce</button></div></div>
    <div class="card" style="overflow:hidden"><table class="t"><thead><tr><th>Produce</th><th>Available</th><th style="width:220px">Sold of harvest</th><th>Your price</th><th>vs market</th><th>Harvest window</th><th>Status</th></tr></thead><tbody>
      ${ls.map((l) => { const p = PR(l.productId); const avail = l.qtyKg - l.soldKg; const pct = l.soldKg / l.qtyKg; const diff = (l.pricePerKg - p.market) / p.market;
        const st = avail <= 0 ? `<span class="chip">Sold out</span>` : pct > 0.85 ? `<span class="chip amber">Low stock</span>` : `<span class="chip green">${I("check")}Listed</span>`;
        return `<tr class="${ui.fresh.has(l.id) ? "fresh" : ""}"><td><div class="row"><span class="emoji">${p.emoji}</span><div><div class="strong">${p.name}</div><div class="small muted">${esc(l.variety)} · Grade ${l.grade}</div></div></div></td>
          <td class="tnum strong">${kg(avail)}</td>
          <td><div class="row" style="gap:10px"><div class="progress ${pct > 0.85 ? "amber" : ""}" style="flex:1"><i style="width:${Math.round(pct * 100)}%"></i></div><span class="small tnum strong">${Math.round(pct * 100)}%</span></div><div class="small muted tnum">${kg(l.soldKg)} of ${kg(l.qtyKg)}</div></td>
          <td class="tnum strong">${som(l.pricePerKg)}</td>
          <td><span class="chip ${diff <= 0 ? "green" : "amber"}">${diff <= 0 ? "−" + Math.round(-diff * 100) : "+" + Math.round(diff * 100)}%</span></td>
          <td class="small">${fmtDate(l.harvestFrom)} – ${fmtDate(l.harvestTo)}</td><td>${st}</td></tr>`; }).join("")}
    </tbody></table>${ls.length ? "" : empty("sprout", "Nothing listed", "Add produce to start selling.")}</div>`;
  }

  function farmerRestaurants() {
    const f = F(S.me.farmer);
    const ls = myListings();
    const rows = S.restaurants.map((r) => {
      const dems = r.demand.filter((d) => ls.some((l) => l.productId === d.productId));
      return { r, dems };
    }).filter((x) => x.dems.length).sort((a, b) => b.dems.length - a.dems.length);
    return `<div class="ph"><div><h1>Restaurants to partner with</h1><p>Restaurants on Hosil whose weekly needs match what you grow.</p></div></div>
    <div class="grid g2">${rows.map(({ r, dems }) => {
      const match = Math.round((dems.length / r.demand.length) * 100);
      return `<div class="card pad"><div class="row" style="margin-bottom:14px"><div class="avatar lg" style="background:${r.color}">${initials(r.name)}</div><div style="flex:1"><div class="strong" style="font-size:16px">${esc(r.name)}</div><div class="small muted">${esc(r.cuisine)} · ${esc(r.district)}, Tashkent · ★ ${r.rating} · ${r.seats} seats</div></div>${ring(match / 100, 52, 6, "#007A33", match + "%")}</div>
        <div class="list">${dems.map((d) => { const p = PR(d.productId); const l = ls.find((x) => x.productId === d.productId); const c = S.contracts.find((x) => x.restaurantId === r.id && x.farmerId === f.id && x.productId === d.productId && ["active", "proposed"].includes(x.status));
          const est = d.kgPerWeek * 4.33 * l.pricePerKg;
          const right = c ? (c.status === "active" ? `<span class="chip green">${I("handshake")}Partner</span>` : `<span class="chip amber">${I("clock")}Pending</span>`) : `<button class="btn primary sm" data-act="offer" data-r="${r.id}" data-p="${d.productId}">${I("handshake")}Offer partnership</button>`;
          return `<div class="item"><span class="emoji sm">${p.emoji}</span><div class="grow"><div class="t">${kg(d.kgPerWeek)} ${p.name.toLowerCase()} / week</div><div class="s">≈ ${short(est)} so'm a month at your price</div></div>${right}</div>`; }).join("")}</div></div>`;
    }).join("")}</div>`;
  }

  function contractRow(c, side) {
    const r = R(c.restaurantId), f = F(c.farmerId), p = PR(c.productId);
    const other = side === "farmer" ? { n: r.name, s: r.cuisine + " · " + r.district, color: r.color } : { n: f.farm, s: f.name + " · " + f.district, color: f.color };
    const needsMe = c.status === "proposed" && ((side === "farmer" && c.initiatedBy === "restaurant") || (side === "restaurant" && c.initiatedBy === "farmer"));
    const val = side === "farmer" ? cValue(c) * (1 - FEE) : cValue(c) * (1 + FEE);
    return `<tr class="click ${ui.fresh.has(c.id) ? "fresh" : ""}" data-act="openContract" data-id="${c.id}">
      <td><div class="row"><div class="avatar sm" style="background:${other.color}">${initials(other.n)}</div><div><div class="strong">${esc(other.n)}</div><div class="small muted">${esc(other.s)}</div></div></div></td>
      <td><div class="row" style="gap:8px"><span class="emoji sm">${p.emoji}</span>${p.name}</div></td>
      <td class="small tnum">${kg(c.kgPerDelivery)} × ${c.perWeek}/wk · ${c.weeks} wks</td>
      <td class="tnum strong">${short(val)} <span class="muted small" style="font-weight:500">so'm</span></td>
      <td>${statusChip(c)}</td><td class="small muted">${c.code}</td>
      <td style="text-align:right">${needsMe ? `<button class="btn primary sm" data-act="openContract" data-id="${c.id}">Review & sign</button>` : `<span class="muted">${I("arrow")}</span>`}</td></tr>`;
  }

  function contractsTable(list, side, tabKey) {
    const t = ui.tabs[tabKey];
    const needs = (c) => c.status === "proposed" && ((side === "farmer" && c.initiatedBy === "restaurant") || (side === "restaurant" && c.initiatedBy === "farmer"));
    const tabs = [["all", "All", list], ["requests", "Needs your signature", list.filter(needs)], ["sent", "Sent", list.filter((c) => c.status === "proposed" && !needs(c))], ["active", "Active", list.filter((c) => c.status === "active")], ["past", "Past", list.filter((c) => ["completed", "declined"].includes(c.status))]];
    const shown = (tabs.find((x) => x[0] === t) || tabs[0])[2].slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return `<div class="row" style="margin-bottom:14px"><div class="tabs">${tabs.map(([k, l, arr]) => `<button class="${k === t ? "on" : ""}" data-act="tab" data-k="${tabKey}" data-v="${k}">${l}<span class="n">${arr.length}</span></button>`).join("")}</div></div>
      <div class="card" style="overflow:hidden"><table class="t"><thead><tr><th>${side === "farmer" ? "Restaurant" : "Farm"}</th><th>Produce</th><th>Volume</th><th>${side === "farmer" ? "You receive" : "You pay"}</th><th>Status</th><th>Contract</th><th></th></tr></thead>
      <tbody>${shown.map((c) => contractRow(c, side)).join("")}</tbody></table>${shown.length ? "" : empty("file", "No contracts here")}</div>`;
  }

  function farmerContracts() {
    return `<div class="ph"><div><h1>Contracts</h1><p>Partnership contracts are created automatically when you and a restaurant agree. Both sides sign inside Hosil.</p></div></div>${contractsTable(myFarmerContracts(), "farmer", "fContracts")}`;
  }

  // ===================================================================== RESTAURANT
  const myRestContracts = () => S.contracts.filter((c) => c.restaurantId === S.me.restaurant);

  function restaurantAssistant() {
    const r = R(S.me.restaurant);
    const cov = coverage(r.id);
    const chips = ["Fill my supply gaps", "200 kg tomatoes and 120 kg cucumbers every week", "150 kg onions weekly under 4000 so'm", "30 kg fresh greens twice a week"];
    return `<div class="grid g-2-1">
      <div>
        <div class="ai-hero"><h2>${I("sparkles")} What does your kitchen need?</h2><p>Type it like you'd tell your supplier. Hosil AI checks every live harvest, ranks the farmers and drafts the contracts.</p>
          <form class="ai-box" data-form="ai"><input name="q" autocomplete="off" placeholder="e.g. 200 kg tomatoes and 120 kg cucumbers every week" value="${esc(ui.aq)}"/><button class="btn primary" type="submit">${I("send")}Find farmers</button></form>
          <div class="ai-chips">${chips.map((c) => `<button data-act="aiChip" data-q="${esc(c)}">${esc(c)}</button>`).join("")}</div>
        </div>
        <div class="thread" id="thread">${ui.thread.map(renderTurn).join("")}</div>
        ${ui.thread.length ? "" : `<div class="card pad mt">${empty("sparkles", "Ask for anything you buy every week", "Hosil AI understands English, Uzbek and Russian product names: pomidor, bodring, kartoshka, помидоры…")}</div>`}
      </div>
      <div>
        <div class="card pad coverage"><div class="card-h"><div><h3>This week's supply coverage</h3><div class="sub">Weekly needs vs what your contracts cover</div></div></div>
          <div class="list">${cov.map((cv) => { const p = PR(cv.productId); return `<div class="item"><span class="emoji sm">${p.emoji}</span><div class="grow"><div class="row between"><span class="t">${p.name}</span><span class="small tnum ${cv.pct >= 0.9 ? "green-t strong" : "muted"}">${kg(cv.covered)} / ${kg(cv.kgPerWeek)}</span></div>
            <div class="progress ${cv.pct >= 0.9 ? "" : "amber"}"><i style="width:${Math.max(3, Math.round(cv.pct * 100))}%"></i></div>
            <div class="s">${cv.pct >= 0.9 ? "Covered by contract" : cv.pending.length ? "Proposal pending with " + esc(F(cv.pending[0].farmerId).farm) : "Gap: not covered yet"}</div></div></div>`; }).join("")}</div>
        </div>
        <div class="card pad mt"><div class="card-h"><div><h3>How Hosil ranks farmers</h3></div></div>
          <div class="stack small">${[["coins", "Price vs today's Tashkent market"], ["pin", "Distance from the farm to your kitchen"], ["star", "Reliability: ratings and on-time deliveries"], ["box", "Enough stock to cover your whole contract"]].map(([ic, t]) => `<div class="row" style="gap:10px"><span class="emoji sm" style="color:var(--green)">${I(ic)}</span>${t}</div>`).join("")}</div></div>
      </div></div>`;
  }

  function renderTurn(t) {
    if (t.role === "user") return `<div class="msg-user"><div>${esc(t.text)}</div></div>`;
    const bot = `<div class="bot">${I("sparkles")}</div>`;
    if (t.status === "thinking") {
      return `<div class="msg-ai">${bot}<div class="body"><div class="say"><div class="typing"><i></i><i></i><i></i></div><ul class="steps">${t.steps.map((s) => `<li>${I("check")}${esc(s)}</li>`).join("")}</ul></div></div></div>`;
    }
    if (!t.items.length) return `<div class="msg-ai">${bot}<div class="body"><div class="say">${esc(t.note || "I couldn't spot a product in that. Try something like \"200 kg tomatoes every week\".")}</div></div></div>`;
    const blocks = t.items.map((it) => {
      const p = PR(it.productId);
      const ms = matchListings(it.productId, it.kgPerWeek, t.maxPrice).slice(0, 3);
      const sentId = t.sent[it.productId];
      const perDel = t.twice ? Math.round(it.kgPerWeek / 2) : it.kgPerWeek;
      return `<div class="match-block"><div class="mh"><span class="emoji">${p.emoji}</span><div style="flex:1"><div class="strong">${p.name} · ${kg(it.kgPerWeek)} a week${t.twice ? " (2 deliveries)" : ""}</div><div class="small muted">${ms.length} farmer${ms.length === 1 ? "" : "s"} can supply this · market ${som(p.market)}/kg${t.maxPrice ? " · your budget ≤ " + som(t.maxPrice) : ""}</div></div>
        ${sentId ? `<span class="chip green">${I("check")}Proposal sent · ${CT(sentId) ? CT(sentId).code : ""}</span>` : ""}</div>
        ${ms.map((m, i) => `<div class="match ${i === 0 ? "best" : ""}"><div class="score">${ringSmall(m.score)}<span>${m.score}</span></div>
          <div><div class="row" style="gap:8px"><b>${esc(m.f.farm)}</b>${i === 0 ? `<span class="chip dark">${I("sparkles")}Best match</span>` : ""}</div><div class="small muted">${esc(m.f.name)} · ${esc(m.f.district)} · ${esc(m.l.variety)}</div>
            <div class="reasons">${m.reasons.slice(0, i === 0 ? 5 : 2).map((x) => `<span class="chip ${x.c}">${esc(x.t)}</span>`).join("")}</div></div>
          <div class="mprice"><div class="strong tnum" style="font-size:17px">${som(m.l.pricePerKg)}<span class="muted small" style="font-weight:500">/kg</span></div><div class="small muted tnum">≈ ${short(it.kgPerWeek * 4.33 * m.l.pricePerKg)} so'm a month</div>
          ${sentId ? "" : `<button class="btn ${i === 0 ? "primary" : ""} sm" style="margin-top:8px" data-act="propose" data-l="${m.l.id}" data-kg="${perDel}" data-pw="${t.twice ? 2 : 1}" data-turn="${t.id}">${I("file")}Propose contract</button>`}</div></div>`).join("")}
      </div>`;
    }).join("");
    const unsent = t.items.filter((it) => !t.sent[it.productId] && matchListings(it.productId, it.kgPerWeek, t.maxPrice).length);
    const totalMonthly = unsent.reduce((s, it) => { const m = matchListings(it.productId, it.kgPerWeek, t.maxPrice)[0]; return s + it.kgPerWeek * 4.33 * m.l.pricePerKg; }, 0);
    const marketMonthly = unsent.reduce((s, it) => s + it.kgPerWeek * 4.33 * PR(it.productId).market, 0);
    return `<div class="msg-ai">${bot}<div class="body"><div class="say">${t.note ? esc(t.note) + " " : ""}I found farmers for <b>${t.items.length} product${t.items.length > 1 ? "s" : ""}</b>. Best matches are ranked first by price, distance, reliability and stock. ${t.maxPrice ? "Farmers over your budget are ranked lower." : ""}</div>
      ${blocks}
      ${unsent.length > 1 ? `<div class="ai-summary"><span class="emoji" style="background:rgba(255,255,255,.1)">${I("bolt")}</span><div class="grow"><b>Send all ${unsent.length} best matches as contract proposals</b><small>≈ ${short(totalMonthly)} so'm a month · saves ≈ ${short(Math.max(0, marketMonthly - totalMonthly))} so'm vs market prices · 12-week contracts</small></div><button class="btn primary" data-act="sendAll" data-turn="${t.id}">${I("send")}Send all</button></div>` : ""}
    </div></div>`;
  }
  function ringSmall(score) { const r = 20, c = 2 * Math.PI * r; return `<svg viewBox="0 0 46 46"><circle cx="23" cy="23" r="${r}" fill="none" stroke="#E6F2EA" stroke-width="4"/><circle cx="23" cy="23" r="${r}" fill="none" stroke="#007A33" stroke-width="4" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - score / 100)}"/></svg>`; }

  function restaurantFarmers() {
    const fl = ui.ffilter;
    let fs = S.farmers.map((f) => {
      let ls = S.listings.filter((l) => l.farmerId === f.id && l.qtyKg > l.soldKg);
      if (fl.product) ls = ls.filter((l) => l.productId === fl.product);
      const r = R(S.me.restaurant);
      const overlap = ls.filter((l) => r.demand.some((d) => d.productId === l.productId)).length;
      const best = ls.map((l) => matchListings(l.productId, (r.demand.find((d) => d.productId === l.productId) || { kgPerWeek: 100 }).kgPerWeek).find((m) => m.l.id === l.id)).filter(Boolean);
      const score = best.length ? Math.max(...best.map((b) => b.score)) + overlap * 2 : 0;
      return { f, ls, score: Math.min(99, score), overlap };
    }).filter((x) => x.ls.length);
    if (fl.q) fs = fs.filter((x) => (x.f.farm + " " + x.f.name + " " + x.f.region + " " + x.f.district).toLowerCase().includes(fl.q.toLowerCase()));
    if (fl.km) fs = fs.filter((x) => x.f.km <= +fl.km);
    const sorters = { match: (a, b) => b.score - a.score, distance: (a, b) => a.f.km - b.f.km, rating: (a, b) => b.f.rating - a.f.rating, price: (a, b) => Math.min(...a.ls.map((l) => l.pricePerKg / PR(l.productId).market)) - Math.min(...b.ls.map((l) => l.pricePerKg / PR(l.productId).market)) };
    fs.sort(sorters[fl.sort]);
    return `<div class="ph"><div><h1>Recommended farmers</h1><p>${fs.length} farms with harvest available now, ranked for ${esc(R(S.me.restaurant).name)}'s weekly needs.</p></div></div>
    <div class="filters">
      <div class="search">${I("search")}<input class="input" data-filter="q" placeholder="Search farm, farmer or region" value="${esc(fl.q)}"/></div>
      <select class="input" data-filter="product"><option value="">All produce</option>${P.map((p) => `<option value="${p.id}" ${fl.product === p.id ? "selected" : ""}>${p.emoji} ${p.name}</option>`).join("")}</select>
      <select class="input" data-filter="km"><option value="">Any distance</option><option value="50" ${fl.km === "50" ? "selected" : ""}>Within 50 km</option><option value="150" ${fl.km === "150" ? "selected" : ""}>Within 150 km</option><option value="400" ${fl.km === "400" ? "selected" : ""}>Within 400 km</option></select>
      <select class="input" data-filter="sort"><option value="match" ${fl.sort === "match" ? "selected" : ""}>Sort: best match</option><option value="price" ${fl.sort === "price" ? "selected" : ""}>Sort: lowest price</option><option value="distance" ${fl.sort === "distance" ? "selected" : ""}>Sort: nearest</option><option value="rating" ${fl.sort === "rating" ? "selected" : ""}>Sort: top rated</option></select>
    </div>
    <div class="grid g3">${fs.map(({ f, ls, score }) => `<div class="card fcard"><div class="top-r"><div class="avatar lg" style="background:${f.color}">${initials(f.farm)}</div><div style="flex:1;min-width:0"><div class="row" style="gap:6px"><b style="font-size:15px">${esc(f.farm)}</b>${f.verified ? `<span title="Verified" style="color:var(--blue);display:flex">${I("shield")}</span>` : ""}</div><div class="small muted">${esc(f.name)}</div></div><div class="score" style="width:46px;height:46px">${ringSmall(score)}<span>${score}</span></div></div>
      <div class="row small muted" style="gap:14px"><span class="row" style="gap:4px">${I("pin")}${esc(f.district)}, ${f.km} km</span><span class="row" style="gap:4px;color:#B7791F">${I("star")}${f.rating} (${f.reviews})</span><span>${f.hectares} ha</span></div>
      <div class="prods">${ls.slice(0, 3).map((l) => { const p = PR(l.productId); const diff = (l.pricePerKg - p.market) / p.market; return `<div class="prod"><span style="font-size:18px">${p.emoji}</span><div class="grow"><div class="small strong">${p.name}</div><div class="small muted">${kg(l.qtyKg - l.soldKg)} available</div></div><div style="text-align:right"><div class="small strong tnum">${som(l.pricePerKg)}</div><span class="small ${diff <= 0 ? "green-t" : "muted"}">${diff <= 0 ? "−" + Math.round(-diff * 100) + "% vs market" : "+" + Math.round(diff * 100) + "%"}</span></div></div>`; }).join("")}</div>
      <div class="foot"><button class="btn primary" style="flex:1" data-act="approach" data-f="${f.id}">${I("handshake")}Approach & make contract</button></div></div>`).join("")}</div>
    ${fs.length ? "" : `<div class="card">${empty("search", "No farmers match these filters")}</div>`}`;
  }

  const upcomingDeliveries = (rid) => deliveriesFor((c) => c.restaurantId === rid, 0, 7);

  function restaurantContracts() {
    const cs = myRestContracts();
    const active = cs.filter((c) => c.status === "active");
    const spend = active.reduce((s, c) => s + cMonthly(c) * (1 + FEE), 0);
    const saved = active.reduce((s, c) => s + (PR(c.productId).market - c.pricePerKg) * c.kgPerDelivery * c.perWeek * 4.33, 0);
    const up = upcomingDeliveries(S.me.restaurant);
    return `<div class="ph"><div><h1>Contracts & supply</h1><p>Every supplier contract, and what's arriving at your kitchen this week.</p></div><div class="actions"><a class="btn primary" href="#/restaurant/assistant">${I("sparkles")}Find more supply</a></div></div>
    <div class="grid g4">
      ${kpi("r-act", "Active suppliers", "handshake", active.length, "", "contracts signed by both sides", true)}
      ${kpi("r-spend", "Produce spend", "coins", short(spend), "so'm / month", "incl. Hosil's 1% fee")}
      ${kpi("r-save", "Saved vs market", "trend", short(Math.max(0, saved)), "so'm / month", "against Tashkent market prices")}
      ${kpi("r-next", "Next delivery", "truck", up[0] ? fmtDay(up[0].d) : "—", "", up[0] ? `${PR(up[0].c.productId).name} from ${esc(up[0].f.farm)}` : "no deliveries scheduled")}
    </div>
    <div class="mt">${contractsTable(cs, "restaurant", "rContracts")}</div>
      <div class="card pad mt"><div class="card-h"><div><h3>Deliveries this week</h3><div class="sub">Collected by Hosil's delivery partner · delivery fee paid by you per order · click a delivery to track it</div></div></div>
        <div class="list" style="display:grid;grid-template-columns:1fr 1fr;column-gap:32px">${up.slice(0, 8).map((x) => { const c = x.c, d = x.d, p = PR(c.productId); return `<div class="item click ${ui.fresh.has(c.id) && x.sub ? "fresh" : ""}" data-act="openDelivery" data-key="${x.key}"><div style="width:46px;text-align:center"><div class="small muted">${d.toLocaleDateString("en-GB", { weekday: "short" })}</div><div class="strong" style="font-size:18px">${d.getDate()}</div></div><span class="emoji sm">${p.emoji}</span><div class="grow"><div class="t">${kg(c.kgPerDelivery)} ${p.name.toLowerCase()}</div><div class="s">${esc(x.f.farm)}${x.sub ? " · replaces " + esc(F(c.farmerId).farm) : ""}</div></div>${x.sub ? `<span class="chip amber">${I("refresh")}Replaced</span>` : ""}${dChip(x)}</div>`; }).join("") || empty("truck", "No deliveries this week")}</div></div>`;
  }

  // ===================================================================== ADMIN
  function adminDashboard() {
    const closed = S.contracts.filter((c) => ["active", "completed"].includes(c.status));
    const gmv = closed.reduce((s, c) => s + cValue(c), 0);
    const act = S.contracts.filter((c) => c.status === "active");
    const perWeek = (list) => list.reduce((s, c) => s + cMonthly(c) / 4.33, 0);
    const baseWeek = perWeek(act.filter((c) => !c.live));
    const weekly = S.weeklyGmv.map((k) => Math.round(k * baseWeek)); weekly[11] = Math.round(perWeek(act));
    const actR = new Set(act.map((c) => c.restaurantId)).size;
    const monthly = act.reduce((s, c) => s + cMonthly(c), 0);
    const bar = (v, max) => `<div class="progress" style="margin:8px 0 6px"><i style="width:${Math.max(2, Math.min(100, Math.round((v / max) * 100)))}%"></i></div>`;
    const labels = weekly.map((_, i) => fmtDate(new Date(Date.now() - (11 - i) * 7 * DAY)));
    const cols = [["proposed", "Proposed", "amber"], ["active", "Active", "green"], ["completed", "Completed", ""], ["declined", "Declined", "red"]];
    const feed = S.activity.slice().sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 6);
    return `<div class="ph"><div><h1>Hosil HQ</h1><p>Everything happening on the platform, live.</p></div></div>
    <div class="grid g4">
      ${kpi("a-deals", "Deals closed", "handshake", closed.length, "", `<b>${S.contracts.filter((c) => c.live && c.status === "active").length ? "+" + S.contracts.filter((c) => c.live && c.status === "active").length + " today" : "+3 this week"}</b>`, true)}
      ${kpi("a-gmv", "Contracted volume (GMV)", "coins", short(gmv), "so'm", "value of all signed contracts")}
      ${kpi("a-rev", "Hosil revenue", "trend", short(gmv * 2 * FEE), "so'm", "1% restaurant + 1% farmer")}
      ${kpi("a-pend", "Pending connections", "link", pendingCount(), "", "waiting for a signature or intro")}
    </div>
    <div class="grid g-2-1 mt">
      <div class="card pad"><div class="card-h"><div><h3>Weekly order volume</h3><div class="sub">so'm through Hosil, last 12 weeks</div></div><div class="right"><span class="chip green">${I("trend")}+${Math.round((weekly[11] / weekly[7] - 1) * 100)}% in 4 weeks</span></div></div>
        ${lineChart({ series: [{ data: weekly, color: "#007A33" }], labels, h: 330 })}</div>
      <div class="card pad"><div class="card-h"><div><h3>Live activity</h3><div class="sub">Across both apps</div></div><div class="right"><div class="livepill"><i></i></div></div></div>
        <div class="feed">${feed.map((a) => `<div class="ev ${ui.fresh.has(a.id) ? "fresh" : ""}"><div class="ic">${I(a.icon || "bell")}</div><div>${esc(a.text)}<small>${ago(a.ts)}</small></div></div>`).join("")}</div></div>
    </div>
    <div class="card pad mt"><div class="card-h"><div><h3>Path to break-even</h3><div class="sub">Pilot target: ${BE.restaurants} active restaurants and ${short(BE.monthly)} so'm of orders a month cover fixed costs of ${short(BE.fixed)} so'm a month</div></div><div class="right"><span class="chip green">${I("coins")}Hosil earns 2% of every order</span></div></div>
      <div class="grid g2" style="gap:36px">
        <div><div class="row between"><span class="strong">Active restaurants</span><span class="tnum"><b>${actR}</b> of ${BE.restaurants}</span></div>${bar(actR, BE.restaurants)}<div class="small muted">Restaurants with at least one active contract</div></div>
        <div><div class="row between"><span class="strong">Orders a month</span><span class="tnum"><b>${short(monthly)}</b> of ${short(BE.monthly)} so'm</span></div>${bar(monthly, BE.monthly)}<div class="small muted">≈ ${short(monthly * 2 * FEE)} so'm a month to Hosil · ${short(monthly / Math.max(1, actR))} so'm per restaurant, against a typical produce spend of ${short(BE.basket)}</div></div>
      </div></div>
    <div class="card pad mt"><div class="card-h"><div><h3>Contract pipeline</h3><div class="sub">Every farmer–restaurant contract by stage</div></div><div class="right"><a class="btn sm" href="#/admin/contracts">Open table ${I("arrow")}</a></div></div>
      <div class="pipe">${cols.map(([st, label, c]) => { const list = S.contracts.filter((x) => x.status === st).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); return `<div class="col"><h5><span class="chip ${c}" style="height:20px">${label}</span><span class="n">${list.length}</span></h5>${list.slice(0, 4).map((x) => `<div class="mini ${ui.fresh.has(x.id) ? "fresh" : ""}" data-act="openContract" data-id="${x.id}"><b>${PR(x.productId).emoji} ${esc(R(x.restaurantId).name)} ← ${esc(F(x.farmerId).farm)}</b><span class="muted">${x.code} · ${short(cValue(x))} so'm</span></div>`).join("")}${list.length > 4 ? `<div class="small muted" style="padding:2px 4px">+${list.length - 4} more</div>` : ""}</div>`; }).join("")}</div></div>`;
  }

  function adminContracts() {
    const t = ui.tabs.aContracts;
    const tabs = [["all", "All"], ["proposed", "Proposed"], ["active", "Active"], ["completed", "Completed"], ["declined", "Declined"]];
    const list = S.contracts.filter((c) => t === "all" || c.status === t).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return `<div class="ph"><div><h1>All contracts</h1><p>${S.contracts.length} contracts · ${short(S.contracts.filter((c) => ["active", "completed"].includes(c.status)).reduce((s, c) => s + cValue(c), 0))} so'm signed</p></div></div>
    <div class="row" style="margin-bottom:14px"><div class="tabs">${tabs.map(([k, l]) => `<button class="${k === t ? "on" : ""}" data-act="tab" data-k="aContracts" data-v="${k}">${l}<span class="n">${k === "all" ? S.contracts.length : S.contracts.filter((c) => c.status === k).length}</span></button>`).join("")}</div></div>
    <div class="card" style="overflow:hidden"><table class="t"><thead><tr><th>Contract</th><th>Farm</th><th>Restaurant</th><th>Produce</th><th>Volume</th><th>Value</th><th>Hosil fee</th><th>Status</th><th>Created</th></tr></thead><tbody>
      ${list.map((c) => { const f = F(c.farmerId), r = R(c.restaurantId), p = PR(c.productId); return `<tr class="click ${ui.fresh.has(c.id) ? "fresh" : ""}" data-act="openContract" data-id="${c.id}"><td class="strong">${c.code}</td><td><div class="row" style="gap:8px"><div class="avatar sm" style="background:${f.color}">${initials(f.farm)}</div>${esc(f.farm)}</div></td><td><div class="row" style="gap:8px"><div class="avatar sm" style="background:${r.color}">${initials(r.name)}</div>${esc(r.name)}</div></td><td>${p.emoji} ${p.name}</td><td class="small tnum">${kg(cKgTotal(c))}</td><td class="tnum strong">${short(cValue(c))}</td><td class="tnum green-t strong">${short(cValue(c) * 2 * FEE)}</td><td>${statusChip(c)}</td><td class="small muted">${ago(c.createdAt)}</td></tr>`; }).join("")}
    </tbody></table></div>`;
  }

  function adminConnections() {
    const props = S.contracts.filter((c) => c.status === "proposed").sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const ff = S.connections.filter((n) => n.type === "farmer-farmer");
    return `<div class="ph"><div><h1>Pending connections</h1><p>Deals and introductions that need a push from the Hosil team.</p></div></div>
    <div class="card pad"><div class="card-h"><div><h3>Farmer ↔ restaurant: waiting for a signature</h3><div class="sub">${props.length} proposals</div></div></div>
      <div class="list">${props.map((c) => { const f = F(c.farmerId), r = R(c.restaurantId), p = PR(c.productId); const waitingOn = c.initiatedBy === "restaurant" ? f.farm : r.name;
        return `<div class="item"><div class="avatar sm" style="background:${r.color}">${initials(r.name)}</div><span class="muted">${I("link")}</span><div class="avatar sm" style="background:${f.color}">${initials(f.farm)}</div>
          <div class="grow"><div class="t">${esc(r.name)} ↔ ${esc(f.farm)}</div><div class="s">${p.emoji} ${p.name} · ${short(cValue(c))} so'm · ${c.code} · sent ${ago(c.createdAt)}</div></div>
          <span class="chip amber">${I("clock")}Waiting on ${esc(waitingOn)}</span>
          <button class="btn sm" data-act="nudge" data-id="${c.id}">${I("bell")}Nudge</button><button class="btn ghost sm" data-act="openContract" data-id="${c.id}">View</button></div>`; }).join("") || empty("check", "Nothing pending", "Every proposal has been answered.")}</div></div>
    <div class="card pad mt"><div class="card-h"><div><h3>Farmer ↔ farmer connections</h3><div class="sub">Shared transport, seed swaps, advice</div></div></div>
      <div class="list">${ff.map((n) => { const a = F(n.fromId), b = F(n.toId); return `<div class="item"><div class="avatar sm" style="background:${a.color}">${initials(a.name)}</div><span class="muted">${I("link")}</span><div class="avatar sm" style="background:${b.color}">${initials(b.name)}</div>
        <div class="grow"><div class="t">${esc(a.name)} → ${esc(b.name)}</div><div class="s">“${esc(n.topic)}” · ${ago(n.createdAt)}</div></div>
        ${n.status === "pending" ? `<span class="chip amber">Pending</span><button class="btn primary sm" data-act="introduce" data-id="${n.id}">${I("handshake")}Introduce</button>` : `<span class="chip green">${I("check")}Connected</span>`}</div>`; }).join("")}</div></div>`;
  }

  const PAGES = {
    farmer: { overview: farmerOverview, harvest: farmerHarvest, restaurants: farmerRestaurants, contracts: farmerContracts },
    restaurant: { assistant: restaurantAssistant, farmers: restaurantFarmers, contracts: restaurantContracts },
    admin: { dashboard: adminDashboard, contracts: adminContracts, connections: adminConnections },
  };

  // ===================================================================== modals
  function contractDoc(c) {
    const f = F(c.farmerId), r = R(c.restaurantId), p = PR(c.productId), l = LI(c.listingId) || {};
    const sig = (who, at, name) => at ? `<div class="sig signed"><small>${who}</small><div class="mark">${esc(name)}</div><small>${I("check")} Signed in Hosil · ${fmtLong(at)}</small></div>` : `<div class="sig"><small>${who}</small><div class="pending">${I("clock")}Waiting for signature</div></div>`;
    return `<div class="doc"><h3>SUPPLY PARTNERSHIP CONTRACT</h3><div class="code">${c.code} · created automatically by Hosil · ${fmtLong(c.createdAt)}</div>
      <ol>
        <li><b>Parties.</b> ${esc(f.name)}, owner of ${esc(f.farm)} (${esc(f.district)}, ${esc(f.region)}), “the Farmer”, and ${esc(r.name)} (${esc(r.district)}, Tashkent), “the Restaurant”.</li>
        <li><b>Produce.</b> ${p.name}${l.variety ? ", " + esc(l.variety) : ""}, quality grade ${l.grade || "A"}.</li>
        <li><b>Volume and schedule.</b> ${kg(c.kgPerDelivery)} per delivery, ${c.perWeek === 2 ? "twice a week (" + c.deliveryDay + ")" : "once a week (" + c.deliveryDay + ")"}, for ${c.weeks} weeks from ${fmtLong(c.startDate)}: ${deliveries(c)} deliveries, ${kg(cKgTotal(c))} in total.</li>
        <li><b>Price.</b> ${som(c.pricePerKg)} per kg, fixed for the whole term. Contract value: <b>${som(cValue(c))}</b>.</li>
        <li><b>Hosil fees.</b> The Restaurant pays the price plus 1%. The Farmer receives the price minus 1%. Payment is settled through Hosil after each confirmed delivery.</li>
        <li><b>Delivery.</b> Hosil's delivery partner collects from the farm. The Restaurant pays the delivery fee for each order.</li>
        <li><b>Quality.</b> The Farmer uploads a handover photo. The Restaurant can reject produce below the agreed grade within 2 hours of delivery.</li>
        <li><b>Changes and cancellation.</b> Either party can change or end the contract with 7 days' notice in Hosil. Disputes go to Hosil support first.</li>
      </ol>
      <div class="sigs">${sig("Farmer", c.signedByFarmer, f.name)}${sig("Restaurant", c.signedByRestaurant, r.name + " (manager)")}</div></div>`;
  }

  function builderSummary(m) {
    const c = { kgPerDelivery: +m.kgPerDelivery || 0, perWeek: +m.perWeek, weeks: +m.weeks, pricePerKg: +m.pricePerKg || 0 };
    const v = cValue(c), pd = perDelivery(c);
    const p = PR(LI(m.listingId).productId);
    const diff = (c.pricePerKg - p.market) / p.market;
    return `<div class="small muted strong" style="text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Contract summary</div>
      <div class="sumrow"><span>Per delivery</span><b class="tnum">${som(pd)}</b></div>
      <div class="sumrow"><span>Deliveries</span><b class="tnum">${deliveries(c)} (${c.perWeek}× a week, ${c.weeks} weeks)</b></div>
      <div class="sumrow"><span>Total produce</span><b class="tnum">${kg(cKgTotal(c))}</b></div>
      <div class="sumrow"><span>Price vs market</span><span class="chip ${diff <= 0 ? "green" : "amber"}">${diff <= 0 ? Math.round(-diff * 100) + "% below" : Math.round(diff * 100) + "% above"} ${som(p.market)}</span></div>
      <div class="sumrow total"><span>Contract value</span><span class="tnum">${som(v)}</span></div>
      <div class="sep"></div>
      <div class="sumrow"><span>Restaurant pays (+1%)</span><b class="tnum">${som(v * (1 + FEE))}</b></div>
      <div class="sumrow"><span>Farmer receives (−1%)</span><b class="tnum">${som(v * (1 - FEE))}</b></div>
      <div class="sumrow"><span class="green-t strong">Hosil fee (2%)</span><b class="tnum green-t">${som(v * 2 * FEE)}</b></div>
      <div class="small muted" style="margin-top:10px">Delivery fee is paid by the restaurant per order, directly to the delivery partner.</div>`;
  }

  function modalHtml() {
    const m = ui.modal;
    if (!m) return "";
    if (m.type === "addListing") {
      const p = PR(m.productId);
      return `<div class="overlay" data-act="closeOverlay"><div class="modal"><div class="mhd"><span class="emoji">${p.emoji}</span><div><h2>Add produce</h2><div class="small muted">Restaurants and Hosil AI see it as soon as you publish</div></div><button class="x" data-act="close">${I("x")}</button></div>
        <form data-form="listing"><div class="mbd form-grid">
          <div class="field"><label>Crop</label><select class="input" name="productId" data-bind="productId">${P.map((x) => `<option value="${x.id}" ${x.id === m.productId ? "selected" : ""}>${x.emoji} ${x.name}</option>`).join("")}</select></div>
          <div class="field"><label>Variety</label><input class="input" name="variety" value="${esc(m.variety)}" placeholder="e.g. Mirzoi, yellow"/></div>
          <div class="field"><label>Quantity available</label><div class="input-suffix"><input class="input" name="qty" type="number" min="1" value="${m.qty}" required/><span>kg</span></div></div>
          <div class="field"><label>Your price</label><div class="input-suffix"><input class="input" name="price" type="number" min="1" value="${m.price}" required/><span>so'm / kg</span></div><span class="hint" id="mkt-hint">Tashkent market today: ${som(p.market)}/kg</span></div>
          <div class="field"><label>Harvest from</label><input class="input" name="from" type="date" value="${m.from}"/></div>
          <div class="field"><label>Available until</label><input class="input" name="to" type="date" value="${m.to}"/></div>
          <div class="field full"><label>Quality grade</label><div class="seg">${["A", "B"].map((g) => `<button type="button" class="${m.grade === g ? "on" : ""}" data-act="grade" data-v="${g}">Grade ${g}${g === "A" ? " · restaurant quality" : " · processing / cooking"}</button>`).join("")}</div></div>
        </div><div class="mft"><span class="grow small muted">${I("shield")} Hosil checks the first delivery from every new listing</span><button type="button" class="btn" data-act="close">Cancel</button><button class="btn primary" type="submit">${I("check")}Publish listing</button></div></form></div></div>`;
    }
    if (m.type === "builder") {
      const l = LI(m.listingId), f = F(l.farmerId), r = R(m.restaurantId), p = PR(l.productId);
      const options = m.side === "farmer" ? myListings().filter((x) => x.qtyKg > x.soldKg) : S.listings.filter((x) => x.farmerId === f.id && x.qtyKg > x.soldKg);
      if (m.step === "done") return successModal(m.doneText, m.doneSub, m.doneCode);
      return `<div class="overlay" data-act="closeOverlay"><div class="modal wide"><div class="mhd"><span class="link-ic">${I("handshake")}</span><div><h2>${m.side === "farmer" ? "Offer a partnership" : "Propose a supply contract"}</h2><div class="small muted">Hosil drafts the contract. The other side signs to make it active.</div></div><button class="x" data-act="close">${I("x")}</button></div>
        <form data-form="builder"><div class="builder"><div class="left">
          <div class="parties"><div class="party"><div class="avatar sm" style="background:${f.color}">${initials(f.farm)}</div><div style="min-width:0"><b>${esc(f.farm)}</b><span>Farmer · ${f.km} km</span></div></div><span class="link-ic">${I("link")}</span><div class="party"><div class="avatar sm" style="background:${r.color}">${initials(r.name)}</div><div style="min-width:0"><b>${esc(r.name)}</b><span>Restaurant · ${esc(r.district)}</span></div></div></div>
          <div class="form-grid">
            <div class="field full"><label>Produce</label><select class="input" data-bind="listingId">${options.map((x) => `<option value="${x.id}" ${x.id === m.listingId ? "selected" : ""}>${PR(x.productId).emoji} ${PR(x.productId).name} · ${esc(x.variety)} · ${som(x.pricePerKg)}/kg · ${kg(x.qtyKg - x.soldKg)} left</option>`).join("")}</select></div>
            <div class="field"><label>Per delivery</label><div class="input-suffix"><input class="input" type="number" min="1" data-bind="kgPerDelivery" value="${m.kgPerDelivery}"/><span>kg</span></div></div>
            <div class="field"><label>Price</label><div class="input-suffix"><input class="input" type="number" min="1" data-bind="pricePerKg" value="${m.pricePerKg}"/><span>so'm / kg</span></div></div>
            <div class="field full"><label>How often</label><div class="seg">${[[1, "Once a week · Thursday"], [2, "Twice a week · Mon & Thu"]].map(([v, t]) => `<button type="button" class="${+m.perWeek === v ? "on" : ""}" data-act="bset" data-k="perWeek" data-v="${v}">${t}</button>`).join("")}</div></div>
            <div class="field full"><label>Contract length</label><div class="seg">${[4, 8, 12, 24].map((v) => `<button type="button" class="${+m.weeks === v ? "on" : ""}" data-act="bset" data-k="weeks" data-v="${v}">${v} weeks</button>`).join("")}</div></div>
            <div class="field"><label>First delivery</label><input class="input" type="date" data-bind="startDate" value="${m.startDate}"/></div>
            <div class="field"><label>Note to ${m.side === "farmer" ? "restaurant" : "farmer"}</label><input class="input" data-bind="note" value="${esc(m.note || "")}" placeholder="Optional"/></div>
          </div></div>
          <div class="right"><div id="bsum">${builderSummary(m)}</div></div></div>
        <div class="mft"><span class="grow small muted">${I("pen")} You sign now. The contract becomes active when ${m.side === "farmer" ? esc(r.name) : esc(f.farm)} signs.</span><button type="button" class="btn" data-act="close">Cancel</button><button class="btn primary" type="submit" ${m.step === "signing" ? "disabled" : ""}>${m.step === "signing" ? `<span class="spinner"></span>Signing…` : `${I("pen")}Sign & send proposal`}</button></div></form></div></div>`;
    }
    if (m.type === "contract") {
      const c = CT(m.id);
      if (m.step === "done") return successModal(m.doneText, m.doneSub, c.code);
      const role = route().role;
      const canSign = c.status === "proposed" && ((role === "farmer" && c.initiatedBy === "restaurant" && c.farmerId === S.me.farmer) || (role === "restaurant" && c.initiatedBy === "farmer" && c.restaurantId === S.me.restaurant));
      return `<div class="overlay" data-act="closeOverlay"><div class="modal wide"><div class="mhd"><span class="emoji">${PR(c.productId).emoji}</span><div><h2>${c.code} · ${PR(c.productId).name}</h2><div class="small muted">${esc(R(c.restaurantId).name)} ↔ ${esc(F(c.farmerId).farm)}</div></div><div style="margin-left:auto">${statusChip(c)}</div><button class="x" style="margin-left:10px" data-act="close">${I("x")}</button></div>
        <div class="builder"><div class="left" style="padding:22px">${contractDoc(c)}</div><div class="right"><div>${builderSummary({ listingId: c.listingId, kgPerDelivery: c.kgPerDelivery, perWeek: c.perWeek, weeks: c.weeks, pricePerKg: c.pricePerKg })}</div></div></div>
        <div class="mft"><span class="grow small muted">${c.status === "proposed" ? `${I("clock")} Sent ${ago(c.createdAt)} by the ${c.initiatedBy}` : c.status === "active" ? `${I("truck")} Deliveries ${c.deliveryDay}` : ""}</span>
          ${canSign ? `<button class="btn danger" data-act="decline" data-id="${c.id}">Decline</button><button class="btn primary lg" data-act="accept" data-id="${c.id}" ${m.step === "signing" ? "disabled" : ""}>${m.step === "signing" ? `<span class="spinner"></span>Signing…` : `${I("pen")}Accept & sign`}</button>` : `${c.status === "active" && (role === "admin" || (role === "farmer" && c.farmerId === S.me.farmer)) ? `<button class="btn danger" data-act="cantDeliver" data-id="${c.id}">${I("refresh")}${role === "admin" ? "Farm can't deliver: find a replacement" : "I can't deliver next time"}</button>` : ""}<button class="btn" data-act="close">Close</button>`}</div></div></div>`;
    }
    if (m.type === "delivery") {
      const x = deliveryByKey(m.key); if (!x) return "";
      const c = x.c, p = PR(c.productId), r = R(c.restaurantId), role = route().role;
      const amt = c.kgPerDelivery * x.price;
      const rej = x.st.status === "rejected";
      const idx = rej ? 2 : ["picked", "way", "delivered", "paid"].indexOf(x.st.status);
      const hm = (iso) => iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
      const steps = [
        ["picked", "Picked up at the farm", "The driver takes a handover photo"],
        ["way", "On the way to " + esc(r.name), "Hosil's delivery partner"],
        ["delivered", "Delivered", "The restaurant has 2 hours to check quality"],
        rej ? ["rejected", "Rejected by the restaurant", "Hosil support contacts both sides"] : ["paid", "Quality confirmed, farmer paid", som(amt * (1 - FEE)) + " to " + esc(x.f.farm)],
      ];
      const mineR = role === "restaurant" && c.restaurantId === S.me.restaurant;
      const mineF = role === "farmer" && x.f.id === S.me.farmer && !x.sub;
      let btns = `<button class="btn" data-act="close">Close</button>`;
      if (mineR && m.running) btns = `<button class="btn primary" disabled><span class="spinner"></span>Delivery in progress…</button>`;
      else if (mineR && x.st.status === "scheduled") btns += `<button class="btn primary" data-act="runDelivery" data-key="${x.key}">${I("truck")}Run this delivery (demo)</button>`;
      else if (mineR && x.st.status === "delivered") btns = `<button class="btn danger" data-act="rejectDelivery" data-key="${x.key}">Reject</button><button class="btn primary lg" data-act="confirmDelivery" data-key="${x.key}">${I("check")}Confirm quality & pay farmer</button>`;
      else if (mineF && x.st.status === "scheduled") btns = `<button class="btn danger" data-act="cantDeliver" data-id="${c.id}" data-key="${x.key}">${I("refresh")}I can't deliver this one</button>` + btns;
      return `<div class="overlay" data-act="closeOverlay"><div class="modal wide"><div class="mhd"><span class="emoji">${p.emoji}</span><div><h2>Delivery · ${kg(c.kgPerDelivery)} ${p.name.toLowerCase()}</h2><div class="small muted">${fmtDay(x.d)} · ${esc(x.f.farm)} → ${esc(r.name)} · ${c.code}</div></div><div style="margin-left:auto">${dChip(x)}</div><button class="x" style="margin-left:10px" data-act="close">${I("x")}</button></div>
        <div class="builder"><div class="left" style="padding:22px">
          ${x.sub ? `<div class="subnote">${I("refresh")}<div><b>Supplier replaced automatically</b>${esc(F(x.sub.fromFarmerId).farm)} can't make this delivery, so Hosil moved it to ${esc(x.f.farm)}, the next-best match (score ${x.sub.score}). One-off price ${som(x.price)}/kg instead of ${som(c.pricePerKg)}. The rest of the contract stays with ${esc(F(x.sub.fromFarmerId).farm)}.</div></div>` : ""}
          <div class="track">${steps.map(([k, t, s], i) => `<div class="tstep ${i <= idx ? "done" : ""} ${i === 3 && rej ? "bad" : ""} ${i === idx + 1 && !rej ? "cur" : ""}"><span class="dot">${i === 3 && rej ? I("x") : i <= idx ? I("check") : i + 1}</span><div><b>${t}</b><small>${s}${x.st.at[k] ? " · " + hm(x.st.at[k]) : ""}</small></div></div>`).join("")}</div>
          ${idx >= 0 ? `<div class="photo"><span>${p.emoji}</span><div><b>Handover photo</b><small>${kg(c.kgPerDelivery)} · ${esc((LI(x.sub ? x.sub.listingId : c.listingId) || {}).variety || p.name)} · taken at pickup${x.st.at.picked ? ", " + hm(x.st.at.picked) : ""}</small></div><span class="chip green">${I("shield")}Grade checked</span></div>` : ""}
        </div><div class="right"><div class="small muted strong" style="text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">This delivery</div>
          <div class="sumrow"><span>Produce</span><b class="tnum">${kg(c.kgPerDelivery)} × ${som(x.price)}</b></div>
          <div class="sumrow total"><span>Order value</span><span class="tnum">${som(amt)}</span></div><div class="sep"></div>
          <div class="sumrow"><span>Restaurant pays (+1%)</span><b class="tnum">${som(amt * (1 + FEE))}</b></div>
          <div class="sumrow"><span>Farmer receives (−1%)</span><b class="tnum">${som(amt * (1 - FEE))}</b></div>
          <div class="sumrow"><span class="green-t strong">Hosil fee (2%)</span><b class="tnum green-t">${som(amt * 2 * FEE)}</b></div>
          <div class="small muted" style="margin-top:10px">The farmer is paid as soon as the restaurant confirms quality. The delivery fee is paid by the restaurant, directly to the delivery partner.</div></div></div>
        <div class="mft"><span class="grow small muted">${I("truck")} Tracked live in both apps and Hosil HQ</span>${btns}</div></div></div>`;
    }
    return "";
  }

  function successModal(title, sub, code) {
    return `<div class="overlay" data-act="closeOverlay"><div class="modal"><div class="success"><div class="big">${I("check")}</div><h2>${title}</h2><p>${sub}</p>${code ? `<div style="margin-top:14px"><span class="chip green">${I("file")}${code}</span></div>` : ""}</div><div class="mft" style="justify-content:center;background:#fff;border:0"><button class="btn primary" data-act="close">Done</button></div></div></div>`;
  }

  function renderModal() { document.getElementById("modal").innerHTML = modalHtml(); }

  // ===================================================================== actions
  function newContract({ listingId, restaurantId, side, kgPerDelivery, perWeek, weeks, pricePerKg, startDate, note }) {
    const l = LI(listingId);
    S.seq += 1;
    const c = {
      id: "c" + S.seq, code: "HSL-" + String(S.seq).padStart(4, "0"), farmerId: l.farmerId, restaurantId, listingId, productId: l.productId,
      kgPerDelivery: +kgPerDelivery, perWeek: +perWeek, deliveryDay: +perWeek === 2 ? "Mon & Thu" : "Thursday", pricePerKg: +pricePerKg, weeks: +weeks,
      startDate: new Date(startDate || nextWeekday(1, 4)).toISOString(), status: "proposed", initiatedBy: side, createdAt: new Date().toISOString(),
      signedByFarmer: side === "farmer" ? new Date().toISOString() : null, signedByRestaurant: side === "restaurant" ? new Date().toISOString() : null, live: true, note: note || "",
    };
    S.contracts.push(c);
    ui.fresh.add(c.id);
    const f = F(c.farmerId), r = R(restaurantId), p = PR(c.productId);
    if (side === "restaurant") addActivity({ actor: "restaurant:" + r.id, to: ["farmer:" + f.id], icon: "file", ref: c.id, link: "#/farmer/contracts", title: "New partnership request", text: `${r.name} sent ${f.farm} a contract proposal for ${p.name.toLowerCase()} (${short(cValue(c))} so'm)` });
    else addActivity({ actor: "farmer:" + f.id, to: ["restaurant:" + r.id], icon: "file", ref: c.id, link: "#/restaurant/contracts", title: "New offer from a farmer", text: `${f.farm} offered ${r.name} a ${c.weeks}-week contract for ${p.name.toLowerCase()} (${short(cValue(c))} so'm)` });
    return c;
  }

  function openBuilder({ side, listingId, restaurantId, kgPerDelivery, perWeek, turn }) {
    const l = LI(listingId);
    const r = R(restaurantId);
    const dm = r.demand.find((d) => d.productId === l.productId);
    const pw = +(perWeek || 1);
    ui.modal = { type: "builder", side, listingId, restaurantId, turn, kgPerDelivery: kgPerDelivery || (dm ? Math.round(dm.kgPerWeek / pw) : 100), perWeek: pw, weeks: 12, pricePerKg: l.pricePerKg, startDate: nextWeekday(1, pw === 2 ? 1 : 4).toISOString().slice(0, 10), note: "", step: "edit" };
    renderModal();
  }

  function confetti() {
    const box = document.createElement("div"); box.className = "confetti";
    const colors = ["#007A33", "#7EE2A4", "#F6C453", "#ffffff", "#2F6F4E"];
    for (let i = 0; i < 70; i++) { const s = document.createElement("i"); s.style.left = Math.random() * 100 + "vw"; s.style.background = colors[i % colors.length]; s.style.animationDelay = Math.random() * 0.4 + "s"; s.style.animationDuration = 1.2 + Math.random() * 0.9 + "s"; box.appendChild(s); }
    document.body.appendChild(box); setTimeout(() => box.remove(), 2600);
  }

  async function runAI(q) {
    q = q.trim(); if (!q) return;
    ui.aq = "";
    const r = R(S.me.restaurant);
    const turnU = { id: uid("t"), role: "user", text: q };
    const turnA = { id: uid("t"), role: "ai", status: "thinking", steps: [], items: [], sent: {}, twice: false, maxPrice: null, note: "" };
    ui.thread.push(turnU, turnA);
    render(); scrollThread();
    let parsed;
    if (/gap|missing|cover/i.test(q)) {
      const gaps = coverage(r.id).filter((c) => c.pct < 0.9 && !c.pending.length);
      const skipped = coverage(r.id).filter((c) => c.pct < 0.9 && c.pending.length);
      parsed = { items: gaps.map((g) => ({ productId: g.productId, kgPerWeek: g.kgPerWeek - g.covered })), twice: false, maxPrice: null };
      turnA.note = `Your contracts don't cover ${gaps.map((g) => PR(g.productId).name.toLowerCase()).join(" and ")} yet.` + (skipped.length ? ` ${PR(skipped[0].productId).name} already has a proposal pending, so I skipped it.` : "");
    } else {
      parsed = parseQuery(q);
      parsed.items.forEach((it) => { if (!it.kgPerWeek) { const dm = r.demand.find((d) => d.productId === it.productId); it.kgPerWeek = dm ? dm.kgPerWeek : 100; } });
    }
    const steps = ["Understood: " + (parsed.items.map((i) => kg(i.kgPerWeek) + " " + PR(i.productId).name.toLowerCase()).join(", ") || "no products found"), `Checked ${S.listings.length} live harvest listings from ${S.farmers.length} farms`, "Ranked by price, distance, reliability and stock"];
    for (const s of steps) { await sleep(520); turnA.steps.push(s); patchThread(); }
    await sleep(450);
    Object.assign(turnA, parsed, { status: "done" });
    patchThread(); scrollThread();
  }
  function patchThread() { const el = document.getElementById("thread"); if (el && route().page === "assistant") el.innerHTML = ui.thread.map(renderTurn).join(""); }
  function scrollThread() { setTimeout(() => { const el = document.getElementById("thread"); if (el && el.lastElementChild) el.lastElementChild.scrollIntoView({ behavior: "smooth", block: "end" }); }, 60); }

  const actions = {
    reset() { if (!EMBED && !confirm("Reset all demo data to the starting state?")) return; S = window.hosilSeed(); ui.thread = []; ui.fresh.clear(); ui.prevKpi = {}; persist(); render(); toast({ title: "Demo reset", text: "All data is back to the starting state.", icon: "refresh" }); },
    bell() { ui.notifOpen = !ui.notifOpen; if (!ui.notifOpen) { S.seen[identity()] = Date.now(); persist(); } render(); },
    priceCrop(d) { ui.priceCrop = d.id; render(); },
    tab(d) { ui.tabs[d.k] = d.v; render(); },
    addListing() {
      const p = P.find((x) => x.id === "onion");
      ui.modal = { type: "addListing", productId: p.id, variety: "Yellow, storage", qty: 3000, price: Math.round(p.market * 0.9 / 100) * 100, grade: "A", from: new Date().toISOString().slice(0, 10), to: new Date(Date.now() + 45 * DAY).toISOString().slice(0, 10) };
      renderModal();
    },
    grade(d) { ui.modal.grade = d.v; document.querySelectorAll('[data-act="grade"]').forEach((b) => b.classList.toggle("on", b.dataset.v === d.v)); },
    close() { ui.modal = null; renderModal(); render(); },
    closeOverlay(d, el, ev) { if (ev.target === el) actions.close(); },
    offer(d) {
      const l = myListings().find((x) => x.productId === d.p && x.qtyKg > x.soldKg) || myListings()[0];
      openBuilder({ side: "farmer", listingId: l.id, restaurantId: d.r });
    },
    approach(d) {
      const r = R(S.me.restaurant);
      const ls = S.listings.filter((l) => l.farmerId === d.f && l.qtyKg > l.soldKg);
      const pick = (ui.ffilter.product && ls.find((l) => l.productId === ui.ffilter.product)) || ls.find((l) => r.demand.some((dm) => dm.productId === l.productId)) || ls[0];
      openBuilder({ side: "restaurant", listingId: pick.id, restaurantId: r.id });
    },
    propose(d) { openBuilder({ side: "restaurant", listingId: d.l, restaurantId: S.me.restaurant, kgPerDelivery: +d.kg, perWeek: +d.pw, turn: d.turn }); },
    bset(d) { ui.modal[d.k] = +d.v; document.querySelectorAll(`[data-act="bset"][data-k="${d.k}"]`).forEach((b) => b.classList.toggle("on", b.dataset.v === d.v)); const el = document.getElementById("bsum"); if (el) el.innerHTML = builderSummary(ui.modal); },
    aiChip(d) { runAI(d.q); },
    sendAll(d) {
      const t = ui.thread.find((x) => x.id === d.turn); if (!t) return;
      let n = 0, total = 0;
      t.items.forEach((it) => {
        if (t.sent[it.productId]) return;
        const m = matchListings(it.productId, it.kgPerWeek, t.maxPrice)[0]; if (!m) return;
        const pw = t.twice ? 2 : 1;
        const c = newContract({ listingId: m.l.id, restaurantId: S.me.restaurant, side: "restaurant", kgPerDelivery: Math.round(it.kgPerWeek / pw), perWeek: pw, weeks: 12, pricePerKg: m.l.pricePerKg, startDate: nextWeekday(1, pw === 2 ? 1 : 4) });
        t.sent[it.productId] = c.id; n++; total += cValue(c);
      });
      persist(); render(); scrollThread();
      toast({ title: `${n} contract proposals sent`, text: `${short(total)} so'm in total. Farmers have been notified.`, icon: "send" });
    },
    openContract(d, el, ev) { if (ev && ev.target.closest("button") && ev.target.closest("button") !== el) return; ui.modal = { type: "contract", id: d.id, step: "view" }; renderModal(); },
    async accept(d) {
      const c = CT(d.id); ui.modal.step = "signing"; renderModal();
      await sleep(1100);
      const role = route().role;
      if (role === "farmer") c.signedByFarmer = new Date().toISOString(); else c.signedByRestaurant = new Date().toISOString();
      c.status = "active"; c.live = true;
      const l = LI(c.listingId); if (l) { c.soldAdded = Math.min(l.qtyKg - l.soldKg, cKgTotal(c)); l.soldKg += c.soldAdded; }
      const f = F(c.farmerId), r = R(c.restaurantId), p = PR(c.productId);
      const days = c.perWeek === 2 ? [1, 4] : [4];
      const first = new Date(Math.max(new Date(c.startDate).getTime(), Date.now() + DAY)); while (!days.includes(first.getDay())) first.setDate(first.getDate() + 1);
      c.startDate = first.toISOString();
      addActivity({ actor: identity(), to: [role === "farmer" ? "restaurant:" + r.id : "farmer:" + f.id], icon: "check", ref: c.id, link: role === "farmer" ? "#/restaurant/contracts" : "#/farmer/contracts", title: "Contract signed 🎉", text: `${f.farm} and ${r.name} signed ${c.code}: ${p.name.toLowerCase()}, ${short(cValue(c))} so'm` });
      ui.fresh.add(c.id);
      persist();
      ui.modal = { type: "contract", id: c.id, step: "done", doneText: "Contract signed", doneSub: `${c.code} is now active. First delivery of ${kg(c.kgPerDelivery)} ${p.name.toLowerCase()} is scheduled for ${fmtDay(first)}. ${role === "farmer" ? "You'll receive " + som(cValue(c) * (1 - FEE)) + " over the contract." : ""}` };
      renderModal(); render(); confetti();
    },
    decline(d) {
      const c = CT(d.id); c.status = "declined";
      const f = F(c.farmerId), r = R(c.restaurantId);
      addActivity({ actor: identity(), to: [route().role === "farmer" ? "restaurant:" + r.id : "farmer:" + f.id], icon: "x", ref: c.id, title: "Proposal declined", text: `${route().role === "farmer" ? f.farm : r.name} declined ${c.code}` });
      persist(); ui.modal = null; renderModal(); render();
    },
    openDelivery(d) { ui.modal = { type: "delivery", key: d.key }; renderModal(); },
    async runDelivery(d) {
      const key = d.key; ui.modal.running = true;
      for (const s of ["picked", "way", "delivered"]) {
        renderModal(); await sleep(1200);
        const st = S.deliv[key] || (S.deliv[key] = { status: "scheduled", at: {} });
        st.status = s; st.at[s] = new Date().toISOString();
        persist(); render();
      }
      if (ui.modal && ui.modal.key === key) ui.modal.running = false;
      renderModal();
    },
    confirmDelivery(d) {
      const x = deliveryByKey(d.key), st = S.deliv[d.key]; if (!x || !st) return;
      st.status = "paid"; st.at.paid = new Date().toISOString();
      const c = x.c, r = R(c.restaurantId), p = PR(c.productId), amt = c.kgPerDelivery * x.price;
      addActivity({ actor: identity(), to: ["farmer:" + x.f.id], icon: "coins", ref: c.id, link: "#/farmer/overview", title: "Payment received", text: `${r.name} confirmed ${kg(c.kgPerDelivery)} of ${p.name.toLowerCase()}. ${som(amt * (1 - FEE))} paid to ${x.f.farm}, Hosil fee ${som(amt * 2 * FEE)}` });
      persist(); renderModal(); render();
      toast({ title: "Quality confirmed", text: `${x.f.farm} has been paid ${som(amt * (1 - FEE))}.`, icon: "check" });
    },
    rejectDelivery(d) {
      const x = deliveryByKey(d.key), st = S.deliv[d.key]; if (!x || !st) return;
      st.status = "rejected"; st.at.rejected = new Date().toISOString();
      const c = x.c, r = R(c.restaurantId), p = PR(c.productId);
      addActivity({ actor: identity(), to: ["farmer:" + x.f.id], icon: "x", ref: c.id, link: "#/farmer/overview", title: "Delivery rejected", text: `${r.name} rejected ${kg(c.kgPerDelivery)} of ${p.name.toLowerCase()} from ${x.f.farm}. Hosil support will contact both sides` });
      persist(); renderModal(); render();
    },
    // F6/R5: the farm can't make its next delivery, so Hosil moves that one delivery to the next-best farm.
    cantDeliver(d) {
      const c = CT(d.id);
      const x = deliveriesFor((k) => k.id === c.id, 0, 10).find((k) => (!d.key || k.key === d.key) && k.st.status === "scheduled" && !k.sub);
      if (!x) { toast({ title: "Nothing to replace", text: "The next delivery is already under way or has been replaced.", icon: "clock" }); return; }
      const f = F(c.farmerId), r = R(c.restaurantId), p = PR(c.productId), day = fmtDay(x.d);
      const m = matchListings(c.productId, c.kgPerDelivery * c.perWeek).find((k) => k.f.id !== c.farmerId && k.avail >= c.kgPerDelivery);
      if (!m) {
        addActivity({ actor: identity(), to: ["restaurant:" + r.id], icon: "clock", ref: c.id, link: "#/restaurant/contracts", title: "Delivery at risk", text: `${f.farm} can't deliver ${p.name.toLowerCase()} on ${day} and no other farm has enough stock. Hosil support is on it` });
        persist(); ui.modal = null; renderModal(); render();
        toast({ title: "No replacement available", text: "Hosil support has been alerted.", icon: "clock" });
        return;
      }
      S.subs.push({ id: uid("s"), key: x.key, contractId: c.id, fromFarmerId: f.id, toFarmerId: m.f.id, listingId: m.l.id, pricePerKg: m.l.pricePerKg, score: m.score, ts: new Date().toISOString() });
      m.l.soldKg += c.kgPerDelivery;
      const ol = LI(c.listingId); if (ol) ol.soldKg = Math.max(0, ol.soldKg - c.kgPerDelivery);
      addActivity({ actor: identity(), to: ["restaurant:" + r.id], icon: "refresh", ref: c.id, link: "#/restaurant/contracts", title: "Supplier replaced automatically", text: `${f.farm} can't deliver ${p.name.toLowerCase()} on ${day}. Hosil moved the order to ${m.f.farm}: ${kg(c.kgPerDelivery)} at ${som(m.l.pricePerKg)}/kg` });
      addActivity({ actor: identity(), to: ["farmer:" + m.f.id], icon: "bolt", ref: c.id, link: "#/farmer/overview", title: "Replacement order for you", text: `${r.name} needs ${kg(c.kgPerDelivery)} of ${p.name.toLowerCase()} on ${day}. Hosil assigned it to ${m.f.farm} at the listed price, ${som(m.l.pricePerKg)}/kg` });
      ui.fresh.add(c.id);
      persist();
      ui.modal = { type: "contract", id: c.id, step: "done", doneText: "Replacement found", doneSub: `${esc(m.f.farm)} will deliver ${kg(c.kgPerDelivery)} of ${p.name.toLowerCase()} on ${day} instead (match score ${m.score}). ${esc(r.name)} has been notified. The rest of the contract stays with ${esc(f.farm)}.` };
      renderModal(); render();
    },
    nudge(d) {
      const c = CT(d.id); const f = F(c.farmerId), r = R(c.restaurantId);
      const target = c.initiatedBy === "restaurant" ? "farmer:" + f.id : "restaurant:" + r.id;
      addActivity({ actor: "admin", to: [target], icon: "bell", ref: c.id, link: c.initiatedBy === "restaurant" ? "#/farmer/contracts" : "#/restaurant/contracts", title: "Reminder from Hosil", text: `${c.initiatedBy === "restaurant" ? r.name : f.farm} is waiting for your signature on ${c.code}` });
      persist(); render();
      toast({ title: "Reminder sent", text: `${c.initiatedBy === "restaurant" ? f.farm : r.name} got a push notification and an SMS.`, icon: "bell" });
    },
    introduce(d) {
      const n = S.connections.find((x) => x.id === d.id); n.status = "accepted";
      const a = F(n.fromId), b = F(n.toId);
      addActivity({ actor: "admin", to: ["farmer:" + a.id, "farmer:" + b.id], icon: "users", title: "You're connected", text: `Hosil connected ${a.name} and ${b.name}: ${n.topic.toLowerCase()}` });
      persist(); render();
      toast({ title: "Farmers connected", text: `${a.name} and ${b.name} can now message each other.`, icon: "users" });
    },
  };

  // ===================================================================== toasts & sync
  function toast(a) {
    const box = document.getElementById("toasts");
    const el = document.createElement("div"); el.className = "toast";
    el.innerHTML = `<div class="ic">${I(a.icon || "bell")}</div><div><b>${esc(a.title || "Hosil")}</b><span>${esc(a.text)}</span></div>`;
    el.onclick = () => { if (a.link) go(a.link); el.remove(); };
    box.appendChild(el);
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 320); }, 6000);
  }

  window.addEventListener("storage", (e) => {
    if (e.key !== KEY || !e.newValue) return;
    const prevIds = new Set(S.activity.map((a) => a.id));
    const prevContracts = new Set(S.contracts.map((c) => c.id + c.status));
    try { S = JSON.parse(e.newValue); } catch (err) { return; }
    const me = identity();
    S.activity.filter((a) => !prevIds.has(a.id)).forEach((a) => {
      ui.fresh.add(a.id);
      if (a.ref) ui.fresh.add(a.ref);
      if (me && (me === "admin" || a.to.includes(me)) && a.actor !== me) toast(a);
    });
    S.contracts.forEach((c) => { if (!prevContracts.has(c.id + c.status)) ui.fresh.add(c.id); });
    if (ui.modal && ((ui.modal.type === "contract" && ui.modal.step === "view") || ui.modal.type === "delivery")) renderModal();
    render();
  });

  // ===================================================================== events
  document.addEventListener("click", (ev) => {
    const a = EMBED && ev.target.closest('a[href^="#"]');
    if (a && !a.dataset.act) { ev.preventDefault(); go(a.getAttribute("href")); return; }
    const el = ev.target.closest("[data-act]");
    if (!el) { if (ui.notifOpen && !ev.target.closest(".notif")) { ui.notifOpen = false; S.seen[identity()] = Date.now(); persist(); render(); } return; }
    const fn = actions[el.dataset.act];
    if (fn) { if (el.tagName === "A") ev.preventDefault(); fn(el.dataset, el, ev); }
  });

  document.addEventListener("input", (ev) => {
    const t = ev.target;
    if (t.dataset.bind && ui.modal) {
      ui.modal[t.dataset.bind] = t.value;
      if (ui.modal.type === "builder") {
        if (t.dataset.bind === "listingId") { ui.modal.pricePerKg = LI(t.value).pricePerKg; const pi = document.querySelector('[data-bind="pricePerKg"]'); if (pi) pi.value = ui.modal.pricePerKg; }
        const el = document.getElementById("bsum"); if (el) el.innerHTML = builderSummary(ui.modal);
      }
      if (ui.modal.type === "addListing" && t.dataset.bind === "productId") {
        const p = PR(t.value); const form = t.form;
        form.price.value = Math.round(p.market * 0.95 / 100) * 100;
        document.getElementById("mkt-hint").textContent = `Tashkent market today: ${som(p.market)}/kg`;
        document.querySelector(".modal .mhd .emoji").textContent = p.emoji;
      }
    }
    if (t.dataset.filter) {
      ui.ffilter[t.dataset.filter] = t.value;
      if (t.dataset.filter === "q") { const pos = t.selectionStart; render(); const n = document.querySelector('[data-filter="q"]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }
      else render();
    }
    if (t.name === "q" && t.closest('[data-form="ai"]')) ui.aq = t.value;
  });
  document.addEventListener("change", (ev) => { if (ev.target.dataset.filter && ev.target.tagName === "SELECT") { ui.ffilter[ev.target.dataset.filter] = ev.target.value; render(); } });

  document.addEventListener("submit", async (ev) => {
    const form = ev.target; const kind = form.dataset.form; if (!kind) return;
    ev.preventDefault();
    if (kind === "ai") { runAI(form.q.value); return; }
    if (kind === "listing") {
      const m = ui.modal; const fd = new FormData(form);
      const p = PR(fd.get("productId"));
      const l = { id: uid("l"), farmerId: S.me.farmer, productId: p.id, variety: fd.get("variety") || "Local", qtyKg: +fd.get("qty"), soldKg: 0, pricePerKg: +fd.get("price"), grade: m.grade, harvestFrom: new Date(fd.get("from")).toISOString(), harvestTo: new Date(fd.get("to")).toISOString(), createdAt: new Date().toISOString() };
      S.listings.push(l); ui.fresh.add(l.id);
      const f = F(S.me.farmer);
      const targets = S.restaurants.filter((r) => r.demand.some((d) => d.productId === p.id)).map((r) => "restaurant:" + r.id);
      addActivity({ actor: "farmer:" + f.id, to: targets, icon: "sprout", title: "New harvest on Hosil", link: "#/restaurant/farmers", text: `${f.farm} listed ${kg(l.qtyKg)} of ${p.name.toLowerCase()} at ${som(l.pricePerKg)}/kg` });
      ui.priceCrop = p.id;
      persist(); ui.modal = null; renderModal();
      go("#/farmer/harvest");
      toast({ title: "Listing published", text: `${targets.length} restaurants that buy ${p.name.toLowerCase()} were notified.`, icon: "check" });
      return;
    }
    if (kind === "builder") {
      const m = ui.modal; if (!(+m.kgPerDelivery > 0 && +m.pricePerKg > 0)) return;
      m.step = "signing"; renderModal();
      await sleep(1000);
      const c = newContract(m);
      if (m.turn) { const t = ui.thread.find((x) => x.id === m.turn); if (t) t.sent[c.productId] = c.id; }
      persist();
      const other = m.side === "farmer" ? R(m.restaurantId).name : F(c.farmerId).farm;
      Object.assign(m, { step: "done", doneText: "Proposal sent", doneSub: `Hosil created contract ${c.code} and sent it to ${other}. You'll be notified the moment they sign.`, doneCode: c.code });
      renderModal(); render();
    }
  });

  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && ui.modal) actions.close(); });

  // ===================================================================== render
  const app = document.getElementById("app");
  function render() {
    const { role, page } = route();
    if (!role) { app.innerHTML = splash(); return; }
    const fn = (PAGES[role] || {})[page] || Object.values(PAGES[role])[0];
    const scroll = window.scrollY;
    app.innerHTML = `<div class="shell">${sidebar(role, page)}<div class="main">${topbar(role)}<main class="page">${fn()}</main></div></div>`;
    window.scrollTo(0, scroll);
    setTimeout(() => ui.fresh.clear(), 2600);
  }
  let lastRoute = curHash();
  function onRoute() { const prevRole = (lastRoute.split("/")[1] || ""); lastRoute = curHash(); ui.notifOpen = false; if (ui.modal) { ui.modal = null; renderModal(); } if (prevRole !== route().role) ui.prevKpi = {}; window.scrollTo(0, 0); render(); }
  window.addEventListener("hashchange", () => { if (!EMBED) onRoute(); });
  // Re-render every 30 s so "2 min ago" labels stay fresh during the recording.
  setInterval(() => { if (!ui.modal && document.activeElement.tagName !== "INPUT") render(); }, 30000);
  render();
})();
