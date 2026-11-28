# ISL word recognition: audit, real-video evaluation and handover

Scope: Indian Sign Language (ISL), isolated words, live webcam, local processing. This report separates what was **measured on real ISL videos**, what was **only tested on generated data**, and what is **still not done**. Numbers here come from `datasets/isl/reports/` and can be regenerated with the commands in section 9.

## 1. Summary

| Question | Answer |
|---|---|
| Is the model untrained or randomly initialised? | **No.** It is the official AI4Bharat OpenHands SL-GCN checkpoint trained on INCLUDE (263 ISL words). Its weights are unchanged and the JavaScript inference matches real PyTorch logits to 1.1e-5 (`test-sign-model.js`). |
| Is the label-to-word mapping wrong? | **No.** The 263 classes match the official INCLUDE metadata exactly, and real ISL videos of 6 classes were recognised as the right words (section 5). |
| Does it recognise real ISL signs? | **Yes, but imperfectly.** On real INCLUDE videos through the app's own pipeline it names the right word for roughly 3 of 4 signs (section 5). |
| Why "random words"? | Four separate causes, all measured or demonstrated: (1) the page froze for seconds while a word was computed (fixed); (2) the network has no "not a sign" answer and names a word for almost any hand movement (mitigated, not solved); (3) the live tracker is not the one the model was trained with, costing accuracy (partly diagnosed, section 6); (4) the model was trained on one school's studio recordings, so webcams and other signers are out of distribution (not fixable without data). |
| Was a model trained here? | **No.** See section 8 for why, and what would be needed. |

## 2. Existing implementation (Phase 1 audit)

SANGAM is a Node/Express backend with a static browser frontend. There was no Python code, no training script, no dataset and no label file in the project; everything runs in the browser.

| Layer | File | Role |
|---|---|---|
| Dialog and flow | `index.html` (`#signDlg`), `assets/sign.js` | Camera, consent, tracker choice, segmenting a sign, transcript, speak and send |
| Tracker | `vendor/mediapipe/holistic/*`, `vendor/mediapipe/hands/*` | MediaPipe Holistic (body + both hands) for word models; Hands for letters, numbers and taught signs. Legacy JS Solutions, vendored, local |
| Segmenter | `assets/sign-engine.js` (`Segmenter`, `Stabiliser`) | A sign starts when a hand appears and ends when hands have been out of view for 0.6 s (max 4.5 s). Duplicate suppression for 1.5 s |
| Model runtime | `assets/sign-model.js`, `assets/sign-worker.js` | JavaScript port of the OpenHands SL-GCN, preprocessing, confidence rules, multi-view agreement. Runs in a Web Worker |
| Model files | `vendor/sign-models/isl/include-slgcn/{model.json,weights.bin}` | Official checkpoint converted by `scripts/sign-models/install.js`; labels derived from the official metadata and stored once in `model.json` (single source of truth) |
| Tests | `test-sign-model.js`, `test-sign-engine.js`, `test-sign-video.js`, `test-sign-browser.js` | Parity with PyTorch, engine logic, a real-video plumbing test, UI |
| Also present (ASL, kept by request) | `vendor/sign-models/asl/*`, `assets/sign-letters.js` | ASL word models, ASL letters and numbers. Not part of the ISL path |

Files to retain: all of the above. Files that needed replacing: none; the faults were in behaviour, not in a placeholder model.

## 3. Hypotheses from the brief, one by one

