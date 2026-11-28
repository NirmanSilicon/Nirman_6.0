# Decisions

Each entry: what we chose, why, and (for jugaad) what the proper solution would be.

## D1 · 2026-10-28 · Reference copies are git submodules
`secondsense/` (pinned `cc122ea`) and `sightbuddy/` (pinned `578771d`) are submodules, so our repo
stores only a pointer, never their files. Teammates clone with `git clone --recurse-submodules`.
The folder name `secondsense/` is kept because every spec document refers to it.

## D2 · 2026-10-28 · Permission correspondence stays local
`docs/permissions/` is gitignored at the team's request: the SecondSense permission is kept on the
team's machines, not on GitHub. Credit to SecondSense still appears in `THIRD_PARTY.md` and README.

## D3 · 2026-10-28 · LF line endings in the repository
`.gitattributes` stores and checks out text as LF on every machine (CRLF only for `.bat`, `.cmd`,
`.ps1`), so Windows teammates never see whole-file line-ending diffs.

## D5 · 2026-10-28 · Android toolchain and flavours
AGP 8.7.3, Kotlin 2.0.21, Gradle 8.12, compile/target SDK 35, min SDK 30, arm64 only, JDK 21 for
builds (JDK 25 is too new for Gradle 8.x). Chosen because all were already cached on the team laptop
and are known to work together. Plain Android Views, not Compose: the phone screen is minimal by
design (PRD 11). Two flavours: `dev` (tools, benchmarks, labelled mocks) and `demo` (stage build);
the `dev` source set is not compiled into `demo`, which enforces PRD rule 7.1 at build time
(verified: the demo APK contains no `bench` classes and no camera permission yet).

## D6 · 2026-10-28 · Benchmark results go to files, not logcat
This vivo build filters logcat to Error level (`log.tag=E`). Every benchmark writes one JSON file to
the app's external files dir; `adb pull` copies it into `tools/results/`. Numbers in docs cite these
files (PRD rule 7.8).

## D4 · 2026-10-28 · The inherited app is built from a copy
To keep `secondsense/` untouched (Constitution 2.3), Gradle builds of SecondSense run on a copy in a
scratch folder outside the repository; build outputs never land in the reference copy. The
inherited app is verified with the mock engine only (no Qualcomm AI Hub, no AGPL YOLO export).

## D7 · 2026-10-28 · Fast-tier configuration (proposed for Phase 1, from Phase 0 numbers)
Hands: MediaPipe Hand Landmarker on the **GPU in video mode** on every camera frame (p50 51–71 ms).
Objects: EfficientDet-Lite0 **int8 on the CPU in its own thread** on the newest frame (about 7 runs/s).
Camera: exposure range pinned to 30..30 fps. Measured together for 15 min: 14.9 fps hands, 6.8/s
detector, no throttling. Rejected: running both on one thread (about 4.5 fps); the APU via NNAPI
(int8 930 ms vs 67 ms on CPU). Source: `DEVICE_REPORT.md`.

## D8 · 2026-10-28 · Laptop models run on the Arc iGPU with OpenVINO, from ONNX
All three deliberate-tier models are fastest on the iGPU (depth 41 ms, Florence-2 grounding 366 ms,
Grounding DINO 1.34 s); the NPU is slower or fails to compile. ONNX exports (onnx-community) avoid a
PyTorch dependency. Jugaad, recorded: Florence-2 decodes **without a key/value cache** because this
export's cached decoders do not run in OpenVINO; the proper fix is converting Florence-2 with the
OpenVINO notebook (needs PyTorch, over 100 MB: ask first). Models compile in 7–35 s, so the laptop
service compiles at start-up with OpenVINO's model cache.

## D9 · 2026-10-28 · USB link via adb reverse
`adb reverse tcp:<port> tcp:<port>` lets the phone reach a laptop server at 127.0.0.1 over the cable:
1.7 ms for 1 KB, 7.5 ms for 100 KB, cable pull noticed in 0.97 s. No network setup, works offline.
The hotspot backup is still untested.

## D10 · 2026-10-28 · Brief v0: what may be spoken (Phase 1)
A detection is spoken only if its track is **confirmed** (seen in 3 detector runs), its smoothed
score is **≥ 0.5**, it was seen in the last second, and its class is plausible at a table. The
detector itself reports from 0.3 so the tracker sees weak evidence, but 0.3–0.5 is never said as
fact (on the Vivo a "microwave" at 0.31 sat in view for minutes). 0.5 is a starting value, not a
calibrated one: Phase 4 calibration replaces it, and 0.3–0.5 becomes the "look again" band (PRD
5.10). Off-table COCO classes (airplane, car, bed, …) are left out of briefs as near-certain
misreadings; this is a jugaad prior, recorded per left-out track in the session log; System 2
plausibility (Phase 4) is the proper solution. Direction is the frame's thirds (left / in front /
right, about 18° each in portrait); clock directions and reach zones come with the table frame
(Phase 2). Order is largest box first, a proxy for "nearest" until salience (Phase 3).

## D11 · 2026-10-28 · Speech latency: prepared clips (jugaad)
Live system speech on the Vivo takes p50 411–543 ms, p90 up to 993 ms from speak() to first audio
on sentences it has not said before (`tools/results/phase1_speaker_*.json`), over the 300 ms
budget. Fix: whenever the brief's text holds steady for 400 ms, the speaker synthesises it to a
WAV in the background; a tap re-composes the brief and, if the text matches exactly, plays the
clip (p50 2 ms, p90 70 ms to the first samples handed to Android; the audio hardware's own delay
is on top and not reported by Android). Otherwise it speaks live, and the session log records
which path each utterance took. Honest because the clip is synthesised from the live scene and
used only on an exact text match. Also: a tap plays a short earcon at once (tap → samples handed
over ≤ 1.1 ms), so the user knows they were heard. Measurement trap found: the Google engine caches
audio for a sentence it has already spoken (repeated identical text: 7 ms), so speech latency must
be measured on different sentences. Proper solution: a faster on-device voice (e.g. a small
sherpa-onnx TTS model), to be benchmarked if live speech becomes the common path.

## D12 · 2026-10-28 · Brief v1: evidence over time, settle on tap, screens (replaces D10's score rule)
**Evidence.** The team's milestone session (`tools/results/phase1_step4_milestone_20261028_151250.jsonl`,
20 min, handheld) showed real objects with low single-frame scores (book median 0.41, mouse 0.45,
wall clock 0.34) indistinguishable by score from false ones (bed 0.41, cat 0.43), but detected far
more *consistently* (book 698 detections vs cat 44). The handheld camera also fragments tracks (one
book became 74 tracks), so taps right after moving the phone found nothing confirmed.
**Rule.** A confirmed track seen in the last second is stated if its smoothed score is ≥ 0.6, *or*
it was seen in ≥ 70% of the detector runs of the last 1.5 s (at least 3 sightings) with a mean score
≥ 0.35. On a tap, if objects appeared in the last 0.7 s and are not yet evidenced, the brief waits
until 0.7 s after the tap (the earcon has already answered the tap; a newer tap cancels the wait).
**Screens.** A "tv" box on a laptop is the laptop's own screen. Any other object whose box is ≥ 90%
inside a laptop, tv or phone box is left out as "may be a picture" until System 2 (Phase 4); an
omission is preferred to calling a picture real. Known cost: close to a laptop that fills the frame,
real objects in front of it are left out too (replay: a mouse).
**Result on that session, at the 40 real taps (replayed by `BriefReplayTest`, RECORDED):** real
objects named 20 → 24, objects that were not there 1 → 0, empty briefs 20 → 15. These are
*development* numbers (the rule was chosen on this session); a fresh session is the check. All
thresholds are starting values for the Phase 3 evidence ledger and Phase 4 calibration.
**Screen text.** The phone's status line now shows exactly what would be said ("Would say: …") and,
separately, confirmed tracks left out ("Unsure, not said: clock 0.37"), from the same composer call.

## D13 · 2026-10-28 · Camera view with boxes on the phone screen (dev build only)
The team could not tell what was in frame (the screen was black). The dev build now shows the
camera view (CameraX `PreviewView`, same 4:3 sensor area as the analysed frames, scaled to fit)
with confirmed tracks drawn on it: green = the brief would say it, amber = seen but unsure. The
view is displayed, never stored (PRD rule 7.6). Cost on the Vivo: none measured (camera 29.9–30.2
fps, detector 5–7.5 runs/s, as before). The demo build keeps the minimal screen (PRD 11); whether the
stage build shows the view is a team decision (open). First use found a false statement the rules
cannot catch: a white power adapter called "mouse" at about 0.6 (`tools/results/phase1_camera_view_20261028_1554.png`),
logged for System 2 plausibility and calibration (Phase 4).

## D14 · 2026-10-28 · Quick precision fixes after the team's camera-view test
The team's five screenshots (`tools/results/phase1_team_screens_20261028_*.jpg`) showed the detector
naming a charger "mouse"/"remote", a black bottle "refrigerator", a toy car "scissors", paper
"laptop", and a little finger at the frame edge "person". Fixes within the phone's current model:
(1) briefs may name only an **allow-list of 24 table classes** (replaces D10's block-list); (2) a
"person" box under 8% of the frame that touches the frame edge is left out as "may be a hand"
(Phase 2 hand tracking replaces this); (3) the "Would say" line refreshes every 250 ms (it was 2 s,
part of the 3–5 s delay the team saw); (4) "a pair of scissors". These cannot fix a confident
misreading of a table-sized object (charger → mouse at 0.6): that needs a stronger detector and
System 2. Root cause, stated plainly: EfficientDet-Lite0 is the smallest model of its family and
sees every frame at 320 × 320 px, so small objects and pictures shrink to a few dozen pixels.
Next: measure stronger permissive detectors on the team's own table frames (proposed, awaiting
approval).

