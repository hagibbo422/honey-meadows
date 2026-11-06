(() => {
  "use strict";
  const cfg = Object.assign({ liveFeed: true }, window.HONEY_MEADOWS_GAME || {});
  const ZONE = "America/Chicago";
  const API = "https://site.api.espn.com/apis/site/v2/sports/football/college-football";
  const OSU_ID = "197";
  const CACHE_KEY = "honeyMeadows.osuFeed.v1";
  const STATS_URL = "https://www.espn.com/college-football/team/stats/_/id/197/oklahoma-state-cowboys";
  const LOGOS = { KSU: "assets/osu/KSU.png", TTU: "assets/osu/TTU.png", ASU: "assets/osu/ASU.png", KU: "assets/osu/KU.png" };
  const ID_TO_ABBR = { "2306": "KSU", "2641": "TTU", "9": "ASU", "2305": "KU" };
  const ALIASES = { KST: "KSU", KSTATE: "KSU", TXTECH: "TTU", TT: "TTU", ARIZST: "ASU", KAN: "KU" };
  const centralDay = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const centralTime = (d) => new Intl.DateTimeFormat("en-US", { timeZone: ZONE, hour: "numeric", minute: "2-digit" }).format(d);
  const centralMD = (d) => new Intl.DateTimeFormat("en-US", { timeZone: ZONE, month: "numeric", day: "numeric" }).format(d);
  const centralMonDay = (d) => new Intl.DateTimeFormat("en-US", { timeZone: ZONE, month: "short", day: "numeric" }).format(d).toUpperCase();
  const dayIndex = (d) => {
    const [y, m, dd] = centralDay(d).split("-").map(Number);
    return Math.round(Date.UTC(y, m - 1, dd) / 864e5);
  };
  const scoreOf = (s) => {
    if (s == null) return 0;
    if (typeof s === "object") return Number(s.value != null ? s.value : s.displayValue) || 0;
    return Number(s) || 0;
  };
  const isOSU = (c) => c && c.team && (String(c.team.id) === OSU_ID || String(c.team.abbreviation || "").toUpperCase() === "OKST");
  function abbrOf(team) {
    if (!team) return "";
    const byId = ID_TO_ABBR[String(team.id)];
    if (byId) return byId;
    const a = String(team.abbreviation || "").toUpperCase();
    return ALIASES[a] || a;
  }
  function periodLabel(status) {
    const name = status && status.type && status.type.name || "", p = Number(status && status.period) || 0;
    if (name === "STATUS_HALFTIME") return "HALF";
    if (p <= 4) return ["1ST", "2ND", "3RD", "4TH"][Math.max(1, p) - 1];
    return p === 5 ? "OT" : p - 4 + "OT";
  }
  function eventToGame(ev) {
    const comp = ev && ev.competitions && ev.competitions[0];
    if (!comp || !comp.competitors) return null;
    const osu = comp.competitors.find(isOSU), opp = comp.competitors.find((t) => t !== osu);
    if (!osu || !opp) return null;
    const status = comp.status || ev.status || {}, state = status.type && status.type.state || "pre", date = new Date(ev.date || comp.date);
    const opponent = abbrOf(opp.team);
    const game = {
      id: String(ev.id),
      state,
      date: ev.date || comp.date,
      opponent,
      opponentName: opp.team && (opp.team.shortDisplayName || opp.team.displayName) || opponent,
      logo: LOGOS[opponent] || null,
      homeAway: osu.homeAway === "away" ? "away" : "home",
      score: { home: scoreOf(osu.score), away: scoreOf(opp.score) },
      period: "",
      clock: ""
    };
    if (state === "pre") {
      game.score = { home: 0, away: 0 };
      game.period = "TODAY";
      game.clock = centralTime(date);
    } else if (state === "in") {
      game.period = periodLabel(status);
      game.clock = game.period === "HALF" ? "0:00" : status.displayClock || "";
    } else {
      const p = Number(status.period) || 4;
      game.period = p > 4 ? p === 5 ? "F/OT" : "F/" + (p - 4) + "OT" : "FINAL";
      game.clock = centralMD(date);
    }
    return game;
  }
  function chooseGame(events, now = /* @__PURE__ */ new Date()) {
    const games = events.map((e) => ({ ev: e, g: eventToGame(e) })).filter((x) => x.g).sort((a, b) => new Date(a.g.date) - new Date(b.g.date));
    const live = games.find((x) => x.g.state === "in");
    if (live) return live;
    const today = dayIndex(now);
    const upcoming = games.filter((x) => x.g.state === "pre" && dayIndex(new Date(x.g.date)) >= today);
    const next = upcoming.length ? upcoming[0] : null;
    const done = games.filter((x) => x.g.state === "post");
    const last = done.length ? done[done.length - 1] : null;
    const label = (x) => {
      const d = new Date(x.g.date);
      x.g.period = dayIndex(d) === today ? "TODAY" : centralMonDay(d);
      x.g.clock = centralTime(d);
      return x;
    };
    if (next && dayIndex(new Date(next.g.date)) === today) return label(next);
    if (last && today - dayIndex(new Date(last.g.date)) <= 1) return last;
    if (next) return label(next);
    return last;
  }
  async function getJSON(url) {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(url + " -> " + r.status);
    return r.json();
  }
  async function liveCopy(pick) {
    const day = centralDay(new Date(pick.g.date)).replace(/-/g, "");
    try {
      const sb = await getJSON(API + "/scoreboard?dates=" + day + "&groups=80&limit=300");
      const fresh = (sb.events || []).find((e) => String(e.id) === pick.g.id);
      if (fresh) return eventToGame(fresh);
    } catch (e) {
    }
    try {
      const sum = await getJSON(API + "/summary?event=" + pick.g.id), h = sum && sum.header;
      if (h && h.competitions) return eventToGame({ id: h.id, date: h.competitions[0].date, competitions: h.competitions });
    } catch (e) {
    }
    return null;
  }
  async function fetchOSUGame(now = /* @__PURE__ */ new Date()) {
    const lists = await Promise.all([2, 3].map((t) => getJSON(API + "/teams/" + OSU_ID + "/schedule?seasontype=" + t).then((j) => j.events || []).catch(() => [])));
    const events = lists.flat();
    if (!events.length) throw new Error("ESPN schedule empty");
    const pick = chooseGame(events, now);
    if (!pick) return null;
    if (pick.g.state === "in" || centralDay(new Date(pick.g.date)) === centralDay(now)) {
      const g = await liveCopy(pick);
      if (g) {
        if (g.state === "pre") {
          g.period = pick.g.period;
          g.clock = pick.g.clock;
        }
        return g;
      }
    }
    return pick.g;
  }
  function loadCache() {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    } catch (e) {
      return null;
    }
  }
  function saveCache(g) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(g));
    } catch (e) {
    }
  }
  let current = null, timer = null, lastError = null, lastUpdated = null;
  function nextDelay(g) {
    if (!g) return 10 * 6e4;
    if (g.state === "in") return 2e4;
    if (g.state === "pre") {
      const until = new Date(g.date) - Date.now();
      return until < 15 * 6e4 ? 3e4 : Math.min(10 * 6e4, Math.max(3e4, until - 10 * 6e4));
    }
    return 10 * 6e4;
  }
  async function refresh() {
    clearTimeout(timer);
    try {
      const g = await fetchOSUGame();
      if (g) {
        current = g;
        lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
        lastError = null;
        saveCache(g);
      }
    } catch (e) {
      lastError = String(e && e.message || e);
      console.warn("[OSUFeed]", lastError);
    }
    timer = setTimeout(refresh, nextDelay(current));
  }
  window.OSUFeed = {
    chooseGame,
    eventToGame,
    refresh,
    LOGOS,
    STATS_URL,
    get current() {
      return current;
    },
    set current(g) {
      current = g;
    },
    get lastError() {
      return lastError;
    },
    get lastUpdated() {
      return lastUpdated;
    }
  };
  if (cfg.liveFeed && typeof fetch === "function") {
    const cached = loadCache();
    if (cached) {
      cached.logo = LOGOS[cached.opponent] || null;
      current = cached;
    }
    refresh();
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refresh();
    });
  }
})();
