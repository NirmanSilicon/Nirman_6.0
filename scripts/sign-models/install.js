#!/usr/bin/env node
"use strict";
/*
 * SANGAM sign-language model installer.
 *
 *   npm run models:install                       # ISL (INCLUDE)
 *   npm run models:install -- asl --accept-wlasl-terms
 *   npm run models:install -- all --accept-wlasl-terms
 *   npm run models:install -- isl --from ./downloads   # use archives you downloaded yourself (offline)
 *   npm run models:verify                        # re-check installed files against their recorded hashes
 *
 * For each model listed in vendor/sign-models/<lang>/manifest.json it:
 *   1. downloads the official AI4Bharat OpenHands release archives (or reads them from --from),
 *   2. checks every archive's size and SHA-256 against the manifest (a mismatch stops the install),
 *   3. reads the PyTorch checkpoint with scripts/sign-models/torch-ckpt.js (no Python, no code from the file runs),
 *   4. checks every tensor's name and shape against the architecture SANGAM implements,
 *   5. derives the label list exactly as OpenHands does, and checks it matches the classifier size,
 *   6. writes vendor/sign-models/<lang>/<modelDir>/{model.json, weights.bin, install-receipt.json}.
 * It only ever writes inside vendor/sign-models/<lang>/<modelDir>/ and vendor/sign-models/.downloads/.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { readZip } = require("./zipread");
const { readCheckpoint } = require("./torch-ckpt");

const ROOT = path.resolve(__dirname, "..", "..");
const MODELS = path.join(ROOT, "vendor", "sign-models");
const DL = path.join(MODELS, ".downloads");
const FORMAT = "sangam-sign-model/1";
const INSTALLER_VERSION = 1;

// OpenHands DecoupledGCN block layout (decoupled_gcn.py): name, in, out, stride, residual
const LAYERS = [
  ["l1", 2, 64, 1, "none"], ["l2", 64, 64, 1, "identity"], ["l3", 64, 64, 1, "identity"], ["l4", 64, 64, 1, "identity"],
  ["l5", 64, 128, 2, "conv"], ["l6", 128, 128, 1, "identity"], ["l7", 128, 128, 1, "identity"],
  ["l8", 128, 256, 2, "conv"], ["l9", 256, 256, 1, "identity"], ["l10", 256, 256, 1, "identity"]
].map(([name, i, o, stride, residual]) => ({ name, in: i, out: o, stride, residual }));
const GROUPS = 8, V = 27;

function expectedShapes(numClass) {
  const s = {}, P = "model.encoder.";
  const bn = (p, n) => { ["weight", "bias", "running_mean", "running_var"].forEach((k) => { s[p + "." + k] = [n]; }); };
  bn(P + "data_bn", 2 * V);
  for (const L of LAYERS) {
    const p = P + L.name + ".";
    s[p + "gcn1.decoupled_A"] = [3, GROUPS, V, V];
    s[p + "gcn1.linear_weight"] = [L.in, 3 * L.out];
    s[p + "gcn1.linear_bias"] = [1, 3 * L.out, 1, 1];
    bn(p + "gcn1.bn0", 3 * L.out); bn(p + "gcn1.bn", L.out);
    if (L.in !== L.out) { s[p + "gcn1.down.0.weight"] = [L.out, L.in, 1, 1]; s[p + "gcn1.down.0.bias"] = [L.out]; bn(p + "gcn1.down.1", L.out); }
    s[p + "tcn1.conv.weight"] = [L.out, L.out, 9, 1]; s[p + "tcn1.conv.bias"] = [L.out]; bn(p + "tcn1.bn", L.out);
    if (L.residual === "conv") { s[p + "residual.conv.weight"] = [L.out, L.in, 1, 1]; s[p + "residual.conv.bias"] = [L.out]; bn(p + "residual.bn", L.out); }
    s[p + "conv_ta.weight"] = [1, L.out, 9]; s[p + "conv_ta.bias"] = [1];
    s[p + "conv_sa.weight"] = [1, L.out, V]; s[p + "conv_sa.bias"] = [1];
    s[p + "fc1c.weight"] = [L.out / 2, L.out]; s[p + "fc1c.bias"] = [L.out / 2];
    s[p + "fc2c.weight"] = [L.out, L.out / 2]; s[p + "fc2c.bias"] = [L.out];
  }
  s["model.decoder.classifier.weight"] = [numClass, 256];
  s["model.decoder.classifier.bias"] = [numClass];
  return s;
}

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const log = (...a) => console.log(...a);

function parseCsv(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.length > 1 || r[0]);
}
// Python's sorted() on str compares code points; for these ASCII/BMP labels this equals a code-unit comparison.
const pySort = (arr) => arr.slice().sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
const display = (label) => label.replace(/^\s*(?:\d+|Ex)\s*\.\s*/i, "").replace(/(\S)\(/g, "$1 (").replace(/\s+/g, " ").trim();

function deriveLabels(man, archives) {
  const L = man.source.labels, zip = archives[L.file];
  if (/\.csv$/.test(L.entry)) {
    const rows = parseCsv(zip.read(L.entry).toString("utf8"));
    const col = rows[0].indexOf("Word"); if (col < 0) throw new Error("Label CSV has no Word column");
    return pySort(Array.from(new Set(rows.slice(1).map((r) => r[col]))));
  }
  const json = JSON.parse(zip.read(L.entry).toString("utf8"));
  return pySort(json.map((g) => g.gloss));
}

async function fetchTo(url, dest, expectBytes) {
  log("  downloading " + url);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error("Download failed: HTTP " + res.status + " for " + url);
  const buf = Buffer.from(await res.arrayBuffer());
  if (expectBytes && buf.length !== expectBytes) throw new Error("Downloaded " + buf.length + " bytes, expected " + expectBytes + " for " + url);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return buf;
}

async function obtain(file, fromDir) {
  const local = fromDir ? path.join(fromDir, file.name) : path.join(DL, file.name);
  let buf = null;
  if (fs.existsSync(local)) { buf = fs.readFileSync(local); log("  using " + path.relative(ROOT, local) + (fromDir ? "" : " (already downloaded)")); }
  else if (fromDir) throw new Error(file.name + " was not found in " + fromDir + ". Download it from " + file.url);
  else {
    try { buf = await fetchTo(file.url, local, file.bytes); }
    catch (e) {
      throw new Error(e.message + "\nIf this computer cannot reach github.com, download these files on another computer and run:\n" +
        "  npm run models:install -- <isl|asl> --from <folder containing them>\n  " + file.url);
    }
  }
  const h = sha256(buf);
  if (buf.length !== file.bytes || h !== file.sha256) {
    throw new Error("Integrity check FAILED for " + file.name + ": got " + buf.length + " bytes, sha256 " + h + "; expected " + file.bytes + " bytes, sha256 " + file.sha256 + ". The file was not used. Delete it and try again.");
  }
  log("  verified " + file.name + " (sha256 " + h.slice(0, 16) + "…)");
  return buf;
}

async function installOne(lang, opts) {
  const manPath = path.join(MODELS, lang, "manifest.json");
  const man = JSON.parse(fs.readFileSync(manPath, "utf8"));
  log("\n[" + lang + "] " + man.name);
  if (man.licence.redistribution === "download-only" && lang === "asl" && !opts.acceptWlasl) {
    throw new Error("The ASL model is trained on WLASL, whose terms (C-UDA 1.0) allow academic and computational use only and say \"No commercial usage is allowed\" (https://dxli94.github.io/WLASL/).\nIf your use is non-commercial and you accept those terms, run:  npm run models:install -- asl --accept-wlasl-terms");
  }
  const archives = {}, raw = {};
  for (const f of man.source.files) { raw[f.name] = await obtain(f, opts.from); archives[f.name] = readZip(raw[f.name]); }
  const ckZip = archives[man.source.files.find((f) => f.role === "checkpoint").name];
  const config = ckZip.read(man.source.configEntry).toString("utf8");
  for (const marker of ["decoupled-gcn", "num_nodes: 27", "mediapipe_holistic_minimal_27", "shoulder_mediapipe_holistic_minimal_27", "type: fc"]) {
    if (!config.includes(marker)) throw new Error("Checkpoint config does not describe the expected SL-GCN pose model (missing \"" + marker + "\")");
  }
  log("  reading checkpoint " + man.source.checkpointEntry);
  const ck = readCheckpoint(ckZip.read(man.source.checkpointEntry));

  const labels = deriveLabels(man, archives);
  const cls = ck.tensors.get("model.decoder.classifier.weight");
  if (!cls) throw new Error("Checkpoint has no classifier");
  if (cls.shape[0] !== labels.length) throw new Error("Label list has " + labels.length + " entries but the classifier has " + cls.shape[0] + " outputs");
  const excluded = (man.source.excludeLabels || []).map((l) => { const i = labels.indexOf(l); if (i < 0) throw new Error("Excluded label not found: " + l); return i; });
  const subsets = {};
  for (const [k, s] of Object.entries(man.source.subsets || {})) {
    const names = JSON.parse(archives[s.file].read(s.entry).toString("utf8")).map((g) => g.gloss);
    subsets[k] = names.map((n) => { const i = labels.indexOf(n); if (i < 0) throw new Error("Subset gloss not in vocabulary: " + n); return i; }).sort((a, b) => a - b);
  }

  // shape check, then pack only the tensors inference needs (eye_list / graph A / counters are not needed)
  const want = expectedShapes(labels.length), names = Object.keys(want);
  for (const n of names) {
    const t = ck.tensors.get(n);
    if (!t) throw new Error("Checkpoint is missing tensor " + n);
    if (t.shape.join("x") !== want[n].join("x")) throw new Error("Tensor " + n + " has shape " + t.shape.join("x") + ", expected " + want[n].join("x"));
  }
  const unexpected = Array.from(ck.tensors.keys()).filter((n) => !want[n] && !/(\.eye_list|\.A|num_batches_tracked)$/.test(n));
  if (unexpected.length) throw new Error("Checkpoint has tensors SANGAM does not implement: " + unexpected.slice(0, 5).join(", "));
  let total = 0; const table = {};
  for (const n of names) { const t = ck.tensors.get(n); table[n] = { offset: total, shape: t.shape }; total += t.data.length; }
  const packed = new Float32Array(total);
  for (const n of names) packed.set(ck.tensors.get(n).data, table[n].offset);
  const wbuf = Buffer.from(packed.buffer, packed.byteOffset, packed.byteLength);
  const wsha = sha256(wbuf);

  const model = {
    format: FORMAT, id: man.id, language: man.language, languageCode: man.languageCode,
    architecture: "openhands-sl-gcn", inChannels: 2, numPoints: V, groups: GROUPS, layers: LAYERS,
    numClass: labels.length, labels, display: labels.map(display), excluded, subsets,
    preprocessing: man.preprocessing,
    tensors: table, weightsFile: "weights.bin", weightsBytes: wbuf.length, weightsSha256: wsha, labelsSha256: sha256(Buffer.from(JSON.stringify(labels))),
    checkpoint: { entry: man.source.checkpointEntry, epoch: ck.meta.epoch, globalStep: ck.meta.global_step, lightning: ck.meta["pytorch-lightning_version"] },
    sourceFiles: man.source.files.map((f) => ({ name: f.name, url: f.url, sha256: f.sha256 })),
    installerVersion: INSTALLER_VERSION
  };
  const outDir = path.join(MODELS, lang, man.modelDir);
  fs.mkdirSync(outDir, { recursive: true });
  const existing = path.join(outDir, "weights.bin");
  if (opts.verifyOnly) {
    if (!fs.existsSync(existing)) throw new Error("Not installed: " + path.relative(ROOT, existing));
    const have = sha256(fs.readFileSync(existing));
    if (have !== wsha) throw new Error("Installed weights differ from the official release (" + have + " vs " + wsha + ")");
    log("  installed weights.bin is identical to the one derived from the official release (sha256 " + wsha.slice(0, 16) + "…)");
    return;
  }
  fs.writeFileSync(path.join(outDir, "weights.bin.tmp"), wbuf);
  fs.writeFileSync(path.join(outDir, "model.json.tmp"), JSON.stringify(model));
  fs.renameSync(path.join(outDir, "weights.bin.tmp"), path.join(outDir, "weights.bin"));
  fs.renameSync(path.join(outDir, "model.json.tmp"), path.join(outDir, "model.json"));
  fs.writeFileSync(path.join(outDir, "install-receipt.json"), JSON.stringify({
    installed: new Date().toISOString(), modelId: man.id, weightsSha256: wsha, weightsBytes: wbuf.length,
    tensors: names.length, parameters: total, classes: labels.length, excludedLabels: man.source.excludeLabels || [],
    sourceFiles: model.sourceFiles, installerVersion: INSTALLER_VERSION
  }, null, 2));
  log("  installed " + labels.length + " signs (" + excluded.length + " excluded), " + total.toLocaleString("en") + " parameters -> " + path.relative(ROOT, outDir));
}

function verifyInstalled(lang) {
  const man = JSON.parse(fs.readFileSync(path.join(MODELS, lang, "manifest.json"), "utf8"));
  const dir = path.join(MODELS, lang, man.modelDir);
  if (!fs.existsSync(path.join(dir, "model.json"))) { log("[" + lang + "] not installed"); return "missing"; }
  const model = JSON.parse(fs.readFileSync(path.join(dir, "model.json"), "utf8"));
  const w = fs.readFileSync(path.join(dir, "weights.bin"));
  const ok = w.length === model.weightsBytes && sha256(w) === model.weightsSha256 && model.id === man.id;
  log("[" + lang + "] " + (ok ? "OK" : "CORRUPT") + "  " + model.id + "  weights sha256 " + sha256(w).slice(0, 16) + "…");
  return ok ? "ok" : "corrupt";
}

async function main(argv) {
  const args = argv.slice(2);
  const opts = { acceptWlasl: args.includes("--accept-wlasl-terms"), verifyOnly: args.includes("--against-release") };
  const fi = args.indexOf("--from"); if (fi >= 0) opts.from = path.resolve(args[fi + 1] || ".");
  if (args.includes("--verify")) {
    const res = ["isl", "asl"].map(verifyInstalled);
    process.exitCode = res.includes("corrupt") ? 1 : 0; return;
  }
  const which = args.find((a) => ["isl", "asl", "all"].includes(a)) || "isl";
  const langs = which === "all" ? ["isl", "asl"] : [which];
  let failed = 0;
  for (const l of langs) {
    try { await installOne(l, opts); }
    catch (e) { failed++; console.error("\n[" + l + "] NOT installed: " + e.message); }
  }
  process.exitCode = failed ? 1 : 0;
}

if (require.main === module) main(process.argv);
module.exports = { expectedShapes, deriveLabels, parseCsv, pySort, display, LAYERS, installOne, verifyInstalled };
