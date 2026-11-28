/*
 * Runs every automated suite in order and prints a summary.
 *   npm run test:all
 * Browser suites need Playwright with Chromium installed (see README).
 */
"use strict";
const { spawn, spawnSync } = require("child_process");
const path = require("path");
const root = __dirname;

function startServer(port) {
  const p = spawn(process.execPath, [path.join(root, "server", "server.js")], { env: Object.assign({}, process.env, { PORT: String(port) }), stdio: "ignore" });
  return p;
}
function run(label, file, env) {
  const r = spawnSync(process.execPath, [path.join(root, file)], { env: Object.assign({}, process.env, env || {}), encoding: "utf8", timeout: 15 * 60 * 1000 });
  const out = (r.stdout || "") + (r.stderr || "");
  // TEST_LOG_DIR=<dir> keeps each suite's full output (every PASS/FAIL line) for the test report.
  if (process.env.TEST_LOG_DIR) { const fs = require("fs"); fs.mkdirSync(process.env.TEST_LOG_DIR, { recursive: true }); fs.writeFileSync(path.join(process.env.TEST_LOG_DIR, file.replace(/[\\/]/g, "_") + ".log"), out); }
  const m = out.match(/(\d+) passed, (\d+) failed/g);
  const last = m ? m[m.length - 1].match(/(\d+) passed, (\d+) failed/) : null;
  const p = last ? +last[1] : 0, f = last ? +last[2] : (r.status === 0 ? 0 : 1);
  const fails = out.split("\n").filter((l) => /^FAIL/.test(l));
  fails.forEach((l) => console.log("   " + l));
  return { label, pass: p, fail: f, status: r.status };
}

const s1 = startServer(8097), s2 = startServer(8099);
setTimeout(() => {
  const results = [
    run("Backend smoke (security, turns, volunteers)", "server/smoke-test.js"),
    run("Backend features (acks, emergency, signalling, translation adapter)", "server/test-features.js"),
    run("Backend reliability (trust-proxy rate-limit bypass, rate-limit key cap, crash-safety/graceful shutdown)", "server/test-reliability.js"),
    run("Accounts API (registration, roles, onboarding, connections, interpreter verification, privacy, persistence; real server, temp database)", "server/test-accounts.js"),
    run("End-to-end (original two-client flows)", "test-e2e.js", { BASE: "http://localhost:8097" }),
    run("Integration fixes (speech, recognition, OCR)", "test-integration-fixes.js", { BASE: "http://localhost:8099" }),
    run("Sign engine (synthetic hand skeletons)", "test-sign-engine.js"),
    run("Sign model (real SL-GCN weights vs. PyTorch fixtures; skips if not installed)", "test-sign-model.js"),
    run("Sign letters and digits (ASL fingerspelling A-Z and 0-9, synthetic hand skeletons)", "test-sign-letters.js"),
    run("Personal held poses (matcher, rejection, storage, deletion; synthetic hand skeletons, not evidence of real-hand accuracy)", "test-sign-static.js"),
    run("Sound engine (pure logic, synthetic tones/scores)", "test-sound-engine.js"),
    run("Browser (two participants, all new features)", "test-browser.js"),
    run("Access options in browser (Braille routing, receipts, haptics, deafblind options, data, scanning)", "test-access-browser.js"),
    run("Sign Language Camera in browser (fake camera, mock hands, 2 participants)", "test-sign-browser.js"),
    run("Sign Language Camera: real video file through the real pipeline (Category C mechanics, not accuracy — see file header)", "test-sign-video.js"),
    run("Sound alerts in browser (real YAMNet, synthetic audio)", "test-sound-browser.js"),
    run("Accessibility, keyboard, responsive", "test-a11y.js"),
  ];
  s1.kill(); s2.kill();
  let P = 0, F = 0;
  console.log("\n================ SUMMARY ================");
  results.forEach((r) => { P += r.pass; F += r.fail; console.log((r.fail ? "FAIL  " : "ok    ") + String(r.pass).padStart(4) + " passed " + String(r.fail).padStart(3) + " failed  " + r.label); });
  console.log("TOTAL " + P + " passed, " + F + " failed");
  process.exit(F ? 1 : 0);
}, 1500);
