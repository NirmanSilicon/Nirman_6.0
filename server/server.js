/*
 * SANGAM — Person 5 backend (hardened build)
 * ----------------------------------------------------------------------------
 * This file adds the shared services the static SANGAM frontend cannot
 * provide on its own:
 *
 *   1. QR communication sessions   (create / join / end, secure tokens, expiry)
 *   2. Real-time two-way messaging (WebSocket relay, presence, typing, turns)
 *   3. Volunteer assistance        (request -> pending -> accepted -> completed)
 *
 * It serves the pre-existing static site unchanged, so every original feature
 * (profile, captions, OCR, phrase board) keeps working exactly as before.
 *
 * SECURITY MODEL (what the server trusts, and what it does not):
 *   - Session join token (`session.token`)  — printed on the QR, held by guests.
 *   - Session host key   (`session.hostKey`) — handed to the creator only.
 *   - Participant key    (`participant.participantKey`) — minted on first
 *       connect, returned once in the `welcome` frame, required on reconnect.
 *       Any client supplying a `pid` without the matching `pkey` is treated as
 *       a NEW participant (subject to MAX_PARTICIPANTS); it cannot adopt
 *       someone else's identity.
 *   - Volunteer key      (`volunteer.volunteerKey`) — provisioned via
 *       POST /api/assist/volunteer. Required to list / accept / decline /
 *       complete requests. The requester uses `claimKey` for their own request.
 *
 * Storage is in-memory only. Private conversation text is never written to
 * disk; it lives in memory for the life of a session and is dropped when the
 * session ends or expires.
 */
"use strict";

const http = require("http");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const express = require("express");
const { WebSocketServer } = require("ws");
const QRCode = require("qrcode");
const translator = require("./translate");

/* ----------------------------------------------------------------------------
 * Minimal .env loader (avoids an extra dependency).
 * -------------------------------------------------------------------------- */
(function loadEnv() {
  try {
    const envPath = path.join(__dirname, "..", ".env");
    if (!fs.existsSync(envPath)) return;
    const text = fs.readFileSync(envPath, "utf8");
    text.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) return;
      const key = m[1];
      let val = m[2];
      if (/^".*"$/.test(val) || /^'.*'$/.test(val)) val = val.slice(1, -1);
      if (process.env[key] === undefined) process.env[key] = val;
    });
  } catch (e) {
    /* non-fatal */
  }
})();

const PORT = parseInt(process.env.PORT, 10) || 8080;
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
const SESSION_TTL_MS = (parseInt(process.env.SESSION_TTL_MINUTES, 10) || 60) * 60 * 1000;
const ASSIST_TTL_MS = (parseInt(process.env.ASSIST_TTL_MINUTES, 10) || 180) * 60 * 1000;
const MAX_PARTICIPANTS = parseInt(process.env.MAX_PARTICIPANTS, 10) || 8;
const MSG_RATE_WINDOW_MS = parseInt(process.env.MSG_RATE_WINDOW_MS, 10) || 10 * 1000;
const MSG_RATE_MAX = parseInt(process.env.MSG_RATE_MAX, 10) || 40; // 40 WS frames per 10s per socket
const MAX_TEXT_LEN = parseInt(process.env.MAX_TEXT_LEN, 10) || 1000;
const RECONNECT_GRACE_MS = parseInt(process.env.RECONNECT_GRACE_MS, 10) || 30 * 1000; // 30s default
const ROOT = path.join(__dirname, "..");
const SOURCES = ["typed", "voice", "ocr", "phrase", "translated", "emergency", "sign"];
const LANG_RE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
const RTC_KINDS = ["offer", "answer", "candidate", "hangup", "decline"];
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);

/* ----------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------- */
function token(bytes) {
  // base64url string with ~1.33 chars per byte — crypto-strength entropy.
  return crypto.randomBytes(bytes).toString("base64url");
}
function shortId() {
  // 12 chars from a 24-byte pool, alphanumeric. ~71 bits of entropy — enough
  // that volunteer request ids cannot be enumerated in practice.
  return crypto.randomBytes(24).toString("base64url").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toLowerCase();
}
function safeEqual(a, b) {
  const ba = Buffer.from(String(a == null ? "" : a));
  const bb = Buffer.from(String(b == null ? "" : b));
  if (ba.length !== bb.length) return false;
  try {
    return crypto.timingSafeEqual(ba, bb);
  } catch (e) {
    return false;
  }
}
function now() { return Date.now(); }
function clamp(str, max) {
  str = String(str == null ? "" : str).trim();
  return str.length > max ? str.slice(0, max) : str;
}
// Redact a secret in log output: keep first 2 chars for debugging, star the rest.
function red(s) { if (!s) return ""; s = String(s); return s.slice(0, 2) + "***(" + s.length + ")"; }

/* ----------------------------------------------------------------------------
 * Session store (communication sessions)
 * -------------------------------------------------------------------------- */
/**
 * session = {
 *   id, name,
 *   token (guest join secret), hostKey (creator secret),
 *   hostPid (set when the creator first connects with a valid hostKey),
 *   createdAt, expiresAt, status: 'active' | 'ended' | 'expired',
 *   turn: pid | null,
 *   participants: Map(pid -> {
 *     pid, participantKey, name, role, connected, joinedAt, sockets:Set
 *   }),
 *   messages: [ { id, from, fromName, text, kind, ts } ]  // in-memory only
 * }
 */
const sessions = new Map();

function buildJoinUrl(req, session) {
  const base = PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
  return `${base}/#/join/${session.id}/${session.token}`;
}

function sessionState(session) {
  const n = now();
  if (session.status === "active" && n > session.expiresAt) session.status = "expired";
  return session.status;
}

function participantCount(session) {
  let connected = 0;
  session.participants.forEach((p) => { if (p.connected) connected += 1; });
  return { total: session.participants.size, connected };
}

function publicSession(session) {
  const counts = participantCount(session);
  return {
    id: session.id,
    name: session.name,
    status: sessionState(session),
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    participants: counts,
    turn: session.turn,
  };
}

