// Saarthi Mind view (the PRD 5.11 blueprint): renders the live feed (shared/feed/v1). Every element
// comes from a feed message; when there is no data, the page says so instead of showing anything
// made up. Layers are added only as the phone computes them (docs/SHOWCASE.md 5).
"use strict";

const state = {
  lastFalse: null, perception: null, rates: null, brief: null, hands: null,
  guidance: null, system2: null, plane: null, actions: [], link: "waiting",
  timeline: [], filter: "all",
  economy: { frames: 0, suppressed: 0, spoken: 0 },
};
const $ = (id) => document.getElementById(id);
const verdicts = new Map();  // world id → last verdict, to log when one settles
const SVG = "http://www.w3.org/2000/svg";
let dirty = false;
let renders = 0;
let lastRenderCount = performance.now();

function connect() {
  const ws = new WebSocket(`ws://${location.host}/feed`);
  ws.onmessage = (e) => { onMessage(JSON.parse(e.data)); };
  ws.onclose = () => { setLink("laptop server not reachable", "lost"); setTimeout(connect, 1000); };
}

function setupFilterControls() {
  const allBtn = $("filter-all");
  const decBtn = $("filter-decisions");
  if (!allBtn || !decBtn) return;
  allBtn.onclick = () => {
    state.filter = "all";
    allBtn.classList.add("active"); decBtn.classList.remove("active");
    renderTimeline();
  };
  decBtn.onclick = () => {
    state.filter = "decisions";
    decBtn.classList.add("active"); allBtn.classList.remove("active");
    renderTimeline();
  };
}

function countFrameEconomy(p) {
  state.economy.frames += 1;
  // Count confirmed/known restraints computed by the phone in this frame without inventing data.
  const silentBeliefStates = new Set(["ok", "hidden", "out_of_view", "lost"]);
  const trackedSuppressed = new Set();
  let frameSuppressed = 0;
  for (const t of p.tracks || []) {
    if (t.confirmed && !t.said && t.reason) {
      frameSuppressed += 1;
      trackedSuppressed.add(t.id);
    }
  }
  const worldById = new Map((p.world || []).map((w) => [w.id, w]));
  for (const w of p.world || []) {
    if (!w.said && w.reason && w.seen === "in_view" && (w.track == null || !trackedSuppressed.has(w.track))) {
      frameSuppressed += 1;
    }
  }
  for (const b of p.belief || []) {
    if (silentBeliefStates.has(b.state)) {
      const w = worldById.get(b.world);
      // Only count silent belief holds for objects not already counted via world.reason above.
      if (!w || w.said || !w.reason || w.seen !== "in_view") frameSuppressed += 1;
    }
  }
  state.economy.suppressed += frameSuppressed;
}

