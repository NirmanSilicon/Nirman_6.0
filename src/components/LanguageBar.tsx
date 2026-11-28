import type { Language } from '../types/fraud.ts';

interface LanguageBarProps {
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  label: string;
}

const LANGUAGES: { id: Language; nativeLabel: string }[] = [
  { id: 'en', nativeLabel: 'English' },
  { id: 'hi', nativeLabel: 'हिन्दी' },
  { id: 'or', nativeLabel: 'ଓଡ଼ିଆ' },
];

export function LanguageBar({ language, onChangeLanguage, label }: LanguageBarProps) {
  return (
    <div className="inline-flex flex-wrap items-center gap-3">
      <span className="text-xs font-medium text-slate-500 whitespace-nowrap">{label}:</span>
      <div
        role="group"
        aria-label={label}
        className="inline-flex items-center gap-1 p-1 bg-[#EEF3FA] border border-[#D8E2F0] rounded-lg"
      >
        {LANGUAGES.map((item) => {
          const isActive = language === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeLanguage(item.id)}
              aria-pressed={isActive}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E40AF] ${
                isActive
                  ? 'bg-[#0F2547] text-white shadow-xs'
                  : 'text-[#0F2547]/80 hover:text-[#0F2547] hover:bg-white/70'
              }`}
            >
              {item.nativeLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
