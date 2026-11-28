# Project audit and problem register — merge, repair and real sign-model phase

This register covers the work described in `CHANGELOG.md`'s most recent entries: merging
`SANGAM_Person4_Environmental_Sound_Alerts.zip` and `SANGAM_Day2_Person3_Updated.zip` into the `v2` foundation
(`SANGAM_Complete_Implementation_v2.zip`), and replacing the earlier "no pretrained sign-language model could be
obtained" conclusion with real, verified pretrained ISL and ASL models. It does not repeat the full problem history
of earlier phases, which is preserved in `REQUIREMENTS_REGISTER.md` and `TEST_REPORT.md`. See
`THREE_ZIP_COMPARISON.md` for a structural, file-by-file comparison of the three inputs; this document is about
problems and their resolutions, not structure.

## Method

Each of the three input ZIPs was extracted into its own directory and inspected directly (file listing, `wc -l`,
reading the implementation notes each author left, reading the actual code) before any merge decision was made.
Nothing was merged by assumption. Every claim below about what a ZIP does or does not contain was checked against
its extracted files, not against its own README's description of itself (the READMEs turned out to be accurate for
both P3 and P4, but this was verified rather than trusted).

## Problems found in the three input ZIPs

| # | Zip | Finding | Severity | Disposition |
|---|---|---|---|---|
| 1 | v2 (foundation) | No pretrained ISL or ASL recognition model; only a personal hand-taught DTW recogniser existed, and the app said so honestly (see the superseded conclusion in `docs/SIGN_LANGUAGE_MODEL_RESEARCH.md`) | High — this was the single most emphasised gap in the master specification | **Resolved this phase**: real pretrained SL-GCN models for both ISL (bundled) and ASL (download-only, licence-gated) now installed and verified. See `docs/SIGN_LANGUAGE_MODEL_EVALUATION.md`. |
| 2 | P3 (haptics) | Both P3 and P4 are forked from a much older, pre-modularisation snapshot of SANGAM (a single 418–438 line `app.js`, 22–23 files total, "CREATIVE UI/UX REVIEW BUILD" per their own README) — **not** from `v2`, which has grown to 17 separate `assets/*.js` modules, a full Node backend, and 111+ non-vendor files. Neither P3 nor P4's surrounding dashboard, styling, or backend code is compatible with `v2`'s current architecture. | Medium — affects merge strategy, not correctness of either prototype's own idea | Confirmed by direct inspection (`wc -l`, `find`, README diff) before merging; see `THREE_ZIP_COMPARISON.md`. Decision: port the **specific feature logic** each zip contributes (haptic rhythm definitions; loudness-only detection concept) into `v2`'s current architecture, rather than attempting a three-way code merge of incompatible codebases. This is the only approach that does not downgrade `v2`. |
| 3 | P3 (haptics) | P3's four patterns (Yes/No/Help/Emergency) are a **different, smaller** set than `v2`'s existing ten semantic haptic patterns, and would silently replace them if copied in wholesale, losing `v2`'s existing Call-incoming/Alert/etc. patterns | Medium | **Resolved**: added as a **selectable preset** (`PRESETS = {sangam, day2}`, a `hapPreset` profile field), never replacing `v2`'s own patterns. See "Haptic preset merge" below. |
| 4 | P4 (sound alerts) | P4's "Environmental Sound Alerts" is RMS (loudness) thresholding only — **not** sound classification. Its own implementation notes say this explicitly ("deliberately not described as an alarm/siren/knock/bark classifier: no classification model or external service is bundled") and were taken at face value only after confirming it in `assets/app.js` directly: the only signal computed is `AnalyserNode` RMS amplitude against a threshold. | Medium — using this as a primary detector would be a real downgrade from `v2`'s already-real YAMNet classifier | **Resolved**: not used as a replacement. Folded in as a supplemental, off-by-default, explicitly-labelled "not identified" fallback category that can only fire when `v2`'s real YAMNet classifier is not already reporting a classified category for the same sound. See "Sound loudness-fallback merge" below. |
| 5 | P4 (sound alerts) | P4's own verification section states Chromium visual automation did not complete in its build environment, so none of microphone capture, vibration, speech, persistence across reload, or responsive layout were ever actually tested — only `node --check` (syntax) and static serving were verified. | Low-Medium for P4 standalone, not inherited since the concept (not the code) was ported | Not inherited: the ported "loud" fallback is covered by `v2`'s existing, much more thorough Playwright test suite (18 new browser checks plus 11 new unit checks in this phase; see `TEST_REPORT.md`). |
| 6 | docs/SIGN_LANGUAGE_MODEL_RESEARCH.md (v2) | States INCLUDE dataset's licence as "CC BY-NC-SA 4.0 (non-commercial)," sourced from a *different, derived* dataset's licence page rather than INCLUDE's own Zenodo/Hugging Face record | Medium — a licence error that would have wrongly blocked bundling a model that is in fact permissively licensed | **Resolved**: re-checked against INCLUDE's own primary sources this phase; actual licence is **CC BY 4.0** (attribution required, commercial use permitted). Documented in `docs/SIGN_LANGUAGE_MODEL_EVALUATION.md`; the original document is annotated with a correction notice rather than silently edited. |
| 7 | v2 (foundation) | Earlier research treated Zenodo/Hugging Face/Kaggle/Google Cloud Storage as the only viable model/dataset hosts, all blocked from the build network, and concluded (reasonably, given that path) that no model could be obtained | Informational | **Resolved**: this phase found that GitHub (raw content and release assets) was reachable and was not tried previously. AI4Bharat's OpenHands project publishes ready pretrained checkpoints there. This is a genuinely new path, not a retry of the same blocked one. |

