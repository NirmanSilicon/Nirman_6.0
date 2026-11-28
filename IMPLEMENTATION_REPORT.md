# Implementation report — third integration pass

Supplied for this phase: the `v2` foundation ZIP (`SANGAM_Complete_Implementation_v2.zip`, the prior phase's own
deliverable and this phase's source of truth), `SANGAM_Person4_Environmental_Sound_Alerts.zip`,
`SANGAM_Day2_Person3_Updated.zip`, and a 25-part master specification whose central, most heavily emphasised
requirement was to actively investigate, obtain and install a real pretrained sign-language model — explicitly not
hand tracking alone, not a personal gesture-teaching system, not hardcoded rules, never confused with sentence-level
translation, with no invented accuracy numbers and no mock test reported as a real one.

This report is the narrative of what was done. `PROJECT_AUDIT_AND_PROBLEM_REGISTER.md` is the problem-by-problem
accounting; `THREE_ZIP_COMPARISON.md` is the structural comparison of the three inputs;
`docs/SIGN_LANGUAGE_MODEL_EVALUATION.md` is the full technical and licensing detail on the models themselves;
`TEST_REPORT.md` is the full, category-disciplined test accounting. This document ties them together.

## 1. The central mandate: a real pretrained sign-language model

### 1.1 Why the earlier conclusion was wrong, not just outdated

The `v2` foundation's own research (`docs/SIGN_LANGUAGE_MODEL_RESEARCH.md`) had concluded, reasonably given what it
tried, that no usable pretrained ISL model could be obtained: the obvious hosts for the INCLUDE dataset and any
model trained on it — Zenodo, Hugging Face, Kaggle, Google Cloud Storage — were all unreachable from that build
environment. This phase re-opened the question rather than accepting that conclusion at face value, because the
master specification treated "could not get a model" as acceptable only if every reasonable alternative had
genuinely been exhausted and explained — and one had not: GitHub itself (both raw file content via
`raw.githubusercontent.com` and release assets) was never tried, and it is reachable. AI4Bharat — the same
group behind INCLUDE — publishes ready pretrained checkpoints for it through a GitHub release in a project called
OpenHands, under an Apache-2.0 licence.

### 1.2 What was obtained, and how it was verified as real

Two checkpoints were downloaded directly from the official `AI4Bharat/OpenHands` GitHub release
(`checkpoints_v1`): an SL-GCN model trained on INCLUDE (263 ISL signs) and the same architecture trained on
WLASL2000 (2,000 ASL signs). Both are PyTorch Lightning `.ckpt` files — ZIP archives containing a pickled model
state and raw tensor storage.

Reading an untrusted pickle file safely, without ever executing arbitrary code from it, needed its own tooling,
built twice:

- **Python** (`safeload.py`, development-only): a `SafeUnpickler` subclassing `pickle.Unpickler` that resolves only
  the tensor-rebuild/storage globals the checkpoint actually needs, stubbing Lightning's callback classes
  (`EarlyStopping`, `ModelCheckpoint`) as inert placeholders rather than constructing them. Used only to generate
  the development-time golden fixtures below and to cross-check the architecture — never shipped, never run at
  install- or run-time.
- **Pure Node.js** (`scripts/sign-models/torch-ckpt.js`): a from-scratch pickle-opcode interpreter implementing
  exactly the opcodes PyTorch emits, with no dependency on Python or any ML framework. This is what the shipped
  installer actually uses.

The installer (`scripts/sign-models/install.js`) then:

1. Verifies every downloaded archive's size and SHA-256 against values recorded in that language's `manifest.json`.
2. Reads the checkpoint with the Node pickle interpreter.
3. Checks every tensor's name and shape against the exact OpenHands `DecoupledGCN` architecture (10 blocks,
   channel widths 64-64-64-64-128-128-128-256-256-256, documented in `install.js`'s `LAYERS` constant, taken
   directly from `decoupled_gcn.py`) — refusing to install anything that does not match.
4. Derives the label list exactly as OpenHands' own dataset loader does, and checks its length against the
   classifier's output size.
5. Writes `model.json` (architecture spec), `weights.bin` (the flat tensor data) and `install-receipt.json`
   (install timestamp, hashes, tensor/parameter counts) into `vendor/sign-models/<lang>/<modelDir>/`.

To run the model in the browser without shipping PyTorch, ONNX Runtime, or TensorFlow.js, the architecture was
reimplemented from scratch in plain JavaScript (`assets/sign-model.js`): the decoupled graph convolution, the
9-frame temporal convolution, spatial/temporal/channel self-attention, and a linear classifier, reading the
installed `weights.bin` directly.

