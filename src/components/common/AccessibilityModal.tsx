import React from 'react';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Accessibility,
  X,
  Footprints,
  Eye,
  Ear,
  Brain,
  Sliders,
  CheckCircle2,
  Volume2,
  VolumeX,
  Type,
  SunMoon,
} from 'lucide-react';

interface AccessibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccessibilityModal: React.FC<AccessibilityModalProps> = ({ isOpen, onClose }) => {
  const {
    profile,
    updateProfile,
    highContrast,
    setHighContrast,
    textSize,
    setTextSize,
    dyslexiaFont,
    setDyslexiaFont,
    reducedMotion,
    setReducedMotion,
    simpleMode,
    setSimpleMode,
    isAudioMuted,
    toggleAudioMute,
    resetProfile,
  } = useAccessibility();
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-settings-title"
    >
      <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md">
              <Accessibility className="w-6 h-6" />
            </div>
            <div>
              <h2 id="accessibility-settings-title" className="text-xl font-bold text-slate-900 dark:text-white">
                {t('profileTitle')}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Personalize journeys around your physical, visual, auditory, and cognitive needs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close accessibility settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-8">
          {/* Quick Display & Visual Controls */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" />
              Visual & Display Accessibility
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* High Contrast */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <SunMoon className="w-4 h-4 text-amber-500" />
                    {t('highContrast')}
                  </div>
                  <div className="text-xs text-slate-500">Pure black/yellow WCAG AA+ high contrast</div>
                </div>
                <button
                  type="button"
                  onClick={() => setHighContrast(!highContrast)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    highContrast ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                  aria-pressed={highContrast}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md transform" />
                </button>
              </div>

              {/* Text Size */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Type className="w-4 h-4 text-indigo-500" />
                    Text Sizing
                  </div>
                  <div className="text-xs text-slate-500">Normal, Large (+12%), Extra Large (+25%)</div>
                </div>
                <div className="flex gap-1">
                  {(['normal', 'large', 'xlarge'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setTextSize(size)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md uppercase transition-colors ${
                        textSize === size
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {size === 'normal' ? '1x' : size === 'large' ? '1.2x' : '1.4x'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dyslexia Font */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">Dyslexia-Friendly Font</div>
                  <div className="text-xs text-slate-500">Wider letter tracking and distinct weighted glyphs</div>
                </div>
                <button
                  type="button"
                  onClick={() => setDyslexiaFont(!dyslexiaFont)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    dyslexiaFont ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                  aria-pressed={dyslexiaFont}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md transform" />
                </button>
              </div>

              {/* Cognitive Simple Mode */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Brain className="w-4 h-4 text-emerald-500" />
                    {t('simpleMode')}
                  </div>
                  <div className="text-xs text-slate-500">{t('simpleModeDesc')}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSimpleMode(!simpleMode)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    simpleMode ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                  aria-pressed={simpleMode}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md transform" />
                </button>
              </div>

              {/* Master Audio Mute Toggle */}
              <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
                isAudioMuted
                  ? 'border-rose-300 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50'
              }`}>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    {isAudioMuted ? (
                      <VolumeX className="w-4 h-4 text-rose-500" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-blue-500" />
                    )}
                    <span>Mute All Audio & Speech</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {isAudioMuted
                      ? 'Spoken directions and chimes are currently muted'
                      : 'Audio alerts and turn-by-turn spoken guidance are enabled'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleAudioMute}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    isAudioMuted ? 'bg-rose-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                  aria-pressed={isAudioMuted}
                  aria-label="Toggle mute all audio"
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobility & Physical Accessibility Requirements */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
              <Footprints className="w-4 h-4 text-blue-600" />
              Mobility & Transit Requirements
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'wheelchairUser', label: t('wheelchairUser'), icon: '🧑‍🦽' },
                { key: 'avoidStairs', label: t('avoidStairs'), icon: '🚫🪜' },
                { key: 'limitedMobility', label: t('limitedMobility'), icon: '🦯' },
                { key: 'walkingAssistance', label: t('walkingAssistance'), icon: '🦿' },
                { key: 'accessibleToiletRequired', label: t('accessibleToilet'), icon: '🚻' },
                { key: 'liftPreferred', label: t('liftPreferred'), icon: '🛗' },
                { key: 'elderFriendly', label: t('elderFriendly'), icon: '👵' },
                { key: 'assistancePreferred', label: t('assistancePreferred'), icon: '🤝' },
                { key: 'visualAssistance', label: t('visualAssistance'), icon: '👁️' },
                { key: 'hearingAssistance', label: t('hearingAssistance'), icon: '👂' },
                { key: 'audioNavigationEnabled', label: t('audioNavigation'), icon: '🔊' },
              ].map(({ key, label, icon }) => {
                const checked = (profile as any)[key] as boolean;
                return (
                  <label
                    key={key}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      checked
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{icon}</span>
                      <span className="text-sm">{label}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => updateProfile({ [key]: e.target.checked })}
                      className="w-5 h-5 rounded-md text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Maximum Walking Distance Slider */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="max-walk-slider" className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  {t('maxWalkingDistance')}
                </label>
                <p className="text-xs text-slate-500">Route planner will prioritize rest stops if exceeded</p>
              </div>
              <span className="text-base font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-3 py-1 rounded-lg">
                {profile.maxWalkingDistanceMeters} meters
              </span>
            </div>
            <input
              id="max-walk-slider"
              type="range"
              min="100"
              max="2000"
              step="50"
              value={profile.maxWalkingDistanceMeters}
              onChange={(e) => updateProfile({ maxWalkingDistanceMeters: Number(e.target.value) })}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-400 font-medium">
              <span>100 m (Rest often)</span>
              <span>500 m (Average)</span>
              <span>2000 m (Long walk)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <button
            type="button"
            onClick={resetProfile}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
          >
            Reset to Default Settings
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition-colors flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
