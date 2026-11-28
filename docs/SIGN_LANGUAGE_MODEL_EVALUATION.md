# Sign-language recognition: the real pretrained models shipped in this build

**This document supersedes the conclusion of `docs/SIGN_LANGUAGE_MODEL_RESEARCH.md`.** That document (written in an
earlier build) concluded no usable pretrained ISL model could be obtained and shipped only a personal, hand-taught
DTW recogniser. That conclusion has been overturned: this build ships **real, genuinely pretrained** Indian Sign
Language and American Sign Language isolated-word recognisers, running entirely in the browser. The earlier
document is kept for its research trail and is not deleted, but its "no model installed" conclusion no longer
describes this build. Read this file for what is actually installed, and `MODEL_INSTALLATION_GUIDE.md` for how.

## What changed, in one paragraph

The earlier build's research treated the obvious ISL dataset host (Zenodo) and model hosts (Hugging Face, Kaggle,
Google Cloud Storage) as the only paths, and all of those were blocked from this build environment. This phase
found that **GitHub itself — both raw file content and release assets — was reachable**, and AI4Bharat (the group
that publishes the INCLUDE dataset) also publishes ready-to-use pretrained checkpoints for it through a GitHub
release, in a project called OpenHands. That is a genuinely different, and better, path than training a model from
scratch: it is the authors' own trained weights, with their own published accuracy figures, under a clear
open-source licence.

## What "real" means here, stated plainly against the master specification's bar

- **Not hand tracking alone.** The model consumes MediaPipe Holistic body+hand pose sequences and runs a trained
  10-layer graph neural network (SL-GCN) over them to classify a sign. Hand tracking is the input; the sign
  classification is a learned model with millions of trained parameters, not a rule or a distance heuristic.
- **Not a personal gesture-teaching system.** Unlike the pre-existing DTW recogniser (which only ever recognises
  signs a specific person records and labels on their own device), this model was trained once, by AI4Bharat, on a
  dataset of 263 (ISL) or 2,000 (ASL) sign classes performed by many different Deaf signers, and recognises those
  words for anyone, without per-user training.
- **Not hardcoded rules.** There is no `if`-statement anywhere in the recognition path that names a sign. Every
  decision comes from matrix multiplications over weights read from the official checkpoint file.
- **Not fake or mock AI.** The exact published weights are used; see "Bit-for-bit verification" below for how this
  was checked rather than assumed.
- **Isolated-word, not sentence-level translation — stated, not blurred.** Both models classify **one sign at a
  time** from a short clip. SANGAM's UI, `PretrainedAdapter.getSupportedLanguage()`, and every document in this
  build say so. A user who signs a sentence does not get a sentence back; they get, at best, a sequence of
  recognised words with no grammar.
- **No invented accuracy numbers.** The only accuracy figures used anywhere in this build are the ones the OpenHands
  paper itself published (below), explicitly marked `doNotQuoteAsSangamAccuracy: true` in both manifests, because
  SANGAM has not run its own accuracy evaluation on real signers (see "What is still not verified").
- **Mock tests are never reported as real-world tests.** See the test-category table below — the only thing
  verified with real deployed weights is that SANGAM's JavaScript reimplementation computes the same numbers
  PyTorch computes on the same weights. No real Deaf signer has used this model yet, and that is stated, not
  implied.
- **Licensing was checked before use**, and the two models differ in an important way — see "Licensing" below.

## The two models

| | ISL | ASL |
|---|---|---|
| Model id | `isl-include-slgcn-openhands-v1` | `asl-wlasl2000-slgcn-openhands-v1` |
| Dataset | INCLUDE (AI4Bharat/IIT Madras) | WLASL2000 |
| Vocabulary | 263 signs, 1 excluded as untrained by the authors (`Second(Number)`) → 262 usable | 2,000 signs |
| Signers | Deaf students, St. Louis School for the Deaf, Adyar, Chennai | 100+ signers, web-collected video |
| Architecture | SL-GCN (10-block decoupled graph convolution + temporal convolution + spatial/temporal/channel attention) | same architecture, different trained weights |
| Parameters | 3,688,675 | 4,135,084 |
| Installed weights size | 14,754,700 bytes (14.75 MB) | 16,540,336 bytes (16.5 MB) |
| Accuracy published by the authors (OpenHands paper, Table 2, top-1) | **93.5%** on the INCLUDE test split | **30.6%** on the WLASL2000 test split |
| Bundled in the ZIP? | **Yes** | **No — download-only, see Licensing** |

