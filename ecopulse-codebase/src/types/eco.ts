export type WasteCategoryId =
  | 'biodegradable'
  | 'non-biodegradable'
  | 'recyclable'
  | 'non-recyclable'
  | 'e-waste'
  | 'hazardous';

export type ItemCondition = 'clean' | 'soiled' | 'damaged';

export interface WasteCategoryMeta {
  id: WasteCategoryId;
  label: string;
  shortLabel: string;
  binName: string;
  binColorName: string;
  hex: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  badgeClass: string;
  description: string;
  examples: string[];
  contaminationTip: string;
  mapsQuery: string;
}

export interface FourFactorScores {
  recyclability: number;
  biodegradability: number;
  decompositionSpeed: number;
  hazardSafety: number; // 100 = safe, 0 = extreme hazard
}

export interface WasteItemProfile {
  id: string;
  name: string;
  primaryCategory: WasteCategoryId;
  applicableCategories: WasteCategoryId[];
  materialClass: string;
  resinOrCode: string;
  decompositionTime: string;
  hazardLabel: 'None / Low' | 'Moderate' | 'High' | 'Critical';
  fourFactor: FourFactorScores;
  prepSteps: string[];
  contaminationWarning: string;
  basePoints: number;
  co2SavedKg: number;
  emoji: string;
  keywords: string[];
  soilOverridesTo?: WasteCategoryId;
  soilNote?: string;
}

export interface ScanPrediction {
  item: WasteItemProfile;
  confidence: number;
  rawLabel: string;
  source: 'camera-ai' | 'upload-ai' | 'sample' | 'gemini-vision' | 'manual';
  condition: ItemCondition;
  effectiveCategory: WasteCategoryId;
  effectiveScore: number;
  effectiveFactors: FourFactorScores;
  alternativeMatches: Array<{ item: WasteItemProfile; confidence: number; rawLabel: string }>;
  timestamp: number;
}

export interface DisposalBinLocation {
  id: string;
  name: string;
  category: WasteCategoryId;
  address: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  walkMinutes: number;
  fillLevelPct: number;
  openHours: string;
  acceptedNote: string;
}

export interface DisposalLogEntry {
  id: string;
  itemName: string;
  category: WasteCategoryId;
  binName: string;
  pointsEarned: number;
  wasteScore: number;
  co2SavedKg: number;
  timestamp: number;
  verified: boolean;
}

export interface EcoReward {
  id: string;
  title: string;
  partner: string;
  cost: number;
  description: string;
  badge: string;
}

export interface UserEcoState {
  points: number;
  lifetimePoints: number;
  dailyPointsEarned: number;
  dailyPointsDate: string;
  streakDays: number;
  lastActiveDate: string;
  totalItemsSorted: number;
  correctDisposals: number;
  co2SavedKg: number;
  unlockedBadges: string[];
  redeemedRewardIds: string[];
  history: DisposalLogEntry[];
  categoryCounts: Record<WasteCategoryId, number>;
}