| Hypothesis | Finding |
|---|---|
| Incorrect dataset labels | The official metadata has **33 video paths listed under two different labels** (the cause of the "Second (Number)" class being excluded by the model authors). Excluded from evaluation and recorded (`validation_*.json`). |
| Incorrect label-to-word mapping / class indexing | Class set equals the official metadata (263 = 263, set equality, spacing normalised). Order is Python string sort of the metadata labels (`1.Dog`, `10.Energy`, ...); the numeric prefix is stripped for display. Confirmed end to end by real videos (section 5). |
| Untrained / random / wrongly loaded weights | Not the case: weights are the official checkpoint; load errors surface as visible messages; parity test passes. |
| Training vs inference preprocessing mismatch | **Partly.** Keypoint selection and normalisation match OpenHands exactly (golden tests). The **pose extractor differed**: training used MediaPipe Holistic *heavy* pose, the app used *full*, on a webcam at about 10 fps. The app now uses heavy (section 6); the frame-rate difference remains. |
| Frame sampling / sequence length | The model is **extremely sensitive to time scale**: giving it raw ~10 fps frames drops accuracy from 77% to about 1%. The app resamples to 25 fps (the dataset rate), which is correct. Duplicating vs interpolating frames makes no difference. |
| Landmark ordering, coordinate normalisation, input/output dimensions | Verified by golden fixtures against OpenHands' own transforms and PyTorch. |
| Softmax / confidence misread | Softmax is applied correctly, but a softmax probability is **not** evidence that the input is a sign (section 4). |
| Missing temporal information | Not the case: the whole sign is classified at once. |
| Repeated predictions | Suppressed (1.5 s window, signer must lower hands between signs). |
| Webcam frame conversion | The video element feeds the tracker directly; mirroring is CSS only. Not a cause. |
| Model loading failures hidden by a fallback | No fallback *model* exists. The only fallback is running the same model on the page thread if a Web Worker is unavailable. |
| Incompatible model versions | Not applicable. |
| **Not in the brief: main-thread freeze** | One word took 3 to 13 s of JavaScript on the page thread, and a preview of it ran every 0.5 s *while signing*. Tracking stalled, lost frames were filled with the last pose, bending the motion the model read. **Fixed** (worker, no mid-sign runs, about 2x faster maths). |

## 4. Rejecting inputs that are not signs

The network has no "unknown" class. Measured:

- On 80 generated non-sign clips, 82% were named as a word at the original confidence bar.
- On **real** hands (time-reversed and block-scrambled copies of the real INCLUDE signs, a hard negative because the hands still look like signing): at the original bar 93% to 94% got a word; Balanced 32% to 53%; Careful 23% to 25% (about 10 fps). The synthetic clips earlier were much easier to reject than real sign-like motion. See section 5.

Mitigation shipped: the **Word recognition: how careful?** setting (Loose, Balanced default, Careful) requires the same word from two or three trimmed views of the same sign plus a higher confidence. It lowers false words substantially but also rejects real signs. This is a trade-off, not a solution. A real rejection model needs in-distribution and out-of-distribution training data (section 8).

## 5. Real-video evaluation

Data: INCLUDE (AI4Bharat, CC BY 4.0, Zenodo record 4010759), archive `Seasons_1of1.zip`, MD5 verified (`56e2f91d852574c8995320d6e4d8205c`). 85 videos, 6 classes (Summer, Spring, Winter, Fall, Season, Monsoon), all 1920x1080 at 25 fps. Split: **train** = Hugging Face rows with `include_50 == False` and split train or val (67 videos); **test** = the official held-out split (18 videos). Note the Hugging Face table contains both the INCLUDE and INCLUDE-50 splits; unfiltered, 424 videos appear in more than one split (train leakage). The rows with `include_50 == False` reproduce the paper's split exactly (3,475 train, 817 test).

Method: each video decoded with OpenCV, resized to 1280x720 (what the app asks the webcam for), tracked by **the app's own vendored MediaPipe Holistic** in a browser at about 10 fps (`live10`, like the live path) or at 25 fps (`full`), then cut and classified by the app's own Segmenter and model code. The model chooses among all 262 words, not only the 6.

**Top-1 accuracy** (the model's first choice among all 262 words, on the sign the app's segmenter cuts out):

