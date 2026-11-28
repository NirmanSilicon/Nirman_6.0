/*
 * Browser tests for the Sign Language Camera, in real Chromium.
 *
 * REAL in these tests:  the dialog, consent flow, getUserMedia and track handling (Chromium's FAKE camera: a test
 *                       pattern, no person), the MediaPipe hand tracker loading and running on that test pattern,
 *                       the matching engine, transcript editing, speech/send plumbing, the WebSocket chat and the
 *                       two-participant journey (two separate browser contexts).
 * MOCK in these tests:  the hands. Where a sign has to be "performed", a clearly labelled TEST HAND SOURCE feeds
 *                       generated hand skeletons into the real engine (the app shows a banner saying so).
 *                       Speech output is a recording stand-in.
 * NOT tested here:      real people signing, real recognition accuracy of the pretrained ISL/ASL models (that needs
 *                       a real camera and a real signer — see test-sign-model.js for real-weight inference parity,
 *                       and docs/SIGN_LANGUAGE_MODEL_EVALUATION.md for why camera accuracy is still unmeasured),
 *                       real cameras on real phones. See TEST_REPORT.md.
 *
 *   node test-sign-browser.js
 */
"use strict";
process.env.PORT = process.env.SIGN_BROWSER_PORT || "8102";
const fs = require("fs");
const { chromium } = require("playwright");
const { server } = require("./server/server.js");

const ORIGIN = "http://localhost:" + process.env.PORT;
const HANDS_SRC = fs.readFileSync(require.resolve("./test-support/synthetic-hands.js"), "utf8");
// ASL (WLASL) is download-on-request, not bundled (its dataset forbids commercial use — see
// docs/SIGN_LANGUAGE_MODEL_EVALUATION.md and MODEL_INSTALLATION_GUIDE.md). ISL (INCLUDE, CC BY 4.0) IS bundled.
// This checkout may have ASL installed too (for development/parity testing); test for both cases honestly rather
// than assuming either.
const ASL_INSTALLED = fs.existsSync(__dirname + "/vendor/sign-models/asl/wlasl-slgcn/model.json");
let pass = 0, fail = 0;
function check(name, ok, extra) { console.log((ok ? "PASS" : "FAIL") + " — " + name + (extra ? "  (" + extra + ")" : "")); ok ? pass++ : fail++; }
async function section(name, fn) { console.log("\n## " + name); try { await fn(); } catch (e) { check(name + " ran without exception", false, String(e && e.message || e).split("\n")[0]); } }

const STUBS = `(() => {
  window.__spoken = []; window.__cancelled = 0; window.__gum = []; window.__streams = []; window.__frames = [];
  const synth = { speaking:false, paused:false, cancel(){ window.__cancelled++; }, resume(){}, getVoices(){ return [{ voiceURI:"fake-en", name:"Fake English", lang:"en-US" }]; }, onvoiceschanged:null, addEventListener(){}, removeEventListener(){}, speak(u){ window.__spoken.push(u.text); } };
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  const O = window.WebSocket;
  window.WebSocket = function (u, p) { const w = p ? new O(u, p) : new O(u); const s = w.send.bind(w); w.send = function (d) { window.__frames.push(String(d)); return s(d); }; return w; };
  window.WebSocket.prototype = O.prototype; window.WebSocket.OPEN = O.OPEN; window.WebSocket.CONNECTING = O.CONNECTING; window.WebSocket.CLOSED = O.CLOSED; window.WebSocket.CLOSING = O.CLOSING;
  const gum = navigator.mediaDevices && navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  if (gum) navigator.mediaDevices.getUserMedia = function (c) {
    window.__gum.push(JSON.stringify(c));
    if (window.__gumFail && c && c.video) return Promise.reject(Object.assign(new Error("stub"), { name: window.__gumFail }));
    return gum(c).then((s) => { window.__streams.push(s); return s; });
  };
})();`;

async function newPage(browser, opts, viewport) {
  const ctx = await browser.newContext(Object.assign({ permissions: ["camera", "microphone", "clipboard-read", "clipboard-write"], viewport: viewport || { width: 1280, height: 900 } }, opts || {}));
  await ctx.addInitScript(STUBS);
  await ctx.addInitScript(HANDS_SRC);
  const page = await ctx.newPage();
  const requests = []; page.on("request", (r) => requests.push({ url: r.url(), method: r.method() }));
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  page.__requests = requests; page.__errors = errors; page.__ctx = ctx;
  return page;
}
const tracksState = (p) => p.evaluate(() => window.__streams.flatMap((s) => s.getVideoTracks().map((t) => t.readyState)));
const allEnded = async (p) => { const s = await tracksState(p); return s.length > 0 && s.every((x) => x === "ended"); };
const dlgOpen = (p) => p.evaluate(() => document.getElementById("signDlg").open);

