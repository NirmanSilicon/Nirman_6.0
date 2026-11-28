# SANGAM integration report

## 0. Second integration pass (this version)

Supplied: the project ZIP produced by the first pass, a web build with sound alerts, a Flutter sound-alert reference project, and two long implementation prompts. What was done, and what was not:

| Requirement area | Result |
|---|---|
| Sound alerts from the Flutter reference | Re-implemented for the web (the Flutter code cannot run in a browser) with the same idea: the YAMNet model, categories and cooldown. Real model, local, self-checked. Tested on **synthetic** audio only. |
| Sign Language Camera | Built end to end. Recognises **signs the user teaches**; **no ISL model exists in this build** (none could be obtained and licensed; see `docs/SIGN_LANGUAGE_MODEL_RESEARCH.md`). Tested with a **fake camera and mock hands**. Not tested with a real signer. |
| Translation | Unchanged adapter; configuration and a capability matrix documented. **Nothing verified** (no provider key). Hindi and Odia end to end remain unverified. |
| Braille | Incoming messages and sound alerts now reach connected display adapters. **No real display driver; no hardware test.** |
| Deafblind | Optional undoable preset and honest delivery notices, labelled "under validation". Validation plan written; no deafblind person was involved. |
| Haptics, switch, accessibility, persistence | Ten patterns with settings; scanning options; announcement levels; export and delete of local data; chats are never stored. |
| WebRTC voice, emergency | Unchanged and still only two-context tested. The emergency flow still alerts people in the session, not emergency services, and never claims more than the other device confirmed. |

Security constraints were kept: no authentication, token, rate-limit, origin or turn check was removed; no key is in frontend code; camera frames and audio are never sent to the server. One new WebSocket frame (`presented`) is validated and rate limited like the others.

Decisions to revisit:
1. **The ISL gap.** The most useful next step is an ISL model with a real evaluation, which needs the INCLUDE data (non-commercial licence noted) and Deaf ISL signers' review.
2. **YAMNet provenance.** The model file is a third-party repack. Swap in Google's file when you can reach the host (`vendor/yamnet/README.md`).
3. **Legacy MediaPipe Hands.** Google keeps the legacy solution as-is. Moving to the newer Hand Landmarker changes only the extractor layer.
4. **Persistence.** Chats stay session-only. Settings and taught signs stay on the device, with export and delete.

See `TEST_REPORT.md` for exactly what was and was not tested.

## 1. What was supplied (first pass)

- `SANGAM_Integrated_Final.zip` — treated as the foundation.
- `SANGAM_Integrated_Complete.zip` — compared against it.

**Comparison result.** A file-by-file diff shows `Complete` is the same project as `Final` minus four frontend fixes in `assets/app.js` (speech synthesis robustness, recognition locale fallback and restart, OCR preprocessing), the `test:e2e` and `test:integration` npm scripts, `test-integration-fixes.js`, `RUNNING_INSTRUCTIONS.md`, and slightly different changelog, audit and test-report text. It has four older screenshots that `Final` does not. It contains no feature, server code or markup that `Final` lacks, so nothing was merged from it and its old screenshots were not carried over.

## 2. What the foundation really contained

The foundation looked complete from the dashboard but several features were a label or a partial. A requirement-by-requirement audit is in `REQUIREMENTS_REGISTER.md` ("Original status" column). Summary of the 137 audited rows:

| Original status | Rows |
| Missing | 47 |
| Working | 45 |
| Partial | 38 |
| Planned-label | 2 |
| Label only | 2 |
| Working (untested) | 2 |
| Working (by absence) | 1 |

The most important finding: the **"What comes next"** panel was a placeholder timeline of things marked *Planned*, **Switch** input was a word with nothing behind it, **Emergency** was a local dialog that told no one, **messages showed "sent" immediately without any confirmation**, **photo text and voice transcripts could not be sent anywhere**, and **live voice was a planned label**. These are the incomplete features the work targeted.

## 3. Incomplete features: implemented, not relabelled

For each, what changed in code and how it was checked. Statuses are the final ones from the register.