function onMessage(m) {
  switch (m.type) {
    case "perception":
      state.perception = m;
      countFrameEconomy(m);
      break;
    case "hands": state.hands = m; break;
    case "guidance":
      state.guidance = m;
      state.actions.unshift(m); state.actions.length = Math.min(state.actions.length, 10);
      renderActions();
      if (m.correction || m.event === "arrived") {
        if (m.phrase) state.economy.spoken += 1;
        addEvent({
          tier: "signal", kind: "GUIDE", cls: m.correction ? "sig-alert" : "sig-guide",
          text: `${EVENT[m.event] || m.event}${m.correction ? " (wrong-way correction)" : ""} · ${name(m.label)}${m.phrase ? ` → “${m.phrase}”` : ""}`,
          why: m.correction ? "Why I spoke: hand moved away from target" : "Why I spoke: fingertip reached target",
        });
      }
      break;
    case "alert":
      state.economy.spoken += 1;
      if (m.kind === "torch") {
        addEvent({
          tier: "signal", kind: "TORCH", cls: "sig-torch",
          text: `“${m.text}”`,
          why: "Why I spoke: torch reflection test settled real vs picture",
        });
      } else {
        addEvent({
          tier: "signal", kind: "ALERT", cls: "sig-alert",
          text: `“${m.text}”`,
          why: `Why I spoke: ${m.cause || "world diverged from user belief"}`,
        });
        if (m.believed !== undefined) state.lastFalse = m;
      }
      break;
    case "torch": {
      const emits = m.objects.some((o) => o.finding === "emits");
      const text = m.objects.length
        ? m.objects.map((o) => `${name(o.label)} #${o.world}: ×${o.objectGain.toFixed(2)} vs ${o.ref} ×${o.refGain.toFixed(2)} (share ${o.share.toFixed(2)}${o.unevenness != null ? `, uneven ${o.unevenness.toFixed(2)}${o.curved ? " rounded" : ""}` : ""}) → ${o.finding.replace("_", " ")}`).join(" · ")
        : `nothing measured${m.complete ? "" : " (no torch-on frame)"}`;
      addEvent({
        tier: "signal", kind: "TORCH", cls: emits ? "sig-alert" : "sig-torch",
        text,
        why: emits ? "Why flagged: screen emits own light (share ≤ 0.30)" : "Why verified: exposure-locked flash reflectance check",
      });
      break;
    }
    case "note": {
      // Voice Diary (D56): add or word-overlap recall.
      if (m.event === "add") {
        state.economy.spoken += 1;
        addEvent({
          tier: "signal", kind: "DIARY", cls: "sig-diary",
          text: `Noted${m.clock ? ` at ${m.clock}` : ""}: “${m.text}”`,
          why: "Why I spoke: saved voice note to session Diary",
        });
      } else if (m.event === "recall") {
        state.economy.spoken += 1;
        addEvent({
          tier: "signal", kind: "DIARY", cls: "sig-diary",
          text: `Asked “${m.question}” → “${m.text}”`,
          why: "Why I spoke: matched words in session Voice Diary",
        });
      } else {
        addEvent({ tier: "signal", kind: "DIARY", cls: "sig-diary", text: `Diary: ${m.event}${m.text ? ` · ${m.text}` : ""}` });
      }
      break;
    }
    case "sos": {
      const SOS = {
        alert: () => [`${m.simulated ? "SIMULATED fall · " : ""}${m.situation} → “Are you OK?”` +
          (m.spike ? ` · loud sound ${m.spike.aboveRoomDb} dB above room` : ""), "Why I spoke: fall/impact threshold crossed — everything else paused"],
        sent: () => [`SOS sent (${m.detail})${m.location ? " with coarse location" : ", no location"}`, "Why I acted: no response after 15 s countdown"],
        failed: () => [`SOS NOT sent: ${m.detail}`, "Why flagged: SMS delivery failed"],
        cancelled: () => ["SOS cancelled by user: back to normal", "Why stopped: user confirmed OK"],
        closed: () => ["SOS screen closed: back to normal", ""],
      };
      if (m.state === "alert" || m.state === "sent") state.economy.spoken += 1;
      const [text, why] = (SOS[m.state] || (() => [`SOS: ${m.state}`, ""]))();
      addEvent({
        tier: "signal", kind: "SOS", cls: (m.state === "cancelled" || m.state === "closed") ? "sig-guide" : "sig-sos",
        text, why,
      });
      break;
    }
    case "personal": {
      if (m.said) state.economy.spoken += 1;
      const j = m.decision ? ` · ${m.decision.replace("_", " ")} (yours ${m.mine.toFixed(2)} vs other ${m.other.toFixed(2)}, gap ${m.gap.toFixed(2)})` : "";
      const what = {
        teach: `taught ${m.mine ? "your" : "a look-alike"} ${m.name}: ${m.views} views${m.ok ? "" : " (too few: not kept)"}`,
        ask: "asked: is this mine?",
        what: "what's this? (taught object under fingertip)",
        wrong_pickup: "look-alike picked up",
      }[m.event] || m.event;
      addEvent({
        tier: "signal", kind: "WATCH", cls: m.event === "wrong_pickup" ? "sig-alert" : "sig-personal",
        text: `${what}${j}${m.said ? ` → “${m.said}”` : ""}`,
        why: m.event === "wrong_pickup" ? "Why I spoke: cosine margin favoured look-alike" : (m.said ? "Why I spoke: embedding gap decided ownership" : "Why I stayed silent: teaching or unsure margin"),
      });
      break;
    }
    case "online": {
      if (m.event === "answer" || m.event === "failed") state.economy.spoken += 1;
      const V = { agrees: "matches what I see", contradicts: "CONTRADICTS what I see", unchecked: "nothing local to check" };
      const text = m.event === "answer"
        ? `“${m.question}” → “${m.answer}” (${m.cloudMs} ms) · ${V[m.verdict] || m.verdict}${m.reason ? ": " + m.reason : ""}`
        : m.event === "failed" ? `“${m.question}” → no answer (${m.error})` : `online mode ${m.event}`;
      addEvent({
        tier: "signal", kind: "ONLINE", cls: (m.verdict === "contradicts" || m.event === "failed") ? "sig-alert" : "sig-online",
        text,
        why: m.event === "answer" ? `Why checked: cross-verified cloud against local WorldMap (${m.verdict})` : "",
      });
      break;
    }
    case "rates": state.rates = m; break;
    case "system2":
      state.system2 = m;
      if (m.plane) state.plane = m;
      for (const o of m.objects) {
        const prev = verdicts.get(o.world);
        if (prev && prev !== o.verdict && o.verdict !== "unsure") {
          addEvent({
            tier: "signal", kind: "SYSTEM 2", cls: o.verdict === "picture" ? "sig-alert" : "sig-s2",
            text: `${name(o.label)} #${o.world} settled as ${o.verdict.toUpperCase()} (LLR ${o.llr.toFixed(2)})`,
            why: o.cues.map((c) => c.detail).join(" · ") || "Wald SPRT bound crossed",
          });
        }
        verdicts.set(o.world, o.verdict);
      }
      break;
    case "hello":
      addEvent({ tier: "noise", kind: "SYSTEM", text: `phone ${m.device} · ${m.flavour} build · ${shortModel(m.detectorModel)}` });
      break;
    case "brief": {
      state.brief = m;
      state.economy.spoken += 1;
      const suppressedNow = (m.leftOut || []).filter((l) => !l.reason.startsWith("not yet confirmed")).length;
      addEvent({
        tier: "signal", kind: "BRIEF", cls: "sig-brief",
        text: `“${m.text}”`,
        why: `Why I spoke: user tap (${m.items.length} named${suppressedNow ? `, ${suppressedNow} held back` : ""}${m.waitedToSettle ? ", waited to settle" : ""})`,
      });
      break;
    }
    case "speech":
      if (m.tapToFirstAudioMs != null) {
        addEvent({
          tier: "noise", kind: "AUDIO",
          text: `${m.path === "CLIP" ? "prepared clip" : "live TTS"} · tap → first audio ${m.tapToFirstAudioMs} ms${m.interrupted ? " · interrupted" : ""}`,
        });
      }
      break;
    case "heard": {
      if (m.reply) state.economy.spoken += 1;
      const unknown = !m.intent || m.intent.startsWith("Unknown");
      addEvent({
        tier: "signal", kind: "HEARD", cls: m.guess ? "sig-s2" : (unknown ? "sig-torch" : "sig-brief"),
        text: `“${m.text || "(nothing)"}” → ${m.reply ? `“${m.reply}”` : "(silent)"} (${m.transcribeMs} ms)`,
        why: m.guess ? `Why I asked: near-miss match “${m.guess}” (${Math.round((m.similarity || 0) * 100)}%)`
          : unknown ? (m.reply ? "Why I spoke: unrecognized voice command" : "Why I stayed silent: unrecognized voice command")
          : m.reply ? `Why I spoke: matched intent “${m.intent}”`
          : "Why I stayed silent: no actionable intent",
      });
      break;
    }
    case "health": {
      const degraded = m.camera !== "OK" || m.thermal === "HOT" || m.thermal === "CRITICAL";
      if (m.spoken) state.economy.spoken += 1;
      addEvent({
        tier: degraded || m.spoken ? "signal" : "noise",
        kind: "HEALTH",
        cls: degraded ? "sig-alert" : "",
        text: `camera ${m.camera.toLowerCase()}, phone ${m.thermal.toLowerCase()}${m.spoken ? ` · said “${m.spoken}”` : ""}`,
        why: m.spoken ? "Why I spoke: camera visibility changed" : (!degraded ? "Silent thermal/camera state check (D62: heat never spoken)" : "Degradation active; adjusting cadence silently"),
      });
      break;
    }
    case "link":
      if (m.state === "lost") {
        if (m.spoken) state.economy.spoken += 1;
        addEvent({ tier: "signal", kind: "LINK", cls: "sig-alert", text: m.spoken ? "laptop link lost (user told)" : "laptop link lost (already told)", why: "No ack for 2 s" });
      }
      if (m.state === "connected") addEvent({ tier: "noise", kind: "LINK", text: "phone ↔ laptop link connected" });
      break;
    case "laptop":
      state.link = m.phone;
      setLink(m.phone === "connected" ? "phone connected over USB" : m.phone === "waiting" ? "waiting for the phone…" : "phone link lost",
              m.phone === "connected" ? "ok" : m.phone === "waiting" ? "" : "lost");
      break;
  }
  if (m.type === "perception" && state.link !== "connected") {
    state.link = "connected";
    setLink("phone connected over USB", "ok");
  }
  dirty = true;
}

