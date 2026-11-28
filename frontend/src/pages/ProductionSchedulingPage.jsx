import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  Eye,
  Sun,
  ShieldAlert,
  X,
} from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/StateBanner';
import { useVidyut } from '../context/VidyutContext';

const STATUS_BADGE = {
  Running: 'green',
  Scheduled: 'sky',
  Standby: 'neutral',
  Attention: 'red',
  Approved: 'green',
  Pending: 'yellow',
  Rejected: 'red',
  'Manual Override': 'violet',
};

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 06:00 to 22:00

export function ProductionSchedulingPage() {
  const { schedules, approveSchedule, rejectSchedule, overrideSchedule } = useVidyut();
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedRec, setSelectedRec] = useState(null);
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [overrideStart, setOverrideStart] = useState(11);
  const [overrideEnd, setOverrideEnd] = useState(14);

  const filtered =
    filterStatus === 'All'
      ? schedules
      : schedules.filter((s) => s.recommendationStatus === filterStatus);

  const openOverrideModal = (item) => {
    setOverrideTarget(item);
    setOverrideStart(item.recommendedStart);
    setOverrideEnd(item.recommendedEnd);
  };

  const handleSaveOverride = (e) => {
    e.preventDefault();
    if (!overrideTarget || overrideEnd <= overrideStart) return;
    overrideSchedule(overrideTarget.id, Number(overrideStart), Number(overrideEnd));
    setOverrideTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Safety Notice & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#933B5B] border-[3px] border-[#17140D] shadow-[5px_5px_0_#17140D] rounded-[16px] px-4 py-3 text-xs text-white">
        <div className="flex items-center gap-2 font-medium">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>
            <strong>Human-in-the-Loop Advisory:</strong> Approving or overriding schedules updates the digital production plan only. No direct physical PLC/machinery actuation is performed.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {['All', 'Pending', 'Approved', 'Rejected', 'Manual Override'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded-[8px] text-xs font-extrabold border-2 border-[#17140D] transition-all cursor-pointer ${
                filterStatus === st
                  ? 'bg-[#17140D] text-white'
                  : 'bg-white text-[#17140D] hover:bg-[#933B5B]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Gantt-Style Timeline */}
      <Card>
        <CardHeader
          title="Daily Production Gantt Timeline (06:00 – 22:00 IST)"
          subtitle="Visualizing original vs. AI-shifted machine windows against the 10:00–15:30 peak solar generation band"
          action={
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-xs bg-[#933B5B]/25 border-2 border-[#17140D]" />
                Solar Peak (10:00–15:30)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-xs bg-[#E3D6BF] border-2 border-[#17140D]" />
                Original Slot
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-xs bg-[#E3D6BF] border-2 border-[#17140D]" />
                AI / Active Slot
              </span>
            </div>
          }
        />

        <div className="overflow-x-auto pb-2">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[200px_1fr] border-b-[2.5px] border-[#17140D] pb-2 mb-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#17140D]">
                Machine / Work Center
              </span>
              <div className="grid grid-cols-16 text-[10px] font-mono font-bold text-[#17140D]">
                {HOURS.slice(0, 16).map((h) => (
                  <span key={h} className="text-left">
                    {String(h).padStart(2, '0')}:00
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3 relative">
              {schedules.map((m) => {
                const totalSpan = 16;
                const origLeft = ((Math.max(6, m.originalStart) - 6) / totalSpan) * 100;
                const origWidth = ((Math.min(22, m.originalEnd) - Math.max(6, m.originalStart)) / totalSpan) * 100;
                const recLeft = ((Math.max(6, m.recommendedStart) - 6) / totalSpan) * 100;
                const recWidth = ((Math.min(22, m.recommendedEnd) - Math.max(6, m.recommendedStart)) / totalSpan) * 100;

                const isShifted =
                  m.originalStart !== m.recommendedStart || m.originalEnd !== m.recommendedEnd;

                return (
                  <div key={m.id} className="grid grid-cols-[200px_1fr] items-center">
                    <div className="pr-3">
                      <p className="text-xs font-extrabold text-[#17140D] truncate">{m.machineId}</p>
                      <p className="text-[11px] font-medium text-[#933B5B] truncate">
                        {m.powerKw} kW · {m.recommendationStatus}
                      </p>
                    </div>

                    <div className="relative h-10 bg-[#E3D6BF] rounded-[10px] border-2 border-[#17140D] overflow-hidden">
                      {/* Solar Peak Highlight Band */}
                      <div
                        className="absolute top-0 bottom-0 bg-[#933B5B]/20 border-x-2 border-dashed border-[#933B5B] pointer-events-none"
                        style={{ left: '25%', width: '34.375%' }}
                        title="Peak Solar Window (10:00 - 15:30)"
                      >
                        <Sun className="w-3.5 h-3.5 text-[#933B5B] m-1" />
                      </div>

                      {/* Original Schedule Bar */}
                      {isShifted && m.recommendationStatus !== 'Rejected' && (
                        <div
                          className="absolute top-1 h-2.5 rounded-sm bg-[#E3D6BF] border border-[#17140D]"
                          style={{ left: `${origLeft}%`, width: `${origWidth}%` }}
                          title={`Original: ${m.originalSchedule}`}
                        />
                      )}

                      {/* Active / Recommended Bar */}
                      <div
                        className={`absolute ${
                          isShifted && m.recommendationStatus !== 'Rejected' ? 'bottom-1 h-4' : 'top-1.5 h-6'
                        } rounded-[6px] border-2 border-[#17140D] text-[10px] font-mono font-bold flex items-center px-1.5 truncate transition-all ${
                          m.recommendationStatus === 'Rejected'
                            ? 'bg-[#933B5B] text-white'
                            : m.recommendationStatus === 'Pending'
                            ? 'bg-[#E3D6BF] text-[#17140D]'
                            : m.recommendationStatus === 'Manual Override'
                            ? 'bg-[#933B5B] text-white'
                            : 'bg-[#933B5B] text-white'
                        }`}
                        style={{
                          left: `${m.recommendationStatus === 'Rejected' ? origLeft : recLeft}%`,
                          width: `${m.recommendationStatus === 'Rejected' ? origWidth : recWidth}%`,
                        }}
                        title={`Active/Recommended: ${
                          m.recommendationStatus === 'Rejected'
                            ? m.originalSchedule
                            : m.recommendedSchedule
                        }`}
                      >
                        {m.recommendationStatus === 'Rejected'
                          ? m.originalSchedule
                          : m.recommendedSchedule}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Machine Scheduling Table */}
      <Card>
        <CardHeader
          title="Machine Production Schedules & AI Recommendations"
          subtitle="Review, approve, reject, or manually override AI-proposed run windows"
        />

        {filtered.length === 0 ? (
          <EmptyState
            title="No schedules match this filter"
            description="Select 'All' to view every machine work-order."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-[2.5px] border-[#17140D] text-[11px] uppercase tracking-wider text-[#17140D]">
                  <th className="py-2.5 px-3 font-extrabold">Machine</th>
                  <th className="py-2.5 px-3 font-extrabold">Energy</th>
                  <th className="py-2.5 px-3 font-extrabold">Original Slot</th>
                  <th className="py-2.5 px-3 font-extrabold">AI Recommended</th>
                  <th className="py-2.5 px-3 font-extrabold">Deadline</th>
                  <th className="py-2.5 px-3 font-extrabold">Status</th>
                  <th className="py-2.5 px-3 font-extrabold text-right">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-[#E3D6BF] text-xs">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-[#E3D6BF]/60">
                    <td className="py-3 px-3">
                      <p className="font-extrabold text-[#17140D]">{item.machineName}</p>
                      <p className="text-[11px] font-medium text-[#933B5B]">{item.zone}</p>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-[#17140D]">
                      {item.powerKw} kW
                      <span className="block text-[11px] font-medium text-[#933B5B]">
                        {item.energyKwh} kWh
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-[#933B5B]">
                      {item.originalSchedule}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-extrabold text-[#17140D] block">
                        {item.recommendedSchedule}
                      </span>
                      <span className="text-[11px] font-bold text-[#933B5B]">
                        {item.impact.costSavings}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-[#17140D]">{item.deadline}</td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant={STATUS_BADGE[item.operatingStatus] || 'neutral'} dot>
                          {item.operatingStatus}
                        </Badge>
                        <Badge variant={STATUS_BADGE[item.recommendationStatus] || 'neutral'}>
                          {item.recommendationStatus}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          onClick={() => setSelectedRec(item)}
                          className="memphis-btn p-1.5 bg-white text-[#17140D] cursor-pointer"
                          title="View Recommendation"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {item.recommendationStatus === 'Pending' && (
                          <>
                            <button
                              onClick={() => approveSchedule(item.id)}
                              className="memphis-btn inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#933B5B] text-white font-extrabold cursor-pointer"
                              title="Approve Schedule"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => rejectSchedule(item.id)}
                              className="memphis-btn inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#933B5B] text-white font-extrabold cursor-pointer"
                              title="Reject Schedule"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => openOverrideModal(item)}
                          className="memphis-btn inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#933B5B] text-white font-extrabold cursor-pointer"
                          title="Manual Override"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          Override
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* View Recommendation Modal */}
      {selectedRec && (
        <div className="fixed inset-0 z-50 bg-[#17140D]/55 flex items-center justify-center p-4">
          <div className="bg-white rounded-[20px] border-[3px] border-[#17140D] shadow-[8px_8px_0_#17140D] max-w-lg w-full p-5">
            <div className="flex items-start justify-between gap-2 pb-3 border-b-2 border-[#17140D]">
              <div>
                <span className="text-[11px] font-mono font-extrabold text-[#933B5B]">
                  Recommendation #{selectedRec.id}
                </span>
                <h3 className="font-display text-lg font-extrabold text-[#17140D]">
                  {selectedRec.machineName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRec(null)}
                className="memphis-btn p-1.5 bg-[#E3D6BF] text-[#17140D] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-[12px] bg-[#E3D6BF] border-2 border-[#17140D]">
                  <span className="text-[#933B5B] font-bold block">Original Window</span>
                  <strong className="font-mono text-sm text-[#17140D]">
                    {selectedRec.originalSchedule}
                  </strong>
                </div>
                <div className="p-3 rounded-[12px] bg-[#E3D6BF] border-2 border-[#17140D]">
                  <span className="text-[#17140D] font-bold block">AI Recommended</span>
                  <strong className="font-mono text-sm text-[#17140D]">
                    {selectedRec.recommendedSchedule}
                  </strong>
                </div>
              </div>
              <p className="text-[#17140D] leading-relaxed bg-[#E3D6BF] p-3 rounded-[12px] border-2 border-[#17140D] font-medium">
                <strong className="font-extrabold block mb-1">Multi-Agent Rationale:</strong>
                {selectedRec.reason}
              </p>
              <div className="flex items-center justify-between font-bold text-[#17140D] pt-1">
                <span>
                  Estimated Savings: <strong className="text-[#933B5B]">{selectedRec.impact.costSavings}</strong>
                </span>
                <span>
                  CO₂ Avoided: <strong className="text-[#933B5B]">{selectedRec.impact.carbonReduction}</strong>
                </span>
              </div>
            </div>
            <div className="pt-3 border-t-2 border-[#17140D] flex justify-end gap-2">
              {selectedRec.recommendationStatus === 'Pending' && (
                <>
                  <button
                    onClick={() => {
                      rejectSchedule(selectedRec.id);
                      setSelectedRec(null);
                    }}
                    className="memphis-btn px-3 py-1.5 bg-[#933B5B] text-white text-xs font-extrabold cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      approveSchedule(selectedRec.id);
                      setSelectedRec(null);
                    }}
                    className="memphis-btn px-3 py-1.5 bg-[#933B5B] text-white text-xs font-extrabold cursor-pointer"
                  >
                    Approve Schedule
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedRec(null)}
                className="memphis-btn px-3 py-1.5 bg-white text-[#17140D] text-xs font-extrabold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Override Modal */}
      {overrideTarget && (
        <div className="fixed inset-0 z-50 bg-[#17140D]/55 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveOverride}
            className="bg-white rounded-[20px] border-[3px] border-[#17140D] shadow-[8px_8px_0_#17140D] max-w-md w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b-2 border-[#17140D]">
              <h3 className="font-display text-base font-extrabold text-[#17140D]">
                Manual Schedule Override — {overrideTarget.machineId}
              </h3>
              <button
                type="button"
                onClick={() => setOverrideTarget(null)}
                className="memphis-btn p-1 bg-[#E3D6BF] text-[#17140D] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="block">
                <span className="font-extrabold text-[#17140D] block mb-1">Start Hour (IST)</span>
                <select
                  value={overrideStart}
                  onChange={(e) => setOverrideStart(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-[10px] border-2 border-[#17140D] bg-white font-mono font-bold"
                >
                  {HOURS.slice(0, 15).map((h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="font-extrabold text-[#17140D] block mb-1">End Hour (IST)</span>
                <select
                  value={overrideEnd}
                  onChange={(e) => setOverrideEnd(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-[10px] border-2 border-[#17140D] bg-white font-mono font-bold"
                >
                  {HOURS.slice(1).map((h) => (
                    <option key={h} value={h} disabled={h <= overrideStart}>
                      {String(h).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOverrideTarget(null)}
                className="memphis-btn px-3 py-1.5 bg-white text-[#17140D] text-xs font-extrabold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="memphis-btn px-4 py-1.5 bg-[#933B5B] text-white text-xs font-extrabold cursor-pointer"
              >
                Save Override
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
