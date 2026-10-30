# Honey Meadows V21 — Live Central Time + Live Thunder Scoreboard

V21: the court scoreboard and banner now follow the real OKC Thunder game via ESPN (see `HANDOFF.md`, "V21 live Thunder feed"). Needs an internet connection for live scores; otherwise it shows the last game it saw.

Extract the complete ZIP and open `Honey_Meadows_V20/index.html` in Chrome, Edge, or Firefox. Keep the JavaScript files and `assets` folder together. No installation, build step, account, or internet connection is required to play.

## Live clock

V20 starts at the **actual current time in Central Time**, using the `America/Chicago` time zone. It stays synchronized with the real clock rather than running an accelerated day. Central Standard Time and Central Daylight Time switch automatically.

The town remains the main view. The couple's daily routine, pets, and day/night lighting all follow this clock.

## Slider and testing

- The bottom slider and activity shortcuts remain available. Moving the slider enters **Preview time** and pauses at the selected minute.
- **Current Central Time** immediately jumps back to the real current time and resumes live synchronization.
- **Pause clock** freezes the current live time as a preview. **Play preview** can then advance that preview.
- The speed selector is labeled **Preview speed** and is disabled in live mode. At preview 1×, one game minute passes per real second; 5× and 30× are also available for testing. Preview speed never accelerates the live clock.
- A visible badge identifies **Live Central Time** or **Preview time**. Live readouts include CST or CDT.
- Returning to the browser tab automatically catches up to the real clock when in live mode. Preview mode keeps the time you chose.

The View menu still lets you inspect a building or optionally follow the routine. Changing the time does not force the camera away from town. Escape returns to Town.

## Daily routine

| Central Time | Activity |
| --- | --- |
| 8:00 AM–10:00 AM | Breakfast together in the farmhouse. |
| 10:01 AM–10:05 AM | She walks to Nails; he walks to Research. |
| 10:06 AM–6:00 PM | Work inside their respective buildings. |
| 6:01 PM–6:05 PM | Walk home. |
| 6:06 PM–8:00 PM | Dinner together, with the same meal poses as breakfast. |
| 8:01 PM–10:00 PM | Snuggle on the couch, with the dog resting nearby. |
| 10:01 PM–7:59 AM | Sleep together. |

The white goldendoodle walks outdoors from 10 AM until 6 PM and stays home otherwise. The brown cat remains inside the farmhouse. Marked paths, pink-tree layering, household poses, and the six basketball players are preserved.

## Claude handoff

- `game.js`: canonical editable game and clock code.
- `game-data.js`: opponent and basketball scoreboard settings.
- `HANDOFF.md`: project structure, time behavior, and the future opponent/score API.
- `assets/teams/`: all 30 generated logo PNGs; there are no team-changing controls in the page.
- `assets-embedded.js`: image fallbacks. Normal asset files take priority.
- `tools/smoke-test.cjs` and `tools/clock-test.cjs`: regression and clock checks using Node's built-in modules.
- `tools/browser-check.html`: interactive browser verification, served using `node tools/serve.cjs`.

The court banners remain integrated into the fence artwork. The basketball scoreboard's game clock is separate from the town's real-world time-of-day clock. The existing data/API boundary remains ready for a future opponent/score integration; no live NBA feed is connected yet.
