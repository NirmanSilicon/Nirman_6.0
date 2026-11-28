# Screen inventory

State key: **L** loading, **E** empty, **X** error with retry, **S** success message.

| Screen | Route | Who | Data from | States |
|---|---|---|---|---|
| Landing | `#/` | Everyone | static | n/a |
| Register | `#/register` | Signed out | `POST /api/auth/register` | field errors, summary, S |
| Sign in | `#/signin` | Signed out | `POST /api/auth/login` | wrong details (generic), rate limit message |
| Forgot / Reset | `#/forgot`, `#/reset/<t>` | Signed out | `/api/auth/forgot`, `/reset` | dev link note, expired token |
| Verify email | `#/verify` | Signed in, unverified | `/api/auth/verify`, `/resend-verification`, `/change-email` | cooldown, expired |
| Choose role | `#/role` | Signed in, no role | `POST /api/me/role` | validation |
| Onboarding | `#/onboarding/<step>` | Signed in | `PUT /api/me/onboarding/:step`, `/complete` | field errors, saved, resume |
| Primary: Overview, Communicate, Accessibility, Connections, Interpreter, Notifications, Profile, Help | `#/me[/<s>]` | Primary | `/api/me`, `/connections`, `/interpreter-requests/mine`, `/notifications` | L, E, X |
| Supporter: Overview, Communicate, Connections, Sessions, Interpreter, Notifications, Profile and privacy, Help | same | Supporter | + `/connections/lookup`, `/comm-sessions` | L, E, X |
| Community: Overview, Learn, Progress, Resources, Community, Notifications, Profile, Help | same | Community | `/learning/progress` | L, E, X |
| Interpreter: Overview, Requests, Active sessions, Availability, Language skills, Verification, History, Notifications, Account, Help | same | Interpreter | `/interpreter/*`, `/interpreter-requests/*` | L, E (honest "nothing yet"), X |
| Admin review | `#/me/admin` | Administrators | `/api/admin/interpreters` | E "Nothing waiting" |
| Settings (personal, account type, notifications, privacy, security, delete) | `#/me/settings` | All | `/api/me/*` | S per change |
| Dialogs | n/a | n/a | n/a | Approve connection, permissions, ask interpreter, verify decision, confirm voice command |
| Page not available | n/a | n/a | n/a | shown instead of a blank page if a view fails |

Empty states say what is empty and the next action, e.g. "No connections yet. Share your invitation code with someone you trust and approve a request to talk with someone here."