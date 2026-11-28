/*
 * Unit tests for assets/sound-engine.js. Pure logic: class-map checking, resampling, windowing and
 * alert decisions. SYNTHETIC scores and tones only. They do NOT prove that real alarms, doorbells or horns are
 * recognised by the model; see test-sound-browser.js for the real YAMNet on synthetic tones, and TEST_REPORT.md
 * ("Real model / real sounds") for what is still untested.
 */
"use strict";
const fs = require("fs");
const E = require("./assets/sound-engine.js");
let pass = 0, fail = 0;
function check(name, ok, extra) { console.log((ok ? "PASS" : "FAIL") + " — " + name + (extra ? "  (" + extra + ")" : "")); ok ? pass++ : fail++; }

// ---- class map ----
const csv = fs.readFileSync(__dirname + "/vendor/yamnet/yamnet_class_map.csv", "utf8");
const names = E.parseClassMap(csv);
check("class map parses to 521 classes", names.length === 521, "got " + names.length);
check("class map: quoted names containing commas survive", names[0] === "Speech" && names[393] === "Smoke detector, smoke alarm");
const v = E.verifyClassMap(names);
check("class map: every category class index has the expected name", v.ok, v.problems.join("; "));
const bad = names.slice(); bad[393] = "Wrong"; const t = bad[394]; bad[394] = bad[393]; bad[393] = t;
check("class map: a shuffled label file is refused", !E.verifyClassMap(bad).ok);
check("class map: wrong length is refused", !E.verifyClassMap(names.slice(0, 500)).ok);

// ---- categories ----
const ids = E.CATEGORIES.map((c) => c.id);
check("categories include fire, alarm, siren, doorbell, horn", ["fire", "alarm", "siren", "doorbell", "horn"].every((i) => ids.indexOf(i) >= 0));
check("every category has a distinct vibration pattern", new Set(E.CATEGORIES.map((c) => c.vib.join(","))).size === E.CATEGORIES.length);
check("optional categories (knock, baby, glass) are off by default", ["knock", "baby", "glass"].every((i) => E.DEFAULTS.on.indexOf(i) < 0));
check("spoken alert is off by default", E.DEFAULTS.speak === false);

function scores(map) { const s = new Float32Array(521); Object.keys(map).forEach((k) => { s[+k] = map[k]; }); return s; }
const cs = E.categoryScores(scores({ 393: 0.8, 394: 0.2, 349: 0.1 }));
check("categoryScores takes the strongest class", cs.fire.score === Math.fround(0.8) && cs.fire.className === "Smoke detector, smoke alarm");
check("categoryScores: unrelated classes score 0", cs.horn.score === 0 && cs.horn.className === "");

// ---- resampler ----
function tone(f, rate, secs, amp) { const n = Math.round(rate * secs), a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = (amp || 0.5) * Math.sin(2 * Math.PI * f * i / rate); return a; }
function goertzel(x, f, rate) { // energy at frequency f
  const w = 2 * Math.PI * f / rate, c = 2 * Math.cos(w); let s1 = 0, s2 = 0;
  for (let i = 0; i < x.length; i++) { const s0 = x[i] + c * s1 - s2; s2 = s1; s1 = s0; }
  return Math.sqrt(s1 * s1 + s2 * s2 - c * s1 * s2) * 2 / x.length;
}
[[48000, "48 kHz"], [44100, "44.1 kHz"], [32000, "32 kHz"], [16000, "16 kHz"]].forEach(([rate, label]) => {
  const r = new E.Resampler(rate, 16000), x = tone(1000, rate, 1.0, 0.5), y = r.process(x);
  const expect = 16000;
  check("resampler " + label + " -> 16 kHz: output length ≈ 1 s", Math.abs(y.length - expect) <= 2, "got " + y.length);
  const amp = goertzel(y.slice(200), 1000, 16000);
  check("resampler " + label + ": 1 kHz tone keeps its frequency and amplitude", Math.abs(amp - 0.5) < 0.04, "amp " + amp.toFixed(3));
});
{ // streaming in odd-sized chunks must equal one-shot processing
  const x = tone(2500, 44100, 0.5, 0.4), one = new E.Resampler(44100, 16000).process(x), r = new E.Resampler(44100, 16000), parts = [];
  for (let i = 0; i < x.length; i += 441) parts.push(r.process(x.slice(i, i + 441)));
  const flat = Float32Array.from(parts.reduce((a, p) => a.concat(Array.from(p)), []));
  let maxd = 0; for (let i = 0; i < Math.min(flat.length, one.length); i++) maxd = Math.max(maxd, Math.abs(flat[i] - one[i]));
  check("resampler: chunked streaming equals one-shot", Math.abs(flat.length - one.length) <= 1 && maxd < 1e-4, "max diff " + maxd.toExponential(1));
}
{ // anti-aliasing: a 20 kHz tone at 48 kHz must not fold to a loud 4 kHz alias
  const y = new E.Resampler(48000, 16000).process(tone(20000, 48000, 0.5, 0.5));
  check("resampler: tone above 8 kHz folds in at under a quarter of its level (simple box filter, modest anti-aliasing)", goertzel(y.slice(100), 4000, 16000) < 0.25, "alias amp " + goertzel(y.slice(100), 4000, 16000).toFixed(3));
}
{ const y = new E.Resampler(8000, 16000).process(tone(500, 8000, 0.5, 0.5)); check("resampler: 8 kHz microphone is up-sampled", Math.abs(y.length - 8000) <= 3, "got " + y.length); }