## Problems introduced during this phase's own merge work, and their resolutions

Per the master specification's instruction to report honestly on mistakes made and fixed, not only on mistakes
found in the inputs:

| # | Problem introduced | How it was found | Resolution |
|---|---|---|---|
| 1 | `assets/outputs.js`: making `buildCards()` re-invokable (so switching the haptic preset re-renders the pattern rows) meant its unconditional `host.addEventListener("change"/"click", ...)` calls would accumulate a duplicate listener on `#profileExtra` (a persistent DOM node across re-renders) every time the preset selector changed | Written deliberately as a regression test while implementing the preset switch, not discovered later | Guarded with `if (!host.dataset.wired) { host.dataset.wired = "1"; ... }` so listeners attach exactly once regardless of how many times `buildCards()` runs. Covered by `test-access-browser.js`. |
| 2 | A regression test written to verify the fix above itself had a bug: it counted `change` events on the host without filtering to the haptic checkboxes, so a `page.selectOption()` call on the unrelated preset `<select>` (which also bubbles a `change` event to the same host) was double-counted as if the listener had fired twice | Investigated with an isolated Playwright debug script before concluding the product code was wrong, rather than assuming the test was right | Root-caused to the test itself, not the product. Fixed by filtering the counting listener to `input[data-hpon]` and isolating the listener attachment to immediately before the single action being measured. |
| 3 | Shoulder-centring unit test in `test-sign-model.js` set raw landmark indices `3*2`/`4*2` as if they were the shoulder points, which are actually indices into the **selected 27-point** array (`SHOULDERS=[3,4]`), not the raw 75-point MediaPipe Holistic array (where shoulders are raw indices 11 and 12) | Caught by the test's own assertion failing on first run | Fixed to use raw indices 11/12 with a code comment explaining the distinction, so the same confusion does not recur. |
| 4 | Four assertions in `test-sign-browser.js` hardcoded "ISL is not installed" as the expected, correct state — true before this phase, false after real models were installed | Ran the full suite after installing models and inspected every failure rather than disabling the tests | Rewritten to assert ISL/ASL as Available, BSL as Not installed, with `page.waitForFunction` waits added since model loading is now asynchronous (`fetch()`), which it was not before. |
| 5 | A follow-up fix to #4 asserted the vocabulary contains "Hello\|Thank you" as a single pattern; the real INCLUDE label is `"Thankyou"` (one word, no space) — a genuine quirk of the dataset's own CSV | Caught by the test failing after the fix above | Documented rather than "corrected" — changing the dataset's own label would be inventing data. Test updated to check for labels actually present in the vocabulary. |
| 6 | First draft of the `assets/sound.js` UI wiring left `#sndLoudType` as an empty placeholder `<div>` with no rendering or event handling attached — the backend detection logic (`sound-engine.js`) was complete, but a user had no way to actually turn the feature on | Noted explicitly as an open gap at the point of interruption in this phase's own working notes, and closed before writing any test for the feature | `draw()` now populates `#sndLoudType` with a toggle bound through the same `onCatToggle` handler as the eight classified categories; `#sndPreview` includes a preview button for it via `E.CATEGORIES.concat([E.LOUD_CATEGORY])`. Covered by 11 new unit tests and 18 new browser tests (see `TEST_REPORT.md`). |
| 7 | First attempt at a browser-test assertion for "a classified alarm with the loud fallback on still raises exactly one alert, as fire" failed — not because of a product bug, but because the real YAMNet model legitimately classifies the same pulsed 3.1 kHz beep as **both** "Other alarm or buzzer" and "Smoke or fire alarm" (two real, independently-crossing-threshold classes), which is pre-existing, correct multi-category behaviour unrelated to the loud-sound merge | Caught by the test itself failing; verified by reading the actual two-category history output before changing anything | Test assertion corrected to its real intent (no alert is ever double-reported as the generic "loud" category alongside a real classification), not weakened to hide the original wrong assumption. |
| 8 | During final clean-extract verification (not during the earlier dev-checkout runs), `test-a11y.js`'s 44 px touch-target check failed intermittently on `.hp-on` (the pre-existing haptic on/off label), 2 of 4 full-suite runs, never in 3 isolated `test-a11y.js`-only runs | `.hp-on{min-height:44px}` (pre-existing, not introduced this phase) sits exactly at the WCAG minimum with no padding headroom, measuring a fraction of a pixel under 44 under full-suite CPU contention | **Fixed at the root**, not papered over with a retry: `min-height` raised to 46px in `assets/styles.css`, giving real headroom. Two further clean-extract runs after the fix both passed 812/0. See `TEST_REPORT.md`'s "Clean-extract run (third pass)" for the full run-by-run account. |

