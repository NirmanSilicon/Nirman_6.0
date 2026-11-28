# Status

What is verified and what is not, updated every session. "Verified" names how.

## Phase 5 · Hardening (in progress; branch `phase-5/heat` on top of `phase-5/false-alarms`)

| Step | State | Verified how |
| --- | --- | --- |
| 1. Baseline heat run, tools (`tools/heat_log.py`, `tools/heat_report.py`) | Done (11 of 25 min) | Vivo, team-driven, 1 Nov: CPU 48 → 55 °C, skin 39 → 46 °C, cap 2203 → 1650 MHz, detector ~5 runs/s; per-thread split (D59) |
| False alarms (D58, other session) | Built | Replays 42 → 2 alerts; **team's live test pending** before merging into `phase-5/hardening` |
| 3. Less work: camera stride + reused images, quiet hand rate, heat tier from real signals (D59) | Built | 242 unit tests; dev and demo build. **Not on the Vivo yet** (phone away, 3 Nov) |
| 4. Speaking rules at a warm phone's rate (D59) | Done (replays) | D58 replays thinned to 3.5 and 3 runs/s: one false pair found and fixed (own hand seen between detector runs); RECORDED |
| Team test of D58 + D59 (12 Nov) → D60 | Built | Vivo: frames upright and right, 15 fps, heat signals readable by the app; team: moves and removals missed → D60 (every move said, looser stillness, 20 fps); replays 10 → 29 alerts on the team's session, false-alarm session 4. **D60 not yet re-tested by the team** |
| D61: the Phase 4 change detector speaks again; nearest-object relations | Built | Replays of the team's 12 Nov retest: bottle moves said (18 alerts, none for the laptop at the frame edge); 245 unit tests; installed. **Team retest pending** |
| D61 loop fix (`ChangeDetector.peerUnits` epoch baseline) & `demo` readiness | Verified on Vivo | Fixed repeated moved-alert loop (`feed_20261128_111958.jsonl`); 246/246 unit & replay tests pass; `devDebug` & `demoDebug` built & installed; `personal_objects.txt` + `sos_contact.txt` synced to `demo` (`ai.saarthi.app`); live Vivo retest confirmed move alerts no longer loop |
| 5. Chaos tests | Not started | — |
| 6. Exit runs (15-20 min, 25 min) | Not started | — |
| Hackathon HUD (`hackathon/mindview-hud`): 2.5D Tabletop, Cognitive Economy, Decision Log + Diary wiring | Built & replay-verified | Headless Chrome + `feed_server.py` replay of `phase4_step3_teamtest_20261031.jsonl`, `phase4_probe_20261031.jsonl`, `phase3_step1_falsealarms_20261030.jsonl` + `/telemetry` check (0 errors); live Vivo USB run pending |

## Phase 4.5 · The New Saarthi (approved by the team on 1 Nov 2026; merged to `main`, tag `phase-4.5-approved`)

| Item | State | Verified how |
| --- | --- | --- |
| 1. Theory-of-mind panel (D44) | Built | Vivo: panel live with three told objects ("beliefs agree"); team saw the false belief on 1 Nov. Fixes after that test (D45: camera moves are not table moves) unit- and replay-tested, **not yet re-tested on the Vivo** |
| 2. Stop the wrong reach (D46) | Built | Unit tests (synthetic reaches); recorded hands cannot show it (3 hand runs/s, hand seen late): **needs the team's live test** |
| 3. My watch + what's this? (D49, D50) | Built | Team photos, every photo held back once: 78/78 correct, none wrong (D50); live teaching on the Vivo not yet tested |
| 4. Mind telemetry + session card (D48) | Built | On two recordings (RECORDED); not yet live with the phone |
| 5. Safety SOS (D47) | Built | Unit tests on synthetic traces; **not yet on the Vivo** (free fall, mic level, location, SMS) |
| 6. Online brain (D51, Gemini) | Built | On the Vivo: "go online" → a typed question → frame to the laptop → "no API key" → "I couldn't get an answer online."; no frame recorded. A real Gemini call waits for the key |
| 7. Table approach | Cut (D43) | — |

Since then (team tests, 1 Nov evening): watches set up once from photos (D52), online mode by triple tap with verified answers and memory (D53, D54, team-tested), SOS test SMS received, stopped reach off (D54), insights page with two real analyses, the diary, faster cloud answers, app icon (D56). 222 unit tests pass; both builds build; dev build installed. Not yet on the Vivo: the diary by voice, "may have been moved" wording, the real SOS drop, triple tap by the team. Full picture and readiness: `SHOWCASE.md`.

## Phase 4 · System 2 (approved by the team on 31 Oct 2026; merged to `main`, tag `phase-4-approved`)

