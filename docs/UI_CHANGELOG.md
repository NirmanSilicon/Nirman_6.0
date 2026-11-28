# UI changelog

## This release: account experience and redesign

Added
- Public header (Home, About, How it works, Impact) and account header (role navigation, notification bell with unread count, account menu); Menu button on phones.
- Landing page hero: "Get started" and "try the tools as a guest" calls to action; footer links (Help, Privacy, Terms, Support).
- Authentication screens: sign in, register (password rules shown up front, error summary), verify, forgot, reset.
- Role selection (four cards), per-role onboarding wizard with progress and resume.
- Four role dashboards with real data and honest empty/loading/error states; administrator review tab.
- Connections with approval dialog and three independent permissions; interpreter request, inbox, availability, verification status screens.
- Notifications, history, settings (personal, account type, notifications, privacy, security, delete), help, privacy and terms pages.
- Optional voice-command button (Alt+V).
- "Teach a held pose" panel in the Sign Language Camera and "My held poses" recogniser.
- Themes: light (default), dark, high contrast; reduced motion.

Changed
- The legacy header dropdown (`.drop`, `#dashBtn`, `#dashMenu`) is hidden; navigation is horizontal. Original Playwright tests that click it need updating.
- Static files are served from `/assets` and `/vendor` only.
- Two palette values darkened for contrast (`--ax-violet`, `--ax-ok`).

Fixed during verification
- Relay boxes unreadable in the dark hero card; approval dialog filling the screen; invisible definition-list labels; list-row avatar contrast; speech-speed slider's label pointing at another panel's control; account menu button name; mobile header wrapping to two rows; router loop on a missing script.

Not changed
- The older guest workspaces keep their dark styling.