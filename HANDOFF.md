# Project handoff

This is Honey Meadows V20, updated to open on the town and keep the team-selection controls out of the player interface. It runs as a local browser project with no package installation or build step.

## Expanded town map (Nov 2026)

The town is now the 1536×1024 illustrated map. The canvas stays 1152×768 (3:2); the camera shows part of the map.

| File | Purpose |
| --- | --- |
| `map-data.js` | Map geometry from the map package: building outlines, doors, walk paths, sports-light regions. |
| `town.js` | Camera (drag, mouse wheel / pinch zoom, arrow keys), day/night/rain textures, town/court/field lights, scoreboards, hover outlines, Town settings. |
| `town-routes.js` | Generated walking routes. Rebuild after editing paths with `node tools/build-routes.cjs` (uses `tools/hm-engine.cjs`). |
| `osu-feed.js` | ESPN Oklahoma State football feed (team 197). Same display rules as the Thunder feed. |
| `rain.js` | Animated rain overlay. |
| `assets/town/*.jpg` | Day / night / rain textures, each lights-on and lights-off. |
| `assets/interiors/*.jpg` | Gym, Restaurant, Gibbons Residence, Hardaway Household interiors. |
| `assets/osu/*.png` | Opponent logos for the football scoreboard (KSU, TTU, ASU, KU). Other opponents show their abbreviation. |

- City Hall uses the former Headquarters interior (scene id `headquarters`): sales dashboard plus a Nail Catalog hotspot on the top-left bookshelf.
- House 3 and Jones Residence show "Coming soon".
- Ralph & Alisa live in the Gibbons Residence; Madi, Blair & Nick in the Hardaway Household. They are out 7:00 AM–9:30 PM, otherwise home.
- Settings → Town: Town lights (Auto = dusk to dawn), Court lights and Field lights (Auto = on only while a game is live), Weather (Live OKC = rains when it is raining or overcast in Oklahoma City, from Open-Meteo every 10 minutes; or force Rain / Clear), Walk paths overlay. Saved per browser.
- Scoreboard cell positions are `FIELD_BOARD` / `COURT_BOARD` in `town.js`.

## OSU game on the football field

