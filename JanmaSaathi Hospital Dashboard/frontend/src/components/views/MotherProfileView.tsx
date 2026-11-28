import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Download,
  FileText,
  Lock,
  Phone,
  Plus,
  Printer,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useDashboard } from '../../context/DashboardContext';
import {
  MotherTimelineCategory,
  buildMotherChronologicalTimeline,
} from '../../services/analyticsEngine';
import { AssessmentRecord, RiskLevel } from '../../types/hospital';
import {
  ModalDialog,
  StatusText,
  toneForAlertStatus,
  toneForAppointmentStatus,
  toneForReferralStatus,
  toneForRisk,
} from '../ui/ClinicalPrimitives';

type ProfileTab =
  | 'overview'
  | 'vitals'
  | 'assessments'
  | 'alerts-referrals'
  | 'appointments-docs';

export const MotherProfileView: React.FC<{ motherId: string }> = ({ motherId }) => {
  const {
    appMode,
    mothers,
    healthWorkers,
    assessments,
    alerts,
    referrals,
    appointments,
    closeMotherProfile,
    setActiveSection,
    setSelectedAlertId,
    setSelectedReferralId,
    addAssessmentNote,
    logAuditAction,
  } = useDashboard();

  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [timelineCategory, setTimelineCategory] = useState<'all' | MotherTimelineCategory>('all');
  const [timelineAscending, setTimelineAscending] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  const [asmType, setAsmType] = useState<AssessmentRecord['assessmentType']>('High-Risk Review');
  const [asmRisk, setAsmRisk] = useState<RiskLevel>('High Priority');
  const [asmBp, setAsmBp] = useState('120/80');
  const [asmHb, setAsmHb] = useState('11.0');
  const [asmSummary, setAsmSummary] = useState('');
  const [asmRec, setAsmRec] = useState('');

  const mother = useMemo(() => mothers.find((m) => m.id === motherId), [mothers, motherId]);

  const assignedWorker = useMemo(
    () => (mother ? healthWorkers.find((w) => w.id === mother.assignedHealthWorkerId) : undefined),
    [mother, healthWorkers]
  );

  const motherAssessments = useMemo(
    () => assessments.filter((a) => a.motherId === motherId),
    [assessments, motherId]
  );

  const motherAlerts = useMemo(
    () => alerts.filter((a) => a.motherId === motherId),
    [alerts, motherId]
  );

  const motherReferrals = useMemo(
    () => referrals.filter((r) => r.motherId === motherId),
    [referrals, motherId]
  );

  const motherAppointments = useMemo(
    () => appointments.filter((a) => a.motherId === motherId),
    [appointments, motherId]
  );

  if (!mother) {
    return (
      <div className="bg-white border border-[#DDD8CB] rounded-lg p-8 text-center">
        <p className="font-serif text-lg text-[#30232A]">
          {appMode === 'demo' ? 'Mother record not found in demo fixtures' : 'Mother record not found in Firestore'}
        </p>
        <p className="mt-1 text-xs text-[#665860]">
          Document ID &ldquo;{motherId}&rdquo; is not available in the current{' '}
          {appMode === 'demo' ? 'demo dataset' : 'connected mothers collection'}.
        </p>
        <button
          type="button"
          onClick={closeMotherProfile}
          className="mt-4 px-4 py-2 text-xs font-medium bg-[#890149] text-white rounded-md cursor-pointer"
        >
          Return to Mother Records
        </button>
      </div>
    );
  }

  const progressPct = Math.min(100, Math.round((mother.gestationalWeeks / 40) * 100));
  const previewDoc = mother.documents.find((d) => d.id === previewDocId);
  const bpChartData = mother.vitalsHistory.filter((v) => v.systolicBp > 0 && v.diastolicBp > 0);
  const glucoseChartData = mother.vitalsHistory.filter(
    (v) => typeof v.bloodGlucose === 'number' && v.bloodGlucose > 0
  );

  const unifiedTimeline = useMemo(() => {
    const events = buildMotherChronologicalTimeline({
      mother,
      assessments: motherAssessments,
      alerts: motherAlerts,
      referrals: motherReferrals,
      appointments: motherAppointments,
    });
    const scoped =
      timelineCategory === 'all'
        ? events
        : events.filter((ev) => ev.category === timelineCategory);
    return timelineAscending ? [...scoped].reverse() : scoped;
  }, [
    mother,
    motherAssessments,
    motherAlerts,
    motherReferrals,
    motherAppointments,
    timelineCategory,
    timelineAscending,
  ]);

  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asmSummary.trim()) return;
    setSavingNote(true);
    try {
      await addAssessmentNote(mother.id, {
        assessmentType: asmType,
        riskClassification: asmRisk,
        bpReading: asmBp.trim() || '120/80',
        hemoglobin: parseFloat(asmHb) || mother.latestHb || 0,
        summary: asmSummary.trim(),
        recommendations: asmRec.trim() || 'Continue scheduled hospital antenatal follow-up.',
      });
      setAsmSummary('');
      setAsmRec('');
      setNoteModalOpen(false);
      setActiveTab('assessments');
    } finally {
      setSavingNote(false);
    }
  };

  const tabs: { id: ProfileTab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview & Timeline' },
    { id: 'vitals', label: 'Vitals & Symptoms', count: mother.vitalsHistory.length },
    { id: 'assessments', label: 'Assessment History', count: motherAssessments.length },
    {
      id: 'alerts-referrals',
      label: 'Alerts & Referrals',
      count: motherAlerts.length + motherReferrals.length,
    },
    {
      id: 'appointments-docs',
      label: 'Appointments & Documents',
      count: motherAppointments.length + mother.documents.length,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <button
          type="button"
          onClick={closeMotherProfile}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#665860] hover:text-[#890149] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Mother Records</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              void logAuditAction(
                'Report Export',
                'Printed Maternal Health Summary',
                `${mother.id} (${mother.fullName})`,
                mother.consentLevel
              );
              window.print();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-[#DDD8CB] hover:bg-[#F3F3E7] text-[#30232A] rounded-md transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Clinical Summary</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAsmBp(mother.latestBp !== '—' ? mother.latestBp : '120/80');
              setAsmHb(mother.latestHb ? String(mother.latestHb) : '11.0');
              setAsmRisk(mother.riskLevel);
              setNoteModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] text-white rounded-md transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Clinical Assessment</span>
          </button>
        </div>
      </div>

      {/* Maternal Identity & Pregnancy Progress Banner */}
      <section className="bg-white border border-[#DDD8CB] rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-6 border-b border-[#EAE5D9]">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-serif text-3xl text-[#30232A]">{mother.fullName}</h1>
              {mother.regionalName && (
                <span className="text-base text-[#665860]">{mother.regionalName}</span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#665860] tabular-nums">
              <span className="font-semibold text-[#890149]">{mother.id}</span>
              <span aria-hidden="true">·</span>
              <span>
                {mother.ageAuthorized ? (
                  mother.age !== null ? `Age ${mother.age} yrs` : 'Age not recorded'
                ) : (
                  <span className="inline-flex items-center gap-1 text-[#665860]">
                    <Lock className="w-3 h-3" /> Age Restricted
                  </span>
                )}
              </span>
              <span aria-hidden="true">·</span>
              <span>{mother.gravidaPara}</span>
              <span aria-hidden="true">·</span>
              <span>Blood Group {mother.bloodGroup}</span>
              <span aria-hidden="true">·</span>
              <span>
                {mother.villageOrWard}, {mother.block}
              </span>
              <span aria-hidden="true">·</span>
              <span>{mother.consentLevel}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 shrink-0">
            <div>
              <p className="text-[11px] text-[#665860]">Clinical Priority</p>
              <StatusText
                label={mother.riskLevel}
                tone={toneForRisk(mother.riskLevel)}
                className="mt-0.5 text-sm"
              />
            </div>
            <div className="pl-6 border-l border-[#EAE5D9]">
              <p className="text-[11px] text-[#665860]">Alert Status</p>
              <StatusText
                label={mother.alertStatus}
                tone={toneForAlertStatus(mother.alertStatus)}
                className="mt-0.5 text-sm"
              />
            </div>
            <div className="pl-6 border-l border-[#EAE5D9]">
              <p className="text-[11px] text-[#665860]">Referral Status</p>
              <StatusText
                label={mother.referralStatus}
                tone={toneForReferralStatus(mother.referralStatus)}
                className="mt-0.5 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Gestational Age & EDD Bar */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 grid grid-cols-3 gap-4 tabular-nums">
            <div>
              <p className="text-[11px] text-[#665860]">Gestational Age</p>
              <p className="text-base font-semibold text-[#30232A] mt-0.5">
                {mother.gestationalWeeks > 0
                  ? `${mother.gestationalWeeks}w ${mother.gestationalDays}d`
                  : '—'}
              </p>
              <p className="text-[11px] text-[#665860]">Trimester {mother.trimester}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#665860]">Est. Delivery (EDD)</p>
              <p className="text-base font-semibold text-[#30232A] mt-0.5">{mother.eddDate}</p>
              <p className="text-[11px] text-[#665860]">LMP {mother.lmpDate}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#665860]">Latest Vitals</p>
              <p className="text-base font-semibold text-[#30232A] mt-0.5">{mother.latestBp}</p>
              <p className="text-[11px] text-[#665860]">
                {mother.latestHb ? `Hb ${mother.latestHb} g/dL` : 'Hb —'}
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="flex items-center justify-between text-xs mb-1.5 tabular-nums">
              <span className="font-medium text-[#30232A]">
                Pregnancy Progression · {mother.pregnancyStatus}
              </span>
              <span className="text-[#665860]">Week {mother.gestationalWeeks} of 40</span>
            </div>
            <div className="relative h-2.5 bg-[#F3F3E7] rounded-xs overflow-hidden border border-[#EAE5D9]">
              <div
                className="h-full bg-[#890149] transition-all"
                style={{ width: `${progressPct}%` }}
              />
              <div className="absolute top-0 bottom-0 left-[30%] w-px bg-white/80" />
              <div className="absolute top-0 bottom-0 left-[67.5%] w-px bg-white/80" />
            </div>
            <div className="flex justify-between text-[11px] text-[#665860] mt-1 tabular-nums">
              <span>W1 Booking</span>
              <span>W12 · T1</span>
              <span>W27 · T2</span>
              <span>W40 · EDD</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tab Navigation Bar */}
      <div className="border-b border-[#DDD8CB] overflow-x-auto no-print">
        <div className="flex items-center gap-6 min-w-max" role="tablist">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                  active
                    ? 'border-[#890149] text-[#890149] font-semibold'
                    : 'border-transparent text-[#665860] hover:text-[#30232A] font-normal'
                }`}
              >
                {tab.label}
                {typeof tab.count === 'number' && (
                  <span className="ml-1.5 text-xs tabular-nums text-[#665860]">({tab.count})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: Overview & Pregnancy Timeline */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <section className="bg-white border border-[#DDD8CB] rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-[#EAE5D9] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-serif text-lg text-[#30232A]">
                    Chronological Health Timeline
                  </h2>
                  <p className="text-xs text-[#665860] mt-0.5 tabular-nums">
                    {unifiedTimeline.length} recorded event(s) across milestones, health updates,
                    assessments, reports, symptoms, alerts, referrals, hospital responses, and
                    follow-ups
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTimelineAscending((prev) => !prev)}
                  className="px-2.5 py-1.5 text-xs font-medium bg-[#FBFBF7] border border-[#DDD8CB] hover:border-[#890149] text-[#30232A] rounded-md cursor-pointer whitespace-nowrap"
                >
                  {timelineAscending ? 'Oldest First' : 'Newest First'}
                </button>
              </div>

              <div className="px-6 py-3 bg-[#FBFBF7] border-b border-[#EAE5D9] flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'milestone', label: 'Milestones' },
                    { id: 'health-update', label: 'Health Updates' },
                    { id: 'assessment', label: 'Assessments' },
                    { id: 'report', label: 'Reports' },
                    { id: 'symptom', label: 'Symptoms' },
                    { id: 'alert', label: 'Alerts' },
                    { id: 'referral', label: 'Referrals' },
                    { id: 'hospital-response', label: 'Hospital Responses' },
                    { id: 'follow-up', label: 'Follow-ups' },
                  ] as const
                ).map((cat) => {
                  const active = timelineCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setTimelineCategory(cat.id)}
                      className={`px-2.5 py-1 text-[11px] rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-[#890149] text-white font-medium'
                          : 'bg-white border border-[#DDD8CB] text-[#665860] hover:text-[#30232A]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {unifiedTimeline.length === 0 ? (
                <p className="p-6 text-sm text-[#665860]">
                  No timeline events recorded in this category yet.
                </p>
              ) : (
                <ol className="divide-y divide-[#EAE5D9] max-h-[540px] overflow-y-auto">
                  {unifiedTimeline.map((ev) => (
                    <li
                      key={ev.id}
                      className="px-6 py-4 flex items-start justify-between gap-3 hover:bg-[#FBFBF7]/60"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-[#890149]">{ev.categoryLabel}</span>
                          <span className="text-[#D9A2B5]" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-[#665860] tabular-nums">{ev.date}</span>
                          {ev.statusLabel && (
                            <>
                              <span className="text-[#D9A2B5]" aria-hidden="true">
                                ·
                              </span>
                              <StatusText label={ev.statusLabel} tone={ev.tone ?? 'neutral'} />
                            </>
                          )}
                          {ev.restricted && (
                            <span className="inline-flex items-center gap-1 text-[#665860]">
                              <Lock className="w-3 h-3" /> Restricted
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-[#30232A]">{ev.title}</p>
                        <p className="text-xs text-[#665860] leading-relaxed">{ev.summary}</p>
                        <p className="text-[11px] text-[#665860] tabular-nums">
                          Source: <span className="text-[#30232A]">{ev.source}</span>
                          {ev.metrics ? ` · ${ev.metrics}` : ''}
                        </p>
                      </div>
                      {ev.linkedSection && ev.linkedId && (
                        <button
                          type="button"
                          onClick={() => {
                            if (ev.linkedSection === 'alerts') {
                              setSelectedAlertId(ev.linkedId!);
                              setActiveSection('alerts');
                            } else if (ev.linkedSection === 'referrals') {
                              setSelectedReferralId(ev.linkedId!);
                              setActiveSection('referrals');
                            }
                          }}
                          className="px-2.5 py-1 text-xs font-medium bg-white border border-[#DDD8CB] hover:border-[#890149] text-[#30232A] rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Open
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="bg-white border border-[#DDD8CB] rounded-lg p-6">
              <h2 className="font-serif text-lg text-[#30232A]">
                Medical &amp; Obstetric History in JanmaSaathi
              </h2>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-[#665860]">Identified Risk Factors</p>
                  {mother.riskFactors.length === 0 ? (
                    <p className="mt-1 text-sm text-[#30232A]">
                      No high-risk obstetric flags recorded.
                    </p>
                  ) : (
                    <ul className="mt-1.5 list-disc list-inside space-y-1 text-sm text-[#30232A]">
                      {mother.riskFactors.map((rf) => (
                        <li key={rf}>{rf}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="pt-4 border-t border-[#EAE5D9]">
                  <p className="text-xs font-semibold text-[#665860]">Clinical &amp; Prior History</p>
                  {mother.medicalHistory.length === 0 ? (
                    <p className="mt-1 text-sm text-[#665860]">No medical history entries recorded.</p>
                  ) : (
                    <ul className="mt-1.5 list-disc list-inside space-y-1 text-sm text-[#30232A]">
                      {mother.medicalHistory.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="pt-4 border-t border-[#EAE5D9]">
                  <p className="text-xs font-semibold text-[#665860]">Documented Allergies</p>
                  <p className="mt-1 text-sm text-[#30232A]">
                    {mother.allergies.length > 0 ? mother.allergies.join(', ') : 'None recorded'}
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <section className="bg-white border border-[#DDD8CB] rounded-lg p-6">
              <h2 className="font-serif text-lg text-[#30232A]">
                Personal &amp; Pregnancy Details
              </h2>
              <dl className="mt-4 divide-y divide-[#EAE5D9] text-sm">
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-[#665860]">Mother ID</dt>
                  <dd className="font-medium text-[#30232A] tabular-nums">{mother.id}</dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-[#665860]">Age</dt>
                  <dd className="font-medium text-[#30232A] tabular-nums">
                    {mother.ageAuthorized
                      ? mother.age !== null
                        ? `${mother.age} years`
                        : '—'
                      : 'Restricted (Consent required)'}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-[#665860]">Contact</dt>
                  <dd className="font-medium text-[#30232A] tabular-nums">{mother.phoneMasked}</dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-[#665860]">Residence</dt>
                  <dd className="font-medium text-[#30232A] text-right">
                    {mother.villageOrWard}, {mother.block}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-[#665860]">Obstetric Score</dt>
                  <dd className="font-medium text-[#30232A] tabular-nums">{mother.gravidaPara}</dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-[#665860]">Blood Group</dt>
                  <dd className="font-medium text-[#30232A]">{mother.bloodGroup}</dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-[#665860]">LMP / EDD</dt>
                  <dd className="font-medium text-[#30232A] tabular-nums">
                    {mother.lmpDate} / {mother.eddDate}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-[#665860]">Registered Date</dt>
                  <dd className="font-medium text-[#30232A] tabular-nums">
                    {mother.registeredDate}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="bg-white border border-[#DDD8CB] rounded-lg p-6">
              <h2 className="font-serif text-lg text-[#30232A]">Assigned Health Worker</h2>
              {assignedWorker ? (
                <div className="mt-4 space-y-3 text-sm">
                  <div>
                    <p className="font-semibold text-[#30232A]">
                      {assignedWorker.name}
                      {assignedWorker.regionalName ? (
                        <span className="font-normal text-[#665860] ml-1.5">
                          ({assignedWorker.regionalName})
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-[#665860] mt-0.5">
                      {assignedWorker.cadre} · {assignedWorker.id}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-[#EAE5D9] space-y-1.5 text-xs text-[#665860]">
                    <p>
                      <span className="font-medium text-[#30232A]">Catchment:</span>{' '}
                      {assignedWorker.catchmentArea} ({assignedWorker.subCentre})
                    </p>
                    <p className="inline-flex items-center gap-1.5 tabular-nums">
                      <Phone className="w-3.5 h-3.5 text-[#890149]" />
                      <span className="font-medium text-[#30232A]">{assignedWorker.phone}</span>
                    </p>
                    <p className="tabular-nums">
                      <span className="font-medium text-[#30232A]">Last Field Sync:</span>{' '}
                      {assignedWorker.lastActiveDate}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-xs text-[#665860]">
                  {mother.assignedHealthWorkerName}{' '}
                  {mother.assignedHealthWorkerId ? `(${mother.assignedHealthWorkerId})` : ''}
                </p>
              )}
            </section>
          </div>
        </div>
      )}

      {/* TAB 2: Vitals & Symptoms */}
      {activeTab === 'vitals' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <section className="xl:col-span-6 bg-white border border-[#DDD8CB] rounded-lg p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                <div>
                  <h2 className="font-serif text-lg text-[#30232A]">
                    Blood Pressure Trajectory (mmHg)
                  </h2>
                  <p className="text-xs text-[#665860] mt-0.5 tabular-nums">
                    Recorded Systolic &amp; Diastolic readings ({bpChartData.length} record
                    {bpChartData.length === 1 ? '' : 's'})
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#665860]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-[#890149] inline-block" /> Systolic
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-[#30232A] inline-block" /> Diastolic
                  </span>
                </div>
              </div>
              {bpChartData.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-xs text-[#665860] border border-dashed border-[#DDD8CB] rounded-md px-4 text-center">
                  No structured blood pressure readings recorded in healthUpdates or assessments
                  yet.
                </div>
              ) : (
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={bpChartData}
                      margin={{ top: 10, right: 16, left: -12, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#EAE5D9" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#665860', fontSize: 12 }}
                        axisLine={{ stroke: '#DDD8CB' }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={['auto', 'auto']}
                        tick={{ fill: '#665860', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #DDD8CB',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="systolicBp"
                        name="Systolic (mmHg)"
                        stroke="#890149"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#890149' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="diastolicBp"
                        name="Diastolic (mmHg)"
                        stroke="#30232A"
                        strokeWidth={2}
                        dot={{ r: 3.5, fill: '#30232A' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="xl:col-span-6 bg-white border border-[#DDD8CB] rounded-lg p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                <div>
                  <h2 className="font-serif text-lg text-[#30232A]">
                    Blood Sugar Trajectory (mg/dL)
                  </h2>
                  <p className="text-xs text-[#665860] mt-0.5 tabular-nums">
                    Recorded blood glucose measurements ({glucoseChartData.length} record
                    {glucoseChartData.length === 1 ? '' : 's'})
                  </p>
                </div>
                <span className="text-xs text-[#665860]">mg/dL</span>
              </div>
              {glucoseChartData.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-xs text-[#665860] border border-dashed border-[#DDD8CB] rounded-md px-4 text-center">
                  No blood glucose readings recorded for this mother yet. Only actual database
                  records are plotted.
                </div>
              ) : (
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={glucoseChartData}
                      margin={{ top: 10, right: 16, left: -12, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#EAE5D9" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#665860', fontSize: 12 }}
                        axisLine={{ stroke: '#DDD8CB' }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={['auto', 'auto']}
                        tick={{ fill: '#665860', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #DDD8CB',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="bloodGlucose"
                        name="Blood Glucose (mg/dL)"
                        stroke="#890149"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#890149' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>

          <section className="bg-white border border-[#DDD8CB] rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EAE5D9]">
              <h2 className="font-serif text-lg text-[#30232A]">Recorded Clinical Vitals</h2>
              <p className="text-xs text-[#665860] mt-0.5">
                Factual measurements from JanmaSaathi records with recorder and source attribution
              </p>
            </div>
            {mother.vitalsHistory.length === 0 ? (
              <p className="p-6 text-sm text-[#665860]">No vitals entries recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#EAE5D9] bg-[#FBFBF7] text-xs font-medium text-[#665860]">
                      <th className="py-3 px-6">Date</th>
                      <th className="py-3 px-4">Blood Pressure</th>
                      <th className="py-3 px-4">Pulse</th>
                      <th className="py-3 px-4">Hemoglobin</th>
                      <th className="py-3 px-4">Weight</th>
                      <th className="py-3 px-4">Fetal HR</th>
                      <th className="py-3 px-4">Blood Sugar / SpO2</th>
                      <th className="py-3 px-6">Recorded By &amp; Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE5D9] text-[13px] tabular-nums">
                    {[...mother.vitalsHistory].reverse().map((v) => (
                      <tr key={v.id} className="hover:bg-[#F3F3E7]/50">
                        <td className="py-3 px-6 font-medium text-[#30232A]">{v.date}</td>
                        <td className="py-3 px-4 font-semibold text-[#30232A]">
                          {v.systolicBp > 0 ? `${v.systolicBp}/${v.diastolicBp} mmHg` : '—'}
                        </td>
                        <td className="py-3 px-4 text-[#30232A]">
                          {v.pulse ? `${v.pulse} bpm` : '—'}
                        </td>
                        <td className="py-3 px-4 font-medium text-[#30232A]">
                          {v.hemoglobin ? `${v.hemoglobin} g/dL` : '—'}
                        </td>
                        <td className="py-3 px-4 text-[#30232A]">
                          {v.weightKg ? `${v.weightKg} kg` : '—'}
                        </td>
                        <td className="py-3 px-4 text-[#30232A]">
                          {v.fetalHeartRate ? `${v.fetalHeartRate} bpm` : '—'}
                        </td>
                        <td className="py-3 px-4 text-xs text-[#665860]">
                          {v.bloodGlucose ? `${v.bloodGlucose} mg/dL` : ''}
                          {v.bloodGlucose && v.spo2 ? ' · ' : ''}
                          {v.spo2 ? `SpO2 ${v.spo2}%` : !v.bloodGlucose ? '—' : ''}
                        </td>
                        <td className="py-3 px-6 text-xs text-[#665860]">
                          <span className="text-[#30232A]">{v.recordedBy}</span> · {v.source}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="bg-white border border-[#DDD8CB] rounded-lg p-6">
            <h2 className="font-serif text-lg text-[#30232A]">Symptoms &amp; Daily Health Updates</h2>
            {mother.symptomLogs.length === 0 ? (
              <p className="mt-3 text-sm text-[#665860]">
                {appMode === 'demo'
                  ? 'No symptomatic daily health updates recorded in this demo fixture.'
                  : 'No symptomatic daily health updates found in Firestore.'}
              </p>
            ) : (
              <div className="mt-4 divide-y divide-[#EAE5D9]">
                {mother.symptomLogs.map((log) => (
                  <div key={log.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-[#30232A]">
                        {log.symptoms.join(' · ')}
                      </p>
                      <div className="text-xs text-[#665860] tabular-nums">
                        <StatusText
                          label={log.severity}
                          tone={
                            log.severity === 'Severe'
                              ? 'critical'
                              : log.severity === 'Moderate'
                              ? 'high'
                              : 'neutral'
                          }
                          className="text-xs mr-2"
                        />
                        <span>{log.date}</span>
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        <span>{log.reportedVia}</span>
                      </div>
                    </div>
                    {log.notes && (
                      <p className="mt-1 text-xs text-[#665860] leading-relaxed">{log.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 3: Assessment History */}
      {activeTab === 'assessments' && (
        <section className="bg-white border border-[#DDD8CB] rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-[#EAE5D9] flex items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-lg text-[#30232A]">Maternal Assessment History</h2>
              <p className="text-xs text-[#665860] mt-0.5">
                {appMode === 'demo'
                  ? 'Demo hospital OPD and community health worker evaluations'
                  : 'Live hospital OPD and community health worker evaluations'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNoteModalOpen(true)}
              className="px-3.5 py-2 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] text-white rounded-md cursor-pointer"
            >
              Add Hospital Note
            </button>
          </div>
          {motherAssessments.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#665860]">
              {appMode === 'demo'
                ? 'No assessments logged yet for this mother in the demo session.'
                : 'No assessments logged yet for this mother in Firestore.'}
            </div>
          ) : (
            <div className="divide-y divide-[#EAE5D9]">
              {motherAssessments.map((asm) => (
                <div key={asm.id} className="p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div>
                      <span className="text-sm font-semibold text-[#30232A]">
                        {asm.assessmentType}
                      </span>
                      <span className="mx-2 text-[#D9A2B5]" aria-hidden="true">·</span>
                      <span className="text-xs text-[#665860] tabular-nums">
                        {asm.gestationalWeek ? `Week ${asm.gestationalWeek} · ` : ''}
                        {asm.id}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs tabular-nums">
                      <StatusText
                        label={asm.riskClassification}
                        tone={toneForRisk(asm.riskClassification)}
                      />
                      <span className="text-[#665860]">{asm.date}</span>
                    </div>
                  </div>
                  <p className="mt-2.5 text-sm text-[#30232A] leading-relaxed">{asm.summary}</p>
                  <p className="mt-2 text-xs text-[#665860]">
                    <span className="font-semibold text-[#30232A]">Plan &amp; Recommendations:</span>{' '}
                    {asm.recommendations}
                  </p>
                  <p className="mt-2 text-xs text-[#665860] tabular-nums">
                    Vitals: BP {asm.bpReading}
                    {asm.hemoglobin ? ` · Hb ${asm.hemoglobin} g/dL` : ''} · Assessor:{' '}
                    {asm.assessorName} ({asm.assessorRole}, {asm.facilityOrLocation})
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 4: Alerts & Referrals */}
      {activeTab === 'alerts-referrals' && (
        <div className="space-y-6">
          <section className="bg-white border border-[#DDD8CB] rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EAE5D9]">
              <h2 className="font-serif text-lg text-[#30232A]">Emergency Alert History</h2>
            </div>
            {motherAlerts.length === 0 ? (
              <p className="p-6 text-sm text-[#665860]">
                No emergency alerts recorded for {mother.fullName}.
              </p>
            ) : (
              <div className="divide-y divide-[#EAE5D9]">
                {motherAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
                        <span className="font-semibold text-[#890149]">{alert.id}</span>
                        <span aria-hidden="true">·</span>
                        <StatusText label={alert.severity} tone={toneForAlertStatus(alert.severity)} />
                        <span aria-hidden="true">·</span>
                        <StatusText label={alert.status} tone={toneForAlertStatus(alert.status)} />
                        <span aria-hidden="true">·</span>
                        <span className="text-[#665860]">{alert.timestamp}</span>
                      </div>
                      <p className="mt-1.5 text-sm font-semibold text-[#30232A]">
                        {alert.triggerTitle}
                      </p>
                      <p className="mt-1 text-xs text-[#665860]">
                        Source: {alert.reportingSource}
                        {alert.symptoms.length > 0 ? ` · Symptoms: ${alert.symptoms.join(', ')}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAlertId(alert.id);
                        setActiveSection('alerts');
                      }}
                      className="px-3.5 py-2 text-xs font-medium bg-[#FBFBF7] border border-[#DDD8CB] hover:border-[#890149] text-[#30232A] rounded-md whitespace-nowrap cursor-pointer"
                    >
                      Inspect in Alert Centre
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white border border-[#DDD8CB] rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EAE5D9]">
              <h2 className="font-serif text-lg text-[#30232A]">Hospital Referrals</h2>
            </div>
            {motherReferrals.length === 0 ? (
              <p className="p-6 text-sm text-[#665860]">No referrals recorded for this mother.</p>
            ) : (
              <div className="divide-y divide-[#EAE5D9]">
                {motherReferrals.map((ref) => (
                  <div
                    key={ref.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
                        <span className="font-semibold text-[#890149]">{ref.id}</span>
                        <span aria-hidden="true">·</span>
                        <StatusText label={ref.status} tone={toneForReferralStatus(ref.status)} />
                        <span aria-hidden="true">·</span>
                        <span className="text-[#665860]">{ref.referralDate}</span>
                      </div>
                      <p className="mt-1.5 text-sm font-semibold text-[#30232A]">{ref.reason}</p>
                      <p className="mt-1 text-xs text-[#665860]">
                        {ref.sourceFacility} → {ref.destinationHospital} ({ref.destinationDepartment})
                      </p>
                      <p className="mt-1 text-xs text-[#665860]">Follow-up: {ref.followUpDetails}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReferralId(ref.id);
                        setActiveSection('referrals');
                      }}
                      className="px-3.5 py-2 text-xs font-medium bg-[#FBFBF7] border border-[#DDD8CB] hover:border-[#890149] text-[#30232A] rounded-md whitespace-nowrap cursor-pointer"
                    >
                      Manage Referral
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 5: Appointments & Clinical Documents */}
      {activeTab === 'appointments-docs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-6 bg-white border border-[#DDD8CB] rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EAE5D9]">
              <h2 className="font-serif text-lg text-[#30232A]">Appointments &amp; Follow-ups</h2>
            </div>
            {motherAppointments.length === 0 ? (
              <p className="p-6 text-sm text-[#665860]">No scheduled hospital appointments.</p>
            ) : (
              <div className="divide-y divide-[#EAE5D9]">
                {motherAppointments.map((apt) => (
                  <div key={apt.id} className="p-5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-[#30232A]">{apt.appointmentType}</p>
                      <StatusText
                        label={apt.status}
                        tone={toneForAppointmentStatus(apt.status)}
                      />
                    </div>
                    <p className="mt-1 text-xs text-[#665860] tabular-nums">
                      {apt.scheduledDate} at {apt.scheduledTime} · {apt.department}
                    </p>
                    <p className="mt-1 text-xs text-[#665860]">
                      Clinician: {apt.clinician} · {apt.notes}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="lg:col-span-6 bg-white border border-[#DDD8CB] rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EAE5D9]">
              <h2 className="font-serif text-lg text-[#30232A]">
                Clinical Reports &amp; Documents
              </h2>
              <p className="text-xs text-[#665860] mt-0.5">
                Access governed by JanmaSaathi patient consent authorization
              </p>
            </div>
            {mother.documents.length === 0 ? (
              <p className="p-6 text-sm text-[#665860]">No uploaded clinical documents.</p>
            ) : (
              <div className="divide-y divide-[#EAE5D9]">
                {mother.documents.map((doc) => (
                  <div key={doc.id} className="p-5 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {doc.authorized ? (
                          <FileText className="w-4 h-4 text-[#890149] shrink-0" />
                        ) : (
                          <Lock className="w-4 h-4 text-[#665860] shrink-0" />
                        )}
                        <p className="text-sm font-semibold text-[#30232A] truncate">
                          {doc.title}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-[#665860] tabular-nums">
                        {doc.category} · {doc.date} · {doc.uploadedBy} · {doc.fileSize}
                      </p>
                      <p className="mt-1.5 text-xs text-[#665860] leading-relaxed">
                        {doc.authorized ? doc.summary : doc.authorizationNote}
                      </p>
                    </div>
                    {doc.authorized ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewDocId(doc.id);
                          void logAuditAction(
                            'Record Access',
                            `Viewed Clinical Document (${doc.title})`,
                            `${mother.id} (${mother.fullName})`,
                            'Authorized Clinical Document Access'
                          );
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-[#890149] border border-[#D9A2B5] hover:bg-[#F7EDF2] rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        View Report
                      </button>
                    ) : (
                      <span className="text-xs text-[#665860] whitespace-nowrap shrink-0">
                        Restricted
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Add Clinical Assessment Modal */}
      <ModalDialog
        open={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        title="Record Hospital Clinical Assessment"
        subtitle={`${mother.fullName} (${mother.id}) · ${
          appMode === 'demo' ? 'Saved locally in Demo Mode' : 'Writes to Firestore assessments'
        }`}
      >
        <form onSubmit={handleSaveAssessment} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#30232A] mb-1">
                Assessment Type
              </label>
              <select
                value={asmType}
                onChange={(e) =>
                  setAsmType(e.target.value as AssessmentRecord['assessmentType'])
                }
                className="w-full px-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md focus:outline-none focus:border-[#890149]"
              >
                <option value="ANC Routine">ANC Routine</option>
                <option value="High-Risk Review">High-Risk Review</option>
                <option value="Emergency Triage">Emergency Triage</option>
                <option value="Postnatal Review">Postnatal Review</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#30232A] mb-1">
                Risk Classification
              </label>
              <select
                value={asmRisk}
                onChange={(e) => setAsmRisk(e.target.value as RiskLevel)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md focus:outline-none focus:border-[#890149]"
              >
                <option value="Routine">Routine</option>
                <option value="Moderate">Moderate</option>
                <option value="High Priority">High Priority</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#30232A] mb-1">
                Blood Pressure (mmHg)
              </label>
              <input
                type="text"
                value={asmBp}
                onChange={(e) => setAsmBp(e.target.value)}
                placeholder="128/82"
                required
                className="w-full px-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md tabular-nums focus:outline-none focus:border-[#890149]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#30232A] mb-1">
                Hemoglobin (g/dL)
              </label>
              <input
                type="number"
                step="0.1"
                value={asmHb}
                onChange={(e) => setAsmHb(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md tabular-nums focus:outline-none focus:border-[#890149]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#30232A] mb-1">
              Clinical Findings Summary
            </label>
            <textarea
              rows={3}
              required
              value={asmSummary}
              onChange={(e) => setAsmSummary(e.target.value)}
              placeholder="Document examination findings, fetal heart rate, edema, or lab review..."
              className="w-full px-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md focus:outline-none focus:border-[#890149]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#30232A] mb-1">
              Recommendations &amp; Care Plan
            </label>
            <textarea
              rows={2}
              value={asmRec}
              onChange={(e) => setAsmRec(e.target.value)}
              placeholder="Medication adjustments, next scan date, or admission instructions..."
              className="w-full px-3 py-2 text-sm bg-white border border-[#DDD8CB] rounded-md focus:outline-none focus:border-[#890149]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setNoteModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-[#665860] hover:text-[#30232A] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingNote}
              className="px-4 py-2 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] disabled:opacity-60 text-white rounded-md cursor-pointer"
            >
              {savingNote ? 'Saving...' : 'Save Assessment Note'}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Authorized Clinical Document Preview Modal */}
      <ModalDialog
        open={Boolean(previewDoc)}
        onClose={() => setPreviewDocId(null)}
        title={previewDoc?.title ?? 'Clinical Document'}
        subtitle={
          previewDoc
            ? `${previewDoc.category} · ${previewDoc.date} · Uploaded by ${previewDoc.uploadedBy}`
            : undefined
        }
      >
        {previewDoc && (
          <div className="space-y-4">
            <div className="p-4 bg-[#FBFBF7] border border-[#DDD8CB] rounded-md text-sm text-[#30232A] leading-relaxed">
              <p className="text-xs font-semibold text-[#890149] mb-1.5">
                Authorized Clinical Summary
              </p>
              <p>{previewDoc.summary}</p>
            </div>
            <div className="text-xs text-[#665860] flex items-center justify-between">
              <span>Mother: {mother.fullName} ({mother.id})</span>
              <span className="tabular-nums">Size: {previewDoc.fileSize}</span>
            </div>
            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPreviewDocId(null)}
                className="px-4 py-2 text-xs font-medium text-[#665860] hover:text-[#30232A] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob(
                    [
                      `JANMASAATHI CLINICAL DOCUMENT SUMMARY\n\nTitle: ${previewDoc.title}\nCategory: ${previewDoc.category}\nMother: ${mother.fullName} (${mother.id})\nDate: ${previewDoc.date}\nUploaded By: ${previewDoc.uploadedBy}\n\nSummary:\n${previewDoc.summary}\n`,
                    ],
                    { type: 'text/plain;charset=utf-8' }
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${mother.id}-${previewDoc.id}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] text-white rounded-md cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Summary</span>
              </button>
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  );
};
