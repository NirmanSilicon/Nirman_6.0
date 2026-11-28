import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyUrlWithModel,
  OFFICIAL_DOMAINS,
  UNTRUSTED_SHARED_HOSTS,
  type UrlScanItem,
} from '../ml-model/urlClassifier.ts';
import type { GuidanceCategory } from '../voice-guidance/guidance.ts';

export type ChannelInput = 'auto' | 'sms' | 'upi' | 'link';
export type DetectedChannel = 'SMS' | 'UPI' | 'LINK';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRUSTED_UPI_PSPS = new Set([
  'okaxis',
  'okicici',
  'okhdfcbank',
  'oksbi',
  'ybl',
  'ibl',
  'axl',
  'paytm',
  'icici',
  'hdfcbank',
  'sbi',
  'upi',
  'apl',
  'fbl',
  'kotak',
  'indus',
  'barodampay',
  'federal',
]);

const SCAM_CUES: Record<string, readonly string[]> = {
  'Asks for OTP or UPI PIN': ['otp', 'upi pin', 'pin डालें', 'pin ଦିଅନ୍ତୁ', 'share pin', 'enter pin'],
  'Uses arrest / cyber cell / legal threat': [
    'arrest',
    'cyber cell',
    'crime',
    'illegal',
    'गिरफ्तारी',
    'अपराध',
    'ଗିରଫ',
    'ଅପରାଧ',
    'digital arrest',
    'money laundering',
    'warrant',
  ],
  'Threatens account / SIM / electricity block': [
    'blocked',
    'suspended',
    'disconnected',
    'kyc',
    'बंद हो जाएगा',
    'कट जाएगा',
    'ବ୍ଲକ୍',
    'ବନ୍ଦ ହେବ',
    'pan update',
  ],
  'Promises lottery / cashback / job for a fee': [
    'processing fee',
    'registration fee',
    'lucky draw',
    'cashback',
    'प्रोसेसिंग फीस',
    'କ୍ୟାସବ୍ୟାକ୍',
    'ପ୍ରୋସେସିଂ ଫି',
    'won a prize',
    'claim prize',
    'delivery fee',
  ],
};

function loadTrancoDomains(): Set<string> {
  const trancoPath = path.join(__dirname, 'tranco_top.txt');
  const domains = new Set<string>();
  try {
    if (!fs.existsSync(trancoPath)) {
      return domains;
    }
    const lines = fs.readFileSync(trancoPath, 'utf-8').split(/\r?\n/);
    for (const line of lines) {
      const domain = line.trim().toLowerCase();
      if (domain && !UNTRUSTED_SHARED_HOSTS.has(domain)) {
        domains.add(domain);
      }
    }
  } catch (err) {
    console.warn('Unable to load tranco_top.txt:', err);
  }
  return domains;
}

export const TRANCO_DOMAINS = loadTrancoDomains();

export function isOfficialDomain(hostname: string): boolean {
  if (!hostname) return false;
  if (UNTRUSTED_SHARED_HOSTS.has(hostname)) return false;
  if (hostname.endsWith('.gov.in') || hostname.endsWith('.nic.in')) return true;
  for (const d of OFFICIAL_DOMAINS) {
    if (hostname === d || hostname.endsWith(`.${d}`)) {
      return true;
    }
  }
  const bare = hostname.startsWith('www.') ? hostname.slice(4) : hostname;
  return TRANCO_DOMAINS.has(bare);
}

export function scanSingleUrl(rawUrl: string): UrlScanItem {
  return classifyUrlWithModel(rawUrl, isOfficialDomain);
}

const URL_EXTRACT_REGEX =
  /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*(?:\.[a-zA-Z]{2,})(?::\d+)?(?:\/[^\s]*)?/g;

export interface ThreatIntelReport {
  inferredChannel: DetectedChannel;
  clues: string[];
  textRedFlags: string[];
  urlResults: UrlScanItem[];
  allUrlsSafe: boolean;
  overallVerdictHint: 'SAFE' | 'SUSPICIOUS' | 'DANGER' | 'NEUTRAL';
  heuristicRiskScore: number;
  mlConfidence: 'HIGH' | 'MEDIUM';
  fastVerdict: 'SAFE' | 'FRAUD' | null;
  fastScore: number;
  matchedCategory: GuidanceCategory | 'AMBIGUOUS';
}

