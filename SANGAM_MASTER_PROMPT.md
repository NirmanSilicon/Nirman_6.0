# SANGAM — COMPLETE PRODUCT RECONSTRUCTION, ACCESSIBILITY ENGINEERING, BACKEND DEVELOPMENT AND FUNCTIONAL IMPLEMENTATION

## MASTER DIRECTIVE FOR GOOGLE ANTIGRAVITY

### YOUR ROLE

You are acting as a complete senior software engineering and product development team.

You must perform the responsibilities of:

1. Senior full-stack developer.
2. Backend engineer.
3. Frontend architect.
4. UI/UX designer.
5. Computer vision engineer.
6. Machine learning engineer.
7. Accessibility specialist.
8. Database architect.
9. Security engineer.
10. QA and automation engineer.
11. Product manager.
12. Software integration engineer.

You are responsible for transforming the existing SANGAM project into a coherent, functional, accessible and professionally designed application.

This is not a simple frontend redesign.

This is not merely a camera bug fix.

This is not a request to generate a prototype that looks impressive but has non-functional buttons.

You must inspect the existing project, identify its actual implementation, repair its architecture, complete missing functionality, improve its user experience, and verify the results.

**Your primary responsibility is to make the application work.**

---

# PART 1 — UNDERSTAND THE EXISTING PROJECT BEFORE CHANGING ANYTHING

## 1.1 Project information

You have been provided with the existing SANGAM ZIP, approximately 216 MB.

The archive contains a substantial codebase with frontend files, an Express backend, vendor assets, models, documentation, configuration and tests.

Do not assume that every file is relevant.

Do not waste time manually inspecting thousands of dependency files.

Instead, establish the complete project inventory and distinguish:

- Project-owned source code.
- Dependencies.
- Generated files.
- Model assets.
- Static resources.
- Configuration.
- Documentation.
- Tests.
- Unused or obsolete files.

Inspect all project-owned files systematically.

Do not ignore files merely because their names appear unimportant.

## 1.2 Preserve the existing foundation

The existing application has previously demonstrated:

- A functioning Express backend.
- A successful health endpoint.
- A substantial automated test suite.
- Communication features.
- Accessibility-related modules.
- Camera and hand-tracking infrastructure.

Previous testing also identified browser-test failures associated with missing Playwright dependencies.

Re-run the tests yourself.

Do not assume previous results still apply.

## 1.3 Existing functionality to investigate

Inspect and preserve every existing feature that is genuinely implemented, including:

- Accessibility Profiles.
- Voice-to-text.
- Text-to-speech.
- Phraseboard.
- Yes/No/Help/Emergency communication shortcuts.
- Haptic feedback.
- Environmental sound detection using YAMNet.
- Sound alerts and loudness thresholds.
- WebRTC voice communication.
- Chat.
- QR-based communication sessions.
- Turn management.
- Volunteer assistance.
- SANGAM Learn.
- Sign-language camera interface.
- MediaPipe hand tracking.
- Personal sign teaching.
- Editable and sendable communication transcripts.
- Translation and Braille adapters.

Do not assume that a feature works because a button exists.

Test it.

## 1.4 Create a feature inventory

Create a spreadsheet or structured report with these columns:

| Feature | Existing implementation | Backend | Frontend | Actual test result | Required action |
|---|---|---|---|---|---|

Assign every feature one status:

- WORKING.
- PARTIALLY WORKING.
- BROKEN.
- MISSING.
- NOT APPLICABLE.

Identify duplicated functionality and disconnected modules.

Find dead buttons, fake interactions, hardcoded sample data, incomplete API calls, placeholder screens and missing database operations.

Do not mark anything as working without verification.

---

# PART 2 — DEFINE THE PRODUCT ARCHITECTURE

SANGAM must become one integrated accessibility ecosystem.

It must support three principal user categories.

## 2.1 PRIMARY USERS — PEOPLE SEEKING COMMUNICATION AND ACCESSIBILITY SUPPORT

This is the most important user category.

The application must be designed around their actual needs, not around what developers think an accessibility application should look like.

Potential users include:

