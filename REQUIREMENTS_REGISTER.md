# SANGAM requirements register

Every row was traced to code and, where it exists, to a named automated test. **Test column**: letter = suite, number = position of the passing check in that suite's log (see the *Test index* at the end for the exact test names). Status words come from a fixed vocabulary:

- **Implemented and automated-tested** — a test that does not need a person or a device passes.
- **Implemented and browser-tested** — checked in a real Chromium browser (Playwright), usually with two participants.
- **Implemented but awaiting physical-device testing** — code and browser stand-in tests exist; the real device (microphone, vibration motor, switch, second phone) was not available.
- **Partially implemented** — part of it works and is tested; the limitation column says what is missing.
- **Blocked by external dependency** — needs a service or key that was not available.
- **Not implemented** — not built (the limitation column says why).

**Original status** is what the foundation ZIP (SANGAM_Integrated_Final) actually did when inspected, using: Working, Partial, Label only (a button or word with nothing behind it), Missing, Planned-label (marked 'planned' in the UI).

> **Note added in the third integration pass.** This register was frozen at the end of the second pass and is kept
> as that pass's own record; it is not rewritten retroactively. Two rows below (R149, R150) describe a state that
> has since changed: a real pretrained ISL model (and a separate, download-on-request ASL model) is now installed
> and verified. For the current, accurate status of sign-language recognition, haptic presets, and the sound
> loudness fallback, see `docs/SIGN_LANGUAGE_MODEL_EVALUATION.md`, `THREE_ZIP_COMPARISON.md`, and
> `PROJECT_AUDIT_AND_PROBLEM_REGISTER.md` rather than this file.

