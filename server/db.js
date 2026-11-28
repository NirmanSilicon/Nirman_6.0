/*
 * SANGAM data store: one JSON file, loaded into memory, written back atomically.
 *
 * Why not SQLite: the better-sqlite3 package needs a native build step that fails on many Windows machines, and Node's
 * built-in node:sqlite needs a newer Node than this project's "Node 18 or newer". A single JSON file needs nothing
 * installed and is easy to inspect, back up and delete (which matters for a privacy-sensitive app).
 *
 * Limits, stated plainly: one server process only (two processes would overwrite each other), the whole data set is held
 * in memory, and every write rewrites the file. That is fine for a pilot of hundreds of accounts, not for thousands of
 * concurrent users. The repository functions in accounts.js are the only code that touches the data, so swapping this for
 * a real database later means replacing this file, not the application.
 *
 * Safety: writes go to "<file>.tmp" and are renamed over the real file, so a crash mid-write leaves the previous good
 * file. A file that cannot be parsed is moved aside (never silently discarded) before a fresh one is started.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const COLLECTIONS = ["users", "emailIndex", "sessions", "tokens", "connections", "notifications", "interpreters", "interpRequests", "commSessions", "learning"];

function emptyData() { const d = { version: 1 }; COLLECTIONS.forEach((c) => { d[c] = {}; }); return d; }

function createStore(file) {
  let data = emptyData(), timer = null, dirty = false, lastError = null;

  function load() {
    try {
      const raw = fs.readFileSync(file, "utf8");
      const parsed = JSON.parse(raw);
      data = Object.assign(emptyData(), parsed);
      COLLECTIONS.forEach((c) => { if (!data[c] || typeof data[c] !== "object") data[c] = {}; });
    } catch (e) {
      if (e && e.code === "ENOENT") { data = emptyData(); return; }
      const aside = file + ".corrupt-" + Date.now();
      try { fs.renameSync(file, aside); console.error("[db] " + file + " could not be read (" + e.message + "). Moved to " + aside + " and starting empty."); } catch (e2) { console.error("[db] unreadable data file and it could not be moved aside: " + e2.message); }
      data = emptyData();
    }
  }

  function flushSync() {
    if (!dirty) return;
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = file + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(data), { mode: 0o600 });
      fs.renameSync(tmp, file);
      dirty = false; lastError = null;
    } catch (e) { lastError = e; console.error("[db] could not save data: " + e.message); }
  }

  function save() {
    dirty = true;
    if (timer) return;
    timer = setTimeout(() => { timer = null; flushSync(); }, 40);
    if (timer.unref) timer.unref();
  }

  load();
  process.on("exit", flushSync);

  return {
    get data() { return data; },
    save, flush: flushSync, file,
    get lastError() { return lastError; },
  };
}

module.exports = { createStore };