- Deaf users.
- Hard-of-hearing users.
- Non-speaking users.
- People with speech difficulties.
- People who benefit from visual communication.
- People requiring accessible communication support.

Do not assume that every primary user has the same disability, preferences or requirements.

Allow users to configure their own accessibility profiles.

### Primary user dashboard

Design a simple, welcoming and highly accessible dashboard.

Recommended navigation:

1. Home.
2. Communicate.
3. Sign Language.
4. Voice and Sound.
5. Phraseboard.
6. Accessibility Settings.
7. My Support Network.
8. Profile.

### Communication workspace

This should be one of the most important parts of SANGAM.

Provide:

- Live speech-to-text.
- Text-to-speech.
- Editable communication text.
- Quick communication phrases.
- Phraseboard.
- Emergency phrases.
- Sign-language recognition where validated.
- Communication history where consented.
- Share or send communication.
- Accessible visual feedback.

A user must be able to communicate even if the sign-recognition model is unavailable.

Do not make the entire application dependent on one machine-learning model.

### Accessibility profiles

Allow users to configure:

- Preferred communication method.
- Text size.
- Font preferences.
- High contrast.
- Dark mode.
- Light mode.
- Captions.
- Sound alerts.
- Haptic feedback.
- Preferred voice.
- Speech speed.
- Reduced animation.
- Language preferences.
- Visual notifications.

Persist preferences using the backend.

Support multiple profiles where appropriate, without sharing personal information between accounts without permission.

---

## 2.2 SECONDARY USERS — FAMILY, FRIENDS, TEACHERS, INTERPRETERS AND CAREGIVERS

These users support primary users.

They should have a separate dashboard, but it should remain connected to the same communication system.

### Secondary user dashboard

Include:

1. Home.
2. My Connections.
3. Communication Sessions.
4. Interpreter Workspace.
5. Learning Resources.
6. Assistance Requests.
7. Notifications.
8. Profile.

### Interpreter workspace

Build a dedicated interface for interpreters.

Possible capabilities:

- Join an authorised communication session.
- View the shared communication transcript.
- Send text.
- Receive text.
- Use supported speech and text tools.
- Participate in voice/video sessions where implemented.
- Assist with communication.
- View relevant accessibility preferences shared by the primary user.

Do not claim that the application automatically replaces a qualified human interpreter.

If an AI sign-language model is available, identify it as machine-generated assistance and show its limitations.

### Family and caregiver experience

Provide:

- Invitation-based connections.
- Permission-controlled communication sessions.
- Shared accessibility preferences where authorised.
- Assistance requests.
- Emergency contact options.
- Communication support.
- Learning resources.

Never expose a primary user's private messages, recordings, location or personal data merely because another account is connected to them.

The primary user must control what is shared.

---

## 2.3 COMMUNITY USERS — GENERAL PUBLIC

This experience is intended to increase accessibility awareness and participation.

It must not be a meaningless collection of static cards.

Build a useful community-facing workspace.

### Community dashboard

Include:

1. Learn Sign Language.
2. Accessibility Awareness.
3. Community Challenges.
4. Volunteer Opportunities.
5. Educational Resources.
6. Accessibility Events.
7. Community Contributions.
8. Profile.

### SANGAM Learn

Develop a structured learning experience.

Possible modules:

- Introduction to accessibility.
- Introduction to Indian Sign Language.
- Basic communication.
- Common everyday signs.
- Emergency communication.
- Accessibility etiquette.
- Communication with deaf and non-speaking people.

If the learning module includes signs, every sign must have verified source material.

Do not invent sign-language demonstrations.

Track learning progress using persistent user data.

### Community participation

Where implemented, users should be able to:

- Register for accessibility events.
- Participate in learning challenges.
- Request to volunteer.
- Access educational materials.
- View public awareness campaigns.

Volunteer accounts must be reviewed or verified before receiving access to sensitive support requests.

Do not expose vulnerable users' identities or contact details publicly.

---

# PART 3 — BUILD THE COMPLETE AUTHENTICATION AND ONBOARDING WORKFLOW

The application must start with a proper authentication experience.

Do not send users directly to a random dashboard.

## 3.1 Welcome screen

Create a polished landing page.

Include:

