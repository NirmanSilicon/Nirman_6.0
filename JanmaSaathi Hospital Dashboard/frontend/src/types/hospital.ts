export type AppMode = 'demo' | 'firebase';

export type DemoPersonaId =
  | 'mother-priya'
  | 'hw-sunita'
  | 'supervisor-rajesh'
  | 'hospital-demo';

export type NavSection =
  | 'overview'
  | 'mothers'
  | 'health-workers'
  | 'alerts'
  | 'referrals'
  | 'analytics'
  | 'appointments'
  | 'reports'
  | 'audit-logs'
  | 'settings';

export type DateRangeKey = '7d' | '30d' | '90d' | 'quarter' | 'all';

export type RiskLevel = 'Routine' | 'Moderate' | 'High Priority' | 'Critical';

export type AlertPriority = 'Critical' | 'High Priority' | 'Moderate' | 'Low';
export type AlertSeverity = AlertPriority;

export type AlertSourceRole = 'mother' | 'health_worker' | 'supervisor';

export type AlertCategory =
  | 'Obstetric Emergency'
  | 'Hypertensive / Pre-Eclampsia'
  | 'Hemorrhage / Bleeding'
  | 'Fetal Distress'
  | 'Severe Anemia / Weakness'
  | 'Infection / Sepsis'
  | 'Transport / Referral Urgency'
  | 'Other Clinical Escalation';

export type AlertStatus =
  | 'NEW'
  | 'ACKNOWLEDGED'
  | 'IN PROGRESS'
  | 'REFERRED / ACTION TAKEN'
  | 'RESOLVED'
  | 'CLOSED';

export type PriorityBasis =
  | 'Protocol Triage'
  | 'Health Worker Assessment'
  | 'Supervisor Escalation'
  | 'Mother Emergency Report'
  | 'Hospital Clinician Override';

export type ReferralStatus =
  | 'Pending'
  | 'Accepted'
  | 'In Transit'
  | 'Admitted'
  | 'Completed'
  | 'Declined';

export type AppointmentStatus =
  | 'Upcoming'
  | 'Completed'
  | 'Missed'
  | 'Rescheduled'
  | 'Follow-up Due';

export interface HospitalFacility {
  id: string;
  name: string;
  shortName: string;
  facilityCode: string;
  district: string;
  state: string;
  tier: string;
  obgynBeds: number;
  emergencyDeskPhone: string;
  catchmentBlocks: string[];
}

export interface HospitalUser {
  id: string;
  uid: string;
  name: string;
  designation: string;
  department: string;
  role: string;
  staffId: string;
  email: string;
  facilityId: string;
  shift: string;
}

export interface HospitalStaffMember {
  id: string;
  name: string;
  role: string;
  department: string;
  facilityId: string;
  shift: string;
}

export type CollectionKey =
  | 'users'
  | 'mothers'
  | 'healthWorkers'
  | 'supervisors'
  | 'assignments'
  | 'assessments'
  | 'healthUpdates'
  | 'referrals'
  | 'appointments'
  | 'reports'
  | 'emergencyAlerts'
  | 'alerts'
  | 'auditLogs';

export interface CollectionSyncState {
  status: 'idle' | 'loading' | 'ready' | 'permission-denied' | 'error';
  count: number;
  errorCode?: string;
  errorMessage?: string;
  path: string;
  lastSyncedAt?: string;
}

export type CollectionStatusMap = Record<CollectionKey, CollectionSyncState>;

export interface AlertSyncChannelState {
  channel: 'sse' | 'firestore-realtime' | 'polling-fallback' | 'reconnecting' | 'offline';
  connected: boolean;
  lastSyncedAt: string | null;
  pollingIntervalMs: number | null;
  errorMessage?: string;
}

export interface VitalRecord {
  id: string;
  date: string;
  systolicBp: number;
  diastolicBp: number;
  pulse: number;
  hemoglobin: number; // g/dL
  weightKg: number;
  fetalHeartRate?: number; // bpm
  bloodGlucose?: number; // mg/dL
  spo2?: number; // %
  temperatureC?: number;
  recordedBy: string;
  source: 'Hospital OPD' | 'Health Worker Visit' | 'Mother Self-Log';
}

