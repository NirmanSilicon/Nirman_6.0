export type CompanionLanguage = 'en' | 'hi' | 'or';

export type UrgencyLevel = 'none' | 'worker_followup' | 'emergency';

export interface CompanionHistoryEntry {
  role: 'user' | 'assistant';
  text: string;
}

export interface MotherAuthorizedContext {
  motherId?: string;
  firstName?: string;
  age?: number;
  gestationalAgeWeeks?: number;
  gestationalAgeDays?: number;
  trimester?: 1 | 2 | 3 | string;
  edd?: string;
  lmpDate?: string;
  gravidity?: number;
  parity?: number;
  riskCategory?: string;
  assignedWorkerName?: string;
  village?: string;
  subCentre?: string;
  hydrationGlassesToday?: number | null;
  nextAppointment?: {
    title: string;
    date: string;
    time?: string;
    facility: string;
  } | null;
  recentHealthUpdates?: Array<{
    submittedAt: string;
    observations: string;
    symptoms: string[];
    notes?: string;
    reviewStatus?: string;
    reviewNotes?: string;
  }>;
  latestAssessment?: {
    recordedAt: string;
    gestationalWeek: number;
    systolicBP?: number;
    diastolicBP?: number;
    hemoglobin?: number;
    fetalMovementStatus?: string;
    dangerSigns?: string[];
    nutritionalAdvice?: string;
    symptomsNotes?: string;
  } | null;
  consentedMemories?: Array<{
    createdAt: string;
    summary: string;
    topic?: string;
  }>;
  memoryConsent?: {
    useProfileContext: boolean;
    historyEnabled: boolean;
  };
}

export interface CompanionChatResponse {
  reply: string;
  language: CompanionLanguage;
  detectedInputLanguage: CompanionLanguage;
  urgencyLevel: UrgencyLevel;
  dangerSignsDetected: string[];
  clarificationNeeded: boolean;
  suggestedTimelineSummary?: string;
  model: string;
}

export interface LanguageVoiceSupport {
  language: CompanionLanguage;
  bcp47: string;
  liveApiSupported: boolean;
  pipelineMode: 'gemini-live' | 'modular-voice-pipeline';
  chatModel: string;
  transcribeModel: string;
  ttsModel: string;
  notes: string;
}

export interface ModelProbeResult {
  checkedAt: string;
  apiConfigured: boolean;
  availableModelsCount: number;
  matchedModels: Array<{
    name: string;
    displayName?: string;
    supportedActions?: string[];
  }>;
  liveModelEvaluated: string;
  liveModelAccessible: boolean;
  liveOdiaSupported: boolean | null;
  liveHindiSupported: boolean | null;
  liveEnglishSupported: boolean | null;
  liveEvaluationDetails: string;
  ttsModelEvaluated: string;
  ttsOdiaSupported: boolean | null;
  ttsEvaluationDetails: string;
  transcribeModelEvaluated: string;
  chatModelEvaluated: string;
  chatOdiaSupported: boolean | null;
  languageSupport: Record<CompanionLanguage, LanguageVoiceSupport>;
}

export interface CompanionModelConfig {
  chatModel: string;
  transcribeModel: string;
  ttsModel: string;
  liveModel: string;
  ttsVoiceName: string;
}
