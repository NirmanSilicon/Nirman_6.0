# Voice navigation guide

Voice navigation is **optional and off by default**.

## How it works

- Enable it in *Accessibility -> Navigation -> Voice-guided navigation*. A "Voice commands" button then appears in the header (shortcut **Alt+V**).
- The first time, a consent screen explains: the browser's built-in speech recognition is used. **In Chrome and Edge this sends the sound to the browser company's servers.** Choose "Not now" and nothing is listened to.
- Each press of the button listens **once**. There is no always-on microphone and no wake word.
- The page replies in text (a live region) and, if "Read new notifications aloud" is on and no screen reader mode is set, by voice.

## Commands

Open dashboard · Open communication · Read current page · Read my messages · Open accessibility settings · Increase text size · Decrease text size · Go back · Open profile · Start voice-to-text · Stop voice input · Repeat · Stop speaking · Sign out · Help (lists these).

## Confirmation

"Start voice-to-text" and "Sign out" show a confirmation (button, or say "yes"). Nothing is ever sent, deleted or changed without a separate confirmation. Unrecognised speech says so and does nothing.

## Errors people may meet

| Message | Meaning |
|---|---|
| Microphone access was blocked | Allow the microphone for this site in the browser |
| No microphone was found | Connect one |
| The browser's speech service could not be reached | No network, or the browser has no speech service (Firefox does not provide one) |
| I didn't hear anything | Press the button again and speak after the beep or prompt |

## Status

IMPLEMENTED_NOT_FULLY_VERIFIED. The code loads and the button, consent and confirmation logic exist. No microphone or speech service was available in the test environment, so recognition accuracy, accents and noisy rooms were not tested. Do not describe this as tested with voice users.