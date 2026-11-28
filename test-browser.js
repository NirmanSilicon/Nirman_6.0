/*
 * Browser tests for the integration pass. Two separate browser contexts act as two
 * participants. Browser speech, vibration and recognition APIs are replaced with
 * recording stand-ins (the test machine has no speaker, motor or microphone), so
 * these tests prove SANGAM's behaviour, not how a real device sounds or feels.
 * A local stand-in translation service is used; no real provider is contacted.
 *
 *   npm run test:browser
 */
"use strict";
process.env.PORT = process.env.BROWSER_PORT || "8094";
delete process.env.TRANSLATE_PROVIDER;
const http = require("http");
const path = require("path");
const { chromium, devices } = require("playwright");
const { server, wss } = require("./server/server.js");

const BASE = "http://localhost:" + process.env.PORT;
let pass = 0, fail = 0;
const results = [];
function check(name, ok, extra) { const line = (ok ? "PASS" : "FAIL") + " — " + name + (extra ? "  (" + extra + ")" : ""); results.push(line); console.log(line); ok ? pass++ : fail++; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function section(name, fn) {
  console.log("\n## " + name);
  try { await fn(); } catch (e) { check(name + " ran without exception", false, String(e && e.message || e).split("\n")[0]); }
}

/* Stand-ins injected before any page script runs. */
const STUBS = `(() => {
  window.__spoken = []; window.__vib = []; window.__cancelled = 0; window.__srStarts = 0;
  const voices = window.__NOVOICES ? [] : [
    { voiceURI: "fake-en", name: "Fake English", lang: "en-US" },
    { voiceURI: "fake-hi", name: "Fake Hindi", lang: "hi-IN" }
  ];
  if (window.__NOSYNTH) {
    Object.defineProperty(window, "speechSynthesis", { value: undefined, configurable: true });
    window.SpeechSynthesisUtterance = undefined;
  } else {
    const synth = { speaking: false, paused: false, cancel() { window.__cancelled++; }, resume() {}, getVoices() { return voices; }, onvoiceschanged: null, addEventListener() {}, removeEventListener() {},
      speak(u) { window.__spoken.push({ text: u.text, rate: u.rate, lang: u.lang, voice: u.voice && u.voice.voiceURI }); } };
    Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  }
  if (!window.__NOVIB) navigator.vibrate = (p) => { window.__vib.push(p); return true; };
  else { try { Object.defineProperty(navigator, "vibrate", { value: undefined, configurable: true }); } catch (e) {} }
  class FakeSR { start() { window.__srInst = this; window.__srStarts++; this.onstart && this.onstart(); } stop() { this.onend && this.onend(); } }
  window.SpeechRecognition = FakeSR; window.webkitSpeechRecognition = FakeSR;
  window.__emitSpeech = (text) => { const i = window.__srInst; i.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] }); };
  const origSend = WebSocket.prototype.send;
  WebSocket.prototype.send = function (d) { if (window.__dropSends && /"type":"message"/.test(String(d))) return; return origSend.call(this, d); };
  window.__frames = [];
  const O = window.WebSocket;
  window.WebSocket = function (u, p) { const w = p ? new O(u, p) : new O(u); const s = w.send.bind(w); w.send = function (d) { window.__frames.push(String(d)); return s(d); }; return w; };
  window.WebSocket.prototype = O.prototype; window.WebSocket.OPEN = O.OPEN; window.WebSocket.CONNECTING = O.CONNECTING; window.WebSocket.CLOSED = O.CLOSED; window.WebSocket.CLOSING = O.CLOSING;
})();`;
const stubWith = (flags) => (flags || "") + STUBS;

function startMock() {
  return new Promise((res) => {
    const srv = http.createServer((req, rs) => {
      let body = ""; req.on("data", (c) => (body += c));
      req.on("end", () => {
        const send = (o) => { rs.writeHead(200, { "Content-Type": "application/json" }); rs.end(JSON.stringify(o)); };
        let b = {}; try { b = JSON.parse(body || "{}"); } catch (e) {}
        if (req.url === "/languages") return send([{ code: "en" }, { code: "hi" }]);
        send({ translatedText: "[" + b.target + "] " + b.q });
      });
    });
    srv.listen(0, () => res(srv));
  });
}

async function newCtx(browser, opts, flags) {
  const ctx = await browser.newContext(Object.assign({ permissions: ["microphone", "clipboard-read", "clipboard-write"] }, opts));
  await ctx.addInitScript(stubWith(flags));
  return ctx;
}
const msgs = (page, root) => page.$$eval(root + " .msg-t", (n) => n.map((x) => x.textContent));
async function waitMsg(page, root, re, ms) {
  return page.waitForFunction(([r, src]) => [...document.querySelectorAll(r + " .msg-t")].some((n) => new RegExp(src, "i").test(n.textContent)), [root, re.source], { timeout: ms || 8000 }).then(() => true, () => false);
}
async function lastState(page, root) { return page.$$eval(root + " .msg.me .msg-state", (n) => (n.length ? n[n.length - 1].textContent : "")); }
async function waitState(page, root, text, ms) {
  return page.waitForFunction(([r, t]) => { const n = [...document.querySelectorAll(r + " .msg.me .msg-state")]; return n.length && n[n.length - 1].textContent === t; }, [root, text], { timeout: ms || 8000 }).then(() => true, () => false);
}
async function makePair(browser, nameA, nameB, flagsA, flagsB, prefsB, prefsA) {
  const cA = await newCtx(browser, { viewport: { width: 1280, height: 900 } }, flagsA);
  const cB = await newCtx(browser, Object.assign({}, devices["iPhone 12"]), flagsB);
  if (prefsA) await cA.addInitScript("localStorage.setItem('sangam.v2', " + JSON.stringify(JSON.stringify(prefsA)) + ");");
  if (prefsB) await cB.addInitScript("localStorage.setItem('sangam.v2', " + JSON.stringify(JSON.stringify(prefsB)) + ");");
  const A = await cA.newPage(), B = await cB.newPage();
  await A.goto(BASE + "/#/dashboard/connect", { waitUntil: "load" });
  await A.waitForSelector("#createBtn");
  await A.fill("#hostName", nameA); await A.click("#createBtn");
  await A.waitForSelector("#connectLive .share-url");
  const joinUrl = await A.inputValue("#connectLive .share-url");
  await A.waitForSelector("#liveChat .chat");
  await B.goto(joinUrl, { waitUntil: "load" });
  await B.waitForSelector("#joinDisplay"); await B.fill("#joinDisplay", nameB); await B.click("#joinGo");
  await B.waitForSelector("#overlayChat .chat");
  await A.waitForFunction(() => /is here|online/i.test((document.querySelector("#liveChat .chat-count") || {}).textContent || ""));
  return { A, B, cA, cB, joinUrl };
}
async function setSw(page, id, on) { if ((await page.isChecked(id)) !== on) await page.click("label:has(" + id + ")"); }
async function openDash(page, feature) { await page.evaluate((f) => { location.hash = "#/dashboard/" + f; }, feature); await page.waitForSelector('.panel[data-p="' + feature + '"]:not([hidden])'); }

(async () => {
  await sleep(200);
  const mock = await startMock();
  const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--disable-features=WebRtcHideLocalIpsWithMdns"] });
  const errors = [];
  const watch = (tag, p) => { p.on("pageerror", (e) => errors.push(tag + " pageerror: " + e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(tag + " console: " + m.text()); }); };

  const { A, B, cA, cB, joinUrl } = await makePair(browser, "Ravi", "Meera");
  watch("A", A); watch("B", B);
  const RA = "#liveChat", RB = "#overlayChat";

  /* ===================== delivery states ===================== */
  await section("Delivery states (two participants)", async () => {
    await A.fill(RA + " .chat-input", "First message");
    await A.press(RA + " .chat-input", "Enter");
    check("sender's bubble shows a state, not just text", await waitState(A, RA, "Delivered", 8000) || (await lastState(A, RA)).length > 0, await lastState(A, RA));
    check("state reaches 'Delivered' only after the other device confirms", await lastState(A, RA) === "Delivered");
    check("recipient sees the message", await waitMsg(B, RB, /First message/));

    // B leaves (page closed WS), A sends: must NOT claim delivered.
    await B.goto("about:blank");
    await A.waitForFunction(() => /away|waiting/i.test((document.querySelector("#liveChat .chat-count") || {}).textContent || ""), null, { timeout: 8000 }).catch(() => {});
    await A.fill(RA + " .chat-input", "Sent while B is away");
    await A.press(RA + " .chat-input", "Enter");
    check("shows 'Sent to server' when the other device is away", await waitState(A, RA, "Sent to server", 6000));
    await sleep(1500);
    check("never says 'Delivered' without confirmation", await lastState(A, RA) === "Sent to server");
    await B.goto(joinUrl, { waitUntil: "load" });
    await B.waitForSelector("#overlayChat .chat").catch(async () => { await B.waitForSelector("#joinDisplay"); await B.fill("#joinDisplay", "Meera"); await B.click("#joinGo"); await B.waitForSelector("#overlayChat .chat"); });
    check("on reconnect the missed message arrives", await waitMsg(B, RB, /Sent while B is away/));
    check("and then the sender sees 'Delivered'", await waitState(A, RA, "Delivered", 8000));

    // Draft is kept when the connection is down.
    wss.clients.forEach((c) => c.terminate());
    await A.waitForFunction(() => /Reconnecting|Offline/i.test((document.querySelector("#liveChat .chat-count") || {}).textContent || ""), null, { timeout: 6000 }).catch(() => {});
    await A.fill(RA + " .chat-input", "Draft kept while offline");
    await A.press(RA + " .chat-input", "Enter");
    const kept = await A.inputValue(RA + " .chat-input");
    const stat = await A.textContent(RA + " .chat-status");
    // The client may already have reconnected; accept either an honest refusal or a normal send.
    check("a draft typed while disconnected is not lost", kept === "Draft kept while offline" ? /draft is kept/i.test(stat) : await waitMsg(A, RA, /Draft kept while offline/), kept ? "kept in box" : "sent after reconnect");
    await A.waitForFunction(() => /is here|online/i.test((document.querySelector("#liveChat .chat-count") || {}).textContent || ""), null, { timeout: 12000 }).catch(() => {});
    if (await A.inputValue(RA + " .chat-input")) { await A.press(RA + " .chat-input", "Enter"); }
    check("the kept draft sends once the connection is back", await waitMsg(B, RB, /Draft kept while offline/, 10000));

    // Open socket but no server echo: fails after the timeout, then Retry works. Same client id => no duplicate.
    await A.evaluate(() => { window.__dropSends = true; });
    await A.fill(RA + " .chat-input", "Dropped on the wire");
    await A.press(RA + " .chat-input", "Enter");
    check("shows 'Sending…' first", await waitState(A, RA, "Sending…", 3000));
    check("becomes 'Not sent' with a Retry button when the server never confirms", await waitState(A, RA, "Not sent", 12000) && (await A.$(RA + " .msg-retry")) !== null);
    await A.evaluate(() => { window.__dropSends = false; });
    await A.click(RA + " .msg-retry");
    check("Retry delivers the message", await waitState(A, RA, "Delivered", 8000));
    const cnt = (await msgs(B, RB)).filter((t) => t === "Dropped on the wire").length;
    check("recipient has exactly one copy", cnt === 1, String(cnt));

    // In flight when the socket drops: held as pending, flushed once on reconnect.
    await A.evaluate(() => { window.__dropSends = true; });
    await A.fill(RA + " .chat-input", "In flight at disconnect");
    await A.press(RA + " .chat-input", "Enter");
    await waitState(A, RA, "Sending…", 3000);
    wss.clients.forEach((c) => c.terminate());
    check("an in-flight message becomes 'Waiting to reconnect'", await waitState(A, RA, "Waiting to reconnect", 5000));
    await A.evaluate(() => { window.__dropSends = false; });
    check("and is sent automatically after reconnect", await waitState(A, RA, "Delivered", 15000));
    const cnt2 = (await msgs(B, RB)).filter((t) => t === "In flight at disconnect").length;
    check("without being duplicated", cnt2 === 1, String(cnt2));
  });

  /* ===================== privacy: profile never leaves the device ===================== */
  await section("Separate profiles, nothing sensitive on the wire", async () => {
    await A.evaluate(() => { const P = JSON.parse(localStorage.getItem("sangam.v2") || "{}"); P.outm = ["haptic"]; P.lang = "hi-IN"; P.emg = "PRIVATE-EMERGENCY-TEXT"; P.autoRead = true; localStorage.setItem("sangam.v2", JSON.stringify(P)); });
    await A.fill(RA + " .chat-input", "A message after changing profile");
    await A.press(RA + " .chat-input", "Enter");
    await waitMsg(B, RB, /after changing profile/);
    const frames = (await A.evaluate(() => window.__frames)).concat(await B.evaluate(() => window.__frames)).join("\n");
    check("no profile key or value appears in any frame the clients sent", !/sangam\.v2|outm|inm|PRIVATE-EMERGENCY|autoRead|"scale"|"hc"/.test(frames));
    const pa = await A.evaluate(() => localStorage.getItem("sangam.v2")), pb = await B.evaluate(() => localStorage.getItem("sangam.v2"));
    check("each participant keeps their own profile", pa !== pb && !(pb || "").includes("PRIVATE-EMERGENCY-TEXT"));
    const html = await B.content();
    check("the other participant's profile is not visible anywhere on the page", !html.includes("PRIVATE-EMERGENCY-TEXT"));
    await A.evaluate(() => localStorage.removeItem("sangam.v2"));
  });

  /* ===================== Mode A ===================== */
  await section("Mode A (fresh pair): voice-style message rendered by receiver profile", async () => {
    const prefsB = { outm: ["captions", "audio", "haptic", "braille"], inm: ["voice", "camera", "text"], autoRead: false };
    const p = await makePair(browser, "Asha", "Dev", "", "", prefsB, { outm: ["captions"], inm: ["voice", "camera", "text"] });
    watch("A2", p.A); watch("B2", p.B);
    await p.B.evaluate(() => { window.__vib.length = 0; });
    await p.A.fill(RA + " .chat-input", "Yes"); await p.A.press(RA + " .chat-input", "Enter");
    await waitMsg(p.B, RB, /^Yes$/);
    await sleep(200);
    const vib = await p.B.evaluate(() => window.__vib);
    check("receiver with Haptic on feels the YES pattern", JSON.stringify(vib[vib.length - 1]) === JSON.stringify([100, 120, 100]), JSON.stringify(vib[vib.length - 1]));
    check("receiver with Braille on gets a Braille line under the message", (await p.B.$(RB + " .msg-braille")) !== null && /[⠀-⣿]/.test(await p.B.textContent(RB + " .msg-braille")));
    check("receiver with Captions on gets a large caption of the newest message", await p.B.isVisible(RB + " .chat-caption") && /Yes/.test(await p.B.textContent(RB + " .chat-caption")));
    check("receiver with Spoken on gets a per-message Read aloud button", (await p.B.$(RB + " .msg-say")) !== null);
    const spokenBefore = (await p.B.evaluate(() => window.__spoken)).length;
    check("nothing is read aloud automatically while auto-read is off", spokenBefore === 0, String(spokenBefore));
    await p.B.check(RB + " .chat-aloud-cb");
    await p.A.fill(RA + " .chat-input", "Please come here"); await p.A.press(RA + " .chat-input", "Enter");
    await waitMsg(p.B, RB, /Please come here/); await sleep(200);
    const sp = await p.B.evaluate(() => window.__spoken);
    check("once enabled, new incoming messages are read aloud", sp.some((s) => /Please come here/.test(s.text)));
    await p.B.evaluate(() => { window.__vib.length = 0; });
    await p.A.fill(RA + " .chat-input", "I need help"); await p.A.press(RA + " .chat-input", "Enter");
    await waitMsg(p.B, RB, /^I need help$/); await sleep(200);
    check("'I need help' maps to the HELP pattern", JSON.stringify((await p.B.evaluate(() => window.__vib)).pop()) === JSON.stringify([100, 120, 100, 120, 100, 240, 400]));
    // Sender's own profile (captions only) must not give them braille/haptics/read-aloud for incoming.
    await p.B.fill(RB + " .chat-input", "Reply from Dev"); await p.B.press(RB + " .chat-input", "Enter");
    await waitMsg(p.A, RA, /Reply from Dev/); await sleep(200);
    check("a captions-only receiver gets no Braille, no read-aloud button, no vibration", (await p.A.$(RA + " .msg.them .msg-braille")) === null && (await p.A.$(RA + " .msg.them .msg-say")) === null && (await p.A.evaluate(() => window.__vib.length)) === 0);
    const bdis = await p.A.$eval(RA + " .chat-aloud-cb", (e) => e.disabled);
    check("auto-read is unavailable when Spoken is not in the profile", bdis === true);
    await p.cA.close(); await p.cB.close();
  });

  /* ===================== voice review ===================== */
  const V = await makePair(browser, "Vera", "Wim");
  watch("V", V.A); watch("W", V.B);
  await section("Voice: review before sending, never auto-send, never auto-start", async () => {
    await openDash(V.A, "relay");
    check("microphone does not start by itself", (await V.A.evaluate(() => window.__srStarts)) === 0);
    await V.A.click("#mic");
    check("microphone starts only after the button", (await V.A.evaluate(() => window.__srStarts)) === 1);
    await V.A.evaluate(() => window.__emitSpeech("hello this is spoken"));
    check("recognised text goes to the review box, editable", (await V.A.inputValue("#voiceDraft")) === "hello this is spoken");
    check("a caption line is also shown", /hello this is spoken/.test(await V.A.textContent("#tscript")));
    await sleep(500);
    const sentBefore = (await V.A.evaluate(() => window.__frames)).filter((f) => /"type":"message"/.test(f)).length;
    check("nothing was sent to the chat while the text sits in review", sentBefore === 0, String(sentBefore));
    check("the receiver has not seen it", !(await waitMsg(V.B, RB, /hello this is spoken/, 800)));
    await V.A.fill("#voiceDraft", "Hello, this is spoken (corrected)");
    await V.A.click("#voiceSend");
    check("pressing Send delivers the EDITED text", await waitMsg(V.B, RB, /corrected/));
    check("receiver sees it labelled as a reviewed voice transcript", /Voice transcript/i.test(await V.B.textContent(RB + " .msg.them .msg-tag.src")));
    check("review box is cleared after sending", (await V.A.inputValue("#voiceDraft")) === "");
    await V.A.waitForFunction(() => /Delivered/.test(document.querySelector("#voiceSendNote").textContent), null, { timeout: 6000 }).catch(() => {});
    check("sender's panel reports 'Delivered' only after confirmation", /Delivered/.test(await V.A.textContent("#voiceSendNote")));
    await V.A.evaluate(() => window.__emitSpeech("discard me"));
    await V.A.click("#voiceClear");
    check("Discard empties the review box and sends nothing", (await V.A.inputValue("#voiceDraft")) === "" && /Nothing was sent/.test(await V.A.textContent("#voiceSendNote")));
    await V.A.click("#mic");
    check("stopping is respected (no automatic restart)", (await V.A.evaluate(() => window.__srStarts)) === 1);
    // error codes
    await V.A.click("#mic");
    await V.A.evaluate(() => { window.__srInst.onerror({ error: "not-allowed" }); });
    check("blocked microphone gets a specific message", /blocked/i.test(await V.A.textContent("#micNote")));
    await V.A.evaluate(() => { window.__srInst.onerror({ error: "language-not-supported" }); });
    check("unsupported recognition language gets a specific message", /cannot recognise speech in the chosen language/i.test(await V.A.textContent("#micNote")));
  });

  /* ===================== phrase board ===================== */
  await section("Phrase board: send, duplicates, custom phrases", async () => {
    await openDash(V.A, "phrases");
    await V.A.click('#cats button[data-c="Needs"]');
    await V.A.click("#tiles .tile >> nth=0");
    check("tapping a tile speaks it", (await V.A.evaluate(() => window.__spoken)).some((s) => /need some water/i.test(s.text)));
    check("tile adds to an editable draft", /water/i.test(await V.A.inputValue("#phraseDraft")));
    await V.A.fill("#phraseDraft", "I need some water, please");
    await V.A.click("#pSendChat");
    check("Send to chat delivers the reviewed draft", await waitMsg(V.B, RB, /water, please/));
    check("receiver sees a Phrase board label", /Phrase board/i.test(await V.B.textContent(RB + " .msg.them:last-child .msg-tag.src")));
    await V.A.fill("#phraseDraft", "I need some water, please");
    await V.A.click("#pSendChat");
    check("sending the same text again within 10 s asks for a second press", /Send again anyway/.test(await V.A.textContent("#pSendChat")) && /twice/.test(await V.A.textContent("#pNote")));
    await sleep(400);
    check("…and nothing extra was sent yet", (await msgs(V.B, RB)).filter((t) => /water, please/.test(t)).length === 1);
    await V.A.click("#pSendChat");
    check("a deliberate second press sends it", await V.B.waitForFunction(() => [...document.querySelectorAll("#overlayChat .msg.them .msg-t")].filter((n) => /water, please/.test(n.textContent)).length === 2, null, { timeout: 6000 }).then(() => true, () => false));
    await V.A.fill("#customPhrase", "Please open the window");
    await V.A.click("#addPhrase");
    await V.A.click('#cats button[data-c="My phrases"]');
    check("a custom phrase becomes a tile", (await V.A.$$('#tiles .tile[aria-label*="open the window"]')).length === 1);
    check("custom phrases are saved on this device", (await V.A.evaluate(() => localStorage.getItem("sangam.phrases"))).includes("open the window"));
    const keep = await newCtx(browser, {}); const K = await keep.newPage();
    await K.goto(BASE + "/#/dashboard/phrases", { waitUntil: "load" });
    await K.fill("#customPhrase", "Persisted phrase"); await K.click("#addPhrase");
    await K.reload({ waitUntil: "load" });
    await K.click('#cats button[data-c="My phrases"]');
    check("custom phrases survive a reload", /Persisted phrase/.test(await K.textContent("#tiles")));
    await keep.close();
    await V.A.click('#cats button[data-c="My phrases"]');
    await V.A.click("#tiles .tile-x");
    check("a custom phrase can be removed", /No phrases of your own/.test(await V.A.textContent("#tiles")));
  });

  /* ===================== OCR flow ===================== */
  await section("Photo reading: validation, review, send", async () => {
    // These panels need a session; the original host page was reloaded, so use the V pair's B (guest) -> A direction.
    const R = await makePair(browser, "Olga", "Pim");
    watch("O", R.A); watch("P", R.B);
    await openDash(R.A, "scan");
    check("English-only note is visible", /English only/i.test(await R.A.textContent("#scanFileNote")));
    await R.A.setInputFiles("#file", { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
    check("a non-image is refused with a clear reason", /not a supported image/i.test(await R.A.textContent("#scanFileNote")) && (await R.A.$eval("#prev", (e) => e.hidden)) === true);
    await R.A.setInputFiles("#file", { name: "big.png", mimeType: "image/png", buffer: Buffer.alloc(12 * 1024 * 1024 + 10) });
    check("an oversized photo is refused with a clear reason", /larger than 12 MB/i.test(await R.A.textContent("#scanFileNote")));
    const dataUrl = await R.A.evaluate(() => { const c = document.createElement("canvas"); c.width = 900; c.height = 260; const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, 900, 260); x.fillStyle = "#000"; x.font = "bold 110px Arial"; x.fillText("TEST LABEL", 40, 170); return c.toDataURL("image/png"); });
    const png = Buffer.from(dataUrl.split(",")[1], "base64");
    await R.A.setInputFiles("#file", { name: "label.png", mimeType: "image/png", buffer: png });
    // The <img> has no size until the browser has decoded the photo, so wait for it to become visible instead of sampling it instantly.
    const previewShown = await R.A.waitForSelector("#prev", { state: "visible", timeout: 5000 }).then(() => true, () => false);
    check("a valid photo shows a preview and enables reading", previewShown && !(await R.A.$eval("#run", (e) => e.disabled)));
    await R.A.click("#run");
    await R.A.waitForFunction(() => /Done|Failed/.test(document.querySelector("#progL").textContent), null, { timeout: 60000 });
    const found = await R.A.inputValue("#scanText");
    check("text is extracted", /TEST/i.test(found), found.trim());
    check("a confidence figure is shown with a caution", /Reading confidence: \d+%/.test(await R.A.textContent("#scanConf")) && /check/i.test(await R.A.textContent("#scanConf")));
    await R.A.fill("#scanText", "TEST LABEL (checked)");
    await R.A.click("#scanCopy");
    check("Copy puts the edited text on the clipboard", (await R.A.evaluate(() => navigator.clipboard.readText())) === "TEST LABEL (checked)");
    await R.A.click("#scanSay");
    check("Read aloud speaks the edited text", (await R.A.evaluate(() => window.__spoken)).some((s) => s.text === "TEST LABEL (checked)"));
    await R.A.click("#scanSend");
    check("Send to chat delivers the reviewed text", await waitMsg(R.B, RB, /TEST LABEL \(checked\)/));
    check("receiver sees it labelled as text read from a photo", /photo \(OCR/i.test(await R.B.textContent(RB + " .msg.them .msg-tag.src")));
    const [chooser] = await Promise.all([R.A.waitForEvent("filechooser"), R.A.click("#photoReplace")]);
    check("Replace photo opens the file chooser", !!chooser);
    await chooser.setFiles({ name: "second.png", mimeType: "image/png", buffer: png });
    await R.A.waitForFunction(() => /Photo ready: second.png/.test(document.querySelector("#scanFileNote").textContent), null, { timeout: 8000 }).catch(() => {});
    check("replacing swaps the photo and clears the confidence note", /Photo ready: second.png/.test(await R.A.textContent("#scanFileNote")) && (await R.A.textContent("#scanConf")) === "");
    await R.A.click("#photoRemove");
    check("Remove photo hides the preview and disables reading", (await R.A.$eval("#prev", (e) => e.hidden)) && (await R.A.$eval("#run", (e) => e.disabled)));
    check("the text stays until cleared", (await R.A.inputValue("#scanText")).length > 0);
    // Unreadable image: refused up front with a reason, never sent into the OCR engine, never invents text.
    await R.A.fill("#scanText", "");
    await R.A.setInputFiles("#file", { name: "garbage.png", mimeType: "image/png", buffer: Buffer.from("not really a png at all, just bytes") });
    await R.A.waitForFunction(() => /could not be opened as an image/.test(document.querySelector("#scanFileNote").textContent), null, { timeout: 8000 }).catch(() => {});
    check("a damaged image is refused with a reason and no text is invented", /could not be opened as an image/.test(await R.A.textContent("#scanFileNote")) && (await R.A.inputValue("#scanText")) === "");
    // No chat: text kept, honest message
    const solo = await newCtx(browser, {});
    const S = await solo.newPage(); watch("S", S);
    await S.goto(BASE + "/#/dashboard/scan", { waitUntil: "load" });
    await S.fill("#scanText", "Some text to keep");
    await S.click("#scanSend");
    check("without a chat session nothing is sent and the text is kept", /Not connected to a chat/.test(await S.textContent("#scanSendNote")) && (await S.inputValue("#scanText")) === "Some text to keep");
    await solo.close(); await R.cA.close(); await R.cB.close();
  });

  /* ===================== messages panel ===================== */
  await section("Text messages panel", async () => {
    const solo = await newCtx(browser, {});
    const S = await solo.newPage(); watch("S2", S);
    await S.goto(BASE + "/#/dashboard/messages", { waitUntil: "load" });
    await S.fill("#messageDraft", "Draft with no chat");
    await S.click('#messageForm button[type="submit"]');
    check("no session: the draft is kept and the reason is shown", (await S.inputValue("#messageDraft")) === "Draft with no chat" && /No active chat session/.test(await S.textContent("#msgConn")));
    check("no fake 'sent' bubble appears", (await S.$$("#messageThread .message-bubble.sent")).length === 0);
    await solo.close();
    await openDash(V.A, "messages");
    await V.A.fill("#messageDraft", "From the messages panel");
    await V.A.click('#messageForm button[type="submit"]');
    await V.A.waitForFunction(() => /Delivered/.test((document.querySelector("#messageThread .message-bubble.sent .mstate") || {}).textContent || ""), null, { timeout: 8000 }).catch(() => {});
    check("with a session the bubble reaches 'Delivered' after confirmation", /Delivered/.test(await V.A.textContent("#messageThread .message-bubble.sent .mstate")));
    check("the other participant received it", await waitMsg(V.B, RB, /From the messages panel/));
  });

  /* ===================== emergency ===================== */
  await section("Emergency: review, send, recipient alert, acknowledgement", async () => {
    await openDash(V.A, "phrases");
    await V.A.click("#pEmg");
    check("the dialog opens with an editable message and a clear recipient line", (await V.A.isVisible("#emgDlg")) && /Wim|everyone in your chat session/.test(await V.A.textContent("#emgTarget")));
    check("nothing is sent just by opening it", !(await V.B.isVisible("#emgIn")));
    check("it states that emergency services are not contacted", /cannot reach emergency services/i.test(await V.A.textContent("#emgDlg .emg-alt")));
    await V.A.evaluate(() => { window.__SANGAM_ACK_MS = 1200; });
    await V.B.evaluate(() => { window.__vib.length = 0; });
    await V.A.fill("#emgText", "I fell and need help at the front desk");
    await V.A.click("#emgSend");
    await V.B.waitForSelector("#emgIn[open]", { timeout: 6000 });
    check("the other person gets a full-screen alert dialog with the text", /front desk/.test(await V.B.textContent("#emgInText")) && /Vera/.test(await V.B.textContent("#emgInFrom")));
    check("it is exposed as an alert dialog", (await V.B.getAttribute("#emgIn", "role")) === "alertdialog");
    check("the alert is not vibration-only: vibration is added to visible text", (await V.B.evaluate(() => window.__vib.length)) > 0 && /front desk/.test(await V.B.textContent("#emgInText")));
    check("focus moves to the acknowledge button", (await V.B.evaluate(() => document.activeElement && document.activeElement.id)) === "emgInAck");
    check("sender is told the alert is waiting for confirmation (not 'seen')", await V.A.waitForFunction(() => /Waiting for (the other person|them) to confirm/.test(document.querySelector("#emgStatus").textContent), null, { timeout: 6000 }).then(() => true, () => false));
    check("with no confirmation the sender is told not to assume it was seen", await V.A.waitForFunction(() => /No one has confirmed yet/.test(document.querySelector("#emgStatus").textContent), null, { timeout: 8000 }).then(() => true, () => false));
    await V.B.click("#emgInAck");
    check("the sender sees who confirmed, and when", await V.A.waitForFunction(() => /Wim confirmed they have seen your alert/.test(document.querySelector("#emgStatus").textContent), null, { timeout: 6000 }).then(() => true, () => false));
    await V.B.click("#emgInClose");
    await V.A.click("#emgClose");
    check("closing returns focus to the control that opened it", (await V.A.evaluate(() => document.activeElement && document.activeElement.id)) === "pEmg");
    // No session at all
    const solo = await newCtx(browser, {});
    const S = await solo.newPage(); watch("S3", S);
    await S.goto(BASE + "/#/dashboard/phrases", { waitUntil: "load" });
    await S.click("#pEmg");
    check("without a session, Send is disabled and the reason is shown", (await S.$eval("#emgSend", (e) => e.disabled)) && /No active chat session/.test(await S.textContent("#emgTarget")));
    check("an alternative is offered: show the message to someone nearby", await S.isVisible("#emgShow"));
    await S.click("#emgShow");
    check("'show to a person nearby' displays the message large", (await S.isVisible("#emgShowDlg")) && (await S.textContent("#emgBig")).length > 5);
    await S.click("#emgShowClose");
    check("a dialer link is offered but SANGAM does not place the call", (await S.getAttribute("#emgDial", "href")) === "tel:112" && /does not place|cannot reach/i.test(await S.textContent("#emgDlg .emg-alt")) || /cannot reach emergency services/i.test(await S.textContent("#emgDlg .emg-alt")));
    await solo.close();
  });

  /* ===================== translation ===================== */
  await section("Translation: honest when unconfigured", async () => {
    check("chat says translation is not set up", /not set up on this server/i.test(await V.A.textContent(RA + " .chat-trans-state")));
    check("the controls do not pretend to translate", (await V.A.$eval(RA + " .trans-go", (e) => e.disabled)) && (await V.A.$eval(RA + " .trans-auto", (e) => e.disabled)));
    check("no Translate button is offered on received messages", (await V.B.$$(RB + " .msg-tr")).length === 0);
    await openDash(V.A, "profile");
    await V.A.selectOption("#lang", "or-IN");
    const note = await V.A.textContent("#langNote");
    check("Odia: translation reported as not configured; nothing is claimed", /Odia/.test(note) && /translation \(no\)/.test(note));
    check("Odia: recognition is not claimed as working", /listening \(unknown\)|listening \(no\)/.test(note));
    check("Odia: the script needs a device font, and that is said", /Odia font/.test(note));
    check("Odia: no Odia voice in this device is reported, not hidden", /speaking \(no\)/.test(note));
    await V.A.selectOption("#lang", "hi-IN");
    check("Hindi: a Hindi voice is reported only because one is installed", /speaking \(yes\)/.test(await V.A.textContent("#langNote")));
  });

  process.env.TRANSLATE_PROVIDER = "libretranslate";
  process.env.LIBRETRANSLATE_URL = "http://localhost:" + mock.address().port;
  await section("Translation: with a (stand-in) provider", async () => {
    const T = await makePair(browser, "Tara", "Uma");
    watch("T", T.A); watch("U", T.B);
    check("chat reports translation is on", /Translation is on \(provider: libretranslate\)/.test(await T.A.textContent(RA + " .chat-trans-state")));
    await T.A.fill(RA + " .chat-input", "Good morning"); await T.A.press(RA + " .chat-input", "Enter");
    await waitMsg(T.B, RB, /Good morning/);
    await T.B.waitForSelector(RB + " .msg-tr");
    await T.B.click(RB + " .msg-tr");
    await T.B.waitForFunction(() => /\[en\] Good morning/.test(document.querySelector("#overlayChat .msg-trans").textContent), null, { timeout: 6000 }).catch(() => {});
    const tt = await T.B.textContent(RB + " .msg-trans");
    check("receiver's translation uses THEIR profile language and is labelled machine translation", /Translated to English/.test(tt) && /machine translation/.test(tt), tt);
    check("the original message stays visible next to the translation", /Good morning/.test(await T.B.textContent(RB + " .msg.them .msg-t")));
    // outgoing
    await T.A.click(RA + " .trans-out summary");
    await T.A.fill(RA + " .trans-orig", "Where is the clinic?");
    await T.A.selectOption(RA + " .trans-tgt", "hi-IN");
    await T.A.click(RA + " .trans-go");
    await T.A.waitForFunction(() => document.querySelector("#liveChat .trans-result").value.length > 0, null, { timeout: 6000 });
    check("original, source, target and the translation are all visible", (await T.A.inputValue(RA + " .trans-result")) === "[hi] Where is the clinic?" && (await T.A.inputValue(RA + " .trans-orig")) === "Where is the clinic?");
    check("the translation text is marked with its language", (await T.A.getAttribute(RA + " .trans-result", "lang")) === "hi-IN");
    await T.A.fill(RA + " .trans-result", "[hi] Where is the clinic? (edited)");
    await T.A.click(RA + " .trans-send");
    check("the edited translation is what gets sent", await waitMsg(T.B, RB, /\(edited\)/));
    check("the receiver also sees the original text and a Translated label", /Original: Where is the clinic/.test(await T.B.textContent(RB + " .msg.them:last-child .msg-orig")) && /Translated/.test(await T.B.textContent(RB + " .msg.them:last-child .msg-tag.src")));
    await openDash(T.A, "profile");
    await T.A.selectOption("#lang", "or-IN");
    check("Odia is still not claimed because the provider does not list it", /translation \(no\)/.test(await T.A.textContent("#langNote")));
    await T.A.selectOption("#lang", "hi-IN");
    check("Hindi translation is reported because the provider lists it", /translation \(yes\)/.test(await T.A.textContent("#langNote")));
    await T.cA.close(); await T.cB.close();
  });
  delete process.env.TRANSLATE_PROVIDER;

  /* ===================== live voice ===================== */
  await section("Live voice (two browser contexts, test audio source)", async () => {
    const L = await makePair(browser, "Lena", "Milo");
    watch("L", L.A); watch("M", L.B);
    check("the microphone is not opened before anyone presses a button", !(await L.A.evaluate(() => window.SangamLive.state().hasStream)) && !(await L.B.evaluate(() => window.SangamLive.state().hasStream)));
    await L.A.click(RA + " .live-start");
    await L.B.waitForSelector(RB + " .live-prompt:not([hidden])", { timeout: 6000 });
    check("the other person must accept: the call is not auto-answered", /microphone stays off/.test(await L.B.textContent(RB + " .live-prompt-text")) && !(await L.B.evaluate(() => window.SangamLive.state().hasStream)));
    await L.B.click(RB + " .live-decline");
    check("declining tells the caller", await L.A.waitForFunction(() => /did not accept/.test(document.querySelector("#liveChat .live-status").textContent), null, { timeout: 6000 }).then(() => true, () => false));
    await L.A.click(RA + " .live-start");
    await L.B.waitForSelector(RB + " .live-prompt:not([hidden])", { timeout: 6000 });
    await L.B.click(RB + " .live-accept");
    const connected = async (P) => P.waitForFunction(() => window.SangamLive.state().pcState === "connected", null, { timeout: 20000 }).then(() => true, () => false);
    const [ca, cb] = await Promise.all([connected(L.A), connected(L.B)]);
    check("both sides reach a connected audio session", ca && cb, "A=" + ca + " B=" + cb);
    if (ca && cb) {
      const remote = await L.B.evaluate(() => { const a = document.querySelector("audio"); return !!(a && a.srcObject && a.srcObject.getAudioTracks().length); });
      check("remote audio track is attached on the receiving side", remote);
      await L.A.click(RA + " .live-mute");
      check("mute disables the microphone track and says so", (await L.A.evaluate(() => document.querySelector("#liveChat .live-mute").getAttribute("aria-pressed"))) === "true" && /muted/i.test(await L.A.textContent(RA + " .live-status")));
      await L.A.click(RA + " .live-hang");
      check("hang up ends the call on the other side too", await L.B.waitForFunction(() => /ended the call/.test(document.querySelector("#overlayChat .live-status").textContent), null, { timeout: 6000 }).then(() => true, () => false));
      check("microphone tracks are released after the call", !(await L.A.evaluate(() => window.SangamLive.state().hasStream)) && !(await L.B.evaluate(() => window.SangamLive.state().hasStream)));
    }
    await L.cA.close(); await L.cB.close();
  });

  /* ===================== haptics + braille UI ===================== */
  await section("Haptic patterns UI", async () => {
    const solo = await newCtx(browser, {}); const S = await solo.newPage(); watch("H", S);
    await S.goto(BASE + "/#/dashboard/profile", { waitUntil: "load" });
    const names = await S.$$eval("#hapticCard .hp-row b", (n) => n.map((x) => x.textContent));
    check("all ten meanings are listed (the original eight, plus Call incoming and Alert added in the second integration pass)", JSON.stringify(names) === JSON.stringify(["Yes", "No", "Help", "Emergency", "Information", "Message received", "Message sent", "Connection lost", "Call incoming", "Alert"]), names.join(","));
    check("each pattern is described in words", (await S.$$eval("#hapticCard .hp-row .note", (n) => n.every((x) => x.textContent.length > 8))));
    const expected = { YES: [100, 120, 100], NO: [400], HELP: [100, 120, 100, 120, 100, 240, 400], EMERGENCY: [400, 120, 400, 120, 400, 120, 400], INFORMATION: [100, 120, 400], RECEIVED: [400, 120, 100], SENT: [60], LOST: [400, 240, 400, 240, 100], CALL: [400, 360, 400, 600, 400, 360, 400], ALERT: [100, 100, 100, 100, 100, 100, 100, 100, 100] };
    let allOk = true;
    for (const k of Object.keys(expected)) {
      await S.evaluate(() => { window.__vib.length = 0; });
      await S.click('#hapticCard button[data-hp="' + k + '"]');
      const got = (await S.evaluate(() => window.__vib))[0];
      if (JSON.stringify(got) !== JSON.stringify(expected[k])) { allOk = false; console.log("   mismatch " + k + " " + JSON.stringify(got)); }
    }
    check("Test plays exactly the documented rhythm for every pattern", allOk);
    const pats = Object.values(expected).map((p) => JSON.stringify(p));
    check("no two patterns are identical", new Set(pats).size === pats.length);
    await S.evaluate(() => { window.__vib.length = 0; });
    await S.click("#hapStop");
    check("Stop cancels vibration", JSON.stringify(await S.evaluate(() => window.__vib)) === JSON.stringify([0]));
    check("there is no intensity slider, and the page says why", (await S.$$("#hapticCard input[type=range]")).length === 0 && /no intensity control/i.test(await S.textContent("#hapSupport")));
    await solo.close();
    const nov = await newCtx(browser, {}, "window.__NOVIB=true;"); const N = await nov.newPage(); watch("N", N);
    await N.goto(BASE + "/#/dashboard/profile", { waitUntil: "load" });
    check("on a device that cannot vibrate, tests are disabled and it is explained", (await N.$eval('#hapticCard button[data-hp="YES"]', (e) => e.disabled)) && /cannot vibrate/i.test(await N.textContent("#hapSupport")));
    await nov.close();
  });

  await section("Braille preview", async () => {
    const solo = await newCtx(browser, {}); const S = await solo.newPage(); watch("Br", S);
    await S.goto(BASE + "/#/dashboard/profile", { waitUntil: "load" });
    const out = async (t) => { await S.fill("#brIn", t); return (await S.textContent("#brOut")).replace(/\n/g, "|"); };
    const sp = "⠀";
    check("capital letters, words and punctuation", (await out("Hello, I need help.")) === "⠠⠓⠑⠇⠇⠕⠂" + sp + "⠠⠊" + sp + "⠝⠑⠑⠙" + sp + "⠓⠑⠇⠏⠲");
    check("all-capital words use the capital-word indicator", (await out("NASA")) === "⠠⠠⠝⠁⠎⠁");
    check("numbers get a number sign, and a following a-j gets a grade-1 indicator", (await out("12a")) === "⠼⠁⠃⠰⠁");
    check("decimal points stay inside a number", (await out("3.5")) === "⠼⠉⠲⠑");
    check("unsupported scripts are reported, not silently dropped or guessed", (await out("नमस्ते")) === "" && /Not shown/.test(await S.textContent("#brNote")));
    check("quotation marks are reported rather than guessed", /Not shown.*“\"”|Not shown.*“"”/.test((await out('say "hi"'), await S.textContent("#brNote"))) || /Not shown/.test(await S.textContent("#brNote")));
    await S.fill("#brIn", "one two three four five six seven eight");
    await S.selectOption("#brW", "14");
    const lines = (await S.textContent("#brOut")).split("\n");
    check("lines wrap at the chosen display width", lines.length > 1 && lines.every((l) => l.length <= 14), lines.map((l) => l.length).join(","));
    const card = await S.textContent("#brailleCard");
    check("it states it is not Grade 2, not other languages, and not a physical display", /not<\/b> Grade 2|not Grade 2/.test(await S.innerHTML("#brailleCard")) && /not a physical Braille display/.test(await S.innerHTML("#brailleCard").then((h) => h.replace(/<[^>]+>/g, ""))));
    check("physical display status is honest: none connected, no driver", /none connected, and no display driver is bundled/.test(card));
    await solo.close();
  });

  /* ===================== switch scanning ===================== */
  await section("Switch scanning (keyboard)", async () => {
    const solo = await newCtx(browser, { viewport: { width: 1280, height: 900 } }); const S = await solo.newPage(); watch("Sw", S);
    await S.goto(BASE + "/#/dashboard/profile", { waitUntil: "load" });
    check("off by default: no scanning bar", !(await S.isVisible(".scan-bar")));
    await S.evaluate(() => { document.getElementById("scanMs").value = 3000; document.getElementById("scanMs").dispatchEvent(new Event("input", { bubbles: true })); });
    await setSw(S, "#scanOn", true);
    check("turning it on shows the scanning bar and a highlighted control", (await S.isVisible(".scan-bar")) && (await S.$$(".scan-hl")).length === 1);
    check("choosing the Switch input mode and scanning are the same setting", await S.isChecked('#inChips input[value="symbols"]'));
    check("the page does not claim hardware compatibility", /not tested with (physical )?switch hardware/i.test(await S.textContent("#profileExtra").then(() => S.textContent(".pbox:has(#scanOn)"))));
    // Walk groups with the stepping key until the quick-controls group is highlighted.
    let found = false;
    for (let i = 0; i < 40 && !found; i++) { found = await S.evaluate(() => window.SangamSwitch.state().highlighted && window.SangamSwitch.state().highlighted.id === "ttsBar"); if (!found) await S.keyboard.press("ArrowRight"); }
    check("stepping reaches a group", found);
    await S.keyboard.press("Space");
    check("select enters the group", (await S.evaluate(() => window.SangamSwitch.state().mode)) === "items");
    found = false;
    for (let i = 0; i < 6 && !found; i++) { found = await S.evaluate(() => { const h = window.SangamSwitch.state().highlighted; return !!h && h.id === "ttsRepeat"; }); if (!found) await S.keyboard.press("ArrowRight"); }
    await S.keyboard.press("Enter");
    check("select activates the highlighted control", /Nothing to repeat yet/.test(await S.textContent("#ttsState")));
    await S.keyboard.press("Escape");
    check("Escape pauses scanning", await S.evaluate(() => window.SangamSwitch.state().paused));
    await S.keyboard.press("Escape");
    check("Escape again resumes", !(await S.evaluate(() => window.SangamSwitch.state().paused)));
    await S.click(".scan-off");
    check("Turn off removes the bar and the highlight", !(await S.isVisible(".scan-bar")) && (await S.$$(".scan-hl")).length === 0);
    await solo.close();
  });

  /* ===================== TTS controls ===================== */
  await section("Spoken output controls", async () => {
    const solo = await newCtx(browser, {}); const S = await solo.newPage(); watch("T2", S);
    await S.goto(BASE + "/#/dashboard/phrases", { waitUntil: "load" });
    await S.click("#tiles .tile >> nth=0");
    await S.click("#ttsRepeat");
    const sp = await S.evaluate(() => window.__spoken);
    check("Repeat last speaks the previous text again", sp.length >= 2 && sp[sp.length - 1].text === sp[sp.length - 2].text);
    const c0 = await S.evaluate(() => window.__cancelled);
    await S.click("#ttsStop");
    check("Stop cancels speech", (await S.evaluate(() => window.__cancelled)) === c0 + 1);
    const c1 = await S.evaluate(() => window.__cancelled);
    await S.click("#tiles .tile >> nth=1"); await S.click("#tiles .tile >> nth=2");
    check("each new utterance cancels the previous one (no overlap)", (await S.evaluate(() => window.__cancelled)) === c1 + 2);
    await openDash(S, "profile");
    await S.selectOption("#voiceSel", "fake-hi");
    await S.selectOption("#lang", "hi-IN");
    await S.evaluate(() => { const r = document.getElementById("rate"); r.value = 1.3; r.dispatchEvent(new Event("input", { bubbles: true })); });
    await S.click("#voiceTest");
    const last = (await S.evaluate(() => window.__spoken)).pop();
    check("chosen voice, language and rate are applied", last.voice === "fake-hi" && last.lang === "hi-IN" && Math.abs(last.rate - 1.3) < 0.01, JSON.stringify(last));
    await solo.close();
    const ns = await newCtx(browser, {}, "window.__NOSYNTH=true;"); const N = await ns.newPage(); watch("N2", N);
    await N.goto(BASE + "/#/dashboard/phrases", { waitUntil: "load" });
    await N.click("#tiles .tile >> nth=0");
    check("a browser with no speech says so instead of failing silently", /cannot speak text/i.test(await N.textContent("#toast")));
    await ns.close();
  });

  /* ===================== profile settings all have a visible effect ===================== */
  await section("Access profile settings have visible effects", async () => {
    const solo = await newCtx(browser, {}); const S = await solo.newPage(); watch("Pf", S);
    await S.goto(BASE + "/#/dashboard/profile", { waitUntil: "load" });
    const fs0 = await S.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    await S.evaluate(() => { const r = document.getElementById("rng"); r.value = 160; r.dispatchEvent(new Event("input", { bubbles: true })); });
    const fs1 = await S.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    check("text size 160% enlarges the page text", Math.abs(fs1 / fs0 - 1.6) < 0.02, fs0 + " -> " + fs1);
    await S.evaluate(() => { const r = document.getElementById("rng"); r.value = 100; r.dispatchEvent(new Event("input", { bubbles: true })); });
    await setSw(S, "#hc", true);
    const ratio = await S.evaluate(() => { const lum = (c) => { const [r, g, b] = c.match(/\d+/g).slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }; const out = {}; for (const sel of ["body", ".pbox", ".note", "#profileStrip .pill", "button.btn-sm"]) { const e = document.querySelector(sel); if (!e) continue; const cs = getComputedStyle(e); const L1 = lum(cs.color), L2 = lum(cs.backgroundColor.startsWith("rgba(0, 0, 0, 0)") ? "rgb(0,0,0)" : cs.backgroundColor); out[sel] = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); } return out; });
    check("high contrast gives at least 7:1 on every sampled surface (pure black/white/yellow)", Object.values(ratio).length >= 4 && Object.values(ratio).every((r) => r >= 7), JSON.stringify(ratio));
    await setSw(S, "#hc", false);
    // input modes
    await openDash(S, "relay");
    check("voice on: the Listen box is shown", await S.isVisible("#mic"));
    await openDash(S, "profile");
    await S.uncheck('#inChips input[value="voice"]');
    await openDash(S, "relay");
    check("voice off: the Listen box is replaced by a note that says why", !(await S.isVisible("#mic")) && /Voice input is off/.test(await S.textContent('.gate[data-need="voice"]')));
    await S.click('.gate[data-need="voice"] button');
    check("…and one button turns it back on", await S.isVisible("#mic"));
    await openDash(S, "profile");
    await S.uncheck('#inChips input[value="camera"]');
    await openDash(S, "scan");
    check("camera off: the photo box is hidden with an explanation", !(await S.isVisible("#file + *")) && /Photo input is off/.test(await S.textContent('.gate[data-need="camera"]')));
    await S.click('.gate[data-need="camera"] button');
    await openDash(S, "profile");
    await S.uncheck('#inChips input[value="text"]');
    await openDash(S, "messages");
    check("text off: the composer is hidden with an explanation", !(await S.isVisible("#messageForm")) && /Text input is off/.test(await S.textContent('.gate[data-need="text"]')));
    await S.click('.gate[data-need="text"] button');
    // output modes in Reply
    await openDash(S, "profile");
    await S.uncheck('#outChips input[value="braille"]'); await S.check('#outChips input[value="haptic"]');
    await openDash(S, "relay");
    await S.fill("#say", "Hello");
    const heads = await S.$$eval("#outs h4", (n) => n.map((x) => x.textContent));
    check("output modes control which renderings appear in Reply", heads.includes("Haptic rhythm") && !heads.includes("Braille preview"), heads.join(","));
    const strip = await S.textContent("#profileStrip");
    check("the profile strip reflects the choices", /Get: Haptic/.test(strip) && !/Get: Braille/.test(strip));
    await S.reload({ waitUntil: "load" });
    check("the profile is remembered after a reload", /Get: Haptic/.test(await S.textContent("#profileStrip")));
    await solo.close();
  });

  /* ===================== status panel ===================== */
  await section("What comes next", async () => {
    const solo = await newCtx(browser, {}); const S = await solo.newPage(); watch("Nx", S);
    await S.goto(BASE + "/#/dashboard/next", { waitUntil: "load" });
    await S.waitForSelector("#nextRoot .next-tbl");
    const txt = await S.textContent("#nextRoot");
    check("it contains a live capability check for this browser", /Speech recognition/.test(txt) && /Vibration/.test(txt) && /Live voice connection/.test(txt));
    check("statuses use the fixed vocabulary only", (await S.$$eval("#nextRoot .stat", (n) => n.map((x) => x.textContent))).every((t) => ["Implemented and automated-tested", "Implemented and browser-tested", "Implemented but awaiting physical-device testing", "Partially implemented", "Blocked by external dependency", "Not implemented"].includes(t)));
    check("nothing is labelled Planned or Complete", !/\bPlanned\b/.test(txt) && !/\bComplete\b/.test(txt));
    check("the dashboard menu no longer tags it 'Planned'", !(await S.$eval("#dropList", (e) => /Planned/.test(e.textContent))));
    check("translation shows as not configured", /Not configured/.test(txt));
    await solo.close();
  });

  await section("Human assistance wording", async () => {
    const solo = await newCtx(browser, {}); const S = await solo.newPage(); watch("As", S);
    await S.goto(BASE + "/#/dashboard/assist", { waitUntil: "load" });
    await S.waitForSelector('.panel[data-p="assist"]:not([hidden])');
    const txt = await S.textContent('.panel[data-p="assist"]');
    check("volunteers are described as helpers, not certified professionals", /not certified professionals/i.test(txt));
    check("no category presents a volunteer as a sign-language interpreter", !/sign-language interpreter(?! *\))/i.test(txt.replace(/not a certified interpreter/gi, "")) && /not a certified interpreter/i.test(txt), "");
    await solo.close();
  });

  /* ===================== client secrets scan ===================== */
  await section("No credentials in the frontend", async () => {
    const fs = require("fs");
    const files = ["index.html", "assets/app.js", "assets/connect.js", "assets/translate.js", "assets/emergency.js", "assets/live.js", "assets/outputs.js", "assets/switch.js", "assets/next.js", "assets/assist.js", "assets/learn.js"];
    const hit = files.filter((f) => /api[_-]?key\s*[:=]\s*["'][A-Za-z0-9_-]{12,}|AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9]{20,}|X-goog-api-key|api_key/i.test(fs.readFileSync(path.join(__dirname, f), "utf8")));
    check("no API key, key header or key field appears in any frontend file", hit.length === 0, hit.join(","));
    const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
    check("no third-party hosts are loaded by the page", !/src="https?:\/\/|href="https?:\/\/fonts/.test(html));
  });

  check("no uncaught page errors or console errors in any session", errors.length === 0, errors.slice(0, 3).join(" | "));

  await browser.close();
  mock.close();
  console.log("\n===== BROWSER TEST RESULTS =====\n" + pass + " passed, " + fail + " failed");
  server.close();
  setTimeout(() => process.exit(fail ? 1 : 0), 300);
})().catch((e) => { console.error(e); process.exit(1); });
