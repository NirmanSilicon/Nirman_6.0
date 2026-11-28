# SANGAM — two-way accessible communication

SANGAM lets two people communicate even when they use different ways to send and receive messages. Each person chooses how they **send** (voice, camera/photo, text, switch) and how they **receive** (spoken audio, captions, haptic rhythm, Braille preview). Those choices stay on that person's own device; the other person never sees them.

This is a prototype. Every feature carries an honest status (see `REQUIREMENTS_REGISTER.md` and the in-app **What comes next** panel). Anything that needs hardware or a service that was not available during testing says so.

## What is in the box

| Area | What it does | Status in short |
|---|---|---|
| Access profile | Per-device send/receive choices, text size 100–160%, speech rate, language, high contrast, emergency message. Unselected modes really hide or stop the matching controls. | Browser-tested |
| Speak and caption | Live captions from the browser's speech recognition. The transcript goes to an editable review box and is **never sent automatically**. The microphone never starts by itself. | Browser-tested with a stand-in speech engine; real microphone not tested |
| Read from a photo | On-device OCR (bundled Tesseract, English only) with file checks, confidence, replace/remove, copy, read aloud and send-after-review. | Browser-tested |
| Phrase board | Speak tiles, build and edit a draft, add your own phrases, send after review, duplicate-send guard. | Browser-tested |
| Text messages / Connect and chat | QR-code sessions, real-time chat, typing, turns, clarification chips, reconnect. Delivery states: Sending, Sent, **Delivered only when the other device confirms**, Waiting to reconnect, Not sent (Retry). | Browser-tested with two participants |
| Spoken output | Stop, repeat last, voice picker, no overlapping speech, auto-read off by default. | Automated-tested with a stand-in speech engine |
| Haptic output | Ten meaningful vibration patterns (including Call incoming and Alert), each with Test/Stop, a text description, an on/off switch and a pulse-length setting. Also offers a selectable **Day 2 preset** (Yes/No/Help/Emergency, contributed by Person 3) alongside the default set — a preference, never a replacement. Browsers give no real intensity control, so none is offered. | Awaiting physical-device testing |
| Braille | Uncontracted English preview with wrapping, copy and unsupported-character reports. Incoming messages and sound alerts are now routed to any connected display adapter (`docs/BRAILLE_DEVICE_ADAPTER.md`). Not Grade 2. **No real display driver is bundled.** | Preview browser-tested; routing tested with a TEST-ONLY adapter; hardware untested |
| Switch scanning | Keyboard-driven group/item scanning. | Awaiting switch-hardware testing |
| Emergency | Reviewed message sent to the people in your session, full-screen alert, acknowledgement shown to the sender, "not acknowledged" shown honestly, show-to-a-person fallback. **Does not contact emergency services.** | Browser-tested |
| Translation | Server-side provider adapter (LibreTranslate or Google). Shows "not set up" when unconfigured and never invents a translation. | Blocked by external dependency (no real provider key was available) |
| Live voice | WebRTC audio with explicit consent, mute, hang up. | Awaiting two-device testing |
| Sign Language Camera | Camera (video only, never auto-starts), local hand/body tracking. Two recognition paths: (1) a **real pretrained model** for Indian Sign Language (262 words, bundled) and American Sign Language (2,000 words, install-on-request) — isolated single-word recognition only, **not** sentence-level translation, confidence shown as "Model score," explicitly not independently verified by SANGAM; and (2) the original **personal recogniser** that matches signs you teach it yourself, for any word or variety the pretrained models don't cover. Editable transcript, confirm, then speak or send through the chat. `docs/SIGN_LANGUAGE_CAMERA.md`, `docs/SIGN_LANGUAGE_MODEL_EVALUATION.md` | Pretrained models: bit-for-bit verified against real PyTorch inference; browser-tested with a fake camera; **no real signer has used either model** — a step-by-step procedure for testing this yourself with a real webcam is in `docs/LIVE_WEBCAM_TEST_PROCEDURE.md`. Personal recogniser: browser-tested with a fake camera and mock hands; real signers untested |
| Sound alerts | Real YAMNet model running locally; alerts for fire/smoke alarms, alarms, sirens, doorbells, horns with visible alert, confidence, history, optional flash/vibration/speech. Also offers an optional, **off-by-default** "Loud sound (not identified)" fallback (contributed by Person 4) for a loud noise none of those categories recognise — clearly labelled as unidentified, and gated so it never fires alongside a real classification. A supplement, not a safety device. `docs/SOUND_ALERTS.md` | Browser-tested with the real model on synthetic audio; real recordings untested |
| Deafblind-friendly options | Optional, undoable preset of settings you choose yourself; honest "may not have reached" delivery notices. No diagnosis. `docs/DEAFBLIND_VALIDATION_PLAN.md` | Under validation; not tested with deafblind people |
| Your data | Settings stay on your device. Export or delete them from the profile. Chats are never stored. | Browser-tested |
| SANGAM Learn, Human assistance | Learning content; volunteer request flow (volunteers are helpers, not certified interpreters). | Browser/automated-tested |

