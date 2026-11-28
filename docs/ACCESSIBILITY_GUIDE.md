# SANGAM accessibility guide

SANGAM supports combinations of user-selected preferences. Preferences describe how a person wants to interact; they are not disability labels and are never shared with other participants (the server relays messages, not profiles).

## Built in

* Keyboard operation for every control, visible focus, skip link, landmarks, labelled controls, 44 px minimum touch targets.
* Reflow at 320 px wide, 200% zoom with 160% text scale, high-contrast mode (measured at 7:1 on sampled surfaces), reduced motion respected (the demo board starts paused).
* Status text for every state. Colour, sound and vibration are never the only signal.
* **Announcements you control** (Profile → "Spoken status updates for screen readers"): *Everything*, *Important only (errors and alerts)*, or *Alerts only (alarms and emergencies)*. Sound alerts and emergency alerts use `role="alert"`.
* **Confirm before sending** option, switch-scanning options (auto-scan on/off, number of passes before pausing, speak the highlighted item).
* Haptic patterns (ten: Yes, No, Help, Emergency, Message received, Call incoming, Alert, and others) each with a text description, Test and Stop, a strength setting (pulse length scaling) and per-pattern on/off. Browsers expose no real intensity control, so there is none.

## Error-handling matrix (what the app says)

| Situation | What the user sees |
|---|---|
| Camera or microphone permission denied | A plain message saying what is blocked and how to change it; nothing starts |
| No camera/microphone, or in use by another app | A distinct message for each |
| Device unplugged or stopped during use | Status changes to stopped and says so |
| Model failed to load, or wrong model files | "Not available", the reason, and nothing pretends to listen |
| Server unreachable / peer offline | Message stays "Waiting to reconnect" or "Not sent" with Retry; never "Delivered" |
| Translation not configured | "Not set up"; no Translate button; no invented text |
| Output the receiver chose could not be delivered | Sender sees "may not have reached" notice |
| Unsupported characters in Braille | Listed explicitly |

These are covered by browser tests in `test-browser.js`, `test-sign-browser.js`, `test-sound-browser.js` and `test-access-browser.js`.

## Screen-reader validation procedure (not yet performed)

Automated checks (axe-core, 75 checks in `test-a11y.js`) cannot establish how a screen reader reads the app. Please test with **NVDA + Firefox or Chrome (Windows)**, **VoiceOver + Safari (macOS and iPhone)** and **TalkBack + Chrome (Android)**, and record the result per item:

1. Page title, landmarks and headings are announced in a sensible order.
2. Each dashboard card has a unique, meaningful name.
3. Connect: join a session; check that incoming messages, typing, turn changes and delivery states are announced once, without moving focus.
4. Sign camera: open the dialog (focus moves in, Escape closes it, focus returns), hear the partial and final updates, confirm Send works with only the keyboard.
5. Sound alerts: start listening, trigger the test beep, confirm the alert is announced immediately and not repeated.
6. Emergency: receive an alert, confirm it is announced and the acknowledge button is reachable.
7. Switch the status-update setting to *Important only* and *Alerts only* and confirm the right messages are suppressed.
8. Zoom to 200% and use a 320 px window.

Record the assistive technology, version, browser, date, tester, and each failure. Until this is done, SANGAM makes no screen-reader compatibility claim.

## Boundaries

This package has not been validated on a physical Braille display, switch device, screen reader pairing, vibration motor, or several phones. Speech recognition, translation, sign recognition and external hardware depend on browser, device or separately configured services, and the app tells the user when one is not available.

## Privacy

Preferences stay on the participant's device. They are not placed in session names, QR data, logs or presence events. **Profile → Your data on this device** exports (`sangam-my-data.json`) or deletes everything SANGAM keeps in the browser. Conversations are never stored on the device by SANGAM.