function setLink(text, cls) { const el = $("link"); el.textContent = text; el.className = "pill " + (cls || ""); }

function addEvent(ev) {
  state.timeline.unshift({ at: new Date(), tier: ev.tier || "noise", kind: ev.kind || "EVENT", cls: ev.cls || "", text: ev.text, why: ev.why || "" });
  state.timeline.length = Math.min(state.timeline.length, 150);
  renderTimeline();
}

// The detector says "dining table"; Saarthi always calls it a table (CLAUDE.md 5.0.1). The feed keeps COCO names.
function name(label) { return label === "dining table" ? "table" : label === "cell phone" ? "phone" : label; }
function shortModel(path) { return (path || "").split("/").pop().replace(".tflite", ""); }
const REACH = { within: "within reach", just_beyond: "just beyond reach", out: "out of reach" };

// ---- rendering ----

function frame() {
  if (dirty) { dirty = false; render(); renders++; }
  const now = performance.now();
  if (now - lastRenderCount >= 1000) {
    $("render").textContent = `· display ${renders} refreshes/s`;
    renders = 0; lastRenderCount = now;
  }
  requestAnimationFrame(frame);
}

function render() {
  renderEconomy();
  renderPlan();
  renderEyes();
  renderWorld();
  renderBelief();
  renderMind();
  renderSystem2();
  renderBrief();
  renderRates();
}

function renderEconomy() {
  $("econ-frames").textContent = state.economy.frames;
  $("econ-suppressed").textContent = state.economy.suppressed;
  $("econ-spoken").textContent = state.economy.spoken;
}

// ---- Spatial Tabletop: 2.5D perspective projection of the body frame computed on the phone ----

const STAGE = { cx: 450, nearY: 452, spanY: 375, yMax: 1.65, focal: 0.85, baseScale: 410, taper: 0.50 };
const MAX_U = STAGE.yMax / (STAGE.yMax + STAGE.focal);

function project(x, y) {
  const yc = Math.max(-0.08, Math.min(STAGE.yMax + 0.08, y));
  const u = yc <= 0 ? (yc * 0.6) : ((yc / (yc + STAGE.focal)) / MAX_U);
  const scaleX = STAGE.baseScale * (1 - STAGE.taper * Math.max(0, Math.min(1.05, u)));
  return [STAGE.cx + x * scaleX, STAGE.nearY - u * STAGE.spanY];
}

function polyPath(pts) {
  return "M" + pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" L");
}

function arcPts(r, degMin = -65, degMax = 65) {
  const pts = [];
  for (let d = degMin; d <= degMax; d += 5) {
    const a = d * Math.PI / 180;
    pts.push(project(Math.sin(a) * r, Math.cos(a) * r));
  }
  return pts;
}

