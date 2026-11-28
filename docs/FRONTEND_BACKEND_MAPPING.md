# Frontend to backend mapping

All calls use `fetch` with the session cookie and the header `X-Sangam-Client: 1` (`SangamAX.api`).

| Screen / action | Frontend function | Endpoint | Server checks |
|---|---|---|---|
| Boot, gate | `refreshMe` | `GET /api/me` | none (returns `signedIn:false` when signed out) |
| Register | `views.register` | `POST /api/auth/register` | validation, unique email, IP rate limit |
| Sign in / out | `views.signin`, `ACTS.signout` | `POST /api/auth/login`, `/logout` | per-IP and per-email limits, generic error |
| Verify, resend, change email | `views.verify` | `/api/auth/verify`, `/resend-verification`, `/change-email` | token hash, expiry 24 h, cooldown 60 s |
| Forgot / reset | `views.forgot`, `views.reset` | `/api/auth/forgot`, `/reset` | always the same reply; token 1 h; ends all sessions |
| Choose role | `views.role` | `POST /api/me/role` | verified, role not yet set |
| Onboarding step | `views.onboarding` | `PUT /api/me/onboarding/:step`, `POST .../complete` | per-role, per-step validator |
| Primary preferences | `accessibilityPage` | `PUT /api/me/preferences` | role = primary |
| Profile / notification settings | `settingsPage` | `PUT /api/me/profile`, `/settings` | verified |
| Change password | `settingsPage` | `POST /api/me/password` | current password, signs out other devices |
| Change role | `settingsPage` | `POST /api/me/role/change` | password again |
| Export / delete account | `settingsPage` | `GET /api/me/export`, `DELETE /api/me` | own data only; password |
| Look up invitation code | `connections` | `GET /api/connections/lookup` | supporter, rate limit |
| Request / approve / decline / permissions / end | `connections` ACTS | `POST /api/connections`, `/:id/respond`, `PUT /:id/permissions`, `POST /:id/revoke` | roles and ownership |
| Start conversation | `startsession` | `POST /api/connections/:id/session` | approved with `messages` permission |
| Ask for an interpreter | `interpreterAsk` | `POST /api/interpreter-requests`, `GET .../mine`, `POST .../:id/cancel|complete` | open-request cap, language |
| Interpreter inbox | `requestsPage` | `GET /api/interpreter/requests`, `POST /api/interpreter-requests/:id/accept|decline` | verified, available, language match, first accept wins |
| Availability | `availabilityPage` | `PUT /api/interpreter/availability` | role |
| Submit for verification | `qualificationsPage` | `POST /api/interpreter/submit` | role; unchanged if already pending/verified |
| Admin review | `adminPage` | `GET /api/admin/interpreters`, `POST .../:id/verification` | `ADMIN_EMAILS` |
| Sessions history | `historyPage` | `GET /api/comm-sessions` | own sessions; who/when only |
| Notifications | `notificationsPage`, poll every 25 s | `GET /api/notifications`, `POST .../read-all`, `/:id/read`, `DELETE /:id` | own only |
| Learning progress | `learnPage` | `GET/PUT /api/learning/progress` | own only |

The learning lessons themselves come from `assets/learn.js` (`window.SangamLearn`), the same source the guest Learn workspace uses. Chat itself uses the existing WebSocket sessions, not this API.