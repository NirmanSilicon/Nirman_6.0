# SAARTHI — Round 2 Finals Rehearsal Script, Booth Ritual & Exact Voice Lines

> **Synced to:** `phase-5/heat` (`tools/sim/index.html` Modules 01–06 + `Mind View :8000` + `IntentInterpreter.kt` unmodified)  
> **Target Duration:** 5 minutes (5 tight beats)

---

## 1. Pre-Demo Booth Reset Ritual (30 Seconds — Never Skip!)

Run these 4 checks right when the judge walks up so `WorldMap` is fresh and the phone is cool:

1. **Fresh Launch Phone App:** Force-stop & reopen `ai.saarthi.app` (`demo`) or `ai.saarthi.app.dev` (`dev`). *(Never start 3–4 minutes early; stale sessions age out objects.)*
2. **Confirm USB Link (`:8000`):** Check laptop Mind View (`http://127.0.0.1:8000/`) shows **`phone connected over USB`**. If dropped, run `adb reverse tcp:8765 tcp:8765`.
3. **Confirm `ONLINE` Badge is OFF:** Look at the phone screen — **no `ONLINE` marker** should be visible before Beat 2. *(When Online Mode is ON, D53 suppresses all unasked bottle-moved alerts!)*
4. **Table Kit Ready:** Place **bottle** (right), **cup** (slightly right), **laptop** (front, showing `Image_Apple.jpg` or ready to show), **real apple**, and **book** (*Atomic Habits*). Keep chargers, oranges, and doughnuts off the table (`D15`, `D28`).

---

## 2. The 5-Beat "Say → Do → Show" Stage Choreography (5:00)

| Beat | Time | Say (Exact Spoken Pitch) | Do (Physical Action) | Show (Screen / Visual) |
| :--- | :--- | :--- | :--- | :--- |
| **1. Hook & Gap** | `0:00–0:45` | *"Canes stop at the floor. Vision apps yell 10 labels a second and blind a blind user's ears. SAARTHI runs 100% offline on a mid-range phone and stays silent until your mental map is wrong."* | Gesture to phone in stand (no tap yet). | **`tools/sim/` Module 01** (`Canes vs Vision AI vs SAARTHI` + 3 Pillars). |
| **2. Two-Map Sally–Anne** | `0:45–1:45` | *"Watch Proactive Silence. One tap anchors what I know."* → *(after move)* → *"I didn't ask anything. It spoke once because reality diverged from belief."* | **Tap phone ONCE** → wait for brief → teammate moves **bottle** (right → left, ≥20 cm) while phone stays still. | **Mind View `:8000`** (Cognitive Economy Counter + 2.5D red `MOVED` tether + Decision Log). *(Backup: `tools/sim/` Module 03).* |
| **3. System 2 Torch Test** | `1:45–2:30` | *"Neural nets are 97% fooled by a flat screen photo. Ask me if it's real—SAARTHI locks exposure, pulses the torch, and uses Wald's SPRT physics."* | Hold & ask: **`"Is this apple real?"`** on real apple, then on laptop photo. | **Phone + `tools/sim/` Module 04** (`Real_Apple.jpg` `∇²I=0.614, Sn=+4.91` vs `Image_Apple.jpg` `0.130, -5.11` + Heatmap). |
| **4. Guidance & Point-Ask** | `2:30–3:30` | *"Now closed-loop motor guidance and point-and-ask—all offline."* | Hold & say: **`"Guide my hand to the cup"`** → move wrong way briefly (`"Other way: right"`) → reach cup. Then point finger and say: **`"What am I pointing at?"`** *(Optional: `"Is this my watch?"`)*. | **Mind View `:8000` (`Eyes` + `Actions` panels)**. |
| **5. Cloud + 3D FMCW + Close** | `3:30–4:20` | *"Triple-tap brings optional cloud Q&A, cross-checked against our local map."* → *(Triple-tap OFF)* → *"For clear glass that RGB misses, we tested 18–20 kHz FMCW on this Vivo (`D63`), discarded it honestly due to HAL noise, and simulated the physics for ultrasonic hardware. Canes navigate the floor. SAARTHI navigates the table."* | **Triple-tap ON** → hold & say **`"Which book am I holding?"`** → **Triple-tap OFF immediately**! → click `Run RGB Check` then `Fire 18–20 kHz Chirp` in sim. | **Phone + `tools/sim/` Module 06** (`3D FMCW (Sim)` + `SIMULATED D63` banner + Mode Toggle). |

