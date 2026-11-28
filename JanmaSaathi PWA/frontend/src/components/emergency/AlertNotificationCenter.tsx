import React from 'react';
import { useAlertNotifications } from '../../context/AlertNotificationContext';
import { useLanguage } from '../../context/LanguageContext';

interface AlertNotificationCenterProps {
  onOpenAlert: (alertId: string) => void;
}

export const AlertNotificationCenter: React.FC<AlertNotificationCenterProps> = ({
  onOpenAlert,
}) => {
  const {
    activeBanner,
    autoplayBlocked,
    isChimeRepeating,
    enableSoundAlerts,
    silenceActiveChime,
    dismissBanner,
    markNotificationRead,
  } = useAlertNotifications();
  const { t } = useLanguage();

  if (!activeBanner && !autoplayBlocked) return null;

  return (
    <div
      className="fixed top-[4.25rem] left-0 right-0 z-40 px-3 pointer-events-none"
      role="status"
      aria-live="assertive"
    >
      <div className="max-w-lg mx-auto space-y-2 pointer-events-auto">
        {activeBanner && (
          <div
            data-testid="live-emergency-notification-banner"
            className={`rounded-xl border shadow-lg p-3 flex flex-col gap-2 backdrop-blur-md ${
              activeBanner.urgency === 'critical' || activeBanner.eventType === 'escalated'
                ? 'bg-error-container border-error/50 text-error'
                : 'bg-surface-container-lowest border-primary-container/50 text-on-surface'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    activeBanner.urgency === 'critical' || activeBanner.eventType === 'escalated'
                      ? 'bg-error text-on-error'
                      : 'bg-primary-container text-on-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    notifications_active
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-sans text-xs font-bold leading-tight">
                      {activeBanner.title}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-surface/80 text-on-surface border border-outline-variant/40">
                      {activeBanner.urgency}
                    </span>
                  </div>
                  <p className="font-sans text-xs opacity-90 mt-0.5 leading-snug">
                    {activeBanner.body}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={dismissBanner}
                aria-label={t('dismiss')}
                className="p-1 rounded-full hover:bg-black/5 cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 flex-wrap">
              {(isChimeRepeating || !activeBanner.silenced) && (
                <button
                  type="button"
                  onClick={silenceActiveChime}
                  className="px-2.5 py-1 rounded-lg bg-surface border border-outline-variant text-[11px] font-semibold text-on-surface cursor-pointer"
                >
                  {t('silenceChimeBtn')}
                </button>
              )}

              {autoplayBlocked && (
                <button
                  type="button"
                  onClick={() => enableSoundAlerts()}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300 text-[11px] font-bold text-amber-900 cursor-pointer"
                >
                  {t('enableSoundBtn')}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  markNotificationRead(activeBanner.id);
                  onOpenAlert(activeBanner.alertId);
                  dismissBanner();
                }}
                className="px-3 py-1 rounded-lg bg-primary-container text-on-primary text-[11px] font-bold cursor-pointer"
              >
                {t('viewAlertBtn')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
