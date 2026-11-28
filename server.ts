import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  analyzeThreatIntelligence,
  TRANCO_DOMAINS,
  type ChannelInput,
  type DetectedChannel,
} from './threat-intelligence/scanner.ts';
import {
  buildLocalMlVerdict,
  getAllGuidance,
  getVoiceGuidance,
  type FastVerdictPayload,
  type GuidanceCategory,
  type Language,
} from './voice-guidance/guidance.ts';
import { getMySqlPublicSummary } from './database/mysql.config.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

const VERDICT_CACHE_MAX = 250;
const verdictCache = new Map<string, FastVerdictPayload>();

function getCachedVerdict(key: string): FastVerdictPayload | undefined {
  const hit = verdictCache.get(key);
  if (!hit) return undefined;
  verdictCache.delete(key);
  verdictCache.set(key, hit);
  return hit;
}

function setCachedVerdict(key: string, value: FastVerdictPayload): void {
  if (verdictCache.has(key)) {
    verdictCache.delete(key);
  } else if (verdictCache.size >= VERDICT_CACHE_MAX) {
    const oldestKey = verdictCache.keys().next().value;
    if (oldestKey !== undefined) {
      verdictCache.delete(oldestKey);
    }
  }
  verdictCache.set(key, value);
}

interface CheckFraudBody {
  input?: unknown;
  channel?: unknown;
  language?: unknown;
}

interface GeminiVerdictPayload {
  verdict: 'SAFE' | 'FRAUD';
  riskScore: number;
  detectedChannel: DetectedChannel;
  headline: string;
  summary: string;
  signals: string[];
  recommendedAction: string;
}

