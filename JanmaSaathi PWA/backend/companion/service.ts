import type { IncomingMessage, Server as HttpServer } from 'http';
import { GoogleGenAI, Modality, ThinkingLevel, Type } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';
import {
  buildCompanionSystemInstruction,
  getBcp47Tag,
  normalizeLanguage,
} from './prompts';
import {
  DEFAULT_MODEL_CONFIG,
  evaluateCompanionModels,
  buildBaselineCapabilities,
} from './modelEvaluator';
import {
  CompanionChatResponse,
  CompanionHistoryEntry,
  CompanionLanguage,
  CompanionModelConfig,
  ModelProbeResult,
  MotherAuthorizedContext,
  UrgencyLevel,
} from './types';

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reply: {
      type: Type.STRING,
      description: 'Warm, natural maternal guidance response strictly in the requested language.',
    },
    detectedInputLanguage: {
      type: Type.STRING,
      enum: ['or', 'hi', 'en'],
      description: 'Language detected from the mother query.',
    },
    urgencyLevel: {
      type: Type.STRING,
      enum: ['none', 'worker_followup', 'emergency'],
      description: 'Safety triage level: emergency for maternal danger signs, worker_followup for mild check-ins, none for general guidance.',
    },
    dangerSignsDetected: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'List of urgent maternal danger signs mentioned (empty array if none).',
    },
    clarificationNeeded: {
      type: Type.BOOLEAN,
      description: 'True if the assistant asked a clarifying follow-up question due to incomplete or ambiguous input.',
    },
    suggestedTimelineSummary: {
      type: Type.STRING,
      description: 'Optional 1-sentence concise summary of this guidance suitable if the mother chooses to save it.',
    },
  },
  required: [
    'reply',
    'detectedInputLanguage',
    'urgencyLevel',
    'dangerSignsDetected',
    'clarificationNeeded',
  ],
};

// Deterministic secondary emergency keyword safety net (additive to Gemini structured classification)
const EMERGENCY_SAFETY_REGEX =
  /\b(heavy bleeding|vaginal bleeding|bleeding|spotting|blurred vision|blurry vision|seeing spots|convulsion|convulsions|seizure|fits|unconscious|fainted|fainting|water broke|water breaking|leaking fluid|amniotic|no baby movement|stopped moving|baby not moving|reduced fetal movement|severe abdominal pain|severe stomach pain|severe headache|high fever|chest pain|difficulty breathing|shortness of breath)\b|रक्तस्राव|खून बह|ब्लीडिंग|तेज सिरदर्द|धुंधला दिख|धुंधली दृष्टि|दौरे|बेहोश|पानी छूट|थैली फट|बच्चे की हलचल बंद|बच्चा नहीं हिल|पेट में तेज दर्द|तेज बुखार|ସଂଜ୍ଞାହୀନ|ରକ୍ତସ୍ରାବ|ରକ୍ତ ପଡ଼ୁଛି|ବ୍ଲିଡିଂ|ପ୍ରବଳ ମୁଣ୍ଡବିନ୍ଧା|ଝାପସା ଦେଖା|ବାତ|ପାଣି ଭାଙ୍ଗି|ଶିଶୁ ଚଳପ୍ରଚଳ ବନ୍ଦ|ଶିଶୁ ହଲଚଲ ହେଉନି|ପ୍ରବଳ ପେଟ ଯନ୍ତ୍ରଣା|ପ୍ରବଳ ଜ୍ୱର/i;

const CHAT_FALLBACK_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
  'gemini-3.1-flash-lite-preview',
];
const TTS_FALLBACK_MODELS = ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts'];

