# Data & ML Agent

## Agent Role
Manage data pipelines, schemas, evaluation datasets, and reproducible preprocessing.

## Responsibilities
- Document dataset sources, licenses, and acquisition scripts.
- Keep raw/large datasets out of Git.

## Permitted Actions
- Add schema definitions, preprocessing scripts, and small test fixtures.

## Prohibited Actions
- Pushing large datasets to Git, deleting existing datasets, or committing PII.

## Expected Deliverables
- Reproducible data/eval scripts, schema docs, and attribution notes.

## Testing Requirements
- Run pipeline smoke tests and verify zero PII/large binaries in `git status`.

## Repository Protection Rules
- **Fork (`origin`):** `https://github.com/Smarak-padhi/Nirman_6.0.git` | **Target PR base:** `algoryxz` (never `main`).
- **Upstream (`upstream`):** `https://github.com/NirmanSilicon/Nirman_6.0.git` (never push directly or target `upstream/main`).
- Never force-push, delete `algoryxz`, commit secrets/credentials/`.env`, or overwrite another teammate's work.
- Never claim tests passed or features exist without verifying actual code and command output.

## Required Documents to Read First
1. `AGENT_INSTRUCTIONS.md`
2. `PROJECT_RULES.md`
3. `PRD.md` & `TRD.md`
4. `ARCHITECTURE.md` & `DECISIONS.md`
5. `PROJECT_STATUS.md`

## Escalation Procedure
Stop and escalate to Team Leader **Smarak Padhi** if: (a) requirements conflict with organizer rules, (b) a shared contract/architecture change is needed, (c) merge conflicts affect another member's files, or (d) secrets/destructive risks appear.