# Changelog

This version integrates `SANGAM_Integrated_Final` (foundation) with the master implementation prompt. Earlier changelogs are kept in `docs/previous/`.

## Eighth pass: accounts, four role experiences, accessibility pass, personal held poses

Detail: `docs/IMPLEMENTATION_PROGRESS.md`, `docs/FEATURE_AUDIT.md`, `docs/UI_CHANGELOG.md`, `docs/UI_TEST_REPORT.md`.

Added
- Accounts (`server/accounts.js`, `server/db.js`): registration, sessions, email verification and reset (no mail service: links shown on screen in development mode and labelled "NOT emailed"), roles (Primary, Supporter, Community, Interpreter), per-role onboarding saved per step, connections with approval and three permissions, interpreter verification (administrator only) and request routing, notifications, learning progress, export and delete. Stored in one JSON file.
- New interface (`assets/account.js`, `account-dash.js`, `account.css`): four dashboards, onboarding wizard, settings, help, privacy and terms; themes; responsive header.
- Optional voice navigation (`assets/voice-nav.js`).
- Personal held-pose trainer (`assets/sign-static.js`, `test-sign-static.js`): landmark-only storage, consent, deletion, unknown rejection, leave-one-out self-check.
- `test-support/ui-audit.js` and 34 new or updated documents in `docs/`.
- New environment settings: `DATA_FILE`, `ADMIN_EMAILS`, `DEV_TOKENS`, `REQUIRE_EMAIL_VERIFICATION`, `ACCOUNT_RATE_MULT` (see `.env.example`).

Changed
- **Security:** the server used to serve the whole project folder, including `.env`, `data/` and `server/`. It now serves only `/assets` and `/vendor`; any other path that looks like a file or a dot-folder (`/.env`, `/package.json`, `/server/...`) is a real 404, and extensionless deep links still get the app.
- Header navigation replaced; the legacy dashboard dropdown is hidden (original Playwright tests that click `#dashBtn` need updating).

Verified
- `server/test-accounts.js`: 129 checks pass (real server, temp database, restart persistence). `test-sign-static.js`: 45 pass (synthetic hands). Smoke 43, features 63, sign engine 33, sign model 51, letters 39, sound engine 63 pass.
- In-page audit of 47 views: 0 structural problems, 0 contrast failures.

Not done / not verified
- `server/test-reliability.js`: 2 of 6 fail on Windows (SIGTERM); the same 2 fail on the original code.
- Playwright suites were not run (not installed here). No real webcam, microphone or screen reader testing. No ISL static alphabet recogniser (no verified dataset). No model training. No email delivery.
## Seventh pass: ISL audit against real INCLUDE videos

Full write-up with every number, method and limit: `docs/ISL_RECOGNITION_AUDIT.md`. Data and tools: `datasets/isl/` (metadata, validation reports, extraction and evaluation scripts; the 1.2 GB archive and video frames live outside the project on `D:\SANGAM_ISL_data`).

