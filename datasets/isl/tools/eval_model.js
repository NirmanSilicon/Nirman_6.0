/*
 * Evaluate the ISL word model on REAL INCLUDE videos whose keypoints were extracted by holistic-batch.html.
 *
 *   node datasets/isl/tools/eval_model.js <mode> [--limit N]
 *
 * For every video it reproduces what the live app does: the app's own Segmenter cuts the sign out of the clip, the app's own
 * PretrainedAdapter classifies it (assets/sign-model.js, the code that runs in the browser/worker), and the strictness
 * levels of assets/sign.js decide whether a word would be typed. Reports are written to datasets/isl/reports/.
 *
 * What it measures: (1) accuracy on genuine ISL videos, kept apart for train-split videos (the model SAW these, so this only
 * checks the plumbing and the label mapping) and test-split videos (the official held-out split); (2) how often non-sign
 * movement would be typed as a word, using time-reversed and scrambled copies of the same real hands as negatives.
 * Not measured here: unseen signers on a webcam. Those need a real camera.
 */
"use strict";
const fs = require("fs"), path = require("path");
const PROJ = path.resolve(__dirname, "..", "..", "..");
const M = require(path.join(PROJ, "assets", "sign-model.js"));
const E = require(path.join(PROJ, "assets", "sign-engine.js"));
const mode = process.argv[2]; if (!mode) { console.error("usage: node eval_model.js <mode> [--limit N] [--shard i/n | --summarise]"); process.exit(2); }
const limit = process.argv.includes("--limit") ? +process.argv[process.argv.indexOf("--limit") + 1] : 0;
const shardArg = process.argv.includes("--shard") ? process.argv[process.argv.indexOf("--shard") + 1].split("/").map(Number) : null;   // run n copies in parallel: --shard 0/4 ... 3/4, then --summarise
const summariseOnly = process.argv.includes("--summarise");
const argVal = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const RESAMPLE = argVal("--resample", "nearest");   // nearest = what the app does today | linear = interpolate keypoints up to 25 fps | none = give the model the raw frames
const FAST = process.argv.includes("--fast");        // loose strictness only (one network pass per clip)
const TAG = mode + (RESAMPLE !== "nearest" ? "__" + RESAMPLE : "");   // reports/files for a variant carry its name
const KP = path.join(PROJ, "datasets", "isl", "keypoints", mode), REP = path.join(PROJ, "datasets", "isl", "reports");
const STRICT_ALL = { loose: { views: 1, minP: 0.45, minMargin: 0.15 }, balanced: { views: 2, minP: 0.8, minMargin: 0.4 }, careful: { views: 3, minP: 0.9, minMargin: 0.5 } };  // same numbers as assets/sign.js
const STRICT = FAST ? { loose: STRICT_ALL.loose } : STRICT_ALL;
function linear25(frames) {                          // interpolate to a 25 fps grid; a point missing in either neighbour is copied from the nearer frame (never half-blended with "undetected")
  const t0 = frames[0].t, t1 = frames[frames.length - 1].t, out = []; let j = 0;
  for (let t = t0; t <= t1 + 1e-6; t += 40) {
    while (j + 1 < frames.length - 1 && frames[j + 1].t <= t) j++;
    const A = frames[j], B = frames[Math.min(j + 1, frames.length - 1)], w = B.t > A.t ? Math.min(1, Math.max(0, (t - A.t) / (B.t - A.t))) : 0, p = new Float32Array(150);
    for (let i = 0; i < 150; i += 2) {
      const ok = A.points[i] !== 0 && B.points[i] !== 0;
      if (ok) { p[i] = A.points[i] + (B.points[i] - A.points[i]) * w; p[i + 1] = A.points[i + 1] + (B.points[i + 1] - A.points[i + 1]) * w; }
      else { const N = w < 0.5 ? A : B; p[i] = N.points[i]; p[i + 1] = N.points[i + 1]; }
    }
    out.push({ points: p, t });
  }
  return out;
}
const prep = (fr) => (fr && RESAMPLE === "linear" ? linear25(fr) : fr);

