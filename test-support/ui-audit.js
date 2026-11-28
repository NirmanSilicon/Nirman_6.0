/*
 * In-page accessibility audit for the account area. NOT a replacement for axe-core, screen readers or real users.
 *
 * How to run (browser console on a signed-in page, or through a browser tool):
 *   1. Paste this file's contents, or load it with a <script> tag.
 *   2. Visit a route, then call   SangamUiAudit()   and read the result.
 *      To sweep routes:  for (const h of ["#/me", "#/me/settings"]) { location.hash = h; await new Promise(r => setTimeout(r, 800)); console.log(SangamUiAudit()); }
 *
 * What it checks on the visible account area (#acct) and header navigation:
 *   - exactly one visible <h1>
 *   - every link, button, field and select has an accessible name (aria-labelledby, aria-label, <label>, text, title)
 *   - images have alt
 *   - no duplicate ids in the document (a duplicate silently breaks <label for>; one real defect of this kind was found with this check)
 *   - the page title is not empty
 *   - text contrast (WCAG ratio) for every visible text run whose background is a flat colour. Text on gradients or images is
 *     SKIPPED (the dark hero cards), so those need checking by eye.
 *
 * Result: { route, problems: [...], contrastChecked, lowContrast: [...first 6], lowContrastCount }
 * Test class: automated structural check run in a real browser. It does not tell you how a screen reader sounds.
 */
(function (root) {
  "use strict";
  root.SangamUiAudit = function () {
    var area = document.getElementById("acct"), out = { route: location.hash, problems: [] };
    if (!area) { out.problems.push("no #acct element"); return out; }
    function vis(e) { var r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && !e.closest("[hidden]"); }
    function name(e) {
      var lb = e.getAttribute("aria-labelledby");
      if (lb) { var t0 = lb.split(/\s+/).map(function (i) { return (document.getElementById(i) || {}).textContent || ""; }).join(" ").trim(); if (t0) return t0; }
      var al = e.getAttribute("aria-label"); if (al) return al;
      if (e.labels && e.labels.length) { var t1 = Array.prototype.map.call(e.labels, function (l) { return l.textContent; }).join(" ").trim(); if (t1) return t1; }
      var t = (e.innerText || e.textContent || "").trim(); if (t) return t;
      if (e.title) return e.title;
      var im = e.querySelector("img[alt]"); return im && im.alt ? im.alt : "";
    }
    var h1s = Array.prototype.filter.call(area.querySelectorAll("h1"), vis);
    if (h1s.length !== 1) out.problems.push("h1 count " + h1s.length);
    document.querySelectorAll("#acct a[href], #acct button, #acct input:not([type=hidden]), #acct select, #acct textarea, #axNav button, #axNav a").forEach(function (e) {
      if (!vis(e) && !e.matches("input[type=checkbox], input[type=radio]")) return;
      if (!name(e)) out.problems.push("no accessible name: " + e.tagName + " " + String(e.name || e.id || e.className).slice(0, 30));
    });
    area.querySelectorAll("img").forEach(function (i) { if (!i.hasAttribute("alt")) out.problems.push("img without alt"); });
    var ids = {}; document.querySelectorAll("[id]").forEach(function (e) { ids[e.id] = (ids[e.id] || 0) + 1; });
    Object.keys(ids).forEach(function (k) { if (ids[k] > 1) out.problems.push("duplicate id " + k); });
    if (!document.title) out.problems.push("empty title");

    function lum(c) { function f(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); } return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); }
    function parse(s) { var m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; var p = m[1].split(",").map(parseFloat); return { c: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 }; }
    function bgOf(e) { for (var n = e; n && n.nodeType === 1; n = n.parentElement) { var cs = getComputedStyle(n); if (cs.backgroundImage !== "none") return null; var p = parse(cs.backgroundColor); if (p && p.a > 0.9) return p.c; } return [255, 255, 255]; }
    var checked = 0, low = [], seen = new Set(), walker = document.createTreeWalker(area, NodeFilter.SHOW_TEXT), n;
    while ((n = walker.nextNode())) {
      var t = n.textContent.trim(), e = n.parentElement; if (!t || !e || seen.has(e) || !vis(e)) continue; seen.add(e);
      var cs2 = getComputedStyle(e), fg = parse(cs2.color), bg = bgOf(e); if (!fg || !bg) continue; checked++;
      var L1 = lum(fg.c), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      var px = parseFloat(cs2.fontSize), bold = parseInt(cs2.fontWeight, 10) >= 700, large = px >= 24 || (px >= 18.66 && bold);
      if (ratio < (large ? 3 : 4.5)) low.push(ratio.toFixed(2) + ' "' + t.slice(0, 28) + '" ' + e.tagName);
    }
    out.contrastChecked = checked; out.lowContrast = low.slice(0, 6); out.lowContrastCount = low.length;
    return out;
  };
})(typeof window !== "undefined" ? window : this);