function broadcast(session, payload, exceptSocket) {
  const data = JSON.stringify(payload);
  session.participants.forEach((p) => {
    p.sockets.forEach((ws) => {
      if (ws !== exceptSocket && ws.readyState === ws.OPEN) {
        try { ws.send(data); } catch (e) { /* ignore */ }
      }
    });
  });
}

// Deliver a payload to every open socket of ONE participant.
function sendToPid(session, pid, payload) {
  const p = session.participants.get(pid);
  if (!p) return 0;
  const data = JSON.stringify(payload);
  let n = 0;
  p.sockets.forEach((ws) => {
    if (ws.readyState === ws.OPEN) { try { ws.send(data); n += 1; } catch (e) { /* ignore */ } }
  });
  return n;
}

function roster(session) {
  const list = [];
  session.participants.forEach((p) => {
    // Never leak participantKey.
    list.push({ pid: p.pid, name: p.name, role: p.role, connected: p.connected });
  });
  return list;
}

function endSession(session, reason) {
  if (session.status === "ended") return;
  session.status = reason === "expired" ? "expired" : "ended";
  broadcast(session, { type: "session-ended", reason: reason || "ended" });
  session.participants.forEach((p) => {
    p.sockets.forEach((ws) => {
      try { ws.close(4000, reason || "ended"); } catch (e) { /* ignore */ }
    });
  });
}

/* ----------------------------------------------------------------------------
 * Volunteer directory + assistance store
 * -------------------------------------------------------------------------- */
/**
 * volunteer = {
 *   volunteerId, volunteerKey, displayName,
 *   languages: string[],      // e.g. ["English","Hindi","ISL"]
 *   categories: string[],     // e.g. ["language","accessibility"]
 *   availability: string,     // "available" | "busy" | "offline"
 *   createdAt, lastSeen
 * }
 * Server-issued; the client stores it (localStorage) and sends `volunteerKey`
 * on every volunteer-side call. There is no email / password: this is a
 * limited prototype auth mechanism (documented in the README).
 */
const volunteers = new Map();

/**
 * request = {
 *   id, claimKey, category, language, method, description,
 *   status: 'pending' | 'accepted' | 'completed' | 'cancelled',
 *   createdAt, updatedAt,
 *   acceptedBy: volunteerId | null,
 *   volunteerName: string | null,
 *   declinedBy: Set<volunteerId>,   // per-volunteer server-side dismissal
 *   sessionId, joinUrl
 * }
 */
const assistRequests = new Map();
const ASSIST_CATEGORIES = ["language", "communication", "accessibility", "interpreter"];

function publicRequestForVolunteer(r) {
  return {
    id: r.id,
    category: r.category,
    language: r.language,
    method: r.method,
    description: r.description,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    volunteerName: r.volunteerName || null,
  };
}
function publicRequestForOwner(r) {
  return Object.assign(publicRequestForVolunteer(r), {
    joinUrl: r.joinUrl || null,
    sessionId: r.sessionId || null,
  });
}
function requestForAcceptingVolunteer(r) {
  // The volunteer that actually accepted the request also needs the join link.
  return Object.assign(publicRequestForVolunteer(r), { joinUrl: r.joinUrl || null });
}

/* Simple IP-keyed rate limiter for POST-heavy endpoints. */
const ipHits = new Map(); // ip -> [timestamps]
// Defense in depth: cap the number of distinct tracked keys between cleanup
// sweeps. A single key's own array always self-trims to its window (see the
// cleanup interval below), but the *set of keys* was previously unbounded --
// a caller cycling many distinct identifiers (spoofed IPs, participant ids)
// faster than the 30s cleanup runs could grow this map without limit. This
// never weakens a real rate limit; it only means the single oldest-seen key
// starts counting from zero again once the cap is hit.
const IP_HITS_MAX_KEYS = parseInt(process.env.IP_HITS_MAX_KEYS, 10) || 20000;
function rateLimitIp(ip, max, windowMs) {
  const n = now();
  const arr = (ipHits.get(ip) || []).filter((t) => n - t < windowMs);
  arr.push(n);
  if (!ipHits.has(ip) && ipHits.size >= IP_HITS_MAX_KEYS) {
    const oldestKey = ipHits.keys().next().value;
    if (oldestKey !== undefined) ipHits.delete(oldestKey);
  }
  ipHits.set(ip, arr);
  return arr.length <= max;
}

/* ----------------------------------------------------------------------------
 * Periodic cleanup of expired sessions, stale requests, idle volunteers.
 * -------------------------------------------------------------------------- */
setInterval(() => {
  const n = now();
  sessions.forEach((session, id) => {
    if (session.status === "active" && n > session.expiresAt) endSession(session, "expired");
    if (session.status !== "active" && n > session.expiresAt + 2 * 60 * 1000) sessions.delete(id);
  });
  assistRequests.forEach((r, id) => {
    if (n > r.createdAt + ASSIST_TTL_MS) assistRequests.delete(id);
  });
  volunteers.forEach((v, id) => {
    if (n > v.lastSeen + 24 * 60 * 60 * 1000) volunteers.delete(id);
  });
  // Trim rate-limit buckets.
  ipHits.forEach((arr, ip) => {
    const fresh = arr.filter((t) => n - t < 60 * 1000);
    if (!fresh.length) ipHits.delete(ip); else ipHits.set(ip, fresh);
  });
}, 30 * 1000).unref();

/* ----------------------------------------------------------------------------
 * HTTP API
 * -------------------------------------------------------------------------- */
