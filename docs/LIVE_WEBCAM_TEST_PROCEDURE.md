# Live webcam test procedure — for Rishi to run personally

This is the step Claude cannot do for you. Everything up to this point — the aspect-ratio bug fix, the pose-model
upgrade, the real-video mechanics harness (`test-sign-video.js`), 849 automated/browser checks — proves the
pipeline is wired correctly and the model does what its own weights say it does. **None of it proves the model
recognises a real person's real signing through a real webcam**, because no automated test can perform a sign. Only
you (or someone else physically signing at a real camera) can produce that evidence. This document is that test,
kept as short and literal as possible.

## What this test can and cannot tell you

Be clear about this before you start, because it affects how to read your own results:

- **It can tell you**: does SANGAM, through your actual webcam, in your actual room, ever produce the correct word
  for a sign you actually performed — and how often.
- **It cannot tell you**: whether the model is "good ISL recognition" in general. You are very likely not a fluent
  ISL signer (most people aren't), so an approximate, dictionary-learned sign is not the same input a Deaf signer
  would produce. A failure could mean the pipeline is broken, or it could just mean your hand shape wasn't close
  enough to what the model was trained on. Both are useful information, but they are not the same finding — record
  enough detail (below) that the difference can be told apart later.
- **A real linguistic validation** — a fluent Deaf ISL signer trying this and reporting whether the output matches
  what they signed — is the one category of testing nothing in this project has done or can simulate. If you know
  someone who signs ISL, or can reach a Deaf organisation willing to try it for a few minutes, that is the single
  most valuable test remaining; it's listed as optional at the end, not required for you to do this yourself.

## 1. Start the app

```
npm start
```
Then open **http://localhost:8080** in **Chrome or another Chromium-based browser** (this is what every automated
test in this project used; other browsers were never tested against the sign pipeline).

## 2. Open the Sign Language Camera

Go to `http://localhost:8080/#/dashboard/sign`, or click the **Sign Language Camera** card on the dashboard, then
**Open Sign Language Camera**. Allow the camera permission prompt.

## 3. Confirm you're testing the real pretrained model, not the fallback

Before signing anything, check the panel for which recognition source is active — it should say **ISL** and show
the model as **Available** (not "Not installed" and not the personal/taught-signs mode). If it shows anything else,
stop and tell me what it says rather than continuing — that would mean you're not actually testing the pretrained
model this whole phase was about.

## 4. Set up your camera like the training data was recorded

The model was trained on signers facing a fixed camera with their **upper body and both hands clearly in frame**,
reasonable indoor lighting, no strong backlight. Sit or stand so your shoulders and both hands are visible for the
whole sign — this isn't a SANGAM requirement, it's what the model has actually seen examples of.

## 5. Sign these 10 words, 3 times each (30 attempts total)

These are real words from the bundled model's own vocabulary (263 words total; the full list is in
`vendor/sign-models/isl/include-slgcn/model.json`'s `display` array, if you want to try others). These ten were
picked for being simple, concrete, and visually distinct from each other:

**Hello, Thankyou, Howareyou, Dog, Cat, Car, Book, Chair, Mother, Father**

If you don't already know the ISL sign for a word, look it up on the **Indian Sign Language Research and Training
Centre's official dictionary**: https://islrtc.nic.in/isl-dictionary/ (ISLRTC is the Indian government's dedicated
centre for ISL research and training, under the Department of Empowerment of Persons with Disabilities). Do not
guess at a sign — an invented gesture isn't a fair test of the model.

One important thing to hold for each attempt: **perform the sign for a good 1-2 seconds**, not an instant flick.
The model has a hard floor of 8 tracked frames before it will say anything at all (a bug fix from this phase,
`MIN_CLASSIFY_FRAMES`) — too brief a motion gets correctly ignored rather than guessed at, which is fine, but
you want most of your attempts to clear that bar so you get an actual prediction to judge.

For each of the 30 attempts, write down:

| # | Word you signed | What SANGAM displayed | Confidence shown (if any) | Correct? (yes/no/no result) |
|---|---|---|---|---|
| 1 | Hello | | | |
| 2 | Hello | | | |
| 3 | Hello | | | |
| ... | ... | | | |

(30 rows total — one per attempt. A plain text list is fine too; the table is just a convenient shape.)

## 6. Also try this (not scored, but important)

Move your hands around for a few seconds **without** signing any real word — just idle gestures, scratching your
head, adjusting your glasses, anything that isn't a sign. If SANGAM reports a confident word match anyway, write
down exactly what it showed. **This is not necessarily a new bug** — this phase already found and documented that
the model, being a closed-set classifier with no trained "none of these" output, can confidently misreport non-sign
input as a real word (see `docs/SIGN_LANGUAGE_MODEL_EVALUATION.md`'s "single most important structural finding"
section). Seeing it happen on your own live camera, rather than only in the synthetic test harness, is still a
genuinely new and useful data point — just don't read it as a defect specific to your setup.

## 7. Send the results back

Paste the filled-in table (or the plain list) back to me, plus:
- Browser and OS you used.
- Roughly how many of the 30 attempts matched what you actually signed.
- Anything from step 6.
- Anything that felt obviously wrong (long freezes, the camera not opening, the page erroring).

I'll read the pattern (not just the raw pass count) against what we already know: if accuracy is low but
concentrated on a few confusable words, that's a different finding than if it's low and random, or if it's actually
fine and the original complaint was about something else (the camera/aspect/pose-model bugs fixed earlier in this
phase, which this test also indirectly re-checks, since they'd resurface as "nothing is ever recognised").

## Optional, higher-value step: a real ISL signer's opinion

If it's possible for you to get even five minutes from someone who actually signs ISL — not necessarily a formal
interpreter, just someone fluent — ask them to do steps 2-6 themselves and tell you, in their own words, whether
the recognised words matched what they actually signed. That single data point is worth more than this whole
document, because it's the one kind of validation (a fluent Deaf or hard-of-hearing signer's judgment) that no
automated test, and no hearing person reading a dictionary, can stand in for. This is explicitly optional — the
project does not depend on it, and nothing above requires it to be useful on its own.
