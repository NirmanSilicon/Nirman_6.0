/*
 * SANGAM optional voice commands.
 *
 * What it is: a button (shown only if the person turned on "Voice-guided navigation" in their accessibility preferences)
 * that listens for ONE spoken command when pressed, then stops. It never listens in the background, never starts by itself,
 * and never sends a message or deletes anything without a separate confirmation.
 * What it is not: it does not replace the keyboard or a screen reader, and it is not offline. It uses the browser's own
 * speech recognition; in Chrome and Edge that sends the sound to the browser company's servers. The consent screen says so.
 */
(function () {
  "use strict";
  var AX = window.SangamAX, SG = window.Sangam || {};
  if (!AX) return;
  var S = AX.S, CONSENT = "sangam.voicenav.consent.v1";
  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  var state = { rec: null, listening: false, timer: null, pending: null };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function enabled() { var rd = S.signedIn && S.me && S.me.roleData; return !!(rd && rd.navigation && rd.navigation.voiceNav && AX.complete()); }
  function prefs() { var rd = (S.me && S.me.roleData) || {}; return { speak: !!(rd.audio && rd.audio.spokenNotifications) && !(rd.navigation && rd.navigation.screenReader) }; }
  // One message, one channel: the polite live region always (a screen reader reads it); the speech voice only if the person asked for spoken feedback and is not already using a screen reader.
  function tell(msg, level) { if (SG.announce) SG.announce(msg, level || "info"); var el = document.getElementById("vnStatus"); if (el) el.textContent = msg; if (prefs().speak && SG.speak) SG.speak(msg); }

  var COMMANDS = [
    ["open dashboard", /\b(open|go to|show)\b.*\b(dashboard|home|overview)\b/, function () { AX.go(AX.complete() ? "#/me" : "#/dashboard"); return "Opening your dashboard."; }],
    ["open communication", /\b(open|go to|start)\b.*\b(communication|communicate|conversation|chat)\b/, function () { var r = S.me && S.me.role; AX.go(r === "primary" || r === "secondary" ? "#/me/communicate" : "#/dashboard/connect"); return "Opening communication."; }],
    ["read current page", /\bread\b.*\b(page|screen|this)\b/, function () { return pageText(); }],
    ["read my messages", /\bread\b.*\b(messages?|notifications?)\b/, null, readMessages],
    ["open accessibility settings", /\b(open|go to|show)\b.*\b(accessibility|settings?)\b/, function () { AX.go(S.me && S.me.role === "primary" ? "#/me/accessibility" : "#/me/settings"); return "Opening accessibility settings."; }],
    ["increase text size", /\b(increase|bigger|larger|raise)\b.*\b(text|size|font)\b|\btext\b.*\b(bigger|larger)\b/, function () { return size(+10); }],
    ["decrease text size", /\b(decrease|smaller|reduce|lower)\b.*\b(text|size|font)\b|\btext\b.*\bsmaller\b/, function () { return size(-10); }],
    ["go back", /\bgo back\b|^back$/, function () { history.back(); return "Going back."; }],
    ["open profile", /\b(open|go to|show)\b.*\bprofile\b/, function () { AX.go("#/me/settings/personal"); return "Opening your profile."; }],
    ["start voice-to-text", /\bstart\b.*\b(voice|dictation|captions?|listening)\b/, null, null, "start voice-to-text, which turns the microphone on"],
    ["stop voice input", /\bstop\b.*\b(voice|dictation|listening|input)\b/, function () { var m = document.getElementById("mic"); if (m && m.getAttribute("aria-pressed") === "true") { m.click(); return "Voice input stopped."; } return "Voice input was not running."; }],
    ["repeat the last announcement", /\b(repeat|say again)\b/, function () { if (SG.repeat) SG.repeat(); return "Repeating."; }],
    ["stop speaking", /\bstop\b.*\b(speaking|talking|reading)\b|^(be quiet|silence)$/, function () { if (SG.stop) SG.stop(); return "Stopped."; }],
    ["sign out", /\bsign out\b|\blog out\b/, null, null, "sign you out"],
    ["help", /\b(help|what can i say|commands)\b/, function () { return "You can say: " + COMMANDS.map(function (c) { return c[0]; }).join(", ") + "."; }],
  ];
  function size(d) { var P = SG.profile; if (!P) return "Text size is not available here."; var n = Math.max(100, Math.min(160, (P.scale || 100) + d)); if (n === P.scale) return "Text is already as " + (d > 0 ? "large" : "small") + " as it goes."; P.scale = n; SG.save && SG.save(); SG.applyProfile && SG.applyProfile(); return "Text size is now " + n + " percent."; }
  function pageText() {
    var root = document.querySelector("#acct:not([hidden]) #acctView") || document.querySelector("#dash:not([hidden])") || document.querySelector("#home:not([hidden])"); if (!root) return "There is nothing to read here.";
    var h = root.querySelector("h1"), parts = [h ? h.textContent.trim() : "", (root.querySelector(".ax-lead,.dash-lead,.sub,.ax-sub") || {}).textContent || ""];
    [].slice.call(root.querySelectorAll("h2")).slice(0, 6).forEach(function (x) { parts.push(x.textContent.trim()); });
    var t = parts.filter(Boolean).join(". "); return t ? "This page: " + t.slice(0, 700) : "This page has no readable text.";
  }
  function readMessages() {
    return AX.api("GET", "/api/notifications").then(function (r) {
      if (!r.ok) return "I couldn't load your notifications.";
      var un = r.data.notifications.filter(function (n) { return !n.read; }).slice(0, 5);
      return un.length ? "You have " + r.data.unread + " unread notification" + (r.data.unread === 1 ? "" : "s") + ". " + un.map(function (n) { return n.title + ". " + n.body; }).join(" ") : "You have no unread notifications. Conversation messages are live only and are not stored, so there is nothing else to read.";
    });
  }

  function run(heard) {
    var said = String(heard || "").toLowerCase().replace(/[.,!?]/g, "").trim();
    if (state.pending) { var p = state.pending; state.pending = null; closeConfirm(); if (/\b(yes|yeah|confirm|ok|okay|go ahead)\b/.test(said)) return p(); return tell("Cancelled. Nothing was changed.", "info"); }
    for (var i = 0; i < COMMANDS.length; i++) {
      var c = COMMANDS[i]; if (!c[1].test(said)) continue;
      if (c[4]) return confirmThen(c[4], function () { if (c[0] === "sign out") { tell("Signing out.", "important"); return AX.acts.signout(); } AX.go("#/dashboard/relay"); setTimeout(function () { var m = document.getElementById("mic"); if (m && m.getAttribute("aria-pressed") !== "true") m.click(); }, 400); tell("Opening speak and caption. Voice-to-text is starting.", "important"); });
      if (c[3]) return c[3]().then(function (m) { tell(m, "info"); });
      return tell(c[2](), "info");
    }
    tell("I did not understand " + (said ? "“" + said + "”" : "that") + ". Say “help” to hear what I can do.", "info");
  }
  function confirmThen(what, fn) {
    state.pending = fn; var dlg = document.getElementById("vnConfirm");
    if (!dlg) { dlg = document.createElement("div"); dlg.id = "vnConfirm"; dlg.className = "ax"; dlg.setAttribute("role", "alertdialog"); dlg.setAttribute("aria-labelledby", "vnConfT"); dlg.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:120;background:#fff;color:#241F3B;border:3px solid #16122B;border-radius:18px;padding:18px 22px;box-shadow:0 20px 60px rgba(0,0,0,.4);max-width:min(560px,92vw)"; document.body.appendChild(dlg); }
    dlg.innerHTML = '<p id="vnConfT" style="margin:0 0 12px"><b>Please confirm.</b> You asked me to ' + esc(what) + '. Press Confirm, or press the voice button and say “yes”.</p><div style="display:flex;gap:10px"><button class="btn btn-fill btn-sm" id="vnYes" type="button">Confirm</button><button class="btn btn-sm" id="vnNo" type="button">Cancel</button></div>';
    dlg.hidden = false; dlg.querySelector("#vnYes").focus();
    dlg.querySelector("#vnYes").onclick = function () { var p = state.pending; state.pending = null; closeConfirm(); if (p) p(); };
    dlg.querySelector("#vnNo").onclick = function () { state.pending = null; closeConfirm(); tell("Cancelled. Nothing was changed.", "info"); };
    tell("Please confirm: " + what + ". Press Confirm, or say yes.", "important");
  }
  function closeConfirm() { var d = document.getElementById("vnConfirm"); if (d) d.hidden = true; var b = document.getElementById("vnBtn"); if (b) b.focus(); }

  /* ------------------------------------------------------------------ listening (one command, then stop) */
  function stop(msg) {
    clearTimeout(state.timer); state.listening = false;
    if (state.rec) { try { state.rec.abort(); } catch (e) {} state.rec = null; }
    paint(); if (msg) tell(msg, "info");
  }
  function listen() {
    if (!Rec) return unsupported();
    if (state.listening) return stop("Stopped listening.");
    var r = new Rec(); state.rec = r; r.lang = (SG.profile && SG.profile.lang) || "en-IN"; r.interimResults = false; r.continuous = false; r.maxAlternatives = 1;
    r.onresult = function (e) { var t = e.results[0] && e.results[0][0] && e.results[0][0].transcript; state.listening = false; clearTimeout(state.timer); state.rec = null; paint(); run(t); };
    r.onerror = function (e) { var m = { "not-allowed": "Microphone access was blocked. Allow it for this site to use voice commands.", "service-not-allowed": "Microphone access was blocked.", "no-speech": "I didn't hear anything.", "audio-capture": "No microphone was found.", "network": "The browser's speech service could not be reached.", "aborted": "" }[e.error]; stop(m === undefined ? "Voice commands stopped (" + e.error + ")." : m); };
    r.onend = function () { if (state.listening) { state.listening = false; paint(); } };
    try { r.start(); } catch (e) { return stop("Voice commands could not start. Try again."); }
    state.listening = true; paint(); tell(state.pending ? "Listening for yes or no." : "Listening for one command. Say “help” for the list, or press the button again to cancel.", "important");
    state.timer = setTimeout(function () { stop("Stopped listening: I did not hear a command."); }, 8000);
  }
  function unsupported() { openInfo("Voice commands are not available in this browser", "<p>This browser does not offer speech recognition to web pages. Chrome and Edge do. Everything in SANGAM still works with the keyboard, a screen reader, the touch screen or a switch.</p>"); }
  function openInfo(title, html, onOk, okLabel) {
    var d = document.createElement("dialog"); d.className = "ax"; d.setAttribute("aria-labelledby", "vnT"); d.style.cssText = "border:0;border-radius:20px;padding:0;box-shadow:0 30px 80px rgba(0,0,0,.4);max-width:92vw;background:#fff;color:#241F3B";
    d.innerHTML = '<form method="dialog" style="padding:26px;max-width:540px"><h2 id="vnT" style="margin-bottom:10px">' + esc(title) + "</h2>" + html + '<div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">' + (onOk ? '<button class="btn btn-fill" id="vnOk" value="ok">' + esc(okLabel || "OK") + "</button>" : "") + '<button class="btn" value="cancel">' + (onOk ? "Not now" : "Close") + "</button></div></form>";
    document.body.appendChild(d); var opener = document.activeElement; d.addEventListener("close", function () { d.remove(); if (opener && opener.focus && document.body.contains(opener)) opener.focus(); });
    var ok = d.querySelector("#vnOk"); if (ok) ok.addEventListener("click", function (e) { e.preventDefault(); d.close(); onOk(); }); d.showModal();
  }
  function press() {
    if (!Rec) return unsupported();
    var consented = false; try { consented = localStorage.getItem(CONSENT) === "1"; } catch (e) {}
    if (consented || state.listening) return listen();
    openInfo("Before voice commands listen", "<p>Voice commands listen <b>only while you have pressed the button</b>, for one command, then stop. Nothing is recorded or kept by SANGAM.</p><p><b>Where the sound goes:</b> your browser turns speech into text. In Chrome and Edge that means the sound is sent to the browser company's servers. SANGAM does not control that, and it is not offline.</p><p>Commands never send a message or delete anything without asking you to confirm. Voice commands are optional: you can turn them off in your accessibility preferences.</p>", function () { try { localStorage.setItem(CONSENT, "1"); } catch (e) {} listen(); }, "I understand, listen");
  }

  /* ------------------------------------------------------------------ the header button */
  function paint() {
    var host = document.getElementById("axNav"); if (!host) return;
    var b = document.getElementById("vnBtn");
    if (!enabled()) { if (b) b.parentNode.removeChild(b); var s = document.getElementById("vnStatus"); if (s) s.remove(); return; }
    if (!b) { b = document.createElement("button"); b.id = "vnBtn"; b.type = "button"; b.className = "ax-navlink"; b.style.cssText = "background:none;border:1px solid rgba(255,255,255,.3);cursor:pointer;font:inherit;color:inherit"; b.addEventListener("click", press); host.insertBefore(b, host.firstChild); }
    b.setAttribute("aria-pressed", String(state.listening));
    b.innerHTML = '<svg class="icon ax-i" aria-hidden="true"><use href="#i-' + (state.listening ? "mic" : "mic-off") + '"/></svg><span>' + (state.listening ? "Listening… (press to cancel)" : "Voice commands") + "</span>";
    b.setAttribute("aria-keyshortcuts", "Alt+V");
    if (!document.getElementById("vnStatus")) { var st = document.createElement("span"); st.id = "vnStatus"; st.className = "ax-sr"; st.setAttribute("role", "status"); host.appendChild(st); }
  }
  document.addEventListener("keydown", function (e) { if (e.altKey && (e.key === "v" || e.key === "V") && enabled()) { e.preventDefault(); press(); } });
  window.addEventListener("sangam:account", paint); window.addEventListener("hashchange", function () { setTimeout(paint, 0); });
  var iv = setInterval(function () { if (AX.S.ready) { paint(); } }, 1500); window.addEventListener("beforeunload", function () { clearInterval(iv); });
  window.SangamVoice = { run: run, enabled: enabled, supported: !!Rec, commands: COMMANDS.map(function (c) { return c[0]; }) };
})();
