# laptop/blueprint: the Mind view, the live blueprint (PRD 5.11)

## What it does, in plain words

A single web page, served by `laptop/link/feed_server.py` at http://127.0.0.1:8000/, that draws the
phone's live feed. Every element comes from a feed message; with no data it says so. The look is an
architect's plan: paper, fine lines, colour only where it means something.

- **World picture** (Phase 2): the table from above in metres from the user's chest, exactly as the
  phone computed it: reach arcs (0.50 and 0.75 m), clock rays 9 to 3, the camera's footprint on the
  table, each world-map object at its position (green = would say it, amber = not said, faded = out
  of view and remembered, red dotted = in view but not seen), its relation ("behind the laptop"),
  people by bearing on an outer ring, and fingertips on the table plane. Below: the camera's tilt,
  its turn from the user's forward, and the table height with its source (rulers or default).
- **Eyes** (System 1): the camera view with the detector's raw guesses (faint, mistakes included),
  confirmed tracks and hand skeletons.
- **World map**: one row per object or person: clock and reach, state, said or not and why.
- **Belief map**: empty until Phase 3. **Last brief**, **timeline**, and the phone's rates.

## Limits

- The belief map panel is empty until Phase 3 builds it; System 2 reasons arrive in Phase 4.
- The page redraws once per feed message: perception (5–8/s) plus hands (about 10/s while a hand is
  in view). With no hand in view it is below the PRD's 10 refreshes/s; not yet measured in a real
  browser (headless Edge does not run at real speed).
- Positions depend on the camera's height above the table; until a ruler (bottle, mug, apple,
  orange) is seen, the panel says the height is the 0.40 m default.

## Test

Open the page with the server running and the phone connected; move an object and watch it move.
Checked with headless Edge on 28 Oct (screenshot in `tools/results/phase1_blueprint_v0_20261028.png`)
and on 29 Oct against the live Vivo feed (`tools/results/phase2_mindview_20261029.png`).

## Mind telemetry (`/telemetry`, D48)

Statistics of Saarthi's mind and the user's behaviour, live or from a recording (`?recording=<file>`,
labelled RECORDED; `&card=1` opens the session card). `telemetry_core.js` counts and times feed
messages only; `telemetry.js` draws. Terminal version: `node tools/telemetry_card.js <recording>`.
