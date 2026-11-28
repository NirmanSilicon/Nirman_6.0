import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCode2,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  UserCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { HOSPITAL_FACILITIES } from '../../data/facilities';
import {
  ALERT_CATEGORIES,
  ALERT_PRIORITIES,
  ALERT_WORKFLOW_STATUSES,
  HOSPITAL_STAFF_ROSTER,
  SOURCE_ROLE_LABELS,
  isActiveAlertStatus,
  validateAlertTransition,
} from '../../services/alertProtocol';
import {
  AlertCategory,
  AlertPriority,
  AlertReferralCoordination,
  AlertSourceRole,
  AlertStatus,
} from '../../types/hospital';
import {
  EmptyState,
  ModalDialog,
  SectionHeader,
  SlideOverDrawer,
  StatusText,
  toneForAlertStatus,
} from '../ui/ClinicalPrimitives';
import { CollectionStateGate } from '../ui/FirestoreStatePanels';

type StatusFilterKey = 'All' | AlertStatus;

const WORKFLOW_FILTER_TABS: StatusFilterKey[] = ['All', ...ALERT_WORKFLOW_STATUSES];

function formatSyncTimestamp(iso: string | null): string {
  if (!iso) return 'Awaiting sync';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function channelLabel(channel: string): string {
  switch (channel) {
    case 'sse':
      return 'Real-Time SSE Connected';
    case 'firestore-realtime':
      return 'Firestore Real-Time Connected';
    case 'polling-fallback':
      return 'Polling Fallback Active (5s)';
    case 'reconnecting':
      return 'Reconnecting Real-Time Stream';
    default:
      return 'Offline';
  }
}

export const EmergencyAlertsView: React.FC = () => {
  const {
    appMode,
    alerts,
    mothers,
    selectedAlertId,
    setSelectedAlertId,
    openMotherProfile,
    collectionStatuses,
    currentUser,
    currentFacility,
    canManageAlerts,
    alertSyncState,
    manualSyncAlerts,
    alertSoundEnabled,
    enableAlertSound,
    disableAlertSound,
    activeReminderAlertIds,
    silenceAlertReminder,
    submitEmergencyAlert,
    updateAlertTriage,
    markNotificationRead,
    refreshAllSubscriptions,
  } = useDashboard();

  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>('All');
  const [priorityFilter, setPriorityFilter] = useState<'All' | AlertPriority>('All');
  const [sourceFilter, setSourceFilter] = useState<'All' | AlertSourceRole>('All');
  const [query, setQuery] = useState('');

  // Triage workspace form states
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [responseNote, setResponseNote] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [notifyMother, setNotifyMother] = useState(true);
  const [notifyHw, setNotifyHw] = useState(true);
  const [notifySupervisor, setNotifySupervisor] = useState(true);
  const [triageError, setTriageError] = useState<string | null>(null);
  const [triageSuccess, setTriageSuccess] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // Referral & treatment coordination state
  const [coordFacility, setCoordFacility] = useState('');
  const [coordWard, setCoordWard] = useState('');
  const [coordTransport, setCoordTransport] = useState<
    NonNullable<AlertReferralCoordination['transportStatus']>
  >('Not Required');
  const [coordAmbulanceRef, setCoordAmbulanceRef] = useState('');
  const [coordReferralId, setCoordReferralId] = useState('');
  const [coordTreatment, setCoordTreatment] = useState('');
  const [showCoordForm, setShowCoordForm] = useState(false);

  // Modals / Drawers
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [contractDrawerOpen, setContractDrawerOpen] = useState(false);
  const [syncingManual, setSyncingManual] = useState(false);

  // New Alert submission form state
  const [subMotherId, setSubMotherId] = useState<string>(mothers[0]?.id ?? 'MCP-2026-0894');
  const [subSourceRole, setSubSourceRole] = useState<AlertSourceRole>('mother');
  const [subCategory, setSubCategory] = useState<AlertCategory>('Hypertensive / Pre-Eclampsia');
  const [subPriority, setSubPriority] = useState<AlertPriority>('Critical');
  const [subTitle, setSubTitle] = useState('');
  const [subDescription, setSubDescription] = useState('');
  const [subSymptoms, setSubSymptoms] = useState('');
  const [subBp, setSubBp] = useState('');
  const [subPulse, setSubPulse] = useState('');
  const [subTemp, setSubTemp] = useState('');
  const [subProtocol, setSubProtocol] = useState('NHM Obstetric Danger Sign Triage Protocol');
  const [submittingAlert, setSubmittingAlert] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<string | null>(null);

  const filteredAlerts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return alerts.filter((a) => {
      if (statusFilter !== 'All' && a.status !== statusFilter) return false;
      if (priorityFilter !== 'All' && a.severity !== priorityFilter) return false;
      if (sourceFilter !== 'All' && a.sourceRole !== sourceFilter) return false;
      if (q) {
        const hit =
          a.id.toLowerCase().includes(q) ||
          a.motherName.toLowerCase().includes(q) ||
          a.motherId.toLowerCase().includes(q) ||
          a.triggerTitle.toLowerCase().includes(q) ||
          a.alertCategory.toLowerCase().includes(q) ||
          a.symptomDescription.toLowerCase().includes(q) ||
          a.assignedHealthWorkerName.toLowerCase().includes(q) ||
          a.reportedByName.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [alerts, statusFilter, priorityFilter, sourceFilter, query]);

  useEffect(() => {
    if (!selectedAlertId && filteredAlerts.length > 0) {
      setSelectedAlertId(filteredAlerts[0].id);
    }
  }, [selectedAlertId, filteredAlerts, setSelectedAlertId]);

  const selectedAlert = useMemo(
    () => alerts.find((a) => a.id === selectedAlertId) ?? filteredAlerts[0] ?? null,
    [alerts, selectedAlertId, filteredAlerts]
  );

  // Sync detail form defaults when selected alert changes
  useEffect(() => {
    if (!selectedAlert) return;
    setTriageError(null);
    setTriageSuccess(null);
    setSelectedStaffId(selectedAlert.hospitalResponse.assignedStaffId || '');
    setResolutionSummary(selectedAlert.hospitalResponse.resolutionSummary || '');
    const rc = selectedAlert.hospitalResponse.referralCoordination;
    setCoordFacility(rc?.destinationFacility || currentFacility.name);
    setCoordWard(rc?.wardOrUnit || '');
    setCoordTransport(rc?.transportStatus || 'Not Required');
    setCoordAmbulanceRef(rc?.ambulanceRef || '');
    setCoordReferralId(rc?.referralId || '');
    setCoordTreatment(rc?.treatmentSummary || '');
  }, [selectedAlert?.id, currentFacility.name]);

  const statusCounts = useMemo(() => {
    const map: Record<StatusFilterKey, number> = {
      All: alerts.length,
      NEW: 0,
      ACKNOWLEDGED: 0,
      'IN PROGRESS': 0,
      'REFERRED / ACTION TAKEN': 0,
      RESOLVED: 0,
      CLOSED: 0,
    };
    alerts.forEach((a) => {
      map[a.status] = (map[a.status] || 0) + 1;
    });
    return map;
  }, [alerts]);

  const prioritySummary = useMemo(() => {
    return ALERT_PRIORITIES.map((priority) => {
      const matching = alerts.filter((a) => a.severity === priority);
      const activeCount = matching.filter((a) => isActiveAlertStatus(a.status)).length;
      const newCount = matching.filter((a) => a.status === 'NEW').length;
      return { priority, total: matching.length, activeCount, newCount };
    });
  }, [alerts]);

  // Reflect canonical `emergencyAlerts` listener state strictly (never masked by healthUpdates or legacy alerts)
  const alertsSyncState =
    appMode === 'demo'
      ? { status: 'ready' as const, count: alerts.length, path: 'emergencyAlerts' }
      : collectionStatuses.emergencyAlerts;

  const selectedNotifyRecipients = (): AlertSourceRole[] => {
    const out: AlertSourceRole[] = [];
    if (notifyMother) out.push('mother');
    if (notifyHw) out.push('health_worker');
    if (notifySupervisor) out.push('supervisor');
    return out;
  };

  const handleManualSync = async () => {
    setSyncingManual(true);
    try {
      await manualSyncAlerts();
    } finally {
      setSyncingManual(false);
    }
  };

  const handleStatusTransition = async (nextStatus: AlertStatus) => {
    if (!selectedAlert) return;
    setTriageError(null);
    setTriageSuccess(null);

    const validation = validateAlertTransition({
      currentStatus: selectedAlert.status,
      nextStatus,
      priority: selectedAlert.severity,
      actorRole: currentUser.role,
      resolutionSummary: resolutionSummary.trim() || selectedAlert.hospitalResponse.resolutionSummary,
    });
    if (!validation.allowed) {
      setTriageError(validation.reason || 'Transition blocked by clinical safety policy.');
      return;
    }

    setUpdating(true);
    try {
      const result = await updateAlertTriage(selectedAlert.id, {
        status: nextStatus,
        note: responseNote.trim() || undefined,
        resolutionSummary:
          nextStatus === 'RESOLVED' || nextStatus === 'CLOSED'
            ? resolutionSummary.trim() || selectedAlert.hospitalResponse.resolutionSummary
            : undefined,
        notifyRecipients: selectedNotifyRecipients(),
        actionLabel:
          nextStatus === 'ACKNOWLEDGED'
            ? 'Alert Acknowledged'
            : `Status Updated to ${nextStatus}`,
      });
      if (!result.ok) {
        setTriageError(result.error || 'Unable to update alert status.');
      } else {
        setResponseNote('');
        setTriageSuccess(`Status updated to ${nextStatus} and return communication synced.`);
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignStaff = async () => {
    if (!selectedAlert || !selectedStaffId) return;
    const staff = HOSPITAL_STAFF_ROSTER.find((s) => s.id === selectedStaffId);
    if (!staff) return;
    setTriageError(null);
    setTriageSuccess(null);
    setUpdating(true);
    try {
      const result = await updateAlertTriage(selectedAlert.id, {
        assignedStaffId: staff.id,
        assignedStaffName: staff.name,
        assignedStaffRole: staff.role,
        note:
          responseNote.trim() ||
          `Assigned responsible hospital clinician: ${staff.name} (${staff.role}).`,
        notifyRecipients: selectedNotifyRecipients(),
        actionLabel: `Assigned Staff: ${staff.name}`,
      });
      if (!result.ok) {
        setTriageError(result.error || 'Unable to assign staff.');
      } else {
        setResponseNote('');
        setTriageSuccess(`Assigned ${staff.name} (${staff.role}) to alert ${selectedAlert.id}.`);
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveCoordination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;
    setTriageError(null);
    setTriageSuccess(null);
    setUpdating(true);
    try {
      const result = await updateAlertTriage(selectedAlert.id, {
        referralCoordination: {
          destinationFacility: coordFacility.trim() || currentFacility.name,
          wardOrUnit: coordWard.trim() || undefined,
          transportStatus: coordTransport,
          ambulanceRef: coordAmbulanceRef.trim() || undefined,
          referralId: coordReferralId.trim() || undefined,
          treatmentSummary: coordTreatment.trim() || undefined,
        },
        note:
          coordTreatment.trim() ||
          `Updated referral/treatment coordination (${coordFacility}, transport: ${coordTransport}).`,
        notifyRecipients: selectedNotifyRecipients(),
        actionLabel: 'Referral & Treatment Coordination Recorded',
      });
      if (!result.ok) {
        setTriageError(result.error || 'Unable to save coordination details.');
      } else {
        setShowCoordForm(false);
        setTriageSuccess('Referral and treatment coordination details saved and synced.');
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert || !responseNote.trim()) return;
    setTriageError(null);
    setTriageSuccess(null);
    setUpdating(true);
    try {
      const result = await updateAlertTriage(selectedAlert.id, {
        note: responseNote.trim(),
        notifyRecipients: selectedNotifyRecipients(),
        actionLabel: 'Hospital Response Note Added',
      });
      if (!result.ok) {
        setTriageError(result.error || 'Unable to add response note.');
      } else {
        setResponseNote('');
        setTriageSuccess('Response note logged and shared with selected JanmaSaathi recipients.');
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleSubmitNewAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subMotherId || !subDescription.trim()) return;
    setSubmittingAlert(true);
    setSubmitFeedback(null);
    try {
      const res = await submitEmergencyAlert({
        motherId: subMotherId,
        sourceRole: subSourceRole,
        alertCategory: subCategory,
        priority: subPriority,
        triggerTitle:
          subTitle.trim() || `${subCategory} — ${SOURCE_ROLE_LABELS[subSourceRole]} Alert`,
        symptomDescription: subDescription.trim(),
        symptoms: subSymptoms
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        protocolReference: subProtocol.trim() || undefined,
        vitalsSnapshot: {
          bp: subBp.trim() || undefined,
          pulse: subPulse ? Number(subPulse) : undefined,
          temperatureC: subTemp ? Number(subTemp) : undefined,
        },
      });
      if (!res.ok) {
        setSubmitFeedback(res.error || 'Failed to submit alert.');
      } else {
        if (res.alertId) {
          setSelectedAlertId(res.alertId);
        }
        setSubmitModalOpen(false);
        setSubTitle('');
        setSubDescription('');
        setSubSymptoms('');
        setSubBp('');
        setSubPulse('');
        setSubTemp('');
        if (res.duplicatePreserved) {
          setTriageSuccess(
            `Duplicate submission preserved and linked to active alert ${res.alertId} (not discarded).`
          );
        } else {
          setTriageSuccess(`New ${subPriority} alert ${res.alertId} received in real time.`);
        }
      }
    } finally {
      setSubmittingAlert(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Emergency Alert Management"
        subtitle={
          appMode === 'demo'
            ? 'Real-time maternal alert reception via authenticated SSE stream (Demo Mode — isolated from live Firestore).'
            : 'Live maternal emergency triage console connected to outr-janmasaathi Firestore emergencyAlerts.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (alertSoundEnabled) {
                  disableAlertSound();
                } else {
                  void enableAlertSound();
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                alertSoundEnabled
                  ? 'bg-[#F7EDF2] text-[#890149] border-[#D9A2B5]'
                  : 'bg-white text-[#665860] border-[#DDD8CB] hover:text-[#30232A]'
              }`}
              title="Optional notification chime played only when enabled by user"
            >
              {alertSoundEnabled ? (
                <Volume2 className="w-3.5 h-3.5" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
              <span>{alertSoundEnabled ? 'Sound On' : 'Sound Off'}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleManualSync()}
              disabled={syncingManual}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white hover:bg-[#F3F3E7] text-[#30232A] border border-[#DDD8CB] rounded-md transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingManual ? 'animate-spin' : ''}`} />
              <span>Sync Now</span>
            </button>

            <button
              type="button"
              onClick={() => setContractDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white hover:bg-[#F3F3E7] text-[#30232A] border border-[#DDD8CB] rounded-md transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Schema Contract</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSubmitFeedback(null);
                setSubmitModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] text-white rounded-md transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Submit Alert</span>
            </button>
          </div>
        }
      />

      {/* Visible Last Synchronization & Authorization Status Bar */}
      <div className="bg-white border border-[#DDD8CB] rounded-lg px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[#665860]">
          <span className="inline-flex items-center gap-2 font-medium text-[#30232A]">
            <span
              className={`w-2 h-2 rounded-full ${
                alertSyncState.channel === 'sse' || alertSyncState.channel === 'firestore-realtime'
                  ? 'bg-[#15803D]'
                  : alertSyncState.channel === 'polling-fallback' ||
                    alertSyncState.channel === 'reconnecting'
                  ? 'bg-[#B45309]'
                  : 'bg-[#B91C1C]'
              }`}
              aria-hidden="true"
            />
            {channelLabel(alertSyncState.channel)}
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Clock className="w-3.5 h-3.5 text-[#665860]" />
            Last Successful Sync:{' '}
            <strong className="text-[#30232A] font-medium">
              {formatSyncTimestamp(alertSyncState.lastSyncedAt)}
            </strong>
          </span>
          {alertSyncState.errorMessage && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#B45309]">{alertSyncState.errorMessage}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          {canManageAlerts ? (
            <span className="text-[#15803D] font-medium">
              Authorized Hospital Triage ({currentUser.role})
            </span>
          ) : (
            <span className="text-[#B91C1C] font-medium">
              Read-Only Access ({currentUser.role}) — Status Changes Blocked
            </span>
          )}
        </div>
      </div>

      <CollectionStateGate
        syncState={alertsSyncState}
        userEmail={currentUser.email}
        userId={currentUser.uid}
        userRole={currentUser.role}
        onRetry={refreshAllSubscriptions}
        loadingLabel="Loading emergency alerts from JanmaSaathi..."
      >
        {/* 4-Tier Protocol Priority Summary Band */}
        <section
          aria-label="Alert counts by priority"
          className="bg-white border border-[#DDD8CB] rounded-lg grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#EAE5D9]"
        >
          {prioritySummary.map((item) => {
            const selected = priorityFilter === item.priority;
            return (
              <button
                key={item.priority}
                type="button"
                onClick={() =>
                  setPriorityFilter(selected ? 'All' : item.priority)
                }
                className={`p-4 text-left transition-colors cursor-pointer ${
                  selected ? 'bg-[#F7EDF2]/65' : 'hover:bg-[#FBFBF7]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <StatusText label={item.priority} tone={toneForAlertStatus(item.priority)} />
                  <span className="text-[11px] text-[#665860] tabular-nums">
                    {item.total} total
                  </span>
                </div>
                <p className="mt-2 font-serif text-2xl leading-none text-[#30232A] tabular-nums">
                  {item.activeCount}
                  <span className="ml-1.5 font-sans text-xs font-normal text-[#665860]">
                    active
                  </span>
                </p>
                <p className="mt-1.5 text-[11px] text-[#665860] tabular-nums">
                  {item.newCount > 0 ? `${item.newCount} awaiting acknowledgement` : 'All acknowledged'}
                </p>
              </button>
            );
          })}
        </section>

        {/* Workflow Status Tabs + Source & Search Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#EAE9DC] rounded-md overflow-x-auto">
            {WORKFLOW_FILTER_TABS.map((tab) => {
              const active = statusFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-white text-[#890149] shadow-xs'
                      : 'text-[#665860] hover:text-[#30232A]'
                  }`}
                >
                  {tab}{' '}
                  <span className="ml-1 tabular-nums text-[11px] opacity-80">
                    ({statusCounts[tab]})
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#665860] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Alert ID, Mother ID/name, category, symptom, or reporter..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
              />
            </div>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as 'All' | AlertSourceRole)}
              aria-label="Filter by alert source role"
              className="px-3 py-2 text-xs font-medium bg-white border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
            >
              <option value="All">All Alert Sources</option>
              <option value="mother">Source: Mother</option>
              <option value="health_worker">Source: Health Worker</option>
              <option value="supervisor">Source: Supervisor</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as 'All' | AlertPriority)}
              aria-label="Filter by alert priority"
              className="px-3 py-2 text-xs font-medium bg-white border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
            >
              <option value="All">All Priorities</option>
              {ALERT_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  Priority: {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Master-Detail Alert Queue & Triage Workspace */}
        {alerts.length === 0 ? (
          <EmptyState
            title={
              appMode === 'demo'
                ? 'No emergency alerts in demo session'
                : 'No emergency alerts in Firestore'
            }
            description={
              appMode === 'demo'
                ? 'Submit a new emergency alert from Mother, Health Worker, or Supervisor to test live SSE reception.'
                : 'No emergency alert documents currently exist for your authorized hospital in "emergencyAlerts". Incoming PWA alerts will appear here in real time.'
            }
          />
        ) : filteredAlerts.length === 0 ? (
          <EmptyState
            title="No alerts match the current filters"
            description="Clear one of the workflow, source, priority, or search filters to view active escalations."
            action={
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('All');
                  setPriorityFilter('All');
                  setSourceFilter('All');
                  setQuery('');
                }}
                className="px-4 py-2 text-xs font-medium bg-[#890149] text-white rounded-md cursor-pointer"
              >
                Reset All Filters
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left Alert Queue */}
            <div className="xl:col-span-5 bg-white border border-[#DDD8CB] rounded-lg overflow-hidden divide-y divide-[#EAE5D9]">
              {filteredAlerts.map((alert) => {
                const isSelected = selectedAlert?.id === alert.id;
                return (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => {
                      setSelectedAlertId(alert.id);
                      markNotificationRead(`notif-alert-${alert.id}`);
                    }}
                    className={`w-full text-left p-4 transition-colors cursor-pointer ${
                      isSelected ? 'bg-[#F7EDF2]/65' : 'hover:bg-[#FBFBF7]'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold text-[#30232A] tabular-nums">
                        {alert.id}
                      </span>
                      <span className="text-[11px] text-[#665860] tabular-nums">
                        {alert.timestamp}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                      <StatusText
                        label={alert.severity}
                        tone={toneForAlertStatus(alert.severity)}
                        className="text-xs"
                      />
                      <span className="text-[#D9A2B5]" aria-hidden="true">
                        ·
                      </span>
                      <StatusText
                        label={alert.status}
                        tone={toneForAlertStatus(alert.status)}
                        className="text-xs"
                      />
                      <span className="text-[#D9A2B5]" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-[#665860]">
                        {SOURCE_ROLE_LABELS[alert.sourceRole]}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-semibold text-[#30232A] leading-snug">
                      {alert.motherName}{' '}
                      <span className="font-normal text-xs text-[#665860] tabular-nums">
                        ({alert.motherId})
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-[#30232A] line-clamp-2 leading-relaxed">
                      {alert.triggerTitle}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#665860]">
                      <span>{alert.alertCategory}</span>
                      <span className="tabular-nums">
                        {alert.hospitalResponse.assignedStaffName
                          ? `Assigned: ${alert.hospitalResponse.assignedStaffName}`
                          : 'Unassigned'}
                      </span>
                    </div>

                    {alert.duplicateSubmissionCount > 0 && (
                      <p className="mt-2 text-[11px] font-medium text-[#B45309] tabular-nums">
                        +{alert.duplicateSubmissionCount} duplicate submission
                        {alert.duplicateSubmissionCount > 1 ? 's' : ''} preserved
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Comprehensive Alert Detail & Triage Workspace */}
            {selectedAlert && (
              <div className="xl:col-span-7 space-y-5">
                <section className="bg-white border border-[#DDD8CB] rounded-lg p-6 space-y-6">
                  {/* Alert Header */}
                  <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-[#EAE5D9]">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-[#30232A] tabular-nums">
                          {selectedAlert.id}
                        </span>
                        <span className="text-[#D9A2B5]" aria-hidden="true">
                          ·
                        </span>
                        <StatusText
                          label={selectedAlert.severity}
                          tone={toneForAlertStatus(selectedAlert.severity)}
                        />
                        <span className="text-[#D9A2B5]" aria-hidden="true">
                          ·
                        </span>
                        <StatusText
                          label={selectedAlert.status}
                          tone={toneForAlertStatus(selectedAlert.status)}
                        />
                      </div>
                      <h2 className="font-serif text-2xl text-[#30232A] leading-snug">
                        {selectedAlert.triggerTitle}
                      </h2>
                      <p className="text-xs text-[#665860]">
                        {selectedAlert.alertCategory} · Submitted {selectedAlert.timestamp} via{' '}
                        <strong className="font-medium text-[#30232A]">
                          {SOURCE_ROLE_LABELS[selectedAlert.sourceRole]}
                        </strong>{' '}
                        interface
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {activeReminderAlertIds.includes(selectedAlert.id) && (
                        <button
                          type="button"
                          onClick={() => silenceAlertReminder(selectedAlert.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] rounded-md transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <VolumeX className="w-3.5 h-3.5" />
                          <span>Silence Reminder</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openMotherProfile(selectedAlert.motherId)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#FBFBF7] hover:bg-[#F3F3E7] text-[#890149] border border-[#D9A2B5] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>Open Mother Profile ({selectedAlert.motherId})</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 6-Stage Clinical Workflow Stepper */}
                  <div>
                    <p className="text-xs font-semibold text-[#30232A] mb-2.5">
                      Alert Workflow Progression
                    </p>
                    <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                      {ALERT_WORKFLOW_STATUSES.map((step, idx) => {
                        const currentIdx = ALERT_WORKFLOW_STATUSES.indexOf(selectedAlert.status);
                        const isDone = idx < currentIdx;
                        const isCurrent = idx === currentIdx;
                        return (
                          <li
                            key={step}
                            className={`px-2.5 py-2 rounded border text-[11px] leading-tight ${
                              isCurrent
                                ? 'bg-[#F7EDF2] border-[#890149] text-[#890149] font-semibold'
                                : isDone
                                ? 'bg-[#F0FDF4]/60 border-[#BBF7D0] text-[#15803D] font-medium'
                                : 'bg-[#FBFBF7] border-[#EAE5D9] text-[#665860]'
                            }`}
                          >
                            <span className="block tabular-nums text-[10px] opacity-75">
                              0{idx + 1}
                            </span>
                            <span className="block mt-0.5">{step}</span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>

                  {/* Duplicate Submissions Preservation Notice (Never silently discarded) */}
                  {selectedAlert.duplicateSubmissionCount > 0 && (
                    <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-md space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#92400E]">
                            {selectedAlert.duplicateSubmissionCount} Duplicate Submission
                            {selectedAlert.duplicateSubmissionCount > 1 ? 's' : ''} Preserved (Not
                            Discarded)
                          </p>
                          <p className="text-xs text-[#92400E]/90 mt-0.5">
                            Repeated submissions for this active maternal alert are linked and
                            audited rather than dropped silently.
                          </p>
                        </div>
                      </div>
                      <ul className="space-y-1.5 pl-6 text-xs text-[#30232A] list-disc">
                        {selectedAlert.duplicateSubmissions.map((dup) => (
                          <li key={dup.submissionId} className="leading-relaxed">
                            <span className="font-medium tabular-nums">{dup.submittedAt}</span> —{' '}
                            {SOURCE_ROLE_LABELS[dup.sourceRole]} ({dup.reportedByName},{' '}
                            <span className="tabular-nums">{dup.reportedByUserId}</span>):{' '}
                            {dup.symptomDescription}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Reference Metadata Grid (References motherId without duplicating profile) */}
                  <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t border-[#EAE5D9] text-xs">
                    <div>
                      <dt className="text-[#665860]">Referenced Mother</dt>
                      <dd className="mt-0.5 font-semibold text-[#30232A]">
                        {selectedAlert.motherName} ·{' '}
                        <span className="tabular-nums font-normal text-[#665860]">
                          {selectedAlert.motherId}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#665860]">Source Role &amp; Reporter ID</dt>
                      <dd className="mt-0.5 font-medium text-[#30232A]">
                        {SOURCE_ROLE_LABELS[selectedAlert.sourceRole]} ·{' '}
                        {selectedAlert.reportedByName}{' '}
                        <span className="text-[#665860] tabular-nums">
                          ({selectedAlert.reportedByUserId})
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#665860]">Assigned Health Worker</dt>
                      <dd className="mt-0.5 font-medium text-[#30232A]">
                        {selectedAlert.assignedHealthWorkerName}{' '}
                        <span className="text-[#665860] tabular-nums">
                          ({selectedAlert.assignedHealthWorkerId || '—'})
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#665860]">Hospital / Facility ID</dt>
                      <dd className="mt-0.5 font-medium text-[#30232A]">
                        {selectedAlert.facilityName}{' '}
                        <span className="text-[#665860] tabular-nums">
                          ({selectedAlert.facilityId})
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#665860]">Assigned Hospital Staff</dt>
                      <dd className="mt-0.5 font-medium text-[#30232A]">
                        {selectedAlert.hospitalResponse.assignedStaffName ? (
                          <>
                            {selectedAlert.hospitalResponse.assignedStaffName}
                            <span className="block text-[11px] text-[#665860] font-normal">
                              {selectedAlert.hospitalResponse.assignedStaffRole}
                            </span>
                          </>
                        ) : (
                          <span className="text-[#B45309]">Unassigned</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#665860]">Priority Basis &amp; Protocol</dt>
                      <dd className="mt-0.5 font-medium text-[#30232A]">
                        {selectedAlert.priorityBasis}
                        {selectedAlert.protocolReference && (
                          <span className="block text-[11px] text-[#665860] font-normal">
                            {selectedAlert.protocolReference}
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  {/* Symptoms & Available Vitals */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4 border-t border-[#EAE5D9]">
                    <div className="lg:col-span-7 space-y-2">
                      <h3 className="text-xs font-semibold text-[#30232A]">
                        Description of Symptoms
                      </h3>
                      <p className="text-sm text-[#30232A] leading-relaxed">
                        {selectedAlert.symptomDescription}
                      </p>
                      {selectedAlert.symptoms.length > 0 && (
                        <p className="text-xs text-[#665860] pt-1">
                          <span className="font-medium text-[#30232A]">Reported Signs:</span>{' '}
                          {selectedAlert.symptoms.join(' · ')}
                        </p>
                      )}
                    </div>

                    <div className="lg:col-span-5">
                      <h3 className="text-xs font-semibold text-[#30232A] mb-2">
                        Available Vitals at Submission
                      </h3>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs tabular-nums bg-[#FBFBF7] border border-[#EAE5D9] rounded-md p-3">
                        <div>
                          <dt className="text-[#665860]">Blood Pressure</dt>
                          <dd className="font-semibold text-[#30232A]">
                            {selectedAlert.vitalsSnapshot.bp || '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[#665860]">Pulse</dt>
                          <dd className="font-semibold text-[#30232A]">
                            {selectedAlert.vitalsSnapshot.pulse
                              ? `${selectedAlert.vitalsSnapshot.pulse} bpm`
                              : '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[#665860]">Hemoglobin</dt>
                          <dd className="font-semibold text-[#30232A]">
                            {selectedAlert.vitalsSnapshot.hemoglobin
                              ? `${selectedAlert.vitalsSnapshot.hemoglobin} g/dL`
                              : '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[#665860]">Fetal Heart Rate</dt>
                          <dd className="font-semibold text-[#30232A]">
                            {selectedAlert.vitalsSnapshot.fetalHeartRate
                              ? `${selectedAlert.vitalsSnapshot.fetalHeartRate} bpm`
                              : '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[#665860]">Temperature</dt>
                          <dd className="font-semibold text-[#30232A]">
                            {selectedAlert.vitalsSnapshot.temperatureC
                              ? `${selectedAlert.vitalsSnapshot.temperatureC} °C`
                              : '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[#665860]">SpO2</dt>
                          <dd className="font-semibold text-[#30232A]">
                            {selectedAlert.vitalsSnapshot.spo2
                              ? `${selectedAlert.vitalsSnapshot.spo2}%`
                              : '—'}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {/* Hospital Response & Safety-Enforced Workflow Controls */}
                  <div className="pt-5 border-t border-[#EAE5D9] space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-serif text-lg text-[#30232A]">
                        Hospital Response &amp; Workflow Controls
                      </h3>
                      {selectedAlert.severity === 'Critical' && (
                        <span className="text-xs font-medium text-[#B91C1C]">
                          Critical Safety Guard: No auto-close · Explicit resolution required
                        </span>
                      )}
                    </div>

                    {!canManageAlerts ? (
                      <div
                        role="status"
                        className="p-4 bg-[#FBFBF7] border border-[#DDD8CB] rounded-md flex items-start gap-3 text-xs text-[#665860]"
                      >
                        <ShieldAlert className="w-4 h-4 text-[#B91C1C] shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-[#30232A]">
                            Unauthorized Status Changes Blocked
                          </p>
                          <p className="mt-1 leading-relaxed">
                            You are currently viewing this alert as{' '}
                            <strong className="text-[#30232A]">{currentUser.role}</strong>. Only
                            authorized hospital clinicians and supervisors may acknowledge, assign,
                            update, resolve, or close emergency alerts. Switch to Hospital Staff or
                            Supervisor access to perform triage actions.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {triageError && (
                          <div
                            role="alert"
                            className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-xs text-[#B91C1C]"
                          >
                            {triageError}
                          </div>
                        )}
                        {triageSuccess && (
                          <div
                            role="status"
                            className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-md text-xs text-[#15803D] flex items-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>{triageSuccess}</span>
                          </div>
                        )}

                        {/* Row 1: Assign Responsible Hospital Staff */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                          <div className="sm:col-span-8">
                            <label
                              htmlFor="assign-staff"
                              className="block text-xs font-medium text-[#30232A] mb-1.5"
                            >
                              Assign Responsible Hospital Staff Member
                            </label>
                            <select
                              id="assign-staff"
                              value={selectedStaffId}
                              onChange={(e) => setSelectedStaffId(e.target.value)}
                              className="w-full px-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
                            >
                              <option value="">Select hospital clinician / triage nurse...</option>
                              {HOSPITAL_STAFF_ROSTER.map((st) => (
                                <option key={st.id} value={st.id}>
                                  {st.name} — {st.role} ({st.department})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="sm:col-span-4">
                            <button
                              type="button"
                              disabled={updating || !selectedStaffId}
                              onClick={() => void handleAssignStaff()}
                              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium bg-white hover:bg-[#F3F3E7] text-[#30232A] border border-[#DDD8CB] rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Assign Staff</span>
                            </button>
                          </div>
                        </div>

                        {/* Row 2: Workflow Status Actions + Resolution Summary */}
                        <div className="space-y-3 pt-4 border-t border-[#EAE5D9]">
                          <p className="text-xs font-medium text-[#30232A]">
                            Update Alert Workflow Status
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            {selectedAlert.status === 'NEW' && (
                              <button
                                type="button"
                                disabled={updating}
                                onClick={() => void handleStatusTransition('ACKNOWLEDGED')}
                                className="px-3.5 py-2 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] text-white rounded-md cursor-pointer disabled:opacity-50"
                              >
                                Acknowledge Alert
                              </button>
                            )}
                            {selectedAlert.status !== 'IN PROGRESS' &&
                              selectedAlert.status !== 'CLOSED' && (
                                <button
                                  type="button"
                                  disabled={updating}
                                  onClick={() => void handleStatusTransition('IN PROGRESS')}
                                  className="px-3.5 py-2 text-xs font-medium bg-white hover:bg-[#F3F3E7] text-[#30232A] border border-[#DDD8CB] rounded-md cursor-pointer disabled:opacity-50"
                                >
                                  Mark IN PROGRESS
                                </button>
                              )}
                            {selectedAlert.status !== 'REFERRED / ACTION TAKEN' &&
                              selectedAlert.status !== 'CLOSED' && (
                                <button
                                  type="button"
                                  disabled={updating}
                                  onClick={() =>
                                    void handleStatusTransition('REFERRED / ACTION TAKEN')
                                  }
                                  className="px-3.5 py-2 text-xs font-medium bg-white hover:bg-[#F3F3E7] text-[#30232A] border border-[#DDD8CB] rounded-md cursor-pointer disabled:opacity-50"
                                >
                                  Mark REFERRED / ACTION TAKEN
                                </button>
                              )}
                            {selectedAlert.status !== 'RESOLVED' &&
                              selectedAlert.status !== 'CLOSED' && (
                                <button
                                  type="button"
                                  disabled={updating || selectedAlert.status === 'NEW'}
                                  onClick={() => void handleStatusTransition('RESOLVED')}
                                  title={
                                    selectedAlert.status === 'NEW'
                                      ? 'Acknowledge the alert before resolving'
                                      : 'Requires documented resolution summary below'
                                  }
                                  className="px-3.5 py-2 text-xs font-medium bg-[#15803D] hover:bg-[#166534] text-white rounded-md cursor-pointer disabled:opacity-45"
                                >
                                  Resolve Alert
                                </button>
                              )}
                            {selectedAlert.status !== 'CLOSED' && (
                              <button
                                type="button"
                                disabled={updating || selectedAlert.status !== 'RESOLVED'}
                                onClick={() => void handleStatusTransition('CLOSED')}
                                title={
                                  selectedAlert.status !== 'RESOLVED'
                                    ? 'Alert must be explicitly RESOLVED before closing'
                                    : 'Close resolved alert with resolution summary'
                                }
                                className="px-3.5 py-2 text-xs font-medium bg-[#30232A] hover:bg-[#1F161B] text-white rounded-md cursor-pointer disabled:opacity-40"
                              >
                                Close Resolved Alert
                              </button>
                            )}
                          </div>

                          {/* Resolution Summary Field (Required for RESOLVED / CLOSED) */}
                          <div>
                            <label
                              htmlFor="resolution-summary"
                              className="block text-xs font-medium text-[#30232A] mb-1"
                            >
                              Clinical Resolution Summary{' '}
                              <span className="font-normal text-[#665860]">
                                (required before marking RESOLVED or CLOSED)
                              </span>
                            </label>
                            <textarea
                              id="resolution-summary"
                              rows={2}
                              value={resolutionSummary}
                              onChange={(e) => setResolutionSummary(e.target.value)}
                              placeholder="Document clinical stabilization, admission/treatment outcome, and follow-up plan..."
                              className="w-full px-3 py-2 text-sm bg-[#FBFBF7] border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
                            />
                          </div>
                        </div>

                        {/* Row 3: Referral & Treatment Coordination */}
                        <div className="pt-4 border-t border-[#EAE5D9] space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold text-[#30232A]">
                                Referral &amp; Treatment Coordination Details
                              </p>
                              {selectedAlert.hospitalResponse.referralCoordination && (
                                <p className="text-xs text-[#665860] mt-0.5">
                                  {
                                    selectedAlert.hospitalResponse.referralCoordination
                                      .destinationFacility
                                  }
                                  {selectedAlert.hospitalResponse.referralCoordination.wardOrUnit
                                    ? ` · ${selectedAlert.hospitalResponse.referralCoordination.wardOrUnit}`
                                    : ''}
                                  {selectedAlert.hospitalResponse.referralCoordination
                                    .transportStatus
                                    ? ` · Transport: ${selectedAlert.hospitalResponse.referralCoordination.transportStatus}`
                                    : ''}
                                  {selectedAlert.hospitalResponse.referralCoordination.ambulanceRef
                                    ? ` (${selectedAlert.hospitalResponse.referralCoordination.ambulanceRef})`
                                    : ''}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowCoordForm((v) => !v)}
                              className="text-xs font-medium text-[#890149] hover:underline cursor-pointer whitespace-nowrap"
                            >
                              {showCoordForm ? 'Hide Form' : 'Edit Coordination'}
                            </button>
                          </div>

                          {selectedAlert.hospitalResponse.referralCoordination?.treatmentSummary &&
                            !showCoordForm && (
                              <p className="text-xs text-[#30232A] bg-[#FBFBF7] border border-[#EAE5D9] rounded-md px-3.5 py-2.5 leading-relaxed">
                                {
                                  selectedAlert.hospitalResponse.referralCoordination
                                    .treatmentSummary
                                }
                              </p>
                            )}

                          {showCoordForm && (
                            <form
                              onSubmit={(e) => void handleSaveCoordination(e)}
                              className="p-4 bg-[#FBFBF7] border border-[#DDD8CB] rounded-md space-y-3"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-[#30232A] mb-1">
                                    Receiving Facility
                                  </label>
                                  <select
                                    value={coordFacility}
                                    onChange={(e) => setCoordFacility(e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#DDD8CB] rounded-md"
                                  >
                                    {HOSPITAL_FACILITIES.map((f) => (
                                      <option key={f.id} value={f.name}>
                                        {f.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-[#30232A] mb-1">
                                    Ward / Clinical Unit
                                  </label>
                                  <input
                                    type="text"
                                    value={coordWard}
                                    onChange={(e) => setCoordWard(e.target.value)}
                                    placeholder="e.g., OB-GYN Emergency / Labour Ward"
                                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#DDD8CB] rounded-md"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-[#30232A] mb-1">
                                    Transport / Ambulance Status
                                  </label>
                                  <select
                                    value={coordTransport}
                                    onChange={(e) =>
                                      setCoordTransport(
                                        e.target.value as NonNullable<
                                          AlertReferralCoordination['transportStatus']
                                        >
                                      )
                                    }
                                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#DDD8CB] rounded-md"
                                  >
                                    <option value="Not Required">Not Required</option>
                                    <option value="Ambulance Requested">Ambulance Requested</option>
                                    <option value="Ambulance Dispatched">
                                      Ambulance Dispatched
                                    </option>
                                    <option value="In Transit">In Transit</option>
                                    <option value="Arrived">Arrived at Hospital</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-[#30232A] mb-1">
                                    Ambulance Ref / Linked Referral ID
                                  </label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      type="text"
                                      value={coordAmbulanceRef}
                                      onChange={(e) => setCoordAmbulanceRef(e.target.value)}
                                      placeholder="108-Ref"
                                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DDD8CB] rounded-md"
                                    />
                                    <input
                                      type="text"
                                      value={coordReferralId}
                                      onChange={(e) => setCoordReferralId(e.target.value)}
                                      placeholder="REF-ID"
                                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DDD8CB] rounded-md"
                                    />
                                  </div>
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-[#30232A] mb-1">
                                  Treatment &amp; Stabilization Coordination Notes
                                </label>
                                <textarea
                                  rows={2}
                                  value={coordTreatment}
                                  onChange={(e) => setCoordTreatment(e.target.value)}
                                  placeholder="Bed reservation, magnesium sulfate/antihypertensive readiness, blood bank cross-match, obstetric specialist call..."
                                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#DDD8CB] rounded-md"
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setShowCoordForm(false)}
                                  className="px-3 py-1.5 text-xs text-[#665860] hover:text-[#30232A] cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={updating}
                                  className="px-3.5 py-1.5 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] text-white rounded-md cursor-pointer disabled:opacity-50"
                                >
                                  Save Coordination Details
                                </button>
                              </div>
                            </form>
                          )}
                        </div>

                        {/* Row 4: Response Note + Return Communication Recipients */}
                        <form
                          onSubmit={(e) => void handleAddNote(e)}
                          className="pt-4 border-t border-[#EAE5D9] space-y-3"
                        >
                          <label
                            htmlFor="alert-response-note"
                            className="block text-xs font-medium text-[#30232A]"
                          >
                            Add Hospital Response Note
                          </label>
                          <textarea
                            id="alert-response-note"
                            rows={2}
                            value={responseNote}
                            onChange={(e) => setResponseNote(e.target.value)}
                            placeholder="Enter clinical instructions, triage guidance for Sunita Devi / Mother, or ward coordination updates..."
                            className="w-full px-3 py-2 text-sm bg-[#FBFBF7] border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
                          />

                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-4 text-xs text-[#30232A]">
                              <span className="text-[#665860] font-medium">
                                Return Communication:
                              </span>
                              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={notifyMother}
                                  onChange={(e) => setNotifyMother(e.target.checked)}
                                  className="accent-[#890149]"
                                />
                                <span>Mother</span>
                              </label>
                              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={notifyHw}
                                  onChange={(e) => setNotifyHw(e.target.checked)}
                                  className="accent-[#890149]"
                                />
                                <span>Health Worker</span>
                              </label>
                              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={notifySupervisor}
                                  onChange={(e) => setNotifySupervisor(e.target.checked)}
                                  className="accent-[#890149]"
                                />
                                <span>Supervisor</span>
                              </label>
                            </div>

                            <button
                              type="submit"
                              disabled={updating || !responseNote.trim()}
                              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] text-white rounded-md cursor-pointer disabled:opacity-45"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Post Note &amp; Sync</span>
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                </section>

                {/* Return Communication Sync Card */}
                <section className="bg-white border border-[#DDD8CB] rounded-lg p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#890149]" />
                      <h3 className="font-serif text-base text-[#30232A]">
                        Return Communication to JanmaSaathi Ecosystem
                      </h3>
                    </div>
                    <span className="text-xs text-[#665860] tabular-nums">
                      {selectedAlert.returnCommunication.lastDispatchedAt
                        ? `Last synced ${selectedAlert.returnCommunication.lastDispatchedAt}`
                        : 'Pending hospital acknowledgement'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <span>
                      Mother ({selectedAlert.motherId}):{' '}
                      <strong
                        className={
                          selectedAlert.returnCommunication.recipients.mother
                            ? 'text-[#15803D]'
                            : 'text-[#665860]'
                        }
                      >
                        {selectedAlert.returnCommunication.recipients.mother
                          ? 'Status Synced'
                          : 'Pending'}
                      </strong>
                    </span>
                    <span className="text-[#D9A2B5]" aria-hidden="true">
                      ·
                    </span>
                    <span>
                      Health Worker ({selectedAlert.assignedHealthWorkerName}):{' '}
                      <strong
                        className={
                          selectedAlert.returnCommunication.recipients.healthWorker
                            ? 'text-[#15803D]'
                            : 'text-[#665860]'
                        }
                      >
                        {selectedAlert.returnCommunication.recipients.healthWorker
                          ? 'Status Synced'
                          : 'Pending'}
                      </strong>
                    </span>
                    <span className="text-[#D9A2B5]" aria-hidden="true">
                      ·
                    </span>
                    <span>
                      Supervisor:{' '}
                      <strong
                        className={
                          selectedAlert.returnCommunication.recipients.supervisor
                            ? 'text-[#15803D]'
                            : 'text-[#665860]'
                        }
                      >
                        {selectedAlert.returnCommunication.recipients.supervisor
                          ? 'Status Synced'
                          : 'Pending'}
                      </strong>
                    </span>
                  </div>

                  {selectedAlert.returnCommunication.latestStatusMessage && (
                    <p className="text-xs text-[#30232A] bg-[#FBFBF7] border border-[#EAE5D9] rounded-md px-3.5 py-2.5 leading-relaxed">
                      {selectedAlert.returnCommunication.latestStatusMessage}
                    </p>
                  )}
                </section>

                {/* Complete Timestamped Response History */}
                <section className="bg-white border border-[#DDD8CB] rounded-lg p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-serif text-base text-[#30232A]">
                      Complete Timestamped Response History
                    </h3>
                    <span className="text-xs text-[#665860] tabular-nums">
                      {selectedAlert.responseHistory.length} event
                      {selectedAlert.responseHistory.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <ol className="divide-y divide-[#EAE5D9]">
                    {[...selectedAlert.responseHistory].reverse().map((entry) => (
                      <li key={entry.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div className="text-xs">
                            <span className="font-semibold text-[#30232A]">{entry.action}</span>
                            {entry.previousStatus && entry.nextStatus && (
                              <span className="ml-2 text-[#890149] font-medium">
                                ({entry.previousStatus} → {entry.nextStatus})
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#665860] tabular-nums">
                            {entry.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-[#665860]">
                          {entry.actor} · {entry.role}
                          {entry.assignedTo ? ` · Assigned: ${entry.assignedTo}` : ''}
                          {entry.notifiedRecipients && entry.notifiedRecipients.length > 0
                            ? ` · Notified: ${entry.notifiedRecipients
                                .map((r) => SOURCE_ROLE_LABELS[r])
                                .join(', ')}`
                            : ''}
                        </p>
                        {entry.note && (
                          <p className="text-xs text-[#30232A] leading-relaxed">{entry.note}</p>
                        )}
                      </li>
                    ))}
                  </ol>
                </section>
              </div>
            )}
          </div>
        )}
      </CollectionStateGate>

      {/* Submit Incoming Emergency Alert Modal (Mother / Health Worker / Supervisor) */}
      <ModalDialog
        open={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        title="Submit Emergency Maternal Alert"
        subtitle={
          appMode === 'demo'
            ? 'Broadcasts in real time over authenticated Express SSE (Demo Mode). Submitting for an active Mother ID demonstrates duplicate preservation.'
            : 'Writes a new reference-only document to Firestore emergencyAlerts.'
        }
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={(e) => void handleSubmitNewAlert(e)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-[#30232A] mb-1">
                Mother Reference (Mother ID)
              </label>
              <select
                value={subMotherId}
                onChange={(e) => setSubMotherId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md"
              >
                {mothers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#30232A] mb-1">
                Originating Source Role
              </label>
              <select
                value={subSourceRole}
                onChange={(e) => setSubSourceRole(e.target.value as AlertSourceRole)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md"
              >
                <option value="mother">Mother (Mother App SOS)</option>
                <option value="health_worker">Health Worker (ASHA / ANM)</option>
                <option value="supervisor">Supervisor (Block / PHC Escalation)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#30232A] mb-1">
                Alert Category
              </label>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value as AlertCategory)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md"
              >
                {ALERT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#30232A] mb-1">
                Protocol Priority
              </label>
              <select
                value={subPriority}
                onChange={(e) => setSubPriority(e.target.value as AlertPriority)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md"
              >
                {ALERT_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#30232A] mb-1">
              Alert Summary Headline
            </label>
            <input
              type="text"
              value={subTitle}
              onChange={(e) => setSubTitle(e.target.value)}
              placeholder="e.g., Sudden severe headache with blurred vision reported"
              className="w-full px-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#30232A] mb-1">
              Description of Symptoms <span className="text-[#B91C1C]">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={subDescription}
              onChange={(e) => setSubDescription(e.target.value)}
              placeholder="Describe reported symptoms, onset time, and clinical observations..."
              className="w-full px-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-[#30232A] mb-1">
                Symptoms (comma-separated)
              </label>
              <input
                type="text"
                value={subSymptoms}
                onChange={(e) => setSubSymptoms(e.target.value)}
                placeholder="Severe Headache, Blurred Vision, Bleeding"
                className="w-full px-3 py-2 text-xs bg-white border border-[#DDD8CB] rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#30232A] mb-1">
                Approved Protocol Reference
              </label>
              <input
                type="text"
                value={subProtocol}
                onChange={(e) => setSubProtocol(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#DDD8CB] rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#30232A] mb-1">
                BP (optional)
              </label>
              <input
                type="text"
                value={subBp}
                onChange={(e) => setSubBp(e.target.value)}
                placeholder="150/96"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DDD8CB] rounded-md tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#30232A] mb-1">
                Pulse (optional)
              </label>
              <input
                type="number"
                value={subPulse}
                onChange={(e) => setSubPulse(e.target.value)}
                placeholder="94"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DDD8CB] rounded-md tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#30232A] mb-1">
                Temp °C (optional)
              </label>
              <input
                type="number"
                step="0.1"
                value={subTemp}
                onChange={(e) => setSubTemp(e.target.value)}
                placeholder="38.5"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DDD8CB] rounded-md tabular-nums"
              />
            </div>
          </div>

          {submitFeedback && (
            <p className="text-xs text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-md px-3 py-2">
              {submitFeedback}
            </p>
          )}

          <div className="flex justify-end gap-2.5 pt-2 border-t border-[#EAE5D9]">
            <button
              type="button"
              onClick={() => setSubmitModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-[#665860] hover:text-[#30232A] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingAlert}
              className="px-4 py-2 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] text-white rounded-md cursor-pointer disabled:opacity-50"
            >
              {submittingAlert ? 'Submitting...' : 'Submit Emergency Alert'}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Schema Proposal & Integration Contract Slide-Over Drawer */}
      <SlideOverDrawer
        open={contractDrawerOpen}
        onClose={() => setContractDrawerOpen(false)}
        title="Emergency Alerts Schema & Integration Contract"
        subtitle="Proposed additive collection for outr-janmasaathi / ai-studio-janmasaathi-8e8b2a1f-7b17-42e6-bc8e-284c5c28d2df"
      >
        <div className="space-y-5 text-xs text-[#30232A] leading-relaxed">
          <div className="p-3.5 bg-[#FBFBF7] border border-[#DDD8CB] rounded-md">
            <p className="font-semibold text-[#890149]">Database Audit Finding</p>
            <p className="mt-1 text-[#665860]">
              The existing JanmaSaathi database contains <code className="text-[#30232A]">mothers</code>,{' '}
              <code className="text-[#30232A]">assessments</code>,{' '}
              <code className="text-[#30232A]">healthUpdates</code>,{' '}
              <code className="text-[#30232A]">referrals</code>, and{' '}
              <code className="text-[#30232A]">messages</code>, but no approved emergency alerts
              collection. The proposed <code className="text-[#30232A]">emergencyAlerts</code>{' '}
              collection preserves JanmaSaathi&apos;s exact offline sync envelope and references{' '}
              <code className="text-[#30232A]">motherId</code> without duplicating maternal profiles.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-sm text-[#30232A] mb-2">
              1. Proposed Collection: <code>emergencyAlerts/{'{alertId}'}</code>
            </h3>
            <ul className="space-y-1.5 text-[#665860] list-disc pl-4">
              <li>
                <strong className="text-[#30232A]">Identity &amp; References:</strong>{' '}
                <code>id</code>, <code>alertId</code>, <code>recordType: &quot;emergencyAlert&quot;</code>,{' '}
                <code>motherId</code>, <code>relatedMotherId</code>, <code>sourceRole</code> (
                <code>mother | health_worker | supervisor</code>), <code>reportedByUserId</code>,{' '}
                <code>assignedHealthWorkerId</code>, <code>facilityId</code>.
              </li>
              <li>
                <strong className="text-[#30232A]">Clinical Content:</strong>{' '}
                <code>alertCategory</code>, <code>triggerTitle</code>,{' '}
                <code>symptomDescription</code>, <code>symptoms[]</code>, <code>vitals</code>{' '}
                (available vitals only), <code>priority</code> (
                <code>Critical | High Priority | Moderate | Low</code>),{' '}
                <code>priorityBasis</code>, <code>protocolReference</code>.
              </li>
              <li>
                <strong className="text-[#30232A]">Workflow &amp; Safety:</strong>{' '}
                <code>status</code> (<code>NEW</code> → <code>ACKNOWLEDGED</code> →{' '}
                <code>IN PROGRESS</code> → <code>REFERRED / ACTION TAKEN</code> →{' '}
                <code>RESOLVED</code> → <code>CLOSED</code>),{' '}
                <code>duplicateSubmissionCount</code>, <code>duplicateSubmissions[]</code>,{' '}
                <code>hospitalResponse</code>, <code>responseHistory[]</code>,{' '}
                <code>returnCommunication</code>.
              </li>
              <li>
                <strong className="text-[#30232A]">Existing JanmaSaathi Sync Envelope:</strong>{' '}
                <code>owningUid</code>, <code>operationId</code>, <code>localRecordId</code>,{' '}
                <code>localRevision</code>, <code>recordOrigin</code>, <code>syncState</code>,{' '}
                <code>createdAt</code>, <code>updatedAt</code>.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm text-[#30232A] mb-2">
              2. Return Communication Contract
            </h3>
            <p className="text-[#665860]">
              Every hospital acknowledgement, assignment, referral coordination, resolution, or
              closure updates <code className="text-[#30232A]">emergencyAlerts/{'{alertId}'}</code>{' '}
              and dispatches a status message to the existing{' '}
              <code className="text-[#30232A]">messages</code> collection (matching{' '}
              <code>senderRole: &quot;hospital&quot;</code>, <code>motherId</code>,{' '}
              <code>relatedAlertId</code>, <code>translations</code>) so authorized Mother, Health
              Worker, and Supervisor interfaces receive status updates automatically.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-sm text-[#30232A] mb-2">
              3. Real-Time Transport &amp; Fallback
            </h3>
            <p className="text-[#665860]">
              The Hospital Dashboard connects via authenticated Server-Sent Events (
              <code>GET /api/alerts/stream</code> using single-use tickets from{' '}
              <code>POST /api/alerts/stream-token</code>) alongside Firestore real-time snapshots,
              automatically failing over to 5-second authenticated polling (
              <code>GET /api/alerts</code>) whenever the real-time channel is interrupted.
            </p>
          </div>
        </div>
      </SlideOverDrawer>
    </div>
  );
};
