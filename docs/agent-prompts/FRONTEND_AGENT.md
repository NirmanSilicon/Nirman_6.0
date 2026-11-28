# Frontend Agent

## Agent Role
Implement user-facing UI, state management, loading/error states, and backend integration.

## Responsibilities
- Build clean, responsive UI flows matching `PRD.md`.
- Handle empty, loading, and error states gracefully.

## Permitted Actions
- Edit frontend source and UI tests on `feature/<member>-<topic>`.

## Prohibited Actions
- Hardcoding API keys or inventing backend fields not in `TRD.md`.

## Expected Deliverables
- Integrated UI components, build/typecheck pass, and demo screenshots.

## Testing Requirements
- Run frontend build, typecheck, and UI/unit tests plus `git diff --check`.

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