**Exit criterion:** Scenario 3 (real or picture) 9 of 10: **passed on the team's run, 9 of 10**
(real apple ×5, then the apple picture on the laptop screen ×5; `tools/results/phase4_exit_20261031.txt`).
Not held out (same props and person as development). Demo scope narrowed by the team (D40): the laptop
picture only; a picture on a hand-held phone and printed photos are unmeasured.

| Step | State | Verified how |
| --- | --- | --- |
| 1. Evidence ledger, explanation trace, feed `system2` (D35) | Done | Unit tests; Mind view System 2 panel on the live feed |
| 2. Background cues: in a screen box, moves as one plane, light around it (D36, D37) | Built; shown on the Mind view only since D42 | Replays; team tests showed them unreliable (heat-free, 31 Oct) |
| 3. Speech: "is it real?", the torch test (D38, D39), only when asked (D42) | Done | Team on the Vivo, 31 Oct: real apple 5/5 and 5/5, laptop picture 3/3 and 4/5 (exit run 9/10) |
| 4. Size plausibility (D41) | Done | Three recordings: realistic widths, 0–1.5% of kit sightings held back; live on the Vivo (cup 10 cm) |
| 5. Laptop depth / Florence second opinion | Deferred (D41) | — |
| 6. Calibration | Deferred (D41) | — |
| 7. Exit run and ablation | Done | System 1 alone 5/10, background cues 0/10, with the torch 9/10 |
| Extras: green = sure, showcase bar for apple/laptop/bottle/cup (D38) | Done | Unit and replay tests; team saw green frames on the Vivo |

187 unit tests pass. Unverified on device: the latest build's "fresh torch reading replaces the last"
(D42; unit-tested), the size line in the Mind view.

## Phase 3 · Signature (approved by the team on 31 Oct 2026; merged to `main`, tag `phase-3-approved`)

**Exit criterion:** Scenarios 2 (moved bottle) and 4 (reach correction) pass 9 of 10 across 5 people:
**not yet run**.

| Step | State | Verified how |
| --- | --- | --- |
| 1. Belief map, moved / can't see / back alerts, occlusion, steady-camera rule (D25-D28) | Done | Team on the Vivo, 30 Oct: false alarms found and fixed, then "working correctly", "genuinely fast"; RECORDED replays: shaky session 23 → 12 alerts, camera-move session 8 → 3 "can't see" |
| 2. Repeated brief says only changes (salience v1, D27) | Done | Unit tests; installed; team has not tried it explicitly |
| 3. Guidance events, hand and aim modes, wrong-way correction (D29) | Built | 12 unit tests (synthetic paths: correction 200 ms after a wrong move); typed request on the Vivo reaches the guide path; **never tried with a real hand** |
| 4. Reach bias (D29) | Built | Unit tests (3 consistent reaches → confident, scattered → not); not on device |
| 5. Mind view: belief layer, actions panel, guidance vector | Done | Headless Edge on the live feed (belief layer); actions panel not yet seen with real events |
| Extras: reading (D27), apple aliases and metres on screens (D28), instant guidance phrases (D30) | Done | Reading: typed request on the Vivo (no text in view, 675 ms); phrasebook: 23/23 clips ready on the Vivo |

140 unit tests pass; dev and demo build. Waiting for the team: the list in TODO "Open items from Phase 3".

## Phase 2 · World map (approved by the team on 29 Oct 2026; merged to `main`, tag `phase-2-approved`)

**Exit criterion:** Scenario 1 (settle-in brief) passes 9 of 10 with judge-chosen kit objects:
**passed, by the team's verdict (29 Oct)**, with the kit objects at hand (cup, bottle, laptop, mouse,
book). The team also passed the quick checks (directions and reach, turning the phone, voice
questions, hand not taken as a person, covered lens). Recording of the session:
`tools/results/phase2_exitcheck_20261029_232520.jsonl` (11 min: 6 tapped briefs and 12 spoken
questions are in it; the team reports the remaining runs passed too; per-run pass/fail was not written
down). Team decisions on the plan and open questions: D23, D24 (plain directions).

