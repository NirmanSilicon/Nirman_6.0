import type { Language, PageId } from '../types/fraud.ts';
import type { TranslationContent } from '../i18n/translations.ts';

interface NavbarProps {
  t: TranslationContent;
  activePage: PageId;
  onNavigatePage: (page: PageId, anchorId?: string) => void;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
}

export function Navbar({
  t,
  activePage,
  onNavigatePage,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark in dark blue */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            onNavigatePage('home');
          }}
          className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#0F2547] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1E40AF] rounded"
        >
          {t.brandName}
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav
          aria-label="Primary"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          <button
            type="button"
            onClick={() => onNavigatePage('home')}
            className={`py-1 whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer border-b-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1E40AF] ${
              activePage === 'home'
                ? 'text-[#0F2547] border-[#0F2547] font-semibold'
                : 'border-transparent hover:text-[#0F2547] hover:border-slate-300'
            }`}
          >
            {t.nav.home}
          </button>
          <button
            type="button"
            onClick={() => onNavigatePage('check')}
            className={`py-1 whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer border-b-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1E40AF] ${
              activePage === 'check'
                ? 'text-[#0F2547] border-[#0F2547] font-semibold'
                : 'border-transparent hover:text-[#0F2547] hover:border-slate-300'
            }`}
          >
            {t.nav.checkFraud}
          </button>
          <button
            type="button"
            onClick={() => onNavigatePage('home', 'how-it-works')}
            className="py-1 whitespace-nowrap shrink-0 border-b-2 border-transparent hover:text-[#0F2547] hover:border-slate-300 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1E40AF]"
          >
            {t.nav.howItWorks}
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigatePage('check')}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#0F2547] rounded-lg hover:bg-[#1A3A6E] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E40AF]"
          >
            {t.nav.primaryCta}
          </button>
        </div>
      </div>
    </header>
  );
}
