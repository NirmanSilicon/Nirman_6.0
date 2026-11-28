# PROJECT_RULES.md — NIRMAN 6.0 Engineering Governance (`algoryxz`)

**Status:** `PROPOSED` (pending team-leader review & merge into `algoryxz`)
**Team:** `algoryxz` | **Team Leader:** Smarak Padhi
**Fork (`origin`):** `https://github.com/Smarak-padhi/Nirman_6.0.git`
**Upstream (`upstream`):** `https://github.com/NirmanSilicon/Nirman_6.0.git`
**Shared Team Branch:** `algoryxz`

---

## 1. Project Protection Principles
1. Preserve existing repository files, datasets, test fixtures, documentation, and Git history.
2. Never sacrifice repository integrity or truthfulness for speed.
3. Never modify another team's branch or files outside `algoryxz` scope.
4. Separate verified implementation facts (`VERIFIED`) from proposed designs (`PROPOSED`) and unverified claims (`NOT VERIFIED`).

## 2. Git & Branch Rules
1. **Never** push directly to `upstream/main`, merge into `upstream/main`, or target `main` in any PR.
2. **Never** delete `algoryxz`, force-push any shared branch, or rewrite published Git history.
3. **Never** commit directly to `algoryxz`; all work happens on individual branches (`feature/<member>-<topic>`, `fix/<member>-<topic>`, `docs/<topic>`).
4. Member PRs target `Smarak-padhi/Nirman_6.0:algoryxz`.
5. Final submission PRs target `NirmanSilicon/Nirman_6.0:algoryxz` (using `.github/PULL_REQUEST_TEMPLATE.md` from `upstream/main`).

## 3. PR Review & Merge Requirements
1. Every PR requires review and explicit merge authorization from Team Leader **Smarak Padhi**.
2. PRs must include: summary of changes, exact files touched, test/check outputs, and known limitations/risks.
3. Never merge a PR targeting the wrong repository or branch.

## 4. Coding Standards & Naming Conventions
- Branch names: `feature/<member>-<short-topic>`, `fix/<member>-<short-topic>`, `docs/<short-topic>`, `test/<short-topic>`.
- Commit messages: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
- Keep functions small, single-purpose, and free of duplicated logic or hardcoded secrets.

## 5. Architecture Protection Rules
- Do not change core architecture, technology stack, or shared API/data contracts without an approved ADR in `DECISIONS.md` and team-leader approval.
- Never describe proposed architecture as implemented code.

## 6. Testing Requirements
- Never claim tests passed unless actually executed after the final edit with recorded command output.
- Do not weaken assertions or convert unexpected failures into skips.
- Run `git status`, `git diff`, and `git diff --check` before every commit and PR.

## 7. Dataset & Evidence Preservation
- Never delete or overwrite datasets, fixtures, or evaluation evidence.
- Do not push large ML datasets directly to Git; use external storage and document reproducible acquisition steps.
- Credit all third-party code, assets, and datasets.

## 8. Security & Secrets Rules
- Never commit API keys, passwords, tokens, private keys, or real `.env` files (`.gitignore` excludes `.env` and `branchcreation.sh`).
- Commit `.env.example` with placeholder values only.
- If a credential is exposed, notify organizers immediately and rotate/revoke it.

## 9. Dependency Management
- Pin dependency versions in lockfiles/manifests and document license compatibility before adding new packages.

## 10. Documentation Requirements
- Keep `PRD.md`, `TRD.md`, `ARCHITECTURE.md`, `PROJECT_STATUS.md`, and `DECISIONS.md` synchronized with actual code.
- Flag conflicting organizer or team documents rather than silently picking one.

## 11. AI-Agent Restrictions
- All AI agents must read `AGENT_INSTRUCTIONS.md` and follow the governance hierarchy:
  1. Organizer requirements (`README.md`, `CONTRIBUTING.md`, `docs/submission-timeline.md` on `upstream/main`)
  2. `PROJECT_RULES.md`
  3. Approved `PRD.md` and `TRD.md`
  4. Approved ADRs in `DECISIONS.md`
  5. Existing source code and tests
  6. Explicit task instructions from Team Leader Smarak Padhi
- Agents must inspect before editing, make focused changes, avoid speculative refactoring, and request approval before destructive or architectural changes.

## 12. Human Approval Requirements
Explicit human/team-leader approval is required for:
- Merging any PR into `algoryxz` or opening/updating the submission PR to `upstream/algoryxz`.
- Architecture/stack decisions (`DECISIONS.md`).
- Deleting or renaming existing files, datasets, or branches.

## 13. Definition of Done
A task is done only when: (a) scoped code/docs match requirements, (b) relevant tests and `git diff --check` pass after the final edit, (c) diff contains no secrets or unrelated changes, and (d) status/evidence is recorded.

## 14. Incident & Rollback Procedure
1. Stop immediately if an unexpected branch state, secret exposure, or data loss risk is detected.
2. Preserve current state (never run `git reset --hard` or `git clean` on shared/uncommitted work).
3. Revert bad commits cleanly via `git revert <sha>` on a branch and escalate to Team Leader Smarak Padhi.