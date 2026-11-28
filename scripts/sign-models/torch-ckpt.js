"use strict";
/*
 * Read tensors out of a PyTorch (zip-format) checkpoint WITHOUT running Python and WITHOUT
 * executing anything from the file.
 *
 * A .ckpt is a ZIP holding `<prefix>/data.pkl` (a Python pickle describing the objects) and
 * `<prefix>/data/<key>` (raw little-endian tensor storages). This file implements only the
 * pickle opcodes PyTorch emits. Globals are NOT imported or executed: tensor rebuild helpers and
 * OrderedDict are interpreted by name, and every other global (Lightning callbacks, optimiser
 * classes, ...) becomes an inert placeholder object. Unknown opcodes stop the read with an error.
 */
const { readZip } = require("./zipread");

const DTYPES = {
  FloatStorage: { bytes: 4, kind: "f32" }, DoubleStorage: { bytes: 8, kind: "f64" },
  HalfStorage: { bytes: 2, kind: "f16" }, LongStorage: { bytes: 8, kind: "i64" },
  IntStorage: { bytes: 4, kind: "i32" }, ShortStorage: { bytes: 2, kind: "i16" },
  CharStorage: { bytes: 1, kind: "i8" }, ByteStorage: { bytes: 1, kind: "u8" }, BoolStorage: { bytes: 1, kind: "u8" }
};

class Placeholder { constructor(name) { this.__global__ = name; this.args = null; this.state = null; } }
const MARK = Symbol("mark");

function unpickle(data, persistentLoad) {
  let p = 0; const stack = []; const memo = new Map(); const marks = [];
  const u8 = () => data[p++];
  const u16 = () => { const v = data.readUInt16LE(p); p += 2; return v; };
  const u32 = () => { const v = data.readUInt32LE(p); p += 4; return v; };
  const i32 = () => { const v = data.readInt32LE(p); p += 4; return v; };
  const str = (n, enc) => { const s = data.toString(enc || "utf8", p, p + n); p += n; return s; };
  const line = () => { const e = data.indexOf(0x0a, p); const s = data.toString("latin1", p, e); p = e + 1; return s; };
  const popMark = () => { const m = marks.pop(); return stack.splice(m); };
  const resolveGlobal = (mod, name) => ({ __callable__: mod + "." + name, mod, name });
  function call(fn, args) {
    const id = fn.__callable__;
    if (id === "torch._utils._rebuild_tensor_v2" || id === "torch._utils._rebuild_tensor") {
      const [storage, offset, size, stride] = args;
      return { __tensor__: true, storage, offset, size: Array.from(size), stride: Array.from(stride) };
    }
    if (id === "collections.OrderedDict") return new Map();
    if (id === "builtins.set" || id === "builtins.frozenset") return { __set__: args[0] || [] };
    const o = new Placeholder(id); o.args = args; return o;
  }
  for (;;) {
    const op = u8();
    switch (op) {
      case 0x80: u8(); break;                                  // PROTO
      case 0x95: p += 8; break;                                // FRAME
      case 0x7d: stack.push(new Map()); break;                 // EMPTY_DICT
      case 0x5d: stack.push([]); break;                        // EMPTY_LIST
      case 0x29: stack.push([]); break;                        // EMPTY_TUPLE
      case 0x8f: stack.push({ __set__: [] }); break;           // EMPTY_SET
      case 0x28: marks.push(stack.length); break;              // MARK
      case 0x4e: stack.push(null); break;                      // NONE
      case 0x88: stack.push(true); break;                      // NEWTRUE
      case 0x89: stack.push(false); break;                     // NEWFALSE
      case 0x4b: stack.push(u8()); break;                      // BININT1
      case 0x4d: stack.push(u16()); break;                     // BININT2
      case 0x4a: stack.push(i32()); break;                     // BININT
      case 0x8a: {                                             // LONG1
        const n = u8(); let v = 0n;
        for (let i = n - 1; i >= 0; i--) v = (v << 8n) | BigInt(data[p + i]);
        if (n && (data[p + n - 1] & 0x80)) v -= 1n << BigInt(8 * n);
        p += n; stack.push(Number(v)); break;
      }
      case 0x47: { const v = data.readDoubleBE(p); p += 8; stack.push(v); break; } // BINFLOAT
      case 0x58: { const n = u32(); stack.push(str(n)); break; }                    // BINUNICODE
      case 0x8c: { const n = u8(); stack.push(str(n)); break; }                     // SHORT_BINUNICODE
      case 0x8d: { const n = Number(data.readBigUInt64LE(p)); p += 8; stack.push(str(n)); break; } // BINUNICODE8
      case 0x55: { const n = u8(); stack.push(str(n, "latin1")); break; }           // SHORT_BINSTRING
      case 0x54: { const n = u32(); stack.push(str(n, "latin1")); break; }          // BINSTRING
      case 0x43: { const n = u8(); stack.push(data.subarray(p, p + n)); p += n; break; } // SHORT_BINBYTES
      case 0x42: { const n = u32(); stack.push(data.subarray(p, p + n)); p += n; break; } // BINBYTES
      case 0x63: { const mod = line(); const name = line(); stack.push(resolveGlobal(mod, name)); break; } // GLOBAL
      case 0x93: { const name = stack.pop(); const mod = stack.pop(); stack.push(resolveGlobal(mod, name)); break; } // STACK_GLOBAL
      case 0x74: stack.push(popMark()); break;                 // TUPLE
      case 0x85: stack.push([stack.pop()]); break;             // TUPLE1
      case 0x86: { const b = stack.pop(), a = stack.pop(); stack.push([a, b]); break; } // TUPLE2
      case 0x87: { const c = stack.pop(), b = stack.pop(), a = stack.pop(); stack.push([a, b, c]); break; } // TUPLE3
      case 0x51: stack.push(persistentLoad(stack.pop())); break; // BINPERSID
      case 0x52: { const args = stack.pop(); const fn = stack.pop(); stack.push(call(fn, args)); break; } // REDUCE
      case 0x81: { const args = stack.pop(); const cls = stack.pop(); stack.push(call(cls, args)); break; } // NEWOBJ
      case 0x62: {                                             // BUILD
        const state = stack.pop(); const obj = stack[stack.length - 1];
        if (obj instanceof Placeholder) obj.state = state; break;
      }
      case 0x73: { const v = stack.pop(), k = stack.pop(); stack[stack.length - 1].set(k, v); break; } // SETITEM
      case 0x75: { const items = popMark(); const d = stack[stack.length - 1]; for (let i = 0; i < items.length; i += 2) d.set(items[i], items[i + 1]); break; } // SETITEMS
      case 0x61: { const v = stack.pop(); stack[stack.length - 1].push(v); break; } // APPEND
      case 0x65: { const items = popMark(); const l = stack[stack.length - 1]; for (const it of items) l.push(it); break; } // APPENDS
      case 0x90: { const items = popMark(); const s = stack[stack.length - 1]; if (s && s.__set__) s.__set__.push(...items); break; } // ADDITEMS
      case 0x71: memo.set(u8(), stack[stack.length - 1]); break;     // BINPUT
      case 0x72: memo.set(u32(), stack[stack.length - 1]); break;    // LONG_BINPUT
      case 0x94: memo.set(memo.size, stack[stack.length - 1]); break; // MEMOIZE
      case 0x68: stack.push(memo.get(u8())); break;                 // BINGET
      case 0x6a: stack.push(memo.get(u32())); break;                // LONG_BINGET
      case 0x30: stack.pop(); break;                                // POP
      case 0x31: popMark(); break;                                  // POP_MARK
      case 0x32: stack.push(stack[stack.length - 1]); break;        // DUP
      case 0x2e: return stack.pop();                                // STOP
      default: throw new Error("Unsupported pickle opcode 0x" + op.toString(16) + " at byte " + (p - 1));
    }
  }
}

