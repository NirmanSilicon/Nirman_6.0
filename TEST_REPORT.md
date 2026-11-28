# SANGAM test report

Written from the runs made while building this version. Nothing here is copied from the earlier report (kept in `docs/previous/TEST_REPORT.md`).

## Environment

| Item | Value |
|---|---|
| OS | Ubuntu 24.04.5 LTS (Linux 6.18), headless cloud container |
| Node.js / npm | v22.23.4 / 10.9.9 |
| Browser | Chromium 153.0.8010.12 driven by Playwright 1.63.0 (headless) |
| Libraries | express 4.22.3, ws 8.23.0, axe-core 4.14.1 |
| Install | `npm ci` from the shipped `package-lock.json` (repeated on a fresh extract of the final ZIP, see "Clean-extract run") |
| Syntax | `node --check` on every `assets/*.js`, `server/*.js`, `test-*.js` and `run-all-tests.js`: no errors |

## Result

As shipped — a clean extraction of `SANGAM_FINAL_COMPLETE_UPGRADED.zip`, which bundles the ISL model but not ASL
(see "Licensing" in `docs/SIGN_LANGUAGE_MODEL_EVALUATION.md`) — `npm run test:all` starts the servers it needs and
runs every suite: **838 checks passed, 0 failed** (one new suite's one check is an expected, documented exception —
see its row below; 0 failed holds when that check happens to land as a pass on a given run, which is most runs).
With the ASL model additionally installed (as this project's own development checkout has it, for the real-weight
parity verification described below), the same run passes **849**. Please do not read either number as one pass
rate. The checks prove very different things, so they are grouped by what they actually exercised.

### A. Automated logic (no browser, no device)

| Suite | File | Passed | Failed | What it covers |
|---|---|---|---|---|
| Backend smoke | `server/smoke-test.js` | 43 | 0 | Sessions, tokens, impersonation, host key, rate limit, turns, volunteers (original, unchanged) |
| Backend features | `server/test-features.js` | 63 | 0 | Delivery acks, **presented receipts (new)**, provenance, emergency acks, signalling relay, capabilities, translation adapter against a local stand-in, security headers, origin check |
| Backend reliability | `server/test-reliability.js` | 6 | 0 | **New this phase.** Drives `server.js` as a real child process (needed because trust-proxy mode is read once at module load, and the shutdown checks must actually kill the process). Proves the fixed `trust proxy` rate-limit bypass is closed by default and correctly re-enabled with `TRUST_PROXY=1`; proves the rate-limit key-count cap holds; proves a real `SIGTERM` produces a clean, informative WebSocket close (code 1012) and the process exits; proves the same clean-shutdown path runs on a simulated uncaught exception. See `CHANGELOG.md`'s "Fifth integration pass" and `PROJECT_AUDIT_AND_PROBLEM_REGISTER.md`'s "Backend audit" section. |
| Sign engine | `test-sign-engine.js` | 33 | 0 | Hand normalisation, segmentation, resampling, DTW matching, stabiliser, model-package validation, on **synthetic hand skeletons** |
| Sign model | `test-sign-model.js` | 26 (37 with ASL installed) | 0 | Preprocessing math, `decide()` thresholds, installer helper functions, and — **Category D, real model inference, no camera** — SANGAM's pure-JS SL-GCN forward pass checked against golden PyTorch logits computed on the real installed ISL (and, when installed, ASL) weights (max diff 7.63e-6 ISL / 4.58e-5 ASL, identical top-1 picks). **New this phase:** `classify()` actually applies camera-aspect correction when `opts.cameraAspect` is set, proven by a changed prediction on identical input (regression test for a bug fixed this phase — see `CHANGELOG.md`); and `classify()` refuses a too-short sequence (below `MIN_CLASSIFY_FRAMES`) even with real, non-zero, high-confidence-eligible landmarks (also a bug found and fixed this phase). The 11 ASL-specific checks report as 2 clearly labelled SKIPs (never a false pass) on a clean extract, where ASL is not installed by default — see `docs/MODEL_INSTALLATION_GUIDE.md`. |
| Sound engine | `test-sound-engine.js` | 63 | 0 | Class-map checks, resampler, windower, onset/cooldown/hysteresis detector, **and the loud-sound fallback's gating, thresholds and cooldown (new)**, on **synthetic scores and tones** |
| Original end-to-end | `test-e2e.js` | 18 | 0 | Original two-client flows (unchanged; needs servers) |
| Original integration | `test-integration-fixes.js` | 9 | 0 | Speech robustness, recognition locale fallback, OCR (unchanged) |

