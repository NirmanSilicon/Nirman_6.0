# AGENT ONBOARDING & SESSION BOOTSTRAP PROTOCOL

> **CRITICAL DIRECTIVE FOR ANY NEW AI AGENT / SESSION:**  
> **READ THIS ENTIRE FILE BEFORE RUNNING COMMANDS OR EDITING ANY CODE.**  
> This file is your single source of truth when taking over SAARTHI in a new session. It defines who you are, the engineering constitution, what the project is, the exact files to read, and what traps to strictly avoid.

---

## 1. The Core Engineering Constitution & Protocol

You are taking over an advanced, ~95% complete assistive AI system built with immense engineering discipline. Your job is to **understand, preserve, verify, and complete**—never to casually rewrite or break working implementations.

### 1.1 The Non-Negotiable Operating Rules
1. **Understand Before Acting:**
   * Treat every existing implementation as intentional. Do not refactor or replace working code simply because you would write it differently.
   * Prefer small, isolated, reversible changes over broad rewrites.
2. **Protect Existing Functionality:**
   * Never modify source code during an initial audit.
   * Never claim a feature works unless it has been verified on physical hardware or through verified recorded replays (`RECORDED_*.jsonl`).
3. **Real Data Only (No Hallucinations / No Mocks in Demo):**
   * Nothing spoken, displayed, or logged in production may be faked. Mocks exist only in test classes and are physically excluded from the `demo` APK build flavour.
4. **Permanent Engineering Diary is Mandatory:**
   * Every meaningful session MUST append an entry to `ENGINEERING_DIARY.md` at the project root documenting date, objective, files touched, decisions, tests run, and next steps.
   * Update `docs/SESSIONS.md` with a session claim and handover entry.
5. **Read-Only Repositories (STRICT):**
   * `secondsense/` and `sightbuddy/` are git submodules and **strictly read-only references**. Never edit, delete, or commit files inside them.
6. **Forbidden Directories to Scan Recursively:**
   * **`data/personal_objects/`**: Contains hundreds of high-resolution 3–5 MB training photos. **DO NOT** run recursive listings (`Get-ChildItem -Recurse` or `find`) on `data/`.
   * **`recordings/`** and **`Vedio/`**: Contain large multi-megabyte binary feed streams and videos. Do not scan or dump their contents into chat context.
7. **License & Dependency Protection:**
   * No GPL/AGPL dependencies (Ultralytics YOLO was specifically removed due to AGPL-3.0). Only permissive licenses (Apache-2.0, MIT, BSD) are allowed. Check `THIRD_PARTY.md`.

---

## 2. Project Executive Overview: What SAARTHI Is

SAARTHI is a personal-space cognitive companion for blind and low-vision individuals seated at a desk, dining table, or workstation (18-hour Silicon Hackathon project).

### The Core Problem It Solves
Existing tools (Seeing AI, Google Lookout, smart canes) fail at tables because:
* **Canes are for floors/paths**, offering zero awareness at table height.
* **Apps are pull-based and demand camera aiming**: A blind user cannot ask about a change they don't know happened (and 28% of blind queries fail due to bad camera framing).
* **Generic apps are noisy firehoses**: Hooking YOLO to text-to-speech drowns hearing—the user's primary spatial sense.

### The 4 Signature USPs
1. **Machine Theory of Mind (The Two Maps Architecture):**
   * **World Map:** Tracks ground-truth physical 3D object positions on the table plane using IMU gravity fusion and camera raycasting (without ARCore).
   * **Belief Map:** Tracks what the user was told and currently believes.
   * **The Sally–Anne Divergence Engine:** SAARTHI is silent by default (**Proactive Silence**). It speaks **only** when physical reality diverges from the user's belief (e.g., someone moves their coffee cup or water bottle).
2. **System 2 Physical Verification (The Torch Test):**
   * Neural networks mistake screen photos for real objects. SAARTHI pulses the phone's LED flash under exposure lock: flat screens emit internal light (zero reflection shift); real 3D objects reflect unevenly. Decided via Wald's SPRT.
3. **Closed-Loop Predictive Motor Guidance:**
   * Real-time MediaPipe GPU hand tracking provides sub-50ms audio-haptic cues to steer the hand to targets, and **halts the hand mid-air** if reaching toward a moved or empty spot.
4. **Privacy-First 100% Offline Edge Architecture:**
   * Operates completely offline on a mid-range Android phone (tested on MediaTek Dimensity 700 / Vivo V21e). The laptop is an optional telemetry viewer over USB (`adb reverse tcp:8765`).

---

## 3. Fast Onboarding Reading Order (Do This First!)

When starting a fresh session, read these files in this exact sequence to get 100% up to speed in 3 minutes:

