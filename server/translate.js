/*
 * SANGAM translation adapter.
 *
 * SANGAM never invents translations. Real translation needs an external
 * provider; this module is the only place that talks to one. Credentials come
 * from environment variables on the server and are never sent to the browser.
 *
 *   TRANSLATE_PROVIDER = none (default) | libretranslate | google
 *
 *   libretranslate : LIBRETRANSLATE_URL (e.g. http://localhost:5000), optional LIBRETRANSLATE_API_KEY
 *   google         : GOOGLE_TRANSLATE_API_KEY, optional GOOGLE_TRANSLATE_URL (test/proxy override)
 *
 * Provider interface (add your own by extending PROVIDERS):
 *   translate({ text, source, target }) -> Promise<{ text, detected? }>
 *   languages()                         -> Promise<string[] | null>   (null = unknown, claim nothing)
 *
 * Language codes passed in are BCP-47 tags from the UI (en-IN, hi-IN, or-IN ...).
 * They are reduced to the primary subtag before calling a provider.
 */
"use strict";

const TIMEOUT_MS = parseInt(process.env.TRANSLATE_TIMEOUT_MS, 10) || 8000;

function baseLang(tag) {
  return String(tag || "").toLowerCase().split(/[-_]/)[0];
}

class TranslateError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status || 502;
  }
}

async function postJson(url, body, headers) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, headers || {}),
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
  } catch (e) {
    if (e && e.name === "AbortError") throw new TranslateError("provider_timeout", "The translation service took too long to answer.", 504);
    throw new TranslateError("provider_unreachable", "The translation service could not be reached.", 502);
  } finally {
    clearTimeout(timer);
  }
  let data = null;
  try { data = await res.json(); } catch (e) { /* non-JSON body */ }
  if (!res.ok) {
    throw new TranslateError("provider_error", "The translation service returned an error (" + res.status + ").", 502);
  }
  if (data == null) throw new TranslateError("provider_bad_response", "The translation service sent an unreadable answer.", 502);
  return data;
}

const PROVIDERS = {
  libretranslate: {
    configured() { return !!process.env.LIBRETRANSLATE_URL; },
    async translate({ text, source, target }) {
      const base = process.env.LIBRETRANSLATE_URL.replace(/\/+$/, "");
      const body = { q: text, source: source || "auto", target, format: "text" };
      if (process.env.LIBRETRANSLATE_API_KEY) body.api_key = process.env.LIBRETRANSLATE_API_KEY;
      const data = await postJson(base + "/translate", body);
      if (typeof data.translatedText !== "string") throw new TranslateError("provider_bad_response", "Unexpected translation response.", 502);
      return { text: data.translatedText, detected: data.detectedLanguage && data.detectedLanguage.language };
    },
    async languages() {
      const base = process.env.LIBRETRANSLATE_URL.replace(/\/+$/, "");
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(base + "/languages", { signal: ctl.signal });
        if (!res.ok) return null;
        const list = await res.json();
        return Array.isArray(list) ? list.map((l) => l.code) : null;
      } catch (e) {
        return null;
      } finally {
        clearTimeout(timer);
      }
    },
  },
  google: {
    configured() { return !!process.env.GOOGLE_TRANSLATE_API_KEY; },
    async translate({ text, source, target }) {
      const base = process.env.GOOGLE_TRANSLATE_URL || "https://translation.googleapis.com/language/translate/v2";
      const body = { q: text, target, format: "text" };
      if (source) body.source = source;
      // Key travels in a header, not the URL, so it never lands in access logs.
      const data = await postJson(base, body, { "X-goog-api-key": process.env.GOOGLE_TRANSLATE_API_KEY });
      const t = data && data.data && data.data.translations && data.data.translations[0];
      if (!t || typeof t.translatedText !== "string") throw new TranslateError("provider_bad_response", "Unexpected translation response.", 502);
      return { text: t.translatedText, detected: t.detectedSourceLanguage };
    },
    // Google documents its supported set; we do not enumerate it here, so we
    // return null and the UI makes no per-language claim for this provider.
    async languages() { return null; },
  },
};

function providerName() {
  const n = String(process.env.TRANSLATE_PROVIDER || "none").toLowerCase();
  return PROVIDERS[n] ? n : "none";
}

function isConfigured() {
  const n = providerName();
  return n !== "none" && PROVIDERS[n].configured();
}

let langCache = { at: 0, list: undefined };
async function status() {
  const name = providerName();
  if (name === "none") {
    return { configured: false, provider: "none", reason: "no_provider", message: "Translation is not configured on this server. Set TRANSLATE_PROVIDER and the matching credentials in .env." };
  }
  if (!PROVIDERS[name].configured()) {
    return { configured: false, provider: name, reason: "missing_credentials", message: "A translation provider is selected but its credentials are missing on the server." };
  }
  if (Date.now() - langCache.at > 10 * 60 * 1000 || langCache.provider !== name) {
    langCache = { at: Date.now(), provider: name, list: await PROVIDERS[name].languages() };
  }
  return {
    configured: true,
    provider: name,
    // null means "provider did not tell us"; the UI must not claim per-language support then.
    languages: langCache.list,
  };
}

async function translate({ text, source, target }) {
  if (!isConfigured()) {
    throw new TranslateError("translation_not_configured", "Translation is not configured on this server.", 501);
  }
  const src = baseLang(source);
  const tgt = baseLang(target);
  if (!tgt) throw new TranslateError("bad_request", "A target language is required.", 400);
  if (src && src === tgt) return { text, provider: providerName(), unchanged: true };
  const out = await PROVIDERS[providerName()].translate({ text, source: src || null, target: tgt });
  return { text: out.text, detected: out.detected || null, provider: providerName(), unchanged: false };
}

module.exports = { translate, status, isConfigured, providerName, baseLang, TranslateError };
