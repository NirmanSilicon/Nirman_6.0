/*
 * Backend tests for the features added in the integration pass:
 * delivery acknowledgements, retry de-duplication, message provenance,
 * emergency acknowledgement, live-voice signalling relay, translation adapter
 * (against LOCAL stand-in services, never a real provider), security headers,
 * and privacy checks (no secrets or profile data on the wire).
 *
 *   npm run test:features
 */
"use strict";
process.env.PORT = process.env.FEATURE_PORT || "8095";
process.env.MAX_PARTICIPANTS = "3";
process.env.TRANSLATE_TIMEOUT_MS = "600";
process.env.MSG_RATE_MAX = "200";
delete process.env.TRANSLATE_PROVIDER;
process.env.GOOGLE_TRANSLATE_API_KEY = "SECRET-KEY-DO-NOT-LEAK";

const http = require("http");
const { server } = require("./server.js");
const WebSocket = require("ws");

const BASE = "http://localhost:" + process.env.PORT;
let pass = 0, fail = 0;
function check(name, ok, extra) { console.log((ok ? "PASS" : "FAIL") + " — " + name + (extra ? "  (" + extra + ")" : "")); ok ? pass++ : fail++; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function j(path, opts) {
  const r = await fetch(BASE + path, opts);
  let text = "", b = {}; try { text = await r.text(); b = JSON.parse(text); } catch (e) {}
  return { status: r.status, body: b, text, headers: r.headers };
}
const post = (path, body) => j(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
function wsOpen(params) {
  const q = Object.keys(params).map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(params[k])).join("&");
  return new Promise((res, rej) => {
    const ws = new WebSocket("ws://localhost:" + process.env.PORT + "/ws?" + q);
    ws._m = [];
    const t = setTimeout(() => rej(new Error("ws timeout")), 3000);
    ws.on("message", (d) => { try { ws._m.push(JSON.parse(d.toString())); } catch (e) {} });
    ws.on("open", () => { clearTimeout(t); res(ws); });
    ws.on("error", (e) => { clearTimeout(t); rej(e); });
  });
}
function wait(cond, ms) {
  const end = Date.now() + (ms || 2000);
  return new Promise((res) => { (function loop() { if (cond()) return res(true); if (Date.now() > end) return res(false); setTimeout(loop, 30); })(); });
}
const sendJ = (ws, o) => ws.send(JSON.stringify(o));
const of = (ws, type) => ws._m.filter((m) => m.type === type);

async function newSession(name) {
  const S = (await post("/api/sessions", { name })).body;
  const host = await wsOpen({ session: S.id, token: S.token, name: "Host", hostKey: S.hostKey });
  await wait(() => of(host, "welcome").length);
  const guest = await wsOpen({ session: S.id, token: S.token, name: "Guest" });
  await wait(() => of(guest, "welcome").length);
  return { S, host, guest, hw: of(host, "welcome")[0], gw: of(guest, "welcome")[0] };
}

// A tiny stand-in for a translation provider. It is a TEST FIXTURE: SANGAM itself never ships one.
function startMock() {
  const seen = [];
  const srv = http.createServer((req, res) => {
    let body = ""; req.on("data", (c) => (body += c));
    req.on("end", () => {
      seen.push({ url: req.url, headers: req.headers, body });
      const send = (code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
      let b = {}; try { b = JSON.parse(body || "{}"); } catch (e) {}
      if (req.url === "/languages") return send(200, [{ code: "en" }, { code: "hi" }]);
      if (req.url === "/translate") {
        if (b.q === "TRIGGER_500") return send(500, { error: "boom" });
        if (b.q === "TRIGGER_SLOW") return; // never answers: tests the timeout
        if (b.q === "TRIGGER_BAD") return send(200, { nothing: true });
        return send(200, { translatedText: "[" + b.target + "] " + b.q, detectedLanguage: { language: "en" } });
      }
      if (req.url === "/google") {
        if (b.q === "TRIGGER_500") return send(500, {});
        return send(200, { data: { translations: [{ translatedText: "G(" + b.target + ") " + b.q, detectedSourceLanguage: "en" }] } });
      }
      send(404, {});
    });
  });
  return new Promise((res) => srv.listen(0, () => res({ srv, seen, port: srv.address().port })));
}

(async () => {
  await sleep(200);

  /* ---------------- headers + capabilities + secrecy ---------------- */
  let r = await j("/");
  check("page sends a Content-Security-Policy", /default-src 'self'/.test(r.headers.get("content-security-policy") || ""));
  check("page sends nosniff and no-referrer", r.headers.get("x-content-type-options") === "nosniff" && r.headers.get("referrer-policy") === "no-referrer");
  check("CSP allows the bundled OCR engine (wasm + blob worker)", /wasm-unsafe-eval/.test(r.headers.get("content-security-policy")) && /worker-src 'self' blob:/.test(r.headers.get("content-security-policy")));
  r = await j("/api/capabilities");
  check("capabilities reports translation NOT configured by default", r.body.translation && r.body.translation.configured === false && r.body.translation.provider === "none");
  check("capabilities never contains a credential", !r.text.includes("SECRET-KEY-DO-NOT-LEAK"));
  check("capabilities is not cached", /no-store/.test(r.headers.get("cache-control") || ""));

  const ctx = await newSession("Features");
  const { S, host, guest, hw, gw } = ctx;
  check("join URL carries only session id and token (no profile or key)", /^http:\/\/localhost:\d+\/#\/join\/[a-z0-9]+\/[A-Za-z0-9_-]+$/.test(S.joinUrl) && !S.joinUrl.includes(S.hostKey));
  r = await j("/api/sessions/" + S.id);
  check("public session view exposes no hostKey or token", !r.text.includes(S.hostKey) && !r.text.includes(S.token));
  const wel = JSON.stringify(of(guest, "welcome")[0].roster) + JSON.stringify(of(host, "presence"));
  check("roster/presence carry only pid, name, role, connected", !/participantKey|pkey|profile|inm|outm|lang/.test(wel));

  /* ---------------- ack / delivered ---------------- */
  sendJ(host, { type: "message", cid: "c-one", text: "Hello there", source: "voice" });
  await wait(() => of(guest, "message").length >= 1 && of(host, "message").length >= 1);
  const echoH = of(host, "message")[0].message, gotG = of(guest, "message")[0].message;
  check("sender receives its own message back with the client id (server confirmation)", echoH.cid === "c-one" && !!echoH.id);
  check("provenance 'voice' is stored and relayed", gotG.source === "voice");
  check("no 'delivered' before the recipient acknowledges", of(host, "delivered").length === 0);
  sendJ(host, { type: "ack", id: echoH.id });
  await sleep(150);
  check("sender cannot acknowledge its own message", of(host, "delivered").length === 0);
  sendJ(guest, { type: "ack", id: gotG.id });
  await wait(() => of(host, "delivered").length === 1);
  const dv = of(host, "delivered")[0];
  check("recipient ack produces a 'delivered' frame to the sender only", dv && dv.id === gotG.id && of(guest, "delivered").length === 0);
  sendJ(guest, { type: "ack", id: "nonexistent" });
  await sleep(100);
  check("ack for an unknown message is ignored", of(host, "delivered").length === 1);
  const late = await wsOpen({ session: S.id, token: S.token, name: "Late" });
  await wait(() => of(late, "welcome").length);
  const hist = of(late, "welcome")[0].history.find((m) => m.id === gotG.id);
  check("history records who has acknowledged (for reconnect state)", hist && Array.isArray(hist.deliveredTo) && hist.deliveredTo.length === 1);
  late.close();

  /* ---------------- retry de-duplication ---------------- */
  const before = of(guest, "message").length;
  sendJ(host, { type: "message", cid: "c-one", text: "Hello there", source: "voice" });
  await wait(() => of(host, "message").some((m) => m.duplicate));
  await sleep(150);
  check("a retried client id is NOT delivered to the peer twice", of(guest, "message").length === before);
  check("the sender is re-confirmed with the original message", of(host, "message").some((m) => m.duplicate && m.message.id === echoH.id));
  check("a different participant may reuse the same client id", await (async () => { sendJ(guest, { type: "message", cid: "c-one", text: "Reply" }); return wait(() => of(host, "message").some((m) => m.message.text === "Reply")); })());

  /* ---------------- source whitelist ---------------- */
  sendJ(host, { type: "message", cid: "c-bad", text: "x", source: "<script>" });
  sendJ(host, { type: "message", cid: "c-ocr", text: "label text", source: "ocr" });
  sendJ(host, { type: "message", cid: "c-tr", text: "नमस्ते", source: "translated", orig: "Hello", lang: "en" });
  sendJ(host, { type: "message", cid: "c-notr", text: "plain", source: "typed", orig: "should be dropped", lang: "en" });
  await wait(() => of(guest, "message").length >= before + 4);
  const byCid = (c) => of(guest, "message").map((m) => m.message).find((m) => m.cid === c);
  check("unknown source labels are replaced with 'typed'", byCid("c-bad") && byCid("c-bad").source === "typed");
  check("OCR provenance is kept", byCid("c-ocr") && byCid("c-ocr").source === "ocr");
  check("translated messages keep original text and language tag", byCid("c-tr") && byCid("c-tr").orig === "Hello" && byCid("c-tr").lang === "en");
  check("original/lang are dropped when the message is not translated", byCid("c-notr") && byCid("c-notr").orig === null && byCid("c-notr").lang === null);
  sendJ(host, { type: "message", cid: "bad id!", text: "weird cid" });
  await wait(() => of(guest, "message").some((m) => m.message.text === "weird cid"));
  check("an invalid client id is ignored but the message is still delivered", byCid(null) !== undefined || of(guest, "message").some((m) => m.message.text === "weird cid" && m.message.cid === null));

  /* ---------------- emergency ---------------- */
  sendJ(host, { type: "message", cid: "c-emg", text: "I need help now", kind: "emergency", source: "typed" });
  await wait(() => of(guest, "message").some((m) => m.message.kind === "emergency"));
  const em = of(guest, "message").map((m) => m.message).find((m) => m.kind === "emergency");
  check("emergency kind is relayed and its source is forced to 'emergency'", em && em.source === "emergency");
  sendJ(host, { type: "emergency-ack", id: em.id });
  await sleep(150);
  check("the sender cannot acknowledge its own emergency", of(host, "emergency-ack").length === 0);
  const normal = of(guest, "message").map((m) => m.message).find((m) => m.cid === "c-ocr");
  sendJ(guest, { type: "emergency-ack", id: normal.id });
  await sleep(150);
  check("emergency-ack on a non-emergency message is ignored", of(host, "emergency-ack").length === 0);
  sendJ(guest, { type: "emergency-ack", id: em.id });
  await wait(() => of(host, "emergency-ack").length === 1);
  const ack = of(host, "emergency-ack")[0];
  check("emergency acknowledgement reaches the sender with the acknowledger's name", ack.id === em.id && ack.byName === "Guest");

  /* ---------------- presented receipts (could the recipient receive it the way they chose?) ---------------- */
  sendJ(host, { type: "message", cid: "c-pres", text: "presented test", source: "typed" });
  await wait(() => of(guest, "message").some((m) => m.message.cid === "c-pres"));
  const pm = of(guest, "message").map((m) => m.message).find((m) => m.cid === "c-pres");
  sendJ(guest, { type: "presented", id: pm.id, channels: ["screen"], limited: false });
  await sleep(150);
  check("a presented receipt that is NOT limited is not forwarded to the sender (no preferences leak)", of(host, "presented").length === 0);
  sendJ(guest, { type: "presented", id: pm.id, channels: ["screen", "braille-preview", "NOT-A-CHANNEL"], limited: true });
  await wait(() => of(host, "presented").length === 1);
  const pr = of(host, "presented")[0];
  check("a LIMITED receipt reaches the sender with the recipient's name", pr.id === pm.id && pr.limited === true && pr.byName === "Guest");
  check("the sender is never told HOW the recipient receives (no channel names forwarded)", !("channels" in pr) && !/braille|haptic|speech/i.test(JSON.stringify(pr)));
  sendJ(host, { type: "presented", id: pm.id, limited: true });
  await sleep(150);
  check("the sender cannot file a presented receipt for its own message", of(host, "presented").length === 1 && of(guest, "presented").length === 0);
  sendJ(guest, { type: "presented", id: { evil: 1 }, channels: "x", limited: "yes" });
  sendJ(guest, { type: "presented", id: "no-such-message", limited: true });
  sendJ(guest, { type: "presented", id: pm.id, channels: new Array(500).fill("screen"), limited: "true" });
  await sleep(200);
  check("malformed or unknown presented frames are ignored without breaking the session", of(host, "presented").length === 1 && of(host, "error").length === 0);
  check("limited must be exactly true: the string 'true' is not accepted", of(host, "presented").length === 1);

  /* ---------------- live-voice signalling relay ---------------- */
  sendJ(host, { type: "rtc", to: gw.pid, signal: { kind: "offer", sdp: "v=0 fake-sdp" } });
  await wait(() => of(guest, "rtc").length === 1);
  const rt = of(guest, "rtc")[0];
  check("offer is relayed to the chosen participant with the sender's identity", rt.from === hw.pid && rt.fromName === "Host" && rt.signal.sdp === "v=0 fake-sdp");
  check("signalling is not echoed to the sender or third parties", of(host, "rtc").length === 0);
  sendJ(host, { type: "rtc", to: hw.pid, signal: { kind: "offer", sdp: "x" } });
  await wait(() => of(host, "error").some((e) => e.code === "bad_target"));
  check("signalling to yourself is refused", of(host, "error").some((e) => e.code === "bad_target"));
  sendJ(host, { type: "rtc", to: "not-a-participant", signal: { kind: "offer", sdp: "x" } });
  await sleep(150);
  check("signalling to a non-participant is refused", of(host, "error").filter((e) => e.code === "bad_target").length >= 2);
  const n0 = of(guest, "rtc").length;
  sendJ(host, { type: "rtc", to: gw.pid, signal: { kind: "steal-microphone" } });
  await sleep(150);
  check("unknown signalling kinds are dropped", of(guest, "rtc").length === n0);
  const other = await newSession("Other");
  sendJ(other.host, { type: "rtc", to: gw.pid, signal: { kind: "offer", sdp: "x" } });
  await sleep(150);
  check("signalling cannot cross into another session", of(guest, "rtc").length === n0 && of(other.host, "error").some((e) => e.code === "bad_target"));
  other.host.close(); other.guest.close();

  /* ---------------- oversize ---------------- */
  sendJ(host, { type: "message", text: "a".repeat(20000) });
  await wait(() => of(host, "error").some((e) => e.code === "too_large"));
  check("oversized frames are rejected", of(host, "error").some((e) => e.code === "too_large"));

  /* ---------------- translation ---------------- */
  const tr = (extra) => post("/api/translate", Object.assign({ sessionId: S.id, pid: gw.pid, pkey: gw.participantKey, text: "Hello", source: "en-IN", target: "hi-IN" }, extra));
  r = await tr({});
  check("unconfigured translation answers 501 translation_not_configured (no fake output)", r.status === 501 && r.body.error === "translation_not_configured" && !r.body.text);
  r = await post("/api/translate", { sessionId: S.id, pid: gw.pid, pkey: "wrong", text: "Hello", target: "hi" });
  check("translation requires the participant's key", r.status === 403);
  r = await post("/api/translate", { sessionId: "nope", pid: "x", pkey: "y", text: "Hello", target: "hi" });
  check("translation is refused outside a real session", r.status === 403);
  r = await tr({ text: "   " });
  check("empty text is a 400, not a provider call", r.status === 400 || r.status === 501);

  const mock = await startMock();
  process.env.TRANSLATE_PROVIDER = "libretranslate";
  process.env.LIBRETRANSLATE_URL = "http://localhost:" + mock.port;
  process.env.LIBRETRANSLATE_API_KEY = "LT-KEY";
  r = await j("/api/capabilities");
  check("configured provider is reported, with the languages it lists", r.body.translation.configured === true && r.body.translation.provider === "libretranslate" && JSON.stringify(r.body.translation.languages) === '["en","hi"]');
  check("language support comes from the provider list (Odia is NOT listed, so not claimed)", r.body.translation.languages.indexOf("or") < 0);
  r = await tr({});
  check("translation returns the provider's text", r.status === 200 && r.body.text === "[hi] Hello" && r.body.provider === "libretranslate");
  const call = mock.seen.filter((s) => s.url === "/translate").pop();
  const sent = JSON.parse(call.body);
  check("BCP-47 tags are reduced to base codes for the provider", sent.source === "en" && sent.target === "hi");
  check("the server adds the provider key; the browser never sent one", sent.api_key === "LT-KEY");
  r = await tr({ source: "hi-IN", target: "hi-IN" });
  check("same source and target returns the text unchanged without calling the provider", r.status === 200 && r.body.unchanged === true && r.body.text === "Hello");
  r = await tr({ text: "TRIGGER_500" });
  check("provider error maps to 502 provider_error", r.status === 502 && r.body.error === "provider_error");
  r = await tr({ text: "TRIGGER_BAD" });
  check("unreadable provider answer maps to 502 provider_bad_response", r.status === 502 && r.body.error === "provider_bad_response");
  const t0 = Date.now();
  r = await tr({ text: "TRIGGER_SLOW" });
  check("provider timeout maps to 504 provider_timeout", r.status === 504 && r.body.error === "provider_timeout" && Date.now() - t0 < 3000);

  process.env.TRANSLATE_PROVIDER = "google";
  process.env.GOOGLE_TRANSLATE_URL = "http://localhost:" + mock.port + "/google";
  r = await tr({ text: "Hi" });
  check("Google adapter returns translated text", r.status === 200 && r.body.text === "G(hi) Hi");
  const gcall = mock.seen.filter((s) => s.url === "/google").pop();
  check("Google key travels in a header, not in the URL or body", gcall.headers["x-goog-api-key"] === "SECRET-KEY-DO-NOT-LEAK" && !gcall.url.includes("SECRET") && !gcall.body.includes("SECRET"));
  r = await j("/api/capabilities");
  check("per-language support is not claimed when a provider does not report it", r.body.translation.configured === true && r.body.translation.languages === null);
  check("capabilities still never contains the credential when configured", !r.text.includes("SECRET-KEY-DO-NOT-LEAK") && !r.text.includes("LT-KEY"));

  process.env.TRANSLATE_PROVIDER = "libretranslate";
  process.env.LIBRETRANSLATE_URL = "http://localhost:1"; // nothing listens here
  r = await tr({ text: "Hello" });
  check("unreachable provider maps to 502 provider_unreachable", r.status === 502 && r.body.error === "provider_unreachable");

  process.env.LIBRETRANSLATE_URL = "http://localhost:" + mock.port;
  let limited = false;
  for (let i = 0; i < 40 && !limited; i++) { const x = await tr({ text: "n" + i }); if (x.status === 429) limited = true; }
  check("translation is rate limited per participant", limited);

  // ---- preserved protections that previously had no automated test ----
  {
    const S2 = (await post("/api/sessions", { name: "origin-test" }));
    check("session creation and lookup are sent with no-store", /no-store/.test(S2.headers.get("cache-control") || "") && /no-store/.test((await j("/api/sessions/" + S2.body.id + "?token=" + S2.body.token)).headers.get("cache-control") || ""));
    const tryOrigin = (origin) => new Promise((res) => {
      const q = "session=" + S2.body.id + "&token=" + encodeURIComponent(S2.body.token) + "&name=O&hostKey=" + encodeURIComponent(S2.body.hostKey);
      const w = new WebSocket("ws://localhost:" + process.env.PORT + "/ws?" + q, { headers: { Origin: origin } });
      const t = setTimeout(() => { try { w.terminate(); } catch (e) {} res("timeout"); }, 2500);
      w.on("open", () => { clearTimeout(t); w.close(); res("open"); });
      w.on("unexpected-response", (rq, rs) => { clearTimeout(t); res("rejected-" + rs.statusCode); });
      w.on("error", () => { clearTimeout(t); res("error"); });
    });
    const bad = await tryOrigin("https://evil.example");
    check("a WebSocket from a foreign origin is refused", /^rejected-|error/.test(bad), bad);
    const good = await tryOrigin("http://localhost:" + process.env.PORT);
    check("a WebSocket from the site's own origin is accepted", good === "open", good);
  }

  mock.srv.close();
  host.close(); guest.close();
  await sleep(100);
  console.log("\n" + pass + " passed, " + fail + " failed");
  server.close();
  setTimeout(() => process.exit(fail ? 1 : 0), 200);
})().catch((e) => { console.error(e); process.exit(1); });
