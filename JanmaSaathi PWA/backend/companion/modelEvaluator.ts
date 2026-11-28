import { GoogleGenAI, Modality, ThinkingLevel } from '@google/genai';
import {
  CompanionLanguage,
  CompanionModelConfig,
  LanguageVoiceSupport,
  ModelProbeResult,
} from './types';

export const DEFAULT_MODEL_CONFIG: CompanionModelConfig = {
  chatModel: process.env.JANMASAATHI_CHAT_MODEL?.trim() || 'gemini-4-hydrogen',
  transcribeModel: process.env.JANMASAATHI_TRANSCRIBE_MODEL?.trim() || 'gemini-3.5-transcribe',
  ttsModel: process.env.JANMASAATHI_TTS_MODEL?.trim() || 'gemini-3.8-flash-lite-tts',
  liveModel: process.env.JANMASAATHI_LIVE_MODEL?.trim() || 'gemini-3.8-live',
  ttsVoiceName: process.env.JANMASAATHI_TTS_VOICE?.trim() || 'Kore',
};

let cachedProbe: { timestamp: number; result: ModelProbeResult } | null = null;
const PROBE_TTL_MS = 10 * 60 * 1000;

function hasNonAsciiScript(text: string, script: 'odia' | 'hindi'): boolean {
  if (!text) return false;
  if (script === 'odia') {
    return /[\u0B00-\u0B7F]/.test(text);
  }
  return /[\u0900-\u097F]/.test(text);
}

async function testLiveModelLanguage(
  ai: GoogleGenAI,
  model: string,
  promptText: string,
  instruction: string,
  expectedScript?: 'odia' | 'hindi'
): Promise<{ ok: boolean; transcript: string; audioChunks: number; error?: string }> {
  return new Promise((resolve) => {
    let settled = false;
    let transcript = '';
    let audioChunks = 0;
    let sessionRef: any = null;

    const finish = (res: { ok: boolean; transcript: string; audioChunks: number; error?: string }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        sessionRef?.close?.();
      } catch {
        // ignore
      }
      resolve(res);
    };

    const timer = setTimeout(() => {
      finish({
        ok: audioChunks > 0 && (!expectedScript || hasNonAsciiScript(transcript, expectedScript)),
        transcript: transcript.trim(),
        audioChunks,
        error: audioChunks === 0 ? 'Live API timed out before audio response' : undefined,
      });
    }, 10000);

    ai.live
      .connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: instruction,
        },
        callbacks: {
          onmessage: (msg: any) => {
            const sc = msg?.serverContent;
            if (sc?.outputTranscription?.text) {
              transcript += sc.outputTranscription.text;
            }
            const parts = sc?.modelTurn?.parts;
            if (Array.isArray(parts)) {
              for (const p of parts) {
                if (p?.inlineData?.data) audioChunks += 1;
                if (p?.text && !transcript) transcript += p.text;
              }
            }
            if (sc?.turnComplete) {
              const trimmed = transcript.trim();
              const scriptMatches = !expectedScript || hasNonAsciiScript(trimmed, expectedScript);
              finish({
                ok: audioChunks > 0 && scriptMatches,
                transcript: trimmed,
                audioChunks,
                error: !scriptMatches
                  ? `Model responded without expected ${expectedScript} script (${trimmed.slice(0, 80)})`
                  : undefined,
              });
            }
          },
          onerror: (err: any) => {
            finish({
              ok: false,
              transcript: transcript.trim(),
              audioChunks,
              error: err?.message || 'Live WebSocket error',
            });
          },
          onclose: (ev: any) => {
            if (!settled) {
              finish({
                ok: false,
                transcript: transcript.trim(),
                audioChunks,
                error: ev?.reason || `Live connection closed (${ev?.code || 'unknown'})`,
              });
            }
          },
        },
      })
      .then((session) => {
        sessionRef = session;
        if (settled) {
          try {
            session.close();
          } catch {
            // ignore
          }
          return;
        }
        session.sendClientContent({
          turns: [{ role: 'user', parts: [{ text: promptText }] }],
          turnComplete: true,
        });
      })
      .catch((err: any) => {
        finish({
          ok: false,
          transcript: '',
          audioChunks: 0,
          error: err?.message || 'Failed to connect to Live API',
        });
      });
  });
}

