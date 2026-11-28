import {
  EmergencyAlert,
  EmergencyAlertConcernCategory,
  EmergencyAlertUrgency,
} from '../../types';

export interface ConcernCategoryOption {
  id: EmergencyAlertConcernCategory;
  label: { en: string; hi: string; or: string };
  icon: string;
  defaultUrgency: EmergencyAlertUrgency;
  isCriticalDangerSign: boolean;
  suggestedSymptoms: string[];
}

export const CONCERN_CATEGORIES: ConcernCategoryOption[] = [
  {
    id: 'bleeding',
    label: {
      en: 'Vaginal Bleeding / Fluid Leak',
      hi: 'योनि से रक्तस्राव / पानी रिसाव',
      or: 'ରକ୍ତସ୍ରାବ / ଜଳସ୍ରାବ',
    },
    icon: 'emergency',
    defaultUrgency: 'critical',
    isCriticalDangerSign: true,
    suggestedSymptoms: ['Vaginal Bleeding', 'Leaking Fluid', 'Dizziness'],
  },
  {
    id: 'severe_headache_vision',
    label: {
      en: 'Severe Headache / Blurred Vision',
      hi: 'तेज सिरदर्द / धुंधली दृष्टि',
      or: 'ପ୍ରବଳ ମୁଣ୍ଡବିନ୍ଧା / ଝାପସା ଦୃଷ୍ଟି',
    },
    icon: 'visibility',
    defaultUrgency: 'critical',
    isCriticalDangerSign: true,
    suggestedSymptoms: ['Severe Headache', 'Blurred Vision', 'Convulsions / Fits'],
  },
  {
    id: 'high_bp',
    label: {
      en: 'High Blood Pressure',
      hi: 'उच्च रक्तचाप (हाई बीपी)',
      or: 'ଉଚ୍ଚ ରକ୍ତଚାପ (High BP)',
    },
    icon: 'monitor_heart',
    defaultUrgency: 'urgent',
    isCriticalDangerSign: true,
    suggestedSymptoms: ['Elevated Blood Pressure', 'Headache', 'Swelling in Face/Hands'],
  },
  {
    id: 'reduced_fetal_movement',
    label: {
      en: 'Reduced Baby Movement',
      hi: 'शिशु की कम हलचल',
      or: 'ଶିଶୁର କମ୍ ଚଳପ୍ରଚଳ',
    },
    icon: 'child_care',
    defaultUrgency: 'urgent',
    isCriticalDangerSign: true,
    suggestedSymptoms: ['Reduced Fetal Movement', 'No Movement Since Morning'],
  },
  {
    id: 'severe_abdominal_pain',
    label: {
      en: 'Severe Abdominal / Pelvic Pain',
      hi: 'पेट में तेज दर्द',
      or: 'ପେଟରେ ପ୍ରବଳ ଯନ୍ତ୍ରଣା',
    },
    icon: 'sick',
    defaultUrgency: 'critical',
    isCriticalDangerSign: true,
    suggestedSymptoms: ['Severe Abdominal Pain', 'Uterine Tightness', 'Nausea'],
  },
  {
    id: 'high_fever',
    label: {
      en: 'High Fever / Chills',
      hi: 'तेज बुखार / ठंड लगना',
      or: 'ଉଚ୍ଚ ଜ୍ୱର / କମ୍ପ',
    },
    icon: 'device_thermostat',
    defaultUrgency: 'urgent',
    isCriticalDangerSign: false,
    suggestedSymptoms: ['High Fever', 'Chills', 'Weakness'],
  },
  {
    id: 'breathing_difficulty',
    label: {
      en: 'Breathing Difficulty / Chest Pain',
      hi: 'सांस लेने में कठिनाई / सीने में दर्द',
      or: 'ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ / ଛାତି ଯନ୍ତ୍ରଣା',
    },
    icon: 'pulmonology',
    defaultUrgency: 'critical',
    isCriticalDangerSign: true,
    suggestedSymptoms: ['Shortness of Breath', 'Chest Tightness', 'Extreme Fatigue'],
  },
  {
    id: 'labor_contractions',
    label: {
      en: 'Labor Pain / Regular Contractions',
      hi: 'प्रसव पीड़ा / नियमित संकुचन',
      or: 'ପ୍ରସବ ଯନ୍ତ୍ରଣା',
    },
    icon: 'local_hospital',
    defaultUrgency: 'urgent',
    isCriticalDangerSign: true,
    suggestedSymptoms: ['Regular Contractions', 'Lower Back Pain', 'Water Breaking'],
  },
  {
    id: 'swelling',
    label: {
      en: 'Sudden Swelling (Face, Hands, Feet)',
      hi: 'चेहरे, हाथ या पैरों में अचानक सूजन',
      or: 'ମୁହଁ, ହାତ ବା ଗୋଡ଼ରେ ହଠାତ୍ ଫୁଲା',
    },
    icon: 'healing',
    defaultUrgency: 'moderate',
    isCriticalDangerSign: false,
    suggestedSymptoms: ['Facial Swelling', 'Sudden Pedal Edema', 'Weight Gain'],
  },
  {
    id: 'other',
    label: {
      en: 'Other Urgent Maternal Concern',
      hi: 'अन्य स्वास्थ्य चिंता',
      or: 'ଅନ୍ୟ ଜରୁରୀ ସ୍ୱାସ୍ଥ୍ୟ ସମସ୍ୟା',
    },
    icon: 'medical_services',
    defaultUrgency: 'moderate',
    isCriticalDangerSign: false,
    suggestedSymptoms: ['Dizziness', 'Persistent Vomiting', 'General Weakness'],
  },
];

export const SLA_ACK_THRESHOLD_MINUTES: Record<EmergencyAlertUrgency, number> = {
  critical: 5,
  urgent: 15,
  moderate: 30,
};

export function isAlertWaitingAcknowledgement(status: EmergencyAlert['status']): boolean {
  return status === 'new' || status === 'pending_acknowledgement';
}

export function isAlertTerminalStatus(status: EmergencyAlert['status']): boolean {
  return status === 'resolved' || status === 'closed';
}

export function getAlertDelayInfo(alert: EmergencyAlert, nowMs: number = Date.now()) {
  const isWaitingAck =
    isAlertWaitingAcknowledgement(alert.status) && alert.syncStatus !== 'pending_sync';
  const anchorMs = alert.serverCreatedAtMs || alert.createdAtMs || nowMs;
  const elapsedMinutes = Math.max(0, Math.floor((nowMs - anchorMs) / 60000));
  const thresholdMinutes = SLA_ACK_THRESHOLD_MINUTES[alert.urgency] || 15;
  const isDelayed = isWaitingAck && elapsedMinutes >= thresholdMinutes;
  const overdueMinutes = Math.max(0, elapsedMinutes - thresholdMinutes);

  return {
    isWaitingAck,
    elapsedMinutes,
    thresholdMinutes,
    isDelayed,
    overdueMinutes,
  };
}

/**
 * Privacy-safe public notification summary: deliberately excludes mother name,
 * phone number, village/hamlet, and clinical vitals so public push channels
 * cannot leak patient-identifying or clinical data.
 */
export function buildSafeNotificationSummary(alert: EmergencyAlert) {
  return {
    alertId: alert.id,
    targetHospitalId: alert.targetHospitalId,
    targetFacilityType: alert.targetFacilityType,
    concernCategory: alert.concernCategory,
    urgency: alert.urgency,
    status: alert.status,
    createdAtIso: alert.serverCreatedAtIso || alert.createdAtIso,
  };
}
