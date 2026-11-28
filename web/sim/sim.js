import { mountScene } from "./scene.js";

const CONFIRMATION_WINDOW_S = 5.0;
const CALL_START_DELAY_S = 1.2;
const FILTER_DELAY_S = 1.2;
const ANSWER_HIGH_DELAY_S = 3.2;
const ANSWER_LOW_DELAY_S = 2.4;
const SILENCE_DELAY_S = CONFIRMATION_WINDOW_S + 0.2;
const DISPATCH_DELAY_S = 1.0;
const HOSPITAL_DELAY_S = 1.0;
const HELP_SITE_DELAY_S = 1.0;
const CITIZEN_CONFIRM_DELAY_S = 1.5;
const CITIZEN_REJECT_DELAY_S = 1.5;
const IDENTITY_DELAY_S = 0.0;
const FIRST_AID_DELAY_S = 0.0;
const SMS_FALLBACK_DELAY_S = 1.0;
const SMS_SENT_DELAY_S = 1.2;
const SMS_OFFLINE_GAP_S = 6.0;
const SMS_RECEIVED_DELAY_S = 1.5;
const SMS_POST_DELAY_S = 1.0;

const SMS_TO_NUMBER = "+911122334455";
const SMS_BODY =
  "ASHVIN ALERT. Unit ASH-07. Crash detected. " +
  "Lat 20.2725, Lon 85.8380. Speed 72 to 0 km/h. 20:41 IST.";
const SMS_CHARS = SMS_BODY.length;

const CRASH_IMPACT = [
  "impact_detected",
  {
    lat: 20.2725,
    lon: 85.8380,
    peak_g: 18.4,
    speed_before: 72,
    speed_after: 0,
    kind: "crash",
  },
  0.0,
];

const CALL_STARTED = [
  "alert_call_started",
  {
    countdown_s: CONFIRMATION_WINDOW_S,
    numbers: ["registered_user", "contact_1"],
  },
  CALL_START_DELAY_S,
];

const ANSWERED_HIGH_PREFIX = [
  CRASH_IMPACT,
  CALL_STARTED,
  ["alert_confirmed", { level: "high" }, ANSWER_HIGH_DELAY_S],
];

const ANSWERED_LOW_PREFIX = [
  CRASH_IMPACT,
  CALL_STARTED,
  ["alert_confirmed", { level: "low" }, ANSWER_LOW_DELAY_S],
];

