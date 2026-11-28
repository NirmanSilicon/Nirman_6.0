"use strict";
/*
 * Minimal ZIP reader (central directory; stored and deflated entries; ZIP64 sizes).
 * Used by the sign-model installer to open the AI4Bharat release archives and the
 * PyTorch checkpoint inside them without any third-party dependency.
 */
const zlib = require("zlib");

function findEOCD(buf) {
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) return i;
  }
  throw new Error("Not a ZIP archive (end of central directory not found)");
}

function readZip(buf) {
  const eocd = findEOCD(buf);
  let count = buf.readUInt16LE(eocd + 10);
  let cdSize = buf.readUInt32LE(eocd + 12);
  let cdOff = buf.readUInt32LE(eocd + 16);
  if (cdOff === 0xffffffff || count === 0xffff) {
    // ZIP64: locator sits just before the EOCD
    const loc = eocd - 20;
    if (loc < 0 || buf.readUInt32LE(loc) !== 0x07064b50) throw new Error("ZIP64 locator missing");
    const z64 = Number(buf.readBigUInt64LE(loc + 8));
    if (buf.readUInt32LE(z64) !== 0x06064b50) throw new Error("ZIP64 end record missing");
    count = Number(buf.readBigUInt64LE(z64 + 32));
    cdSize = Number(buf.readBigUInt64LE(z64 + 40));
    cdOff = Number(buf.readBigUInt64LE(z64 + 48));
  }
  const entries = new Map();
  let p = cdOff;
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("Corrupt ZIP central directory");
    const method = buf.readUInt16LE(p + 10);
    let csize = buf.readUInt32LE(p + 20), usize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32);
    let localOff = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    // ZIP64 extended information extra field
    let e = p + 46 + nameLen; const eEnd = e + extraLen;
    while (e + 4 <= eEnd) {
      const id = buf.readUInt16LE(e), sz = buf.readUInt16LE(e + 2); let q = e + 4;
      if (id === 0x0001) {
        if (usize === 0xffffffff) { usize = Number(buf.readBigUInt64LE(q)); q += 8; }
        if (csize === 0xffffffff) { csize = Number(buf.readBigUInt64LE(q)); q += 8; }
        if (localOff === 0xffffffff) { localOff = Number(buf.readBigUInt64LE(q)); q += 8; }
      }
      e += 4 + sz;
    }
    entries.set(name, { name, method, csize, usize, localOff });
    p += 46 + nameLen + extraLen + commentLen;
  }
  function read(name) {
    const en = entries.get(name);
    if (!en) throw new Error("Entry not found in ZIP: " + name);
    const lo = en.localOff;
    if (buf.readUInt32LE(lo) !== 0x04034b50) throw new Error("Corrupt ZIP local header for " + name);
    const start = lo + 30 + buf.readUInt16LE(lo + 26) + buf.readUInt16LE(lo + 28);
    const raw = buf.subarray(start, start + en.csize);
    if (en.method === 0) return raw;
    if (en.method === 8) return zlib.inflateRawSync(raw);
    throw new Error("Unsupported ZIP compression method " + en.method + " for " + name);
  }
  return { names: () => Array.from(entries.keys()), has: (n) => entries.has(n), read };
}

module.exports = { readZip };
