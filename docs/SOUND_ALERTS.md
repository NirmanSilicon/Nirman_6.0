# Sound alerts

Listens through the microphone and alerts you, visually (and optionally by flash, vibration or speech), when it hears an alarm, siren, doorbell or horn. It is a **supplement, not a safety system**. Do not rely on it for fire, medical or security protection.

## How it works

1. You press **Start listening**. The microphone never starts on its own and you can stop at any time. A tab-wide indicator shows when it is on.
2. Audio is processed **on this device**. Nothing is recorded, stored or uploaded.
3. Audio is reduced to 16 kHz mono, cut into 0.975 s windows (50% overlap) and given to **YAMNet**, a Google audio classifier (521 AudioSet classes), running in the browser through MediaPipe Tasks Audio (WebAssembly).
4. Selected classes are grouped into categories: **fire or smoke alarm, alarm, siren, doorbell, vehicle horn** (on by default); **knock, baby crying, glass breaking** (available, off by default).
5. An alert fires once when a sound starts, not repeatedly while it continues. A 4 s cooldown and a short release time stop repeat alerts for continuous sounds.
6. The alert shows what was heard, the confidence, and the time, and goes into a history (the last 50, kept in memory only). Optional: screen flash, vibration (where the device has it) and spoken alert (off by default).

## Honest limits

* **Sensitivity is a score threshold** on YAMNet's raw output: Low 0.55, Medium 0.35, High 0.25. These are *not calibrated probabilities*. Google's model card says scores are not comparable across classes. Expect misses and false alarms.
* **Not tested on real recordings** of fire alarms, doorbells, sirens or horns (none were available offline). It was tested with **synthetic tones** only: a smoke-alarm-style beep is detected, while silence and white noise are not alerted.
* It can't tell *whose* doorbell or what is on fire. It names the sound class only.
* A noisy room, music, TV and speech can mask or mimic sounds. Loud nearby sounds can trigger several categories.
* Browsers on phones may stop the microphone when the screen is off or the tab is hidden. The page checks the microphone every 2 s and tells you if it has stopped rather than pretending to listen.
* Echo cancellation, noise suppression and automatic gain are turned **off** for this microphone on purpose (they distort the sounds being looked for).

## Verifying the model

The app checks the model itself at load and **refuses to listen** if it fails: it must have 521 outputs and the label file must match the model's own labels and the categories' class numbers by index **and** name.

Tests (`npm run test:sound-browser`, 89 checks) load the real model in Chromium with zero external requests, feed it synthetic audio, and check detection, silence, noise, cooldown, hysteresis, mic lifecycle, error states, preferences and layout.

Provenance caveat: `vendor/yamnet/yamnet.tflite` came from a third-party npm repack because Google's storage host was blocked in the build environment. It behaves like YAMNet (same scores in two runtimes, shapes and labels match), but its bytes are not proven identical to Google's. To replace it with the official file:

```
curl -L -o vendor/yamnet/yamnet.tflite \
  https://storage.googleapis.com/mediapipe-models/audio_classifier/yamnet/float32/latest/yamnet.tflite
sha256sum vendor/yamnet/yamnet.tflite     # compare with vendor/yamnet/README.md
npm run test:sound-browser
```

## Licences and sources

YAMNet: Apache-2.0 (<https://github.com/tensorflow/models/tree/master/research/audioset/yamnet>). MediaPipe Tasks Audio: Apache-2.0 (<https://developers.google.com/edge/mediapipe/solutions/audio/audio_classifier/web_js>). AudioSet ontology class names: CC BY-SA 4.0 (<https://github.com/audioset/ontology>). See `vendor/yamnet/README.md`.

## Using alerts with other outputs

Alerts go to the **same outputs you chose** in your profile: a Braille display adapter receives a short line (when connected), and haptic patterns use the ALERT pattern if enabled. Alerts also dispatch a `sangam:sound-alert` browser event.
