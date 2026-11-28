# UI test report

Environment: the app's built-in Chromium browser pane driven by hand and by in-page scripts, against a real server started from this folder with a temporary data file (`DATA_FILE`, `ADMIN_EMAILS=admin@example.org`, `DEV_TOKENS=1`). Seeded test accounts (test data created for this run, not real people). Windows 11. No Playwright, no real camera, microphone or screen reader.

Classification key: **REAL BROWSER** = performed in the browser against the real server · **API** = covered by `server/test-accounts.js` (real HTTP, real cookies) · **NOT RUN**.

| # | Scenario (from the brief) | Result | How |
|---|---|---|---|
| 1 | New primary user: register -> verify -> choose role -> onboarding -> dashboard | PASS | REAL BROWSER (an account created through the screens, onboarding saved per step, dashboard shown with the saved choices) + API |
| 2 | Supporter connection: look up code, send request, primary is notified, approve with minimal permissions, both sides show "Connected" | PASS | REAL BROWSER, both accounts, plus API for decline/revoke/permissions |
| 3 | Community learning: onboarding, dashboard counts real lessons (0 of 23), progress saved per account | PARTIAL | Onboarding and dashboard in REAL BROWSER. Lesson completion and reload persistence are API-tested only; the lesson buttons were not clicked in the browser |
| 4 | Interpreter verification: onboarding, status "Not submitted" -> submit -> "Pending review" -> administrator verifies -> interpreter sees "Verified" | PASS | REAL BROWSER with an administrator account. Receiving and accepting an interpreter request is API-tested, not browser-tested |
| 5 | Returning user lands in the right place | PASS | REAL BROWSER (each role signs in to its own dashboard) |
| 6 | Interrupted onboarding resumes | PASS | REAL BROWSER (stopped after step 1 of 5; next sign-in opened step 2, "25% complete") + API |
| 7 | Accessibility | PARTIAL | In-page audit (`test-support/ui-audit.js`) on 47 views: 0 structural problems, 0 contrast failures (text on gradients skipped). Keyboard Tab check on the sign-in page. NO screen reader, magnifier or user testing |
| 8 | Visual regression | NOT RUN | No baseline screenshots or automated comparison exist. Screens were inspected by eye at 1440x900 and 375x812 |

## Other checks

- Console errors: none on the account views after the router loop guard was added (an earlier stack overflow came from a missing script tag and was fixed).
- Horizontal overflow: none at 1440 and 375 px.
- Guest mode still opens the existing workspaces (`#/dashboard/sign` loaded, recogniser list shows the new "My held poses" entry).
- Personal held poses in the browser with **synthetic hand frames fed through the page's replaceable extractor** (not a camera): capture 3 x 8 readings of two poses; storage holds numbers only; recognition typed the right words; an untaught shape was rejected with a message; a 0.4 s hold typed nothing; the self-check ran; delete one and delete all removed the stored key.

## Failures found and fixed during the run

See ACCESSIBILITY_UI_AUDIT.md (ids, names, contrast, dialog size, label visibility) and IMPLEMENTATION_PROGRESS.md.

## Known not covered

Tablet width, real devices, Firefox and Safari, slow networks, two browsers signed in at once, the original Playwright suites (see TEST_REPORT.md: they need Playwright and several reference the legacy dashboard dropdown `#dashBtn`/`#dashMenu`, which the new header replaced, so they will need updating).