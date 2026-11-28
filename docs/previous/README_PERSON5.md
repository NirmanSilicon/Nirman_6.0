# SANGAM — Person 5 module (hardened build)

This covers the Person 5 work for SANGAM: **QR communication, real-time chat,
SANGAM Learn, human assistance, and turn management**, added to the existing
SANGAM website without disturbing the features that were already there. This
build is the **security audit + fixes** on top of the first Person 5 drop.

> The original project notes are preserved in `README.txt`. This file is the
> guide for everything Person 5 added and for running the project now that it
> has a backend.

---

## 1. Architecture summary

**Frontend — a static single-page app, no build step.**

- `index.html` — one page. Navigation is hash-based: `#/`, `#/about`,
  `#/dashboard`, `#/dashboard/<feature>`, `#/join/<id>/<token>`. An inline SVG
  sprite supplies all icons.
- `assets/app.js` — one IIFE. A `FEAT` registry drives the dashboard dropdown,
  cards and tabs. The access profile is saved in `localStorage` (`sangam.v2`).
  Original features (Access profile, Speak & caption, Read from a photo,
  Phrase board) are untouched; the only change is three new `FEAT` entries and
  a small `window.Sangam` export of shared helpers.
- `assets/styles.css` — the full visual system (dark theme).
- Person 5 client modules: `assets/connect.js` (QR + chat + turns),
  `assets/learn.js`, `assets/assist.js`.

**Backend — `server/server.js` (Node + Express + ws + qrcode).**

- Serves the pre-existing static site **unchanged**.
- Communication sessions: create / join / end with secure tokens and expiry.
- WebSocket relay at `/ws` for real-time messaging, presence, typing, turns.
- Server-generated QR code (data URL) so the client stays simple.
- Volunteer assistance REST API with real authorization.
- Storage is **in-memory only.** Private conversation text is never written to
  disk. Documented limitation.

---

## 2. Bugs found and fixed in this build

These are the issues from the security audit, each confirmed in the code of the
previous build and fixed here.

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | critical | **Participant-limit bypass.** A client could send `?pid=anything` to skip the `MAX_PARTICIPANTS` check and mint a new participant beyond the cap. | WS upgrade now ignores client-supplied `pid` unless it matches an existing participant **and** the client also presents the matching `participantKey`. Anything else is a fresh participant subject to the size cap. |
| 2 | critical | **Participant impersonation.** If a client guessed another participant's `pid` (leaked via `welcome`/`presence`/`message` broadcasts), it could adopt that identity. | Reconnect requires BOTH `pid` **and** `participantKey`. `participantKey` is a 24-char server-minted secret sent exactly once in the `welcome` frame. Mismatch = new participant. |
| 3 | critical | **Role spoofing.** `role=host` was taken from the URL; any client could announce itself as the host. | `role` is **not** client-asserted. A connection becomes `host` only if it presents the session's `hostKey` on the WS upgrade and the key matches. A wrong `hostKey` closes with code `4003` *before* the participant-limit check. |
| 4 | critical | **Unauthenticated volunteer endpoints.** `GET /api/assist/requests`, `/accept`, `/complete` accepted any caller. Anyone with the request id could accept or close someone else's work. | New `POST /api/assist/volunteer` provisions `{ volunteerId, volunteerKey }` per browser (stored in localStorage). `requireVolunteer` middleware enforces it on `list / accept / decline / complete`. |
| 5 | critical | **Non-atomic accept.** Two volunteers could both accept the same request. | `/accept` is a compare-and-set on `status === "pending"`. First authorised writer wins; later attempts get `409`. The accepted request records `acceptedBy = volunteerId`. |
| 6 | critical | **Anyone could complete.** `/complete` had no auth at all. | Only the owner (via `claimKey`) or the accepting volunteer (via `volunteerKey` matching `acceptedBy`) can complete. Any other caller gets `403`. |
| 7 | critical | **Request-id enumeration.** 8-char ids from a small filtered alphabet were brute-forceable given the attack surface above. | Request / session ids now use 12 chars from a 24-byte pool (~71 bits of entropy). |
| 8 | high | **Turn-event spoofing.** Any participant could set `session.turn` to any pid. | `turn` events are authorised by mode: `pass` / `set` require the sender to currently hold the turn (or nobody does); `wait` ("I need more time") is anyone; `claim` requires that no one holds the turn. Others get a `forbidden` error, no state change. |
| 9 | medium | **No rate limit.** A hostile client could flood the WS and re-broadcast to everyone. | Per-socket sliding-window limit (default 40 frames per 10s, env-tunable), plus per-IP caps on `POST /api/sessions`, `/api/assist/requests`, `/api/assist/volunteer`. |
| 10 | medium | **No Origin check on WS.** Any cross-origin page knowing the token could open a socket. | Upgrade handler rejects origins not in `{ localhost, 127.0.0.1, same-origin, PUBLIC_BASE_URL, ALLOWED_ORIGINS }` with `403`. |
| 11 | medium | **Stuck turn on disconnect.** If the turn-holder dropped off, the conversation was stuck on their name forever. | On disconnect, after a 20s grace, the server auto-releases a turn held by a disconnected participant and broadcasts `turn { mode: "released" }`. |
| 12 | medium | **Message validation gaps.** Non-string `text` could reach the broadcast path. | WS message handler: type check on every event; text/clarifyType clamped at the edge; oversize raw frames rejected with `too_large`. |
| 13 | low | **Volunteer `displayName` not server-trusted.** A client could put arbitrary HTML in the display name posted to accept; the UI escaped it, but store-side it was still raw. | Volunteer display name is stored on the server-side volunteer record and used for `volunteerName` on accept by default, so server trusts its own string. |
| 14 | low | **Owner `complete` from the UI failed with the hardened server.** The previous UI posted `/complete` with `{}`, which now requires either `claimKey` or `volunteerKey`. | UI sends `{ key: rec.claimKey }` on the owner-side Complete button. |

