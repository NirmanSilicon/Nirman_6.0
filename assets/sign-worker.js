/*
 * Runs the pretrained ISL/ASL word model off the main thread.
 *
 * Why: one word takes 1 to 6 seconds of pure JavaScript maths. On the page's main thread that froze the camera
 * and hand tracking for the whole time, and frames lost during a freeze were replaced by the last good one, which
 * bent the very motion the model was trying to read. Here the maths runs in its own thread, so tracking keeps going.
 *
 * Protocol (all messages carry a reqId that is echoed back):
 *   -> { type:"load", reqId, key, baseUrl }                      <- { reqId, ok:true } | { reqId, ok:false, error }
 *   -> { type:"classify", reqId, key, opts, frames:[{points,t}] } <- { reqId, ok:true, result } | { reqId, ok:false, error }
 * `baseUrl` must be absolute (a worker resolves relative URLs against its own script, not the page).
 */
"use strict";
importScripts("sign-model.js");
var M = self.SangamSignModel, adapters = {};

self.onmessage = function (e) {
  var m = e.data || {};
  if (m.type === "load") {
    var a = new M.PretrainedAdapter(m.baseUrl, function (url) { return fetch(url, { cache: "no-store" }); }, {});
    a.load().then(function () { adapters[m.key] = a; self.postMessage({ reqId: m.reqId, ok: true }); },
      function (err) { self.postMessage({ reqId: m.reqId, ok: false, error: String(err && err.message || err) }); });
  } else if (m.type === "classify") {
    try {
      var ad = adapters[m.key]; if (!ad) throw new Error("model " + m.key + " is not loaded in the worker");
      ad.opts = m.opts || {};
      self.postMessage({ reqId: m.reqId, ok: true, result: ad.classify(m.frames) });
    } catch (err) { self.postMessage({ reqId: m.reqId, ok: false, error: String(err && err.message || err) }); }
  }
};
