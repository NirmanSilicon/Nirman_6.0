import { Language } from '../i18n/translations';

export type UrgencyLevel = 'none' | 'worker_followup' | 'emergency';

export interface CompanionHistoryItem {
  role: 'user' | 'assistant';
  text: string;
}

export interface CompanionRetryPayload {
  text: string;
  viaVoice: boolean;
  language: Language;
}

export interface CompanionMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  language: Language;
  timestamp: string;
  viaVoice?: boolean;
  isError?: boolean;
  urgencyLevel?: UrgencyLevel;
  dangerSignsDetected?: string[];
  clarificationNeeded?: boolean;
  suggestedTimelineSummary?: string;
  model?: string;
  mode?: 'live' | 'pipeline';
  retryPayload?: CompanionRetryPayload;
}

export interface MotherCompanionContext {
  motherId?: string;
  firstName?: string;
  age?: number;
  gestationalAgeWeeks?: number;
  gestationalAgeDays?: number;
  trimester?: 1 | 2 | 3 | string;
  edd?: string;
  gravidity?: number;
  parity?: number;
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

export interface LanguageCapability {
  language: Language;
  bcp47: string;
  liveApiSupported: boolean;
  pipelineMode: 'gemini-live' | 'modular-voice-pipeline';
  chatModel: string;
  transcribeModel: string;
  ttsModel: string;
  notes: string;
}

export interface CompanionCapabilities {
  apiConfigured: boolean;
  liveModelEvaluated: string;
  liveModelAccessible: boolean;
  liveOdiaSupported: boolean | null;
  liveHindiSupported: boolean | null;
  liveEnglishSupported: boolean | null;
  ttsOdiaSupported: boolean | null;
  chatModelEvaluated: string;
  transcribeModelEvaluated: string;
  ttsModelEvaluated: string;
  languageSupport: Record<Language, LanguageCapability>;
}

const SESSION_TOKEN_STORAGE_KEY = 'janmasaathi_session_token_v1';

function readStoredSessionToken(): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
    return raw && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

let inMemorySessionToken: string | null = readStoredSessionToken();

export function setCompanionSessionToken(token: string | null): void {
  const clean = token && token.trim() ? token.trim() : null;
  inMemorySessionToken = clean;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (clean) {
        window.localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, clean);
      } else {
        window.localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
      }
    }
  } catch {
    // ignore storage errors
  }
}

export function getCompanionSessionToken(): string | null {
  if (!inMemorySessionToken) {
    inMemorySessionToken = readStoredSessionToken();
  }
  return inMemorySessionToken;
}

async function tryRefreshSessionToken(): Promise<string | null> {
  // 1. If Firebase Auth user is signed in, exchange fresh ID token
  try {
    const { auth } = await import('../lib/firebase');
    if (typeof auth.authStateReady === 'function') {
      await Promise.race([
        auth.authStateReady(),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]).catch(() => {});
    }
    if (auth.currentUser) {
      const idToken = await auth.currentUser.getIdToken(true);
      let cachedRole: string | undefined;
      try {
        const rawUser = window.localStorage.getItem('janmasaathi_auth_session_v3');
        cachedRole = rawUser ? JSON.parse(rawUser)?.role : undefined;
      } catch {
        // ignore
      }
      const res = await fetch('/api/auth/firebase-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, role: cachedRole || 'mother' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.token) {
        setCompanionSessionToken(data.token);
        return data.token;
      }
    }
  } catch {
    // ignore
  }

  // 2. Otherwise try sliding refresh on existing server token
  const existing = getCompanionSessionToken();
  if (existing) {
    try {
      const res = await fetch('/api/auth/verify-session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${existing}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.token) {
        setCompanionSessionToken(data.token);
        return data.token;
      }
    } catch {
      // ignore
    }
  }
  return getCompanionSessionToken();
}

export async function ensureSessionToken(): Promise<string | null> {
  const existing = getCompanionSessionToken();
  if (existing) return existing;
  return tryRefreshSessionToken();
}

function buildAuthHeaders(
  extra?: Record<string, string>,
  tokenOverride?: string | null
): Record<string, string> {
  const headers: Record<string, string> = { ...(extra || {}) };
  const token = tokenOverride ?? getCompanionSessionToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function authorizedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  let token = await ensureSessionToken();
  const baseHeaders = (init.headers as Record<string, string>) || {};
  let response = await fetch(url, {
    ...init,
    headers: buildAuthHeaders(baseHeaders, token),
  });

  if (response.status === 401) {
    const refreshed = await tryRefreshSessionToken();
    if (refreshed && refreshed !== token) {
      response = await fetch(url, {
        ...init,
        headers: buildAuthHeaders(baseHeaders, refreshed),
      });
    }
  }
  return response;
}

export async function fetchCompanionCapabilities(probe = false): Promise<CompanionCapabilities> {
  const url = probe ? '/api/companion/capabilities?probe=1' : '/api/companion/capabilities';
  const response = await authorizedFetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success) {
    throw new Error(data?.error || 'Unable to check AI companion capabilities.');
  }
  return data as CompanionCapabilities;
}