---

## 3. Install and run

Requirements: **Node.js 18+**.

On Windows, double-click **Run Sangam.bat** in this folder. It installs the locked dependencies on the first run if needed, starts the local server, and opens `http://localhost:8080` in Chrome when Chrome is installed. Keep the command window open while using SANGAM. If Chrome is not found, it opens the default browser instead.

```bash
cd sangam-web
npm install              # express, ws, qrcode
cp .env.example .env     # optional
npm start                # http://localhost:8080
```

- **Frontend run:** `npm start` serves the site. (The old static `python -m http.server` works for the pre-Person-5 features only.)
- **Backend run:** same process — `npm start`.
- **Tests:** `npm test` runs the headless smoke test (34 checks).
- **Browser E2E:** see §9.

### Configuration (`.env`)

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | 8080 | Port |
| `PUBLIC_BASE_URL` | auto | Base URL used in QR links; set when behind a tunnel/domain |
| `SESSION_TTL_MINUTES` | 60 | Session joinability window |
| `ASSIST_TTL_MINUTES` | 180 | Assistance-request retention |
| `MAX_PARTICIPANTS` | 8 | Max participants per session |
| `MSG_RATE_WINDOW_MS` / `MSG_RATE_MAX` | 10000 / 40 | Per-socket WS rate limit |
| `MAX_TEXT_LEN` | 1000 | Hard cap on a single chat message |
| `ALLOWED_ORIGINS` | — | Comma-separated extra allowed origins for WS |
| `RECONNECT_GRACE_MS` | 30000 | Milliseconds before a disconnected participant's slot is released |

---

## 4. REST API

All responses are JSON. `no-store` on `/api/*`.

### Sessions

| Method · Path | Body / Query | Returns | Notes |
|---|---|---|---|
| `GET  /api/health` | — | `{ ok, sessions, requests, volunteers, ts }` | Diagnostics |
| `POST /api/sessions` | `{ name? }` | `{ id, name, token, hostKey, joinUrl, qrDataUrl, createdAt, expiresAt, wsPath }` | Rate-limited per IP. `hostKey` is for the creator ONLY. |
| `GET  /api/sessions/:id` | `?token=` | `publicSession` or `403`/`404`/`410` | Validates join token. |
| `POST /api/sessions/:id/end` | `{ hostKey }` | `{ ok, status: "ended" }` or `403` | Creator-only. |

### Assist

