# Sign Language Camera

Open it from the dashboard (**Sign language camera**) or the **Sign language** panel. It lets a person sign to the camera, review the words SANGAM matched, edit them, and then speak or send them. It offers four recognition paths: pretrained ISL/ASL **word** models, **letters** (ASL fingerspelling A–Z), **numbers** (ASL digits 0–9), and the **personal-vocabulary matcher**. None is a sign-language translator — see "Read this first" below.

## Words, letters and numbers: which option to pick

| Option | Recognises | How | Notes |
|---|---|---|---|
| Letters: ASL fingerspelling | A–Z, one hand | Hand-written rules on hand landmarks (`assets/sign-letters.js`) | Hold each letter still ~0.7 s. J and Z are drawn in the air. Lower your hand to type the same letter twice. **Add space** between words. ISL fingerspelling is two-handed and is **not** covered. |
| Numbers: ASL digits | 0–9, one hand | Same, separate rules (2=V, 6=W, 9=F and 0=O share handshapes with letters, so they are never mixed) | 6/7/8/9 = thumb touches pinky/ring/middle/index fingertip. Larger numbers are typed digit by digit. |
| ISL, pretrained words | 262 Indian Sign Language words | AI4Bharat OpenHands SL-GCN, in a Web Worker | Words only, one sign at a time. |
| ASL, 100 common words | The 100-word WLASL subset | Same ASL network, output limited to 100 words | More reliable than the 2,000-word option because it guesses among fewer words. |
| ASL, all 2,000 words | 2,000 ASL glosses | OpenHands SL-GCN | Authors' own accuracy is ~31% top-1: expect many wrong words. |
| My own signs | Whatever you teach it | DTW matching | Needs 2+ examples per sign. |

The pretrained word models were **never trained on the alphabet or numbers**, which is why they could not produce letters or digits before. Letters and numbers are rule-based, not a trained model, and have only been tested on generated hand skeletons.

**Pose model.** The word models track with MediaPipe's *heavy* pose model (the one they were trained with); it is 26 MB and about 1.5x slower per frame than the faster one, but was about 5 points more accurate on real ISL videos (`ISL_RECOGNITION_AUDIT.md`). The first load downloads it once from this site.

## Why words were wrong or random, and what was changed

Measured in this checkout (details and numbers in `CHANGELOG.md`):

1. **The camera froze while a word was being worked out.** One word took 3–13 s of JavaScript on the page's own thread, and a preview of it ran every half second *while the person was still signing*. Hand tracking stalled, frames were lost, and the gaps were filled with the last good pose, bending the motion the model read. Now: no model run mid-sign, the model runs in a Web Worker (`assets/sign-worker.js`), and the maths is about twice as fast. The page's longest freeze during recognition measured 64 ms.
2. **The model names a word for anything.** It has no "not a sign" answer. On generated hand movement that is not a sign (waving, raising a hand, fidgeting), the ISL model typed a word for **82%** of clips at its original confidence bar. A new **Word recognition: how careful?** setting reads each sign more than once and requires agreement:

   | Setting | Reads the sign | Confidence bar | Non-sign clips that still typed a word (48 generated clips) |
   |---|---|---|---|
   | Loose | once | 45% | ~82% (original behaviour) |
   | Balanced (default) | twice (whole + middle) | 80%, margin 40 pts | 6 of 48 (13%) |
   | Careful | three times | 90%, margin 50 pts | 2–3 of 48 (about 4–6%) |

   These figures are for *generated* non-sign movement. Later, real INCLUDE videos became available (`docs/ISL_RECOGNITION_AUDIT.md`): with real hands (time-reversed and scrambled real signs, a harder negative) Balanced let through 32% to 53% and Careful about 23% to 25%, and on real signs Balanced rejected about 37% to 40% and Careful about 47% to 53%. So the setting is a real trade-off, not a fix. Real signs were measured on one 6-word category only.
3. Changing the language while recognising used to keep the old tracking pipeline running into the new recogniser. It now stops recognition so the right pipeline starts next time.
4. Word names such as `Howareyou` and `StreetorRoad` are shown as readable text.

## Read this first: what it does and does not do

* **Your taught signs (personal vocabulary):** finds hands in the camera picture, then compares each sign's hand shape and movement with **signs you taught it on this device**. Works for any word or variety, including ones no dataset covers, but recognises only what you have personally recorded.
* **Pretrained ISL / ASL (isolated words):** a real pretrained model (AI4Bharat OpenHands SL-GCN, see `SIGN_LANGUAGE_MODEL_EVALUATION.md`) trained on **262 Indian Sign Language words** (bundled) or **2,000 American Sign Language words** (installed on request — see `MODEL_INSTALLATION_GUIDE.md`). It recognises **one sign at a time** from many different signers' styles, not just yours, but only the fixed vocabulary it was trained on, and it is **not sentence-level translation**: a user who signs a sentence gets, at best, a sequence of independently recognised words with no grammar between them. Its confidence is shown as "Model score," explicitly labelled as the model's own number, **not independently verified by SANGAM** — no real Deaf signer has tested this build, and the published 93.5%/30.6% accuracy figures are the original authors' own test-split results, not a SANGAM measurement.
* Both paths see hands/body pose only: no facial grammar, no non-manual markers. Neither can translate sentences.
* ASL is never shown or used in place of ISL, or vice versa — they are different languages with separate vocabularies.
* Neither path has been tested with a real person signing to a real camera. See "What was tested".

## The flow

