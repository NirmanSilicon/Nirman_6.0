// Saarthi insights (D56): the spatial decay curve and the co-occurrence graph, from /insights (RECORDED).
"use strict";

const NS = "http://www.w3.org/2000/svg";
const $ = (id) => document.getElementById(id);
const COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#6250d6"];   // validated on the paper (D56)
const NAME = { "cell phone": "phone" };
const nm = (l) => NAME[l] || l;

function el(parent, tag, attrs, text) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  parent.appendChild(n);
  return n;
}
const titled = (n, t) => { el(n, "title", {}, t); return n; };
const stillAt = (km, s) => { let v = 1; for (const [t, p] of km) { if (t <= s) v = p; else break; } return v; };

function decay(d) {
  const svg = $("decay");
  const W = 900, H = 300, L = 60, R = 130, T = 14, B = 34, maxMin = 10;
  const x = (min) => L + (min / maxMin) * (W - L - R);
  const y = (p) => T + (1 - p) * (H - T - B);
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    el(svg, "line", { x1: L, x2: W - R, y1: y(p), y2: y(p), class: "axis" });
    el(svg, "text", { x: L - 8, y: y(p) + 4, "text-anchor": "end", class: "tick" }, `${p * 100}%`);
  }
  for (let m = 0; m <= maxMin; m += 2) el(svg, "text", { x: x(m), y: H - 10, "text-anchor": "middle", class: "tick" }, `${m} min`);
  // The four kinds with the most told positions, drawn slowest to fastest.
  const kinds = Object.entries(d.decay).filter(([, v]) => v.intervals >= 20).sort((a, b) => b[1].intervals - a[1].intervals).slice(0, 4)
    .sort((a, b) => a[1].ratePerMin - b[1].ratePerMin);
  el(svg, "line", { x1: L, x2: W - R, y1: y(0.5), y2: y(0.5), stroke: "#1f2a30", "stroke-width": 1, opacity: 0.35 });
  el(svg, "text", { x: L + 6, y: y(0.5) + 16, "text-anchor": "start", class: "tick" }, "below this line, Saarthi says “it may have been moved”");
  const ends = [];
  kinds.forEach(([lab, v], i) => {
    const pts = [[0, 1]];
    let prev = 1;
    for (const [t, s] of v.km) { if (t / 60 > maxMin) break; pts.push([t / 60, prev], [t / 60, s]); prev = s; }
    pts.push([maxMin, prev]);
    el(svg, "path", { d: pts.map(([m, p], k) => `${k ? "L" : "M"}${x(m).toFixed(1)},${y(p).toFixed(1)}`).join(" "), fill: "none", stroke: COLORS[i], "stroke-width": 2.5, "stroke-linejoin": "round" });
    for (const m of [1, 2, 5, 10]) {
      const p = stillAt(v.km, m * 60);
      titled(el(svg, "circle", { cx: x(m), cy: y(p), r: 5, fill: COLORS[i], stroke: "#f6f4ee", "stroke-width": 2 }), `${nm(lab)}: ${Math.round(p * 100)}% still there after ${m} min`);
    }
    let ly = y(prev) + 4;
    for (const e of ends) if (Math.abs(ly - e) < 15) ly = e + 15;
    ends.push(ly);
    el(svg, "text", { x: x(maxMin) + 8, y: ly, class: "endlabel" }, `${nm(lab)} ${Math.round(prev * 100)}%`);
  });
  const slow = kinds[0], fast = kinds[kinds.length - 1];
  const p5 = (v) => Math.round(stillAt(v.km, 300) * 100);
  $("decay-insight").textContent = slow && fast ? `A ${nm(slow[0])} stays put (${p5(slow[1])}% still there after 5 minutes); a ${nm(fast[0])} does not (${p5(fast[1])}%). ` +
    `So Saarthi trusts an old sighting of a ${nm(slow[0])}, and treats an old sighting of a ${nm(fast[0])} as a probability, not a fact.` : "Not enough told positions yet.";
  $("decay-table").querySelector("tbody").replaceChildren(...Object.entries(d.decay).sort((a, b) => b[1].intervals - a[1].intervals).map(([lab, v]) => {
    const tr = document.createElement("tr");
    for (const c of [nm(lab), v.intervals, v.moved, v.ratePerMin.toFixed(3), `${p5(v)}%`]) { const td = document.createElement("td"); td.textContent = c; tr.append(td); }
    return tr;
  }));
}

function cooc(d) {
  const svg = $("cooc");
  const W = 900, H = 360, cx = W / 2, cy = H / 2, r = 135;
  const nodes = d.cooc.nodes;
  if (nodes.length < 2) { $("cooc-insight").textContent = "Not enough objects seen together yet."; return; }
  const maxSec = Math.max(...nodes.map((n) => n.seconds));
  const pos = {};
  nodes.forEach((n, i) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / nodes.length; pos[n.label] = [cx + r * 1.6 * Math.cos(a), cy + r * Math.sin(a)]; });
  const maxPair = Math.max(...d.cooc.edges.map((e) => e.seconds), 1);
  for (const e of d.cooc.edges) {
    const [x1, y1] = pos[e.a], [x2, y2] = pos[e.b];
    const strong = e.lift >= 1.2;
    titled(el(svg, "line", { x1, y1, x2, y2, stroke: strong ? "#2a78d6" : "#9aa1a6", "stroke-width": 1 + 7 * (e.seconds / maxPair), opacity: strong ? 0.9 : 0.5, "stroke-linecap": "round" }),
      `${nm(e.a)} + ${nm(e.b)}: together ${e.seconds} s, lift ${e.lift}`);
    el(svg, "text", { x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 4, "text-anchor": "middle", class: "tick" }, `×${e.lift}`);
  }
  for (const n of nodes) {
    const [x, y] = pos[n.label];
    titled(el(svg, "circle", { cx: x, cy: y, r: 10 + 18 * Math.sqrt(n.seconds / maxSec), fill: "#f6f4ee", stroke: "#1f2a30", "stroke-width": 1.5 }), `${nm(n.label)}: seen ${n.seconds} s`);
    el(svg, "text", { x, y: y + 4, "text-anchor": "middle", class: "endlabel" }, nm(n.label));
  }
  const best = [...d.cooc.edges].sort((a, b) => b.lift - a.lift)[0];
  $("cooc-insight").textContent = best ? `Strongest habit in these sessions: the ${nm(best.a)} and the ${nm(best.b)} are seen together ${best.lift}× more often than chance ` +
    `(${best.seconds} s together over ${d.cooc.seconds} s of watching).` : "";
}

fetch("/insights").then((r) => r.json()).then((d) => {
  $("source").textContent = `RECORDED · ${d.recordings} recordings · ${Object.values(d.decay).reduce((s, v) => s + v.intervals, 0)} told positions`;
  decay(d);
  cooc(d);
}).catch(() => { $("source").textContent = "could not load the analysis"; });
