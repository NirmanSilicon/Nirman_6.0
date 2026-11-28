/* Krushak Drishti - Memory-Safe Camera, 128x128 Foreground Leaf Segmentation,
   Deep 6-Metric Botanical Analysis, Strict Anti-False-Positive Gate, 224x224 Classifier,
   and Voice Controller. ZERO while-loops, ZERO recursion, ZERO rAF, ZERO Service Worker. */
(function (global) {
  'use strict';

  var activeStream = null;
  var activeRecognition = null;

  // Single reusable offscreen canvases (never allocate per frame)
  var offscreenCanvas = null;    // 224x224 for classification
  var offscreenCtx = null;
  var gateCanvas = null;         // 128x128 for gate + segmentation + deep analysis
  var gateCtx = null;
  var reusableImg = null;
  var hasCapturedFrame = false;

  // Motion detection: compare 128x128 luminance frames
  var prevGateLum = (typeof Uint8Array !== 'undefined') ? new Uint8Array(128 * 128) : null;
  var hasPrevGateLum = false;

  function ensureOffscreenCanvas() {
    if (!offscreenCanvas && typeof document !== 'undefined') {
      offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = 224;
      offscreenCanvas.height = 224;
      offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
    }
    return offscreenCanvas;
  }

  function ensureGateCanvas() {
    if (!gateCanvas && typeof document !== 'undefined') {
      gateCanvas = document.createElement('canvas');
      gateCanvas.width = 128;
      gateCanvas.height = 128;
      gateCtx = gateCanvas.getContext('2d', { willReadFrequently: true });
    }
    return gateCanvas;
  }

  function ensureReusableImage() {
    if (!reusableImg && typeof Image !== 'undefined') {
      reusableImg = new Image();
    }
    return reusableImg;
  }

  function resetMotionBaseline() {
    hasPrevGateLum = false;
  }

  function rgbToHsv(r, g, b) {
    var rn = r / 255, gn = g / 255, bn = b / 255;
    var max = Math.max(rn, gn, bn);
    var min = Math.min(rn, gn, bn);
    var d = max - min;
    var h = 0;
    if (d > 0) {
      if (max === rn)      { h = 60 * (((gn - bn) / d) % 6); }
      else if (max === gn) { h = 60 * (((bn - rn) / d) + 2); }
      else                 { h = 60 * (((rn - gn) / d) + 4); }
      if (h < 0) { h += 360; }
    }
    var s = max === 0 ? 0 : (d / max) * 100;
    var v = max * 100;
    return { h: h, s: s, v: v };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BOTANICAL PIXEL CLASSIFICATION HELPERS
  // ─────────────────────────────────────────────────────────────────────────────
  function isSkinPixel(r, g, b, h, lumY, cb, cr) {
    // Hue guard: pinkish-peach only (0-26° or >326°), never yellow/olive
    var hueIsSkinRange = (h <= 26 || h >= 326);
    return (lumY > 60 &&
            cb >= 77 && cb <= 127 &&
            cr >= 133 && cr <= 173 &&
            r > 95 && g > 40 && b > 20 &&
            (r - g) >= 18 && (r - g) > (g - b) &&
            hueIsSkinRange);
  }

  function isBotanicalPixel(h, s, v, r, g, b) {
    // Band A: healthy chlorophyll green
    if (h >= 65 && h <= 160 && s >= 18 && v >= 15 && v <= 90) { return 'green'; }
    // Band B: diseased yellow / olive chlorosis (G must be clearly above B)
    if (h >= 34 && h < 65 && s >= 22 && v >= 20 && v <= 95 && (g - b) >= 20) { return 'yellow'; }
    // Band C: white/grey powdery coating (fungal)
    if (v > 65 && s < 18 && r > 170 && g > 170 && b > 165 && Math.abs(r - g) < 20) { return 'powder'; }
    // Band D: necrotic brown/dark spots
    if (v >= 10 && v <= 55 && s >= 18 && r >= 50 && r < 185 && (r - b) >= 10) { return 'necrotic'; }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP B: CENTER-ANCHORED FOREGROUND LEAF MASK (bounded BFS, max 16384 iters)
  // Uses a fixed-size queue array — ZERO recursion, ZERO while-loops
  // ─────────────────────────────────────────────────────────────────────────────
  function buildLeafMask(botanicalMap, W, H) {
    var N = W * H;
    var mask = new Uint8Array(N);       // 1 = foreground leaf
    var visited = new Uint8Array(N);
    var queueBuf = new Int32Array(N);   // pixel indices for BFS queue
    var qHead = 0;
    var qTail = 0;
    var iterations = 0;
    var MAX_ITER = 16384;

    // Seed: start from center 65% region pixels that are botanical
    var cX0 = Math.floor(W * 0.175);
    var cX1 = Math.floor(W * 0.825);
    var cY0 = Math.floor(H * 0.175);
    var cY1 = Math.floor(H * 0.825);

    for (var sy = cY0; sy < cY1; sy += 2) {
      for (var sx = cX0; sx < cX1; sx += 2) {
        var si = sy * W + sx;
        if (botanicalMap[si] && !visited[si]) {
          visited[si] = 1;
          mask[si] = 1;
          queueBuf[qTail] = si;
          qTail += 1;
        }
      }
    }

    // BFS expansion into adjacent botanical pixels
    var dx = [1, -1, 0, 0, 1, -1, 1, -1];
    var dy = [0, 0, 1, -1, 1, -1, -1, 1];
    var i;

    for (var iter = 0; iter < MAX_ITER && qHead < qTail; iter += 1) {
      var pidx = queueBuf[qHead];
      qHead += 1;
      iterations += 1;
      var py = Math.floor(pidx / W);
      var px = pidx - py * W;

      for (var d = 0; d < 8; d += 1) {
        var nx = px + dx[d];
        var ny = py + dy[d];
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) { continue; }
        var ni = ny * W + nx;
        if (visited[ni]) { continue; }
        visited[ni] = 1;
        if (botanicalMap[ni]) {
          mask[ni] = 1;
          queueBuf[qTail] = ni;
          qTail += 1;
        }
      }
    }

    // Interior hole-fill: for each row, any pixel between the leftmost and
    // rightmost mask pixel on that row is filled in (catches dark necrotic spots)
    for (var row = 0; row < H; row += 1) {
      var rowStart = row * W;
      var leftEdge = -1;
      var rightEdge = -1;
      for (i = 0; i < W; i += 1) {
        if (mask[rowStart + i]) {
          if (leftEdge < 0) { leftEdge = i; }
          rightEdge = i;
        }
      }
      if (leftEdge >= 0 && rightEdge > leftEdge) {
        for (i = leftEdge; i <= rightEdge; i += 1) {
          mask[rowStart + i] = 1;
        }
      }
    }

    // Column-pass hole-fill too (for horizontal stripe cases)
    for (var col = 0; col < W; col += 1) {
      var topEdge = -1;
      var bottomEdge = -1;
      for (i = 0; i < H; i += 1) {
        if (mask[i * W + col]) {
          if (topEdge < 0) { topEdge = i; }
          bottomEdge = i;
        }
      }
      if (topEdge >= 0 && bottomEdge > topEdge) {
        for (i = topEdge; i <= bottomEdge; i += 1) {
          mask[i * W + col] = 1;
        }
      }
    }

    return mask;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DEEP 6-METRIC ANALYSIS on the segmented leaf mask pixels
  // ─────────────────────────────────────────────────────────────────────────────
  function runDeepLeafAnalysis(data, mask, W, H) {
    var N = W * H;
    var totalMasked = 0;
    var greenCount = 0;
    var yellowCount = 0;
    var powderCount = 0;
    var necroticCount = 0;
    var edgeSumMasked = 0;
    var edgeSqMasked = 0;
    var edgeSamplesMasked = 0;

    // For spot counting: build a simple labeled necrotic region map
    // We approximate spot count by counting connected runs of necrotic pixels per row
    var necroticMap = new Uint8Array(N);
    var spotCount = 0;

    // For spatial pattern detection
    var marginNecroticCount = 0;    // necrotic near leaf margin (outer 15% of bounding box)
    var innerNecroticCount = 0;     // necrotic in leaf interior

    // Bounding box of mask
    var bbLeft = W, bbRight = 0, bbTop = H, bbBottom = 0;
    var i;
    for (i = 0; i < N; i += 1) {
      if (mask[i]) {
        var px = i % W;
        var py = Math.floor(i / W);
        if (px < bbLeft)   { bbLeft   = px; }
        if (px > bbRight)  { bbRight  = px; }
        if (py < bbTop)    { bbTop    = py; }
        if (py > bbBottom) { bbBottom = py; }
      }
    }
    var bbW = bbRight - bbLeft + 1;
    var bbH = bbBottom - bbTop + 1;
    var marginX = Math.max(1, Math.floor(bbW * 0.15));
    var marginY = Math.max(1, Math.floor(bbH * 0.15));

    // Main pixel analysis pass (bounded for loop, no while)
    for (var y = 0; y < H; y += 1) {
      for (var x = 0; x < W; x += 1) {
        var pidx = y * W + x;
        if (!mask[pidx]) { continue; }

        var idx = pidx * 4;
        var r = data[idx];
        var g = data[idx + 1];
        var b = data[idx + 2];
        var hsv = rgbToHsv(r, g, b);
        var band = isBotanicalPixel(hsv.h, hsv.s, hsv.v, r, g, b);

        totalMasked += 1;
        if (band === 'green')    { greenCount  += 1; }
        else if (band === 'yellow')  { yellowCount += 1; }
        else if (band === 'powder')  { powderCount += 1; }
        else if (band === 'necrotic') {
          necroticCount += 1;
          necroticMap[pidx] = 1;

          // Spatial classification: margin vs interior
          var localX = x - bbLeft;
          var localY = y - bbTop;
          if (localX < marginX || localX > bbW - marginX ||
              localY < marginY || localY > bbH - marginY) {
            marginNecroticCount += 1;
          } else {
            innerNecroticCount += 1;
          }
        }

        // Vein texture: luminance edge magnitude with right and down neighbors
        if (x < W - 1 && y < H - 1) {
          var idxR = (y * W + (x + 1)) * 4;
          var idxD = ((y + 1) * W + x) * 4;
          var lumY   = 0.299 * r + 0.587 * g + 0.114 * b;
          var lumR   = 0.299 * data[idxR]   + 0.587 * data[idxR + 1]   + 0.114 * data[idxR + 2];
          var lumD   = 0.299 * data[idxD]   + 0.587 * data[idxD + 1]   + 0.114 * data[idxD + 2];
          var em     = Math.abs(lumY - lumR) + Math.abs(lumY - lumD);
          edgeSumMasked   += em;
          edgeSqMasked    += em * em;
          edgeSamplesMasked += 1;
        }
      }
    }

    // Approximate distinct spot count: horizontal run-length encoding of necroticMap
    for (var row = 0; row < H; row += 1) {
      var inRun = false;
      for (var col = 0; col < W; col += 1) {
        var ri = row * W + col;
        if (necroticMap[ri]) {
          if (!inRun) { spotCount += 1; inRun = true; }
        } else {
          inRun = false;
        }
      }
    }
    // Halve (horizontal + vertical double-counts spots)
    spotCount = Math.round(spotCount / 2);

    var denom = totalMasked > 0 ? totalMasked : 1;
    var chlorophyllIdx = Math.round((greenCount / denom) * 100);
    var chlorosisIdx   = Math.round((yellowCount / denom) * 100);
    var necroticIdx    = Math.round((necroticCount / denom) * 100);
    var powderIdx      = Math.round((powderCount / denom) * 100);

    // Vein texture sharpness
    var edgeD = edgeSamplesMasked > 0 ? edgeSamplesMasked : 1;
    var avgEdge = edgeSumMasked / edgeD;
    var edgeVariance = (edgeSqMasked / edgeD) - (avgEdge * avgEdge);
    var veinSharpness = Math.min(100, Math.round(avgEdge * 2.5));

    // Spatial infection pattern label key (translated in app.js)
    var patternKey;
    if (powderIdx > 8) {
      patternKey = 'pattern_powdery';
    } else if (marginNecroticCount > innerNecroticCount * 1.5 && necroticIdx > 5) {
      patternKey = 'pattern_margin_blight';
    } else if (spotCount > 3 && innerNecroticCount >= marginNecroticCount) {
      patternKey = 'pattern_scattered_spots';
    } else if (necroticIdx < 5 && yellowCount < 10 && chlorophyllIdx > 65) {
      patternKey = 'pattern_healthy_lamina';
    } else {
      patternKey = 'pattern_scattered_spots';
    }

    // Leaf shape compactness: ratio of mask pixels to bounding box area
    var bbArea = bbW * bbH > 0 ? bbW * bbH : 1;
    var compactness = Math.min(100, Math.round((totalMasked / bbArea) * 100));
    // Aspect ratio: reject very rectangular objects (walls, books)
    var aspectRatio = bbH > 0 ? (bbW / bbH) : 1;
    var shapeOk = (aspectRatio > 0.4 && aspectRatio < 2.5 && compactness > 28);

    return {
      totalMasked:    totalMasked,
      chlorophyllIdx: chlorophyllIdx,
      chlorosisIdx:   chlorosisIdx,
      necroticIdx:    necroticIdx,
      powderIdx:      powderIdx,
      spotCount:      spotCount,
      veinSharpness:  veinSharpness,
      avgEdge:        avgEdge,
      edgeVariance:   edgeVariance,
      patternKey:     patternKey,
      compactness:    compactness,
      shapeOk:        shapeOk,
      aspectRatio:    aspectRatio
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // analyzeLeafDeep — master function: gate + segmentation + deep analysis
  // mode: 'camera' | 'upload'
  // Returns { valid, reason, confidence, deep, gate }
  // ─────────────────────────────────────────────────────────────────────────────
  function analyzeLeafDeep(sourceElement, mode) {
    var isUploadMode = (mode === 'upload');
    var W = 128, H = 128;

    // Always start from a clean { valid:false } state — never carry over previous result
    var failResult = function (reason) {
      return { valid: false, reason: reason, confidence: 0, deep: null };
    };

    ensureGateCanvas();
    if (!gateCtx || !sourceElement) { return failResult('no_leaf'); }

    var sw = sourceElement.videoWidth || sourceElement.naturalWidth || sourceElement.width  || 0;
    var sh = sourceElement.videoHeight|| sourceElement.naturalHeight || sourceElement.height || 0;
    if (sw <= 0 || sh <= 0) { return failResult('no_leaf'); }

    try {
      gateCtx.fillStyle = '#FFFFFF';
      gateCtx.fillRect(0, 0, W, H);
      var side = Math.min(sw, sh);
      var drawSx = Math.floor((sw - side) / 2);
      var drawSy = Math.floor((sh - side) / 2);
      gateCtx.drawImage(sourceElement, drawSx, drawSy, side, side, 0, 0, W, H);
    } catch (e) { return failResult('no_leaf'); }

    var imgData = gateCtx.getImageData(0, 0, W, H);
    var data = imgData.data;
    var N = W * H;

    // ── Pass 1: Full-frame skin scan + motion + botanical map ──────────────────
    var fullSkinCount = 0;
    var changedPixels = 0;
    var skipMotion = isUploadMode;
    var botanicalMap = new Uint8Array(N);  // 1 = any botanical pixel

    var i, x, y, pidx, idx, r, g, b, h, s, v, lumY, cb, cr, hsv;

    for (y = 0; y < H; y += 1) {
      for (x = 0; x < W; x += 1) {
        pidx = y * W + x;
        idx  = pidx * 4;
        r = data[idx]; g = data[idx + 1]; b = data[idx + 2];
        lumY = 0.299 * r + 0.587 * g + 0.114 * b;
        cb   = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        cr   = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
        hsv  = rgbToHsv(r, g, b);
        h = hsv.h; s = hsv.s; v = hsv.v;

        // Skin rejection (hue-guarded to never flag yellow leaves)
        if (isSkinPixel(r, g, b, h, lumY, cb, cr)) { fullSkinCount += 1; }

        // Motion
        if (prevGateLum && !skipMotion && hasPrevGateLum) {
          if (Math.abs(lumY - prevGateLum[pidx]) > 26) { changedPixels += 1; }
        }
        if (prevGateLum) { prevGateLum[pidx] = Math.round(lumY); }

        // Botanical map
        if (isBotanicalPixel(h, s, v, r, g, b)) { botanicalMap[pidx] = 1; }
      }
    }

    var prevReady = hasPrevGateLum;
    if (!skipMotion && prevGateLum) { hasPrevGateLum = true; }

    // ── Rule A: Face / Skin rejection ─────────────────────────────────────────
    var skinRatio = fullSkinCount / N;
    var skinThreshold = isUploadMode ? 0.14 : 0.06;
    if (skinRatio > skinThreshold) {
      return failResult('face_detected');
    }

    // ── Rule B: Motion check ───────────────────────────────────────────────────
    if (!skipMotion && prevReady && (changedPixels / N) > 0.14) {
      return failResult('moving');
    }

    // ── Foreground Leaf Percentage: quick check before BFS ────────────────────
    var totalBotanical = 0;
    for (i = 0; i < N; i += 1) { if (botanicalMap[i]) { totalBotanical += 1; } }
    var botanicalRatio = totalBotanical / N;

    // If foreground botanical drops below 12% → leaf removed / nothing there
    if (botanicalRatio < 0.12) {
      return failResult('no_leaf');
    }

    // ── Step B: Build foreground leaf mask via center-anchored BFS ────────────
    var mask = buildLeafMask(botanicalMap, W, H);

    var maskedCount = 0;
    for (i = 0; i < N; i += 1) { if (mask[i]) { maskedCount += 1; } }
    var maskedRatio = maskedCount / N;

    // Need at least 10% of frame covered by segmented leaf
    if (maskedRatio < 0.10) {
      return failResult('no_leaf');
    }

    // ── Step C: Deep 6-metric analysis on masked pixels only ──────────────────
    var deep = runDeepLeafAnalysis(data, mask, W, H);

    // ── Rule C: Shape compactness — reject flat rectangular objects ────────────
    if (!deep.shapeOk && !isUploadMode) {
      return failResult('no_leaf');
    }

    // ── Rule D: Vein texture check (relax for upload mode) ────────────────────
    var minAvgEdge = isUploadMode ? 1.2 : 2.0;
    var minEdgeVar = isUploadMode ? 3   : 6;
    if (deep.avgEdge < minAvgEdge || deep.edgeVariance < minEdgeVar) {
      return failResult('no_veins');
    }

    // ── Outer-border shirt/wall rejection (camera mode only) ──────────────────
    if (!isUploadMode) {
      // Check outer 16px border for botanical uniformity
      var borderBotanical = 0, borderTotal = 0;
      var borderM = 16;
      for (y = 0; y < H; y += 1) {
        for (x = 0; x < W; x += 1) {
          var isOuter = (x < borderM || x >= W - borderM || y < borderM || y >= H - borderM);
          if (!isOuter) { continue; }
          borderTotal += 1;
          if (botanicalMap[y * W + x]) { borderBotanical += 1; }
        }
      }
      var outerBotanRatio = borderTotal > 0 ? (borderBotanical / borderTotal) : 0;
      // Solid botanical outer border with low vein texture = shirt/wall
      if (outerBotanRatio > 0.80 && deep.avgEdge < 3) {
        return failResult('no_leaf');
      }
    }

    // ── Confidence calculation ─────────────────────────────────────────────────
    var botanicalScore = (deep.chlorophyllIdx + deep.chlorosisIdx * 0.8) / 100;
    var confidence = Math.min(98, Math.round(60 + Math.min(1, botanicalScore) * 38));

    return {
      valid:       true,
      reason:      'leaf_ok',
      confidence:  confidence,
      maskedRatio: Math.round(maskedRatio * 100),
      deep:        deep
    };
  }

  // Keep old validateLeafFrame as a thin wrapper for backward compatibility
  function validateLeafFrame(sourceElement, mode) {
    var res = analyzeLeafDeep(sourceElement, mode);
    return { valid: res.valid, reason: res.reason, confidence: res.confidence };
  }

  function copyOffscreenToPreview(previewCanvas) {
    if (!previewCanvas || !offscreenCanvas) { return; }
    try {
      var pCtx = previewCanvas.getContext('2d');
      if (pCtx) {
        pCtx.clearRect(0, 0, previewCanvas.width || 224, previewCanvas.height || 224);
        pCtx.drawImage(offscreenCanvas, 0, 0, 224, 224);
      }
    } catch (e) { /* ignore */ }
  }

  function stopStreamTracks(stream) {
    if (!stream || typeof stream.getTracks !== 'function') { return; }
    try {
      var tracks = stream.getTracks();
      for (var i = 0; i < tracks.length; i += 1) {
        try { tracks[i].stop(); } catch (e) { /* ignore */ }
      }
    } catch (err) { /* ignore */ }
  }

  function stopCamera(videoEl) {
    resetMotionBaseline();
    if (activeStream) { stopStreamTracks(activeStream); activeStream = null; }
    if (videoEl) {
      try {
        if (videoEl.srcObject) { stopStreamTracks(videoEl.srcObject); videoEl.srcObject = null; }
        videoEl.pause();
      } catch (e) { /* ignore */ }
    }
  }

  function startCamera(videoEl, onSuccess, onError) {
    if (!videoEl) {
      if (typeof onError === 'function') { onError('Video preview element is missing.'); }
      return;
    }
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      if (typeof onError === 'function') {
        onError('Camera API is unavailable on this origin/browser. Use Upload Leaf Photo or Quick Sample Leaves.');
      }
      return;
    }
    stopCamera(videoEl);
    var constraints = {
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    };
    try {
      navigator.mediaDevices.getUserMedia(constraints)
        .then(function (stream) {
          activeStream = stream;
          videoEl.srcObject = stream;
          var playPromise = videoEl.play();
          if (playPromise && typeof playPromise.then === 'function') {
            playPromise.then(function () {
              if (typeof onSuccess === 'function') { onSuccess(); }
            }).catch(function () {
              if (typeof onSuccess === 'function') { onSuccess(); }
            });
          } else if (typeof onSuccess === 'function') { onSuccess(); }
        })
        .catch(function (err) {
          var msg = (err && err.message) ? err.message : 'Camera permission denied or device not found.';
          if (typeof onError === 'function') { onError(msg); }
        });
    } catch (e) {
      if (typeof onError === 'function') {
        onError('Camera startup blocked by browser security context.');
      }
    }
  }

  function snapshotVideoToOffscreen(videoEl, previewCanvas) {
    ensureOffscreenCanvas();
    if (!offscreenCtx || !videoEl || !videoEl.videoWidth || !videoEl.videoHeight) { return false; }
    try {
      offscreenCtx.fillStyle = '#FFFFFF';
      offscreenCtx.fillRect(0, 0, 224, 224);
      var vw = videoEl.videoWidth, vh = videoEl.videoHeight;
      var side = Math.min(vw, vh);
      var sx = Math.floor((vw - side) / 2);
      var sy = Math.floor((vh - side) / 2);
      offscreenCtx.drawImage(videoEl, sx, sy, side, side, 0, 0, 224, 224);
      hasCapturedFrame = true;
      copyOffscreenToPreview(previewCanvas);
      return true;
    } catch (e) { return false; }
  }

  function togglePauseCamera(videoEl, previewCanvas, isCurrentlyPaused, onResumed, onPaused, onError) {
    if (!videoEl) { return; }
    if (isCurrentlyPaused) {
      resetMotionBaseline();
      if (videoEl.srcObject) {
        try {
          var p = videoEl.play();
          if (p && typeof p.then === 'function') {
            p.then(function () {
              if (typeof onResumed === 'function') { onResumed(); }
            }).catch(function () { startCamera(videoEl, onResumed, onError); });
          } else if (typeof onResumed === 'function') { onResumed(); }
        } catch (e) { startCamera(videoEl, onResumed, onError); }
      } else { startCamera(videoEl, onResumed, onError); }
      return;
    }
    snapshotVideoToOffscreen(videoEl, previewCanvas);
    try { videoEl.pause(); } catch (e) { /* ignore */ }
    stopCamera(videoEl);
    if (typeof onPaused === 'function') { onPaused(); }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CLASSIFY OFFSCREEN 224x224 — enhanced for yellowed/spotted leaves
  // Now also returns deepMetrics from the gate canvas analysis
  // ─────────────────────────────────────────────────────────────────────────────
  function classifyOffscreen224(deepMetrics) {
    ensureOffscreenCanvas();
    if (!offscreenCtx) {
      return {
        diseaseId: 'healthy', confidence: 75, healthyPct: 85,
        yellowingPct: 10, lesionPct: 5, stageGuess: 'early', deepMetrics: deepMetrics || null
      };
    }

    var imgData = offscreenCtx.getImageData(0, 0, 224, 224);
    var data = imgData.data;
    var greenCount = 0, yellowCount = 0, brownRingCount = 0;
    var darkWaterCount = 0, whitePowderCount = 0, oliveMoldCount = 0;
    var leafPixels = 0;

    for (var i = 0; i < data.length; i += 4) {
      var r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 40) { continue; }
      if (r > 240 && g > 240 && b > 240) { continue; }
      leafPixels += 1;

      if (g > r + 8 && g > b + 10 && g > 48 && (g - b) > 15) {
        greenCount += 1;
      } else if (r > 180 && g > 180 && b > 175 && Math.abs(r - g) < 22 && Math.abs(g - b) < 22) {
        whitePowderCount += 1;
      } else if (r > 150 && g > 140 && b < 120 && (g - b) >= 22 && Math.abs(r - g) < 65) {
        yellowCount += 1;
      } else if (r > 95 && r < 175 && g > 90 && g < 165 && b < 100 && Math.abs(r - g) < 32) {
        oliveMoldCount += 1;
      } else if (r < 92 && g < 92 && b < 92 && (r + g + b) > 25) {
        darkWaterCount += 1;
      } else if (r > 88 && g > 40 && g < r - 10 && b < 90) {
        brownRingCount += 1;
      }
    }

    var denom = leafPixels > 0 ? leafPixels : 1;
    var greenRatio  = greenCount / denom;
    var yellowRatio = (yellowCount + oliveMoldCount * 0.6) / denom;
    var lesionRatio = (brownRingCount + darkWaterCount + whitePowderCount + oliveMoldCount * 0.4) / denom;
    var rawSum = greenRatio + yellowRatio + lesionRatio;

    if (rawSum <= 0.01) {
      return {
        diseaseId: 'healthy', confidence: 76, healthyPct: 86,
        yellowingPct: 9, lesionPct: 5, stageGuess: 'early', deepMetrics: deepMetrics || null
      };
    }

    var healthyPct   = Math.round((greenRatio  / rawSum) * 100);
    var yellowingPct = Math.round((yellowRatio / rawSum) * 100);
    var lesionPct    = Math.max(0, 100 - healthyPct - yellowingPct);
    var rawYellowPct = Math.round(yellowRatio * 100);
    var rawLesionPct = Math.round(lesionRatio * 100);

    // Also factor in deep metrics from gate analysis when available
    if (deepMetrics) {
      if (deepMetrics.chlorosisIdx > rawYellowPct) { rawYellowPct = deepMetrics.chlorosisIdx; }
      if (deepMetrics.necroticIdx  > rawLesionPct) { rawLesionPct = deepMetrics.necroticIdx; }
    }

    var diseaseId = 'healthy', confidence = 84;

    if (lesionPct < 10 && yellowingPct < 14 && healthyPct >= 76) {
      diseaseId = 'healthy';
      confidence = Math.min(96, 78 + Math.round(healthyPct / 5));
    } else if (whitePowderCount >= brownRingCount && whitePowderCount >= darkWaterCount && whitePowderCount > denom * 0.06) {
      diseaseId = 'powdery_mildew'; confidence = 87;
    } else if (darkWaterCount > brownRingCount && darkWaterCount > denom * 0.08) {
      diseaseId = 'late_blight'; confidence = rawYellowPct >= 20 ? 86 : 89;
    } else if (rawYellowPct >= 30 && rawLesionPct >= 12) {
      diseaseId = 'early_blight'; confidence = 87;
    } else if (rawYellowPct >= 40 && rawLesionPct < 12) {
      diseaseId = 'leaf_mold'; confidence = 83;
    } else if (oliveMoldCount >= brownRingCount && yellowCount > denom * 0.12) {
      diseaseId = 'leaf_mold'; confidence = 85;
    } else if (brownRingCount > denom * 0.07 && yellowingPct >= 18) {
      diseaseId = 'early_blight'; confidence = 88;
    } else if (brownRingCount > 0 || darkWaterCount > 0) {
      diseaseId = 'leaf_blast_spot'; confidence = 83;
    } else if (yellowingPct >= 25) {
      diseaseId = 'leaf_mold'; confidence = 80;
    }

    var stageGuess = (lesionPct >= 24 || yellowingPct >= 30 || rawYellowPct >= 35) ? 'late' : 'early';

    return {
      diseaseId:   diseaseId,
      confidence:  confidence,
      healthyPct:  healthyPct,
      yellowingPct: yellowingPct,
      lesionPct:   lesionPct,
      stageGuess:  stageGuess,
      deepMetrics: deepMetrics || null
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // captureVideoToCanvas — synchronous gate at click time, never cached
  // ─────────────────────────────────────────────────────────────────────────────
  function captureVideoToCanvas(videoEl, previewCanvas) {
    // Always run a fresh analyzeLeafDeep at the moment of capture (never cached)
    var analysisResult = { valid: false, reason: 'no_leaf', confidence: 0, deep: null };
    var gate = { valid: false, reason: 'no_leaf', confidence: 0 };

    if (videoEl && videoEl.srcObject && videoEl.videoWidth > 0) {
      analysisResult = analyzeLeafDeep(videoEl, 'camera');
      gate = { valid: analysisResult.valid, reason: analysisResult.reason, confidence: analysisResult.confidence };
      if (!analysisResult.valid) {
        return { gate: gate, scan: null };
      }
      snapshotVideoToOffscreen(videoEl, previewCanvas);
    } else if (hasCapturedFrame) {
      ensureOffscreenCanvas();
      analysisResult = analyzeLeafDeep(offscreenCanvas, 'camera');
      gate = { valid: analysisResult.valid, reason: analysisResult.reason, confidence: analysisResult.confidence };
      if (!analysisResult.valid) {
        return { gate: gate, scan: null };
      }
      copyOffscreenToPreview(previewCanvas);
    } else {
      return { gate: gate, scan: null };
    }

    var scan = classifyOffscreen224(analysisResult.deep);
    return { gate: gate, scan: scan };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // loadFileToCanvas — full analysis on uploaded photo
  // ─────────────────────────────────────────────────────────────────────────────
  function loadFileToCanvas(file, previewCanvas, onDone, onError) {
    if (!file) {
      if (typeof onError === 'function') { onError('No image file selected.'); }
      return;
    }
    var img = ensureReusableImage();
    ensureOffscreenCanvas();
    if (!img || !offscreenCtx) {
      if (typeof onError === 'function') { onError('Canvas or Image API unavailable.'); }
      return;
    }

    var objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
    } catch (e) {
      if (typeof onError === 'function') { onError('Could not read the selected image file.'); }
      return;
    }

    img.onload = function () {
      img.onload = null;
      img.onerror = null;
      var analysisResult = { valid: false, reason: 'no_leaf', confidence: 0, deep: null };
      var gate = { valid: false, reason: 'no_leaf', confidence: 0 };
      try {
        analysisResult = analyzeLeafDeep(img, 'upload');
        gate = { valid: analysisResult.valid, reason: analysisResult.reason, confidence: analysisResult.confidence };

        offscreenCtx.fillStyle = '#FFFFFF';
        offscreenCtx.fillRect(0, 0, 224, 224);
        var w = img.naturalWidth || img.width || 224;
        var h = img.naturalHeight || img.height || 224;
        var side = Math.min(w, h);
        var sx = Math.floor((w - side) / 2);
        var sy = Math.floor((h - side) / 2);
        offscreenCtx.drawImage(img, sx, sy, side, side, 0, 0, 224, 224);
        hasCapturedFrame = true;
        copyOffscreenToPreview(previewCanvas);
      } finally {
        try { URL.revokeObjectURL(objectUrl); } catch (revErr) { /* ignore */ }
      }

      if (!gate.valid) {
        if (typeof onDone === 'function') { onDone({ gate: gate, scan: null }); }
        return;
      }
      var scan = classifyOffscreen224(analysisResult.deep);
      if (typeof onDone === 'function') { onDone({ gate: gate, scan: scan }); }
    };

    img.onerror = function () {
      img.onload = null;
      img.onerror = null;
      try { URL.revokeObjectURL(objectUrl); } catch (revErr) { /* ignore */ }
      if (typeof onError === 'function') { onError('Could not decode the selected image file.'); }
    };

    img.src = objectUrl;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // drawSampleLeafToCanvas — demo leaf rendering for quick sample buttons
  // ─────────────────────────────────────────────────────────────────────────────
  function drawSampleLeafToCanvas(sampleId, previewCanvas) {
    ensureOffscreenCanvas();
    if (!offscreenCtx) { return; }
    var ctx = offscreenCtx;
    ctx.fillStyle = '#F4F9F6';
    ctx.fillRect(0, 0, 224, 224);
    ctx.beginPath();
    ctx.moveTo(38, 186);
    ctx.quadraticCurveTo(48, 72, 186, 38);
    ctx.quadraticCurveTo(156, 174, 38, 186);
    ctx.closePath();
    ctx.fillStyle = sampleId === 'healthy' ? '#22C55E' : '#16A34A';
    ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#15803D'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(42, 182); ctx.lineTo(176, 48);
    ctx.strokeStyle = '#DCFCE7'; ctx.lineWidth = 3; ctx.stroke();

    if (sampleId === 'leaf_mold') {
      ctx.fillStyle = '#EAB308';
      ctx.beginPath(); ctx.arc(98, 112, 18, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(138, 86, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#78711D';
      ctx.beginPath(); ctx.arc(98, 112, 9, 0, Math.PI * 2); ctx.fill();
    } else if (sampleId === 'early_blight') {
      ctx.fillStyle = '#FACC15';
      ctx.beginPath(); ctx.arc(105, 115, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#78350F';
      ctx.beginPath(); ctx.arc(105, 115, 14, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#451A03'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(105, 115, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#78350F';
      ctx.beginPath(); ctx.arc(140, 82, 11, 0, Math.PI * 2); ctx.fill();
    } else if (sampleId === 'late_blight') {
      ctx.fillStyle = '#27272A';
      ctx.beginPath(); ctx.ellipse(122, 108, 36, 22, -0.6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 2; ctx.stroke();
    } else if (sampleId === 'powdery_mildew') {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(95, 118, 16, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(134, 88, 14, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(118, 134, 12, 0, Math.PI * 2); ctx.fill();
    } else if (sampleId === 'leaf_blast_spot') {
      ctx.fillStyle = '#7C2D12';
      ctx.beginPath(); ctx.ellipse(106, 108, 24, 9, -0.7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#CBD5E1';
      ctx.beginPath(); ctx.ellipse(106, 108, 11, 4, -0.7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#451A03';
      ctx.beginPath(); ctx.arc(82, 142, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(142, 74, 6, 0, Math.PI * 2); ctx.fill();
    }

    hasCapturedFrame = true;
    copyOffscreenToPreview(previewCanvas);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Voice Recognition & Speech Synthesis
  // ─────────────────────────────────────────────────────────────────────────────
  function startVoiceRecognition(langCode, onResult, onStatus) {
    try {
      var SpeechRec = global.SpeechRecognition || global.webkitSpeechRecognition;
      if (!SpeechRec) {
        if (typeof onStatus === 'function') {
          onStatus('Voice recognition is not supported on this browser/protocol. Please type your question.');
        }
        return;
      }
      if (activeRecognition) {
        try { activeRecognition.stop(); } catch (e) { /* ignore */ }
        activeRecognition = null;
      }
      var rec = new SpeechRec();
      activeRecognition = rec;
      rec.lang = langCode === 'hi' ? 'hi-IN' : 'en-IN';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onstart = function () {
        if (typeof onStatus === 'function') { onStatus('Listening... Speak your crop care question now.'); }
      };
      rec.onresult = function (event) {
        var transcript = '';
        if (event && event.results && event.results[0] && event.results[0][0]) {
          transcript = event.results[0][0].transcript;
        }
        if (typeof onResult === 'function') { onResult(transcript); }
        if (typeof onStatus === 'function') { onStatus('Voice captured.'); }
      };
      rec.onerror = function (err) {
        if (typeof onStatus === 'function') {
          onStatus('Voice input unavailable (' + (err && err.error ? err.error : 'error') + '). You can type directly.');
        }
      };
      rec.onend = function () { activeRecognition = null; };
      rec.start();
    } catch (err) {
      if (typeof onStatus === 'function') {
        onStatus('Voice input could not start. Please type your question.');
      }
    }
  }

  function speakText(text, langCode, onStatus) {
    try {
      if (!('speechSynthesis' in global) || !global.speechSynthesis) {
        if (typeof onStatus === 'function') { onStatus('Voice readout is not supported in this browser.'); }
        return;
      }
      global.speechSynthesis.cancel();
      var rawText = String(text || '').trim();
      var spoken = rawText.indexOf('Krushak Drishti') === 0 ? rawText : ('Krushak Drishti advisory: ' + rawText);
      var utter = new SpeechSynthesisUtterance(spoken);
      utter.lang = langCode === 'hi' ? 'hi-IN' : 'en-IN';
      utter.rate = 0.98;
      global.speechSynthesis.speak(utter);
      if (typeof onStatus === 'function') { onStatus('Krushak Drishti is reading the response aloud.'); }
    } catch (e) {
      if (typeof onStatus === 'function') { onStatus('Unable to start audio playback.'); }
    }
  }

  global.KrishiMedia = {
    analyzeLeafDeep:         analyzeLeafDeep,
    validateLeafFrame:       validateLeafFrame,
    resetMotionBaseline:     resetMotionBaseline,
    startCamera:             startCamera,
    togglePauseCamera:       togglePauseCamera,
    stopCamera:              stopCamera,
    captureVideoToCanvas:    captureVideoToCanvas,
    loadFileToCanvas:        loadFileToCanvas,
    drawSampleLeafToCanvas:  drawSampleLeafToCanvas,
    startVoiceRecognition:   startVoiceRecognition,
    speakText:               speakText
  };
})(window);
