# SAARTHI — System Overview & Functional Architecture

> **Saarthi** (*the charioteer*): *"Krishna did not fight Arjuna's battle; he kept him oriented and told him what mattered at the moment it mattered."*
>
> **Core Principle:** *"Saarthi tells you only what you don't already know: what's new, what changed, and what you've got wrong."*

SAARTHI is a tabletop cognitive-assistance system for blind and low-vision users. Rather than continuously narrating everything a camera sees, SAARTHI maintains a persistent spatial model of the tabletop (**World Map**) alongside a model of what the user currently knows (**Belief Map**), speaking only when something is new, moved, misremembered, physically spoofed, or needed to guide a hand reach.

---

## 1. System Architecture & Hardware Split

SAARTHI operates offline-first across two compute tiers connected over USB (`adb reverse tcp:8765`, with laptop hotspot fallback):

- **Phone Tier (Vivo V21e 5G, 8 GB, no ARCore — chest-mounted or handheld):**
  Handles all latency-critical perception and user interaction: 30 fps camera capture, IMU orientation, on-device object detection and tracking, hand landmarking, no-ARCore tabletop geometry, World/Belief maps, System 2 physical verification, closed-loop reach guidance, offline Whisper speech recognition, ML Kit OCR, Safety SOS, and thermal management.
  *Graceful degradation:* If the laptop link drops, the phone continues operating autonomously with core offline capabilities and notifies the user.
- **Laptop Tier (Core Ultra 7 155H, 16 GB, Arc graphics, NPU):**
  Runs the live **2.5D Spatial Mind View HUD**, telemetry & Kaplan–Meier spatial insights, session `.jsonl` recording/replay, evaluation tools, and optional verified cloud assistance.

---

## 2. Core Functional Pillars

### A. Perception, No-ARCore Table Geometry & Spatial World Map
* **`30 fps` Adaptive Capture (`capture/CameraSource.kt`, `perf/WorkPolicy.kt`):** Reuses two native bitmaps for zero GC churn; dynamically scales frame rate (`20 fps` baseline, `30 fps` during active hand guidance, `15 fps` under thermal load).
* **Offline Object Detection & Tracking (`perception/FastDetector.kt`, `ObjectTracker.kt`):** Runs quantized `EfficientDet-Lite0` (int8), mapping standard labels into natural tabletop terms (e.g., `dining table` -> `table`, `cell phone` -> `phone`).
* **No-ARCore Table Geometry (`orientation/Orientation.kt`, `table/TableGeometry.kt`, `TableHeight.kt`):** Fuses `TYPE_GRAVITY` + `TYPE_GYROSCOPE` (without magnetometer), Camera2 intrinsics, and known-width object rulers (`bottle`, `cup`, `apple`, `orange`) to estimate object distances in metres and reachability zones.
* **Plain Natural-Language Directions (`table/Placement.kt`, `brief/BriefComposer.kt`):** Translates coordinates into intuitive directions (`"in front of you"`, `"slightly to your left/right"`, `"on your left/right"`) and reach zones (`within reach`, `just beyond reach`, `out of reach`).
* **Persistent World Map & Spatial Relations (`worldmap/WorldMap.kt`, `Relations.kt`):** Tracks object states (`in view`, `out of view`, `not seen`, resting vs. moving), merges duplicate detections, and generates relative landmark anchors (e.g., `"right of the cup"`).
* **Hand Tracking & Hand-Not-Person Filtering (`hands/HandTracker.kt`, `SaarthiCore.kt`):** Uses MediaPipe GPU Hand Landmarker to track hands and prevent hands entering the frame from being miscounted as a `"person"`; throttles to `2/s` if no hand is detected for 5 seconds.

---