export interface SymptomLog {
  id: string;
  date: string;
  symptoms: string[];
  severity: 'Mild' | 'Moderate' | 'Severe';
  notes: string;
  reportedVia: 'Mother App' | 'Health Worker Check-in' | 'Hospital Triage';
}

export interface AssessmentRecord {
  id: string;
  motherId: string;
  motherName: string;
  date: string;
  gestationalWeek: number;
  assessorName: string;
  assessorRole: string;
  facilityOrLocation: string;
  assessmentType:
    | 'ANC Routine'
    | 'High-Risk Review'
    | 'Home Visit'
    | 'Emergency Triage'
    | 'Postnatal Review';
  riskClassification: RiskLevel;
  summary: string;
  recommendations: string;
  bpReading: string;
  hemoglobin: number;
  isDemo: boolean;
}

export interface ClinicalDocument {
  id: string;
  title: string;
  category: 'Ultrasound' | 'Laboratory' | 'Discharge Summary' | 'Referral Slip' | 'ANC Card';
  date: string;
  uploadedBy: string;
  authorized: boolean;
  authorizationNote?: string;
  fileSize: string;
  summary: string;
  fileUrl?: string;
}

export interface PregnancyMilestone {
  week: number;
  label: string;
  date: string;
  status: 'Completed' | 'Current' | 'Scheduled';
  note: string;
}

export interface MotherRecord {
  id: string;
  fullName: string;
  regionalName: string;
  regionalScript: 'Odia' | 'Devanagari';
  age: number | null;
  ageAuthorized: boolean;
  consentLevel: 'Full Clinical Access' | 'Standard ANC Access' | 'Restricted Demographics';
  phoneMasked: string;
  villageOrWard: string;
  block: string;
  bloodGroup: string;
  gravidaPara: string;
  lmpDate: string;
  eddDate: string;
  gestationalWeeks: number;
  gestationalDays: number;
  trimester: 1 | 2 | 3;
  pregnancyStatus: 'Active Pregnancy' | 'Postnatal Follow-up' | 'Delivered';
  riskLevel: RiskLevel;
  riskFactors: string[];
  assignedHealthWorkerId: string;
  assignedHealthWorkerName: string;
  latestAssessmentDate: string;
  latestAssessmentSummary: string;
  latestBp: string;
  latestHb: number;
  alertStatus: 'None' | 'Critical' | 'High Priority' | 'Moderate' | 'Low' | 'Under Review' | 'Resolved';
  referralStatus: 'None' | ReferralStatus;
  medicalHistory: string[];
  allergies: string[];
  vitalsHistory: VitalRecord[];
  symptomLogs: SymptomLog[];
  documents: ClinicalDocument[];
  milestones: PregnancyMilestone[];
  registeredDate: string;
  isDemo: boolean;
}

export interface HealthWorkerActivity {
  id: string;
  timestamp: string;
  action: string;
  motherId?: string;
  motherName?: string;
  details: string;
}

export interface SupervisorRecord {
  id: string;
  name: string;
  designation: string;
  block: string;
  district: string;
  facilityId: string;
  phone: string;
  email: string;
  status: string;
  isDemo: boolean;
}

export interface HealthWorker {
  id: string;
  name: string;
  regionalName: string;
  cadre: 'ASHA Worker' | 'ANM Nurse' | 'Community Health Officer';
  catchmentArea: string;
  block: string;
  subCentre: string;
  phone: string;
  assignedMothersCount: number;
  recentAssessments30d: number;
  referralsSubmitted: number;
  pendingFollowUps: number;
  emergencyAlertsRaised: number;
  followUpCompletionRate: number; // %
  lastActiveDate: string;
  status: 'Active' | 'On Field Duty' | 'On Leave';
  activities: HealthWorkerActivity[];
  isDemo: boolean;
}

export interface AlertResponseEntry {
  id: string;
  timestamp: string;
  actorId?: string;
  actor: string;
  role: string;
  action: string;
  previousStatus?: AlertStatus;
  nextStatus?: AlertStatus;
  assignedTo?: string;
  note: string;
  notifiedRecipients?: AlertSourceRole[];
}

export interface AlertDuplicateSubmission {
  submissionId: string;
  submittedAt: string;
  reportedByUserId: string;
  reportedByName: string;
  sourceRole: AlertSourceRole;
  operationId?: string;
  symptomDescription: string;
  note?: string;
}