const app = express();
// Trust X-Forwarded-For only to the extent the operator explicitly says to.
// Blindly trusting it (the previous unconditional `true`) lets ANY direct
// client defeat every IP-based rate limit below -- session creation,
// volunteer/request creation, and /api/translate (which can carry a real
// per-call cost against a paid provider key) -- just by sending a fresh,
// self-chosen X-Forwarded-For value on each request. Default is "do not
// trust it", so rate limiting falls back to the real socket address, which
// a client cannot spoof. When SANGAM actually runs behind a reverse proxy
// or tunnel (nginx, ngrok, Cloudflare Tunnel), set TRUST_PROXY in .env:
//   TRUST_PROXY=1         trust exactly one hop -- the normal single-proxy
//                         setup, and the recommended value for that case
//   TRUST_PROXY=loopback  trust only a proxy running on this same machine
//   TRUST_PROXY=true      trust the whole X-Forwarded-For chain (only if
//                         every hop in front of this process is one you
//                         control -- this restores the old behaviour)
const TRUST_PROXY = (function () {
  const v = (process.env.TRUST_PROXY || "").trim();
  if (!v) return false;
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^\d+$/.test(v)) return parseInt(v, 10);
  return v; // e.g. "loopback", or any subnet/string Express itself accepts
})();
app.set("trust proxy", TRUST_PROXY);
app.use(express.json({ limit: "64kb" }));

// Baseline security headers for every response (pages, assets, API).
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Referrer-Policy", "no-referrer");
  res.set("Permissions-Policy", "camera=(self), geolocation=(), payment=(), microphone=(self)");
  res.set("Content-Security-Policy", [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "connect-src 'self' ws: wss: data: blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "));
  next();
});

// Never cache API responses; deny framing of API paths.
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  next();
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, sessions: sessions.size, requests: assistRequests.size, volunteers: volunteers.size, rateLimitKeys: ipHits.size, ts: now() });
});

/* ---- Accounts, roles, onboarding, connections, interpreter requests (server/accounts.js) ---- */
// Shared by POST /api/sessions below and by the account layer (a connection or an accepted interpreter request starts one).
function createSessionRecord(name) {
  const id = shortId();
  const session = {
    id,
    name,
    token: token(24),
    hostKey: token(24),
    hostPid: null,
    createdAt: now(),
    expiresAt: now() + SESSION_TTL_MS,
    status: "active",
    turn: null,
    participants: new Map(),
    messages: [],
  };
  sessions.set(id, session);
  return session;
}
const accounts = require("./accounts")(app, {
  env: process.env,
  trustProxy: !!TRUST_PROXY,
  rateLimitIp,
  createSession: async (req, name) => createSessionRecord(clamp(name, 80) || "SANGAM conversation"),
  sessionState: (id) => { const s = sessions.get(id); return s ? sessionState(s) : "gone"; },
  endSession: (id) => { const s = sessions.get(id); if (s) endSession(s, "ended"); },
});

/* ---- Communication sessions ---- */

// Create a session. Soft rate limit per IP: 20 per minute.
app.post("/api/sessions", async (req, res) => {
  if (!rateLimitIp("create:" + (req.ip || "-"), 20, 60 * 1000)) {
    return res.status(429).json({ error: "rate_limited", message: "Too many sessions created from this address. Try again shortly." });
  }
  const name = clamp((req.body && req.body.name) || "SANGAM conversation", 80) || "SANGAM conversation";
  const session = createSessionRecord(name);

  const joinUrl = buildJoinUrl(req, session);
  let qrDataUrl = null;
  try {
    qrDataUrl = await QRCode.toDataURL(joinUrl, {
      errorCorrectionLevel: "M", margin: 1, width: 320,
      color: { dark: "#16122B", light: "#FFFFFF" },
    });
  } catch (e) {
    qrDataUrl = null;
  }

  res.json({
    id: session.id,
    name: session.name,
    token: session.token,
    hostKey: session.hostKey,
    joinUrl,
    qrDataUrl,
    qrError: qrDataUrl ? null : "QR image could not be generated. Use the copy-link option instead.",
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    wsPath: "/ws",
  });
});

// Look up a session (used by the join page before opening a socket).
app.get("/api/sessions/:id", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "not_found", message: "This session does not exist." });
  if (!safeEqual(req.query.token || "", session.token)) {
    return res.status(403).json({ error: "forbidden", message: "This join link is not valid for this session." });
  }
  const state = sessionState(session);
  if (state !== "active") {
    return res.status(410).json({ error: state, message: `This session has ${state === "expired" ? "expired" : "ended"}.` });
  }
  res.json(publicSession(session));
});

// End a session (creator only).
app.post("/api/sessions/:id/end", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "not_found" });
  const key = (req.body && req.body.hostKey) || req.query.hostKey || "";
  if (!safeEqual(key, session.hostKey)) {
    return res.status(403).json({ error: "forbidden", message: "Only the session creator can end it." });
  }
  endSession(session, "ended");
  res.json({ ok: true, status: session.status });
});

/* ---- Volunteer directory ---- */

// Provision a volunteer identity for this browser. Called once; the client
// stores {volunteerId, volunteerKey} in localStorage and reuses it.
app.post("/api/assist/volunteer", (req, res) => {
  if (!rateLimitIp("vol:" + (req.ip || "-"), 30, 60 * 1000)) {
    return res.status(429).json({ error: "rate_limited" });
  }
  const body = req.body || {};
  const displayName = clamp(body.displayName || "Volunteer", 60) || "Volunteer";
  const languages = Array.isArray(body.languages) ? body.languages.map((l) => clamp(String(l), 40)).filter(Boolean).slice(0, 10) : [];
  const categories = Array.isArray(body.categories) ? body.categories.filter((c) => ASSIST_CATEGORIES.indexOf(c) >= 0).slice(0, 4) : [];
  const availability = ["available", "busy", "offline"].indexOf(body.availability) >= 0 ? body.availability : "available";
  const volunteerId = shortId();
  const v = { volunteerId, volunteerKey: token(24), displayName, languages, categories, availability, createdAt: now(), lastSeen: now() };
  volunteers.set(volunteerId, v);
  res.json({ volunteerId: v.volunteerId, volunteerKey: v.volunteerKey, displayName: v.displayName, languages: v.languages, categories: v.categories, availability: v.availability });
});

