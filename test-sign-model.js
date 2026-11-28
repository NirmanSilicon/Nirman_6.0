/*
 * Tests for assets/sign-model.js and the installed pretrained ISL/ASL models.
 *
 * Category D (real model inference) per TEST_REPORT.md's taxonomy: this file runs the ACTUAL released SL-GCN
 * weights (not a mock, not a stub) through SANGAM's pure-JavaScript forward pass and checks the output against
 * test-support/sign-model-golden/*.json — logits computed by loading the same checkpoints in real PyTorch with
 * AI4Bharat OpenHands' own network definitions (see scripts in the project history / docs/MODEL_INSTALLATION_GUIDE.md
 * for how the fixtures were produced). This proves SANGAM's JavaScript port is numerically faithful to the
 * published model. It does NOT prove real-camera accuracy with real signers: no labelled real-world test videos
 * were available in this environment (see docs/SIGN_LANGUAGE_MODEL_EVALUATION.md, which reports this plainly).
 *
 * If the models have not been installed (`npm run models:install`), the model-dependent tests are SKIPPED, not
 * failed, and are reported as such at the end — the suite does not fabricate a pass.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const M = require("./assets/sign-model.js");
const INSTALL = require("./scripts/sign-models/install.js");

let pass = 0, fail = 0, skip = 0;
function check(name, ok, extra) { console.log((ok ? "PASS" : "FAIL") + " — " + name + (extra ? "  (" + extra + ")" : "")); ok ? pass++ : fail++; }
function skipped(name, reason) { console.log("SKIP — " + name + "  (" + reason + ")"); skip++; }

const MODELS_DIR = path.join(__dirname, "vendor", "sign-models");
const GOLDEN_DIR = path.join(__dirname, "test-support", "sign-model-golden");

function loadInstalled(lang, modelDir) {
  const dir = path.join(MODELS_DIR, lang, modelDir);
  const specPath = path.join(dir, "model.json"), wPath = path.join(dir, "weights.bin");
  if (!fs.existsSync(specPath) || !fs.existsSync(wPath)) return null;
  const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
  const b = fs.readFileSync(wPath);
  const weights = new Float32Array(b.buffer, b.byteOffset, b.length / 4);
  return { spec, net: new M.SLGCN(spec, weights) };
}

/* ------------------------------------------------------------------------ preprocessing maths (no model needed) */

(function preprocessingUnitTests() {
  // A single frame with both shoulders detected 0.2 apart: scale should be 1/0.2 = 5, shoulders end up symmetric.
  // MediaPipe Holistic body landmarks 11 and 12 (left/right shoulder) land at selected-array positions 3 and 4
  // (MINIMAL_27[3]===11, MINIMAL_27[4]===12) — CenterAndScaleNormalize's SHOULDERS=[3,4] indexes the SELECTED
  // 27-point array, not the raw 75-point one, so the raw frame must set raw points 11 and 12, not 3 and 4.
  const V27 = 27, frame = new Float32Array(150);
  frame[11 * 2] = 0.4; frame[11 * 2 + 1] = 0.5; // raw point 11 = left shoulder
  frame[12 * 2] = 0.6; frame[12 * 2 + 1] = 0.5; // raw point 12 = right shoulder
  const pre = M.preprocess([frame]);
  check("preprocess centres the shoulder midpoint to (0,0) on the X axis", Math.abs(pre.data[3] + pre.data[4]) < 1e-5, "x3+x4=" + (pre.data[3] + pre.data[4]));
  check("preprocess scales shoulder distance to 1", Math.abs(Math.abs(pre.data[3] - pre.data[4]) - 1) < 1e-4, "|x3-x4|=" + Math.abs(pre.data[3] - pre.data[4]));

  const zeroFrame = new Float32Array(150); // no shoulders detected at all -> scale is infinite -> "do not normalise"
  const pre2 = M.preprocess([zeroFrame]);
  check("preprocess reports not-normalised when the reference points are never seen", pre2.normalised === false);

  const resampled = M.resampleToFps([new Float32Array(150), new Float32Array(150), new Float32Array(150)], [0, 100, 200], 10);
  check("resampleToFps produces a frame for each 100ms step at 10fps", resampled.length === 3, "got " + resampled.length);

  const wide = new Float32Array(150); wide[0] = 0.5; wide[1] = 0.5;
  const corrected = M.correctAspect(wide, 4 / 3, 16 / 9);
  check("correctAspect rescales only x, leaves y, and leaves an undetected point at (0,0)", Math.abs(corrected[1] - 0.5) < 1e-9 && corrected[0] !== 0.5);
})();

