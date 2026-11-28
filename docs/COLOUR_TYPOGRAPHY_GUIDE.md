# Colour and typography

## Light tokens (default)

| Token | Value | Role |
|---|---|---|
| `--ax-ink` / `-2` / `-3` | `#16122B` / `#221B45` / `#2E2558` | Landing, hero cards, header |
| `--ax-paper` | `#F6F1E6` | Dashboard background (cream) |
| `--ax-surface` / `-2` | `#FFFFFF` / `#FBF8F1` | Cards, list rows |
| `--ax-line` / `-2` | `#DED5C3` / `#CFC5B0` | Borders |
| `--ax-text` / `--ax-muted` | `#241F3B` / `#5B5478` | Text |
| cyan `--ax-cyan` `#2EC4D6`, text `-d` `#0B5F6B`, soft `#E3F8FA` | Information, "receive" |
| amber `#FF9F1C`, `-d` `#8A5000`, soft `#FFF2DE` | Attention, "send", waiting |
| coral `#FF5D73`, `-d` `#A3203A`, soft `#FFE8EC` | Errors, destructive |
| violet `#6A5E9C`, `-d` `#4A3F7A`, soft `#EEEAF8` | Identity, avatars, learning |
| ok `#17703F`, soft `#E4F5EC` | Verified, success |
| focus `#1A6CFF` | Focus ring |

Dark and high-contrast variants redefine the same names (see `account.css`).

## Measured contrast (WCAG ratio)

| Pair | Ratio | Pair | Ratio |
|---|---|---|---|
| text on paper | 13.97 | white on ink | 18.17 |
| text on white | 15.74 | white on violet (avatar) | 5.68 |
| muted on paper | 6.25 | focus ring on white (needs 3 for non-text) | 4.53 |
| muted on surface-2 | 6.63 | focus ring on paper | 4.02 |
| cyan-d on cyan-soft | 6.66 | dark: text on page | 16.48 |
| amber-d on amber-soft | 5.89 | dark: muted on surface | 8.99 |
| coral-d on coral-soft | 6.37 | dark: ok on soft | 7.82 |
| violet-d on violet-soft | 7.78 | high contrast: text on white | 21.00 |
| ok on ok-soft | 5.42 | high contrast: ok on white | 8.32 |

Two shortfalls found by the in-page audit were fixed (avatar initials, ok-green text). The ink hero cards use gradients, which the audit skips; their text is white/near-white on near-black purple.

## Typography

- Body: **Atkinson Hyperlegible** (400, 700), vendored in `assets/fonts/`, 17 px base, line height 1.55. Designed for low vision; letters are distinct.
- Headings: **Georgia** serif for the editorial feel on dashboards. (Archivo is also bundled and used by some older guest screens.)
- Eyebrows: small caps style, letter-spaced, with a short rule.
- Sizes scale with the person's text-size choice (100%, 130%, 160%) and browser zoom.
- No text is embedded in images.