export async function sendCompanionMessage(params: {
  message: string;
  language: Language;
  history: CompanionHistoryItem[];
  motherContext: MotherCompanionContext;
}): Promise<{
  reply: string;
  language: Language;
  detectedInputLanguage: Language;
  urgencyLevel: UrgencyLevel;
  dangerSignsDetected: string[];
  clarificationNeeded: boolean;
  suggestedTimelineSummary?: string;
  model?: string;
}> {
  const response = await authorizedFetch('/api/companion/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success || !data?.reply) {
    throw new Error(
      data?.error || 'Unable to reach JanmaSaathi right now. Please try again.'
    );
  }

  return {
    reply: String(data.reply),
    language: (data.language as Language) || params.language,
    detectedInputLanguage: (data.detectedInputLanguage as Language) || params.language,
    urgencyLevel: (data.urgencyLevel as UrgencyLevel) || 'none',
    dangerSignsDetected: Array.isArray(data.dangerSignsDetected) ? data.dangerSignsDetected : [],
    clarificationNeeded: Boolean(data.clarificationNeeded),
    suggestedTimelineSummary:
      typeof data.suggestedTimelineSummary === 'string' ? data.suggestedTimelineSummary : undefined,
    model: typeof data.model === 'string' ? data.model : undefined,
  };
}

export async function transcribeCompanionAudio(params: {
  audioBase64: string;
  mimeType: string;
  language: Language;
}): Promise<string> {
  const response = await authorizedFetch('/api/companion/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success) {
    throw new Error(data?.error || 'Could not transcribe voice message.');
  }

  return String(data.transcript || '').trim();
}

export async function synthesizeCompanionSpeech(params: {
  text: string;
  language: Language;
}): Promise<{ audioBase64: string; mimeType: string }> {
  const response = await authorizedFetch('/api/companion/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success || !data?.audioBase64) {
    throw new Error(data?.error || 'Voice playback is unavailable right now.');
  }

  return {
    audioBase64: String(data.audioBase64),
    mimeType: String(data.mimeType || 'audio/wav'),
  };
}

export async function summarizeCompanionConversation(params: {
  messages: CompanionHistoryItem[];
  language: Language;
  motherContext: MotherCompanionContext;
}): Promise<{
  title: string;
  summary: string;
  topic: 'nutrition' | 'baby_growth' | 'symptoms' | 'appointments' | 'postpartum' | 'general';
  language: Language;
}> {
  const response = await authorizedFetch('/api/companion/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success || !data?.summary) {
    throw new Error(data?.error || 'Could not summarize this conversation right now.');
  }

  return {
    title: String(data.title || 'JanmaSaathi Guidance Note'),
    summary: String(data.summary),
    topic: data.topic || 'general',
    language: (data.language as Language) || params.language,
  };
}

// ============================================================
// Real-Time Gemini Live API WebSocket Voice Client (16kHz -> 24kHz PCM)
// ============================================================

export interface LiveVoiceCallbacks {
  onReady: (model: string) => void;
  onInputTranscription: (chunk: string) => void;
  onOutputTranscription: (chunk: string) => void;
  onSpeakingChange: (speaking: boolean) => void;
  onInterrupted: () => void;
  onTurnComplete: (info: { urgencyLevel: UrgencyLevel; dangerSignsDetected: string[] }) => void;
  onFallbackRequired: (reason: string) => void;
  onError: (message: string) => void;
  onClose: () => void;
}

