(() => {
  "use strict";
  const cfg = Object.assign({ liveFeed: true }, window.HONEY_MEADOWS_GAME || {});
  const ZONE = "America/Chicago";
  const API = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";
  const CACHE_KEY = "honeyMeadows.thunderFeed.v1";
  const ESPN_TO_LOCAL = { SA: "SAS", NY: "NYK", GS: "GSW", NO: "NOP", UTAH: "UTA", WSH: "WAS" };
  const toLocalId = (ab) => {
    const a = String(ab || "").toUpperCase();
    return ESPN_TO_LOCAL[a] || a;
  };
  const centralDay = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const centralTime = (d) => new Intl.DateTimeFormat("en-US", { timeZone: ZONE, hour: "numeric", minute: "2-digit" }).format(d);
  const centralMD = (d) => new Intl.DateTimeFormat("en-US", { timeZone: ZONE, month: "numeric", day: "numeric" }).format(d);
  const scoreOf = (s) => {
    var _a;
    if (s == null) return 0;
    if (typeof s === "object") return Number((_a = s.value) != null ? _a : s.displayValue) || 0;
    return Number(s) || 0;
  };
  function periodLabel(status) {
    var _a;
    const name = ((_a = status == null ? void 0 : status.type) == null ? void 0 : _a.name) || "", p = Number(status == null ? void 0 : status.period) || 0;
    if (name === "STATUS_HALFTIME") return "HALF";
    if (p <= 4) return "Q" + Math.max(1, p);
    return p === 5 ? "OT" : p - 4 + "OT";
  }
  function eventToGame(ev) {
    var _a, _b, _c;
    const comp = (_a = ev == null ? void 0 : ev.competitions) == null ? void 0 : _a[0];
    if (!comp) return null;
    const okc = comp.competitors.find((t) => {
      var _a2;
      return toLocalId((_a2 = t.team) == null ? void 0 : _a2.abbreviation) === "OKC";
    });
    const opp = comp.competitors.find((t) => t !== okc);
    if (!okc || !opp) return null;
    const status = comp.status || ev.status || {}, state = ((_b = status.type) == null ? void 0 : _b.state) || "pre", date = new Date(ev.date);
    const game = {
      id: ev.id,
      state,
      date: ev.date,
      opponent: toLocalId((_c = opp.team) == null ? void 0 : _c.abbreviation),
      score: { home: scoreOf(okc.score), away: scoreOf(opp.score) },
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
  // Which game the scoreboard shows (all days in Central Time):
  //  1. A game in progress -> live score.
  //  2. A game today that hasn't started -> 0-0, "TODAY" and the tip time.
  //  3. A game that finished today or yesterday -> its final score (stays up one extra day).
  //     Exception: if the next game is today (back-to-back), rule 2 wins.
  //  4. Otherwise -> the next game: 0-0, its date (e.g. "NOV 7") and tip time.
  //  5. No upcoming game (off-season) -> the last final score.
  const centralMonDay = (d) => new Intl.DateTimeFormat("en-US", { timeZone: ZONE, month: "short", day: "numeric" }).format(d).toUpperCase();
  const dayIndex = (d) => {
    const [y, m, dd] = centralDay(d).split("-").map(Number);
    return Math.round(Date.UTC(y, m - 1, dd) / 864e5);
  };
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
  async function fetchThunderGame(now = /* @__PURE__ */ new Date()) {
    const lists = await Promise.all([2, 3].map((t) => getJSON("".concat(API, "/teams/okc/schedule?seasontype=").concat(t)).then((j) => j.events || []).catch(() => [])));
    const events = lists.flat();
    if (!events.length) throw new Error("ESPN schedule empty");
    const pick = chooseGame(events, now);
    if (!pick) return null;
    if (pick.g.state === "in" || centralDay(new Date(pick.g.date)) === centralDay(now)) {
      try {
        const day = centralDay(new Date(pick.g.date)).replace(/-/g, "");
        const sb = await getJSON("".concat(API, "/scoreboard?dates=").concat(day));
        const fresh = (sb.events || []).find((e) => e.id === pick.g.id);
        const g = fresh && eventToGame(fresh);
        if (g && g.state === "pre") { g.period = pick.g.period; g.clock = pick.g.clock; }
        if (g) return g;
      } catch (e) {
      }
    }
    return pick.g;
  }
  function apply(game) {
    const hm = window.HoneyMeadows;
    if (!hm || !game) return false;
    return hm.setGameData({ opponent: game.opponent, scoreMode: "manual", score: game.score, period: game.period, clock: game.clock });
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
      const g = await fetchThunderGame();
      if (g) {
        current = g;
        lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
        lastError = null;
        apply(g);
        saveCache(g);
      }
    } catch (e) {
      lastError = String(e.message || e);
      console.warn("[ThunderFeed]", lastError);
    }
    timer = setTimeout(refresh, nextDelay(current));
  }
  window.ThunderFeed = {
    chooseGame,
    eventToGame,
    toLocalId,
    refresh,
    get current() {
      return current;
    },
    get lastError() {
      return lastError;
    },
    get lastUpdated() {
      return lastUpdated;
    }
  };
  if (cfg.liveFeed && typeof fetch === "function" && window.HoneyMeadows) {
    const cached = loadCache();
    if (cached) {
      current = cached;
      apply(cached);
    }
    refresh();
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refresh();
    });
  }
})();
