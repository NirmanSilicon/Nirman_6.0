/*
 * API tests for the account layer (server/accounts.js), run against the REAL server as a child process with a temporary
 * database file. No mocks: real HTTP, real cookies, real scrypt, real file persistence, a real restart at the end.
 *
 *   node server/test-accounts.js
 */
"use strict";
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

let pass = 0, fail = 0;
function check(name, ok, extra) { console.log((ok ? "PASS" : "FAIL") + " — " + name + (extra ? "  (" + extra + ")" : "")); ok ? pass++ : fail++; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PORT = 8300 + Math.floor(Math.random() * 400), BASE = "http://127.0.0.1:" + PORT;
const DATA = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "sangam-test-")), "db.json");
const ENV = Object.assign({}, process.env, { PORT: String(PORT), DATA_FILE: DATA, ADMIN_EMAILS: "admin@example.org", DEV_TOKENS: "1", SANGAM_TEST_IPC: "1", NODE_ENV: "test", ACCOUNT_RATE_MULT: "100" });

function startServer() {
  const child = spawn(process.execPath, [path.join(__dirname, "server.js")], { env: ENV, stdio: ["ignore", "pipe", "pipe", "ipc"] });
  let log = ""; child.stdout.on("data", (d) => { log += d; }); child.stderr.on("data", (d) => { log += d; });
  child.getLog = () => log;
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    (async function poll() {
      try { const r = await fetch(BASE + "/api/health"); if (r.ok) return resolve(child); } catch (e) {}
      if (Date.now() - t0 > 8000) return reject(new Error("server did not start: " + log));
      setTimeout(poll, 100);
    })();
  });
}
function stopServer(child) {
  return new Promise((resolve) => { child.once("exit", resolve); child.send("SANGAM_TEST_SHUTDOWN"); setTimeout(() => { try { child.kill(); } catch (e) {} }, 3500); });
}

