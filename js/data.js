// Hosil demo — seed data. Everything here is illustrative demo data, not real businesses.
// Shape of every entity mirrors docs/BACKEND_SPEC.md (the backend source of truth).

window.HOSIL_PRODUCTS = [
  { id: "tomato",      name: "Tomatoes",      emoji: "🍅", unit: "kg", market: 14000, synonyms: ["tomato", "tomatoes", "pomidor", "помидор", "помидоры"] },
  { id: "cucumber",    name: "Cucumbers",     emoji: "🥒", unit: "kg", market: 12000, synonyms: ["cucumber", "cucumbers", "bodring", "огурец", "огурцы"] },
  { id: "potato",      name: "Potatoes",      emoji: "🥔", unit: "kg", market: 5500,  synonyms: ["potato", "potatoes", "kartoshka", "картошка", "картофель"] },
  { id: "onion",       name: "Onions",        emoji: "🧅", unit: "kg", market: 4000,  synonyms: ["onion", "onions", "piyoz", "лук"] },
  { id: "carrot",      name: "Carrots",       emoji: "🥕", unit: "kg", market: 4500,  synonyms: ["carrot", "carrots", "sabzi", "морковь", "морковка"] },
  { id: "cabbage",     name: "Cabbage",       emoji: "🥬", unit: "kg", market: 3500,  synonyms: ["cabbage", "karam", "капуста"] },
  { id: "pepper",      name: "Bell peppers",  emoji: "🫑", unit: "kg", market: 16000, synonyms: ["pepper", "peppers", "bell pepper", "bell peppers", "qalampir", "перец"] },
  { id: "eggplant",    name: "Eggplant",      emoji: "🍆", unit: "kg", market: 9000,  synonyms: ["eggplant", "eggplants", "aubergine", "baqlajon", "баклажан"] },
  { id: "greens",      name: "Fresh greens",  emoji: "🌿", unit: "kg", market: 20000, synonyms: ["greens", "herbs", "coriander", "dill", "kashnich", "ukrop", "зелень"] },
  { id: "garlic",      name: "Garlic",        emoji: "🧄", unit: "kg", market: 25000, synonyms: ["garlic", "sarimsoq", "чеснок"] },
  { id: "apple",       name: "Apples",        emoji: "🍎", unit: "kg", market: 9000,  synonyms: ["apple", "apples", "olma", "яблоки", "яблоко"] },
  { id: "grapes",      name: "Grapes",        emoji: "🍇", unit: "kg", market: 15000, synonyms: ["grape", "grapes", "uzum", "виноград"] },
];

