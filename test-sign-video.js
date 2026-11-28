/*
 * Category C (recorded-video, real pipeline) MECHANICS test — see TEST_REPORT.md's test-category taxonomy.
 *
 * This feeds an actual decoded VIDEO FILE (not getUserMedia, not a fake-camera device, not synthetic landmark
 * tensors) through the REAL browser pipeline: real <video> decode -> real MediaPipe Holistic (WASM, the exact
 * same HolisticExtractor the production dialog uses, loading the exact same vendored pose_landmark_full.tflite
 * fixed in this phase) -> the REAL installed PretrainedAdapter(ISL).classify(), unmodified production code.
 *
 * WHAT THIS PROVES: the full mechanical chain (video file -> frame decode -> real Holistic inference -> real
 * landmark extraction -> real preprocessing -> real SL-GCN forward pass -> a label/"unknown" decision) runs
 * end-to-end without error, using the real artifacts a real webcam session would use. This is a genuinely new
 * check: previously the only video-shaped test was a live getUserMedia session against Chromium's fake CAMERA
 * DEVICE (test-sign-browser.js) — never a decoded video FILE run through requestVideoFrameCallback, which exercises
 * video decoding and frame timing quite differently (real codec decode timing instead of a live synthetic device).
 *
 * WHAT THIS DOES NOT PROVE: recognition accuracy. test-support/video/mechanics-clip.mp4 is an ffmpeg `testsrc2`
 * test pattern — explicitly NOT a human being, NOT a sign, and NOT sourced from INCLUDE or WLASL. It is used
 * BECAUSE no legally clear, reachable, correctly-labelled ISL/ASL reference video could be obtained in this
 * project's network environment (see docs/SIGN_LANGUAGE_MODEL_EVALUATION.md's "Search for a real, legally usable
 * labelled reference video" section for exactly what was tried and why each avenue was rejected or unreachable).
 * A real labelled clip, run through this same harness unmodified, would be a true Category C accuracy result;
 * this is not that. The only thing this test's content lets us check about correctness is a safety property: a
 * real model, given real Holistic output from unambiguously non-human video, must never fabricate a confident
 * word — "none"/"unknown" is the only honest answer, and "match" here would itself be a bug (the model
 * hallucinating a sign from nothing). This harness found exactly that bug once outright (a 2-frame degenerate
 * sequence produced a confident false "match" on pure noise) — see the MIN_CLASSIFY_FRAMES fix in
 * assets/sign-model.js and the matching unit test in test-sign-model.js, both added as a direct result.
 *
 * IMPORTANT, CONFIRMED BY RUNNING THIS MULTIPLE TIMES: even with that fix, this specific check still fails
 * intermittently (observed on roughly 1 in 2-3 runs) — MediaPipe Holistic occasionally produces spurious non-zero
 * "detections" on this test pattern across enough real frames to clear MIN_CLASSIFY_FRAMES, and the SL-GCN then
 * reports A specific word (observed on different runs: "weak", "Computer" - the exact word is not stable, which
 * itself supports "noise maps to whichever class the saturated network happens to favour" rather than any
 * meaningful signal) with p approx. 0.85-1.0 - high to near-total confidence, on pure noise. This
 * is NOT flaky-test noise to be dismissed or threshold-tuned away: it is the test correctly, repeatably surfacing a
 * genuine, structural property of a closed-set softmax classifier with no "none of the above"/rejection output - it
 * MUST commit to its single closest known class for ANY input that reaches it, confidently or not, however poor an
 * actual match that class is. See docs/SIGN_LANGUAGE_MODEL_EVALUATION.md for why this is reported as a found
 * limitation, not "fixed": there is no threshold adjustment that defends against a saturated p=1.0 result, and
 * tightening decide()'s acceptance thresholds in response would be exactly the "hide bad predictions via threshold
 * manipulation" the master specification explicitly prohibits, not a real fix. A FAIL on the last check below is an
 * expected, meaningful, intermittent result of running this file — not a bug in the test.
 *
 * A real, environment-specific finding from building this harness: in THIS headless Chromium sandbox,
 * requestAnimationFrame/requestVideoFrameCallback pacing runs far slower than real time (observed as low as ~1
 * tick per ~1.3s of video, against HolisticExtractor's own ~90ms requested interval) — tried with and without
 * Chromium's background-throttling flags disabled, and with the requestVideoFrameCallback path forced off in
 * favour of the requestAnimationFrame fallback, with no improvement either way. This looks like a property of
 * running a real display-less Chromium rather than anything about SANGAM's own code (both of HolisticExtractor's
 * two scheduling paths are equally affected). It is reported honestly rather than papered over: the clip is simply
 * made long (20s) so that even at this throttled rate, enough real frames accumulate for a meaningful classify()
 * call without changing any production scheduling code to get there. Whether real (non-headless, on-screen)
 * browser tabs or real low-end devices ever see anything resembling this throttling is NOT established by this
 * test and should not be assumed either way.
 *
 *   node test-sign-video.js
 */
