# SANGAM PRISM — 1,000-word design and implementation brief

## Creative direction

Treat SANGAM as a premium, human-centred communication product rather than a generic accessibility dashboard. The visual identity should communicate connection, agency, warmth and adaptability. The design language is “Prism”: deep midnight surfaces, jewel-like gradients, layered light, expressive typography, and a distinct colour identity for each communication mode. The result must feel memorable and confident without becoming visually noisy or making accessibility harder.

## Brand identity and logo

Replace the simple loop mark with a custom interwoven emblem. The mark should suggest two paths meeting, exchanging and continuing independently: two continuous ribbons, a shared centre point and three small nodes. Use a luminous mint-to-violet-to-coral gradient with a restrained warm-gold centre. It must remain legible at favicon size and in monochrome. Pair it with a confident wordmark using Outfit ExtraBold; use Manrope for body copy. Do not use generic stock accessibility symbols as the primary logo. The emblem must be inline SVG, crisp at every scale, decorative to assistive technology when the wordmark is present, and have no dependency on an external icon font.

## Colour, depth and typography

Use midnight navy as the foundation (#080B18), with layered blue-black panels (#11182B and #182442). Use mint (#72F1D5), violet (#A99BFF), coral (#FF91B8) and warm gold (#FFD27A) as meaningful accents. Do not make every card the same grey. Assign accents intentionally: speech/microphone can use mint, camera/OCR gold, phrase board coral, and profile/Braille violet. Gradients should be soft and directional, not rainbow fills on every component. Create depth with translucent borders, inset highlights, ambient radial glows and shadows that separate surfaces without reducing text contrast. Headings use Outfit, weight 700–900, tight but readable tracking. Body text uses Manrope, 400–700, with comfortable line-height. Avoid ultra-light text, tiny labels and long all-caps paragraphs.

## Landing page and communication relay

Keep the core promise clear: “One conversation. Many ways to take part.” The hero should have one strong headline, one concise explanation and a clear primary action. The relay illustration is a product explanation, not decoration alone. Keep input and output choices readable, labelled in text, and visibly selected with both shape and colour. The central SANGAM node should look like a luminous prism or meeting point, not a plain circle with text. Add a subtle orbit/ring and a soft breathing glow. Lines or paths should animate gently to show a message moving through the relay; avoid fast flashing, excessive movement or animations that imply a real connection when the graphic is illustrative. Keep the “Illustrative flow” label visible.

## Dashboard information architecture

The dashboard is the working heart of the app. It must be immediately understandable: a concise welcome, a short instruction, an access-profile summary and clear feature choices. Use colourful feature cards with distinct accents and clear icon-plus-title-plus-description hierarchy. Cards should not be identical clones: use controlled variation in glow, gradient tint and icon tile while keeping consistent spacing, typography and interaction states. Give each card a single obvious action. The overview should show the tools first, then the example relay. The example must remain labelled as an example, not a live connection. Tabs and the Dashboard dropdown should be visually distinct, keyboard accessible and consistent with the horizontal top navigation. Do not introduce a permanent left sidebar.

## Feature surfaces

Speak and Caption should make the listening state unmistakable through a status label, clear microphone control and calm animated listening indicator. The transcript area should be high contrast, readable and editable before use. OCR should make the image selection, scan action, progress, result and read-aloud action a clear sequence. Phrase Board should prioritise large, easy-to-hit phrase controls and a prominent assembled-message area. Access Profile should group related preferences, show saved state and explain local storage plainly. Braille Preview must state that it is a visual preview and does not drive physical Braille hardware. Browser-dependent speech recognition and English OCR limitations must be described accurately. Never imply full sign-language translation, universal translation or robust deafblind support unless those features are genuinely implemented and tested.

## Motion and interaction

Use animation to add polish and communicate state, not to decorate every pixel. Recommended motion: short staggered card entrances, a slow floating relay preview, a gentle central-node pulse, a low-amplitude ring animation, and clear hover/focus transitions. Keep most transitions between 160–320 ms. Avoid parallax that shifts content under a user's pointer, autoplay video, flashing, or motion that interferes with reading. Respect `prefers-reduced-motion` globally; reduced-motion users should receive the same information and functionality with static elements. Every interactive control needs hover, keyboard-focus, active, selected, disabled and error states. Focus rings must be obvious against the dark surfaces.

## Accessibility and content

Dark mode is not permission to use low-contrast grey text. Verify WCAG 2.2 AA contrast for every foreground/background pair, including gradients and hover states. Keep body copy comfortably sized, use semantic headings and landmarks, associate every form control with a visible label, and announce dynamic status updates politely. Do not communicate selection by colour alone. Touch targets should be generous, ideally at least 44 by 44 CSS pixels. Support keyboard-only operation, screen-reader names, zoom/reflow and narrow screens. Maintain simple, respectful language. Keep decorative SVGs hidden from assistive technology and provide text alternatives for meaningful visuals.

## Engineering constraints and regression protection

Work from the existing static website. Preserve the current JavaScript behaviour, element IDs, data attributes, feature navigation, local profile persistence, speech recognition fallback, text-to-speech, Tesseract OCR assets, phrase board, Braille preview and vibration support. Do not replace working functions with mockups. Do not rename IDs referenced by `app.js`. Avoid introducing dependencies or remote assets that are required for core functionality. Web fonts may enhance the interface, but include robust system fallbacks. Check the console for runtime errors, check every local asset path, and validate HTML structure. Investigate any strange glyph output such as “n n only bnruh” by inspecting source encoding, newline sequences, CSS pseudo-content, font loading and script errors.

## Quality assurance and delivery

Test the landing page, About, How It Works, Impact, dashboard overview and every feature panel. Test at 320, 375, 768, 1024 and 1440 CSS pixels; verify no clipped content or horizontal scrolling. Test keyboard navigation, visible focus, dropdown open/close, form labels, reduced-motion preference, contrast and screen-reader announcements. Test speech recognition only in supported browsers and show a useful fallback elsewhere. Test OCR with a real image and verify the result can be reviewed. Confirm the phrase board and text-to-speech still work. Capture genuine desktop and mobile screenshots from the running site; never use mock screenshots. Package the complete site with assets, a changelog and concise run instructions. The final ZIP is a review build until the user approves the screenshots and confirms the features work on their device.

## Acceptance standard

The redesign is successful only if it is recognisably different from the previous generic dark UI, the logo is ownable and legible, the dashboard feels colourful and organised, the relay is visually memorable, the About and How It Works text is readable, animations are restrained and accessible, and every existing tool remains usable. Beauty, clarity and trust must reinforce one another.
