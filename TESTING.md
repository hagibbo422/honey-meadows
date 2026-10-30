# V20 verification

Verified in Chromium and with deterministic clock tests using Node's built-in modules.

## Real clock

- Startup uses the current Central date and time, with Town as the initial camera.
- Live time follows elapsed wall time, not animation-frame duration or the preview-speed setting.
- Winter conversion uses CST; summer conversion uses CDT.
- Tested the 2026 spring transition from 1:59:59 CST to 3:00 CDT and fall transition from 1:59:59 CDT to 1:00 CST.
- Tested Central midnight and the year boundary.
- Focus and visibility changes immediately resynchronize live mode, including after a long gap.

## Controls and routine

- The actual browser slider input enters paused preview mode and updates the routine.
- The Current Central Time button restores the real time and resumes live mode.
- Pause clock enters preview; Play preview and accelerated preview speeds remain available.
- Preview speed is disabled in live mode and cannot accelerate the real clock.
- Preview mode survives tab focus changes without jumping unexpectedly.
- Town remains the main camera throughout all routine periods.
- Daily routine, pets, marked-path footprints, and the future manual-score interface still pass regression checks.

## Browser and package

- Live readout matches `America/Chicago` conversion of the real browser clock.
- Live/preview badges and CST/CDT labels display correctly.
- All logos remain included without team-changing controls.
- Game images and integrated court texture load correctly.
- ZIP integrity, entry-point scripts, clock tests, and handoff documents verified after packaging.
