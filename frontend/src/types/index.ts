import type { ClinicalScreeningResult } from '../ml/clinicalScreening';

export type Role = 'mother' | 'worker' | 'supervisor';
export type CanonicalHospitalRole = 'hospital_staff';
export type LegacyHospitalRole = 'hospital' | 'facility';
export type AppUserRole = Role | CanonicalHospitalRole | LegacyHospitalRole;

export interface LocalizedString {
  en?: string;
  hi?: string;
  or?: string;
}

export interface TranslationMetadata {
  originalText?: string;
  sourceLanguage?: 'en' | 'hi' | 'or';
  translations?: LocalizedString;
  translationStatus?: 'reviewed' | 'machine' | 'pending' | 'source';
  translationProvider?: string;
  translatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  email?: string;
  staffId?: string;
  phone: string;
  avatarUrl?: string;
  mcpId?: string;
  assignedWorkerId?: string;
  assignedWorkerName?: string;
  assignedSubCentre?: string;
  village?: string;
  hamlet?: string;
  hospitalId?: string | null;
}

export interface Mother {
  id: string; // e.g. MCP-2025-0894
  name: string;
  age: number;
  gestationalAgeWeeks: number;
  gestationalAgeDays: number;
  edd: string; // e.g. 18 Oct 2025
  trimester: 1 | 2 | 3;
  assignedWorkerId: string;
  assignedWorkerName: string;
  village: string;
  hamlet: string;
  mcpCardNumber: string;
  mcpIssuedDate: string;
  phone: string;
  email: string;
  riskCategory: 'low' | 'medium' | 'high' | 'pending';
  lastVisitDate?: string;
  lastVisitSummary?: string;
  authUid?: string | null;
  hospitalId?: string | null;
  targetHospitalId?: string | null;
  assignedHospitalId?: string | null;
  parity?: number;
  gravidity?: number;
  lmpDate?: string;
  isSynthetic: boolean;
  translations?: {
    lastVisitSummary?: LocalizedString;
    village?: LocalizedString;
    hamlet?: LocalizedString;
  };
}

export interface HealthWorker {
  id: string; // e.g. HW-44120
  staffCode: string;
  name: string;
  role: 'Health Worker' | 'Senior Health Worker';
  assignedSubCentre: string;
  assignedHamlets: string[];
  village: string;
  phone: string;
  supervisorId: string;
  activeMothersCount: number;
  status: 'active' | 'on-leave' | 'unassigned';
  experienceYears: number;
  isSynthetic: boolean;
  authUid?: string | null;
}

export interface Supervisor {
  id: string; // e.g. SUP-2025-012
  name: string;
  designation: string;
  block: string;
  district: string;
  managedSectors: string[];
  isSynthetic: boolean;
}

export interface MLPrediction {
  riskCategory: 'Low' | 'Moderate' | 'High';
  confidenceScore?: number;
  decisionPath: string[];
  contributingFeatures: {
    featureName: string;
    featureKey?: string;
    inputValue: number;
    condition: string;
    threshold: number;
    unit: string;
    impact: 'increases_risk' | 'lowers_risk' | 'neutral';
    deltaHighRisk?: number;
    deltaLowRisk?: number;
    description: string;
    descriptionEn?: string;
    descriptionHi?: string;
    descriptionOr?: string;
  }[];
  featuresContributingToIncreasedRisk?: {
    featureName: string;
    featureKey?: string;
    inputValue: number;
    condition: string;
    threshold: number;
    unit: string;
    impact: 'increases_risk';
    deltaHighRisk?: number;
    description: string;
    descriptionEn?: string;
    descriptionHi?: string;
    descriptionOr?: string;
  }[];
  featuresContributingToDecreasedRisk?: {
    featureName: string;
    featureKey?: string;
    inputValue: number;
    condition: string;
    threshold: number;
    unit: string;
    impact: 'lowers_risk';
    deltaLowRisk?: number;
    description: string;
    descriptionEn?: string;
    descriptionHi?: string;
    descriptionOr?: string;
  }[];
  evaluatedModelFeatures?: {
    featureKey: string;
    featureName: string;
    featureNameHi: string;
    featureNameOr: string;
    recordedValue: number;
    unit: string;
    normalReference: string;
    isEvaluatedInPath: boolean;
    impactOnPrediction: 'increases_risk' | 'lowers_risk' | 'neutral';
  }[];
  summaryExplanation?: {
    en: string;
    hi: string;
    or: string;
  };
  distributionNote?: string;
  modelVersion: string;
  preprocessingVersion: string;
  explanationMethod: string;
  limitationsNote: string;
  leafClassDistribution?: { Low: number; Moderate: number; High: number };
  leafTotalSamples?: number;
  terminalLeafSamples?: number;
}

