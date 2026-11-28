# MediaPipe Tasks Audio runtime (vendored)

Files: `audio_bundle.mjs` and `wasm/audio_wasm_internal.{js,wasm}`, copied unmodified from npm package
`@mediapipe/tasks-audio@1.2.3` (<https://www.npmjs.com/package/@mediapipe/tasks-audio>), licence **Apache-2.0** (declared in its `package.json`; the npm tarball ships no separate LICENSE file, so the standard text is at `../../LICENSE-APACHE-2.0.txt`).

It runs YAMNet in WebAssembly inside the browser. Nothing is uploaded.

| File | SHA-256 |
|---|---|
| `audio_bundle.mjs` | `9e3f838a477175c59d663fe653bae550832298f1f7abfa291704ba50c70be070` |
| `wasm/audio_wasm_internal.js` | `83e4a02371651c113e44a419ae556aad8e33391b518b67de8ab15147bb7a4796` |
| `wasm/audio_wasm_internal.wasm` | `3194915521c8c49004e6b7bd2bf3f5860905e9dd99f55a3ec9869c2478edb7c9` |

## Telemetry note

The bundle contains code that can post usage statistics to `https://odml.pa.googleapis.com/v1/log`. In testing (`test-sound-browser.js`) **no request left this machine** while the model loaded or while audio was analysed, and the server's Content-Security-Policy (`connect-src 'self' ws: wss: data: blob:`) would block such a request anyway. Do not loosen `connect-src` without re-checking this.

The `audio_wasm_module_internal.*` variant from the same package was left out (it is only used inside module workers).
