# SANGAM implementation plan

This is the plan that was followed. The **Planned work** column is the step recorded for each requirement *before* implementation started (it comes from the pre-implementation audit of the foundation ZIP). The **Outcome** column was filled in afterwards from `REQUIREMENTS_REGISTER.md`, so a reader can see where the plan and the result differ.

## Approach

1. **Foundation.** `SANGAM_Integrated_Final.zip` was used as the base. `SANGAM_Integrated_Complete.zip` was compared file by file: it is the same project *without* the four frontend fixes (speech synthesis robustness, recognition fallback and restart, OCR preprocessing) and without `test-integration-fixes.js`. It contained no feature the foundation lacks, so nothing was merged from it. Its four old screenshots were not carried over.
2. **Baseline first.** Run the 70 existing checks (smoke 43, end-to-end 18, integration 9) before touching anything. All passed once the harness servers were started.
3. **Audit.** Read every dashboard panel, input mode, output mode, profile setting and server route; classify each as Working / Partial / Label only / Missing / Planned-label. The result is the *Original status* column.
4. **Preserve list.** Speech synthesis caching/resume/fallback/onerror, recognition en-IN→en-US fallback with restart and terminal-error protection, OCR preprocessing and bundled Tesseract, session/participant tokens, rate limits, origin checks, turn authorisation, host-key secrecy, no-store headers. These are changed only to *add* behaviour, never to loosen a check.
5. **Build in dependency order:** server protocol (acks, delivery, cid de-duplication, provenance, emergency ack, signalling relay, capabilities, translation adapter, security headers) → chat client (outbox and delivery states) → receive-side rendering from the receiver's own profile → input flows (voice review, photo, phrase board, messages) → output controls (speech, haptic, Braille) → emergency → translation UI → live voice → switch scanning → accessibility pass → status panel.
6. **Test as each layer lands:** `server/test-features.js` for protocol and adapter behaviour, `test-browser.js` for two-participant behaviour, `test-a11y.js` for axe-core, keyboard, touch target, reflow and reduced-motion checks.
7. **Honest labelling.** The in-app *What comes next* table and the register use one fixed vocabulary. A feature is only called tested for what the test actually exercised.
8. **Deliver.** Register, plan, integration report, test report, README, changelog, screenshots, clean ZIP, verified by extracting it fresh and re-running the full suite.

## Rules that applied throughout

- Do not remove authentication, token validation, rate limits, participant validation, origin checks or turn authorisation.
- Do not expose host keys or participant credentials; never hard-code API keys; use environment variables.
- Keep sensitive preferences out of presence events, QR payloads, session names and logs.
- Do not delete or weaken a failing test to make a result look better; investigate instead.
- No fake functionality: no fake translations, delivery confirmations, device connections, Braille or switch hardware, or emergency-service integration.
- Never auto-send a transcript; never auto-start the microphone.
- Do not mark live voice calling as complete without a two-device test.
- Do not claim visual verification without running the app in a browser.

## Planned work by area

### Dashboard

| ID | Requirement | Original status | Planned work | Outcome |
|---|---|---|---|---|
| R01 | Access profile panel | Partial | Per-device profile; some settings lacked visible effect. Extend (app.js, outputs.js). | Implemented and browser-tested |
| R02 | Speak and caption panel | Partial | Mic works; transcript could be sent nowhere and was not reviewable. Add review/edit/send (app.js). | Implemented but awaiting physical-device testing |
| R03 | Read from a photo panel | Partial | OCR worked; no validation, replace/remove, confidence, copy, send, provenance. | Implemented and browser-tested |
| R04 | Phrase board panel | Partial | Tiles spoke; no send, no duplicate guard, no custom phrases. | Implemented and browser-tested |
| R05 | Text messages panel | Partial | Optimistic 'sent' state only; no real delivery states. | Implemented and browser-tested |
| R06 | Connect and chat panel | Working | QR sessions + WS chat verified. Extend with ack/delivery, translation, emergency, live voice. | Implemented and browser-tested |
| R07 | SANGAM Learn panel | Working | Real content already present; keep, add keyboard/a11y checks. | Implemented and automated-tested |
| R08 | Human assistance panel | Working | Volunteer flow verified; tighten wording so volunteers are not read as interpreters. | Implemented and automated-tested |
| R09 | What comes next panel | Planned-label | Timeline placeholder only. Replace with live capability + implementation-status panel (next.js). | Implemented and browser-tested |
| R10 | Emergency | Partial | Local dialog only. Build reviewed, session-delivered, acknowledged workflow. | Implemented and browser-tested |

