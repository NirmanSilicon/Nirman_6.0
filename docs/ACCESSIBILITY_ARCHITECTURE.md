# Accessibility architecture

Principle: preferences describe how a person wants to take part. They are not disability labels and they are not shared without consent.

## Layers

1. **Document semantics.** One `<h1>` per view, landmarks (`header`, `nav`, `main`, `footer`), a single skip link as the first focusable element, real `<button>`, `<a>`, `<label for>`, `<fieldset>/<legend>` for choice groups, `aria-labelledby` where a label is not text.
2. **Focus management.** On every route change the new view's heading receives focus and the document title changes, so a screen-reader user hears where they are. Dialogs use `<dialog>.showModal()`, trap focus natively, return focus to the opener, and close on Escape.
3. **Live regions.** `Sangam.announce(message, level)` writes to polite or assertive regions. A person chooses *Everything*, *Important only* or *Alerts only*. Form errors use an error summary at the top plus per-field messages tied with `aria-describedby`; no colour-only signals.
4. **Preferences that change the page.** Text size (standard, large, extra large), theme (light, dark, high contrast), reduced motion, screen-reader-friendly mode, keyboard emphasis, spoken notifications, speech voice and speed, haptics. They are saved to the account (primary users) and to this device (`sangam.v2`) and applied on every page load.
5. **Input alternatives.** Type, speak, voice-to-text, sign recognition, phraseboard, switch scanning, Braille routing; receive by text, spoken audio, live captions, visual alerts, haptics. Every mode has a text equivalent.
6. **Optional voice navigation.** Off until the person enables it and agrees to the speech-service notice. One command per button press; consequential commands need confirmation.

## What the code guarantees and what it cannot

- It guarantees the structure above on the account views; an in-page audit (`test-support/ui-audit.js`) checks heading count, control names, duplicate ids and text contrast and found 0 structural problems on 47 views.
- It cannot guarantee how a particular screen reader, browser and speech engine combination reads a page. That needs testing with real users.

See also: KEYBOARD_ACCESSIBILITY.md, SCREEN_READER_GUIDE.md, LOW_VISION_ACCESSIBILITY.md, VOICE_NAVIGATION_GUIDE.md, BLIND_USER_IMPLEMENTATION.md, ACCESSIBILITY_UI_AUDIT.md.