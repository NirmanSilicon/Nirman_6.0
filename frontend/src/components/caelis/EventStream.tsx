import React from 'react';
import { mockEventStream } from '../../data/caelisMock';
import { Activity, Radio, Cpu, FileCode } from 'lucide-react';

interface EventStreamProps {
  selectedEventId: string;
  onSelectEvent: (id: string) => void;
  processing: boolean;
}

export const EventStream: React.FC<EventStreamProps> = ({ selectedEventId, onSelectEvent, processing }) => {
  return (
    <div className="p-6 bg-[#FAF6EE] border-2 border-[#1A1A1A] shadow-md torn-paper-card">
      
      {/* Tape Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b-2 border-[#1A1A1A]/20">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#DC143C] animate-pulse" />
            <h3 className="font-headline font-black text-2xl text-[#1A1A1A] tracking-tight">
              CONTINUOUS FLIGHT RECORDER TELEMETRY FEED
            </h3>
          </div>
          <div className="text-[11px] font-mono-tech text-[#625A50] mt-0.5">
            CHRONOLOGICAL REPLAY BUS · CLICK ANY CHIP TO LOAD 128-SAMPLE RAW WAVEFORM
          </div>
        </div>

        <span className="text-[10px] font-mono-tech px-2.5 py-1 bg-[#1A1A1A] text-[#FAF6EE] font-bold">
          LIVE BUS REPLAY: SYNCHRONIZED
        </span>
      </div>
      
      {/* Scrollable Telemetry Strip */}
      <div className="flex overflow-x-auto pb-3 gap-3 scrollbar-thin scrollbar-thumb-[#DC143C]/40">
        {mockEventStream.map((evt, idx) => {
          const isSelected = evt.id === selectedEventId;
          
          return (
            <button
              key={`${evt.id}-${idx}`}
              onClick={() => onSelectEvent(evt.id)}
              disabled={processing}
              className={`flex-shrink-0 flex flex-col items-start p-3.5 border-2 min-w-[170px] transition-all text-left ${
                isSelected 
                  ? 'border-[#DC143C] bg-[#DC143C] text-[#FAF6EE] shadow-lg -translate-y-1 rotate-[-0.5deg]' 
                  : 'border-[#1A1A1A]/20 bg-[#F0EAD6] text-[#1A1A1A] hover:border-[#DC143C]'
              } ${processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className={`text-[10px] font-mono-tech font-bold ${isSelected ? 'text-[#FAF6EE]' : 'text-[#C5A945]'}`}>
                  {evt.time}
                </span>
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#FAF6EE]' : 'bg-[#1A1A1A]/30'}`}></span>
              </div>

              <div className="font-mono-tech text-xs font-black uppercase mb-1 w-full truncate tracking-tight">
                {evt.component}
              </div>

              <div className={`text-[11px] font-mono-tech line-clamp-2 leading-snug ${isSelected ? 'text-[#FAF6EE]/90' : 'text-[#625A50]'}`}>
                {evt.event}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};


