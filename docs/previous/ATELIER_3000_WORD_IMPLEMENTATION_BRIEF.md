# SANGAM ATELIER — 3,000-WORD BRAND, UI/UX AND IMPLEMENTATION BRIEF

## 1. Creative direction and product promise

SANGAM is an assistive communication relay. Its visual identity must communicate connection, agency, dignity and clarity without turning disability into a decorative theme. The product should feel like a carefully art-directed communication instrument: expressive enough to be memorable, calm enough to use during a real conversation, and predictable enough to be trusted. The experience should not resemble a generic SaaS dashboard, a template landing page, or a collection of glowing cards. Every visual decision should reinforce the product's core idea: two people can choose different ways to communicate while remaining part of the same conversation.

The Atelier direction introduces a more editorial, spatial and tactile visual language. It uses deep ink backgrounds, layered indigo surfaces, soft mint, lilac, warm peach and restrained amber. It uses typography with a more distinctive contrast between compact, confident display headings and highly legible reading text. It uses a custom interwoven mark, asymmetric composition, generous negative space, animated light and carefully differentiated controls. The goal is not maximum decoration. The goal is a memorable interface with a strong visual rhythm and an unmistakable identity.

Keep the product's actual capabilities honest. The existing prototype includes a local access profile, browser speech recognition/captions where supported, browser text-to-speech, English OCR using Tesseract.js, a phrase board, an English Braille character preview, and vibration on supported devices. Speech recognition may be browser-dependent and inaccurate; the person must be able to review and correct recognition before sharing. Braille preview is visual only and does not operate physical Braille hardware. Sign-language translation, universal translation, broad multilingual support and robust deafblind workflows must remain clearly labelled as future work unless genuinely implemented and tested. Do not turn a beautiful interface into an exaggerated product claim.

## 2. Brand personality and principles

The brand should feel human, intelligent, quietly optimistic, independent and crafted. Avoid childish illustrations, medical-clinic clichés, stock accessibility symbols used as decoration, generic AI gradients, random blobs, and excessive glassmorphism. A strong design is built from a small number of repeatable ideas: a meeting point, interwoven paths, a visible message route, and a distinct colour identity for each communication mode.

Use these principles as a decision filter:

- **Agency before automation.** The person chooses how to send and receive. The interface must never imply that it diagnoses, labels or automatically decides a person's needs.
- **Clarity before spectacle.** A control must be understandable before its animation or decoration is considered.
- **Visible state.** Listening, processing, recognition uncertainty, selected modes, unavailable permissions and completed actions must have clear text and visual states.
- **No hidden action.** Do not transmit a message or activate a microphone merely because a page was opened or a control received focus.
- **Distinctive, not noisy.** Use bold typography, composition and colour blocking rather than filling every surface with gradients, shadows and motion.
- **Accessibility is part of the art direction.** Contrast, focus, text scaling, reduced motion, touch targets and screen-reader semantics must be designed into every component.

## 3. Logo and identity system

The SANGAM symbol should be a bespoke interwoven meeting-point emblem, not a stock icon and not a literal picture of a person, ear, eye, hand, mouth or speech bubble. The new mark uses two continuous ribbon-like paths that cross around a central point. One path suggests a message entering; the other suggests a message leaving. Their crossing is the shared conversation. Small terminal points indicate the people at either end. This concept is specific to SANGAM's two-way relay and should be recognisable at small sizes.

The emblem should be treated as a real vector asset. Keep paths clean, deliberate and optically balanced. Avoid too many tiny decorative dots, complex gradients that disappear at 24 pixels, or thin strokes that fail on dark backgrounds. The primary mark can use a controlled mint-to-lilac and warm-peach accent, but a one-colour version must also work. Provide a compact app icon, a horizontal lockup, and a monochrome mark. The wordmark should read SANGAM in uppercase with considered letter spacing. A small descriptor, “COMMUNICATION, CONNECTED”, may accompany it on desktop but should disappear at narrow widths. The mark must never be the only way the brand is communicated; always retain the text wordmark where space permits.