- SANGAM branding.
- A concise description.
- Sign in.
- Create account.
- Accessibility information.
- A clear explanation of the three user categories.

Use an inclusive, welcoming visual design.

## 3.2 Registration

Ask for only the information required.

Required fields:

- Full name.
- Email address or supported username.
- Password.
- Password confirmation.
- Acceptance of privacy policy and terms.

Optional fields:

- Profile image.
- Preferred language.
- Communication preferences.

Do not collect sensitive disability information unless it is genuinely required and the user explicitly chooses to provide it.

## 3.3 Login

Implement real authentication.

Requirements:

- Secure password hashing.
- Proper session management.
- Appropriate token handling if JWT is used.
- Logout.
- Session expiry.
- Input validation.
- Error handling.
- Rate limiting.
- Protected routes.
- Password reset workflow.
- Secure authentication middleware.

Never store plaintext passwords.

Do not implement fake authentication using localStorage alone.

Use the existing backend architecture where appropriate.

## 3.4 Role selection

After registration, display:

**How would you like to use SANGAM?**

Provide three clearly explained choices:

1. I need communication or accessibility support.
2. I support someone who needs accessibility assistance.
3. I want to learn, participate and contribute to accessibility.

Allow the user to select an appropriate role.

Where necessary, allow multiple permitted roles through explicit profile switching.

Do not force someone to disclose a disability to use the platform.

## 3.5 Onboarding

Create a short, accessible onboarding flow.

Ask:

- Preferred communication method.
- Preferred interface settings.
- Accessibility preferences.
- Relevant learning interests.
- Optional support-network setup.

Allow users to skip optional steps and complete them later.

At the end, direct the user to the correct dashboard.

## 3.6 Profile switching

Where an account has multiple authorised roles, provide a clear profile switcher.

Do not expose another person's account or private data through role switching.

---

# PART 4 — COMPLETE FRONTEND REDESIGN

The existing interface is scattered.

Reorganise it into a consistent design system.

Do not simply change colours and call it a redesign.

## 4.1 Design direction

The application should feel:

- Modern.
- Inclusive.
- Calm.
- Professional.
- Trustworthy.
- Human-centred.
- Accessible.
- Consistent.

Avoid excessive decoration.

Avoid generic AI-generated landing pages.

Avoid overcrowded dashboards.

Avoid unnecessary gradients, excessive shadows, random animations and inconsistent card styles.

Use a coherent typography system, spacing system, colour palette and component library.

## 4.2 Suggested design system

Use a clean, contemporary visual language.

Suggested direction:

- Deep navy or charcoal for primary text.
- Soft neutral backgrounds.
- Teal or blue as the main interaction colour.
- Warm secondary accent.
- Clear success and error states.
- Accessible contrast.
- Consistent rounded corners.
- Consistent card padding.

Choose exact colours after reviewing the existing brand assets.

Do not unnecessarily replace the SANGAM identity.

## 4.3 Typography

Use readable typography.

Ensure:

- Clear heading hierarchy.
- Readable body text.
- Comfortable line height.
- Consistent font weights.
- Support for larger text.
- No excessively small labels.

## 4.4 Responsive design

The interface must work on:

- Desktop.
- Laptop.
- Tablet.
- Mobile.

Test all major screen sizes.

Do not merely shrink the desktop interface on mobile.

Create appropriate mobile navigation.

## 4.5 Navigation

Use a consistent navigation system.

Each dashboard must have:

- Clear page titles.
- Consistent navigation.
- Active-page indication.
- User profile menu.
- Notifications where applicable.
- Accessible controls.
- Logical back navigation.

Do not make users search through unrelated pages to find communication tools.

## 4.6 Accessibility requirements

Follow WCAG 2.2 AA principles wherever applicable.

Implement:

- Keyboard navigation.
- Visible focus indicators.
- Semantic HTML.
- Accessible form labels.
- Screen-reader-friendly controls.
- Sufficient contrast.
- Reduced-motion support.
- Clear error messages.
- Large interactive targets.
- Alternative text.
- Captions where appropriate.
- No colour-only information.

Do not make accessibility an optional visual setting. The application itself must be accessible.

---