### B. Real browser (Chromium via Playwright), with stand-ins for hardware

| Suite | File | Passed | Failed | What it covers |
|---|---|---|---|---|
| Browser | `test-browser.js` | 164 | 0 | Two participants, every first-pass feature |
| Access options | `test-access-browser.js` | 87 | 0 | Braille routing to a **TEST-ONLY adapter**, limited-delivery receipts, haptic settings (fake vibration API) **including the Day 2/P3 preset switch (new)**, deafblind options, confirm-before-send, announcement levels, data export/delete, switch scanning options |
| Sign camera | `test-sign-browser.js` | 138 | 0 | **Fake camera**, consent, errors, lifecycle, **real MediaPipe tracker loads** (on a picture with no hands), **mock hand source** (banner "TEST HAND SOURCE") for the teach/recognise/send flow, two participants, request audit, **and the real ISL pretrained model appearing as Available with correct About-panel disclaimers** (ASL is checked the same way whenever it is installed, and checked honestly as "Not installed" otherwise). **New this phase:** the real (if synthetic) camera's measured aspect ratio is actually wired into the pretrained adapters' `opts.cameraAspect` (regression test for the aspect-ratio bug fixed this phase), and the real pretrained ISL path fetches `pose_landmark_full.tflite` — never the old `lite`, never an unvendored `heavy` — and real MediaPipe Holistic tracking actually starts successfully with it. |
| Sound alerts | `test-sound-browser.js` | 106 | 0 | **Real YAMNet running in Chromium** on **synthetic audio** and a **fake microphone**; zero external requests; mic lifecycle and errors; **and the P4-derived loud-sound fallback toggle, alerting, double-alert prevention and persistence (new)** |
| Accessibility | `test-a11y.js` | 75 | 0 | axe-core on 21 views, keyboard, 44 px targets, nine viewport sizes, 200% zoom, reduced motion. **Fixed this phase:** `.btn-sm`/`.chip-btn`/`.tab-link`/`.tabs a` sat exactly on the 44px WCAG boundary (same root cause as the `.hp-on` fix in the previous pass), measuring intermittently sub-44px under full-suite CPU contention; raised to 46px. |
| Sign camera: real video file (Category C mechanics) | `test-sign-video.js` | 7 (6 typical; see note) | 0 (typical) | **New this phase.** Not a fake camera, not mock hands, not a golden-fixture tensor: an actual video FILE, decoded by the real browser, run through the real MediaPipe Holistic WASM (the same vendored `pose_landmark_full.tflite` fixed this phase) and the real, installed `PretrainedAdapter(ISL).classify()` — unmodified production code end to end. See its own file header for the full explanation. **This is mechanics verification, not accuracy verification**: the clip is an ffmpeg test pattern, not a human being, because no legally clear, reachable, labelled ISL/ASL reference video could be obtained in this project's network environment (see `docs/SIGN_LANGUAGE_MODEL_EVALUATION.md`). **One check in this suite is an intentional, informative exception to "0 failed":** on roughly 1 in 2-3 runs, this harness catches the real model confidently (softmax ≈ 1.0) reporting a specific word from pure non-human noise — not test flakiness, but a genuine, repeatable structural finding (a closed-set classifier has no "none of these" output) documented at length in `docs/SIGN_LANGUAGE_MODEL_EVALUATION.md`'s "single most important structural finding" section. It is reported honestly rather than hidden by tuning thresholds. |
| **Total (as shipped, ISL only)** | | **838** | **0*** | |
| **Total (ISL + ASL both installed)** | | **849** | **0*** | |

\* Except for the one intentionally-informative, intermittent check in `test-sign-video.js` described above, which is not a bug in the test suite.

### C. Real-ness of what was exercised

| Layer | Status |
|---|---|
| Real camera and a real person signing | **Not done.** Only Chromium's fake camera and a scripted mock hand source. |
| Real sign recognition accuracy (personal DTW recogniser) | **Unknown.** No real-hand data was available. Thresholds were tuned on synthetic skeletons. No accuracy figure is claimed anywhere. |
| Real pretrained ISL/ASL model | **Installed and bit-for-bit verified against real PyTorch inference on the real released weights** (see `docs/SIGN_LANGUAGE_MODEL_EVALUATION.md`). **Not** verified on a real signer — the published 93.5%/30.6% figures are the original authors' own test-split numbers, not measured by SANGAM, and are explicitly marked as such in both model manifests. |
| Real sound model | **Yes, the real YAMNet ran** in Chromium (same scores in two runtimes). Fed **synthetic tones only**. |
| Loud-sound fallback (P4-derived) | Logic and gating verified with real detector code in both unit and browser tests; the RMS computation is real, the "loud" audio fed to it in tests is synthetic noise, same as the classifier's own tests. |
| Real alarm, doorbell, siren, horn recordings | **Not tested** (none available offline). Real-world detection and false alarm rates are unknown. |
| Real microphone | **Not tested.** Chromium fake audio device only. |
| Physical Braille display, vibration motor, switch hardware, two-device voice call | **Not tested.** |
| Real translation provider | **Not tested.** |
| Screen readers | **Not tested.** |
| Users (deafblind, Deaf, blind, switch users) | **Not involved.** No user validation exists. |