Logo motion should be restrained. A slow luminance breath or a small rotation on hover is enough. Do not spin the logo continuously, pulse it aggressively, or make the logo move while a user is trying to read a page. The logo should be static under `prefers-reduced-motion: reduce`. The hover state should not change the shape or make it difficult to recognise. Do not use an emoji as the brand symbol.

## 4. Typography system

The previous visual iterations relied too heavily on one similar geometric sans-serif style. The next implementation must establish a more obvious typographic hierarchy. Use a display face with strong editorial character for large headings, a highly legible humanist face for paragraphs and controls, and a compact mono or tabular style only for technical metadata such as status labels, timestamps or step numbers. Do not set every heading, button, navigation item and label in the same font weight and letter spacing.

Where available, use a display font such as Archivo or a comparable bold grotesk for headlines, paired with Atkinson Hyperlegible for body text and controls. The body face must remain clear at 16–18 CSS pixels. Use a line-height around 1.5–1.7 for paragraphs and avoid long lines. Large headings may be tight, but never sacrifice legibility to achieve a trendy compressed look. Do not use ultra-thin weights on dark backgrounds. Buttons should use the body face with a strong weight; they should not look like miniature headings. Labels should use medium weight and a little letter spacing, not all-caps everywhere.

Create a type scale rather than choosing sizes independently. Suggested roles: display hero 64–112 px responsive; section heading 40–64 px; card title 20–26 px; body 16–18 px; helper text 14–15 px; micro-label 11–12 px with restrained tracking. Respect browser zoom and text resizing. At 200% zoom, headings must wrap rather than clip, and no essential control may disappear behind a fixed element.

## 5. Colour, light and surface design

The dark interface should use a deep ink base rather than absolute black. Suggested foundation: `#080D1B` for the page, `#101A31` for primary panels, `#182744` for elevated panels, and a lighter indigo for active surfaces. The accent family is soft mint (`#91F1D9`), lilac (`#B8A6FF`), warm peach (`#FFB18E`), and amber for selected warnings or input emphasis. Use coral or rose only where it carries a distinct output or status meaning. Do not make all buttons the same gradient.

Layered shading should create depth without obscuring content. Use one broad radial glow behind a major visual, a subtle top-edge highlight on elevated panels, and a shadow that separates the panel from the background. Avoid stacking several strong shadows on every card. A surface should have a clear role: page background, section surface, elevated card, active control or transient overlay. Do not use low-contrast grey text on dark grey panels. Normal text must meet WCAG AA contrast of at least 4.5:1; large text must meet at least 3:1. Icons and essential graphical boundaries should meet non-text contrast requirements. Never use colour alone to communicate selection or error; pair colour with labels, icons, shape or text.

## 6. Landing page composition

Do not repeat the familiar left-column copy/right-column widget composition as the default hero. The new layout should read like an editorial opening: a short eyebrow label, an oversized headline with a deliberate line break, and a concise supporting paragraph arranged as a secondary column or a narrow block beneath the headline. The key action should be prominent but not oversized. The hero should then reveal the communication relay as a wide, full-width interactive composition beneath the statement. This makes the relay the product's signature visual rather than a side illustration.

The relay panel should have an intentional internal grid. Inputs and outputs should be visually balanced around the central node, but they should not be forced into a cramped diagram. Use clear labels, generous spacing, readable control labels and a short status sentence below. The centre node must not compete with the actual controls. If the screen is narrow, change the composition to a clear vertical flow: input choices, central adaptation indicator, output choices. Do not shrink the text until it is unreadable just to preserve a desktop arrangement.

The hero should explain the product in plain language. Avoid generic phrases such as “empowering everyone through innovation” when a concrete explanation is possible. Use a sentence that explains that each person chooses how they send and receive. The call to action should lead to the real dashboard. A secondary action can lead to How It Works. Facts or metrics should only appear if they are accurate and meaningful; do not invent impact numbers.