function halfToFloat(h) {
  const s = (h & 0x8000) ? -1 : 1, e = (h >> 10) & 0x1f, f = h & 0x3ff;
  if (e === 0) return s * Math.pow(2, -14) * (f / 1024);
  if (e === 31) return f ? NaN : s * Infinity;
  return s * Math.pow(2, e - 15) * (1 + f / 1024);
}

/** Returns { tensors: Map(name -> {shape, data: Float64Array|Float32Array, dtype}), meta } */
function readCheckpoint(buf) {
  const zip = readZip(buf);
  const pkl = zip.names().find((n) => /(^|\/)data\.pkl$/.test(n));
  if (!pkl) throw new Error("This file is not a PyTorch zip checkpoint (no data.pkl).");
  const prefix = pkl.slice(0, -"data.pkl".length);
  const storages = new Map();
  const persistentLoad = (pid) => {
    // ('storage', storage_type_global, key, location, numel)
    if (!Array.isArray(pid) || pid[0] !== "storage") throw new Error("Unexpected persistent id in checkpoint");
    const type = pid[1] && pid[1].name; const key = String(pid[2]);
    if (!DTYPES[type]) throw new Error("Unsupported tensor storage type " + type);
    if (!storages.has(key)) storages.set(key, { type, key, numel: pid[4] });
    return storages.get(key);
  };
  const root = unpickle(zip.read(pkl), persistentLoad);
  const sd = root instanceof Map && root.has("state_dict") ? root.get("state_dict") : root;
  if (!(sd instanceof Map)) throw new Error("No state_dict found in checkpoint");
  const tensors = new Map();
  for (const [name, t] of sd) {
    if (!t || !t.__tensor__) continue;
    const dt = DTYPES[t.storage.type];
    const raw = zip.read(prefix + "data/" + t.storage.key);
    const numel = t.size.reduce((a, b) => a * b, 1);
    const out = new Float32Array(numel);
    // walk the (size, stride) view so non-contiguous tensors are read correctly
    const nd = t.size.length; const idx = new Array(nd).fill(0);
    for (let i = 0; i < numel; i++) {
      let off = t.offset; for (let d = 0; d < nd; d++) off += idx[d] * t.stride[d];
      const b = off * dt.bytes;
      let v;
      switch (dt.kind) {
        case "f32": v = raw.readFloatLE(b); break;
        case "f64": v = raw.readDoubleLE(b); break;
        case "f16": v = halfToFloat(raw.readUInt16LE(b)); break;
        case "i64": v = Number(raw.readBigInt64LE(b)); break;
        case "i32": v = raw.readInt32LE(b); break;
        case "i16": v = raw.readInt16LE(b); break;
        case "i8": v = raw.readInt8(b); break;
        default: v = raw[b];
      }
      out[i] = v;
      for (let d = nd - 1; d >= 0; d--) { if (++idx[d] < t.size[d]) break; idx[d] = 0; }
    }
    tensors.set(name, { shape: t.size, dtype: dt.kind, data: out });
  }
  const meta = {};
  if (root instanceof Map) for (const k of ["epoch", "global_step", "pytorch-lightning_version"]) if (root.has(k)) meta[k] = root.get(k);
  return { tensors, meta };
}

module.exports = { readCheckpoint, unpickle };
