/*
 * Unit tests for assets/sign-engine.js using SYNTHETIC hand skeletons (generated geometry, not camera frames).
 * These prove the maths of segmentation, matching, rejection and de-duplication. They do NOT prove that real hands
 * seen by a real camera are recognised; see TEST_REPORT.md ("Real camera / real hands").
 */
"use strict";
const E = require("./assets/sign-engine.js");
let pass = 0, fail = 0;
function check(name, ok, extra) { console.log((ok ? "PASS" : "FAIL") + " — " + name + (extra ? "  (" + extra + ")" : "")); ok ? pass++ : fail++; }

// Deterministic pseudo-random so the run is repeatable.
let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const noise = (a) => (rnd() - 0.5) * 2 * a;

// A hand: wrist at (cx,cy); curl[0..4] = 0 (straight) .. 1 (curled) for thumb..pinky; size = wrist-to-knuckle length
function hand(cx, cy, curl, size, tilt) {
  const L = [{ x: cx, y: cy, z: 0 }];
  const base = [-0.55, -0.28, 0, 0.26, 0.5]; // knuckle offsets across the palm
  for (let f = 0; f < 5; f++) {
    let x = cx + base[f] * size * 0.8, y = cy - size * (f === 0 ? 0.6 : 1), ang = (f === 0 ? -0.8 : 0) + (tilt || 0);
    for (let j = 0; j < 4; j++) {
      L.push({ x: x, y: y, z: 0 });
      const seg = size * (f === 0 ? 0.35 : 0.45), bend = curl[f] * 1.4 * (j + 1) * 0.5;
      ang += (j ? bend : 0);
      x += Math.sin(ang) * seg; y -= Math.cos(ang) * seg * (1 - curl[f] * 0.8 * (j / 3));
    }
  }
  // reorder so index 9 is the middle-finger knuckle as in MediaPipe (1-4 thumb, 5-8 index, 9-12 middle ...)
  return { landmarks: L.map((p) => ({ x: p.x + noise(0.002), y: p.y + noise(0.002), z: p.z + noise(0.002) })) };
}
const OPEN = [0, 0, 0, 0, 0], FIST = [0.9, 1, 1, 1, 1], PEACE = [1, 0, 0, 1, 1], POINT = [1, 0, 1, 1, 1], THUMB = [0, 1, 1, 1, 1];

// A sign = a hand shape plus a path over `n` frames at a chosen speed/scale/offset.
function signFrames(shape, path, o) {
  o = o || {}; const n = o.n || 20, size = o.size || 0.12, ox = o.ox || 0, oy = o.oy || 0, frames = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), p = path(t);
    frames.push(E.normalise([hand(0.45 + ox + p[0] * size * 2, 0.6 + oy + p[1] * size * 2, shape, size, p[2] || 0)].concat(o.second ? [hand(0.7 + ox, 0.6 + oy, o.second, size, 0)] : [])));
  }
  return frames;
}
const still = () => [0, 0], right = (t) => [t, 0], up = (t) => [0, -t], circle = (t) => [Math.sin(t * 6.28) * 0.5, Math.cos(t * 6.28) * 0.5 - 0.5];
const SIGNS = {
  hello: { shape: OPEN, path: right }, wait: { shape: FIST, path: up }, peace: { shape: PEACE, path: still },
  point: { shape: POINT, path: circle }, good: { shape: THUMB, path: up }
};

