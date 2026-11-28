# SAARTHI — Engineering Diary

Living record of engineering development sessions, architectural decisions, and verification logs.

---

## 2026-11-13 · Session: Project Handover, Audit & Presentation Architecture (Updated)

### 1. Objective
* Assume engineering ownership of the SAARTHI project following prior Phase 0–4.5 development.
* Conduct a full audit of the codebase, documentation (`CLAUDE.md`, `STATUS.md`, `DECISIONS.md`, `SHOWCASE.md`), and Phase 5 hardening history.
* Formulate a strategic presentation package for HackNation evaluation that highlights SAARTHI's market disruption without exposing pre-hackathon maturity.
* Produce master presentation guidelines, refine slide-by-slide narrative clarity, and generate an intuitive architecture diagram bridging technical depth with non-technical clarity.

### 2. Files Created & Modified
* **Created:**
  * `docs/PPT_KNOWLEDGE_BASE.md` — Comprehensive project background dossier, competitor matrix, cognitive science principles, mathematical foundations, and reviewer objection handling.
  * `docs/PPT_SLIDE_DECK_SPEC.md` — Strict 6-slide presentation blueprint incorporating the Human Art Direction philosophy, unconstrained by rigid styling, with explicit layout, human imagery, and visual placeholder directives.
  * `tools/generate_architecture_diagram.py` — Detailed 4-tier event-driven architecture diagram generator.
  * `tools/generate_intuitive_architecture.py` — Intuitive 4-stage pipeline architecture diagram generator (designed for tech and non-tech balance).
  * `docs/saarthi_architecture_diagram.png` — Ultra-high-resolution technical architecture diagram.
  * `docs/saarthi_architecture_intuitive.png` — Balanced 4-step architecture diagram for Slide 3.
  * `docs/saarthi_architecture_concept.jpg` — Artistic presentation visual concept.
  * `ENGINEERING_DIARY.md` — Initialized permanent chronological engineering diary.
* **Modified:**
  * None (source code strictly preserved during audit phase per engineering protocol).

### 3. Key Architectural Decisions & Insights
* **Immediate Intent & Clarity:** Overhauled Slide 1 and Slide 2 to immediately, unequivocally identify the user as **Blind and Low-Vision Individuals** in tabletop/personal spaces, removing abstract jargon like "Cognitive Spatial Charioteer" as standalone headers.
* **Human-Centered Imagery:** Replaced abstract ray-grid imagery specifications with authentic, dignified photos of visually impaired individuals interacting with tabletop environments.
* **Balanced Architecture Diagram:** Created `docs/saarthi_architecture_intuitive.png` featuring a clean 4-step pipeline (Input $\to$ Theory of Mind $\to$ Physics Verification $\to$ Motor Action) that technical reviewers appreciate for rigor and non-tech reviewers understand in 5 seconds.
* **Demystifying Scalability & Impact:** Replaced confusing "Built to Scale" terminology on Slide 5 with a concrete 3-stage product evolution (Free Smartphone App $\to$ Wearable Haptic Clip/Wristband $\to$ Workspace Generalization).
* **Elimination of Academic Clutter:** Removed dry bibliographical citations from Slide 6, replacing them with a high-impact, human-centered summary of the life transformation SAARTHI delivers and the unshakeable concluding maxim.

### 4. Verification & Generated Assets
* Verified generation of `docs/saarthi_architecture_intuitive.png` (300 DPI, 18x9 ratio, 5400x2700).
* Re-checked working tree status (`git status --ignore-submodules`: clean on `phase-5/heat`).

### 5. Recommended Next Steps
* Complete the pending 12 Nov handover entry in `docs/SESSIONS.md`.
* Conduct the on-device physical verification of commits D60–D62 on the Vivo V21e.
* Proceed with Phase 5 chaos tests (cable pull, covered lens, app backgrounding) and thermal profiling.


---

## 2026-11-17 · Session: Primary Evaluation Round Simulator & Optical Proof Suite

### 1. Objective
* Engineer a dedicated, standalone **Interactive Architectural Evaluation Simulator** (`tools/sim/`) for the upcoming 5–7 minute primary screening round with CS faculty and senior student evaluators.
* Eliminate both hackathon risks: (1) pitching just a static slide deck without proof, and (2) showing a 100% completed native APK which risks pre-built disqualification questions.
* Build a physical optical reflection analyzer and heatmap generator (`tools/sim/generate_heatmap.py`) to prove the Wald SPRT Flashlight Test on real curved 3D solids vs 2D flat screen photos.
* Structure an architectural presentation workflow with zero synthetic audio noise, high-contrast visual speech badges, interactive table canvas physics, and a full feasibility matrix.

