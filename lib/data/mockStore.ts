// GoldenHour Domain Data Store — Patient & Hospital Real-Time Coordination
// No numeric bed counts — only Availability status (Available / Not Available)
// 5 Emergency categories: Chest Pain, Stroke, Bleeding, Breathing, Not Sure / Other

export type EmergencyCategoryType = 
  | "Chest Pain" 
  | "Stroke Symptoms" 
  | "Serious Bleeding" 
  | "Severe Breathing" 
  | "Not Sure / Other Emergency";

export interface Hospital {
  id: string;
  name: string;
  shortName: string;
  address: string;
  district: string;
  landmark: string;
  distanceKm: number;
  etaMinutes: string;
  emergencyPhone: string;
  status: "accepting" | "limited" | "divert";
  statusReason?: string;
  level: "Level 1 Apex Emergency & Trauma" | "Tertiary Multi-Speciality Emergency" | "Major Emergency Centre";
  availability: {
    emergencyBeds: "Available" | "Not Available";
    icuBeds: "Available" | "Not Available";
    ventilators: "Available" | "Not Available";
    oxygenSupport: "Available" | "Not Available";
    bloodBank: "Available" | "Not Available";
    cardiacCathLab: "Available" | "Not Available";
    strokeCTUnit: "Available" | "Not Available";
    traumaBay: "Available" | "Not Available";
  };
  supportedCategories: EmergencyCategoryType[];
  lastUpdated: string;
}

export interface PreparationTaskItem {
  id: string;
  title: string;
  role: "ER Nurse" | "Resident Doctor" | "Specialist / Surgeon" | "Radiology / Tech" | "Triage Officer";
  status: "Pending" | "Claimed" | "Completed";
  claimedBy?: string;
  claimedAt?: string;
  time: string;
}

export interface EmergencyAlert {
  id: string;
  category: EmergencyCategoryType;
  customDescription?: string;
  categoryIcon: string;
  patientLocation: string;
  hospitalId: string;
  hospitalName: string;
  hospitalPhone: string;
  hospitalAddress: string;
  status: "REQUEST_RECEIVED" | "HOSPITAL_PREPARING" | "READY_FOR_ARRIVAL" | "ARRIVED" | "COMPLETED" | "REJECTED";
  statusText: string;
  createdAt: string;
  createdTimestamp: number; // Epoch ms for accurate server-side style escalation timers
  etaMinutes: string;
  preparationTasks: PreparationTaskItem[];
  preparationUpdates: {
    title: string;
    status: "Completed" | "In Progress" | "Pending";
    time: string;
  }[];
  arrivedAt?: string;
  closedAt?: string;
  rejectionReason?: string;
}