### Input

| ID | Requirement | Original status | Planned work | Outcome |
|---|---|---|---|---|
| R11 | Voice input mode | Working | Preserve recognition fixes; add review step. | Implemented but awaiting physical-device testing |
| R12 | Camera / photo input mode | Partial | Photo upload OCR only (no live camera capture claim). | Implemented and browser-tested |
| R13 | Text input mode | Working | Composer exists; add delivery states and draft keeping. | Implemented and browser-tested |
| R14 | Switch input mode | Label only | Implement keyboard-switch scanning (switch.js). No hardware claim. | Implemented but awaiting physical-device testing |

### Output

| ID | Requirement | Original status | Planned work | Outcome |
|---|---|---|---|---|
| R15 | Spoken output | Working | Preserve speak(); add stop/repeat/voice picker/no-overlap controls. | Implemented and automated-tested |
| R16 | Caption output | Working | Chat log + transcript; keep. | Implemented and browser-tested |
| R17 | Haptic output | Partial | Syllable rhythm only. Add semantic patterns, test/stop, capability detection. | Implemented but awaiting physical-device testing |
| R18 | Braille output | Partial | Character preview only. Add honest preview, received-message Braille, adapter boundary. | Implemented and browser-tested |

### Profile

| ID | Requirement | Original status | Planned work | Outcome |
|---|---|---|---|---|
| R19 | Input checkboxes have visible effect | Partial | Unselected input modes must hide/disable the matching controls. | Implemented and browser-tested |
| R20 | Output checkboxes have visible effect | Partial | Unselected output modes must stop that output on received messages. | Implemented and browser-tested |
| R21 | Text scale 100 to 160 percent | Working | Verify and test; check 200% browser zoom. | Implemented and browser-tested |
| R22 | Speech rate | Working | Verify in speak(); test. | Implemented and browser-tested |
| R23 | Language (incl. Odia entry with capability notes) | Partial | Add language capability table; no unverified claims. | Partially implemented |
| R24 | High contrast | Working | Verify and test. | Implemented and browser-tested |
| R25 | Emergency message text | Working | Wire into new emergency workflow. | Implemented and browser-tested |
| R26 | Per-participant profile separation | Missing | Profile stays on each participant's device; receive-side rendering uses local profile; test proves no leak. | Implemented and browser-tested |
| R27 | Sensitive settings never broadcast | Working (untested) | Automated WS-frame capture test. | Implemented and automated-tested |

### Voice

| ID | Requirement | Original status | Planned work | Outcome |
|---|---|---|---|---|
| R28 | Mic never auto-starts; explicit start/stop | Working | Regression test. | Implemented and browser-tested |
| R29 | en-IN to en-US fallback preserved | Working | Existing integration test kept. | Implemented and automated-tested |
| R30 | Continuous restart + user-stop + terminal-error protection | Working | Preserved; extend stub test. | Implemented and browser-tested |
| R31 | Transcript review/edit/confirm before sending | Missing | Review panel with editable textarea. | Implemented and browser-tested |
| R32 | Never auto-send transcripts | Working (by absence) | Explicit test that no chat frame is sent until confirmed. | Implemented and browser-tested |
| R33 | Clear permission-denied / unsupported messages | Partial | Specific messages per error code. | Implemented and browser-tested |

### OCR

