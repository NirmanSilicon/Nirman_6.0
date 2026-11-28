# Changes after the first evaluation

From about 21:00 on 28 November to 3:00 on 29 November, after the first round of judging.
Everything below is on the `golden_hour_squad` branch unless marked as pending or discussed.

## Why this file exists

The first evaluation saw a working three-screen demo: a simulator, a hospital receiving screen and a phone app. What it did not have was an answer to three questions the judges actually asked, and no measured data of any kind. This list records what was built in response, and what was discussed but not built.

## The three judge questions, and what answers them now

| Question asked | What answers it | Where to see it |
|---|---|---|
| How does the alert leave the device if data is down? | A full SMS fallback scenario, with the plain-text message shown as it is composed | Marker 6 on `/sim`, then `sms_only` |
| Where do the numbers on the slide come from, and how noisy are they? | Three real accelerometer recordings, plotted against the detection thresholds | `docs/ashvin_accelerometer_evidence.png` and `docs/traces/` |
| What if the driver is conscious and fine? | The driver confirmation screen. Discussed and specified, not built | `/driver`, pending |

## What was added, in order

### 1. SMS fallback path

Three new event types, `sms_fallback_started`, `sms_sent` and `sms_received`, a sixth scenario in `tools/scenarios.py` with three modes, and a UI that shows the amber "data link down" note, the composed SMS as a monospace bubble with its character count, and the green "delivered via SMS gateway" confirmation.

Why it matters: the system no longer assumes a working data link. A judge asking the hardest question, what happens with no network, now gets a demonstration instead of an admission.

Files: `SPEC.md`, `tools/scenarios.py`, `web/sim/*`, `web/dossier/app.js`, `web/hospital/app.js`.

### 2. Reset for clean rounds

`POST /reset` clears the event table, resets the sequence, and broadcasts a `system_reset` event that every page handles. There is a "Reset log" button in the simulator panel.

Why it matters: each judging round starts from a blank state with one click, instead of stopping a server and deleting a database in front of the judges. It removes the most likely failure in a live round.

Files: `server/main.py`, `SPEC.md`, `web/sim/*`, `web/app.js`, `web/hospital/app.js`, `web/dossier/app.js`, `web/family/app.js`.

### 3. The fallback is reachable from the interface

A sixth marker, styled amber, at a highway point outside the city, plus the five original markers spread to real locations across Bhubaneswar with the map recentred.

Why it matters: a feature nobody can click does not exist in a demo. The amber marker also makes the point visually, because it sits off the city where the no-data case actually happens.

Files: `web/sim/sim.js`, `web/sim/sim.css`.

### 4. Measured acceleration data

Three ten-second recordings on an Android phone: still on a table, a heavy book dropped beside it, and the phone shaken hard. Plotted against the 3.8 g and 18.4 g thresholds, with the raw files committed beside the plot and a short note explaining what each file is.

Findings: the still trace has a standard deviation of 0.003 g and every sample inside 0.02 g. A table impact reaches 4.95 g on its own, which crosses the pothole threshold, and that is the measured reason detection requires a second condition, speed falling to zero. A violent shake peaks at 7.40 g, well under the 18.4 g crash threshold.

Why it matters: this is the only measured evidence in the submission. It turns the two-condition rule from an assertion into a conclusion drawn from data, and it answers the data-quality question with numbers rather than adjectives.

Files: `docs/ashvin_accelerometer_evidence.png`, `docs/traces/*.xlsx`, `docs/README.md`.

### 5. Hardware artefacts in the repository

The schematic, the PCB top view, the angled 3D render, the itemised bill of materials in spreadsheet and PDF, the 24-net netlist, and the parametric enclosure as STEP, STL and the generating script.

Why it matters: "we designed a board" is a claim until the board is in the repository. A judge can open the schematic, read the netlist and see the 3D render without asking us anything.

Files: `hardware/*`.

### 6. Repository hygiene

`.gitignore` for the virtual environment, bytecode and the event database. The database untracked. Two stray files created by mistyped commands removed. The skeleton readme replaced with a project readme covering the problem, the layout, the run commands and an explicit list of what is not built.