// Middleware: a valid volunteer key (header or query) is required.
function requireVolunteer(req, res, next) {
  const vid = req.get("X-Volunteer-Id") || req.query.vid || "";
  const vk = req.get("X-Volunteer-Key") || req.query.vk || "";
  const v = vid && volunteers.get(vid);
  if (!v || !safeEqual(vk, v.volunteerKey)) {
    return res.status(401).json({ error: "unauthorized", message: "Volunteer authentication required. Provision one with POST /api/assist/volunteer." });
  }
  v.lastSeen = now();
  req.volunteer = v;
  next();
}
// Update volunteer profile (display name, languages, categories, availability).
app.put("/api/assist/volunteer", requireVolunteer, (req, res) => {
  const body = req.body || {};
  const name = clamp(body.displayName || "", 60);
  if (name) req.volunteer.displayName = name;
  if (Array.isArray(body.languages)) req.volunteer.languages = body.languages.map((l) => clamp(String(l), 40)).filter(Boolean).slice(0, 10);
  if (Array.isArray(body.categories)) req.volunteer.categories = body.categories.filter((c) => ASSIST_CATEGORIES.indexOf(c) >= 0).slice(0, 4);
  if (["available", "busy", "offline"].indexOf(body.availability) >= 0) req.volunteer.availability = body.availability;
  res.json({ volunteerId: req.volunteer.volunteerId, displayName: req.volunteer.displayName, languages: req.volunteer.languages, categories: req.volunteer.categories, availability: req.volunteer.availability });
});

/* ---- Assistance requests ---- */

// Create a request. No auth needed — anyone can ask for help.
app.post("/api/assist/requests", (req, res) => {
  if (!rateLimitIp("req:" + (req.ip || "-"), 15, 60 * 1000)) {
    return res.status(429).json({ error: "rate_limited" });
  }
  const body = req.body || {};
  const category = ASSIST_CATEGORIES.indexOf(body.category) >= 0 ? body.category : null;
  const language = clamp(body.language, 40);
  const method = clamp(body.method, 40);
  const description = clamp(body.description, 400);
  if (!category) return res.status(400).json({ error: "invalid_category", message: "Choose a valid assistance category." });
  if (!language) return res.status(400).json({ error: "missing_language", message: "Please provide a preferred language." });

  const id = shortId();
  const r = {
    id,
    claimKey: token(24),
    category,
    language,
    method: method || "Any",
    description,
    status: "pending",
    createdAt: now(),
    updatedAt: now(),
    acceptedBy: null,
    volunteerName: null,
    declinedBy: new Set(),
    sessionId: null,
    joinUrl: null,
  };
  assistRequests.set(id, r);
  res.json({ id: r.id, claimKey: r.claimKey, status: r.status, createdAt: r.createdAt });
});

// Volunteer-facing list of open requests. Auth required.
// Requests the calling volunteer has declined are excluded from the list.
app.get("/api/assist/requests", requireVolunteer, (req, res) => {
  const list = [];
  assistRequests.forEach((r) => {
    if (r.status === "pending" && !(r.declinedBy && r.declinedBy.has(req.volunteer.volunteerId))) {
      list.push(publicRequestForVolunteer(r));
    } else if (r.status === "accepted" && r.acceptedBy === req.volunteer.volunteerId) {
      list.push(requestForAcceptingVolunteer(r));
    }
  });
  list.sort((a, b) => b.createdAt - a.createdAt);
  res.json({ requests: list });
});

// Owner polls their own request's status with the claim key.
app.get("/api/assist/requests/:id", (req, res) => {
  const r = assistRequests.get(req.params.id);
  if (!r) return res.status(404).json({ error: "not_found" });
  if (!safeEqual(req.query.key || "", r.claimKey)) return res.status(403).json({ error: "forbidden" });
  res.json(publicRequestForOwner(r));
});

// Volunteer accepts a pending request. Atomic compare-and-set on status.
app.post("/api/assist/requests/:id/accept", requireVolunteer, async (req, res) => {
  const r = assistRequests.get(req.params.id);
  if (!r) return res.status(404).json({ error: "not_found" });
  // Compare-and-set: the first authorised POST wins.
  if (r.status !== "pending") {
    return res.status(409).json({ error: "already_" + r.status, message: "This request is no longer open." });
  }
  const volunteerName = clamp((req.body && req.body.volunteerName) || req.volunteer.displayName, 60) || "Volunteer";

  // Open a chat session for the pair. The volunteer gets host-level control
  // (they can end the session) via the returned hostKey.
  const sid = shortId();
  const session = {
    id: sid,
    name: "Assistance: " + r.category,
    token: token(24),
    hostKey: token(24),
    hostPid: null,
    createdAt: now(),
    expiresAt: now() + SESSION_TTL_MS,
    status: "active",
    turn: null,
    participants: new Map(),
    messages: [],
  };
  sessions.set(sid, session);
  const joinUrl = `${PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`}/#/join/${session.id}/${session.token}`;

  r.status = "accepted";
  r.acceptedBy = req.volunteer.volunteerId;
  r.volunteerName = volunteerName;
  r.sessionId = session.id;
  r.joinUrl = joinUrl;
  r.updatedAt = now();

  // The volunteer gets the hostKey (so they can end the call); the requester
  // gets the plain joinUrl via their /GET poll.
  res.json({ ok: true, status: r.status, joinUrl, hostKey: session.hostKey });
});

// Decline is a per-volunteer personal action; it does not change public state
// but is persisted server-side so the volunteer no longer sees the request.
app.post("/api/assist/requests/:id/decline", requireVolunteer, (req, res) => {
  const r = assistRequests.get(req.params.id);
  if (!r) return res.status(404).json({ error: "not_found" });
  if (!r.declinedBy) r.declinedBy = new Set();
  r.declinedBy.add(req.volunteer.volunteerId);
  res.json({ ok: true, status: r.status });
});

