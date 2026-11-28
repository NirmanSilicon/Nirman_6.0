# SAARTHI — System 2: Deliberate Verification for a Fast Perception System

Version 2.2 · 28 Oct 2026 · Part of the coding-agent specification: save as `docs/SYSTEM2.md`
(referenced by `CLAUDE.md`).

**What changed in v2.2:** the phone side of the parallax cue reuses SecondSense's
`GroundFlowConsistency` (section 4.2) instead of adding OpenCV to the phone.

**What changed in v2.1:** real vs picture must handle a picture shown on the **judge's own phone**,
held in their hand (section 4.2); phase dates removed.

**What changed in v2:** tabletop scope; the phone has no ARCore; **real vs picture** is the headline
check; geometry now comes from laptop depth, the table plane, known-size reference objects, and
parallax from small phone movements. Door checks moved to the optional room variant.

Evidence labels: **[verified]** = checked on GitHub, Oct 2026. **[from memory]** = an established
idea or paper I could not open; verify before quoting. I had no access to paper databases, so any
citation may be imprecise.

---

## 0. Recommendation

**Build System 2 in two layers.**

- **Core (in Saarthi, P0):** real-vs-picture verification, physical plausibility checks, evidence
  accumulation across views, calibration, and an explanation trace. Together they stop Saarthi
  from stating what a detector merely guessed, and they power "look again".
- **Research layer (shown, not depended on):** honest answer sets (conformal prediction), novelty
  detection, saliency maps, and a bias audit. These go on a side-quest research page and into Q&A.

**The proof is an ablation:** the same recordings with System 1 only and with System 2, showing
false statements dropping.

**Positioning:** the belief map stays the headline. System 2 is how Saarthi earns trust. The story:
*Saarthi models two minds: yours (what you believe about the table) and its own (what it actually
knows).*

---

## 1. The problem: detectors are categorical thinkers

A detector was trained on a fixed list of categories. For each image region it answers "which of my
categories is this most like?" It has no option for "I've never seen this" or "this is only a
picture", and it never checks physical sense. Its failures *resemble* human cognitive biases (the
mechanisms are statistical; say "resemble", never "the model has biases"):

| Human bias [from memory] | How the detector shows it | Tabletop example | System 2 remedy |
| --- | --- | --- | --- |
| Categorical / prototype thinking | Forces everything into known classes | A highlighter becomes "pen" or nothing | Answer sets; novelty flag |
| Overconfidence | Scores higher than real accuracy | "Apple, 0.94" on a printed photo | Calibration; real-vs-picture |
| Representativeness (surface features) | Shortcut: red and round = apple | A red ball becomes an apple | Size and shape plausibility |
| Base-rate neglect (ignoring priors) | Ignores physics and context | A "bottle" floating above the table | Support and size checks |
| Anchoring / confirmation bias | Smoothing locks in an early label | A wrong first label survives contrary views | Reversible evidence accumulation |
| Availability / dataset bias | Knows what it was trained on | Indian steel tumblers or tiffin boxes missed | Bias audit; open-vocabulary fallback |
| Single-glance judgement | Decides from one frame | Glare or blur causes a false call | Multi-view evidence; blur gating |
| Confusing depiction with reality | A photo of an object *is* the object to it | Apple on the laptop screen = apple on the table | **Real-vs-picture check** |

---

## 2. The theory (our "BKT and Ebbinghaus")

1. **Dual-process theory** [from memory: Kahneman, *Thinking, Fast and Slow*, 2011]. System 1 is fast
   pattern-matching; System 2 is slow, deliberate checking. A detector is pure System 1.
2. **Evidence accumulation to a threshold** [from memory: drift-diffusion model, Ratcliff 1978;
   sequential probability ratio test, Wald 1945]. Gather evidence until it crosses a bound; between
   the "state" and "reject" bounds, look again.
3. **Calibration** [from memory: Guo et al., "On Calibration of Modern Neural Networks", 2017].
   Networks are often overconfident; temperature scaling makes "80%" mean right about 80% of the time.
4. **Conformal prediction** [from memory: Angelopoulos & Bates, 2021]. Output a set of labels that
   contains the truth at a chosen rate, provided future data resembles the calibration data.
