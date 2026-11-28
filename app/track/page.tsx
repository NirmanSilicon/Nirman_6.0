"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  getStoredAlerts, 
  getStoredAlertById, 
  EmergencyAlert 
} from "@/lib/data/mockStore";
import { 
  Phone, 
  Search, 
  Clock, 
  CheckCircle2, 
  Building2, 
  ArrowUpRight, 
  ShieldCheck, 
  MapPin, 
  Activity, 
  Check, 
  HelpCircle,
  ExternalLink,
  AlertTriangle,
  RefreshCw
} from "lucide-react";

function TrackEmergencyContent() {
  const searchParams = useSearchParams();
  const urlId = searchParams.get("id") || "GH-2026-X84";

  const [requestId, setRequestId] = useState(urlId);
  const [activeAlert, setActiveAlert] = useState<EmergencyAlert | null>(null);

  const refreshAlert = (idToSearch: string) => {
    const found = getStoredAlertById(idToSearch);
    if (found) {
      setActiveAlert(found);
    } else {
      const all = getStoredAlerts();
      const fallback = all.find(a => a.id.toLowerCase() === idToSearch.toLowerCase());
      setActiveAlert(fallback || null);
    }
  };

  useEffect(() => {
    setRequestId(urlId);
    refreshAlert(urlId);

    const handleUpdate = () => refreshAlert(requestId);
    window.addEventListener("goldenhour_store_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("goldenhour_store_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [urlId, requestId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refreshAlert(requestId);
  };

  return (
    <div className="py-12 bg-[#FFF6F2] min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#3B62AB]">
              PATIENT LIVE TRACKING
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1A2433] mt-1 tracking-tight">
              Track Your Pre-Arrival Request
            </h1>
            <p className="text-slate-700 text-sm mt-1">
              See what the receiving hospital emergency department has prepared for your arrival.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/hospital/inbox"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold text-[#3B62AB] bg-white border border-[#3B62AB]/30 hover:bg-[#DAE9C6] transition-all shadow-xs"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Hospital ER Console</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            <a
              href="tel:112"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider text-white bg-[#3B62AB] hover:bg-[#2C4C87] shadow-md shadow-[#3B62AB]/20 transition-all hover:scale-105"
            >
              <Phone className="w-3.5 h-3.5 fill-current" />
              <span>Call 112</span>
            </a>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#F3E5DD] shadow-sm">
          <form onSubmit={handleSearch} className="space-y-3">
            <label className="text-xs font-bold text-[#1A2433] uppercase tracking-wider block">
              Enter Your Request ID
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={requestId}
                onChange={(e) => setRequestId(e.target.value)}
                placeholder="e.g. GH-2026-X84"
                className="flex-1 px-4 py-3 rounded-2xl border border-[#F3E5DD] focus:outline-none focus:ring-2 focus:ring-[#3B62AB] font-mono text-sm uppercase text-[#1A2433] bg-[#FFF6F2]"
              />
              <button
                type="submit"
                className="px-7 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider text-white bg-[#3B62AB] hover:bg-[#2C4C87] shadow-md transition-all"
              >
                Track Status
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-1">
              <span>Quick demo requests:</span>
              <button
                type="button"
                onClick={() => { setRequestId("GH-2026-X84"); refreshAlert("GH-2026-X84"); }}
                className="font-mono text-[#3B62AB] hover:underline font-bold"
              >
                GH-2026-X84 (Chest Pain)
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => { setRequestId("GH-2026-NS42"); refreshAlert("GH-2026-NS42"); }}
                className="font-mono text-[#3B62AB] hover:underline font-bold"
              >
                GH-2026-NS42 (Not Sure / Description)
              </button>
            </div>
          </form>
        </div>

        {/* What Patient Sees: Tracking Card */}
        {activeAlert ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F3E5DD] shadow-sm space-y-7">
            
            {/* Header Meta */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#F3E5DD]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-700 bg-[#FFF6F2] px-2.5 py-0.5 rounded border border-[#F3E5DD]">
                    ID: {activeAlert.id}
                  </span>
                  <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#DAE9C6] text-[#2C471E] border border-[#B8CE9E]">
                    {activeAlert.categoryIcon} {activeAlert.category}
                  </span>
                </div>
                <h2 className="text-2xl font-serif font-bold text-[#1A2433] mt-2">
                  Destination: {activeAlert.hospitalName}
                </h2>
                <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#3B62AB]" />
                  <span>{activeAlert.hospitalAddress}</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Origin: <strong>{activeAlert.patientLocation}</strong>
                </p>
              </div>

              {/* Status Badge */}
              <div className="text-right">
                <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  activeAlert.status === "COMPLETED"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : activeAlert.status === "ARRIVED"
                    ? "bg-blue-50 text-blue-800 border-blue-300"
                    : activeAlert.status === "REJECTED"
                    ? "bg-rose-50 text-rose-800 border-rose-300"
                    : "bg-[#DAE9C6] text-[#2C471E] border-[#B8CE9E]"
                }`}>
                  <span className="w-2 h-2 rounded-full bg-[#3B62AB] animate-pulse" />
                  {activeAlert.status === "COMPLETED" 
                    ? "Admitted & Closed" 
                    : activeAlert.status === "ARRIVED"
                    ? "Patient Arrived at ED"
                    : activeAlert.status === "REJECTED"
                    ? "Diverted by Hospital"
                    : "Hospital Preparing"}
                </span>
                <span className="block text-[11px] text-slate-500 mt-1 font-mono">
                  ETA: {activeAlert.etaMinutes} travel time
                </span>
              </div>
            </div>

            {/* Rejection / Divert notice if any */}
            {activeAlert.status === "REJECTED" && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Hospital Diversion Notice:</span>
                </div>
                <p className="text-rose-800 font-medium">
                  {activeAlert.rejectionReason || "Emergency department currently at maximum capacity. Please proceed to an alternative facility or call 112 for urgent rerouting."}
                </p>
              </div>
            )}

            {/* Custom Description Callout if this was a "Not Sure" option */}
            {activeAlert.customDescription && (
              <div className="p-4 rounded-2xl bg-[#FFF6F2] border border-[#F3E5DD] text-xs text-[#1A2433] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#3B62AB]">
                  <HelpCircle className="w-4 h-4 text-[#3B62AB]" />
                  <span>Your Symptoms Description Sent to Hospital:</span>
                </div>
                <p className="text-slate-700 italic">
                  &ldquo;{activeAlert.customDescription}&rdquo;
                </p>
              </div>
            )}

            {/* Preparation Protocols Checklist */}
            {activeAlert.preparationTasks && activeAlert.preparationTasks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    Hospital Preparation Protocols (Real-Time Staff Claims)
                  </span>
                  <span className="text-[11px] font-bold text-[#3B62AB]">
                    {activeAlert.preparationTasks.filter(t => t.status === "Claimed").length} of 4 Claimed
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeAlert.preparationTasks.map((task) => {
                    const isClaimed = task.status === "Claimed";
                    return (
                      <div
                        key={task.id}
                        className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 ${
                          isClaimed 
                            ? "bg-emerald-50/70 border-emerald-200" 
                            : "bg-[#FFF6F2] border-[#F3E5DD]"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {task.role}
                          </span>
                          <p className="font-semibold text-slate-900 leading-tight">
                            {task.title}
                          </p>
                          {isClaimed && (
                            <span className="text-[10px] text-emerald-800 font-medium block">
                              Claimed by: {task.claimedBy}
                            </span>
                          )}
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          isClaimed 
                            ? "bg-emerald-600 text-white" 
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          {isClaimed ? "Claimed" : "Standby"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Progress Stepper for Patient */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                Activity Log & Timeline
              </span>

              <div className="space-y-2.5">
                {activeAlert.preparationUpdates.map((update, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-[#F3E5DD] bg-[#FFF6F2] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${
                        update.status === "Completed"
                          ? "bg-[#3B62AB]"
                          : "bg-[#3B62AB] animate-ping"
                      }`} />
                      <span className="font-bold text-[#1A2433]">{update.title}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-500 font-mono">{update.time}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        update.status === "Completed"
                          ? "bg-[#DAE9C6] text-[#2C471E]"
                          : "bg-[#3B62AB] text-white"
                      }`}>
                        {update.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hospital Direct Contact */}
            <div className="p-5 rounded-2xl bg-[#FFF6F2] border border-[#F3E5DD] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 text-[#1A2433]">
                <div className="w-9 h-9 rounded-xl bg-[#3B62AB] text-white flex items-center justify-center font-bold">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block">Hospital Emergency Desk:</span>
                  <span className="font-mono font-black text-base text-[#3B62AB]">{activeAlert.hospitalPhone}</span>
                </div>
              </div>

              <a
                href={`tel:${activeAlert.hospitalPhone}`}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#3B62AB] hover:bg-[#2C4C87] text-center shadow-xs"
              >
                Call Hospital Directly
              </a>
            </div>

            {/* Next Steps for Patient */}
            <div className="p-4 rounded-2xl bg-white border border-[#F3E5DD] text-xs text-slate-600 space-y-1">
              <span className="font-bold text-[#1A2433] block">What to do upon arrival:</span>
              <p>Proceed directly to the main Emergency Receiving Ramp at {activeAlert.hospitalName}. Give the triage staff your Case ID (<strong className="font-mono text-[#3B62AB]">{activeAlert.id}</strong>) for immediate handover without paperwork delay.</p>
            </div>

          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#F3E5DD] shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF6F2] text-slate-400 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6 text-[#3B62AB]" />
            </div>
            <h3 className="text-xl font-serif font-bold text-[#1A2433]">
              No matching request found with ID &quot;{requestId}&quot;
            </h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Please check your request ID or raise a new pre-arrival notice.
            </p>
            <div className="pt-2">
              <Link
                href="/start"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider text-white bg-[#3B62AB] hover:bg-[#2C4C87] shadow-sm"
              >
                <span>Send Pre-Arrival Notice</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function TrackEmergencyPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-slate-500">Loading case tracking...</div>}>
      <TrackEmergencyContent />
    </Suspense>
  );
}
