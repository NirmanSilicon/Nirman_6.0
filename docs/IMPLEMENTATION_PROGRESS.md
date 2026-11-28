# Implementation progress

Last updated at delivery. Status words are defined in FEATURE_AUDIT.md.

## Done in this pass

| Item | Status |
|---|---|
| Accounts: registration, sessions, verification, reset, roles, onboarding, profile, export, delete | COMPLETED |
| Role dashboards: Primary, Supporter, Community, Interpreter (+ administrator review tab) | COMPLETED (browser-walked) |
| Connections with approval and three permissions; invitation codes | COMPLETED |
| Interpreter verification (admin only) and request routing | COMPLETED |
| Notifications from real events | COMPLETED |
| Learning progress saved per account | COMPLETED |
| Static file lockdown | COMPLETED |
| Account-area design system, themes, responsive layout | COMPLETED (visual checks at desktop and phone width) |
| Optional voice navigation | IMPLEMENTED_NOT_FULLY_VERIFIED |
| Personal held-pose trainer (consent, landmarks-only storage, deletion, self-check, unknown rejection) | COMPLETED as a mechanism |
| In-page accessibility audit script (`test-support/ui-audit.js`) | COMPLETED |
| Documentation set | COMPLETED |

## Defects found and fixed while verifying (examples)

Unreadable relay boxes in the dark hero card; full-screen approval dialog (an older global `dialog` rule); near-invisible definition-list labels; two contrast shortfalls; duplicate `id` breaking a label association (speech speed); missing accessible name on the account menu button; mobile header wrapping onto two rows; a router loop when a script was missing (now guarded).

## Not done

- ISL static alphabet recogniser (no verified dataset).
- Any model training.
- Real webcam, microphone, screen-reader, magnifier or device testing.
- Email delivery.
- Playwright suites in this environment.
- Restyling the older guest workspaces to the new light theme.
- A multi-process database.

## Known failing tests

`server/test-reliability.js`: 2 of 6 fail on Windows (SIGTERM graceful-shutdown checks). The same 2 fail on the untouched original code: Node on Windows cannot deliver a catchable SIGTERM to a child process. Not hidden or disabled; unverified on Linux/macOS here.