export interface MaternalAssessment {
  id: string; // e.g. ASM-2026-9042-01
  motherId: string;
  motherName: string;
  workerId: string;
  workerName: string;
  recordedAt: string;
  gestationalWeek: number;
  systolicBP: number;
  diastolicBP: number;
  heartRate: number;
  bloodGlucose: number;
  bodyTemp: number;
  hemoglobin?: number;
  fundalHeight?: number;
  fetalHeartRate?: number;
  fetalMovementStatus: 'normal' | 'reduced' | 'absent';
  dangerSigns: string[];
  symptomsNotes: string;
  nutritionalAdvice: string;

  // Extended fields for Phase 2 ML & Persistence
  originalMeasurements?: {
    age: number;
    systolicBP: number;
    diastolicBP: number;
    bloodSugar: number;
    bloodSugarUnit: string;
    bodyTemp: number;
    bodyTempUnit: string;
    heartRate: number;
  };
  normalizedModelInputs?: {
    age: number;
    systolicBP: number;
    diastolicBP: number;
    bloodSugarMmolL: number;
    bodyTempFahrenheit: number;
    heartRateBpm: number;
  };
  modelPrediction?: MLPrediction;
  featureExplanations?: MLPrediction['contributingFeatures'];
  supplementaryDangerObservations?: {
    haemoglobinGdl: number | null;
    bleeding: boolean;
    swelling: string;
    reducedFetalMovement: boolean;
    clinicalNotes: string;
  };
  modelVersion?: string;
  preprocessingVersion?: string;
  explanationMethod?: string;
  assessedAt?: string;

  mlScreeningResult?: {
    status: 'success' | 'model_unavailable' | 'validation_failed';
    riskCategory?: 'Low' | 'Moderate' | 'High';
    confidenceScore?: number;
    message?: string;
    explanation?: MLPrediction;
  };

  ruleBasedDangerIdentified: boolean;
  ruleBasedAlertDetails: string[];
  clinicalScreeningResult?: ClinicalScreeningResult;
  supervisorReviewStatus: 'pending' | 'signed_off' | 'clarification_requested';
  supervisorNotes?: string;
  hospitalId?: string | null;
  targetHospitalId?: string | null;
  isSynthetic: boolean;
  translations?: {
    symptomsNotes?: LocalizedString;
    nutritionalAdvice?: LocalizedString;
    supervisorNotes?: LocalizedString;
  };
}

export interface HealthUpdate {
  healthUpdateId: string;
  motherId: string;
  motherName: string;
  submittedBy: string;
  assignedHealthWorkerId: string;
  assignedHealthWorkerName: string;
  observations: string;
  symptoms: string[];
  notes: string;
  submittedAt: string;
  reviewStatus: 'pending' | 'reviewed';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  hospitalId?: string | null;
  targetHospitalId?: string | null;
  isSynthetic: boolean;
  translations?: {
    observations?: LocalizedString;
    notes?: LocalizedString;
    reviewNotes?: LocalizedString;
    symptoms?: LocalizedString[];
  };
  sourceLanguage?: 'en' | 'hi' | 'or';
  originalText?: string;
}

