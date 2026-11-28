# AGENT_INSTRUCTIONS.md — Mandatory AI Agent Rules (`algoryxz`)

**Read this before modifying any file in `Nirman_6.0`.**

## 1. Project Identity (`VERIFIED`)
- **Team:** `algoryxz` | **Team Leader:** Smarak Padhi
- **Fork (`origin`):** `https://github.com/Smarak-padhi/Nirman_6.0.git`
- **Upstream (`upstream`):** `https://github.com/NirmanSilicon/Nirman_6.0.git`
- **Shared Team Branch:** `algoryxz`

## 2. Authority Hierarchy
1. Organizer instructions (`upstream/main`: `README.md`, `CONTRIBUTING.md`, `docs/submission-timeline.md`)
2. `PROJECT_RULES.md`
3. Approved `PRD.md` and `TRD.md`
4. Approved ADRs in `DECISIONS.md`
5. Existing source code and tests
6. Explicit task instructions from Team Leader Smarak Padhi

## 3. Prohibited Actions
- Never push to or merge into `upstream/main` or target `main` in any PR.
- Never delete `algoryxz`, force-push shared branches, or rewrite published Git history.
- Never commit secrets, `.env`, or large raw datasets.
- Never fabricate test results, implemented features, or competition rules.
- Never overwrite another contributor's work without inspecting and coordinating.

## 4. Required Workflow
1. Inspect `git status --short --branch` and target files before editing.
2. Work on a dedicated branch (`feature/<member>-<topic>`, `docs/<topic>`), never directly on `algoryxz`.
3. Make minimal, focused edits; preserve unrelated files.
4. Run relevant tests and `git diff --check` after your final edit.
5. Report exact changed files, test outputs, risks, and escalate blockers to Smarak Padhi.