import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  Sun,
  Leaf,
  IndianRupee,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Sparkles,
  Bot,
  Clock,
  TrendingDown,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useVidyut } from '../context/VidyutContext';

const KPI_ICONS = {
  'total-energy': Zap,
  'renewable-usage': Sun,
  'carbon-intensity': Leaf,
  'electricity-cost': IndianRupee,
};

const KPI_ACCENTS = {
  'total-energy': 'bg-[#E3D6BF] text-[#17140D]',
  'renewable-usage': 'bg-[#AABAAE] text-[#17140D]',
  'carbon-intensity': 'bg-[#9F9679] text-[#17140D]',
  'electricity-cost': 'bg-[#933B5B] text-white',
};

const STATUS_BADGE_MAP = {
  Active: 'green',
  Idle: 'neutral',
  Warning: 'orange',
  Running: 'green',
  Scheduled: 'sky',
  Standby: 'neutral',
  Attention: 'red',
  Approved: 'green',
  Pending: 'yellow',
  Rejected: 'red',
  'Manual Override': 'violet',
};

const AGENT_VISUAL_BADGE = {
  'grid-carbon': { metric: '₹11.20/kWh Peak', sub: '0.74 kg CO₂', pct: 96, color: 'bg-[#9F9679] text-[#17140D]' },
  'microgrid-storage': { metric: '890 kW Solar', sub: '68% BESS SOC', pct: 94, color: 'bg-[#AABAAE] text-[#17140D]' },
  'production-scheduling': { metric: '2 Shifts Ready', sub: '₹14.2k Savings', pct: 92, color: 'bg-[#933B5B] text-white' },
  'ergonomics-shift': { metric: '76 / 85 dBA', sub: 'Shift-A Safe', pct: 91, color: 'bg-[#B5728A] text-[#17140D]' },
};