Not implemented, by design or because it needs co-design or hardware: sentence-level sign-language translation (only isolated single-word recognition exists, via real pretrained ISL/ASL models — see `docs/SIGN_LANGUAGE_MODEL_EVALUATION.md`), a physical Braille display driver, message persistence after restart.

## Accounts and the four experiences

SANGAM now has accounts. After registering, a person chooses how they use it and gets their own dashboard:

| Choice | Experience |
|---|---|
| I want accessible communication | **Primary user**: set how to send and receive messages, invitation code, connections, interpreter requests |
| I support someone | **Supporter**: connect with a primary user (their approval, three separate permissions), start conversations, request interpreters |
| I want to learn and participate | **Community**: lessons, saved progress, resources |
| I provide interpretation | **Interpreter**: availability, languages, verification, requests. Only an administrator can mark an interpreter verified |

Open the app, press **Get started**, or **try the tools as a guest** (nothing is saved).

**Email:** there is no email service. Verification and reset links are shown on the page, labelled "NOT emailed", when `DEV_TOKENS` is on (the default outside `NODE_ENV=production`). Do not deploy to a shared server in that mode; see `docs/SECURITY_AND_PRIVACY.md`.

**Administrator:** put your email in `ADMIN_EMAILS` (comma separated), register and verify it, and an "Admin review" tab appears for interpreter submissions.

**Data:** one JSON file (`DATA_FILE`, default `data/sangam-data.json`). Delete it to delete every account. Single server process only. See `docs/DATABASE_SCHEMA.md`.

**What is verified and what is not** is in `docs/FEATURE_AUDIT.md`. In short: account logic and the browser journeys were tested for real; **no screen reader, real webcam, microphone or physical device was used**; there is **no ISL static alphabet recogniser** (the letters and numbers are ASL); no model was trained.
## Requirements

- Node.js 18 or newer (tested on Node 22).
- Nothing to download at run time: the OCR engine, hand tracker, sound model and runtimes are all in `vendor/` and served by this site. The page loads no third-party hosts.
- A current Chromium-based browser (Chrome or Edge) for speech recognition. Firefox and Safari work for the rest but have no `SpeechRecognition`.
- For the browser tests: Playwright with Chromium (`npm install -g playwright` then `npx playwright install chromium`).

## Install and run

```bash
npm install
cp .env.example .env     # optional: every variable has a default
npm start                # http://localhost:8080
```

On Windows, `Run Sangam.bat` does the same and opens Chrome.

Serve the site over `http` (the server does this); opening `index.html` directly from disk does not work because OCR and the backend need a server. The microphone needs `https` or `localhost`.

## Environment variables

See `.env.example` for every variable with comments. Highlights:

| Variable | Purpose |
|---|---|
| `PORT`, `PUBLIC_BASE_URL` | Where the server listens and what URL goes in QR codes |
| `SESSION_TTL_MINUTES`, `MAX_PARTICIPANTS`, `MSG_RATE_*`, `MAX_TEXT_LEN` | Session and safety limits |
| `ALLOWED_ORIGINS` | Extra WebSocket origins (tunnels, production hosts) |
| `TRANSLATE_PROVIDER` | `libretranslate` or `google`; empty disables translation |
| `LIBRETRANSLATE_URL`, `LIBRETRANSLATE_API_KEY` | LibreTranslate settings |
| `GOOGLE_TRANSLATE_API_KEY`, `GOOGLE_TRANSLATE_URL` | Google Cloud Translation v2 settings |
| `TRANSLATE_TIMEOUT_MS` | Provider timeout |
| `ICE_SERVERS` | JSON array of STUN/TURN servers for live voice |

API keys are read only on the server and are never sent to the browser or logged.

## Backend

Node + Express + `ws` + `qrcode`. Storage is **in memory by design**: private conversation text is not written to disk and disappears when a session ends or the server restarts. Authentication, session tokens, participant keys, host key secrecy, rate limits, origin checks and turn authorisation from the earlier security audit are unchanged (see `docs/previous/README_PERSON5.md`). Route and frame reference: `docs/API_DOCUMENTATION.md`.

## Translation configuration

1. Run a LibreTranslate instance (or get a Google Cloud Translation key).
2. Set `TRANSLATE_PROVIDER` and the matching variables in `.env`, restart.
3. Open **What comes next**: the "Translation service" row should read "Configured". Odia and Hindi are described only as far as the provider's own language list and your device's voices support; nothing is assumed.

