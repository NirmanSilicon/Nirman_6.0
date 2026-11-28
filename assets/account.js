/*
 * SANGAM account layer, part 1 of 2: API client, state, routing and gating, header navigation, the screens before a
 * dashboard (sign in, register, verify, forgot/reset password, choose a role, onboarding) and device preference sync.
 * Part 2 (account-dash.js) draws the four role dashboards, settings, notifications and help.
 *
 * Rule for this file: the server is the source of truth. Nothing about who someone is, what role they hold or whether a
 * change was saved comes from localStorage. The page shows "Saved" only after the server confirmed it.
 */
(function () {
  "use strict";
  var SG = window.Sangam || {};
  var AX = window.SangamAX = { views: {}, S: null };
  var esc = SG.esc || function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var VIEW = document.getElementById("acctView");
  if (!VIEW) return;

  /* ------------------------------------------------------------------ icons: a few the sprite does not have */
  (function addIcons() {
    var sprite = document.querySelector("body > svg"); if (!sprite) return;
    var P = {
      "log-out": '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
      "user": '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
      "bookmark": '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
      "calendar": '<rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',
      "circle-check": '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
      "alert-circle": '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
      "home": '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'
    };
    Object.keys(P).forEach(function (k) { if (!document.getElementById("i-" + k)) sprite.insertAdjacentHTML("beforeend", '<symbol id="i-' + k + '" viewBox="0 0 24 24">' + P[k] + "</symbol>"); });
  })();
  function ic(n) { return '<svg class="icon ax-i" aria-hidden="true" focusable="false"><use href="#i-' + n + '"/></svg>'; }

  /* ------------------------------------------------------------------ state and API */
  var S = AX.S = { ready: false, signedIn: false, me: null, requiresVerification: true, dev: null, returnTo: "", notif: { unread: 0, list: [] }, seq: 0, bounce: 0 };
  function api(method, url, body) {
    return fetch(url, { method: method, credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Sangam-Client": "1" }, body: body === undefined ? undefined : JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, status: r.status, data: d || {} }; }); })
      .catch(function () { return { ok: false, status: 0, data: { error: "network", message: "We couldn't reach the server. Check your connection and try again." } }; });
  }
  AX.api = api;
  function human(r) { return (r.data && r.data.message) || "Something went wrong. Please try again."; }
  AX.human = human;

  function refreshMe() {
    return api("GET", "/api/me").then(function (r) {
      if (r.ok && r.data.signedIn) { S.signedIn = true; S.me = r.data.me; } else { S.signedIn = false; S.me = null; }
      if (r.data && r.data.requiresVerification !== undefined) S.requiresVerification = r.data.requiresVerification;
      applyAccountToPage(); renderNav(); setWorkspaces();
      return S.me;
    });
  }
  AX.refreshMe = refreshMe;
  function complete() { return !!(S.me && S.me.verified !== undefined && (S.me.verified || !S.requiresVerification) && S.me.role && S.me.onboarding && S.me.onboarding.completed); }
  AX.complete = complete;

  /* ------------------------------------------------------------------ small UI kit (one source for every screen) */
  var LABEL_EXTRA = "";
  function fld(o) {
    var id = o.id, desc = [];
    if (o.hint) desc.push(id + "-h"); if (o.err) desc.push(id + "-e");
    var tag = o.req ? '<span class="ax-tag req">(required)</span>' : (o.noTag ? "" : '<span class="ax-tag">(optional)</span>');
    var attrs = ' id="' + id + '" name="' + (o.name || id) + '" class="ax-in"' + (o.req ? ' required aria-required="true"' : "") + (desc.length ? ' aria-describedby="' + desc.join(" ") + '"' : "") + (o.err ? ' aria-invalid="true"' : "") + (o.auto ? ' autocomplete="' + o.auto + '"' : "") + (o.max ? ' maxlength="' + o.max + '"' : "") + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : "") + (o.inputmode ? ' inputmode="' + o.inputmode + '"' : "") + (o.extra || "");
    var input = o.textarea ? "<textarea" + attrs + ' rows="' + (o.rows || 4) + '">' + esc(o.value || "") + "</textarea>" : o.html ? o.html : '<input type="' + (o.type || "text") + '"' + attrs + ' value="' + esc(o.value == null ? "" : o.value) + '">';
    return '<div class="ax-f"><label for="' + id + '">' + esc(o.label) + " " + tag + "</label>" + (o.hint ? '<p class="ax-hint" id="' + id + '-h">' + o.hint + "</p>" : "") + input + (o.err ? '<p class="ax-err" id="' + id + '-e">' + ic("alert-circle") + "<span>" + esc(o.err) + "</span></p>" : "") + "</div>";
  }
  function pwfld(o) {
    var id = o.id, desc = []; if (o.hint) desc.push(id + "-h"); if (o.err) desc.push(id + "-e"); if (o.reqs) desc.push(id + "-r");
    return '<div class="ax-f"><label for="' + id + '">' + esc(o.label) + ' <span class="ax-tag req">(required)</span></label>' + (o.hint ? '<p class="ax-hint" id="' + id + '-h">' + o.hint + "</p>" : "") +
      '<div class="ax-pw"><input class="ax-in" id="' + id + '" name="' + id + '" type="password" required aria-required="true" autocomplete="' + (o.auto || "current-password") + '" maxlength="128"' + (desc.length ? ' aria-describedby="' + desc.join(" ") + '"' : "") + (o.err ? ' aria-invalid="true"' : "") + '>' +
      '<button class="ax-eye" type="button" data-act="eye" data-for="' + id + '" aria-pressed="false" aria-label="Show ' + esc(o.label.toLowerCase()) + '">Show</button></div>' +
      (o.reqs ? '<ul class="ax-reqs" id="' + id + '-r" aria-label="Password requirements">' + pwReqs("") + "</ul>" : "") +
      (o.err ? '<p class="ax-err" id="' + id + '-e">' + ic("alert-circle") + "<span>" + esc(o.err) + "</span></p>" : "") + "</div>";
  }
  function pwReqs(v) {
    var rules = [["At least 10 characters", v.length >= 10], ["At least one letter", /[A-Za-z]/.test(v)], ["At least one number", /[0-9]/.test(v)]];
    return rules.map(function (r) { return '<li data-ok="' + r[1] + '"><span class="m" aria-hidden="true">' + (r[1] ? "✓" : "•") + "</span><span>" + r[0] + '<span class="ax-sr">, ' + (r[1] ? "met" : "not met yet") + "</span></span></li>"; }).join("");
  }
  function chips(o) {
    var cls = o.radio ? "ax-chip radio" : "ax-chip";
    return '<fieldset class="ax-fs"><legend>' + esc(o.legend) + (o.tag === false ? "" : ' <span class="ax-tag">(' + (o.req ? "choose one" : "choose any") + ")</span>") + "</legend>" + (o.hint ? '<p class="ax-hint">' + o.hint + "</p>" : "") + '<div class="ax-chips">' +
      o.items.map(function (it) { var on = o.radio ? o.sel === it[0] : (o.sel || []).indexOf(it[0]) >= 0; return '<label class="' + cls + '"><input type="' + (o.radio ? "radio" : "checkbox") + '" name="' + o.name + '" value="' + it[0] + '"' + (on ? " checked" : "") + "><span>" + (it[2] ? ic(it[2]) : "") + esc(it[1]) + "</span></label>"; }).join("") + "</div></fieldset>";
  }
  function note(kind, html, icon) { return '<div class="ax-note ' + (kind || "") + '" ' + (kind === "bad" ? 'role="alert"' : "") + ">" + ic(icon || (kind === "bad" ? "alert-circle" : kind === "ok" ? "circle-check" : "info")) + "<div>" + html + "</div></div>"; }
  function loading(msg) { return '<div class="ax-loading" role="status"><span>' + esc(msg || "Loading…") + "</span></div>"; }
  function errState(msg, retry) { return '<div class="ax-errstate" role="alert">' + ic("alert-circle") + "<h3>We couldn't load this</h3><p>" + esc(msg) + "</p>" + (retry ? '<button class="btn btn-sm" type="button" data-act="retry">Try again</button>' : "") + "</div>"; }
  function empty(title, text, actionHtml) { return '<div class="ax-empty">' + ic("sparkles") + "<h3>" + esc(title) + "</h3><p>" + esc(text) + "</p>" + (actionHtml || "") + "</div>"; }
  function errSummary(errs, order) {
    var keys = (order || Object.keys(errs)).filter(function (k) { return errs[k]; });
    if (!keys.length) return "";
    return '<div class="ax-errsum" role="alert" tabindex="-1" id="axErrSum"><h2>Please fix ' + (keys.length === 1 ? "this problem" : "these " + keys.length + " problems") + "</h2><ul>" + keys.map(function (k) { return '<li><a href="#" data-act="focusfield" data-for="' + k + '">' + esc(errs[k]) + "</a></li>"; }).join("") + "</ul></div>";
  }
  function initials(name) { return String(name || "?").trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0] || ""; }).join("").toUpperCase() || "?"; }
  function avatar(profile, big) { return '<span class="ax-avatar' + (big ? " lg" : "") + '" aria-hidden="true">' + (profile && profile.avatar ? '<img alt="" src="' + esc(profile.avatar) + '">' : esc(initials(profile && profile.displayName))) + "</span>"; }
  function fmt(ts) { try { return new Date(ts).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); } catch (e) { return ""; } }
  function formData(form) {
    var o = {}; Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.disabled) return;
      if (el.type === "checkbox") { if (el.name.slice(-2) === "[]") { var k = el.name.slice(0, -2); (o[k] = o[k] || []); if (el.checked) o[k].push(el.value); } else o[el.name] = el.checked; }
      else if (el.type === "radio") { if (el.checked) o[el.name] = el.value; }
      else o[el.name] = el.value;
    }); return o;
  }
  AX.ui = { ic: ic, esc: esc, fld: fld, pwfld: pwfld, pwReqs: pwReqs, chips: chips, note: note, loading: loading, errState: errState, empty: empty, errSummary: errSummary, avatar: avatar, initials: initials, fmt: fmt, formData: formData };
  function toast(m) { if (SG.toast) SG.toast(m); }
  function say(m, level) { if (SG.announce) SG.announce(m, level || "info"); }
  AX.toast = toast; AX.say = say;

  /* ------------------------------------------------------------------ rendering and focus */
  function show(o) {
    VIEW.innerHTML = o.html; document.title = (o.title ? o.title + " | " : "") + "Sangam";
    window.scrollTo(0, 0);
    if (o.wire) o.wire(VIEW);
    var h = VIEW.querySelector("[data-focus]") || VIEW.querySelector("h1");
    if (h) { h.setAttribute("tabindex", "-1"); try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } }
    if (o.title) say(o.title, "info");   // a page change is announced once, politely
  }
  AX.show = show;
  function go(h) { if (location.hash === h) render(); else location.hash = h; }
  AX.go = go;
  function parse() { var h = location.hash || "#/", p = h.replace(/^#\/?/, "").split("?")[0].split("/"); return { name: p[0] || "", a: p[1], b: p[2], c: p[3], hash: h }; }
  AX.parse = parse;

  var PUBLIC_PAGES = ["help", "privacy", "terms"];
  function gate(r) {
    if (PUBLIC_PAGES.indexOf(r.name) >= 0) return null;
    if (!S.signedIn) {
      if (r.name === "verify" && r.a) return null;
      if (["signin", "register", "forgot", "reset"].indexOf(r.name) >= 0) return null;
      S.returnTo = r.hash; return "#/signin";
    }
    var m = S.me;
    if (S.requiresVerification && !m.verified) return r.name === "verify" ? null : "#/verify";
    if (!m.role) return r.name === "role" ? null : "#/role";
    if (!m.onboarding.completed) return r.name === "onboarding" ? null : "#/onboarding";
    if (["signin", "register", "forgot", "role", "onboarding"].indexOf(r.name) >= 0 || (r.name === "verify" && !r.a)) return "#/me";
    return null;
  }
  AX.gate = gate;

  function render() {
    var r = parse(), seq = ++S.seq;
    if (!S.ready) { VIEW.innerHTML = loading("Loading…"); return; }
    var redirect = gate(r);
    if (redirect) { if (location.hash !== redirect) { location.replace(redirect); return; } r = parse(); }
    var fn = AX.views[r.name];
    if (!fn) {
      var fallback = S.signedIn && complete() ? "#/me" : "#/signin";
      // Never redirect to where we already are: that was an endless loop when a view failed to load.
      if (location.hash === fallback || ++S.bounce > 3) { S.bounce = 0; show({ title: "Page not available", html: '<div class="ax-dash"><div class="ax-wrap">' + errState("This page could not be loaded. Reload the page, and if it keeps happening tell whoever runs this server.", true) + "</div></div>" }); return; }
      go(fallback); return;
    }
    S.bounce = 0;
    var out = fn(r);
    Promise.resolve(out).then(function (o) { if (seq === S.seq && o) show(o); });
  }
  AX.render = render;

  /* ------------------------------------------------------------------ header navigation */
  function roleLinks() {
    var role = S.me && S.me.role, L = {
      primary: [["#/me", "Overview"], ["#/me/communicate", "Communicate"], ["#/me/connections", "Connections"]],
      secondary: [["#/me", "Overview"], ["#/me/communicate", "Communicate"], ["#/me/connections", "Connections"]],
      community: [["#/me", "Overview"], ["#/me/learn", "Learn"], ["#/me/progress", "Progress"]],
      interpreter: [["#/me", "Overview"], ["#/me/requests", "Requests"], ["#/me/sessions", "Sessions"]],
    };
    return L[role] || [];
  }
  function renderNav() {
    var nav = document.getElementById("axNav"), pub = document.getElementById("axPub"); if (!nav) return;
    var h = location.hash || "#/";
    if (!S.signedIn) {
      if (pub) pub.hidden = false;
      nav.innerHTML = '<a class="ax-link" href="#/signin"' + (/^#\/signin/.test(h) ? ' aria-current="page"' : "") + ">Sign in</a>" + '<a class="btn btn-fill btn-sm" href="#/register">Get started</a>'; return;
    }
    var m = S.me, full = complete();
    if (pub) pub.hidden = full;      // a signed-in person sees their own navigation, not the marketing links
    var links = full ? roleLinks().map(function (l) { var cur = l[0] === "#/me" ? /^#\/me\/?$/.test(h) : h.indexOf(l[0]) === 0; return '<a class="ax-navlink" href="' + l[0] + '"' + (cur ? ' aria-current="page"' : "") + ">" + l[1] + "</a>"; }).join("") : "";
    var bell = full ? '<a class="ax-bell" href="#/me/notifications" id="axBell" aria-label="Notifications' + (S.notif.unread ? ", " + S.notif.unread + " unread" : "") + '">' + ic("bell") + (S.notif.unread ? '<span class="ax-count" aria-hidden="true">' + (S.notif.unread > 9 ? "9+" : S.notif.unread) + "</span>" : "") + "</a>" : "";
    nav.innerHTML = links + bell +
      '<span class="ax-me"><button type="button" id="axMeBtn" aria-label="' + esc("Account menu, " + (m.profile.displayName || "Account")) + '" aria-expanded="false" aria-haspopup="true" aria-controls="axMeMenu">' + avatar(m.profile) + "<span>" + esc(m.profile.displayName || "Account") + '</span>' + ic("chevron-down") + "</button>" +
      '<div class="ax-menu" id="axMeMenu" hidden><p class="who">' + esc(m.email) + (m.roleLabel ? " · " + esc(m.roleLabel) : "") + "</p>" +
      (full ? '<a href="#/me/settings">' + ic("sliders-horizontal") + "Account settings</a>" : "") + '<a href="#/help">' + ic("circle-help") + "Help</a><hr>" + '<button type="button" data-act="signout">' + ic("log-out") + "Sign out</button></div></span>";
  }
  AX.renderNav = renderNav;
  document.addEventListener("click", function (e) {
    var b = e.target.closest("#axMeBtn"), menu = document.getElementById("axMeMenu");
    if (b && menu) { var open = menu.hidden; menu.hidden = !open; b.setAttribute("aria-expanded", String(open)); if (open) { var f = menu.querySelector("a,button"); if (f) f.focus(); } return; }
    if (menu && !menu.hidden && !e.target.closest("#axMeMenu")) { menu.hidden = true; var bb = document.getElementById("axMeBtn"); if (bb) bb.setAttribute("aria-expanded", "false"); }
  });
  document.addEventListener("keydown", function (e) {
    var menu = document.getElementById("axMeMenu"); if (!menu || menu.hidden) return;
    if (e.key === "Escape") { menu.hidden = true; var b = document.getElementById("axMeBtn"); b.setAttribute("aria-expanded", "false"); b.focus(); }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { var items = [].slice.call(menu.querySelectorAll("a,button")), i = items.indexOf(document.activeElement); e.preventDefault(); items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus(); }
  });

  /* ------------------------------------------------------------------ preferences: server -> this device, and back */
  var SEND_TO_DEV = { type: "text", speak: "voice", voice_to_text: "voice", sign: "camera", assistive: "symbols" };
  var RECV_TO_DEV = { read_text: "captions", captions: "captions", listen: "audio", haptic: "haptic", braille: "braille" };
  var applying = false, syncTimer = null;
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function applyAccountToPage() {
    var root = document.documentElement, rd = S.signedIn && S.me && S.me.role === "primary" ? S.me.roleData : null;
    root.setAttribute("data-ax-theme", rd && rd.display && rd.display.theme === "dark" ? "dark" : "light");
    root.classList.toggle("ax-reduce", !!(rd && rd.navigation && rd.navigation.reducedMotion));
    root.classList.toggle("ax-sr", !!(rd && rd.navigation && rd.navigation.screenReader));
    if (!rd || !S.me.onboarding || !S.me.onboarding.completed || !SG.profile) return;
    var P = SG.profile, d = rd.display || {}, a = rd.audio || {};
    var patch = {
      inm: uniq((rd.send || []).map(function (x) { return SEND_TO_DEV[x]; }).filter(Boolean)),
      outm: uniq((rd.receive || []).map(function (x) { return RECV_TO_DEV[x]; }).filter(Boolean)),
      scale: d.textSize === "xlarge" ? 160 : d.textSize === "large" ? 130 : 100, hc: d.theme === "contrast", rate: a.rate || 1, autoRead: !!a.spokenNotifications,
    };
    if (S.me.profile.language && ["en-IN", "en-US", "en-GB", "hi-IN", "or-IN"].indexOf(S.me.profile.language) >= 0) patch.lang = S.me.profile.language;
    applying = true; try { Object.assign(P, patch); SG.save && SG.save(); SG.applyProfile && SG.applyProfile(); } finally { setTimeout(function () { applying = false; }, 50); }
    try { window.dispatchEvent(new CustomEvent("sangam:account")); } catch (e) {}
  }
  AX.applyAccountToPage = applyAccountToPage;
  // When the person edits the Access profile panel on this device, keep the saved account profile in step.
  window.addEventListener("sangam:profile", function () {
    if (applying || !S.signedIn || !S.me || S.me.role !== "primary" || !complete()) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () {
      var P = SG.profile, rd = S.me.roleData, keepSend = (rd.send || []).filter(function (x) { return !SEND_TO_DEV[x]; }), keepRecv = (rd.receive || []).filter(function (x) { return !RECV_TO_DEV[x]; });
      var send = keepSend.slice(), recv = keepRecv.slice();
      if (P.inm.indexOf("text") >= 0) send.push("type"); if (P.inm.indexOf("voice") >= 0) send.push((rd.send || []).indexOf("speak") >= 0 ? "speak" : "voice_to_text"); if (P.inm.indexOf("camera") >= 0) send.push("sign"); if (P.inm.indexOf("symbols") >= 0) send.push("assistive");
      if (P.outm.indexOf("captions") >= 0) recv.push((rd.receive || []).indexOf("read_text") >= 0 && (rd.receive || []).indexOf("captions") < 0 ? "read_text" : "captions"); if (P.outm.indexOf("audio") >= 0) recv.push("listen"); if (P.outm.indexOf("haptic") >= 0) recv.push("haptic"); if (P.outm.indexOf("braille") >= 0) recv.push("braille");
      var theme = P.hc ? "contrast" : (rd.display && rd.display.theme === "contrast" ? "light" : (rd.display || {}).theme || "light");
      api("PUT", "/api/me/preferences", { send: uniq(send), receive: uniq(recv), display: { textSize: P.scale >= 145 ? "xlarge" : P.scale >= 115 ? "large" : "standard", theme: theme }, audio: { rate: P.rate, spokenNotifications: !!P.autoRead } })
        .then(function (r) { if (r.ok) { S.me = r.data.me; } });
    }, 1200);
  });

  /* ------------------------------------------------------------------ the demo (guest) workspace and the role-filtered workspaces */
  var WORKSPACES = { primary: ["profile", "relay", "scan", "sounds", "sign", "phrases", "messages", "connect", "learn", "assist"], secondary: ["relay", "messages", "connect", "phrases", "learn", "assist"], community: ["learn", "assist"], interpreter: ["relay", "messages", "connect"] };
  function setWorkspaces() { if (!SG.setFeatures) return; var ids = S.signedIn && complete() ? WORKSPACES[S.me.role] : null; SG.setFeatures(ids); decorateDash(); }
  AX.workspaces = WORKSPACES;
  function decorateDash() {
    var dash = document.getElementById("dash"); if (!dash) return;
    var old = document.getElementById("axGuest"); if (old) old.remove();
    var oldTabs = document.getElementById("axDashTabs"); if (oldTabs) oldTabs.remove();
    var tabs = document.getElementById("tabs"), full = S.signedIn && complete();
    if (tabs) tabs.hidden = !!full;
    if (full && AX.tabsFor && tabs) {
      var nav = document.createElement("nav"); nav.id = "axDashTabs"; nav.className = "ax-tabs"; nav.setAttribute("aria-label", "Sections");
      nav.innerHTML = AX.tabsFor(S.me.role, "").html; tabs.parentNode.insertBefore(nav, tabs);
      var cur = (location.hash || "").replace(/^#\/dashboard\/?/, "") || "overview";
      [].forEach.call(nav.querySelectorAll("a"), function (a) { if (a.getAttribute("href").indexOf("#/dashboard/" + cur) === 0 || (cur === "overview" && a.getAttribute("href") === "#/dashboard")) a.setAttribute("aria-current", "page"); });
    } else if (!full) {
      var bar = document.createElement("div"); bar.id = "axGuest"; bar.className = "wrap";
      bar.innerHTML = '<div class="ax-guestbar ax">' + ic("info") + "<span><b>Guest mode.</b> Your settings stay on this device and nothing is saved to an account.</span> " + (S.signedIn ? '<a href="#/onboarding">Finish setting up your account</a>' : '<a href="#/signin">Sign in</a> or <a href="#/register">create an account</a> to keep your preferences.') + "</div>";
      dash.insertBefore(bar, dash.firstChild);
    }
    var t = document.getElementById("heroStart");
    if (t) { var full2 = S.signedIn && complete(); t.setAttribute("href", full2 ? "#/me" : "#/register"); t.firstChild.nodeValue = full2 ? "Open my dashboard" : "Get started"; }
  }
  AX.decorateDash = decorateDash;

  /* ------------------------------------------------------------------ global click handling (data-act) */
  var ACTS = AX.acts = {
    eye: function (el) { var i = document.getElementById(el.dataset.for), on = i.type === "password"; i.type = on ? "text" : "password"; el.textContent = on ? "Hide" : "Show"; el.setAttribute("aria-pressed", String(on)); el.setAttribute("aria-label", (on ? "Hide " : "Show ") + (el.getAttribute("aria-label") || "").replace(/^(Show|Hide) /, "")); },
    focusfield: function (el, e) { e.preventDefault(); var f = document.getElementById(el.dataset.for); if (f) f.focus(); },
    retry: function () { render(); },
    signout: function () { api("POST", "/api/auth/logout").then(function () { S.signedIn = false; S.me = null; S.dev = null; applyAccountToPage(); renderNav(); setWorkspaces(); toast("You have signed out."); say("You have signed out.", "important"); go("#/"); }); },
  };
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]"); if (!el || !document.body.contains(el)) return;
    var fn = ACTS[el.dataset.act]; if (fn) fn(el, e);
  });

  /* ------------------------------------------------------------------ brand panel for the auth screens */
  function authShell(inner, opts) {
    opts = opts || {};
    return '<div class="ax-authbg"><div class="ax-auth"><div class="ax-brand"><p class="ax-kick">Adaptive communication platform</p><p class="ax-brandh">One conversation.<br><em>Many ways</em> to take part.</p>' +
      "<p>Choose how you send, receive and understand a message. SANGAM carries it across.</p>" +
      '<div class="ax-relay" role="img" aria-label="Example: voice goes into SANGAM and comes out as captions"><div class="ax-rnode ax-rin"><small>Input</small><b>Voice</b></div><div class="ax-rcore">SANGAM</div><div class="ax-rnode ax-rout"><small>Output</small><b>Captions</b></div></div><p class="ax-eg">Example, not a live connection</p>' +
      "<ul>" + ["You choose how you send, receive and understand messages.", "Your details stay under your control, and you review before anything is shared.", "Works with screen readers, the keyboard, captions and large text."].map(function (t) { return "<li>" + ic("circle-check") + "<span>" + t + "</span></li>"; }).join("") + "</ul></div>" +
      '<div class="ax-card" role="region" aria-label="' + esc(opts.label || "Account") + '">' + inner + "</div></div></div>";
  }
  var NEXT_AFTER_AUTH = function () { var t = S.returnTo; S.returnTo = ""; return t && !/^#\/(signin|register|verify|forgot|reset)/.test(t) ? t : "#/me"; };

  /* ------------------------------------------------------------------ sign in */
  AX.views.signin = function () {
    function draw(st) {
      var html = authShell('<h1 id="axH" data-focus>Sign in</h1><p class="ax-sub">Welcome back. Sign in to continue where you left off.</p>' +
        '<form id="axForm" novalidate>' + (st.err ? errSummary({ form: st.err }, ["form"]).replace('data-for="form"', 'data-for="email"') : "") +
        fld({ id: "email", label: "Email address", type: "email", value: st.email, req: true, auto: "email", max: 254, err: st.fields && st.fields.email }) +
        pwfld({ id: "password", label: "Password", err: st.fields && st.fields.password }) +
        '<div class="ax-f"><label class="ax-checks" style="display:flex;gap:10px;align-items:center"><input type="checkbox" name="remember" aria-labelledby="remLbl"' + (st.remember ? " checked" : "") + ' style="width:22px;height:22px"> <span id="remLbl">Keep me signed in on this device for 30 days</span></label></div>' +
        '<div class="ax-actions"><button class="btn btn-fill" type="submit" id="axGo"' + (st.busy ? " disabled" : "") + ">" + (st.busy ? "Signing in…" : "Sign in") + '</button><a href="#/forgot" class="grow">Forgot your password?</a></div></form>' +
        '<p class="ax-switch">New to SANGAM? <a href="#/register">Create an account</a></p><p class="ax-guest"><a href="#/dashboard">Continue as a guest</a> (nothing is saved to an account)</p>', { label: "Sign in" });
      show({ html: html, title: "Sign in", wire: function (root) {
        if (st.err) { var s = root.querySelector("#axErrSum"); if (s) s.focus(); }
        root.querySelector("#axForm").addEventListener("submit", function (e) {
          e.preventDefault(); var d = formData(e.target), f = {};
          if (!/^\S+@\S+\.\S+$/.test(d.email.trim())) f.email = "Please enter your email address."; if (!d.password) f.password = "Please enter your password.";
          if (Object.keys(f).length) return draw({ email: d.email, remember: d.remember, fields: f, err: f.email || f.password });
          draw({ email: d.email, remember: d.remember, busy: true });
          api("POST", "/api/auth/login", { email: d.email.trim(), password: d.password, remember: !!d.remember }).then(function (r) {
            if (!r.ok) return draw({ email: d.email, remember: d.remember, err: human(r) });
            S.signedIn = true; S.me = r.data.me; applyAccountToPage(); renderNav(); setWorkspaces(); startPolling();
            say("Signed in. Welcome back, " + S.me.profile.displayName + ".", "important");
            var g = gate({ name: "me", hash: "#/me" }); go(g || NEXT_AFTER_AUTH());
          });
        });
      } });
    }
    draw({});
  };

  /* ------------------------------------------------------------------ register */
  AX.views.register = function () {
    function draw(st) {
      var f = st.fields || {};
      var html = authShell('<h1 id="axH" data-focus>Create your account</h1><p class="ax-sub">It takes a minute. We only ask for what we need, and nothing about accessibility yet.</p>' +
        '<form id="axForm" novalidate>' + errSummary(f, ["name", "email", "password", "password2", "acceptTerms"]) +
        fld({ id: "name", label: "Full name", value: st.name, req: true, auto: "name", max: 80, err: f.name }) +
        fld({ id: "email", label: "Email address", type: "email", value: st.email, req: true, auto: "email", max: 254, err: f.email, hint: "We use it to sign you in and to verify your account." }) +
        pwfld({ id: "password", label: "Password", auto: "new-password", err: f.password, reqs: true }) +
        pwfld({ id: "password2", label: "Confirm password", auto: "new-password", err: f.password2 }) +
        '<div class="ax-f"><label class="ax-checks" style="display:flex;gap:10px;align-items:flex-start"><input type="checkbox" id="acceptTerms" name="acceptTerms" aria-labelledby="termsLbl"' + (st.accept ? " checked" : "") + ' required aria-required="true"' + (f.acceptTerms ? ' aria-invalid="true" aria-describedby="acceptTerms-e"' : "") + ' style="width:22px;height:22px;margin-top:2px"> <span id="termsLbl">I have read and accept the <a href="#/privacy" target="_blank" rel="noopener">privacy policy</a> and the <a href="#/terms" target="_blank" rel="noopener">terms</a> <span class="ax-tag req">(required)</span></span></label>' + (f.acceptTerms ? '<p class="ax-err" id="acceptTerms-e">' + ic("alert-circle") + "<span>" + esc(f.acceptTerms) + "</span></p>" : "") + "</div>" +
        '<div class="ax-actions"><button class="btn btn-fill" type="submit"' + (st.busy ? " disabled" : "") + ">" + (st.busy ? "Creating your account…" : "Create account") + "</button></div></form>" +
        '<p class="ax-switch">Already have an account? <a href="#/signin">Sign in</a></p>', { label: "Create account" });
      show({ html: html, title: "Create account", wire: function (root) {
        if (Object.keys(f).length) { var s = root.querySelector("#axErrSum"); if (s) s.focus(); }
        var pw = root.querySelector("#password"), reqs = root.querySelector("#password-r");
        pw.addEventListener("input", function () { reqs.innerHTML = pwReqs(pw.value); });
        root.querySelector("#axForm").addEventListener("submit", function (e) {
          e.preventDefault(); var d = formData(e.target), er = {};
          if (!d.name.trim()) er.name = "Please enter your full name.";
          if (!/^\S+@\S+\.\S+$/.test(d.email.trim())) er.email = "Please enter a valid email address.";
          if (d.password.length < 10 || !/[A-Za-z]/.test(d.password) || !/[0-9]/.test(d.password)) er.password = "Your password needs at least 10 characters, one letter and one number.";
          if (d.password2 !== d.password) er.password2 = "The two passwords do not match.";
          if (!d.acceptTerms) er.acceptTerms = "Please accept the privacy policy and terms to continue.";
          var keep = { name: d.name, email: d.email, accept: d.acceptTerms };
          if (Object.keys(er).length) return draw(Object.assign(keep, { fields: er }));
          draw(Object.assign(keep, { busy: true }));
          api("POST", "/api/auth/register", { name: d.name, email: d.email.trim(), password: d.password, acceptTerms: true }).then(function (r) {
            if (!r.ok) { var fe = r.data.fields || {}; if (!Object.keys(fe).length) fe.email = human(r); return draw(Object.assign(keep, { fields: fe })); }
            S.signedIn = true; S.me = r.data.me; S.dev = r.data.dev || null; applyAccountToPage(); renderNav(); setWorkspaces();
            say("Account created.", "important"); go(S.requiresVerification && !S.me.verified ? "#/verify" : "#/role");
          });
        });
      } });
    }
    draw({});
  };

  /* ------------------------------------------------------------------ verify email */
  var resendUntil = 0, resendTimer = null;
  AX.views.verify = function (r) {
    if (r.a) {   // arriving from a verification link
      return api("POST", "/api/auth/verify", { token: r.a }).then(function (x) {
        var ok = x.ok, already = ok && x.data.alreadyVerified;
        if (ok && x.data.me) { S.signedIn = true; S.me = x.data.me; applyAccountToPage(); renderNav(); }
        var body = ok ? note("ok", "<b>" + (already ? "This email was already verified." : "Your email is verified.") + "</b> " + (S.signedIn ? "Next, tell us how you will use SANGAM." : "Please sign in to continue.")) : note("bad", "<b>That link did not work.</b> " + esc(human(x)));
        return { title: ok ? "Email verified" : "Verification problem", html: authShell('<h1 id="axH" data-focus>' + (ok ? "Email verified" : "We couldn't verify your email") + "</h1>" + body + '<div class="ax-actions"><a class="btn btn-fill" href="' + (ok && S.signedIn ? "#/role" : "#/signin") + '">' + (ok && S.signedIn ? "Continue" : "Go to sign in") + "</a></div>", { label: "Email verification" }) };
      });
    }
    function draw(st) {
      st = st || {}; var m = S.me, dev = S.dev, left = Math.max(0, Math.ceil((resendUntil - Date.now()) / 1000));
      var html = authShell('<h1 id="axH" data-focus>Verify your email</h1><p class="ax-sub">We need to confirm that <b>' + esc(m.email) + "</b> is yours before you set up your account.</p>" +
        note("warn", "<b>No email has been sent.</b> This server is not connected to an email service yet, so SANGAM cannot send you a message. " + (dev ? "For development you can verify with the link below." : "Ask whoever runs this server to verify your account, or to turn on development verification links.")) +
        (dev ? '<div class="ax-devbox"><b>Development link (not emailed)</b><a class="btn btn-fill btn-sm" href="' + esc(dev.verifyPath) + '">Verify my email now</a></div>' : "") +
        (st.msg ? '<div role="status" style="margin-top:12px">' + st.msg + "</div>" : "") +
        '<div class="ax-actions"><button class="btn btn-sm" type="button" data-act="resend"' + (left ? " disabled" : "") + ">" + (left ? "Ask for a new link in " + left + "s" : "Get a new link") + '</button><button class="btn btn-sm" type="button" data-act="showchange">Use a different email address</button><button class="btn btn-sm grow" type="button" data-act="signout">Sign out</button></div>' +
        (st.change ? '<form id="axChange" novalidate style="margin-top:20px">' + fld({ id: "newEmail", label: "Correct email address", type: "email", req: true, auto: "email", err: st.changeErr }) + '<button class="btn btn-fill btn-sm" type="submit">Save new email</button></form>' : ""), { label: "Email verification" });
      show({ html: html, title: "Verify your email", wire: function (root) {
        clearInterval(resendTimer); if (left) resendTimer = setInterval(function () { if (!document.body.contains(root.querySelector("[data-act=resend]")) || Date.now() > resendUntil) { clearInterval(resendTimer); if (parse().name === "verify" && !parse().a) draw(st); } else { var b = root.querySelector("[data-act=resend]"); if (b) b.textContent = "Ask for a new link in " + Math.max(0, Math.ceil((resendUntil - Date.now()) / 1000)) + "s"; } }, 1000);
        var form = root.querySelector("#axChange");
        if (form) form.addEventListener("submit", function (e) { e.preventDefault(); var v = formData(form).newEmail; api("POST", "/api/auth/change-email", { email: v }).then(function (x) { if (!x.ok) return draw({ change: true, changeErr: (x.data.fields && x.data.fields.email) || human(x) }); S.me = x.data.me; S.dev = x.data.dev || null; renderNav(); draw({ msg: note("ok", "Email updated. Use the new link below.") }); }); });
      } });
      ACTS.resend = function () { api("POST", "/api/auth/resend-verification").then(function (x) { if (x.status === 429) { var secs = parseInt((String(human(x)).match(/(\d+)\s*seconds?/) || [])[1], 10); resendUntil = Date.now() + (secs > 0 ? secs : 10) * 1000; return draw({ msg: note("warn", esc(human(x))) }); } if (x.ok) { if (x.data.alreadyVerified) return refreshMe().then(function () { go("#/role"); }); resendUntil = Date.now() + 60000; S.dev = x.data.dev || null; draw({ msg: note("ok", "A new link is ready. It was not emailed.") }); } else draw({ msg: note("bad", esc(human(x))) }); }); };
      ACTS.showchange = function () { draw({ change: true }); };
    }
    draw();
  };

  /* ------------------------------------------------------------------ forgot / reset password */
  AX.views.forgot = function () {
    function draw(st) {
      st = st || {};
      var html = authShell('<h1 id="axH" data-focus>Reset your password</h1><p class="ax-sub">Enter your email address and we will prepare a reset link.</p>' +
        (st.done ? note("ok", "If an account exists for that address, a reset link has been prepared.") + note("warn", "<b>No email is sent.</b> This server is not connected to an email service. " + (st.dev ? "For development, use the link below." : "Ask whoever runs this server for help.")) + (st.dev ? '<div class="ax-devbox"><b>Development link (not emailed)</b><a class="btn btn-fill btn-sm" href="' + esc(st.dev.resetPath) + '">Choose a new password</a></div>' : "") :
          '<form id="axForm" novalidate>' + fld({ id: "email", label: "Email address", type: "email", value: st.email, req: true, auto: "email", err: st.err }) + '<div class="ax-actions"><button class="btn btn-fill" type="submit">Prepare reset link</button><a href="#/signin" class="grow">Back to sign in</a></div></form>'), { label: "Reset password" });
      show({ html: html, title: "Reset your password", wire: function (root) {
        var form = root.querySelector("#axForm"); if (!form) return;
        form.addEventListener("submit", function (e) { e.preventDefault(); var v = formData(form).email.trim(); if (!/^\S+@\S+\.\S+$/.test(v)) return draw({ email: v, err: "Please enter a valid email address." });
          api("POST", "/api/auth/forgot", { email: v }).then(function (x) { if (!x.ok) return draw({ email: v, err: human(x) }); draw({ done: true, dev: x.data.dev }); }); });
      } });
    }
    draw();
  };
  AX.views.reset = function (r) {
    function draw(st) {
      st = st || {}; var f = st.fields || {};
      var html = authShell('<h1 id="axH" data-focus>Choose a new password</h1>' + (st.done ? note("ok", "Your password has been changed. Please sign in with it.") + '<div class="ax-actions"><a class="btn btn-fill" href="#/signin">Sign in</a></div>' :
        '<form id="axForm" novalidate>' + errSummary(f) + pwfld({ id: "password", label: "New password", auto: "new-password", err: f.password, reqs: true }) + pwfld({ id: "password2", label: "Confirm new password", auto: "new-password", err: f.password2 }) + '<div class="ax-actions"><button class="btn btn-fill" type="submit">Save new password</button></div></form>'), { label: "Reset password" });
      show({ html: html, title: "Choose a new password", wire: function (root) {
        var form = root.querySelector("#axForm"); if (!form) return;
        var pw = root.querySelector("#password"), reqs = root.querySelector("#password-r"); pw.addEventListener("input", function () { reqs.innerHTML = pwReqs(pw.value); });
        form.addEventListener("submit", function (e) { e.preventDefault(); var d = formData(form), er = {};
          if (d.password.length < 10 || !/[A-Za-z]/.test(d.password) || !/[0-9]/.test(d.password)) er.password = "Your password needs at least 10 characters, one letter and one number.";
          if (d.password !== d.password2) er.password2 = "The two passwords do not match.";
          if (Object.keys(er).length) return draw({ fields: er });
          api("POST", "/api/auth/reset", { token: r.a, password: d.password }).then(function (x) { if (!x.ok) return draw({ fields: { password: human(x) } }); draw({ done: true }); }); });
      } });
    }
    draw();
  };

  /* ------------------------------------------------------------------ role selection */
  var ROLE_CARDS = [
    ["primary", "I want accessible communication.", "Choose how you send, receive and understand messages.", "accessibility", "#0B8FA0", "#E3F8FA"],
    ["secondary", "I support someone.", "Connect with a family member, friend, student or another person who uses SANGAM.", "heart-handshake", "#6B5FA0", "#EEEAF8"],
    ["community", "I want to learn and participate.", "Explore accessibility, learn sign language and join the community.", "graduation-cap", "#C46F00", "#FFF2DE"],
    ["interpreter", "I provide interpretation.", "Offer language and communication assistance through an interpreter workspace.", "languages", "#0B5F6B", "#E3F8FA"],
  ];
  AX.ROLE_NAMES = { primary: "Primary user", secondary: "Supporter", community: "Community member", interpreter: "Interpreter" };
  AX.views.role = function () {
    function draw(st) {
      st = st || {};
      var html = '<div class="ax-ob" style="width:min(980px,100% - 32px)"><div class="ax-pagehead"><p class="ax-eyebrow">Welcome, ' + esc(S.me.profile.displayName) + '</p><h1 id="axH" data-focus>How will you use SANGAM?</h1><p class="ax-lead">Choose the experience that best describes how you want to take part. You can update your preferences later.</p></div>' +
        '<form id="axForm" novalidate>' + (st.err ? note("bad", esc(st.err)) : "") + '<fieldset class="ax-fs" style="margin-top:18px"><legend class="ax-sr">Choose one account type</legend><div class="ax-roles">' +
        ROLE_CARDS.map(function (c) { return '<label class="ax-rcard"><input type="radio" name="role" value="' + c[0] + '"' + (st.role === c[0] ? " checked" : "") + '><span class="ax-rc-body" style="--rc:' + c[4] + ";--rc-soft:" + c[5] + '"><span class="ax-rc-ic">' + ic(c[3]) + '</span><span><h3>' + esc(c[1]) + "</h3><p>" + esc(c[2]) + '</p><span class="ax-rc-sel">' + ic("circle-check") + "Selected</span></span></span></label>"; }).join("") +
        '</div></fieldset><div class="ax-actions"><button class="btn btn-fill" type="submit"' + (st.busy ? " disabled" : "") + ">" + (st.busy ? "Saving…" : "Continue") + '</button><button class="btn btn-sm grow" type="button" data-act="signout">Sign out</button></div>' +
        '<p class="ax-hint" style="margin-top:14px">Interpreter accounts are checked by a reviewer before they can receive requests. Choosing this option does not make anyone a verified interpreter.</p></form></div>';
      show({ html: '<div class="ax-dash">' + html + "</div>", title: "Choose your account type", wire: function (root) {
        root.querySelector("#axForm").addEventListener("submit", function (e) { e.preventDefault(); var d = formData(e.target); if (!d.role) { draw({ err: "Please choose one of the four options to continue." }); return; }
          draw({ role: d.role, busy: true }); api("POST", "/api/me/role", { role: d.role }).then(function (x) { if (!x.ok) return draw({ role: d.role, err: human(x) }); S.me = x.data.me; renderNav(); go("#/onboarding"); }); });
      } });
    }
    draw();
  };

  /* ------------------------------------------------------------------ onboarding wizard (four role-specific flows) */
  var LANGS = [["en-IN", "English (India)"], ["en-US", "English (US)"], ["en-GB", "English (UK)"], ["hi-IN", "Hindi (हिन्दी)"], ["or-IN", "Odia (ଓଡ଼ିଆ)"]];
  var SEND = [["type", "Type messages", "keyboard"], ["speak", "Speak", "mic"], ["voice_to_text", "Use voice-to-text", "captions"], ["sign", "Use sign recognition", "hand"], ["phraseboard", "Use the phraseboard", "layout-grid"], ["assistive", "Use compatible assistive input", "accessibility"], ["other", "Another way", "sparkles"]];
  var RECV = [["read_text", "Read text", "type"], ["listen", "Listen to spoken messages", "volume-2"], ["captions", "Live captions", "captions"], ["visual_alerts", "Visual alerts", "eye"], ["haptic", "Haptic notifications", "vibrate"], ["braille", "Braille preview", "braille"], ["other", "Another way", "sparkles"]];
  var REL = [["family", "Family member"], ["friend", "Friend"], ["teacher", "Teacher"], ["caregiver", "Caregiver"], ["supporter", "Trusted supporter"], ["other", "Other"]];
  var COMM = [["text", "Text", "keyboard"], ["voice", "Voice", "mic"], ["captions", "Captions", "captions"], ["sign_assist", "Sign-language assistance", "hand"], ["other", "Other", "sparkles"]];
  var INTERESTS = [["sign_learning", "Sign-language learning", "languages"], ["awareness", "Accessibility awareness", "accessibility"], ["inclusive_communication", "Inclusive communication", "message-circle"], ["educational", "Educational content", "book-open"], ["community", "Community participation", "users"], ["volunteer", "Volunteer opportunities", "heart-handshake"]];
  var LEVELS = [["beginner", "Beginner"], ["intermediate", "Intermediate"], ["advanced", "Advanced"]];
  var SIGN_LANG_SUGGEST = ["Indian Sign Language", "English", "Hindi", "Odia", "Bengali", "Tamil", "Telugu", "Marathi", "Gujarati", "Kannada", "Malayalam", "Punjabi", "Urdu", "American Sign Language", "British Sign Language"];
  AX.LISTS = { SEND: SEND, RECV: RECV, REL: REL, COMM: COMM, INTERESTS: INTERESTS, LEVELS: LEVELS, LANGS: LANGS, SUGGEST: SIGN_LANG_SUGGEST };
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var STEP_TITLES = { profile: "About you", send: "How I send messages", receive: "How I receive messages", accessibility: "Accessibility preferences", review: "Review and finish", relationship: "How you support people", communication: "How you communicate", connection: "Connect with someone", interests: "Your interests", level: "Your learning level", languages: "Languages", professional: "Professional details", availability: "Availability", verification: "Verification" };
  var OPTIONAL = { primary: ["send", "receive", "accessibility"], secondary: ["communication", "connection"], community: ["interests", "level"], interpreter: ["professional", "availability", "verification"] };

  function readAvatar(file, cb) {
    if (!file) return cb(null);
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return cb("Please choose a JPEG, PNG or WebP picture.");
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () { var c = document.createElement("canvas"), n = 128, s = Math.min(img.width, img.height), ctx = c.getContext("2d"); c.width = c.height = n; ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, n, n); URL.revokeObjectURL(url); cb(null, c.toDataURL("image/jpeg", 0.8)); };
    img.onerror = function () { URL.revokeObjectURL(url); cb("That picture could not be read."); }; img.src = url;
  }
  AX.readAvatar = readAvatar;
  function profileForm(role, st, rd) {
    var p = S.me.profile, f = st.fields || {}, full = role === "interpreter";
    return fld({ id: "displayName", label: full ? "Full name" : "Name to show", value: st.v ? st.v.displayName : p.displayName, req: true, auto: "name", max: 60, err: f.displayName, hint: full ? "As it appears on your qualifications." : "This is how other people will see you." }) +
      (role === "primary" ? fld({ id: "formOfAddress", label: "Preferred form of address", value: st.v ? st.v.formOfAddress : p.formOfAddress, max: 30, ph: "for example: she/her, Dr, Mx", hint: "Optional. Used only to address you." }) : "") +
      fld({ id: "language", label: "Preferred language", req: true, noTag: false, html: '<select class="ax-in" id="language" name="language">' + LANGS.map(function (l) { return '<option value="' + l[0] + '"' + ((st.v ? st.v.language : p.language) === l[0] ? " selected" : "") + ">" + l[1] + "</option>"; }).join("") + "</select>" }) +
      (full ? fld({ id: "contactEmail", label: "Contact email", type: "email", value: st.v ? st.v.contactEmail : rd.contactEmail, auto: "email", err: f.contactEmail, hint: "Optional. Only shown to people you accept a session with." }) + fld({ id: "phone", label: "Phone number", type: "tel", value: st.v ? st.v.phone : rd.phone, auto: "tel", max: 30 }) +
        fld({ id: "preferredContact", label: "Preferred way to be contacted", html: '<select class="ax-in" id="preferredContact" name="preferredContact">' + [["in_app", "Inside SANGAM"], ["email", "Email"], ["phone", "Phone"]].map(function (o) { return '<option value="' + o[0] + '"' + ((st.v ? st.v.preferredContact : rd.preferredContact) === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select>" }) : "") +
      '<div class="ax-f"><span class="ax-lbl">Profile picture <span class="ax-tag">(optional)</span></span><div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><span id="avPrev">' + avatar({ displayName: p.displayName, avatar: st.avatar !== undefined ? st.avatar : p.avatar }, true) + '</span><label class="btn btn-sm" for="avFile" style="cursor:pointer">Choose a picture</label><input id="avFile" type="file" accept="image/jpeg,image/png,image/webp" class="ax-sr"><button type="button" class="btn btn-sm" data-act="avclear">Remove picture</button></div><p class="ax-hint" id="avMsg" role="status" style="margin-top:6px">It is resized to a small square on your device before it is saved.</p></div>';
  }
  function accessibilityForm(rd, st) {
    var d = (st && st.v && st.v.display) || rd.display || {}, n = (st && st.v && st.v.navigation) || rd.navigation || {}, a = (st && st.v && st.v.audio) || rd.audio || {}, o = (st && st.v && st.v.other) || rd.other || {}, nt = (S.me.settings && S.me.settings.notifications) || {};
    var voices = (SG.voices && SG.voices()) || [];
    return '<p class="ax-sub" style="margin-bottom:14px">Choose what works best for you. This is a set of preferences, not an assessment, and you can change any of it later.</p>' +
      '<div class="ax-grp"><h3>Display</h3>' + chips({ name: "textSize", legend: "Text size", radio: true, tag: false, sel: d.textSize || "standard", items: [["standard", "Standard text"], ["large", "Large text"], ["xlarge", "Extra-large text"]] }) + chips({ name: "theme", legend: "Colour theme", radio: true, tag: false, sel: d.theme || "light", items: [["light", "Light", "sparkles"], ["dark", "Dark", "contrast"], ["contrast", "High contrast", "eye"]] }) + "</div>" +
      '<div class="ax-grp"><h3>Navigation</h3><div class="ax-checks">' + [["screenReader", "Screen-reader-friendly mode", "Calmer layout, fewer moving parts and fuller spoken status messages."], ["keyboard", "Keyboard navigation", "Keeps the focus outline and shortcuts easy to find."], ["voiceNav", "Voice-guided navigation (optional)", "Adds a button for spoken commands. It only listens when you press it."], ["reducedMotion", "Reduced motion", "Turns animation off."]].map(function (c) { return '<label><input type="checkbox" name="nav_' + c[0] + '"' + (n[c[0]] ? " checked" : "") + '><span><b>' + c[1] + '</b><br><span class="ax-hint" style="margin:0">' + c[2] + "</span></span></label>"; }).join("") + "</div></div>" +
      '<div class="ax-grp"><h3>Audio</h3>' + fld({ id: "axVoice", label: "Speech voice", noTag: false, html: '<select class="ax-in" id="axVoice" name="voice"><option value="">Automatic for my language</option>' + voices.map(function (v) { return '<option value="' + esc(v.name) + '"' + (a.voice === v.name ? " selected" : "") + ">" + esc(v.name + " (" + v.lang + ")") + "</option>"; }).join("") + "</select>" }) +
      fld({ id: "axRate", label: "Speech speed", noTag: true, html: '<input class="ax-in" type="range" id="axRate" name="rate" min="0.7" max="1.3" step="0.1" value="' + (a.rate || 1) + '" aria-describedby="axRateOut"><output id="axRateOut" class="ax-hint">' + (a.rate || 1).toFixed(1) + "x</output>" }) +
      '<div class="ax-checks"><label><input type="checkbox" name="spokenNotifications"' + (a.spokenNotifications ? " checked" : "") + "><span><b>Read new notifications aloud</b></span></label></div></div>" +
      '<div class="ax-grp"><h3>Other</h3><div class="ax-checks"><label><input type="checkbox" name="haptics"' + (o.haptics ? " checked" : "") + "><span><b>Haptic feedback</b> on devices that can vibrate</span></label></div></div>" +
      '<div class="ax-grp"><h3>Notifications</h3><div class="ax-checks">' + [["messages", "Conversation invitations"], ["connections", "Connection requests and answers"], ["interpreter", "Interpreter requests and updates"], ["learning", "Learning reminders"]].map(function (c) { return '<label><input type="checkbox" name="nt_' + c[0] + '"' + (nt[c[0]] !== false ? " checked" : "") + "><span><b>" + c[1] + "</b></span></label>"; }).join("") + "</div></div>";
  }
  function collectAccessibility(d) {
    return { display: { textSize: d.textSize || "standard", theme: d.theme || "light" }, navigation: { screenReader: !!d.nav_screenReader, keyboard: !!d.nav_keyboard, voiceNav: !!d.nav_voiceNav, reducedMotion: !!d.nav_reducedMotion }, audio: { voice: d.voice || "", rate: parseFloat(d.rate) || 1, spokenNotifications: !!d.spokenNotifications }, other: { haptics: !!d.haptics } };
  }
  AX.accessibilityForm = accessibilityForm; AX.collectAccessibility = collectAccessibility;
  AX.wireAccessibility = function (root) {
    var rate = root.querySelector("#axRate"), out = root.querySelector("#axRateOut"); if (rate) rate.addEventListener("input", function () { out.textContent = parseFloat(rate.value).toFixed(1) + "x"; });
    root.addEventListener("change", function (e) {   // preview display choices straight away
      if (e.target.name === "theme") { document.documentElement.setAttribute("data-ax-theme", e.target.value === "dark" ? "dark" : "light"); document.documentElement.classList.toggle("hc", e.target.value === "contrast"); }
      if (e.target.name === "textSize") document.documentElement.style.setProperty("--scale", e.target.value === "xlarge" ? 1.6 : e.target.value === "large" ? 1.3 : 1);
      if (e.target.name === "nav_reducedMotion") document.documentElement.classList.toggle("ax-reduce", e.target.checked);
    });
  };

  function stepBody(role, step, st) {
    var m = S.me, rd = m.roleData || {}, f = st.fields || {};
    switch (role + ":" + step) {
      case "primary:profile": case "secondary:profile": case "community:profile": case "interpreter:profile":
        return { sub: role === "interpreter" ? "A few details so people know who you are." : "Tell us a little about yourself. We only ask for what is needed.", html: profileForm(role, st, rd), collect: function (d) { return { displayName: d.displayName, language: d.language, formOfAddress: d.formOfAddress, contactEmail: d.contactEmail, phone: d.phone, preferredContact: d.preferredContact, avatar: AX._av }; } };
      case "primary:send": return { sub: "Choose every way you would like to send a message. You can pick more than one.", html: chips({ name: "send[]", legend: "I would like to…", sel: (st.v && st.v.send) || rd.send, items: SEND }), collect: function (d) { return { send: d.send || [] }; } };
      case "primary:receive": return { sub: "Choose every way you would like to receive a message.", html: chips({ name: "receive[]", legend: "I would like to…", sel: (st.v && st.v.receive) || rd.receive, items: RECV }), collect: function (d) { return { receive: d.receive || [] }; } };
      case "primary:accessibility": return { sub: "", html: accessibilityForm(rd, st), collect: function (d) { return collectAccessibility(d); }, after: function (d) { return api("PUT", "/api/me/settings", { notifications: { messages: !!d.nt_messages, connections: !!d.nt_connections, interpreter: !!d.nt_interpreter, learning: !!d.nt_learning } }); } };
      case "secondary:relationship": return { sub: "This describes your role in someone's life. It does not give you access to anyone's information: only the person you connect with can do that.", html: chips({ name: "relationship", legend: "I am their…", radio: true, req: true, sel: (st.v && st.v.relationship) || rd.relationship, items: REL.map(function (x) { return [x[0], x[1], "heart-handshake"]; }) }) + (f.relationship ? '<p class="ax-err">' + ic("alert-circle") + "<span>" + esc(f.relationship) + "</span></p>" : ""), collect: function (d) { return { relationship: d.relationship || "" }; } };
      case "secondary:communication": return { sub: "How would you like to communicate with the people you support?", html: chips({ name: "commMethods[]", legend: "I prefer…", sel: (st.v && st.v.commMethods) || rd.commMethods, items: COMM }), collect: function (d) { return { commMethods: d.commMethods || [] }; } };
      case "secondary:connection": return { sub: "A connection needs approval from the other person. You can do this now or later.", html: '<div class="ax-note">' + ic("info") + "<div>Ask the person for their <b>invitation code</b>. It is shown on their dashboard and is private to them.</div></div>" + '<div style="margin-top:16px">' + fld({ id: "code", label: "Their invitation code", value: st.code, max: 12, auto: "off", ph: "for example 7K3M9QXD", hint: "Optional. You can also connect later from My Connections." }) + '<button class="btn btn-sm" type="button" data-act="lookup">Find this person</button><div id="lookupOut" role="status" style="margin-top:12px"></div></div>', collect: function () { return {}; } };
      case "community:interests": return { sub: "Pick anything you would like to explore.", html: chips({ name: "interests[]", legend: "I am interested in…", sel: (st.v && st.v.interests) || rd.interests, items: INTERESTS }), collect: function (d) { return { interests: d.interests || [] }; } };
      case "community:level": return { sub: "This helps us suggest where to start. You can change it at any time.", html: chips({ name: "level", legend: "My sign-language level", radio: true, tag: false, sel: (st.v && st.v.level) || rd.level || "beginner", items: LEVELS.map(function (x) { return [x[0], x[1], "book-open"]; }) }), collect: function (d) { return { level: d.level || "beginner" }; } };
      case "interpreter:languages": {
        var langs = (st.langs || rd.languages || []).slice();
        return { sub: "List every language you can interpret between or into. At least one is needed.", html: '<div class="ax-f"><label for="langAdd">Add a language <span class="ax-tag req">(required: at least one)</span></label><div style="display:flex;gap:10px;flex-wrap:wrap"><input class="ax-in" id="langAdd" list="langList" style="flex:1 1 220px" autocomplete="off" placeholder="Start typing, then press Add"><datalist id="langList">' + SIGN_LANG_SUGGEST.map(function (l) { return '<option value="' + esc(l) + '">'; }).join("") + '</datalist><button class="btn btn-sm" type="button" data-act="langadd">Add</button></div>' + (f.languages ? '<p class="ax-err" id="languages-e">' + ic("alert-circle") + "<span>" + esc(f.languages) + "</span></p>" : "") + '</div><ul class="ax-list" id="langList2" aria-label="Your languages"></ul><input type="hidden" id="languages" name="languages" value="' + esc(JSON.stringify(langs)) + '">' +
          fld({ id: "signProficiency", label: "Sign-language proficiency", html: '<select class="ax-in" id="signProficiency" name="signProficiency">' + [["none", "I do not interpret sign language"], ["basic", "Basic"], ["conversational", "Conversational"], ["professional", "Professional"]].map(function (o) { return '<option value="' + o[0] + '"' + ((st.v ? st.v.signProficiency : rd.signProficiency) === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select>", hint: "Describes your own level. It is not checked until a reviewer looks at your details." }),
          collect: function (d) { return { languages: JSON.parse(d.languages || "[]"), signProficiency: d.signProficiency }; } };
      }
      case "interpreter:professional": return { sub: "Tell a reviewer about your training and experience. Nothing here makes you a verified interpreter: only a reviewer can do that.", html: fld({ id: "qualifications", label: "Qualifications", textarea: true, value: st.v ? st.v.qualifications : rd.qualifications, max: 1000, hint: "Courses, diplomas, training." }) + fld({ id: "certificationBody", label: "Certification body", value: st.v ? st.v.certificationBody : rd.certificationBody, max: 120 }) + fld({ id: "certificationNumber", label: "Certificate number", value: st.v ? st.v.certificationNumber : rd.certificationNumber, max: 60 }) + fld({ id: "experienceYears", label: "Years of experience", type: "number", inputmode: "numeric", value: st.v ? st.v.experienceYears : (rd.experienceYears || 0), extra: ' min="0" max="60"' }) + fld({ id: "specialisations", label: "Areas of expertise", value: st.v ? st.v.specialisations : (rd.specialisations || []).join(", "), max: 300, hint: "Separate with commas, for example: medical, education, legal." }), collect: function (d) { return { qualifications: d.qualifications, certificationBody: d.certificationBody, certificationNumber: d.certificationNumber, experienceYears: d.experienceYears, specialisations: String(d.specialisations || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean) }; } };
      case "interpreter:availability": {
        var av = (st.v && st.v.availability) || rd.availability || { status: "available", schedule: [] }, sched = st.sched || av.schedule || [];
        return { sub: "Say when you can take requests. You can change this whenever you like.", html: chips({ name: "status", legend: "My availability", radio: true, tag: false, sel: av.status, items: [["available", "Available now", "circle-check"], ["scheduled", "Only at set times", "calendar"], ["unavailable", "Unavailable", "x"]] }) + '<div id="schedBox"' + (av.status === "scheduled" ? "" : " hidden") + '><p class="ax-hint">Add the times you are usually free.</p><ul class="ax-list" id="schedList"></ul><button class="btn btn-sm" type="button" data-act="schedadd">Add a time</button></div><input type="hidden" id="schedule" name="schedule" value="' + esc(JSON.stringify(sched)) + '">' + chips({ name: "sessionTypes[]", legend: "Session types I can take", sel: (st.v && st.v.sessionTypes) || rd.sessionTypes || ["conversation"], items: [["conversation", "Conversations"], ["appointment", "Appointments"], ["other", "Other"]] }), collect: function (d) { return { status: d.status, schedule: JSON.parse(d.schedule || "[]"), sessionTypes: d.sessionTypes || [] }; } };
      }
      case "interpreter:verification": { var vs = m.verification || { status: "not_submitted" };
        return { sub: "A reviewer checks your details before you can receive requests.", html: '<div class="ax-note ' + (vs.status === "verified" ? "ok" : "warn") + '">' + ic("shield-check") + "<div><b>Status: " + esc(VSTATUS[vs.status].t) + "</b><br>" + esc(VSTATUS[vs.status].d) + (vs.note ? "<br><i>" + esc(vs.note) + "</i>" : "") + "</div></div>" + (vs.status === "not_submitted" || vs.status === "additional_info_required" || vs.status === "rejected" ? '<div class="ax-actions"><button class="btn btn-fill" type="button" data-act="submitverify">Submit my details for review</button></div><p class="ax-hint" id="vMsg" role="status"></p>' : ""), collect: function () { return {}; }, noSave: true }; }
      default: return null;
    }
  }
  var VSTATUS = AX.VSTATUS = {
    not_submitted: { t: "Not submitted", d: "You have not sent your details for review yet. Until you do, you cannot receive interpreter requests." },
    pending_review: { t: "Pending review", d: "Your details have been submitted. A reviewer will look at them. You cannot receive requests until they are verified." },
    verified: { t: "Verified", d: "A reviewer has verified your details. You can receive requests." },
    rejected: { t: "Not approved", d: "Your details were not approved. Read the note, update them and submit again." },
    additional_info_required: { t: "More information needed", d: "A reviewer needs more from you. Read the note, update your details and submit again." },
  };
  function summaryRows(role) {
    var m = S.me, rd = m.roleData || {}, p = m.profile, L = function (arr, list) { return (arr || []).map(function (v) { var x = list.filter(function (i) { return i[0] === v; })[0]; return x ? x[1] : v; }).join(", ") || "Not chosen"; };
    var lang = (LANGS.filter(function (l) { return l[0] === p.language; })[0] || [0, p.language])[1];
    var rows = [["profile", "About you", esc(p.displayName) + " · " + esc(lang)]];
    if (role === "primary") rows.push(["send", "How I send", esc(L(rd.send, SEND))], ["receive", "How I receive", esc(L(rd.receive, RECV))], ["accessibility", "Display and navigation", esc("Text: " + ((rd.display || {}).textSize || "standard") + " · Theme: " + ((rd.display || {}).theme || "light") + " · " + (rd.navigation && rd.navigation.screenReader ? "Screen-reader mode" : "Standard navigation") + (rd.navigation && rd.navigation.keyboard ? " · Keyboard" : "") + (rd.navigation && rd.navigation.voiceNav ? " · Voice commands" : "") + (rd.navigation && rd.navigation.reducedMotion ? " · Reduced motion" : ""))]);
    if (role === "secondary") rows.push(["relationship", "Your role", esc(L([rd.relationship], REL))], ["communication", "How you communicate", esc(L(rd.commMethods, COMM))]);
    if (role === "community") rows.push(["interests", "Interests", esc(L(rd.interests, INTERESTS))], ["level", "Level", esc(L([rd.level || "beginner"], LEVELS))]);
    if (role === "interpreter") rows.push(["languages", "Languages", esc((rd.languages || []).join(", ") || "None yet")], ["professional", "Professional details", esc(rd.qualifications ? rd.qualifications.slice(0, 80) : "Not added yet")], ["availability", "Availability", esc(((rd.availability || {}).status || "not set").replace(/_/g, " "))], ["verification", "Verification", esc(VSTATUS[(m.verification || {}).status || "not_submitted"].t)]);
    return rows;
  }
  AX.views.onboarding = function (r) {
    var m = S.me, role = m.role, steps = m.onboarding.steps, step = r.a && steps.indexOf(r.a) >= 0 ? r.a : m.onboarding.next || "review";
    if (!r.a && step !== r.a) { /* keep URL in step with the resume point */ history.replaceState(null, "", "#/onboarding/" + step); }
    var idx = steps.indexOf(step), total = steps.length, pct = Math.round((idx / (total - 1)) * 100), done = m.onboarding.done || {};
    function chrome(title, sub, inner, buttons, st) {
      return '<div class="ax-dash"><div class="ax-ob"><div class="ax-stepmeta"><span>STEP ' + (idx + 1) + " OF " + total + " — " + esc((STEP_TITLES[step] || step).toUpperCase()) + "</span><span>" + pct + '% complete</span></div><div class="ax-progress" role="progressbar" aria-label="Setup progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + Math.max(4, pct) + '%"></i></div>' +
        '<ol class="ax-stepdots" aria-label="Steps">' + steps.map(function (s, i) { return '<li class="' + (done[s] ? "done" : "") + '"' + (i === idx ? ' aria-current="step"' : "") + ">" + (done[s] ? '<span class="ax-sr">Done: </span>' : "") + esc(STEP_TITLES[s] || s) + "</li>"; }).join("") + "</ol>" +
        '<div class="ax-card2"><form id="axForm" novalidate><h1 id="axH" data-focus>' + esc(title) + '</h1><p class="ax-sub">' + sub + "</p>" + (st && st.err ? note("bad", esc(st.err)) : "") + (st && st.fields && Object.keys(st.fields).length ? errSummary(st.fields) : "") + inner + '<div class="ax-actions">' + buttons + "</div></form></div></div></div>";
    }
    var prev = idx > 0 ? "#/onboarding/" + steps[idx - 1] : null, next = idx < total - 1 ? steps[idx + 1] : null;
    var backBtn = prev ? '<a class="btn" href="' + prev + '">Back</a>' : "";
    if (step === "review") {
      return Promise.resolve({ title: "Review and finish", html: chrome("Review your setup", "Check that this is right. You can change any of it now or later from your settings.",
        '<ul class="ax-sumlist">' + summaryRows(role).map(function (x) { return "<li><div><b>" + x[1] + "</b><span>" + x[2] + '</span></div><a class="btn btn-sm" href="#/onboarding/' + x[0] + '">Edit<span class="ax-sr"> ' + x[1] + "</span></a></li>"; }).join("") + "</ul>" +
        (role === "primary" && !(m.roleData.send || []).length ? note("warn", "You skipped some choices, so sensible defaults will be used (type to send, captions to receive). You can change them any time.") : "") +
        (role === "interpreter" ? note("warn", "Finishing setup does not verify you. Until a reviewer verifies your details you will not receive requests.") : ""),
        backBtn + '<button class="btn btn-fill" type="submit" id="axDone">Complete setup</button><button class="btn btn-sm grow" type="button" data-act="later">Save and continue later</button>'),
        wire: function (root) {
          root.querySelector("#axForm").addEventListener("submit", function (e) { e.preventDefault(); var b = root.querySelector("#axDone"); b.disabled = true; b.textContent = "Finishing…";
            api("POST", "/api/me/onboarding/complete").then(function (x) { if (!x.ok) { b.disabled = false; b.textContent = "Complete setup"; var st = x.data.fields && x.data.fields.step; if (st) return go("#/onboarding/" + st); return show({ html: chrome("Review your setup", "", note("bad", esc(human(x))), backBtn), title: "Review" }); }
              S.me = x.data.me; applyAccountToPage(); renderNav(); setWorkspaces(); startPolling(); toast("Your setup is complete."); say("Your onboarding is complete. Opening your dashboard.", "important"); go("#/me"); }); }); } });
    }
    function draw(st) {
      st = st || {};
      var body = stepBody(role, step, st); if (!body) return go("#/onboarding");
      var optional = (OPTIONAL[role] || []).indexOf(step) >= 0;
      var buttons = backBtn + (body.noSave ? "" : '<button class="btn btn-fill" type="submit"' + (st.busy ? " disabled" : "") + ">" + (st.busy ? "Saving…" : "Continue") + "</button>") + (next && optional ? '<a class="btn btn-sm" href="#/onboarding/' + next + '">Skip this step</a>' : "") + '<button class="btn btn-sm grow" type="button" data-act="later">Save and continue later</button>';
      if (body.noSave) buttons = backBtn + '<a class="btn btn-fill" href="#/onboarding/' + next + '">Continue</a><button class="btn btn-sm grow" type="button" data-act="later">Save and continue later</button>';
      show({ title: STEP_TITLES[step] || "Setup", html: chrome(stepHeading(role, step), body.sub, body.html, buttons, st), wire: function (root) {
        AX._av = st.avatar !== undefined ? st.avatar : undefined;
        var form = root.querySelector("#axForm");
        if (step === "accessibility") AX.wireAccessibility(root);
        wireStepExtras(root, role, step, st, draw);
        function save(go2, silent) {
          var d = formData(form), data = body.collect(d);
          if (role === "interpreter" && step === "professional") data.experienceYears = parseInt(data.experienceYears, 10) || 0;
          draw(Object.assign({}, st, { busy: true, v: data, avatar: AX._av }));
          return api("PUT", "/api/me/onboarding/" + step, data).then(function (x) {
            if (!x.ok) { draw(Object.assign({}, st, { v: data, fields: x.data.fields || {}, err: x.data.fields ? "" : human(x), avatar: AX._av })); return false; }
            S.me = x.data.me; applyAccountToPage(); renderNav();
            return (body.after ? body.after(d).then(function () { return refreshMe(); }) : Promise.resolve()).then(function () { if (go2) go2(); return true; });
          });
        }
        form.addEventListener("submit", function (e) { e.preventDefault(); if (body.noSave) return; save(function () { say("Saved.", "info"); go(next ? "#/onboarding/" + next : "#/onboarding/review"); }); });
        ACTS.later = function () { if (body.noSave) { toast("Your progress is saved. Sign in any time to continue."); return go("#/"); } save(function () { toast("Saved. You can pick this up again whenever you sign in."); say("Saved. You can continue later.", "important"); go("#/"); }); };
        ACTS.avclear = function () { AX._av = ""; var pv = root.querySelector("#avPrev"); pv.innerHTML = avatar({ displayName: S.me.profile.displayName, avatar: "" }, true); };
        var file = root.querySelector("#avFile"); if (file) file.addEventListener("change", function () { readAvatar(file.files[0], function (err, url) { var msg = root.querySelector("#avMsg"); if (err) { msg.textContent = err; return; } AX._av = url; root.querySelector("#avPrev").innerHTML = avatar({ displayName: S.me.profile.displayName, avatar: url }, true); msg.textContent = "Picture ready. It is saved when you press Continue."; }); });
        if (st.fields && Object.keys(st.fields).length) { var sum = root.querySelector("#axErrSum"); if (sum) sum.focus(); }
      } });
    }
    draw();
  };
  function stepHeading(role, step) {
    var H = { profile: role === "interpreter" ? "Tell us about yourself" : "A little about you", send: "How would you like to send messages?", receive: "How would you like to receive messages?", accessibility: "What helps you use SANGAM?", relationship: "How do you support people?", communication: "How would you like to communicate?", connection: "Connect with someone", interests: "What would you like to explore?", level: "Where are you starting from?", languages: "Which languages do you interpret?", professional: "Your professional details", availability: "When are you available?", verification: "Submit your details for review" };
    return H[step] || "Set up";
  }
  function wireStepExtras(root, role, step, st, redraw) {
    if (role === "interpreter" && step === "languages") {
      var hid = root.querySelector("#languages"), ul = root.querySelector("#langList2"), add = root.querySelector("#langAdd");
      function paint() { var L = JSON.parse(hid.value || "[]"); ul.innerHTML = L.length ? L.map(function (l, i) { return '<li class="ax-item"><span class="main"><b>' + esc(l) + '</b></span><button type="button" class="btn btn-sm" data-act="langrm" data-i="' + i + '">Remove<span class="ax-sr"> ' + esc(l) + "</span></button></li>"; }).join("") : '<li class="ax-hint">No languages added yet.</li>'; }
      ACTS.langadd = function () { var v = add.value.trim(); if (!v) return; var L = JSON.parse(hid.value || "[]"); if (L.map(function (x) { return x.toLowerCase(); }).indexOf(v.toLowerCase()) < 0 && L.length < 10) L.push(v); hid.value = JSON.stringify(L); add.value = ""; paint(); add.focus(); };
      ACTS.langrm = function (el) { var L = JSON.parse(hid.value || "[]"); L.splice(+el.dataset.i, 1); hid.value = JSON.stringify(L); paint(); add.focus(); };
      add.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); ACTS.langadd(); } }); paint();
    }
    if (role === "interpreter" && step === "availability") {
      var hs = root.querySelector("#schedule"), sl = root.querySelector("#schedList"), box = root.querySelector("#schedBox");
      function paintS() { var A = JSON.parse(hs.value || "[]"); sl.innerHTML = A.map(function (a, i) { return '<li class="ax-item"><span class="main"><select class="ax-in" data-i="' + i + '" data-k="day" aria-label="Day" style="max-width:170px">' + DAYS.map(function (d, di) { return '<option value="' + di + '"' + (a.day === di ? " selected" : "") + ">" + d + "</option>"; }).join("") + '</select> <input class="ax-in" type="time" data-i="' + i + '" data-k="from" value="' + a.from + '" aria-label="From" style="max-width:150px"> <span>to</span> <input class="ax-in" type="time" data-i="' + i + '" data-k="to" value="' + a.to + '" aria-label="To" style="max-width:150px"></span><button type="button" class="btn btn-sm" data-act="schedrm" data-i="' + i + '">Remove</button></li>'; }).join(""); }
      sl.addEventListener("change", function (e) { var A = JSON.parse(hs.value || "[]"), i = +e.target.dataset.i, k = e.target.dataset.k; if (A[i]) { A[i][k] = k === "day" ? +e.target.value : e.target.value; hs.value = JSON.stringify(A); } });
      ACTS.schedadd = function () { var A = JSON.parse(hs.value || "[]"); if (A.length < 14) A.push({ day: 1, from: "09:00", to: "17:00" }); hs.value = JSON.stringify(A); paintS(); };
      ACTS.schedrm = function (el) { var A = JSON.parse(hs.value || "[]"); A.splice(+el.dataset.i, 1); hs.value = JSON.stringify(A); paintS(); };
      root.addEventListener("change", function (e) { if (e.target.name === "status") box.hidden = e.target.value !== "scheduled"; }); paintS();
    }
    if (role === "interpreter" && step === "verification") {
      ACTS.submitverify = function (el) { el.disabled = true; var out = root.querySelector("#vMsg"); api("POST", "/api/interpreter/submit").then(function (x) { if (!x.ok) { el.disabled = false; out.textContent = human(x); return; } S.me = x.data.me; say("Your details were submitted for review.", "important"); redraw(); }); };
    }
    if (role === "secondary" && step === "connection") {
      ACTS.lookup = function () { var code = root.querySelector("#code").value.trim(), out = root.querySelector("#lookupOut"); if (!code) { out.innerHTML = note("warn", "Type the invitation code first."); return; } out.innerHTML = loading("Looking…");
        api("GET", "/api/connections/lookup?code=" + encodeURIComponent(code)).then(function (x) { if (!x.ok) { out.innerHTML = note("bad", esc(human(x))); return; } out.innerHTML = '<div class="ax-item"><span class="main">' + avatar(x.data.found) + "<span><b>" + esc(x.data.found.displayName) + '</b><span>Send them a connection request?</span></span></span><button class="btn btn-fill btn-sm" type="button" data-act="sendreq" data-code="' + esc(code) + '">Send request</button></div>'; }); };
      ACTS.sendreq = function (el) { el.disabled = true; api("POST", "/api/connections", { code: el.dataset.code, relationship: (S.me.roleData || {}).relationship }).then(function (x) { var out = root.querySelector("#lookupOut"); out.innerHTML = x.ok ? note("ok", "Request sent. You will be told when they answer. Nothing is shared with you until they approve.") : note("bad", esc(human(x))); if (!x.ok) el.disabled = false; }); };
    }
  }
  AX.views.onboarding.__stepTitles = STEP_TITLES;

  /* ------------------------------------------------------------------ notifications polling (real events only) */
  var pollTimer = null, lastUnread = null;
  function startPolling() { stopPolling(); if (!S.signedIn || !complete()) return; poll(); pollTimer = setInterval(function () { if (!document.hidden) poll(); }, 25000); }
  function stopPolling() { clearInterval(pollTimer); pollTimer = null; }
  function poll() {
    if (!S.signedIn) return;
    api("GET", "/api/notifications").then(function (r) {
      if (!r.ok) { if (r.status === 401) { S.signedIn = false; S.me = null; renderNav(); setWorkspaces(); stopPolling(); } return; }
      var prev = lastUnread; S.notif = { unread: r.data.unread, list: r.data.notifications }; lastUnread = r.data.unread;
      if (prev !== null && r.data.unread > prev) {
        var n = r.data.notifications.filter(function (x) { return !x.read; })[0];
        if (n) { say("New notification: " + n.title + ". " + n.body, "important"); var rd = S.me && S.me.roleData; if (rd && rd.audio && rd.audio.spokenNotifications && SG.speak) SG.speak(n.title + ". " + n.body); }
      }
      renderNav(); if (AX.onNotif) AX.onNotif();
    });
  }
  AX.poll = poll; AX.startPolling = startPolling;

  /* ------------------------------------------------------------------ boot */
  function onRoute() {
    var h = location.hash || "#/";
    renderNav();
    if (/^#\/(signin|register|verify|forgot|reset|role|onboarding|me|help|privacy|terms)(\/|$)/.test(h)) { render(); return; }
    // Not an account page: the home page, the guest/workspace dashboard, or a join link.
    if (h.indexOf("#/dashboard") === 0) {
      var r = { name: "dashboard", hash: h };
      if (S.ready && S.signedIn) {
        var g = gate(r); if (g) { location.replace(g); return; }
        if (complete()) { var sec = h.replace(/^#\/dashboard\/?/, "").split("/")[0]; if (sec && (WORKSPACES[S.me.role] || []).indexOf(sec) < 0) { location.replace("#/me"); return; } }
      }
      decorateDash();
    } else decorateDash();
  }
  window.addEventListener("hashchange", onRoute);
  document.addEventListener("visibilitychange", function () { if (!document.hidden && S.signedIn && complete()) poll(); });
  refreshMe().then(function () { S.ready = true; if (S.signedIn && complete()) startPolling(); onRoute(); });
})();
