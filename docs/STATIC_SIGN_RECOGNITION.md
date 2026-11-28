# Static sign recognition (a hand shape held still)

Three separate recognisers exist. They are never mixed and each says what it is.

| Recogniser | Language | How | Status |
|---|---|---|---|
| **Letters** (A-Z) | **American** Sign Language one-handed alphabet | Hand-written rules over finger straightness, thumb position, fingertip distances; J and Z from the fingertip path. Hold still about 0.7 s | COMPLETED as a mechanism; synthetic hands only (`test-sign-letters.js`, 39 checks). Not measured on real signers |
| **Numbers** (0-9) | **American** Sign Language | Same rule engine | Same |
| **My held poses** | **None.** Your own gestures | Nearest-neighbour matching of the person's own captured hand shapes (`assets/sign-static.js`) | COMPLETED as a mechanism; synthetic hands plus a browser run with synthetic frames. Not tested with a real camera |
| ISL static alphabet | Indian Sign Language | **Not implemented** | NOT_IMPLEMENTED |

## Why there is no ISL alphabet recogniser

Indian Sign Language fingerspelling is largely two-handed and no verified, licensed ISL alphabet dataset or model was available to this project. Writing rules from memory, or relabelling the ASL letters as ISL, would produce confident wrong output. The ASL recognisers are labelled ASL in the language list and in the About panel. If you need ISL letters, see SIGN_DATASET_PROVENANCE.md and MODEL_TRAINING_GUIDE.md for what a legitimate route looks like.

## My held poses: how it works

1. **Teach.** Name a pose, press *Capture this pose*, hold the hand still. About eight still readings are taken from frames where the hand is not moving. Capture each pose three or more times, changing distance and tilt a little. At least two different poses are needed (a single pose cannot be told apart from anything).
2. **Features.** 21 hand landmarks, centred on the wrist and divided by palm size (wrist to middle knuckle and index-to-little knuckle width). Unchanged by moving the hand around the frame or toward the camera. **Not** unchanged by turning the hand; orientation can matter. Use the same hand when teaching and using.
3. **Match.** The mean landmark distance to each pose's two nearest captures decides the closest pose. The result is rejected as **unknown** if the closest pose is farther than 1.6 times the 90th-percentile spread of your own captures (kept between 0.12 and 0.6 palm sizes), and as **ambiguous** if the second-best pose is nearly as close.
4. **Hold to type.** The same pose must be held about 0.9 s. Then its word is added to the text. It is not typed again until you lower your hand or change pose. A pose you have just captured is not typed while you are still holding it.
5. **Never sent automatically.** Text goes to chat only after *Confirm text* and *Send*.

## Checks available to the person

*Check how well my poses work* runs leave-one-out on the captures (each is held out and classified against the rest) and reports right, mixed-up and not-recognised counts per pose. It is deliberately labelled optimistic: captures from one sitting are similar. It says nothing about other people's hands.

## Privacy

Only numbers are stored (63 per capture) in this browser's `localStorage` (`sangam.sign.static.v1`). No pictures, video or sound. Delete one pose or all poses at any time; *Download my poses* gives the same numbers as JSON. Nothing leaves the device.

## Tests

`node test-sign-static.js`: 45 checks on synthetic hands (generated geometry, not a person): feature invariance, storage/deletion/limits, classification, rejection of never-taught shapes, ambiguity, hold logic, capture. These prove the logic. They do not prove accuracy on a real hand.