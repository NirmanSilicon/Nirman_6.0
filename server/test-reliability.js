/*
 * Reliability/hardening regression tests for the backend audit pass.
 *
 * Covers three fixes made in this pass, none of which the existing
 * smoke-test.js / test-features.js suites exercised:
 *
 *   1. `app.set("trust proxy", true)` was unconditional, so ANY direct client
 *      could defeat every IP-based rate limit (session creation, volunteer/
 *      request creation, /api/translate) just by sending a fresh, self-chosen
 *      X-Forwarded-For header per request. Fixed: trust proxy now defaults to
 *      false and is only honoured when the operator sets TRUST_PROXY.
 *   2. The rate-limit map's key space (distinct IPs/identifiers tracked) was
 *      unbounded between cleanup sweeps. Fixed: IP_HITS_MAX_KEYS caps it.
 *   3. No crash-safety or graceful-shutdown handling existed at all: one
 *      uncaught exception anywhere, or a SIGTERM/SIGINT (deploy, process
 *      manager, Ctrl-C), silently killed every concurrent session with no
 *      warning to connected clients. Fixed: the server now closes every open
 *      WebSocket with a clean, informative close frame before exiting.
 *
 * Each of these needs its own fresh process (trust-proxy mode is read once
 * at module load from an env var; the shutdown test needs to actually kill
 * the process without taking the test runner down with it), so unlike the
 * other server/*.js suites, this one drives server.js as a CHILD PROCESS
 * rather than requiring it in-process.
 */
"use strict";
const { spawn } = require("child_process");
const path = require("path");
const WebSocket = require("ws");

let pass = 0, fail = 0;
function check(name, ok, extra) { console.log((ok ? "PASS" : "FAIL") + " — " + name + (extra ? "  (" + extra + ")" : "")); ok ? pass++ : fail++; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function startServer(port, extraEnv) {
  const child = spawn(process.execPath, [path.join(__dirname, "server.js")], {
    cwd: __dirname,
    env: Object.assign({}, process.env, { PORT: String(port), SESSION_TTL_MINUTES: "60" }, extraEnv || {}),
    stdio: ["ignore", "pipe", "pipe"],
  });
  child._out = "";
  child.stdout.on("data", (d) => { child._out += d.toString(); });
  child.stderr.on("data", (d) => { child._out += d.toString(); });
  return child;
}

function waitForListening(child, base, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return (async function poll() {
    while (Date.now() < deadline) {
      try {
        const r = await fetch(base + "/api/health");
        if (r.ok) return true;
      } catch (e) { /* not up yet */ }
      await sleep(50);
    }
    throw new Error("server did not start in time:\n" + child._out);
  })();
}

async function j(base, path_, opts) {
  const r = await fetch(base + path_, opts);
  let b = {}; try { b = await r.json(); } catch (e) {}
  return { status: r.status, body: b };
}

function waitForExit(child, timeoutMs) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("process did not exit in time")), timeoutMs);
    child.once("exit", (code, signal) => { clearTimeout(t); resolve({ code, signal }); });
  });
}

