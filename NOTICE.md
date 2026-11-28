# Third-party components

SANGAM's own code has no licence file in this package: the owner has not chosen one, so none is invented here. The components below keep their own licences.

| Component | Where | Licence | Notes |
|---|---|---|---|
| express, ws, qrcode | `node_modules` (installed by `npm ci`) | MIT (as declared by each package) | Server only |
| axe-core | dev dependency | MPL-2.0 (as declared by the package) | Tests only, not shipped to browsers |
| Tesseract OCR engine and tesseract.js; English language data | `vendor/tesseract/` | Apache-2.0 | OCR, runs in the browser |
| MediaPipe Hands (legacy), `@mediapipe/hands` 0.4.1675469240 | `vendor/mediapipe/hands/` | Apache-2.0 (declared in its package.json) | Hand tracking. See `vendor/mediapipe/hands/NOTICE.md` |
| MediaPipe Tasks Audio, `@mediapipe/tasks-audio` 1.2.3 | `vendor/mediapipe/audio/` | Apache-2.0 (declared in its package.json) | Runs YAMNet. See its README for hashes |
| YAMNet model (Plakal and Ellis, Google) | `vendor/yamnet/yamnet.tflite` | Apache-2.0 | Third-party repack; provenance caveat in `vendor/yamnet/README.md` |
| AudioSet ontology class names | `vendor/yamnet/yamnet_class_map.csv` | CC BY-SA 4.0 | Attribution: "AudioSet ontology, Google Inc., CC BY-SA 4.0" |
| Apache License 2.0 text | `vendor/LICENSE-APACHE-2.0.txt` | | Standard text |
| Fonts (Archivo, Atkinson Hyperlegible) | `assets/fonts/` | Believed to be SIL Open Font License 1.1 | **Not verified in this build.** Check the licence of the files you redistribute |

Not included, deliberately: any Indian Sign Language model or dataset. INCLUDE and similar datasets have their own (non-commercial) terms; see `docs/SIGN_LANGUAGE_MODEL_RESEARCH.md`.
