# Feature audit

Status words used here and in the other documents:

- **COMPLETED**: built and checked by an automated test or by real use in a browser, with the limits stated.
- **IMPLEMENTED_NOT_FULLY_VERIFIED**: built and exercised, but not on the real hardware or with the real people it is meant for.
- **PARTIAL**: some of it works; the gap is named.
- **NOT_IMPLEMENTED** / **BLOCKED**: not built, with the reason.

| Area | Status | Evidence and limits |
|---|---|---|
| Registration, sign in/out, sessions, password reset | COMPLETED | `server/test-accounts.js` (129 checks, real server, real cookies, restart persistence). No email is sent: links are shown on screen in development mode and labelled "NOT emailed" |
| Four account types and role-specific onboarding | COMPLETED | API tests plus walked through in a real browser (primary, supporter, community, interpreter, admin). Interrupted onboarding resumes at the next step |
| Connections with primary-user approval and three separate permissions | COMPLETED | API tests plus browser walk-through (request, notification, approve with minimal permissions) |
| Interpreter verification (admin only) and request routing | COMPLETED | API tests; browser walk-through of submit -> admin verify -> status shown. SANGAM cannot check certificates: an administrator decides |
| Notifications for real events only | COMPLETED | API tests; bell shows unread count |
| Static file lockdown (`/assets`, `/vendor` only) | COMPLETED | Before this work the whole project folder, including `.env` and `data/`, was publicly downloadable. Tested in `test-accounts.js` |
| Keyboard operation, focus management, skip link, live regions | IMPLEMENTED_NOT_FULLY_VERIFIED | In-page audit of 47 views (names, headings, ids, contrast): 0 structural problems. A real keyboard walk-through of the sign-in page. No screen reader was used |
| Screen-reader support | IMPLEMENTED_NOT_FULLY_VERIFIED | Semantics and announcements are in place; no NVDA, JAWS, VoiceOver or TalkBack testing was done. See SCREEN_READER_GUIDE.md |
| Optional voice navigation | IMPLEMENTED_NOT_FULLY_VERIFIED | Built and loads; the speech service and a microphone were not available in the test browser |
| Low-vision options (large text, dark, high contrast, reduced motion) | COMPLETED for what was checked | Contrast computed on all account views; high-contrast and dark tokens exist. Not checked with magnifier software |
| ASL letters and numbers (rule based) | COMPLETED as a mechanism | Synthetic hands only (`test-sign-letters.js`, 39 checks). Not measured on real signers. These are ASL, not ISL |
| ISL static alphabet recogniser | NOT_IMPLEMENTED | No verified ISL alphabet dataset or model was available. Nothing is presented as ISL fingerspelling |
| ISL word recognition (pretrained SL-GCN) | PARTIAL | Real-video check on 85 INCLUDE videos of 6 words: about 82% top-1 on that subset. Vocabulary of 263 words; no "not a sign" class. See ISL_RECOGNITION_AUDIT.md |
| Personal held poses (user-taught static gestures) | COMPLETED as a mechanism | `test-sign-static.js` (45 checks, synthetic hands) and a browser run with synthetic frames. Not tested with a real camera or real hands |
| Personal moving signs (user-taught, DTW) | IMPLEMENTED_NOT_FULLY_VERIFIED | Existing feature; synthetic tests only |
| Model training in this project | NOT_IMPLEMENTED | No model was trained. See MODEL_TRAINING_GUIDE.md |
| Real webcam testing | BLOCKED | The test browser denies camera access and no hands were available |
| Playwright browser suites | BLOCKED here | Need Playwright and Chromium, which were not installed. They exist and were not run |
| Email delivery | NOT_IMPLEMENTED | No mail service. Production use needs one; see SECURITY_AND_PRIVACY.md |