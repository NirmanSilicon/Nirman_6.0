import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  ClipboardCheck,
  Printer,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Square,
} from "lucide-react";
import type { Language, ManualAuditReport, RiskLevel } from "../types/fairplay";
import { AUDIT_PARAMETERS } from "../data/presets";

interface ManualRiskAuditProps {
  language: Language;
  onAnnouncement: (message: string) => void;
}

const CATEGORIES = [
  "RNG & Odds",
  "Currency & Pricing",
  "Psychological Pressure",
  "Access & Safeguards",
] as const;

const LEVEL_META: Record<
  RiskLevel,
  {
    labelEn: string;
    labelHi: string;
    range: string;
    colorHex: string;
    textClass: string;
    borderClass: string;
    bgClass: string;
    baseArrowPct: number;
  }
> = {
  LOW: {
    labelEn: "LOW RISK",
    labelHi: "कम जोखिम (LOW)",
    range: "0 – 31 pts",
    colorHex: "#10B981",
    textClass: "text-emerald-400",
    borderClass: "border-emerald-500/50",
    bgClass: "bg-emerald-500/10",
    baseArrowPct: 30,
  },
  MEDIUM: {
    labelEn: "MEDIUM RISK",
    labelHi: "मध्यम जोखिम (MEDIUM)",
    range: "32 – 64 pts",
    colorHex: "#F59E0B",
    textClass: "text-amber-400",
    borderClass: "border-amber-500/50",
    bgClass: "bg-amber-500/10",
    baseArrowPct: 62,
  },
  HIGH: {
    labelEn: "HIGH RISK",
    labelHi: "उच्च जोखिम (HIGH)",
    range: "65 – 100 pts",
    colorHex: "#EF4444",
    textClass: "text-red-400",
    borderClass: "border-red-500/50",
    bgClass: "bg-red-500/10",
    baseArrowPct: 96,
  },
};

