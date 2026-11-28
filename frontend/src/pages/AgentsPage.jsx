import React, { useState } from 'react';
import {
  Bot,
  Clock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Activity,
  ChevronDown,
  ChevronUp,
  Play,
  Zap,
  BatteryCharging,
  CalendarClock,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useVidyut } from '../context/VidyutContext';

const STAGES = [
  {
    id: 'grid-carbon',
    name: 'Sense',
    label: 'Grid & Carbon',
    icon: Zap,
    color: 'bg-[#9F9679] text-[#17140D]',
    metric: '₹11.20/kWh Peak',
  },
  {
    id: 'microgrid-storage',
    name: 'Connect',
    label: 'Microgrid & BESS',
    icon: BatteryCharging,
    color: 'bg-[#AABAAE] text-[#17140D]',
    metric: '890 kW Solar · 68% SOC',
  },
  {
    id: 'production-scheduling',
    name: 'Decide',
    label: 'Scheduling',
    icon: CalendarClock,
    color: 'bg-[#933B5B] text-white',
    metric: '2 Shifts · ₹14.2k Saved',
  },
  {
    id: 'ergonomics-shift',
    name: 'Act & Observe',
    label: 'Ergonomics',
    icon: ShieldCheck,
    color: 'bg-[#B5728A] text-[#17140D]',
    metric: '76 / 85 dBA Safe',
  },
];

const AGENT_VISUALS = {
  'grid-carbon': {
    chip: 'bg-[#9F9679] text-[#17140D]',
    gaugeLabel: 'Grid Carbon Intensity',
    gaugeValue: '0.74 kg/kWh',
    gaugePct: 74,
    barColor: 'bg-[#9F9679]',
    pill: 'ToU Spike 18:00',
  },
  'microgrid-storage': {
    chip: 'bg-[#AABAAE] text-[#17140D]',
    gaugeLabel: 'BESS State of Charge',
    gaugeValue: '68% (340 kWh)',
    gaugePct: 68,
    barColor: 'bg-[#AABAAE]',
    pill: '890 kW Solar',
  },
  'production-scheduling': {
    chip: 'bg-[#933B5B] text-white',
    gaugeLabel: 'Solar-Aligned Jobs',
    gaugeValue: '4 / 6 Machines',
    gaugePct: 67,
    barColor: 'bg-[#933B5B]',
    pill: '2 Pending Approval',
  },
  'ergonomics-shift': {
    chip: 'bg-[#B5728A] text-[#17140D]',
    gaugeLabel: 'Shop-Floor Noise',
    gaugeValue: '76 / 85 dBA',
    gaugePct: 89,
    barColor: 'bg-[#B5728A]',
    pill: 'Shift-A Cleared',
  },
};

const STATUS_BADGE = {
  Active: 'green',
  Idle: 'neutral',
  Warning: 'orange',
};

