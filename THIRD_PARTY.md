# Third-party code, models and permissions

Every dependency, reused file and permission is recorded here (PRD rule 7.7, Constitution 2.5).

## Reference copies (read-only, git submodules)

| Copy | Source | Pinned commit | License / permission | Use |
| --- | --- | --- | --- | --- |
| `secondsense/` | https://github.com/GargBhavya-tech/secondsense | `cc122ea6529f0801f55f608f1cc5a8f091c76f75` | No license file. Written permission from the owners (Bhavya), kept locally in `docs/permissions/` (not pushed) | Foundation; port modules with attribution (PRD 3.1) |
| `sightbuddy/` | https://github.com/DrophouseLtd/SightBuddy | `578771de25c87ce1c440e890b5f23853e096592f` (2026-09-23) | MIT, Copyright (c) 2026 Drophouse Ltd | Speech, cues, haptics, camera pipeline, intent resolver (PRD 3.2) |

SightBuddy also contains an optional OpenAI path (`core/llm/`, API key) and a 2.6 GB on-device Gemma
model. **Neither is ported**: Saarthi is offline at runtime (PRD rule 7.3).

## Ported files

Each ported file gets a row: source path → destination path, what changed, and an attribution
header in the file.

| Source | Destination | What changed |
| --- | --- | --- |
| SB `core/CameraXManager.kt` (MIT) | `android/.../capture/CameraSource.kt` | Kept: bind/stop/shutdown structure, keep-only-latest backpressure. Dropped: preview, torch, throttle, coroutine channel. Added: RGBA frames rotated upright, 30..30 fps exposure pin (from Saarthi Phase 0 code) |
| SS `inference/decode/DetectionStabilizer.kt` (permission) | `android/.../perception/ObjectTracker.kt` | Kept: tracks across frames, EMA score, confirm after N hits. Changed: IoU matching first with SS's centre gate as fallback, stable ids and boxes, time-based expiry, no score boost/penalty (a `confirmed` flag instead) |
| SS `inference/decode/CocoLabels.kt` (permission) | `android/.../perception/SpokenNames.kt` | Kept: the idea of mapping COCO names onto a smaller vocabulary. Changed: spoken table vocabulary; off-table classes marked; no index table (MediaPipe gives names) |
| SS `sonification/Earcons.kt`, `output/AudioOutput.kt` `playBlip` (permission) | `android/.../feedback/Earcons.kt`, `EarconPlayer.kt` | Kept: notes with attack/release envelope, one thread, drop if busy. Changed: Saarthi's own vocabulary (HEARD); rendered once; mono low-latency track |
| SB `core/TTSService.kt` (MIT) | `android/.../speech/Speaker.kt` | Kept: start at launch, English fallback, progress listener, interruptible speech. Dropped: flows, cooldowns, mute, mic floor. Added: Indian English first, warm-up, prepared clips, timing |
| SB `core/stt/WhisperEngine.kt` (MIT) | `android/.../speech/WhisperEngine.kt` | Kept: sherpa-onnx offline Whisper config, transcribe-an-utterance. Dropped: Silero VAD. Added: load by model name, load time |
| SB `core/stt/VoiceInputService.kt` recording loop (MIT) | `android/.../speech/PushToTalk.kt` | Kept: AudioRecord 16 kHz mono, short→float, hard cap. Dropped: coroutines, cloud, Gemma, VAD |
| SS `voice/IntentInterpreter.kt`, `voice/VoicePipeline.kt` `TargetNoun` (permission) | `android/.../intent/IntentInterpreter.kt` | Kept: ordered rule-and-synonym grammar, closed intent set, Unknown fallback. Changed: table intents; objects resolved onto the demo kit |
| SS `inference/decode/CameraHealthMonitor.kt` (permission) | `android/.../health/CameraHealthMonitor.kt` | Kept: covered/dim tests, thresholds, debounce. Dropped (for now): mount-angle check |
| SS `perf/ThermalGovernor.kt` (permission) | `android/.../health/ThermalWatch.kt` | Kept: thermal status → tiers, hysteresis, spoken notice. Dropped: headroom/battery/latency fusion, PerfPolicy |
| SS `voice/SceneNarrator.kt`, `memory/MemoryPhrase.kt` (permission) | `android/.../brief/BriefComposer.kt` | Kept: one sentence from current detections, coarse direction buckets, no language model. Changed: table scale, confirmed confident tracks only, grouping, people counted, left-out reasons |
| SS `inference/decode/OpticalFlow.kt` `trackPoint`, `GroundFlowConsistency.kt` `fitAffine` (permission) | `android/.../system2/PlanarMotion.kt` | Kept: single-window iterative Lucas-Kanade, 3x3 normal-equation affine fit. Changed: 2-level pyramid, smallest-eigenvalue texture test, precomputed gradients, outlier refit; the test is object points against a ring around the object (D36) |

## Dependencies

