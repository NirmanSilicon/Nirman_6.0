# PRD.md — Product Requirements Document (`algoryxz`)

**Status:** `PROPOSED` (Kickoff Template — awaiting team problem-statement & feature freeze)
**Repository Baseline (`VERIFIED`):** `algoryxz` at `06c65b4` contains only `.gitignore` and `algoryxz.txt` (no application code or problem statement committed yet).

---

## 1. Verified Constraints & Competition Schedule (`VERIFIED` from `upstream/main`)
- **Event:** NIRMAN 6.0 — HACKNATION 2026 (28–29 November 2026, IST)
- **Milestones (`docs/submission-timeline.md`):**
  1. **First Progress Submission:** 28 November 2026, **9:00 PM IST**
  2. **Second Progress Submission:** 29 November 2026, **3:00 AM IST**
  3. **Final Submission:** 29 November 2026, **6:00 AM IST**
- **Submission Rule:** Push to `origin/algoryxz` and maintain PR targeting `NirmanSilicon/Nirman_6.0:algoryxz` (never `main`).

## 2. Problem Statement (`OPEN QUESTION` / `REQUIRES HUMAN APPROVAL`)
- `[OPEN QUESTION]` Team `algoryxz` has not yet recorded its selected problem statement, target domain, or user persona in the repository.
- `[PROPOSED]` Once selected by Team Leader Smarak Padhi, document:
  - **Target Users & Pain Points:** *(to be filled from verified team problem statement — do not fabricate user research)*
  - **Proposed Solution & Objectives:** *(1–3 measurable goals deliverable by 6:00 AM IST, 29 Nov 2026)*

## 3. Scope & Out-of-Scope (`PROPOSED`)
- **In-Scope (Hackathon MVP):** Core end-to-end vertical slice demonstrable at 9:00 PM (initial), 3:00 AM (integrated), and 6:00 AM (final).
- **Out-of-Scope:** Unverified external integrations, production-scale multi-region infra, or features not verifiable before 6:00 AM IST.

## 4. Functional & Non-Functional Requirements (`PROPOSED`)
- **FR-01..FR-0N:** *(To be populated per selected problem statement after team kickoff decision.)*
- **NFR-01 (Security):** Zero committed secrets/credentials; `.env` excluded.
- **NFR-02 (Reproducibility):** Clear setup/run instructions and reproducible test/demo steps for organizers.
- **NFR-03 (Reliability):** Graceful error handling on invalid inputs and missing configuration.

## 5. User Journeys, Acceptance Criteria & Success Metrics (`PROPOSED`)
- **Core User Journey:** *(To be defined once problem statement is locked.)*
- **Acceptance Criteria:**
  - Every claimed feature exists in committed source code on `algoryxz`.
  - Smoke/unit tests and lint/diff checks pass prior to each submission milestone (9:00 PM, 3:00 AM, 6:00 AM IST).
- **Risks & Open Questions:**
  1. Finalize problem statement and tech stack (`DECISIONS.md` ADR-001).
  2. Assign module ownership across team members before 9:00 PM IST milestone.