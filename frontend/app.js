// When served by the backend (port 8000) use same origin; otherwise (Live Server / file://) call localhost:8000
const BACKEND = location.port === "8000" ? location.origin : "http://localhost:8000";
const WS_URL = BACKEND.replace(/^http/, "ws") + "/ws";

let events = [];
let satLinkOnline = true;

const alertGrid = document.getElementById("alert-grid");
const emptyState = document.getElementById("empty-state");
const outboxBadge = document.getElementById("outbox-badge");
const satToggleBtn = document.getElementById("sat-toggle-btn");

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const CRITICAL = ["WATCHLIST_HIT", "VEHICLE_FLAGGED", "FENCE_INTRUSION"];
const ACCEPTED = ["ACCEPTED_PERSON", "VEHICLE_REGISTERED"];

function classify(ev) {
  if (ev.watchlist_hit || CRITICAL.includes(ev.event_type)) return { card: "critical", pill: "pill-event" };
  if (ACCEPTED.includes(ev.event_type)) return { card: "accepted", pill: "pill-accepted" };
  return { card: "warn", pill: "pill-warn" }; // UNKNOWN_PERSON / UNKNOWN_VEHICLE
}

const snapSrc = (u) => (u && u.startsWith("/") ? BACKEND + u : u);

function renderDashboard() {
  const unsynced = events.filter((e) => !e.synced_to_hq).length;
  if (unsynced > 0) {
    outboxBadge.textContent = `OUTBOX QUEUED: ${unsynced} ALERTS`;
    outboxBadge.classList.remove("hidden");
  } else {
    outboxBadge.classList.add("hidden");
  }

  emptyState.style.display = events.length === 0 ? "block" : "none";

  alertGrid.innerHTML = events
    .map((ev) => {
      const c = classify(ev);
      return `
        <article class="card ${c.card}">
          <div class="snapshot-wrapper">
            <img src="${esc(snapSrc(ev.snapshot_url))}" alt="Snapshot" />
            ${ev.is_night_ir ? `<span class="tag-ir">NIGHT-IR CLAHE</span>` : ""}
            <span class="tag-cam">${esc(ev.camera_id)}</span>
          </div>
          <div class="card-body">
            <div class="status-row">
              <span class="${c.pill}">${esc(ev.event_type)}</span>
              <span class="${ev.synced_to_hq ? "pill-synced" : "pill-queued"}">
                ${ev.synced_to_hq ? "HQ SYNCED" : "QUEUED AT BOP"}
              </span>
            </div>
            <div class="meta">
              <p><span class="label">TARGET:</span> ${esc((ev.target_class || "").toUpperCase())} (ID #${esc(ev.track_id)})</p>
              ${ev.frs_match ? `<p><span class="label">FACE ID:</span> <strong>${esc(ev.frs_match)}</strong></p>` : ""}
              ${ev.anpr_plate ? `<p><span class="label">PLATE:</span> <strong>${esc(ev.anpr_plate)}</strong></p>` : ""}
              ${ev.details ? `<p><span class="label">RECORD:</span> ${esc(ev.details)}</p>` : ""}
              <p><span class="label">TIME:</span> ${new Date(ev.timestamp).toLocaleTimeString()}</p>
            </div>
          </div>
        </article>`;
    })
    .join("");
}

function updateToggleButton() {
  satToggleBtn.textContent = satLinkOnline
    ? "4G/SAT UPLINK: ONLINE (C2 SYNC)"
    : "4G/SAT UPLINK: OFFLINE (BOP LOCAL)";
  satToggleBtn.className = `btn ${satLinkOnline ? "btn-online" : "btn-offline"}`;
}

async function loadInitialEvents() {
  try {
    const [evRes, linkRes] = await Promise.all([
      fetch(`${BACKEND}/api/events`),
      fetch(`${BACKEND}/api/hq-link`),
    ]);
    events = await evRes.json();
    satLinkOnline = (await linkRes.json()).sat_link_online;
    updateToggleButton();
    renderDashboard();
  } catch (err) {
    console.error("Failed to fetch initial data:", err);
  }
}

function connectWebSocket() {
  const ws = new WebSocket(WS_URL);
  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.type === "NEW_BORDER_ALERT") {
      events.unshift(data.event);
      renderDashboard();
    } else if (data.type === "HQ_OUTBOX_FLUSHED") {
      events = events.map((e) => ({ ...e, synced_to_hq: 1 }));
      renderDashboard();
    }
  };
  ws.onclose = () => setTimeout(connectWebSocket, 2000);
}

satToggleBtn.addEventListener("click", async () => {
  satLinkOnline = !satLinkOnline;
  updateToggleButton();
  await fetch(`${BACKEND}/api/hq-link/${satLinkOnline ? "online" : "offline"}`, { method: "POST" });
});

loadInitialEvents();
connectWebSocket();