---

## 3. Exact Accepted Voice Lines (`IntentInterpreter.kt` — Unmodified Reference)

Speak **only** these exact phrasings during live offline mode (hold button ≥ 350 ms, speak after low tone, release):

### A. Brief & Spatial Recall
* **Tap once** (`< 350 ms`): Settle-in brief (`"In front of you…"`). Second tap repeats only changes.
* **Spoken Brief:** `"What is around me"` · `"What's around me"` · `"What is on the table"` · `"What is in front of me"` · `"Describe"` · `"What do you see"` · `"Look around"`
* **Find Object:** `"Where is my <object>"` · `"Find the <object>"` · `"Where did I put my <object>"` · `"Do you see my <object>"` · `"<object>"`
* **Side Query (NO object name in phrase):** `"What is on my right"` · `"What is on my left"` · `"Who is on my right"` · `"Who is on my left"`
* **Reach / Changes / People:** `"What can I reach"` · `"What is within reach"` · `"What changed"` · `"Did anything move"` · `"How many people"`

### B. Touch & Point (`WhatIsThis` — Exact Lines!)
* **Say:** `"What is this?"` · `"What's this?"` · `"What is that?"` · `"What am I holding?"` · `"What am I touching?"` · `"What am I pointing at?"` · `"What am I pointing to?"` · `"Where am I pointing?"` · `"What am I pointing?"` · `"What is this I am holding?"` · `"What is this I am pointing at?"`
* **Avoid:** Do **NOT** insert `"object"` or `"now"` between `"what"` and `"am I"` (e.g., avoid *"What object I am holding now?"*).

### C. System 2 Torch Test (`IsReal`)
* **Say:** `"Is this apple real?"` · `"Is the apple real?"` · `"Is it real?"` · `"Is this a photo?"` · `"Is that a picture?"` · `"Is it fake?"`
* *(If Whisper mishears and asks `"Did you mean: is this apple real?"`, hold and say **`"Yes"`**.)*

### D. Closed-Loop Hand Guidance (`Guide`)
* **Say:** `"Guide my hand to the <object>"` · `"Guide me to the <object>"` · `"Help me reach the <object>"` · `"Take my hand to the <object>"`
* **Stop Mid-Guidance:** `"Stop"` · `"Cancel"` · `"Be quiet"`

### E. Personal Object (`My Watch`)
* **Teach Mine:** `"This is my watch"` · `"Remember this is my watch"`
* **Teach Look-Alike:** `"This is not my watch"` · `"This is the other watch"`
* **Verify:** `"Is this my watch?"` · `"Is that my watch?"` · `"Is this mine?"` · `"Did I pick my watch?"`

### F. Voice Diary (`Note` & `ReadNotes`) & OCR (`Read`)
* **Save Note:** `"Note: <message>"` · `"Take a note: <message>"` · `"Make a note: <message>"`
* **Read Notes:** `"Read my notes"` · `"What did I note"` · `"My notes"`
* **OCR Reading:** `"Read this"` · `"What does this say?"` · `"What is written?"` → continue with `"Read on"` / `"Continue"` / `"Yes"`

### G. Online Mode (`Online` — D51/D53/D54)
* **Toggle:** **Triple-tap** (`3 taps within 0.9 s`), or say `"Go online"` / `"Go offline"`.
* **One-shot:** `"Go online and <any question>"`
* **Remember:** While `ONLINE` is active, **every** voice prompt goes to Gemini and **all local `moved` / `can't see` alerts are paused**. Always **triple-tap OFF** before moving the bottle!

### H. Exact Recognised Object Words (`ObjectWords.kt`)
* **Recognised Kit Words:** `bottle` (`water bottle`, `flask`) · `cup` (`mug`, `coffee`, `tea`, `glass`, `tumbler`) · `apple` · `banana` · `laptop` (`computer`, `notebook computer`) · `mouse` · `book` (`books`) · `phone` (`mobile`, `cell phone`, `cellphone`, `smartphone`) · `table` (`desk`).
* **Honest Unsupported Words** *(replies `"I can't recognise a … yet"`)*: `watch`, `pen`, `pencil`, `keys`, `key`, `wallet`, `glasses`, `goggles`, `spectacles`, `charger`, `earphones`, `headphones`, `bag`, `notebook`, `paper`, `id card`, `card`, `remote`, `scissors`, `keyboard`.
