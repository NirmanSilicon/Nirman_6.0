import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Code2, Coins, Dices, RotateCcw, Sparkles, TrendingDown } from "lucide-react";
import type { Currency, Language } from "../types/fairplay";
import { TRANSLATIONS } from "../data/i18n";
import { InfoTooltip } from "./InfoTooltip";

interface ProbabilityLabProps {
  language: Language;
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  onAnnouncement: (message: string) => void;
}

type LabSubTab = "roulette" | "gacha" | "wheel";

interface RoulettePoint {
  spin: number;
  euBalance: number;
  usBalance: number;
  euHouseProfit: number;
  usHouseProfit: number;
}

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

const WHEEL_SLICES = [
  { label: "Grand Prize", weightLabel: "0.5% (1 in 200)", realWeight: 0.5, payoutMult: 25, color: "#F59E0B" },
  { label: "5 Gems", weightLabel: "21.0% (Near-Miss)", realWeight: 21.0, payoutMult: 0.25, color: "#1E293B" },
  { label: "Try Again", weightLabel: "19.0% Filler", realWeight: 19.0, payoutMult: 0, color: "#0F172A" },
  { label: "10 Gems", weightLabel: "11.0% Filler", realWeight: 11.0, payoutMult: 0.5, color: "#1E293B" },
  { label: "1 Coin", weightLabel: "13.0% Filler", realWeight: 13.0, payoutMult: 0.1, color: "#0F172A" },
  { label: "Bonus Ticket", weightLabel: "4.5% Minor", realWeight: 4.5, payoutMult: 1.0, color: "#1E293B" },
  { label: "5 Gems", weightLabel: "10.0% Filler", realWeight: 10.0, payoutMult: 0.25, color: "#0F172A" },
  { label: "Try Again", weightLabel: "21.0% (Near-Miss)", realWeight: 21.0, payoutMult: 0, color: "#1E293B" },
];

