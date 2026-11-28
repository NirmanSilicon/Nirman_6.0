# YAMNet sound-classification model (vendored)

Used by **Sound alerts**. Everything here is served from this site. Nothing is fetched from a CDN at run time.

| File | What it is | SHA-256 |
|---|---|---|
| `yamnet.tflite` | YAMNet, float32, TensorFlow Lite. Input: 15600 samples (0.975 s of 16 kHz mono audio). Output: 521 class scores | `10c95ea3eb9a7bb4cb8bddf6feb023250381008177ac162ce169694d05c317de` |
| `yamnet_class_map.csv` | The 521 AudioSet class names, in model output order | `cdf24d193e196d9e95912a2667051ae203e92a2ba09449218ccb40ef787c6df2` |

## Where it came from, honestly

* **The model is Google's YAMNet** (Manoj Plakal and Dan Ellis, Google), released under **Apache-2.0**. Source code: <https://github.com/tensorflow/models/tree/master/research/audioset/yamnet>. Google lists the TensorFlow Lite build for MediaPipe at
  `https://storage.googleapis.com/mediapipe-models/audio_classifier/yamnet/float32/latest/yamnet.tflite`
  (see <https://developers.google.com/edge/mediapipe/solutions/audio/audio_classifier/web_js>).
* **This copy did NOT come from that Google URL.** The build environment could not reach `storage.googleapis.com` (the network allow-list blocked it). The two files were taken from the npm package `@apocaliss92/scrypted-yamnet@0.0.3` (<https://github.com/apocaliss92/scrypted-yamnet>), which bundles them for a home-automation plugin. That is a third-party repackaging, so its provenance cannot be proven from this machine.
* **What was done instead of trusting it:** the file was tested rather than assumed. See `docs/SOUND_ALERTS.md`, "Verifying the model". In short: it loads in two independent runtimes (LiteRT in Python and MediaPipe in Chromium) with matching scores (0.80 for the same beep); its input and output shapes match Google's documentation (1 x 15600 in, 521 out); the labels stored in the model agree with the CSV for all 521 classes; and it behaves like YAMNet on controls (digital silence reads as *Silence*, white noise as *Static/Noise*, a pulsed 3.1 kHz beep as *Smoke detector, smoke alarm*).
* **That does not prove the bytes equal Google's.** To remove the doubt, replace `yamnet.tflite` with the official file and re-run `npm run test:sound-browser`:

  ```
  curl -L -o vendor/yamnet/yamnet.tflite \
    https://storage.googleapis.com/mediapipe-models/audio_classifier/yamnet/float32/latest/yamnet.tflite
  sha256sum vendor/yamnet/yamnet.tflite
  ```
  If the hash differs from the table above, the official file wins. The tests will tell you if anything about the behaviour changed.

## Licences

* YAMNet model and code: Apache-2.0 (see `../LICENSE-APACHE-2.0.txt`).
* Class names come from the AudioSet ontology, which Google publishes under **CC BY-SA 4.0** (<https://github.com/audioset/ontology>). Attribution: "AudioSet ontology, Google Inc., CC BY-SA 4.0".
* The model was trained on AudioSet (YouTube audio). Google's model card warns that its scores are **not calibrated across classes** and that YouTube training audio may not match your task.

## Known limits that matter for this app

* 521 classes, scored independently (a sound can be two things at once).
* Not tested here on real recordings of fire alarms, doorbells or vehicle horns (none were available offline). Only synthetic tones were used.