export const GOLDENHOUR_HOSPITALS: Hospital[] = [
  {
    id: "hosp-aiims-bbsr",
    name: "AIIMS Bhubaneswar — Apex Trauma & Emergency Centre",
    shortName: "AIIMS Bhubaneswar",
    address: "NH-16, Sijua, Patrapada, Bhubaneswar, Odisha 751019",
    district: "Bhubaneswar Urban",
    landmark: "Near Patrapada Flyover / Gate 3",
    distanceKm: 3.4,
    etaMinutes: "8 - 11 mins",
    emergencyPhone: "0674-2476789",
    status: "accepting",
    level: "Level 1 Apex Emergency & Trauma",
    availability: {
      emergencyBeds: "Available",
      icuBeds: "Available",
      ventilators: "Available",
      oxygenSupport: "Available",
      bloodBank: "Available",
      cardiacCathLab: "Available",
      strokeCTUnit: "Available",
      traumaBay: "Available",
    },
    supportedCategories: ["Chest Pain", "Stroke Symptoms", "Serious Bleeding", "Severe Breathing", "Not Sure / Other Emergency"],
    lastUpdated: "Recently updated",
  },
  {
    id: "hosp-kims-bbsr",
    name: "KIMS Super Speciality Hospital — Emergency Department",
    shortName: "KIMS Emergency",
    address: "Kushabhadra Campus 5, KIIT University, Patia, Bhubaneswar 751024",
    district: "Bhubaneswar North",
    landmark: "KIIT Square / Big Bazaar Patia Road",
    distanceKm: 5.1,
    etaMinutes: "12 - 15 mins",
    emergencyPhone: "0674-7105300",
    status: "accepting",
    level: "Tertiary Multi-Speciality Emergency",
    availability: {
      emergencyBeds: "Available",
      icuBeds: "Available",
      ventilators: "Available",
      oxygenSupport: "Available",
      bloodBank: "Available",
      cardiacCathLab: "Available",
      strokeCTUnit: "Available",
      traumaBay: "Available",
    },
    supportedCategories: ["Chest Pain", "Stroke Symptoms", "Serious Bleeding", "Severe Breathing", "Not Sure / Other Emergency"],
    lastUpdated: "Recently updated",
  },
  {
    id: "hosp-sum-medicare",
    name: "SUM Ultimate Medicare — Acute Emergency Care",
    shortName: "SUM Ultimate",
    address: "K-8, Kalinga Nagar, Ghatikia, Bhubaneswar 751003",
    district: "Bhubaneswar West",
    landmark: "Opposite CET Campus, Ghatikia",
    distanceKm: 6.8,
    etaMinutes: "14 - 18 mins",
    emergencyPhone: "0674-3500500",
    status: "accepting",
    level: "Tertiary Multi-Speciality Emergency",
    availability: {
      emergencyBeds: "Available",
      icuBeds: "Available",
      ventilators: "Available",
      oxygenSupport: "Available",
      bloodBank: "Available",
      cardiacCathLab: "Not Available",
      strokeCTUnit: "Available",
      traumaBay: "Available",
    },
    supportedCategories: ["Stroke Symptoms", "Serious Bleeding", "Severe Breathing", "Not Sure / Other Emergency"],
    lastUpdated: "Recently updated",
  },
  {
    id: "hosp-apollo-bbsr",
    name: "Apollo Hospitals Bhubaneswar — Emergency Resuscitation Unit",
    shortName: "Apollo Bhubaneswar",
    address: "Plot 251, Sainik School Rd, Unit 15, Bhubaneswar 751005",
    district: "Bhubaneswar Central",
    landmark: "Near Sainik School / Doordarshan Kendra",
    distanceKm: 8.2,
    etaMinutes: "18 - 22 mins",
    emergencyPhone: "0674-6661066",
    status: "accepting",
    level: "Tertiary Multi-Speciality Emergency",
    availability: {
      emergencyBeds: "Available",
      icuBeds: "Available",
      ventilators: "Available",
      oxygenSupport: "Available",
      bloodBank: "Available",
      cardiacCathLab: "Available",
      strokeCTUnit: "Available",
      traumaBay: "Available",
    },
    supportedCategories: ["Chest Pain", "Stroke Symptoms", "Serious Bleeding", "Severe Breathing", "Not Sure / Other Emergency"],
    lastUpdated: "Recently updated",
  },
];