// Complete a request. Allowed to:
//   - the accepting volunteer (via volunteerKey matching acceptedBy), OR
//   - the requester (via claimKey)
app.post("/api/assist/requests/:id/complete", (req, res) => {
  const r = assistRequests.get(req.params.id);
  if (!r) return res.status(404).json({ error: "not_found" });
  if (r.status !== "accepted") return res.status(409).json({ error: "not_accepted" });

  const claimKey = (req.body && req.body.key) || req.query.key || "";
  const vid = req.get("X-Volunteer-Id") || "";
  const vk = req.get("X-Volunteer-Key") || "";
  const ownerOk = claimKey && safeEqual(claimKey, r.claimKey);
  const v = vid && volunteers.get(vid);
  const volunteerOk = v && safeEqual(vk, v.volunteerKey) && v.volunteerId === r.acceptedBy;

  if (!ownerOk && !volunteerOk) {
    return res.status(403).json({ error: "forbidden", message: "Only the requester or the accepting volunteer can complete this request." });
  }
  r.status = "completed";
  r.updatedAt = now();
  res.json({ ok: true, status: r.status });
});

// Cancel a request (owner only).
app.post("/api/assist/requests/:id/cancel", (req, res) => {
  const r = assistRequests.get(req.params.id);
  if (!r) return res.status(404).json({ error: "not_found" });
  if (!safeEqual((req.body && req.body.key) || req.query.key || "", r.claimKey)) {
    return res.status(403).json({ error: "forbidden", message: "Only the requester can cancel this request." });
  }
  if (r.status === "completed") return res.status(409).json({ error: "already_completed" });
  r.status = "cancelled";
  r.updatedAt = now();
  res.json({ ok: true, status: r.status });
});

/* ---- Capabilities + translation + RTC config (no secrets are ever returned) ---- */

function parseIceServers() {
  // ICE_SERVERS is a JSON array, e.g. [{"urls":"stun:stun.example.org:3478"}].
  // Default is empty: host candidates only (works on one LAN). A TURN credential
  // placed here WOULD be sent to participants, so only use short-lived ones.
  try {
    const v = JSON.parse(process.env.ICE_SERVERS || "[]");
    return Array.isArray(v) ? v : [];
  } catch (e) { return []; }
}

app.get("/api/capabilities", async (req, res) => {
  const t = await translator.status();
  res.json({
    translation: { configured: t.configured, provider: t.provider, message: t.message || null, languages: t.languages === undefined ? null : t.languages },
    rtc: { iceServers: parseIceServers() },
    limits: { maxTextLength: MAX_TEXT_LEN },
    persistence: "memory",
  });
});

// Translate text for a participant of a live session. Requires proof of
// membership so the endpoint cannot be used as an open translation proxy.
app.post("/api/translate", async (req, res) => {
  if (!rateLimitIp("translate:" + (req.ip || "-"), 60, 60 * 1000)) {
    return res.status(429).json({ error: "rate_limited", message: "Too many translation requests. Try again shortly." });
  }
  const b = req.body || {};
  const session = sessions.get(String(b.sessionId || ""));
  const p = session && session.participants.get(String(b.pid || ""));
  if (!session || !p || !safeEqual(b.pkey, p.participantKey) || sessionState(session) !== "active") {
    return res.status(403).json({ error: "forbidden", message: "Translation is available to participants of an active session." });
  }
  if (!rateLimitIp("translate-p:" + p.pid, 30, 60 * 1000)) {
    return res.status(429).json({ error: "rate_limited", message: "Too many translation requests. Try again shortly." });
  }
  const text = clamp(b.text, MAX_TEXT_LEN);
  if (!text) return res.status(400).json({ error: "bad_request", message: "Nothing to translate." });
  try {
    const out = await translator.translate({ text, source: b.source, target: b.target });
    res.json({ ok: true, text: out.text, provider: out.provider, unchanged: !!out.unchanged, source: translator.baseLang(b.source) || out.detected || null, target: translator.baseLang(b.target) });
  } catch (e) {
    const status = e && e.status ? e.status : 502;
    res.status(status).json({ error: (e && e.code) || "translate_failed", message: (e && e.message) || "Translation failed." });
  }
});

/* ----------------------------------------------------------------------------
 * Static site (serves the existing frontend unchanged).
 * -------------------------------------------------------------------------- */
// Only the browser files are public. This used to serve the whole project folder, which would have exposed the account
// database (data/), the .env file and the server source as soon as real accounts existed.
const staticOpts = {
  index: false,
  dotfiles: "ignore",
  setHeaders(res, filePath) {
    if (/\.(?:woff2?|wasm|traineddata\.gz)$/.test(filePath)) {
      res.set("Cache-Control", "public, max-age=604800");
    }
  },
};
app.use("/assets", express.static(path.join(ROOT, "assets"), staticOpts));
app.use("/vendor", express.static(path.join(ROOT, "vendor"), staticOpts));

