/*
 * SANGAM sign engine: everything between "landmarks from a camera" and "a word in the transcript".
 * No camera, no DOM and no network in this file, so it can be unit-tested in Node and reused by any extractor.
 *
 * What it is:
 *   - normalise()      turns one frame of hand landmarks into a size- and position-independent feature vector
 *   - Segmenter        decides when one sign starts and ends (hands appear, move, leave)
 *   - resample(), dtw  make sequences of different length and speed comparable
 *   - PersonalAdapter  classifies a segment against signs the USER has recorded on this device
 *   - TemplateAdapter  the same classifier loaded from a signed-off model package (e.g. a future ISL package)
 *   - Stabiliser       stops the same sign being added twice and keeps unknown/ambiguous results out
 *
 * What it is not: a sign-language translator. It matches hand shape and movement against stored examples of
 * single signs. It sees no face, no body posture and no grammar. See docs/SIGN_LANGUAGE_CAMERA.md.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SangamSignEngine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var T_STEPS = 24;            // every sign is resampled to this many time steps
  var SLOT_DIM = 21 * 3 + 2;   // per hand: 21 landmarks x (x,y,z) shape + 2 trajectory numbers
  var FRAME_DIM = SLOT_DIM * 2 + 2; // two hand slots + a presence flag each
  var FEATURE_VERSION = 1;

  /* ------------------------------------------------------------------ normalise */

  function dist2(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }

  /**
   * hands: [{ landmarks: [{x,y,z} x 21] }]  (image coordinates, 0..1).
   * Hands are placed in slots by horizontal position (leftmost in the image first), not by the Left/Right label,
   * because that label is easy to get backwards on an un-mirrored camera image. One hand always uses slot 0.
   * Returns { present:[bool,bool], shape:[Float32Array(63)|null, ...], pos:[[x,y]|null, ...], scale:[n|null, ...] }.
   */
  function normalise(hands) {
    var list = (hands || []).filter(function (h) { return h && h.landmarks && h.landmarks.length === 21; }).slice(0, 2);
    list.sort(function (a, b) { return a.landmarks[0].x - b.landmarks[0].x; });
    var out = { present: [false, false], shape: [null, null], pos: [null, null], scale: [null, null] };
    list.forEach(function (h, i) {
      var L = h.landmarks, w = L[0];
      var scale = dist2(L[0], L[9]) || 1e-6; // wrist to middle-finger knuckle: a stable measure of hand size
      var v = new Float32Array(63);
      for (var k = 0; k < 21; k++) {
        v[k * 3] = (L[k].x - w.x) / scale;
        v[k * 3 + 1] = (L[k].y - w.y) / scale;
        v[k * 3 + 2] = ((L[k].z || 0) - (w.z || 0)) / scale;
      }
      out.present[i] = true; out.shape[i] = v; out.pos[i] = [w.x, w.y]; out.scale[i] = scale;
    });
    return out;
  }

  /** A sequence of normalised frames -> array of Float32Array(FRAME_DIM), position made relative to the sign itself. */
  function toFeatures(frames) {
    var n = frames.length, i, s;
    var meanPos = [[0, 0, 0], [0, 0, 0]], meanScale = [0, 0];
    for (i = 0; i < n; i++) for (s = 0; s < 2; s++) if (frames[i].present[s]) {
      meanPos[s][0] += frames[i].pos[s][0]; meanPos[s][1] += frames[i].pos[s][1]; meanPos[s][2]++; meanScale[s] += frames[i].scale[s];
    }
    for (s = 0; s < 2; s++) if (meanPos[s][2]) { meanPos[s][0] /= meanPos[s][2]; meanPos[s][1] /= meanPos[s][2]; meanScale[s] /= meanPos[s][2]; }
    var out = [];
    for (i = 0; i < n; i++) {
      var f = new Float32Array(FRAME_DIM), o = 0;
      for (s = 0; s < 2; s++) {
        if (frames[i].present[s]) {
          f.set(frames[i].shape[s], o);
          // movement of the wrist across the sign, in units of hand size, so near and far cameras agree
          f[o + 63] = (frames[i].pos[s][0] - meanPos[s][0]) / (meanScale[s] || 1) * 0.5;
          f[o + 64] = (frames[i].pos[s][1] - meanPos[s][1]) / (meanScale[s] || 1) * 0.5;
        }
        o += SLOT_DIM;
      }
      f[o] = frames[i].present[0] ? 1 : 0; f[o + 1] = frames[i].present[1] ? 1 : 0;
      out.push(f);
    }
    return out;
  }

  /** Linear resample to a fixed number of steps so signs of different duration can be compared. */
  function resample(feats, steps) {
    steps = steps || T_STEPS;
    var n = feats.length;
    if (!n) return [];
    var out = [];
    for (var i = 0; i < steps; i++) {
      var t = n === 1 ? 0 : i * (n - 1) / (steps - 1);
      var a = Math.floor(t), b = Math.min(n - 1, a + 1), w = t - a, f = new Float32Array(FRAME_DIM);
      for (var k = 0; k < FRAME_DIM; k++) f[k] = feats[a][k] * (1 - w) + feats[b][k] * w;
      out.push(f);
    }
    return out;
  }

  /* ------------------------------------------------------------------ distance */

  function frameDist(a, b) {
    var s = 0;
    for (var k = 0; k < FRAME_DIM; k++) { var d = a[k] - b[k]; s += d * d; }
    return Math.sqrt(s / FRAME_DIM);
  }

  /** Dynamic time warping with a band, so the same sign performed faster or slower still matches. */
  function dtw(A, B, band) {
    band = band === undefined ? 5 : band;
    var n = A.length, m = B.length, INF = 1e9, i, j;
    var prev = new Float64Array(m + 1).fill(INF), cur = new Float64Array(m + 1);
    prev[0] = 0;
    for (i = 1; i <= n; i++) {
      cur.fill(INF);
      var lo = Math.max(1, i - band), hi = Math.min(m, i + band);
      for (j = lo; j <= hi; j++) {
        var c = frameDist(A[i - 1], B[j - 1]);
        cur[j] = c + Math.min(prev[j], cur[j - 1], prev[j - 1]);
      }
      var tmp = prev; prev = cur; cur = tmp;
    }
    return prev[m] / (n + m);
  }

  /* ------------------------------------------------------------------ segmenter */

  /**
   * Turns a stream of per-frame hand results into whole signs.
   * A sign begins when a hand appears and ends when no hand has been seen for `endGapMs`, or after `maxMs`.
   * Short flickers (a hand lost for a few frames) do not split a sign.
   */
  function Segmenter(opts) {
    opts = opts || {};
    this.endGapMs = opts.endGapMs || 600;
    this.minFrames = opts.minFrames || 8;
    this.maxMs = opts.maxMs || 4500;
    this.reset();
  }
  Segmenter.prototype.reset = function () { this.frames = []; this.active = false; this.startedAt = 0; this.lastSeen = 0; };
  /** Returns { event: "none"|"start"|"progress"|"end"|"discard", frames?: [...] } */
  Segmenter.prototype.push = function (norm, tMs) {
    var has = norm.present[0] || norm.present[1];
    if (!this.active) {
      if (!has) return { event: "none" };
      this.active = true; this.startedAt = tMs; this.lastSeen = tMs; this.frames = [norm];
      return { event: "start" };
    }
    this.frames.push(norm);
    if (has) this.lastSeen = tMs;
    var tooLong = tMs - this.startedAt > this.maxMs;
    var gone = tMs - this.lastSeen >= this.endGapMs;
    if (gone || tooLong) {
      var frames = this.frames.filter(function (f) { return f.present[0] || f.present[1]; }); // drop trailing empty frames
      var wasLong = tooLong && !gone;
      this.reset();
      if (frames.length < this.minFrames) return { event: "discard", reason: "too-short", frames: frames };
      return { event: "end", frames: frames, truncated: wasLong };
    }
    return { event: "progress", frames: this.frames };
  };

  /* ------------------------------------------------------------------ classifier */

  function summarise(templates) {
    // Per sign: how far apart its own examples are (spread) and how close the nearest OTHER sign's examples come (gap).
    // A new performance is accepted only if it is within the sign's own spread AND clearly nearer than half the gap to
    // any other sign, so a vocabulary of very different signs cannot be matched by arbitrary hand movement.
    var out = {}, labels = Object.keys(templates);
    labels.forEach(function (lab) {
      var ex = templates[lab], worst = 0, sum = 0, cnt = 0, gap = Infinity, i, j;
      for (i = 0; i < ex.length; i++) for (j = i + 1; j < ex.length; j++) { var d = dtw(ex[i], ex[j]); worst = Math.max(worst, d); sum += d; cnt++; }
      labels.forEach(function (other) {
        if (other === lab) return;
        templates[other].forEach(function (o) { ex.forEach(function (e) { var d2 = dtw(e, o); if (d2 < gap) gap = d2; }); });
      });
      out[lab] = { mean: cnt ? sum / cnt : 0, worst: worst, gap: gap };
    });
    return out;
  }

  /**
   * Classifies one resampled sequence against labelled examples.
   * "closeness" is NOT a probability. It is 1 minus (distance to the nearest example / the allowed distance) for that sign,
   * so 1.0 means identical to an example and 0 means right at the limit of what is accepted.
   */
  function classify(seq, templates, opts) {
    opts = opts || {};
    var labels = Object.keys(templates), ranked = [], summary = opts.summary || summarise(templates);
    var slack = opts.slack || 1.35, floor = opts.floor || 0.05, ambiguity = opts.ambiguity || 0.85;
    labels.forEach(function (lab) {
      var best = Infinity;
      templates[lab].forEach(function (ex) { var d = dtw(seq, ex); if (d < best) best = d; });
      var s = summary[lab];
      var spread = s ? s.worst * slack : 0, allowed;
      if (s && isFinite(s.gap)) allowed = Math.min(Math.max(spread, s.gap * 0.25), s.gap * 0.5); // never wider than half the gap to another sign
      else allowed = Math.max(spread, floor);                                                       // only one sign taught: no gap to measure
      ranked.push({ label: lab, distance: best, allowed: allowed, closeness: Math.max(0, 1 - best / allowed) });
    });
    ranked.sort(function (a, b) { return a.distance - b.distance; });
    if (!ranked.length) return { state: "none", ranked: [] };
    var top = ranked[0];
    if (top.distance > top.allowed) return { state: "unknown", ranked: ranked.slice(0, 3), best: top };
    if (ranked.length > 1) {
      var second = ranked[1];
      if (second.distance <= second.allowed && top.distance / second.distance > ambiguity) return { state: "ambiguous", ranked: ranked.slice(0, 3), best: top };
    }
    return { state: "match", label: top.label, closeness: top.closeness, ranked: ranked.slice(0, 3), best: top };
  }

  /* ------------------------------------------------------------------ adapters */

  /**
   * Adapter contract (see docs/SIGN_LANGUAGE_CAMERA.md):
   *   id, name, kind              identification
   *   getSupportedLanguage()      what the vocabulary belongs to; never a guess
   *   getSupportedVocabulary()    the exact list of signs it can return
   *   isAvailable()               false until it genuinely can recognise something
   *   load()                      Promise; rejects with a readable Error when the model cannot be loaded
   *   classify(frames)            frames = normalised frames of ONE sign -> result as above
   *   dispose()                   release everything
   */
  var MIN_EXAMPLES = 2;

  function PersonalAdapter(store) {
    this.id = "personal"; this.name = "My own signs (taught on this device)"; this.kind = "personal";
    this.store = store; // { load():{labels:{}}, save(obj) }
    this.data = { labels: {} };
    this.summary = null;
  }
  PersonalAdapter.prototype.load = function () { var self = this; return Promise.resolve().then(function () { self.data = self.store.load() || { labels: {} }; self.summary = null; }); };
  PersonalAdapter.prototype.getSupportedLanguage = function () { return "Whatever you teach it. It matches your own performances; it is not a model of any sign language."; };
  PersonalAdapter.prototype.getSupportedVocabulary = function () { var self = this; return Object.keys(self.data.labels).filter(function (l) { return self.data.labels[l].length >= MIN_EXAMPLES; }); };
  PersonalAdapter.prototype.isAvailable = function () { return this.getSupportedVocabulary().length > 0; };
  PersonalAdapter.prototype.examples = function (label) { return (this.data.labels[label] || []).length; };
  PersonalAdapter.prototype.addExample = function (label, frames) {
    label = String(label || "").trim().slice(0, 40);
    if (!label) throw new Error("Give the sign a name first.");
    var seq = resample(toFeatures(frames));
    if (seq.length !== T_STEPS) throw new Error("That recording had no usable hand frames.");
    var arr = this.data.labels[label] || (this.data.labels[label] = []);
    if (arr.length >= 8) arr.shift();
    arr.push(seq); this.summary = null; this.store.save(this.data);
    return arr.length;
  };
  PersonalAdapter.prototype.removeLabel = function (label) { delete this.data.labels[label]; this.summary = null; this.store.save(this.data); };
  PersonalAdapter.prototype.clearAll = function () { this.data = { labels: {} }; this.summary = null; this.store.save(this.data); };
  PersonalAdapter.prototype.classify = function (frames) {
    var self = this, usable = {};
    Object.keys(self.data.labels).forEach(function (l) { if (self.data.labels[l].length >= MIN_EXAMPLES) usable[l] = self.data.labels[l]; });
    if (!Object.keys(usable).length) return { state: "none", ranked: [] };
    if (!self.summary) self.summary = summarise(usable);
    return classify(resample(toFeatures(frames)), usable, { summary: self.summary });
  };
  PersonalAdapter.prototype.dispose = function () { this.data = { labels: {} }; };

  /** Loads a reference package: { manifest:{id,name,language,vocabulary,licence,dataset,evaluation,featureVersion}, templates:{label:[seq,...]} } */
  function TemplateAdapter(pkg) {
    this.id = pkg.manifest.id; this.name = pkg.manifest.name; this.kind = "pretrained"; this.pkg = pkg; this.summary = null;
  }
  TemplateAdapter.validate = function (pkg) {
    var m = pkg && pkg.manifest, errs = [];
    if (!m) return ["manifest missing"];
    ["id", "name", "language", "licence", "dataset", "evaluation"].forEach(function (k) { if (!m[k]) errs.push("manifest." + k + " missing"); });
    if (m.featureVersion !== FEATURE_VERSION) errs.push("featureVersion must be " + FEATURE_VERSION);
    if (!Array.isArray(m.vocabulary) || !m.vocabulary.length) errs.push("manifest.vocabulary missing");
    if (!pkg.templates || !Object.keys(pkg.templates).length) errs.push("templates missing");
    else Object.keys(pkg.templates).forEach(function (label) {
      var seqs = pkg.templates[label];
      var good = Array.isArray(seqs) && seqs.length && seqs.every(function (q) { return Array.isArray(q) && q.length === T_STEPS && q.every(function (f) { return f && f.length === FRAME_DIM; }); });
      if (!good) errs.push('templates["' + label + '"] must be a list of sequences of ' + T_STEPS + " frames x " + FRAME_DIM + " numbers");
    });
    if (m.vocabulary && pkg.templates) m.vocabulary.forEach(function (w) { if (!pkg.templates[w]) errs.push('vocabulary word "' + w + '" has no templates'); });
    return errs;
  };
  TemplateAdapter.prototype.load = function () { var e = TemplateAdapter.validate(this.pkg); return e.length ? Promise.reject(new Error("Model package is not valid: " + e.join("; "))) : Promise.resolve(); };
  TemplateAdapter.prototype.getSupportedLanguage = function () { return this.pkg.manifest.language; };
  TemplateAdapter.prototype.getSupportedVocabulary = function () { return this.pkg.manifest.vocabulary.slice(); };
  TemplateAdapter.prototype.isAvailable = function () { return TemplateAdapter.validate(this.pkg).length === 0; };
  TemplateAdapter.prototype.classify = function (frames) {
    if (!this.summary) this.summary = summarise(this.pkg.templates);
    return classify(resample(toFeatures(frames)), this.pkg.templates, { summary: this.summary });
  };
  TemplateAdapter.prototype.dispose = function () { this.summary = null; };

  /* ------------------------------------------------------------------ stabiliser */

  /**
   * Gate between the classifier and the transcript.
   * - the same sign twice in a row inside `repeatMs` is treated as one (a held sign is not a repeat)
   * - unknown, ambiguous and low-closeness results are never added
   */
  function Stabiliser(opts) {
    opts = opts || {};
    this.repeatMs = opts.repeatMs === undefined ? 1500 : opts.repeatMs;
    this.minCloseness = opts.minCloseness === undefined ? 0.15 : opts.minCloseness;
    this.last = null;
  }
  Stabiliser.prototype.reset = function () { this.last = null; };
  Stabiliser.prototype.decide = function (result, tMs) {
    if (!result || result.state === "none") return { accept: false, reason: "no-vocabulary" };
    if (result.state === "unknown") return { accept: false, reason: "unknown" };
    if (result.state === "ambiguous") return { accept: false, reason: "ambiguous" };
    if (result.closeness < this.minCloseness) return { accept: false, reason: "low-confidence" };
    if (this.last && this.last.label === result.label && tMs - this.last.t < this.repeatMs) return { accept: false, reason: "duplicate" };
    this.last = { label: result.label, t: tMs };
    return { accept: true, label: result.label, closeness: result.closeness };
  };

  return {
    T_STEPS: T_STEPS, FRAME_DIM: FRAME_DIM, FEATURE_VERSION: FEATURE_VERSION, MIN_EXAMPLES: MIN_EXAMPLES,
    normalise: normalise, toFeatures: toFeatures, resample: resample, dtw: dtw, classify: classify, summarise: summarise,
    Segmenter: Segmenter, PersonalAdapter: PersonalAdapter, TemplateAdapter: TemplateAdapter, Stabiliser: Stabiliser
  };
});
