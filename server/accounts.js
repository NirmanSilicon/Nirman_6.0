/*
 * SANGAM accounts: registration, login, roles, onboarding, profiles, connections, interpreter requests, notifications,
 * learning progress. Mounted into the existing Express app by server.js. Everything is persisted through server/db.js.
 *
 * Security model in one paragraph: passwords are hashed with scrypt (random salt); sessions are random 256-bit tokens kept
 * only as SHA-256 hashes on the server and sent as an HttpOnly, SameSite=Lax cookie; every state-changing request must
 * carry the custom header "X-Sangam-Client" (a cross-site form cannot set it) and, if the browser sent an Origin, it must
 * match the host; login, registration and password reset are rate limited; every route checks who is asking and what role
 * they hold; and nothing about another person is returned unless a connection they approved allows it.
 *
 * Email: there is NO mail delivery in this project. Verification and reset links are therefore handed back to the page in
 * "development" mode (clearly labelled there) and never claimed to have been emailed. See DEV_TOKENS in .env.example.
 */
"use strict";
const crypto = require("crypto");
const path = require("path");
const { createStore } = require("./db");

const ROLES = ["primary", "secondary", "community", "interpreter"];
const STEPS = {
  primary: ["profile", "send", "receive", "accessibility", "review"],
  secondary: ["profile", "relationship", "communication", "connection", "review"],
  community: ["profile", "interests", "level", "review"],
  interpreter: ["profile", "languages", "professional", "availability", "verification", "review"],
};
const LISTS = {
  send: ["type", "speak", "voice_to_text", "sign", "phraseboard", "assistive", "other"],
  receive: ["read_text", "listen", "captions", "visual_alerts", "haptic", "braille", "other"],
  relationship: ["family", "friend", "teacher", "caregiver", "supporter", "other"],
  comm: ["text", "voice", "captions", "sign_assist", "other"],
  interests: ["sign_learning", "awareness", "inclusive_communication", "educational", "community", "volunteer"],
  level: ["beginner", "intermediate", "advanced"],
  textSize: ["standard", "large", "xlarge"],
  theme: ["light", "dark", "contrast"],
  verification: ["not_submitted", "pending_review", "verified", "rejected", "additional_info_required"],
  availability: ["available", "unavailable", "scheduled"],
  proficiency: ["none", "basic", "conversational", "professional"],
  sessionType: ["conversation", "appointment", "other"],
  contactMethod: ["email", "phone", "in_app"],
};
const PW_MIN = 10, PW_MAX = 128;
const WEAK = ["password123", "1234567890", "qwertyuiop", "letmein123", "iloveyou12", "welcome123", "password1234", "sangam12345"];