function renderPlan() {
  const svg = $("plan");
  svg.replaceChildren();

  // 1. 2.5D Tabletop slab + clipPath so grid/reach arcs stay crisp inside the table.
  const nearW = 1.08, farW = 1.08, nearD = 0.08, farD = 1.65;
  const bl = project(-nearW, nearD), br = project(nearW, nearD);
  const tr = project(farW, farD), tl = project(-farW, farD);
  const slabPts = [bl, br, tr, tl].map((q) => q.join(",")).join(" ");
  const defs = add(svg, "defs", {});
  const clip = add(defs, "clipPath", { id: "table-clip" });
  add(clip, "polygon", { points: slabPts });

  add(svg, "polygon", { points: slabPts, class: "table-slab" });
  add(svg, "polygon", {
    points: `${bl[0]},${bl[1]} ${br[0]},${br[1]} ${br[0]},${br[1] + 9} ${bl[0]},${bl[1] + 9}`,
    class: "table-rim",
  });

  const surface = add(svg, "g", { "clip-path": "url(#table-clip)" });

  // 2. Depth reach arcs (0.50 m within reach, 0.75 m just beyond, D20).
  for (const [r, label, side] of [[0.50, "within reach (0.5m)", 1], [0.75, "just beyond (0.75m)", -1], [1.20, "out of reach", 1]]) {
    add(surface, "path", { d: polyPath(arcPts(r, -72, 72)), class: "reach" });
    const [lx, ly] = project(side * Math.min(0.88, r * 0.84), Math.max(0.16, r * 0.44));
    add(surface, "text", { x: lx, y: ly - 4, "text-anchor": side > 0 ? "end" : "start", class: "reach-lbl" }, label);
  }

  // 3. D24 plain direction sectors (-35, -12, +12, +35 deg inside table; labels along top).
  for (const deg of [-35, -12, 12, 35]) {
    const a = deg * Math.PI / 180;
    const [x0, y0] = project(Math.sin(a) * 0.10, Math.cos(a) * 0.10);
    const [x1, y1] = project(Math.sin(a) * 1.70, Math.cos(a) * 1.70);
    add(surface, "line", { x1: x0, y1: y0, x2: x1, y2: y1, class: "sector-line" });
  }
  const dirLabels = [
    [-46, "Left"], [-23.5, "Slightly Left"], [0, "In Front"], [23.5, "Slightly Right"], [46, "Right"],
  ];
  for (const [deg, text] of dirLabels) {
    const a = deg * Math.PI / 180;
    const [lx, ly] = project(Math.sin(a) * 1.65, 1.65);
    add(svg, "text", { x: lx, y: Math.max(24, ly - 10), "text-anchor": "middle", class: "zone-dir" }, text);
  }

  // Chest origin ("YOU").
  const [yx, yy] = project(0, 0);
  const you = add(svg, "g", { class: "you" });
  add(you, "circle", { cx: yx, cy: yy, r: 10 });
  add(you, "text", { x: yx + 15, y: yy + 4 }, "YOU");

  const statusEl = $("stage-status");
  const p = state.perception;
  if (!p) {
    statusEl.textContent = "waiting for phone"; statusEl.className = "stage-status";
    add(svg, "text", { x: STAGE.cx, y: 240, "text-anchor": "middle", class: "zone" }, "no data from the phone yet");
    return;
  }
  if (!p.pose || !p.world) {
    statusEl.textContent = "orientation pending"; statusEl.className = "stage-status";
    add(svg, "text", { x: STAGE.cx, y: 240, "text-anchor": "middle", class: "zone" }, "no orientation from the phone: positions unknown");
    return;
  }

  // 4. Camera FOV footprint on the table (computed on the phone).
  if (p.view && p.view.every((v) => v && v.length === 2)) {
    const fovPts = p.view.map((v) => project(v[0], v[1]));
    add(svg, "polygon", { points: fovPts.map((q) => q.join(",")).join(" "), class: "view" });
  }

  // 5. World objects: draw markers first, then non-overlapping label pills on top.
  const byId = Object.fromEntries(p.world.map((w) => [w.id, w]));
  const worldSorted = p.world.slice().sort((a, b) => ((b.pos ? b.pos[1] : 1.55) - (a.pos ? a.pos[1] : 1.55)));
  const pendingLabels = [];
  for (const w of worldSorted) {
    const cls = "obj " + ((w.sure ?? w.said) ? "said" : "unsure") + " " + w.seen;
    if (w.pos) {
      const [x, y] = project(w.pos[0], w.pos[1]);
      const r = w.label === "dining table" ? 0 : Math.max(7, Math.min(13, 12 - w.pos[1] * 2.8));
      const g = add(svg, "g", { class: cls });
      if (r > 0) {
        add(g, "ellipse", { cx: x, cy: y + 3, rx: r * 1.15, ry: r * 0.45, class: "shadow" });
        add(g, "circle", { cx: x, cy: y, r, class: "marker" });
      }
      const rel = w.relation && byId[w.relation.to] ? ` · ${w.relation.rel} ${name(byId[w.relation.to].label)}` : "";
      const title = `${name(w.label)}${w.moving ? " (moving)" : ""}`;
      const sub = `${w.distM != null ? `${w.distM.toFixed(2)} m` : ""}${rel}`;
      pendingLabels.push({ cls, x, y, r, title, sub });
    } else if (w.bearingDeg != null && w.label === "person") {
      const clamped = Math.max(-72, Math.min(72, w.bearingDeg));
      const a = clamped * Math.PI / 180;
      const behind = Math.abs(w.bearingDeg) > 95;
      const [x, y] = behind
        ? project(w.bearingDeg < 0 ? -1.10 : 1.10, 0.22)
        : project(Math.sin(a) * 1.50, Math.cos(a) * 1.50);
      const g = add(svg, "g", { class: cls + " person" });
      add(g, "rect", { x: x - 8, y: y - 8, width: 16, height: 16, rx: 2 });
      add(g, "text", { x: x + (w.bearingDeg < 0 ? -12 : 12), y: y + 4, "text-anchor": w.bearingDeg < 0 ? "end" : "start", class: "obj-name" }, behind ? "person (behind)" : "person");
    }
  }

  // 6. Belief ghosts + divergence tethers (Sally-Anne).
  let hasDivergence = false;
  for (const b of p.belief || []) {
    if (!b.pos) continue;
    const [bx, by] = project(b.pos[0], b.pos[1]);
    const g = add(svg, "g", { class: "belief " + b.state });
    add(g, "rect", { x: bx - 7, y: by - 7, width: 14, height: 14, transform: `rotate(45 ${bx} ${by})` });
    const now = byId[b.world];
    const diverged = b.state === "moved_pending" || b.state === "not_seen" || b.state === "lost";
    if (diverged) hasDivergence = true;
    if (now && now.pos && b.state !== "ok") {
      const [nx, ny] = project(now.pos[0], now.pos[1]);
      add(g, "line", { x1: bx, y1: by, x2: nx, y2: ny, class: "divergence" });
      if (diverged) {
        add(g, "text", { x: bx, y: by - 11, "text-anchor": "middle", class: "belief-tag" }, `believed: ${name(b.label)}`);
        const mx = (bx + nx) / 2, my = (by + ny) / 2;
        add(g, "rect", { x: mx - 24, y: my - 9, width: 48, height: 16, rx: 2, class: "div-pill" });
        add(g, "text", { x: mx, y: my + 3, "text-anchor": "middle", class: "div-text" }, "MOVED");
      }
    }
  }
  statusEl.textContent = hasDivergence ? "belief != world" : "proactive silence";
  statusEl.className = "stage-status" + (hasDivergence ? " alert" : "");

  // Draw object label pills on top of markers/beliefs, nudging to avoid overlaps.
  const placedBoxes = [];
  const overlaps = (a, b) => !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
  for (const lbl of pendingLabels) {
    const boxW = Math.max(lbl.title.length * 8.4, lbl.sub.length * 6.8) + 14;
    const boxH = lbl.sub ? 34 : 20;
    const candidates = [
      [lbl.x + lbl.r + 8, lbl.y - boxH / 2],
      [lbl.x - lbl.r - 8 - boxW, lbl.y - boxH / 2],
      [lbl.x + lbl.r + 8, lbl.y - boxH - 6],
      [lbl.x + lbl.r + 8, lbl.y + 8],
      [lbl.x - lbl.r - 8 - boxW, lbl.y - boxH - 6],
      [lbl.x - lbl.r - 8 - boxW, lbl.y + 8],
      [lbl.x + lbl.r + 8, lbl.y - boxH - 32],
      [lbl.x + lbl.r + 8, lbl.y + 34],
    ];
    let chosen = candidates[0];
    for (const [cx, cy] of candidates) {
      const bx = Math.max(8, Math.min(892 - boxW, cx));
      const by = Math.max(26, Math.min(450 - boxH, cy));
      const rect = [bx - 2, by - 2, bx + boxW + 2, by + boxH + 2];
      if (!placedBoxes.some((pBox) => overlaps(rect, pBox))) {
        chosen = [bx, by];
        break;
      }
    }
    const lx = Math.max(8, Math.min(892 - boxW, chosen[0]));
    const ly = Math.max(26, Math.min(450 - boxH, chosen[1]));
    placedBoxes.push([lx - 2, ly - 2, lx + boxW + 2, ly + boxH + 2]);
    const g = add(svg, "g", { class: lbl.cls });
    add(g, "rect", { x: lx, y: ly, width: boxW, height: boxH, rx: 2, class: "obj-pill" });
    add(g, "text", { x: lx + 7, y: ly + 14, class: "obj-name" }, lbl.title);
    if (lbl.sub) add(g, "text", { x: lx + 7, y: ly + 28, class: "obj-sub" }, lbl.sub);
  }

  // 7. Live fingertip on table + 2.5D guidance ray.
  const h = state.hands;
  let activeTip = null;
  if (h && (p.t - h.t) < 500) {
    for (const hand of h.hands) {
      if (!hand.tipOnTable) continue;
      const [tx, ty] = project(hand.tipOnTable[0], hand.tipOnTable[1]);
      if (!activeTip) activeTip = [tx, ty];
      add(svg, "circle", { cx: tx, cy: ty, r: 9, class: "tip-ring" });
      add(svg, "circle", { cx: tx, cy: ty, r: 4, class: "tip" });
      add(svg, "text", { x: tx + 12, y: ty + 4, class: "tip-label" }, `${hand.side} tip`);
    }
  }
  const g = state.guidance;
  if (g && (p.t - g.t) < 1500 && g.target != null) {
    const tgt = byId[g.target];
    if (tgt && tgt.pos) {
      const [gx, gy] = project(tgt.pos[0], tgt.pos[1]);
      const [fx, fy] = activeTip || [yx, yy];
      add(svg, "line", { x1: fx, y1: fy, x2: gx, y2: gy, class: "stage-guide" + (g.correction ? " correction" : "") });
    }
  }

  const t = p.table;
  $("geom").textContent = `camera tilt ${p.pose.tiltDeg}° below horizon · turned ${(p.pose.yawDeg - p.pose.forwardYawDeg).toFixed(0)}° from forward · ` +
    `height ${t ? t.heightM.toFixed(2) + " m (" + (t.source === "rulers" ? "rulers" : "default") + ")" : "unknown"}`;
}

