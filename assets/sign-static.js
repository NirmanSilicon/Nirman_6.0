/*
 * SANGAM personal static-sign trainer ("My held poses").
 *
 * What this is: a person teaches the app their OWN hand shapes (a pose held still), gives each a word, and the app then
 * recognises those poses from that person's hand. It is a nearest-neighbour matcher over hand landmarks. It is NOT a
 * trained network, NOT a standard-language recogniser and NOT evaluated on other people. A pose taught here is a personal
 * gesture: it is not Indian Sign Language, American Sign Language or any other language unless the person says so.
 *
 * What is stored: only numbers (21 hand points per example, centred on the wrist and scaled by palm size). No pictures,
 * no video, no sound. Everything stays in this browser's localStorage and can be deleted per pose or all at once.
 *
 * Honest limits, repeated in the UI: the matcher compares against the examples it was given, so it only knows those poses
 * and the same hand; "unknown" is a real answer; the self-check below is leave-one-out on examples recorded in one sitting,
 * which flatters real-world accuracy.
 *
 * Runs in the browser (window.SangamStatic) and in Node (module.exports) so it can be unit-tested without a camera.
 */
(function (root, factory) { if (typeof module === "object" && module.exports) module.exports = factory(); else root.SangamStatic = factory(); })(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var STORE_KEY = "sangam.sign.static.v1";
  var MIN_EXAMPLES = 3;          // a pose needs this many examples before it is used
  var GOOD_EXAMPLES = 5;         // recommended
  var MAX_POSES = 20, MAX_EXAMPLES = 30, MAX_LABEL = 40;
  var HOLD_MS = 900;             // how long a pose is held before it is typed
  var NEED_POSES = 2;            // a single pose cannot be told apart from anything, so at least two are needed to classify

  /* ---------------------------------------------------------------- features */
  /** 21 landmarks [{x,y,z}] -> 63 numbers, or null. Translation- and scale-invariant; NOT rotation-invariant (orientation can matter for a sign). */
  function features(L, aspect) {
    if (!L || L.length !== 21) return null;
    var a = aspect > 0 ? aspect : 1, P = [], i;
    for (i = 0; i < 21; i++) { var q = L[i]; if (!q || !isFinite(q.x) || !isFinite(q.y)) return null; P.push([q.x * a, q.y, (isFinite(q.z) ? q.z : 0) * a]); }
    function d(p, q) { var x = p[0] - q[0], y = p[1] - q[1], z = p[2] - q[2]; return Math.sqrt(x * x + y * y + z * z); }
    var scale = (d(P[0], P[9]) + d(P[5], P[17])) / 2;
    if (!(scale > 1e-6)) return null;
    var out = [], w = P[0];
    for (i = 0; i < 21; i++) out.push((P[i][0] - w[0]) / scale, (P[i][1] - w[1]) / scale, (P[i][2] - w[2]) / scale);
    return out;
  }
  /** Mean distance between corresponding landmarks, in palm sizes. 0 = identical. */
  function dist(a, b) {
    var s = 0;
    for (var i = 0; i < 21; i++) { var x = a[3 * i] - b[3 * i], y = a[3 * i + 1] - b[3 * i + 1], z = a[3 * i + 2] - b[3 * i + 2]; s += Math.sqrt(x * x + y * y + z * z); }
    return s / 21;
  }

  /* ---------------------------------------------------------------- store */
  function cleanLabel(s) { return String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, MAX_LABEL); }
  function round4(v) { return v.map(function (x) { return Math.round(x * 10000) / 10000; }); }

  function PoseStore(storage) {
    this.storage = storage || null; this.poses = {}; this.lastError = null; this._load();
  }
  PoseStore.prototype._load = function () {
    try {
      var raw = this.storage && this.storage.getItem(STORE_KEY); if (!raw) return;
      var d = JSON.parse(raw), p = d && d.poses, self = this;
      if (!p || typeof p !== "object") return;
      Object.keys(p).slice(0, MAX_POSES).forEach(function (k) {
        var label = cleanLabel(k), list = Array.isArray(p[k]) ? p[k] : [];
        list = list.filter(function (v) { return Array.isArray(v) && v.length === 63 && v.every(isFinite); }).slice(-MAX_EXAMPLES);
        if (label && list.length) self.poses[label] = list;
      });
    } catch (e) { this.poses = {}; }
  };
  PoseStore.prototype._save = function () {
    if (!this.storage) return true;
    try { this.storage.setItem(STORE_KEY, JSON.stringify({ v: 1, poses: this.poses })); this.lastError = null; return true; }
    catch (e) { this.lastError = "This device has no room left to save poses. Delete some and try again."; return false; }
  };
  PoseStore.prototype.add = function (label, vec) {
    label = cleanLabel(label);
    if (!label) throw new Error("Give the pose a name first.");
    if (!vec || vec.length !== 63 || !vec.every(isFinite)) throw new Error("That hand reading was not usable.");
    if (!this.poses[label] && Object.keys(this.poses).length >= MAX_POSES) throw new Error("You can keep up to " + MAX_POSES + " poses. Delete one to add another.");
    var list = this.poses[label] || (this.poses[label] = []);
    list.push(round4(vec)); if (list.length > MAX_EXAMPLES) list.shift();
    if (!this._save()) { list.pop(); if (!list.length) delete this.poses[label]; throw new Error(this.lastError); }
    return list.length;
  };
  PoseStore.prototype.removeLabel = function (label) { delete this.poses[label]; this._save(); };
  PoseStore.prototype.clearAll = function () { this.poses = {}; try { if (this.storage) this.storage.removeItem(STORE_KEY); } catch (e) {} };
  PoseStore.prototype.counts = function () { var o = {}, p = this.poses; Object.keys(p).forEach(function (k) { o[k] = p[k].length; }); return o; };
  /** Labels with enough examples to be used. */
  PoseStore.prototype.usable = function () { var p = this.poses; return Object.keys(p).filter(function (k) { return p[k].length >= MIN_EXAMPLES; }); };
  PoseStore.prototype.isAvailable = function () { return this.usable().length >= NEED_POSES; };
  /** What a person would download: numbers only, with a plain description. */
  PoseStore.prototype.exportJSON = function () {
    return JSON.stringify({ format: "sangam-personal-static-poses", version: 1, note: "Hand-landmark numbers only (21 points x 3, centred on the wrist, scaled by palm size). No pictures. Personal gestures, not a standard sign language.", poses: this.poses }, null, 1);
  };

  /* ---------------------------------------------------------------- classification */
  function median(a) { var s = a.slice().sort(function (x, y) { return x - y; }); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; }
  function percentile(a, q) { var s = a.slice().sort(function (x, y) { return x - y; }); if (!s.length) return 0; return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1) + 0.5))]; }

  /** Distance beyond which a hand is "not any of my poses": 1.6 x the 90th-percentile nearest-same-pose distance, kept in a sane band. */
  function rejectThreshold(poses) {
    var nn = [];
    Object.keys(poses).forEach(function (k) {
      var L = poses[k]; if (L.length < 2) return;
      for (var i = 0; i < L.length; i++) { var best = Infinity; for (var j = 0; j < L.length; j++) if (i !== j) best = Math.min(best, dist(L[i], L[j])); nn.push(best); }
    });
    var p90 = nn.length ? percentile(nn, 0.9) : 0.15;
    return Math.min(0.6, Math.max(0.12, 1.6 * p90));
  }

  /**
   * vec: 63 numbers; poses: { label: [vec...] } (only labels with >= MIN_EXAMPLES are used).
   * Returns { label|null, reason, distance, threshold, closeness (0..1, NOT a probability), runnerUp }.
   * Reasons when label is null: "not_enough_poses", "unknown" (nothing close), "ambiguous" (two poses about equally close).
   */
  function classify(vec, poses, thr) {
    var use = {}; Object.keys(poses).forEach(function (k) { if (poses[k].length >= MIN_EXAMPLES) use[k] = poses[k]; });
    var labels = Object.keys(use);
    if (labels.length < NEED_POSES) return { label: null, reason: "not_enough_poses" };
    var t = thr == null ? rejectThreshold(use) : thr;
    var per = labels.map(function (k) { var ds = use[k].map(function (v) { return dist(vec, v); }).sort(function (a, b) { return a - b; }); return { label: k, d: (ds[0] + (ds[1] === undefined ? ds[0] : ds[1])) / 2 }; }).sort(function (a, b) { return a.d - b.d; });
    var best = per[0], second = per[1];
    if (best.d > t) return { label: null, reason: "unknown", distance: best.d, threshold: t, nearest: best.label };
    if (second && best.d > 0.8 * second.d && second.d <= t) return { label: null, reason: "ambiguous", distance: best.d, threshold: t, nearest: best.label, runnerUp: second.label };
    return { label: best.label, reason: "ok", distance: best.d, threshold: t, closeness: Math.max(0, Math.min(1, 1 - best.d / t)), runnerUp: second ? second.label : null };
  }

  /**
   * Leave-one-out self-check on the person's own examples. Needs >= NEED_POSES poses with >= MIN_EXAMPLES examples.
   * Each example is held out and classified against the rest. "wrong" = a different pose; "rejected" = unknown/ambiguous.
   */
  function evaluate(poses) {
    var use = {}; Object.keys(poses).forEach(function (k) { if (poses[k].length >= MIN_EXAMPLES) use[k] = poses[k]; });
    var labels = Object.keys(use);
    if (labels.length < NEED_POSES) return { ok: false, reason: "Teach at least " + NEED_POSES + " poses with " + MIN_EXAMPLES + " examples each to run the check." };
    var res = { ok: true, total: 0, correct: 0, wrong: 0, rejected: 0, perPose: {}, confusions: [], note: "Leave-one-out on the examples you recorded. They were recorded in one sitting, so this is optimistic: real use, with different lighting, distance and tiredness, will be worse. It says nothing about other people's hands." };
    labels.forEach(function (k) { res.perPose[k] = { total: 0, correct: 0, wrong: 0, rejected: 0 }; });
    labels.forEach(function (k) {
      use[k].forEach(function (v, i) {
        var rest = {}; labels.forEach(function (m) { rest[m] = m === k ? use[m].filter(function (_, j) { return j !== i; }) : use[m]; });
        var r = classify(v, rest), pp = res.perPose[k]; res.total++; pp.total++;
        if (r.label === k) { res.correct++; pp.correct++; }
        else if (r.label) { res.wrong++; pp.wrong++; res.confusions.push({ actual: k, heard: r.label }); }
        else { res.rejected++; pp.rejected++; }
      });
    });
    res.accuracy = res.total ? res.correct / res.total : 0;
    return res;
  }

  /* ---------------------------------------------------------------- hold-still stream (same idea as the letter stream) */
  /** push(hands, t, aspect) per camera frame. Types the pose's word once the same pose has been held HOLD_MS. */
  function PoseStream(store, opts) {
    opts = opts || {}; this.store = store; this.hold = opts.holdMs || HOLD_MS; this.reset();
  }
  PoseStream.prototype.reset = function () { this.cand = null; this.since = 0; this.emitted = false; this.lastSeen = -1e9; };
  /** After a capture the hand is still holding that pose: do not type it until the person changes pose or lowers their hand. */
  PoseStream.prototype.suppress = function (label) { this.cand = label; this.emitted = true; this.since = 0; };
  PoseStream.prototype.push = function (hands, t, aspect) {
    if (!hands || !hands.length) { if (t - this.lastSeen > 450) this.reset(); return { event: "none" }; }
    this.lastSeen = t;
    if (hands.length > 1) { this.cand = null; return { event: "seen", reason: "two_hands" }; }
    var vec = features(hands[0].landmarks || hands[0], aspect);
    if (!vec) return { event: "seen", reason: "unreadable" };
    var r = classify(vec, this.store.poses);
    if (!r.label) { this.cand = null; this.emitted = false; return { event: "seen", reason: r.reason, nearest: r.nearest }; }
    if (this.cand !== r.label) { this.cand = r.label; this.since = t; this.emitted = false; }
    var held = t - this.since;
    if (this.emitted) return { event: "held", word: r.label };
    if (held >= this.hold) { this.emitted = true; return { event: "word", word: r.label, closeness: r.closeness }; }
    return { event: "candidate", word: r.label, progress: Math.max(0, Math.min(1, held / this.hold)) };
  };

  /* ---------------------------------------------------------------- capturing examples (holds still, takes several readings) */
  /** Collects `want` still readings of one hand. Frames where the hand is moving are skipped, so the examples are of a held pose. */
  function Capturer(label, want, opts) {
    opts = opts || {}; this.label = label; this.want = want || 8; this.vecs = []; this.prev = null; this.frames = 0; this.maxFrames = opts.maxFrames || 240; this.still = opts.still || 0.06; this.every = 0; this.tooMany = false;
  }
  Capturer.prototype.push = function (hands, aspect) {
    this.frames++;
    if (this.frames > this.maxFrames) return { done: true, ok: false, reason: "timeout", count: this.vecs.length };
    if (!hands || hands.length !== 1) { this.prev = null; return { done: false, count: this.vecs.length, reason: hands && hands.length > 1 ? "two_hands" : "no_hand" }; }
    var v = features(hands[0].landmarks || hands[0], aspect); if (!v) return { done: false, count: this.vecs.length, reason: "unreadable" };
    var moving = this.prev && dist(this.prev, v) > this.still; this.prev = v;
    if (moving) return { done: false, count: this.vecs.length, reason: "moving" };
    if ((this.every++ % 3) !== 0) return { done: false, count: this.vecs.length };   // spread readings over a few frames
    this.vecs.push(v);
    return this.vecs.length >= this.want ? { done: true, ok: true, count: this.vecs.length } : { done: false, count: this.vecs.length };
  };

  return { STORE_KEY: STORE_KEY, MIN_EXAMPLES: MIN_EXAMPLES, GOOD_EXAMPLES: GOOD_EXAMPLES, NEED_POSES: NEED_POSES, HOLD_MS: HOLD_MS, MAX_POSES: MAX_POSES, MAX_EXAMPLES: MAX_EXAMPLES,
    features: features, dist: dist, PoseStore: PoseStore, classify: classify, evaluate: evaluate, rejectThreshold: rejectThreshold, PoseStream: PoseStream, Capturer: Capturer, cleanLabel: cleanLabel };
});
