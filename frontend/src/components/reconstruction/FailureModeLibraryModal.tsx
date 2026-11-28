import React, { useState } from 'react';
import { 
  RECONSTRUCTION_SCENARIOS, 
  FailureModeScenario 
} from '../../data/reconstructionData';
import { 
  BookOpen, 
  X, 
  Search, 
  CheckCircle2, 
  ChevronRight, 
  ShieldAlert, 
  Clock, 
  Layers, 
  Activity,
  Zap,
  Thermometer,
  Compass
} from 'lucide-react';

interface FailureModeLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedScenarioId: string;
  onSelectScenario: (scenario: FailureModeScenario) => void;
  theme?: 'light' | 'dark';
}

export const FailureModeLibraryModal: React.FC<FailureModeLibraryModalProps> = ({
  isOpen,
  onClose,
  selectedScenarioId,
  onSelectScenario,
  theme
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [subsystemFilter, setSubsystemFilter] = useState<string>('ALL');

  if (!isOpen) return null;

  const filteredScenarios = RECONSTRUCTION_SCENARIOS.filter(s => {
    const matchesSearch = 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.subsystem.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSubsystem = 
      subsystemFilter === 'ALL' || 
      s.subsystem.toUpperCase().includes(subsystemFilter.toUpperCase());

    return matchesSearch && matchesSubsystem;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1A]/80 backdrop-blur-xs select-none">
      <div 
        className="bg-[#F0EAD6] border-3 border-[#1A1A1A] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden rounded-xs relative"
        style={{ transform: 'translateZ(0)' }}
      >
        {/* Modal Header */}
        <div className="bg-[#1A1A1A] text-[#FAF6EE] p-4 sm:p-5 flex items-center justify-between border-b-2 border-[#1A1A1A]">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#DC143C]" />
            <div>
              <h2 className="font-headline font-black text-lg sm:text-xl text-[#FAF6EE] tracking-tight">
                SPACECRAFT FAILURE-MODE LIBRARY
              </h2>
              <span className="text-[10px] font-mono-tech text-[#C5A945] uppercase tracking-widest block font-bold">
                FEATURE 06 // STANDARDIZED CAS-CLASS FAILURE TAXONOMY
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#FAF6EE]/70 hover:text-[#FAF6EE] hover:bg-[#FAF6EE]/10 rounded-xs transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 bg-[#E2D5C0] border-b border-[#1A1A1A]/20 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#625A50] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search failure modes, codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FAF6EE] border border-[#1A1A1A]/30 text-xs font-mono-tech pl-9 pr-3 py-2 text-[#1A1A1A] focus:outline-none focus:border-[#DC143C]"
            />
          </div>

          {/* Subsystem Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {['ALL', 'THERMAL', 'ADCS', 'POWER'].map((sub) => (
              <button
                key={sub}
                onClick={() => setSubsystemFilter(sub)}
                className={`px-2.5 py-1 text-[11px] font-mono-tech font-bold uppercase transition-colors cursor-pointer ${
                  subsystemFilter === sub
                    ? 'bg-[#1A1A1A] text-[#FAF6EE]'
                    : 'bg-[#FAF6EE] text-[#1A1A1A] hover:bg-[#FAF6EE]/80 border border-[#1A1A1A]/20'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        {/* Scenario List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-grow max-h-[60vh]">
          {filteredScenarios.map((scen) => {
            const isSelected = selectedScenarioId === scen.id;

            return (
              <div
                key={scen.id}
                onClick={() => {
                  onSelectScenario(scen);
                  onClose();
                }}
                className={`p-4 sm:p-5 border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#FAF6EE] border-[#DC143C] shadow-lg ring-2 ring-[#DC143C]/30'
                    : 'bg-[#FAF6EE] border-[#1A1A1A]/20 hover:border-[#1A1A1A] shadow-sm hover:shadow-md'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-[#1A1A1A]/10">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono-tech font-black text-[#DC143C] bg-[#DC143C]/10 px-2 py-0.5 border border-[#DC143C]/30">
                      {scen.code}
                    </span>
                    <span className="text-xs font-mono-tech font-bold text-[#625A50] uppercase">
                      {scen.subsystem}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono-tech">
                    <span className="text-[#625A50]">CONFIDENCE: <strong className="text-emerald-700 font-bold">{(scen.overallConfidence * 100).toFixed(0)}%</strong></span>
                    <span className="text-[#625A50]">TIME: <strong className="text-[#1A1A1A]">{scen.incidentTimeRange}</strong></span>
                  </div>
                </div>

                <h3 className="font-headline font-black text-base sm:text-lg text-[#1A1A1A] mb-2">
                  {scen.title}
                </h3>

                <p className="text-xs font-mono-tech text-[#625A50] leading-relaxed mb-3">
                  {scen.summary}
                </p>

                {/* Nodes Preview Chips */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  <span className="text-[10px] font-mono-tech text-[#625A50] font-bold mr-1">
                    PROPAGATION CHAIN:
                  </span>
                  {scen.nodes.map((node, i) => (
                    <React.Fragment key={node.id}>
                      <span className={`text-[10px] font-mono-tech px-1.5 py-0.5 border font-bold ${
                        node.stratum === 'ROOT' 
                          ? 'bg-[#DC143C] text-white border-[#DC143C]' 
                          : node.stratum === 'SYMPTOM'
                            ? 'bg-[#1A1A1A] text-[#FAF6EE] border-[#1A1A1A]'
                            : 'bg-[#F0EAD6] text-[#1A1A1A] border-[#1A1A1A]/20'
                      }`}>
                        {node.code}
                      </span>
                      {i < scen.nodes.length - 1 && (
                        <span className="text-xs text-[#DC143C]">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#1A1A1A]/10 flex items-center justify-between text-xs font-mono-tech">
                  <span className="text-[10px] text-[#625A50]">
                    {scen.minimumCausalSummary}
                  </span>
                  <div className="flex items-center gap-1 text-[#DC143C] font-bold">
                    <span>{isSelected ? 'CURRENTLY LOADED' : 'LOAD INTO GENEALOGY TRACER'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#E2D5C0] border-t-2 border-[#1A1A1A] flex items-center justify-between">
          <span className="text-xs font-mono-tech text-[#625A50]">
            3 Verified Failure Modes Available in Spaceflight Catalog
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1A1A1A] text-[#FAF6EE] text-xs font-mono-tech font-bold uppercase hover:bg-[#DC143C] transition-colors cursor-pointer"
          >
            CLOSE
          </button>
        </div>

      </div>
    </div>
  );
};
