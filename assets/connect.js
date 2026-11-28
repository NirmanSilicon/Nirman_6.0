/*
 * SANGAM — Person 5 · Feature 1 + Feature 4
 * QR communication sessions, real-time two-way chat, turn management.
 *
 * Reuses the shared helpers exported by app.js on window.Sangam. Falls back to
 * local versions so the file is safe to load even if that export is missing.
 */
(function () {
  "use strict";

  /* ---------- shared helpers (with fallback) ---------- */
  var SG = window.Sangam || {};
  var $ = SG.$ || function (s, r) { return (r || document).querySelector(s); };
  var $$ = SG.$$ || function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var ic = SG.ic || function (n) { return '<svg class="icon" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; };
  var esc = SG.esc || function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var toast = SG.toast || function (m) { try { console.log(m); } catch (e) {} };
  function speakIn(t) { if (typeof SG.speak === "function") SG.speak(t); }
  function profile() { return SG.profile || { outm: [] }; }

  /* ---------- small utils ---------- */
  function api(path, opts) {
    return fetch(path, Object.assign({ headers: { "Content-Type": "application/json" } }, opts)).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (body) {
        if (!r.ok) { var e = new Error(body.message || body.error || ("HTTP " + r.status)); e.status = r.status; e.body = body; throw e; }
        return body;
      });
    });
  }
  function wsUrl(params) {
    var proto = location.protocol === "https:" ? "wss:" : "ws:";
    var q = Object.keys(params).filter(function (k) { return params[k] != null && params[k] !== ""; })
      .map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); }).join("&");
    return proto + "//" + location.host + "/ws?" + q;
  }
  function fmtClock(ms) {
    if (ms < 0) ms = 0;
    var s = Math.floor(ms / 1000), m = Math.floor(s / 60);
    s = s % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }
  function fmtTime(ts) {
    try { return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; }
  }

  var CLARIFY = [
    { t: "repeat", label: "Please repeat", text: "Could you say that again, please?" },
    { t: "rephrase", label: "Rephrase", text: "Could you say that a different way?" },
    { t: "wait", label: "Please wait", text: "Please wait — I need a moment to reply." },
    { t: "unclear", label: "I didn't understand", text: "Sorry, I did not understand that." },
    { t: "confirm", label: "Confirm", text: "Just to confirm, is that correct?" }
  ];

  /* ============================================================================
   * ChatSession — manages one live conversation inside a container element.
   * ========================================================================== */
  function ChatSession(container, info, role, name, opts) {
    this.c = container;
    this.info = info;            // { id, token, name, expiresAt }
    this.role = role;            // 'host' | 'guest'
    this.name = name;
    this.opts = opts || {};
    this.pid = null;
    this.ws = null;
    this.participants = [];
    this.turn = null;
    this.closedByUs = false;
    this.retry = 0;
    this.typingTimer = null;
    this.peerTypingTimer = null;
    this.readAloud = false;
    this.ended = false;
    this.outbox = {};            // cid -> { cid, id, text, kind, source, clarifyType, state, tries }
    this.exposeApi();
    this.render();
    this.connect();
  }

  ChatSession.prototype.el = function (sel) { return this.c.querySelector(sel); };

  // Per-tab identity cache so a refresh reuses the same participant slot.
  function idKey(sessionId) { return "sangam.ident." + sessionId; }
  function loadIdent(sessionId) { try { return JSON.parse(sessionStorage.getItem(idKey(sessionId)) || "null"); } catch (e) { return null; } }
  function saveIdent(sessionId, pid, pkey) { try { sessionStorage.setItem(idKey(sessionId), JSON.stringify({ pid: pid, pkey: pkey })); } catch (e) {} }
  function clearIdent(sessionId) { try { sessionStorage.removeItem(idKey(sessionId)); } catch (e) {} }

  ChatSession.prototype.render = function () {
    var leaveLabel = this.role === "host" ? "End session" : "Leave";
    this.c.innerHTML =
      '<div class="chat">' +
        '<div class="chat-head">' +
          '<div class="chat-id">' +
            '<span class="chat-dot" data-state="connecting" aria-hidden="true"></span>' +
            '<div><b class="chat-name">' + esc(this.info.name || "Conversation") + '</b>' +
            '<span class="chat-count" aria-live="polite">Connecting…</span></div>' +
          '</div>' +
          '<div class="chat-tools">' +
            '<label class="chat-aloud"><input type="checkbox" class="chat-aloud-cb"> <span>Read new messages aloud</span></label>' +
            '<button class="btn btn-sm btn-emg chat-emg" type="button">' + ic("siren") + 'Emergency</button>' +
            '<button class="btn btn-sm chat-leave" type="button">' + ic("x") + leaveLabel + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="chat-turnbar">' +
          '<p class="chat-turn" role="status" aria-live="polite"></p>' +
          '<div class="chat-turnacts">' +
            '<button class="chip-btn turn-wait" type="button">' + ic("hourglass") + 'I need more time</button>' +
            '<div class="turn-wait-opts" hidden role="group" aria-label="Time options">' +
              '<button class="chip-btn turn-wait-opt" type="button" data-secs="30">30s</button>' +
              '<button class="chip-btn turn-wait-opt" type="button" data-secs="60">1 min</button>' +
              '<button class="chip-btn turn-wait-opt" type="button" data-secs="120">2 min</button>' +
            '</div>' +
            '<button class="chip-btn turn-claim" type="button" hidden>' + ic("hand") + 'Claim turn</button>' +
            '<button class="chip-btn turn-pass" type="button" hidden>' + ic("arrow-right") + 'Pass turn</button>' +
          '</div>' +
        '</div>' +
        '<p class="chat-caption" aria-hidden="true" hidden></p>' +
        '<ul class="chat-log" role="log" aria-live="polite" aria-relevant="additions" tabindex="0"></ul>' +
        '<p class="chat-typing" aria-live="polite"></p>' +
        '<div class="chat-clar" role="group" aria-label="Quick clarification">' +
          CLARIFY.map(function (c) { return '<button class="chip-btn" type="button" data-clar="' + c.t + '">' + esc(c.label) + '</button>'; }).join("") +
        '</div>' +
        '<form class="chat-form">' +
          '<label class="vis-hidden" for="chatInput">Type a message</label>' +
          '<textarea id="chatInput" class="chat-input" rows="1" maxlength="1000" placeholder="Type a message. Enter to send, Shift+Enter for a new line."></textarea>' +
          '<button class="btn btn-fill chat-send" type="submit" aria-label="Send message">' + ic("send") + '<span>Send</span></button>' +
        '</form>' +
        (this.opts.overlay ? '<nav class="chat-links" aria-label="Other SANGAM tools (your chat stays connected)"><a class="chip-btn" href="#/dashboard/relay">Speak and caption</a><a class="chip-btn" href="#/dashboard/scan">Read a photo</a><a class="chip-btn" href="#/dashboard/phrases">Phrase board</a><a class="chip-btn" href="#/dashboard/profile">Access profile</a></nav>' : "") +
        '<div class="chat-extra"></div>' +
        '<p class="chat-status" role="status"></p>' +
      '</div>';

    var self = this;
    this.el(".chat-leave").addEventListener("click", function () { self.leave(); });
    var aloud = this.el(".chat-aloud-cb"), pr = profile();
    var syncAloud = function () {
      var audioOn = (profile().outm || []).indexOf("audio") >= 0;
      aloud.disabled = !audioOn;
      aloud.title = audioOn ? "" : "Turn on Spoken in your Access profile to use this.";
      aloud.checked = audioOn && !!profile().autoRead;
      self.readAloud = aloud.checked;
    };
    syncAloud();
    window.addEventListener("sangam:profile", syncAloud);
    aloud.addEventListener("change", function () { profile().autoRead = this.checked; self.readAloud = this.checked; if (SG.save) SG.save(); });
    this.el(".chat-emg").addEventListener("click", function () { if (window.SangamEmergency) window.SangamEmergency.open(); });
    var form = this.el(".chat-form"), input = this.el(".chat-input");
    var submitForm = function () {
      var t = input.value.trim(); if (!t) return;
      if (!self.isOpen()) { self.status("Not connected right now. Your draft is kept. Press Send when the connection is back."); return; }
      // Optional confirm-before-send: the first press reads the message back, the second sends it.
      if (profile().confirmSend && self._armed !== t) {
        self._armed = t;
        var ask = "Confirm: send \u201C" + t + "\u201D? Press Send or Enter again to send it. Edit the text to change it.";
        self.status(ask); if (SG.announce) SG.announce(ask, "important");
        return;
      }
      self._armed = null;
      if (self.submit(t, { kind: "message", source: "typed" })) { input.value = ""; input.style.height = "auto"; self.sendTyping(false); }
    };
    form.addEventListener("submit", function (e) { e.preventDefault(); submitForm(); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitForm(); }
    });
    input.addEventListener("input", function () {
      self._armed = null;
      input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 140) + "px";
      self.sendTyping(true);
    });
    this.el(".chat-clar").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-clar]"); if (!b) return;
      var c = CLARIFY.filter(function (x) { return x.t === b.dataset.clar; })[0];
      if (!c) return;
      if (!self.isOpen()) { self.status("Not connected right now. Nothing was sent."); return; }
      self.submit(c.text, { kind: "clarify", clarifyType: c.t, source: "typed" });
    });
    try { window.dispatchEvent(new CustomEvent("sangam:chat-ready", { detail: { root: this.c, extra: this.c.querySelector(".chat-extra") } })); } catch (e) {}
    this.el(".turn-wait").addEventListener("click", function () {
      var opts = self.el(".turn-wait-opts");
      if (opts) { opts.hidden = !opts.hidden; }
      self.sendTurn("wait");
      self.system("You asked for a moment.");
    });
    this.el(".chat-turnacts").addEventListener("click", function (e) {
      var optBtn = e.target.closest(".turn-wait-opt");
      if (optBtn) {
        var secs = parseInt(optBtn.dataset.secs, 10) || 30;
        self.sendTurn("wait");
        self.system("You asked for " + (secs >= 60 ? (secs / 60) + " minute" + (secs > 60 ? "s" : "") : secs + " seconds") + ".");
        var opts = self.el(".turn-wait-opts");
        if (opts) opts.hidden = true;
      }
    });
    this.el(".turn-claim").addEventListener("click", function () {
      self.sendTurn("claim");
    });
    this.el(".turn-pass").addEventListener("click", function () {
      // Hand turn to the first other participant (two-person case) or clear it.
      var other = (self.participants || []).filter(function (p) { return p.pid !== self.pid; })[0];
      self.sendTurn("pass", other ? other.pid : null);
    });
  };

  ChatSession.prototype.setDot = function (state, label) {
    var dot = this.el(".chat-dot"); if (dot) dot.setAttribute("data-state", state);
    if (label != null) this.el(".chat-count").textContent = label;
  };
  ChatSession.prototype.status = function (msg) { var s = this.el(".chat-status"); if (s) s.textContent = msg || ""; };

  ChatSession.prototype.connect = function () {
    var self = this;
    this.setDot("connecting", "Connecting…");
    // Reuse any (pid, pkey) saved for this session in sessionStorage, so a
    // page refresh continues as the same participant rather than minting a
    // new slot (which would count toward MAX_PARTICIPANTS).
    var ident = this.pid && this.pkey ? { pid: this.pid, pkey: this.pkey } : loadIdent(this.info.id);
    if (ident && ident.pid) { this.pid = ident.pid; this.pkey = ident.pkey; }
    var params = { session: this.info.id, token: this.info.token, name: this.name };
    if (this.pid) params.pid = this.pid;
    if (this.pkey) params.pkey = this.pkey;
    // Only host leg presents the hostKey. The server, not the client, decides
    // whether this participant gets the host role.
    if (this.role === "host" && this.info.hostKey) params.hostKey = this.info.hostKey;
    var url = wsUrl(params);
    var ws;
    try { ws = new WebSocket(url); } catch (e) { this.status("Could not open a connection."); this.scheduleRetry(); return; }
    this.ws = ws;

    ws.onopen = function () {
      self.retry = 0; self.setDot("online", ""); self.status("");
      self.flushOutbox();
      self.announce();
    };
    ws.onmessage = function (ev) {
      var msg; try { msg = JSON.parse(ev.data); } catch (e) { return; }
      self.onMessage(msg);
    };
    ws.onerror = function () { /* onclose handles recovery */ };
    ws.onclose = function (ev) {
      if (self.closedByUs || self.ended) return;
      if (ev && (ev.code === 4003 || ev.code === 4004)) { self.fail("This conversation link is not valid."); return; }
      if (ev && ev.code === 4010) { self.fail("This conversation is no longer available."); return; }
      if (ev && ev.code === 4000) { self.onEnded(ev.reason || "ended"); return; }
      self.setDot("off", "Reconnecting…");
      self.holdInFlight();
      self.announce();
      self.scheduleRetry();
    };
  };

  ChatSession.prototype.scheduleRetry = function () {
    var self = this;
    if (this.ended || this.closedByUs) return;
    this.retry += 1;
    if (this.retry > 6) {
      this.setDot("off", "Offline"); this.status("Connection lost. Check your network, then reopen the link.");
      var o = this.outbox, me = this;
      Object.keys(o).forEach(function (k) { if (o[k].state === "pending" || o[k].state === "sending") me.setState(k, "failed"); });
      return;
    }
    var delay = Math.min(1000 * this.retry, 5000);
    this.status("Reconnecting in " + Math.round(delay / 1000) + "s…");
    clearTimeout(this._retryT);
    this._retryT = setTimeout(function () { self.connect(); }, delay);
  };

  ChatSession.prototype.onMessage = function (msg) {
    switch (msg.type) {
      case "welcome":
        this.pid = msg.pid;
        // participantKey is sent exactly once; persist it for this tab so
        // reconnects don't create a new participant.
        if (msg.participantKey) { this.pkey = msg.participantKey; saveIdent(this.info.id, this.pid, this.pkey); }
        // The server may demote role (e.g. missing/wrong hostKey → guest).
        if (msg.role) this.role = msg.role;
        this.turn = msg.session && msg.session.turn;
        this.participants = msg.roster || [];
        if (msg.history && msg.history.length) {
          var self = this; msg.history.forEach(function (m) { self.appendMessage(m, true); });
        }
        this.updatePresence(msg.session);
        this.updateTurn();
        break;
      case "presence":
        this.participants = msg.roster || this.participants;
        this.updatePresence(msg.session);
        if (msg.joined && msg.joined.pid !== this.pid) this.system(esc(msg.joined.name) + " joined.");
        if (msg.left) this.system(esc(msg.left.name) + " left.");
        break;
      case "message":
        this.turn = msg.turn;
        this.appendMessage(msg.message, false);
        this.updateTurn();
        break;
      case "delivered":
        // The other device confirmed receipt. This is the ONLY path to "Delivered".
        var dm = this.findByServerId(msg.id);
        if (dm) { this.setState(dm.cid, "delivered"); }
        break;
      case "presented":
        // The recipient's device got it but could not present it the way they chose.
        var pm = this.findByServerId(msg.id);
        if (pm && pm.li) this.paintLimited(pm.li, msg.byName);
        break;
      case "emergency-ack":
        try { window.dispatchEvent(new CustomEvent("sangam:emergency-ack", { detail: { id: msg.id, by: msg.by, byName: msg.byName, ts: msg.ts, mine: msg.by === this.pid } })); } catch (e) {}
        break;
      case "rtc":
        try { window.dispatchEvent(new CustomEvent("sangam:rtc", { detail: { from: msg.from, fromName: msg.fromName, signal: msg.signal } })); } catch (e) {}
        break;
      case "typing":
        if (msg.pid !== this.pid) this.peerTyping(msg.state ? msg.name : null);
        break;
      case "turn":
        this.turn = msg.turn;
        this.updateTurn();
        if (msg.mode === "wait" && msg.by !== this.pid) this.system("The other person asked for a moment.");
        if (msg.mode === "claim" && msg.by === this.pid) this.system("You claimed the turn.");
        if (msg.mode === "claim" && msg.by !== this.pid) {
          var cp = (this.participants || []).filter(function (x) { return x.pid === msg.by; })[0];
          this.system((cp ? cp.name : "Someone") + " claimed the turn.");
        }
        if (msg.mode === "released") this.system("Turn released. Anyone can claim it.");
        break;
      case "session-ended":
        this.onEnded(msg.reason || "ended");
        break;
      case "error":
        this.status(msg.message || "Something went wrong.");
        if (msg.code === "rate_limited" || msg.code === "too_large") this.failInFlight();
        try { window.dispatchEvent(new CustomEvent("sangam:chat-error", { detail: { code: msg.code, message: msg.message } })); } catch (e) {}
        break;
    }
  };

  ChatSession.prototype.updatePresence = function (session) {
    var connected = this.participants.filter(function (p) { return p.connected; }).length;
    var total = this.participants.length;
    var others = this.participants.filter(function (p) { return p.pid !== this.pid; }, this);
    var peer = others[0];
    var label;
    if (connected <= 1) label = "Waiting for the other person…";
    else label = (peer && peer.connected ? peer.name + " is here" : (peer ? peer.name + " is away" : "")) + " · " + connected + " online";
    this.setDot(connected > 1 ? "online" : "waiting", label);
    this.el(".chat-count").title = total + " in this session";
    this.announce();
  };

  ChatSession.prototype.updateTurn = function () {
    var t = this.el(".chat-turn"); if (!t) return;
    var pass = this.el(".turn-pass");
    var claim = this.el(".turn-claim");
    var waitOpts = this.el(".turn-wait-opts");
    if (!this.turn) {
      t.textContent = "No one has the turn. Claim it to reply.";
      t.removeAttribute("data-me");
      if (pass) pass.hidden = true;
      if (claim) claim.hidden = false;
      if (waitOpts) waitOpts.hidden = true;
      return;
    }
    if (this.turn === this.pid) {
      t.textContent = "Your turn to reply.";
      t.setAttribute("data-me", "1");
      if (pass) pass.hidden = false;
      if (claim) claim.hidden = true;
    } else {
      var p = this.participants.filter(function (x) { return x.pid === this.turn; }, this)[0];
      t.textContent = (p ? p.name : "The other person") + " is replying. Take the time you need.";
      t.removeAttribute("data-me");
      if (pass) pass.hidden = true;
      if (claim) claim.hidden = true;
    }
  };

  ChatSession.prototype.sendTurn = function (mode, to) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try { this.ws.send(JSON.stringify({ type: "turn", mode: mode, to: to || null })); } catch (e) {}
  };

  ChatSession.prototype.peerTyping = function (nameOrNull) {
    var el = this.el(".chat-typing");
    clearTimeout(this.peerTypingTimer);
    if (!nameOrNull) { el.textContent = ""; return; }
    el.textContent = nameOrNull + " is typing…";
    var self = this;
    this.peerTypingTimer = setTimeout(function () { el.textContent = ""; }, 3500);
  };

  var SOURCE_LABEL = { voice: "Voice transcript (reviewed by sender)", ocr: "Text read from a photo (OCR, reviewed by sender)", phrase: "Phrase board", translated: "Translated", emergency: "Emergency", sign: "Interpreted from signing (sender reviewed)" };
  function signLabel(via) { return via === "personal" ? "Interpreted from signing: the sender's own taught signs, reviewed by the sender" : via === "model" ? "Interpreted from signing by a recognition model, reviewed by the sender" : SOURCE_LABEL.sign; }

  ChatSession.prototype.appendMessage = function (m, isHistory) {
    var log = this.el(".chat-log");
    var mine = m.from === this.pid;
    // A message of ours that we already show (echo of a live send, or a retry
    // the server recognised) updates the existing bubble instead of adding one.
    if (mine && m.cid && this.outbox[m.cid]) {
      var ob = this.outbox[m.cid]; ob.id = m.id;
      this.setState(m.cid, m.deliveredTo && m.deliveredTo.length ? "delivered" : (ob.state === "delivered" ? "delivered" : "sent"));
      return;
    }
    var li = document.createElement("li");
    li.className = "msg " + (mine ? "me" : "them") + (m.kind === "clarify" ? " clar" : "") + (m.kind === "emergency" ? " emerg" : "");
    li.dataset.id = m.id;
    var srcLabel = m.kind === "emergency" ? SOURCE_LABEL.emergency : (m.source && m.source !== "typed" ? SOURCE_LABEL[m.source] : "");
    if (m.source === "sign") srcLabel = signLabel(m.via);
    if (m.source === "translated" && m.lang) srcLabel = "Translated message (original language: " + m.lang + ")";
    li.innerHTML =
      '<div class="msg-b">' +
        (mine ? "" : '<span class="msg-who">' + esc(m.fromName || "Them") + "</span>") +
        (m.kind === "clarify" ? '<span class="msg-tag">' + ic("info") + "clarify</span>" : "") +
        (srcLabel ? '<span class="msg-tag src">' + esc(srcLabel) + "</span>" : "") +
        '<span class="msg-t">' + esc(m.text) + "</span>" +
        (m.orig ? '<span class="msg-orig">Original: ' + esc(m.orig) + "</span>" : "") +
        '<time class="msg-time">' + fmtTime(m.ts) + "</time>" +
        (mine ? '<span class="msg-state"></span>' : "") +
      "</div>";
    log.appendChild(li);
    log.scrollTop = log.scrollHeight;
    if (mine) {
      // History from a reconnect/refresh: we only know what the server tells us.
      if (m.cid) this.outbox[m.cid] = { cid: m.cid, id: m.id, text: m.text, state: "sent", li: li };
      this.paintState(li, m.deliveredTo && m.deliveredTo.length ? "delivered" : "sent");
    } else {
      // Tell the sender this device has it. History replays are acked too: the
      // server de-duplicates and the sender may still be waiting.
      this.sendFrame({ type: "ack", id: m.id });
      if (!isHistory) {
        // After presenting it, tell the sender if we could not present it the way this person chose.
        var selfRef = this;
        Promise.resolve(this.deliverToMe(m, li)).then(function (rep) {
          if (rep && typeof rep === "object") selfRef.sendFrame({ type: "presented", id: m.id, channels: rep.channels || [], limited: !!rep.limited });
        }, function () {});
      }
    }
    if (!isHistory) {
      try { window.dispatchEvent(new CustomEvent("sangam:chat-message", { detail: { direction: mine ? "sent" : "received", text: m.text, timestamp: m.ts, id: m.id, kind: m.kind, source: m.source || "typed", fromName: m.fromName, from: m.from } })); } catch (e) {}
    }
  };

  // Receive-side rendering follows THIS device's profile only.
  ChatSession.prototype.deliverToMe = function (m, li) {
    var out = window.SangamOut;
    if (out && out.deliver) { return out.deliver(m, { li: li, readAloud: this.readAloud, caption: this.el(".chat-caption") }); }
    else if (this.readAloud) speakIn(m.text);
  };

  // The sender is told ONLY that delivery may be limited. Never how the recipient receives (that would reveal their access needs).
  ChatSession.prototype.paintLimited = function (li, who) {
    var box = li.querySelector(".msg-b"); if (!box) return;
    var n = li.querySelector(".msg-pres"); if (!n) { n = document.createElement("span"); n.className = "msg-pres"; n.setAttribute("role", "status"); box.appendChild(n); }
    n.textContent = "Delivered to " + (who ? who + "\u2019s" : "their") + " device, but it may not have reached " + (who || "them") + " in the way they prefer. It was shown on screen.";
  };
  var STATE_LABEL = { sending: "Sending…", sent: "Sent to server", delivered: "Delivered", pending: "Waiting to reconnect", failed: "Not sent" };
  ChatSession.prototype.paintState = function (li, state) {
    if (!li) return;
    var st = li.querySelector(".msg-state"); if (!st) return;
    st.dataset.state = state;
    st.textContent = STATE_LABEL[state] || "";
    var old = li.querySelector(".msg-retry"); if (old) old.remove();
    if (state === "failed") {
      var b = document.createElement("button"); b.type = "button"; b.className = "chip-btn msg-retry"; b.textContent = "Retry";
      var self = this, cid = li.dataset.cid;
      b.addEventListener("click", function () { self.retryMessage(cid); });
      li.querySelector(".msg-b").appendChild(b);
    }
  };

  ChatSession.prototype.setState = function (cid, state) {
    var it = this.outbox[cid]; if (!it) return;
    // Never move backwards from delivered.
    if (it.state === "delivered" && state !== "delivered") return;
    it.state = state;
    this.paintState(it.li, state);
    clearTimeout(it.timer);
    if (state === "sending") {
      var self = this;
      it.timer = setTimeout(function () { if (it.state === "sending") { self.setState(cid, self.isOpen() ? "failed" : "pending"); } }, 8000);
    }
    try { window.dispatchEvent(new CustomEvent("sangam:chat-state", { detail: { cid: cid, state: state, id: it.id || null, text: it.text } })); } catch (e) {}
  };

  ChatSession.prototype.findByServerId = function (id) {
    var o = this.outbox, k;
    for (k in o) { if (o[k].id === id) return o[k]; }
    return null;
  };

  ChatSession.prototype.isOpen = function () { return !!(this.ws && this.ws.readyState === WebSocket.OPEN && !this.ended); };

  ChatSession.prototype.sendFrame = function (obj) {
    if (!this.isOpen()) return false;
    try { this.ws.send(JSON.stringify(obj)); return true; } catch (e) { return false; }
  };

  var cidSeq = 0;
  function newCid() { cidSeq += 1; return "c" + Date.now().toString(36) + cidSeq.toString(36) + Math.random().toString(36).slice(2, 6); }

  // Queue + transmit one outgoing message. Returns its client id, or null.
  ChatSession.prototype.submit = function (text, opts) {
    opts = opts || {};
    text = (text || "").trim();
    if (!text) return null;
    if (this.ended) { this.status("This conversation has ended."); return null; }
    if (!this.isOpen()) { this.status("Not connected right now. Nothing was sent."); return null; }
    var cid = newCid();
    var li = document.createElement("li");
    li.className = "msg me" + (opts.kind === "clarify" ? " clar" : "") + (opts.kind === "emergency" ? " emerg" : "");
    li.dataset.cid = cid;
    var src = opts.kind === "emergency" ? "emergency" : (opts.source || "typed");
    var srcLabel = opts.kind === "emergency" ? SOURCE_LABEL.emergency : (src !== "typed" ? SOURCE_LABEL[src] : "");
    if (src === "sign") srcLabel = signLabel(opts.via);
    li.innerHTML = '<div class="msg-b">' +
      (opts.kind === "clarify" ? '<span class="msg-tag">' + ic("info") + "clarify</span>" : "") +
      (srcLabel ? '<span class="msg-tag src">' + esc(srcLabel) + "</span>" : "") +
      '<span class="msg-t">' + esc(text) + "</span>" +
      (opts.orig ? '<span class="msg-orig">Original: ' + esc(opts.orig) + "</span>" : "") +
      '<time class="msg-time">' + fmtTime(Date.now()) + '</time><span class="msg-state"></span></div>';
    var log = this.el(".chat-log"); log.appendChild(li); log.scrollTop = log.scrollHeight;
    this.outbox[cid] = { cid: cid, text: text, kind: opts.kind || "message", source: src, clarifyType: opts.clarifyType || null, orig: opts.orig || null, lang: opts.lang || null, via: opts.via || null, state: "sending", li: li, tries: 0 };
    this.transmit(cid);
    return cid;
  };

  ChatSession.prototype.transmit = function (cid) {
    var it = this.outbox[cid]; if (!it) return;
    it.tries += 1;
    var ok = this.sendFrame({ type: "message", cid: cid, text: it.text, kind: it.kind, source: it.source, clarifyType: it.clarifyType, orig: it.orig, lang: it.lang, via: it.via });
    this.setState(cid, ok ? "sending" : "pending");
  };

  // Connection dropped: anything still waiting for the server is held, not lost.
  ChatSession.prototype.holdInFlight = function () {
    var o = this.outbox, me = this;
    Object.keys(o).forEach(function (k) { if (o[k].state === "sending") me.setState(k, "pending"); });
  };
  ChatSession.prototype.failInFlight = function () {
    var o = this.outbox, me = this;
    Object.keys(o).forEach(function (k) { if (o[k].state === "sending") me.setState(k, "failed"); });
  };
  // Reconnected: resend what never got a server echo. The server recognises the
  // client id, so a message that did arrive is NOT delivered twice.
  ChatSession.prototype.flushOutbox = function () {
    var o = this.outbox, me = this;
    Object.keys(o).forEach(function (k) { if (o[k].state === "pending" || o[k].state === "sending") me.transmit(k); });
  };
  ChatSession.prototype.retryMessage = function (cid) {
    var it = this.outbox[cid]; if (!it || it.state === "sent" || it.state === "delivered") return;
    if (!this.isOpen()) { this.retry = 0; this.setState(cid, "pending"); clearTimeout(this._retryT); this.connect(); return; }
    this.transmit(cid);
  };

  // Public API for the other modules (voice, photo, phrases, messages, emergency, live voice).
  ChatSession.prototype.exposeApi = function () {
    var self = this;
    window.SangamChat = {
      isActive: function () { return !self.ended && !self.closedByUs; },
      isConnected: function () { return self.isOpen(); },
      // Returns the message's client id, or null if it could not be handed over (caller keeps its draft).
      send: function (text, opts) { return self.submit(text, opts || {}); },
      retry: function (cid) { self.retryMessage(cid); },
      frame: function (obj) { return self.sendFrame(obj); },
      identity: function () { return { sessionId: self.info.id, pid: self.pid, pkey: self.pkey, role: self.role, name: self.name }; },
      roster: function () { return (self.participants || []).slice(); },
      peers: function () { return (self.participants || []).filter(function (p) { return p.pid !== self.pid; }); }
    };
  };
  ChatSession.prototype.announce = function () {
    try { window.dispatchEvent(new CustomEvent("sangam:chat-status", { detail: { connected: this.isOpen(), ended: this.ended } })); } catch (e) {}
  };

  // Used by the form's legacy callers (clarify chips) — kept for compatibility.
  ChatSession.prototype.send = function (text, kind, clarifyType) {
    return this.submit(text, { kind: kind || "message", clarifyType: clarifyType || null, source: "typed" });
  };

  ChatSession.prototype.system = function (html) {
    var log = this.el(".chat-log");
    var li = document.createElement("li");
    li.className = "msg sys";
    li.innerHTML = "<span>" + html + "</span>";
    log.appendChild(li);
    log.scrollTop = log.scrollHeight;
  };

  ChatSession.prototype.sendTyping = function (state) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    var self = this;
    if (state) {
      this.ws.send(JSON.stringify({ type: "typing", state: true }));
      clearTimeout(this.typingTimer);
      this.typingTimer = setTimeout(function () { self.sendTyping(false); }, 2500);
    } else {
      clearTimeout(this.typingTimer);
      this.ws.send(JSON.stringify({ type: "typing", state: false }));
    }
  };

  ChatSession.prototype.onEnded = function (reason) {
    this.ended = true;
    this.setDot("off", reason === "expired" ? "Session expired" : "Session ended");
    this.updateTurnClear();
    this.el(".chat-input").disabled = true;
    this.el(".chat-send").disabled = true;
    $$(".chip-btn", this.c).forEach(function (b) { b.disabled = true; });
    clearIdent(this.info.id);
    this.failInFlight();
    this.announce();
    this.system(reason === "expired" ? "This session has expired." : "This session was ended.");
    if (typeof this.opts.onEnd === "function") this.opts.onEnd(reason);
  };
  ChatSession.prototype.updateTurnClear = function () { var t = this.el(".chat-turn"); if (t) t.textContent = ""; };

  ChatSession.prototype.fail = function (message) {
    this.ended = true;
    this.setDot("off", "Not connected");
    this.status(message);
    this.el(".chat-input").disabled = true;
    this.el(".chat-send").disabled = true;
    if (typeof this.opts.onFail === "function") this.opts.onFail(message);
  };

  ChatSession.prototype.leave = function () {
    this.closedByUs = true;
    clearTimeout(this._retryT);
    if (this.role === "host" && this.info.hostKey && !this.ended) {
      api("/api/sessions/" + this.info.id + "/end", { method: "POST", body: JSON.stringify({ hostKey: this.info.hostKey }) }).catch(function () {});
    }
    // Drop the stored identity so starting over truly starts over.
    clearIdent(this.info.id);
    try { if (this.ws) this.ws.close(); } catch (e) {}
    if (typeof this.opts.onLeave === "function") this.opts.onLeave();
  };

  ChatSession.prototype.destroy = function () {
    this.closedByUs = true;
    if (window.SangamChat) window.SangamChat = null;
    try { window.dispatchEvent(new CustomEvent("sangam:chat-status", { detail: { connected: false, ended: true } })); } catch (e) {}
    clearTimeout(this._retryT);
    try { if (this.ws) this.ws.close(); } catch (e) {}
  };

  /* ============================================================================
   * Share panel (creator view): QR, link, status, expiry, end.
   * ========================================================================== */
  function SharePanel(container, created, onEnd) {
    this.c = container;
    this.d = created;
    this.onEnd = onEnd;
    this.render();
    this.tick();
  }
  SharePanel.prototype.render = function () {
    var d = this.d;
    this.c.innerHTML =
      '<div class="share">' +
        '<p class="mini-label">SHARE TO CONNECT</p>' +
        '<div class="share-qr">' +
          (d.qrDataUrl
            ? '<img src="' + d.qrDataUrl + '" width="180" height="180" alt="QR code. Scan it with a phone camera to join this conversation.">'
            : '<div class="qr-fallback">' + ic("qr-code") + "<span>" + esc(d.qrError || "QR unavailable") + "</span></div>") +
        '</div>' +
        '<p class="share-hint">Scan with a phone camera, or share the link.</p>' +
        '<div class="share-link">' +
          '<input class="share-url" type="text" readonly aria-label="Join link" value="' + esc(d.joinUrl) + '">' +
          '<button class="btn btn-sm share-copy" type="button">' + ic("copy") + "Copy</button>" +
        '</div>' +
        '<dl class="share-meta">' +
          '<div><dt>Status</dt><dd class="share-state">Active</dd></div>' +
          '<div><dt>Expires in</dt><dd class="share-exp">—</dd></div>' +
        '</dl>' +
      '</div>';
    var self = this;
    this.c.querySelector(".share-copy").addEventListener("click", function () {
      var inp = self.c.querySelector(".share-url");
      inp.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(self.d.joinUrl).then(function () { toast("Link copied"); }, function () { if (ok) toast("Link copied"); else toast("Press Ctrl/Cmd+C to copy"); });
      } else { toast(ok ? "Link copied" : "Press Ctrl/Cmd+C to copy"); }
    });
  };
  SharePanel.prototype.tick = function () {
    var self = this;
    function up() {
      var left = self.d.expiresAt - Date.now();
      var exp = self.c.querySelector(".share-exp");
      if (!exp) return;
      if (left <= 0) { exp.textContent = "expired"; self.c.querySelector(".share-state").textContent = "Expired"; clearInterval(self._t); if (self.onEnd) self.onEnd("expired"); return; }
      exp.textContent = fmtClock(left);
    }
    up();
    this._t = setInterval(up, 1000);
  };
  SharePanel.prototype.setEnded = function () {
    clearInterval(this._t);
    var s = this.c.querySelector(".share-state"); if (s) s.textContent = "Ended";
    var e = this.c.querySelector(".share-exp"); if (e) e.textContent = "—";
  };
  SharePanel.prototype.destroy = function () { clearInterval(this._t); };

  /* ============================================================================
   * Lobby (the Connect dashboard panel): create or join.
   * ========================================================================== */
  var lobbyChat = null, lobbyShare = null;

  function teardownLobby() {
    if (lobbyChat) { lobbyChat.destroy(); lobbyChat = null; }
    if (lobbyShare) { lobbyShare.destroy(); lobbyShare = null; }
    updatePill();
  }

  function renderLobby() {
    var root = $("#connectRoot");
    if (!root) return;
    teardownLobby();
    root.innerHTML =
      '<div class="connect-grid">' +
        '<div class="box connect-card">' +
          '<span class="ji" style="background:#FF9F1C22;color:#8A5000">' + ic("qr-code") + "</span>" +
          "<h3>Create a session</h3>" +
          "<p>Start a conversation and show a QR code for the other person to scan. You can talk on two separate devices.</p>" +
          '<label class="vis-hidden" for="createName">Session name</label>' +
          '<input id="createName" class="in" type="text" maxlength="80" placeholder="Session name (optional)" value="SANGAM conversation">' +
          '<label class="vis-hidden" for="hostName">Your display name</label>' +
          '<input id="hostName" class="in" type="text" maxlength="60" placeholder="Your display name" value="">' +
          '<button class="btn btn-fill" id="createBtn" type="button">' + ic("qr-code") + "Create &amp; show QR</button>" +
        "</div>" +
        '<div class="box connect-card">' +
          '<span class="ji" style="background:#2EC4D622;color:#0B5F6B">' + ic("log-in") + "</span>" +
          "<h3>Join a session</h3>" +
          "<p>Have a code or link from someone else? Enter it here, or just scan their QR code with your camera.</p>" +
          '<label class="vis-hidden" for="joinCode">Session code or link</label>' +
          '<input id="joinCode" class="in" type="text" placeholder="Paste a link or code" autocomplete="off">' +
          '<label class="vis-hidden" for="joinName">Your display name</label>' +
          '<input id="joinName" class="in" type="text" maxlength="60" placeholder="Your display name" value="">' +
          '<button class="btn btn-line dark-line" id="joinBtn" type="button">' + ic("arrow-right") + "Join</button>" +
          '<p class="note" id="joinMsg" role="status"></p>' +
        "</div>" +
      "</div>" +
      '<div id="connectLive" class="connect-live" hidden></div>';

    $("#createBtn").addEventListener("click", createSession);
    $("#joinBtn").addEventListener("click", function () {
      var raw = $("#joinCode").value.trim();
      var parsed = parseJoin(raw);
      if (!parsed) { $("#joinMsg").textContent = "That code or link does not look right."; return; }
      var name = $("#joinName").value.trim() || "Guest";
      enterChatInLobby(parsed.id, parsed.token, "guest", name, null);
    });
  }

  function createSession() {
    var btn = $("#createBtn"); btn.disabled = true;
    var name = ($("#createName").value || "").trim();
    var host = ($("#hostName").value || "").trim() || "Host";
    api("/api/sessions", { method: "POST", body: JSON.stringify({ name: name }) }).then(function (d) {
      btn.disabled = false;
      var live = $("#connectLive");
      live.hidden = false;
      live.innerHTML = '<div class="live-grid"><div class="live-share" id="liveShare"></div><div class="live-chat" id="liveChat"></div></div>';
      lobbyShare = new SharePanel($("#liveShare"), d, function (reason) { if (lobbyChat) lobbyChat.onEnded(reason); });
      var info = { id: d.id, token: d.token, name: d.name, expiresAt: d.expiresAt, hostKey: d.hostKey };
      lobbyChat = new ChatSession($("#liveChat"), info, "host", host, {
        onLeave: function () { renderLobby(); },
        onEnd: function () { if (lobbyShare) lobbyShare.setEnded(); }
      });
      live.scrollIntoView({ behavior: "smooth", block: "nearest" });
      toast("Session ready. Share the QR code.");
    }).catch(function (e) {
      btn.disabled = false;
      toast("Could not create a session. Is the server running?");
    });
  }

  function enterChatInLobby(id, token, role, name, hostKey) {
    var msg = $("#joinMsg");
    if (msg) msg.textContent = "Checking the session…";
    api("/api/sessions/" + id + "?token=" + encodeURIComponent(token)).then(function (s) {
      var live = $("#connectLive");
      live.hidden = false;
      live.innerHTML = '<div class="live-grid single"><div class="live-chat" id="liveChat"></div></div>';
      var info = { id: id, token: token, name: s.name, expiresAt: s.expiresAt, hostKey: hostKey };
      lobbyChat = new ChatSession($("#liveChat"), info, role, name, { onLeave: function () { renderLobby(); } });
      if (msg) msg.textContent = "";
      live.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }).catch(function (e) {
      if (msg) msg.textContent = e.status === 410 ? "That session has ended or expired." : (e.status === 403 ? "That link is not valid." : "Could not find that session.");
    });
  }

  /* Parse a pasted join link or raw "id/token" or "id token". */
  function parseJoin(raw) {
    if (!raw) return null;
    var m = raw.match(/#\/join\/([^/\s]+)\/([^/\s?&]+)/);
    if (m) return { id: m[1], token: m[2] };
    m = raw.match(/^([A-Za-z0-9_-]{4,})[\s/]+([A-Za-z0-9_-]{8,})$/);
    if (m) return { id: m[1], token: m[2] };
    return null;
  }

  /* ============================================================================
   * Join overlay (arriving from a scanned QR / shared link).
   * ========================================================================== */
  var overlayChat = null;

  function showOverlay(html) {
    var ov = $("#joinOverlay");
    ov.innerHTML = '<div class="join-card">' + html + "</div>";
    ov.hidden = false;
    document.documentElement.classList.add("join-open");
    var h = $("#home"), d = $("#dash");
    if (h) h.hidden = true;
    if (d) d.hidden = true;
  }
  // Leaving the full-screen chat does NOT end the conversation: the session stays
  // connected in the background so the phrase board, voice, photo and message tools
  // can still send into it. It is torn down only when the person leaves or it ends.
  function hideOverlay() {
    var ov = $("#joinOverlay");
    document.documentElement.classList.remove("join-open");
    if (overlayChat && !overlayChat.ended && !overlayChat.closedByUs) { ov.hidden = true; updatePill(); return; }
    ov.hidden = true; ov.innerHTML = "";
    if (overlayChat) { overlayChat.destroy(); overlayChat = null; }
    updatePill();
  }
  function showChatOverlay() {
    var ov = $("#joinOverlay"); if (!overlayChat) return false;
    ov.hidden = false; document.documentElement.classList.add("join-open");
    var h = $("#home"), d = $("#dash"); if (h) h.hidden = true; if (d) d.hidden = true;
    return true;
  }
  // A small always-visible link back to the live conversation.
  function updatePill() {
    var pill = $("#chatPill"); if (!pill) return;
    var live = window.SangamChat && window.SangamChat.isActive && window.SangamChat.isActive();
    var conn = live && window.SangamChat.isConnected();
    pill.hidden = !live;
    if (live) {
      pill.textContent = conn ? "Chat connected. Return to chat" : "Chat reconnecting. Return to chat";
      pill.setAttribute("href", overlayChat ? "#/chat" : "#/dashboard/connect");
    }
  }
  window.addEventListener("sangam:chat-status", updatePill);

  function openJoin(id, token) {
    showOverlay(
      '<div class="join-head"><span class="logo-type">SANGAM</span><span class="join-sub">Join a conversation</span></div>' +
      '<p class="join-status" role="status">Checking the invite…</p>'
    );
    api("/api/sessions/" + id + "?token=" + encodeURIComponent(token)).then(function (s) {
      renderJoinForm(id, token, s);
    }).catch(function (e) {
      var msg = e.status === 410 ? "This conversation has ended or expired." :
                e.status === 403 ? "This invite link is not valid." :
                "This conversation could not be found.";
      showOverlay(
        '<div class="join-head"><span class="logo-type">SANGAM</span><span class="join-sub">Join a conversation</span></div>' +
        '<div class="join-error">' + ic("triangle-alert") + "<p>" + esc(msg) + "</p></div>" +
        '<button class="btn btn-line dark-line" type="button" id="joinHome">Go to SANGAM</button>'
      );
      var b = $("#joinHome"); if (b) b.addEventListener("click", function () { location.hash = "#/"; });
    });
  }

  function renderJoinForm(id, token, s) {
    showOverlay(
      '<div class="join-head"><span class="logo-type">SANGAM</span><span class="join-sub">Join a conversation</span></div>' +
      '<div class="join-info"><p>You are joining</p><b>' + esc(s.name) + "</b>" +
        '<span class="join-meta">' + ic("users") + (s.participants ? s.participants.connected : 1) + " here · no sign-up needed</span></div>" +
      '<label class="join-label" for="joinDisplay">Your display name</label>' +
      '<input id="joinDisplay" class="in" type="text" maxlength="60" placeholder="e.g. Priya" autocomplete="off">' +
      '<button class="btn btn-fill" id="joinGo" type="button">' + ic("log-in") + "Join the conversation</button>" +
      '<p class="note join-tip">A temporary name just for this chat. You can type, and new messages can be read aloud.</p>'
    );
    var input = $("#joinDisplay");
    setTimeout(function () { try { input.focus(); } catch (e) {} }, 60);
    function go() {
      var name = input.value.trim() || "Guest";
      var ov = $("#joinOverlay");
      ov.innerHTML = '<div class="join-card join-chat-card"><div id="overlayChat"></div></div>';
      // If the volunteer-accept flow stashed a hostKey for this session (they
      // are the derived chat's host), pick it up now so they can end it.
      var hostKey = null;
      try { hostKey = sessionStorage.getItem("sangam.hostkey." + id) || null; } catch (e) {}
      var role = hostKey ? "host" : "guest";
      overlayChat = new ChatSession($("#overlayChat"), { id: id, token: token, name: s.name, expiresAt: s.expiresAt, hostKey: hostKey }, role, name, {
        overlay: true,
        onLeave: function () { try { sessionStorage.removeItem("sangam.hostkey." + id); } catch (e) {} var oc = overlayChat; location.hash = "#/"; if (oc) { oc.destroy(); } overlayChat = null; var ov = $("#joinOverlay"); ov.innerHTML = ""; updatePill(); },
        onFail: function () {}
      });
    }
    $("#joinGo").addEventListener("click", go);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); go(); } });
  }

  /* ============================================================================
   * Routing glue.
   * ========================================================================== */
  function onHash() {
    var h = location.hash || "";
    if (h === "#/chat" && overlayChat) { showChatOverlay(); return; }
    var m = h.match(/^#\/join\/([^/]+)\/([^/?&]+)/);
    if (m) {
      if (overlayChat && overlayChat.info.id === m[1] && !overlayChat.ended) { showChatOverlay(); return; }
      openJoin(m[1], m[2]); return;
    }
    // Not a join route: make sure the overlay is closed.
    if (!$("#joinOverlay").hidden) hideOverlay();
    // The lobby session is deliberately kept alive when you leave the Connect panel.
    // Entering the connect panel (and it is empty) renders the lobby.
    if (h.indexOf("#/dashboard/connect") === 0 && !lobbyChat && !lobbyShare) renderLobby();
  }

  function boot() {
    if ($("#connectRoot") && !$("#connectRoot").children.length && location.hash.indexOf("#/dashboard/connect") === 0) renderLobby();
    else if ($("#connectRoot") && !$("#connectRoot").children.length) renderLobby();
    onHash();
    window.addEventListener("hashchange", onHash);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
