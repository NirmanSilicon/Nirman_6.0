
import { useEffect } from "react";
import {
  Activity,
  BellRing,
  ClipboardCheck,
  Cpu,
  FileBarChart2,
  Layers,
  LayoutDashboard,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";

export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", headerTitle: "Plant Overview", icon: LayoutDashboard },
  { id: "upload", label: "Data Upload", headerTitle: "Data Upload & Retrain", icon: UploadCloud },
  { id: "alarms", label: "Alarm Analysis", headerTitle: "Alarm Analysis", icon: BellRing },
  { id: "anomaly", label: "Anomaly Detection", headerTitle: "Anomaly Detection", icon: Activity },
  { id: "classification", label: "Fault Classification", headerTitle: "Fault Classification", icon: Layers },
  { id: "rca", label: "Root Cause Analysis", headerTitle: "Root Cause Analysis", icon: Cpu },
  { id: "recommendations", label: "Recommendations", headerTitle: "Operator Recommendations", icon: ClipboardCheck },
  { id: "reports", label: "Reports", headerTitle: "Diagnostics Reports", icon: FileBarChart2 },
];

export function Sidebar({
  activeView,
  onSelectView,
  health,
  mobileOpen,
  onCloseMobile,
  healthLoading = false,
}) {
  const isHealthy =
    health?.status === "ok" && health?.model_loaded === true;

  const statusLabel = healthLoading
    ? "Checking..."
    : isHealthy
      ? "Ready"
      : "Unavailable";

  const statusStyle = healthLoading
    ? "bg-slate-50 text-slate-600 border-slate-200"
    : isHealthy
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  const closeMobile = () => {
    onCloseMobile?.();
  };

  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMobile();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  const navContent = (
    <div className="flex flex-col h-full sidebar-teal-wave border-r border-slate-200/80">
      <div className="px-5 pt-6 pb-5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00A8B5] to-[#008B96] text-white flex items-center justify-center shadow-sm shadow-[#00A8B5]/25 shrink-0">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <div className="text-base font-bold tracking-tight text-[#0F172A] leading-tight">
              AlarmSense
            </div>
            <div className="text-[11px] font-medium text-slate-500 truncate">
              Industrial Alarm Intelligence
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={closeMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5]"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <nav
        aria-label="Primary navigation"
        className="flex-1 px-3 py-4 space-y-1 overflow-y-auto"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectView?.(item.id);
                closeMobile();
              }}
              aria-current={isActive ? "page" : undefined}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] focus-visible:ring-offset-1 ${
                isActive
                  ? "bg-[#00A8B5] text-white shadow-sm shadow-[#00A8B5]/25"
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-[#0F172A]"
              }`}
            >
              <Icon
                className={`w-[18px] h-[18px] shrink-0 ${
                  isActive ? "text-white" : "text-slate-400"
                }`}
                aria-hidden="true"
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200/70">
        <div className="rounded-xl bg-white/90 border border-slate-200/80 px-3.5 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#0F172A]">
              Engine Status
            </span>

            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusStyle}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  healthLoading
                    ? "bg-slate-400"
                    : isHealthy
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                }`}
              />
              {statusLabel}
            </span>
          </div>

          <div className="mt-1.5 text-[11px] text-slate-500 truncate">
            Plant:{" "}
            <span className="font-mono font-medium text-slate-700">
              {health?.active_plant_id || "tep"}
            </span>
            {" "}•{" "}
            {health?.supported_faults ?? "—"} classes
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={closeMobile}
            aria-hidden="true"
          />

          <aside
            role="dialog"
            aria-modal="true"
            
            aria-label="Mobile navigation menu"
            className="relative w-72 max-w-[85vw] h-full z-10 shadow-xl"
          >
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
