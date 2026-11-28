# Integrated build changes

## Round 1
- Added Person 3's editable AAC phrase composition and categories: Needs, Feelings, Medical, Help, and Everyday Conversation.
- Added a Text messages dashboard panel wired to the active Person 5 live chat instead of a misleading local incoming-message demo.
- Added a safe event bridge so real inbound WebSocket messages can appear in the message activity panel.
- Centered uploaded OCR previews within their panel to avoid unused visual space with portrait images.
- Added integration audit documentation and updated verification reporting.

## Round 2 — three-ZIP consolidation (`this.zip`, `sangam_anannya.zip`, master)
- `assets/app.js` — `speak()`: cache the voice list, resume a paused speech engine before speaking, fall back through exact-locale → language-prefix → first-available voice instead of silently speaking with no voice set, and attach an `onerror` handler. Ported from `this.zip`.
- `assets/app.js` — speech recognition now requests `en-US` instead of `en-IN` (the access profile's default language), since Chrome/Edge's recognition API does not reliably support the `en-IN` locale even though speech synthesis does. Ported from `this.zip`.
- `assets/app.js` — speech recognition now restarts itself when the browser auto-ends a `continuous: true` session after a pause, so "Start listening" stays listening instead of silently going quiet; a user-initiated stop is now flagged before `rec.stop()` is called so it can't race with the new auto-restart; a blocked/denied microphone no longer retries forever. Ported from `this.zip`.
- `assets/app.js` — "Read from a photo" (OCR) now upscales small photos and applies grayscale + contrast before running Tesseract, and sets `tessedit_pageseg_mode`/`preserve_interword_spaces`, meaningfully improving accuracy on small printed text photographed on a phone. Ported from `this.zip`.
- Added `test-integration-fixes.js` — 9 targeted Playwright checks for the four fixes above (none of which the existing `test-e2e.js` suite exercised).
- No changes to `index.html`, `assets/styles.css`, or any server file in this round — both additional archives were frontend-only and contributed no markup, styling, or backend code the master lacked. `this.zip`'s inline-style duplication of existing CSS classes and its debug `console.log` statements were deliberately not carried over.
