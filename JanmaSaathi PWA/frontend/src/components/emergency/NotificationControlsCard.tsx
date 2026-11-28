import React, { useState } from 'react';
import { useAlertNotifications } from '../../context/AlertNotificationContext';
import { useLanguage } from '../../context/LanguageContext';

export const NotificationControlsCard: React.FC = () => {
  const {
    prefs,
    pushStatus,
    autoplayBlocked,
    updatePrefs,
    testAlertSound,
    enableSoundAlerts,
    enablePushNotifications,
    disablePushNotifications,
  } = useAlertNotifications();
  const { t } = useLanguage();
  const [soundFeedback, setSoundFeedback] = useState<string | null>(null);
  const [isUpdatingPush, setIsUpdatingPush] = useState(false);

  const handleTestSound = async () => {
    await enableSoundAlerts();
    const played = await testAlertSound();
    setSoundFeedback(played ? t('soundTestPlayedMsg') : t('soundBlockedMsg'));
    window.setTimeout(() => setSoundFeedback(null), 3500);
  };

  const handlePushAction = async () => {
    setIsUpdatingPush(true);
    try {
      if (pushStatus.status === 'ready' && prefs.pushEnabled) {
        await disablePushNotifications();
      } else {
        await enablePushNotifications();
      }
    } finally {
      setIsUpdatingPush(false);
    }
  };

  return (
    <section
      data-testid="notification-sound-controls-card"
      className="bg-surface-container rounded-xl p-space-lg border border-outline-variant/40 shadow-sm flex flex-col space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-sans text-xs font-bold uppercase tracking-wider text-secondary block">
            {t('emergencySoundAndPushTitle')}
          </span>
          <p className="font-sans text-[11px] text-secondary mt-0.5">
            {t('emergencySoundAndPushDesc')}
          </p>
        </div>
        <span className="material-symbols-outlined text-primary-container text-[22px]">
          notifications_active
        </span>
      </div>

      {/* Sound Toggle */}
      <div className="flex items-center justify-between py-1">
        <div className="flex flex-col pr-4">
          <span className="font-sans text-xs font-semibold text-on-surface">
            {t('enableAlertSoundLabel')}
          </span>
          <span className="font-sans text-[11px] text-secondary">
            {t('enableAlertSoundDesc')}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!prefs.soundEnabled) {
              enableSoundAlerts();
            } else {
              updatePrefs({ soundEnabled: false });
            }
          }}
          className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer ${
            prefs.soundEnabled ? 'bg-primary-container' : 'bg-outline-variant'
          }`}
          aria-label={t('enableAlertSoundLabel')}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white transition-transform ${
              prefs.soundEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Repeat Urgent Chime Toggle */}
      <div className="flex items-center justify-between py-1">
        <div className="flex flex-col pr-4">
          <span className="font-sans text-xs font-semibold text-on-surface">
            {t('repeatUrgentChimeLabel')}
          </span>
          <span className="font-sans text-[11px] text-secondary">
            {t('repeatUrgentChimeDesc')}
          </span>
        </div>
        <button
          type="button"
          onClick={() => updatePrefs({ repeatUrgentChime: !prefs.repeatUrgentChime })}
          className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer ${
            prefs.repeatUrgentChime ? 'bg-primary-container' : 'bg-outline-variant'
          }`}
          aria-label={t('repeatUrgentChimeLabel')}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white transition-transform ${
              prefs.repeatUrgentChime ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Test Sound & Autoplay Unlock */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleTestSound}
          className="px-3 py-1.5 rounded-lg bg-secondary-container text-on-secondary-container text-xs font-semibold inline-flex items-center gap-1.5 hover:opacity-90 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">volume_up</span>
          <span>{t('testAlertSoundBtn')}</span>
        </button>

        {autoplayBlocked && (
          <span className="text-[11px] text-amber-900 font-medium">
            {t('autoplayBlockedHint')}
          </span>
        )}
        {soundFeedback && (
          <span className="text-[11px] text-primary font-medium">{soundFeedback}</span>
        )}
      </div>

      {/* Background Web Push (FCM) Status & Explicit Opt-In */}
      <div className="pt-2 border-t border-outline-variant/30 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="font-sans text-xs font-semibold text-on-surface block">
              {t('backgroundPushTitle')}
            </span>
            <span className="font-sans text-[11px] text-secondary block">
              {pushStatus.status === 'ready'
                ? t('pushStatusActive')
                : pushStatus.status === 'vapid_missing'
                ? t('pushStatusVapidMissing')
                : pushStatus.status === 'permission_denied'
                ? t('pushStatusBlocked')
                : pushStatus.status === 'unsupported'
                ? t('pushStatusUnsupported')
                : t('pushStatusInactive')}
            </span>
          </div>

          {pushStatus.status !== 'unsupported' && (
            <button
              type="button"
              disabled={isUpdatingPush || pushStatus.status === 'vapid_missing'}
              onClick={handlePushAction}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-50 ${
                pushStatus.status === 'ready' && prefs.pushEnabled
                  ? 'bg-surface-container-high border border-outline-variant text-secondary'
                  : 'bg-primary-container text-on-primary shadow-sm'
              }`}
            >
              {pushStatus.status === 'ready' && prefs.pushEnabled
                ? t('disablePushBtn')
                : t('enablePushBtn')}
            </button>
          )}
        </div>

        {pushStatus.lastError && (
          <p className="text-[11px] text-secondary bg-surface-container-low p-2 rounded-lg border border-outline-variant/30">
            {pushStatus.lastError}
          </p>
        )}
      </div>
    </section>
  );
};