5. **Shortcut learning and texture bias** [from memory: Geirhos et al., 2019 and 2020]. Explains
   "red and round = apple" errors.
6. **Presentation-attack detection** [from memory]. Face-recognition systems must tell a live face
   from a photo or a screen ("liveness detection"). Real vs picture is the same problem for objects;
   the field's standard cues (depth, parallax, screen artefacts) carry over.
7. **Active perception** [from memory: Bajcsy, 1988]. Move the sensor to reduce uncertainty: Saarthi
   asks the user to shift the phone slightly when a second view would settle a question.

---

## 3. How System 2 thinks

1. **Propose (System 1):** "apple here, score 0.88".
2. **Calibrate:** turn the raw score into an honest probability for that class.
3. **Check (System 2):** real vs picture, physical plausibility, cross-view consistency, and for
   uncertain cases a second opinion from a larger model on the laptop.
4. **Accumulate:** add the evidence to that object's ledger in the world map; evidence can push
   either way, so labels can be reversed.
5. **Decide:** above the "state" bound, say it; below the "reject" bound, drop it (and correct
   any earlier statement); in between, ask for a second look or stay silent if it doesn't matter.
6. **Explain:** every statement carries its reasons, shown live on the blueprint.

Example trace for the photo of an apple:
`detector apple 0.88 → calibrated 0.80 · inside a detected laptop screen ✗ · no parallax against the
screen across 2 views ✗ · flat in depth ✗ → real-apple probability 0.04 → "that's a picture of an
apple on the laptop screen"`.

---

## 4. Components

Effort assumes the agents code and one team member reviews.

### 4.1 System 1: hypothesis generation

Fast phone detector for common objects; Florence-2 or Grounding DINO on the laptop for others (PRD
section 6). System 2 needs System 1's **raw** scores and boxes plus geometry, not a better detector.

### 4.2 Real vs picture (core; the headline)

Each cue gives a **likelihood ratio** (how much more likely the evidence is if the object is real),
combined in the evidence ledger. A missing cue is neutral, never a penalty.

| Cue | How | Where | Strength |
| --- | --- | --- | --- |
| **Parallax across views** | When the phone shifts a few centimetres, points on a flat picture move together with its surroundings (one homography fits them); points on a real 3D object do not. Measure the homography residual of the object region versus its background | Phone: port SecondSense `GroundFlowConsistency` + `OpticalFlow` (same homography-residual test, Kotlin, no OpenCV); laptop: OpenCV for the detailed check | **Strongest**; needs small phone motion, so Saarthi may ask "move the phone slightly to your left" |
| **Inside a screen or page** | The object's box lies inside a detected laptop, phone or TV screen, or a paper/book region, and is coplanar with its border | Phone (detector) + laptop | Strong |
| **Depth flatness** | Fit a plane to the surrounding screen or paper in laptop depth; check whether the object region bulges from it | Laptop (Depth-Anything-V2 Small) | Moderate; monocular depth can invent relief inside photos, so test it |
| **Screen artefacts** | Emitted brightness, moiré patterns, glare | Phone or laptop | Moderate |
| **Size against the scene** | Real size from table geometry and a reference object (see 4.3) | Laptop | Moderate |
| **Contact and shadow** | A real object rests on the table and casts a contact shadow | Laptop | Weak |

**Pictures on the judge's own phone (handheld).** The judge chooses the picture and holds the phone,
so the phone moves independently of the table. The background-parallax cue above does not apply:
the whole picture moves relative to the table whether or not it is flat. Note too that a real apple
held in a hand also moves independently, so independent motion is never evidence on its own. Use
instead:

| Cue | How | Where | Strength |
| --- | --- | --- | --- |
| **Inside a phone screen** | The object's box lies inside a detected `cell phone` box, near its centre | Phone (detector) | Strong; neutral when no phone is detected (held edge-on, cropped) |
| **Moves as one plane** | Across views, the object region and the phone's screen border fit one homography; a real object in a hand leaves a residual when it turns | Phone or laptop (OpenCV) | Strong when the phone tilts; needs some motion |
| **Screen artefacts** | Emitted brightness above the scene's lighting, moiré, specular glare across the screen, refresh banding | Phone or laptop | Moderate |
| **Depth flatness** | Region flat against the phone's plane in laptop depth | Laptop | Weak at hand distance |

