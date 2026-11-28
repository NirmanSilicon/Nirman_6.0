# SAARTHI — Master Feature & Hackathon Readiness Tracker

Single source of truth for every feature in SAARTHI: what is **already built & working (`✅`)**, what is **built behind a flag or needs hardware confirmation (`☑️`)**, and what we are **upgrading for the 18-hour Hackathon rounds (`🟡` / `⬜`)**.

---

## 1. Completed & Working Features (Verified in Codebase)

### A. Perception, Table Geometry & Spatial World Map
| Status | Feature | Module / Files | Notes / Honest State |
| :---: | :--- | :--- | :--- |
| ✅ | **30 fps Capture & Frame Stride** | `capture/CameraSource.kt`, `perf/WorkPolicy.kt` | Reuses 2 native bitmaps (zero GC churn); prepares 20 fps normally, 30 fps while guiding, 15 fps when hot (D59/D60). |
| ✅ | **Offline Object Detection + Tracking** | `perception/FastDetector.kt`, `ObjectTracker.kt` | EfficientDet-Lite0 int8, COCO demo kit mapped to natural names (`dining table` → `table`, `cell phone` → `phone`). |
| ✅ | **No-ARCore Table Geometry** | `orientation/Orientation.kt`, `table/TableGeometry.kt`, `TableHeight.kt` | Fuses `TYPE_GRAVITY` + `TYPE_GYROSCOPE` (no magnetometer) + Camera2 intrinsics + known-width rulers (bottle, cup, apple, orange) to place objects in metres and reach zones. |
| ✅ | **Plain Natural-Language Directions** | `table/Placement.kt`, `brief/BriefComposer.kt` | Speaks `"in front of you"`, `"slightly to your left/right"`, `"on your left/right"` + reach zones (`within reach`, `just beyond reach`, `out of reach`) (D24). |
| ✅ | **Persistent World Map & Relations** | `worldmap/WorldMap.kt`, `Relations.kt` | Tracks `in view / out of view / not seen`, resting vs moving, merges duplicates, computes relative anchors (`"right of the cup"`, `PREFER_LANDMARK_M = 0.08`, D61). |
| ✅ | **Hand Tracking & Hand-Not-Person Rule** | `hands/HandTracker.kt`, `SaarthiCore.kt` | MediaPipe GPU Hand Landmarker; stops hands from being miscounted as a `"person"` (D22); throttles to 2/s when no hand seen for 5s (D59). |

### B. Machine Theory of Mind & Memory (Signature USPs)
| Status | Feature | Module / Files | Notes / Honest State |
| :---: | :--- | :--- | :--- |
| ✅ | **Settle-In Brief & Salience** | `brief/BriefComposer.kt`, `SaarthiCore.kt` | Tap = short brief (3–5 objects); second tap repeats only what changed (D27). |
| ✅ | **Two-Map Sally–Anne Divergence** | `beliefmap/BeliefMap.kt`, `ChangeDetector.kt` | Tracks `WorldMap` vs spoken `BeliefMap`; proactively silent until moved / can't see / back, with camera-move guards (D45, D61). |
| ✅ | **The Voice Diary (Notes & Recall)** | `diary/Diary.kt`, `SaarthiCore.kt` | `"Note: ..."` saves timestamped notes; `"Read my notes"` lists them; any unmatched question finds word-overlap notes (`"You noted at 18:12: ..."`). *Session RAM only.* |
| ✅ | **Spatial Survival Decay** | `insight/SpatialDecay.kt`, `laptop/analysis/insights.py` | Kaplan–Meier decay rates per class (`bottle 0.325/min` vs `laptop 0.010/min`); adds `", but it may have been moved since"` when $P < 0.5$ (D56). |
| ✅ | **Remembered Recall ("Where is my…?")** | `intent/Answerer.kt` | Answers location of out-of-view objects from memory with age + decay probability. |

### C. System 2 Physical Verification (Anti-Spoof)
| Status | Feature | Module / Files | Notes / Honest State |
| :---: | :--- | :--- | :--- |
| ✅ | **The Torch Test (Real vs Screen Photo)** | `system2/TorchCheck.kt`, `Ledger.kt` | Exposure-locked flash off/on differential + unevenness check + Wald SPRT bounds; passed 9/10 on Vivo exit check (D38–D42). |
| ✅ | **Size Plausibility Check** | `system2/SizeCheck.kt` | Holds back physically implausible detections (e.g. a 25 cm `"apple"`) from speech (D41). |
| ☑️ | **Background Motion / Screen-Box Cues** | `system2/PlanarMotion.kt`, `RotationFlow.kt` | Shown on Mind View telemetry only; excluded from speech after D42 (torch test decides). |

### D. Hand Guidance & Personal Object Identification
| Status | Feature | Module / Files | Notes / Honest State |
| :---: | :--- | :--- | :--- |
| ✅ | **Closed-Loop Reach & Aim Guidance** | `guidance/HandGuide.kt`, `AimGuide.kt`, `Phrases.kt` | Instant pre-synthesised cues (`"Left."`, `"A little forward."`, `"You're touching it."`), wrong-way correction (`"Other way: right."` in ~0.4 s) (D29–D31). |
| ✅ | **Adaptive Proprioceptive Reach Bias** | `guidance/ReachBias.kt` | Detects consistent short/sideways pause bias across 3–6 reaches (`"You tend to reach a bit short; I'll guide you further."`) and offsets cues (D29, D48). |
| ✅ | **Point-and-Ask ("What's this?")** | `personal/TouchAsk.kt` | Identifies object under fingertip (touch) or along index knuckle-to-tip ray (pointing) (D49, D53). |
| ✅ | **Personal Object ID ("My Watch")** | `personal/PersonalObjects.kt`, `Embedder.kt` | 3s voice enrolment + MobileNet-V3 embeddings; gap-based decision (`yours` vs `look-alike`); 78/78 on held-back team photos (D49–D52). |
| ☑️ | **Stopped Reach (Mid-Air Halt)** | `reach/ReachWatch.kt`, `ReachPredictor.kt` | Built & unit-tested (D46), currently **disabled by flag** (`REACH_STOP = false`, D54) after team preferred move alerts. Can be toggled if needed. |

