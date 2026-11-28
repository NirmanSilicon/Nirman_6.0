/*
 * Browser tests for Sound alerts, in real Chromium with the REAL vendored YAMNet model and MediaPipe audio runtime.
 *
 * What is real here:   the model, the wasm runtime, resampling, windowing, the alert logic, the UI, the camera-free
 *                      microphone path (Chromium's fake audio device) and getUserMedia track handling.
 * What is NOT real:    no room, speaker or human is involved. "Audio" is either Chromium's fake microphone tone or
 *                      SYNTHETIC signals (pulsed 3.1 kHz beeps, noise, silence) injected after the microphone stage.
 *                      Real recordings of alarms, doorbells and horns were not available, so recognition of those
 *                      real sounds is NOT tested here. Vibration and speech are recording stand-ins.
 *
 *   node test-sound-browser.js
 */
"use strict";
process.env.PORT = process.env.SOUND_BROWSER_PORT || "8101";
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { server } = require("./server/server.js");

const BASE = "http://localhost:" + process.env.PORT + "/#/dashboard/sounds";
let pass = 0, fail = 0;
function check(name, ok, extra) { console.log((ok ? "PASS" : "FAIL") + " — " + name + (extra ? "  (" + extra + ")" : "")); ok ? pass++ : fail++; }
async function section(name, fn) { console.log("\n## " + name); try { await fn(); } catch (e) { check(name + " ran without exception", false, String(e && e.message || e).split("\n")[0]); } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const STUBS = `(() => {
  window.__spoken = []; window.__vib = []; window.__gum = []; window.__streams = [];
  const synth = { speaking:false, paused:false, cancel(){}, resume(){}, getVoices(){ return [{ voiceURI:"fake-en", name:"Fake English", lang:"en-US" }]; }, onvoiceschanged:null, addEventListener(){}, removeEventListener(){},
    speak(u){ window.__spoken.push(u.text); } };
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  navigator.vibrate = (p) => { window.__vib.push(p); return true; };
  window.__frames = [];
  const O = window.WebSocket;
  window.WebSocket = function (u, p) { const w = p ? new O(u, p) : new O(u); const s = w.send.bind(w); w.send = function (d) { window.__frames.push(String(d).length); return s(d); }; return w; };
  window.WebSocket.prototype = O.prototype; window.WebSocket.OPEN = O.OPEN; window.WebSocket.CONNECTING = O.CONNECTING; window.WebSocket.CLOSED = O.CLOSED; window.WebSocket.CLOSING = O.CLOSING;
  const gum = navigator.mediaDevices && navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  if (gum) navigator.mediaDevices.getUserMedia = function (c) {
    window.__gum.push(JSON.stringify(c));
    if (window.__gumFail) return Promise.reject(Object.assign(new Error("stub"), { name: window.__gumFail }));
    return gum(c).then((s) => { window.__streams.push(s); return s; });
  };
})();`;

async function newPage(browser, opts) {
  const ctx = await browser.newContext(Object.assign({ permissions: ["microphone"], bypassCSP: false }, opts || {}));
  await ctx.addInitScript(STUBS);
  const page = await ctx.newPage();
  const requests = []; page.on("request", (r) => requests.push({ url: r.url(), method: r.method(), post: r.postDataBuffer() ? r.postDataBuffer().length : 0 }));
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  page.__requests = requests; page.__errors = errors; page.__ctx = ctx;
  return page;
}
const history = (page) => page.evaluate(() => window.SangamSound.history().map((h) => ({ n: h.n, score: h.score, test: h.test, id: h.id })));

/* Feed synthetic audio through the real pipeline in audio time (the test clock is audio time, so a 12 s alarm costs ~1 s). */
function feed(page, kind, rate, secs, opts) {
  return page.evaluate(async ([kind, rate, secs, opts]) => {
    const T = window.SangamSound._test; let clk = 0; T.setClock(() => clk);
    let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296) - 0.5;
    const gens = {
      silence: () => 0,
      noise: () => rnd() * 0.2,
      sine1k: (t) => 0.5 * Math.sin(2 * Math.PI * 1000 * t),
      beep: (t) => ((t % 0.5) < 0.25 ? (opts && opts.amp || 0.5) : 0) * Math.sin(2 * Math.PI * 3100 * t),
      voicelike: (t) => 0.3 * Math.sin(2 * Math.PI * 150 * t) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 4 * t))
    };
    const chunk = Math.round(rate * 0.25), g = gens[kind], start = (opts && opts.offsetMs || 0) / 1000;
    clk = (opts && opts.offsetMs) || 0;
    for (let i = 0; i < secs * 4; i++) {
      const a = new Float32Array(chunk); for (let k = 0; k < chunk; k++) a[k] = g(start + (i * chunk + k) / rate);
      T.feedAudio(a, rate); await T.idle(); clk += 250;
    }
    return clk;
  }, [kind, rate, secs, opts || null]);
}

