/*
 * SANGAM — Person 5 · Feature 2: SANGAM Learn
 * Public education on accessibility, communication differences and etiquette.
 *
 * Honesty rule: this module does NOT invent sign-language gestures or show
 * made-up hand illustrations. For Indian Sign Language (ISL) it explains what a
 * phrase is for and points to official, verified resources (ISLRTC "Sign Learn"
 * app and the Government of India ISL dictionary) for the exact, correct signs.
 */
(function () {
  "use strict";
  var SG = window.Sangam || {};
  var $ = SG.$ || function (s, r) { return (r || document).querySelector(s); };
  var ic = SG.ic || function (n) { return '<svg class="icon" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; };
  var esc = SG.esc || function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  // Verified, official learning resources (links open in a new tab).
  var RES = {
    islrtc: "https://islrtc.nic.in/",
    signLearn: "https://play.google.com/store/apps/details?id=com.ISLRTC.SignLearn",
    dict: "https://data.gov.in/catalog/indian-sign-language-dictionary"
  };

  var CATS = [
    { id: "all", n: "All topics" },
    { id: "sign", n: "ISL basics" },
    { id: "aware", n: "Disability awareness" },
    { id: "etiquette", n: "Communication etiquette" }
  ];

  // ---- ISL basic expressions (described by purpose, not by invented gesture) ----
  var SIGNS = [
    ["Greetings", "Hello / Namaste", "A friendly opening. In ISL, greetings are often paired with a smile and eye contact. Look up the exact movement in the official dictionary before you rely on it."],
    ["Yes", "Yes", "A short, clear confirmation. ISL also uses head movement and facial expression to carry agreement."],
    ["No", "No", "A clear refusal or negative. Facial expression matters as much as the hand in ISL."],
    ["Thank you", "Thank you", "Gratitude. A warm expression reads as sincere; keep eye contact."],
    ["Please", "Please", "Softens a request. Pair it with a calm, open posture."],
    ["Help", "Help / I need help", "Signals you need assistance. Useful to recognise quickly in a clinic or public desk."],
    ["Sorry", "Sorry", "An apology or 'excuse me'. Facial expression shows whether it is light or serious."],
    ["Understand", "I understand / I don't understand", "Confirms or flags comprehension. Flagging 'I don't understand' early keeps a conversation honest."],
    ["Wait", "Please wait", "Asks for a moment. Pairs well with SANGAM's 'Please wait' turn control."],
    ["Emergency", "Emergency / Call someone", "An urgent call for help. Learn to recognise this on sight, not just to produce it."]
  ];

  // ---- Disability awareness (plain, accurate, non-clinical) ----
  var AWARE = [
    ["eye", "Visual disabilities", "Ranges from low vision to blindness. Many people use screen readers, magnification or Braille. Describe things in words, read text aloud, and do not rely on pointing or 'over there'."],
    ["ear-off", "Hearing disabilities", "Ranges from hard of hearing to Deaf. Some people lip-read, some use sign language, some use captions. Face the person, keep your mouth visible, and use text when speech is not getting through."],
    ["message-square-text", "Speech and communication disabilities", "A person may have a lot to say and need another way to say it — typing, a phrase board, or AAC. Give them time and do not finish their sentences."],
    ["hand", "Motor disabilities", "Affects movement and fine control. Touch targets should be large, and typing or tapping may be slower. Never grab a person's device or hands to 'help' them type."],
    ["circle-help", "Cognitive accessibility", "Covers memory, attention and processing differences. Use short sentences, plain words, and one idea at a time. Offer information in more than one form."],
    ["layers", "Multiple and overlapping needs", "Many people live with more than one of the above. The right support is the combination the person chooses, not a label you assign."],
    ["split", "Deafblindness", "Combined hearing and vision loss. Communication often uses tactile methods and depends on the individual. This needs co-design with the person and is not something to improvise."]
  ];

  // ---- Communication etiquette ----
  var ETIQ = [
    ["badge-check", "Communicate respectfully", "Talk to the person directly, not to their companion or interpreter. Use a normal tone. Ask what works for them instead of guessing."],
    ["ear-off", "With someone Deaf or hard of hearing", "Get their attention first. Face them in good light, keep your mouth visible, and do not shout. If speech is not landing, type or write — SANGAM's chat and captions are built for exactly this."],
    ["eye", "With someone who is blind", "Say who you are when you arrive and when you leave. Describe what matters in words. Offer your arm rather than taking theirs, and read out anything printed."],
    ["message-square-text", "With a non-speaking person", "Give them time to type or build a phrase. Do not finish sentences for them or rush a reply. Treat a typed or AAC message as their own words."],
    ["route", "Don't assume the method", "Two people with the same condition may communicate completely differently. Ask 'What works best for you?' and follow their lead."],
    ["hand-helping", "Ask before helping", "Offer, then wait for a yes. Pushing a wheelchair, grabbing an arm or taking a phone without asking removes a person's control. Consent first, every time."]
  ];

  function signCard(s) {
    return '<details class="learn-item" data-text="' + esc((s[0] + " " + s[1] + " " + s[2]).toLowerCase()) + '">' +
      '<summary><span class="li-ic">' + ic("languages") + "</span><span class=\"li-h\"><b>" + esc(s[1]) + '</b><small>' + esc(s[0]) + " · Indian Sign Language</small></span>" + ic("chevron-down") + "</summary>" +
      '<div class="li-body"><p>' + esc(s[2]) + "</p>" +
      '<p class="li-res">' + ic("info") + 'See the exact sign in the official <a href="' + RES.signLearn + '" target="_blank" rel="noopener">Sign Learn app</a> or the <a href="' + RES.dict + '" target="_blank" rel="noopener">Government of India ISL dictionary</a>.</p></div></details>';
  }
  function infoCard(cat, row) {
    return '<details class="learn-item" data-text="' + esc((row[1] + " " + row[2]).toLowerCase()) + '">' +
      '<summary><span class="li-ic">' + ic(row[0]) + "</span><span class=\"li-h\"><b>" + esc(row[1]) + "</b><small>" + (cat === "aware" ? "Disability awareness" : "Etiquette") + "</small></span>" + ic("chevron-down") + "</summary>" +
      '<div class="li-body"><p>' + esc(row[2]) + "</p></div></details>";
  }

  function render() {
    var root = $("#learnRoot");
    if (!root) return;
    root.innerHTML =
      '<div class="learn-banner">' + ic("graduation-cap") +
        "<div><b>Learn to meet people where they are.</b>" +
        '<span>Short topics on sign-language basics, disability awareness and respectful communication. Built from public guidance and official resources.</span></div>' +
      "</div>" +
      '<div class="learn-controls">' +
        '<div class="learn-search"><label class="vis-hidden" for="learnQ">Search topics</label>' + ic("search") +
        '<input id="learnQ" type="search" placeholder="Search topics…" autocomplete="off"></div>' +
        '<div class="learn-filters" role="group" aria-label="Filter topics">' +
          CATS.map(function (c, i) { return '<button class="chip-btn' + (i === 0 ? " on" : "") + '" type="button" data-cat="' + c.id + '" aria-pressed="' + (i === 0) + '">' + esc(c.n) + "</button>"; }).join("") +
        "</div>" +
      "</div>" +
      '<section class="learn-group" data-group="sign"><h3 class="learn-gh">' + ic("languages") + "Learn basic Indian Sign Language</h3>" +
        '<p class="learn-note">SANGAM does not animate signs itself. These cards explain each phrase and link to the official, verified ISL resources for the correct movement.</p>' +
        '<div class="learn-list">' + SIGNS.map(signCard).join("") + "</div>" +
        '<p class="learn-res-row">Official resources: ' +
          '<a href="' + RES.islrtc + '" target="_blank" rel="noopener">ISLRTC</a> · ' +
          '<a href="' + RES.signLearn + '" target="_blank" rel="noopener">Sign Learn app</a> · ' +
          '<a href="' + RES.dict + '" target="_blank" rel="noopener">ISL dictionary (data.gov.in)</a></p>' +
      "</section>" +
      '<section class="learn-group" data-group="aware"><h3 class="learn-gh">' + ic("accessibility") + "Disability awareness</h3>" +
        '<div class="learn-list">' + AWARE.map(function (r) { return infoCard("aware", r); }).join("") + "</div></section>" +
      '<section class="learn-group" data-group="etiquette"><h3 class="learn-gh">' + ic("heart-handshake") + "Communication etiquette</h3>" +
        '<div class="learn-list">' + ETIQ.map(function (r) { return infoCard("etiquette", r); }).join("") + "</div></section>" +
      '<p class="learn-empty" hidden>No topics match that search.</p>';

    var q = $("#learnQ");
    q.addEventListener("input", applyFilter);
    root.querySelector(".learn-filters").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-cat]"); if (!b) return;
      root.querySelectorAll(".learn-filters button").forEach(function (x) { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", String(x === b)); });
      applyFilter();
    });
  }

  function applyFilter() {
    var root = $("#learnRoot");
    var cat = (root.querySelector(".learn-filters .on") || {}).dataset ? root.querySelector(".learn-filters .on").dataset.cat : "all";
    var term = ($("#learnQ").value || "").trim().toLowerCase();
    var anyShown = false;
    root.querySelectorAll(".learn-group").forEach(function (g) {
      var groupCat = g.dataset.group;
      var catOk = cat === "all" || cat === groupCat;
      var shownInGroup = 0;
      g.querySelectorAll(".learn-item").forEach(function (it) {
        var textOk = !term || (it.dataset.text || "").indexOf(term) >= 0;
        var show = catOk && textOk;
        it.hidden = !show;
        if (show) { shownInGroup++; anyShown = true; }
      });
      g.hidden = !catOk || shownInGroup === 0;
    });
    root.querySelector(".learn-empty").hidden = anyShown;
  }

  // The community dashboard (assets/account.js) builds its lessons from this same content, so there is one source of truth.
  window.SangamLearn = { RES: RES, SIGNS: SIGNS, AWARE: AWARE, ETIQ: ETIQ };

  function boot() {
    if ($("#learnRoot") && !$("#learnRoot").children.length) render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