## What the master specification asked for, and where it stands

The specification's twenty-five parts cover far more than sign-language recognition and the P3/P4 merges. For
scope honesty: this phase's engineering effort concentrated on the parts explicitly marked as the primary mandate —
investigating and installing a real pretrained sign model, and merging the two supplementary ZIPs without
downgrading the foundation. The pre-existing accessibility, translation, Braille, deafblind, switch-scanning,
backend/chat, emergency-communication, and security features inherited from `v2` were **re-verified by running
their existing test suites** (see the "Total" row in `TEST_REPORT.md`) rather than re-audited line by line from
scratch in this phase. This is a deliberate, stated scope choice, not an oversight: re-running `v2`'s substantial
existing automated/browser suites for those areas (320+ checks covering access options, translation adapters,
backend security, and accessibility) is a genuine re-verification against regressions, though it is not a fresh
line-by-line audit of those subsystems' original correctness, which was performed in the phase that built them (see
`REQUIREMENTS_REGISTER.md`).

## Backend audit (reliability/security pass, fifth phase)

Per the second-priority instruction for this phase ("audit the existing backend architecture; improve API
validation, security, WebSocket reliability and persistence; address critical bugs and integration problems;
introduce larger architectural changes only where feasible"), `server/server.js` (994 lines at the start of this
pass), `server/translate.js`, and the client-side chat rendering in `assets/connect.js` were read in full and
checked function by function, rather than assumed. This backend already carries real security work from an earlier
phase (timing-safe key comparisons, origin allowlisting, per-socket and per-IP rate limiting, participant-key
reconnect binding, atomic accept-and-create for volunteer requests) — this pass looked for what that earlier work
missed, not for a rewrite.

