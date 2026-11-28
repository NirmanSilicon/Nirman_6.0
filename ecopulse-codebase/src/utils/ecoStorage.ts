import {
  DisposalLogEntry,
  UserEcoState,
  WasteCategoryId,
} from '../types/eco';
import {
  BADGE_DEFINITIONS,
  DAILY_POINTS_CAP,
  ECO_REWARDS,
} from '../data/wasteDatabase';

const STORAGE_KEY = 'ecopulse_user_state_v1';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function getInitialEcoState(): UserEcoState {
  const today = todayIso();
  const base: UserEcoState = {
    points: 45,
    lifetimePoints: 45,
    dailyPointsEarned: 0,
    dailyPointsDate: today,
    streakDays: 1,
    lastActiveDate: today,
    totalItemsSorted: 2,
    correctDisposals: 2,
    co2SavedKg: 0.7,
    unlockedBadges: ['first-scan'],
    redeemedRewardIds: [],
    history: [
      {
        id: 'seed-1',
        itemName: 'PET Plastic Water Bottle',
        category: 'recyclable',
        binName: 'Blue Recycling Bin',
        pointsEarned: 25,
        wasteScore: 58,
        co2SavedKg: 0.42,
        timestamp: Date.now() - 3600 * 1000 * 3,
        verified: true,
      },
      {
        id: 'seed-2',
        itemName: 'Banana Peel & Fruit Scraps',
        category: 'biodegradable',
        binName: 'Green Compost Bin',
        pointsEarned: 20,
        wasteScore: 80,
        co2SavedKg: 0.28,
        timestamp: Date.now() - 3600 * 1000 * 1,
        verified: true,
      },
    ],
    categoryCounts: {
      biodegradable: 1,
      'non-biodegradable': 0,
      recyclable: 1,
      'non-recyclable': 0,
      'e-waste': 0,
      hazardous: 0,
    },
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as UserEcoState;
    if (parsed.dailyPointsDate !== today) {
      parsed.dailyPointsDate = today;
      parsed.dailyPointsEarned = 0;
    }
    return parsed;
  } catch {
    return base;
  }
}

export function saveEcoState(state: UserEcoState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function recordCorrectDisposal(
  prev: UserEcoState,
  params: {
    itemName: string;
    category: WasteCategoryId;
    binName: string;
    basePoints: number;
    wasteScore: number;
    co2SavedKg: number;
    streakBonus?: number;
  }
): { nextState: UserEcoState; awardedPoints: number; newlyUnlockedBadges: string[]; capped: boolean } {
  const today = todayIso();
  const yest = yesterdayIso();

  const currentDaily = prev.dailyPointsDate === today ? prev.dailyPointsEarned : 0;
  const remainingCap = Math.max(0, DAILY_POINTS_CAP - currentDaily);
  const rawPoints = params.basePoints + (params.streakBonus ?? 0);
  const awardedPoints = Math.min(rawPoints, remainingCap);
  const capped = awardedPoints < rawPoints;

  let nextStreak = prev.streakDays;
  if (prev.lastActiveDate !== today) {
    nextStreak = prev.lastActiveDate === yest ? prev.streakDays + 1 : 1;
  }

  const newEntry: DisposalLogEntry = {
    id: `log-${Date.now()}`,
    itemName: params.itemName,
    category: params.category,
    binName: params.binName,
    pointsEarned: awardedPoints,
    wasteScore: params.wasteScore,
    co2SavedKg: params.co2SavedKg,
    timestamp: Date.now(),
    verified: true,
  };

  const nextCategoryCounts = {
    ...prev.categoryCounts,
    [params.category]: (prev.categoryCounts[params.category] ?? 0) + 1,
  };

  const nextTotal = prev.totalItemsSorted + 1;
  const nextLifetime = prev.lifetimePoints + awardedPoints;

  const candidateBadges = new Set(prev.unlockedBadges);
  if (nextTotal >= 1) candidateBadges.add('first-scan');
  if (nextStreak >= 2 || nextTotal >= 3) candidateBadges.add('streak-3');
  if (
    nextCategoryCounts['e-waste'] > 0 ||
    nextCategoryCounts.hazardous > 0
  ) {
    candidateBadges.add('ewaste-guardian');
  }
  if (nextTotal >= 5) candidateBadges.add('sorter-5');
  if (nextLifetime >= 150) candidateBadges.add('score-150');

  const newlyUnlockedBadges = BADGE_DEFINITIONS.filter(
    (b) => candidateBadges.has(b.id) && !prev.unlockedBadges.includes(b.id)
  ).map((b) => b.name);

  const nextState: UserEcoState = {
    ...prev,
    points: prev.points + awardedPoints,
    lifetimePoints: nextLifetime,
    dailyPointsEarned: currentDaily + awardedPoints,
    dailyPointsDate: today,
    streakDays: nextStreak,
    lastActiveDate: today,
    totalItemsSorted: nextTotal,
    correctDisposals: prev.correctDisposals + 1,
    co2SavedKg: Number((prev.co2SavedKg + params.co2SavedKg).toFixed(2)),
    unlockedBadges: Array.from(candidateBadges),
    history: [newEntry, ...prev.history].slice(0, 30),
    categoryCounts: nextCategoryCounts,
  };

  saveEcoState(nextState);
  return { nextState, awardedPoints, newlyUnlockedBadges, capped };
}

export function redeemEcoReward(
  prev: UserEcoState,
  rewardId: string,
  quantity = 1
): { ok: boolean; nextState: UserEcoState; message: string } {
  const reward = ECO_REWARDS.find((r) => r.id === rewardId);
  if (!reward) {
    return { ok: false, nextState: prev, message: 'Reward not found.' };
  }
  const qty = Math.max(1, Math.min(3, Math.floor(quantity)));
  const totalCost = reward.cost * qty;
  if (prev.points < totalCost) {
    return {
      ok: false,
      nextState: prev,
      message: `Need ${totalCost - prev.points} more EcoPoints to unlock ${qty}× ${reward.title}.`,
    };
  }
  const nextState: UserEcoState = {
    ...prev,
    points: prev.points - totalCost,
    redeemedRewardIds: [...prev.redeemedRewardIds, reward.id],
  };
  saveEcoState(nextState);
  return {
    ok: true,
    nextState,
    message: `Redeemed ${qty}× "${reward.title}" from ${reward.partner}!`,
  };
}