window.hosilSeed = function hosilSeed() {
  const DAY = 86400000;
  const now = Date.now();
  const d = (offsetDays) => new Date(now + offsetDays * DAY).toISOString();

  const farmers = [
    { id: "f1", name: "Bahodir Karimov",   farm: "Karimov Agro",          region: "Tashkent region", district: "Bo'stonliq", km: 34,  hectares: 12, rating: 4.9, reviews: 41, verified: true,  since: "2026", color: "#007A33" },
    { id: "f2", name: "Dilshod Rakhimov",  farm: "Rakhimov Fields",       region: "Tashkent region", district: "Chinoz",     km: 58,  hectares: 30, rating: 4.7, reviews: 28, verified: true,  since: "2026", color: "#2F6F4E" },
    { id: "f3", name: "Malika Yusupova",   farm: "Yusupova Greenhouses",  region: "Tashkent region", district: "Zangiota",   km: 22,  hectares: 6,  rating: 4.6, reviews: 19, verified: true,  since: "2026", color: "#8A5A00" },
    { id: "f4", name: "Sardor Tursunov",   farm: "Tursunov Orchard",      region: "Fergana",         district: "Rishton",    km: 310, hectares: 18, rating: 4.8, reviews: 33, verified: true,  since: "2026", color: "#9B2C2C" },
    { id: "f5", name: "Nodira Ergasheva",  farm: "Ergash Family Farm",    region: "Samarkand",       district: "Urgut",      km: 290, hectares: 25, rating: 4.5, reviews: 14, verified: false, since: "2026", color: "#4C51BF" },
    { id: "f6", name: "Jasur Aliyev",      farm: "Aliyev Greens",         region: "Tashkent region", district: "Qibray",     km: 18,  hectares: 4,  rating: 4.8, reviews: 37, verified: true,  since: "2026", color: "#276749" },
    { id: "f7", name: "Gulnora Saidova",   farm: "Saidova Agro",          region: "Andijan",         district: "Asaka",      km: 340, hectares: 20, rating: 4.4, reviews: 11, verified: true,  since: "2026", color: "#B7791F" },
    { id: "f8", name: "Otabek Nazarov",    farm: "Nazarov Farm",          region: "Syrdarya",        district: "Guliston",   km: 120, hectares: 15, rating: 4.6, reviews: 22, verified: true,  since: "2026", color: "#2C7A7B" },
  ];

  const restaurants = [
    { id: "r1", name: "Lola Kitchen",     cuisine: "Uzbek & European", district: "Yunusobod",       rating: 4.7, seats: 120, color: "#007A33",
      demand: [ { productId: "tomato", kgPerWeek: 200 }, { productId: "cucumber", kgPerWeek: 120 }, { productId: "potato", kgPerWeek: 300 }, { productId: "onion", kgPerWeek: 150 }, { productId: "greens", kgPerWeek: 25 } ] },
    { id: "r2", name: "Tandir Yard",      cuisine: "Uzbek grill",      district: "Chilonzor",       rating: 4.6, seats: 90,  color: "#9B2C2C",
      demand: [ { productId: "tomato", kgPerWeek: 160 }, { productId: "onion", kgPerWeek: 200 }, { productId: "greens", kgPerWeek: 20 } ] },
    { id: "r3", name: "Silk Table",       cuisine: "Fusion",           district: "Mirobod",         rating: 4.8, seats: 70,  color: "#4C51BF",
      demand: [ { productId: "greens", kgPerWeek: 30 }, { productId: "pepper", kgPerWeek: 60 }, { productId: "cucumber", kgPerWeek: 70 } ] },
    { id: "r4", name: "Green Plov House", cuisine: "Plov centre",      district: "Shaykhontohur",   rating: 4.5, seats: 200, color: "#B7791F",
      demand: [ { productId: "carrot", kgPerWeek: 600 }, { productId: "onion", kgPerWeek: 350 }, { productId: "garlic", kgPerWeek: 30 } ] },
    { id: "r5", name: "Café Bahor",       cuisine: "Café & bakery",    district: "Mirzo Ulug'bek",  rating: 4.6, seats: 60,  color: "#2C7A7B",
      demand: [ { productId: "cucumber", kgPerWeek: 80 }, { productId: "tomato", kgPerWeek: 90 }, { productId: "apple", kgPerWeek: 70 } ] },
    { id: "r6", name: "Ko'kcha Grill",    cuisine: "Grill & salads",   district: "Olmazor",         rating: 4.4, seats: 110, color: "#2F6F4E",
      demand: [ { productId: "tomato", kgPerWeek: 140 }, { productId: "eggplant", kgPerWeek: 60 }, { productId: "pepper", kgPerWeek: 50 } ] },
  ];

  const L = (id, farmerId, productId, variety, qtyKg, soldKg, pricePerKg, grade, fromDays, toDays) =>
    ({ id, farmerId, productId, variety, qtyKg, soldKg, pricePerKg, grade, harvestFrom: d(fromDays), harvestTo: d(toDays), createdAt: d(-20) });

  const listings = [
    L("l1",  "f1", "tomato",   "Greenhouse, Pink Paradise", 6000, 3900, 12800, "A", -30, 45),
    L("l2",  "f1", "cucumber", "Greenhouse, Zozulya",       4000, 1800, 10500, "A", -25, 40),
    L("l3",  "f1", "greens",   "Coriander & dill mix",       800,  520,  18500, "A", -40, 60),
    L("l4",  "f2", "potato",   "Sante",                     40000, 26000, 5000, "A", -60, 30),
    L("l5",  "f2", "onion",    "Yellow, storage",           25000, 9000,  3700, "B", -50, 50),
    L("l6",  "f2", "carrot",   "Mirzoi (yellow)",           18000, 7000,  4200, "A", -40, 40),
    L("l7",  "f3", "tomato",   "Greenhouse, cherry & round", 3500, 1200, 13200, "A", -20, 50),
    L("l8",  "f3", "pepper",   "Bell, red & yellow",        2200,  700, 15000, "A", -15, 45),
    L("l9",  "f3", "cucumber", "Greenhouse",                 2500,  900, 11200, "B", -20, 40),
    L("l10", "f4", "apple",    "Golden & Semerenko",        30000, 12000, 8200, "A", -50, 90),
    L("l11", "f4", "grapes",   "Kishmish, storage",          9000, 3000, 13800, "A", -30, 60),
    L("l12", "f5", "potato",   "Arizona",                   35000, 8000,  4800, "B", -40, 40),
    L("l13", "f5", "carrot",   "Red, Nantes",               22000, 6000,  4000, "A", -35, 45),
    L("l14", "f5", "cabbage",  "White, late",               20000, 4000,  3000, "A", -20, 60),
    L("l15", "f6", "greens",   "Coriander, dill, basil",     1500,  900, 17500, "A", -40, 70),
    L("l16", "f6", "garlic",   "Local, purple",              3000, 1400, 23000, "A", -60, 90),
    L("l17", "f7", "onion",    "Red, sweet",                30000, 8000,  3500, "A", -45, 60),
    L("l18", "f7", "garlic",   "Local",                      5000, 1500, 22000, "B", -50, 90),
    L("l19", "f7", "tomato",   "Field, late",                5000, 3500, 11000, "B", -50, 10),
    L("l20", "f8", "eggplant", "Black beauty",               6000, 2000,  8000, "A", -30, 30),
    L("l21", "f8", "pepper",   "Bell, green",                4000, 1500, 13500, "B", -30, 30),
    L("l22", "f8", "cabbage",  "White",                     15000, 3000,  3200, "A", -20, 60),
  ];

  let seq = 140;
  const C = (farmerId, restaurantId, listingId, productId, kgPerDelivery, perWeek, pricePerKg, weeks, status, initiatedBy, startOffset, createdOffset) => {
    seq += 1;
    const c = {
      id: "c" + seq, code: "HSL-" + String(seq).padStart(4, "0"), farmerId, restaurantId, listingId, productId,
      kgPerDelivery, perWeek, deliveryDay: perWeek === 2 ? "Mon & Thu" : "Thursday", pricePerKg, weeks,
      startDate: d(startOffset), status, initiatedBy, createdAt: d(createdOffset),
      signedByFarmer: null, signedByRestaurant: null,
    };
    if (status === "active" || status === "completed") { c.signedByFarmer = d(createdOffset + 1); c.signedByRestaurant = d(createdOffset); }
    if (status === "proposed") { if (initiatedBy === "restaurant") c.signedByRestaurant = d(createdOffset); else c.signedByFarmer = d(createdOffset); }
    return c;
  };

  const contracts = [
    C("f1", "r2", "l1",  "tomato",   80, 2, 12800, 12, "active",    "restaurant", -21, -24),
    C("f1", "r3", "l3",  "greens",   15, 2, 18500, 12, "active",    "farmer",     -14, -16),
    C("f2", "r1", "l4",  "potato",  300, 1,  5000, 24, "active",    "restaurant", -28, -30),
    C("f6", "r1", "l15", "greens",   12, 2, 17500, 12, "active",    "restaurant", -10, -12),
    C("f2", "r4", "l6",  "carrot",  600, 1,  4200, 24, "active",    "restaurant", -35, -38),
    C("f7", "r4", "l17", "onion",   350, 1,  3500, 12, "active",    "restaurant", -20, -22),
    C("f4", "r5", "l10", "apple",    70, 1,  8200,  8, "completed", "farmer",     -70, -72),
    C("f8", "r6", "l20", "eggplant", 60, 1,  8000, 12, "active",    "farmer",      -7,  -9),
    C("f3", "r3", "l8",  "pepper",   60, 1, 15000,  8, "active",    "restaurant",  -5,  -6),
    C("f1", "r5", "l2",  "cucumber", 40, 2, 10500, 12, "proposed",  "restaurant",   5,  -1),
    C("f7", "r1", "l17", "onion",   150, 1,  3500, 12, "proposed",  "restaurant",   7,  -2),
    C("f5", "r2", "l12", "potato",  200, 1,  4800, 12, "declined",  "farmer",      -3,  -8),
  ];

  const connections = [
    { id: "n1", type: "farmer-farmer", fromId: "f1", toId: "f6", status: "pending", topic: "Share a truck to Tashkent on Thursdays", createdAt: d(-1) },
    { id: "n2", type: "farmer-farmer", fromId: "f5", toId: "f2", status: "pending", topic: "Seed potato exchange (Sante for Arizona)", createdAt: d(-2) },
    { id: "n3", type: "farmer-farmer", fromId: "f3", toId: "f1", status: "accepted", topic: "Greenhouse heating tips", createdAt: d(-6) },
  ];

  const activity = [
    { id: "a1", ts: d(-1),    actor: "restaurant:r5", to: ["farmer:f1", "admin"], icon: "file",  text: "Café Bahor sent Karimov Agro a contract proposal for cucumbers" },
    { id: "a2", ts: d(-2),    actor: "restaurant:r1", to: ["farmer:f7", "admin"], icon: "file",  text: "Lola Kitchen sent Saidova Agro a contract proposal for onions" },
    { id: "a3", ts: d(-5),    actor: "farmer:f3",     to: ["restaurant:r3", "admin"], icon: "check", text: "Yusupova Greenhouses signed contract HSL-0149 with Silk Table" },
    { id: "a4", ts: d(-7),    actor: "farmer:f8",     to: ["restaurant:r6", "admin"], icon: "check", text: "Ko'kcha Grill and Nazarov Farm started a 12-week eggplant contract" },
    { id: "a5", ts: d(-1.2),  actor: "farmer:f1",     to: ["farmer:f6", "admin"], icon: "users", text: "Bahodir Karimov asked Jasur Aliyev to share a truck to Tashkent" },
  ];

  // 12 weeks of market prices (so'm/kg), deterministic wiggle around the market price.
  const priceHistory = {};
  window.HOSIL_PRODUCTS.forEach((p, i) => {
    const arr = [];
    for (let w = 0; w < 12; w++) {
      const seasonal = 1 + 0.12 * Math.sin((w + i) / 2.2) - 0.006 * (11 - w);
      arr.push(Math.round((p.market * seasonal) / 100) * 100);
    }
    arr[11] = p.market;
    priceHistory[p.id] = arr;
  });

  // Shape of weekly order volume over the last 12 weeks (share of this week's volume).
  // The app scales it so the latest week equals what the active contracts actually deliver.
  const weeklyGmv = [38, 52, 61, 74, 88, 97, 121, 134, 152, 171, 188, 205].map(m => m / 205);
  // Farmer f1 net revenue for the five months before the current one (so'm).
  // The current month is derived in the app: season revenue minus these.
  const farmerRevenue = [6.2, 9.4, 13.1, 16.8, 20.3].map((v, i) => {
    const m = new Date(now); m.setDate(1); m.setMonth(m.getMonth() - (5 - i));
    return { label: m.toLocaleDateString("en-GB", { month: "short" }), value: v * 1000000 };
  });

  return {
    version: 2, rev: 1, seq,
    me: { farmer: "f1", restaurant: "r1" },
    farmers, restaurants, listings, contracts, connections, activity,
    priceHistory, weeklyGmv, farmerRevenue,
    deliv: {},   // delivery tracking: "<contractId>|<yyyy-mm-dd>" -> { status, at: { picked, way, delivered, paid } }
    subs: [],    // one-off supplier replacements: { id, key, contractId, fromFarmerId, toFarmerId, listingId, pricePerKg, score, ts }
    seen: { "farmer:f1": now - DAY * 1.5, "restaurant:r1": now - DAY * 3, "admin": now - DAY * 0.5 },
  };
};
