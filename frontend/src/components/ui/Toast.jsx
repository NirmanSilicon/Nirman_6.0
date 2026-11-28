import React from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { useVidyut } from '../../context/VidyutContext';

export function Toast() {
  const { toast, setToast } = useVidyut();
  if (!toast) return null;

  const styles = {
    success: 'bg-[#AABAAE] text-[#17140D]',
    warning: 'bg-[#9F9679] text-[#17140D]',
    info: 'bg-[#933B5B] text-white',
  };

  const Icon =
    toast.type === 'success' ? CheckCircle2 : toast.type === 'warning' ? AlertTriangle : Info;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full sm:w-auto">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-[14px] border-[3px] border-[#17140D] shadow-[5px_5px_0_#17140D] text-sm font-bold ${styles[toast.type] || styles.info
          }`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1">{toast.message}</span>
        <button
          onClick={() => setToast(null)}
          className="opacity-80 hover:opacity-100 cursor-pointer"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