| Pose model, tracker rate | Videos | Train videos (seen in training) | Test videos (held out, n = 18) | All 85 |
|---|---|---|---|---|
| full pose, about 10 fps (the app before this change) | 85 | 78.5% | 72.2% | 77.1% |
| full pose, 25 fps | 85 | 83.6% | 77.8% | 82.4% |
| **heavy pose, about 10 fps (the app now)** | 85 | 82.1% | 83.3% | **82.4%** |

Test-split per class with heavy pose: Season 3/3, Monsoon 3/3, Summer 3/3, Spring 3/3, Fall 2/3, Winter 1/3. Wrong answers on test videos were `Winter -> Bedroom / cold`, `Fall -> Pleased`: the model's errors are other words, never a random pick. Winter is the weakest class in every configuration.

**What would be typed at each strictness setting** (all 85 videos; "typed" = the word the user would see; non-sign = time-reversed or block-scrambled copies of the same real signs, so it measures how often a *non-sign* still gets a word):

| Tracker | Setting | Real signs typed correctly | Real signs typed wrongly | Real signs rejected | Non-sign typed as a word (reversed / scrambled) |
|---|---|---|---|---|---|
| ~10 fps | Loose (old behaviour) | 75.9% | 20.5% | 3.6% | 92.8% / 94.0% |
| ~10 fps | Balanced (default) | 50.6% | 12.0% | 37.3% | 53.0% / 32.5% |
| ~10 fps | Careful | 42.2% | 4.8% | 53.0% | 25.3% / 22.9% |
| 25 fps | Loose | 81.2% | 14.1% | 4.7% | 94.1% / 89.4% |
| 25 fps | Balanced | 55.3% | 4.7% | 40.0% | 48.2% / 29.4% |
| 25 fps | Careful | 48.2% | 4.7% | 47.1% | 27.1% / 16.5% |
| ~10 fps, **heavy pose** | Loose | 82.4% | 16.5% | 1.2% | 87.1% / 78.8% |
| ~10 fps, **heavy pose** | Balanced | 55.3% | 11.8% | 32.9% | 50.6% / 29.4% |
| ~10 fps, **heavy pose** | Careful | 48.2% | 5.9% | 45.9% | 23.5% / 18.8% |

(The first six rows used the full pose model; the last three are the app as it now ships.)

Two honest conclusions: the strictness settings really do cut wrong words (20.5% to 4.8% typed wrongly at about 10 fps) but only by rejecting a lot of real signs (53% at Careful), and a quarter of *sign-like non-signs* still get through at Careful. Ordinary waving or fidgeting was not available as real footage, and probably gets rejected more often than these sign-like negatives.

Reading this: train-split videos were seen in training, so their accuracy only checks plumbing and labels; test-split accuracy is the held-out figure but **n = 18 gives a very wide uncertainty (roughly plus or minus 20 points)**. This is one category from one school, not a vocabulary-wide or signer-independent result. **Unseen signers on a webcam have not been tested.**

## 6. Why accuracy is below the published figure

The authors report 93.5% on the full INCLUDE test split. On this subset even *training* videos only reach about 77% in the live configuration. So the tracking input differs enough from training-time input to cost about 20 points. Tested so far:

| Variable | Result |
|---|---|
| Duplicate vs interpolate frames to 25 fps | No difference (77.1% vs 77.1%) |
| No resampling at all | Collapses to about 1% to 20%: time scale matters enormously |
| Cut the sign with the app's segmenter vs whole clip | No meaningful difference |
| Track at 25 fps instead of about 10 fps | **+5 points** (77.1% to 82.4% overall; 78.5% to 83.6% on training videos). A real but partial share of the gap. A webcam tracker may not reach 25 fps on every laptop; in this browser, blank frames ran at roughly 30 fps and frames with a person are slower |
| Holistic *heavy* pose model (used for training) vs *full* | **+5.3 points at the same ~10 fps** (77.1% to 82.4% overall; held-out test 72.2% to 83.3%, n = 18). Matches what full pose only reached at 25 fps. **Adopted**: `assets/sign.js` now uses `modelComplexity: 2`, and the 26.4 MB model is vendored (official npm tarball, SHA-512 verified). Cost: 118 ms per frame vs 78 ms on the test laptop with a person in view (about 8.5 vs 13 fps maximum) |
| Heavy pose *and* 25 fps together | Not tested. It is the closest match to training, but the live webcam path cannot reach 25 fps with heavy pose on this laptop |
| JPEG / 1080p to 720p downscale | Not isolated |