| Step | State | Verified how |
| --- | --- | --- |
| 1. Orientation (adapt SS `ImuTracker`, D19) | Done | Vivo: +47° looking at a desk, −86° facing the ceiling; sensor clock = frame clock (−6.1 ms); 300/300 detector runs got their own frame's pose. Turn direction (yaw sign) checked only by the maths and unit tests, not by turning the phone deliberately |
| 2. Table geometry: rays meet the table, rulers, reach zones, clock (D20) | Done (70–90%) | `TableGeometryTest` (synthetic scenes). On device: positions computed every run; **no ground-truth distances measured** (needs a tape and the team). Default height 0.40 m doubled distances when the phone was held 0.2 m over a desk |
| 3. World map: entries, in view / out of view / not seen, resting, relations, merges (D21) | Done (70–90%) | `WorldMapTest` (synthetic); `WorldMapReplayTest` (RECORDED 4.5-min handheld session: 60 briefs, ≤ 2 of a class, ≤ 5 items; no ground truth); first device run found and fixed four double-count causes |
| 4. Hands (MediaPipe GPU video, D22) | Done | Vivo, 15.6 min: hands median 10.5 runs/s (p50 65–73 ms), detector median 6.0 runs/s, camera 30 fps, thermal nominal, battery 36 °C; two real hands tracked. The "a hand is not a person" rule is unit-tested, not yet seen on device |
| 5. Brief v2, find, people, intents ("what is on my right?", "what can I reach?") | Done | Unit tests; dev phrase set 125/125 (agent-written); RECORDED transcripts 20/20; typed requests on the Vivo answered from the live world map (SIMULATED input, real perception) |
| 6. Feed v1 additions + Mind view layers | Done | Contract updated with RECORDED examples; headless Edge on the live feed: `tools/results/phase2_mindview_20261029.png` |
| Fix: no "camera covered" at every launch | Done | Vivo: a fresh start now says nothing (before: two false sentences each launch). A real covered lens not re-tested |

107 unit tests pass; dev and demo build.

**Verified by the team on 29 Oct:** exit check, reach words, turning the phone, voice questions,
hand rule, covered lens (said once, then "I can see again").
**Still not verified:** distances against a tape (the team judged the reach words, not centimetres);
people across the table by bearing (no people in the test); Mind view refresh rate in a real browser;
cable pull. Seen in the recording: one mishearing ("Where is the pop?"), the known base.en limit.

## Phase 1 · Foundation (approved by the team on 28 Oct 2026; merged to `main`, tag `phase-1-approved`)

**Exit criteria:** (1) "what's around me?" gives a correct short brief: **verified by the team on the
Vivo, by voice and by tap (28 Oct)**. (2) The blueprint shows the table view live: **verified**
(laptop page fed over USB).

| Step | State | Verified how |
| --- | --- | --- |
| 1. Capture (port SB `CameraXManager`), app shell, session recorder | Done | Vivo: 30.0 fps upright frames → `tools/results/phase1_step1_camera_20261028_145659.jsonl` |
| 2. Perception: detector + tracker (port SS `DetectionStabilizer`, `CocoLabels`) | Done | Vivo: 5–7.5 runs/s, p50 108–165 ms; team confirmed cup, laptop, person named correctly |
| 3. Speech out (port SB `TTSService`, SS `Earcons`) + latency fix | Done | Speaker bench, different sentences: live p50 411–543 ms (misses 300 ms), prepared clip p50 2 ms → `tools/results/phase1_speaker_*.json` (D11) |
| 4. Brief (port SS `SceneNarrator`, `MemoryPhrase`), demo kit, camera view | Done (D10–D15) | Team's sessions and screenshots; `BriefReplayTest` (RECORDED): 0 objects named that were not there; Lite2 trial rejected |
| 6. Feed v1 (`shared/feed/v1/`), USB link, blueprint v0 | Done | 5.5 msgs/s relayed, 0 dropped; laptop server stopped → `lost`, spoken once, phone kept working; restart → silent reconnect |
| 7. Speech in (port SB Whisper stack) | Done; **base.en awaits the team's OK to ship** | Team's 20 phrases: base.en WER 4% / 6% (quiet / noisy), tiny.en 13% / 19% → `tools/results/phase1_bench_stt_20261028_210310.json` |
| 8. Intents and answers (adapt SS `IntentInterpreter`) | Done | Dev set 109/109 (agent-written); team's recorded transcripts 20/20; exit check by voice passed after the answer-timing fix (`c1e8dda`) |
| 9. Degradation (port SS `CameraHealthMonitor`, `ThermalGovernor`) | Done (70–90%) | Covered lens → "My camera seems covered" / "I can see again" in the team's exit check; dark room and hot phone not yet triggered |

82 unit tests pass. Exit check: before the fix `tools/results/phase1_exitcheck_20261028_212038.jsonl`; after it `tools/results/phase1_exitcheck_fixed_20261028_212932.jsonl` (7 real spoken requests, all answered from evidence except "what is on my right?", not yet an intent).