Both numbers above are **the original authors' published results on their own held-out test split**, not a number
SANGAM measured. The large gap between them (93.5% vs 30.6%) is expected and is itself informative: INCLUDE has far
fewer classes (263 vs 2,000) and a more controlled recording setup, so it is a substantially easier classification
problem. Quoting ASL's 30.6% without this context would be misleading in the other direction — stated here so
nobody mistakes it for a broken installation.

## Licensing — why ISL is bundled and ASL is not

This is the one place where this phase's research corrected an earlier, wrong conclusion rather than confirming it.

- **INCLUDE (ISL dataset)** is published under **Creative Commons Attribution 4.0 International (CC BY 4.0)**, per
  its own Zenodo record and Hugging Face dataset card. CC BY 4.0 permits commercial use, provided attribution is
  given. The earlier build's research document (written under network conditions that could not reach Zenodo at
  all) recorded this as "CC BY-NC-SA 4.0 (non-commercial)" — citing a *different, derived* dataset's licence page,
  not INCLUDE's own. That was a real error in the prior research, now corrected with the primary source checked
  directly. Attribution is given in `NOTICE.md` and in the ISL model's `manifest.json`.
- **The OpenHands code and the checkpoint release itself** are published under the **Apache-2.0** licence
  (AI4Bharat/OpenHands repository). SANGAM's JavaScript port of the architecture (`assets/sign-model.js`) is a
  derivative of `decoupled_gcn.py`, `fc.py` and `pose_transforms.py` and is licensed and attributed accordingly.
- Because of CC BY 4.0, the ISL model (weights, not the original dataset videos) is **bundled directly in this
  ZIP**, pre-installed in `vendor/sign-models/isl/include-slgcn/`.
- **WLASL (ASL dataset)** is released under the **Computational Use of Data Agreement (C-UDA 1.0)**, and the
  dataset's own page states plainly: *"No commercial usage is allowed."* That is a real restriction SANGAM must
  respect. So the ASL model's trained weights are **not bundled** in this ZIP. The installer
  (`scripts/sign-models/install.js`) downloads them from the official AI4Bharat release **only** when run with
  `--accept-wlasl-terms`, which is a deliberate, explicit, logged step — not a silent default. See
  `MODEL_INSTALLATION_GUIDE.md`.
- Practically: this build's own checkout has ASL installed too (for testing and for parity verification against the
  golden PyTorch fixtures), but a fresh extraction of the shipped ZIP will **not** include the ASL weights until
  someone runs the installer and accepts those terms. ISL is available immediately on first run.

## Bit-for-bit verification: how "this is the real model" was actually checked, not assumed

It would be easy to silently run a different, smaller, invented network and call it "the pretrained model." That
was not done, and here is the verification trail so it can be checked independently:

1. **Architecture match.** `scripts/sign-models/install.js` hardcodes the exact OpenHands `DecoupledGCN` block
   layout (`LAYERS`, 10 blocks, channel widths 64/64/64/64/128/128/128/256/256/256, strides at blocks 5 and 8) taken
   directly from `decoupled_gcn.py`, and the installer refuses to install a checkpoint whose tensor names and shapes
   do not match this layout exactly (`expectedShapes()`).
2. **Byte-for-byte source integrity.** Every downloaded archive's size and SHA-256 are checked against the values
   recorded in `manifest.json` before anything is read from it.
