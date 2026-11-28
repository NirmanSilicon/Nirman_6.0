import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Printer,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import type { Language, RiskLevel, RiskReport } from "../types/fairplay";
import { TRANSLATIONS } from "../data/i18n";
import { SCANNER_PRESETS } from "../data/presets";
import { InfoTooltip } from "./InfoTooltip";

interface TransparencyScannerProps {
  language: Language;
  onAnnouncement: (message: string) => void;
}

const RISK_COLORS: Record<RiskLevel, { text: string; bg: string; border: string; stroke: string }> = {
  LOW: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    stroke: "#10B981",
  },
  MEDIUM: {
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    stroke: "#F59E0B",
  },
  HIGH: {
    text: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    stroke: "#EF4444",
  },
};

export function TransparencyScanner({ language, onAnnouncement }: TransparencyScannerProps) {
  const t = TRANSLATIONS[language].scanner;
  const defaultPreset = SCANNER_PRESETS[0];

  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(defaultPreset.id);
  const [gameTitle, setGameTitle] = useState(defaultPreset.title);
  const [policyText, setPolicyText] = useState(defaultPreset.description);
  const [report, setReport] = useState<RiskReport | null>(
    language === "hi" ? defaultPreset.reportHi : defaultPreset.reportEn
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activePreset = SCANNER_PRESETS.find((p) => p.id === selectedPresetId);
  const displayedReport =
    selectedPresetId && activePreset && report?.analysisSource === "preset"
      ? language === "hi"
        ? activePreset.reportHi
        : activePreset.reportEn
      : report;

  const handlePresetClick = (presetId: string) => {
    const preset = SCANNER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(preset.id);
    setGameTitle(preset.title);
    setPolicyText(preset.description);
    setErrorMsg(null);
    const nextReport = language === "hi" ? preset.reportHi : preset.reportEn;
    setReport(nextReport);
    onAnnouncement(`Loaded preset risk report for ${preset.title}: ${nextReport.riskLevel} risk.`);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameTitle.trim() && !policyText.trim()) {
      setErrorMsg(
        language === "hi"
          ? "कृपया गेम का नाम या शॉप विवरण दर्ज करें।"
          : "Please enter a game title or monetization description."
      );
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSelectedPresetId(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: gameTitle.trim(),
          description: policyText.trim(),
          language,
        }),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || "Unable to complete analysis.");
      }

      const data = (await res.json()) as RiskReport;
      setReport(data);
      onAnnouncement(
        `Analysis complete for ${data.gameTitle}. Predatory risk score ${data.riskScore} out of 100, ${data.riskLevel} risk.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Analysis request failed.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReport = () => {
    onAnnouncement("Opening print dialog to save Risk Report as PDF.");
    window.print();
  };

  const chartData = displayedReport
    ? [
        { name: t.skillLabel, value: displayedReport.breakdown.skillPct, color: "#10B981" },
        { name: t.cosmeticLabel, value: displayedReport.breakdown.cosmeticPct, color: "#6366F1" },
        { name: t.gamblingLabel, value: displayedReport.breakdown.gamblingPct, color: "#EF4444" },
      ]
    : [];

  const gaugeRadius = 56;
  const gaugeCircumference = Math.PI * gaugeRadius;
  const gaugeScore = displayedReport ? displayedReport.riskScore : 0;
  const gaugeDashOffset = gaugeCircumference * (1 - gaugeScore / 100);
  const riskStyle = displayedReport ? RISK_COLORS[displayedReport.riskLevel] : RISK_COLORS.LOW;

  return (
    <section aria-labelledby="scanner-heading" className="space-y-8">
      {/* Input & Presets Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start no-print">
        <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#111827] p-6 space-y-5">
          <div>
            <h1 id="scanner-heading" className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-50">
              {t.heroTitle}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{t.heroSubtitle}</p>
          </div>

          {/* 4 Instant Demo Presets */}
          <div className="space-y-2.5">
            <span className="block text-xs font-medium text-slate-400">{t.presetsLabel}</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="group" aria-label={t.presetsLabel}>
              {SCANNER_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                const hintColor =
                  preset.riskHint === "HIGH"
                    ? "text-red-400"
                    : preset.riskHint === "MEDIUM"
                      ? "text-amber-400"
                      : "text-emerald-400";
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetClick(preset.id)}
                    aria-pressed={isSelected}
                    aria-label={`Load ${preset.title} demo preset (${preset.riskHint} risk)`}
                    className={`flex flex-col items-start rounded-lg border px-3.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-500/10 text-slate-50"
                        : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/70"
                    }`}
                  >
                    <span className="text-xs font-semibold truncate w-full">{preset.label}</span>
                    <span className={`text-[11px] font-medium mt-0.5 ${hintColor}`}>
                      {preset.riskHint === "HIGH"
                        ? "High Risk"
                        : preset.riskHint === "MEDIUM"
                          ? "Medium Risk"
                          : "Safe Benchmark"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleAnalyze} className="space-y-4" aria-label="Game monetization risk analyzer form">
            <div>
              <label htmlFor="scanner-game-title" className="block text-xs font-medium text-slate-300 mb-1.5">
                {t.gameTitleLabel}
              </label>
              <input
                id="scanner-game-title"
                type="text"
                value={gameTitle}
                onChange={(e) => {
                  setGameTitle(e.target.value);
                  setSelectedPresetId(null);
                }}
                placeholder={t.gameTitlePlaceholder}
                aria-label={t.gameTitleLabel}
                className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>

            <div>
              <label htmlFor="scanner-policy-text" className="block text-xs font-medium text-slate-300 mb-1.5">
                {t.policyLabel}
              </label>
              <textarea
                id="scanner-policy-text"
                rows={4}
                value={policyText}
                onChange={(e) => {
                  setPolicyText(e.target.value);
                  setSelectedPresetId(null);
                }}
                placeholder={t.policyPlaceholder}
                aria-label={t.policyLabel}
                className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300"
              >
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              aria-label={loading ? t.analyzingButton : t.analyzeButton}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 transition-colors whitespace-nowrap"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              <span>{loading ? t.analyzingButton : t.analyzeButton}</span>
            </button>
          </form>
        </div>

        {/* Interactive Risk Report Card */}
        <div className="lg:col-span-7">
          {!displayedReport ? (
            <div className="rounded-xl border border-slate-800 bg-[#111827] p-10 text-center space-y-3">
              <Sparkles className="h-8 w-8 text-indigo-400 mx-auto" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-slate-100">{t.emptyStateTitle}</h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto">{t.emptyStateDesc}</p>
            </div>
          ) : (
            <div
              className="print-report-card rounded-xl border border-slate-800 bg-[#111827] p-6 space-y-6"
              aria-live="polite"
            >
              {/* Report Header + Print PDF Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>FairPlay Lens Audit</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {displayedReport.analysisSource === "gemini"
                        ? "Gemini AI Analysis"
                        : displayedReport.analysisSource === "preset"
                          ? "Verified Benchmark"
                          : "Pattern Engine"}
                    </span>
                  </div>
                  <h2 className="mt-1 text-xl font-bold text-slate-50">{displayedReport.gameTitle}</h2>
                  <p className="mt-1 text-sm text-slate-300">{displayedReport.summary}</p>
                </div>

                <button
                  type="button"
                  onClick={handlePrintReport}
                  aria-label={t.downloadReport}
                  className="no-print inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors whitespace-nowrap shrink-0"
                >
                  <Printer className="h-4 w-4 text-indigo-400" aria-hidden="true" />
                  <span>{t.downloadReport}</span>
                </button>
              </div>

              {/* Gauge + Donut Chart Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Predatory Risk Gauge */}
                <div className="rounded-xl border border-slate-800 bg-[#0B1120] p-5 flex flex-col items-center">
                  <div className="flex items-center text-xs font-medium text-slate-400 mb-2">
                    <span>{t.riskScoreLabel}</span>
                    <InfoTooltip
                      term="Predatory Risk Score"
                      explanation="Measures how strongly a game relies on unpredictable real-money rewards, FOMO timers, and hidden currencies on a 0–100 scale."
                    />
                  </div>

                  <svg
                    viewBox="0 0 140 85"
                    className="w-44 h-28"
                    role="img"
                    aria-label={`Predatory Risk Gauge showing ${displayedReport.riskScore} out of 100, ${displayedReport.riskLevel} risk`}
                  >
                    <path
                      d="M 14 72 A 56 56 0 0 1 126 72"
                      fill="none"
                      stroke="#1E293B"
                      strokeWidth="12"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 14 72 A 56 56 0 0 1 126 72"
                      fill="none"
                      stroke={riskStyle.stroke}
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={gaugeCircumference}
                      strokeDashoffset={gaugeDashOffset}
                      style={{ transition: "stroke-dashoffset 450ms ease-out" }}
                    />
                    <text
                      x="70"
                      y="64"
                      textAnchor="middle"
                      className="fill-slate-50 font-mono text-2xl font-bold tabular-nums"
                    >
                      {displayedReport.riskScore}
                    </text>
                    <text x="70" y="79" textAnchor="middle" className="fill-slate-400 text-[10px]">
                      / 100
                    </text>
                  </svg>

                  <div
                    className={`mt-2 inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-semibold ${riskStyle.bg} ${riskStyle.border} ${riskStyle.text}`}
                  >
                    {displayedReport.riskLevel === "LOW" ? (
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : displayedReport.riskLevel === "MEDIUM" ? (
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>{t.riskBadges[displayedReport.riskLevel]}</span>
                  </div>
                </div>

                {/* Mechanic Classification Donut Chart */}
                <div className="rounded-xl border border-slate-800 bg-[#0B1120] p-5">
                  <h3 className="text-xs font-medium text-slate-400 mb-3">{t.breakdownTitle}</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-32 shrink-0" aria-hidden="true">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={34}
                            outerRadius={54}
                            paddingAngle={3}
                            stroke="none"
                          >
                            {chartData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: "#0F172A",
                              border: "1px solid #334155",
                              borderRadius: "8px",
                              fontSize: "12px",
                              color: "#F8FAFC",
                            }}
                            formatter={(val) => [`${val}%`, ""]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <ul className="space-y-2 text-xs flex-1" aria-label="Mechanic percentage breakdown">
                      {chartData.map((item) => (
                        <li key={item.name} className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-slate-300">
                            <span
                              className="h-2.5 w-2.5 rounded-sm shrink-0"
                              style={{ backgroundColor: item.color }}
                              aria-hidden="true"
                            />
                            <span>{item.name}</span>
                          </span>
                          <span className="font-mono font-semibold text-slate-100 tabular-nums">
                            {item.value}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Mechanic Deconstructor Cards */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <h3 className="text-sm font-semibold text-slate-100">{t.patternsTitle}</h3>
                  <InfoTooltip
                    term="Variable-Ratio Reinforcement"
                    explanation="A behavioral schedule where rewards arrive after an unpredictable number of tries—making it the hardest habit to stop and the core engine of slot machines."
                  />
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {displayedReport.detectedPatterns.map((pattern) => {
                    const pStyle = RISK_COLORS[pattern.severity];
                    return (
                      <article
                        key={pattern.name}
                        className="rounded-lg border border-slate-800 bg-[#0B1120] p-4 space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-sm font-semibold text-slate-100">{pattern.name}</h4>
                          <span className={`text-xs font-medium ${pStyle.text}`}>
                            {pattern.severity} · {pattern.psychologyHook}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-300">{pattern.explanation}</p>
                      </article>
                    );
                  })}
                </div>
              </div>

              {/* Educational Alert Boxes for Gamers & Parents */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-800 bg-[#0B1120] p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{t.gamerAlertTitle}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300">{displayedReport.gamerAlert}</p>
                </div>

                <div className="rounded-lg border border-slate-800 bg-[#0B1120] p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                    <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{t.parentAlertTitle}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300">{displayedReport.parentAlert}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
