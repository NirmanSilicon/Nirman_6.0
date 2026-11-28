/* FasalSathi dynamic multilingual layer — frontend only.
   Translates dynamic text not covered by the built-in locale dictionary.
   Requires internet access for first-time translations; results are cached per browser. */
(() => {
  "use strict";
  const LANGS = {hi:"hi", en:"en", or:"or", mr:"mr", bn:"bn", te:"te", ta:"ta", pa:"pa"};
  const originals = new WeakMap();
  const translated = new WeakMap();
  const cachePrefix = "fs_i18n_v2:";
  let current = localStorage.getItem("fasalsathi_language") || "hi";
  let busy = false;
  const queue = [];
  const queued = new Set();
  const skipTags = new Set(["SCRIPT","STYLE","NOSCRIPT","TEXTAREA","INPUT","OPTION","SELECT","CODE","PRE"]);
  const latin = /[A-Za-z]/;

  function isInDictionary(el) {
    return !!(el && el.closest && el.closest("[data-i18n], [data-i18n-skip], .no-translate"));
  }
  function cacheKey(lang, text) { return cachePrefix + lang + ":" + text; }
  function getCached(lang, text) {
    try { return localStorage.getItem(cacheKey(lang,text)); } catch (_) { return null; }
  }
  function setCached(lang, text, value) {
    try { localStorage.setItem(cacheKey(lang,text), value); } catch (_) {}
  }
  async function requestTranslation(text, lang) {
    const cached = getCached(lang, text);
    if (cached) return cached;
    const url = "https://api.mymemory.translated.net/get?q=" +
      encodeURIComponent(text.slice(0, 450)) + "&langpair=en%7C" + encodeURIComponent(LANGS[lang] || lang);
    const res = await fetch(url, {headers: {"Accept":"application/json"}});
    if (!res.ok) throw new Error("translation unavailable");
    const data = await res.json();
    const result = data && data.responseData && data.responseData.translatedText;
    if (!result || data.responseStatus !== 200) throw new Error("translation unavailable");
    const clean = String(result).replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,"&");
    setCached(lang, text, clean);
    return clean;
  }
  function shouldTranslate(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return false;
    const parent = node.parentElement;
    if (!parent || skipTags.has(parent.tagName) || isInDictionary(parent)) return false;
    const text = node.nodeValue.trim();
    if (!text || text.length < 2 || !latin.test(text)) return false;
    if (/^[\d\s.,:%₹$+\-()/#]+$/.test(text)) return false;
    return true;
  }
  function enqueue(node) {
    if (!shouldTranslate(node) || queued.has(node)) return;
    const original = originals.get(node) || node.nodeValue;
    if (!originals.has(node)) originals.set(node, original);
    const text = original.trim();
    if (!text || !latin.test(text)) return;
    queued.add(node);
    queue.push({node, original, text});
    drain();
  }
  async function drain() {
    if (busy) return;
    busy = true;
    while (queue.length) {
      const item = queue.shift();
      queued.delete(item.node);
      if (!item.node.isConnected) continue;
      const lang = current;
      if (lang === "en") {
        item.node.nodeValue = item.original;
        continue;
      }
      const cached = getCached(lang, item.text);
      try {
        const result = cached || await requestTranslation(item.text, lang);
        if (current === lang && item.node.isConnected && item.node.nodeValue.trim() === item.original.trim()) {
          const leading = item.original.match(/^\s*/)[0], trailing = item.original.match(/\s*$/)[0];
          item.node.nodeValue = leading + result + trailing;
          translated.set(item.node, lang);
        }
      } catch (_) {
        // Keep original text rather than breaking the page when a translation service is unavailable.
      }
      await new Promise(resolve => setTimeout(resolve, 90));
    }
    busy = false;
  }
  function scan(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) enqueue(n);
    if (root.querySelectorAll) {
      root.querySelectorAll("input[placeholder],textarea[placeholder],button[title],[aria-label]").forEach(el => {
        if (isInDictionary(el)) return;
        ["placeholder","title","aria-label"].forEach(attr => {
          const val = el.getAttribute(attr);
          if (!val || !latin.test(val)) return;
          const key = "data-fs-original-" + attr;
          if (!el.hasAttribute(key)) el.setAttribute(key, val);
          const original = el.getAttribute(key);
          if (current === "en") el.setAttribute(attr, original);
          else requestTranslation(original, current).then(t => {
            if (current !== "en" && el.isConnected) el.setAttribute(attr, t);
          }).catch(()=>{});
        });
      });
    }
  }
  function switchLanguage(lang) {
    current = LANGS[lang] ? lang : "hi";
    // Restore only text nodes previously translated by this layer.
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const original = originals.get(n);
      if (original !== undefined) n.nodeValue = original;
    }
    scan();
  }
  window.addEventListener("fasalsathi:language-changed", e => switchLanguage(e.detail && e.detail.language));
  const observer = new MutationObserver(records => {
    for (const record of records) {
      record.addedNodes && record.addedNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) enqueue(node);
        else if (node.nodeType === Node.ELEMENT_NODE) scan(node);
      });
      if (record.type === "characterData" && record.target.nodeType === Node.TEXT_NODE) {
        const n = record.target;
        if (translated.has(n)) return;
        enqueue(n);
      }
    }
  });
  function start() {
    scan();
    observer.observe(document.body, {subtree:true, childList:true, characterData:true});
    switchLanguage(current);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {once:true});
  else start();
})();