// ---- Eyes: the camera view, raw guesses faint, tracks, hand skeletons ----

const BONES = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];

function renderEyes() {
  const svg = $("eyes");
  svg.replaceChildren();
  const W = 300, H = 400;
  add(svg, "rect", { x: 0.5, y: 0.5, width: W - 1, height: H - 1, class: "edge" });
  const p = state.perception;
  if (!p) return;
  const b = (box) => ({ x: box[0] * W, y: box[1] * H, width: Math.max(1, (box[2] - box[0]) * W), height: Math.max(1, (box[3] - box[1]) * H) });
  for (const r of p.raw) add(svg, "rect", { ...b(r.box), class: "raw" });
  for (const t of p.tracks.filter((t) => t.confirmed)) {
    const g = add(svg, "g", { class: "obj " + ((t.sure ?? t.said) ? "said" : "unsure") });
    add(g, "rect", b(t.box));
    add(g, "text", { x: t.box[0] * W + 3, y: Math.max(12, t.box[1] * H - 3) }, `${name(t.label)} ${t.score.toFixed(2)}`);
    const v = state.system2 && state.system2.objects.find((o) => o.track === t.id && o.verdict !== "unsure");
    if (v) add(svg, "text", { x: t.box[0] * W + 3, y: t.box[3] * H + 12, class: "verdict " + v.verdict }, v.verdict === "picture" ? "PICTURE" : "REAL");
  }
  const g = state.guidance;
  if (g && g.vector && (p.t - g.t) < 1500) {
    const tipHand = state.hands && state.hands.hands.length ? state.hands.hands[0].landmarks[8] : null;
    const from = g.mode === "hand" && tipHand ? tipHand : [0.5, 0.5];
    add(svg, "line", { x1: from[0] * W, y1: from[1] * H, x2: (from[0] + g.vector[0]) * W, y2: (from[1] + g.vector[1]) * H, class: "guide" + (g.correction ? " correction" : "") });
  }
  const h = state.hands;
  if (h && (p.t - h.t) < 500) {
    for (const hand of h.hands) {
      const L = hand.landmarks.map(([x, y]) => [x * W, y * H]);
      for (const [a, c] of BONES) add(svg, "line", { x1: L[a][0], y1: L[a][1], x2: L[c][0], y2: L[c][1], class: "bone" });
      add(svg, "text", { x: L[0][0] + 4, y: L[0][1] + 12, class: "handlabel" }, `${hand.side} hand ${hand.score.toFixed(2)}`);
    }
  }
}

