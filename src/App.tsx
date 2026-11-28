import { useEffect, useState } from 'react';
import { TRANSLATIONS } from './i18n/translations.ts';
import type { ChannelType, Language, PageId } from './types/fraud.ts';
import { Navbar } from './components/Navbar.tsx';
import { HomePage } from './components/HomePage.tsx';
import { CheckFraudPage } from './components/CheckFraudPage.tsx';

export default function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [activePage, setActivePage] = useState<PageId>(() =>
    window.location.hash === '#check-fraud' ? 'check' : 'home'
  );
  const [checkerChannel, setCheckerChannel] = useState<ChannelType>('auto');

  const t = TRANSLATIONS[language];

  useEffect(() => {
    document.documentElement.lang = language === 'or' ? 'or' : language === 'hi' ? 'hi' : 'en';
  }, [language]);

  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash === '#check-fraud') {
        setActivePage('check');
      } else if (window.location.hash === '#home' || window.location.hash === '') {
        setActivePage('home');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function handleNavigatePage(page: PageId, anchorId?: string) {
    setActivePage(page);
    if (page === 'check') {
      window.history.replaceState(null, '', '#check-fraud');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (anchorId) {
      window.history.replaceState(null, '', `#${anchorId}`);
      requestAnimationFrame(() => {
        const el = document.getElementById(anchorId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      });
    } else {
      window.history.replaceState(null, '', '#home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function handleJumpToChecker(channel: ChannelType = 'auto') {
    setCheckerChannel(channel);
    handleNavigatePage('check');
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F2547]">
      <Navbar
        t={t}
        activePage={activePage}
        onNavigatePage={handleNavigatePage}
        language={language}
        onChangeLanguage={setLanguage}
      />

      {/* Mobile Secondary Page Switcher (clean, non-sticky so mobile sticky stays < 15%) */}
      <div className="md:hidden border-b border-slate-200 bg-white px-4 py-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleNavigatePage('home')}
          className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            activePage === 'home'
              ? 'bg-[#0F2547] text-white'
              : 'text-slate-600 bg-slate-100'
          }`}
        >
          {t.nav.home}
        </button>
        <button
          type="button"
          onClick={() => handleNavigatePage('check')}
          className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            activePage === 'check'
              ? 'bg-[#0F2547] text-white'
              : 'text-slate-600 bg-slate-100'
          }`}
        >
          {t.nav.checkFraud}
        </button>
      </div>

      <div className="flex-1">
        {activePage === 'home' ? (
          <HomePage
            t={t}
            language={language}
            onChangeLanguage={setLanguage}
            onNavigatePage={handleNavigatePage}
            onJumpToChecker={handleJumpToChecker}
          />
        ) : (
          <CheckFraudPage
            key={checkerChannel}
            t={t}
            language={language}
            onChangeLanguage={setLanguage}
            initialChannel={checkerChannel}
          />
        )}
      </div>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm text-slate-600">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#0F2547]">{t.footer.rights}</span>
            <span aria-hidden="true">·</span>
            <span>{t.footer.builtBy}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-mono font-semibold text-[#0F2547] tabular-nums">
              {t.footer.helpline}
            </span>
            <button
              type="button"
              onClick={() => handleNavigatePage(activePage === 'home' ? 'check' : 'home')}
              className="font-medium text-[#1E40AF] hover:underline underline-offset-4 cursor-pointer whitespace-nowrap"
            >
              {activePage === 'home' ? t.nav.checkFraud : t.nav.home}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
