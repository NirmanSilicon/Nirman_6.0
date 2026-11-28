const dotEl = document.getElementById("dot");
const connEl = document.getElementById("conn");
const cardEl = document.getElementById("incident-card");
const incidentIdEl = document.getElementById("incident-id");
const headlineEl = document.getElementById("headline");
const countdownBoxEl = document.getElementById("countdown-box");
const countdownSecEl = document.getElementById("countdown-sec");
const countdownBarEl = document.getElementById("countdown-bar");
const peakGEl = document.getElementById("peak-g");
const speedRangeEl = document.getElementById("speed-range");
const coordsEl = document.getElementById("coords");
const pinStatusEl = document.getElementById("pin-status");
const noticesEl = document.getElementById("notices");
const noticeCountEl = document.getElementById("notice-count");

const citizenCardEl = document.getElementById("citizen-card");
const citizenIdEl = document.getElementById("citizen-id");
const citizenTypeEl = document.getElementById("citizen-type");
const citizenZoneEl = document.getElementById("citizen-zone");
const citizenPhotoUrlEl = document.getElementById("citizen-photo-url");
const citizenImgEl = document.getElementById("citizen-img");
const citizenPlaceholderEl = document.getElementById("citizen-placeholder");

const map = L.map("map", { zoomControl: true }).setView([20.2447, 85.8178], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

let incidentPin = null;
let countdownTimer = null;
let activeIncidentId = null;
let notices = [];

function setConn(state) {
  connEl.textContent = state;
  dotEl.className = "dot " + (state === "live" ? "on" : state === "lost" ? "off" : "");
}

function setCardTone(tone, headlineText) {
  cardEl.className = "card incident-card " + tone;
  headlineEl.className = "headline " + tone;
  headlineEl.textContent = headlineText;
}

function stopCountdown(hideBox = true) {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  if (hideBox) {
    countdownBoxEl.hidden = true;
  }
}

function startCountdown(seconds) {
  stopCountdown(false);
  const totalMs = Math.max(0.1, seconds) * 1000;
  const end = performance.now() + totalMs;
  countdownBoxEl.hidden = false;
  countdownSecEl.textContent = `${seconds.toFixed(1)} s`;
  countdownBarEl.style.width = "100%";

  countdownTimer = setInterval(() => {
    const leftMs = Math.max(0, end - performance.now());
    const leftS = leftMs / 1000;
    countdownSecEl.textContent = `${leftS.toFixed(1)} s`;
    countdownBarEl.style.width = `${(leftMs / totalMs) * 100}%`;
    if (leftMs <= 0) {
      stopCountdown(false);
    }
  }, 50);
}

function formatTime(isoStr) {
  if (!isoStr) return "";
  const dt = new Date(isoStr);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleTimeString("en-IN", { hour12: false });
}

function renderNotices() {
  noticeCountEl.textContent = String(notices.length);
  noticesEl.innerHTML = "";
  if (notices.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No notices yet.";
    noticesEl.appendChild(li);
    return;
  }

  notices.forEach((item) => {
    const li = document.createElement("li");
    const textSpan = document.createElement("span");
    textSpan.textContent = item.text;
    const timeSpan = document.createElement("span");
    timeSpan.className = "notice-time";
    timeSpan.textContent = item.time;
    li.appendChild(textSpan);
    li.appendChild(timeSpan);
    noticesEl.appendChild(li);
  });
}

function addNotice(text, timestamp) {
  notices.push({ text, time: formatTime(timestamp) });
  renderNotices();
}

function dropPin(lat, lon) {
  if (typeof lat !== "number" || typeof lon !== "number") return;
  if (incidentPin) {
    incidentPin.setLatLng([lat, lon]);
  } else {
    incidentPin = L.circleMarker([lat, lon], {
      radius: 10,
      color: "#7f1d1d",
      weight: 3,
      fillColor: "#dc2626",
      fillOpacity: 0.9,
    }).addTo(map);
  }
  map.panTo([lat, lon]);
  pinStatusEl.textContent = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

function showCitizenReport(event) {
  const data = event.data || {};
  citizenCardEl.hidden = false;
  citizenIdEl.textContent = String(data.report_id || event.event_id || "—");
  citizenTypeEl.textContent = String(data.accident_type || "—");
  citizenZoneEl.textContent = String(data.zone || "—");

  const photoUrl = String(data.photo_url || "");
  citizenPhotoUrlEl.textContent = photoUrl || "—";

  citizenImgEl.hidden = true;
  citizenPlaceholderEl.hidden = false;
  if (photoUrl) {
    const resolved = /^https?:|^\//.test(photoUrl) ? photoUrl : `/${photoUrl}`;
    citizenImgEl.onload = () => {
      citizenImgEl.hidden = false;
      citizenPlaceholderEl.hidden = true;
    };
    citizenImgEl.onerror = () => {
      citizenImgEl.hidden = true;
      citizenPlaceholderEl.hidden = false;
    };
    citizenImgEl.src = resolved;
  }
}

function handleEvent(event, { isLive }) {
  if (event.type === "system_reset") {
    stopCountdown(true);
    activeIncidentId = null;
    notices = [];
    renderNotices();
    incidentIdEl.textContent = "waiting";
    cardEl.className = "card incident-card";
    headlineEl.className = "headline";
    headlineEl.textContent = "Waiting for incident";
    peakGEl.textContent = "\u2014";
    speedRangeEl.textContent = "\u2014";
    coordsEl.textContent = "\u2014";
    if (incidentPin) {
      map.removeLayer(incidentPin);
      incidentPin = null;
    }
    pinStatusEl.textContent = "no pin";
    citizenCardEl.hidden = true;
    return;
  }

  const data = event.data || {};

  if (event.type === "impact_detected") {
    if (event.event_id !== activeIncidentId) {
      activeIncidentId = event.event_id;
      notices = [];
      renderNotices();
    }
    stopCountdown(true);
    incidentIdEl.textContent = event.event_id || "—";
    peakGEl.textContent = data.peak_g !== undefined ? `${data.peak_g} g` : "—";
    const before = data.speed_before !== undefined ? data.speed_before : "—";
    const after = data.speed_after !== undefined ? data.speed_after : "—";
    speedRangeEl.textContent = `${before} -> ${after} km/h`;

    if (typeof data.lat === "number" && typeof data.lon === "number") {
      coordsEl.textContent = `${data.lat.toFixed(4)}, ${data.lon.toFixed(4)}`;
      dropPin(data.lat, data.lon);
    } else {
      coordsEl.textContent = "—";
    }

    setCardTone("amber", "Impact detected");
    return;
  }

  if (event.type === "alert_call_started") {
    if (isLive) {
      startCountdown(Number(data.countdown_s ?? 5));
    } else {
      stopCountdown(true);
    }
    return;
  }

  if (event.type === "alert_confirmed") {
    stopCountdown(true);
    const level = String(data.level || "");
    if (level === "high") {
      setCardTone("red", "High alert, verified");
    } else if (level === "low") {
      setCardTone("green", "Low alert");
    } else if (level === "no_response") {
      setCardTone("red", "No response, treating as highest priority");
    }
    return;
  }

  if (event.type === "hospital_notified") {
    addNotice(
      `Pre-arrival notice \u00b7 ${data.name || "Unknown"} \u00b7 ${data.distance_km ?? "?"} km`,
      event.t_server
    );
    return;
  }

  if (event.type === "help_site_alerted") {
    addNotice(`Help site alerted \u00b7 ${data.name || "Unknown"}`, event.t_server);
    return;
  }

  if (event.type === "dispatched") {
    addNotice(`Handed to ${data.service || "?"}, ETA ${data.eta_s ?? "?"} s`, event.t_server);
    return;
  }

  if (event.type === "sms_received") {
    addNotice("Incident received via SMS gateway", event.t_server);
    return;
  }

  if (event.type === "citizen_report") {
    showCitizenReport(event);
  }
}

function connect() {
  setConn("connecting");
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${proto}://${location.host}/ws`);

  ws.onopen = () => setConn("live");
  ws.onclose = () => {
    setConn("lost");
    setTimeout(connect, 1500);
  };
  ws.onerror = () => setConn("lost");
  ws.onmessage = (msg) => {
    const payload = JSON.parse(msg.data);
    if (payload.kind === "snapshot") {
      activeIncidentId = null;
      notices = [];
      renderNotices();
      payload.events.forEach((ev) => handleEvent(ev, { isLive: false }));
      return;
    }
    if (payload.kind === "error") return;
    handleEvent(payload, { isLive: true });
  };
}

connect();