# PART 5 — FIX THE SIGN-LANGUAGE RECOGNITION SYSTEM

This is a critical engineering requirement.

The current camera feature is not reliably recognising signs.

You must determine whether the existing implementation is repairable.

Do not assume that adding MediaPipe automatically creates sign-language recognition.

## 5.1 First inspect the current implementation

Identify:

- Camera capture method.
- Browser camera permissions.
- Webcam constraints.
- Frame capture frequency.
- OpenCV implementation.
- MediaPipe configuration.
- Hand landmark extraction.
- Pose landmark extraction.
- Facial landmark availability.
- Landmark ordering.
- Feature dimensions.
- Existing model.
- Model weights.
- Training data.
- Class labels.
- Prediction code.
- Confidence handling.
- Frontend/backend communication.

Test the actual camera.

Do not merely inspect its code.

## 5.2 Repair camera functionality first

Check:

- Camera permission state.
- Secure browser context.
- HTTPS or localhost requirements.
- Camera device availability.
- Device selection.
- Video element readiness.
- Stream lifecycle.
- Track cleanup.
- Frame dimensions.
- Browser compatibility.
- Backend connectivity.
- Camera errors.

Provide meaningful error messages.

Examples:

- Camera permission required.
- No camera detected.
- Camera is being used by another application.
- Unable to initialise camera.
- Recognition model unavailable.

Do not show a black camera screen without explaining the problem.

Do not create fake camera previews.

## 5.3 Do not force unsupported ISL and ASL functionality

The current requirement is to make the communication feature work.

If genuine ISL or ASL recognition cannot be implemented reliably, remove unsupported language-selection options and misleading translation claims.

Do not keep non-functional ISL and ASL buttons merely because they were previously planned.

Initially prioritise one of the following approaches:

**Approach A: Verified ISL word recognition**

Use a legally accessible, properly labelled ISL video dataset, such as AI4Bharat INCLUDE.

Inspect its official implementation before developing a new pipeline.

Use appropriate video-sequence preprocessing and model training.

**Approach B: Personal sign training**

If a validated general-purpose ISL model cannot be obtained or trained, create a genuinely functional personal sign-training system.

Users should be able to:

1. Create a custom sign label.
2. Record multiple examples.
3. View recorded examples.
4. Delete incorrect examples.
5. Train or build a local personalised classifier.
6. Test a newly performed sign.
7. Correct an incorrect result.

Clearly identify this as personal gesture recognition, not standard ISL translation.

Do not claim that a personal gesture is a universally accepted ISL sign.

**Approach C: Reliable communication fallback**

Even when camera recognition is unavailable, users must still be able to communicate through:

- Phraseboard.
- Text-to-speech.
- Voice-to-text.
- Editable text.
- Quick phrases.
- Human interpreter sessions where available.

The application must remain useful.

## 5.4 Dataset acquisition

Investigate:

AI4Bharat INCLUDE:
https://github.com/AI4Bharat/INCLUDE

Dataset:
https://huggingface.co/datasets/ai4bharat/INCLUDE

FDMSE-ISL:
https://cs.rkmvu.ac.in/~isl/isl-dataset/

Respect licensing and institutional access restrictions.

Never fabricate dataset samples.

Never invent labels.

Never use random hand movements as training examples for real ISL vocabulary.

## 5.5 Model architecture

Evaluate an appropriate temporal recognition architecture.

Potential technologies:

- OpenCV.
- MediaPipe.
- TensorFlow.
- PyTorch.
- GRU.
- LSTM.
- Temporal Transformer.

The choice must be justified by actual implementation constraints.

Preserve frame sequences.

Extract appropriate hand, body and facial information where supported.

Keep training and inference preprocessing identical.

## 5.6 Model behaviour

Implement:

- Sequence buffering.
- Temporal prediction.
- Confidence calibration.
- Unknown-sign rejection.
- Prediction stability.
- Duplicate suppression.
- Cooldown.
- Manual correction.
- Model-loading error handling.

The model must not generate a random word when it cannot recognise a sign.

A rejected prediction is better than a fabricated prediction.

## 5.7 Local processing

Prefer local inference.

