# Role architecture

| | Primary user | Supporter (secondary) | Community member | Interpreter |
|---|---|---|---|---|
| Purpose | Communicate in the ways they choose | Support someone they know | Learn and take part | Provide interpretation |
| Onboarding steps | profile, send, receive, accessibility, review | profile, relationship, communication, connection, review | profile, interests, level, review | profile, languages, professional, availability, verification, review |
| Has an invitation code | Yes (after onboarding) | No | No | No |
| Can request an interpreter | Yes | Yes | No | No |
| Can see another person's data | Only what a connection they approved allows (as a supporter) | Only what the primary user's approval allows | Nothing about individuals | Only the request they accepted |
| Dashboard sections | Overview, Communicate, Sign Language, Voice and Captions, Phraseboard, Accessibility, Connections, Interpreter, Notifications, Profile, Help | Overview, Communicate, Connections, Sessions, Interpreter, Assistance, Notifications, Profile and privacy, Help | Overview, Learn, Progress, Resources, Community, Notifications, Profile, Help | Overview, Requests, Active sessions, Availability, Language skills, Verification, History, Notifications, Account, Help |
| Extra for administrators | +Admin review tab (any role) | | | |

## Rules enforced on the server (not just hidden in the UI)

- A route that needs a role refuses other roles with 403 (`needRole`).
- Connection requests only from supporters; approving, declining and changing permissions only by the primary user in that connection.
- Interpreter verification can only be changed by an account whose verified email is in `ADMIN_EMAILS`. A role change can never grant it, and editing a verified interpreter's professional details returns them to "Pending review".
- Interpreter requests are shown only to verified, available interpreters whose languages match.
- Administrators are ordinary accounts with one extra capability; they cannot read other people's messages or preferences through it.

## Permissions on a connection (all off until approved)

`messages` (start conversations), `preferences` (see how the primary user likes to send and receive), `transcripts` (see session history: who and when). Each is independent and can be changed later.

## Changing role

Account settings -> Account type. Needs the password again, keeps everything entered before, never grants verification.