const norm = (s) => String(s).replace(/\s+/g, "");
const hasHand = (p, o) => { for (let i = o; i < o + 42; i++) if (p[i] !== 0) return true; return false; };
function toFrames(v) { return v.frames.map((f) => ({ points: Float32Array.from(f.p), t: f.t })); }

function segmentLikeApp(frames) {                 // the live path: a sign = from a hand appearing until hands have been gone 0.6 s
  const seg = new E.Segmenter(); let best = null, t = 0;
  const feed = (f, present, tt) => { const ev = seg.push({ points: f && f.points, present, t: tt }, tt); if (ev.event === "end" && (!best || ev.frames.length > best.length)) best = ev.frames; };
  frames.forEach((f) => { t = f.t; feed(f, [hasHand(f.points, 66), hasHand(f.points, 108)], f.t); });  // indexes: left hand points 33..53 -> floats 66..107, right 54..74 -> 108..149
  for (let i = 1; i <= 12; i++) feed(null, [false, false], t + i * 100);                                    // the person lowers their hands at the end of the clip
  return best;
}
function reversed(frames) { const T = frames[frames.length - 1].t + frames[0].t; return frames.slice().reverse().map((f) => ({ points: f.points, t: T - f.t })); }
function scrambled(frames, block, seed) {          // cut into short blocks and shuffle them: real hands, no sign
  let s = seed; const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const blocks = []; for (let i = 0; i < frames.length; i += block) blocks.push(frames.slice(i, i + block));
  for (let i = blocks.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [blocks[i], blocks[j]] = [blocks[j], blocks[i]]; }
  const out = []; let t = frames[0].t; const dt = (frames[frames.length - 1].t - frames[0].t) / Math.max(1, frames.length - 1);
  blocks.forEach((b) => b.forEach((f) => { out.push({ points: f.points, t }); t += dt; })); return out;
}

(async () => {
  if (summariseOnly) {
    const parts = fs.readdirSync(REP).filter((f) => f.startsWith("_rows_" + TAG + "_")).map((f) => JSON.parse(fs.readFileSync(path.join(REP, f), "utf8")));
    const rows = [].concat(...parts), spec = JSON.parse(fs.readFileSync(path.join(PROJ, "vendor", "sign-models", "isl", "include-slgcn", "model.json"), "utf8"));
    return summarise(rows, spec.display);
  }
  const dir = path.join(PROJ, "vendor", "sign-models", "isl", "include-slgcn") + path.sep;
  const a = new M.PretrainedAdapter(dir, (u) => Promise.resolve(fs.readFileSync(u.startsWith(dir) ? u : path.join(PROJ, u))), {});
  await a.load();
  a.opts.cameraAspect = 16 / 9;                    // the extracted frames are 1280x720
  if (RESAMPLE !== "nearest") a.spec.preprocessing.targetFps = null;   // the adapter must not resample again (linear25() already did, or "none" was asked for)
  const labelIndex = {}; a.spec.labels.forEach((l, i) => { labelIndex[norm(l)] = i; });
  // cache single network passes: strictness levels re-read the same trimmed clips
  const real = a._probs.bind(a), cache = new Map(), ids = new WeakMap(); let nid = 0;
  const idOf = (o) => { if (!ids.has(o)) ids.set(o, ++nid); return ids.get(o); };
  a._probs = (frames, allowed) => { const k = idOf(frames[0]) + ":" + idOf(frames[frames.length - 1]) + ":" + frames.length; if (!cache.has(k)) cache.set(k, real(frames, allowed)); return cache.get(k); };

  let files = fs.readdirSync(KP).filter((f) => f.endsWith(".json")).sort(); if (limit) files = files.slice(0, limit);
  if (shardArg) files = files.filter((_, i) => i % shardArg[1] === shardArg[0]);
  const rows = [];
  for (const [n, f] of files.entries()) {
    const v = JSON.parse(fs.readFileSync(path.join(KP, f), "utf8")), all = toFrames(v), truth = labelIndex[norm(v.label)];
    if (truth === undefined) { rows.push({ id: v.id, label: v.label, error: "label not in the model's vocabulary" }); continue; }
    const seg = segmentLikeApp(all);
    const variants = { whole_clip: prep(all), app_segment: prep(seg), reversed: prep(seg && reversed(seg)), scrambled: prep(seg && scrambled(seg, 4, 7 + n)) };
    const r = { id: v.id, label: v.label, split: v.split, frames: all.length, seg_frames: seg ? seg.length : 0, truth, variants: {} };
    for (const [name, fr] of Object.entries(variants)) {
      if (!fr || fr.length < M.MIN_CLASSIFY_FRAMES) { r.variants[name] = { error: "too few frames" }; continue; }
      const o = { per: {} };
      for (const [lv, cfg] of Object.entries(STRICT)) {
        Object.assign(a.opts, cfg); const c = a.classify(fr);
        o.per[lv] = { state: c.state, reason: c.reason || null, top: c.ranked && c.ranked[0] ? c.ranked[0].index : null, p: c.ranked && c.ranked[0] ? +c.ranked[0].p.toFixed(3) : null, label: c.label || null };
      }
      o.top1 = o.per.loose.top; o.top1_p = o.per.loose.p; r.variants[name] = o;
    }
    rows.push(r);
    process.stdout.write(`\r${n + 1}/${files.length} ${v.label.padEnd(16)}`);
  }
  console.log("");
  if (shardArg) { fs.mkdirSync(REP, { recursive: true }); fs.writeFileSync(path.join(REP, "_rows_" + TAG + "_" + shardArg[0] + ".json"), JSON.stringify(rows)); return console.log("shard " + shardArg.join("/") + " done: " + rows.length + " videos"); }
  summarise(rows, a.spec.display);
})();