| ID | Requirement | Original status | Planned work | Outcome |
|---|---|---|---|---|
| R34 | Preprocessing preserved | Working | Preserved. | Implemented and automated-tested |
| R35 | Bundled Tesseract works offline | Working | Preserved; existing test. | Implemented and automated-tested |
| R36 | File type and size validation | Missing | Validate before processing. | Implemented and browser-tested |
| R37 | Progress and failure states | Partial | Add failure text, retry. | Implemented and browser-tested |
| R38 | Confidence display | Missing | Show mean confidence, low-confidence warning. | Implemented and browser-tested |
| R39 | Replace and remove photo | Missing | Add buttons. | Implemented and browser-tested |
| R40 | Copy extracted text | Missing | Clipboard with fallback. | Implemented and browser-tested |
| R41 | Read extracted text aloud | Partial | Via shared TTS controls. | Implemented and browser-tested |
| R42 | Send extracted text to chat after review | Missing | Review then SangamChat.send(source=ocr). | Implemented and browser-tested |
| R43 | English-only note | Missing | Visible note. | Implemented and browser-tested |
| R44 | OCR provenance visible in chat | Missing | Server stores whitelisted source field. | Implemented and automated-tested |

### Phrase

| ID | Requirement | Original status | Planned work | Outcome |
|---|---|---|---|---|
| R45 | Tiles speak aloud | Working | Preserve. | Implemented and automated-tested |
| R46 | Draft review/edit | Partial | Editable draft kept. | Implemented and browser-tested |
| R47 | No accidental duplicate sends | Missing | Debounce + duplicate warning. | Implemented and browser-tested |
| R48 | Send phrase draft to chat | Missing | Send after review. | Implemented and browser-tested |
| R49 | Custom phrases saved locally | Missing | Add/remove custom phrases. | Implemented and browser-tested |

### Messages

| ID | Requirement | Original status | Planned work | Outcome |
|---|---|---|---|---|
| R50 | Composer with counter | Working | Preserve. | Implemented and browser-tested |
| R51 | Accurate delivery states | Missing | draft/sending/sent/delivered/failed/pending retry. | Implemented and browser-tested |
| R52 | Draft kept on disconnect | Missing | Keep text if not connected. | Implemented and browser-tested |
| R53 | Retry and pending queue | Partial | Retry controls; offline queue. | Implemented and browser-tested |
| R54 | No false 'delivered' claim | Missing | Delivered only on peer ack frame. | Implemented and automated-tested |
| R55 | Server dedupes retried messages | Missing | Client id (cid) dedupe. | Implemented and automated-tested |

### Chat

| ID | Requirement | Original status | Planned work | Outcome |
|---|---|---|---|---|
| R56 | QR create and join | Working | Preserved. | Implemented and automated-tested |
| R57 | Presence | Working | Preserved. | Implemented and automated-tested |
| R58 | Typing indicator | Working | Preserved. | Implemented and automated-tested |
| R59 | Turn control with authorization | Working | Preserved. | Implemented and automated-tested |
| R60 | Clarification chips | Working | Preserved. | Implemented and automated-tested |
| R61 | Read-aloud toggle default off | Working | Tie to profile/TTS controls. | Implemented and browser-tested |
| R62 | Reconnect with pid+pkey | Working | Preserved. | Implemented and automated-tested |
| R63 | Session end handling | Working | Preserved. | Implemented and automated-tested |
| R64 | Peer delivery acknowledgement | Missing | ack frame -> delivered frame. | Implemented and automated-tested |
| R65 | Message provenance label (voice/OCR/phrase/translated) | Missing | Render labels. | Implemented and browser-tested |

### TTS

| ID | Requirement | Original status | Planned work | Outcome |
|---|---|---|---|---|
| R66 | speak() caching/resume/fallback/onerror preserved | Working | Existing test kept. | Implemented and automated-tested |
| R67 | Stop control | Missing | Stop button. | Implemented and browser-tested |
| R68 | Repeat last | Missing | Repeat button. | Implemented and browser-tested |
| R69 | Voice selection | Missing | Voice select from installed voices. | Implemented and browser-tested |
| R70 | Rate control | Working | Preserved. | Implemented and browser-tested |
| R71 | No overlapping utterances | Working | cancel() before speak; test. | Implemented and automated-tested |
| R72 | Auto-read only when enabled | Working | Test default off. | Implemented and browser-tested |

### Voice-to-voice

