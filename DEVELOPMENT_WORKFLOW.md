# DEVELOPMENT_WORKFLOW.md — Git & PR Workflow (`algoryxz`)

**Aligned with:** `upstream/main:CONTRIBUTING.md`, `upstream/main:docs/submission-timeline.md`, and `PROJECT_RULES.md`.

---

## 1. Remotes (`VERIFIED`)
- `origin`: `https://github.com/Smarak-padhi/Nirman_6.0.git` (Team Leader's fork)
- `upstream`: `https://github.com/NirmanSilicon/Nirman_6.0.git` (Organizer monorepo)

## 2. Teammate Workflow
```bash
git fetch origin
git switch -c feature/<your-name>-<topic> origin/algoryxz
# ... implement, test, run git diff --check ...
git add <exact-files>
git commit -m "feat: concise description"
git push -u origin feature/<your-name>-<topic>
```
Open a PR targeting **`Smarak-padhi/Nirman_6.0:algoryxz`** using `.github/PULL_REQUEST_TEMPLATE.md` fields.

## 3. Team Leader Review & Final Submission Workflow
1. Review diff, verify tests/checks, and merge approved member PRs into `origin/algoryxz`.
2. Push `origin/algoryxz` before each IST milestone:
   - **9:00 PM (28 Nov)** — First Progress Submission
   - **3:00 AM (29 Nov)** — Second Progress Submission
   - **6:00 AM (29 Nov)** — Final Submission
3. Raise/update the submission PR from `Smarak-padhi/Nirman_6.0:algoryxz` to **`NirmanSilicon/Nirman_6.0:algoryxz`** (never `main`).