const DEMO_RECORD = {
  victim: {
    name: "Aarav Mehta",
    age: 22,
    gender: "Male",
    bloodGroup: "B+",
    allergies: "Peanuts and Penicillin",
    conditions: "None",
  },
  vehicle: {
    model: "BMW 3 Series",
    registration: "DL 8C 4721",
    year: 2022,
    colour: "Black Sapphire",
    fuelType: "Petrol",
    vin: "WBA8E1C57NK123456",
    status: "Total Loss",
  },
  incident: {
    type: "High-Speed Collision",
    location: "Ring Road, New Delhi",
    time: "19:33:00 IST",
    coords: [20.2725, 85.8380],
  },
  medical: {
    injuries: [
      "Right Shoulder Trauma",
      "Minor Head Injury",
      "Multiple Superficial Cuts",
    ],
    condition: "Stable, under observation",
    treatment: [
      "Pain Relief Medication",
      "Tetanus Shot",
      "Wound Dressing",
    ],
  },
  contact: {
    name: "Ananya Mehta",
    phone: "+91 98765 43210",
    relation: "Sister",
  },
  notes: {
    text: "Patient was driving alone. Airbags deployed. No immediate life-threatening injuries. Monitoring for 24 hours.",
    officer: "Logged by Dr. R. Sharma",
    time: "19:35 IST",
  },
};

const statusPillEl = document.getElementById("status-pill");
const recordWrapEl = document.getElementById("record-wrap");
const timelineEl = document.getElementById("timeline");

function populateRecord() {
  document.getElementById("victim-name").textContent = DEMO_RECORD.victim.name;
  document.getElementById("victim-age").textContent = `${DEMO_RECORD.victim.age} yrs`;
  document.getElementById("victim-gender").textContent = DEMO_RECORD.victim.gender;
  document.getElementById("victim-blood").textContent = DEMO_RECORD.victim.bloodGroup;
  document.getElementById("victim-allergies").textContent = DEMO_RECORD.victim.allergies;
  document.getElementById("victim-conditions").textContent = DEMO_RECORD.victim.conditions;

  document.getElementById("vehicle-model").textContent = DEMO_RECORD.vehicle.model;
  document.getElementById("vehicle-reg").textContent = DEMO_RECORD.vehicle.registration;
  document.getElementById("vehicle-status").textContent = DEMO_RECORD.vehicle.status;
  document.getElementById("vehicle-year").textContent = String(DEMO_RECORD.vehicle.year);
  document.getElementById("vehicle-colour").textContent = DEMO_RECORD.vehicle.colour;
  document.getElementById("vehicle-fuel").textContent = DEMO_RECORD.vehicle.fuelType;
  document.getElementById("vehicle-vin").textContent = DEMO_RECORD.vehicle.vin;

  document.getElementById("inc-time").textContent = DEMO_RECORD.incident.time;
  document.getElementById("inc-location").textContent = DEMO_RECORD.incident.location;
  document.getElementById("inc-type").textContent = DEMO_RECORD.incident.type;

  const injList = document.getElementById("med-injuries");
  DEMO_RECORD.medical.injuries.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    injList.appendChild(li);
  });

  document.getElementById("med-condition").textContent = DEMO_RECORD.medical.condition;

  const treatList = document.getElementById("med-treatment");
  DEMO_RECORD.medical.treatment.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    treatList.appendChild(li);
  });

  document.getElementById("contact-name").textContent = DEMO_RECORD.contact.name;
  document.getElementById("contact-relation").textContent = DEMO_RECORD.contact.relation;
  document.getElementById("contact-phone").textContent = DEMO_RECORD.contact.phone;
  document.getElementById("contact-call").href = `tel:${DEMO_RECORD.contact.phone.replace(/\s+/g, "")}`;

  document.getElementById("notes-text").textContent = DEMO_RECORD.notes.text;
  document.getElementById("notes-officer").textContent = DEMO_RECORD.notes.officer;
  document.getElementById("notes-time").textContent = DEMO_RECORD.notes.time;
}

populateRecord();

const map = L.map("dossier-map", { zoomControl: false, attributionControl: false }).setView(
  DEMO_RECORD.incident.coords,
  13
);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
const pin = L.circleMarker(DEMO_RECORD.incident.coords, {
  radius: 8,
  color: "#7f1d1d",
  weight: 2,
  fillColor: "#dc2626",
  fillOpacity: 0.9,
}).addTo(map);

function activateRecord() {
  statusPillEl.textContent = "Live update";
  statusPillEl.className = "pill live";
  recordWrapEl.classList.remove("muted");
}

function formatClock(isoStr) {
  const dt = isoStr ? new Date(isoStr) : new Date();
  if (Number.isNaN(dt.getTime())) return new Date().toLocaleTimeString("en-IN", { hour12: false });
  return dt.toLocaleTimeString("en-IN", { hour12: false });
}

function appendTimelineRow(text, timestamp, animate) {
  const empty = timelineEl.querySelector("li.empty");
  if (empty) empty.remove();

  const li = document.createElement("li");
  if (animate) li.classList.add("animate");
  const msgSpan = document.createElement("span");
  msgSpan.textContent = text;
  const timeSpan = document.createElement("span");
  timeSpan.className = "tl-time";
  timeSpan.textContent = formatClock(timestamp);
  li.appendChild(msgSpan);
  li.appendChild(timeSpan);
  timelineEl.appendChild(li);
}

function handleEvent(event, { isLive }) {
  const data = event.data || {};
  const stamp = isLive ? new Date().toISOString() : event.t_server;

  if (event.type === "impact_detected") {
    if (typeof data.lat === "number" && typeof data.lon === "number") {
      pin.setLatLng([data.lat, data.lon]);
      map.panTo([data.lat, data.lon]);
    }
    return;
  }

  if (event.type === "identity_resolved") {
    activateRecord();
    const unit = data.unit_code || "ASH-07";
    appendTimelineRow(`Record retrieved via Ashvin, unit ${unit}`, stamp, isLive);
    return;
  }

  if (event.type === "dispatched") {
    activateRecord();
    const eta = data.eta_s ?? 420;
    appendTimelineRow(`Ambulance dispatched, ETA ${eta} s`, stamp, isLive);
    return;
  }

  if (event.type === "hospital_notified") {
    activateRecord();
    appendTimelineRow("Pre-arrival notice received", stamp, isLive);
  }
}

function connect() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onclose = () => setTimeout(connect, 1500);
  ws.onmessage = (msg) => {
    const payload = JSON.parse(msg.data);
    if (payload.kind === "snapshot") {
      timelineEl.innerHTML = '<li class="empty">Awaiting live stream events&hellip;</li>';
      payload.events.forEach((ev) => handleEvent(ev, { isLive: false }));
      return;
    }
    if (payload.kind === "error") return;
    handleEvent(payload, { isLive: true });
  };
}

connect();