export function OverviewPage() {
  const {
    dateRange,
    setDateRange,
    kpis,
    energySeries,
    agents,
    schedules,
    approveSchedule,
    rejectSchedule,
  } = useVidyut();

  const [expandedAgentId, setExpandedAgentId] = useState(null);

  const pendingRecs = schedules.filter((s) => s.recommendationStatus === 'Pending');
  const activeRec = pendingRecs[0] || schedules[0];

  return (
    <div className="space-y-6">
      {/* Top Action Strip: Central Idea + Time Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-[16px] border-[3px] border-[#17140D] shadow-[5px_5px_0_#17140D] px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#933B5B] border-2 border-[#17140D] text-white text-xs font-extrabold">
            <Sparkles className="w-3.5 h-3.5" />
            Shift, don&apos;t cut
          </span>
          <p className="text-xs sm:text-sm font-bold text-[#17140D]">
            Run when the sun shines. Ship on time.{' '}
            <span className="text-[#933B5B] font-medium hidden md:inline">
              · {pendingRecs.length} pending AI schedule recommendation{pendingRecs.length !== 1 ? 's' : ''}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-[#E3D6BF] p-1 rounded-[12px] border-2 border-[#17140D]">
          {['Today', 'Week', 'Month'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1 rounded-[8px] text-xs font-extrabold transition-all cursor-pointer ${
                dateRange === range
                  ? 'bg-[#933B5B] text-white border-2 border-[#17140D] shadow-[2px_2px_0_#17140D]'
                  : 'text-[#17140D] hover:bg-white border-2 border-transparent'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* 4 KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = KPI_ICONS[kpi.id] || Zap;
          const accent = KPI_ACCENTS[kpi.id] || 'bg-[#933B5B] text-white';
          const isPositiveDelta = kpi.delta.startsWith('+') || kpi.id !== 'renewable-usage';

          return (
            <Card key={kpi.id} className="hover:-translate-y-0.5 transition-transform">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#933B5B]">
                    {kpi.label}
                  </p>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="font-display text-2xl font-extrabold tracking-tight text-[#17140D] font-mono">
                      {kpi.value}
                    </span>
                    <span className="text-xs font-bold text-[#933B5B]">{kpi.unit}</span>
                  </div>
                </div>
                <div
                  className={`w-11 h-11 rounded-[12px] border-2 border-[#17140D] shadow-[3px_3px_0_#17140D] flex items-center justify-center shrink-0 ${accent}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-3 pt-3 border-t-2 border-[#E3D6BF] flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E3D6BF] border border-[#17140D] text-[11px] font-extrabold text-[#17140D]">
                  {isPositiveDelta ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : (
                    <TrendingUp className="w-3 h-3" />
                  )}
                  {kpi.delta}
                </span>
                <span className="text-[11px] font-medium text-[#933B5B] truncate">
                  {kpi.subtext}
                </span>
              </div>
            </Card>
          );
        })}
      </section>

      {/* Main Grid: Energy Overview Chart + AI Recommendation Panel */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Energy Overview: Solar vs. Baseline & Optimized Load"
            subtitle={`Simulated ${dateRange.toLowerCase()} generation and load shifting profile (kW / kWh)`}
            action={
              <Link
                to="/energy"
                className="memphis-btn inline-flex items-center gap-1 px-3 py-1.5 bg-[#E3D6BF] text-xs font-bold text-[#17140D]"
              >
                Detailed Analytics
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          />
          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={energySeries} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#E3D6BF" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: '#17140D', fontWeight: 600 }}
                  axisLine={{ stroke: '#17140D', strokeWidth: 2 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#17140D', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '2.5px solid #17140D',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    boxShadow: '4px 4px 0 #17140D',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700, paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="solar"
                  name="Solar Generation"
                  stroke="#9F9679"
                  strokeWidth={2.5}
                  fill="#9F9679"
                  fillOpacity={0.28}
                />
                <Line
                  type="monotone"
                  dataKey="baseline"
                  name="Baseline Consumption"
                  stroke="#B5728A"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="optimized"
                  name="Optimized Consumption"
                  stroke="#933B5B"
                  strokeWidth={3}
                  dot={{ r: 3.5, fill: '#933B5B', stroke: '#17140D', strokeWidth: 1.5 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* AI Recommendation Panel */}
        <Card className="flex flex-col justify-between bg-[#E3D6BF]">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[10px] bg-[#933B5B] border-2 border-[#17140D] shadow-[3px_3px_0_#17140D] text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-[16px] font-extrabold text-[#17140D]">
                    AI Recommendation
                  </h3>
                  <p className="text-[11px] font-medium text-[#933B5B]">
                    {pendingRecs.length > 0
                      ? `${pendingRecs.length} pending decision${pendingRecs.length > 1 ? 's' : ''}`
                      : 'All recommendations reviewed'}
                  </p>
                </div>
              </div>
              {activeRec && (
                <Badge variant={STATUS_BADGE_MAP[activeRec.recommendationStatus] || 'neutral'} dot>
                  {activeRec.recommendationStatus}
                </Badge>
              )}
            </div>

            {activeRec ? (
              <div className="space-y-3 mt-4">
                <div className="p-3 rounded-[12px] bg-[#E3D6BF] border-2 border-[#17140D]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#933B5B] font-mono">
                      #{activeRec.id}
                    </span>
                    <span className="text-[11px] font-bold text-[#933B5B]">{activeRec.zone}</span>
                  </div>
                  <p className="font-display text-sm font-extrabold text-[#17140D] mt-1">
                    {activeRec.machineName}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-[12px] bg-white border-2 border-[#17140D]">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#933B5B] block">
                      Current Slot
                    </span>
                    <span className="text-xs font-bold text-[#933B5B] line-through font-mono mt-0.5 block">
                      {activeRec.originalSchedule}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-[12px] bg-[#E3D6BF] border-2 border-[#17140D]">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#17140D] block">
                      Recommended Slot
                    </span>
                    <span className="text-xs font-extrabold text-[#17140D] font-mono mt-0.5 block">
                      {activeRec.recommendedSchedule}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-[#17140D] leading-relaxed bg-white p-3 rounded-[12px] border-2 border-[#17140D]">
                  <span className="font-extrabold block mb-1">Agent Rationale:</span>
                  {activeRec.reason}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-[10px] bg-[#933B5B] text-white border-2 border-[#17140D]">
                    <span className="text-[10px] font-bold block opacity-90">Cost Impact</span>
                    <span className="text-xs font-extrabold font-mono">
                      {activeRec.impact.costSavings}
                    </span>
                  </div>
                  <div className="p-2 rounded-[10px] bg-[#E3D6BF] border-2 border-[#17140D]">
                    <span className="text-[10px] font-bold text-[#17140D] block">CO₂ Avoided</span>
                    <span className="text-xs font-extrabold text-[#17140D] font-mono">
                      {activeRec.impact.carbonReduction}
                    </span>
                  </div>
                  <div className="p-2 rounded-[10px] bg-[#933B5B]/20 border-2 border-[#17140D]">
                    <span className="text-[10px] font-bold text-[#17140D] block">Clean Match</span>
                    <span className="text-xs font-extrabold text-[#17140D] font-mono">
                      {activeRec.impact.renewableMatch}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {activeRec && (
            <div className="mt-4 pt-3 border-t-2 border-[#E3D6BF] flex items-center gap-2.5">
              {activeRec.recommendationStatus === 'Pending' ? (
                <>
                  <button
                    onClick={() => approveSchedule(activeRec.id)}
                    className="memphis-btn flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#933B5B] text-white text-xs font-extrabold cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve Shift
                  </button>
                  <button
                    onClick={() => rejectSchedule(activeRec.id)}
                    className="memphis-btn flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#933B5B] text-white text-xs font-extrabold cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </>
              ) : (
                <Link
                  to="/scheduling"
                  className="memphis-btn w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#933B5B] text-white text-xs font-extrabold"
                >
                  Manage All Schedules
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          )}
        </Card>
      </section>

      {/* AI Agent Status (Visual & Interactive Cards) */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="font-display text-[17px] font-extrabold text-[#17140D]">
              Cooperative AI Agents (Sense → Connect → Decide → Act &amp; Observe)
            </h2>
            <p className="text-xs font-medium text-[#933B5B]">
              Click any agent card to inspect its live task &amp; latest decision
            </p>
          </div>
          <Link
            to="/agents"
            className="memphis-btn inline-flex items-center gap-1 px-3 py-1.5 bg-white text-xs font-bold text-[#17140D]"
          >
            Interactive Agent Hub
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {agents.map((agent) => {
            const vis = AGENT_VISUAL_BADGE[agent.id] || {
              metric: 'Nominal',
              sub: agent.stage,
              pct: 90,
              color: 'bg-[#933B5B]',
            };
            const isExpanded = expandedAgentId === agent.id;

            return (
              <Card
                key={agent.id}
                padding="p-4"
                className="flex flex-col justify-between transition-transform hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-[11px] border-2 border-[#17140D] shadow-[3px_3px_0_#17140D] flex items-center justify-center shrink-0 ${vis.color}`}
                      >
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#933B5B] block">
                          {agent.stage}
                        </span>
                        <h3 className="font-display text-xs font-extrabold text-[#17140D] leading-tight">
                          {agent.name}
                        </h3>
                      </div>
                    </div>
                    <Badge variant={STATUS_BADGE_MAP[agent.status] || 'neutral'} dot>
                      {agent.status}
                    </Badge>
                  </div>

                  {/* Visual Signal Pill */}
                  <div className="mt-3 p-2.5 rounded-[12px] bg-[#E3D6BF] border-2 border-[#17140D] flex items-center justify-between gap-2">
                    <span className="font-display text-xs font-extrabold text-[#17140D]">
                      {vis.metric}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#933B5B]">
                      {vis.sub}
                    </span>
                  </div>

                  {/* Visual Confidence Meter */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#933B5B] mb-1">
                      <span>Confidence</span>
                      <span className="font-mono text-[#17140D]">{agent.metrics?.confidence}</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-[#E3D6BF] border-2 border-[#17140D] overflow-hidden">
                      <div
                        className="h-full bg-[#933B5B]"
                        style={{ width: `${vis.pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Expandable Details */}
                  {isExpanded && (
                    <div className="mt-3 p-2.5 rounded-[10px] bg-[#E3D6BF] border-2 border-[#17140D] space-y-1.5 text-xs">
                      <p className="font-bold text-[#17140D]">{agent.responsibility}</p>
                      <p className="text-[#933B5B] leading-snug">{agent.latestDecision}</p>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t-2 border-[#E3D6BF] flex items-center justify-between text-[11px] font-bold text-[#933B5B]">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {agent.lastUpdated}
                  </span>
                  <button
                    type="button"
                    onClick={() => setExpandedAgentId(isExpanded ? null : agent.id)}
                    className="inline-flex items-center gap-1 font-extrabold text-[#933B5B] hover:underline cursor-pointer"
                  >
                    {isExpanded ? 'Hide' : 'Details'}
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Production Overview Compact Table */}
      <Card>
        <CardHeader
          title="Production Overview"
          subtitle="Active shop-floor work orders synchronized with solar & tariff windows"
          action={
            <Link
              to="/scheduling"
              className="memphis-btn inline-flex items-center gap-1 px-3 py-1.5 bg-[#933B5B] text-xs font-extrabold text-white"
            >
              Open Gantt Scheduler
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-[2.5px] border-[#17140D] text-[11px] uppercase tracking-wider text-[#17140D]">
                <th className="py-2.5 px-3 font-extrabold">Machine Name</th>
                <th className="py-2.5 px-3 font-extrabold">Scheduled Time</th>
                <th className="py-2.5 px-3 font-extrabold">Current Status</th>
                <th className="py-2.5 px-3 font-extrabold">AI Schedule</th>
                <th className="py-2.5 px-3 font-extrabold">Production Deadline</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#E3D6BF] text-xs">
              {schedules.map((row) => (
                <tr key={row.id} className="hover:bg-[#E3D6BF]/60 transition-colors">
                  <td className="py-3 px-3 font-bold text-[#17140D]">{row.machineName}</td>
                  <td className="py-3 px-3 font-mono font-bold text-[#17140D]">
                    {row.recommendationStatus === 'Approved' ||
                    row.recommendationStatus === 'Manual Override'
                      ? row.recommendedSchedule
                      : row.originalSchedule}
                  </td>
                  <td className="py-3 px-3">
                    <Badge variant={STATUS_BADGE_MAP[row.operatingStatus] || 'neutral'} dot>
                      {row.operatingStatus}
                    </Badge>
                  </td>
                  <td className="py-3 px-3">
                    <Badge variant={STATUS_BADGE_MAP[row.recommendationStatus] || 'neutral'}>
                      {row.recommendationStatus}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-[#17140D] font-bold">{row.deadline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