/* ------------------------------------------------------------------------ decide() acceptance logic */

(function decideUnitTests() {
  check("decide() rejects empty rankings", M.decide([]).state === "none");
  check("decide() rejects a low top score", M.decide([{ p: 0.3 }, { p: 0.1 }]).state === "unknown");
  check("decide() rejects a close second place as ambiguous", M.decide([{ p: 0.5 }, { p: 0.48 }]).state === "ambiguous");
  check("decide() accepts a confident, clear winner", M.decide([{ p: 0.9 }, { p: 0.05 }]).state === "match");
})();

/* ------------------------------------------------------------------------ installer helper functions */

(function installerUnitTests() {
  const rows = INSTALL.parseCsv('Category,Word,Video,FilePath\nAdjectives,"4. sad",MVI_9568.MOV,"Adjectives/4. sad/MVI_9568.MOV"\n');
  check("installer CSV parser handles quoted commas/fields", rows.length === 2 && rows[1][1] === "4. sad", JSON.stringify(rows));
  check("installer pySort matches Python str sort for these labels", JSON.stringify(INSTALL.pySort(["10.Energy", "1.Dog", "2.quiet"])) === JSON.stringify(["1.Dog", "10.Energy", "2.quiet"]));
  check("installer display() strips the leading serial number", INSTALL.display("48. Hello") === "Hello");
  check("installer display() adds a space before a run-on parenthesis", INSTALL.display("46.you(plural)") === "you (plural)");
  const shapes = INSTALL.expectedShapes(263);
  check("installer's expected tensor map includes every encoder layer", INSTALL.LAYERS.every((L) => shapes["model.encoder." + L.name + ".tcn1.conv.weight"]));
  check("installer's expected tensor map sizes the classifier to the given class count", JSON.stringify(shapes["model.decoder.classifier.weight"]) === "[263,256]");
})();

/* ------------------------------------------------------------------------ real model inference (category D) */

function runGoldenSuite(lang, modelDir, goldenFile) {
  const label = lang.toUpperCase() + " (" + modelDir + ")";
  const installed = loadInstalled(lang, modelDir);
  if (!installed) { skipped(label + ": real-model parity against PyTorch", "model not installed — run: node scripts/sign-models/install.js " + lang + (lang === "asl" ? " --accept-wlasl-terms" : "")); return; }
  const goldenPath = path.join(GOLDEN_DIR, goldenFile);
  if (!fs.existsSync(goldenPath)) { skipped(label + ": real-model parity against PyTorch", "golden fixture missing: " + goldenFile); return; }
  const golden = JSON.parse(fs.readFileSync(goldenPath, "utf8"));
  check(label + ": installed classifier size matches the golden fixture's class count", installed.spec.numClass === golden.num_class, installed.spec.numClass + " vs " + golden.num_class);

  let maxDiff = 0, top1Matches = 0;
  for (const c of golden.cases) {
    const logits = installed.net.forward(Float32Array.from(c.pre_CTV), c.T);
    let d = 0, am = 0, ag = 0;
    for (let i = 0; i < logits.length; i++) {
      d = Math.max(d, Math.abs(logits[i] - c.logits[i]));
      if (logits[i] > logits[am]) am = i;
      if (c.logits[i] > c.logits[ag]) ag = i;
    }
    maxDiff = Math.max(maxDiff, d);
    if (am === ag) top1Matches++;
  }
  check(label + ": JS forward pass matches real PyTorch logits to float32 rounding (<1e-3) across " + golden.cases.length + " clip lengths", maxDiff < 1e-3, "max abs diff=" + maxDiff.toExponential(2));
  check(label + ": JS forward pass picks the same top-1 class as PyTorch on every golden case", top1Matches === golden.cases.length, top1Matches + "/" + golden.cases.length);

  // End-to-end: raw 75-point frames -> preprocess -> model, compared against the fixture's own preprocessing output.
  const c0 = golden.cases[golden.cases.length - 1];
  const frames = [];
  for (let t = 0; t < c0.T; t++) {
    const f = new Float32Array(150);
    for (let v = 0; v < 75; v++) { f[v * 2] = c0.raw_TVC[(t * 75 + v) * 3]; f[v * 2 + 1] = c0.raw_TVC[(t * 75 + v) * 3 + 1]; }
    frames.push(f);
  }
  const pre = M.preprocess(frames);
  let preDiff = 0; for (let i = 0; i < pre.data.length; i++) preDiff = Math.max(preDiff, Math.abs(pre.data[i] - c0.pre_CTV[i]));
  check(label + ": SANGAM's own PoseSelect+CenterAndScaleNormalize matches OpenHands' on raw landmarks", preDiff < 1e-4, "max abs diff=" + preDiff.toExponential(2));
}