### E. Speech, Reading, Safety & Edge Resilience
| Status | Feature | Module / Files | Notes / Honest State |
| :---: | :--- | :--- | :--- |
| ✅ | **Offline Speech-to-Text + Near-Miss** | `speech/WhisperEngine.kt`, `intent/NearMiss.kt` | Whisper `base.en` via sherpa-onnx + `"Did you mean: …?"` edit-distance recovery (D17, D58). |
| ✅ | **Book / Page Reading (OCR)** | `ocr/TextReader.kt` | ML Kit Latin + Devanagari; `"Read this"` speaks heading first, `"Read on"` continues (D27). |
| ✅ | **Safety SOS (Fall + Loud Sound + SMS)** | `safety/FallDetector.kt`, `LoudSpike.kt`, `Sos.kt` | Free-fall + $>2.5g$ impact + loud-sound check $\to$ 15s loud countdown $\to$ offline SMS + coarse GPS to trusted contact (D47, D57). |
| ✅ | **Optional Verified Online Mode** | `online/CloudCheck.kt`, `laptop/online/cloud_brain.py` | Triple-tap toggles Gemini Flash-Lite (off by default); cross-checked against local `WorldMap` (`"But I see…, so I'm not sure"`); online session memory (D51–D54). |
| ✅ | **Degradation & Silent Thermal Governor** | `health/CameraHealthMonitor.kt`, `ThermalWatch.kt` | Covered-lens / dark-room alerts; silent heat tier logging (`NOMINAL`/`WARM`/`HOT`/`CRITICAL`) adjusting stride & detector floor (D18, D59, D62). |

### F. Laptop HUD, Analytics & Pitch Tools
| Status | Feature | Module / Files | Notes / Honest State |
| :---: | :--- | :--- | :--- |
| ✅ | **USB Feed Link + Session Recorder** | `link/FeedLink.kt`, `record/SessionRecorder.kt`, `laptop/link/feed_server.py` | Non-blocking TCP over `adb reverse tcp:8765`, cable-pull safe, records `.jsonl` sessions. |
| ✅ | **Mind View & Insights Telemetry** | `laptop/blueprint/index.html`, `telemetry.html` | Live world/belief map, System 2 evidence, actions, Kaplan–Meier decay & co-occurrence graph. *(Visual upgrade planned below.)* |
| ✅ | **Evaluation Simulator & Optical Proof** | `tools/sim/index.html`, `generate_heatmap.py` | 5-module interactive showcase + real `Real_Apple.jpg` vs `Image_Apple.jpg` curvature heatmap & SPRT graph. |

---

## 2. Hackathon Finals Upgrades & Execution Tracker (18-Hour Plan)

| Status | Planned Item | Round Target | Why It Wins Points |
| :---: | :--- | :--- | :--- |
| ✅ | **3D / 2.5D Spatial Mind View Upgrade** | Round 1 & 2 | Replaced flat 2D plan in `laptop/blueprint/` with a 2-metre-readable **2.5D Perspective Tabletop + D24 Plain Directions** (`Left`, `Slightly Left`, `In Front`, `Slightly Right`, `Right`), clipped reach arcs, camera FOV, World vs. Belief ghosts + divergence tether (`hackathon/mindview-hud`, verified on real replays in Chrome). |
| ✅ | **Signal-vs-Noise Dynamic Decision Log** | Round 1 & 2 | Upgraded `timeline` in `laptop/blueprint/`: muted routine telemetry (`AUDIO`, `SYSTEM`, steady `HEALTH`/`LINK`), highlighted cognitive decisions (`ALERT`, `TORCH`, `SYSTEM 2`, `GUIDE`, `DIARY` `note` add/recall, `WATCH`, `ONLINE`, `SOS`, `BRIEF`, `HEARD`) with `"Why I spoke / stayed silent"` lines + `[All Stream | Decisions Only]` filter. |
| ✅ | **Real-Time Decision Trace / Arbitrator Card** | Round 2 | Live header Cognitive Economy Counter (`Frames Observed | Proactively Suppressed | Decisions Spoken`) computed strictly from incoming `shared/feed/v1/` messages. |
| ❌ | **Active Acoustic FMCW Glass Probe (Feasibility Check)** | Round 2 (Rejected) | Tested on Vivo V21e (`hackathon/acoustic-probe`, D63): `UNPROCESSED` unsupported (`false`), 18–20 kHz loopback SNR only `12.9–17.2 dB`, and stationary empty-table residuals hit `25–35%` vs. `1–3%` glass echo. Discarded cleanly rather than shipping unreliable hardware behavior. |
| ✅ | **Pre-Event Vivo D60–D62 Retest & Demo Pack** | Before Round 1 | Fixed `ChangeDetector` repeated-move loop (`peerUnits` epoch baseline), verified 246/246 unit & replay tests, built & installed `devDebug`/`demoDebug`, synced `personal_objects.txt` + `sos_contact.txt` to `demo`, and confirmed move detection live on Vivo V21e. |

---

*Legend: `✅` Built & verified · `☑️` Built, optional/flagged · `🟡` In progress · `⬜` Planned*
