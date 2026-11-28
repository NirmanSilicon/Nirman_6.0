import React from 'react';
import { AlertTriangle, RefreshCw, Inbox } from 'lucide-react';
import { Card } from './Card';

export function LoadingState({ message = 'Synchronizing factory telemetry & agent states...' }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-3 w-28 bg-[#E3D6BF] rounded mb-3" />
            <div className="h-7 w-24 bg-[#AABAAE]/50 rounded mb-2" />
            <div className="h-3 w-36 bg-[#9F9679]/30 rounded" />
          </Card>
        ))}
      </div>
      <Card className="h-64 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-xl bg-[#933B5B] border-[2.5px] border-[#17140D] shadow-[3px_3px_0_#17140D] flex items-center justify-center mb-3">
          <RefreshCw className="w-5 h-5 text-white animate-spin" />
        </div>
        <p className="font-display text-base font-bold text-[#17140D]">{message}</p>
        <p className="text-xs font-medium text-[#5A523D] mt-1">
          Loading Sense → Connect → Decide → Act &amp; Observe pipeline
        </p>
      </Card>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <Card className="p-8 flex flex-col items-center justify-center text-center bg-[#E3D6BF]">
      <div className="w-12 h-12 rounded-xl bg-[#933B5B] text-white border-[2.5px] border-[#17140D] shadow-[4px_4px_0_#17140D] flex items-center justify-center mb-3">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="font-display text-lg font-extrabold text-[#17140D]">
        Telemetry Connection Interrupted
      </h3>
      <p className="text-sm font-medium text-[#5A523D] max-w-md mt-1">
        {error || 'Unable to retrieve simulated or live factory data.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="memphis-btn mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#AABAAE] text-[#17140D] text-sm font-bold cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </button>
      )}
    </Card>
  );
}

export function EmptyState({ title = 'No records found', description = 'Try adjusting your active filters.' }) {
  return (
    <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 rounded-xl bg-[#933B5B] text-white border-[2.5px] border-[#17140D] shadow-[3px_3px_0_#17140D] flex items-center justify-center mb-3">
        <Inbox className="w-5 h-5" />
      </div>
      <p className="font-display text-base font-bold text-[#17140D]">{title}</p>
      <p className="text-xs font-medium text-[#5A523D] mt-1 max-w-sm">{description}</p>
    </div>
  );
}
