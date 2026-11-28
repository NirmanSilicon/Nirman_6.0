/*
 * SANGAM pretrained sign-language model runtime (no DOM, no network: runs in the page, a Web Worker or Node).
 *
 * What this is
 *   A faithful JavaScript re-implementation of the inference path of AI4Bharat OpenHands' SL-GCN
 *   ("Decoupled GCN" encoder + linear classifier, https://github.com/AI4Bharat/OpenHands, Apache-2.0),
 *   so the checkpoints AI4Bharat released can run locally in the browser:
 *     - ISL: trained on INCLUDE (263 isolated Indian Sign Language words, CC BY 4.0)
 *     - ASL: trained on WLASL2000 (2000 isolated American Sign Language glosses, C-UDA, non-commercial)
 *   The weights are the published ones, unchanged. test-sign-model.js proves the outputs match PyTorch.
 *
 * What it is not
 *   - Not a sentence translator. Each model names ONE isolated sign per clip.
 *   - Not trained or evaluated by SANGAM. See docs/SIGN_LANGUAGE_MODEL_EVALUATION.md.
 *
 * Input contract (identical to OpenHands' pose pipeline)
 *   Per camera frame: MediaPipe Holistic landmarks laid out as 75 points
 *   [33 body pose, 21 left hand, 21 right hand], (x, y) in image coordinates 0..1; a part that was not
 *   detected is all zeros, exactly as OpenHands wrote its training data.
 *   Clip -> PoseSelect("mediapipe_holistic_minimal_27") -> CenterAndScaleNormalize(shoulders, clip level)
 *   -> tensor (C=2, T, V=27) -> SL-GCN -> logits.
 *   The "identical" claim above covers exactly that chain (PoseSelect -> CenterAndScaleNormalize -> SL-GCN), proven
 *   bit-identical to OpenHands' own transform classes and released PyTorch weights by test-sign-model.js's golden
 *   fixtures. It does NOT cover resampleToFps() below, which runs BEFORE this contract and has no OpenHands
 *   counterpart at all: OpenHands' own released configs for this exact model
 *   (examples/configs/{include,wlasl}/decoupled_gcn.yaml in AI4Bharat/OpenHands) have `PoseTemporalSubsample`
 *   commented out in both their train and test pipelines, so the authors fed the model every pose frame their
 *   fixed-fps source video files produced, at that video's native rate, completely unresampled - never a live,
 *   variable-rate camera stream. resampleToFps() is SANGAM's own addition to cope with a live browser camera +
 *   on-device MediaPipe inference, whose effective frame rate is not fixed and can vary with CPU load; it is not
 *   "parity" with anything OpenHands did, and the "targetFps" value each model manifest carries is SANGAM's own
 *   assumption about that model's source dataset's native capture rate, not a number confirmed from the dataset's
 *   own documentation (INCLUDE's and WLASL2000's exact recording frame rates were not obtainable from any source
 *   reachable in this project's environment - see docs/SIGN_LANGUAGE_MODEL_EVALUATION.md). Whether resampling
 *   helps, hurts, or is neutral for real predictions is unverified and is exactly the kind of question a real
 *   recorded-reference-video test (Category C) can start to answer empirically.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SangamSignModel = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Minimum tracked frames classify() will ever turn into a "match"/"ambiguous" verdict, below the trivial
  // "frames.length < 2" guard already there. Found necessary by a real end-to-end test (test-sign-video.js): with
  // only 2 real tracked frames (a degenerate case - e.g. a stalled/throttled frame-extraction loop, or a very brief
  // spurious detection), classify() could and did return a HIGH-CONFIDENCE "match" from what was objectively noise
  // (MediaPipe Holistic producing a transient false-positive detection on non-human test-pattern video). A 2-frame
  // "sequence" carries essentially no real temporal signal for a GCN whose whole point is temporal structure, and
  // OpenHands' own training data never contained anything that short (every source video was several seconds at
  // the source's native frame rate - see docs/SIGN_LANGUAGE_MODEL_EVALUATION.md's "temporal resampling" discussion).
  // This matches E.Segmenter's own `minFrames` default (8) in assets/sign-engine.js, which already discards
  // too-short segments before they would reach a classify() call in the normal camera-dialog flow - this constant
  // enforces the same floor at the model-inference boundary itself, for any caller, not just that one call site.
  var MIN_CLASSIFY_FRAMES = 8;

  // OpenHands PoseSelect preset "mediapipe_holistic_minimal_27" (indices into the 75-point layout)
  var MINIMAL_27 = [0, 2, 5, 11, 12, 13, 14, 33, 37, 38, 41, 42, 45, 46, 49, 50, 53, 54, 58, 59, 62, 63, 66, 67, 70, 71, 74];
  // CenterAndScaleNormalize preset "shoulder_mediapipe_holistic_minimal_27": the two shoulders, after selection
  var SHOULDERS = [3, 4];
  var POINTS_75 = 75, V = 27, C = 2, BN_EPS = 1e-5;

  /* ================================================================ preprocessing */

  /**
   * Pick frames at a fixed rate by nearest timestamp (no interpolation, so a hand that was not detected is never
   * "half there"). frames: array of Float32Array(150) [x0,y0,x1,y1,...] for the 75 points; times: ms.
   */
  function resampleToFps(frames, times, fps) {
    if (!frames.length) return [];
    if (!fps || frames.length < 2) return frames.slice();
    var t0 = times[0], t1 = times[times.length - 1], step = 1000 / fps;
    var n = Math.max(1, Math.floor((t1 - t0) / step) + 1), out = [], j = 0;
    for (var i = 0; i < n; i++) {
      var t = t0 + i * step;
      while (j + 1 < times.length && Math.abs(times[j + 1] - t) <= Math.abs(times[j] - t)) j++;
      out.push(frames[j]);
    }
    return out;
  }

  /**
   * Make the camera's x:y geometry match the training videos'. Holistic gives x as a fraction of width and y as a
   * fraction of height, so a 4:3 camera and a 16:9 training video disagree about shape. OpenHands normalises by
   * shoulder width but does not undo this, so we do: x is scaled by (camera aspect / reference aspect).
   * A zero (undetected) point stays zero.
   */
  function correctAspect(frame, cameraAspect, referenceAspect) {
    if (!cameraAspect || !referenceAspect || Math.abs(cameraAspect / referenceAspect - 1) < 1e-3) return frame;
    var k = cameraAspect / referenceAspect, out = new Float32Array(frame.length);
    for (var i = 0; i < frame.length; i += 2) {
      var x = frame[i], y = frame[i + 1];
      if (x === 0 && y === 0) continue;
      out[i] = x * k; out[i + 1] = y;
    }
    return out;
  }

  /** frames (each Float32Array(150)) -> { data: Float32Array(C*T*V) in C,T,V order, T, normalised: bool } */
  function preprocess(frames) {
    var T = frames.length, data = new Float32Array(C * T * V), t, v, c;
    for (t = 0; t < T; t++) for (v = 0; v < V; v++) {
      var src = MINIMAL_27[v] * 2;
      data[0 * T * V + t * V + v] = frames[t][src];
      data[1 * T * V + t * V + v] = frames[t][src + 1];
    }
    // CenterAndScaleNormalize, clip level (frame_level=False), scale_factor 1 - same arithmetic as OpenHands
    var a = SHOULDERS[0], b = SHOULDERS[1], center = [0, 0], dist = 0;
    for (t = 0; t < T; t++) {
      var ax = data[t * V + a], ay = data[T * V + t * V + a], bx = data[t * V + b], by = data[T * V + t * V + b];
      center[0] += (ax + bx) / 2; center[1] += (ay + by) / 2;
      dist += Math.sqrt((ax - bx) * (ax - bx) + (ay - by) * (ay - by));
    }
    center[0] /= T; center[1] /= T; dist /= T;
    var scale = 1 / dist;
    if (!isFinite(scale)) return { data: data, T: T, normalised: false }; // OpenHands: "Do not normalize"
    for (c = 0; c < C; c++) for (t = 0; t < T; t++) for (v = 0; v < V; v++) {
      var i = c * T * V + t * V + v; data[i] = (data[i] - center[c]) * scale;
    }
    return { data: data, T: T, normalised: true };
  }

  /* ================================================================ network */

  function bnFold(w, prefix) {
    var g = w(prefix + ".weight"), b = w(prefix + ".bias"), m = w(prefix + ".running_mean"), v = w(prefix + ".running_var");
    var n = g.length, s = new Float32Array(n), sh = new Float32Array(n);
    for (var i = 0; i < n; i++) { s[i] = g[i] / Math.sqrt(v[i] + BN_EPS); sh[i] = b[i] - m[i] * s[i]; }
    return { scale: s, shift: sh };
  }
  function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

  /** Build an SL-GCN from model.json `spec` and a Float32Array holding every tensor (offsets in spec.tensors). */
  function SLGCN(spec, weights) {
    if (spec.architecture !== "openhands-sl-gcn") throw new Error("Unsupported architecture " + spec.architecture);
    function w(name) {
      var t = spec.tensors[name]; if (!t) throw new Error("Model file is missing tensor " + name);
      var n = t.shape.reduce(function (x, y) { return x * y; }, 1);
      if (t.offset + n > weights.length) throw new Error("Model weights are truncated at " + name);
      return weights.subarray(t.offset, t.offset + n);
    }
    var P = "model.encoder.";
    this.numClass = spec.numClass; this.groups = spec.groups || 8;
    // input BatchNorm1d over V*C channels (channel index = v*C + c)
    this.dataBn = bnFold(w, P + "data_bn");
    var self = this;
    this.layers = spec.layers.map(function (L) {
      var p = P + L.name + ".", cout = L.out, cin = L.in, G = self.groups;
      var lay = { name: L.name, cin: cin, cout: cout, stride: L.stride, residual: L.residual };
      // GCN: linear (cin -> 3*cout) + bias, folded with bn0
      var lw = w(p + "gcn1.linear_weight"), lb = w(p + "gcn1.linear_bias"), bn0 = bnFold(w, p + "gcn1.bn0");
      var K3 = 3 * cout, W = new Float32Array(cin * K3), B = new Float32Array(K3), i, d;
      for (d = 0; d < K3; d++) { B[d] = lb[d] * bn0.scale[d] + bn0.shift[d]; for (i = 0; i < cin; i++) W[i * K3 + d] = lw[i * K3 + d] * bn0.scale[d]; }
      lay.gW = W; lay.gB = B;
      // learned, column-normalised adjacency per subset k and group g: A[c,i,w] / (sum_i A[c,i,w] + 0.001)
      var A = w(p + "gcn1.decoupled_A"), An = new Float32Array(3 * G * V * V);
      for (var k = 0; k < 3; k++) for (var g = 0; g < G; g++) {
        var base = (k * G + g) * V * V;
        for (var col = 0; col < V; col++) {
          var s = 0; for (var row = 0; row < V; row++) s += A[base + row * V + col];
          var inv = 1 / (s + 0.001);
          for (row = 0; row < V; row++) An[base + row * V + col] = Math.fround(A[base + row * V + col] * inv);
        }
      }
      lay.An = An;
      lay.gBn = bnFold(w, p + "gcn1.bn");
      if (cin !== cout) { lay.downW = w(p + "gcn1.down.0.weight"); lay.downB = w(p + "gcn1.down.0.bias"); lay.downBn = bnFold(w, p + "gcn1.down.1"); }
      // attention
      lay.saW = w(p + "conv_sa.weight"); lay.saB = w(p + "conv_sa.bias")[0]; lay.saK = spec.tensors[p + "conv_sa.weight"].shape[2];
      lay.taW = w(p + "conv_ta.weight"); lay.taB = w(p + "conv_ta.bias")[0]; lay.taK = spec.tensors[p + "conv_ta.weight"].shape[2];
      lay.f1W = w(p + "fc1c.weight"); lay.f1B = w(p + "fc1c.bias"); lay.f2W = w(p + "fc2c.weight"); lay.f2B = w(p + "fc2c.bias");
      // temporal conv (9x1) + bn
      lay.tW = w(p + "tcn1.conv.weight"); lay.tB = w(p + "tcn1.conv.bias"); lay.tBn = bnFold(w, p + "tcn1.bn");
      lay.tK = spec.tensors[p + "tcn1.conv.weight"].shape[2];
      if (L.residual === "conv") { lay.rW = w(p + "residual.conv.weight"); lay.rB = w(p + "residual.conv.bias"); lay.rBn = bnFold(w, p + "residual.bn"); }
      return lay;
    });
    this.clsW = w("model.decoder.classifier.weight"); this.clsB = w("model.decoder.classifier.bias");
    this.featDim = spec.layers[spec.layers.length - 1].out;
  }

  // C (M rows x N, row-major, starting at cOff) += A (M x R) * B (R rows x N, row-major from 0), with A(m, r) read through aAt.
  // Every convolution below is this one multiply, and it is where almost all the time goes. It works on 4 output rows x 4 input
  // rows at a time so each loaded value is used several times (the matrices are bigger than the CPU cache). The summation order
  // differs from a naive loop by float rounding only; test-sign-model.js checks parity with PyTorch's outputs.
  function gemm(C, cOff, M, N, B, R, aAt) {
    var m = 0, r, j;
    for (; m + 3 < M; m += 4) {
      var o0 = cOff + m * N, o1 = o0 + N, o2 = o1 + N, o3 = o2 + N;
      for (r = 0; r + 3 < R; r += 4) {
        var b0 = r * N, b1 = b0 + N, b2 = b1 + N, b3 = b2 + N;
        var a00 = aAt(m, r), a01 = aAt(m, r + 1), a02 = aAt(m, r + 2), a03 = aAt(m, r + 3);
        var a10 = aAt(m + 1, r), a11 = aAt(m + 1, r + 1), a12 = aAt(m + 1, r + 2), a13 = aAt(m + 1, r + 3);
        var a20 = aAt(m + 2, r), a21 = aAt(m + 2, r + 1), a22 = aAt(m + 2, r + 2), a23 = aAt(m + 2, r + 3);
        var a30 = aAt(m + 3, r), a31 = aAt(m + 3, r + 1), a32 = aAt(m + 3, r + 2), a33 = aAt(m + 3, r + 3);
        for (j = 0; j < N; j++) {
          var x0 = B[b0 + j], x1 = B[b1 + j], x2 = B[b2 + j], x3 = B[b3 + j];
          C[o0 + j] += a00 * x0 + a01 * x1 + a02 * x2 + a03 * x3;
          C[o1 + j] += a10 * x0 + a11 * x1 + a12 * x2 + a13 * x3;
          C[o2 + j] += a20 * x0 + a21 * x1 + a22 * x2 + a23 * x3;
          C[o3 + j] += a30 * x0 + a31 * x1 + a32 * x2 + a33 * x3;
        }
      }
      for (; r < R; r++) {                                  // leftover input rows (the 2-channel first layer)
        var bb = r * N, c0 = aAt(m, r), c1 = aAt(m + 1, r), c2 = aAt(m + 2, r), c3 = aAt(m + 3, r);
        for (j = 0; j < N; j++) { var xv = B[bb + j]; C[o0 + j] += c0 * xv; C[o1 + j] += c1 * xv; C[o2 + j] += c2 * xv; C[o3 + j] += c3 * xv; }
      }
    }
    for (; m < M; m++) {                                    // leftover output rows
      var oo = cOff + m * N;
      for (r = 0; r < R; r++) { var w = aAt(m, r); if (w === 0) continue; var bq = r * N; for (j = 0; j < N; j++) C[oo + j] += w * B[bq + j]; }
    }
  }

  // x: Float32Array(cin*T*V) -> Float32Array(cout*T*V) GCN unit (eval mode)
  function gcnUnit(lay, x, T) {
    var cin = lay.cin, cout = lay.cout, TV = T * V, K3 = 3 * cout, G = lay.An.length / (3 * V * V);
    var h = new Float32Array(K3 * TV), d, i, j;
    for (d = 0; d < K3; d++) { var o = d * TV, bias = lay.gB[d]; for (j = 0; j < TV; j++) h[o + j] = bias; }
    gemm(h, 0, K3, TV, x, cin, function (m, r) { return lay.gW[r * K3 + m]; });
    var y = new Float32Array(cout * TV), c, t, v, wcol, k;
    for (k = 0; k < 3; k++) for (c = 0; c < cout; c++) {
      var Ab = (k * G + (c % G)) * V * V, ho = (k * cout + c) * TV, yo = c * TV;
      for (t = 0; t < T; t++) {
        var hr = ho + t * V, yr = yo + t * V;
        for (v = 0; v < V; v++) {
          var hv = h[hr + v]; if (hv === 0) continue;
          var ar = Ab + v * V;
          for (wcol = 0; wcol < V; wcol++) y[yr + wcol] += hv * lay.An[ar + wcol];
        }
      }
    }
    // bn, + down(x0), relu
    var dnAll = null;
    if (lay.downW) {   // 1x1 "down" convolution of the input, all output channels at once
      dnAll = new Float32Array(cout * TV);
      for (c = 0; c < cout; c++) for (j = 0; j < TV; j++) dnAll[c * TV + j] = lay.downB[c];
      gemm(dnAll, 0, cout, TV, x, cin, function (m, r) { return lay.downW[m * cin + r]; });
    }
    for (c = 0; c < cout; c++) {
      var s = lay.gBn.scale[c], sh = lay.gBn.shift[c], yo2 = c * TV;
      if (lay.downW) {
        var ds = lay.downBn.scale[c], dsh = lay.downBn.shift[c];
        for (j = 0; j < TV; j++) { var val = y[yo2 + j] * s + sh + (dnAll[yo2 + j] * ds + dsh); y[yo2 + j] = val > 0 ? val : 0; }
      } else {
        for (j = 0; j < TV; j++) { var val2 = y[yo2 + j] * s + sh + x[yo2 + j]; y[yo2 + j] = val2 > 0 ? val2 : 0; }
      }
    }
    return y;
  }

  function attention(lay, y, T) {
    var C_ = lay.cout, TV = T * V, c, t, v, j;
    // spatial: mean over T -> (C,V), conv1d over V, sigmoid
    var se = new Float32Array(C_ * V);
    for (c = 0; c < C_; c++) for (t = 0; t < T; t++) for (v = 0; v < V; v++) se[c * V + v] += y[c * TV + t * V + v];
    for (j = 0; j < se.length; j++) se[j] /= T;
    var K = lay.saK, pad = (K - 1) >> 1, sa = new Float32Array(V);
    for (v = 0; v < V; v++) {
      var acc = lay.saB;
      for (c = 0; c < C_; c++) for (var q = 0; q < K; q++) { var vv = v + q - pad; if (vv >= 0 && vv < V) acc += lay.saW[c * K + q] * se[c * V + vv]; }
      sa[v] = sigmoid(acc);
    }
    for (c = 0; c < C_; c++) for (t = 0; t < T; t++) for (v = 0; v < V; v++) { var ii = c * TV + t * V + v; y[ii] = y[ii] * sa[v] + y[ii]; }
    // temporal: mean over V -> (C,T), conv1d over T
    var st = new Float32Array(C_ * T);
    for (c = 0; c < C_; c++) for (t = 0; t < T; t++) { var s2 = 0; for (v = 0; v < V; v++) s2 += y[c * TV + t * V + v]; st[c * T + t] = s2 / V; }
    var K2 = lay.taK, pad2 = (K2 - 1) >> 1, ta = new Float32Array(T);
    for (t = 0; t < T; t++) {
      var acc2 = lay.taB;
      for (c = 0; c < C_; c++) for (var q2 = 0; q2 < K2; q2++) { var tt = t + q2 - pad2; if (tt >= 0 && tt < T) acc2 += lay.taW[c * K2 + q2] * st[c * T + tt]; }
      ta[t] = sigmoid(acc2);
    }
    for (c = 0; c < C_; c++) for (t = 0; t < T; t++) for (v = 0; v < V; v++) { var i3 = c * TV + t * V + v; y[i3] = y[i3] * ta[t] + y[i3]; }
    // channel: mean over T,V -> fc1 relu -> fc2 sigmoid
    var sc = new Float32Array(C_);
    for (c = 0; c < C_; c++) { var s3 = 0; for (j = 0; j < TV; j++) s3 += y[c * TV + j]; sc[c] = s3 / TV; }
    var H = lay.f1B.length, h1 = new Float32Array(H);
    for (j = 0; j < H; j++) { var a1 = lay.f1B[j]; for (c = 0; c < C_; c++) a1 += lay.f1W[j * C_ + c] * sc[c]; h1[j] = a1 > 0 ? a1 : 0; }
    for (c = 0; c < C_; c++) {
      var a2 = lay.f2B[c]; for (j = 0; j < H; j++) a2 += lay.f2W[c * H + j] * h1[j];
      var g = sigmoid(a2), o = c * TV;
      for (j = 0; j < TV; j++) y[o + j] = y[o + j] * g + y[o + j];
    }
    return y;
  }

  // temporal conv: (cin,T,V) -> (cout,T2,V), kernel K along T, padding (K-1)/2, stride s, then folded BN
  function tconv(W, B, bn, x, cin, cout, T, K, stride) {
    var pad = (K - 1) >> 1, T2 = Math.floor((T + 2 * pad - K) / stride) + 1, out = new Float32Array(cout * T2 * V), N = T2 * V, R = cin * K;
    // im2col: row (ci*K + q) holds, for every output step t2, the input row at t2*stride + q - pad (zeros outside the clip),
    // so each output channel becomes one long multiply-accumulate over contiguous rows instead of thousands of 27-long ones.
    var col = new Float32Array(R * N), ci, q, t2;
    for (ci = 0; ci < cin; ci++) for (q = 0; q < K; q++) {
      var cr = (ci * K + q) * N;
      for (t2 = 0; t2 < T2; t2++) {
        var ts = t2 * stride + q - pad; if (ts < 0 || ts >= T) continue;
        col.set(x.subarray(ci * T * V + ts * V, ci * T * V + ts * V + V), cr + t2 * V);
      }
    }
    var co, j;
    for (co = 0; co < cout; co++) for (j = 0; j < N; j++) out[co * N + j] = B[co];
    gemm(out, 0, cout, N, col, R, function (m, r) { return W[m * R + r]; });
    for (co = 0; co < cout; co++) {
      var s = bn.scale[co], sh = bn.shift[co], o = co * N;
      for (j = 0; j < N; j++) out[o + j] = out[o + j] * s + sh;
    }
    return { y: out, T: T2 };
  }

  /** xCTV: Float32Array(2*T*27), returns Float32Array(numClass) logits */
  SLGCN.prototype.forward = function (xCTV, T) {
    if (!(T >= 1) || xCTV.length !== C * T * V) throw new Error("Input must be 2 x T x 27 values");
    var x = new Float32Array(xCTV.length), c, t, v;
    // data_bn: channel = v*C + c
    for (c = 0; c < C; c++) for (t = 0; t < T; t++) for (v = 0; v < V; v++) {
      var ch = v * C + c, i = c * T * V + t * V + v;
      x[i] = xCTV[i] * this.dataBn.scale[ch] + this.dataBn.shift[ch];
    }
    var curT = T;
    for (var li = 0; li < this.layers.length; li++) {
      var lay = this.layers[li];
      var y = gcnUnit(lay, x, curT);
      y = attention(lay, y, curT);
      var tc = tconv(lay.tW, lay.tB, lay.tBn, y, lay.cout, lay.cout, curT, lay.tK, lay.stride);
      var outY = tc.y, T2 = tc.T, n = outY.length, j;
      if (lay.residual === "identity") { for (j = 0; j < n; j++) outY[j] += x[j]; }
      else if (lay.residual === "conv") { var r = tconv(lay.rW, lay.rB, lay.rBn, x, lay.cin, lay.cout, curT, 1, lay.stride).y; for (j = 0; j < n; j++) outY[j] += r[j]; }
      for (j = 0; j < n; j++) if (outY[j] < 0) outY[j] = 0;
      x = outY; curT = T2;
    }
    var D = this.featDim, TV = curT * V, feat = new Float32Array(D);
    for (c = 0; c < D; c++) { var s = 0; for (var k = 0; k < TV; k++) s += x[c * TV + k]; feat[c] = s / TV; }
    var logits = new Float32Array(this.numClass);
    for (var o = 0; o < this.numClass; o++) { var a = this.clsB[o]; for (c = 0; c < D; c++) a += this.clsW[o * D + c] * feat[c]; logits[o] = a; }
    return logits;
  };

  /* ================================================================ decision */

  /** Softmax over the allowed class indices only (others get 0). */
  function softmax(logits, allowed) {
    var p = new Float32Array(logits.length), m = -Infinity, i, idx = allowed || null;
    var each = function (fn) { if (idx) for (var q = 0; q < idx.length; q++) fn(idx[q]); else for (var r = 0; r < logits.length; r++) fn(r); };
    each(function (k) { if (logits[k] > m) m = logits[k]; });
    var s = 0; each(function (k) { p[k] = Math.exp(logits[k] - m); s += p[k]; });
    each(function (k) { p[k] /= s; });
    return p;
  }
  function topK(probs, k, allowed) {
    var idx = allowed ? allowed.slice() : Array.from({ length: probs.length }, function (_, i) { return i; });
    idx.sort(function (a, b) { return probs[b] - probs[a]; });
    return idx.slice(0, k).map(function (i) { return { index: i, p: probs[i] }; });
  }

  /**
   * Decide whether a prediction is trustworthy enough to put in the transcript.
   * minP / minMargin are product thresholds, NOT calibrated on real signers (no labelled test data was available
   * to SANGAM). They only keep obviously unsure predictions out; they cannot make the model "know" an unknown sign.
   */
  function decide(ranked, opts) {
    opts = opts || {};
    var minP = opts.minP != null ? opts.minP : 0.45, minMargin = opts.minMargin != null ? opts.minMargin : 0.15;
    if (!ranked.length) return { state: "none" };
    var top = ranked[0], second = ranked[1] || { p: 0 };
    if (top.p < minP) return { state: "unknown", reason: "low-confidence" };
    if (top.p - second.p < minMargin) return { state: "ambiguous", reason: "ambiguous" };
    return { state: "match" };
  }

  /* ================================================================ model loading */

  /** fetchFn(url) -> Promise<ArrayBuffer|Buffer>. Works with window.fetch or a Node polyfill given by the caller. */
  function loadModel(baseUrl, fetchFn) {
    var get = function (name, asJson) {
      return fetchFn(baseUrl + name).then(function (r) {
        if (r && typeof r.ok === "boolean" && !r.ok) throw new Error("Could not load " + baseUrl + name + " (HTTP " + r.status + ")");
        return asJson ? (r.json ? r.json() : JSON.parse(r.toString())) : (r.arrayBuffer ? r.arrayBuffer() : r);
      });
    };
    return get("model.json", true).then(function (spec) {
      if (spec.format !== "sangam-sign-model/1") throw new Error("Unsupported model file format \"" + spec.format + "\"");
      return get(spec.weightsFile, false).then(function (buf) {
        var bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(buf.buffer || buf, buf.byteOffset || 0, buf.byteLength || buf.length);
        if (bytes.length !== spec.weightsBytes) throw new Error("Model weights file is the wrong size (installation is incomplete or corrupted). Re-run the model installer.");
        var weights = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.length / 4);
        return { spec: spec, net: new SLGCN(spec, weights) };
      });
    });
  }

  /**
   * Adapter contract (matches assets/sign-engine.js TemplateAdapter/PersonalAdapter): load(), getSupportedLanguage(),
   * getSupportedVocabulary(), isAvailable(), classify(frames), dispose(). `frames` here are RAW MediaPipe Holistic
   * points (75 x {x,y}, undetected = null), not the hand-only normalised features sign-engine.js's own adapters use:
   * this adapter does its own preprocessing because the published model expects OpenHands' exact pipeline.
   */
  function PretrainedAdapter(baseUrl, fetchFn, opts) {
    this.baseUrl = baseUrl; this.fetchFn = fetchFn; this.opts = opts || {};
    this.spec = null; this.net = null; this.name = "Pretrained model";
  }
  PretrainedAdapter.prototype.load = function () {
    var self = this;
    return loadModel(this.baseUrl, this.fetchFn).then(function (r) {
      self.spec = r.spec; self.net = r.net;
      self.name = (r.spec.language || "Sign language") + " (" + r.spec.id + ")";
    });
  };
  PretrainedAdapter.prototype.getSupportedLanguage = function () {
    if (!this.spec) return "";
    return this.spec.language + ". Pretrained on " + (this.spec.id.indexOf("include") >= 0 ? "INCLUDE" : "WLASL2000") +
      ", isolated single signs only (no fingerspelling, no sentences). Not evaluated by SANGAM on real camera footage; see docs/SIGN_LANGUAGE_MODEL_EVALUATION.md.";
  };
  PretrainedAdapter.prototype.getSupportedVocabulary = function () {
    if (!this.spec) return [];
    var allow = this.opts.subset && this.spec.subsets[this.opts.subset];
    return (allow || this.spec.display.map(function (_, i) { return i; }).filter(function (i) { return this.spec.excluded.indexOf(i) < 0; }, this))
      .map(function (i) { return this.spec.display[i]; }, this);
  };
  PretrainedAdapter.prototype.isAvailable = function () { return !!this.net; };
  PretrainedAdapter.prototype.allowedIndices = function () {
    var s = this.spec;
    if (this.opts.subset && s.subsets[this.opts.subset]) return s.subsets[this.opts.subset];
    if (!s.excluded.length) return null; // null = "all classes", cheaper than building the full list
    var excl = {}; s.excluded.forEach(function (i) { excl[i] = true; });
    var out = []; for (var i = 0; i < s.numClass; i++) if (!excl[i]) out.push(i);
    return out;
  };
  /** One pass of the network over one clip -> class probabilities, or null when the shoulders were never seen (nothing to normalise by). */
  PretrainedAdapter.prototype._probs = function (frames, allowed) {
    var raw = frames.map(function (f) { return f.points; });
    var fps = this.spec.preprocessing.targetFps;
    var resampled = fps ? resampleToFps(raw, frames.map(function (f) { return f.t; }), fps) : raw;
    if (this.opts.cameraAspect && this.spec.preprocessing.referenceAspect) {
      resampled = resampled.map(function (f) { return correctAspect(f, this.opts.cameraAspect, this.spec.preprocessing.referenceAspect); }, this);
    }
    var pre = preprocess(resampled);
    if (!pre.normalised) return null;
    return softmax(this.net.forward(pre.data, pre.T), allowed);
  };
  function argmax(p, allowed) { var b = -1, i, n = allowed ? allowed.length : p.length; for (i = 0; i < n; i++) { var k = allowed ? allowed[i] : i; if (b < 0 || p[k] > p[b]) b = k; } return b; }

  /**
   * frames: array of { points: Float32Array(150) } (75 x,y pairs, 0 = not detected), one per tracked video frame.
   *
   * opts.views (default 1 = one pass, the original behaviour). With 2 or 3, the clip is also read with its edges trimmed
   * (2: the middle 70%; 3: without its first 20%, and without its last 20%) and a word is only accepted when EVERY pass names
   * the same word, using the averaged probabilities. Why: the network has no "this is not a sign" answer, so on hand movement
   * that is no sign it still names some word, often with high confidence (measured on generated non-sign movement: 82% of clips
   * typed a word at the default bar). A real sign tends to be named the same way however its edges are cut; arbitrary movement
   * does not. The extra passes only run when the first pass is already close to the confidence bar, so rejections stay fast.
   */
  PretrainedAdapter.prototype.classify = function (frames) {
    if (!this.net || frames.length < 2) return { state: "none", ranked: [] };
    if (frames.length < MIN_CLASSIFY_FRAMES) return { state: "unknown", reason: "too-few-frames", ranked: [] };
    var allowed = this.allowedIndices(), views = this.opts.views || 1;
    var probs = this._probs(frames, allowed);
    if (!probs) return { state: "unknown", reason: "no-reference-points", ranked: [] };
    var minP = this.opts.minP != null ? this.opts.minP : 0.45;
    if (views > 1 && probs[argmax(probs, allowed)] >= minP * 0.8) {
      var n = frames.length, cut = Math.max(1, Math.floor(n * 0.2));
      var trims = views === 2 ? [frames.slice(Math.floor(n * 0.15), n - Math.floor(n * 0.15))] : [frames.slice(cut), frames.slice(0, n - cut)];
      var top0 = argmax(probs, allowed), sum = Float32Array.from(probs), used = 1, i, j, p2;
      for (i = 0; i < trims.length; i++) {
        if (trims[i].length < MIN_CLASSIFY_FRAMES) continue;                  // too short to say anything: skip this view
        p2 = this._probs(trims[i], allowed);
        if (!p2) continue;
        if (argmax(p2, allowed) !== top0) {                                    // the answer changed when the edges were cut
          var unstable = topK(probs, 3, allowed).map(function (r) { return { label: this.spec.display[r.index], index: r.index, p: r.p }; }, this);
          return { state: "unknown", reason: "unstable", ranked: unstable, best: { closeness: unstable[0].p } };
        }
        for (j = 0; j < sum.length; j++) sum[j] += p2[j]; used++;
      }
      if (used > 1) for (j = 0; j < sum.length; j++) sum[j] /= used;
      probs = sum;
    }
    var ranked = topK(probs, 3, allowed).map(function (r) { return { label: this.spec.display[r.index], index: r.index, p: r.p }; }, this);
    var d = decide(ranked, this.opts);
    if (d.state === "match") return { state: "match", label: ranked[0].label, closeness: ranked[0].p, ranked: ranked, modelScore: ranked[0].p };
    if (d.state === "ambiguous") return { state: "ambiguous", ranked: ranked, best: { closeness: ranked[0].p } };
    return { state: "unknown", ranked: ranked, best: ranked[0] && { closeness: ranked[0].p } };
  };
  PretrainedAdapter.prototype.dispose = function () { this.net = null; };

  return {
    MINIMAL_27: MINIMAL_27, SHOULDERS: SHOULDERS, POINTS_75: POINTS_75, MIN_CLASSIFY_FRAMES: MIN_CLASSIFY_FRAMES,
    resampleToFps: resampleToFps, correctAspect: correctAspect, preprocess: preprocess,
    SLGCN: SLGCN, softmax: softmax, topK: topK, decide: decide,
    loadModel: loadModel, PretrainedAdapter: PretrainedAdapter
  };
});