Active perception: Saarthi may ask "hold it still" (stable containment and artefact readings) or
"tilt it slightly" (a tilted flat screen moves as one plane; a real object does not).

- **Effort:** about 4–6 days. **Risk:** medium; parallax quality on our phone is the key test, and
  the planar-motion cue on handheld phones is the second.
- **Acceptance:** at least 90% correct on held-out pairs (real vs printed, real vs laptop screen,
  real vs a handheld phone screen), with pictures on at least three phones never used for tuning,
  held by different people; and no real object called a picture in scenario runs.

### 4.3 Physical plausibility (core)

**Geometry sources (no ARCore on our phone):**
1. **Table plane:** gravity from the phone's IMU plus laptop depth gives the table surface and which
   way is up.
2. **Reference objects as rulers:** a laptop (about 30–36 cm wide), A4 paper (21 × 29.7 cm), a
   standard bottle; any confidently detected one sets the scale.
3. **Laptop depth:** Depth-Anything-V2 Small (relative or metric indoor variant).
4. **Ground-plane maths:** camera tilt from the IMU and the chest-mount height; SecondSense's
   `GroundPlaneAnalyzer` and `MetricDepthScaler` to adapt.

**Checks (starting priors; tune on our data; likelihood ratios, never hard rejects):**

| Class | Checks |
| --- | --- |
| Apple, orange, banana | Rests on the table or in a hand; size about 6–10 cm (banana longer) |
| Bottle | Rests on the table; height about 15–35 cm; upright or lying |
| Cup, glass, tumbler | Rests on the table; height about 7–15 cm |
| Pen, pencil | Thin and long, about 12–17 cm; on the table or in a hand |
| Book, notebook | Flat rectangle on the table, about 15–30 cm; open or closed |
| Laptop, keyboard, mouse | Known sizes; laptop also a screen region (feeds 4.2) |
| Phone | About 14–17 cm; screen region (feeds 4.2) |
| Person | Around the table; plausible seated or standing size; never identified |

- **Effort:** about 3–4 days. **Acceptance:** with checks on versus off, false statements per minute
  drop by at least half on held-out recordings, while missed objects rise by no more than 5
  percentage points.

### 4.4 Evidence accumulation across views (core)