export const INITIAL_ALERTS: EmergencyAlert[] = [
  {
    id: "GH-2026-X84",
    category: "Chest Pain",
    categoryIcon: "🫀",
    patientLocation: "Patia Chowk, Near KIIT Square, Bhubaneswar",
    hospitalId: "hosp-aiims-bbsr",
    hospitalName: "AIIMS Bhubaneswar — Apex Trauma Centre",
    hospitalPhone: "0674-2476789",
    hospitalAddress: "NH-16, Sijua, Patrapada, Bhubaneswar",
    status: "HOSPITAL_PREPARING",
    statusText: "Hospital Notified • Emergency Team is Preparing",
    createdAt: "10 mins ago",
    createdTimestamp: Date.now() - 10 * 60 * 1000,
    etaMinutes: "8 - 11 mins",
    preparationTasks: [
      {
        id: "task-1",
        title: "Interventional Cardiology & Cath Lab Mobilization",
        role: "Specialist / Surgeon",
        status: "Claimed",
        claimedBy: "Dr. P. Mohanty (Cardiology)",
        claimedAt: "8 mins ago",
        time: "8 mins ago",
      },
      {
        id: "task-2",
        title: "12-Lead ECG Machine & Defibrillator Standby at Bay 1",
        role: "ER Nurse",
        status: "Claimed",
        claimedBy: "Nurse Sunita R.",
        claimedAt: "9 mins ago",
        time: "9 mins ago",
      },
      {
        id: "task-3",
        title: "Dual IV Cannulation & Cardiac Biomarkers Kit Ready",
        role: "Resident Doctor",
        status: "Pending",
        time: "Awaiting Claim",
      },
      {
        id: "task-4",
        title: "Emergency Ramp Clearance & Stretcher Standby",
        role: "Triage Officer",
        status: "Claimed",
        claimedBy: "Staff Officer Bikash",
        claimedAt: "7 mins ago",
        time: "7 mins ago",
      },
    ],
    preparationUpdates: [
      {
        title: "Emergency department received your pre-arrival request",
        status: "Completed",
        time: "10 mins ago",
      },
      {
        title: "Emergency doctor & nursing team allocated for your arrival",
        status: "Completed",
        time: "9 mins ago",
      },
      {
        title: "Resuscitation bay & monitoring equipment placed on standby",
        status: "Completed",
        time: "8 mins ago",
      },
      {
        title: "Ambulance receiving ramp cleared for direct reception",
        status: "In Progress",
        time: "Now",
      },
    ],
  },
  {
    id: "GH-2026-NS42",
    category: "Not Sure / Other Emergency",
    customDescription: "Severe acute abdominal pain with sudden high fever and vomiting for 2 hours.",
    categoryIcon: "❓",
    patientLocation: "Khandagiri Square, NH-16, Bhubaneswar",
    hospitalId: "hosp-kims-bbsr",
    hospitalName: "KIMS Super Speciality Hospital",
    hospitalPhone: "0674-7105300",
    hospitalAddress: "Campus 5, KIIT University, Patia, Bhubaneswar",
    status: "HOSPITAL_PREPARING",
    statusText: "Hospital Notified • Triage Assessment Team Ready",
    createdAt: "3 mins ago",
    createdTimestamp: Date.now() - 3 * 60 * 1000,
    etaMinutes: "12 - 15 mins",
    preparationTasks: [
      {
        id: "task-1",
        title: "General Emergency Physician Assignment & Triage Assessment",
        role: "Resident Doctor",
        status: "Claimed",
        claimedBy: "Dr. A. Nayak",
        claimedAt: "2 mins ago",
        time: "2 mins ago",
      },
      {
        id: "task-2",
        title: "Bedside Point-of-Care Ultrasound (POCUS) Ready",
        role: "Radiology / Tech",
        status: "Pending",
        time: "Awaiting Claim",
      },
      {
        id: "task-3",
        title: "Acute Medical Receiving Bay 3 Prepared",
        role: "ER Nurse",
        status: "Claimed",
        claimedBy: "Nurse Rakesh S.",
        claimedAt: "1 min ago",
        time: "1 min ago",
      },
      {
        id: "task-4",
        title: "IV Rehydration & Antiemetic / Analgesic Preparation",
        role: "ER Nurse",
        status: "Pending",
        time: "Awaiting Claim",
      },
    ],
    preparationUpdates: [
      {
        title: "Emergency pre-arrival notification received with your symptoms description",
        status: "Completed",
        time: "3 mins ago",
      },
      {
        title: "General emergency triage team alerted for rapid bedside assessment",
        status: "Completed",
        time: "2 mins ago",
      },
      {
        title: "Acute medical receiving bay allocated",
        status: "In Progress",
        time: "Now",
      },
    ],
  },
];

