# Model training guide

**No model was trained in this project.** The ISL and ASL word models are official pretrained checkpoints; the letter and number recognisers are rule-based; the held-pose matcher is nearest-neighbour. This guide says what training would involve so it is not guessed at.

## When training is justified

- To add vocabulary the pretrained models lack, to reduce wrong words on real webcam footage, or to add a "not a sign" class.
- To make a static ISL alphabet recogniser. That needs a real dataset first (see SIGN_DATASET_PROVENANCE.md). Do not train on ASL letters and call it ISL.

## What it needs

| Need | Detail |
|---|---|
| Data | Consented, licensed recordings by many signers (not one), several rooms and cameras, labelled by someone fluent in the language. Split **by signer** into train/validation/test |
| Compute | A GPU machine. The OpenHands SL-GCN trains from MediaPipe keypoints; the repository and recipe are AI4Bharat OpenHands (Apache-2.0) |
| Input match | Extract keypoints with the **same** tracker and settings the app runs (MediaPipe Holistic, heavy pose, about 10 fps live path). A mismatch here is the main reason accuracy on the webcam is below the published figure |
| Export | `scripts/sign-models/install.js` shows how the official checkpoint was converted to `model.json` + `weights.bin`; reuse the same layout and the parity tests (`test-sign-model.js`) |
| Evaluation | Report accuracy on unseen signers; report how many non-sign inputs are wrongly named; record the date, data version and commit |

## Static pose model (if a dataset exists)

Landmark features exist in `assets/sign-static.js` (`features`: 63 numbers, wrist-centred, palm-scaled). A small classifier (nearest neighbour, SVM or a tiny MLP) over those features can be trained offline with a held-out-signer evaluation and a reject rule. Only replace the matcher if it beats it on unseen signers.

## What not to do

Do not report training-set accuracy as accuracy; do not mix ISL and ASL labels; do not ship weights without recording their source and licence in `NOTICE.md`; do not describe a model as trained "on" a dataset you did not use.