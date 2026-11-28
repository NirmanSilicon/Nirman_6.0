import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../context/LanguageContext';
import { EmergencyAlert } from '../../types';
import { getAlertDelayInfo } from '../../components/emergency/alertConstants';
import { EmergencyAlertsHospitalPanel } from '../../components/emergency/EmergencyAlertsHospitalPanel';
import { MotherEmergencyAlertModal } from '../../components/emergency/MotherEmergencyAlertModal';
import { RaiseEmergencyAlertModal } from '../../components/emergency/RaiseEmergencyAlertModal';

export const EmergencyAlertsScreen: React.FC = () => {
  const { user, role } = useAuth();
  const {
    mothers,
    workers,
    supervisor,
    emergencyAlerts,
    hospitals,
    updateEmergencyAlertStatus,
    escalateEmergencyAlert,
  } = useData();
  const { t, formatName, formatNumber, localize } = useLanguage();

  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);

  // Protocol Escalation Modal state (Supervisor)
  const [escalatingAlert, setEscalatingAlert] = useState<EmergencyAlert | null>(null);
  const [escalationTargetHospitalId, setEscalationTargetHospitalId] = useState('HOSP-KHORDHA-DH');
  const [escalationReason, setEscalationReason] = useState('');
  const [isEscalating, setIsEscalating] = useState(false);

  const roleView: 'mother' | 'worker' | 'supervisor' =
    role === 'worker' ? 'worker' : role === 'supervisor' ? 'supervisor' : 'mother';

  const activeMotherId =
    role === 'mother' ? user?.mcpId || user?.id || 'MCP-2026-0894' : 'MCP-2026-0894';
  const mother = useMemo(
    () => mothers.find((m) => m.id === activeMotherId) || null,
    [mothers, activeMotherId]
  );

  const activeWorkerId =
    role === 'worker' ? user?.staffId || user?.id || 'HW-44120' : 'HW-44120';
  const worker = useMemo(
    () =>
      workers.find((w) => w.id === activeWorkerId) || {
        id: activeWorkerId,
        name: user?.name || 'Health Worker',
      },
    [workers, activeWorkerId, user?.name]
  );

  const scopedAlerts = useMemo(() => {
    if (roleView === 'mother') {
      return emergencyAlerts.filter((a) => a.motherId === activeMotherId);
    }
    if (roleView === 'worker') {
      return emergencyAlerts.filter(
        (a) => a.assignedWorkerId === worker.id || a.raisedById === worker.id
      );
    }
    const supervisorWorkerIds = new Set(workers.map((w) => w.id));
    return emergencyAlerts.filter(
      (a) =>
        !a.supervisorId ||
        a.supervisorId === supervisor.id ||
        supervisorWorkerIds.has(a.assignedWorkerId)
    );
  }, [roleView, emergencyAlerts, activeMotherId, worker.id, workers, supervisor.id]);

  const openEscalateModal = (alert: EmergencyAlert) => {
    setEscalatingAlert(alert);
    const higherFacility =
      hospitals.find((h) => h.id === 'HOSP-KHORDHA-DH' && h.id !== alert.targetHospitalId) ||
      hospitals.find((h) => h.id !== alert.targetHospitalId) ||
      hospitals[0];
    setEscalationTargetHospitalId(higherFacility?.id || 'HOSP-KHORDHA-DH');
    const delayInfo = getAlertDelayInfo(alert);
    setEscalationReason(
      delayInfo.isDelayed
        ? `Delayed acknowledgement (+${delayInfo.elapsedMinutes} mins beyond SLA threshold) — escalating per block emergency protocol.`
        : ''
    );
  };

  const handleConfirmEscalation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalatingAlert || !escalationReason.trim()) return;
    setIsEscalating(true);
    try {
      await escalateEmergencyAlert({
        alertId: escalatingAlert.id,
        escalatedBy: user?.name || supervisor.name || 'Dr. Rajesh Kumar',
        escalationReason: escalationReason.trim(),
        escalationTargetHospitalId,
      });
      setEscalatingAlert(null);
      setEscalationReason('');
    } finally {
      setIsEscalating(false);
    }
  };

  return (
    <div
      data-testid="dedicated-emergency-alerts-page"
      className="flex flex-col w-full space-y-space-xl pb-6"
    >
      {/* Dedicated Page Header */}
      <section className="flex flex-col pt-space-xs">
        <h1 className="font-serif text-2xl text-primary font-normal tracking-tight">
          {t('emergencyAlertsTrackerTitle')}
        </h1>
        <p className="font-sans text-xs text-secondary mt-1">
          {t('emergencyAlertsPageSubtitle')}
        </p>
      </section>

      {/* Consolidated Emergency Alerts, Helpline & Hospital Status */}
      <EmergencyAlertsHospitalPanel
        roleView={roleView}
        alerts={scopedAlerts}
        hospitals={hospitals}
        onRaiseAlert={() => setIsRaiseModalOpen(true)}
        onAddFieldUpdate={
          roleView === 'worker'
            ? async (alertId, note) => {
                const target = scopedAlerts.find((a) => a.id === alertId);
                await updateEmergencyAlertStatus({
                  alertId,
                  status: target?.status || 'new',
                  actorName: worker.name,
                  actorRole: 'worker',
                  note,
                });
              }
            : undefined
        }
        onEscalate={roleView === 'supervisor' ? openEscalateModal : undefined}
      />

      {/* Role-Specific Alert Creation Modal */}
      {roleView === 'mother' && mother && (
        <MotherEmergencyAlertModal
          isOpen={isRaiseModalOpen}
          mother={mother}
          onClose={() => setIsRaiseModalOpen(false)}
        />
      )}

      {roleView === 'worker' && (
        <RaiseEmergencyAlertModal
          isOpen={isRaiseModalOpen}
          mode="worker"
          actorId={worker.id}
          actorName={worker.name}
          onClose={() => setIsRaiseModalOpen(false)}
        />
      )}

      {roleView === 'supervisor' && (
        <RaiseEmergencyAlertModal
          isOpen={isRaiseModalOpen}
          mode="supervisor"
          actorId={user?.staffId || supervisor.id || 'SUP-2025-012'}
          actorName={user?.name || supervisor.name || 'Dr. Rajesh Kumar'}
          onClose={() => setIsRaiseModalOpen(false)}
        />
      )}

      {/* Supervisor Protocol Escalation Modal */}
      {roleView === 'supervisor' && escalatingAlert && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('escalateModalTitle')}
        >
          <div className="w-full max-w-md bg-surface rounded-2xl p-space-lg border border-outline-variant shadow-2xl space-y-space-md">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-[22px]">trending_up</span>
                <h3 className="font-serif text-lg font-bold text-on-surface">
                  {t('escalateModalTitle')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEscalatingAlert(null)}
                className="text-secondary hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-2.5 rounded-lg bg-surface-container border border-outline-variant/40 text-xs">
              <div className="font-bold text-on-surface">
                {formatName(escalatingAlert.motherName)} ({formatNumber(escalatingAlert.motherId)})
              </div>
              <div className="text-secondary mt-0.5">{escalatingAlert.concernLabel}</div>
            </div>

            <form onSubmit={handleConfirmEscalation} className="space-y-3">
              <div>
                <label className="font-sans text-xs font-semibold text-on-surface block mb-1">
                  {t('escalationTargetLabel')} *
                </label>
                <select
                  value={escalationTargetHospitalId}
                  onChange={(e) => setEscalationTargetHospitalId(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant font-sans text-xs text-on-surface"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {localize(h.name, h.translations?.name)} ({h.facilityType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-sans text-xs font-semibold text-on-surface block mb-1">
                  {t('escalationReasonLabel')} *
                </label>
                <textarea
                  rows={3}
                  required
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  placeholder={t('escalationReasonPlaceholder')}
                  className="w-full p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant font-sans text-xs text-on-surface"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEscalatingAlert(null)}
                  className="flex-1 h-11 rounded-lg border border-outline-variant text-xs font-semibold cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isEscalating || !escalationReason.trim()}
                  className="flex-1 h-11 rounded-lg bg-error text-on-error text-xs font-bold shadow-sm hover:opacity-95 disabled:opacity-60 cursor-pointer"
                >
                  {t('confirmEscalationBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
