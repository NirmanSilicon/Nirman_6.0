import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { AppointmentRecord, AppointmentStatus } from '../../types/hospital';
import {
  EmptyState,
  ModalDialog,
  SectionHeader,
  StatusText,
  toneForAppointmentStatus,
} from '../ui/ClinicalPrimitives';
import { CollectionStateGate } from '../ui/FirestoreStatePanels';

const STATUS_FILTERS: ('All' | AppointmentStatus)[] = [
  'All',
  'Upcoming',
  'Follow-up Due',
  'Completed',
  'Missed',
  'Rescheduled',
];

export const AppointmentsView: React.FC = () => {
  const {
    appMode,
    appointments,
    mothers,
    currentUser,
    updateAppointmentStatus,
    createAppointment,
    openMotherProfile,
    collectionStatuses,
    refreshAllSubscriptions,
  } = useDashboard();

  const [statusFilter, setStatusFilter] = useState<'All' | AppointmentStatus>('All');
  const [query, setQuery] = useState('');
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [motherId, setMotherId] = useState(mothers[0]?.id ?? '');
  const [aptType, setAptType] =
    useState<AppointmentRecord['appointmentType']>('ANC Routine Checkup');
  const [scheduledDate, setScheduledDate] = useState('2026-11-29');
  const [scheduledTime, setScheduledTime] = useState('10:30 AM');
  const [department, setDepartment] = useState('ANC OPD Room 1');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!motherId && mothers.length > 0) {
      setMotherId(mothers[0].id);
    }
  }, [mothers, motherId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return appointments.filter((a) => {
      if (statusFilter !== 'All' && a.status !== statusFilter) return false;
      if (q) {
        const hit =
          a.motherName.toLowerCase().includes(q) ||
          a.motherId.toLowerCase().includes(q) ||
          a.appointmentType.toLowerCase().includes(q) ||
          a.clinician.toLowerCase().includes(q) ||
          a.department.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [appointments, statusFilter, query]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = mothers.find((m) => m.id === motherId);
    if (!target) return;
    setSaving(true);
    try {
      await createAppointment({
        motherId: target.id,
        motherName: target.fullName,
        gestationalAgeLabel: `${target.gestationalWeeks}w ${target.gestationalDays}d`,
        appointmentType: aptType,
        scheduledDate,
        scheduledTime,
        clinician: currentUser.name,
        department: department.trim() || 'ANC OPD',
        status: 'Upcoming',
        assignedHealthWorkerName: target.assignedHealthWorkerName,
        notes: notes.trim() || 'Scheduled from Hospital Dashboard.',
      });
      setNotes('');
      setScheduleModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Appointments & Follow-ups"
        subtitle={
          appMode === 'demo'
            ? 'Manage antenatal clinic appointments and follow-ups in JanmaSaathi Demo Mode.'
            : 'Manage hospital antenatal appointments synced live with Firestore.'
        }
        actions={
          <button
            type="button"
            disabled={mothers.length === 0}
            onClick={() => setScheduleModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] disabled:opacity-50 text-white rounded-md whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Appointment</span>
          </button>
        }
      />

      <CollectionStateGate
        syncState={collectionStatuses.appointments}
        userEmail={currentUser.email}
        userId={currentUser.uid}
        userRole={currentUser.role}
        onRetry={refreshAllSubscriptions}
        loadingLabel="Loading appointments from Firestore..."
      >
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#EAE9DC] rounded-md overflow-x-auto">
            {STATUS_FILTERS.map((st) => {
              const count =
                st === 'All'
                  ? appointments.length
                  : appointments.filter((a) => a.status === st).length;
              const active = statusFilter === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-white text-[#890149] shadow-xs'
                      : 'text-[#665860] hover:text-[#30232A]'
                  }`}
                >
                  {st} <span className="ml-1 tabular-nums text-[11px] opacity-80">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full xl:w-72">
            <Search className="w-4 h-4 text-[#665860] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search mother, clinician, clinic..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No appointments found"
            description="Switch status filters or schedule a new maternal hospital visit."
          />
        ) : (
          <div className="bg-white border border-[#DDD8CB] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EAE5D9] bg-[#FBFBF7] text-xs font-medium text-[#665860]">
                    <th className="py-3 px-5">Mother</th>
                    <th className="py-3 px-4">Appointment Type &amp; Clinic</th>
                    <th className="py-3 px-4">Date &amp; Time</th>
                    <th className="py-3 px-4">Clinician &amp; HW</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE5D9] text-[13px]">
                  {filtered.map((apt) => (
                    <tr key={apt.id} className="hover:bg-[#F3F3E7]/50">
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openMotherProfile(apt.motherId)}
                          className="font-semibold text-[#30232A] hover:text-[#890149] hover:underline text-left cursor-pointer"
                        >
                          {apt.motherName}
                        </button>
                        <p className="text-xs text-[#665860] tabular-nums">
                          {apt.motherId} · {apt.gestationalAgeLabel}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 max-w-[260px]">
                        <p className="font-medium text-[#30232A]">{apt.appointmentType}</p>
                        <p className="text-xs text-[#665860] truncate" title={apt.notes}>
                          {apt.department} · {apt.notes}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap tabular-nums text-xs">
                        <p className="font-medium text-[#30232A]">{apt.scheduledDate}</p>
                        <p className="text-[#665860]">{apt.scheduledTime}</p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                        <p className="text-[#30232A]">{apt.clinician}</p>
                        <p className="text-[#665860]">HW: {apt.assignedHealthWorkerName}</p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusText
                          label={apt.status}
                          tone={toneForAppointmentStatus(apt.status)}
                        />
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 text-xs">
                          {apt.status !== 'Completed' && (
                            <button
                              type="button"
                              onClick={() => void updateAppointmentStatus(apt.id, 'Completed')}
                              className="text-[#15803D] font-medium hover:underline cursor-pointer"
                            >
                              Mark Completed
                            </button>
                          )}
                          {apt.status !== 'Missed' && apt.status !== 'Completed' && (
                            <>
                              <span className="text-[#DDD8CB]" aria-hidden="true">·</span>
                              <button
                                type="button"
                                onClick={() => void updateAppointmentStatus(apt.id, 'Missed')}
                                className="text-[#B91C1C] font-medium hover:underline cursor-pointer"
                              >
                                Missed
                              </button>
                            </>
                          )}
                          {apt.status === 'Missed' && (
                            <button
                              type="button"
                              onClick={() =>
                                void updateAppointmentStatus(apt.id, 'Rescheduled', '2026-11-29')
                              }
                              className="text-[#890149] font-medium hover:underline cursor-pointer"
                            >
                              Reschedule
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CollectionStateGate>

      <ModalDialog
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title="Schedule Hospital Appointment"
        subtitle={
          appMode === 'demo'
            ? 'Books a follow-up visit in local Demo Mode'
            : 'Creates an appointment document in live Firestore'
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#30232A] mb-1">Mother</label>
            <select
              value={motherId}
              onChange={(e) => setMotherId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md focus:outline-none focus:border-[#890149]"
            >
              {mothers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} — {m.fullName} ({m.gestationalWeeks}w {m.gestationalDays}d)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#30232A] mb-1">
                Appointment Type
              </label>
              <select
                value={aptType}
                onChange={(e) =>
                  setAptType(e.target.value as AppointmentRecord['appointmentType'])
                }
                className="w-full px-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md focus:outline-none focus:border-[#890149]"
              >
                <option value="ANC Routine Checkup">ANC Routine Checkup</option>
                <option value="High-Risk OB Consult">High-Risk OB Consult</option>
                <option value="Ultrasound / Doppler">Ultrasound / Doppler</option>
                <option value="Lab & Anemia Workup">Lab &amp; Anemia Workup</option>
                <option value="Postnatal Follow-up">Postnatal Follow-up</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#30232A] mb-1">
                Department / Clinic
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md focus:outline-none focus:border-[#890149]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#30232A] mb-1">Date</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md tabular-nums focus:outline-none focus:border-[#890149]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#30232A] mb-1">Time Slot</label>
              <input
                type="text"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md tabular-nums focus:outline-none focus:border-[#890149]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#30232A] mb-1">
              Preparation Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Fasting blood sample, bring MCP card, ASHA accompaniment..."
              className="w-full px-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md focus:outline-none focus:border-[#890149]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setScheduleModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-[#665860] hover:text-[#30232A] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] disabled:opacity-50 text-white rounded-md cursor-pointer"
            >
              {saving ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};
