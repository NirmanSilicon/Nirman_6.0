# Sign-language model packages

**Update, third integration pass:** real pretrained models are now installed here — ISL (bundled) at
`vendor/sign-models/isl/include-slgcn/`, and ASL (install on request) at
`vendor/sign-models/asl/wlasl-slgcn/`. These use a different, richer format (a real SL-GCN neural network: a
`model.json` architecture spec plus a `weights.bin` tensor file) than the simple hand-authored
`TemplateAdapter` package format this file originally documented below. See `docs/SIGN_LANGUAGE_MODEL_EVALUATION.md`
for what is installed and how it was verified, and `docs/MODEL_INSTALLATION_GUIDE.md` for installing or
reinstalling either model. `docs/SIGN_LANGUAGE_MODEL_RESEARCH.md` is the earlier research that concluded (at the
time, correctly, given what was tried) that no model could be obtained — superseded, kept for its trail.

The format described below (`TemplateAdapter`, `assets/sign-engine.js`) remains in the codebase as a separate,
simpler option — a small, hand-authored set of example templates for a language or vocabulary not covered by
either pretrained model — but it is not how the ISL/ASL pretrained models above are packaged, and no such
hand-authored template package is bundled in this build.

## `TemplateAdapter` package format (hand-authored templates, not the pretrained SL-GCN models above)

```json
{
  "manifest": {
    "id": "isl-xyz-v1",
    "name": "Indian Sign Language (word level), XYZ v1",
    "language": "Indian Sign Language",
    "vocabulary": ["hello", "thank you"],
    "licence": "SPDX id or name, and a link",
    "dataset": "What it was trained on, with a link",
    "evaluation": "Held-out result, who ran it, how (signers not in training)",
    "featureVersion": 1
  },
  "templates": { "hello": [ [ /* 24 frames, each a 132-number feature vector */ ] ] }
}
```

`featureVersion` and the frame layout come from `assets/sign-engine.js` (`normalise`, `resample`). Every vocabulary word needs at least one template, and every template sequence must be 24 frames of 132 numbers. The app rejects a package with any missing manifest field, an empty vocabulary, a vocabulary word without templates, a different feature version or a wrongly shaped template, and shows the reason on screen. A package for ASL or any other language must name that language and will be listed as that language, never as ISL.

Do not put a package here unless its licence permits redistribution and it has a real evaluation.
