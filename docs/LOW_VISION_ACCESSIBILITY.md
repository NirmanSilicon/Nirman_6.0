# Low-vision accessibility

| Need | What exists | Notes |
|---|---|---|
| Larger text | Standard / Large (130%) / Extra large (160%) in *Accessibility*; page reflows to a single column; browser zoom to 200% supported | Earlier passes checked reflow at 320 px and 200% zoom + 160% text |
| Dark theme | Dark tokens (`html[data-ax-theme="dark"]`) | |
| High contrast | `html.hc`: black on white, 2 px borders, no tinted fills, darker status colours | |
| Reduced motion | Preference and `prefers-reduced-motion`; animation off | |
| Colour is never the only signal | Status badges carry an icon and a word ("Verified", "Waiting for approval") | |
| Readable type | Atkinson Hyperlegible body text (vendored locally, 400 and 700) at a 17 px base, Georgia serif display headings, generous line height | See COLOUR_TYPOGRAPHY_GUIDE.md |

## Contrast measurement

`test-support/ui-audit.js` computes WCAG contrast for every visible text run whose background is a flat colour. On the 47 account views the audit found 2 real shortfalls (list-row avatar initials at 1.56:1, green status text at 4.44:1) and both were fixed. Text on gradients (the dark hero cards) is excluded from the automatic check; those use white or near-white text on near-black purple and were checked by eye.

## Not done

- No testing with screen magnifiers (ZoomText, macOS Zoom) or with Windows forced-colours mode.
- The older guest workspaces still use their original dark theme; they respond to text size and high contrast but were not restyled.