# DECISIONS.md — Architecture Decision Record (ADR) Log (`algoryxz`)

---

## ADR-000: Establish Governance & Dedicated Docs Branch Before Implementation
- **Date:** 28 November 2026
- **Status:** `PROPOSED` (pending team-leader approval on `docs/governance-and-kickoff-baseline`)
- **Context:** `origin/algoryxz` and `upstream/algoryxz` (`06c65b4`) contain only `.gitignore` and `algoryxz.txt`, while organizer guidelines live on `upstream/main` (`dc26fa7`).
- **Chosen Approach:** Create `docs/governance-and-kickoff-baseline` from `algoryxz` and merge via PR to `origin/algoryxz`.
- **Consequences:** Protects `algoryxz` via PR review per `CONTRIBUTING.md`.

---

## ADR-001: Select DocuReady as NIRMAN 6.0 Competition Project & Windows Desktop Architecture
- **Date:** 28 November 2026
- **Status:** `ACCEPTED` (per Dual-Track Execution Directive; pending PR merge into `algoryxz`)
- **Context:** Team `algoryxz` must deliver a complete, locally executable, judge-demonstrable product by **6:00 AM IST, 29 November 2026**, packaged as a Windows executable.
- **Options Considered:**
  1. Invent a new greenfield web app from scratch within ~11 hours.
  2. Select **DocuReady** (local-first, deterministic pre-flight document readiness assistant) as the NIRMAN 6.0 competition project, reusing validated architectural patterns and building clean, independently reviewable increments in `Nirman_6.0`.
- **Chosen Approach:** Option 2 — **DocuReady** on **Electron + React + TypeScript + PDF.js + Python PyInstaller Sidecar + Tesseract OCR**, packaged for Windows via Electron Forge (`MakerSquirrel` `.exe` / `MakerZIP` portable).
- **Reasoning:** Fits the local-first privacy/reliability problem space, has proven architectural separation (Electron IPC + ephemeral workspace + stdio NDJSON sidecar), and supports deterministic judge demos without cloud dependencies.
- **Consequences:**
  - `Nirman_6.0` maintains its own independent Git history, tests, and acceptance evidence.
  - Known licensing/dependency obligations (e.g., PyMuPDF AGPLv3 disclosure if used) and clean-machine Windows validation must be explicitly documented before judge/public distribution.