let ctx;
function beep() {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  const t0 = ctx.currentTime;
  [0, 0.28, 0.56].forEach((offset) => {
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o1.type = "sine";
    o1.frequency.value = 880;
    o2.type = "sine";
    o2.frequency.value = 440;
    g.gain.setValueAtTime(0, t0 + offset);
    g.gain.linearRampToValueAtTime(0.35, t0 + offset + 0.02);
    g.gain.linearRampToValueAtTime(0, t0 + offset + 0.22);
    o1.connect(g);
    o2.connect(g);
    g.connect(ctx.destination);
    o1.start(t0 + offset);
    o1.stop(t0 + offset + 0.24);
    o2.start(t0 + offset);
    o2.stop(t0 + offset + 0.24);
  });
}

const VEHICLE_COORDS = [20.2725, 85.8380];
const SESSION_FLAG = "ashvin_alerts_enabled";
const NOTIF_STORAGE_KEY = "ashvin_family_notifications";
const CRASH_STORAGE_KEY = "ashvin_family_crash_detection";
const BANNER_AUTO_DISMISS_MS = 20000;

const enableBtn = document.getElementById("enable-alerts-btn");
const alertsOnPill = document.getElementById("alerts-on-pill");
const alertBanner = document.getElementById("alert-banner");
const bannerText = document.getElementById("banner-text");
const silenceBtn = document.getElementById("silence-btn");
const statusCard = document.getElementById("status-card");
const statusTitle = document.getElementById("status-title");
const statusSub = document.getElementById("status-sub");
const locateBtn = document.getElementById("locate-btn");
const reportBtn = document.getElementById("report-btn");

const tabButtons = document.querySelectorAll(".tabbar .tab");
const views = document.querySelectorAll(".view");
const settingsOverlay = document.getElementById("settings-overlay");
const settingsGearBtn = document.getElementById("settings-gear-btn");
const settingsBackBtn = document.getElementById("settings-back-btn");
const notifToggle = document.getElementById("toggle-notifications");
const crashToggle = document.getElementById("toggle-crash-detection");
const crashPausedNote = document.getElementById("crash-paused-note");
const demoToast = document.getElementById("demo-toast");

const activityTimeline = document.getElementById("activity-timeline");
const totalIncidentsEl = document.getElementById("total-incidents");
const segButtons = document.querySelectorAll(".seg .seg-btn");

const INITIAL_ACTIVITY_HTML = activityTimeline.innerHTML;

let currentView = "map";
const viewHistory = [];
let activityFilter = "all";
let totalIncidentsCount = 3;
let toastTimer = null;

let notificationsEnabled = localStorage.getItem(NOTIF_STORAGE_KEY) !== "false";
let crashDetectionEnabled = localStorage.getItem(CRASH_STORAGE_KEY) !== "false";

let beepRepeatTimer = null;
let autoDismissTimer = null;
let dismissHideTimer = null;
let dismissedForIncident = false;

/* ── Toast & Settings toggles ──────────────────────────────────── */
function showToast(message = "Not part of this demo") {
  demoToast.textContent = message;
  demoToast.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    demoToast.hidden = true;
    toastTimer = null;
  }, 2200);
}

function syncToggleUI() {
  notifToggle.checked = notificationsEnabled;
  crashToggle.checked = crashDetectionEnabled;
  crashPausedNote.hidden = crashDetectionEnabled;
}

syncToggleUI();

notifToggle.addEventListener("change", () => {
  notificationsEnabled = notifToggle.checked;
  localStorage.setItem(NOTIF_STORAGE_KEY, String(notificationsEnabled));
  if (!notificationsEnabled) {
    stopAlertSound();
  }
});

crashToggle.addEventListener("change", () => {
  crashDetectionEnabled = crashToggle.checked;
  localStorage.setItem(CRASH_STORAGE_KEY, String(crashDetectionEnabled));
  crashPausedNote.hidden = crashDetectionEnabled;
});

/* ── Navigation (4 views + Settings overlay) ───────────────────── */
function switchView(nextView, { pushHistory = true } = {}) {
  if (!nextView || nextView === currentView) return;
  if (pushHistory) {
    viewHistory.push(currentView);
  }
  currentView = nextView;

  views.forEach((v) => {
    const active = v.dataset.view === nextView;
    v.hidden = !active;
    v.classList.toggle("active", active);
  });

  tabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === nextView);
  });

  if (nextView === "map") {
    setTimeout(() => map.invalidateSize(), 0);
  }
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    settingsOverlay.hidden = true;
    switchView(btn.dataset.tab);
  });
});

