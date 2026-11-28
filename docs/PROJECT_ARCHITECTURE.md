# SANGAM project architecture

SANGAM is a Node/Express server plus a static browser frontend written in plain HTML, CSS and JavaScript. There is no build step.

## Runtime layout

| Part | Where | What it does |
|---|---|---|
| HTTP + WebSocket server | `server/server.js` | Serves `/assets` and `/vendor` only; REST API; real-time chat sessions (QR join), volunteer assistance, signalling for live voice, optional translation adapter |
| Accounts layer | `server/accounts.js`, `server/db.js` | Registration, sessions, roles, onboarding, connections, interpreter requests, notifications, learning progress. One JSON file store (see DATABASE_SCHEMA.md) |
| Frontend shell | `index.html`, `assets/app.js` | Public landing page, the guest workspaces (`#/dashboard/*`), hash router, shared header |
| Account area | `assets/account.js`, `assets/account-dash.js`, `assets/account.css` | Sign in, register, verify, role choice, onboarding wizard, four role dashboards, settings, help, privacy, terms |
| Voice navigation | `assets/voice-nav.js` | Optional spoken commands (see VOICE_NAVIGATION_GUIDE.md) |
| Sign Language Camera | `assets/sign.js`, `sign-engine.js`, `sign-letters.js`, `sign-static.js`, `sign-model.js`, `sign-worker.js` | Hand/body tracking in the browser, three families of recogniser (see STATIC_SIGN_RECOGNITION.md and DYNAMIC_SIGN_RECOGNITION.md) |
| Vendored libraries | `vendor/` | MediaPipe Hands/Holistic, TensorFlow.js, model files. Served locally; no CDN |

## Request flow for a signed-in page

1. The browser loads `index.html` and the scripts. `account.js` calls `GET /api/me`.
2. `gate()` decides the route: signed out -> sign in; unverified -> verify; no role -> role choice; onboarding unfinished -> next unfinished step; otherwise the role's dashboard.
3. Every account API call carries the header `X-Sangam-Client: 1` and the HttpOnly session cookie. The server checks who is asking, their role, and (for another person's data) an approved connection.
4. The dashboard also trims the guest workspaces to those relevant to the role (`Sangam.setFeatures`).

## What is stored and where

- Server: the JSON file named by `DATA_FILE` (default `data/sangam-data.json`). Never served to browsers.
- Browser: `localStorage` keys `sangam.v2` (device accessibility profile), `sangam.sign.consent.v1`, `sangam.sign.personal.v1` (taught moving signs), `sangam.sign.static.v1` (taught held poses), `sangam.voicenav.consent.v1`, `sangam.phrases`. Landmarks only; no camera pictures.
- Chat messages: held in memory for the life of a session; never written to the account file. Session history stores who and when only.

## Deliberate limits

- One server process only (the JSON store would be overwritten by a second process).
- No email sender, no SMS, no payment, no third-party login.
- No cloud AI service is called. Optional translation is off unless configured.