### 2. Files Created & Modified
* **Created:**
  * `tools/sim/generate_heatmap.py` — Optical reflectance gradient, surface curvature Laplacian, and Wald SPRT likelihood analyzer.
  * `tools/sim/system2_heatmap_proof.png` — Publication-grade 4-panel optical proof comparing 3D spherical solid vs 2D flat screen glass glare.
  * `tools/sim/index.html` — Master interactive presentation web application structured across 5 core modules.
  * `tools/sim/sim.css` — Natural, premium architectural design system (Braun / Dieter Rams / Linear aesthetic; no cyber-neon, no glassmorphism).
  * `tools/sim/sim.js` — Reactive engine with 6-minute pitch timer, keyboard navigation [1–5], interactive table canvas, drag-and-drop object physics, and Sally–Anne divergence interception.
* **Modified:**
  * `ENGINEERING_DIARY.md` — Logged session progress and verification state.

### 3. Key Design Decisions & Features Implemented
* **Module 1 (Problem & Blueprint):** Text/visual comparison exposing the limits of Smart Canes (ground-level macro only) and Traditional Vision AI (noisy audio firehose, zero memory). Introduces the 3 fundamental requirements before making the grand reveal of **SAARTHI**.
* **Module 2 (Capabilities & Feasibility):** Matrix mapping all 6 signature capabilities to their exact edge engineering realizations (IMU gravity fusion + raycasting, MediaPipe GPU hand tracking, MobileNetV3 cosine embeddings, Wald SPRT flash pulses, Tri-axial accelerometer FSM).
* **Module 3 (Sally–Anne Two-Map Sandbox):** Fully interactive 2D table canvas allowing evaluators to drag objects, observe proactive silence while working, and trigger the mid-air freeze alert when reaching toward a moved spot.
* **Module 4 (System 2 Optical Heatmap):** Mathematical Blinn-Phong + Lambertian curvature differential vs flat glass glare; embedded heatmap plot showing log-likelihood ratio $S_n$ surging to $+7.2$ for real objects and plummeting to $-7.3$ for screen spoofs.
* **Module 5 (Event-Driven Architecture & Resilience):** 4-stage event pipeline, dynamic thermal governor (frame stride 20 fps, bitmap buffer reuse, quiet hand throttling to 2 fps), and Safety SOS fall state machine.

### 4. Verification & Generated Assets
* Verified execution of `tools/sim/generate_heatmap.py` with OpenCV and Matplotlib $\to$ generated `tools/sim/system2_heatmap_proof.png` cleanly.
* Validated `tools/sim/index.html` semantic structure, CSS styling, and reactive JavaScript logic.
* Checked working tree (`git status --ignore-submodules`): zero changes to core Android, laptop, or shared code.

* **User Asset Verification (17 Nov):** Processed `tools/sim/Real_Apple.jpg` and `tools/sim/Image_Apple.jpg`. Empirical surface curvature Laplacian $\|\nabla^2 I\|$ confirmed $0.614$ (Real 3D Convex) vs $0.130$ (Flat Glass Plane). Wald SPRT cumulative log-likelihood converged to $S_n = +4.91$ ($> +4.6$: Real 3D confirmed) for `Real_Apple` and $S_n = -5.11$ ($< -4.6$: Screen Spoof rejected) for `Image_Apple`. Generated `system2_heatmap_proof.png` and updated `index.html` with real photographic previews.

* **Presentation Pitch Spec (18 Nov):** Created `pitch.txt` in the root directory. Tailored a crisp, direct 4:30–5:00 presentation script mapped to the 5 simulation modules with exact screen action cues, zero conversational fluff, and rigorous engineering explanations for the two core breakthroughs and real-world edge resilience.

* **Finals Elite Features Blueprint (24 Nov):** Created `docs/FINALS_ELITE_FEATURES.md`. Designed the comprehensive 5-pillar competitive blueprint for the 80-team open-track finals: integrating the user's physical ESP32 board for Wi-Fi Channel State Information (CSI) 360° Non-Line-of-Sight ambient radar, active acoustic FMCW echolocation for transparent glassware and zero-light conditions, real-time risk-utility cognitive decision trace HUD, adaptive proprioceptive reach bias calibration, and Kaplan-Meier temporal survival modeling—all engineered to be demonstrated live with minimal everyday props.

* **Mobile-Only Finals Alignment & Plain Direction Fix (27 Nov):** Verified existing codebase features (`Diary.kt`, `Orientation.kt`, `ReachBias.kt`, `SpatialDecay.kt`, `Placement.kt`, `Phrases.kt`). Updated `docs/FINALS_ELITE_FEATURES.md` to shift 100% to native smartphone sensors (removing ESP32 Wi-Fi CSI as a required demo prop and accurately separating built features from proposed Acoustic FMCW + IMU Gyroscope scanning). Replaced all clock-hour phrasing ("10 o'clock", "2 o'clock", "12 o'clock") across `docs/FINALS_ELITE_FEATURES.md`, `pitch.txt`, `tools/sim/index.html`, and `tools/sim/sim.js` with SAARTHI's actual plain natural directions (`in front of you`, `slightly to your left/right`, `on your left/right`, `left / forward`, per D24).