export interface Referral {
  id: string; // REF-2025-0041
  motherId: string;
  motherName: string;
  workerId: string;
  workerName: string;
  referredToFacility: string;
  facilityType: 'Sub-Centre' | 'PHC' | 'CHC' | 'District Hospital';
  targetHospitalId?: string | null;
  hospitalId?: string | null;
  reasonForReferral: string;
  priority: 'routine' | 'urgent' | 'emergency';
  transportArranged: boolean;
  accompaniedByWorker: boolean;
  status: 'initiated' | 'acknowledged' | 'in_transit' | 'arrived' | 'completed' | 'clarification_requested';
  supervisorRemarks?: string;
  hospitalRemarks?: string;
  hospitalNotes?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  createdAt: string;
  isSynthetic: boolean;
  translations?: {
    reasonForReferral?: LocalizedString;
    supervisorRemarks?: LocalizedString;
    referredToFacility?: LocalizedString;
  };
  sourceLanguage?: 'en' | 'hi' | 'or';
}

export interface Appointment {
  id: string;
  motherId: string;
  title: string;
  date: string; // e.g. "Thursday, 12 June 2025"
  month: string; // e.g. "JUN"
  day: string; // e.g. "12"
  time: string; // e.g. "10:30 AM"
  facility: string; // e.g. "Sub-Centre Rampur Health Post"
  hospitalId?: string | null;
  targetHospitalId?: string | null;
  notes: string;
  status: 'confirmed' | 'rescheduled' | 'completed';
  translations?: {
    title?: LocalizedString;
    notes?: LocalizedString;
    facility?: LocalizedString;
  };
}

export interface DirectMessage {
  id: string;
  type?: 'text' | 'audio';
  conversationId?: string;
  senderId: string;
  senderName: string;
  senderRole: 'mother' | 'worker';
  senderAuthUid?: string;
  receiverAuthUid?: string;
  text: string;
  timestamp: string;
  sentAtMs?: number;
  delivered: boolean;
  read: boolean;
  uploadStatus?: 'pending_upload' | 'uploaded' | 'failed';
  motherId?: string;
  workerId?: string;
  receiverId?: string;
  recipientId?: string;
  audioStoragePath?: string;
  audioDownloadUrl?: string;
  audioMimeType?: string;
  audioDuration?: number;
  audioFileSize?: number;
  syncStatus?: 'pending_sync' | 'sending' | 'delivered' | 'failed';
  retryCount?: number;
  lastAttemptAt?: string;
  translations?: {
    text?: LocalizedString;
  };
  sourceLanguage?: 'en' | 'hi' | 'or';
  originalText?: string;
}

export interface VillageAllocation {
  id: string;
  villageName: string;
  sector: string;
  subCentre: string;
  assignedWorkerId: string | null;
  assignedWorkerName: string | null;
  totalMothers: number;
  allocatedMothers: number;
}

export interface CompanionMemory {
  id: string;
  motherId: string;
  authUid?: string | null;
  title: string;
  summary: string;
  topic: 'nutrition' | 'baby_growth' | 'symptoms' | 'appointments' | 'postpartum' | 'general';
  language: 'en' | 'hi' | 'or';
  gestationalWeek: number;
  consentedByMother: true;
  consentedAt: string;
  savedAt: string;
  sourceType: 'ai_companion_summary';
  isClinicalRecord: false;
}

export interface CompanionMemorySettings {
  historyEnabled: boolean;
  useProfileContext: boolean;
  allowTimelineSavePrompt: boolean;
}

export type EmergencyAlertConcernCategory =
  | 'bleeding'
  | 'severe_headache_vision'
  | 'high_bp'
  | 'reduced_fetal_movement'
  | 'severe_abdominal_pain'
  | 'high_fever'
  | 'swelling'
  | 'breathing_difficulty'
  | 'labor_contractions'
  | 'other';

export type EmergencyAlertUrgency = 'moderate' | 'urgent' | 'critical';

export type EmergencyAlertStatus =
  | 'new'
  | 'pending_acknowledgement'
  | 'acknowledged'
  | 'in_progress'
  | 'action_taken'
  | 'referred'
  | 'escalated'
  | 'resolved'
  | 'closed';

export interface HospitalFacility {
  id: string;
  name: string;
  facilityType: 'PHC' | 'CHC' | 'District Hospital';
  block: string;
  district: string;
  contactPhone: string;
  acceptsEmergency: boolean;
  translations?: {
    name?: LocalizedString;
  };
}