3. **Safe, faithful reading of the checkpoint.** The `.ckpt` file is a `pickle`-serialised PyTorch Lightning
   checkpoint. Rather than trusting `torch.load()` (which can execute arbitrary code from a pickle, or in its
   `weights_only=True` default refuse to load Lightning's own checkpoint format), this build implements its own
   restricted pickle-opcode interpreter twice: once in Python (`safeload.py`, used only at development time to
   generate the golden fixtures below) and once in pure Node.js
   (`scripts/sign-models/torch-ckpt.js`, used by the actual production installer, with zero Python dependency at
   install- or run-time). Neither interpreter ever executes a class constructor or method from the pickle; unknown
   globals become inert placeholder objects.
4. **Independent PyTorch cross-check (development only, not shipped).** Separately, the real checkpoint was loaded
   in actual PyTorch (with a restricted unpickler, see above) and run forward on synthetic test clips of 3 different
   lengths (1, 9 and 48 frames), producing "golden" output logits
   (`test-support/sign-model-golden/isl-include-slgcn.json`, `asl-wlasl2000-slgcn.json`).
5. **Parity test, run as part of this ZIP's own test suite** (`test-sign-model.js`, Category D — real model
   inference, no camera): SANGAM's pure-JavaScript reimplementation of the architecture
   (`assets/sign-model.js`) is run on the exact same installed weights and the exact same synthetic test clips, and
   its output is compared to the golden PyTorch logits.
   - **ISL:** maximum absolute difference across all 3 clip lengths = **7.63 × 10⁻⁶**; identical top-1 prediction on
     all 3 cases.
   - **ASL:** maximum absolute difference across all 3 clip lengths = **4.58 × 10⁻⁵**; identical top-1 prediction on
     all 3 cases.
   - Both are far below the 1 × 10⁻³ tolerance set for float32 rounding differences between two independent
     implementations — in practice this is as close to "the same computation" as two different language runtimes
     doing float32 math can get.
6. **Preprocessing parity, separately.** The pose-selection and shoulder-centring/scaling math
   (`PoseSelect` + `CenterAndScaleNormalize`) is also checked independently against OpenHands' own transform code on
   raw synthetic landmark arrays: maximum absolute difference = 4.77 × 10⁻⁷ for both models.

This proves SANGAM's JavaScript faithfully reproduces the authors' own trained model's math. It does **not** prove
the authors' published 93.5%/30.6% figures are achievable by a real person signing into a webcam running this
specific build — see the next section.

## Test-category discipline (so these results are never misread as more than they are)

Per this build's test-category convention (see `TEST_REPORT.md`), these results fall into exactly one category and
must never be merged with any other:

| Category | What was done here | What it proves | What it does NOT prove |
|---|---|---|---|
| D — Real model inference, no camera, no human | Golden-fixture parity (above) | SANGAM's JS math matches real PyTorch on the real released weights, to float32 precision | Nothing about recognising a real sign from a real camera |
| A — Automated unit logic | `preprocess()`, `decide()`, installer helper functions tested on synthetic arrays (`test-sign-model.js`) | The surrounding code (resampling, aspect correction, accept/reject thresholds) behaves as designed | Nothing about model accuracy |
| B — Browser, fake camera/mock hands | `test-sign-browser.js`: the ISL/ASL entries appear correctly in the language picker as "Available," the About panel states the architecture and the non-verification disclaimer, the UI correctly shows "Model score: X%, not independently verified by SANGAM" instead of the DTW recogniser's "Match: X%" wording | The UI wiring and honesty of the presented confidence language | Nothing about real signing |
| Real device / human validation | **Not done.** No camera recording of a real Deaf signer exists anywhere in this project. | — | This is the gap. See below. |

## What is still not verified (stated as plainly as the master specification requires)

- **No real person has signed into a real camera and been recognised by either model in this build.** Every number
  above is either the authors' own published test-split result, or a same-weights cross-runtime math check. Nothing
  here is a measurement of SANGAM's real-world recognition rate, because no such measurement has been made.
- **The published 93.5%/30.6% figures are test-split numbers from the authors' own controlled recording conditions**
  (INCLUDE: a fixed camera, upper body in view, Chennai-based student signers; WLASL: web-collected clips of varying
  quality). Accuracy on a phone camera, in a home, with a signer of a different region, dialect, skin tone, hand
  size, or signing speed is **unknown** and is very likely to be lower. This is a known, general problem with
  lab-benchmark sign-recognition numbers, not specific to these two models.
- **Isolated-word only.** Neither model has any concept of a sentence, a classifier handshape modifying a noun, a
  non-manual marker (facial grammar), or continuous signing. A user who performs a sequence of signs will, at best,
  get a sequence of independently recognised words — SANGAM does not synthesise grammar between them.
