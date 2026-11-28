# Database schema

Storage is **one JSON file** (`DATA_FILE`, default `data/sangam-data.json`), loaded into memory and rewritten atomically (write to `.tmp`, rename). A corrupt file is moved aside as `*.corrupt-<time>`, never silently discarded. This was chosen over SQLite because native database modules fail to build on many Windows machines and Node's built-in `node:sqlite` needs a newer Node than this project's "Node 18 or newer". Limits: one server process only; the whole data set is in memory; every write rewrites the file. Suitable for a pilot of hundreds of accounts, not thousands of concurrent users. All access goes through `server/accounts.js`, so replacing `server/db.js` with a real database later does not touch the application.

Top-level: `{ version: 1, users, emailIndex, sessions, tokens, connections, notifications, interpreters, interpRequests, commSessions, learning }`, each an object keyed by id (or hash).

| Collection | Key | Fields |
|---|---|---|
| `users` | user id | `email`, `name`, `passwordHash` (`scrypt$N$r$p$salt$hash`), `verified`, `createdAt`, `termsAcceptedAt`, `lastLoginAt`, `role` (`primary|secondary|community|interpreter|null`), `isAdmin` (recomputed from `ADMIN_EMAILS`), `profile{displayName, language, avatar, formOfAddress}`, `roleData{<role>: {...}}`, `onboarding{<role>: {done{step:true}, completed, completedAt}}`, `settings{notifications{messages,connections,interpreter,learning}, discoverByEmail}`, `inviteCode` (primary users; 8 characters), `verify` |
| `emailIndex` | lower-case email | user id (unique email) |
| `sessions` | SHA-256 of the cookie token | `userId`, `createdAt`, `lastSeen`, `remember`, `expiresAt` |
| `tokens` | SHA-256 of kind+token | `userId`, `kind` (`verify|reset`), `expiresAt` |
| `connections` | id | `primaryId`, `supporterId`, `status` (`pending|approved|declined|revoked`), `relationship`, `permissions{messages, preferences, transcripts}` (all false until approved), `createdAt` |
| `notifications` | id | `userId`, `type`, `title`, `body`, `link`, `createdAt`, `read` |
| `interpreters` | user id | `status` (`not_submitted|pending_review|verified|rejected|additional_info_required`), `submittedAt`, `updatedAt`, `note`, `history[]` (who changed it and when) |
| `interpRequests` | id | `requesterId`, `language`, `sessionType`, `proposedTime`, `note`, `status` (`open|accepted|completed|cancelled|expired`; an interpreter's decline is recorded in `declinedBy[]`, and an open request expires after 6 hours), `declinedBy[]`, `interpreterId`, `createdAt` |
| `commSessions` | id | `kind`, `refId`, `sessionId`, `joinPath`, `userIds[]`, `label`, `startedBy`, `startedAt`. **Who and when only; message text is never stored** |
| `learning` | user id | `completed{lessonId:time}`, `bookmarks{}`, `last`, `recent[]` |

## Integrity rules enforced in code

- Emails are unique, compared lower-case.
- Each role has its own onboarding record and data. Changing role needs the password again, keeps everything entered for earlier roles (switching back finds it), and never grants interpreter verification. An interpreter's verification status is held in `interpreters`, not in the user record, and only an administrator route can change it. Editing the professional details of a verified interpreter returns the status to `pending_review`.
- Deleting an account removes the user, sessions, tokens, notifications, learning progress, the interpreter record, their interpreter requests, and connections involving them (the other person is told the connection ended). An interpreter request they had accepted goes back to `open`.
- Export (`GET /api/me/export`) returns the person's own records only.

## Not in the file

Camera images, audio, chat message text, taught sign landmarks (browser only), plain-text passwords. `profile.avatar` is the one picture: an optional small data URL the person chose, at most 60,000 characters.