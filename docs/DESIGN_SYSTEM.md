# Design system

Source of truth: `assets/account.css` (tokens scoped under `.ax`, so the older stylesheet is untouched).

## Principles

1. Calm and clear before clever: one primary action per card, short sentences.
2. Cream dashboards, ink-purple landing: warm paper surfaces for working screens; the landing and sign-in use a dark ink backdrop with layered radial depth.
3. Colour carries meaning with a word and an icon, never alone.
4. Content is real: no invented statistics, people or activity.
5. Every state is designed: loading, empty, error, success.
6. Preferences are respected: text size, theme, high contrast, reduced motion.

## Tokens

Colour, type and contrast: COLOUR_TYPOGRAPHY_GUIDE.md. Radius `--ax-r:18px`, `--ax-r-sm:12px`. Shadows `--ax-shadow`, `--ax-shadow-lift`. Focus ring 2.4 px solid `--ax-focus`. Base size 17 px; line height 1.55. Touch targets at least 44 px.

## Themes

`light` (default), `dark` (`html[data-ax-theme="dark"]`), `high contrast` (`html.hc`: black on white, 2 px borders, no tints). `prefers-reduced-motion` and the in-app switch (`html.ax-reduce`) turn animation off. Screen-reader mode (`html.ax-sr`) removes decoration.

## Layout

Horizontal header (floating pill), tab strip, content in a 1180 px max column with responsive grids (`.ax-grid`). No left sidebar. Mobile: single column, header collapses to Menu (see RESPONSIVE_DESIGN.md).

## Interaction

Dialogs are native `<dialog>` modals with focus return. Toasts are polite live regions. Forms save per step. Destructive actions ask for confirmation and say what will be lost.

## Known debt

The older guest workspaces (Sign Language Camera, Speak and Caption, ...) keep their original dark styling. Rules in `account.css` that override the old global stylesheet use `!important` and are commented where they appear (inputs, closed dialogs, dialog size, `dt/dd`).