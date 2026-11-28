# Translation: configuration and capability matrix

SANGAM never translates in the browser and never invents a translation. A server adapter calls a provider you configure. With no provider configured, the app says "not set up" and offers no Translate button.

## Configure

Set variables on the **server** (`.env`, see `.env.example`). Keys are read only there, sent to the provider in a request header, and never returned to the browser or logged.

| Variable | Meaning |
|---|---|
| `TRANSLATE_PROVIDER` | `libretranslate` or `google` (blank disables) |
| `LIBRETRANSLATE_URL`, `LIBRETRANSLATE_API_KEY` | Your LibreTranslate instance and key if it needs one |
| `GOOGLE_TRANSLATE_API_KEY`, `GOOGLE_TRANSLATE_URL` | Google Cloud Translation v2 |
| `TRANSLATE_TIMEOUT_MS` | Provider timeout |

Check it: `GET /api/capabilities` returns whether translation is configured and the provider's own language list; **What comes next** shows "Configured (provider)". `/api/capabilities` returns no secrets. `POST /api/translate` requires session membership and is rate limited, so it is not an open proxy.

## Capability matrix

"Verified" means a real provider was called with real text and the result was read by a speaker of the language. **None of the cells below is verified**, because no provider key was available in the build.

The app's interface text is **English only**. The language setting (English India/US/UK, Hindi, Odia) chooses the language used for speech recognition, the spoken voice and the translation target. It does not translate the interface.

| Language | Translate via provider | Spoken output (device voice) | Speech recognition (browser) |
|---|---|---|---|
| English | Not verified | Device dependent | Chrome/Edge, online |
| Hindi (`hi-IN`) | Not verified; depends on the provider's own list | Device dependent; the voice picker lists what is installed | Not verified |
| Odia (`or-IN`) | Not verified; depends on the provider's own list | An Odia voice is often missing; the app says so when none is found | Not verified |

Hindi and Odia text can be typed and displayed (the script renders if the device has a font), but nothing here shows they work end to end.

Run `npm run test:features` for adapter behaviour against a **local stand-in service**, which proves request shapes, errors and timeouts, not translation quality.

## To verify Hindi and Odia properly

1. Configure a real provider.
2. Check `/api/capabilities` lists the language.
3. Send 10 everyday sentences each way with a native speaker reviewing, and record failures.
4. Test text-to-speech on the actual devices, and speech recognition with the locale set.