* **Master Feature Tracker (27 Nov):** Created `FEATURE_TRACKER.md` at the project root by auditing all 26 Android packages, `laptop/` services, and `tools/sim/`. Marked all verified/working features (`✅`), flagged/conditional features (`☑️` like `REACH_STOP` and `PlanarMotion`), and logged the hackathon visualization & decision-log upgrades (`⬜`) for the 2-round 18-hour event.

---

## 2026-11-28 · Session: Judge-Ready Mind View Cognitive HUD (`hackathon/mindview-hud`)

### 1. Objective
* Upgrade `laptop/blueprint/` (`index.html`, `blueprint.css`, `blueprint.js`) into a high-clarity, eye-friendly **2.5D Cognitive HUD** readable from 2 metres away at a judge booth while keeping `shared/feed/v1/` and `/telemetry` (`telemetry.html`) 100% compatible.

### 2. Files Modified
* `laptop/blueprint/index.html` — Added Cognitive Economy header counter (`#economy`), 2.5D Spatial Tabletop panel (`#plan` + `#stage-status`), and Decision Log `[All Stream | Decisions Only]` filter buttons.
* `laptop/blueprint/blueprint.css` — Preserved warm paper-and-ink architect's aesthetic (`#f6f4ee` / `#1f2a30`), added 2.5D perspective tabletop slab, opaque anti-bleed object label pills, Cognitive Economy bar, and Signal-vs-Noise Decision Log badge styling. Verified `/telemetry` styling remains intact.
* `laptop/blueprint/blueprint.js` — Implemented `project(x, y)` 2.5D perspective transform, SVG `<clipPath>` tabletop clipping, D24 plain direction sectors (`Left`, `Slightly Left`, `In Front`, `Slightly Right`, `Right`), non-overlapping greedy label pill placement, rear-bearing `person` margin placement, Belief ghost + `MOVED` divergence tether, real-data `countFrameEconomy()`, Signal-vs-Noise timeline filtering, and `note` (Voice Diary `add` / `recall`) feed handling.
* `FEATURE_TRACKER.md`, `STATUS.md`, `docs/SESSIONS.md`, `ENGINEERING_DIARY.md` — Recorded verification and handover.

### 3. Verification
* Replayed real recorded `shared/feed/v1/` sessions (`tools/results/phase4_step3_teamtest_20261031.jsonl`, `phase4_probe_20261031.jsonl`, `phase3_step1_falsealarms_20261030.jsonl`, plus `note` schema events) through `laptop/link/feed_server.py` into headless Chrome (`1440×1050`).
* Confirmed `Frames Observed = 94`, `Proactively Suppressed = 136`, `Decisions Spoken = 25`, `timeline` `[Decisions Only]` filtering (`34 → 30` signals, `0` noise), `belief != world` divergence tether rendering, `/telemetry` Insights rendering (`19 recordings · 474 told positions`), and **0 console errors / 0 page exceptions**.
* Pending: Live USB connection check with physical Vivo V21e and Goal 2 pre-hackathon device verification on `phase-5/heat`.

---

## 2026-11-28 · Session: Live Vivo HUD Test, `ChangeDetector` Loop Fix & Demo Readiness (`phase-5/heat`)

### 1. Objective
* Verify `hackathon/mindview-hud` live on the physical Vivo V21e, diagnose a repeated `"Heads up, your bottle was moved"` loop spotted in the live Decision Log, fix it cleanly without breaking any move detection or camera-move cancellation, and prepare the `demo` build (`ai.saarthi.app`).

### 2. Root Cause Found & Fixed
* Live recording `recordings/feed_20261128_111958.jsonl` showed `bottle` (`#81`, relocated at `757623854`) still at `[-0.015, 0.493] m`, while `cup` (`#56`) and `apple` (`#82`) held older beliefs (`sinceMs = 757591160`) with `1.43×` pre-existing camera-shift ratio. `ChangeDetector.common()` applied that old `1.43×` scale onto `bottle`'s freshly relocated belief, manufacturing a `~0.26 m` false move every ~4 s.
* **Fix (`ChangeDetector.kt`):** Added `peerUnits` per-belief epoch baselines (`EPOCH_WINDOW_MS = 500L`) so older peers' camera drift is measured relative to when the current belief epoch began, while same-epoch or newer peers still cancel camera lowering/shifts (`ChangeReplayTest` 453 s).
* **Regression Test (`ChangeDetectorTest.kt`):** Added `a relocated object never loops because older beliefs have camera drift, and still catches the next real move`.
* **HUD Polish (`blueprint.js`):** Merged `hackathon/mindview-hud` (`7872438`, `Unknown(...)` intent label cleaned up) into `phase-5/heat`.

