/*
 * SANGAM fingerspelling: the ONE-HANDED American Sign Language alphabet (A-Z) and numbers (0-9) from MediaPipe hand landmarks.
 * No camera, no DOM and no network in this file, so it can be unit-tested in Node (test-sign-letters.js).
 *
 * Why this exists: the pretrained ISL/ASL models (assets/sign-model.js) recognise isolated WORDS only. They were not
 * trained on fingerspelling or numbers, so before this file the camera could not produce a single letter or digit.
 *
 * How it works (rules, not a trained model):
 *   - classifyLetter()  turns one hand's 21 landmarks into scale-free measurements (how straight each finger is, how
 *                       far the thumb tip is from each finger, how spread the fingertips are, which way the hand points)
 *                       and scores every letter against a hand-written description of its handshape.
 *   - LetterStream      turns a stream of frames into typed letters: a letter is only typed after the same handshape has
 *                       been held still for about 0.7 s, so hands passing through other shapes do not type junk.
 *                       J and Z are drawn in the air, so they are recognised from the fingertip's path instead.
 *
 * Honest limits: written from the published shape of each ASL letter and tested on SYNTHETIC skeletons only. Letters
 * that differ by a few millimetres of thumb position (A S T N M E) are the most likely to be confused; the stream
 * refuses to type a letter when the best two are too close, and the UI shows what it is currently seeing so a signer
 * can adjust. ISL fingerspelling is two-handed and is NOT covered here.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SangamSignLetters = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var STATIC_LETTERS = "ABCDEFGHIKLMNOPQRSTUVWXY".split("");   // J and Z need motion, see LetterStream
  var MOTION_LETTERS = ["J", "Z"];

  /* ------------------------------------------------------------------ fuzzy helpers */
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function hi(x, t, w) { return clamp01(0.5 + (x - t) / w); }             // 1 when x is well above t
  function lo(x, t, w) { return 1 - hi(x, t, w); }                         // 1 when x is well below t
  function between(x, a, b, w) { return Math.min(hi(x, a, w), lo(x, b, w)); }
  function score(parts) {                                                  // forgiving on one bad measure, strict on several
    var sum = 0, min = 1, i;
    for (i = 0; i < parts.length; i++) { sum += parts[i]; if (parts[i] < min) min = parts[i]; }
    return (sum / parts.length) * (0.4 + 0.6 * min);
  }

  /* ------------------------------------------------------------------ measurements */
  /** L: 21 landmarks [{x,y,z}] in image units (0..1). aspect = video width / height so x and y are in the same units. */
  function measure(L, aspect) {
    if (!L || L.length !== 21) return null;
    aspect = aspect || 1;
    var P = L.map(function (p) { return [p.x * aspect, p.y, (p.z || 0) * aspect]; });
    function D(i, j) { var a = P[i], b = P[j], dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2]; return Math.sqrt(dx * dx + dy * dy + dz * dz); }
    function mid(i, j) { return [(P[i][0] + P[j][0]) / 2, (P[i][1] + P[j][1]) / 2, (P[i][2] + P[j][2]) / 2]; }
    function DP(i, q) { var a = P[i], dx = a[0] - q[0], dy = a[1] - q[1], dz = a[2] - q[2]; return Math.sqrt(dx * dx + dy * dy + dz * dz); }
    var s = Math.max(D(0, 9), D(5, 17) * 1.25);   // palm length; the knuckle width backs it up when the palm is tilted away
    if (!(s > 1e-6)) return null;
    function straight(a, b, c, d) { var chain = D(a, b) + D(b, c) + D(c, d); return chain > 1e-9 ? D(a, d) / chain : 0; } // 1 = straight, ~0.5 = fist
    var m = {
      s: s,
      cI: straight(5, 6, 7, 8), cM: straight(9, 10, 11, 12), cR: straight(13, 14, 15, 16), cP: straight(17, 18, 19, 20), cT: straight(1, 2, 3, 4),
      tI: D(4, 8) / s, tM: D(4, 12) / s, tR: D(4, 16) / s, tP: D(4, 20) / s,     // thumb tip to each fingertip
      tMp: D(4, 10) / s, tIm: D(4, 5) / s, tRm: D(4, 13) / s,                    // ... to the middle finger's middle joint, index and ring knuckles
      zRel: (P[4][2] - P[10][2]) / s,                                            // thumb tip depth vs the middle joint: negative = in front (toward the camera)
      tG1: DP(4, mid(6, 10)) / s, tG2: DP(4, mid(10, 14)) / s, tG3: DP(4, mid(14, 18)) / s, // ... to the gaps between the fingers' middle joints
      spIM: D(8, 12) / (D(5, 9) || 1e-6), spMR: D(12, 16) / (D(9, 13) || 1e-6), spRP: D(16, 20) / (D(13, 17) || 1e-6) // fingertip gap / knuckle gap
    };
    // which way the hand points on the picture (wrist -> middle knuckle)
    var vx = P[9][0] - P[0][0], vy = P[9][1] - P[0][1], n2 = Math.sqrt(vx * vx + vy * vy) || 1e-6;
    m.up = -vy / n2; m.side = Math.abs(vx) / n2;
    // angle between the thumb and the index finger (1 = parallel, 0 = at a right angle)
    var tx = P[4][0] - P[2][0], ty = P[4][1] - P[2][1], tz = P[4][2] - P[2][2], ix = P[8][0] - P[5][0], iy = P[8][1] - P[5][1], iz = P[8][2] - P[5][2];
    var tn = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1e-6, inn = Math.sqrt(ix * ix + iy * iy + iz * iz) || 1e-6;
    m.cosTI = (tx * ix + ty * iy + tz * iz) / (tn * inn);
    // crossed fingers (R): the index tip has moved past the middle tip along the knuckle line
    var ax = P[17][0] - P[5][0], ay = P[17][1] - P[5][1], az = P[17][2] - P[5][2], an = Math.sqrt(ax * ax + ay * ay + az * az) || 1e-6;
    m.tipOrder = ((P[8][0] - P[12][0]) * ax + (P[8][1] - P[12][1]) * ay + (P[8][2] - P[12][2]) * az) / an / s; // negative = normal, >= ~0 = crossed
    return m;
  }

  /* ------------------------------------------------------------------ the alphabet */
  function ext(c) { return hi(c, 0.86, 0.12); }        // finger straight
  function fist(c) { return lo(c, 0.62, 0.12); }       // finger folded into the palm
  function curved(c) { return between(c, 0.62, 0.92, 0.1); }
  function claw(c) { return between(c, 0.45, 0.80, 0.1); }

  var RULES = {
    A: function (m) { return [fist(m.cI), fist(m.cM), fist(m.cR), fist(m.cP), hi(m.tMp, 0.45, 0.12), hi(m.cT, 0.8, 0.15)]; },
    // S: thumb lies ACROSS THE FRONT of the folded fingers. T, N, M: thumb is TUCKED IN between two fingers (T index/middle,
    // N middle/ring, M ring/pinky), so its tip is not in front of the fingers.
    S: function (m) { return [fist(m.cI), fist(m.cM), fist(m.cR), fist(m.cP), lo(m.tMp, 0.40, 0.12), lo(m.zRel, -0.07, 0.08)]; },
    T: function (m) { return [fist(m.cI), fist(m.cM), fist(m.cR), fist(m.cP), lo(m.tG1, 0.20, 0.07), hi(m.tG2 - m.tG1, 0.02, 0.06), hi(m.tG3 - m.tG1, 0.02, 0.06), hi(m.zRel, -0.03, 0.08)]; },
    N: function (m) { return [fist(m.cI), fist(m.cM), fist(m.cR), fist(m.cP), lo(m.tG2, 0.20, 0.07), hi(m.tG1 - m.tG2, 0.02, 0.06), hi(m.tG3 - m.tG2, 0.02, 0.06), hi(m.zRel, -0.03, 0.08)]; },
    M: function (m) { return [fist(m.cI), fist(m.cM), fist(m.cR), fist(m.cP), lo(m.tG3, 0.22, 0.07), hi(m.tG1 - m.tG3, 0.02, 0.06), hi(m.tG2 - m.tG3, 0.02, 0.06), hi(m.zRel, -0.03, 0.08)]; },
    E: function (m) { return [claw(m.cI), claw(m.cM), claw(m.cR), claw(m.cP), lo(m.tI, 0.32, 0.1), lo(m.tM, 0.32, 0.1), lo(m.tR, 0.38, 0.12)]; },
    O: function (m) { return [curved(m.cI), curved(m.cM), curved(m.cR), curved(m.cP), lo(m.tI, 0.28, 0.09), lo(m.tM, 0.36, 0.12)]; },
    C: function (m) { return [curved(m.cI), curved(m.cM), curved(m.cR), curved(m.cP), hi(m.tI, 0.5, 0.12), lo(m.tI, 1.35, 0.2)]; },
    B: function (m) { return [ext(m.cI), ext(m.cM), ext(m.cR), ext(m.cP), lo(m.spIM, 1.45, 0.3), lo(m.spMR, 1.45, 0.3), lo(m.spRP, 1.6, 0.3), lo(m.tRm, 0.7, 0.2)]; },
    D: function (m) { return [ext(m.cI), lo(m.cM, 0.86, 0.1), lo(m.cR, 0.86, 0.1), lo(m.cP, 0.86, 0.1), lo(m.tM, 0.34, 0.1)]; },
    F: function (m) { return [ext(m.cM), ext(m.cR), ext(m.cP), lo(m.cI, 0.92, 0.08), lo(m.tI, 0.28, 0.09)]; },
    G: function (m) { return [ext(m.cI), fist(m.cM), fist(m.cR), fist(m.cP), hi(m.cosTI, 0.6, 0.25), hi(m.side, 0.6, 0.25), lo(m.tIm, 0.6, 0.15)]; },
    Q: function (m) { return [ext(m.cI), fist(m.cM), fist(m.cR), fist(m.cP), hi(m.cosTI, 0.6, 0.25), hi(-m.up, 0.4, 0.3), lo(m.tIm, 0.6, 0.15)]; },
    H: function (m) { return [ext(m.cI), ext(m.cM), fist(m.cR), fist(m.cP), lo(m.spIM, 1.45, 0.3), hi(m.spIM, 0.7, 0.15), hi(m.side, 0.6, 0.25), hi(m.tMp, 0.4, 0.15)]; },
    K: function (m) { return [ext(m.cI), ext(m.cM), fist(m.cR), fist(m.cP), hi(m.spIM, 1.5, 0.3), lo(m.tMp, 0.38, 0.12), hi(m.up, 0.3, 0.3)]; },
    P: function (m) { return [ext(m.cI), ext(m.cM), fist(m.cR), fist(m.cP), hi(m.spIM, 1.5, 0.3), lo(m.tMp, 0.38, 0.12), hi(-m.up, 0.2, 0.3)]; },
    // L and Y stick the thumb OUT to the side (far from the fingers); I keeps it folded in against them.
    L: function (m) { return [ext(m.cI), fist(m.cM), fist(m.cR), fist(m.cP), hi(m.cT, 0.8, 0.12), lo(m.cosTI, 0.45, 0.25), hi(m.tMp, 0.7, 0.15)]; },
    I: function (m) { return [ext(m.cP), fist(m.cI), fist(m.cM), fist(m.cR), lo(m.tMp, 0.65, 0.15)]; },
    Y: function (m) { return [ext(m.cP), fist(m.cI), fist(m.cM), fist(m.cR), hi(m.cT, 0.8, 0.12), hi(m.tMp, 0.7, 0.15)]; },
    U: function (m) { return [ext(m.cI), ext(m.cM), fist(m.cR), fist(m.cP), lo(m.spIM, 1.45, 0.25), hi(m.spIM, 0.7, 0.15), hi(m.up, 0.3, 0.3), hi(m.tMp, 0.4, 0.15)]; },
    V: function (m) { return [ext(m.cI), ext(m.cM), fist(m.cR), fist(m.cP), hi(m.spIM, 1.55, 0.3), hi(m.tMp, 0.4, 0.15)]; },
    R: function (m) { return [ext(m.cI), ext(m.cM), fist(m.cR), fist(m.cP), Math.max(lo(m.spIM, 0.6, 0.15), hi(m.tipOrder, -0.05, 0.06)), hi(m.tMp, 0.4, 0.15)]; },
    W: function (m) { return [ext(m.cI), ext(m.cM), ext(m.cR), fist(m.cP), hi(m.spIM, 1.45, 0.3), hi(m.spMR, 1.35, 0.3)]; },
    X: function (m) { return [between(m.cI, 0.55, 0.8, 0.07), fist(m.cM), fist(m.cR), fist(m.cP)]; },
    // Internal: index-only pointing. Never typed as a letter; it is the handshape of Z, whose letter comes from motion.
    "1": function (m) { return [ext(m.cI), fist(m.cM), fist(m.cR), fist(m.cP), lo(m.cT, 0.92, 0.08), lo(m.cosTI, 0.8, 0.2)]; }
  };
  var SHAPE_KEYS = Object.keys(RULES);

  /* ASL numbers 0-9 (one hand, palm toward the camera). 6, 7, 8, 9 are "the thumb touches the pinky / ring / middle / index
   * fingertip while the other three fingers stand up". Kept apart from the letters because several share a handshape
   * (2 = V, 6 = W, 9 = F, 0 = O) and a digits-only mode never has to choose between a letter and a number. */
  var DIGITS = "0123456789".split("");
  var DIGIT_RULES = {
    "0": function (m) { return [curved(m.cI), curved(m.cM), curved(m.cR), curved(m.cP), lo(m.tI, 0.28, 0.09), lo(m.tM, 0.36, 0.12)]; },
    // thumb "out" = its tip is far from the ring-finger knuckle (tRm > ~1); "in" = tucked across the palm or fingers (tRm < ~0.8)
    "1": function (m) { return [ext(m.cI), fist(m.cM), fist(m.cR), fist(m.cP), lo(m.tRm, 0.95, 0.2)]; },
    "2": function (m) { return [ext(m.cI), ext(m.cM), fist(m.cR), fist(m.cP), hi(m.spIM, 1.3, 0.3), lo(m.tRm, 0.95, 0.2)]; },
    "3": function (m) { return [ext(m.cI), ext(m.cM), fist(m.cR), fist(m.cP), hi(m.cT, 0.8, 0.12), hi(m.tRm, 0.95, 0.2)]; },
    "4": function (m) { return [ext(m.cI), ext(m.cM), ext(m.cR), ext(m.cP), lo(m.tRm, 0.7, 0.2), hi(m.spIM, 0.9, 0.3)]; },
    "5": function (m) { return [ext(m.cI), ext(m.cM), ext(m.cR), ext(m.cP), hi(m.cT, 0.8, 0.12), hi(m.tRm, 0.95, 0.2)]; },
    "6": function (m) { return [ext(m.cI), ext(m.cM), ext(m.cR), lo(m.cP, 0.92, 0.08), lo(m.tP, 0.3, 0.1)]; },
    "7": function (m) { return [ext(m.cI), ext(m.cM), ext(m.cP), lo(m.cR, 0.92, 0.08), lo(m.tR, 0.3, 0.1)]; },
    "8": function (m) { return [ext(m.cI), ext(m.cR), ext(m.cP), lo(m.cM, 0.92, 0.08), lo(m.tM, 0.3, 0.1)]; },
    "9": function (m) { return [ext(m.cM), ext(m.cR), ext(m.cP), lo(m.cI, 0.92, 0.08), lo(m.tI, 0.28, 0.09)]; }
  };
  var DIGIT_KEYS = Object.keys(DIGIT_RULES);

  function rank(m, rules, keys) {
    var ranked = keys.map(function (k) { return { letter: k, score: score(rules[k](m)) }; });
    ranked.sort(function (a, b) { return b.score - a.score; });
    return { ranked: ranked, top: ranked[0], second: ranked[1], m: m };
  }
  /** Scores one hand. Returns { ranked: [{letter, score}] best first, top, second, m } or null if the hand is unusable. */
  function classifyLetter(L, aspect) { var m = measure(L, aspect); return m ? rank(m, RULES, SHAPE_KEYS) : null; }
  function classifyDigit(L, aspect) { var m = measure(L, aspect); return m ? rank(m, DIGIT_RULES, DIGIT_KEYS) : null; }
  function scoreOf(c, letter) { for (var i = 0; i < c.ranked.length; i++) if (c.ranked[i].letter === letter) return c.ranked[i].score; return 0; }

  /* ------------------------------------------------------------------ stream: frames -> typed letters */
  function pathLen(pts) { var s = 0; for (var i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; }
  function reversals(xs, thr) {     // direction changes of at least `thr` (ignores jitter)
    var n = 0, dir = 0, ext_ = xs[0], i;
    for (i = 1; i < xs.length; i++) {
      var x = xs[i];
      if (dir >= 0 && x > ext_) { ext_ = x; if (dir === 0 && x - xs[0] > thr) dir = 1; }
      if (dir <= 0 && x < ext_) { ext_ = x; if (dir === 0 && xs[0] - x > thr) dir = -1; }
      if (dir === 1 && ext_ - x > thr) { n++; dir = -1; ext_ = x; }
      else if (dir === -1 && x - ext_ > thr) { n++; dir = 1; ext_ = x; }
    }
    return n;
  }

  /** opts.kind: "letters" (default: A-Y by shape, J and Z by motion) or "digits" (0-9 by shape). */
  function LetterStream(opts) {
    opts = opts || {};
    this.kind = opts.kind === "digits" ? "digits" : "letters";
    this.holdMs = opts.holdMs || 700;          // how long one handshape must be held to type it
    this.graceMs = opts.graceMs || 300;        // a shape may flicker for this long without restarting the hold
    this.minScore = opts.minScore || 0.6;      // the best letter must reach this
    this.margin = opts.margin || 0.06;         // ... and beat the runner-up by this much, otherwise it is "ambiguous"
    this.moveMax = opts.moveMax || 0.8;        // hand travel (in palm lengths) allowed while holding a letter still
    this.releaseMs = opts.releaseMs || 350;    // hand out of view this long = ready for the same letter again
    this.motionWindowMs = opts.motionWindowMs || 1400;
    this.reset();
  }
  LetterStream.prototype.reset = function () { this.hist = []; this.cand = null; this.locked = null; this.noHandSince = null; this.diff = 0; };

  LetterStream.prototype._pick = function (hands, aspect) {
    var best = null;
    var classify = this.kind === "digits" ? classifyDigit : classifyLetter;
    (hands || []).forEach(function (h) { var c = h && h.landmarks && classify(h.landmarks, aspect); if (c && (!best || c.m.s > best.c.m.s)) best = { c: c, h: h }; }); // the nearest (biggest) hand
    return best;
  };

  /** One frame. hands = [{landmarks:[21]}]. Returns { event, letter?, score?, progress?, moving?, ambiguous?, seen? }.
   *  event: "none" (no hand) | "seen" (a hand, not yet a letter) | "candidate" (holding) | "letter" (type it now) | "held" (already typed) */
  LetterStream.prototype.push = function (hands, t, aspect) {
    var pick = this._pick(hands, aspect);
    if (!pick) {
      if (this.noHandSince === null) this.noHandSince = t;
      if (t - this.noHandSince >= this.releaseMs) { this.locked = null; this.diff = 0; }
      if (t - this.noHandSince >= this.graceMs) { this.cand = null; this.hist = []; }
      return { event: "none" };
    }
    this.noHandSince = null;
    var c = pick.c, L = pick.h.landmarks, s = c.m.s;
    var letters = this.kind === "letters";
    var sc = letters ? { I: scoreOf(c, "I"), one: scoreOf(c, "1") } : { I: 0, one: 0 };
    this.hist.push({ t: t, w: [L[0].x * (aspect || 1), L[0].y], pk: [L[20].x * (aspect || 1), L[20].y], ix: [L[8].x * (aspect || 1), L[8].y], s: s, sI: sc.I, sOne: sc.one });
    while (this.hist.length && t - this.hist[0].t > this.motionWindowMs) this.hist.shift();

    var label = (c.top.score >= this.minScore && c.top.score - c.second.score >= this.margin) ? c.top.letter : null;
    var ambiguous = !label && c.top.score >= this.minScore;

    // --- J and Z: drawn in the air
    var mo = this._motionLetter();
    if (mo && !(this.locked && this.locked.letter === mo)) {
      // `base` = the handshape the motion is drawn with; the lock holds while that shape carries on moving, so one J is one J
      this.locked = { letter: mo, base: mo === "J" ? "I" : "1" }; this.cand = null; this.hist = []; this.diff = 0;
      return { event: "letter", letter: mo, score: 0.7, motion: true };
    }

    // --- already typed this letter: wait for the hand to leave or the shape to change
    if (this.locked) {
      if (label && label !== this.locked.letter && label !== this.locked.base) { if (++this.diff >= 3) { this.locked = null; this.diff = 0; } }
      else this.diff = 0;
      if (this.locked) return { event: "held", letter: this.locked.letter };
    }

    // --- hold a still handshape
    if (label) {
      if (this.cand && this.cand.letter === label) this.cand.last = t;
      else this.cand = { letter: label, since: t, last: t };
    } else if (this.cand && t - this.cand.last > this.graceMs) this.cand = null;

    var moving = this._travel(this.holdMs) > this.moveMax;
    if (!this.cand) return { event: "seen", ambiguous: ambiguous, seen: c.top.letter, moving: moving };
    if (moving) { this.cand.since = t; return { event: "candidate", letter: this.cand.letter, score: c.top.score, progress: 0, moving: true }; }
    var progress = Math.min(1, (t - this.cand.since) / this.holdMs);
    if (progress >= 1 && !(letters && this.cand.letter === "1")) {   // in letters mode "1" is only the start of a Z; in digits mode it is the number one
      var out = { event: "letter", letter: this.cand.letter, score: c.top.score };
      this.locked = { letter: this.cand.letter }; this.cand = null; this.diff = 0;
      return out;
    }
    return { event: "candidate", letter: this.cand.letter, score: c.top.score, progress: progress, moving: false };
  };

  // hand travel over the last `ms`, in palm lengths
  LetterStream.prototype._travel = function (ms) {
    var h = this.hist, t1 = h.length ? h[h.length - 1].t : 0, seg = h.filter(function (x) { return t1 - x.t <= ms; });
    if (seg.length < 2) return 0;
    var meanS = seg.reduce(function (a, x) { return a + x.s; }, 0) / seg.length;
    return pathLen(seg.map(function (x) { return x.w; })) / meanS;
  };

  LetterStream.prototype._motionLetter = function () {
    if (this.kind !== "letters") return null;
    var h = this.hist; if (h.length < 8 || h[h.length - 1].t - h[0].t < 600) return null;
    var meanS = h.reduce(function (a, x) { return a + x.s; }, 0) / h.length, n = h.length;
    var fracI = h.filter(function (x) { return x.sI >= 0.5; }).length / n;
    var fracOne = h.filter(function (x) { return x.sOne >= 0.5; }).length / n;
    if (fracI >= 0.7 && pathLen(h.map(function (x) { return x.pk; })) / meanS >= 1.1) return "J";   // pinky up, tip travels: J
    if (fracOne >= 0.7) {
      var path = pathLen(h.map(function (x) { return x.ix; })) / meanS;
      if (path >= 1.8 && reversals(h.map(function (x) { return x.ix[0]; }), 0.35 * meanS) >= 2) return "Z"; // index points and zig-zags: Z
    }
    return null;
  };

  return {
    STATIC_LETTERS: STATIC_LETTERS, MOTION_LETTERS: MOTION_LETTERS, ALL_LETTERS: STATIC_LETTERS.concat(MOTION_LETTERS).sort(),
    DIGITS: DIGITS, measure: measure, classifyLetter: classifyLetter, classifyDigit: classifyDigit, LetterStream: LetterStream, _reversals: reversals
  };
});