export function analyzeThreatIntelligence(
  rawInput: string,
  requestedChannel: ChannelInput
): ThreatIntelReport {
  const trimmed = rawInput.trim();
  const lower = trimmed.toLowerCase();
  const clues: string[] = [];

  const looksLikeUpiOnly = /^[a-z0-9._-]{2,}@[a-z0-9.-]{2,}$/i.test(trimmed);

  const rawUrlMatches = (trimmed.match(URL_EXTRACT_REGEX) || []).filter((candidate) => {
    if (candidate.includes('@') && !/^https?:\/\//i.test(candidate)) {
      return false;
    }
    return true;
  });
  const urlResults = rawUrlMatches.map((u) => scanSingleUrl(u));

  let inferredChannel: DetectedChannel = 'SMS';
  if (requestedChannel === 'upi' || looksLikeUpiOnly) {
    inferredChannel = 'UPI';
  } else if (
    requestedChannel === 'link' ||
    (urlResults.length > 0 && trimmed.split(/\s+/).length <= 3 && !lower.includes('dear'))
  ) {
    inferredChannel = 'LINK';
  } else if (requestedChannel === 'sms') {
    inferredChannel = 'SMS';
  }

  let textForCues = lower;
  for (const u of urlResults) {
    if (u.verdict === 'SAFE') {
      textForCues = textForCues.split(u.url.toLowerCase()).join(' ');
    }
  }

  const textRedFlags: string[] = [];
  for (const [label, keywords] of Object.entries(SCAM_CUES)) {
    const matched = keywords.some((kw) => {
      if (/^[a-z0-9 ]+$/i.test(kw) && kw.length <= 8) {
        return new RegExp(`\\b${kw}\\b`, 'i').test(textForCues);
      }
      return textForCues.includes(kw);
    });
    if (matched) {
      textRedFlags.push(label);
      clues.push(`Threat-intelligence cue matched: ${label}`);
    }
  }

  const hasDigitalArrest =
    /(digital arrest|\bcbi\b|\bncb\b|customs|parcel seized|\btrai\b|fedex|money laundering|\bwarrant\b|police verification|cyber cell)/i.test(
      textForCues
    );
  if (hasDigitalArrest) {
    clues.push(
      'Contains impersonation or digital-arrest intimidation keywords (police/customs/TRAI/courier seizure)'
    );
  }

  const hasApkOrJobLure =
    /(\.apk|anydesk|teamviewer|quicksupport|rustdesk|screen\s*share|part[- ]?time job|daily income|task bonus|instant loan)/i.test(
      textForCues
    );
  if (hasApkOrJobLure) {
    clues.push('Mentions malicious APK, remote-access app, or high-return job/task/loan lure');
  }

  const hasUrgencyThreat =
    /(urgent|immediately|today at|will be blocked|account.*blocked|kyc.*pending|kyc.*expired|click here|update now|delivery fee|parcel.*fee)/i.test(
      textForCues
    );

  let suspiciousUpi = false;
  let safeUpi = false;
  if (looksLikeUpiOnly) {
    const parts = lower.split('@');
    const upiHandlePrefix = parts[0] || '';
    const upiPsp = parts[1] || '';
    clues.push(`UPI VPA handle prefix "${upiHandlePrefix}" with PSP "@${upiPsp}"`);
    if (
      /(prize|lottery|cashback|refund|claim|kyc|reward|win|bonus|support|helpline|lucky|offer|gift)/i.test(
        upiHandlePrefix
      )
    ) {
      suspiciousUpi = true;
      clues.push('UPI handle prefix mimics reward, cashback, refund, or support desk');
    } else if (
      TRUSTED_UPI_PSPS.has(upiPsp) &&
      /^[a-z0-9._-]{3,40}$/.test(upiHandlePrefix) &&
      !/(free|otp|pin|verify|block)/i.test(upiHandlePrefix)
    ) {
      safeUpi = true;
      clues.push(`Recognized UPI PSP "@${upiPsp}" with standard handle structure`);
    }
  }

  for (const u of urlResults) {
    if (u.verdict === 'SAFE') {
      clues.push(`Verified official/Tranco top domain: ${u.hostname}`);
    } else {
      clues.push(
        `URL "${u.url}" flagged as ${u.verdict} (${u.redFlags.join('; ') || 'unverified domain'})`
      );
    }
  }

  const isStandardBankAlert =
    /(debited|credited|upi ref|available bal|a\/c\s*[x*]+\d{3,4}|if not done by you)/i.test(lower) &&
    urlResults.length === 0 &&
    !hasUrgencyThreat &&
    !hasDigitalArrest &&
    !hasApkOrJobLure &&
    textRedFlags.length === 0;

  if (isStandardBankAlert) {
    clues.push(
      'Matches standard informational bank transaction alert format without external login links'
    );
  }

  const allUrlsSafe =
    urlResults.length > 0 && urlResults.every((u) => u.verdict === 'SAFE');
  const maxUrlProb = urlResults.reduce((m, u) => Math.max(m, u.phishingProb), 0);
  const hasPhishingUrl = urlResults.some((u) => u.verdict === 'PHISHING');

  let overallVerdictHint: ThreatIntelReport['overallVerdictHint'] = 'NEUTRAL';
  let heuristicRiskScore = maxUrlProb;

  if (allUrlsSafe && textRedFlags.length === 0 && !suspiciousUpi && !hasDigitalArrest && !hasApkOrJobLure) {
    overallVerdictHint = 'SAFE';
    heuristicRiskScore = 5;
  } else if (
    hasPhishingUrl ||
    textRedFlags.length >= 2 ||
    suspiciousUpi ||
    (hasDigitalArrest && (textRedFlags.length >= 1 || hasUrgencyThreat)) ||
    (hasApkOrJobLure && (urlResults.length > 0 || textRedFlags.length >= 1))
  ) {
    overallVerdictHint = 'DANGER';
    heuristicRiskScore = Math.max(
      heuristicRiskScore,
      hasPhishingUrl ? maxUrlProb : 88
    );
  } else if (
    urlResults.some((u) => u.verdict === 'SUSPICIOUS') ||
    textRedFlags.length === 1 ||
    hasDigitalArrest ||
    hasApkOrJobLure
  ) {
    overallVerdictHint = 'SUSPICIOUS';
    heuristicRiskScore = Math.max(heuristicRiskScore, 68);
  }

  let mlConfidence: 'HIGH' | 'MEDIUM' = 'MEDIUM';
  let fastVerdict: 'SAFE' | 'FRAUD' | null = null;
  let fastScore = heuristicRiskScore;
  let matchedCategory: ThreatIntelReport['matchedCategory'] = 'AMBIGUOUS';

  if (allUrlsSafe && textRedFlags.length === 0 && !suspiciousUpi && !hasDigitalArrest && !hasApkOrJobLure) {
    mlConfidence = 'HIGH';
    fastVerdict = 'SAFE';
    fastScore = 5;
    matchedCategory = 'OFFICIAL_DOMAIN';
  } else if (isStandardBankAlert) {
    mlConfidence = 'HIGH';
    fastVerdict = 'SAFE';
    fastScore = 8;
    matchedCategory = 'BANK_ALERT';
  } else if (safeUpi) {
    mlConfidence = 'HIGH';
    fastVerdict = 'SAFE';
    fastScore = 10;
    matchedCategory = 'SAFE_UPI';
  } else if (suspiciousUpi) {
    mlConfidence = 'HIGH';
    fastVerdict = 'FRAUD';
    fastScore = 91;
    matchedCategory = 'SCAM_UPI';
  } else if (hasPhishingUrl) {
    mlConfidence = 'HIGH';
    fastVerdict = 'FRAUD';
    fastScore = Math.max(82, maxUrlProb);
    matchedCategory = 'PHISHING_URL';
  } else if (hasDigitalArrest && (textRedFlags.length >= 1 || hasUrgencyThreat)) {
    mlConfidence = 'HIGH';
    fastVerdict = 'FRAUD';
    fastScore = 92;
    matchedCategory = 'DIGITAL_ARREST';
  } else if (hasApkOrJobLure && (urlResults.length > 0 || textRedFlags.length >= 1 || hasUrgencyThreat)) {
    mlConfidence = 'HIGH';
    fastVerdict = 'FRAUD';
    fastScore = 90;
    matchedCategory = 'APK_LURE';
  } else if (textRedFlags.length >= 2 || (textRedFlags.length >= 1 && hasUrgencyThreat)) {
    mlConfidence = 'HIGH';
    fastVerdict = 'FRAUD';
    fastScore = 88;
    matchedCategory = 'SCAM_SMS';
  }

  return {
    inferredChannel,
    clues,
    textRedFlags,
    urlResults,
    allUrlsSafe,
    overallVerdictHint,
    heuristicRiskScore,
    mlConfidence,
    fastVerdict,
    fastScore,
    matchedCategory,
  };
}