// ---- windower ----
{
  const w = new E.Windower(), a = w.push(new Float32Array(15599)); const b = w.push(new Float32Array(1));
  check("windower: no window before 15600 samples, one at 15600", a.length === 0 && b.length === 1 && b[0].length === 15600);
  const c = w.push(new Float32Array(7800));
  check("windower: next window after a half-window hop (50% overlap)", c.length === 1);
  const w2 = new E.Windower(); const many = w2.push(new Float32Array(15600 + 7800 * 3));
  check("windower: overlapping windows are produced in order", many.length === 4, "got " + many.length);
  const w3 = new E.Windower(); const ramp = new Float32Array(15600 + 7800).map((_, i) => i); const ws = w3.push(ramp);
  check("windower: second window starts one hop after the first", ws.length === 2 && ws[1][0] === 7800 && ws[0][0] === 0);
}
check("rms of silence is 0, of a 0.5 sine ≈ 0.354", E.rms(new Float32Array(100)) === 0 && Math.abs(E.rms(tone(440, 16000, 0.5, 0.5)) - 0.3536) < 0.01);

// ---- detector ----
const FIRE = scores({ 393: 0.8 }), QUIET = scores({}), DOOR = scores({ 349: 0.6 }), WEAK = scores({ 393: 0.3 });
function run(det, seq, hop) { const ev = []; seq.forEach((s, i) => { const r = det.push(s, i * (hop || 487)); r.t = i * (hop || 487); ev.push(r); }); return ev; }
{
  const d = new E.Detector(), ev = run(d, [QUIET, QUIET, FIRE, FIRE, FIRE, FIRE, QUIET]);
  const alerts = ev.reduce((n, r) => n + r.alerts.length, 0);
  check("detector: alerts once at onset of a loud smoke alarm", alerts === 1 && ev[2].alerts[0].category === "fire", "alerts " + alerts);
  check("detector: alert carries score and class name", ev[2].alerts[0].score > 0.79 && ev[2].alerts[0].className === "Smoke detector, smoke alarm");
  check("detector: continuing sound produces updates, not new alerts", ev[3].updates.length === 1 && ev[4].alerts.length === 0 && ev[5].alerts.length === 0);
  check("detector: nothing happens while quiet", ev[0].alerts.length + ev[1].alerts.length + ev[0].updates.length === 0);
}
{ // a long continuous alarm (30 s) must alert exactly once
  const d = new E.Detector(), seq = []; for (let i = 0; i < 62; i++) seq.push(FIRE);
  const ev = run(d, seq); check("detector: 30 s continuous alarm → exactly one alert", ev.reduce((n, r) => n + r.alerts.length, 0) === 1);
}
{ // ends after releaseMs of quiet, and the end event reports the duration
  const d = new E.Detector({ releaseMs: 2000 }), seq = [FIRE, FIRE, FIRE, QUIET, QUIET, QUIET, QUIET, QUIET];
  const ev = run(d, seq), ended = ev.filter((r) => r.ended.length);
  check("detector: a sound that stops is reported ended after the release time", ended.length === 1 && ended[0].ended[0].category === "fire" && ended[0].ended[0].durationMs > 0);
  check("detector: not ended too early", ev[3].ended.length === 0 && ev[4].ended.length === 0);
}
{ // a pause inside a sound (alarm beeps with gaps) must not re-alert
  const d = new E.Detector({ releaseMs: 2000 }), ev = run(d, [FIRE, QUIET, QUIET, FIRE, QUIET, FIRE, FIRE]);
  check("detector: gaps shorter than the release time do not re-alert (pulsed alarms)", ev.reduce((n, r) => n + r.alerts.length, 0) === 1);
}
{ // new sound after the first ended AND cooldown elapsed alerts again
  const d = new E.Detector({ releaseMs: 1000, cooldownMs: 4000 });
  const r1 = d.push(FIRE, 0); for (let t = 500; t <= 4000; t += 500) d.push(QUIET, t);
  const r2 = d.push(FIRE, 6000);
  check("detector: a later, separate alarm alerts again", r1.alerts.length === 1 && r2.alerts.length === 1);
}
{ // cooldown suppresses a quick second onset
  const d = new E.Detector({ releaseMs: 500, cooldownMs: 4000 });
  d.push(FIRE, 0); d.push(QUIET, 600); d.push(QUIET, 1200);
  const r = d.push(FIRE, 1800);
  check("detector: a second onset inside the cooldown is suppressed and counted", r.alerts.length === 0 && r.suppressed === 1);
}
{ // different categories alert independently
  const d = new E.Detector(), both = scores({ 393: 0.8, 349: 0.6 }), r = d.push(both, 0);
  check("detector: simultaneous fire alarm and doorbell both alert", r.alerts.map((a) => a.category).sort().join() === "doorbell,fire");
}
{ // disabled category never alerts
  const d = new E.Detector({ on: ["doorbell"] }), r = d.push(FIRE, 0);
  check("detector: a category that is switched off is ignored", r.alerts.length === 0);
  const r2 = d.push(DOOR, 500); check("detector: enabled category still alerts", r2.alerts.length === 1 && r2.alerts[0].category === "doorbell");
}
{ // sensitivity
  const low = new E.Detector({ sensitivity: "low" }), med = new E.Detector({ sensitivity: "medium" }), high = new E.Detector({ sensitivity: "high" });
  const s = scores({ 393: 0.3 });
  check("detector: score 0.30 → ignored at low and medium, alerts at high", low.push(s, 0).alerts.length === 0 && med.push(s, 0).alerts.length === 0 && high.push(s, 0).alerts.length === 1);
  check("detector: a very weak score (0.1) never alerts at any sensitivity", ["low", "medium", "high"].every((k) => new E.Detector({ sensitivity: k }).push(scores({ 393: 0.1 }), 0).alerts.length === 0));
  const d = new E.Detector({ sensitivity: "medium" }); d.configure({ sensitivity: "low" });
  check("detector: configure() changes sensitivity live", d.push(scores({ 393: 0.4 }), 0).alerts.length === 0);
}
{ // hysteresis: score dips just under the alert threshold but above hold stays one event
  const d = new E.Detector(), dip = scores({ 393: 0.3 }), ev = run(d, [FIRE, dip, dip, dip, dip, dip]);
  check("detector: scores between hold and alert level keep the event alive without re-alerting", ev.reduce((n, r) => n + r.alerts.length, 0) === 1 && ev[5].updates.length === 1);
}
{ // turning a category off mid-sound, then on, doesn't produce a phantom alert from stale state
  const d = new E.Detector(); d.push(FIRE, 0); d.configure({ on: ["doorbell"] }); d.push(FIRE, 500);
  check("detector: switching a running category off clears its active state", d.active().indexOf("fire") < 0);
}
{ const d = new E.Detector(); d.push(FIRE, 0); d.reset(); check("detector: reset() forgets everything", d.active().length === 0 && d.push(FIRE, 10).alerts.length === 1); }

