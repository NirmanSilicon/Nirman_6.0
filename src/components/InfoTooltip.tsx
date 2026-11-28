import { useId, useState } from "react";
import { HelpCircle } from "lucide-react";

interface InfoTooltipProps {
  term: string;
  explanation: string;
}

export function InfoTooltip({ term, explanation }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className="relative inline-flex items-center align-middle">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        aria-label={`Explain ${term}`}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
      >
        <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs leading-relaxed text-slate-200 shadow-xl"
        >
          <span className="block font-semibold text-indigo-300 mb-0.5">{term}</span>
          <span>{explanation}</span>
        </span>
      )}
    </span>
  );
}