| ID | Requirement | Original status | Planned work | Outcome |
|---|---|---|---|---|
| R73 | Mode A: transformed messaging (voice->text->peer output) | Missing | Reviewed voice -> chat -> peer renders by own profile. | Implemented and browser-tested |
| R74 | Mode B: live WebRTC voice | Planned-label | WS signalling + RTCPeerConnection, explicit consent, tested in two contexts only. | Implemented but awaiting physical-device testing |

### Translation

| ID | Requirement | Original status | Planned work | Outcome |
|---|---|---|---|---|
| R75 | Provider abstraction | Missing | server/translate.js. | Implemented and automated-tested |
| R76 | Credentials server-side env vars only | Missing | No key in frontend. | Implemented and automated-tested |
| R77 | Clear message when unconfigured; no fake output | Missing | 501 + UI notice. | Implemented and browser-tested |
| R78 | Source/target/original/translated visible and editable | Missing | Translation card. | Blocked by external dependency |
| R79 | Language capability checks | Missing | Separate recognition/translation/synthesis/rendering. | Implemented and browser-tested |
| R80 | Odia claimed only after full-path test | Missing | Honest status. | Partially implemented |
| R81 | Hindi claimed only after full-path test | Partial | Honest status. | Partially implemented |
| R82 | Translated provenance label | Missing | Label. | Implemented and browser-tested |
| R83 | Failure handling (timeout, provider error) | Missing | Handled with messages. | Implemented and automated-tested |

### Haptic

| ID | Requirement | Original status | Planned work | Outcome |
|---|---|---|---|---|
| R84 | Semantic patterns YES NO HELP EMERGENCY INFORMATION RECEIVED SENT CONNECTION LOST | Missing | outputs.js. | Implemented but awaiting physical-device testing |
| R85 | Test, stop, description per pattern | Missing | UI. | Implemented but awaiting physical-device testing |
| R86 | Unsupported device detection | Partial | Visible state. | Implemented and browser-tested |
| R87 | No false intensity slider | Working | Kept absent. | Implemented and browser-tested |
| R88 | Emergency not vibration-only | Partial | Visual + text + optional sound + vibration. | Implemented and browser-tested |

### Braille

| ID | Requirement | Original status | Planned work | Outcome |
|---|---|---|---|---|
| R89 | Preview improved | Partial | Contractions limited, wrapping, copy. | Implemented and browser-tested |
| R90 | Honesty: not Grade 2, not a physical display | Partial | Visible notice. | Implemented and browser-tested |
| R91 | Physical-device adapter boundary | Missing | Adapter interface, no fake device. | Partially implemented |
| R92 | Verification procedure for hardware | Missing | Documented. | Partially implemented |
| R93 | Received messages rendered in Braille preview | Missing | Per profile. | Implemented and browser-tested |

### Switch

| ID | Requirement | Original status | Planned work | Outcome |
|---|---|---|---|---|
| R94 | Keyboard-only operation of every feature | Partial | Audit + tests. | Partially implemented |
| R95 | Scanning mode | Label only | switch.js. | Implemented but awaiting physical-device testing |
| R96 | No hardware compatibility claim | Working | Wording. | Implemented and browser-tested |

### Emergency

| ID | Requirement | Original status | Planned work | Outcome |
|---|---|---|---|---|
| R97 | Review/confirm before sending | Missing | Confirm step. | Implemented and browser-tested |
| R98 | Send via active session | Missing | kind=emergency frame. | Implemented and automated-tested |
| R99 | Unmistakable recipient indicator | Missing | Emergency banner. | Implemented and browser-tested |
| R100 | Acknowledgement visible to sender | Missing | emergency-ack frame. | Implemented and automated-tested |
| R101 | Honest failure state | Missing | Failed/not-acknowledged text. | Implemented and browser-tested |
| R102 | Alternative when no session | Missing | Show-to-person card, copy, dialer link. | Implemented and browser-tested |
| R103 | No claim of contacting emergency services | Partial | Wording. | Implemented and browser-tested |
| R104 | Not only sound/colour/vibration | Partial | Text + icon + live region. | Implemented and browser-tested |

### A11y

