# Responsive design

| Width | Behaviour |
|---|---|
| 1100 px and up | Two-column grids, full horizontal header with role destinations, bell and account menu |
| 760-1100 px | Grids drop to fewer columns; tab strip scrolls horizontally with a visible scrollbar (never hidden) |
| Under 760 px | One column. Header shows the brand and a **Menu** button on one row; the menu opens underneath with destinations, bell and account menu. List rows wrap actions below text. Forms are full width |
| 320 px | Reflow without horizontal scrolling (checked for the older pages in earlier passes) |

Also: text up to 160% and browser zoom to 200% reflow without loss; touch targets at least 44 px; dialogs are at most 92% of the viewport width and 90% of its height and scroll inside.

## What was checked in this pass

- 1440x900: all four dashboards, onboarding, dialogs, admin review, in a real Chromium browser.
- 375x812 (phone emulation): interpreter dashboard, onboarding step 2, header menu; no horizontal overflow (measured: page width equals viewport width).

## What was not checked

Tablet (768-1024) as a separate pass, landscape phones, very small screens (320 px) for the new account area, real devices, and print.