// Helper to generate 4 protocol preparation tasks according to PRD Section 7.4
export function generateTasksForCategory(category: EmergencyCategoryType): PreparationTaskItem[] {
  switch (category) {
    case "Chest Pain":
      return [
        {
          id: `task-${Date.now()}-1`,
          title: "Interventional Cardiology & Cath Lab Mobilization",
          role: "Specialist / Surgeon",
          status: "Pending",
          time: "Awaiting Claim",
        },
        {
          id: `task-${Date.now()}-2`,
          title: "12-Lead ECG Machine & Defibrillator Standby at Bay 1",
          role: "ER Nurse",
          status: "Pending",
          time: "Awaiting Claim",
        },
        {
          id: `task-${Date.now()}-3`,
          title: "Dual IV Access & Cardiac Enzymes (Troponin) Blood Kit",
          role: "Resident Doctor",
          status: "Pending",
          time: "Awaiting Claim",
        },
        {
          id: `task-${Date.now()}-4`,
          title: "Emergency Ambulance Ramp & Direct Bed Transfer Clearance",
          role: "Triage Officer",
          status: "Pending",
          time: "Awaiting Claim",
        },
      ];
    case "Stroke Symptoms":
      return [
        {
          id: `task-${Date.now()}-1`,
          title: "Code Stroke CT/MRI Imaging Suite Pre-Clearance",
          role: "Radiology / Tech",
          status: "Pending",
          time: "Awaiting Claim",
        },
        {
          id: `task-${Date.now()}-2`,
          title: "Neurology Specialist & Thrombolysis Checklist Activation",
          role: "Specialist / Surgeon",
          status: "Pending",
          time: "Awaiting Claim",
        },
        {
          id: `task-${Date.now()}-3`,
          title: "Continuous Vitals, GCS Assessment & Point-of-Care Glucose Kit",
          role: "Resident Doctor",
          status: "Pending",
          time: "Awaiting Claim",
        },
        {
          id: `task-${Date.now()}-4`,
          title: "Stroke Resuscitation Bay 2 Preparation",
          role: "ER Nurse",
          status: "Pending",
          time: "Awaiting Claim",
        },
      ];
    case "Serious Bleeding":
      return [
        {
          id: `task-${Date.now()}-1`,
          title: "Massive Transfusion Protocol (Blood Bank: 2 Units O-Neg Standby)",
          role: "Resident Doctor",
          status: "Pending",
          time: "Awaiting Claim",
        },
        {
          id: `task-${Date.now()}-2`,
          title: "Trauma Resuscitation Bay & Surgical Suction Ready",
          role: "ER Nurse",
          status: "Pending",
          time: "Awaiting Claim",
        },
        {
          id: `task-${Date.now()}-3`,
          title: "On-Call Trauma & Orthopaedic Surgeon Alert",
          role: "Specialist / Surgeon",
          status: "Pending",
          time: "Awaiting Claim",
        },
        {
          id: `task-${Date.now()}-4`,
          title: "Rapid Tourniquet, Pressure Dressing & Warming Blankets Setup",
          role: "Triage Officer",
          status: "Pending",
          time: "Awaiting Claim",
        },
      ];
    case "Severe Breathing":
      return [
        {
          id: `task-${Date.now()}-1`,
          title: "High-Flow Oxygen & BiPAP / Mechanical Ventilator Pre-Set",
          role: "Radiology / Tech",
          status: "Pending",
          time: "Awaiting Claim",
        },
        {
          id: `task-${Date.now()}-2`,
          title: "Emergency Airway / Rapid Sequence Intubation (RSI) Cart Ready",
          role: "Resident Doctor",
          status: "Pending",
          time: "Awaiting Claim",
        },
        {
          id: `task-${Date.now()}-3`,
          title: "Respiratory ICU Bed Reservation & Nebulization Setup",
          role: "ER Nurse",
          status: "Pending",
          time: "Awaiting Claim",
        },
        {
          id: `task-${Date.now()}-4`,
          title: "Arterial Blood Gas (ABG) Analyzer Ready & Pulmonology Standby",
          role: "Specialist / Surgeon",
          status: "Pending",
          time: "Awaiting Claim",
        },
      ];
    case "Not Sure / Other Emergency":
    default:
      return [
        {
          id: `task-${Date.now()}-1`,
          title: "General Emergency Physician Assignment & Triage Assessment",
          role: "Resident Doctor",
          status: "Pending",
          time: "Awaiting Claim",
        },
        {
          id: `task-${Date.now()}-2`,
          title: "Point-of-Care Ultrasound (POCUS) & Diagnostic Cart Standby",
          role: "Radiology / Tech",
          status: "Pending",
          time: "Awaiting Claim",
        },
        {
          id: `task-${Date.now()}-3`,
          title: "Acute Medical Assessment Bay Allocation & Vitals Monitor",
          role: "ER Nurse",
          status: "Pending",
          time: "Awaiting Claim",
        },
        {
          id: `task-${Date.now()}-4`,
          title: "Rapid Symptom Evaluation & Triage Officer Standby",
          role: "Triage Officer",
          status: "Pending",
          time: "Awaiting Claim",
        },
      ];
  }
}