**This is the step that proves the model is real, not approximated:** the real checkpoint was separately loaded in
actual PyTorch (via the Python safe-unpickler) and run forward on synthetic test clips of three different lengths
(1, 9, 48 frames), producing golden output logits. SANGAM's JavaScript is run on the exact same installed weights
and the exact same clips, and the two are compared. Maximum absolute difference: **7.63 × 10⁻⁶** for ISL, **4.58 ×
10⁻⁵** for ASL — both far inside the 10⁻³ tolerance expected from two independent float32 implementations, and
identical top-1 predictions in every case. This is `test-sign-model.js`, explicitly labelled as Category D (real
model inference, no camera, no human) and never conflated with any other test category.

### 1.3 The architecture mismatch, and how it was resolved without a rewrite

The pretrained models require MediaPipe Holistic's 27-point body+hand pose layout, while the existing
`sign-engine.js` used MediaPipe Hands' 21-point-per-hand layout for the personal DTW recogniser. Rather than
rewriting the existing, working, tested pipeline, MediaPipe Holistic was vendored separately (Apache-2.0, `lite`
pose variant only — explained in `vendor/mediapipe/holistic/NOTICE.md`) and a parallel `HolisticExtractor` built.
Both extractors feed the same `E.Segmenter`/`E.Stabiliser` infrastructure by constructing compatible frame objects,
so no segmentation or stabilisation logic was duplicated.

### 1.4 Licensing — the one place this phase corrected the prior phase's own research, not just extended it

INCLUDE's actual licence is **CC BY 4.0** (commercial use permitted with attribution), not the CC BY-NC-SA 4.0 the
prior research recorded — that earlier figure came from a *different, derived* dataset's licence page rather than
INCLUDE's own Zenodo/Hugging Face record, checked directly this phase. Because of this, the ISL model is **bundled**
in this ZIP. WLASL's licence (Computational Use of Data Agreement 1.0, "No commercial usage is allowed") is
correctly restrictive, so the ASL model is **not bundled** — it installs only via an explicit
`--accept-wlasl-terms` flag, a deliberate friction point rather than a silent default. Full detail and sources:
`docs/SIGN_LANGUAGE_MODEL_EVALUATION.md`.

### 1.5 What this is not, stated as the specification demanded

Both models classify one isolated sign per clip. Neither has any concept of grammar, non-manual markers, or
continuous signing — a user who signs a sentence gets, at best, a sequence of independently recognised words, never
a translated sentence. The only accuracy figures anywhere in this build are the original authors' own published
test-split numbers (93.5% ISL, 30.6% ASL, OpenHands paper Table 2), explicitly marked `doNotQuoteAsSangamAccuracy`
in both model manifests, because **no real Deaf signer has used this build**, and no SANGAM-measured accuracy
figure exists or is claimed.

## 2. Merging the two supplementary ZIPs without downgrading the foundation

Both `SANGAM_Person4_Environmental_Sound_Alerts.zip` and `SANGAM_Day2_Person3_Updated.zip` were inspected by direct
extraction before any merge decision — see `THREE_ZIP_COMPARISON.md` for the full structural comparison. Both
turned out to be forked from a much earlier, pre-modularisation, single-file-`app.js`, no-backend snapshot of
SANGAM, structurally incompatible with the foundation's current 17-module-plus-backend architecture. Merging either
tree wholesale would have meant reconciling two incompatible generations of the project and risked reintroducing
the earlier, less capable architecture over the current one — the one outcome the specification explicitly
forbids. Instead, each ZIP's specific contributed idea was extracted and reimplemented against the foundation's
current code.

### 2.1 Person 3's haptic patterns