## 7. Signature communication relay

The relay is the most important visual component. It should show that a message can enter through one mode, be reviewed and adapted, and leave through another mode. Inputs and outputs must be clearly named. Selected input and output states must be obvious through a combination of border, fill, icon state and text. The centre node can use a dimensional gradient, but the word SANGAM and the descriptor must remain readable. The central mark should be related to the logo rather than an unrelated circle with generic text.

Use SVG paths for connecting routes. A selected route can animate a subtle dash or travelling highlight along the line. The animation should run once when the user changes a selection, not loop constantly. Keep the path behind controls and make sure it never crosses text. On mobile, replace complex diagonal connectors with a simple vertical connector or numbered sequence. The message below the diagram should update in plain language, for example “Voice in, captions out.” Do not describe an illustrative example as a live connection. If it is a demo, label it clearly as an illustrative flow.

## 8. Dashboard information architecture

The dashboard should prioritise tasks, not decoration. The first view should answer: what can I do here, what is currently enabled, and where do I start? Keep the horizontal top navigation. Do not introduce a permanent left sidebar. The Dashboard control should open a clear dropdown or disclosure panel directly below the top navigation item, with links to the actual feature sections. The dropdown must use a button with `aria-expanded` and `aria-controls`; it must open with Enter or Space, close with Escape, and retain a visible focus indicator.

The overview should use a distinctive heading, a short welcome sentence and a compact access-profile summary. Feature cards should be colourful but individually purposeful. Use a distinct accent family for Speak & Caption, Read from Photo, Phrase Board, Access Profile and Braille Preview. Do not rely on the same grey tile repeated five times. Each card needs a clear title, one sentence describing the task, a meaningful icon and a strong click target. Avoid tiny icon-only actions. Hover should lift the card slightly; keyboard focus should use a clear outline rather than relying on hover.

The dashboard's right-side communication preview must be redesigned as a real product component, not an oversized generic card. Use a vertical message journey or a three-stage sequence: person A sends, SANGAM adapts, person B receives. Distinguish sender, transformation and receiver through colour and typography. The content should be concise and readable. A message bubble should look like a message, not a form field. The central adaptation state can use a soft animated highlight. Make it clear when the preview is an example, and do not imply a real person is connected.

## 9. Feature-specific experience

### Speak & Caption
The primary control must say “Start listening” when inactive and “Stop listening” while active. A clear status label must show whether the microphone is active. Ask for permission only when the user starts the feature. If the browser does not support speech recognition, show a helpful explanation and keep other communication tools available. Recognition output must be editable or correctable before the user shares it. Do not send speech recognition output automatically. Show errors and uncertainty in plain language. Use an accessible live region carefully; do not announce every partial transcript update so rapidly that it overwhelms screen-reader users.

### Read from Photo
Use a clearly labelled upload control and show the selected image preview with an option to replace it. Keep the scan action separate from file selection. Announce scanning progress and completion. If no text is detected, explain what to try next, such as a sharper image or better lighting. Recognised text must be editable, copyable and optionally read aloud. Be clear that the current OCR support is English only. Do not imply scene description or object recognition if the current implementation does not provide it.

### Phrase Board
Phrase buttons should be large and organised into meaningful categories. The assembled message must be visible as it is built. Provide clear controls to speak, clear, undo or remove the last phrase. Announce additions without making the entire message re-read after every tap. Keep the phrase vocabulary editable only if the current application supports that; otherwise do not promise custom phrase management.

### Access Profile
Use plain-language labels and grouped settings. State which preferences are stored locally. Do not imply that settings are synced across devices or uploaded to a server. Use native controls where possible. Saving should provide a clear confirmation. If a setting cannot be supported on a device, explain that rather than silently ignoring it.

### Braille Preview
Label the output as a visual English Braille preview. Explain that the current feature does not move physical Braille pins or connect to a refreshable Braille display. Provide a text alternative for the displayed Braille pattern. Do not claim full Grade 2 support unless it is implemented and validated.