- **No Deaf ISL or ASL signer has reviewed the vocabulary, the UI wording, or the output of this build.** This
  remains, as it was in the earlier research document, a real gap: published lab accuracy is not usability, and
  usability requires people who actually use the language.
- **Regional and dialect coverage is unmeasured.** INCLUDE was recorded in Chennai; it does not claim to represent
  every regional variety of Indian Sign Language, and this build makes no claim that it does.
- **The vocabulary is fixed and incomplete.** ISL's 262 usable words do not include "yes" or "no"; ASL's 2,000-word
  WLASL2000 vocabulary does include "YES," "NO," "HELP," "HELLO" and "THANK YOU." Neither vocabulary was chosen or
  curated by SANGAM; both are exactly the classes the original authors trained on.

## The single most important structural finding of this phase: the model cannot say "none of these"

Before the individual pipeline fixes below, this is the one finding most likely to explain the complaint that
predictions do not correspond to the sign actually performed, and it was found empirically, not theorised: a
Category C mechanics test (`test-sign-video.js` — see its file header) feeds a non-human ffmpeg test-pattern video
through the real decode -> real MediaPipe Holistic -> real SL-GCN chain. On roughly 1 in every 2-3 runs, Holistic
produces a few spurious, non-zero "detections" on this pattern (not a real body - there is none in the clip), and
once enough of those land in one segment to clear a minimum-length safety floor (see below), the model does not
shrug and say "I don't see a sign" - it reports A specific real vocabulary word (observed across repeated runs:
"weak", "Computer" - the exact word is unstable run to run, which itself supports "noise lands on whichever class
the network happens to favour" rather than any meaningful signal) with a softmax probability observed from roughly
0.85 up to essentially **1.0**. High to near-total confidence, on garbage input.

This is not a bug that can be patched with a threshold. `decide()`'s acceptance logic (`minP`, `minMargin`) exists to
reject a weak or ambiguous top score, but there is no "weak" or "ambiguous" about a softmax output of 1.0 for one
class and approximately 0 for all others - by every available internal signal, the model is maximally certain. The
underlying architecture is a closed-set classifier: it was trained to produce a probability distribution over
exactly its known vocabulary (262 words for ISL, 2000 for ASL) and nothing else. It has no trained "none of the
above," "not a sign," or "out of vocabulary" output. Mathematically, it is **incapable of expressing "I don't know
what that was"** - every input, however it arrives (a real but unlisted sign, a tracking glitch, two signs
run together, noise), is forced through a softmax that must sum to 1 across the known classes and will, by
construction, usually produce a confident-looking peak somewhere.

**Why this plausibly explains the user's core complaint directly:** a real signer performing a real, listed sign,
imperfectly tracked (partial occlusion, an unconventional hand angle this specific checkpoint under-represents, a
sign segmented slightly wrong by the Segmenter, or simply a sign not in the installed vocabulary at all) would,
by this same mechanism, still receive a specific, often confident-looking word back - just the wrong one - rather
than an honest "not recognised." This is a stronger and more fundamental candidate explanation than any single
preprocessing bug, because it would persist even after every preprocessing bug (aspect ratio, pose-model mismatch,
frame-count floor) is fixed: a wrong but confident answer from a closed-set classifier fed anything outside its
comfort zone is expected behaviour for this architecture, not a defect introduced by SANGAM's integration of it.

**What was and was not done about it:**
- **Not done, and not attempted:** re-training the model with an explicit rejection/background class, or any other
  change to the model's own learned behaviour. That would need the original training pipeline, compute, and
  datasets, none of which are available in this environment, and doing it without them would mean inventing
  numbers - exactly what the master specification forbids.
- **Not done, deliberately:** tightening `decide()`'s `minP`/`minMargin` thresholds in response to this finding.
  Those thresholds help with genuinely marginal/ambiguous scores; they cannot and do not help against a saturated
  p=1.0 result, so adjusting them in reaction to this finding would only suppress *other*, less-confident (and
  possibly more often correct) predictions, while doing nothing for the exact failure mode just found. That would
  be presentational, not a fix, and is exactly the "hide bad predictions via threshold manipulation" the master
  specification prohibits.