## D15 · 2026-10-28 · Fixed demo kit; phone stays on EfficientDet-Lite0 (team decision)
**Team decision (28 Oct):** the demo uses a fixed kit of everyday objects the phone's detector
handles well; judges choose arrangements, moves and pictures within it. Saarthi names only kit
objects: person, cup, bottle, apple, banana, orange, laptop, mouse, book, phone (and "table" for
the opening line). Everything else stays silent (drawn amber in the dev camera view). This scopes
the demo to the model's capability rather than staging it: detection is a component; the signature
is two maps, change detection, real vs picture and reach correction. A larger detector widens the kit.
Proposed PRD wording for rule 11 (CLAUDE.md is the team's to edit): "the judge chooses the inputs
within the demo kit". Screens outside the kit ("tv") still count for the picture rule.
**Kit notes from the team's screenshots:** reliable: cup, laptop, person, mouse, transparent plastic
bottle; book via the consistency rule; phone weak (0.33–0.41). Fail: frosted black bottle (not a
bottle to this model), charger (→ mouse/remote: keep it off the demo table), goggles (not a COCO
class: phone cannot name them; laptop open-vocabulary later). Untested: real apple, banana, orange.
**Lite2 trial, rejected for now:** EfficientDet-Lite2 int8 (448 px) ran at 2–4.5 runs/s (p50
190–495 ms) vs Lite0's 6–8/s and still missed the frosted bottle
(`tools/results/phase1_lite2_trial_20261028_164407.jsonl`). Kept selectable in dev builds
(`-e detector lite2`, checksum in `tools/fetch_models.sh`) for the refine pass. Accuracy beyond the
kit comes from the laptop second opinion (System 2, 4.6) and the refine pass.
**Working rule (team):** build every feature to about 70–90%, then refine once all of Saarthi exists.

## D16 · 2026-10-28 · Published feed v1, link and blueprint v0
**Feed** (`shared/feed/v1/README.md`): JSON lines, one message per event, with a version, type and
the phone's boot clock. The phone writes the **same** messages to its session file and to the link,
so every recording is a replay of the feed. Types now: `hello`, `perception` (raw detections plus
the world map v1 with said/why-not per track), `brief`, `speech`, `rates`, `link`. `guidance` is
defined but not emitted before Phase 3 (no placeholder events, as agreed). `hands`, `maps`,
`system2`, `frame` reserved.
**Link:** plain TCP from the phone to 127.0.0.1:8765 through `adb reverse` (D9), no Android
library needed. The laptop acks on connect and every 500 ms; the phone counts the link as connected
only after an ack (adb's tunnel accepts connections even with no server behind it) and lost after
2 s without one. The phone never blocks: a 64-message queue drops the oldest. Loss is spoken once
(PRD 4 wording), at most once a minute; reconnection is silent.
**Laptop:** `laptop/link/feed_server.py` (FastAPI + uvicorn + websockets, all permissive) relays to
browsers at `ws://127.0.0.1:8000/feed`, sends late joiners the latest message of each type, and
records to `recordings/` (gitignored). Chosen over NanoHTTPD on the phone (SecondSense's
`DashboardServer`): the laptop is where displays live, and the phone stays a client that cannot be
slowed by a viewer.
**Blueprint v0** (`laptop/blueprint/`): table view, world map, last brief with left-out reasons,
rates, timeline; belief map panel honestly empty until Phase 3.

## D17 · 2026-10-28 · Speech in: Whisper base.en via sherpa-onnx (base.en awaiting the team's OK)
**Test** (`tools/results/phase1_bench_stt_20261028_210310.json`, the team's voice on the Vivo, 20
phrases, last 8 over background noise, same audio to both models): tiny.en WER 13% quiet / 19% noisy,
release → text p50 376 ms; base.en WER 4% / 6% (contractions now scored as equal: effectively 20/20),
p50 672 ms. Through the intent grammar: base.en 20/20, tiny.en 16/20 (it misheard "mug", "apple
real", "say that again", "what changed"). Android's on-device recogniser exists but returned "language
unavailable" (error 13): the offline English pack is not installed, so it is not a fallback today.
**Choice:** base.en (int8, about 161 MB), loaded from the app's files dir (`tools/push_stt_models.sh`),
not bundled in the APK yet; shipping it needs the team's OK (it is over 100 MB). Runtime: sherpa-onnx
1.13.4 AAR (Apache-2.0, about +30 MB APK), fetched with SightBuddy's pinned checksum, not in git.
**In the app:** tap = brief, hold ≥ 350 ms = talk (low tone, then the mic after 100 ms so it does not
record the tone; release = the "heard" tone). Whisper's sound tags ("[buzzer]") are not words. The
object detector pauses while a request is transcribed (under ~1.3 s; tracks survive 1.5 s), because
the two fast CPU cores cannot run both: silent holds took 1.25–1.96 s with the detector running,
1.04–1.31 s paused. Real-speech latency in the app is not yet measured.
**Intents** (`intent/`): SecondSense's rule grammar adapted to the table intents; objects resolve onto
the demo kit ("mug" = cup); asking for a non-kit object gets "I can't recognise a watch yet"; intents
whose features are not built say "I can't … yet". Development phrase set 109/109 (written by the agent,
not held out); the team's recorded transcripts: base.en 20/20.

## D18 · 2026-10-28 · Degradation states, Phase 1 cut
Ported now: SecondSense's covered/dim camera check (same thresholds and debounce; mount angle waits
for the IMU in Phase 2), sampled on a 20 × 20 grid every 5th frame, and a status-only thermal watch
(MODERATE → the detector runs at most every 250 ms, SEVERE → every 600 ms). Each change is said once:
"My camera seems covered." / "I can see again." / "It's quite dark; I may miss things." / "The
phone is getting hot; I'll look a little less often." Cooling down is silent. Published as feed
`health`. Left for Phase 5 hardening: headroom/battery/latency fusion, `DegradationLadder`,
headphones unplugged, battery low.

## D19 · 2026-10-29 · Orientation from the gravity sensor and gyro; optical flow deferred to Phase 4
**Ported** SecondSense `sensors/ImuTracker`'s yaw (gyro rate projected on gravity, integrated; no
magnetometer) and its fast-rotation gate. **Changed:** tilt and roll come from Android's fused
`TYPE_GRAVITY` as the camera's down vector. SecondSense's accelerometer formula
(`atan2(-ax, sqrt(ay²+az²))`) measures a sideways tilt for a portrait phone; its own comment flagged
the axis as unverified. **Verified on the Vivo (29 Oct):** looking down at a desk the phone reported
+47°, lying on its back facing the ceiling −86°; sensor timestamps share the frame clock (offset
−6.1 ms); 300 of 300 detector runs were placed with the pose of their own frame (≤ 250 ms apart).
**Forward** (for clock directions) = yaw averaged with a 10 s time constant: a glance aside does not
move "12 o'clock", turning the body does, slowly. Jugaad, recorded: a chest mount would make
forward = current yaw; the handheld demo (STRATEGY round 2) needs the average. Gyro drift (a few
degrees a minute) is not corrected. **Deferred (deviation from REUSE section 4's order, team to
confirm):** SS `OpticalFlow` + `MotionTracker` move to Phase 4 with `GroundFlowConsistency`, where the
planar-parallax test needs them. The IMU already keeps the table frame stable under rotation, the
phone's two fast cores are the bottleneck, and handheld translation is a few centimetres.

## D20 · 2026-10-29 · Phone-only table geometry: rulers, reach zones, clock directions
A detection's base (bottom-centre of its box) is a ray; it meets the table plane `h` below the camera
(SS `MetricDepthScaler`'s ray/plane maths, no depth map). `h` comes from **rulers**: kit objects of
known width (bottle 7 cm, mug with handle 10 cm, apple and orange 7.5 cm) give a depth from their
image width, hence the height of their base below the camera; median per run, moved a fifth of the
way each run. Until a ruler is seen, `h` = **0.40 m** (phone at chest level over a table, seated),
and the feed says `default`. Rulers must pass every speaking rule. **Not rulers:** the laptop (paper
and notebooks are this detector's commonest confident "laptop": on the Vivo a notebook at 0.70 set
the height), books, phones, the mouse (often turned), the banana. **Reach zones** from the chest
(0.10 m behind the handheld camera): within reach ≤ 0.50 m, just beyond ≤ 0.75 m, else out of reach,
with 4 cm hysteresis. **Clock**: 30° per hour from forward, 12 = "in front of you". A base ray less
than **12° below the horizon** is not placed (direction only, no distance): nearer the horizon a few
pixels move the point tens of centimetres (RECORDED replay: one mouse became three). All values are
starting points for a seated adult; the team should feel-check them (queued). Known limit: with the
default height, a phone held low over the desk (0.2 m) doubles every distance (first device run:
a mouse called out of reach); one ruler in view fixes it.

## D21 · 2026-10-29 · World map v1: entries, memory, and never counting an object twice
One entry per physical object, kept in a yaw-stable table frame, positions stored per unit of camera
height (a new height rescales the whole map, so old entries still match). A confirmed track joins
its entry, else the nearest same-class entry within 0.20 m (0.35 m for one not in view; 12° for
people), else a new one. States: in view · out of view (camera turned away: projected outside the
frame) · not seen (in view, undetected; Phase 3's occlusion reasoning decides what it means).
Resting = position spread ≤ 5 cm over ≥ 0.5 s and 4 sightings (SS `RestingStateVerifier` on table
positions); moving = 10 cm within 1 s. **No double counts**, from the first device run and the
RECORDED handheld replay: same-class entries within 0.35 m that were never in view together are one
object (merged, most recent kept); a same-class box 70%+ inside a bigger one is the same object; an
object out of view is described for 20 s, only if it was watched for at least 1.5 s and no
same-class object is in view. Each choice prefers an under-count to a phantom. Forgetting: never
statable 3 s, not seen 10 s, out of view 120 s. Replay check (development data, no ground truth):
60 briefs, at most 2 of a class (was 3 before these rules), at most 5 items.

## D22 · 2026-10-29 · Hands, feed v1 additions and the Mind view's Phase 2 layers
Hands: MediaPipe Hand Landmarker on the GPU in video mode, own thread, newest frame, paused while
speech is transcribed (D7, D17). On the Vivo with the detector: hands 9.5–12 runs/s (p50 65–73 ms),
detector 5.5–7.5 runs/s (p50 ~110–130 ms), camera 30 fps over 3 minutes of handheld use; two real
hands tracked (scores 0.6–0.99). A "person" box at least half covered by a tracked hand is that hand
(D14's edge rule stays as a fallback). Feed v1 additions (authorised by the team's Phase 2 brief;
consumers ignore unknown fields): `hello.intrinsics`; `perception.pose/table/view/world`; type
`hands`; rate and brief fields (`shared/feed/v1/README.md`). The Mind view's table panel is now the
true top-down plan from these fields; an "Eyes" panel shows raw guesses, tracks and hand skeletons
in camera space. Nothing is drawn that the phone did not compute.

## D23 · 2026-10-29 · Team decisions on the Phase 2 questions
Answered by the team on return (29 Oct):
- **Phase 2 plan approved**, and SS `OpticalFlow`/`MotionTracker` moved to Phase 4 (D19), **on one
  condition:** if Phase 3's moved-object alerts give false alarms from hand shake, optical flow comes
  forward into Phase 3.
- **Whisper base.en ships in the demo build** (closes D17's open question): offline is a rule, and
  size does not matter for a sideloaded APK. The demo APK carries the model in its assets
  (`tools/fetch_models.sh` puts it there; not in git) and copies it to its files dir on first launch
  (`speech/SttAssets.kt`). The dev build still uses `tools/push_stt_models.sh`.
- **No camera view in the demo build** (closes D13's open question): the blind user's interface is
  audio; the judges see the camera on the laptop's Mind view. Already the case (`CAMERA_VIEW` false).
- **HUD owner**: the team informs them of the feed v1 additions (additive only).
- **Longer world-map memory:** an entry never yet statable is kept 15 s (was 3 s), one out of view
  5 min (was 2 min): a briefly seen laptop was forgotten too soon. Speaking rules are unchanged
  (recall still needs 1.5 s of sightings and is limited to 20 s, D21), so remembering longer does not
  make Saarthi say more.

## D24 · 2026-10-29 · Plain directions instead of clock hours (team decision)
The team found "at 1 o'clock" unclear. Speech now says "in front of you" (within 12° of forward),
"slightly to your left/right" (12–35°), or "on your left/right" (beyond 35°). Example: "A cup slightly
to your right, within reach." "What is on my right?" counts anything beyond "in front of you". The
feed keeps `clock` for displays and adds `direction`. This replaces the clock-direction wording in
PRD 5.0.1 (CLAUDE.md is the team's to edit).

## D25 · 2026-10-30 · Moved-object false alarms from the first team test, and their fixes
The team's Scenario 2 test (recording `tools/results/phase3_step1_falsealarms_20261030.jsonl`):
moves were detected, but a still phone held near level (tilt ~15°) produced "moved" alarms for
objects nobody touched, and one "in front of the bottle" for a cup that was behind it. Causes found
in the recording, not guessed: (1) the camera-height estimate swung 0.13-0.36 m (rulers jittering,
a ruler cup being handled), and beliefs were stored in metres, so every believed spot moved with it;
(2) a cup re-found 13 cm from its spot as a new entry left the old one "not seen" → "can't see it";
(3) the relation was taken against a stale, unseen bottle entry. Fixes: beliefs in camera-height
units like the world map; height = median of the last 40 single-ruler readings; the move threshold
is max(15 cm, 4° of view at that distance and height), since at shallow angles shake moves the
computed spot more; a same-class object re-found within that threshold of the spot is the same
object; relations use only objects in view. D23's condition stands: if shake alarms remain, port
SS optical flow forward.
Follow-up (same day, RECORDED replay of that session, `ChangeReplayTest`): beliefs in height units +
median height + re-found-near-spot + in-view relations: 23 → 14 alerts. Common-mode rejection (judge
each object against the shift the *other* known objects share, only if at least two others agree
within 6 cm; with one other, a real cup move made the still bottle "move"): kept. Not-seen needs the
spot inside the central 80% of the frame and 4 s (was 3 % margin, 3 s). Minimum move **20 cm**, not
the PRD's ~10 cm: handheld about 0.2 m above the table, noise reached 15-19 cm; the team should
decide whether that limit is acceptable for the demo (judges' moves are typically 30 cm or more).
Result: 12 alerts in that session (the team did not log its moves, so true/false per alert is
unknown). Next device test decides whether optical flow comes forward (D23).

## D26 · 2026-10-30 · Faster alerts, an alert tone, and a warm phone
The team's second Scenario 2 test passed (no false alarms reported) but alerts came 3-5 s after the
move. Budget then: rest check 0.5 s with 4 sightings, evidence 1 s, "can't see" 4 s, speech start
0.2-1.1 s (measured). The phone was also warm: CPU 52-56 °C with a vendor CPU limiter active while
Android reported thermal status 0, and the detector fell from 6 to 3.5 runs/s, so sighting-count
rules took longer. Now: rest check 3 sightings over 0.4 s, evidence 0.6 s, "can't see" 3 s, and a
falling two-note CHANGED earcon the instant an alert is decided, before the sentence. The RECORDED
replay of the first (shaky) session still gives 12 alerts, so the speed-up did not bring back false
alarms there. Heat handling stays a Phase 5 item (the silent vendor limiter is now known).

## D27 · 2026-10-30 · Reading brought forward; "your bottle is back"; repeated briefs
Team requests on 30 Oct. (1) After "I can't see your bottle any more", the bottle's return is said:
"Your bottle is back, slightly to your right, within reach" (or "…, now <place>" elsewhere), after it
rests 0.6 s. (2) **Reading** (PRD 5.7, a BONUS item) brought forward: "read this" reads the next
camera frame with ML Kit (Latin; Devanagari when Latin finds little), says the heading first (the
tallest run of lines, if 1.3× taller than the typical line) and offers "read on" for the rest, in
about 220-character parts; the detector and hands pause while it reads; text is spoken, never
stored. Frames are 480 × 640: small print may not read (Phase 0 measured 1280 × 960); untested on a
page yet. ML Kit is free and offline but under Google's terms, not an open-source licence: the team
must accept it before the demo build ships (THIRD_PARTY.md). (3) Salience v1: a repeated tap says
only what is new or changed, then "Nothing else has changed", or "Same as before: …"; a spoken
"what's around me" still gives everything; beliefs older than 2 min count as forgotten.

## D28 · 2026-10-30 · "Gone" only when the camera holds still on an intact scene; apple aliases; distances on screens
**Team report:** moving the camera made Saarthi say "I can't see your bottle any more". The recording
showed every such alert came with the camera turning at 29-79°/s or tilting up to 40°, and usually
with other known objects vanishing at the same moment: the phone had slid (translation, which the gyro
cannot measure), so the remembered spot was no longer really in view. **Rule now:** the not-seen
clock runs only while the camera turns slower than 20°/s and stays within 8° of where it pointed when
the clock started; it says "can't see" after 3 s if another known object is seen in its place (proof
the camera still looks at the same table), after 5 s if the object is the only known one, and never
while other known objects have vanished too (the camera moved). An object that comes back into view
is compared with where the user believes it: same spot = silent; elsewhere = "moved".
**Apple (team decision):** on the Vivo the real apple was mostly detected as "orange" or "donut";
both are relabelled "apple" before tracking (`SpokenNames.KIT_ALIASES`); "orange" leaves the kit.
Raw detections in the feed keep the detector's word (Mind view "Eyes" shows it). A real orange would
be called an apple: keep oranges and doughnuts off the demo table.
**Distances:** estimated metres from the chest are shown on the Mind view (world map column and plan
labels) and on the dev camera view; speech still uses reach words (PRD 5.0.1: never centimetres).

## D29 · 2026-10-30 · Reach guidance, correction and reach bias (Phase 3 steps 3-4)
**One event stream** (`guidance/`): each step is one `Cue` (left, right, closer, back, arrived, look
again) with its mode (hand | aim), intensity, phrase and vector; the same event drives speech, the
phone's vibration (`feedback/Haptics.kt`, pulse count and length only: no amplitude control) and the
feed (`guidance`), which the wristbands and the HUD will read. **Hand mode** works in the camera image
(phone looking down: image right = user's right, image up = away): one cue per 0.9 s beat, the most
frequent since the last beat (SightBuddy `CueBeat`); arrival = the index fingertip on the target's
last known box grown by 3 % (so a hand hiding the target still arrives); **wrong-way correction**: the
fingertip moving faster than 0.25 frame/s mostly away from the target is corrected at once, outside
the beat ("Other way: right."), at most every 0.8 s; synthetic test: corrected 200 ms after the wrong
movement starts. **Aim mode** (no hand for 1.5 s; SecondSense `VectorToGoalController`): turn the
camera until the target is within 12 % of the frame's centre, then "It's straight ahead, within
reach."; a target out of view is found by its remembered bearing. Sessions end on arrival, "stop", or
after 30 s. **Reach bias**: the first pause of each guided reach (moved, then still for 250 ms, not
touching) is a sample of target-minus-fingertip; after 3+ samples agreeing in sign with a mean beyond
5 % of the frame, Saarthi says it once ("You tend to reach a bit short; I'll guide you further.") and
aims its cues 0.6 × the bias past the target; arrival still uses the real target. Per session, never
stored. **Not yet verified with a real hand** (the team was away): the phrases are spoken by the system
voice on every beat (0.2-1 s start latency measured earlier); if that feels slow, directional tones
come next. Feed: `guidance.target` is a world-map id (the contract said track id; changed before the
first emission), plus `label`, `correction`, `phrase`, `vector`, `bias`.

## D30 · 2026-10-30 · Guidance phrasebook: every cue plays instantly
The system voice starts a new sentence 0.2-1 s after it is asked (D11), too slow to correct a reach
within 1 s. Every sentence the guides can say (23, `guidance/Phrases.kt`; a randomised test proves the
list complete) is synthesised once at start-up by the phone's own voice into clips; `Speaker.speak`
plays a clip on an exact text match (the D11 clip player: p50 2 ms to the first samples). Verified on
the Vivo: 23 of 23 clips ready within about 25 s of launch (`rates.phrasebookClips`). Sentences with
changing content (alerts, the bias sentence, briefs) still use the live voice.

## D31 · 2026-10-30 · Wrong-way correction judged on the distance to the target
Checked against the team's recorded real hand data (2,782 fingertip steps from Phase 2-3 sessions):
30 % of ordinary fingertip motion exceeds the D29 speed threshold (0.25 frame/s), so a speed rule
would have said "Other way" about once a second during normal reaching. New rule: the fingertip's
**distance to the target** (both in the same image, so camera shake moves both and cancels) grew by
≥ 6 % of the frame within 0.35 s, on two checks in a row. Replaying the recorded tracks against random
fixed targets (a pessimistic bound: free hand movement, half of it "away") cut firings 2.5× versus a
single check (17.6 → 7.0 per minute of free movement); a deliberate wrong reach is still corrected in
about 0.4 s (synthetic test), and 10 s of tremor near the target gives none. Real guided reaches are
untested until the team returns.

## D32 · 2026-10-30 · Late or missing alerts on a warm phone
Team report: some periods worked "with 99 % accuracy", others said alerts late or not at all. The
recording (27 min): detector 5-6 runs/s for 17 min, then 3.2-4.5 runs/s with each run taking about
200 ms instead of 110 ms, while Android's thermal status stayed NOMINAL (the vendor's silent CPU
limit, D26). Fewer runs make detections patchier; 18 % of "not seen" evidence was then discarded by
D28's "other known objects vanished too" rule, because another object (often the clear bottle) had
dropped out for a moment. Fixes: (1) "vanished too" counts only objects last seen within 1 s of this
one (a camera move empties the view at once; a detector miss happens at its own time); (2) hand
tracking runs at full rate only during guidance, else about 4/s (enough for "a hand covers it"; hand
boxes stay fresh 450 ms). Measured right after, on the still-warm phone: hands 3.5/s, detector 4.0/s at
p50 210 ms, so the hand cut alone does not restore speed when the phone is already warm; a cool
phone and a power bank remain the demo's protection, and heat handling stays Phase 5. Also seen: when
the laptop's adb service restarts, the USB tunnel is dropped and the phone silently shows "no laptop"
until `adb reverse` is run again.

## D33 · 2026-10-31 · Phase 3 approved; ML Kit and the 20 cm move accepted (team)
The team approved Phase 3 after testing it on the Vivo (logged exit runs waived). ML Kit text
recognition is accepted for the demo build (THIRD_PARTY.md). The 20 cm minimum move (D25) is
accepted as reasonable, in place of the PRD's ~10 cm.

## D34 · 2026-10-31 · Phase 4 plan approved; contract, PyTorch and calibration (team)
The team approved the Phase 4 plan (docs/SESSIONS.md, 31 Oct) and said "start the development".
- **Contract change approved** (a `system2` feed v1 addition and a phone→laptop request contract),
  on the team's condition that it costs Saarthi no speed or accuracy. How that holds: requests go only
  for look-again cases, on their own thread and socket; the phone never waits for an answer (rule
  7.4). Measured before and after on the Vivo: camera fps, detector runs/s and p50 (Article 12).
- **PyTorch: not now.** It is needed only once, to convert Florence-2 with a key/value cache; it does
  not change runtime speed for the worse or accuracy at all (same weights). The cache would mostly
  speed up long answers (OCR, naming everything); the second opinion asks short phrase grounding
  (366 ms uncached). Reconsider only if Florence-2 latency becomes the bottleneck, and only if it is
  measured to be at least as fast and as accurate.
- **Calibration:** the agent fits the per-class temperatures and the ledger's bounds. A dev-only flag
  may save frames for labelling, never with people in view (rule 7.6); the team spot-checks labels.
- **Probe props available:** a real apple and an apple picture on the laptop (plus the team's phones).

## D35 · 2026-10-31 · Probe results; the evidence ledger replaces D12's screen rule
**Probe** (`tools/results/phase4_probe_20261031.jsonl`, 10 min, real apple, laptop picture, phone
picture, both together; segments inferred from the detections, the taps did not mark them): the real
apple scored about 0.77, the laptop picture about 0.66 (the scores overlap, so no score threshold can
separate them). The laptop picture lay inside a "laptop" or "tv" box in about half of its runs.
**A phone around a phone picture was almost never detected** (twice, 0.32 and 0.41, the box filling
the frame). So containment cannot carry the judge's-phone case: step 2's screen-light and one-plane
cues must, without needing the phone's box. Baseline before Phase 4: camera 30 fps, detector 5.0
runs/s, p50 152 ms, hands 3.5/s.
**Ledger** (`system2/`): per world-map object, summed log-likelihood ratios (positive = real); a cue
counts again only after 0.7 s or a 4° camera turn (min 0.2 s); each cue's sum is capped; evidence
older than 20 s drops out; Wald's bounds at α = β = 0.05 (±2.94). First cue, containment: −1.2 per
view inside a laptop or tv box, −1.5 near the centre of a phone box, capped at −2.4, **so it can never
reach "picture" alone**: a real apple in front of the laptop looks the same. A screen box counts if
seen in 2+ runs within 0.5 s. **Speaking rule:** any net picture evidence (≤ −0.5) holds an object
back ("may be a picture"); an object inside a screen box is said only once the ledger has settled it
as real. Same behaviour as D12 today, until step 2's cues can prove "real" or "picture". Rulers judge
with the previous run's assessments, so a picture is never a ruler. All weights are starting values
from the probe, to be fitted on held-out recordings (calibration, step 6).

## D36 · 2026-10-31 · Pixel cues: moves as one plane, screen light; cost kept off the detector
**Study first** (`tools/system2_cue_study.py`, the team's four clips of 31 Oct: real apple, laptop
picture, phone picture, real apple in front of the laptop picture; development data). Separating cues:
(1) **moves as one plane**: residual of the apple's points against the affine motion of a ring
around it, over ~200 ms, divided by the ring's motion: pictures ≤ 0.15 in 72-83% of views, real apples
in 4-7%; (2) **screen light**: ring 1.12-2.3 x the scene's median brightness around pictures,
0.84-1.10 around real apples. Not useful: brightness of the box itself, clipped highlights, fine
texture. **The phone detector found an apple on the phone picture (clip art on white) in only 10 of
205 frames**: a picture it does not call "apple" is never spoken at all (safe), but the demo moment
needs a picture the detector does call "apple" (a realistic photo, as on the laptop: 0.59).
**Port** (`system2/PlanarMotion.kt`): SS `OpticalFlow` Lucas-Kanade and `GroundFlowConsistency`'s
affine fit, plus a 2-level pyramid, a texture test (smallest gradient eigenvalue ≥ 1.0), robust refit,
ring 1.3 box sizes with other objects cut out. On 25 RECORDED frame pairs (sweep): real apples 7/12
stand out (≥ 0.45), **0 read flat**; pictures 5/8 flat, 1 stands out; a picture filling a plain
screen has too little texture around it and reads "can't tell" (needs ≥ 12 ring points). Per view:
flat −1.6, stands out +1.4, cue cap ±4 (two flat views = picture, three standing-out views = real).
Screen light ≥ 1.15: −0.8 per view, cap −1.6. Both only for objects that stand up (apple, banana,
cup, bottle): a real book is flat. On the Vivo with the laptop picture: it reached "picture" and was
held back, the real apple was said throughout (team's observation and the log).
**Cost.** First version: 68 ms per run, detector 5.5 → 3.0 runs/s (unacceptable, team's rule). Fixes:
gradients once per frame, one sub-pixel weight per window and iteration, smaller inner grid, and
**bursts**: one grey frame, then the next run's frame plus the checks, at most every 0.5 s, only while
a standing kit object is in view. After: System 2 median ~7 ms per run (p90 ~40-60 ms on burst
runs), detector median 5.0 runs/s, camera 30 fps (`tools/results/phase4_step2_cost_20261031.jsonl`,
a warm phone). OpenCV (Apache-2.0) and MediaPipe for Python (Apache-2.0) added to the laptop venv for
the offline study only.

## D37 · 2026-10-31 · After the team's test: "picture" only with a screen and real shifting
**Team test** (`tools/results/phase4_step3_teamtest_20261031.jsonl`): a real cup before a white wall
was called a picture and "corrected" out loud; the real apple was held back for about a minute; 8 of
10 "is this a real apple" were heard as "is this aerial apple" and not understood. Causes, from the
log: (1) "light around it" fired on the white wall above a dark table (1.3-1.9 x the scene median);
(2) "moves as one plane" read real objects flat while the phone mostly **turned**: turning moves near
and far points alike (no parallax), and the clips of D36 had mostly sideways shifting. Heat was
not the cause (Android thermal status 0, CPU 46.7 °C, skin 39.8 °C, charging over USB; detector 4
runs/s, System 2 about 12 ms of each run).
**Fixes.** (a) **Decision rules** (`RealityCheck.decide`): evidence for "real" always counts;
evidence against it counts only once the object was seen inside a laptop, tv or phone box; "picture"
needs the reject bound **and** both a screen and a flat motion reading. Brightness or motion alone
never hold back or correct a real object; containment and light alone (a real apple in front of the
laptop) only hold it back, as D12 did. (b) **Gyro correction** (`RotationFlow`): the image motion of
the phone's turning between the two frames (gravity + yaw → rotation, camera intrinsics) is
subtracted from every tracked point, and a reading needs at least 1.0 px of remaining shift (240 x
320); without both poses there is no reading. (c) "aerial", "areal", "a reel" → "a real", and
"is this area …" → "is this a real …" before intent rules. **Tests:** `System2ReplayTest` replays all
297 recorded cue readings: under the old rules the cup became "picture"; under these, no object
never seen inside a screen is held back or called a picture (245 readings). Synthetic: pure turning
gives no reading. Cost of the change: the judge's-phone picture will rarely reach "picture" when the
detector misses the phone's box (D35); it is held back only if inside a box, else said as an apple
if the detector calls it one. Step 5's laptop second opinion is the planned remedy, not a looser rule.

## D38 · 2026-10-31 · Green means sure; a lower bar for the showcase objects; the torch test
**Team request** after the second team test: the apple stays amber at 0.4–0.5 and needs much aiming;
make the showcase objects (apple, laptop, bottle, cup, mouse) green from 0.3; the apple picture on
the laptop screen must be caught by a torch test. **What the recording showed**
(`recordings/feed_20261030_190230.jsonl`, last session, 08:57–09:02): of the frames where the confirmed
apple was amber, most were **not weak detections**: 60% were "already known, unchanged since told"
(salience leaves it out of a repeated brief, and the displays coloured by "would say it now"); weak
scores were only 4–6% for apple, cup and bottle (26% laptop). Real vs picture: the real apple's
evidence sat at +2.2 to +2.8, just under the 2.94 bound, flipping REAL ↔ UNSURE as views aged out
(hence "I still can't tell"); at 340 s a real apple inside the laptop's box was called a picture
(in-screen, light around it and flat readings).
- **Green = sure.** Feed v1 adds `sure` to tracks and world entries (passes every speaking rule, said
  or not); the Mind view and the phone's camera view colour by it. Additive; old recordings fall back to `said`.
- **Showcase bar.** Apple, laptop, bottle and cup may be stated when seen in at least 3 runs of the
  last 1.5 s with a mean score ≥ 0.3 (the detector's floor), without the 70% presence share.
  **The mouse is left out:** with it, the 29 Oct handheld replay said "three mice" (a persistent
  misreading, the detector's commonest: a charger); without it every replay passes. Adding it back is
  one word, if the kit table holds nothing mouse-like.
- **The torch test** (`system2/TorchCheck.kt`; the idea of Face Flashing, NDSS 2018). On "is it real?"
  about an object in view: "Let me check with my light.", exposure and white balance locked, a frame
  with the torch off, torch on, a frame with it on (about 1 s), then the answer. share = (object's gain
  − 1) ÷ (table's gain − 1): a ratio cancels colour, so a real object ≈ 1 and a screen ≈ 0. Emits
  (share ≤ 0.30) = −4.5, decides "picture" alone, with or without a screen box; reflects (≥ 0.60) =
  +2.0, supports "real" only (a print reflects too) and **overrules** the screen box and the
  light-around-it hints. Unclear, saturated (> 25% burnt out) or no measurable light (table < +10%) =
  no evidence. Pixel cues pause during the test. Feed v1 adds a `torch` message.
  **Thresholds are starting values (SIMULATED tests only)**: calibrate on the team's measurement (real
  apple, laptop picture, phone picture; ideally a print) before relying on them. Known limits: a print
  is not caught; an object far behind the table's middle reads lower (distance squared), so only a
  clearly low share counts as "emits".

## D39 · 2026-10-31 · The torch test, measured; shape from the torch's light
**Team run** (`recordings/feed_20261031_175841.jsonl`, 8 torch tests; few because the phone heated):
real apples read share 0.99–1.11 (6 "reflects"; 1 "unclear": 36% of the apple burnt out, phone too
close); the apple picture on the laptop screen read 0.14 ("emits") and was called a picture. Table
gain ×2.1–3.2: the exposure lock holds on the Vivo and the torch is strong at table distance. The
separation is wide. But "reflects" alone (+2.0) is below the "real" bound by design (a print reflects
too), so 5 of 6 real apples got "I'm not sure yet". The team's alternatives were weighed (box
containment: already a cue, a hint only; FFT/moiré: the 480 × 640 frames cannot resolve a screen's
pixel grid at 40 cm, and the torch already settles screens; monocular depth for prints: it infers
relief from appearance, so a photo of an apple gets an apple's dome, which is the very bias System 2
corrects; not used as evidence).
- **Shape from the torch's light** (same two frames, no extra cost): the torch shines from beside the
  lens, so a rounded object takes its light unevenly (full where it faces the camera, little at its
  rim; the room lights it from above), a print evenly. `unevenness` = spread of the gain over the
  middle and four rim zones of the object's ellipse ÷ the typical gain. Reflects + uneven ≥ 0.35 =
  +3.5 → "real" on the torch alone. Even is **not** evidence of a picture (a flat real object is even
  too): a print stays "not sure", never "real". Threshold is a starting value (SIMULATED test only);
  calibrate on the next run with real apples and a print.
- A torch answer that says "picture" is itself the correction: no second "Correction: …" sentence.

## D40 · 2026-10-31 · Real vs picture: the demo scope, and the torch verified
**Team run on the D39 build** (`recordings/feed_20261031_175841.jsonl`, second session): real apple
5 of 5 "looks real" (torch share 1.7–2.8, unevenness 0.67–3.65, all "rounded"); apple picture on the
laptop screen 3 of 3 "picture" (share 0.00–0.03), said once each; a white cup once "unclear" (76% of
it burnt out by the torch at close range), then real. The 0.35 unevenness threshold stands.
**Team decision:** the real-vs-picture scenario shows the real apple against a picture on the laptop
screen. Not shown and not tuned further: a picture on a phone held in the hand, a printed photo, and
a real apple in front of the laptop screen ("the system already makes a clear difference; show other
features"). This narrows PRD 5.4 / scenario 3 ("including a photo on the judge's own phone") and the
SYSTEM2 4.2 acceptance (printed, laptop, handheld phones): the code for those cases stays as built
(D37–D39), unmeasured. On stage, say what is shown: a screen gives off its own light; a real apple
reflects the torch and is rounded.

## D41 · 2026-10-31 · Phase 4 lean finish; plausibility = size on the table
**Team decision:** finish Phase 4 lean: step 4 (plausibility, phone) and step 7 (short exit runs and
a replay ablation); the laptop deliberate service (depth, Florence second opinion; step 5) and
calibration (step 6) are deferred to "if time" (Phase 5 or cut), then the Phase 4 report and Phase 4.5.
This leaves PRD 5.4's calibration and SYSTEM2's laptop depth unbuilt for now.
- **Size** (`system2/SizeCheck.kt`): an object's width from its box, the measured table height and
  the camera's tilt (only with the height from rulers, box fully in view). Median of the last 9
  readings, judged from 5. Checked: apple, cup, bottle, mouse, banana, book; **not** laptop or phone
  (their boxes often cover part of them: the laptop measured 13–22 cm in 40–49% of readings).
- **Measured on three recordings (30–31 Oct, development data):** medians apple 6.6–7.5 cm, cup
  9.8–10.7, bottle 7.2–8.6, mouse 6.1–8.2, book 17–21: the geometry holds. With the typical ranges as
  limits, 1–19% of apple sightings and up to 4% of bottles would have been held back (objects held up
  or lying measure wide; pictures on the laptop measure 13–20 cm). **Only a clear misfit counts**
  (1.5 × outside the range): 0–1.5% of sightings held back (a 2 cm "mouse", a 3 cm and a 34 cm "cup",
  20–25 cm "apples"). A misfit holds the statement back ("its size does not fit an apple (25 cm wide)")
  and shows in the Mind view; it is not picture evidence.
- **Not checked: support** (resting on the table): from one camera a floating object and a farther
  one look alike. Whether size catches the replay's phantom third mouse is unknown (that recording
  never measured the table height), so the mouse stays off the showcase bar (D38).

## D42 · 2026-10-31 · Real or picture only when asked; a fresh torch reading replaces the last
**Team decision**, after an unasked "Correction: the cup I mentioned is a picture of a cup on the
laptop screen" about a real cup (evidence: once inside the laptop's box, a white wall around it,
flat motion readings; `recordings/feed_20261031_175841.jsonl`): real vs picture is judged **only when
the user asks**, and only for that. "Picture" now needs the torch's "gives off its own light"; the
background cues (box, light around it, motion) still gather and show on the Mind view but never make
a picture, never hold an object back, and nothing is corrected unasked. The brief's screen rule from
D12 (an object inside a screen's box is left out until settled) stays. Everything else unchanged.
**Exit run** (same recording, last session; `tools/results/phase4_exit_20261031.txt`, scored by
`tools/system2_exit.py` with the team's order of 5 real, then 5 laptop picture): 9 of 10 correct with
the torch; System 1 alone 5 of 10 (it calls every apple real); the background cues alone 0 of 10
(never settled). Two later tries (432 s, 446 s) read like the real apple (table in view, ×2.8–3.1);
at 432 s the answer was still "picture" because the earlier "emits" readings were still summed: each
torch test now replaces the object's previous torch reading. Development data, not held out.

## D43 · 2026-11-01 · Phase 4.5 plan approved; online brain yes; table approach cut (team)
The team approved the Phase 4.5 plan (docs/SESSIONS.md, 1 Nov).
- **Feed v1 addition approved** for the theory-of-mind panel: when a move was first seen.
- **"Moved", not "moved by someone else":** the phone cannot yet tell the user's own move from
  another person's; the panel says "moved" only.
- **Personal object: phone only first** (MediaPipe Image Embedder); the laptop DINOv2 second opinion
  only if the phone is not accurate enough.
- **Online brain: approved** (bends PRD rule 7.3 to "offline by default; online only when the user
  holds to ask"). Built after the SOS; the core demo never depends on it.
- **SOS:** tested on the Vivo's own SIM, verified on a second number of the team's. Coarse location
  is enough. **Team request:** the message also says the most probable situation, from what the
  sensors measured (e.g. a real fall of 50-70 cm or more, not a 10 cm knock; a sudden very loud
  sound, as in an accident), not just "alert + location".
- **Table approach: cut** (PRD 5.0.1 item 5). The other items are enough.

## D44 · 2026-11-01 · Theory-of-mind panel (Phase 4.5 item 1)
The Mind view gets a "Theory of mind" panel: per told object, "User believes: <direction> (told N s
ago) · World: <what the camera shows> → <beliefs agree | FALSE BELIEF | maybe gone | no evidence> →
<stay silent | speak once the evidence holds 0.6 s | …>", from the belief map's existing states. Below
it, the last unasked correction stays on screen ("User believed: bottle slightly right (told 40 s
before) · World: bottle left (resting there 0.6 s) → FALSE BELIEF → said '…'"), because after an alert
the belief map already holds the new spot. Feed v1 additions (approved in D43): `belief.direction`;
`alert.evidenceMs`, `alert.believed` and `alert.now`. "Moved" only, never "by someone else" (D43). The
evidence time is when the object was first seen *resting* elsewhere, not when the hand lifted it: the
phone does not know that moment, so the panel says "resting there N s", not "moved N s ago". Verified:
unit test (alert fields); on the Vivo, the panel showed three told objects live with "beliefs agree".

## D45 · 2026-11-01 · Camera moves are not table moves: height flux, shared scale, frame edge
**Team test of D44** (`recordings/feed_20261031_175841.jsonl`, last 8 min; RECORDED replay
`RECORDED_phase45_tomtest_20261101.jsonl`): the panel showed the false belief, but at 455 s "Heads up,
your cup was moved" when the team had moved the bottle (team's screenshot), and the team reports "I
can't see" / "moved" when the phone slides or is rested on the table and objects leave the frame.
**What the recording showed:** the bottle move (442 s) was right. At 453-455 s the phone tilted 31° →
25° and was lowered (table height 0.26 → 0.16 m over 2 s); the median height lags, so every computed
spot moved away by about 30%, the farthest (the cup) by 60%: 20 cm, read as a move. D25's common-mode
rule corrects only a shared *shift*, not a shared *scale*. Both "can't see" alerts in this session
were real removals (a hand took the apple and the mouse from the middle of the frame, camera still).
"Your apple was moved" (447 s) is undecided: the apple had rested 17-20 cm left of its told spot since
436 s. **Fixes** (`ChangeDetector`): (1) while the height estimate changes by more than 10% within 1 s,
no evidence counts and every timer restarts; (2) the others' shared **scale** about the camera (median
projection ratio, two must agree within 15%, 0.6-1.7) is applied before their shared shift; (3) an
object last seen touching the frame's edge (2%) is "out of view, not gone": "can't see" only for an
object that vanished from inside the view. **Replays:** this session: the cup alarm is gone; bottle
moved, apple and mouse gone and back are kept (6 alerts, was 7); 30 Oct shaky session 16 → 14; 30 Oct
camera-move session: its one "moved" gone, 3 "can't see" (unchanged). Development data; the team did
not log ground truth beyond the screenshot. Limit: sliding the phone sideways with fewer than two other
known objects in view is still uncorrected.

## D46 · 2026-11-01 · Stop the wrong reach before it lands (Phase 4.5 item 2)
**What it does** (`reach/`): while a **watched spot** exists, the hand's course predicts its target; if
that is a watched spot, Saarthi says at once (pre-recorded clip) "Wait, your bottle moved; it's now on
your left." or "Wait, your bottle isn't there any more." Watched spots: (1) **stale**: where an object
was before Saarthi said it moved or was gone, for 90 s (`BeliefMap.staleSpots`; the hand shows the
correction did not land); (2) **pending**: a believed spot the world already contradicts, not yet said.
A spot where another real object now sits is not watched. Each watched spot is spoken about once, and
the belief map is corrected (told). Not during guidance, not while the user is talking.
**Prediction** (`ReachPredictor`, image space like D31): the knuckles' course over 0.6 s (≥ 3 samples,
≥ 0.08 of the frame, both halves within 35°, still moving), extended from the fingertip; a spot within
25° of the course (or within its radius), 0.06-0.75 away, that the fingertip has come ≥ 0.04 nearer
within the window; the nearest on the line wins; a watched spot must win two checks in a row. Only the
user's own hand: wrist nearer the image bottom than the fingertip (several recorded pick-ups were
someone else's hand from across the table). **Cost:** hands run at full rate only while a spot is
watched (D32's 4/s otherwise). 48 new clips at start-up (8 kit objects × 5 directions + gone).
**Measured on recorded hands** (`tools/reach_study.py`, all recordings, development data): random
watched spots (4 per session, a pessimistic bound) fire 4.3 times per minute of hand in view (~1 per
spot-minute); natural pick-ups: only 2 of 38 predicted, because the recordings have ~3 hand runs per
second outside guidance and the hand is often first detected at contact (motion blur). **So the
recordings cannot show whether it works; the team's live test at full hand rate decides.** Harm of a
false firing is bounded: once per watched spot, within 90 s of a real change, and the sentence is true.
Synthetic tests: a straight 1 s reach is predicted by 700 ms with the hand ≥ 6% of the frame away; a
reach to a real object, someone else's hand, tremor and a sideways pass say nothing. Feed v1 addition:
`alert.kind = "stopped"` with `reach` {`watched`, `distance`, `angleDeg`, `etaMs`, `speed`}.

## D47 · 2026-11-01 · Safety SOS: a real fall, a loud sound as context, everything else asleep
Team design (1 Nov): a fall of 50-70 cm or more, not a 10 cm knock; a sudden very loud sound ("5,
then 30-40") adds to the message; a loud sound alone never starts it, only together with the fall
(option b); no numbers in the message; coarse location is enough; during the alert the rest of the
system sleeps, with a dedicated button to cancel and return to normal. Stage plan: the sound is played
at full volume, then the phone is dropped from about 0.8 m within a few seconds (a 5-10 s event).
- **Fall** (`safety/FallDetector`): accelerometer at 100 Hz; free fall (< 0.35 g) for ≥ 0.30 s (about
  45 cm; a drop of h falls sqrt(2h/g): 0.40 s from 80 cm, 0.14 s from 10 cm), then > 2.5 g within
  0.6 s. The gyroscope is not used: it measures turning, and a phone can drop flat without turning.
- **Loud sound** (`safety/LoudSpike`): the mic's loudness only (one dB number per 50 ms, no audio kept),
  18 dB above the room's median over the last 4 s and above −30 dBFS; Saarthi's own voice ignored;
  the mic is released while the user holds to talk. A spike from 8 s before to 1 s after the impact
  goes into the message.
- **Alert** (`safety/Sos`): perception, hands, guidance and alerts pause; media volume to maximum;
  continuous strong vibration; "Are you OK? Tap the screen to cancel.", then at 10 s and 5 s; a red
  screen with one big "I'M OK · CANCEL" button (a tap anywhere also cancels). After 15 s: SMS
  (`SmsManager`, multipart, delivery result reported) to the number in `files/sos_contact.txt` on the
  phone (never in git or the feed), then "RETURN TO NORMAL".
- **Message** (`safety/SosMessage`), e.g. "SAARTHI SOS for Ananya. Possible accident: a sudden very loud
  sound, then the phone suddenly fell and hit hard. No movement since. No answer to "Are you OK?" for
  15 seconds. Approximate location: https://maps.google.com/?q=12.972,77.595. Sent at 10:21." Location:
  a fresh fix requested at the fall, else the newest known one (its age said if ≥ 2 min), rounded to
  3 decimals (about 100 m); "Location not available." otherwise. Always "possible": a phone's fall is
  not proof of a person's fall.
- **Dev only:** `adb shell am broadcast -a ai.saarthi.dev.FALL` starts it as if fallen (SIMULATED in
  the feed, "[TEST]" at the start of the SMS). New permissions: SEND_SMS, fine and coarse location.
- Verified: unit tests on synthetic traces (80 cm drop onto a cushion = fall; 10 cm knock, a soft catch,
  shaking, setting down hard = no fall; a bang in a steady room = one spike; a slowly louder room and
  Saarthi's own voice = none). **Not yet on the Vivo**: the real sensor's free-fall readings, the mic
  level of the team's sound, location indoors, and the SMS.

## D48 · 2026-11-01 · Mind telemetry and the session card (Phase 4.5 item 4)
A laptop page, `/telemetry` (linked from the Mind view), live from the feed or replaying any
recording (labelled RECORDED; `/recordings`, names checked against `feed_YYYYMMDD_HHMMSS.jsonl`). All
numbers come from `laptop/blueprint/telemetry_core.js`, which only counts and times published messages:
- **Belief accuracy:** each second, the share of told objects whose belief state is not a false one
  (`moved_pending`, `not_seen`); red marks at each unasked correction (moved, lost, back, stopped),
  with how long the evidence held before speaking.
- **Speech budget:** sentences said (briefs, alerts, answers, guidance phrases) vs **silences chosen**,
  each counted once per object per 30 s: a hand covering a known object, a camera move, a possible move
  or disappearance that did not hold, an object left out of a brief (salience reasons), a System 2 doubt.
- **Reaches** (guided sessions: arrived, median time, wrong-way corrections), **reach bias** with a ±2
  standard-error band (feed addition: `bias.meanX/meanY/seX/seY`; per app run), **stopped reaches**,
  **System 2 statements** and later corrections, **SOS** events.
- **Time** is active time only (gaps over 10 s, e.g. the app closed, are left out), so per-minute
  rates are not diluted by an idle phone. The **session card** is the same on one screen (printable).
- Charts follow the dataviz method: one ink line per single-series chart, hairline grid, hover titles
  on every mark, the decisions table as the table view; the two-series speech chart uses the reference
  blue and orange, validated on the Mind view's paper (all checks pass; contrast warning covered by
  direct end labels and the table).
Checked on two recordings (`node tools/telemetry_card.js <recording>`): 30 Oct, 57 active min, 4.6
sentences a minute against 4.7 chosen silences, 19/19 guided reaches arrived (median 5.9 s), 33 false
beliefs corrected unasked; 31 Oct, 72 min, 2.1 a minute, 25 corrections (median evidence 0.7 s).
Development data. Not yet seen live with the phone connected.

## D49 · 2026-11-01 · My watch, and "what's this?" (Phase 4.5 item 3; team input of 31 Oct-1 Nov)
**Teach by voice** ("this is my watch" / "this is the other watch", "this is not my watch"): "Turn it
slowly in your hand.", then for 3 s the region around the hand (`HandRegion.held`: around the thumb
and index tip, pushed past the fingers, sized by the palm; the detector has no "watch" class) is
embedded every 150 ms with the **MediaPipe Image Embedder** (MobileNet-V3 small, Apache-2.0, 4 MB, CPU,
own thread); at least 6 views are kept. Only vectors are kept, in `files/personal_objects.txt` on the
phone (so teaching before the demo survives a restart); never an image. **Judging** (`PersonalObjects`):
the best cosine match among the user's views minus the best among the look-alike's: ≥ the gap = yours,
≤ −gap = not yours, in between = not sure; below 0.55 best similarity = no taught object in the hand.
With one side only taught there is no gap, so never "yours"/"not yours" (team: a gap, not a fixed
score). A plain scan over a few dozen vectors (no Faiss). **Speech** only when asked ("is this my watch?":
three views, mean margin: "Yes, that's your watch." / "No, …" / "I'm not sure. Turn it a little and ask
again.") or when the look-alike is in the hand on 3 views in a row (checked every 0.5 s once both are
taught, not during guidance): "That's not your watch.", at most once per 30 s. "Got it, that's yours" is
not said unasked, and "yours is on your right" is not said: the phone does not know where the other
watch lies. **"What's this?"** (`TouchAsk`): a taught object under the fingertip first ("That's your
watch."); else touch (fingertip on an object's box grown 3%: "That's your cup." for a told object, else
"That's a cup."); else pointing (a line from the index knuckle through the tip; objects it crosses,
nearest first: "You're pointing at the cup, and beyond it the bottle."); else "I can't tell…"; no hand
in the last 1.5 s: "I can't see your hand…". **Gap 0.05 and 0.55 are starting values (SIMULATED tests
only)**: `tools/personal_eval.py` measures held-back accuracy on the team's photos (every 5th held back,
cropped as on the phone) and suggests the gap. Cost: the embedder runs only while teaching, asking, or
with both taught and a hand in view (2/s); measured on the Vivo when the team returns. Limit, said
openly: look-alikes must differ visibly. Not yet on the Vivo: everything above beyond unit tests.

## D50 · 2026-11-01 · My watch: measured on the team's photos
The team's photos (`data/personal_objects/`, gitignored): 44 of the user's watch, 34 of two other
watches, held in the hand. `tools/personal_eval.py --folds 5` holds every photo back once (taught from
the other four fifths), crops it as the phone does and embeds it with the phone's model
(`tools/results/phase45_watch_eval_20261101.txt`, RECORDED): **78 of 78 correct, none wrong, at every
gap from 0 to 0.02**; at the phone's gap of 0.05, 77 correct and 1 "not sure"; smallest margins +0.030
(mine) and −0.067 (other). The gap stays 0.05 (a "not sure" is better than a wrong "yours"). The lowest
best similarity of a held-back photo was 0.53, so "no taught object in the hand" moves from 0.55 to
0.45. A hand was found in 49 of 78 photos (the others used the photo's centre). Limits: photos are
not the phone's live 480 × 640 frames; the live test decides; development data (no other people's
watches yet).

## D51 · 2026-11-01 · Optional online brain: Gemini, checked against the world map
**Team choice** (1 Nov): Gemini's free tier (photo + question confirmed), over Groq (image input not
confirmed). Bends PRD rule 7.3 as approved in D43: **off at every launch**; "go online" / "go offline"
by voice. While on, a question Saarthi has no rule for ("what colour is the cup?") goes online: "Let me
ask online.", one camera frame (JPEG) and the question go over the USB link to the laptop, which calls
the Gemini API (plain HTTPS, standard library; key in `laptop/secrets/gemini_api_key.txt` or
`GEMINI_API_KEY`, gitignored; the model is the newest "flash" model the key may use, or
`laptop/secrets/gemini_model.txt`). The frame is never written to disk on either side. **Before it is
spoken** the phone checks the answer against its own world map (`online/CloudCheck`): a kit object the
cloud mentions that Saarthi has not seen, one it denies that Saarthi sees, or the opposite side → "The
cloud says: … But I see the cup on your left, so I'm not sure."; consistent → "… That matches what I
see."; nothing checkable → "… I can't check that myself." No answer in 7 s (longer than the deliberate
tier's 5 s: a cloud round trip) → "I couldn't get an answer online." The core demo never depends on it;
known questions never go online. Feed v1 additions: `ask`, `answer`, `online`. Not yet verified: a real
call (no key yet).

## D52 · 2026-11-01 · Team's live test: watches set up once; Gemini made to answer in time
**Watches** (phone session `session_20261101_170812.jsonl`): taught live once each (15 views of the
user's watch, 12 of one other watch); 14 "is this my watch?": 4 yours, 4 not yours, 5 not sure, 1 no
watch; the team reports one wrong "yours". The team has **two** other watches and only one was taught,
and teaching a look-alike again would have *replaced* it: look-alikes now **add up**
(`PersonalObjects.teach`). **One-time setup, never at a presentation** (team): `tools/personal_build.py`
embeds all 78 team photos with the phone's model and crop and adds them to what was taught live, then
copies the vectors to the phone (`--demo` also to the demo build). Check before copying: the phone's
live views of the user's watch are closer to its photos (0.572) than to the look-alikes' (0.505).
The taught set lives in the app's files and survives reinstalls (`adb install -r`), not an uninstall.
**Gemini** (D51): the team's key file holds `NAME = "key"` lines; the reader takes the value. Measured on
the free tier, one photo question: gemini-3.8-flash busy (HTTP 503), gemini-3.7-flash 14 s,
gemini-flash-latest over quota (429), gemini-2.5-flash retired for new users (404),
**gemini-3.5-flash-lite 2.2-4 s, correct**. Order now: the two newest stable Flash-Lite models, then the
newest stable Flash; each try at most 3.5 s, 6 s in all; a key over its limit → the second key. Live on
the Vivo: "There is a cup in front of you." (3.5 s) → Saarthi had no cup in its map → "…But I don't see
a cup, so I'm not sure." (the check working; whether a cup was there is not recorded).

## D53 · 2026-11-01 · Online is a mode; online memory; touch and point fixed (team test)
**Team test** (phone session `session_20261101_180858.jsonl`): online answers worked (toy truck,
"Ocean fruit drink", 2-5.6 s), but while online "what is written on the book?" went to local reading,
"what is this?" to the hand check, "go online and tell me what is this" became a brief, and a "bottle
moved" alert cut in. "What is this?" said "I can't see your hand" (the last hand run was an empty one,
and hands pause during transcription); "tell me where I am pointing at" was not understood.
**Team decision:** online is a mode: from "go online" until "go offline", **every** request goes to the
cloud ("stop" still stops speech); nothing else speaks unasked (change alerts, stopped reach, wrong
watch held back; guidance stopped). The SOS stays on (safety). Saarthi still checks each answer
against its own map (team: fine). "Go online and …" turns it on and asks the rest at once.
**Online memory** (`laptop/online/memory.py`): each exchange (time, question, answer, the things the
cloud named with kind and place, and the phone's verdict) is kept for the server run and appended to
`recordings/online_<date>.jsonl` (text only, gitignored), and given back to the cloud as session notes,
so later questions are answered from earlier ones (tested: "Which drink did they offer me earlier?" →
"You were offered a bottle of Ocean fruit drink earlier.", 2.0 s). Gemini now returns JSON (answer +
things). **Touch and point:** "what's this?" uses the last hand run that saw a hand, up to 3.5 s old;
"where am I pointing", "what I'm pointing at" are understood.

## D54 · 2026-11-01 · Online mode by triple tap, without a trace of the cloud; stopped reach off
**Team decisions:** (1) **three quick taps** (within 0.9 s) toggle online mode; the user hears a rising
triad and feels three short pulses for on, a falling triad and one long pulse for off; the presenter
sees an "ONLINE" marker; "go online / go offline" by voice still work. A second tap cuts the first
tap's brief. In online mode a single tap asks "Briefly, what is in front of me?". (2) **No trace of
the cloud** in speech: no "Let me ask online", no "the cloud says"; an answer Saarthi's map agrees with,
or cannot check, is said plainly; a contradiction still adds "But I see …, so I'm not sure." Failure:
"I couldn't find an answer this time." (3) The cloud may describe the whole scene, not only the table
(the room, people, pages, things in the hand); people only by number, place and what they do or hold,
**never identified**, no names, age, gender, feelings or faces (rule 7.6). (4) **Stopped reach off**
(team: low value once the move was announced; 2 of 10 live tries): `REACH_STOP = false`; hands no
longer run at full rate for it; code kept.

## D55 · 2026-11-01 · Cognitive analysis: what our data can and cannot show (research before the page)
Team request: replace the telemetry page by **two** graphs grounded in cognitive/statistical models
(as BKT and Ebbinghaus decay are in learning apps), each with a goal and a validation. Research: BKT
with forgetting (Qiu et al., EDM 2011: KT-Forget, fitted by EM, judged by AUC); exponential forgetting
with a half-life that grows with each repetition (half-life regression, Settles & Meeder, ACL 2016);
**no published decay curve of object-location memory over minutes for blind people was found.**
Tested on all recordings with `tools/belief_model.py` (development data):
1. **Belief tracing** (BKT-forget on the user's picture of each object): AUC of P(knows) before "where
   is my …?" vs other moments = **0.29-0.34 at every half-life (worse than chance)**: in our sessions the
   testers asked right after a brief, as tests, so asks do not measure forgetting. Not shown as is.
2. **Learning curve** (power law of practice, Newell & Rosenbloom 1981) on guided reaches: 16 reaches in
   one session, mixed targets and testers, 0.6-44 s: no learning trend can be claimed. Not shown.
3. **Survival of a told position** (Kaplan–Meier, 362 intervals, 114 moved or taken, 248 censored): 23%
   wrong within 30 s, 42% within 2 min, then flat (53% still right after 5 and 10 min); a constant-rate
   model (half-life 4.5 min) does **not** fit: change comes early (testers moved things soon after a
   brief). A real statistical finding about our test table, not about daily life.
Conclusion: real cognitive graphs need data collected for the purpose. Proposal to the team: see SESSIONS.

## D57 · 2026-11-01 · Phase 4.5 approved (team)
The team approved Phase 4.5 after testing on the Vivo: the real SOS drop (loud sound, then the drop,
SMS received), online mode and the diary passed; my watch, the moved-object fixes and touch and point
had passed earlier. Merged into `main`, tag `phase-4.5-approved`. Next: Phase 5 (hardening).

## D58 · 2026-11-03 · False alarms: watch only a still camera, judge in its image; "Did you mean …?"; cloud backups
**Problem** (team test 1 Nov 22:38, `session_20261101_223826.jsonl`): ~30 unasked moved / can't see / back
while the handheld phone was pointed at new things. Root causes (analysed 1 Nov): the gyro cannot see the
phone sliding, so computed positions jump; objects were compared with where they were *when told*,
minutes earlier and from another viewpoint; the apple picture on the laptop screen was taken as the told
apple; a warm phone's patchy detections; the speech model mishearing "real".
**Team decisions (3 Nov):** unasked alerts only once the phone has been still for a moment (the team will
hold still, with a phone holder, before an object is moved); "Did you mean …?" for mishearings; a backup
cloud model (gemini-flash-latest). No stand or chest mount is possible on stage.
**Built:**
- `beliefmap/Steadiness`: the camera is still when the gyro turns slower than 10°/s, the tracked objects'
  image boxes shift less than 3% of the frame between runs (lower median: one object being moved does not
  break it) and drift less than 6% overall (tuned on the two handheld recordings of 1 Nov: hand jitter
  1.7-3.6% per run; pointing somewhere new 3-7% per run, drift up to 10%).
- `beliefmap/StillWatch` (replaces the change detector's alerts): after 1.2 s of stillness the told
  objects' image boxes are the reference; while still, one that leaves its box and rests elsewhere 0.6 s =
  moved; one that vanishes from an uncovered box 2.5 s = can't see; seen again = back. Two of a kind:
  nothing. Another told object must stay in its box. A shake that returns to the same view within 10 s
  (the other objects back in their boxes) keeps the reference. **The user's own hand** (wrist nearer the
  image bottom than the fingertip) on an object within 6 s: its move or removal is theirs, the map is
  updated silently (PRD 5.1 edge case). The change detector still computes belief statuses for the Mind
  view, without speaking; while not still they read "camera not held still: not watching".
- **Replays:** the false-alarm session 42 → 2 alerts (old rules vs D58); the 1 Nov theory-of-mind
  session: the team's own bottle move is now silent (by the rule above), the mouse a hand took is still
  "can't see". Synthetic tests: a teammate's move with the phone still is said once after it rests; a
  shake mid-move is still caught; pointing elsewhere, a resting hand, an own move: silent.
- `intent/NearMiss`: an unknown request within edit-distance similarity 0.62 of a known one →
  "Did you mean: is this apple real?"; "yes" within 10 s runs it, "no" → "Okay." The three mishearings
  of 1 Nov ("…Korean?", "…apan Hireen?", "…apollaryal?") all map to "is this apple real".
- **Online:** gemini-flash-latest added after the two Flash-Lite and one Flash models; backups also asked
  in parallel; long-lived workers keep their HTTPS connections open and are warmed when online mode turns
  on. Six photo questions: 1.45-3.5 s (median ~2.2 s); the first of a session pays the connection.
- **On the Vivo (agent, 3 Nov):** a brief then 70 s still: no alert; "Is this apple Korean" → "Did you
  mean…" → "yes" → answered; online "what is in front of me" → "There is a mug in front of you." in 2.1 s.
  **Not yet tested by the team:** a teammate moving an object with the phone held still.

## D59 · 2026-11-03 · Heat: less work per frame, a heat tier from real signals, own hands seen as they come
**Baseline** (`tools/results/phase5_heat_baseline_20261101_223826.md`, team-driven, 11 min, dev build with the
camera view, USB, battery 100%): CPU 48 → 55 °C, skin 39 → 46 °C, battery 32 → 37 °C; Android's status
NOMINAL throughout. The big cores' cap stepped 2203 → 1995 → 1788 → 1719 → 1650 MHz as the phone warmed
(the vendor limiter acts from the first minute); 7 of 64 samples dipped to 840 MHz for a single sample (the
first report showed each minute's lowest sample, which made them look like a steady cap; now the median and
a dip count). Detector 4.7-5.7 runs/s (p50 120-136 ms) for the 11 min. App ~2.2 of 8 cores, by thread:
model workers (detector maths) ~47%, camera thread ~45% (two new 1.2 MB images per frame, 30 a second,
~72 MB/s), hand tracking's GL/GPU-driver threads ~40% at 3.6 runs/s, speech recognition 18% (while talking),
garbage collection ~16%, motion sensors ~10%.
**Changes** (`perf/WorkPolicy`, pure and unit-tested):
- **Camera:** the sensor keeps 30 fps (short exposures, no motion blur); only every 2nd frame is prepared
  (15 a second: the detector takes ~5, hands at most 4), every frame while a hand is guided, every 3rd when
  HOT. The two images are reused for every frame (pixels as `ImageProxy.toBitmap()`; rotation by a canvas
  without filtering), so the camera no longer makes garbage. `Frame.index` counts camera frames, so the
  lens check (every 5th) and the 2 s settle keep their timing.
- **Hands:** ~4 runs a second while a hand was seen in the last 5 s; ~2 a second otherwise (0.7 s when
  warm); full rate while guiding, teaching or asking about a watch (as before).
- **Heat tier** (`ThermalWatch`): the warmest of Android's status, the headroom forecast (0.85 / 0.95 /
  1.05), the battery temperature (39 / 42 / 45 °C) and the big cores' cap (≤ 1400 / ≤ 1100 MHz, 30 s
  median), read every 5 s; escalation at once, de-escalation after 20 s calm. **Starting values, not yet
  calibrated**: each is now in the `rates` feed message (feed v1 addition `heat`, `stride`) and in the heat
  report beside the real temperatures. CRITICAL limits the detector to 3 runs a second (was 1.7): D58's
  still-camera watch needs ≥ 3.
- **Dev only:** `am start ... --ez view false` turns the camera view off, so dev-build heat runs match the
  demo build (which never had a camera view).
**Wrong statements when warm (step 4):** the two D58 replays with detector runs thinned to 3.5 and 3 runs a
second (`ChangeReplayTest`, RECORDED). At 3.5 the theory-of-mind session added a false pair "I can't see your
apple" / "your apple is back": the user's own hand was seen in a single hand run, and no detector run fell
within that result's 450 ms freshness. **Fix:** `StillWatch.onHands` marks an own-hand touch at every hand run,
on the reference and latest boxes. After: the same alerts at 3.5 and 3 runs/s as at full rate (mouse gone and
back; the false-alarm session 1-2). The quieter hand rate above makes this fix necessary, not optional.
**Not done, with reasons:** feed traffic in idle periods (link + recorder threads ~1.4% of a core: not worth
the Mind view's refresh); skipping detector runs while still (D58 needs them); the embedder (already only
with both watches taught and a hand in view, verified in the code). **Not yet on the Vivo:** everything above
(phone away); the next 10-min heat run decides. 242 unit tests pass; dev and demo build.

## D60 · 2026-11-12 · Every move or removal is said; looser stillness; 20 prepared frames a second (team)
**Team test of D58 + D59 on the Vivo** (12 Nov, ~12 min, phone in a hand-held stand; `recordings/feed_20261112_042048.jsonl`,
RECORDED replay `RECORDED_phase5_d59test_20261112.jsonl`): everything else smooth, but moved objects and
objects taken away were "lacking a lot"; the phone got warm within 5 min; 15 prepared frames a second felt
likely to miss things. **Causes found in the recording:** (1) D58's watch was off ("camera not held still")
in 38% of detector runs, in ~75 spells of ~6 s, mostly because the hand-held stand turned faster than 10°/s;
a move made between spells becomes the new reference; (2) D58's own-hand rule silenced removals by hand:
each "can't see your apple" in the replay follows a hand reaching in, the apple absent for many seconds
with nothing over its spot, then a hand bringing it back. Heat: the big cores were capped at **840 MHz for
over 30 s** (30 s median) at battery 37 °C, headroom 0.87; the D59 tier went HOT and said so.
**Team decisions:** on stage the user or a teammate moves the objects, so **every move or removal is said,
whoever's hand** (this sets aside PRD 5.1's "user moves it themselves: stay silent"); 20-25 prepared frames.
**Changes:** `StillWatch(ownSilences = false)` (D58's rule kept behind the flag); `Steadiness` 10°/s, 3%, 6%
→ **15°/s, 4%, 8%** (watch on 62% → 71% of today's runs); `WorkPolicy.framesPerSecond`: **20** (30 while
guiding, 15 when HOT), spread evenly over the sensor's 30 (feed: `rates.preparedFps` replaces D59's `stride`).
**Compared on replays** (alerts; D58 / now / D58 + the old change detector while still):
false-alarm session 2 / **4** / 36; theory-of-mind session 2 / **7** (the apple and the mouse taken by a hand,
both said on the phone on 1 Nov) / 12; today 10 / **29** / 66. The hybrid brings the false alarms back:
rejected. Keeping a reference 60 s instead of 10 s changed nothing. At 3 detector runs a second the
theory-of-mind session falls to 3 alerts (the apple removal is missed): a warm phone still loses real alerts,
so keeping the detector above ~4 runs a second remains Phase 5's goal. Open: the bottle the team moved at
~442 s in that session is still not said in the replay. 244 unit tests; dev and demo build.

## D61 · 2026-11-12 · The Phase 4 change detector speaks again; D58's still-camera watch out of speech
**Team retest of D60** (12 Nov 04:48, phone in a hand-held stand; RECORDED `RECORDED_phase5_d60test_20261112.jsonl`):
moves and removals still "barely" said; "your cup was moved" when the team had moved the **bottle**
(screenshot); "right of the laptop" where Phase 4 said "right of the cup". **The recording:** the change
detector (silent since D58, its statuses still computed) marked the bottle moved at each of the team's bottle
moves; D58's still-camera watch (which spoke) said "cup moved" three times for bottle moves and "can't see /
back" twice for the laptop at the frame's edge (it lacks D45's frame-edge rule). **Replays** (alerts; D58 watch
/ D60 watch / change detector = Phase 4): today 4 / 11 / **18** (bottle moved at 220, 230, 242, 259, 288, 331,
338, 366, 420, 468 s; the apple taken and back twice; no laptop "can't see"); 1 Nov theory-of-mind 2 / 7 / **6**
(the apple and the mouse taken by a hand, and the bottle the team moved at ~442 s, all said); 1 Nov handheld
false-alarm session 2 / 4 / **42**. Gating the change detector by stillness kept 32 of those 42 and dropped
four real bottle moves today: not used.
**Decision:** alerts come from the change detector exactly as in Phase 4 (D25-D28, D32, D45); D58's watch
(`StillWatch`, `Steadiness`) is no longer called (kept with its tests, as measured alternatives). D58's "Did you
mean …?" and cloud backups stay. **Known limit, said openly:** pointing the phone around at new things can
again give false "moved" (the 1 Nov session); the demo holds the phone in the stand for the moved-object
moment. At a warm phone's 3-3.5 runs a second the change detector still says today's bottle moves; the 1 Nov
"cup moved" from lowering the camera (D45) comes back once.
**Relations:** a landmark (laptop, book) is used only when it is at most 8 cm farther than the nearest object
(`Relations.PREFER_LANDMARK_M`); before, the laptop won whenever it was within 35 cm. Unit test: a bottle next
to the cup is "right of the cup". 245 unit tests; dev and demo build; installed. **Not yet re-tested by the team.**

## D62 · 2026-11-12 · Heat is logged, never said (team)
Team: "The phone is getting hot; I'll look a little less often." sounds odd to the user. The heat tier still
slows work (D59) and is published in `health` and `rates` (Mind view, heat report), but nothing is said or
shown on the phone. Also confirmed for the team: the app is the approved Phase 4.5 (`main`) plus Phase 5's
changes; only the moved / can't see / back speaker returned to its Phase 4.5 form (D61), every Phase 4.5
feature (theory-of-mind panel, my watch, SOS, online mode, diary, insights) is untouched.

## D63 · 2026-11-28 · Active acoustic FMCW glass probe discarded after Vivo V21e hardware check
Tested on branch `hackathon/acoustic-probe` (`FmcwProbe.kt`, `AcousticHardwareCheck.kt`) to decide whether the
Vivo V21e speaker + `AudioRecord` at 48 kHz could reliably detect a 18–20 kHz differential echo from a clear
drinking glass at 15–50 cm. **Empirical measurements on the Vivo V21e (stationary, 80% media volume `12/15`):**
(1) `AudioManager.PROPERTY_SUPPORT_AUDIO_SOURCE_UNPROCESSED` is **`false`** (Android routes audio through
the HAL's standard DSP/AGC/noise-suppression path); (2) at `18–20 kHz`, `rxMaxAbs = 0.0073` (`-43 dBFS`),
`directPeak = 0.018–0.026`, and loopback SNR was only `12.9–17.2 dB` (`16–18 kHz` gave `directPeak = 0.062–0.064`,
loopback SNR `9.5–16.3 dB`); (3) back-to-back empty-table repeats 3 s apart showed `25.4%` median residual
(`peakDelta = 0.346`) at `18–20 kHz` and `20.5%` (`peakDelta = 0.303`) at `16–18 kHz`, roughly 10× larger than
a real 15–50 cm glass reflection (`1–3%` of direct leakage). **Decision:** Discarded cleanly (`hackathon/acoustic-probe`
kept as negative-result reference; not merged into `phase-5/heat`). Honest boundary for judges: transparent
glassware requires either a phone with `PROPERTY_SUPPORT_AUDIO_SOURCE_UNPROCESSED = true` or external hardware,
rather than faking or shipping an unreliable chirp on this handset.

