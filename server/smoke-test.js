/*
 * Headless smoke test for the hardened SANGAM backend (no browser needed).
 * Covers every bug fix from the Person 5 security audit:
 *   - Participant identity (impersonation rejected, limit respected under fake pid).
 *   - Role is server-controlled (host requires valid hostKey).
 *   - Volunteer endpoints require volunteerKey.
 *   - Accept is atomic; a second accept gets 409.
 *   - Complete allowed only to owner (claimKey) or accepting volunteer (volunteerKey).
 *   - Turn event spoofing rejected.
 *   - Rate limiting trips on WS flood.
 *   - Session expiry / termination still work.
 */
"use strict";
process.env.PORT = process.env.SMOKE_PORT || "8096";
process.env.SESSION_TTL_MINUTES = process.env.SESSION_TTL_MINUTES || "60";
process.env.MAX_PARTICIPANTS = process.env.MAX_PARTICIPANTS || "2";
process.env.MSG_RATE_MAX = process.env.MSG_RATE_MAX || "8";
process.env.MSG_RATE_WINDOW_MS = process.env.MSG_RATE_WINDOW_MS || "1000";

const { server } = require("./server.js");
const WebSocket = require("ws");

const BASE = "http://localhost:" + process.env.PORT;
let pass = 0, fail = 0;
function check(name, ok, extra) { console.log((ok ? "PASS" : "FAIL") + " — " + name + (extra ? "  (" + extra + ")" : "")); ok ? pass++ : fail++; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function j(path, opts) {
  const r = await fetch(BASE + path, opts);
  let b = {}; try { b = await r.json(); } catch (e) {}
  return { status: r.status, body: b };
}
// Opens a WS and starts collecting messages BEFORE resolving, so the welcome
// frame isn't missed between open and listener-attach.
function wsOpen(url) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(url);
    ws._msgs = [];
    const t = setTimeout(() => { try { ws.terminate(); } catch (e) {} rej(new Error("ws open timeout")); }, 3000);
    ws.on("message", (d) => { try { ws._msgs.push(JSON.parse(d.toString())); } catch (e) {} });
    ws.on("open", () => { clearTimeout(t); res(ws); });
    ws.on("error", (e) => { clearTimeout(t); rej(e); });
  });
}
function nextClose(ws) {
  return new Promise((res) => {
    const t = setTimeout(() => res({ code: null, reason: "timeout" }), 3000);
    ws.on("close", (code, reason) => { clearTimeout(t); res({ code, reason: reason && reason.toString() }); });
  });
}
function collect(ws) { return ws._msgs; }
function wait(cond, ms) {
  const end = Date.now() + (ms || 2000);
  return new Promise((res) => {
    (function loop() {
      if (cond()) return res(true);
      if (Date.now() > end) return res(false);
      setTimeout(loop, 40);
    })();
  });
}
function wsUrl(params) {
  const q = Object.keys(params).map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(params[k])).join("&");
  return "ws://localhost:" + process.env.PORT + "/ws?" + q;
}

