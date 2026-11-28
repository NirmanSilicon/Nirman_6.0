import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type DetectedChannel = 'SMS' | 'UPI' | 'LINK';
export type Language = 'en' | 'hi' | 'or';

export type GuidanceCategory =
  | 'OFFICIAL_DOMAIN'
  | 'BANK_ALERT'
  | 'SAFE_UPI'
  | 'PHISHING_URL'
  | 'SCAM_UPI'
  | 'SCAM_SMS'
  | 'DIGITAL_ARREST'
  | 'APK_LURE';

export interface GuidanceTemplate {
  headline: string;
  summary: string;
  signals: string[];
  recommendedAction: string;
}

export interface FastVerdictPayload {
  verdict: 'SAFE' | 'FRAUD';
  riskScore: number;
  detectedChannel: DetectedChannel;
  headline: string;
  summary: string;
  signals: string[];
  recommendedAction: string;
}

export interface ThreatIntelVerdictSource {
  inferredChannel: DetectedChannel;
  textRedFlags: string[];
  urlResults: Array<{ hostname: string; redFlags: string[] }>;
  mlConfidence: 'HIGH' | 'MEDIUM';
  fastVerdict: 'SAFE' | 'FRAUD' | null;
  fastScore: number;
  matchedCategory: GuidanceCategory | 'AMBIGUOUS';
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCRIPTS_PATH = path.join(__dirname, 'scripts.json');

type GuidanceCatalog = Record<Language, Record<GuidanceCategory, GuidanceTemplate>>;

const GUIDANCE_CATALOG = JSON.parse(
  fs.readFileSync(SCRIPTS_PATH, 'utf-8')
) as GuidanceCatalog;

export function getVoiceGuidance(
  language: Language,
  category: GuidanceCategory,
  domain = ''
): GuidanceTemplate {
  const langScripts = GUIDANCE_CATALOG[language] || GUIDANCE_CATALOG.en;
  const tpl = langScripts[category] || langScripts.SCAM_SMS;
  return {
    headline: tpl.headline,
    summary: tpl.summary.replace(/\{domain\}/g, domain),
    signals: tpl.signals.map((s) => s.replace(/\{domain\}/g, domain)),
    recommendedAction: tpl.recommendedAction,
  };
}

export function getAllGuidance(language: Language): Record<GuidanceCategory, GuidanceTemplate> {
  return GUIDANCE_CATALOG[language] || GUIDANCE_CATALOG.en;
}

export function buildLocalMlVerdict(
  intel: ThreatIntelVerdictSource,
  language: Language
): FastVerdictPayload | null {
  if (intel.mlConfidence !== 'HIGH' || !intel.fastVerdict || intel.matchedCategory === 'AMBIGUOUS') {
    return null;
  }

  const primaryDomain = intel.urlResults[0]?.hostname || '';
  const tpl = getVoiceGuidance(language, intel.matchedCategory, primaryDomain);

  let signals = tpl.signals;
  if (intel.matchedCategory === 'PHISHING_URL' && intel.urlResults[0]?.redFlags.length) {
    signals = intel.urlResults[0].redFlags.slice(0, 4);
  } else if (intel.matchedCategory === 'SCAM_SMS' && intel.textRedFlags.length > 0) {
    signals = intel.textRedFlags.slice(0, 4);
  }

  return {
    verdict: intel.fastVerdict,
    riskScore: intel.fastScore,
    detectedChannel: intel.inferredChannel,
    headline: tpl.headline,
    summary: tpl.summary,
    signals,
    recommendedAction: tpl.recommendedAction,
  };
}