document.querySelectorAll(".back-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const prev = viewHistory.pop() || "map";
    switchView(prev, { pushHistory: false });
  });
});

if (reportBtn) {
  reportBtn.addEventListener("click", () => {
    switchView("report");
  });
}

function openSettings() {
  settingsOverlay.hidden = false;
}

settingsGearBtn.addEventListener("click", openSettings);
document.querySelectorAll(".gear-trigger").forEach((btn) => {
  btn.addEventListener("click", openSettings);
});

settingsBackBtn.addEventListener("click", () => {
  settingsOverlay.hidden = true;
});

document.addEventListener("click", (e) => {
  const stub = e.target.closest(".demo-stub");
  if (stub) {
    showToast("Not part of this demo");
  }
});

/* ── Audio & Banner ────────────────────────────────────────────── */
function shortTone() {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  const t0 = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.value = 880;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(0.06, t0 + 0.015);
  g.gain.linearRampToValueAtTime(0, t0 + 0.09);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + 0.1);
}

function setAlertsUnlockedUI() {
  enableBtn.hidden = true;
  alertsOnPill.hidden = false;
}

if (sessionStorage.getItem(SESSION_FLAG) === "1") {
  setAlertsUnlockedUI();
}

enableBtn.addEventListener("click", async () => {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
  shortTone();
  sessionStorage.setItem(SESSION_FLAG, "1");
  setAlertsUnlockedUI();
});

function stopAlertSound() {
  if (beepRepeatTimer) {
    clearInterval(beepRepeatTimer);
    beepRepeatTimer = null;
  }
  if (ctx && ctx.state === "running") {
    ctx.suspend();
  }
}

function clearBannerTimers() {
  if (autoDismissTimer) {
    clearTimeout(autoDismissTimer);
    autoDismissTimer = null;
  }
  if (dismissHideTimer) {
    clearTimeout(dismissHideTimer);
    dismissHideTimer = null;
  }
}

function scheduleAutoDismiss() {
  if (autoDismissTimer) clearTimeout(autoDismissTimer);
  autoDismissTimer = setTimeout(() => {
    dismissBanner();
  }, BANNER_AUTO_DISMISS_MS);
}

function showBanner(text, tone) {
  if (dismissedForIncident) return;
  clearBannerTimers();
  alertBanner.className = `alert-banner ${tone}`;
  bannerText.textContent = text;
  alertBanner.hidden = false;
  scheduleAutoDismiss();
}

function dismissBanner() {
  stopAlertSound();
  dismissedForIncident = true;
  clearBannerTimers();
  if (alertBanner.hidden) return;
  alertBanner.classList.add("hiding");
  dismissHideTimer = setTimeout(() => {
    alertBanner.hidden = true;
    alertBanner.classList.remove("hiding");
    dismissHideTimer = null;
  }, 220);
}

function resetBannerForNewRun() {
  if (beepRepeatTimer) {
    clearInterval(beepRepeatTimer);
    beepRepeatTimer = null;
  }
  clearBannerTimers();
  dismissedForIncident = false;
  alertBanner.classList.remove("hiding");
  alertBanner.hidden = true;
}

silenceBtn.addEventListener("click", dismissBanner);

/* ── Map ───────────────────────────────────────────────────────── */
const map = L.map("family-map", { zoomControl: false, attributionControl: false }).setView(
  VEHICLE_COORDS,
  13
);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