| # | Area | Finding | Severity | Disposition |
|---|---|---|---|---|
| 1 | `app.set("trust proxy", true)` | Hardcoded to trust the **entire** `X-Forwarded-For` chain from any direct caller, not only a real reverse proxy in front of this process. Any client could defeat every IP-based rate limit below it — session creation (20/min), volunteer/request creation, and `/api/translate` (which can carry a real per-call cost against a paid provider key) — simply by sending a different self-chosen `X-Forwarded-For` value on each request. | **High** — a working rate limiter that a direct, unauthenticated caller could fully bypass | **Fixed.** `trust proxy` now defaults to `false` (rate limiting falls back to the real socket address, which a client cannot forge) and is only enabled via a new `TRUST_PROXY` env var, documented in `server.js` with the exact value to use for a real reverse-proxy/tunnel deployment (`TRUST_PROXY=1`). Verified with a new test that proves the bypass existed and is now closed on both sides (default OFF vs. `TRUST_PROXY=1` ON): `server/test-reliability.js`. |
| 2 | `ipHits` rate-limit map | Each key's own hit-timestamp array self-trimmed to its window, but the **set of distinct keys** had no upper bound between 30-second cleanup sweeps — a caller cycling many distinct identifiers quickly enough could grow this map without limit. | Low (defense in depth; largely moot once #1 is fixed, since a spoofed-IP caller can no longer multiply its own key count) | **Fixed.** Added `IP_HITS_MAX_KEYS` (default 20000, env-overridable), enforced as a hard cap at insert time. `/api/health` now also reports `rateLimitKeys` so this is observable in operation, not just asserted. Verified in `server/test-reliability.js` with the cap set low (5) and 20 distinct identifiers sent. |
| 3 | No crash-safety or shutdown handling anywhere in `server.js` | No `uncaughtException`, `unhandledRejection`, `SIGTERM`, or `SIGINT` handler existed. One uncaught bug anywhere in the process (a bad WS frame, a surprise from the translate adapter) silently killed the **entire** server with no log trail, instantly dropping every concurrent session for every connected user with no warning to their browsers; the same was true of an ordinary deploy restart or `Ctrl-C`. | **High** — a single-process, in-memory-only backend (see finding 4) is already one crash away from losing every live conversation; having no handling at all for that case meant it also happened silently and without even a clean disconnect signal | **Fixed**, within what is feasible in-place (see finding 4 for why a bigger fix — surviving a crash with state intact — was deliberately not attempted). The server now logs the error/signal, sends every open WebSocket a clean, informative close frame (code 1012, "Server restarting. Please reopen this conversation.") so the client's existing reconnect/rejoin UI reacts immediately instead of guessing after a timeout, and then exits (with a 3s hard-exit safety net so shutdown itself cannot hang). Verified in `server/test-reliability.js` for both a real `SIGTERM` and a simulated uncaught exception. |
| 4 | Persistence (`/api/capabilities` already honestly reports `"persistence": "memory"`) | Session, volunteer, and assist-request state exists only in a process-local `Map` and is lost completely on any crash or restart. This is **named as deliberate** in the file's own top-of-file comment, for a real reason: private conversation text must never be written to disk. | Informational / by design, not a bug — but flagged because the user's instructions explicitly named "persistence" as an area to improve | **Audited, not changed.** Implementing real restart-survival would mean writing session bearer secrets (`hostKey`, `participantKey`, join tokens) to disk, which widens the attack surface in a way that was not possible to design, implement, and adequately test to the standard the rest of this backend is held to within this pass — and risks silently regressing the explicit no-disk-writes privacy guarantee if done carelessly. Given the instruction to "introduce larger architectural changes only where feasible," this was judged not feasible to do safely in this pass and is left as an explicit, open item (see below) rather than shipped half-tested. Finding 3's crash-safety fix is the responsible alternative within that constraint: an honest, immediate, clean failure instead of a silent one. |
| 5 | `originAllowed()` permits a WebSocket upgrade with **no** `Origin` header at all | Reviewed deliberately rather than assumed safe. The real access boundary for a session is the join/host/participant token, which a caller without a browser (curl, a native client) still needs regardless of Origin; Origin checking's actual purpose here is a second, narrower layer against a hostile *webpage* silently opening a socket using credentials a victim's browser already holds. | Low — intentional, already commented in the code | **Audited, not changed.** The design tradeoff is sound: a missing Origin does not grant access to anything a valid token wouldn't already grant. |
| 6 | Client-side rendering of server-supplied chat fields (`assets/connect.js`, `appendMessage`) | Checked directly for stored/reflected XSS, since every field here (message text, sender name, source label, original-language text) is attacker-controlled by design (any session participant can set it) and is broadcast live to other participants' browsers via `innerHTML`. | N/A (verification, not a bug) | **Checked, found safe.** `fromName`, `srcLabel` (including the translated-language tag, which embeds the attacker-influenced `lang` value before escaping), `text`, and `orig` are all passed through the existing `esc()` helper before being written into `innerHTML`. No change needed; recorded here so this was verified, not assumed. |
| 7 | CSP `style-src 'self' 'unsafe-inline'` | Noted as a known, bounded weakening of the otherwise strict CSP (script-src has no `'unsafe-inline'`, which is the XSS-relevant half). | Low | **Audited, not changed.** Removing it was not attempted in this pass without being able to exhaustively verify every inline `style=""` usage across the whole front end still works without it; flagged here rather than silently left undocumented. |

