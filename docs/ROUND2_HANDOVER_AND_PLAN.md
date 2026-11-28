# SAARTHI — Round 1 Post-Mortem & Round 2 Finals Execution Plan

> **Created:** 28 Nov 2026, 23:46 IST (after Round 1 judge evaluation)  
> **Active Branch (`F:\SAARTHI`):** `phase-5/heat` (`c97ef39`)  
> **Hackathon Repo (`F:\Nirman_6.0`):** `developwithpratyush/Nirman_6.0` branch `vectorx` (`73920a3`, all 4 team contributors merged)

---

## 1. Honest Round 1 Post-Mortem (From Live Recording `feed_20261128_210432.jsonl`)

The Round 1 judge praised **the engineering and live working depth**, which proves the core system is strong. Every glitch you felt on stage came from **sequence + cognitive overload**, not broken core tech:

1. **Why removing the bottle stayed silent at the end:**
   * **Online mode was still ON** (`online: on` at `t = 792872773`): by design (D53), while Online mode is active, unasked local alerts (`moved` / `can't see`) are suppressed so they don't interrupt cloud Q&A.
   * **Stale session before demoing:** Starting the app 3–4 minutes early let `bottle` age out (`'unknown': 'no longer in the world map'` in the final `belief` samples) and left `cameraFps = 0` at the end.
   * **Fix:** Always **restart/fresh-tap** right when the judge walks up, and **triple-tap Online OFF** immediately after the cloud question!
2. **Why offline voice phrasing missed twice:**
   * You asked *"What object I am holding now?"* and *"What object I am pointing now"* → offline `IntentInterpreter` returned `Unknown` because its exact grammar expects **`"What is this?"`**, **`"What am I holding?"`**, or **`"What am I pointing at?"`**.
   * *(Note: once Online mode was toggled on, Gemini answered `"You are pointing at a water bottle"` in `3.39 s` and `"Atomic Habits by James Clear"` in `1.97 s`!)*
3. **Why `tools/sim/index.html` felt heavy for judges:**
   * Too many text blocks in Modules 1–2 & 5 force judges to read instead of listening to you. Evaluators scan visually in **3 seconds**; text walls add cognitive load while you are speaking.
4. **Why sequence & narration slipped under excitement:**
   * Too many features (`10+` capabilities) with no locked 5-beat choreography caused jumping between offline, online, and simulator mid-thought.

---

## 2. What Needs to Be Built & Refined for Round 2 (Before 03:00 AM & Finals)

### Priority 1: De-Text & Clarify `tools/sim/index.html` (Zero-Reading Visual Clarity)
* Replace long paragraph cards in `tools/sim/` (`Module 01`, `02`, `05`) with **scannable visual diagrams, big 3-word headlines, single-line metrics, and clear step numbers** so a judge understands each screen in **3 seconds** without reading prose.
* Keep `Module 03` (Interactive Two-Map Sandbox) and `Module 04` (`Real_Apple.jpg` vs `Image_Apple.jpg` Optical Heatmap + SPRT graph) front and center.

### Priority 2: Build Honest 3D Interactive FMCW Glass Probe Simulation (`tools/sim/`)
* Add a dedicated, **clearly labelled `SIMULATED — Hardware Feasibility Note (D63)`** 3D canvas/Three.js or clean 3D perspective simulation in `tools/sim/`:
  * Shows a **clear drinking glass** invisible to RGB bounding boxes (`0%` confidence), then animates an **18–20 kHz acoustic chirp wave + Gyro yaw sweep + differential baseline-subtracted echo peak at ~30 cm**, triggering plain speech (`"Obstacle within reach, slightly to your right"`).
  * Shows an honest badge: *"Tested on Vivo V21e (D63): `UNPROCESSED` mic unavailable & 25–35% speaker roll-off variance — simulated here to show the physics pipeline for ultrasonic-capable hardware / ESP32."*

### Priority 3: Lock the 5-Beat "Say → Do → Show" Stage Choreography + Cheat-Sheet
Lock a strict **5-minute Round 2 sequence** where **every single line you say matches one physical action and one visual on screen**:
1. **Beat 1 — Hook & Setup (45 s, `tools/sim/` Module 01 visual):** *"Canes stop at the floor. Vision apps yell 10 labels/sec and blind a blind user's ears. SAARTHI runs offline on a phone and stays silent until your mental map is wrong."*
2. **Beat 2 — Two-Map Sally–Anne + Proactive Silence (60 s, Live Phone + `Mind View`):** Fresh tap → settle-in brief → move bottle → `"Heads up, your bottle was moved..."` once; point at **Cognitive Economy Counter** + **2.5D red `MOVED` tether** + **Decision Log**.
3. **Beat 3 — System 2 Torch Test (45 s, Live Phone + `tools/sim/` Module 04):** Real apple vs laptop photo → `"Is this apple real?"` → flash test → `REAL` vs `PICTURE` + show curvature heatmap.
4. **Beat 4 — Hand Guidance + Touch/Point + Watch (60 s, Live Phone + `Eyes`):** `"Guide my hand to the cup"` (wrong move → `"Other way: right"`) → `"What am I pointing at?"` → optional `"Is this my watch?"`.
5. **Beat 5 — Verified Cloud + 3D FMCW Future + Close (50 s):** **Triple-tap ON** → `"Which book am I holding?"` (*Atomic Habits*, ~2 s) → **Triple-tap OFF** → show **3D FMCW Simulation** (honest D63 hardware note) + mention **Safety SOS** → close: *"Canes navigate the floor. SAARTHI navigates the table."*

### Priority 4: Optional Quick Offline Voice Polish (Only If Time & Cleanly Tested)
* Consider adding `"what am i holding"`, `"what object am i pointing"`, `"what object am i holding"` aliases to `IntentInterpreter.kt` (`WhatIsThis`) and `"delete"` / `"clear my notes"` to `Diary` if helpful — **only** if unit-tested (`testDevDebugUnitTest`) and verified before `03:00 AM`.

### Priority 5: `Nirman_6.0` (`vectorx`) Hackathon Submission Checkpoints
* **03:00 AM IST (Second Progress):** Push updated `tools/sim/` (visual overhaul + 3D FMCW sim) + core Android perception/guidance/speech/app packages to `F:\Nirman_6.0` (`vectorx`).
* **06:00 AM IST (Final Submission):** Push complete verified codebase (still keeping `laptop/secrets/`, `data/`, `recordings/`, `*.tflite`/`*.onnx` out via `.gitignore`) and confirm the PR on `NirmanSilicon/Nirman_6.0:vectorx` reflects the final state.

---

## 3. Exact Pre-Demo Booth Reset Ritual (Never Miss This!)
1. Force-stop & fresh-launch `ai.saarthi.app.dev` (or `demo`) right before judges arrive (keeps phone cool and `WorldMap` fresh).
2. Confirm `adb reverse tcp:8765 tcp:8765` and `http://127.0.0.1:8000/` shows `phone connected over USB`.
3. **Rule of thumb:** Tap ONCE to anchor beliefs → never leave **Online Mode** (`ONLINE` badge) turned ON when demonstrating offline bottle moves!