// ---- World map table ----

function renderWorld() {
  const body = $("world").querySelector("tbody");
  const p = state.perception;
  const rows = p && p.world ? p.world.slice().sort((a, b) => (b.said - a.said) || (a.ageMs - b.ageMs)) : [];
  body.replaceChildren(...(rows.length ? rows.map((w) => {
    const tr = el("tr", { class: ((w.sure ?? w.said) ? "said" : "unsure") + " " + w.seen });
    const where = [w.direction || "", w.reach ? REACH[w.reach] : "", w.distM != null ? `≈ ${w.distM.toFixed(2)} m` : ""].filter(Boolean).join(", ");
    const st = { in_view: "in view", out_of_view: `out of view, ${(w.ageMs / 1000).toFixed(0)} s`, not_seen: `not seen, ${(w.ageMs / 1000).toFixed(1)} s` }[w.seen] +
      (w.seen === "in_view" ? (w.moving ? " · moving" : w.resting ? " · resting" : "") : "");
    tr.append(el("td", { class: "num" }, w.id), el("td", { class: "label" }, name(w.label)), el("td", {}, where),
      el("td", {}, st), el("td", {}, w.said ? "yes" : "no"), el("td", { class: "why" }, w.reason || ""));
    return tr;
  }) : [emptyRow(6, p ? (p.world ? "nothing in the world map" : "no orientation: world map not built") : "no data from the phone yet")]));
}

const STANDING = {
  ok: "where you believe", moving: "being moved", moved_pending: "rests elsewhere: checking", back_pending: "seen again: checking", hidden: "hidden (hand or person)",
  not_seen: "not seen at its spot", lost: "told: can't see it", out_of_view: "camera looks away", unknown: "no evidence",
};

function renderBelief() {
  const body = $("belief").querySelector("tbody");
  const p = state.perception;
  const rows = p && p.belief ? p.belief : [];
  body.replaceChildren(...(rows.length ? rows.map((b) => {
    const tr = el("tr", { class: "belief-" + b.state });
    tr.append(el("td", { class: "num" }, b.world), el("td", { class: "label" }, name(b.label)), el("td", {}, STANDING[b.state] || b.state),
      el("td", { class: "num" }, b.evidenceMs ? `${(b.evidenceMs / 1000).toFixed(1)} s` : ""), el("td", { class: "why" }, b.note));
    return tr;
  }) : [emptyRow(5, p ? "nothing told yet: tap for a brief" : "no data from the phone yet")]));
}

