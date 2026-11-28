export type Language = "en" | "hi";
export type Currency = "INR" | "USD";
export type TabId = "scanner" | "audit" | "lab" | "shield" | "hub" | "roadmap";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface DetectedPattern {
  name: string;
  severity: RiskLevel;
  psychologyHook: string;
  explanation: string;
}

export interface RiskReport {
  gameTitle: string;
  riskScore: number;
  riskLevel: RiskLevel;
  breakdown: {
    skillPct: number;
    cosmeticPct: number;
    gamblingPct: number;
  };
  detectedPatterns: DetectedPattern[];
  gamerAlert: string;
  parentAlert: string;
  summary: string;
  analysisSource: "gemini" | "heuristic" | "preset";
}

export interface ScannerPreset {
  id: string;
  label: string;
  labelHi: string;
  riskHint: RiskLevel;
  title: string;
  description: string;
  reportEn: RiskReport;
  reportHi: RiskReport;
}

export interface EthicalGame {
  id: string;
  title: string;
  genre: string;
  category: "Indie" | "Zero Microtransactions" | "Co-op / Story";
  priceInr: string;
  priceUsd: string;
  ageRating: string;
  whySafe: string;
  whySafeHi: string;
}

export interface CommunityReport {
  id: string;
  gameTitle: string;
  platform: string;
  patternType: string;
  notes: string;
  submittedAt: string;
}

export interface ChecklistItem {
  id: string;
  titleEn: string;
  titleHi: string;
  detailEn: string;
  detailHi: string;
}

export interface AuditParameter {
  id: string;
  category: "RNG & Odds" | "Currency & Pricing" | "Psychological Pressure" | "Access & Safeguards";
  weight: number;
  labelEn: string;
  labelHi: string;
  descEn: string;
  descHi: string;
}

export interface ManualAuditReport {
  gameTitle: string;
  platform: string;
  notes: string;
  selectedIds: string[];
  harmScore: number;
  riskLevel: RiskLevel;
  harmVerdict: string;
  recommendation: string;
  generatedAt: string;
}