- **Done:** the minimum-frame-count floor below (`MIN_CLASSIFY_FRAMES`), which at least prevents the shortest,
  most obviously-degenerate inputs from ever reaching this failure mode, without touching confidence thresholds.
- **Recorded, not hidden:** this limitation is left as a documented, open, structural finding for any future
  work on this model, and the test that found it (`test-sign-video.js`) is kept in the suite specifically because
  it continues to surface this honestly rather than being tuned to always pass.

## Pipeline bug fixes made in this phase (Category A/D fixed and tested; Category E — real webcam — still open)

Two concrete mismatches between SANGAM's inference-time pipeline and the models' training/evaluation-time pipeline
were found by direct code inspection, fixed, and covered by new automated tests (Category A unit test and Category D
real-browser/real-WASM-but-fake-camera test, per the table above — **neither is a Category E real-webcam test**; see
`TEST_REPORT.md`). Both were real, reproducible bugs, not merely theoretical: both are now demonstrated end-to-end
with real code paths, not just asserted.

1. **Camera aspect-ratio correction was permanently dead code.** `PretrainedAdapter.classify()` (`assets/sign-model.js`)
   only rescales landmark x-coordinates to match the training videos' aspect ratio when `opts.cameraAspect` is set,
   but `assets/sign.js` constructed every `PretrainedAdapter` with a permanently empty `{}` options object and never
   populated it afterwards — so this correction never ran, for any camera, for either model. Any webcam whose aspect
   ratio differs from the reference (ISL: 16:9, from INCLUDE's 1920×1080 recordings) fed geometrically distorted
   coordinates into the model on every single clip. **Fixed:** `assets/sign.js` now reads the real, live
   `video.videoWidth`/`videoHeight` once the camera stream starts (and again on the video's own `resize` event, for a
   mid-session resolution change), and writes the resulting aspect ratio into both pretrained adapters' `opts`
   objects, which `classify()` re-reads on every call. Verified two ways: a unit test in `test-sign-model.js` feeds
   identical synthetic landmark frames through `classify()` with and without `opts.cameraAspect` set and confirms the
   model's output actually changes (proving the correction is wired into the real inference path, not just present
   and unused); a real-browser test in `test-sign-browser.js` forces Chromium's real (if synthetic) camera to a 4:3
   resolution and confirms the ISL adapter's `opts.cameraAspect` is set to the camera's real measured ratio, that it
   is restored to a non-stale value on close, and that it is wired independently for ASL where installed.
   **Known remaining gap:** ASL's manifest has no `referenceAspect` value at all (WLASL's source videos have no
   single canonical resolution, unlike INCLUDE's uniform lab recordings, so there is no single correct reference
   value to put there), so this correction is still a documented no-op for ASL specifically — this is a data gap,
   not a wiring bug, and inventing a value would be worse than leaving it undone.
2. **MediaPipe Holistic's pose-landmark model did not match the one the checkpoints were evaluated with.** The ISL
   manifest records that OpenHands' own published 93.5% figure used pose extracted with Holistic's **heavy** model;
   SANGAM's `HolisticExtractor` forced `modelComplexity: 0` (**lite**, the least accurate of Holistic's three pose
   models), and only the `lite` `.tflite` file was even vendored, so no other choice was possible without adding
   files. **Fixed, partially:** `pose_landmark_full.tflite` (complexity 1, "full") is now vendored from the exact
   same package version as the existing `lite` file (checksummed), and `HolisticExtractor` now requests
   `modelComplexity: 1`. This is MediaPipe's own library default and a genuine accuracy step up from lite. **Why not
   heavy (the exact match):** heavy is vendored nowhere in this build and `modelComplexity: 2` is not used, because
   heavy is substantially slower per frame and this sandbox has no real camera or real device on which to measure
   whether that latency is acceptable for a real-time webcam feature — shipping an unmeasured latency regression
   would be worse than the already-documented accuracy gap. See `vendor/mediapipe/holistic/NOTICE.md` for exactly
   what it would take to switch to heavy later (two lines, once someone can benchmark it on real hardware). Verified
   with a real-browser test in `test-sign-browser.js` that starts real MediaPipe Holistic against Chromium's fake
   camera with ISL selected and confirms `pose_landmark_full.tflite` (not `lite`, not an unvendored `heavy`) is the
   file actually fetched and that tracking actually starts successfully.
