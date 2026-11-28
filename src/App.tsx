import { useState } from "react";
import { Languages, Shield } from "lucide-react";
import type { Currency, Language, TabId } from "./types/fairplay";
import { TRANSLATIONS } from "./data/i18n";
import { TransparencyScanner } from "./components/TransparencyScanner";
import { ManualRiskAudit } from "./components/ManualRiskAudit";
import { ProbabilityLab } from "./components/ProbabilityLab";
import { FairPlayShield } from "./components/FairPlayShield";
import { ParentalHub } from "./components/ParentalHub";
import { ArchitectureRoadmap } from "./components/ArchitectureRoadmap";
import { FairPlayAssistantWidget } from "./components/FairPlayAssistantWidget";

const TAB_ORDER: TabId[] = ["scanner", "audit", "lab", "shield", "hub", "roadmap"];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("scanner");
  const [language, setLanguage] = useState<Language>("en");
  const [currency, setCurrency] = useState<Currency>("INR");
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>("");

  const t = TRANSLATIONS[language];

  const handleLanguageToggle = () => {
    const next: Language = language === "en" ? "hi" : "en";
    setLanguage(next);
    setLiveAnnouncement(
      next === "hi"
        ? "भाषा हिंदी में बदली गई।"
        : "Interface language switched to English."
    );
  };

  const handleTabSelect = (tab: TabId) => {
    setActiveTab(tab);
    setLiveAnnouncement(`Switched to ${t.tabs[tab]} view.`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1120] text-slate-100">
      {/* Screen-reader live region for state announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* Skip to main content link for keyboard & screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>

      {/* Top Navigation Bar (Strict 3-Zone Contract) */}
      <header className="no-print sticky top-0 z-40 border-b border-slate-800/80 bg-[#0B1120]/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#scanner"
            onClick={(e) => {
              e.preventDefault();
              handleTabSelect("scanner");
            }}
            aria-label="FairPlay Lens home"
            className="inline-flex items-center gap-2 font-display text-lg font-bold tracking-tight text-slate-50 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md"
          >
            <Shield className="h-5 w-5 text-indigo-400 shrink-0" aria-hidden="true" />
            <span>{t.brandName}</span>
          </a>

          {/* Zone 2: 5 Single-Line Navigation Tabs */}
          <nav
            role="tablist"
            aria-label="Primary FairPlay Lens modules"
            className="hidden md:flex items-center gap-6"
          >
            {TAB_ORDER.map((tabId) => {
              const isActive = activeTab === tabId;
              return (
                <button
                  key={tabId}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Open ${t.tabs[tabId]} module`}
                  onClick={() => handleTabSelect(tabId)}
                  className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md ${
                    isActive ? "text-white" : "text-slate-400 hover:text-slate-100"
                  }`}
                >
                  <span>{t.tabs[tabId]}</span>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 -bottom-[17px] h-0.5 bg-indigo-500"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Language Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={handleLanguageToggle}
              aria-label={t.languageSwitchLabel}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 transition-colors whitespace-nowrap shrink-0"
            >
              <Languages className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t.languageButtonText}</span>
            </button>
          </div>
        </div>

        {/* Mobile Compact Tab Strip */}
        <nav
          role="tablist"
          aria-label="Mobile module navigation"
          className="md:hidden flex items-center gap-1.5 overflow-x-auto border-t border-slate-800/80 px-4 py-2"
        >
          {TAB_ORDER.map((tabId) => {
            const isActive = activeTab === tabId;
            return (
              <button
                key={tabId}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Open ${t.tabs[tabId]} module`}
                onClick={() => handleTabSelect(tabId)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-slate-300 bg-slate-900/70 hover:bg-slate-800"
                }`}
              >
                {t.tabs[tabId]}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Content Area */}
      <main
        id="main-content"
        className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8"
      >
        {activeTab === "scanner" && (
          <TransparencyScanner
            language={language}
            onAnnouncement={setLiveAnnouncement}
          />
        )}
        {activeTab === "audit" && (
          <ManualRiskAudit
            language={language}
            onAnnouncement={setLiveAnnouncement}
          />
        )}
        {activeTab === "lab" && (
          <ProbabilityLab
            language={language}
            currency={currency}
            onCurrencyChange={setCurrency}
            onAnnouncement={setLiveAnnouncement}
          />
        )}
        {activeTab === "shield" && (
          <FairPlayShield
            language={language}
            onJumpToLab={() => handleTabSelect("lab")}
            onJumpToScanner={() => handleTabSelect("scanner")}
            onAnnouncement={setLiveAnnouncement}
          />
        )}
        {activeTab === "hub" && (
          <ParentalHub
            language={language}
            currency={currency}
            onAnnouncement={setLiveAnnouncement}
          />
        )}
        {activeTab === "roadmap" && (
          <ArchitectureRoadmap
            language={language}
            onAnnouncement={setLiveAnnouncement}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="no-print border-t border-slate-800/80 bg-[#0B1120] py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <span>{t.footerText}</span>
          <button
            type="button"
            onClick={handleLanguageToggle}
            aria-label={t.languageSwitchLabel}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-800 bg-[#111827] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors whitespace-nowrap"
          >
            <Languages className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
            <span>{language === "en" ? "Switch to हिन्दी" : "Switch to English"}</span>
          </button>
        </div>
      </footer>

      <FairPlayAssistantWidget
        language={language}
        onAnnouncement={setLiveAnnouncement}
      />
    </div>
  );
}
