# SAARTHI — Project Brief for the Team

Version 4.1 · 28 Oct 2026 · Hackathon: Silicon, 28–29 Nov 2026 (18 hours)

**What changed in v4.1:** the judge view is cut; the 3D table view is replaced by the First-Person
HUD (side quest 5); Hindi and Hinglish speech move to P1; roadmap dates removed (the only fixed
dates are the 20 Nov feature freeze and the event). See `CLAUDE.md` v2.2.

> Saarthi: the charioteer. Krishna did not fight Arjuna's battle; he kept him oriented and told him
> what mattered at the moment it mattered. Saarthi does the same for a blind or low-vision person at
> a table and among the people around them.

**The three files**

| File | For | Where it goes |
| --- | --- | --- |
| `SAARTHI_PRD.md` | Coding agents | Repo root as `CLAUDE.md` |
| `SAARTHI_SYSTEM2.md` | Coding agents | `docs/SYSTEM2.md` |
| `SAARTHI_PROJECT_BRIEF.md` (this file) | The team | `docs/BRIEF.md` |

**What changed in v4:** tabletop scope instead of room navigation; the phone has no ARCore;
phone/laptop compute tiers; USB link first; System 2 added; new stage scenarios; repository list
updated.

**Evidence labels:** **[verified]** = checked on GitHub, Oct 2026. **[unverified]** = memory or
assumption; check before relying on it or saying it on stage.

---

## A1. Why Saarthi

| Idea | Why it lost |
| --- | --- |
| CPR quality coach | Small idea; student CPR gloves on ESP32/Arduino already exist [verified] |
| Grain quality grader | Reliable but low spectacle |
| Machine-health stethoscope | Weak relatability |
| Room or walking navigation | Venue-dependent and unsafe on stage; our table could be anywhere |

Saarthi wins because the judge experiences it personally, every scenario happens at the table we
control, the engineering is deep and visible live, and a month of testing can make it reliable.

