# Comparison of the three input ZIPs

A structural comparison of the three archives provided for this phase, each inspected by extraction, not by
description. See `PROJECT_AUDIT_AND_PROBLEM_REGISTER.md` for the problems found and how they were resolved; this
document is about what each ZIP actually is and contains.

| | `SANGAM_Complete_Implementation_v2.zip` ("the foundation") | `SANGAM_Day2_Person3_Updated.zip` ("P3") | `SANGAM_Person4_Environmental_Sound_Alerts.zip` ("P4") |
|---|---|---|---|
| Role | Source of truth. This build is a direct continuation of it. | Standalone feature prototype (haptics) | Standalone feature prototype (sound) |
| Forked from | — | A much earlier, pre-modularisation SANGAM snapshot, per its own README ("CREATIVE UI/UX REVIEW BUILD") | Same earlier snapshot as P3 |
| Total files (excluding generated/vendor noise) | 111+ | 23 | 22 |
| `assets/*.js` modules | 17 separate files (`app.js`, `outputs.js`, `sign.js`, `sign-model.js`, `sound.js`, `sound-engine.js`, `translate.js`, `switch.js`, …) | 1 file: `assets/app.js`, 418 lines | 1 file: `assets/app.js`, 438 lines |
| Backend | Full Node/Express + WebSocket server (`server/`), sessions, tokens, volunteer workflow, rate limiting, origin checks | None — static site only | None — static site only |
| Sign-language recognition | Personal hand-taught DTW recogniser (pre-existing) **plus, as of this phase, real pretrained ISL/ASL SL-GCN models** | None | None |
| Sound/environmental alerts | Real YAMNet (Google, Apache-2.0) 521-class audio classifier, pre-existing | None | RMS loudness-only threshold detector (no classification), its own author's words: "deliberately not described as an alarm/siren/knock/bark classifier" |
| Haptics | Ten semantic vibration patterns (pre-existing) | Four patterns (Yes/No/Help/Emergency), a different rhythm design, with low/medium/high timing-scale presets | None |
| Translation, Braille, deafblind, switch-scanning, emergency comms | Present, pre-existing | Not present | Not present |
| Own stated verification | 736+ automated/browser checks across multiple categories (per `TEST_REPORT.md` baseline) | `node --check` (syntax) only, per its own notes | `node --check` (syntax) and static serving only; own notes state Chromium automation "did not complete in the execution environment" |
| Size on disk | Full project (hundreds of MB with `node_modules`/`vendor`) | ~12 MB | ~12 MB |

## Why P3 and P4 could not be merged as whole codebases

Both P3 and P4 are built on a **different, earlier architecture** of SANGAM than the foundation ZIP — a single
~420-line `app.js` with no backend, versus the foundation's 17-module, backend-equipped, test-covered current
state. Diffing or three-way-merging their full trees against the foundation would mean reconciling two incompatible
generations of the same project, and would risk silently reintroducing the earlier, less complete UI/architecture
over the foundation's more advanced one — the one outcome the master specification explicitly forbids ("never
downgrade the main project"). Instead, each ZIP's **specific contributed idea** was identified, evaluated on its own
merits, and reimplemented against the foundation's current architecture:

- From P3: the four Yes/No/Help/Emergency vibration **pattern definitions and their rationale** — not its file
  structure, not its UI code, not its single-file `app.js`.
- From P4: the **concept** of a loudness-based fallback for sounds a classifier does not recognise — not its
  implementation (plain RMS threshold with no classifier at all), which would have been a strict downgrade from the
  foundation's existing real YAMNet classification if used as a replacement rather than a supplement.

## What was actually merged, concretely

### Haptic preset merge (from P3)

`assets/outputs.js` now defines both pattern sets side by side:

```
PATTERNS           // the foundation's own 10 semantic patterns (unchanged, still the default)
DAY2_PATTERNS       // P3's 4 patterns, copied verbatim:
                    //   yes:       [90, 70, 90]
                    //   no:        [260, 100, 260]
                    //   help:      [100, 80, 100, 80, 320]
                    //   emergency: [180, 90, 180, 90, 180, 350, 500, 120, 500]
PRESETS = { sangam: PATTERNS, day2: DAY2_PATTERNS }
```

A new profile field, `hapPreset`, selects between them (default: `sangam`, so no existing user's experience changes
unless they explicitly switch). The foundation's own ten-pattern set is never replaced or discarded — both coexist,
selectable from the haptics settings screen. P3's three timing-scale levels (its own low/0.7x, medium/1.0x,
high/1.35x idea) were not separately ported because the foundation already has an equivalent, more thoroughly
tested intensity/timing system; duplicating a second, parallel scaling mechanism would have added inconsistency
without adding capability. This is a deliberate scope decision, stated here rather than left silent.

### Sound loudness-fallback merge (from P4)

`assets/sound-engine.js` adds a `LOUD_CATEGORY` pseudo-category ("Loud sound (not identified)"), **off by default**,
architecturally prevented from ever firing in the same window as, or while, a real YAMNet-classified category is
active (`anyClassifiedActiveOrNow` gate in `Detector.prototype.push`). It is driven by the same RMS loudness
computation P4 used, but:

- it can **never** be mistaken for a real classification — every surface (banner, history, spoken alert, dispatched
  event) labels it "not identified" / "loudness only," distinctly from a real classified alert's wording
- it is **off by default** — turning it on is an explicit opt-in, not a silent behaviour change for existing users
- it is strictly a **fallback for what the real classifier misses**, never a replacement for it — the foundation's
  521-class YAMNet classification remains the primary and default detection path, completely unchanged

This directly honours P4's one real insight (a loudness floor can catch a genuinely novel noise no classifier was
trained on) while explicitly rejecting the one thing that would have been a downgrade (using loudness as the
*only* detection mechanism, which P4's own implementation notes already acknowledged as a limitation).

## Verification that nothing was downgraded

`npm run test:all` was run on the foundation before this phase's changes began (as its own baseline — see
`TEST_REPORT.md`'s prior "Clean-extract run" section) and again after every change in this phase, most recently from
a clean extraction of the final ZIP as it actually ships at **812 passed, 0 failed** (821 with the optional,
download-on-request ASL model also installed) across all twelve suites, including every one of the foundation's
original features.
`test-sign-browser.js` and `test-access-browser.js` specifically re-assert that every pre-existing capability (the
ten original haptic patterns, the YAMNet classifier, the DTW personal-sign recogniser, translation, Braille,
deafblind options, switch scanning, the backend) is still present and unchanged, alongside the newly merged
features.