Verified on real data (one official archive, `Seasons_1of1.zip`, MD5 matched, 85 videos, 6 classes)
- The model is the official trained checkpoint, not random; the 263 labels match the official metadata exactly; real ISL videos are recognised as the right words (about 3 in 4 through the app's own tracker and model code).
- The Hugging Face metadata table mixes two splits: unfiltered, 424 videos are both "train" and "test". Rows with `include_50 == False` reproduce the paper's split exactly. 33 video paths carry two different labels and are excluded.
- Accuracy is well below the published 93.5%, even on videos the model was trained on, so the live tracker input differs from training. Interpolating vs duplicating frames makes no difference; skipping the 25 fps resampling collapses accuracy to about 1%.
- Non-sign rejection is hard: time-reversed and scrambled real signs still get a word 93% of the time at the original bar, about half at Balanced and about a quarter at Careful.

Added
- "Hands detected" status line while recognising.
- `datasets/isl/tools/`: `prepare_subset.py` (safe extraction, validation, frame decoding), `holistic-batch.html` + `dev-server.js` (keypoints through the app's own Holistic build), `eval_model.js` (real-video evaluation with the app's segmenter and model).

Changed after measuring
- **The word models now use MediaPipe's heavy pose model** (`modelComplexity: 2`), the one the model was trained with. On the same 85 real videos at about 10 fps: 82.4% top-1 vs 77.1% with the full pose model (held-out test videos 83.3% vs 72.2%, n = 18). Costs 118 ms vs 78 ms per frame on the test laptop. `pose_landmark_heavy.tflite` (26.4 MB) vendored from the official `@mediapipe/holistic@0.5.1675471629` npm tarball after its SHA-512 matched the registry. Set `modelComplexity` back to 1 in `assets/sign.js` to undo.

Not done
- No training or fine-tuning (no model was trained here). The full 56.8 GB dataset was not downloaded. Unseen signers, real webcam recordings and the offline-with-network-disconnected test were not done. Heavy pose combined with 25 fps tracking was not tested.

## Sixth pass: Sign Language Camera (letters, numbers, freezing, random words)

Reported: sign recognition worked for words only, not letters or digits, and the words looked random.

Added
- **Letters A–Z** (ASL one-handed fingerspelling, J and Z drawn in the air) and **numbers 0–9**, in `assets/sign-letters.js`. The pretrained word models were never trained on either, so before this the camera could not produce a letter or digit. Rule-based, held-still-to-type, **Add space** button. 39 tests on generated skeletons (`test-sign-letters.js`).
- **ASL, 100 common words** option: the existing 100-word subset in the ASL model file, which the UI never offered.
- **Word recognition: how careful?** setting (Loose / Balanced / Careful) backed by multi-view agreement in `PretrainedAdapter.classify` (`opts.views`, default 1 = unchanged).
- Readable names for words such as `Howareyou`, `StreetorRoad`, `GoodMorning`.

Fixed
- **The camera froze while a word was worked out.** One word took 3–13 s of JavaScript on the page thread, and a preview of it ran every 0.5 s *during* signing. Hand tracking stalled and lost frames were filled with the last good pose, which bent the motion the model read. Now: no model run mid-sign; inference runs in a Web Worker (`assets/sign-worker.js`, falls back to the page thread); the SL-GCN maths uses blocked matrix multiplies and runs about 2x faster (JS output still matches real PyTorch to 1.1e-5). Longest page freeze during recognition measured at 64 ms (was seconds).
- **Random words.** The model has no "not a sign" answer. On 80 generated non-sign clips (waving, raising a hand, fidgeting, two-handed gestures) the ISL model typed a word for **66 of 80 (82%)** at the old bar; at the new Balanced default (two views agree, 80% confidence, 40-point margin) 6 of 48 (13%); Careful about 4–6%. The new default is Balanced.
- Changing the language while recognising kept the old tracking pipeline feeding the new recogniser; it now stops recognition first.
- Each held frame kept the full MediaPipe result (images included) for the whole sign; now only the numbers are kept.

Not verified (be honest with users)
- No real camera, signer or labelled footage was available. Letters and numbers were tested on generated skeletons only. The non-sign figures above use generated movement, and **how often real signs are wrongly rejected has not been measured**.
- Playwright is not installed in this checkout, so `test-sign-browser.js` and the other browser suites were not run; the changed UI was exercised by hand in Chromium with a mock hand source. The in-app browser here has the camera blocked, so no real webcam run was possible.
- Word latency after a sign (measured single pass on this machine: 1.4 s for a 1 s sign, 2.7 s for a 2 s sign; Balanced and Careful run 2–3 passes only when the first pass is already close to the bar, so a long sign can take roughly 5–7 s there, an estimate, not a measurement).

## Fifth integration pass (backend audit: API validation, security, WebSocket reliability, persistence)

A function-by-function audit of `server/server.js` (994 lines), `server/translate.js`, and the server-controlled
fields rendered client-side in `assets/connect.js`, against the second-priority instruction for this phase: audit
the existing backend, improve API validation/security/WebSocket reliability/persistence, fix critical bugs,
introduce larger architectural changes only where feasible. Full detail with severities and verification method for
every item: `PROJECT_AUDIT_AND_PROBLEM_REGISTER.md`'s new "Backend audit" section. This backend already carried
real security hardening from an earlier phase (timing-safe key comparisons, origin allowlisting, rate limiting,
participant-key reconnect binding); this pass looked for what that work missed, not for a rewrite, and the fixes
below are small and targeted rather than architectural.

Fixed
- **`app.set("trust proxy", true)` was unconditional**, so any direct, unauthenticated caller could defeat every
  IP-based rate limit (session creation, volunteer/request creation, the `/api/translate` proxy) just by sending a
  different self-chosen `X-Forwarded-For` header per request. Now defaults to `false` (rate limiting falls back to
  the real, unspoofable socket address) and is only enabled via a new `TRUST_PROXY` env var for a real deployment
  behind a reverse proxy or tunnel.
- **The rate-limiter's key space had no cap.** Added `IP_HITS_MAX_KEYS` (default 20000, env-overridable) and
  exposed the live count at `/api/health` as `rateLimitKeys` so it is observable, not just asserted.
- **No crash-safety or graceful-shutdown handling existed anywhere in the process.** One uncaught exception,
  unhandled rejection, `SIGTERM`, or `SIGINT` previously killed the whole server silently, instantly dropping every
  concurrent session for every connected user with no warning. The server now logs the cause, sends every open
  WebSocket a clean, informative close (code 1012, "Server restarting. Please reopen this conversation.") so the
  existing client-side reconnect UI reacts immediately, and exits (with a 3-second hard-exit safety net).

Audited, not changed (because changing it was judged unsafe or infeasible within this pass, not overlooked)
- **In-memory-only persistence.** Session/volunteer/request state does not survive a crash or restart. This is
  deliberate, documented design (private conversation text must never touch disk) — making it restart-survivable
  would mean writing session bearer secrets to disk, which was not something this pass could design, implement,
  and verify to a safe standard. The crash-safety fix above (a clean, immediate failure) is the responsible
  alternative within that constraint. Left as an explicit open item.
- **`originAllowed()` permits a WebSocket upgrade with no `Origin` header.** Reviewed deliberately: the real access
  boundary is the per-session token, which a non-browser caller needs regardless of Origin. Judged a sound,
  intentional tradeoff, not a gap.
- **CSP `style-src 'unsafe-inline'`.** A known, bounded weakening (script-src has no such exception, which is the
  XSS-relevant half). Not removed without being able to exhaustively verify every inline `style=""` usage still
  works without it.
- **Client-side rendering of server-supplied chat fields** (sender name, message text, source label, original
  text) was checked directly for stored/reflected XSS, since every field is attacker-controlled by any participant
  and is broadcast live via `innerHTML`. Confirmed all paths already go through the existing `esc()` helper. No
  change needed; recorded so this was verified, not assumed safe.

Added (testing)
- `server/test-reliability.js` (new, 6 checks, wired into `npm run test:reliability` and `npm run test:all`): drives
  `server.js` as a child process (required, since trust-proxy mode is read once at module load and the shutdown
  test must actually kill the process without taking the test runner down with it). Proves, rather than asserts:
  the trust-proxy bypass existed and is closed (same 21-request, 21-spoofed-IP scenario fails closed by default and
  passes correctly with `TRUST_PROXY=1`); the rate-limit key cap holds under 20 distinct identifiers; a real
  `SIGTERM` produces a clean WebSocket close and the process exits; a simulated uncaught exception (an explicit,
  test-only hook, inert unless an env var only the test sets is present) does the same.

Not done in this pass (explicitly, so it is not mistaken for forgotten)
- Full backend rearchitecture (a real database, a message queue, multi-process/horizontal scaling) was explicitly
  out of scope per this phase's own instructions ("introduce larger architectural changes only where feasible") and
  was not attempted.
- `server/smoke-test.js` (43 checks) and `server/test-features.js` (63 checks), which already covered most of the
  security surface from an earlier phase, were re-run to confirm no regression but not rewritten.

## Fourth integration pass (sign-recognition pipeline investigation: why predictions don't match performed signs)

A focused investigation into the single most important unresolved defect reported for this project: the Sign
Language Camera opens and runs, but a recognised word does not reliably correspond to the sign actually performed.
Full detail: `docs/SIGN_LANGUAGE_MODEL_EVALUATION.md` (new "Pipeline bug fixes made in this phase" and "single most
important structural finding" sections), `TEST_REPORT.md` ("Failures found in the fourth integration pass"). A
backup of the project as it stood before this pass was taken before any change (`backup_pre_phase2/` alongside this
project's own parent directory, not included in this ZIP).

Fixed
- **Camera aspect-ratio correction was permanently dead code.** `assets/sign.js` never populated
  `PretrainedAdapter`'s `opts.cameraAspect`, so `correctAspect()` in `assets/sign-model.js` never ran for any
  camera, on either pretrained model — any webcam not exactly matching the training aspect ratio fed geometrically
  distorted coordinates into the model on every clip. Now reads the real camera's measured aspect ratio once the
  stream starts (and on resolution changes) and wires it through. ASL's manifest has no `referenceAspect` value at
  all (WLASL's source videos have no single canonical resolution), so this remains a documented no-op for ASL
  specifically — a data gap, not a wiring bug.
- **The pretrained-model pose extractor used MediaPipe Holistic's `lite` complexity**, while OpenHands' own
  published evaluation of these exact checkpoints used `heavy`. Vendored `pose_landmark_full.tflite` and switched
  to `modelComplexity:1` ("full") — a real accuracy improvement and MediaPipe's own library default. `heavy` was
  deliberately not vendored/enabled: substantially slower per frame, with no real device available in this
  environment to measure whether that latency is acceptable for a real-time webcam feature.
- **`PretrainedAdapter.classify()` could return a confident "match" from a degenerate, too-short frame sequence.**
  Added a hard minimum-frame-count floor (`MIN_CLASSIFY_FRAMES`) at the model-inference boundary itself, found
  necessary by direct testing (see below), not merely as a precaution.

Audited, not changed (because there was nothing to change into, or no safe fix available)
- **Temporal resampling ("targetFps") has no OpenHands reference to be "at parity" with.** A fresh clone of
  AI4Bharat/OpenHands' own released training/test configs for these exact checkpoints shows temporal subsampling
  commented out entirely — the authors used every pose frame their source videos' native rate produced, unresampled.
  SANGAM's `resampleToFps()` is its own addition to cope with a live, variable-rate camera, which OpenHands' fixed
  pre-recorded video files never needed. The specific `targetFps:25` value remains an unverified assumption about
  INCLUDE/WLASL's native recording rate (their official sources were unreachable from this environment to confirm).
- **The model cannot say "none of these."** A new real-video mechanics test (`test-sign-video.js`) found that the
  SL-GCN, being a closed-set classifier with no trained rejection output, can and intermittently does report a
  specific word with ≈100% confidence given non-human, non-sign input — once enough spurious frames clear the new
  minimum-frame floor. This cannot be fixed by threshold tuning (nothing short of retraining with an explicit
  rejection class would address it, which is out of reach in this environment) and is documented as the single most
  plausible structural explanation for the original complaint, not hidden by presenting it as test flakiness.

Added (testing)
- `test-sign-video.js`: a new Category C ("recorded video, real pipeline") **mechanics** test — a real video FILE,
  decoded by the real browser, through the real MediaPipe Holistic WASM and the real, installed
  `PretrainedAdapter(ISL).classify()`, unmodified production code end to end. Explicitly labelled as mechanics
  verification, not accuracy verification: no legally clear, reachable, labelled real ISL/ASL reference video could
  be obtained in this project's network environment (search documented in full in
  `docs/SIGN_LANGUAGE_MODEL_EVALUATION.md`), so the clip used is an honest, clearly-marked synthetic test pattern.
- Regression tests for all three fixes above in `test-sign-model.js` and `test-sign-browser.js`.
- `window.SangamSign.pretrained` is now exposed (alongside the pre-existing `adapters`/`_state`) for test and future
  diagnostic introspection of the loaded ISL/ASL adapters.

Not done in this pass (explicitly, so it is not mistaken for forgotten)
- No real camera or real signer was available in this environment; nothing above is a measurement of real-webcam
  recognition accuracy. See `docs/SIGN_LANGUAGE_MODEL_EVALUATION.md`'s test-category table.
- The backend audit, a developer diagnostic panel, and a simple user-facing live-webcam test procedure are tracked
  separately and were not part of this pass.

## Third integration pass (real pretrained sign-language models, P3/P4 merge)

This pass merged `SANGAM_Person4_Environmental_Sound_Alerts.zip` and `SANGAM_Day2_Person3_Updated.zip` into this
project, and replaced the earlier "no pretrained sign-language model could be obtained" conclusion with real,
verified models. Full detail: `PROJECT_AUDIT_AND_PROBLEM_REGISTER.md`, `THREE_ZIP_COMPARISON.md`,
`docs/SIGN_LANGUAGE_MODEL_EVALUATION.md`, `docs/MODEL_INSTALLATION_GUIDE.md`, `IMPLEMENTATION_REPORT.md`.

Added
- **Real pretrained Indian Sign Language recognition**: AI4Bharat OpenHands SL-GCN model trained on INCLUDE (262
  usable isolated-word signs, CC BY 4.0, bundled in this ZIP). A pure-JavaScript reimplementation
  (`assets/sign-model.js`) runs the real exported weights — no PyTorch, ONNX or TensorFlow.js at runtime — verified
  bit-for-bit against real PyTorch inference on the same weights (max difference 7.63e-6, identical top-1
  predictions). Published authors' accuracy: 93.5% top-1 on the INCLUDE test split (not independently measured by
  SANGAM; never presented as SANGAM's own figure).
- **Real pretrained American Sign Language recognition**: the same architecture trained on WLASL2000 (2,000 signs).
  Not bundled (WLASL's Computational Use of Data Agreement forbids commercial use); installed only via
  `npm run models:install -- asl --accept-wlasl-terms`, an explicit, logged opt-in. Published authors' accuracy:
  30.6% top-1 on the WLASL2000 test split.
- A from-scratch, pure-Node PyTorch-checkpoint reader (`scripts/sign-models/torch-ckpt.js`) and restricted-pickle
  Python equivalent (`islconv/safeload.py`, development-only) that read the official `.ckpt` release files safely,
  without ever executing code from them, and a model installer
  (`scripts/sign-models/install.js`, `npm run models:install` / `models:verify`) that verifies every archive's
  SHA-256, every tensor's shape against the exact OpenHands architecture, and the label list, before writing
  anything.
- Vendored MediaPipe Holistic (Apache-2.0, `lite` pose variant only) alongside the existing MediaPipe Hands, since
  the pretrained models need Holistic's 27-point body+hand layout. A parallel `HolisticExtractor` reuses the
  existing segmentation/stabilisation pipeline rather than duplicating it.
- UI: the language picker now shows ISL and ASL as **Available** (BSL remains Not installed — no claim is made
  there). A recognised sign shows "Model score: X% — the model's own confidence, not independently verified by
  SANGAM," deliberately different wording from the personal DTW recogniser's "Match: X%."
- **Haptic pattern preset** (from P3's Day 2 prototype): the four Yes/No/Help/Emergency patterns P3 contributed are
  now a selectable preset (`hapPreset`, default `sangam`) alongside this project's own ten patterns, never
  replacing them.
- **Loud-sound fallback** (from P4's prototype): a supplemental, off-by-default "Loud sound (not identified)"
  category in the sound-alert engine, driven by RMS loudness, architecturally gated so it can never fire in the
  same window as — or be confused with — a real YAMNet-classified alert. Every surface (banner, history, spoken
  alert, dispatched event) labels it distinctly from a real classification.
- 33 new automated checks (`test-sign-model.js`) verifying the real-model math and preprocessing against golden
  PyTorch fixtures; 11 new unit checks and 18 new browser checks for the loud-sound fallback.

Changed
- `docs/SIGN_LANGUAGE_MODEL_RESEARCH.md` is annotated (not silently rewritten) with a correction: INCLUDE's licence
  was previously recorded as CC BY-NC-SA 4.0, sourced from a derived dataset's page rather than INCLUDE's own
  record; it is actually CC BY 4.0. The corrected licensing is in `docs/SIGN_LANGUAGE_MODEL_EVALUATION.md`.
- `test-sign-browser.js`: recogniser-list and language-selector assertions updated from "ISL not installed" to
  "ISL/ASL Available," with waits added for the now-asynchronous model load.
- `index.html`: dashboard and consent-dialog copy updated to describe the bundled pretrained models instead of "No
  Indian Sign Language model is installed."

Not done, and not claimed: a real Deaf signer has not used either model; no real-world accuracy figure exists for
this build; both models are isolated-word only, not sentence-level translation; regional/dialect coverage is
unmeasured. See `PROJECT_AUDIT_AND_PROBLEM_REGISTER.md` ("Open problems carried forward").

Fixed
- `.hp-on` (the haptic pattern's on/off label, pre-existing) had `min-height:44px` — exactly the WCAG touch-target
  minimum with no padding headroom, which intermittently measured a fraction of a pixel under 44 during the busiest
  full-suite test runs. Raised to 46px for real headroom. Found during this phase's clean-extract verification, not
  introduced by this phase's own changes. See `TEST_REPORT.md`.

## Second integration pass (sign camera, sound alerts, Braille routing, deafblind options)

Added
- **Sign Language Camera**: consent, camera lifecycle, vendored MediaPipe Hands, personal-sign teaching and matching, editable transcript, confirm, speak, send with `source:"sign"`. No ISL model; language list shows only real adapters. Model-package slot with validation. Docs: `docs/SIGN_LANGUAGE_CAMERA.md`, `docs/SIGN_LANGUAGE_MODEL_RESEARCH.md`.
- **Sound alerts**: real YAMNet via vendored MediaPipe Tasks Audio, on-device, self-checked at load, onset-only detector with cooldown and hysteresis, banner, history, optional flash/vibration/speech, sensitivity and sound-type settings, microphone lifecycle and errors. Docs: `docs/SOUND_ALERTS.md`.
- **Braille routing** to connected display adapters (`SangamBraille`), wrapped to each display's width, plus a Devices area (connect, test, disconnect, errors). Sound alerts are routed too.
- **Limited-delivery receipts**: the receiver's device reports (without channel names) when a chosen output could not be achieved, and the sender is told the message may not have reached them in the way they prefer. New `presented` WebSocket frame.
- **Haptics**: Call incoming and Alert patterns (ten in total), per-pattern on/off, pulse-length scaling.
- **Deafblind-friendly options** (optional, undoable, under validation), confirm-before-send, announcement levels, switch-scanning options, "Your data on this device" export and delete.
- Docs: `docs/TRANSLATION.md`, `docs/DEAFBLIND_VALIDATION_PLAN.md`, updated `docs/BRAILLE_DEVICE_ADAPTER.md` and `docs/ACCESSIBILITY_GUIDE.md`.
- 370 new automated and browser checks (suites: sign engine, sound engine, sign browser, sound browser, access browser, plus new server checks).

Changed
- The haptic expectation in `test-browser.js` now lists **ten** meanings instead of eight, because the specification added Call incoming and Alert. It was updated, not weakened.
- The "What comes next" rows for Braille, haptics and deafblind options were rewritten to match what now exists (Partially implemented, not Not implemented).
- `Permissions-Policy` now allows the camera for this site (`camera=(self)`, it was `camera=()`), needed by the Sign Language Camera. The Content-Security-Policy is unchanged (it already allowed WebAssembly and blob workers for OCR) and still allows no external hosts. The server also accepts `sign` as a message source and keeps `via` only for sign messages.
- The sign model package validator now also checks template shape and that every vocabulary word has templates.

Unchanged on purpose: authentication, session and participant tokens, rate limits, origin checks, turn authorisation, host-key secrecy. No API key is in any frontend file.

Not done, and not claimed: real-camera and real-signer testing, an ISL model, real alarm/doorbell recordings, a real Braille display, physical vibration and switch testing, a real translation provider, screen-reader testing, user validation.

## Preserved (deliberately unchanged in behaviour)

- Speech synthesis: voice caching, resume of a paused engine, voice fallback, `onerror` handling.
- Speech recognition: `en-IN` to `en-US` fallback, continuous restart, user-stop flag, terminal-error protection.
- OCR: upscaling, grayscale and contrast preprocessing, bundled offline Tesseract.
- Backend security: session and participant tokens, participant keys, host key secrecy, rate limits, origin checks, turn authorisation, no-store on sensitive API responses, in-memory storage.
- The three original test files, byte-identical: `server/smoke-test.js` (43), `test-e2e.js` (18), `test-integration-fixes.js` (9).
- The visual identity of the dark interface.

## Bug fixes in the foundation

- Found in the second pass by looking at screenshots (axe did not flag it): every toggle switch inside a profile panel box (High contrast, Read incoming messages aloud, Switch scanning, and the new ones) had lost its track and the knob drew over the label text, because `.pbox label{display:block}` overrode `.sw{display:inline-flex}`. Fixed in `assets/styles.css`.
- Leaving the Connect panel destroyed the live chat session. Sessions now stay alive; a chat pill and `#/chat` return to them.
- Live voice was permanently disabled because presence was never announced to peers.
- High contrast had no visible effect in the dark theme; it now gives at least 7:1 on every sampled surface.
- `.vis-hidden` caused 500–700 px of horizontal overflow on the Connect panel.
- A duplicate element id (`bar`) stopped the OCR progress bar updating.
- A damaged image caused an uncaught Tesseract error; images are now decoded first and refused with a reason.
- Dark-on-dark outline buttons, low-contrast status pills and a navy-on-dark hover state on filled buttons.
- The stale Google Fonts link was removed; the page loads no third-party hosts.
- Volunteers were presented as "sign-language interpreters"; the category is now worded as volunteer help, not a certified interpreter.

## New features

- **Delivery states.** Sending, Sent, Delivered (only when the other device confirms), Waiting to reconnect, Not sent with Retry. Retries are de-duplicated by a client message id. A draft typed while disconnected is kept.
- **Voice review.** Transcript lands in an editable review box; it is never sent automatically and the microphone never starts by itself. Specific messages for blocked microphone and unsupported language.
- **Read from a photo.** File type and size checks, confidence figure with caution, replace and remove, copy, read aloud, send after review, "text read from a photo" label in the chat, English-only note.
- **Phrase board.** Editable draft, send after review, duplicate-send guard, custom phrases saved on the device.
- **Receive-side rendering from the receiver's own profile.** Captions, per-message Read aloud, Braille line, semantic haptic pattern. Nothing from a profile is ever sent.
- **Spoken output controls.** Stop, Repeat last, voice choice, no overlapping speech, auto-read off by default.
- **Haptic patterns.** Yes, No, Help, Emergency, Information, Message received, Message sent, Connection lost; each with Test, Stop and a text description. No intensity slider (the Web Vibration API has none).
- **Braille preview.** Grade 1 English with capital and number indicators, wrapping, copy, unsupported characters reported. States it is not Grade 2 and not a physical display.
- **Switch scanning.** Keyboard-driven group and item scanning, pause and resume.
- **Emergency workflow.** Reviewed message, sent to the session, full-screen alert dialog, acknowledgement shown to the sender, honest "not acknowledged" state, show-to-a-person card, dialer link. It does not contact emergency services.
- **Translation.** Server-side adapter for LibreTranslate and Google; capability table separating recognition, translation, voice and script display; original and translation both visible; honest "not set up" state; provider failures mapped to clear messages.
- **Live voice.** WebRTC audio with explicit consent, decline, mute and hang up, signalled over the session WebSocket.
- **What comes next.** Replaced the placeholder timeline with a live capability check for the browser and an honest status table.

## UI / UX

- Profile choices now have visible effects: unselected input modes hide or disable their controls with an explanation; unselected outputs stop rendering.
- Default profile is now Voice, Camera and Text (it was Voice, Text and Switch, which hid the photo box and turned on a Switch label that did nothing). Switch is off until chosen.
- Chat pill, status line and clear connection states.
- Emergency button available across the dashboard.

## Accessibility

- Skip link, one `main` landmark, one `h1`, no duplicate ids.
- Modal dialogs trap focus and return it.
- Visible focus indicators checked on five panels; 44 px touch targets checked on eleven views.
- No horizontal overflow at 320, 360, 390, 768, 1024, 1440, 1920 px and two landscape sizes; 200% zoom with 160% text scale reflows.
- Reduced-motion respected; demo board starts paused.
- axe-core: no serious or critical violations on 21 views, including both emergency dialogs, the live chat and high-contrast mode.

## Backend

- Acknowledgement (`ack`) and `delivered` frames; `emergency-ack`; `rtc` signalling relay limited to participants of the same session.
- Message provenance whitelist (typed, voice, ocr, phrase, translated, emergency).
- `GET /api/capabilities` (never returns a credential) and `POST /api/translate` (membership proof and rate limits).
- 16 KB frame guard.

## Security

- Content-Security-Policy, `nosniff`, `no-referrer`. The policy allows the bundled OCR engine (wasm and blob worker) and nothing external.
- Translation credentials only in server environment variables, sent to the provider in a header; never returned to the browser.
- Test that no key or key header appears in any frontend file.
- Added tests for the WebSocket origin check and no-store headers.

## Testing

- 366 automated checks (was 70): `server/test-features.js` 57, `test-browser.js` 164, `test-a11y.js` 75 are new. `npm run test:all` starts the servers it needs.
- Real browser screenshots in `screenshots/` with viewport sizes.

## Remaining limitations

See `TEST_REPORT.md` ("Not verified") and `REQUIREMENTS_REGISTER.md`. In short: no real microphone, vibration motor, switch, Braille display, second device, translation provider or screen reader was available; sign-language translation and deafblind support are not implemented; messages are not kept after a restart.
