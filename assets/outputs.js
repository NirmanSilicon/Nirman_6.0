/*
 * SANGAM outputs: receive-side rendering that follows THIS device's profile.
 *
 *  - SangamOut.deliver(message, ctx)   called by the chat for every received message
 *  - Semantic haptic patterns (YES, NO, HELP, EMERGENCY, INFORMATION, MESSAGE RECEIVED,
 *    MESSAGE SENT, CONNECTION LOST) with a test / stop UI in the Access profile
 *  - Braille preview card (honest about what it is) and a physical-display adapter boundary
 *  - Access-profile gating: an input mode that is switched off says so, and can be switched on
 *
 * The profile is read from window.Sangam.profile (this device only). Nothing here sends
 * profile data anywhere.
 */
(function () {
  "use strict";
  var SG = window.Sangam || {};
  var $ = SG.$, $$ = SG.$$, esc = SG.esc, ic = SG.ic;
  function P() { return SG.profile || { inm: [], outm: [] }; }
  function has(list, id) { return (list || []).indexOf(id) >= 0; }
  var canBuzz = typeof navigator.vibrate === "function";

  /* ---------------------------------------------------------------- haptics */
  var S = 100, L = 400, G = 120; // short pulse, long pulse, gap (ms)
  var PATTERNS = {
    YES: { n: "Yes", d: "Two short pulses.", p: [S, G, S] },
    NO: { n: "No", d: "One long pulse.", p: [L] },
    HELP: { n: "Help", d: "Three short pulses, then one long pulse.", p: [S, G, S, G, S, G * 2, L] },
    EMERGENCY: { n: "Emergency", d: "Four long pulses with short gaps. Repeats the strongest rhythm this device can make.", p: [L, G, L, G, L, G, L] },
    INFORMATION: { n: "Information", d: "One short pulse, then one long pulse.", p: [S, G, L] },
    RECEIVED: { n: "Message received", d: "One long pulse, then one short pulse.", p: [L, G, S] },
    SENT: { n: "Message sent", d: "One very short tick.", p: [60] },
    LOST: { n: "Connection lost", d: "Two long pulses, then one short pulse.", p: [L, G * 2, L, G * 2, S] },
    CALL: { n: "Call incoming", d: "Two long pulses with a long pause between, repeated once.", p: [L, G * 3, L, G * 5, L, G * 3, L] },
    ALERT: { n: "Alert", d: "Five very short pulses.", p: [S, S, S, S, S, S, S, S, S] }
  };
  var ORDER = ["YES", "NO", "HELP", "EMERGENCY", "INFORMATION", "RECEIVED", "SENT", "LOST", "CALL", "ALERT"];

  // Day 2 (Person 3) recorded its own rhythms for these four meanings, verbatim from that build's assets/app.js.
  // They are a genuinely different rhythm, not just a different scale, from SANGAM's own patterns above, so BOTH
  // are kept: a person picks which rhythm set plays for Yes / No / Help / Emergency. Information, Message received,
  // Message sent, Connection lost, Call incoming and Alert only ever existed in SANGAM's set and are unaffected.
  var DAY2_PATTERNS = {
    YES: { n: "Yes", d: "Two short pulses (Day 2 rhythm).", p: [90, 70, 90] },
    NO: { n: "No", d: "Two longer pulses (Day 2 rhythm).", p: [260, 100, 260] },
    HELP: { n: "Help", d: "Two short pulses followed by one longer pulse (Day 2 rhythm).", p: [100, 80, 100, 80, 320] },
    EMERGENCY: { n: "Emergency", d: "Three quick pulses, a longer pause, then two extended pulses (Day 2 rhythm). Repeats the strongest rhythm this device can make.", p: [180, 90, 180, 90, 180, 350, 500, 120, 500] }
  };
  var PRESETS = { sangam: PATTERNS, day2: DAY2_PATTERNS };
  function presetName() { return PRESETS[P().hapPreset] ? P().hapPreset : "sangam"; }
  // The active rhythm for a meaning: Day 2's four, if that preset is chosen and defines this meaning, else SANGAM's.
  function defOf(name) { var preset = PRESETS[presetName()]; return (preset && preset[name]) || PATTERNS[name]; }

  // Pulse length can be scaled (timing only: browsers cannot set vibration strength).
  function scaled(name) {
    var def = defOf(name); if (!def) return null;
    var k = +P().hapScale || 1;
    return def.p.map(function (ms) { return Math.max(20, Math.round(ms * k)); });
  }
  // A person can switch individual meanings off. Emergency cannot be switched off here.
  function patternOn(name) { return name === "EMERGENCY" || (P().hapOff || []).indexOf(name) < 0; }
  function vibrate(name, force) {
    if (!PATTERNS[name] || !canBuzz) return false;
    if (!force && !patternOn(name)) return false;
    try { return navigator.vibrate(scaled(name)) !== false; } catch (e) { return false; }
  }
  function stopVibration() { if (canBuzz) { try { navigator.vibrate(0); } catch (e) {} } }

  // Only exact, short, unambiguous texts get a meaning. Everything else is a plain "received".
  function classify(text, kind) {
    if (kind === "emergency") return "EMERGENCY";
    var t = String(text || "").trim().toLowerCase().replace(/[.!]+$/, "");
    if (/^(yes|yeah|yep|ok|okay)$/.test(t)) return "YES";
    if (/^(no|nope)$/.test(t)) return "NO";
    if (/^(help|i need help|please help|i need help please)$/.test(t)) return "HELP";
    if (kind === "clarify") return "INFORMATION";
    return "RECEIVED";
  }

  /* ----------------------------------------------------------- receive side */
  var brailleLog = [];
  function wrapCells(cells, width) {
    var lines = [], cur = "";
    cells.split("⠀").forEach(function (word, i) {
      var w = (i ? "⠀" : "") + word;
      if (cur.length + w.length > width && cur) { lines.push(cur); cur = word; }
      else cur += w;
    });
    if (cur) lines.push(cur);
    return lines;
  }

  /*
   * deliver() presents a received message the way THIS device's profile asks, and returns a Promise for a
   * report of what actually happened: { channels: [...], limited: bool }.
   *   channels  what this device really did: screen, speech, speech-offered, haptic, braille-preview, braille-display
   *   limited   true when the person chose a way of receiving (spoken, vibration, or a physical Braille display they
   *             told us they use) that this device could not deliver. The sender is told "limited", never which way.
   */
  function deliver(m, ctx) {
    ctx = ctx || {};
    var out = P().outm || [], emergency = m.kind === "emergency";
    var rep = { channels: ["screen"], limited: false };
    // Captions: a large, current caption of the newest message.
    if (ctx.caption && has(out, "captions")) {
      ctx.caption.hidden = false;
      ctx.caption.textContent = (m.fromName ? m.fromName + ": " : "") + m.text;
    } else if (ctx.caption) { ctx.caption.hidden = true; }
    // Spoken: a button on the message; automatic speech only when the person enabled it.
    // Emergency messages are spoken by the emergency workflow, never twice.
    if (has(out, "audio")) {
      var canSpeak = !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
      if (!canSpeak) rep.limited = true;
      else {
        if (ctx.li) {
          var b = document.createElement("button"); b.type = "button"; b.className = "chip-btn msg-say"; b.textContent = "Read aloud";
          b.addEventListener("click", function () { SG.speak(m.text); });
          var box = ctx.li.querySelector(".msg-b"); if (box) box.appendChild(b);
        }
        if (ctx.readAloud && !emergency) { SG.speak(m.text); rep.channels.push("speech"); } else rep.channels.push("speech-offered");
      }
    }
    // Braille preview (always on screen) and, when a physical display is connected, the display.
    var brailleWork = Promise.resolve({ sent: 0 });
    if (has(out, "braille")) {
      var d = SG.brailleDetail(m.text);
      brailleLog.unshift({ cells: d.cells, from: m.fromName || "", unsupported: d.unsupported });
      brailleLog = brailleLog.slice(0, 5);
      if (ctx.li) {
        var sp = document.createElement("span"); sp.className = "msg-braille"; sp.setAttribute("aria-hidden", "true"); sp.textContent = d.cells;
        var bx = ctx.li.querySelector(".msg-b"); if (bx) bx.appendChild(sp);
      }
      renderBrailleRecv();
      rep.channels.push("braille-preview");
      brailleWork = sendToDisplays((m.fromName ? m.fromName + ": " : "") + m.text);
    }
    // Haptic.
    if (has(out, "haptic") && !emergency) {
      var name = classify(m.text, m.kind);
      if (patternOn(name)) { if (vibrate(name)) rep.channels.push("haptic"); else rep.limited = true; }
      else rep.channels.push("haptic-off"); // the person switched this meaning off: not a failure
    }
    return brailleWork.then(function (r) {
      if (r.sent > 0) rep.channels.push("braille-display");
      else if (has(out, "braille") && P().brDevice) rep.limited = true; // they told us they use a display and it did not receive this
      return rep;
    });
  }

  // Sound alerts also go to a connected Braille display when the person receives as Braille.
  window.addEventListener("sangam:sound-alert", function (e) {
    var d = e.detail || {};
    if (has(P().outm, "braille")) sendToDisplays((d.test ? "Test alert: " : "Alert: ") + (d.label || "sound") + (d.test ? "" : " detected"));
  });
  window.addEventListener("sangam:chat-state", function (e) {
    if (e.detail && e.detail.state === "sent" && has(P().outm, "haptic")) vibrate("SENT");
  });
  window.addEventListener("sangam:chat-status", function (e) {
    var d = e.detail || {};
    if (d.connected === false && !d.ended && has(P().outm, "haptic")) vibrate("LOST");
  });

  window.SangamOut = { deliver: deliver, patterns: PATTERNS, day2Patterns: DAY2_PATTERNS, activePattern: defOf, presetName: presetName, pattern: scaled, patternOn: patternOn, vibrate: vibrate, stop: stopVibration, classify: classify, canVibrate: canBuzz, wrapCells: wrapCells };

  /* -------------------------------------------------------- Braille adapters */
  // Boundary for a real refreshable display. An adapter is
  //   { id, name, isAvailable() -> bool, connect() -> Promise, sendCells(string) -> Promise, disconnect() }
  // None is bundled: SANGAM does not ship, simulate or pretend to drive Braille hardware.
  var adapters = {}, brState = {};
  function wrapForDisplay(text, a) {
    var d = SG.brailleDetail(text);
    return { lines: wrapCells(d.cells, Math.max(4, +a.cells || 32)), unsupported: d.unsupported };
  }
  // Send text to every CONNECTED display. Resolves { sent, errors }. A display counts as "sent" only when
  // its own sendCells() promise resolved; most displays give no read-back, so this means "handed to the device".
  function sendToDisplays(text) {
    var jobs = [];
    Object.keys(adapters).forEach(function (id) {
      var a = adapters[id], st = brState[id];
      if (!st.connected || P().brSend === false) return;
      var w = wrapForDisplay(text, a);
      if (!w.lines.length) { st.last = "Nothing to show: every character was unsupported."; return; }
      jobs.push(Promise.resolve().then(function () { return a.sendCells(w.lines.join("\n")); }).then(function () {
        st.last = "Sent " + w.lines.length + " line" + (w.lines.length === 1 ? "" : "s") + " at " + new Date().toLocaleTimeString() + (w.unsupported.length ? ". Not shown (no sure Braille form): " + w.unsupported.join(" ") : "") + "."; st.error = ""; return 1;
      }, function (e) {
        st.error = "The display did not accept the text: " + (e && e.message ? e.message : e) + ". It is still shown on screen."; return 0;
      }));
    });
    return Promise.all(jobs).then(function (r) { renderBrDevices(); return { sent: r.reduce(function (a, b) { return a + b; }, 0) }; });
  }
  window.SangamBraille = {
    register: function (a) {
      if (!(a && a.id && typeof a.sendCells === "function")) return false;
      adapters[a.id] = a; brState[a.id] = brState[a.id] || { connected: false, last: "", error: "" };
      renderBrDevices(); return true;
    },
    adapters: function () { return Object.keys(adapters).map(function (k) { return adapters[k]; }); },
    state: function (id) { return brState[id] ? Object.assign({}, brState[id]) : null; },
    // Adapters call this when the device goes away (unplugged, out of range).
    setConnected: function (id, on, why) { if (brState[id]) { brState[id].connected = !!on; if (!on) brState[id].error = why || "The display disconnected."; renderBrDevices(); } },
    send: sendToDisplays,
    detail: function (t) { return SG.brailleDetail(t); }
  };
  function connectDisplay(id) {
    var a = adapters[id], st = brState[id]; if (!a) return;
    st.error = ""; st.last = "Connecting…"; renderBrDevices();
    Promise.resolve().then(function () { return a.connect(); }).then(function () { st.connected = true; st.last = "Connected. Received messages will be sent to it."; renderBrDevices(); }, function (e) { st.connected = false; st.last = ""; st.error = "Could not connect: " + (e && e.message ? e.message : e); renderBrDevices(); });
  }
  function disconnectDisplay(id) {
    var a = adapters[id], st = brState[id]; if (!a) return;
    Promise.resolve().then(function () { return a.disconnect ? a.disconnect() : null; }).then(function () {}, function () {}).then(function () { st.connected = false; st.last = "Disconnected."; renderBrDevices(); });
  }
  function testDisplay(id) {
    var a = adapters[id], st = brState[id]; if (!a || !st.connected) return;
    var w = wrapForDisplay("Sangam test", a);
    Promise.resolve().then(function () { return a.sendCells(w.lines.join("\n")); }).then(function () { st.error = ""; st.last = "Test text sent at " + new Date().toLocaleTimeString() + ". Check the display yourself: SANGAM cannot read it back."; renderBrDevices(); }, function (e) { st.error = "Test failed: " + (e && e.message ? e.message : e); renderBrDevices(); });
  }
  function renderBrDevices() {
    var box = $("#brDevices"); if (!box) return;
    var ids = Object.keys(adapters), note = $("#brDev");
    if (!ids.length) { box.innerHTML = ""; return; }
    if (note) note.hidden = true;
    box.innerHTML = '<h4 class="pbox-h">Braille displays</h4><ul class="br-devs">' + ids.map(function (id) {
      var a = adapters[id], st = brState[id], avail = typeof a.isAvailable === "function" ? !!a.isAvailable() : true;
      return '<li class="br-dev" data-id="' + esc(id) + '"><div><b>' + esc(a.name || id) + '</b> <span class="stat ' + (st.connected ? "implemented-and-browser-tested" : "not-implemented") + '">' + (!avail ? "Not supported in this browser" : st.connected ? "Connected" : "Not connected") + "</span>" +
        '<span class="note" role="status">' + esc(st.error || st.last || "") + "</span></div>" +
        '<div class="row">' +
        (st.connected ? '<button class="btn btn-sm" type="button" data-brdev="test">Send test text</button><button class="btn btn-sm" type="button" data-brdev="disconnect">Disconnect</button>' : '<button class="btn btn-sm" type="button" data-brdev="connect"' + (avail ? "" : " disabled") + ">Connect</button>") +
        "</div></li>";
    }).join("") + "</ul>";
  }

  /* ------------------------------------------------------------- profile UI */
  function buildCards() {
    var host = $("#profileExtra"); if (!host) return;
    var rows = ORDER.map(function (k) {
      var d = defOf(k), isDay2Only = k in DAY2_PATTERNS, bars = d.p.map(function (ms, i) { return i % 2 === 0 ? '<i class="' + (ms > 150 ? "l" : "s") + '"></i>' : '<i class="' + (ms > 200 ? "w" : "g") + '"></i>'; }).join("");
      var locked = k === "EMERGENCY";
      return '<li class="hp-row" data-hprow="' + k + '"><div><b>' + esc(d.n) + "</b><span class=\"note\">" + esc(d.d) + (locked ? " Always on." : "") + (isDay2Only && presetName() === "day2" ? " Using the Day 2 (Person 3) rhythm; switch Pattern style to SANGAM to hear the original rhythm instead." : "") + '</span></div><div class="rhy" aria-hidden="true">' + bars + '</div>' +
        '<label class="hp-on"><input type="checkbox" data-hpon="' + k + '"' + (patternOn(k) ? " checked" : "") + (locked ? " disabled" : "") + ' aria-label="Use the ' + esc(d.n) + ' pattern"><span>On</span></label>' +
        '<button class="btn btn-sm" type="button" data-hp="' + k + '"' + (canBuzz ? "" : " disabled") + ' aria-label="Test ' + esc(d.n) + ' pattern">Test</button></li>';
    }).join("");
    host.innerHTML =
      '<div class="pbox wide" id="hapticCard"><h3 class="pbox-h">Haptic patterns</h3>' +
      '<p class="note" id="hapSupport" role="status">' + (canBuzz ? "This device can vibrate. Patterns change timing only; browsers cannot set vibration strength, so there is no intensity control." : "This device or browser cannot vibrate (iPhone Safari and most desktop browsers do not support it). The patterns are described in words so you can still learn them. Nothing important is ever sent by vibration alone.") + "</p>" +
      '<div class="row hp-scale"><label for="hapPreset">Pattern style for Yes / No / Help / Emergency</label><select id="hapPreset"><option value="sangam">SANGAM (default)</option><option value="day2">Day 2 (Person 3)</option></select></div>' +
      '<p class="note">Two people on this build recorded rhythms for Yes, No, Help and Emergency independently; they feel different, not just longer or shorter, so SANGAM keeps both rather than picking one. This only changes those four; the other patterns below are unaffected.</p>' +
      '<div class="row hp-scale"><label for="hapScale">Pulse length</label><select id="hapScale"><option value="0.7">Shorter</option><option value="1">Normal</option><option value="1.5">Longer</option><option value="2">Much longer</option></select></div>' +
      '<ul class="hp-list">' + rows + '</ul><div class="row"><button class="btn btn-sm" id="hapStop" type="button"' + (canBuzz ? "" : " disabled") + ">Stop vibration</button></div></div>" +
      '<div class="pbox wide" id="brailleCard"><h3 class="pbox-h">Braille preview</h3>' +
      '<p class="note">An on-screen preview of <b>uncontracted (Grade 1) English Braille</b>, drawn with Unicode dots. It is <b>not</b> Grade 2 contracted Braille, not Braille for Hindi or Odia, and <b>not a physical Braille display</b>. Characters it cannot show are listed, never guessed.</p>' +
      '<label for="brIn">Text to preview</label><textarea id="brIn" rows="2" maxlength="300">Hello, I need help.</textarea>' +
      '<div class="row"><label for="brW">Cells per line</label><select id="brW"><option>14</option><option>20</option><option selected>32</option><option>40</option><option>80</option></select><button class="btn btn-sm" id="brCopy" type="button">Copy Braille</button></div>' +
      '<p class="br-out" id="brOut" aria-hidden="true"></p><p class="note" id="brNote" role="status"></p>' +
      '<div id="brRecv" class="br-recv"></div>' +
      '<label class="sw mt"><input type="checkbox" id="brDevice"><span class="tr" aria-hidden="true"></span>I use a refreshable Braille display</label>' +
      '<p class="note">Tells SANGAM that the on-screen preview is not enough for you. If a display is selected but cannot receive a message, the sender is told it may not have reached you in the way you prefer.</p>' +
      '<div id="brDevices"></div><label class="sw mt"><input type="checkbox" id="brSend"><span class="tr" aria-hidden="true"></span>Send received messages to a connected display</label>' +
      '<p class="note" id="brDev"></p></div>';
    var hs = $("#hapScale"); if (hs) { hs.value = String(P().hapScale || 1); hs.addEventListener("change", function () { P().hapScale = +hs.value; SG.save(); }); }
    var hp = $("#hapPreset"); if (hp) { hp.value = presetName(); hp.addEventListener("change", function () { P().hapPreset = hp.value; SG.save(); buildCards(); }); }
    var bd = $("#brDevice"), bsend = $("#brSend");
    if (bd) { bd.checked = !!P().brDevice; bd.addEventListener("change", function () { P().brDevice = bd.checked; SG.save(); }); }
    if (bsend) { bsend.checked = P().brSend !== false; bsend.addEventListener("change", function () { P().brSend = bsend.checked; SG.save(); }); }
    // buildCards() re-runs (e.g. switching the haptic pattern style) and replaces `host`'s contents, but `host`
    // itself is the same node throughout, so these two delegated listeners are bound to it ONCE, not per rebuild.
    if (!host.dataset.wired) {
      host.dataset.wired = "1";
      host.addEventListener("change", function (e) {
        var c = e.target.closest("input[data-hpon]"); if (!c) return;
        var off = (P().hapOff || []).filter(function (x) { return x !== c.dataset.hpon; }); if (!c.checked) off.push(c.dataset.hpon);
        P().hapOff = off; SG.save();
      });
      host.addEventListener("click", function (e) {
        var dv = e.target.closest("button[data-brdev]");
        if (dv) { var id = dv.closest(".br-dev").dataset.id; ({ connect: connectDisplay, disconnect: disconnectDisplay, test: testDisplay })[dv.dataset.brdev](id); return; }
        var t = e.target.closest("button[data-hp]"); if (t) { vibrate(t.dataset.hp, true); return; }
        if (e.target.closest("#hapStop")) stopVibration();
        if (e.target.closest("#brCopy")) copyBraille();
      });
    }
    $("#brIn").addEventListener("input", renderBraille);
    $("#brW").addEventListener("change", renderBraille);
    renderBraille();
    var hasHid = !!navigator.hid, hasSerial = !!navigator.serial, hasBt = !!navigator.bluetooth;
    renderBrDevices();
    $("#brDev").textContent = "Physical Braille display: none connected, and no display driver is bundled. This browser " + ((hasHid || hasSerial || hasBt) ? "can reach USB or Bluetooth devices, but that does not mean any particular display is supported." : "cannot reach USB or Bluetooth devices at all.") + " To add one, register an adapter with SangamBraille.register() and verify it with the checklist in docs/BRAILLE_DEVICE_ADAPTER.md.";
  }
  function renderBraille() {
    var inp = $("#brIn"); if (!inp) return;
    var d = SG.brailleDetail(inp.value), w = parseInt($("#brW").value, 10) || 32;
    $("#brOut").textContent = wrapCells(d.cells, w).join("\n");
    $("#brNote").textContent = d.unsupported.length ? "Not shown (no sure Braille form in this preview): " + d.unsupported.map(function (c) { return "“" + c + "”"; }).join(" ") + "." : (inp.value.trim() ? "Every character was converted." : "");
  }
  function copyBraille() {
    var t = $("#brOut").textContent; if (!t) return SG.toast("Nothing to copy");
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { SG.toast("Braille copied"); }, function () { SG.toast("Copy was blocked by the browser"); });
    else SG.toast("This browser cannot copy automatically");
  }
  function renderBrailleRecv() {
    var box = $("#brRecv"); if (!box) return;
    box.innerHTML = brailleLog.length ? '<h4 class="pbox-h">Latest received messages in Braille</h4>' + brailleLog.map(function (b) { return '<p class="br-out" aria-hidden="true">' + esc(b.cells) + "</p>"; }).join("") : "";
  }

  /* ------------------------------------------------------- input-mode gating */
  var GATES = [
    { need: "voice", sel: "#mic", label: "Voice input", box: ".box" },
    { need: "camera", sel: "#file", label: "Photo input", box: ".box" },
    { need: "text", sel: "#messageForm", label: "Text input", box: null }
  ];
  function applyGates() {
    var inm = P().inm || [];
    GATES.forEach(function (g) {
      var el = $(g.sel); if (!el) return;
      var box = g.box ? el.closest(g.box) : el;
      if (!box) return;
      var gate = box.previousElementSibling && box.previousElementSibling.classList.contains("gate") && box.previousElementSibling.dataset.need === g.need ? box.previousElementSibling : null;
      var off = !has(inm, g.need);
      box.hidden = off;
      if (off && !gate) {
        gate = document.createElement("div"); gate.className = "gate"; gate.dataset.need = g.need;
        gate.innerHTML = "<p><b>" + esc(g.label) + " is off in your Access profile.</b></p>";
        var btn = document.createElement("button"); btn.type = "button"; btn.className = "btn btn-sm"; btn.textContent = "Turn on " + g.label.toLowerCase();
        btn.addEventListener("click", function () { var c = $('#inChips input[value="' + g.need + '"]'); if (c && !c.checked) c.click(); applyGates(); var f = box.querySelector("button, textarea, input"); if (f) f.focus(); });
        gate.appendChild(btn);
        box.parentNode.insertBefore(gate, box);
      }
      if (!off && gate) gate.remove();
    });
  }

  // Switch input and switch scanning are one thing: choosing one sets the other.
  document.addEventListener("change", function (e) {
    var chip = e.target.closest && e.target.closest('#inChips input[value="symbols"]');
    if (chip) { P().scanOn = chip.checked; SG.save(); var c = $("#scanOn"); if (c) c.checked = chip.checked; }
    if (e.target && e.target.id === "scanOn") {
      var sym = $('#inChips input[value="symbols"]');
      if (sym && sym.checked !== e.target.checked) sym.click(); // goes through the normal chip handler
    }
    applyGates();
  });
  window.addEventListener("sangam:profile", applyGates);

  buildCards();
  // The "Switch" input mode is the single source of truth for scanning.
  P().scanOn = has(P().inm, "symbols");
  if ($("#scanOn")) $("#scanOn").checked = P().scanOn;
  applyGates();
})();
