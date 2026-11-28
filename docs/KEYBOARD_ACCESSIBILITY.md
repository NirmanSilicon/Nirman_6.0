# Keyboard accessibility

## Rules the interface follows

- Everything that can be done with a pointer can be done with the keyboard: links and buttons are real elements; the role tab strip, avatar menu and dialogs work with Tab, Shift+Tab, Enter, Space and Escape.
- First Tab stop on a page is the skip link (or, after a route change, focus is on the new heading and the next Tab goes to the first control).
- The focus indicator is a 2.4 px solid outline, never removed: blue on light surfaces, light amber on dark ones, black/white in high contrast. Measured on the sign-in page: `outline: solid 2.4px`.
- Tab order follows reading order; no positive `tabindex` values (checked on all 47 audited views).
- Touch targets are at least 44 px.
- Shortcuts: **Alt+V** voice commands (when enabled). No single-key shortcuts that could clash with screen readers.
- Dialogs trap focus natively and return it to the opener.
- Switch scanning and Braille routing exist for the communication workspaces (earlier passes).

## What was checked

- A real keyboard walk on the sign-in page: first Tab reaches the email field, further Tab presses reach the password, show-password button, remember checkbox, submit, links and the footer; each shows the outline.
- In-page audit: no positive tabindex, every control has an accessible name, no duplicate ids that break label association (one real defect of this kind was found and fixed: the speech-speed slider shared an id with an older panel).

## What was not checked

- Full keyboard-only completion of every task on every page.
- Behaviour with screen-reader virtual cursors, which intercept keys.