Without a provider, the chat says translation is not set up and offers no Translate button.

### Account settings

| Variable | Meaning |
|---|---|
| `DATA_FILE` | Where accounts are stored (default `data/sangam-data.json`) |
| `ADMIN_EMAILS` | Who may review interpreter verification |
| `DEV_TOKENS` | Show verification/reset links on screen (default on unless `NODE_ENV=production`) |
| `REQUIRE_EMAIL_VERIFICATION` | `0` lets people use the account area unverified |
| `ACCOUNT_RATE_MULT` | Tests only: scales per-IP limits |

See `.env.example`.

## Tests

```bash
npm test                      # backend smoke (43)
npm run test:features         # acks, presented receipts, emergency, signalling, translation adapter (63)
npm run test:accounts         # accounts API: registration, roles, onboarding, connections, interpreter verification, privacy, restart persistence (129)
npm run test:sign-static      # personal held poses on synthetic hands (45)
npm run test:sign-engine      # sign matching logic on synthetic hands (33)
npm run test:sign-model       # real SL-GCN weights vs. PyTorch golden fixtures; 24 as shipped (ISL only), 33 with ASL also installed
npm run test:sound-engine     # sound detector logic, including the loud-sound fallback (63)
npm run test:e2e              # original two-client flows (18)       - needs a running server
npm run test:integration      # speech, recognition, OCR (9)         - needs a running server
npm run test:browser          # two participants, first-pass features (164)
npm run test:access-browser   # Braille routing, receipts, haptics (incl. Day 2 preset), deafblind options, data, scanning (87)
npm run test:sign-browser     # sign camera: fake camera, mock hands, real ISL (and ASL, if installed) models listed (127)
npm run test:sound-browser    # real YAMNet on synthetic audio, incl. the loud-sound fallback (106)
npm run test:a11y             # axe-core, keyboard, touch targets, reflow (75)
npm run test:all              # starts the servers it needs and runs everything (812 as shipped, 821 with ASL also installed)
```

`TEST_LOG_DIR=./logs npm run test:all` keeps every suite's full output. **Neither 812 nor 821 is one pass rate.** The browser suites use a fake camera, a fake microphone, stand-ins for speech and vibration, mock hand input and synthetic audio. `TEST_REPORT.md` separates automated, browser, mock, real-model, physical-device and user-validation results, and notes an observed, non-reproducible-in-isolation flakiness in the accessibility suite when run as part of the full 12-suite pass.

## Browser and device requirements

| Feature | Needs |
|---|---|
| Speech recognition | Chrome/Edge; network access to the browser's speech service; microphone permission |
| Spoken output | Any browser with `speechSynthesis`; voices vary by device (an Odia voice is often missing) |
| Vibration | Android Chrome or similar. Not available on iPhone Safari or most computers |
| Live voice | `RTCPeerConnection`, microphone permission, `https` or `localhost`; a TURN server for strict networks |
| Sign camera | `getUserMedia`, WebAssembly; `https` or `localhost`; Chromium tested. A phone or laptop camera with decent light |
| Sound alerts | Microphone permission, WebAssembly, AudioWorklet (Chromium tested); `https` or `localhost`. Phones may stop the microphone when the screen is off or the tab is in the background |
| Braille display | A display adapter (none bundled). Web Bluetooth/HID/Serial exist only in Chromium |

## Production deployment

1. Serve over **https** (needed for camera, microphone and live voice). Put Node behind a reverse proxy that terminates TLS and forwards WebSocket upgrades.
2. Set `PUBLIC_BASE_URL` to your public URL and `ALLOWED_ORIGINS` to any extra origins. Keep `.env` out of version control.
3. Provide `ICE_SERVERS` including a **TURN** server if people will be on different networks.
4. Optional translation: set `TRANSLATE_PROVIDER` and its keys on the server only (`docs/TRANSLATION.md`).
5. Sessions and chats are in memory: a restart ends all sessions. Run one instance, or add sticky routing and shared state before scaling out.
6. Keep the `vendor/` folder with the app. The Content-Security-Policy allows no outside hosts.

## Models and downloads

