# Installing the sign-language models

This covers the real pretrained ISL and ASL models described in `SIGN_LANGUAGE_MODEL_EVALUATION.md`. Most people
will not need to do anything: **ISL is already installed in this ZIP.** This guide is for verifying that, for
installing ASL (not bundled, see below), and for reinstalling either from scratch.

## What is already there

```
vendor/sign-models/
  isl/
    manifest.json                       # provenance, licence, dataset, evaluation numbers
    include-slgcn/
      model.json                        # architecture spec: tensor shapes, layer list, label list
      weights.bin                       # the actual trained numbers, 14.75 MB
      install-receipt.json              # what was installed, when, and its checksums
  asl/
    manifest.json
    (wlasl-slgcn/ — present only after you run the installer with --accept-wlasl-terms, see below)
```

SANGAM loads these at startup by fetching `vendor/sign-models/<lang>/<modelDir>/model.json` and `weights.bin` — no
Python, no server-side inference, no network call beyond your own site's own files. If `vendor/sign-models/isl/
include-slgcn/` is present and intact, ISL recognition is available the moment you open the app; nothing to install.

## Checking what you have

```
npm run models:verify
```

This re-hashes every installed `weights.bin` against the SHA-256 recorded in its own `install-receipt.json` at
install time, and re-checks `model.json`'s tensor shapes against the architecture SANGAM's code expects. It does
not touch the network. Run this after copying the project anywhere, or if you suspect a file was corrupted or
truncated (e.g. by a bad ZIP extraction or a Git LFS / `.gitattributes` misconfiguration — binary weight files like
these should never be checked out as text).

## Installing ASL (not bundled — read this first)

The ASL model is trained on WLASL2000, whose dataset licence (Computational Use of Data Agreement 1.0) states **"No
commercial usage is allowed."** SANGAM therefore does not bundle those weights in this ZIP. To install them:

```
npm run models:install -- asl --accept-wlasl-terms
```

`--accept-wlasl-terms` is not a formality — it is the only thing standing between "not installed" and "downloaded
and used." Do not script around it or pass it by default in an automated deployment without having actually read
<https://dxli94.github.io/WLASL/> and confirmed your use case is non-commercial, academic, or otherwise compatible.
If your deployment is commercial, **do not install the ASL model** — ship ISL only (already done by default) and,
if ASL is required, look for an alternative dataset or a model trained on one with compatible terms.

What this command does, concretely:

1. Downloads `wlasl_metadata.zip` (labels) and `wlasl_slgcn.zip` (the checkpoint) from the official
   `AI4Bharat/OpenHands` GitHub release — the same release the manifest's `source.files` entries point to, nothing
   else.
2. Checks both files' byte length and SHA-256 against the values recorded in `vendor/sign-models/asl/manifest.json`.
   A mismatch stops the install rather than proceeding with an unverified file.
3. Parses the PyTorch Lightning checkpoint using a from-scratch, restricted pickle-opcode interpreter
   (`scripts/sign-models/torch-ckpt.js`) that only ever resolves tensor storage and never executes a class
   constructor from the file — this matters because an ordinary unpickle of an untrusted file can run arbitrary
   code, and this one cannot.
4. Checks every tensor's name and shape against the exact OpenHands `DecoupledGCN` architecture SANGAM implements
   (`expectedShapes()` in `install.js`). A checkpoint that does not match this shape — e.g. a different OpenHands
   model variant, or a corrupted download — is refused with a specific error naming the mismatched tensor.
5. Derives the label list the same way OpenHands' own dataset loader does (sorted gloss names from
   `splits/asl2000.json`), and checks the resulting list's length matches the classifier's output size.
6. Writes `vendor/sign-models/asl/wlasl-slgcn/{model.json, weights.bin, install-receipt.json}`.

Re-running the same command is safe and idempotent; it will re-verify and overwrite rather than duplicate.

## Installing ISL from scratch (if you deleted it, or are building a fresh pipeline)

```
npm run models:install -- isl
```

No special flag is needed — INCLUDE is CC BY 4.0, which permits this. The steps are the same as above, against
`include_metadata.zip` / `include_slgcn.zip` and the `include-slgcn` checkpoint entry.

## Installing both at once

```
npm run models:install -- all --accept-wlasl-terms
```

## Installing from files you already downloaded (offline / air-gapped installs)

```
npm run models:install -- isl --from ./downloads
npm run models:install -- asl --accept-wlasl-terms --from ./downloads
```

`--from <dir>` looks for the exact filenames named in that language's `manifest.json` (`include_metadata.zip`,
`include_slgcn.zip`, etc.) inside `<dir>` instead of fetching them, but still performs every integrity and shape
check described above — a locally supplied file gets no less scrutiny than a downloaded one.

## Where the installer will and will not write

The installer only ever writes inside `vendor/sign-models/<lang>/<modelDir>/` (the final model files) and
`vendor/sign-models/.downloads/` (a scratch area for the raw downloaded archives, safe to delete afterwards). It
never writes outside `vendor/sign-models/`, never modifies `assets/`, and never needs write access to anything else
in the project.

## Troubleshooting

| Symptom | Likely cause | What to do |
|---|---|---|
| `models:verify` reports a hash mismatch | The weights file was altered, truncated, or checked out through a text-mode Git filter | Re-run `models:install -- <lang>` to replace it |
| Install fails with "archive size/hash does not match the manifest" | A corrupted or partial download, or GitHub served a different asset than expected | Re-run the install; if it persists, compare against the SHA-256 values in `manifest.json` directly |
| Install fails with "tensor shape mismatch" naming a specific layer | The downloaded checkpoint is not the exact release asset this build expects (e.g. a different OpenHands checkpoint version) | Confirm the URL in `manifest.json` is what was actually fetched; do not patch the shape check to accept it — the architecture in `assets/sign-model.js` is written for this exact layout |
| ASL install refuses without `--accept-wlasl-terms` | Working as intended — see "Installing ASL" above | Read the WLASL licence terms and pass the flag only if your use is compatible |
| Browser shows ISL/ASL as "Not installed" even though files are present | A stale cache, or the files are not being served (check your static file server includes `vendor/sign-models/`) | Hard-refresh; confirm the files are reachable at `vendor/sign-models/<lang>/<modelDir>/model.json` over HTTP |
| Network blocked / download fails entirely | Some environments (this build's own development sandbox included) cannot reach arbitrary hosts, only an allowlist | Use `--from <dir>` with files obtained on a machine that can reach GitHub, then copy the downloaded archives over |

## Verifying the installation end to end

```
npm run test:sign-model
```

runs `test-sign-model.js`, which (if models are installed) replays golden PyTorch-computed logits through SANGAM's
JavaScript implementation and checks they match to float32 precision — see `SIGN_LANGUAGE_MODEL_EVALUATION.md`
for the exact numbers this produces and what they do and do not prove. If models are **not** installed, this suite
skips the model-dependent cases gracefully (reported as skipped, never as a false pass) rather than failing.