// SPA fallback for any non-API GET (hash routing keeps deep links working). A missing file under /assets or /vendor is a
// real 404, not the home page.
app.get(/^\/(?!api\/|ws\b).*/, (req, res, next) => {
  if (req.method !== "GET") return next();
  if (/^\/(assets|vendor)\//.test(req.path)) return res.status(404).type("text/plain").send("Not found");
  // Anything that looks like a file (".env", "package.json", "server/server.js") or a dot-folder is a real 404 too. It would
  // only ever have been the home page, but a 200 for "/.env" looks like a leak to a scanner and confuses people.
  if (/\.[A-Za-z0-9]{1,8}$/.test(req.path) || /(^|\/)\./.test(req.path) || /^\/(server|data|docs|datasets|scripts|test-support|node_modules)(\/|$)/.test(req.path)) return res.status(404).type("text/plain").send("Not found");
  res.sendFile(path.join(ROOT, "index.html"));
});

/* ----------------------------------------------------------------------------
 * WebSocket relay — hardened upgrade
 * -------------------------------------------------------------------------- */
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

function originAllowed(origin, hostHeader) {
  if (!origin) return true; // non-browser client (CLI test, curl); harmless without a session token
  try {
    const u = new URL(origin);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return true;
    if (ALLOWED_ORIGINS.indexOf(origin) >= 0) return true;
    if (PUBLIC_BASE_URL && origin === PUBLIC_BASE_URL) return true;
    if (hostHeader && u.host === hostHeader) return true;
  } catch (e) { /* fall through */ }
  return false;
}

server.on("upgrade", (req, socket, head) => {
  // Path gate — only /ws.
  const url = new URL(req.url, "http://localhost");
  if (url.pathname !== "/ws") { socket.destroy(); return; }
  const origin = req.headers.origin || "";
  if (!originAllowed(origin, req.headers.host)) {
    socket.write("HTTP/1.1 403 Forbidden\r\n\r\n"); socket.destroy(); return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
});

function wsError(ws, code, message) {
  try { ws.send(JSON.stringify({ type: "error", code, message })); } catch (e) { /* ignore */ }
}

wss.on("connection", (ws, req) => {
  let params;
  try { params = new URL(req.url, "http://localhost").searchParams; }
  catch (e) { ws.close(); return; }

  const sessionId = params.get("session") || "";
  const joinToken = params.get("token") || "";
  // Client-supplied pid + pkey (for reconnects). Both must match an existing
  // participant record, or they are both ignored and a new participant is
  // minted (subject to MAX_PARTICIPANTS).
  const claimedPid = params.get("pid") || "";
  const claimedPkey = params.get("pkey") || "";
  // Role is NOT client-asserted. "host" requires the caller to present the
  // session's hostKey; everyone else is a guest, regardless of what they type.
  const presentedHostKey = params.get("hostKey") || "";
  const name = clamp(params.get("name") || "Guest", 60) || "Guest";

  const session = sessions.get(sessionId);
  if (!session) {
    wsError(ws, "not_found", "This session does not exist.");
    ws.close(4004, "not_found"); return;
  }
  if (!safeEqual(joinToken, session.token)) {
    wsError(ws, "forbidden", "Invalid session token.");
    ws.close(4003, "forbidden"); return;
  }
  if (sessionState(session) !== "active") {
    wsError(ws, session.status, "This session has " + session.status + ".");
    ws.close(4010, session.status); return;
  }

  // Resolve identity.
  let participant = null;
  if (claimedPid) {
    const existing = session.participants.get(claimedPid);
    if (existing && safeEqual(claimedPkey, existing.participantKey)) {
      participant = existing;
      participant.name = name || participant.name;
      participant.connected = true;
      // Cancel any pending grace-period slot release.
      if (participant._graceTimer) {
        clearTimeout(participant._graceTimer);
        participant._graceTimer = null;
      }
    }
    // If pid/pkey don't match an existing participant, we silently fall through
    // and mint a NEW participant below (impersonation is not allowed).
  }
  if (!participant) {
    // If the caller presented a hostKey, validate it FIRST so a wrong key
    // doesn't silently fall through to a "full" error later.
    let role = "guest";
    if (presentedHostKey) {
      if (!safeEqual(presentedHostKey, session.hostKey)) {
        wsError(ws, "forbidden", "Invalid host key.");
        ws.close(4003, "forbidden"); return;
      }
      role = "host";
    }
    if (session.participants.size >= MAX_PARTICIPANTS) {
      wsError(ws, "full", "This session is full.");
      ws.close(4009, "full"); return;
    }
    const pid = token(9);
    if (role === "host" && !session.hostPid) session.hostPid = pid;
    participant = {
      pid, participantKey: token(18), name, role,
      connected: true, joinedAt: now(), sockets: new Set(),
    };
    session.participants.set(pid, participant);
  }
  participant.sockets.add(ws);
  ws._pid = participant.pid;
  ws._sessionId = sessionId;
  ws._rate = []; // sliding-window timestamps

  // Welcome: identity (pid + participantKey ONCE — client must store for
  // reconnects), session info, roster, and recent message history.
  ws.send(JSON.stringify({
    type: "welcome",
    pid: participant.pid,
    participantKey: participant.participantKey,
    role: participant.role,
    session: publicSession(session),
    roster: roster(session),
    history: session.messages.slice(-100),
  }));
  broadcast(session, {
    type: "presence",
    roster: roster(session),
    session: publicSession(session),
    joined: { pid: participant.pid, name: participant.name, role: participant.role },
  }, ws);

  ws.on("message", (raw) => {
    if (sessionState(session) !== "active") {
      wsError(ws, session.status, "This session has " + session.status + ".");
      return;
    }
    // Rate limit (sliding window per socket).
    const n = now();
    ws._rate = ws._rate.filter((t) => n - t < MSG_RATE_WINDOW_MS);
    ws._rate.push(n);
    if (ws._rate.length > MSG_RATE_MAX) {
      wsError(ws, "rate_limited", "You are sending too fast. Slow down.");
      return;
    }
    // Payload size guard (above and beyond the per-frame text clamp below).
    if (raw && raw.length > 16 * 1024) {
      wsError(ws, "too_large", "Message too large.");
      return;
    }
    let msg;
    try { msg = JSON.parse(raw.toString()); }
    catch (e) { wsError(ws, "bad_payload", "Malformed JSON."); return; }

    const type = msg && msg.type;

    if (type === "message") {
      if (typeof msg.text !== "string") return;
      const text = clamp(msg.text, MAX_TEXT_LEN);
      if (!text) return;
      // Client-chosen id lets a retried send be recognised instead of duplicated.
      const cid = typeof msg.cid === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(msg.cid) ? msg.cid : null;
      if (cid) {
        const dup = session.messages.find((m) => m.from === participant.pid && m.cid === cid);
        if (dup) {
          // Already stored: re-confirm to the sender only. No second broadcast.
          sendToPid(session, participant.pid, { type: "message", message: dup, turn: session.turn, duplicate: true });
          return;
        }
      }
      const kind = msg.kind === "clarify" ? "clarify" : msg.kind === "emergency" ? "emergency" : "message";
      // Where the text came from. Whitelisted so a client cannot inject arbitrary labels.
      const source = SOURCES.indexOf(msg.source) >= 0 ? msg.source : "typed";
      const entry = {
        id: token(8),
        cid,
        from: participant.pid,
        fromName: participant.name,
        text,
        kind,
        source: kind === "emergency" ? "emergency" : source,
        clarifyType: (typeof msg.clarifyType === "string" ? clamp(msg.clarifyType, 24) : null) || null,
        // Only for translated messages: the sender's original text and its language tag.
        orig: source === "translated" && typeof msg.orig === "string" ? clamp(msg.orig, MAX_TEXT_LEN) || null : null,
        lang: source === "translated" && typeof msg.lang === "string" && LANG_RE.test(msg.lang) ? msg.lang : null,
        // Only for signed messages: whether the words came from the sender's own taught signs or from a packaged model.
        // Never camera frames or landmarks: those stay in the sender's browser.
        via: source === "sign" && (msg.via === "personal" || msg.via === "model") ? msg.via : null,
        ts: now(),
      };
      session.messages.push(entry);
      if (session.messages.length > 500) session.messages.shift();
      // Auto turn hand-off: after you send, it becomes the one other side's
      // turn (two-person case only; stays null for groups, which must use
      // explicit `turn` events).
      const others = roster(session).filter((p) => p.pid !== participant.pid);
      session.turn = others.length === 1 ? others[0].pid : null;
      broadcast(session, { type: "message", message: entry, turn: session.turn });
    } else if (type === "ack") {
      // A recipient confirms that a message reached its device. Only then does
      // the sender see "Delivered". The sender cannot ack its own message.
      const m = typeof msg.id === "string" ? session.messages.find((x) => x.id === msg.id) : null;
      if (!m || m.from === participant.pid) return;
      m.deliveredTo = m.deliveredTo || [];
      if (m.deliveredTo.indexOf(participant.pid) < 0) m.deliveredTo.push(participant.pid);
      sendToPid(session, m.from, { type: "delivered", id: m.id, by: participant.pid, byName: participant.name, ts: now() });
    } else if (type === "presented") {
      // The recipient's device reports HOW it presented a message (screen, speech, vibration, Braille display).
      // Delivery ("ack") means the device has the message. This adds: could the person receive it the way
      // they chose? Only a "limited" outcome is forwarded, and no channel names (those would reveal how a person receives), so a sender
      // never learns a recipient's preferences, only that the message may not have reached them in full.
      const m = typeof msg.id === "string" ? session.messages.find((x) => x.id === msg.id) : null;
      if (!m || m.from === participant.pid) return;
      const okChannels = ["screen", "speech", "speech-offered", "haptic", "haptic-off", "braille-preview", "braille-display"];
      const channels = Array.isArray(msg.channels) ? msg.channels.filter((c) => okChannels.indexOf(c) >= 0).slice(0, 8) : [];
      const limited = msg.limited === true;
      m.presented = m.presented || {};
      m.presented[participant.pid] = { limited, channels, ts: now() };
      if (limited) sendToPid(session, m.from, { type: "presented", id: m.id, by: participant.pid, byName: participant.name, limited: true, ts: now() });
    } else if (type === "emergency-ack") {
      // A person has SEEN an emergency message (deliberate action, not automatic).
      const m = typeof msg.id === "string" ? session.messages.find((x) => x.id === msg.id) : null;
      if (!m || m.kind !== "emergency" || m.from === participant.pid) return;
      m.ackedBy = m.ackedBy || [];
      if (m.ackedBy.indexOf(participant.pid) < 0) m.ackedBy.push(participant.pid);
      broadcast(session, { type: "emergency-ack", id: m.id, by: participant.pid, byName: participant.name, ts: now() });
    } else if (type === "rtc") {
      // Signalling relay for live voice. The server never touches media.
      const sig = msg.signal;
      const to = typeof msg.to === "string" ? msg.to : "";
      if (!sig || typeof sig !== "object" || RTC_KINDS.indexOf(sig.kind) < 0) return;
      if (to === participant.pid || !session.participants.has(to)) {
        wsError(ws, "bad_target", "That participant is not in this session.");
        return;
      }
      const delivered = sendToPid(session, to, { type: "rtc", from: participant.pid, fromName: participant.name, signal: sig });
      if (!delivered) wsError(ws, "peer_offline", "The other participant is not connected.");
    } else if (type === "typing") {
      broadcast(session, { type: "typing", pid: participant.pid, name: participant.name, state: !!msg.state }, ws);
    } else if (type === "turn") {
      // Authorised turn operations:
      //   mode="pass"      — sender hands the turn to someone else; must
      //                      currently hold the turn (or no one does).
      //   mode="wait"      — "I need more time"; ANY participant may send.
      //                      Does not change `session.turn`.
      //   mode="claim"     — sender takes the turn for themselves. Only
      //                      allowed when no one currently holds it.
      //   mode="set"       — legacy; same rules as "pass".
      const mode = typeof msg.mode === "string" ? msg.mode : "pass";
      if (mode === "wait" || mode === "more-time") {
        broadcast(session, { type: "turn", turn: session.turn, by: participant.pid, mode: "wait" });
        return;
      }
      if (mode === "claim") {
        if (session.turn && session.turn !== participant.pid) {
          wsError(ws, "forbidden", "The turn belongs to someone else.");
          return;
        }
        session.turn = participant.pid;
        broadcast(session, { type: "turn", turn: session.turn, by: participant.pid, mode: "claim" });
        return;
      }
      // pass / set
      if (session.turn && session.turn !== participant.pid) {
        wsError(ws, "forbidden", "Only the turn holder can hand it over.");
        return;
      }
      const target = typeof msg.to === "string" && session.participants.has(msg.to) ? msg.to : null;
      session.turn = target;
      broadcast(session, { type: "turn", turn: session.turn, by: participant.pid, mode: "pass" });
    } else if (type === "read") {
      // Read-receipts: pid stripped and re-asserted server-side.
      broadcast(session, { type: "read", pid: participant.pid, upTo: typeof msg.upTo === "string" ? msg.upTo : null }, ws);
    } else if (type === "ping") {
      try { ws.send(JSON.stringify({ type: "pong", ts: now() })); } catch (e) { /* ignore */ }
    } else {
      // Unknown types are ignored. We never let a client fabricate server
      // events (session-ended, welcome, presence, ...) — those are produced
      // only by server code paths above.
    }
  });

  ws.on("close", () => {
    participant.sockets.delete(ws);
    if (participant.sockets.size === 0) {
      participant.connected = false;
      broadcast(session, {
        type: "presence",
        roster: roster(session),
        session: publicSession(session),
        left: { pid: participant.pid, name: participant.name },
      });
      // If the disconnected participant held the turn, clear it after a short
      // grace period so the conversation isn't permanently stuck.
      if (session.turn === participant.pid) {
        setTimeout(() => {
          if (sessions.get(session.id) === session && !participant.connected && session.turn === participant.pid) {
            session.turn = null;
            broadcast(session, { type: "turn", turn: null, by: participant.pid, mode: "released" });
          }
        }, 20 * 1000).unref();
      }
      // Reconnection grace period: if the participant doesn't reconnect within
      // RECONNECT_GRACE_MS, release their slot so someone else can join.
      participant._graceTimer = setTimeout(() => {
        if (sessions.get(session.id) === session && session.participants.has(participant.pid) && !participant.connected) {
          session.participants.delete(participant.pid);
          broadcast(session, {
            type: "presence",
            roster: roster(session),
            session: publicSession(session),
          });
        }
      }, RECONNECT_GRACE_MS).unref();
    }
  });

  ws.on("error", () => { /* close handler does cleanup */ });
});

/* Heartbeat: drop dead sockets. */
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws._isAlive === false) { try { ws.terminate(); } catch (e) {} return; }
    ws._isAlive = false;
    try { ws.ping(); } catch (e) {}
  });
}, 30 * 1000).unref();
wss.on("connection", (ws) => {
  ws._isAlive = true;
  ws.on("pong", () => { ws._isAlive = true; });
});

