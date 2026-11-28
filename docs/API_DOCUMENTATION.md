# SANGAM Person 5 API

Base URL: same origin as the web app. All API responses are JSON and `/api/*` responses are marked `no-store`.

## REST routes

| Method and route | Purpose | Authentication |
|---|---|---|
| `GET /api/health` | Health and runtime status | None |
| `POST /api/sessions` | Create a communication session and QR payload | None; rate limited |
| `GET /api/sessions/:id` | Read public session status | None |
| `POST /api/sessions/:id/end` | End a session | Host key in request body |
| `POST /api/assist/volunteer` | Provision a browser volunteer identity | None; rate limited |
| `PUT /api/assist/volunteer` | Update volunteer profile/availability | Volunteer key |
| `POST /api/assist/requests` | Create assistance request; returns owner claim key | None; rate limited |
| `GET /api/assist/requests` | List open requests | Volunteer key |
| `GET /api/assist/requests/:id` | Read request status | Public status view |
| `POST /api/assist/requests/:id/accept` | Atomically accept pending request | Volunteer key |
| `POST /api/assist/requests/:id/decline` | Hide request for this volunteer | Volunteer key |
| `POST /api/assist/requests/:id/complete` | Complete accepted request | Owner claim key or accepting volunteer key |
| `POST /api/assist/requests/:id/cancel` | Cancel request | Owner claim key |

Request and response fields are validated in `server/server.js`. Errors use `{ "error": "code", "message": "Human-readable detail" }`; clients should use the HTTP status as the authoritative outcome. Request creation returns the secret `claimKey` once. Treat it as a password and do not share it with other participants.

## WebSocket

Connect to `/ws?session=<id>&token=<join-token>`. A host additionally presents `hostKey`; reconnecting participants present both `pid` and `pkey`. The server mints participant credentials in the `welcome` event. Do not put host or participant credentials in public QR data.

Client events: `message {text}`, `typing {state}`, `turn {mode,to,seconds}`, `read {upTo}`, and `ping`. Server events include `welcome {pid,pkey,role,session,roster,history}`, `presence`, `message`, `typing`, `turn`, `read`, `error`, and `session-ended`. The server validates event shape, enforces message limits and rate limits, and authorizes turn changes. Group sessions require explicit turn operations; two-person sessions hand off after a message.

## Lifecycle and persistence

Sessions expire after `SESSION_TTL_MINUTES`; disconnected participant identity is retained for `RECONNECT_GRACE_MS`. Session, message, volunteer and request records are in memory and are lost on restart. This build intentionally does not claim durable persistence. Add a transactional shared store before multi-instance or production deployment; preserve the current in-memory adapter for local development.

## Integration notes

Accessibility preferences remain local to each user's profile and are not broadcast in participant presence. MODEMESH or other modality adapters should consume message events and publish normalized text through the existing `message` event; this server does not perform speech recognition, translation, sign-language interpretation, or hardware haptics.

## Additions in the integrated build

### REST

| Route | Purpose | Authentication |
|---|---|---|
| `GET /api/capabilities` | What this server can do right now: whether a translation provider is configured (and which languages it reports), ICE servers for live voice, text length limit, persistence mode (`memory`). Never contains a credential. Sent with `Cache-Control: no-store`. | None |
| `POST /api/translate` | Translate `{sessionId, pid, pkey, text, source, target}` with the configured provider. Answers `501 translation_not_configured` when no provider is set (it never returns invented text), `403` for anyone who is not a participant of an active session, `429` when rate limited, `502/504` on provider failures (`provider_error`, `provider_bad_response`, `provider_unreachable`, `provider_timeout`). | Participant key (`pid` + `pkey`) of an active session; per-IP and per-participant rate limits |

The provider credential is read from the server environment and sent to the provider in a request header. It is never returned to the browser.

### WebSocket frames added

Client to server:

- `message {cid, text, kind, source, orig, lang, clarifyType}`. `cid` is a client-generated id used to de-duplicate retries. `source` is one of `typed`, `voice`, `ocr`, `phrase`, `translated`; anything else is replaced with `typed`. `orig` and `lang` are kept only when `source` is `translated`. `kind: "emergency"` forces `source` to `emergency`.
- `ack {id}`: the recipient confirms the message was received. Only this produces a `delivered` frame.
- `emergency-ack {id}`: a recipient confirms they have seen an emergency message. A sender cannot acknowledge their own.
- `rtc {to, signal}`: WebRTC signalling (`offer`, `answer`, `candidate`, `decline`, `hangup`) relayed only to the named participant in the same session. Signalling to yourself, to a non-participant or of an unknown kind is refused. Frames over 16 KB are rejected.

