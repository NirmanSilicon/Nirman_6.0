/*
 * SANGAM emergency workflow.
 *
 * What it does:  lets a person review an urgent message, send it to the other
 * people in their live chat session, and see whether anyone confirmed seeing it.
 * What it does NOT do:  contact emergency services, locate the person, or reach
 * anyone who is not in the session. The dialog says so, and offers a way to show
 * the message to someone nearby or open the phone's own dialer.
 *
 * The alert is never sound-only, colour-only or vibration-only: it is text in a
 * modal alert dialog, announced by assistive technology, with optional speech and
 * vibration added where the device supports them.
 */
(function () {
  "use strict";
  var SG = window.Sangam || {};
  var $ = SG.$;
  function P() { return SG.profile || {}; }
  function has(l, id) { return (l || []).indexOf(id) >= 0; }
  function clock(ts) { try { return new Date(ts || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } }

  var dlg = $("#emgDlg"), showDlg = $("#emgShowDlg"), inDlg = $("#emgIn");
  if (!dlg) return;
  var opener = null, current = null, ackTimer = null, DEFAULT_MSG = "I need help. Please stay with me and call someone.";

  function openDlg(d) { try { d.showModal ? d.showModal() : d.setAttribute("open", ""); } catch (e) { d.setAttribute("open", ""); } }
  function closeDlg(d) { try { d.close ? d.close() : d.removeAttribute("open"); } catch (e) { d.removeAttribute("open"); } }
  function status(t) { $("#emgStatus").textContent = t || ""; }

  function target() {
    var C = window.SangamChat;
    if (C && C.isConnected && C.isConnected()) {
      var peers = C.peers ? C.peers() : [];
      var names = peers.filter(function (p) { return p.connected; }).map(function (p) { return p.name; });
      if (names.length) return { ok: true, text: "Will be sent to: " + names.join(", ") + " (everyone in your chat session). They get a full-screen alert and must press a button to confirm they saw it." };
      return { ok: true, text: "You are in a chat session but nobody else is connected right now. The alert will be stored in the chat, but no one is there to see it yet." };
    }
    return { ok: false, text: "No active chat session, so SANGAM cannot send this to anyone. Use the options below." };
  }
  function refreshTarget() {
    var t = target(); $("#emgTarget").textContent = t.text; $("#emgSend").disabled = !t.ok;
  }

  function open() {
    opener = document.activeElement;
    $("#emgText").value = P().emg || DEFAULT_MSG;
    var num = P().emgNum || "112"; $("#emgNum").value = num; setDial();
    status(""); current = null; clearTimeout(ackTimer);
    refreshTarget();
    openDlg(dlg);
    // Reading the message out loud is useful in person, so keep that for people who chose Spoken output.
    if (has(P().outm, "audio")) SG.speak($("#emgText").value);
  }
  function setDial() {
    var n = ($("#emgNum").value || "").replace(/[^0-9+*#]/g, "");
    $("#emgDial").setAttribute("href", n ? "tel:" + n : "#");
    $("#emgDial").setAttribute("aria-disabled", n ? "false" : "true");
    P().emgNum = n; SG.save();
  }

  function send() {
    var text = $("#emgText").value.trim();
    if (!text) { status("Write the message first. Nothing was sent."); return; }
    var C = window.SangamChat;
    if (!C || !C.isConnected || !C.isConnected()) { status("NOT SENT. There is no connected chat session. Use the options below."); refreshTarget(); return; }
    clearTimeout(ackTimer);
    var cid = C.send(text, { kind: "emergency" });
    if (!cid) { status("NOT SENT. The alert could not be handed to the chat. Try again or use the options below."); return; }
    current = { cid: cid, id: null };
    status("Sending the alert…");
    $("#emgSend").textContent = "Send again";
  }

  window.addEventListener("sangam:chat-state", function (e) {
    var d = e.detail || {}; if (!current || d.cid !== current.cid) return;
    if (d.id) current.id = d.id;
    if (d.state === "sending") status("Sending the alert…");
    if (d.state === "pending") status("Connection lost. The alert is waiting and will send if the connection returns. Do not rely on it. Use the options below.");
    if (d.state === "failed") status("NOT SENT. The alert did not reach the server. Press Send again, or use the options below.");
    if (d.state === "sent") { status("The alert reached the server. Waiting for the other person to confirm they have seen it."); armAckTimer(); }
    if (d.state === "delivered") { status("The alert is on the other person's device. Waiting for them to confirm they have seen it."); armAckTimer(); }
  });
  function armAckTimer() {
    clearTimeout(ackTimer);
    ackTimer = setTimeout(function () {
      if (current && !current.acked) status("No one has confirmed yet. Do not assume anyone has seen this. Show your message to someone nearby, or open your phone's dialer.");
    }, window.__SANGAM_ACK_MS || 60000);
  }
  window.addEventListener("sangam:emergency-ack", function (e) {
    var d = e.detail || {};
    if (current && current.id && d.id === current.id && !d.mine) {
      current.acked = true; clearTimeout(ackTimer);
      status((d.byName || "Someone") + " confirmed they have seen your alert at " + clock(d.ts) + ".");
    }
    if (d.mine) { var s = $("#emgInStatus"); if (s) s.textContent = "Confirmed at " + clock(d.ts) + ". The sender can see that you have seen this."; }
  });

  /* ---- incoming alert ---- */
  var queue = [], shown = null;
  function showIncoming(m) {
    shown = m;
    $("#emgInFrom").textContent = "From " + (m.fromName || "someone in your session") + " at " + clock(m.timestamp);
    $("#emgInText").textContent = m.text;
    $("#emgInStatus").textContent = queue.length > 1 ? "There are " + (queue.length - 1) + " earlier alert(s) in this session. See the chat." : "";
    $("#emgInAck").disabled = false; $("#emgInAck").textContent = "I have seen this";
    if (!inDlg.open) openDlg(inDlg);
    // Every channel the device has, none of them on its own.
    if (has(P().outm, "audio")) SG.speak("Emergency alert. " + m.text);
    if (SG.canBuzz) { try { navigator.vibrate(window.SangamOut ? window.SangamOut.patterns.EMERGENCY.p : [400, 120, 400, 120, 400]); } catch (e) {} }
    var ack = $("#emgInAck"); if (ack) ack.focus();
  }
  window.addEventListener("sangam:chat-message", function (e) {
    var d = e.detail || {};
    if (d.direction !== "received" || d.kind !== "emergency") return;
    queue.push(d); showIncoming(d);
  });
  $("#emgInAck").addEventListener("click", function () {
    var C = window.SangamChat; if (!shown) return;
    if (C && C.frame && C.frame({ type: "emergency-ack", id: shown.id })) { this.disabled = true; this.textContent = "Confirmed"; $("#emgInStatus").textContent = "Sending your confirmation…"; }
    else $("#emgInStatus").textContent = "Could not send your confirmation: no connection. Try again.";
  });
  $("#emgInSay").addEventListener("click", function () { if (shown) SG.speak(shown.text); });
  $("#emgInClose").addEventListener("click", function () { SG.stop(); closeDlg(inDlg); });
  inDlg.addEventListener("close", function () { SG.stop(); queue = []; });

  /* ---- wiring ---- */
  $("#pEmg").addEventListener("click", open);
  var g = $("#emgGlobal"); if (g) g.addEventListener("click", open);
  $("#emgSend").addEventListener("click", send);
  $("#emgSay").addEventListener("click", function () { SG.speak($("#emgText").value); });
  $("#emgClose").addEventListener("click", function () { closeDlg(dlg); });
  $("#emgNum").addEventListener("input", setDial);
  $("#emgDial").addEventListener("click", function (e) { if (this.getAttribute("aria-disabled") === "true") e.preventDefault(); });
  $("#emgShow").addEventListener("click", function () { $("#emgBig").textContent = $("#emgText").value.trim() || DEFAULT_MSG; openDlg(showDlg); });
  $("#emgShowClose").addEventListener("click", function () { closeDlg(showDlg); });
  dlg.addEventListener("close", function () {
    SG.stop(); clearTimeout(ackTimer); $("#emgSend").textContent = "Send alert";
    if (opener && document.contains(opener) && opener.focus) opener.focus();
  });
  window.addEventListener("sangam:chat-status", function () { if (dlg.open) refreshTarget(); });

  window.SangamEmergency = { open: open };
})();