The three original test files (`smoke-test.js`, `test-e2e.js`, `test-integration-fixes.js`) are byte-identical to the foundation ZIP. One expectation in `test-browser.js` was **changed on purpose, not weakened**: the haptic list now expects ten meanings (the specification added Call incoming and Alert) instead of eight. Every PASS line of every suite is listed in the *Test index* of `REQUIREMENTS_REGISTER.md`.

## How the tests stand in for things that were not available

This matters for what the results prove.

- **Speech recognition.** Chromium headless has no recognition service. The browser tests replace `SpeechRecognition` with a small fake that emits a chosen transcript. This proves the review-before-send flow, no auto-send, no auto-start and error messages. It does **not** prove that real speech is recognised.
- **Speech synthesis.** Replaced with a fake that records what was asked to be spoken (text, rate, voice, language). Proves the controls and that nothing overlaps or auto-plays. It does not prove how any real voice sounds, or that a given language has a voice.
- **Vibration.** `navigator.vibrate` is replaced with a recorder. Proves the patterns and Stop. No vibration motor was involved.
- **Microphone for live voice.** Chromium's built-in fake audio device. Two browser contexts on the same machine reached a connected audio session and the remote track attached. That is **not** a two-device call.
- **Translation provider.** `server/test-features.js` and `test-browser.js` start a small local HTTP server that behaves like LibreTranslate and rejects/times out on request. It is a test fixture only; SANGAM does not ship it. No real provider was called.
- **OCR.** Real: the bundled Tesseract ran in Chromium on an image the test drew itself (text "TEST LABEL"). It was not a photograph from a camera.
- **Switch scanning.** Driven with the keyboard.
- **Camera (sign).** Chromium's `--use-fake-device-for-media-stream` camera, a moving test pattern with no hands in it. The real MediaPipe hand tracker runs on it and correctly finds nothing. For the teach/recognise/send flow, a **mock hand source** is injected through `SangamSign.extractorFactory` and the dialog shows a "TEST HAND SOURCE" banner. This proves the pipeline wiring and the UI, not recognition of real hands.
- **Synthetic hands.** `test-support/synthetic-hands.js` generates hand skeletons with chosen shapes and paths. The recognition thresholds were tuned against these. Real-hand behaviour is unknown.
- **Sound.** The real YAMNet model runs in Chromium. Audio is **synthetic** (tones, noise, a pulsed 3.1 kHz beep at several sample rates) fed through the test hook `SangamSound._test.feedAudio`, or Chromium's fake microphone for lifecycle checks. This proves the pipeline, the model self-check and the alert behaviour, not the detection of a real doorbell or siren.
- **Braille display.** A TEST-ONLY JavaScript object that records the cells it is sent. It is not hardware and is never bundled.

## Failures found along the way, and what was done

Each of these was investigated rather than the test being dropped.

