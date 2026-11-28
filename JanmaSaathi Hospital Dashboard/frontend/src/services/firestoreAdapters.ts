import { Timestamp } from 'firebase/firestore';
import {
  ALERT_CATEGORIES,
  SOURCE_ROLE_LABELS,
  isActiveAlertStatus,
  normalizeAlertPriority,
  normalizeWorkflowAlertStatus,
} from './alertProtocol';
import {
  AlertCategory,
  AlertDuplicateSubmission,
  AlertHospitalResponse,
  AlertPriority,
  AlertResponseEntry,
  AlertReturnCommunication,
  AlertSourceRole,
  AlertStatus,
  AppointmentRecord,
  AppointmentStatus,
  AssessmentRecord,
  AuditLogEntry,
  ClinicalDocument,
  EmergencyAlert,
  HealthWorker,
  MotherRecord,
  PriorityBasis,
  ReferralRecord,
  ReferralStatus,
  RiskLevel,
  SupervisorRecord,
  SymptomLog,
  VitalRecord,
} from '../types/hospital';

type RawDoc = Record<string, unknown>;

export function toIsoString(value: unknown): string {
  if (!value) return '';
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value && typeof (value as { seconds?: unknown }).seconds === 'number') {
    return new Date((value as { seconds: number }).seconds * 1000).toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return '';
}

export function formatShortDate(value: unknown): string {
  const iso = toIsoString(value);
  if (!iso) return '—';
  return iso.length >= 10 ? iso.slice(0, 10) : iso;
}

export function formatDateTime(value: unknown): string {
  const iso = toIsoString(value);
  if (!iso) return '—';
  if (iso.includes('T')) {
    return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
  }
  return iso;
}

function str(raw: RawDoc, keys: string[], fallback = ''): string {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && !Number.isNaN(v)) return String(v);
  }
  return fallback;
}

function num(raw: RawDoc, keys: string[]): number | null {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
      const parsed = Number(v);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return null;
}