New regression coverage for this section: `server/test-reliability.js` (6 checks — trust-proxy bypass closed, rate-limit-key cap, clean `SIGTERM` shutdown, clean shutdown on a simulated uncaught exception), wired into `npm run test:reliability` and `npm run test:all`. See `TEST_REPORT.md` for the full run.

## Open problems carried forward (not resolved this phase, stated plainly)

These are real, unresolved gaps. They are listed here, in `TEST_REPORT.md`'s "Not verified" section, and in
`docs/SIGN_LANGUAGE_MODEL_EVALUATION.md`, rather than in only one place, so they cannot be missed:

1. No real Deaf ISL or ASL signer has used either pretrained model; no real-world accuracy figure exists for this
   build, only the original authors' own published test-split numbers (93.5% ISL / 30.6% ASL), which are marked
   `doNotQuoteAsSangamAccuracy` in both model manifests.
2. Both models are isolated-word recognisers. Neither performs sentence-level translation, and SANGAM does not
   claim otherwise anywhere in its UI or documentation.
3. No physical hardware (vibration motor, Braille display, switch device, two separate phones on a live call) has
   been tested; all are stand-ins in the automated suite, named explicitly in `TEST_REPORT.md`.
4. Regional/dialect coverage, skin tone, lighting and camera-angle bias for both the hand-tracking and the
   pretrained models are unmeasured.
5. Real alarm/doorbell/siren/horn audio recordings were not available in this environment; YAMNet's classification
   of synthetic tones was verified, real recordings were not tried.
6. Backend state (sessions, volunteers, assist requests) does not survive a crash or restart; see "Backend audit"
   above (finding 4) for why this was deliberately not built in this pass rather than overlooked, and what was
   done instead (finding 3: a clean, immediate failure rather than a silent one).
7. CSP `style-src` still carries `'unsafe-inline'`; see "Backend audit" above (finding 7). Not a known exploit,
   just an unremoved weakening that was not verified safe to remove within this pass.

## Cross-references

- Structural comparison of the three input ZIPs: `THREE_ZIP_COMPARISON.md`
- Full test results and category discipline: `TEST_REPORT.md`
- Sign-model licensing, verification method and accuracy figures: `docs/SIGN_LANGUAGE_MODEL_EVALUATION.md`
- The one test only a human can perform: `docs/LIVE_WEBCAM_TEST_PROCEDURE.md`
- How to install or reinstall either model: `docs/MODEL_INSTALLATION_GUIDE.md`
- Chronological list of changes: `CHANGELOG.md`
- Full narrative of what was built and how: `IMPLEMENTATION_REPORT.md`