- Each object in the world map keeps a running log-odds score per hypothesis ("real apple", "picture
  of apple", "moved", "removed").
- **Bounds:** state above the upper bound, reject below the lower bound, look again in between. Set
  the bounds from accepted error rates (Wald's test gives the formula).
- **Consecutive frames are not independent evidence.** Count evidence by viewpoint change or time
  spacing, so ten near-identical frames do not "prove" anything.
- **Occlusion reasoning for change detection:** an object hidden by a hand or a passing person is
  "occluded", not "removed"; only accumulated evidence after the occluder leaves can declare a move.
  This prevents false "your bottle was moved" alarms.
- **Reversal:** Saarthi corrects itself out loud if a stated object falls below the reject bound.
- **Builds on:** SecondSense `ObjectMemory`, `DetectionStabilizer`, `TemporalSmoother`.
- **Effort:** about 2–3 days. **Risk:** low.

### 4.5 Calibration (core)

- Fit a temperature per class on held-out, team-labelled detections; measure with a reliability
  diagram and expected calibration error (ECE).
- About a few hundred labelled detections per class from our own tabletop photos and recordings.
- Fitted offline on the laptop; applied on the phone (one division per score).
- Reference: [gpleiss/temperature_scaling](https://github.com/gpleiss/temperature_scaling) (MIT)
  [verified]. **Effort:** about 1–2 days plus labelling.

### 4.6 Second opinion from the laptop (core-lite)

Only hypotheses inside the look-again band go to the laptop: Florence-2 (phrase grounding) or
Grounding DINO. Like consulting a specialist for hard cases. The blueprint shows "second opinion
requested". **Effort:** about 1–2 days on top of the PRD's laptop tier.

### 4.7 Honest answer sets (research layer)

Conformal prediction turns one forced label into a set ("pen", or "pen or pencil"). A set of two
triggers a second look. Say "calibrated on our test scenes", not "guaranteed". References:
[MAPIE](https://github.com/scikit-learn-contrib/MAPIE) (BSD-3),
[conformal-prediction](https://github.com/aangelopoulos/conformal-prediction) (MIT),
[OD-CP](https://github.com/mos-ks/OD-CP) (MIT), [CODS](https://github.com/leoandeol/cods) (no
license file), [intel_conformal_od](https://github.com/divake/intel_conformal_od) (no license file;
real-time conformal detection **on a Core Ultra 7 165H**, a sibling of our laptop's chip) [verified].
**Effort:** about 2–4 days.

### 4.8 Novelty flag (research layer)

"I see something I don't recognise near your left hand" instead of a forced label. Reference:
[pytorch-ood](https://github.com/kkirchheim/pytorch-ood) (Apache-2.0) [verified]. Keep out of the
critical path.

### 4.9 Explanation trace (core; cheap)

Every statement stores its reasons (section 3 example); the blueprint shows them. This is what lets
judges *see* System 2.

---

## 5. Where it runs

| Component | Phone (Vivo V21e 5G, no ARCore, CPU/GPU) | Laptop (Core Ultra 7 155H, OpenVINO) |
| --- | --- | --- |
| Fast detection, hands, short OCR | ✓ | — |
| Applying calibration | ✓ | fitting, offline |
| IMU gravity and tilt | ✓ | — |
| Parallax test | ✓ (lightweight) | ✓ (detailed) |
| Screen/page containment | ✓ | ✓ |
| Depth, size, depth flatness | — | ✓ |
| Evidence ledger and decisions | ✓ | mirrored for the blueprint |
| Second opinion | — | ✓ |
| Answer sets, novelty, saliency, ablation | — | ✓ |

If the laptop link drops, the phone keeps System 1, containment, its own parallax test and the
evidence ledger, and lowers its confidence in anything needing depth.

---

## 6. Demo moments

1. **Real or picture (headline).** A real apple beside a printed photo; then an apple shown on the
   laptop screen; then any picture the judge chooses on their own phone. Saarthi: "the one on your
   right is a real apple; the other is a picture." The blueprint shows System 1 saying "apple, 94%"
   for both and System 2 overruling one.
2. **The careful observer.** A teammate's hand passes over the bottle: no false "moved" alarm. Then
   the bottle really moves: Saarthi notices.
3. **"Pen or pencil?"** An ambiguous item triggers "hold still a second", then a confident answer.
4. **Self-correction.** A partly hidden object gets a tentative mention; a better view confirms or
   reverses it out loud.
5. **The ablation page.** Same recordings, System 1 alone vs with System 2: false statements per
   minute, misses, calibration error. Real numbers, held-out scenes.

---

## 7. Proof plan

- **Ablation:** System 1 only; plus calibration; plus plausibility; plus real-vs-picture; plus
  accumulation. Report false statements per minute, misses, time to state, on held-out scenes.
- **Calibration:** reliability diagram and ECE before and after, per class.
- **Real vs picture:** accuracy on held-out pairs, with each cue's contribution.
- **Bias audit (research):** recall on Indian everyday objects (steel tumblers, tiffin boxes, diyas,
  notebooks with Hindi covers) vs standard classes. A finding nobody else will bring.
- **Saliency (research):** what the model looked at, via
  [pytorch-grad-cam](https://github.com/jacobgil/pytorch-grad-cam) (MIT) [verified].

---

## 8. Schedule fit and cut order

Fits PRD Phase 4, with accumulation and occlusion reasoning needed earlier for the
moved-bottle scenario in Phase 3. Order of value if time runs short: **4.4 accumulation and
occlusion → 4.2 real vs picture → 4.9 explanation → 4.3 plausibility → 4.5 calibration → 4.6 second
opinion → 4.7 answer sets → 4.8 novelty.**

---

## 9. Risks and honest limits

- Parallax needs the phone to move a little; a perfectly still phone cannot use it. Saarthi asks
  for the motion, which is also good active-perception theatre.
- Monocular depth can invent depth inside photographs; never rely on depth flatness alone.
- Calibration and answer-set guarantees weaken when the venue looks unlike our test scenes.
- Size priors are priors, not laws; use likelihood ratios.
- More checks add latency; confident cases must not wait for slow checks.
- System 2 must not overshadow the belief map in the pitch.

---

## 10. Pitch language

Say: "Detectors think in categories and are often overconfident, a bit like human snap judgements;
to a detector, a photo of an apple *is* an apple. Saarthi adds a second, slower way of thinking: it
checks every guess against physics and gathers evidence before it speaks. Watch."

Do not say: "the model has cognitive biases", "guaranteed accuracy", "understands the world like a
human", "novel algorithm".

---

## 11. Relevant repositories

License status as found; where there is no license file, contact the owner before reusing code.

| Repository | License | Why it matters |
| --- | --- | --- |
| [OpenVINO notebooks](https://github.com/openvinotoolkit/openvino_notebooks) | Apache-2.0 | Ready conversions for Florence-2, Depth-Anything, Grounded-SAM, PaddleOCR on Intel |
| Florence-2 (via the OpenVINO notebook) | MIT | Open-vocabulary grounding, captions, OCR on the laptop |
| [Depth-Anything-V2](https://github.com/DepthAnything/Depth-Anything-V2) | Small Apache-2.0 | Laptop depth |
| [Metric3D](https://github.com/YvanYin/Metric3D) | BSD-2 | Metric depth and surface normals alternative |
| [MiDaS](https://github.com/isl-org/MiDaS) | MIT | Relative depth alternative |
| [OpenCV](https://github.com/opencv/opencv) | Apache-2.0 | Feature tracking and homography for the parallax test |
| [MediaPipe](https://github.com/google-ai-edge/mediapipe) | Apache-2.0 | Phone object detector and hand landmarker |
| [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) | Apache-2.0 | Dense-text reading on the laptop |
| [temperature_scaling](https://github.com/gpleiss/temperature_scaling) | MIT | Calibration reference |
| [MAPIE](https://github.com/scikit-learn-contrib/MAPIE) | BSD-3 | Conformal prediction |
| [conformal-prediction](https://github.com/aangelopoulos/conformal-prediction) | MIT | Conformal tutorials |
| [OD-CP](https://github.com/mos-ks/OD-CP) | MIT | Conformal object detection |
| [CODS](https://github.com/leoandeol/cods) | None; contact owner | Conformal object detection library |
| [intel_conformal_od](https://github.com/divake/intel_conformal_od) | None; contact owner | Real-time conformal detection on Core Ultra 7 165H |
| [KL-Loss](https://github.com/ethanhe42/KL-Loss) | Apache-2.0 | Box-position uncertainty |
| [pytorch-ood](https://github.com/kkirchheim/pytorch-ood) | Apache-2.0 | Novelty detection |
| [pytorch-grad-cam](https://github.com/jacobgil/pytorch-grad-cam) | MIT | Saliency maps |
| [rgbd-scene-graph](https://github.com/ab17dogar/rgbd-scene-graph) | MIT | Scene graphs with structural priors: System 2 thinking in research form |
| [HOV-SG](https://github.com/hovsg/HOV-SG), [Hydra](https://github.com/MIT-SPARK/Hydra) | MIT | Scene-graph references for world-map structure |
| [VisionGuide-Assist](https://github.com/Suryansh0402/VisionGuide-Assist), [AutoDoor-DataEngine](https://github.com/Suryansh0402/AutoDoor-DataEngine) | MIT | Optional room variant: door state and AI-assisted door labelling |

---

## 12. Open questions for the team

1. Which System 2 parts go into P0 (recommended: 4.2, 4.3, 4.4, 4.5, 4.9)?
2. Who labels the few hundred tabletop detections needed for calibration (Evidence lead)?
3. ~~Which real-vs-picture props?~~ Decided 28 Oct: all three, including a picture on the judge's
   own phone, chosen by the judge.
4. Contact the owners of CODS and intel_conformal_od now, in case we want their code?
