import React, { useMemo, useState } from 'react';
import { EmergencyAlert, HospitalFacility } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useAlertNotifications } from '../../context/AlertNotificationContext';
import {
  getAlertDelayInfo,
  isAlertTerminalStatus,
  isAlertWaitingAcknowledgement,
} from './alertConstants';
import { EmergencyAlertStatusCard } from './EmergencyAlertStatusCard';

interface EmergencyAlertsHospitalPanelProps {
  roleView: 'mother' | 'worker' | 'supervisor';
  alerts: EmergencyAlert[];
  hospitals: HospitalFacility[];
  onRaiseAlert: () => void;
  onAddFieldUpdate?: (alertId: string, note: string) => Promise<void>;
  onEscalate?: (alert: EmergencyAlert) => void;
}

type FilterOption = 'all' | 'delayed' | 'pending' | 'active' | 'escalated' | 'resolved';

export const EmergencyAlertsHospitalPanel: React.FC<EmergencyAlertsHospitalPanelProps> = ({
  roleView,
  alerts,
  hospitals,
  onRaiseAlert,
  onAddFieldUpdate,
  onEscalate,
}) => {
  const { t, formatNumber, localize } = useLanguage();
  const { unreadCount, isChimeRepeating, silenceActiveChime } = useAlertNotifications();

  const [alertFilter, setAlertFilter] = useState<FilterOption>('all');

  const activeAlerts = useMemo(
    () => alerts.filter((a) => !isAlertTerminalStatus(a.status)),
    [alerts]
  );
  const resolvedAlerts = useMemo(
    () => alerts.filter((a) => isAlertTerminalStatus(a.status)),
    [alerts]
  );
  const delayedCount = useMemo(
    () => alerts.filter((a) => getAlertDelayInfo(a).isDelayed).length,
    [alerts]
  );

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (alertFilter === 'delayed') return getAlertDelayInfo(a).isDelayed;
      if (alertFilter === 'pending') return isAlertWaitingAcknowledgement(a.status);
      if (alertFilter === 'active') {
        return roleView === 'supervisor'
          ? a.status === 'acknowledged' ||
              a.status === 'in_progress' ||
              a.status === 'action_taken' ||
              a.status === 'referred'
          : !isAlertTerminalStatus(a.status);
      }
      if (alertFilter === 'escalated') return a.status === 'escalated' || a.escalated;
      if (alertFilter === 'resolved') return isAlertTerminalStatus(a.status);
      return true;
    });
  }, [alerts, alertFilter, roleView]);

  const filterPills: Array<{ id: FilterOption; label: string }> =
    roleView === 'supervisor'
      ? [
          { id: 'all', label: `${t('filterAll')} (${formatNumber(alerts.length)})` },
          { id: 'delayed', label: `${t('delayedAckSummaryLabel')} (${formatNumber(delayedCount)})` },
          { id: 'pending', label: t('alertStatusPendingAck') },
          { id: 'active', label: t('alertFilterActive') },
          { id: 'escalated', label: t('alertStatusEscalated') },
          { id: 'resolved', label: `${t('alertStatusResolved')} (${formatNumber(resolvedAlerts.length)})` },
        ]
      : [
          { id: 'all', label: `${t('filterAll')} (${formatNumber(alerts.length)})` },
          { id: 'active', label: `${t('alertFilterActive')} (${formatNumber(activeAlerts.length)})` },
          { id: 'resolved', label: `${t('alertStatusResolved')} (${formatNumber(resolvedAlerts.length)})` },
        ];

  return (
    <section
      id="emergency-alerts-section"
      data-testid="consolidated-emergency-alerts-hospital-panel"
      className="flex flex-col space-y-space-md"
    >
      {/* 1. Section Header, Notification Indicators & Primary Action */}
      <div className="bg-surface-container rounded-xl p-space-md border border-outline-variant/50 shadow-sm flex flex-col space-y-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="material-symbols-outlined text-error text-[20px] shrink-0">
                emergency_share
              </span>
              <h2 className="font-serif text-lg font-bold text-primary leading-snug">
                {t('activeResolvedTrackerTitle')}
              </h2>
              {unreadCount > 0 && (
                <span
                  data-testid="section-unread-notifications-badge"
                  className="px-2 py-0.5 rounded-full bg-error text-on-error text-[10px] font-bold inline-flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[12px]">notifications_active</span>
                  {t('unreadNotificationsBadge', { count: formatNumber(unreadCount) })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-secondary font-medium flex-wrap">
              <span>
                {t('activeAlertsCountLabel', { count: formatNumber(activeAlerts.length) })}
              </span>
              <span>•</span>
              <span>
                {t('resolvedAlertsCountLabel', { count: formatNumber(resolvedAlerts.length) })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {isChimeRepeating && (
              <button
                type="button"
                onClick={silenceActiveChime}
                className="px-2.5 py-1.5 rounded-lg bg-surface-container-highest border border-outline-variant text-on-surface text-xs font-semibold cursor-pointer"
              >
                {t('silenceChimeBtn')}
              </button>
            )}
            <button
              type="button"
              onClick={onRaiseAlert}
              data-testid={`${roleView}-raise-emergency-alert-btn`}
              className="px-3 py-2 rounded-lg bg-error text-on-error font-sans text-xs font-bold flex items-center gap-1.5 shadow-sm hover:opacity-95 cursor-pointer min-h-[40px]"
            >
              <span className="material-symbols-outlined text-[16px]">notification_important</span>
              <span>
                {roleView === 'mother'
                  ? t('raiseHealthAlertMotherBtn')
                  : t('raiseEmergencyAlertAction')}
              </span>
            </button>
          </div>
        </div>

        {/* Emergency Maternal Helpline & 102 / 108 Direct Ambulance Calling */}
        <div
          data-testid="emergency-helpline-section"
          className="pt-2.5 border-t border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
        >
          <div className="min-w-0">
            <span className="font-sans text-xs font-bold text-on-surface block">
              {t('emergencyHelpline')}
            </span>
            <span className="font-sans text-[11px] text-secondary block">
              {t('emergencyTollFree')}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href="tel:102"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-error text-on-error text-xs font-bold shadow-xs hover:opacity-95 min-h-[40px]"
            >
              <span className="material-symbols-outlined text-[16px]">call</span>
              <span>{t('callAmbulance102')}</span>
            </a>
            <a
              href="tel:108"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-lowest text-error border border-error/40 text-xs font-bold hover:bg-surface-container-high min-h-[40px]"
            >
              <span className="material-symbols-outlined text-[16px]">local_shipping</span>
              <span>{t('call108Ambulance')}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Delayed Acknowledgement SLA Banner (Worker / Supervisor) */}
      {(roleView === 'supervisor' || roleView === 'worker') && delayedCount > 0 && (
        <div className="p-3 rounded-xl bg-error-container/80 border border-error/30 flex items-center justify-between gap-2 text-xs text-error">
          <div className="flex items-center gap-2 font-bold">
            <span className="material-symbols-outlined text-[18px]">timer_off</span>
            <span>
              {formatNumber(delayedCount)} {t('delayedAckSummaryLabel')}
            </span>
          </div>
          {roleView === 'supervisor' && (
            <button
              type="button"
              onClick={() => setAlertFilter('delayed')}
              className="px-2.5 py-1 rounded-lg bg-error text-on-error text-[11px] font-bold cursor-pointer"
            >
              {t('viewDetails')}
            </button>
          )}
        </div>
      )}

      {/* 2. Active & Resolved Alert Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {filterPills.map((pill) => (
          <button
            key={pill.id}
            type="button"
            onClick={() => setAlertFilter(pill.id)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              alertFilter === pill.id
                ? 'bg-primary-container text-on-primary'
                : 'bg-surface-container text-secondary border border-outline-variant hover:border-primary-container'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* 3. Role-Scoped Emergency Alerts List */}
      <div className="space-y-space-sm">
        {filteredAlerts.length === 0 ? (
          <div className="bg-surface-container rounded-xl p-5 text-center text-xs text-secondary border border-outline-variant/40">
            {t('noEmergencyAlertsYet')}
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <EmergencyAlertStatusCard
              key={alert.id}
              alert={alert}
              roleView={roleView}
              onAddFieldUpdate={onAddFieldUpdate}
              onEscalate={onEscalate}
            />
          ))
        )}
      </div>

      {/* 4. Hospital Availability, Status & Emergency Contacts */}
      <div
        data-testid="hospital-availability-status-section"
        className="bg-surface-container rounded-xl p-space-md border border-outline-variant/40 shadow-sm space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container text-[20px]">
              local_hospital
            </span>
            <h3 className="font-serif text-base font-bold text-primary">
              {t('hospitalAvailabilityTitle')}
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-secondary">
            {formatNumber(hospitals.length)} {t('facilityLabel')}
          </span>
        </div>

        <div className="space-y-2">
          {hospitals.map((hospital) => {
            const hospitalActiveAlerts = activeAlerts.filter(
              (a) => a.targetHospitalId === hospital.id
            );
            return (
              <div
                key={hospital.id}
                data-testid={`hospital-status-card-${hospital.id}`}
                className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/40 flex flex-col space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-sans text-xs font-bold text-on-surface">
                        {localize(hospital.name, hospital.translations?.name)}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary-container text-on-secondary-container">
                        {hospital.facilityType}
                      </span>
                    </div>
                    <span className="font-sans text-[11px] text-secondary block mt-0.5">
                      {localize(hospital.block)} • {localize(hospital.district)}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      hospital.acceptsEmergency
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-surface-container-high text-secondary'
                    }`}
                  >
                    {hospital.acceptsEmergency
                      ? t('hospitalEmergencyReadyBadge')
                      : t('hospitalRoutineHoursBadge')}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-outline-variant/20 text-[11px]">
                  <span className="text-secondary font-medium">
                    {hospitalActiveAlerts.length > 0
                      ? t('hospitalActiveAlertsCount', {
                          count: formatNumber(hospitalActiveAlerts.length),
                        })
                      : t('hospitalNoActiveAlerts')}
                  </span>

                  <a
                    href={`tel:${hospital.contactPhone.replace(/\s+/g, '')}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-container/10 text-primary-container font-bold hover:bg-primary-container/15 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[14px]">call</span>
                    <span>{formatNumber(hospital.contactPhone)}</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
