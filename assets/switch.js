/*
 * SANGAM switch scanning.
 *
 * For people who operate a device with one or two switches (or a single key).
 * Scanning highlights one GROUP of controls at a time, then one control inside
 * the chosen group. Selection is a keyboard key: Space or Enter, which is what
 * most switch interfaces send. Optional stepping keys (arrows) serve two-switch use.
 *
 * Honest scope: this is keyboard-driven scanning. It has been tested with a
 * keyboard in an automated browser. It has NOT been tested with physical switch
 * hardware, and SANGAM makes no compatibility claim for any switch product.
 */
(function () {
  "use strict";
  var SG = window.Sangam || {};
  var $ = SG.$;
  function P() { return SG.profile || {}; }

  var ITEM_SEL = 'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]):not(.vis-hidden), select:not([disabled]), textarea:not([disabled]), summary, [role="button"]:not([aria-disabled="true"])';
  var GROUP_SEL = ".tts-bar, nav, fieldset, .box, .pbox, form, .chat-turnbar, .chat-clar, .chat-extra, .say-bar, .cats, .tiles, .cards, .emg-in, .emg-alt, .drop-panel, .start-actions, .hero-cta";

  var passes = 0, on = false, paused = false, mode = "groups", timer = null, idx = 0, groups = [], items = [], curGroup = null, bar = null, live = null, hl = null;

  function visible(el) {
    if (!el || !el.getClientRects().length) return false;
    var cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none") return false;
    if (el.closest("[hidden], [inert]")) return false;
    if (bar && bar.contains(el)) return false;
    return true;
  }
  function scopeRoot() {
    var d = document.querySelector("dialog[open]");
    if (d) return d;
    var ov = document.getElementById("joinOverlay"); if (ov && !ov.hidden) return ov;
    return document.body;
  }
  function collect() {
    var root = scopeRoot(), all = [].slice.call(root.querySelectorAll(ITEM_SEL)).filter(visible), map = new Map(), list = [];
    all.forEach(function (el) {
      var g = el.closest(GROUP_SEL); if (!g || !root.contains(g)) g = root;
      if (!map.has(g)) { map.set(g, []); list.push(g); }
      map.get(g).push(el);
    });
    return list.map(function (g) { return { el: g, items: map.get(g) }; });
  }
  function nameOf(el) {
    return (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || el.id || el.tagName).replace(/\s+/g, " ").trim().slice(0, 60);
  }
  function clearHl() { if (hl) { hl.classList.remove("scan-hl"); hl = null; } }
  function mark(el) { clearHl(); if (!el) return; hl = el; el.classList.add("scan-hl"); try { el.scrollIntoView({ block: "center", inline: "nearest" }); } catch (e) {} }
  function say(t) {
    if (live) live.textContent = t; var s = bar && bar.querySelector(".scan-where"); if (s) s.textContent = t;
    if (P().scanSpeak && on && !paused && SG.speak && /^(Control|Group|Back to groups)/.test(t)) { try { SG.speak(t.replace(/ Press select.*$/, "")); } catch (e) {} }
  }

  function showGroup() {
    if (!groups.length) { say("Nothing to scan here."); return; }
    idx = ((idx % groups.length) + groups.length) % groups.length;
    var g = groups[idx];
    if (g.items.length === 1) { mark(g.items[0]); say("Control: " + nameOf(g.items[0]) + ". Press select to use it."); }
    else { mark(g.el); say("Group " + (idx + 1) + " of " + groups.length + ": " + (g.items.length) + " controls. Press select to enter."); }
  }
  function showItem() {
    // The last position is a way back to group level.
    var n = items.length + 1;
    idx = ((idx % n) + n) % n;
    if (idx === items.length) { clearHl(); mark(curGroup.el); say("Back to groups. Press select to go back."); return; }
    mark(items[idx]); say("Control " + (idx + 1) + " of " + items.length + ": " + nameOf(items[idx]) + ".");
  }
  function advance(step) {
    if (!on || paused) return;
    // Count a full pass over the current level; optionally pause when nothing was chosen for N passes.
    var n = mode === "groups" ? groups.length : items.length + 1;
    if (step > 0 && n && idx + step >= n) {
      passes++;
      var lim = +P().scanLoops || 0;
      if (lim > 0 && passes >= lim) { pause(); say("Paused: nothing was chosen for " + lim + " passes. Press Resume, or Escape, to continue."); return; }
    }
    idx += step;
    if (mode === "groups") { groups = collect(); showGroup(); } else showItem();
  }
  function restartTimer() {
    clearInterval(timer);
    if (on && !paused && P().scanAuto !== false) timer = setInterval(function () { advance(1); }, Math.max(400, +P().scanMs || 1200));
  }
  function activate(el) {
    var tag = el.tagName;
    if (tag === "TEXTAREA" || tag === "SELECT" || (tag === "INPUT" && /^(text|tel|search|email|url|password|number|range)$/.test(el.type || "text"))) {
      el.focus(); paused = true; clearInterval(timer); setBarState();
      say("Editing " + nameOf(el) + ". Use your keyboard or switch keys here. Press Escape to resume scanning.");
      return;
    }
    el.click();
  }
  function select() {
    if (!on || paused) return;
    passes = 0;
    if (mode === "groups") {
      var g = groups[idx]; if (!g) return;
      if (g.items.length === 1) { var only = g.items[0]; clearHl(); activate(only); setTimeout(function () { if (on && !paused) { mode = "groups"; idx = 0; groups = collect(); showGroup(); } }, 250); return; }
      curGroup = g; items = g.items; mode = "items"; idx = 0; showItem();
    } else {
      if (idx === items.length) { mode = "groups"; groups = collect(); idx = Math.max(0, groups.indexOf(curGroup) < 0 ? 0 : groups.map(function (x) { return x.el; }).indexOf(curGroup.el)); showGroup(); }
      else { var el = items[idx]; clearHl(); activate(el); setTimeout(function () { if (on && !paused) { items = curGroup.items.filter(function (x) { return document.contains(x) && visible(x); }); if (!items.length) { mode = "groups"; groups = collect(); idx = 0; showGroup(); } else showItem(); } }, 250); }
    }
    restartTimer();
  }

  function buildBar() {
    if (bar) return;
    bar = document.createElement("div"); bar.className = "scan-bar"; bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "Switch scanning");
    bar.innerHTML = '<span class="scan-title">Switch scanning</span><span class="scan-where" aria-hidden="true"></span><button type="button" class="btn btn-sm scan-sel">Select</button><button type="button" class="btn btn-sm scan-step">Next</button><button type="button" class="btn btn-sm scan-pause">Pause</button><button type="button" class="btn btn-sm scan-off">Turn off</button><span class="scan-keys">Select: Space or Enter. Pause: Esc.</span>';
    live = document.createElement("div"); live.className = "vis-hidden"; live.setAttribute("aria-live", "polite"); live.id = "scanLive";
    document.body.appendChild(bar); document.body.appendChild(live);
    bar.querySelector(".scan-sel").addEventListener("click", select);
    bar.querySelector(".scan-step").addEventListener("click", function () { advance(1); restartTimer(); });
    bar.querySelector(".scan-pause").addEventListener("click", function () { paused ? resume() : pause(); });
    bar.querySelector(".scan-off").addEventListener("click", function () { var c = document.querySelector('#inChips input[value="symbols"]'); if (c && c.checked) c.click(); });
  }
  function setBarState() { if (bar) bar.querySelector(".scan-pause").textContent = paused ? "Resume" : "Pause"; document.documentElement.classList.toggle("scan-paused", paused); }
  function pause() { paused = true; clearInterval(timer); clearHl(); setBarState(); say("Paused. Press Escape or Resume to continue."); }
  function resume() { passes = 0; paused = false; mode = "groups"; idx = 0; groups = collect(); setBarState(); showGroup(); restartTimer(); }

  function start() {
    if (on) return; on = true; paused = false; passes = 0; buildBar(); bar.hidden = false;
    document.documentElement.classList.add("scan-on");
    mode = "groups"; idx = 0; groups = collect(); setBarState(); showGroup(); restartTimer();
  }
  function stop() {
    if (!on) return; on = false; clearInterval(timer); clearHl();
    document.documentElement.classList.remove("scan-on", "scan-paused"); if (bar) bar.hidden = true;
  }
  function sync() { if (P().scanOn) start(); else stop(); }

  document.addEventListener("keydown", function (e) {
    if (!on) return;
    var t = e.target, typing = t && (t.tagName === "TEXTAREA" || t.tagName === "SELECT" || (t.tagName === "INPUT" && /^(text|tel|search|email|url|password|number)$/.test(t.type || "text")));
    if (e.key === "Escape") {
      if (document.querySelector("dialog[open]")) return; // let the dialog close itself first
      if (typing) t.blur(); paused ? resume() : pause(); e.preventDefault(); return;
    }
    if (typing || paused) return;
    if (e.target && e.target.closest && e.target.closest(".scan-bar")) return;
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); select(); }
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); advance(1); restartTimer(); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); advance(-1); restartTimer(); }
  }, true);

  window.addEventListener("sangam:profile", function () { sync(); if (on) restartTimer(); });
  window.addEventListener("hashchange", function () { if (on && !paused) setTimeout(function () { mode = "groups"; idx = 0; groups = collect(); showGroup(); }, 50); });

  window.SangamSwitch = { state: function () { return { on: on, paused: paused, mode: mode, index: idx, group: curGroup && curGroup.el, highlighted: hl }; }, start: start, stop: stop };
  sync();
})();
