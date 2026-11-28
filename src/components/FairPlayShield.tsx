import { useEffect, useState } from "react";
import {
  AlertOctagon,
  Calculator,
  CheckCircle2,
  Chrome,
  Clock,
  Gamepad2,
  Monitor,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Swords,
  Wrench,
  X,
} from "lucide-react";
import type { Language } from "../types/fairplay";
import { TRANSLATIONS } from "../data/i18n";

interface FairPlayShieldProps {
  language: Language;
  onJumpToLab: () => void;
  onJumpToScanner: () => void;
  onAnnouncement: (message: string) => void;
}

type ShieldMode = "pc" | "extension";
type ActiveModal =
  | null
  | { type: "safe"; featureName: string; detail: string }
  | { type: "gambling-raw"; triggerName: string }
  | { type: "shield-blocked"; triggerName: string }
  | { type: "math-breakdown"; triggerName: string };

export function FairPlayShield({
  language,
  onJumpToLab,
  onJumpToScanner,
  onAnnouncement,
}: FairPlayShieldProps) {
  const t = TRANSLATIONS[language].shield;

  const [mode, setMode] = useState<ShieldMode>("pc");
  const [shieldEnabled, setShieldEnabled] = useState<boolean>(true);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [blockedCount, setBlockedCount] = useState<number>(0);
  const [fomoSeconds, setFomoSeconds] = useState<number>(179);
  const [lobbyImgError, setLobbyImgError] = useState<boolean>(false);
  const [storeImgError, setStoreImgError] = useState<boolean>(false);
  const [storeWarningDismissed, setStoreWarningDismissed] = useState<boolean>(false);
  const [purchaseNotice, setPurchaseNotice] = useState<string | null>(null);

  useEffect(() => {
    if (activeModal?.type !== "gambling-raw") return;
    const timer = window.setInterval(() => {
      setFomoSeconds((prev) => (prev > 1 ? prev - 1 : 179));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeModal]);

  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `0${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleToggleShield = () => {
    const next = !shieldEnabled;
    setShieldEnabled(next);
    setActiveModal(null);
    setPurchaseNotice(null);
    onAnnouncement(`FairPlay Shield turned ${next ? "ON" : "OFF"}.`);
  };

  const handleSkillAction = (featureName: string, detail: string) => {
    setPurchaseNotice(null);
    setActiveModal({ type: "safe", featureName, detail });
    onAnnouncement(`${t.safeAllowedToast}: ${featureName}.`);
  };

  const handleGamblingTrigger = (triggerName: string) => {
    setPurchaseNotice(null);
    if (shieldEnabled) {
      setBlockedCount((prev) => prev + 1);
      setActiveModal({ type: "shield-blocked", triggerName });
      onAnnouncement(`FairPlay Shield blocked ${triggerName}. Core game remains playable.`);
    } else {
      setActiveModal({ type: "gambling-raw", triggerName });
      onAnnouncement(`Opened unblocked ${triggerName} FOMO gambling prompt.`);
    }
  };

  return (
    <section aria-labelledby="shield-heading" className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-[#111827] p-6">
        <div>
          <h1 id="shield-heading" className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-50">
            {t.title}
          </h1>
          <p className="mt-1.5 text-sm text-slate-300">{t.subtitle}</p>
        </div>

        <div
          role="tablist"
          aria-label="FairPlay Shield demonstration modes"
          className="inline-flex rounded-lg border border-slate-700 bg-[#0B1120] p-1 self-start"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "pc"}
            aria-label={t.pcMode}
            onClick={() => {
              setMode("pc");
              setActiveModal(null);
            }}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              mode === "pc" ? "bg-indigo-600 text-white" : "text-slate-300 hover:text-white"
            }`}
          >
            <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t.pcMode}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === "extension"}
            aria-label={t.extMode}
            onClick={() => {
              setMode("extension");
              setActiveModal(null);
            }}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              mode === "extension" ? "bg-indigo-600 text-white" : "text-slate-300 hover:text-white"
            }`}
          >
            <Chrome className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t.extMode}</span>
          </button>
        </div>
      </div>

      {/* ==================== MODE 1: PC GAME COMPANION ==================== */}
      {mode === "pc" && (
        <div role="tabpanel" aria-label={t.pcMode} className="space-y-4">
          {/* Master Shield Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-[#111827] px-5 py-4">
            <div className="flex items-center gap-3">
              {shieldEnabled ? (
                <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" aria-hidden="true" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-red-400 shrink-0" aria-hidden="true" />
              )}
              <div>
                <div className="text-sm font-semibold text-slate-100">
                  {shieldEnabled ? t.shieldOn : t.shieldOff}
                </div>
                <div className="text-xs text-slate-400">
                  {shieldEnabled
                    ? "Selective blocker active · Skill gameplay stays open · Gambling popups intercepted"
                    : "Protection disabled · Predatory FOMO popups appear unfiltered"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                Blocked Triggers: <strong className="text-slate-100">{blockedCount}</strong>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={shieldEnabled}
                aria-label="Toggle FairPlay Shield protection on or off"
                onClick={handleToggleShield}
                className={`relative inline-flex h-8 w-16 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  shieldEnabled
                    ? "border-emerald-500/50 bg-emerald-600"
                    : "border-slate-600 bg-slate-800"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    shieldEnabled ? "translate-x-9" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Mock Game Screen: CyberQuest RPG — Main Lobby */}
          <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#0B1120] min-h-[460px] flex flex-col justify-between">
            {/* Backdrop Image with Scrim */}
            {!lobbyImgError ? (
              <img
                src="/src/assets/images/cyberquest_lobby_bg_1795798984382.jpg"
                alt="CyberQuest RPG sci-fi orbital game lobby environment"
                referrerPolicy="no-referrer"
                onError={() => setLobbyImgError(true)}
                className="absolute inset-0 h-full w-full object-cover opacity-55"
              />
            ) : (
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-950"
              />
            )}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/70 to-[#0B1120]/45"
            />

            {/* Game Lobby Top Bar */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 bg-[#0B1120]/80 px-6 py-4 backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <Gamepad2 className="h-5 w-5 text-indigo-400" aria-hidden="true" />
                <span className="font-display text-base font-bold text-slate-50">
                  CyberQuest RPG — Main Lobby
                </span>
              </div>
              <div className="flex items-center gap-4 font-mono text-xs text-slate-300 tabular-nums">
                <span>Level 24 Vanguard</span>
                <span aria-hidden="true">·</span>
                <span>1,240 Credits</span>
              </div>
            </div>

            {/* Interactive Lobby Buttons Grid */}
            <div className="relative z-10 p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              {/* Skill-Based Core Gameplay */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-emerald-400">
                  Skill-Based Core Gameplay (Always Allowed)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      handleSkillAction(
                        "Play Story Mission",
                        "Chapter 4: Orbital Relay — 100% skill combat & tactical puzzle progression."
                      )
                    }
                    aria-label="Play Story Mission (Safe skill-based mode)"
                    className="flex flex-col items-start gap-1.5 rounded-lg border border-emerald-500/35 bg-[#111827]/90 p-3.5 text-left hover:border-emerald-400 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 transition-colors"
                  >
                    <Swords className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                    <span className="text-xs font-semibold text-slate-100">Play Story Mission</span>
                    <span className="text-[11px] text-emerald-300">Skill Mode ✓</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSkillAction(
                        "Practice Arena",
                        "Offline training simulator with zero microtransactions or timers."
                      )
                    }
                    aria-label="Practice Arena (Safe skill-based mode)"
                    className="flex flex-col items-start gap-1.5 rounded-lg border border-emerald-500/35 bg-[#111827]/90 p-3.5 text-left hover:border-emerald-400 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 transition-colors"
                  >
                    <Shield className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                    <span className="text-xs font-semibold text-slate-100">Practice Arena</span>
                    <span className="text-[11px] text-emerald-300">Skill Mode ✓</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSkillAction(
                        "Customize Gear",
                        "Equip armor and weapons unlocked directly through completed missions."
                      )
                    }
                    aria-label="Customize Gear (Safe skill-based mode)"
                    className="flex flex-col items-start gap-1.5 rounded-lg border border-emerald-500/35 bg-[#111827]/90 p-3.5 text-left hover:border-emerald-400 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 transition-colors"
                  >
                    <Wrench className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                    <span className="text-xs font-semibold text-slate-100">Customize Gear</span>
                    <span className="text-[11px] text-emerald-300">Earned Only ✓</span>
                  </button>
                </div>
              </div>

              {/* Predatory Gambling Triggers */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-red-400">
                  Real-Money RNG Shop Triggers (Test Shield Here)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleGamblingTrigger("Lucky Spin Wheel")}
                    aria-label="Open Lucky Spin Wheel gambling trigger"
                    className="flex flex-col items-start gap-1.5 rounded-lg border border-red-500/40 bg-[#111827]/90 p-3.5 text-left hover:border-red-400 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 transition-colors"
                  >
                    <Sparkles className="h-4 w-4 text-amber-400" aria-hidden="true" />
                    <span className="text-xs font-semibold text-slate-100">Lucky Spin Wheel</span>
                    <span className="text-[11px] text-red-300">Paid RNG · 0.5% Grand Prize</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGamblingTrigger("Mythic Gacha Banner")}
                    aria-label="Open Mythic Gacha Banner gambling trigger"
                    className="flex flex-col items-start gap-1.5 rounded-lg border border-red-500/40 bg-[#111827]/90 p-3.5 text-left hover:border-red-400 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 transition-colors"
                  >
                    <AlertOctagon className="h-4 w-4 text-red-400" aria-hidden="true" />
                    <span className="text-xs font-semibold text-slate-100">Mythic Gacha Banner</span>
                    <span className="text-[11px] text-red-300">Paid Loot · 0.6% Drop Rate</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Active Modal Overlays Inside Lobby */}
            {activeModal && (
              <div
                role="dialog"
                aria-modal="true"
                aria-label="CyberQuest lobby modal"
                className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md"
              >
                {/* Safe Skill Modal */}
                {activeModal.type === "safe" && (
                  <div className="w-full max-w-md rounded-xl border border-emerald-500/40 bg-[#111827] p-6 space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        <span>{t.safeAllowedToast} ✓</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveModal(null)}
                        aria-label="Close safe gameplay preview"
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <h3 className="text-lg font-bold text-slate-50">{activeModal.featureName}</h3>
                    <p className="text-sm text-slate-300">{activeModal.detail}</p>
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      aria-label="Return to CyberQuest lobby"
                      className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                    >
                      Continue Playing
                    </button>
                  </div>
                )}

                {/* Raw Unfiltered Gambling Popup (Shield OFF) */}
                {activeModal.type === "gambling-raw" && (
                  <div className="w-full max-w-md rounded-xl border-2 border-amber-500 bg-gradient-to-b from-red-950/90 to-[#111827] p-6 space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
                        <Clock className="h-4 w-4" aria-hidden="true" />
                        <span>LIMITED OFFER EXPIRES IN {formatCountdown(fomoSeconds)}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveModal(null)}
                        aria-label="Close unfiltered gambling popup"
                        className="rounded-md p-1 text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>

                    <h3 className="text-xl font-extrabold text-white">{activeModal.triggerName}</h3>
                    <p className="text-xs leading-relaxed text-amber-100">
                      99% of players miss out! Spin NOW for your chance at the Mythic Nova Blade (0.6%
                      drop rate). Only 12 pulls left until guaranteed tier!
                    </p>

                    {purchaseNotice && (
                      <div className="rounded-lg border border-red-500/40 bg-red-500/15 p-3 text-xs text-red-200">
                        {purchaseNotice}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setPurchaseNotice(
                            "Simulated trap: With FairPlay Shield OFF, this 1-click button would immediately charge ₹499 ($6) for 500 Gems with a 99.4% miss rate."
                          )
                        }
                        aria-label="Simulated Buy 500 Gems button"
                        className="rounded-lg bg-amber-500 px-3 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                      >
                        Buy 500 Gems (₹499)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveModal(null)}
                        aria-label="Decline offer and close popup"
                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                      >
                        No Thanks
                      </button>
                    </div>
                  </div>
                )}

                {/* Guardian Warning Overlay (Shield ON) */}
                {activeModal.type === "shield-blocked" && (
                  <div className="w-full max-w-lg rounded-xl border border-indigo-500/50 bg-[#111827] p-6 space-y-5 shadow-2xl">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-red-500/15 p-2.5 text-red-400 shrink-0">
                        <ShieldAlert className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-indigo-300">
                          FairPlay Shield Intercepted · {activeModal.triggerName}
                        </div>
                        <h3 className="text-lg font-bold text-slate-50">{t.blockedHeading}</h3>
                      </div>
                    </div>

                    <p className="text-sm leading-relaxed text-slate-300">{t.blockedBody}</p>

                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <button
                        type="button"
                        onClick={() => setActiveModal(null)}
                        aria-label={t.closeAndReturn}
                        className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      >
                        {t.closeAndReturn}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveModal({
                            type: "math-breakdown",
                            triggerName: activeModal.triggerName,
                          })
                        }
                        aria-label={t.viewMathBreakdown}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-[#0B1120] px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      >
                        <Calculator className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
                        <span>{t.viewMathBreakdown}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Math Breakdown Sub-Modal */}
                {activeModal.type === "math-breakdown" && (
                  <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-[#111827] p-6 space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-50">
                        Math Breakdown · {activeModal.triggerName}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveModal(null)}
                        aria-label="Close math breakdown"
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="space-y-2.5 font-mono text-xs bg-[#0B1120] border border-slate-800 rounded-lg p-4 text-slate-200">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Advertised Grand Drop Rate:</span>
                        <span className="text-red-400 font-semibold">0.6% (1 in 167)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Loss Rate Per Single Pull:</span>
                        <span className="text-red-400 font-semibold">99.4%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Expected Cost for 1 Win:</span>
                        <span className="text-amber-300 font-semibold">~₹14,400 ($180)</span>
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModal(null);
                          onJumpToLab();
                        }}
                        aria-label="Open Probability Lab to test these odds"
                        className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                      >
                        Test in Probability Lab
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveModal(null)}
                        aria-label="Return to CyberQuest game"
                        className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                      >
                        Back to Game
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODE 2: CHROME EXTENSION STOREFRONT ==================== */}
      {mode === "extension" && (
        <div
          role="tabpanel"
          aria-label={t.extMode}
          className="rounded-xl border border-slate-800 bg-[#0B1120] overflow-hidden"
        >
          {/* Mock Browser Chrome Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono truncate">
              <span className="text-emerald-400">https://</span>
              <span className="truncate">store.digitalplay.example/app/aether-chronicles-rpg</span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-md border border-indigo-500/40 bg-indigo-500/15 px-2.5 py-1 text-xs font-semibold text-indigo-300">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>FairPlay Extension Active</span>
            </div>
          </div>

          {/* Storefront Content + Injected Extension Popup */}
          <div className="relative p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Storefront Page */}
            <div className="lg:col-span-8 space-y-4">
              {!storeWarningDismissed && (
                <div
                  role="alert"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200"
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" aria-hidden="true" />
                    <span>
                      <strong>Warn Before Download:</strong> FairPlay Lens detected hidden 0.6% gacha
                      odds and dual-currency packs inside this free-to-play title.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStoreWarningDismissed(true)}
                    aria-label="Dismiss pre-download warning banner"
                    className="text-slate-300 hover:text-white underline text-xs"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#111827]">
                {!storeImgError ? (
                  <img
                    src="/src/assets/images/storefront_game_cover_1795798984244.jpg"
                    alt="Aether Chronicles RPG storefront promotional banner"
                    referrerPolicy="no-referrer"
                    onError={() => setStoreImgError(true)}
                    className="h-52 w-full object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="h-52 w-full bg-gradient-to-r from-indigo-950 via-slate-900 to-amber-950/40"
                  />
                )}
                <div className="p-5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-xl font-bold text-slate-50">Aether Chronicles RPG</h2>
                    <span className="font-mono text-xs font-semibold text-emerald-400">
                      Free to Install · Offers In-App Purchases
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300">
                    Embark on an open-world quest! Collect mythic heroes from limited-time Astral
                    Banners, unlock exclusive weapons in the daily rotating vault, and climb ranked
                    arenas.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Injected Chrome Extension Popup */}
            <aside
              aria-label="Injected FairPlay Lens Chrome Extension Popup"
              className="lg:col-span-4 rounded-xl border border-indigo-500/40 bg-[#111827] p-5 space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-400" aria-hidden="true" />
                  <span className="text-sm font-bold text-slate-50">FairPlay Lens Extension</span>
                </div>
                <span className="text-[11px] text-slate-400">Pre-Download Scan</span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-[#0B1120] p-3.5 border border-slate-800">
                <div>
                  <div className="text-xs text-slate-400">Storefront Risk Score</div>
                  <div className="font-mono text-2xl font-bold text-red-400 tabular-nums">89 / 100</div>
                </div>
                <span className="rounded border border-red-500/40 bg-red-500/15 px-2.5 py-1 text-xs font-bold text-red-300">
                  HIGH RISK
                </span>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-300">Detected Storefront Flags</div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  <li className="flex items-center justify-between rounded bg-[#0B1120] px-3 py-1.5">
                    <span>Random Hero Banners</span>
                    <span className="text-red-400 font-medium">0.6% Odds</span>
                  </li>
                  <li className="flex items-center justify-between rounded bg-[#0B1120] px-3 py-1.5">
                    <span>Dual Virtual Currency</span>
                    <span className="text-amber-400 font-medium">Crystals → Shards</span>
                  </li>
                  <li className="flex items-center justify-between rounded bg-[#0B1120] px-3 py-1.5">
                    <span>FOMO Store Timers</span>
                    <span className="text-amber-400 font-medium">Detected</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={onJumpToScanner}
                aria-label="Open full audit in Transparency Scanner"
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 transition-colors"
              >
                Open Full Audit in Scanner
              </button>
            </aside>
          </div>
        </div>
      )}
    </section>
  );
}