The normal recognition workflow must not depend on an external paid AI API.

Download datasets and model weights during installation, then allow local inference.

Document hardware and runtime requirements.

Test offline functionality.

---

# PART 6 — MAKE THE CAMERA AND COMMUNICATION PIPELINE ACTUALLY WORK

Do not consider the sign feature complete merely because the webcam starts.

The entire workflow must work.

Example:

```text
User opens communication
          |
          v
Selects sign recognition
          |
          v
Camera permission checked
          |
          v
Live camera starts
          |
          v
Hand and body tracking
          |
          v
Sequence collected
          |
          v
Recognition model processes sign
          |
          v
Confidence and stability check
          |
          +------------------+
          |                  |
          v                  v
 Recognised word        Unknown sign
          |                  |
          v                  v
 Add to transcript      Ask user to retry
          |
          v
 User edits transcript
          |
          v
 Text-to-speech / Send
```

All steps must be implemented and tested.

The transcript must not automatically send a message without the user's permission.

---

# PART 7 — BACKEND AND DATABASE IMPLEMENTATION

The existing Express backend must be investigated and improved rather than blindly replaced.

Build a consistent backend architecture.

## 7.1 Database

Inspect whether a database already exists.

Retain it if appropriate.

If persistence is missing, select a suitable database based on the existing application architecture.

Create appropriate data models for:

- Users.
- Authentication sessions.
- User profiles.
- Roles.
- Accessibility preferences.
- Connections.
- Communication sessions.
- Messages.
- Phraseboard entries.
- Learning progress.
- Sign-training samples.
- Recognition vocabulary.
- Notifications.
- Volunteer applications.
- Consent records.

Do not create unnecessary tables.

## 7.2 API design

Implement and document appropriate endpoints.

Suggested groups:

```text
/api/auth
/api/users
/api/profiles
/api/preferences
/api/connections
/api/communication
/api/messages
/api/phrases
/api/sign-recognition
/api/sign-training
/api/learning
/api/volunteers
/api/notifications
/api/sessions
/api/health
```

Adapt them to the actual existing routing architecture.

Implement:

- Validation.
- Authentication.
- Role-based authorisation.
- Consistent response formats.
- Error handling.
- Logging.
- Rate limiting.
- Request size limits.
- Appropriate access controls.

## 7.3 Data persistence

Do not rely on temporary frontend state for important information.

User accounts, preferences, connections, messages and learning progress should persist where appropriate.

Use migrations or a documented database initialisation strategy.

Create seed data only for development and clearly distinguish it from real user data.

## 7.4 Privacy and security

Implement:

- Secure password storage.
- Permission checks.
- Session security.
- Data ownership checks.
- Consent management.
- Appropriate retention policies.
- Secure file uploads.
- Protected communication sessions.

Camera and microphone access must be user-initiated.

Do not secretly record, upload or store video or audio.

Do not store sign-training samples without explicit consent.

---

# PART 8 — CONNECT ALL THREE USER EXPERIENCES

All dashboards must use shared backend services.

## 8.1 Primary-to-secondary communication

Allow a primary user to:

- Invite a supporter.
- Approve a connection.
- Start a communication session.
- Share selected communication content.
- Revoke access.

Allow a secondary user to:

- Accept an invitation.
- Join an authorised session.
- Communicate with the primary user.
- Provide assistance.

## 8.2 Interpreter workflow

Create an interpreter-specific workspace.

Provide:

- Session invitations.
- Session status.
- Shared transcript.
- Text communication.
- Appropriate voice/video capabilities.
- Session completion.

Do not expose unrelated personal information.

## 8.3 Community workflow

Allow public users to:

- Access SANGAM Learn.
- View verified educational content.
- Participate in accessibility challenges.
- Apply for volunteering.
- Access public resources.

Sensitive assistance requests must never be publicly visible.

## 8.4 Permissions

Implement role-based access control and explicit sharing permissions.

A role is not permission to view another user's private information.

The primary user should have control over their connections and shared data.

---

# PART 9 — COMPLETE THE EXISTING ACCESSIBILITY FEATURES

Audit and implement the existing features.

## 9.1 Voice-to-text