```
Step 1: Read this file (AGENT_ONBOARDING.md)
   │
Step 2: Read STATUS.md
   │    └── Check what is verified on the physical Vivo phone vs what is pending.
   │
Step 3: Read docs/SESSIONS.md (Last 2 entries)
   │    └── Check recent branch activity, claims, and open handovers.
   │
Step 4: Read ENGINEERING_DIARY.md (Latest entries)
   │    └── Review chronological engineering actions and verification notes.
   │
Step 5: Check DECISIONS.md (Specifically D58 to D62)
   │    └── Understand the most recent architectural decisions and trade-offs.
   │
Step 6: Run Git Status Check:
        git status --ignore-submodules
        git log -n 5 --oneline
```

### Key Reference Files Summary
* `STATUS.md`: The living checklist of verified features vs. unverified device tests.
* `DECISIONS.md`: The 62 binding architectural decisions (D1 through D62).
* `SHOWCASE.md`: 12-minute judge demo flow, feature verification scripts, and run commands.
* `CLAUDE.md`: The detailed Product Requirements Document (PRD v2.4).
* `docs/CONSTITUTION.md`: Detailed engineering rules and session boundaries.
* `docs/SYSTEM2.md`: Physical verification, Wald SPRT, and anti-spoof logic.
* `docs/STRATEGY.md`: Deep user psychology, competitive teardown, and cognitive ergonomics.
* `TODO.md`: Open engineering tasks and hardware checks.

---

## 4. Current State & Recent Work Context (Phase 5: Hardening)

* **Current Branch:** `phase-5/heat` (built on approved `main` / `phase-4.5-approved`).
* **Active Hardware Target:** Vivo V21e 5G (MediaTek Dimensity 700, 8 GB RAM, Android 13, no ARCore).
* **Recent Critical Fixes (12 Nov 2026):**
  * **D59:** Work reduction to prevent thermal throttling on Dimensity 700 big cores (20 prepared camera fps, memory reuse, quiet hand rate when no hand seen for 5s).
  * **D60:** Loosened stillness to 15°/s and removed own-hand silencing so every object move or removal is announced.
  * **D61:** Restored the proven Phase 4 table-geometry `ChangeDetector` for speech alerts after D58's image-space watch misnamed moved objects. Landmark relation anchor tightened to 8 cm.
  * **D62:** Heat tiers are logged to background telemetry feed, **never spoken aloud** to the user.

---

## 5. Technical Stack & Environments

### Phone Environment (`android/`)
* **Language:** Kotlin 2.0.21, Plain Android Views (No Compose).
* **Build System:** Gradle 8.12, AGP 8.7.3, compile/target SDK 35, min SDK 30, arm64 only.
* **JDK Requirement:** JDK 21 or JDK 23 (JDK 25 does not work with Gradle 8.12).
* **Flavours:**
  * `dev` (`ai.saarthi.app.dev`): Contains developer bench, hooks, camera view preview, and simulation tools.
  * `demo` (`ai.saarthi.app`): Clean production stage build. Strips all developer classes, benches, and mock engines at compile time.
* **Key Command:**
  ```powershell
  $env:JAVA_HOME = "C:\Program Files\Java\jdk-23"
  cd android
  .\gradlew.bat assembleDevDebug
  ```

### Laptop Environment (`laptop/`)
* **Language:** Python 3.11.9 in virtualenv `laptop/.venv`.
* **Services:**
  * `laptop/link/feed_server.py`: FastAPI + WebSockets server on port 8000, receiving TCP telemetry from phone over `adb reverse tcp:8765 tcp:8765`.
  * `laptop/online/cloud_brain.py`: Optional Gemini Flash-Lite cloud vision (cross-verified against local map).
  * `laptop/analysis/insights.py`: Spatial decay curve (Kaplan-Meier) and co-occurrence knowledge graph.
* **Key Command:**
  ```powershell
  & "laptop/.venv/Scripts/python.exe" laptop/link/feed_server.py
  ```

---

## 6. Standard Session Workflow & Handover Checklist

For every non-trivial task, follow this exact sequence:
1. **Understand:** Read the relevant docs listed in Section 3.
2. **Inspect:** Check existing implementations without making premature edits.
3. **Communicate:** State what you intend to do, why, and which files will change.
4. **Implement:** Write small, testable, modular changes adhering to existing patterns.
5. **Verify:** Run automated unit tests, replay tests (`RECORDED_*.jsonl`), or hardware verification.
6. **Document (MANDATORY):**
   * Append an entry to `ENGINEERING_DIARY.md`.
   * Add a handover log entry to `docs/SESSIONS.md`.
   * Update `STATUS.md` if verification state changed.