While the OSU feed says a game is live (`OSUFeed.current.state === "in"`), 3 on 3 plays on the town field, orange always on offense: the QB drops back and throws to one receiver (alternating #88 and #84), who catches it over the defender's break-up attempt and runs into the end zone, then the next play fades in going the other way (9 s per play).

- Code: the "OSU football" block in `game.js` (`GRID`, `footballState`, `drawFootball`). Preview from Settings → Preview → 🏈 OSU game (also turns the field lights on).
- Sprites: `assets/football/qb12.png` (idle, run, dropback, pass), `wr88.png` / `wr84.png` (idle, run, catch), `db23.png` / `db37.png` / `db41.png` (idle, run, defend), `football.png`, cut with `tools/make-football-sprites.py`.

- Real touchdowns: when the ESPN feed shows OSU's score go up by 6 or more during a game, a full-screen "TOUCHDOWN! GO POKES!" flashes for 4.5 s (`watchOSUScore` / `drawTouchdownFlash` in `game.js`; test with `HM_DEBUG.flashTouchdown()`).

## Thunder game on the court

While the Thunder feed says a game is live (`ThunderFeed.current.state === "in"`), three OKC players play on the town court: the ball handler dribbles up, passes to the wing, the wing passes to the shooter, who scores; then they go the other way with roles rotated (8.6 s per trip). Three Spurs-style defenders shuffle, reach for steals and contest the shot.

- Code: the "Thunder pickup game" block in `game.js` (`HOOPS`, `hoopsState`, `drawHoops`). Preview from Settings → Preview → 🏀 Thunder game (also turns the court lights on).
- Sprites: `assets/hoops/okc_*.png` (rows run, dribble, pass, shoot), `assets/hoops/opp_*.png` (rows shuffle, block, steal), `assets/hoops/ball.png`, cut with `tools/make-hoops-sprites.py`.

## Wednesday bike ride

Every Wednesday (Central time) everyone walks across the bridge to their parked bike on the south trail, arriving at different times (Annie 5:50, Hayden 5:54, Alisa & Ralph 5:58, Nick, Madi & Blair 6:02). At 6:05 PM they all ride laps of the dirt trail around the map, park at 6:45 PM and walk home. Blair rides in Madi's trailer.

- Code: the "Wednesday bike ride" block in `game.js` (`RIDERS`, `rideState`). Preview it from Settings → Jump to → 🚲 Wed bike ride (starts a few seconds before 6:05 PM, in real time).
- Sprites: `assets/bikes/ride_*.png` (riding sheets) and `assets/bikes/bike_*.png` (parked bikes), cut from the uploaded art with `tools/make-bike-sprites.py`. Madi's purple bike is a recoloured copy of the red bike (only five parked bikes were supplied).
- Trail: `tools/trace-trail.py` traces the painted dirt trail into `tools/ride-loop.json`; `node tools/build-routes.cjs` puts it in `town-routes.js` as `ride-loop`.
- Test: `node tools/bike-ride-test.cjs`.

## Files to edit

| File | Purpose |
| --- | --- |
| `index.html` | Page structure, camera selector, timeline, and styling. |
| `game.js` | Canonical game code: rendering, paths, daily routine, pets, lighting, basketball animation, scoreboard, and court-banner texture. |
| `game-data.js` | Opponent identifier, scoreboard values, score mode, period, and game clock. |
| `assets/teams/*.png` | All 30 generated pixel-art logo files. |
| `teams.json` | Roster reference, identifiers, team colors, and logo filenames. The matching `NBA_TEAMS` list is currently in `game.js`. |
| `assets/` | Editable town, rooms, characters, pets, and household-action PNGs. These normal files take priority over embedded fallbacks. |
| `assets-embedded.js` | Offline image fallbacks. Regenerate after image edits with `node tools/rebuild-assets.cjs`. |

`game.js` is now the only code file that needs to be edited for game behavior. There is no second inline copy in `index.html`.

## Opponent and scoreboard

Edit `game-data.js` and reload to set the initial game. The home team is OKC. `opponent` uses identifiers such as `SAS`, `BOS`, or `LAL` from `teams.json`; OKC is not a valid opponent.

The included default remains the demonstration game against SAS. In `scoreMode: 'simulation'`, the animated pickup game increments the score. Set `scoreMode: 'manual'` to display supplied scoreboard values without the basketball simulation overwriting them.

A future controller can update a running page through:

```js
window.HoneyMeadows.setGameData({
  opponent: 'BOS',
  scoreMode: 'manual',
  score: { home: 108, away: 104 },
  period: 'Final',
  clock: '0:00'
});
```

`window.HoneyMeadows.getGameData()` returns the current values. Partial updates are accepted. Invalid opponent identifiers return `false` without applying the update. This API does not add a team-changing control to the page.

There is no live NBA data connection in this bundle. A later adapter can obtain the actual OKC opponent and score from the chosen data source, then call this API. Do not place private service credentials in public browser code.

## Court-banner rendering

Both flags belong to the town illustration's fence. The default SAS flag uses its original painted artwork, matching the existing Thunder flag.

For another configured opponent, `prepareCourtTexture()` paints the selected logo into the same flag's cloth polygon on an offscreen copy of the town atlas. The surrounding fence, mounting posts, fabric border, fold shading, and pixel texture remain part of the court. There is no standalone rectangular HUD badge and no separate `drawTeamBanner()` overlay pass.

The cloth silhouette currently uses world coordinates around `(1041, 273)` to `(1083, 316)` in the 1152 × 768 atlas. If the town art changes, update that polygon and logo placement together. The left Thunder flag is left in its original artwork.

## Town camera and schedule

The initial camera is `viewMode = 'town'`. Changing the clock does not move the camera away from town. Interior views and the optional Follow routine view can be chosen explicitly. Escape always returns to Town.

Keep the existing routine, pets, marked path mask, and central pink-tree depth layer intact. Schedule locations are recomputed from simulation time, so reverse scrubbing should never duplicate a character in two places.

## Checks

Run `node tools/smoke-test.cjs` for the data/camera/interface regression checks; only Node's built-in modules are used.

For browser checks, run `node tools/serve.cjs`, then open `http://127.0.0.1:8765/tools/browser-check.html`. The helper serves only this folder on localhost. Stop it with Ctrl+C when finished. Normal play still works by opening `index.html` directly.

## V20 real-world Central Time clock

The default `clockMode` is `live`. `centralTimeAt()` converts the browser's current instant with `Intl.DateTimeFormat` using `America/Chicago` and `hourCycle: 'h23'`. It returns a fractional minute, Central calendar date, and CST/CDT label. The browser/device clock supplies the current instant; conversion does not depend on the device's selected local time zone. No time service or network request is needed.

`readCentralClock()` refreshes the formatted snapshot each second and preserves fractional-second accuracy between snapshots. Live mode is tied to wall time rather than accumulated frame deltas. Focus and visibility events force resynchronization after an inactive tab or suspended computer.

Moving the slider, using a time shortcut, or pausing the live clock enters `preview` mode. Preview can be paused or accelerated with the existing speed controls. The `currentTime` button calls `useCurrentCentralTime()`, which restores live mode, current time, routine, and lighting together. Preview speed is disabled while live.

For an external controller, `window.HoneyMeadows.useCurrentCentralTime()` resumes live mode and `window.HoneyMeadows.getClockState()` returns the mode, IANA zone, CST/CDT label, fractional minute, date, and running state. These are separate from the basketball scoreboard's `clock` field in `game-data.js`.

Run `node tools/clock-test.cjs` for winter/summer, both daylight-saving transitions, midnight, wall-clock drift, preview, resync, and routine regression checks. The existing smoke test and opponent/score interface are preserved.

## V21 live Thunder feed (Claude)

`thunder-feed.js` (loaded after `game.js`) pulls the real OKC game from ESPN's public site API — no key, no server — and pushes it through `window.HoneyMeadows.setGameData()` with `scoreMode: 'manual'`.

| Situation (Central Time) | Scoreboard | Banner |
| --- | --- | --- |
| Game today, not started | OKC 0 – 0, `TODAY`, tip time | Today's opponent |
| Game in progress | Live score, `Q1`–`Q4` / `HALF` / `OT`, game clock | Opponent |
| Game today, finished | Final score, `FINAL` (or `F/OT`), date | Opponent |
| No game today | Previous game's final score, `FINAL`, date | Previous opponent |

OKC is always the left score. Sources: `teams/okc/schedule` (regular season + playoffs) to choose the game, then `scoreboard?dates=YYYYMMDD` for fresh live numbers. Polling: every 20 s live, every 30 s close to tip-off, otherwise every 10 min, plus on tab focus. The last result is cached in `localStorage`, so it still shows the previous game when offline. ESPN short codes (`SA`, `NY`, `GS`, `NO`, `UTAH`, `WSH`) are mapped to the logo IDs.

Set `liveFeed: false` in `game-data.js` to return to the demo simulation. `window.ThunderFeed.current`, `.lastError`, `.lastUpdated`, and `.refresh()` help with debugging. Run `node tools/thunder-feed-test.cjs` for the decision-logic checks.

## V21 Headquarters Etsy dashboard (Claude)

Clicking Headquarters in town opens `etsy-hq.js`'s dashboard over the town (Esc or "Back to town" closes it). It shows **Total sales** (unique Receipt IDs, plus items sold), **Not completed**, **Completed**, **Total revenue** (Price × Quantity, before Etsy fees) and the 8 most recent orders. It refreshes every 5 minutes while open and keeps the last numbers in `localStorage`.

Data source: the **Etsy Sales sheet** Google Sheet that the Make.com scenario fills. Publish it (File → Share → Publish to web → Sheet1 → CSV) and paste the link into `etsySheetCsvUrl` in `game-data.js`. Columns are matched by header name, case-insensitive: `Date`, `Receipt ID`, `Item`, `Quantity`, `Price`, `Currency`, and a status column named `Status` (also accepted: `Shipped`, `Is Shipped`, `Completed`). A status of `Completed`, `Shipped`, `true` or `yes` counts as completed; anything else counts as not completed.

Make.com changes needed (as of Oct 27 the sheet has Price = the literal text `USD{Price: Amount / Price: Divisor}}` and no status):
1. **Price:** column E holds the Etsy amount in cents (2495 = $24.95); the dashboard divides whole numbers by 100. Revenue = Price × Quantity.
2. **Status:** add a `Status` header in G1 and map the receipt's shipped/status field to it.
3. **Keep status current:** a new-order trigger only writes each order once. Add a scenario that watches updated/shipped receipts, finds the row by Receipt ID (Google Sheets → Search Rows) and updates its Status.

Building hover glow now matches Polish Pines: a crisp 3-pixel gold rim around each traced outline (`buildingOutlines` in `game.js`) plus a slight brighten inside.

Opening `index.html` straight from a file blocks `fetch()` to Google's CSV link (a `file://` page has no web origin, so Google's CORS check fails — Firefox shows "NetworkError"). The dashboard therefore reads the sheet through Google's Visualization endpoint loaded as a `<script>` (JSONP) using `etsySheetId` in `game-data.js`. That requires the sheet's sharing to be **Anyone with the link → Viewer**. When the page is served over http(s), it tries the CSV link first.

