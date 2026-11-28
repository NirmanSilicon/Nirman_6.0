# Saarthi Android app

The phone app: everything fast, and everything that steers the user's hand (PRD section 4).
Package `ai.saarthi.app`.

## Flavours

| Flavour | Application id | Contains |
| --- | --- | --- |
| `dev` | `ai.saarthi.app.dev` | The app plus developer tools: the Phase 0 benchmark screen ("Saarthi DEV bench"), and later anything simulated, always labelled |
| `demo` | `ai.saarthi.app` | The stage build. The `dev` source set is not compiled into it, so mocks and tools cannot be switched on (PRD rule 7.1) |

## Build (Windows)

Gradle 8.12 needs JDK 17 or 21; the system default on the team laptop is JDK 25, which does not work.

PowerShell:

```powershell
$env:JAVA_HOME = "$env:USERPROFILE\.jdks\ms-21.0.12.1"   # any JDK 17 or 21
cd android
.\gradlew.bat testDevDebugUnitTest assembleDevDebug assembleDemoDebug
```

`local.properties` (not in git) must point at the SDK with forward slashes:
`sdk.dir=C:/Users/<you>/AppData/Local/Android/Sdk`.

## Run the app (dev build) and read its session file

Git Bash (the `//sdcard` form stops Git Bash rewriting the phone path):

```bash
adb install -r app/build/outputs/apk/dev/debug/app-dev-debug.apk
adb shell pm grant ai.saarthi.app.dev android.permission.CAMERA
adb shell am start -n ai.saarthi.app.dev/ai.saarthi.app.app.MainActivity
adb shell ls //sdcard/Android/data/ai.saarthi.app.dev/files/sessions/
bash ../tools/push_stt_models.sh dev     # speech models (once per install)
```

Tap the screen for a brief; hold it (over 0.35 s) to ask a question. The status line shows the
camera, detector and hand rates and the camera's tilt.

Replay a session in unit tests (RECORDED): pull it from `files/sessions/`, then
`python tools/extract_replay.py <session.jsonl> app/src/test/resources/testdata/RECORDED_<name>.jsonl`
(keeps raw detections, poses and requests; see `WorldMapReplayTest`).

## Run the benchmark screen

```bash
adb install -r app/build/outputs/apk/dev/debug/app-dev-debug.apk
adb shell pm grant ai.saarthi.app.dev android.permission.CAMERA
adb shell am start -n ai.saarthi.app.dev/ai.saarthi.app.bench.BenchActivity
adb pull /sdcard/Android/data/ai.saarthi.app.dev/files/bench/ tools/results/
```

Results are written as JSON files, not to logcat: this vivo build only logs Error-level messages.

## Packages