// ---- Theory of mind: for each told object, the user's belief against the world, and the decision ----

const secs = (ms) => ms < 10000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms / 1000)} s`;
const DECIDE = {
  ok: ["beliefs agree", "stay silent", ""],
  moving: ["being moved", "wait until it rests", "watch"],
  moved_pending: ["FALSE BELIEF", "speak once the evidence holds 0.6 s", "false"],
  back_pending: ["it is back", "check, then say so", "watch"],
  hidden: ["no evidence (hidden by a hand or a person)", "stay silent", ""],
  not_seen: ["maybe gone", "speak if the spot stays empty 3–5 s", "watch"],
  lost: ["user already told it is gone", "stay silent", ""],
  out_of_view: ["no evidence (camera looks away)", "stay silent", ""],
  unknown: ["no evidence", "stay silent", ""],
};

function worldSays(b, w) {
  if (b.state === "not_seen" || b.state === "lost") return `spot empty${b.evidenceMs ? ` for ${secs(b.evidenceMs)}` : ""}`;
  if (b.state === "hidden") return "covered";
  if (b.state === "out_of_view") return "not in view";
  if (!w) return "not in the world map";
  const where = w.direction ? `${w.direction}${w.reach ? ", " + REACH[w.reach] : ""}` : "position unknown";
  if (b.state === "moved_pending") return `${where} · resting there for ${secs(b.evidenceMs)}`;
  if (b.state === "moving") return `${where} · moving`;
  return where;
}

function renderMind() {
  const p = state.perception;
  const rows = p && p.belief ? p.belief : [];
  const byId = p && p.world ? Object.fromEntries(p.world.map((w) => [w.id, w])) : {};
  $("tom").replaceChildren(...(rows.length ? rows.map((b) => {
    const [verdict, action, cls] = DECIDE[b.state] || [b.state, "", ""];
    const d = el("div", { class: "tomrow " + cls });
    d.append(el("span", { class: "who" }, `${name(b.label)} #${b.world}`),
      el("span", {}, `User believes: ${b.direction || "?"} (told ${secs(p.t - b.sinceMs)} ago)`),
      el("span", {}, `World: ${worldSays(b, byId[b.world])}`),
      el("span", { class: "decision" }, `→ ${verdict} → ${action}`));
    return d;
  }) : [el("p", { class: "empty" }, p ? "the user has been told nothing yet: tap for a brief" : "no data from the phone yet")]));

  const a = state.lastFalse;
  const box = $("tom-last");
  if (!a || !a.believed) { box.replaceChildren(); return; }
  const nowT = p ? p.t : a.t;
  const where = a.now ? a.now.direction : a.kind === "stopped" ? "gone" : "elsewhere";
  const world = a.kind === "lost" ? `spot empty for ${secs(a.evidenceMs)}, uncovered, camera still`
    : a.kind === "stopped" ? `${name(a.label)} ${where}`
    : `${name(a.label)} ${where} (resting there ${secs(a.evidenceMs)})`;
  const verdict = a.kind === "back" ? "it is back"
    : a.kind === "stopped" ? `FALSE BELIEF, shown by the hand: heading to the old spot, ${(a.reach.distance * 100).toFixed(0)}% of the frame away, ~${secs(a.reach.etaMs)} from it`
    : "FALSE BELIEF";
  const told = a.believed.toldMs != null ? ` (told ${secs(a.t - a.believed.toldMs)} before)` : " (corrected earlier)";
  box.replaceChildren(el("div", { class: "tomlast" },
    `${a.kind === "stopped" ? "Stopped reach" : "Last correction"}, ${secs(nowT - a.t)} ago · User believed: ${name(a.label)} ${a.believed.direction}${told} · ` +
    `World: ${world} → ${verdict} → said “${a.text}”`));
}

// ---- System 2: each assessed object's evidence, from the phone's ledger (docs/SYSTEM2.md 4.9) ----

const CUE = { in_screen: "inside a screen", moves_as_plane: "moves as one plane", screen_light: "light from around it", torch: "torch test" };