// LocalStorage key constants
const STORAGE_ALERTS_KEY = "goldenhour_active_alerts_v1";
const STORAGE_HOSPITALS_KEY = "goldenhour_hospitals_v1";

// In-memory fallback
let inMemoryAlerts: EmergencyAlert[] = [...INITIAL_ALERTS];
let inMemoryHospitals: Hospital[] = [...GOLDENHOUR_HOSPITALS];

// Dispatch custom event for same-window reactive updates
function notifyStoreUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("goldenhour_store_updated"));
  }
}

// Retrieve hospitals
export function getStoredHospitals(): Hospital[] {
  if (typeof window === "undefined") return inMemoryHospitals;
  try {
    const raw = localStorage.getItem(STORAGE_HOSPITALS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_HOSPITALS_KEY, JSON.stringify(inMemoryHospitals));
      return inMemoryHospitals;
    }
    return JSON.parse(raw);
  } catch {
    return inMemoryHospitals;
  }
}

// Update hospital profile & availability
export function updateStoredHospital(hospital: Hospital): void {
  const current = getStoredHospitals();
  const updated = current.map(h => (h.id === hospital.id ? { ...hospital, lastUpdated: "Just now" } : h));
  inMemoryHospitals = updated;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_HOSPITALS_KEY, JSON.stringify(updated));
      notifyStoreUpdate();
    } catch {
      // safe fallback
    }
  }
}

// Retrieve active alerts
export function getStoredAlerts(): EmergencyAlert[] {
  if (typeof window === "undefined") return inMemoryAlerts;
  try {
    const raw = localStorage.getItem(STORAGE_ALERTS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_ALERTS_KEY, JSON.stringify(inMemoryAlerts));
      return inMemoryAlerts;
    }
    return JSON.parse(raw);
  } catch {
    return inMemoryAlerts;
  }
}

// Save alerts array
function saveStoredAlerts(alerts: EmergencyAlert[]): void {
  inMemoryAlerts = alerts;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_ALERTS_KEY, JSON.stringify(alerts));
      notifyStoreUpdate();
    } catch {
      // safe fallback
    }
  }
}

// Find alert by ID
export function getStoredAlertById(id: string): EmergencyAlert | undefined {
  const alerts = getStoredAlerts();
  return alerts.find(a => a.id.toLowerCase() === id.trim().toLowerCase());
}

// Create new pre-arrival emergency alert
export function createNewEmergencyAlert(params: {
  category: EmergencyCategoryType;
  customDescription?: string;
  patientLocation: string;
  hospitalId: string;
}): EmergencyAlert {
  const hospitals = getStoredHospitals();
  const hospital = hospitals.find(h => h.id === params.hospitalId) || hospitals[0];
  const uniqueCode = Math.floor(1000 + Math.random() * 9000);
  const newId = `GH-2026-${params.category === "Not Sure / Other Emergency" ? "NS" : "EM"}${uniqueCode}`;

  const categoryIcons: Record<EmergencyCategoryType, string> = {
    "Chest Pain": "🫀",
    "Stroke Symptoms": "🧠",
    "Serious Bleeding": "🩸",
    "Severe Breathing": "🫁",
    "Not Sure / Other Emergency": "❓",
  };

  const tasks = generateTasksForCategory(params.category);

  const newAlert: EmergencyAlert = {
    id: newId,
    category: params.category,
    customDescription: params.customDescription,
    categoryIcon: categoryIcons[params.category] || "🚨",
    patientLocation: params.patientLocation,
    hospitalId: hospital.id,
    hospitalName: hospital.name,
    hospitalPhone: hospital.emergencyPhone,
    hospitalAddress: hospital.address,
    status: "HOSPITAL_PREPARING",
    statusText: "Hospital Notified • Emergency Team is Preparing",
    createdAt: "Just now",
    createdTimestamp: Date.now(),
    etaMinutes: hospital.etaMinutes,
    preparationTasks: tasks,
    preparationUpdates: [
      {
        title: "Emergency pre-arrival notification created by patient / family",
        status: "Completed",
        time: "Just now",
      },
      {
        title: `Transmitted in real-time to ${hospital.shortName} Emergency Console`,
        status: "Completed",
        time: "Just now",
      },
      {
        title: "Receiving team actively reviewing category protocols and claiming tasks",
        status: "In Progress",
        time: "Now",
      },
    ],
  };

  const current = getStoredAlerts();
  const updated = [newAlert, ...current];
  saveStoredAlerts(updated);
  return newAlert;
}

