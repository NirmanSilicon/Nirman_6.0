import React, { useState, useRef, useEffect } from 'react';
import { 
  GenealogyNode, 
  GenealogyEdge, 
  FailureModeScenario 
} from '../../data/reconstructionData';
import { 
  Thermometer, 
  Zap, 
  BatteryCharging, 
  ShieldAlert, 
  Power, 
  Radio, 
  Cpu, 
  Compass, 
  Eye, 
  Layers, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowDown, 
  Sparkles,
  Info
} from 'lucide-react';

interface CausalGenealogyTreeProps {
  scenario: FailureModeScenario;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode: (node: GenealogyNode) => void;
  onSelectEdge: (edge: GenealogyEdge) => void;
  isMinimumCausalOnly: boolean;
  currentStepIndex: number;
  theme?: 'light' | 'dark';
}

export const CausalGenealogyTree: React.FC<CausalGenealogyTreeProps> = ({
  scenario,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  isMinimumCausalOnly,
  currentStepIndex,
  theme
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 620 });

  // Update SVG container dimensions responsively
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth || 900,
          height: Math.max(containerRef.current.clientHeight || 620, 600)
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const getSubsystemIcon = (type: GenealogyNode['subsystemType']) => {
    switch (type) {
      case 'THERMAL':
        return <Thermometer className="w-4 h-4 text-[#DC143C]" />;
      case 'CONTROL':
        return <Cpu className="w-4 h-4 text-[#C5A945]" />;
      case 'BATTERY':
        return <BatteryCharging className="w-4 h-4 text-[#DC143C]" />;
      case 'PROTECTION':
        return <ShieldAlert className="w-4 h-4 text-[#C5A945]" />;
      case 'POWER_BUS':
        return <Zap className="w-4 h-4 text-[#DC143C]" />;
      case 'COMMUNICATION':
        return <Radio className="w-4 h-4 text-[#DC143C]" />;
      case 'ADCS':
        return <Compass className="w-4 h-4 text-[#C5A945]" />;
      case 'PAYLOAD':
        return <Eye className="w-4 h-4 text-[#1D546C]" />;
      default:
        return <Power className="w-4 h-4 text-[#1A1A1A]" />;
    }
  };

  const getConfidenceBadgeColor = (tier: GenealogyNode['confidenceTier']) => {
    switch (tier) {
      case 'VERY HIGH':
        return 'bg-emerald-900/90 text-emerald-300 border-emerald-500/50';
      case 'HIGH':
        return 'bg-[#C5A945]/90 text-[#FAF6EE] border-[#C5A945]';
      case 'MODERATE':
        return 'bg-amber-900/80 text-amber-200 border-amber-500/50';
    }
  };

  const isDark = theme === 'dark';

  // Filter edges and nodes if Minimum Causal Explanation is active
  const visibleNodes = scenario.nodes.filter(
    n => !isMinimumCausalOnly || n.isMinimumCausalPath
  );
  const visibleEdges = scenario.edges.filter(
    e => !isMinimumCausalOnly || e.isMinimumCausalPath
  );

  // Coordinate computation helpers to ensure cards have ample breathing room and never cluster
  const leftPad = dimensions.width > 640 ? 160 : 124;
  const rightPad = dimensions.width > 640 ? 48 : 24;
  const effectiveWidth = Math.max(dimensions.width - leftPad - rightPad, 280);
  const topPad = 44;
  const bottomPad = 48;
  const effectiveHeight = Math.max(dimensions.height - topPad - bottomPad, 560);

  const getNodeCoords = (node: GenealogyNode) => {
    const x = leftPad + (node.xPercent / 100) * effectiveWidth;
    const y = topPad + (node.yPercent / 100) * effectiveHeight;
    return { x, y };
  };

  // Stratum Y-level guides for subtle horizontal background bands
  const stratumYLevels = [
    { label: '01 · ROOT ANOMALY', y: topPad + 0.10 * effectiveHeight, color: 'border-[#DC143C]/30 text-[#DC143C]' },
    { label: '02 · PHYSICAL PROPAGATION', y: topPad + 0.37 * effectiveHeight, color: 'border-[#C5A945]/30 text-[#E5C76B]' },
    { label: '03 · SUBSYSTEM DOWNSTREAM', y: topPad + 0.64 * effectiveHeight, color: 'border-[#1D546C]/30 text-cyan-400' },
    { label: '04 · EXTERNAL SYMPTOM', y: topPad + 0.90 * effectiveHeight, color: 'border-[#DC143C]/30 text-[#DC143C]' },
  ];

  return (
    <div 
      className="bg-[#121110] border-2 border-[#1A1A1A] shadow-2xl relative select-none overflow-hidden rounded-xs flex flex-col"
    >
      {/* Subtle Background Blueprint Grid and Halftone Texture */}
      <div className="absolute inset-0 bg-circuit-pattern opacity-15 pointer-events-none"></div>
      <div className="absolute inset-0 bg-halftone opacity-10 pointer-events-none"></div>

      {/* Top Banner Guide Tag */}
      <div className="absolute top-3 right-4 z-20 flex items-center gap-2 bg-[#1E1C1A]/90 border border-[#FAF6EE]/20 px-3 py-1.5 rounded-xs backdrop-blur-xs text-[11px] font-mono-tech text-[#FAF6EE] shadow-md">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span className="font-bold text-[#E5C76B]">CAUSAL GENEALOGY TOPOLOGY</span>
        <span className="text-[#FAF6EE]/50 hidden sm:inline">| CLICK ANY EDGE FOR EVIDENCE AUDIT</span>
      </div>

      {/* Main Interactive Tree Graph Canvas Area with Enhanced Vertical & Horizontal Spacing */}
      <div 
        ref={containerRef}
        className="w-full h-[700px] sm:h-[760px] lg:h-[800px] relative shrink-0 overflow-hidden"
      >
        {/* Stratum Horizontal Guide Bands across canvas */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {stratumYLevels.map((stratum, idx) => (
            <div 
              key={idx}
              style={{ top: `${stratum.y}px` }}
              className="absolute left-32 sm:left-40 right-4 -translate-y-1/2 flex items-center gap-3 border-t border-dashed border-[#FAF6EE]/5"
            >
              <span className={`text-[8px] font-mono-tech uppercase font-bold tracking-widest px-1.5 py-0.5 bg-[#121110]/80 border ${stratum.color}`}>
                {stratum.label}
              </span>
            </div>
          ))}
        </div>

        {/* Stratum Stage Vertical Watermark Layers (Left Side) */}
        <div className="absolute left-0 top-3 bottom-3 w-30 sm:w-38 pointer-events-none border-r border-[#FAF6EE]/10 flex flex-col justify-between py-3 px-3 text-[10px] font-mono-tech z-0">
          
          {/* Tier 1: ROOT */}
          <div className="flex flex-col gap-0.5 border-l-2 border-[#DC143C] pl-2 bg-[#DC143C]/10 py-1.5">
            <span className="text-[#DC143C] font-black uppercase tracking-wider">01 · ROOT</span>
            <span className="text-[#FAF6EE]/50 text-[9px]">ORIGIN ANOMALY</span>
          </div>

          {/* Tier 2: PROPAGATION */}
          <div className="flex flex-col gap-0.5 border-l-2 border-[#C5A945] pl-2 bg-[#C5A945]/10 py-1.5">
            <span className="text-[#E5C76B] font-black uppercase tracking-wider">02 · PROPAGATION</span>
            <span className="text-[#FAF6EE]/50 text-[9px]">PHYSICAL COUPLING</span>
          </div>

          {/* Tier 3: DOWNSTREAM */}
          <div className="flex flex-col gap-0.5 border-l-2 border-[#1D546C] pl-2 bg-[#1D546C]/10 py-1.5">
            <span className="text-cyan-400 font-black uppercase tracking-wider">03 · DOWNSTREAM</span>
            <span className="text-[#FAF6EE]/50 text-[9px]">SUBSYSTEM COLLAPSE</span>
          </div>

          {/* Tier 4: FINAL SYMPTOM */}
          <div className="flex flex-col gap-0.5 border-l-2 border-[#DC143C] pl-2 bg-[#DC143C]/20 py-1.5">
            <span className="text-[#DC143C] font-black uppercase tracking-wider">04 · SYMPTOM</span>
            <span className="text-[#FAF6EE]/50 text-[9px]">EXTERNAL TELEMETRY</span>
          </div>

        </div>

        {/* SVG Canvas for High-Precision Causal Connecting Edges */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            {/* Arrowhead Marker for Critical Active Edges */}
            <marker
              id="arrow-active"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#DC143C" />
            </marker>

            {/* Arrowhead Marker for Normal Edges */}
            <marker
              id="arrow-nominal"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#C5A945" />
            </marker>

            {/* Glowing filter for selected link */}
            <filter id="glow-selected" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Render All Causal Edges with Graceful Curvature */}
          {visibleEdges.map((edge) => {
            const fromNode = scenario.nodes.find(n => n.id === edge.fromId);
            const toNode = scenario.nodes.find(n => n.id === edge.toId);

            if (!fromNode || !toNode) return null;

            const p1 = getNodeCoords(fromNode);
            const p2 = getNodeCoords(toNode);

            const x1 = p1.x;
            const y1 = p1.y + 36; // start with clean offset from bottom of parent card
            const x2 = p2.x;
            const y2 = p2.y - 36; // end with clean offset to top of target card

            const isSelected = selectedEdgeId === edge.id;

            // Calculate bezier curvature with generous vertical arcs
            const dy = y2 - y1;
            const cy1 = y1 + Math.max(dy * 0.45, 30);
            const cy2 = y2 - Math.max(dy * 0.45, 30);
            const pathData = `M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`;

            // Midpoint for temporal badge
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            return (
              <g key={edge.id} className="pointer-events-auto cursor-pointer group" onClick={() => onSelectEdge(edge)}>
                {/* Thick invisible click hit-area */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="28"
                  className="cursor-pointer"
                />

                {/* Outer Glow Halo if Selected */}
                {isSelected && (
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#DC143C"
                    strokeWidth="8"
                    strokeOpacity="0.4"
                    filter="url(#glow-selected)"
                  />
                )}

                {/* Primary Physical Causal Wire */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={isSelected ? '#DC143C' : edge.isMinimumCausalPath ? '#E5C76B' : '#786F66'}
                  strokeWidth={isSelected ? 3.5 : edge.isMinimumCausalPath ? 2.5 : 1.5}
                  strokeDasharray={edge.isMinimumCausalPath ? 'none' : '4,4'}
                  markerEnd={isSelected ? 'url(#arrow-active)' : 'url(#arrow-nominal)'}
                  className="transition-all duration-300 group-hover:stroke-[#DC143C] group-hover:stroke-width-3"
                />

                {/* Animated Electric Pulse Wave traversing along path */}
                {edge.isMinimumCausalPath && (
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#FAF6EE"
                    strokeWidth="3"
                    strokeDasharray="8 80"
                    strokeDashoffset="100"
                    className="opacity-75 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"
                  />
                )}

                {/* Feature 11 & Time Indicator on every edge: "+084 MS", "+190 MS", "+314 MS" */}
                <g 
                  transform={`translate(${midX}, ${midY})`}
                  className="transition-transform group-hover:scale-110"
                >
                  <rect
                    x="-32"
                    y="-11"
                    width="64"
                    height="22"
                    rx="4"
                    fill={isSelected ? '#DC143C' : '#1E1C1A'}
                    stroke={isSelected ? '#FAF6EE' : '#E5C76B'}
                    strokeWidth={isSelected ? '2' : '1.2'}
                    className="shadow-lg"
                  />
                  <text
                    x="0"
                    y="3.5"
                    textAnchor="middle"
                    fill="#FAF6EE"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                    letterSpacing="0.05em"
                  >
                    {edge.temporalGapLabel}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Render High-Tech Forensic HTML Nodes positioned centered over the canvas */}
        {visibleNodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          const { x, y } = getNodeCoords(node);

          return (
            <div
              key={node.id}
              onClick={() => onSelectNode(node)}
              style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: 'translate(-50%, -50%)'
              }}
              className={`absolute w-[185px] sm:w-[215px] p-3 border-2 transition-all duration-300 cursor-pointer z-30 select-none ${
                isSelected
                  ? 'bg-[#1E1C1A] text-[#FAF6EE] border-[#DC143C] shadow-[0_0_24px_rgba(201,29,55,0.7)] scale-105 ring-2 ring-[#DC143C]/40'
                  : node.stratum === 'ROOT'
                    ? 'bg-[#1C1816] text-[#FAF6EE] border-[#DC143C]/80 hover:border-[#DC143C] shadow-xl hover:scale-102'
                    : node.stratum === 'SYMPTOM'
                      ? 'bg-[#1A1618] text-[#FAF6EE] border-[#DC143C]/80 hover:border-[#DC143C] shadow-xl hover:scale-102'
                      : 'bg-[#1E1C1A] text-[#FAF6EE] border-[#FAF6EE]/20 hover:border-[#E5C76B] shadow-lg hover:scale-102'
              }`}
            >
              {/* Node Top Row: Subsystem Code + Confidence Badge */}
              <div className="flex items-center justify-between gap-1 mb-1.5 pb-1 border-b border-[#FAF6EE]/15">
                <div className="flex items-center gap-1.5">
                  {getSubsystemIcon(node.subsystemType)}
                  <span className="text-xs font-mono-tech font-black text-[#E5C76B] tracking-wider">
                    {node.code}
                  </span>
                </div>

                {/* Feature 15: Prominent Confidence Badge (e.g. HIGH 0.94 / VERY HIGH 0.99) */}
                <div className={`px-1.5 py-0.5 rounded-xs border text-[9px] font-mono-tech font-bold flex items-center gap-1 ${getConfidenceBadgeColor(node.confidenceTier)}`}>
                  <span>{node.confidenceTier === 'VERY HIGH' ? 'V.HIGH' : node.confidenceTier}</span>
                  <span className="font-mono">{node.confidence.toFixed(2)}</span>
                </div>
              </div>

              {/* Node Title & Subsystem Name */}
              <div className="font-headline font-black text-xs sm:text-sm text-[#FAF6EE] tracking-tight uppercase line-clamp-1">
                {node.label}
              </div>

              {/* Telemetry Reading Snippet */}
              <div className="mt-1 font-mono-tech text-[10px] text-emerald-400 font-bold bg-[#121110] px-1.5 py-0.5 border border-emerald-900/50 truncate">
                {node.rawReading}
              </div>

              {/* Node Footer: Stratum & Timestamp */}
              <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono-tech text-[#FAF6EE]/60">
                <span className="uppercase text-[#C5A945] font-bold">
                  {node.stratum}
                </span>
                <span className="font-mono">{node.timeOffsetLabel}</span>
              </div>

              {/* Selected Highlight Marker */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-[#DC143C] text-white rounded-full flex items-center justify-center text-[9px] font-bold shadow-md animate-bounce">
                  ●
                </div>
              )}
            </div>
          );
        })}

      </div>

      {/* Graph Legend & Status Footer Bar */}
      <div className="bg-[#171514] border-t border-[#FAF6EE]/15 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-tech text-[#FAF6EE]/75 z-20 shrink-0">
        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#E5C76B] inline-block"></span>
            <span>PROVEN CAUSAL LINK</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-b border-dashed border-[#FAF6EE]/50 inline-block"></span>
            <span>AUXILIARY / SECONDARY COUPLING</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-xs bg-[#DC143C] inline-block"></span>
            <span>ORIGIN & COLLAPSE SENSORS</span>
          </div>
        </div>

        <div className="text-[10px] text-[#FAF6EE]/60 font-semibold flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-[#E5C76B]" />
          <span>STRICT TEMPORAL PRECEDENCE T(A) &lt; T(B) ENFORCED ACROSS ALL EDGES</span>
        </div>
      </div>

    </div>
  );
};
