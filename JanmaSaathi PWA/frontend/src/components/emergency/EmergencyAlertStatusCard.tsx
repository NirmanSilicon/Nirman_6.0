import React, { useState } from 'react';
import { EmergencyAlert } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { getAlertDelayInfo, isAlertTerminalStatus } from './alertConstants';

interface EmergencyAlertStatusCardProps {
  alert: EmergencyAlert;
  roleView: 'mother' | 'worker' | 'supervisor';
  onEscalate?: (alert: EmergencyAlert) => void;
  onAddFieldUpdate?: (alertId: string, note: string) => Promise<void>;
  compact?: boolean;
}

export const EmergencyAlertStatusCard: React.FC<EmergencyAlertStatusCardProps> = ({
  alert,
  roleView,
  onEscalate,
  onAddFieldUpdate,
  compact = false,
}) => {
  const { t, formatName, formatNumber, localize } = useLanguage();
  const [isUpdatingNote, setIsUpdatingNote] = useState(false);
  const [fieldNote, setFieldNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const isPendingSync =
    alert.syncStatus === 'pending_sync' || (alert as any).syncState === 'pending_sync';
  const delayInfo = getAlertDelayInfo(alert);
  const isTerminal = isAlertTerminalStatus(alert.status);

  const statusSteps = [
    {
      key: 'pending',
      label: alert.status === 'new' ? t('alertStatusNew') : t('alertStatusPendingAck'),
    },
    { key: 'acknowledged', label: t('alertStatusAcknowledged') },
    {
      key: alert.status === 'escalated' ? 'escalated' : 'in_progress',
      label:
        alert.status === 'escalated'
          ? t('alertStatusEscalated')
          : t('alertStatusInProgress'),
    },
    {
      key: alert.status === 'referred' ? 'referred' : 'action_taken',
      label:
        alert.status === 'referred'
          ? t('alertStatusReferred')
          : t('alertStatusActionTaken'),
    },
    {
      key: alert.status === 'closed' ? 'closed' : 'resolved',
      label:
        alert.status === 'closed'
          ? t('alertStatusClosed')
          : t('alertStatusResolved'),
    },
  ];

  const getCurrentStepIndex = () => {
    if (alert.status === 'resolved' || alert.status === 'closed') return 4;
    if (alert.status === 'action_taken' || alert.status === 'referred') return 3;
    if (alert.status === 'in_progress' || alert.status === 'escalated') return 2;
    if (alert.status === 'acknowledged') return 1;
    return 0;
  };

  const currentStep = getCurrentStepIndex();

  const urgencyBadgeClass =
    alert.urgency === 'critical'
      ? 'bg-error text-on-error'
      : alert.urgency === 'urgent'
      ? 'bg-primary-container text-on-primary'
      : 'bg-secondary-container text-on-secondary-container';

  const urgencyLabel =
    alert.urgency === 'critical'
      ? t('alertUrgencyCritical')
      : alert.urgency === 'urgent'
      ? t('alertUrgencyUrgent')
      : t('alertUrgencyModerate');

  const statusLabel =
    alert.status === 'closed'
      ? t('alertStatusClosed')
      : alert.status === 'resolved'
      ? t('alertStatusResolved')
      : alert.status === 'referred'
      ? t('alertStatusReferred')
      : alert.status === 'action_taken'
      ? t('alertStatusActionTaken')
      : alert.status === 'escalated'
      ? t('alertStatusEscalated')
      : alert.status === 'in_progress'
      ? t('alertStatusInProgress')
      : alert.status === 'acknowledged'
      ? t('alertStatusAcknowledged')
      : alert.status === 'new'
      ? t('alertStatusNew')
      : t('alertStatusPendingAck');

  const handleSaveFieldNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldNote.trim() || !onAddFieldUpdate) return;
    setIsSubmittingNote(true);
    try {
      await onAddFieldUpdate(alert.id, fieldNote.trim());
      setFieldNote('');
      setIsUpdatingNote(false);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  return (
    <div
      data-testid={`emergency-alert-card-${alert.id}`}
      className={`bg-surface-container rounded-xl p-space-md border shadow-sm flex flex-col space-y-space-sm transition-colors ${
        delayInfo.isDelayed
          ? 'border-error/60 ring-1 ring-error/25'
          : alert.urgency === 'critical' && !isTerminal
          ? 'border-primary-container/60'
          : 'border-outline-variant/40'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-sans text-sm font-bold text-on-surface">
              {localize(alert.concernLabel, alert.translations?.concernLabel)}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${urgencyBadgeClass}`}>
              {urgencyLabel}
            </span>
            {isPendingSync && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">cloud_off</span>
                {t('pendingOfflineSyncBadge')}
              </span>
            )}
            {delayInfo.isDelayed && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-error-container text-error border border-error/30 inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">timer_off</span>
                {t('delayedAckBadge', { mins: delayInfo.elapsedMinutes })}
              </span>
            )}
          </div>

          <div className="font-sans text-xs text-secondary mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {roleView !== 'mother' && (
              <span className="font-semibold text-on-surface">
                {formatName(alert.motherName)} ({formatNumber(alert.motherId)})
              </span>
            )}
            <span>
              {t('raisedByLabel')}: {formatName(alert.raisedByName)}
            </span>
            <span>• {formatNumber(alert.createdAtLabel)}</span>
          </div>
        </div>

        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
            isTerminal
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              : alert.status === 'escalated'
              ? 'bg-error text-on-error'
              : alert.status === 'acknowledged' ||
                alert.status === 'in_progress' ||
                alert.status === 'action_taken' ||
                alert.status === 'referred'
              ? 'bg-secondary-container text-on-secondary-container'
              : 'bg-surface-container-highest text-primary-container border border-primary-container/30'
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Target Hospital & Status Progress */}
      <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/30 space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-primary font-semibold min-w-0">
            <span className="material-symbols-outlined text-[16px] shrink-0">local_hospital</span>
            <span className="truncate">
              {localize(alert.targetHospitalName, alert.translations?.targetHospitalName)}
            </span>
          </div>
          {alert.transportRequested && (
            <span className="px-2 py-0.5 rounded bg-primary-container/10 text-primary-container text-[10px] font-bold shrink-0">
              102 / 108
            </span>
          )}
        </div>

        {/* 5-Stage Lifecycle Stepper */}
        <div className="grid grid-cols-5 gap-1 pt-0.5">
          {statusSteps.map((step, idx) => {
            const active = !isPendingSync && idx <= currentStep;
            const current = !isPendingSync && idx === currentStep;
            return (
              <div key={step.key} className="flex flex-col gap-1">
                <div
                  className={`h-1.5 rounded-full transition-colors ${
                    isPendingSync
                      ? 'bg-amber-300/70'
                      : active
                      ? alert.status === 'escalated' && idx === 2
                        ? 'bg-error'
                        : 'bg-primary-container'
                      : 'bg-outline-variant/40'
                  }`}
                />
                <span
                  className={`text-[9px] leading-tight truncate ${
                    current
                      ? 'font-bold text-on-surface'
                      : active
                      ? 'text-secondary font-medium'
                      : 'text-secondary/60'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Symptoms, Description & Vitals */}
      {!compact && (
        <div className="space-y-1.5 text-xs">
          <p className="text-on-surface leading-relaxed">
            {localize(alert.description, alert.translations?.description)}
          </p>

          {alert.additionalHealthInfo && (
            <p className="text-secondary text-[11px]">
              <strong className="text-on-surface">{t('additionalHealthInfoLabel')}:</strong>{' '}
              {alert.additionalHealthInfo}
            </p>
          )}

          {alert.attachedAssessmentSummary && (
            <div className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-[11px] text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-primary-container shrink-0">
                clinical_notes
              </span>
              <span className="truncate">{alert.attachedAssessmentSummary}</span>
            </div>
          )}

          {alert.vitals && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {alert.vitals.systolicBP && alert.vitals.diastolicBP && (
                <span className="px-2 py-0.5 rounded bg-surface-container-lowest border border-outline-variant/40 text-[11px] font-medium text-on-surface">
                  BP {formatNumber(alert.vitals.systolicBP)}/{formatNumber(alert.vitals.diastolicBP)} mmHg
                </span>
              )}
              {alert.vitals.heartRate && (
                <span className="px-2 py-0.5 rounded bg-surface-container-lowest border border-outline-variant/40 text-[11px] font-medium text-on-surface">
                  HR {formatNumber(alert.vitals.heartRate)} bpm
                </span>
              )}
              {alert.vitals.bodyTemp && (
                <span className="px-2 py-0.5 rounded bg-surface-container-lowest border border-outline-variant/40 text-[11px] font-medium text-on-surface">
                  Temp {formatNumber(alert.vitals.bodyTemp)}°F
                </span>
              )}
              {alert.vitals.hemoglobin && (
                <span className="px-2 py-0.5 rounded bg-surface-container-lowest border border-outline-variant/40 text-[11px] font-medium text-on-surface">
                  Hb {formatNumber(alert.vitals.hemoglobin)} g/dL
                </span>
              )}
              {alert.vitals.fetalHeartRate && (
                <span className="px-2 py-0.5 rounded bg-surface-container-lowest border border-outline-variant/40 text-[11px] font-medium text-on-surface">
                  FHR {formatNumber(alert.vitals.fetalHeartRate)} bpm
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hospital Acknowledgement & Response Updates */}
      <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-primary flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-primary-container">
              forum
            </span>
            {t('hospitalResponseUpdatesTitle')}
          </span>
          {alert.acknowledgedBy && (
            <span className="text-secondary font-medium truncate max-w-[55%]">
              {formatName(alert.acknowledgedBy)}
            </span>
          )}
        </div>

        {isPendingSync ? (
          <p className="text-[11px] text-amber-900 font-medium">
            {t('alertQueuedOfflineDesc')}
          </p>
        ) : alert.hospitalUpdates && alert.hospitalUpdates.length > 0 ? (
          <div className="space-y-1.5">
            {alert.hospitalUpdates.map((upd) => (
              <div
                key={upd.id}
                className="text-[11px] text-on-surface border-l-2 border-primary-container/50 pl-2 py-0.5"
              >
                <div className="flex items-center justify-between gap-2 text-[10px] text-secondary">
                  <span className="font-semibold text-primary">{formatName(upd.actorName)}</span>
                  <span>{formatNumber(upd.timestampLabel)}</span>
                </div>
                <p className="text-tertiary leading-snug mt-0.5">{upd.note}</p>
              </div>
            ))}
          </div>
        ) : alert.hospitalResponse ? (
          <p className="text-[11px] text-tertiary">
            {localize(alert.hospitalResponse, alert.translations?.hospitalResponse)}
          </p>
        ) : (
          <p className="text-[11px] text-secondary italic">{t('waitingHospitalAckNote')}</p>
        )}

        {alert.actionTakenSummary && (
          <div className="mt-1 p-2 rounded bg-secondary-container/30 border border-outline-variant/30 text-[11px] text-on-surface">
            <strong>{t('alertStatusActionTaken')}:</strong> {alert.actionTakenSummary}
          </div>
        )}

        {alert.referredFacilityName && (
          <div className="mt-1 p-2 rounded bg-secondary-container/30 border border-outline-variant/30 text-[11px] text-on-surface">
            <strong>{t('alertStatusReferred')}:</strong> {alert.referredFacilityName}
          </div>
        )}

        {alert.escalated && alert.escalationReason && (
          <div className="mt-1 p-2 rounded bg-error-container/50 border border-error/25 text-[11px] text-error">
            <strong>{t('alertStatusEscalated')}:</strong> {alert.escalationReason}
            {alert.escalationTargetHospitalName && ` (${alert.escalationTargetHospitalName})`}
          </div>
        )}

        {alert.resolutionNotes && (
          <div className="mt-1 p-2 rounded bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-950">
            <strong>{t('alertStatusResolved')}:</strong> {alert.resolutionNotes}
            {alert.resolvedBy && ` (${formatName(alert.resolvedBy)})`}
          </div>
        )}
      </div>

      {/* Role Actions */}
      {(roleView === 'supervisor' || (roleView === 'worker' && onAddFieldUpdate)) &&
        !isTerminal && (
          <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/30">
            {roleView === 'worker' && onAddFieldUpdate && (
              <button
                type="button"
                onClick={() => setIsUpdatingNote(!isUpdatingNote)}
                className="text-xs font-semibold text-primary-container hover:underline cursor-pointer"
              >
                {isUpdatingNote ? t('cancel') : t('addWorkerFieldUpdateBtn')}
              </button>
            )}

            {roleView === 'supervisor' && onEscalate && (
              <button
                type="button"
                onClick={() => onEscalate(alert)}
                className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                  delayInfo.isDelayed
                    ? 'bg-error text-on-error shadow-sm hover:opacity-95'
                    : 'bg-primary-container text-on-primary shadow-sm hover:opacity-95'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">trending_up</span>
                <span>{t('escalateCaseBtn')}</span>
              </button>
            )}
          </div>
        )}

      {isUpdatingNote && onAddFieldUpdate && (
        <form onSubmit={handleSaveFieldNote} className="space-y-2 pt-1">
          <textarea
            rows={2}
            value={fieldNote}
            onChange={(e) => setFieldNote(e.target.value)}
            placeholder="Record field follow-up or transport dispatch note..."
            className="w-full p-2 rounded-lg bg-surface-container-lowest border border-outline-variant font-sans text-xs text-on-surface"
          />
          <button
            type="submit"
            disabled={isSubmittingNote || !fieldNote.trim()}
            className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary text-xs font-semibold disabled:opacity-50 cursor-pointer"
          >
            {t('save')}
          </button>
        </form>
      )}
    </div>
  );
};