module.exports = function mountAccounts(app, ctx) {
  const env = ctx.env || process.env;
  const store = createStore(env.DATA_FILE || path.join(__dirname, "..", "data", "sangam-data.json"));
  const D = store.data;
  const now = () => Date.now();
  const uid = () => crypto.randomUUID();
  const ADMIN_EMAILS = (env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const REQUIRE_VERIFY = env.REQUIRE_EMAIL_VERIFICATION !== "0";
  const DEV_TOKENS = env.DEV_TOKENS === "1" || (env.DEV_TOKENS !== "0" && env.NODE_ENV !== "production");
  const SESSION_DAYS = 7, REMEMBER_DAYS = 30, IDLE_MS = 12 * 3600 * 1000, VERIFY_MS = 24 * 3600 * 1000, RESET_MS = 3600 * 1000, RESEND_MS = 60 * 1000;
  const COOKIE = "sangam_sid";

  /* ------------------------------------------------------------------ small helpers */
  const sha = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
  const rnd = (n) => crypto.randomBytes(n).toString("base64url");
  const clean = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  const cleanMulti = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);
  const isEmail = (e) => typeof e === "string" && e.length <= 254 && /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/.test(e);
  const pickList = (arr, allowed, max) => (Array.isArray(arr) ? arr : []).map((x) => String(x)).filter((x, i, a) => allowed.indexOf(x) >= 0 && a.indexOf(x) === i).slice(0, max || 20);
  const bool = (v) => v === true || v === "true";
  const LANG_RE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
  const fail = (res, status, error, message, fields) => res.status(status).json(Object.assign({ error, message }, fields ? { fields } : {}));
  const roleLabel = { primary: "Primary user", secondary: "Supporter", community: "Community member", interpreter: "Interpreter" };

  function passwordProblems(pw, email) {
    const p = [];
    if (typeof pw !== "string" || pw.length < PW_MIN) p.push("length");
    if (typeof pw === "string" && pw.length > PW_MAX) p.push("too_long");
    if (typeof pw !== "string" || !/[A-Za-z]/.test(pw)) p.push("letter");
    if (typeof pw !== "string" || !/[0-9]/.test(pw)) p.push("number");
    if (typeof pw === "string" && (WEAK.indexOf(pw.toLowerCase()) >= 0 || (email && pw.toLowerCase() === String(email).toLowerCase()))) p.push("common");
    return p;
  }
  const PW_TEXT = { length: "at least " + PW_MIN + " characters", too_long: "no more than " + PW_MAX + " characters", letter: "at least one letter", number: "at least one number", common: "not a common password or your email" };

  function hashPassword(pw) {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16);
      crypto.scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 }, (err, key) => err ? reject(err) : resolve("scrypt$16384$8$1$" + salt.toString("base64") + "$" + key.toString("base64")));
    });
  }
  function verifyPassword(pw, stored) {
    return new Promise((resolve) => {
      try {
        const [alg, N, r, p, salt, hash] = String(stored).split("$");
        if (alg !== "scrypt") return resolve(false);
        crypto.scrypt(pw, Buffer.from(salt, "base64"), 64, { N: +N, r: +r, p: +p }, (err, key) => {
          if (err) return resolve(false);
          const want = Buffer.from(hash, "base64");
          resolve(want.length === key.length && crypto.timingSafeEqual(want, key));
        });
      } catch (e) { resolve(false); }
    });
  }
  // Used when the email is unknown so a missing account takes as long as a wrong password.
  const DUMMY = "scrypt$16384$8$1$" + Buffer.alloc(16).toString("base64") + "$" + Buffer.alloc(64).toString("base64");

  function cookies(req) {
    const out = {};
    String(req.headers.cookie || "").split(";").forEach((c) => { const i = c.indexOf("="); if (i > 0) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim()); });
    return out;
  }
  function setCookie(req, res, value, maxAgeSec) {
    const secure = req.secure || (req.headers["x-forwarded-proto"] === "https" && ctx.trustProxy);
    res.append("Set-Cookie", COOKIE + "=" + encodeURIComponent(value) + "; Path=/; HttpOnly; SameSite=Lax" + (maxAgeSec != null ? "; Max-Age=" + maxAgeSec : "") + (secure ? "; Secure" : ""));
  }

  /* ------------------------------------------------------------------ request guards */
  function csrf(req, res, next) {
    if (["GET", "HEAD", "OPTIONS"].indexOf(req.method) >= 0) return next();
    if (req.get("X-Sangam-Client") !== "1") return fail(res, 403, "forbidden", "This request was not sent by the SANGAM app.");
    const origin = req.get("Origin");
    if (origin) { try { if (new URL(origin).host !== req.get("host")) return fail(res, 403, "forbidden", "This request came from a different site."); } catch (e) { return fail(res, 403, "forbidden", "Bad origin."); } }
    next();
  }
  function loadSession(req) {
    const raw = cookies(req)[COOKIE]; if (!raw) return null;
    const rec = D.sessions[sha(raw)]; if (!rec) return null;
    const t = now();
    if (t > rec.expiresAt || (!rec.remember && t - rec.lastSeen > IDLE_MS)) { delete D.sessions[sha(raw)]; store.save(); return null; }
    if (t - rec.lastSeen > 60 * 1000) { rec.lastSeen = t; store.save(); }
    const user = D.users[rec.userId]; if (!user) return null;
    return { user, key: sha(raw) };
  }
  function auth(req, res, next) {
    const s = loadSession(req);
    if (!s) return fail(res, 401, "not_signed_in", "Please sign in to continue.");
    req.user = s.user; req.sessionKey = s.key; next();
  }
  const needVerified = (req, res, next) => (REQUIRE_VERIFY && !req.user.verified ? fail(res, 403, "not_verified", "Please verify your email address first.") : next());
  const needRole = (...roles) => (req, res, next) => (roles.indexOf(req.user.role) < 0 ? fail(res, 403, "wrong_role", "This is not available for your account type.") : next());
  const needAdmin = (req, res, next) => (req.user.isAdmin && req.user.verified ? next() : fail(res, 403, "forbidden", "Only an administrator can do this."));
  // ACCOUNT_RATE_MULT scales every per-address limit (tests and shared-network pilots raise it). The per-account sign-in limit
  // ("loginmail") is deliberately NOT scaled, so brute-forcing one account stays limited however it is configured.
  const RATE_MULT = Math.max(1, parseFloat(env.ACCOUNT_RATE_MULT) || 1);
  const limited = (key, max, ms) => (req, res, next) => (ctx.rateLimitIp(key + ":" + (req.ip || "-"), Math.round(max * RATE_MULT), ms) ? next() : fail(res, 429, "rate_limited", "Too many attempts. Please wait a few minutes and try again."));

  app.use("/api/auth", csrf);
  app.use("/api/me", csrf);
  ["connections", "interpreter", "interpreter-requests", "notifications", "learning", "comm-sessions", "admin"].forEach((p) => app.use("/api/" + p, csrf));

  /* ------------------------------------------------------------------ account model */
  const emptyPrimary = () => ({ send: [], receive: [], display: { textSize: "standard", theme: "light" }, navigation: { screenReader: false, keyboard: false, voiceNav: false, reducedMotion: false }, audio: { voice: "", rate: 1, spokenNotifications: false }, other: { haptics: false }, usedDefaults: false });
  function newUser(email, name, hash) {
    return {
      id: uid(), email, name: clean(name, 80), passwordHash: hash, verified: !REQUIRE_VERIFY, createdAt: now(), termsAcceptedAt: now(),
      role: null, isAdmin: false, lastLoginAt: null,
      profile: { displayName: clean(name, 60), language: "en-IN", avatar: "", formOfAddress: "" },
      roleData: {}, onboarding: {},
      settings: { notifications: { messages: true, connections: true, interpreter: true, learning: true }, discoverByEmail: false },
      inviteCode: null, verify: null,
    };
  }
  const onboardingFor = (u) => (u.role ? (u.onboarding[u.role] || (u.onboarding[u.role] = { done: {}, completed: false, completedAt: null })) : null);
  const interp = (u) => D.interpreters[u.id] || null;
  function refreshAdmin(u) { u.isAdmin = ADMIN_EMAILS.indexOf(u.email) >= 0; }

  function me(u) {
    const ob = onboardingFor(u), steps = u.role ? STEPS[u.role] : [];
    const next = ob && !ob.completed ? steps.find((s) => !ob.done[s] && s !== "review") || "review" : null;
    const out = {
      id: u.id, email: u.email, verified: u.verified, role: u.role, roleLabel: u.role ? roleLabel[u.role] : null, isAdmin: u.isAdmin,
      profile: u.profile, settings: u.settings,
      onboarding: u.role ? { steps, done: ob.done, completed: ob.completed, next } : null,
      roleData: u.role ? (u.roleData[u.role] || {}) : {},
      emailDelivery: "not_configured", requiresVerification: REQUIRE_VERIFY,
    };
    if (u.role === "primary" && ob && ob.completed) out.inviteCode = u.inviteCode;
    if (u.role === "interpreter") out.verification = interpVerificationView(u);
    return out;
  }
  function interpVerificationView(u) {
    const v = interp(u) || { status: "not_submitted", history: [] };
    return { status: v.status, submittedAt: v.submittedAt || null, updatedAt: v.updatedAt || null, note: v.status === "additional_info_required" || v.status === "rejected" ? v.note || "" : "" };
  }
  const publicName = (u) => (u && u.profile && u.profile.displayName) || "Someone";

  /* ------------------------------------------------------------------ notifications */
  const CAT = { connection_request: "connections", connection_update: "connections", session_invite: "messages", interpreter_request: "interpreter", interpreter_update: "interpreter", verification_update: "system", system: "system", learning: "learning" };
  function notify(userId, type, title, body, link) {
    const u = D.users[userId]; if (!u) return null;
    const cat = CAT[type] || "system";
    if (cat !== "system" && u.settings.notifications && u.settings.notifications[cat] === false) return null;
    const n = { id: uid(), userId, type, title: clean(title, 120), body: clean(body, 300), link: link || "", createdAt: now(), read: false };
    D.notifications[n.id] = n;
    const mine = Object.values(D.notifications).filter((x) => x.userId === userId).sort((a, b) => a.createdAt - b.createdAt);
    while (mine.length > 100) delete D.notifications[mine.shift().id];
    store.save();
    return n;
  }

  /* ------------------------------------------------------------------ auth routes */
  function issueToken(u, kind, ttl) {
    const raw = rnd(24);
    D.tokens[sha(kind + raw)] = { userId: u.id, kind, expiresAt: now() + ttl };
    return raw;
  }
  function startSession(req, res, u, remember) {
    const raw = rnd(32);
    D.sessions[sha(raw)] = { userId: u.id, createdAt: now(), lastSeen: now(), remember: !!remember, expiresAt: now() + (remember ? REMEMBER_DAYS : SESSION_DAYS) * 86400000 };
    setCookie(req, res, raw, remember ? REMEMBER_DAYS * 86400 : null);
    u.lastLoginAt = now(); store.save();
  }
  function sendVerification(u) {
    // Only one live verification token per account.
    Object.keys(D.tokens).forEach((k) => { if (D.tokens[k].userId === u.id && D.tokens[k].kind === "verify") delete D.tokens[k]; });
    const raw = issueToken(u, "verify", VERIFY_MS);
    u.verify = { lastSentAt: now() }; store.save();
    return DEV_TOKENS ? { token: raw, path: "#/verify/" + raw } : null;
  }

  app.post("/api/auth/register", limited("register", 10, 3600 * 1000), async (req, res) => {
    const b = req.body || {}, errors = {};
    const name = clean(b.name, 80), email = clean(b.email, 254).toLowerCase();
    if (!name) errors.name = "Please enter your full name.";
    if (!isEmail(email)) errors.email = "Please enter a valid email address.";
    const pw = passwordProblems(b.password, email);
    if (pw.length) errors.password = "Your password needs: " + pw.map((p) => PW_TEXT[p]).join(", ") + ".";
    if (b.acceptTerms !== true) errors.acceptTerms = "Please accept the privacy policy and terms to continue.";
    if (Object.keys(errors).length) return fail(res, 400, "validation", "Please check the highlighted fields.", errors);
    if (D.emailIndex[email]) return fail(res, 409, "email_taken", "An account with this email already exists. Try signing in instead.", { email: "An account with this email already exists." });
    const u = newUser(email, name, await hashPassword(b.password));
    refreshAdmin(u);
    D.users[u.id] = u; D.emailIndex[email] = u.id; store.save();
    startSession(req, res, u, false);
    const dev = REQUIRE_VERIFY ? sendVerification(u) : null;
    res.status(201).json({ ok: true, me: me(u), dev: dev ? { verifyToken: dev.token, verifyPath: dev.path, note: "No email service is set up on this server, so this link was NOT emailed. It is shown here for development only." } : null });
  });

  app.post("/api/auth/login", limited("login", 25, 10 * 60 * 1000), async (req, res) => {
    const b = req.body || {}, email = clean(b.email, 254).toLowerCase();
    if (!ctx.rateLimitIp("loginmail:" + email, 8, 10 * 60 * 1000)) return fail(res, 429, "rate_limited", "Too many sign-in attempts for this account. Please wait a few minutes and try again.");
    const u = D.users[D.emailIndex[email]];
    const ok = await verifyPassword(String(b.password || ""), u ? u.passwordHash : DUMMY);
    if (!u || !ok) return fail(res, 401, "bad_credentials", "Email or password is not correct.");
    refreshAdmin(u);
    startSession(req, res, u, bool(b.remember));
    res.json({ ok: true, me: me(u) });
  });

  app.post("/api/auth/logout", (req, res) => {
    const raw = cookies(req)[COOKIE]; if (raw) { delete D.sessions[sha(raw)]; store.save(); }
    setCookie(req, res, "", 0);
    res.json({ ok: true });
  });

  app.post("/api/auth/verify", limited("verify", 20, 600 * 1000), (req, res) => {
    const raw = clean(req.body && req.body.token, 80); const rec = D.tokens[sha("verify" + raw)];
    if (!rec) {
      const s = loadSession(req);
      if (s && s.user.verified) return res.json({ ok: true, alreadyVerified: true, me: me(s.user) });
      return fail(res, 400, "bad_token", "This verification link is not valid. It may already have been used.");
    }
    if (now() > rec.expiresAt) { delete D.tokens[sha("verify" + raw)]; store.save(); return fail(res, 410, "expired", "This verification link has expired. Sign in and ask for a new one."); }
    const u = D.users[rec.userId]; if (!u) return fail(res, 400, "bad_token", "This verification link is not valid.");
    const already = u.verified; u.verified = true; delete D.tokens[sha("verify" + raw)]; store.save();
    res.json({ ok: true, alreadyVerified: already, me: me(u) });
  });

  app.post("/api/auth/resend-verification", auth, limited("resend", 10, 3600 * 1000), (req, res) => {
    const u = req.user;
    if (u.verified) return res.json({ ok: true, alreadyVerified: true });
    const wait = u.verify ? u.verify.lastSentAt + RESEND_MS - now() : 0;
    if (wait > 0) return fail(res, 429, "cooldown", "Please wait " + Math.ceil(wait / 1000) + " seconds before asking again.", null);
    const dev = sendVerification(u);
    res.json({ ok: true, cooldownSeconds: RESEND_MS / 1000, dev: dev ? { verifyToken: dev.token, verifyPath: dev.path, note: "No email service is set up on this server, so this link was NOT emailed. It is shown here for development only." } : null });
  });

  app.post("/api/auth/change-email", auth, limited("chemail", 10, 3600 * 1000), (req, res) => {
    const u = req.user, email = clean(req.body && req.body.email, 254).toLowerCase();
    if (u.verified) return fail(res, 400, "already_verified", "Your email is already verified and cannot be changed here.");
    if (!isEmail(email)) return fail(res, 400, "validation", "Please enter a valid email address.", { email: "Please enter a valid email address." });
    if (D.emailIndex[email] && D.emailIndex[email] !== u.id) return fail(res, 409, "email_taken", "An account with this email already exists.", { email: "An account with this email already exists." });
    delete D.emailIndex[u.email]; u.email = email; D.emailIndex[email] = u.id; refreshAdmin(u); u.verify = null;
    const dev = sendVerification(u);
    res.json({ ok: true, me: me(u), dev: dev ? { verifyToken: dev.token, verifyPath: dev.path, note: "No email service is set up on this server, so this link was NOT emailed. It is shown here for development only." } : null });
  });

  app.post("/api/auth/forgot", limited("forgot", 8, 3600 * 1000), (req, res) => {
    const email = clean(req.body && req.body.email, 254).toLowerCase();
    const u = D.users[D.emailIndex[email]];
    let dev = null;
    if (u) {
      Object.keys(D.tokens).forEach((k) => { if (D.tokens[k].userId === u.id && D.tokens[k].kind === "reset") delete D.tokens[k]; });
      const raw = issueToken(u, "reset", RESET_MS); if (DEV_TOKENS) dev = { resetToken: raw, resetPath: "#/reset/" + raw, note: "No email service is set up on this server, so this link was NOT emailed. It is shown here for development only." };
    }
    // Same answer whether or not the account exists (production); in development the link is shown only when it does.
    res.json({ ok: true, emailDelivery: "not_configured", dev });
  });

  app.post("/api/auth/reset", limited("reset", 10, 3600 * 1000), async (req, res) => {
    const raw = clean(req.body && req.body.token, 80), key = sha("reset" + raw), rec = D.tokens[key];
    if (!rec || now() > rec.expiresAt) return fail(res, 400, "bad_token", "This reset link is not valid or has expired. Please ask for a new one.");
    const u = D.users[rec.userId], pw = passwordProblems(req.body.password, u && u.email);
    if (!u) return fail(res, 400, "bad_token", "This reset link is not valid.");
    if (pw.length) return fail(res, 400, "validation", "Your password needs: " + pw.map((p) => PW_TEXT[p]).join(", ") + ".", { password: "Your new password does not meet the requirements." });
    u.passwordHash = await hashPassword(req.body.password); delete D.tokens[key];
    Object.keys(D.sessions).forEach((k) => { if (D.sessions[k].userId === u.id) delete D.sessions[k]; });   // every device is signed out
    store.save();
    res.json({ ok: true });
  });

  /* ------------------------------------------------------------------ account: read and basic edits */
  app.get("/api/me", (req, res) => {
    const s = loadSession(req);
    if (!s) return res.json({ signedIn: false, requiresVerification: REQUIRE_VERIFY, emailDelivery: "not_configured" });
    refreshAdmin(s.user);
    res.json({ signedIn: true, me: me(s.user) });
  });

  app.put("/api/me/profile", auth, needVerified, (req, res) => {
    const b = req.body || {}, u = req.user, errors = {};
    if (b.displayName !== undefined) { const n = clean(b.displayName, 60); if (!n) errors.displayName = "Please enter a name to show."; else u.profile.displayName = n; }
    if (b.language !== undefined) { if (!LANG_RE.test(String(b.language))) errors.language = "Choose a language from the list."; else u.profile.language = String(b.language); }
    if (b.formOfAddress !== undefined) u.profile.formOfAddress = clean(b.formOfAddress, 30);
    if (b.avatar !== undefined) {
      if (b.avatar === "") u.profile.avatar = "";
      else if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(String(b.avatar)) || String(b.avatar).length > 60000) errors.avatar = "That picture is too large or is not a JPEG, PNG or WebP image.";
      else u.profile.avatar = b.avatar;
    }
    if (Object.keys(errors).length) return fail(res, 400, "validation", "Please check the highlighted fields.", errors);
    store.save(); res.json({ ok: true, me: me(u) });
  });

  app.put("/api/me/settings", auth, needVerified, (req, res) => {
    const b = req.body || {}, u = req.user;
    if (b.notifications && typeof b.notifications === "object") ["messages", "connections", "interpreter", "learning"].forEach((k) => { if (b.notifications[k] !== undefined) u.settings.notifications[k] = bool(b.notifications[k]); });
    if (b.discoverByEmail !== undefined) u.settings.discoverByEmail = bool(b.discoverByEmail);
    store.save(); res.json({ ok: true, me: me(u) });
  });

  app.post("/api/me/password", auth, limited("chpw", 10, 3600 * 1000), async (req, res) => {
    const u = req.user, b = req.body || {};
    if (!(await verifyPassword(String(b.current || ""), u.passwordHash))) return fail(res, 400, "bad_credentials", "Your current password is not correct.", { current: "Your current password is not correct." });
    const pw = passwordProblems(b.next, u.email);
    if (pw.length) return fail(res, 400, "validation", "Your new password needs: " + pw.map((p) => PW_TEXT[p]).join(", ") + ".", { next: "Your new password does not meet the requirements." });
    u.passwordHash = await hashPassword(b.next);
    Object.keys(D.sessions).forEach((k) => { if (D.sessions[k].userId === u.id && k !== req.sessionKey) delete D.sessions[k]; });
    store.save(); res.json({ ok: true });
  });

  app.get("/api/me/export", auth, (req, res) => {
    const u = req.user;
    res.set("Content-Disposition", 'attachment; filename="sangam-my-data.json"');
    res.json({
      exportedAt: new Date().toISOString(), account: { id: u.id, email: u.email, createdAt: u.createdAt, role: u.role },
      profile: u.profile, roleData: u.roleData, settings: u.settings, onboarding: u.onboarding,
      connections: Object.values(D.connections).filter((c) => c.primaryId === u.id || c.supporterId === u.id).map((c) => ({ id: c.id, status: c.status, permissions: c.permissions, createdAt: c.createdAt })),
      notifications: Object.values(D.notifications).filter((n) => n.userId === u.id), learning: D.learning[u.id] || {},
      interpreterVerification: interp(u) || null,
    });
  });

  app.delete("/api/me", auth, limited("delacct", 5, 3600 * 1000), async (req, res) => {
    const u = req.user;
    if (!(await verifyPassword(String((req.body || {}).password || ""), u.passwordHash))) return fail(res, 400, "bad_credentials", "Your password is not correct, so the account was not deleted.", { password: "Your password is not correct." });
    Object.keys(D.sessions).forEach((k) => { if (D.sessions[k].userId === u.id) delete D.sessions[k]; });
    Object.keys(D.tokens).forEach((k) => { if (D.tokens[k].userId === u.id) delete D.tokens[k]; });
    Object.keys(D.notifications).forEach((k) => { if (D.notifications[k].userId === u.id) delete D.notifications[k]; });
    Object.keys(D.connections).forEach((k) => { const c = D.connections[k]; if (c.primaryId === u.id || c.supporterId === u.id) { const other = D.users[c.primaryId === u.id ? c.supporterId : c.primaryId]; if (other && c.status !== "revoked") notify(other.id, "connection_update", "A connection ended", publicName(u) + " deleted their SANGAM account.", ""); delete D.connections[k]; } });
    Object.keys(D.interpRequests).forEach((k) => { const r = D.interpRequests[k]; if (r.requesterId === u.id) delete D.interpRequests[k]; else if (r.interpreterId === u.id && r.status === "accepted") { r.status = "open"; r.interpreterId = null; } });
    delete D.learning[u.id]; delete D.interpreters[u.id]; delete D.emailIndex[u.email]; delete D.users[u.id];
    store.save(); setCookie(req, res, "", 0); res.json({ ok: true });
  });

  /* ------------------------------------------------------------------ role selection */
  function chooseRole(u, role) {
    u.role = role;
    if (role === "primary" && !u.inviteCode) { const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; let c; do { c = Array.from(crypto.randomBytes(8)).map((x) => A[x % A.length]).join(""); } while (Object.values(D.users).some((x) => x.inviteCode === c)); u.inviteCode = c; }
    if (!u.roleData[role]) u.roleData[role] = role === "primary" ? emptyPrimary() : {};
    if (role === "interpreter" && !D.interpreters[u.id]) D.interpreters[u.id] = { status: "not_submitted", history: [], updatedAt: now() };
    onboardingFor(u); store.save();
  }
  app.post("/api/me/role", auth, needVerified, (req, res) => {
    const role = String((req.body || {}).role || "");
    if (ROLES.indexOf(role) < 0) return fail(res, 400, "validation", "Please choose one of the four options.");
    if (req.user.role) return fail(res, 409, "role_set", "You have already chosen how you use SANGAM. Change it from Account settings.");
    chooseRole(req.user, role); res.json({ ok: true, me: me(req.user) });
  });
  // Safe change: needs the password again, keeps all earlier role data, and never grants interpreter verification.
  app.post("/api/me/role/change", auth, needVerified, limited("rolechg", 10, 3600 * 1000), async (req, res) => {
    const u = req.user, role = String((req.body || {}).role || "");
    if (ROLES.indexOf(role) < 0) return fail(res, 400, "validation", "Please choose one of the four options.");
    if (!(await verifyPassword(String((req.body || {}).password || ""), u.passwordHash))) return fail(res, 400, "bad_credentials", "Your password is not correct, so your account type was not changed.", { password: "Your password is not correct." });
    chooseRole(u, role); res.json({ ok: true, me: me(u) });
  });

  /* ------------------------------------------------------------------ onboarding: one validator per role and step */
  function vProfile(d, role) {
    const e = {}, v = {};
    v.displayName = clean(d.displayName, 60); if (!v.displayName) e.displayName = role === "interpreter" ? "Please enter your full name." : "Please enter the name you would like to use.";
    v.language = LANG_RE.test(String(d.language || "")) ? String(d.language) : "en-IN";
    if (d.avatar !== undefined) { if (d.avatar === "" ) v.avatar = ""; else if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(String(d.avatar)) && String(d.avatar).length <= 60000) v.avatar = d.avatar; else e.avatar = "That picture is too large or is not a JPEG, PNG or WebP image."; }
    if (role === "primary") v.formOfAddress = clean(d.formOfAddress, 30);
    return { e, v };
  }
  const STEP = {
    primary: {
      profile: (d) => vProfile(d, "primary"),
      send: (d) => ({ e: {}, v: { send: pickList(d.send, LISTS.send) } }),
      receive: (d) => ({ e: {}, v: { receive: pickList(d.receive, LISTS.receive) } }),
      accessibility: (d) => {
        const dsp = d.display || {}, nav = d.navigation || {}, aud = d.audio || {}, oth = d.other || {}, rate = Number(aud.rate);
        return { e: {}, v: {
          display: { textSize: LISTS.textSize.indexOf(dsp.textSize) >= 0 ? dsp.textSize : "standard", theme: LISTS.theme.indexOf(dsp.theme) >= 0 ? dsp.theme : "light" },
          navigation: { screenReader: bool(nav.screenReader), keyboard: bool(nav.keyboard), voiceNav: bool(nav.voiceNav), reducedMotion: bool(nav.reducedMotion) },
          audio: { voice: clean(aud.voice, 120), rate: rate >= 0.7 && rate <= 1.3 ? rate : 1, spokenNotifications: bool(aud.spokenNotifications) },
          other: { haptics: bool(oth.haptics) },
        } };
      },
    },
    secondary: {
      profile: (d) => vProfile(d, "secondary"),
      relationship: (d) => { const r = String(d.relationship || ""); return LISTS.relationship.indexOf(r) < 0 ? { e: { relationship: "Please choose how you support people." }, v: {} } : { e: {}, v: { relationship: r } }; },
      communication: (d) => ({ e: {}, v: { commMethods: pickList(d.commMethods, LISTS.comm) } }),
      connection: () => ({ e: {}, v: { connectionStepSeen: true } }),
    },
    community: {
      profile: (d) => vProfile(d, "community"),
      interests: (d) => ({ e: {}, v: { interests: pickList(d.interests, LISTS.interests) } }),
      level: (d) => ({ e: {}, v: { level: LISTS.level.indexOf(d.level) >= 0 ? d.level : "beginner" } }),
    },
    interpreter: {
      profile: (d) => { const r = vProfile(d, "interpreter"); const m = LISTS.contactMethod.indexOf(d.preferredContact) >= 0 ? d.preferredContact : "in_app"; const ce = clean(d.contactEmail, 254); if (ce && !isEmail(ce)) r.e.contactEmail = "Please enter a valid contact email or leave it blank."; r.v.contactEmail = ce; r.v.phone = clean(d.phone, 30); r.v.preferredContact = m; return r; },
      languages: (d) => {
        const langs = (Array.isArray(d.languages) ? d.languages : []).map((x) => clean(x, 60)).filter((x, i, a) => x && a.indexOf(x) === i).slice(0, 10);
        return langs.length ? { e: {}, v: { languages: langs, signProficiency: LISTS.proficiency.indexOf(d.signProficiency) >= 0 ? d.signProficiency : "none" } } : { e: { languages: "Add at least one language you can interpret." }, v: {} };
      },
      professional: (d) => ({ e: {}, v: {
        qualifications: cleanMulti(d.qualifications, 1000), certificationBody: clean(d.certificationBody, 120), certificationNumber: clean(d.certificationNumber, 60),
        experienceYears: Math.min(60, Math.max(0, parseInt(d.experienceYears, 10) || 0)), specialisations: (Array.isArray(d.specialisations) ? d.specialisations : []).map((x) => clean(x, 60)).filter(Boolean).slice(0, 10),
      } }),
      availability: (d) => {
        const status = LISTS.availability.indexOf(d.status) >= 0 ? d.status : "unavailable";
        const schedule = (Array.isArray(d.schedule) ? d.schedule : []).slice(0, 14).map((s) => ({ day: Math.min(6, Math.max(0, parseInt(s.day, 10) || 0)), from: /^\d{2}:\d{2}$/.test(s.from) ? s.from : "09:00", to: /^\d{2}:\d{2}$/.test(s.to) ? s.to : "17:00" }));
        return { e: {}, v: { availability: { status, schedule }, sessionTypes: pickList(d.sessionTypes, LISTS.sessionType) } };
      },
      verification: () => ({ e: {}, v: {} }),
    },
  };
  const REQUIRED = { primary: ["profile"], secondary: ["profile", "relationship"], community: ["profile"], interpreter: ["profile", "languages"] };

  app.put("/api/me/onboarding/:step", auth, needVerified, (req, res) => {
    const u = req.user; if (!u.role) return fail(res, 400, "no_role", "Choose how you will use SANGAM first.");
    const step = req.params.step, fn = STEP[u.role][step];
    if (!fn) return fail(res, 404, "unknown_step", "That step does not exist for your account type.");
    const { e, v } = fn(req.body || {});
    if (Object.keys(e).length) return fail(res, 400, "validation", "Please check the highlighted fields.", e);
    if (step === "profile") { ["displayName", "language", "avatar", "formOfAddress"].forEach((k) => { if (v[k] !== undefined) u.profile[k] = v[k]; }); delete v.displayName; delete v.language; delete v.avatar; delete v.formOfAddress; }
    u.roleData[u.role] = Object.assign(u.roleData[u.role] || {}, v);
    if (u.role === "interpreter" && step === "professional") { const iv = interp(u); if (iv && iv.status === "verified") setVerification(u, "pending_review", "Professional details were changed, so they must be reviewed again.", "system"); }
    onboardingFor(u).done[step] = true; store.save();
    res.json({ ok: true, me: me(u) });
  });

  app.post("/api/me/onboarding/complete", auth, needVerified, (req, res) => {
    const u = req.user; if (!u.role) return fail(res, 400, "no_role", "Choose how you will use SANGAM first.");
    const ob = onboardingFor(u), missing = REQUIRED[u.role].filter((s) => !ob.done[s]);
    if (missing.length) return fail(res, 400, "incomplete", "A required step is not finished yet.", { step: missing[0] });
    const rd = u.roleData[u.role];
    if (u.role === "primary") {
      // Skipped sections are not left empty: sensible defaults are applied and the profile says so.
      if (!rd.send || !rd.send.length) { rd.send = ["type"]; rd.usedDefaults = true; }
      if (!rd.receive || !rd.receive.length) { rd.receive = ["captions"]; rd.usedDefaults = true; }
    }
    ob.completed = true; ob.completedAt = now(); store.save();
    res.json({ ok: true, me: me(u) });
  });

  // The accessibility profile of a primary user (also edited later from Account settings / the Access profile panel).
  app.put("/api/me/preferences", auth, needVerified, needRole("primary"), (req, res) => {
    const u = req.user, b = req.body || {}, rd = u.roleData.primary = u.roleData.primary || emptyPrimary();
    if (b.send !== undefined) rd.send = pickList(b.send, LISTS.send);
    if (b.receive !== undefined) rd.receive = pickList(b.receive, LISTS.receive);
    const a = STEP.primary.accessibility({ display: Object.assign({}, rd.display, b.display), navigation: Object.assign({}, rd.navigation, b.navigation), audio: Object.assign({}, rd.audio, b.audio), other: Object.assign({}, rd.other, b.other) }).v;
    Object.assign(rd, a); rd.usedDefaults = false;
    store.save(); res.json({ ok: true, me: me(u) });
  });

  /* ------------------------------------------------------------------ interpreter verification */
  function setVerification(u, status, note, by) {
    const v = D.interpreters[u.id] || (D.interpreters[u.id] = { status: "not_submitted", history: [] });
    v.history.push({ from: v.status, to: status, at: now(), by: by || "system", note: clean(note, 500) });
    v.status = status; v.note = clean(note, 500); v.updatedAt = now(); store.save();
  }
  app.post("/api/interpreter/submit", auth, needVerified, needRole("interpreter"), (req, res) => {
    const u = req.user, rd = u.roleData.interpreter || {}, v = D.interpreters[u.id];
    if (!(rd.languages && rd.languages.length)) return fail(res, 400, "incomplete", "Add the languages you interpret before submitting.", { step: "languages" });
    if (!(rd.qualifications || rd.certificationBody)) return fail(res, 400, "incomplete", "Describe your qualifications or certification so a reviewer has something to check.", { step: "professional" });
    if (v.status === "pending_review" || v.status === "verified") return res.json({ ok: true, me: me(u), unchanged: true });
    setVerification(u, "pending_review", "", "user"); v.submittedAt = now(); store.save();
    Object.values(D.users).filter((x) => x.isAdmin).forEach((a) => notify(a.id, "verification_update", "Interpreter review needed", publicName(u) + " submitted their details for verification.", "#/me/admin"));
    onboardingFor(u).done.verification = true; store.save();
    res.json({ ok: true, me: me(u) });
  });
  app.get("/api/admin/interpreters", auth, needAdmin, (req, res) => {
    const want = String(req.query.status || "pending_review");
    const rows = Object.keys(D.interpreters).filter((id) => want === "all" || D.interpreters[id].status === want).map((id) => {
      const u = D.users[id], v = D.interpreters[id]; if (!u) return null; const rd = u.roleData.interpreter || {};
      return { userId: id, name: publicName(u), email: u.email, status: v.status, submittedAt: v.submittedAt || null, note: v.note || "", languages: rd.languages || [], signProficiency: rd.signProficiency || "none", qualifications: rd.qualifications || "", certificationBody: rd.certificationBody || "", certificationNumber: rd.certificationNumber || "", experienceYears: rd.experienceYears || 0, specialisations: rd.specialisations || [], history: v.history.slice(-5) };
    }).filter(Boolean);
    res.json({ ok: true, rows });
  });
  app.post("/api/admin/interpreters/:id/verification", auth, needAdmin, (req, res) => {
    const u = D.users[req.params.id], status = String((req.body || {}).status || "");
    if (!u || u.role !== "interpreter" || !D.interpreters[u.id]) return fail(res, 404, "not_found", "That interpreter was not found.");
    if (["verified", "rejected", "additional_info_required", "pending_review"].indexOf(status) < 0) return fail(res, 400, "validation", "Choose a valid status.");
    if (u.id === req.user.id) return fail(res, 403, "forbidden", "You cannot change your own verification.");
    const note = clean((req.body || {}).note, 500);
    if ((status === "rejected" || status === "additional_info_required") && !note) return fail(res, 400, "validation", "Please explain your decision so the interpreter knows what to do.", { note: "A note is required." });
    setVerification(u, status, note, req.user.id);
    const msg = { verified: "Your interpreter account has been verified. You can now receive requests.", rejected: "Your verification was not approved. " + note, additional_info_required: "More information is needed. " + note, pending_review: "Your details are back in review." }[status];
    notify(u.id, "verification_update", "Interpreter verification: " + status.replace(/_/g, " "), msg, "#/me/qualifications");
    res.json({ ok: true });
  });
  app.put("/api/interpreter/availability", auth, needVerified, needRole("interpreter"), (req, res) => {
    const u = req.user, r = STEP.interpreter.availability(req.body || {}).v; Object.assign(u.roleData.interpreter = u.roleData.interpreter || {}, r); store.save(); res.json({ ok: true, me: me(u) });
  });

  /* ------------------------------------------------------------------ connections (primary <-> supporter) */
  const connView = (c, viewer) => {
    const isPrimary = viewer.id === c.primaryId, other = D.users[isPrimary ? c.supporterId : c.primaryId];
    const v = { id: c.id, status: c.status, permissions: c.permissions, relationship: c.relationship, createdAt: c.createdAt, respondedAt: c.respondedAt || null, as: isPrimary ? "primary" : "supporter", other: { displayName: publicName(other), avatar: other && other.profile.avatar ? other.profile.avatar : "" } };
    if (c.status === "approved" && c.activeSessionId && ctx.sessionState(c.activeSessionId) === "active") v.activeSession = { id: c.activeSessionId, joinPath: c.joinPath };
    // A supporter sees the primary user's communication preferences only if that was explicitly allowed.
    if (!isPrimary && c.status === "approved" && c.permissions.preferences && other && other.roleData.primary) { const p = other.roleData.primary; v.preferences = { send: p.send || [], receive: p.receive || [] }; }
    return v;
  };
  const liveConn = (primaryId, supporterId) => Object.values(D.connections).find((c) => c.primaryId === primaryId && c.supporterId === supporterId && (c.status === "pending" || c.status === "approved"));
  function findPrimary(q) {
    const code = clean(q.code, 20).toUpperCase(), email = clean(q.email, 254).toLowerCase();
    let t = null;
    if (code) t = Object.values(D.users).find((u) => u.inviteCode === code);
    else if (email) { const x = D.users[D.emailIndex[email]]; if (x && x.settings.discoverByEmail) t = x; }   // email lookup only for people who turned it on
    return t && t.role === "primary" && onboardingFor(t).completed ? t : null;
  }
  app.get("/api/connections/lookup", auth, needVerified, needRole("secondary"), limited("lookup", 30, 600 * 1000), (req, res) => {
    const t = findPrimary(req.query || {});
    if (!t) return fail(res, 404, "not_found", "We could not find anyone with that code or email. Check it with them, or ask them for their invitation code.");
    res.json({ ok: true, found: { displayName: publicName(t), avatar: t.profile.avatar || "" } });
  });
  app.get("/api/connections", auth, needVerified, (req, res) => {
    const list = Object.values(D.connections).filter((c) => c.primaryId === req.user.id || c.supporterId === req.user.id).sort((a, b) => b.createdAt - a.createdAt);
    res.json({ ok: true, connections: list.map((c) => connView(c, req.user)) });
  });
  app.post("/api/connections", auth, needVerified, needRole("secondary"), limited("connreq", 20, 3600 * 1000), (req, res) => {
    const u = req.user, b = req.body || {}, t = findPrimary(b);
    if (!t) return fail(res, 404, "not_found", "We could not find anyone with that code or email.");
    if (t.id === u.id) return fail(res, 400, "validation", "You cannot connect to yourself.");
    if (liveConn(t.id, u.id)) return fail(res, 409, "exists", "You already have a connection or a waiting request with this person.");
    const c = { id: uid(), primaryId: t.id, supporterId: u.id, status: "pending", relationship: LISTS.relationship.indexOf(b.relationship) >= 0 ? b.relationship : (u.roleData.secondary || {}).relationship || "supporter", permissions: { messages: false, preferences: false, transcripts: false }, createdAt: now() };
    D.connections[c.id] = c; store.save();
    notify(t.id, "connection_request", "New connection request", publicName(u) + " would like to connect as your " + c.relationship + ".", "#/me/connections");
    res.status(201).json({ ok: true, connection: connView(c, u) });
  });
  app.post("/api/connections/:id/respond", auth, needVerified, needRole("primary"), (req, res) => {
    const c = D.connections[req.params.id];
    if (!c || c.primaryId !== req.user.id) return fail(res, 404, "not_found", "That request was not found.");
    if (c.status !== "pending") return fail(res, 409, "already_answered", "This request has already been answered.");
    const accept = (req.body || {}).accept === true, p = (req.body || {}).permissions || {};
    c.status = accept ? "approved" : "declined"; c.respondedAt = now();
    if (accept) c.permissions = { messages: p.messages !== false, preferences: bool(p.preferences), transcripts: bool(p.transcripts) };
    store.save();
    notify(c.supporterId, "connection_update", accept ? "Connection approved" : "Connection declined", accept ? publicName(req.user) + " approved your request." : publicName(req.user) + " did not approve your request.", "#/me/connections");
    res.json({ ok: true, connection: connView(c, req.user) });
  });
  app.put("/api/connections/:id/permissions", auth, needVerified, needRole("primary"), (req, res) => {
    const c = D.connections[req.params.id];
    if (!c || c.primaryId !== req.user.id || c.status !== "approved") return fail(res, 404, "not_found", "That connection was not found.");
    const p = req.body || {}; c.permissions = { messages: bool(p.messages), preferences: bool(p.preferences), transcripts: bool(p.transcripts) }; store.save();
    res.json({ ok: true, connection: connView(c, req.user) });
  });
  app.post("/api/connections/:id/revoke", auth, needVerified, (req, res) => {
    const c = D.connections[req.params.id];
    if (!c || (c.primaryId !== req.user.id && c.supporterId !== req.user.id) || c.status === "revoked" || c.status === "declined") return fail(res, 404, "not_found", "That connection was not found.");
    const wasPending = c.status === "pending"; c.status = "revoked"; c.respondedAt = now();
    store.save();
    const other = req.user.id === c.primaryId ? c.supporterId : c.primaryId;
    notify(other, "connection_update", wasPending ? "A request was withdrawn" : "A connection ended", publicName(req.user) + (wasPending ? " withdrew a connection request." : " ended your connection."), "#/me/connections");
    res.json({ ok: true });
  });
  function recordSession(kind, refId, userA, userB, s, label) {
    const r = { id: uid(), kind, refId, sessionId: s.id, joinPath: "#/join/" + s.id + "/" + s.token, userIds: [userA, userB].filter(Boolean), label, startedBy: userA, startedAt: now() };
    D.commSessions[r.id] = r; store.save(); return r;
  }
  app.post("/api/connections/:id/session", auth, needVerified, async (req, res) => {
    const c = D.connections[req.params.id];
    if (!c || (c.primaryId !== req.user.id && c.supporterId !== req.user.id) || c.status !== "approved") return fail(res, 404, "not_found", "That connection was not found.");
    if (!c.permissions.messages) return fail(res, 403, "no_permission", "Messages are not allowed on this connection. " + (req.user.id === c.primaryId ? "Turn them on in the connection's permissions." : "Ask them to allow messages."));
    if (c.activeSessionId && ctx.sessionState(c.activeSessionId) === "active") return res.json({ ok: true, session: { id: c.activeSessionId, joinPath: c.joinPath }, reused: true });
    const other = D.users[req.user.id === c.primaryId ? c.supporterId : c.primaryId];
    const s = await ctx.createSession(req, "Conversation: " + publicName(req.user) + " and " + publicName(other));
    const rec = recordSession("connection", c.id, req.user.id, other.id, s, publicName(req.user) + " and " + publicName(other));
    c.activeSessionId = s.id; c.joinPath = rec.joinPath; store.save();
    notify(other.id, "session_invite", "Conversation started", publicName(req.user) + " started a conversation with you.", rec.joinPath);
    res.status(201).json({ ok: true, session: { id: s.id, joinPath: rec.joinPath } });
  });

  /* ------------------------------------------------------------------ interpreter requests */
  const isVerifiedInterpreter = (u) => u.role === "interpreter" && interp(u) && interp(u).status === "verified";
  const reqView = (r, viewer) => {
    const asker = D.users[r.requesterId], v = { id: r.id, language: r.language, sessionType: r.sessionType, proposedTime: r.proposedTime, note: viewer.id === r.requesterId || (r.interpreterId === viewer.id) || isVerifiedInterpreter(viewer) ? r.note : "", status: r.status, createdAt: r.createdAt, requester: { displayName: publicName(asker) } };
    if (r.status === "accepted" || r.status === "completed") { const it = D.users[r.interpreterId]; v.interpreter = { displayName: publicName(it) }; if (r.status === "accepted" && (viewer.id === r.requesterId || viewer.id === r.interpreterId)) v.joinPath = r.joinPath; }
    v.mine = viewer.id === r.requesterId; return v;
  };
  const expireRequests = () => Object.values(D.interpRequests).forEach((r) => { if (r.status === "open" && now() - r.createdAt > 6 * 3600 * 1000) { r.status = "expired"; store.save(); } });
  app.post("/api/interpreter-requests", auth, needVerified, needRole("primary", "secondary"), limited("ireq", 15, 3600 * 1000), (req, res) => {
    const b = req.body || {}, language = clean(b.language, 60), errors = {};
    if (!language) errors.language = "Choose the language you need.";
    const st = LISTS.sessionType.indexOf(b.sessionType) >= 0 ? b.sessionType : "conversation";
    let proposed = null; if (b.proposedTime) { const t = Date.parse(b.proposedTime); if (isNaN(t) || t < now() - 60000 || t > now() + 90 * 86400000) errors.proposedTime = "Choose a time within the next 90 days."; else proposed = new Date(t).toISOString(); }
    if (Object.keys(errors).length) return fail(res, 400, "validation", "Please check the highlighted fields.", errors);
    const open = Object.values(D.interpRequests).filter((r) => r.requesterId === req.user.id && r.status === "open").length;
    if (open >= 3) return fail(res, 429, "too_many", "You already have three requests waiting. Cancel one or wait for an interpreter.");
    const r = { id: uid(), requesterId: req.user.id, language, sessionType: st, proposedTime: proposed, note: cleanMulti(b.note, 300), status: "open", declinedBy: [], interpreterId: null, createdAt: now() };
    D.interpRequests[r.id] = r; store.save();
    const matches = Object.values(D.users).filter((u) => isVerifiedInterpreter(u) && (u.roleData.interpreter.availability || {}).status !== "unavailable" && (u.roleData.interpreter.languages || []).some((l) => l.toLowerCase() === language.toLowerCase()));
    matches.forEach((m) => notify(m.id, "interpreter_request", "New interpreter request", publicName(req.user) + " needs " + language + " interpretation.", "#/me/requests"));
    res.status(201).json({ ok: true, request: reqView(r, req.user), interpretersNotified: matches.length });
  });
  app.get("/api/interpreter-requests/mine", auth, needVerified, (req, res) => {
    expireRequests();
    const list = Object.values(D.interpRequests).filter((r) => r.requesterId === req.user.id || r.interpreterId === req.user.id).sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
    res.json({ ok: true, requests: list.map((r) => reqView(r, req.user)) });
  });
  app.get("/api/interpreter/requests", auth, needVerified, needRole("interpreter"), (req, res) => {
    expireRequests();
    const u = req.user;
    if (!isVerifiedInterpreter(u)) return res.json({ ok: true, verified: false, open: [], mine: [] });
    const langs = ((u.roleData.interpreter || {}).languages || []).map((l) => l.toLowerCase());
    const open = Object.values(D.interpRequests).filter((r) => r.status === "open" && r.declinedBy.indexOf(u.id) < 0 && langs.indexOf(r.language.toLowerCase()) >= 0).sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
    const mine = Object.values(D.interpRequests).filter((r) => r.interpreterId === u.id).sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
    res.json({ ok: true, verified: true, open: open.map((r) => reqView(r, u)), mine: mine.map((r) => reqView(r, u)) });
  });
  app.post("/api/interpreter-requests/:id/accept", auth, needVerified, needRole("interpreter"), async (req, res) => {
    const r = D.interpRequests[req.params.id], u = req.user;
    if (!isVerifiedInterpreter(u)) return fail(res, 403, "not_verified", "Your interpreter account has not been verified yet, so you cannot accept requests.");
    if (!r || r.status !== "open") return fail(res, 409, "unavailable", "This request is no longer open.");
    r.status = "accepted"; r.interpreterId = u.id;     // claimed before the awaited call so two interpreters cannot both accept
    const asker = D.users[r.requesterId];
    try {
      const s = await ctx.createSession(req, "Interpreted conversation: " + publicName(asker) + " with " + publicName(u));
      const rec = recordSession("interpreter", r.id, u.id, asker && asker.id, s, "Interpreted conversation (" + r.language + ")");
      r.sessionId = s.id; r.joinPath = rec.joinPath;
    } catch (e) { r.status = "open"; r.interpreterId = null; store.save(); return fail(res, 500, "session_failed", "We could not start the session. Please try again."); }
    store.save();
    notify(r.requesterId, "interpreter_update", "An interpreter accepted", publicName(u) + " accepted your " + r.language + " request.", r.joinPath);
    res.json({ ok: true, request: reqView(r, u) });
  });
  app.post("/api/interpreter-requests/:id/decline", auth, needVerified, needRole("interpreter"), (req, res) => {
    const r = D.interpRequests[req.params.id]; if (!r || r.status !== "open") return fail(res, 409, "unavailable", "This request is no longer open.");
    if (r.declinedBy.indexOf(req.user.id) < 0) r.declinedBy.push(req.user.id); store.save(); res.json({ ok: true });
  });
  function endRequest(req, res, status) {
    const r = D.interpRequests[req.params.id], u = req.user;
    if (!r || (r.requesterId !== u.id && r.interpreterId !== u.id)) return fail(res, 404, "not_found", "That request was not found.");
    if (status === "cancelled" && r.status !== "open" && r.status !== "accepted") return fail(res, 409, "unavailable", "This request can no longer be cancelled.");
    if (status === "completed" && r.status !== "accepted") return fail(res, 409, "unavailable", "Only a session in progress can be ended.");
    if (r.sessionId && ctx.endSession) ctx.endSession(r.sessionId);
    r.status = status; store.save();
    const other = u.id === r.requesterId ? r.interpreterId : r.requesterId;
    if (other) notify(other, "interpreter_update", status === "completed" ? "Session ended" : "Request cancelled", publicName(u) + (status === "completed" ? " ended the interpreted session." : " cancelled the request."), "#/me/history");
    res.json({ ok: true });
  }
  app.post("/api/interpreter-requests/:id/complete", auth, needVerified, (req, res) => endRequest(req, res, "completed"));
  app.post("/api/interpreter-requests/:id/cancel", auth, needVerified, (req, res) => endRequest(req, res, "cancelled"));

  /* ------------------------------------------------------------------ communication session history (who and when, never message text) */
  app.get("/api/comm-sessions", auth, needVerified, (req, res) => {
    const list = Object.values(D.commSessions).filter((s) => s.userIds.indexOf(req.user.id) >= 0).sort((a, b) => b.startedAt - a.startedAt).slice(0, 50)
      .map((s) => ({ id: s.id, kind: s.kind, label: s.label, startedAt: s.startedAt, status: ctx.sessionState(s.sessionId), joinPath: ctx.sessionState(s.sessionId) === "active" ? s.joinPath : null, withName: publicName(D.users[s.userIds.find((x) => x !== req.user.id)]) }));
    res.json({ ok: true, sessions: list });
  });

  /* ------------------------------------------------------------------ notifications */
  app.get("/api/notifications", auth, needVerified, (req, res) => {
    const list = Object.values(D.notifications).filter((n) => n.userId === req.user.id).sort((a, b) => b.createdAt - a.createdAt).slice(0, 100);
    res.json({ ok: true, unread: list.filter((n) => !n.read).length, notifications: list.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, link: n.link, createdAt: n.createdAt, read: n.read })) });
  });
  app.post("/api/notifications/read-all", auth, needVerified, (req, res) => { Object.values(D.notifications).forEach((n) => { if (n.userId === req.user.id) n.read = true; }); store.save(); res.json({ ok: true }); });
  app.post("/api/notifications/:id/read", auth, needVerified, (req, res) => { const n = D.notifications[req.params.id]; if (!n || n.userId !== req.user.id) return fail(res, 404, "not_found", "Not found."); n.read = true; store.save(); res.json({ ok: true }); });
  app.delete("/api/notifications/:id", auth, needVerified, (req, res) => { const n = D.notifications[req.params.id]; if (!n || n.userId !== req.user.id) return fail(res, 404, "not_found", "Not found."); delete D.notifications[n.id]; store.save(); res.json({ ok: true }); });

  /* ------------------------------------------------------------------ learning progress (saved per account) */
  const LESSON_RE = /^[a-z0-9][a-z0-9:_-]{0,59}$/;
  const learn = (u) => D.learning[u.id] || (D.learning[u.id] = { completed: {}, bookmarks: {}, last: null, recent: [] });
  app.get("/api/learning/progress", auth, needVerified, (req, res) => { const L = learn(req.user); res.json({ ok: true, completed: Object.keys(L.completed), bookmarks: Object.keys(L.bookmarks), last: L.last, recent: L.recent }); });
  app.put("/api/learning/progress", auth, needVerified, (req, res) => {
    const b = req.body || {}, id = String(b.lessonId || "");
    if (!LESSON_RE.test(id)) return fail(res, 400, "validation", "That lesson could not be saved.");
    const L = learn(req.user), t = now();
    if (b.completed !== undefined) { if (bool(b.completed)) L.completed[id] = t; else delete L.completed[id]; }
    if (b.bookmarked !== undefined) { if (bool(b.bookmarked)) L.bookmarks[id] = t; else delete L.bookmarks[id]; }
    if (b.viewed) { L.last = { id, at: t }; L.recent = [id].concat(L.recent.filter((x) => x !== id)).slice(0, 10); }
    store.save(); res.json({ ok: true, completed: Object.keys(L.completed), bookmarks: Object.keys(L.bookmarks), last: L.last, recent: L.recent });
  });

  // Housekeeping: expired tokens and sessions.
  setInterval(() => { const t = now(); let ch = false; Object.keys(D.tokens).forEach((k) => { if (D.tokens[k].expiresAt < t) { delete D.tokens[k]; ch = true; } }); Object.keys(D.sessions).forEach((k) => { if (D.sessions[k].expiresAt < t) { delete D.sessions[k]; ch = true; } }); if (ch) store.save(); }, 10 * 60 * 1000).unref();

  return { store, flush: store.flush, _D: D };
};
module.exports.ROLES = ROLES;
module.exports.STEPS = STEPS;
