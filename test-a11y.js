/*
 * Accessibility, keyboard, responsive and reduced-motion checks (real browser).
 *   - axe-core scan of every dashboard panel, the menu, the dialogs and a live chat,
 *     in normal and high-contrast mode (serious/critical violations fail the test)
 *   - skip link, responsive-menu ARIA, dialog focus return, Escape handling
 *   - 44 x 44 px touch-target audit
 *   - horizontal-overflow check at 320 / 360 / 390 / 768 / 1024 / 1440 / 1920 px,
 *     portrait and landscape, and at an effective 200% zoom
 *   - reduced-motion behaviour
 * What this CANNOT replace: testing with real screen readers, switches and people.
 *
 *   npm run test:a11y
 */
"use strict";
process.env.PORT = process.env.A11Y_PORT || "8092";
const fs = require("fs");
const path = require("path");
const { chromium, devices } = require("playwright");
const { server } = require("./server/server.js");
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const BASE = "http://localhost:" + process.env.PORT;
let pass = 0, fail = 0;
function check(name, ok, extra) { console.log((ok ? "PASS" : "FAIL") + " — " + name + (extra ? "  (" + extra + ")" : "")); ok ? pass++ : fail++; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function section(name, fn) { console.log("\n## " + name); try { await fn(); } catch (e) { check(name + " ran without exception", false, String(e && e.message || e).split("\n")[0]); } }

async function axeScan(page, label, hc) {
  await page.evaluate(AXE);
  const res = await page.evaluate(async () => {
    const r = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, n: v.nodes.length, sample: v.nodes.slice(0, 2).map((x) => x.target.join(" ")) }));
  });
  // Colour contrast under forced high contrast is checked by the ratio test instead; axe cannot see through !important black/white reliably.
  const bad = res.filter((v) => (v.impact === "serious" || v.impact === "critical"));
  check("axe: no serious/critical violations — " + label + (hc ? " (high contrast)" : ""), bad.length === 0, bad.map((v) => v.id + "×" + v.n + " " + v.sample.join(" | ")).join("; "));
  const minor = res.filter((v) => v.impact !== "serious" && v.impact !== "critical");
  if (minor.length) console.log("   note (moderate/minor, not failing): " + minor.map((v) => v.id + "×" + v.n).join(", "));
  return res;
}

const PANELS = ["overview", "profile", "relay", "scan", "phrases", "messages", "connect", "learn", "assist", "next"];