Completed orders: an order counts as **completed when column G (Etsy "Shipped timestamp") has a value**, and **not completed when G is blank**. A header in G is optional; if a column is headed `Shipped timestamp`/`Shipped`, that column is used instead. A `Status` column saying Completed/Shipped also counts.

The Completed / Not completed boxes and the shipped labels are hidden for now (`etsyShowOrderStatus: false` in `game-data.js`). Set it to `true` once Make updates column G when an order ships.

Night lighting: `drawTownLighting()` darkens the town on an offscreen layer and cuts warm light pools out of it at every street lamp (`STREET_LAMPS`) and lit window (`LIT_WINDOWS`), with a slight flicker. Lamps fade in with dusk. Preview speeds: 0.25×, 0.5×, 1×, 5×.

Court floodlights: four light towers on the court corners (`COURT_LIGHTS` in `game.js`) switch on while the real Thunder game is live (`ThunderFeed.current.state === "in"`) and light the whole court at night. `HM_DEBUG.setCourtLights(true|false|null)` forces them on/off for testing (null = follow the game).

## Books house nail catalog (Claude)

Clicking Books opens `books-catalog.js`: a searchable grid of every nail set with photo, name and price; click a set for its title, description, price and a "View on Etsy" link.
- **Etsy listings** live in `catalog-data.js`, a snapshot of etsy.com/shop/honeymeadowsnailsco (16 listings, Oct 29, 2026). Photos load from Etsy's image server (needs internet). Descriptions are short summaries — use **Edit** to paste the full Etsy text. Ask Claude to refresh the snapshot when the shop changes.
- **Add nails** creates a manual set (name, title, price, original price, description, Etsy link, photo upload or photo link). Uploaded photos are shrunk to 900px JPEG.
- **Edit** works on any set; edits to Etsy sets can be undone. Manual sets can be deleted.
- Manual sets and edits are stored in this browser's IndexedDB (`honeyMeadowsCatalog`). Use **Export backup / Import backup** at the bottom to move them to another browser or computer. Esc steps back (edit → detail → grid → town).

