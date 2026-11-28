"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  getStoredAlerts, 
  getStoredHospitals, 
  claimAlertTask, 
  markAlertArrived, 
  closeAlertCase, 
  rejectAlertCase, 
  createNewEmergencyAlert,
  EmergencyAlert, 
  Hospital 
} from "@/lib/data/mockStore";
import { 
  Activity, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  UserCheck, 
  Building2, 
  Phone, 
  MapPin, 
  Volume2, 
  VolumeX, 
  PlusCircle, 
  X, 
  ArrowRight, 
  HelpCircle, 
  Check, 
  Flame, 
  RefreshCw,
  ExternalLink
} from "lucide-react";

export default function HospitalInboxPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("hosp-aiims-bbsr");
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [staffName, setStaffName] = useState<string>("Nurse Sunita R. (Charge Nurse)");
  const [activeTab, setActiveTab] = useState<"active" | "closed">("active");
  
  // Rejection modal state
  const [rejectModalAlertId, setRejectModalAlertId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("All resuscitation bays currently occupied");

  // Timer tick for live escalation countdown
  const [now, setNow] = useState<number>(Date.now());

  // Audio chime helper using Web Audio API
  const playAlertChime = () => {
    if (!audioEnabled || typeof window === "undefined") return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio autoplay blocked or unsupported
    }
  };

  const loadData = () => {
    const storedHospitals = getStoredHospitals();
    setHospitals(storedHospitals);
    const storedAlerts = getStoredAlerts();
    setAlerts(storedAlerts);
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(() => setNow(Date.now()), 1000);

    const handleUpdate = () => loadData();
    window.addEventListener("goldenhour_store_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      clearInterval(timer);
      window.removeEventListener("goldenhour_store_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const activeHospital = hospitals.find(h => h.id === selectedHospitalId) || hospitals[0];

  // Filter alerts for the selected hospital (or show all if needed)
  const hospitalAlerts = alerts.filter(a => a.hospitalId === selectedHospitalId);
  const activeAlerts = hospitalAlerts.filter(a => a.status === "REQUEST_RECEIVED" || a.status === "HOSPITAL_PREPARING" || a.status === "ARRIVED");
  const closedAlerts = hospitalAlerts.filter(a => a.status === "COMPLETED" || a.status === "REJECTED");

  // Handlers
  const handleClaim = (alertId: string, taskId: string) => {
    const success = claimAlertTask(alertId, taskId, staffName);
    if (success) {
      loadData();
    }
  };

  const handleMarkArrived = (alertId: string) => {
    const success = markAlertArrived(alertId);
    if (success) {
      loadData();
    }
  };

  const handleClose = (alertId: string) => {
    const success = closeAlertCase(alertId);
    if (success) {
      loadData();
    }
  };

  const handleConfirmReject = () => {
    if (rejectModalAlertId) {
      rejectAlertCase(rejectModalAlertId, rejectReason);
      setRejectModalAlertId(null);
      loadData();
    }
  };

  // Simulate a test inbound alert
  const handleSimulateInbound = () => {
    const categories = ["Chest Pain", "Stroke Symptoms", "Serious Bleeding", "Severe Breathing", "Not Sure / Other Emergency"] as const;
    const randomCat = categories[Math.floor(Math.random() * categories.length)];
    createNewEmergencyAlert({
      category: randomCat,
      customDescription: randomCat === "Not Sure / Other Emergency" ? "Severe upper abdominal tenderness, dizziness, clammy skin" : undefined,
      patientLocation: "Jayadev Vihar Overbridge, Bhubaneswar",
      hospitalId: selectedHospitalId,
    });
    loadData();
    playAlertChime();
  };

  // Helper to calculate escalation state (PRD Section 8.2)
  const getEscalationStatus = (alert: EmergencyAlert) => {
    const elapsedSeconds = Math.max(0, Math.floor((now - alert.createdTimestamp) / 1000));
    const pendingTasks = alert.preparationTasks.filter(t => t.status === "Pending").length;
    const allClaimed = pendingTasks === 0;

    if (alert.status === "ARRIVED") {
      return {
        label: "Patient Arrived (At Reception)",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300",
        elapsedSeconds,
        stage: "arrived" as const,
      };
    }

    if (allClaimed) {
      return {
        label: "All 4 Protocols Claimed • Team Standing By",
        badgeClass: "bg-sky-50 text-[#3B62AB] border-[#3B62AB]/30",
        elapsedSeconds,
        stage: "prepared" as const,
      };
    }

    if (elapsedSeconds >= 180) {
      return {
        label: `Critical Escalation (${elapsedSeconds}s) • ER Lead Urgent Page`,
        badgeClass: "bg-rose-100 text-rose-800 border-rose-300 animate-pulse font-bold",
        elapsedSeconds,
        stage: "urgent" as const,
      };
    }

    if (elapsedSeconds >= 90) {
      return {
        label: `Duty Lead Escalated (${elapsedSeconds}s) • ${pendingTasks} Tasks Unclaimed`,
        badgeClass: "bg-amber-100 text-amber-900 border-amber-300 font-bold",
        elapsedSeconds,
        stage: "amber" as const,
      };
    }

    if (elapsedSeconds >= 40) {
      return {
        label: `Triage Review (${elapsedSeconds}s) • ${pendingTasks} Tasks Pending`,
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
        elapsedSeconds,
        stage: "warning" as const,
      };
    }

    return {
      label: `New Inbound Alert (${elapsedSeconds}s elapsed) • Triage Active`,
      badgeClass: "bg-blue-50 text-[#3B62AB] border-blue-200",
      elapsedSeconds,
      stage: "normal" as const,
    };
  };

  return (
    <div className="min-h-screen bg-[#FFF6F2] py-8 text-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Top Control Bar */}
        <div className="bg-white rounded-3xl p-6 border border-[#F3E5DD] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#3B62AB] text-white">
                <Activity className="w-3.5 h-3.5" />
                Hospital Emergency Console
              </span>
              <span className="text-xs text-slate-500 hidden sm:inline">
                Real-time Inbound Patient Pre-Arrival Management
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1A2433]">
              {activeHospital?.shortName || "Hospital"} Emergency Room
            </h1>
            <p className="text-xs text-slate-600 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#3B62AB]" />
              <span>{activeHospital?.address}</span>
              <span>•</span>
              <Phone className="w-3.5 h-3.5 text-[#3B62AB]" />
              <span>{activeHospital?.emergencyPhone}</span>
            </p>
          </div>

          {/* Controls: Hospital Selector & Staff Role */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Switch Hospital
              </label>
              <select
                value={selectedHospitalId}
                onChange={(e) => setSelectedHospitalId(e.target.value)}
                className="text-xs font-semibold px-3 py-2 rounded-xl border border-[#F3E5DD] bg-[#FFF6F2] text-[#1A2433] focus:ring-2 focus:ring-[#3B62AB] focus:outline-none"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.shortName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Logged in as (Staff Role)
              </label>
              <select
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className="text-xs font-semibold px-3 py-2 rounded-xl border border-[#F3E5DD] bg-[#FFF6F2] text-[#1A2433] focus:ring-2 focus:ring-[#3B62AB] focus:outline-none"
              >
                <option value="Nurse Sunita R. (Charge Nurse)">Nurse Sunita R. (Charge Nurse)</option>
                <option value="Dr. P. Mohanty (Cardiology Lead)">Dr. P. Mohanty (Cardiology Lead)</option>
                <option value="Dr. A. Nayak (ER Resident)">Dr. A. Nayak (ER Resident)</option>
                <option value="Radiology Tech Kumar (CT/MRI)">Radiology Tech Kumar (CT/MRI)</option>
                <option value="Staff Officer Bikash (Triage)">Staff Officer Bikash (Triage)</option>
              </select>
            </div>

            <div className="flex items-end gap-2 pt-4 md:pt-0">
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                title={audioEnabled ? "Audio Alert Active" : "Audio Alert Muted"}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  audioEnabled
                    ? "bg-[#DAE9C6] text-[#2C471E] border-[#B8CE9E]"
                    : "bg-slate-100 text-slate-500 border-slate-300"
                }`}
              >
                {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                onClick={handleSimulateInbound}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#3B62AB] hover:bg-[#2C4C87] text-white shadow-sm transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Simulate Inbound</span>
              </button>
            </div>
          </div>
        </div>

        {/* Operational Stats Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-[#F3E5DD] shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Active Inbound Cases
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-black text-[#1A2433]">{activeAlerts.length}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#F3E5DD] shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Receiving Status
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                {activeHospital?.status === "accepting" ? "Accepting All" : activeHospital?.status === "limited" ? "Limited" : "Divert"}
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#F3E5DD] shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Target Claim SLA
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-bold text-[#1A2433]">&lt; 90 seconds</span>
              <span className="text-[10px] text-slate-500">Duty Lead Escalation</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#F3E5DD] shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Shift Completed Handouts
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-black text-[#3B62AB]">{closedAlerts.length}</span>
              <span className="text-xs text-slate-500">Cases</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher: Active Pre-Arrivals vs Closed History */}
        <div className="flex items-center justify-between border-b border-[#F3E5DD] pb-2">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("active")}
              className={`pb-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "active"
                  ? "border-[#3B62AB] text-[#3B62AB]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>Active Incoming Pre-Arrivals</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-[#DAE9C6] text-[#2C471E]">
                {activeAlerts.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("closed")}
              className={`pb-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "closed"
                  ? "border-[#3B62AB] text-[#3B62AB]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>Recent Completed / History</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                {closedAlerts.length}
              </span>
            </button>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-[#3B62AB] animate-spin" />
            <span>Realtime Auto-Syncing</span>
          </div>
        </div>

        {/* ACTIVE ALERTS QUEUE */}
        {activeTab === "active" && (
          <div className="space-y-6">
            {activeAlerts.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-[#F3E5DD] space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#DAE9C6] text-[#2C471E] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#1A2433]">No Incoming Emergencies Pending</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Emergency receiving bays are prepped and on standby. When a patient or family member dispatches a pre-arrival alert, it will sound here immediately with 4 actionable preparation tasks.
                </p>
                <button
                  onClick={handleSimulateInbound}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-[#3B62AB] hover:bg-[#2C4C87]"
                >
                  Simulate New Inbound Emergency Alert
                </button>
              </div>
            ) : (
              activeAlerts.map((alert) => {
                const escalation = getEscalationStatus(alert);
                const isArrived = alert.status === "ARRIVED";

                return (
                  <div 
                    key={alert.id}
                    className="bg-white rounded-3xl p-6 sm:p-7 border border-[#F3E5DD] shadow-sm space-y-6 transition-all"
                  >
                    {/* Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F3E5DD] pb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl p-2 rounded-2xl bg-[#FFF6F2] border border-[#F3E5DD]">
                          {alert.categoryIcon}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#3B62AB] bg-[#DAE9C6] px-2 py-0.5 rounded">
                              {alert.id}
                            </span>
                            <span className="text-xs text-slate-500">• {alert.createdAt}</span>
                          </div>
                          <h2 className="text-xl font-bold text-[#1A2433] mt-0.5">
                            {alert.category}
                          </h2>
                        </div>
                      </div>

                      {/* Escalation SLA Indicator */}
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${escalation.badgeClass}`}>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{escalation.label}</span>
                        </span>
                      </div>
                    </div>

                    {/* Meta: Origin & ETA */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#FFF6F2] p-4 rounded-2xl text-xs">
                      <div>
                        <span className="text-slate-500 uppercase font-bold text-[10px] block">
                          Patient Origin Landmark
                        </span>
                        <span className="font-semibold text-slate-900 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-[#3B62AB]" />
                          {alert.patientLocation}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-500 uppercase font-bold text-[10px] block">
                          Travel Estimate (ETA)
                        </span>
                        <span className="font-bold text-[#3B62AB] flex items-center gap-1 mt-0.5 text-sm">
                          <Clock className="w-3.5 h-3.5" />
                          {alert.etaMinutes}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-500 uppercase font-bold text-[10px] block">
                          Current Case Status
                        </span>
                        <span className="font-bold text-slate-900 mt-0.5 block">
                          {alert.statusText}
                        </span>
                      </div>
                    </div>

                    {/* Custom Description if Provided */}
                    {alert.customDescription && (
                      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs space-y-1">
                        <span className="font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                          <HelpCircle className="w-4 h-4 text-amber-700" />
                          Patient / Family Custom Symptoms Note:
                        </span>
                        <p className="text-amber-950 font-medium leading-relaxed pl-5">
                          &quot;{alert.customDescription}&quot;
                        </p>
                      </div>
                    )}

                    {/* SECTION B: 4 Preparation Tasks with One-Tap Claiming (PRD 7.2 B & 7.3 H-04, H-05) */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-[#3B62AB]" />
                          Pre-Arrival Preparation Checklist (4 Configurable Protocols)
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          {alert.preparationTasks.filter(t => t.status === "Claimed").length} of 4 Claimed
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {alert.preparationTasks.map((task) => {
                          const isClaimed = task.status === "Claimed";

                          return (
                            <div 
                              key={task.id}
                              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                                isClaimed 
                                  ? "bg-emerald-50/60 border-emerald-200" 
                                  : "bg-white border-[#F3E5DD] hover:border-[#3B62AB]/50"
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                    {task.role}
                                  </span>
                                  {isClaimed ? (
                                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                      Claimed
                                    </span>
                                  ) : (
                                    <span className="text-amber-700 font-bold">Pending</span>
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-slate-900 leading-snug">
                                  {task.title}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                {isClaimed ? (
                                  <span className="text-[11px] text-emerald-800 font-medium">
                                    Claimed by: <strong>{task.claimedBy}</strong>
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleClaim(alert.id, task.id)}
                                    className="w-full py-1.5 px-3 rounded-xl text-xs font-bold text-white bg-[#3B62AB] hover:bg-[#2C4C87] shadow-xs transition-all flex items-center justify-center gap-1"
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span>One-Tap Claim as {staffName.split(" ")[0]}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action Bar (Arrive, Close, Divert) */}
                    <div className="pt-4 border-t border-[#F3E5DD] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/track?id=${alert.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs text-[#3B62AB] hover:underline font-bold"
                        >
                          <span>Open Patient View</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {!isArrived && (
                          <button
                            onClick={() => handleMarkArrived(alert.id)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Mark Patient Arrived at ED</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleClose(alert.id)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-[#1A2433] bg-[#DAE9C6] hover:bg-[#c2d7a7] border border-[#B8CE9E] transition-all flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>Close Case & Admitted</span>
                        </button>

                        <button
                          onClick={() => setRejectModalAlertId(alert.id)}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all"
                        >
                          Divert / Reject
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        )}

        {/* CLOSED / COMPLETED CASES TAB */}
        {activeTab === "closed" && (
          <div className="space-y-4">
            {closedAlerts.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-[#F3E5DD] text-xs text-slate-500">
                No closed emergency cases recorded for this shift yet.
              </div>
            ) : (
              closedAlerts.map((alert) => (
                <div 
                  key={alert.id}
                  className="bg-white rounded-2xl p-5 border border-[#F3E5DD] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2 rounded-xl bg-slate-50 border border-slate-200">
                      {alert.categoryIcon}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {alert.id}
                        </span>
                        <span className="text-xs text-slate-400">• Created: {alert.createdAt}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                        {alert.category}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {alert.patientLocation}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Closure Status
                      </span>
                      <span className={`font-bold ${alert.status === "COMPLETED" ? "text-emerald-700" : "text-rose-700"}`}>
                        {alert.status === "COMPLETED" ? "Admitted & Closed" : "Diverted / Rejected"}
                      </span>
                    </div>

                    {alert.closedAt && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Closed At
                        </span>
                        <span className="font-medium text-slate-700">
                          {alert.closedAt}
                        </span>
                      </div>
                    )}

                    <Link
                      href={`/track?id=${alert.id}`}
                      target="_blank"
                      className="px-3 py-1.5 rounded-lg border border-[#F3E5DD] text-slate-700 hover:bg-[#FFF6F2] font-semibold text-xs flex items-center gap-1"
                    >
                      Audit View
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* Reject / Divert Reason Modal */}
      {rejectModalAlertId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#F3E5DD] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#F3E5DD] pb-3">
              <h3 className="text-base font-bold text-[#1A2433] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Divert / Reject Emergency Notice
              </h3>
              <button 
                onClick={() => setRejectModalAlertId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              In accordance with PRD Section 7.3 (H-09), rejecting or diverting an inbound pre-arrival notice requires documenting an operational justification so the family is immediately notified to proceed to an alternative facility.
            </p>

            <div>
              <label className="block text-xs font-bold text-[#1A2433] mb-1 uppercase tracking-wide">
                Select Operational Divert Reason
              </label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full text-xs font-semibold p-3 rounded-xl border border-[#F3E5DD] bg-[#FFF6F2] focus:outline-none focus:ring-2 focus:ring-[#3B62AB]"
              >
                <option value="All resuscitation bays currently occupied with critical polytrauma">
                  All resuscitation bays currently occupied with critical polytrauma
                </option>
                <option value="Cardiac Catheterization Lab at full capacity / emergency procedure in progress">
                  Cardiac Catheterization Lab at full capacity / emergency procedure in progress
                </option>
                <option value="CT Scanner temporarily offline for maintenance">
                  CT Scanner temporarily offline for maintenance
                </option>
                <option value="ICU ventilators temporarily at maximum capacity">
                  ICU ventilators temporarily at maximum capacity
                </option>
                <option value="Mass casualty incident protocol activated">
                  Mass casualty incident protocol activated
                </option>
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModalAlertId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm"
              >
                Confirm Divert & Notify Family
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
