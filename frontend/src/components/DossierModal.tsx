import React, { useState } from 'react';
import { TELEMETRY_FRAGMENTS, CAUSAL_EDGES, MISSION_INFO } from '../data/incidentData';
import { TelemetryFragment } from '../types';
import { X, FolderOpen, ShieldCheck, AlertOctagon, Terminal, Copy, Check, FileDown, Layers, HelpCircle } from 'lucide-react';

interface DossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFragment?: TelemetryFragment | null;
}

export const DossierModal: React.FC<DossierModalProps> = ({
  isOpen,
  onClose,
  initialFragment
}) => {
  const [selectedFragId, setSelectedFragId] = useState<string>(
    initialFragment ? initialFragment.id : TELEMETRY_FRAGMENTS[0].id
  );
  const [activeTab, setActiveTab] = useState<'inspector' | 'raw-logs' | 'topology'>('inspector');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentFrag = TELEMETRY_FRAGMENTS.find(f => f.id === selectedFragId) || TELEMETRY_FRAGMENTS[0];
  const parentFrag = currentFrag.causalParentId 
    ? TELEMETRY_FRAGMENTS.find(f => f.id === currentFrag.causalParentId) 
    : null;
  const childFrag = TELEMETRY_FRAGMENTS.find(f => f.causalParentId === currentFrag.id);

  const handleCopyLogs = () => {
    const logText = JSON.stringify(TELEMETRY_FRAGMENTS, null, 2);
    navigator.clipboard?.writeText?.(logText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
      
      {/* Modal Dossier Window */}
      <div className="relative w-full max-w-5xl bg-[#FAF6EE] border-4 border-[#1A1A1A] shadow-[0_25px_70px_rgba(26,24,21,0.5)] my-auto overflow-hidden torn-paper-card">
        
        {/* Dossier Top Bar */}
        <div className="bg-[#F0EAD6] border-b-2 border-[#DC143C] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-[#DC143C] rounded-full animate-pulse"></span>
            <div>
              <span className="text-xs font-mono-tech text-[#C5A945] font-bold">
                INCIDENT CASE FILE // {MISSION_INFO.investigationRef}
              </span>
              <h3 className="text-base sm:text-lg font-headline font-black text-[#1A1A1A] tracking-wide">
                SPACECRAFT CAUSAL INVESTIGATION CONSOLE
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLogs}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs font-mono-tech border border-[#1A1A1A]/30 text-[#1A1A1A] bg-[#FAF6EE] hover:bg-[#E5DBC7]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'COPIED JSON' : 'EXPORT DATA'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 bg-[#DC143C] text-[#FAF6EE] hover:bg-[#B21032] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b-2 border-[#1A1A1A]/20 bg-[#F0EAD6] px-4 gap-2">
          <button
            onClick={() => setActiveTab('inspector')}
            className={`py-2 px-4 text-xs font-mono-tech uppercase font-bold border-b-2 transition-all ${
              activeTab === 'inspector'
                ? 'border-[#DC143C] text-[#1A1A1A] bg-[#FAF6EE]'
                : 'border-transparent text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
            }`}
          >
            Subsystem Evidence Inspector
          </button>
          <button
            onClick={() => setActiveTab('raw-logs')}
            className={`py-2 px-4 text-xs font-mono-tech uppercase font-bold border-b-2 transition-all ${
              activeTab === 'raw-logs'
                ? 'border-[#DC143C] text-[#1A1A1A] bg-[#FAF6EE]'
                : 'border-transparent text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
            }`}
          >
            Raw Telemetry Stream
          </button>
          <button
            onClick={() => setActiveTab('topology')}
            className={`py-2 px-4 text-xs font-mono-tech uppercase font-bold border-b-2 transition-all ${
              activeTab === 'topology'
                ? 'border-[#DC143C] text-[#1A1A1A] bg-[#FAF6EE]'
                : 'border-transparent text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
            }`}
          >
            Topology Map
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto bg-[#FAF6EE]">
          
          {/* TAB 1: Subsystem Evidence Inspector */}
          {activeTab === 'inspector' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Subsystem Node Selector List */}
              <div className="lg:col-span-4 space-y-2">
                <span className="text-xs font-mono-tech text-[#C5A945] font-bold block mb-2">
                  SELECT ALARM ARTIFACT:
                </span>
                
                {TELEMETRY_FRAGMENTS.map((frag) => {
                  const isSelected = selectedFragId === frag.id;
                  return (
                    <div
                      key={frag.id}
                      onClick={() => setSelectedFragId(frag.id)}
                      className={`p-3 border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#1A1A1A] text-[#FAF6EE] border-[#DC143C] font-bold shadow-md'
                          : 'bg-[#F0EAD6] text-[#1A1A1A] border-[#1A1A1A]/20 hover:border-[#DC143C]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono-tech">
                        <span className={isSelected ? 'text-[#DC143C]' : 'text-[#C5A945]'}>
                          {frag.subsystemId}
                        </span>
                        <span>{frag.timestamp}</span>
                      </div>
                      <div className="font-headline text-sm font-bold truncate">
                        {frag.subsystemName}
                      </div>
                      {frag.isOrigin && (
                        <span className="text-[10px] bg-[#DC143C] text-[#FAF6EE] px-1 py-0.2 font-bold inline-block mt-1">
                          ROOT ORIGIN
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Forensic Details for Selected Subsystem */}
              <div className="lg:col-span-8 paper-texture torn-paper-card p-6 border-2 border-[#1A1A1A] text-[#1A1A1A] shadow-md">
                
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between border-b-2 border-[#1A1A1A] pb-3 mb-4 gap-2">
                  <div>
                    <span className="text-xs font-mono-tech bg-[#DC143C] text-[#FAF6EE] px-2 py-0.5 font-bold uppercase">
                      {currentFrag.subsystemId} // {currentFrag.timestamp}
                    </span>
                    <h3 className="font-headline font-black text-2xl text-[#1A1A1A] mt-1">
                      {currentFrag.subsystemName}
                    </h3>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono-tech text-[#DC143C] font-bold uppercase block">
                      CONFIDENCE SCORE
                    </span>
                    <span className="font-headline font-black text-xl text-[#DC143C]">
                      {(currentFrag.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Alarm & Raw Code */}
                <div className="mb-4">
                  <span className="text-xs font-mono-tech font-bold text-[#DC143C] block">
                    ALARM CODE: {currentFrag.alarmCode}
                  </span>
                  <div className="mt-1 p-2.5 bg-[#1A1A1A] text-[#FAF6EE] font-mono-tech text-xs overflow-x-auto border border-[#1A1A1A]">
                    <code>{currentFrag.telemetryLine}</code>
                  </div>
                </div>

                {/* Readings */}
                <div className="grid grid-cols-2 gap-3 mb-4 text-xs font-mono-tech bg-[#1A1A1A]/5 p-3 border border-[#1A1A1A]/20">
                  <div>
                    <span className="text-[10px] opacity-70 block">RAW SENSOR VALUE</span>
                    <strong className="text-[#DC143C]">{currentFrag.rawReading}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] opacity-70 block">NOMINAL ENVELOPE</span>
                    <strong>{currentFrag.nominalRange}</strong>
                  </div>
                </div>

                {/* Plain-English Evidence Note */}
                <div className="mb-4">
                  <span className="text-xs font-mono-tech font-bold uppercase block mb-1">
                    ENGINEERING FORENSIC EVALUATION:
                  </span>
                  <p className="text-xs sm:text-sm font-typewriter bg-[#F0EAD6] p-3 border border-[#1A1A1A]/30 leading-relaxed">
                    {currentFrag.evidenceNote}
                  </p>
                </div>

                {/* Lineage Connections */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono-tech pt-3 border-t border-[#1A1A1A]/30">
                  <div className="p-2.5 bg-[#1A1A1A] text-[#FAF6EE]">
                    <span className="text-[10px] text-[#C5A945] block uppercase font-bold">CAUSAL PARENT</span>
                    {parentFrag ? (
                      <div className="mt-1">
                        <strong>{parentFrag.subsystemName}</strong> ({parentFrag.subsystemId})
                        <div className="text-[10px] text-[#DC143C]">Induced at {parentFrag.timestamp}</div>
                      </div>
                    ) : (
                      <span className="text-[#DC143C] font-bold">★ NONE (ROOT INITIATOR)</span>
                    )}
                  </div>

                  <div className="p-2.5 bg-[#1A1A1A] text-[#FAF6EE]">
                    <span className="text-[10px] text-[#C5A945] block uppercase font-bold">DOWNSTREAM VICTIM</span>
                    {childFrag ? (
                      <div className="mt-1">
                        <strong>{childFrag.subsystemName}</strong> ({childFrag.subsystemId})
                        <div className="text-[10px] text-[#FAF6EE]/80">Propagated at {childFrag.timestamp}</div>
                      </div>
                    ) : (
                      <span className="text-[#FAF6EE]/70">END OF CHAIN (TOTAL LOS)</span>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: Raw Telemetry Stream */}
          {activeTab === 'raw-logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono-tech text-[#C5A945] font-bold">
                <span>RAW CCSDS SPACE-PACKET TELEMETRY RECONSTRUCTION LOG</span>
                <span>SYNC TIME: {MISSION_INFO.incidentTimestamp}</span>
              </div>

              <div className="p-4 bg-[#1A1A1A] border-2 border-[#1A1A1A] font-mono-tech text-xs text-[#FAF6EE] space-y-2 overflow-x-auto max-h-[400px]">
                {TELEMETRY_FRAGMENTS.map((frag, idx) => (
                  <div key={frag.id} className="p-2 border-b border-[#FAF6EE]/15 hover:bg-[#272420]">
                    <span className="text-[#DC143C] font-bold">[{frag.timestamp}]</span>{' '}
                    <span className="text-[#C5A945]">PKT_{idx + 101}</span>{' '}
                    <span className="text-white font-bold">{frag.subsystemId}</span>:{' '}
                    <code>{frag.telemetryLine}</code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Topology Map */}
          {activeTab === 'topology' && (
            <div className="p-6 bg-[#F0EAD6] border-2 border-[#1A1A1A]/30 text-center torn-paper-card">
              <h4 className="font-headline font-bold text-xl text-[#1A1A1A] mb-2">
                VERIFIED CUBESAT HARDWARE ANOMALY TOPOLOGY
              </h4>
              <p className="text-xs font-mono-tech text-[#1A1A1A]/75 max-w-xl mx-auto mb-6">
                Linear propagation graph verified against electrical schematics and firmware execution timings.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 overflow-x-auto py-4">
                {TELEMETRY_FRAGMENTS.map((frag, idx) => (
                  <React.Fragment key={frag.id}>
                    <div className={`p-3 border-2 min-w-[130px] shadow-sm ${
                      frag.isOrigin ? 'bg-[#DC143C] text-[#FAF6EE] border-[#1A1A1A]' : 'bg-[#FAF6EE] text-[#1A1A1A] border-[#1A1A1A]/30'
                    }`}>
                      <div className="text-[10px] font-mono-tech font-bold">{frag.subsystemId}</div>
                      <div className="font-headline font-bold text-sm truncate">{frag.subsystemName}</div>
                      <div className="text-[10px] font-mono-tech opacity-80">{frag.timestamp}</div>
                    </div>
                    {idx < TELEMETRY_FRAGMENTS.length - 1 && (
                      <span className="text-[#DC143C] font-bold text-lg">➔</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-[#F0EAD6] border-t-2 border-[#1A1A1A]/20 px-4 py-3 flex items-center justify-between text-xs font-mono-tech text-[#1A1A1A]/80">
          <span>CLASSIFICATION: INVESTIGATION ARCHIVE REF #GT-8849</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#DC143C] text-[#FAF6EE] font-bold uppercase hover:bg-[#B21032] shadow-md"
          >
            RETURN TO DOSSIER
          </button>
        </div>

      </div>

    </div>
  );
};