function getLanguageName(lang: Language): string {
  if (lang === 'hi') return 'Hindi (Devanagari script)';
  if (lang === 'or') return 'Odia (Odia script)';
  return 'English';
}

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function createServer() {
  const app = express();

  app.post('/api/transcribe-voice', express.json({ limit: '10mb' }), async (req, res) => {
    try {
      const body = (req.body || {}) as {
        audioBase64?: unknown;
        mimeType?: unknown;
        language?: unknown;
      };
      const audioBase64 = typeof body.audioBase64 === 'string' ? body.audioBase64.trim() : '';
      const rawMime = typeof body.mimeType === 'string' ? body.mimeType.trim().toLowerCase() : 'audio/webm';
      const cleanMime = rawMime.split(';')[0] || 'audio/webm';
      const allowedMimes = new Set([
        'audio/webm',
        'audio/mp4',
        'audio/ogg',
        'audio/wav',
        'audio/x-wav',
        'audio/mpeg',
        'audio/mp3',
      ]);
      const mimeType = allowedMimes.has(cleanMime) ? (cleanMime === 'audio/x-wav' ? 'audio/wav' : cleanMime) : 'audio/webm';
      const language: Language =
        body.language === 'hi' || body.language === 'or' ? body.language : 'en';

      if (!audioBase64 || audioBase64.length < 100) {
        return res.status(400).json({
          error: 'Voice recording was too short or empty. Please speak clearly and try again.',
        });
      }

      const ai = getAiClient();
      if (!ai) {
        return res.status(503).json({
          error:
            'GEMINI_API_KEY is not configured in the server environment. Please add your Gemini API key in Settings > Secrets.',
        });
      }

      const targetLanguage = getLanguageName(language);
      const audioContents = [
        {
          role: 'user' as const,
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            {
              text: `Transcribe the spoken voice message accurately into ${targetLanguage}. Output ONLY the transcribed words in ${targetLanguage} script without quotes, labels, or extra commentary. If there is no intelligible speech, output NO_SPEECH.`,
            },
          ],
        },
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: audioContents,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        },
      });
      const rawTranscript = (response.text ?? '').trim();

      if (!rawTranscript || rawTranscript === 'NO_SPEECH') {
        return res.status(422).json({
          error: 'No clear speech was detected. Please hold the mic closer and try again.',
        });
      }

      return res.json({ transcript: rawTranscript, language });
    } catch (err: unknown) {
      console.error('Error in /api/transcribe-voice:', err);
      const message = err instanceof Error ? err.message : 'Unexpected server error';
      if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
        return res.status(429).json({
          error: 'Rate limit reached while transcribing voice. Please wait a moment and try again.',
        });
      }
      if (message.includes('403') || message.includes('PERMISSION_DENIED') || message.includes('API_KEY_INVALID')) {
        return res.status(403).json({
          error: 'Invalid or unauthorized Gemini API key. Please check Settings > Secrets.',
        });
      }
      return res.status(500).json({
        error: `Unable to transcribe the voice message: ${message}`,
      });
    }
  });

  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'satark-setu',
      trancoDomainsLoaded: TRANCO_DOMAINS.size,
      database: getMySqlPublicSummary(),
      guidanceLanguages: ['en', 'hi', 'or'],
    });
  });

  app.get('/api/guidance', (req, res) => {
    const rawLang = typeof req.query.language === 'string' ? req.query.language : 'en';
    const language: Language = rawLang === 'hi' || rawLang === 'or' ? rawLang : 'en';
    const rawCategory = typeof req.query.category === 'string' ? req.query.category.toUpperCase() : '';
    const validCategories = new Set<GuidanceCategory>([
      'OFFICIAL_DOMAIN',
      'BANK_ALERT',
      'SAFE_UPI',
      'PHISHING_URL',
      'SCAM_UPI',
      'SCAM_SMS',
      'DIGITAL_ARREST',
      'APK_LURE',
    ]);

    if (rawCategory && validCategories.has(rawCategory as GuidanceCategory)) {
      return res.json({
        language,
        category: rawCategory,
        guidance: getVoiceGuidance(language, rawCategory as GuidanceCategory),
      });
    }

    return res.json({
      language,
      guidance: getAllGuidance(language),
    });
  });

  app.post('/check', (req, res) => {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const intel = analyzeThreatIntelligence(text, 'auto');
    return res.json({
      overall_verdict:
        intel.overallVerdictHint === 'NEUTRAL' ? 'SAFE' : intel.overallVerdictHint,
      overall_risk_score: intel.heuristicRiskScore,
      text_analysis: {
        verdict:
          intel.textRedFlags.length >= 2
            ? 'SCAM'
            : intel.textRedFlags.length === 1
              ? 'SUSPICIOUS'
              : 'SAFE',
        scam_prob: intel.heuristicRiskScore,
        red_flags: intel.textRedFlags,
      },
      url_analysis: {
        found_urls: intel.urlResults.length > 0,
        results: intel.urlResults.map((u) => ({
          url: u.url,
          verdict: u.verdict,
          phishing_prob: u.phishingProb,
          red_flags: u.redFlags,
        })),
      },
    });
  });

  app.post('/api/check-fraud', async (req, res) => {
    try {
      const body = (req.body || {}) as CheckFraudBody;
      const rawInput = typeof body.input === 'string' ? body.input.trim() : '';
      const channel: ChannelInput =
        body.channel === 'sms' || body.channel === 'upi' || body.channel === 'link'
          ? body.channel
          : 'auto';
      const language: Language =
        body.language === 'hi' || body.language === 'or' ? body.language : 'en';

      if (!rawInput || rawInput.length < 3) {
        return res.status(400).json({
          error: 'Please paste an SMS message, UPI ID, or link (at least 3 characters).',
        });
      }

      if (rawInput.length > 5000) {
        return res.status(400).json({
          error: 'Input is too long. Please limit content to 5000 characters.',
        });
      }

      const ai = getAiClient();
      if (!ai) {
        return res.status(503).json({
          error:
            'GEMINI_API_KEY is not configured in the server environment. Please add your Gemini API key in Settings > Secrets.',
        });
      }

      const cacheKey = `${language}:${channel}:${rawInput}`;
      const cachedVerdict = getCachedVerdict(cacheKey);
      if (cachedVerdict) {
        return res.json({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          input: rawInput,
          ...cachedVerdict,
          checkedAt: new Date().toISOString(),
          language,
        });
      }

      const intel = analyzeThreatIntelligence(rawInput, channel);
      const localVerdict = buildLocalMlVerdict(intel, language);
      if (localVerdict) {
        setCachedVerdict(cacheKey, localVerdict);
        return res.json({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          input: rawInput,
          ...localVerdict,
          checkedAt: new Date().toISOString(),
          language,
        });
      }

      const { inferredChannel, clues } = intel;
      const targetLanguage = getLanguageName(language);

      const prompt = [
        `You are SATARK SETU, an Indian digital fraud detection analyst protecting citizens from all major cyber frauds: SMS phishing (smishing), fake KYC/bank alerts, digital arrest & courier/police impersonation, fake job/task/loan scams, malicious APK/remote-access traps, UPI collect/refund/lottery scams, and deceptive phishing URLs.`,
        `Analyze the user-submitted content carefully and classify it accurately as either SAFE or FRAUD.`,
        ``,
        `Rules for accurate classification:`,
        `1. Be accurate: standard bank debit/credit SMS alerts without suspicious links, normal merchant UPI IDs (e.g., bharatpe.merchant@icici, paytmqr...@paytm, shop@okicici), and authentic official or Tranco-verified domains (e.g., https://cybercrime.gov.in, https://uidai.gov.in, https://onlinesbi.sbi) should be classified as SAFE with a low riskScore (5 to 28).`,
        `2. Any message/UPI/link exhibiting KYC/account-block urgency with non-official links, fake bank/courier domains (.xyz, .top, lookalike hyphens, brand spoofing), raw IP URLs, OTP/PIN phishing, digital arrest or law-enforcement threats, malicious APK/remote-screen apps, fake job/loan lures, or lottery/cashback/refund UPI handles must be classified as FRAUD with a high riskScore (72 to 98).`,
        `3. Write headline, summary, signals (3 to 4 concise bullet points), and recommendedAction strictly in ${targetLanguage}.`,
        `4. Keep "verdict" strictly "SAFE" or "FRAUD", and "detectedChannel" strictly "SMS", "UPI", or "LINK".`,
        `5. Never include markdown formatting inside JSON string values.`,
        ``,
        `Requested channel filter: ${channel.toUpperCase()} (structural hint: ${inferredChannel})`,
        `Threat-intelligence pre-scan verdict: ${intel.overallVerdictHint} (heuristic score: ${intel.heuristicRiskScore}/100)`,
        `Threat-intelligence clues observed: ${clues.length > 0 ? clues.join('; ') : 'None flagged automatically'}`,
        ``,
        `User submitted content:`,
        `"""`,
        rawInput,
        `"""`,
      ].join('\n');

      const requestPayload = {
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              verdict: {
                type: Type.STRING,
                description: 'Must be exactly SAFE or FRAUD.',
              },
              riskScore: {
                type: Type.INTEGER,
                description: 'Integer risk score from 0 (lowest risk) to 100 (highest risk).',
              },
              detectedChannel: {
                type: Type.STRING,
                description: 'Must be exactly SMS, UPI, or LINK.',
              },
              headline: {
                type: Type.STRING,
                description: 'Short clear verdict headline in the requested language.',
              },
              summary: {
                type: Type.STRING,
                description: '2-sentence plain-language explanation in the requested language.',
              },
              signals: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 to 4 short factual findings in the requested language.',
              },
              recommendedAction: {
                type: Type.STRING,
                description: '1 concrete, helpful next step for the citizen in the requested language.',
              },
            },
            required: [
              'verdict',
              'riskScore',
              'detectedChannel',
              'headline',
              'summary',
              'signals',
              'recommendedAction',
            ],
          },
        },
      };

      let response;
      try {
        response = await ai.models.generateContent(requestPayload);
      } catch (firstErr: unknown) {
        const msg = firstErr instanceof Error ? firstErr.message : '';
        if (msg.includes('400') || msg.includes('403') || msg.includes('429') || msg.includes('API_KEY_INVALID')) {
          throw firstErr;
        }
        await new Promise((resolve) => setTimeout(resolve, 600));
        response = await ai.models.generateContent(requestPayload);
      }

      const rawText = (response.text ?? '')
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '');
      if (!rawText) {
        return res.status(502).json({
          error: 'The verification engine returned an empty response. Please try again.',
        });
      }

      const parsed = JSON.parse(rawText) as Partial<GeminiVerdictPayload>;
      const verdict: 'SAFE' | 'FRAUD' =
        String(parsed.verdict).toUpperCase() === 'FRAUD' ? 'FRAUD' : 'SAFE';

      let riskScore = Number.isFinite(Number(parsed.riskScore))
        ? Math.round(Number(parsed.riskScore))
        : verdict === 'FRAUD'
          ? 85
          : 12;
      riskScore = Math.max(0, Math.min(100, riskScore));

      // Keep riskScore aligned with binary SAFE / FRAUD verdict
      if (verdict === 'SAFE' && riskScore > 35) {
        riskScore = 22;
      } else if (verdict === 'FRAUD' && riskScore < 65) {
        riskScore = 78;
      }

      const rawChan = String(parsed.detectedChannel || inferredChannel).toUpperCase();
      const detectedChannel: DetectedChannel =
        rawChan === 'UPI' || rawChan === 'LINK' || rawChan === 'SMS'
          ? (rawChan as DetectedChannel)
          : inferredChannel;

      const signals = Array.isArray(parsed.signals)
        ? parsed.signals.map((s) => String(s)).filter(Boolean).slice(0, 5)
        : [];

      const finalPayload: FastVerdictPayload = {
        verdict,
        riskScore,
        detectedChannel,
        headline: String(parsed.headline || verdict),
        summary: String(parsed.summary || ''),
        signals,
        recommendedAction: String(parsed.recommendedAction || ''),
      };
      setCachedVerdict(cacheKey, finalPayload);

      return res.json({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        input: rawInput,
        ...finalPayload,
        checkedAt: new Date().toISOString(),
        language,
      });
    } catch (err: unknown) {
      console.error('Error in /api/check-fraud:', err);
      const message = err instanceof Error ? err.message : 'Unexpected server error';
      if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
        return res.status(429).json({
          error: 'Rate limit reached while checking fraud. Please wait a moment and try again.',
        });
      }
      if (message.includes('403') || message.includes('PERMISSION_DENIED') || message.includes('API_KEY_INVALID')) {
        return res.status(403).json({
          error: 'Invalid or unauthorized Gemini API key. Please check Settings > Secrets.',
        });
      }
      return res.status(500).json({
        error: 'Unable to complete verification right now. Please try again.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SATARK SETU server running on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