function isTransientApiError(err: unknown): boolean {
  const msg = String((err as any)?.message || err || '').toLowerCase();
  const status = (err as any)?.status || (err as any)?.code;
  return (
    status === 503 ||
    status === 429 ||
    status === 504 ||
    msg.includes('503') ||
    msg.includes('429') ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('resource_exhausted')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} request timed out after ${ms}ms (503)`));
    }, ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export class CompanionAiService {
  private readonly modelConfig: CompanionModelConfig;

  constructor(config: Partial<CompanionModelConfig> = {}) {
    this.modelConfig = { ...DEFAULT_MODEL_CONFIG, ...config };
  }

  public getClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  public getModelConfig(): CompanionModelConfig {
    return { ...this.modelConfig };
  }

  public async getCapabilities(probe = false): Promise<ModelProbeResult> {
    const ai = this.getClient();
    if (!probe) {
      return buildBaselineCapabilities(this.modelConfig, Boolean(ai));
    }
    return evaluateCompanionModels(ai, this.modelConfig, true);
  }

  public async chat(params: {
    message: string;
    language: CompanionLanguage;
    history?: CompanionHistoryEntry[];
    motherContext?: MotherAuthorizedContext;
  }): Promise<CompanionChatResponse> {
    const ai = this.getClient();
    const lang = normalizeLanguage(params.language);
    const cleanMessage = String(params.message || '').trim();
    if (!cleanMessage) {
      throw new Error('Message text is required.');
    }

    if (!ai) {
      const fallbackReplies: Record<string, string> = {
        or: 'ନମସ୍କାର! ଗର୍ଭାବସ୍ଥାରେ ସନ୍ତୁଳିତ ଆହାର ଯଥା ପନିପରିବା, ଫଳ, ପ୍ରୋଟିନ୍ ଏବଂ ପର୍ଯ୍ୟାପ୍ତ ଜଳ ଗ୍ରହଣ କରିବା ଉଚିତ। କୌଣସି ଅସୁବିଧା ହେଲେ ଆପଣଙ୍କ ସ୍ୱାସ୍ଥ୍ୟକର୍ମୀଙ୍କ ସହ ଯୋଗାଯୋଗ କରନ୍ତୁ।',
        hi: 'नमस्ते! गर्भावस्था के दौरान संतुलित आहार जैसे ताजी सब्जियां, फल, प्रोटीन और पर्याप्त पानी लेना चाहिए। किसी भी असुविधा पर अपनी स्वास्थ्य कार्यकर्ता से संपर्क करें।',
        en: 'Namaste! During pregnancy, maintain a balanced diet with fresh vegetables, fruits, protein, and plenty of water. Contact your health worker if you experience any discomfort.',
      };
      return {
        reply: fallbackReplies[lang] || fallbackReplies.en,
        language: lang,
        detectedInputLanguage: lang,
        urgencyLevel: 'none',
        dangerSignsDetected: [],
        clarificationNeeded: false,
        suggestedTimelineSummary: 'Maternal nutrition and health guidance discussion.',
        model: 'gemini-fallback-safe',
      };
    }

    const systemInstruction = buildCompanionSystemInstruction(lang, params.motherContext);
    const safeHistory = Array.isArray(params.history)
      ? params.history
          .slice(-10)
          .filter(
            (m) =>
              m &&
              (m.role === 'user' || m.role === 'assistant') &&
              typeof m.text === 'string' &&
              m.text.trim().length > 0
          )
          .map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.text.trim() }],
          }))
      : [];

    const contents = [
      ...safeHistory,
      { role: 'user', parts: [{ text: cleanMessage }] },
    ];

    const candidateModels = Array.from(
      new Set([this.modelConfig.chatModel, ...CHAT_FALLBACK_MODELS])
    );

    let response: any = null;
    let activeModel = this.modelConfig.chatModel;
    let lastError: unknown = null;

    try {
      for (let i = 0; i < candidateModels.length; i++) {
        const candidate = candidateModels[i];
        const maxAttempts = 1;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            const isGemini38 = candidate.includes('3.8');
            const attemptTimeoutMs = 20000;
            const res = await withTimeout(
              ai.models.generateContent({
                model: candidate,
                contents,
                config: {
                  systemInstruction,
                  ...(isGemini38 ? {} : { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }),
                  responseMimeType: 'application/json',
                  responseSchema: RESPONSE_SCHEMA,
                },
              }),
              attemptTimeoutMs,
              candidate
            );
            const candidateText = res.text?.trim() || '';
            if (i > 0 && lang === 'or' && !/[\u0B00-\u0B7F]/.test(candidateText)) {
              throw new Error(`Fallback model ${candidate} did not produce valid Odia script.`);
            }
            response = res;
            activeModel = candidate;
            break;
          } catch (err) {
            lastError = err;
            if (isTransientApiError(err) || true) {
              await sleep(100);
              break;
            }
          }
        }
        if (response) break;
      }
    } catch (err) {
      lastError = err;
    }

    if (!response) {
      const fallbackReplies: Record<string, string> = {
        or: 'ନମସ୍କାର! ଗର୍ଭାବସ୍ଥାରେ ସନ୍ତୁଳିତ ଆହାର ଯଥା ପନିପରିବା, ଫଳ, ପ୍ରୋଟିନ୍ ଏବଂ ପର୍ଯ୍ୟାପ୍ତ ଜଳ ଗ୍ରହଣ କରିବା ଉଚିତ। କୌଣସି ଅସୁବିଧା ହେଲେ ଆପଣଙ୍କ ସ୍ୱାସ୍ଥ୍ୟକର୍ମୀଙ୍କ ସହ ଯୋଗାଯୋଗ କରନ୍ତୁ।',
        hi: 'नमस्ते! गर्भावस्था के दौरान संतुलित आहार जैसे ताजी सब्जियां, फल, प्रोटीन और पर्याप्त पानी लेना चाहिए। किसी भी असुविधा पर अपनी स्वास्थ्य कार्यकर्ता से संपर्क करें।',
        en: 'Namaste! During pregnancy, maintain a balanced diet with fresh vegetables, fruits, protein, and plenty of water. Contact your health worker if you experience any discomfort.',
      };
      return {
        reply: fallbackReplies[lang] || fallbackReplies.en,
        language: lang,
        detectedInputLanguage: lang,
        urgencyLevel: 'none',
        dangerSignsDetected: [],
        clarificationNeeded: false,
        suggestedTimelineSummary: 'Maternal nutrition and health guidance discussion.',
        model: 'gemini-fallback-safe',
      };
    }

    const rawText = response.text?.trim();
    if (!rawText) {
      throw new Error('Assistant returned an empty response. Please try again.');
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = { reply: rawText };
    }

    const reply = typeof parsed?.reply === 'string' && parsed.reply.trim() ? parsed.reply.trim() : rawText;
    let urgencyLevel: UrgencyLevel =
      parsed?.urgencyLevel === 'emergency' || parsed?.urgencyLevel === 'worker_followup'
        ? parsed.urgencyLevel
        : 'none';
    const dangerSignsDetected: string[] = Array.isArray(parsed?.dangerSignsDetected)
      ? parsed.dangerSignsDetected.filter((s: unknown) => typeof s === 'string' && s.trim().length > 0)
      : [];

    // Additive deterministic emergency trigger check
    if (EMERGENCY_SAFETY_REGEX.test(cleanMessage)) {
      urgencyLevel = 'emergency';
      if (dangerSignsDetected.length === 0) {
        const match = cleanMessage.match(EMERGENCY_SAFETY_REGEX);
        if (match?.[0]) dangerSignsDetected.push(match[0]);
      }
    }

    return {
      reply,
      language: lang,
      detectedInputLanguage: normalizeLanguage(parsed?.detectedInputLanguage || lang),
      urgencyLevel,
      dangerSignsDetected,
      clarificationNeeded: Boolean(parsed?.clarificationNeeded),
      suggestedTimelineSummary:
        typeof parsed?.suggestedTimelineSummary === 'string' && parsed.suggestedTimelineSummary.trim()
          ? parsed.suggestedTimelineSummary.trim()
          : undefined,
      model: activeModel,
    };
  }

  public async transcribeAudio(params: {
    audioBase64: string;
    mimeType?: string;
    language?: CompanionLanguage | 'auto';
    preferredLanguage?: CompanionLanguage;
  }): Promise<{
    transcript: string;
    language: CompanionLanguage;
    detectedLanguage: CompanionLanguage;
    model: string;
  }> {
    const ai = this.getClient();
    if (!ai) {
      throw new Error('Voice transcription service is not configured yet (missing server GEMINI_API_KEY).');
    }

    const rawLang = String(params.language || 'auto').trim().toLowerCase();
    const isAuto = rawLang === 'auto' || !['or', 'hi', 'en'].includes(rawLang);
    const hintLang: CompanionLanguage = normalizeLanguage(
      !isAuto ? rawLang : params.preferredLanguage || 'en'
    );

    const cleanMime =
      typeof params.mimeType === 'string' && params.mimeType.startsWith('audio/')
        ? params.mimeType.split(';')[0]
        : 'audio/webm';

    const audioPart = {
      inlineData: {
        mimeType: cleanMime,
        data: params.audioBase64,
      },
    };

    const detectScriptLanguage = (text: string, fallback: CompanionLanguage): CompanionLanguage => {
      if (/[\u0B00-\u0B7F]/.test(text)) return 'or';
      if (/[\u0900-\u097F]/.test(text)) return 'hi';
      if (/[a-zA-Z]/.test(text)) return 'en';
      return fallback;
    };

    // Guard: Odia phonetics can be confused with Bengali script (\u0980-\u09FF) by generic ASR.
    const containsBengaliScript = (text: string) => /[\u0980-\u09FF]/.test(text);

    // Use fast multimodal gemini-3.1-flash-lite + gemini-4-hydrogen (with Odia Unicode mastery) for 'or' and 'auto',
    // and gemini-3.5-transcribe primary for explicit 'hi' / 'en' (falling back cleanly on 503/429/timeout).
    if (isAuto || hintLang === 'or') {
      const candidateModels = Array.from(
        new Set([
          'gemini-3.1-flash-lite',
          'gemini-3.5-flash-lite',
          'gemini-3.1-flash-lite-preview',
          this.modelConfig.chatModel,
        ])
      );
      const hintLabel =
        hintLang === 'or' ? 'Odia (ଓଡ଼ିଆ)' : hintLang === 'hi' ? 'Hindi (हिन्दी)' : 'Indian English';
      const instruction = isAuto
        ? `Listen to this spoken maternal healthcare message. Automatically identify whether the speaker is speaking Odia, Hindi, or English (user's current app language hint: ${hintLabel}). Transcribe accurately into the spoken language's native script: Odia MUST use Odia Unicode script (ଓଡ଼ିଆ, U+0B00–U+0B7F — NEVER Bengali script), Hindi MUST use Devanagari script (हिन्दी, U+0900–U+097F), and English MUST use standard English. Preserve common medical terms naturally (BP, iron, MCP card, ANC). If there is only silence, background noise, or no intelligible speech, return an empty string for transcript.`
        : `Listen to this spoken maternal healthcare message in Odia. Transcribe it accurately using ONLY authentic Odia Unicode script (ଓଡ଼ିଆ, U+0B00–U+0B7F — NEVER Bengali script!). Preserve any spoken English medical terms like BP, ANC, MCP card naturally. If there is only silence or noise, return an empty string for transcript.`;

      let lastErr: unknown = null;
      for (let i = 0; i < candidateModels.length; i++) {
        const candidate = candidateModels[i];
        try {
          const isGemini38 = candidate.includes('3.8');
          const res = await withTimeout(
            ai.models.generateContent({
              model: candidate,
              contents: {
                parts: [audioPart, { text: instruction }],
              },
              config: {
                ...(isGemini38 ? {} : { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }),
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    transcript: {
                      type: Type.STRING,
                      description: 'Exact transcription in native script, or empty string if silence.',
                    },
                    detectedLanguage: {
                      type: Type.STRING,
                      enum: ['or', 'hi', 'en'],
                      description: 'Detected spoken language: or (Odia), hi (Hindi), or en (English).',
                    },
                  },
                  required: ['transcript', 'detectedLanguage'],
                },
              },
            }),
            8000,
            `stt-${candidate}`
          );

          const rawText = res.text?.trim() || '{}';
          const parsed = JSON.parse(rawText);
          let transcript = String(parsed?.transcript || '').trim();

          if (containsBengaliScript(transcript)) {
            throw new Error(`Model ${candidate} returned Bengali glyphs instead of Odia script.`);
          }

          const detected = detectScriptLanguage(
            transcript,
            normalizeLanguage(parsed?.detectedLanguage || hintLang)
          );

          return {
            transcript,
            language: detected,
            detectedLanguage: detected,
            model: candidate,
          };
        } catch (err) {
          lastErr = err;
          if (isTransientApiError(err)) {
            await sleep(250);
          }
        }
      }

      throw lastErr instanceof Error
        ? lastErr
        : new Error('Unable to transcribe audio right now. Please try again.');
    }

    // Explicit Hindi or English path via gemini-3.5-transcribe with resilient fallback
    const targetLanguageLabel =
      hintLang === 'hi'
        ? 'Hindi (हिन्दी Devanagari script, including any spoken English medical terms naturally)'
        : 'Indian English';

    const transcribeCandidates = Array.from(
      new Set([
        this.modelConfig.transcribeModel,
        'gemini-3.1-flash-lite',
        'gemini-3.5-flash-lite',
        this.modelConfig.chatModel,
      ])
    );

    let lastErr: unknown = null;
    for (const candidate of transcribeCandidates) {
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model: candidate,
            contents: {
              parts: [
                audioPart,
                {
                  text: `Transcribe this spoken maternal health message accurately in ${targetLanguageLabel}. Output only the transcribed words without quotes or commentary. If there is only silence or noise, output an empty string.`,
                },
              ],
            },
          }),
          10000,
          `stt-${candidate}`
        );
        const transcript = response.text?.trim() || '';
        const detected = transcript ? detectScriptLanguage(transcript, hintLang) : hintLang;
        return {
          transcript,
          language: detected,
          detectedLanguage: detected,
          model: candidate,
        };
      } catch (err) {
        lastErr = err;
        if (isTransientApiError(err)) {
          await sleep(500);
          continue;
        }
        throw err;
      }
    }

    throw lastErr instanceof Error
      ? lastErr
      : new Error('Voice transcription service is temporarily unavailable.');
  }

  public async synthesizeSpeech(params: {
    text: string;
    language: CompanionLanguage;
  }): Promise<{ audioBase64: string; mimeType: string; model: string }> {
    const ai = this.getClient();
    const lang = normalizeLanguage(params.language);
    const cleanText = String(params.text || '').trim();
    if (!cleanText) {
      throw new Error('Text is required for speech synthesis.');
    }

    if (!ai) {
      return {
        audioBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
        mimeType: 'audio/wav',
        model: 'gemini-fallback-safe',
      };
    }

    const styleHint =
      lang === 'or'
        ? 'Warm, gentle, caring female healthcare companion speaking clearly in everyday Odia.'
        : lang === 'hi'
        ? 'Warm, gentle, caring female healthcare companion speaking clearly in everyday Hindi.'
        : 'Warm, gentle, caring female healthcare companion speaking clearly in calm Indian English.';

    const ttsCandidates = Array.from(
      new Set([this.modelConfig.ttsModel, ...TTS_FALLBACK_MODELS])
    );

    let response: any = null;
    let activeTtsModel = this.modelConfig.ttsModel;
    let lastError: unknown = null;

    for (let i = 0; i < ttsCandidates.length; i++) {
      const candidate = ttsCandidates[i];
      try {
        response = await withTimeout(
          ai.models.generateContent({
            model: candidate,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: cleanText,
                    speechMetadata: {
                      style: styleHint,
                    } as any,
                  } as any,
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: this.modelConfig.ttsVoiceName },
                },
              },
            },
          }),
          12000,
          `tts-${candidate}`
        );
        activeTtsModel = candidate;
        break;
      } catch (err) {
        lastError = err;
        if (isTransientApiError(err)) {
          await sleep(250);
          continue;
        }
        throw err;
      }
    }

    if (!response) {
      return {
        audioBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
        mimeType: 'audio/wav',
        model: 'gemini-fallback-safe',
      };
    }

    const part = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    const audioData = part?.data;
    if (!audioData) {
      throw new Error('Voice audio could not be generated for this message.');
    }

    return {
      audioBase64: audioData,
      mimeType: part?.mimeType || 'audio/wav',
      model: activeTtsModel,
    };
  }

  public async summarizeConversation(params: {
    messages: CompanionHistoryEntry[];
    language: CompanionLanguage;
    motherContext?: MotherAuthorizedContext;
  }): Promise<{ title: string; summary: string; topic: string; language: CompanionLanguage }> {
    const ai = this.getClient();
    if (!ai) {
      throw new Error('Summarization service is not configured yet (missing server GEMINI_API_KEY).');
    }

    const lang = normalizeLanguage(params.language);
    const transcript = (params.messages || [])
      .slice(-12)
      .filter((m) => m?.text?.trim())
      .map((m) => `${m.role === 'user' ? 'Mother' : 'JanmaSaathi'}: ${m.text.trim()}`)
      .join('\n');

    if (!transcript) {
      throw new Error('No conversation content to summarize.');
    }

    const langLabel =
      lang === 'or' ? 'Odia (ଓଡ଼ିଆ)' : lang === 'hi' ? 'Hindi (हिन्दी)' : 'English';

    const candidateModels = Array.from(
      new Set([this.modelConfig.chatModel, ...CHAT_FALLBACK_MODELS])
    );

    let response: any = null;
    let lastError: unknown = null;

    for (let i = 0; i < candidateModels.length; i++) {
      const candidate = candidateModels[i];
      try {
        const isGemini38 = candidate.includes('3.8');
        const attemptTimeoutMs = i === 0 ? 5500 : 10000;
        response = await withTimeout(
          ai.models.generateContent({
            model: candidate,
            contents: `Summarize this maternal guidance conversation into a short personal timeline note for the mother in ${langLabel}. Do NOT frame it as a clinical diagnosis or doctor record.\n\nConversation:\n${transcript}`,
            config: {
              ...(isGemini38 ? {} : { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }),
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'Short 3-6 word topic title in target language.' },
                  summary: { type: Type.STRING, description: '2-3 sentence friendly guidance summary in target language.' },
                  topic: {
                    type: Type.STRING,
                    enum: ['nutrition', 'baby_growth', 'symptoms', 'appointments', 'postpartum', 'general'],
                  },
                },
                required: ['title', 'summary', 'topic'],
              },
            },
          }),
          attemptTimeoutMs,
          `summarize-${candidate}`
        );
        break;
      } catch (err) {
        lastError = err;
        if (isTransientApiError(err)) {
          await sleep(200);
          continue;
        }
        throw err;
      }
    }

    if (!response) {
      throw lastError instanceof Error
        ? lastError
        : new Error('Unable to summarize conversation right now.');
    }

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return {
      title: String(parsed.title || 'JanmaSaathi Guidance Note').trim(),
      summary: String(parsed.summary || transcript.slice(0, 200)).trim(),
      topic: String(parsed.topic || 'general'),
      language: lang,
    };
  }

  /**
   * Attaches a WebSocket endpoint (/api/companion/live) on the HTTP server
   * without interfering with Vite's own HMR WebSocket upgrade handler.
   */
  public attachLiveWebSocketServer(
    httpServer: HttpServer,
    verifyLiveUpgrade?: (req: IncomingMessage) => {
      ok: boolean;
      statusCode?: number;
      motherId?: string;
      error?: string;
    }
  ): void {
    const wss = new WebSocketServer({ noServer: true });
    const verifiedSessions = new WeakMap<IncomingMessage, { motherId?: string }>();

    httpServer.on('upgrade', (request: IncomingMessage, socket, head) => {
      const reqUrl = request.url || '';
      if (!reqUrl.startsWith('/api/companion/live')) {
        // Leave Vite HMR or other upgrade paths untouched
        return;
      }

      if (verifyLiveUpgrade) {
        const authResult = verifyLiveUpgrade(request);
        if (!authResult.ok) {
          const code = authResult.statusCode === 403 ? 403 : 401;
          const label = code === 403 ? 'Forbidden' : 'Unauthorized';
          socket.write(`HTTP/1.1 ${code} ${label}\r\nConnection: close\r\n\r\n`);
          socket.destroy();
          return;
        }
        verifiedSessions.set(request, { motherId: authResult.motherId });
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    });

    wss.on('connection', async (clientWs: WebSocket, req: IncomingMessage) => {
      const urlObj = new URL(req.url || '/api/companion/live', 'http://localhost');
      const lang = normalizeLanguage(urlObj.searchParams.get('lang'));
      const verifiedSession = verifiedSessions.get(req);

      const ai = this.getClient();
      if (!ai) {
        clientWs.send(
          JSON.stringify({
            type: 'error',
            code: 'NOT_CONFIGURED',
            message: 'GEMINI_API_KEY is not configured on the server.',
          })
        );
        clientWs.close();
        return;
      }

      // Buffer incoming client messages immediately so 'start' sent right on ws.onopen is never dropped
      let liveSession: any = null;
      let closed = false;
      let isReadyForMessages = false;
      const queuedMessages: string[] = [];

      const cleanup = () => {
        closed = true;
        try {
          liveSession?.close?.();
        } catch {
          // ignore
        }
        liveSession = null;
      };

      const processClientMessage = async (rawStr: string) => {
        if (closed) return;
        let msg: any;
        try {
          msg = JSON.parse(rawStr);
        } catch {
          return;
        }

        if (msg.type === 'start') {
          try {
            const incomingCtx = msg.motherContext as MotherAuthorizedContext | undefined;
            if (
              verifiedSession?.motherId &&
              incomingCtx?.motherId &&
              String(incomingCtx.motherId) !== verifiedSession.motherId
            ) {
              clientWs.send(
                JSON.stringify({
                  type: 'error',
                  code: 'FORBIDDEN_CONTEXT',
                  message: 'Unauthorized maternal profile access.',
                })
              );
              clientWs.close(4003, 'Forbidden maternal context');
              return;
            }
            const scopedContext: MotherAuthorizedContext | undefined = verifiedSession?.motherId
              ? { ...(incomingCtx || {}), motherId: verifiedSession.motherId }
              : incomingCtx;

            let turnInputBuffer = '';
            let turnOutputBuffer = '';
            const systemInstruction = buildCompanionSystemInstruction(lang, scopedContext);

            liveSession = await ai.live.connect({
              model: this.modelConfig.liveModel,
              config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: this.modelConfig.ttsVoiceName },
                  },
                },
                systemInstruction,
              },
              callbacks: {
                onopen: () => {
                  if (clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'ready',
                        model: this.modelConfig.liveModel,
                        language: lang,
                      })
                    );
                  }
                },
                onmessage: (serverMsg: any) => {
                  if (clientWs.readyState !== WebSocket.OPEN) return;
                  const sc = serverMsg?.serverContent;
                  if (!sc) return;

                  if (sc.interrupted) {
                    turnOutputBuffer = '';
                    clientWs.send(JSON.stringify({ type: 'interrupted' }));
                  }
                  if (sc.inputTranscription?.text) {
                    turnInputBuffer += sc.inputTranscription.text;
                    clientWs.send(
                      JSON.stringify({
                        type: 'input_transcription',
                        text: sc.inputTranscription.text,
                      })
                    );
                  }
                  if (sc.outputTranscription?.text) {
                    turnOutputBuffer += sc.outputTranscription.text;
                    clientWs.send(
                      JSON.stringify({
                        type: 'output_transcription',
                        text: sc.outputTranscription.text,
                      })
                    );
                  }
                  const parts = sc.modelTurn?.parts;
                  if (Array.isArray(parts)) {
                    for (const part of parts) {
                      if (part?.inlineData?.data) {
                        clientWs.send(
                          JSON.stringify({
                            type: 'audio',
                            data: part.inlineData.data,
                            mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
                          })
                        );
                      }
                    }
                  }
                  if (sc.turnComplete) {
                    const combined = `${turnInputBuffer} ${turnOutputBuffer}`.trim();
                    const match = combined.match(EMERGENCY_SAFETY_REGEX);
                    const emergencyFlag = Boolean(match);
                    clientWs.send(
                      JSON.stringify({
                        type: 'turn_complete',
                        emergencyFlag,
                        urgencyLevel: emergencyFlag ? 'emergency' : 'none',
                        dangerSignsDetected: match?.[0] ? [match[0]] : [],
                      })
                    );
                    turnInputBuffer = '';
                    turnOutputBuffer = '';
                  }
                },
                onerror: (err: any) => {
                  if (clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'error',
                        message: err?.message || 'Live voice session error.',
                      })
                    );
                  }
                },
                onclose: () => {
                  if (clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(JSON.stringify({ type: 'closed' }));
                  }
                },
              },
            });
          } catch (err: any) {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'error',
                  message: err?.message || 'Failed to start Live voice session.',
                })
              );
            }
          }
        } else if (msg.type === 'audio' && liveSession && typeof msg.data === 'string') {
          liveSession.sendRealtimeInput({
            audio: {
              data: msg.data,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        } else if (msg.type === 'text' && liveSession && typeof msg.text === 'string') {
          liveSession.sendClientContent({
            turns: [{ role: 'user', parts: [{ text: msg.text }] }],
            turnComplete: true,
          });
        } else if (msg.type === 'audio_end' && liveSession) {
          liveSession.sendRealtimeInput({ audioStreamEnd: true });
        }
      };

      clientWs.on('close', cleanup);
      clientWs.on('error', cleanup);
      clientWs.on('message', (raw) => {
        const str = raw.toString();
        if (!isReadyForMessages) {
          queuedMessages.push(str);
          return;
        }
        void processClientMessage(str);
      });

      // Check real model support for the requested language — do NOT silently use an incompatible Live model for Odia!
      const capabilities = await evaluateCompanionModels(ai, this.modelConfig, false);
      if (closed) return;
      const langCap = capabilities.languageSupport[lang];
      if (!langCap.liveApiSupported) {
        clientWs.send(
          JSON.stringify({
            type: 'fallback_required',
            language: lang,
            bcp47: getBcp47Tag(lang),
            liveModel: this.modelConfig.liveModel,
            reason: langCap.notes,
            recommendedPipeline: {
              chatModel: langCap.chatModel,
              transcribeModel: langCap.transcribeModel,
              ttsModel: langCap.ttsModel,
            },
          })
        );
        clientWs.close(1000, 'Live API unsupported for requested language');
        return;
      }

      isReadyForMessages = true;
      for (const queued of queuedMessages.splice(0)) {
        await processClientMessage(queued);
      }
    });
  }
}

export const companionAiService = new CompanionAiService();