/* ----------------------------------------------------------------------------
 * Crash safety and graceful shutdown.
 *
 * Without this, one uncaught exception or unhandled promise rejection
 * ANYWHERE in the process (a bad WS frame, a surprise from translate.js,
 * etc.) takes the whole server down with no log trail, instantly and
 * silently dropping every concurrent session for every connected user. These
 * handlers do not change what bugs exist; they make a crash loud and
 * deliberate instead of silent, and they make a restart (deploy, process
 * manager, Ctrl-C) end cleanly: every open socket gets an honest WebSocket
 * close instead of a connection that just stops responding, so the existing
 * client-side reconnect/"rejoin" UI reacts immediately instead of guessing
 * after a timeout.
 *
 * This is NOT data persistence across a restart. That would mean writing
 * session secrets (hostKey, participantKey, join tokens) to disk, which this
 * project deliberately avoids -- see the file-level comment at the top of
 * this file: no private conversation content, and nothing else sensitive,
 * is ever written to disk. A clean, honest, immediate failure is the safe
 * alternative within that constraint; see CHANGELOG.md for why full
 * restart-survival was considered and deliberately not built in this pass.
 * -------------------------------------------------------------------------- */
let shuttingDown = false;
function shutdown(reason, exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;
  /* eslint-disable no-console */
  console.error(`SANGAM server shutting down (${reason}). Closing ${wss.clients.size} open socket(s)...`);
  wss.clients.forEach((ws) => {
    try { ws.close(1012, "Server restarting. Please reopen this conversation."); } catch (e) {}
  });
  try {
    server.close(() => process.exit(exitCode));
  } catch (e) {
    process.exit(exitCode);
  }
  // Do not hang forever waiting for sockets or keep-alive connections to drain.
  setTimeout(() => process.exit(exitCode), 3000).unref();
}
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", (err && err.stack) || err);
  shutdown("uncaught exception", 1);
});
process.on("unhandledRejection", (err) => {
  console.error("Unhandled promise rejection:", (err && err.stack) || err);
  shutdown("unhandled rejection", 1);
});
process.on("SIGTERM", () => shutdown("SIGTERM", 0));
process.on("SIGINT", () => shutdown("SIGINT", 0));

