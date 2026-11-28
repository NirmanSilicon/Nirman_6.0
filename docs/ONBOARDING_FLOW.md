# Onboarding flow

Each role has its own steps. Every step is validated on the server and saved immediately (`PUT /api/me/onboarding/:step`); the answers survive closing the tab or signing in on another device. `POST /api/me/onboarding/complete` marks it finished once the required steps are done.

| Role | Steps | What is asked |
|---|---|---|
| Primary | 1 profile, 2 send, 3 receive, 4 accessibility, 5 review | Name to show, language, picture (optional) · how to send: type, speak, voice-to-text, sign recognition, phraseboard, compatible assistive input, other · how to receive: read text, listen, live captions, visual alerts, haptic, Braille, other · display, navigation, audio, haptics · review |
| Supporter | profile, relationship, communication, connection, review | Family/friend/teacher/caregiver/supporter/other · text, voice, captions, sign assist · optionally enter an invitation code now |
| Community | profile, interests, level, review | Sign-language learning, awareness, inclusive communication, educational, community, volunteer · beginner, intermediate, advanced |
| Interpreter | profile, languages, professional, availability, verification, review | Languages and sign proficiency · qualifications, certification body, years · available / unavailable / scheduled, session types · submit for review |

## Behaviour

- Progress text: "Step 2 of 5, 25% complete", step chips marked Done, a `<progress>` value.
- **Continue** saves and moves on. **Save and continue later** saves, shows "Saved. You can pick this up again whenever you sign in." and returns to the home page. The next sign-in, or the next visit to an account page, resumes at the first unfinished step.
- Optional steps can be skipped; required steps cannot be skipped and do not offer a skip.
- Review shows each answer with an Edit link back to that step.
- If a primary user completes setup without choosing any way to send or receive, the server applies defaults (type messages, live captions) and records `usedDefaults: true`; saving the accessibility step later sets it back to false.
- The interpreter's "verification" step only submits details; it never marks anyone verified.
- Leaving mid-way and signing in again lands on the next unfinished step (checked in a real browser).