> **Note added in the fifth integration pass (backend audit).** The same applies, more so, to the *Test index*
> section below: it records each suite's check count as it stood at the end of the second pass, and per this file's
> own stated policy it is not rewritten retroactively. Several of those suites have since grown — `test-sound-engine.js`
> (listed here as 46, now 63: the P4-derived loud-sound fallback checks added in the third pass),
> `test-access-browser.js` (listed as 75, now 87: the haptic preset-switch checks added in the third pass),
> `test-sign-browser.js` (listed as 121, now 138: the camera-aspect and pose-model regression checks added in the
> fourth pass), and `test-sound-browser.js` (listed as 89, now 106: the third pass's loud-fallback browser checks).
> Three entire suites did not exist when this index was written and so are not in it at all:
> `test-sign-model.js` (real-weight model-inference parity, added third pass, 26 ISL-only / 37 with ASL installed),
> `test-sign-video.js` (Category C real-video-file mechanics harness, added fourth pass, 7 checks), and
> `server/test-reliability.js` (trust-proxy/rate-limit/crash-safety regression checks, added fifth pass, 6 checks).
> **`TEST_REPORT.md` is the authoritative, current source for every suite's actual count** — read it, not the
> numbers in the Test index below, for anything written after the second pass.

## Summary

| Final status | Rows |
|---|---|
| Implemented and automated-tested | 44 |
| Implemented and browser-tested | 90 |
| Implemented but awaiting physical-device testing | 16 |
| Partially implemented | 12 |
| Blocked by external dependency | 4 |
| Not implemented | 1 |
| Delivered (a deliverable, not a feature) | 5 |
| **Total** | **172** |

Nothing in this register was moved from "Planned" to "Complete" by relabelling: every row whose original status was Missing, Label only or Planned-label has code behind it, or is listed as Partially implemented / Not implemented / Blocked with the reason.

## Register

| ID | Area | Requirement | Original status | Final status | Implementation location | Test performed | Remaining limitation |
|---|---|---|---|---|---|---|---|
| R01 | Dashboard | Access profile panel | Partial | Implemented and browser-tested | assets/app.js (profile), assets/outputs.js | B147-B154 | Stored per device only, by design. |
| R02 | Dashboard | Speak and caption panel | Partial | Implemented but awaiting physical-device testing | assets/app.js (voice), index.html #mic/#voiceSend | B29-B42 | Tested with a stand-in speech engine. A real microphone and the browser's speech service were not available. |
| R03 | Dashboard | Read from a photo panel | Partial | Implemented and browser-tested | assets/app.js (OCR), vendor/tesseract | B54-B68, I7-I8 | The test photo is a generated image, not a camera photo. English only. |
| R04 | Dashboard | Phrase board panel | Partial | Implemented and browser-tested | assets/app.js (phrase board) | B43-B53 | — |
| R05 | Dashboard | Text messages panel | Partial | Implemented and browser-tested | assets/connect.js (outbox + state machine) | B1-B16, B69-B73 | — |
| R06 | Dashboard | Connect and chat panel | Working | Implemented and browser-tested | assets/connect.js, server/server.js | E1-E11, B1-B16 | — |
| R07 | Dashboard | SANGAM Learn panel | Working | Implemented and automated-tested | assets/learn.js (unchanged content) | A9, A57 | Only accessibility and touch-target checks cover it; its content was preserved, not re-reviewed. |
| R08 | Dashboard | Human assistance panel | Working | Implemented and automated-tested | assets/assist.js, server/server.js | S20-S38, E14-E17, B160-B161 | — |
| R09 | Dashboard | What comes next panel | Planned-label | Implemented and browser-tested | assets/next.js | B155-B159, A11 | Statuses are written by hand and must be updated when testing changes. |
| R10 | Dashboard | Emergency | Partial | Implemented and browser-tested | assets/emergency.js, server/server.js | B74-B88, F25-F28 | Does not contact emergency services (and says so). |
| R11 | Input | Voice input mode | Working | Implemented but awaiting physical-device testing | assets/app.js | B29-B42 | Stand-in speech engine only. |
| R12 | Input | Camera / photo input mode | Partial | Implemented and browser-tested | assets/app.js, index.html #file | B54-B68 | File chooser only (on a phone the OS may offer the camera). No in-page live camera capture is claimed. |
| R13 | Input | Text input mode | Working | Implemented and browser-tested | assets/connect.js, assets/app.js | B8-B16 | The character counter is not asserted by a test. |
| R14 | Input | Switch input mode | Label only | Implemented but awaiting physical-device testing | assets/switch.js | B130-B139 | Tested with a keyboard only. No physical switch was available. |
| R15 | Output | Spoken output | Working | Implemented and automated-tested | assets/app.js speak(), assets/outputs.js | I1-I5, B140-B144 | Tested against a stand-in speech engine. How it sounds depends on the device's voices. |
| R16 | Output | Caption output | Working | Implemented and browser-tested | assets/outputs.js, assets/connect.js | B22, B32 | — |
| R17 | Output | Haptic output | Partial | Implemented but awaiting physical-device testing | assets/outputs.js | B20, B114-B120 | Timing checked against a stand-in vibration API. No physical vibration motor was available. |
| R18 | Output | Braille output | Partial | Implemented and browser-tested | assets/outputs.js, assets/app.js (brailleDetail) | B21, B121-B129 | On-screen preview only. See R91. |
| R19 | Profile | Input checkboxes have visible effect | Partial | Implemented and browser-tested | assets/app.js (applyProfile) | B147-B151 | — |
| R20 | Profile | Output checkboxes have visible effect | Partial | Implemented and browser-tested | assets/outputs.js, assets/connect.js | B27, B152 | — |
| R21 | Profile | Text scale 100 to 160 percent | Working | Implemented and browser-tested | assets/styles.css, assets/app.js | B145, A69 | — |
| R22 | Profile | Speech rate | Working | Implemented and browser-tested | assets/app.js speak() | B143 | — |
| R23 | Profile | Language (incl. Odia entry with capability notes) | Partial | Partially implemented | assets/translate.js, server/translate.js | B92-B96, B104-B105, F46-F47, F57 | Language support is reported separately for recognition, translation, voice and script display. Odia is not claimed to work end to end (see R80). |
| R24 | Profile | High contrast | Working | Implemented and browser-tested | assets/styles.css (html.hc) | B146, A19-A21 | — |
| R25 | Profile | Emergency message text | Working | Implemented and browser-tested | assets/emergency.js, index.html | B74 | — |
| R26 | Profile | Per-participant profile separation | Missing | Implemented and browser-tested | assets/connect.js, server/server.js | B17-B19, F8-F9 | — |
| R27 | Profile | Sensitive settings never broadcast | Working (untested) | Implemented and automated-tested | server/server.js, assets/connect.js | B17, F7-F9 | — |
| R28 | Voice | Mic never auto-starts; explicit start/stop | Working | Implemented and browser-tested | assets/app.js | B29-B30, B106 | — |
| R29 | Voice | en-IN to en-US fallback preserved | Working | Implemented and automated-tested | assets/app.js recognition setup | I6 | Locale fallback tested with a stand-in engine. |
| R30 | Voice | Continuous restart + user-stop + terminal-error protection | Working | Implemented and browser-tested | assets/app.js recognition handlers | B40-B42 | Only the user-stop and error-message branches are exercised. The long-session restart and terminal-error branches are foundation code that is preserved but was not tested over a real recognition session. |
| R31 | Voice | Transcript review/edit/confirm before sending | Missing | Implemented and browser-tested | assets/app.js, index.html (#voiceReview) | B31-B39 | — |
| R32 | Voice | Never auto-send transcripts | Working (by absence) | Implemented and browser-tested | assets/app.js | B33-B34 | — |
| R33 | Voice | Clear permission-denied / unsupported messages | Partial | Implemented and browser-tested | assets/app.js | B41-B42 | — |
| R34 | OCR | Preprocessing preserved | Working | Implemented and automated-tested | assets/app.js (prepImageForOcr) | I7-I8 | Preprocessing is preserved; there is no separate test of the preprocessing step itself. |
| R35 | OCR | Bundled Tesseract works offline | Working | Implemented and automated-tested | vendor/tesseract, CSP in server/server.js | I7-I8, B58, F3 | — |
| R36 | OCR | File type and size validation | Missing | Implemented and browser-tested | assets/app.js | B55-B57 | — |
| R37 | OCR | Progress and failure states | Partial | Implemented and browser-tested | assets/app.js | B68, I7 | — |
| R38 | OCR | Confidence display | Missing | Implemented and browser-tested | assets/app.js | B59 | — |
| R39 | OCR | Replace and remove photo | Missing | Implemented and browser-tested | assets/app.js | B64-B67 | — |
| R40 | OCR | Copy extracted text | Missing | Implemented and browser-tested | assets/app.js | B60 | — |
| R41 | OCR | Read extracted text aloud | Partial | Implemented and browser-tested | assets/app.js, assets/outputs.js | B61 | — |
| R42 | OCR | Send extracted text to chat after review | Missing | Implemented and browser-tested | assets/app.js, assets/connect.js | B62-B63 | — |
| R43 | OCR | English-only note | Missing | Implemented and browser-tested | index.html | B54 | — |
| R44 | OCR | OCR provenance visible in chat | Missing | Implemented and automated-tested | server/server.js (source whitelist) | F20-F21, B63 | — |
| R45 | Phrase | Tiles speak aloud | Working | Implemented and automated-tested | assets/app.js | I1, B43 | — |
| R46 | Phrase | Draft review/edit | Partial | Implemented and browser-tested | assets/app.js | B44 | — |
| R47 | Phrase | No accidental duplicate sends | Missing | Implemented and browser-tested | assets/app.js | B47-B49 | The guard is a 10-second window on identical text. |
| R48 | Phrase | Send phrase draft to chat | Missing | Implemented and browser-tested | assets/app.js | B45-B46 | — |
| R49 | Phrase | Custom phrases saved locally | Missing | Implemented and browser-tested | assets/app.js (localStorage) | B50-B53 | Stored on the device only. |
| R50 | Messages | Composer with counter | Working | Implemented and browser-tested | assets/connect.js | B8-B16 | Counter not asserted by a test. |
| R51 | Messages | Accurate delivery states | Missing | Implemented and browser-tested | assets/connect.js | B1-B16 | — |
| R52 | Messages | Draft kept on disconnect | Missing | Implemented and browser-tested | assets/connect.js | B8-B9 | — |
| R53 | Messages | Retry and pending queue | Partial | Implemented and browser-tested | assets/connect.js | B11-B16 | — |
| R54 | Messages | No false 'delivered' claim | Missing | Implemented and automated-tested | server/server.js, assets/connect.js | F12-F13, B2, B5 | — |
| R55 | Messages | Server dedupes retried messages | Missing | Implemented and automated-tested | server/server.js (cid) | F17-F19, B13, B16 | — |
| R56 | Chat | QR create and join | Working | Implemented and automated-tested | server/server.js, assets/connect.js | S2-S4, E1-E3 | — |
| R57 | Chat | Presence | Working | Implemented and automated-tested | server/server.js | E4 | — |
| R58 | Chat | Typing indicator | Working | Implemented and automated-tested | server/server.js, assets/connect.js | E8 | — |
| R59 | Chat | Turn control with authorization | Working | Implemented and automated-tested | server/server.js | S14-S15, E6, E11 | — |
| R60 | Chat | Clarification chips | Working | Implemented and automated-tested | assets/connect.js | E10 | — |
| R61 | Chat | Read-aloud toggle default off | Working | Implemented and browser-tested | assets/connect.js, assets/outputs.js | B24-B25, B28 | — |
| R62 | Chat | Reconnect with pid+pkey | Working | Implemented and automated-tested | server/server.js, assets/connect.js | S13, S40, B6-B7, B14-B16 | — |
| R63 | Chat | Session end handling | Working | Implemented and automated-tested | server/server.js, assets/connect.js | S17-S19, E13 | — |
| R64 | Chat | Peer delivery acknowledgement | Missing | Implemented and automated-tested | server/server.js, assets/connect.js | F12-F16, B2 | — |
| R65 | Chat | Message provenance label (voice/OCR/phrase/translated) | Missing | Implemented and browser-tested | assets/connect.js | F11, F21-F22, B36, B46, B63, B103 | — |
| R66 | TTS | speak() caching/resume/fallback/onerror preserved | Working | Implemented and automated-tested | assets/app.js speak() | I1-I5 | — |
| R67 | TTS | Stop control | Missing | Implemented and browser-tested | assets/outputs.js | B141 | — |
| R68 | TTS | Repeat last | Missing | Implemented and browser-tested | assets/outputs.js | B140 | — |
| R69 | TTS | Voice selection | Missing | Implemented and browser-tested | assets/outputs.js | B143 | Only voices installed on the device are offered; an Odia voice is usually absent. |
| R70 | TTS | Rate control | Working | Implemented and browser-tested | assets/app.js | B143 | — |
| R71 | TTS | No overlapping utterances | Working | Implemented and automated-tested | assets/app.js speak() | I3, B142 | — |
| R72 | TTS | Auto-read only when enabled | Working | Implemented and browser-tested | assets/outputs.js, assets/connect.js | B24-B25, B28 | — |
| R73 | Voice-to-voice | Mode A: transformed messaging (voice->text->peer output) | Missing | Implemented and browser-tested | assets/app.js, assets/connect.js, assets/outputs.js | B20-B23, B31-B37 | Text-based, reviewed by the sender; the other person's device renders it by their own profile. |
| R74 | Voice-to-voice | Mode B: live WebRTC voice | Planned-label | Implemented but awaiting physical-device testing | assets/live.js, server/server.js (rtc relay) | B106-B113, F35-F40 | Tested between two browser sessions on one computer with a test audio source. Not tested on two separate devices, across networks, or through a TURN server. |
| R75 | Translation | Provider abstraction | Missing | Implemented and automated-tested | server/translate.js | F42-F60 | Tested against a local stand-in provider. No call to a real LibreTranslate or Google service was made. |
| R76 | Translation | Credentials server-side env vars only | Missing | Implemented and automated-tested | server/translate.js, server/server.js | F50, F56, F58, B162 | — |
| R77 | Translation | Clear message when unconfigured; no fake output | Missing | Implemented and browser-tested | server/server.js, assets/translate.js | F42, B89-B92, B159 | — |
| R78 | Translation | Source/target/original/translated visible and editable | Missing | Blocked by external dependency | assets/translate.js | B97-B103 | The card, editing and send flow work against a local stand-in provider. Translation quality and the real provider path are blocked: no provider credentials were available. |
| R79 | Translation | Language capability checks | Missing | Implemented and browser-tested | assets/translate.js, server/translate.js | B92-B96, B104-B105, F46-F47, F57 | — |
| R80 | Translation | Odia claimed only after full-path test | Missing | Partially implemented | assets/translate.js | B92-B95, B104 | Odia is deliberately NOT claimed as working: no provider that lists it, no Odia recognition, and no Odia voice were available to test. Interface and script-display handling exist. |
| R81 | Translation | Hindi claimed only after full-path test | Partial | Partially implemented | assets/translate.js | B96, B105, F46 | Hindi is reported only as far as the provider lists it and the device has a voice. No real provider or device recognition was available to test. |
| R82 | Translation | Translated provenance label | Missing | Implemented and browser-tested | assets/connect.js | B103, F22 | — |
| R83 | Translation | Failure handling (timeout, provider error) | Missing | Implemented and automated-tested | server/translate.js | F52-F54, F59 | — |
| R84 | Haptic | Semantic patterns YES NO HELP EMERGENCY INFORMATION RECEIVED SENT CONNECTION LOST | Missing | Implemented but awaiting physical-device testing | assets/outputs.js | B114-B117 | Pattern timing only; no vibration motor was available. |
| R85 | Haptic | Test, stop, description per pattern | Missing | Implemented but awaiting physical-device testing | assets/outputs.js | B115-B118 | — |
| R86 | Haptic | Unsupported device detection | Partial | Implemented and browser-tested | assets/outputs.js | B120 | — |
| R87 | Haptic | No false intensity slider | Working | Implemented and browser-tested | assets/outputs.js | B119 | — |
| R88 | Haptic | Emergency not vibration-only | Partial | Implemented and browser-tested | assets/emergency.js | B79, A18 | — |
| R89 | Braille | Preview improved | Partial | Implemented and browser-tested | assets/app.js (brailleDetail), assets/outputs.js | B121-B127 | — |
| R90 | Braille | Honesty: not Grade 2, not a physical display | Partial | Implemented and browser-tested | assets/outputs.js | B128-B129 | — |
| R91 | Braille | Physical-device adapter boundary | Missing | Partially implemented | assets/outputs.js (SangamBraille.register), docs/BRAILLE_DEVICE_ADAPTER.md | B129 | Only a registration hook exists and nothing sends to it. No driver, no hardware test. |
| R92 | Braille | Verification procedure for hardware | Missing | Partially implemented | docs/BRAILLE_DEVICE_ADAPTER.md | — | The procedure is written down. It has not been performed because no display was available. |
| R93 | Braille | Received messages rendered in Braille preview | Missing | Implemented and browser-tested | assets/outputs.js | B21 | — |
| R94 | Switch | Keyboard-only operation of every feature | Partial | Partially implemented | assets/*.js, assets/styles.css | A34-A48, B130-B139 | Keyboard reachability and focus visibility were tested on five panels; the chat, Connect, Learn and Assist panels were exercised with a keyboard only where other tests happen to do so. |
| R95 | Switch | Scanning mode | Label only | Implemented but awaiting physical-device testing | assets/switch.js | B130-B139 | Keyboard stand-in only. |
| R96 | Switch | No hardware compatibility claim | Working | Implemented and browser-tested | assets/switch.js, index.html | B133 | — |
| R97 | Emergency | Review/confirm before sending | Missing | Implemented and browser-tested | assets/emergency.js | B74-B75 | — |
| R98 | Emergency | Send via active session | Missing | Implemented and automated-tested | assets/emergency.js, server/server.js | F25, B77 | — |
| R99 | Emergency | Unmistakable recipient indicator | Missing | Implemented and browser-tested | assets/emergency.js | B74, B77-B78 | — |
| R100 | Emergency | Acknowledgement visible to sender | Missing | Implemented and automated-tested | server/server.js, assets/emergency.js | F26-F28, B83 | — |
| R101 | Emergency | Honest failure state | Missing | Implemented and browser-tested | assets/emergency.js | B82, B85 | — |
| R102 | Emergency | Alternative when no session | Missing | Implemented and browser-tested | assets/emergency.js | B85-B88 | The dialer link only opens the device's dialer; SANGAM places no call. |
| R103 | Emergency | No claim of contacting emergency services | Partial | Implemented and browser-tested | assets/emergency.js, index.html | B76, B88 | — |
| R104 | Emergency | Not only sound/colour/vibration | Partial | Implemented and browser-tested | assets/emergency.js | B79-B80, A18 | — |
| R105 | A11y | Skip link | Missing | Implemented and browser-tested | index.html, assets/styles.css | A22-A23 | — |
| R106 | A11y | Landmarks and headings | Partial | Implemented and browser-tested | index.html | A1-A21, A24-A25 | — |
| R107 | A11y | Dialog focus trap/return | Partial | Implemented and browser-tested | assets/connect.js, assets/emergency.js | A31-A33, B84 | — |
| R108 | A11y | aria-live tuning | Partial | Partially implemented | index.html, assets/*.js | A1-A21 | No automated tool can judge announcement quality. aria-live regions were set up and axe-checked, but no screen reader was available to listen to them. |
| R109 | A11y | Reduced motion | Partial | Implemented and browser-tested | assets/app.js, assets/styles.css | A70-A74 | — |
| R110 | A11y | 44px touch targets | Partial | Implemented and browser-tested | assets/styles.css | A49-A59 | — |
| R111 | A11y | 200% zoom / reflow | Missing | Implemented and browser-tested | assets/styles.css | A69 | Checked at 200% zoom plus 160% text scale in a desktop browser. |
| R112 | A11y | Responsive nav aria-expanded/controls | Working | Implemented and browser-tested | index.html, assets/app.js | A26-A30 | — |
| R113 | A11y | Colour contrast | Partial | Implemented and browser-tested | assets/styles.css | A1-A21, B146 | Axe cannot judge text over gradients perfectly; high-contrast mode is checked by a measured 7:1 test. |
| R114 | A11y | Icon-only controls labelled | Partial | Implemented and browser-tested | index.html, assets/*.js | A1-A21 | — |
| R115 | Responsive | 320/360/390/768/1024/1440/1920 px | Missing | Implemented and browser-tested | assets/styles.css | A60-A68 | No horizontal overflow checked at nine viewports; layout beauty at each was reviewed in screenshots only at 1440, 1920 and 390 wide. |
| R116 | Backend | Session tokens | Working | Implemented and automated-tested | server/server.js | S5, S8, S11-S13 | — |
| R117 | Backend | Rate limits | Working | Implemented and automated-tested | server/server.js | S16, F60 | — |
| R118 | Backend | Origin checks | Working | Implemented and automated-tested | server/server.js originAllowed() | F62-F63 | This test was added in this integration; the check itself is preserved unchanged. |
| R119 | Backend | Turn authorization | Working | Implemented and automated-tested | server/server.js | S14-S15 | — |
| R120 | Backend | hostKey secrecy | Working | Implemented and automated-tested | server/server.js | S11, S17, F8 | — |
| R121 | Backend | No-store on sensitive APIs | Working | Implemented and automated-tested | server/server.js | F6, F61 | — |
| R122 | Backend | Persistence decision | Partial | Not implemented | README.md, GET /api/capabilities (persistence: memory) | — | By design: nothing is written to disk and conversations vanish at session end or restart. This is documented, not hidden. |
| R123 | Backend | Session TTL and cleanup | Working | Implemented and automated-tested | server/server.js | S18-S19, S40 | The 60-minute expiry itself was not waited out by a test. |
| R124 | Backend | Health route | Working | Implemented and automated-tested | server/server.js | S1, F4-F5 | — |
| R125 | Backend | Volunteer auth | Working | Implemented and automated-tested | server/server.js | S20-S37 | — |
| R126 | Backend | Volunteers not implied to be interpreters | Partial | Implemented and browser-tested | assets/assist.js | B160-B161 | — |
| R127 | Backend | Error handling matrix (WS closed, mic denied, OCR fail, etc.) | Partial | Partially implemented | assets/*.js, server/server.js | B11, B14, B41, B68, B144, F52-F54, F59 | Covered: connection lost, microphone blocked, bad photo, no speech support, translation failures. Not covered: microphone denied during a live call, clipboard denied. |
| R128 | Privacy | No API keys in frontend | Working | Implemented and automated-tested | assets/*.js | B162 | A static scan of the shipped frontend files. |
| R129 | Privacy | No sensitive prefs in presence/QR/session names/logs | Working (untested) | Implemented and automated-tested | server/server.js, assets/connect.js | B17, F7-F9 | Server logs were reviewed by reading the code, not by an automated test. |
| R130 | Privacy | Security headers | Partial | Implemented and automated-tested | server/server.js | F1-F3 | — |
| R131 | Design | Atelier identity preserved | Working | Partially implemented | assets/styles.css, index.html | — | Judged by viewing screenshots; there is no automated visual-regression tool. |
| R132 | Design | No external font dependency | Partial | Implemented and browser-tested | index.html | B163 | — |
| R133 | Testing | Existing three suites keep passing | Working | Implemented and automated-tested | server/smoke-test.js, test-e2e.js, test-integration-fixes.js | S1-S43, E1-E18, I1-I9 | All 70 original checks pass. |
| R134 | Testing | New automated tests | Missing | Implemented and automated-tested | server/test-features.js, test-browser.js, test-a11y.js | — | Original new suites: 63 + 164 + 75 (see the second-pass rows below for the sign, sound and access suites). |
| R135 | Testing | Genuine screenshots | Missing | Delivered (a deliverable, not a feature) | screenshots/ | — | 22 real browser captures with viewport sizes in screenshots/README.md. Speech and vibration were stand-ins when captured. |
| R136 | Deliverable | Clean ZIP | Missing | Delivered (a deliverable, not a feature) | SANGAM_Complete_Implementation.zip | — | Integrity checked with unzip -t, then the whole suite was re-run from a clean extract (see TEST_REPORT.md). |
| R137 | Deliverable | Reports and docs | Partial | Delivered (a deliverable, not a feature) | README.md, REQUIREMENTS_REGISTER.md, IMPLEMENTATION_PLAN.md, INTEGRATION_REPORT.md, TEST_REPORT.md, CHANGELOG.md, docs/ | — | — |
| R138 | Sign Language Camera | Dashboard entry, modal dialog, consent notice; camera never starts on its own | Missing | Implemented but awaiting physical-device testing | index.html #signDlg, assets/sign.js | C1, C5, C8-C19, C26-C27 | Tested with Chromium's built-in fake camera only. No real camera or person was involved. |
| R139 | Sign Language Camera | Camera lifecycle: video only, mirrored, uncropped preview; start, stop, track release on close/Escape/navigation/pagehide/unplug | Missing | Implemented but awaiting physical-device testing | assets/sign.js startCamera()/stopCamera() | C20-C25, C28-C35 | Fake camera device. Behaviour on real phones (front/back switching, OS permission sheets) not verified. |
| R140 | Sign Language Camera | Permission and device errors: denied, none found, busy, constraints, insecure page, no API | Missing | Implemented and browser-tested | assets/sign.js | C39-C49 | Errors are simulated by overriding getUserMedia; real browser permission prompts are not exercised. |
| R141 | Sign Language Camera | Hand tracking runs locally (vendored MediaPipe Hands), loads lazily, failure leaves camera usable | Missing | Implemented but awaiting physical-device testing | vendor/mediapipe/hands, assets/sign.js | C55-C64 | The real tracker ran in Chromium on the fake camera's picture (no hands in it). Tracking accuracy on real hands was not tested. |
| R142 | Sign Language Camera | Recogniser language list shows only real adapters; ISL unavailable; ASL never labelled ISL | Missing | Implemented and browser-tested | assets/sign.js recognisers() | C3, C6-C7, C50-C54 | — |
| R143 | Sign Language Camera | Personal sign teaching and matching (record at least 2 examples, delete, forget all) | Missing | Implemented but awaiting physical-device testing | assets/sign-engine.js PersonalAdapter, assets/sign.js | G6-G17, C65-C72, C87 | Matching is tuned and tested on synthetic hand skeletons. 30 of 30 synthetic variations were recognised; that is not an accuracy figure for real signers. |
| R144 | Sign Language Camera | Segmentation, duplicate suppression, unknown and ambiguous results rejected, "Sign not recognised clearly. Please repeat." | Missing | Implemented and automated-tested | assets/sign-engine.js Segmenter/Stabiliser | G18-G28, C73-C82 | Thresholds were chosen against synthetic data. |
| R145 | Sign Language Camera | Editable transcript: partial vs final, undo, clear, copy, confirm, speak, stop speaking; no auto-speak | Missing | Implemented and browser-tested | assets/sign.js | C81-C86, C88-C98 | Speech used a stand-in. |
| R146 | Sign Language Camera | Send through existing chat with accurate provenance (source=sign, via=personal); never auto-sent; no frames or landmarks on the wire | Missing | Implemented and browser-tested | assets/sign.js, assets/connect.js, server/server.js (sign source whitelist) | C99-C113 | Two browser participants on one machine. |
| R147 | Sign Language Camera | Privacy: no camera data to any server, nothing recorded; taught signs stored on device as numbers only | Missing | Implemented and browser-tested | assets/sign.js, CSP in server/server.js | C4, C36-C37, C63, C71, C111-C113 | Taught signs persist in localStorage until deleted (Forget all, or Profile > Your data). |
| R148 | Sign Language Camera | Accessibility of the dialog (axe, focus, 320 px, live regions) | Missing | Implemented and browser-tested | index.html, assets/styles.css | C10-C17, C117-C121 | No screen reader was used. |
| R149 | Sign Language Camera | Indian Sign Language pretrained model | Missing | Blocked by external dependency | vendor/sign-models/README.md, docs/SIGN_LANGUAGE_MODEL_RESEARCH.md | — | No suitably licensed, obtainable ISL model. INCLUDE is a dataset (CC BY-NC-SA noted by a derived dataset page) hosted where the build network was blocked. Nothing was trained or claimed. |
| R150 | Sign Language Camera | Model package slot validates manifest (licence, dataset, evaluation), vocabulary and template shape | Missing | Implemented and automated-tested | assets/sign-engine.js TemplateAdapter | G29-G33 | No real package exists to load. |
| R151 | Sound alerts | Real YAMNet model, offline, self-checked at load; wrong labels refused | Missing | Implemented and browser-tested | vendor/yamnet, vendor/mediapipe/audio, assets/sound.js | D13-D16, D84, H1-H5 | The tflite came from a third-party npm repack because Google's host was blocked; behaviour matches YAMNet but bytes are not proven Google's (swap steps in vendor/yamnet/README.md). |
| R152 | Sound alerts | Detection of alarm types with confidence; no alert for silence or noise | Missing | Implemented but awaiting physical-device testing | assets/sound-engine.js, assets/sound.js | D17-D27, H28-H29 | Tested with synthetic tones only. A smoke-alarm-style beep is detected. Real recordings of fire alarms, doorbells, sirens and horns were not available, so real-world detection and false-alarm rates are unknown. |
| R153 | Sound alerts | Onset-only alerts, cooldown, hysteresis, no repeats for continuous sound, later alarm alerts again | Missing | Implemented and automated-tested | assets/sound-engine.js Detector | D28-D32, H30-H46 | — |
| R154 | Sound alerts | Visible alert with sound name and confidence, history, dismiss/clear; optional flash, vibration, speech | Missing | Implemented and browser-tested | assets/sound.js, index.html #soundAlert | D33-D45 | Vibration used a stand-in. Spoken alert off by default. |
| R155 | Sound alerts | Sensitivity and sound-type preferences remembered; only settings stored; preview alerts clearly simulated | Missing | Implemented and browser-tested | assets/sound.js | D9-D11, D46-D53 | Sensitivity values are raw uncalibrated score thresholds. |
| R156 | Sound alerts | Microphone permission, on/off, track release, loss, pagehide; error states; echo cancellation off | Missing | Implemented but awaiting physical-device testing | assets/sound.js | D54-D83 | Chromium fake microphone. Real mic behaviour, phones in pockets and background tabs not verified. |
| R157 | Sound alerts | Privacy: nothing recorded, stored or uploaded; model, runtime and labels served locally | Missing | Implemented and browser-tested | assets/sound.js, CSP | D3, D15-D16, D63-D65 | — |
| R158 | Sound alerts | Panel accessibility (axe, keyboard, 44 px, 320 px, reduced motion) | Missing | Implemented and browser-tested | assets/styles.css | D85-D89 | — |
| R159 | Braille | Incoming messages and sound alerts routed to connected display adapters, wrapped to the display width | Partial | Partially implemented | assets/outputs.js SangamBraille | K1-K19 | Verified only against a TEST-ONLY JavaScript adapter. No real display driver exists and no hardware test was possible. |
| R160 | Braille | Physical Braille display (real device) | Missing | Blocked by external dependency | docs/BRAILLE_DEVICE_ADAPTER.md | — | Needs a real display and its protocol. Procedure for verification is documented, not performed. |
| R161 | Delivery | Honest limited-delivery receipt ("may not have reached ...") without revealing the receiver's channels | Missing | Implemented and browser-tested | assets/connect.js, assets/outputs.js deliver(), server/server.js presented | K20-K28, F29-F34 | Two browser participants plus server tests. "Delivered" only means the other device confirmed; it never proves the person perceived the message. |
| R162 | Haptics | Ten patterns (adds Call incoming and Alert), per-pattern on/off, pulse-length scaling, Test/Stop, descriptions | Working | Implemented but awaiting physical-device testing | assets/outputs.js | K28-K38, B114 | Stand-in vibration API. Browsers offer no real intensity control, so none is claimed. The existing test that listed eight meanings was updated to ten because the specification added two; it was not weakened. |
| R163 | Deafblind | Optional preset (Braille, haptic, captions, larger text, high contrast, confirm-before-send) with Undo; no diagnosis | Missing | Partially implemented | assets/access.js, docs/DEAFBLIND_VALIDATION_PLAN.md | K39-K47 | Implementation under validation. Not co-designed with or tested by deafblind people. |
| R164 | Accessibility | Confirm before sending (reads back, second press sends) | Missing | Implemented and browser-tested | assets/connect.js, assets/access.js | K48-K52 | — |
| R165 | Accessibility | Status announcement levels (everything, important, alerts only); alarms never silenced | Missing | Implemented and browser-tested | assets/app.js, assets/access.js | K53-K59 | No screen reader was used; procedure in docs/ACCESSIBILITY_GUIDE.md is not yet performed. |
| R166 | Accessibility | Switch scanning options: auto on/off, pause after N passes, speak highlighted item | Partial | Implemented but awaiting physical-device testing | assets/switch.js | K69-K74 | Keyboard-driven. No switch hardware was available. |
| R167 | Privacy | Your data on this device: export and two-step delete; chats never stored; session-only default documented | Missing | Implemented and browser-tested | assets/access.js, docs/ACCESSIBILITY_GUIDE.md | K60-K68 | Deletion clears SANGAM keys only. Optional message persistence was deliberately not added. |
| R168 | Translation | Capability matrix and configuration documented; EN/HI/OD stated as not verified | Partial | Blocked by external dependency | docs/TRANSLATION.md, .env.example | F4-F5 | No provider key was available. Hindi and Odia end to end remain unverified. |
| R169 | Accessibility | Error-handling matrix and screen-reader validation procedure documented | Partial | Partially implemented | docs/ACCESSIBILITY_GUIDE.md | C39-C49, D73-D83 | The screen-reader procedure is written but has not been performed. |
| R170 | Testing | New automated and browser suites for the second integration pass | Missing | Implemented and automated-tested | test-sign-engine.js, test-sound-engine.js, test-sign-browser.js, test-sound-browser.js, test-access-browser.js, server/test-features.js | — | Counts are reported by category in TEST_REPORT.md: they mix real-model, fake-device and stand-in results and must not be read as one pass rate. |
| R171 | Testing | Genuine screenshots of the new features | Missing | Delivered (a deliverable, not a feature) | screenshots/ | — | Real Chromium captures. Sign camera shots use the fake camera and mock hands (banner visible). |
| R172 | Deliverable | Second-pass reports and docs (sign camera, research, sound, translation, deafblind plan, Braille, accessibility) | Partial | Delivered (a deliverable, not a feature) | docs/, README.md, INTEGRATION_REPORT.md, TEST_REPORT.md, CHANGELOG.md | — | — |

## Test index

Position numbers are per suite. Suites added in the second integration pass (G, H, K, C, D) are separate from the original suites (S, F, E, I, B, A). The groups differ in what they prove: see TEST_REPORT.md.

### S — `server/smoke-test.js` (43 passing checks)

- S1: health endpoint ok
- S2: create session  (rmxbgsqwhgzs)
- S3: QR data URL present
- S4: session lookup with valid token
- S5: session lookup rejects bad token
- S6: host welcome returns host role
- S7: guest welcome returns guest role
- S8: welcome includes a participantKey
- S9: host → guest message delivered
- S10: guest → host message delivered
- S11: wrong hostKey is rejected (4003)  (close code 4003)
- S12: pid impersonation does not grant another participant's identity  (closed_before_welcome)
- S13: guest reconnect with pkey keeps same pid
- S14: non-turn-holder cannot pass the turn
- S15: turn-holder CAN pass the turn
- S16: WS message flood trips rate limit
- S17: end with WRONG hostKey is 403
- S18: end with correct hostKey works
- S19: ended session no longer joinable
- S20: volunteer list requires auth
- S21: assist request created (pending)
- S22: volunteer provisioned
- S23: wrong volunteerKey is 401
- S24: authed volunteer sees pending request
- S25: first accept succeeds and returns joinUrl + hostKey
- S26: second accept rejected with 409
- S27: accepted request hidden from other volunteers
- S28: accepting volunteer still sees request in their list
- S29: owner sees accepted + join link
- S30: complete without any auth is 403
- S31: complete by wrong volunteer is 403
- S32: complete by accepting volunteer succeeds
- S33: cancel with wrong claimKey is 403
- S34: cancel with correct claimKey succeeds
- S35: volunteer decline returns 200
- S36: declined request hidden from declining volunteer
- S37: declined request still visible to other volunteers
- S38: volunteer created with profile fields
- S39: volunteer profile update works
- S40: reconnect within grace keeps participant slot
- S41: turn claim succeeds when turn is null
- S42: claim rejected when turn already held
- S43: empty/whitespace message silently dropped

### F — `server/test-features.js` (63 passing checks)

- F1: page sends a Content-Security-Policy
- F2: page sends nosniff and no-referrer
- F3: CSP allows the bundled OCR engine (wasm + blob worker)
- F4: capabilities reports translation NOT configured by default
- F5: capabilities never contains a credential
- F6: capabilities is not cached
- F7: join URL carries only session id and token (no profile or key)
- F8: public session view exposes no hostKey or token
- F9: roster/presence carry only pid, name, role, connected
- F10: sender receives its own message back with the client id (server confirmation)
- F11: provenance 'voice' is stored and relayed
- F12: no 'delivered' before the recipient acknowledges
- F13: sender cannot acknowledge its own message
- F14: recipient ack produces a 'delivered' frame to the sender only
- F15: ack for an unknown message is ignored
- F16: history records who has acknowledged (for reconnect state)
- F17: a retried client id is NOT delivered to the peer twice
- F18: the sender is re-confirmed with the original message
- F19: a different participant may reuse the same client id
- F20: unknown source labels are replaced with 'typed'
- F21: OCR provenance is kept
- F22: translated messages keep original text and language tag
- F23: original/lang are dropped when the message is not translated
- F24: an invalid client id is ignored but the message is still delivered
- F25: emergency kind is relayed and its source is forced to 'emergency'
- F26: the sender cannot acknowledge its own emergency
- F27: emergency-ack on a non-emergency message is ignored
- F28: emergency acknowledgement reaches the sender with the acknowledger's name
- F29: a presented receipt that is NOT limited is not forwarded to the sender (no preferences leak)
- F30: a LIMITED receipt reaches the sender with the recipient's name
- F31: the sender is never told HOW the recipient receives (no channel names forwarded)
- F32: the sender cannot file a presented receipt for its own message
- F33: malformed or unknown presented frames are ignored without breaking the session
- F34: limited must be exactly true: the string 'true' is not accepted
- F35: offer is relayed to the chosen participant with the sender's identity
- F36: signalling is not echoed to the sender or third parties
- F37: signalling to yourself is refused
- F38: signalling to a non-participant is refused
- F39: unknown signalling kinds are dropped
- F40: signalling cannot cross into another session
- F41: oversized frames are rejected
- F42: unconfigured translation answers 501 translation_not_configured (no fake output)
- F43: translation requires the participant's key
- F44: translation is refused outside a real session
- F45: empty text is a 400, not a provider call
- F46: configured provider is reported, with the languages it lists
- F47: language support comes from the provider list (Odia is NOT listed, so not claimed)
- F48: translation returns the provider's text
- F49: BCP-47 tags are reduced to base codes for the provider
- F50: the server adds the provider key; the browser never sent one
- F51: same source and target returns the text unchanged without calling the provider
- F52: provider error maps to 502 provider_error
- F53: unreadable provider answer maps to 502 provider_bad_response
- F54: provider timeout maps to 504 provider_timeout
- F55: Google adapter returns translated text
- F56: Google key travels in a header, not in the URL or body
- F57: per-language support is not claimed when a provider does not report it
- F58: capabilities still never contains the credential when configured
- F59: unreachable provider maps to 502 provider_unreachable
- F60: translation is rate limited per participant
- F61: session creation and lookup are sent with no-store
- F62: a WebSocket from a foreign origin is refused  (rejected-403)
- F63: a WebSocket from the site's own origin is accepted  (open)

### E — `test-e2e.js` (18 passing checks)

- E1: Session created and join URL shown  (http://localhost:8097/#/join/qptnhsamawdp/zbUrh_wm7ZDIOyf8tnze0p3RqSoiBlBI)
- E2: QR image rendered
- E3: Join page shows session info
- E4: Creator sees guest presence
- E5: Message A→B delivered in real time
- E6: Turn indicator shows it is B's turn
- E7: 'I need more time' notifies the other side
- E8: Creator sees typing indicator
- E9: Message B→A delivered in real time
- E10: Clarification message delivered and tagged
- E11: Explicit Pass-turn routes the turn to the peer
- E12: Invalid token shows an error, not a chat
- E13: Ending the session disables the guest input
- E14: Assistance request submitted and pending
- E15: Volunteer identity auto-provisioned in localStorage
- E16: Volunteer accept reflects to requester as 'accepted'
- E17: Accepted request offers a live conversation link
- E18: No uncaught page errors

### I — `test-integration-fixes.js` (9 passing checks)

- I1: Tapping a phrase tile invokes speak() with text  ({"text":"I need some water","lang":"en-IN","hasVoice":false,"hasOnerror":true,"pausedWhenCalled":true})
- I2: speak() resumes a paused synth engine before speaking (Chrome fix)
- I3: speak() cancels any prior utterance before queueing the new one
- I4: speak() attaches an onerror handler to the utterance
- I5: speak() does not throw when no matching voice is installed
- I6: Speech recognition locale falls back from en-IN to en-US (profile default is en-IN)  (got en-US)
- I7: OCR run completes (progress reaches 'Done')  (progL=Done)
- I8: OCR extracts recognizable text from the generated test image  (got: "TEST LABEL")
- I9: No uncaught page errors during integration-fix checks

### B — `test-browser.js` (164 passing checks)

- B1: sender's bubble shows a state, not just text  (Delivered)
- B2: state reaches 'Delivered' only after the other device confirms
- B3: recipient sees the message
- B4: shows 'Sent to server' when the other device is away
- B5: never says 'Delivered' without confirmation
- B6: on reconnect the missed message arrives
- B7: and then the sender sees 'Delivered'
- B8: a draft typed while disconnected is not lost  (kept in box)
- B9: the kept draft sends once the connection is back
- B10: shows 'Sending…' first
- B11: becomes 'Not sent' with a Retry button when the server never confirms
- B12: Retry delivers the message
- B13: recipient has exactly one copy  (1)
- B14: an in-flight message becomes 'Waiting to reconnect'
- B15: and is sent automatically after reconnect
- B16: without being duplicated  (1)
- B17: no profile key or value appears in any frame the clients sent
- B18: each participant keeps their own profile
- B19: the other participant's profile is not visible anywhere on the page
- B20: receiver with Haptic on feels the YES pattern  ([100,120,100])
- B21: receiver with Braille on gets a Braille line under the message
- B22: receiver with Captions on gets a large caption of the newest message
- B23: receiver with Spoken on gets a per-message Read aloud button
- B24: nothing is read aloud automatically while auto-read is off  (0)
- B25: once enabled, new incoming messages are read aloud
- B26: 'I need help' maps to the HELP pattern
- B27: a captions-only receiver gets no Braille, no read-aloud button, no vibration
- B28: auto-read is unavailable when Spoken is not in the profile
- B29: microphone does not start by itself
- B30: microphone starts only after the button
- B31: recognised text goes to the review box, editable
- B32: a caption line is also shown
- B33: nothing was sent to the chat while the text sits in review  (0)
- B34: the receiver has not seen it
- B35: pressing Send delivers the EDITED text
- B36: receiver sees it labelled as a reviewed voice transcript
- B37: review box is cleared after sending
- B38: sender's panel reports 'Delivered' only after confirmation
- B39: Discard empties the review box and sends nothing
- B40: stopping is respected (no automatic restart)
- B41: blocked microphone gets a specific message
- B42: unsupported recognition language gets a specific message
- B43: tapping a tile speaks it
- B44: tile adds to an editable draft
- B45: Send to chat delivers the reviewed draft
- B46: receiver sees a Phrase board label
- B47: sending the same text again within 10 s asks for a second press
- B48: …and nothing extra was sent yet
- B49: a deliberate second press sends it
- B50: a custom phrase becomes a tile
- B51: custom phrases are saved on this device
- B52: custom phrases survive a reload
- B53: a custom phrase can be removed
- B54: English-only note is visible
- B55: a non-image is refused with a clear reason
- B56: an oversized photo is refused with a clear reason
- B57: a valid photo shows a preview and enables reading
- B58: text is extracted  (TEST LABEL)
- B59: a confidence figure is shown with a caution
- B60: Copy puts the edited text on the clipboard
- B61: Read aloud speaks the edited text
- B62: Send to chat delivers the reviewed text
- B63: receiver sees it labelled as text read from a photo
- B64: Replace photo opens the file chooser
- B65: replacing swaps the photo and clears the confidence note
- B66: Remove photo hides the preview and disables reading
- B67: the text stays until cleared
- B68: a damaged image is refused with a reason and no text is invented
- B69: without a chat session nothing is sent and the text is kept
- B70: no session: the draft is kept and the reason is shown
- B71: no fake 'sent' bubble appears
- B72: with a session the bubble reaches 'Delivered' after confirmation
- B73: the other participant received it
- B74: the dialog opens with an editable message and a clear recipient line
- B75: nothing is sent just by opening it
- B76: it states that emergency services are not contacted
- B77: the other person gets a full-screen alert dialog with the text
- B78: it is exposed as an alert dialog
- B79: the alert is not vibration-only: vibration is added to visible text
- B80: focus moves to the acknowledge button
- B81: sender is told the alert is waiting for confirmation (not 'seen')
- B82: with no confirmation the sender is told not to assume it was seen
- B83: the sender sees who confirmed, and when
- B84: closing returns focus to the control that opened it
- B85: without a session, Send is disabled and the reason is shown
- B86: an alternative is offered: show the message to someone nearby
- B87: 'show to a person nearby' displays the message large
- B88: a dialer link is offered but SANGAM does not place the call
- B89: chat says translation is not set up
- B90: the controls do not pretend to translate
- B91: no Translate button is offered on received messages
- B92: Odia: translation reported as not configured; nothing is claimed
- B93: Odia: recognition is not claimed as working
- B94: Odia: the script needs a device font, and that is said
- B95: Odia: no Odia voice in this device is reported, not hidden
- B96: Hindi: a Hindi voice is reported only because one is installed
- B97: chat reports translation is on
- B98: receiver's translation uses THEIR profile language and is labelled machine translation  (Translated to English: [en] Good morning (machine translation by libretranslate))
- B99: the original message stays visible next to the translation
- B100: original, source, target and the translation are all visible
- B101: the translation text is marked with its language
- B102: the edited translation is what gets sent
- B103: the receiver also sees the original text and a Translated label
- B104: Odia is still not claimed because the provider does not list it
- B105: Hindi translation is reported because the provider lists it
- B106: the microphone is not opened before anyone presses a button
- B107: the other person must accept: the call is not auto-answered
- B108: declining tells the caller
- B109: both sides reach a connected audio session  (A=true B=true)
- B110: remote audio track is attached on the receiving side
- B111: mute disables the microphone track and says so
- B112: hang up ends the call on the other side too
- B113: microphone tracks are released after the call
- B114: all ten meanings are listed (the original eight, plus Call incoming and Alert added in the second integration pass)  (Yes,No,Help,Emergency,Information,Message received,Message sent,Connection lost,Call incoming,Alert)
- B115: each pattern is described in words
- B116: Test plays exactly the documented rhythm for every pattern
- B117: no two patterns are identical
- B118: Stop cancels vibration
- B119: there is no intensity slider, and the page says why
- B120: on a device that cannot vibrate, tests are disabled and it is explained
- B121: capital letters, words and punctuation
- B122: all-capital words use the capital-word indicator
- B123: numbers get a number sign, and a following a-j gets a grade-1 indicator
- B124: decimal points stay inside a number
- B125: unsupported scripts are reported, not silently dropped or guessed
- B126: quotation marks are reported rather than guessed
- B127: lines wrap at the chosen display width  (13,13,11)
- B128: it states it is not Grade 2, not other languages, and not a physical display
- B129: physical display status is honest: none connected, no driver
- B130: off by default: no scanning bar
- B131: turning it on shows the scanning bar and a highlighted control
- B132: choosing the Switch input mode and scanning are the same setting
- B133: the page does not claim hardware compatibility
- B134: stepping reaches a group
- B135: select enters the group
- B136: select activates the highlighted control
- B137: Escape pauses scanning
- B138: Escape again resumes
- B139: Turn off removes the bar and the highlight
- B140: Repeat last speaks the previous text again
- B141: Stop cancels speech
- B142: each new utterance cancels the previous one (no overlap)
- B143: chosen voice, language and rate are applied  ({"text":"This is how I sound. Hello from Sangam.","rate":1.3,"lang":"hi-IN","voice":"fake-hi"})
- B144: a browser with no speech says so instead of failing silently
- B145: text size 160% enlarges the page text  (16 -> 25.6)
- B146: high contrast gives at least 7:1 on every sampled surface (pure black/white/yellow)  ({"body":21,".pbox":21,".note":21,"#profileStrip .pill":21,"button.btn-sm":21})
- B147: voice on: the Listen box is shown
- B148: voice off: the Listen box is replaced by a note that says why
- B149: …and one button turns it back on
- B150: camera off: the photo box is hidden with an explanation
- B151: text off: the composer is hidden with an explanation
- B152: output modes control which renderings appear in Reply  (Spoken audio,Captions,Haptic rhythm)
- B153: the profile strip reflects the choices
- B154: the profile is remembered after a reload
- B155: it contains a live capability check for this browser
- B156: statuses use the fixed vocabulary only
- B157: nothing is labelled Planned or Complete
- B158: the dashboard menu no longer tags it 'Planned'
- B159: translation shows as not configured
- B160: volunteers are described as helpers, not certified professionals
- B161: no category presents a volunteer as a sign-language interpreter
- B162: no API key, key header or key field appears in any frontend file
- B163: no third-party hosts are loaded by the page
- B164: no uncaught page errors or console errors in any session

### A — `test-a11y.js` (75 passing checks)

- A1: axe: no serious/critical violations — landing page
- A2: axe: no serious/critical violations — panel overview
- A3: axe: no serious/critical violations — panel profile
- A4: axe: no serious/critical violations — panel relay
- A5: axe: no serious/critical violations — panel scan
- A6: axe: no serious/critical violations — panel phrases
- A7: axe: no serious/critical violations — panel messages
- A8: axe: no serious/critical violations — panel connect
- A9: axe: no serious/critical violations — panel learn
- A10: axe: no serious/critical violations — panel assist
- A11: axe: no serious/critical violations — panel next
- A12: axe: no serious/critical violations — dashboard menu open
- A13: axe: no serious/critical violations — emergency dialog
- A14: axe: no serious/critical violations — show-to-a-person dialog
- A15: axe: no serious/critical violations — host chat
- A16: axe: no serious/critical violations — join form
- A17: axe: no serious/critical violations — guest chat (mobile)
- A18: axe: no serious/critical violations — incoming emergency alert
- A19: axe: no serious/critical violations — panel profile (high contrast)
- A20: axe: no serious/critical violations — panel phrases (high contrast)
- A21: axe: no serious/critical violations — panel next (high contrast)
- A22: the first Tab stop is the skip link
- A23: activating it moves focus into the main content
- A24: there is exactly one main landmark, one h1 on the landing page
- A25: duplicate ids: none
- A26: hamburger exposes aria-expanded and aria-controls pointing at the nav
- A27: opening it updates aria-expanded
- A28: Escape closes it and returns focus to the button
- A29: the dashboard menu button exposes aria-expanded and aria-controls
- A30: Escape closes the menu and returns focus
- A31: emergency dialog is modal: Tab stays inside it
- A32: Escape closes the dialog and focus returns to the Emergency button
- A33: the join screen is a labelled modal dialog and puts focus in the name field
- A34: panel profile: focus never lands on hidden controls
- A35: panel profile: focused controls show a visible focus indicator  (0 without)
- A36: panel profile: at least 10 distinct controls are reachable by Tab  (36)
- A37: panel relay: focus never lands on hidden controls
- A38: panel relay: focused controls show a visible focus indicator  (0 without)
- A39: panel relay: at least 10 distinct controls are reachable by Tab  (17)
- A40: panel phrases: focus never lands on hidden controls
- A41: panel phrases: focused controls show a visible focus indicator  (0 without)
- A42: panel phrases: at least 10 distinct controls are reachable by Tab  (17)
- A43: panel messages: focus never lands on hidden controls
- A44: panel messages: focused controls show a visible focus indicator  (0 without)
- A45: panel messages: at least 10 distinct controls are reachable by Tab  (12)
- A46: panel scan: focus never lands on hidden controls
- A47: panel scan: focused controls show a visible focus indicator  (0 without)
- A48: panel scan: at least 10 distinct controls are reachable by Tab  (15)
- A49: touch targets ≥ 44 px on #/
- A50: touch targets ≥ 44 px on #/dashboard
- A51: touch targets ≥ 44 px on #/dashboard/profile
- A52: touch targets ≥ 44 px on #/dashboard/relay
- A53: touch targets ≥ 44 px on #/dashboard/scan
- A54: touch targets ≥ 44 px on #/dashboard/phrases
- A55: touch targets ≥ 44 px on #/dashboard/messages
- A56: touch targets ≥ 44 px on #/dashboard/connect
- A57: touch targets ≥ 44 px on #/dashboard/learn
- A58: touch targets ≥ 44 px on #/dashboard/assist
- A59: touch targets ≥ 44 px on #/dashboard/next
- A60: no horizontal overflow at 320×640
- A61: no horizontal overflow at 360×740
- A62: no horizontal overflow at 390×844
- A63: no horizontal overflow at 768×1024
- A64: no horizontal overflow at 1024×768
- A65: no horizontal overflow at 1440×900
- A66: no horizontal overflow at 1920×1080
- A67: no horizontal overflow at 844×390
- A68: no horizontal overflow at 1024×600
- A69: 200% zoom plus 160% text scale reflows without horizontal scrolling
- A70: the demo board starts paused when the device asks for reduced motion
- A71: and does not rotate by itself
- A72: no CSS animation is running  (0)
- A73: otherwise the demo can be paused with a button
- A74: pausing stops the rotation
- A75: no console or page errors during the accessibility run

### G — `test-sign-engine.js` (33 passing checks)

- G1: hand shape is the same whatever the hand's size and position in the picture  (max diff 0.039)
- G2: a frame with no hand is reported as no hand
- G3: a frame with a malformed hand is ignored
- G4: two hands are ordered by position in the image, not by label
- G5: a sign is resampled to a fixed length whatever its duration
- G6: with nothing taught the adapter is unavailable and has no vocabulary
- G7: with nothing taught a sign gets no result instead of a guess
- G8: a sign cannot be taught without a name
- G9: an empty recording is refused
- G10: after teaching, the vocabulary lists exactly the taught signs
- G11: a sign with only one example is not used for matching yet
- G12: new performances of taught signs (other speed, size, position) are recognised  (30/30)
- G13: a match carries a closeness figure between 0 and 1 and a ranked list
- G14: a movement that was never taught is not turned into a word  (unknown)
- G15: random hand shapes and movements are rarely accepted as a taught sign  (0 of 20 accepted)
- G16: two near-identical taught signs are not guessed between (ambiguous or unknown)  (unknown)
- G17: a two-hand sign is told apart from the same one-hand sign
- G18: one sign between empty frames is one segment
- G19: a flash of a hand too short to be a sign is discarded, not classified
- G20: losing the hand for a couple of frames does not cut a sign in two
- G21: a hand held up forever is cut at a maximum length and marked as truncated
- G22: a clear match is accepted
- G23: the same sign again inside 1.5 s is suppressed as a duplicate
- G24: the same sign again after the pause is accepted as a deliberate repeat
- G25: a different sign straight away is accepted
- G26: unknown results are never accepted
- G27: ambiguous results are never accepted
- G28: a match that is barely inside the limit is rejected as low confidence
- G29: a model package without licence, dataset or evaluation is refused
- G30: loading an invalid package fails with a readable error
- G31: a valid package loads, reports its language and recognises its signs
- G32: a package whose templates have the wrong shape is refused with the reason
- G33: a vocabulary word with no templates is refused

### H — `test-sound-engine.js` (46 passing checks)

- H1: class map parses to 521 classes  (got 521)
- H2: class map: quoted names containing commas survive
- H3: class map: every category class index has the expected name
- H4: class map: a shuffled label file is refused
- H5: class map: wrong length is refused
- H6: categories include fire, alarm, siren, doorbell, horn
- H7: every category has a distinct vibration pattern
- H8: optional categories (knock, baby, glass) are off by default
- H9: spoken alert is off by default
- H10: categoryScores takes the strongest class
- H11: categoryScores: unrelated classes score 0
- H12: resampler 48 kHz -> 16 kHz: output length ≈ 1 s  (got 16000)
- H13: resampler 48 kHz: 1 kHz tone keeps its frequency and amplitude  (amp 0.497)
- H14: resampler 44.1 kHz -> 16 kHz: output length ≈ 1 s  (got 16000)
- H15: resampler 44.1 kHz: 1 kHz tone keeps its frequency and amplitude  (amp 0.496)
- H16: resampler 32 kHz -> 16 kHz: output length ≈ 1 s  (got 16000)
- H17: resampler 32 kHz: 1 kHz tone keeps its frequency and amplitude  (amp 0.498)
- H18: resampler 16 kHz -> 16 kHz: output length ≈ 1 s  (got 16000)
- H19: resampler 16 kHz: 1 kHz tone keeps its frequency and amplitude  (amp 0.500)
- H20: resampler: chunked streaming equals one-shot  (max diff 3.0e-8)
- H21: resampler: tone above 8 kHz folds in at under a quarter of its level (simple box filter, modest anti-aliasing)  (alias amp 0.122)
- H22: resampler: 8 kHz microphone is up-sampled  (got 7998)
- H23: windower: no window before 15600 samples, one at 15600
- H24: windower: next window after a half-window hop (50% overlap)
- H25: windower: overlapping windows are produced in order  (got 4)
- H26: windower: second window starts one hop after the first
- H27: rms of silence is 0, of a 0.5 sine ≈ 0.354
- H28: detector: alerts once at onset of a loud smoke alarm  (alerts 1)
- H29: detector: alert carries score and class name
- H30: detector: continuing sound produces updates, not new alerts
- H31: detector: nothing happens while quiet
- H32: detector: 30 s continuous alarm → exactly one alert
- H33: detector: a sound that stops is reported ended after the release time
- H34: detector: not ended too early
- H35: detector: gaps shorter than the release time do not re-alert (pulsed alarms)
- H36: detector: a later, separate alarm alerts again
- H37: detector: a second onset inside the cooldown is suppressed and counted
- H38: detector: simultaneous fire alarm and doorbell both alert
- H39: detector: a category that is switched off is ignored
- H40: detector: enabled category still alerts
- H41: detector: score 0.30 → ignored at low and medium, alerts at high
- H42: detector: a very weak score (0.1) never alerts at any sensitivity
- H43: detector: configure() changes sensitivity live
- H44: detector: scores between hold and alert level keep the event alive without re-alerting
- H45: detector: switching a running category off clears its active state
- H46: detector: reset() forgets everything

### K — `test-access-browser.js` (75 passing checks)

- K1: with no adapter, the card says none is connected and no driver is bundled
- K2: the card states the limits: not Grade 2, not other languages, not a physical display
- K3: registering something that is not an adapter is refused
- K4: a registered adapter is listed as Not connected
- K5: registration alone sends nothing
- K6: Connect (a user action) connects it
- K7: Send test text hands the Braille cells of 'Sangam test' to the adapter  (⠠⠎⠁⠝⠛⠁⠍⠀⠞⠑⠎⠞)
- K8: the status says SANGAM cannot read the display back
- K9: a failing display shows an error instead of success
- K10: a display that disconnects is shown as Not connected with the reason
- K11: a failed connection says why and stays Not connected
- K12: no page errors
- K13: before connecting the display nothing is sent to it
- K14: a received message is sent to the connected display as Braille cells, with the sender's name  (["⠠⠗⠁⠧⠊⠒⠀⠠⠏⠇⠑⠁⠎⠑⠀⠉⠁⠇⠇\n⠍⠑"] vs ⠠⠗⠁⠧⠊⠒⠀⠠⠏⠇⠑⠁⠎⠑⠀⠉⠁⠇⠇⠀⠍⠑)
- K15: lines are wrapped to the display's own width (20 cells)
- K16: a sound alert is also sent to the display
- K17: with 'send to a connected display' off, nothing is sent
- K18: the message is still on Meera's screen
- K19: no page errors
- K20: the state still says Delivered (it did reach the device)
- K21: …and Ravi is told it may not have reached Meera in the way she prefers  (Delivered to Meera’s device, but it may not have reached Meera in the way they prefer. It was shown on screen.)
- K22: the note says it was shown on screen and does NOT reveal how she receives (no mention of Braille)  (Delivered to Meera’s device, but it may not have reached Meera in the way they prefer. It was shown on screen.)
- K23: Braille preview only (no display claimed): no warning is shown to the sender
- K24: display connected and accepting: no warning
- K25: display connected but REJECTING the text: sender is warned
- K26: Meera's own device records why (the display's error is shown with the display)
- K27: vibration chosen on a device that cannot vibrate: sender is warned
- K28: a pattern the person switched off is not played, and that is not reported as a failure
- K29: a pattern that is on is played (NO = one long pulse)
- K30: ten patterns, each with an On checkbox
- K31: Emergency cannot be switched off
- K32: there is still no intensity slider
- K33: switching a meaning off is saved in the profile
- K34: Test still plays a switched-off pattern, so you can feel it before deciding
- K35: the application itself will not use it while off
- K36: 'Much longer' doubles the pulse timing (NO: 400 → 800 ms)
- K37: the new Alert pattern is five very short pulses
- K38: settings survive a reload
- K39: labelled as an implementation under validation, not tested with deafblind people
- K40: says it does not detect, label or diagnose anyone
- K41: nothing is changed just by opening the page
- K42: the suggested starting point sets Braille + vibration + captions, 150% text, high contrast, confirm-before-send
- K43: the page really changed (high contrast class, larger scale)
- K44: the profile chips show the new choices
- K45: it says what it did and how to undo it
- K46: Undo restores the earlier settings exactly
- K47: any single setting can be changed afterwards
- K48: first press does NOT send
- K49: it reads the message back and asks to press again
- K50: editing the text starts the confirmation again (still not sent)
- K51: the second press sends it
- K52: with confirm-before-send off, one press sends
- K53: default: everything is announced
- K54: 'Important only' drops routine progress but keeps errors and alerts
- K55: 'Alerts only' keeps just alarms and emergencies
- K56: a routine message is NOT written to the live region at that level
- K57: an alert message IS written to the assertive live region
- K58: alarms are never silenced: a sound-alert banner item is still role=alert at the strictest level
- K59: the level is remembered
- K60: states that conversations are never stored on the device or kept after the session
- K61: the download is named, and contains the SANGAM items
- K62: it contains nothing that is not SANGAM's
- K63: it says no chat messages, pictures, audio or video are included
- K64: the first press only arms the deletion and says what will happen
- K65: nothing is deleted by the first press
- K66: the second press deletes every SANGAM item (taught signs, sound settings, profile)
- K67: …and leaves other sites' / apps' data alone
- K68: the page came back with default settings
- K69: automatic scanning advances by itself
- K70: with 'Move automatically' off, nothing moves by itself
- K71: the arrow key steps one position
- K72: after N unused passes, scanning pauses and says so
- K73: Resume restarts scanning
- K74: 'Speak each highlighted control' speaks the control name  (["Group 2 of 15: 5 controls."])
- K75: no page errors

### C — `test-sign-browser.js` (121 passing checks)

- C1: Sign Language Camera is a dashboard feature with a tile
- C2: panel says it is NOT a full sign-language translator
- C3: panel says no ISL model is installed
- C4: panel says pictures are never uploaded or recorded
- C5: camera was NOT requested on page load
- C6: recogniser list: ISL, ASL and BSL are shown as not installed  (My own signs (taught on this device) AvailableTeach at least one sign (2 or more examples) to start. | Indian Sign Language (ISL), pretrained model Not installedNo Indian Sign Language model is instal)
- C7: recogniser list: ASL is never presented as ISL
- C8: dialog is closed until opened
- C9: no page errors
- C10: opens from the keyboard as a modal dialog
- C11: consent is shown first and the camera panel is hidden
- C12: focus moves into the dialog (on the consent button)
- C13: camera still NOT requested while consent is showing
- C14: dialog has an accessible name
- C15: Tab never reaches the page behind the dialog (focus stays inside it or goes to the browser itself)
- C16: Escape closes the dialog
- C17: focus returns to the button that opened it
- C18: declining consent leaves the camera unrequested
- C19: 'Not now' closes without starting the camera
- C20: camera asked for video only: no microphone
- C21: live preview is playing with a real picture size
- C22: the preview is mirrored like a mirror
- C23: the stage uses the camera's own aspect ratio so hands are not cropped
- C24: a 'Camera on' indicator is visible
- C25: status text says the camera is on
- C26: recognition has NOT started by itself
- C27: hand-tracking model has NOT been loaded yet (lazy)
- C28: Stop camera ends every video track
- C29: preview is cleared and indicator hidden after Stop
- C30: the camera can be reopened
- C31: closing the dialog ends every video track
- C32: Escape closes the dialog and releases the camera
- C33: navigating away closes the dialog and releases the camera
- C34: pagehide releases the camera
- C35: camera unplugged mid-use: indicator off and a clear message
- C36: no video, frames or pictures went to the network (no non-GET requests)
- C37: nothing external was contacted
- C38: no page errors
- C39: permission denied: clear message  (Camera permission was denied. Allow camera access for this site in your browser settings, then press Open camera again.)
- C40: permission denied: Open camera is usable again, recognition cannot start, no indicator
- C41: no camera: clear message  (No camera was found on this device. Connect one and try again.)
- C42: no camera: Open camera is usable again, recognition cannot start, no indicator
- C43: camera in use: clear message  (The camera is busy or blocked, probably because another app is using it. Close that app and try again.)
- C44: camera in use: Open camera is usable again, recognition cannot start, no indicator
- C45: camera cannot satisfy constraints: clear message  (This camera cannot give a usable picture. Try Switch camera.)
- C46: camera cannot satisfy constraints: Open camera is usable again, recognition cannot start, no indicator
- C47: insecure page: clear message  (The browser blocked the camera on this page. Camera access needs https, or localhost.)
- C48: insecure page: Open camera is usable again, recognition cannot start, no indicator
- C49: a browser with no camera API says so
- C50: ISL is listed but disabled and marked not installed
- C51: ASL and BSL are listed as not installed and cannot be selected
- C52: the only selectable recogniser is the user's own taught signs
- C53: no option labels one language as another (ASL is not called ISL)
- C54: 'About' states the limits: hands only, no sentences, accuracy with real signers unmeasured
- C55: model load failure: clear message that nothing was sent
- C56: model load failure: not recognising, can try again
- C57: model load failure: the camera preview keeps working
- C58: the real MediaPipe hand tracker loads from this site and starts
- C59: no mock banner is shown (this is the real tracker)
- C60: a hand-free test picture produces no words
- C61: status says hand tracking is running and a sign must be taught
- C62: closing releases the camera while the real tracker was running
- C63: real tracker: no network request carried any camera data
- C64: no page errors with the real tracker
- C65: before anything is taught, Start recognition works but explains that nothing can be recognised
- C66: the TEST HAND SOURCE banner is shown while hands are mocked
- C67: Record is disabled until a word is typed
- C68: Record becomes available once a word is typed
- C69: one example is saved but not yet used (needs 2)
- C70: taught signs are listed with their example counts
- C71: the taught signs are stored as numbers on this device, not pictures
- C72: a taught sign performed again (other speed, size, place) is added to the transcript  (wait)
- C73: the confidence line shows a match figure and says it is not a probability
- C74: status line says the word was added
- C75: the same sign again straight away is suppressed (no accidental duplicate)
- C76: a different sign is added after a space  (wait hello)
- C77: the same sign after a pause counts again
- C78: a movement that was never taught is NOT turned into a word  (wait hello wait)
- C79: the user is told: Sign not recognised clearly. Please repeat.
- C80: a hand flick too brief to be a sign is ignored
- C81: while a sign is in progress the transcript is NOT changed (partial is not final)
- C82: the word is only added when the sign ends
- C83: Pause stops recognition and says so
- C84: nothing is recognised while paused
- C85: Resume recognises again
- C86: nothing was spoken automatically (auto-speak is off by default)
- C87: a taught sign can be deleted
- C88: two words recognised
- C89: Undo last word removes only the last word
- C90: the transcript is editable by typing
- C91: Confirm is available, Send is not until confirmed
- C92: Speak reads the text aloud (stand-in speech)
- C93: Stop speaking cancels speech
- C94: Copy puts the text on the clipboard
- C95: Confirm enables Send
- C96: editing after confirming un-confirms: Send is disabled again
- C97: Clear empties the transcript and disables the buttons
- C98: auto-speak (opt-in) speaks each new word
- C99: not connected: told nothing was sent, and the text is kept
- C100: no websocket frame was sent
- C101: words recognised on Ravi's side
- C102: NOTHING reached Meera while the text was only recognised (no auto-send)
- C103: NOTHING reached Meera after confirming either (send is a separate step)
- C104: Meera receives the confirmed text
- C105: Meera sees accurate provenance: interpreted from signing, the sender's own taught signs, reviewed by the sender  (Interpreted from signing: the sender's own taught signs, reviewed by the sender)
- C106: it is NOT labelled as typed, voice or a recognition model
- C107: Ravi's bubble reaches 'Delivered' (set only after Meera's device confirms)
- C108: Ravi's own bubble carries the same provenance label  (Interpreted from signing: the sender's own taught signs, reviewed by the sender)
- C109: transcript was cleared after a successful send
- C110: the websocket message says source=sign and via=personal  ({"type":"message","cid":"cmwueidhe1twvt","text":"hello wait","kind":"message","source":"sign","clarifyType":null,"orig":null,"lang":null,"via":"personal"})
- C111: no websocket frame contains landmarks, video, images or sign vectors  (1 frames)
- C112: every websocket frame is small (text only)  (largest 154)
- C113: no HTTP request other than GET left Ravi's browser (no upload)  (POST http://localhost:8102/api/sessions)
- C114: Meera's typed reply reaches Ravi
- C115: closing the sign dialog released the camera and the chat is still connected
- C116: no page errors on either side
- C117: axe: no violations in the open Sign Language Camera dialog
- C118: every dialog button is at least 40 px tall
- C119: every status line is a live region
- C120: the preview video has an accessible label
- C121: no horizontal scrolling inside the dialog at 320 px wide

### D — `test-sound-browser.js` (89 passing checks)

- D1: Sound alerts is a dashboard feature with a tile
- D2: panel says it is not a safety device
- D3: panel says audio is never recorded, stored or uploaded
- D4: panel explains scores are not probabilities
- D5: model shown as NOT loaded before Start
- D6: microphone was NOT requested on page load
- D7: microphone indicator bar hidden before Start
- D8: test-beep button disabled until listening
- D9: default sound types: fire, alarm, siren, doorbell, horn checked; knock/baby/glass not
- D10: spoken alert is off by default; flash and vibration on
- D11: sensitivity defaults to medium
- D12: no page errors
- D13: model state is ready after load
- D14: model line says detection is available
- D15: zero requests left this machine while loading the model
- D16: model, labels and runtime came from this site's vendor folder
- D17: no alert for silence
- D18: no alert for white noise
- D19: no alert for a steady 1 kHz tone
- D20: no alert for a speech-like hum
- D21: pulsed 3.1 kHz beep at 48000 Hz → smoke or fire alarm alert, once  (["Other alarm or buzzer 67%","Smoke or fire alarm 80%"])
- D22:   the alert reports a confidence of at least 35%  (80%)
- D23: pulsed 3.1 kHz beep at 44100 Hz → smoke or fire alarm alert, once  (["Other alarm or buzzer 41%","Smoke or fire alarm 59%"])
- D24:   the alert reports a confidence of at least 35%  (59%)
- D25: pulsed 3.1 kHz beep at 16000 Hz → smoke or fire alarm alert, once  (["Other alarm or buzzer 67%","Smoke or fire alarm 80%"])
- D26:   the alert reports a confidence of at least 35%  (80%)
- D27: a quiet beep (amplitude 0.05) is still detected
- D28: 30 s of continuous beeping → one smoke-alarm alert, no repeats  (entries: 2)
- D29: the alert stays on screen while the sound continues
- D30: only ONE banner item exists for the smoke alarm
- D31: when the sound stops the banner says Stopped
- D32: a later, separate alarm alerts again
- D33: visible alert names the sound and the confidence
- D34: alert item is announced as role=alert
- D35: alert text is visible on screen (not just in a live region)
- D36: vibration pattern for fire was triggered  ([[500,150,500,150,500,150,500],[400,150,400,150,400]])
- D37: screen flash was triggered
- D38: spoken alert was spoken because the person turned it on
- D39: history shows a real (non-simulated) entry with confidence
- D40: Dismiss removes the alert
- D41: Clear history empties the list
- D42: with spoken alert off (default), nothing is spoken
- D43: with vibration off, nothing vibrates
- D44: with smoke alarm and other alarm switched off, a beep raises no alert
- D45: switching smoke alarm back on takes effect immediately
- D46: low sensitivity: the weaker 44.1 kHz fire score (≈59%) still passes the 55% bar, doorbell/horn stay quiet
- D47: settings are remembered after reload (sensitivity low, alarm off)
- D48: only settings are stored (no audio, no history)  ({"on":["siren","doorbell","horn","fire"],"sensitivity":"low","flash":true,"vibrate":true,"speak":false})
- D49: preview alert says it is a preview and that nothing was heard
- D50: preview alert does NOT show a made-up confidence
- D51: history marks it as simulated
- D52: preview did not start the microphone or load the model
- D53: preview alert disappears by itself
- D54: listening starts after the model loads and the microphone is allowed
- D55: model loaded BEFORE the microphone was requested
- D56: microphone requested audio only, no video
- D57: echo cancellation, noise suppression and auto gain are off (they can erase steady alarm tones)
- D58: a persistent 'microphone is on' bar is shown
- D59: button now says Stop listening
- D60: the real microphone audio is being analysed (windows counted)
- D61: analysis status is shown
- D62: leaving the panel keeps listening, and the indicator stays visible
- D63: no request left this machine while listening
- D64: no uploads: every request is a GET
- D65: nothing was sent over the websocket
- D66: Stop from the global bar stops listening
- D67: every microphone track is ended (the browser's mic indicator goes off)  (ended)
- D68: level meter reset and status says the microphone is off
- D69: listening can be restarted without reloading the model
- D70: microphone lost mid-listening → stops and explains
- D71: pagehide turns the microphone off
- D72: no page errors
- D73: permission denied: clear message, not listening, button usable again
- D74: permission denied: preview alerts still work
- D75: no microphone: clear message, not listening, button usable again
- D76: no microphone: preview alerts still work
- D77: microphone busy: clear message, not listening, button usable again
- D78: microphone busy: preview alerts still work
- D79: model load failure: status says NOT loaded and detection is off
- D80: model load failure: the microphone was never opened
- D81: model load failure: note explains and offers retry
- D82: model load failure: not listening, no indicator
- D83: retry after the failure succeeds
- D84: a wrong label file is refused rather than trusted
- D85: axe: no violations on the Sound alerts panel with an alert showing
- D86: Start listening is keyboard focusable
- D87: every button and chip is at least 44 px tall
- D88: no horizontal scrolling at 320 px wide
- D89: reduced motion: flash is a steady tint, not pulsing