export function AgentsPage() {
  const { agents, agentLogs, showToast } = useVidyut();
  const [selectedAgentId, setSelectedAgentId] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [activeStageIdx, setActiveStageIdx] = useState(0);

  const handleSimulateCycle = () => {
    const nextIdx = (activeStageIdx + 1) % STAGES.length;
    setActiveStageIdx(nextIdx);
    const stage = STAGES[nextIdx];
    setSelectedAgentId(stage.id);
    showToast(`Highlighted Stage 0${nextIdx + 1}: ${stage.name} (${stage.label})`, 'info');
  };

  const filteredLogs =
    selectedAgentId === 'all'
      ? agentLogs
      : agentLogs.filter((log) => log.agentId === selectedAgentId);

  return (
    <div className="space-y-6">
      {/* Interactive 4-Stage Orchestration Pipeline */}
      <Card className="bg-[#E3D6BF]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-[10px] bg-[#933B5B] text-white border-2 border-[#17140D] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h2 className="font-display text-base font-extrabold text-[#17140D]">
                Interactive Orchestration Loop
              </h2>
              <p className="text-xs font-medium text-[#933B5B]">
                Click any stage to focus its agent &amp; filter the cooperation log
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedAgentId !== 'all' && (
              <button
                onClick={() => setSelectedAgentId('all')}
                className="memphis-btn px-3 py-1.5 bg-white text-xs font-extrabold text-[#17140D] cursor-pointer"
              >
                Show All Agents
              </button>
            )}
            <button
              onClick={handleSimulateCycle}
              className="memphis-btn inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#933B5B] text-white text-xs font-extrabold cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              Step Pipeline
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STAGES.map((st, idx) => {
            const Icon = st.icon;
            const isSelected = selectedAgentId === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  setActiveStageIdx(idx);
                  setSelectedAgentId(isSelected ? 'all' : st.id);
                }}
                className={`text-left rounded-[14px] border-[2.5px] border-[#17140D] p-3.5 transition-all cursor-pointer ${
                  isSelected
                    ? `${st.color} shadow-[6px_6px_0_#17140D] -translate-y-0.5`
                    : 'bg-white text-[#17140D] shadow-[3px_3px_0_#17140D] hover:bg-[#E3D6BF]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`w-8 h-8 rounded-lg border-2 border-[#17140D] flex items-center justify-center ${
                      isSelected ? 'bg-white text-[#17140D]' : st.color
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono font-extrabold uppercase">
                      0{idx + 1}
                    </span>
                    {idx < STAGES.length - 1 && <ArrowRight className="w-3.5 h-3.5 opacity-70" />}
                  </div>
                </div>
                <p className="font-display text-sm font-extrabold">{st.name}</p>
                <p className="text-[11px] font-bold opacity-85">{st.label}</p>
                <div className="mt-2 pt-2 border-t border-current/20 text-[11px] font-mono font-extrabold">
                  {st.metric}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Visual Agent Command Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {agents.map((agent) => {
          const vis = AGENT_VISUALS[agent.id] || AGENT_VISUALS['grid-carbon'];
          const isSelected = selectedAgentId === agent.id;
          const isExpanded = expandedId === agent.id;
          const confPct = parseInt(agent.metrics?.confidence || '90', 10);

          return (
            <Card
              key={agent.id}
              className={`flex flex-col justify-between transition-all ${
                isSelected ? 'ring-4 ring-[#933B5B]' : ''
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-[12px] border-2 border-[#17140D] shadow-[3px_3px_0_#17140D] flex items-center justify-center shrink-0 ${vis.chip}`}
                    >
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-[16px] font-extrabold text-[#17140D]">
                          {agent.name}
                        </h3>
                        <Badge variant="violet">{agent.stage}</Badge>
                      </div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-[#E3D6BF] border border-[#17140D] text-[11px] font-mono font-bold text-[#933B5B]">
                        {vis.pill}
                      </span>
                    </div>
                  </div>
                  <Badge variant={STATUS_BADGE[agent.status] || 'neutral'} dot>
                    {agent.status}
                  </Badge>
                </div>

                {/* Visual Gauges Row (Replaces heavy text blocks) */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-[12px] bg-[#E3D6BF] border-2 border-[#17140D]">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#933B5B] mb-1.5">
                      <span>{vis.gaugeLabel}</span>
                    </div>
                    <p className="font-display text-sm font-extrabold text-[#17140D] font-mono mb-1.5">
                      {vis.gaugeValue}
                    </p>
                    <div className="w-full h-2.5 bg-white rounded-full border border-[#17140D] overflow-hidden">
                      <div className={`h-full ${vis.barColor}`} style={{ width: `${vis.gaugePct}%` }} />
                    </div>
                  </div>

                  <div className="p-3 rounded-[12px] bg-white border-2 border-[#17140D]">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#933B5B] mb-1.5">
                      <span>Model Confidence</span>
                      <Activity className="w-3.5 h-3.5 text-[#933B5B]" />
                    </div>
                    <p className="font-display text-sm font-extrabold text-[#17140D] font-mono mb-1.5">
                      {agent.metrics?.confidence} · {agent.metrics?.latency}
                    </p>
                    <div className="w-full h-2.5 bg-[#E3D6BF] rounded-full border border-[#17140D] overflow-hidden">
                      <div className="h-full bg-[#933B5B]" style={{ width: `${confPct}%` }} />
                    </div>
                  </div>
                </div>

                {/* Collapsible Detailed Rationale */}
                {isExpanded && (
                  <div className="mt-3 p-3 rounded-[12px] bg-[#E3D6BF] border-2 border-[#17140D] space-y-2 text-xs">
                    <p className="font-medium text-[#933B5B]">{agent.description}</p>
                    <div className="pt-2 border-t border-[#E3D6BF]">
                      <span className="font-extrabold text-[#17140D] block">Current Task:</span>
                      <span className="font-medium text-[#17140D]">{agent.responsibility}</span>
                    </div>
                    <div>
                      <span className="font-extrabold text-[#933B5B] block">Latest Decision:</span>
                      <span className="font-medium text-[#17140D]">{agent.latestDecision}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t-2 border-[#E3D6BF] flex items-center justify-between text-xs font-bold text-[#933B5B]">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {agent.lastUpdated}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAgentId(isSelected ? 'all' : agent.id)}
                    className="px-2.5 py-1 rounded-lg border-2 border-[#17140D] bg-[#E3D6BF] hover:bg-[#933B5B] text-white text-[11px] font-extrabold cursor-pointer"
                  >
                    {isSelected ? 'Clear Filter' : 'Filter Log'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : agent.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#933B5B] hover:underline cursor-pointer"
                  >
                    {isExpanded ? 'Less' : 'Rationale'}
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      {/* Chronological Agent Decision Log */}
      <Card>
        <CardHeader
          title="Agent Decision Log"
          subtitle="Chronological cooperation trace — click any agent pill above to filter"
          action={
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedAgentId('all')}
                className={`px-2.5 py-1 rounded-[8px] text-[11px] font-extrabold border-2 border-[#17140D] cursor-pointer ${
                  selectedAgentId === 'all' ? 'bg-[#933B5B] text-white' : 'bg-[#E3D6BF] text-[#17140D]'
                }`}
              >
                All ({agentLogs.length})
              </button>
              {agents.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAgentId(a.id)}
                  className={`px-2.5 py-1 rounded-[8px] text-[11px] font-extrabold border-2 border-[#17140D] cursor-pointer ${
                    selectedAgentId === a.id
                      ? 'bg-[#933B5B] text-white'
                      : 'bg-white text-[#17140D]'
                  }`}
                >
                  {a.shortName}
                </button>
              ))}
            </div>
          }
        />
        <div className="relative pl-7 space-y-3.5 before:content-[''] before:absolute before:left-[12px] before:top-2 before:bottom-2 before:w-[3px] before:bg-[#17140D]">
          {filteredLogs.map((log) => (
            <div key={log.id} className="relative">
              <span
                className={`absolute -left-7 top-1.5 w-6 h-6 rounded-full border-2 border-[#17140D] flex items-center justify-center ${
                  log.status === 'pending' ? 'bg-[#933B5B] text-white' : 'bg-[#933B5B] text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>

              <div className="bg-[#E3D6BF] rounded-[14px] border-2 border-[#17140D] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs font-extrabold text-[#17140D]">
                      {log.agentName}
                    </span>
                    <Badge variant="yellow">{log.stage}</Badge>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-[#933B5B]">
                    {log.timestamp}
                  </span>
                </div>
                <p className="text-xs font-medium text-[#17140D] leading-relaxed">{log.action}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
