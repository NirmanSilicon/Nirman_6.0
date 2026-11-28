import React, { useState } from 'react';
import {
  Award,
  Flame,
  Leaf,
  Trophy,
  Gift,
  CheckCircle2,
  History,
  X,
  Sparkles,
} from 'lucide-react';
import { EcoReward, UserEcoState } from '../types/eco';
import {
  BADGE_DEFINITIONS,
  DAILY_POINTS_CAP,
  ECO_REWARDS,
  LEADERBOARD_PEERS,
  WASTE_CATEGORIES,
} from '../data/wasteDatabase';
import AICheckout from './kokonutui/ai-checkout';
import AnimatedContent from './AnimatedContent';
import SpecularButton from './SpecularButton';

interface RewardsHubProps {
  ecoState: UserEcoState;
  onRedeem: (rewardId: string, quantity?: number) => { ok: boolean; message: string };
  userName?: string;
}

export const RewardsHub: React.FC<RewardsHubProps> = ({ ecoState, onRedeem, userName }) => {
  const [redeemNote, setRedeemNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [checkoutReward, setCheckoutReward] = useState<EcoReward | null>(null);
  const [remotePeers, setRemotePeers] = useState<
    Array<{ name: string; team: string; points: number; streak: number }>
  >([]);

  React.useEffect(() => {
    fetch('/api/leaderboard')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.entries) setRemotePeers(d.entries);
      })
      .catch(() => {});
  }, [ecoState.lifetimePoints]);

  const peerMap = new Map<string, { name: string; team: string; points: number; streak: number; isUser?: boolean }>();
  for (const p of LEADERBOARD_PEERS) peerMap.set(p.name, p);
  for (const rp of remotePeers) peerMap.set(rp.name, rp);
  const userDisplay = userName || 'You (EcoPulse Explorer)';
  peerMap.set(userDisplay, {
    name: userDisplay,
    team: `${ecoState.totalItemsSorted} items sorted`,
    points: ecoState.lifetimePoints,
    streak: ecoState.streakDays,
    isUser: true,
  });

  const combinedLeaderboard = Array.from(peerMap.values()).sort(
    (a, b) => b.points - a.points
  );

  const dailyPct = Math.min(
    100,
    Math.round((ecoState.dailyPointsEarned / DAILY_POINTS_CAP) * 100)
  );

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <AnimatedContent
        distance={80}
        direction="vertical"
        duration={0.8}
        ease="power3.out"
        blur={0}
        stagger={0.08}
        threshold={0.1}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-semibold text-slate-500">Available EcoPoints</span>
            <Award className="w-5 h-5" />
          </div>
          <p className="font-display font-extrabold text-3xl text-slate-900">
            {ecoState.points}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Lifetime earned: {ecoState.lifetimePoints} pts
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-amber-500 mb-2">
            <span className="text-xs font-semibold text-slate-500">Daily Cap Progress</span>
            <Flame className="w-5 h-5" />
          </div>
          <p className="font-display font-extrabold text-3xl text-slate-900">
            {ecoState.dailyPointsEarned}
            <span className="text-base font-semibold text-slate-400">/{DAILY_POINTS_CAP}</span>
          </p>
          <div className="h-2 rounded-full bg-slate-100 mt-2 overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full"
              style={{ width: `${dailyPct}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-semibold text-slate-500">Active Streak</span>
            <Trophy className="w-5 h-5" />
          </div>
          <p className="font-display font-extrabold text-3xl text-slate-900">
            {ecoState.streakDays} <span className="text-base font-semibold text-slate-500">days</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {ecoState.totalItemsSorted} verified bin disposals
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-teal-600 mb-2">
            <span className="text-xs font-semibold text-slate-500">CO₂e Diverted</span>
            <Leaf className="w-5 h-5" />
          </div>
          <p className="font-display font-extrabold text-3xl text-slate-900">
            {ecoState.co2SavedKg.toFixed(2)} <span className="text-base font-semibold text-slate-500">kg</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Prevented from landfill</p>
        </div>
      </AnimatedContent>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Badges & Partner Incentives */}
        <AnimatedContent
          distance={90}
          direction="vertical"
          duration={0.8}
          ease="power3.out"
          blur={0}
          stagger={0.08}
          threshold={0.1}
          className="lg:col-span-7 space-y-6"
        >
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-display font-bold text-base text-slate-900 mb-3">
              Earned Circularity Badges
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {BADGE_DEFINITIONS.map((b) => {
                const unlocked = ecoState.unlockedBadges.includes(b.id);
                return (
                  <div
                    key={b.id}
                    className={`p-3.5 rounded-2xl border ${
                      unlocked
                        ? 'border-emerald-200 bg-emerald-50/70'
                        : 'border-slate-200 bg-slate-50 opacity-60'
                    }`}
                  >
                    <div className="text-2xl mb-1">{b.icon}</div>
                    <p className="text-xs font-bold text-slate-900">{b.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{b.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                <Gift className="w-4 h-4 text-emerald-600" />
                Partner Green Incentives
              </h3>
              <span className="text-xs text-slate-500">Redeem EcoPoints</span>
            </div>

            {redeemNote && (
              <div
                className={`mb-3 p-3 rounded-xl text-xs font-semibold ${
                  redeemNote.ok
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {redeemNote.text}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ECO_REWARDS.map((r) => {
                const redeemed = ecoState.redeemedRewardIds.includes(r.id);
                return (
                  <div
                    key={r.id}
                    className="p-4 rounded-2xl border border-slate-200 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{r.badge}</span>
                        <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                          {r.cost} pts
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 mt-2">{r.title}</h4>
                      <p className="text-[11px] text-emerald-700 font-medium">{r.partner}</p>
                      <p className="text-xs text-slate-500 mt-1">{r.description}</p>
                    </div>
                    <SpecularButton
                      size="sm"
                      radius={18}
                      tint="#ffffff"
                      tintOpacity={0.04}
                      textColor="#f5f5f5"
                      lineColor="#ffffff"
                      baseColor="#525252"
                      surfaceColor={redeemed ? '#047857' : '#18181b'}
                      intensity={1}
                      idleIntensity={0.35}
                      shineSize={10}
                      shineFade={34}
                      thickness={1.2}
                      glow={1}
                      followMouse
                      proximity={250}
                      fullWidth
                      disabled={redeemed}
                      onClick={() => setCheckoutReward(r)}
                    >
                      {redeemed ? '✓ Redeemed' : `AI Checkout (${r.cost} pts)`}
                    </SpecularButton>
                  </div>
                );
              })}
            </div>
          </div>
        </AnimatedContent>

        {/* Leaderboard & Disposal Log */}
        <AnimatedContent
          distance={90}
          direction="vertical"
          duration={0.8}
          ease="power3.out"
          blur={0}
          stagger={0.08}
          threshold={0.1}
          delay={0.1}
          className="lg:col-span-5 space-y-6"
        >
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-display font-bold text-base text-slate-900 mb-3">
              NeuroNexus Community Leaderboard
            </h3>
            <div className="space-y-2">
              {combinedLeaderboard.map((row, idx) => {
                const isUser = 'isUser' in row && row.isUser;
                return (
                  <div
                    key={row.name}
                    className={`flex items-center justify-between p-3 rounded-2xl border ${
                      isUser
                        ? 'bg-emerald-50 border-emerald-300'
                        : 'bg-slate-50/70 border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                          idx === 0
                            ? 'bg-amber-400 text-slate-950'
                            : idx === 1
                              ? 'bg-slate-300 text-slate-900'
                              : idx === 2
                                ? 'bg-amber-700 text-white'
                                : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{row.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {row.team} · 🔥 {row.streak}d streak
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-700">
                      {row.points} pts
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-display font-bold text-base text-slate-900 mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              Verified Disposal Log
            </h3>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {ecoState.history.map((h) => {
                const cat = WASTE_CATEGORIES[h.category];
                return (
                  <div
                    key={h.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{h.itemName}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {cat.binName} · Score {h.wasteScore}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 font-bold text-emerald-700 ml-2">
                      +{h.pointsEarned} pts
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </AnimatedContent>
      </div>

      {/* KokonutUI AI Checkout Modal for Partner Eco-Rewards */}
      {checkoutReward && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setCheckoutReward(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-5 border border-slate-200 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </span>
                <span className="font-display font-bold text-sm text-slate-900">
                  EcoPulse AI Rewards Checkout
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutReward(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <AICheckout
              key={checkoutReward.id}
              prompt={`Redeem my EcoPoints for ${checkoutReward.title}`}
              message={`You have ${ecoState.points} EcoPoints available in your EcoPulse wallet. Confirm your reward below:`}
              confirmation="Done! Your partner green incentive voucher is now saved in your EcoPulse Rewards profile."
              checkout={{
                merchant: checkoutReward.partner,
                item: {
                  title: checkoutReward.title,
                  subtitle: checkoutReward.description,
                  unitPrice: checkoutReward.cost,
                  quantity: 1,
                  maxQuantity: 3,
                  icon: <span>{checkoutReward.badge}</span>,
                },
                taxRate: 0,
                cardLast4: 'ECOP',
                delivery: 'Instant digital voucher',
              }}
              formatAmount={(pts) => `${pts} pts`}
              payActionLabel="Redeem"
              shippingLabel="Instant"
              paymentMethodLabel={`EcoWallet (${ecoState.points} pts)`}
              onPay={async (qty) => {
                await new Promise((resolve) => setTimeout(resolve, 650));
                const res = onRedeem(checkoutReward.id, qty);
                if (!res.ok) {
                  throw new Error(res.message);
                }
                setRedeemNote({ ok: true, text: res.message });
                return `ECO-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