## 10. Motion and interaction language

Motion should communicate hierarchy, state change and continuity. Use staggered entrance motion for hero elements, a one-time reveal for the relay, a very slow ambient light sweep behind the panel, a small breathing glow for the central node, and a short route highlight when a user changes a mode. Cards can rise a few pixels on hover. Buttons can move slightly and brighten on hover or press. Dropdowns should open with a short opacity and translate transition. Avoid bounce easing, excessive parallax, cursor-following effects, constant particle systems or perpetual movement on every card.

All non-essential motion must respect `prefers-reduced-motion: reduce`. Reduced-motion mode should remove transforms, loops and animated scrolling while preserving every function. Do not make an essential status visible only through animation. Provide a static state that is equally understandable. Keep animation durations short for feedback (120–250 ms) and longer only for ambient movement (6–30 seconds). Ensure animations do not cause layout shifts or change the reading order.

## 11. Accessibility and inclusive interaction

Meet WCAG 2.2 AA as the target. Every feature must work with keyboard only. Use semantic links and buttons, correct heading order, labelled inputs, visible focus, skip navigation and meaningful landmarks. Do not add ARIA roles where native HTML already provides the required semantics. Use `aria-expanded` for disclosures, `aria-pressed` for toggle buttons when appropriate, and live regions only for meaningful state updates. Ensure that sticky headers do not obscure focused controls. Maintain a logical DOM order that matches the visual order.

Target at least 44 by 44 CSS pixels for common touch controls where practical, while meeting WCAG 2.2 minimum target-size requirements. Do not use colour as the only signal. Support text zoom to 200%, narrow viewports, landscape orientation and reflow without horizontal scrolling. Make form errors specific and actionable. Keep content readable with high contrast and generous line spacing. All decorative SVGs should be hidden from assistive technology; informative graphics need an accessible name or adjacent explanation.

## 12. Responsive behaviour

At desktop widths, the landing hero uses editorial copy above a wide relay. At tablet widths, the supporting paragraph moves below the headline and the relay retains three clear zones. At phone widths, the hero becomes a single column; input controls stack above the central adaptation marker and outputs stack below. The central node must never overlap labels. The navigation may collapse behind a menu button with `aria-expanded` and `aria-controls`. Cards become one column on narrow phones and two columns only when each card has sufficient width. Avoid fixed heights for content-heavy panels. Test at 320, 360, 390, 768, 1024, 1440 and 1920 CSS pixels.

## 13. Content design and trust

Use direct, respectful language. Prefer “Choose how you want to communicate” over abstract or patronising slogans. Describe a feature by what it actually does. Label demos as examples. Explain browser support and permissions before the user is blocked. If a browser feature is unavailable, do not show a dead button. Explain the limitation and offer another working route. Do not use “AI-powered” as a substitute for a precise explanation. Do not imply that SANGAM diagnoses, understands sign language, or guarantees perfect transcription.

The interface should help a person recover from errors. If microphone access is denied, show how to enable it in browser settings. If OCR fails, suggest a better image. If speech recognition returns uncertain text, make correction the next obvious action. If text-to-speech is unavailable, keep the text visible and copyable. If vibration is unsupported, say so or hide the unavailable control without breaking the page.

## 14. Technical implementation constraints

Preserve the existing static HTML, CSS and JavaScript architecture unless a change is necessary. Do not rewrite the working application wholesale. Keep the existing element IDs and data attributes used by `app.js`. Do not rename `inJacks`, `outJacks`, `boardFoot`, dashboard panels, feature IDs or other JavaScript hooks without updating every reference and testing them. Do not delete the bundled Tesseract assets. Do not replace local functionality with mock controls. Keep the project runnable from a local static server and document that `file://` restrictions may affect microphone and speech APIs.