export function buildBaselineCapabilities(
  config: CompanionModelConfig = DEFAULT_MODEL_CONFIG,
  apiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim())
): ModelProbeResult {
  const languageSupport: Record<CompanionLanguage, LanguageVoiceSupport> = {
    or: {
      language: 'or',
      bcp47: 'or-IN',
      liveApiSupported: false,
      pipelineMode: 'modular-voice-pipeline',
      chatModel: config.chatModel,
      transcribeModel: config.transcribeModel,
      ttsModel: config.ttsModel,
      notes: 'Pending live model verification; using verified Odia voice transcription + chat + TTS pipeline.',
    },
    hi: {
      language: 'hi',
      bcp47: 'hi-IN',
      liveApiSupported: false,
      pipelineMode: 'modular-voice-pipeline',
      chatModel: config.chatModel,
      transcribeModel: config.transcribeModel,
      ttsModel: config.ttsModel,
      notes: 'Pending live model verification.',
    },
    en: {
      language: 'en',
      bcp47: 'en-IN',
      liveApiSupported: false,
      pipelineMode: 'modular-voice-pipeline',
      chatModel: config.chatModel,
      transcribeModel: config.transcribeModel,
      ttsModel: config.ttsModel,
      notes: 'Pending live model verification.',
    },
  };

  return {
    checkedAt: new Date().toISOString(),
    apiConfigured,
    availableModelsCount: 0,
    matchedModels: [],
    liveModelEvaluated: config.liveModel,
    liveModelAccessible: false,
    liveOdiaSupported: null,
    liveHindiSupported: null,
    liveEnglishSupported: null,
    liveEvaluationDetails: apiConfigured
      ? 'Not yet probed during this server session.'
      : 'GEMINI_API_KEY is not configured in the server environment.',
    ttsModelEvaluated: config.ttsModel,
    ttsOdiaSupported: null,
    ttsEvaluationDetails: 'Not yet probed.',
    transcribeModelEvaluated: config.transcribeModel,
    chatModelEvaluated: config.chatModel,
    chatOdiaSupported: null,
    languageSupport,
  };
}