function downsampleTo16kPcmBase64(float32Input: Float32Array, inputSampleRate: number): string {
  const targetRate = 16000;
  const ratio = inputSampleRate / targetRate;
  const outLength = Math.max(1, Math.floor(float32Input.length / ratio));
  const pcm16 = new Int16Array(outLength);

  for (let i = 0; i < outLength; i++) {
    const srcIndex = Math.min(float32Input.length - 1, Math.floor(i * ratio));
    const clamped = Math.max(-1, Math.min(1, float32Input[srcIndex]));
    pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  const bytes = new Uint8Array(pcm16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64Pcm24kToFloat32(base64Data: string): Float32Array {
  const binary = atob(base64Data);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer);
  const samples = Math.floor(len / 2);
  const float32 = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768;
  }
  return float32;
}

export class CompanionLiveVoiceClient {
  private ws: WebSocket | null = null;
  private captureCtx: AudioContext | null = null;
  private playbackCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private activeSources: AudioBufferSourceNode[] = [];
  private nextPlaybackTime = 0;
  private speakerEnabled = true;
  private isClosed = false;

  constructor(private readonly callbacks: LiveVoiceCallbacks) {}

  public setSpeakerEnabled(enabled: boolean) {
    this.speakerEnabled = enabled;
    if (!enabled) {
      this.interruptPlayback();
    }
  }

  public interruptPlayback() {
    for (const src of this.activeSources) {
      try {
        src.stop();
      } catch {
        // ignore
      }
    }
    this.activeSources = [];
    if (this.playbackCtx) {
      this.nextPlaybackTime = this.playbackCtx.currentTime;
    }
    this.callbacks.onSpeakingChange(false);
  }

  private scheduleAudioChunk(base64Data: string) {
    if (!this.speakerEnabled) return;
    if (!this.playbackCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.playbackCtx = new AudioCtx({ sampleRate: 24000 });
      this.nextPlaybackTime = this.playbackCtx.currentTime;
    }
    if (this.playbackCtx.state === 'suspended') {
      this.playbackCtx.resume().catch(() => {});
    }

    const float32 = base64Pcm24kToFloat32(base64Data);
    if (float32.length === 0) return;

    const buffer = this.playbackCtx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = this.playbackCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.playbackCtx.destination);

    const now = this.playbackCtx.currentTime;
    const startAt = Math.max(now + 0.02, this.nextPlaybackTime);
    this.nextPlaybackTime = startAt + buffer.duration;

    this.activeSources.push(source);
    this.callbacks.onSpeakingChange(true);

    source.onended = () => {
      this.activeSources = this.activeSources.filter((s) => s !== source);
      if (this.activeSources.length === 0) {
        this.callbacks.onSpeakingChange(false);
      }
    };

    source.start(startAt);
  }

  public async connect(params: {
    language: Language;
    motherContext: MotherCompanionContext;
    speakerEnabled: boolean;
  }): Promise<void> {
    this.speakerEnabled = params.speakerEnabled;

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone access is unavailable in this browser.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    this.mediaStream = stream;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const tokenQuery = inMemorySessionToken
      ? `&token=${encodeURIComponent(inMemorySessionToken)}`
      : '';
    const wsUrl = `${protocol}//${window.location.host}/api/companion/live?lang=${encodeURIComponent(
      params.language
    )}${tokenQuery}`;

    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.onopen = () => {
      if (this.isClosed) return;
      ws.send(
        JSON.stringify({
          type: 'start',
          motherContext: params.motherContext,
        })
      );
      this.startMicStreaming();
    };

    ws.onmessage = (event) => {
      if (this.isClosed) return;
      let msg: any;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.type === 'ready') {
        this.callbacks.onReady(String(msg.model || 'gemini-3.8-live'));
      } else if (msg.type === 'input_transcription' && msg.text) {
        this.callbacks.onInputTranscription(String(msg.text));
      } else if (msg.type === 'output_transcription' && msg.text) {
        this.callbacks.onOutputTranscription(String(msg.text));
      } else if (msg.type === 'audio' && msg.data) {
        this.scheduleAudioChunk(String(msg.data));
      } else if (msg.type === 'interrupted') {
        this.interruptPlayback();
        this.callbacks.onInterrupted();
      } else if (msg.type === 'turn_complete') {
        this.callbacks.onTurnComplete({
          urgencyLevel: (msg.urgencyLevel as UrgencyLevel) || 'none',
          dangerSignsDetected: Array.isArray(msg.dangerSignsDetected) ? msg.dangerSignsDetected : [],
        });
      } else if (msg.type === 'fallback_required') {
        this.disconnect();
        this.callbacks.onFallbackRequired(String(msg.reason || 'Live API unavailable for this language.'));
      } else if (msg.type === 'error') {
        this.callbacks.onError(String(msg.message || 'Live voice session encountered an error.'));
      } else if (msg.type === 'closed') {
        this.disconnect();
      }
    };

    ws.onerror = () => {
      if (!this.isClosed) {
        this.disconnect();
        this.callbacks.onFallbackRequired('Could not establish real-time voice socket.');
      }
    };

    ws.onclose = () => {
      if (!this.isClosed) {
        this.disconnect();
      }
    };
  }

  private startMicStreaming() {
    if (!this.mediaStream || !this.ws) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    this.captureCtx = ctx;

    const source = ctx.createMediaStreamSource(this.mediaStream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    this.processor = processor;

    processor.onaudioprocess = (event) => {
      if (this.isClosed || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      const inputData = event.inputBuffer.getChannelData(0);
      const base64Pcm = downsampleTo16kPcmBase64(inputData, ctx.sampleRate);
      this.ws.send(JSON.stringify({ type: 'audio', data: base64Pcm }));
    };

    source.connect(processor);
    processor.connect(ctx.destination);
  }

  public disconnect() {
    if (this.isClosed) return;
    this.isClosed = true;
    this.interruptPlayback();

    try {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'audio_end' }));
      }
      this.ws?.close();
    } catch {
      // ignore
    }
    this.ws = null;

    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch {
        // ignore
      }
      this.processor = null;
    }

    if (this.captureCtx) {
      this.captureCtx.close().catch(() => {});
      this.captureCtx = null;
    }

    if (this.playbackCtx) {
      this.playbackCtx.close().catch(() => {});
      this.playbackCtx = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    this.callbacks.onClose();
  }
}