(async () => {
  await sleep(200);
  const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  // Reduced motion keeps entrance animations from being caught mid-fade by the contrast checker.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });

  await section("axe-core: landing page and every dashboard panel", async () => {
    await page.goto(BASE + "/#/", { waitUntil: "load" });
    await axeScan(page, "landing page");
    for (const p of PANELS) {
      await page.goto(BASE + "/#/dashboard" + (p === "overview" ? "" : "/" + p), { waitUntil: "load" });
      await page.waitForSelector('.panel[data-p="' + p + '"]:not([hidden])');
      await axeScan(page, "panel " + p);
    }
    await page.goto(BASE + "/#/dashboard/profile", { waitUntil: "load" });
    await page.click("#dashBtn");
    await axeScan(page, "dashboard menu open");
    await page.keyboard.press("Escape");
  });

  await section("axe-core: dialogs and a live chat", async () => {
    await page.goto(BASE + "/#/dashboard/phrases", { waitUntil: "load" });
    await page.click("#pEmg");
    await axeScan(page, "emergency dialog");
    await page.click("#emgShow");
    await axeScan(page, "show-to-a-person dialog");
    await page.click("#emgShowClose"); await page.click("#emgClose");
    // live chat on the host side
    await page.goto(BASE + "/#/dashboard/connect", { waitUntil: "load" });
    await page.fill("#hostName", "Axe"); await page.click("#createBtn");
    await page.waitForSelector("#liveChat .chat");
    await axeScan(page, "host chat");
    const joinUrl = await page.inputValue("#connectLive .share-url");
    const c2 = await browser.newContext(Object.assign({}, devices["iPhone 12"]));
    const g = await c2.newPage();
    await g.goto(joinUrl, { waitUntil: "load" });
    await g.waitForSelector("#joinDisplay");
    await axeScan(g, "join form");
    await g.fill("#joinDisplay", "Guest"); await g.click("#joinGo"); await g.waitForSelector("#overlayChat .chat");
    await axeScan(g, "guest chat (mobile)");
    await page.fill("#liveChat .chat-input", "hello"); await page.press("#liveChat .chat-input", "Enter");
    await page.click("#liveChat .chat-emg");
    await page.fill("#emgText", "Test alert"); await page.click("#emgSend");
    await g.waitForSelector("#emgIn[open]");
    await axeScan(g, "incoming emergency alert");
    await g.click("#emgInClose");
    await page.click("#emgClose");
    await c2.close();
  });

  await section("axe-core: high-contrast mode", async () => {
    const hc = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
    await hc.addInitScript("localStorage.setItem('sangam.v2', JSON.stringify({hc:true,inm:['voice','camera','text'],outm:['captions','audio','braille']}))");
    const h = await hc.newPage();
    for (const p of ["profile", "phrases", "next"]) { await h.goto(BASE + "/#/dashboard/" + p, { waitUntil: "load" }); await axeScan(h, "panel " + p, true); }
    await hc.close();
  });

  await section("Landmarks, skip link, responsive menu, focus", async () => {
    const fresh = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await fresh.newPage();
    await page.goto(BASE + "/#/", { waitUntil: "load" });
    await page.keyboard.press("Tab");
    check("the first Tab stop is the skip link", await page.evaluate(() => document.activeElement.className === "skip"));
    await page.keyboard.press("Enter");
    check("activating it moves focus into the main content", await page.evaluate(() => document.activeElement.id === "main" || !!document.activeElement.closest("main")));
    check("there is exactly one main landmark, one h1 on the landing page", (await page.$$("main")).length === 1 && (await page.$$eval("h1", (n) => n.filter((h) => h.getClientRects().length).length)) === 1);
    check("duplicate ids: none", (await page.evaluate(() => { const ids = [...document.querySelectorAll("[id]")].map((e) => e.id); return ids.length === new Set(ids).size; })));
    const m = await browser.newContext(Object.assign({}, devices["iPhone 12"]));
    const mp = await m.newPage();
    await mp.goto(BASE + "/#/", { waitUntil: "load" });
    check("hamburger exposes aria-expanded and aria-controls pointing at the nav", (await mp.getAttribute("#burger", "aria-controls")) === "nav" && (await mp.getAttribute("#burger", "aria-expanded")) === "false");
    await mp.click("#burger");
    check("opening it updates aria-expanded", (await mp.getAttribute("#burger", "aria-expanded")) === "true");
    await mp.keyboard.press("Escape");
    check("Escape closes it and returns focus to the button", (await mp.getAttribute("#burger", "aria-expanded")) === "false" && (await mp.evaluate(() => document.activeElement.id)) === "burger");
    await mp.click("#burger");
    await mp.click("#dashBtn");
    check("the dashboard menu button exposes aria-expanded and aria-controls", (await mp.getAttribute("#dashBtn", "aria-controls")) === "dashMenu" && (await mp.getAttribute("#dashBtn", "aria-expanded")) === "true");
    await mp.keyboard.press("Escape");
    check("Escape closes the menu and returns focus", (await mp.getAttribute("#dashBtn", "aria-expanded")) === "false" && (await mp.evaluate(() => document.activeElement.id)) === "dashBtn");
    await m.close();
    // dialog focus management
    await page.goto(BASE + "/#/dashboard/phrases", { waitUntil: "load" });
    await page.focus("#pEmg"); await page.keyboard.press("Enter");
    check("emergency dialog is modal: Tab stays inside it", await (async () => { for (let i = 0; i < 12; i++) { await page.keyboard.press("Tab"); if (!(await page.evaluate(() => document.activeElement === document.body || !!document.activeElement.closest("#emgDlg")))) return false; } return true; })());
    await page.keyboard.press("Escape");
    check("Escape closes the dialog and focus returns to the Emergency button", (await page.evaluate(() => document.activeElement.id)) === "pEmg" && !(await page.isVisible("#emgDlg")));
    // join overlay is a dialog with a label and focus
    const j = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const jp = await j.newPage();
    await page.goto(BASE + "/#/dashboard/connect", { waitUntil: "load" });
    await page.fill("#hostName", "Focus"); await page.click("#createBtn"); await page.waitForSelector("#connectLive .share-url");
    const url = await page.inputValue("#connectLive .share-url");
    await jp.goto(url, { waitUntil: "load" }); await jp.waitForSelector("#joinDisplay");
    await fresh.close();
    check("the join screen is a labelled modal dialog and puts focus in the name field", (await jp.getAttribute("#joinOverlay", "role")) === "dialog" && (await jp.getAttribute("#joinOverlay", "aria-modal")) === "true" && await jp.evaluate(() => document.activeElement.id === "joinDisplay"));
    await j.close();
  });

  await section("Keyboard-only: every control reachable and visibly focused", async () => {
    for (const p of ["profile", "relay", "phrases", "messages", "scan"]) {
      await page.goto(BASE + "/#/dashboard/" + p, { waitUntil: "load" });
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      const seen = new Set(); let noRing = 0, trapped = false;
      for (let i = 0; i < 90; i++) {
        await page.keyboard.press("Tab");
        const info = await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return { key: e.tagName + "#" + e.id + "." + e.className, ring: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2 || cs.boxShadow !== "none", vis: r.width > 0 && r.height > 0, panel: !!e.closest(".panel[hidden]") }; });
        if (!info) continue;
        if (info.panel) trapped = true;
        if (info.vis && !info.ring) noRing++;
        seen.add(info.key);
      }
      check("panel " + p + ": focus never lands on hidden controls", !trapped);
      check("panel " + p + ": focused controls show a visible focus indicator", noRing === 0, noRing + " without");
      check("panel " + p + ": at least 10 distinct controls are reachable by Tab", seen.size >= 10, String(seen.size));
    }
  });

  await section("Touch targets (44 × 44 px) at 390 px wide", async () => {
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const mp = await m.newPage();
    const routes = ["#/", "#/dashboard", "#/dashboard/profile", "#/dashboard/relay", "#/dashboard/scan", "#/dashboard/phrases", "#/dashboard/messages", "#/dashboard/connect", "#/dashboard/learn", "#/dashboard/assist", "#/dashboard/next"];
    for (const r of routes) {
      await mp.goto(BASE + "/" + r, { waitUntil: "load" });
      await sleep(150);
      const small = await mp.evaluate(() => {
        const out = [];
        document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, summary").forEach((e) => {
          if (e.closest("[hidden]") || e.disabled) return;
          const cs = getComputedStyle(e); if (cs.visibility === "hidden" || cs.display === "none") return;
          if (e.classList.contains("vis-hidden") || e.classList.contains("skip")) return;
          if (e.type === "checkbox" || e.type === "radio") { const l = e.closest("label"); if (l) e = l; }
          if (e.tagName === "A" && e.parentElement && /^(P|LI|SMALL|SPAN)$/.test(e.parentElement.tagName) && !e.classList.contains("chip-btn") && !e.classList.contains("btn")) return; // inline text links are exempt (WCAG 2.5.8)
          const rc = e.getBoundingClientRect(); if (rc.width === 0 || rc.height === 0) return;
          if (rc.width < 44 || rc.height < 44) out.push((e.id || e.className || e.tagName) + " " + Math.round(rc.width) + "x" + Math.round(rc.height));
        });
        return out;
      });
      check("touch targets ≥ 44 px on " + r, small.length === 0, small.slice(0, 6).join("; "));
    }
    await m.close();
  });

  await section("Responsive: no horizontal scrolling", async () => {
    const sizes = [[320, 640], [360, 740], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080], [844, 390], [1024, 600]];
    for (const [w, h] of sizes) {
      const c = await browser.newContext({ viewport: { width: w, height: h } });
      const p = await c.newPage();
      const bad = [];
      for (const r of ["#/", "#/dashboard", "#/dashboard/profile", "#/dashboard/relay", "#/dashboard/scan", "#/dashboard/phrases", "#/dashboard/messages", "#/dashboard/connect", "#/dashboard/learn", "#/dashboard/assist", "#/dashboard/next"]) {
        await p.goto(BASE + "/" + r, { waitUntil: "load" }); await sleep(120);
        const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (over > 1) bad.push(r + " +" + over + "px");
      }
      check("no horizontal overflow at " + w + "×" + h, bad.length === 0, bad.join("; "));
      await c.close();
    }
    // 200% zoom of a 1280 px desktop is a 640 px layout; 160% text scale on top of it.
    const z = await browser.newContext({ viewport: { width: 640, height: 450 } });
    const zp = await z.newPage();
    await zp.addInitScript("localStorage.setItem('sangam.v2', JSON.stringify({scale:160,inm:['voice','camera','text'],outm:['captions']}))");
    const bad = [];
    for (const r of ["#/", "#/dashboard/profile", "#/dashboard/phrases", "#/dashboard/connect"]) { await zp.goto(BASE + "/" + r, { waitUntil: "load" }); await sleep(120); const o = await zp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (o > 1) bad.push(r + " +" + o); }
    check("200% zoom plus 160% text scale reflows without horizontal scrolling", bad.length === 0, bad.join("; "));
    await z.close();
  });

  await section("Reduced motion", async () => {
    const rm = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
    const p = await rm.newPage();
    await p.goto(BASE + "/#/", { waitUntil: "load" });
    check("the demo board starts paused when the device asks for reduced motion", (await p.getAttribute("#boardPause", "aria-pressed")) === "true");
    const before = await p.textContent("#boardFoot"); await sleep(4500);
    check("and does not rotate by itself", before === (await p.textContent("#boardFoot")));
    const anim = await p.evaluate(() => [...document.querySelectorAll("*")].filter((e) => { const cs = getComputedStyle(e); return cs.animationName !== "none" && parseFloat(cs.animationDuration) > 0; }).length);
    check("no CSS animation is running", anim === 0, String(anim));
    await rm.close();
    const nm = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const q = await nm.newPage();
    await q.goto(BASE + "/#/", { waitUntil: "load" });
    check("otherwise the demo can be paused with a button", (await q.getAttribute("#boardPause", "aria-pressed")) === "false");
    await q.click("#boardPause");
    const b2 = await q.textContent("#boardFoot"); await sleep(4500);
    check("pausing stops the rotation", b2 === (await q.textContent("#boardFoot")) && (await q.textContent("#boardPause")) === "Play demo");
    await nm.close();
  });

  check("no console or page errors during the accessibility run", errors.length === 0, errors.slice(0, 3).join(" | "));
  await browser.close();
  console.log("\n===== ACCESSIBILITY / RESPONSIVE RESULTS =====\n" + pass + " passed, " + fail + " failed");
  server.close();
  setTimeout(() => process.exit(fail ? 1 : 0), 300);
})().catch((e) => { console.error(e); process.exit(1); });
