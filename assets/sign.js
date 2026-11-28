/*
 * Sign Language Camera: camera, hand tracking, recognition pipeline, transcript, speech and send.
 *
 * Layers (each replaceable):
 *   Extractor  - camera frames -> hand landmarks. Default: MediaPipe Hands (vendor/mediapipe/hands, Apache-2.0), run locally.
 *                Extracting landmarks is NOT translation. Nothing here understands a sign.
 *   Adapter    - hand-landmark sequence -> a word (assets/sign-engine.js). "Personal" = signs the user taught on this device.
 *                Pretrained ISL/ASL word models load from vendor/sign-models/ (assets/sign-model.js).
 *   Letters    - one-handed ASL fingerspelling A-Z (assets/sign-letters.js): held shapes type letters, J and Z come from motion.
 *   Transcript - editable text the user must confirm before it is spoken or sent.
 *
 * Privacy: frames never leave this browser. Only confirmed text is sent, through the existing chat.
 */
(function () {
  "use strict";
  var SG = window.Sangam; var E = window.SangamSignEngine;
  if (!SG || !E) return;
  var $ = SG.$, esc = SG.esc;
  var dlg = $("#signDlg"); if (!dlg) return;

  var STORE_KEY = "sangam.sign.personal.v1", CONSENT_KEY = "sangam.sign.consent.v1";
  var MODEL_DIR = "vendor/mediapipe/hands/";
  var HOLISTIC_DIR = "vendor/mediapipe/holistic/";
  var SM = window.SangamSignModel; // assets/sign-model.js: pretrained ISL/ASL inference, loaded separately from this file
  var SLt = window.SangamSignLetters; // assets/sign-letters.js: one-handed ASL fingerspelling (A-Z), rule based
  var SST = window.SangamStatic; // assets/sign-static.js: the person's own held hand poses (nearest-neighbour over hand landmarks)
  var poseStore = SST ? new SST.PoseStore((function () { try { return window.localStorage; } catch (e) { return null; } })()) : null;
  var el = function (id) { return document.getElementById(id); };

  /* The ISL model's word list has run-together names ("Howareyou", "StreetorRoad"). Show people the readable form. */
  var PRETTY = {
    "Howareyou": "How are you", "GoodMorning": "Good morning", "Goodafternoon": "Good afternoon", "Goodevening": "Good evening", "Goodnight": "Good night",
    "Thankyou": "Thank you", "trainticket": "train ticket", "TrainStation": "train station", "StreetorRoad": "street or road", "StoreorShop": "store or shop",
    "biglarge": "big", "smalllittle": "small", "you (plural)": "you all", "Race (ethnicity)": "race", "T-Shirt": "T-shirt"
  };
  function pretty(label) { return Object.prototype.hasOwnProperty.call(PRETTY, label) ? PRETTY[label] : label; }

  /* ------------------------------------------------------------------ small helpers */
  function live(msg) {
    // The dialog is modal, so announcements must go to a region INSIDE it. The person's announcement level still applies.
    var level = /could not|denied|blocked|no camera|busy|disconnected|stopped|error|not recognised|failed/i.test(msg) ? "important" : "info";
    var l = el("signLive"); if (!l || (SG.announceOK && !SG.announceOK(level))) return;
    l.textContent = ""; setTimeout(function () { l.textContent = msg; }, 30);
  }
  function say(id, msg) { var n = el(id); if (n) n.textContent = msg || ""; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  var store = {
    load: function () { try { var d = JSON.parse(lsGet(STORE_KEY) || "null"); if (!d || !d.labels) return { labels: {} }; Object.keys(d.labels).forEach(function (l) { d.labels[l] = d.labels[l].map(function (seq) { return seq.map(function (f) { return Float32Array.from(f); }); }); }); return d; } catch (e) { return { labels: {} }; } },
    save: function (d) {
      var slim = { labels: {} };
      Object.keys(d.labels).forEach(function (l) { slim.labels[l] = d.labels[l].map(function (seq) { return seq.map(function (f) { return Array.prototype.map.call(f, function (x) { return Math.round(x * 1000) / 1000; }); }); }); });
      if (!lsSet(STORE_KEY, JSON.stringify(slim))) throw new Error("This device has no room left to save signs. Delete some taught signs and try again.");
    }
  };

  /* ------------------------------------------------------------------ extractors */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = src; s.async = true; s.onload = res;
      s.onerror = function () { rej(new Error("Could not load " + src)); };
      document.head.appendChild(s);
    });
  }

  function MediaPipeExtractor() {
    this.id = "mediapipe-hands"; this.name = "MediaPipe Hands (hand landmarks, runs on this device)"; this.isMock = false;
    this.hands = null; this.running = false; this.busy = false; this.cb = null; this.video = null; this.interval = 66; this.avg = 0; this.raf = 0; this.last = 0; this.fps = 0; this.frames = 0; this.t0 = 0;
  }
  MediaPipeExtractor.prototype.load = function () {
    var self = this;
    if (self.hands) return Promise.resolve();
    return (window.Hands ? Promise.resolve() : loadScript(MODEL_DIR + "hands.js")).then(function () {
      if (!window.Hands) throw new Error("The hand tracking library loaded but did not start.");
      var h = new window.Hands({ locateFile: function (f) { return MODEL_DIR + f; } });
      h.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.5, selfieMode: false });
      h.onResults(function (r) { self._results(r); });
      self.hands = h;
      return h.initialize();
    });
  };
  MediaPipeExtractor.prototype._results = function (r) {
    if (!this.cb) return;
    var list = (r.multiHandLandmarks || []).map(function (l) { return { landmarks: l }; });
    this.frames++;
    this.cb(list, performance.now());
  };
  MediaPipeExtractor.prototype.start = function (video, cb) {
    var self = this; self.video = video; self.cb = cb; self.running = true; self.frames = 0; self.t0 = performance.now();
    function tick() {
      if (!self.running) return;
      var now = performance.now();
      if (!self.busy && now - self.last >= self.interval && video.readyState >= 2 && video.videoWidth) {
        self.busy = true; self.last = now;
        var t = now;
        self.hands.send({ image: video }).then(function () {
          var took = performance.now() - t; self.avg = self.avg ? self.avg * 0.8 + took * 0.2 : took;
          self.interval = Math.max(66, Math.min(250, self.avg * 1.3)); // slow down if this device cannot keep up
          self.busy = false;
        }, function (e) { self.busy = false; if (self.onError) self.onError(e); });
      }
      self.raf = (video.requestVideoFrameCallback ? video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick));
    }
    tick();
  };
  MediaPipeExtractor.prototype.rate = function () { var s = (performance.now() - this.t0) / 1000; return s > 1 ? this.frames / s : 0; };
  MediaPipeExtractor.prototype.pause = function () { this.running = false; };
  MediaPipeExtractor.prototype.resume = function () { if (this.cb && this.video && !this.running) this.start(this.video, this.cb); };
  MediaPipeExtractor.prototype.stop = function () { this.running = false; this.cb = null; };
  MediaPipeExtractor.prototype.dispose = function () { this.stop(); try { if (this.hands && this.hands.close) this.hands.close(); } catch (e) {} this.hands = null; };

  /* ------------------------------------------------------------------ Holistic extractor (feeds the pretrained ISL/ASL models) */
  function toHolisticPoints(r) {
    var out = new Float32Array(150), i, o;
    var body = r.poseLandmarks || []; for (i = 0; i < 33; i++) if (body[i]) { out[i * 2] = body[i].x; out[i * 2 + 1] = body[i].y; }
    var lh = r.leftHandLandmarks || []; for (i = 0; i < 21; i++) { o = (33 + i) * 2; if (lh[i]) { out[o] = lh[i].x; out[o + 1] = lh[i].y; } }
    var rh = r.rightHandLandmarks || []; for (i = 0; i < 21; i++) { o = (54 + i) * 2; if (rh[i]) { out[o] = rh[i].x; out[o + 1] = rh[i].y; } }
    return out;
  }
  function HolisticExtractor() {
    this.id = "mediapipe-holistic"; this.name = "MediaPipe Holistic (body + hand landmarks, runs on this device)"; this.isMock = false; this.isHolistic = true;
    this.holistic = null; this.running = false; this.busy = false; this.cb = null; this.video = null; this.interval = 90; this.avg = 0; this.raf = 0; this.last = 0; this.frames = 0; this.t0 = 0;
  }
  HolisticExtractor.prototype.load = function () {
    var self = this;
    if (self.holistic) return Promise.resolve();
    return (window.Holistic ? Promise.resolve() : loadScript(HOLISTIC_DIR + "holistic.js")).then(function () {
      if (!window.Holistic) throw new Error("The body and hand tracking library loaded but did not start.");
      var h = new window.Holistic({ locateFile: function (f) { return HOLISTIC_DIR + f; } });
      // modelComplexity 2 ("heavy" pose): the pretrained ISL/ASL SL-GCN models were trained and evaluated by their authors
      // (OpenHands) on poses from MediaPipe Holistic's heavy pose model. Measured on 85 real INCLUDE videos through this
      // tracker at about 10 fps (docs/ISL_RECOGNITION_AUDIT.md): heavy 82.4% top-1 vs full 77.1% (held-out test videos
      // 83.3% vs 72.2%, n = 18). Cost on the test laptop: 118 ms per frame vs 78 ms (about 8.5 vs 13 frames per second).
      // The extractor slows itself down on weaker hardware (see `interval` below), so a slow device tracks fewer frames, not
      // wrong ones. To go back to the faster pose model set this to 1; "lite" (0) was the least accurate and is not used.
      h.setOptions({ modelComplexity: 2, smoothLandmarks: true, refineFaceLandmarks: false, enableSegmentation: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5, selfieMode: false });
      h.onResults(function (r) { self._results(r); });
      self.holistic = h;
      return h.initialize();
    });
  };
  HolisticExtractor.prototype._results = function (r) {
    if (!this.cb) return;
    this.frames++;
    this.cb({ points: toHolisticPoints(r), present: [!!r.leftHandLandmarks, !!r.rightHandLandmarks], raw: r }, performance.now());
  };
  HolisticExtractor.prototype.start = function (video, cb) {
    var self = this; self.video = video; self.cb = cb; self.running = true; self.frames = 0; self.t0 = performance.now();
    function tick() {
      if (!self.running) return;
      var now = performance.now();
      if (!self.busy && now - self.last >= self.interval && video.readyState >= 2 && video.videoWidth) {
        self.busy = true; self.last = now; var t = now;
        self.holistic.send({ image: video }).then(function () {
          var took = performance.now() - t; self.avg = self.avg ? self.avg * 0.8 + took * 0.2 : took;
          self.interval = Math.max(66, Math.min(300, self.avg * 1.2)); self.busy = false;
        }, function (e) { self.busy = false; if (self.onError) self.onError(e); });
      }
      self.raf = (video.requestVideoFrameCallback ? video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick));
    }
    tick();
  };
  HolisticExtractor.prototype.rate = function () { var s = (performance.now() - this.t0) / 1000; return s > 1 ? this.frames / s : 0; };
  HolisticExtractor.prototype.pause = function () { this.running = false; };
  HolisticExtractor.prototype.resume = function () { if (this.cb && this.video && !this.running) this.start(this.video, this.cb); };
  HolisticExtractor.prototype.stop = function () { this.running = false; this.cb = null; };
  HolisticExtractor.prototype.dispose = function () { this.stop(); try { if (this.holistic && this.holistic.close) this.holistic.close(); } catch (e) {} this.holistic = null; };

  /*
   * How careful the pretrained word models are before they type a word. The network has no "not a sign" answer: measured on
   * generated hand movement that is NOT a sign (waving, raising a hand, fidgeting), it typed a word for 82% of clips at its
   * original bar. Requiring the same word from several trimmed views of the clip, plus a higher confidence, cuts that sharply
   * (see docs/SIGN_LANGUAGE_CAMERA.md). The cost is more computing per word and some real signs being missed. These numbers
   * come from that non-sign measurement only: no real signer was available to calibrate the other side.
   */
  var STRICT_KEY = "sangam.sign.strict.v1";
  var STRICT = {
    careful: { views: 3, minP: 0.9, minMargin: 0.5, note: "Reads each sign three ways and only types a word when all agree and the model is very sure. Fewest wrong words; real signs are missed more often, and a word takes longer to appear." },
    balanced: { views: 2, minP: 0.8, minMargin: 0.4, note: "Reads each sign twice and types a word only when both readings agree and the model is quite sure." },
    loose: { views: 1, minP: 0.45, minMargin: 0.15, note: "Types the model's best guess whenever it is at least somewhat sure. Quick, but it will often name a word for movement that is not a sign." }
  };
  function applyStrict() {
    var c = STRICT[S.strict] || STRICT.balanced;
    ["isl", "asl", "asl100"].forEach(function (lang) { var a = pretrained[lang]; if (a) { a.opts.views = c.views; a.opts.minP = c.minP; a.opts.minMargin = c.minMargin; } });
    say("signStrictNote", c.note);
  }

  /* ------------------------------------------------------------------ recognisers listed in the UI */
  var personal = new E.PersonalAdapter(store);
  var pretrained = { isl: null, asl: null, asl100: null }; // set once a vendor/sign-models/<lang>/.../model.json + weights.bin load and pass every check (asl100 shares the asl network)
  var pretrainedStatus = {
    isl: "Checking for an installed Indian Sign Language model…",
    asl: "Checking for an installed American Sign Language model…"
  };
  var PRETRAINED_DIRS = { isl: "vendor/sign-models/isl/include-slgcn/", asl: "vendor/sign-models/asl/wlasl-slgcn/" };

  /* Fingerspelling: letters, not words. Same adapter shape as the others so the language list and "About" panel can use it. */
  var lettersAdapter = {
    id: "letters", name: "ASL fingerspelling (letters A to Z)", kind: "rules",
    isAvailable: function () { return !!SLt; },
    getSupportedLanguage: function () { return "American Sign Language one-handed alphabet. Rules written from the shape of each letter, not a trained model. Not evaluated on real signers."; },
    getSupportedVocabulary: function () { return SLt ? SLt.ALL_LETTERS.slice() : []; }
  };
  var digitsAdapter = {
    id: "digits", name: "ASL numbers (digits 0 to 9)", kind: "rules",
    isAvailable: function () { return !!SLt; },
    getSupportedLanguage: function () { return "American Sign Language one-handed numbers 0 to 9. Rules written from the shape of each number, not a trained model. Not evaluated on real signers."; },
    getSupportedVocabulary: function () { return SLt ? SLt.DIGITS.slice() : []; }
  };
  /* Held poses: one hand, hold still. Personal gestures taught on this device; never presented as a standard language. */
  var staticAdapter = {
    id: "static", name: "My held poses (taught on this device)", kind: "personal-static",
    isAvailable: function () { return !!poseStore && poseStore.isAvailable(); },
    getSupportedLanguage: function () { return "Your own held hand poses, matched by hand shape against the examples you recorded. Personal gestures: not Indian Sign Language, American Sign Language or any other language."; },
    getSupportedVocabulary: function () { return poseStore ? poseStore.usable() : []; }
  };
  function isStatic(id) { return id === "static"; }
  function isModelRec(id) { return id === "isl" || id === "asl" || id === "asl100"; }
  function isSpelling(id) { return id === "letters" || id === "digits"; }   // hold-a-shape recognisers (one character at a time)

  function recognisers() {
    var list = [{ id: "personal", name: "My own signs (taught on this device)", available: true, adapter: personal,
      note: personal.isAvailable() ? "Recognises the " + personal.getSupportedVocabulary().length + " sign(s) you have taught." : "Teach at least one sign (2 or more examples) to start." }];
    if (SST) list.push({ id: "static", name: "My held poses (one hand, hold still)", available: true, adapter: staticAdapter,
      note: staticAdapter.isAvailable() ? "Recognises the " + poseStore.usable().length + " pose(s) you have taught. Hold a pose still for about a second. These are your own gestures, not a standard sign language." : "Teach at least 2 different poses (3 or more captures each) in “Teach a held pose” below, then start recognition." });
    list.push({ id: "letters", name: "Letters: ASL fingerspelling (A to Z)", available: !!SLt, adapter: lettersAdapter,
      note: SLt ? "Spell words one letter at a time: make a letter and hold your hand still for about a second. J and Z are drawn in the air. Uses one hand (the American alphabet; ISL fingerspelling uses two hands and is not covered)." : "The letter recogniser (assets/sign-letters.js) did not load." });
    list.push({ id: "digits", name: "Numbers: ASL digits (0 to 9)", available: !!SLt, adapter: digitsAdapter,
      note: SLt ? "Make a number with one hand, palm toward the camera, and hold it still for about a second. 6, 7, 8 and 9 touch the thumb to the pinky, ring, middle and index fingertip. Use Add space between numbers." : "The number recogniser (assets/sign-letters.js) did not load." });
    list.push({ id: "isl", name: "Indian Sign Language (ISL), pretrained words", available: !!pretrained.isl, adapter: pretrained.isl, isHolistic: true, note: pretrained.isl ? pretrained.isl.getSupportedLanguage() : pretrainedStatus.isl });
    list.push({ id: "asl100", name: "American Sign Language (ASL), 100 common words (more reliable)", available: !!pretrained.asl100, adapter: pretrained.asl100, isHolistic: true,
      note: pretrained.asl100 ? "The same ASL model limited to its 100 most common words, so it guesses among 100 instead of 2,000. Fewer words, fewer wrong ones. Words only: no letters, no sentences." : pretrainedStatus.asl });
    list.push({ id: "asl", name: "American Sign Language (ASL), all 2,000 words", available: !!pretrained.asl, adapter: pretrained.asl, isHolistic: true, note: pretrained.asl ? pretrained.asl.getSupportedLanguage() + " Its authors measured about 31% of first guesses correct across 2,000 words, so expect many wrong words: prefer the 100-word option." : pretrainedStatus.asl });
    list.push({ id: "bsl", name: "British Sign Language (BSL)", available: false, note: "No model installed." });
    return list;
  }

  function tryLoadPretrained(lang) {
    if (!SM) { pretrainedStatus[lang] = "Sign model runtime (assets/sign-model.js) did not load."; return Promise.resolve(); }
    var a = new SM.PretrainedAdapter(PRETRAINED_DIRS[lang], function (url) { return fetch(url, { cache: "no-store" }); }, {});
    return a.load().then(function () {
      pretrained[lang] = a;
      if (lang === "asl" && a.spec && a.spec.subsets && a.spec.subsets.wlasl100) {
        // Same network, smaller menu: reuse the loaded weights instead of fetching 16 MB again.
        var b = new SM.PretrainedAdapter(PRETRAINED_DIRS.asl, null, { subset: "wlasl100" });
        b.spec = a.spec; b.net = a.net; b.name = a.name + ", 100-word subset"; pretrained.asl100 = b;
      }
      applyStrict(); applyCameraAspect();
    }, function (e) {
      pretrainedStatus[lang] = /404|wrong size|HTTP/.test(e.message)
        ? "No " + lang.toUpperCase() + " model is installed. Run: node scripts/sign-models/install.js " + lang + (lang === "asl" ? " --accept-wlasl-terms" : "")
        : "The installed " + lang.toUpperCase() + " model could not be loaded (" + e.message + ").";
    });
  }
  function tryLoadIsl() { return Promise.all([tryLoadPretrained("isl"), tryLoadPretrained("asl")]); }

  /*
   * Word-model inference runs in a Web Worker (assets/sign-worker.js). One word is 1 to 6 seconds of pure JavaScript maths; on the
   * page's own thread that froze the camera and hand tracking for the whole time, and a sign that was still being performed lost
   * frames (the gaps were filled with the last good pose), which bent the motion the model was reading. If a worker cannot be
   * used, classifyAsync() falls back to the same maths on the page.
   */
  var W = { worker: null, broken: false, seq: 0, pending: {}, loaded: {} };
  function workerStop() {
    Object.keys(W.pending).forEach(function (k) { var e = new Error("The word-model worker was stopped."); e.stopped = true; W.pending[k].rej(e); });
    W.pending = {}; W.loaded = {}; try { if (W.worker) W.worker.terminate(); } catch (e) {} W.worker = null;
  }
  function workerGet() {
    if (W.broken || !window.Worker) return null;
    if (!W.worker) {
      try {
        W.worker = new Worker("assets/sign-worker.js");
        W.worker.onmessage = function (e) { var m = e.data || {}, p = W.pending[m.reqId]; if (!p) return; delete W.pending[m.reqId]; if (m.ok) p.res(m.result); else p.rej(new Error(m.error || "worker error")); };
        W.worker.onerror = function () { W.broken = true; workerStop(); };
      } catch (e) { W.broken = true; W.worker = null; return null; }
    }
    return W.worker;
  }
  function workerCall(msg) {
    return new Promise(function (res, rej) {
      var w = workerGet(); if (!w) return rej(new Error("No worker available."));
      var id = ++W.seq; msg.reqId = id; W.pending[id] = { res: res, rej: rej };
      try { w.postMessage(msg); } catch (e) { delete W.pending[id]; rej(e); }
    });
  }
  function workerKey(recId) { return recId === "isl" ? "isl" : "asl"; }   // the 100-word ASL option uses the ASL network
  function ensureWorkerModel(recId) {
    var key = workerKey(recId);
    if (!W.loaded[key]) W.loaded[key] = workerCall({ type: "load", key: key, baseUrl: new URL(PRETRAINED_DIRS[key], document.baseURI).href }).catch(function (e) { delete W.loaded[key]; if (!(e && e.stopped)) W.broken = true; throw e; });
    return W.loaded[key];
  }
  function classifyAsync(recId, adapter, frames) {
    var slim = frames.map(function (f) { return { points: f.points, t: f.t }; });   // only the numbers the model reads
    return ensureWorkerModel(recId).then(function () {
      return workerCall({ type: "classify", key: workerKey(recId), opts: { cameraAspect: adapter.opts.cameraAspect, subset: adapter.opts.subset, views: adapter.opts.views, minP: adapter.opts.minP, minMargin: adapter.opts.minMargin }, frames: slim });
    }).catch(function (e) {
      if (e && e.stopped) throw e;                                                 // closed on purpose: do not start a long run now
      return adapter.classify(frames);                                             // no worker: same maths on the page (slower)
    });
  }

  /*
   * Bug fix (camera aspect-ratio correction was permanent dead code): PretrainedAdapter.classify() only rescales
   * x-coordinates via correctAspect() when this.opts.cameraAspect is set, but opts was always constructed as {}
   * above and nothing ever populated it afterwards, so correctAspect() silently never ran for any camera whose
   * aspect ratio differs from the model's training-time referenceAspect (ISL: 16:9 / 1.7778, from INCLUDE's
   * 1920x1080 recordings). Any webcam that is not exactly 16:9 (4:3, 1:1, a different 16:9 crop, a phone camera,
   * etc.) fed distorted, unscaled x-coordinates into the model. Fix: read the real video element's dimensions once
   * they are known (after the stream starts and on every subsequent frame-size change) and write them into both
   * pretrained adapters' opts objects, which classify() re-reads on every call.
   */
  function applyCameraAspect() {
    var v = S.video;
    var ratio = (v && v.videoWidth && v.videoHeight) ? (v.videoWidth / v.videoHeight) : null;
    ["isl", "asl", "asl100"].forEach(function (lang) {
      var a = pretrained[lang];
      if (a) a.opts.cameraAspect = ratio;
    });
  }

  /* ------------------------------------------------------------------ state */
  var S = {
    strict: (function () { var v = lsGet(STRICT_KEY); return STRICT[v] ? v : "balanced"; })(),
    stream: null, video: null, devices: [], facing: "user", deviceIdx: -1,
    extractor: null, extractorReady: false, adapter: personal, recId: "personal",
    recognising: false, paused: false,
    seg: new E.Segmenter(), stab: new E.Stabiliser(), lastLetterMsg: "", run: 0,   // run: bumped whenever recognition starts/stops, so a late model result for an old run is dropped
    letters: SLt ? new SLt.LetterStream({ kind: "letters" }) : null, digits: SLt ? new SLt.LetterStream({ kind: "digits" }) : null,
    words: [], confirmed: false, lastSent: "",
    teachLabel: null, lastPartialAt: 0, partialSeen: 0,
    opener: null
  };
  window.SangamSign = {
    // Replace to plug in another landmark source (tests use this; the dialog then shows a banner saying so).
    // Called with `true` when the selected recogniser needs full-body landmarks (the pretrained ISL/ASL models).
    extractorFactory: function (needsHolistic) { return needsHolistic ? new HolisticExtractor() : new MediaPipeExtractor(); },
    adapters: { personal: personal, static: staticAdapter }, poseStore: poseStore,
    pretrained: pretrained, // { isl, asl, asl100 }: PretrainedAdapter instances once loaded (test/diagnostic introspection, e.g. opts.cameraAspect)
    engine: E,
    _state: S
  };

  /* ------------------------------------------------------------------ panel (dashboard) */
  function renderPanel() {
    var ul = el("signRecList"); if (!ul) return;
    ul.innerHTML = recognisers().map(function (r) {
      return '<li class="sign-rec"><b>' + esc(r.name) + '</b> <span class="stat ' + (r.available ? "implemented-and-browser-tested" : "not-implemented") + '">' + (r.available ? "Available" : "Not installed") + "</span><span class=\"note\">" + esc(r.note) + "</span></li>";
    }).join("");
  }

  /* ------------------------------------------------------------------ language select + about */
  function renderLang() {
    var sel = el("signLang"); if (!sel) return;
    var cur = S.recId;
    sel.innerHTML = recognisers().map(function (r) { return '<option value="' + r.id + '"' + (r.available ? "" : " disabled") + ">" + esc(r.name + (r.available ? "" : " (not installed)")) + "</option>"; }).join("");
    sel.value = cur;
    var r = recognisers().filter(function (x) { return x.id === cur; })[0];
    say("signLangNote", r ? r.note : "");
    var usingModel = isModelRec(cur), usingLetters = isSpelling(cur), usingDigits = cur === "digits";
    if (el("signStrictField")) el("signStrictField").hidden = !usingModel;
    var a = r && r.adapter ? r.adapter : personal, vocab = a.getSupportedVocabulary().map(pretty);
    el("signAboutBody").innerHTML =
      "<dt>Recogniser</dt><dd>" + esc(a.name) + "</dd>" +
      "<dt>Language</dt><dd>" + esc(a.getSupportedLanguage()) + "</dd>" +
      "<dt>Vocabulary</dt><dd>" + (vocab.length ? esc(vocab.length + (usingDigits ? " numbers: " : usingLetters ? " letters: " : " signs: ") + vocab.slice(0, 40).join(", ") + (vocab.length > 40 ? ", …" : "")) : "Empty. Teach signs below.") + "</dd>" +
      (isStatic(cur)
        ? "<dt>Hand tracking</dt><dd>MediaPipe Hands (Apache-2.0), running in this browser. It follows one hand. It does not interpret signs.</dd>" +
          "<dt>How a pose is matched</dt><dd>The shape of your hand (21 points, centred and scaled to your palm) is compared with the captures you recorded. The closest pose is typed only after it has been held still for about a second, and only if it is close enough and clearly closer than your other poses. Otherwise nothing is typed. The closeness figure is not a probability.</dd>" +
          "<dt>Limits</dt><dd>These are your own gestures, not a standard sign language. One hand, held still, the same hand you taught with. It only knows the poses you taught, and it has not been tested on anyone but you. Use the self-check below to see how well your poses are told apart.</dd>"
      : usingLetters
        ? "<dt>Hand tracking</dt><dd>MediaPipe Hands (Apache-2.0), running in this browser. It follows one hand. It does not interpret signs.</dd>" +
          "<dt>How " + (usingDigits ? "a number" : "a letter") + " is recognised</dt><dd>Rules written from the shape of each ASL " + (usingDigits ? "number" : "letter") + ": how straight each finger is, where the thumb tip is, how far apart the fingertips are" + (usingDigits ? "" : ", and which way the hand points") + ". It is typed only after the same shape has been held still for about 0.7 seconds." + (usingDigits ? "" : " J and Z are recognised from the path the fingertip draws.") + " This is not a trained model and has not been measured with real signers.</dd>" +
          "<dt>Limits</dt><dd>" + (usingDigits
            ? "Use one hand, palm toward the camera. 6, 7, 8 and 9 are told apart by which fingertip the thumb touches, so keep the other three fingers clearly up. Numbers above 9 are typed digit by digit. To type the same number twice, lower your hand between them. Use Add space between numbers."
            : "Use one hand, palm toward the camera for most letters (G, H, Q and P are shown sideways or pointing down, as in the alphabet chart). Look-alike letters (A, S, T, N, M, E) are the most likely to be mixed up: if a letter is not typed, adjust your thumb slightly. To type the same letter twice, lower your hand between them. Use Add space between words. Indian Sign Language fingerspelling is two-handed and is not covered. Choose Numbers for 0 to 9.") + "</dd>"
      : usingModel
        ? "<dt>Body and hand tracking</dt><dd>MediaPipe Holistic (Apache-2.0), running in this browser. It follows your body and hands. It does not interpret signs.</dd>" +
          "<dt>How a sign is recognised</dt><dd>A pretrained neural network (SL-GCN, from AI4Bharat OpenHands, Apache-2.0) scores your whole sign against its fixed vocabulary and returns the best-scoring word as a percentage. This is a genuine trained model, not hand-written rules, but SANGAM has not independently measured its accuracy with real signers &mdash; see docs/SIGN_LANGUAGE_MODEL_EVALUATION.md.</dd>" +
          "<dt>Limits</dt><dd>One isolated sign per clip only: no letters (choose the Letters option for fingerspelling), no sentences, no grammar. Only the signs listed above are recognised; everything else is reported as not recognised. " + (cur === "isl" ? "Indian Sign Language and American Sign Language are different models and are never mixed." : "This model is English-only ASL vocabulary; never used for ISL.") + "</dd>"
        : "<dt>Hand tracking</dt><dd>MediaPipe Hands (Apache-2.0), running in this browser. It follows hands. It does not interpret signs.</dd>" +
          "<dt>How a sign is matched</dt><dd>Your hand shape and movement over about a second are compared with your recorded examples (dynamic time warping). The match figure is how close the sign was to an example. It is not a probability.</dd>" +
          "<dt>Limits</dt><dd>Hands only: no face, body posture, grammar or sentences. Tuned on generated test data, not on real signers. Accuracy with real signers has not been measured.</dd>") +
      "<dt>Privacy</dt><dd>Camera pictures stay on this device and are not recorded" + (usingModel || usingLetters ? "; only numeric landmarks are processed in memory" : ". Taught examples are stored here as numbers (hand positions), not pictures") + (usingLetters ? "." : ". Delete them any time below.") + "</dd>";
  }
  function renderTaught() {
    var ul = el("signTaught"); if (!ul) return;
    var labels = Object.keys(personal.data.labels);
    el("signForgetAll").disabled = !labels.length;
    ul.innerHTML = labels.length ? labels.map(function (l) {
      var n = personal.examples(l), ok = n >= E.MIN_EXAMPLES;
      return '<li><span><b>' + esc(l) + "</b>: " + n + " example" + (n === 1 ? "" : "s") + (ok ? "" : " (needs " + (E.MIN_EXAMPLES - n) + " more before it is used)") + '</span> <button class="btn btn-sm" type="button" data-del="' + esc(l) + '" aria-label="Delete the sign ' + esc(l) + '">Delete</button></li>';
    }).join("") : '<li class="note">No signs taught yet.</li>';
    renderLang(); renderPanel(); syncButtons();
  }

  /* ------------------------------------------------------------------ camera */
  var CAM_ERR = {
    NotAllowedError: "Camera permission was denied. Allow camera access for this site in your browser settings, then press Open camera again.",
    PermissionDeniedError: "Camera permission was denied. Allow camera access for this site in your browser settings, then press Open camera again.",
    NotFoundError: "No camera was found on this device. Connect one and try again.",
    DevicesNotFoundError: "No camera was found on this device. Connect one and try again.",
    NotReadableError: "The camera is busy or blocked, probably because another app is using it. Close that app and try again.",
    TrackStartError: "The camera is busy or blocked, probably because another app is using it. Close that app and try again.",
    OverconstrainedError: "This camera cannot give a usable picture. Try Switch camera.",
    SecurityError: "The browser blocked the camera on this page. Camera access needs https, or localhost.",
    AbortError: "The camera stopped before it could start. Try again."
  };
  function camSupport() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return "This browser cannot use a camera on this page. Use a current Chrome, Edge, Firefox or Safari over https or localhost.";
    if (window.isSecureContext === false) return "Camera access needs a secure page (https or localhost).";
    return "";
  }
  function setCam(msg, kind) { say("signCamStatus", msg); var s = el("signCamStatus"); if (s) s.dataset.kind = kind || ""; live(msg); }
  function setRec(msg) { say("signRecStatus", msg); }

  function startCamera() {
    var bad = camSupport(); if (bad) { setCam(bad, "error"); return Promise.resolve(false); }
    if (S.stream) return Promise.resolve(true);
    setCam("Opening the camera…", "loading"); el("signCamStart").disabled = true;
    var constraints = { audio: false, video: S.deviceId ? { deviceId: { exact: S.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } : { facingMode: S.facing, width: { ideal: 1280 }, height: { ideal: 720 } } };
    return navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
      S.stream = stream; var v = el("signVideo"); S.video = v; v.srcObject = stream;
      stream.getVideoTracks().forEach(function (t) { t.addEventListener("ended", function () { if (S.stream === stream) { stopCamera(); setCam("The camera was disconnected or stopped. Press Open camera to start again.", "error"); } }); });
      // The real frame size can change after playback starts (a track renegotiating, an OverconstrainedError
      // fallback resolution, a device hot-swap) - keep the pretrained models' cameraAspect in step whenever it does.
      v.addEventListener("resize", applyCameraAspect);
      return v.play().catch(function () {}).then(function () {
        var st = el("signStage"); if (v.videoWidth && v.videoHeight) st.style.aspectRatio = v.videoWidth + " / " + v.videoHeight; // never crop the hands
        applyCameraAspect();
        el("signDot").hidden = false; setCam("Camera on. Keep both hands and your upper body in view.", "ok");
        syncButtons(); return navigator.mediaDevices.enumerateDevices().then(function (d) {
          S.devices = d.filter(function (x) { return x.kind === "videoinput"; });
          el("signCamSwitch").hidden = S.devices.length < 2; syncButtons();
        }).catch(function () {}).then(function () { return true; });
      });
    }, function (err) {
      setCam(CAM_ERR[err && err.name] || ("The camera could not be opened (" + (err && (err.message || err.name) || "unknown error") + ")."), "error");
      el("signCamStart").disabled = false; syncButtons(); return false;
    });
  }

  function stopCamera() {
    stopRecognition(true);
    if (S.stream) { S.stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} }); S.stream = null; }
    var v = el("signVideo"); if (v) { try { v.pause(); } catch (e) {} v.srcObject = null; v.removeEventListener("resize", applyCameraAspect); }
    el("signDot").hidden = true; clearOverlay();
    applyCameraAspect(); // S.video's dimensions are gone now, so this clears cameraAspect rather than leaving it stale
    cancelTeach(); cancelPoseCapture();
    syncButtons();
  }

  function switchCamera() {
    if (S.devices.length < 2) return;
    var curId = S.stream && S.stream.getVideoTracks()[0] && S.stream.getVideoTracks()[0].getSettings().deviceId;
    var i = S.devices.map(function (d) { return d.deviceId; }).indexOf(curId);
    S.deviceId = S.devices[(i + 1) % S.devices.length].deviceId;
    var was = S.recognising;
    stopCamera(); startCamera().then(function (ok) { if (ok && was) startRecognition(); });
  }

  /* ------------------------------------------------------------------ recognition loop */
  function banner(msg) { var b = el("signBanner"); b.hidden = !msg; b.textContent = msg || ""; }

  function ensureExtractor() {
    var r = recognisers().filter(function (x) { return x.id === S.recId; })[0];
    var needsHolistic = !!(r && r.isHolistic);
    if (S.extractor && S.extractorReady && !!S.extractor.isHolistic === needsHolistic) return Promise.resolve(S.extractor);
    if (S.extractor) { try { S.extractor.dispose(); } catch (x) {} S.extractor = null; S.extractorReady = false; }
    S.extractor = window.SangamSign.extractorFactory(needsHolistic);
    banner(S.extractor.isMock ? "TEST HAND SOURCE: this is not the camera. Hands are supplied by an automated test." : "");
    setRec(needsHolistic ? "Loading the pretrained sign model's tracking library… (first time only)" : "Loading hand tracking… (first time only)");
    return S.extractor.load().then(function () {
      S.extractorReady = true; S.extractor.onError = function (e) { setRec("Tracking stopped: " + (e && e.message || e) + " Press Start recognition to try again."); stopRecognition(); };
      return S.extractor;
    }, function (e) {
      var ex = S.extractor; S.extractor = null; try { ex && ex.dispose(); } catch (x) {}
      throw new Error("The tracking model could not be loaded" + (e && e.message ? " (" + e.message + ")" : "") + ". Check your connection to this server and try again. You can still type, and nothing was sent.");
    });
  }

  function startRecognition() {
    if (!S.stream) { setRec("Open the camera first."); return; }
    if (S.recognising) return;
    var r = recognisers().filter(function (x) { return x.id === S.recId; })[0];
    S.adapter = r && r.adapter ? r.adapter : personal;
    if (S.recId === "personal" && !personal.isAvailable() && !S.teachLabel) setRec("Nothing taught yet, so no words can appear. Teach a sign below, then start again. Hand tracking will still run.");
    el("signRecStart").disabled = true;
    ensureExtractor().then(function (ex) {
      S.recognising = true; S.paused = false; S.run++; S.seg.reset(); S.stab.reset(); if (SST && !S.pose) S.pose = new SST.PoseStream(poseStore); resetSpelling(); S.lastLetterMsg = "";
      if (isModelRec(S.recId)) ensureWorkerModel(S.recId).catch(function () {});   // start loading the model's thread now, not when the first sign ends
      ex.start(S.video, ex.isHolistic ? onHolisticFrame : onHands);
      setRec(S.poseCap ? "Hand tracking is running. Hold one hand still in view to capture the pose." : isStatic(S.recId) && !S.teachLabel ? "Recognising your held poses. Show a pose with one hand and hold it still for about a second." : isSpelling(S.recId) && !S.teachLabel ? "Recognising " + (S.recId === "digits" ? "numbers. Make a number" : "letters. Make a letter") + " with one hand and hold it still for about a second."
        : personal.isAvailable() || S.teachLabel || S.recId !== "personal" ? "Recognising. Sign in front of the camera, then lower your hands." : "Hand tracking is running. Teach a sign to get words.");
      live("Recognition started."); syncButtons();
    }).catch(function (e) { setRec(e.message); live(e.message); S.recognising = false; syncButtons(); });
  }
  function pauseRecognition() { if (!S.recognising) return; S.paused = !S.paused; if (S.paused) { S.extractor.pause(); setRec("Paused. Nothing is being recognised."); live("Recognition paused."); clearOverlay(); say("signPartial", ""); } else { S.seg.reset(); resetSpelling(); S.extractor.resume(); setRec("Recognising."); live("Recognition resumed."); } syncButtons(); }
  function stopRecognition(silent) {
    if (S.extractor) { try { S.extractor.stop(); } catch (e) {} }
    var was = S.recognising; S.recognising = false; S.paused = false; S.run++; S.seg.reset(); resetSpelling(); say("signPartial", ""); hideHands();
    if (!silent && was) { setRec("Recognition stopped."); live("Recognition stopped."); }
    syncButtons();
  }

  /* ---- drawing the tracking overlay (optional) */
  var HAND_LINES = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
  function clearOverlay() { var c = el("signOverlay"); if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height); }
  function drawHands(hands) {
    var c = el("signOverlay"), v = S.video; if (!c || !v) return;
    if (c.width !== (v.videoWidth || 640)) { c.width = v.videoWidth || 640; c.height = v.videoHeight || 480; }
    var g = c.getContext("2d"); g.clearRect(0, 0, c.width, c.height);
    if (!el("signTrack").checked) return;
    g.lineWidth = Math.max(2, c.width / 300); g.strokeStyle = "#4DE1D2"; g.fillStyle = "#FFC857";
    hands.forEach(function (h) {
      var L = h.landmarks;
      HAND_LINES.forEach(function (p) { g.beginPath(); g.moveTo(L[p[0]].x * c.width, L[p[0]].y * c.height); g.lineTo(L[p[1]].x * c.width, L[p[1]].y * c.height); g.stroke(); });
      L.forEach(function (p) { g.beginPath(); g.arc(p.x * c.width, p.y * c.height, g.lineWidth * 1.4, 0, 6.3); g.fill(); });
    });
  }

  /* ---- one frame of hands -> segmenter -> adapter -> stabiliser -> transcript */
  function onHands(hands, t) {
    if (!S.recognising || S.paused) return;
    drawHands(hands);
    showHands(hands.length, "");
    if (S.poseCap) return onPoseCapture(hands);
    if (isStatic(S.recId) && S.pose && !S.teachLabel) return onStaticFrame(hands, t);
    if (isSpelling(S.recId) && !S.teachLabel && S.letters) return onLetterFrame(hands, t);
    var norm = E.normalise(hands), ev = S.seg.push(norm, t);
    if (ev.event === "start") { say("signPartial", "Sign in progress…"); S.lastPartialAt = t; S.partialSeen = 0; S.partialLabel = null; }
    else if (ev.event === "progress") providePartial(ev.frames, t);
    else if (ev.event === "discard") { say("signPartial", "That was too brief to be a sign, so it was ignored."); }
    else if (ev.event === "end") finishSign(ev.frames, t, ev.truncated);
  }
  /* ---- one frame of hands -> letter stream (fingerspelling). A letter is typed once its shape has been held still;
   * there is no "sign start / sign end" here, so the word Segmenter is not used. */
  function letterMsg(m) { if (m !== S.lastLetterMsg) { S.lastLetterMsg = m; say("signPartial", m); } } // write only on change, so a screen reader is not flooded
  function resetSpelling() { if (S.letters) S.letters.reset(); if (S.digits) S.digits.reset(); if (S.pose) S.pose.reset(); }
  function onLetterFrame(hands, t) {
    var digits = S.recId === "digits", what = digits ? "number" : "letter";
    var asp = S.video && S.video.videoHeight ? S.video.videoWidth / S.video.videoHeight : 16 / 9;
    var ev = (digits ? S.digits : S.letters).push(hands, t, asp);
    if (ev.event === "letter") {
      appendLetter(digits ? ev.letter : ev.letter.toLowerCase());
      say("signPartial", "Added “" + ev.letter + "”."); S.lastLetterMsg = "added";
      setConf((digits ? "Number " : "Letter ") + ev.letter + " (" + (ev.motion ? "drawn in the air" : "held shape") + "). Rule-based recognition, not independently verified by SANGAM. Check each " + what + ". Lower your hand or change shape for the next one.");
    } else if (ev.event === "held") letterMsg("Added “" + ev.letter + "”. Lower your hand, or change shape, for the next " + what + ".");
    else if (ev.event === "candidate") letterMsg(ev.moving ? "Hold your hand still to type a " + what + "." : !digits && ev.letter === "1" ? "Pointing finger seen. Draw a Z in the air, or change shape." : "Reading “" + ev.letter + "”. Keep holding still…");
    else if (ev.event === "seen") letterMsg(ev.ambiguous ? "Two " + what + "s look alike. Adjust your thumb or fingers a little." : "Hand seen, but no clear " + what + " yet.");
    else letterMsg("");
  }

  /* ---- one frame of full-body landmarks (pretrained ISL/ASL path) -> segmenter -> adapter -> stabiliser -> transcript
   * `norm` already has the shape E.Segmenter needs ({present:[bool,bool]}); no E.normalise() here, because the
   * pretrained models consume OpenHands' own 75-point layout, not sign-engine.js's hand-shape features. */
  /* "Are my hands being seen?" Shown while recognising, updated only when it changes (and not announced, to keep screen readers quiet). */
  var handsShown = "";
  function showHands(count, side) {   // side ("left"/"right") only when the tracker really says so (the body tracker does; the hands-only one does not)
    var n = el("signHands"); if (!n) return;
    var m = count > 1 ? "Both hands detected." : count === 1 ? "One hand detected" + (side ? " (" + side + ")" : "") + "." : "No hands detected. Raise your hands into view to sign.";
    if (m !== handsShown) { handsShown = m; n.hidden = false; n.textContent = m; }
  }
  function hideHands() { handsShown = ""; var n = el("signHands"); if (n) { n.hidden = true; n.textContent = ""; } }

  function onHolisticFrame(norm, t) {
    if (!S.recognising || S.paused) return;
    var pl = !!(norm.present && norm.present[0]), pr = !!(norm.present && norm.present[1]);
    showHands((pl ? 1 : 0) + (pr ? 1 : 0), pl && !pr ? "left" : pr && !pl ? "right" : "");
    drawHolistic(norm.raw);
    // keep only the numbers: holding every frame's full MediaPipe result (images included) for a whole sign wastes memory
    var ev = S.seg.push({ points: norm.points, present: norm.present, t: t }, t);
    if (ev.event === "start") { say("signPartial", "Sign in progress…"); S.lastPartialAt = t; S.partialSeen = 0; S.partialLabel = null; }
    else if (ev.event === "progress") providePartial(ev.frames, t);
    else if (ev.event === "discard") { say("signPartial", "That was too brief to be a sign, so it was ignored."); }
    else if (ev.event === "end") finishSign(ev.frames, t, ev.truncated);
  }
  function drawHolistic(raw) {
    var c = el("signOverlay"), v = S.video; if (!c || !v || !raw) return;
    if (c.width !== (v.videoWidth || 640)) { c.width = v.videoWidth || 640; c.height = v.videoHeight || 480; }
    var g = c.getContext("2d"); g.clearRect(0, 0, c.width, c.height);
    if (!el("signTrack").checked) return;
    g.lineWidth = Math.max(2, c.width / 300); g.strokeStyle = "#4DE1D2"; g.fillStyle = "#FFC857";
    [raw.leftHandLandmarks, raw.rightHandLandmarks].forEach(function (L) {
      if (!L) return;
      HAND_LINES.forEach(function (p) { g.beginPath(); g.moveTo(L[p[0]].x * c.width, L[p[0]].y * c.height); g.lineTo(L[p[1]].x * c.width, L[p[1]].y * c.height); g.stroke(); });
      L.forEach(function (p) { g.beginPath(); g.arc(p.x * c.width, p.y * c.height, g.lineWidth * 1.4, 0, 6.3); g.fill(); });
    });
  }
  function providePartial(frames, t) {
    if (S.teachLabel || t - S.lastPartialAt < 500 || frames.length < 10 || !S.adapter.isAvailable()) return;
    if (isModelRec(S.recId)) return;   // a word-model pass takes seconds: running it mid-sign froze tracking. The word appears when the sign ends.
    S.lastPartialAt = t;
    var r = S.adapter.classify(frames);
    if (r.state === "match") { S.partialSeen = (S.partialLabel === r.label) ? S.partialSeen + 1 : 1; S.partialLabel = r.label; if (S.partialSeen >= 2) say("signPartial", "Possibly “" + pretty(r.label) + "” (partial, not added yet)"); }
    else { S.partialLabel = null; S.partialSeen = 0; say("signPartial", "Sign in progress…"); }
  }
  function finishSign(frames, t, truncated) {
    if (S.teachLabel) return captureExample(frames);
    if (!S.adapter.isAvailable()) { say("signPartial", "Hands were tracked, but nothing has been taught yet, so there is no word to show."); return; }
    if (!isModelRec(S.recId)) return showResult(S.adapter.classify(frames), t, truncated, false);
    var run = S.run, recId = S.recId; say("signPartial", "Working out the word…");
    classifyAsync(recId, S.adapter, frames).then(function (result) {
      if (run !== S.run || !S.recognising) return;   // recognition was stopped or changed while the model was working
      showResult(result, performance.now(), truncated, true);
    }, function (e) { if (run === S.run) { var m = "The word model could not run (" + (e && e.message || e) + ")."; say("signPartial", m); live(m); } });
  }
  function showResult(result, t, truncated, usingModel) {
    var d = S.stab.decide(result, t);
    if (d.accept) {
      var pct = Math.round(d.closeness * 100);
      d.label = pretty(d.label);
      appendWord(d.label);
      setConf(usingModel ? "Model score: " + pct + "% (" + S.recId.toUpperCase() + " model's own confidence, not independently verified by SANGAM)" + (result.ranked[1] ? ". Next closest: " + pretty(result.ranked[1].label) : "")
        : "Match: " + pct + "% (how close this was to your example, not a probability)" + (result.ranked[1] ? ". Next closest: " + pretty(result.ranked[1].label) : ""));
      say("signPartial", "Added “" + d.label + "”.");
    } else if (d.reason === "duplicate") { say("signPartial", "Same sign again straight away: ignored so it is not repeated by accident."); }
    else if (d.reason === "no-vocabulary") { say("signPartial", "Nothing taught yet."); }
    else {
      var m = "Sign not recognised clearly. Please repeat."; say("signPartial", m);
      setConf(result.reason === "unstable" ? "The model's answer changed when the start and end of the sign were trimmed, so it was not sure and no word was typed. Sign clearly, then lower your hands."
        : d.reason === "ambiguous" ? "That sign was close to more than one " + (usingModel ? "word in the model's vocabulary" : "taught sign") + ", so no word was chosen."
        : d.reason === "low-confidence" ? "The best match was too weak to trust."
        : usingModel ? "The model did not recognise this clip as any sign in its vocabulary." : "That did not match any taught sign closely enough.");
      live(m);
    }
    if (truncated) setConf("The sign was cut at the maximum length. Lower your hands between signs.");
  }
  function setConf(m) { say("signConf", m); }

  /* ------------------------------------------------------------------ transcript */
  function textarea() { return el("signText"); }
  function appendWord(w) {
    var ta = textarea(), cur = ta.value, sep = cur && !/\s$/.test(cur) ? " " : "";
    ta.value = cur + sep + w; S.words.push({ word: w, text: ta.value }); S.confirmed = false;
    syncButtons(); live("Added " + w + ". Text now reads: " + ta.value);
    if (el("signAuto").checked) SG.speak(w);
  }
  /* Fingerspelling: letters join up with no space; "Add space" ends a word. Both undo one step at a time. */
  function appendLetter(ch) {
    var ta = textarea(); ta.value = ta.value + ch; S.words.push({ word: ch, text: ta.value }); S.confirmed = false;
    syncButtons(); live("Added " + ch + ". Text now reads: " + ta.value);
  }
  function addSpace() {
    var ta = textarea(); if (!ta.value || /\s$/.test(ta.value)) return;
    ta.value = ta.value + " "; S.words.push({ word: " ", text: ta.value }); S.confirmed = false; syncButtons(); live("Space added.");
  }
  function undoWord() {
    var last = S.words.pop(); if (!last) return;
    var ta = textarea();
    if (ta.value === last.text) { var prev = S.words.length ? S.words[S.words.length - 1].text : ""; ta.value = prev; }
    else { var i = ta.value.lastIndexOf(last.word); if (i >= 0) ta.value = (ta.value.slice(0, i) + ta.value.slice(i + last.word.length)).replace(/\s{2,}/g, " ").trim(); }
    S.confirmed = false; syncButtons(); live("Removed " + last.word + ".");
  }
  function clearText() { textarea().value = ""; S.words = []; S.confirmed = false; setConf(""); say("signPartial", ""); say("signSendNote", ""); syncButtons(); live("Text cleared."); }
  function confirmText() {
    if (!textarea().value.trim()) return; S.confirmed = true; say("signSendNote", "Confirmed. You can speak it or send it."); syncButtons(); live("Text confirmed.");
  }
  function sendText() {
    var t = textarea().value.trim();
    if (!t || !S.confirmed) { say("signSendNote", "Confirm the text first. Nothing is ever sent automatically."); return; }
    var via = S.recId === "personal" || S.recId === "static" ? "personal" : "model";
    var cid = SG.sendToChat(t, { source: "sign", via: via }, el("signSendNote"));
    if (cid) { S.lastSent = t; textarea().value = ""; S.words = []; S.confirmed = false; setConf(""); say("signPartial", ""); syncButtons(); live("Sending to the chat."); }
  }

  function syncButtons() {
    var cam = !!S.stream, has = !!textarea().value.trim();
    el("signCamStart").disabled = cam; el("signCamStop").disabled = !cam;
    el("signRecStart").disabled = !cam || S.recognising;
    el("signRecPause").disabled = !S.recognising; el("signRecPause").textContent = S.paused ? "Resume" : "Pause";
    el("signUndo").disabled = !S.words.length; el("signClear").disabled = !has; el("signCopy").disabled = !has;
    if (el("signSpace")) el("signSpace").disabled = !has || /\s$/.test(textarea().value);
    el("signConfirm").disabled = !has || S.confirmed; el("signSpeak").disabled = !has; el("signSend").disabled = !has || !S.confirmed;
    el("signRecord").disabled = !cam || !el("signLabel").value.trim() || !!S.teachLabel || S.recId !== "personal";
    el("signRecordCancel").hidden = !S.teachLabel;
    if (el("signPoseCapture")) { el("signPoseCapture").disabled = !SST || !cam || !el("signPoseLabel").value.trim() || !!S.poseCap || !!S.teachLabel || isModelRec(S.recId); el("signPoseCancel").hidden = !S.poseCap; }
  }

  /* ------------------------------------------------------------------ teaching */
  function armTeach() {
    var label = el("signLabel").value.trim(); if (!label || !S.stream) return;
    if (!S.recognising) { S.teachAfterStart = label; }
    S.teachLabel = label; S.adapter = personal; say("signTeachStatus", "Recording “" + label + "”: perform the sign now, then lower your hands.");
    live("Recording example for " + label + ". Perform the sign, then lower your hands.");
    if (!S.recognising) startRecognition();
    syncButtons();
  }
  function cancelTeach() { if (S.teachLabel) { S.teachLabel = null; say("signTeachStatus", "Recording cancelled."); } syncButtons(); }
  function captureExample(frames) {
    var label = S.teachLabel; S.teachLabel = null;
    try {
      var n = personal.addExample(label, frames);
      say("signTeachStatus", "Saved example " + n + " of “" + label + "”" + (n < E.MIN_EXAMPLES ? ". Record " + (E.MIN_EXAMPLES - n) + " more before it is used." : ". Record more at different speeds for better matching."));
      live("Saved example " + n + " of " + label + ".");
    } catch (e) { say("signTeachStatus", e.message); live(e.message); }
    S.stab.reset(); renderTaught();
  }

  /* ------------------------------------------------------------------ dialog open / close */
  function open(opener) {
    S.opener = opener || document.activeElement;
    var consented = lsGet(CONSENT_KEY) === "1";
    el("signConsent").hidden = consented; el("signMain").hidden = !consented;
    if (!dlg.open) { try { dlg.showModal(); } catch (e) { dlg.setAttribute("open", ""); } }
    if (el("signStrict")) el("signStrict").value = S.strict;
    applyStrict();
    personal.load().then(function () { tryLoadIsl().then(function () { renderTaught(); }); });
    var focusT = consented ? el("signCamStart") : el("signConsentGo"); if (focusT) focusT.focus();
    if (consented) live("Sign Language Camera opened. The camera is off until you press Open camera.");
  }
  function close() {
    stopCamera(); stopRecognition(true);
    if (S.extractor) { try { S.extractor.dispose(); } catch (e) {} S.extractor = null; S.extractorReady = false; }
    workerStop();   // free the word model's memory; it is started again on the next Start recognition
    SG.stop && SG.stop();
    if (dlg.open) dlg.close();
    if (S.opener && document.contains(S.opener) && S.opener.focus) S.opener.focus();
    S.opener = null;
  }
  dlg.addEventListener("cancel", function (e) { e.preventDefault(); close(); }); // Escape
  dlg.addEventListener("close", function () { stopCamera(); });
  window.addEventListener("pagehide", function () { stopCamera(); });
  window.addEventListener("hashchange", function () { if (dlg.open) close(); });

  /* ------------------------------------------------------------------ held poses (one hand, hold still) */
  function camAspect() { return S.video && S.video.videoHeight ? S.video.videoWidth / S.video.videoHeight : 16 / 9; }
  function poseMsg(m) { say("signPoseStatus", m); }
  function renderPoses() {
    var ul = el("signPoses"); if (!ul || !poseStore) return;
    var counts = poseStore.counts(), labels = Object.keys(counts), min = SST.MIN_EXAMPLES;
    el("signPoseForget").disabled = !labels.length; el("signPoseExport").disabled = !labels.length; el("signPoseCheck").disabled = !poseStore.isAvailable();
    ul.innerHTML = labels.length ? labels.map(function (l) {
      var n = counts[l];
      return '<li><span><b>' + esc(l) + "</b>: " + n + " capture" + (n === 1 ? "" : "s") + (n >= min ? "" : " (needs " + (min - n) + " more before it is used)") + '</span> <button class="btn btn-sm" type="button" data-delpose="' + esc(l) + '" aria-label="Delete the pose ' + esc(l) + '">Delete</button></li>';
    }).join("") : '<li class="note">No poses taught yet.</li>';
    renderLang(); renderPanel(); syncButtons();
  }
  function armPoseCapture() {
    if (!SST) return;
    var label = SST.cleanLabel(el("signPoseLabel").value); if (!label || !S.stream) return;
    if (isModelRec(S.recId)) { poseMsg("Choose “My held poses” in the language list first. The word models use a different tracker."); return; }
    S.poseCap = new SST.Capturer(label, 8); S.lastPoseMsg = "";
    poseMsg("Capturing “" + label + "”: hold the pose still with one hand in view."); live("Capturing the pose " + label + ". Hold one hand still.");
    if (!S.recognising) startRecognition();
    syncButtons();
  }
  function cancelPoseCapture() { if (S.poseCap) { S.poseCap = null; poseMsg("Capture cancelled. Nothing was saved."); } syncButtons(); }
  function onPoseCapture(hands) {
    var cap = S.poseCap, r = cap.push(hands, camAspect());
    if (!r.done) {
      var m = r.reason === "two_hands" ? "Use one hand." : r.reason === "no_hand" ? "Show one hand to the camera." : r.reason === "moving" ? "Hold still…" : "Holding still. " + r.count + " of " + cap.want + " captured.";
      if (m !== S.lastPoseMsg) { S.lastPoseMsg = m; poseMsg(m); }
      return;
    }
    S.poseCap = null; S.lastPoseMsg = "";
    if (!r.ok) { poseMsg("Could not get a steady view of one hand, so nothing was saved. Keep one hand in view, hold it still, and try again."); live("Capture failed. Nothing was saved."); syncButtons(); return; }
    var saved = 0, err = null;
    try { cap.vecs.forEach(function (v) { poseStore.add(cap.label, v); saved++; }); } catch (e) { err = e.message; }
    var n = poseStore.counts()[cap.label] || 0;
    poseMsg(err ? "Saved " + saved + " captures, then stopped: " + err : "Saved " + saved + " captures of “" + cap.label + "” (" + n + " in total)." + (n < SST.MIN_EXAMPLES ? " Capture again to start using it." : " Capture again with your hand a little closer, further or tilted for better matching."));
    live("Pose " + cap.label + " saved."); if (S.pose) S.pose.suppress(cap.label); renderPoses();
  }
  function onStaticFrame(hands, t) {
    if (!poseStore.isAvailable()) { letterMsg("Teach at least two different poses first (see “Teach a held pose”)."); return; }
    var ev = S.pose.push(hands, t, camAspect());
    if (ev.event === "word") {
      appendWord(ev.word); say("signPartial", "Added “" + ev.word + "”."); S.lastLetterMsg = "added";
      setConf("Pose “" + ev.word + "” (closeness " + Math.round(ev.closeness * 100) + "%, which is not a probability). Matched to a pose you taught, not to a sign language. Check it before sending. Lower your hand before the next one.");
    } else if (ev.event === "held") letterMsg("Added “" + ev.word + "”. Lower your hand, or change pose, for the next one.");
    else if (ev.event === "candidate") letterMsg("Reading “" + ev.word + "”. Keep holding still…");
    else if (ev.event === "seen") letterMsg(ev.reason === "two_hands" ? "Use one hand for held poses." : ev.reason === "ambiguous" ? "Two of your poses look alike. Adjust the shape, or re-teach them further apart." : ev.reason === "unknown" ? "That hand shape is not one of your taught poses, so nothing was typed." : "Hand seen, but not readable yet.");
    else letterMsg("");
  }
  function checkPoses() {
    var box = el("signPoseReport"), r = SST.evaluate(poseStore.poses);
    if (!r.ok) { box.textContent = r.reason; return; }
    var lines = ["Self-check on your own captures: " + r.correct + " of " + r.total + " matched the right pose (" + Math.round(r.accuracy * 100) + "%). " + r.wrong + " matched a different pose and " + r.rejected + " were not recognised."];
    Object.keys(r.perPose).forEach(function (k) { var p = r.perPose[k]; lines.push(k + ": " + p.correct + " of " + p.total + " right" + (p.wrong ? ", " + p.wrong + " mixed up with another pose" : "") + (p.rejected ? ", " + p.rejected + " not recognised" : "") + "."); });
    lines.push(r.note);
    box.innerHTML = lines.map(function (l) { return '<span style="display:block">' + esc(l) + "</span>"; }).join("");
  }
  function exportPoses() {
    var blob = new Blob([poseStore.exportJSON()], { type: "application/json" }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "sangam-my-poses.json"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); poseMsg("Downloaded your poses as numbers only (no pictures).");
  }

  /* ------------------------------------------------------------------ wiring */  function on(id, ev, fn) { var n = el(id); if (n) n.addEventListener(ev, fn); }
  on("signOpen", "click", function (e) { open(e.currentTarget); });
  on("signClose", "click", close);
  on("signConsentGo", "click", function () { lsSet(CONSENT_KEY, "1"); el("signConsent").hidden = true; el("signMain").hidden = false; el("signCamStart").focus(); startCamera(); });
  on("signConsentNo", "click", close);
  on("signCamStart", "click", startCamera);
  on("signCamStop", "click", function () { stopCamera(); setCam("Camera off.", ""); setRec(""); live("Camera stopped."); });
  on("signCamSwitch", "click", switchCamera);
  on("signRecStart", "click", startRecognition);
  on("signRecPause", "click", pauseRecognition);
  on("signLang", "change", function () {
    // Each recogniser needs its own tracking pipeline (body+hands for the word models, hands only for the rest), so a change
    // while running stops recognition; Start then builds the right one. Without this the old pipeline kept feeding the new recogniser.
    var was = S.recognising; if (was) { stopRecognition(true); setRec("Recogniser changed. Press Start recognition to use it."); }
    S.recId = el("signLang").value; var r = recognisers().filter(function (x) { return x.id === S.recId; })[0]; S.adapter = r && r.adapter || personal; renderLang(); syncButtons();
  });
  on("signText", "input", function () { S.confirmed = false; S.words = []; syncButtons(); });
  on("signStrict", "change", function () { var v = el("signStrict").value; S.strict = STRICT[v] ? v : "balanced"; lsSet(STRICT_KEY, S.strict); applyStrict(); });
  on("signUndo", "click", undoWord);
  on("signSpace", "click", addSpace);
  on("signClear", "click", clearText);
  on("signConfirm", "click", confirmText);
  on("signSpeak", "click", function () { var t = textarea().value.trim(); if (t) SG.speak(t); });
  on("signStopSpeak", "click", function () { SG.stop(); });
  on("signCopy", "click", function () {
    var t = textarea().value; if (!t) return;
    (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { say("signSendNote", "Copied."); }, function () { textarea().select(); say("signSendNote", "Copy was blocked. The text is selected: use your device's copy command."); });
  });
  on("signSend", "click", sendText);
  on("signLabel", "input", syncButtons);
  on("signRecord", "click", armTeach);
  on("signRecordCancel", "click", cancelTeach);
  on("signForgetAll", "click", function () { if (window.confirm("Delete every sign you have taught on this device?")) { personal.clearAll(); renderTaught(); say("signTeachStatus", "All taught signs deleted."); } });
  on("signTaught", "click", function (e) { var b = e.target.closest && e.target.closest("button[data-del]"); if (b) { personal.removeLabel(b.getAttribute("data-del")); renderTaught(); say("signTeachStatus", "Deleted " + b.getAttribute("data-del") + "."); } });
  on("signPoseLabel", "input", syncButtons);
  on("signPoseCapture", "click", armPoseCapture);
  on("signPoseCancel", "click", cancelPoseCapture);
  on("signPoseCheck", "click", checkPoses);
  on("signPoseExport", "click", exportPoses);
  on("signPoseForget", "click", function () { if (poseStore && window.confirm("Delete every held pose you have taught on this device?")) { poseStore.clearAll(); say("signPoseReport", ""); renderPoses(); poseMsg("All held poses deleted."); } });
  on("signPoses", "click", function (e) { var b = e.target.closest && e.target.closest("button[data-delpose]"); if (b && poseStore) { var l = b.getAttribute("data-delpose"); poseStore.removeLabel(l); renderPoses(); poseMsg("Deleted " + l + "."); } });
  on("signTrack", "change", function () { if (!el("signTrack").checked) clearOverlay(); });
  personal.load().then(function () { tryLoadIsl().then(function () { renderPanel(); }); });
  renderPanel(); renderPoses();
})();