3. **Temporal resampling was audited against OpenHands' actual released configuration, and was found to have no
   OpenHands counterpart at all — so there is no "parity" to fix it into, and none was invented.** This was checked
   by reading, not assuming: a fresh, authoritative clone of `AI4Bharat/OpenHands` (`examples/configs/include/decoupled_gcn.yaml`
   and `examples/configs/wlasl/decoupled_gcn.yaml` — the exact configs for the exact "SL-GCN"/"decoupled-gcn"
   architecture SANGAM ported) shows `PoseTemporalSubsample` **commented out** in every one of their train, valid and
   test pipelines, for both languages. The authors' own test-time pipeline is just
   `PoseSelect -> CenterAndScaleNormalize -> model` — no frame-count or frame-rate normalisation step of any kind.
   `openhands/datasets/pipelines/generate_pose.py`'s `MediaPipePoseGenerator.get_holistic_keypoints()` confirms why:
   it calls MediaPipe Holistic once per decoded video frame, with no resampling, so the model was trained and
   evaluated on exactly however many pose frames each source video file's native frame rate produced. The encoder
   itself (`DecoupledGCN`) ends with a mean-pool over the time axis (confirmed in the ported `decoupled_gcn.py`),
   so it is architecturally agnostic to sequence length — consistent with the authors never needing to standardise it.
   **Consequence:** `resampleToFps()` in `assets/sign-model.js` is entirely SANGAM's own invention, written to cope
   with something OpenHands' authors never had to handle — a live browser camera and on-device MediaPipe inference,
   whose effective frame rate is not fixed and varies with CPU load, unlike a pre-recorded video file. It is not a
   case of SANGAM's algorithm being wrong versus a reference algorithm; there is no reference algorithm. What *is*
   unverified is the specific `targetFps` value (25) each model manifest carries, which is an assumption about
   INCLUDE's and WLASL2000's native recording frame rate, not a number confirmed from either dataset's own
   documentation — their Zenodo record, Hugging Face dataset card and the ACM paper itself were all unreachable from
   this project's network environment (same restriction noted earlier in this document), and neither dataset's
   GitHub tooling states a frame rate anywhere in its code. **This was left as-is, not changed**, because there is no
   evidence either that 25 is wrong or that removing resampling (feeding the camera's raw, irregular capture rate
   directly) would do better — changing it without evidence would be exactly the kind of unverified guess this
   document exists to avoid. The honest status: resampling's *mechanics* are correct and unit-tested
   (`test-sign-model.js`: nearest-frame-by-timestamp lands exactly where expected for a given target rate); whether
   resampling to 25fps specifically *helps, hurts, or is neutral* for real predictions is an open, empirical question
   that a Category C recorded-reference-video harness (planned next) is positioned to start answering, by comparing
   predictions with resampling on vs. off, and at a few candidate target rates, against a known-correct label.
4. **None of the three fixes/audits above have been measured against a real signer on a real webcam**, because this
   is a cloud sandbox with no camera hardware. The two code fixes are real, verified improvements to pipeline
   *correctness* (the code now does what the pipeline's own design says it should), not measurements of recognition
   *accuracy* — those remain exactly as unverified as the rest of this document says, and must not be read as
   resolving the "predictions don't match the sign performed" complaint on their own. See this document's earlier
   sections for what would be needed to actually measure that (a real camera, a real signer, or at minimum real
   labelled reference video clips run through the real browser pipeline), and `TEST_REPORT.md` for a live-webcam test
   procedure once available.

## Search for a real, legally usable labelled reference video (for Category C testing) — exhausted, inconclusive

The master specification asked for recorded, labelled ISL/ASL reference video clips to validate the pipeline
end-to-end (video file -> decode -> real MediaPipe Holistic -> real SL-GCN inference -> label), run through the real
browser pipeline, legally permitted. This was actively attempted, not assumed impossible. What was found:

- **INCLUDE's and WLASL2000's own video/pose data are not reachable from this project's network environment.** Both
  are distributed by OpenHands' own documentation (`docs/_static/islr_datasets.csv` in the AI4Bharat/OpenHands
  repository) exclusively via Zenodo download links; INCLUDE's own project page
  (`sign-language.ai4bharat.org`) and WLASL's project page (`dxli94.github.io`) were also tried directly and
  refused by the network egress proxy. The only broadly reachable host for this kind of lookup is `github.com`
  itself (via `git clone` and `raw.githubusercontent.com`); Zenodo, Hugging Face, YouTube, Google Drive, and other
  arbitrary sites are not.
