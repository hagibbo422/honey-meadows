(() => {
  "use strict";
  const MAP = window.HM_MAP, ROUTES = window.HM_ROUTES || {};
  if (!MAP) return;
  const CW = 1152, CH = 768, WW = MAP.width, WH = MAP.height;
  const MIN_Z = CW / WW, MAX_Z = 2.4, START_Z = 1.3;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const canvas = document.getElementById("game");
  const PREF_KEY = "honeyMeadows.townPrefs.v1", CAM_KEY = "honeyMeadows.camera.v1";
  const prefs = { townLights: "auto", courtLights: "auto", fieldLights: "auto", weather: "auto", paths: false };
  try {
    Object.assign(prefs, JSON.parse(localStorage.getItem(PREF_KEY) || "{}") || {});
  } catch (e) {
  }
  const savePrefs = () => {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    } catch (e) {
    }
  };
  const WX_URL = "https://api.open-meteo.com/v1/forecast?latitude=35.4676&longitude=-97.5164&current=weather_code,precipitation,rain,showers&timezone=America%2FChicago";
  const WX_KEY = "honeyMeadows.okcWeather.v1";
  const RAIN_CODES = [3, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];
  const WX_NAMES = { 0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 56: "Freezing drizzle", 57: "Freezing drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains", 80: "Rain showers", 81: "Rain showers", 82: "Heavy showers", 85: "Snow showers", 86: "Snow showers", 95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm" };
  let liveWx = null;
  try {
    const c = JSON.parse(localStorage.getItem(WX_KEY) || "null");
    if (c && Date.now() - c.at < 3 * 36e5) liveWx = c;
  } catch (e) {
  }
  function wxRaining(w) {
    return !!w && (RAIN_CODES.indexOf(w.code) >= 0 || (w.rain || 0) + (w.showers || 0) > 0);
  }
  async function refreshWeather() {
    try {
      const r = await fetch(WX_URL, { cache: "no-store" });
      if (!r.ok) throw new Error("weather " + r.status);
      const cur = (await r.json()).current || {};
      liveWx = { at: Date.now(), code: Number(cur.weather_code), rain: Number(cur.rain) || 0, showers: Number(cur.showers) || 0 };
      try {
        localStorage.setItem(WX_KEY, JSON.stringify(liveWx));
      } catch (e) {
      }
    } catch (e) {
      console.warn("[Weather]", e && e.message || e);
    }
    syncWeatherNote();
  }
  const isRaining = () => prefs.weather === "rain" || prefs.weather === "auto" && wxRaining(liveWx);
  function syncWeatherNote() {
    const n = document.getElementById("weatherNote");
    if (!n) return;
    n.textContent = liveWx ? "Live OKC weather: " + (WX_NAMES[liveWx.code] || "Unknown") + (wxRaining(liveWx) ? " (raining in Honey Meadows)" : "") : "Live OKC weather: checking…";
  }
  if (typeof fetch === "function") {
    refreshWeather();
    setInterval(refreshWeather, 10 * 6e4);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && (!liveWx || Date.now() - liveWx.at > 5 * 6e4)) refreshWeather();
    });
  }
  const cam = { x: 0, y: 0, z: START_Z };
  function clampCam() {
    cam.z = clamp(cam.z, MIN_Z, MAX_Z);
    cam.x = clamp(cam.x, 0, Math.max(0, WW - CW / cam.z));
    cam.y = clamp(cam.y, 0, Math.max(0, WH - CH / cam.z));
  }
  function focus(wx, wy) {
    cam.x = wx - CW / cam.z / 2;
    cam.y = wy - CH / cam.z / 2;
    clampCam();
  }
  const toWorld = (sx, sy) => [sx / cam.z + cam.x, sy / cam.z + cam.y];
  const toScreen = (wx, wy) => [(wx - cam.x) * cam.z, (wy - cam.y) * cam.z];
  function zoomAt(z, sx, sy) {
    const [wx, wy] = toWorld(sx, sy);
    cam.z = clamp(z, MIN_Z, MAX_Z);
    cam.x = wx - sx / cam.z;
    cam.y = wy - sy / cam.z;
    clampCam();
    saveCam();
  }
  let camTimer = 0;
  function saveCam() {
    clearTimeout(camTimer);
    camTimer = setTimeout(() => {
      try {
        localStorage.setItem(CAM_KEY, JSON.stringify(cam));
      } catch (e) {
      }
    }, 300);
  }
  focus(575, 410);
  try {
    const c = JSON.parse(localStorage.getItem(CAM_KEY) || "null");
    if (c && isFinite(c.x) && isFinite(c.y) && isFinite(c.z)) {
      Object.assign(cam, { x: c.x, y: c.y, z: c.z });
      clampCam();
    }
  } catch (e) {
  }
  const TEX = { day: "assets/town/day.jpg", "day-off": "assets/town/day-off.jpg", night: "assets/town/night.jpg", "night-off": "assets/town/night-off.jpg", rain: "assets/town/rain.jpg", "rain-off": "assets/town/rain-off.jpg" };
  const tex = {};
  let texVersion = 0;
  function need(name) {
    let im = tex[name];
    if (!im) {
      im = tex[name] = new Image();
      im.onload = () => texVersion++;
      im.src = TEX[name];
    }
    return im.complete && im.naturalWidth ? im : null;
  }
  need("day");
  const mk = () => {
    const c = document.createElement("canvas");
    c.width = WW;
    c.height = WH;
    return c;
  };
  const comp = {}, compKey = {};
  let base = null, baseKey = "";
  function layer(lit, f) {
    const suffix = lit ? "" : "-off", dayName = (isRaining() ? "rain" : "day") + suffix;
    const key = dayName + "|" + f.toFixed(3) + "|" + texVersion;
    const id = lit ? "on" : "off";
    if (compKey[id] === key) return comp[id];
    const d = need(dayName) || need(isRaining() ? "rain" : "day") || need("day");
    if (!d) return null;
    const c = comp[id] || (comp[id] = mk()), x = c.getContext("2d");
    x.globalAlpha = 1;
    x.drawImage(d, 0, 0, WW, WH);
    if (f > 1e-3) {
      const n = need("night" + suffix);
      if (n) {
        x.globalAlpha = isRaining() ? f * 0.85 : f;
        x.drawImage(n, 0, 0, WW, WH);
        x.globalAlpha = 1;
      }
    }
    compKey[id] = key;
    return c;
  }
  function polyPath(ctx, pts) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
  }
  const SPORTS = MAP.presentation.sportsLighting;
  function buildBase(st) {
    const f = Math.round(st.night * 24) / 24;
    const key = [isRaining(), f, st.town, st.court, st.field, texVersion].join("|");
    if (key === baseKey && base) return base;
    const main = layer(st.town, f);
    if (!main) return base;
    const differs = [["basketball", st.court], ["football", st.field]].filter(([, on]) => on !== st.town);
    if (!differs.length) {
      base = main;
    } else {
      const other = layer(!st.town, f);
      const b = comp.base || (comp.base = mk()), x = b.getContext("2d");
      x.drawImage(main, 0, 0);
      if (other) for (const [sport] of differs) {
        x.save();
        polyPath(x, SPORTS[sport].polygon);
        x.clip();
        x.drawImage(other, 0, 0);
        x.restore();
      }
      base = b;
    }
    baseKey = key;
    sampleBoards(base);
    return base;
  }
  function warm(st) {
    const s = st.town ? "" : "-off", o = st.town ? "-off" : "";
    const d = isRaining() ? "rain" : "day";
    need(d + s);
    if (st.court !== st.town || st.field !== st.town) need(d + o);
    if (st.night > 0) {
      need("night" + s);
      if (st.court !== st.town || st.field !== st.town) need("night" + o);
    }
  }
  const feedLive = (feed) => !!(feed && feed.current && feed.current.state === "in");
  function lightState(env) {
    const pick = (p, auto) => p === "on" ? true : p === "off" ? false : auto;
    const night = clamp((env.darkness || 0) / 0.58, 0, 1);
    return {
      night,
      town: pick(prefs.townLights, (env.darkness || 0) > 0.12),
      court: pick(prefs.courtLights, feedLive(window.ThunderFeed)),
      field: pick(prefs.fieldLights, feedLive(window.OSUFeed))
    };
  }
  const rain = window.HoneyMeadowsRain ? new window.HoneyMeadowsRain(WW, WH, ROUTES.surfaces || []) : null;
  const FONT = '"Arial Black","Helvetica Neue",Arial,Helvetica,sans-serif';
  function cellText(g, s, cx, cy, maxW, size, color, weight = "900") {
    s = String(s == null ? "" : s);
    let px = size;
    g.font = weight + " " + px + "px " + FONT;
    while (px > 5 && g.measureText(s).width > maxW) {
      px -= 0.5;
      g.font = weight + " " + px + "px " + FONT;
    }
    g.textAlign = "center";
    g.textBaseline = "middle";
    if (color !== INK) {
      g.fillStyle = "rgba(0,0,0,.75)";
      g.fillText(s, cx + 0.6, cy + 1.3);
    }
    g.fillStyle = color;
    g.fillText(s, cx, cy + 0.6);
  }
  const boardColor = { field: "#1e1f2d", court: "#1e1f2d" };
  function sampleBoards(c) {
    try {
      const x = c.getContext("2d"), px = (wx, wy) => {
        const d = x.getImageData(wx, wy, 3, 3).data;
        let r = 0, g2 = 0, b = 0;
        for (let i = 0; i < 36; i += 4) {
          r += d[i];
          g2 += d[i + 1];
          b += d[i + 2];
        }
        return "rgb(" + Math.round(r / 9) + "," + Math.round(g2 / 9) + "," + Math.round(b / 9) + ")";
      };
      boardColor.field = px(1180, 108);
      boardColor.court = px(1188, 298);
    } catch (e) {
    }
  }
  const CREAM = "#f7ecdb", GOLD = "#f6c42a", WHITE = "#ecebf2", INK = "#1c1a22";
  const logoImgs = {};
  function logo(src) {
    if (!src) return null;
    let im = logoImgs[src];
    if (!im) {
      im = logoImgs[src] = new Image();
      im.src = src;
    }
    return im.complete && im.naturalWidth ? im : null;
  }
  function drawBoard(g, L, d) {
    g.save();
    g.fillStyle = boardColor[L.id];
    g.fillRect(L.home[0] - L.home[2] / 2, L.y0, L.home[2], L.h);
    g.fillRect(L.period[0] - L.period[2] / 2, L.y0, L.period[2], L.h);
    g.fillRect(L.shot[0] - L.shot[2] / 2, L.y0, L.shot[2], L.h);
    g.fillRect(L.away[0] - L.away[2] / 2, L.y0, L.away[2], L.h);
    g.fillRect(L.guest[0] - L.guest[2] / 2, L.y0, L.guest[2], L.h);
    g.fillStyle = CREAM;
    g.fillRect(L.clock[0] - L.clock[2] / 2, L.clock[1] - L.clock[3] / 2, L.clock[2], L.clock[3]);
    cellText(g, d.home, L.home[0], L.cy, L.home[2] - 1, 17, GOLD);
    cellText(g, d.period, L.period[0], L.cy, L.period[2], 11, WHITE);
    cellText(g, d.clock, L.clock[0], L.cy, L.clock[2] - 2, 15, INK);
    cellText(g, d.away, L.away[0], L.cy, L.away[2] - 1, 17, GOLD);
    const im = logo(d.logo);
    if (im) {
      const s = L.h + 2;
      g.imageSmoothingEnabled = true;
      g.drawImage(im, L.guest[0] - s / 2, L.cy - s / 2, s, s);
    } else cellText(g, d.opp, L.guest[0], L.cy, L.guest[2] - 2, 12, WHITE);
    g.restore();
  }
  const FIELD_BOARD = { id: "field", y0: 106, h: 21, cy: 116.5, home: [1167, 0, 28], period: [1198, 0, 22], clock: [1231, 116.5, 35, 19], shot: [1264, 0, 18], away: [1292, 0, 26], guest: [1324.5, 0, 36] };
  const COURT_BOARD = { id: "court", y0: 296, h: 21, cy: 306, home: [1171.5, 0, 31], period: [1200, 0, 20], clock: [1229.5, 306, 32, 20], shot: [1259, 0, 16], away: [1287, 0, 28], guest: [1319.5, 0, 26] };
  function fieldData() {
    const g = window.OSUFeed && window.OSUFeed.current;
    if (!g) return { home: "–", away: "–", period: "", clock: "", opp: "GUEST" };
    return { home: g.score.home, away: g.score.away, period: g.period, clock: g.clock, opp: g.opponent, logo: g.logo };
  }
  function inside(p, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if (a[1] > p[1] !== b[1] > p[1] && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  const TARGETS = [
    ...MAP.buildings.filter((b) => b.interactive !== false).map((b) => ({ kind: "building", id: b.id, name: b.name, polygon: b.polygon })),
    ...MAP.venues.map((v) => ({ kind: "venue", id: v.id, name: v.name, polygon: v.polygon }))
  ];
  TARGETS.forEach((t) => {
    const xs = t.polygon.map((p) => p[0]), ys = t.polygon.map((p) => p[1]);
    t.box = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  });
  function hit(sx, sy) {
    const p = toWorld(sx, sy);
    for (let i = TARGETS.length - 1; i >= 0; i--) if (inside(p, TARGETS[i].polygon)) return TARGETS[i];
    return null;
  }
  let active = false, drag = null, lastDragMoved = false, pinch = null;
  const scaleOf = () => {
    const r = canvas.getBoundingClientRect();
    return { r, k: CW / (r.width || CW) };
  };
  function startDrag(cx, cy) {
    drag = { cx, cy, x: cam.x, y: cam.y, moved: false };
  }
  function moveDrag(cx, cy) {
    if (!drag) return false;
    const { k } = scaleOf(), dx = (cx - drag.cx) * k, dy = (cy - drag.cy) * k;
    if (!drag.moved && Math.hypot(dx, dy) > 6) drag.moved = true;
    if (!drag.moved) return false;
    cam.x = drag.x - dx / cam.z;
    cam.y = drag.y - dy / cam.z;
    clampCam();
    return true;
  }
  function endDrag() {
    if (!drag) return;
    lastDragMoved = drag.moved;
    if (drag.moved) saveCam();
    drag = null;
    canvas.classList.remove("dragging");
  }
  if (canvas && canvas.addEventListener) {
    canvas.addEventListener("mousedown", (e) => {
      if (!active || e.button !== 0) return;
      lastDragMoved = false;
      startDrag(e.clientX, e.clientY);
    });
    window.addEventListener("mousemove", (e) => {
      if (drag && moveDrag(e.clientX, e.clientY)) {
        canvas.classList.add("dragging");
        e.preventDefault();
      }
    });
    window.addEventListener("mouseup", endDrag);
    canvas.addEventListener("wheel", (e) => {
      if (!active) return;
      e.preventDefault();
      const { r, k } = scaleOf(), sx = (e.clientX - r.left) * k, sy = (e.clientY - r.top) * k;
      const step = Math.exp(-clamp(e.deltaY, -60, 60) * (e.ctrlKey ? 0.012 : 35e-4));
      zoomAt(cam.z * step, sx, sy);
    }, { passive: false });
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    canvas.addEventListener("touchstart", (e) => {
      if (!active) return;
      if (e.touches.length === 1) {
        lastDragMoved = false;
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
        pinch = null;
      } else if (e.touches.length === 2) {
        const { r, k } = scaleOf();
        drag = null;
        lastDragMoved = true;
        pinch = { d: dist(e.touches) || 1, z: cam.z, sx: ((e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left) * k, sy: ((e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top) * k };
        e.preventDefault();
      }
    }, { passive: false });
    canvas.addEventListener("touchmove", (e) => {
      if (!active) return;
      if (pinch && e.touches.length === 2) {
        e.preventDefault();
        zoomAt(pinch.z * dist(e.touches) / pinch.d, pinch.sx, pinch.sy);
        return;
      }
      if (drag && e.touches.length === 1) {
        if (moveDrag(e.touches[0].clientX, e.touches[0].clientY) || drag.moved) e.preventDefault();
      }
    }, { passive: false });
    canvas.addEventListener("touchend", (e) => {
      if (pinch && e.touches.length < 2) {
        pinch = null;
        saveCam();
        e.preventDefault();
        return;
      }
      if (drag) {
        const moved = drag.moved;
        endDrag();
        if (moved) e.preventDefault();
      }
    }, { passive: false });
    canvas.addEventListener("keydown", (e) => {
      if (!active) return;
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (d) {
        e.preventDefault();
        cam.x += d[0] * 60 / cam.z;
        cam.y += d[1] * 60 / cam.z;
        clampCam();
        saveCam();
      } else if (e.key === "+" || e.key === "=") zoomAt(cam.z * 1.15, CW / 2, CH / 2);
      else if (e.key === "-" || e.key === "_") zoomAt(cam.z / 1.15, CW / 2, CH / 2);
    });
  }
  let hover = null, soon = null, lastT = 0;
  function drawHouseholdLabel(g, st) {
    g.save();
    g.fillStyle = "#503923";
    g.fillRect(884, 706, 94, 42);
    g.fillStyle = isRaining() ? "#bfa77e" : st.night > 0.5 ? st.town ? "#d7b47b" : "#827d78" : "#e8c18a";
    g.fillRect(887, 709, 88, 36);
    g.strokeStyle = "#a37a41";
    g.lineWidth = 1;
    g.strokeRect(888, 710, 86, 34);
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = "bold 13px Georgia,serif";
    g.fillStyle = "#241b16";
    g.fillText("Hardaway", 931, 721);
    g.fillText("Household", 931, 736);
    g.restore();
  }
  function drawPaths(g) {
    g.save();
    g.lineJoin = g.lineCap = "round";
    for (const p of MAP.paths) {
      g.beginPath();
      p.points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
      g.strokeStyle = "rgba(75,255,180,.30)";
      g.lineWidth = p.width;
      g.stroke();
      g.strokeStyle = "rgba(20,120,80,.85)";
      g.lineWidth = 1.5;
      g.stroke();
    }
    g.restore();
  }
  function drawHover(g) {
    if (!hover) return;
    g.save();
    polyPath(g, hover.polygon);
    g.fillStyle = "rgba(255,229,85,.10)";
    g.fill();
    g.strokeStyle = "#ffe64f";
    g.shadowColor = "#fff000";
    g.shadowBlur = 13;
    g.lineWidth = 3 / Math.min(cam.z, 1.6) * 1.2;
    g.stroke();
    g.restore();
  }
  function pill(g, label, cx, top, active2) {
    g.save();
    g.font = "bold 13px Georgia,serif";
    const w = g.measureText(label).width + 22, x = clamp(cx - w / 2, 4, CW - w - 4), y = clamp(top, 4, CH - 30);
    g.fillStyle = "#5b381f";
    g.fillRect(x, y, w, 24);
    g.fillStyle = active2 ? "#9a6a3c" : "#7a4d2c";
    g.fillRect(x + 2, y + 2, w - 4, 20);
    g.fillStyle = "#ffe7a4";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(label, x + w / 2, y + 12.5);
    g.restore();
  }
  function gameLine(icon, us, g) {
    if (!g) return icon + " " + us + " STATS ↗";
    const vs = g.homeAway === "away" ? " at " : " vs ";
    if (g.state === "pre") return icon + " " + us + vs + g.opponent + " • " + g.period + " " + g.clock + " • STATS ↗";
    return icon + " " + us + " " + g.score.home + " – " + g.score.away + " " + g.opponent + " • " + g.period + (g.state === "in" ? " " + g.clock : "") + " • STATS ↗";
  }
  function hoverLabel(t, env) {
    if (t.id === "football-field") return gameLine("🏈", "OSU", window.OSUFeed && window.OSUFeed.current);
    if (t.id === "basketball-court") {
      const c = env.court || {};
      return "🏀 OKC " + (c.home != null ? c.home + " – " + c.away + " " + c.opp + " • " + c.period + " " + c.clock : "") + " • THUNDER STATS ↗";
    }
    if (t.id === "house-3" || t.id === "jones") return "🚧 " + t.name.toUpperCase() + " • COMING SOON";
    return "✦ ENTER " + t.name.toUpperCase();
  }
  function drawGround(g, env) {
    active = true;
    const now = performance.now(), dt = lastT ? Math.min((now - lastT) / 1e3, 0.1) : 0;
    lastT = now;
    const st = lightState(env);
    warm(st);
    const b = buildBase(st);
    g.save();
    g.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in g) g.imageSmoothingQuality = "high";
    if (b) {
      const sw = Math.min(CW / cam.z, WW - cam.x), sh = Math.min(CH / cam.z, WH - cam.y);
      g.drawImage(b, cam.x, cam.y, sw, sh, 0, 0, sw * cam.z, sh * cam.z);
    } else {
      g.fillStyle = "#294c36";
      g.fillRect(0, 0, CW, CH);
      g.fillStyle = "#ffe7a4";
      g.font = "bold 22px Georgia,serif";
      g.textAlign = "center";
      g.fillText("Loading Honey Meadows…", CW / 2, CH / 2);
    }
    g.restore();
    if (rain && isRaining()) rain.advance(dt);
    return st;
  }
  function beginWorld(g) {
    g.save();
    g.scale(cam.z, cam.z);
    g.translate(-cam.x, -cam.y);
    g.imageSmoothingEnabled = true;
  }
  function drawBoards(g, env, st) {
    drawHouseholdLabel(g, st);
    drawBoard(g, FIELD_BOARD, fieldData());
    const c = env.court || {};
    drawBoard(g, COURT_BOARD, { home: c.home, away: c.away, period: c.period, clock: c.clock, opp: c.opp, logo: c.opp ? "assets/teams/" + c.opp + ".png" : null });
  }
  function endWorld(g, env) {
    if (rain && isRaining()) rain.draw(g);
    if (prefs.paths) drawPaths(g);
    drawHover(g);
    g.restore();
    if (hover) {
      const [cx] = toScreen((hover.box.x0 + hover.box.x1) / 2, 0), [, by] = toScreen(0, hover.box.y1);
      pill(g, hoverLabel(hover, env), cx, by + 6, true);
    }
    if (soon && performance.now() < soon.until) {
      const t = soon.target, [cx] = toScreen((t.box.x0 + t.box.x1) / 2, 0), [, ty] = toScreen(0, t.box.y0);
      pill(g, "🚧 " + t.name + " — Coming soon!", cx, ty - 30, false);
    } else soon = null;
  }
  function buildSettings() {
    const panel = document.getElementById("settingsPanel");
    if (!panel || !panel.querySelector || document.getElementById("townSettings")) return;
    const wrap = document.createElement("div");
    wrap.className = "townWrap";
    wrap.id = "townSettings";
    const rows = [
      ["Town lights", "townLights", [["auto", "Auto"], ["on", "On"], ["off", "Off"]], "Auto: on from dusk to dawn"],
      ["Court lights", "courtLights", [["auto", "Auto"], ["on", "On"], ["off", "Off"]], "Auto: on only while a Thunder game is live"],
      ["Field lights", "fieldLights", [["auto", "Auto"], ["on", "On"], ["off", "Off"]], "Auto: on only while an OSU game is live"],
      ["Weather", "weather", [["auto", "Live OKC"], ["rain", "Rain"], ["clear", "Clear"]], "", "weatherNote"],
      ["Walk paths", "paths", [[false, "Hide"], [true, "Show"]], "Shows where characters can walk"]
    ];
    const head = document.createElement("span");
    head.className = "slabel townHead";
    head.textContent = "Town";
    wrap.append(head);
    for (const [label, key, opts, note, noteId] of rows) {
      const row = document.createElement("div");
      row.className = "townRow";
      const l = document.createElement("span");
      l.className = "slabel";
      l.textContent = label;
      const seg = document.createElement("div");
      seg.className = "seg";
      seg.setAttribute("role", "group");
      seg.setAttribute("aria-label", label);
      for (const [val, text] of opts) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "segbtn";
        b.textContent = text;
        b.dataset.townPref = key;
        b.dataset.value = String(val);
        b.onclick = () => setPref(key, val);
        seg.append(b);
      }
      row.append(l, seg);
      if (note || noteId) {
        const n = document.createElement("span");
        n.className = "snote";
        if (noteId) n.id = noteId;
        n.textContent = note;
        row.append(n);
      }
      wrap.append(row);
    }
    const before = panel.querySelector(".charsWrap");
    if (before) panel.insertBefore(wrap, before);
    else panel.append(wrap);
    syncSettings();
    syncWeatherNote();
  }
  function syncSettings() {
    if (!document.querySelectorAll) return;
    document.querySelectorAll("[data-town-pref]").forEach((b) => b.setAttribute("aria-pressed", String(String(prefs[b.dataset.townPref]) === b.dataset.value)));
  }
  function setPref(key, val) {
    if (!(key in prefs)) return false;
    prefs[key] = val;
    savePrefs();
    syncSettings();
    return true;
  }
  buildSettings();
  window.HMTown = {
    drawGround,
    beginWorld,
    drawBoards,
    endWorld,
    hit,
    toWorld,
    toScreen,
    focus,
    zoomAt,
    camera: cam,
    prefs,
    setPref,
    lightState,
    refreshWeather,
    get weather() {
      return liveWx;
    },
    get raining() {
      return isRaining();
    },
    deactivate() {
      active = false;
      endDrag();
    },
    setHover(t) {
      hover = t || null;
    },
    get hover() {
      return hover;
    },
    get dragging() {
      return !!(drag && drag.moved);
    },
    consumeDrag() {
      const m = lastDragMoved;
      lastDragMoved = false;
      return m;
    },
    comingSoon(t) {
      soon = { target: t, until: performance.now() + 2600 };
    },
    get ready() {
      return !!base;
    },
    targets: TARGETS
  };
})();
