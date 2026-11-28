/*
 * SYNTHETIC ASL-alphabet hand skeletons for test-sign-letters.js (generated geometry, NOT camera frames, NOT real hands).
 *
 * A small forward-kinematics hand with human-like proportions (wrist -> middle knuckle = 1). Fingers are described by
 * how much each joint bends; the thumb by where its three joints sit. Poses follow the published shape of each letter.
 * This checks that the rules in assets/sign-letters.js are self-consistent and distinct. It cannot prove they match a
 * real person's hand: that needs a real camera.
 *
 * Local axes: X across the hand (thumb side negative), Y toward the fingertips, Z out of the palm toward the camera.
 */
(function (root, factory) { if (typeof module === "object" && module.exports) module.exports = factory(); else root.LetterHands = factory(); })(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var RAD = Math.PI / 180;
  var MCP = { I: [-0.30, 0.95], M: [0, 1.0], R: [0.27, 0.95], P: [0.52, 0.85] };
  var LEN = { I: [0.43, 0.24, 0.21], M: [0.47, 0.27, 0.23], R: [0.43, 0.25, 0.20], P: [0.32, 0.17, 0.16] };
  var CMC = [-0.25, 0.15, 0.05];

  var STR = [0, 0, 0], FIST = [90, 95, 60], CURVE = [35, 40, 25], CLAW = [60, 80, 45], HOOK = [40, 80, 5];

  /** finger: bends [a1,a2,a3] in degrees (toward the palm), spread in degrees. Returns 4 points MCP,PIP,DIP,TIP (local). */
  function finger(key, bends, spread) {
    var p = [MCP[key][0], MCP[key][1], 0], out = [p.slice()], th = 0, a = (spread || 0) * RAD;
    for (var j = 0; j < 3; j++) {
      th += bends[j] * RAD;
      var d = [Math.sin(a) * Math.cos(th * 0), Math.cos(a) * Math.cos(th), Math.cos(a) * Math.sin(th)];
      p = [p[0] + d[0] * LEN[key][j], p[1] + d[1] * LEN[key][j], p[2] + d[2] * LEN[key][j]]; out.push(p.slice());
    }
    return out;
  }
  function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function avg(a, b) { return lerp(a, b, 0.5); }

  /** thumb given as its three joint positions MCP, IP, TIP (local). */
  function thumb(mcp, ip, tip) { return [CMC.slice(), mcp, ip, tip]; }

  var TH = {
    A: thumb([-0.50, 0.40, 0.10], [-0.58, 0.68, 0.20], [-0.62, 0.95, 0.20]),
    FRONT: thumb([-0.40, 0.35, 0.20], [-0.20, 0.70, 0.50], [-0.05, 0.90, 0.62]),    // S: across the front of the fingers
    T: thumb([-0.40, 0.35, 0.20], [-0.28, 0.72, 0.38], [-0.15, 0.95, 0.40]),         // between index and middle
    N: thumb([-0.38, 0.35, 0.20], [-0.10, 0.72, 0.38], [0.13, 0.95, 0.40]),          // between middle and ring
    M: thumb([-0.36, 0.35, 0.20], [0.10, 0.70, 0.36], [0.39, 0.88, 0.33]),           // between ring and pinky
    PALM: thumb([-0.38, 0.30, 0.12], [-0.12, 0.45, 0.14], [0.12, 0.65, 0.15]),       // folded across the palm (B)
    OUT: thumb([-0.50, 0.40, 0.00], [-0.80, 0.50, 0.00], [-1.05, 0.55, 0.00]),       // stuck out to the side (L, Y)
    SIDE: thumb([-0.45, 0.45, 0.20], [-0.42, 0.75, 0.22], [-0.40, 1.00, 0.22]),      // parallel to the index finger (G, Q)
    OPPOSE: thumb([-0.55, 0.42, 0.20], [-0.78, 0.60, 0.35], [-0.78, 0.95, 0.45])     // curved opposite the fingers (C)
  };

  function pose(f, th) { return { f: f, th: th }; }
  var NOTHUMB_FIST = { I: FIST, M: FIST, R: FIST, P: FIST };

  // Each letter: finger bends/spread + thumb. "rot" turns the whole hand in the picture (degrees, + = clockwise).
  function letterPose(L) {
    var fi = function (b, s) { return b; };
    switch (L) {
      case "A": return { f: { I: FIST, M: FIST, R: FIST, P: FIST }, th: TH.A };
      case "S": return { f: { I: FIST, M: FIST, R: FIST, P: FIST }, th: TH.FRONT };
      case "T": return { f: { I: FIST, M: FIST, R: FIST, P: FIST }, th: TH.T };
      case "N": return { f: { I: FIST, M: FIST, R: FIST, P: FIST }, th: TH.N };
      case "M": return { f: { I: FIST, M: FIST, R: FIST, P: FIST }, th: TH.M };
      case "B": return { f: { I: STR, M: STR, R: STR, P: STR }, th: TH.PALM };
      case "I": return { f: { I: FIST, M: FIST, R: FIST, P: STR }, th: TH.FRONT };
      case "Y": return { f: { I: FIST, M: FIST, R: FIST, P: STR }, th: TH.OUT };
      case "L": return { f: { I: STR, M: FIST, R: FIST, P: FIST }, th: TH.OUT };
      case "G": return { f: { I: STR, M: FIST, R: FIST, P: FIST }, th: TH.SIDE, rot: 90 };
      case "Q": return { f: { I: STR, M: FIST, R: FIST, P: FIST }, th: TH.SIDE, rot: 180 };
      case "H": return { f: { I: STR, M: STR, R: FIST, P: FIST }, th: TH.FRONT, rot: 90 };
      case "U": return { f: { I: STR, M: STR, R: FIST, P: FIST }, th: TH.FRONT };
      case "V": return { f: { I: STR, M: STR, R: FIST, P: FIST }, th: TH.FRONT, spread: { I: -14, M: 14 } };
      case "R": return { f: { I: STR, M: STR, R: FIST, P: FIST }, th: TH.FRONT, spread: { I: 11, M: -11 } };
      case "W": return { f: { I: STR, M: STR, R: STR, P: FIST }, th: TH.FRONT, spread: { I: -16, M: 0, R: 16 } };
      case "X": return { f: { I: HOOK, M: FIST, R: FIST, P: FIST }, th: TH.FRONT };
      case "K": case "P": {
        var f = { I: STR, M: STR, R: FIST, P: FIST }, mp = finger("M", STR, 12)[1];
        return { f: f, spread: { I: -12, M: 12 }, th: thumb([-0.40, 0.45, 0.10], lerp([-0.40, 0.45, 0.10], mp, 0.6), [mp[0] - 0.05, mp[1] - 0.02, 0.08]), rot: L === "P" ? 180 : 0 };
      }
      case "D": { // index up; other fingers curved to meet the thumb
        var f2 = { I: STR, M: CLAW, R: CLAW, P: CLAW }, mt = finger("M", CLAW, 0)[3];
        return { f: f2, th: thumb([-0.40, 0.40, 0.20], lerp([-0.40, 0.40, 0.20], mt, 0.6), [mt[0] - 0.02, mt[1] - 0.04, mt[2] - 0.02]) };
      }
      case "F": { // index curled to meet the thumb, other three up
        var f3 = { I: [60, 70, 35], M: STR, R: STR, P: STR }, it = finger("I", f3.I, 0)[3];
        return { f: f3, th: thumb([-0.42, 0.40, 0.18], lerp([-0.42, 0.40, 0.18], it, 0.6), [it[0] - 0.01, it[1] - 0.04, it[2] - 0.02]) };
      }
      case "E": { // fingers clawed down onto the thumb
        var f4 = { I: CLAW, M: CLAW, R: CLAW, P: CLAW }, tips = [finger("I", CLAW, 0)[3], finger("M", CLAW, 0)[3], finger("R", CLAW, 0)[3]];
        var tgt = lerp(avg(tips[0], tips[1]), tips[2], 0.3);
        return { f: f4, th: thumb([-0.40, 0.38, 0.18], lerp([-0.40, 0.38, 0.18], tgt, 0.6), [tgt[0], tgt[1] - 0.05, tgt[2] - 0.03]) };
      }
      case "O": { // all fingertips meeting the thumb tip
        var f5 = { I: [45, 45, 30], M: [45, 45, 30], R: [45, 45, 30], P: [45, 45, 30] }, ot = [finger("I", f5.I, 0)[3], finger("M", f5.M, 0)[3]];
        var tg = avg(ot[0], ot[1]);
        return { f: f5, th: thumb([-0.45, 0.40, 0.15], lerp([-0.45, 0.40, 0.15], tg, 0.6), [tg[0] - 0.03, tg[1] - 0.04, tg[2] - 0.02]) };
      }
      case "C": return { f: { I: CURVE, M: CURVE, R: CURVE, P: CURVE }, th: TH.OPPOSE };
      case "1": return { f: { I: STR, M: FIST, R: FIST, P: FIST }, th: TH.FRONT };
      // ASL numbers (the letter poses cover 0 = O and 1 above)
      case "0": return letterPose("O");
      case "2": return { f: { I: STR, M: STR, R: FIST, P: FIST }, th: TH.FRONT, spread: { I: -10, M: 10 } };
      case "3": return { f: { I: STR, M: STR, R: FIST, P: FIST }, th: TH.OUT, spread: { I: -6, M: 6 } };
      case "4": return { f: { I: STR, M: STR, R: STR, P: STR }, th: TH.PALM, spread: { I: -10, M: -3, R: 4, P: 12 } };
      case "5": return { f: { I: STR, M: STR, R: STR, P: STR }, th: TH.OUT, spread: { I: -10, M: -3, R: 4, P: 12 } };
      case "6": case "7": case "8": case "9": {   // thumb tip meets the pinky (6), ring (7), middle (8) or index (9) tip; the other three stand up
        var k = { "6": "P", "7": "R", "8": "M", "9": "I" }[L], bent = [60, 70, 35];
        var fs = { I: STR, M: STR, R: STR, P: STR }; fs[k] = bent;
        var sp = { I: -8, M: -2, R: 4, P: 10 }, tip = finger(k, bent, sp[k])[3];
        return { f: fs, spread: sp, th: thumb([-0.42, 0.40, 0.18], lerp([-0.42, 0.40, 0.18], tip, 0.6), [tip[0] - 0.01, tip[1] - 0.04, tip[2] - 0.02]) };
      }
      case "?": return { f: { I: [30, 20, 10], M: [70, 10, 60], R: [10, 50, 5], P: [85, 30, 20] }, th: TH.OUT };   // a shape that is no letter
    }
    throw new Error("no pose for " + L);
  }

  /**
   * Landmarks (21) for a letter. o: { cx, cy, size (palm length in image height units), aspect, rot (extra degrees), mirror, noise, flex: {key:bends} }
   */
  var seed = 7; function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
  function hand(letter, o) {
    o = o || {};
    var pz = letterPose(letter), size = o.size || 0.2, aspect = o.aspect || 1, cx = o.cx === undefined ? 0.5 : o.cx, cy = o.cy === undefined ? 0.6 : o.cy;
    var rot = ((pz.rot || 0) + (o.rot || 0)) * RAD, cr = Math.cos(rot), sr = Math.sin(rot), mir = o.mirror ? -1 : 1, nz = o.noise || 0;
    var pts = [[0, 0, 0]].concat(pz.th);
    ["I", "M", "R", "P"].forEach(function (k) { pts = pts.concat(finger(k, pz.f[k], (pz.spread && pz.spread[k]) || 0)); });
    return pts.map(function (p) {
      var X = p[0] * mir, Y = p[1], Z = p[2];
      var rx = X * cr + Y * sr, ry = -X * sr + Y * cr;            // in-plane rotation (clockwise on screen)
      var n = function () { return (rnd() - 0.5) * 2 * nz; };
      return { x: (cx + (rx * size) / aspect) + n() / aspect, y: cy - ry * size + n(), z: -(Z * size) / aspect + n() / aspect };
    });
  }
  /** The same hand moved so the wrist is at (x,y): handy for animating Z / J paths. */
  function at(letter, x, y, o) { return hand(letter, Object.assign({}, o, { cx: x, cy: y })); }

  return { hand: hand, at: at, letters: "ABCDEFGHIKLMNOPQRSTUVWXY".split(""), digits: "0123456789".split(""), rnd: rnd };
});
