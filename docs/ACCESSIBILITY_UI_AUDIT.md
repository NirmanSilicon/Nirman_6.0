# Accessibility UI audit (account area)

Test class: **automated in-page audit in a real browser** (`test-support/ui-audit.js`) plus manual keyboard and visual checks. **No screen reader, magnifier, switch device or user testing was done.**

## Automated audit: 47 views

Public: sign in, register, forgot password, privacy, terms, help. Primary (8 views), Supporter (8), Community (8), Interpreter (10), Admin (1), each signed in as a seeded test account.

Checks: one visible `<h1>`, accessible names on all controls, no duplicate ids, non-empty title, contrast of text on flat backgrounds.

Result after fixes: **0 structural problems on 47 views; 0 contrast failures** on the views checked (text on gradients is skipped).

## Defects the audit and the walk-through found, all fixed

| Defect | Fix |
|---|---|
| Speech-speed slider and voice select reused ids of an older panel, so the label pointed at the wrong control and the slider had no name | Renamed to `axRate`, `axRateOut`, `axVoice` |
| Account menu button had no accessible name in some readers | `aria-label="Account menu, <name>"` |
| List-row avatar initials 1.56:1 | Colour set explicitly (white on violet, 5.68:1) |
| Green status text 4.44:1 | Darkened `--ax-ok` to `#17703F` (5.42:1) |
| Definition-list labels nearly invisible (older stylesheet) | Themed `dt`/`dd` inside `.ax` |
| Approval dialog filled the whole screen (older global `dialog` rule) | Sized `dialog.ax-sheet` explicitly |
| Relay boxes unreadable in the dark hero | Translucent dark nodes with white text |

## Manual checks

- Keyboard on the sign-in page: Tab order, 2.4 px visible focus (blue on light, amber on dark).
- Focus lands on the new heading after a route change; the title changes.
- Dialog opens with focus inside, closes with its buttons.
- Header collapses to Menu on a phone and the menu opens.

## Still to do (cannot be done by the author alone)

NVDA, JAWS, VoiceOver and TalkBack passes; magnifier and forced-colours checks; testing with disabled users. Until then nothing here should be described as "tested with assistive technology".