const incidentMarker = L.marker(VEHICLE_COORDS, {
  icon: L.divIcon({
    className: "incident-pin-wrap",
    html: '<div id="incident-pin-dot" class="incident-pin"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  }),
}).addTo(map);

const pois = [
  { coords: [20.256, 85.833], label: "Hospital 2.4 km" },
  { coords: [20.236, 85.806], label: "Police Station 1.8 km" },
  { coords: [20.2495, 85.8135], label: "Pharmacy 0.9 km" },
  { coords: [20.241, 85.826], label: "Help Point 1.2 km" },
];

pois.forEach((poi) => {
  L.marker(poi.coords, {
    icon: L.divIcon({
      className: "poi-pin-wrap",
      html: `<div class="poi-label">${poi.label}</div>`,
      iconSize: [110, 22],
      iconAnchor: [55, 11],
    }),
  }).addTo(map);
});

locateBtn.addEventListener("click", () => {
  map.setView(incidentMarker.getLatLng(), 14);
});

function setPinPulsing(active) {
  const pinDot = document.getElementById("incident-pin-dot");
  if (pinDot) pinDot.classList.toggle("pulsing", active);
}

function startAlarmLoop() {
  if (!notificationsEnabled) return;
  beep();
  if (!beepRepeatTimer) {
    beepRepeatTimer = setInterval(() => {
      if (notificationsEnabled) {
        beep();
      }
    }, 2200);
  }
}

/* ── Activity Timeline ─────────────────────────────────────────── */
const ACTIVITY_ICONS = {
  warning: '<svg class="t-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3L2 21h20z" fill="currentColor" stroke="currentColor" stroke-linejoin="round"/><path d="M12 10v5M12 17.8h.01" stroke="#fff" stroke-width="2.4"/></svg>',
  phone: '<svg class="t-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" stroke="none" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z"/></svg>',
  pin: '<svg class="t-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" stroke="none" d="M12 2C7.9 2 5 5 5 8.8 5 14 12 22 12 22s7-8 7-13.2C19 5 16.1 2 12 2zm0 9.5a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4z"/></svg>',
  check: '<svg class="t-svg big" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor" stroke="none"/><path d="M7 12.5l3.5 3.5L17 9" stroke="#fff" stroke-width="2.6"/></svg>',
  hospital: '<svg class="t-svg" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" fill="currentColor" stroke="none"/><path d="M12 8v8M8 12h8" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>',
  sms: '<svg class="t-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" stroke="none" d="M4 5h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-4 3V7a2 2 0 0 1 2-2z"/><path d="M8 11h8M8 14h5" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
};

function formatEventTime(ts) {
  const d = ts ? new Date(ts) : new Date();
  if (Number.isNaN(d.getTime())) {
    return "Just now";
  }
  return "Today \u2022 " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function applyActivityFilter() {
  activityTimeline.querySelectorAll(".t-item").forEach((item) => {
    const show = activityFilter === "all" || item.dataset.kind === activityFilter;
    item.hidden = !show;
  });
}

segButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    activityFilter = btn.dataset.filter || "all";
    segButtons.forEach((b) => b.classList.toggle("active", b === btn));
    applyActivityFilter();
  });
});

function prependActivityItem({ title, desc, color, iconKey, kind, ts }) {
  const li = document.createElement("li");
  li.className = "t-item demo-stub";
  li.dataset.kind = kind;
  li.setAttribute("role", "button");
  li.setAttribute("tabindex", "0");

  const iconSpan = document.createElement("span");
  iconSpan.className = `t-icon ${color}`;
  iconSpan.innerHTML = ACTIVITY_ICONS[iconKey] || ACTIVITY_ICONS.warning;

  const textDiv = document.createElement("div");
  textDiv.className = "t-text";

  const strong = document.createElement("strong");
  strong.textContent = title;

  const when = document.createElement("span");
  when.className = "when";
  when.textContent = formatEventTime(ts);

  const descEl = document.createElement("span");
  descEl.className = "desc";
  descEl.textContent = desc;

  textDiv.append(strong, when, descEl);

  const chev = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  chev.setAttribute("class", "r-chev");
  chev.setAttribute("viewBox", "0 0 24 24");
  chev.setAttribute("aria-hidden", "true");
  chev.innerHTML = '<path d="M9 5l7 7-7 7"/>';

  li.append(iconSpan, textDiv, chev);
  activityTimeline.prepend(li);
  applyActivityFilter();
}

