import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { BarrierReport } from '../../types';
import { useAccessibility } from '../../context/AccessibilityContext';
import { ConfidenceRating } from '../common/ConfidenceRating';
import { getApiEndpoint } from '../../utils/apiConfig';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Clock,
  MapPin,
  Sparkles,
  RefreshCw,
  Eye,
  UserCheck,
} from 'lucide-react';

interface AuditorDashboardProps {
  barriers: BarrierReport[];
  onRefresh: () => void;
}

export const AuditorDashboard: React.FC<AuditorDashboardProps> = ({ barriers, onRefresh }) => {
  const { addNotification } = useAccessibility();
  const [selectedBarrier, setSelectedBarrier] = useState<BarrierReport | null>(null);
  const [auditorNotes, setAuditorNotes] = useState('');
  const [auditorName, setAuditorName] = useState('Auditor Rajesh Das (Senior Access Evaluator)');
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingBarriers = barriers.filter(
    (b) => b.status === 'REPORTED' || b.status === 'UNDER_REVIEW'
  );
  const activeBarriers = barriers.filter((b) => b.status === 'ACTIVE_BARRIER');

  const handleAuditAction = async (action: 'APPROVE' | 'REJECT' | 'RESOLVE') => {
    if (!selectedBarrier) return;
    setIsProcessing(true);

    try {
      const endpointPath = action === 'RESOLVE'
        ? `/api/barriers/${selectedBarrier.id}/resolve`
        : `/api/barriers/${selectedBarrier.id}/verify`;

      const body = action === 'RESOLVE'
        ? { auditorName, notes: auditorNotes || 'Barrier cleared and verified step-free.' }
        : { action, auditorName, notes: auditorNotes || 'Verified with geotagged photo evidence.', confidence: 98 };

      const res = await fetch(getApiEndpoint(endpointPath), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        addNotification({
          type: 'VERIFICATION_UPDATE',
          title: `Auditor Sign-Off: ${selectedBarrier.title}`,
          message: `Status updated to ${action === 'APPROVE' ? 'ACTIVE_BARRIER' : action} by ${auditorName}.`,
          severity: 'SUCCESS',
        });
        setSelectedBarrier(null);
        setAuditorNotes('');
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="p-6 sm:p-8 bg-slate-900 text-white rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-600/30 text-emerald-400 border border-emerald-500/50 text-xs font-bold uppercase rounded-full flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Auditor Portal Active
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black">Accessibility Verification & Audit Portal</h2>
          <p className="text-sm text-slate-300 max-w-2xl">
            Review community reports, verify photographic evidence, sign off on active barrier alerts, and maintain ground-truth accuracy.
          </p>
        </div>

        <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 text-xs space-y-1">
          <div className="text-slate-400">Authenticated Auditor</div>
          <div className="font-bold text-slate-100 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>{auditorName}</span>
          </div>
          <div className="text-slate-500 text-[10px]">Certification ID: #AUD-STATE-2026</div>
        </div>
      </div>

      {/* Grid of Pending Verification Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <span>Pending Community Reports Awaiting Verification ({pendingBarriers.length})</span>
          </h3>
          <button
            onClick={onRefresh}
            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 text-xs font-semibold flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {pendingBarriers.length === 0 ? (
          <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
            <div className="font-bold text-slate-900 dark:text-white">All Reports Verified & Up-to-Date</div>
            <p className="text-xs text-slate-500">No unverified community barrier reports currently in queue.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pendingBarriers.map((barrier) => (
              <div
                key={barrier.id}
                className="p-6 bg-white dark:bg-slate-900 rounded-3xl border-2 border-amber-300 dark:border-amber-900/60 shadow-lg space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-lg uppercase">
                      {barrier.status}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      Reported by {barrier.reportedBy.userName}
                    </span>
                  </div>

                  {barrier.photoUrl && (
                    <img
                      src={barrier.photoUrl}
                      alt={barrier.title}
                      className="h-44 w-full object-cover rounded-2xl shadow-xs"
                    />
                  )}

                  <div className="space-y-1">
                    <h4 className="font-bold text-base text-slate-900 dark:text-white">
                      {barrier.title}
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-red-500" />
                      <span>{barrier.destinationName} • {barrier.locationName}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 pt-1 leading-relaxed">
                      {barrier.description}
                    </p>
                  </div>

                  {barrier.aiAnalysis && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-xs space-y-1">
                      <div className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Vision Analysis ({barrier.aiAnalysis.aiConfidence}% match)
                      </div>
                      <div className="text-slate-600 dark:text-slate-400">
                        {barrier.aiAnalysis.detectedIssues.join(' • ')}
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <ConfidenceRating
                      score={barrier.confidence || 85}
                      variant="meter"
                      label="Report & Geotag Confidence"
                      entityName={barrier.title}
                      entityType="BARRIER"
                      auditorName={barrier.verifiedBy || 'Crowd & Vision AI'}
                      verifiedDate={barrier.reportedDate}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                  <button
                    onClick={() => setSelectedBarrier(barrier)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Perform Auditor Review</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Barriers List with Quick Resolve option */}
      <div className="space-y-4 pt-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span>Currently Active Barrier Alerts ({activeBarriers.length})</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeBarriers.map((b) => (
            <div
              key={b.id}
              className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/60 shadow-sm flex items-center justify-between gap-4"
            >
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{b.title}</div>
                <div className="text-xs text-slate-500">{b.destinationName} ({b.locationName})</div>
              </div>
              <button
                onClick={() => {
                  setSelectedBarrier(b);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shrink-0"
              >
                Mark Resolved
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Auditor Review Modal */}
      {selectedBarrier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-lg text-slate-900 dark:text-white">Auditor Sign-Off</h4>
                  <p className="text-xs text-slate-500">Item: {selectedBarrier.title}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBarrier(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Auditor Sign-Off Name
                </label>
                <input
                  type="text"
                  value={auditorName}
                  onChange={(e) => setAuditorName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Audit Notes & Dispatch Directives
                </label>
                <textarea
                  rows={3}
                  value={auditorNotes}
                  onChange={(e) => setAuditorNotes(e.target.value)}
                  placeholder="e.g. Geotagged photo verified obstruction of 1:12 ramp. Active alert broadcasted to route replanner..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                onClick={() => handleAuditAction('APPROVE')}
                disabled={isProcessing}
                className="py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Approve as Active Barrier</span>
              </button>
              <button
                onClick={() => handleAuditAction('RESOLVE')}
                disabled={isProcessing}
                className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Verify Clear & Resolved</span>
              </button>
              <button
                onClick={() => handleAuditAction('REJECT')}
                disabled={isProcessing}
                className="py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Dismiss Report</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
