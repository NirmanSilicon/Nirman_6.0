# Integration audit

## Round 2 — three-ZIP consolidation (this pass)

**Master / primary project (per the user's instruction): `SANGAM_Integrated_Complete.zip`** — the Round 1 result below (Person 5 backend + Person 3 AAC, already integrated). Treated as the base to preserve: its dashboard, server, routing, and styling were kept untouched except where a verified fix was ported in.

| Archive | What it contained | Inspection result | Action taken |
|---|---|---|---|
| `SANGAM_Integrated_Complete.zip` (master) | Full app: Node/Express/ws server, QR sessions, real-time chat + turns, volunteer assistance, SANGAM Learn, AAC phrase board/composer, tests, docs | Fully functional; most complete of the three (only archive with a backend) | Kept as the foundation |
| `this.zip` | Static frontend only (`index.html`, `assets/app.js`, `assets/styles.css`, fonts, Tesseract vendor files) — **no server** | `index.html` and `styles.css` are a byte-for-byte match with the master's pre-AAC/pre-Person5 ancestor. `app.js` differs: it carries **real bug fixes** the master's `app.js` does not have (see below) | Four fixes ported into the master's `assets/app.js`; no files replaced wholesale |
| `sangam_anannya.zip` | Identical file list to `this.zip`; same docs, CSS, fonts, vendor files byte-for-byte | `app.js` is functionally identical to the master's existing `app.js` (both use the plain, non-robust speech/OCR code path) — this is the version the master's frontend was already built from | Nothing to integrate; it contributed no capability the master lacks |

### What `this.zip` had that the master was missing

All four are additive, backward-compatible fixes to existing features — not new UI, not architecture changes. Verified by inspecting the code (a visible "Speak" or "Read the text" button does not by itself prove the underlying logic is correct, per the integration brief), then confirmed with targeted Playwright tests (`test-integration-fixes.js`, 9/9 passing — see Test Report):

1. **Speech-output robustness (`speak()` in `assets/app.js`).** The master's version called `synth.getVoices()` fresh on every call and had no handling for Chrome's known "stuck paused" state. Ported: voice-list caching with `onvoiceschanged`, a `synth.resume()` call when the engine is paused before `cancel()`/`speak()`, a three-step voice fallback (exact locale → language prefix → first available voice, instead of failing silently with no voice set), and an `onerror` handler on the utterance.
2. **Speech-input locale fallback.** The access profile defaults `lang` to `"en-IN"`. Chrome/Edge's **SpeechRecognition** API (unlike speech synthesis) does not reliably support `en-IN` as a recognition locale — only `this.zip` had this case covered, forcing recognition to use `en-US` while leaving synthesis/captions on the user's chosen locale.
3. **Continuous listening.** The master's `rec.onend` simply stopped and reset the button; it did not restart recognition when Chrome/Edge auto-ends a `continuous: true` session after a pause in speech, which `this.zip`'s version did. Ported the restart-if-still-listening logic, and moved the `on = false` flag-set to happen **before** `rec.stop()` in the click handler (not after, in `onend`) so that a user-initiated stop doesn't race with the new auto-restart path. Also ported: terminal errors (`not-allowed`, `service-not-allowed`, `audio-capture`) now clear the `on` flag so a blocked microphone can't loop retrying forever.
4. **OCR image preprocessing ("Read from a photo").** The master passed the raw photo straight to Tesseract. `this.zip` pre-processes it first — upscaling small photos and applying grayscale + contrast via a canvas — before recognition, which materially improves accuracy on small printed text photographed on a phone (the primary real-world use case for this feature). Ported `prepImageForOcr()` plus the `tessedit_pageseg_mode`/`preserve_interword_spaces` worker parameters and whitespace-collapsing on the output text that `this.zip` also had.

### What was deliberately NOT ported from `this.zip`

`this.zip`'s `app.js` is a visibly earlier draft in one respect: large stretches of inline `style="..."` attributes on buttons and divs in the "Speak and caption" reply-preview section, duplicating what the master's CSS classes (`.omode`, `.ov`, `.rhy`, `.btn-sm`, confirmed present in `assets/styles.css`) already do. Porting those would have reintroduced redundant, harder-to-maintain styling without adding any capability, so the master's cleaner class-based markup was kept as-is. Debug `console.log` statements in `this.zip`'s speech-recognition handlers (`onaudiostart`, `onspeechstart`, `onnomatch`, `onaudioend`) were also left out as noise, not functionality.

### `index.html` and `styles.css`

No changes. Diffed all three archives: the master's markup already carries every element ID the patched `app.js` code depends on (`#mic`, `#file`, `#run`, `#scanText`, `#tscript`, etc. — all matched before any edit was made), and its CSS already defines every class the cleaner markup needs. `this.zip` and `sangam_anannya.zip` contributed no markup or styling the master lacked.

### Backend

No backend code existed in `this.zip` or `sangam_anannya.zip` (no `server/` directory, no `package.json`, no `.env.example` in either). The master's `server/server.js` is unchanged in this round.

## Round 1 — prior consolidation (carried forward, for history)

| Archive | Role in final application | Result |
|---|---|---|
| `SANGAM_Person5_Complete_V5.zip` | Baseline: Node server, QR sessions, WebSocket chat, turns, volunteers, Learn, documentation and tests | Retained |
| `sangam_person3_janvi.zip` | Editable AAC composition, expanded phrase categories and text-message workflow | Integrated into the Person 5 dashboard and real chat boundary |
| `sangam_sid.zip` | Alternate static shell and styling | Audited; not copied because it duplicates the shared UI and would disconnect Person 5 modules |

Person 5 remained the baseline because it is the only archive with the server and a runnable smoke suite. Person 3's original local received-message demo was not integrated because it could be mistaken for cross-device delivery. The final message composer sends through an active Person 5 WebSocket chat; without one it directs the user to create or join a session. Person 3's phrase board now supports edit, undo, clear, speak and transfer to the message composer. Sid's application overlapped the Person 5 frontend while lacking the session modules and server, so no source files were copied from it.

## Confirmed limitations

Server records are in memory and are lost when the server restarts. Browser speech, camera capture, OCR, QR scanning, vibration, and text-to-speech need browser/device support. Physical Braille, haptics, screen-reader combinations, two-phone QR scanning, and real volunteer verification require external verification and are not claimed as tested.