const SCENARIOS = [
  {
    id: 1,
    key: "detection",
    title: "Detection",
    coords: [20.2725, 85.8380],
    modes: [
      {
        key: "crash",
        label: "Real impact",
        steps: [CRASH_IMPACT, CALL_STARTED],
      },
      {
        key: "pothole",
        label: "Pothole",
        steps: [
          [
            "impact_detected",
            {
              lat: 20.2725,
              lon: 85.8380,
              peak_g: 3.8,
              speed_before: 52,
              speed_after: 52,
              kind: "pothole",
            },
            0.0,
          ],
          [
            "false_trigger_filtered",
            {
              reason: "speed stayed above 30 km/h",
              peak_g: 3.8,
              speed_after: 52,
            },
            FILTER_DELAY_S,
          ],
        ],
      },
      {
        key: "hard_brake",
        label: "Hard brake",
        steps: [
          [
            "impact_detected",
            {
              lat: 20.2725,
              lon: 85.8380,
              peak_g: 5.6,
              speed_before: 60,
              speed_after: 14,
              kind: "hard_brake",
            },
            0.0,
          ],
          [
            "false_trigger_filtered",
            {
              reason: "no sudden drop to near-zero speed",
              peak_g: 5.6,
              speed_after: 14,
            },
            FILTER_DELAY_S,
          ],
        ],
      },
    ],
  },
  {
    id: 2,
    key: "confirmation",
    title: "Confirmation",
    coords: [20.2961, 85.8245],
    modes: [
      {
        key: "answered_high",
        label: "Answered high alert",
        steps: [...ANSWERED_HIGH_PREFIX],
      },
      {
        key: "answered_low",
        label: "Answered low alert",
        steps: [...ANSWERED_LOW_PREFIX],
      },
      {
        key: "silence",
        label: "Silence (no response)",
        steps: [
          CRASH_IMPACT,
          CALL_STARTED,
          ["alert_confirmed", { level: "no_response" }, SILENCE_DELAY_S],
        ],
      },
    ],
  },
  {
    id: 3,
    key: "dispatch",
    title: "Dispatch",
    coords: [20.3550, 85.8180],
    modes: [
      {
        key: "high_risk",
        label: "High risk",
        steps: [
          ...ANSWERED_HIGH_PREFIX,
          ["dispatched", { service: "108", eta_s: 420 }, DISPATCH_DELAY_S],
          [
            "hospital_notified",
            {
              hospital_id: "h-014",
              name: "Capital Hospital",
              distance_km: 2.4,
            },
            HOSPITAL_DELAY_S,
          ],
          [
            "help_site_alerted",
            {
              site_id: "p-03",
              name: "Petrol pump, Jaydev Vihar",
              distance_km: 0.9,
            },
            HELP_SITE_DELAY_S,
          ],
        ],
      },
      {
        key: "lower_risk",
        label: "Lower risk",
        steps: [
          ...ANSWERED_LOW_PREFIX,
          [
            "help_site_alerted",
            {
              site_id: "p-03",
              name: "Petrol pump, Jaydev Vihar",
              distance_km: 0.9,
            },
            HELP_SITE_DELAY_S,
          ],
          [
            "hospital_notified",
            {
              hospital_id: "h-014",
              name: "Capital Hospital",
              distance_km: 2.4,
            },
            HOSPITAL_DELAY_S,
          ],
        ],
      },
    ],
  },
  {
    id: 4,
    key: "citizen",
    title: "Citizen report",
    coords: [20.2390, 85.8080],
    modes: [
      {
        key: "remote",
        label: "Remote forest",
        steps: [
          [
            "citizen_report",
            {
              report_id: "r-77",
              accident_type: "two_wheeler",
              photo_url: "reports/r-77.jpg",
              lat: 20.2501,
              lon: 85.8102,
              zone: "remote",
            },
            0.0,
          ],
          [
            "report_confirmed",
            { report_id: "r-77", confirmations: 2, threshold: 2 },
            CITIZEN_CONFIRM_DELAY_S,
          ],
        ],
      },
      {
        key: "populated",
        label: "Populated city daytime",
        steps: [
          [
            "citizen_report",
            {
              report_id: "r-77",
              accident_type: "two_wheeler",
              photo_url: "reports/r-77.jpg",
              lat: 20.2501,
              lon: 85.8102,
              zone: "populated",
            },
            0.0,
          ],
          [
            "report_confirmed",
            { report_id: "r-77", confirmations: 5, threshold: 5 },
            CITIZEN_CONFIRM_DELAY_S,
          ],
        ],
      },
      {
        key: "false_report",
        label: "False report",
        steps: [
          [
            "citizen_report",
            {
              report_id: "r-88",
              accident_type: "two_wheeler",
              photo_url: "reports/r-88.jpg",
              lat: 20.2501,
              lon: 85.8102,
              zone: "populated",
            },
            0.0,
          ],
          [
            "report_rejected",
            {
              report_id: "r-88",
              reason: "no matching reports, photo inconsistent",
              fine_applied: true,
            },
            CITIZEN_REJECT_DELAY_S,
          ],
        ],
      },
    ],
  },
  {
    id: 5,
    key: "identity",
    title: "Identity and first aid",
    coords: [20.2540, 85.8440],
    modes: [
      {
        key: "identity",
        label: "Identity card",
        steps: [
          [
            "identity_resolved",
            { licence_verified: true, unit_code: "ASH-07" },
            IDENTITY_DELAY_S,
          ],
        ],
      },
      {
        key: "first_aid",
        label: "First aid steps",
        steps: [
          [
            "first_aid_shown",
            {
              steps: [
                "Do not move the victim",
                "Control the bleeding",
                "Keep the airway clear",
              ],
            },
            FIRST_AID_DELAY_S,
          ],
        ],
      },
    ],
  },
  {
    id: 6,
    key: "fallback",
    title: "SMS fallback",
    coords: [20.3105, 85.9010],
    pinClass: "amber",
    modes: [
      {
        key: "data_ok",
        label: "Data link OK",
        steps: [
          ...ANSWERED_HIGH_PREFIX,
          ["dispatched", { service: "108", eta_s: 420 }, DISPATCH_DELAY_S],
        ],
      },
      {
        key: "sms_only",
        label: "SMS fallback",
        steps: [
          CRASH_IMPACT,
          [
            "sms_fallback_started",
            { reason: "no data", to_number: SMS_TO_NUMBER },
            SMS_FALLBACK_DELAY_S,
          ],
          [
            "sms_sent",
            { to: SMS_TO_NUMBER, body: SMS_BODY, chars: SMS_CHARS },
            SMS_SENT_DELAY_S,
          ],
          [
            "sms_received",
            { gateway: "SMS gateway", latency_s: 6 },
            SMS_RECEIVED_DELAY_S,
          ],
          ["alert_confirmed", { level: "high" }, SMS_POST_DELAY_S],
          ["dispatched", { service: "108", eta_s: 420 }, DISPATCH_DELAY_S],
        ],
      },
      {
        key: "offline",
        label: "Offline SMS",
        steps: [
          CRASH_IMPACT,
          [
            "sms_fallback_started",
            { reason: "no signal", to_number: SMS_TO_NUMBER },
            SMS_FALLBACK_DELAY_S,
          ],
          [
            "sms_sent",
            { to: SMS_TO_NUMBER, body: SMS_BODY, chars: SMS_CHARS },
            SMS_OFFLINE_GAP_S,
          ],
          [
            "sms_received",
            { gateway: "SMS gateway", latency_s: 6 },
            SMS_RECEIVED_DELAY_S,
          ],
        ],
      },
    ],
  },
];

