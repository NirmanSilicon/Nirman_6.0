# TESTING_STRATEGY.md — Quality & Verification Strategy (`algoryxz`)

**Current Baseline (`VERIFIED`):** `0` automated test suites exist on `algoryxz` (`06c65b4`).

---

## 1. Mandatory Pre-Commit & Pre-PR Checks (`VERIFIED` Process)
1. `git status --short --branch` — confirm no unintended files, secrets, or `.env`.
2. `git diff --check` — confirm zero trailing whitespace or conflict markers.
3. Markdown relative link validation for documentation changes.

## 2. Planned Application Test Categories (`PROPOSED`)
- **Unit tests:** Pure business logic, validation, and data transforms.
- **Integration / API tests:** End-to-end request/response and error-handling paths.
- **Smoke / UI tests:** Clean-start launch and primary user flow prior to 9:00 PM, 3:00 AM, and 6:00 AM IST submissions.
- **Static checks:** Linter, formatter, and typechecker configured for the chosen stack.

## 3. Reporting Rule
Never report a test as passing unless it was executed after the final edit and its exact command and output were observed.