Server to client:

- `message {id, cid, from, text, source, duplicate?}`. The sender receives its own message back with its `cid`; that echo is the "Sent" confirmation. A retried `cid` is confirmed again but not re-delivered to the peer (`duplicate: true`).
- `delivered {id}`: only after a peer `ack`.
- `emergency-ack {id, by, byName, ts}`.
- `rtc {from, fromName, signal}`.

Accessibility preferences are never part of any frame. Each participant renders received messages according to their own local profile.

## Accounts API

All routes are JSON. Every state-changing request needs the header `X-Sangam-Client: 1` and, if the browser sends `Origin`, it must match the host. The session is the HttpOnly cookie `sangam_sid`. Errors: `{ "error": "<code>", "message": "<plain text>", "fields": { "<field>": "<message>" } }` with status 400 (validation), 401 (sign in), 403 (role, verification or CSRF), 404, 409, 410 (expired token), 429 (rate limit).

| Method and path | Who | Purpose |
|---|---|---|
| `POST /api/auth/register` | anyone | Create account (`name`, `email`, `password`, `acceptTerms`). Signs in. In development mode returns `dev.verifyToken`, labelled "NOT emailed" |
| `POST /api/auth/login`, `/logout` | anyone / signed in | Sign in (`remember` optional) / end this session |
| `POST /api/auth/verify`, `/resend-verification`, `/change-email` | token / signed in | Verify email (24 h token), resend (60 s cooldown), change the unverified address |
| `POST /api/auth/forgot`, `/reset` | anyone | Reset (1 h token; always the same reply; ends all sessions) |
| `GET /api/me` | anyone | Current account, onboarding state, role data, invitation code (primary), verification (interpreter); `{signedIn:false}` when signed out |
| `PUT /api/me/profile`, `/settings` | verified | Name, language, picture; notification switches, discover-by-email |
| `POST /api/me/password` | signed in | Change password (needs current one; signs out other devices) |
| `GET /api/me/export`, `DELETE /api/me` | signed in | Download own data; delete account |
| `POST /api/me/role`, `/role/change` | verified | Choose role once; change later (password again) |
| `PUT /api/me/onboarding/:step`, `POST /api/me/onboarding/complete` | verified | Validated per role and step; finish |
| `PUT /api/me/preferences` | primary | How I send/receive, display, navigation, audio |
| `POST /api/interpreter/submit`, `PUT /api/interpreter/availability` | interpreter | Submit for review; set availability |
| `GET /api/admin/interpreters?status=`, `POST /api/admin/interpreters/:id/verification` | administrator | List and decide: `verified`, `rejected`, `additional_info_required` with a note |
| `GET /api/connections/lookup?code=`, `GET /api/connections`, `POST /api/connections` | supporter / any / supporter | Look up an invitation code (display name only); list; request |
| `POST /api/connections/:id/respond`, `PUT /:id/permissions`, `POST /:id/revoke`, `POST /:id/session` | primary / primary / either / either | Approve or decline; change permissions; end; start a chat session (needs `messages`) |
| `POST /api/interpreter-requests`, `GET /mine`, `POST /:id/cancel`, `/:id/complete` | primary, supporter | Ask for an interpreter; list own; cancel; end |
| `GET /api/interpreter/requests`, `POST /api/interpreter-requests/:id/accept`, `/:id/decline` | verified interpreter | Inbox (language-matched, available); first accept wins |
| `GET /api/comm-sessions` | signed in | Own session history: who, when, state. Never message text |
| `GET /api/notifications`, `POST /read-all`, `POST /:id/read`, `DELETE /:id` | signed in | Own notifications |
| `GET/PUT /api/learning/progress` | signed in | Completed lessons, bookmarks, last lesson |

Rate limits (per IP unless stated): register 10/h, login 25/10 min (plus a per-email limit), verify 20/10 min, resend 10/h, forgot 8/h, reset 10/h, password change 10/h, role change 10/h, lookup 30/10 min, connection requests 20/h, interpreter requests 15/h, account delete 5/h. `ACCOUNT_RATE_MULT` multiplies the per-IP limits (tests only).