Verify microphone access, transcription accuracy, error handling and text output.

Do not simulate transcription.

## 9.2 Text-to-speech

Verify that generated speech corresponds to the actual user-entered text.

Support voice settings and accessible playback controls.

## 9.3 Phraseboard

Implement working:

- Yes.
- No.
- Help.
- Emergency.
- Common communication phrases.

Allow users to customise and save phrases.

## 9.4 Haptic feedback

Test actual supported device vibration.

If the device does not support it, provide an appropriate alternative.

## 9.5 Environmental sound detection

Inspect the existing YAMNet implementation.

Verify:

- Audio input.
- Model loading.
- Sound classification.
- Alert thresholds.
- False positives.
- Alert timing.
- User controls.

Do not generate fake environmental alerts.

## 9.6 WebRTC and communication sessions

Verify actual peer connections.

Check:

- Connection establishment.
- Permission handling.
- Audio/video streams.
- Session termination.
- Reconnection.
- Error states.

Do not label a static chat interface as a working video-call feature.

## 9.7 QR communication sessions

Verify QR generation and scanning.

Check whether the session identifier is secure and whether unauthorised people can access it.

## 9.8 Braille and translation adapters

Check whether the adapters produce real supported outputs.

If a feature is only a placeholder, document it and either implement it or clearly label it as unavailable.

Do not display false translations.

---

# PART 10 — TESTING AND QUALITY ASSURANCE

Testing is mandatory.

Do not stop after the code compiles.

## 10.1 Frontend tests

Test:

- Registration.
- Login.
- Role selection.
- Onboarding.
- Profile editing.
- Dashboard navigation.
- Communication.
- Camera permissions.
- Camera initialisation.
- Transcript editing.
- Phraseboard.
- Learning progress.
- Connection invitations.
- Interpreter sessions.
- Responsive navigation.

## 10.2 Backend tests

Test:

- Authentication.
- Authorisation.
- Database persistence.
- Invalid requests.
- Missing fields.
- Expired sessions.
- Permission failures.
- Duplicate records.
- Error handling.

## 10.3 Camera tests

Test:

- Camera available.
- Camera unavailable.
- Permission denied.
- Camera already in use.
- Device switching.
- Video stream failure.
- Recognition model failure.
- Low lighting.
- Different hand positions.

## 10.4 Recognition tests

For any implemented recognition model, test:

- Every supported vocabulary item.
- Multiple repetitions.
- Different signers.
- Different signing speeds.
- Unknown movements.
- Unsupported signs.
- Missing hands.
- Background movement.
- Confidence rejection.

Do not fabricate accuracy numbers.

Report real measurements.

## 10.5 Browser automation

Repair the existing browser/E2E test configuration.

Install and configure Playwright if appropriate.

Test the actual browser workflows.

Do not simply disable failing tests to obtain a green result.

## 10.6 Regression testing

Verify that improving the frontend or camera does not break previously functioning modules.

Run all relevant existing tests after changes.

---

# PART 11 — PRODUCT DESIGN AND CONTENT QUALITY

Every page must feel like part of the same application.

Use:

- Consistent headers.
- Consistent side navigation.
- Consistent cards.
- Consistent buttons.
- Consistent input fields.
- Consistent typography.
- Consistent spacing.
- Consistent error states.
- Consistent loading states.

Create reusable components.

Avoid duplicating the same UI logic across dashboards.

Use realistic, concise content.

Do not use generic placeholder text such as:

"Welcome to your dashboard."

Make content meaningful to the actual user.

Add empty states, loading states, success messages and error messages.

Avoid overwhelming primary users with too many options.

Prioritise the most frequently used communication tools.

---

# PART 12 — IMPLEMENTATION PRIORITY

Do not attempt to implement everything simultaneously.

Work in the following order.

### PRIORITY 0 — STABILITY

- Inspect the complete project.
- Create a feature inventory.
- Repair startup problems.
- Repair backend connectivity.
- Repair routing.
- Repair dependency issues.
- Repair existing tests.
- Protect working features.

### PRIORITY 1 — COMPLETE PRODUCT STRUCTURE