export interface EmergencyAlertVitals {
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  bodyTemp?: number;
  bloodGlucose?: number;
  hemoglobin?: number;
  fetalHeartRate?: number;
  fetalMovementStatus?: 'normal' | 'reduced' | 'absent';
}

export interface EmergencyAlertUpdateEntry {
  id: string;
  timestampIso: string;
  timestampLabel: string;
  actorName: string;
  actorRole: 'hospital' | 'supervisor' | 'worker' | 'mother';
  status: string;
  note: string;
}

export interface EmergencyAlert {
  id: string;
  motherId: string;
  motherName: string;
  motherPhone?: string;
  motherAge?: number;
  gestationalAgeWeeks?: number;
  village?: string;
  hamlet?: string;
  assignedWorkerId: string;
  assignedWorkerName: string;
  supervisorId?: string;
  raisedByRole: 'mother' | 'worker' | 'supervisor';
  raisedById: string;
  raisedByName: string;
  raisedByAuthUid?: string | null;
  targetHospitalId: string;
  targetHospitalName: string;
  targetFacilityType: 'PHC' | 'CHC' | 'District Hospital';
  concernCategory: EmergencyAlertConcernCategory;
  concernLabel: string;
  urgency: EmergencyAlertUrgency;
  symptoms: string[];
  description: string;
  additionalHealthInfo?: string;
  attachedAssessmentId?: string;
  attachedAssessmentSummary?: string;
  vitals?: EmergencyAlertVitals;
  dangerSigns?: string[];
  transportRequested?: boolean;
  status: EmergencyAlertStatus;
  createdAtMs: number;
  createdAtIso: string;
  createdAtLabel: string;
  updatedAtMs: number;
  provenanceVerifiedByServer?: boolean;
  serverCreatedAtMs?: number;
  serverCreatedAtIso?: string;
  serverProvenanceId?: string;
  acknowledgedAtMs?: number | null;
  acknowledgedBy?: string | null;
  hospitalResponse?: string | null;
  hospitalUpdates: EmergencyAlertUpdateEntry[];
  escalated: boolean;
  escalatedAtMs?: number | null;
  escalatedBy?: string | null;
  escalationReason?: string | null;
  escalationTargetHospitalId?: string | null;
  escalationTargetHospitalName?: string | null;
  actionTakenSummary?: string | null;
  referredFacilityName?: string | null;
  resolvedAtMs?: number | null;
  resolvedBy?: string | null;
  resolutionNotes?: string | null;
  closedAtMs?: number | null;
  closedBy?: string | null;
  syncStatus?: 'pending_sync' | 'synced' | 'sync_error';
  isSynthetic: boolean;
  translations?: {
    concernLabel?: LocalizedString;
    description?: LocalizedString;
    hospitalResponse?: LocalizedString;
    targetHospitalName?: LocalizedString;
  };
}

export type FcmTokenRole =
  | 'mother'
  | 'worker'
  | 'supervisor'
  | 'hospital_staff'
  | 'hospital'
  | 'facility';

export interface FcmDeviceTokenRecord {
  id: string;
  token: string;
  uid: string;
  role: FcmTokenRole;
  motherId?: string | null;
  staffId?: string | null;
  hospitalId?: string | null;
  platform: 'web';
  browser?: string;
  enabled: boolean;
  authMode: 'firebase' | 'session';
  createdAtMs: number;
  updatedAtMs: number;
  lastActiveAtMs: number;
}

export type AlertNotificationEventType =
  | 'alert_created'
  | 'status_updated'
  | 'escalated'
  | 'resolved';

export interface AlertNotificationItem {
  id: string;
  alertId: string;
  eventType: AlertNotificationEventType;
  title: string;
  body: string;
  urgency: EmergencyAlertUrgency;
  status: EmergencyAlertStatus;
  targetHospitalId: string;
  createdAtMs: number;
  read: boolean;
  silenced: boolean;
  soundPlayed: boolean;
}

export interface NotificationPreferences {
  soundEnabled: boolean;
  repeatUrgentChime: boolean;
  vibrationEnabled: boolean;
  pushEnabled: boolean;
}