function makeStore() { let d = null; return { load: () => d, save: (x) => { d = JSON.parse(JSON.stringify(x)); } }; }
(async () => {
  /* ---------- normalisation ---------- */
  const a = E.normalise([hand(0.3, 0.5, OPEN, 0.1)]), b = E.normalise([hand(0.6, 0.7, OPEN, 0.2)]);
  let maxd = 0; for (let k = 0; k < 63; k++) maxd = Math.max(maxd, Math.abs(a.shape[0][k] - b.shape[0][k]));
  check("hand shape is the same whatever the hand's size and position in the picture", maxd < 0.15, "max diff " + maxd.toFixed(3));
  check("a frame with no hand is reported as no hand", !E.normalise([]).present[0] && !E.normalise(null).present[1]);
  check("a frame with a malformed hand is ignored", !E.normalise([{ landmarks: [{ x: 0, y: 0, z: 0 }] }]).present[0]);
  const two = E.normalise([hand(0.7, 0.5, OPEN, 0.1), hand(0.2, 0.5, FIST, 0.1)]);
  check("two hands are ordered by position in the image, not by label", two.pos[0][0] < two.pos[1][0]);

  /* ---------- resampling ---------- */
  const f10 = E.toFeatures(signFrames(OPEN, right, { n: 10 })), f40 = E.toFeatures(signFrames(OPEN, right, { n: 40 }));
  check("a sign is resampled to a fixed length whatever its duration", E.resample(f10).length === E.T_STEPS && E.resample(f40).length === E.T_STEPS);

  /* ---------- teaching and matching ---------- */
  const P = new E.PersonalAdapter(makeStore()); await P.load();
  check("with nothing taught the adapter is unavailable and has no vocabulary", !P.isAvailable() && P.getSupportedVocabulary().length === 0);
  check("with nothing taught a sign gets no result instead of a guess", P.classify(signFrames(OPEN, right)).state === "none");
  let threw = false; try { P.addExample("  ", signFrames(OPEN, right)); } catch (e) { threw = true; }
  check("a sign cannot be taught without a name", threw);
  threw = false; try { P.addExample("x", []); } catch (e) { threw = true; }
  check("an empty recording is refused", threw);

  Object.keys(SIGNS).forEach((name) => { for (let i = 0; i < 3; i++) P.addExample(name, signFrames(SIGNS[name].shape, SIGNS[name].path, { n: 16 + i * 4, ox: noise(0.05), oy: noise(0.05), size: 0.1 + rnd() * 0.04 })); });
  check("after teaching, the vocabulary lists exactly the taught signs", JSON.stringify(P.getSupportedVocabulary().sort()) === JSON.stringify(Object.keys(SIGNS).sort()));
  P.addExample("lonely", signFrames(OPEN, up));
  check("a sign with only one example is not used for matching yet", P.getSupportedVocabulary().indexOf("lonely") < 0);
  P.removeLabel("lonely");

  let correct = 0, total = 0, wrong = [];
  Object.keys(SIGNS).forEach((name) => { for (let i = 0; i < 6; i++) {
    const r = P.classify(signFrames(SIGNS[name].shape, SIGNS[name].path, { n: 14 + i * 5, ox: noise(0.1), oy: noise(0.1), size: 0.09 + rnd() * 0.06 }));
    total++; if (r.state === "match" && r.label === name) correct++; else wrong.push(name + "->" + (r.label || r.state));
  } });
  check("new performances of taught signs (other speed, size, position) are recognised", correct / total >= 0.9, correct + "/" + total + (wrong.length ? " wrong: " + wrong.join(",") : ""));

  const r1 = P.classify(signFrames(OPEN, right, { n: 16 }));
  check("a match carries a closeness figure between 0 and 1 and a ranked list", r1.state === "match" && r1.closeness >= 0 && r1.closeness <= 1 && r1.ranked.length >= 2);

  /* ---------- rejection ---------- */
  const alien = signFrames([0.4, 0.2, 0.9, 0.1, 0.6], (t) => [Math.sin(t * 20) * 0.9, Math.cos(t * 13) * 0.9], { n: 18 });
  const ru = P.classify(alien);
  check("a movement that was never taught is not turned into a word", ru.state !== "match", ru.state + (ru.label ? " " + ru.label : ""));
  let guessed = 0; for (let i = 0; i < 20; i++) { const s = [rnd(), rnd(), rnd(), rnd(), rnd()]; const r = P.classify(signFrames(s, (t) => [Math.sin(t * (3 + i)) * 0.8, Math.cos(t * (2 + i)) * 0.8], { n: 16 })); if (r.state === "match") guessed++; }
  check("random hand shapes and movements are rarely accepted as a taught sign", guessed <= 3, guessed + " of 20 accepted");

  // Two signs deliberately almost identical -> ambiguous, not a coin flip.
  const Q = new E.PersonalAdapter(makeStore()); await Q.load();
  for (let i = 0; i < 3; i++) { Q.addExample("A", signFrames(OPEN, still, { n: 15 + i })); Q.addExample("B", signFrames([0.02, 0, 0, 0, 0.02], still, { n: 15 + i })); }
  const amb = Q.classify(signFrames([0.01, 0, 0, 0, 0.01], still, { n: 16 }));
  check("two near-identical taught signs are not guessed between (ambiguous or unknown)", amb.state === "ambiguous" || amb.state === "unknown", amb.state);

  /* ---------- left/right, two hands ---------- */
  const R = new E.PersonalAdapter(makeStore()); await R.load();
  for (let i = 0; i < 3; i++) { R.addExample("both", signFrames(OPEN, right, { n: 16 + i, second: FIST })); R.addExample("one", signFrames(OPEN, right, { n: 16 + i })); }
  check("a two-hand sign is told apart from the same one-hand sign", R.classify(signFrames(OPEN, right, { n: 18, second: FIST })).label === "both" && R.classify(signFrames(OPEN, right, { n: 18 })).label === "one");

  /* ---------- segmenter ---------- */
  const S = new E.Segmenter({ endGapMs: 600, minFrames: 6 });
  const noHand = E.normalise([]); let t = 0, events = [];
  const feed = (frames) => frames.forEach((f) => { const e = S.push(f, t); if (e.event !== "none" && e.event !== "progress") events.push(e); t += 66; });
  feed([noHand, noHand]); feed(signFrames(OPEN, right, { n: 15 })); feed(Array(12).fill(noHand));
  check("one sign between empty frames is one segment", events.length === 2 && events[0].event === "start" && events[1].event === "end" && events[1].frames.length === 15);
  events = []; feed(signFrames(OPEN, right, { n: 5 })); feed(Array(12).fill(noHand));
  check("a flash of a hand too short to be a sign is discarded, not classified", events.some((e) => e.event === "discard") && !events.some((e) => e.event === "end"));
  events = []; const flicker = signFrames(OPEN, right, { n: 20 }); flicker[8] = noHand; flicker[9] = noHand;
  feed(flicker); feed(Array(12).fill(noHand));
  check("losing the hand for a couple of frames does not cut a sign in two", events.filter((e) => e.event === "end").length === 1);
  events = []; const S2 = new E.Segmenter({ endGapMs: 600, minFrames: 6, maxMs: 1000 }); t = 0;
  let truncated = false; signFrames(OPEN, right, { n: 40 }).forEach((f) => { const e = S2.push(f, t); if (e.event === "end" && e.truncated) truncated = true; t += 66; });
  check("a hand held up forever is cut at a maximum length and marked as truncated", truncated);

  /* ---------- stabiliser ---------- */
  const ST = new E.Stabiliser({ repeatMs: 1500 });
  const m = { state: "match", label: "hello", closeness: 0.6 };
  check("a clear match is accepted", ST.decide(m, 0).accept === true);
  check("the same sign again inside 1.5 s is suppressed as a duplicate", ST.decide(m, 800).reason === "duplicate");
  check("the same sign again after the pause is accepted as a deliberate repeat", ST.decide(m, 3000).accept === true);
  check("a different sign straight away is accepted", ST.decide({ state: "match", label: "wait", closeness: 0.7 }, 3100).accept === true);
  check("unknown results are never accepted", ST.decide({ state: "unknown" }, 9000).accept === false);
  check("ambiguous results are never accepted", ST.decide({ state: "ambiguous" }, 9100).accept === false);
  check("a match that is barely inside the limit is rejected as low confidence", ST.decide({ state: "match", label: "x", closeness: 0.05 }, 9200).reason === "low-confidence");

  /* ---------- reference packages ---------- */
  check("a model package without licence, dataset or evaluation is refused", E.TemplateAdapter.validate({ manifest: { id: "x", name: "x", language: "x", vocabulary: ["a"], featureVersion: 1 }, templates: { a: [[]] } }).length >= 3);
  let rejected = false; try { await new E.TemplateAdapter({ manifest: {}, templates: {} }).load(); } catch (e) { rejected = /not valid/.test(e.message); }
  check("loading an invalid package fails with a readable error", rejected);
  const pkg = { manifest: { id: "test", name: "Test package", language: "Synthetic", licence: "n/a", dataset: "synthetic", evaluation: "n/a", vocabulary: ["hello", "wait"], featureVersion: 1 }, templates: {} };
  ["hello", "wait"].forEach((n) => { pkg.templates[n] = []; for (let i = 0; i < 3; i++) pkg.templates[n].push(E.resample(E.toFeatures(signFrames(SIGNS[n].shape, SIGNS[n].path, { n: 16 + i })))); });
  const TA = new E.TemplateAdapter(pkg); await TA.load();
  check("a valid package loads, reports its language and recognises its signs", TA.isAvailable() && TA.getSupportedLanguage() === "Synthetic" && TA.classify(signFrames(OPEN, right, { n: 18 })).label === "hello");

  const badShape = JSON.parse(JSON.stringify(pkg)); badShape.templates.hello[0] = badShape.templates.hello[0].slice(0, 5);
  check("a package whose templates have the wrong shape is refused with the reason", E.TemplateAdapter.validate(badShape).some((e) => /must be a list of sequences/.test(e)));
  const missingWord = JSON.parse(JSON.stringify(pkg)); missingWord.manifest.vocabulary.push("ghost");
  check("a vocabulary word with no templates is refused", E.TemplateAdapter.validate(missingWord).some((e) => /ghost/.test(e)));

  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})();