- Authentication.
- Registration.
- Login.
- User roles.
- Onboarding.
- Three dashboards.
- Profile management.
- Navigation.

### PRIORITY 2 — CORE COMMUNICATION

- Voice-to-text.
- Text-to-speech.
- Phraseboard.
- Editable transcripts.
- Communication sessions.
- Accessibility settings.

### PRIORITY 3 — CAMERA AND SIGN RECOGNITION

- Repair webcam.
- Repair frame processing.
- Repair MediaPipe.
- Investigate model availability.
- Implement verified ISL recognition or a clearly labelled personal sign-training alternative.
- Implement unknown-sign rejection.
- Connect to communication output.

### PRIORITY 4 — SUPPORT NETWORK

- Connections.
- Interpreter workflow.
- Family and caregiver dashboard.
- Volunteer workflows.
- Session permissions.

### PRIORITY 5 — COMMUNITY

- SANGAM Learn.
- Verified educational material.
- Learning progress.
- Volunteer opportunities.
- Community awareness.

### PRIORITY 6 — POLISH AND VERIFICATION

- UI consistency.
- Mobile responsiveness.
- Accessibility audit.
- Security review.
- Automated tests.
- End-to-end testing.
- Documentation.

Complete each phase to a testable state before declaring it finished.

---

# PART 13 — STRICT RULES FOR THE DEVELOPMENT AGENT

These rules override the temptation to generate quick, superficial solutions.

1. Do not rewrite the entire application before understanding it.
2. Do not delete existing working features.
3. Do not replace functional backend services without justification.
4. Do not generate fake user accounts in production.
5. Do not implement fake login.
6. Do not hardcode important user data.
7. Do not create buttons without functionality.
8. Do not simulate camera input.
9. Do not fabricate sign recognition.
10. Do not fabricate model accuracy.
11. Do not use random words as recognition output.
12. Do not mislabel personal gestures as ISL.
13. Do not claim sentence translation when only isolated words are recognised.
14. Do not expose private communication.
15. Do not collect unnecessary sensitive information.
16. Do not remove accessibility features to simplify development.
17. Do not hide errors.
18. Do not disable tests to make the project appear successful.
19. Do not leave incomplete pages disguised as completed pages.
20. Do not create unnecessary dependencies.
21. Do not duplicate backend logic.
22. Do not leave debug code in production.
23. Do not commit secrets, API keys or passwords.
24. Do not claim that a feature works without testing it.
25. Do not stop after producing an implementation plan.

When an implementation is blocked, identify the exact reason and provide the next required action.

---

# PART 14 — HOW TO WORK WITH THE EXISTING LARGE PROJECT

The ZIP is large. Work intelligently.

Do not repeatedly extract or copy the entire project unnecessarily.

Exclude dependency directories from unnecessary source-code analysis.

Use the existing dependency installation where possible.

Maintain a clear implementation log.

Before major changes:

- Identify affected files.
- Understand dependencies.
- Check existing tests.
- Plan the modification.

After major changes:

- Run relevant tests.
- Inspect logs.
- Check the browser.
- Verify the backend.
- Record the result.

Use incremental modifications.

Maintain a clear list of completed and remaining tasks.

Do not waste context repeatedly rediscovering the same files.

If your environment supports multiple agents, delegate independent tasks such as:

- Frontend audit.
- Backend audit.
- Recognition pipeline audit.
- Accessibility audit.
- Test audit.

However, maintain one central integration plan and resolve conflicting changes before merging.

Do not allow independent agents to overwrite each other's work.

---

# PART 15 — REQUIRED DELIVERABLES

At completion, provide the following.

### A. Functional application

A working SANGAM application with:

- Login.
- Registration.
- Role selection.
- Onboarding.
- Primary dashboard.
- Secondary dashboard.
- Community dashboard.
- Communication workspace.
- Working accessibility features.
- Camera functionality.
- Properly scoped sign recognition.
- Backend persistence.
- Responsive interface.

### B. Technical documentation

Create:

1. PROJECT_ARCHITECTURE.md
2. FEATURE_AUDIT.md
3. DATABASE_SCHEMA.md
4. API_DOCUMENTATION.md
5. SIGN_RECOGNITION.md
6. CAMERA_TROUBLESHOOTING.md
7. SECURITY_AND_PRIVACY.md
8. TEST_REPORT.md
9. INSTALLATION_GUIDE.md
10. USER_GUIDE.md

