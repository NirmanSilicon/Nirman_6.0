import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Plus, Search } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { HOSPITAL_FACILITIES } from '../../data/facilities';
import { ReferralRecord, ReferralStatus } from '../../types/hospital';
import {
  EmptyState,
  ModalDialog,
  SectionHeader,
  SlideOverDrawer,
  StatusText,
  toneForReferralStatus,
} from '../ui/ClinicalPrimitives';
import { CollectionStateGate } from '../ui/FirestoreStatePanels';

const STATUS_TABS: ('All' | ReferralStatus)[] = [
  'All',
  'Pending',
  'In Transit',
  'Accepted',
  'Admitted',
  'Completed',
  'Declined',
];

export const ReferralsView: React.FC = () => {
  const {
    appMode,
    referrals,
    mothers,
    currentUser,
    currentFacility,
    selectedReferralId,
    setSelectedReferralId,
    updateReferralStatus,
    createReferral,
    openMotherProfile,
    collectionStatuses,
    refreshAllSubscriptions,
  } = useDashboard();

  const [statusFilter, setStatusFilter] = useState<'All' | ReferralStatus>('All');
  const [query, setQuery] = useState('');
  const [followUpDraft, setFollowUpDraft] = useState('');
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newMotherId, setNewMotherId] = useState(mothers[0]?.id ?? '');
  const [newDestHospital, setNewDestHospital] = useState(HOSPITAL_FACILITIES[0].name);
  const [newDestDept, setNewDestDept] = useState('Obstetrics & Gynecology');
  const [newUrgency, setNewUrgency] = useState<ReferralRecord['urgency']>('Urgent');
  const [newReason, setNewReason] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newFollowUpDate, setNewFollowUpDate] = useState('2026-11-29');

  useEffect(() => {
    if (!newMotherId && mothers.length > 0) {
      setNewMotherId(mothers[0].id);
    }
  }, [mothers, newMotherId]);

  const filteredReferrals = useMemo(() => {
    const q = query.trim().toLowerCase();
    return referrals.filter((r) => {
      if (statusFilter !== 'All' && r.status !== statusFilter) return false;
      if (q) {
        const hit =
          r.id.toLowerCase().includes(q) ||
          r.motherId.toLowerCase().includes(q) ||
          r.motherName.toLowerCase().includes(q) ||
          r.sourceFacility.toLowerCase().includes(q) ||
          r.destinationHospital.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [referrals, statusFilter, query]);

  const selectedReferral = useMemo(
    () => referrals.find((r) => r.id === selectedReferralId) ?? null,
    [referrals, selectedReferralId]
  );

  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetMother = mothers.find((m) => m.id === newMotherId);
    if (!targetMother || !newReason.trim()) return;
    setSaving(true);
    try {
      await createReferral({
        motherId: targetMother.id,
        motherName: targetMother.fullName,
        gestationalAgeLabel: `${targetMother.gestationalWeeks}w ${targetMother.gestationalDays}d`,
        sourceFacility: currentFacility.name,
        sourceContact: `${currentUser.name} (${currentUser.role})`,
        reason: newReason.trim(),
        clinicalSummary: newSummary.trim() || newReason.trim(),
        urgency: newUrgency,
        destinationHospital: newDestHospital,
        destinationDepartment: newDestDept.trim() || 'Obstetrics & Gynecology',
        status: 'Pending',
        followUpDetails: 'Referral created; awaiting receiving hospital confirmation.',
        followUpDate: newFollowUpDate,
        assignedDoctor: currentUser.name,
      });
      setNewReason('');
      setNewSummary('');
      setNewModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (status: ReferralStatus) => {
    if (!selectedReferral) return;
    setSaving(true);
    try {
      await updateReferralStatus(selectedReferral.id, status, followUpDraft);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Referral Management"
        subtitle={
          appMode === 'demo'
            ? 'Track inbound PHC/CHC obstetric referrals and transfers using preserved JanmaSaathi demo records.'
            : 'Track inbound PHC/CHC obstetric referrals and transfers synced live with Firestore.'
        }
        actions={
          <button
            type="button"
            disabled={mothers.length === 0}
            onClick={() => setNewModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] disabled:opacity-50 text-white rounded-md transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record New Referral</span>
          </button>
        }
      />

      <CollectionStateGate
        syncState={collectionStatuses.referrals}
        userEmail={currentUser.email}
        userId={currentUser.uid}
        userRole={currentUser.role}
        onRetry={refreshAllSubscriptions}
        loadingLabel="Loading referrals from Firestore..."
      >
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#EAE9DC] rounded-md overflow-x-auto">
            {STATUS_TABS.map((tab) => {
              const count =
                tab === 'All'
                  ? referrals.length
                  : referrals.filter((r) => r.status === tab).length;
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
                  {tab} <span className="ml-1 tabular-nums text-[11px] opacity-80">({count})</span>
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
              placeholder="Search referral ID, mother, source..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
            />
          </div>
        </div>

        {referrals.length === 0 ? (
          <EmptyState
            title="No referrals recorded"
            description="No maternal referral documents are currently present in this dataset."
          />
        ) : filteredReferrals.length === 0 ? (
          <EmptyState
            title="No referrals in this status"
            description="Select All Referrals or adjust your search query to view hospital referral history."
          />
        ) : (
          <div className="bg-white border border-[#DDD8CB] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EAE5D9] bg-[#FBFBF7] text-xs font-medium text-[#665860]">
                    <th className="py-3 px-5">Mother ID &amp; Name</th>
                    <th className="py-3 px-4">Referral Source</th>
                    <th className="py-3 px-4">Referral Reason</th>
                    <th className="py-3 px-4">Destination Hospital</th>
                    <th className="py-3 px-4">Referral Date</th>
                    <th className="py-3 px-4">Current Status</th>
                    <th className="py-3 px-5">Follow-up Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE5D9] text-[13px]">
                  {filteredReferrals.map((ref) => (
                    <tr
                      key={ref.id}
                      onClick={() => {
                        setSelectedReferralId(ref.id);
                        setFollowUpDraft(ref.followUpDetails);
                      }}
                      className="hover:bg-[#F3F3E7]/65 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <p className="font-semibold text-[#30232A]">{ref.motherName}</p>
                        <p className="text-xs text-[#890149] tabular-nums">
                          {ref.motherId} · {ref.gestationalAgeLabel}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                        <p className="text-[#30232A] font-medium">{ref.sourceFacility}</p>
                        <p className="text-[#665860] truncate max-w-[200px]">{ref.sourceContact}</p>
                      </td>
                      <td className="py-3.5 px-4 max-w-[260px]">
                        <p className="text-xs text-[#30232A] line-clamp-2 leading-relaxed">
                          {ref.reason}
                        </p>
                        <p className="text-[11px] text-[#665860] mt-0.5 tabular-nums">
                          {ref.id} · {ref.urgency}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        <p className="text-[#30232A] font-medium">{ref.destinationHospital}</p>
                        <p className="text-[#665860]">{ref.destinationDepartment}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#665860] tabular-nums whitespace-nowrap">
                        {ref.referralDate}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusText
                          label={ref.status}
                          tone={toneForReferralStatus(ref.status)}
                        />
                      </td>
                      <td className="py-3.5 px-5 max-w-[240px]">
                        <p className="text-xs text-[#30232A] line-clamp-2">{ref.followUpDetails}</p>
                        <p className="text-[11px] text-[#665860] tabular-nums mt-0.5">
                          Review: {ref.followUpDate}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CollectionStateGate>

      {/* Referral Detail & Action Drawer */}
      <SlideOverDrawer
        open={Boolean(selectedReferral)}
        onClose={() => setSelectedReferralId(null)}
        title={selectedReferral ? `${selectedReferral.id} · ${selectedReferral.motherName}` : ''}
        subtitle={
          selectedReferral
            ? `${selectedReferral.motherId} · ${selectedReferral.gestationalAgeLabel} · ${selectedReferral.urgency} Referral`
            : undefined
        }
      >
        {selectedReferral && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#EAE5D9]">
              <div>
                <p className="text-xs text-[#665860]">Current Referral Status</p>
                <StatusText
                  label={selectedReferral.status}
                  tone={toneForReferralStatus(selectedReferral.status)}
                  className="text-base mt-0.5"
                />
              </div>
              {selectedReferral.motherId && (
                <button
                  type="button"
                  onClick={() => openMotherProfile(selectedReferral.motherId)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#FBFBF7] border border-[#DDD8CB] hover:border-[#890149] text-[#30232A] rounded-md cursor-pointer"
                >
                  <span>Open Mother Profile</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <dt className="text-[#665860]">Referral Source</dt>
                <dd className="mt-0.5 text-sm font-medium text-[#30232A]">
                  {selectedReferral.sourceFacility}
                </dd>
                <dd className="text-[#665860] mt-0.5">{selectedReferral.sourceContact}</dd>
              </div>
              <div>
                <dt className="text-[#665860]">Destination Hospital</dt>
                <dd className="mt-0.5 text-sm font-medium text-[#30232A]">
                  {selectedReferral.destinationHospital}
                </dd>
                <dd className="text-[#665860] mt-0.5">{selectedReferral.destinationDepartment}</dd>
              </div>
              <div>
                <dt className="text-[#665860]">Referral Date</dt>
                <dd className="mt-0.5 text-sm font-medium text-[#30232A] tabular-nums">
                  {selectedReferral.referralDate}
                </dd>
              </div>
              <div>
                <dt className="text-[#665860]">Attending Clinician / Supervisor</dt>
                <dd className="mt-0.5 text-sm font-medium text-[#30232A]">
                  {selectedReferral.assignedDoctor}
                </dd>
              </div>
            </dl>

            <div className="pt-4 border-t border-[#EAE5D9] space-y-3">
              <div>
                <p className="text-xs font-semibold text-[#665860]">Referral Reason</p>
                <p className="mt-1 text-sm font-semibold text-[#30232A]">
                  {selectedReferral.reason}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#665860]">Clinical Transfer Summary</p>
                <p className="mt-1 text-sm text-[#30232A] leading-relaxed">
                  {selectedReferral.clinicalSummary}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#EAE5D9] space-y-3">
              <label className="block text-xs font-semibold text-[#30232A]">
                Update Follow-up Notes &amp; Coordination Status
              </label>
              <textarea
                rows={3}
                value={followUpDraft}
                onChange={(e) => setFollowUpDraft(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#FBFBF7] border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
              />
              <div className="flex flex-wrap items-center gap-2">
                {(['Accepted', 'In Transit', 'Admitted', 'Completed', 'Declined'] as ReferralStatus[]).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={saving}
                      onClick={() => void handleStatusUpdate(st)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 cursor-pointer ${
                        selectedReferral.status === st
                          ? 'bg-[#890149] text-white'
                          : 'bg-white border border-[#DDD8CB] text-[#30232A] hover:border-[#890149]'
                      }`}
                    >
                      Mark {st}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </SlideOverDrawer>

      {/* Record New Referral Modal */}
      <ModalDialog
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        title="Record Hospital Referral"
        subtitle={
          appMode === 'demo'
            ? 'Creates a referral entry in local Demo Mode (does not modify Firestore)'
            : 'Creates a referral document in the live Firestore referrals collection'
        }
      >
        <form onSubmit={handleCreateReferral} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#30232A] mb-1">Select Mother</label>
            <select
              value={newMotherId}
              onChange={(e) => setNewMotherId(e.target.value)}
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
                Destination Hospital
              </label>
              <select
                value={newDestHospital}
                onChange={(e) => setNewDestHospital(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md focus:outline-none focus:border-[#890149]"
              >
                {HOSPITAL_FACILITIES.map((f) => (
                  <option key={f.id} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#30232A] mb-1">Urgency</label>
              <select
                value={newUrgency}
                onChange={(e) => setNewUrgency(e.target.value as ReferralRecord['urgency'])}
                className="w-full px-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md focus:outline-none focus:border-[#890149]"
              >
                <option value="Emergency">Emergency</option>
                <option value="Urgent">Urgent</option>
                <option value="Elective">Elective</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#30232A] mb-1">
                Destination Department
              </label>
              <input
                type="text"
                value={newDestDept}
                onChange={(e) => setNewDestDept(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md focus:outline-none focus:border-[#890149]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#30232A] mb-1">
                Follow-up Review Date
              </label>
              <input
                type="date"
                value={newFollowUpDate}
                onChange={(e) => setNewFollowUpDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md tabular-nums focus:outline-none focus:border-[#890149]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#30232A] mb-1">
              Referral Reason
            </label>
            <input
              type="text"
              required
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="e.g. Secondary obstetric evaluation for elevated BP"
              className="w-full px-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md focus:outline-none focus:border-[#890149]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#30232A] mb-1">
              Clinical Summary
            </label>
            <textarea
              rows={3}
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              placeholder="Key vitals, danger signs, and requested receiving care..."
              className="w-full px-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md focus:outline-none focus:border-[#890149]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setNewModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-[#665860] hover:text-[#30232A] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] disabled:opacity-50 text-white rounded-md cursor-pointer"
            >
              {saving ? 'Saving...' : 'Submit Referral'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};