After the heavy-pose change the remaining distance to the published 93.5% is about 10 points. The leftover candidates are the lower live frame rate, the webcam-versus-studio difference, a small sample (85 videos, 6 classes), and the published figure being on the full 817-video test split. They cannot be separated without more data.

## 7. What was changed in the app

See `CHANGELOG.md` ("Sixth pass") and `docs/SIGN_LANGUAGE_CAMERA.md`: Web Worker inference, no mid-sign model runs, faster maths, multi-view agreement and the strictness setting, readable word names, language switch stops recognition, hands-detected indicator, ASL 100-word option, ASL letters and numbers (kept as separate optional modes at your request; the ISL alphabet is two-handed and is not covered).

## 8. Training: what was and was not done

**Not done: no model was trained or fine-tuned here.** The model in use is the authors' released checkpoint, and this report claims nothing more. Reasons, so the decision can be revisited:

- The full INCLUDE set is 56.8 GB in 44 archives. You approved a one-archive test download (1.2 GB), not the full set.
- Retraining needs keypoints for all 4,292 videos from the *same* tracker that will run live. On this laptop the tracker took about 15 minutes for these 85 videos at 10 fps and about 25 minutes at 25 fps, which extrapolates to roughly 13 to 21 hours for all 4,292.
- Python 3.14 here has no MediaPipe legacy Holistic (the newest MediaPipe dropped it), so the official extraction scripts cannot run unmodified. The browser tracker used in this report is the same build as the app.
- A genuine open-set rejection model needs real non-sign recordings (talking, waving, resting, fidgeting) from webcams, which do not exist in INCLUDE.

Recommended next steps, in order: (1) *(done)* vendor the heavy pose model and re-run section 5, which closed about 5 of the 20 points; (2) record a small set of real webcam clips, signing and non-signing, from several people; (3) fine-tune on top of the official checkpoint with keypoints from the app's own tracker (and train a rejection threshold or class from the non-sign clips); (4) only then consider the larger INCLUDE download. FDMSE-ISL needs institutional approval and is restricted to non-commercial research; it was not requested.

## 9. Reproduce

```powershell
# data (one archive) - verify the MD5 against the Zenodo record before trusting it
curl.exe -L -C - -o D:\SANGAM_ISL_data\raw\Seasons_1of1.zip "https://zenodo.org/api/records/4010759/files/Seasons_1of1.zip/content"
D:\SANGAM_ISL_data\venv\Scripts\python.exe datasets\isl\tools\prepare_subset.py --category Seasons --archive D:\SANGAM_ISL_data\raw\Seasons_1of1.zip
# keypoints through the app's own tracker (open the page in a browser while this runs)
node datasets\isl\tools\dev-server.js
#   http://127.0.0.1:8130/datasets/isl/tools/holistic-batch.html?category=Seasons&complexity=1&fps=live10&mode=seasons_c1_live10
# evaluate (shard across cores, then summarise)
node datasets\isl\tools\eval_model.js seasons_c1_live10 --shard 0/6     # ... through 5/6
node datasets\isl\tools\eval_model.js seasons_c1_live10 --summarise
```

Metadata files (`datasets/isl/metadata/`) are from the Hugging Face dataset `ai4bharat/INCLUDE` (CC BY 4.0). Cite: Sridhar, Ganesan, Kumar, Khapra, "INCLUDE: A Large Scale Dataset for Indian Sign Language Recognition", ACM Multimedia 2020. The dataset card asks users not to infringe the privacy or dignity of the signers, and notes the videos were recorded in Chennai and do not represent every regional variety of ISL.