const panelEl = document.getElementById("panel");
const kickerEl = document.getElementById("scenario-kicker");
const titleEl = document.getElementById("scenario-title");
const modeSectionEl = document.getElementById("mode-section");
const modeListEl = document.getElementById("mode-list");
const startBtn = document.getElementById("start-btn");
const fullIncidentBtn = document.getElementById("full-incident-btn");
const closeBtn = document.getElementById("close-panel");
const alertEl = document.getElementById("sim-alert");
const metaEl = document.getElementById("run-meta");
const logEl = document.getElementById("sim-log");
const sceneWrapEl = document.getElementById("scene-wrap");
const sceneHostEl = document.getElementById("scene-host");
const sceneCloseBtn = document.getElementById("scene-close");
const resetLogBtn = document.getElementById("reset-log-btn");
const smsBoxEl = document.getElementById("sms-box");
const smsStatusEl = document.getElementById("sms-status");
const smsBubbleEl = document.getElementById("sms-bubble");
const smsBodyEl = document.getElementById("sms-body");
const smsCharsEl = document.getElementById("sms-chars");
const smsDeliveredEl = document.getElementById("sms-delivered");

const SCENE_MODES = new Set(["crash", "pothole", "hard_brake"]);
let sceneCtrl = null;

function ensureScene() {
  if (!sceneCtrl) {
    sceneCtrl = mountScene(sceneHostEl);
  }
  return sceneCtrl;
}

const map = L.map("map", { zoomControl: true }).setView([20.2900, 85.8400], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

const markersByKey = new Map();
let activeScenario = null;
let activeMode = null;
let activeRunToken = 0;

function makeEventId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return "e-" + window.crypto.randomUUID().slice(0, 8);
  }
  return "e-" + Math.random().toString(16).slice(2, 10).padEnd(8, "0");
}

function nowIst() {
  const shifted = new Date(Date.now() + 5.5 * 3600 * 1000);
  return shifted.toISOString().replace("Z", "+05:30");
}

