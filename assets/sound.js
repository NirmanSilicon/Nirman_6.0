/*
 * Sound alerts: microphone, YAMNet classification, and the alert itself.
 *
 *   Microphone  -> AudioWorklet (or ScriptProcessor fallback) -> resample to 16 kHz -> 0.975 s windows
 *   YAMNet      -> 521 AudioSet class scores, run locally by MediaPipe Tasks Audio (wasm, Apache-2.0)
 *   Detector    -> assets/sound-engine.js decides when a sound type has STARTED (one alert, no repeats)
 *   Alert       -> visible banner, optional screen flash, vibration, spoken alert, history entry
 *
 * Privacy: audio is analysed in this browser and thrown away. It is never stored, uploaded or recorded.
 * Only the class scores for the current window exist, for a fraction of a second.
 * If the model is not loaded, detection is OFF and the interface says so. Nothing here fakes a detection:
 * the "Preview" buttons are labelled as simulated everywhere they show up.
 */
(function () {
  "use strict";
  var SG = window.Sangam, E = window.SangamSoundEngine;
  if (!SG || !E) return;
  var $ = SG.$, esc = SG.esc, ic = SG.ic;
  if (!$("#sndStart")) return;

  var PREFS_KEY = "sangam.sound.v1";
  var BASE = "vendor/mediapipe/audio/", MODEL_URL = "vendor/yamnet/yamnet.tflite", CLASSMAP_URL = "vendor/yamnet/yamnet_class_map.csv";
  var el = function (id) { return document.getElementById(id); };
  var canBuzz = typeof navigator.vibrate === "function";
  var reduceMotion = function () { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; };

  /* ------------------------------------------------------------------ preferences (settings only, never audio) */
  function loadPrefs() {
    var p = JSON.parse(JSON.stringify(E.DEFAULTS));
    try {
      var o = JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
      if (o) {
        if (Array.isArray(o.on)) p.on = o.on.filter(function (id) { return E.category(id); });
        if (E.SENSITIVITY[o.sensitivity]) p.sensitivity = o.sensitivity;
        ["flash", "vibrate", "speak"].forEach(function (k) { if (typeof o[k] === "boolean") p[k] = o[k]; });
      }
    } catch (e) { /* storage blocked: defaults */ }
    return p;
  }
  var prefs = loadPrefs();
  function savePrefs() { try { localStorage.setItem(PREFS_KEY, JSON.stringify({ on: prefs.on, sensitivity: prefs.sensitivity, flash: prefs.flash, vibrate: prefs.vibrate, speak: prefs.speak })); } catch (e) { /* ignore */ } }

  var detector = new E.Detector({ on: prefs.on, sensitivity: prefs.sensitivity });

  /* ------------------------------------------------------------------ state */
  var model = { state: "idle", clf: null, names: null, promise: null, error: "" }; // idle | loading | ready | failed
  var mic = { stream: null, ctx: null, node: null, sink: null, source: null, proc: null, listening: false, starting: false };
  var pipe = { rate: 0, rs: null, win: new E.Windower() };
  var run = { busy: false, pending: null, analysed: 0, dropped: 0, lastAt: 0, lastLevel: 0, quietSince: 0, health: 0, meterAt: 0 };
  var history = [], visible = [], flashTimer = 0;
  var clock = function () { return Date.now(); }; // tests replace this with audio time

  function live(msg, level) { if (SG.announce) SG.announce(msg, level || "info", el("sndLive")); }
  function note(msg) { var n = el("sndNote"); if (n) n.textContent = msg; }
  function stamp(t) { return new Date(t || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
  function pct(x) { return Math.round(Math.max(0, Math.min(1, x)) * 100) + "%"; }

  /* ------------------------------------------------------------------ model */
  function modelLine() {
    var m = el("sndModel"); if (!m) return;
    var s = model.state;
    m.textContent = s === "ready" ? "Sound model: loaded on this device. Detection is available."
      : s === "loading" ? "Sound model: loading (about 26 MB, once per visit)…"
      : s === "failed" ? "Sound model: NOT loaded. Detection is off. " + model.error
      : "Sound model: not loaded yet. It loads when you press Start listening. Until then, nothing is detected.";
    m.dataset.state = s;
  }

  function loadModel() {
    if (model.state === "ready") return Promise.resolve();
    if (model.promise) return model.promise;
    model.state = "loading"; model.error = ""; modelLine();
    var fetchOk = function (u, kind) { return fetch(u).then(function (r) { if (!r.ok) throw new Error("Could not load the " + kind + " (HTTP " + r.status + ")."); return kind === "labels" ? r.text() : r.arrayBuffer(); }); };
    model.promise = Promise.all([import(new URL(BASE + "audio_bundle.mjs", document.baseURI).href), fetchOk(CLASSMAP_URL, "labels"), fetchOk(MODEL_URL, "model")]).then(function (parts) {
      var names = E.parseClassMap(parts[1]), chk = E.verifyClassMap(names);
      if (!chk.ok) throw new Error("The label file does not match what SANGAM expects (" + chk.problems[0] + ").");
      return parts[0].FilesetResolver.forAudioTasks(BASE + "wasm").then(function (files) {
        return parts[0].AudioClassifier.createFromOptions(files, { baseOptions: { modelAssetBuffer: new Uint8Array(parts[2]) }, maxResults: -1 });
      }).then(function (clf) {
        // Warm-up and self-check: the labels stored inside the model must agree with our label file.
        var res = clf.classify(new Float32Array(E.WINDOW), E.RATE), cats = res && res[0] && res[0].classifications && res[0].classifications[0] && res[0].classifications[0].categories;
        if (!cats || cats.length !== E.NUM_CLASSES) throw new Error("The model returned " + (cats ? cats.length : 0) + " classes, expected " + E.NUM_CLASSES + ".");
        for (var i = 0; i < cats.length; i++) if (cats[i].categoryName && cats[i].categoryName !== names[cats[i].index]) throw new Error("Model and label file disagree at class " + cats[i].index + ".");
        model.clf = clf; model.names = names; model.state = "ready"; modelLine();
      });
    }).catch(function (e) {
      model.state = "failed"; model.promise = null; model.clf = null;
      model.error = (e && e.message ? e.message : "Unknown error.") + (/Failed to fetch|NetworkError|Could not load/i.test(e && e.message || "") ? " Check that this page is served by the SANGAM server and is online." : "");
      modelLine(); throw e;
    });
    return model.promise;
  }

  function classify(win) {
    var res = model.clf.classify(win, E.RATE), s = new Float32Array(E.NUM_CLASSES);
    (res || []).forEach(function (r) {
      var cats = r.classifications && r.classifications[0] && r.classifications[0].categories || [];
      cats.forEach(function (c) { if (c.score > s[c.index]) s[c.index] = c.score; });
    });
    return s;
  }

  /* ------------------------------------------------------------------ analysis pipeline */
  function level(x) {
    var now = Date.now(), v = E.rms(x);
    run.lastLevel = v;
    if (v > 2e-4) run.quietSince = 0; else if (!run.quietSince) run.quietSince = now;
    if (now - run.meterAt > 200) {
      run.meterAt = now;
      var f = el("sndMeterFill"); if (f) f.style.width = Math.min(100, Math.round(Math.sqrt(v) * 160)) + "%";
    }
  }
  function feed(samples, rate) {
    if (!pipe.rs || pipe.rate !== rate) { pipe.rate = rate; pipe.rs = new E.Resampler(rate, E.RATE); pipe.win.reset(); }
    level(samples);
    pipe.win.push(pipe.rs.process(samples)).forEach(enqueue);
  }
  function enqueue(win) {
    if (!model.clf) return;
    if (run.busy) { if (run.pending) run.dropped++; run.pending = win; return; }
    analyse(win);
  }
  function analyse(win) {
    run.busy = true;
    var loud = E.rms(win); // same window YAMNet just scored, so the loudness-only fallback hears exactly what classification heard
    setTimeout(function () {
      try {
        handle(classify(win), clock(), loud);
      } catch (e) {
        stopListening("Analysis stopped because of an error: " + (e && e.message ? e.message : e));
      }
      run.busy = false;
      if (run.pending && model.clf) { var w = run.pending; run.pending = null; analyse(w); }
    }, 0);
  }
  function handle(scores, t, loud) {
    run.analysed++; run.lastAt = Date.now();
    var r = detector.push(scores, t, loud);
    r.alerts.forEach(function (a) { present(a, false); });
    r.updates.forEach(function (u) { setStatus(u.category, "Still sounding"); });
    r.ended.forEach(function (u) { setStatus(u.category, "Stopped"); live((E.category(u.category) || {}).n + " has stopped.", "important"); scheduleHide(u.category, 10000); });
    renderListening();
  }

  /* ------------------------------------------------------------------ alerts */
  function present(a, test) {
    var c = E.category(a.category); if (!c) return;
    var free = !!(a.classificationFree || c.classificationFree);
    history.unshift({ t: Date.now(), id: c.id, n: c.n, score: a.score, test: !!test, cls: a.className || "", free: free });
    history = history.slice(0, 50); renderHistory();
    // Replace an older banner entry for the same type.
    visible = visible.filter(function (v) { if (v.id === c.id) { clearTimeout(v.timer); return false; } return true; });
    var entry = { id: c.id, n: c.n, score: a.score, test: !!test, free: free, status: test ? "Preview only" : "Sounding now", t: Date.now(), timer: 0 };
    visible.push(entry);
    if (test) scheduleHide(c.id, 8000);
    renderBanner(c.id);
    if (prefs.flash) flash(c.color);
    if (prefs.vibrate && canBuzz) { try { navigator.vibrate(c.vib); } catch (e) { /* ignore */ } }
    if (prefs.speak && SG.speak) SG.speak((test ? "Test. " : "") + (free ? "Loud sound detected, not identified" : c.n + " detected"));
    try { window.dispatchEvent(new CustomEvent("sangam:sound-alert", { detail: { category: c.id, label: c.n, score: a.score, className: a.className || "", classificationFree: free, test: !!test, vibration: c.vib } })); } catch (e) { /* ignore */ }
  }
  function scheduleHide(id, ms) {
    visible.forEach(function (v) { if (v.id === id) { clearTimeout(v.timer); v.timer = setTimeout(function () { dismiss(id); }, ms); } });
  }
  function setStatus(id, text) {
    visible.forEach(function (v) { if (v.id === id && v.status !== text) { v.status = text; var s = document.querySelector('#soundAlert .snd-item[data-id="' + id + '"] .snd-st'); if (s) s.textContent = text; } });
  }
  function dismiss(id) {
    visible = visible.filter(function (v) { if (!id || v.id === id) { clearTimeout(v.timer); return false; } return true; });
    renderBanner();
  }
  function renderBanner(newId) {
    var box = el("soundAlert"); if (!box) return;
    var list = box.querySelector(".snd-list");
    // Only a NEW item is created with role=alert, so a screen reader announces it once and updates stay quiet.
    var have = {}; Array.prototype.forEach.call(list.children, function (li) { have[li.dataset.id] = li; });
    Array.prototype.forEach.call(list.children, function (li) { if (!visible.some(function (v) { return v.id === li.dataset.id; })) list.removeChild(li); });
    visible.forEach(function (v) {
      var c = E.category(v.id), li = have[v.id];
      if (li && v.id !== newId) return;
      if (li) list.removeChild(li);
      li = document.createElement("div"); li.className = "snd-item" + (v.free ? " snd-item-free" : ""); li.dataset.id = v.id; li.style.setProperty("--c", c.color); li.setAttribute("role", "alert");
      li.innerHTML = '<span class="snd-ic" aria-hidden="true">' + ic(c.icon) + '</span><span class="snd-tx"><b>' + (v.test ? "Preview (not a real sound): " : "") + esc(v.n) + (v.test ? "" : " detected") + '</b><span class="snd-conf">' + (v.test ? "Simulated alert. Nothing was heard." : v.free ? "Loudness only &mdash; not identified as any known sound. Confidence " + pct(v.score) : "Confidence " + pct(v.score)) + ' · ' + esc(stamp(v.t)) + ' · <span class="snd-st" aria-hidden="true">' + esc(v.status) + "</span></span></span>" +
        '<button class="btn btn-sm" type="button" data-dismiss="' + v.id + '" aria-label="Dismiss ' + esc(v.n) + ' alert">Dismiss</button>';
      list.appendChild(li);
    });
    box.hidden = visible.length === 0;
  }
  function flash(color) {
    var f = el("soundFlash"); if (!f) return;
    clearTimeout(flashTimer);
    f.style.setProperty("--c", color);
    f.classList.remove("on", "calm"); void f.offsetWidth;
    // Reduced motion: one steady colour tint, no pulsing. Otherwise two slow pulses (under 2 Hz, no strobing).
    f.classList.add(reduceMotion() ? "calm" : "on");
    flashTimer = setTimeout(function () { f.classList.remove("on", "calm"); }, 2200);
  }

  /* ------------------------------------------------------------------ history */
  function renderHistory() {
    var ol = el("sndLog"); if (!ol) return;
    if (!history.length) { ol.innerHTML = "<li>Nothing detected yet.</li>"; return; }
    ol.innerHTML = history.map(function (h) {
      return "<li>" + esc(stamp(h.t)) + " · <b>" + esc(h.n) + "</b> · " + (h.test ? "simulated preview, not a real sound" : h.free ? "loudness only, not identified" : "confidence " + pct(h.score) + (h.cls ? " (" + esc(h.cls) + ")" : "")) + "</li>";
    }).join("");
  }

  /* ------------------------------------------------------------------ microphone */
  function micError(e) {
    var n = e && e.name || "";
    if (n === "NotAllowedError" || n === "PermissionDeniedError") return "The microphone is blocked. Allow it in your browser's site settings, then press Start listening again. The preview buttons still work.";
    if (n === "NotFoundError" || n === "DevicesNotFoundError") return "No microphone was found. Connect one and try again. The preview buttons still work.";
    if (n === "NotReadableError" || n === "TrackStartError") return "The microphone is in use by another app or cannot be opened. Close the other app and try again.";
    if (n === "SecurityError") return "The browser only allows the microphone on https:// or localhost pages.";
    if (n === "OverconstrainedError") return "This microphone cannot be used with the required settings.";
    return "Could not start the microphone" + (e && e.message ? " (" + e.message + ")" : "") + ".";
  }
  function setButton() {
    var b = el("sndStart"), l = el("sndLabel"); if (!b || !l) return;
    l.textContent = mic.starting ? "Starting…" : mic.listening ? "Stop listening" : "Start listening";
    b.disabled = mic.starting;
    var bar = el("soundBar"); if (bar) bar.hidden = !mic.listening;
    var beep = el("sndBeep"); if (beep) beep.disabled = !mic.listening;
  }
  function renderListening() {
    var t = el("sndLevelText"); if (!t) return;
    if (!mic.listening) { t.textContent = "Microphone is off."; return; }
    var now = Date.now(), quiet = run.quietSince && now - run.quietSince > 10000;
    t.textContent = (quiet ? "The microphone is sending almost no signal. It may be muted or covered. " : "Microphone is on. ") + "Analysed " + run.analysed + " windows" + (run.lastAt ? ", last at " + stamp(run.lastAt) : "") + (run.dropped ? ". " + run.dropped + " skipped because this device is slow." : ".");
  }

  function startListening() {
    if (mic.listening || mic.starting) return;
    mic.starting = true; setButton();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { mic.starting = false; setButton(); note("This browser cannot use the microphone."); return; }
    note("Loading the sound model. The microphone stays off until it is ready.");
    loadModel().then(function () {
      note("Waiting for microphone permission…");
      return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 } });
    }).then(function (stream) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { stream.getTracks().forEach(function (t) { t.stop(); }); throw Object.assign(new Error("This browser has no Web Audio support."), { name: "NoAudio" }); }
      mic.stream = stream; mic.ctx = new AC();
      stream.getAudioTracks().forEach(function (t) { t.addEventListener("ended", function () { if (mic.listening) stopListening("The microphone stopped (unplugged, muted by the system, or permission removed)."); }); });
      mic.source = mic.ctx.createMediaStreamSource(stream);
      var rate = mic.ctx.sampleRate, sink = mic.ctx.createGain(); sink.gain.value = 0; sink.connect(mic.ctx.destination); mic.sink = sink;
      var hook = function (node, isWorklet) {
        mic.node = node;
        if (isWorklet) node.port.onmessage = function (e) { if (mic.listening) feed(e.data, rate); };
        mic.source.connect(node); node.connect(sink);
      };
      var resume = mic.ctx.state === "suspended" ? mic.ctx.resume() : Promise.resolve();
      return resume.then(function () {
        if (mic.ctx.audioWorklet && typeof AudioWorkletNode === "function") {
          return mic.ctx.audioWorklet.addModule("assets/sound-worklet.js").then(function () { hook(new AudioWorkletNode(mic.ctx, "sangam-mic-tap", { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 }), true); });
        }
        var p = mic.ctx.createScriptProcessor(4096, 1, 1); // older browsers only
        p.onaudioprocess = function (e) { if (mic.listening) feed(new Float32Array(e.inputBuffer.getChannelData(0)), rate); };
        hook(p, false);
      });
    }).then(function () {
      mic.listening = true; mic.starting = false; run.analysed = 0; run.dropped = 0; run.lastAt = Date.now(); run.quietSince = 0;
      detector.reset(); pipe.win.reset(); pipe.rs = null;
      clearInterval(run.health);
      run.health = setInterval(function () {
        if (!mic.listening) return;
        if (Date.now() - run.lastAt > 6000) note("No audio has been analysed for a few seconds, so nothing is being detected. The browser may have paused the microphone (screen off, tab in the background, or another app took it). Press Stop, then Start listening.");
        else note("Listening for the sound types you chose. Detection is running on this device.");
        renderListening();
      }, 2000);
      setButton(); renderListening();
      note("Listening for the sound types you chose. Detection is running on this device.");
      live("Sound alerts are listening. The microphone is on.");
    }).catch(function (e) {
      teardown(); mic.starting = false; setButton();
      if (model.state === "failed") note("The sound model could not be loaded, so detection is off. " + model.error + " Press Start listening to try again. The preview buttons still work.");
      else note(micError(e));
      live("Sound alerts could not start.", "important");
    });
  }

  function teardown() {
    clearInterval(run.health);
    try { if (mic.node) { mic.node.disconnect(); if (mic.node.port) mic.node.port.onmessage = null; if ("onaudioprocess" in mic.node) mic.node.onaudioprocess = null; } } catch (e) { /* ignore */ }
    try { if (mic.source) mic.source.disconnect(); } catch (e) { /* ignore */ }
    try { if (mic.sink) mic.sink.disconnect(); } catch (e) { /* ignore */ }
    try { if (mic.ctx) mic.ctx.close(); } catch (e) { /* ignore */ }
    if (mic.stream) mic.stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) { /* ignore */ } });
    mic.stream = mic.ctx = mic.node = mic.source = mic.sink = null;
    pipe.rs = null; pipe.win.reset(); run.pending = null;
    var f = el("sndMeterFill"); if (f) f.style.width = "0";
  }
  function stopListening(reason) {
    var was = mic.listening || mic.stream;
    mic.listening = false; teardown(); detector.reset();
    visible.forEach(function (v) { if (!v.test) v.status = "Stopped"; });
    setButton(); renderListening();
    if (was) { note(reason || "Stopped. The microphone is off."); live(reason || "Sound alerts stopped. The microphone is off.", "important"); }
  }

  /* ------------------------------------------------------------------ test beep (real pipeline check) */
  function playBeep() {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    var ac = new AC(), g = ac.createGain(), at = ac.currentTime;
    g.gain.value = 0; g.connect(ac.destination);
    for (var i = 0; i < 8; i++) { // 3.1 kHz beeps, 0.25 s on, 0.25 s off, like a smoke detector
      var o = ac.createOscillator(); o.type = "sine"; o.frequency.value = 3100; o.connect(g);
      g.gain.setValueAtTime(0.35, at + i * 0.5); g.gain.setValueAtTime(0, at + i * 0.5 + 0.25);
      o.start(at + i * 0.5); o.stop(at + i * 0.5 + 0.25);
    }
    setTimeout(function () { try { ac.close(); } catch (e) { /* ignore */ } }, 4600);
    note("Playing a 4 second beep. If your speaker is loud enough for the microphone to hear it, a smoke alarm alert should appear. If nothing appears, that tells you how well this device hears.");
  }

  /* ------------------------------------------------------------------ controls */
  function draw() {
    el("sndTypes").innerHTML = E.CATEGORIES.map(function (c) {
      return '<label class="chip"><input type="checkbox" data-snd="' + c.id + '"' + (prefs.on.indexOf(c.id) >= 0 ? " checked" : "") + "><span>" + ic(c.icon) + esc(c.n) + "</span></label>";
    }).join("");
    el("sndSens").innerHTML = Object.keys(E.SENSITIVITY).map(function (k) {
      return '<label class="chip"><input type="radio" name="sndSens" value="' + k + '"' + (prefs.sensitivity === k ? " checked" : "") + "><span>" + esc(E.SENSITIVITY[k].label) + "</span></label>";
    }).join("");
    el("sndModes").innerHTML = [["flash", "Screen flash", "captions"], ["vibrate", "Vibration", "vibrate"], ["speak", "Spoken alert", "volume-2"]].map(function (m) {
      var off = m[0] === "vibrate" && !canBuzz;
      return '<label class="chip"><input type="checkbox" data-sndmode="' + m[0] + '"' + (prefs[m[0]] ? " checked" : "") + (off ? " disabled" : "") + "><span>" + ic(m[2]) + m[1] + (off ? " (not supported here)" : "") + "</span></label>";
    }).join("");
    el("sndPreview").innerHTML = E.CATEGORIES.concat([E.LOUD_CATEGORY]).map(function (c) {
      return '<button class="btn btn-sm" type="button" data-preview="' + c.id + '">' + ic(c.icon) + "Preview " + esc(c.n.toLowerCase()) + "</button>";
    }).join("");
    var lb = el("sndLoudType"); if (lb) lb.innerHTML = '<label class="chip"><input type="checkbox" data-snd="' + E.LOUD_CATEGORY.id + '"' + (prefs.on.indexOf(E.LOUD_CATEGORY.id) >= 0 ? " checked" : "") + "><span>" + ic(E.LOUD_CATEGORY.icon) + esc(E.LOUD_CATEGORY.n) + "</span></label>";
  }
  el("sndStart").addEventListener("click", function () { mic.listening ? stopListening() : startListening(); });
  var barStop = el("sndBarStop"); if (barStop) barStop.addEventListener("click", function () { stopListening(); });
  el("sndBeep").addEventListener("click", playBeep);
  function onCatToggle(e) {
    var id = e.target.dataset && e.target.dataset.snd; if (!id) return;
    prefs.on = prefs.on.filter(function (x) { return x !== id; }); if (e.target.checked) prefs.on.push(id);
    detector.configure({ on: prefs.on }); savePrefs();
  }
  el("sndTypes").addEventListener("change", onCatToggle);
  var sndLoudType = el("sndLoudType"); if (sndLoudType) sndLoudType.addEventListener("change", onCatToggle);
  el("sndSens").addEventListener("change", function (e) {
    if (e.target.name !== "sndSens") return;
    prefs.sensitivity = e.target.value; detector.configure({ sensitivity: prefs.sensitivity }); savePrefs();
  });
  el("sndModes").addEventListener("change", function (e) {
    var k = e.target.dataset && e.target.dataset.sndmode; if (!k) return;
    prefs[k] = e.target.checked; savePrefs();
    if (k === "vibrate" && e.target.checked && canBuzz) { try { navigator.vibrate(120); } catch (err) { /* ignore */ } }
  });
  el("sndPreview").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-preview]"); if (!b) return;
    present({ category: b.dataset.preview, score: 1 }, true);
  });
  el("soundAlert").addEventListener("click", function (e) { var b = e.target.closest("button[data-dismiss]"); if (b) { dismiss(b.dataset.dismiss); } });
  el("sndClear").addEventListener("click", function () { history = []; renderHistory(); live("History cleared."); });

  window.addEventListener("pagehide", function () { if (mic.listening) stopListening(); });

  /* ------------------------------------------------------------------ public surface (tests use _test; nothing here is needed by the app) */
  window.SangamSound = {
    engine: E,
    isListening: function () { return mic.listening; },
    modelState: function () { return model.state; },
    history: function () { return history.slice(); },
    start: startListening, stop: stopListening,
    _test: {
      // Feed audio through the REAL resample -> window -> YAMNet -> detector path without a microphone.
      feedAudio: function (samples, rate) { feed(samples, rate); },
      loadModel: loadModel,
      present: present,
      stats: function () { return { analysed: run.analysed, dropped: run.dropped, busy: run.busy }; },
      reset: function () { detector.reset(); history = []; visible = []; renderHistory(); renderBanner(); run.pending = null; pipe.rs = null; pipe.win.reset(); },
      setClock: function (fn) { clock = fn || function () { return Date.now(); }; },
      idle: function () { return new Promise(function (res) { (function w() { if (!run.busy && !run.pending) res(); else setTimeout(w, 10); })(); }); }
    }
  };

  draw(); renderHistory(); modelLine(); setButton(); renderListening();
})();