runGoldenSuite("isl", "include-slgcn", "isl-include-slgcn.json");
runGoldenSuite("asl", "wlasl-slgcn", "asl-wlasl-slgcn.json");

/* ------------------------------------------------------------------------ PretrainedAdapter contract, via a local-file fetch shim */

function fileFetch(baseDir) {
  return function (url) {
    const rel = url.replace(/^.*vendor\/sign-models\//, "");
    const p = path.join(MODELS_DIR, rel);
    return new Promise((resolve, reject) => {
      fs.readFile(p, (err, buf) => {
        if (err) return resolve({ ok: false, status: 404 });
        resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(buf.toString("utf8"))), arrayBuffer: () => Promise.resolve(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length)) });
      });
    });
  };
}

async function adapterContractTests() {
  for (const [lang, modelDir] of [["isl", "include-slgcn"], ["asl", "wlasl-slgcn"]]) {
    const label = lang.toUpperCase() + " PretrainedAdapter";
    if (!fs.existsSync(path.join(MODELS_DIR, lang, modelDir, "model.json"))) { skipped(label + " contract", "model not installed"); continue; }
    const a = new M.PretrainedAdapter("vendor/sign-models/" + lang + "/" + modelDir + "/", fileFetch(), {});
    try {
      await a.load();
      check(label + ".isAvailable() after load()", a.isAvailable() === true);
      check(label + ".getSupportedLanguage() names the language and says it is unverified by SANGAM", a.getSupportedLanguage().indexOf("SANGAM") >= 0);
      const vocab = a.getSupportedVocabulary();
      check(label + ".getSupportedVocabulary() returns the installed word list, excluded labels left out", vocab.length === a.spec.numClass - a.spec.excluded.length, vocab.length + " vs " + (a.spec.numClass - a.spec.excluded.length));

      const zeroFrames = Array.from({ length: 20 }, (_, i) => ({ points: new Float32Array(150), t: i * 40 }));
      const r0 = a.classify(zeroFrames);
      check(label + ".classify() refuses to guess when no body/hands were ever seen", r0.state === "unknown" && r0.reason === "no-reference-points");

      const tooShort = [{ points: new Float32Array(150), t: 0 }];
      const r1 = a.classify(tooShort);
      check(label + ".classify() refuses a single frame rather than inventing a prediction", r1.state === "none");

      // Regression test: classify() must never return "match"/"ambiguous" from a degenerate, too-short sequence,
      // even with real detected (non-zero) landmarks and even if the model itself is confident. Found via a real
      // end-to-end test (test-sign-video.js) feeding non-human test-pattern video through the real pipeline: a
      // 2-frame sequence with real (if spurious) detected points produced a high-confidence "match" before this fix.
      const fewRealFrames = Array.from({ length: M.MIN_CLASSIFY_FRAMES - 1 }, (_, t) => {
        const f = new Float32Array(150);
        f[11 * 2] = 0.40; f[11 * 2 + 1] = 0.30; f[12 * 2] = 0.62; f[12 * 2 + 1] = 0.31; // real, non-zero shoulder points
        return { points: f, t: t * 40 };
      });
      const rFew = a.classify(fewRealFrames);
      check(label + ".classify() refuses a too-short sequence (" + fewRealFrames.length + " frames, below MIN_CLASSIFY_FRAMES=" + M.MIN_CLASSIFY_FRAMES + ") even with real, non-zero, high-confidence-eligible landmarks",
        rFew.state === "unknown" && rFew.reason === "too-few-frames", JSON.stringify(rFew));

      // Regression test for the camera aspect-ratio dead-code bug: classify() must actually call correctAspect()
      // (rescale x before shoulder-normalisation) when opts.cameraAspect is set, not just accept the option silently.
      // Build a non-degenerate moving clip: pose point 11 and 12 (the shoulders, MINIMAL_27 slots 3 and 4) get
      // distinct, slowly drifting (x, y) so CenterAndScaleNormalize has a real, non-zero shoulder distance.
      const movingFrames = Array.from({ length: 20 }, (_, t) => {
        const f = new Float32Array(150);
        f[11 * 2] = 0.40 + 0.004 * t; f[11 * 2 + 1] = 0.30; // left shoulder
        f[12 * 2] = 0.62 - 0.004 * t; f[12 * 2 + 1] = 0.31; // right shoulder
        f[13 * 2] = 0.38; f[13 * 2 + 1] = 0.55; // an elbow, so more than one joint moves
        f[33 * 2] = 0.45 + 0.01 * t; f[33 * 2 + 1] = 0.60; // a left-hand point
        return { points: f, t: t * 40 };
      });
      const refAspect = a.spec.preprocessing.referenceAspect;
      a.opts.cameraAspect = null;
      const baseline = a.classify(movingFrames);
      a.opts.cameraAspect = (refAspect || 1) * 1.6; // meaningfully different from the reference (or from 1, if there is none)
      const corrected = a.classify(movingFrames);
      a.opts.cameraAspect = null; // leave the adapter as we found it for any later test
      if (refAspect) {
        check(label + ".classify() actually applies camera-aspect correction when opts.cameraAspect is set (not dead code)",
          JSON.stringify(baseline.ranked) !== JSON.stringify(corrected.ranked), "baseline=" + JSON.stringify(baseline.ranked) + " corrected=" + JSON.stringify(corrected.ranked));
      } else {
        // Known, documented gap: the WLASL/ASL manifest has no referenceAspect (WLASL's source videos have no
        // single canonical resolution, unlike INCLUDE's uniform lab recordings), so classify()'s own guard
        // (`this.spec.preprocessing.referenceAspect`) correctly keeps aspect correction a no-op for ASL even
        // after this fix. This asserts that documented gap stays true rather than silently changing.
        check(label + ": no referenceAspect in the manifest, so aspect correction is correctly still a no-op for this model (documented gap, see SIGN_LANGUAGE_MODEL_EVALUATION.md)",
          JSON.stringify(baseline.ranked) === JSON.stringify(corrected.ranked));
      }

      // Multi-view agreement (opts.views): the network has no "not a sign" answer, so a word is only accepted when every
      // trimmed view of the clip names the same word. These are invariants that must hold whatever the model says.
      let calls = 0; const realProbs = a._probs; a._probs = function () { calls++; return realProbs.apply(this, arguments); };
      const single = a.classify(movingFrames), singleExplicit = (a.opts.views = 1, a.classify(movingFrames));
      check(label + ": views=1 (the default) is exactly the original single pass", JSON.stringify(single.ranked) === JSON.stringify(singleExplicit.ranked));
      calls = 0; a.opts.views = 3; a.opts.minP = 2; a.classify(movingFrames);           // a bar nothing can reach
      check(label + ": views=3 stops after the first pass when that pass is nowhere near the confidence bar (rejections stay fast)", calls === 1, "passes=" + calls);
      calls = 0; a.opts.minP = 1e-4; a.opts.minMargin = 0; const three = a.classify(movingFrames);
      check(label + ": views=3 runs the extra trimmed passes when the first pass is close to the bar", calls >= 2 && calls <= 3, "passes=" + calls);
      check(label + ": views=3 never accepts a word the single pass did not name first", three.state !== "match" || three.label === single.ranked[0].label, three.state + " " + (three.label || ""));
      check(label + ": views=3 reports disagreement between views as 'unstable', not a word", three.state !== "unknown" || three.reason !== "unstable" || (three.ranked.length > 0 && three.label === undefined));
      calls = 0; a.opts.views = 2; a.opts.minP = 1e-4; a.classify(movingFrames);
      check(label + ": views=2 reads the clip twice (whole clip + its middle)", calls >= 1 && calls <= 2, "passes=" + calls);
      a.opts.views = 3; const rz = a.classify(zeroFrames), rt = a.classify(fewRealFrames);
      check(label + ": views=3 still refuses a clip with no body/hands, and a too-short clip", rz.reason === "no-reference-points" && rt.reason === "too-few-frames");
      a._probs = realProbs; delete a.opts.views; delete a.opts.minP; delete a.opts.minMargin;
    } catch (e) {
      check(label + " contract", false, e.message);
    }
  }
}

adapterContractTests().then(() => {
  console.log("\n" + pass + " passed, " + fail + " failed, " + skip + " skipped.");
  if (skip) console.log("(Skips mean the pretrained models are not installed in this checkout — run `node scripts/sign-models/install.js all --accept-wlasl-terms` — not that anything failed.)");
  process.exit(fail ? 1 : 0);
});
