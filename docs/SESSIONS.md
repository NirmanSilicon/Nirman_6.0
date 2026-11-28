# Sessions

## Claims (Constitution Article 7)

| Session | Branch | Paths owned | Status |
| --- | --- | --- | --- |
| phase-0-audit | `phase-0/audit` | everything except `secondsense/`, `sightbuddy/`, `sidequests/` | released (Phase 0 approved 28 Oct) |
| phase-1-foundation | `phase-1/foundation` | `android/`, `laptop/`, `shared/`, `tools/`, living records, `docs/REUSE.md` | released (Phase 1 approved 28 Oct) |
| phase-2-world-map | `phase-2/world-map` | `android/`, `laptop/`, `shared/feed/v1/` (v1 additions only), `tools/`, living records, `docs/REUSE.md` | released (Phase 2 approved 29 Oct) |
| phase-3-signature | `phase-3/signature` | `android/`, `laptop/`, `shared/feed/v1/` (v1 additions only), `tools/`, living records, `docs/REUSE.md` | released (Phase 3 approved 31 Oct) |
| phase-4-system2 | `phase-4/system2` | `android/`, `laptop/`, `shared/feed/v1/` (v1 additions only; any new contract after the team's OK), `tools/`, living records, `docs/REUSE.md` | released (Phase 4 approved 31 Oct) |
| phase-4.5-new-saarthi | `phase-4.5/new-saarthi` | `android/`, `laptop/`, `shared/feed/v1/` (v1 additions only; any new contract after the team's OK), `tools/`, living records, `docs/REUSE.md` | released (Phase 4.5 approved 1 Nov) |
| phase-5-hardening | `phase-5/hardening` | `android/`, `laptop/`, `shared/feed/v1/` (v1 additions only; any new contract after the team's OK), `tools/`, living records, `SHOWCASE.md` | active (plan awaiting the team's OK) |
| phase-5-false-alarms | `phase-5/false-alarms` (from `phase-5/hardening`) | `android/…/beliefmap`, `intent`, `app/SaarthiCore`, `laptop/online`, tests, living records | active (3 Nov: team's choices: still-camera gate, "did you mean", backup model) |
| phase-5-heat | `phase-5/heat` (from `phase-5/false-alarms`) | `android/…/capture`, `perf`, `health`, `hands`, `app/` (frame and hand rates, heat), `beliefmap/StillWatch` (`onHands` only, D59), tests, `tools/heat_*`, `shared/feed/v1/README.md` (v1 additions), living records | active (3 Nov: built, phone away; Vivo run pending) |
| hackathon-mindview-hud | `hackathon/mindview-hud` (from `phase-5/heat`) | `laptop/blueprint/index.html`, `laptop/blueprint/blueprint.css`, `laptop/blueprint/blueprint.js`, living records | ready for review (verified on real replays in Chrome; awaiting human approval to merge) |

## Handover log

<!-- Append entries using the template in Constitution Article 6. -->

## 2026-10-28 · phase-0-audit · branch phase-0/audit
Task: Phase 0 (audit and benchmarks), steps 1–8.
Done (verified on device / by test): SightBuddy submodule and living records; device audit (Vivo =
Dimensity 700 / MT6833, Android 13); SecondSense 113/113 tests and mock build ran on the Vivo; Saarthi
Android project (`ai.saarthi.app`, dev/demo flavours; demo verified free of dev code), 16 unit tests;
phone benchmarks on the Vivo (camera, speech, detector CPU/GPU/APU, hands, text, 15-min parallel
pipeline); laptop benchmarks (depth, Grounding DINO, Florence-2 on CPU/GPU/NPU); USB link round
trips and cable-pull detection. All numbers in DEVICE_REPORT.md with their result files.
Done (not yet verified): nothing claimed beyond the above. Not tested: hotspot link, heat beyond
15 min, battery drain, Florence-2 with key/value cache, accuracy on the team's own photos.
Changed files / modules: android/ (new project), laptop/bench/, tools/ (device_audit.sh,
fetch_models.sh, run_bench.sh, results/), DECISIONS/STATUS/TODO/THIRD_PARTY/DEVICE_REPORT.
Contracts in shared/ changed: none.
Open problems: speech latency over budget (347 ms p50); Florence-2 raw labels unreliable on Indian
steel objects; ML Kit licence terms to verify; hotspot untested.
Next step: the human reviews the Phase 0 report. If approved, Phase 1 starts (clean app shell, fast
tier per D7, speech with the latency fix, USB link with timeouts, published feed v1 in shared/).

## 2026-10-28 · phase-1-foundation · branch phase-1/foundation
Task: Phase 1 (Foundation), REUSE.md section 4 order, plus team-requested changes (demo kit, camera
view, SHOWCASE.md, Mind view decision).
Done (verified on device / by test): camera pipeline (30 fps); detector + tracker; speech out with
prepared clips; brief with evidence-over-time rule, demo kit, screen and edge-person rules; dev camera
view with boxes; feed v1 + USB link + blueprint v0 (loss/reconnect verified by stopping the server);
press-and-hold speech (Whisper base.en via sherpa-onnx) + intents + answers; covered-lens warning;
"dining table" shown and spoken as "table". Team exit check passed by voice (28 Oct) after fixing
answers judged 1.3 s late. 82 unit tests, incl. a RECORDED brief replay and RECORDED intent transcripts.
Done (not yet verified): thermal slow-down and dark-room warning on the device; TalkBack hold.
Changed files / modules: android/ (capture, perception, brief, speech, intent, feedback, link,
health, record, app; dev bench + DevHooks), laptop/link, laptop/blueprint, shared/feed/v1,
tools/push_stt_models.sh, docs/SHOWCASE.md, living records (D10–D18).
Contracts in shared/ changed: feed v1 created (types hello, perception, brief, speech, rates, link,
heard, health; guidance defined, emitted from Phase 3).
Open problems: base.en (161 MB) shipping needs the team's OK; 2/9 real requests misheard; in-app
transcription 1.2–1.4 s; blueprint below 10 refreshes/s; camera slow to reopen after a force-stop.
Next step: the team reviews the Phase 1 report. If approved: merge to main, tag phase-1-approved,
then Phase 2 (table frame with IMU, reach zones phone-only, relations, people around, find common
objects), building the Mind view layer by layer as each piece is computed.
Approval (28 Oct): the team approved Phase 1. Merged `phase-1/foundation` into `main` (no fast-forward)
and tagged `phase-1-approved`. Still open for the team: shipping Whisper base.en (161 MB, D17).

## 2026-10-29 · phase-2-world-map · plan (started on the user's "you can start"; review pending)
The user started Phase 2 while away and asked the agent to proceed, queueing anything that needs the
team. Plan, in build order (each step: unit tests, then a run on the Vivo, then a short report):
1. **Orientation** (adapt SS `sensors/ImuTracker`): camera tilt below the horizon and roll from
   Android's fused gravity sensor (SS's accelerometer formula mixes axes for a portrait phone), yaw
   about gravity from the gyro (SS's mount-agnostic projection), fast-rotation flag.
2. **Table geometry** (new, on SS `MetricDepthScaler`'s ray/ground-plane maths without depth): camera
   intrinsics from Camera2; the ray through each object's base meets the table plane; the camera's
   height above the table comes from known-size kit objects (rulers), else a stated default.
   Gives each object a table position → reach zone (within reach / just beyond / out of reach) and a
   clock direction relative to the user's forward (slow average of the phone's yaw).
3. **World map** (new; SS `RestingStateVerifier` adapted to table positions): one entry per physical
   object in a yaw-stable table frame, surviving tracker fragmentation and short pans; states
   in view / out of view (camera turned away) / not seen; resting vs moving; relations ("behind the
   laptop", "left of the book"); people as bearing and count.
4. **Hands** (MediaPipe Hand Landmarker, GPU, video mode, own thread, D7): published as feed `hands`;
   replaces the "small person at the edge may be a hand" rule with real hand overlap.
5. **Brief v2, find, people, intents v1**: clock directions, reach zones and relations in speech;
   new intents "what is on my right/left?" and "what can I reach?".
6. **Feed v1 additions + Mind view layers**: `pose`, world-map fields, `hands`; the blueprint's
   table view becomes the true top-down plan (reach arcs, clock rays, the camera's footprint, hands).
7. **Verification**: unit tests (synthetic geometry, labelled), RECORDED replays, on-device runs by
   the agent; the Scenario 1 exit check (9 of 10, judge-chosen kit objects) needs the team.
Deviation proposed: SS `OpticalFlow`/`MotionTracker` move to Phase 4 with `GroundFlowConsistency`;
the IMU already gives the stable table frame for rotation, and the phone's two fast cores are the
bottleneck (D19). Out of scope: belief map, divergence, salience, guidance (Phase 3); System 2.

## 2026-10-29 · phase-2-world-map · branch phase-2/world-map
Task: Phase 2 (world map), steps 1–6 of the plan above, built and tested by the agent alone (the team
was away; the phone stayed connected; someone handled the phone at times, unannounced).
Done (verified on device / by test): orientation (tilt sign on the Vivo both ways; frame/IMU clocks
agree); table geometry with rulers, reach zones, clock directions; world map with memory, merges and
relations; hands on the GPU beside the detector (15.6 min: detector 6.0/s, hands 10.5/s, camera 30 fps,
no heat); brief, find, people and two new intents on the world map; feed v1 additions; Mind view plan
and Eyes panels; start-up "camera covered" false alarm removed. 107 unit tests incl. a RECORDED
handheld world-map replay (`tools/extract_replay.py`).
Done (not yet verified): distances against a tape; reach words with a seated person; yaw direction by
turning the phone; voice for the new intents; hand-as-person rule on device; Scenario 1 exit check.
Changed files / modules: android/ (orientation, table, worldmap, hands, perception, brief, intent,
link, app), laptop/blueprint, shared/feed/v1 (v1 additions), tools/extract_replay.py, living records
(D19–D22), docs/REUSE.md.
Contracts in shared/ changed: feed v1 additions (hello.intrinsics; perception.pose/table/view/world;
type hands; rates and brief fields). Additive; authorised in the team's Phase 2 brief.
Open problems: default height without a ruler; unknown ground truth for the replay's "two mice";
remembered objects not yet worded as remembered (Phase 3); gyro drift.
Next step: the team returns → review the plan and D19 deviation, then run the queued device checks
(TODO "Open items from Phase 2") and the Scenario 1 exit check. If it passes 9 of 10, write the phase
report for approval. Phase 3 does not start before that approval.

## 2026-10-29 · phase-2-world-map · exit check
The team returned and decided D23 (plan approved, optical flow in Phase 4 unless Phase 3 has
hand-shake false alarms, base.en bundled in the demo APK, no camera view in demo, longer world-map
memory) and D24 (plain directions instead of clock hours); both built, tested (107 tests) and
installed. The team then ran the quick checks and the Scenario 1 exit check on the Vivo with cup,
bottle, laptop, mouse and book: **all passed (team's verdict)**. Recording:
`tools/results/phase2_exitcheck_20261029_232520.jsonl` (detector 5.5/s, hands 10.5/s, camera 30 fps;
table height from rulers in 98% of runs). Phase report given for approval; on approval: merge
`phase-2/world-map` into main, tag `phase-2-approved`, release the claim, start Phase 3 with a plan.
Approval (29 Oct): the team approved Phase 2. Merged `phase-2/world-map` into `main` (no fast-forward)
and tagged `phase-2-approved`.

## 2026-10-30 · phase-3-signature · plan (team said "start Phase 3")
Exit criterion (PRD 8): Scenarios 2 (the moved bottle) and 4 (reach correction) pass 9 of 10 across
5 people. Build order, each step tested on the Vivo with the team:
1. **Belief map + moved-object alerts** (the signature): what the user was told (brief, answers) and
   where; divergence when a told object rests elsewhere ("Heads up, your bottle was moved; it's now
   behind the laptop.") or its place is in view and empty ("I can't see your bottle any more"). A hand
   or person over it = hidden, never "moved" (SYSTEM2 4.4 occlusion); evidence over time, not one
   frame; each alert logged with its cause; no repeats; a speech budget.
2. **Salience for the brief**: a repeated brief says only what changed or is new; ranking reasons
   shown on the Mind view.
3. **Guidance events + reach guidance**: one event stream (guide_left/right, closer, arrived,
   look_again) driving speech, earcons and vibration (port SS `CueEngine`, `HapticOutput`, SB
   `CueBeat`); "guide my hand to the bottle" steers the tracked fingertip to the target; a wrong-way
   reach is corrected within 1 s; aim mode when no hand is visible (SS `VectorToGoalController`).
4. **Reach bias**: learns a consistent short/sideways reach over 4–5 reaches and adjusts cues.
5. **Feed `maps` and `guidance`, Mind view layers**: belief map beside the world map with divergence
   lines, decisions (said / held back, why), actions (guidance events).
Condition from D23: if step 1 gives hand-shake false alarms, port SS `OpticalFlow` forward.

## 2026-10-30 · phase-3-signature · branch phase-3/signature (paused for the night)
Task: Phase 3 step 1, belief map and moved-object alerts.
Done (verified on device / by test): belief map (told by briefs and answers), change detection with
occlusion and evidence over time, alerts with causes, Mind view belief layer. Team's first test found
false alarms (height swings, ghost entries, one real move making another look moved); fixed (D25);
second team test: working correctly, but slow (3-5 s); sped up and added an instant CHANGED tone
(D26), installed, not yet re-tested by the team. 118 unit tests incl. a RECORDED replay of the
false-alarm session (23 → 12 alerts).
Open problems: phone runs warm after about an hour (silent vendor CPU limiter, detector 6 → 3.5/s);
move threshold 20 cm vs PRD's 10 cm (team to accept or not).
Next step: team re-tests alert speed; then step 2 (repeated brief says only changes), step 3 (guidance
events and reach guidance).

## 2026-10-30 · phase-3-signature · break
Since the last entry: team confirmed faster alerts (D26); built and team-confirmed "your bottle is
back" (D27), repeated brief = only changes (D27), reading brought forward (D27; ML Kit licence for the
demo build still to be accepted), "can't see" only with a steady camera on an intact scene, apple
aliases, metres on screens (D28). Team: "everything is working fine now". 127 unit tests incl. two
RECORDED alert replays. Next: Phase 3 step 3, guidance events and reach guidance.

## 2026-10-31 · phase-3-signature · branch phase-3/signature (handover; Phase 3 report awaiting approval)
Task: Phase 3 (signature) steps 1-5 and the team's requests.
Done (verified on device / by test): belief map; moved / can't see / back alerts with occlusion,
steady-camera and intact-scene rules (D25-D28, D32); repeated brief = only changes; reach guidance
(hand and aim modes), wrong-way correction, reach bias, instant pre-recorded cues (D29-D31): the team
tested all of these on the Vivo on 30-31 Oct and approved them ("it is working, I approve these");
reading (D27) and apple aliases, metres on screens (D28). 142 unit tests incl. three RECORDED replays.
Done (not yet verified): the formal exit check (Scenarios 2 and 4, 10 runs each, 5 people) was not run
as logged runs; reading on a real page not reported; the D32 hand-rate cut on a cool phone.
Changed files / modules: android/ (beliefmap, guidance, ocr, feedback, brief, intent, worldmap,
perception, speech, app), laptop/blueprint, shared/feed/v1 (v1 additions: alert, read, guidance
fields, perception.belief), tools/, living records (D25-D32).
Contracts in shared/ changed: feed v1 additions only (documented in shared/feed/v1/README.md).
Open problems: the phone silently slows its CPU after ~17 min (detector 6 → 3.5/s); the adb USB tunnel
is lost when the laptop's adb service restarts; team decisions owed: ML Kit licence in the demo build,
20 cm minimum move (PRD ~10 cm).
Next step: the team decides whether Phase 3 is approved (optionally after the logged exit runs); on
approval merge `phase-3/signature` into main, tag `phase-3-approved`, release this claim, then Phase 4
(System 2) starts with a plan.
Approval (31 Oct): the team approved Phase 3 (features tested on the Vivo; formal logged exit runs
waived by the team). Decisions: ML Kit accepted for the demo build; 20 cm minimum move accepted.
Merged `phase-3/signature` into `main` (no fast-forward) and tagged `phase-3-approved`.

## 2026-10-31 · phase-4-system2 · plan (awaiting the team's OK)
Exit criterion (PRD 8): Scenario 3 (real or picture: printed, laptop screen, the judge's own phone)
passes 9 of 10 with held-out props and phones; ablation numbers produced. Order follows SYSTEM2 8
(accumulation, real vs picture, explanation, plausibility, calibration, second opinion):
0. **Probe with the team** (about 15 min, recorded): what the phone detector sees for a real apple,
   a printed photo (flat and held), an apple on the laptop screen, and on 2-3 hand-held phones. Is
   "apple" found on each picture, and the "cell phone" / "laptop" around it? This picks which cues
   carry the weight before any of them is built.
1. **Evidence ledger + explanation trace + feed `system2`**: per world-map object, log-odds "real vs
   picture" from cue likelihood ratios, counted per view change or time spacing (never per frame),
   state / reject bounds, look-again band, spoken self-correction. Replaces D12's "leave it out".
2. **Phone cues** (each measured for CPU cost on the Vivo): containment in a phone/laptop/tv box;
   emitted light (region brighter than the scene's lighting); moves as one plane (port SS
   `OpticalFlow` + `GroundFlowConsistency`'s affine residual: picture vs its screen border or the
   table around it). Active perception: "tilt it slightly", "hold it still".
3. **Speech and Mind view**: "is the apple real?" answers from the ledger; briefs say "a picture of
   an apple on a phone"; Mind view System 2 panel (System 1 guess vs verdict, each cue and its
   weight, the ledger over time).
4. **Plausibility**: size and support from the table geometry already built, as likelihood ratios
   for every kit class (also the "two mice" case).
5. **Laptop deliberate service**: on request only for look-again cases; a reduced frame over USB;
   Depth-Anything-V2 Small flatness, Grounding DINO / Florence-2 grounding second opinion; 2 s "let me
   look closely", 5 s give up; the phone never waits.
6. **Calibration**: temperature per class from team-labelled detections, fitted on the laptop,
   applied on the phone.
7. **Proof**: held-out recordings (3+ phones never used for tuning, different people); cue values
   are recorded live so the ablation (System 1 / + calibration / + plausibility / + real vs picture /
   + accumulation) is a replay; numbers into METRICS.md; Scenario 3 exit runs.
Decisions asked of the team: new contract for laptop requests; no PyTorch (keep the ONNX models);
calibration labelling (who, and a dev-only frame-saving flag with no people in view); probe timing.

## 2026-10-31 · phase-4-system2 · Phase 4 report (awaiting the team's approval)
Built and verified on the Vivo: the evidence ledger and the Mind view's System 2 panel (D35–D36);
the torch test on "is it real?" (D38–D39): a screen gives off its own light, a real object reflects
the torch and is lit unevenly (rounded); real vs picture only when asked (D42); size plausibility on
the table (D41); "green = sure" and the showcase bar for apple, laptop, bottle and cup (D38).
Exit run (team, 31 Oct, real apple ×5 then the laptop picture ×5): **9 of 10** with the torch; System 1
alone 5 of 10; the background cues alone 0 of 10 (`tools/results/phase4_exit_20261031.txt`).
Team scope (D40): the demo shows the real apple against the laptop-screen picture only.
Deferred (D41): laptop depth / Florence second opinion (step 5) and calibration (step 6), "if time".
Not done: held-out props and people for the exit run; a picture on a hand-held phone and prints are
unmeasured. Next: the team approves → merge `phase-4/system2` into main, tag `phase-4-approved`, then
Phase 4.5 in the order of CLAUDE.md 5.0.1.

## 2026-10-31 · phase-4-system2 · branch phase-4/system2 (handover)
Task: Phase 4, System 2 (real vs picture), lean finish (D41).
Done (verified on device / by test): torch test on "is it real?" (D38, D39), real vs picture only when
asked (D42), green = sure and the showcase bar (D38), size plausibility (D41); exit run 9/10; 187 unit tests.
Done (not yet verified): a fresh torch reading replaces the last (D42, unit-tested); size line on the Mind view.
Changed files / modules: `system2/` (Ledger, RealityCheck, PlanarMotion, RotationFlow, TorchCheck,
SizeCheck, RealitySpeech), `capture/CameraSource` (torch, exposure lock), `perception/Perception`,
`brief/BriefComposer`, `app/SaarthiCore`, `link/FeedMessages`, `laptop/blueprint/`, `tools/system2_*.py`.
Contracts in shared/ changed: feed v1 additions only (`system2`, `torch` messages; `sure`, `size` fields).
Open problems: the phone heats in long sessions (detector slows); Whisper mishears "a real apple"
("aerial"; handled); the mouse is off the showcase bar (phantom "three mice" in a replay, D38).
Approval (31 Oct): the team approved Phase 4. Merged `phase-4/system2` into `main` (no fast-forward),
tagged `phase-4-approved`, claim released.
Next step: a fresh session starts **Phase 4.5** (CLAUDE.md 5.0.1) on a new branch `phase-4.5/new-saarthi`:
claim, read `docs/The_New_Saarthi.md` and `docs/STRATEGY.md`, plan the seven items in order (theory-of-mind
panel; stop the wrong reach; my watch with touch and ask; mind telemetry and session card; safety SOS;
optional online brain, only if the team approves going online; table approach if time), wait for the OK.

### Team input for Phase 4.5 item 3 (personal object + touch and ask), agreed 31 Oct – 1 Nov
- **Objects:** the team's own two watches, clearly different (a metallic analogue watch and a rubber
  digital watch). No identical look-alikes are needed or tested. Accuracy is still reported on held-back photos.
- **Photos:** when the session reaches item 3, **ask the team** to take the photos (the user takes
  them and stores them in a folder the session names, e.g. `data/personal_objects/<object>/`, gitignored).
- **Teaching:** by voice in one go, "this is my watch" while turning it in the hand for about 3 s
  (many views). Match the region around the hand (the detector has no "watch" class) with embeddings
  on the phone; decide by the gap between the user's watch and the other one, not a fixed score.
  No Faiss (a handful of vectors).
- **Speech:** only when asked ("is this my watch?") or when the wrong watch is picked up.
- **"What's this?" / "what am I pointing at?":** on the phone (hand tracking already runs there).
  The user either touches the object or points at it from a distance, then asks; no touch is needed
  before pointing. Build the touch case first (most accurate), then pointing (a line from the index
  finger). If the line crosses two objects, say both.

## 2026-11-01 · phase-4.5-new-saarthi · plan (awaiting the team's OK)
Exit criterion (PRD 8): each built item verified on the Vivo ("stopped reach", "my watch" and SOS
scenarios 9 of 10); the five minimum-demo items still pass. Order (PRD 5.0.1), each step: unit tests,
then the Vivo with the team, then a short report:
1. **Theory-of-mind panel** (laptop only): per told object, "User believes: X (told N s ago) · World: Y
   (moved M s ago) → false belief → speak / held back"; needs the time the move was first seen
   (small feed v1 addition to `belief`).
2. **Stopped reach**: fingertip direction of travel over the last ~0.3-0.5 s, extended forward → the
   object (or believed-but-empty spot) it heads to; if that is a believed spot whose object moved,
   say "Wait, your bottle moved; it's now on your left." before the hand arrives. Measured first on
   the team's recorded hand tracks (false firings per minute), as D31 did.
3. **My watch + touch and ask** (team input above): teach by voice with 3 s of turning; MediaPipe
   Image Embedder (MobileNet-V3, Apache-2.0) on a crop around the hand; decide by the gap to the other
   watch; held-back photos for accuracy. Then "what's this?" by touch, then by pointing.
4. **Mind telemetry + session card** (laptop only, from recordings and the live feed).
5. **Safety SOS**: free fall → impact > 2-3 g → stillness → loud voice, strong vibration, 15 s
   countdown, tap to cancel → SMS with GPS to a trusted contact (SEND_SMS, location permissions).
6. **Online brain**: only if the team approves bending rule 7.3.
7. **Table approach**: only if time is free.
Team answers (1 Nov, D43): feed addition yes; "moved" only; watch phone-only first; online brain yes
(after the SOS); SOS on the Vivo's SIM with a second number, coarse location, and a "most probable
situation" line in the message; table approach cut.

## 2026-11-01 · phase-4.5-new-saarthi · progress (team away; phone unplugged since ~09:05)
Built and committed on `phase-4.5/new-saarthi`: item 1 theory-of-mind panel (D44; team saw it work);
camera-move fixes from the team's test (D45, replay of their session: the false "cup moved" gone);
item 2 stopped reach (D46); item 5 SOS as the team designed it (D47); item 4 mind telemetry and session
card (D48); item 3 my watch and what's this (D49). 214 unit tests; dev and demo APKs build. Contracts in
shared/ changed: feed v1 additions only (belief.direction; alert evidenceMs/believed/now, kind
`stopped`; guidance bias meanX/meanY/seX/seY; new types `sos`, `personal`). Not verified on the Vivo:
everything after D44 (list in TODO "Open items from Phase 4.5"). Next: the team returns → install,
restart `feed_server.py`, run that list; item 6 (online brain) once the service and key are known.

## 2026-11-01 · phase-4.5-new-saarthi · branch phase-4.5/new-saarthi (handover; Phase 4.5 report awaiting approval)
Task: Phase 4.5 items 1-6 and the team's refinements of 1 Nov.
Done (verified on device by the team): theory-of-mind panel; camera-move fixes (D45); my watch, set up
once from 78 photos (78/78 held back right) and taught live (D49-D52); online mode, Gemini, verified
against the world map, online memory, triple tap, no cloud words (D51-D54); SOS test SMS with location
(D47); point and touch fixed (D53). Stopped reach built (D46) and switched off by the team (D54); table
approach cut (D43).
Done (unit-tested, not yet on the Vivo by voice): the diary, "may have been moved" wording (D56).
Changed: android (personal, safety, online, diary, insight, reach, beliefmap, link, app), laptop (online,
analysis, blueprint insights, link), tools (personal_eval/build, belief_model, reach_study), SHOWCASE.md.
Contracts in shared/ changed: feed v1 additions (documented in shared/feed/v1/README.md).
Open problems: the phone heats in long sessions (Phase 5); the demo build needs the watches and the SOS
contact copied; Gemini free-tier quota and the internet are outside our control (online is optional).
Next step: the team approves Phase 4.5 → merge into main, tag `phase-4.5-approved`; then a fresh session
for Phase 5 (hardening: heat first).
Approval (1 Nov): the team approved Phase 4.5 (drop test, online mode and the diary passed on the Vivo).
Merged `phase-4.5/new-saarthi` into `main` (no fast-forward), tagged `phase-4.5-approved`, claim released.
Next: a fresh session for Phase 5 (hardening: heat, sustained performance, no wrong detections when warm).

## 2026-11-01 · phase-5-hardening · plan (awaiting the team's OK)
Goal: the Vivo stays cool and accurate for a 20-30 min demo. Exit (PRD 8): all P0 acceptance criteria
still pass, and a 25-min run stays below the vendor limiter or degrades gracefully with no wrong statements.
Order, each change measured before/after, unit tests, then the Vivo with the team:
1. **Baseline**: 25-min typical-use run; per minute: CPU/skin/battery temperature (thermal zone files,
   BatteryManager), detector runs/s and p50, hands/s, camera fps, System 2 and embedder cost, frame drops,
   alerts said. Script in `tools/`, results in `tools/results/`.
2. **Where the heat comes from**: short runs with one component off at a time.
3. **Less work, same accuracy**: camera 15 fps; skip detector runs when view and IMU are still and nothing
   changed; idle tiers when no one interacts; cap preview/feed rates; screen brightness; release-build
   speed; a governor on real temperatures that steps down before the vendor limiter (Android says NOMINAL).
4. **No wrong statements when warm**: check speaking rules at 3-4 runs/s (replays at a reduced rate);
   make time-based rules that assume ~6 runs/s rate-independent.
5. **Chaos tests (PRD 9.1)**: USB pulled, lens covered, light change, loud noise, app backgrounded,
   laptop server closed: the phone keeps working and says what it lost, once.
6. **Exit**: 15-20 min thermal + battery run, then a 25-min run; Phase 5 report.

## 2026-11-03 · phase-5-heat · branch phase-5/heat (from phase-5/false-alarms; handover)
Task: Phase 5 steps 1, 3, 4: use the baseline, cut work per frame, heat tier, speaking rules when warm.
Done (verified by test): D59: camera prepares every 2nd frame (all while guiding) into two reused images;
hands 2/s when no hand for 5 s; heat tier from status, headroom, battery temperature, big-core cap (starting
thresholds); detector floor 3 runs/s (D58); `StillWatch.onHands` (own hand seen between detector runs: the
false "can't see your apple" pair in the replay at 3.5 runs/s is gone); warm-rate replay test; heat report
shows the cap's median and dips (the "840 MHz from minute 1" was single-sample dips). 242 unit tests; dev and
demo build.
Done (not yet verified): everything on the Vivo (phone away).
Changed: `capture/CameraSource`, `perf/WorkPolicy` (new), `health/ThermalWatch`, `hands/HandTracker`,
`app/SaarthiCore`, `app/MainActivity` (`--ez view false`), `beliefmap/StillWatch` (`onHands`),
`ChangeReplayTest`, `WorkPolicyTest`, `tools/heat_report.py`.
Contracts in shared/ changed: feed v1 additions: `rates.stride`, `rates.heat`, `health.heat`.
Open problems: D58 still needs the team's live test; heat thresholds uncalibrated; the frame conversion
is checked only by reading (no Android bitmap in JVM tests).
Next step: with the phone: install, `adb shell am start -n ai.saarthi.app.dev/ai.saarthi.app.app.MainActivity --ez view false`,
`tools/heat_log.py --minutes 10 --name d59`, the baseline schedule; then D58's live test (hold still, a
teammate moves an object → "moved"; pointing around → silent). If both pass: merge `phase-5/false-alarms`,
then `phase-5/heat`, into `phase-5/hardening`.

## 2026-11-28 · hackathon-mindview-hud · branch hackathon/mindview-hud
Task: Goal 1 — Upgrade `laptop/blueprint/` into a 2-metre-readable 2.5D Cognitive HUD without changing `shared/feed/v1/` or breaking `/telemetry`.
Done (verified by replay + headless Chrome): 2.5D perspective tabletop stage with clipped reach arcs, D24 plain direction sectors (`Left`, `Slightly Left`, `In Front`, `Slightly Right`, `Right`), non-overlapping opaque object label pills, rear-bearing person indicator, dashed Belief ghosts + red `MOVED` divergence tether; live Cognitive Economy header counter (`Frames Observed | Proactively Suppressed | Decisions Spoken`) from incoming feed events; Signal-vs-Noise Decision Log with `[All Stream | Decisions Only]` filter, muted noise, `"Why I spoke / stayed silent"` sub-lines, and `note` (Diary) event wiring. Verified against `feed_server.py` with `phase4_step3_teamtest_20261031.jsonl`, `phase4_probe_20261031.jsonl`, `phase3_step1_falsealarms_20261030.jsonl`, and `/telemetry` (0 console errors, 0 page exceptions).
Done (not yet verified): Live USB stream from the physical Vivo V21e.
Changed files / modules: `laptop/blueprint/index.html`, `laptop/blueprint/blueprint.css`, `laptop/blueprint/blueprint.js`, `FEATURE_TRACKER.md`, `ENGINEERING_DIARY.md`, `STATUS.md`, `docs/SESSIONS.md`.
Contracts in shared/ changed: none.
Open problems: None in `laptop/blueprint/`.
## 2026-11-28 · phase-5-heat-goal2 · branch phase-5/heat
Task: Merge verified Mind View HUD (`hackathon/mindview-hud`), fix repeated bottle-moved loop found during live Vivo test (`recordings/feed_20261128_111958.jsonl`), run unit/replay suite, and ready `demo` build.
Done (verified by test & install): Merged `hackathon/mindview-hud` (`9b237b8`). Fixed `ChangeDetector.kt` (`peerUnits` per-belief epoch baseline) + added regression test in `ChangeDetectorTest.kt`. `.\gradlew.bat :app:testDevDebugUnitTest` passed **246/246**. Built & installed `devDebug` and `demoDebug` on Vivo `V2055`; synced `personal_objects.txt` (`tools/personal_build.py --demo`) and `sos_contact.txt` to `ai.saarthi.app`. Live Vivo retest confirmed move detection works cleanly without repeating.
Done (not yet verified): Long-duration `tools/heat_log.py` thermal run (already verified D62 silent logging in feed).
Changed files / modules: `android/app/src/main/java/ai/saarthi/app/beliefmap/ChangeDetector.kt`, `android/app/src/test/java/ai/saarthi/app/beliefmap/ChangeDetectorTest.kt`, `STATUS.md`, `FEATURE_TRACKER.md`, `ENGINEERING_DIARY.md`, `docs/SESSIONS.md`.
Contracts in shared/ changed: none.
Open problems: None blocking.
Next step: Branch `hackathon/acoustic-probe` from `phase-5/heat` for Goal 3 (18–20 kHz FMCW glass probe feasibility test on Vivo).

## 2026-11-28 · acoustic-probe-feasibility · branch hackathon/acoustic-probe (rejected, back on phase-5/heat)
Task: Goal 3 (Stretch) — Test 18–20 kHz FMCW glass probe feasibility on Vivo V21e (`hackathon/acoustic-probe`).
Done (verified by test & Vivo hardware measurement): Implemented `FmcwMath` + `FmcwMathTest` (passing) and `AcousticHardwareCheck` (`ai.saarthi.dev.ACOUSTIC`). Measured on Vivo `V2055` at 80% burst volume: `UNPROCESSED` unsupported (`false`), 18–20 kHz `loopSnrDb = 12.9–17.2 dB` with `25–35%` empty-table baseline drift (`16–18 kHz`: `20–30%` drift). Discarded cleanly from `phase-5/heat` per D63; restored clean `phase-5/heat` APK on Vivo.
Changed files / modules: On `hackathon/acoustic-probe` (`72a68a1`): `acoustic/FmcwProbe.kt`, `FmcwMathTest.kt`, `AcousticHardwareCheck.kt`, `DevHooks.kt`, `SaarthiCore.kt`. On `phase-5/heat`: `DECISIONS.md` (D63), `FEATURE_TRACKER.md`, `ENGINEERING_DIARY.md`, `docs/FINALS_ELITE_FEATURES.md`, `docs/SESSIONS.md`.
Contracts in shared/ changed: none.
Open problems: None; `phase-5/heat` is clean, tested (`246/246`), and ready for stage demo.
Next step: Run `laptop/.venv/Scripts/python.exe laptop/link/feed_server.py` + `adb reverse tcp:8765 tcp:8765` for hackathon evaluation.


## 2026-11-29 · round2-sim-and-rehearsal · branch phase-5/heat
Task: Round 2 visual clarity overhaul (`tools/sim/`), interactive 3D FMCW glass simulation (`Module 06`, labelled `SIMULATED D63`), exact `IntentInterpreter.kt` voice line reference + 5-beat rehearsal script (`docs/ROUND2_REHEARSAL_SCRIPT.md`), and `Nirman_6.0` (`vectorx`) Second Progress sync.
Done (verified by static checks & headless Chrome screenshots): Rebuilt `tools/sim/sim.css`, `index.html`, `sim.js` in clean light paper-and-ink style; added interactive 3D perspective FMCW + IMU gyro sweep + Range-FFT spectrum module (`Ideal Ultrasonic` vs `Vivo V21e D63`); authored `docs/ROUND2_REHEARSAL_SCRIPT.md`. Left `laptop/blueprint/` (`:8000`) and `IntentInterpreter.kt` completely untouched. Verified `node --check`, DOM ID/asset parity, and headless Chrome screenshots across Modules 01–06.
Done (not yet verified): Live click-through of animations in user's interactive browser; final stage rehearsal on physical Vivo V21e.
Changed files / modules: `tools/sim/index.html`, `tools/sim/sim.css`, `tools/sim/sim.js`, `docs/ROUND2_REHEARSAL_SCRIPT.md`, `ENGINEERING_DIARY.md`, `docs/SESSIONS.md`.
Contracts in shared/ changed: none.
Open problems: None.
Next step: Run the 30-second Booth Reset Ritual before Round 2 evaluation and keep `ONLINE` mode OFF during bottle-moved demos (`D53`).