| Name | Version | License | Where |
| --- | --- | --- | --- |
| OpenVINO (Python) | 2026.4.1 | Apache-2.0 | `laptop/.venv` (laptop models and benchmarks) |
| Android Gradle Plugin | 8.7.3 | Apache-2.0 | `android/` build |
| Kotlin (Android plugin, stdlib) | 2.0.21 | Apache-2.0 | `android/` |
| androidx.core:core-ktx | 1.13.1 | Apache-2.0 | `android/app` |
| androidx.activity:activity-ktx | 1.9.3 | Apache-2.0 | `android/app` |
| androidx.camera (core, camera2, lifecycle) | 1.3.4 | Apache-2.0 | `android/app` (camera) |
| JUnit | 4.13.2 | EPL-1.0 (tests only, never shipped) | `android/app` unit tests |
| Gradle wrapper | 8.12 | Apache-2.0 | `android/gradlew*`, `android/gradle/wrapper/` |
| MediaPipe Tasks Vision | 0.10.35 | Apache-2.0 | `android/app` (object detector, both flavours since Phase 1) |
| TensorFlow Lite | 2.17.0 | Apache-2.0 | `android/app` dev flavour (NNAPI check) |
| ML Kit text recognition, Latin + Devanagari (bundled models) | 16.0.1 | Google ML Kit / Google APIs Terms of Service: free, offline with bundled models, **not an open-source licence** [accepted by the team for the demo build, 31 Oct; D33] | `android/app` both flavours (`ocr/TextReader.kt`, since 30 Oct) and dev benchmarks |
| huggingface_hub | 2.3.0 | Apache-2.0 | `laptop/.venv` (model download) |
| tokenizers | 0.23.3 | Apache-2.0 | `laptop/.venv` (Florence-2, Grounding DINO text) |
| numpy | 2.4.6 | BSD-3-Clause | `laptop/.venv` |
| Pillow | 13.0.0 | MIT-CMU (HPND) | `laptop/.venv` |
| FastAPI | 0.162.0 | MIT | `laptop/link` (feed relay, blueprint server) |
| Starlette (FastAPI dependency) | 1.10.0 | BSD-3-Clause | `laptop/link` |
| Pydantic, pydantic-core (FastAPI dependency) | 2.14.1, 2.50.1 | MIT | `laptop/link` |
| uvicorn | 0.54.0 | BSD-3-Clause | `laptop/link` (web server) |
| websockets | 17.3 | BSD-3-Clause | `laptop/link` (WebSocket to displays) |
| anyio, h11, click, idna, annotated-types, typing_extensions (transitive) | 4.15.1, 0.16.0, 8.5.0, 3.20, 0.8.0, 4.16.0 | MIT, MIT, BSD-3, BSD-3, MIT, PSF | `laptop/link` |
| androidx.camera:camera-view | 1.3.4 | Apache-2.0 | `android/app` (dev camera view, D13) |
| sherpa-onnx (Android AAR, includes ONNX Runtime) | 1.13.4, sha256 `03f9c4df…` | Apache-2.0 (ONNX Runtime: MIT) | `android/app/libs/` (fetched, not in git): offline speech recognition (D17) |
| opencv-python-headless | 5.0.0 | Apache-2.0 | `laptop/.venv`: offline System 2 cue study (`tools/system2_cue_study.py`, `tools/export_plane_fixture.py`); laptop checks later |
| mediapipe (Python) | 1.2.0 | Apache-2.0 | `laptop/.venv`: runs the phone's own detector on recorded clips (cue study) |
| opencv-contrib-python, matplotlib, sounddevice, absl-py, flatbuffers (mediapipe's dependencies) | 5.0.0.93, 3.11.2, 0.5.6, 2.5.1, 25.12.19 | Apache-2.0, Matplotlib (PSF-style, permissive), MIT, Apache-2.0, Apache-2.0 | `laptop/.venv` (study only) |

## Models

Weights are never in git. Phone models: `bash tools/fetch_models.sh` (sha256 pinned). Laptop models:
`laptop\.venv\Scripts\python laptop/bench/fetch_models.py`.

| Model | Variant | License | Source (commit) | Where |
| --- | --- | --- | --- | --- |
| EfficientDet-Lite0 (COCO) | int8 and float32 `.tflite` (MediaPipe) | Apache-2.0 | storage.googleapis.com/mediapipe-models, sha256 in `tools/fetch_models.sh` | `android/app/src/main/assets/models/` |
| EfficientDet-Lite2 (COCO) | int8 `.tflite` (MediaPipe), dev trial only (D15) | Apache-2.0 | storage.googleapis.com/mediapipe-models, sha256 in `tools/fetch_models.sh` | `android/app/src/main/assets/models/` |
| Whisper base.en and tiny.en (OpenAI), sherpa-onnx int8 export | `sherpa-onnx-whisper-{base,tiny}.en` | MIT (Whisper); export Apache-2.0 | github.com/k2-fsa/sherpa-onnx releases `asr-models`, archive sha256 in `tools/push_stt_models.sh` | phone `files/stt/` (pushed, D17) |
| MediaPipe Image Embedder (MobileNet-V3 small) | float32 `.tflite` (MediaPipe), personal object "my watch" (D49) | Apache-2.0 | storage.googleapis.com/mediapipe-models, sha256 in `tools/fetch_models.sh` | `android/app/src/main/assets/models/mobilenet_v3_small_embedder.tflite` |
| MediaPipe Hand Landmarker | float16 `.task` | Apache-2.0 | storage.googleapis.com/mediapipe-models, sha256 in `tools/fetch_models.sh` | `android/app/src/main/assets/models/` |
| Depth-Anything-V2-Small | ONNX fp32 | Apache-2.0 | onnx-community/depth-anything-v2-small @ `4472b73`; model.onnx sha256 `afb6a5c2…` | `laptop/models_cache/` |
| Grounding DINO tiny | ONNX fp32 | Apache-2.0 | onnx-community/grounding-dino-tiny-ONNX @ `ff690b0`; model.onnx sha256 `267c8b00…` | `laptop/models_cache/` |
| Florence-2-base-ft | ONNX fp32 (5 parts) | MIT | onnx-community/Florence-2-base-ft @ `e88a44e` | `laptop/models_cache/` |

Test images for laptop benchmarks: the real photos in the `secondsense/` reference copy (read-only),
until the team's own table photos exist.
