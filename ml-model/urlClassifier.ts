import net from 'node:net';

export const ACTION_KEYWORDS = [
  'login',
  'verify',
  'kyc',
  'update',
  'secure',
  'account',
  'banking',
  'refund',
  'pan',
  'aadhaar',
  'signin',
  'confirm',
] as const;

export const PROTECTED_BRANDS: Record<string, readonly string[]> = {
  sbi: ['onlinesbi.sbi', 'sbi.co.in', 'sbi.co'],
  hdfc: ['hdfcbank.com', 'hdfc.com'],
  icici: ['icicibank.com'],
  paytm: ['paytm.com'],
  upi: ['npci.org.in'],
};

export const SUSPICIOUS_TLDS = [
  '.xyz',
  '.top',
  '.click',
  '.tk',
  '.ml',
  '.gq',
  '.buzz',
  '.work',
  '.info',
] as const;

export const SHORTENER_DOMAINS = new Set([
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'ow.ly',
  'is.gd',
  'buff.ly',
  'cutt.ly',
  'rb.gy',
  'shorturl.at',
]);

export const UNTRUSTED_SHARED_HOSTS = new Set([
  ...SHORTENER_DOMAINS,
  'forms.gle',
  'sites.google.com',
  'docs.google.com',
  'blogspot.com',
  'wordpress.com',
  'github.io',
  'firebaseapp.com',
  'web.app',
]);

export const OFFICIAL_DOMAINS = new Set<string>([
  ...Object.values(PROTECTED_BRANDS).flat(),
  'google.com',
  'github.com',
  'amazon.in',
  'flipkart.com',
  'uidai.gov.in',
]);

export interface UrlFeatures {
  urlLength: number;
  hostnameLength: number;
  pathLength: number;
  hostnameDots: number;
  hostnameHyphens: number;
  urlDigits: number;
  hostnameDigits: number;
  hasAtSymbol: boolean;
  hasIp: boolean;
  hasPort: boolean;
  actionKeywordCount: number;
  brandSpoof: boolean;
  hostnameEntropy: number;
  hasSuspiciousTld: boolean;
}

export interface UrlScanItem {
  url: string;
  hostname: string;
  verdict: 'SAFE' | 'PHISHING' | 'SUSPICIOUS' | 'LEGITIMATE';
  phishingProb: number;
  redFlags: string[];
  features: UrlFeatures;
}

