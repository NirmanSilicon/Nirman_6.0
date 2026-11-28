import React, { createContext, useContext, useState, useEffect } from 'react';
import { SUPPORTED_LANGUAGES, Language } from '../i18n/languages';
import { translations, TranslationDictionary } from '../i18n/translations';

interface LanguageContextType {
  currentLanguage: Language;
  t: (key: keyof TranslationDictionary, fallback?: string) => string;
  changeLanguage: (code: string) => void;
  allLanguages: Language[];
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLangCode, setCurrentLangCode] = useState<string>(() => {
    return localStorage.getItem('accessway_lang') || 'en';
  });

  const currentLanguage =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLangCode) ||
    SUPPORTED_LANGUAGES[0];

  const isRTL = currentLanguage.dir === 'rtl';

  useEffect(() => {
    document.documentElement.lang = currentLanguage.code;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    localStorage.setItem('accessway_lang', currentLanguage.code);
  }, [currentLanguage, isRTL]);

  const changeLanguage = (code: string) => {
    const exists = SUPPORTED_LANGUAGES.some((l) => l.code === code);
    if (exists) {
      setCurrentLangCode(code);
    }
  };

  const t = (key: keyof TranslationDictionary, fallback?: string): string => {
    const currentDict = translations[currentLangCode] || translations['en'];
    if (currentDict && currentDict[key]) {
      return currentDict[key];
    }
    const defaultDict = translations['en'];
    if (defaultDict && defaultDict[key]) {
      return defaultDict[key];
    }
    return fallback || (key as string);
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        t,
        changeLanguage,
        allLanguages: SUPPORTED_LANGUAGES,
        isRTL,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