P3 contributed four vibration rhythms (Yes/No/Help/Emergency) different from the foundation's own ten. Rather than
choosing one set over the other, `assets/outputs.js` now exposes both as a selectable preset
(`PRESETS = {sangam, day2}`, profile field `hapPreset`, defaulting to the foundation's own set so no existing
user's experience changes unless they opt in). P3's own three timing-scale levels were not separately ported, since
the foundation already has an equivalent, more thoroughly tested intensity system — a deliberate scope decision
stated in `THREE_ZIP_COMPARISON.md` rather than left silent.

### 2.2 Person 4's loudness-only sound detection

P4's prototype detects "loud sound activity" purely from microphone RMS amplitude — its own implementation notes
state explicitly that this is "deliberately not described as an alarm/siren/knock/bark classifier." Using this as
the foundation's sound-detection mechanism would have been a real downgrade from the foundation's existing real
YAMNet 521-class classifier. Instead, `sound-engine.js` adds it as a separate, **off-by-default** fallback category
("Loud sound (not identified)"), architecturally gated (`anyClassifiedActiveOrNow` in
`Detector.prototype.push`) so it can never fire in the same window as, or while, a real classified category is
active. Every surface — banner, history line, spoken alert, dispatched event — labels it distinctly from a real
classification, so a user can never mistake "something was loud" for "YAMNet recognised a specific sound." This
directly uses P4's one real insight (catching a genuinely novel noise no classifier was trained on) while rejecting
the one thing that would have been a downgrade (loudness as the *only* detection mechanism).

## 3. Honest accounting of mistakes made and fixed during this phase's own work

Per the specification's demand for honesty about process, not only about the inputs: a self-introduced
double-event-listener bug in the haptic-preset UI, a test-authoring bug while verifying that fix, an index-space
confusion in a shoulder-centring unit test, four stale "ISL not installed" assertions that needed updating once
real models were installed, a vocabulary-label assumption that turned out to be a genuine dataset quirk (documented
rather than "corrected"), an initially-incomplete UI wiring for the loud-sound toggle (closed before any test for
the feature was written, not after), and one test assertion that initially misread the real YAMNet model's
legitimate multi-category classification as a bug. Full detail, cause, and resolution for each:
`PROJECT_AUDIT_AND_PROBLEM_REGISTER.md`.

## 4. Testing

44 new automated checks (`test-sign-model.js`: 33; `test-sound-engine.js` additions: 11) and 18 new browser checks
(`test-access-browser.js` additions for the Day 2 preset; `test-sound-browser.js` additions for the loud-sound
fallback; `test-sign-browser.js` updates for the real ISL/ASL models now appearing as Available) were added. The
full suite — `npm run test:all` — passes **812 checks, 0 failed** from a clean extraction of the final ZIP as it
actually ships (ISL bundled, ASL not bundled), and **821** in this project's own development checkout with ASL also
installed for parity verification. Both were run before structural changes (baseline) and after every change in
this phase. Every check is categorised (automated logic / browser with hardware stand-ins / real model inference /
real device / human validation) in `TEST_REPORT.md`, and no category's result is ever merged into another's count.
Two isolated, non-reproducible accessibility-suite flakes were observed and investigated during final clean-extract
verification — see `TEST_REPORT.md`'s "Clean-extract run (third pass)" for the full account; neither reproduced in
three follow-up isolated runs of that suite.

## 5. Scope decisions, stated plainly

This phase's engineering effort concentrated on the specification's primary, most heavily emphasised mandate (a
real pretrained sign model) and the two supplementary-ZIP merges. The foundation's other major subsystems
(backend/chat, translation, Braille, deafblind options, switch accessibility, live voice/WebRTC, emergency
communication, UI/UX, accessibility, security) were **re-verified by running their existing, substantial automated
and browser test suites** rather than re-audited line by line from scratch in this phase — a deliberate scope
choice, documented in `PROJECT_AUDIT_AND_PROBLEM_REGISTER.md`, not an oversight. Those suites passed unchanged
(see the "Total" figures above), which is real evidence against regression, though it is not a fresh correctness
audit of those subsystems' original design, which was performed and documented in the phase that built them
(`REQUIREMENTS_REGISTER.md`).

## 6. What was not done, and why

- No real Deaf ISL or ASL signer has used either pretrained model. This remains the largest open gap, and is
  stated as such in every document that discusses the models.
- Regional/dialect, skin-tone, lighting and camera-angle coverage for both the hand-tracking pipeline and the
  pretrained models is unmeasured — a known, general limitation of lab-trained sign-recognition models, not
  specific to this build, but not resolved by it either.
- Real alarm/doorbell/siren/horn recordings remain untested (unchanged from the prior phase; no such recordings
  were available in this environment).
- No physical hardware (vibration motor, Braille display, switch device, two separate phones on a live call) was
  tested this phase; all remain stand-ins in the automated suite, as in the prior phase.

## 7. Deliverables

`PROJECT_AUDIT_AND_PROBLEM_REGISTER.md`, `THREE_ZIP_COMPARISON.md`, `IMPLEMENTATION_REPORT.md` (this file),
`docs/SIGN_LANGUAGE_MODEL_EVALUATION.md`, `docs/MODEL_INSTALLATION_GUIDE.md`, updated `TEST_REPORT.md`,
`CHANGELOG.md`, `README.md`, and the project ZIP `SANGAM_FINAL_COMPLETE_UPGRADED.zip`.

## 8. Final verification of the ZIP

See `TEST_REPORT.md`, "Clean-extract run (third pass)", filled in once the final ZIP was built and independently
re-tested from a fresh extraction.