function shannonEntropy(text: string): number {
  if (!text) return 0;
  const counts = new Map<string, number>();
  for (const ch of text) {
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / text.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function hasValidIp(hostname: string): boolean {
  const cleaned = hostname.replace(/^\[|\]$/g, '');
  return net.isIP(cleaned) !== 0;
}

function isBrandSpoof(lowerUrl: string, hostname: string): boolean {
  for (const [brand, officialDomains] of Object.entries(PROTECTED_BRANDS)) {
    if (lowerUrl.includes(brand)) {
      const isOfficial = officialDomains.some(
        (d) => hostname === d || hostname.endsWith(`.${d}`)
      );
      if (!isOfficial) {
        return true;
      }
    }
  }
  return false;
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

export function extractUrlFeatures(rawUrl: string): UrlFeatures {
  const url = String(rawUrl).trim();
  const urlForParse = /^https?:\/\//i.test(url) ? url : `http://${url}`;
  let hostname = '';
  let urlPath = '';
  let hasPort = false;

  try {
    const parsed = new URL(urlForParse);
    hostname = (parsed.hostname || '').toLowerCase();
    urlPath = parsed.pathname || '';
    hasPort = parsed.port !== '';
  } catch {
    const parts = url.split('/', 2);
    hostname = (parts[0] || '').toLowerCase();
    urlPath = parts[1] ? `/${parts[1]}` : '';
  }

  const lowerUrl = url.toLowerCase();
  const actionKeywordCount = ACTION_KEYWORDS.reduce(
    (acc, kw) => (lowerUrl.includes(kw) ? acc + 1 : acc),
    0
  );

  return {
    urlLength: url.length,
    hostnameLength: hostname.length,
    pathLength: urlPath.length,
    hostnameDots: (hostname.match(/\./g) || []).length,
    hostnameHyphens: (hostname.match(/-/g) || []).length,
    urlDigits: (url.match(/\d/g) || []).length,
    hostnameDigits: (hostname.match(/\d/g) || []).length,
    hasAtSymbol: url.includes('@'),
    hasIp: hasValidIp(hostname),
    hasPort,
    actionKeywordCount,
    brandSpoof: isBrandSpoof(lowerUrl, hostname),
    hostnameEntropy: Number(shannonEntropy(hostname).toFixed(3)),
    hasSuspiciousTld: SUSPICIOUS_TLDS.some((tld) => hostname.endsWith(tld)),
  };
}

export function classifyUrlWithModel(
  rawUrl: string,
  isAllowedDomain: (hostname: string) => boolean
): UrlScanItem {
  const cleanedRaw = String(rawUrl).trim().replace(/[.,!?)]+$/, '');
  const urlForParse = /^https?:\/\//i.test(cleanedRaw)
    ? cleanedRaw
    : `http://${cleanedRaw}`;

  let hostname = '';
  try {
    hostname = new URL(urlForParse).hostname.toLowerCase();
  } catch {
    hostname = cleanedRaw.split('/')[0].toLowerCase();
  }

  const features = extractUrlFeatures(cleanedRaw.replace(/^https?:\/\//i, ''));

  if (isAllowedDomain(hostname)) {
    return {
      url: cleanedRaw,
      hostname,
      verdict: 'SAFE',
      phishingProb: 0,
      redFlags: [],
      features,
    };
  }

  const flags: string[] = [];
  const isShortener = SHORTENER_DOMAINS.has(hostname);

  // Calibrated 14-feature phishing scoring aligned with ml-model/features.py
  let logit = -1.35;
  if (isShortener) {
    flags.push('Uses a URL shortener (destination hidden)');
    logit += 2.3;
  }
  if (features.brandSpoof) {
    flags.push('Impersonates a protected Indian brand');
    logit += 3.1;
  }
  if (features.hasSuspiciousTld) {
    flags.push('Uses a high-risk TLD');
    logit += 2.6;
  }
  if (features.hasIp) {
    flags.push('Uses a raw IP address instead of a domain');
    logit += 3.2;
  }
  if (features.actionKeywordCount > 0) {
    flags.push(`Contains ${features.actionKeywordCount} urgent/action keyword(s)`);
    logit += Math.min(2.4, features.actionKeywordCount * 0.95);
  }
  if (features.hasAtSymbol) {
    flags.push("Contains '@' redirect trick");
    logit += 2.4;
  }
  if (features.hostnameHyphens >= 2) {
    flags.push('Uses multiple hyphens in hostname (common lookalike tactic)');
    logit += 1.4;
  }
  if (features.hostnameDigits >= 3 || features.hostnameEntropy > 3.9) {
    logit += 0.9;
  }
  if (features.hasPort) {
    flags.push('Uses a non-standard URL port');
    logit += 1.1;
  }
  if (/^http:\/\//i.test(cleanedRaw)) {
    flags.push('Uses unencrypted HTTP instead of HTTPS');
    logit += 0.55;
  }
  if (UNTRUSTED_SHARED_HOSTS.has(hostname) && !isShortener) {
    flags.push('Hosted on a shared public form/page domain often abused for phishing');
    logit += 1.7;
  }

  const phishingProb = Math.min(99, Math.max(4, Math.round(sigmoid(logit) * 100)));
  let verdict: UrlScanItem['verdict'] = 'LEGITIMATE';
  if (phishingProb >= 65) {
    verdict = 'PHISHING';
  } else if (isShortener || flags.length > 0) {
    verdict = 'SUSPICIOUS';
  }

  return {
    url: cleanedRaw,
    hostname,
    verdict,
    phishingProb,
    redFlags: flags,
    features,
  };
}
