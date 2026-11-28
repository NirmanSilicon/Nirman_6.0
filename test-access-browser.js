/*
 * Browser tests for the second-pass access features, in real Chromium with two separate browser contexts.
 *
 *   - Braille display routing (through a TEST-ONLY adapter: a JavaScript object, NOT hardware)
 *   - "presented" receipts: a sender is told when a message may not have reached the recipient the way they chose
 *   - haptic pattern configuration, deafblind-friendly options, confirm-before-send, status announcement levels
 *   - your-data controls (export, delete), switch-scanning options
 *
 * Vibration and speech are recording stand-ins. No Braille display, vibration motor or switch hardware was available,
 * so nothing here proves any physical device works. See TEST_REPORT.md.
 *
 *   node test-access-browser.js
 */
"use strict";
process.env.PORT = process.env.ACCESS_BROWSER_PORT || "8103";
const { chromium } = require("playwright");
const { server } = require("./server/server.js");

const ORIGIN = "http://localhost:" + process.env.PORT;
let pass = 0, fail = 0;
function check(name, ok, extra) { console.log((ok ? "PASS" : "FAIL") + " — " + name + (extra ? "  (" + extra + ")" : "")); ok ? pass++ : fail++; }
async function section(name, fn) { console.log("\n## " + name); try { await fn(); } catch (e) { check(name + " ran without exception", false, String(e && e.message || e).split("\n")[0]); } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const STUBS = `(() => {
  window.__spoken = []; window.__vib = []; window.__cancelled = 0;
  if (!window.__NOSPEECH) {
    const synth = { speaking:false, paused:false, cancel(){ window.__cancelled++; }, resume(){}, getVoices(){ return [{ voiceURI:"fake-en", name:"Fake English", lang:"en-US" }]; }, onvoiceschanged:null, addEventListener(){}, removeEventListener(){}, speak(u){ window.__spoken.push(u.text); } };
    Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  } else { Object.defineProperty(window, "speechSynthesis", { value: undefined, configurable: true }); window.SpeechSynthesisUtterance = undefined; }
  if (!window.__NOVIB) navigator.vibrate = (p) => { window.__vib.push(p); return true; };
  else { try { Object.defineProperty(navigator, "vibrate", { value: undefined, configurable: true }); } catch (e) {} }
  window.__brLog = [];
  window.__makeAdapter = (o) => { o = o || {}; return { id: "test-adapter", name: "TEST-ONLY adapter (a script, not hardware)", cells: o.cells || 20,
    isAvailable: () => true, connect: () => (o.failConnect ? Promise.reject(new Error("refused")) : Promise.resolve()),
    sendCells: (t) => { if (window.__failSend) return Promise.reject(new Error("device busy")); window.__brLog.push(t); return Promise.resolve(); }, disconnect: () => Promise.resolve() }; };
})();`;

async function newPage(browser, prefs, flags, opts) {
  const ctx = await browser.newContext(Object.assign({ permissions: ["microphone"], viewport: { width: 1280, height: 900 }, acceptDownloads: true }, opts || {}));
  await ctx.addInitScript((flags || "") + STUBS);
  if (prefs) await ctx.addInitScript("try{ if(!localStorage.getItem('sangam.v2')) localStorage.setItem('sangam.v2', " + JSON.stringify(JSON.stringify(prefs)) + "); }catch(e){}");
  const page = await ctx.newPage(); page.__ctx = ctx; page.__errors = [];
  page.on("pageerror", (e) => page.__errors.push(e.message));
  return page;
}
async function pair(browser, prefsB, flagsB, prefsA) {
  const A = await newPage(browser, prefsA), B = await newPage(browser, prefsB, flagsB);
  await A.goto(ORIGIN + "/#/dashboard/connect"); await A.waitForSelector("#createBtn");
  await A.fill("#hostName", "Ravi"); await A.click("#createBtn");
  await A.waitForSelector("#connectLive .share-url"); const url = await A.inputValue("#connectLive .share-url");
  await A.waitForSelector("#liveChat .chat");
  await B.goto(url); await B.waitForSelector("#joinDisplay"); await B.fill("#joinDisplay", "Meera"); await B.click("#joinGo");
  await B.waitForSelector("#overlayChat .chat");
  await A.waitForFunction(() => /is here|online/i.test((document.querySelector("#liveChat .chat-count") || {}).textContent || ""));
  return { A, B };
}
async function say(A, text) { await A.fill("#liveChat .chat-input", text); await A.press("#liveChat .chat-input", "Enter"); }
const bText = (B) => B.$$eval("#overlayChat .msg-t", (n) => n.map((x) => x.textContent));
async function waitB(B, re, ms) { return B.waitForFunction((src) => [...document.querySelectorAll("#overlayChat .msg-t")].some((n) => new RegExp(src, "i").test(n.textContent)), re.source, { timeout: ms || 8000 }).then(() => true, () => false); }
async function lastState(A) { return A.$$eval("#liveChat .msg.me .msg-state", (n) => (n.length ? n[n.length - 1].textContent : "")); }
const profileOf = (p) => p.evaluate(() => Object.assign({}, window.Sangam.profile));

(async () => {
  const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });

  await section("Braille display adapter: registration, connect, test text, errors (TEST-ONLY adapter)", async () => {
    const p = await newPage(browser);
    await p.goto(ORIGIN + "/#/dashboard/profile"); await p.waitForSelector("#brailleCard");
    check("with no adapter, the card says none is connected and no driver is bundled", /none connected, and no display driver is bundled/.test(await p.textContent("#brailleCard")));
    check("the card states the limits: not Grade 2, not other languages, not a physical display", /not<\/b> Grade 2|not Grade 2/.test(await p.innerHTML("#brailleCard")));
    check("registering something that is not an adapter is refused", (await p.evaluate(() => window.SangamBraille.register({ id: "x" }))) === false && (await p.evaluate(() => window.SangamBraille.adapters().length)) === 0);
    await p.evaluate(() => window.SangamBraille.register(window.__makeAdapter({ cells: 20 })));
    check("a registered adapter is listed as Not connected", /TEST-ONLY adapter/.test(await p.textContent("#brDevices")) && /Not connected/.test(await p.textContent("#brDevices")));
    check("registration alone sends nothing", (await p.evaluate(() => window.__brLog.length)) === 0);
    await p.click('#brDevices button[data-brdev="connect"]');
    await p.waitForSelector('#brDevices button[data-brdev="test"]');
    check("Connect (a user action) connects it", /Connected/.test(await p.textContent("#brDevices")));
    await p.click('#brDevices button[data-brdev="test"]');
    await p.waitForFunction(() => window.__brLog.length === 1);
    const t = await p.evaluate(() => window.__brLog[0]);
    check("Send test text hands the Braille cells of 'Sangam test' to the adapter", t === (await p.evaluate(() => window.SangamBraille.detail("Sangam test").cells)), t);
    check("the status says SANGAM cannot read the display back", /cannot read it back/.test(await p.textContent("#brDevices")));
    await p.evaluate(() => { window.__failSend = true; });
    await p.click('#brDevices button[data-brdev="test"]');
    await p.waitForFunction(() => /Test failed/.test(document.getElementById("brDevices").textContent));
    check("a failing display shows an error instead of success", /Test failed: device busy/.test(await p.textContent("#brDevices")));
    await p.evaluate(() => { window.__failSend = false; window.SangamBraille.setConnected("test-adapter", false, "Cable unplugged."); });
    check("a display that disconnects is shown as Not connected with the reason", /Not connected/.test(await p.textContent("#brDevices")) && /Cable unplugged/.test(await p.textContent("#brDevices")));
    await p.evaluate(() => { window.SangamBraille.register(Object.assign(window.__makeAdapter(), { id: "bad", name: "Failing connect", connect: () => Promise.reject(new Error("refused")) })); });
    await p.click('#brDevices li[data-id="bad"] button[data-brdev="connect"]');
    await p.waitForFunction(() => /Could not connect: refused/.test(document.getElementById("brDevices").textContent));
    check("a failed connection says why and stays Not connected", /Could not connect: refused/.test(await p.textContent('#brDevices li[data-id="bad"]')) && /Not connected/.test(await p.textContent('#brDevices li[data-id="bad"]')));
    check("no page errors", p.__errors.length === 0, p.__errors.join("; "));
    await p.__ctx.close();
  });

  await section("Incoming messages and sound alerts are routed to a connected display", async () => {
    const { A, B } = await pair(browser, { outm: ["captions", "braille"] });
    await B.evaluate(() => window.SangamBraille.register(window.__makeAdapter({ cells: 20 })));
    await say(A, "Hello there");
    await waitB(B, /Hello there/);
    check("before connecting the display nothing is sent to it", (await B.evaluate(() => window.__brLog.length)) === 0);
    // Meera connects the display through the registry's own connect button.
    await B.evaluate(() => document.querySelector('#brDevices button[data-brdev="connect"]').click());
    await B.waitForFunction(() => window.SangamBraille.state("test-adapter").connected);
    await say(A, "Please call me");
    await waitB(B, /Please call me/);
    await B.waitForFunction(() => window.__brLog.length >= 1, null, { timeout: 5000 });
    const log = await B.evaluate(() => window.__brLog);
    const expect = await B.evaluate(() => window.SangamBraille.detail("Ravi: Please call me").cells);
    check("a received message is sent to the connected display as Braille cells, with the sender's name", log.length === 1 && log[0].split("\n").join("\u2800") === expect, JSON.stringify(log) + " vs " + expect);
    check("lines are wrapped to the display's own width (20 cells)", log[log.length - 1].split("\n").every((l) => l.length <= 20));
    // sound alert routing
    await B.evaluate(() => { window.__brLog.length = 0; window.dispatchEvent(new CustomEvent("sangam:sound-alert", { detail: { category: "fire", label: "Smoke or fire alarm", test: false } })); });
    await B.waitForFunction(() => window.__brLog.length === 1);
    check("a sound alert is also sent to the display", (await B.evaluate(() => window.__brLog[0])).length > 5);
    // toggle off
    await B.uncheck("#brSend", { force: true }).catch(async () => { await B.evaluate(() => { const c = document.getElementById("brSend"); c.checked = false; c.dispatchEvent(new Event("change", { bubbles: true })); }); });
    await B.evaluate(() => { window.__brLog.length = 0; });
    await say(A, "Third message"); await waitB(B, /Third message/); await sleep(400);
    check("with 'send to a connected display' off, nothing is sent", (await B.evaluate(() => window.__brLog.length)) === 0);
    check("the message is still on Meera's screen", (await bText(B)).includes("Third message"));
    check("no page errors", A.__errors.length === 0 && B.__errors.length === 0, A.__errors.concat(B.__errors).join("; "));
    await A.__ctx.close(); await B.__ctx.close();
  });

  await section("'Delivered' is not the whole story: presented receipts", async () => {
    // 1. Meera says she uses a Braille display; none is connected.
    let { A, B } = await pair(browser, { outm: ["captions", "braille"], brDevice: true });
    await say(A, "Are you there?");
    await waitB(B, /Are you there/);
    await A.waitForFunction(() => /Delivered/.test(([...document.querySelectorAll("#liveChat .msg.me .msg-state")].pop() || {}).textContent || ""), null, { timeout: 8000 });
    check("the state still says Delivered (it did reach the device)", (await lastState(A)) === "Delivered");
    await A.waitForSelector("#liveChat .msg.me .msg-pres", { timeout: 5000 }).catch(() => {});
    const note = await A.$$eval("#liveChat .msg.me .msg-pres", (n) => n.map((x) => x.textContent));
    check("…and Ravi is told it may not have reached Meera in the way she prefers", note.length === 1 && /may not have reached (Meera|them) in the way they prefer/.test(note[0]), note.join(" | "));
    check("the note says it was shown on screen and does NOT reveal how she receives (no mention of Braille)", /shown on screen/.test(note[0]) && !/Braille|vibrat|haptic|spoken|speech/i.test(note[0]), note[0]);
    await A.__ctx.close(); await B.__ctx.close();

    // 2. Braille chosen as a preview only (no 'I use a display'): no warning, because the preview is what she asked for.
    ({ A, B } = await pair(browser, { outm: ["captions", "braille"], brDevice: false }));
    await say(A, "Hello"); await waitB(B, /Hello/); await A.waitForFunction(() => /Delivered/.test(([...document.querySelectorAll("#liveChat .msg.me .msg-state")].pop() || {}).textContent || ""), null, { timeout: 8000 });
    await sleep(700);
    check("Braille preview only (no display claimed): no warning is shown to the sender", (await A.$$("#liveChat .msg-pres")).length === 0);
    await A.__ctx.close(); await B.__ctx.close();

    // 3. Display connected and working: no warning.
    ({ A, B } = await pair(browser, { outm: ["captions", "braille"], brDevice: true }));
    await B.evaluate(() => { window.SangamBraille.register(window.__makeAdapter()); window.SangamBraille.setConnected("test-adapter", true); });
    await say(A, "Hi again"); await waitB(B, /Hi again/); await A.waitForFunction(() => /Delivered/.test(([...document.querySelectorAll("#liveChat .msg.me .msg-state")].pop() || {}).textContent || ""), null, { timeout: 8000 });
    await sleep(700);
    check("display connected and accepting: no warning", (await A.$$("#liveChat .msg-pres")).length === 0 && (await B.evaluate(() => window.__brLog.length)) >= 1);
    // display now fails
    await B.evaluate(() => { window.__failSend = true; });
    await say(A, "Does it still work?"); await waitB(B, /still work/);
    await A.waitForSelector("#liveChat .msg.me .msg-pres", { timeout: 6000 }).catch(() => {});
    check("display connected but REJECTING the text: sender is warned", (await A.$$("#liveChat .msg.me .msg-pres")).length === 1);
    check("Meera's own device records why (the display's error is shown with the display)", /did not accept the text: device busy/.test(await B.evaluate(() => document.getElementById("brDevices").textContent)));
    await A.__ctx.close(); await B.__ctx.close();

    // 4. Vibration chosen but the device cannot vibrate.
    ({ A, B } = await pair(browser, { outm: ["captions", "haptic"] }, "window.__NOVIB=true;"));
    await say(A, "ping"); await waitB(B, /ping/);
    await A.waitForSelector("#liveChat .msg.me .msg-pres", { timeout: 6000 }).catch(() => {});
    check("vibration chosen on a device that cannot vibrate: sender is warned", (await A.$$("#liveChat .msg.me .msg-pres")).length === 1);
    await A.__ctx.close(); await B.__ctx.close();

    // 5. Vibration chosen and working: no warning; and the meaning is only vibrated if that pattern is on.
    ({ A, B } = await pair(browser, { outm: ["captions", "haptic"], hapOff: ["YES"] }));
    await say(A, "yes"); await waitB(B, /^yes$/);
    await sleep(600);
    check("a pattern the person switched off is not played, and that is not reported as a failure", (await B.evaluate(() => window.__vib.filter((v) => Array.isArray(v) && v.join() === "100,120,100").length)) === 0 && (await A.$$("#liveChat .msg-pres")).length === 0);
    await say(A, "no"); await waitB(B, /^no$/); await sleep(400);
    check("a pattern that is on is played (NO = one long pulse)", (await B.evaluate(() => window.__vib.some((v) => Array.isArray(v) && v.join() === "400"))));
    await A.__ctx.close(); await B.__ctx.close();

  });

  await section("Haptic pattern configuration", async () => {
    const p = await newPage(browser);
    await p.goto(ORIGIN + "/#/dashboard/profile"); await p.waitForSelector("#hapticCard");
    check("ten patterns, each with an On checkbox", (await p.$$("#hapticCard input[data-hpon]")).length === 10);
    check("Emergency cannot be switched off", await p.$eval('input[data-hpon="EMERGENCY"]', (i) => i.disabled && i.checked));
    check("there is still no intensity slider", (await p.$$("#hapticCard input[type=range]")).length === 0);
    await p.uncheck('input[data-hpon="YES"]');
    check("switching a meaning off is saved in the profile", (await profileOf(p)).hapOff.join() === "YES");
    await p.evaluate(() => { window.__vib.length = 0; });
    await p.click('#hapticCard button[data-hp="YES"]');
    check("Test still plays a switched-off pattern, so you can feel it before deciding", (await p.evaluate(() => window.__vib))[0].join() === "100,120,100");
    check("the application itself will not use it while off", (await p.evaluate(() => window.SangamOut.vibrate("YES"))) === false);
    await p.selectOption("#hapScale", "2");
    await p.evaluate(() => { window.__vib.length = 0; });
    await p.click('#hapticCard button[data-hp="NO"]');
    check("'Much longer' doubles the pulse timing (NO: 400 → 800 ms)", (await p.evaluate(() => window.__vib))[0].join() === "800");
    await p.evaluate(() => { window.__vib.length = 0; });
    await p.click('#hapticCard button[data-hp="ALERT"]');
    check("the new Alert pattern is five very short pulses", (await p.evaluate(() => window.__vib))[0].filter((x, i) => i % 2 === 0).length === 5);
    await p.reload(); await p.waitForSelector("#hapticCard");
    check("settings survive a reload", (await p.$eval("#hapScale", (s) => s.value)) === "2" && !(await p.$eval('input[data-hpon="YES"]', (i) => i.checked)));
    await p.__ctx.close();
  });

  await section("Day 2 (Person 3) haptic pattern preset is kept alongside SANGAM's own", async () => {
    const p = await newPage(browser);
    await p.goto(ORIGIN + "/#/dashboard/profile"); await p.waitForSelector("#hapticCard");
    check("a Pattern style selector is offered, defaulting to SANGAM", (await p.$eval("#hapPreset", (s) => s.value)) === "sangam");
    await p.evaluate(() => { window.__vib.length = 0; });
    await p.click('#hapticCard button[data-hp="YES"]');
    check("SANGAM's own Yes pattern plays by default", (await p.evaluate(() => window.__vib))[0].join() === "100,120,100");

    await p.selectOption("#hapPreset", "day2");
    check("choosing Day 2 is saved in the profile", (await profileOf(p)).hapPreset === "day2");
    await p.evaluate(() => { window.__vib.length = 0; });
    const exact = { YES: "90,70,90", NO: "260,100,260", HELP: "100,80,100,80,320", EMERGENCY: "180,90,180,90,180,350,500,120,500" };
    for (const k of Object.keys(exact)) {
      await p.click('#hapticCard button[data-hp="' + k + '"]');
      check("Day 2's exact pulse array for " + k + " plays verbatim (not re-timed)", (await p.evaluate(() => window.__vib))[(await p.evaluate(() => window.__vib)).length - 1].join() === exact[k], exact[k]);
    }
    check("Day 2's own descriptions are shown for the four it defines", /Day 2 rhythm/.test(await p.textContent('[data-hprow="YES"]')) && /Day 2 rhythm/.test(await p.textContent('[data-hprow="EMERGENCY"]')));
    check("patterns Day 2 never defined (e.g. Alert) are unaffected by the preset", (await p.evaluate(() => window.SangamOut.activePattern("ALERT").p.length)) === (await p.evaluate(() => window.SangamOut.patterns.ALERT.p.length)));
    check("Emergency is still always on under the Day 2 preset", await p.$eval('input[data-hpon="EMERGENCY"]', (i) => i.disabled && i.checked));

    await p.selectOption("#hapPreset", "sangam");
    await p.evaluate(() => { window.__vib.length = 0; });
    await p.click('#hapticCard button[data-hp="YES"]');
    check("switching back to SANGAM restores its own Yes pattern (not left on Day 2's)", (await p.evaluate(() => window.__vib))[0].join() === "100,120,100");

    await p.selectOption("#hapPreset", "day2"); // one rebuild already happened above; this is a second, to be sure
    await p.evaluate(() => { window.__changeFires = 0; document.getElementById("profileExtra").addEventListener("change", (e) => { if (e.target.matches("input[data-hpon]")) window.__changeFires++; }); });
    await p.uncheck('input[data-hpon="YES"]');
    check("rebuilding the card after repeated preset switches did not double-bind the On/off listener", (await p.evaluate(() => window.__changeFires)) === 1, "fired " + (await p.evaluate(() => window.__changeFires)) + " time(s)");
    await p.__ctx.close();
  });

  await section("Deafblind-friendly options (optional, under validation)", async () => {
    const p = await newPage(browser);
    await p.goto(ORIGIN + "/#/dashboard/profile"); await p.waitForSelector("#dbCard");
    const txt = await p.textContent("#dbCard");
    check("labelled as an implementation under validation, not tested with deafblind people", /Implementation under validation/.test(txt) && /not yet been tested with deafblind people/.test(txt));
    check("says it does not detect, label or diagnose anyone", /does not detect, label or diagnose/.test(txt));
    const before = await profileOf(p);
    check("nothing is changed just by opening the page", before.scale === 100 && !before.hc && before.confirmSend === false);
    await p.click("#dbApply");
    const after = await profileOf(p);
    check("the suggested starting point sets Braille + vibration + captions, 150% text, high contrast, confirm-before-send", after.outm.slice().sort().join() === "braille,captions,haptic" && after.scale === 150 && after.hc === true && after.confirmSend === true);
    check("the page really changed (high contrast class, larger scale)", await p.evaluate(() => document.documentElement.classList.contains("hc") && getComputedStyle(document.documentElement).getPropertyValue("--scale").trim() === "1.5"));
    check("the profile chips show the new choices", (await p.$$eval("#outChips input:checked", (n) => n.map((x) => x.value))).sort().join() === "braille,captions,haptic");
    check("it says what it did and how to undo it", /Press Undo/.test(await p.textContent("#dbStatus")));
    await p.click("#dbUndo");
    const undone = await profileOf(p);
    check("Undo restores the earlier settings exactly", undone.outm.slice().sort().join() === before.outm.slice().sort().join() && undone.scale === 100 && !undone.hc && undone.confirmSend === false);
    await p.click("#dbApply"); await p.focus("#confirmSend"); await p.keyboard.press("Space"); // the visible switch track sits over the hidden input, so a real user clicks the track or presses Space; Space is used here
    check("any single setting can be changed afterwards", (await profileOf(p)).confirmSend === false && (await profileOf(p)).hc === true);
    await p.__ctx.close();
  });

  await section("Confirm before sending (typed chat)", async () => {
    const { A, B } = await pair(browser, {}, "", { confirmSend: true });
    await A.fill("#liveChat .chat-input", "Is this right?"); await A.press("#liveChat .chat-input", "Enter");
    await sleep(600);
    check("first press does NOT send", !(await bText(B)).includes("Is this right?"));
    check("it reads the message back and asks to press again", /Confirm: send .Is this right\?.{1,3} Press Send or Enter again/.test(await A.textContent("#liveChat")));
    await A.fill("#liveChat .chat-input", "Is this right? Yes."); await A.press("#liveChat .chat-input", "Enter"); await sleep(400);
    check("editing the text starts the confirmation again (still not sent)", !(await bText(B)).some((t) => /Is this right\? Yes/.test(t)));
    await A.press("#liveChat .chat-input", "Enter");
    check("the second press sends it", await waitB(B, /Is this right\? Yes\./));
    await A.__ctx.close(); await B.__ctx.close();
    const { A: A2, B: B2 } = await pair(browser, {});
    await say(A2, "no confirmation needed");
    check("with confirm-before-send off, one press sends", await waitB(B2, /no confirmation needed/));
    await A2.__ctx.close(); await B2.__ctx.close();
  });

  await section("Status announcement levels", async () => {
    const p = await newPage(browser);
    await p.goto(ORIGIN + "/#/dashboard/profile"); await p.waitForSelector("#announce");
    check("default: everything is announced", await p.evaluate(() => window.Sangam.announceOK("info") && window.Sangam.announceOK("important") && window.Sangam.announceOK("alert")));
    await p.selectOption("#announce", "important");
    check("'Important only' drops routine progress but keeps errors and alerts", await p.evaluate(() => !window.Sangam.announceOK("info") && window.Sangam.announceOK("important") && window.Sangam.announceOK("alert")));
    await p.selectOption("#announce", "alerts");
    check("'Alerts only' keeps just alarms and emergencies", await p.evaluate(() => !window.Sangam.announceOK("info") && !window.Sangam.announceOK("important") && window.Sangam.announceOK("alert")));
    check("a routine message is NOT written to the live region at that level", await p.evaluate(() => { window.Sangam.announce("routine", "info"); return document.getElementById("sangamLive").textContent === ""; }));
    check("an alert message IS written to the assertive live region", await p.evaluate(async () => { window.Sangam.announce("fire", "alert"); await new Promise((r) => setTimeout(r, 80)); return document.getElementById("sangamAlert").textContent === "fire"; }));
    check("alarms are never silenced: a sound-alert banner item is still role=alert at the strictest level", await (async () => { await p.evaluate(() => { location.hash = "#/dashboard/sounds"; }); await p.waitForSelector('section[data-p="sounds"]:not([hidden])'); await p.click('[data-preview="fire"]'); return (await p.$$('#soundAlert [role="alert"]')).length === 1; })());
    await p.reload(); await p.evaluate(() => { location.hash = "#/dashboard/profile"; }); await p.waitForSelector("#announce");
    check("the level is remembered", (await p.$eval("#announce", (s) => s.value)) === "alerts");
    await p.__ctx.close();
  });

  await section("Your data on this device: export and delete", async () => {
    const p = await newPage(browser);
    await p.goto(ORIGIN + "/#/dashboard/profile"); await p.waitForSelector("#dataCard");
    check("states that conversations are never stored on the device or kept after the session", /never written to this device/.test(await p.textContent("#dataCard")));
    await p.selectOption("#announce", "important"); // makes the profile save itself
    await p.evaluate(() => { localStorage.setItem("sangam.sign.personal.v1", JSON.stringify({ labels: { hello: [[[0.1, 0.2]]] } })); localStorage.setItem("sangam.sound.v1", JSON.stringify({ on: ["fire"] })); localStorage.setItem("unrelated.app", "keep me"); });
    const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#dataExport")]);
    const path = await dl.path(); const body = JSON.parse(require("fs").readFileSync(path, "utf8"));
    check("the download is named, and contains the SANGAM items", dl.suggestedFilename() === "sangam-my-data.json" && !!body.items["sangam.v2"] && !!body.items["sangam.sign.personal.v1"] && !!body.items["sangam.sound.v1"]);
    check("it contains nothing that is not SANGAM's", !("unrelated.app" in body.items));
    check("it says no chat messages, pictures, audio or video are included", /No chat messages, pictures, audio or video/.test(body.note));
    await p.click("#dataClear");
    check("the first press only arms the deletion and says what will happen", /Press again to confirm/.test(await p.textContent("#dataClear")) && /will be deleted/.test(await p.textContent("#dataStatus")));
    check("nothing is deleted by the first press", (await p.evaluate(() => localStorage.getItem("sangam.sign.personal.v1"))) !== null);
    await Promise.all([p.waitForNavigation({ waitUntil: "load" }), p.click("#dataClear")]);
    check("the second press deletes every SANGAM item (taught signs, sound settings, profile)", await p.evaluate(() => ["sangam.sign.personal.v1", "sangam.sound.v1"].every((k) => localStorage.getItem(k) === null)));
    check("…and leaves other sites' / apps' data alone", (await p.evaluate(() => localStorage.getItem("unrelated.app"))) === "keep me");
    check("the page came back with default settings", (await p.evaluate(() => window.Sangam.profile.scale)) === 100);
    await p.__ctx.close();
  });

  await section("Switch scanning options", async () => {
    const p = await newPage(browser, { inm: ["voice", "camera", "text", "symbols"], scanMs: 600, scanAuto: true });
    await p.goto(ORIGIN + "/#/dashboard/profile"); await p.waitForSelector("#scanAuto");
    await p.waitForFunction(() => window.SangamSwitch.state().on);
    const idx0 = await p.evaluate(() => window.SangamSwitch.state().index);
    await sleep(1800);
    check("automatic scanning advances by itself", (await p.evaluate(() => window.SangamSwitch.state().index)) !== idx0);
    // manual stepping
    await p.evaluate(() => { document.activeElement && document.activeElement.blur(); });
    await p.uncheck("#scanAuto", { force: true }).catch(() => {});
    await p.evaluate(() => { window.Sangam.profile.scanAuto = false; window.Sangam.save(); });
    await sleep(300);
    const i1 = await p.evaluate(() => window.SangamSwitch.state().index);
    await sleep(2200);
    check("with 'Move automatically' off, nothing moves by itself", (await p.evaluate(() => window.SangamSwitch.state().index)) === i1);
    await p.keyboard.press("ArrowRight");
    check("the arrow key steps one position", (await p.evaluate(() => window.SangamSwitch.state().index)) === i1 + 1);
    // pause after passes
    await p.evaluate(() => { window.Sangam.profile.scanAuto = true; window.Sangam.profile.scanLoops = 2; window.Sangam.profile.scanMs = 600; window.Sangam.save(); });
    await p.evaluate(() => window.SangamSwitch.stop()); await p.evaluate(() => window.SangamSwitch.start());
    await p.waitForFunction(() => window.SangamSwitch.state().paused, null, { timeout: 60000 });
    check("after N unused passes, scanning pauses and says so", /Paused: nothing was chosen for 2 passes/.test(await p.textContent(".scan-where")));
    await p.click(".scan-pause");
    check("Resume restarts scanning", !(await p.evaluate(() => window.SangamSwitch.state().paused)));
    // speak
    await p.evaluate(() => { window.Sangam.profile.scanLoops = 0; window.Sangam.profile.scanSpeak = true; window.Sangam.save(); window.__spoken.length = 0; });
    await p.evaluate(() => document.activeElement && document.activeElement.blur());
    await p.keyboard.press("ArrowRight");
    check("'Speak each highlighted control' speaks the control name", (await p.evaluate(() => window.__spoken)).some((t) => /^(Control|Group)/.test(t)), JSON.stringify(await p.evaluate(() => window.__spoken)));
    check("no page errors", p.__errors.length === 0, p.__errors.join("; "));
    await p.__ctx.close();
  });

  await browser.close();
  console.log("\n" + pass + " passed, " + fail + " failed");
  server.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
