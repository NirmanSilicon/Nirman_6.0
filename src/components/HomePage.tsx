import { useState } from 'react';
import { ArrowRight, ShieldCheck, PhoneCall } from 'lucide-react';
import type { TranslationContent } from '../i18n/translations.ts';
import type { ChannelType, Language, PageId } from '../types/fraud.ts';
import { LanguageBar } from './LanguageBar.tsx';
import { SolutionVideoCard } from './SolutionVideoCard.tsx';

interface HomePageProps {
  t: TranslationContent;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  onNavigatePage: (page: PageId, anchorId?: string) => void;
  onJumpToChecker: (channel?: ChannelType) => void;
}

const HERO_IMAGE_SRC = '/src/assets/images/hero_satark_setu_1795269667650.jpg';

const PILLAR_STYLES: Record<'detect' | 'alert' | 'protect', { bg: string; border: string; accent: string }> = {
  detect: {
    bg: 'bg-[#EEF5FF]',
    border: 'border-[#CFE0FA]',
    accent: 'text-[#1E40AF]',
  },
  alert: {
    bg: 'bg-[#FFF6EB]',
    border: 'border-[#F7DFBF]',
    accent: 'text-[#9A3412]',
  },
  protect: {
    bg: 'bg-[#ECFDF5]',
    border: 'border-[#BCEAD5]',
    accent: 'text-[#166534]',
  },
};

const CHANNEL_PASTELS = [
  'bg-[#F2F6FF] border-[#D7E4FC]',
  'bg-[#FFF8EF] border-[#F8E2C6]',
  'bg-[#F2FBF6] border-[#CBEAD9]',
];

