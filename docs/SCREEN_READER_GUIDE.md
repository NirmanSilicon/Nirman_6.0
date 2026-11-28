# Screen reader guide

## For users

- **First stop on every page** is a "Skip to main content" link. Press Enter to jump past the header.
- **Headings** outline each page. Use your reader's heading list or heading key (H) to move between sections. There is exactly one level-1 heading per page and it names the page.
- **When you move to a new page** focus lands on its heading and the page title changes, so you hear where you are.
- **Forms**: each field has a label; required fields say "required"; hints are read with the field; after a failed submit, focus goes to an error summary that lists each problem and links to the field.
- **Progress** in onboarding is text ("Step 2 of 5, 25% complete") and a progress element.
- **Messages and status** are announced through live regions. In *Profile -> Accessibility* choose how much is announced: everything, important only, or alerts only. "Screen-reader-friendly mode" removes decorative motion and speaks fuller status messages.
- **Dialogs** (approving a connection, asking an interpreter) take focus when they open, keep it inside, and return it when closed. Escape closes.
- **Icons** are hidden from the reader; every icon-only control has a text name.

## For testers: test plan (not yet carried out)

Run each task with NVDA+Firefox/Chrome, JAWS+Chrome, VoiceOver+Safari, TalkBack+Chrome. Record pass/fail and what was heard.

1. Reach the sign-in form from the landing page without a mouse.
2. Register with a deliberately weak password; confirm the error summary is announced and each problem is understandable.
3. Choose the primary role; complete onboarding; confirm step and progress are announced.
4. Open Connections as a primary user; approve a request in the dialog; confirm focus returns.
5. Open Notifications; mark one as read; confirm the change is announced.
6. Change text size and theme in Accessibility; confirm the change is announced and persists after reload.

## Known gaps

- Not tested with any screen reader (see FEATURE_AUDIT.md).
- The legacy guest workspaces (Sign Language Camera, Speak and Caption, etc.) were tested with axe-core in earlier passes, but the Playwright suite could not be run in this environment.