## Headquarters password

Headquarters asks for a password before showing sales. The sales sheet links are stored in `game-data.js` only in encrypted form (`etsySecret`, AES-256-GCM with a key derived from the password by PBKDF2-SHA256, 600,000 rounds), so the public code doesn't reveal the sheet. A correct password decrypts the links in the browser; unlocking is remembered for the tab session, or on the device with "Remember me". The 🔒 Lock button forgets it. To change the password: `node tools/encrypt-sheet.cjs "<new password>" "<sheetId>" "<csvUrl>"` and paste the output as `etsySecret`.
Note: a short password can be guessed by someone determined who copies the code; a longer one is much stronger.

## Shared Books catalog (Google Sheet)

Books reads the **Honey Meadows Catalog** Google Sheet (`catalogSheetId` in `game-data.js`), so edits there show up for everyone. Columns (matched by header): `Show` (type `no` to hide a set), `Name`, `Title`, `Price`, `Original Price`, `Description`, `Photo`, `Etsy Link`, `ID`. A new row = a new set. `Photo` can be any image link or a Google Drive share link (converted automatically); Drive photos must be shared "Anyone with the link". Suggested photo folder: "Honey Meadows Catalog Photos" in Drive. The sheet must be shared **Anyone with the link → Viewer**. If the sheet can't be reached, Books shows the last copy it loaded, then `catalog-data.js`. In-game editing/backup buttons only appear when no sheet is set.

