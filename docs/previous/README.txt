SANGAM — CREATIVE UI/UX REVIEW BUILD

This is a review build of the SANGAM static website with a new visual direction.

WHAT CHANGED
- Introduced a brighter, more expressive colour system with cobalt, teal, coral, lilac, mint and butter accents.
- Added Space Grotesk / DM Sans typography with local font fallbacks.
- Added layered hero styling, circular decorative geometry, soft gradients and shadows.
- Refined navigation, dashboard surfaces, feature cards and section styling.
- Added restrained entrance/floating motion and reduced-motion support.
- Reframed the hero visual as an illustrative communication relay.

WHAT WAS PRESERVED
- Existing static HTML/CSS/JavaScript architecture.
- Existing dashboard and feature navigation.
- Existing speech, text-to-speech, OCR, phrase board, access profile and Braille preview code.
- Bundled Tesseract resources.

RUN LOCALLY
1. Extract the ZIP.
2. Open a terminal in the sangam-web folder.
3. Run: python -m http.server 8080
4. Open: http://localhost:8080

Use a modern version of Chrome or Edge for the best compatibility. Microphone features require permission and browser support. OCR uses the bundled English model. Some browser speech recognition implementations may require internet access.

NOTE
This is a review build, not an approved final release. The browser-based screenshot/visual QA environment was blocked in this session, so no genuine screenshots are included and desktop/mobile rendering has not been visually verified here. Please run it locally and share screenshots/feedback for the approval round.


RENDERING FIX (November 2026)
- Replaced accidental literal backslash-n sequences in HTML, CSS and JavaScript with real line breaks.
- This prevents escaped newline text from leaking into the page and corrupting markup/resource declarations.
- Keep the project files saved as UTF-8.
