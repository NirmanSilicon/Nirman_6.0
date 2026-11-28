# Sign dataset provenance

Rule followed: nothing was fabricated, scraped, or relabelled. Every dataset item below says where it came from and what it is used for. Synthetic test data is labelled synthetic and is not evidence of accuracy.

## Real data in the project

| Item | Source | Licence | Use |
|---|---|---|---|
| INCLUDE metadata (`datasets/isl/metadata/`) | AI4Bharat INCLUDE (Zenodo record 4010759; Hugging Face table `hf_data_*.parquet`, `include_*.csv`) | CC BY 4.0 | Label list (263 ISL words), split definitions |
| Keypoints of 85 real ISL videos (`datasets/isl/keypoints/seasons_c1_full`, `..._c1_live10`, `..._c2_live10`) | Extracted by this project's own tracker from `Seasons_1of1.zip` (MD5 `56e2f91d852574c8995320d6e4d8205c`, verified) | Derived from CC BY 4.0 videos | Measuring the model on real signs. Numbers only; the videos are not included |
| Evaluation reports (`datasets/isl/reports/`) | Produced by `datasets/isl/tools/eval_model.js` | Project | Reproducibility |
| Pretrained weights (`vendor/sign-models/...`) | Official AI4Bharat OpenHands SL-GCN checkpoints, converted by `scripts/sign-models/install.js` | Apache-2.0 (see `NOTICE.md`) | Word recognition |
| MediaPipe Hands/Holistic | Google, vendored in `vendor/mediapipe/` | Apache-2.0 | Landmark extraction |

Known data issue found: the official metadata lists 33 videos under two different labels; they are excluded from evaluation. Unfiltered, 424 videos appear as both "train" and "test"; rows with `include_50 == False` reproduce the paper's split.

## Not available (and therefore not claimed)

- **No ISL alphabet (static) dataset.** None was found with a verified licence and verified signers. No ISL letter recogniser exists. The letters in the app are ASL.
- **No webcam recordings of real users** were collected or are stored.
- The remaining ~56.8 GB of INCLUDE was not downloaded; only one 1.3 GB archive was used for the audit.

## Synthetic data

`test-support/letter-hands.js` generates hand skeletons by forward kinematics. It is used only by `test-sign-letters.js` and `test-sign-static.js` to check logic. It is not a dataset of signs and no accuracy figure may be derived from it.

## Personal data collected by the app

The held-pose trainer stores each person's own hand landmarks on their own device. It is consent-gated by the Sign Language Camera consent screen, deletable per pose or entirely, and never uploaded. A person's own gestures are labelled as personal gestures, not as a standard sign language.

## If a new dataset is to be added

Record: source URL and version, licence and attribution, who the signers are and whether they consented to this use, language (ISL or ASL, never "sign language" in general), what was captured (video or landmarks), how it was split (by signer, not by clip), the checksum, and the date. Add a row above in the same change.