| Method · Path | Body / Query / Headers | Returns | Notes |
|---|---|---|---|
| `POST /api/assist/volunteer` | `{ displayName?, languages?, categories?, availability? }` | `{ volunteerId, volunteerKey, displayName, languages, categories, availability }` | Per-browser identity. Save to localStorage. |
| `PUT  /api/assist/volunteer` | `{ displayName?, languages?, categories?, availability? }` + volunteer headers | `{ volunteerId, displayName, languages, categories, availability }` | Update profile. |
| `POST /api/assist/requests` | `{ category, language, method?, description? }` | `{ id, claimKey, status: "pending", createdAt }` | Rate-limited. `category` ∈ `language | communication | accessibility | interpreter`. |
| `GET  /api/assist/requests` | volunteer headers | `{ requests: publicRequest[] }` or `401` | Lists pending + the caller's accepted requests. |
| `GET  /api/assist/requests/:id` | `?key=` (claimKey) | ownerRequest or `403`/`404` | Requester polls their own. |
| `POST /api/assist/requests/:id/accept` | `{ volunteerName? }` + volunteer headers | `{ ok, status: "accepted", joinUrl, hostKey }` or `401`/`404`/`409` | Atomic. Accepting volunteer gets `hostKey` for the derived chat. |
| `POST /api/assist/requests/:id/decline` | volunteer headers | `{ ok, status }` | Server-side decline persistence; declined request hidden from that volunteer on subsequent list calls. |
| `POST /api/assist/requests/:id/complete` | `{ key? }` body or volunteer headers | `{ ok, status: "completed" }` or `403`/`409` | Owner (claimKey) or accepting volunteer only. |
| `POST /api/assist/requests/:id/cancel` | `{ key }` | `{ ok, status: "cancelled" }` or `403`/`409` | Owner-only. |

**Volunteer headers:** `X-Volunteer-Id: <volunteerId>`, `X-Volunteer-Key: <volunteerKey>`. Query equivalents `?vid=`/`?vk=` are accepted.

---

## 5. WebSocket contract — `/ws`

### Upgrade (query parameters)

| Param | Required | Meaning |
|---|---|---|
| `session` | yes | Session id. |
| `token` | yes | Session join token. |
| `name` | yes | Display name (clamped to 60 chars). |
| `pid` + `pkey` | optional (both or neither) | Reconnect as an existing participant. Both must match, or both are ignored. |
| `hostKey` | optional | Presenting a valid hostKey promotes the connection to `role: "host"`. A wrong key closes with `4003`. |

### Close codes

| Code | Meaning |
|---|---|
| `4000` | Session ended (`reason` carried in the close frame and in `session-ended`). |
| `4003` | Forbidden (bad token, bad hostKey, unauthorised). |
| `4004` | Session not found. |
| `4009` | Session full. |
| `4010` | Session expired. |

### Server → Client events

```
{ type: "welcome",   pid, participantKey, role, session, roster, history: [...] }
{ type: "presence",  roster, session, joined?: {pid,name,role}, left?: {pid,name} }
{ type: "message",   message: {id, from, fromName, text, kind, clarifyType, ts}, turn }
{ type: "typing",    pid, name, state: boolean }
{ type: "turn",      turn: pid|null, by: pid, mode: "pass"|"wait"|"claim"|"released" }
{ type: "read",      pid, upTo: id|null }
{ type: "session-ended", reason: "ended"|"expired" }
{ type: "pong",      ts }
{ type: "error",     code, message }
```

`participantKey` is sent **exactly once** in `welcome`. The client **must** store it for reconnects.

### Client → Server events

```
{ type: "message", text: string, kind?: "message"|"clarify", clarifyType?: string }
{ type: "typing",  state: boolean }
{ type: "turn",    mode: "pass"|"wait"|"claim"|"set", to?: pid }
{ type: "read",    upTo?: id }
{ type: "ping" }
```

Unknown types are silently dropped. The server never accepts a client-fabricated `welcome`, `presence`, `message` broadcast (identity is stamped server-side), or `session-ended`.

### Turn authorisation matrix

| `mode` | Who may send | What it does |
|---|---|---|
| `pass` / `set` | Current turn holder (or nobody) | Sets `turn` to `to` (or `null`). |
| `wait` | Anyone | Broadcasts "I need more time". Does **not** change `turn`. |
| `claim` | Anyone when `turn === null` | Sender takes the turn. |
| `released` | Server-only | Auto-emitted 20s after the turn holder disconnects. |

A `message` auto-advances the turn to the other side in a two-person session.

---

## 6. Running two-device QR tests

A sandboxed cloud server can't be reached by a real phone. Pick one:

- **Same Wi-Fi:** `PORT=8080 npm start`, open `http://<your-LAN-ip>:8080` on the phone, scan the QR.
- **Public tunnel:** `npx localtunnel --port 8080` (or ngrok). Set `PUBLIC_BASE_URL=https://<url>` in `.env` and restart so the QR encodes the public address.
- **Two browser windows / incognito:** works locally; no second device needed.

