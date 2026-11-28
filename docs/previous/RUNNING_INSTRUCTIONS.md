# SANGAM — Running Instructions

This is the consolidated project: the master `SANGAM_Integrated_Complete` build (Node/Express/ws server, QR sessions, real-time chat with turns, volunteer assistance, SANGAM Learn, and the AAC phrase board/composer), with four frontend bug fixes ported in from the `this.zip` archive. See `INTEGRATION_AUDIT.md` for exactly what changed and why, and `TEST_REPORT.md` for verification results.

## 1. Requirements

- Node.js 18 or newer.
- A modern Chromium- or Firefox-based browser for the frontend. Speech recognition ("Speak and caption") needs Chrome or Edge specifically — it is a browser limitation, not a SANGAM one.

## 2. Install dependencies

```bash
cd sangam-web      # or whatever you named the extracted folder
npm install
```

This installs `express`, `ws`, and `qrcode` (see `package.json`). No other setup is required — there is no database and no external service to provision.

## 3. Configure environment variables (optional)

```bash
cp .env.example .env
```

Edit `.env` if you need to change the port, session lifetime, or allowed origins. Every variable has a sensible default, so this step can be skipped for local use. See `README_PERSON5.md` §3 for the full list (`PORT`, `PUBLIC_BASE_URL`, `SESSION_TTL_MINUTES`, `ASSIST_TTL_MINUTES`, `MAX_PARTICIPANTS`, `MSG_RATE_WINDOW_MS`/`MSG_RATE_MAX`, `MAX_TEXT_LEN`, `ALLOWED_ORIGINS`, `RECONNECT_GRACE_MS`).

## 4. Start the application

```bash
npm start
```

This starts the single Node process that both serves the static frontend and runs the WebSocket/REST backend — there is nothing separate to start for "frontend" vs "backend." By default it listens on `http://localhost:8080`.

On Windows, double-clicking `Run Sangam.bat` does the same thing.

## 5. Access the application

Open `http://localhost:8080` in a browser. From the home page:

- **Dashboard → Access profile** — choose how you send/receive (voice, text, switch; captions, spoken audio, haptic, Braille).
- **Dashboard → Speak and caption** — live captions in, spoken reply out.
- **Dashboard → Read from a photo** — point a camera/photo at printed text; now with image preprocessing for better accuracy on phone photos.
- **Dashboard → Phrase board** — tap-to-speak AAC tiles, editable and composable into a message.
- **Dashboard → Connect & chat** — create a session, share the QR code or link, chat in real time with turns.
- **Dashboard → SANGAM Learn** — ISL basics, disability awareness, communication etiquette.
- **Dashboard → Human assistance** — request a volunteer; volunteers see and accept open requests.

To test the two-device QR flow for real, either put both devices on the same Wi-Fi and open `http://<your-LAN-ip>:8080` on the second one, or use a tunnel (`npx localtunnel --port 8080`, or ngrok) and set `PUBLIC_BASE_URL` in `.env` so the generated QR encodes the public URL. Two browser windows/incognito on one machine also works for a local check.

## 6. Running the tests

```bash
npm test                 # server/smoke-test.js — 43 headless API/security checks, no browser needed
npm run test:e2e         # test-e2e.js — 18 Playwright browser checks (needs the server NOT already using the same port, or set BASE)
npm run test:integration # test-integration-fixes.js — 9 targeted checks for this round's ported fixes
```

`test:e2e` and `test:integration` need Playwright's Chromium installed once: `npx playwright install chromium` (skip if already installed on your machine). Both scripts read `BASE` from the environment if you want to point them at a server you started separately, e.g.:

```bash
PORT=8097 npm start &
BASE=http://localhost:8097 npm run test:e2e
BASE=http://localhost:8097 npm run test:integration
```

All 70 checks across the three suites pass as of this build (see `TEST_REPORT.md`).

## 7. What is NOT verified by the automated tests

- Real cross-device QR scanning with a physical phone camera.
- Real microphone and speaker hardware (the tests stub the browser Speech APIs to verify the application's *logic*, not real audio hardware).
- Physical Braille or haptic devices.
- Screen-reader software (NVDA/JAWS/VoiceOver) paired with real assistive hardware.
- Production deployment behind a real domain/TLS — the server itself has no deployment-specific code, but this was not exercised here.

These require a human with the relevant device or software and are called out explicitly rather than claimed as passing.