| # | Symptom | Cause | Resolution |
|---|---|---|---|
| 1 | End-to-end and integration suites: `ERR_CONNECTION_REFUSED` at baseline | The original harness expects servers pre-started on ports 8097/8099 | Not a code bug. `run-all-tests.js` now starts them. The tests were not edited. |
| 2 | Voice, phrase, OCR and text sends failed in browser tests | The foundation destroyed the chat session when the Connect panel was left | Fixed in `assets/connect.js`: sessions stay alive; a chat pill and `#/chat` return to them |
| 3 | Live voice button always disabled | Presence was never announced to the other side | Added an announce step on presence update |
| 4 | Integration test timed out waiting for the photo input | I had hidden the camera mode by default | Default profile now includes camera (the test was not changed) |
| 5 | High-contrast mode had no visible effect in the dark theme | Rules targeted a light theme | Added real `html.hc` rules; a test now measures at least 7:1 on sampled surfaces |
| 6 | 500–700 px horizontal overflow on the Connect panel | `.vis-hidden` was positioned off-screen | Replaced with a standard clipped screen-reader-only style |
| 7 | OCR progress bar never moved | Duplicate element id `bar` | Renamed to `ocrBar` |
| 8 | Uncaught Tesseract error on a damaged image | No decode check | Image is decoded first; a clear message is shown and no text is invented |
| 9 | Outline buttons dark-on-dark in the dashboard (Phrase board *Undo/Clear/Edit in messages*, *Stop speaking*, *Repeat last*) | Button colour used the page ink variable, which is dark in the dark theme | Light text and border for outline buttons |
| 10 | Status pills in *What comes next* low contrast (25 nodes) | Light-theme colours | Light colours on the dark table |
| 11 | Filled buttons turned navy under dark text (2:1) on hover | An older light-theme hover rule | Hover keeps the light gradient |
| 12 | Phrase-tile accessible name did not start with its visible label | aria-label wording | Label now starts with the visible text |
| 13 | Touch targets under 44 px (logo, voice jack, ranges, segmented controls) | Sizing | Enlarged |
| 14 | Browser check "a valid photo shows a preview and enables reading" failed in 2 of 6 repeated runs from the clean extract (and once in the full suite) | The test sampled the preview `<img>` instantly. An image the browser has not yet decoded has no size, so Playwright counts it as hidden. The app itself sets the preview and enables the button synchronously. | The test now waits up to 5 s for the preview to become visible, then checks the button. Same assertion, no race. After the change the browser suite passed 6 of 6 consecutive runs. |

Test expectations that were corrected because the *test* was wrong, not the product: a custom-phrase tile check now reads the aria-label (the visible label truncates); the emergency status check accepts both legitimate waiting wordings; an async photo-replace wait; fresh browser contexts for skip-link and dialog-focus checks; the no-speech-support stand-in must remove `speechSynthesis`, not just disable it.

One check ("the join screen is a labelled modal dialog and puts focus in the name field") failed once, in one of three consecutive accessibility runs made while the contrast fixes were still in progress, and has passed in every run since (6 accessibility runs after the last change: 2 on their own, 4 as part of the full suite, one of those from a clean extract). I did not find a root cause. Treat it as possibly timing-sensitive.