### Automated two-client test

`npm test` — 43 headless security + API checks (including Person 5 enhancements: decline persistence, volunteer profiles, reconnect grace, turn claim, message validation).

`node test-e2e.js` — 18 browser checks against a running server (requires playwright):
```bash
npm install -D playwright && npx playwright install chromium
PORT=8097 npm start &
BASE=http://localhost:8097 node test-e2e.js
```

### Results in this build

- **Smoke test (`npm test`):** 43 passed, 0 failed.
- **Browser E2E (`node test-e2e.js`):** 18 passed, 0 failed.

The one "FAIL" you may still see in some sandboxes is the external Google Fonts link being blocked. It's cosmetic only — the bundled Atkinson / Archivo fonts under `assets/fonts/` take over.

---

## 7. Completed features

- **QR communication** — create, QR code, copy-link, live status + countdown, end session, join via QR or link, mobile-friendly join page, temporary display name.
- **Real-time messaging** — ordered WS delivery, presence, typing, duplicate/empty guards, reconnect with saved identity, no false "delivered".
- **Turn management** — whose-turn, typing, explicit **Pass turn**, **Claim turn** (when no one holds it), and **I need more time** with configurable time options (30s / 1 min / 2 min), clarification chips (Repeat / Rephrase / Please wait / I didn't understand / Confirm). Auto-release after disconnect with configurable grace period.
- **SANGAM Learn** — searchable, filterable cards for ISL basics (linked to the ISLRTC *Sign Learn* app and the Government of India ISL dictionary — no invented gestures), disability awareness, communication etiquette.
- **Human assistance** — authenticated volunteer workflow with profile fields (languages, categories, availability), atomic accept, server-side decline persistence, status-only-on-real-action, owner cancellation, scoped list, clear "not a certified interpreter" disclaimer.
- **Reconnection grace period** — disconnected participants retain their slot for 30s (configurable via `RECONNECT_GRACE_MS`), preventing premature slot release during brief network interruptions.
- **Accessibility** — labelled controls, `aria-live` regions, keyboard operation, visible focus, large touch targets, alternative join link (not camera-only), "read new messages aloud" option. No critical info via colour alone.

---

## 8. Limitations (honest list)

- **In-memory storage.** A server restart clears sessions, requests, volunteer keys. Fine for a prototype; swap in Redis/DB for production. Conversation text is intentionally not persisted.
- **Prototype volunteer auth.** `volunteerKey` is a per-browser secret, not a verified account. There is no vetting, rating, or account recovery. Good enough to demo the workflow with real authorization boundaries, not a public marketplace.
- **Localhost ≠ cross-device.** See §6; needs LAN IP or a tunnel for a real phone test.
- **ISL content is explanatory, not a signing tutor.** Learn points to official verified resources for the exact signs.
- **Browser speech features** (captions / speak-aloud) remain browser-dependent; unchanged from the original project.

## 9. Known issues

- The page's `<link>` to Google Fonts fails in offline / locked-down networks and the bundled local fonts under `assets/fonts/` are used instead — cosmetic only. (Pre-existing behaviour from the original build.)

---

## 10. How Person 5 connects to the rest of SANGAM

- **Shared access profile.** Chat reuses the existing `localStorage` profile and `speak()` via `window.Sangam.profile` / `.speak`. No duplicate profile system.
- **One message shape:** `{ id, from, fromName, text, kind, clarifyType, ts }`. Other modules (Voice-to-Text, Text-to-Voice, AAC, MODEMESH, Haptics, Language Bridge) can subscribe to the same WebSocket and present a `message` in whatever mode the participant chose. `kind`/`clarifyType` metadata is there for accessibility routing.
- **Integration points:**
  - WebSocket `/ws` — see §5.
  - REST — see §4.
  - `window.Sangam` — `ic`, `esc`, `toast`, `speak`, `braille`, `pattern`, `profile`.
  - MODEMESH integration = subscribe to `message` events, transform `message.text` (Braille via `window.Sangam.braille`, haptics via `window.Sangam.pattern`). Nothing extra needed server-side.
- The assist accept flow **reuses** Feature 1 by opening a real session for the pair, rather than duplicating chat. The accepting volunteer gets `hostKey` so they can end the derived session.

No existing feature was removed or rewritten.