Keep the logo as inline SVG or a local SVG asset with clean paths. Avoid external icon fonts. If web fonts are added, provide robust local/system fallbacks and ensure the page remains readable when the network is unavailable. Do not rely on external image URLs for core identity or feature graphics. Keep CSS organised into tokens, base rules, components and responsive overrides. Remove obsolete duplicate overrides only after verifying the cascade. Avoid `!important` as a blanket strategy; where legacy CSS requires it, document the reason and scope it narrowly.

## 15. Debugging and regression protection

The earlier “n n only bnruh” rendering issue must be treated as a release-blocking regression until understood. Verify that HTML, CSS, JS and SVG files are UTF-8. Inspect malformed tags, stray text nodes, broken string escapes, literal `\\n` sequences, invalid CSS declarations, missing assets and console errors. Check font requests and ensure a font failure cannot render raw icon glyphs or corrupt content. Check that CSS does not hide text through inherited colour, opacity, blend modes or clipping. Verify the ZIP's internal folder structure so the entry page and its relative assets remain in the expected locations.

Run a JavaScript syntax check. Search for duplicate IDs. Verify that every script and stylesheet path resolves. Test the dashboard dropdown, hash navigation, all feature panels, speech start/stop, OCR file selection and scan, phrase selection and speech output, profile save/load, Braille preview and vibration fallback. Check that no console errors occur during these actions. If a browser is available, use it to capture genuine screenshots at desktop and mobile sizes. If it is not available, do not create fake screenshots or claim visual testing passed.

## 16. Screenshot review protocol

Prepare real screenshots of: (1) desktop landing page at 1440 or 1920 pixels, (2) full-width communication relay, (3) How It Works section, (4) dashboard overview, (5) Dashboard dropdown open, (6) Speak & Caption panel, (7) Read from Photo panel, (8) Phrase Board, and (9) mobile landing and dashboard. Screenshots must be generated from the actual running website, not drawn mockups or edited composites. Keep the browser viewport dimensions visible in the review notes. If a page is not functional or a browser capability is unavailable, label the limitation clearly.

Ask the user to review the screenshots before calling the design final. Collect specific visual feedback about logo recognition, headline hierarchy, contrast, card distinction, relay legibility, animation comfort and mobile layout. Make revisions without undoing already approved sections. Keep a changelog so the user can see what changed between iterations.

## 17. Acceptance criteria

The redesign is ready for review only when the following are true:

1. The new emblem is unique to SANGAM, clean at small sizes and available in a monochrome treatment.
2. The hero no longer uses the old simple left-copy/right-widget template; the full-width relay is the signature visual.
3. The headline, supporting text, actions and relay are readable at desktop and mobile widths.
4. The display and body typography have visibly different roles and remain legible.
5. How It Works text has sufficient contrast and its four steps are clearly differentiated.
6. Dashboard cards use distinct accents and clear descriptions rather than generic repeated grey surfaces.
7. The communication preview has a readable sender-to-adaptation-to-receiver hierarchy.
8. Motion is meaningful, non-disruptive and disabled or reduced under the operating-system preference.
9. Keyboard, screen-reader labels, visible focus, touch targets and responsive reflow are checked.
10. Existing product features still work and product limitations remain accurately stated.
11. The old rendering glitch does not recur in tested browsers.
12. The final ZIP opens with the correct folder structure and includes a README and changelog.

## 18. Delivery and approval discipline

Do not describe the work as complete merely because a CSS file was changed. State exactly what was changed, what was tested, what could not be tested, and what still needs user review. Provide the ZIP only after verifying its integrity and ensuring all expected files are included. Do not claim browser testing if only syntax checks were performed. Do not call a screenshot “real” unless it was captured from the running site. Preserve the prior version separately so that the project can be rolled back if a regression appears.

The finished SANGAM experience should be recognisable without its name: a crafted interwoven identity, an editorial opening, a distinctive communication relay, purposeful colour, meaningful motion and a calm, accessible task interface. It should feel like a coherent product with its own visual language—not a generic dark theme with brighter cards. Every flourish should make the message path clearer, every interaction should give the person control, and every claim should match the software that actually exists.
