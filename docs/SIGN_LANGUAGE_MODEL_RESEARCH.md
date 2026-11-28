# Sign-language recognition: what was researched, and what was decided

> **Superseded, 25 November 2026.** The "bottom line" below — that no usable pretrained ISL model could be
> obtained — was the honest conclusion of this document's research, but it has since been overturned. A later phase
> found that AI4Bharat's own OpenHands project (reachable via GitHub, which was not tried here) publishes exactly
> such a model, pretrained on the INCLUDE dataset this document studied. This build now ships it, plus a
> pretrained ASL model. **Read `docs/SIGN_LANGUAGE_MODEL_EVALUATION.md` for what is actually installed.** This
> document is kept unedited below for its research trail, including one correction worth flagging now rather than
> burying: it states INCLUDE's licence as "CC BY-NC-SA 4.0 (non-commercial)," sourced from a *derived* dataset's
> licence page rather than INCLUDE's own Zenodo/Hugging Face record, which is actually **CC BY 4.0** (attribution
> required, commercial use permitted). The evaluation document above uses the corrected, primary-sourced licence.

**Bottom line (original, now superseded — see above).** This build ships **no pretrained Indian Sign Language (ISL) model**, and the app says so. The research below explains why, what was checked, and what has to happen before one can be added. Nothing is guessed, and ASL is never presented as ISL.

Searches and checks were done on 24 November 2026. Where a page could not be opened from the build environment, that is stated.

## What a "model" has to be, to be usable here

1. It recognises **Indian** Sign Language, not American or British. They are different languages.
2. Its licence allows this use (an open-source student/NGO prototype today, possibly a deployed service later).
3. It runs **locally in the browser** (no camera frames sent to a server).
4. It comes with a published **evaluation**, and ideally one we can reproduce.
5. We can actually obtain the weights or training data.

## Candidates

| Candidate | What it is | Verdict for this build |
|---|---|---|
| **INCLUDE** (AI4Bharat and IIT Madras) | A dataset of 263 isolated ISL word signs, 4,287 videos, 15 categories. The authors report 85.6% accuracy on all 263 words and 94.5% on the 50-word subset, with their own model. Training code is public, and it uses MediaPipe Hands and BlazePose keypoints. | **Dataset, not a ready model.** The videos are hosted on Zenodo, which the build network blocked, so nothing was downloaded and nothing was trained. Its licence, as stated by a derived dataset's page, is **CC BY-NC-SA 4.0 (non-commercial)**. That matters if SANGAM is ever deployed commercially. Needs a legal read before use. |
| Landmark tensors derived from INCLUDE (IEEE DataPort) | 4,276 pose and hand landmark sequences, 261 words, with a BiLSTM and a 1D CNN trained on them (the page reports about 94.5% and 91.7% top-1 on 642 held-out clips). | Not downloaded (needs an IEEE DataPort account, and it inherits the non-commercial licence). The accuracy is the page author's own claim, not ours. |
| **iSign** (IIT Kanpur) | A benchmark with more than 118k ISL and English video and sentence or phrase pairs. | Aimed at translation research and sentence tasks. Not a drop-in recogniser. Not downloaded. |
| **CISLR** | A corpus of 4,765 words, 7,050 videos. | Listed as "agreement needed" in a dataset survey, so access is not open. |
| **ISLRTC dictionary and Sign Learn app** (Government of India) | The official ISL dictionary (about 10,000 terms in the third edition) and app. | The right reference for *learning and checking signs*. It is a video dictionary, not a recognition model. SANGAM Learn points to it. |
| ASL recognisers (many) | Plentiful. | **Rejected on purpose.** ASL is a different language. Showing ASL output for an ISL user would be wrong. The language list in the app shows ASL as "No model installed". |
| **MediaPipe Hands / Hand Landmarker** (Google, Apache-2.0) | Finds 21 hand landmarks per hand. It does not know any sign. | **Used** as the hand tracker. The legacy "Hands" solution is vendored because it works fully offline. Google says the legacy solutions are no longer supported and have been upgraded to new Tasks APIs, with the old code kept as-is. See "Risks". |

## What was built instead

A hand tracker plus a **personal sign recogniser**. The user records a few examples of a sign on their own device and gives it a word. SANGAM then matches new signs to those examples (resampled landmark sequences, banded dynamic time warping, nearest examples, a confidence gate and a margin gate). It recognises only what the user taught it, and says so. It is honest, useful for a small personal vocabulary, and does not need anyone else's data.

It is **not** ISL recognition. It makes no claim about grammar, facial expression, body posture or sentences.

## What it takes to add a real ISL model

1. Read and resolve the dataset licence question (the CC BY-NC-SA terms above) before training or shipping anything.
2. Obtain the data (the Zenodo download needs an unrestricted network) and train, or obtain from the authors, a model that can run in the browser.
3. Evaluate it on people **not in the training set**, in conditions like real use (phone cameras, home lighting, different skin tones and hand sizes, left-handed signers). Publish the numbers with the model.
4. Have **Deaf ISL signers** review the vocabulary and check what the output says. Published lab accuracy is not usability.
5. Package it in the format in `vendor/sign-models/README.md`. The app validates the package and refuses an incomplete one, and the language picker then shows ISL as available, with the dataset, licence and evaluation fields read from the package.

## Risks, stated plainly

* Word-level recognition is not translation. A person who signs a sentence will not get a sentence back.
* Accuracy reported on a lab dataset (a few signers, one setup) usually drops on new people and places.
* Skin-tone, lighting and camera bias are known problems in hand and pose tracking. They have not been measured for this build.
* The vendored MediaPipe Hands is a legacy solution kept "as-is" by Google. Moving to the newer Hand Landmarker (`@mediapipe/tasks-vision`) is a sensible next step. Only the extractor layer would change.

## What was and was not tested in this build

* Tested: the matching logic on **synthetic** hand skeletons made by a script, and the full camera flow with the browser's built-in **fake camera** and a **mock hand source** (labelled "TEST HAND SOURCE" on screen).
* **Not tested:** a real person signing to a real camera. No accuracy figure for this build exists, and none is quoted.

## Sources

* INCLUDE dataset record (Zenodo): <https://zenodo.org/records/4010759>
* INCLUDE paper, ACM Multimedia 2020: <https://dl.acm.org/doi/10.1145/3394171.3413528>
* INCLUDE training code: <https://github.com/AI4Bharat/INCLUDE>
* INCLUDE metadata on Hugging Face: <https://huggingface.co/datasets/ai4bharat/INCLUDE>
* Landmark tensors derived from INCLUDE (licence and accuracy as stated there): <https://ieee-dataport.org/documents/silent-voice-mediapipe-holistic-landmark-tensors-261-indian-sign-language-words-derived>
* iSign benchmark: <https://arxiv.org/html/2407.05404>
* Dataset survey listing CISLR as "agreement needed": <https://arxiv.org/pdf/2606.19352>
* ISLRTC (official): <https://islrtc.nic.in/>
* ISL dictionary, third edition (news report): <https://theprint.in/india/with-801-words-on-farming-agriculture-govt-releases-3rd-edition-of-sign-language-dictionary/606804>
* MediaPipe Solutions guide (legacy solution status): <https://developers.google.com/edge/mediapipe/solutions/guide>
* MediaPipe Hand Landmarker: <https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker>