### B. Machine Theory of Mind & Cognitive Memory *(Signature USPs)*
* **Salience-Filtered Settle-In Brief (`brief/BriefComposer.kt`, `SaarthiCore.kt`):** A single tap delivers a concise brief of the 3–5 most salient objects; a second tap reports only what has changed since the last brief.
* **Two-Map Sally–Anne Divergence (`beliefmap/BeliefMap.kt`, `ChangeDetector.kt`):** Compares live reality (`WorldMap`) against what the user has already been told (`BeliefMap`). Stays proactively silent unless an object moves, disappears/becomes obstructed, or returns—with camera-motion guards to prevent false move alerts.
* **Spatial Survival Decay (`insight/SpatialDecay.kt`, `laptop/analysis/insights.py`):** Applies per-class Kaplan–Meier survival decay rates (e.g., `bottle` `0.325/min` vs. `laptop` `0.010/min`). When survival probability drops below `0.5`, uncertainty is explicitly communicated (`", but it may have been moved since"`).
* **Remembered Recall (`intent/Answerer.kt`):** Answers `"Where is my…?"` queries for currently out-of-view objects using stored memory, elapsed time, and decay probability.
* **The Voice Diary (`diary/Diary.kt`, `SaarthiCore.kt`):** Supports `"Note: ..."` to store timestamped notes in session RAM, `"Read my notes"` to list entries, and word-overlap matching on unmatched spoken questions (`"You noted at 18:12: ..."`).

---

### C. System 2 Physical Verification (Anti-Spoof & Plausibility)
* **The Torch Test — Real Object vs. Screen/Photo (`system2/TorchCheck.kt`, `Ledger.kt`):** Uses exposure-locked flash off/on differentials, surface unevenness checks, and Wald Sequential Probability Ratio Test (SPRT) bounds to distinguish physical 3D objects from 2D photographs or phone screens (verified 9/10 on Vivo exit checks).
* **Size Plausibility Check (`system2/SizeCheck.kt`):** Cross-checks detected object dimensions against physical expectations and suppresses implausible detections (e.g., a 25 cm `"apple"`) from speech output.
* **Background Motion / Screen-Box Telemetry (`system2/PlanarMotion.kt`, `RotationFlow.kt`):** Computes planar motion and rotation flow cues for Mind View telemetry visualization (excluded from speech, where the Torch Test is authoritative).

---

### D. Closed-Loop Hand Guidance & Personal Object Identification
* **Reach & Aim Guidance (`guidance/HandGuide.kt`, `AimGuide.kt`, `Phrases.kt`):** Streams pre-synthesized zero-latency cues (`"Left."`, `"A little forward."`, `"You're touching it."`) and rapid wrong-way corrections (`"Other way: right."` in ~0.4 s).
* **Adaptive Proprioceptive Reach Bias (`guidance/ReachBias.kt`):** Learns a user's consistent undershoot or lateral drift across 3–6 reaches (`"You tend to reach a bit short; I'll guide you further."`) and compensates in subsequent guidance.
* **Point-and-Ask (`personal/TouchAsk.kt`):** Responds to `"What's this?"` by identifying the object under the user's fingertip (touch) or along the index knuckle-to-tip pointing ray.
* **Personal Object Identification (`personal/PersonalObjects.kt`, `Embedder.kt`):** Uses 3-second voice enrolment and MobileNet-V3 visual embeddings with gap-based scoring (`yours` vs. `look-alike`, verified 78/78 on held-back team photos) to distinguish personal belongings (e.g., `"My Watch"`).
* **Stopped Reach / Mid-Air Halt (`reach/ReachWatch.kt`, `ReachPredictor.kt`):** Unit-tested mid-air halt predictor; currently disabled via feature flag (`REACH_STOP = false`) in favor of move alerts.

---

