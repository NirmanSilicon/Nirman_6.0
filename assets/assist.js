/*
 * SANGAM — Person 5 · Feature 3: Human assistance / volunteer requests
 *
 * Honest status: a request only shows "accepted" after a real volunteer action.
 * Volunteer help is clearly distinguished from qualified ISL interpretation.
 * Only minimal information is collected; no personal contact details are stored.
 */
(function () {
  "use strict";
  var SG = window.Sangam || {};
  var $ = SG.$ || function (s, r) { return (r || document).querySelector(s); };
  var ic = SG.ic || function (n) { return '<svg class="icon" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; };
  var esc = SG.esc || function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var toast = SG.toast || function () {};

  function api(path, opts) {
    opts = opts || {};
    var headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    return fetch(path, Object.assign({}, opts, { headers: headers })).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (b) { if (!r.ok) { var e = new Error(b.message || b.error || r.status); e.status = r.status; throw e; } return b; });
    });
  }
  var REQ_KEY = "sangam.assist.req";
  var VOL_IDENT_KEY = "sangam.assist.volIdent";  // { volunteerId, volunteerKey, displayName }
  function getReq() { try { return JSON.parse(localStorage.getItem(REQ_KEY) || "null"); } catch (e) { return null; } }
  function setReq(v) { try { v ? localStorage.setItem(REQ_KEY, JSON.stringify(v)) : localStorage.removeItem(REQ_KEY); } catch (e) {} }
  function getVol() { try { return JSON.parse(localStorage.getItem(VOL_IDENT_KEY) || "null"); } catch (e) { return null; } }
  function setVol(v) { try { v ? localStorage.setItem(VOL_IDENT_KEY, JSON.stringify(v)) : localStorage.removeItem(VOL_IDENT_KEY); } catch (e) {} }

  // Ensure this browser has a provisioned volunteer identity. Returns {volunteerId, volunteerKey, displayName, languages, categories, availability}.
  function ensureVol(displayName) {
    var v = getVol();
    if (v && v.volunteerId && v.volunteerKey) {
      if (displayName && displayName !== v.displayName) {
        // Fire-and-forget rename; keep old name until round-trips.
        api("/api/assist/volunteer", { method: "PUT", headers: volHeaders(v), body: JSON.stringify({ displayName: displayName }) })
          .then(function (res) { v.displayName = res.displayName; v.languages = res.languages; v.categories = res.categories; v.availability = res.availability; setVol(v); }).catch(function () {});
      }
      return Promise.resolve(v);
    }
    return api("/api/assist/volunteer", { method: "POST", body: JSON.stringify({ displayName: displayName || "Volunteer" }) })
      .then(function (res) { setVol(res); return res; });
  }
  function volHeaders(v) { return { "X-Volunteer-Id": v.volunteerId, "X-Volunteer-Key": v.volunteerKey }; }

  var CATS = [
    ["language", "Language assistance", "languages"],
    ["communication", "Communication support", "message-circle"],
    ["accessibility", "Accessibility guidance", "accessibility"],
    ["interpreter", "Sign-language help (volunteer, not a certified interpreter)", "hand"]
  ];
  var METHODS = ["Text chat", "Voice call", "Video call", "In person", "Any"];
  var AVAIL_OPTS = ["available", "busy", "offline"];
  var pollTimer = null, mode = "request";

  function gotoJoin(url) {
    if (!url) return;
    var h = url.indexOf("#") >= 0 ? url.slice(url.indexOf("#")) : url;
    location.hash = h;
  }

  function render() {
    var root = $("#assistRoot");
    if (!root) return;
    root.innerHTML =
      '<div class="assist-switch" role="tablist" aria-label="Assistance mode">' +
        '<button class="seg on" role="tab" data-mode="request" aria-selected="true">' + ic("hand-helping") + "I need help</button>" +
        '<button class="seg" role="tab" data-mode="volunteer" aria-selected="false">' + ic("heart-handshake") + "I'm a volunteer</button>" +
      "</div>" +
      '<p class="assist-disclaimer">' + ic("info") + "Volunteers are helpful people, not certified professionals. For legal, medical or official settings, ask for a qualified interpreter." +
      "</p>" +
      '<div id="assistBody"></div>';
    root.querySelector(".assist-switch").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-mode]"); if (!b) return;
      mode = b.dataset.mode;
      root.querySelectorAll(".seg").forEach(function (x) { var on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-selected", String(on)); });
      draw();
    });
    draw();
  }

  function draw() {
    stopPoll();
    if (mode === "request") drawRequest();
    else drawVolunteer();
  }

  /* ---------------- Requester side ---------------- */
  function drawRequest() {
    var existing = getReq();
    if (existing) { drawStatus(existing); return; }
    $("#assistBody").innerHTML =
      '<form class="box assist-form" id="reqForm">' +
        "<h3>Request assistance</h3>" +
        '<label for="aCat">Type of assistance</label>' +
        '<div class="assist-cats" id="aCat">' +
          CATS.map(function (c, i) { return '<label class="radio-card"><input type="radio" name="cat" value="' + c[0] + '"' + (i === 0 ? " checked" : "") + ">" + ic(c[2]) + "<span>" + esc(c[1]) + "</span></label>"; }).join("") +
        "</div>" +
        '<div class="assist-two">' +
          "<div><label for=\"aLang\">Preferred language</label><input id=\"aLang\" class=\"in\" type=\"text\" maxlength=\"40\" placeholder=\"e.g. Hindi, Odia, ISL\" value=\"\"></div>" +
          "<div><label for=\"aMethod\">Preferred method</label><select id=\"aMethod\" class=\"in\">" + METHODS.map(function (m) { return '<option value="' + esc(m) + '">' + esc(m) + "</option>"; }).join("") + "</select></div>" +
        "</div>" +
        '<label for="aDesc">Briefly, what do you need? <span class="opt">(optional)</span></label>' +
        '<textarea id="aDesc" class="in" rows="3" maxlength="400" placeholder="A short description helps a volunteer decide."></textarea>' +
        '<button class="btn btn-fill" type="submit">' + ic("hand-helping") + "Submit request</button>" +
        '<p class="note">We only store what you enter here. No name, phone number or contact details are required.</p>' +
      "</form>";
    $("#reqForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = e.target.querySelector("button[type=submit]"); btn.disabled = true;
      var cat = (document.querySelector('input[name="cat"]:checked') || {}).value;
      var body = { category: cat, language: $("#aLang").value.trim(), method: $("#aMethod").value, description: $("#aDesc").value.trim() };
      if (!body.language) { btn.disabled = false; toast("Please enter a preferred language"); $("#aLang").focus(); return; }
      api("/api/assist/requests", { method: "POST", body: JSON.stringify(body) }).then(function (r) {
        var rec = { id: r.id, claimKey: r.claimKey, category: cat, language: body.language, method: body.method, description: body.description };
        setReq(rec);
        toast("Request submitted");
        drawStatus(rec);
      }).catch(function (err) { btn.disabled = false; toast(err.message || "Could not submit. Is the server running?"); });
    });
  }

  var STATUS_LABEL = {
    pending: ["hourglass", "Pending", "Waiting for a volunteer to accept."],
    accepted: ["check", "Accepted", "A volunteer accepted. Open the conversation to talk."],
    completed: ["badge-check", "Completed", "This request is complete."],
    cancelled: ["x", "Cancelled", "This request was cancelled."]
  };

  function drawStatus(rec) {
    var body = $("#assistBody");
    function paint(data) {
      var st = data.status || "pending";
      var L = STATUS_LABEL[st] || STATUS_LABEL.pending;
      body.innerHTML =
        '<div class="box assist-status" data-st="' + st + '">' +
          '<div class="as-head"><span class="as-badge">' + ic(L[0]) + esc(L[1]) + "</span>" +
            '<span class="as-cat">' + esc(labelFor(rec.category)) + "</span></div>" +
          "<p class=\"as-msg\">" + esc(L[2]) + "</p>" +
          '<dl class="as-meta"><div><dt>Language</dt><dd>' + esc(rec.language) + "</dd></div>" +
            "<div><dt>Method</dt><dd>" + esc(rec.method || "Any") + "</dd></div>" +
            (data.volunteerName ? "<div><dt>Volunteer</dt><dd>" + esc(data.volunteerName) + "</dd></div>" : "") + "</dl>" +
          (rec.description ? '<p class="as-desc">' + esc(rec.description) + "</p>" : "") +
          '<div class="row as-actions">' +
            (st === "accepted" && data.joinUrl ? '<button class="btn btn-fill" id="asJoin" type="button">' + ic("log-in") + "Open conversation</button>" : "") +
            (st === "accepted" ? '<button class="btn btn-sm" id="asDone" type="button">' + ic("check") + "Mark completed</button>" : "") +
            (st === "pending" || st === "accepted" ? '<button class="btn btn-sm" id="asCancel" type="button">' + ic("x") + "Cancel request</button>" : "") +
            (st === "completed" || st === "cancelled" ? '<button class="btn btn-sm" id="asNew" type="button">' + ic("arrow-right") + "New request</button>" : "") +
          "</div>" +
          (st === "pending" ? '<p class="note as-live"><span class="live-pulse" aria-hidden="true"></span>Checking for a volunteer…</p>' : "") +
        "</div>";
      var j = $("#asJoin"); if (j) j.addEventListener("click", function () { gotoJoin(data.joinUrl); });
      var dn = $("#asDone"); if (dn) dn.addEventListener("click", function () {
        // Owner completes with their claimKey (volunteer could also complete
        // from their own tab via volunteerKey; both paths are authorised).
        api("/api/assist/requests/" + rec.id + "/complete", { method: "POST", body: JSON.stringify({ key: rec.claimKey }) }).then(poll).catch(function () {});
      });
      var cancel = $("#asCancel"); if (cancel) cancel.addEventListener("click", function () {
        api("/api/assist/requests/" + rec.id + "/cancel", { method: "POST", body: JSON.stringify({ key: rec.claimKey }) }).then(function () { toast("Request cancelled"); poll(); }).catch(function () {});
      });
      var nw = $("#asNew"); if (nw) nw.addEventListener("click", function () { setReq(null); drawRequest(); });
    }
    function poll() {
      api("/api/assist/requests/" + rec.id + "?key=" + encodeURIComponent(rec.claimKey)).then(function (data) {
        paint(data);
        if (data.status === "pending" || data.status === "accepted") scheduleReqPoll(poll);
        else stopPoll();
      }).catch(function (e) {
        if (e.status === 404) { setReq(null); drawRequest(); }
      });
    }
    paint({ status: "pending" });
    poll();
  }
  function scheduleReqPoll(fn) { stopPoll(); pollTimer = setTimeout(fn, 4000); }

  function labelFor(cat) { var c = CATS.filter(function (x) { return x[0] === cat; })[0]; return c ? c[1] : cat; }

  /* ---------------- Volunteer side ---------------- */
  function drawVolunteer() {
    var v = getVol();
    var initialName = v && v.displayName || "";
    var initialLangs = (v && v.languages && v.languages.join(", ")) || "";
    var initialAvail = (v && v.availability) || "available";
    $("#assistBody").innerHTML =
      '<div class="box vol-id">' +
        '<label for="volName">Your volunteer display name</label>' +
        '<div class="row"><input id="volName" class="in" type="text" maxlength="60" placeholder="e.g. Asha" value="' + esc(initialName) + '" style="flex:1"></div>' +
        '<label for="volLangs">Languages you speak</label>' +
        '<input id="volLangs" class="in" type="text" maxlength="200" placeholder="e.g. English, Hindi, ISL" value="' + esc(initialLangs) + '">' +
        '<label for="volCats">Types of help you can offer</label>' +
        '<div class="assist-cats vol-cats" id="volCats">' +
          CATS.map(function (c) { var checked = v && v.categories && v.categories.indexOf(c[0]) >= 0 ? " checked" : ""; return '<label class="radio-card"><input type="checkbox" name="volcat" value="' + c[0] + '"' + checked + ">" + ic(c[2]) + "<span>" + esc(c[1]) + "</span></label>"; }).join("") +
        "</div>" +
        '<label for="volAvail">Availability</label>' +
        '<select id="volAvail" class="in">' + AVAIL_OPTS.map(function (a) { return '<option value="' + a + '"' + (a === initialAvail ? " selected" : "") + '>' + a.charAt(0).toUpperCase() + a.slice(1) + "</option>"; }).join("") + "</select>" +
        '<button class="btn btn-sm" id="volSave" type="button" style="margin-top:0.5rem">Save profile</button>' +
        '<p class="note">This browser gets a private volunteer key the first time you use the volunteer tab. Open requests refresh automatically. Accepting one opens a live chat with the person.</p>' +
      "</div>" +
      '<div class="vol-list-head"><h3>Open requests</h3><button class="btn btn-sm" id="volRefresh" type="button">' + ic("rotate-ccw") + "Refresh</button></div>" +
      '<div id="volList" class="vol-list" aria-live="polite"><p class="note">Loading…</p></div>';
    $("#volSave").addEventListener("click", function () {
      var name = $("#volName").value.trim() || "Volunteer";
      var langs = ($("#volLangs").value || "").split(",").map(function (l) { return l.trim(); }).filter(Boolean);
      var cats = []; document.querySelectorAll('input[name="volcat"]:checked').forEach(function (c) { cats.push(c.value); });
      var avail = $("#volAvail").value || "available";
      saveVolProfile(name, langs, cats, avail);
    });
    $("#volRefresh").addEventListener("click", loadVol);
    // Provision/reuse a volunteer identity, THEN fetch.
    ensureVol(initialName).then(loadVol).catch(function () {
      var el = $("#volList"); if (el) el.innerHTML = '<p class="note">Could not provision a volunteer identity. Is the server running?</p>';
    });
  }

  function saveVolProfile(name, languages, categories, availability) {
    var v = getVol();
    if (!v || !v.volunteerId) return ensureVol(name).then(function () { toast("Saved"); });
    return api("/api/assist/volunteer", {
      method: "PUT",
      headers: volHeaders(v),
      body: JSON.stringify({ displayName: name, languages: languages, categories: categories, availability: availability })
    }).then(function (res) {
      v.displayName = res.displayName;
      v.languages = res.languages;
      v.categories = res.categories;
      v.availability = res.availability;
      setVol(v);
      toast("Profile saved");
    }).catch(function () { toast("Could not save."); });
  }

  function loadVol() {
    var v = getVol();
    if (!v) return;
    api("/api/assist/requests", { headers: volHeaders(v) }).then(function (d) {
      var list = d.requests || [];
      var el = $("#volList");
      if (!el) return;
      if (!list.length) { el.innerHTML = '<p class="note vol-empty">' + ic("check") + "No open requests right now. Thank you for being here.</p>"; }
      else {
        el.innerHTML = list.map(function (r) {
          var accepted = r.status === "accepted";
          return '<article class="vol-card" data-id="' + r.id + '">' +
            '<div class="vc-top"><span class="vc-cat">' + esc(labelFor(r.category)) + "</span>" +
              '<span class="vc-age">' + timeAgo(r.createdAt) + "</span></div>" +
            '<dl class="vc-meta"><div><dt>Language</dt><dd>' + esc(r.language) + "</dd></div><div><dt>Method</dt><dd>" + esc(r.method) + "</dd></div></dl>" +
            (r.description ? '<p class="vc-desc">' + esc(r.description) + "</p>" : '<p class="vc-desc muted">No extra details.</p>') +
            (accepted
              ? '<p class="note vc-taken">' + ic("check") + "Accepted by " + esc(r.volunteerName || "a volunteer") + ".</p>"
              : '<div class="row"><button class="btn btn-sm btn-fill" data-act="accept" data-id="' + r.id + '">' + ic("check") + "Accept</button>" +
                '<button class="btn btn-sm" data-act="decline" data-id="' + r.id + '">' + ic("x") + "Decline</button></div>") +
            "</article>";
        }).join("");
      }
      stopPoll(); pollTimer = setTimeout(loadVol, 5000);
    }).catch(function () {
      var el = $("#volList"); if (el) el.innerHTML = '<p class="note">Could not load requests. Is the server running?</p>';
    });
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    var id = b.dataset.id;
    var v = getVol(); if (!v) return;
    if (b.dataset.act === "decline") {
      api("/api/assist/requests/" + id + "/decline", { method: "POST", headers: volHeaders(v), body: "{}" })
        .then(function () { loadVol(); })
        .catch(function () { toast("Could not decline."); });
      return;
    }
    if (b.dataset.act === "accept") {
      var name = ($("#volName") && $("#volName").value.trim()) || v.displayName || "Volunteer";
      b.disabled = true;
      api("/api/assist/requests/" + id + "/accept", {
        method: "POST", headers: volHeaders(v),
        body: JSON.stringify({ volunteerName: name })
      }).then(function (res) {
        toast("Accepted. Opening the conversation…");
        // The volunteer is the "host" of this derived chat. Stash the hostKey
        // so when the overlay chat opens via the hash route, connect.js can
        // pick it up from sessionStorage.
        try { if (res.hostKey && res.joinUrl) {
          var m = res.joinUrl.match(/#\/join\/([^/]+)\/([^/?&]+)/);
          if (m) sessionStorage.setItem("sangam.hostkey." + m[1], res.hostKey);
        } } catch (e) {}
        gotoJoin(res.joinUrl);
      }).catch(function (err) { b.disabled = false; toast(err.message || "Could not accept (maybe already taken)."); loadVol(); });
    }
  });

  function timeAgo(ts) {
    var s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return s + "s ago";
    var m = Math.floor(s / 60); if (m < 60) return m + "m ago";
    return Math.floor(m / 60) + "h ago";
  }
  function stopPoll() { if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; } }

  /* ---------------- lifecycle ---------------- */
  function onHash() {
    var active = (location.hash || "").indexOf("#/dashboard/assist") === 0;
    if (active) { if (!$("#assistRoot").children.length) render(); else draw(); }
    else stopPoll();
  }
  function boot() {
    if ($("#assistRoot") && !$("#assistRoot").children.length && (location.hash || "").indexOf("#/dashboard/assist") === 0) render();
    window.addEventListener("hashchange", onHash);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