1. **Consent.** The first time, a plain-language notice explains what happens (camera is used here, video stays on this device, only text you confirm is sent). Camera access is requested only after you press the button. It never starts by itself.
2. **Camera.** Video only, no audio. The preview is mirrored like a mirror and is never cropped (the stage takes the camera's real aspect ratio). Clear messages cover denied permission, no camera found, camera busy, and a camera that disconnects. Pressing **Stop**, closing the dialog, or leaving the page releases every camera track.
3. **Language.** The selector lists every adapter that is actually loaded: **Your taught signs (personal vocabulary)**, and — when installed — **Indian Sign Language (pretrained)** and **American Sign Language (pretrained)**. Anything not installed (e.g. BSL) is shown as unavailable, never silently substituted.
4. **Teach a sign** (first-time setup). Type a word, record at least **2** examples (more is better), and the sign is saved on this device. You can delete any taught sign, or all of them.
5. **Sign.** Start, Pause, Resume, Stop. Each recognised word shows as a **partial** (not final) line with a closeness figure. Only accepted matches are added to the transcript. If nothing was clear: "Sign not recognised clearly. Please repeat." If the sign was close to more than one taught sign, nothing is added and you are told it was ambiguous.
6. **Transcript.** An ordinary text box. Edit it freely. **Undo last word**, **Clear** (asks first), **Copy**.
7. **Speak / Stop.** Reads the transcript aloud, only when you press it. Partial results are never spoken.
8. **Send.** Sends the transcript through the **existing chat**, after you confirm. The message is marked as coming from the sign camera, so the other person sees an honest label. Nothing is sent automatically, and the transcript clears after a successful send.

## What "confidence" means here

The figure is **closeness to your own example**: `1 − distance ÷ allowed distance`, from dynamic time warping between your recorded example and the new sign. It is **not a probability** and not an accuracy. The on-screen text says so. A match must clear a minimum closeness (0.15) and must not be too close to the second-best sign (best distance over second-best above 0.85 counts as ambiguous), and a repeat of the same sign within a 1.5 s window is suppressed so a held sign does not type itself repeatedly.

## Privacy

* Camera frames are processed **in this browser**. They are not uploaded, not recorded, not stored, and the page's security policy would block sending them to other sites.
* Hand-tracking model files are served from this site (`vendor/mediapipe/hands/`), not a CDN.
* **Taught signs are stored on your device only** (browser local storage, key `sangam.sign.personal.v1`) as small lists of numbers (hand landmark coordinates, rounded), never video. They exist so the matcher has something to match. **Forget all** in the dialog deletes them, and **Profile → Your data** exports or deletes everything SANGAM keeps on this device.
* Only text you confirm leaves the device, through the normal chat.

## Architecture

| Layer | File | Replaceable by |
|---|---|---|
| Extractor: camera frame → hand landmarks | `assets/sign.js` (MediaPipe Hands, vendored) | A newer MediaPipe Hand Landmarker, or any function that returns 21 landmarks per hand (`SangamSign.extractorFactory`) |
| Segmenter, resampler, DTW, Stabiliser | `assets/sign-engine.js` (no DOM, no network, unit-tested in Node) | Tuning, not replacement |
| Adapter: segment → word | `PersonalAdapter` (taught signs), `TemplateAdapter` (a validated model package) | Drop a package into `vendor/sign-models/isl/` (`vendor/sign-models/README.md`) |
| Pretrained word models | `assets/sign-model.js` (SL-GCN maths, multi-view agreement), run by `assets/sign-worker.js` in a Web Worker (falls back to the page thread if workers are unavailable) | Another OpenHands checkpoint via `scripts/sign-models/install.js` |
| Letters and numbers | `assets/sign-letters.js`: measurements → rules → hold-still stream (no DOM, unit-tested in Node) | Tuning the rules, or a trained fingerspelling model behind the same `LetterStream` interface |
| Transcript, speak, send | `assets/sign.js`, existing chat | |

Adapter contract: `isAvailable()`, `getSupportedLanguage()`, `getSupportedVocabulary()`, `classify(frames)` returning `{state: "match" | "ambiguous" | "unknown", label, closeness}`.

## What was tested

Honest split (details in `TEST_REPORT.md`):

| Kind | What | Result |
|---|---|---|
| Automated, logic | `test-sign-engine.js`: normalisation, segmentation, resampling, DTW, adapters, stabiliser, package validation, on **synthetic hand skeletons** | 33 passed |
| Browser, fake camera | `test-sign-browser.js`: Chromium's built-in **fake camera**, a **mock hand source** (banner "TEST HAND SOURCE"), consent, permission errors, start/pause/resume/stop, track release, no network upload (request audit), transcript editing, speak, send between two participants with correct provenance, no auto-send, 320 px layout | 121 passed |
| Automated, logic | `test-sign-letters.js`: 24 letters + 10 digits on generated skeletons (noise, left hand, 4:3 and 16:9, tilt, near/far), hold-to-type stream, J/Z motion, false-trigger cases | 39 passed |
| Automated, model | `test-sign-model.js`: JS forward pass vs real PyTorch logits (max difference 1.1e-5 after the speed-up), multi-view agreement rules | 51 passed |
| Real browser, mock hands | Letters, digits, Add space/Undo, language switch, worker inference, strictness setting driven through the real dialog | Checked by hand in Chromium; not in the Playwright suite (Playwright is not installed in this checkout) |
| **Real camera, real person** | Not done | **Not verified** |
| **Real ISL recognition** | No model exists in this build | **Not available** |
| User validation with Deaf signers | Not done | **Not done** |

Because the thresholds were tuned only against synthetic skeletons, **expect different behaviour with real hands.** Please test with real signers before relying on it, and report what you see.

## Browser notes

Needs `getUserMedia` and WebAssembly. Tested in Chromium only. Camera access needs `https` or `localhost`. On phones, the front camera is used by default and **Switch camera** is offered when more than one exists. The hand-tracking files total about 24 MB and the first start on a slow connection can take a while; the dialog shows loading state.
