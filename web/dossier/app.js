const DEMO_RECORDS = [
  {
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
      location: "Master Canteen Square, Bhubaneswar",
      time: "19:33:00 IST",
      coords: [20.2725, 85.8380],
    },
    medical: {
      injuries: [
        "Right Shoulder Trauma",
        "Minor Head Injury",
        "Superficial Cuts",
      ],
      condition: "Stable under observation",
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
  },
  {
    victim: {
      name: "Priya Nanda",
      age: 34,
      gender: "Female",
      bloodGroup: "O+",
      allergies: "Dust and Sulfa drugs",
      conditions: "None",
    },
    vehicle: {
      model: "Honda Activa",
      registration: "OD 02 AB 3311",
      year: 2021,
      colour: "Pearl White",
      fuelType: "Petrol",
      vin: "ME4JF502HM7011223",
      status: "Moderate Damage",
    },
    incident: {
      type: "Side-Swipe Collision",
      location: "Jaydev Vihar Square, Bhubaneswar",
      time: "20:10:00 IST",
      coords: [20.2961, 85.8245],
    },
    medical: {
      injuries: [
        "Fractured Left Wrist",
        "Abrasions",
      ],
      condition: "Stable",
      treatment: [
        "Wrist Splint",
        "Antiseptic Dressing",
        "Oral Analgesic",
      ],
    },
    contact: {
      name: "Subrat Nanda",
      phone: "+91 94370 11223",
      relation: "Husband",
    },
    notes: {
      text: "Helmet worn at impact. Conscious and oriented on arrival. Orthopaedic consult scheduled.",
      officer: "Logged by Dr. S. Mohanty",
      time: "20:14 IST",
    },
  },
  {
    victim: {
      name: "Rakesh Sahoo",
      age: 47,
      gender: "Male",
      bloodGroup: "A-",
      allergies: "None",
      conditions: "None",
    },
    vehicle: {
      model: "Tata Ace",
      registration: "OD 05 CD 7788",
      year: 2020,
      colour: "Arctic White",
      fuelType: "Diesel",
      vin: "MAT445056L8G09412",
      status: "Heavy Front Damage",
    },
    incident: {
      type: "Head-On Impact",
      location: "Patia Square, Bhubaneswar",
      time: "21:05:00 IST",
      coords: [20.3550, 85.8180],
    },
    medical: {
      injuries: [
        "Chest Contusion",
        "Suspected Rib Fracture",
      ],
      condition: "Critical, under observation",
      treatment: [
        "Oxygen Support",
        "IV Analgesia",
        "Chest X-Ray Ordered",
      ],
    },
    contact: {
      name: "Mamata Sahoo",
      phone: "+91 99372 44556",
      relation: "Wife",
    },
    notes: {
      text: "Restrained driver with steering wheel impact. Vitals monitored continuously in ICU bay.",
      officer: "Logged by Dr. P. Panda",
      time: "21:09 IST",
    },
  },
  {
    victim: {
      name: "Sneha Patra",
      age: 26,
      gender: "Female",
      bloodGroup: "AB+",
      allergies: "Latex",
      conditions: "None",
    },
    vehicle: {
      model: "Maruti Swift",
      registration: "OD 33 EF 1220",
      year: 2023,
      colour: "Metallic Grey",
      fuelType: "Petrol",
      vin: "MA3EJKD1S00884310",
      status: "Rear-End Damage",
    },
    incident: {
      type: "Rear-End Collision",
      location: "Khandagiri Square, Bhubaneswar",
      time: "21:42:00 IST",
      coords: [20.2390, 85.8080],
    },
    medical: {
      injuries: [
        "Neck Strain",
        "Minor Lacerations",
      ],
      condition: "Stable",
      treatment: [
        "Cervical Collar",
        "Wound Cleaning",
        "Anti-Inflammatory Dose",
      ],
    },
    contact: {
      name: "Bikash Patra",
      phone: "+91 98610 77889",
      relation: "Father",
    },
    notes: {
      text: "Seatbelt engaged, rear airbags triggered. Alert and responsive; cervical spine X-ray clear.",
      officer: "Logged by Dr. A. Mishra",
      time: "21:46 IST",
    },
  },
  {
    victim: {
      name: "Imran Khan",
      age: 58,
      gender: "Male",
      bloodGroup: "B-",
      allergies: "Aspirin",
      conditions: "None",
    },
    vehicle: {
      model: "Mahindra Scorpio",
      registration: "OD 14 GH 9042",
      year: 2021,
      colour: "Napoli Black",
      fuelType: "Diesel",
      vin: "MA1TA2MK2M2J55104",
      status: "Rollover Damage",
    },
    incident: {
      type: "Highway Guardrail Impact",
      location: "NH-16 Rasulgarh, Bhubaneswar",
      time: "22:18:00 IST",
      coords: [20.3105, 85.9010],
    },
    medical: {
      injuries: [
        "Head Laceration",
        "Concussion",
      ],
      condition: "Under observation",
      treatment: [
        "Suturing",
        "CT Scan Ordered",
        "Neuro Observation",
      ],
    },
    contact: {
      name: "Farida Begum",
      phone: "+91 94371 66770",
      relation: "Spouse",
    },
    notes: {
      text: "Delivered via SMS fallback alert from highway corridor. Brief loss of consciousness; GCS 14/15.",
      officer: "Logged by Dr. N. Das",
      time: "22:24 IST",
    },
  },
  {
    victim: {
      name: "Lipika Das",
      age: 19,
      gender: "Female",
      bloodGroup: "O-",
      allergies: "None",
      conditions: "None",
    },
    vehicle: {
      model: "Honda Shine",
      registration: "OD 07 JK 5510",
      year: 2022,
      colour: "Rebel Red",
      fuelType: "Petrol",
      vin: "ME4JC831BM8044912",
      status: "Minor Scrape",
    },
    incident: {
      type: "Low-Speed Skid",
      location: "Old Town Lingaraj Road, Bhubaneswar",
      time: "22:50:00 IST",
      coords: [20.2540, 85.8440],
    },
    medical: {
      injuries: [
        "Sprained Ankle",
        "Knee Abrasion",
      ],
      condition: "Stable",
      treatment: [
        "Compression Bandage",
        "Ice Pack",
        "Topical Antiseptic",
      ],
    },
    contact: {
      name: "Prakash Das",
      phone: "+91 97765 33441",
      relation: "Brother",
    },
    notes: {
      text: "Skidded on wet pavement avoiding pothole. Helmet intact; ambulatory with support.",
      officer: "Logged by Dr. K. Swain",
      time: "22:54 IST",
    },
  },
];