function strArray(raw: RawDoc, keys: string[]): string[] {
  for (const k of keys) {
    const v = raw[k];
    if (Array.isArray(v)) {
      return v.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }
    if (typeof v === 'string' && v.trim()) {
      return v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function normalizeRisk(value: string): RiskLevel {
  const v = value.toLowerCase();
  if (v.includes('critical') || v.includes('emergency') || v.includes('severe')) return 'Critical';
  if (v.includes('high')) return 'High Priority';
  if (v.includes('moderate') || v.includes('medium')) return 'Moderate';
  return 'Routine';
}

function normalizeReferralStatus(value: string): ReferralStatus {
  const v = value.toLowerCase();
  if (v.includes('transit')) return 'In Transit';
  if (v.includes('admit')) return 'Admitted';
  if (v.includes('accept') || v.includes('approv')) return 'Accepted';
  if (v.includes('complet') || v.includes('discharg') || v.includes('clos')) return 'Completed';
  if (v.includes('declin') || v.includes('reject') || v.includes('cancel')) return 'Declined';
  return 'Pending';
}

function normalizeAlertStatus(value: string): AlertStatus {
  return normalizeWorkflowAlertStatus(value);
}

function normalizeAppointmentStatus(value: string): AppointmentStatus {
  const v = value.toLowerCase();
  if (v.includes('complet') || v.includes('done') || v.includes('attend')) return 'Completed';
  if (v.includes('miss') || v.includes('no-show') || v.includes('cancel')) return 'Missed';
  if (v.includes('resched')) return 'Rescheduled';
  if (v.includes('due') || v.includes('overdue') || v.includes('follow')) return 'Follow-up Due';
  return 'Upcoming';
}

function parseBp(raw: RawDoc): { systolic: number | null; diastolic: number | null; label: string } {
  const vitalsObj = (raw.vitals && typeof raw.vitals === 'object' ? (raw.vitals as RawDoc) : raw);
  const sys = num(vitalsObj, ['systolicBP', 'systolicBp', 'bpSystolic', 'systolic']);
  const dia = num(vitalsObj, ['diastolicBP', 'diastolicBp', 'bpDiastolic', 'diastolic']);
  if (sys !== null && dia !== null) {
    return { systolic: sys, diastolic: dia, label: `${sys}/${dia}` };
  }
  const bpStr = str(vitalsObj, ['bp', 'bloodPressure', 'bpReading', 'latestBp']);
  if (bpStr.includes('/')) {
    const [s, d] = bpStr.replace(/[^0-9/]/g, '').split('/');
    const parsedS = Number(s);
    const parsedD = Number(d);
    if (!Number.isNaN(parsedS) && !Number.isNaN(parsedD) && parsedS > 0 && parsedD > 0) {
      return { systolic: parsedS, diastolic: parsedD, label: `${parsedS}/${parsedD}` };
    }
  }
  return { systolic: null, diastolic: null, label: bpStr || '—' };
}

function computeGestationalWeeks(raw: RawDoc): { weeks: number; days: number } {
  const directWeeks = num(raw, ['gestationalWeeks', 'gestationalAgeWeeks', 'pregnancyWeeks', 'weeksPregnant']);
  const directDays = num(raw, ['gestationalDays', 'gestationalAgeDays']);
  if (directWeeks !== null) {
    const normalizedDays =
      directDays !== null
        ? directDays >= 7
          ? Math.floor(directDays) % 7
          : Math.max(0, Math.floor(directDays))
        : 0;
    return { weeks: Math.max(0, Math.min(44, Math.floor(directWeeks))), days: normalizedDays };
  }

  const lmpIso = toIsoString(raw.lmpDate ?? raw.lmp ?? raw.lastMenstrualPeriod);
  if (lmpIso) {
    const lmpTime = Date.parse(lmpIso);
    if (!Number.isNaN(lmpTime)) {
      const diffDays = Math.max(0, Math.floor((Date.now() - lmpTime) / (1000 * 60 * 60 * 24)));
      return { weeks: Math.min(44, Math.floor(diffDays / 7)), days: diffDays % 7 };
    }
  }

  return { weeks: 0, days: 0 };
}

export function adaptHealthWorker(id: string, raw: RawDoc): HealthWorker {
  const cadreRaw = str(raw, ['cadre', 'role', 'designation', 'workerType'], 'Health Worker');
  const cadre: HealthWorker['cadre'] = cadreRaw.toLowerCase().includes('anm')
    ? 'ANM Nurse'
    : cadreRaw.toLowerCase().includes('cho') || cadreRaw.toLowerCase().includes('officer')
    ? 'Community Health Officer'
    : 'ASHA Worker';

  const statusRaw = str(raw, ['status', 'availability'], 'Active').toLowerCase();
  const status: HealthWorker['status'] = statusRaw.includes('leave')
    ? 'On Leave'
    : statusRaw.includes('field')
    ? 'On Field Duty'
    : 'Active';

  return {
    id,
    name: str(raw, ['fullName', 'name', 'displayName', 'workerName'], id),
    regionalName: str(raw, ['regionalName', 'odiaName', 'localName'], ''),
    cadre,
    catchmentArea: str(raw, ['catchmentArea', 'area', 'village', 'ward', 'sector'], 'Not specified'),
    block: str(raw, ['block', 'district', 'zone'], '—'),
    subCentre: str(raw, ['subCentre', 'subCenter', 'phc', 'facilityName', 'healthCenter'], '—'),
    phone: str(raw, ['phone', 'phoneNumber', 'mobile', 'contact'], '—'),
    assignedMothersCount: num(raw, ['assignedMothersCount', 'motherCount']) ?? 0,
    recentAssessments30d: num(raw, ['recentAssessments30d', 'assessmentsCount']) ?? 0,
    referralsSubmitted: num(raw, ['referralsSubmitted', 'referralsCount']) ?? 0,
    pendingFollowUps: num(raw, ['pendingFollowUps', 'pendingVisits']) ?? 0,
    emergencyAlertsRaised: num(raw, ['emergencyAlertsRaised', 'alertsCount']) ?? 0,
    followUpCompletionRate: num(raw, ['followUpCompletionRate', 'completionRate']) ?? 0,
    lastActiveDate: formatDateTime(raw.lastActiveAt ?? raw.lastActiveDate ?? raw.updatedAt ?? raw.createdAt),
    status,
    activities: [],
    isDemo: false,
  };
}

export function adaptSupervisor(id: string, raw: RawDoc): SupervisorRecord {
  return {
    id,
    name: str(raw, ['fullName', 'name', 'displayName', 'supervisorName'], id),
    designation: str(raw, ['designation', 'role', 'title'], 'Block Maternal Health Supervisor'),
    block: str(raw, ['block', 'catchmentBlock', 'zone'], '—'),
    district: str(raw, ['district', 'region'], '—'),
    facilityId: str(raw, ['facilityId', 'hospitalId', 'facilityCode', 'hospitalCode'], ''),
    phone: str(raw, ['phone', 'phoneNumber', 'mobile', 'contact'], '—'),
    email: str(raw, ['email'], ''),
    status: str(raw, ['status', 'availability'], 'Active'),
    isDemo: false,
  };
}

export function adaptAssessment(id: string, raw: RawDoc): AssessmentRecord {
  const bp = parseBp(raw);
  const vitalsObj = (raw.vitals && typeof raw.vitals === 'object' ? (raw.vitals as RawDoc) : raw);
  const hb = num(vitalsObj, ['hemoglobin', 'hb', 'haemoglobin']);
  const dangerSigns = strArray(raw, ['dangerSigns']);
  const clinicalScreening =
    raw.clinicalScreeningResult && typeof raw.clinicalScreeningResult === 'object'
      ? (raw.clinicalScreeningResult as RawDoc)
      : null;
  const mlPrediction =
    raw.modelPrediction && typeof raw.modelPrediction === 'object'
      ? (raw.modelPrediction as RawDoc)
      : null;

  const typeRaw = str(raw, ['assessmentType', 'type', 'visitType'], dangerSigns.length >= 3 ? 'Emergency Triage' : dangerSigns.length > 0 ? 'High-Risk Review' : 'ANC Routine');
  const assessmentType: AssessmentRecord['assessmentType'] = typeRaw.toLowerCase().includes('emerg')
    ? 'Emergency Triage'
    : typeRaw.toLowerCase().includes('high')
    ? 'High-Risk Review'
    : typeRaw.toLowerCase().includes('home')
    ? 'Home Visit'
    : typeRaw.toLowerCase().includes('post')
    ? 'Postnatal Review'
    : 'ANC Routine';

  const riskSource = str(
    raw,
    ['riskClassification', 'riskLevel', 'riskCategory', 'risk', 'priority'],
    (clinicalScreening && str(clinicalScreening, ['overallRiskCategory', 'riskLevel'])) ||
      (mlPrediction && str(mlPrediction, ['predictedCategory'])) ||
      (dangerSigns.length >= 3 ? 'Critical' : dangerSigns.length > 0 ? 'High Priority' : 'Routine')
  );

  return {
    id,
    motherId: str(raw, ['motherId', 'relatedMotherId', 'patientId', 'userId'], ''),
    motherName: str(raw, ['motherName', 'patientName', 'fullName'], 'Unknown Mother'),
    date: formatDateTime(raw.assessedAt ?? raw.assessmentDate ?? raw.date ?? raw.recordedAt ?? raw.createdAt ?? raw.timestamp),
    gestationalWeek: num(raw, ['gestationalWeek', 'gestationalAgeWeeks', 'gestationalWeeks', 'pregnancyWeek']) ?? 0,
    assessorName: str(raw, ['assessorName', 'workerName', 'conductedByName', 'doctorName', 'createdByName'], 'Clinician / HW'),
    assessorRole: str(raw, ['assessorRole', 'conductedByRole', 'role'], raw.workerId ? `Health Worker (${String(raw.workerId)})` : 'Health Staff'),
    facilityOrLocation: str(raw, ['facilityOrLocation', 'facilityName', 'location', 'hospitalName'], 'JanmaSaathi Field Sync'),
    assessmentType,
    riskClassification: normalizeRisk(riskSource),
    summary: str(raw, ['summary', 'clinicalNotes', 'symptomsNotes', 'findings', 'notes', 'assessmentSummary'], 'No clinical summary recorded.'),
    recommendations: str(raw, ['recommendations', 'supervisorNotes', 'nutritionalAdvice', 'plan', 'carePlan', 'advice'], '—'),
    bpReading: bp.label,
    hemoglobin: hb ?? 0,
    isDemo: false,
  };
}

export function adaptReferral(id: string, raw: RawDoc): ReferralRecord {
  const urgencyRaw = str(raw, ['urgency', 'priority', 'severity'], 'Urgent').toLowerCase();
  const urgency: ReferralRecord['urgency'] = urgencyRaw.includes('emerg') || urgencyRaw.includes('crit')
    ? 'Emergency'
    : urgencyRaw.includes('elect') || urgencyRaw.includes('rout') || urgencyRaw.includes('low')
    ? 'Elective'
    : 'Urgent';

  return {
    id,
    motherId: str(raw, ['motherId', 'relatedMotherId', 'patientId'], ''),
    motherName: str(raw, ['motherName', 'patientName'], 'Unknown Mother'),
    gestationalAgeLabel: str(raw, ['gestationalAgeLabel', 'gestationalAge'], '—'),
    sourceFacility: str(raw, ['sourceFacility', 'referredFrom', 'fromFacility', 'originFacility', 'facilityType'], 'Community / PHC'),
    sourceContact: str(raw, ['sourceContact', 'workerName', 'referredByName', 'healthWorkerPhone', 'referredBy'], '—'),
    reason: str(raw, ['reason', 'reasonForReferral', 'referralReason', 'diagnosis', 'indication'], 'Referral reason not specified'),
    clinicalSummary: str(raw, ['clinicalSummary', 'summary', 'notes', 'reasonForReferral', 'referralReason', 'reason'], '—'),
    urgency,
    destinationHospital: str(raw, ['destinationHospital', 'referredToFacility', 'targetFacility', 'referredTo', 'toHospital', 'hospitalName', 'destinationFacility'], 'Assigned Hospital'),
    destinationDepartment: str(raw, ['destinationDepartment', 'department', 'facilityType', 'unit'], 'Obstetrics & Gynecology'),
    referralDate: formatDateTime(raw.referralDate ?? raw.initiatedDate ?? raw.createdAt ?? raw.timestamp),
    status: normalizeReferralStatus(str(raw, ['status', 'referralStatus'], 'Pending')),
    followUpDetails: str(raw, ['followUpDetails', 'followUpNotes', 'notes'], 'No follow-up notes recorded yet.'),
    followUpDate: formatShortDate(raw.followUpDate ?? raw.nextFollowUpDate),
    assignedDoctor: str(raw, ['assignedDoctor', 'attendingDoctor', 'reviewedBy'], 'Unassigned'),
    isDemo: false,
  };
}

export function adaptAppointment(id: string, raw: RawDoc): AppointmentRecord {
  const typeRaw = str(raw, ['appointmentType', 'type', 'visitType', 'purpose'], 'ANC Routine Checkup').toLowerCase();
  const appointmentType: AppointmentRecord['appointmentType'] = typeRaw.includes('high')
    ? 'High-Risk OB Consult'
    : typeRaw.includes('ultra') || typeRaw.includes('usg') || typeRaw.includes('doppler') || typeRaw.includes('scan')
    ? 'Ultrasound / Doppler'
    : typeRaw.includes('lab') || typeRaw.includes('anemia') || typeRaw.includes('blood')
    ? 'Lab & Anemia Workup'
    : typeRaw.includes('post')
    ? 'Postnatal Follow-up'
    : 'ANC Routine Checkup';

  return {
    id,
    motherId: str(raw, ['motherId', 'patientId'], ''),
    motherName: str(raw, ['motherName', 'patientName'], 'Unknown Mother'),
    gestationalAgeLabel: str(raw, ['gestationalAgeLabel', 'gestationalAge'], '—'),
    appointmentType,
    scheduledDate: formatShortDate(raw.scheduledDate ?? raw.appointmentDate ?? raw.date ?? raw.scheduledAt),
    scheduledTime: str(raw, ['scheduledTime', 'time', 'slot'], '—'),
    clinician: str(raw, ['clinician', 'doctorName', 'assignedDoctor', 'providerName'], 'Unassigned'),
    department: str(raw, ['department', 'clinic', 'facilityName', 'location'], 'ANC Clinic'),
    status: normalizeAppointmentStatus(str(raw, ['status', 'appointmentStatus'], 'Upcoming')),
    assignedHealthWorkerName: str(raw, ['assignedHealthWorkerName', 'healthWorkerName'], '—'),
    notes: str(raw, ['notes', 'instructions', 'reason'], '—'),
    isDemo: false,
  };
}

export function adaptAuditLog(id: string, raw: RawDoc): AuditLogEntry {
  const catRaw = str(raw, ['category', 'eventType', 'type'], 'Record Access').toLowerCase();
  const category: AuditLogEntry['category'] = catRaw.includes('alert') || catRaw.includes('triage')
    ? 'Alert Triage'
    : catRaw.includes('refer')
    ? 'Referral Action'
    : catRaw.includes('note') || catRaw.includes('assess') || catRaw.includes('appoint')
    ? 'Clinical Note'
    : catRaw.includes('export') || catRaw.includes('report')
    ? 'Report Export'
    : catRaw.includes('auth') || catRaw.includes('login') || catRaw.includes('sign')
    ? 'Authentication'
    : 'Record Access';

  return {
    id,
    timestamp: formatDateTime(raw.timestamp ?? raw.createdAt),
    actorName: str(raw, ['actorName', 'userName', 'performedByName', 'email', 'actorId'], 'System User'),
    actorRole: str(raw, ['actorRole', 'userRole', 'role'], 'Staff'),
    category,
    action: str(raw, ['action', 'description', 'event'], 'Database Action'),
    targetEntity: str(raw, ['targetEntity', 'targetId', 'resource', 'motherId'], '—'),
    authorizationBasis: str(raw, ['authorizationBasis', 'reason', 'scope'], 'Authenticated Session'),
    isDemo: false,
  };
}

export function adaptReportDocument(id: string, raw: RawDoc): { motherId: string; doc: ClinicalDocument } {
  const catRaw = str(raw, ['category', 'documentType', 'type'], 'Laboratory').toLowerCase();
  const category: ClinicalDocument['category'] = catRaw.includes('ultra') || catRaw.includes('scan') || catRaw.includes('usg')
    ? 'Ultrasound'
    : catRaw.includes('discharg')
    ? 'Discharge Summary'
    : catRaw.includes('refer')
    ? 'Referral Slip'
    : catRaw.includes('anc')
    ? 'ANC Card'
    : 'Laboratory';

  const authorized =
    raw.authorized === false || raw.restricted === true || raw.hospitalAuthorized === false
      ? false
      : true;

  return {
    motherId: str(raw, ['motherId', 'patientId'], ''),
    doc: {
      id,
      title: str(raw, ['title', 'fileName', 'name', 'reportTitle'], `Clinical Report ${id}`),
      category,
      date: formatShortDate(raw.date ?? raw.uploadedAt ?? raw.createdAt),
      uploadedBy: str(raw, ['uploadedBy', 'uploadedByName', 'source', 'facilityName'], 'JanmaSaathi Record'),
      authorized,
      authorizationNote: authorized
        ? undefined
        : str(raw, ['authorizationNote'], 'Access restricted pending patient consent authorization.'),
      fileSize: str(raw, ['fileSize', 'size'], '—'),
      summary: str(raw, ['summary', 'notes', 'findings', 'description'], 'No summary provided.'),
      fileUrl: str(raw, ['fileUrl', 'downloadUrl', 'url']),
    },
  };
}

export function adaptHealthUpdate(
  id: string,
  raw: RawDoc
): {
  motherId: string;
  vital?: VitalRecord;
  symptom?: SymptomLog;
  alert?: EmergencyAlert;
} {
  const motherId = str(raw, ['motherId', 'patientId', 'userId'], '');
  const bp = parseBp(raw);
  const vitalsObj = (raw.vitals && typeof raw.vitals === 'object' ? (raw.vitals as RawDoc) : raw);
  const hb = num(vitalsObj, ['hemoglobin', 'hb', 'haemoglobin']);
  const pulse = num(vitalsObj, ['pulse', 'heartRate', 'hr']);
  const weight = num(vitalsObj, ['weightKg', 'weight']);
  const fhr = num(vitalsObj, ['fetalHeartRate', 'fhr']);
  const glucose = num(vitalsObj, ['bloodGlucose', 'glucose', 'ppbs', 'fbs']);
  const spo2 = num(vitalsObj, ['spo2', 'oxygenSaturation']);
  const temp = num(vitalsObj, ['temperatureC', 'temperature', 'temp']);
  const ts = formatDateTime(raw.timestamp ?? raw.createdAt ?? raw.date);
  const dateOnly = formatShortDate(raw.timestamp ?? raw.createdAt ?? raw.date);

  const hasVital =
    bp.systolic !== null || hb !== null || pulse !== null || weight !== null || fhr !== null || glucose !== null;

  const vital: VitalRecord | undefined = hasVital
    ? {
        id,
        date: dateOnly,
        systolicBp: bp.systolic ?? 0,
        diastolicBp: bp.diastolic ?? 0,
        pulse: pulse ?? 0,
        hemoglobin: hb ?? 0,
        weightKg: weight ?? 0,
        fetalHeartRate: fhr ?? undefined,
        bloodGlucose: glucose ?? undefined,
        spo2: spo2 ?? undefined,
        temperatureC: temp ?? undefined,
        recordedBy: str(raw, ['recordedBy', 'submittedByName', 'workerName', 'authorName'], 'JanmaSaathi Sync'),
        source: str(raw, ['source', 'reportedVia'], '').toLowerCase().includes('hospital')
          ? 'Hospital OPD'
          : str(raw, ['source', 'reportedVia'], '').toLowerCase().includes('worker')
          ? 'Health Worker Visit'
          : 'Mother Self-Log',
      }
    : undefined;

  const symptoms = strArray(raw, ['symptoms', 'dangerSigns', 'reportedSymptoms']);
  const sevRaw = str(raw, ['severity', 'urgency', 'riskLevel'], '').toLowerCase();
  const obsNotes = [str(raw, ['observations']), str(raw, ['notes', 'symptomNotes', 'reviewNotes', 'description'])]
    .filter(Boolean)
    .join(' — ');
  const symptom: SymptomLog | undefined =
    symptoms.length > 0 || obsNotes
      ? {
          id,
          date: formatDateTime(raw.submittedAt ?? raw.timestamp ?? raw.createdAt ?? raw.date),
          symptoms: symptoms.length > 0 ? symptoms : [str(raw, ['title', 'type'], 'Health Update')],
          severity: sevRaw.includes('crit') || sevRaw.includes('sev')
            ? 'Severe'
            : sevRaw.includes('mod') || sevRaw.includes('high')
            ? 'Moderate'
            : 'Mild',
          notes: obsNotes,
          reportedVia: str(raw, ['reportedVia', 'source'], '').toLowerCase().includes('worker')
            ? 'Health Worker Check-in'
            : str(raw, ['reportedVia', 'source'], '').toLowerCase().includes('hospital')
            ? 'Hospital Triage'
            : 'Mother App',
        }
      : undefined;

  // Only treat healthUpdates as emergency alerts when explicitly flagged by authorized reporting/protocol
  // (never invent medical thresholds or autonomously diagnose emergencies).
  const isEmergency =
    raw.isEmergency === true ||
    raw.emergency === true ||
    raw.isAlert === true ||
    str(raw, ['type', 'updateType', 'alertType'], '').toLowerCase().includes('emerg') ||
    str(raw, ['type', 'updateType', 'alertType'], '').toLowerCase().includes('sos') ||
    str(raw, ['type', 'updateType', 'alertType'], '').toLowerCase().includes('alert') ||
    sevRaw.includes('critical') ||
    sevRaw.includes('emergency');

  const alert: EmergencyAlert | undefined = isEmergency
    ? adaptEmergencyAlert(id, raw, 'healthUpdates')
    : undefined;

  return { motherId, vital, symptom, alert };
}

function extractAlertCategory(raw: RawDoc): AlertCategory {
  const rawCategory = str(raw, ['alertCategory', 'category', 'alertType', 'type'], '');
  if (ALERT_CATEGORIES.includes(rawCategory as AlertCategory)) {
    return rawCategory as AlertCategory;
  }
  const lower = rawCategory.toLowerCase();
  if (!lower) return 'Other Clinical Escalation';
  if (lower.includes('bleed') || lower.includes('hemorr') || lower.includes('haemorr')) {
    return 'Hemorrhage / Bleeding';
  }
  if (lower.includes('bp') || lower.includes('hyperten') || lower.includes('eclamp')) {
    return 'Hypertensive / Pre-Eclampsia';
  }
  if (lower.includes('fetal') || lower.includes('foetal') || lower.includes('movement') || lower.includes('fhr')) {
    return 'Fetal Distress';
  }
  if (lower.includes('anem') || lower.includes('anaem') || lower.includes('hb') || lower.includes('weak')) {
    return 'Severe Anemia / Weakness';
  }
  if (lower.includes('sepsis') || lower.includes('infect') || lower.includes('fever')) {
    return 'Infection / Sepsis';
  }
  if (lower.includes('transport') || lower.includes('ambul') || lower.includes('refer')) {
    return 'Transport / Referral Urgency';
  }
  if (lower.includes('sos') || lower.includes('emerg') || lower.includes('obstet') || lower.includes('labor') || lower.includes('labour')) {
    return 'Obstetric Emergency';
  }
  return 'Other Clinical Escalation';
}

function extractLocationLabel(raw: RawDoc): string {
  const direct = str(raw, ['block', 'village', 'locationText', 'address', 'area'], '');
  if (direct) return direct;

  const locVal = raw.location ?? raw.gpsLocation ?? raw.coordinates;
  if (typeof locVal === 'string' && locVal.trim()) {
    return locVal.trim();
  }
  if (locVal && typeof locVal === 'object') {
    const locObj = locVal as RawDoc;
    const namedParts = [
      str(locObj, ['address', 'label', 'name'], ''),
      str(locObj, ['village', 'ward', 'area'], ''),
      str(locObj, ['block', 'tehsil'], ''),
      str(locObj, ['district'], ''),
    ].filter(Boolean);
    if (namedParts.length > 0) {
      return Array.from(new Set(namedParts)).join(', ');
    }
    const lat = num(locObj, ['latitude', 'lat', '_lat']);
    const lng = num(locObj, ['longitude', 'lng', 'lon', '_long']);
    if (lat !== null && lng !== null) {
      return `GPS ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }
  return '—';
}

export function adaptEmergencyAlert(
  id: string,
  raw: RawDoc,
  sourceCollection: 'emergencyAlerts' | 'alerts' | 'healthUpdates' | 'messages' = 'emergencyAlerts'
): EmergencyAlert {
  const motherObj =
    raw.mother && typeof raw.mother === 'object'
      ? (raw.mother as RawDoc)
      : raw.maternalDetails && typeof raw.maternalDetails === 'object'
      ? (raw.maternalDetails as RawDoc)
      : raw.patient && typeof raw.patient === 'object'
      ? (raw.patient as RawDoc)
      : null;

  const bp = parseBp(raw);
  const vitalsObj = (raw.vitals && typeof raw.vitals === 'object' ? (raw.vitals as RawDoc) : raw);
  const severity: AlertPriority = normalizeAlertPriority(
    str(raw, ['priority', 'severity', 'urgency', 'riskLevel'], 'High Priority')
  );

  const rawSourceRole = str(
    raw,
    ['sourceRole', 'reportingSource', 'source', 'submittedByRole', 'createdByRole', 'senderRole', 'channel'],
    ''
  ).toLowerCase();
  const sourceRole: AlertSourceRole =
    rawSourceRole.includes('super') || rawSourceRole.includes('block') || rawSourceRole.includes('medical officer')
      ? 'supervisor'
      : rawSourceRole.includes('worker') ||
        rawSourceRole.includes('asha') ||
        rawSourceRole.includes('anm') ||
        rawSourceRole.includes('hw')
      ? 'health_worker'
      : 'mother';

  const reportingSource = SOURCE_ROLE_LABELS[sourceRole];

  const primaryTsValue = raw.createdAt ?? raw.submittedAt ?? raw.timestamp ?? raw.reportedAt ?? raw.date;
  const tsIso = toIsoString(primaryTsValue) || new Date().toISOString();
  const elapsedMinutes = tsIso
    ? Math.max(0, Math.round((Date.now() - Date.parse(tsIso)) / 60000) || 0)
    : 0;

  const rawHistory = Array.isArray(raw.responseHistory) ? (raw.responseHistory as RawDoc[]) : [];
  const responseHistory: AlertResponseEntry[] =
    rawHistory.length > 0
      ? rawHistory.map((item, idx) => ({
          id: str(item, ['id'], `resp-${idx}`),
          timestamp: formatDateTime(item.timestamp ?? item.createdAt),
          actorId: str(item, ['actorId', 'byUid']) || undefined,
          actor: str(item, ['actor', 'actorName', 'by'], 'Responder'),
          role: str(item, ['role', 'actorRole'], 'Staff'),
          action: str(item, ['action', 'status'], 'Updated'),
          previousStatus: item.previousStatus ? normalizeAlertStatus(String(item.previousStatus)) : undefined,
          nextStatus: item.nextStatus ? normalizeAlertStatus(String(item.nextStatus)) : undefined,
          assignedTo: str(item, ['assignedTo']) || undefined,
          note: str(item, ['note', 'notes', 'comment'], ''),
          notifiedRecipients: Array.isArray(item.notifiedRecipients)
            ? (item.notifiedRecipients.filter((r) =>
                ['mother', 'health_worker', 'supervisor'].includes(String(r))
              ) as AlertSourceRole[])
            : undefined,
        }))
      : [
          {
            id: `init-${id}`,
            timestamp: formatDateTime(primaryTsValue),
            actorId: str(raw, ['reportedByUserId', 'submittedBy', 'createdBy', 'owningUid']) || undefined,
            actor: str(raw, ['reportedByName', 'createdByName', 'motherName', 'assignedHealthWorkerName'], 'JanmaSaathi'),
            role: reportingSource,
            action: 'Alert Submitted',
            nextStatus: 'NEW',
            note: str(raw, ['symptomDescription', 'notes', 'observations', 'message', 'description', 'triggerTitle'], 'Alert logged in Firestore.'),
          },
        ];

  const rawDuplicates = Array.isArray(raw.duplicateSubmissions)
    ? (raw.duplicateSubmissions as RawDoc[])
    : [];
  const duplicateSubmissions: AlertDuplicateSubmission[] = rawDuplicates.map((d, i) => {
    const dupRoleRaw = str(d, ['sourceRole'], 'mother').toLowerCase();
    const dupRole: AlertSourceRole = dupRoleRaw.includes('super')
      ? 'supervisor'
      : dupRoleRaw.includes('worker')
      ? 'health_worker'
      : 'mother';
    return {
      submissionId: str(d, ['submissionId', 'id'], `DUP-${i + 1}`),
      submittedAt: formatDateTime(d.submittedAt ?? d.timestamp ?? d.createdAt),
      reportedByUserId: str(d, ['reportedByUserId', 'userId'], '—'),
      reportedByName: str(d, ['reportedByName', 'actor'], 'Reporter'),
      sourceRole: dupRole,
      operationId: str(d, ['operationId']) || undefined,
      symptomDescription: str(d, ['symptomDescription', 'note', 'description'], ''),
      note: str(d, ['note']) || undefined,
    };
  });

  const alertCategory: AlertCategory = extractAlertCategory(raw);

  const hospitalResponse: AlertHospitalResponse =
    raw.hospitalResponse && typeof raw.hospitalResponse === 'object'
      ? (raw.hospitalResponse as AlertHospitalResponse)
      : {};

  const returnCommRaw =
    raw.returnCommunication && typeof raw.returnCommunication === 'object'
      ? (raw.returnCommunication as Partial<AlertReturnCommunication>)
      : {};
  const returnCommunication: AlertReturnCommunication = {
    lastDispatchedAt: returnCommRaw.lastDispatchedAt,
    latestStatusMessage: returnCommRaw.latestStatusMessage,
    linkedMessageId: returnCommRaw.linkedMessageId,
    recipients: {
      mother: Boolean(returnCommRaw.recipients?.mother),
      healthWorker: Boolean(returnCommRaw.recipients?.healthWorker),
      supervisor: Boolean(returnCommRaw.recipients?.supervisor),
    },
  };

  const priorityBasisRaw = str(raw, ['priorityBasis'], '');
  const priorityBasis: PriorityBasis =
    priorityBasisRaw === 'Protocol Triage' ||
    priorityBasisRaw === 'Health Worker Assessment' ||
    priorityBasisRaw === 'Supervisor Escalation' ||
    priorityBasisRaw === 'Mother Emergency Report' ||
    priorityBasisRaw === 'Hospital Clinician Override'
      ? priorityBasisRaw
      : sourceRole === 'mother'
      ? 'Mother Emergency Report'
      : sourceRole === 'supervisor'
      ? 'Supervisor Escalation'
      : 'Health Worker Assessment';

  const symptomDescription = str(
    raw,
    ['symptomDescription', 'observations', 'notes', 'description', 'message'],
    strArray(raw, ['symptoms', 'dangerSigns']).join(', ') || 'No symptom description provided.'
  );

  const resolvedMotherId =
    str(raw, ['motherId', 'relatedMotherId', 'patientId', 'mcpId', 'userId'], '') ||
    (motherObj ? str(motherObj, ['id', 'motherId', 'mcpId'], '') : '');

  const resolvedMotherName =
    str(raw, ['motherName', 'patientName'], '') ||
    (motherObj ? str(motherObj, ['fullName', 'name'], '') : '') ||
    resolvedMotherId ||
    'Referenced Mother';

  const resolvedGestationalAge =
    str(raw, ['gestationalAgeLabel', 'gestationalAge'], '') ||
    (motherObj ? str(motherObj, ['gestationalAgeLabel', 'gestationalAge'], '') : '') ||
    (num(raw, ['gestationalWeeks', 'pregnancyWeeks']) !== null
      ? `${num(raw, ['gestationalWeeks', 'pregnancyWeeks'])}w`
      : '—');

  // Fail-closed: never silently rewrite an unaddressed alert to a hardcoded facility ID.
  const resolvedFacilityId = str(
    raw,
    [
      'facilityId',
      'hospitalId',
      'facilityCode',
      'hospitalCode',
      'targetFacilityId',
      'destinationFacilityId',
      'destinationHospitalId',
      'assignedFacilityId',
      'assignedHospitalId',
    ],
    ''
  );

  const resolvedFacilityName = str(
    raw,
    ['facilityName', 'hospitalName', 'targetHospitalName', 'destinationHospitalName'],
    resolvedFacilityId || 'Assigned Hospital'
  );

  return {
    id,
    sourceCollection,
    motherId: resolvedMotherId,
    motherName: resolvedMotherName,
    gestationalAgeLabel: resolvedGestationalAge,
    sourceRole,
    reportedByUserId: str(raw, ['reportedByUserId', 'submittedBy', 'createdBy', 'senderUid', 'owningUid'], '—'),
    reportedByName: str(raw, ['reportedByName', 'createdByName', 'assignedHealthWorkerName', 'motherName'], reportingSource),
    facilityId: resolvedFacilityId,
    facilityName: resolvedFacilityName,
    alertCategory,
    severity,
    priorityBasis,
    protocolReference: str(raw, ['protocolReference']) || undefined,
    status: normalizeAlertStatus(str(raw, ['status', 'triageStatus', 'alertStatus'], 'NEW')),
    reportingSource,
    triggerTitle: str(raw, ['triggerTitle', 'title', 'alertCategory', 'reason', 'alertType', 'type'], 'Maternal Emergency Alert'),
    symptomDescription,
    symptoms: strArray(raw, ['symptoms', 'dangerSigns']),
    vitalsSnapshot: {
      bp: bp.label,
      pulse: num(vitalsObj, ['pulse', 'heartRate']) ?? 0,
      spo2: num(vitalsObj, ['spo2']) ?? undefined,
      hemoglobin: num(vitalsObj, ['hemoglobin', 'hb']) ?? undefined,
      fetalHeartRate: num(vitalsObj, ['fetalHeartRate', 'fhr']) ?? undefined,
      temperatureC: num(vitalsObj, ['temperatureC', 'temperature']) ?? undefined,
    },
    submittedAtIso: tsIso,
    timestamp: formatDateTime(primaryTsValue),
    elapsedMinutes,
    responseTimeMinutes: num(raw, ['responseTimeMinutes']) ?? undefined,
    assignedHealthWorkerId: str(raw, ['assignedHealthWorkerId', 'assignedWorkerId', 'healthWorkerId'], ''),
    assignedHealthWorkerName: str(raw, ['assignedHealthWorkerName', 'assignedWorkerName', 'healthWorkerName'], 'Unassigned'),
    assignedHealthWorkerPhone: str(raw, ['assignedHealthWorkerPhone', 'healthWorkerPhone'], '—'),
    block: extractLocationLabel(raw),
    duplicateOfAlertId: str(raw, ['duplicateOfAlertId']) || null,
    duplicateSubmissionCount: num(raw, ['duplicateSubmissionCount']) ?? duplicateSubmissions.length,
    duplicateSubmissions,
    hospitalResponse,
    returnCommunication,
    responseHistory,
    operationId: str(raw, ['operationId']) || undefined,
    isDemo: false,
  };
}

export function adaptMother(
  id: string,
  raw: RawDoc,
  context: {
    healthWorkersById: Map<string, HealthWorker>;
    assignmentByMotherId: Map<string, string>;
    assessmentsByMotherId: Map<string, AssessmentRecord[]>;
    vitalsByMotherId: Map<string, VitalRecord[]>;
    symptomsByMotherId: Map<string, SymptomLog[]>;
    alertsByMotherId: Map<string, EmergencyAlert[]>;
    referralsByMotherId: Map<string, ReferralRecord[]>;
    documentsByMotherId: Map<string, ClinicalDocument[]>;
  }
): MotherRecord {
  const { weeks, days } = computeGestationalWeeks(raw);
  const trimester: 1 | 2 | 3 = weeks >= 28 ? 3 : weeks >= 13 ? 2 : 1;

  const consentObj = raw.consent && typeof raw.consent === 'object' ? (raw.consent as RawDoc) : null;
  const ageAuthorized =
    raw.ageAuthorized === false ||
    consentObj?.shareAge === false ||
    consentObj?.shareAgeWithHospital === false
      ? false
      : true;
  const rawAge = num(raw, ['age', 'motherAge']);

  const assignedHwId =
    str(raw, ['assignedWorkerId', 'assignedHealthWorkerId', 'healthWorkerId', 'ashaId', 'anmId']) ||
    context.assignmentByMotherId.get(id) ||
    '';
  const hw = assignedHwId ? context.healthWorkersById.get(assignedHwId) : undefined;
  const assignedHwName =
    hw?.name ||
    str(raw, ['assignedWorkerName', 'assignedHealthWorkerName', 'healthWorkerName', 'ashaName'], 'Unassigned');

  const mAssessments = context.assessmentsByMotherId.get(id) ?? [];
  const latestAsm = mAssessments[0];
  const mVitals = context.vitalsByMotherId.get(id) ?? [];
  const mSymptoms = context.symptomsByMotherId.get(id) ?? [];
  const mAlerts = context.alertsByMotherId.get(id) ?? [];
  const mReferrals = context.referralsByMotherId.get(id) ?? [];
  const mDocs = context.documentsByMotherId.get(id) ?? [];

  const activeAlert = mAlerts.find((a) => isActiveAlertStatus(a.status));
  const alertStatus: MotherRecord['alertStatus'] = activeAlert
    ? activeAlert.status === 'IN PROGRESS' || activeAlert.status === 'REFERRED / ACTION TAKEN'
      ? 'Under Review'
      : activeAlert.severity
    : mAlerts.length > 0
    ? 'Resolved'
    : 'None';

  const latestRef = mReferrals[0];
  const referralStatus: MotherRecord['referralStatus'] = latestRef
    ? latestRef.status
    : str(raw, ['referralStatus'])
    ? normalizeReferralStatus(str(raw, ['referralStatus']))
    : 'None';

  const directBp = parseBp(raw);
  const latestBp = latestAsm?.bpReading && latestAsm.bpReading !== '—'
    ? latestAsm.bpReading
    : mVitals[0] && mVitals[0].systolicBp > 0
    ? `${mVitals[0].systolicBp}/${mVitals[0].diastolicBp}`
    : directBp.label;

  const latestHb =
    latestAsm?.hemoglobin ||
    mVitals[0]?.hemoglobin ||
    num(raw, ['latestHb', 'hemoglobin', 'hb']) ||
    0;

  const pregStatusRaw = str(raw, ['pregnancyStatus', 'status'], 'Active Pregnancy').toLowerCase();
  const pregnancyStatus: MotherRecord['pregnancyStatus'] = pregStatusRaw.includes('deliver')
    ? 'Delivered'
    : pregStatusRaw.includes('post')
    ? 'Postnatal Follow-up'
    : 'Active Pregnancy';

  const milestonesRaw = Array.isArray(raw.milestones) ? (raw.milestones as RawDoc[]) : [];
  const milestones =
    milestonesRaw.length > 0
      ? milestonesRaw.map((ms) => ({
          week: num(ms, ['week']) ?? 0,
          label: str(ms, ['label', 'title'], 'Milestone'),
          date: formatShortDate(ms.date),
          status: (str(ms, ['status'], 'Scheduled') as 'Completed' | 'Current' | 'Scheduled'),
          note: str(ms, ['note', 'notes'], ''),
        }))
      : [
          ...(raw.createdAt || raw.registeredDate || raw.mcpIssuedDate
            ? [
                {
                  week: Math.min(weeks || 8, 12),
                  label: 'JanmaSaathi Registration',
                  date: formatShortDate(raw.mcpIssuedDate ?? raw.registeredDate ?? raw.createdAt),
                  status: 'Completed' as const,
                  note: raw.mcpCardNumber
                    ? `MCP Card ${String(raw.mcpCardNumber)} registered in JanmaSaathi.`
                    : 'Maternal profile registered in JanmaSaathi.',
                },
              ]
            : []),
          ...(weeks > 0
            ? [
                {
                  week: weeks,
                  label: 'Current Gestational Stage',
                  date: formatShortDate(latestAsm?.date ?? raw.updatedAt ?? new Date()),
                  status: 'Current' as const,
                  note: latestAsm?.summary || 'Active maternal monitoring.',
                },
              ]
            : []),
          ...(raw.eddDate || raw.edd || raw.expectedDeliveryDate
            ? [
                {
                  week: 40,
                  label: 'Estimated Delivery Date (EDD)',
                  date: formatShortDate(raw.eddDate ?? raw.edd ?? raw.expectedDeliveryDate),
                  status: 'Scheduled' as const,
                  note: 'Target delivery window.',
                },
              ]
            : []),
        ];

  const villagePart = str(raw, ['villageOrWard', 'village', 'ward', 'address']);
  const hamletPart = str(raw, ['hamlet']);
  const villageOrWard =
    villagePart && hamletPart ? `${villagePart}, ${hamletPart}` : villagePart || hamletPart || '—';

  return {
    id,
    fullName: str(raw, ['fullName', 'name', 'motherName', 'displayName'], id),
    regionalName: str(raw, ['regionalName', 'odiaName', 'hindiName', 'localName'], ''),
    regionalScript: str(raw, ['regionalScript'], 'Odia') === 'Devanagari' ? 'Devanagari' : 'Odia',
    age: ageAuthorized ? rawAge : null,
    ageAuthorized,
    consentLevel: ageAuthorized
      ? (str(raw, ['consentLevel'], 'Standard ANC Access') as MotherRecord['consentLevel'])
      : 'Restricted Demographics',
    phoneMasked: str(raw, ['phoneMasked', 'phone', 'phoneNumber', 'mobile'], '—'),
    villageOrWard,
    block: str(raw, ['block', 'district', 'subDistrict', 'hamlet'], '—'),
    bloodGroup: str(raw, ['bloodGroup', 'bloodType'], '—'),
    gravidaPara: str(raw, ['gravidaPara', 'obstetricScore'], '—'),
    lmpDate: formatShortDate(raw.lmpDate ?? raw.lmp ?? raw.lastMenstrualPeriod),
    eddDate: formatShortDate(raw.eddDate ?? raw.edd ?? raw.expectedDeliveryDate),
    gestationalWeeks: weeks,
    gestationalDays: days,
    trimester,
    pregnancyStatus,
    riskLevel: normalizeRisk(
      str(
        raw,
        ['riskLevel', 'riskCategory', 'risk', 'priority', 'riskStatus'],
        latestAsm?.riskClassification ?? 'Routine'
      )
    ),
    riskFactors: strArray(raw, ['riskFactors', 'highRiskFactors', 'complications', 'dangerSigns']),
    assignedHealthWorkerId: assignedHwId,
    assignedHealthWorkerName: assignedHwName,
    latestAssessmentDate: latestAsm?.date ? latestAsm.date.slice(0, 10) : formatShortDate(raw.latestAssessmentDate ?? raw.updatedAt),
    latestAssessmentSummary:
      latestAsm?.summary || str(raw, ['latestAssessmentSummary', 'notes'], 'No assessment recorded yet.'),
    latestBp,
    latestHb,
    alertStatus,
    referralStatus,
    medicalHistory: strArray(raw, ['medicalHistory', 'pastHistory', 'conditions']),
    allergies: strArray(raw, ['allergies']),
    vitalsHistory: mVitals,
    symptomLogs: mSymptoms,
    documents: mDocs,
    milestones,
    registeredDate: formatShortDate(raw.mcpIssuedDate ?? raw.registeredDate ?? raw.createdAt),
    isDemo: false,
  };
}