"use strict";
process.env.PORT = process.env.SIGN_VIDEO_PORT || "8103";
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { server } = require("./server/server.js");

const ORIGIN = "http://localhost:" + process.env.PORT;
const CLIP_PATH = path.join(__dirname, "test-support/video/mechanics-clip.mp4");
const CLIP_URL = ORIGIN + "/test-support/video/mechanics-clip.mp4";

let pass = 0, fail = 0;
function check(name, ok, extra) { console.log((ok ? "PASS" : "FAIL") + " — " + name + (extra ? "  (" + extra + ")" : "")); ok ? pass++ : fail++; }

async function main() {
  if (!fs.existsSync(CLIP_PATH)) {
    check("mechanics-clip.mp4 exists (run: ffmpeg -f lavfi -i \"testsrc2=size=1280x720:rate=25:duration=20\" -pix_fmt yuv420p -movflags +faststart test-support/video/mechanics-clip.mp4)", false);
    console.log("\n" + pass + " passed, " + fail + " failed."); process.exit(1);
  }
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const requests = []; page.on("request", (r) => requests.push(r.url()));
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/test-support/video/mechanics-clip.mp4", (route) => route.fulfill({ path: CLIP_PATH, contentType: "video/mp4" }));

    await page.goto(ORIGIN + "/");
    await page.waitForFunction(() => !!(window.SangamSign && window.SangamSign.pretrained), null, { timeout: 15000 });
    await page.waitForFunction(() => window.SangamSign.pretrained.isl, null, { timeout: 15000 });
    check("the app's real sign-language module initialised and the real ISL model loaded (production code, not a stub)", true);

    const result = await page.evaluate(async (clipUrl) => {
      const video = document.createElement("video");
      video.src = clipUrl; video.muted = true; video.playsInline = true; video.crossOrigin = "anonymous";
      document.body.appendChild(video);
      await new Promise((res, rej) => {
        video.addEventListener("loadedmetadata", res, { once: true });
        video.addEventListener("error", () => rej(new Error("video failed to load: " + (video.error && video.error.message))), { once: true });
        setTimeout(() => rej(new Error("timed out waiting for loadedmetadata")), 10000);
      });
      await video.play();

      const extractor = window.SangamSign.extractorFactory(true); // true = needs Holistic (the pretrained-model path)
      await extractor.load();

      const frames = [];
      await new Promise((res) => {
        extractor.start(video, (pointData, t) => { frames.push({ points: pointData.points, t: t }); });
        video.addEventListener("ended", res, { once: true });
        // See the file header: headless pacing in this sandbox has been observed far slower than real time, so
        // this wait is longer than the 20s clip itself, to give the real (unmodified) production tick loop time
        // to accumulate enough frames even at that rate.
        setTimeout(res, 28000);
      });
      extractor.stop();
      try { extractor.dispose(); } catch (e) {}

      const isl = window.SangamSign.pretrained.isl;
      const classifyResult = frames.length >= 2 ? isl.classify(frames) : { state: "none", ranked: [] };
      const anyHandOrPoseDetected = frames.some((f) => f.points && Array.from(f.points).some((v) => v !== 0));
      return {
        frameCount: frames.length,
        videoDuration: video.duration,
        anyHandOrPoseDetected: anyHandOrPoseDetected,
        classifyState: classifyResult.state,
        classifyRanked: classifyResult.ranked
      };
    }, CLIP_URL);

    check("the real <video> element actually decoded the file (duration ~20s)", result.videoDuration > 18 && result.videoDuration < 22, "duration=" + result.videoDuration);
    check("the real MediaPipe Holistic WASM ran against decoded video frames and produced per-frame output", result.frameCount >= 8, "frameCount=" + result.frameCount);
    check("no page errors anywhere in the real decode->Holistic->SL-GCN chain", errors.length === 0, errors.join("; "));
    check("every asset the real pipeline needed was requested from this server (no silent fallback to a CDN/mock)", requests.some((u) => /holistic_solution/.test(u)) && requests.some((u) => /pose_landmark_full\.tflite/.test(u)));
    check("test-pattern video (not a human) correctly produces no detected hand/pose landmarks", !result.anyHandOrPoseDetected, "if this fails, Holistic hallucinated a body from a test pattern, which would itself be worth investigating");
    check("the real ISL model, given this input, never fabricates a confident word (safety property: refuses rather than guesses)",
      result.classifyState !== "match", "classifyState=" + result.classifyState + " ranked=" + JSON.stringify(result.classifyRanked));

    console.log("\nThis test is MECHANICS ONLY (see file header) — it does not and cannot measure recognition accuracy.");
    await ctx.close();
  } finally {
    await browser.close();
    server.close();
  }
  console.log("\n" + pass + " passed, " + fail + " failed.");
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