* **YAMNet** (sound): bundled in `vendor/yamnet/`. To replace it with Google's official file, see `vendor/yamnet/README.md`.
* **MediaPipe Hands** (hand tracking), **MediaPipe Holistic** (body+hand tracking for the pretrained sign models) and **MediaPipe Tasks Audio**: bundled and Apache-2.0 (`vendor/LICENSE-APACHE-2.0.txt`, `vendor/mediapipe/hands/NOTICE.md`, `vendor/mediapipe/holistic/NOTICE.md`).
* **ISL model:** a real pretrained model (AI4Bharat OpenHands SL-GCN, trained on INCLUDE, 262 usable words, CC BY 4.0) is **bundled** in `vendor/sign-models/isl/`. See `docs/SIGN_LANGUAGE_MODEL_EVALUATION.md`.
* **ASL model:** the same architecture trained on WLASL2000 (2,000 words). **Not bundled** — its dataset forbids commercial use. Install with `npm run models:install -- asl --accept-wlasl-terms` after reading `docs/MODEL_INSTALLATION_GUIDE.md`.
* To reinstall or verify either model: `docs/MODEL_INSTALLATION_GUIDE.md`.

## Known limitations

- Real microphone/recognition, physical vibration, switch hardware, real Braille displays, real two-device voice calls, real screen readers, a real translation provider, a **real person signing to a real camera**, and **real alarm/doorbell/horn recordings** were **not** available to testing.
- The personal recogniser still recognises only signs you teach it. The pretrained ISL/ASL models recognise a fixed vocabulary of isolated words (262 ISL, 2,000 ASL) that no real Deaf signer has tested against this build — their published 93.5%/30.6% accuracy figures are the original authors' own test-split numbers, not a SANGAM measurement. Neither path does sentence-level translation. See `docs/SIGN_LANGUAGE_MODEL_EVALUATION.md`.
- Sound alerts use uncalibrated model scores and can miss sounds or raise false alarms. Do not rely on them for safety.
- The YAMNet file came from a third-party repack (see `vendor/yamnet/README.md`). Those items are marked "awaiting physical-device testing" or "blocked by external dependency".
- OCR is English only and works best on clear printed text.
- Conversations are not kept after the session ends or the server restarts.
- Volunteers are helpful people, not certified interpreters.

## More documents

`PROJECT_AUDIT_AND_PROBLEM_REGISTER.md`, `THREE_ZIP_COMPARISON.md`, `REQUIREMENTS_REGISTER.md`, `IMPLEMENTATION_PLAN.md`, `IMPLEMENTATION_REPORT.md`, `INTEGRATION_REPORT.md`, `TEST_REPORT.md`, `CHANGELOG.md`, `docs/SIGN_LANGUAGE_CAMERA.md`, `docs/SIGN_LANGUAGE_MODEL_EVALUATION.md` (the real pretrained ISL/ASL models — start here), `docs/LIVE_WEBCAM_TEST_PROCEDURE.md` (how to test real webcam recognition yourself), `docs/MODEL_INSTALLATION_GUIDE.md`, `docs/SIGN_LANGUAGE_MODEL_RESEARCH.md` (earlier research, superseded, kept for its trail), `docs/SOUND_ALERTS.md`, `docs/TRANSLATION.md`, `docs/DEAFBLIND_VALIDATION_PLAN.md`, `docs/ACCESSIBILITY_GUIDE.md`, `docs/BRAILLE_DEVICE_ADAPTER.md`, `docs/previous/` (earlier notes, preserved).

## New documentation (accounts, accessibility, interface)

Start with `docs/FEATURE_AUDIT.md` (what is done, verified, partial, blocked) and `docs/IMPLEMENTATION_PROGRESS.md`. Architecture: `PROJECT_ARCHITECTURE`, `DATABASE_SCHEMA`, `API_DOCUMENTATION`, `SECURITY_AND_PRIVACY`. Accessibility: `ACCESSIBILITY_ARCHITECTURE`, `BLIND_USER_IMPLEMENTATION`, `SCREEN_READER_GUIDE`, `VOICE_NAVIGATION_GUIDE`, `KEYBOARD_ACCESSIBILITY`, `LOW_VISION_ACCESSIBILITY`, `ACCESSIBILITY_UI_AUDIT`. Sign recognition: `STATIC_SIGN_RECOGNITION`, `DYNAMIC_SIGN_RECOGNITION`, `SIGN_DATASET_PROVENANCE`, `MODEL_TRAINING_GUIDE`, `CAMERA_TROUBLESHOOTING`. Interface: `SANGAM_USER_JOURNEY`, `ROLE_ARCHITECTURE`, `INFORMATION_ARCHITECTURE`, `SCREEN_INVENTORY`, `DESIGN_SYSTEM`, `COLOUR_TYPOGRAPHY_GUIDE`, `COMPONENT_LIBRARY`, `ONBOARDING_FLOW`, `DASHBOARD_DESIGN`, `RESPONSIVE_DESIGN`, `FRONTEND_BACKEND_MAPPING`, `UI_TEST_REPORT`, `UI_CHANGELOG` (all in `docs/`).