(async () => {
  // ---- 1a. Default: trust proxy is OFF, spoofed X-Forwarded-For is ignored ----
  {
    const port = 8110;
    const base = "http://localhost:" + port;
    const child = startServer(port, {}); // no TRUST_PROXY set
    try {
      await waitForListening(child, base, 5000);
      const results = [];
      for (let i = 0; i < 21; i++) {
        results.push(await j(base, "/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.0.0." + i },
          body: JSON.stringify({ name: "t" }),
        }));
      }
      const rateLimited = results.filter((r) => r.status === 429).length;
      check("trust proxy OFF by default: 21 requests with 21 different spoofed X-Forwarded-For values still share one rate-limit bucket (real socket IP)", rateLimited >= 1, rateLimited + " of 21 got 429");
    } finally {
      child.kill("SIGKILL");
    }
  }

  // ---- 1b. TRUST_PROXY=1: a real reverse-proxy header is honoured, so distinct clients get distinct buckets ----
  {
    const port = 8111;
    const base = "http://localhost:" + port;
    const child = startServer(port, { TRUST_PROXY: "1" });
    try {
      await waitForListening(child, base, 5000);
      const results = [];
      for (let i = 0; i < 21; i++) {
        results.push(await j(base, "/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.1.0." + i },
          body: JSON.stringify({ name: "t" }),
        }));
      }
      const rateLimited = results.filter((r) => r.status === 429).length;
      check("TRUST_PROXY=1: 21 requests with 21 different X-Forwarded-For values are NOT rate-limited against each other", rateLimited === 0, rateLimited + " of 21 got 429");
    } finally {
      child.kill("SIGKILL");
    }
  }

  // ---- 2. ipHits key cap bounds memory regardless of how many distinct identifiers are seen ----
  {
    const port = 8112;
    const base = "http://localhost:" + port;
    const child = startServer(port, { TRUST_PROXY: "1", IP_HITS_MAX_KEYS: "5" });
    try {
      await waitForListening(child, base, 5000);
      for (let i = 0; i < 20; i++) {
        await j(base, "/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.2.0." + i },
          body: JSON.stringify({ name: "t" }),
        });
      }
      const health = await j(base, "/api/health");
      check("rate-limit key map stays capped (IP_HITS_MAX_KEYS=5) after 20 distinct identifiers", health.body.rateLimitKeys <= 5, "rateLimitKeys=" + health.body.rateLimitKeys);
    } finally {
      child.kill("SIGKILL");
    }
  }

  // ---- 3. Graceful shutdown: SIGTERM closes open sockets cleanly and the process exits ----
  {
    const port = 8113;
    const base = "http://localhost:" + port;
    const child = startServer(port, {});
    try {
      await waitForListening(child, base, 5000);
      const created = await j(base, "/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "t" }) });
      const ws = new WebSocket("ws://localhost:" + port + "/ws?session=" + created.body.id + "&token=" + created.body.token);
      const closeInfo = await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("ws did not open/close in time")), 4000);
        ws.on("open", () => { child.kill("SIGTERM"); });
        ws.on("close", (code, reason) => { clearTimeout(t); resolve({ code, reason: reason ? reason.toString() : "" }); });
        ws.on("error", () => {});
      });
      check("SIGTERM sends a clean, informative WebSocket close (not a silent drop)", closeInfo.code === 1012 && /restart/i.test(closeInfo.reason), "code=" + closeInfo.code + " reason=" + JSON.stringify(closeInfo.reason));
      const exitInfo = await waitForExit(child, 4000);
      check("process actually exits after SIGTERM instead of hanging", exitInfo.code === 0 && exitInfo.signal === null, "code=" + exitInfo.code + " signal=" + exitInfo.signal);
    } finally {
      try { child.kill("SIGKILL"); } catch (e) {}
    }
  }

  // ---- 3b. An uncaught exception also triggers the same clean shutdown path (not a silent, trace-free death) ----
  {
    const port = 8114;
    const base = "http://localhost:" + port;
    // SANGAM_TEST_CRASH_AFTER_MS makes the server throw from a timer, simulating
    // a genuine bug surfacing asynchronously (the realistic case this guards
    // against) without needing to find a real crash bug to trigger it.
    const child = startServer(port, { SANGAM_TEST_CRASH_AFTER_MS: "300" });
    try {
      await waitForListening(child, base, 5000);
      const exitInfo = await waitForExit(child, 4000);
      check("an uncaught exception logs a trace and exits (code 1), rather than crashing silently/hanging", exitInfo.code === 1 && /Uncaught exception/.test(child._out), "code=" + exitInfo.code + " logged=" + /Uncaught exception/.test(child._out));
    } finally {
      try { child.kill("SIGKILL"); } catch (e) {}
    }
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