Headquarters: clicking it in town opens the Headquarters interior again. The big table in the middle (`HQ_TABLE` in `game.js`) is a hotspot labelled "Sales Dashboard"; clicking it opens the password prompt / Etsy dashboard. Closing the dashboard returns to the interior; Esc again returns to town.

Updates & caching: run `node tools/stamp-version.cjs` before every push so browsers load the new scripts instead of cached ones. GitHub Pages can still serve the old index.html for up to ~10 minutes after a push.

Header & settings: the logo (`assets/logo.png`, also the browser-tab icon `assets/favicon.png`) sits next to the title. The View menu, routine info and time controls live in a collapsible **⚙ Settings** panel (`#settingsPanel`) opened by the tab next to the title. The illustrated "Honey Meadows" sign in the town art was painted over with scenery (original is in git history).

Village sign: the date/time sign and settings gear float over the top-left of the town (`#villageSign`, filled in `refreshUI`). The Settings panel opens as an overlay over the town (inline on phones). Page entrance: `#intro` shows the shop logo, then shrinks it while a circle opens onto the town (click to skip; fades for reduced-motion users).

Admin (Settings → 🔒 Admin): unlocked with the Headquarters password (`EtsyHQ.checkPassword`; already unlocked if Headquarters is). Controls live in `admin.js`. Background color: picker or typed rgb(r, g, b) / r,g,b / #hex; saved per browser in localStorage (`honeyMeadows.admin.bg.v1`); Reset returns to #f8efed. Changing the site-wide default for everyone means editing `body{background}` in index.html.

Headquarters dashboard = Option 2 "Cottage Bulletin Board" (`headquarters-board.js/.css`), fed by `etsy-hq.js`. See INTEGRATION-HQ-BOARD.md.

Headquarters dashboard (current): `hq-art-board.js` places live text directly on the illustrated background `assets/hq-board.png` (1536×1024, unmodified). Element positions are image-pixel boxes in `BOX`/`NAV` converted to %; text sizes use container units (cqw) so everything scales with the picture. On phones the board keeps its proportions at ≥720px wide and scrolls sideways. Lock = the heart note on the wall; Refresh = the ⟳ on the small panel. Sidebar: Dashboard (stay), Orders/Analytics/Messages (Etsy pages in a new tab), Products (Books catalog), Settings (game settings). The earlier Option 2 bulletin-board files were removed (still in git history).

Interiors: a "← Back to town" button (`#backToTown`) appears top-right whenever an interior is on screen (`updateTownButton()` runs in `draw()`); it does the same as Esc.

## Research building (TikTok / Pinterest / Marketing)

Inside Research, three outlined spots open the research boards: the produce stand = **TikTok**, the shelf on the right = **Pinterest**, the two aisles = **Marketing** (`INTERIOR_HOTSPOTS.research` in `game.js`; Headquarters' sales table uses the same system). All three use one layout (`research-board.js`) with tabs to switch between them. Content lives in `research-data.js`: per section `title`, `subtitle`, `icon`, `accent` (colour), optional `blocks` (order + headings of Trending now / What's selling / Ideas to try / Sources), and the lists `trends` (name, what, inShop, source index), `selling`, `ideas`, `sources`. Ideas are checkboxes remembered per browser. Research gathered Oct 30, 2026 — ask Claude to refresh it.

## Books bookshelf (paginated)

Books shows `assets/books-shelf.png` (1536×1024, unmodified) with live overlays from `renderShelf()` in `books-catalog.js`. 8 sets per page in the 8 frames (photo in the frame, name + price on its plaque); ← Previous / Next → buttons and "Page X of Y" under the shelf (arrow keys also turn pages). Page count = filtered results ÷ 8; search filters the whole catalog and resets to page 1. Frame/button positions are image-pixel boxes in `SHELF`. Clicking a set opens its detail page; Esc returns to the shelf. Data still comes from the Honey Meadows Catalog sheet.

Books detail page: drawn on `assets/books-detail.png` (unmodified) by `renderDetail()`; overlay boxes in `DETAIL` (image pixels). The painted "View on Etsy" / "Edit in sheet" / "← All sets" buttons are made clickable with transparent links; a set with no Etsy link greys out that button. Long titles/descriptions scroll inside their fields.