export function ProbabilityLab({
  language,
  currency,
  onCurrencyChange,
  onAnnouncement,
}: ProbabilityLabProps) {
  const t = TRANSLATIONS[language].lab;
  const [subTab, setSubTab] = useState<LabSubTab>("roulette");

  const symbol = currency === "INR" ? "₹" : "$";
  const formatMoney = (val: number) => `${symbol}${Math.round(val).toLocaleString()}`;
  const formatSignedMoney = (val: number) =>
    `${val >= 0 ? "+" : "-"}${symbol}${Math.round(Math.abs(val)).toLocaleString()}`;

  // -------------------- 1. ROULETTE STATE --------------------
  const startBankroll = currency === "INR" ? 10000 : 200;
  const defaultBet = currency === "INR" ? 200 : 5;

  const [betType, setBetType] = useState<"red" | "black" | "number">("red");
  const [chosenNumber, setChosenNumber] = useState<number>(17);
  const [betAmount, setBetAmount] = useState<number>(defaultBet);
  const [multiplierInput, setMultiplierInput] = useState<string>("1.98");
  const [euBalance, setEuBalance] = useState<number>(startBankroll);
  const [usBalance, setUsBalance] = useState<number>(startBankroll);
  const [euBalanceStandard, setEuBalanceStandard] = useState<number>(startBankroll);
  const [usBalanceStandard, setUsBalanceStandard] = useState<number>(startBankroll);
  const [spinCount, setSpinCount] = useState<number>(0);
  const [lastEuPocket, setLastEuPocket] = useState<string>("Ready");
  const [lastUsPocket, setLastUsPocket] = useState<string>("Ready");
  const [euWheelAngle, setEuWheelAngle] = useState<number>(0);
  const [usWheelAngle, setUsWheelAngle] = useState<number>(0);
  const [rouletteHistory, setRouletteHistory] = useState<RoulettePoint[]>([
    { spin: 0, euBalance: startBankroll, usBalance: startBankroll, euHouseProfit: 0, usHouseProfit: 0 },
  ]);

  const parsedMultiplier = Number.parseFloat(multiplierInput);
  const activeMultiplier =
    Number.isFinite(parsedMultiplier) && parsedMultiplier >= 1.01
      ? Math.min(100, parsedMultiplier)
      : 1.98;
  const activeMultiplierLabel = Number(activeMultiplier.toFixed(2)).toString();
  const activeNetWinMult = Number((activeMultiplier - 1).toFixed(2));

  const resetRoulette = (nextBankroll = startBankroll) => {
    setEuBalance(nextBankroll);
    setUsBalance(nextBankroll);
    setEuBalanceStandard(nextBankroll);
    setUsBalanceStandard(nextBankroll);
    setSpinCount(0);
    setLastEuPocket("Ready");
    setLastUsPocket("Ready");
    setRouletteHistory([
      { spin: 0, euBalance: nextBankroll, usBalance: nextBankroll, euHouseProfit: 0, usHouseProfit: 0 },
    ]);
    onAnnouncement("Roulette comparator reset to starting balance.");
  };

  const handleCurrencyToggle = (next: Currency) => {
    onCurrencyChange(next);
    const nextStart = next === "INR" ? 10000 : 200;
    const nextBet = next === "INR" ? 200 : 5;
    setBetAmount(nextBet);
    setEuBalance(nextStart);
    setUsBalance(nextStart);
    setEuBalanceStandard(nextStart);
    setUsBalanceStandard(nextStart);
    setSpinCount(0);
    setRouletteHistory([
      { spin: 0, euBalance: nextStart, usBalance: nextStart, euHouseProfit: 0, usHouseProfit: 0 },
    ]);
    setGachaCostPerPull(next === "INR" ? 160 : 2);
  };

  const evalRouletteSpin = (isAmerican: boolean) => {
    const totalPockets = isAmerican ? 38 : 37;
    const idx = Math.floor(Math.random() * totalPockets);
    // 36 -> "0", 37 -> "00"
    if (idx === 36) {
      return { label: "0 Green", won: false };
    }
    if (idx === 37) {
      return { label: "00 Green", won: false };
    }
    const num = idx === 0 ? 36 : idx;
    const isRed = RED_NUMBERS.has(num);
    const colorText = isRed ? "Red" : "Black";
    if (betType === "red") return { label: `${num} ${colorText}`, won: isRed };
    if (betType === "black") return { label: `${num} ${colorText}`, won: !isRed };
    return { label: `${num} ${colorText}`, won: num === chosenNumber };
  };

  const runRouletteSpins = (count: number) => {
    let curEu = euBalance;
    let curUs = usBalance;
    let curEuStd = euBalanceStandard;
    let curUsStd = usBalanceStandard;
    let curSpin = spinCount;
    const wager = Math.max(1, betAmount);
    const winMult = betType === "number" ? 35 : activeMultiplier - 1;
    const winMultStandard = betType === "number" ? 35 : 1.0;

    const newPoints: RoulettePoint[] = [...rouletteHistory];
    let latestEuLabel = lastEuPocket;
    let latestUsLabel = lastUsPocket;

    const sampleStep = count > 20 ? 20 : 1;

    for (let i = 1; i <= count; i++) {
      curSpin += 1;
      const euRes = evalRouletteSpin(false);
      const usRes = evalRouletteSpin(true);
      latestEuLabel = euRes.label;
      latestUsLabel = usRes.label;

      curEu += euRes.won ? wager * winMult : -wager;
      curUs += usRes.won ? wager * winMult : -wager;
      curEuStd += euRes.won ? wager * winMultStandard : -wager;
      curUsStd += usRes.won ? wager * winMultStandard : -wager;

      if (i % sampleStep === 0 || i === count) {
        newPoints.push({
          spin: curSpin,
          euBalance: Math.round(curEu),
          usBalance: Math.round(curUs),
          euHouseProfit: Math.round(startBankroll - curEu),
          usHouseProfit: Math.round(startBankroll - curUs),
        });
      }
    }

    setEuBalance(curEu);
    setUsBalance(curUs);
    setEuBalanceStandard(curEuStd);
    setUsBalanceStandard(curUsStd);
    setSpinCount(curSpin);
    setLastEuPocket(latestEuLabel);
    setLastUsPocket(latestUsLabel);
    setEuWheelAngle((prev) => prev + 360 + Math.floor(Math.random() * 240));
    setUsWheelAngle((prev) => prev + 360 + Math.floor(Math.random() * 240));
    setRouletteHistory(newPoints.slice(-120));

    onAnnouncement(
      `Simulated ${count} spins. European balance ${formatMoney(curEu)}, American balance ${formatMoney(curUs)}.`
    );
  };

  // -------------------- 2. GACHA SIMULATOR STATE --------------------
  const [dropRatePct, setDropRatePct] = useState<number>(0.6);
  const [gachaCostPerPull, setGachaCostPerPull] = useState<number>(currency === "INR" ? 160 : 2);
  const [pityLimit, setPityLimit] = useState<number>(90);
  const [totalPulls, setTotalPulls] = useState<number>(0);
  const [pityCounter, setPityCounter] = useState<number>(0);
  const [rareWins, setRareWins] = useState<number>(0);
  const [pullHistory, setPullHistory] = useState<string[]>([]);

  const gemsPerPull = 160;
  const virtualGemsSpent = totalPulls * gemsPerPull;
  const realMoneySpent = totalPulls * gachaCostPerPull;
  const cumulativeWinProb = useMemo(() => {
    const p = dropRatePct / 100;
    return (1 - Math.pow(1 - p, totalPulls)) * 100;
  }, [dropRatePct, totalPulls]);

  const executeGachaPulls = (pullsRequested: number, stopOnWin = false) => {
    let pullsDone = 0;
    let curPity = pityCounter;
    let curWins = rareWins;
    const logs: string[] = [];
    const p = dropRatePct / 100;

    for (let i = 0; i < pullsRequested; i++) {
      pullsDone += 1;
      curPity += 1;
      const isPity = curPity >= pityLimit;
      const won = isPity || Math.random() < p;

      if (won) {
        curWins += 1;
        logs.unshift(
          `Pull #${totalPulls + pullsDone}: ★ RARE WIN (${isPity ? "Pity Triggered" : "Lucky RNG"})`
        );
        curPity = 0;
        if (stopOnWin) break;
      } else {
        logs.unshift(`Pull #${totalPulls + pullsDone}: Common Duplicate`);
      }
    }

    setTotalPulls((prev) => prev + pullsDone);
    setPityCounter(curPity);
    setRareWins(curWins);
    setPullHistory((prev) => [...logs, ...prev].slice(0, 12));

    onAnnouncement(
      `Executed ${pullsDone} gacha pull${pullsDone > 1 ? "s" : ""}. Total spent ${formatMoney(
        (totalPulls + pullsDone) * gachaCostPerPull
      )}, total rare wins ${curWins}.`
    );
  };

  const resetGacha = () => {
    setTotalPulls(0);
    setPityCounter(0);
    setRareWins(0);
    setPullHistory([]);
    onAnnouncement("Gacha simulator reset.");
  };

  const aaaGamePrice = currency === "INR" ? 2499 : 60;
  const aaaGamesEquivalent = (realMoneySpent / aaaGamePrice).toFixed(1);

  // -------------------- 3. WEIGHTED WHEEL STATE --------------------
  const [revealCodeOdds, setRevealCodeOdds] = useState<boolean>(false);
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [wheelSpins, setWheelSpins] = useState<number>(0);
  const [nearMissCount, setNearMissCount] = useState<number>(0);
  const [wheelNetProfit, setWheelNetProfit] = useState<number>(0);
  const [wheelOutcome, setWheelOutcome] = useState<string>("Ready to spin");
  const spinTicketCost = currency === "INR" ? 100 : 2;

  const spinWeightedWheel = () => {
    const roll = Math.random() * 100;
    let cumulative = 0;
    let chosenIdx = 1;
    for (let i = 0; i < WHEEL_SLICES.length; i++) {
      cumulative += WHEEL_SLICES[i].realWeight;
      if (roll <= cumulative) {
        chosenIdx = i;
        break;
      }
    }

    // Slice center angle in SVG (slice 0 centered at top = 0 deg)
    const sliceCenterDeg = chosenIdx * 45;
    // Rotate wheel so chosen slice lands under top pointer (0 deg)
    const targetMod = (360 - sliceCenterDeg) % 360;
    const baseSpins = 1440; // 4 full turns
    const currentMod = wheelRotation % 360;
    const delta = baseSpins + ((targetMod - currentMod + 360) % 360);
    setWheelRotation((prev) => prev + delta);

    const slice = WHEEL_SLICES[chosenIdx];
    const payout = spinTicketCost * slice.payoutMult;
    const netChange = payout - spinTicketCost;

    const isNearMiss = chosenIdx === 1 || chosenIdx === 7;
    if (isNearMiss) {
      setNearMissCount((prev) => prev + 1);
    }

    setWheelSpins((prev) => prev + 1);
    setWheelNetProfit((prev) => prev + netChange);
    const outcomeText = isNearMiss
      ? `${slice.label} — Near-Miss! Stopped 1 slice away from Grand Prize.`
      : `${slice.label} (Returned ${formatMoney(payout)})`;
    setWheelOutcome(outcomeText);
    onAnnouncement(`Wheel spin #${wheelSpins + 1}: ${outcomeText}`);
  };

  return (
    <section aria-labelledby="lab-heading" className="space-y-6">
      {/* Lab Header + Currency Switcher + Sub-Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-[#111827] p-6">
        <div>
          <h1 id="lab-heading" className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-50">
            {t.title}
          </h1>
          <p className="mt-1.5 text-sm text-slate-300">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Currency Toggle */}
          <div
            role="group"
            aria-label="Select simulator currency"
            className="inline-flex items-center rounded-lg border border-slate-700 bg-[#0B1120] p-1"
          >
            <button
              type="button"
              onClick={() => handleCurrencyToggle("INR")}
              aria-pressed={currency === "INR"}
              aria-label="Use Indian Rupees currency"
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                currency === "INR" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ₹ INR
            </button>
            <button
              type="button"
              onClick={() => handleCurrencyToggle("USD")}
              aria-pressed={currency === "USD"}
              aria-label="Use US Dollars currency"
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                currency === "USD" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              $ USD
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Probability simulators"
        className="flex flex-wrap gap-2 border-b border-slate-800 pb-3"
      >
        {(
          [
            { id: "roulette", label: t.subtabs.roulette },
            { id: "gacha", label: t.subtabs.gacha },
            { id: "wheel", label: t.subtabs.wheel },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={subTab === item.id}
            aria-label={`Open ${item.label} simulator`}
            onClick={() => setSubTab(item.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              subTab === item.id
                ? "bg-indigo-600 text-white"
                : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ==================== SIMULATOR 1: ROULETTE ==================== */}
      {subTab === "roulette" && (
        <div role="tabpanel" aria-label={t.rouletteTitle} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Stage: Side-by-Side Boards & Line Chart */}
            <div className="lg:col-span-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* European Wheel Card */}
                <div className="rounded-xl border border-slate-800 bg-[#111827] p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-emerald-400">{t.europeanTitle}</h2>
                    <span className="font-mono text-xs text-slate-400 tabular-nums">1 Green (0)</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <svg
                      viewBox="0 0 100 100"
                      className="w-24 h-24 shrink-0"
                      style={{
                        transform: `rotate(${euWheelAngle}deg)`,
                        transition: "transform 500ms cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                      role="img"
                      aria-label="European Roulette wheel with 37 pockets and single green zero"
                    >
                      <circle cx="50" cy="50" r="46" fill="#0B1120" stroke="#334155" strokeWidth="3" />
                      <circle cx="50" cy="50" r="35" fill="none" stroke="#EF4444" strokeWidth="10" strokeDasharray="6 6" />
                      <path d="M 50 50 L 45 10 A 40 40 0 0 1 55 10 Z" fill="#10B981" />
                      <circle cx="50" cy="50" r="14" fill="#1E293B" stroke="#64748B" strokeWidth="2" />
                    </svg>

                    <div className="space-y-1">
                      <div className="text-xs text-slate-400">Player Balance</div>
                      <div className="font-mono text-2xl font-bold text-slate-50 tabular-nums">
                        {formatMoney(euBalance)}
                      </div>
                      <div className="text-xs text-slate-400">
                        Last pocket: <span className="text-slate-200 font-medium">{lastEuPocket}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* American Wheel Card */}
                <div className="rounded-xl border border-slate-800 bg-[#111827] p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-red-400">{t.americanTitle}</h2>
                    <span className="font-mono text-xs text-slate-400 tabular-nums">2 Green (0, 00)</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <svg
                      viewBox="0 0 100 100"
                      className="w-24 h-24 shrink-0"
                      style={{
                        transform: `rotate(${usWheelAngle}deg)`,
                        transition: "transform 500ms cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                      role="img"
                      aria-label="American Roulette wheel with 38 pockets and double green zero and double zero"
                    >
                      <circle cx="50" cy="50" r="46" fill="#0B1120" stroke="#334155" strokeWidth="3" />
                      <circle cx="50" cy="50" r="35" fill="none" stroke="#EF4444" strokeWidth="10" strokeDasharray="6 6" />
                      <path d="M 50 50 L 45 10 A 40 40 0 0 1 55 10 Z" fill="#10B981" />
                      <path d="M 50 50 L 45 90 A 40 40 0 0 0 55 90 Z" fill="#10B981" />
                      <circle cx="50" cy="50" r="14" fill="#1E293B" stroke="#64748B" strokeWidth="2" />
                    </svg>

                    <div className="space-y-1">
                      <div className="text-xs text-slate-400">Player Balance</div>
                      <div className="font-mono text-2xl font-bold text-slate-50 tabular-nums">
                        {formatMoney(usBalance)}
                      </div>
                      <div className="text-xs text-slate-400">
                        Last pocket: <span className="text-slate-200 font-medium">{lastUsPocket}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Chart: Player Balance vs. House Profit */}
              <div className="rounded-xl border border-slate-800 bg-[#111827] p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center">
                    <h3 className="text-sm font-semibold text-slate-100">
                      Player Balance vs. House Profit ({spinCount.toLocaleString()} Spins)
                    </h3>
                    <InfoTooltip
                      term="House Edge"
                      explanation="The built-in mathematical advantage the casino/house keeps on every bet. Adding just one extra green pocket (00) nearly doubles the house edge from 2.70% to 5.26%."
                    />
                  </div>
                  <span className="font-mono text-xs text-slate-400 tabular-nums">
                    American House Profit: {formatMoney(startBankroll - usBalance)}
                  </span>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rouletteHistory} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                      <XAxis dataKey="spin" stroke="#94A3B8" fontSize={11} />
                      <YAxis stroke="#94A3B8" fontSize={11} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "#0F172A",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Line
                        type="monotone"
                        dataKey="euBalance"
                        name="European Player Balance"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="usBalance"
                        name="American Player Balance"
                        stroke="#EF4444"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="usHouseProfit"
                        name="American House Profit"
                        stroke="#F59E0B"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Custom Payout Multiplier Breakdown Card */}
              <div className="rounded-xl border border-indigo-500/30 bg-[#111827] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-100">
                    Winnings &amp; Losses Under {activeMultiplierLabel}x Payout
                  </h3>
                  <span className="text-xs text-slate-400 font-mono tabular-nums">
                    Custom Multiplier · {activeMultiplierLabel}x Return ({activeNetWinMult}x Net Win)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* European Custom Multiplier Card */}
                  <div className="rounded-lg border border-slate-800 bg-[#0B1120] p-4 space-y-2">
                    <div className="flex justify-between items-center text-xs text-emerald-400 font-medium">
                      <span>European Wheel ({activeMultiplierLabel}x)</span>
                      <span className="font-mono tabular-nums">{spinCount.toLocaleString()} spins</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-400">Balance:</span>
                      <span className="font-mono text-lg font-bold text-slate-50 tabular-nums">
                        {formatMoney(euBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-slate-400">Net P&amp;L:</span>
                      <span
                        className={`font-mono font-semibold tabular-nums ${
                          euBalance >= startBankroll ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {formatSignedMoney(euBalance - startBankroll)}
                      </span>
                    </div>
                  </div>

                  {/* American Custom Multiplier Card */}
                  <div className="rounded-lg border border-slate-800 bg-[#0B1120] p-4 space-y-2">
                    <div className="flex justify-between items-center text-xs text-red-400 font-medium">
                      <span>American Wheel ({activeMultiplierLabel}x)</span>
                      <span className="font-mono tabular-nums">{spinCount.toLocaleString()} spins</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-400">Balance:</span>
                      <span className="font-mono text-lg font-bold text-slate-50 tabular-nums">
                        {formatMoney(usBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-slate-400">Net P&amp;L:</span>
                      <span
                        className={`font-mono font-semibold tabular-nums ${
                          usBalance >= startBankroll ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {formatSignedMoney(usBalance - startBankroll)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-3 text-xs text-indigo-200 leading-relaxed">
                  <span className="font-semibold text-indigo-300">Analysis: </span>
                  At a {activeMultiplierLabel}x payout multiplier, winning even-money bets return {activeNetWinMult}x net profit instead of 1.0x. Over {spinCount.toLocaleString()} spins, compared to a standard 2.0x payout, your difference is{" "}
                  <span className="font-mono font-semibold tabular-nums">
                    {formatSignedMoney(euBalance - euBalanceStandard)}
                  </span>{" "}
                  on European roulette and{" "}
                  <span className="font-mono font-semibold tabular-nums">
                    {formatSignedMoney(usBalance - usBalanceStandard)}
                  </span>{" "}
                  on American roulette.
                </div>
              </div>
            </div>

            {/* Right Control Deck */}
            <div className="lg:col-span-4 rounded-xl border border-slate-800 bg-[#111827] p-5 space-y-5">
              <div>
                <h2 className="text-base font-semibold text-slate-100">{t.rouletteTitle}</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{t.rouletteDesc}</p>
              </div>

              {/* Manual Payout Multiplier Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="roulette-multiplier" className="block text-xs font-medium text-slate-300">
                    Even-Money Multiplier (x)
                  </label>
                  <span className="font-mono text-[11px] text-indigo-300 tabular-nums">
                    Net win: +{activeNetWinMult}x
                  </span>
                </div>
                <input
                  id="roulette-multiplier"
                  type="number"
                  min={1.01}
                  max={100}
                  step={0.01}
                  value={multiplierInput}
                  onChange={(e) => setMultiplierInput(e.target.value)}
                  onBlur={() => setMultiplierInput(activeMultiplierLabel)}
                  placeholder="e.g. 1.98"
                  aria-label="Enter custom even-money payout multiplier"
                  className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 font-mono text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-medium text-slate-300">Choose Bet Type</span>
                <div className="grid grid-cols-3 gap-2" role="group" aria-label="Roulette bet type">
                  {(
                    [
                      { id: "red", label: `Red (${activeMultiplierLabel}x)` },
                      { id: "black", label: `Black (${activeMultiplierLabel}x)` },
                      { id: "number", label: "Single # (35:1)" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={betType === opt.id}
                      aria-label={`Bet on ${opt.label}`}
                      onClick={() => setBetType(opt.id)}
                      className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                        betType === opt.id
                          ? "border-indigo-500 bg-indigo-500/15 text-indigo-200"
                          : "border-slate-800 bg-[#0B1120] text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {betType === "number" && (
                <div>
                  <label htmlFor="roulette-number" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Pick Number (1–36)
                  </label>
                  <input
                    id="roulette-number"
                    type="number"
                    min={1}
                    max={36}
                    value={chosenNumber}
                    onChange={(e) => setChosenNumber(Math.max(1, Math.min(36, Number(e.target.value) || 1)))}
                    aria-label="Pick roulette number between 1 and 36"
                    className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 font-mono text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label htmlFor="roulette-wager" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Bet Per Spin ({symbol})
                </label>
                <input
                  id="roulette-wager"
                  type="number"
                  min={1}
                  max={startBankroll}
                  value={betAmount}
                  onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value) || 1))}
                  aria-label={`Bet amount per spin in ${currency}`}
                  className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 font-mono text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => runRouletteSpins(1)}
                  aria-label="Spin both European and American roulette wheels once"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-100 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
                >
                  <Dices className="h-4 w-4 text-indigo-400" aria-hidden="true" />
                  <span>{t.spinOnce}</span>
                </button>

                <button
                  type="button"
                  onClick={() => runRouletteSpins(1000)}
                  aria-label="Simulate 1,000 roulette spins to compare house edge"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 transition-colors"
                >
                  <TrendingDown className="h-4 w-4" aria-hidden="true" />
                  <span>{t.simulate1000}</span>
                </button>

                <button
                  type="button"
                  onClick={() => resetRoulette()}
                  aria-label="Reset roulette simulation"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-transparent px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t.resetSim}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SIMULATOR 2: GACHA TRUE COST ==================== */}
      {subTab === "gacha" && (
        <div role="tabpanel" aria-label={t.gachaTitle} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Stage: Live Counters & Reality Check */}
          <div className="lg:col-span-7 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
                <div className="text-xs text-slate-400">Total Pulls</div>
                <div className="mt-1 font-mono text-2xl font-bold text-slate-50 tabular-nums">
                  {totalPulls}
                </div>
                <div className="mt-1 text-[11px] text-slate-400 tabular-nums">
                  Pity: {pityCounter}/{pityLimit}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
                <div className="text-xs text-slate-400">Virtual Gems</div>
                <div className="mt-1 font-mono text-2xl font-bold text-indigo-300 tabular-nums">
                  {virtualGemsSpent.toLocaleString()}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">160 / pull</div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
                <div className="text-xs text-slate-400">Real Money Burned</div>
                <div className="mt-1 font-mono text-2xl font-bold text-red-400 tabular-nums">
                  {formatMoney(realMoneySpent)}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">Actual cost</div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
                <div className="text-xs text-slate-400">Rare Wins</div>
                <div className="mt-1 font-mono text-2xl font-bold text-emerald-400 tabular-nums">
                  {rareWins}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">5-Star drops</div>
              </div>
            </div>

            {/* Probability Formula & Reality Check Callout */}
            <div className="rounded-xl border border-slate-800 bg-[#111827] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-100">Cumulative Probability Formula</h2>
                <span className="font-mono text-sm font-bold text-amber-300 tabular-nums">
                  {cumulativeWinProb.toFixed(2)}% chance after {totalPulls} pulls
                </span>
              </div>

              <div className="rounded-lg border border-slate-800 bg-[#0B1120] p-4 font-mono text-xs sm:text-sm text-slate-200">
                P(at least 1 rare win) = 1 - (1 - {(dropRatePct / 100).toFixed(3)})
                <sup>{totalPulls}</sup> = {cumulativeWinProb.toFixed(2)}%
              </div>

              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-100">
                <span className="font-semibold text-amber-300">Reality Check: </span>
                {realMoneySpent === 0
                  ? "Start pulling to see how virtual gem bundles quietly convert into real-world spending."
                  : `You have spent ${formatMoney(realMoneySpent)} (${virtualGemsSpent.toLocaleString()} virtual gems) — equivalent to buying ${aaaGamesEquivalent} full AAA/indie games outright without any gambling!`}
              </div>
            </div>

            {/* Pull Log */}
            <div className="rounded-xl border border-slate-800 bg-[#111827] p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-100">Recent Summon Log</h3>
              {pullHistory.length === 0 ? (
                <p className="text-xs text-slate-400">No pulls executed yet. Use the controls on the right.</p>
              ) : (
                <ul className="space-y-1.5 font-mono text-xs" aria-live="polite">
                  {pullHistory.map((entry, idx) => (
                    <li
                      key={`${entry}-${idx}`}
                      className={`rounded px-2.5 py-1.5 ${
                        entry.includes("RARE WIN")
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-[#0B1120] text-slate-400"
                      }`}
                    >
                      {entry}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right Sliders & Controls */}
          <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#111827] p-5 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-100">{t.gachaTitle}</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{t.gachaDesc}</p>
            </div>

            {/* Drop Rate Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <label htmlFor="gacha-drop-rate" className="font-medium text-slate-200">
                  Rare Drop Rate
                </label>
                <span className="font-mono font-semibold text-indigo-300 tabular-nums">
                  {dropRatePct.toFixed(1)}%
                </span>
              </div>
              <input
                id="gacha-drop-rate"
                type="range"
                min={0.1}
                max={5.0}
                step={0.1}
                value={dropRatePct}
                onChange={(e) => setDropRatePct(Number(e.target.value))}
                aria-label="Rare item drop rate percentage"
                aria-valuemin={0.1}
                aria-valuemax={5.0}
                aria-valuenow={dropRatePct}
                aria-valuetext={`${dropRatePct.toFixed(1)} percent`}
                className="guardian-slider w-full"
              />
            </div>

            {/* Cost Per Pull Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <label htmlFor="gacha-cost" className="font-medium text-slate-200">
                  Real Cost per Pull
                </label>
                <span className="font-mono font-semibold text-indigo-300 tabular-nums">
                  {formatMoney(gachaCostPerPull)}
                </span>
              </div>
              <input
                id="gacha-cost"
                type="range"
                min={currency === "INR" ? 40 : 1}
                max={currency === "INR" ? 500 : 10}
                step={currency === "INR" ? 20 : 1}
                value={gachaCostPerPull}
                onChange={(e) => setGachaCostPerPull(Number(e.target.value))}
                aria-label={`Cost per gacha pull in ${currency}`}
                aria-valuemin={currency === "INR" ? 40 : 1}
                aria-valuemax={currency === "INR" ? 500 : 10}
                aria-valuenow={gachaCostPerPull}
                aria-valuetext={formatMoney(gachaCostPerPull)}
                className="guardian-slider w-full"
              />
            </div>

            {/* Pity Limit Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <label htmlFor="gacha-pity" className="font-medium text-slate-200">
                  Guaranteed Pity Limit
                </label>
                <span className="font-mono font-semibold text-indigo-300 tabular-nums">
                  {pityLimit} pulls
                </span>
              </div>
              <input
                id="gacha-pity"
                type="range"
                min={20}
                max={180}
                step={10}
                value={pityLimit}
                onChange={(e) => setPityLimit(Number(e.target.value))}
                aria-label="Guaranteed pity threshold in pulls"
                aria-valuemin={20}
                aria-valuemax={180}
                aria-valuenow={pityLimit}
                aria-valuetext={`${pityLimit} pulls`}
                className="guardian-slider w-full"
              />
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => executeGachaPulls(1)}
                  aria-label="Execute 1 gacha pull"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-100 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
                >
                  <Coins className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
                  <span>{t.singlePull}</span>
                </button>

                <button
                  type="button"
                  onClick={() => executeGachaPulls(10)}
                  aria-label="Execute 10 gacha pulls"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t.tenPull}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => executeGachaPulls(pityLimit, true)}
                aria-label="Pull continuously until obtaining 1 rare win"
                className="w-full rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition-colors"
              >
                {t.pullUntilWin}
              </button>

              <button
                type="button"
                onClick={resetGacha}
                aria-label="Reset gacha counter"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-800 px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t.resetSim}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SIMULATOR 3: WEIGHTED WHEEL ==================== */}
      {subTab === "wheel" && (
        <div role="tabpanel" aria-label={t.wheelTitle} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Visual Wheel */}
          <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-[#111827] p-6 flex flex-col items-center space-y-5">
            <div className="w-full flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-100">{t.wheelTitle}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{t.wheelDesc}</p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={revealCodeOdds}
                aria-label="Reveal True Code Odds overlay on spinning wheel"
                onClick={() => setRevealCodeOdds((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  revealCodeOdds
                    ? "border-red-500/50 bg-red-500/15 text-red-300"
                    : "border-slate-700 bg-[#0B1120] text-slate-200 hover:bg-slate-800"
                }`}
              >
                <Code2 className="h-4 w-4" aria-hidden="true" />
                <span>{t.revealCodeOdds}</span>
              </button>
            </div>

            {/* Pointer + SVG Wheel */}
            <div className="relative flex flex-col items-center py-2">
              <div
                aria-hidden="true"
                className="z-10 -mb-2 h-0 w-0 border-x-[10px] border-t-[16px] border-x-transparent border-t-indigo-400"
              />
              <svg
                viewBox="0 0 300 300"
                className="w-72 h-72 sm:w-80 sm:h-80"
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  transition: "transform 1100ms cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                role="img"
                aria-label="8-slice prize wheel appearing visually equal at 12.5 percent per slice"
              >
                <circle cx="150" cy="150" r="144" fill="#0B1120" stroke="#334155" strokeWidth="4" />
                {WHEEL_SLICES.map((slice, idx) => {
                  const startDeg = idx * 45 - 22.5 - 90;
                  const endDeg = startDeg + 45;
                  const rad = (d: number) => (d * Math.PI) / 180;
                  const x1 = 150 + 138 * Math.cos(rad(startDeg));
                  const y1 = 150 + 138 * Math.sin(rad(startDeg));
                  const x2 = 150 + 138 * Math.cos(rad(endDeg));
                  const y2 = 150 + 138 * Math.sin(rad(endDeg));
                  const textAngle = idx * 45;

                  return (
                    <g key={`${slice.label}-${idx}`}>
                      <path
                        d={`M 150 150 L ${x1} ${y1} A 138 138 0 0 1 ${x2} ${y2} Z`}
                        fill={slice.color}
                        stroke="#334155"
                        strokeWidth="1.5"
                      />
                      <g transform={`translate(150, 150) rotate(${textAngle})`}>
                        <text
                          x="0"
                          y="-95"
                          textAnchor="middle"
                          className={`text-[10px] font-bold ${
                            idx === 0 ? "fill-slate-950" : "fill-slate-100"
                          }`}
                        >
                          {slice.label}
                        </text>
                        <text
                          x="0"
                          y="-80"
                          textAnchor="middle"
                          className={`text-[8px] font-mono ${
                            idx === 0 ? "fill-slate-900" : "fill-indigo-300"
                          }`}
                        >
                          {revealCodeOdds ? `${slice.realWeight}%` : "12.5% visual"}
                        </text>
                      </g>
                    </g>
                  );
                })}
                <circle cx="150" cy="150" r="24" fill="#111827" stroke="#6366F1" strokeWidth="3" />
              </svg>
            </div>

            <div className="w-full rounded-lg border border-slate-800 bg-[#0B1120] p-3.5 text-center text-xs text-slate-200" aria-live="polite">
              <span className="text-slate-400">Outcome: </span>
              <span className="font-semibold">{wheelOutcome}</span>
            </div>

            <button
              type="button"
              onClick={spinWeightedWheel}
              aria-label={`Spin prize wheel for ${formatMoney(spinTicketCost)}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 transition-colors"
            >
              <Dices className="h-4 w-4" aria-hidden="true" />
              <span>
                {t.spinWheel} ({formatMoney(spinTicketCost)})
              </span>
            </button>
          </div>

          {/* Right Stats & Code Inspector */}
          <div className="lg:col-span-5 space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
                <div className="text-xs text-slate-400">Total Spins</div>
                <div className="mt-1 font-mono text-xl font-bold text-slate-50 tabular-nums">
                  {wheelSpins}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
                <div className="text-xs text-slate-400">Near-Misses</div>
                <div className="mt-1 font-mono text-xl font-bold text-amber-400 tabular-nums">
                  {nearMissCount}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
                <div className="text-xs text-slate-400">Net P&amp;L</div>
                <div
                  className={`mt-1 font-mono text-xl font-bold tabular-nums ${
                    wheelNetProfit >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {wheelNetProfit >= 0 ? "+" : "-"}
                  {formatMoney(Math.abs(wheelNetProfit))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#111827] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-100">
                  {revealCodeOdds ? "Actual Server Weight Table (Exposed)" : "What Players Think vs. Reality"}
                </h3>
              </div>

              {revealCodeOdds ? (
                <div className="space-y-2 font-mono text-xs">
                  {WHEEL_SLICES.map((s, idx) => (
                    <div
                      key={`${s.label}-${idx}`}
                      className="flex items-center justify-between rounded bg-[#0B1120] px-3 py-2"
                    >
                      <span className={idx === 0 ? "text-amber-300 font-semibold" : "text-slate-300"}>
                        Slice {idx + 1}: {s.label}
                      </span>
                      <span className={idx === 1 || idx === 7 ? "text-red-400" : "text-slate-400"}>
                        {s.weightLabel}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-slate-300">
                  Visually, the Grand Prize slice takes up 45° (12.5% of the circle), leading players to
                  assume a 1-in-8 chance. Toggle{" "}
                  <strong className="text-slate-100">{t.revealCodeOdds}</strong> to inspect the real
                  server weights and 42% intentional 1-tick near-miss stops.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