Why it matters: the organisers read the repository, not the laptop. A clean tree and a readme that states the limits honestly are read before any code is.

Files: `.gitignore`, `README.md`, and this file.

### 7. Deck

A measured-data panel added to the technical slide: the three traces plotted against the thresholds, with a one-line caption. The explanatory paragraph was removed from the slide, because that is spoken rather than read.

Why it matters: the technical slide previously said thresholds were "under validation". It now shows the validation.

### 8. Simulator interface rebuilt

The simulator page was restyled to a designed layout: a white top bar with the Ashvin mark, tabs and the two primary actions, a light grey page, a rounded map card and a rounded panel card, radio-style mode rows with per-mode icons, Start and alert pills, three HUD chips over the 3D view, and a colour-coded event log where the type name is red for an impact, amber for the SMS and fallback lines, green for confirmed and dispatched, grey for the rest.

Why it matters: the first round was judged on a page that looked like a prototype. The panel and the map now read as one product, and the HUD makes the impact legible from across a room.

Files: `web/sim/index.html`, `web/sim/sim.css`, small edits in `web/sim/sim.js` and `web/sim/scene.js`.

### 9. Hospital record screen rebuilt

The record screen was rebuilt to a designed layout: a white header with the case number, the record counter and one live pill, then six cards for victim, vehicle, incident summary with a map, medical information with an injury figure carrying no invented numbers, emergency contact and the incident timeline. Six patient records rotate one per incident, and a reset returns to the first.

Why it matters: the hospital is the receiving end of the whole system, and it was the weakest screen. It now shows a plausible record with a timeline that fills from the same events, which is the proof that the incident reached a hospital rather than a database.

Files: `web/dossier/index.html`, `web/dossier/style.css`, `web/dossier/app.js`.

### 10. Phone app rebuilt as a four-tab application

The family app became a single page with four views, Map, Report, Activity and Profile, plus a full-screen Settings overlay, a fixed tab bar, working Notifications and Crash Detection toggles that persist across reloads, and an Activity timeline that fills from live events with a running incident count. Turning notifications off suppresses the alert sound while the banner still appears.

Why it matters: the contact's phone is the screen a family member actually holds. It now behaves like an application rather than one static card, and the activity log gives the same event stream a second, human-readable view.

Files: `web/family/index.html`, `web/family/style.css`, `web/family/app.js`.

## Discussed and specified, not yet built

| Item | What it does | Why it is worth doing | Status |
|---|---|---|---|
| Driver confirmation screen | A page at `/driver` asking the driver whether they are hurt, with a five-tap "I'm fine" gesture, an "I need help" button and a countdown ring, posting `alert_confirmed` with level low, high or no_response | It closes the loop on the five-second call, and the tap gesture works for a driver who cannot aim at a button | Design received, prompt written, not built |
| Deck corrections | Theme and PS category on the title slide, problem and solution split into two slides, page numbers to 0X / 07, cost changed to 2,410 from the itemised BOM, a surname for every member | The template asks for the fields, and the cost on the slide currently disagrees with the spreadsheet | In progress |
| Shared stylesheet | One set of tokens for font, green, corner radius and shadow across all five pages | The five screens still differ slightly in spacing and colour | Not started |
| Landing page at the root | A page at `/` listing the five screens with one line each | A judge who opens the base URL is currently dropped into a raw event log | Not started |
| Road and horizon in the 3D scene | A road plane with lane markings and a horizon line under the car | The car currently drives on an empty background, which is the first thing that looks unfinished in the scene | Not started |
| One-page judge handout | A4 with the system diagram, the three numbers, the honest limits and a QR to the repository | Judges collect paper, and a team that leaves a document behind is remembered after the room empties | Not started |

## What has not changed

Nothing has been tested in a moving vehicle. Detection rates and alert latency are still unmeasured. Handover to 112/108 is still proposed rather than integrated. The no-response rule is still open in the team. Readiness remains TRL 2. The patient records and the activity entries are demonstration data, and the acceleration traces come from hand and table tests, not from a road test.
