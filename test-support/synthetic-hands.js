/*
 * SYNTHETIC hand skeletons for tests (generated geometry, NOT camera frames and NOT real hands).
 * Used to drive the real matching engine through a mock hand source in test-sign-browser.js.
 * Works in Node (require) and in the page (window.SyntheticHands).
 */
(function (root, factory) { if (typeof module === "object" && module.exports) module.exports = factory(); else root.SyntheticHands = factory(); })(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var seed = 4242; function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
  function noise(a) { return (rnd() - 0.5) * 2 * a; }
  var OPEN = [0, 0, 0, 0, 0], FIST = [0.9, 1, 1, 1, 1], PEACE = [1, 0, 0, 1, 1], POINT = [1, 0, 1, 1, 1], THUMB = [0, 1, 1, 1, 1];
  function hand(cx, cy, curl, size, tilt) {
    var L = [{ x: cx, y: cy, z: 0 }], base = [-0.55, -0.28, 0, 0.26, 0.5];
    for (var f = 0; f < 5; f++) {
      var x = cx + base[f] * size * 0.8, y = cy - size * (f === 0 ? 0.6 : 1), ang = (f === 0 ? -0.8 : 0) + (tilt || 0);
      for (var j = 0; j < 4; j++) {
        L.push({ x: x, y: y, z: 0 });
        var seg = size * (f === 0 ? 0.35 : 0.45), bend = curl[f] * 1.4 * (j + 1) * 0.5;
        ang += (j ? bend : 0);
        x += Math.sin(ang) * seg; y -= Math.cos(ang) * seg * (1 - curl[f] * 0.8 * (j / 3));
      }
    }
    return { landmarks: L.map(function (p) { return { x: p.x + noise(0.002), y: p.y + noise(0.002), z: p.z + noise(0.002) }; }) };
  }
  var still = function () { return [0, 0]; }, right = function (t) { return [t, 0]; }, up = function (t) { return [0, -t]; };
  var SIGNS = { hello: { shape: OPEN, path: right }, wait: { shape: FIST, path: up }, peace: { shape: PEACE, path: still } };
  // Raw frames (what a hand tracker would report): an array of [ {landmarks:[21]} ] per frame.
  function frames(shape, path, o) {
    o = o || {}; var n = o.n || 20, size = o.size || 0.12, ox = o.ox || 0, oy = o.oy || 0, out = [];
    for (var i = 0; i < n; i++) { var t = i / (n - 1), p = path(t); out.push([hand(0.45 + ox + p[0] * size * 2, 0.6 + oy + p[1] * size * 2, shape, size, p[2] || 0)]); }
    return out;
  }
  function sign(name, o) { var d = SIGNS[name]; return frames(d.shape, d.path, o); }
  // A shape nobody taught: fast erratic motion with an unusual hand shape.
  function alien(o) { return frames([0.4, 0.2, 0.9, 0.1, 0.6], function (t) { return [Math.sin(t * 20) * 0.9, Math.cos(t * 13) * 0.9]; }, o || { n: 18 }); }
  return { hand: hand, frames: frames, sign: sign, alien: alien, SIGNS: SIGNS, rnd: rnd, noise: noise };
});