| ID | Requirement | Original status | Planned work | Outcome |
|---|---|---|---|---|
| R105 | Skip link | Missing | Add. | Implemented and browser-tested |
| R106 | Landmarks and headings | Partial | Audit. | Implemented and browser-tested |
| R107 | Dialog focus trap/return | Partial | Fix for join overlay and emergency. | Implemented and browser-tested |
| R108 | aria-live tuning | Partial | Audit. | Partially implemented |
| R109 | Reduced motion | Partial | Audit auto-rotate. | Implemented and browser-tested |
| R110 | 44px touch targets | Partial | Audit with script. | Implemented and browser-tested |
| R111 | 200% zoom / reflow | Missing | Test. | Implemented and browser-tested |
| R112 | Responsive nav aria-expanded/controls | Working | Verify. | Implemented and browser-tested |
| R113 | Colour contrast | Partial | axe check. | Implemented and browser-tested |
| R114 | Icon-only controls labelled | Partial | axe check. | Implemented and browser-tested |

### Responsive

| ID | Requirement | Original status | Planned work | Outcome |
|---|---|---|---|---|
| R115 | 320/360/390/768/1024/1440/1920 px | Missing | Playwright sweep. | Implemented and browser-tested |

### Backend

| ID | Requirement | Original status | Planned work | Outcome |
|---|---|---|---|---|
| R116 | Session tokens | Working | Preserved. | Implemented and automated-tested |
| R117 | Rate limits | Working | Preserved; extend to translate. | Implemented and automated-tested |
| R118 | Origin checks | Working | Preserved. | Implemented and automated-tested |
| R119 | Turn authorization | Working | Preserved. | Implemented and automated-tested |
| R120 | hostKey secrecy | Working | Preserved. | Implemented and automated-tested |
| R121 | No-store on sensitive APIs | Working | Preserved. | Implemented and automated-tested |
| R122 | Persistence decision | Partial | Documented: in-memory by design. | Not implemented |
| R123 | Session TTL and cleanup | Working | Preserved. | Implemented and automated-tested |
| R124 | Health route | Working | Extend with capabilities (no secrets). | Implemented and automated-tested |
| R125 | Volunteer auth | Working | Preserved. | Implemented and automated-tested |
| R126 | Volunteers not implied to be interpreters | Partial | Wording. | Implemented and browser-tested |
| R127 | Error handling matrix (WS closed, mic denied, OCR fail, etc.) | Partial | Test each. | Partially implemented |

### Privacy

| ID | Requirement | Original status | Planned work | Outcome |
|---|---|---|---|---|
| R128 | No API keys in frontend | Working | Static scan test. | Implemented and automated-tested |
| R129 | No sensitive prefs in presence/QR/session names/logs | Working (untested) | Automated test. | Implemented and automated-tested |
| R130 | Security headers | Partial | Add. | Implemented and automated-tested |

### Design

| ID | Requirement | Original status | Planned work | Outcome |
|---|---|---|---|---|
| R131 | Atelier identity preserved | Working | Visual diff review. | Partially implemented |
| R132 | No external font dependency | Partial | Remove stale Google Fonts link. | Implemented and browser-tested |

### Testing

| ID | Requirement | Original status | Planned work | Outcome |
|---|---|---|---|---|
| R133 | Existing three suites keep passing | Working | Preserved. | Implemented and automated-tested |
| R134 | New automated tests | Missing | Add. | Implemented and automated-tested |
| R135 | Genuine screenshots | Missing | Playwright. | Delivered (a deliverable, not a feature) |

### Deliverable

| ID | Requirement | Original status | Planned work | Outcome |
|---|---|---|---|---|
| R136 | Clean ZIP | Missing | Build. | Delivered (a deliverable, not a feature) |
| R137 | Reports and docs | Partial | Write. | Delivered (a deliverable, not a feature) |

## Deliberately not planned

Sign-language translation, deafblind-specific support, a physical Braille display driver and message persistence were not planned for implementation. The first two need co-design with the people who would use them; the third needs hardware; persistence was kept in memory by design so private conversations are not written to disk. Each is stated as *Not implemented* or *Partially implemented* in the register and in the app.