(async () => {
  const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });

  await section("Panel, honesty, and nothing happens before Start", async () => {
    const p = await newPage(browser);
    await p.goto(BASE); await p.waitForSelector('section[data-p="sounds"]:not([hidden])');
    const txt = await p.textContent('section[data-p="sounds"]');
    check("Sound alerts is a dashboard feature with a tile", await p.evaluate(() => !!document.querySelector('a[href="#/dashboard/sounds"]')));
    check("panel says it is not a safety device", /not a safety device/i.test(txt));
    check("panel says audio is never recorded, stored or uploaded", /never recorded, stored or uploaded/i.test(txt));
    check("panel explains scores are not probabilities", /not probabilities/i.test(txt));
    check("model shown as NOT loaded before Start", /not loaded yet/i.test(await p.textContent("#sndModel")) && (await p.evaluate(() => window.SangamSound.modelState())) === "idle");
    check("microphone was NOT requested on page load", (await p.evaluate(() => window.__gum.length)) === 0);
    check("microphone indicator bar hidden before Start", await p.isHidden("#soundBar"));
    check("test-beep button disabled until listening", await p.isDisabled("#sndBeep"));
    check("default sound types: fire, alarm, siren, doorbell, horn checked; knock/baby/glass not",
      JSON.stringify(await p.$$eval("#sndTypes input", (n) => n.filter((i) => i.checked).map((i) => i.dataset.snd))) === JSON.stringify(["fire", "alarm", "siren", "doorbell", "horn"]));
    check("spoken alert is off by default; flash and vibration on", await p.$eval('[data-sndmode="speak"]', (i) => !i.checked) && await p.$eval('[data-sndmode="flash"]', (i) => i.checked));
    check("sensitivity defaults to medium", await p.$eval('#sndSens input:checked', (i) => i.value) === "medium");
    check("no page errors", p.__errors.length === 0, p.__errors.join("; "));
    await p.__ctx.close();
  });

  await section("Real model: loads locally, no external requests", async () => {
    const p = await newPage(browser);
    await p.goto(BASE); await p.waitForSelector("#sndStart");
    await p.evaluate(() => window.SangamSound._test.loadModel());
    check("model state is ready after load", (await p.evaluate(() => window.SangamSound.modelState())) === "ready");
    check("model line says detection is available", /loaded on this device/i.test(await p.textContent("#sndModel")));
    const ext = p.__requests.filter((r) => !/^http:\/\/localhost:/.test(r.url) && !/^(data|blob):/.test(r.url));
    check("zero requests left this machine while loading the model", ext.length === 0, ext.map((r) => r.url).join(", "));
    check("model, labels and runtime came from this site's vendor folder", ["yamnet.tflite", "yamnet_class_map.csv", "audio_bundle.mjs", "audio_wasm_internal.wasm"].every((f) => p.__requests.some((r) => r.url.includes(f))));
    await p.__ctx.close();
  });

  await section("Real model + synthetic audio through the full pipeline", async () => {
    const p = await newPage(browser);
    await p.goto(BASE); await p.waitForSelector("#sndStart");
    await p.evaluate(() => window.SangamSound._test.loadModel());
    // Negative controls first.
    for (const [kind, label] of [["silence", "silence"], ["noise", "white noise"], ["sine1k", "a steady 1 kHz tone"], ["voicelike", "a speech-like hum"]]) {
      await p.evaluate(() => window.SangamSound._test.reset());
      await feed(p, kind, 48000, 4);
      const h = await history(p);
      check("no alert for " + label, h.length === 0, h.map((x) => x.n).join(","));
    }
    // Positive: smoke-alarm style beep at several microphone sample rates.
    for (const rate of [48000, 44100, 16000]) {
      await p.evaluate(() => window.SangamSound._test.reset());
      await feed(p, "beep", rate, 6);
      const h = await history(p), fire = h.filter((x) => x.id === "fire");
      check("pulsed 3.1 kHz beep at " + rate + " Hz → smoke or fire alarm alert, once", fire.length === 1, JSON.stringify(h.map((x) => x.n + " " + Math.round(x.score * 100) + "%")));
      check("  the alert reports a confidence of at least 35%", fire.length === 1 && fire[0].score >= 0.35, fire[0] && Math.round(fire[0].score * 100) + "%");
    }
    await p.evaluate(() => window.SangamSound._test.reset());
    await feed(p, "beep", 48000, 6, { amp: 0.05 });
    check("a quiet beep (amplitude 0.05) is still detected", (await history(p)).some((x) => x.id === "fire"));
    // Continuous sound: one alert, not a stream.
    await p.evaluate(() => window.SangamSound._test.reset());
    await feed(p, "beep", 48000, 30);
    const h30 = await history(p);
    check("30 s of continuous beeping → one smoke-alarm alert, no repeats", h30.filter((x) => x.id === "fire").length === 1, "entries: " + h30.length);
    check("the alert stays on screen while the sound continues", await p.isVisible("#soundAlert") && /Still sounding/.test(await p.textContent("#soundAlert")));
    check("only ONE banner item exists for the smoke alarm", (await p.$$eval('#soundAlert .snd-item[data-id="fire"]', (n) => n.length)) === 1);
    // After it stops and time passes, the status becomes Stopped and a later alarm alerts again.
    await feed(p, "silence", 48000, 5, { offsetMs: 31000 });
    check("when the sound stops the banner says Stopped", /Stopped/.test(await p.textContent('#soundAlert .snd-item[data-id="fire"]')));
    await feed(p, "beep", 48000, 6, { offsetMs: 40000 });
    check("a later, separate alarm alerts again", (await history(p)).filter((x) => x.id === "fire").length === 2);
    await p.__ctx.close();
  });

  await section("How an alert is presented", async () => {
    const p = await newPage(browser);
    await p.goto(BASE); await p.waitForSelector("#sndStart");
    await p.evaluate(() => window.SangamSound._test.loadModel());
    await p.check('[data-sndmode="speak"]');
    await p.evaluate(() => { window.__flashed = 0; new MutationObserver(() => { const c = document.getElementById("soundFlash").classList; if (c.contains("on") || c.contains("calm")) window.__flashed++; }).observe(document.getElementById("soundFlash"), { attributes: true }); });
    await feed(p, "beep", 48000, 4);
    check("visible alert names the sound and the confidence", /Smoke or fire alarm detected/.test(await p.textContent("#soundAlert")) && /Confidence \d+%/.test(await p.textContent("#soundAlert")));
    check("alert item is announced as role=alert", (await p.$$eval('#soundAlert .snd-item[role="alert"]', (n) => n.length)) >= 1);
    check("alert text is visible on screen (not just in a live region)", await p.isVisible('#soundAlert .snd-item[data-id="fire"]'));
    const vib = await p.evaluate(() => window.__vib);
    check("vibration pattern for fire was triggered", vib.some((v) => Array.isArray(v) && v.join() === "500,150,500,150,500,150,500"), JSON.stringify(vib));
    check("screen flash was triggered", (await p.evaluate(() => window.__flashed)) >= 1);
    check("spoken alert was spoken because the person turned it on", (await p.evaluate(() => window.__spoken)).some((t) => /Smoke or fire alarm detected/.test(t)));
    check("history shows a real (non-simulated) entry with confidence", /Smoke or fire alarm.*confidence \d+%/.test(await p.textContent("#sndLog")));
    await p.click('#soundAlert .snd-item[data-id="fire"] button[data-dismiss]');
    check("Dismiss removes the alert", !(await p.$('#soundAlert .snd-item[data-id="fire"]')));
    await p.click("#sndClear");
    check("Clear history empties the list", /Nothing detected yet/.test(await p.textContent("#sndLog")));
    await p.__ctx.close();

    // Spoken alert stays silent by default, vibration off means no vibration.
    const q = await newPage(browser);
    await q.goto(BASE); await q.waitForSelector("#sndStart");
    await q.evaluate(() => window.SangamSound._test.loadModel());
    await q.uncheck('[data-sndmode="vibrate"]');
    await feed(q, "beep", 48000, 4);
    check("with spoken alert off (default), nothing is spoken", (await q.evaluate(() => window.__spoken)).length === 0);
    check("with vibration off, nothing vibrates", (await q.evaluate(() => window.__vib)).filter((v) => Array.isArray(v) && v.length > 2).length === 0);
    await q.__ctx.close();
  });

  await section("Settings", async () => {
    const p = await newPage(browser);
    await p.goto(BASE); await p.waitForSelector("#sndStart");
    await p.evaluate(() => window.SangamSound._test.loadModel());
    await p.uncheck('[data-snd="fire"]'); await p.uncheck('[data-snd="alarm"]');
    await feed(p, "beep", 48000, 6);
    check("with smoke alarm and other alarm switched off, a beep raises no alert", (await history(p)).length === 0);
    await p.check('[data-snd="fire"]');
    await p.evaluate(() => window.SangamSound._test.reset());
    await feed(p, "beep", 48000, 6);
    check("switching smoke alarm back on takes effect immediately", (await history(p)).some((x) => x.id === "fire"));
    await p.check('#sndSens input[value="low"]');
    await p.evaluate(() => window.SangamSound._test.reset());
    await feed(p, "beep", 44100, 6, {});
    const low = await history(p);
    check("low sensitivity: the weaker 44.1 kHz fire score (≈59%) still passes the 55% bar, doorbell/horn stay quiet", low.every((x) => ["fire", "alarm"].includes(x.id)));
    await p.reload(); await p.waitForSelector("#sndStart");
    check("settings are remembered after reload (sensitivity low, alarm off)", (await p.$eval('#sndSens input:checked', (i) => i.value)) === "low" && !(await p.$eval('[data-snd="alarm"]', (i) => i.checked)));
    const stored = await p.evaluate(() => localStorage.getItem("sangam.sound.v1"));
    check("only settings are stored (no audio, no history)", !!stored && !/audio|samples|score/i.test(stored), stored);
    await p.__ctx.close();
  });

  await section("Preview alerts are labelled as simulated", async () => {
    const p = await newPage(browser);
    await p.goto(BASE); await p.waitForSelector("#sndStart");
    await p.click('[data-preview="doorbell"]');
    const t = await p.textContent("#soundAlert");
    check("preview alert says it is a preview and that nothing was heard", /Preview \(not a real sound\)/.test(t) && /Simulated alert\. Nothing was heard\./.test(t));
    check("preview alert does NOT show a made-up confidence", !/Confidence \d+%/.test(t));
    check("history marks it as simulated", /simulated preview, not a real sound/.test(await p.textContent("#sndLog")));
    check("preview did not start the microphone or load the model", (await p.evaluate(() => window.__gum.length)) === 0 && (await p.evaluate(() => window.SangamSound.modelState())) === "idle");
    await p.waitForTimeout(8400);
    check("preview alert disappears by itself", await p.isHidden("#soundAlert"));
    await p.__ctx.close();
  });

  await section("Microphone lifecycle (Chromium fake microphone)", async () => {
    const p = await newPage(browser);
    await p.goto(BASE); await p.waitForSelector("#sndStart");
    await p.click("#sndStart");
    await p.waitForFunction(() => window.SangamSound.isListening(), null, { timeout: 60000 });
    check("listening starts after the model loads and the microphone is allowed", true);
    check("model loaded BEFORE the microphone was requested", (await p.evaluate(() => window.SangamSound.modelState())) === "ready" && (await p.evaluate(() => window.__gum.length)) === 1);
    const c = JSON.parse(await p.evaluate(() => window.__gum[0]));
    check("microphone requested audio only, no video", c.audio && !c.video);
    check("echo cancellation, noise suppression and auto gain are off (they can erase steady alarm tones)", c.audio.echoCancellation === false && c.audio.noiseSuppression === false && c.audio.autoGainControl === false);
    check("a persistent 'microphone is on' bar is shown", await p.isVisible("#soundBar") && /Microphone is on/.test(await p.textContent("#soundBar")));
    check("button now says Stop listening", /Stop listening/.test(await p.textContent("#sndLabel")));
    await p.waitForFunction(() => window.SangamSound._test.stats().analysed >= 2, null, { timeout: 15000 });
    check("the real microphone audio is being analysed (windows counted)", (await p.evaluate(() => window.SangamSound._test.stats().analysed)) >= 2);
    check("analysis status is shown", /Analysed \d+ windows/.test(await p.textContent("#sndLevelText")));
    // navigation keeps listening (alerts must reach you in other features)
    await p.evaluate(() => { location.hash = "#/dashboard/phrases"; });
    await p.waitForTimeout(300);
    check("leaving the panel keeps listening, and the indicator stays visible", (await p.evaluate(() => window.SangamSound.isListening())) && await p.isVisible("#soundBar"));
    // privacy
    const ext = p.__requests.filter((r) => !/^http:\/\/localhost:/.test(r.url) && !/^(data|blob):/.test(r.url));
    check("no request left this machine while listening", ext.length === 0, ext.map((r) => r.url).join(", "));
    check("no uploads: every request is a GET", p.__requests.every((r) => r.method === "GET" || r.method === "OPTIONS"), p.__requests.filter((r) => r.method !== "GET").map((r) => r.method + " " + r.url).join(", "));
    check("nothing was sent over the websocket", (await p.evaluate(() => window.__frames.length)) === 0);
    // stop
    await p.click("#sndBarStop");
    check("Stop from the global bar stops listening", !(await p.evaluate(() => window.SangamSound.isListening())) && await p.isHidden("#soundBar"));
    const live = await p.evaluate(() => window.__streams.flatMap((s) => s.getTracks().map((t) => t.readyState)));
    check("every microphone track is ended (the browser's mic indicator goes off)", live.length >= 1 && live.every((s) => s === "ended"), live.join());
    check("level meter reset and status says the microphone is off", /Microphone is off/.test(await p.textContent("#sndLevelText")));
    // restart works
    await p.evaluate(() => { location.hash = "#/dashboard/sounds"; });
    await p.click("#sndStart");
    await p.waitForFunction(() => window.SangamSound.isListening(), null, { timeout: 30000 });
    check("listening can be restarted without reloading the model", (await p.evaluate(() => window.__gum.length)) === 2);
    // a track ending by itself (unplugged / revoked) stops listening and says so
    await p.evaluate(() => window.__streams[window.__streams.length - 1].getTracks().forEach((t) => { t.stop(); t.dispatchEvent(new Event("ended")); }));
    await p.waitForFunction(() => !window.SangamSound.isListening(), null, { timeout: 5000 });
    check("microphone lost mid-listening → stops and explains", /microphone stopped/i.test(await p.textContent("#sndNote")));
    // pagehide
    await p.click("#sndStart"); await p.waitForFunction(() => window.SangamSound.isListening(), null, { timeout: 30000 });
    await p.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    check("pagehide turns the microphone off", !(await p.evaluate(() => window.SangamSound.isListening())) && (await p.evaluate(() => window.__streams.every((s) => s.getTracks().every((t) => t.readyState === "ended")))));
    check("no page errors", p.__errors.length === 0, p.__errors.join("; "));
    await p.__ctx.close();
  });

  await section("Errors are handled and explained", async () => {
    for (const [name, re, label] of [["NotAllowedError", /blocked/i, "permission denied"], ["NotFoundError", /No microphone was found/i, "no microphone"], ["NotReadableError", /in use by another app/i, "microphone busy"]]) {
      const p = await newPage(browser);
      await p.goto(BASE); await p.waitForSelector("#sndStart");
      await p.evaluate((n) => { window.__gumFail = n; }, name);
      await p.click("#sndStart");
      await p.waitForFunction(() => /microphone|blocked|No microphone/i.test(document.getElementById("sndNote").textContent) && !window.SangamSound.isListening() && !document.getElementById("sndStart").disabled, null, { timeout: 60000 });
      check(label + ": clear message, not listening, button usable again", re.test(await p.textContent("#sndNote")) && !(await p.evaluate(() => window.SangamSound.isListening())) && await p.isHidden("#soundBar"));
      check(label + ": preview alerts still work", await (async () => { await p.click('[data-preview="horn"]'); return /Vehicle horn/.test(await p.textContent("#soundAlert")); })());
      await p.__ctx.close();
    }
    // model fails to load: detection must be OFF, microphone must NOT be opened, and a retry works.
    const p = await newPage(browser);
    await p.route("**/vendor/yamnet/yamnet.tflite", (r) => r.abort());
    await p.goto(BASE); await p.waitForSelector("#sndStart");
    await p.click("#sndStart");
    await p.waitForFunction(() => window.SangamSound.modelState() === "failed", null, { timeout: 60000 });
    await p.waitForFunction(() => !document.getElementById("sndStart").disabled);
    check("model load failure: status says NOT loaded and detection is off", /NOT loaded\. Detection is off/.test(await p.textContent("#sndModel")));
    check("model load failure: the microphone was never opened", (await p.evaluate(() => window.__gum.length)) === 0);
    check("model load failure: note explains and offers retry", /could not be loaded/i.test(await p.textContent("#sndNote")) && /try again/i.test(await p.textContent("#sndNote")));
    check("model load failure: not listening, no indicator", !(await p.evaluate(() => window.SangamSound.isListening())) && await p.isHidden("#soundBar"));
    await p.unroute("**/vendor/yamnet/yamnet.tflite");
    await p.click("#sndStart");
    await p.waitForFunction(() => window.SangamSound.isListening(), null, { timeout: 60000 });
    check("retry after the failure succeeds", (await p.evaluate(() => window.SangamSound.modelState())) === "ready");
    await p.click("#sndStart");
    await p.__ctx.close();

    // wrong label file must be refused
    const q = await newPage(browser);
    await q.route("**/vendor/yamnet/yamnet_class_map.csv", (r) => r.fulfill({ status: 200, contentType: "text/csv", body: "index,mid,display_name\n0,/m/x,Speech\n1,/m/y,Other\n" }));
    await q.goto(BASE); await q.waitForSelector("#sndStart");
    await q.click("#sndStart");
    await q.waitForFunction(() => window.SangamSound.modelState() === "failed", null, { timeout: 60000 });
    check("a wrong label file is refused rather than trusted", /label file/i.test(await q.textContent("#sndModel")) && (await q.evaluate(() => window.__gum.length)) === 0);
    await q.__ctx.close();
  });

  await section("Accessibility of the new UI", async () => {
    const p = await newPage(browser, { bypassCSP: true });
    await p.goto(BASE); await p.waitForSelector("#sndStart");
    await p.click('[data-preview="fire"]');
    await p.waitForTimeout(2400); // let the flash pulse finish: axe cannot judge contrast through a moving colour overlay
    const axe = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
    await p.evaluate(axe);
    const res = await p.evaluate(() => axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }));
    check("axe: no violations on the Sound alerts panel with an alert showing", res.violations.length === 0, res.violations.map((v) => v.id + " x" + v.nodes.length + " " + v.nodes.map((n) => n.html.slice(0, 90) + " " + JSON.stringify(n.any.map((a) => a.data && a.data.contrastRatio + " " + a.data.fgColor + "/" + a.data.bgColor))).join(" | ")).join(", "));
    // keyboard: start button reachable and operable
    await p.focus("#sndStart");
    check("Start listening is keyboard focusable", await p.evaluate(() => document.activeElement.id === "sndStart"));
    // touch target sizes
    const small = await p.$$eval('section[data-p="sounds"] button, section[data-p="sounds"] .chip span, #soundAlert button', (n) => n.filter((b) => b.offsetParent && (b.getBoundingClientRect().height < 44)).map((b) => b.textContent.trim().slice(0, 30) + ":" + Math.round(b.getBoundingClientRect().height)));
    check("every button and chip is at least 44 px tall", small.length === 0, small.join(", "));
    // 320 px wide
    await p.setViewportSize({ width: 320, height: 700 });
    const over = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    check("no horizontal scrolling at 320 px wide", !over);
    await p.__ctx.close();
    // reduced motion
    const r = await newPage(browser, { reducedMotion: "reduce" });
    await r.goto(BASE); await r.waitForSelector("#sndStart");
    await r.click('[data-preview="fire"]');
    check("reduced motion: flash is a steady tint, not pulsing", await r.$eval("#soundFlash", (n) => n.classList.contains("calm") && !n.classList.contains("on")));
    await r.__ctx.close();
  });

  await section("Loud sound (not identified) fallback — Person 4 merge, off by default", async () => {
    const p = await newPage(browser);
    await p.goto(BASE); await p.waitForSelector("#sndStart");
    await p.evaluate(() => window.SangamSound._test.loadModel());
    check("the loud-sound toggle is rendered, separately from the classified-category chips", await p.$('#sndLoudType input[data-snd="loud"]') !== null);
    check("the loud-sound toggle is OFF by default", await p.$eval('#sndLoudType input[data-snd="loud"]', (i) => !i.checked));
    await feed(p, "noise", 48000, 4);
    check("a loud but unclassified noise raises nothing while the toggle is off", (await history(p)).length === 0);
    // Turn it on: a loud, unclassified noise now alerts, clearly labelled as not identified (never as a real classification).
    await p.check('#sndLoudType input[data-snd="loud"]');
    await p.check('#sndSens input[value="high"]'); // raises the loud-RMS sensitivity so the synthetic noise reliably crosses it
    await p.evaluate(() => window.SangamSound._test.reset());
    await feed(p, "noise", 48000, 4);
    const h = await history(p);
    check("loud, unclassified noise now raises a 'loud' alert (and nothing else)", h.length === 1 && h[0].id === "loud", JSON.stringify(h));
    const banner = await p.textContent("#soundAlert");
    check("banner names it 'Loud sound (not identified)', not a real category", /Loud sound \(not identified\) detected/.test(banner));
    check("banner explicitly says it was not identified as any known sound (never a fake class name)", /not identified as any known sound/i.test(banner));
    check("banner item carries the snd-item-free marker class for distinct styling", await p.$eval('#soundAlert .snd-item[data-id="loud"]', (n) => n.classList.contains("snd-item-free")));
    check("history line says 'loudness only, not identified', never a confidence-style classification line", /loudness only, not identified/.test(await p.textContent("#sndLog")));
    await p.click("#sndClear");

    // The central safety property, re-verified end-to-end through the real UI: a sound YAMNet DOES recognise
    // must never also raise (or be confused with) the generic "loud" fallback.
    await p.evaluate(() => window.SangamSound._test.reset());
    await feed(p, "beep", 48000, 6);
    const h2 = await history(p);
    check("a classified alarm with the loud fallback switched on is still reported only under its real classification(s), never also as 'loud'", h2.length > 0 && h2.every((x) => x.id !== "loud"), JSON.stringify(h2));

    // Spoken wording distinguishes the fallback from a real classification when spoken alerts are on.
    await p.check('[data-sndmode="speak"]');
    await p.evaluate(() => window.SangamSound._test.reset());
    await feed(p, "noise", 48000, 4);
    check("spoken alert for the fallback says 'not identified', never claims a specific sound", (await p.evaluate(() => window.__spoken)).some((t) => /Loud sound detected, not identified/.test(t)));
    await p.uncheck('[data-sndmode="speak"]');

    // Persistence: the setting survives reload like every other sound preference.
    await p.reload(); await p.waitForSelector("#sndStart");
    check("the loud-sound toggle's on/off state persists across reload", await p.$eval('#sndLoudType input[data-snd="loud"]', (i) => i.checked));
    const stored = JSON.parse(await p.evaluate(() => localStorage.getItem("sangam.sound.v1")));
    check("the stored preference array includes 'loud' once enabled", Array.isArray(stored.on) && stored.on.indexOf("loud") >= 0, JSON.stringify(stored.on));
    await p.__ctx.close();

    // A fresh profile still defaults to off: this is an opt-in fallback, not a silent behavior change for everyone.
    const q = await newPage(browser);
    await q.goto(BASE); await q.waitForSelector("#sndStart");
    check("a brand-new profile has the loud fallback off (no localStorage carried over)", await q.$eval('#sndLoudType input[data-snd="loud"]', (i) => !i.checked));
    await q.__ctx.close();
  });

  await section("Preview of the loud-sound fallback is labelled as simulated, same as any other category", async () => {
    const p = await newPage(browser);
    await p.goto(BASE); await p.waitForSelector("#sndStart");
    check("a preview button exists for the loud fallback, even though it has no real class score to simulate", await p.$('[data-preview="loud"]') !== null);
    await p.click('[data-preview="loud"]');
    const t = await p.textContent("#soundAlert");
    check("preview says it is a preview, not a real detection", /Preview \(not a real sound\): Loud sound \(not identified\)/.test(t));
    check("preview does not show a fabricated confidence number for the fallback", !/Confidence \d+%/.test(t));
    check("preview did not start the microphone or require the loud toggle to be on first", (await p.evaluate(() => window.__gum.length)) === 0);
    await p.__ctx.close();
  });

  await browser.close();
  console.log("\n" + pass + " passed, " + fail + " failed");
  server.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
