import React, { useState, useRef, useEffect } from 'react';
import { useLanguage, Language } from '../../context/LanguageContext';
import { useAlertNotifications } from '../../context/AlertNotificationContext';

interface GlobalHeaderProps {
  onOpenProfile?: () => void;
  onOpenAlert?: (alertId: string) => void;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({ onOpenProfile, onOpenAlert }) => {
  const { language, setLanguage, t } = useLanguage();
  const {
    notifications,
    unreadCount,
    prefs,
    isChimeRepeating,
    updatePrefs,
    enableSoundAlerts,
    silenceActiveChime,
    markNotificationRead,
    markAllRead,
  } = useAlertNotifications();

  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const langNames: Record<Language, string> = {
    en: 'English',
    hi: 'हिन्दी',
    or: 'ଓଡ଼ିଆ',
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLanguage = (lang: Language) => {
    setLanguage(lang);
    setIsLangOpen(false);
  };

  return (
    <header className="fixed top-0 w-full z-50 pt-safe bg-surface/95 backdrop-blur-xl border-b border-outline-variant/30 shadow-xs">
      <div className="h-16 px-gutter flex items-center justify-between max-w-lg mx-auto relative">
        {/* LEFT: Logo, Wordmark & Subtitle */}
        <div className="flex items-center gap-2 min-w-0 shrink">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRZG5LH1h2SZZfHuO3vAUzNxorcll-G6AODn52iqZvmE-dF0ELF2dCHSlUYxOhBbXYhJUOgHaeqkxWZo8y1QDWuaqd2JCJ1KSib0z9LjtLIFubaoE_Yimgo4RenyNacL9HPpBki-PS_NOufLwRN0xAwwpTPNVDaAZVR8spcBw3ib45Gn9VW5ZuF41HDzEhTZEUIYZqO86ht-GyVvCkKvH85vgriTrrs-kARd_EozBjgse3kvYCUhIyvpjPU0KbS5Zw"
            alt="JanmaSaathi Emblem"
            className="object-contain h-9 w-9 shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <span className="font-serif text-base sm:text-lg font-bold text-primary-container leading-none truncate">
              {t('appName')}
            </span>
            <span className="font-sans text-[8px] sm:text-[9px] font-semibold tracking-wider text-secondary uppercase mt-0.5 truncate">
              {t('subtitle')}
            </span>
          </div>
        </div>

        {/* MIDDLE / RED-MARKED AREA: Permanent Language Selector */}
        <div className="relative mx-1" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsLangOpen(!isLangOpen)}
            aria-label="Select Application Language"
            aria-expanded={isLangOpen}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-surface-container-high border border-outline-variant/50 text-xs font-bold text-primary hover:bg-surface-container-highest transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] text-primary-container shrink-0">
              language
            </span>
            <span className="font-sans text-xs font-bold tracking-tight text-on-surface">
              {langNames[language]}
            </span>
            <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">
              {isLangOpen ? 'arrow_drop_up' : 'arrow_drop_down'}
            </span>
          </button>

          {/* Language Selection Dropdown Menu */}
          {isLangOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-36 bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-1 text-[10px] font-bold text-secondary uppercase tracking-wider border-b border-outline-variant/30">
                {t('selectLanguage')}
              </div>

              {[
                { id: 'en' as Language, name: 'English' },
                { id: 'hi' as Language, name: 'हिन्दी' },
                { id: 'or' as Language, name: 'ଓଡ଼ିଆ' },
              ].map((item) => {
                const isSelected = language === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectLanguage(item.id)}
                    className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-primary-container/10 text-primary-container font-bold'
                        : 'text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <span>{item.name}</span>
                    {isSelected && (
                      <span className="material-symbols-outlined text-[16px] text-primary-container">
                        check
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Emergency Alert Notifications Bell & Existing Profile Icon Button */}
        <div className="flex items-center gap-0.5 shrink-0" ref={notifRef}>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsNotifOpen(!isNotifOpen);
                setIsLangOpen(false);
              }}
              data-testid="header-notifications-btn"
              className="w-10 h-10 flex items-center justify-center rounded-full text-secondary hover:text-primary-container hover:bg-secondary-container/30 transition-colors cursor-pointer relative"
              aria-label={t('notificationsTrayTitle')}
            >
              <span className="material-symbols-outlined text-[22px]">
                {isChimeRepeating ? 'notifications_active' : 'notifications'}
              </span>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-error text-on-error text-[10px] font-bold flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-xl py-2 z-50">
                <div className="px-3 pb-2 border-b border-outline-variant/30 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-on-surface">
                    {t('notificationsTrayTitle')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (prefs.soundEnabled) {
                          updatePrefs({ soundEnabled: false });
                        } else {
                          enableSoundAlerts();
                        }
                      }}
                      className="p-1 rounded-md hover:bg-surface-container text-secondary cursor-pointer"
                      title={prefs.soundEnabled ? 'Mute alert sound' : 'Enable alert sound'}
                      aria-label={prefs.soundEnabled ? 'Mute alert sound' : 'Enable alert sound'}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {prefs.soundEnabled ? 'volume_up' : 'volume_off'}
                      </span>
                    </button>
                    {isChimeRepeating && (
                      <button
                        type="button"
                        onClick={silenceActiveChime}
                        className="px-1.5 py-0.5 rounded bg-error text-on-error text-[10px] font-bold cursor-pointer"
                      >
                        {t('silenceChimeBtn')}
                      </button>
                    )}
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="text-[10px] font-semibold text-primary-container hover:underline cursor-pointer"
                      >
                        {t('markAllReadBtn')}
                      </button>
                    )}
                  </div>
                </div>

                {notifications.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-secondary">
                    {t('noRecentNotifications')}
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto divide-y divide-outline-variant/20">
                    {notifications.slice(0, 8).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          markNotificationRead(item.id);
                          setIsNotifOpen(false);
                          onOpenAlert?.(item.alertId);
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-surface-container/60 transition-colors cursor-pointer ${
                          !item.read ? 'bg-primary-container/5' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-on-surface truncate">
                            {item.title}
                          </span>
                          <span className="text-[9px] font-bold uppercase text-primary-container shrink-0">
                            {item.urgency}
                          </span>
                        </div>
                        <p className="text-[11px] text-secondary mt-0.5 line-clamp-2">
                          {item.body}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenProfile}
            className="w-10 h-10 flex items-center justify-center rounded-full text-secondary hover:text-primary-container hover:bg-secondary-container/30 transition-colors cursor-pointer"
            aria-label="Profile and Settings"
          >
            <span className="material-symbols-outlined text-[24px]">account_circle</span>
          </button>
        </div>
      </div>
    </header>
  );
};