function renderSystem2() {
  const box = $("s2");
  const m = state.system2;
  const p = state.perception;
  if (!m || !m.objects.length || (p && p.t - m.t > 3000)) {
    box.replaceChildren(el("p", { class: "empty" }, p ? "no evidence about any object yet (only standing kit objects, inside a screen or while the view moves)" : "no data from the phone yet"));
  } else {
    const lim = 5, W = 260;
    const xOf = (v) => (Math.max(-lim, Math.min(lim, v)) + lim) / (2 * lim) * W;
    box.replaceChildren(...m.objects.map((o) => {
      const d = el("div", { class: "s2obj" });
      const head = el("div", { class: "s2head" });
      head.append(el("span", { class: "label" }, `${name(o.label)} #${o.world}`),
        el("span", { class: "meta" }, o.s1Score != null ? `detector ${o.s1Score.toFixed(2)}` : "out of view"),
        el("span", { class: "verdict " + o.verdict }, o.verdict === "unsure" ? (o.doubt ? "unsure · held back" : "unsure") : o.verdict.toUpperCase()),
        el("span", { class: "meta" }, `P(real) ${o.pReal.toFixed(2)}`));
      const svg = document.createElementNS(SVG, "svg");
      svg.setAttribute("viewBox", `0 0 ${W} 22`); svg.setAttribute("class", "s2bar");
      add(svg, "line", { x1: 0, y1: 11, x2: W, y2: 11, class: "grid" });
      for (const [v, t] of [[m.bounds.reject, "picture"], [m.bounds.state, "real"]]) {
        add(svg, "line", { x1: xOf(v), y1: 3, x2: xOf(v), y2: 19, class: "bound" });
        add(svg, "text", { x: xOf(v) + (v < 0 ? -3 : 3), y: 20, "text-anchor": v < 0 ? "end" : "start", class: "zone" }, t);
      }
      add(svg, "line", { x1: xOf(0), y1: 7, x2: xOf(0), y2: 15, class: "grid" });
      add(svg, "circle", { cx: xOf(o.llr), cy: 11, r: 5, class: "llr " + o.verdict });
      const cues = el("ul", { class: "cues" });
      for (const c of o.cues) cues.append(el("li", { class: c.counted === false ? "uncounted" : "" },
        `${c.llr > 0 ? "+" : ""}${c.llr.toFixed(1)}  ${CUE[c.cue] || c.cue} · ${c.views} view${c.views === 1 ? "" : "s"} · ${c.detail}` +
        (c.counted === false ? " · not counted: never seen inside a screen" : "")));
      if (o.size) cues.append(el("li", { class: o.size.plausible ? "" : "uncounted" },
        `size · ${(o.size.widthM * 100).toFixed(0)} cm wide on the table (median of ${o.size.readings}) · ${o.size.plausible ? "fits" : "does not fit"} ${name(o.label)}`));
      d.append(head, svg, cues);
      return d;
    }));
  }
  const pl = state.plane && state.plane.plane;
  $("s2-plane").textContent = pl && p && p.t - state.plane.t < 5000
    ? `last plane check: object #${pl.world} strays ${pl.ratio.toFixed(2)} × the view's motion (${pl.motionPx.toFixed(1)} px, ${pl.ringPoints} ring points) · flat ≤ 0.15, stands out ≥ 0.45`
    : "plane check: waits for a standing object and a little phone movement";
}

function renderBrief() {
  const b = state.brief;
  if (!b) return;
  $("brief-text").textContent = `“${b.text}”`;
  $("brief-meta").textContent = `tap → decision ${b.tapToDecisionMs} ms · ${b.waitedToSettle ? "waited to settle" : "spoke at once"} · ${b.clipReady ? "prepared clip" : "live speech"}`;
  const reasons = b.leftOut.filter((l) => !l.reason.startsWith("not yet confirmed"));
  $("brief-left").replaceChildren(...reasons.map((l) => el("li", {}, `${name(l.label)}: ${l.reason}`)));
}

function renderRates() {
  const r = state.rates;
  if (!r) return;
  const heat = r.heat && r.heat.tier ? ` · heat ${r.heat.tier}` : "";
  $("rates").textContent = `camera ${r.cameraFps} fps · detector ${r.detectorRunsPerS}/s (${r.detectorP50Ms ?? "–"} ms) · hands ${r.handsPerS ?? "–"}/s${heat} · dropped ${r.linkDropped}`;
}

const EVENT = { guide_left: "left", guide_right: "right", closer: "closer", guide_back: "back", arrived: "arrived", look_again: "look again" };

function renderActions() {
  const g = state.guidance;
  if (g && g.bias) {
    const b = g.bias;
    $("bias").textContent = b.reaches === 0 ? "reach bias: no guided reaches measured yet" :
      `reach bias over ${b.reaches} reaches: ${b.confident ? `${b.y < 0 ? "stops short" : b.y > 0 ? "reaches far" : ""}${b.x ? (b.x > 0 ? " · drifts left" : " · drifts right") : ""} (compensating)` : "no consistent bias yet"}`;
  }
  $("actions").replaceChildren(...state.actions.map((a) => {
    const li = el("li", { class: a.correction ? "alert" : "" });
    li.append(el("span", { class: "when" }, a.mode), document.createTextNode(`${EVENT[a.event] || a.event}${a.correction ? " · correction" : ""} · ${name(a.label)}${a.phrase ? ` · “${a.phrase}”` : ""}`));
    return li;
  }));
}

function renderTimeline() {
  const list = state.filter === "decisions"
    ? state.timeline.filter((e) => e.tier === "signal")
    : state.timeline;
  $("timeline").replaceChildren(...(list.length ? list.map((e) => {
    const li = el("li", { class: `${e.tier} ${e.cls || ""}`.trim() });
    const top = el("div", { class: "log-top" });
    top.append(
      el("span", { class: "when" }, e.at.toLocaleTimeString()),
      el("span", { class: "badge" }, e.kind),
      el("span", { class: "log-main" }, e.text),
    );
    li.append(top);
    if (e.why) li.append(el("div", { class: "log-why" }, e.why));
    return li;
  }) : [el("li", { class: "noise" }, state.filter === "decisions" ? "No high-value cognitive decisions yet." : "Waiting for feed events…")]));
}

function emptyRow(n, text) { const tr = el("tr"); tr.append(el("td", { colspan: n, class: "why" }, text)); return tr; }

function add(parent, tag, attrs, text) {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  parent.appendChild(n);
  return n;
}

function el(tag, attrs = {}, text) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = String(text);
  return n;
}

setupFilterControls();
connect();
requestAnimationFrame(frame);