async function installMock(p) {
  await p.evaluate(() => {
    class Mock {
      constructor() { this.isMock = true; this.id = "mock"; this.name = "Test hand source"; this.t = 1000; this.running = false; }
      load() { return Promise.resolve(); }
      start(v, cb) { this.cb = cb; this.running = true; }
      pause() { this.running = false; } resume() { this.running = true; }
      stop() { this.running = false; this.cb = null; }
      dispose() { window.__mockDisposed = (window.__mockDisposed || 0) + 1; this.stop(); }
      play(frames, fps) { for (const f of frames) { this.t += 1000 / (fps || 30); if (this.cb) this.cb(f, this.t); } }
      lower(ms) { const n = Math.ceil((ms || 900) / 33); for (let i = 0; i < n; i++) { this.t += 33; if (this.cb) this.cb([], this.t); } }
    }
    window.SangamSign.extractorFactory = () => (window.__mock = new Mock());
  });
}
// Perform a generated sign through the mock and let the segmenter see the hands leave.
const perform = (p, name, o) => p.evaluate(([n, o]) => { const m = window.__mock; m.play(n === "alien" ? SyntheticHands.alien(o) : SyntheticHands.sign(n, o), o && o.fps); m.lower(900); }, [name, o || null]);
const idle = (p, ms) => p.evaluate((ms) => window.__mock.lower(ms), ms);
const val = (p, id) => p.inputValue("#" + id);

async function openSign(p, opts) {
  opts = opts || {};
  await p.goto(ORIGIN + "/#/dashboard/sign"); await p.waitForSelector('section[data-p="sign"]:not([hidden])');
  await p.click("#signOpen");
  if (!opts.noConsent) { await p.click("#signConsentGo"); }
}
async function reopen(p) { await p.click("#signOpen"); await p.click("#signCamStart"); await cameraOn(p); }
async function cameraOn(p) { await p.waitForFunction(() => document.getElementById("signDot") && !document.getElementById("signDot").hidden, null, { timeout: 15000 }); }
async function startMockRecognition(p) {
  await installMock(p);
  await p.click("#signRecStart");
  await p.waitForFunction(() => window.SangamSign._state.recognising, null, { timeout: 10000 });
}
async function teach(p, label, n, opts) {
  for (let i = 0; i < n; i++) {
    await p.fill("#signLabel", label); await p.click("#signRecord");
    await p.waitForFunction((l) => window.SangamSign._state.teachLabel === l, label);
    await perform(p, label, Object.assign({ n: 16 + i * 4, size: 0.1 + i * 0.015, ox: i * 0.02 }, opts || {}));
    await p.waitForFunction(() => !window.SangamSign._state.teachLabel);
  }
}