| Package | What it does, in plain words | Tests |
| --- | --- | --- |
| `app` | The app shell: one full-screen control (`MainActivity`) and `SaarthiCore`, which only wires the packages below together | Run on the phone |
| `capture` | The back camera as upright frames of about 480 × 640 (sensor at 30 fps, exposure pinned so dim light cannot slow it). Only `preparedFps` of them are prepared (20 a second; 30 while guiding a hand, 15 when hot; D60), into two images reused for every frame (D59). Frames arriving while the consumer is busy are dropped, never queued. `FrameStats` measures the real rate of prepared frames | `FrameStatsTest`; run on the phone |
| `record` | `SessionRecorder`: one JSON-lines file per session (`files/sessions/`), written on its own thread; never camera frames. Holds the same feed messages the laptop gets | Run on the phone |
| `perception` | Detector (EfficientDet-Lite0, own thread) → `ObjectTracker` (one track per object, confirmed after 3 sightings, consistency over 1.5 s) → table height → world map, each run placed with the pose of its own frame. `SpokenNames` (demo kit) | `ObjectTrackerTest` |
| `orientation` | `Orientation`: which way the camera points, from the gravity sensor (tilt, roll) and the gyro (turn), with a slow average of the turn as the user's forward; keeps 2 s of poses so a frame gets its own (D19). `Pose`: one instant | `TableGeometryTest` (gravity → tilt); on the Vivo: +47° looking at a desk, −86° at the ceiling |
| `table` | Where things are on the table without ARCore or depth: `CameraModel` (Camera2 focal length), `TableGeometry` (a pixel's ray meets the table; world and body frames; the camera's footprint), `TableHeight` (the camera's height from known-size kit objects, else 0.40 m), `Placement`/`Reach`/`Clock` (reach zones, clock directions; D20) | `TableGeometryTest` (synthetic scenes) |
| `worldmap` | `WorldMap`: one entry per physical object or person in a table frame that stays put while the camera turns; in view / out of view / not seen; resting / moving; merges entries split by pans (D21). `Relations`: "behind the laptop". `Scene`: what a sentence is judged from | `WorldMapTest` (synthetic), `WorldMapReplayTest` (RECORDED handheld session) |
| `beliefmap` | `BeliefMap`: what the user was told and where (in camera-height units). `ChangeDetector`: divergence: moved (rests 20 cm+ away for 0.6 s), can't see (spot in view, camera still, scene intact, 3-5 s), back again; hidden by a hand or person = no evidence (D25-D28) | `ChangeDetectorTest`, `ChangeReplayTest` (RECORDED) |
| `guidance` | One event stream for reach guidance (D29): `HandGuide` (fingertip to target on a beat; wrong-way correction at once; arrival on the last known box), `AimGuide` (no hand: steer the camera), `Guidance` (session: modes, timeout), `ReachBias` (learns stopping short or drifting), `Phrases` (every cue, pre-recorded at start-up, D30) | `GuidanceTest` |
| `reach` | Stop the wrong reach (D46): `ReachPredictor` (the hand's course over 0.6 s → the spot it heads to; only the user's own hand; two checks in a row), `ReachWatch` (watched spots from the belief map: old spots for 90 s after a correction, and contradicted spots not yet said; one sentence each), `StopPhrases` (pre-recorded "Wait, your bottle moved; …") | `ReachPredictorTest`; `tools/reach_study.py` on recordings |
| `personal` | My watch and "what's this?" (D49): `Embedder` (MediaPipe Image Embedder on a crop, own thread), `HandRegion` (the region around the grip or the fingertip), `PersonalObjects` (taught views; decided by the gap between the user's object and the look-alike, "not sure" in between), `TouchAsk` (touch, else a line along the index finger; two objects on the line are both named), `PersonalController` (teach for 3 s, ask, what's this, wrong pick-up once per 30 s; views kept as numbers in `files/personal_objects.txt`) | `PersonalTest`; `tools/personal_eval.py` on the team's photos |
| `safety` | Safety SOS (D47): `FallDetector` (free fall ≥ 0.3 s then an impact > 2.5 g), `LoudSpike` (a sudden sound far above the room; loudness only), `SosMessage` (the SMS: most probable situation, no numbers, approximate place), `Sos` (sensors, mic level, the 15 s countdown, location, SMS; contact in `files/sos_contact.txt`) | `SosLogicTest`; `adb shell am broadcast -a ai.saarthi.dev.FALL` (dev) |
| `system2` | Real vs picture (docs/SYSTEM2.md, Phase 4). `Ledger`: per object, evidence in log-likelihood ratios, counted once per new view (time or a camera turn, never per frame), each cue capped, old evidence dropping out; Wald's bounds decide real / picture / unsure. `RealityCheck`: runs the cues each detector run (so far: inside a laptop, tv or phone box) and gives each object an `Assessment` with its reasons; any net picture evidence holds a statement back | `LedgerTest` |
| `ocr` | `TextReader`: "read this" — ML Kit (Latin, Devanagari), heading first (tallest lines), the rest on "read on" (D27) | `TextReaderTest` |
| `hands` | `HandTracker`: MediaPipe Hand Landmarker, GPU, video mode, own thread, newest frame; 21 landmarks per hand (D22) | Run on the phone (9.5–12 runs/s beside the detector) |
| `brief` | `BriefComposer`: what may be said and why the rest is left out (D10, D12, D14, D15, D21), each object placed by clock direction and reach zone when the phone knows its orientation, else left / in front / right | `BriefComposerTest`, `BriefReplayTest` (RECORDED), `WorldMapTest` |
| `speech` | `Speaker`: system voice, interruptible, with prepared clips for instant briefs (D11). `VoiceInput`/`PushToTalk`/`WhisperEngine`: hold to talk, offline Whisper (D17) | `WavClipTest`, `WordErrorRateTest`, `VoiceInputTest`; bench `-e test speaker`; `SttBenchActivity` |
| `intent` | `IntentInterpreter`: what was asked (rule grammar, incl. "what is on my right?" and "what can I reach?"); `ObjectWords`: spoken word → kit class; `Answerer`: one true sentence from the world map (finds name a relation; an object out of view says when it was seen) | `IntentInterpreterTest` (dev + RECORDED phrase sets), `AnswererTest`, `WorldMapTest` |
| `feedback` | Earcons: HEARD ("heard you"), LISTENING ("mic open"), CHANGED ("something you know changed"); `Haptics`: one vibration pattern per guidance event (no amplitude control on the Vivo) | `EarconsTest` |
| `health` | `CameraHealthMonitor`: lens covered or scene too dark (debounced); `ThermalWatch`: phone heat from Android's status, its headroom forecast, the battery temperature and the big cores' clock cap, every 5 s (D59) → the heat tier. Each change is said once | `CameraHealthMonitorTest` |
| `link` | `FeedLink`: TCP to the laptop over `adb reverse`, acks, lost/reconnect, never blocks; `FeedMessages`: feed v1 | Run with `laptop/link/feed_server.py` |
| `perf` | `LatencyStats`: count, mean, 50th/90th percentile (nearest-rank, never interpolated) and maximum of measured durations. `WorkPolicy` (D59): the heat tier from all signals; how many camera frames are prepared; how often hands run (4/s with a hand seen in the last 5 s, else 2/s; full rate while guiding or teaching); the detector never below 3 runs a second | `LatencyStatsTest`, `WorkPolicyTest` |
| `bench` (dev only) | Phase 0 checks: speech start-up and latency, vibration, camera frame rate; saves one JSON per run | Run on the phone |
