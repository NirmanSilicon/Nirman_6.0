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
    coords: [20.251, 85.818],
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
    coords: [20.239, 85.826],
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
    coords: [20.2501, 85.8102],
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
    coords: [20.247, 85.829],
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

const SCENE_MODES = new Set(["crash", "pothole", "hard_brake"]);
let sceneCtrl = null;

function ensureScene() {
  if (!sceneCtrl) {
    sceneCtrl = mountScene(sceneHostEl);
  }
  return sceneCtrl;
}

const map = L.map("map", { zoomControl: true }).setView([20.2725, 85.8380], 12);
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
  kickerEl.textContent = `Scenario ${scenario.id} · ${scenario.key}`;
  titleEl.textContent = scenario.title;
  modeListEl.innerHTML = "";

  scenario.modes.forEach((mode, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mode-btn";
    btn.dataset.modeKey = mode.key;
    btn.textContent = `${mode.label} (${mode.key})`;
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
  const icon = L.divIcon({
    className: "scenario-pin-wrap",
    html: `<div class="scenario-pin" data-scenario="${scenario.key}">${scenario.id}</div>`,
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