// ---- loud-sound fallback (Person 4 merge: loudness-only, off by default, never confused with real classification) ----
check("LOUD_CATEGORY is off by default", E.DEFAULTS.on.indexOf(E.LOUD_CATEGORY.id) < 0);
check("LOUD_CATEGORY is marked classificationFree and category() resolves it", E.category("loud") === E.LOUD_CATEGORY && E.LOUD_CATEGORY.classificationFree === true);
check("every sensitivity level defines a loudRms threshold", ["low", "medium", "high"].every((k) => typeof E.SENSITIVITY[k].loudRms === "number" && E.SENSITIVITY[k].loudRms > 0));
{ // loud fallback must be explicitly turned on (QUIET scores, no classified category ever active)
  const d = new E.Detector({ on: ["fire"] }); // "loud" not included
  const r = d.push(QUIET, 0, 0.5);
  check("loud fallback does nothing when not in cfg.on, even with a loud window", r.alerts.length === 0);
}
{ // basic onset/hold/release lifecycle, mirroring the classified-category tests above
  const d = new E.Detector({ on: ["fire", "loud"] });
  const r0 = d.push(QUIET, 0, 0.01); // quiet: below threshold
  const r1 = d.push(QUIET, 487, 0.5); // sudden loud, unclassified
  check("loud fallback: alerts once at onset of an unclassified loud window", r0.alerts.length === 0 && r1.alerts.length === 1 && r1.alerts[0].category === "loud");
  check("loud alert carries classificationFree:true and an empty className", r1.alerts[0].classificationFree === true && r1.alerts[0].className === "");
  const r2 = d.push(QUIET, 974, 0.45); // still loud enough to hold
  check("loud fallback: continuing loud produces an update, not a new alert", r2.updates.length === 1 && r2.alerts.length === 0);
  let ended = false;
  for (let t = 1461; t <= 1461 + 4000; t += 487) { const r = d.push(QUIET, t, 0.0); if (r.ended.length) { ended = true; check("ended loud event is marked classificationFree too", r.ended[0].classificationFree === true); break; } }
  check("loud fallback: ends after the release time once it goes quiet", ended);
}
{ // the central safety property: a classified category firing must suppress/cancel the loud fallback for the same noise
  const d = new E.Detector({ on: ["fire", "loud"] });
  const together = scores({ 393: 0.8 }); // loud AND classified as fire in the same window
  const r = d.push(together, 0, 0.6);
  check("loud fallback never fires in the same window as a classified alert", r.alerts.length === 1 && r.alerts[0].category === "fire");
  const r2 = d.push(together, 487, 0.6);
  check("loud fallback stays suppressed while the classified category is still active", r2.updates.every((u) => u.category !== "loud") && r2.alerts.length === 0);
}
{ // a category classified as active cancels an already-running loud-only event (no double counting)
  const d = new E.Detector({ on: ["fire", "loud"] });
  d.push(QUIET, 0, 0.5); // loud, unclassified -> loud fallback starts
  const mid = d.push(scores({ 393: 0.8 }), 487, 0.6); // now YAMNet recognises it as fire mid-event
  check("a mid-event classification takes over from the loud fallback instead of double-alerting", mid.alerts.length === 1 && mid.alerts[0].category === "fire");
  check("the loud-only state is cancelled, not left 'active' forever", d.active().indexOf("loud") < 0);
}
{ // loudRms thresholds differ by sensitivity, same pattern as classified-category thresholds
  const quietLoud = 0.04; // between high's and medium's loudRms (0.03 vs 0.05) per SENSITIVITY table above
  const low = new E.Detector({ on: ["loud"], sensitivity: "low" });
  const med = new E.Detector({ on: ["loud"], sensitivity: "medium" });
  const high = new E.Detector({ on: ["loud"], sensitivity: "high" });
  check("loud fallback: a middling loudness alerts at high sensitivity but not medium or low",
    low.push(QUIET, 0, quietLoud).alerts.length === 0 && med.push(QUIET, 0, quietLoud).alerts.length === 0 && high.push(QUIET, 0, quietLoud).alerts.length === 1);
}
{ // cooldown applies to the loud fallback exactly as it does to classified categories
  const d = new E.Detector({ on: ["loud"], releaseMs: 500, cooldownMs: 4000 });
  d.push(QUIET, 0, 0.5); d.push(QUIET, 600, 0.0); d.push(QUIET, 1200, 0.0);
  const r = d.push(QUIET, 1800, 0.5);
  check("loud fallback: a second onset inside the cooldown is suppressed and counted", r.alerts.length === 0 && r.suppressed === 1);
}
{ // omitting the loudness argument entirely must never throw or produce a phantom alert (back-compat: push(scores, t) with no 3rd arg)
  const d = new E.Detector({ on: ["fire", "loud"] });
  let threw = false; let r; try { r = d.push(QUIET, 0); } catch (e) { threw = true; }
  check("push() with no loudness argument does not throw and produces no loud alert", !threw && r.alerts.length === 0);
}
{ const d = new E.Detector({ on: ["loud"] }); d.push(QUIET, 0, 0.5); d.reset(); check("reset() also forgets loud-fallback state", d.active().indexOf("loud") < 0 && d.push(QUIET, 10, 0.5).alerts.length === 1); }

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