function computeAuditReport(
  gameTitle: string,
  platform: string,
  notes: string,
  selectedIds: string[],
  language: Language
): ManualAuditReport {
  const isHi = language === "hi";
  const selectedParams = AUDIT_PARAMETERS.filter((p) => selectedIds.includes(p.id));
  const rawSum = selectedParams.reduce((acc, p) => acc + p.weight, 0);
  const harmScore = Math.min(100, rawSum);

  const riskLevel: RiskLevel =
    harmScore >= 65 ? "HIGH" : harmScore >= 32 ? "MEDIUM" : "LOW";

  const title = gameTitle.trim() || (isHi ? "कस्टम गेम ऑडिट" : "Untitled Game");

  let harmVerdict = "";
  let recommendation = "";

  if (riskLevel === "HIGH") {
    harmVerdict = isHi
      ? `${title} में अत्यधिक हानिकारक (${harmScore}/100) जुए-जैसे डार्क पैटर्न पाए गए हैं। यह खिलाड़ियों—विशेषकर नाबालिगों—को अनियंत्रित खर्च और मानसिक दबाव की ओर धकेलता है।`
      : `${title} carries HIGH financial and psychological harm (${harmScore}/100). Multiple stacked dark patterns simulate gambling loops and create compulsive spending risks.`;
    recommendation = isHi
      ? "तुरंत इन-ऐप खरीद बंद करें, FairPlay Shield चालू रखें, और बिना रैंडम लूट वाले विकल्प चुनें।"
      : "Block stored payment methods immediately, enable FairPlay Shield for RNG modals, or switch to a verified zero-gambling alternative.";
  } else if (riskLevel === "MEDIUM") {
    harmVerdict = isHi
      ? `${title} में मध्यम स्तर का जोखिम (${harmScore}/100) है। मुख्य खेल ठीक हो सकता है, लेकिन टाइमर या मुद्रा रूपांतरण अनचाहे खर्च बढ़ा सकते हैं।`
      : `${title} poses MODERATE harm (${harmScore}/100). Core mechanics may be playable, but urgency timers or currency layers can nudge impulsive spending.`;
    recommendation = isHi
      ? "मासिक खर्च सीमा तय करें और किसी भी सीमित-समय ऑफर पर खरीदने से पहले 48 घंटे प्रतीक्षा करें।"
      : "Set a strict monthly prepaid allowance and enforce a 48-hour waiting rule before purchasing time-limited bundles.";
  } else {
    harmVerdict = isHi
      ? `${title} कम जोखिम वाला और सुरक्षित (${harmScore}/100) प्रतीत होता है। चुने गए पैरामीटर के अनुसार इसमें गंभीर जुए के संकेत नहीं हैं।`
      : `${title} shows LOW harm (${harmScore}/100) based on selected parameters. Few or no predatory gambling traps were flagged.`;
    recommendation = isHi
      ? "सुरक्षित खेल जारी रखें और फिर भी स्टोर पासवर्ड सुरक्षा सक्रिय रखें।"
      : "Safe for regular play; keep device store password prompts active as a standard precaution.";
  }

  return {
    gameTitle: title,
    platform,
    notes: notes.trim(),
    selectedIds,
    harmScore,
    riskLevel,
    harmVerdict,
    recommendation,
    generatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

export function ManualRiskAudit({ language, onAnnouncement }: ManualRiskAuditProps) {
  const isHi = language === "hi";

  const [gameTitle, setGameTitle] = useState("Mythic Arena Quest");
  const [platform, setPlatform] = useState("Android / iOS");
  const [notes, setNotes] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([
    "loot-boxes",
    "sub-1-drop",
    "dual-currency",
    "fomo-timers",
    "near-miss",
    "one-click-buy",
  ]);
  const [report, setReport] = useState<ManualAuditReport>(() =>
    computeAuditReport(
      "Mythic Arena Quest",
      "Android / iOS",
      "",
      ["loot-boxes", "sub-1-drop", "dual-currency", "fomo-timers", "near-miss", "one-click-buy"],
      language
    )
  );
  const [isDirty, setIsDirty] = useState(false);

  const toggleParam = (id: string, label: string) => {
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      onAnnouncement(`${label} ${exists ? "deselected" : "selected"}.`);
      return next;
    });
    setIsDirty(true);
  };

  const applySample = (preset: "high" | "medium" | "low") => {
    let nextTitle = "";
    let nextIds: string[] = [];

    if (preset === "high") {
      nextTitle = "Starfall Gacha Legends";
      nextIds = [
        "loot-boxes",
        "sub-1-drop",
        "obscured-odds",
        "near-miss",
        "dual-currency",
        "pay-to-win",
        "fomo-timers",
        "one-click-buy",
      ];
    } else if (preset === "medium") {
      nextTitle = "Skyline Battle Pass";
      nextIds = ["dual-currency", "fomo-timers", "daily-streak-penalty", "social-pressure", "one-click-buy"];
    } else {
      nextTitle = "Timbercraft Indie";
      nextIds = ["social-pressure"];
    }

    setGameTitle(nextTitle);
    setSelectedIds(nextIds);
    const nextReport = computeAuditReport(nextTitle, platform, notes, nextIds, language);
    setReport(nextReport);
    setIsDirty(false);
    onAnnouncement(`Loaded ${preset} harm sample and generated report (${nextReport.harmScore}/100).`);
  };

  const handleClearAll = () => {
    setSelectedIds([]);
    setIsDirty(true);
    onAnnouncement("Cleared all selected parameters.");
  };

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    const next = computeAuditReport(gameTitle, platform, notes, selectedIds, language);
    setReport(next);
    setIsDirty(false);
    onAnnouncement(
      `Generated manual harm report for ${next.gameTitle}: score ${next.harmScore} out of 100, ${next.riskLevel} risk.`
    );
  };

  const selectedCount = selectedIds.length;

  const categoryTotals = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const items = AUDIT_PARAMETERS.filter((p) => p.category === cat);
      const activeItems = items.filter((p) => report.selectedIds.includes(p.id));
      const pts = activeItems.reduce((sum, p) => sum + p.weight, 0);
      return { category: cat, count: activeItems.length, total: items.length, points: pts };
    });
  }, [report.selectedIds]);

  const activeLevelMeta = LEVEL_META[report.riskLevel];

  return (
    <section aria-labelledby="audit-heading" className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Game Input System + 14 Selectable Parameters */}
        <form
          onSubmit={handleGenerateReport}
          aria-label="Manual game risk parameter audit form"
          className="lg:col-span-7 rounded-xl border border-slate-800 bg-[#111827] p-6 space-y-6 no-print"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 id="audit-heading" className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-50">
                {isHi ? "मैन्युअल पैरामीटर जोखिम ऑडिट" : "Manual Parameter Risk Audit"}
              </h1>
              <p className="mt-1.5 text-sm text-slate-300">
                {isHi
                  ? "गेम का नाम दर्ज करें, नीचे दिए गए 14 पैरामीटर में से मौजूद लक्षण चुनें और हानि रिपोर्ट तैयार करें।"
                  : "Enter a game, select all dark-pattern parameters present from the 14-point checklist, and generate a harm report."}
              </p>
            </div>
          </div>

          {/* Quick Sample Presets */}
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Quick parameter presets">
            <span className="text-xs font-medium text-slate-400 mr-1">
              {isHi ? "त्वरित सैंपल:" : "Quick Test:"}
            </span>
            <button
              type="button"
              onClick={() => applySample("high")}
              aria-label="Fill high risk sample parameters"
              className="rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              High Harm Sample
            </button>
            <button
              type="button"
              onClick={() => applySample("medium")}
              aria-label="Fill medium risk sample parameters"
              className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              Medium Caution Sample
            </button>
            <button
              type="button"
              onClick={() => applySample("low")}
              aria-label="Fill low risk safe sample parameters"
              className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              Low Harm Sample
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              aria-label="Clear all selected risk parameters"
              className="ml-auto inline-flex items-center gap-1 rounded-md border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              <span>Clear All</span>
            </button>
          </div>

          {/* Game Input Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="audit-game-title" className="block text-xs font-medium text-slate-300 mb-1.5">
                {isHi ? "गेम का नाम" : "Game Title"}
              </label>
              <input
                id="audit-game-title"
                type="text"
                value={gameTitle}
                onChange={(e) => {
                  setGameTitle(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="e.g. Mythic Arena Quest"
                aria-label="Game title for manual parameter audit"
                className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>

            <div>
              <label htmlFor="audit-platform" className="block text-xs font-medium text-slate-300 mb-1.5">
                {isHi ? "प्लेटफॉर्म" : "Platform"}
              </label>
              <select
                id="audit-platform"
                value={platform}
                onChange={(e) => {
                  setPlatform(e.target.value);
                  setIsDirty(true);
                }}
                aria-label="Game platform"
                className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                <option value="Android / iOS">Android / iOS</option>
                <option value="PC / Steam">PC / Steam</option>
                <option value="Console (PS / Xbox)">Console (PS / Xbox)</option>
                <option value="Web / Browser">Web / Browser</option>
              </select>
            </div>
          </div>

          {/* 14 Selectable Parameters Grouped by Category */}
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold text-slate-200">
                {isHi
                  ? `मैन्युअल पैरामीटर चुनें (${selectedCount} / ${AUDIT_PARAMETERS.length} चयनित)`
                  : `Select Observed Parameters (${selectedCount} / ${AUDIT_PARAMETERS.length} selected)`}
              </span>
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                14 Audit Criteria
              </span>
            </div>

            {CATEGORIES.map((category) => {
              const params = AUDIT_PARAMETERS.filter((p) => p.category === category);
              return (
                <fieldset key={category} className="space-y-2.5">
                  <legend className="text-xs font-semibold text-indigo-300 mb-1">{category}</legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {params.map((param) => {
                      const checked = selectedIds.includes(param.id);
                      const label = isHi ? param.labelHi : param.labelEn;
                      const desc = isHi ? param.descHi : param.descEn;

                      return (
                        <button
                          key={param.id}
                          type="button"
                          role="checkbox"
                          aria-checked={checked}
                          aria-label={`${label} (+${param.weight} harm points): ${desc}`}
                          onClick={() => toggleParam(param.id, label)}
                          className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                            checked
                              ? "border-indigo-500/70 bg-indigo-500/15 text-slate-50"
                              : "border-slate-800 bg-[#0B1120] text-slate-300 hover:border-slate-700 hover:bg-slate-900/70"
                          }`}
                        >
                          {checked ? (
                            <CheckSquare className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" aria-hidden="true" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold leading-snug">{label}</span>
                              <span className="font-mono text-[11px] text-slate-400 shrink-0 tabular-nums">
                                +{param.weight}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
          </div>

          {/* Optional Evaluator Notes */}
          <div>
            <label htmlFor="audit-notes" className="block text-xs font-medium text-slate-300 mb-1.5">
              {isHi ? "अतिरिक्त टिप्पणी (वैकल्पिक)" : "Additional Observations (Optional)"}
            </label>
            <input
              id="audit-notes"
              type="text"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setIsDirty(true);
              }}
              placeholder="e.g. Prompted ₹499 starter pack after tutorial..."
              aria-label="Additional observations for the manual audit report"
              className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400">
              {isDirty
                ? isHi
                  ? "पैरामीटर बदले गए हैं — रिपोर्ट अपडेट करने के लिए बटन दबाएं।"
                  : "Selection changed — click Generate Report to update verdict."
                : isHi
                  ? "रिपोर्ट वर्तमान चयन के अनुरूप है।"
                  : "Report reflects your current parameter selection."}
            </span>

            <button
              type="submit"
              aria-label="Generate harm and risk report from selected parameters"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 transition-colors whitespace-nowrap"
            >
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
              <span>{isHi ? "हानि रिपोर्ट तैयार करें" : "Generate Harm Report"}</span>
            </button>
          </div>
        </form>

        {/* RIGHT COLUMN: Generated Risk Report + 3-Level Proportional Arrow Meter */}
        <div className="lg:col-span-5 space-y-6">
          <div
            className="print-report-card rounded-xl border border-slate-800 bg-[#111827] p-6 space-y-6"
            aria-live="polite"
          >
            {/* Report Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Manual Risk Audit</span>
                  <span aria-hidden="true">·</span>
                  <span>{report.platform}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{report.generatedAt}</span>
                </div>
                <h2 className="mt-1 text-xl font-bold text-slate-50">{report.gameTitle}</h2>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                aria-label="Download manual risk audit report as PDF or Print"
                className="no-print inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 whitespace-nowrap shrink-0"
              >
                <Printer className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
                <span>Print / PDF</span>
              </button>
            </div>

            {/* Overall Harm Score Banner */}
            <div
              className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${activeLevelMeta.borderClass} ${activeLevelMeta.bgClass}`}
            >
              <div className="flex items-center gap-3">
                {report.riskLevel === "LOW" ? (
                  <ShieldCheck className="h-7 w-7 text-emerald-400 shrink-0" aria-hidden="true" />
                ) : report.riskLevel === "MEDIUM" ? (
                  <AlertTriangle className="h-7 w-7 text-amber-400 shrink-0" aria-hidden="true" />
                ) : (
                  <ShieldAlert className="h-7 w-7 text-red-400 shrink-0" aria-hidden="true" />
                )}
                <div>
                  <div className={`text-sm font-bold ${activeLevelMeta.textClass}`}>
                    {isHi ? activeLevelMeta.labelHi : activeLevelMeta.labelEn}
                  </div>
                  <div className="text-xs text-slate-300">
                    {report.selectedIds.length} {isHi ? "हानिकारक कारक चयनित" : "harm factors flagged"}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono text-3xl font-extrabold text-slate-50 tabular-nums">
                  {report.harmScore}
                </div>
                <div className="font-mono text-[11px] text-slate-400">/ 100 HARM</div>
              </div>
            </div>

            {/* 3-LEVEL PROPORTIONAL RISK ARROWS (HIGH, MEDIUM, LOW) */}
            <div
              className="rounded-xl border border-slate-800 bg-[#0B1120] p-5 space-y-4"
              role="region"
              aria-label="Three-level risk scale with proportional directional arrows for Low, Medium, and High risk"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-200">
                  {isHi
                    ? "3-स्तरीय जोखिम तीर स्केल (अधिक जोखिम = लंबा तीर)"
                    : "3-Level Harm Scale (Higher Risk = Longer Arrow)"}
                </h3>
                <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                  Score: {report.harmScore}/100
                </span>
              </div>

              <div className="space-y-3.5">
                {(["HIGH", "MEDIUM", "LOW"] as const).map((lvl) => {
                  const meta = LEVEL_META[lvl];
                  const isActive = report.riskLevel === lvl;
                  // Arrow shaft length scales proportionally with risk tier & active exact score
                  const arrowWidthPct = isActive
                    ? Math.max(18, Math.min(100, report.harmScore))
                    : meta.baseArrowPct;

                  return (
                    <div
                      key={lvl}
                      className={`rounded-lg border p-3 transition-colors ${
                        isActive
                          ? `${meta.borderClass} ${meta.bgClass}`
                          : "border-slate-800/80 bg-[#111827]/60 opacity-75"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${meta.textClass}`}>
                            {isHi ? meta.labelHi : meta.labelEn}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400">({meta.range})</span>
                        </div>
                        {isActive && (
                          <span className="font-mono text-[11px] font-bold text-slate-100 tabular-nums">
                            ACTIVE · {report.harmScore}%
                          </span>
                        )}
                      </div>

                      {/* Proportional Directional SVG Arrow */}
                      <div
                        className="w-full flex items-center"
                        role="img"
                        aria-label={`${meta.labelEn} directional arrow at ${arrowWidthPct} percent length${
                          isActive ? " (currently active risk level)" : ""
                        }`}
                      >
                        <div
                          className="flex items-center transition-all duration-300"
                          style={{ width: `${arrowWidthPct}%`, minWidth: "56px" }}
                        >
                          {/* Arrow Shaft */}
                          <div
                            className="h-2.5 flex-1 rounded-l-full"
                            style={{ backgroundColor: meta.colorHex }}
                          />
                          {/* Arrowhead */}
                          <svg
                            viewBox="0 0 16 18"
                            className="h-4.5 w-4 -ml-0.5 shrink-0"
                            aria-hidden="true"
                          >
                            <polygon points="0,0 16,9 0,18" fill={meta.colorHex} />
                          </svg>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Harm Verdict & Actionable Recommendation */}
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-800 bg-[#0B1120] p-4 space-y-1.5">
                <div className="text-xs font-semibold text-slate-200">
                  {isHi ? "नुकसान का निष्कर्ष" : "How Harmful Is This Game?"}
                </div>
                <p className="text-xs leading-relaxed text-slate-300">{report.harmVerdict}</p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-[#0B1120] p-4 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{isHi ? "सुझाया गया कदम" : "Recommended Action"}</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-300">{report.recommendation}</p>
                {report.notes && (
                  <p className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    Note: {report.notes}
                  </p>
                )}
              </div>
            </div>

            {/* Category Breakdown Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-300">
                {isHi ? "श्रेणी के अनुसार जोखिम योगदान" : "Category Harm Breakdown"}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {categoryTotals.map((ct) => (
                  <div
                    key={ct.category}
                    className="rounded-lg border border-slate-800 bg-[#0B1120] px-3 py-2 flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="text-slate-300 truncate">{ct.category}</span>
                    <span className="font-mono font-semibold text-slate-100 tabular-nums shrink-0">
                      +{ct.points} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