function setAlertBadge(level) {
  alertEl.textContent = level;
  if (level === "high") alertEl.className = "badge high";
  else if (level === "low") alertEl.className = "badge low";
  else if (level === "no_response" || level === "pending") alertEl.className = "badge pending";
  else alertEl.className = "badge";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MODE_ICONS = {
  crash:
    '<path d="M3 15h11l1.5-4.5H5.5L3 15zm2 0v2m8-2v2"/><path d="M18 6l2 2m1 4h-3m0 4l2 2"/>',
  pothole:
    '<path d="M12 4L3 20h18L12 4z"/><path d="M12 10v4"/><circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none"/>',
  hard_brake:
    '<path d="M4.5 17a8.5 8.5 0 1115 0"/><path d="M12 14l4-4"/><circle cx="12" cy="14" r="1.2"/>',
  answered_high:
    '<path d="M18 16H6l1.5-3V10a4.5 4.5 0 119 0v3L18 16z"/><path d="M10 19a2 2 0 004 0"/>',
  answered_low:
    '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
  silence:
    '<path d="M7 5h3l1.5 4-2 1.5a11 11 0 004 4l1.5-2L19 14v3a2 2 0 01-2 2C10.5 19 5 13.5 5 7a2 2 0 012-2z"/><path d="M4 4l16 16"/>',
  high_risk:
    '<path d="M9 4h6v5h5v6h-5v5H9v-5H4V9h5V4z"/>',
  lower_risk:
    '<path d="M12 21s6-5.5 6-10a6 6 0 10-12 0c0 4.5 6 10 6 10z"/><circle cx="12" cy="11" r="2.2"/>',
  remote:
    '<path d="M12 3l-6 8h3.5L6 16h12l-3.5-5H18L12 3z"/><path d="M12 16v5"/>',
  populated:
    '<path d="M4 20V6h7v14M13 20v-9h7v9"/><path d="M7 10h1m-1 4h1m8 1h1"/>',
  false_report:
    '<circle cx="12" cy="12" r="8.5"/><path d="M9 9l6 6m0-6l-6 6"/>',
  identity:
    '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="8.5" cy="11.5" r="2"/><path d="M13 10h5m-5 4h4"/>',
  first_aid:
    '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M12 8v8m-4-4h8"/>',
  data_ok:
    '<path d="M4 9.5a12 12 0 0116 0m-12.5 3.5a7 7 0 019 0"/><circle cx="12" cy="17.5" r="1.2" fill="currentColor" stroke="none"/>',
  sms_only:
    '<path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H9l-5 3V6z"/><path d="M8 9.5h8m-8 3.5h5"/>',
  offline:
    '<path d="M7 18h10a4 4 0 00.5-7.97A5.5 5.5 0 007 8.5 4.5 4.5 0 007 18z"/><path d="M4 4l16 16"/>',
};

function modeIconSvg(modeKey) {
  const paths = MODE_ICONS[modeKey] || '<circle cx="12" cy="12" r="8"/>';
  return (
    `<svg class="mode-icon" viewBox="0 0 24 24" width="20" height="20" ` +
    `fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" ` +
    `stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
  );
}

function selectMode(mode) {
  activeMode = mode;
  Array.from(modeListEl.querySelectorAll(".mode-btn")).forEach((btn) => {
    const isSelected = btn.dataset.modeKey === mode.key;
    btn.classList.toggle("selected", isSelected);
    btn.setAttribute("aria-pressed", isSelected ? "true" : "false");
  });
}

function clearMarkerHighlights() {
  markersByKey.forEach((marker) => {
    const el = marker.getElement();
    if (!el) return;
    const pin = el.querySelector(".scenario-pin");
    if (pin) pin.classList.remove("active");
  });
}

function openScenario(scenario, focusPanel = true) {
  activeScenario = scenario;
  markersByKey.forEach((marker, key) => {
    const el = marker.getElement();
    if (!el) return;
    const pin = el.querySelector(".scenario-pin");
    if (pin) pin.classList.toggle("active", key === scenario.key);
  });

  kickerEl.hidden = false;
  modeSectionEl.hidden = false;
  startBtn.hidden = false;
  metaEl.hidden = false;
  smsBoxEl.hidden = true;
  kickerEl.textContent = `Scenario ${scenario.id} · ${scenario.key}`;
  titleEl.textContent = scenario.title;
  modeListEl.innerHTML = "";

  scenario.modes.forEach((mode, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mode-btn";
    btn.dataset.modeKey = mode.key;
    btn.innerHTML =
      `<span class="mode-radio" aria-hidden="true"></span>` +
      modeIconSvg(mode.key) +
      `<strong class="mode-label">${mode.label}</strong>` +
      `<span class="mode-key">(${mode.key})</span>`;
    btn.addEventListener("click", () => selectMode(mode));
    modeListEl.appendChild(btn);
    if (idx === 0) selectMode(mode);
  });

  panelEl.hidden = false;
  if (scenario.key === "detection") {
    sceneWrapEl.hidden = false;
    ensureScene().reset();
  } else {
    sceneWrapEl.hidden = true;
    if (sceneCtrl) sceneCtrl.reset();
  }
  if (focusPanel) panelEl.focus();
}

function closePanel() {
  panelEl.hidden = true;
  if (sceneCtrl) sceneCtrl.reset();
  if (activeScenario) {
    const marker = markersByKey.get(activeScenario.key);
    const el = marker && marker.getElement();
    if (el) el.focus();
  }
}

async function runScenarioMode(scenario, mode, sceneMode = null) {
  if (!scenario || !mode) return;
  const runToken = ++activeRunToken;
  const eventId = makeEventId();
  const startedAt = performance.now();

  const effectiveSceneMode = sceneMode || (SCENE_MODES.has(mode.key) ? mode.key : null);
  if (effectiveSceneMode) {
    sceneWrapEl.hidden = false;
    ensureScene().play(effectiveSceneMode);
  }

  logEl.innerHTML = "";
  smsBoxEl.hidden = true;
  smsStatusEl.hidden = true;
  smsBubbleEl.hidden = true;
  smsDeliveredEl.hidden = true;
  setAlertBadge("idle");
  metaEl.textContent = `${scenario.key}/${mode.key}  ${eventId}`;

  for (const [eventType, data, delayS] of mode.steps) {
    if (delayS > 0) {
      await sleep(delayS * 1000);
    }
    if (runToken !== activeRunToken) return;

    const payload = {
      type: eventType,
      event_id: eventId,
      source: "sim",
      device_id: "ASH-07",
      t_client: nowIst(),
      data,
    };

    try {
      const resp = await fetch("/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const stored = await resp.json();
      if (runToken !== activeRunToken) return;

      const elapsed = ((performance.now() - startedAt) / 1000).toFixed(2);
      const li = document.createElement("li");
      li.innerHTML =
        `<span class="mono seq">#${stored.seq}</span>` +
        `<span class="type">${stored.type}</span>` +
        `<span class="mono elapsed">+${elapsed}s</span>`;
      logEl.appendChild(li);

      if (stored.type === "impact_detected") {
        setAlertBadge("pending");
      } else if (stored.type === "alert_confirmed") {
        setAlertBadge(String((stored.data && stored.data.level) || "unknown"));
      }
    } catch (err) {
      if (runToken !== activeRunToken) return;
      metaEl.hidden = false;
      metaEl.textContent = `Error sending ${eventType}: ${err.message}`;
      return;
    }
  }
}

