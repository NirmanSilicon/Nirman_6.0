/*
 * SANGAM live voice (Mode B): a direct audio connection between two people in a
 * chat session, using WebRTC. The server only relays the set-up messages
 * (offer, answer, network candidates). It never receives or records audio.
 *
 * Rules this file keeps:
 *   - The microphone is never opened until the person presses Start or Accept.
 *   - A call is never answered automatically: the other person must accept.
 *   - It is described honestly: tested between two browser sessions on one
 *     computer; not tested on two separate devices or across networks.
 */
(function () {
  "use strict";
  var SG = window.Sangam || {};
  var esc = SG.esc;

  var pc = null, stream = null, remoteAudio = null, peerPid = null, peerName = "", pending = null, queued = [];
  var state = "idle"; // idle | calling | ringing | connecting | connected | failed | ended
  var ui = null;

  function C() { return window.SangamChat; }
  function setState(s, text) {
    state = s;
    if (!ui) return;
    ui.status.textContent = text || ({ idle: "No call.", ended: "Call ended." }[s] || "");
    var inCall = s === "calling" || s === "connecting" || s === "connected";
    ui.start.hidden = inCall || s === "ringing";
    ui.mute.hidden = s !== "connected"; ui.hang.hidden = !inCall;
    ui.prompt.hidden = s !== "ringing";
    refreshStart();
  }
  function refreshStart() {
    if (!ui) return;
    var ok = C() && C().isConnected && C().isConnected() && (C().peers().filter(function (p) { return p.connected; }).length > 0);
    ui.start.disabled = !ok || !(window.RTCPeerConnection && navigator.mediaDevices);
    ui.start.title = ok ? "" : "Needs another connected person in this session.";
  }

  function iceServers() {
    return window.SangamTranslate ? window.SangamTranslate.capabilities().then(function (c) { return (c.rtc && c.rtc.iceServers) || []; }) : Promise.resolve([]);
  }
  function micError(e) {
    if (e && (e.name === "NotAllowedError" || e.name === "SecurityError")) return "The microphone is blocked. Allow it in your browser settings, then try again.";
    if (e && e.name === "NotFoundError") return "No microphone was found on this device.";
    return "Could not open the microphone.";
  }
  function signal(kind, extra) {
    if (!C() || !peerPid) return false;
    return C().frame({ type: "rtc", to: peerPid, signal: Object.assign({ kind: kind }, extra || {}) });
  }

  function makePc(servers) {
    pc = new RTCPeerConnection({ iceServers: servers });
    pc.onicecandidate = function (e) { if (e.candidate) signal("candidate", { candidate: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate }); };
    pc.ontrack = function (e) {
      if (!remoteAudio) { remoteAudio = document.createElement("audio"); remoteAudio.autoplay = true; remoteAudio.setAttribute("aria-hidden", "true"); document.body.appendChild(remoteAudio); }
      remoteAudio.srcObject = e.streams[0];
      var p = remoteAudio.play(); if (p && p.catch) p.catch(function () {});
    };
    pc.onconnectionstatechange = function () {
      if (!pc) return;
      if (pc.connectionState === "connected") setState("connected", "Connected to " + peerName + ". Audio goes directly between your devices.");
      else if (pc.connectionState === "failed") { cleanup(); setState("failed", "The call could not connect. On different networks it needs a relay server configured by whoever runs SANGAM."); }
      else if (pc.connectionState === "disconnected") setState("connecting", "Connection interrupted. Trying to recover…");
    };
    stream.getTracks().forEach(function (t) { pc.addTrack(t, stream); });
  }
  function cleanup() {
    if (pc) { try { pc.close(); } catch (e) {} pc = null; }
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    if (remoteAudio) { remoteAudio.srcObject = null; remoteAudio.remove(); remoteAudio = null; }
    queued = []; pending = null;
  }

  function start() {
    var c = C(); if (!c || !c.isConnected()) return;
    var peers = c.peers().filter(function (p) { return p.connected; });
    if (!peers.length) { setState("idle", "Nobody else is connected."); return; }
    peerPid = peers[0].pid; peerName = peers[0].name;
    setState("calling", "Asking " + peerName + " to join a voice call. Your microphone opens now…");
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
      stream = s;
      return iceServers();
    }).then(function (servers) {
      makePc(servers);
      return pc.createOffer();
    }).then(function (offer) { return pc.setLocalDescription(offer).then(function () { return offer; }); })
      .then(function (offer) {
        if (!signal("offer", { sdp: offer.sdp })) throw new Error("signal");
        setState("calling", "Calling " + peerName + "… waiting for them to accept.");
      })
      .catch(function (e) { cleanup(); setState("failed", e && e.message === "signal" ? "Could not reach the other person." : micError(e)); });
  }

  function accept() {
    if (!pending) return;
    var offer = pending; pending = null;
    setState("connecting", "Opening your microphone…");
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
      stream = s; return iceServers();
    }).then(function (servers) {
      makePc(servers);
      return pc.setRemoteDescription({ type: "offer", sdp: offer.sdp });
    }).then(function () {
      var q = queued; queued = [];
      return Promise.all(q.map(function (cand) { return pc.addIceCandidate(cand).catch(function () {}); }));
    }).then(function () { return pc.createAnswer(); })
      .then(function (ans) { return pc.setLocalDescription(ans).then(function () { return ans; }); })
      .then(function (ans) { signal("answer", { sdp: ans.sdp }); setState("connecting", "Connecting to " + peerName + "…"); })
      .catch(function (e) { signal("decline", { reason: "error" }); cleanup(); setState("failed", micError(e)); });
  }
  function decline() {
    signal("decline", { reason: "declined" }); pending = null; queued = []; setState("idle", "You declined the call.");
  }
  function hangup(silent) {
    if (state !== "idle") signal("hangup");
    cleanup(); setState("ended", silent ? "Call ended." : "You ended the call.");
  }

  window.addEventListener("sangam:rtc", function (e) {
    var d = e.detail || {}, s = d.signal || {};
    if (s.kind === "offer") {
      if (state !== "idle" && state !== "ended" && state !== "failed") { C() && C().frame({ type: "rtc", to: d.from, signal: { kind: "decline", reason: "busy" } }); return; }
      peerPid = d.from; peerName = d.fromName || "The other person"; pending = { sdp: s.sdp }; queued = [];
      setState("ringing", peerName + " is asking to start a live voice call.");
      ui.promptText.textContent = peerName + " is asking to start a live voice call. Your microphone stays off until you accept.";
      ui.accept.focus();
    } else if (d.from !== peerPid) {
      return;
    } else if (s.kind === "answer" && pc) {
      pc.setRemoteDescription({ type: "answer", sdp: s.sdp }).then(function () {
        var q = queued; queued = []; q.forEach(function (cand) { pc.addIceCandidate(cand).catch(function () {}); });
        setState("connecting", "Connecting to " + peerName + "…");
      }).catch(function () { cleanup(); setState("failed", "The other device's answer could not be used."); });
    } else if (s.kind === "candidate" && s.candidate) {
      if (pc && pc.remoteDescription) pc.addIceCandidate(s.candidate).catch(function () {}); else queued.push(s.candidate);
    } else if (s.kind === "decline") {
      cleanup(); setState("ended", s.reason === "busy" ? peerName + " is already in a call." : peerName + " did not accept the call.");
    } else if (s.kind === "hangup") {
      var wasRinging = state === "ringing"; cleanup(); setState("ended", wasRinging ? peerName + " cancelled the call." : peerName + " ended the call.");
    }
  });

  window.addEventListener("sangam:chat-ready", function (e) {
    var extra = e.detail && e.detail.extra; if (!extra) return;
    var wrap = document.createElement("div"); wrap.className = "chat-live";
    wrap.innerHTML =
      '<h4 class="pbox-h">Live voice (optional)</h4>' +
      '<p class="note">For people who can hear and speak. Audio goes directly between the two devices and is not recorded by SANGAM. The other person sees your network address as part of any direct connection. Tested between two browser sessions on one computer only; on different networks it needs a relay server set up by whoever runs SANGAM.</p>' +
      '<div class="row"><button class="btn btn-sm live-start" type="button">Start live voice</button><button class="btn btn-sm live-mute" type="button" hidden aria-pressed="false">Mute microphone</button><button class="btn btn-sm live-hang" type="button" hidden>End call</button></div>' +
      '<div class="live-prompt" role="alertdialog" aria-label="Incoming live voice call" hidden><p class="live-prompt-text"></p><div class="row"><button class="btn btn-fill btn-sm live-accept" type="button">Accept</button><button class="btn btn-sm live-decline" type="button">Decline</button></div></div>' +
      '<p class="note live-status" role="status"></p>';
    extra.appendChild(wrap);
    ui = { start: wrap.querySelector(".live-start"), mute: wrap.querySelector(".live-mute"), hang: wrap.querySelector(".live-hang"), prompt: wrap.querySelector(".live-prompt"), promptText: wrap.querySelector(".live-prompt-text"), accept: wrap.querySelector(".live-accept"), decline: wrap.querySelector(".live-decline"), status: wrap.querySelector(".live-status") };
    ui.start.addEventListener("click", start);
    ui.accept.addEventListener("click", accept);
    ui.decline.addEventListener("click", decline);
    ui.hang.addEventListener("click", function () { hangup(false); });
    ui.mute.addEventListener("click", function () {
      if (!stream) return;
      var t = stream.getAudioTracks()[0]; if (!t) return;
      t.enabled = !t.enabled; this.setAttribute("aria-pressed", String(!t.enabled)); this.textContent = t.enabled ? "Mute microphone" : "Unmute microphone";
      ui.status.textContent = t.enabled ? "Microphone on." : "Microphone muted. The other person cannot hear you.";
    });
    setState("idle", "");
    if (!(window.RTCPeerConnection && navigator.mediaDevices)) ui.status.textContent = "This browser cannot make live voice calls.";
  });
  window.addEventListener("sangam:chat-status", function (e) {
    refreshStart();
    if (e.detail && e.detail.ended && state !== "idle") { cleanup(); setState("ended", "The session ended, so the call ended."); }
  });

  window.SangamLive = { state: function () { return { state: state, pcState: pc ? pc.connectionState : null, hasStream: !!stream }; }, hangup: hangup };
})();