**Not verified in Phase 1:** dark room and hot phone on the device; press-and-hold with TalkBack on;
a real USB cable pull with the new link (chaos test); blueprint refresh rate in a real browser (it
follows the detector, 5–8/s, below the PRD's 10/s until hands join in Phase 2); the real speaker
delay after audio is handed to Android; held-out intent phrases from other speakers. Known issues:
2 of 9 real requests misheard; transcription 1.2–1.4 s in the app; the camera once took 20 s to open
after a force-stop. All in `TODO.md`.

## Phase 0 · Audit (approved by the team on 28 Oct 2026; merged to `main`, tag `phase-0-approved`)

| Step | State | Verified how |
| --- | --- | --- |
| 1. Repo setup: SightBuddy submodule, living records | Done | `git submodule status`; SightBuddy LICENSE read (MIT); the ten files named in PRD 3.2 found at the pinned commit |
| 2. Device audit (phone and laptop) | Done | `tools/device_audit.sh` → `tools/results/device_audit_20261028_103856.txt`; summary in `DEVICE_REPORT.md` |
| 3. Inherited SecondSense app: tests and mock build on the Vivo | Done: 113/113 unit tests pass; mock APK installed and ran on the Vivo without crashing (camera frames flowing, permissions granted); uninstalled afterwards | `tools/results/secondsense_unit_tests_20261028_104521.txt`; logcat; the team's hands-on review (below) |
| 4. Saarthi Android project with benchmark screen | Done (pending the team's ear/hand confirmation of speech and vibration) | 6/6 unit tests; dev and demo APKs built; demo APK verified to contain no `bench` classes; dev APK ran on the Vivo → `tools/results/phase0_step4_20261028_112250.json` |
| 5. Phone benchmarks | Done. Text reading re-tested with the book in view: 160 characters per frame at 1280 × 960; screen showed "Atomic" (first line of the two-line title) in every frame, confirmed by the team. Speech heard by the team (confirmed 28 Oct). 15-min parallel pipeline: 14.9 fps hands, 6.8/s detector, no throttling | `tools/results/phase0_{camera,tts,detector,hands,ocr,pipeline}_20261028_*.json`; summary in `DEVICE_REPORT.md` |
| 6. Laptop benchmarks | Done: depth, Grounding DINO, Florence-2 on CPU/GPU/NPU. Florence-2 timed without a key/value cache (upper bound) | `tools/results/laptop_{depth,gdino,florence}_20261028_*.json`; summary in `DEVICE_REPORT.md` |
| 7. Link latency (USB, hotspot) | USB done: 1.7 ms (1 KB), 7.5 ms (100 KB), cable pull noticed in 0.97 s. **Hotspot not tested** | `tools/results/phase0_link_20261028_*.json` |
| 8. `DEVICE_REPORT.md` and phase report | Done; phase report given to the human for approval | `DEVICE_REPORT.md` |

### Not verified in Phase 0

- Laptop hotspot link (backup): deferred by the team.
- Battery drain (heat: 15–20 min is the agreed stress envelope; 15 min passed).
- APU correctness (moot: the APU is slower than the CPU and is not used).
- Florence-2 with a key/value cache (current timings are an upper bound).
- Text reading at 640 × 480, and word-level reading accuracy.
- Detector and Florence-2 *accuracy* on our own table photos (needs the team's photo set).

Phone connected over USB and authorized: `adb devices` shows `96401979260004E device`, model V2055.

### Findings from running the inherited app on the Vivo (step 3)

Hands-on review by the team, plus logcat:

- **Spoke mock detections as fact:** "move left / move right / path is clear" with nothing there.
  The mock engine's synthetic "door" detections drove walking cues, unlabelled. This is exactly what
  rule 7.1 forbids; the Saarthi demo build must make mocks impossible and label them in dev.
- **Far too talkative.** Team principle: *five accurate utterances a minute beat fifty unnecessary
  ones.* Every Saarthi utterance must pass salience and belief-map divergence; we measure
  utterances per minute and false statements per minute in scenario runs.
- "Someone is looking at you": ML Kit face detection (dropped from the port, PRD rule 7.6).
- Read "you left the meeting" from a laptop screen: ML Kit OCR works on this phone (real).
- A picture of an apple → it read the caption under the image instead: no object detector in the
  mock build; OCR ran unprompted.
- No sound cues or vibration were noticed. The screen showed "PAUSED · cues off" when captured, so
  this is not yet a hardware finding; step 4 tests the vibrator directly.
- The app opened network connections at start-up (TLS calls in logcat, probably ML Kit Translate
  fetching a model). The port must not.
- **This vivo build only logs Error-level messages** (`log.tag=E`). Benchmarks write results to
  files on the phone, not to logcat. For debugging, `adb shell setprop log.tag V`, then restore `E`.
