/*
 * SANGAM translation client + language capability table.
 *
 * Real translation happens on the server (server/translate.js) through a
 * provider whose credentials live in the server's environment. This file never
 * holds a key and never produces a translation by itself: if the server says it
 * is not configured, the interface says so and offers nothing fake.
 *
 * Four separate abilities are reported per language, because a language can
 * work for one and not another:
 *   recognition (speech to text), translation, synthesis (text to speech),
 *   and rendering (the device has a font that can draw the script).
 */
(function () {
  "use strict";
  var SG = window.Sangam || {};
  var $ = SG.$, esc = SG.esc;
  function P() { return SG.profile || {}; }

  var LANGS = [
    { code: "en-IN", base: "en", name: "English (India)", script: "Latin" },
    { code: "en-US", base: "en", name: "English (US)", script: "Latin" },
    { code: "en-GB", base: "en", name: "English (UK)", script: "Latin" },
    { code: "hi-IN", base: "hi", name: "Hindi", script: "Devanagari" },
    { code: "or-IN", base: "or", name: "Odia", script: "Odia" }
  ];
  function lang(code) { return LANGS.filter(function (l) { return l.code === code; })[0] || LANGS[0]; }

  var caps = null; // /api/capabilities, loaded once
  var capsPromise = null;
  function loadCaps() {
    if (!capsPromise) {
      capsPromise = fetch("/api/capabilities").then(function (r) { return r.json(); }).then(function (j) { caps = j; return j; }).catch(function () { caps = { translation: { configured: false, provider: "none", message: "Could not reach the server." }, rtc: { iceServers: [] } }; return caps; });
    }
    return capsPromise;
  }

  function synthState(l) {
    var vs = (SG.voices && SG.voices()) || [];
    if (!window.speechSynthesis) return { ok: false, text: "this browser cannot speak" };
    var match = vs.filter(function (v) { return String(v.lang || "").toLowerCase().slice(0, 2) === l.base; }).length;
    return match ? { ok: true, text: "a voice is installed" } : { ok: false, text: vs.length ? "no " + l.name.split(" ")[0] + " voice is installed on this device" : "no voices reported yet" };
  }
  function recogState(l) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return { ok: false, text: "this browser has no speech recognition" };
    if (l.base === "en") return { ok: null, text: "offered by Chrome/Edge; not tested here" };
    if (l.base === "hi") return { ok: null, text: "offered by Chrome/Edge for Hindi; not tested here" };
    return { ok: null, text: "not known to be offered; you will see a message if the browser refuses" };
  }
  function transState(l) {
    var t = caps && caps.translation;
    if (!t) return { ok: null, text: "checking…" };
    if (!t.configured) return { ok: false, text: "not configured on this server" };
    if (!t.languages) return { ok: null, text: "provider is set up but does not report which languages it covers" };
    return t.languages.indexOf(l.base) >= 0 ? { ok: true, text: "the provider reports it supports this language" } : { ok: false, text: "the provider does not list this language" };
  }
  function describe(code) {
    var l = lang(code);
    return { lang: l, recognition: recogState(l), translation: transState(l), synthesis: synthState(l), rendering: l.script === "Latin" ? { ok: true, text: "Latin script" } : { ok: null, text: "needs a " + l.script + " font on your device; if you see boxes, install one" } };
  }
  function mark(s) { return s.ok === true ? "yes" : s.ok === false ? "no" : "unknown"; }
  function renderNote() {
    var n = $("#langNote"); if (!n) return;
    var d = describe(P().lang || "en-IN");
    n.innerHTML = "<b>" + esc(d.lang.name) + ":</b> listening (" + mark(d.recognition) + "), translation (" + mark(d.translation) + "), speaking (" + mark(d.synthesis) + "), on-screen script (" + mark(d.rendering) + "). " +
      '<span class="lang-why">' + esc("Listening: " + d.recognition.text + ". Translation: " + d.translation.text + ". Speaking: " + d.synthesis.text + ". Script: " + d.rendering.text + ".") + "</span>";
  }
  var vo = document.getElementById("voiceSel"); // refresh when voices appear
  if (window.speechSynthesis) { try { window.speechSynthesis.addEventListener("voiceschanged", renderNote); } catch (e) {} }
  window.addEventListener("sangam:profile", renderNote);
  loadCaps().then(renderNote);
  renderNote();

  /* ------------------------------------------------------------ API call */
  var ERR = {
    translation_not_configured: "Translation is not set up on this server, so nothing was translated.",
    provider_timeout: "The translation service took too long. Try again.",
    provider_unreachable: "The translation service could not be reached.",
    provider_error: "The translation service returned an error.",
    provider_bad_response: "The translation service sent an answer SANGAM could not read.",
    rate_limited: "Too many translation requests. Wait a moment.",
    forbidden: "Translation is only available inside an active chat session.",
    bad_request: "There is nothing to translate."
  };
  function translate(text, source, target) {
    var C = window.SangamChat, id = C && C.identity && C.identity();
    if (!id || !id.pid) return Promise.reject(new Error("Join a chat session first. Translation is only available inside one."));
    return fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: id.sessionId, pid: id.pid, pkey: id.pkey, text: text, source: source || "", target: target }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (b) { if (!r.ok) { var e = new Error(ERR[b.error] || b.message || "Translation failed."); e.code = b.error; throw e; } return b; }); });
  }
  window.SangamTranslate = { translate: translate, languages: LANGS, describe: describe, capabilities: loadCaps, errors: ERR };

  /* ------------------------------------------------------------ chat UI */
  function optList(sel, withAuto) {
    return (withAuto ? '<option value="">Auto-detect</option>' : "") + LANGS.filter(function (l, i, a) { return a.findIndex(function (x) { return x.base === l.base; }) === i; }).map(function (l) { return '<option value="' + l.code + '"' + (sel === l.code ? " selected" : "") + ">" + esc(l.name.replace(/ \(.*\)/, "")) + "</option>"; }).join("");
  }

  window.addEventListener("sangam:chat-ready", function (e) {
    var extra = e.detail && e.detail.extra; if (!extra) return;
    var root = e.detail.root;
    extra.insertAdjacentHTML("beforeend",
      '<div class="chat-trans"><p class="note chat-trans-state" role="status">Translation: checking…</p>' +
      '<label class="sw"><input type="checkbox" class="trans-auto"><span class="tr" aria-hidden="true"></span>Translate incoming messages into my language</label>' +
      '<details class="trans-out"><summary>Translate before sending</summary>' +
      '<div class="trans-grid">' +
      '<label>I write in <select class="trans-src">' + optList("", true) + "</select></label>" +
      '<label>Translate to <select class="trans-tgt">' + optList("hi-IN", false) + "</select></label>" +
      '<label class="wide">Original text<textarea class="trans-orig" rows="2" maxlength="1000"></textarea></label>' +
      '<div class="row wide"><button class="btn btn-sm trans-go" type="button">Translate</button></div>' +
      '<label class="wide">Translation (you can edit it before sending)<textarea class="trans-result" rows="2" maxlength="1000"></textarea></label>' +
      '<div class="row wide"><button class="btn btn-fill btn-sm trans-send" type="button" disabled>Send translation</button><button class="btn btn-sm trans-send-orig" type="button">Send original only</button></div>' +
      '<p class="note trans-note wide" role="status"></p></div></details></div>');
    var q = function (s) { return root.querySelector(s); };
    var state = q(".chat-trans-state"), autoCb = q(".trans-auto");
    var provider = "";
    function refresh() {
      loadCaps().then(function (c) {
        var t = c.translation || {};
        provider = t.provider || "";
        state.textContent = t.configured ? "Translation is on (provider: " + t.provider + "). Machine translation can be wrong; check important messages." : "Translation is not set up on this server, so these controls will not translate anything. " + (t.message || "");
        autoCb.disabled = !t.configured;
        q(".trans-go").disabled = !t.configured;
      });
    }
    refresh();
    autoCb.addEventListener("change", function () { P().autoTranslate = this.checked; SG.save(); });
    autoCb.checked = !!P().autoTranslate;

    var tgtSel = q(".trans-tgt"), res = q(".trans-result"), note = q(".trans-note"), orig = q(".trans-orig"), sendBtn = q(".trans-send");
    function syncLang() { res.setAttribute("lang", tgtSel.value); }
    tgtSel.addEventListener("change", function () { syncLang(); sendBtn.disabled = true; });
    orig.addEventListener("input", function () { sendBtn.disabled = true; });
    res.addEventListener("input", function () { sendBtn.disabled = !res.value.trim(); });
    syncLang();
    q(".trans-go").addEventListener("click", function () {
      var t = orig.value.trim(); if (!t) { note.textContent = "Write the original text first."; return; }
      note.textContent = "Translating…"; sendBtn.disabled = true;
      translate(t, q(".trans-src").value, tgtSel.value).then(function (r) {
        res.value = r.text; sendBtn.disabled = !r.text.trim();
        note.textContent = r.unchanged ? "Source and target language are the same, so the text is unchanged." : "Translated by " + r.provider + ". Read it, edit it if needed, then send.";
      }, function (err) { note.textContent = err.message; });
    });
    sendBtn.addEventListener("click", function () {
      var C = window.SangamChat, t = res.value.trim(); if (!t || !C) return;
      var cid = C.send(t, { source: "translated", orig: orig.value.trim(), lang: (q(".trans-src").value || "und").slice(0, 8) || undefined });
      note.textContent = cid ? "Sent the translation. The other person sees your original text too." : "Not connected, so nothing was sent. Your text is kept.";
      if (cid) { orig.value = ""; res.value = ""; sendBtn.disabled = true; }
    });
    q(".trans-send-orig").addEventListener("click", function () {
      var C = window.SangamChat, t = orig.value.trim(); if (!t || !C) { note.textContent = "Write the original text first."; return; }
      var cid = C.send(t, { source: "typed" });
      note.textContent = cid ? "Sent the original text." : "Not connected, so nothing was sent. Your text is kept.";
      if (cid) { orig.value = ""; }
    });
  });

  // Incoming: translate into THIS device's language, on request or automatically.
  window.addEventListener("sangam:chat-message", function (e) {
    var d = e.detail || {}; if (d.direction !== "received" || !d.id || d.kind === "emergency") return;
    var li = document.querySelector('.chat-log li[data-id="' + d.id + '"]'); if (!li) return;
    loadCaps().then(function (c) {
      var t = c.translation || {}; if (!t.configured) return;
      var target = P().lang || "en-IN", box = li.querySelector(".msg-b");
      var btn = document.createElement("button"); btn.type = "button"; btn.className = "chip-btn msg-tr"; btn.textContent = "Translate to " + lang(target).name.replace(/ \(.*\)/, "");
      var out = document.createElement("span"); out.className = "msg-trans"; out.hidden = true;
      function run() {
        btn.disabled = true; out.hidden = false; out.textContent = "Translating…";
        translate(d.text, "", target).then(function (r) {
          out.setAttribute("lang", lang(target).base);
          out.textContent = "";
          var strong = document.createElement("b"); strong.textContent = "Translated to " + lang(target).name.replace(/ \(.*\)/, "") + ": "; out.appendChild(strong);
          out.appendChild(document.createTextNode(r.text));
          var small = document.createElement("small"); small.textContent = " (machine translation by " + r.provider + (r.unchanged ? "; same language, unchanged" : "") + ")"; out.appendChild(small);
          btn.hidden = true;
        }, function (err) { out.textContent = err.message; btn.disabled = false; });
      }
      btn.addEventListener("click", run);
      box.appendChild(btn); box.appendChild(out);
      if (P().autoTranslate) run();
    });
  });
})();
