import { useState } from "react";
import {
  ArrowRight,
  BrainCircuit,
  Chrome,
  Database,
  Globe2,
  Layers,
  Server,
  ShieldCheck,
} from "lucide-react";
import type { Language } from "../types/fairplay";
import { TRANSLATIONS } from "../data/i18n";

interface ArchitectureRoadmapProps {
  language: Language;
  onAnnouncement: (message: string) => void;
}

const PIPELINE_STAGES = [
  {
    id: "input",
    step: "01",
    title: "User Input / Extension Hook",
    icon: Chrome,
    summary: "Captures storefront metadata, shop copy, or live PC modal triggers.",
    detail:
      "Players or parents paste a shop policy on the web app, or the Chrome Extension reads storefront IAP disclosures before download. On desktop, the lightweight companion hook monitors only shop/gacha modal overlays.",
  },
  {
    id: "backend",
    step: "02",
    title: "API Backend & Metadata Scraper",
    icon: Server,
    summary: "FastAPI / Express pipeline normalizes currency bundles and odds text.",
    detail:
      "Extracts virtual-to-fiat conversion ratios (e.g., Gems to ₹/USD), detects countdown clock tokens, and cross-checks community-submitted dark-pattern reports.",
  },
  {
    id: "classifier",
    step: "03",
    title: "Gemini + NLP Dark-Pattern Classifier",
    icon: BrainCircuit,
    summary: "Classifies Skill vs. Cosmetic vs. Gambling-Like mechanics (0–100).",
    detail:
      "Combines Scikit-learn behavioral heuristics with structured Gemini reasoning to identify Variable-Ratio Reinforcement, Dual-Currency Obfuscation, Near-Miss loops, and Pay-to-Win resets.",
  },
  {
    id: "shield",
    step: "04",
    title: "Interactive Report & Selective Shield",
    icon: ShieldCheck,
    summary: "Generates parent/gamer alerts and blocks only RNG popups.",
    detail:
      "Instead of banning an entire game, FairPlay Shield selectively intercepts and blurs real-money spinning wheels and loot banners while keeping skill-based missions playable.",
  },
];

const ROADMAP_CARDS = [
  {
    title: "Chrome Web Store Extension",
    timeline: "Phase 1 · Q1",
    icon: Chrome,
    description:
      "Zero-setup browser extension displaying pre-download Predatory Risk Scores directly on Steam, Google Play Web, and Epic Games Store pages.",
  },
  {
    title: "PC Lightweight Overlay SDK",
    timeline: "Phase 2 · Q2",
    icon: Layers,
    description:
      "Low-overhead Windows/Linux companion overlay that blurs real-money gacha and spin-wheel popups without interfering with core gameplay frames.",
  },
  {
    title: "Crowdsourced Threat Database",
    timeline: "Phase 3 · Q3",
    icon: Database,
    description:
      "Community-verified registry of drop rates, stealth odds adjustments, and regional pricing dark patterns audited by gamers and parents.",
  },
  {
    title: "Regional Indian Language Pack",
    timeline: "Phase 4 · Q4",
    icon: Globe2,
    description:
      "Full multilingual alerts and parental guides across Hindi, Odia, Tamil, and Bengali to protect families in Tier-2 and Tier-3 cities.",
  },
];

export function ArchitectureRoadmap({ language, onAnnouncement }: ArchitectureRoadmapProps) {
  const t = TRANSLATIONS[language].roadmap;
  const [activeStageId, setActiveStageId] = useState<string>("input");
  const [prismError, setPrismError] = useState<boolean>(false);

  const selectedStage =
    PIPELINE_STAGES.find((s) => s.id === activeStageId) ?? PIPELINE_STAGES[0];

  return (
    <section aria-labelledby="roadmap-heading" className="space-y-8">
      {/* Intro Split Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch rounded-xl border border-slate-800 bg-[#111827] overflow-hidden">
        <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-center space-y-3">
          <div className="text-xs font-semibold text-indigo-400">
            Team ByteStorm · Technical Overview
          </div>
          <h1 id="roadmap-heading" className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-50">
            {t.title}
          </h1>
          <p className="text-sm leading-relaxed text-slate-300 max-w-2xl">{t.subtitle}</p>
        </div>

        <div className="lg:col-span-4 relative min-h-[180px] bg-[#0B1120]">
          {!prismError ? (
            <img
              src="/src/assets/images/guardian_shield_prism_1795798985146.jpg"
              alt="Optical prism and shield representing FairPlay Lens transparency"
              referrerPolicy="no-referrer"
              onError={() => setPrismError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="h-full w-full bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950/30"
            />
          )}
        </div>
      </div>

      {/* Interactive Workflow Pipeline */}
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-100">{t.pipelineTitle}</h2>
          <span className="text-xs text-slate-400">Click any stage to inspect data flow</span>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-4 gap-3"
          role="tablist"
          aria-label="System architecture pipeline stages"
        >
          {PIPELINE_STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isSelected = stage.id === activeStageId;
            return (
              <div key={stage.id} className="flex items-stretch gap-2">
                <button
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-label={`Inspect stage ${stage.step}: ${stage.title}`}
                  onClick={() => {
                    setActiveStageId(stage.id);
                    onAnnouncement(`Selected architecture stage ${stage.step}: ${stage.title}.`);
                  }}
                  className={`flex-1 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-500/15"
                      : "border-slate-800 bg-[#0B1120] hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-indigo-400">{stage.step}</span>
                    <Icon className="h-4 w-4 text-slate-300" aria-hidden="true" />
                  </div>
                  <div className="text-sm font-semibold text-slate-100">{stage.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{stage.summary}</p>
                </button>
                {idx < PIPELINE_STAGES.length - 1 && (
                  <div className="hidden md:flex items-center text-slate-600" aria-hidden="true">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Stage Detail Panel */}
        <div
          role="tabpanel"
          aria-label={selectedStage.title}
          className="rounded-lg border border-slate-800 bg-[#0B1120] p-4 space-y-1"
        >
          <div className="text-xs font-semibold text-indigo-300">
            Stage {selectedStage.step} · {selectedStage.title}
          </div>
          <p className="text-sm leading-relaxed text-slate-300">{selectedStage.detail}</p>
        </div>
      </div>

      {/* Future Scalability Cards */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-slate-100">{t.scalabilityTitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ROADMAP_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.title}
                className="rounded-xl border border-slate-800 bg-[#111827] p-5 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-indigo-400" aria-hidden="true" />
                  <span className="font-mono text-xs text-slate-400">{card.timeline}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-100">{card.title}</h3>
                <p className="text-xs leading-relaxed text-slate-300">{card.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