(async () => {
  const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });

  await section("Entry point, honesty and nothing starts by itself", async () => {
    const p = await newPage(browser);
    await p.goto(ORIGIN + "/#/dashboard/sign"); await p.waitForSelector('section[data-p="sign"]:not([hidden])');
    const txt = await p.textContent('section[data-p="sign"]');
    check("Sign Language Camera is a dashboard feature with a tile", await p.evaluate(() => !!document.querySelector('a[href="#/dashboard/sign"]')));
    check("panel says it is NOT a full sign-language translator", /not a full sign-language translator/i.test(txt));
    check("panel says SANGAM has not independently tested the pretrained models' accuracy", /has not independently tested/i.test(txt));
    check("panel says pictures are never uploaded or recorded", /never uploaded or recorded/i.test(txt));
    check("camera was NOT requested on page load", (await p.evaluate(() => window.__gum.length)) === 0);
    // Model loading is an async fetch (vendor/sign-models/.../model.json + weights.bin); give it time to resolve.
    await p.waitForFunction(() => { const li = document.querySelectorAll("#signRecList li"); return Array.from(li).some((x) => /Indian Sign Language/.test(x.textContent) && /Available/.test(x.textContent)); }, { timeout: 10000 });
    const recs = await p.$$eval("#signRecList li", (n) => n.map((x) => x.textContent));
    check("recogniser list: ISL is shown as available (a real pretrained model is bundled)", recs.some((t) => /Indian Sign Language/.test(t) && /Available/.test(t)), recs.join(" | ").slice(0, 300));
    check("recogniser list: ASL is shown as " + (ASL_INSTALLED ? "available (installed in this checkout for testing)" : "not installed (download-on-request, see MODEL_INSTALLATION_GUIDE.md)"),
      recs.some((t) => /American Sign Language/.test(t) && new RegExp(ASL_INSTALLED ? "Available" : "Not installed").test(t)), recs.join(" | ").slice(0, 300));
    check("recogniser list: BSL is shown as not installed", recs.some((t) => /British Sign Language/.test(t) && /Not installed/.test(t)));
    check("recogniser list: ASL is never presented as ISL", !recs.some((t) => /American/.test(t) && /Indian/.test(t)));
    check("dialog is closed until opened", !(await dlgOpen(p)));
    check("no page errors", p.__errors.length === 0, p.__errors.join("; "));
    await p.__ctx.close();
  });

  await section("Dialog: modal, consent, focus, Escape", async () => {
    const p = await newPage(browser);
    await p.goto(ORIGIN + "/#/dashboard/sign"); await p.waitForSelector('section[data-p="sign"]:not([hidden])');
    await p.focus("#signOpen"); await p.keyboard.press("Enter");
    check("opens from the keyboard as a modal dialog", await dlgOpen(p) && await p.evaluate(() => document.getElementById("signDlg").matches(":modal")));
    check("consent is shown first and the camera panel is hidden", await p.isVisible("#signConsent") && await p.isHidden("#signMain"));
    check("focus moves into the dialog (on the consent button)", await p.evaluate(() => document.activeElement.id === "signConsentGo"));
    check("camera still NOT requested while consent is showing", (await p.evaluate(() => window.__gum.length)) === 0);
    const dlgHas = await p.evaluate(() => { const d = document.getElementById("signDlg"); return d.getAttribute("aria-labelledby") && !!document.getElementById(d.getAttribute("aria-labelledby")); });
    check("dialog has an accessible name", dlgHas);
    // focus stays inside the dialog while tabbing
    let outside = false; for (let i = 0; i < 12; i++) { await p.keyboard.press("Tab"); if (await p.evaluate(() => document.activeElement !== document.body && !document.getElementById("signDlg").contains(document.activeElement))) outside = true; }
    check("Tab never reaches the page behind the dialog (focus stays inside it or goes to the browser itself)", !outside);
    await p.keyboard.press("Escape");
    check("Escape closes the dialog", !(await dlgOpen(p)));
    check("focus returns to the button that opened it", await p.evaluate(() => document.activeElement.id === "signOpen"));
    check("declining consent leaves the camera unrequested", (await p.evaluate(() => window.__gum.length)) === 0);
    await p.click("#signOpen"); await p.click("#signConsentNo");
    check("'Not now' closes without starting the camera", !(await dlgOpen(p)) && (await p.evaluate(() => window.__gum.length)) === 0);
    await p.__ctx.close();
  });

  await section("Camera: permission granted, preview, stop, cleanup", async () => {
    const p = await newPage(browser);
    await openSign(p); await cameraOn(p);
    const c = JSON.parse(await p.evaluate(() => window.__gum[0]));
    check("camera asked for video only: no microphone", c.video && c.audio === false);
    check("live preview is playing with a real picture size", await p.evaluate(() => { const v = document.getElementById("signVideo"); return !!v.srcObject && v.videoWidth > 0 && !v.paused; }));
    check("the preview is mirrored like a mirror", await p.$eval("#signVideo", (v) => getComputedStyle(v).transform.replace(/\s/g, "").startsWith("matrix(-1,0,0,1")));
    check("the stage uses the camera's own aspect ratio so hands are not cropped", /\d+ \/ \d+/.test(await p.$eval("#signStage", (s) => s.style.aspectRatio)));
    check("a 'Camera on' indicator is visible", await p.isVisible("#signDot"));
    check("status text says the camera is on", /Camera on/.test(await p.textContent("#signCamStatus")));
    check("recognition has NOT started by itself", !(await p.evaluate(() => window.SangamSign._state.recognising)));
    check("hand-tracking model has NOT been loaded yet (lazy)", !p.__requests.some((r) => /hands\.js|hands_solution/.test(r.url)));
    await p.click("#signCamStop");
    check("Stop camera ends every video track", await allEnded(p));
    check("preview is cleared and indicator hidden after Stop", (await p.evaluate(() => document.getElementById("signVideo").srcObject)) === null && await p.isHidden("#signDot"));
    await p.click("#signCamStart"); await cameraOn(p);
    check("the camera can be reopened", (await p.evaluate(() => window.__gum.length)) === 2);
    await p.click("#signClose");
    check("closing the dialog ends every video track", await allEnded(p) && !(await dlgOpen(p)));
    await reopen(p);
    await p.keyboard.press("Escape");
    check("Escape closes the dialog and releases the camera", !(await dlgOpen(p)) && await allEnded(p));
    await reopen(p);
    await p.evaluate(() => { location.hash = "#/dashboard/phrases"; });
    await p.waitForTimeout(300);
    check("navigating away closes the dialog and releases the camera", !(await dlgOpen(p)) && await allEnded(p));
    await p.evaluate(() => { location.hash = "#/dashboard/sign"; }); await p.waitForSelector('section[data-p="sign"]:not([hidden])'); await reopen(p);
    await p.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    check("pagehide releases the camera", await allEnded(p));
    await p.click("#signCamStart"); await cameraOn(p); // the dialog is still open after pagehide, camera off
    await p.evaluate(() => window.__streams[window.__streams.length - 1].getVideoTracks().forEach((t) => { t.stop(); t.dispatchEvent(new Event("ended")); }));
    await p.waitForFunction(() => document.getElementById("signDot").hidden, null, { timeout: 5000 });
    check("camera unplugged mid-use: indicator off and a clear message", /disconnected or stopped/i.test(await p.textContent("#signCamStatus")));
    check("no video, frames or pictures went to the network (no non-GET requests)", p.__requests.every((r) => r.method === "GET"), p.__requests.filter((r) => r.method !== "GET").map((r) => r.method + " " + r.url).join(", "));
    check("nothing external was contacted", p.__requests.every((r) => /^http:\/\/localhost:/.test(r.url) || /^(data|blob):/.test(r.url)));
    check("no page errors", p.__errors.length === 0, p.__errors.join("; "));
    await p.__ctx.close();
  });

  await section("Camera errors are explained", async () => {
    const cases = [["NotAllowedError", /permission was denied/i, "permission denied"], ["NotFoundError", /No camera was found/i, "no camera"], ["NotReadableError", /busy or blocked/i, "camera in use"], ["OverconstrainedError", /cannot give a usable picture/i, "camera cannot satisfy constraints"], ["SecurityError", /blocked the camera on this page/i, "insecure page"]];
    for (const [name, re, label] of cases) {
      const p = await newPage(browser);
      await p.goto(ORIGIN + "/#/dashboard/sign"); await p.waitForSelector('section[data-p="sign"]:not([hidden])');
      await p.evaluate((n) => { window.__gumFail = n; }, name);
      await p.click("#signOpen"); await p.click("#signConsentGo");
      await p.waitForFunction(() => /\w/.test(document.getElementById("signCamStatus").textContent) && !/Opening/.test(document.getElementById("signCamStatus").textContent), null, { timeout: 10000 });
      check(label + ": clear message", re.test(await p.textContent("#signCamStatus")), await p.textContent("#signCamStatus"));
      check(label + ": Open camera is usable again, recognition cannot start, no indicator", await p.isEnabled("#signCamStart") && await p.isDisabled("#signRecStart") && await p.isHidden("#signDot"));
      await p.__ctx.close();
    }
    const q = await newPage(browser, { permissions: [] });
    await q.addInitScript(() => { Object.defineProperty(navigator, "mediaDevices", { value: undefined, configurable: true }); });
    await q.goto(ORIGIN + "/#/dashboard/sign"); await q.waitForSelector('section[data-p="sign"]:not([hidden])');
    await q.click("#signOpen"); await q.click("#signConsentGo");
    check("a browser with no camera API says so", /cannot use a camera/i.test(await q.textContent("#signCamStatus")));
    await q.__ctx.close();
  });

  await section("Language selector is honest", async () => {
    const p = await newPage(browser);
    await openSign(p); await cameraOn(p);
    await p.waitForFunction(() => { const o = document.querySelectorAll("#signLang option"); return Array.from(o).some((x) => /Indian Sign Language/.test(x.textContent) && !x.disabled); }, { timeout: 10000 });
    const opts = await p.$$eval("#signLang option", (o) => o.map((x) => ({ t: x.textContent, d: x.disabled, v: x.value })));
    check("ISL is listed, selectable (a real pretrained model is bundled)", opts.some((o) => /Indian Sign Language/.test(o.t) && !o.d));
    check("ASL is listed, " + (ASL_INSTALLED ? "selectable (installed in this checkout for testing)" : "not installed and cannot be selected (download-on-request)"),
      ASL_INSTALLED ? opts.some((o) => /American Sign Language/.test(o.t) && !o.d) : opts.some((o) => /American Sign Language/.test(o.t) && o.d && /not installed/.test(o.t)));
    check("BSL is listed as not installed and cannot be selected", opts.some((o) => /British/.test(o.t) && o.d && /not installed/.test(o.t)));
    check("the user's own taught signs are also selectable", opts.some((o) => !o.d && /own signs/i.test(o.t)));
    check("no option labels one language as another (ASL is not called ISL)", !opts.some((o) => /ASL|American/.test(o.t) && /Indian|ISL/.test(o.t)));
    await p.click("#signAbout summary");
    const about = await p.textContent("#signAboutBody");
    check("'About' states the limits for the user's own taught signs: hands only, no sentences, accuracy with real signers unmeasured", /Hands only/.test(about) && /not been measured/i.test(about));
    await p.selectOption("#signLang", "isl");
    const aboutIsl = await p.textContent("#signAboutBody");
    check("'About' for ISL names the pretrained model and says SANGAM has not independently measured its accuracy", /SL-GCN|OpenHands/.test(aboutIsl) && /has not independently measured/i.test(aboutIsl));
    check("'About' for ISL lists real vocabulary words, not a placeholder", /Dog|Religion|Energy/i.test(aboutIsl));
    if (ASL_INSTALLED) {
      await p.selectOption("#signLang", "asl");
      const aboutAsl = await p.textContent("#signAboutBody");
      check("'About' for ASL is a separate vocabulary from ISL and says the same about unmeasured accuracy", /has not independently measured/i.test(aboutAsl));
    } else {
      check("ASL not installed in this checkout: skipped its 'About' panel check (see MODEL_INSTALLATION_GUIDE.md to install it)", true);
    }
    await p.__ctx.close();
  });

  await section("Camera aspect-ratio correction is actually wired up (regression test for the dead-code bug)", async () => {
    // PretrainedAdapter.classify() only rescales x-coordinates (correctAspect()) when opts.cameraAspect is set.
    // It used to never be set at all (the adapter was constructed with permanently empty opts = {}), so the
    // correction silently never ran for any camera. This proves the real video's measured dimensions reach the
    // adapter's opts, using Chromium's real fake-camera device (not a mock), which defaults to 640x480 (4:3) -
    // a camera aspect ratio that genuinely differs from ISL's 16:9 training reference, so this is a meaningful check.
    const p = await newPage(browser);
    // Force a camera resolution that is NOT 16:9 (the app's own "ideal" 1280x720 request happens to land on
    // Chromium's fake device at exactly 16:9, which would match ISL's referenceAspect by coincidence and make
    // this test pass even if the wiring were broken). Overriding to 640x480 (4:3) makes the check meaningful.
    await p.addInitScript(() => {
      const g = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = function (c) {
        if (c && c.video) c = Object.assign({}, c, { video: Object.assign({}, c.video, { width: { exact: 640 }, height: { exact: 480 } }) });
        return g(c);
      };
    });
    await openSign(p); await cameraOn(p);
    await p.waitForFunction(() => window.SangamSign.pretrained && window.SangamSign.pretrained.isl, null, { timeout: 15000 });
    const info = await p.evaluate(() => {
      const v = document.getElementById("signVideo");
      return { camAspect: window.SangamSign.pretrained.isl.opts.cameraAspect, refAspect: window.SangamSign.pretrained.isl.spec.preprocessing.referenceAspect, vw: v.videoWidth, vh: v.videoHeight };
    });
    check("the real (fake-device) camera reports a usable picture size", info.vw > 0 && info.vh > 0, info.vw + "x" + info.vh);
    check("ISL's opts.cameraAspect is set to the camera's real measured aspect ratio, not left empty", info.camAspect != null && Math.abs(info.camAspect - info.vw / info.vh) < 1e-6, JSON.stringify(info));
    check("the fake camera's aspect genuinely differs from ISL's 16:9 training reference (so this test cannot pass by accident)", Math.abs(info.camAspect / info.refAspect - 1) > 0.05, JSON.stringify(info));
    if (ASL_INSTALLED) {
      const aslAspect = await p.evaluate(() => window.SangamSign.pretrained.asl && window.SangamSign.pretrained.asl.opts.cameraAspect);
      check("ASL's opts.cameraAspect is also wired up independently of ISL's", aslAspect != null && Math.abs(aslAspect - info.vw / info.vh) < 1e-6);
    } else {
      check("ASL not installed in this checkout: skipped (see MODEL_INSTALLATION_GUIDE.md to install it)", true);
    }
    await p.click("#signClose");
    const cleared = await p.evaluate(() => window.SangamSign.pretrained.isl.opts.cameraAspect);
    check("closing the camera clears cameraAspect rather than leaving a stale value for the next session", !cleared);
    await p.__ctx.close();
  });

  await section("Hand-tracking model failure is handled", async () => {
    const p = await newPage(browser);
    await p.route("**/vendor/mediapipe/hands/hands.js", (r) => r.abort());
    await openSign(p); await cameraOn(p);
    await p.click("#signRecStart");
    await p.waitForFunction(() => /could not be loaded/i.test(document.getElementById("signRecStatus").textContent), null, { timeout: 15000 });
    check("model load failure: clear message that nothing was sent", /could not be loaded/i.test(await p.textContent("#signRecStatus")) && /nothing was sent/i.test(await p.textContent("#signRecStatus")));
    check("model load failure: not recognising, can try again", !(await p.evaluate(() => window.SangamSign._state.recognising)) && await p.isEnabled("#signRecStart"));
    check("model load failure: the camera preview keeps working", await p.isVisible("#signDot"));
    await p.unroute("**/vendor/mediapipe/hands/hands.js");
    await p.__ctx.close();
  });

  await section("REAL hand tracker on Chromium's fake camera picture", async () => {
    const p = await newPage(browser);
    await openSign(p); await cameraOn(p);
    await p.click("#signRecStart");
    await p.waitForFunction(() => window.SangamSign._state.recognising, null, { timeout: 90000 });
    check("the real MediaPipe hand tracker loads from this site and starts", !p.__requests.some((r) => !/^http:\/\/localhost:/.test(r.url) && !/^(data|blob):/.test(r.url)) && p.__requests.some((r) => /hands_solution/.test(r.url)));
    check("no mock banner is shown (this is the real tracker)", await p.isHidden("#signBanner"));
    await p.waitForTimeout(3000);
    check("a hand-free test picture produces no words", (await val(p, "signText")) === "");
    check("status says hand tracking is running and a sign must be taught", /Hand tracking is running|Teach a sign|Recognising/.test(await p.textContent("#signRecStatus")));
    await p.click("#signClose");
    check("closing releases the camera while the real tracker was running", await allEnded(p));
    check("real tracker: no network request carried any camera data", p.__requests.every((r) => r.method === "GET"));
    check("no page errors with the real tracker", p.__errors.length === 0, p.__errors.join("; "));
    await p.__ctx.close();
  });

  await section("REAL MediaPipe Holistic loads the vendored 'full' pose model for the pretrained ISL path (not 'lite', not an unvendored 'heavy')", async () => {
    // Regression test for the lite-vs-heavy pose-model mismatch (docs/SIGN_LANGUAGE_MODEL_EVALUATION.md,
    // vendor/mediapipe/holistic/NOTICE.md): HolisticExtractor (used only for the pretrained ISL/ASL recognisers)
    // must request pose_landmark_full.tflite, never pose_landmark_lite.tflite, and never a heavy model that
    // isn't actually vendored (which would 404 and silently fail initialisation).
    const p = await newPage(browser);
    await openSign(p); await cameraOn(p);
    await p.waitForFunction(() => { const o = document.querySelectorAll("#signLang option"); return Array.from(o).some((x) => /Indian Sign Language/.test(x.textContent) && !x.disabled); }, { timeout: 10000 });
    await p.selectOption("#signLang", "isl");
    await p.click("#signRecStart");
    await p.waitForFunction(() => window.SangamSign._state.recognising, null, { timeout: 90000 });
    await p.waitForTimeout(500);
    const poseRequests = p.__requests.filter((r) => /pose_landmark/.test(r.url));
    check("the real MediaPipe Holistic tracker loads from this site and starts", !p.__requests.some((r) => !/^http:\/\/localhost:/.test(r.url) && !/^(data|blob):/.test(r.url)) && p.__requests.some((r) => /holistic_solution/.test(r.url)));
    check("exactly the 'full' pose-landmark model is fetched", poseRequests.length > 0 && poseRequests.every((r) => /pose_landmark_full\.tflite/.test(r.url)), poseRequests.map((r) => r.url).join(", "));
    check("'lite' is never requested by the pretrained-model path", !poseRequests.some((r) => /pose_landmark_lite\.tflite/.test(r.url)));
    check("'heavy' is never requested (it is not vendored; requesting it would 404)", !poseRequests.some((r) => /pose_landmark_heavy\.tflite/.test(r.url)));
    check("the model actually finished loading and is tracking (no 'could not be loaded' failure)", !/could not be loaded/i.test(await p.textContent("#signRecStatus")));
    check("no page errors while the real Holistic tracker was loading", p.__errors.length === 0, p.__errors.join("; "));
    await p.__ctx.close();
  });

  await section("Teach, recognise, unknown, duplicates (mock hands into the REAL engine)", async () => {
    const p = await newPage(browser);
    await openSign(p); await cameraOn(p);
    await installMock(p);
    check("before anything is taught, Start recognition works but explains that nothing can be recognised", await (async () => { await p.click("#signRecStart"); await p.waitForFunction(() => window.SangamSign._state.recognising); return /Nothing taught yet|Teach a sign/i.test(await p.textContent("#signRecStatus")); })());
    check("the TEST HAND SOURCE banner is shown while hands are mocked", await p.isVisible("#signBanner") && /TEST HAND SOURCE/.test(await p.textContent("#signBanner")));
    check("Record is disabled until a word is typed", await p.isDisabled("#signRecord"));
    await p.fill("#signLabel", "hello");
    check("Record becomes available once a word is typed", await p.isEnabled("#signRecord"));
    await teach(p, "hello", 1);
    check("one example is saved but not yet used (needs 2)", /needs 1 more/.test(await p.textContent("#signTaught")));
    await teach(p, "hello", 2); await teach(p, "wait", 3); await teach(p, "peace", 3);
    const taught = await p.textContent("#signTaught");
    check("taught signs are listed with their example counts", /hello.*3 examples/.test(taught) && /wait.*3 examples/.test(taught) && /peace.*3 examples/.test(taught));
    check("the taught signs are stored as numbers on this device, not pictures", await p.evaluate(() => { const s = localStorage.getItem("sangam.sign.personal.v1") || ""; return s.length > 0 && !/data:image|blob:/.test(s) && /^\{"labels"/.test(s); }));
    // recognise
    await perform(p, "wait", { n: 22, size: 0.13, ox: 0.03 });
    check("a taught sign performed again (other speed, size, place) is added to the transcript", (await val(p, "signText")) === "wait", await val(p, "signText"));
    check("the confidence line shows a match figure and says it is not a probability", /Match: \d+%/.test(await p.textContent("#signConf")) && /not a probability/.test(await p.textContent("#signConf")));
    check("status line says the word was added", /Added/.test(await p.textContent("#signPartial")));
    await perform(p, "wait", { n: 10, fps: 60 });
    check("the same sign again straight away is suppressed (no accidental duplicate)", (await val(p, "signText")) === "wait" && /ignored/.test(await p.textContent("#signPartial")));
    await idle(p, 3000);
    await perform(p, "hello", { n: 18 });
    check("a different sign is added after a space", (await val(p, "signText")) === "wait hello", await val(p, "signText"));
    await idle(p, 3000); await perform(p, "wait", { n: 20 });
    check("the same sign after a pause counts again", (await val(p, "signText")) === "wait hello wait");
    await idle(p, 3000); await perform(p, "alien");
    check("a movement that was never taught is NOT turned into a word", (await val(p, "signText")) === "wait hello wait", await val(p, "signText"));
    check("the user is told: Sign not recognised clearly. Please repeat.", /Sign not recognised clearly\. Please repeat\./.test(await p.textContent("#signPartial")));
    // brief flick
    await idle(p, 3000);
    await p.evaluate(() => { const m = window.__mock; m.play(SyntheticHands.sign("hello", { n: 3 })); m.lower(900); });
    check("a hand flick too brief to be a sign is ignored", (await val(p, "signText")) === "wait hello wait" && /too brief/.test(await p.textContent("#signPartial")));
    // partial vs final
    await idle(p, 3000);
    await p.evaluate(() => { const m = window.__mock; m.play(SyntheticHands.sign("peace", { n: 14 })); });
    check("while a sign is in progress the transcript is NOT changed (partial is not final)", (await val(p, "signText")) === "wait hello wait" && /in progress|Possibly/.test(await p.textContent("#signPartial")));
    await p.evaluate(() => window.__mock.lower(900));
    check("the word is only added when the sign ends", (await val(p, "signText")) === "wait hello wait peace");
    // pause / resume
    await p.click("#signRecPause");
    check("Pause stops recognition and says so", /Paused/.test(await p.textContent("#signRecStatus")) && (await p.textContent("#signRecPause")) === "Resume");
    await idle(p, 3000); await perform(p, "hello", { n: 18 });
    check("nothing is recognised while paused", (await val(p, "signText")) === "wait hello wait peace");
    await p.click("#signRecPause"); await idle(p, 3000); await perform(p, "hello", { n: 18 });
    check("Resume recognises again", (await val(p, "signText")) === "wait hello wait peace hello");
    check("nothing was spoken automatically (auto-speak is off by default)", (await p.evaluate(() => window.__spoken.length)) === 0 && !(await p.isChecked("#signAuto")));
    // delete one taught sign
    await p.click('#signTaught button[data-del="peace"]');
    check("a taught sign can be deleted", !/peace/.test(await p.textContent("#signTaught")));
    await p.__ctx.close();
  });

  await section("Transcript: edit, undo, clear, confirm, copy, speak", async () => {
    const p = await newPage(browser);
    await openSign(p); await cameraOn(p);
    await startMockRecognition(p);
    await teach(p, "hello", 3); await teach(p, "wait", 3);
    await perform(p, "hello", { n: 18 }); await idle(p, 3000); await perform(p, "wait", { n: 18 });
    check("two words recognised", (await val(p, "signText")) === "hello wait");
    check("Undo last word removes only the last word", await (async () => { await p.click("#signUndo"); return (await val(p, "signText")) === "hello"; })());
    await p.fill("#signText", "hello my friend");
    check("the transcript is editable by typing", (await val(p, "signText")) === "hello my friend");
    check("Confirm is available, Send is not until confirmed", await p.isEnabled("#signConfirm") && await p.isDisabled("#signSend"));
    await p.click("#signSpeak");
    check("Speak reads the text aloud (stand-in speech)", (await p.evaluate(() => window.__spoken)).includes("hello my friend"));
    await p.click("#signStopSpeak");
    check("Stop speaking cancels speech", (await p.evaluate(() => window.__cancelled)) >= 1);
    await p.click("#signCopy");
    check("Copy puts the text on the clipboard", (await p.evaluate(() => navigator.clipboard.readText())) === "hello my friend" || /Copied|selected/i.test(await p.textContent("#signSendNote")));
    await p.click("#signConfirm");
    check("Confirm enables Send", await p.isEnabled("#signSend") && /Confirmed/.test(await p.textContent("#signSendNote")));
    await p.fill("#signText", "hello my friend!");
    check("editing after confirming un-confirms: Send is disabled again", await p.isDisabled("#signSend") && await p.isEnabled("#signConfirm"));
    await p.click("#signClear");
    check("Clear empties the transcript and disables the buttons", (await val(p, "signText")) === "" && await p.isDisabled("#signSend") && await p.isDisabled("#signSpeak") && await p.isDisabled("#signConfirm"));
    // auto speak option
    await p.check("#signAuto"); await idle(p, 3000); await perform(p, "wait", { n: 20 });
    check("auto-speak (opt-in) speaks each new word", (await p.evaluate(() => window.__spoken)).includes("wait"));
    await p.__ctx.close();
  });

  await section("Send with no chat connected keeps the text", async () => {
    const p = await newPage(browser);
    await openSign(p); await cameraOn(p);
    await p.fill("#signText", "hello"); await p.click("#signConfirm"); await p.click("#signSend");
    check("not connected: told nothing was sent, and the text is kept", /Not connected to a chat, so nothing was sent/.test(await p.textContent("#signSendNote")) && (await val(p, "signText")) === "hello");
    check("no websocket frame was sent", (await p.evaluate(() => window.__frames.length)) === 0);
    await p.__ctx.close();
  });

  await section("Two participants: sign → confirm → send → receive, with provenance", async () => {
    const A = await newPage(browser), B = await newPage(browser, { viewport: { width: 390, height: 800 } });
    await A.goto(ORIGIN + "/#/dashboard/connect"); await A.waitForSelector("#createBtn");
    await A.fill("#hostName", "Ravi"); await A.click("#createBtn");
    await A.waitForSelector("#connectLive .share-url"); const joinUrl = await A.inputValue("#connectLive .share-url");
    await A.waitForSelector("#liveChat .chat");
    await B.goto(joinUrl); await B.waitForSelector("#joinDisplay"); await B.fill("#joinDisplay", "Meera"); await B.click("#joinGo");
    await B.waitForSelector("#overlayChat .chat");
    await A.waitForFunction(() => /is here|online/i.test((document.querySelector("#liveChat .chat-count") || {}).textContent || ""));
    // Ravi signs
    await A.evaluate(() => { location.hash = "#/dashboard/sign"; }); await A.waitForSelector('section[data-p="sign"]:not([hidden])');
    await A.click("#signOpen"); await A.click("#signConsentGo"); await cameraOn(A);
    await startMockRecognition(A);
    await teach(A, "hello", 3); await teach(A, "wait", 3);
    await perform(A, "hello", { n: 18 }); await idle(A, 3000); await perform(A, "wait", { n: 18 });
    check("words recognised on Ravi's side", (await val(A, "signText")) === "hello wait");
    const seenB = () => B.$$eval("#overlayChat .msg-t", (n) => n.map((x) => x.textContent));
    await A.waitForTimeout(800);
    check("NOTHING reached Meera while the text was only recognised (no auto-send)", !(await seenB()).some((t) => /hello wait/.test(t)));
    await A.click("#signConfirm"); await A.waitForTimeout(500);
    check("NOTHING reached Meera after confirming either (send is a separate step)", !(await seenB()).some((t) => /hello wait/.test(t)));
    await A.click("#signSend");
    await B.waitForFunction(() => [...document.querySelectorAll("#overlayChat .msg-t")].some((n) => /hello wait/.test(n.textContent)), null, { timeout: 10000 });
    check("Meera receives the confirmed text", (await seenB()).some((t) => t === "hello wait"));
    const tagB = await B.$$eval("#overlayChat .msg.them .msg-tag.src", (n) => n.map((x) => x.textContent));
    check("Meera sees accurate provenance: interpreted from signing, the sender's own taught signs, reviewed by the sender", tagB.some((t) => /Interpreted from signing: the sender's own taught signs, reviewed by the sender/.test(t)), tagB.join(" | "));
    check("it is NOT labelled as typed, voice or a recognition model", !tagB.some((t) => /Voice|recognition model|OCR/.test(t)));
    await A.waitForFunction(() => /Delivered/.test(([...document.querySelectorAll("#liveChat .msg.me .msg-state")].pop() || {}).textContent || ""), null, { timeout: 10000 });
    check("Ravi's bubble reaches 'Delivered' (set only after Meera's device confirms)", /^Delivered$/.test(await A.$$eval("#liveChat .msg.me .msg-state", (n) => n[n.length - 1].textContent)));
    const tagA = await A.$$eval("#liveChat .msg.me .msg-tag.src", (n) => n.map((x) => x.textContent));
    check("Ravi's own bubble carries the same provenance label", tagA.some((t) => /Interpreted from signing/.test(t)), tagA.join(" | "));
    check("transcript was cleared after a successful send", (await val(A, "signText")) === "");
    // the server's copy carries provenance, not camera data
    const frames = await A.evaluate(() => window.__frames);
    const sent = frames.filter((f) => /"type":"message"/.test(f));
    check("the websocket message says source=sign and via=personal", sent.length === 1 && /"source":"sign"/.test(sent[0]) && /"via":"personal"/.test(sent[0]), sent[0]);
    check("no websocket frame contains landmarks, video, images or sign vectors", frames.every((f) => !/landmark|"video"|data:image|"frames"|base64/i.test(f)), String(frames.length) + " frames");
    check("every websocket frame is small (text only)", frames.every((f) => f.length < 1000), "largest " + Math.max.apply(null, frames.map((f) => f.length)));
    check("no HTTP request other than GET left Ravi's browser (no upload)", A.__requests.filter((r) => r.method !== "GET").every((r) => /\/api\/(sessions|session)/i.test(r.url)), A.__requests.filter((r) => r.method !== "GET").map((r) => r.method + " " + r.url).join(", "));
    // Meera replies by typing; Ravi receives it
    await B.fill("#overlayChat .chat-input", "I understand"); await B.press("#overlayChat .chat-input", "Enter");
    await A.waitForFunction(() => [...document.querySelectorAll("#liveChat .msg-t")].some((n) => /I understand/.test(n.textContent)), null, { timeout: 10000 });
    check("Meera's typed reply reaches Ravi", (await A.$$eval("#liveChat .msg.them .msg-t", (n) => n.map((x) => x.textContent))).includes("I understand"));
    // Closing the camera dialog does not break the chat
    await A.click("#signClose");
    check("closing the sign dialog released the camera and the chat is still connected", await allEnded(A) && (await A.evaluate(() => window.SangamChat.isConnected())));
    check("no page errors on either side", A.__errors.length === 0 && B.__errors.length === 0, A.__errors.concat(B.__errors).join("; "));
    await A.__ctx.close(); await B.__ctx.close();
  });

  await section("Accessibility of the dialog", async () => {
    const p = await newPage(browser, { bypassCSP: true });
    await openSign(p); await cameraOn(p);
    await p.fill("#signText", "hello");
    const axe = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
    await p.evaluate(axe);
    const res = await p.evaluate(() => axe.run(document.getElementById("signDlg"), { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }));
    check("axe: no violations in the open Sign Language Camera dialog", res.violations.length === 0, res.violations.map((v) => v.id + " x" + v.nodes.length + " " + v.nodes.map((n) => n.html.slice(0, 70)).join(" | ")).join("; "));
    const small = await p.$$eval("#signDlg button", (n) => n.filter((b) => b.offsetParent && b.getBoundingClientRect().height < 40).map((b) => b.textContent.trim() + ":" + Math.round(b.getBoundingClientRect().height)));
    check("every dialog button is at least 40 px tall", small.length === 0, small.join(", "));
    check("every status line is a live region", await p.$$eval("#signDlg .sign-status", (n) => n.every((x) => x.getAttribute("role") === "status")));
    check("the preview video has an accessible label", !!(await p.getAttribute("#signVideo", "aria-label")));
    await p.setViewportSize({ width: 320, height: 640 });
    check("no horizontal scrolling inside the dialog at 320 px wide", await p.evaluate(() => { const d = document.querySelector("#signDlg .sign-in"); return d.scrollWidth <= d.clientWidth + 1; }));
    await p.__ctx.close();
  });

  await browser.close();
  console.log("\n" + pass + " passed, " + fail + " failed");
  server.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