Gaps found while writing the register, and tests added for them: WebSocket origin check (refused for a foreign origin, accepted for the site's own), no-store on session creation and lookup, and the volunteer wording (`test-features.js` and `test-browser.js`).

## Failures found in the second integration pass, and what was done

| # | Symptom | Cause | Resolution |
|---|---|---|---|
| 15 | The vendored audio runtime failed to import | Dynamic `import()` resolves relative to the script, not the page | Import via `new URL(path, document.baseURI).href` |
| 16 | Sound alert and bar landed inside the hidden sign dialog | A bad insertion point in `index.html` | Moved them before the dialog |
| 17 | axe `list` violation on alert items | `li role=alert` outside a list | Use `div` items inside a list container |
| 18 | axe contrast failure on Dismiss, and the flash overlay confused axe | Colour rules and overlay stacking | Contrast fix; banner stacked above the flash; flash is a steady tint under reduced motion |
| 19 | Test-clock leak: the microphone health check misfired in tests | `run.lastAt` (used by the 2 s health check) took the audio clock, which tests can set | It now uses the real clock `Date.now()`; tests also reset detector state between signals |
| 20 | Sign tests: Tab check, duplicate suppression, pagehide | Focus can leave to browser chrome; a slow synthetic sign never repeated within the window; pagehide leaves the dialog open | Tests adjusted to match real browser behaviour (the product was not weakened) |
| 21 | Haptic rows overflowed at 320 and 360 px | Four grid children and a wide `<code>` | CSS grid fixed |
| 22 | A presented receipt initially leaked "Braille preview" to the sender | Channel names were forwarded | The server forwards no channel names; the notice says only "shown on screen"; a test checks it |
| 23 | Access tests: scanning needed "symbols" in the input modes; arrow keys ignored inside the scan bar; export needs a saved profile | Real behaviour of the app | Tests set up the real preconditions |
| 24 | Some early sound/sign checks were vacuous (`true`) | Written too loosely | Replaced with real assertions; an overstated alias-suppression test was renamed to say what is measured (the box-filter resampler gives only modest suppression, about 12 dB) |

## Failures found in the third integration pass, and what was done

Full narrative in `PROJECT_AUDIT_AND_PROBLEM_REGISTER.md` ("Problems introduced during this phase's own merge work");
summarised here in the same table format as the two passes above.

| # | Symptom | Cause | Resolution |
|---|---|---|---|
| 25 | Haptic preset switch caused a duplicate `change`/`click` listener to accumulate on `#profileExtra` | `buildCards()` became re-invokable (to re-render rows on preset switch) but still unconditionally called `addEventListener` on a persistent node | Guarded with a `dataset.wired` flag so listeners attach exactly once |
| 26 | A regression test for #25 itself miscounted event fires (expected 1, saw 2) | The counting listener was not filtered to the haptic checkboxes, so an unrelated `<select>`'s own `change` event (from the same test) was double-counted | Root-caused with an isolated debug script before touching the product; fixed the test to filter to `input[data-hpon]` |
| 27 | A `test-sign-model.js` unit test for shoulder-centring math used the wrong index space | Confused the 27-point *selected* index (`SHOULDERS=[3,4]`) with the 75-point *raw* MediaPipe Holistic index (shoulders are raw indices 11/12) | Corrected the test to use indices 11/12, with an explanatory comment |
| 28 | Four `test-sign-browser.js` assertions hardcoded "ISL not installed" | Pre-existing assertions became stale the moment real ISL/ASL models were installed this phase | Rewritten to expect ISL/ASL Available, BSL Not installed; added `page.waitForFunction` waits for the now-async model load |
| 29 | Follow-up fix to #28 asserted a vocabulary pattern "Hello\|Thank you" that does not exist | INCLUDE's real label is `"Thankyou"`, one word, no space — a genuine dataset quirk | Documented rather than "corrected" (changing the label would invent data); test checks labels that actually exist |
| 30 | `#sndLoudType` toggle existed in `index.html` with no rendering or event handling | Left as an explicit, tracked open gap mid-implementation, not discovered later | `draw()` and a shared `onCatToggle` handler wired before any test for the feature was written |
| 31 | First browser-test assertion for "loud fallback never double-alerts" failed | Not a product bug: the real YAMNet model legitimately classifies the test beep as **both** "alarm" and "fire" (two genuine, independently-crossing-threshold classes), unrelated to the loud-sound merge | Verified by reading the real two-category output before changing anything; assertion corrected to its real intent (never *also* reported as "loud"), not weakened |
| 32 | `test-a11y.js`'s "touch targets ≥ 44 px" check failed intermittently on `.hp-on` (the haptic on/off label), reporting exactly 44 px rounded, in 2 of 4 clean-extract full-suite runs, but never once in 3 isolated runs of `test-a11y.js` alone | `.hp-on{min-height:44px}` sits exactly at the WCAG minimum with no padding headroom, so under CPU contention from the full 12-suite run (more concurrent Chromium instances, font-loading timing), its rendered box occasionally measures a fraction of a pixel under 44 before rounding | Root cause fixed directly in `assets/styles.css`: `min-height` raised from 44px to 46px, giving real headroom instead of sitting exactly on the boundary. Re-verified clean (see the run table immediately below this one). |

## Failures found in the fourth integration pass (sign-recognition pipeline investigation), and what was done

Full narrative in `docs/SIGN_LANGUAGE_MODEL_EVALUATION.md` ("Pipeline bug fixes made in this phase" and "single most important structural finding"); summarised here in the same table format as the passes above.

| # | Symptom | Cause | Resolution |
|---|---|---|---|
| 33 | Camera aspect-ratio correction (`correctAspect()`) never ran for any camera, in either pretrained model | `assets/sign.js` constructed every `PretrainedAdapter` with a permanently empty `opts = {}` and never populated `opts.cameraAspect` afterwards | Reads the real camera's `video.videoWidth`/`videoHeight` once the stream starts (and on the video's own `resize` event) and writes the ratio into both adapters' `opts`; proven with a unit test that the same frames classify differently with/without it set, and a real-browser test that forces a 4:3 camera and checks the real measured ratio reaches `opts.cameraAspect` |
| 34 | The pretrained-model pose extractor used MediaPipe Holistic's **lite** complexity (modelComplexity:0), while OpenHands' own published evaluation of these exact checkpoints used **heavy** (modelComplexity:2) | Only the `lite` `.tflite` was vendored; `modelComplexity` was hardcoded to 0 | Vendored `pose_landmark_full.tflite` (checksummed against the exact same npm package version as the existing `lite` file) and switched to `modelComplexity:1` ("full") — MediaPipe's own library default and a real accuracy step up from lite. `heavy` was deliberately not vendored/enabled: it is substantially slower per frame and this environment has no real device to measure whether that latency is acceptable for a real-time webcam feature. Verified with a real-browser test that the real file fetched is `pose_landmark_full.tflite`, never `lite`, never an unvendored `heavy` |
| 35 | Assumed temporal-resampling "parity" with OpenHands had never actually been checked against OpenHands' own released code | Audited directly: a fresh clone of `AI4Bharat/OpenHands`'s exact `decoupled_gcn.yaml` configs for INCLUDE and WLASL show `PoseTemporalSubsample` **commented out** in every train/valid/test pipeline — the authors apply no temporal resampling or subsampling at all for this model | Not "fixed" (there is no OpenHands algorithm to match); documented at length in `docs/SIGN_LANGUAGE_MODEL_EVALUATION.md` that SANGAM's `resampleToFps()` is its own invention (to cope with a live, variable-rate camera, which OpenHands' fixed-rate pre-recorded video files never needed), and that the specific `targetFps:25` value is an unverified assumption about INCLUDE/WLASL's native recording rate (their Zenodo records, Hugging Face cards and the ACM paper were all unreachable from this environment to confirm it) |
| 36 | No legally clear, reachable, labelled real ISL/ASL reference video could be found to build a genuine Category C (recorded-video) accuracy test | INCLUDE/WLASL's actual video/pose data is hosted only on Zenodo (blocked from this environment); a GitHub search did turn up real per-word ASL clips, but with no licence file and scrape-like provenance, so it was rejected rather than used | Documented the search and its outcome honestly in `docs/SIGN_LANGUAGE_MODEL_EVALUATION.md` rather than silently using an unlicensed source or quietly dropping the requirement; built the Category C **mechanics** harness (`test-sign-video.js`) instead, ready to accept a real labelled clip unmodified if one becomes available |
| 37 | `test-sign-video.js`'s new harness found `PretrainedAdapter.classify()` could return a high-confidence "match" from a 2-frame degenerate sequence fed real (if spurious) non-zero landmarks from non-human test-pattern video | No minimum sequence-length floor existed at the `classify()` API boundary itself (only an upstream caller convention in `providePartial`, and `E.Segmenter`'s own `minFrames` in the normal camera-dialog flow, which this direct-API-level test deliberately bypassed) | Added `MIN_CLASSIFY_FRAMES` (8, matching `Segmenter`'s own default) as a hard floor inside `classify()` itself, so no caller can hit this regardless of whether it goes through the segmenter; unit-tested with real non-zero landmarks below the floor |
| 38 | Even after #37's fix, `test-sign-video.js` still intermittently (~1 in 2-3 runs) gets a confident "match" (softmax ≈ 0.85-1.0, an unstable label — observed "weak" and "Computer" on different runs) from the real model on non-human noise, once enough spurious frames clear the new floor | Structural, not a bug: the SL-GCN is a closed-set classifier with no trained "none of the above" output, so it must map any input that reaches it onto its single closest known class, however poor the true match | **Not "fixed"** — there is no threshold that defends against a saturated p≈1.0 result, and tightening `decide()`'s thresholds in response would suppress unrelated, possibly-correct predictions while doing nothing for this failure mode, which is exactly the "hide bad predictions via threshold manipulation" the master specification prohibits. Documented prominently as the single most plausible structural explanation for predictions not matching the sign actually performed, and left as an open, named limitation for any future work that could afford to retrain with an explicit rejection class |

## Failures found in the fifth integration pass (backend audit), and what was done

Full narrative with severities: `PROJECT_AUDIT_AND_PROBLEM_REGISTER.md`'s "Backend audit" section; chronological summary: `CHANGELOG.md`'s "Fifth integration pass".

| # | Symptom | Cause | Resolution |
|---|---|---|---|
| 39 | Any direct, unauthenticated caller could fully defeat every IP-based rate limit in `server/server.js` (session creation, volunteer/request creation, the `/api/translate` proxy) | `app.set("trust proxy", true)` was hardcoded, so Express trusted a client-supplied `X-Forwarded-For` header completely; a caller could send a different self-chosen value on every request and get a fresh rate-limit bucket each time | `trust proxy` now defaults to `false` (rate limiting falls back to the real socket address) and is only enabled via a new `TRUST_PROXY` env var, for the real reverse-proxy/tunnel case. Proven both ways (bypass closed by default, correctly restored with `TRUST_PROXY=1`) in the new `server/test-reliability.js`, by actually sending 21 requests with 21 different spoofed `X-Forwarded-For` values against a real running server in each mode |
| 40 | The rate-limiter's `ipHits` map had no upper bound on distinct tracked keys between 30-second cleanup sweeps | Only each key's own hit-timestamp array self-trimmed; the key set itself was never capped | Added `IP_HITS_MAX_KEYS` (env-overridable, default 20000) as a hard cap enforced at insert time, and exposed the live count at `/api/health` as `rateLimitKeys`. Verified with the cap set to 5 and 20 distinct identifiers sent, confirming the map never exceeds the cap |
| 41 | No crash-safety or graceful-shutdown handling existed anywhere in `server.js`: one uncaught exception, unhandled rejection, `SIGTERM`, or `SIGINT` silently killed the whole process, instantly dropping every concurrent session for every connected user with no warning to their browsers | Nothing registered `process.on("uncaughtException"\|"unhandledRejection"\|"SIGTERM"\|"SIGINT", ...)` | Added handlers that log the cause, send every open WebSocket a clean, informative close (code 1012, "Server restarting. Please reopen this conversation.") so the client's existing reconnect UI reacts immediately, then exit (3-second hard-exit safety net). Verified for a real `SIGTERM` (checks the WebSocket close code/reason and that the process actually exits) and for a simulated uncaught exception via a test-only hook that is inert unless an env var only the test sets is present |

## Not verified

These were **not** tested and are marked accordingly in the register and in the app:

- A real microphone and real speech recognition (any language, including `en-IN` fallback on a real engine).
- Physical vibration on a phone.
- A switch or other assistive hardware.
- A refreshable Braille display. Routing to an adapter is tested only with a TEST-ONLY script; no real display driver exists.
- A real person signing to a real camera and being recognised, by either the personal DTW recogniser or the real pretrained ISL/ASL models now bundled (see `docs/SIGN_LANGUAGE_MODEL_EVALUATION.md`). The pretrained models' own authors' published test-split accuracy (93.5% ISL, 30.6% ASL) is not a SANGAM measurement and is not claimed as one.
- Real recordings of fire alarms, doorbells, sirens and horns for the sound detector, and false-alarm rates in real rooms.
- Where the YAMNet model file came from: a third-party npm repack, behaviour-checked but not proven identical to Google's file (replacement steps in `vendor/yamnet/README.md`).
- Deafblind users: no co-design or user testing was done.
- A live voice call between two separate devices, across networks, or through a TURN server.
- A real translation provider, translation quality, and anything about Odia or Hindi end to end (recognition, translation, voice) on a real device.
- Screen readers (NVDA, JAWS, VoiceOver, TalkBack). axe-core finds many problems but cannot judge reading order or announcement quality.
- Browsers other than Chromium; real phones (mobile checks use Chromium device emulation).
- Load, long-running sessions, and the 60-minute session expiry (not waited out).
- Whether the on-screen text reads well to people who use these tools: no user testing was done.

## Clean-extract run (second pass, `SANGAM_Complete_Implementation_v2.zip`)

`SANGAM_Complete_Implementation_v2.zip` passed `unzip -t` (no errors). It was extracted into an empty directory, `npm ci` was run (0 vulnerabilities reported by npm), and `npm run test:all` was run there: **736 passed, 0 failed** (43 + 63 + 18 + 9 + 33 + 46 + 164 + 75 + 121 + 89 + 75). The ZIP contains no `node_modules`, no `.env` and no logs. After that run, only Markdown report text (this section and the integration report) was edited; the ZIP was rebuilt and its code files were compared byte-for-byte with the tested extract.

## Clean-extract run (third pass, `SANGAM_FINAL_COMPLETE_UPGRADED.zip`)

`SANGAM_FINAL_COMPLETE_UPGRADED.zip` passed `unzip -t` (no errors). It was extracted into an empty directory, `npm ci` ran cleanly (99 packages, no audit run needed since this is a prototype), and `npm run models:verify` confirmed the bundled ISL model's weights hash matches its install receipt and that ASL is correctly **not** installed (it is download-on-request — see `docs/MODEL_INSTALLATION_GUIDE.md`). The ZIP contains no `node_modules`, no `.env`, no logs, and no ASL model weights (only `vendor/sign-models/asl/manifest.json`, its provenance/licence record).

`npm run test:all` was run four times from clean extractions, investigating every failure rather than re-running past it:

| Run | Result | Note |
|---|---|---|
| 1 | 811 passed, 1 failed | `test-a11y.js`: "Escape closes the menu and returns focus" failed once |
| 2 | 811 passed, 1 failed | `test-a11y.js`: "touch targets ≥ 44 px on #/dashboard/profile" failed once, reporting `.hp-on` at 52×44 — a different assertion than run 1 |
| 3 | 812 passed, 0 failed | Clean |
| 4 | 811 passed, 1 failed | Same `.hp-on` touch-target assertion as run 2, recurring |

Run 1's failure ("Escape closes the menu") never recurred across three further isolated runs of `test-a11y.js`
alone (75/75 each, see below) and is treated as one-off timing noise, consistent with "One check... failed once...
possibly timing-sensitive" already noted from the second integration pass. Run 2 and run 4's failure, both on the
same assertion, warranted a real fix rather than being written off as flakiness: `.hp-on{min-height:44px}`
(`assets/styles.css`, the haptic pattern's on/off label) sits exactly at the WCAG touch-target minimum with no
padding headroom, so under the CPU contention of a 12-suite, multi-Chromium `test:all` run its rendered box can
measure a fraction of a pixel under 44 before display rounding — it never failed once across the 3 isolated
`test-a11y.js`-only runs, where there is no such contention. **Fixed** by raising `.hp-on`'s `min-height` to 46px,
removing the borderline condition rather than relying on timing. Two further clean-extract `npm run test:all` runs
after the fix both passed **812, 0 failed**. The CSS change is purely a 2px increase to an already-compliant touch
target; nothing else about the haptic preset feature changed.

After the fix, only `assets/styles.css` (one rule) and this report's Markdown were edited; the ZIP was rebuilt and
re-verified from a fresh extraction as described above.

## Clean-extract run (fifth integration pass, backend audit)

`SANGAM_FINAL_COMPLETE_UPGRADED.zip` (this delivered build) was rebuilt from `final/`, excluding `node_modules`
(regenerated by `npm ci`) and `vendor/sign-models/asl/wlasl-slgcn/` (the ASL model weights — deliberately never
bundled or redistributed; only `vendor/sign-models/asl/manifest.json`, the licence/provenance record with no
weights, ships). `unzip -t` reported no errors. It was extracted into a fresh, otherwise-empty directory and run
exactly as a new user would:

| Step | Command | Result |
|---|---|---|
| 1 | `npm ci` | 99 packages added, 0 vulnerabilities |
| 2 | `npm run models:verify` | `[isl] OK isl-include-slgcn-openhands-v1 weights sha256 af7b7ec5eaa8e42b…` / `[asl] not installed` — confirms the bundled ISL weights are byte-correct and that ASL is correctly absent, not silently installed |
| 3 | `npm run test:all` | **838 passed, 0 failed** (ISL-only, matching the "Total (as shipped, ISL only)" row above exactly; the one intentionally-informative intermittent check in `test-sign-video.js` happened to land as a pass this run) |

Nothing was edited in the project between this run and the ZIP being handed over — this is the exact same code
being delivered, verified from the ZIP itself rather than from the working directory it was built from.

Playwright with Chromium is not in `package-lock.json`: install it separately (see the README) before running the browser suites.

## Eighth pass (accounts, redesign, accessibility pass, personal held poses)

Run on Windows 11, Node 24, no Playwright. Real server, real HTTP, temporary data file.

| Suite | Result | Class |
|---|---|---|
| `server/smoke-test.js` | 43 passed, 0 failed | Backend, real server |
| `server/test-features.js` | 63 passed, 0 failed | Backend, real server |
| `server/test-reliability.js` | **4 passed, 2 failed** | Backend. The 2 failures are the SIGTERM graceful-shutdown checks; **the same 2 fail on the untouched original code** on Windows (Node cannot deliver a catchable SIGTERM to a child there). Not hidden or disabled. Not verified on Linux/macOS |
| `server/test-accounts.js` | 129 passed, 0 failed | New. Real server, real cookies and scrypt, restart persistence |
| `test-sign-engine.js` | 33 passed | Synthetic hands |
| `test-sign-model.js` | 51 passed | Real weights vs PyTorch fixtures |
| `test-sign-letters.js` | 39 passed | Synthetic hands (ASL) |
| `test-sign-static.js` | 45 passed | New. Synthetic hands; proves logic, not accuracy on a real hand |
| `test-sound-engine.js` | 63 passed | Synthetic audio logic |

**Real-browser checks (manual and in-page scripts, in the app's Chromium pane):** all four role journeys, administrator review, interrupted onboarding, connection approval, 47-view accessibility audit (0 structural problems, 0 contrast failures after fixes), phone-width layout, held-pose capture/recognition/rejection/deletion with synthetic frames. See `docs/UI_TEST_REPORT.md`.

**Not run (blocked):** all Playwright suites (`test-e2e`, `test-integration-fixes`, `test-browser`, `test-access-browser`, `test-sign-browser`, `test-sign-video`, `test-sound-browser`, `test-a11y`): Playwright and Chromium are not installed here. `test-a11y.js` clicks the legacy `#dashBtn` / `#dashMenu` dropdown, which the new header replaced, so it will fail until updated. Treat the earlier totals (812/821) as not re-verified for this build.

**Never tested:** real webcam, microphone, speech service, screen readers, magnifiers, switch devices, tablets and real phones, other browsers.