- **Neither dataset's own GitHub repository bundles sample video or pose files** (checked directly) — both ship code
  and documentation only, pointing elsewhere for the actual data.
- **A GitHub search did turn up real, per-word-labelled ASL video clips** (a repository with files named after
  individual English words, e.g. one video per gloss). It was deliberately **not used**: the repository ships no
  licence file, and its content and naming pattern are consistent with an unattributed scrape of a third-party ASL
  video dictionary site, not original or clearly-licensed material. Given the master specification's own explicit
  instruction to use only legally permitted reference videos and to document licensing restrictions, pulling from an
  unlicensed, likely-unauthorised scrape would be a worse violation than having no reference video at all, so this
  was rejected rather than used.
- **Several other GitHub ISL repositories were found**, but on inspection they are static-image alphabet/fingerspelling
  datasets, not isolated dynamic-word video clips comparable to INCLUDE's vocabulary, and none stated a clear
  permissive licence in the available search results — using any of them would have required a repository-by-repository
  licence audit with no guarantee of a usable result at the end, and was not pursued further given the time this
  would take versus the ISL-first priority the user set.

**Conclusion: no legally clear, reachable, correctly-labelled ISL or ASL reference video was obtained.** This is
reported as a genuine, unresolved gap, not quietly dropped. What this means for testing: the Category C harness
(below) was still built and proven on real code paths, but it is demonstrated with an honestly-labelled synthetic
clip (clearly marked as mechanics-only, not a real sign), not a real signer. If the user has, or can legally obtain,
a short labelled ISL or ASL clip (even one they film of themselves performing a listed vocabulary word, with the
camera), the harness in `test-sign-video.js` is built to accept exactly that, unmodified, and would then be a true
Category C result.

## What a user actually sees

The language picker lists ISL and ASL as **Available** (vs. BSL, which remains **Not installed** — there is no
pretrained BSL model and none is claimed). Selecting either shows an About panel naming the architecture
(SL-GCN/OpenHands), the dataset, and states explicitly that SANGAM has not independently measured its accuracy. When
a sign is recognised, the UI shows "**Model score: X%** — the model's own confidence, not independently verified by
SANGAM," which is deliberately different wording from the pre-existing DTW recogniser's "**Match: X%**," so a user
is never left thinking the two numbers mean the same thing. The personal, hand-taught DTW recogniser remains
available and unchanged for any sign a user wants to teach SANGAM beyond these fixed vocabularies, or for someone
signing a variety neither dataset covers.

## Sources

- AI4Bharat OpenHands repository (Apache-2.0): <https://github.com/AI4Bharat/OpenHands>
- OpenHands release assets (checkpoints_v1): <https://github.com/AI4Bharat/OpenHands/releases/tag/checkpoints_v1>
- OpenHands model/checkpoint documentation: <https://openhands.ai4bharat.org/en/latest/instructions/models.html>
- Selvaraj, Nagaraja, Khapra, OpenHands: Making Sign Language Recognition Accessible with Pose-based Pretrained
  Models across Languages, ACL 2022: <https://arxiv.org/abs/2110.05877>
- INCLUDE dataset record (CC BY 4.0): <https://zenodo.org/records/4010759>
- INCLUDE on Hugging Face (licence card): <https://huggingface.co/datasets/ai4bharat/INCLUDE>
- INCLUDE paper, Sridhar et al., ACM Multimedia 2020: <https://dl.acm.org/doi/10.1145/3394171.3413528>
- WLASL project page (licence terms): <https://dxli94.github.io/WLASL/>
- WLASL paper, Li, Rodriguez, Yu, Li, WACV 2020