// One-tap claim task (PRD Section 7.3 H-05)
export function claimAlertTask(alertId: string, taskId: string, staffName: string): boolean {
  const alerts = getStoredAlerts();
  const alertIndex = alerts.findIndex(a => a.id.toLowerCase() === alertId.toLowerCase());
  if (alertIndex === -1) return false;

  const targetAlert = { ...alerts[alertIndex] };
  const taskIndex = targetAlert.preparationTasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return false;

  const targetTask = targetAlert.preparationTasks[taskIndex];
  if (targetTask.status === "Claimed") return false; // Already claimed

  targetAlert.preparationTasks[taskIndex] = {
    ...targetTask,
    status: "Claimed",
    claimedBy: staffName,
    claimedAt: "Just now",
    time: "Just now",
  };

  // Add to updates
  targetAlert.preparationUpdates = [
    {
      title: `${targetTask.title} was claimed by ${staffName} (${targetTask.role})`,
      status: "Completed",
      time: "Just now",
    },
    ...targetAlert.preparationUpdates,
  ];

  alerts[alertIndex] = targetAlert;
  saveStoredAlerts(alerts);
  return true;
}

// Mark patient arrived (PRD Section 7.3 H-10)
export function markAlertArrived(alertId: string): boolean {
  const alerts = getStoredAlerts();
  const alertIndex = alerts.findIndex(a => a.id.toLowerCase() === alertId.toLowerCase());
  if (alertIndex === -1) return false;

  const targetAlert = { ...alerts[alertIndex] };
  targetAlert.status = "ARRIVED";
  targetAlert.statusText = "Patient Arrived at Emergency Room • Reception Handover Underway";
  targetAlert.arrivedAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  targetAlert.preparationUpdates = [
    {
      title: "Patient physically arrived at hospital emergency reception",
      status: "Completed",
      time: "Just now",
    },
    ...targetAlert.preparationUpdates,
  ];

  alerts[alertIndex] = targetAlert;
  saveStoredAlerts(alerts);
  return true;
}

// Close case (PRD Section 7.3 H-11)
export function closeAlertCase(alertId: string): boolean {
  const alerts = getStoredAlerts();
  const alertIndex = alerts.findIndex(a => a.id.toLowerCase() === alertId.toLowerCase());
  if (alertIndex === -1) return false;

  const targetAlert = { ...alerts[alertIndex] };
  targetAlert.status = "COMPLETED";
  targetAlert.statusText = "Case Closed • Patient Admitted to Specialty Care";
  targetAlert.closedAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  targetAlert.preparationUpdates = [
    {
      title: "Emergency coordination successfully completed and closed",
      status: "Completed",
      time: "Just now",
    },
    ...targetAlert.preparationUpdates,
  ];

  alerts[alertIndex] = targetAlert;
  saveStoredAlerts(alerts);
  return true;
}

// Reject / Divert alert (PRD Section 7.3 H-09)
export function rejectAlertCase(alertId: string, reason: string): boolean {
  const alerts = getStoredAlerts();
  const alertIndex = alerts.findIndex(a => a.id.toLowerCase() === alertId.toLowerCase());
  if (alertIndex === -1) return false;

  const targetAlert = { ...alerts[alertIndex] };
  targetAlert.status = "REJECTED";
  targetAlert.statusText = `Hospital Divert Notice: ${reason}`;
  targetAlert.rejectionReason = reason;

  targetAlert.preparationUpdates = [
    {
      title: `Hospital unable to accept pre-arrival notice: ${reason}. Please proceed to alternative suggested hospital or call 112.`,
      status: "Completed",
      time: "Just now",
    },
    ...targetAlert.preparationUpdates,
  ];

  alerts[alertIndex] = targetAlert;
  saveStoredAlerts(alerts);
  return true;
}