function runActiveScenario() {
  return runScenarioMode(activeScenario, activeMode);
}

function runFullIncident() {
  const dispatchScenario = SCENARIOS.find((s) => s.key === "dispatch");
  const highRiskMode = dispatchScenario && dispatchScenario.modes.find((m) => m.key === "high_risk");
  if (!dispatchScenario || !highRiskMode) return;

  activeScenario = null;
  activeMode = null;
  clearMarkerHighlights();

  titleEl.textContent = "Full incident";
  kickerEl.hidden = true;
  modeSectionEl.hidden = true;
  startBtn.hidden = true;
  metaEl.hidden = true;
  panelEl.hidden = false;

  return runScenarioMode(dispatchScenario, highRiskMode, "crash");
}

function wireMarkerElement(marker, scenario) {
  const el = marker.getElement();
  if (!el || el.dataset.wired) return;
  el.dataset.wired = "1";
  el.setAttribute("data-scenario-marker", scenario.key);
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", `Scenario ${scenario.id}: ${scenario.title}`);
  el.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      openScenario(scenario, true);
    }
  });
}

SCENARIOS.forEach((scenario) => {
  const extraClass = scenario.pinClass ? ` ${scenario.pinClass}` : "";
  const icon = L.divIcon({
    className: "scenario-pin-wrap",
    html: `<div class="scenario-pin${extraClass}" data-scenario="${scenario.key}">${scenario.id}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  const marker = L.marker(scenario.coords, {
    icon,
    keyboard: true,
    title: `${scenario.id}. ${scenario.title}`,
    alt: `Scenario ${scenario.id}: ${scenario.title}`,
  }).addTo(map);

  marker.on("click", () => openScenario(scenario, true));
  marker.on("add", () => wireMarkerElement(marker, scenario));
  wireMarkerElement(marker, scenario);

  markersByKey.set(scenario.key, marker);
});

startBtn.addEventListener("click", runActiveScenario);
fullIncidentBtn.addEventListener("click", runFullIncident);
closeBtn.addEventListener("click", closePanel);
sceneCloseBtn.addEventListener("click", () => {
  sceneWrapEl.hidden = true;
  if (sceneCtrl) sceneCtrl.reset();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !panelEl.hidden) {
    closePanel();
  }
});

function openSmsView() {
  if (!panelEl.hidden && activeScenario && activeScenario.key === "fallback") {
    smsBoxEl.hidden = false;
    return;
  }
  clearMarkerHighlights();
  kickerEl.hidden = false;
  kickerEl.textContent = "Scenario 6 · fallback";
  titleEl.textContent = "SMS fallback";
  modeSectionEl.hidden = true;
  startBtn.hidden = true;
  metaEl.hidden = true;
  sceneWrapEl.hidden = true;
  panelEl.hidden = false;
  smsBoxEl.hidden = false;
}

function resetSimLocalState() {
  activeRunToken += 1;
  logEl.innerHTML = "";
  metaEl.textContent = "";
  setAlertBadge("idle");
  smsBoxEl.hidden = true;
  smsStatusEl.hidden = true;
  smsBubbleEl.hidden = true;
  smsDeliveredEl.hidden = true;
  if (sceneCtrl) sceneCtrl.reset();
}

resetLogBtn.addEventListener("click", async () => {
  resetSimLocalState();
  try {
    await fetch("/reset", { method: "POST" });
  } catch (err) {
    metaEl.hidden = false;
    metaEl.textContent = `Reset failed: ${err.message}`;
  }
});

function handleSmsWsEvent(event) {
  if (event.type === "system_reset") {
    resetSimLocalState();
    return;
  }
  const data = event.data || {};
  if (event.type === "sms_fallback_started") {
    openSmsView();
    smsStatusEl.textContent = "Data link down, switching to SMS";
    smsStatusEl.className = "sms-note amber";
    smsStatusEl.hidden = false;
    smsBubbleEl.hidden = true;
    smsDeliveredEl.hidden = true;
    return;
  }
  if (event.type === "sms_sent") {
    openSmsView();
    const body = String(data.body || "");
    const chars = data.chars ?? body.length;
    smsBodyEl.textContent = body;
    smsCharsEl.textContent = `${chars} characters`;
    smsBubbleEl.hidden = false;
    return;
  }
  if (event.type === "sms_received") {
    openSmsView();
    smsDeliveredEl.textContent = "Delivered to server via SMS gateway";
    smsDeliveredEl.className = "sms-note green";
    smsDeliveredEl.hidden = false;
  }
}

function connectWs() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onclose = () => setTimeout(connectWs, 1500);
  ws.onmessage = (msg) => {
    const payload = JSON.parse(msg.data);
    if (payload.kind === "snapshot" || payload.kind === "error") return;
    handleSmsWsEvent(payload);
  };
}

connectWs();
