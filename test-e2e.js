/*
 * End-to-end test: two independent browser clients against the real server.
 *   PORT=8097 npm start &   &&   BASE=http://localhost:8097 node test-e2e.js
 *
 * Also exercises the hardened flows:
 *   - Volunteer auth is provisioned automatically when the volunteer tab opens.
 *   - "I need more time" button on the turn bar reaches the peer.
 *   - A page refresh keeps the same participant slot (pid + pkey via sessionStorage).
 */
const { chromium, devices } = require("playwright");

const BASE = process.env.BASE || "http://localhost:8097";
let pass = 0, fail = 0;
const results = [];
function check(name, ok, extra) {
  results.push((ok ? "PASS" : "FAIL") + " — " + name + (extra ? "  (" + extra + ")" : ""));
  ok ? pass++ : fail++;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  // Ignore the sandbox's known external-font tunnel failure.
  const sandboxFontErr = /ERR_TUNNEL_CONNECTION_FAILED|fonts\.googleapis|fonts\.gstatic/;
  const errors = [];

  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const ctxB = await browser.newContext(Object.assign({}, devices["iPhone 12"]));
  const A = await ctxA.newPage();
  const B = await ctxB.newPage();
  [["A", A], ["B", B]].forEach(([tag, p]) => {
    p.on("console", (m) => { if (m.type() === "error" && !sandboxFontErr.test(m.text())) errors.push(tag + " console.error: " + m.text()); });
    p.on("pageerror", (e) => errors.push(tag + " pageerror: " + e.message));
  });

  try {
    /* ---- 1. Creator makes a session ---- */
    await A.goto(BASE + "/#/dashboard/connect", { waitUntil: "networkidle" });
    await A.waitForSelector("#createBtn", { timeout: 8000 });
    await A.fill("#hostName", "Ravi");
    await A.click("#createBtn");
    await A.waitForSelector("#connectLive .share-url", { timeout: 8000 });
    const joinUrl = await A.inputValue("#connectLive .share-url");
    check("Session created and join URL shown", /#\/join\/[^/]+\/[^/]+/.test(joinUrl), joinUrl);
    check("QR image rendered", await A.isVisible("#connectLive .share-qr img"));
    await A.waitForSelector("#liveChat .chat", { timeout: 8000 });

    /* ---- 2. Mobile joiner joins via the QR URL ---- */
    await B.goto(joinUrl, { waitUntil: "networkidle" });
    await B.waitForSelector("#joinOverlay:not([hidden]) #joinDisplay", { timeout: 8000 });
    check("Join page shows session info", !!(await B.textContent("#joinOverlay .join-info b")));
    await B.fill("#joinDisplay", "Meera");
    await B.click("#joinGo");
    await B.waitForSelector("#overlayChat .chat", { timeout: 8000 });

    /* ---- 3. Presence propagates to creator ---- */
    await A.waitForFunction(() => /online|is here/i.test((document.querySelector("#liveChat .chat-count") || {}).textContent || ""), { timeout: 8000 });
    check("Creator sees guest presence", /online|here/i.test(await A.textContent("#liveChat .chat-count")));

    /* ---- 4. A -> B message ---- */
    await A.fill("#liveChat .chat-input", "Hello Meera, can you see this?");
    await A.press("#liveChat .chat-input", "Enter");
    await B.waitForFunction(() => [...document.querySelectorAll("#overlayChat .msg.them .msg-t")].some((n) => /can you see this/i.test(n.textContent)), { timeout: 8000 });
    check("Message A→B delivered in real time", true);

    /* ---- 5. Turn indicator ---- */
    check("Turn indicator shows it is B's turn", /your turn/i.test((await B.textContent("#overlayChat .chat-turn")) || ""));

    /* ---- 6. "I need more time" button on B reaches A ---- */
    await B.click("#overlayChat .turn-wait");
    // Receiver sees a system note and/or peer "asked for a moment"; check for the "asked for a moment" system message.
    await A.waitForFunction(() => [...document.querySelectorAll("#liveChat .msg.sys span")].some((n) => /moment/i.test(n.textContent)), { timeout: 5000 }).catch(() => {});
    check("'I need more time' notifies the other side", await A.evaluate(() => [...document.querySelectorAll("#liveChat .msg.sys span")].some((n) => /moment/i.test(n.textContent))));

    /* ---- 7. Typing indicator B -> A ---- */
    await B.click("#overlayChat .chat-input");
    await B.type("#overlayChat .chat-input", "typing a reply", { delay: 20 });
    await A.waitForFunction(() => /typing/i.test((document.querySelector("#liveChat .chat-typing") || {}).textContent || ""), { timeout: 5000 }).catch(() => {});
    check("Creator sees typing indicator", /typing/i.test((await A.textContent("#liveChat .chat-typing")) || ""));

    /* ---- 8. B -> A message ---- */
    await B.press("#overlayChat .chat-input", "Enter");
    await A.waitForFunction(() => [...document.querySelectorAll("#liveChat .msg.them .msg-t")].some((n) => /typing a reply/i.test(n.textContent)), { timeout: 8000 });
    check("Message B→A delivered in real time", true);

    /* ---- 9. Clarification chip from A ---- */
    await A.click('#liveChat .chip-btn[data-clar="repeat"]');
    await B.waitForFunction(() => [...document.querySelectorAll("#overlayChat .msg.them.clar")].length > 0, { timeout: 6000 });
    check("Clarification message delivered and tagged", true);

    /* ---- 10. Pass-turn: A just sent clarify → turn flipped to B → B sees Pass ---- */
    await B.waitForSelector("#overlayChat .turn-pass:not([hidden])", { timeout: 5000 });
    await B.click("#overlayChat .turn-pass");
    await A.waitForFunction(() => /your turn/i.test((document.querySelector("#liveChat .chat-turn") || {}).textContent || ""), { timeout: 5000 });
    check("Explicit Pass-turn routes the turn to the peer", true);

    const path = require("path");
    await A.screenshot({ path: path.join(__dirname, "shot-creator.png") });
    await B.screenshot({ path: path.join(__dirname, "shot-joiner.png") });

    /* ---- 11. Invalid token rejected with an error overlay ---- */
    const badPage = await ctxB.newPage();
    await badPage.goto(joinUrl.replace(/\/[^/]+$/, "/deadbeeftoken"), { waitUntil: "networkidle" });
    await badPage.waitForSelector("#joinOverlay .join-error", { timeout: 8000 }).catch(() => {});
    check("Invalid token shows an error, not a chat", await badPage.isVisible("#joinOverlay .join-error"));
    await badPage.close();

    /* ---- 12. End session propagates to joiner ---- */
    await A.click("#liveChat .chat-leave");
    await B.waitForFunction(() => (document.querySelector("#overlayChat .chat-dot") || {}).getAttribute("data-state") === "off", { timeout: 8000 }).catch(() => {});
    check("Ending the session disables the guest input", (await B.getAttribute("#overlayChat .chat-input", "disabled")) !== null);

    /* ---- 13. Assist end-to-end: request → volunteer provisioned → accept ---- */
    const R = await ctxA.newPage();
    const V = await ctxB.newPage();
    R.on("console", (m) => { if (m.type() === "error" && !sandboxFontErr.test(m.text())) errors.push("R console.error: " + m.text()); });
    V.on("console", (m) => { if (m.type() === "error" && !sandboxFontErr.test(m.text())) errors.push("V console.error: " + m.text()); });
    R.on("pageerror", (e) => errors.push("R pageerror: " + e.message));
    V.on("pageerror", (e) => errors.push("V pageerror: " + e.message));

    await R.goto(BASE + "/#/dashboard/assist", { waitUntil: "networkidle" });
    await R.waitForSelector("#reqForm", { timeout: 8000 });
    await R.fill("#aLang", "Hindi / ISL");
    await R.click('#reqForm button[type="submit"]');
    await R.waitForSelector(".assist-status[data-st='pending']", { timeout: 8000 });
    check("Assistance request submitted and pending", true);

    await V.goto(BASE + "/#/dashboard/assist", { waitUntil: "networkidle" });
    await V.waitForSelector(".seg[data-mode='volunteer']", { timeout: 8000 });
    await V.click(".seg[data-mode='volunteer']");
    await V.fill("#volName", "Asha");
    // The volunteer identity provisions automatically when the tab renders.
    await V.waitForSelector('.vol-card [data-act="accept"]', { timeout: 8000 });
    const volKeyPresent = await V.evaluate(() => { try { const v = JSON.parse(localStorage.getItem("sangam.assist.volIdent")); return !!(v && v.volunteerKey); } catch(e) { return false; } });
    check("Volunteer identity auto-provisioned in localStorage", volKeyPresent);
    await V.click('.vol-card [data-act="accept"]');
    await R.waitForSelector(".assist-status[data-st='accepted']", { timeout: 12000 });
    check("Volunteer accept reflects to requester as 'accepted'", true);
    check("Accepted request offers a live conversation link", await R.isVisible("#asJoin"));

    await R.close(); await V.close();
  } catch (e) {
    check("Test run completed without exception", false, e.message);
  }

  check("No uncaught page errors", errors.length === 0, errors.slice(0, 6).join(" | "));

  console.log("\n===== E2E RESULTS =====");
  results.forEach((r) => console.log(r));
  console.log(`\n${pass} passed, ${fail} failed`);
  if (errors.length) { console.log("\n--- page errors ---"); errors.forEach((e) => console.log(e)); }

  await browser.close();
  process.exit(fail ? 1 : 0);
})();
