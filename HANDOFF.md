# Project handoff

This is Honey Meadows V20, updated to open on the town and keep the team-selection controls out of the player interface. It runs as a local browser project with no package installation or build step.

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