export async function evaluateCompanionModels(
  ai: GoogleGenAI | null,
  config: CompanionModelConfig = DEFAULT_MODEL_CONFIG,
  forceRefresh = false
): Promise<ModelProbeResult> {
  if (!ai) {
    return buildBaselineCapabilities(config, false);
  }

  if (!forceRefresh && cachedProbe && Date.now() - cachedProbe.timestamp < PROBE_TTL_MS) {
    return cachedProbe.result;
  }

  const result = buildBaselineCapabilities(config, true);
  result.checkedAt = new Date().toISOString();

  // 1. Enumerate available models on the configured project
  try {
    const pager = await ai.models.list();
    const matched: ModelProbeResult['matchedModels'] = [];
    let total = 0;
    for await (const m of pager) {
      total += 1;
      const name = m.name || '';
      if (
        name.includes('live') ||
        name.includes('hydrogen') ||
        name.includes('transcribe') ||
        name.includes('tts') ||
        name.includes('3.') ||
        name.includes('4')
      ) {
        matched.push({
          name,
          displayName: m.displayName,
          supportedActions: m.supportedActions,
        });
      }
    }
    result.availableModelsCount = total;
    result.matchedModels = matched;
  } catch (err: any) {
    result.liveEvaluationDetails = `models.list failed: ${err?.message || err}`;
  }

  // 2. Evaluate gemini-4-hydrogen Odia script quality
  try {
    const isGemini38 = config.chatModel.includes('3.8');
    const chatRes = await ai.models.generateContent({
      model: config.chatModel,
      contents: 'ଗର୍ଭାବସ୍ଥାର ୨୪ ସପ୍ତାହରେ କେଉଁ ଖାଦ୍ୟ ଭଲ? ଗୋଟିଏ ଛୋଟ ବାକ୍ୟରେ କୁହନ୍ତୁ।',
      config: {
        systemInstruction: 'Reply briefly in natural Odia script (ଓଡ଼ିଆ) only.',
        ...(isGemini38 ? {} : { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }),
      },
    });
    const text = chatRes.text?.trim() || '';
    result.chatOdiaSupported = hasNonAsciiScript(text, 'odia');
  } catch {
    result.chatOdiaSupported = false;
  }

  // 3. Evaluate gemini-3.8-flash-lite-tts with Odia text
  try {
    const ttsRes = await ai.models.generateContent({
      model: config.ttsModel,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'ନମସ୍କାର ପ୍ରିୟା, ପ୍ରତିଦିନ ସବୁଜ ପନିପରିବା ଏବଂ ଡାଲି ଖାଆନ୍ତୁ।',
              speechMetadata: { style: 'Warm female healthcare guide speaking clearly in Odia.' } as any,
            } as any,
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: config.ttsVoiceName } },
        },
      },
    });
    const inline = ttsRes.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    const ok = Boolean(inline?.data && inline.data.length > 500);
    result.ttsOdiaSupported = ok;
    result.ttsEvaluationDetails = ok
      ? `${config.ttsModel} generated ${inline?.mimeType || 'audio/wav'} (${inline?.data?.length || 0} base64 chars) for Odia.`
      : `${config.ttsModel} returned empty audio for Odia.`;
  } catch (err: any) {
    result.ttsOdiaSupported = false;
    result.ttsEvaluationDetails = `${config.ttsModel} Odia TTS error: ${err?.message || err}`;
  }

  // 4. Evaluate gemini-3.8-live (English, Hindi, Odia) in parallel
  const [enProbe, hiProbe, orProbe] = await Promise.all([
    testLiveModelLanguage(
      ai,
      config.liveModel,
      'Hello, I am 24 weeks pregnant. Say one brief warm sentence.',
      'You are JanmaSaathi, a brief warm pregnancy companion.'
    ),
    testLiveModelLanguage(
      ai,
      config.liveModel,
      'नमस्ते, मैं 24 सप्ताह की गर्भवती हूँ। एक छोटे वाक्य में उत्तर दें।',
      'You are JanmaSaathi. Always reply strictly in Devanagari Hindi.',
      'hindi'
    ),
    testLiveModelLanguage(
      ai,
      config.liveModel,
      'ନମସ୍କାର, ମୁଁ ୨୪ ସପ୍ତାହର ଗର୍ଭବତୀ। ଗୋଟିଏ ଛୋଟ ବାକ୍ୟରେ ଓଡ଼ିଆରେ ଉତ୍ତର ଦିଅନ୍ତୁ।',
      'You are JanmaSaathi. Always reply strictly in natural Odia script (ଓଡ଼ିଆ).',
      'odia'
    ),
  ]);

  result.liveModelAccessible = enProbe.ok || hiProbe.ok || orProbe.ok;
  result.liveEnglishSupported = enProbe.ok;
  result.liveHindiSupported = hiProbe.ok;
  result.liveOdiaSupported = orProbe.ok;
  result.liveEvaluationDetails = [
    `en: ${enProbe.ok ? `OK (${enProbe.audioChunks} chunks)` : enProbe.error || 'failed'}`,
    `hi: ${hiProbe.ok ? `OK (${hiProbe.audioChunks} chunks)` : hiProbe.error || 'failed'}`,
    `or: ${orProbe.ok ? `OK (${orProbe.audioChunks} chunks)` : orProbe.error || 'failed'}`,
  ].join(' | ');

  // Update per-language routing honestly — NEVER silently claim Live Odia works if it failed!
  result.languageSupport = {
    or: {
      language: 'or',
      bcp47: 'or-IN',
      liveApiSupported: Boolean(orProbe.ok),
      pipelineMode: orProbe.ok ? 'gemini-live' : 'modular-voice-pipeline',
      chatModel: config.chatModel,
      transcribeModel: config.transcribeModel,
      ttsModel: config.ttsModel,
      notes: orProbe.ok
        ? `Live API (${config.liveModel}) verified for Odia; modular pipeline also available.`
        : `Live API (${config.liveModel}) did not verify reliable Odia script/voice output (${orProbe.error || 'unsupported'}); routing Odia voice through verified ${config.transcribeModel} + ${config.chatModel} + ${config.ttsModel}.`,
    },
    hi: {
      language: 'hi',
      bcp47: 'hi-IN',
      liveApiSupported: Boolean(hiProbe.ok),
      pipelineMode: hiProbe.ok ? 'gemini-live' : 'modular-voice-pipeline',
      chatModel: config.chatModel,
      transcribeModel: config.transcribeModel,
      ttsModel: config.ttsModel,
      notes: hiProbe.ok
        ? `Live API (${config.liveModel}) verified for Hindi voice-to-voice; modular pipeline also available.`
        : `Live API (${config.liveModel}) unavailable for Hindi (${hiProbe.error || 'unsupported'}); using ${config.transcribeModel} + ${config.chatModel} + ${config.ttsModel}.`,
    },
    en: {
      language: 'en',
      bcp47: 'en-IN',
      liveApiSupported: Boolean(enProbe.ok),
      pipelineMode: enProbe.ok ? 'gemini-live' : 'modular-voice-pipeline',
      chatModel: config.chatModel,
      transcribeModel: config.transcribeModel,
      ttsModel: config.ttsModel,
      notes: enProbe.ok
        ? `Live API (${config.liveModel}) verified for English voice-to-voice; modular pipeline also available.`
        : `Live API (${config.liveModel}) unavailable (${enProbe.error || 'unsupported'}); using ${config.transcribeModel} + ${config.chatModel} + ${config.ttsModel}.`,
    },
  };

  cachedProbe = { timestamp: Date.now(), result };
  return result;
}
