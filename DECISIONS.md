# DECISIONS.md — Architecture Decision Record (ADR) Log (`algoryxz`)

---

## ADR-000: Establish Governance & Dedicated Docs Branch Before Implementation
- **Date:** 28 November 2026
- **Status:** `PROPOSED` (pending team-leader approval)
- **Context:** `origin/algoryxz` and `upstream/algoryxz` (`06c65b4`) contain only `.gitignore` and `algoryxz.txt`, while organizer guidelines live on `upstream/main` (`dc26fa7`).
- **Options Considered:**
  1. Commit governance docs directly to `algoryxz`.
  2. Create a dedicated branch `docs/governance-and-kickoff-baseline` from `algoryxz` and open a PR to `origin/algoryxz`.
- **Chosen Approach:** Option 2 — keep `algoryxz` protected via PR review per `CONTRIBUTING.md`.
- **Consequences:** Team members have a clean, reviewed governance baseline and prompt library before writing application code.

---

## ADR-001: Problem Statement & Technology Stack Selection
- **Date:** Pending (28 November 2026)
- **Status:** `OPEN` / `REQUIRES HUMAN APPROVAL`
- **Context:** No application code or problem-statement selection exists on `algoryxz` yet.
- **Options Considered:** Pending team kickoff.
- **Chosen Approach:** TBD by Team Leader Smarak Padhi and team `algoryxz`.
- **Consequences:** Unlocks `PRD.md`, `TRD.md`, `ARCHITECTURE.md`, and parallel feature branches.