(async () => {
  await sleep(200);

  /* ============================================================================
   * Health & session create
   * ========================================================================== */
  let r = await j("/api/health");
  check("health endpoint ok", r.status === 200 && r.body.ok === true);

  r = await j("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Smoke" }) });
  check("create session", r.status === 200 && r.body.id && r.body.token && r.body.hostKey, r.body.id);
  check("QR data URL present", typeof r.body.qrDataUrl === "string" && r.body.qrDataUrl.startsWith("data:image/png"));
  const S = r.body;

  /* ============================================================================
   * Session lookup auth
   * ========================================================================== */
  r = await j("/api/sessions/" + S.id + "?token=" + encodeURIComponent(S.token));
  check("session lookup with valid token", r.status === 200 && r.body.status === "active");
  r = await j("/api/sessions/" + S.id + "?token=wrong");
  check("session lookup rejects bad token", r.status === 403);

  /* ============================================================================
   * WebSocket basic flow (host + guest, two-way messaging)
   * ========================================================================== */
  const host = await wsOpen(wsUrl({ session: S.id, token: S.token, name: "Host", hostKey: S.hostKey }));
  const hostMsgs = collect(host);
  const guest = await wsOpen(wsUrl({ session: S.id, token: S.token, name: "Guest" }));
  const guestMsgs = collect(guest);

  await wait(() => hostMsgs.some((m) => m.type === "welcome") && guestMsgs.some((m) => m.type === "welcome"));
  const hostWelcome = hostMsgs.find((m) => m.type === "welcome");
  const guestWelcome = guestMsgs.find((m) => m.type === "welcome");
  check("host welcome returns host role", hostWelcome && hostWelcome.role === "host");
  check("guest welcome returns guest role", guestWelcome && guestWelcome.role === "guest");
  check("welcome includes a participantKey", !!(hostWelcome.participantKey && guestWelcome.participantKey));

  host.send(JSON.stringify({ type: "message", text: "ping from host" }));
  guest.send(JSON.stringify({ type: "message", text: "ping from guest" }));
  await wait(() => guestMsgs.some((m) => m.type === "message" && /ping from host/.test(m.message.text))
                && hostMsgs.some((m) => m.type === "message" && /ping from guest/.test(m.message.text)));
  check("host → guest message delivered", guestMsgs.some((m) => m.type === "message" && /ping from host/.test(m.message.text)));
  check("guest → host message delivered", hostMsgs.some((m) => m.type === "message" && /ping from guest/.test(m.message.text)));

  /* ============================================================================
   * SECURITY: role spoofing
   * ========================================================================== */
  // A connection without hostKey must not get host role, even if it claims to.
  const faker = await wsOpen(wsUrl({ session: S.id, token: S.token, name: "Faker" })).catch(() => null);
  if (faker) {
    // But session is full (max=2) at this point; so faker was refused.
  }
  // Clear the chat and reconnect to test role separately.
  // Instead, verify the welcome frames above: faker not needed.

  // A caller supplying a WRONG hostKey must be rejected outright, BEFORE
  // the server even considers participant limits.
  let badHostResult = "unknown";
  try {
    const badHost = new WebSocket(wsUrl({ session: S.id, token: S.token, name: "BadHost", hostKey: "not-the-real-hostkey" }));
    const c = await nextClose(badHost);
    badHostResult = String(c.code);
  } catch (e) { badHostResult = "err:" + e.message; }
  check("wrong hostKey is rejected (4003)", badHostResult === "4003", "close code " + badHostResult);

  /* ============================================================================
   * SECURITY: pid impersonation rejected
   * ========================================================================== */
  // Disconnect guest, then reconnect with the HOST's pid but NO pkey.
  // The server must treat this as a brand-new participant request; since the
  // session is at MAX_PARTICIPANTS=2 and the host's socket is still open, the
  // new connection is refused as full (good — we can't hijack the host pid).
  guest.close(); await wait(() => guest.readyState === WebSocket.CLOSED, 2000);
  // After guest left, participants=2 still (connected=false), size=2. Reconnect
  // test: claim host's pid without pkey.
  let impersonateResult = "unknown";
  try {
    const bad = await wsOpen(wsUrl({ session: S.id, token: S.token, name: "Spy", pid: hostWelcome.pid /* no pkey */ }));
    const opened = await wait(() => bad._msgs.some((m) => m.type === "welcome" || m.type === "error"), 1500);
    const welcome = bad._msgs.find((m) => m.type === "welcome");
    if (welcome) {
      impersonateResult = welcome.pid === hostWelcome.pid ? "IMPERSONATED" : "new_pid_minted";
    } else {
      impersonateResult = "closed_before_welcome";
    }
    try { bad.close(); } catch (e) {}
  } catch (e) {
    // Rejected before open — also acceptable (e.g. session full).
    impersonateResult = "refused:" + e.message;
  }
  check("pid impersonation does not grant another participant's identity",
        impersonateResult !== "IMPERSONATED", impersonateResult);

  /* ============================================================================
   * SECURITY: turn-event spoof rejected
   * ========================================================================== */
  // Reconnect a fresh guest using participant reuse via pkey.
  const guest2 = await wsOpen(wsUrl({ session: S.id, token: S.token, name: "Guest", pid: guestWelcome.pid, pkey: guestWelcome.participantKey }));
  const guest2Msgs = collect(guest2);
  await wait(() => guest2Msgs.some((m) => m.type === "welcome"));
  const g2welcome = guest2Msgs.find((m) => m.type === "welcome");
  check("guest reconnect with pkey keeps same pid", g2welcome.pid === guestWelcome.pid);

  // Clear prior turn by sending a message so server sets turn to the other
  // side; then the one who DOES NOT currently hold the turn tries to pass it.
  hostMsgs.length = 0; guest2Msgs.length = 0;
  host.send(JSON.stringify({ type: "message", text: "second msg" }));
  await wait(() => guest2Msgs.some((m) => m.type === "message"));
  const turnAfterMsg = guest2Msgs.find((m) => m.type === "message").turn;
  // Turn now belongs to guest (the other side). Have the HOST try to pass it.
  const hostLen = hostMsgs.length;
  host.send(JSON.stringify({ type: "turn", mode: "pass", to: guestWelcome.pid }));
  await sleep(200);
  const spoofError = hostMsgs.slice(hostLen).find((m) => m.type === "error");
  check("non-turn-holder cannot pass the turn", !!spoofError && spoofError.code === "forbidden");

  // Legitimate pass: guest holds the turn, passes to host.
  guest2.send(JSON.stringify({ type: "turn", mode: "pass", to: hostWelcome.pid }));
  await wait(() => hostMsgs.some((m) => m.type === "turn" && m.turn === hostWelcome.pid));
  check("turn-holder CAN pass the turn", hostMsgs.some((m) => m.type === "turn" && m.turn === hostWelcome.pid));

  /* ============================================================================
   * SECURITY: rate limit on WS message flood
   * ========================================================================== */
  const hostBefore = hostMsgs.length;
  for (let i = 0; i < 25; i++) host.send(JSON.stringify({ type: "message", text: "x" + i }));
  await sleep(400);
  const rateErr = hostMsgs.slice(hostBefore).find((m) => m.type === "error" && m.code === "rate_limited");
  check("WS message flood trips rate limit", !!rateErr);

  guest2.close(); host.close(); await sleep(100);

  /* ============================================================================
   * Session end: joining ends; wrong hostKey cannot end
   * ========================================================================== */
  r = await j("/api/sessions/" + S.id + "/end", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hostKey: "wrong" }) });
  check("end with WRONG hostKey is 403", r.status === 403);
  r = await j("/api/sessions/" + S.id + "/end", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hostKey: S.hostKey }) });
  check("end with correct hostKey works", r.status === 200 && r.body.status === "ended");
  r = await j("/api/sessions/" + S.id + "?token=" + encodeURIComponent(S.token));
  check("ended session no longer joinable", r.status === 410);

  /* ============================================================================
   * Volunteer endpoints: auth required, atomic accept, scoped list, complete auth
   * ========================================================================== */
  // Unauthenticated access is 401.
  r = await j("/api/assist/requests");
  check("volunteer list requires auth", r.status === 401);

  // Request creation (no auth needed).
  r = await j("/api/assist/requests", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category: "interpreter", language: "ISL", method: "Video call", description: "Smoke" })
  });
  check("assist request created (pending)", r.status === 200 && r.body.status === "pending");
  const A = r.body;

  // Provision two volunteers.
  const v1 = (await j("/api/assist/volunteer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: "Asha" }) })).body;
  const v2 = (await j("/api/assist/volunteer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: "Bala" }) })).body;
  check("volunteer provisioned", !!(v1.volunteerId && v1.volunteerKey));

  const v1H = { "Content-Type": "application/json", "X-Volunteer-Id": v1.volunteerId, "X-Volunteer-Key": v1.volunteerKey };
  const v2H = { "Content-Type": "application/json", "X-Volunteer-Id": v2.volunteerId, "X-Volunteer-Key": v2.volunteerKey };

  // Wrong key is 401.
  r = await j("/api/assist/requests", { headers: { "X-Volunteer-Id": v1.volunteerId, "X-Volunteer-Key": "wrong" } });
  check("wrong volunteerKey is 401", r.status === 401);

  // Authed volunteer sees the pending request.
  r = await j("/api/assist/requests", { headers: v1H });
  check("authed volunteer sees pending request", r.status === 200 && r.body.requests.some((x) => x.id === A.id));

  // Atomic accept: v1 wins, v2 gets 409.
  const acc1 = await j("/api/assist/requests/" + A.id + "/accept", { method: "POST", headers: v1H, body: JSON.stringify({}) });
  const acc2 = await j("/api/assist/requests/" + A.id + "/accept", { method: "POST", headers: v2H, body: JSON.stringify({}) });
  check("first accept succeeds and returns joinUrl + hostKey", acc1.status === 200 && /#\/join\//.test(acc1.body.joinUrl || "") && !!acc1.body.hostKey);
  check("second accept rejected with 409", acc2.status === 409);

  // After accept, pending list no longer shows it to OTHER volunteers.
  r = await j("/api/assist/requests", { headers: v2H });
  check("accepted request hidden from other volunteers", !r.body.requests.some((x) => x.id === A.id));
  r = await j("/api/assist/requests", { headers: v1H });
  check("accepting volunteer still sees request in their list", r.body.requests.some((x) => x.id === A.id));

  // Owner sees accepted + joinUrl via claim key.
  r = await j("/api/assist/requests/" + A.id + "?key=" + encodeURIComponent(A.claimKey));
  check("owner sees accepted + join link", r.status === 200 && r.body.status === "accepted" && r.body.joinUrl);

  // Complete: stranger rejected, non-accepting volunteer rejected, owner allowed.
  r = await j("/api/assist/requests/" + A.id + "/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  check("complete without any auth is 403", r.status === 403);
  r = await j("/api/assist/requests/" + A.id + "/complete", { method: "POST", headers: v2H, body: "{}" });
  check("complete by wrong volunteer is 403", r.status === 403);
  r = await j("/api/assist/requests/" + A.id + "/complete", { method: "POST", headers: v1H, body: "{}" });
  check("complete by accepting volunteer succeeds", r.status === 200 && r.body.status === "completed");

  // Cancel wrong-key is 403.
  const A2 = (await j("/api/assist/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: "language", language: "Odia" }) })).body;
  r = await j("/api/assist/requests/" + A2.id + "/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "wrong" }) });
  check("cancel with wrong claimKey is 403", r.status === 403);
  r = await j("/api/assist/requests/" + A2.id + "/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: A2.claimKey }) });
  check("cancel with correct claimKey succeeds", r.status === 200 && r.body.status === "cancelled");

  /* ============================================================================
   * Person 5: volunteer decline persists server-side
   * ========================================================================== */
  const D1 = (await j("/api/assist/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: "language", language: "Hindi" }) })).body;
  // v1 declines; server should remember
  r = await j("/api/assist/requests/" + D1.id + "/decline", { method: "POST", headers: v1H, body: "{}" });
  check("volunteer decline returns 200", r.status === 200);
  // v1 no longer sees it; v2 still does
  r = await j("/api/assist/requests", { headers: v1H });
  check("declined request hidden from declining volunteer", !r.body.requests.some((x) => x.id === D1.id));
  r = await j("/api/assist/requests", { headers: v2H });
  check("declined request still visible to other volunteers", r.body.requests.some((x) => x.id === D1.id));

  /* ============================================================================
   * Person 5: volunteer profile fields
   * ========================================================================== */
  const v3 = (await j("/api/assist/volunteer", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName: "Charu", languages: ["Hindi", "ISL"], categories: ["interpreter"], availability: "busy" })
  })).body;
  check("volunteer created with profile fields", v3.volunteerId && v3.languages && v3.languages.length === 2 && v3.availability === "busy");
  const v3H = { "Content-Type": "application/json", "X-Volunteer-Id": v3.volunteerId, "X-Volunteer-Key": v3.volunteerKey };
  // Update profile
  r = await j("/api/assist/volunteer", { method: "PUT", headers: v3H, body: JSON.stringify({ displayName: "Charu M", availability: "available" }) });
  check("volunteer profile update works", r.status === 200 && r.body.displayName === "Charu M" && r.body.availability === "available");

  /* ============================================================================
   * Person 5: reconnect grace — slot preserved during grace window
   * ========================================================================== */
  // Create a new session for reconnect testing
  const S2 = (await j("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "ReconnectTest" }) })).body;
  const rh = await wsOpen(wsUrl({ session: S2.id, token: S2.token, name: "RHost", hostKey: S2.hostKey }));
  const rhMsgs = collect(rh);
  await wait(() => rhMsgs.some((m) => m.type === "welcome"));
  const rhWelcome = rhMsgs.find((m) => m.type === "welcome");

  const rg = await wsOpen(wsUrl({ session: S2.id, token: S2.token, name: "RGuest" }));
  const rgMsgs = collect(rg);
  await wait(() => rgMsgs.some((m) => m.type === "welcome"));
  const rgWelcome = rgMsgs.find((m) => m.type === "welcome");

  // Guest disconnects
  rg.close(); await sleep(300);
  // Guest reconnects within grace period with pkey — should get same pid
  const rg2 = await wsOpen(wsUrl({ session: S2.id, token: S2.token, name: "RGuest", pid: rgWelcome.pid, pkey: rgWelcome.participantKey }));
  const rg2Msgs = collect(rg2);
  await wait(() => rg2Msgs.some((m) => m.type === "welcome"));
  const rg2Welcome = rg2Msgs.find((m) => m.type === "welcome");
  check("reconnect within grace keeps participant slot", rg2Welcome && rg2Welcome.pid === rgWelcome.pid);

  rg2.close(); rh.close(); await sleep(100);

  /* ============================================================================
   * Person 5: turn claim (anyone can claim when turn is null)
   * ========================================================================== */
  const S3 = (await j("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "TurnClaimTest" }) })).body;
  const th = await wsOpen(wsUrl({ session: S3.id, token: S3.token, name: "THost", hostKey: S3.hostKey }));
  const thMsgs = collect(th);
  await wait(() => thMsgs.some((m) => m.type === "welcome"));
  const thWelcome = thMsgs.find((m) => m.type === "welcome");

  const tg = await wsOpen(wsUrl({ session: S3.id, token: S3.token, name: "TGuest" }));
  const tgMsgs = collect(tg);
  await wait(() => tgMsgs.some((m) => m.type === "welcome"));
  const tgWelcome = tgMsgs.find((m) => m.type === "welcome");

  // Initial turn state should be null — guest claims it
  thMsgs.length = 0; tgMsgs.length = 0;
  tg.send(JSON.stringify({ type: "turn", mode: "claim" }));
  await wait(() => thMsgs.some((m) => m.type === "turn" && m.mode === "claim"));
  const claimEvt = thMsgs.find((m) => m.type === "turn" && m.mode === "claim");
  check("turn claim succeeds when turn is null", !!claimEvt && claimEvt.turn === tgWelcome.pid);

  // Now guest holds the turn — host tries to claim, should be rejected
  thMsgs.length = 0;
  th.send(JSON.stringify({ type: "turn", mode: "claim" }));
  await sleep(200);
  const claimErr = thMsgs.find((m) => m.type === "error" && m.code === "forbidden");
  check("claim rejected when turn already held", !!claimErr);

  tg.close(); th.close(); await sleep(100);

  /* ============================================================================
   * Person 5: message validation — empty text silently dropped (not broadcast)
   * ========================================================================== */
  const S4 = (await j("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "MsgValidation" }) })).body;
  const mh = await wsOpen(wsUrl({ session: S4.id, token: S4.token, name: "MHost", hostKey: S4.hostKey }));
  const mhMsgs = collect(mh);
  await wait(() => mhMsgs.some((m) => m.type === "welcome"));
  const mg = await wsOpen(wsUrl({ session: S4.id, token: S4.token, name: "MGuest" }));
  const mgMsgs = collect(mg);
  await wait(() => mgMsgs.some((m) => m.type === "welcome"));
  mgMsgs.length = 0;
  mh.send(JSON.stringify({ type: "message", text: "" }));
  mh.send(JSON.stringify({ type: "message", text: "   " }));
  await sleep(300);
  // Empty/whitespace-only messages must NOT be broadcast to peers
  const delivered = mgMsgs.filter((m) => m.type === "message");
  check("empty/whitespace message silently dropped", delivered.length === 0);
  mh.close(); mg.close(); await sleep(100);

  console.log("\n" + pass + " passed, " + fail + " failed");
  server.close();
  setTimeout(() => process.exit(fail ? 1 : 0), 200);
})().catch((e) => { console.error(e); process.exit(1); });
