(() => {
  "use strict";
  var _a;
  const initialCourt = window.HONEY_MEADOWS_GAME || {};
  let courtConfig = { opponent: "SAS", scoreMode: "simulation", period: "Q2", clock: "4:12", ...initialCourt, score: { home: 20, away: 16, ...initialCourt.score } };
  const scoreNumber = (v) => Math.max(0, Math.min(999, Math.floor(Number(v) || 0)));
  courtConfig.score.home = scoreNumber(courtConfig.score.home);
  courtConfig.score.away = scoreNumber(courtConfig.score.away);
  const c = document.getElementById("game");
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  const T = 32, W = 36, H = 24;
  let scene = "town", paused = false, showGrid = false, clock = 0, hover = null, doorCooldown = 0;
  const ASSET_URLS = window.HONEY_MEADOWS_ASSETS || {};
  const assets = {};
  function loadAsset(name) {
    const image = new Image();
    let fallback = false;
    image.onerror = () => {
      if (!fallback && ASSET_URLS[name]) {
        fallback = true;
        image.src = ASSET_URLS[name];
      }
    };
    image.src = "assets/" + name + ".png";
    assets[name] = image;
    return image;
  }
  for (const name of ["player_avatar", "companion_avatar", "room_headquarters", "room_farm", "room_research", "room_nails"]) {
    loadAsset(name);
  }
  const TOWN_SCALE = 1.3;
  const ILLUSTRATED = { gym: "assets/interiors/gym.jpg", restaurant: "assets/interiors/restaurant.jpg", gibbons: "assets/interiors/gibbons.jpg", hardaway: "assets/interiors/hardaway.jpg", jones: "assets/interiors/jones.jpg" };
  if (typeof setTimeout === "function") setTimeout(() => Object.keys(ILLUSTRATED).forEach((id) => illustrated(id)), 1500);
  function illustrated(id) {
    const k = "interior_" + id;
    if (!assets[k]) {
      const im = new Image();
      im.src = ILLUSTRATED[id];
      assets[k] = im;
    }
    return ready(k) ? assets[k] : null;
  }
  const ready = (name) => assets[name] && assets[name].complete && assets[name].naturalWidth > 0;
  const statusEl = document.getElementById("status");
  const tipEl = document.getElementById("tip");
  const coordEl = document.getElementById("coord");
  const key = (x, y) => "".concat(x, ",").concat(y);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (x, y) => Math.abs(x * 374761393 + y * 668265263 ^ x * y * 1447) >>> 0;
  const map = Array.from({ length: H }, () => Array(W).fill("grass"));
  const solid = /* @__PURE__ */ new Set(), trees = [], flowers = [], fences = [], lamps = [], signs = [], crates = [];
  const buildings = [];
  const put = (x, y, t) => {
    if (x >= 0 && x < W && y >= 0 && y < H) map[y][x] = t;
  };
  const rect = (x, y, w, h, t) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) put(xx, yy, t);
  };
  const road = (x, y, w, h, t = "stone") => rect(x, y, w, h, t);
  const lock = (x, y) => solid.add(key(x, y));
  const addFence = (x, y) => {
    fences.push({ x, y });
    lock(x, y);
  };
  road(12, 0, 2, 10);
  road(12, 6, 24, 2);
  road(13, 7, 10, 9);
  road(12, 9, 3, 6);
  road(14, 14, 7, 3);
  road(16, 16, 3, 8, "bridge");
  road(26, 20, 10, 3);
  road(9, 10, 5, 3, "dirt");
  road(10, 11, 4, 6, "dirt");
  road(23, 6, 13, 1);
  function building(id, name, x, y, w, h, entrance) {
    buildings.push({ id, name, x, y, w, h, entrance: { x: entrance[0], y: entrance[1] } });
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) lock(xx, yy);
  }
  building("farm", "Farmhouse", 3, 4, 7, 6, [6, 9.9]);
  building("research", "Research", 14, 1, 5, 5, [16.7, 6.1]);
  building("gear", "Gear Shop", 19, 1, 4, 5, [20.5, 6.1]);
  building("books", "Books", 23, 1, 4, 5, [24.7, 6.1]);
  building("coffee", "Coffee", 27, 1, 4, 5, [29.4, 6.1]);
  building("nails", "Nail Shop", 31, 1, 5, 5, [33.4, 6.1]);
  building("headquarters", "Headquarters", 26, 16, 9, 5, [30.25, 21.2]);
  for (let y = 10; y <= 15; y++) for (let x = 23; x <= 34; x++) lock(x, y);
  for (let y = 7; y <= 8; y++) for (let x = 25; x <= 31; x++) lock(x, y);
  for (let y = 11; y <= 15; y++) for (let x = 2; x <= 10; x++) lock(x, y);
  for (let y = 10; y <= 12; y++) for (let x = 16; x <= 18; x++) lock(x, y);
  lock(12, 11);
  for (let y = 17; y < H; y++) for (let x = 0; x < W; x++) {
    if (x >= 16 && x <= 18) continue;
    if (x >= 25 && y >= 20 && y <= 22) continue;
    if (x >= 19 && x <= 24 && y === 17) continue;
    if (x >= 25 && y === 19) continue;
    lock(x, y);
  }
  const MARKUP_CROP = { x: 8, y: 94, width: 922, height: 614 };
  const pathBoxes = [
    [345, 94, 389, 254],
    [266, 253, 889, 276],
    [417, 253, 463, 335],
    [383, 334, 506, 353],
    [383, 334, 401, 435],
    [488, 334, 506, 435],
    [267, 426, 522, 445],
    [266, 355, 282, 435],
    [69, 354, 282, 374],
    [404, 440, 475, 717],
    [404, 694, 812, 717],
    [771, 613, 811, 717]
  ].map(([x1, y1, x2, y2]) => ({ x: (x1 - 8) * 1152 / 922, y: (y1 - 94) * 768 / 614, w: (x2 - x1) * 1152 / 922, h: (y2 - y1) * 768 / 614 }));
  function markupPoint(x, y) {
    return { x: (x - 8) * 1152 / 922, y: (y - 94) * 768 / 614 };
  }
  function onMarkedPath(x, y) {
    return x >= 0 && x < W * T && y >= 0 && y < H * T && pathBoxes.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  }
  function townFootprint(x, y, radius = 7) {
    return [-radius, 0, radius].every((dx) => [-radius, 0, radius].every((dy) => onMarkedPath(x + dx, y + dy)));
  }
  const NAV_STEP = 4, navNodes = /* @__PURE__ */ new Map();
  for (let y = 2; y < H * T; y += NAV_STEP) for (let x = 2; x < W * T; x += NAV_STEP) if (townFootprint(x, y)) navNodes.set(key(x, y), { x, y });
  function nearestPathPoint(point) {
    let best = null, distance = Infinity;
    for (const candidate of navNodes.values()) {
      const d = (point.x - candidate.x) ** 2 + (point.y - candidate.y) ** 2;
      if (d < distance) {
        distance = d;
        best = candidate;
      }
    }
    return { ...best };
  }
  function navSegment(a, b) {
    const count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
    for (let i = 0; i <= count; i++) if (!townFootprint(a.x + (b.x - a.x) * i / count, a.y + (b.y - a.y) * i / count)) return false;
    return true;
  }
  function townRoute(from, to) {
    const a = nearestPathPoint(from), b = nearestPathPoint(to), start = key(a.x, a.y), goal = key(b.x, b.y);
    const queue = [a], seen = /* @__PURE__ */ new Set([start]), prev = /* @__PURE__ */ new Map();
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i], pk = key(p.x, p.y);
      if (pk === goal) break;
      for (const [dx, dy] of [[0, 4], [4, 0], [0, -4], [-4, 0]]) {
        const k = key(p.x + dx, p.y + dy), next = navNodes.get(k);
        if (next && !seen.has(k) && navSegment(p, next)) {
          seen.add(k);
          prev.set(k, pk);
          queue.push(next);
        }
      }
    }
    if (!seen.has(goal)) throw Error("Disconnected marked walking paths");
    const route = [b];
    let cursor = goal;
    while (cursor !== start) {
      cursor = prev.get(cursor);
      route.push(navNodes.get(cursor));
    }
    return route.reverse();
  }
  const routes = [
    [[365, 145], [365, 265], [850, 265]],
    [[280, 265], [438, 265], [438, 341], [392, 341], [392, 435], [496, 435], [496, 341], [438, 341]],
    [[440, 465], [440, 700], [790, 700], [790, 630]],
    [[150, 365], [274, 365], [274, 435], [440, 435], [440, 341], [438, 265]]
  ].map((route) => route.map((p) => markupPoint(...p)));
  function routeSteps(waypoints) {
    const route = [];
    for (let i = 0; i < waypoints.length; i++) route.push(...townRoute(waypoints[i], waypoints[(i + 1) % waypoints.length]).slice(i ? 1 : 0));
    return route;
  }
  const doorwayMarkup = { farm: [174, 365], research: [435, 265], gear: [545, 265], books: [650, 265], coffee: [765, 265], nails: [865, 265], headquarters: [790, 632] };
  for (const building2 of buildings) {
    const p = nearestPathPoint(markupPoint(...doorwayMarkup[building2.id]));
    building2.entrance = { x: (p.x - 16) / T, y: (p.y - 16) / T };
  }
  const palette = [
    { body: "#b75c48", shirt: "#db906e", hair: "#58372b" },
    { body: "#dfb04b", shirt: "#f0d28c", hair: "#5a402b" },
    { body: "#6888b6", shirt: "#90b3d7", hair: "#4d2e21" },
    { body: "#a16ab4", shirt: "#c8a0db", hair: "#5c3c2c" },
    { body: "#4d8c7a", shirt: "#8fcab8", hair: "#3f3428" },
    { body: "#d9775c", shirt: "#efb093", hair: "#4b2c22" },
    { body: "#5077aa", shirt: "#86aee5", hair: "#3f2e1d" }
  ];
  const npcs = [];
  const player = { ...nearestPathPoint(markupPoint(440, 465)), dir: "down", phase: 0, look: { body: "#f2c2a8", shirt: "#b9d48b", hair: "#b68f6d" }, sprite: 0 };
  const keys = /* @__PURE__ */ new Set();
  const companion = { x: player.x, y: player.y, dir: "down", phase: 0, moving: false };
  let followTrail = [], trailLength = 0;
  const FOLLOW_GAP = 42, ACTOR_RADIUS = 7;
  function actorFits(x, y, inside = scene !== "town") {
    if (!inside) return townFootprint(x, y);
    const valid = (xx, yy) => !interiorCollision(xx, yy);
    return [-ACTOR_RADIUS, ACTOR_RADIUS].every((dx) => [-ACTOR_RADIUS, ACTOR_RADIUS].every((dy) => valid(x + dx, y + dy)));
  }
  function segmentFits(a, b, inside = scene !== "town") {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
    for (let i = 0; i <= n; i++) if (!actorFits(a.x + (b.x - a.x) * i / n, a.y + (b.y - a.y) * i / n, inside)) return false;
    return true;
  }
  function resetCompanion(leader) {
    let start = { x: leader.x, y: leader.y };
    for (const [dx, dy] of [[-42, 0], [42, 0], [0, -42], [0, 42], [-24, 0], [24, 0]]) {
      const candidate = { x: leader.x + dx, y: leader.y + dy };
      if (segmentFits(candidate, leader)) {
        start = candidate;
        break;
      }
    }
    Object.assign(companion, start, { dir: leader.dir, phase: 0, moving: false });
    followTrail = [{ x: leader.x, y: leader.y }];
    trailLength = Math.hypot(leader.x - start.x, leader.y - start.y);
  }
  function recordFootstep(leader) {
    const last = followTrail[followTrail.length - 1] || companion;
    const distance = Math.hypot(leader.x - last.x, leader.y - last.y);
    if (distance > 1e-5) {
      followTrail.push({ x: leader.x, y: leader.y });
      trailLength += distance;
    }
  }
  function updateCompanion(dt) {
    let budget = Math.min(88 * dt, Math.max(0, trailLength - FOLLOW_GAP)), travelled = 0;
    while (budget > 1e-5 && followTrail.length) {
      const next = followTrail[0], dx = next.x - companion.x, dy = next.y - companion.y, d = Math.hypot(dx, dy);
      if (d < 1e-5) {
        followTrail.shift();
        continue;
      }
      const step = Math.min(d, budget), x = companion.x + dx / d * step, y = companion.y + dy / d * step;
      if (!segmentFits(companion, { x, y })) break;
      companion.x = x;
      companion.y = y;
      companion.dir = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up";
      budget -= step;
      trailLength = Math.max(0, trailLength - step);
      travelled += step;
      if (step >= d - 1e-5) followTrail.shift();
    }
    companion.moving = travelled > 1e-5;
    companion.phase = companion.moving ? companion.phase + travelled / 9 : 0;
  }
  const interiors = {
    farm: { name: "Your Farmhouse", wall: "#bc8d6a", floor: "#b48457", rug: "#a95b52", items: [["bed", 3, 3], ["stove", 12, 3], ["table", 7, 8], ["shelf", 2, 3], ["plant", 13, 9], ["sofa", 11, 8], ["counter", 3, 10]] },
    headquarters: { name: "City Hall", wall: "#a77856", floor: "#a46f47", rug: "#46766c", items: [["fireplace", 8, 2], ["shelf", 2, 3], ["shelf", 13, 3], ["table", 8, 8], ["board", 3, 7], ["plant", 13, 9], ["desk", 12, 10], ["map", 4, 10]] },
    research: { name: "Research • Grocery Store", wall: "#b0a16f", floor: "#c5a67a", rug: "#6a9471", items: [["shelf", 3, 4], ["shelf", 7, 4], ["shelf", 11, 4], ["produce", 4, 8], ["produce", 11, 8], ["counter", 8, 10], ["fridge", 13, 8]] },
    nails: { name: "Nail Salon", wall: "#b98192", floor: "#d4a6a0", rug: "#a56d91", items: [["shelf", 3, 3], ["shelf", 12, 3], ["display", 4, 7], ["display", 12, 7], ["counter", 8, 10], ["plant", 13, 10], ["chair", 3, 10]] },
    gear: { name: "Gear Shop", wall: "#8998a3", floor: "#a48465", rug: "#526f83", items: [["shelf", 3, 4], ["shelf", 12, 4], ["counter", 8, 9], ["display", 8, 6]] },
    books: { name: "Book Shop", wall: "#b08b69", floor: "#a77c50", rug: "#8b5e42", items: [["shelf", 3, 3], ["shelf", 12, 3], ["shelf", 3, 8], ["table", 9, 8], ["chair", 13, 10]] },
    coffee: { name: "Coffee Shop", wall: "#a0a67c", floor: "#ad8158", rug: "#9b6553", items: [["counter", 8, 4], ["table", 4, 9], ["table", 12, 9], ["chair", 4, 11], ["chair", 12, 11]] },
    gym: { name: "Gym", items: [] },
    restaurant: { name: "Restaurant", items: [] },
    gibbons: { name: "Gibbons Residence", items: [] },
    hardaway: { name: "Hardaway Household", items: [] },
    jones: { name: "Jones Residence", items: [] }
  };
  const stations = [
    { id: "notes", name: "Journal Shelf", label: "NOTES", tx: 13, ty: 3, w: 2, h: 2, emoji: "📔" }
  ];
  let hoveredStation = null, stationOpen = null, selectedDay = localDate(/* @__PURE__ */ new Date()), calendarMonth = new Date((/* @__PURE__ */ new Date()).getFullYear(), (/* @__PURE__ */ new Date()).getMonth(), 1);
  const stationView = document.getElementById("stationView");
  const stationTitle = document.getElementById("stationTitle");
  const stationSubtitle = document.getElementById("stationSubtitle");
  const stationBody = document.getElementById("stationBody");
  const DB_KEY = "honey_meadows_v7_dashboard";
  function localDate(d) {
    const yr = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
    return yr + "-" + m + "-" + day;
  }
  function escapeHtml(v) {
    return String(v != null ? v : "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  }
  function loadDashboard() {
    try {
      const data = JSON.parse(localStorage.getItem(DB_KEY));
      if (data && Array.isArray(data.tasks) && Array.isArray(data.events) && Array.isArray(data.notes)) return data;
    } catch (e) {
    }
    return { tasks: [{ id: "welcome", text: "Explore the village", done: false }, { id: "hq", text: "Visit Headquarters", done: false }], events: [], notes: [{ id: "journal", title: "My Journal", body: "Welcome to Honey Meadows! This journal belongs to you." }] };
  }
  const dashboard = loadDashboard();
  let activeNote = ((_a = dashboard.notes[0]) == null ? void 0 : _a.id) || null;
  function saveDashboard() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(dashboard));
    } catch (e) {
      tipEl.textContent = "Browser storage is unavailable; changes will last for this session only.";
    }
  }
  function stationXY(st) {
    return { x: 288 + (st.tx - 1) * T, y: 70 + (st.ty - 2) * T, w: st.w * T, h: st.h * T };
  }
  function drawStations() {
    stations.forEach((st) => {
      const b = stationXY(st), active = hoveredStation === st.id;
      g.save();
      g.strokeStyle = active ? "#fff0a1" : "#ddbb73";
      g.lineWidth = active ? 4 : 2;
      g.setLineDash(active ? [] : [4, 3]);
      g.strokeRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6);
      g.restore();
      fill(b.x - 4, b.y - 25, Math.max(b.w, 84) + 8, 22, active ? "#f6e0a5" : "#4f6044");
      text(st.label, b.x + Math.max(b.w, 84) / 2, b.y - 9, 11, active ? "#422d20" : "#fff0c4");
    });
  }
  function stationAt(x, y) {
    if (scene !== "headquarters" || stationOpen) return null;
    return stations.find((st) => {
      const b = stationXY(st);
      return x >= b.x - 8 && x <= b.x + b.w + 8 && y >= b.y - 28 && y <= b.y + b.h + 8;
    }) || null;
  }
  function stationNearPlayer() {
    if (scene !== "headquarters") return null;
    const playerScreenX = 288 + (indoorPlayer.x - T), playerScreenY = 70 + (indoorPlayer.y - 2 * T);
    return stations.find((st) => {
      const r = stationXY(st), x = clamp(playerScreenX, r.x, r.x + r.w), y = clamp(playerScreenY, r.y, r.y + r.h);
      return Math.hypot(playerScreenX - x, playerScreenY - y) < 45;
    }) || null;
  }
  function openStation(id) {
    if (id !== "notes") return;
    if (scene !== "headquarters") loadInterior("headquarters");
    stationOpen = id;
    keys.clear();
    stationView.classList.remove("hidden");
    tipEl.style.display = "none";
    renderStation();
    document.getElementById("backHQ").focus();
  }
  function closeStation() {
    stationOpen = null;
    stationView.classList.add("hidden");
    tipEl.style.display = "";
    c.focus();
  }
  function renderStation() {
    stationTitle.textContent = "Journal Shelf";
    stationSubtitle.textContent = "Keep your ideas and stories in one place.";
    renderNotes();
  }
  function renderNotes() {
    var _a2;
    if (!dashboard.notes.some((n) => n.id === activeNote)) activeNote = ((_a2 = dashboard.notes[0]) == null ? void 0 : _a2.id) || null;
    const note = dashboard.notes.find((n) => n.id === activeNote);
    stationBody.innerHTML = '<div class="dashGrid"><div class="dashCard"><h3>📔 Journal Pages</h3><div class="noteList" id="noteList">'.concat(dashboard.notes.map((n) => '<button class="noteTile '.concat(activeNote === n.id ? "active" : "", '" data-id="').concat(escapeHtml(n.id), '">').concat(escapeHtml(n.title || "Untitled"), "</button>")).join(""), '</div><br><button id="newNote">+ New page</button></div><div class="dashCard wide"><h3>✍️ Write a note</h3>').concat(note ? '<div class="field"><label for="noteTitle">Title</label><input id="noteTitle" maxlength="90" value="'.concat(escapeHtml(note.title), '"></div><br><div class="field"><label for="noteBody">Your thoughts</label><textarea id="noteBody">').concat(escapeHtml(note.body), '</textarea></div><br><div class="rowFlex"><span class="smallDim" id="saveStatus">Autosaves as you type</span><button class="danger" id="deleteNote">Delete page</button></div>') : "<p>Start a journal page to write notes.</p>", "</div></div>");
    stationBody.querySelectorAll(".noteTile").forEach((btn) => btn.onclick = () => {
      activeNote = btn.dataset.id;
      renderNotes();
    });
    stationBody.querySelector("#newNote").onclick = () => {
      const id = "n" + Date.now() + Math.random().toString(36).slice(2, 6);
      dashboard.notes.push({ id, title: "New page", body: "" });
      activeNote = id;
      saveDashboard();
      renderNotes();
      stationBody.querySelector("#noteTitle").focus();
    };
    if (note) {
      stationBody.querySelector("#noteTitle").oninput = (e) => {
        note.title = e.target.value;
        saveDashboard();
      };
      stationBody.querySelector("#noteBody").oninput = (e) => {
        note.body = e.target.value;
        saveDashboard();
      };
      stationBody.querySelector("#deleteNote").onclick = () => {
        var _a3;
        dashboard.notes = dashboard.notes.filter((n) => n.id !== activeNote);
        activeNote = ((_a3 = dashboard.notes[0]) == null ? void 0 : _a3.id) || null;
        saveDashboard();
        renderNotes();
      };
    }
  }
  const interiorSolid = /* @__PURE__ */ new Set();
  let indoorPlayer = { x: 10 * T, y: 17 * T + 16, dir: "down", phase: 0, look: player.look, sprite: 0 };
  function loadInterior(id) {
    if (scene === "court") leaveCourt();
    if (stationOpen) closeStation();
    if (!interiors[id]) return;
    keys.clear();
    doorCooldown = 0.7;
    scene = id;
    interiorSolid.clear();
    const room = interiors[id];
    for (const [type, x, y] of room.items) {
      const size = { bed: [3, 2], fireplace: [3, 2], table: [3, 2], sofa: [3, 2], counter: [3, 2], desk: [3, 2], display: [2, 2], produce: [2, 2], fridge: [2, 2], board: [3, 2], map: [2, 2], stove: [2, 2], chair: [1, 1], plant: [2, 2], shelf: [2, 2] }[type] || [2, 2];
      for (let yy = y; yy < y + size[1]; yy++) for (let xx = x; xx < x + size[0]; xx++) interiorSolid.add(key(xx, yy));
    }
    indoorPlayer = { x: 10 * T, y: 17 * T + 16, dir: "down", phase: 0, look: player.look, sprite: 0 };
    resetCompanion(indoorPlayer);
    statusEl.textContent = "🏠 " + room.name;
    tipEl.textContent = id === "headquarters" ? "Click a highlighted station or press E/Space nearby • Esc returns outside" : "Explore the room • Walk to the exit doorway • Esc returns outside";
  }
  function leave() {
    if (scene === "court") {
      leaveCourt();
      return;
    }
    const building2 = buildings.find((b) => b.id === scene);
    if (stationOpen) closeStation();
    scene = "town";
    keys.clear();
    doorCooldown = 0.7;
    if (building2) {
      Object.assign(player, nearestPathPoint({ x: building2.entrance.x * T + 16, y: building2.entrance.y * T + 16 }));
      player.dir = "down";
      player.phase = 0;
    }
    resetCompanion(player);
    statusEl.textContent = "🌤️ Spring • Day 3 • Honey Meadows";
    tipEl.textContent = "WASD / arrows to walk • Press Space or E near doors to enter • Click buildings to walk inside";
  }
  function interiorCollision(x, y) {
    const tx = Math.floor(x / T), ty = Math.floor(y / T);
    return tx < 1 || tx > 15 || ty < 2 || ty > 18 || interiorSolid.has(key(tx, ty));
  }
  function canTown(x, y) {
    return onMarkedPath(x, y);
  }
  function fill(x, y, w, h, color) {
    g.fillStyle = color;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  function line(x1, y1, x2, y2, w, color) {
    g.strokeStyle = color;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5);
    g.lineTo(Math.round(x2) + 0.5, Math.round(y2) + 0.5);
    g.stroke();
  }
  function text(txt, x, y, size = 14, color = "#fff3cf", align = "center") {
    g.font = "bold ".concat(size, "px Georgia");
    g.textAlign = align;
    g.fillStyle = "#3d2a22";
    g.fillText(txt, x + 1, y + 2);
    g.fillStyle = color;
    g.fillText(txt, x, y);
  }
  function drawTerrain(type, tx, ty) {
    const x = tx * T, y = ty * T, r = rand(tx, ty);
    let idx = { grass: r % 3, stone: 3 + r % 2, dirt: 5 + r % 2, soil: 7, water: 8 + r % 2, bridge: 10, court: tx < 29 ? 11 : 12 }[type];
    if (ready("terrain")) {
      g.drawImage(assets.terrain, idx * T, 0, T, T, x, y, T, T);
    } else fill(x, y, T, T, { grass: "#73a450", stone: "#bdaa90", dirt: "#bd915b", soil: "#795039", water: "#317da4", bridge: "#b88d58", court: "#2c74a7" }[type]);
    if (type === "water") {
      const off = (clock * 22 + tx * 13 + ty * 7) % 32 - 9;
      fill(x + off, y + 12, Math.min(11, 32 - off), 2, "#9de2df");
      fill(x + (off + 16) % 32, y + 26, 8, 2, "#68bcd2");
    }
  }
  function drawFlower(f) {
    const x = f.x * T + 10, y = f.y * T + 12, bob = Math.sin(clock * 3 + f.x * 0.8 + f.y * 0.6) * 1.5;
    fill(x + 5, y + 10, 2, 8, "#4e8d44");
    const cols = [["#f4b8cb", "#f9e5ee"], ["#ffd76f", "#fff1b8"], ["#b7c7ff", "#e5ebff"]][f.v];
    fill(x + 2, y + bob, 4, 4, cols[0]);
    fill(x + 6, y - 2 + bob, 4, 4, cols[1]);
    fill(x + 10, y + bob, 4, 4, cols[0]);
  }
  function drawFence(f) {
    const x = f.x * T, y = f.y * T;
    fill(x + 2, y + 6, 5, 25, "#785439");
    fill(x + 25, y + 6, 5, 25, "#785439");
    fill(x, y + 12, 32, 5, "#c6a371");
    fill(x, y + 24, 32, 5, "#c6a371");
  }
  function drawLamp(l) {
    const x = l.x * T + 16, y = l.y * T + 16;
    fill(x - 2, y - 12, 4, 22, "#6d523e");
    fill(x - 6, y - 16, 12, 6, "#3f332a");
    fill(x - 4, y - 14, 8, 8, "#f1d386");
    if (Math.sin(clock * 2 + l.x) > 0.7) {
      fill(x - 10, y - 10, 20, 20, "#f1d38633");
    }
  }
  function drawSign(s) {
    const x = s.x * T + 4, y = s.y * T + 7;
    fill(x + 10, y + 8, 4, 18, "#6b4b30");
    fill(x, y, 24, 12, "#e4cc95");
    text(s.label, x + 12, y + 10, 9, "#5b432c");
  }
  function drawCrate(o) {
    const x = o.x * T + 6, y = o.y * T + 8;
    fill(x, y, 18, 16, "#93643e");
    fill(x + 2, y + 2, 14, 12, "#bc8958");
    line(x + 2, y + 8, x + 16, y + 8, 1, "#815432");
  }
  function drawTree(t) {
    const x = t.x * T, y = t.y * T;
    if (ready("trees")) g.drawImage(assets.trees, t.v * 48, 0, 48, 72, x - 8, y - 40, 48, 72);
    else {
      fill(x + 13, y + 17, 8, 20, "#714c32");
      fill(x + 2, y + 3, 28, 28, "#397f4b");
    }
  }
  function drawHouse(b) {
    const x = b.x * T, y = b.y * T, w = b.w * T, h = b.h * T, lit = hover === b.id;
    if (ready(b.id)) g.drawImage(assets[b.id], x, y - 28, w, h + 28);
    else {
      fill(x + 5, y + 20, w - 10, h - 20, b.style.wall);
      fill(x, y + 4, w, 35, b.style.roof);
    }
    text(b.name, x + w / 2, y + 45, b.name.length > 11 ? 12 : 14, "#4b3826");
    if (lit) {
      g.strokeStyle = "#fff6a4";
      g.lineWidth = 4;
      g.strokeRect(x - 3, y - 20, w + 6, h + 24);
      fill(x + w / 2 - 52, y + h + 4, 104, 22, "#38563fe8");
      text("CLICK TO ENTER", x + w / 2, y + h + 20, 12, "#fff1b4");
    }
  }
  function drawSprite(entity, scale = 1) {
    const dir = { down: 0, left: 1, right: 2, up: 3 }[entity.dir || "down"];
    const frame = (Math.floor(entity.phase) % 4 + 4) % 4;
    const sprite = entity.sprite === void 0 ? 0 : entity.sprite;
    if (ready("characters")) {
      g.drawImage(
        assets.characters,
        frame * 20,
        (sprite * 4 + dir) * 30,
        20,
        30,
        Math.round(entity.x - 14 * scale),
        Math.round(entity.y - 31 * scale),
        Math.round(28 * scale),
        Math.round(42 * scale)
      );
    } else {
      fill(entity.x - 6 * scale, entity.y - 13 * scale, 12 * scale, 24 * scale, entity.look.body);
      fill(entity.x - 5 * scale, entity.y - 20 * scale, 10 * scale, 8 * scale, "#e9b589");
    }
  }
  function drawBasketCourt() {
    const x = 23 * T, y = 9 * T, w = 12 * T, h = 7 * T;
    fill(x, y, w / 2, h, "#2676b0");
    fill(x + w / 2, y, w / 2, h, "#6d7177");
    g.strokeStyle = "#f4ecd4";
    g.lineWidth = 3;
    g.strokeRect(x + 8, y + 8, w - 16, h - 16);
    line(x + w / 2, y + 8, x + w / 2, y + h - 8, 3, "#f4ecd4");
    g.beginPath();
    g.arc(x + w / 2, y + h / 2, 38, 0, Math.PI * 2);
    g.stroke();
    fill(x + 10, y + h / 2 - 4, 22, 8, "#f1ecdb");
    fill(x + w - 32, y + h / 2 - 4, 22, 8, "#f1ecdb");
    fill(x + 10, y + h / 2 - 18, 4, 36, "#f1ecdb");
    fill(x + w - 14, y + h / 2 - 18, 4, 36, "#f1ecdb");
  }
  const pickup = { team: 0, phase: 0, elapsed: 0, score: [courtConfig.score.home, courtConfig.score.away] };
  function courtPlayers() {
    const x = 23 * T, y = 9 * T, t = clock;
    return [
      { x: x + 88 + Math.sin(t * 0.8) * 8, y: y + 86 + Math.cos(t * 0.9) * 3, look: { body: "#2f75bf", shirt: "#82b8ff", hair: "#38271e" } },
      { x: x + 149 + Math.sin(t * 0.7 + 1) * 9, y: y + 155 + Math.cos(t * 0.8) * 2, look: { body: "#2f75bf", shirt: "#82b8ff", hair: "#38271e" } },
      { x: x + 206 + Math.sin(t * 0.9 + 2) * 7, y: y + 87 + Math.cos(t * 0.7) * 2, look: { body: "#2f75bf", shirt: "#82b8ff", hair: "#38271e" } },
      { x: x + 269 + Math.sin(t * 0.8 + 3) * 8, y: y + 85 + Math.cos(t * 0.6) * 2, look: { body: "#414247", shirt: "#d8dbe0", hair: "#33271f" } },
      { x: x + 214 + Math.sin(t * 0.7 + 4) * 8, y: y + 155 + Math.cos(t * 0.6) * 2, look: { body: "#414247", shirt: "#d8dbe0", hair: "#33271f" } },
      { x: x + 124 + Math.sin(t * 0.8 + 5) * 9, y: y + 120 + Math.cos(t * 0.7) * 2, look: { body: "#414247", shirt: "#d8dbe0", hair: "#33271f" } }
    ];
  }
  function pickupBall() {
    const pts = courtPlayers(), team = pickup.team, seq = team === 0 ? [0, 1, 2, 1] : [3, 4, 5, 4], duration = pickup.phase < 3 ? 1.3 : 2, progress = Math.min(1, pickup.elapsed / duration);
    let from, to, arc = 0;
    if (pickup.phase < 3) {
      from = pts[seq[pickup.phase]];
      to = pts[seq[pickup.phase + 1]];
      arc = Math.sin(progress * Math.PI) * 18;
    } else {
      from = pts[seq[3]];
      to = { x: team === 0 ? 23 * T + 12 : 23 * T + 12 * T - 12, y: 9 * T + 112 };
      arc = Math.sin(progress * Math.PI) * 70;
    }
    return { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress - arc };
  }
  function updatePickup(dt) {
    pickup.elapsed += dt;
    const duration = pickup.phase < 3 ? 1.3 : 2;
    if (pickup.elapsed >= duration) {
      pickup.elapsed -= duration;
      if (pickup.phase === 3) {
        if (courtConfig.scoreMode === "simulation") pickup.score[pickup.team] += 2;
        pickup.team = 1 - pickup.team;
        pickup.phase = 0;
      } else pickup.phase++;
    }
  }
  function drawCourtActors() {
    const players = courtPlayers();
    players.forEach((p, i) => {
      p.dir = i < 3 ? "right" : "left";
      p.phase = clock * 3 + i;
      p.sprite = i < 3 ? 7 : 8;
      drawSprite(p, 1);
    });
    const ball = pickupBall();
    fill(ball.x - 5, ball.y - 5, 10, 10, "#e18c34");
    line(ball.x - 5, ball.y, ball.x + 5, ball.y, 1, "#4b2d19");
    line(ball.x, ball.y - 5, ball.x, ball.y + 5, 1, "#4b2d19");
  }
  function drawScoreboard() {
    const x = 23 * T + 88, y = 9 * T - 44;
    fill(x - 5, y - 5, 210, 46, "#56432f");
    fill(x, y, 200, 36, "#1d2932");
    fill(x + 3, y + 3, 194, 2, "#bda27c");
    text("OKC", x + 34, y + 14, 12, "#84c5ff");
    text(opponentId, x + 166, y + 14, 12, "#ddd9d2");
    text(String(pickup.score[0]).padStart(2, "0"), x + 37, y + 31, 19, "#ffb971");
    text(String(pickup.score[1]).padStart(2, "0"), x + 164, y + 31, 19, "#ffb971");
    text(pickup.phase === 3 ? "SHOT" : "PASS", x + 101, y + 17, 11, "#f6df99");
    text(pickup.team === 0 ? "◀ OKC" : "SAS ▶", x + 101, y + 31, 11, "#f6df99");
  }
  function drawTownIllustration() {
    if (ready("town-tiles")) {
      const im = courtTextureReady ? courtTexture : assets["town-tiles"];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        g.drawImage(im, x * T, y * T, T, T, x * T, y * T, T, T);
      }
    } else {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) drawTerrain(map[y][x], x, y);
    }
  }
  function drawPixelActor(entity, row, kind = "villagers", size = 1) {
    const im = assets[kind];
    if (!ready(kind)) {
      fill(entity.x - 5, entity.y - 15, 11, 17, kind === "basketball" ? "#416f9e" : "#cc945b");
      return;
    }
    const frame = Math.abs(Math.floor(entity.phase)) % 4;
    let width = (kind === "basketball" ? 31 : 35) * size, height = (kind === "basketball" ? 48 : 52) * size;
    const x = entity.x - width / 2, y = entity.y - height + 7;
    g.save();
    if (entity.dir === "left") {
      g.translate(Math.round(2 * entity.x), 0);
      g.scale(-1, 1);
    }
    const sy = row * 84;
    g.drawImage(im, frame * 52, sy, 52, 84, Math.round(x), Math.round(y), Math.round(width), Math.round(height));
    g.restore();
  }
  function drawPlayerAvatar(entity, inside = false) {
    var _a2;
    const frame = (Math.floor(entity.phase) % 4 + 4) % 4;
    const dirRow = (_a2 = { down: 0, left: 1, right: 2, up: 3 }[entity.dir]) != null ? _a2 : 0;
    const sw = 52, sh = 84;
    const drawW = inside ? 50 : 46;
    const drawH = inside ? 80 : 74;
    const x = entity.x - drawW / 2;
    const y = entity.y - drawH + 10;
    if (ready("player_avatar")) {
      g.drawImage(assets.player_avatar, frame * sw, dirRow * sh, sw, sh, Math.round(x), Math.round(y), drawW, drawH);
    } else {
      drawPixelActor(entity, 3, "villagers", inside ? 1.08 : 1.02);
    }
  }
  function drawCompanion(entity, inside = false) {
    var _a2, _b;
    if (!ready("companion_avatar")) return;
    const image = assets.companion_avatar, sw = image.naturalWidth / 4, sh = image.naturalHeight / 4;
    const row = (_a2 = { down: 0, left: 1, right: 2, up: 3 }[entity.dir]) != null ? _a2 : 0;
    const frame = ((_b = entity.moving) != null ? _b : companion.moving) ? Math.floor(entity.phase) % 4 : 0;
    const w = inside ? 52 : 48, h = inside ? 82 : 76;
    g.drawImage(image, frame * sw, row * sh, sw, sh, Math.round(entity.x - w / 2), Math.round(entity.y - h + 10), w, h);
  }
  function drawParty(leader, follower, inside) {
    [{ entity: leader, draw: drawPlayerAvatar }, { entity: follower, draw: drawCompanion }].sort((a, b) => a.entity.y - b.entity.y).forEach((actor) => actor.draw(actor.entity, inside));
  }
  function v8CourtPlayers() {
    const t = clock;
    return [
      { x: 800 + Math.sin(t * 0.82) * 12, y: 400 + Math.cos(t * 0.54) * 5, dir: "right", phase: t * 6 },
      { x: 849 + Math.sin(t * 0.77 + 1) * 10, y: 366 + Math.cos(t * 0.53) * 6, dir: "down", phase: t * 5 },
      { x: 879 + Math.sin(t * 0.91 + 2) * 8, y: 422 + Math.sin(t * 0.73) * 7, dir: "right", phase: t * 6 },
      { x: 981 + Math.sin(t * 0.71 + 3) * 9, y: 370 + Math.cos(t * 0.7) * 5, dir: "left", phase: t * 6 },
      { x: 1011 + Math.sin(t * 0.66 + 4) * 7, y: 406 + Math.cos(t * 0.5) * 5, dir: "left", phase: t * 5 },
      { x: 997 + Math.sin(t * 0.76 + 5) * 8, y: 441 + Math.sin(t * 0.5) * 4, dir: "left", phase: t * 7 }
    ];
  }
  function v8CourtBall(pts) {
    const team = pickup.team, seq = team === 0 ? [0, 1, 2, 1] : [3, 4, 5, 4];
    const duration = pickup.phase < 3 ? 1.3 : 2;
    const u = Math.max(0, Math.min(1, pickup.elapsed / duration));
    const from = pts[seq[pickup.phase]], to = pickup.phase < 3 ? pts[seq[pickup.phase + 1]] : { x: team === 0 ? 752 : 1073, y: 397 };
    const lift = Math.sin(u * Math.PI) * (pickup.phase === 3 ? 66 : 18);
    return { x: from.x + (to.x - from.x) * u, y: from.y + (to.y - from.y) * u - lift };
  }
  function drawV15Court() {
    const x = 744, y = 337, w = 337, h = 117, cx = x + w / 2, cy = y + h / 2;
    g.save();
    g.fillStyle = "#2d2732";
    g.fillRect(x - 5, y - 5, w + 10, h + 10);
    g.fillStyle = "#cba26b";
    g.fillRect(x, y, w, h);
    for (let j = 0; j < 13; j++) {
      const sy2 = y + j * 9;
      g.fillStyle = j % 2 ? "#b98453" : "#d1a374";
      g.fillRect(x, sy2, w, 9);
      g.fillStyle = "rgba(87,47,32,.24)";
      g.fillRect(x, sy2 + 8, w, 1);
      for (let i = 0; i < 5; i++) {
        const sx2 = x + (i * 77 + j % 2 * 38) % w;
        g.fillRect(sx2, sy2, 1, 8);
      }
    }
    g.fillStyle = "rgba(16,105,169,.58)";
    g.fillRect(x, y, Math.floor(w / 2), h);
    g.fillStyle = "rgba(67,80,90,.68)";
    g.fillRect(x + Math.floor(w / 2), y, Math.ceil(w / 2), h);
    g.strokeStyle = "#fff3da";
    g.lineWidth = 2;
    g.strokeRect(x + 5, y + 5, w - 10, h - 10);
    g.beginPath();
    g.moveTo(cx, y + 5);
    g.lineTo(cx, y + h - 5);
    g.stroke();
    g.beginPath();
    g.arc(cx, cy, 33, 0, Math.PI * 2);
    g.stroke();
    g.strokeRect(x + 5, cy - 27, 43, 54);
    g.strokeRect(x + w - 48, cy - 27, 43, 54);
    g.beginPath();
    g.arc(x + 48, cy, 27, -Math.PI / 2, Math.PI / 2);
    g.stroke();
    g.beginPath();
    g.arc(x + w - 48, cy, 27, Math.PI / 2, Math.PI * 1.5);
    g.stroke();
    g.beginPath();
    g.arc(x + 10, cy, 63, -1.05, 1.05);
    g.stroke();
    g.beginPath();
    g.arc(x + w - 10, cy, 63, Math.PI - 1.05, Math.PI + 1.05);
    g.stroke();
    const sx = cx - 22, sy = cy - 24;
    g.fillStyle = "#fff7e2";
    g.beginPath();
    g.moveTo(sx - 2, sy - 2);
    g.lineTo(sx + 46, sy - 2);
    g.lineTo(sx + 40, sy + 35);
    g.lineTo(sx + 22, sy + 49);
    g.lineTo(sx + 4, sy + 35);
    g.closePath();
    g.fill();
    g.fillStyle = "#1477b8";
    g.beginPath();
    g.moveTo(sx + 1, sy + 1);
    g.lineTo(sx + 43, sy + 1);
    g.lineTo(sx + 37, sy + 33);
    g.lineTo(sx + 22, sy + 44);
    g.lineTo(sx + 7, sy + 33);
    g.closePath();
    g.fill();
    g.fillStyle = "#f28a36";
    g.beginPath();
    g.moveTo(sx + 31, sy + 3);
    g.lineTo(sx + 18, sy + 22);
    g.lineTo(sx + 27, sy + 22);
    g.lineTo(sx + 16, sy + 39);
    g.lineTo(sx + 34, sy + 18);
    g.lineTo(sx + 25, sy + 18);
    g.closePath();
    g.fill();
    g.font = "bold 14px Arial";
    g.textAlign = "center";
    g.lineWidth = 2;
    g.strokeStyle = "#17406b";
    g.strokeText("OKC", cx, cy - 5);
    g.fillStyle = "#fff";
    g.fillText("OKC", cx, cy - 5);
    for (const hx of [x + 7, x + w - 7]) {
      g.fillStyle = "#e9edf2";
      g.fillRect(hx - 3, cy - 15, 6, 30);
      g.strokeStyle = "#d96427";
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(hx + (hx < cx ? 5 : -5), cy, 7, 4, 0, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = "#e4edf1";
      g.lineWidth = 1;
      for (let k = -4; k <= 4; k += 4) {
        g.beginPath();
        g.moveTo(hx + k, cy + 4);
        g.lineTo(hx + k * 0.7, cy + 12);
        g.stroke();
      }
    }
    g.restore();
  }
  function drawV15Ball(ball) {
    const { x, y } = ball;
    g.save();
    g.translate(Math.round(x), Math.round(y));
    g.fillStyle = "rgba(21,20,22,.38)";
    g.beginPath();
    g.ellipse(2, 7, 7, 2, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#5c311d";
    g.beginPath();
    g.arc(0, 0, 7, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#e99332";
    g.beginPath();
    g.arc(-0.5, -0.5, 6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#f8b353";
    g.beginPath();
    g.ellipse(-2, -3, 2.5, 1.5, -0.5, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#63351e";
    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(-6, 0);
    g.quadraticCurveTo(0, -2, 6, 0);
    g.stroke();
    g.beginPath();
    g.moveTo(0, -6);
    g.quadraticCurveTo(-2, 0, 0, 6);
    g.stroke();
    g.beginPath();
    g.moveTo(-5, -4);
    g.quadraticCurveTo(3, 0, -5, 4);
    g.stroke();
    g.restore();
  }
  function drawV8Basketball() {
    const players = v8CourtPlayers();
    players.forEach((p, i) => drawPixelActor(p, i, "basketball", 0.96));
    const b = v8CourtBall(players);
    drawV15Ball(b);
  }
  function drawV8Scoreboard() {
    fill(819, 234, 181, 40, "#0f2030");
    text("OKC", 853, 246, 11, "#d9eaff");
    text(courtConfig.period, 910, 246, 11, "#f6dda4");
    text(opponentId, 971, 246, 11, "#e0e4eb");
    text(String(pickup.score[0]), 853, 266, 22, "#ff805e");
    text(String(pickup.score[1]), 972, 266, 22, "#86dcf6");
    const remaining = Math.max(0, 252 - Math.floor(clock * 1.1) % 253);
    text(courtConfig.scoreMode === "simulation" ? "".concat(Math.floor(remaining / 60), ":").concat(String(remaining % 60).padStart(2, "0")) : courtConfig.clock, 913, 266, 14, "#f5dd92");
  }
  const waterRegions = [[10, 551, 491, 665], [7, 644, 492, 723], [599, 551, 767, 616], [680, 653, 790, 714]];
  function drawAnimatedWater() {
    for (let i = 0; i < 65; i++) {
      const region = waterRegions[i % waterRegions.length];
      let w = region[2] - region[0], h = region[3] - region[1];
      let x = region[0] + (i * 57 + Math.floor(clock * 13)) % w, y = region[1] + (i * 23 + Math.sin(clock * 1.3 + i) * 6 + h * 4) % h;
      const alpha = 0.2 + 0.13 * Math.sin(clock * 2 + i);
      g.strokeStyle = "rgba(200,243,245,".concat(alpha, ")");
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(Math.round(x), Math.round(y));
      g.lineTo(Math.round(x) + 7 + i % 6, Math.round(y));
      g.stroke();
    }
  }
  function drawTownHover() {
    if (!hover) return;
    const b = buildings.find((b2) => b2.id === hover);
    if (!b) return;
    let bx = b.x * T, by = b.y * T, bw = b.w * T, bh = b.h * T;
    g.save();
    g.fillStyle = "rgba(255,232,132,.13)";
    g.fillRect(bx, by, bw, bh);
    g.strokeStyle = "#ffe793";
    g.lineWidth = 3;
    g.setLineDash([8, 5]);
    g.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);
    g.setLineDash([]);
    fill(bx + bw / 2 - 55, by + bh + 7, 110, 25, "#5b381f");
    text("✦ ENTER " + b.name.toUpperCase(), bx + bw / 2, by + bh + 23, 11, "#ffe7a4");
    g.restore();
  }
  const courtGate = markupPoint(581, 319), courtApproach = nearestPathPoint(markupPoint(581, 265));
  const courtSpots = [{ x: 814, y: 316 }, { x: 850, y: 316 }];
  let courtVisit = null;
  function nearCourt() {
    return Math.hypot(player.x - courtApproach.x, player.y - courtApproach.y) < 49;
  }
  function enterCourt() {
    if (scene !== "town" || !nearCourt() || courtVisit) return false;
    keys.clear();
    hover = null;
    courtVisit = { phase: "entering", elapsed: 0, returnPosition: { x: player.x, y: player.y }, actors: [player, companion].map((p, i) => ({
      ...p,
      moving: true,
      delay: i * 0.32,
      index: 0,
      path: [courtApproach, { x: courtGate.x, y: courtGate.y }, { x: 746, y: 306 }, { x: courtSpots[i].x, y: 306 }, courtSpots[i]]
    })) };
    scene = "court";
    statusEl.textContent = "🏀 Court • Walking to the viewing area";
    tipEl.textContent = "Walking to the viewing area together • Enter / E / Esc to return to the path";
    return true;
  }
  function leaveCourt() {
    if (!courtVisit) return;
    const visit = courtVisit;
    courtVisit = null;
    scene = "town";
    Object.assign(player, visit.returnPosition, { dir: "down", phase: 0 });
    resetCompanion(player);
    keys.clear();
    doorCooldown = 0.7;
    statusEl.textContent = "🌤️ Spring • Day 3 • Honey Meadows";
    tipEl.textContent = "WASD / arrows to walk • Enter / E near doors • Court gate: watch the game";
  }
  function updateCourt(dt) {
    if (!courtVisit) return;
    courtVisit.elapsed += dt;
    if (courtVisit.phase === "watching") return;
    for (const actor of courtVisit.actors) {
      if (courtVisit.elapsed < actor.delay) continue;
      let budget = 105 * dt;
      while (budget > 0 && actor.index < actor.path.length) {
        const target = actor.path[actor.index], dx = target.x - actor.x, dy = target.y - actor.y, d = Math.hypot(dx, dy);
        if (d < 1e-3) {
          actor.index++;
          continue;
        }
        const step = Math.min(budget, d);
        actor.x += dx / d * step;
        actor.y += dy / d * step;
        actor.phase += step / 9;
        budget -= step;
        actor.dir = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up";
        if (step === d) actor.index++;
      }
      actor.moving = actor.index < actor.path.length;
    }
    if (courtVisit.actors.every((a) => !a.moving)) {
      courtVisit.phase = "watching";
      courtVisit.actors.forEach((a) => {
        a.dir = "down";
        a.phase = 0;
      });
      statusEl.textContent = "🏀 Courtside • Watching OKC vs. Spurs";
      tipEl.textContent = "Enjoy the game together • Enter / E / Esc to return to town";
    }
  }
  function drawCourtVisit() {
    if (!courtVisit) return;
    courtVisit.actors.forEach((actor, i) => {
      if (i === 0) drawPlayerAvatar(actor);
      else drawCompanion(actor);
    });
  }
  function drawPinkTreeForeground() {
    if (!ready("town-tiles")) return;
    const outline = [
      [542, 291],
      [555, 297],
      [560, 303],
      [572, 304],
      [581, 314],
      [590, 317],
      [590, 327],
      [599, 335],
      [596, 346],
      [600, 351],
      [589, 358],
      [585, 365],
      [574, 368],
      [568, 365],
      [560, 371],
      [548, 366],
      [539, 372],
      [526, 365],
      [515, 368],
      [505, 359],
      [497, 357],
      [499, 349],
      [493, 343],
      [498, 333],
      [495, 328],
      [504, 319],
      [510, 310],
      [522, 306],
      [529, 299]
    ];
    g.save();
    g.beginPath();
    outline.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
    g.closePath();
    g.rect(534, 354, 30, 46);
    g.clip();
    g.drawImage(assets["town-tiles"], 488, 288, 120, 116, 488, 288, 120, 116);
    g.restore();
  }
  function drawCourtGate() {
    const near = scene === "town" && nearCourt();
    g.save();
    g.strokeStyle = near ? "#ffe7a1" : "#d5b66c";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(courtGate.x, courtGate.y, 14, 0, Math.PI * 2);
    g.stroke();
    fill(courtGate.x - 9, courtGate.y - 10, 18, 20, "#4b6849");
    text("↵", courtGate.x, courtGate.y + 5, 19, "#fff0be");
    if (near) {
      fill(courtGate.x - 91, courtGate.y - 47, 182, 25, "#3a3628");
      text("ENTER • WATCH THE GAME", courtGate.x, courtGate.y - 30, 12, "#ffe6a1");
    }
    g.restore();
  }
  function drawTown() {
    drawTownIllustration();
    drawV15Court();
    drawAnimatedWater();
    drawV8Scoreboard();
    drawV8Basketball();
    const actors = npcs.map((n, i) => ({ entity: n, draw: (e) => drawPixelActor(e, i % 6, "villagers", 0.96) }));
    if (scene === "town") actors.push({ entity: player, draw: drawPlayerAvatar }, { entity: companion, draw: drawCompanion });
    actors.sort((a, b) => a.entity.y - b.entity.y);
    actors.filter((a) => a.entity.y < 412).forEach((a) => a.draw(a.entity));
    drawPinkTreeForeground();
    actors.filter((a) => a.entity.y >= 412).forEach((a) => a.draw(a.entity));
    drawCourtGate();
    if (scene === "court") drawCourtVisit();
    drawTownHover();
    if (showGrid) {
      g.fillStyle = "rgba(255,75,70,.24)";
      pathBoxes.forEach((r) => g.fillRect(r.x, r.y, r.w, r.h));
      g.strokeStyle = "#ffffff52";
      g.lineWidth = 1;
      for (let x = 0; x <= W; x++) {
        g.beginPath();
        g.moveTo(x * T, 0);
        g.lineTo(x * T, H * T);
        g.stroke();
      }
      for (let y = 0; y <= H; y++) {
        g.beginPath();
        g.moveTo(0, y * T);
        g.lineTo(W * T, y * T);
        g.stroke();
      }
    }
  }
  function furniture(type, x, y) {
    if (type === "bed") {
      fill(x, y, 96, 64, "#654b43");
      fill(x + 6, y + 5, 84, 52, "#a06b72");
      fill(x + 10, y + 8, 26, 17, "#f2e2c8");
      fill(x + 45, y + 10, 34, 28, "#d4a2a5");
    }
    if (type === "fireplace") {
      fill(x, y, 88, 66, "#6a5849");
      fill(x + 14, y + 12, 60, 50, "#37332b");
      fill(x + 28, y + 31, 28, 28, "#e79b39");
      fill(x + 38, y + 20 + Math.sin(clock * 6) * 3, 10, 25, "#ffe2a0");
    }
    if (type === "table") {
      fill(x, y, 96, 62, "#704b33");
      fill(x + 6, y + 5, 84, 43, "#c18a54");
      fill(x + 36, y + 13, 23, 16, "#e3cba3");
    }
    if (type === "shelf") {
      fill(x, y, 64, 65, "#6b4732");
      for (let j = 0; j < 3; j++) {
        fill(x + 5, y + 8 + j * 18, 54, 4, "#d2a36c");
        for (let i = 0; i < 5; i++) fill(x + 8 + i * 10, y + 13 + j * 18, 6, 12, ["#aa6958", "#8ba16b", "#6b92a5", "#d7bb61"][(i + j) % 4]);
      }
    }
    if (type === "plant") {
      fill(x + 13, y + 33, 34, 27, "#a46c51");
      fill(x + 23, y + 4, 12, 37, "#518849");
      fill(x + 6, y + 16, 49, 12, "#5d9d59");
    }
    if (type === "produce") {
      fill(x, y, 70, 52, "#806443");
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) fill(x + 7 + i * 15, y + 9 + j * 19, 10, 11, ["#d57c45", "#91a94d", "#e3c459", "#ca6f65"][i % 4]);
    }
    if (type === "counter") {
      fill(x, y, 96, 58, "#76533d");
      fill(x + 4, y + 4, 88, 15, "#d7b084");
      fill(x + 8, y + 22, 80, 29, "#ad7e5a");
    }
    if (type === "display") {
      fill(x, y, 70, 50, "#76556a");
      for (let i = 0; i < 5; i++) fill(x + 6 + i * 13, y + 8, 8, 20, ["#f4c3d1", "#c36c8f", "#a5b9e1", "#e9b7a5", "#dca1c4"][i]);
    }
    if (type === "board") {
      fill(x, y, 95, 70, "#604b36");
      fill(x + 6, y + 6, 83, 58, "#e7d6a4");
      text("DASHBOARD", x + 48, y + 24, 12, "#5a4733");
      text("• TASKS", x + 45, y + 43, 12, "#5a4733");
      text("• MAP", x + 42, y + 58, 12, "#5a4733");
    }
    if (type === "sofa") {
      fill(x, y, 96, 52, "#6f875c");
      fill(x + 8, y + 8, 80, 18, "#97b285");
      fill(x + 8, y + 29, 18, 15, "#7f9b6d");
      fill(x + 70, y + 29, 18, 15, "#7f9b6d");
    }
    if (type === "desk") {
      fill(x, y, 96, 58, "#6e5038");
      fill(x + 5, y + 6, 86, 42, "#b88755");
      fill(x + 54, y + 13, 28, 20, "#7aa8c8");
    }
    if (type === "map") {
      fill(x, y, 64, 50, "#6f523a");
      fill(x + 6, y + 6, 52, 38, "#ddd1a6");
      fill(x + 12, y + 12, 16, 9, "#7ab17f");
      fill(x + 30, y + 18, 20, 12, "#81b8d0");
    }
    if (type === "fridge") {
      fill(x, y, 54, 72, "#afbcbe");
      fill(x + 5, y + 5, 44, 62, "#d5dfe0");
      fill(x + 38, y + 30, 4, 8, "#6d7577");
    }
    if (type === "stove") {
      fill(x, y, 54, 50, "#6d7278");
      fill(x + 4, y + 4, 46, 42, "#a8aeb4");
      for (let i = 0; i < 4; i++) fill(x + 8 + i * 10, y + 10, 6, 6, "#353535");
    }
    if (type === "chair") {
      fill(x, y, 28, 28, "#7f5b42");
      fill(x + 4, y + 6, 20, 8, "#c09162");
    }
  }
  function drawInterior() {
    const room = interiors[scene], ox = 288, oy = 70, rw = 576, rh = 576;
    const artName = "room_" + scene;
    fill(0, 0, W * T, H * T, "#152821");
    g.save();
    g.translate(576, 356);
    g.scale(1.22, 1.22);
    g.translate(-576, -356);
    if (ready(artName)) {
      g.save();
      g.globalAlpha = 0.25;
      g.drawImage(assets[artName], 0, 0, W * T, H * T);
      g.restore();
      fill(0, 0, W * T, H * T, "#0c1f1cc0");
      fill(ox - 28, oy - 28, rw + 56, rh + 56, "#49372b");
      fill(ox - 20, oy - 20, rw + 40, rh + 40, "#b78559");
      fill(ox - 10, oy - 10, rw + 20, rh + 20, "#342c29");
      g.drawImage(assets[artName], ox, oy, rw, rh);
    } else {
      fill(ox, oy, rw, rh, room.floor);
      fill(ox, oy, rw, 85, room.wall);
      for (const [type, x, y] of room.items) furniture(type, ox + (x - 1) * T, oy + (y - 2) * T);
    }
    if (scene === "headquarters" || scene === "farm") {
      const fireX = scene === "headquarters" ? 576 : 730, fireY = scene === "headquarters" ? 168 : 168;
      g.save();
      const halo = g.createRadialGradient(fireX, fireY, 5, fireX, fireY, 95);
      halo.addColorStop(0, "rgba(255,180,76,.20)");
      halo.addColorStop(1, "rgba(255,180,76,0)");
      g.fillStyle = halo;
      g.fillRect(fireX - 95, fireY - 95, 190, 190);
      g.restore();
    }
    if (scene === "headquarters") drawStations();
    for (let i = 0; i < 12; i++) {
      const x = ox + 20 + i * 47 % 470, y = oy + 85 + (i * 31 + Math.sin(clock * 1.6 + i) * 8) % 382;
      fill(x, y, 2, 2, "#f1dc9c45");
    }
    const indoorEntity = { x: ox + (indoorPlayer.x - T), y: oy + (indoorPlayer.y - 2 * T), dir: indoorPlayer.dir, phase: indoorPlayer.phase };
    const indoorFollower = { ...companion, x: ox + (companion.x - T), y: oy + (companion.y - 2 * T) };
    drawParty(indoorEntity, indoorFollower, true);
    g.restore();
    text(room.name, W * T / 2, 46, 28, "#f8dfa8");
    text("EXIT ↓", W * T / 2, oy + rh + 36, 19, "#ffe0a2");
  }
  function nearestBuilding() {
    for (const b of buildings) {
      const p = b.entrance;
      if (Math.hypot(player.x - (p.x * T + 16), player.y - (p.y * T + 16)) < T * 2.2) return b;
    }
    return null;
  }
  function tryMove(entity, dx, dy, inside = false, dt = 1 / 60) {
    const speed = inside ? 62 : 70, len = Math.hypot(dx, dy);
    if (!len) {
      entity.phase = 0;
      return;
    }
    dx /= len;
    dy /= len;
    const steps = Math.max(1, Math.ceil(speed * dt / 2));
    let distance = 0;
    for (let i = 0; i < steps; i++) {
      const oldX = entity.x, oldY = entity.y;
      const nx = oldX + dx * speed * dt / steps;
      if (actorFits(nx, entity.y, inside)) entity.x = nx;
      recordFootstep(entity);
      const ny = oldY + dy * speed * dt / steps;
      if (actorFits(entity.x, ny, inside)) entity.y = ny;
      recordFootstep(entity);
      distance += Math.hypot(entity.x - oldX, entity.y - oldY);
    }
    entity.dir = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up";
    entity.phase = distance > 0 ? entity.phase + distance / 11 : 0;
  }
  let simMinute = 0, simDay = 1, timeRunning = true, timeSpeed = 1, viewMode = "town", clockMode = "live";
  const CENTRAL_ZONE = "America/Chicago";
  const centralFormatter = new Intl.DateTimeFormat("en-US", { timeZone: CENTRAL_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZoneName: "short" });
  const centralDateFormatter = new Intl.DateTimeFormat("en-US", { timeZone: CENTRAL_ZONE, month: "short", day: "numeric", year: "numeric" });
  let centralSnapshot = null, lastCentralSecond = null, firstCentralDay = null, centralZoneLabel = "CT", centralDateLabel = "";
  function centralTimeAt(timestamp = Date.now()) {
    const date = new Date(timestamp), parts = Object.fromEntries(centralFormatter.formatToParts(date).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
    const hour = Number(parts.hour) % 24, minute = hour * 60 + Number(parts.minute) + Number(parts.second) / 60 + date.getMilliseconds() / 6e4;
    return { minute, zone: parts.timeZoneName, dateLabel: centralDateFormatter.format(date), dateKey: parts.year + "-" + parts.month + "-" + parts.day, dayNumber: Math.floor(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)) / 864e5), timestamp: date.getTime() };
  }
  function readCentralClock(force = false) {
    const now = Date.now(), second = Math.floor(now / 1e3);
    if (force || second !== lastCentralSecond || !centralSnapshot) {
      centralSnapshot = centralTimeAt(now);
      lastCentralSecond = second;
    }
    if (firstCentralDay === null) firstCentralDay = centralSnapshot.dayNumber;
    simMinute = (centralSnapshot.minute + (now - centralSnapshot.timestamp) / 6e4 + 1440) % 1440;
    simDay = Math.max(1, centralSnapshot.dayNumber - firstCentralDay + 1);
    centralZoneLabel = centralSnapshot.zone;
    centralDateLabel = centralSnapshot.dateLabel;
  }
  function useCurrentCentralTime() {
    clockMode = "live";
    rideForced = false;
    gymForced = false;
    timeRunning = true;
    readCentralClock(true);
    syncRoutine();
    draw();
  }
  const NBA_TEAMS = [{ "id": "ATL", "name": "Atlanta Hawks", "color": "#e03a3e", "file": "assets/teams/ATL.png" }, { "id": "BOS", "name": "Boston Celtics", "color": "#008348", "file": "assets/teams/BOS.png" }, { "id": "BKN", "name": "Brooklyn Nets", "color": "#111111", "file": "assets/teams/BKN.png" }, { "id": "CHA", "name": "Charlotte Hornets", "color": "#1d1160", "file": "assets/teams/CHA.png" }, { "id": "CHI", "name": "Chicago Bulls", "color": "#ce1141", "file": "assets/teams/CHI.png" }, { "id": "CLE", "name": "Cleveland Cavaliers", "color": "#860038", "file": "assets/teams/CLE.png" }, { "id": "DAL", "name": "Dallas Mavericks", "color": "#00538c", "file": "assets/teams/DAL.png" }, { "id": "DEN", "name": "Denver Nuggets", "color": "#0e2240", "file": "assets/teams/DEN.png" }, { "id": "DET", "name": "Detroit Pistons", "color": "#c8102e", "file": "assets/teams/DET.png" }, { "id": "GSW", "name": "Golden State Warriors", "color": "#1d428a", "file": "assets/teams/GSW.png" }, { "id": "HOU", "name": "Houston Rockets", "color": "#ce1141", "file": "assets/teams/HOU.png" }, { "id": "IND", "name": "Indiana Pacers", "color": "#002d62", "file": "assets/teams/IND.png" }, { "id": "LAC", "name": "Los Angeles Clippers", "color": "#1d428a", "file": "assets/teams/LAC.png" }, { "id": "LAL", "name": "Los Angeles Lakers", "color": "#552583", "file": "assets/teams/LAL.png" }, { "id": "MEM", "name": "Memphis Grizzlies", "color": "#5d76a9", "file": "assets/teams/MEM.png" }, { "id": "MIA", "name": "Miami Heat", "color": "#98002e", "file": "assets/teams/MIA.png" }, { "id": "MIL", "name": "Milwaukee Bucks", "color": "#00471b", "file": "assets/teams/MIL.png" }, { "id": "MIN", "name": "Minnesota Timberwolves", "color": "#0c2340", "file": "assets/teams/MIN.png" }, { "id": "NOP", "name": "New Orleans Pelicans", "color": "#0c2340", "file": "assets/teams/NOP.png" }, { "id": "NYK", "name": "New York Knicks", "color": "#006bb6", "file": "assets/teams/NYK.png" }, { "id": "OKC", "name": "Oklahoma City Thunder", "color": "#007ac1", "file": "assets/teams/OKC.png" }, { "id": "ORL", "name": "Orlando Magic", "color": "#0077c0", "file": "assets/teams/ORL.png" }, { "id": "PHI", "name": "Philadelphia 76ers", "color": "#006bb6", "file": "assets/teams/PHI.png" }, { "id": "PHX", "name": "Phoenix Suns", "color": "#1d1160", "file": "assets/teams/PHX.png" }, { "id": "POR", "name": "Portland Trail Blazers", "color": "#e03a3e", "file": "assets/teams/POR.png" }, { "id": "SAC", "name": "Sacramento Kings", "color": "#5a2d81", "file": "assets/teams/SAC.png" }, { "id": "SAS", "name": "San Antonio Spurs", "color": "#63666a", "file": "assets/teams/SAS.png" }, { "id": "TOR", "name": "Toronto Raptors", "color": "#ce1141", "file": "assets/teams/TOR.png" }, { "id": "UTA", "name": "Utah Jazz", "color": "#002b5c", "file": "assets/teams/UTA.png" }, { "id": "WAS", "name": "Washington Wizards", "color": "#002b5c", "file": "assets/teams/WAS.png" }];
  const teamLogos = {};
  let courtTexture = null, courtTextureReady = false;
  let opponentId = NBA_TEAMS.some((t) => t.id === courtConfig.opponent && t.id !== "OKC") ? courtConfig.opponent : "SAS";
  courtConfig.opponent = opponentId;
  function prepareCourtTexture() {
    courtTextureReady = true;
  }
  for (const name of ["dog_sprite", "cat_sprite", "meal0", "meal1", "couch0", "couch1", "sleep0", "sleep1"]) {
    loadAsset(name);
  }
  const routinePeriods = [
    { id: "breakfast", start: 480, end: 601, label: "Hayden & Annie · Breakfast", detail: "At the kitchen table in the farmhouse." },
    { id: "outbound", start: 601, end: 606, label: "Walking to work", detail: "Annie is heading to the Nail Salon. Hayden is heading to Research." },
    { id: "work", start: 606, end: 1081, label: "At work", detail: "Annie is working in the Nail Salon. Hayden is working in Research." },
    { id: "return", start: 1081, end: 1086, label: "Walking home", detail: "Hayden and Annie are heading home to the farmhouse." },
    { id: "dinner", start: 1086, end: 1201, label: "Hayden & Annie · Dinner", detail: "Back at the same kitchen table, sharing a meal." },
    { id: "couch", start: 1201, end: 1321, label: "Couch time", detail: "Hayden and Annie snuggled together, with Riley resting on the floor." }
  ];
  const sleeping = { id: "sleep", label: "Hayden & Annie · Sleeping", detail: "Hayden and Annie are tucked into bed until 8:00 AM." };
  function periodAt(minute) {
    const m = (minute % 1440 + 1440) % 1440;
    return routinePeriods.find((p) => m >= p.start && m < p.end) || sleeping;
  }
  function formatTime(minute) {
    const m = (Math.floor(minute) % 1440 + 1440) % 1440, h = Math.floor(m / 60);
    return (h % 12 || 12) + ":" + String(m % 60).padStart(2, "0") + " " + (h >= 12 ? "PM" : "AM");
  }
  function doorPoint(id) {
    const b = buildings.find((b2) => b2.id === id);
    return { x: b.entrance.x * T + 16, y: b.entrance.y * T + 16 };
  }
  function measuredPath(points) {
    let length = 0;
    const cumulative = [0];
    for (let i = 1; i < points.length; i++) {
      length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      cumulative.push(length);
    }
    return { points, cumulative, length };
  }
  function samplePath(path, progress) {
    const distance = clamp(progress, 0, 1) * path.length;
    let i = 1;
    while (i < path.cumulative.length - 1 && path.cumulative[i] < distance) i++;
    const a = path.points[Math.max(0, i - 1)], b = path.points[Math.min(i, path.points.length - 1)], span = (path.cumulative[i] || 0) - (path.cumulative[i - 1] || 0), u = span ? (distance - path.cumulative[i - 1]) / span : 0;
    const dx = b.x - a.x, dy = b.y - a.y;
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, dir: Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up", phase: distance / 9, moving: true };
  }
  const HM_ROUTES = window.HM_ROUTES || {};
  const routePath = (pts) => measuredPath((pts && pts.length > 1 ? pts : [[0, 0], [0, 0]]).map(([x, y]) => ({ x, y })));
  const commutePaths = { girl: routePath(HM_ROUTES["farm-nails"]), boy: routePath(HM_ROUTES["farm-research"]) };
  const dogWalk = routePath(HM_ROUTES["dog-loop"]);
  const catWalk = measuredPath([{ x: 358, y: 320 }, { x: 370, y: 540 }, { x: 420, y: 575 }, { x: 425, y: 360 }, { x: 358, y: 320 }]);
  let householdState;
  const STROLL = routePath(HM_ROUTES["weekend-stroll"]), STROLL_START = 601, STROLL_END = 1086;
  const STROLL_SPEED = Math.max(1, Math.round((STROLL_END - STROLL_START) * 60 * 16 / STROLL.length)) * STROLL.length / ((STROLL_END - STROLL_START) * 60);
  let gymForced = false;
  const isWeekend = () => {
    if (gymForced) return false;
    const wd = centralWeekday();
    return wd === 0 || wd === 6;
  };
  const ANNIE_GYM = { leave: 1080, arrive: 1083, home: 1086, out: 1140, dinner: 1145 };
  const NAILS_GYM = routePath(HM_ROUTES["nails-gym"]), GYM_FARM = routePath(HM_ROUTES["gym-farm"]), RESEARCH_GYM = routePath(HM_ROUTES["research-gym"]);
  const DOG_PARK = [[1306, 800], [1350, 806], [1392, 798], [1432, 808], [1328, 826], [1372, 830], [1414, 828], [1288, 824]];
  const dogParkTime = () => isWeekend() && simMinute >= 720 && simMinute < 960;
  function makeRoutineState() {
    let period = periodAt(simMinute);
    const m = simMinute;
    if (isWeekend() && m >= STROLL_START && m < STROLL_END) period = { id: "stroll", start: STROLL_START, end: STROLL_END, label: "Weekend stroll", detail: "Hayden and Annie are wandering around town together." };
    const gymDay = gymForced || !isWeekend() && centralWeekday() !== 3;
    if (gymDay && m >= ANNIE_GYM.home && m < ANNIE_GYM.dinner) period = { id: "annieGym", start: ANNIE_GYM.home, end: ANNIE_GYM.dinner, label: "Gym hour", detail: "Hayden and Annie are working out at the Gym with Bailey and Dakota." };
    const commuting = period.id === "outbound" || period.id === "return";
    const u = commuting ? (m - period.start) / (period.end - period.start) : 0;
    const girl = { scene: "farm", x: 384, y: 228, dir: "down", phase: 0, moving: false }, boy = { scene: "farm", x: 410, y: 228, dir: "down", phase: 0, moving: false };
    if (commuting) {
      for (const [name, actor] of [["girl", girl], ["boy", boy]]) {
        const path = commutePaths[name], progress = period.id === "outbound" ? u : 1 - u;
        Object.assign(actor, samplePath(path, progress), { scene: "town" });
        if (period.id === "return") {
          actor.dir = { up: "down", down: "up", left: "right", right: "left" }[actor.dir];
        }
      }
    } else if (period.id === "stroll") {
      const d = (m - STROLL_START) * 60 * STROLL_SPEED;
      const L = STROLL.length, at = (dd) => samplePath(STROLL, (dd % L + L) % L / L);
      const here = at(d), ahead = at(d + 6), dx = ahead.x - here.x, dy = ahead.y - here.y, len = Math.hypot(dx, dy) || 1;
      for (const [actor, side] of [[girl, -5], [boy, 5]]) {
        Object.assign(actor, here, { x: here.x - dy / len * side, y: here.y + dx / len * side * 0.6, scene: "town" });
      }
    } else if (period.id === "work") {
      Object.assign(girl, { scene: "nails", x: 176, y: 240, dir: "down", phase: 0 });
      Object.assign(boy, { scene: "research", x: 595, y: 445, dir: "down", phase: clock * 2 % 4 });
    }
    const dogOutside = dogParkTime();
    const dog = dogOutside ? { scene: "town", x: DOG_PARK[0][0], y: DOG_PARK[0][1], dir: "right", phase: 2.5, moving: false, resting: true } : { scene: "farm", x: period.id === "couch" ? 273 : 452, y: period.id === "couch" ? 535 : 580, dir: "down", phase: clock * 1.6, moving: false, resting: true };
    const catRest = m % 90 < 65 || period.id === "sleep";
    const cat = catRest ? { scene: "farm", x: 302, y: 546, dir: "down", phase: clock * 0.8, moving: false, resting: true } : { ...samplePath(catWalk, m * 7 % catWalk.length / catWalk.length), scene: "farm", resting: false };
    if (gymDay && m >= ANNIE_GYM.leave && m < ANNIE_GYM.dinner) {
      const G = ANNIE_GYM;
      for (const [actor, from, side] of [[girl, NAILS_GYM, 0], [boy, RESEARCH_GYM, 9]]) {
        if (m < G.arrive) Object.assign(actor, samplePath(from, (m - G.leave) / (G.arrive - G.leave)), { scene: "town" });
        else if (m < G.out) Object.assign(actor, { scene: "gym", x: 0, y: 0, dir: "down", moving: false });
        else {
          Object.assign(actor, samplePath(GYM_FARM, (m - G.out) / (G.dinner - G.out)), { scene: "town" });
          actor.x += side;
        }
      }
    }
    for (const [id, actor] of [["girl", girl], ["boy", boy]]) {
      const rs = rideState(id, m * 60);
      if (rs && rs.x != null) Object.assign(actor, { scene: "town", x: rs.x, y: rs.y, dir: rs.dir || "down", phase: rs.phase || 0, moving: !!rs.moving, ride: rs.ride || null, rideStatus: rs.status });
      else if (rs && rs.status) actor.rideStatus = rs.status;
    }
    return { period, girl, boy, dog, cat };
  }
  function selectedScene() {
    if (viewMode !== "auto") return viewMode;
    return householdState.period.id === "work" ? "nails" : householdState.girl.scene;
  }
  function darknessAt(minute) {
    const h = minute / 60;
    if (h >= 8 && h < 17.5) return 0;
    if (h >= 5 && h < 8) return 0.58 * (1 - (h - 5) / 3);
    if (h >= 17.5 && h < 21) return 0.58 * (h - 17.5) / 3.5;
    return 0.58;
  }
  function drawPet(pet, kind, inside = false) {
    var _a2;
    const image = assets[kind + "_sprite"];
    if (!(image == null ? void 0 : image.naturalWidth)) return;
    const row = pet.resting ? 4 : (_a2 = { down: 0, left: 1, right: 2, up: 3 }[pet.dir]) != null ? _a2 : 0, frame = Math.floor(pet.phase) % 4;
    const size = inside ? kind === "dog" ? 58 : 46 : kind === "dog" ? 36 : 30;
    g.drawImage(image, frame * 72, row * 72, 72, 72, Math.round(pet.x - size / 2), Math.round(pet.y - size + 7), size, size);
  }
  function drawGeneratedAction(kind, x, y, w, h) {
    const frame = Math.floor(clock * 1.35) % 2, image = assets[kind + frame];
    if (!(image == null ? void 0 : image.naturalWidth)) return;
    g.drawImage(image, x, y, w, h);
  }
  const ANNIE_ROWS = { down: [0, 4], left: [1, 4], right: [2, 4], up: [3, 4], idle: [4, 4] };
  loadAsset("annie_walk");
  function drawAnnie(entity, w, h) {
    const img = assets.annie_walk;
    if (!(img && img.naturalWidth)) return;
    const moving = !!entity.moving;
    let [row, n] = ANNIE_ROWS[entity.dir] || ANNIE_ROWS.down, f = 0;
    if (moving) f = Math.floor(entity.phase) % n;
    const bob = 0;
    g.drawImage(img, f * 64, row * 96, 64, 96, Math.round(entity.x - w / 2), Math.round(entity.y - h + 6 - bob), w, h);
  }
  function drawIndoorCharacter(actor, male) {
    var _a2;
    if (!male) {
      drawAnnie(actor, 70, 105);
      return;
    }
    const source = assets[male ? "companion_avatar" : "player_avatar"];
    if (!(source == null ? void 0 : source.naturalWidth)) return;
    const row = (_a2 = { down: 0, left: 1, right: 2, up: 3 }[actor.dir]) != null ? _a2 : 0;
    g.drawImage(source, Math.floor(actor.phase) % 4 * 52, row * 84, 52, 84, actor.x - 32, actor.y - 94, 64, 104);
  }
  for (const n of ["jones_eat", "jones_couch", "jones_workout", "annie_gym", "hayden_legpress"]) loadAsset(n);
  const IK = 0.75;
  function jonesIndoorSprites(id) {
    const act = jonesActivity(simMinute), out = [];
    if (id === "jones" && (act === "breakfast" || act === "dinner")) out.push({ img: "jones_eat", sx: Math.floor(clock * 1.1) % 6 * 170, sy: 0, sw: 170, sh: 150, x: 195, y: 390, w: 182, h: 162, name: "Bailey & Dakota" });
    if (id === "jones" && act === "couch") out.push({ img: "jones_couch", sx: Math.floor(clock * 0.5) % 5 * 150, sy: 0, sw: 150, sh: 110, x: 455, y: 405, w: 210, h: 154, name: "Bailey & Dakota" });
    if (id === "gym" && householdState && householdState.girl.scene === "gym") out.push({ img: "annie_gym", sx: Math.floor(clock * 2.6) % 10 * 80, sy: 0, sw: 80, sh: 100, x: 1040, y: 380, w: 132, h: 165, name: "Annie" });
    if (id === "gym" && householdState && householdState.boy.scene === "gym") out.push({ img: "hayden_legpress", sx: Math.floor(clock * 2.4) % 8 * 120, sy: 0, sw: 120, sh: 105, x: 225, y: 245, w: 195, h: 171, name: "Hayden" });
    if (id === "gym" && act === "gym") {
      const bench = { x: 712, y: 300, w: 185, h: 185 }, floor = { x: 1100, y: 356, w: 190, h: 190 };
      const who = [["Bailey", 0], ["Dakota", 3]];
      for (const [name, row] of who) {
        const benchRow = row === 1 || row === 3, n = benchRow ? 5 : 6, at = benchRow ? bench : floor;
        out.push({ img: "jones_workout", sx: Math.floor(clock * (benchRow ? 2 : 2.4)) % n * 120, sy: row * 120, sw: 120, sh: 120, x: at.x, y: at.y, w: at.w, h: at.h, name });
      }
    }
    return out;
  }
  function drawJonesIndoors(id) {
    for (const s2 of jonesIndoorSprites(id)) {
      const im = assets[s2.img];
      if (!(im && im.naturalWidth)) continue;
      g.drawImage(im, s2.sx, s2.sy, s2.sw, s2.sh, s2.x * IK, s2.y * IK, s2.w * IK, s2.h * IK);
    }
  }
  function drawIllustratedInterior(id) {
    const image = illustrated(id);
    fill(0, 0, 1152, 768, "#10251e");
    if (image) g.drawImage(image, 0, 0, 1152, 768);
    if (image && (id === "jones" || id === "gym")) drawJonesIndoors(id);
    if (image) for (const e of houseDogs(id)) {
      const d = e.dog, k = (d.k || DOG_K) * 6 * IK, w2 = d.cw * k, h = d.ch * k;
      g.save();
      g.translate(e.x * IK, e.y * IK);
      if (e.flip) g.scale(-1, 1);
      g.drawImage(assets["dogs/" + d.id], e.f * d.cw, 0, d.cw, d.ch, -w2 / 2, -h, w2, h);
      g.restore();
    }
    const shade = darknessAt(simMinute) * 0.23;
    if (shade) fill(0, 0, 1152, 768, "rgba(22,29,65," + shade + ")");
    g.font = "bold 20px Georgia";
    const w = g.measureText(interiors[id].name).width + 40;
    fill(576 - w / 2, 10, w, 36, "#5b381f");
    fill(576 - w / 2 + 3, 13, w - 6, 30, "#7a4d2c");
    text(interiors[id].name, 576, 35, 20, "#ffe4ac");
  }
  function drawScheduledInterior(id) {
    if (ILLUSTRATED[id]) return drawIllustratedInterior(id);
    const image = assets["room_" + id], ox = 256, oy = 52, scale = 640 / 768;
    fill(0, 0, 1152, 768, "#10251e");
    if (image == null ? void 0 : image.naturalWidth) {
      g.save();
      g.globalAlpha = 0.16;
      g.drawImage(image, 0, 0, 1152, 768);
      g.restore();
    }
    g.save();
    g.translate(ox, oy);
    g.scale(scale, scale);
    if (image == null ? void 0 : image.naturalWidth) g.drawImage(image, 0, 0, 768, 768);
    else fill(0, 0, 768, 768, "#876441");
    if (id === "farm") {
      const activity = householdState.period.id;
      if (activity === "breakfast" || activity === "dinner") drawGeneratedAction("meal", 286, 100, 205, 185);
      else if (activity === "couch") drawGeneratedAction("couch", 73, 365, 218, 160);
      else if (activity === "sleep") {
        drawGeneratedAction("sleep", 482, 366, 188, 237);
        text("z", 650, 361 + Math.sin(clock) * 2, 13, "#fff2cf");
      }
      if (householdState.dog.scene === "farm") drawPet(householdState.dog, "dog", true);
      drawPet(householdState.cat, "cat", true);
    } else {
      if (householdState.girl.scene === id) {
        drawIndoorCharacter(householdState.girl, false);
        drawWorkDetails(householdState.girl, "nails");
      }
      if (householdState.boy.scene === id) {
        drawIndoorCharacter(householdState.boy, true);
        drawWorkDetails(householdState.boy, "research");
      }
    }
    g.restore();
    const shade = darknessAt(simMinute) * 0.23;
    if (shade) {
      fill(ox, oy, 640, 640, "rgba(22,29,65," + shade + ")");
    }
    text(interiors[id].name, 576, 35, 23, "#ffe4ac");
    if (id === "farm") {
      text(householdState.girl.scene === "farm" ? householdState.period.label : "A quiet house • Theo at home" + (householdState.dog.scene === "farm" ? " • Riley at home" : ""), 576, 724, 17, "#f3d99b");
    } else if (id === "nails" || id === "research") text(householdState.period.id === "work" ? "Working until 6:00 PM" : "The workday has finished", 576, 724, 17, "#f3d99b");
    if (INTERIOR_HOTSPOTS[id]) drawInteriorHotspots(id);
  }
  function drawWorkDetails(actor, kind) {
    const image = assets["room_" + kind];
    if (!(image == null ? void 0 : image.naturalWidth)) return;
    if (kind === "nails") {
      g.drawImage(image, 128, 243, 104, 80, 128, 243, 104, 80);
      fill(actor.x - 6 + Math.sin(clock * 3) * 2, 247, 6, 4, "#ebc4a1");
    } else {
      g.drawImage(image, 475, 445, 224, 105, 475, 445, 224, 105);
      fill(607, 458, 26, 15, "#eedbaa");
      for (let i = 0; i < 3; i++) fill(610, 461 + i * 4, 17 - (i === 2 ? Math.floor(clock) % 8 : 0), 1, "#6b6044");
      fill(actor.x + 6 + Math.sin(clock * 2) * 2, 444, 6, 4, "#ebc4a1");
    }
  }
  function drawEmptyStands() {
    fill(798, 279, 227, 48, "#2c433b");
    for (const y of [291, 306, 321]) {
      fill(800, y, 223, 4, "#926840");
      fill(800, y - 2, 223, 2, "#c29b62");
    }
    for (const x of [806, 902, 1015]) fill(x, 280, 3, 48, "#374e4a");
  }
  function opponent() {
    return NBA_TEAMS.find((t) => t.id === opponentId);
  }
  const STREET_LAMPS = [
    [107, 185],
    [397, 35],
    [472, 7],
    [497, 37],
    [455, 132],
    [502, 227],
    [570, 227],
    [450, 360],
    [606, 140],
    [1002, 134],
    [1096, 310],
    [495, 489],
    [405, 606],
    [482, 594],
    [623, 439],
    [725, 426],
    [588, 489],
    [598, 594],
    [818, 601],
    [593, 716],
    [1108, 411],
    [1086, 431],
    [1118, 546]
  ];
  const LIT_WINDOWS = [[205, 285], [120, 285], [255, 285], [207, 222], [535, 150], [641, 148], [796, 150], [940, 150], [1068, 150], [880, 620], [985, 620], [1050, 620], [975, 525]];
  let nightLayer = null;
  const COURT = { x: 737, y: 327, w: 355, h: 125 };
  const COURT_LIGHTS = [[737, 292], [1105, 292], [737, 420], [1105, 420]];
  let courtLightsOverride = null;
  function courtLightsOn() {
    if (courtLightsOverride !== null) return courtLightsOverride;
    const g0 = window.ThunderFeed && window.ThunderFeed.current;
    return !!(g0 && g0.state === "in");
  }
  function drawCourtLightFixtures() {
    if (!courtLightsOn()) return;
    const flick = 0.92 + 0.08 * Math.sin(clock * 9);
    COURT_LIGHTS.forEach(([x, y], i) => {
      const top = i < 2, len = top ? 36 : 34;
      fill(x - 2, y, 4, len, "#2b2f36");
      fill(x - 1, y, 1, len, "#4b525c");
      fill(x - 11, y - 7, 22, 9, "#2b2f36");
      fill(x - 10, y - 6, 20, 7, "#3a414b");
      for (let k = 0; k < 3; k++) fill(x - 9 + k * 7, y - 5, 5, 5, "rgba(255,250,225,".concat(flick, ")"));
      g.save();
      g.globalCompositeOperation = "lighter";
      const gr = g.createRadialGradient(x, y - 2, 0, x, y - 2, 26);
      gr.addColorStop(0, "rgba(255,250,225," + 0.55 * flick + ")");
      gr.addColorStop(1, "rgba(255,250,225,0)");
      g.fillStyle = gr;
      g.fillRect(x - 26, y - 28, 52, 52);
      g.restore();
    });
  }
  function drawTownLighting() {
    const darkness = darknessAt(simMinute);
    if (darkness <= 0) return;
    if (!nightLayer) {
      nightLayer = document.createElement("canvas");
      nightLayer.width = 1152;
      nightLayer.height = 768;
    }
    const n = nightLayer.getContext("2d"), t = clock, lampOn = Math.min(1, darkness / 0.3);
    n.globalCompositeOperation = "source-over";
    n.clearRect(0, 0, 1152, 768);
    n.fillStyle = "rgba(12,22,59," + darkness + ")";
    n.fillRect(0, 0, 1152, 768);
    n.globalCompositeOperation = "destination-out";
    const cut = (x, y, r, a) => {
      const gr = n.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, "rgba(0,0,0," + a + ")");
      gr.addColorStop(0.55, "rgba(0,0,0," + a * 0.55 + ")");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      n.fillStyle = gr;
      n.fillRect(x - r, y - r, r * 2, r * 2);
    };
    STREET_LAMPS.forEach(([x, y], i) => {
      const f = 1 + 0.03 * Math.sin(t * 3.1 + i * 1.7);
      cut(x, y + 16, 78 * f, 0.92 * lampOn);
    });
    if (courtLightsOn()) {
      n.fillStyle = "rgba(0,0,0,.88)";
      n.fillRect(COURT.x, COURT.y, COURT.w, COURT.h);
      COURT_LIGHTS.forEach(([x, y]) => cut(x, y, 190, 0.85));
    }
    LIT_WINDOWS.forEach(([x, y]) => cut(x, y + 8, 46, 0.7 * lampOn));
    g.drawImage(nightLayer, 0, 0);
    g.save();
    g.globalCompositeOperation = "lighter";
    const warm = (x, y, r, a, col) => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, "rgba(" + col + "," + a + ")");
      gr.addColorStop(1, "rgba(" + col + ",0)");
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    };
    STREET_LAMPS.forEach(([x, y], i) => {
      const f = 0.9 + 0.1 * Math.sin(t * 4.3 + i * 2.3);
      warm(x, y + 18, 62, 0.16 * lampOn * f, "255,170,70");
      warm(x, y, 14, 0.55 * lampOn * f, "255,225,140");
    });
    LIT_WINDOWS.forEach(([x, y]) => warm(x, y + 6, 34, 0.14 * lampOn, "255,190,90"));
    if (courtLightsOn()) {
      g.fillStyle = "rgba(235,240,255," + 0.07 * darkness / 0.58 + ")";
      g.fillRect(COURT.x, COURT.y, COURT.w, COURT.h);
      COURT_LIGHTS.forEach(([x, y]) => warm(x, y + 40, 170, 0.1 * darkness / 0.58, "230,240,255"));
    }
    g.restore();
  }
  const buildingOutlines = {
    research: [[464, 124], [538, 42], [612, 95], [614, 124], [614, 190], [464, 190]],
    gear: [[617, 110], [668, 44], [725, 110], [725, 190], [617, 190]],
    books: [[735, 112], [795, 22], [862, 112], [862, 190], [735, 190]],
    coffee: [[889, 112], [942, 33], [995, 112], [995, 190], [889, 190]],
    nails: [[1010, 112], [1070, 22], [1130, 112], [1130, 190], [1010, 190]],
    farm: [[98, 215], [127, 205], [127, 152], [142, 152], [142, 185], [213, 133], [240, 165], [275, 165], [275, 153], [290, 153], [290, 168], [308, 170], [308, 262], [312, 325], [98, 325]],
    headquarters: [[833, 600], [833, 527], [865, 487], [1065, 487], [1100, 527], [1100, 667], [833, 667]]
  };
  function insideOutline(pts, x, y) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function buildingAt(x, y) {
    return buildings.find((b) => buildingOutlines[b.id] && insideOutline(buildingOutlines[b.id], x, y)) || null;
  }
  const glowCache = {};
  function buildGlow(id) {
    const pts = buildingOutlines[id], W0 = c.width, H0 = c.height;
    const mc = document.createElement("canvas");
    mc.width = W0;
    mc.height = H0;
    const mg = mc.getContext("2d");
    mg.beginPath();
    pts.forEach(([x, y], i) => i ? mg.lineTo(x, y) : mg.moveTo(x, y));
    mg.closePath();
    mg.fillStyle = "#000";
    mg.fill();
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const X0 = Math.max(0, Math.floor(Math.min(...xs)) - 4), Y0 = Math.max(0, Math.floor(Math.min(...ys)) - 4), X1 = Math.min(W0 - 1, Math.ceil(Math.max(...xs)) + 4), Y1 = Math.min(H0 - 1, Math.ceil(Math.max(...ys)) + 4);
    const IW = X1 - X0 + 1, IH = Y1 - Y0 + 1, src = mg.getImageData(X0, Y0, IW, IH).data, m = new Uint8Array(IW * IH);
    for (let i = 0; i < IW * IH; i++) m[i] = src[i * 4 + 3] > 127 ? 1 : 0;
    const near = (x, y, r) => {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const X = x + dx, Y = y + dy;
        if (X >= 0 && Y >= 0 && X < IW && Y < IH && m[Y * IW + X]) return true;
      }
      return false;
    };
    const out = document.createElement("canvas");
    out.width = IW;
    out.height = IH;
    const og = out.getContext("2d"), img = og.createImageData(IW, IH), d = img.data;
    for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) {
      const i = (y * IW + x) * 4;
      if (m[y * IW + x]) {
        d[i] = 255;
        d[i + 1] = 246;
        d[i + 2] = 210;
        d[i + 3] = 60;
      } else if (near(x, y, 1)) {
        d[i] = 255;
        d[i + 1] = 236;
        d[i + 2] = 140;
        d[i + 3] = 255;
      } else if (near(x, y, 2)) {
        d[i] = 255;
        d[i + 1] = 200;
        d[i + 2] = 60;
        d[i + 3] = 255;
      } else if (near(x, y, 3)) {
        d[i] = 255;
        d[i + 1] = 214;
        d[i + 2] = 92;
        d[i + 3] = 120;
      }
    }
    og.putImageData(img, 0, 0);
    return { img: out, x: X0, y: Y0 };
  }
  const THUNDER_STATS_URL = "https://www.espn.com/nba/team/stats/_/name/okc/oklahoma-city-thunder";
  const COURT_BOX = { x: 733, y: 226, w: 375, h: 232 };
  function inCourtBox(x, y) {
    return x >= COURT_BOX.x && x <= COURT_BOX.x + COURT_BOX.w && y >= COURT_BOX.y && y <= COURT_BOX.y + COURT_BOX.h;
  }
  function drawCourtHover() {
    if (hover !== "court") return;
    const { x, y, w, h } = COURT_BOX, pulse = 0.5 + 0.5 * Math.sin(clock * 4);
    g.save();
    g.fillStyle = "rgba(255,214,70,.10)";
    g.fillRect(x, y, w, h);
    g.lineWidth = 4;
    g.strokeStyle = "rgba(255,209,60," + (0.8 + 0.2 * pulse) + ")";
    g.shadowColor = "rgba(255,200,40,.9)";
    g.shadowBlur = 10 + 6 * pulse;
    g.strokeRect(x + 2, y + 2, w - 4, h - 4);
    g.restore();
    const label = "🏀 THUNDER STATS ↗";
    g.font = "bold 12px Georgia";
    const lw = g.measureText(label).width + 22;
    fill(x + w / 2 - lw / 2, y + h + 6, lw, 22, "#5b381f");
    text(label, x + w / 2, y + h + 21, 12, "#ffe7a4");
  }
  function drawBuildingGlow() {
    if (!hover || !buildingOutlines[hover]) return;
    const glow = glowCache[hover] || (glowCache[hover] = buildGlow(hover));
    g.drawImage(glow.img, glow.x, glow.y);
  }
  const TOWNSFOLK = [
    { id: "sun", name: "Alisa", sprite: "npc_sun", legs: "gibbons-legs", offset: 0 },
    { id: "blue", name: "Ralph", sprite: "npc_blue", with: "sun", side: "left" },
    { id: "long", name: "Madi", sprite: "npc_long", legs: "hardaway-legs", offset: 95 },
    { id: "kid", name: "Blair", sprite: "npc_kid", with: "long", scale: 0.72 },
    { id: "jonesF", name: "Bailey", sprite: "npc_jones_f", legs: "jones-legs", offset: 210 },
    { id: "jonesM", name: "Dakota", sprite: "npc_jones_m", with: "jonesF", side: "left" },
    { id: "beard", name: "Nick", sprite: "npc_beard", with: "kid" }
  ];
  const FOLK_SPEED = 16, FOLK_PAUSE = 5, HOME_PAUSE = 45, FOLK_HOURS = [7 * 60, 21 * 60 + 30];
  for (const f of TOWNSFOLK) loadAsset(f.sprite);
  for (const f of TOWNSFOLK) {
    if (!f.legs) continue;
    f.paths = (HM_ROUTES[f.legs] || []).map(routePath);
    f.cycle = f.paths.reduce((t, l) => t + l.length / FOLK_SPEED + FOLK_PAUSE, 0) - FOLK_PAUSE + HOME_PAUSE;
  }
  function folkAt(f, t) {
    if (!f.paths || !f.paths.length) return null;
    let u = ((t + f.offset) % f.cycle + f.cycle) % f.cycle;
    for (let i = 0; i < f.paths.length; i++) {
      const leg = f.paths[i], walk = leg.length / FOLK_SPEED;
      if (u < walk) {
        const p = samplePath(leg, u / walk);
        return { x: p.x, y: p.y, dir: p.dir, phase: u * FOLK_SPEED / 5, moving: true };
      }
      u -= walk;
      if (i === f.paths.length - 1) return null;
      if (u < FOLK_PAUSE) {
        const end = leg.points[leg.points.length - 1];
        return { x: end.x, y: end.y, dir: "down", phase: 0, moving: false };
      }
      u -= FOLK_PAUSE;
    }
    return null;
  }
  function homeSince5(f, T2) {
    const u = ((clock + f.offset) % f.cycle + f.cycle) % f.cycle;
    return (u - (f.cycle - HOME_PAUSE) + f.cycle) % f.cycle <= T2 - 17 * 3600;
  }
  function townsfolkState() {
    const m = simMinute;
    if (m < FOLK_HOURS[0] || m > FOLK_HOURS[1]) return [];
    const byId = {}, out = [], T2 = m * 60, rideEvening = isRideDay() && m >= 17 * 60;
    for (const f of TOWNSFOLK) {
      if (rideEvening) {
        const rs = rideState(f.id, T2);
        if (rs && rs.step === "after") continue;
        if (rs && rs.step !== "before") {
          if (!rs.hidden) out.push(byId[f.id] = { x: rs.x, y: rs.y, dir: rs.dir || "down", phase: rs.phase || 0, moving: !!rs.moving, ride: rs.ride || null, folk: f });
          continue;
        }
      }
      if (f.paths) {
        if (f.id === "jonesF" && jonesActivity(m) !== "town") continue;
        if (f.id !== "jonesF" && rideEvening && homeSince5(f, T2)) continue;
        const p = folkAt(f, clock);
        if (p) out.push(byId[f.id] = Object.assign(p, { folk: f }));
        continue;
      }
      const lead = byId[f.with];
      if (!lead) continue;
      const right = { down: [-10, 0], up: [10, 0], left: [7, 4], right: [-7, 4] }, left = { down: [10, 0], up: [-10, 0], left: [7, -4], right: [-7, -4] };
      const side = (f.side === "left" ? left : right)[lead.dir] || [10, 0];
      out.push(byId[f.id] = { x: lead.x + side[0], y: lead.y + side[1], dir: lead.dir, phase: lead.phase + 1, moving: lead.moving, folk: f });
    }
    return out;
  }
  const RIDE_START = (18 * 60 + 5) * 60, RIDE_END = (18 * 60 + 45) * 60, RIDE_WALK = 16;
  const RIDE_LOOP = routePath(HM_ROUTES["ride-loop"]);
  const RIDE_LAPS = Math.max(1, Math.round((RIDE_END - RIDE_START) * 38 / RIDE_LOOP.length));
  const RIDE_SPEED = RIDE_LAPS * RIDE_LOOP.length / (RIDE_END - RIDE_START);
  const RIDE_SHEETS = {
    annie: { cw: 90, ch: 100, rows: { right: [0, 4], left: [1, 4], down: [2, 4], up: [3, 4] }, dirs: ["down", "right", "up", "left"] },
    hayden: { cw: 90, ch: 100, rows: { right: [0, 4], left: [1, 4], down: [2, 4], up: [3, 4] }, dirs: ["down", "right", "up", "left"] },
    alisa: { cw: 66, ch: 101, dirs: ["down", "right", "up", "left"] },
    ralph: { cw: 66, ch: 101, dirs: ["down", "right", "up", "left"] },
    nick: { cw: 66, ch: 100, dirs: ["down", "right", "up", "left"] },
    madi: { cw: 72, ch: 103, dirs: ["down", "right", "up", "left"] },
    jones_f: { cw: 74, ch: 101, dirs: ["down", "right", "up", "left"] },
    jones_m: { cw: 74, ch: 101, dirs: ["down", "right", "up", "left"] }
  };
  const BIKE_SIZE = { blue: [89, 59], red: [82, 63], green: [82, 64], yellow: [81, 60], teal: [84, 60], purple: [82, 63], navy: [89, 59], forest: [82, 64] };
  for (const k in RIDE_SHEETS) loadAsset("bikes/ride_" + k);
  for (const k in BIKE_SIZE) loadAsset("bikes/bike_" + k);
  const RIDE_GAP = 62, RIDE_BASE = 70 + RIDE_GAP * 2;
  const RIDERS = [
    { id: "girl", name: "Annie", out: "nails-bridge", home: "farm-bridge", arrive: [17, 50, 0], back: 0, s: RIDE_BASE + RIDE_GAP * 5, bike: "blue", sheet: "annie" },
    { id: "boy", name: "Hayden", out: "research-bridge", home: "farm-bridge", arrive: [17, 54, 0], back: 6, s: RIDE_BASE + RIDE_GAP * 4, bike: "red", sheet: "hayden" },
    { id: "sun", name: "Alisa", out: "gibbons-bridge", home: "gibbons-bridge", arrive: [17, 58, 0], back: 30, s: RIDE_BASE + RIDE_GAP * 3, bike: "green", sheet: "alisa" },
    { id: "blue", name: "Ralph", out: "gibbons-bridge", home: "gibbons-bridge", arrive: [17, 58, 3], back: 32, s: RIDE_BASE + RIDE_GAP * 2, bike: "teal", sheet: "ralph" },
    { id: "beard", name: "Nick", out: "hardaway-bridge", home: "hardaway-bridge", arrive: [18, 2, 0], back: 50, s: RIDE_BASE + RIDE_GAP, bike: "yellow", sheet: "nick" },
    { id: "long", name: "Madi", out: "hardaway-bridge", home: "hardaway-bridge", arrive: [18, 2, 2], back: 52, s: RIDE_BASE, bike: "purple", sheet: "madi" },
    { id: "kid", name: "Blair", out: "hardaway-bridge", home: "hardaway-bridge", arrive: [18, 2, 4], back: 53, s: RIDE_BASE, stand: 42, bike: null, sheet: null },
    { id: "jonesF", name: "Bailey", out: "jones-bridge", home: "jones-bridge", arrive: [18, 3, 30], back: 70, s: 70 + RIDE_GAP, bike: "navy", sheet: "jones_f" },
    { id: "jonesM", name: "Dakota", out: "jones-bridge", home: "jones-bridge", arrive: [18, 3, 33], back: 72, s: 70, bike: "forest", sheet: "jones_m" }
  ];
  function trailTo(sEnd) {
    const pts = [];
    RIDE_LOOP.points.forEach((p, i) => {
      if (i > 0 && RIDE_LOOP.cumulative[i] < sEnd) pts.push([p.x, p.y]);
    });
    const e = loopPoint(sEnd);
    pts.push([e.x, e.y - 4]);
    return pts;
  }
  for (const r of RIDERS) {
    const standS = r.s - (r.stand || 24), trail = trailTo(standS);
    const pts = (HM_ROUTES[r.out] || [[664, 989]]).concat(trail), homePts = (HM_ROUTES[r.home] || [[664, 989]]).concat(trail).reverse();
    const bike = loopPoint(r.s);
    r.bikeAt = { x: bike.x, y: bike.y + 9 };
    r.standAt = trail[trail.length - 1];
    r.outPath = routePath(pts);
    r.homePath = routePath(homePts);
    r.arriveT = (r.arrive[0] * 60 + r.arrive[1]) * 60 + r.arrive[2];
    r.leaveT = r.arriveT - r.outPath.length / RIDE_WALK;
    r.backT = RIDE_END + 30 + r.back;
    r.homeT = r.backT + r.homePath.length / RIDE_WALK;
  }
  const RIDER = Object.fromEntries(RIDERS.map((r) => [r.id, r]));
  let rideForced = false;
  function jonesActivity(m) {
    const weekend = isWeekend();
    if (m < 7 * 60 || m >= 21.5 * 60) return "sleep";
    if (m < 8 * 60) return "breakfast";
    if (m >= 19 * 60 && m < 20 * 60) return "dinner";
    if (m >= 20 * 60) return "couch";
    if (!weekend && m >= 18 * 60) return isRideDay() && !gymForced ? "ride" : "gym";
    return "town";
  }
  function centralWeekday() {
    const day = centralSnapshot ? centralSnapshot.dayNumber : Math.floor(Date.now() / 864e5);
    return ((day + 4) % 7 + 7) % 7;
  }
  const isRideDay = () => rideForced || centralWeekday() === 3;
  function loopPoint(s) {
    const L = RIDE_LOOP.length, u = (s % L + L) % L;
    const a = samplePath(RIDE_LOOP, u / L), b = samplePath(RIDE_LOOP, (u + 6) % L / L);
    return { x: a.x, y: a.y, dx: b.x - a.x, dy: b.y - a.y };
  }
  function dirOf(dx, dy, dirs) {
    if (dirs.length === 2) return dx < 0 ? "left" : "right";
    if (dirs.length === 4) return Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up";
    const k = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
    return { 0: "right", 1: "downright", 2: "down", 3: "downleft", 4: "left", "-4": "left", "-3": "upleft", "-2": "up", "-1": "upright" }[k];
  }
  function rideState(id, T2) {
    const r = RIDER[id];
    if (!r || !isRideDay()) return null;
    if (T2 < r.leaveT) return { step: "before" };
    if (T2 >= r.homeT) return { step: "after" };
    if (T2 < r.arriveT) return { step: "walk", status: "Walking to the Wednesday bike ride", ...samplePath(r.outPath, (T2 - r.leaveT) / (r.arriveT - r.leaveT)) };
    if (T2 < RIDE_START) return { step: "wait", status: "Waiting by the bikes", x: r.standAt[0], y: r.standAt[1], dir: "down", moving: false };
    if (T2 < RIDE_END) {
      const status = "On the Wednesday bike ride";
      if (!r.sheet) return { step: "ride", status, hidden: true };
      const p = loopPoint(r.s + RIDE_SPEED * (T2 - RIDE_START)), sh = RIDE_SHEETS[r.sheet];
      return { step: "ride", status, x: p.x, y: p.y + 9, dir: "down", ride: { sheet: r.sheet, dir: dirOf(p.dx, p.dy, sh.dirs), frame: Math.floor((T2 - RIDE_START) * RIDE_SPEED / 11) % 4, t: T2 - RIDE_START } };
    }
    if (T2 < r.backT) return { step: "wait", status: "Parking the bikes", x: r.standAt[0], y: r.standAt[1], dir: "down", moving: false };
    return { step: "walk", status: "Walking home from the bike ride", ...samplePath(r.homePath, (T2 - r.backT) / (r.homeT - r.backT)) };
  }
  const rideT = () => simMinute * 60;
  function drawRider(e) {
    const sh = RIDE_SHEETS[e.ride.sheet], img = assets["bikes/ride_" + e.ride.sheet];
    if (!sh || !(img && img.naturalWidth)) return;
    const rr = sh.rows && sh.rows[e.ride.dir], row = rr ? rr[0] : Math.max(0, sh.dirs.indexOf(e.ride.dir)), k = (sh.k || 1) / 2, w = sh.cw * k, h = sh.ch * k;
    const frame = rr ? Math.floor(e.ride.t * RIDE_SPEED / 11) % rr[1] : e.ride.frame;
    g.drawImage(img, frame * sh.cw, row * sh.ch, sh.cw, sh.ch, e.x - w / 2, e.y - h, w, h);
  }
  function drawParkedBike(e) {
    const img = assets["bikes/bike_" + e.bike], sz = BIKE_SIZE[e.bike];
    if (!(img && img.naturalWidth)) return;
    const w = sz[0] / 2, h = sz[1] / 2;
    g.save();
    g.translate(e.x, e.y);
    g.scale(-1, 1);
    g.drawImage(img, -w / 2, -h, w, h);
    g.restore();
  }
  function parkedBikes() {
    const T2 = rideT(), riding = isRideDay() && T2 >= RIDE_START && T2 < RIDE_END;
    return riding ? [] : RIDERS.filter((r) => r.bike).map((r) => ({ x: r.bikeAt.x, y: r.bikeAt.y, bike: r.bike }));
  }
  const HOOPS = {
    okc: [["okc_2", 57, 83], ["okc_7", 58, 84], ["okc_5", 58, 90]],
    opp: [["opp_1", 59, 88], ["opp_22", 58, 87], ["opp_5", 60, 87]],
    rows: { run: 0, dribble: 1, pass: 2, shoot: 3, shuffle: 0, block: 1, steal: 2 },
    K: 0.42 * TOWN_SCALE,
    P: 8.6,
    X0: 1126,
    X1: 1328,
    RIM_U: 0.99,
    RIM_Y: 362
  };
  for (const [n] of HOOPS.okc.concat(HOOPS.opp)) loadAsset("hoops/" + n);
  loadAsset("hoops/ball");
  let hoopsForced = false;
  const hoopsLive = () => hoopsForced || !!(window.ThunderFeed && window.ThunderFeed.current && window.ThunderFeed.current.state === "in");
  const ease = (t) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ROLE_END = { H: [0.56, 374], W: [0.8, 346], S: [0.7, 396] };
  const roleOf = (p, k) => ["H", "W", "S"][((p - k) % 3 + 3) % 3];
  function offensePos(p, k, s) {
    const r = roleOf(p, k), prev = ROLE_END[roleOf(p, k - 1)], start = [1 - prev[0], prev[1]];
    const mid = r === "S" ? [0.52, 400] : ROLE_END[r];
    let u, v;
    if (s < 3.5) {
      const t = ease(s / 3.5);
      u = lerp(start[0], mid[0], t);
      v = lerp(start[1], mid[1], t);
    } else if (r === "S" && s < 5.3) {
      const t = ease((s - 4.3) / 1);
      u = lerp(mid[0], ROLE_END.S[0], t);
      v = lerp(mid[1], ROLE_END.S[1], t);
    } else [u, v] = ROLE_END[r];
    return { u, v, r };
  }
  const uToX = (u, d) => d > 0 ? HOOPS.X0 + u * (HOOPS.X1 - HOOPS.X0) : HOOPS.X1 - u * (HOOPS.X1 - HOOPS.X0);
  function hoopsState(time) {
    const k = Math.floor(time / HOOPS.P), s = time - k * HOOPS.P, d = k % 2 === 0 ? 1 : -1;
    const players = [], byRole = {};
    for (let p = 0; p < 3; p++) {
      const a = offensePos(p, k, s), b = offensePos(p, k, s - 0.12);
      const pl = { p, team: "okc", x: uToX(a.u, d), y: a.v, role: a.r, moving: Math.hypot(uToX(a.u, d) - uToX(b.u, d), a.v - b.v) > 0.4, flip: d < 0 };
      let row = "run", f = Math.floor(time * (pl.moving ? 10 : 4)) % 4;
      if (a.r === "H" && s < 3.5) row = "dribble", f = Math.floor(time * 8) % 4;
      else if (a.r === "H" && s < 4) row = "pass", f = Math.min(2, Math.floor((s - 3.5) / 0.12));
      else if (a.r === "W" && s >= 4.3 && s < 5.3) row = "dribble", f = Math.floor(time * 8) % 4;
      else if (a.r === "W" && s >= 5.3 && s < 5.8) row = "pass", f = Math.min(2, Math.floor((s - 5.3) / 0.12));
      else if (a.r === "S" && s >= 6.1 && s < 7.3) row = "shoot", f = s < 6.35 ? 0 : s < 6.6 ? 1 : s < 6.8 ? 2 : 3;
      pl.row = row;
      pl.f = f;
      players.push(pl);
      byRole[a.r] = pl;
    }
    for (let p = 0; p < 3; p++) {
      const o = players[p], a = offensePos(p, k, s), b = offensePos(p, k, s - 0.12);
      const gap = o.role === "S" && s >= 6.1 && s < 7.4 ? 0.07 : 0.11;
      const du = Math.min(0.96, a.u + gap), x = uToX(du, d), y = a.v + (a.v < 372 ? 5 : -5);
      const moving = Math.hypot(uToX(du, d) - uToX(Math.min(0.96, b.u + gap), d), a.v - b.v) > 0.4;
      let row = "shuffle", f = moving ? Math.floor(time * 8) % 4 : 0;
      if (o.role === "S" && s >= 6.25 && s < 7.25) row = "block", f = Math.min(3, Math.floor((s - 6.25) / 0.25));
      else if (o.role === "W" && s >= 4.5 && s < 5.2) row = "steal", f = Math.min(3, Math.floor((s - 4.5) / 0.17));
      players.push({ p, team: "opp", x, y, row, f, flip: d > 0 });
    }
    const hand = (pl, dx, dy) => [pl.x + dx * (pl.flip ? -1 : 1), pl.y + dy];
    const arc = (a, b, t, h) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t) - Math.sin(Math.PI * t) * h];
    const H2 = byRole.H, W2 = byRole.W, S = byRole.S, rim = [uToX(HOOPS.RIM_U, d), HOOPS.RIM_Y];
    let ball = null, alpha = 1;
    if (s >= 3.5 && s < 3.85) ball = hand(H2, 9, -13);
    else if (s >= 3.85 && s < 4.3) ball = arc(hand(H2, 9, -13), hand(W2, 4, -12), (s - 3.85) / 0.45, 5);
    else if (s >= 5.3 && s < 5.65) ball = hand(W2, 9, -13);
    else if (s >= 5.65 && s < 6.1) ball = arc(hand(W2, 9, -13), hand(S, 4, -12), (s - 5.65) / 0.45, 5);
    else if (s >= 6.8 && s < 7.7) ball = arc(hand(S, 2, -31), rim, (s - 6.8) / 0.9, 26);
    else if (s >= 7.7 && s < 8) ball = [rim[0], lerp(rim[1], rim[1] + 9, (s - 7.7) / 0.3)];
    else if (s >= 8) {
      const t = (s - 8) / (HOOPS.P - 8), to = hand(S, 4, -4);
      ball = [lerp(rim[0], to[0], t), lerp(rim[1] + 9, to[1], t) - Math.abs(Math.sin(t * Math.PI * 2)) * 6];
    }
    return { players, ball, alpha, scored: s >= 7.7 && s < 8.4, rim };
  }
  function drawHoops() {
    if (!hoopsLive()) return;
    const st = hoopsState(clock), K = HOOPS.K;
    st.players.sort((a, b) => a.y - b.y);
    for (const pl of st.players) {
      const [name, cw, ch] = HOOPS[pl.team][pl.p], img = assets["hoops/" + name];
      if (!(img && img.naturalWidth)) continue;
      const w = cw * K, h = ch * K;
      g.save();
      g.translate(Math.round(pl.x), Math.round(pl.y));
      if (pl.flip) g.scale(-1, 1);
      g.globalAlpha = 0.28;
      g.fillStyle = "#0c1830";
      g.beginPath();
      g.ellipse(0, 0, w * 0.32, 2.4, 0, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
      g.drawImage(img, pl.f * cw, HOOPS.rows[pl.row] * ch, cw, ch, -w / 2, -h, w, h);
      g.restore();
    }
    const bi = assets["hoops/ball"];
    if (st.ball && bi && bi.naturalWidth) g.drawImage(bi, st.ball[0] - 3, st.ball[1] - 3, 6, 6);
    if (st.scored) {
      g.save();
      g.globalAlpha = 0.85;
      g.strokeStyle = "#fff";
      g.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(st.rim[0] - 3 + i * 3, st.rim[1] + 1);
        g.lineTo(st.rim[0] - 2 + i * 2, st.rim[1] + 6);
        g.stroke();
      }
      g.restore();
    }
  }
  const GRID = {
    sheets: {
      qb12: { cw: 46, ch: 64, rows: { idle: [0, 4], run: [1, 4], dropback: [2, 4], pass: [3, 4] } },
      wr88: { cw: 43, ch: 59, rows: { idle: [0, 4], run: [1, 5], catch: [2, 5] } },
      wr84: { cw: 40, ch: 59, rows: { idle: [0, 4], run: [1, 5], catch: [2, 5] } },
      db23: { cw: 49, ch: 55, rows: { idle: [0, 4], run: [1, 4], defend: [2, 4] } },
      db37: { cw: 45, ch: 55, rows: { idle: [0, 4], run: [1, 4], defend: [2, 4] } },
      db41: { cw: 47, ch: 58, rows: { idle: [0, 4], run: [1, 4], defend: [2, 4] } }
    },
    K: 0.42 * TOWN_SCALE,
    P: 9,
    GL0: 1117,
    GL1: 1364,
    MID: 204
  };
  for (const n in GRID.sheets) loadAsset("football/" + n);
  loadAsset("football/football");
  let footballForced = false;
  const footballLive = () => footballForced || !!(window.OSUFeed && window.OSUFeed.current && window.OSUFeed.current.state === "in");
  const fx = (u, d) => d > 0 ? GRID.GL0 + u * (GRID.GL1 - GRID.GL0) : GRID.GL1 - u * (GRID.GL1 - GRID.GL0);
  function seg(s, keys2) {
    if (s <= keys2[0][0]) return [keys2[0][1], keys2[0][2]];
    for (let i = 1; i < keys2.length; i++) {
      if (s <= keys2[i][0]) {
        const a = keys2[i - 1], b = keys2[i], t = (s - a[0]) / (b[0] - a[0] || 1);
        return [lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
      }
    }
    const z = keys2[keys2.length - 1];
    return [z[1], z[2]];
  }
  function footballState(time) {
    const k = Math.floor(time / GRID.P), s = time - k * GRID.P, d = k % 2 === 0 ? 1 : -1;
    const top = k % 4 < 2, M = GRID.MID;
    const tv = top ? 180 : 228, ov = top ? 228 : 180, slant = top ? 12 : -12;
    const target = top ? "wr88" : "wr84", other = top ? "wr84" : "wr88";
    const tKeys = [[1, 0.45, tv], [2.6, 0.64, tv], [3.6, 0.76, tv + slant], [5.4, 1.06, tv + slant * 1.4]];
    const oKeys = [[1, 0.45, ov], [2.6, 0.66, ov], [3.6, 0.72, ov + (top ? -6 : 6)]];
    const qKeys = [[1, 0.4, M], [2.4, 0.33, M]];
    const pos = {
      qb12: seg(s, qKeys),
      [target]: seg(s, tKeys),
      [other]: seg(s, oKeys)
    };
    const T2 = pos[target], O = pos[other];
    const lag = s < 3.6 ? 0.035 : 0.035 + Math.min(0.06, (s - 3.6) * 0.04);
    const dbT = top ? "db23" : "db37", dbO = top ? "db37" : "db23";
    pos[dbT] = s < 1 ? [0.53, tv] : [Math.min(0.99, T2[0] - lag + (s < 1.4 ? (1.4 - s) * 0.2 : 0)), T2[1] + 5];
    pos[dbO] = s < 1 ? [0.53, ov] : [Math.min(0.99, O[0] + 0.03 + (s < 1.4 ? (1.4 - s) * 0.1 : 0)), O[1] + 4];
    pos.db41 = s < 3.6 ? seg(s, [[1, 0.6, M], [3.6, 0.72, M + slant * 0.6]]) : seg(s, [[3.6, 0.72, M + slant * 0.6], [5.6, 0.97, (M + T2[1]) / 2]]);
    const moving = (n, a, b) => a && b && Math.hypot(a[0] - b[0], a[1] - b[1]) > 15e-4;
    const prev = (() => {
      const q = footballStateLite(time - 0.1);
      return q;
    })();
    const players = [];
    for (const n of Object.keys(GRID.sheets)) {
      const p = pos[n];
      let row = "idle", f = Math.floor(time * 3) % 4;
      const mv = moving(n, p, prev[n]);
      if (mv) row = "run", f = Math.floor(time * 10) % GRID.sheets[n].rows.run[1];
      if (n === "qb12") {
        if (s >= 1 && s < 2.4) row = "dropback", f = Math.floor((s - 1) * 6) % 4;
        else if (s >= 2.4 && s < 3.1) row = "pass", f = Math.min(3, Math.floor((s - 2.4) / 0.14));
      } else if (n === target) {
        if (s >= 3.25 && s < 3.6) row = "catch", f = Math.min(3, Math.floor((s - 3.25) / 0.09));
        else if (s >= 3.6 && s < 3.85) row = "catch", f = 4;
        else if (s >= 5.4) row = "catch", f = 4;
      } else if (n === dbT && s >= 3.3 && s < 3.8) row = "defend", f = Math.min(3, Math.floor((s - 3.3) / 0.12));
      players.push({ n, x: fx(p[0], d), y: p[1], row, f, flip: d < 0 });
    }
    const byN = Object.fromEntries(players.map((p) => [p.n, p]));
    const hand = (pl, dx, dy) => [pl.x + dx * (pl.flip ? -1 : 1), pl.y + dy];
    let ball = null, angle = 0;
    if (s >= 2.75 && s < 3.6) {
      const t = (s - 2.75) / 0.85, catchAt = [fx(0.76, d), tv + slant];
      const a = hand(byN.qb12, 7, -21), b = [catchAt[0] - 3 * d, catchAt[1] - 13];
      const at = (tt) => [lerp(a[0], b[0], tt), lerp(a[1], b[1], tt) - Math.sin(Math.PI * tt) * 22];
      ball = at(t);
      const nx = at(Math.min(1, t + 0.02));
      angle = Math.atan2(nx[1] - ball[1], nx[0] - ball[0]);
    } else if (s >= 3.85 && s < 5.4) {
      ball = hand(byN[target], 4, -11);
      angle = 0.5 * d;
    }
    let alpha = 1;
    if (s < 0.4) alpha = s / 0.4;
    else if (s > GRID.P - 0.5) alpha = (GRID.P - s) / 0.5;
    return { players, ball, angle, alpha, td: s >= 5.4 && s < GRID.P - 0.5 ? s - 5.4 : -1, target, d };
  }
  function footballStateLite(time) {
    const k = Math.floor(time / GRID.P), s = time - k * GRID.P;
    const top = k % 4 < 2, M = GRID.MID, tv = top ? 180 : 228, ov = top ? 228 : 180, slant = top ? 12 : -12;
    const target = top ? "wr88" : "wr84", other = top ? "wr84" : "wr88";
    const T2 = seg(s, [[1, 0.45, tv], [2.6, 0.64, tv], [3.6, 0.76, tv + slant], [5.4, 1.06, tv + slant * 1.4]]);
    const O = seg(s, [[1, 0.45, ov], [2.6, 0.66, ov], [3.6, 0.72, ov + (top ? -6 : 6)]]);
    const lag = s < 3.6 ? 0.035 : 0.035 + Math.min(0.06, (s - 3.6) * 0.04);
    const dbT = top ? "db23" : "db37", dbO = top ? "db37" : "db23";
    return {
      qb12: seg(s, [[1, 0.4, M], [2.4, 0.33, M]]),
      [target]: T2,
      [other]: O,
      [dbT]: s < 1 ? [0.53, tv] : [Math.min(0.99, T2[0] - lag + (s < 1.4 ? (1.4 - s) * 0.2 : 0)), T2[1] + 5],
      [dbO]: s < 1 ? [0.53, ov] : [Math.min(0.99, O[0] + 0.03 + (s < 1.4 ? (1.4 - s) * 0.1 : 0)), O[1] + 4],
      db41: s < 3.6 ? seg(s, [[1, 0.6, M], [3.6, 0.72, M + slant * 0.6]]) : seg(s, [[3.6, 0.72, M + slant * 0.6], [5.6, 0.97, (M + T2[1]) / 2]])
    };
  }
  function drawFootball() {
    if (!footballLive()) return;
    const st = footballState(clock), K = GRID.K;
    g.save();
    g.globalAlpha = st.alpha;
    st.players.sort((a, b) => a.y - b.y);
    for (const pl of st.players) {
      const sh = GRID.sheets[pl.n], img = assets["football/" + pl.n];
      if (!(img && img.naturalWidth)) continue;
      const w = sh.cw * K, h = sh.ch * K;
      g.save();
      g.translate(Math.round(pl.x), Math.round(pl.y));
      if (pl.flip) g.scale(-1, 1);
      g.globalAlpha = st.alpha * 0.3;
      g.fillStyle = "#0b2410";
      g.beginPath();
      g.ellipse(0, 0, w * 0.3, 2.2, 0, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = st.alpha;
      g.drawImage(img, pl.f * sh.cw, sh.rows[pl.row][0] * sh.ch, sh.cw, sh.ch, -w / 2, -h, w, h);
      g.restore();
    }
    const bi = assets["football/football"];
    if (st.ball && bi && bi.naturalWidth) {
      g.save();
      g.translate(st.ball[0], st.ball[1]);
      g.rotate(st.angle);
      g.drawImage(bi, -4, -2.6, 8, 5.2);
      g.restore();
    }
    g.restore();
  }
  const TD_SECONDS = 4.5;
  let tdSeen = null, tdUntil = 0;
  function watchOSUScore() {
    const gm = window.OSUFeed && window.OSUFeed.current;
    if (!gm || !gm.score) return;
    const pts = Number(gm.score.home) || 0;
    if (tdSeen && tdSeen.id === gm.id && gm.state !== "pre" && pts - tdSeen.pts >= 6) tdUntil = clock + TD_SECONDS;
    tdSeen = { id: gm.id, pts };
  }
  function drawTouchdownFlash() {
    const left = tdUntil - clock;
    if (left <= 0) return;
    const t = TD_SECONDS - left, fade = Math.min(1, t / 0.25, left / 0.5), pulse = 1 + 0.06 * Math.sin(t * 9);
    g.save();
    g.globalAlpha = fade * 0.35;
    g.fillStyle = "#ff7300";
    g.fillRect(0, 0, 1152, 768);
    g.globalAlpha = fade;
    g.translate(576, 384);
    g.scale(pulse, pulse);
    g.font = '900 96px "Arial Black","Helvetica Neue",Arial,sans-serif';
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineJoin = "round";
    g.lineWidth = 16;
    g.strokeStyle = "#1b1b1f";
    g.strokeText("TOUCHDOWN!", 0, 0);
    g.fillStyle = Math.floor(t * 4) % 2 ? "#ff7300" : "#ffffff";
    g.fillText("TOUCHDOWN!", 0, 0);
    g.font = '900 34px "Arial Black","Helvetica Neue",Arial,sans-serif';
    g.lineWidth = 8;
    g.strokeText("GO POKES!", 0, 78);
    g.fillStyle = "#ffffff";
    g.fillText("GO POKES!", 0, 78);
    g.restore();
  }
  const DOGS = [
    { id: "maggie", name: "Maggie", leader: "sun", lag: 1.1, side: 7, cw: 58, ch: 53 },
    { id: "sophie", name: "Sophie", leader: "sun", lag: 1.7, side: -6, cw: 42, ch: 45 },
    { id: "sadie", name: "Sadie", leader: "long", lag: 1.3, side: 8, cw: 60, ch: 52 },
    { id: "mylo", name: "Mylo", leader: "long", lag: 1.9, side: -7, cw: 43, ch: 42 },
    { id: "apollo", name: "Apollo", leader: "jonesF", lag: 1.2, side: 8, cw: 60, ch: 52, n: 4, k: 0.38 },
    { id: "peanut", name: "Peanut", leader: "jonesF", lag: 1.8, side: -7, cw: 60, ch: 52, n: 4, k: 0.27 }
  ];
  const DOG_ROWS = { idle: [0, 4], walkR: [1, 5], walkL: [2, 5], sit: [5, 3], lay: [6, 4] }, DOG_K = 0.42;
  for (const d of DOGS) loadAsset("dogs/" + d.id);
  const dogFacing = {};
  const DOG_HOMES = { maggie: ["gibbons", 905, 770], sophie: ["gibbons", 840, 795], sadie: ["hardaway", 790, 720], mylo: ["hardaway", 705, 862], apollo: ["jones", 825, 655], peanut: ["jones", 760, 705] };
  function townDogs() {
    if (!dogParkTime()) return [];
    return DOGS.map((d, i) => ({ dog: d, x: DOG_PARK[i + 1][0], y: DOG_PARK[i + 1][1], row: "lay", f: 2 + Math.floor(clock / 7 + i) % 2, flip: i % 2 === 1 }));
  }
  function houseDogs(id) {
    if (dogParkTime()) return [];
    return DOGS.filter((d) => DOG_HOMES[d.id] && DOG_HOMES[d.id][0] === id).map((d, i) => ({ dog: d, x: DOG_HOMES[d.id][1], y: DOG_HOMES[d.id][2], row: "idle", f: Math.floor(clock * 3 + i) % (d.n || 4), flip: i % 2 === 1 }));
  }
  function drawDog(e) {
    const d = e.dog, img = assets["dogs/" + d.id];
    if (!(img && img.naturalWidth)) return;
    const w = d.cw * (d.k || DOG_K), h = d.ch * (d.k || DOG_K), r = DOG_ROWS[e.row][0];
    g.save();
    if (e.flip) {
      g.scale(-1, 1);
    }
    g.drawImage(img, e.f * d.cw, r * d.ch, d.cw, d.ch, -w / 2, -h, w, h);
    g.restore();
  }
  function drawFolk(e) {
    const img = assets[e.folk.sprite];
    if (!(img && img.naturalWidth)) return;
    const row = { down: 0, left: 1, right: 2, up: 3 }[e.dir] || 0, frame = e.moving ? Math.floor(e.phase) % 4 : 0;
    const k = e.folk.scale || 1, w = 38 * k, h = 57 * k;
    g.drawImage(img, frame * 64, row * 96, 64, 96, Math.round(e.x - w / 2), Math.round(e.y - h + 6), w, h);
  }
  const ACTOR_K = 0.62;
  const ANNIE_MATCH = 1.55, HAYDEN_MATCH = 0.8;
  function townActors() {
    const hs = householdState, actors = [];
    const riderBox = (e) => {
      const sh = RIDE_SHEETS[e.ride.sheet];
      const k = (sh.k || 1) / 2;
      return [-sh.cw * k / 2, -sh.ch * k, sh.cw * k, sh.ch * k];
    };
    if (hs.girl.scene === "town") actors.push(hs.girl.ride ? { name: "Annie", entity: hs.girl, draw: drawRider, box: riderBox(hs.girl), k: 1 } : { name: "Annie", entity: hs.girl, draw: (e) => drawAnnie(e, 38, 57), box: [-16, -51, 32, 57] });
    if (hs.boy.scene === "town") actors.push(hs.boy.ride ? { name: "Hayden", entity: hs.boy, draw: drawRider, box: riderBox(hs.boy), k: 1 } : { name: "Hayden", entity: hs.boy, draw: drawCompanion, box: [-20, -64, 40, 70], k: ACTOR_K * HAYDEN_MATCH });
    for (const b of parkedBikes()) actors.push({ name: null, entity: b, draw: drawParkedBike, box: null, k: 1 });
    if (hs.dog.scene === "town") actors.push({ name: "Riley", entity: hs.dog, draw: (e) => drawPet(e, "dog"), box: [-18, -29, 36, 36], k: 0.8 });
    for (const e of townsfolkState()) {
      if (e.ride) {
        actors.push({ name: e.folk.name, entity: e, draw: drawRider, box: riderBox(e), k: 1 });
        continue;
      }
      const k = e.folk.scale || 1;
      actors.push({ name: e.folk.name, entity: e, draw: drawFolk, box: [-16 * k, -51 * k, 32 * k, 57 * k] });
    }
    for (const e of townDogs()) {
      const w = e.dog.cw * (e.dog.k || DOG_K), h = e.dog.ch * (e.dog.k || DOG_K);
      actors.push({ name: e.dog.name, entity: e, draw: drawDog, box: [-w / 2, -h, w, h], k: 1 });
    }
    return actors.sort((a, b) => a.entity.y - b.entity.y);
  }
  function drawScheduledTown() {
    const T2 = window.HMTown;
    if (!T2) {
      fill(0, 0, 1152, 768, "#294c36");
      return;
    }
    const env = { darkness: darknessAt(simMinute), court: { home: pickup.score[0], away: pickup.score[1], opp: opponentId, period: courtConfig.period, clock: courtConfig.clock } };
    const st = T2.drawGround(g, env);
    T2.beginWorld(g);
    T2.drawBoards(g, env, st);
    drawHoops();
    drawFootball();
    const actors = townActors(), items = [];
    for (const a of actors) {
      const k = (a.k || ACTOR_K) * TOWN_SCALE, bx = a.box || [-30, -60, 60, 70];
      a.rect = [a.entity.x + bx[0] * k, a.entity.y + bx[1] * k, a.entity.x + (bx[0] + bx[2]) * k, a.entity.y + (bx[1] + bx[3]) * k];
      items.push({ y: a.entity.y, actor: a });
    }
    for (const o of T2.occluders || []) {
      const hit = actors.some((a) => a.entity.y < o.depth && a.rect[2] > o.box[0] && a.rect[0] < o.box[2] && a.rect[3] > o.box[1] && a.rect[1] < o.box[3]);
      if (hit) items.push({ y: o.depth, occ: o });
    }
    items.sort((p, q) => p.y - q.y || (p.occ ? 1 : 0) - (q.occ ? 1 : 0));
    for (const it of items) {
      if (it.occ) {
        T2.drawOccluder(g, it.occ);
        continue;
      }
      const a = it.actor;
      g.save();
      g.translate(a.entity.x, a.entity.y);
      g.scale((a.k || ACTOR_K) * TOWN_SCALE, (a.k || ACTOR_K) * TOWN_SCALE);
      a.draw(Object.assign({}, a.entity, { x: 0, y: 0 }));
      g.restore();
    }
    T2.endWorld(g, env);
  }
  function renderWho(p) {
    const el = document.getElementById("who");
    if (!el) return;
    const id = p.id, dog = householdState.dog, catRest = simMinute % 90 < 65 || id === "sleep";
    const at = { breakfast: "Breakfast at the farmhouse", dinner: "Dinner at the farmhouse", couch: "Snuggled on the couch", sleep: "Asleep at the farmhouse" };
    const hayden = householdState.boy.rideStatus || at[id] || { outbound: "Walking to Research", work: "Working at Research", return: "Walking home", stroll: "Strolling around town with Annie", annieGym: "Working out at the Gym" }[id];
    const annie = householdState.girl.rideStatus || at[id] || { outbound: "Walking to the Nail Salon", work: "Working at the Nail Salon", return: "Walking home", stroll: "Strolling around town with Hayden", annieGym: "Working out at the Gym" }[id];
    const riley = dog.scene === "town" ? "Lying down at the dog park" : id === "couch" ? "Resting by the couch" : id === "sleep" ? "Asleep at home" : "Hanging out at home";
    const theo = id === "sleep" ? "Asleep with the family" : catRest ? "Napping at home" : "Wandering the farmhouse";
    const html = [["Hayden", hayden], ["Annie", annie], ["Riley", riley], ["Theo", theo]].map(([n, t]) => "<span><b>".concat(n, "</b>").concat(t, "</span>")).join("");
    if (el._h !== html) {
      el.innerHTML = html;
      el._h = html;
    }
  }
  function refreshUI() {
    const p = householdState.period;
    document.getElementById("timeReadout").textContent = formatTime(simMinute);
    const tag = document.getElementById("clockModeLabel");
    tag.textContent = clockMode === "live" ? "Live" : "Preview";
    tag.className = "liveTag" + (clockMode !== "live" ? " pv" : "");
    document.getElementById("currentTime").disabled = clockMode === "live";
    renderWho(p);
    document.getElementById("speedSelect").disabled = clockMode === "live";
    const slider = document.getElementById("timeSlider");
    slider.value = String(Math.floor(simMinute));
    slider.setAttribute("aria-valuetext", formatTime(simMinute));
    document.getElementById("routineTitle").textContent = p.label;
    document.getElementById("routineDetail").textContent = p.detail;
    document.getElementById("petStatus").textContent = "Riley: " + (householdState.dog.scene === "town" ? "at the dog park" : "at home") + " • Theo: always at home";
    document.getElementById("toggleTime").textContent = clockMode === "live" ? "Pause" : timeRunning ? "Pause" : "Play";
    const sd = document.getElementById("signDate"), st = document.getElementById("signTime");
    if (sd) sd.textContent = clockMode === "live" ? centralDateLabel : "Preview";
    if (st) st.textContent = formatTime(simMinute) + (clockMode === "live" ? " " + centralZoneLabel : "");
    statusEl.textContent = (clockMode === "live" ? centralDateLabel + " • " + formatTime(simMinute) + " " + centralZoneLabel : "Preview • " + formatTime(simMinute)) + " • " + p.label;
    tipEl.textContent = viewMode === "auto" ? "Following Hayden and Annie's daily routine • Use the time slider below to test any moment" : "Viewing " + (scene === "town" ? "the town" : interiors[scene].name) + " • Hayden and Annie's routine continues automatically";
  }
  function syncRoutine() {
    householdState = makeRoutineState();
    scene = selectedScene();
    refreshUI();
  }
  function setTime(minute, pause = true) {
    clockMode = "preview";
    simMinute = (Number(minute) % 1440 + 1440) % 1440;
    if (pause) timeRunning = false;
    syncRoutine();
    draw();
  }
  function update(dt) {
    clock += dt;
    updatePickup(dt);
    if (clockMode === "live") readCentralClock();
    else if (timeRunning) {
      const next = simMinute + dt * timeSpeed;
      simDay += Math.floor(next / 1440);
      simMinute = next % 1440;
    }
    syncRoutine();
  }
  function draw() {
    g.clearRect(0, 0, c.width, c.height);
    if (scene === "town") drawScheduledTown();
    else {
      if (window.HMTown) {
        window.HMTown.deactivate();
        window.HMTown.setHover(null);
      }
      drawScheduledInterior(scene);
    }
    drawCharacterName();
    watchOSUScore();
    drawTouchdownFlash();
    updateTownButton();
  }
  let mousePos = null;
  function characterBoxes() {
    const hs = householdState, list = [];
    if (!hs) return list;
    if (scene === "town") {
      const T2 = window.HMTown;
      if (!T2) return list;
      for (const a of townActors()) {
        if (!a.box) continue;
        const ak = (a.k || ACTOR_K) * TOWN_SCALE, [bx, by, bw, bh] = a.box, [x, y] = T2.toScreen(a.entity.x + bx * ak, a.entity.y + by * ak), z = T2.camera.z * ak;
        list.push({ name: a.name, x, y, w: bw * z, h: bh * z });
      }
      return list;
    }
    if (scene === "jones" || scene === "gym") {
      for (const s2 of jonesIndoorSprites(scene)) list.push({ name: s2.name, x: s2.x * IK, y: s2.y * IK, w: s2.w * IK, h: s2.h * IK });
    }
    for (const e of houseDogs(scene)) {
      const k2 = (e.dog.k || DOG_K) * 6 * IK, w = e.dog.cw * k2, h = e.dog.ch * k2;
      list.push({ name: e.dog.name, x: e.x * IK - w / 2, y: e.y * IK - h, w, h });
    }
    if (scene === "jones" || scene === "gym" || houseDogs(scene).length) return list;
    const k = 640 / 768, room = (x, y, w, h, name) => list.push({ name, x: 256 + x * k, y: 52 + y * k, w: w * k, h: h * k });
    if (scene === "farm") {
      const id = hs.period.id;
      if (id === "breakfast" || id === "dinner") room(286, 100, 205, 185, "Hayden & Annie");
      else if (id === "couch") room(73, 365, 218, 160, "Hayden & Annie");
      else if (id === "sleep") room(482, 366, 188, 237, "Hayden & Annie");
      if (hs.dog.scene === "farm") room(hs.dog.x - 29, hs.dog.y - 51, 58, 58, "Riley");
      room(hs.cat.x - 23, hs.cat.y - 39, 46, 46, "Theo");
      return list;
    }
    if (hs.girl.scene === scene) room(hs.girl.x - 32, hs.girl.y - 94, 64, 104, "Annie");
    if (hs.boy.scene === scene) room(hs.boy.x - 32, hs.boy.y - 94, 64, 104, "Hayden");
    return list;
  }
  function drawCharacterName() {
    if (!mousePos) return;
    const hits = characterBoxes().filter((b2) => mousePos.x >= b2.x && mousePos.x <= b2.x + b2.w && mousePos.y >= b2.y && mousePos.y <= b2.y + b2.h);
    if (!hits.length) return;
    const b = hits.sort((p, q) => p.w * p.h - q.w * q.h)[0];
    g.font = "bold 13px Georgia";
    const w = g.measureText(b.name).width + 18, cx = b.x + b.w / 2, top = Math.max(2, b.y - 26);
    fill(cx - w / 2, top, w, 22, "#5b381f");
    fill(cx - w / 2 + 2, top + 2, w - 4, 18, "#7a4d2c");
    text(b.name, cx, top + 16, 13, "#ffe7a4");
  }
  const townBtn = document.getElementById("backToTown");
  function updateTownButton() {
    if (!townBtn) return;
    const show = scene !== "town";
    if (townBtn.hidden === show) townBtn.hidden = !show;
  }
  function goToTown() {
    viewMode = "town";
    const vs = document.getElementById("viewSelect");
    if (vs) vs.value = "town";
    syncRoutine();
    draw();
    c.focus && c.focus();
  }
  if (townBtn) townBtn.onclick = goToTown;
  let lastFrame = 0;
  function routineLoop(ts) {
    const dt = Math.min((ts - lastFrame) / 1e3 || 0, 0.1);
    lastFrame = ts;
    update(dt);
    draw();
    requestAnimationFrame(routineLoop);
  }
  document.getElementById("timeSlider").addEventListener("input", (e) => setTime(e.target.value));
  document.getElementById("toggleTime").onclick = () => {
    if (clockMode === "live") {
      readCentralClock(true);
      clockMode = "preview";
      timeRunning = false;
    } else timeRunning = !timeRunning;
    refreshUI();
  };
  document.getElementById("currentTime").onclick = useCurrentCentralTime;
  document.getElementById("speedSelect").onchange = (e) => {
    clockMode = "preview";
    timeSpeed = Number(e.target.value);
    refreshUI();
  };
  document.getElementById("viewSelect").onchange = (e) => {
    viewMode = e.target.value;
    syncRoutine();
    draw();
  };
  document.querySelectorAll("[data-time]").forEach((button) => button.onclick = () => {
    rideForced = false;
    gymForced = false;
    setTime(button.dataset.time);
  });
  const footballBtn = document.getElementById("previewFootball");
  if (footballBtn) footballBtn.onclick = () => {
    footballForced = !footballForced;
    window.HMFootballPreview = footballForced;
    footballBtn.setAttribute("aria-pressed", String(footballForced));
    if (footballForced) {
      viewMode = "town";
      const vs = document.getElementById("viewSelect");
      if (vs) vs.value = "town";
      if (window.HMTown) {
        window.HMTown.camera.z = 2.2;
        window.HMTown.focus(1240, 190);
      }
      syncRoutine();
    }
  };
  const hoopsBtn = document.getElementById("previewHoops");
  if (hoopsBtn) hoopsBtn.onclick = () => {
    hoopsForced = !hoopsForced;
    window.HMHoopsPreview = hoopsForced;
    hoopsBtn.setAttribute("aria-pressed", String(hoopsForced));
    if (hoopsForced) {
      viewMode = "town";
      const vs = document.getElementById("viewSelect");
      if (vs) vs.value = "town";
      if (window.HMTown) {
        window.HMTown.camera.z = 2.2;
        window.HMTown.focus(1229, 368);
      }
      syncRoutine();
    }
  };
  const gymBtn = document.getElementById("previewGym");
  if (gymBtn) gymBtn.onclick = () => {
    gymForced = true;
    rideForced = false;
    timeSpeed = 1 / 60;
    const sp = document.getElementById("speedSelect");
    if (sp) sp.value = String(1 / 60);
    viewMode = "gym";
    const vs = document.getElementById("viewSelect");
    if (vs) vs.value = "gym";
    setTime(18 * 60 + 10, false);
    timeRunning = true;
    refreshUI();
  };
  const rideBtn = document.getElementById("previewRide");
  if (rideBtn) rideBtn.onclick = () => {
    gymForced = false;
    rideForced = true;
    timeSpeed = 1 / 60;
    const sp = document.getElementById("speedSelect");
    if (sp) sp.value = String(1 / 60);
    viewMode = "town";
    const vs = document.getElementById("viewSelect");
    if (vs) vs.value = "town";
    if (window.HMTown) {
      window.HMTown.camera.z = 1.6;
      window.HMTown.focus(470, 950);
    }
    setTime(18 * 60 + 4.9, false);
    timeRunning = true;
    refreshUI();
  };
  window.HoneyMeadows = {
    useCurrentCentralTime,
    getClockState() {
      return { mode: clockMode, timeZone: CENTRAL_ZONE, zoneLabel: centralZoneLabel, minute: simMinute, date: centralDateLabel, running: timeRunning };
    },
    getGameData() {
      return { opponent: opponentId, scoreMode: courtConfig.scoreMode, score: { home: pickup.score[0], away: pickup.score[1] }, period: courtConfig.period, clock: courtConfig.clock };
    },
    setGameData(patch = {}) {
      if (patch.opponent) {
        const id = String(patch.opponent).toUpperCase();
        if (!NBA_TEAMS.some((t) => t.id === id && id !== "OKC")) return false;
        opponentId = id;
        courtConfig.opponent = id;
        courtTextureReady = false;
        prepareCourtTexture();
      }
      if (patch.scoreMode) courtConfig.scoreMode = patch.scoreMode === "manual" ? "manual" : "simulation";
      if (patch.score) {
        if (patch.score.home !== void 0) pickup.score[0] = scoreNumber(patch.score.home);
        if (patch.score.away !== void 0) pickup.score[1] = scoreNumber(patch.score.away);
        courtConfig.score = { home: pickup.score[0], away: pickup.score[1] };
      }
      if (patch.period !== void 0) courtConfig.period = String(patch.period).slice(0, 12);
      if (patch.clock !== void 0) courtConfig.clock = String(patch.clock).slice(0, 12);
      draw();
      return true;
    }
  };
  const TOWN_DOORS = { nails: "nails", research: "research", farm: "farm", "city-hall": "headquarters", gym: "gym", restaurant: "restaurant", gibbons: "gibbons", hardaway: "hardaway", jones: "jones" };
  function openScene(id) {
    viewMode = id;
    const vs = document.getElementById("viewSelect");
    if (vs) vs.value = id;
    syncRoutine();
    draw();
  }
  const INTERIOR_HOTSPOTS = {
    headquarters: [
      { id: "sales", label: "📊 SALES DASHBOARD", box: { x: 494, y: 346, w: 166, h: 134 }, open: () => window.EtsyHQ && window.EtsyHQ.open() },
      { id: "catalog", label: "📚 NAIL CATALOG", box: { x: 296, y: 104, w: 132, h: 120 }, open: () => window.BooksCatalog && window.BooksCatalog.open() }
    ],
    research: [
      { id: "tiktok", label: "🎵 TIKTOK", box: { x: 335, y: 214, w: 254, h: 125 }, open: () => window.ResearchBoard && window.ResearchBoard.open("tiktok") },
      { id: "pinterest", label: "📌 PINTEREST", box: { x: 627, y: 240, w: 204, h: 104 }, open: () => window.ResearchBoard && window.ResearchBoard.open("pinterest") },
      { id: "marketing", label: "📣 MARKETING", box: { x: 381, y: 373, w: 146, h: 175 }, open: () => window.ResearchBoard && window.ResearchBoard.open("marketing") }
    ]
  };
  let hotspotHover = null;
  function hotspotAt(x, y) {
    return (INTERIOR_HOTSPOTS[scene] || []).find((h) => x >= h.box.x && x <= h.box.x + h.box.w && y >= h.box.y && y <= h.box.y + h.box.h) || null;
  }
  function drawInteriorHotspots(id) {
    const pulse = 0.5 + 0.5 * Math.sin(clock * 3);
    for (const h of INTERIOR_HOTSPOTS[id] || []) {
      const { x, y, w, h: hh } = h.box, on = hotspotHover === h.id;
      g.save();
      if (on) {
        g.fillStyle = "rgba(255,226,140,.14)";
        g.fillRect(x, y, w, hh);
      }
      g.strokeStyle = on ? "#fff1a8" : "rgba(255,226,140,".concat(0.35 + 0.35 * pulse, ")");
      g.lineWidth = on ? 3 : 2;
      g.setLineDash(on ? [] : [6, 5]);
      g.strokeRect(x + 0.5, y + 0.5, w, hh);
      g.setLineDash([]);
      g.restore();
      g.font = "bold 11px Georgia";
      const lw = Math.max(110, g.measureText(h.label).width + 26);
      fill(x + w / 2 - lw / 2, y - 30, lw, 22, on ? "#f6e0a5" : "#5b381f");
      text(h.label, x + w / 2, y - 14, 11, on ? "#422d20" : "#ffe7a4");
    }
  }
  c.addEventListener("click", (e) => {
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) * c.width / r.width, y = (e.clientY - r.top) * c.height / r.height;
    const spot = hotspotAt(x, y);
    if (spot) {
      hotspotHover = null;
      c.style.cursor = "";
      spot.open();
      return;
    }
    if (scene !== "town" || !window.HMTown) return;
    if (window.HMTown.consumeDrag()) return;
    const t = window.HMTown.hit(x, y);
    if (!t) return;
    window.HMTown.setHover(null);
    c.style.cursor = "";
    if (t.id === "basketball-court") {
      window.open(THUNDER_STATS_URL, "_blank", "noopener");
      return;
    }
    if (t.id === "football-field") {
      window.open(window.OSUFeed ? window.OSUFeed.STATS_URL : "https://www.espn.com/college-football/team/stats/_/id/197/oklahoma-state-cowboys", "_blank", "noopener");
      return;
    }
    if (t.id === "house-3") {
      window.HMTown.comingSoon(t);
      return;
    }
    const sceneId = TOWN_DOORS[t.id];
    if (sceneId) openScene(sceneId);
  });
  c.addEventListener("mousemove", (e) => {
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) * c.width / r.width, y = (e.clientY - r.top) * c.height / r.height;
    mousePos = { x, y };
    if (INTERIOR_HOTSPOTS[scene]) {
      const sp = hotspotAt(x, y);
      hotspotHover = sp ? sp.id : null;
      c.style.cursor = sp ? "pointer" : "default";
      return;
    }
    hotspotHover = null;
    if (scene !== "town") {
      if (hover) {
        hover = null;
        c.style.cursor = "";
      }
      return;
    }
    const T2 = window.HMTown;
    if (!T2) return;
    if (T2.dragging) {
      T2.setHover(null);
      return;
    }
    const t = T2.hit(x, y);
    T2.setHover(t);
    c.style.cursor = t ? "pointer" : "";
  });
  c.addEventListener("mouseleave", () => {
    mousePos = null;
    hover = null;
    if (window.HMTown) window.HMTown.setHover(null);
    hotspotHover = null;
    c.style.cursor = "";
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && window.ResearchBoard && window.ResearchBoard.isOpen) {
      window.ResearchBoard.close();
      return;
    }
    if (e.key === "Escape" && window.BooksCatalog && window.BooksCatalog.isOpen) {
      window.BooksCatalog.back();
      return;
    }
    if (e.key === "Escape" && window.EtsyHQ && window.EtsyHQ.isOpen) {
      window.EtsyHQ.close();
      return;
    }
    if (e.key === "Escape") {
      viewMode = "town";
      document.getElementById("viewSelect").value = "town";
      syncRoutine();
      draw();
    }
  });
  window.HM_DEBUG = {
    get isWeekend() {
      return isWeekend();
    },
    jonesActivity(m) {
      return jonesActivity(m == null ? simMinute : m);
    },
    get dogs() {
      return townDogs().map((e) => ({ name: e.dog.name, x: e.x, y: e.y, row: e.row }));
    },
    flashTouchdown() {
      tdUntil = clock + TD_SECONDS;
    },
    setFootball(v) {
      footballForced = !!v;
      window.HMFootballPreview = footballForced;
    },
    footballAt(t) {
      return footballState(t);
    },
    setHoops(v) {
      hoopsForced = !!v;
      window.HMHoopsPreview = hoopsForced;
    },
    get hoopsLive() {
      return hoopsLive();
    },
    get clock() {
      return clock;
    },
    hoopsAt(t) {
      return hoopsState(t);
    },
    setRideDay(v) {
      rideForced = !!v;
    },
    get isRideDay() {
      return isRideDay();
    },
    rideAt(id, minute) {
      return rideState(id, minute * 60);
    },
    get rideLoop() {
      return RIDE_LOOP.points;
    },
    get parkedBikes() {
      return parkedBikes();
    },
    get clockMode() {
      return clockMode;
    },
    get timeZone() {
      return CENTRAL_ZONE;
    },
    get centralDate() {
      return centralDateLabel;
    },
    get centralZone() {
      return centralZoneLabel;
    },
    centralTimeAt,
    useCurrentCentralTime,
    get minute() {
      return simMinute;
    },
    get day() {
      return simDay;
    },
    get scene() {
      return scene;
    },
    get period() {
      return householdState.period.id;
    },
    get state() {
      return JSON.parse(JSON.stringify(householdState));
    },
    get npcCount() {
      return 0;
    },
    get basketballCount() {
      return 6;
    },
    get teams() {
      return NBA_TEAMS.map((t) => ({ id: t.id, name: t.name }));
    },
    get opponent() {
      return opponentId;
    },
    get score() {
      return pickup.score.slice();
    },
    get logoReady() {
      return Object.fromEntries(Object.entries(teamLogos).map(([id, img]) => [id, !!(img.complete && img.naturalWidth)]));
    },
    get courtTextureReady() {
      return courtTextureReady;
    },
    get timeRunning() {
      return timeRunning;
    },
    get darkness() {
      return darknessAt(simMinute);
    },
    get assetReady() {
      return Object.fromEntries(Object.keys(assets).map((k) => [k, ready(k)]));
    },
    get townActorsValid() {
      const M = window.HM_MAP;
      const onPath = (a) => M.paths.some((p) => p.points.slice(1).some((b, i) => {
        const q = p.points[i], dx = b[0] - q[0], dy = b[1] - q[1], t = Math.max(0, Math.min(1, ((a.x - q[0]) * dx + (a.y - q[1]) * dy) / (dx * dx + dy * dy || 1)));
        return Math.hypot(a.x - q[0] - t * dx, a.y - q[1] - t * dy) <= p.width / 2 + 2;
      }));
      return [householdState.girl, householdState.boy, householdState.dog, ...townsfolkState()].filter((a) => a.scene === "town" && !a.resting || a.folk && a.folk.paths).every(onPath);
    },
    get townsfolk() {
      return townsfolkState().map((e) => ({ name: e.folk.name, x: e.x, y: e.y }));
    },
    get generatedPose() {
      return ["breakfast", "dinner"].includes(householdState.period.id) ? "meal" : householdState.period.id;
    },
    setCourtLights(v) {
      if (window.HMTown) window.HMTown.setPref("courtLights", v === null || v === void 0 ? "auto" : v ? "on" : "off");
      draw();
    },
    get courtLightsOn() {
      return window.HMTown ? window.HMTown.lightState({ darkness: darknessAt(simMinute) }).court : false;
    },
    setTime,
    periodAt,
    formatTime,
    setView(id) {
      viewMode = id;
      document.getElementById("viewSelect").value = id;
      syncRoutine();
      draw();
    },
    advance(seconds) {
      let remaining = seconds;
      while (remaining > 1e-8) {
        const dt = Math.min(remaining, 1 / 30);
        update(dt);
        remaining -= dt;
      }
      draw();
    },
    setRunning(value) {
      if (clockMode === "live" && !value) {
        readCentralClock(true);
        clockMode = "preview";
      }
      timeRunning = !!value;
      refreshUI();
    },
    setSpeed(value) {
      clockMode = "preview";
      timeSpeed = value;
      refreshUI();
    }
  };
  function resyncLiveClock() {
    if (clockMode === "live") {
      readCentralClock(true);
      syncRoutine();
      draw();
    }
  }
  window.addEventListener("focus", resyncLiveClock);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) resyncLiveClock();
  });
  readCentralClock(true);
  prepareCourtTexture();
  syncRoutine();
  draw();
  requestAnimationFrame(routineLoop);
})();