class Client {
  constructor() { this.jar = {}; }
  async req(method, url, body, opts) {
    opts = opts || {};
    const headers = { "Content-Type": "application/json" };
    if (!opts.noHeader) headers["X-Sangam-Client"] = "1";
    if (opts.origin) headers.Origin = opts.origin;
    const ck = Object.keys(this.jar).map((k) => k + "=" + this.jar[k]).join("; "); if (ck) headers.Cookie = ck;
    const r = await fetch(BASE + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    (r.headers.getSetCookie ? r.headers.getSetCookie() : []).forEach((c) => { const [kv] = c.split(";"), i = kv.indexOf("="); const k = kv.slice(0, i), v = kv.slice(i + 1); if (/Max-Age=0/i.test(c) || !v) delete this.jar[k]; else this.jar[k] = v; });
    let json = null; const text = await r.text(); try { json = JSON.parse(text); } catch (e) {}
    return { status: r.status, json, text, headers: r.headers };
  }
  get(u) { return this.req("GET", u); } post(u, b, o) { return this.req("POST", u, b || {}, o); } put(u, b) { return this.req("PUT", u, b || {}); } del(u, b) { return this.req("DELETE", u, b || {}); }
}

const PW = "Sangam-Test-2026";
async function signUp(email, name, verify) {
  const c = new Client(); const r = await c.post("/api/auth/register", { name, email, password: PW, acceptTerms: true });
  if (verify !== false) await c.post("/api/auth/verify", { token: r.json.dev.verifyToken });
  return { c, reg: r };
}
async function setup(email, name, role, steps) {
  const { c } = await signUp(email, name); await c.post("/api/me/role", { role });
  for (const [step, data] of steps) await c.put("/api/me/onboarding/" + step, data);
  const done = await c.post("/api/me/onboarding/complete"); return { c, me: done.json && done.json.me, done };
}

(async () => {
  let child = await startServer();
  try {
    console.log("## Registration and validation");
    const anon = new Client();
    let r = await anon.get("/api/me"); check("anonymous /api/me says signed out", r.json && r.json.signedIn === false);
    r = await anon.post("/api/auth/register", { name: "", email: "nope", password: "short", acceptTerms: false });
    check("registration with bad data is refused with field-level messages", r.status === 400 && r.json.fields && r.json.fields.name && r.json.fields.email && r.json.fields.password && r.json.fields.acceptTerms);
    r = await anon.post("/api/auth/register", { name: "A", email: "a@example.org", password: "alllettersonly", acceptTerms: true });
    check("a password with no number is refused and says what is missing", r.status === 400 && /number/.test(r.json.fields.password));
    r = await anon.post("/api/auth/register", { name: "Asha Rao", email: "asha@example.org", password: PW, acceptTerms: true }, { noHeader: true });
    check("a state-changing request without the SANGAM client header is refused (CSRF defence)", r.status === 403);
    r = await anon.post("/api/auth/register", { name: "Asha Rao", email: "asha@example.org", password: PW, acceptTerms: true }, { origin: "https://evil.example" });
    check("a request from a different origin is refused", r.status === 403);

    const asha = new Client();
    r = await asha.post("/api/auth/register", { name: "Asha Rao", email: "Asha@Example.org", password: PW, acceptTerms: true });
    check("registration succeeds and signs the person in", r.status === 201 && r.json.me && r.json.me.email === "asha@example.org" && asha.jar.sangam_sid);
    check("the new account is NOT verified yet", r.json.me.verified === false);
    check("no email is claimed to have been sent: the page is told delivery is not configured and given a dev link", r.json.me.emailDelivery === "not_configured" && r.json.dev && /NOT emailed/.test(r.json.dev.note));
    check("the response never contains the password or its hash", !/passwordHash|scrypt\$/.test(r.text) && !r.text.includes(PW));
    const cookieHdr = (await new Client().req("POST", "/api/auth/login", { email: "asha@example.org", password: PW })).headers.get("set-cookie") || "";
    check("the session cookie is HttpOnly and SameSite=Lax", /HttpOnly/i.test(cookieHdr) && /SameSite=Lax/i.test(cookieHdr));
    r = await new Client().post("/api/auth/register", { name: "Other", email: "ASHA@example.org", password: PW, acceptTerms: true });
    check("a duplicate email (any capitalisation) is refused", r.status === 409 && r.json.error === "email_taken");

    console.log("\n## Verification");
    r = await asha.post("/api/me/role", { role: "primary" }); check("an unverified account cannot choose a role", r.status === 403 && r.json.error === "not_verified");
    r = await asha.post("/api/auth/resend-verification"); check("asking again straight away is held back by a cooldown", r.status === 429 && /wait/i.test(r.json.message));
    r = await asha.post("/api/auth/verify", { token: "not-a-real-token" }); check("a wrong verification token is rejected", r.status === 400 && r.json.error === "bad_token");
    const reg2 = await new Client().post("/api/auth/register", { name: "Asha Rao", email: "asha@example.org", password: PW, acceptTerms: true });
    const tok = (await asha.get("/api/me")).json; // keep original token: re-read from a fresh resend is cooldown-blocked, so register a second identity to read a token
    const v = await signUp("verify-me@example.org", "Vera Mehta", false);
    r = await v.c.post("/api/auth/verify", { token: v.reg.json.dev.verifyToken }); check("the real verification token verifies the account", r.status === 200 && r.json.me.verified === true);
    r = await v.c.post("/api/auth/verify", { token: v.reg.json.dev.verifyToken }); check("using the same link again is handled (already verified, not an error page)", r.status === 200 && r.json.alreadyVerified === true);
    r = await v.c.post("/api/auth/change-email", { email: "x@example.org" }); check("a verified email cannot be swapped out", r.status === 400);
    const ch = await signUp("typo@example.org", "Tara Typo", false);
    r = await ch.c.post("/api/auth/change-email", { email: "fixed@example.org" }); check("an unverified person can correct their email and gets a fresh link", r.status === 200 && r.json.me.email === "fixed@example.org" && r.json.dev.verifyToken);
    // verify asha for the rest
    const ashaReg = await signUp("asha2@example.org", "Asha Two");

    console.log("\n## Login, logout, sessions");
    const lg = new Client();
    r = await lg.post("/api/auth/login", { email: "verify-me@example.org", password: "wrong-password-1" }); check("wrong password gives a generic message", r.status === 401 && r.json.message === "Email or password is not correct.");
    r = await lg.post("/api/auth/login", { email: "nobody@example.org", password: PW }); check("an unknown email gives the SAME message (no account enumeration)", r.status === 401 && r.json.message === "Email or password is not correct.");
    r = await lg.post("/api/auth/login", { email: "verify-me@example.org", password: PW }); check("correct login works", r.status === 200 && r.json.me.verified === true);
    r = await lg.get("/api/me"); check("the session is restored on the next request", r.json.signedIn === true && r.json.me.email === "verify-me@example.org");
    r = await lg.post("/api/auth/logout"); r = await lg.get("/api/me"); check("logout ends the session", r.json.signedIn === false);
    r = await lg.put("/api/me/profile", { displayName: "x" }); check("a protected route refuses a signed-out request", r.status === 401);
    const brute = new Client(); let last = null; for (let i = 0; i < 10; i++) last = await brute.post("/api/auth/login", { email: "brute@example.org", password: "wrong-password-" + i });
    check("repeated wrong passwords for one account are rate limited", last.status === 429);

    console.log("\n## Role choice");
    const p1 = await signUp("prim@example.org", "Priya Nair");
    r = await p1.c.post("/api/me/role", { role: "wizard" }); check("an unknown role is refused", r.status === 400);
    r = await p1.c.post("/api/me/role", { role: "primary" }); check("choosing Primary user works", r.status === 200 && r.json.me.role === "primary" && r.json.me.onboarding.next === "profile");
    r = await p1.c.post("/api/me/role", { role: "community" }); check("the role cannot simply be changed by asking again", r.status === 409);
    r = await p1.c.post("/api/me/role/change", { role: "community", password: "wrong-password-1" }); check("a role change needs the password", r.status === 400);

    console.log("\n## Primary onboarding and accessibility profile");
    r = await p1.c.post("/api/me/onboarding/complete"); check("onboarding cannot be completed with a required step missing", r.status === 400 && r.json.fields.step === "profile");
    r = await p1.c.put("/api/me/onboarding/profile", { displayName: "", language: "en-IN" }); check("a required field is validated", r.status === 400 && r.json.fields.displayName);
    r = await p1.c.put("/api/me/onboarding/profile", { displayName: "Priya", language: "hi-IN", formOfAddress: "she/her" }); check("profile step saves", r.status === 200 && r.json.me.profile.displayName === "Priya" && r.json.me.profile.language === "hi-IN");
    await p1.c.put("/api/me/onboarding/send", { send: ["type", "voice_to_text", "sign", "bogus"] });
    await p1.c.put("/api/me/onboarding/receive", { receive: ["captions", "listen", "haptic"] });
    r = await p1.c.put("/api/me/onboarding/accessibility", { display: { textSize: "xlarge", theme: "contrast" }, navigation: { screenReader: true, keyboard: true, voiceNav: false, reducedMotion: true }, audio: { voice: "Microsoft Heera", rate: 1.2, spokenNotifications: true }, other: { haptics: true } });
    const rd = r.json.me.roleData; check("send, receive and accessibility preferences are saved, and unknown options are dropped", rd.send.join() === "type,voice_to_text,sign" && rd.receive.length === 3 && rd.display.textSize === "xlarge" && rd.navigation.screenReader === true && rd.audio.rate === 1.2);
    r = await p1.c.post("/api/me/onboarding/complete"); check("onboarding completes", r.status === 200 && r.json.me.onboarding.completed === true);
    const invite = r.json.me.inviteCode; check("a primary user gets a private invitation code", /^[A-Z2-9]{8}$/.test(invite));
    r = await p1.c.put("/api/me/preferences", { display: { textSize: "large" }, send: ["type"] }); check("preferences can be edited after onboarding", r.json.me.roleData.display.textSize === "large" && r.json.me.roleData.send.join() === "type");
    const skip = await setup("skip@example.org", "Sam Skip", "primary", [["profile", { displayName: "Sam" }]]);
    check("skipping send/receive is allowed: sensible defaults are applied and the profile says so", skip.me.roleData.send.join() === "type" && skip.me.roleData.receive.join() === "captions" && skip.me.roleData.usedDefaults === true);
    const login2 = new Client(); await login2.post("/api/auth/login", { email: "prim@example.org", password: PW });
    r = await login2.get("/api/me"); check("after signing in again from another device the same profile and completed onboarding are returned", r.json.me.onboarding.completed === true && r.json.me.profile.displayName === "Priya" && r.json.me.roleData.display.textSize === "large");

    console.log("\n## Secondary user and connections");
    const sec = await setup("fam@example.org", "Farah Khan", "secondary", [["profile", { displayName: "Farah" }], ["relationship", { relationship: "family" }], ["communication", { commMethods: ["text", "captions"] }]]);
    check("secondary onboarding completes", sec.me.onboarding.completed === true && sec.me.roleData.relationship === "family");
    r = await sec.c.put("/api/me/onboarding/relationship", { relationship: "boss" }); check("an invalid relationship is refused", r.status === 400);
    r = await sec.c.get("/api/connections/lookup?code=ZZZZZZZZ"); check("an unknown code is simply 'not found'", r.status === 404);
    r = await sec.c.get("/api/connections/lookup?email=prim@example.org"); check("a primary user is NOT findable by email unless they turned that on", r.status === 404);
    r = await sec.c.get("/api/connections/lookup?code=" + invite.toLowerCase()); check("a primary user IS findable by their invitation code, and only the display name is shown", r.status === 200 && r.json.found.displayName === "Priya" && Object.keys(r.json.found).sort().join() === "avatar,displayName");
    r = await p1.c.get("/api/connections/lookup?code=" + invite); check("a primary user cannot use the supporter lookup", r.status === 403);
    r = await sec.c.post("/api/connections", { code: invite, relationship: "family" }); const connId = r.json.connection && r.json.connection.id; check("a supporter can send a connection request (status: pending)", r.status === 201 && r.json.connection.status === "pending");
    r = await sec.c.post("/api/connections", { code: invite }); check("a second request to the same person is refused", r.status === 409);
    r = await sec.c.post("/api/connections/" + connId + "/session"); check("no conversation can start before approval", r.status === 404);
    r = await p1.c.get("/api/notifications"); check("the primary user is notified of the request (a real event)", r.json.notifications.some((n) => n.type === "connection_request" && /Farah/.test(n.body)));
    r = await sec.c.post("/api/connections/" + connId + "/respond", { accept: true }); check("the supporter cannot approve their own request", r.status === 403);
    const intruder = await setup("intruder@example.org", "Ivan Intruder", "primary", [["profile", { displayName: "Ivan" }]]);
    r = await intruder.c.post("/api/connections/" + connId + "/respond", { accept: true }); check("another primary user cannot answer someone else's request", r.status === 404);
    r = await intruder.c.get("/api/connections"); check("another person's connections are never listed", r.json.connections.length === 0);
    r = await p1.c.post("/api/connections/" + connId + "/respond", { accept: true, permissions: { messages: true, preferences: false } }); check("the primary user approves with chosen permissions", r.status === 200 && r.json.connection.status === "approved" && r.json.connection.permissions.preferences === false);
    r = await sec.c.get("/api/connections"); check("without the 'preferences' permission the supporter sees NO communication preferences", r.json.connections[0].status === "approved" && !r.json.connections[0].preferences);
    await p1.c.put("/api/connections/" + connId + "/permissions", { messages: true, preferences: true, transcripts: false });
    r = await sec.c.get("/api/connections"); check("after the primary user allows it, the supporter sees send and receive preferences only", r.json.connections[0].preferences && r.json.connections[0].preferences.send.join() === "type" && !JSON.stringify(r.json).includes("Microsoft Heera"));
    r = await sec.c.post("/api/connections/" + connId + "/session"); check("an approved connection can start a real conversation", r.status === 201 && /^#\/join\/[a-z0-9]+\/[A-Za-z0-9_-]+$/.test(r.json.session.joinPath));
    const joinPath = r.json.session.joinPath, sid = joinPath.split("/")[2], stok = joinPath.split("/")[3];
    r = await fetch(BASE + "/api/sessions/" + sid + "?token=" + stok); check("that conversation exists on the real session server", r.status === 200);
    r = await p1.c.get("/api/notifications"); check("the other person is invited with a working link", r.json.notifications.some((n) => n.type === "session_invite" && n.link === joinPath));
    r = await p1.c.get("/api/comm-sessions"); check("session history lists who and when, never message text", r.json.sessions.length === 1 && r.json.sessions[0].withName === "Farah" && r.json.sessions[0].status === "active" && !("messages" in r.json.sessions[0]));
    r = await intruder.c.get("/api/comm-sessions"); check("another person cannot see that session history", r.json.sessions.length === 0);
    r = await p1.c.post("/api/connections/" + connId + "/revoke"); check("the primary user can end the connection", r.status === 200);
    r = await sec.c.post("/api/connections/" + connId + "/session"); check("after revoking, no new conversation can be started", r.status === 404);

    console.log("\n## Community learning progress");
    const com = await setup("learn@example.org", "Leela Das", "community", [["profile", { displayName: "Leela" }], ["interests", { interests: ["sign_learning", "awareness", "nope"] }], ["level", { level: "beginner" }]]);
    check("community onboarding completes and stores interests", com.me.onboarding.completed && com.me.roleData.interests.join() === "sign_learning,awareness");
    r = await com.c.put("/api/learning/progress", { lessonId: "Bad Id!", completed: true }); check("an invalid lesson id is refused", r.status === 400);
    await com.c.put("/api/learning/progress", { lessonId: "sign:greetings-hello", viewed: true });
    await com.c.put("/api/learning/progress", { lessonId: "sign:greetings-hello", completed: true });
    r = await com.c.put("/api/learning/progress", { lessonId: "aware:visual", bookmarked: true });
    check("progress is saved (completed, bookmarked, last viewed)", r.json.completed.join() === "sign:greetings-hello" && r.json.bookmarks.join() === "aware:visual" && r.json.last.id === "sign:greetings-hello");
    const com2 = new Client(); await com2.post("/api/auth/login", { email: "learn@example.org", password: PW });
    r = await com2.get("/api/learning/progress"); check("progress is still there after signing in elsewhere", r.json.completed.length === 1);
    r = await new Client().get("/api/learning/progress"); check("progress is private to the signed-in account", r.status === 401);

    console.log("\n## Interpreter registration, verification and requests");
    const ip = await setup("terp@example.org", "Tanvi Interpreter", "interpreter", [["profile", { displayName: "Tanvi Interpreter" }], ["languages", { languages: ["Indian Sign Language", "English"], signProficiency: "professional" }], ["professional", { qualifications: "Diploma in ISL interpreting", certificationBody: "Example Board", experienceYears: 6 }], ["availability", { status: "available", sessionTypes: ["conversation"] }]]);
    check("interpreter onboarding completes but the interpreter is NOT verified", ip.me.onboarding.completed && ip.me.verification.status === "not_submitted");
    const asker = await setup("asker@example.org", "Anil Asker", "primary", [["profile", { displayName: "Anil" }]]);
    r = await asker.c.post("/api/interpreter-requests", { language: "Indian Sign Language", sessionType: "conversation", note: "Clinic visit" }); const reqId = r.json.request && r.json.request.id;
    check("a request can be made, and nobody is notified because no verified interpreter exists yet", r.status === 201 && r.json.interpretersNotified === 0);
    r = await ip.c.get("/api/interpreter/requests"); check("an unverified interpreter sees NO requests", r.json.verified === false && r.json.open.length === 0);
    r = await ip.c.post("/api/interpreter-requests/" + reqId + "/accept"); check("an unverified interpreter cannot accept a request", r.status === 403 && r.json.error === "not_verified");
    r = await ip.c.post("/api/interpreter/submit"); check("the interpreter submits details for review and the status is 'pending review'", r.status === 200 && r.json.me.verification.status === "pending_review");
    r = await ip.c.get("/api/admin/interpreters"); check("an interpreter cannot open the admin review list", r.status === 403);
    r = await ip.c.post("/api/admin/interpreters/" + ip.me.id + "/verification", { status: "verified" }); check("an interpreter cannot verify themselves", r.status === 403);
    const admin = new Client(); const areg = await admin.post("/api/auth/register", { name: "Admin Person", email: "admin@example.org", password: PW, acceptTerms: true }); await admin.post("/api/auth/verify", { token: areg.json.dev.verifyToken });
    r = await admin.get("/api/admin/interpreters"); check("a listed administrator sees the review queue with the submitted details", r.status === 200 && r.json.rows.length === 1 && r.json.rows[0].qualifications.includes("Diploma"));
    r = await admin.post("/api/admin/interpreters/" + ip.me.id + "/verification", { status: "rejected" }); check("rejecting needs an explanation", r.status === 400);
    r = await admin.post("/api/admin/interpreters/" + ip.me.id + "/verification", { status: "additional_info_required", note: "Please add your certificate number." });
    r = await ip.c.get("/api/me"); check("the interpreter sees the real status and the reviewer's note", r.json.me.verification.status === "additional_info_required" && /certificate number/.test(r.json.me.verification.note));
    r = await ip.c.get("/api/notifications"); check("the interpreter was notified of the decision", r.json.notifications.some((n) => n.type === "verification_update"));
    await ip.c.put("/api/me/onboarding/professional", { qualifications: "Diploma in ISL interpreting", certificationBody: "Example Board", certificationNumber: "EB-123", experienceYears: 6 });
    await ip.c.post("/api/interpreter/submit"); r = await admin.post("/api/admin/interpreters/" + ip.me.id + "/verification", { status: "verified", note: "Checked." });
    r = await ip.c.get("/api/me"); check("after approval the interpreter is verified", r.json.me.verification.status === "verified");
    r = await ip.c.get("/api/interpreter/requests"); check("a verified interpreter sees requests in a language they interpret", r.json.verified && r.json.open.some((x) => x.id === reqId));
    r = await asker.c.post("/api/interpreter-requests", { language: "Odia", sessionType: "conversation" }); const odia = r.json.request.id;
    r = await ip.c.get("/api/interpreter/requests"); check("...but not requests in a language they do not interpret", !r.json.open.some((x) => x.id === odia));
    r = await ip.c.post("/api/interpreter-requests/" + reqId + "/accept"); check("a verified interpreter accepts and a real session is created", r.status === 200 && r.json.request.status === "accepted" && /^#\/join\//.test(r.json.request.joinPath));
    r = await ip.c.post("/api/interpreter-requests/" + reqId + "/accept"); check("a second accept is refused (no double booking)", r.status === 409);
    r = await asker.c.get("/api/interpreter-requests/mine"); check("the requester sees who accepted and gets the join link", r.json.requests.find((x) => x.id === reqId).status === "accepted" && r.json.requests.find((x) => x.id === reqId).joinPath);
    r = await intruder.c.post("/api/interpreter-requests/" + reqId + "/complete"); check("an outsider cannot end someone else's session", r.status === 404);
    r = await ip.c.post("/api/interpreter-requests/" + reqId + "/complete"); check("the interpreter ends the session and it is recorded as completed", r.status === 200);
    r = await ip.c.put("/api/me/onboarding/professional", { qualifications: "Changed", experienceYears: 7 }); r = await ip.c.get("/api/me"); check("editing professional details after approval sends them back for review", r.json.me.verification.status === "pending_review");

    console.log("\n## Notifications and settings");
    r = await p1.c.get("/api/notifications"); const unread = r.json.unread; const first = r.json.notifications[0];
    await p1.c.post("/api/notifications/" + first.id + "/read"); r = await p1.c.get("/api/notifications"); check("a notification can be marked read", r.json.unread === unread - 1);
    r = await p1.c.post("/api/notifications/read-all"); r = await p1.c.get("/api/notifications"); check("all can be marked read", r.json.unread === 0);
    r = await intruder.c.post("/api/notifications/" + first.id + "/read"); check("nobody can touch another person's notification", r.status === 404);
    r = await p1.c.del("/api/notifications/" + first.id); r = await p1.c.get("/api/notifications"); check("a notification can be dismissed", !r.json.notifications.some((n) => n.id === first.id));
    await sec.c.put("/api/me/settings", { notifications: { connections: false } });
    const before = (await sec.c.get("/api/notifications")).json.notifications.length;
    await p1.c.put("/api/me/settings", { discoverByEmail: true });
    r = await sec.c.get("/api/connections/lookup?email=prim@example.org"); check("turning on 'find me by email' makes the lookup work", r.status === 200);

    console.log("\n## Privacy, export and deletion");
    r = await p1.c.get("/api/me/export"); check("a person can export their own data", r.status === 200 && r.json.profile.displayName === "Priya" && !JSON.stringify(r.json).includes("scrypt$"));
    r = await p1.c.post("/api/me/password", { current: "wrong-password-1", next: "Another-Pass-2026" }); check("changing a password needs the current one", r.status === 400);
    r = await p1.c.post("/api/me/password", { current: PW, next: "Another-Pass-2026" }); check("password change works", r.status === 200);
    r = await new Client().post("/api/auth/login", { email: "prim@example.org", password: PW }); check("the old password no longer works", r.status === 401);
    r = await login2.get("/api/me"); check("changing the password signed out the other devices", r.json.signedIn === false);
    const fp = await new Client().post("/api/auth/forgot", { email: "prim@example.org" });
    check("forgot-password gives a development link, labelled as not emailed", fp.status === 200 && fp.json.dev && /NOT emailed/.test(fp.json.dev.note) && fp.json.emailDelivery === "not_configured");
    const fp2 = await new Client().post("/api/auth/forgot", { email: "ghost@example.org" }); check("forgot-password does not reveal in its status or message whether an account exists", fp2.status === 200 && fp2.json.ok === true);
    r = await new Client().post("/api/auth/reset", { token: fp.json.dev.resetToken, password: "short" }); check("a weak new password is refused on reset", r.status === 400);
    r = await new Client().post("/api/auth/reset", { token: fp.json.dev.resetToken, password: "Reset-Pass-2026" }); check("the reset link sets a new password", r.status === 200);
    r = await new Client().post("/api/auth/reset", { token: fp.json.dev.resetToken, password: "Reset-Pass-2027" }); check("a reset link works only once", r.status === 400);
    const pl = new Client(); r = await pl.post("/api/auth/login", { email: "prim@example.org", password: "Reset-Pass-2026" }); check("login works with the reset password", r.status === 200);
    r = await pl.del("/api/me", { password: "wrong-password-1" }); check("deleting an account needs the password", r.status === 400);
    r = await pl.del("/api/me", { password: "Reset-Pass-2026" }); check("an account can be deleted", r.status === 200);
    r = await new Client().post("/api/auth/login", { email: "prim@example.org", password: "Reset-Pass-2026" }); check("a deleted account can no longer sign in", r.status === 401);
    r = await sec.c.get("/api/connections"); check("deleting an account removes its connections from the other person's list", r.json.connections.length === 0);

    console.log("\n## The server no longer publishes private files");
    for (const p of ["/data/sangam-data.json", "/server/accounts.js", "/.env", "/package.json", "/node_modules/express/package.json", "/docs/ISL_RECOGNITION_AUDIT.md"]) {
      const res = await fetch(BASE + p); const t = await res.text();
      check("GET " + p + " does not return the file", !/passwordHash|module\.exports|"express"|scrypt/.test(t) && !(res.headers.get("content-type") || "").includes("json"), res.status + " " + (res.headers.get("content-type") || ""));
      check("GET " + p + " is a real 404 (not a 200 home page that looks like a leak)", res.status === 404, String(res.status));
    }
    r = await fetch(BASE + "/.git/config"); check("dot-folders are a 404", r.status === 404);
    r = await fetch(BASE + "/join/abc123"); check("a deep link without a file extension still gets the app shell", r.status === 200 && (r.headers.get("content-type") || "").includes("html"));
    r = await fetch(BASE + "/assets/app.js"); check("the app's own scripts are still served", r.status === 200);
    r = await fetch(BASE + "/assets/does-not-exist.js"); check("a missing asset is a real 404, not the home page", r.status === 404);
    r = await fetch(BASE + "/"); check("the home page is still served", r.status === 200 && (await r.text()).includes("<html"));
    r = await fetch(BASE + "/vendor/sign-models/isl/include-slgcn/model.json"); check("model files are still served", r.status === 200);

    console.log("\n## Persistence across a real restart");
    await sleep(300);
    const dbText = fs.readFileSync(DATA, "utf8");
    check("the database file exists and holds only scrypt hashes, never a plain password", dbText.includes("scrypt$") && !dbText.includes(PW) && !dbText.includes("Reset-Pass-2026"));
    await stopServer(child); child = await startServer();
    const again = new Client();
    r = await again.post("/api/auth/login", { email: "terp@example.org", password: PW }); check("after the server restarted, an existing account can still sign in", r.status === 200);
    r = await again.get("/api/me"); check("...with its role, profile and interpreter verification state intact", r.json.me.role === "interpreter" && r.json.me.verification.status === "pending_review" && r.json.me.profile.displayName === "Tanvi Interpreter");
    const again2 = new Client(); await again2.post("/api/auth/login", { email: "learn@example.org", password: PW });
    r = await again2.get("/api/learning/progress"); check("...and saved learning progress is still there", r.json.completed.length === 1);
    r = await new Client().post("/api/auth/login", { email: "prim@example.org", password: "Reset-Pass-2026" }); check("...and the deleted account is still deleted", r.status === 401);
  } catch (e) {
    check("test run completed without an unexpected error", false, String(e && e.stack || e).split("\n").slice(0, 3).join(" | "));
  } finally {
    try { await stopServer(child); } catch (e) {}
    try { fs.rmSync(path.dirname(DATA), { recursive: true, force: true }); } catch (e) {}
  }
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})();
