# Dynamic sign recognition (signs that move)

Short version: the **pretrained ISL/ASL word models** and the **personal moving-sign matcher** exist and run locally. Their accuracy on real signers has only been measured in a small way, and the app tells people so.

## Pipeline

camera -> MediaPipe Holistic (body + hands; **heavy** pose model, as the ISL model was trained with) or MediaPipe Hands -> `Segmenter` (a sign starts when a hand appears, ends after hands have been out of view 0.6 s, maximum 4.5 s) -> resampled to 25 frames per second -> model or matcher -> `Stabiliser` (confidence and agreement rules; repeats within 1.5 s suppressed) -> transcript -> **confirm** -> send.

Inference runs in a Web Worker so the page does not freeze (it used to: one word took 3-13 s on the page thread).

## Recognisers

| Recogniser | Vocabulary | Evidence |
|---|---|---|
| ISL pretrained (SL-GCN, AI4Bharat OpenHands, trained on INCLUDE) | 263 words | Real-video check on 85 INCLUDE videos of 6 words (Summer, Spring, Winter, Fall, Season, Monsoon): about 82% top-1 (83% on the 18 held-out videos). Published figure for the model is higher (93.5%), so the live input still differs from training. Full numbers: ISL_RECOGNITION_AUDIT.md |
| ASL pretrained (WLASL SL-GCN) | 2,000 words, or the 100 most common | Its authors measured about 31% first-guess accuracy across 2,000 words; prefer the 100-word option |
| My own signs (moving) | Whatever the person teaches | Dynamic time warping against the person's recorded examples. Synthetic tests only |

## Rejecting "not a sign"

The network has no "unknown" class. On real INCLUDE hands played backwards or scrambled, a word was still named 93-94% of the time at the original confidence bar. The **How careful?** setting (Loose, Balanced, Careful) requires agreement across trimmed views and higher confidence: roughly a third to a half of those false words remain at Balanced and about a quarter at Careful. This is mitigation, not a cure.

## Limits to state to users

- Isolated words only. No sentences, no grammar, no facial expression, no fingerspelling in these models.
- Unseen signers, real webcam sessions and different lighting were not measured here.
- ISL and ASL models are separate and never combined.
- Nothing is spoken or sent without the person confirming.

## What would be needed to do better

A signer-independent evaluation on a held-out set of real webcam recordings, a "not a sign" class trained from real negatives, and, for new vocabulary, consented training data. See MODEL_TRAINING_GUIDE.md.