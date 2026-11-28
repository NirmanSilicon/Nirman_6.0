/* Sangam. Static prototype, no build step. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var ic = function (n) { return '<svg class="icon" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var AMBER = "#FF9F1C", CYAN = "#2EC4D6", ROSE = "#FF5D73", INK = "#16122B";

  /* ---------- profile ---------- */
  var KEY = "sangam.v2";
  var DEF = { inm: ["voice", "camera", "text"], outm: ["captions", "audio", "braille"], scale: 100, rate: 1, lang: "en-IN", hc: false, emg: "I need help. Please stay with me and call someone.", voice: "", autoRead: false, scanOn: false, scanMs: 1200, scanAuto: true, scanLoops: 0, scanSpeak: false, announce: "all", confirmSend: false, hapOff: [], hapScale: 1, brDevice: false, brSend: true };
  var P = (function () { try { var o = JSON.parse(localStorage.getItem(KEY)); if (o) return Object.assign({}, DEF, o); } catch (e) {} return Object.assign({}, DEF); })();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} var s = $("#saved"); if (s) s.textContent = "Saved on this device. These preferences never leave this device, even in a shared chat."; try { window.dispatchEvent(new CustomEvent("sangam:profile")); } catch (e) {} }

  var INS = [
    { id: "voice", n: "Voice", i: "mic" },
    { id: "camera", n: "Camera", i: "camera" },
    { id: "text", n: "Text", i: "keyboard" },
    { id: "symbols", n: "Switch", i: "accessibility" }
  ];
  var OUTS = [
    { id: "audio", n: "Spoken", i: "volume-2" },
    { id: "captions", n: "Captions", i: "captions" },
    { id: "haptic", n: "Haptic", i: "vibrate" },
    { id: "braille", n: "Braille", i: "braille" }
  ];
  var FEAT = [
    { id: "profile", n: "Access profile", i: "sliders-horizontal", c: CYAN, d: "Pick how you send and how you receive." },
    { id: "relay", n: "Speak and caption", i: "mic", c: AMBER, d: "Live captions in, your reply back out." },
    { id: "scan", n: "Read from a photo", i: "scan-text", c: ROSE, d: "Point at a label or form and hear it." },
    { id: "sounds", n: "Sound alerts", i: "siren", c: ROSE, d: "Be told when an alarm, siren, doorbell or horn is heard." },
    { id: "sign", n: "Sign Language Camera", i: "hand", c: CYAN, d: "Sign to your camera, check the words, then speak or send them." },
    { id: "phrases", n: "Phrase board", i: "layout-grid", c: INK, d: "Build, edit and speak AAC messages." },
    { id: "messages", n: "Text messages", i: "message-square-text", c: CYAN, d: "Compose and send through your active chat." },
    { id: "connect", n: "Connect & chat", i: "qr-code", c: AMBER, d: "Scan a QR code and talk in real time, both ways." },
    { id: "learn", n: "SANGAM Learn", i: "graduation-cap", c: CYAN, d: "Sign basics, disability awareness and etiquette." },
    { id: "assist", n: "Human assistance", i: "heart-handshake", c: ROSE, d: "Request a volunteer when tech is not enough." },
    { id: "next", n: "What comes next", i: "route", c: "#7A6FA8", d: "What works today, what needs real devices, and what is still open." }
  ];
  var WHO = [
    { n: "Blind or low vision", d: "Text read aloud and controls built for screen readers.", i: "eye", c: CYAN },
    { n: "Deaf or hard of hearing", d: "Live captions and a typed exchange both ways.", i: "ear-off", c: AMBER },
    { n: "Non-speaking", d: "Quick phrases spoken out loud in your voice settings.", i: "message-square-text", c: ROSE },
    { n: "Combined needs", d: "Several modes at once, chosen by the person.", i: "hand-helping", c: "#7A6FA8" }
  ];

  /* ---------- toast ---------- */
  var tt; function toast(m) { var t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove("on"); }, 2000); }

  /* ---------- braille ---------- */
  var BL = { a: "⠁", b: "⠃", c: "⠉", d: "⠙", e: "⠑", f: "⠋", g: "⠛", h: "⠓", i: "⠊", j: "⠚", k: "⠅", l: "⠇", m: "⠍", n: "⠝", o: "⠕", p: "⠏", q: "⠟", r: "⠗", s: "⠎", t: "⠞", u: "⠥", v: "⠧", w: "⠺", x: "⠭", y: "⠽", z: "⠵" },
    BD = { 1: "⠁", 2: "⠃", 3: "⠉", 4: "⠙", 5: "⠑", 6: "⠋", 7: "⠛", 8: "⠓", 9: "⠊", 0: "⠚" },
    BP = { ".": "⠲", ",": "⠂", "?": "⠦", "!": "⠖", ";": "⠆", ":": "⠒", "'": "⠄", "-": "⠤" };
  // Uncontracted (Grade 1) English Braille shown with Unicode dot patterns.
  // Only symbols we are sure about are mapped; anything else is REPORTED, not guessed.
  // Not Grade 2 (contracted), not Braille for other languages, not a physical display.
  var BP2 = { ".": "⠲", ",": "⠂", "?": "⠦", "!": "⠖", ";": "⠆", ":": "⠒", "'": "⠄", "\u2019": "⠄", "-": "⠤" };
  function brailleDetail(t) {
    t = String(t == null ? "" : t);
    var out = "", num = false, bad = [], i = 0;
    var words = t.split(/(\s+)/);
    words.forEach(function (w) {
      if (/^\s+$/.test(w)) { out += w.replace(/\s/g, "⠀"); num = false; return; }
      var letters = w.replace(/[^A-Za-z]/g, "");
      var capWord = letters.length > 1 && letters === letters.toUpperCase();
      if (capWord) out += "⠠⠠";
      num = false;
      for (i = 0; i < w.length; i++) {
        var ch = w[i], lo = ch.toLowerCase(), nx = w[i + 1];
        if (/[0-9]/.test(ch)) { if (!num) { out += "⠼"; num = true; } out += BD[ch]; continue; }
        if (num && (ch === "." || ch === ",") && /[0-9]/.test(nx || "")) { out += BP2[ch]; continue; }
        if (num && /[a-j]/.test(lo)) out += "⠰"; // grade 1 indicator so a-j are not read as digits
        num = false;
        if (BL[lo] && /[A-Za-z]/.test(ch)) { if (ch !== lo && !capWord) out += "⠠"; out += BL[lo]; }
        else if (BP2[ch]) out += BP2[ch];
        else bad.push(ch);
      }
    });
    var uniq = bad.filter(function (c, n) { return bad.indexOf(c) === n; });
    return { cells: out, unsupported: uniq, count: bad.length };
  }
  function braille(t) { return brailleDetail(t).cells; }

  /* ---------- haptics ---------- */
  function syl(w) { var m = w.toLowerCase().replace(/[^a-z]/g, "").replace(/e$/, "").match(/[aeiouy]+/g); return Math.max(1, m ? m.length : 1); }
  function pattern(t) {
    var p = [], w = t.trim().split(/\s+/).filter(Boolean);
    w.forEach(function (x, wi) { var n = syl(x); for (var i = 0; i < n; i++) { p.push(i === n - 1 ? 220 : 90); if (i < n - 1) p.push(70); } if (wi < w.length - 1) p.push(260); });
    return p;
  }
  function bars(p) { var h = "", on = true; p.forEach(function (ms) { h += on ? '<i class="' + (ms > 150 ? "l" : "s") + '"></i>' : '<i class="' + (ms > 150 ? "w" : "g") + '"></i>'; on = !on; }); return h; }
  var canBuzz = typeof navigator.vibrate === "function";

  /* ---------- speech out ---------- */
  var synth = window.speechSynthesis;
  var cachedVoices = [];
  var lastSpoken = "";
  function fillVoiceList() {
    var sel = $("#voiceSel"); if (!sel) return;
    var keep = P.voice || "";
    sel.innerHTML = '<option value="">Automatic for the chosen language</option>' + cachedVoices.map(function (v) { return '<option value="' + esc(v.voiceURI) + '">' + esc(v.name + " (" + v.lang + ")") + "</option>"; }).join("");
    sel.value = keep;
    var n = $("#voiceNote"); if (n) n.textContent = cachedVoices.length ? cachedVoices.length + " voices on this device." : (synth ? "This browser reports no spoken voices yet. Spoken output may be silent on this device." : "This browser cannot speak text.");
  }
  function loadVoices() { if (!synth) return; cachedVoices = synth.getVoices(); fillVoiceList(); }
  if (synth) { loadVoices(); if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = loadVoices; }
  function speak(t) {
    t = (t || "").trim(); if (!t) { toast("Nothing to say yet"); return false; }
    if (!synth || !window.SpeechSynthesisUtterance) { toast("This browser cannot speak text"); return false; }
    // Chrome's speech engine can get stuck "paused" after being idle; resume before cancelling.
    // cancel() also guarantees only one utterance is ever active (no overlapping speech).
    if (synth.paused) synth.resume();
    synth.cancel();
    if (!cachedVoices.length) cachedVoices = synth.getVoices();
    var u = new SpeechSynthesisUtterance(t);
    var targetLang = P.lang || "en-US";
    u.lang = targetLang; u.rate = Number(P.rate) || 1;
    // Voice choice: the person's explicit pick -> exact language match -> language prefix -> default voice.
    var v = (P.voice && cachedVoices.filter(function (x) { return x.voiceURI === P.voice; })[0])
      || cachedVoices.filter(function (x) { return x.lang === targetLang || x.lang.replace("_", "-") === targetLang; })[0]
      || cachedVoices.filter(function (x) { return x.lang.slice(0, 2) === targetLang.slice(0, 2); })[0]
      || cachedVoices[0];
    if (v) u.voice = v;
    u.onerror = function (err) { console.warn("SpeechSynthesis error:", err); };
    lastSpoken = t;
    synth.speak(u);
    return true;
  }
  function stopSpeaking() {
    if (!synth) return false;
    if (synth.paused) synth.resume();
    synth.cancel();
    return true;
  }
  function repeatLast() {
    if (!lastSpoken) { toast("Nothing to repeat yet"); return false; }
    return speak(lastSpoken);
  }

  /* ---------- hero board ---------- */
  var pick = { in: "voice", out: "captions" };
  function drawJacks() {
    $("#inJacks").innerHTML = INS.map(function (j, n) {
      return '<li><button class="jack" type="button" data-k="in" data-id="' + j.id + '" data-n="' + (n + 1) + '" aria-pressed="' + (pick.in === j.id) + '"><span class="sock"></span><span class="nm">' + j.n + "</span></button></li>";
    }).join("");
    $("#outJacks").innerHTML = OUTS.map(function (j, n) {
      return '<li><button class="jack" type="button" data-k="out" data-id="' + j.id + '" data-n="' + (n + 5) + '" aria-pressed="' + (pick.out === j.id) + '"><span class="sock"></span><span class="nm">' + j.n + "</span></button></li>";
    }).join("");
  }
  function cable(n, cls) { var p = $("#c" + n); if (!p) return; p.setAttribute("class", cls); }
  function runCables() {
    for (var i = 1; i <= 8; i++) cable(i, "");
    var a = INS.map(function (x) { return x.id; }).indexOf(pick.in) + 1;
    var b = OUTS.map(function (x) { return x.id; }).indexOf(pick.out) + 5;
    cable(a, "live"); cable(b, "live");
    setTimeout(function () { cable(a, "lit"); cable(b, "lit"); }, 1100);
    var ni = INS.filter(function (x) { return x.id === pick.in; })[0].n;
    var no = OUTS.filter(function (x) { return x.id === pick.out; })[0].n;
    $("#boardFoot").textContent = ni + " in, " + no.toLowerCase() + " out.";
  }
  // The demo rotates by itself, which is moving content a person must be able to stop (WCAG 2.2.2).
  // It starts paused for people who ask their device for reduced motion, and any
  // manual choice of a jack also pauses it so the person stays in control.
  var boardPaused = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  function drawPause() { var b = $("#boardPause"); if (!b) return; b.setAttribute("aria-pressed", String(boardPaused)); b.textContent = boardPaused ? "Play demo" : "Pause demo"; }
  document.addEventListener("click", function (e) {
    var bp = e.target.closest("#boardPause"); if (bp) { boardPaused = !boardPaused; drawPause(); return; }
    var j = e.target.closest(".jack"); if (!j) return;
    pick[j.dataset.k] = j.dataset.id; boardPaused = true; drawPause(); drawJacks(); runCables();
  });
  var auto = setInterval(function () {
    if (boardPaused || $("#home").hidden || document.hidden) return;
    var i = INS.map(function (x) { return x.id; }).indexOf(pick.in), o = OUTS.map(function (x) { return x.id; }).indexOf(pick.out);
    pick.in = INS[(i + 1) % 4].id; pick.out = OUTS[(o + 3) % 4].id;
    drawJacks(); runCables();
  }, 3600);
  window.addEventListener("beforeunload", function () { clearInterval(auto); });

  /* ---------- static content ---------- */
  // Which workspaces are listed. Guests see all of them; a signed-in account sees the ones that suit its role
  // (assets/account.js calls Sangam.setFeatures). The panels themselves are never removed.
  var SHOWN = FEAT;
  function setFeatures(ids) { SHOWN = ids ? FEAT.filter(function (f) { return ids.indexOf(f.id) >= 0; }) : FEAT; build(); route(); }
  function build() {
    $("#dropList").innerHTML = SHOWN.map(function (f) {
      return '<li><a href="#/dashboard/' + f.id + '"><span class="ji" style="background:' + f.c + '22;color:' + f.c + '">' + ic(f.i) + "</span><span><b>" + f.n + (f.tag ? ' <span class="tag">' + f.tag + "</span>" : "") + "</b><small>" + f.d + "</small></span></a></li>";
    }).join("");
    $("#cards").innerHTML = SHOWN.map(function (f) {
      return '<a class="fcard" href="#/dashboard/' + f.id + '" style="--c:' + f.c + '"><span class="ji" style="background:' + f.c + '22;color:' + f.c + '">' + ic(f.i) + "</span><h3>" + f.n + "</h3><p>" + f.d + '</p><span class="go">Open' + ic("arrow-right") + "</span></a>";
    }).join("");
    $("#tabs").innerHTML = '<a href="#/dashboard" data-p="overview">Overview</a>' + SHOWN.map(function (f) { return '<a href="#/dashboard/' + f.id + '" data-p="' + f.id + '">' + f.n + "</a>"; }).join("");
    $("#whoGrid").innerHTML = WHO.map(function (w) {
      return '<article class="wcard" style="--c:' + w.c + '">' + ic(w.i) + "<h3>" + w.n + "</h3><p>" + w.d + "</p></article>";
    }).join("");
    $("#inChips").innerHTML = INS.map(function (j) { return '<label class="chip"><input type="checkbox" data-k="inm" value="' + j.id + '">' + "<span>" + ic(j.i) + j.n + "</span></label>"; }).join("");
    $("#outChips").innerHTML = OUTS.map(function (j) { return '<label class="chip"><input type="checkbox" data-k="outm" value="' + j.id + '">' + "<span>" + ic(j.i) + j.n + "</span></label>"; }).join("");
    $("#relayBraille").textContent = braille($("#relayGot").textContent);
  }

  function strip() {
    var html = P.inm.map(function (id) { var j = INS.filter(function (x) { return x.id === id; })[0]; return j ? '<span class="pill in">' + ic(j.i) + "Send: " + j.n + "</span>" : ""; }).join("") +
      P.outm.map(function (id) { var j = OUTS.filter(function (x) { return x.id === id; })[0]; return j ? '<span class="pill out">' + ic(j.i) + "Get: " + j.n + "</span>" : ""; }).join("");
    $("#profileStrip").innerHTML = html || '<span class="pill">No modes chosen yet</span>';
  }

  /* ---------- reply outputs ---------- */
  var MAP = { audio: { n: "Spoken audio", i: "volume-2", c: AMBER }, captions: { n: "Captions", i: "captions", c: CYAN }, haptic: { n: "Haptic rhythm", i: "vibrate", c: ROSE }, braille: { n: "Braille preview", i: "braille", c: INK } };
  function drawOuts() {
    var t = $("#say").value.trim(), box = $("#outs");
    var modes = P.outm.length ? P.outm : ["captions"];
    if (!t) { box.innerHTML = '<p class="note">Type a reply and it appears in your chosen modes.</p>'; return; }
    box.innerHTML = modes.map(function (m) {
      var d = MAP[m], b = "";
      if (m === "audio") b = '<button class="btn btn-sm" type="button" data-a="say">' + ic("volume-2") + "Speak it</button>";
      if (m === "captions") b = '<p class="ov">' + esc(t) + "</p>";
      if (m === "braille") b = '<p class="ov br">' + braille(t) + "</p>";
      if (m === "haptic") b = '<div class="rhy" aria-hidden="true">' + bars(pattern(t)) + "</div>" + (canBuzz ? '<button class="btn btn-sm" type="button" data-a="buzz">' + ic("vibrate") + "Feel it</button>" : '<p class="note">This device cannot vibrate.</p>');
      return '<div class="omode" style="--c:' + d.c + '"><span style="color:' + d.c + '">' + ic(d.i) + "</span><div><h4>" + d.n + "</h4>" + b + "</div></div>";
    }).join("");
    box.onclick = function (e) {
      var b = e.target.closest("button[data-a]"); if (!b) return;
      if (b.dataset.a === "say") speak(t); else navigator.vibrate(pattern(t));
    };
  }

  /* ---------- profile controls ---------- */
  function applyProfile() {
    document.documentElement.style.setProperty("--scale", P.scale / 100);
    document.documentElement.classList.toggle("hc", !!P.hc);
    $$("#inChips input").forEach(function (c) { c.checked = P.inm.indexOf(c.value) >= 0; });
    $$("#outChips input").forEach(function (c) { c.checked = P.outm.indexOf(c.value) >= 0; });
    $("#rng").value = P.scale; $("#rngOut").textContent = P.scale + "%";
    $("#rate").value = P.rate; $("#rateOut").textContent = Number(P.rate).toFixed(1) + "x";
    $("#lang").value = P.lang; $("#hc").checked = !!P.hc; $("#emg").value = P.emg;
    $("#autoRead").checked = !!P.autoRead; $("#scanOn").checked = !!P.scanOn; $("#scanMs").value = P.scanMs; $("#scanMsOut").textContent = (P.scanMs / 1000).toFixed(1) + " s"; if ($("#voiceSel")) $("#voiceSel").value = P.voice || "";
    $("#scanAuto").checked = P.scanAuto !== false; $("#scanLoops").value = String(P.scanLoops || 0); $("#scanSpeak").checked = !!P.scanSpeak;
    strip(); drawOuts();
  }
  document.addEventListener("change", function (e) {
    var c = e.target.closest(".chip input"); if (!c) return;
    P[c.dataset.k] = $$('.chip input[data-k="' + c.dataset.k + '"]:checked').map(function (x) { return x.value; });
    save(); strip(); drawOuts();
  });
  $("#rng").addEventListener("input", function () { P.scale = +this.value; $("#rngOut").textContent = this.value + "%"; document.documentElement.style.setProperty("--scale", P.scale / 100); save(); });
  $("#rate").addEventListener("input", function () { P.rate = +this.value; $("#rateOut").textContent = (+this.value).toFixed(1) + "x"; save(); });
  $("#lang").addEventListener("change", function () { P.lang = this.value; save(); });
  $("#hc").addEventListener("change", function () { P.hc = this.checked; document.documentElement.classList.toggle("hc", P.hc); save(); });
  $("#emg").addEventListener("input", function () { P.emg = this.value; save(); });
  $("#voiceSel").addEventListener("change", function () { P.voice = this.value; save(); });
  $("#voiceTest").addEventListener("click", function () { speak("This is how I sound. Hello from Sangam."); });
  $("#autoRead").addEventListener("change", function () { P.autoRead = this.checked; save(); });
  $("#scanOn").addEventListener("change", function () { P.scanOn = this.checked; save(); });
  $("#scanMs").addEventListener("input", function () { P.scanMs = +this.value; $("#scanMsOut").textContent = (P.scanMs / 1000).toFixed(1) + " s"; save(); });
  $("#scanAuto").addEventListener("change", function () { P.scanAuto = this.checked; save(); });
  $("#scanLoops").addEventListener("change", function () { P.scanLoops = +this.value; save(); });
  $("#scanSpeak").addEventListener("change", function () { P.scanSpeak = this.checked; save(); });
  $("#ttsStop").addEventListener("click", function () { stopSpeaking(); $("#ttsState").textContent = "Stopped."; });
  $("#ttsRepeat").addEventListener("click", function () { $("#ttsState").textContent = repeatLast() ? "Repeating." : "Nothing to repeat yet."; });
  $("#say").addEventListener("input", drawOuts);

  /* ---------- sending to the active chat (shared by voice, photo, phrases, messages) ---------- */
  var STATE_TEXT = { sending: "Sending…", sent: "Sent to server. Waiting for the other device to confirm.", delivered: "Delivered to the other device.", pending: "Waiting to reconnect. It will send when the connection is back.", failed: "Not sent. Press Retry." };
  var watchers = {};
  function chatActive() { return !!(window.SangamChat && window.SangamChat.isConnected && window.SangamChat.isConnected()); }
  // Returns the message client-id, or null when there is no chat. On null the caller KEEPS the draft.
  function sendToChat(text, source, noteEl, onState) {
    text = (text || "").trim();
    if (!text) { if (noteEl) noteEl.textContent = "Nothing to send yet."; return null; }
    if (!chatActive()) {
      if (noteEl) { noteEl.innerHTML = ""; noteEl.appendChild(document.createTextNode("Not connected to a chat, so nothing was sent. Your text is kept. ")); var a = document.createElement("a"); a.href = "#/dashboard/connect"; a.textContent = "Open Connect & chat"; noteEl.appendChild(a); noteEl.appendChild(document.createTextNode(" to create or join a session.")); }
      return null;
    }
    var cid = window.SangamChat.send(text, (source && typeof source === "object") ? source : { source: source });
    if (!cid) { if (noteEl) noteEl.textContent = "Could not hand the message to the chat. Your text is kept."; return null; }
    watchers[cid] = { note: noteEl, cb: onState };
    if (noteEl) noteEl.textContent = STATE_TEXT.sending;
    return cid;
  }
  window.addEventListener("sangam:chat-state", function (e) {
    var d = e.detail || {}, w = watchers[d.cid];
    if (w) { if (w.note) { w.note.textContent = STATE_TEXT[d.state] || ""; if (d.state === "failed") { var b = document.createElement("button"); b.type = "button"; b.className = "btn btn-sm"; b.textContent = "Retry"; b.addEventListener("click", function () { window.SangamChat.retry(d.cid); }); w.note.appendChild(document.createTextNode(" ")); w.note.appendChild(b); } } if (w.cb) w.cb(d.state); if (d.state === "delivered") delete watchers[d.cid]; }
  });

  /* ---------- speech in ---------- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, rec, on = false;
  if (!SR) { $("#mic").disabled = true; $("#micNote").textContent = "Live captions need Chrome or Edge. Typing, the phrase board and photo reading still work."; }
  function voiceDraftChanged() { $("#voiceSend").disabled = !$("#voiceDraft").value.trim(); }
  function appendVoiceDraft(t) { var d = $("#voiceDraft"); d.value = (d.value ? d.value.replace(/\s+$/, "") + " " : "") + t; voiceDraftChanged(); }
  $("#voiceDraft").addEventListener("input", voiceDraftChanged);
  $("#voiceClear").addEventListener("click", function () { $("#voiceDraft").value = ""; voiceDraftChanged(); $("#voiceSendNote").textContent = "Discarded. Nothing was sent."; });
  $("#voiceSend").addEventListener("click", function () {
    // Explicit confirmation: the transcript is only ever sent by this button.
    var cid = sendToChat($("#voiceDraft").value, "voice", $("#voiceSendNote"));
    if (cid) { $("#voiceDraft").value = ""; voiceDraftChanged(); }
  });
  $("#mic").addEventListener("click", function () {
    if (!SR) return;
    if (on && rec) { on = false; try { rec.stop(); } catch (e) {} $("#mic").setAttribute("aria-pressed", "false"); $("#micLabel").textContent = "Start listening"; $("#micNote").textContent = "Stopped. Your captions are kept."; return; }
    rec = new SR();
    // Chrome/Edge speech RECOGNITION (unlike speech synthesis) does not reliably
    // support the "en-IN" locale; fall back to "en-US" for recognition only.
    var chosenLang = (typeof P !== "undefined" && P && P.lang) || "en-US";
    if (chosenLang === "en-IN") chosenLang = "en-US";
    rec.lang = chosenLang; rec.continuous = true; rec.interimResults = true;
    var tmpEl = null;
    rec.onstart = function () { on = true; $("#mic").setAttribute("aria-pressed", "true"); $("#micLabel").textContent = "Stop listening"; $("#micNote").textContent = "Listening."; };
    rec.onresult = function (e) {
      var fin = "", tmp = "";
      for (var i = e.resultIndex; i < e.results.length; i++) { e.results[i].isFinal ? fin += e.results[i][0].transcript : tmp += e.results[i][0].transcript; }
      if (tmpEl) { tmpEl.remove(); tmpEl = null; }
      if (fin.trim()) { var p = document.createElement("p"); p.textContent = fin.trim(); $("#tscript").appendChild(p); appendVoiceDraft(fin.trim()); }
      if (tmp.trim()) { tmpEl = document.createElement("p"); tmpEl.className = "i"; tmpEl.textContent = tmp; $("#tscript").appendChild(tmpEl); }
      $("#tscript").scrollTop = $("#tscript").scrollHeight;
    };
    rec.onerror = function (e) {
      $("#micNote").textContent = { "not-allowed": "The microphone is blocked. Allow it in your browser settings.", "service-not-allowed": "The microphone is blocked. Allow it in your browser settings.", "no-speech": "I did not hear anything. Try again closer to the mic.", "audio-capture": "No microphone found.", network: "Speech recognition needs an internet connection.", "language-not-supported": "This browser cannot recognise speech in the chosen language. Type instead, or pick another language." }[e.error] || "Stopped (" + e.error + ").";
      // Terminal errors must not trigger the onend auto-restart loop above.
      if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture" || e.error === "language-not-supported") on = false;
    };
    rec.onend = function () {
      if (tmpEl) { if (tmpEl.textContent.trim()) { tmpEl.className = ""; tmpEl.textContent = tmpEl.textContent.trim(); } else { tmpEl.remove(); } tmpEl = null; }
      // Chrome/Edge end recognition after a pause even with continuous=true;
      // restart automatically unless the user explicitly stopped listening.
      if (on) { try { rec.start(); return; } catch (err) {} }
      on = false; $("#mic").setAttribute("aria-pressed", "false"); $("#micLabel").textContent = "Start listening";
    };
    try { rec.start(); } catch (err) { $("#micNote").textContent = "Could not start the microphone."; }
  });
  $("#useT").addEventListener("click", function () {
    var t = $$("#tscript p").map(function (p) { return p.textContent; }).join(" ").trim();
    if (!t) return toast("No captions yet"); $("#say").value = t; drawOuts(); toast("Copied into your reply");
  });
  $("#clrT").addEventListener("click", function () { $("#tscript").innerHTML = ""; });

  /* ---------- OCR ---------- */
  var f = null, worker = null, loaded = false, prevUrl = null, ocrCancelled = false;
  var OCR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/bmp", "image/gif"], OCR_MAX = 12 * 1024 * 1024;
  // Upscale small/medium photos and boost contrast before OCR — meaningfully
  // improves recognition of small printed text photographed on a phone.
  function prepImageForOcr(file) {
    return new Promise(function (resolve) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        var scale = img.width < 1600 ? Math.min(2.5, 1800 / Math.max(img.width, 1)) : 1;
        var canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
        var ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
        ctx.filter = "grayscale(100%) contrast(135%)";
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) { resolve(blob || file); }, "image/png");
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }
  function photoProblem(file) {
    if (OCR_TYPES.indexOf(file.type) < 0) return "That file is not a supported image. Use PNG, JPEG, WebP, BMP or GIF.";
    if (file.size > OCR_MAX) return "That photo is larger than 12 MB. Take a smaller photo or lower the camera quality.";
    if (file.size === 0) return "That file is empty.";
    return "";
  }
  function setPhoto(file) {
    var bad = photoProblem(file), note = $("#scanFileNote");
    if (bad) { note.textContent = bad; $("#file").value = ""; return; }
    f = file;
    if (prevUrl) URL.revokeObjectURL(prevUrl);
    prevUrl = URL.createObjectURL(f);
    $("#prev").src = prevUrl; $("#prev").hidden = false; $("#run").disabled = false; $("#scanNote").hidden = true; $("#photoActions").hidden = false;
    $("#scanConf").textContent = ""; note.textContent = "Photo ready: " + (file.name || "camera photo") + ". Press Read the text.";
  }
  // Decode first: an unreadable file is refused here, with a reason, instead of failing inside the OCR engine.
  function decodes(file) {
    return new Promise(function (resolve) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () { URL.revokeObjectURL(url); resolve(img.width > 0 && img.height > 0); };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(false); };
      img.src = url;
    });
  }
  $("#file").addEventListener("change", function () {
    var file = this.files[0], input = this; if (!file) return;
    if (photoProblem(file)) { setPhoto(file); return; }
    decodes(file).then(function (ok) {
      if (!ok) { $("#scanFileNote").textContent = "That file could not be opened as an image. It may be damaged. Try taking the photo again."; input.value = ""; return; }
      setPhoto(file);
    });
  });
  $("#photoReplace").addEventListener("click", function () { $("#file").click(); });
  $("#photoRemove").addEventListener("click", function () {
    f = null; if (prevUrl) { URL.revokeObjectURL(prevUrl); prevUrl = null; }
    $("#prev").removeAttribute("src"); $("#prev").hidden = true; $("#run").disabled = true; $("#photoActions").hidden = true; $("#file").value = ""; $("#scanConf").textContent = "";
    $("#scanFileNote").textContent = "Photo removed. The text below is kept until you clear it.";
  });
  $("#runCancel").addEventListener("click", function () {
    ocrCancelled = true;
    if (worker) { try { worker.terminate(); } catch (e) {} worker = null; }
    $("#progL").textContent = "Cancelled"; var n = $("#scanNote"); n.hidden = false; n.textContent = "Reading was cancelled.";
  });
  $("#run").addEventListener("click", async function () {
    if (!f) return;
    var n = $("#scanNote");
    if (location.protocol === "file:") { n.hidden = false; n.textContent = "Reading photos needs the site served over http. See the README for the one-line command."; return; }
    ocrCancelled = false;
    this.disabled = true; $("#runCancel").hidden = false; $("#prog").hidden = false; n.hidden = true; $("#ocrBar").value = 0; $("#progL").textContent = "Starting"; $("#scanConf").textContent = "";
    try {
      if (!loaded) { await new Promise(function (res, rej) { var s = document.createElement("script"); s.src = "vendor/tesseract/tesseract.min.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); loaded = true; }
      if (!worker) {
        worker = await Tesseract.createWorker("eng", 1, {
          workerPath: "vendor/tesseract/worker.min.js", corePath: "vendor/tesseract/core/", langPath: "vendor/tesseract/lang/",
          logger: function (m) { if (m.progress != null && !ocrCancelled) { $("#ocrBar").value = Math.round(m.progress * 100); $("#progL").textContent = (m.status || "working") + " " + $("#ocrBar").value + "%"; } }
        });
        await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.AUTO, preserve_interword_spaces: "1" });
      }
      var prepped = await prepImageForOcr(f);
      var r = await worker.recognize(prepped);
      if (ocrCancelled) return;
      var txt = (r.data.text || "").replace(/[^\S\r\n]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
      $("#scanText").value = txt; $("#progL").textContent = "Done";
      var conf = Math.round(r.data.confidence || 0);
      if (!txt) { n.hidden = false; n.textContent = "No text found. Try a closer photo in better light."; $("#scanConf").textContent = ""; }
      else {
        $("#scanConf").textContent = "Reading confidence: " + conf + "% (the engine's own estimate, not a guarantee). " + (conf < 60 ? "This photo was hard to read. Check every word before you use it." : conf < 80 ? "Check the text before you send it." : "Still check the text before you send it.");
        if (conf < 60) { n.hidden = false; n.textContent = "This photo was hard to read, so check the text before you use it."; }
      }
    } catch (err) {
      if (ocrCancelled) return;
      console.error("OCR error:", err); n.hidden = false; n.textContent = "Could not read this photo. Make sure the site is served over http and try again."; $("#progL").textContent = "Failed";
    }
    finally { this.disabled = !f; $("#runCancel").hidden = true; setTimeout(function () { $("#prog").hidden = true; }, 1000); }
  });
  $("#scanSay").addEventListener("click", function () { speak($("#scanText").value); });
  $("#scanCopy").addEventListener("click", function () {
    var t = $("#scanText").value; if (!t.trim()) return toast("No text to copy yet");
    var done = function () { toast("Copied"); }, fail = function () { $("#scanText").select(); toast("Press Ctrl+C or long-press to copy the selected text"); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fail); else fail();
  });
  $("#scanSend").addEventListener("click", function () {
    var cid = sendToChat($("#scanText").value, "ocr", $("#scanSendNote"));
    if (cid) toast("Sent as text read from a photo");
  });
  $("#scanUse").addEventListener("click", function () { var t = $("#scanText").value.trim(); if (!t) return toast("No text yet"); $("#say").value = t.replace(/\s+/g, " ").slice(0, 300); drawOuts(); location.hash = "#/dashboard/relay"; });

  /* ---------- phrase board ---------- */
  var TILES = {
    Needs: [["Water", "I need some water", "droplet", CYAN], ["Food", "I am hungry", "utensils", AMBER], ["Toilet", "I need the toilet", "toilet", INK], ["Rest", "I need to rest", "bed", CYAN], ["Medicine", "I need my medicine", "pill", ROSE], ["Doctor", "I need a doctor", "stethoscope", ROSE], ["Call someone", "Please call someone for me", "phone", INK], ["Help", "I need help", "hand-helping", ROSE]],
    Feelings: [["Happy", "I feel happy", "smile", AMBER], ["Sad", "I feel sad", "frown", INK], ["In pain", "I am in pain", "triangle-alert", ROSE], ["Tired", "I feel tired", "bed", CYAN], ["Thank you", "Thank you", "heart", ROSE], ["Yes", "Yes", "thumbs-up", CYAN], ["No", "No", "thumbs-down", ROSE], ["Not sure", "I am not sure", "circle-help", AMBER]],
    Medical: [["Medicine", "I need my medicine", "pill", ROSE], ["Doctor", "I need a doctor", "stethoscope", ROSE], ["Allergy", "I have an allergy", "triangle-alert", AMBER], ["Explain", "Please explain that again", "message-square-text", CYAN]],
    Help: [["Help", "I need help", "hand-helping", ROSE], ["Wait", "Please wait a moment", "clock", AMBER], ["Repeat", "Please say that again", "rotate-ccw", CYAN], ["Slower", "Please speak more slowly", "turtle", CYAN], ["Call", "Please call someone I trust", "phone", INK]],
    "Everyday Conversation": [["Hello", "Hello, how are you?", "smile", CYAN], ["Goodbye", "Goodbye. See you later.", "hand", AMBER], ["My turn", "Is it my turn yet?", "clock", AMBER], ["Write it", "Please write it down for me", "pencil", INK], ["I use AAC", "I use this app to communicate. Please give me a moment.", "message-square-text", ROSE], ["I am Deaf", "I am Deaf. Please face me and type or write.", "ear-off", ROSE], ["Where", "Where do I go next?", "route", INK], ["How much", "How much does it cost?", "circle-help", AMBER]]
  };
  // Custom phrases live only on this device.
  var CUSTOM_KEY = "sangam.phrases", MINE = "My phrases";
  var custom = (function () { try { var a = JSON.parse(localStorage.getItem(CUSTOM_KEY)); return Array.isArray(a) ? a.filter(function (x) { return typeof x === "string" && x.trim(); }).slice(0, 40) : []; } catch (e) { return []; } })();
  function syncCustom() { TILES[MINE] = custom.map(function (t) { return [t.length > 18 ? t.slice(0, 17) + "…" : t, t, "pencil", CYAN]; }); try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom)); } catch (e) {} }
  syncCustom();
  var cat = "Needs", said = [], lastPhraseSend = { text: "", at: 0 };
  function drawCats() { $("#cats").innerHTML = Object.keys(TILES).map(function (c) { return '<button class="cat" type="button" aria-pressed="' + (c === cat) + '" data-c="' + esc(c) + '">' + esc(c) + "</button>"; }).join(""); }
  function drawTiles() {
    var t = TILES[cat];
    if (cat === MINE && !t.length) { $("#tiles").innerHTML = '<p class="note">No phrases of your own yet. Type one in the box above the tiles and press Save as tile.</p>'; return; }
    $("#tiles").innerHTML = t.map(function (x, i) {
      var tile = '<button class="tile" type="button" data-i="' + i + '" aria-label="' + esc(x[0] + ": add phrase " + x[1]) + '" style="--c:' + x[3] + '">' + ic(x[2]) + "<span>" + esc(x[0]) + "</span></button>";
      return cat === MINE ? '<span class="tilewrap">' + tile + '<button class="tile-x" type="button" data-x="' + i + '" aria-label="Remove phrase: ' + esc(x[1]) + '">×</button></span>' : tile;
    }).join("");
  }
  function drawSaid() { var has = !!$("#phraseDraft").value.trim(); $("#pSpeak").disabled = !has; $("#pBack").disabled = !said.length; $("#pSendChat").disabled = !has; }
  $("#cats").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; cat = b.dataset.c; drawCats(); drawTiles(); });
  $("#tiles").addEventListener("click", function (e) {
    var x = e.target.closest("button[data-x]");
    if (x) { custom.splice(+x.dataset.x, 1); syncCustom(); drawTiles(); $("#pNote").textContent = "Phrase removed."; return; }
    var b = e.target.closest("button"); if (!b) return; var t = TILES[cat][+b.dataset.i]; said.push(t[1]); $("#phraseDraft").value = said.join(" "); drawSaid(); speak(t[1]);
  });
  $("#addPhrase").addEventListener("click", function () {
    var v = $("#customPhrase").value.trim(); if (!v) { $("#pNote").textContent = "Type a phrase first."; return; }
    if (custom.indexOf(v) >= 0) { $("#pNote").textContent = "That phrase is already saved."; return; }
    custom.push(v); syncCustom(); drawCats(); drawTiles(); $("#customPhrase").value = ""; $("#pNote").textContent = "Saved to My phrases on this device.";
  });
  $("#pSpeak").addEventListener("click", function () { speak($("#phraseDraft").value); });
  $("#pBack").addEventListener("click", function () { said.pop(); $("#phraseDraft").value = said.join(" "); drawSaid(); });
  $("#pClear").addEventListener("click", function () { said = []; $("#phraseDraft").value = ""; drawSaid(); });
  $("#phraseDraft").addEventListener("input", function () { said = []; drawSaid(); });
  $("#pSendChat").addEventListener("click", function () {
    var t = $("#phraseDraft").value.trim(), n = $("#pNote"), btn = this;
    if (!t) return;
    // Duplicate guard: the same text twice within 10 s needs a second, deliberate press.
    if (t === lastPhraseSend.text && Date.now() - lastPhraseSend.at < 10000 && btn.dataset.again !== "1") {
      btn.dataset.again = "1"; btn.textContent = "Send again anyway"; n.textContent = "You just sent this exact message. Press the button again only if you mean to send it twice.";
      setTimeout(function () { btn.dataset.again = ""; btn.textContent = "Send to chat"; }, 6000); return;
    }
    var cid = sendToChat(t, "phrase", n);
    if (cid) { lastPhraseSend = { text: t, at: Date.now() }; btn.dataset.again = ""; btn.textContent = "Send to chat"; said = []; $("#phraseDraft").value = ""; drawSaid(); }
  });
  $("#pToMessage").addEventListener("click", function () { var t = $("#phraseDraft").value.trim(); if (!t) return toast("Build a message first"); $("#messageDraft").value = t; updateMessageCount(); location.hash = "#/dashboard/messages"; setTimeout(function () { $("#messageDraft").focus(); }, 0); });

  /* ---------- message composer ---------- */
  function updateMessageCount() { $("#messageCount").textContent = $("#messageDraft").value.length + " / 1000"; }
  function msgConn() {
    var n = $("#msgConn"); if (!n) return;
    n.textContent = chatActive() ? "Connected to a chat session." : "No active chat session. Messages you write stay as a draft on this device.";
  }
  function addMessageActivity(direction, text, cid) {
    var item = document.createElement("article"); item.className = "message-bubble " + direction; if (cid) item.dataset.cid = cid;
    var p = document.createElement("p"); p.textContent = text;
    var time = document.createElement("time"); time.textContent = (direction === "sent" ? "You · " : "Incoming · ") + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    item.appendChild(p); item.appendChild(time);
    if (direction === "sent") { var st = document.createElement("span"); st.className = "mstate"; st.textContent = " · " + STATE_TEXT.sending; item.appendChild(st); }
    var thread = $("#messageThread"); if (thread.querySelector(".message-empty")) thread.textContent = ""; thread.appendChild(item); thread.scrollTop = thread.scrollHeight;
  }
  $("#messageDraft").addEventListener("input", updateMessageCount);
  $("#messageClear").addEventListener("click", function () { $("#messageDraft").value = ""; updateMessageCount(); $("#messageDraft").focus(); });
  $("#messageForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var text = $("#messageDraft").value.trim(); if (!text) return toast("Write a message before sending");
    if (!chatActive()) { msgConn(); toast("No chat session. Your draft is kept."); return; }
    var cid = window.SangamChat.send(text, { source: "typed" });
    if (cid) { addMessageActivity("sent", text, cid); $("#messageDraft").value = ""; updateMessageCount(); } else { toast("Could not send. Your draft is kept."); }
  });
  window.addEventListener("sangam:chat-state", function (e) {
    var d = e.detail || {}, item = d.cid && document.querySelector('#messageThread [data-cid="' + d.cid + '"]'); if (!item) return;
    var st = item.querySelector(".mstate"); if (!st) return;
    st.textContent = " · " + (STATE_TEXT[d.state] || ""); item.dataset.state = d.state;
    var old = item.querySelector("button"); if (old) old.remove();
    if (d.state === "failed") { var b = document.createElement("button"); b.type = "button"; b.className = "btn btn-sm"; b.textContent = "Retry"; b.addEventListener("click", function () { window.SangamChat.retry(d.cid); }); item.appendChild(b); }
  });
  window.addEventListener("sangam:chat-message", function (e) { var d = e.detail || {}; if (d.direction === "received" && d.text) addMessageActivity("received", d.text); });
  window.addEventListener("sangam:chat-status", msgConn);
  window.addEventListener("hashchange", msgConn);

  /* ---------- nav and routing ---------- */
  var scrim = document.createElement("div"); scrim.className = "scrim"; document.body.appendChild(scrim);
  scrim.addEventListener("click", function () { closeAll(); });
  function closeAll() { $("#dashMenu").hidden = true; $("#dashBtn").setAttribute("aria-expanded", "false"); $("#nav").classList.remove("open"); $("#burger").setAttribute("aria-expanded", "false"); scrim.classList.remove("on"); }
  $("#dashBtn").addEventListener("click", function (e) {
    e.stopPropagation();
    var open = $("#dashMenu").hidden;
    $("#dashMenu").hidden = !open; this.setAttribute("aria-expanded", String(open)); scrim.classList.toggle("on", open);
  });
  $("#burger").addEventListener("click", function () { var o = $("#nav").classList.toggle("open"); this.setAttribute("aria-expanded", String(o)); });
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".drop") && !$("#dashMenu").hidden) { $("#dashMenu").hidden = true; $("#dashBtn").setAttribute("aria-expanded", "false"); }
    if (e.target.closest("#nav a")) closeAll();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      var menuWasOpen = !$("#dashMenu").hidden;
      var navWasOpen = $("#nav").classList.contains("open");
      if (menuWasOpen) {
        $("#dashMenu").hidden = true;
        $("#dashBtn").setAttribute("aria-expanded", "false");
        if (!navWasOpen) scrim.classList.remove("on");
        $("#dashBtn").focus();
      } else if (navWasOpen) {
        closeAll();
        $("#burger").focus();
      }
    }
  });

  var IDS = ["overview"].concat(FEAT.map(function (x) { return x.id; }));
  // Sign in, onboarding, the four role dashboards, help and the policy pages are drawn by assets/account.js into #acct.
  var ACCT_RE = /^#\/(signin|register|verify|forgot|reset|role|onboarding|me|help|privacy|terms)(\/|$)/;
  function route() {
    var h = location.hash || "#/", dash = h.indexOf("#/dashboard") === 0, acct = ACCT_RE.test(h);
    var acctEl = $("#acct"); if (acctEl) acctEl.hidden = !acct;
    $("#home").hidden = dash || acct; $("#dash").hidden = !dash; closeAll();
    if (acct) { return; }
    if (dash) {
      var p = h.split("/")[2] || "overview"; if (IDS.indexOf(p) < 0 || (SHOWN.length < FEAT.length && p !== "overview" && !SHOWN.some(function (x) { return x.id === p; }))) p = "overview";
      $$(".panel").forEach(function (el) { el.hidden = el.dataset.p !== p; });
      $$("#tabs a").forEach(function (a) { a.dataset.p === p ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"); });
      var f = FEAT.filter(function (x) { return x.id === p; })[0];
      $("#dashTitle").textContent = f ? f.n : "Your communication space";
      document.title = (f ? f.n : "Dashboard") + " | Sangam";
      window.scrollTo(0, 0);
      if (p === "relay") drawOuts();
    } else {
      document.title = "Sangam | One conversation. Many ways to take part.";
      var id = h.replace(/^#\/?/, ""), el = id && document.getElementById(id);
      if (el) setTimeout(function () { el.scrollIntoView(); }, 0); else window.scrollTo(0, 0);
    }
  }
  window.addEventListener("hashchange", route);
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) $$("#nav > a").forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + en.target.id); }); });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["about", "how", "impact"].forEach(function (id) { io.observe(document.getElementById(id)); });
  }

  /* ---------- init ---------- */
  build(); drawJacks(); runCables(); drawPause(); drawCats(); drawTiles(); drawSaid(); applyProfile(); route(); msgConn();

  /* ---------- shared API for Person 5 modules (connect / learn / assist) ----------
     Small, surgical export so the add-on modules reuse the same helpers, icons,
     toast, speech and the live access profile instead of duplicating them. */
  /* ---------- status announcements, with a user-chosen level ----------
     info = routine progress, important = errors and things that need action, alert = alarms and emergencies.
     Level "all" says everything, "important" skips routine progress, "alerts" says only alarms and emergencies. */
  var ANN_RANK = { info: 0, important: 1, alert: 2 }, ANN_MIN = { all: 0, important: 1, alerts: 2 };
  function announceOK(level) { return (ANN_RANK[level] != null ? ANN_RANK[level] : 0) >= (ANN_MIN[P.announce || "all"] || 0); }
  function announce(msg, level, target) {
    level = level || "info";
    if (!msg || !announceOK(level)) return false;
    var el = target || document.getElementById(level === "alert" ? "sangamAlert" : "sangamLive");
    if (!el) return false;
    el.textContent = ""; setTimeout(function () { el.textContent = msg; }, 30);
    return true;
  }

  window.Sangam = {
    setFeatures: setFeatures,
    route: route,
    features: function () { return FEAT.map(function (f) { return { id: f.id, n: f.n, i: f.i, c: f.c, d: f.d }; }); },
    announce: announce,
    announceOK: announceOK,
    applyProfile: applyProfile,
    ic: ic,
    esc: esc,
    toast: toast,
    speak: speak,
    stop: stopSpeaking,
    repeat: repeatLast,
    voices: function () { return cachedVoices.slice(); },
    sendToChat: sendToChat,
    chatActive: chatActive,
    stateText: STATE_TEXT,
    canBuzz: canBuzz,
    braille: braille,
    brailleDetail: brailleDetail,
    pattern: pattern,
    profile: P,
    save: save,
    $: $,
    $$: $$
  };
  try { window.dispatchEvent(new Event("sangam:ready")); } catch (e) {}
})();
