# Blind and low-vision user implementation

What a blind person can do today, honestly stated.

| Task | How | Status |
|---|---|---|
| Find the way around | Skip link, headings, landmarks, one h1 per view, route announcements | IMPLEMENTED_NOT_FULLY_VERIFIED |
| Create an account and sign in | Labelled fields, an error summary that takes focus, password rules stated before the error, show/hide password | IMPLEMENTED_NOT_FULLY_VERIFIED |
| Choose a role and finish onboarding | Wizard with "Step 2 of 5" text and a progress value, choices as real checkboxes/radios in fieldsets, save per step, resume later | IMPLEMENTED_NOT_FULLY_VERIFIED |
| Hear incoming messages | "Listen to spoken messages" preference; spoken notifications; announcements at the level chosen | IMPLEMENTED_NOT_FULLY_VERIFIED |
| Send messages | Type, voice-to-text, phraseboard, Braille routing, switch scanning | Existing features, tested in the earlier suites |
| Use sign recognition | Not meaningful without sight of the camera view; the page announces what was recognised and never sends without confirmation | n/a |
| Ask an interpreter | Form with a language list, session type and optional time; status announced | COMPLETED (API) / IMPLEMENTED_NOT_FULLY_VERIFIED (screen reader) |

## Not done, and why

- No screen-reader test (NVDA, JAWS, VoiceOver, TalkBack) was run. Everything above rests on the semantics being correct, which was checked by an automated in-page audit and by reading the markup, not by listening.
- Camera-based features need someone to point a camera; they are not a blind-user feature and are not claimed as one.
- Voice commands depend on the browser's speech service and a microphone, neither of which was available in testing.

## Recommended before relying on this

Run SCREEN_READER_GUIDE.md section "Test plan" with at least two screen readers and two blind testers, record what fails, and fix it. The wording in the app should not claim "tested with screen readers" until that is done.