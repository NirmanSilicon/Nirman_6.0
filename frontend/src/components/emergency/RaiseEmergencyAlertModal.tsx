import React, { useEffect, useMemo, useState } from 'react';
import {
  EmergencyAlert,
  EmergencyAlertConcernCategory,
  EmergencyAlertUrgency,
  Mother,
} from '../../types';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../context/LanguageContext';
import { CONCERN_CATEGORIES } from './alertConstants';

interface RaiseEmergencyAlertModalProps {
  isOpen: boolean;
  mode: 'worker' | 'supervisor';
  actorId: string;
  actorName: string;
  initialMotherId?: string;
  onClose: () => void;
  onSubmitted?: (alert: EmergencyAlert) => void;
}

export const RaiseEmergencyAlertModal: React.FC<RaiseEmergencyAlertModalProps> = ({
  isOpen,
  mode,
  actorId,
  actorName,
  initialMotherId,
  onClose,
  onSubmitted,
}) => {
  const { mothers, assessments, hospitals, raiseEmergencyAlert } = useData();
  const { t, language, formatName, localize } = useLanguage();

  const selectableMothers: Mother[] = useMemo(() => {
    const byId = new Map<string, Mother>();
    mothers.forEach((m) => {
      if (m?.id && !byId.has(m.id)) {
        byId.set(m.id, m);
      }
    });
    const all = Array.from(byId.values());
    if (mode === 'worker') {
      return all.filter((m) => m.assignedWorkerId === actorId);
    }
    return all;
  }, [mothers, mode, actorId]);

  const [selectedMotherId, setSelectedMotherId] = useState(
    initialMotherId || selectableMothers[0]?.id || ''
  );
  const [category, setCategory] = useState<EmergencyAlertConcernCategory>('high_bp');
  const [urgency, setUrgency] = useState<EmergencyAlertUrgency>('urgent');
  const [targetHospitalId, setTargetHospitalId] = useState(
    hospitals[0]?.id || 'HOSP-RAMPUR-PHC'
  );
  const [reason, setReason] = useState('');
  const [attachedAssessmentId, setAttachedAssessmentId] = useState('');
  const [systolicBP, setSystolicBP] = useState('');
  const [diastolicBP, setDiastolicBP] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [bodyTemp, setBodyTemp] = useState('');
  const [hemoglobin, setHemoglobin] = useState('');
  const [fetalHeartRate, setFetalHeartRate] = useState('');
  const [fetalMovementStatus, setFetalMovementStatus] = useState<
    'normal' | 'reduced' | 'absent'
  >('normal');
  const [transportRequested, setTransportRequested] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedAlert, setSubmittedAlert] = useState<EmergencyAlert | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialMotherId) {
      setSelectedMotherId(initialMotherId);
    } else if (selectableMothers.length > 0 && !selectableMothers.some((m) => m.id === selectedMotherId)) {
      setSelectedMotherId(selectableMothers[0].id);
    }
  }, [initialMotherId, selectableMothers, selectedMotherId]);

  const motherAssessments = useMemo(
    () => assessments.filter((a) => a.motherId === selectedMotherId),
    [assessments, selectedMotherId]
  );

  // Auto-select and prefill latest assessment when switching mother
  useEffect(() => {
    const latest = motherAssessments[0];
    if (latest) {
      setAttachedAssessmentId(latest.id);
      setSystolicBP(latest.systolicBP ? String(latest.systolicBP) : '');
      setDiastolicBP(latest.diastolicBP ? String(latest.diastolicBP) : '');
      setHeartRate(latest.heartRate ? String(latest.heartRate) : '');
      setBodyTemp(latest.bodyTemp ? String(latest.bodyTemp) : '');
      setHemoglobin(latest.hemoglobin ? String(latest.hemoglobin) : '');
      setFetalHeartRate(latest.fetalHeartRate ? String(latest.fetalHeartRate) : '');
      setFetalMovementStatus(latest.fetalMovementStatus || 'normal');
    } else {
      setAttachedAssessmentId('');
    }
  }, [selectedMotherId, motherAssessments]);

  if (!isOpen) return null;

  const activeCategory =
    CONCERN_CATEGORIES.find((c) => c.id === category) || CONCERN_CATEGORIES[2];

  const handleSelectAssessment = (asmtId: string) => {
    setAttachedAssessmentId(asmtId);
    const chosen = motherAssessments.find((a) => a.id === asmtId);
    if (chosen) {
      setSystolicBP(chosen.systolicBP ? String(chosen.systolicBP) : '');
      setDiastolicBP(chosen.diastolicBP ? String(chosen.diastolicBP) : '');
      setHeartRate(chosen.heartRate ? String(chosen.heartRate) : '');
      setBodyTemp(chosen.bodyTemp ? String(chosen.bodyTemp) : '');
      setHemoglobin(chosen.hemoglobin ? String(chosen.hemoglobin) : '');
      setFetalHeartRate(chosen.fetalHeartRate ? String(chosen.fetalHeartRate) : '');
      setFetalMovementStatus(chosen.fetalMovementStatus || 'normal');
    }
  };

  const resetAndClose = () => {
    setSubmittedAlert(null);
    setReason('');
    setErrorMsg(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg(t('describeSymptomsPlaceholder'));
      return;
    }

    const chosenMother =
      selectableMothers.find((m) => m.id === selectedMotherId) || selectableMothers[0];
    const chosenAssessment = motherAssessments.find((a) => a.id === attachedAssessmentId);

    const parsedVitals = {
      ...(systolicBP ? { systolicBP: Number(systolicBP) } : {}),
      ...(diastolicBP ? { diastolicBP: Number(diastolicBP) } : {}),
      ...(heartRate ? { heartRate: Number(heartRate) } : {}),
      ...(bodyTemp ? { bodyTemp: Number(bodyTemp) } : {}),
      ...(hemoglobin ? { hemoglobin: Number(hemoglobin) } : {}),
      ...(fetalHeartRate ? { fetalHeartRate: Number(fetalHeartRate) } : {}),
      fetalMovementStatus,
    };

    const assessmentSummary = chosenAssessment
      ? `${chosenAssessment.id} · BP ${chosenAssessment.systolicBP}/${chosenAssessment.diastolicBP} mmHg${
          chosenAssessment.hemoglobin ? ` · Hb ${chosenAssessment.hemoglobin} g/dL` : ''
        }${
          chosenAssessment.fetalHeartRate ? ` · FHR ${chosenAssessment.fetalHeartRate} bpm` : ''
        }`
      : undefined;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const created = await raiseEmergencyAlert({
        motherId: chosenMother.id,
        motherName: chosenMother.name,
        motherPhone: chosenMother.phone,
        motherAge: chosenMother.age,
        gestationalAgeWeeks: chosenMother.gestationalAgeWeeks,
        village: chosenMother.village,
        hamlet: chosenMother.hamlet,
        assignedWorkerId: chosenMother.assignedWorkerId || (mode === 'worker' ? actorId : 'HW-44120'),
        assignedWorkerName:
          chosenMother.assignedWorkerName || (mode === 'worker' ? actorName : 'Sunita Devi'),
        raisedByRole: mode,
        raisedById: actorId,
        raisedByName: actorName,
        targetHospitalId,
        concernCategory: category,
        concernLabel: activeCategory.label.en,
        urgency,
        symptoms: activeCategory.suggestedSymptoms,
        description: reason.trim(),
        attachedAssessmentId: chosenAssessment?.id,
        attachedAssessmentSummary: assessmentSummary,
        vitals: parsedVitals,
        dangerSigns: chosenAssessment?.dangerSigns || [],
        transportRequested,
      });

      setSubmittedAlert(created);
      onSubmitted?.(created);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to raise emergency alert.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('raiseEmergencyAlertAction')}
    >
      <div className="w-full max-w-lg bg-surface rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto p-space-lg border border-outline-variant shadow-2xl flex flex-col space-y-space-md">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-error text-[24px]">
              notification_important
            </span>
            <h3 className="font-serif text-lg font-bold text-on-surface">
              {t('raiseEmergencyAlertAction')}
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
                {submittedAlert.id} • {formatName(submittedAlert.motherName)}
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

            {/* Safety Reminder */}
            {urgency === 'critical' && (
              <div className="p-3 rounded-xl bg-error-container/80 border border-error/30 flex items-center justify-between gap-2">
                <span className="text-[11px] text-error font-semibold leading-snug">
                  {t('protocolUrgencyDescCritical')}
                </span>
                <a
                  href="tel:102"
                  className="px-3 py-1.5 rounded-lg bg-error text-on-error text-xs font-bold shrink-0"
                >
                  {t('callAmbulance102')}
                </a>
              </div>
            )}

            {/* Mother Selector */}
            <div>
              <label className="font-sans text-xs font-semibold text-on-surface block mb-1">
                {t('selectMotherLabel')} *
              </label>
              <select
                value={selectedMotherId}
                onChange={(e) => setSelectedMotherId(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant font-sans text-xs text-on-surface"
              >
                {selectableMothers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.id}) — Wk {m.gestationalAgeWeeks}
                  </option>
                ))}
              </select>
            </div>

            {/* Concern Category & Target Hospital */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-sans text-xs font-semibold text-on-surface block mb-1">
                  {t('concernCategoryLabel')} *
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    const nextCat = e.target.value as EmergencyAlertConcernCategory;
                    setCategory(nextCat);
                    const found = CONCERN_CATEGORIES.find((c) => c.id === nextCat);
                    if (found) setUrgency(found.defaultUrgency);
                  }}
                  className="w-full h-11 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant font-sans text-xs text-on-surface"
                >
                  {CONCERN_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label[language] || c.label.en}
                    </option>
                  ))}
                </select>
              </div>

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
                      {localize(h.name, h.translations?.name)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Approved Protocol Urgency */}
            <div>
              <label className="font-sans text-xs font-semibold text-on-surface block mb-1.5">
                {t('urgencyProtocolLabel')} *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['moderate', 'urgent', 'critical'] as EmergencyAlertUrgency[]).map((lvl) => {
                  const active = urgency === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setUrgency(lvl)}
                      className={`p-2 rounded-xl border text-xs font-bold min-h-[44px] transition-colors cursor-pointer ${
                        active
                          ? lvl === 'critical'
                            ? 'bg-error text-on-error border-error'
                            : 'bg-primary-container text-on-primary border-primary-container'
                          : 'bg-surface-container text-on-surface border-outline-variant'
                      }`}
                    >
                      {lvl === 'critical'
                        ? t('alertUrgencyCritical')
                        : lvl === 'urgent'
                        ? t('alertUrgencyUrgent')
                        : t('alertUrgencyModerate')}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-secondary mt-1">
                {urgency === 'critical'
                  ? t('protocolUrgencyDescCritical')
                  : urgency === 'urgent'
                  ? t('protocolUrgencyDescUrgent')
                  : t('protocolUrgencyDescModerate')}
              </p>
            </div>

            {/* Clinical Reason */}
            <div>
              <label className="font-sans text-xs font-semibold text-on-surface block mb-1">
                {t('describeSymptomsLabel')} *
              </label>
              <textarea
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('describeSymptomsPlaceholder')}
                className="w-full p-3 rounded-lg bg-surface-container-lowest border border-outline-variant font-sans text-xs text-on-surface"
              />
            </div>

            {/* Attach Assessment */}
            <div>
              <label className="font-sans text-xs font-semibold text-on-surface block mb-1">
                {t('attachAssessmentLabel')}
              </label>
              <select
                value={attachedAssessmentId}
                onChange={(e) => handleSelectAssessment(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant font-sans text-xs text-on-surface"
              >
                <option value="">{t('noAssessmentAttached')}</option>
                {motherAssessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.id} ({a.recordedAt}) — BP {a.systolicBP}/{a.diastolicBP} mmHg
                  </option>
                ))}
              </select>
            </div>

            {/* Vital Readings */}
            <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/40 space-y-2">
              <span className="font-sans text-xs font-semibold text-on-surface block">
                {t('vitalsReadingsLabel')}
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-secondary block">Systolic BP</label>
                  <input
                    type="number"
                    value={systolicBP}
                    onChange={(e) => setSystolicBP(e.target.value)}
                    placeholder="mmHg"
                    className="w-full h-9 px-2 rounded bg-surface-container-lowest border border-outline-variant text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-secondary block">Diastolic BP</label>
                  <input
                    type="number"
                    value={diastolicBP}
                    onChange={(e) => setDiastolicBP(e.target.value)}
                    placeholder="mmHg"
                    className="w-full h-9 px-2 rounded bg-surface-container-lowest border border-outline-variant text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-secondary block">Pulse (bpm)</label>
                  <input
                    type="number"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    placeholder="bpm"
                    className="w-full h-9 px-2 rounded bg-surface-container-lowest border border-outline-variant text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-secondary block">Temp (°F)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={bodyTemp}
                    onChange={(e) => setBodyTemp(e.target.value)}
                    placeholder="98.6"
                    className="w-full h-9 px-2 rounded bg-surface-container-lowest border border-outline-variant text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-secondary block">Hb (g/dL)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={hemoglobin}
                    onChange={(e) => setHemoglobin(e.target.value)}
                    placeholder="11.0"
                    className="w-full h-9 px-2 rounded bg-surface-container-lowest border border-outline-variant text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-secondary block">FHR (bpm)</label>
                  <input
                    type="number"
                    value={fetalHeartRate}
                    onChange={(e) => setFetalHeartRate(e.target.value)}
                    placeholder="140"
                    className="w-full h-9 px-2 rounded bg-surface-container-lowest border border-outline-variant text-xs"
                  />
                </div>
              </div>
            </div>

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