// Test-only hook (test-reliability.js): lets a test simulate a genuine,
// asynchronously-surfacing bug reaching the uncaughtException handler above,
// without needing to find and exploit a real crash. Only fires when the
// operator explicitly sets this env var, which no deployment or other test
// does, so it is inert in every other context.
if (process.env.SANGAM_TEST_CRASH_AFTER_MS) {
  setTimeout(() => { throw new Error("test-reliability.js: simulated crash"); }, parseInt(process.env.SANGAM_TEST_CRASH_AFTER_MS, 10)).unref();
}
// On Windows, child.kill("SIGTERM") terminates the process immediately at OS level without
// invoking Node's SIGTERM listener. This test-only IPC hook lets test-reliability.js exercise
// the exact shutdown("SIGTERM", 0) path cross-platform.
if (process.env.SANGAM_TEST_IPC === "1") {
  process.on("message", (msg) => {
    if (msg === "SANGAM_TEST_SHUTDOWN") shutdown("SIGTERM", 0);
  });
}

server.listen(PORT, () => {
  /* eslint-disable no-console */
  console.log(`SANGAM server listening on http://localhost:${PORT}`);
  console.log(`  static site:        http://localhost:${PORT}/`);
  console.log(`  health check:       http://localhost:${PORT}/api/health`);
  console.log(`  session TTL:        ${SESSION_TTL_MS / 60000} min   assist TTL: ${ASSIST_TTL_MS / 60000} min   reconnect grace: ${RECONNECT_GRACE_MS / 1000}s`);
  if (PUBLIC_BASE_URL) console.log(`  public base URL:    ${PUBLIC_BASE_URL}`);
  if (ALLOWED_ORIGINS.length) console.log(`  allowed origins:    ${ALLOWED_ORIGINS.join(", ")}`);
});

module.exports = { app, server, wss }; // wss is exported so tests can drop sockets
