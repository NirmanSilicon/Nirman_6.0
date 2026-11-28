/*
 * SANGAM sound-alert engine (pure logic, no DOM, no audio hardware).
 *
 * The neural network is YAMNet (Google, Apache-2.0): 521 AudioSet classes scored on
 * 0.975 s windows of 16 kHz mono audio. This file does everything around the network:
 *   - parse and verify the class map so a wrong label file is refused, not trusted
 *   - resample microphone audio to 16 kHz and cut it into overlapping windows
 *   - group classes into the sound types a deaf or deafblind person wants to hear about
 *   - decide when to alert: onset only, hysteresis, cooldown, no repeats for a continuous sound
 *
 * YAMNet scores are NOT probabilities. They are not calibrated across classes. The
 * "confidence" shown to a user is the raw class score, and the sensitivity setting is a
 * score threshold, not a promise about accuracy.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SangamSoundEngine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var RATE = 16000;
  var WINDOW = 15600; // 0.975 s: what YAMNet expects
  var HOP = 7800; // 0.4875 s: windows overlap by half so a short alarm is seen twice
  var NUM_CLASSES = 521;

  /* Each category names AudioSet classes by index AND by expected name. At load the
     class map is checked against these names, so a misordered label file fails loudly. */
  var CATEGORIES = [
    { id: "fire", n: "Smoke or fire alarm", icon: "flame", color: "#E5484D", defaultOn: true,
      vib: [500, 150, 500, 150, 500, 150, 500],
      classes: [[393, "Smoke detector, smoke alarm"], [394, "Fire alarm"]] },
    { id: "alarm", n: "Other alarm or buzzer", icon: "triangle-alert", color: "#E5484D", defaultOn: true,
      vib: [400, 150, 400, 150, 400],
      classes: [[382, "Alarm"], [389, "Alarm clock"], [392, "Buzzer"], [304, "Car alarm"]] },
    { id: "siren", n: "Siren", icon: "siren", color: "#E5484D", defaultOn: true,
      vib: [600, 200, 600],
      classes: [[390, "Siren"], [391, "Civil defense siren"], [316, "Emergency vehicle"], [317, "Police car (siren)"], [318, "Ambulance (siren)"], [319, "Fire engine, fire truck (siren)"]] },
    { id: "doorbell", n: "Doorbell", icon: "bell", color: "#C77700", defaultOn: true,
      vib: [200, 100, 500],
      classes: [[349, "Doorbell"], [350, "Ding-dong"]] },
    { id: "horn", n: "Vehicle horn", icon: "car", color: "#0E7C86", defaultOn: true,
      vib: [800, 200, 800],
      classes: [[302, "Vehicle horn, car horn, honking"], [312, "Air horn, truck horn"]] },
    { id: "knock", n: "Knock", icon: "bell", color: "#C77700", defaultOn: false,
      vib: [150, 100, 150, 100, 150],
      classes: [[353, "Knock"]] },
    { id: "baby", n: "Baby crying", icon: "frown", color: "#7A6FA8", defaultOn: false,
      vib: [300, 200, 300, 200, 300],
      classes: [[20, "Baby cry, infant cry"]] },
    { id: "glass", n: "Glass breaking", icon: "triangle-alert", color: "#E5484D", defaultOn: false,
      vib: [250, 100, 250, 100, 250],
      classes: [[435, "Glass"], [437, "Shatter"]] }
  ];

  /* Score thresholds. Raw, uncalibrated class scores: a lower number alerts more often
     and gives more false alarms. Medium matches the 0.35 used in the Flutter reference.
     loudRms is for the separate "Loud sound (not identified)" fallback below, on the
     RMS (root-mean-square) loudness of the window, 0..~1 for float PCM samples. */
  var SENSITIVITY = {
    low: { threshold: 0.55, label: "Low (fewer false alarms, may miss quiet sounds)", loudRms: 0.09 },
    medium: { threshold: 0.35, label: "Medium", loudRms: 0.05 },
    high: { threshold: 0.25, label: "High (catches more, more false alarms)", loudRms: 0.03 }
  };

  /*
   * "Loud sound (not identified)" is a supplemental, loudness-only fallback: an earlier
   * teammate's prototype (Person 4) detected loud sounds purely from microphone volume,
   * with no classification at all. YAMNet classification above is strictly more capable
   * for the eight categories it knows, so that prototype is not used as-is; but a volume-only
   * check still catches a loud sound that YAMNet does not recognise as any of its 521 classes
   * (a genuinely novel noise, a class YAMNet was not trained on, or a sound too short/distorted
   * for it to score confidently). This is NOT sound classification: it is a louder-than-usual
   * check with no idea what made the noise, and the interface always labels it that way,
   * distinctly from a classified alert, so a person is never left thinking YAMNet "recognised"
   * an unidentified bang. Off by default: classification already covers the sounds most people
   * want to be alerted to, and an unfiltered volume trigger alone produces far more false alarms.
   */
  var LOUD_CATEGORY = { id: "loud", n: "Loud sound (not identified)", icon: "volume-2", color: "#6E6E76", defaultOn: false,
    vib: [200, 120, 200], classificationFree: true };

  var DEFAULTS = {
    on: CATEGORIES.filter(function (c) { return c.defaultOn; }).map(function (c) { return c.id; }),
    sensitivity: "medium",
    flash: true,
    vibrate: true,
    speak: false, // never on by default
    cooldownMs: 4000,
    releaseMs: 2000
  };

  function category(id) {
    if (id === LOUD_CATEGORY.id) return LOUD_CATEGORY;
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i];
    return null;
  }

  /* ----- class map ------------------------------------------------------------ */
  // CSV: index,mid,display_name   (display_name may be quoted and contain commas)
  function parseCsvLine(line) {
    var out = [], cur = "", q = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (q) {
        if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ",") { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  }
  function parseClassMap(csv) {
    var lines = String(csv).replace(/\r/g, "").split("\n").filter(function (l) { return l.trim(); });
    var names = [];
    for (var i = 1; i < lines.length; i++) { // line 0 is the header
      var f = parseCsvLine(lines[i]);
      names[parseInt(f[0], 10)] = f.slice(2).join(",").trim();
    }
    return names;
  }
  function verifyClassMap(names) {
    var problems = [];
    if (!names || names.length !== NUM_CLASSES) problems.push("class map has " + (names ? names.length : 0) + " entries, expected " + NUM_CLASSES);
    else {
      CATEGORIES.forEach(function (c) {
        c.classes.forEach(function (k) {
          if (names[k[0]] !== k[1]) problems.push("class " + k[0] + " is '" + names[k[0]] + "', expected '" + k[1] + "'");
        });
      });
    }
    return { ok: problems.length === 0, problems: problems };
  }

  /* ----- scores to categories ------------------------------------------------- */
  // scores: array-like of 521 numbers. Returns { id: { score, className } } using the
  // strongest class in each category.
  function categoryScores(scores) {
    var out = {};
    CATEGORIES.forEach(function (c) {
      var best = 0, name = "";
      c.classes.forEach(function (k) {
        var v = +scores[k[0]] || 0;
        if (v > best) { best = v; name = k[1]; }
      });
      out[c.id] = { score: Math.min(best, 1), className: name };
    });
    return out;
  }

  /* ----- resampling ----------------------------------------------------------- */
  // Streaming resampler to 16 kHz. Down-sampling averages the input over each output
  // interval (area weighted), which also acts as a mild low-pass filter. Up-sampling
  // (very rare, mics below 16 kHz) uses linear interpolation.
  function Resampler(fromRate, toRate) {
    this.from = fromRate; this.to = toRate || RATE;
    this.ratio = this.from / this.to;
    this.buf = new Float32Array(0); this.pos = 0;
  }
  Resampler.prototype.process = function (input) {
    if (this.from === this.to) return new Float32Array(input);
    var merged = new Float32Array(this.buf.length + input.length);
    merged.set(this.buf); merged.set(input, this.buf.length);
    var buf = merged, r = this.ratio, pos = this.pos, out = [];
    if (r >= 1) {
      while (pos + r <= buf.length + 1e-9) {
        var start = pos, end = pos + r, sum = 0;
        for (var i = Math.floor(start); i < Math.ceil(end) && i < buf.length; i++) {
          var w = Math.min(end, i + 1) - Math.max(start, i);
          if (w > 0) sum += buf[i] * w;
        }
        out.push(sum / r);
        pos += r;
      }
    } else {
      while (pos + 1 < buf.length) {
        var i0 = Math.floor(pos), fr = pos - i0;
        out.push(buf[i0] * (1 - fr) + buf[i0 + 1] * fr);
        pos += r;
      }
    }
    var drop = Math.floor(pos);
    this.buf = buf.slice(drop); this.pos = pos - drop;
    return Float32Array.from(out);
  };

  /* ----- windowing ------------------------------------------------------------ */
  function Windower(size, hop) {
    this.size = size || WINDOW; this.hop = hop || HOP; this.buf = new Float32Array(0);
  }
  Windower.prototype.push = function (samples) {
    var merged = new Float32Array(this.buf.length + samples.length);
    merged.set(this.buf); merged.set(samples, this.buf.length);
    var wins = [], off = 0;
    while (merged.length - off >= this.size) {
      wins.push(merged.slice(off, off + this.size));
      off += this.hop;
    }
    this.buf = merged.slice(off);
    return wins;
  };
  Windower.prototype.reset = function () { this.buf = new Float32Array(0); };

  function rms(a) {
    if (!a || !a.length) return 0;
    var s = 0; for (var i = 0; i < a.length; i++) s += a[i] * a[i];
    return Math.sqrt(s / a.length);
  }

  /* ----- alert decisions ------------------------------------------------------ */
  /*
   * push(scores, t, loudness) takes one window's 521 YAMNet scores, a timestamp in ms, and
   * optionally that window's RMS loudness (see rms() below; omit it to skip the loud-sound
   * fallback entirely), and returns { alerts: [...], updates: [...], ended: [...], suppressed: n }
   * alert     : a sound type has just started (this is the only thing that triggers
   *             a visible alert, vibration, flash or speech)
   * update    : a sound type that already alerted is still sounding (UI status only)
   * ended     : it has been quiet for releaseMs
   * suppressed: onset heard again inside the cooldown, so no second alert
   * An alert's `className` is empty and `classificationFree` is true for the loud-sound
   * fallback, which is how the UI tells "YAMNet identified this" from "this was just loud".
   */
  function Detector(opts) {
    opts = opts || {};
    this.cfg = {
      on: (opts.on || DEFAULTS.on).slice(),
      sensitivity: SENSITIVITY[opts.sensitivity] ? opts.sensitivity : DEFAULTS.sensitivity,
      cooldownMs: opts.cooldownMs != null ? opts.cooldownMs : DEFAULTS.cooldownMs,
      releaseMs: opts.releaseMs != null ? opts.releaseMs : DEFAULTS.releaseMs
    };
    this.state = {};
  }
  Detector.prototype.configure = function (o) {
    if (o.on) this.cfg.on = o.on.slice();
    if (o.sensitivity && SENSITIVITY[o.sensitivity]) this.cfg.sensitivity = o.sensitivity;
    if (o.cooldownMs != null) this.cfg.cooldownMs = o.cooldownMs;
    if (o.releaseMs != null) this.cfg.releaseMs = o.releaseMs;
  };
  Detector.prototype.reset = function () { this.state = {}; };
  Detector.prototype.active = function () {
    var s = this.state;
    return Object.keys(s).filter(function (k) { return s[k].active; });
  };
  Detector.prototype.push = function (scores, t, loudness) {
    var cfg = this.cfg, thr = SENSITIVITY[cfg.sensitivity].threshold, hold = thr * 0.7;
    var cs = categoryScores(scores), res = { alerts: [], updates: [], ended: [], suppressed: 0 };
    var anyClassifiedActiveOrNow = false;
    for (var i = 0; i < CATEGORIES.length; i++) {
      var c = CATEGORIES[i];
      var st = this.state[c.id] || (this.state[c.id] = { active: false, lastAbove: 0, lastAlert: -Infinity, start: 0, peak: 0 });
      if (cfg.on.indexOf(c.id) < 0) { // turned off: forget any running sound without alerting
        if (st.active) { st.active = false; }
        continue;
      }
      var cur = cs[c.id];
      if (cur.score >= hold || st.active) anyClassifiedActiveOrNow = true; // used below to hold off the "loud" fallback
      if (!st.active) {
        if (cur.score >= thr) {
          if (t - st.lastAlert >= cfg.cooldownMs) {
            st.active = true; st.start = t; st.lastAbove = t; st.lastAlert = t; st.peak = cur.score;
            res.alerts.push({ category: c.id, score: cur.score, className: cur.className, t: t });
          } else res.suppressed++;
        }
      } else if (cur.score >= hold) {
        st.lastAbove = t; if (cur.score > st.peak) st.peak = cur.score;
        res.updates.push({ category: c.id, score: cur.score, peak: st.peak, durationMs: t - st.start });
      } else if (t - st.lastAbove >= cfg.releaseMs) {
        st.active = false;
        res.ended.push({ category: c.id, peak: st.peak, durationMs: st.lastAbove - st.start });
      }
    }
    // Loud-sound fallback: only when enabled, loudness was actually given, and no classified
    // category is sounding right now — a sound YAMNet already named is never also reported as
    // merely "loud", so the two can never fire for the same noise.
    if (cfg.on.indexOf(LOUD_CATEGORY.id) >= 0 && loudness != null) {
      var lst = this.state[LOUD_CATEGORY.id] || (this.state[LOUD_CATEGORY.id] = { active: false, lastAbove: 0, lastAlert: -Infinity, start: 0, peak: 0 });
      var lthr = SENSITIVITY[cfg.sensitivity].loudRms, lhold = lthr * 0.6;
      if (anyClassifiedActiveOrNow) { if (lst.active) lst.active = false; }
      else if (!lst.active) {
        if (loudness >= lthr) {
          if (t - lst.lastAlert >= cfg.cooldownMs) {
            lst.active = true; lst.start = t; lst.lastAbove = t; lst.lastAlert = t; lst.peak = loudness;
            res.alerts.push({ category: LOUD_CATEGORY.id, score: loudness, className: "", classificationFree: true, t: t });
          } else res.suppressed++;
        }
      } else if (loudness >= lhold) {
        lst.lastAbove = t; if (loudness > lst.peak) lst.peak = loudness;
        res.updates.push({ category: LOUD_CATEGORY.id, score: loudness, peak: lst.peak, durationMs: t - lst.start, classificationFree: true });
      } else if (t - lst.lastAbove >= cfg.releaseMs) {
        lst.active = false;
        res.ended.push({ category: LOUD_CATEGORY.id, peak: lst.peak, durationMs: lst.lastAbove - lst.start, classificationFree: true });
      }
    }
    return res;
  };

  return {
    RATE: RATE, WINDOW: WINDOW, HOP: HOP, NUM_CLASSES: NUM_CLASSES,
    CATEGORIES: CATEGORIES, LOUD_CATEGORY: LOUD_CATEGORY, SENSITIVITY: SENSITIVITY, DEFAULTS: DEFAULTS,
    category: category, parseClassMap: parseClassMap, verifyClassMap: verifyClassMap,
    categoryScores: categoryScores, Resampler: Resampler, Windower: Windower, rms: rms, Detector: Detector
  };
});