### C. Testing evidence

Provide:

- Test execution results.
- Browser screenshots.
- Backend logs.
- API test results.
- Camera test results.
- Recognition test results.
- Known limitations.

### D. Final status report

Every feature must be classified as:

**COMPLETED AND VERIFIED**

Implemented and tested successfully.

**IMPLEMENTED BUT NOT FULLY VERIFIED**

The code exists but real-world verification is incomplete.

**PARTIALLY IMPLEMENTED**

Some functionality works, but the complete workflow is missing.

**NOT IMPLEMENTED**

The feature remains unavailable.

**BLOCKED**

An external dependency, dataset permission, hardware requirement or other issue prevents completion.

Never classify a feature as completed simply because a corresponding page exists.

---

# PART 16 — FINAL ACCEPTANCE TEST

Before declaring the project complete, simulate the following real user journeys.

## JOURNEY A — PRIMARY USER

1. Open SANGAM.
2. Register an account.
3. Log in.
4. Select the primary-user profile.
5. Complete onboarding.
6. Enter the dashboard.
7. Open communication.
8. Use the phraseboard.
9. Use text-to-speech.
10. Open sign recognition.
11. Start the webcam.
12. Perform a supported sign.
13. Verify the recognition result or receive an honest unsupported-sign message.
14. Edit the transcript.
15. Send the communication to an authorised connection.

The journey must work without broken buttons or missing pages.

## JOURNEY B — FAMILY MEMBER OR SUPPORTER

1. Register.
2. Select the secondary-user profile.
3. Complete onboarding.
4. Invite or connect with a primary user.
5. Obtain the required consent.
6. Join an authorised communication session.
7. Exchange messages.
8. View only the information that has been shared.
9. End the session.

## JOURNEY C — INTERPRETER

1. Log in.
2. Select the interpreter workspace.
3. View authorised session invitations.
4. Join a session.
5. Access the shared transcript.
6. Communicate with the participants.
7. End the session.

## JOURNEY D — GENERAL PUBLIC

1. Register.
2. Select the community profile.
3. Open SANGAM Learn.
4. Access verified learning resources.
5. Complete a learning activity.
6. Save learning progress.
7. Explore accessibility awareness resources.
8. Apply for volunteering if eligible.

## JOURNEY E — CAMERA FAILURE

1. Open the sign-recognition feature.
2. Deny camera permission.
3. Verify that a clear error appears.
4. Restore permission.
5. Restart the camera.
6. Verify that the application recovers.
7. Disable the recognition model.
8. Verify that alternative communication features still work.

If any journey fails, fix the underlying problem before claiming completion.

---

# FINAL DIRECTIVE

You have permission to make substantial improvements to the existing SANGAM codebase.

You may refactor individual modules, redesign the frontend, repair the backend, improve the database architecture, replace broken recognition components and implement missing functionality.

However, you must preserve working functionality and maintain a coherent architecture.

Do not blindly rebuild everything from scratch.

Do not merely create a beautiful frontend.

Do not merely make the webcam display a video.

Do not merely produce a model that outputs words.

Build the complete working workflow.

If a reliable general-purpose ISL recognition model is not achievable with the available data and environment, implement a functional, locally trained personal-sign recognition system and clearly distinguish it from standard ISL recognition.

If even that is blocked, retain a working communication fallback and explain the exact limitation.

**THE DEFINITION OF SUCCESS IS A USER BEING ABLE TO OPEN SANGAM, REGISTER, CHOOSE THE CORRECT EXPERIENCE, ACCESS WORKING COMMUNICATION TOOLS, CONNECT WITH THE RIGHT PEOPLE AND COMPLETE THEIR TASK WITHOUT ENCOUNTERING FAKE OR BROKEN FUNCTIONALITY.**

Do not finish when the code looks complete.

Finish when the actual user workflows work.

Begin by auditing the complete existing project, then implement the priorities in order. Continue until every feasible requirement has been implemented and tested.