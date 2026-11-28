/*
 * Targeted browser verification for the integration fixes ported from the
 * "this.zip" base build (speech synthesis robustness, speech recognition
 * locale fallback, OCR image preprocessing). The main test-e2e.js suite does
 * not touch the Access profile / Phrase board / Read-from-a-photo panels, so
 * this script specifically exercises the code paths that were edited during
 * the three-way integration, to confirm no regression was introduced.
 *
 *   PORT=8099 npm start &   &&   BASE=http://localhost:8099 node test-integration-fixes.js
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE = process.env.BASE || "http://localhost:8099";
let pass = 0, fail = 0;
const results = [];
function check(name, ok, extra) {
  results.push((ok ? "PASS" : "FAIL") + " — " + name + (extra ? "  (" + extra + ")" : ""));
  ok ? pass++ : fail++;
}

(async () => {
  const browser = await chromium.launch();
  const sandboxFontErr = /ERR_TUNNEL_CONNECTION_FAILED|fonts\.googleapis|fonts\.gstatic/;
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error" && !sandboxFontErr.test(m.text())) errors.push("console.error: " + m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

  try {
    /* ---- speak() robustness: voice caching, Chrome-resume fix, fallback chain ----
     * Stub installed via addInitScript so it exists BEFORE app.js runs at load time
     * (app.js reads window.speechSynthesis / SpeechRecognition once, at parse time). */
    await ctx.addInitScript(() => {
      window.__spoken = [];
      const fakeSynth = {
        paused: true, // simulate the stuck-paused state the Chrome fix targets
        speaking: false,
        // Empty on purpose: a fake (non-native) voice object fails Chromium's
        // strict `utterance.voice = v` type check, which would throw for a
        // reason that is an artifact of this stub, not of the app code. With
        // no voices available, app.js's `if (v) u.voice = v;` is correctly
        // skipped, matching how a browser with no installed voices behaves.
        getVoices: () => [],
        resume: function () { window.__resumed = true; this.paused = false; },
        cancel: function () { window.__cancelled = true; },
        speak: function (utter) {
          window.__spoken.push({ text: utter.text, lang: utter.lang, hasVoice: !!utter.voice, hasOnerror: typeof utter.onerror === "function", pausedWhenCalled: window.__pausedWhenSpeakCalled });
        },
        onvoiceschanged: null,
      };
      Object.defineProperty(window, "speechSynthesis", { value: fakeSynth, configurable: true });
      // Capture the `paused` flag's value at the instant speak() checks it.
      const origResume = fakeSynth.resume.bind(fakeSynth);
      fakeSynth.resume = function () { window.__pausedWhenSpeakCalled = fakeSynth.paused; origResume(); };

      function FakeSR() { this.continuous = false; this.interimResults = false; window.__lastRec = this; }
      FakeSR.prototype.start = function () { if (this.onstart) this.onstart(); };
      FakeSR.prototype.stop = function () { if (this.onend) this.onend(); };
      window.SpeechRecognition = window.webkitSpeechRecognition = FakeSR;
    });

    await page.goto(BASE + "/#/dashboard/phrases", { waitUntil: "networkidle" });
    await page.waitForSelector("#cats button", { timeout: 8000 });
    await page.click('.tile[data-i="0"]');
    await page.waitForFunction(() => window.__spoken && window.__spoken.length > 0, { timeout: 4000 }).catch(() => {});
    const spokenState = await page.evaluate(() => ({ spoken: window.__spoken, resumed: window.__resumed, cancelled: window.__cancelled }));
    check("Tapping a phrase tile invokes speak() with text", spokenState.spoken && spokenState.spoken.length > 0 && spokenState.spoken[0].text.length > 0, JSON.stringify(spokenState.spoken[0] || {}));
    check("speak() resumes a paused synth engine before speaking (Chrome fix)", spokenState.resumed === true);
    check("speak() cancels any prior utterance before queueing the new one", spokenState.cancelled === true);
    check("speak() attaches an onerror handler to the utterance", !!(spokenState.spoken[0] && spokenState.spoken[0].hasOnerror));
    check("speak() does not throw when no matching voice is installed", errors.filter((e) => /SpeechSynthesisVoice/.test(e)).length === 0);

    /* ---- speech recognition: en-IN -> en-US fallback (profile defaults to en-IN) ---- */
    await page.goto(BASE + "/#/dashboard/relay", { waitUntil: "networkidle" });
    await page.waitForSelector("#mic", { timeout: 8000 });
    await page.click("#mic");
    await page.waitForFunction(() => !!window.__lastRec, { timeout: 4000 }).catch(() => {});
    const recLang = await page.evaluate(() => (window.__lastRec || {}).lang);
    check("Speech recognition locale falls back from en-IN to en-US (profile default is en-IN)", recLang === "en-US", "got " + recLang);

    /* ---- OCR preprocessing: a generated text image still produces output ---- */
    await page.goto(BASE + "/#/dashboard/scan", { waitUntil: "networkidle" });
    await page.waitForSelector("#file", { timeout: 8000 });

    // Build a simple high-contrast test image with text using the BROWSER's own
    // canvas (no extra npm package needed) and save it to disk via Node.
    const testImgPath = path.join(require("os").tmpdir(), "sangam-ocr-test.png");
    let haveImage = false;
    try {
      const dataUrl = await page.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = 600; c.height = 200;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 600, 200);
        ctx.fillStyle = "#000"; ctx.font = "bold 48px sans-serif";
        ctx.fillText("TEST LABEL", 40, 110);
        return c.toDataURL("image/png");
      });
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
      fs.writeFileSync(testImgPath, Buffer.from(base64, "base64"));
      haveImage = fs.existsSync(testImgPath);
    } catch (e) { haveImage = false; }

    if (haveImage) {
      await page.setInputFiles("#file", testImgPath);
      await page.waitForSelector("#run:not([disabled])", { timeout: 5000 });
      await page.click("#run");
      await page.waitForFunction(() => {
        const el = document.querySelector("#progL");
        return el && (el.textContent === "Done");
      }, { timeout: 60000 }).catch(() => {});
      const scanText = await page.inputValue("#scanText");
      const progLabel = await page.textContent("#progL");
      check("OCR run completes (progress reaches 'Done')", progLabel === "Done", "progL=" + progLabel);
      check("OCR extracts recognizable text from the generated test image", /TEST|LABEL/i.test(scanText), "got: " + JSON.stringify(scanText));
    } else {
      check("OCR test image generation", false, "UNVERIFIED — could not generate a test image in this sandbox; prepImageForOcr() was code-reviewed but not exercised end-to-end here");
    }
  } catch (e) {
    check("Integration-fix test run completed without exception", false, e.message);
  }

  check("No uncaught page errors during integration-fix checks", errors.length === 0, errors.slice(0, 6).join(" | "));

  console.log("\n===== INTEGRATION-FIX RESULTS =====");
  results.forEach((r) => console.log(r));
  console.log(`\n${pass} passed, ${fail} failed`);

  await browser.close();
  process.exit(fail ? 1 : 0);
})();