**Where we stand out.** The assistive space is crowded (10,067 GitHub repositories for "visually
impaired" [verified]), but almost all of it describes or lists what the camera sees. We found nothing
that models what the *user believes* ("cognitive map visually impaired": 1 repository; "path
integration blind": none relevant [verified, GitHub only]). Saarthi works at that cognition layer.

## A2. Positioning against what judges know

| Existing | Does well | Does not do | Saarthi |
| --- | --- | --- | --- |
| Smart sticks | "Something is there" | Anything at a table | Table and people around |
| Smart glasses (Meta Ray-Ban AI, Envision) [unverified features] | Describe, read, identify on request | Remember what you know; notice what changed | Tells you only what you don't know |
| Seeing AI, Lookout, Be My Eyes [unverified] | Read, recognise, human help | Correct your reach; tell a photo from a real object | Reach correction; System 2 checks |
| SightBuddy (MIT [verified]) | Offline find-object with directional sound | Memory of what you know | Belief map |
| SecondSense (our foundation, permitted) | On-device sonification, goal steering | Belief map, System 2 | Built on top of it |

Our stage claim: **"Saarthi tells you only what you don't already know: what's new, what changed,
and what you've got wrong."** Credit SecondSense, SightBuddy and Soundscape openly.

Pitch analogies: the charioteer; guiding your grandmother over a phone call ("thoda right… haan, bas").

## A3. Phone, laptop and the link

- **Phone (Vivo V21e 5G, 8 GB, no ARCore; MediaTek Dimensity 700 [unverified]):** everything fast
  and everything that steers the hand: orientation, common-object detection, hand tracking, short
  text, both maps, sounds and vibration, speech.
- **Laptop (Core Ultra 7 155H, 16 GB, Arc graphics, NPU):** heavy work on demand, 0.5–5 s:
  finding unusual objects, dense reading, depth, real-vs-picture checks; plus the blueprint and,
  when ready, the First-Person HUD.
- **Link:** USB cable first (tabletop demos don't need walking), the laptop's hotspot as backup.
  Fully offline. If the link drops, the phone keeps helping with the basics and says so.
- **No ARCore is fine at table scale.** Geometry comes from the phone's motion sensors, laptop depth,
  known-size objects (a laptop or A4 sheet as a ruler) and parallax from small phone movements.
- **Phone placement:** chest mount angled at the table, or in hand. Never in a pocket.

## A4. What we inherit and what is left

| Part | From | Left for us |
| --- | --- | --- |
| Speech, sound cues, haptics, camera pipeline | SecondSense + SightBuddy | Integration; Hindi speech (P1) |
| Orientation from motion sensors | SecondSense `ImuTracker` | Wiring |
| On-phone text reading (incl. Devanagari) | SecondSense `MlKitPerception` | Structure-first reading |
| Object memory | SecondSense `ObjectMemory` | Change detection, occlusion handling |
| Confidence tiers, anti-repetition, smoothing | SecondSense `sonification/` | Tuning |
| Intents and steering | SecondSense `voice/` + SightBuddy resolver | Saarthi's intents (English; Hinglish P1) |
| Phone state server | SecondSense `DashboardServer` | Laptop link, published feed |
| Live camera view | SecondSense `DashboardServer` `/frame.jpg`; `laptop/room3d/` (reference only) | Published feed for the HUD |
| Detection, hands, depth, OCR, open-vocabulary models | MediaPipe, Florence-2, Depth-Anything, PaddleOCR (pretrained, with OpenVINO notebooks) | Benchmarking, integration, calibration |
| Unit tests | 113 inherited | Replay harness, scenario tests, metrics |
| **Belief map, salience, reach correction, change alerts** | Nothing | **All ours: the signature** |
| **System 2 (real vs picture, plausibility, evidence, calibration)** | Libraries only | **Ours** |
| Blueprint and First-Person HUD | Drawing libraries, three.js | Ours (the HUD is side quest 5) |

**Estimate: about 40–45% of the total effort is covered** by inherited code and pretrained models.
It is lower than the earlier 50–55% because SecondSense's ARCore room map is now unusable on our
phone and the tabletop features are new. The remaining 55–60% is the integration plus everything
judges will remember.

Known problems in inherited code [verified]: `MainActivity.kt` is 1,869 lines (rewrite, don't
extend); the detector is Ultralytics YOLO (AGPL-3.0); the fast path targets Qualcomm's NPU, which our
MediaTek phone lacks; Whisper ran only on that NPU; key metrics were never measured; `room3d` uses
scrcpy's camera, which conflicts with the app.

## A5. Feasibility

| Component | Feasibility | Main risk |
| --- | --- | --- |
| Settle-in brief, people around, read what matters | High | Brief quality (salience) |
| Moved-object alerts | High | False alarms from hands and people passing (occlusion reasoning) |
| Reach guidance and correction | Medium-high | Hand and target both in view from a chest mount |
| Real vs picture | Medium | Parallax quality on our phone, and pictures on a handheld phone; test in Phase 0 |
| Non-standard objects (pen, keys) | Medium | Laptop round-trip latency |
| Laptop models on CPU/iGPU/NPU | Medium-high | Must benchmark; Florence-2 is the key one |
| Phone speed (mid-range chip, no NPU) | Medium | Frame rate; thermal throttling |

## A6. Corrections and independent views

1. **Pre-building rules are still unconfirmed.** Get it in writing; if not allowed, use the month for
   prototypes, data, tuning and rehearsal, then rebuild at the event.
2. **Keep the permission durable:** Bhavya's email in `docs/permissions/`; ideally they add a license
   file.
3. **Optics:** lead with the belief map and System 2; mention the SecondSense foundation briefly
   and openly.
4. **Tabletop scenarios must carry the signature.** Reading text and counting people are the
   *expected* part; the moved bottle, real-vs-picture and reach correction are what judges never
   imagined. Don't let the demo slide into "another describe-the-scene app".
5. **AGPL detector:** replace by default.
6. **Real data only:** every number on screen is computed live; controlled scenarios and disclosed
   pre-seeding are fine.
7. **Explainability for Q&A:** each owner explains their modules in plain words.
8. **Talk to at least one blind or low-vision person** (blind school, NAB branch, disability cell):
   what do they need at a table, and what annoys them about apps?
9. **Blindfolded volunteers are a proxy**, and we say so.
10. **Ear masking:** open-ear or bone-conduction headphones, or one earbud.
11. **Privacy:** people as direction and count only; no identity; no stored frames.
12. **AI search summaries are leads, not facts** (A12).
13. **Exams:** feature freeze 20 Nov.
14. **Presentation:** 6–8 minute core, experience first, blueprint reveal second, theory in one line.

## A7. What you must make available to the agents

Hardware and setup
- [ ] Phone details: confirm chip and Android version (Settings → About phone).
- [ ] USB cable (2–3 m for demos), USB debugging on, `adb` working; spare Android phone.
- [ ] Android Studio and SDK (or JDK 17 + Gradle wrapper); Python 3.10/3.11; Intel GPU and NPU
      drivers; OpenVINO.
- [ ] Chest mount for the phone; open-ear headphones; eye masks; power bank.

Repositories and permissions
- [ ] Private GitHub repo forked from SecondSense; branch protection on `main`.
- [ ] `docs/permissions/secondsense.md` with the owner's email.
- [ ] `CLAUDE.md`, `docs/SYSTEM2.md`, `docs/BRIEF.md` in place; Antigravity rules file if used.
- [ ] Hugging Face account for model downloads.

Data only the team can create
- [ ] 200+ tabletop photos: everyday Indian objects (bottles, steel tumblers, tiffin boxes, pens,
      keys, notebooks, phones, laptops) in clutter and different lighting.
- [ ] Real-vs-picture pairs: real objects with printed photos and with images on laptop and phone
      screens.
- [ ] 20 book pages and screens for reading tests (English and Hindi).
- [ ] 100+ spoken requests in English, some recorded in a noisy hall.
- [ ] (P1) 100+ spoken requests in Hindi and Hinglish, some recorded in a noisy hall.
- [ ] Recorded Saarthi sessions once the recorder exists (Phase 1).
- [ ] A few hundred labelled detections for calibration (Evidence lead).
- [ ] Notes from the blind/low-vision conversation.

Decisions only the team can make
- [ ] Languages and voice; default guidance style (clock-face or left/right).
- [ ] AGPL detector: replace (default) or keep.
- [ ] Which System 2 parts are P0 (recommended in `docs/SYSTEM2.md` section 12).
- [ ] Module owners and side-quest owners (A10).
- [ ] Organiser answers: pre-building, team size, demo format, power and Wi-Fi at tables.

## A8. Validate or kill (Phase 0)

1. **Moved-object alerts.** Record a table; move one object; separately pass a hand over it. Pass:
   moves detected, hand passes not reported, in at least 9 of 10 trials (offline prototype is fine).
2. **Real vs picture.** Phone video of a real apple and a printed photo with small phone movements.
   Pass: parallax clearly separates them in at least 9 of 10 clips.
3. **Hands and objects together.** Chest-mounted phone at a table. Pass: hand landmarks and target
   both tracked during reaches at 10+ frames per second.
4. **Laptop speed.** Florence-2, Depth-Anything-V2 Small and a small detector via OpenVINO. Pass:
   deliberate-tier answers within 2 s typical.
5. **Inheritance works.** SecondSense builds and runs on our phone (mock and TFLite engines).
6. **Mental picture drift (supports the story).** Five volunteers, eyes closed: tell them where three
   objects are, wait a minute with a distraction, ask them to reach. Pass: errors common enough to
   make correction meaningful.

If 2 fails: rely on screen/page containment and present real-vs-picture with printed photos only. If 3
fails: change the mount angle or guide by voice without hand tracking. If 4 fails: switch to smaller
laptop models.

## A9. Roadmap and QA (details in PRD sections 8–9)

Phases run in order, each ending with the team's approval. The only fixed dates are the **feature
freeze on 20 Nov** and the event (28–29 Nov).

| Agents (PRD phase) | Team |
| --- | --- |
| Phase 0: audit and benchmarks | Organiser email; A8 tests; start photo collection |
| Phase 1: foundation, settle-in slice, published feed | Phrase recordings; blind/low-vision conversation; HUD side quest starts on the feed |
| Phase 2: world map, people, find common objects | Scenario 1 rehearsals; side quests start |
| Phase 3: belief map, change alerts, reach correction | Volunteer trials |
| Phase 4: System 2 (incl. pictures on the judge's phone); bonus: laptop finding, reading | Calibration labels; held-out scenes and phones |
| Phase 5: hardening; **freeze by 20 Nov** | Full demo runs; chaos tests |
| Phase 6: fixes only, until the event | Light rehearsal around exams; release checklist |

**QA in one paragraph:** unit tests for all maths; replayable sessions for regression; every stage
scenario run 10 times per build (pass = 9 of 10); chaos tests (USB pulled, camera covered, light
change, noise, hot phone, hands passing through); volunteer trials on held-out people and scenes;
all numbers generated by script into `METRICS.md`. A bug that breaks a stage scenario stops feature
work.

**Stage scenarios:** minimum demo: settle in · the moved bottle · real or picture (incl. the judge's
own phone) · reach correction (with deliberate wrong reaches). Bonus: the full write-a-note flow ·
read what matters · failure honesty (USB pulled). The judge chooses the inputs in every scenario.

## A10. Side quests for the two members (coding, separate from the core)

In `sidequests/`, reading only published data; never changing core code.

1. **Comparison page:** smart stick vs smart glasses vs Saarthi, with an animated scenario.
2. **"Where's my bottle?" web game:** shows how fast a person's mental picture goes wrong.
3. **Results page:** live charts from `METRICS.md` data, including the System 2 ablation.
4. **Interactive story page:** a blind student's study session with and without Saarthi.
5. **First-Person HUD:** the phone's live camera view on the laptop with virtual arms, wristbands
   driven by real guidance events, System 2 labels and a world/belief inset map (PRD 5.12.1). Reads
   the published feed only; built after the five minimum-demo items work.
6. **Replay viewer:** recorded sessions, labelled RECORDED, as a demo backup.

Suggested split: member 1 takes 2 and 4; member 2 takes 3 and 5.

## A11. Repository index

Licenses as found on GitHub, Oct 2026 [verified] unless marked. Where there is no license, contact
the owner before reusing code.

**Foundations we will use**

| Repository | License | Use |
| --- | --- | --- |
| [SecondSense](https://github.com/GargBhavya-tech/secondsense) | Owner permission | Foundation (PRD 3.1) |
| [SightBuddy](https://github.com/DrophouseLtd/SightBuddy) | MIT | Speech, sound cues, haptics, camera pipeline, intent resolver |

**Phone**

| Repository | License | Use |
| --- | --- | --- |
| [MediaPipe](https://github.com/google-ai-edge/mediapipe) | Apache-2.0 | Object detector (EfficientDet-Lite0), hand landmarker |
| [LiteRT](https://github.com/google-ai-edge/LiteRT) | Apache-2.0 | On-device model runtime |
| [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) | Apache-2.0 | Offline speech recognition and TTS |
| [Vosk](https://github.com/alphacep/vosk-api) | Apache-2.0 | Offline speech alternative with Indian-language models |
| ML Kit text recognition | Google terms [unverified] | Short text incl. Devanagari (already in SecondSense) |
| [OpenCV](https://github.com/opencv/opencv) | Apache-2.0 | Feature tracking and parallax test |

**Laptop**

| Repository | License | Use |
| --- | --- | --- |
| [OpenVINO](https://github.com/openvinotoolkit/openvino) · [notebooks](https://github.com/openvinotoolkit/openvino_notebooks) | Apache-2.0 | Fast inference; ready notebooks for Florence-2, Depth-Anything, Grounded-SAM, PaddleOCR |
| Florence-2 (via the OpenVINO notebook) | MIT | Open-vocabulary finding, captions, OCR |
| [Grounding DINO](https://github.com/IDEA-Research/GroundingDINO) · [Grounded-SAM-2](https://github.com/IDEA-Research/Grounded-SAM-2) | Apache-2.0 | Backup open-vocabulary finding |
| [RF-DETR](https://github.com/roboflow/rf-detr) | Apache-2.0 (N/S); others PML 1.0 | Trainable detector |
| [YOLOX](https://github.com/Megvii-BaseDetection/YOLOX) | Apache-2.0 | Detector alternative |
| [Depth-Anything-V2](https://github.com/DepthAnything/Depth-Anything-V2) | Small Apache-2.0 | Depth |
| [Metric3D](https://github.com/YvanYin/Metric3D) · [MiDaS](https://github.com/isl-org/MiDaS) | BSD-2 · MIT | Depth alternatives |
| [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) | Apache-2.0 | Dense-page reading |
| [Moondream](https://github.com/vikhyat/moondream) | Apache-2.0 | Free scene questions (P1) |
| [Open3D](https://github.com/isl-org/Open3D) · [three.js](https://github.com/mrdoob/three.js) | MIT | Open3D: reference only (3D view replaced by the HUD); three.js: blueprint and HUD |
| [webxr-input-profiles](https://github.com/immersive-web/webxr-input-profiles) · [web-ar-hand-tracking](https://github.com/damiansire/web-ar-hand-tracking) · [webcam-3D-handcontrols](https://github.com/Cai3ra/webcam-3D-handcontrols) | To verify · MIT [unverified] · MIT [unverified] | HUD hand and arm models; 3D drawn over a live camera view |
| [FastAPI](https://github.com/fastapi/fastapi) · [uPlot](https://github.com/leeoniya/uPlot) · [Chart.js](https://github.com/chartjs/Chart.js) | MIT | Laptop service and charts |
| [ONNX Runtime](https://github.com/microsoft/onnxruntime) | MIT | Model runtime |
| [Rerun](https://github.com/rerun-io/rerun) | Apache-2.0 | Developer debugging |

**System 2 and research layer** (details in `docs/SYSTEM2.md` section 11)

[temperature_scaling](https://github.com/gpleiss/temperature_scaling) (MIT) ·
[MAPIE](https://github.com/scikit-learn-contrib/MAPIE) (BSD-3) ·
[conformal-prediction](https://github.com/aangelopoulos/conformal-prediction) (MIT) ·
[OD-CP](https://github.com/mos-ks/OD-CP) (MIT) · [CODS](https://github.com/leoandeol/cods) (none) ·
[intel_conformal_od](https://github.com/divake/intel_conformal_od) (none; runs on Core Ultra 7 165H) ·
[pytorch-ood](https://github.com/kkirchheim/pytorch-ood) (Apache-2.0) ·
[pytorch-grad-cam](https://github.com/jacobgil/pytorch-grad-cam) (MIT) ·
[KL-Loss](https://github.com/ethanhe42/KL-Loss) (Apache-2.0) ·
[rgbd-scene-graph](https://github.com/ab17dogar/rgbd-scene-graph) (MIT) ·
[HOV-SG](https://github.com/hovsg/HOV-SG) (MIT) · [Hydra](https://github.com/MIT-SPARK/Hydra) (MIT).

**Competitors and study-only**

[VisionGuide-Assist](https://github.com/Suryansh0402/VisionGuide-Assist) and
[AutoDoor-DataEngine](https://github.com/Suryansh0402/AutoDoor-DataEngine) (MIT; door-focused, for the
optional room variant) · [IRIS](https://github.com/Karthikgaur8/IRIS) ·
[InclusiveAssist](https://github.com/millionaire-mittal/InclusiveAssist) ·
[Cogniscape-Android](https://github.com/Subhashnaidudulla/Cogniscape-Android) ·
[VNAVI](https://github.com/xingbpshen/VNAVI) · [BlindVision](https://github.com/ManishGond/BlindVision) ·
[SeeForMe](https://github.com/michael2505byte/SeeForMe) · [Microsoft Soundscape](https://github.com/microsoft/soundscape) (MIT; concepts).

**No longer used (no ARCore on our phone):** ARCore SDK, denseframe, ARCore-TTS, SecondSense `ar/`.

**Avoid unless the team approves:** [Ultralytics](https://github.com/ultralytics/ultralytics)
(AGPL-3.0), [YOLO-World](https://github.com/AILab-CVC/YOLO-World) (GPL-3.0), YOLOv9 (GPL-3.0).

**Inspiration products [unverified]:** Seeing AI, Google Lookout, Be My Eyes, Meta Ray-Ban AI glasses,
Envision glasses, .lumen, Biped NOA, WeWALK.

## A12. Intelligence check of the pasted search results

| Claim | Reality |
| --- | --- |
| SecondSense repository is private | **False:** public |
| Uses YOLOv8-Nano or MobileNet SSD | **False:** Ultralytics YOLO26/YOLOv11 via Qualcomm AI Hub |
| Says "open door 2 metres ahead" | **Not shown:** door routing is future scope in its README |
| Third member Bhaskar Kumar Arya | Commit authors are GargBhavya-tech and AtharvPhutela; unverified |
| GeminiLive-Assistant-Android "90% similar" | Cloud Gemini assistant; no link to SecondSense found |
| "DeepNAVI" with a "Rule of 57" | No official repository found; unreliable |
| Fork SightBuddy and add YOLOv8 | Rejected: different goal; YOLOv8 is AGPL |
