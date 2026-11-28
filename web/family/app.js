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

let beepRepeatTimer = null;
let autoDismissTimer = null;
let dismissHideTimer = null;
let dismissedForIncident = false;

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
  beep();
  if (!beepRepeatTimer) {
    beepRepeatTimer = setInterval(beep, 2200);
  }
}

function handleEvent(event, { isLive }) {
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
      shortTone();
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