export interface AlertReferralCoordination {
  referralId?: string;
  destinationFacility?: string;
  wardOrUnit?: string;
  transportStatus?: 'Not Required' | 'Ambulance Requested' | 'Ambulance Dispatched' | 'In Transit' | 'Arrived';
  ambulanceRef?: string;
  treatmentSummary?: string;
  updatedAt?: string;
}

export interface AlertHospitalResponse {
  acknowledgedAt?: string;
  acknowledgedById?: string;
  acknowledgedByName?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  assignedStaffRole?: string;
  referralCoordination?: AlertReferralCoordination;
  resolutionSummary?: string;
  resolvedAt?: string;
  resolvedById?: string;
  resolvedByName?: string;
  closedAt?: string;
  closedById?: string;
  closedByName?: string;
}

export interface AlertReturnCommunication {
  lastDispatchedAt?: string;
  latestStatusMessage?: string;
  linkedMessageId?: string;
  recipients: {
    mother: boolean;
    healthWorker: boolean;
    supervisor: boolean;
  };
}

export interface EmergencyAlert {
  id: string;
  sourceCollection?: 'emergencyAlerts' | 'alerts' | 'healthUpdates' | 'messages';
  /** Reference to existing mothers/{motherId} record — full maternal profile is never duplicated in alert docs */
  motherId: string;
  /** Resolved client-side from mothers/{motherId} (or fallback display label) */
  motherName: string;
  gestationalAgeLabel: string;
  sourceRole: AlertSourceRole;
  reportedByUserId: string;
  reportedByName: string;
  facilityId: string;
  facilityName: string;
  alertCategory: AlertCategory;
  severity: AlertPriority;
  priorityBasis: PriorityBasis;
  protocolReference?: string;
  status: AlertStatus;
  reportingSource: string;
  triggerTitle: string;
  symptomDescription: string;
  symptoms: string[];
  vitalsSnapshot: {
    bp: string;
    pulse: number;
    spo2?: number;
    hemoglobin?: number;
    fetalHeartRate?: number;
    temperatureC?: number;
  };
  submittedAtIso: string;
  timestamp: string;
  elapsedMinutes: number;
  responseTimeMinutes?: number;
  assignedHealthWorkerId: string;
  assignedHealthWorkerName: string;
  assignedHealthWorkerPhone: string;
  block: string;
  duplicateOfAlertId?: string | null;
  duplicateSubmissionCount: number;
  duplicateSubmissions: AlertDuplicateSubmission[];
  hospitalResponse: AlertHospitalResponse;
  returnCommunication: AlertReturnCommunication;
  responseHistory: AlertResponseEntry[];
  operationId?: string;
  isDemo: boolean;
}

export interface ReferralRecord {
  id: string;
  motherId: string;
  motherName: string;
  gestationalAgeLabel: string;
  sourceFacility: string;
  sourceContact: string;
  reason: string;
  clinicalSummary: string;
  urgency: 'Emergency' | 'Urgent' | 'Elective';
  destinationHospital: string;
  destinationDepartment: string;
  referralDate: string;
  status: ReferralStatus;
  followUpDetails: string;
  followUpDate: string;
  assignedDoctor: string;
  isDemo: boolean;
}

export interface AppointmentRecord {
  id: string;
  motherId: string;
  motherName: string;
  gestationalAgeLabel: string;
  appointmentType:
    | 'ANC Routine Checkup'
    | 'High-Risk OB Consult'
    | 'Ultrasound / Doppler'
    | 'Lab & Anemia Workup'
    | 'Postnatal Follow-up';
  scheduledDate: string;
  scheduledTime: string;
  clinician: string;
  department: string;
  status: AppointmentStatus;
  assignedHealthWorkerName: string;
  notes: string;
  isDemo: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  category:
    | 'Record Access'
    | 'Alert Triage'
    | 'Referral Action'
    | 'Clinical Note'
    | 'Report Export'
    | 'Authentication';
  action: string;
  targetEntity: string;
  authorizationBasis: string;
  isDemo: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  priority?: AlertPriority;
  type: 'alert' | 'referral' | 'appointment';
  targetSection: NavSection;
  targetId?: string;
  read: boolean;
}
