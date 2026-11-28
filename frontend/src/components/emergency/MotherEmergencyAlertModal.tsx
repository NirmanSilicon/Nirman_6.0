import React, { useState } from 'react';
import {
  EmergencyAlert,
  EmergencyAlertConcernCategory,
  EmergencyAlertUrgency,
  Mother,
} from '../../types';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../context/LanguageContext';
import { CONCERN_CATEGORIES } from './alertConstants';

interface MotherEmergencyAlertModalProps {
  isOpen: boolean;
  mother: Mother;
  onClose: () => void;
  onSubmitted?: (alert: EmergencyAlert) => void;
}

export const MotherEmergencyAlertModal: React.FC<MotherEmergencyAlertModalProps> = ({
  isOpen,
  mother,
  onClose,
  onSubmitted,
}) => {
  const { hospitals, raiseEmergencyAlert } = useData();
  const { t, language, formatName, localize } = useLanguage();

  const [category, setCategory] = useState<EmergencyAlertConcernCategory>('bleeding');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [additionalHealthInfo, setAdditionalHealthInfo] = useState('');
  const [targetHospitalId, setTargetHospitalId] = useState(
    hospitals[0]?.id || 'HOSP-RAMPUR-PHC'
  );
  const [transportRequested, setTransportRequested] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedAlert, setSubmittedAlert] = useState<EmergencyAlert | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeCategory =
    CONCERN_CATEGORIES.find((c) => c.id === category) || CONCERN_CATEGORIES[0];

  const handleCategorySelect = (catId: EmergencyAlertConcernCategory) => {
    setCategory(catId);
    const found = CONCERN_CATEGORIES.find((c) => c.id === catId);
    if (found) {
      setSelectedSymptoms([found.suggestedSymptoms[0]]);
    }
  };

  const toggleSymptom = (sym: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const resetAndClose = () => {
    setSubmittedAlert(null);
    setDescription('');
    setAdditionalHealthInfo('');
    setSelectedSymptoms([]);
    setTransportRequested(false);
    setErrorMsg(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() && selectedSymptoms.length === 0) {
      setErrorMsg(t('describeSymptomsPlaceholder'));
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const concernLabel = activeCategory.label.en;
      const urgency: EmergencyAlertUrgency = activeCategory.defaultUrgency;
      const created = await raiseEmergencyAlert({
        motherId: mother.id,
        motherName: mother.name,
        motherPhone: mother.phone,
        motherAge: mother.age,
        gestationalAgeWeeks: mother.gestationalAgeWeeks,
        village: mother.village,
        hamlet: mother.hamlet,
        assignedWorkerId: mother.assignedWorkerId,
        assignedWorkerName: mother.assignedWorkerName,
        raisedByRole: 'mother',
        raisedById: mother.id,
        raisedByName: mother.name,
        targetHospitalId,
        concernCategory: category,
        concernLabel,
        urgency,
        symptoms:
          selectedSymptoms.length > 0 ? selectedSymptoms : [activeCategory.label.en],
        description:
          description.trim() ||
          `${activeCategory.label.en}: ${selectedSymptoms.join(', ')}`,
        additionalHealthInfo: additionalHealthInfo.trim() || undefined,
        dangerSigns: activeCategory.isCriticalDangerSign
          ? [activeCategory.label.en]
          : [],
        transportRequested,
      });

      setSubmittedAlert(created);
      onSubmitted?.(created);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to submit emergency alert.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('raiseEmergencyAlertTitle')}
    >
      <div className="w-full max-w-lg bg-surface rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto p-space-lg border border-outline-variant shadow-2xl flex flex-col space-y-space-md">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-error text-[24px]">
              emergency_share
            </span>
            <h3 className="font-serif text-lg font-bold text-on-surface">
              {t('raiseEmergencyAlertTitle')}
            </h3>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-secondary hover:text-on-surface cursor-pointer"
            aria-label={t('close')}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Immediate Safety Banner (Never delays emergency care) */}
        <div className="p-3 rounded-xl bg-error-container/80 border border-error/30 space-y-2">
          <div className="flex items-start gap-2 text-error">
            <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">
              warning
            </span>
            <div className="text-xs leading-relaxed">
              <strong className="block font-bold">
                {t('dangerSignImmediateSafetyTitle')}
              </strong>
              <span>{t('dangerSignImmediateSafetyBody')}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="tel:102"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-error text-on-error text-xs font-bold shadow-sm hover:opacity-95 min-h-[40px]"
            >
              <span className="material-symbols-outlined text-[16px]">call</span>
              <span>{t('callAmbulance102')}</span>
            </a>
            <a
              href="tel:108"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface text-error border border-error/40 text-xs font-bold hover:bg-surface-container min-h-[40px]"
            >
              <span className="material-symbols-outlined text-[16px]">local_shipping</span>
              <span>{t('call108Ambulance')}</span>
            </a>
          </div>
        </div>

        {submittedAlert ? (
          <div className="py-4 space-y-4">
            <div
              className={`p-4 rounded-xl border text-center space-y-2 ${
                submittedAlert.syncStatus === 'pending_sync'
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-secondary-container/40 border-primary-container/30 text-on-surface'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[42px] ${
                  submittedAlert.syncStatus === 'pending_sync'
                    ? 'text-amber-700'
                    : 'text-primary-container'
                }`}
              >
                {submittedAlert.syncStatus === 'pending_sync'
                  ? 'cloud_queue'
                  : 'check_circle'}
              </span>
              <h4 className="font-serif text-lg font-bold">
                {submittedAlert.syncStatus === 'pending_sync'
                  ? t('alertQueuedOfflineTitle')
                  : t('alertSubmittedLiveTitle')}
              </h4>
              <p className="font-sans text-xs leading-relaxed">
                {submittedAlert.syncStatus === 'pending_sync'
                  ? t('alertQueuedOfflineDesc')
                  : t('alertSubmittedLiveDesc', {
                      hospital: submittedAlert.targetHospitalName,
                    })}
              </p>
              <div className="pt-1 text-[11px] font-semibold text-secondary">
                ID: {submittedAlert.id} • {formatName(mother.name)}
              </div>
            </div>

            <button
              type="button"
              onClick={resetAndClose}
              className="w-full h-12 rounded-xl bg-primary-container text-on-primary font-sans text-sm font-semibold shadow-sm hover:opacity-95 cursor-pointer"
            >
              {t('close')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-space-md">
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-error-container text-error text-xs font-medium">
                {errorMsg}
              </div>
            )}

            {/* Concern Category */}
            <div>
              <label className="font-sans text-xs font-semibold text-on-surface block mb-2">
                {t('concernCategoryLabel')} *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CONCERN_CATEGORIES.map((cat) => {
                  const selected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategorySelect(cat.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-colors min-h-[44px] cursor-pointer ${
                        selected
                          ? 'bg-primary-container text-on-primary border-primary-container shadow-sm'
                          : 'bg-surface-container text-on-surface border-outline-variant hover:border-primary-container'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px] shrink-0">
                        {cat.icon}
                      </span>
                      <span className="font-sans text-xs font-semibold leading-snug">
                        {cat.label[language] || cat.label.en}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Suggested Symptoms */}
            <div>
              <label className="font-sans text-xs font-semibold text-on-surface block mb-1.5">
                {t('symptomsTitle')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {activeCategory.suggestedSymptoms.map((sym) => {
                  const selected = selectedSymptoms.includes(sym);
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => toggleSymptom(sym)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-primary-container text-on-primary border-primary-container'
                          : 'bg-surface-container text-on-surface border-outline-variant hover:border-primary-container'
                      }`}
                    >
                      {localize(sym)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="font-sans text-xs font-semibold text-on-surface block mb-1">
                {t('describeSymptomsLabel')} *
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('describeSymptomsPlaceholder')}
                className="w-full p-3 rounded-lg bg-surface-container-lowest border border-outline-variant font-sans text-sm text-on-surface focus:outline-none focus:border-primary-container"
              />
            </div>

            {/* Additional Health Information */}
            <div>
              <label className="font-sans text-xs font-semibold text-on-surface block mb-1">
                {t('additionalHealthInfoLabel')}
              </label>
              <input
                type="text"
                value={additionalHealthInfo}
                onChange={(e) => setAdditionalHealthInfo(e.target.value)}
                placeholder={t('additionalHealthInfoPlaceholder')}
                className="w-full h-11 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant font-sans text-sm text-on-surface focus:outline-none focus:border-primary-container"
              />
            </div>

            {/* Target Hospital */}
            <div>
              <label className="font-sans text-xs font-semibold text-on-surface block mb-1">
                {t('targetHospitalLabel')} *
              </label>
              <select
                value={targetHospitalId}
                onChange={(e) => setTargetHospitalId(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant font-sans text-xs text-on-surface"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {localize(h.name, h.translations?.name)} ({h.facilityType})
                  </option>
                ))}
              </select>
            </div>

            {/* Transport Needed Toggle */}
            <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-container border border-outline-variant/40 cursor-pointer">
              <input
                type="checkbox"
                checked={transportRequested}
                onChange={(e) => setTransportRequested(e.target.checked)}
                className="w-4 h-4 accent-[#890149]"
              />
              <span className="font-sans text-xs font-semibold text-on-surface">
                {t('transportNeededLabel')}
              </span>
            </label>

            {/* Footer */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={resetAndClose}
                className="flex-1 h-12 rounded-xl border border-outline-variant text-on-surface font-sans text-xs font-semibold hover:bg-surface-container cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 h-12 rounded-xl bg-primary-container text-on-primary font-sans text-xs font-bold shadow-sm hover:opacity-95 disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? t('submittingAlertBtn') : t('submitEmergencyAlertBtn')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