function summarise(rows, display) {
  const pct = (x, n) => (n ? Math.round((1000 * x) / n) / 10 : null);
  const good = rows.filter((r) => !r.error);
  const sum = { mode: TAG, videos: good.length, skipped: rows.length - good.length, by_split: {}, negatives: {}, per_class_test: {}, confusions_test: {} };
  for (const split of ["train", "test", "all"]) {
    const R = good.filter((r) => split === "all" || r.split === split);
    for (const vn of ["whole_clip", "app_segment"]) {
      const V = R.map((r) => r.variants[vn]).filter((o) => o && !o.error), idx = R.filter((r) => r.variants[vn] && !r.variants[vn].error);
      const row = { videos: R.length, usable: V.length, top1_accuracy_pct: pct(idx.filter((r) => r.variants[vn].top1 === r.truth).length, V.length) };
      for (const lv of Object.keys(STRICT)) {
        let ok = 0, wrong = 0, rej = 0;
        idx.forEach((r) => { const p = r.variants[vn].per[lv]; if (p.state === "match") (p.top === r.truth ? ok++ : wrong++); else rej++; });
        row[lv] = { typed_correct_pct: pct(ok, V.length), typed_wrong_pct: pct(wrong, V.length), rejected_pct: pct(rej, V.length), precision_of_typed_pct: pct(ok, ok + wrong) };
      }
      (sum.by_split[split] = sum.by_split[split] || {})[vn] = row;
    }
  }
  for (const vn of ["reversed", "scrambled"]) {
    const V = good.map((r) => r.variants[vn]).filter((o) => o && !o.error), row = { clips: V.length };
    for (const lv of Object.keys(STRICT)) row[lv] = { typed_a_word_pct: pct(V.filter((o) => o.per[lv].state === "match").length, V.length) };
    sum.negatives[vn] = row;
  }
  const test = good.filter((r) => r.split === "test" && r.variants.app_segment && !r.variants.app_segment.error), byC = {};
  test.forEach((r) => { const c = (byC[r.label] = byC[r.label] || { n: 0, ok: 0 }); c.n++; if (r.variants.app_segment.top1 === r.truth) c.ok++; const t = r.variants.app_segment.top1; if (t !== r.truth && t != null) { const k = r.label + " -> " + display[t]; sum.confusions_test[k] = (sum.confusions_test[k] || 0) + 1; } });
  Object.keys(byC).forEach((k) => { sum.per_class_test[k] = byC[k].ok + "/" + byC[k].n; });
  fs.mkdirSync(REP, { recursive: true });
  fs.writeFileSync(path.join(REP, "eval_" + TAG + ".json"), JSON.stringify({ summary: sum, rows }, null, 1));
  console.log(JSON.stringify(sum, null, 1));
}