function recordActivityEvent(event) {
  const data = event.data || {};
  const ts = event.t_server || event.t_client || event.ts;

  if (event.type === "impact_detected") {
    totalIncidentsCount += 1;
    totalIncidentsEl.textContent = String(totalIncidentsCount);
    const sev = data.severity ? `Severity: ${data.severity}` : "Sudden impact detected.";
    prependActivityItem({
      title: "Incident Detected",
      desc: sev,
      color: "red",
      iconKey: "warning",
      kind: "incidents",
      ts,
    });
    return;
  }

  if (event.type === "alert_confirmed") {
    const level = String(data.level || "unknown");
    const isLow = level === "low";
    prependActivityItem({
      title: "Alert Confirmed",
      desc: `Level: ${level}`,
      color: isLow ? "plain" : "red",
      iconKey: isLow ? "check" : "warning",
      kind: "alerts",
      ts,
    });
    return;
  }

  if (event.type === "dispatched") {
    const etaPart = data.eta_s != null ? ` \u00b7 ETA ${data.eta_s} s` : "";
    prependActivityItem({
      title: "112 Handover",
      desc: `Emergency dispatch initiated${etaPart}.`,
      color: "green",
      iconKey: "phone",
      kind: "incidents",
      ts,
    });
    return;
  }

  if (event.type === "hospital_notified") {
    const hospital = data.hospital || "nearest trauma center";
    prependActivityItem({
      title: "Hospital Notified",
      desc: `Pre-arrival alert sent to ${hospital}.`,
      color: "blue",
      iconKey: "hospital",
      kind: "alerts",
      ts,
    });
    return;
  }

  if (event.type === "sms_received") {
    const via = data.via ? `via ${data.via}` : "via SMS gateway";
    prependActivityItem({
      title: "Alert Delivered by SMS",
      desc: `Emergency alert received ${via}.`,
      color: "blue",
      iconKey: "sms",
      kind: "alerts",
      ts,
    });
  }
}

function resetActivityTimeline() {
  activityTimeline.innerHTML = INITIAL_ACTIVITY_HTML;
  totalIncidentsCount = 3;
  totalIncidentsEl.textContent = "3";
  applyActivityFilter();
}

/* ── WebSocket Event Handling ──────────────────────────────────── */
function handleEvent(event, { isLive }) {
  if (event.type === "system_reset") {
    resetBannerForNewRun();
    setPinPulsing(false);
    incidentMarker.setLatLng(VEHICLE_COORDS);
    map.panTo(VEHICLE_COORDS);
    statusCard.className = "status-card";
    statusTitle.textContent = "Vehicle Connected";
    statusSub.textContent = "All systems normal";
    resetActivityTimeline();
    return;
  }

  if (isLive) {
    recordActivityEvent(event);
  }

  const data = event.data || {};

  if (event.type === "impact_detected") {
    if (typeof data.lat === "number" && typeof data.lon === "number") {
      incidentMarker.setLatLng([data.lat, data.lon]);
      map.panTo([data.lat, data.lon]);
    }
    resetBannerForNewRun();
    setPinPulsing(false);
    statusCard.className = "status-card amber";
    statusTitle.textContent = "Possible impact detected";
    statusSub.textContent = "Checking with the driver";

    if (isLive) {
      showBanner("Checking with the driver", "neutral");
      if (notificationsEnabled) {
        shortTone();
      }
    }
    return;
  }

  if (event.type === "alert_confirmed") {
    const level = String(data.level || "");

    if (level === "high") {
      statusCard.className = "status-card danger";
      statusTitle.textContent = "Accident detected";
      statusSub.textContent = "Emergency response active";
      setPinPulsing(true);
      if (isLive && !dismissedForIncident) {
        showBanner("Emergency confirmed", "danger");
        startAlarmLoop();
      }
      return;
    }

    if (level === "low") {
      stopAlertSound();
      statusCard.className = "status-card";
      statusTitle.textContent = "Vehicle Connected";
      statusSub.textContent = "All systems normal";
      setPinPulsing(false);
      if (isLive && !dismissedForIncident) {
        showBanner("Driver confirmed they are safe", "safe");
      }
      return;
    }

    if (level === "no_response") {
      statusCard.className = "status-card danger";
      statusTitle.textContent = "Accident detected";
      statusSub.textContent = "Highest priority response";
      setPinPulsing(true);
      if (isLive && !dismissedForIncident) {
        showBanner("No response from driver, treating as highest priority", "danger");
        startAlarmLoop();
      }
    }
    return;
  }

  if (event.type === "dispatched" && isLive && !dismissedForIncident) {
    const eta = data.eta_s ?? 420;
    const current = bannerText.textContent.trim();
    const prefix = current && !current.includes("Ambulance ETA") ? `${current} \u00b7 ` : "";
    showBanner(`${prefix}Ambulance ETA ${eta} s`, "danger");
  }
}

function connect() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onclose = () => setTimeout(connect, 1500);
  ws.onmessage = (msg) => {
    const payload = JSON.parse(msg.data);
    if (payload.kind === "snapshot") {
      payload.events.forEach((ev) => handleEvent(ev, { isLive: false }));
      return;
    }
    if (payload.kind === "error") return;
    handleEvent(payload, { isLive: true });
  };
}

connect();