Research boards now draw on illustrated backgrounds (`assets/research-tiktok.png`, `-pinterest.png`, `-marketing.png`, unmodified). Each section in `research-data.js` has `background` + `layout`; overlay maps (image-pixel boxes for the painted Back button, tabs, 8 trend frames and the 3 bottom panels) are `LAYOUTS` in `research-board.js` (`wide` fits TikTok/Pinterest, `marketing` fits Marketing). Trend frames show name, short description and "in your shop"; clicking one opens a note with the full text and source. Up to 8 trends show. Titles, subtitles and the "Researched" date are painted into the images.



Map border: purple by default (`--map-border` #7b4fa0, darker edge `--map-border-dark`). Admin has a "Map border color" control next to Background color; colour controls are entries in `COLORS` in `admin.js` (saved per browser).

## Touch screens (iPad / phones)

Everything is under `@media (pointer:coarse)` at the end of the main `<style>` in index.html, so desktop is unchanged.
- iPad landscape: the 3:2 town is sized to fit the screen (width = min(100%, screen height × 1.5)) and centred; safe-area insets respected. Dashboards (HQ, Books, Research) fill the town window exactly.
- iPad portrait: town fills the width at the top; the Settings panel opens underneath the town instead of over it.
- Phones: town fits the screen; the date sign shrinks; dashboards and the HQ password box open full-screen (upright phones scroll the illustrated boards sideways at ≥720px wide).
- Bigger tap targets, no double-tap zoom delay, no long-press callout on the town; Add-to-Home-Screen metas (full-screen web app, logo as icon).

## Older iPads (iPadOS 12 / Safari 12)

- All scripts are converted for Safari 12 by `tools/build-compat.cjs` (esbuild, target safari12): it rewrites `?.` / `??` etc. in place, including inline `<script>` blocks. **Run it before every push** (after `node tools/stamp-version.cjs`): `ESBUILD=/path/to/esbuild node tools/build-compat.cjs`.
- `compat.js` (loaded first) adds `replaceChildren`, `Object.fromEntries`, `Array.flat/flatMap`, and — where `cqw` / `aspect-ratio` aren't supported — sets `--cq` (1% of board width in px) and the height on the illustrated boards. CSS sizes use `calc(N * var(--cq,1cqw))`.
- CSS avoids `inset`, individual `translate/scale/rotate`, and pairs every `dvh` with a `vh` fallback. The clock uses `hour12:false` (not `hourCycle`).
- Known on Safari 12: flexbox `gap` is ignored (some rows sit closer together) and the intro's circle reveal doesn't animate (the town appears when the logo finishes).

Thunder scoreboard rules (Nov 2026, `chooseGame` in thunder-feed.js, Central days): live game → live; game today not started → 0–0 "TODAY" + tip time; game finished today or yesterday → final (back-to-back: a game today wins); otherwise next game → 0–0, date like "NOV 7" + tip time; no upcoming game → last final.
Court: hovering the court/scoreboard in town draws a yellow box with a "Thunder stats" tag; clicking opens ESPN's Thunder stats page in a new tab (`COURT_BOX`, `THUNDER_STATS_URL` in game.js).

Name tags: hovering a character shows a name tag (Hayden, Annie, Riley, Theo; "Hayden & Annie" for the farmhouse meal/couch/sleep scenes). Hit boxes in `characterBoxes()` in game.js.

Townsfolk: villagers roam the town 7:00 AM–9:30 PM (`TOWNSFOLK` in game.js; sprites `assets/npc_*.png`, 4×4 frames of 64×96, rows down/left/right/up). Each loops through `spots` (shop door ids or markup [x,y] points) along the marked paths, pausing 5 s at each. `with: "<id>"` makes someone walk beside another (Blair and Nick beside Madi, Ralph beside Alisa; `side: "left"` puts a companion on the other side; Alisa = sunglasses sprite npc_sun, Madi = npc_long, Ralph = npc_blue, Nick = npc_beard); `scale` sizes children. Names appear on hover.

Settings → 👥 Characters (`characters.js`): shows each sprite (front frame, trimmed) in three groups: the family; Ralph & Alisa; Madi, Blair & Nick. Edit `GROUPS` to add people.