const NEXT_STORAGE_KEY = "ashvin_dossier_next_idx";
const LAST_STORAGE_KEY = "ashvin_dossier_last_idx";
const statusPillEl = document.getElementById("status-pill");
const recordCounterEl = document.getElementById("record-counter");
const recordWrapEl = document.getElementById("record-wrap");
const timelineEl = document.getElementById("timeline");

function loadStoredIndex(key) {
  const parsed = Number.parseInt(sessionStorage.getItem(key) || "0", 10);
  if (Number.isNaN(parsed)) return 0;
  return ((parsed % DEMO_RECORDS.length) + DEMO_RECORDS.length) % DEMO_RECORDS.length;
}

let nextIndex = loadStoredIndex(NEXT_STORAGE_KEY);
let lastIndex = loadStoredIndex(LAST_STORAGE_KEY);

function saveIndices() {
  sessionStorage.setItem(NEXT_STORAGE_KEY, String(nextIndex));
  sessionStorage.setItem(LAST_STORAGE_KEY, String(lastIndex));
}

const VEHICLE_COLOURS = {
  "Black Sapphire": "#1e293b",
  "Pearl White": "#e2e8f0",
  "Arctic White": "#f1f5f9",
  "Metallic Grey": "#64748b",
  "Napoli Black": "#111827",
  "Rebel Red": "#b91c1c",
};