| Feature | What was built | Final status |
|---|---|---|
| Honest delivery | Server `ack` → `delivered` frame; client outbox with Sending / Sent / Delivered / Waiting to reconnect / Not sent + Retry; de-duplication by client id; draft kept while offline. Delivered appears only when the peer's device confirms. | Browser- and automated-tested |
| Voice to chat | Review box; edit; explicit Send; Discard; no auto-send; mic only on button press. | Awaiting physical-device testing (stand-in speech engine only) |
| Photo to chat | Validation, confidence, replace/remove, copy, read aloud, send after review, provenance label. | Browser-tested |
| Phrase board to chat | Draft, send, duplicate guard, custom phrases. | Browser-tested |
| Receive-side outputs | Captions, per-message Read aloud, Braille line, haptic pattern chosen by the **receiver's** profile. Profile never sent. | Browser-tested (haptic awaiting a real device) |
| Emergency | Reviewed message → session → full-screen alert → acknowledgement → honest failure → fallback card. | Browser-tested |
| Translation | Server adapter (LibreTranslate, Google), visible original and translation, editable, honest unconfigured state. | Blocked by external dependency (no real provider available) |
| Live voice | WebRTC with consent, decline, mute, hang up. | Awaiting physical-device testing (two browser sessions on one machine only) |
| Haptics | Eight meaningful patterns with Test, Stop and descriptions. | Awaiting physical-device testing |
| Braille | Honest Grade 1 preview, wrapping, copy, unsupported characters reported, receive-side line. | Browser-tested (preview only) |
| Switch scanning | Keyboard-driven group/item scanning. | Awaiting physical-device testing |
| What comes next | Live capability check plus a hand-written honest status table with a fixed vocabulary. | Browser-tested |

Not implemented (first pass; see section 0 for what changed): sentence-level sign-language translation and ISL recognition, a physical Braille display driver, and persistence after restart (in memory by design).

## 4. Decisions and assumptions you may want to revisit

1. **Foundation choice.** `Final` over `Complete`, because `Complete` is a strict subset.
2. **Profile stays on each device.** The other participant never learns your input or output choices. Each device renders received messages by its own profile. This is stricter than showing the sender's profile to the peer.
3. **The default profile changed.** The foundation default was Voice, Text and Switch (no Camera), which hid the photo box for a fresh user and meant the Switch label was on without doing anything. The default is now Voice, Camera and Text. Switch is off until chosen, because choosing it now really starts keyboard scanning.
4. **Incoming emergency alerts vibrate on devices that can, even if Haptic is not in the receiver's profile**, because an alert should reach the person through every channel they have. They speak aloud only if Spoken is in the profile. Say if you would rather vibration obey the profile.
5. **Sessions persist while you move around the app.** Leaving the Connect panel no longer ends the chat; End session is explicit.
6. **Volunteers are described as helpers**, not interpreters. The category label changed from "Sign-language interpreter" to "Sign-language help (volunteer, not a certified interpreter)".
7. **Odia and Hindi are not claimed to work end to end.** What is shown depends on the translation provider's own language list and the voices installed on the device.
8. **Persistence is in memory by design** and documented.

## 5. Security posture

Nothing was removed or weakened: authentication, session tokens, participant keys, rate limits, origin checks, turn authorisation and host key secrecy are intact and now have tests (including new ones for the WebSocket origin check and no-store headers). New endpoints require membership proof and are rate limited. No API key exists in any frontend file (checked by a scan test); translation keys are read from the server environment and sent to the provider in a request header. No profile data appears in presence events, QR payloads, session names or join URLs (tested). A Content-Security-Policy and standard headers were added; the policy allows the bundled OCR engine and no external hosts.

## 6. Foundation defects found and fixed

See `CHANGELOG.md` ("Bug fixes in the foundation") and `TEST_REPORT.md` ("Failures found along the way").

## 7. What I could not verify

Real microphone and recognition, physical vibration, switch hardware, Braille hardware, a real two-device voice call, a real translation provider and Odia/Hindi end to end, screen readers, and non-Chromium browsers. See `TEST_REPORT.md` ("Not verified"). Browser screenshots are real, but phone shots are Chromium emulation.

## 8. Deliverables

`REQUIREMENTS_REGISTER.md`, `IMPLEMENTATION_PLAN.md`, `INTEGRATION_REPORT.md` (this file), `TEST_REPORT.md`, `README.md`, `CHANGELOG.md`, `screenshots/` (22 captures plus `screenshots/README.md`), `docs/` (API, accessibility guide, Braille adapter guide, previous notes) and the project ZIP.

## 9. Final verification of the ZIP

`SANGAM_Complete_Implementation_v2.zip` passes `unzip -t`, extracts with all files at the root, installs with `npm ci` (0 vulnerabilities reported) and passes all 736 automated and browser checks when run from that clean extract. The count mixes real-model, fake-device and stand-in results; `TEST_REPORT.md` separates them and lists what was never tested.