export function HomePage({
  t,
  language,
  onChangeLanguage,
  onNavigatePage,
  onJumpToChecker,
}: HomePageProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <main className="pb-16">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-12 sm:pb-16">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200/80">
          <LanguageBar
            language={language}
            onChangeLanguage={onChangeLanguage}
            label={t.languageLabel}
          />
          <p className="text-xs sm:text-sm font-medium text-slate-600 tabular-nums">
            {t.hero.helplineNote}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center">
            <p className="text-sm font-semibold text-[#1E40AF] tracking-wide mb-3">
              {t.hero.eyebrow}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-[#0F2547] leading-[1.08] text-balance mb-4">
              {t.hero.title}
            </h1>
            <p className="text-lg sm:text-xl font-semibold text-[#1B3A6B] mb-4 text-balance">
              {t.hero.subtitle}
            </p>
            <p className="text-base text-slate-600 leading-relaxed max-w-2xl mb-8">
              {t.hero.description}
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onJumpToChecker('auto')}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm sm:text-base font-semibold text-white bg-[#0F2547] rounded-lg hover:bg-[#1A3A6E] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E40AF]"
              >
                <span>{t.hero.primaryBtn}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => onNavigatePage('home', 'how-it-works')}
                className="px-4 py-3 text-sm sm:text-base font-medium text-[#0F2547] hover:text-[#1E40AF] underline underline-offset-4 decoration-slate-300 hover:decoration-[#1E40AF] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E40AF] rounded"
              >
                {t.hero.secondaryBtn}
              </button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="h-full min-h-[260px] sm:min-h-[320px] rounded-2xl overflow-hidden border border-slate-200 bg-[#EEF5FF]">
              {!imgFailed ? (
                <img
                  src={HERO_IMAGE_SRC}
                  alt={t.hero.imageAlt}
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#EEF5FF] via-[#F8FAFC] to-[#ECFDF5]">
                  <ShieldCheck className="w-14 h-14 text-[#0F2547] mb-3" aria-hidden="true" />
                  <p className="font-display text-xl font-bold text-[#0F2547]">{t.hero.title}</p>
                  <p className="text-sm text-slate-600 mt-1">{t.hero.eyebrow}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Core Pillars: Pastel Cards (Detect · Alert · Protect) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="max-w-2xl mb-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F2547] text-balance mb-2">
            {t.pillars.sectionTitle}
          </h2>
          <p className="text-base text-slate-600 leading-relaxed">
            {t.pillars.sectionSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {t.pillars.items.map((pillar) => {
            const style = PILLAR_STYLES[pillar.key];
            return (
              <article
                key={pillar.key}
                className={`${style.bg} ${style.border} border rounded-xl p-6 flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5`}
              >
                <div>
                  <div className="flex items-baseline justify-between gap-2 mb-3">
                    <span className={`font-mono text-sm font-semibold tabular-nums ${style.accent}`}>
                      {pillar.number}
                    </span>
                    <span className="text-xs font-medium text-slate-600">
                      {pillar.subtitle}
                    </span>
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-[#0F2547] mb-3">
                    {pillar.title}
                  </h3>
                  <p className="text-sm sm:text-[15px] text-slate-700 leading-relaxed mb-6">
                    {pillar.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onJumpToChecker(pillar.targetChannel)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F2547] hover:text-[#1E40AF] transition-colors duration-150 whitespace-nowrap self-start cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E40AF] rounded"
                >
                  <span>{pillar.actionLabel}</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {/* Channel Coverage & Helpline Guidance */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 scroll-mt-20">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F2547] text-balance mb-2">
              {t.coverage.sectionTitle}
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              {t.coverage.sectionSubtitle}
            </p>
          </div>

          <LanguageBar
            language={language}
            onChangeLanguage={onChangeLanguage}
            label={t.languageLabel}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 grid grid-cols-1 gap-4">
            {t.coverage.channels.map((item, idx) => (
              <div
                key={item.title}
                className={`${CHANNEL_PASTELS[idx]} border rounded-xl p-5 sm:p-6`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h3 className="font-display text-lg font-bold text-[#0F2547]">
                    {item.title}
                  </h3>
                  <span className="text-xs font-medium text-slate-600">
                    {item.channelTag}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-900/10 text-sm">
                  <div>
                    <p className="font-semibold text-[#B91C1C] mb-1">
                      {t.checker.verdictFraud}
                    </p>
                    <p className="text-slate-700 leading-relaxed">{item.fraudPattern}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-[#15803D] mb-1">
                      {t.checker.verdictSafe}
                    </p>
                    <p className="text-slate-700 leading-relaxed">{item.safePattern}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-5 flex flex-col gap-6">
            <SolutionVideoCard t={t} />

            <aside className="flex-1 bg-[#F3F2FF] border border-[#DBD8FA] rounded-xl p-6 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-[#3730A3] mb-2">
                  {t.coverage.helplineCard.portal}
                </p>
                <h3 className="font-display text-xl font-bold text-[#0F2547] mb-4 text-balance">
                  {t.coverage.helplineCard.title}
                </h3>

                <div className="py-4 my-4 border-y border-[#3730A3]/15 flex items-center gap-3">
                  <PhoneCall className="w-6 h-6 text-[#0F2547] shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-slate-600">{t.footer.helpline}</p>
                    <p className="font-mono text-3xl font-bold text-[#0F2547] tabular-nums leading-none mt-1">
                      {t.coverage.helplineCard.number}
                    </p>
                  </div>
                </div>

                <ol className="space-y-3 text-sm text-slate-700">
                  {t.coverage.helplineCard.steps.map((step, index) => (
                    <li key={step} className="flex gap-2.5 leading-relaxed">
                      <span className="font-mono text-xs font-semibold text-[#0F2547] tabular-nums pt-0.5">
                        0{index + 1}.
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <button
                type="button"
                onClick={() => onJumpToChecker('auto')}
                className="mt-6 w-full px-4 py-2.5 text-sm font-semibold text-white bg-[#0F2547] rounded-lg hover:bg-[#1A3A6E] transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E40AF]"
              >
                {t.hero.primaryBtn}
              </button>
            </aside>
          </div>
        </div>
      </section>

      {/* Team CODE CRAFT Section */}
      <section id="team-code-craft" className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 scroll-mt-20">
        <div className="bg-[#EEF4FC] border border-[#D4E2F6] rounded-2xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F2547] text-balance mb-3">
              {t.team.title}
            </h2>
            <p className="text-base text-slate-700 leading-relaxed max-w-2xl">
              {t.team.description}
            </p>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between gap-6">
            <ul className="space-y-2.5 text-sm text-slate-700">
              {t.team.missionPoints.map((point, idx) => (
                <li key={point} className="flex items-start gap-2.5">
                  <span className="font-mono text-xs font-semibold text-[#0F2547] tabular-nums pt-0.5">
                    0{idx + 1}.
                  </span>
                  <span className="leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>

            <div>
              <button
                type="button"
                onClick={() => onJumpToChecker('auto')}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0F2547] rounded-lg hover:bg-[#1A3A6E] transition-colors duration-150 whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E40AF]"
              >
                <span>{t.team.ctaLabel}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