function populateRecord(idx, isWaiting = false) {
  const rec = DEMO_RECORDS[idx];
  const displayIdx = isWaiting ? nextIndex : lastIndex;
  recordCounterEl.textContent = `Record ${displayIdx + 1} of ${DEMO_RECORDS.length}`;

  document.getElementById("victim-name").textContent = rec.victim.name;
  document.getElementById("victim-age").textContent = `${rec.victim.age} yrs · ${rec.victim.gender}`;
  document.getElementById("victim-gender").textContent = rec.victim.gender;
  document.getElementById("victim-blood").textContent = rec.victim.bloodGroup;
  document.getElementById("victim-allergies").textContent = rec.victim.allergies;
  document.getElementById("victim-conditions").textContent = rec.victim.conditions;

  document.getElementById("vehicle-model").textContent = rec.vehicle.model;
  document.getElementById("vehicle-reg").textContent = rec.vehicle.registration;
  document.getElementById("vehicle-status").textContent = rec.vehicle.status;
  document.getElementById("vehicle-year").textContent = String(rec.vehicle.year);
  document.getElementById("vehicle-colour").textContent = rec.vehicle.colour;
  document.getElementById("vehicle-fuel").textContent = rec.vehicle.fuelType;
  document.getElementById("vehicle-vin").textContent = rec.vehicle.vin;
  const vehicleGlyphEl = document.getElementById("vehicle-glyph");
  if (vehicleGlyphEl) {
    vehicleGlyphEl.style.color = VEHICLE_COLOURS[rec.vehicle.colour] || "#334155";
  }

  document.getElementById("inc-time").textContent = rec.incident.time;
  document.getElementById("inc-location").textContent = rec.incident.location;
  document.getElementById("inc-type").textContent = rec.incident.type;

  const injList = document.getElementById("med-injuries");
  injList.innerHTML = "";
  rec.medical.injuries.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    injList.appendChild(li);
  });

  document.getElementById("med-condition").textContent = rec.medical.condition;

  const treatList = document.getElementById("med-treatment");
  treatList.innerHTML = "";
  rec.medical.treatment.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    treatList.appendChild(li);
  });

  document.getElementById("contact-name").textContent = rec.contact.name;
  document.getElementById("contact-relation").textContent = rec.contact.relation;
  document.getElementById("contact-phone").textContent = rec.contact.phone;
  document.getElementById("contact-call").href = `tel:${rec.contact.phone.replace(/\s+/g, "")}`;

  document.getElementById("notes-text").textContent = rec.notes.text;
  document.getElementById("notes-officer").textContent = rec.notes.officer;
  document.getElementById("notes-time").textContent = rec.notes.time;
}

const map = L.map("dossier-map", { zoomControl: false, attributionControl: false }).setView(
  DEMO_RECORDS[lastIndex].incident.coords,
  13
);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
const pin = L.marker(DEMO_RECORDS[lastIndex].incident.coords, {
  icon: L.divIcon({
    className: "dossier-pin-wrap",
    html: '<svg viewBox="0 0 24 32" width="22" height="30" aria-hidden="true"><path d="M12 1C6 1 1.5 5.6 1.5 11.6 1.5 19.6 12 31 12 31s10.5-11.4 10.5-19.4C22.5 5.6 18 1 12 1z" fill="#dc2626" stroke="#ffffff" stroke-width="1.5"/><circle cx="12" cy="11.5" r="3.6" fill="#7f1d1d"/></svg>',
    iconSize: [22, 30],
    iconAnchor: [11, 29],
  }),
}).addTo(map);

const mapExpandBtn = document.getElementById("map-expand-btn");
if (mapExpandBtn) {
  mapExpandBtn.addEventListener("click", () => {
    map.setView(pin.getLatLng(), map.getZoom() === 13 ? 15 : 13);
  });
}

populateRecord(lastIndex, true);

function syncMapToRecord(idx) {
  const coords = DEMO_RECORDS[idx].incident.coords;
  pin.setLatLng(coords);
  map.panTo(coords);
}

function activateRecord() {
  statusPillEl.textContent = "Live update";
  statusPillEl.className = "pill live";
  recordWrapEl.classList.remove("muted");
  recordCounterEl.textContent = `Record ${lastIndex + 1} of ${DEMO_RECORDS.length}`;
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
  if (event.type === "system_reset") {
    nextIndex = 0;
    lastIndex = 0;
    saveIndices();
    populateRecord(0, true);
    statusPillEl.textContent = "Waiting for incident";
    statusPillEl.className = "pill waiting";
    recordWrapEl.classList.add("muted");
    timelineEl.innerHTML = '<li class="empty">Awaiting live stream events&hellip;</li>';
    syncMapToRecord(0);
    return;
  }

  const data = event.data || {};
  const stamp = isLive ? new Date().toISOString() : event.t_server;

  if (event.type === "impact_detected") {
    if (isLive) {
      lastIndex = nextIndex;
      nextIndex = (lastIndex + 1) % DEMO_RECORDS.length;
      saveIndices();
      populateRecord(lastIndex, false);
    }
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
    return;
  }

  if (event.type === "sms_received") {
    activateRecord();
    appendTimelineRow("Incident received via SMS gateway", stamp, isLive);
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
      populateRecord(lastIndex, true);
      syncMapToRecord(lastIndex);
      payload.events.forEach((ev) => handleEvent(ev, { isLive: false }));
      return;
    }
    if (payload.kind === "error") return;
    handleEvent(payload, { isLive: true });
  };
}

connect();