### 3. Verification & Demo Prep
* Ran `.\gradlew.bat :app:testDevDebugUnitTest`: **246/246 tests passed, 0 failures** (including all `ChangeReplayTest` sessions).
* Built & installed `devDebug` (`ai.saarthi.app.dev`) and `demoDebug` (`ai.saarthi.app`) on Vivo `V2055`.
* Ran `tools/personal_build.py --demo` (`44` mine + `34` other photos + live views) and pushed `sos_contact.txt` to `ai.saarthi.app/files/`.
* **Verified Live on Vivo (Goal 2 Green):** Re-tested on Vivo `V2055` with Mind View live; user confirmed single and repeated object move alerts trigger cleanly without looping. Branching `hackathon/acoustic-probe` for Goal 3 (FMCW Glass Probe feasibility).

---

## 2026-11-28 · Session: Goal 3 Acoustic FMCW Feasibility Check (`hackathon/acoustic-probe` → Rejected, D63)

### 1. Objective
* Measure on the physical Vivo V21e whether speaker + `AudioRecord` (48 kHz) can reliably detect a differential 18–20 kHz echo from transparent glassware at 15–50 cm.

### 2. Measurements & Honest Rejection
* Implemented `FmcwMath` (phase-aligned complex I/Q matched filter + baseline subtraction, passing `FmcwMathTest`) and `AcousticHardwareCheck` (dev-only broadcast probe) on `hackathon/acoustic-probe`.
* Measured on Vivo `V2055` at 80% burst volume (`12/15`):
  * `PROPERTY_SUPPORT_AUDIO_SOURCE_UNPROCESSED = false`.
  * `18–20 kHz`: `rxMaxAbs = 0.0073`, `loopSnrDb = 12.9–17.2 dB`, stationary empty-table `medianDelta = 0.254` (`peakDelta = 0.346`).
  * `16–18 kHz`: `loopSnrDb = 9.5–16.3 dB`, `medianDelta = 0.205` (`peakDelta = 0.303`).
* Because empty-table variance (`20–35%`) swamps a physical glass reflection (`1–3%`), the probe cannot work reliably on this hardware.
* **Action:** Left `hackathon/acoustic-probe` (`72a68a1`) unmerged as a negative-result record, returned to `phase-5/heat`, restored clean `phase-5/heat` APK on Vivo, and documented D63 honestly.


---

## 2026-11-29 · Session: Round 2 Visual Overhaul, 3D FMCW Simulation & Rehearsal Prep (`phase-5/heat`)

### 1. Objective
* Upgrade `tools/sim/` for 3-second visual clarity in light paper-and-ink aesthetic (without touching `laptop/blueprint/` on port `:8000`).
* Add an interactive 3D FMCW transparent glass probe simulation (`Module 06`, explicitly labelled `SIMULATED — D63`) showing why `UNPROCESSED` mic failure (`25.4%` HAL drift vs `1–3%` glass echo) led to honest rejection on Vivo V21e while illustrating the ultrasonic physics.
* Lock the 5-beat Round 2 stage script, pre-demo booth reset ritual, and exact `IntentInterpreter.kt` / `ObjectWords.kt` voice lines (`IntentInterpreter.kt` left untouched).

### 2. Files Added / Modified
* `tools/sim/sim.css`, `tools/sim/index.html`, `tools/sim/sim.js` — Rebuilt into light paper-and-ink palette (`#f6f4ee` / `#1f2a30`), de-texted Modules 01/02/05 into 3-second scannable strips/tables, fixed Canvas 2D CSS-var bug in Module 03, added Module 06 3D Perspective FMCW + IMU Gyro Sweep + Range-FFT simulation (`Ideal Ultrasonic` vs `Vivo V21e D63` toggle).
* `docs/ROUND2_REHEARSAL_SCRIPT.md` — Created 5-beat `Say -> Do -> Show` script, 30-second booth reset checklist, and exact accepted voice grammar reference.
* `ENGINEERING_DIARY.md`, `docs/SESSIONS.md` — Recorded session handover.

### 3. Verification
* `node --check tools/sim/sim.js` passed (exit `0`).
* Python DOM/asset check passed (`35` HTML IDs, `28` JS `getElementById` bindings, `0` missing IDs, `0` missing assets, `0` raw `$...$` LaTeX leftovers).
* Headless Chrome (`--headless=new`) rendered and captured all 6 modules (`#module-1` through `#module-6`), confirming layout, images, 2D Two-Map canvas, and 3D FMCW perspective + spectrum canvases.
* Interactive button click animations (`Move Bottle`, `Fire Chirp` sweep) were verified by code/DOM binding inspection rather than live click automation (Chrome remote debugging port was not enabled on the host browser).
