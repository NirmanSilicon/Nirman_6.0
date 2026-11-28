# Deafblind-friendly options: validation plan

**Status: implementation under validation.** SANGAM does not claim to "support deafblind users". It offers options that some deafblind people may find useful, and it needs to be co-designed and tested with them before any stronger claim is made.

## What exists

In **Profile → Deafblind-friendly options (optional)**, one button applies a preset of settings the person can then change: Braille and haptic output on, captions on, larger text, high contrast, and "confirm before sending" on. An **Undo** button restores the previous settings. The preset is a *starting point for an individual's choices*, not a category the app assigns. The app never asks about, infers or stores a disability.

The app also tells the sender when a chosen output could not reach the receiver: if a recipient's device could not deliver their chosen mode (for example haptic failed, spoken output was unavailable, or a physical Braille display was claimed but not receiving), the sender sees "Delivered to X's device, but it may not have reached X in the way they prefer. It was shown on screen." The message never silently shows plain "Delivered" in that case. The sender is not told which channels the receiver uses.

## What has been tested

Automated and browser tests with stand-ins (see `TEST_REPORT.md`): the preset and Undo, confirm-before-send, the "limited" notice and its privacy, haptic patterns on a fake vibration API, Braille routing to a TEST-ONLY adapter. **No deafblind person, tactile-communication specialist, physical Braille display or vibration motor was involved.**

## Plan to validate

1. **Partner first.** Contact deafblind organisations (for India, for example Sense International India, which describes itself as the national organisation supporting people with deafblindness: <https://www.senseinternational.org.uk/?p=338>) and ask whether and how they want to be involved. Compensate participants. Don't recruit before there is a real partner.
2. **Co-design sessions** (before more building): what tactile and Braille channels do participants already use, which messages matter (emergency, yes/no, help), what pace is workable, what is not wanted.
3. **Hardware sessions:** test with a real refreshable Braille display (record model, firmware, connection), a phone's vibration motor, and the participant's own screen reader or assistive tools. Record failures verbatim.
4. **Measure:** task success on "send and receive a message", "send an emergency message", and "understand a received haptic pattern"; time taken; errors; comfort; what the participant would change. Use participants' own words, not only counts.
5. **Safety review:** the emergency path must say plainly that it alerts only people in the session and does not contact emergency services.
6. **Report back** to participants and the partner, change the app, and only then update the status line in the in-app "What comes next" panel.

## What must not be claimed until then

* That SANGAM "supports deafblind users" or is "accessible to the deafblind".
* That Braille or haptic output has been verified with hardware.
* Any result from people who were not actually involved.
