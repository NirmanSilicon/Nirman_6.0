import { useEffect, useState } from "react";
import { CheckSquare, Flag, Plus, Search, ShieldCheck, Square, X } from "lucide-react";
import type { CommunityReport, Currency, EthicalGame, Language } from "../types/fairplay";
import { TRANSLATIONS } from "../data/i18n";
import {
  ETHICAL_GAMES,
  INITIAL_CHECKLIST,
  INITIAL_COMMUNITY_REPORTS,
} from "../data/presets";

interface ParentalHubProps {
  language: Language;
  currency: Currency;
  onAnnouncement: (message: string) => void;
}

const CHECKLIST_STORAGE_KEY = "fairplay_parent_checklist_v1";
const REPORTS_STORAGE_KEY = "fairplay_community_reports_v1";

export function ParentalHub({ language, currency, onAnnouncement }: ParentalHubProps) {
  const t = TRANSLATIONS[language].hub;

  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : { "disable-1click": true };
    } catch {
      return { "disable-1click": true };
    }
  });

  const [reports, setReports] = useState<CommunityReport[]>(() => {
    try {
      const raw = localStorage.getItem(REPORTS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CommunityReport[]) : INITIAL_COMMUNITY_REPORTS;
    } catch {
      return INITIAL_COMMUNITY_REPORTS;
    }
  });

  const [categoryFilter, setCategoryFilter] = useState<
    "All" | EthicalGame["category"]
  >("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Report form state
  const [reportTitle, setReportTitle] = useState("");
  const [reportPlatform, setReportPlatform] = useState("Android / iOS");
  const [reportPattern, setReportPattern] = useState("Hidden Loot Box / Gacha Odds");
  const [reportNotes, setReportNotes] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(checkedMap));
    } catch {
      // Ignore storage quota errors
    }
  }, [checkedMap]);

  useEffect(() => {
    try {
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
    } catch {
      // Ignore storage quota errors
    }
  }, [reports]);

  const toggleCheck = (id: string, label: string) => {
    setCheckedMap((prev) => {
      const nextVal = !prev[id];
      onAnnouncement(`${label} ${nextVal ? "checked" : "unchecked"}.`);
      return { ...prev, [id]: nextVal };
    });
  };

  const completedCount = INITIAL_CHECKLIST.filter((item) => checkedMap[item.id]).length;

  const filteredGames = ETHICAL_GAMES.filter((game) => {
    const matchesCat = categoryFilter === "All" || game.category === categoryFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      game.title.toLowerCase().includes(q) ||
      game.genre.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTitle.trim() || !reportNotes.trim()) return;

    const newReport: CommunityReport = {
      id: `rep-${Date.now()}`,
      gameTitle: reportTitle.trim(),
      platform: reportPlatform,
      patternType: reportPattern,
      notes: reportNotes.trim(),
      submittedAt: new Date().toISOString().slice(0, 10),
    };

    setReports((prev) => [newReport, ...prev]);
    setReportTitle("");
    setReportNotes("");
    setModalOpen(false);
    onAnnouncement(`Submitted community dark-pattern report for ${newReport.gameTitle}.`);
  };

  const metrics = [
    {
      label: "Top Mobile Games with Loot Boxes",
      value: "58%",
      context: "Of top-grossing titles on mobile storefronts use randomized rewards",
    },
    {
      label: "Youth Exposure Under Age 16",
      value: "41%",
      context: "Young gamers encounter FOMO countdowns or paid spin wheels weekly",
    },
    {
      label: "Average Unplanned Monthly Spend",
      value: currency === "INR" ? "₹1,850" : "$24",
      context: "Reported per household when 1-click store purchases stay enabled",
    },
    {
      label: "Dual-Currency Obfuscation Rate",
      value: "74%",
      context: "Predatory titles mask real money behind gems, shards, or tokens",
    },
  ];

  return (
    <section aria-labelledby="hub-heading" className="space-y-8">
      {/* Hub Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-[#111827] p-6">
        <div>
          <h1 id="hub-heading" className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-50">
            {t.title}
          </h1>
          <p className="mt-1.5 text-sm text-slate-300">{t.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-label="Open form to report a newly launched game with predatory mechanics"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>{t.reportButton}</span>
        </button>
      </div>

      {/* Awareness Metrics */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-200">{t.metricsTitle}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-xl border border-slate-800 bg-[#111827] p-5 space-y-1.5">
              <div className="text-xs font-medium text-slate-400">{m.label}</div>
              <div className="font-mono text-2xl font-bold text-slate-50 tabular-nums">{m.value}</div>
              <p className="text-xs leading-relaxed text-slate-400">{m.context}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Parental Quick-Action Checklist + Community Threat Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Parental Checklist */}
        <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-[#111827] p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-100">{t.checklistTitle}</h2>
            <span className="font-mono text-xs font-semibold text-emerald-400 tabular-nums">
              {completedCount} / {INITIAL_CHECKLIST.length} Completed
            </span>
          </div>

          <ul className="space-y-3" aria-label="Parental quick-action safety checklist">
            {INITIAL_CHECKLIST.map((item) => {
              const checked = Boolean(checkedMap[item.id]);
              const title = language === "hi" ? item.titleHi : item.titleEn;
              const detail = language === "hi" ? item.detailHi : item.detailEn;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    aria-label={`${title}: ${checked ? "completed" : "not completed"}`}
                    onClick={() => toggleCheck(item.id, title)}
                    className={`w-full flex items-start gap-3 rounded-lg border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      checked
                        ? "border-emerald-500/35 bg-emerald-500/10"
                        : "border-slate-800 bg-[#0B1120] hover:border-slate-700"
                    }`}
                  >
                    {checked ? (
                      <CheckSquare className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                    ) : (
                      <Square className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
                    )}
                    <div>
                      <div
                        className={`text-sm font-semibold ${
                          checked ? "text-emerald-200 line-through" : "text-slate-100"
                        }`}
                      >
                        {title}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">{detail}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Community Reports Live List */}
        <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-[#111827] p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-100">{t.communityFeedTitle}</h2>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {reports.length} Reports
            </span>
          </div>

          <ul className="space-y-3" aria-label="Community reported predatory games" aria-live="polite">
            {reports.map((rep) => (
              <li
                key={rep.id}
                className="rounded-lg border border-slate-800 bg-[#0B1120] p-4 space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Flag className="h-3.5 w-3.5 text-red-400 shrink-0" aria-hidden="true" />
                    <span className="text-sm font-semibold text-slate-100">{rep.gameTitle}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono tabular-nums">
                    {rep.platform} · {rep.submittedAt}
                  </span>
                </div>
                <div className="text-xs font-medium text-amber-300">{rep.patternType}</div>
                <p className="text-xs leading-relaxed text-slate-300">{rep.notes}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Healthier Game Alternatives Directory */}
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-slate-100">{t.directoryTitle}</h2>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter safe games..."
                aria-label="Search ethical zero-gambling games"
                className="rounded-lg border border-slate-700 bg-[#0B1120] pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter safe games by category">
              {(["All", "Zero Microtransactions", "Indie", "Co-op / Story"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={categoryFilter === cat}
                  aria-label={`Filter directory by ${cat}`}
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    categoryFilter === cat
                      ? "bg-indigo-600 text-white"
                      : "bg-[#0B1120] text-slate-300 border border-slate-800 hover:bg-slate-800"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGames.map((game) => (
            <article
              key={game.id}
              className="rounded-lg border border-slate-800 bg-[#0B1120] p-4 space-y-2.5 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-100">{game.title}</h3>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>FairPlay Safe</span>
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  {game.genre} · {game.ageRating}
                </div>
                <p className="text-xs leading-relaxed text-slate-300">
                  {language === "hi" ? game.whySafeHi : game.whySafe}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">{game.category}</span>
                <span className="text-emerald-300 font-semibold">
                  {currency === "INR" ? game.priceInr : game.priceUsd}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Community Report Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-[#111827] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 id="report-modal-title" className="text-lg font-bold text-slate-50">
                {t.reportButton}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close report predatory game form"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label htmlFor="report-game-title" className="block text-xs font-medium text-slate-300 mb-1">
                  Game Title
                </label>
                <input
                  id="report-game-title"
                  type="text"
                  required
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="e.g. Royal Spin Arena"
                  aria-label="Game title to report"
                  className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="report-platform" className="block text-xs font-medium text-slate-300 mb-1">
                  Platform
                </label>
                <select
                  id="report-platform"
                  value={reportPlatform}
                  onChange={(e) => setReportPlatform(e.target.value)}
                  aria-label="Game platform"
                  className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="Android / iOS">Android / iOS</option>
                  <option value="PC / Steam">PC / Steam</option>
                  <option value="Console (PS / Xbox)">Console (PS / Xbox)</option>
                </select>
              </div>

              <div>
                <label htmlFor="report-pattern" className="block text-xs font-medium text-slate-300 mb-1">
                  Predatory Pattern Observed
                </label>
                <select
                  id="report-pattern"
                  value={reportPattern}
                  onChange={(e) => setReportPattern(e.target.value)}
                  aria-label="Predatory dark pattern category"
                  className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="Hidden Loot Box / Gacha Odds">Hidden Loot Box / Gacha Odds</option>
                  <option value="Weighted Spin Wheel & Near-Miss">Weighted Spin Wheel & Near-Miss</option>
                  <option value="Dual-Currency Obfuscation">Dual-Currency Obfuscation</option>
                  <option value="FOMO Countdown Pressure">FOMO Countdown Pressure</option>
                </select>
              </div>

              <div>
                <label htmlFor="report-notes" className="block text-xs font-medium text-slate-300 mb-1">
                  Details for Parents & Gamers
                </label>
                <textarea
                  id="report-notes"
                  required
                  rows={3}
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="Describe the shop trap, drop odds, or real-money prompt..."
                  aria-label="Details about the predatory mechanic"
                  className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  aria-label="Cancel report submission"
                  className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  aria-label="Submit community dark-pattern report"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
