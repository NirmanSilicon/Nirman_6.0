/*
 * Local-only helper for the ISL evaluation (NOT part of the SANGAM app; bound to 127.0.0.1).
 * Serves the vendored MediaPipe files and the batch page, serves extracted video frames from FRAMES_DIR, and lets the page
 * save the keypoints it extracted:  POST /save?mode=<name>&id=<video id>  ->  datasets/isl/keypoints/<mode>/<id>.json
 *
 *   node datasets/isl/tools/dev-server.js            (default port 8130)
 */
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const PROJ = path.resolve(__dirname, "..", "..", "..");
const FRAMES = path.resolve(process.env.FRAMES_DIR || "D:/SANGAM_ISL_data/frames");
const OUT = path.join(PROJ, "datasets", "isl", "keypoints");
const PORT = +process.env.ISL_DEV_PORT || 8130;
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".csv": "text/csv; charset=utf-8", ".jpg": "image/jpeg", ".wasm": "application/wasm", ".data": "application/octet-stream", ".binarypb": "application/octet-stream", ".tflite": "application/octet-stream" };
const STATIC = [["/vendor/mediapipe/holistic/", path.join(PROJ, "vendor", "mediapipe", "holistic")], ["/datasets/isl/tools/", __dirname], ["/datasets/isl/reports/", path.join(PROJ, "datasets", "isl", "reports")], ["/frames/", FRAMES]];

function within(base, rel) { const p = path.resolve(base, "." + path.sep + rel); return p === base || p.startsWith(base + path.sep) ? p : null; }
const send = (res, code, body, type) => { res.writeHead(code, { "Content-Type": type || "text/plain", "Cache-Control": "no-store" }); res.end(body); };

http.createServer((req, res) => {
  const u = new URL(req.url, "http://127.0.0.1");
  if (req.method === "POST" && u.pathname === "/save") {
    const mode = (u.searchParams.get("mode") || "").replace(/[^\w.-]/g, ""), id = (u.searchParams.get("id") || "").replace(/[^\w.-]/g, "");
    if (!mode || !id) return send(res, 400, "mode and id required");
    const chunks = []; req.on("data", (c) => chunks.push(c));
    req.on("end", () => { const dir = path.join(OUT, mode); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, id + ".json"), Buffer.concat(chunks)); send(res, 200, "ok"); });
    return;
  }
  if (req.method !== "GET") return send(res, 405, "method not allowed");
  if (u.pathname === "/done") { const mode = (u.searchParams.get("mode") || "").replace(/[^\w.-]/g, ""); const d = path.join(OUT, mode); return send(res, 200, JSON.stringify(fs.existsSync(d) ? fs.readdirSync(d).map((f) => f.replace(/\.json$/, "")) : []), "application/json"); }
  for (const [prefix, base] of STATIC) {
    if (!u.pathname.startsWith(prefix)) continue;
    const p = within(base, decodeURIComponent(u.pathname.slice(prefix.length)));
    if (!p || !fs.existsSync(p) || !fs.statSync(p).isFile()) return send(res, 404, "not found");
    return send(res, 200, fs.readFileSync(p), MIME[path.extname(p).toLowerCase()] || "application/octet-stream");
  }
  send(res, 404, "not found");
}).listen(PORT, "127.0.0.1", () => console.log("ISL dev server on http://127.0.0.1:" + PORT + "  frames=" + FRAMES));