### E. Speech, Reading, Safety & Edge Resilience
* **Offline Speech-to-Text + Near-Miss Recovery (`speech/WhisperEngine.kt`, `intent/NearMiss.kt`):** Runs Whisper `base.en` via `sherpa-onnx` completely offline, paired with edit-distance intent recovery (`"Did you mean: …?"`).
* **Structure-First OCR Reading (`ocr/TextReader.kt`):** Uses ML Kit (Latin + Devanagari scripts) so `"Read this"` announces headings/structure first and `"Read on"` continues through the page.
* **Safety SOS (`safety/FallDetector.kt`, `LoudSpike.kt`, `Sos.kt`):** Combines free-fall detection, $>2.5g$ impact sensing, and loud-sound verification to trigger a 15-second loud countdown before sending an offline SMS with coarse GPS coordinates to a trusted contact.
* **Optional Verified Online Mode (`online/CloudCheck.kt`, `laptop/online/cloud_brain.py`):** Off by default; triple-tap toggles Gemini Flash-Lite queries, which are cross-checked against the local `WorldMap` (`"But I see…, so I'm not sure"`) with online session memory.
* **Health Monitoring & Silent Thermal Governor (`health/CameraHealthMonitor.kt`, `ThermalWatch.kt`):** Alerts the user to covered lenses or dark environments while silently stepping through thermal tiers (`NOMINAL`, `WARM`, `HOT`, `CRITICAL`) to adjust frame stride and detector thresholds.

---

### F. Laptop Mind View HUD, Telemetry & Verification Tools
* **USB Feed Link & Session Recorder (`link/FeedLink.kt`, `record/SessionRecorder.kt`, `laptop/link/feed_server.py`):** Non-blocking TCP feed over USB (`adb reverse tcp:8765`), resilient to cable disconnects, logging sessions to `.jsonl` for deterministic replay.
* **2.5D Spatial Mind View (`laptop/blueprint/index.html`, `telemetry.html`):** Renders a 2-metre perspective tabletop with D24 plain directions (`Left`, `Slightly Left`, `In Front`, `Slightly Right`, `Right`), clipped reach arcs, camera FOV, live World vs. Belief ghosts with divergence tethers, Kaplan–Meier decay curves, and object co-occurrence graphs.
* **Signal-vs-Noise Arbitrator & Decision Log (`laptop/blueprint/`):** Separates routine telemetry from cognitive decisions (`ALERT`, `TORCH`, `SYSTEM 2`, `GUIDE`, `DIARY`, `WATCH`, `ONLINE`, `SOS`, `BRIEF`, `HEARD`), displaying `"Why I spoke / stayed silent"` reasoning and a live **Cognitive Economy Counter** (`Frames Observed | Proactively Suppressed | Decisions Spoken`).
* **Evaluation Simulator & Optical Proof (`tools/sim/index.html`, `generate_heatmap.py`):** Provides an interactive 5-module showcase alongside empirical optical curvature heatmaps and SPRT curves (`Real_Apple.jpg` vs. `Image_Apple.jpg`).

---

## 3. Feature Status Summary

| Category | Active / Verified | Optional / Flagged | Discarded |
| :--- | :--- | :--- | :--- |
| **Spatial Perception** | 30 fps adaptive capture, EfficientDet-Lite0 tracking, no-ARCore geometry, natural directions, World Map & relations, hand tracking | — | — |
| **Theory of Mind** | Settle-in brief, World vs. Belief Map divergence, Voice Diary, Kaplan–Meier decay, remembered recall | — | — |
| **System 2** | Torch Test (SPRT real-vs-screen), size plausibility check | Background planar motion / rotation flow (telemetry only) | Active acoustic FMCW glass probe (unreliable SNR on Vivo V21e) |
| **Hand & Personal** | Reach/aim guidance, adaptive reach bias, Point-and-Ask, personal object ID | Stopped reach mid-air halt (`REACH_STOP = false`) | — |
| **Speech, Safety & Resilience** | Offline Whisper + near-miss, Latin/Devanagari OCR, Fall+Sound SOS, optional verified cloud mode, camera health & thermal governor | — | — |
| **HUD & Tooling** | USB feed + `.jsonl` recorder, 2.5D Mind View, decision log + Cognitive Economy Counter, simulator & optical proof | — | — |

