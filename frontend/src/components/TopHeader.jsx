import { useEffect, useRef, useState } from "react";
import { Bell, Database, Menu, UploadCloud } from "lucide-react";
import { getSeverityBadgeClass } from "../utils/formatters";

/**
 * Top application bar featuring view title with teal underline accent,
 * active plant dataset switcher, Upload Data CTA, alarm notification bell, and team badge.
 */
export function TopHeader({
  title,
  plants,
  activePlantId,
  activatingPlant,
  onSelectPlant,
  onNavigateUpload,
  onNavigateAlarms,
  confirmedAlarmCount,
  priorityAlarms = [],
  onOpenMobileMenu,
}) {
  const [bellOpen, setBellOpen] = useState(false);
  const bellContainerRef = useRef(null);
  const bellButtonRef = useRef(null);

  useEffect(() => {
    if (!bellOpen) return undefined;

    const handlePointerDown = (event) => {
      if (bellContainerRef.current && !bellContainerRef.current.contains(event.target)) {
        setBellOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setBellOpen(false);
        bellButtonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [bellOpen]);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: View Title & Teal Underline */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5]"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0F172A] truncate">
              {title}
            </h1>
            <div className="w-10 h-1 rounded-full bg-[#00A8B5] mt-1" />
          </div>
        </div>

        {/* Right: Dataset Selector, Upload CTA, Bell & User Badge */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Select Dataset / Plant Dropdown */}
          <div className="flex items-center gap-2 bg-[#F4F8FB] border border-slate-200 rounded-xl px-3 py-1.5">
            <Database className="w-4 h-4 text-[#00A8B5] shrink-0" aria-hidden="true" />
            <label htmlFor="header-plant-select" className="sr-only">
              Select Dataset / Plant
            </label>
            <select
              id="header-plant-select"
              value={activePlantId || "tep"}
              disabled={activatingPlant || plants.length === 0}
              onChange={(e) => onSelectPlant(e.target.value)}
              className="bg-transparent text-xs sm:text-sm font-medium text-[#0F172A] focus:outline-none cursor-pointer pr-1 max-w-[190px]"
            >
              {plants.length === 0 ? (
                <option value="tep">Tennessee Eastman Process</option>
              ) : (
                plants.map((plant) => (
                  <option key={plant.plant_id} value={plant.plant_id}>
                    {plant.plant_name} ({plant.n_sensors} sensors)
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Upload Data CTA */}
          <button
            type="button"
            onClick={onNavigateUpload}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#00A8B5] text-white text-xs sm:text-sm font-semibold shadow-xs hover:bg-[#008B96] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] focus-visible:ring-offset-2"
          >
            <UploadCloud className="w-4 h-4" aria-hidden="true" />
            <span>Upload Data</span>
          </button>

          {/* Notification Bell */}
          <div ref={bellContainerRef} className="relative">
            <button
              ref={bellButtonRef}
              type="button"
              onClick={() => setBellOpen((prev) => !prev)}
              aria-label={`Confirmed alarms notification (${confirmedAlarmCount ?? 0} active)`}
              aria-expanded={bellOpen}
              className="relative p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-[#0F172A] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5]"
            >
              <Bell className="w-4.5 h-4.5" aria-hidden="true" />
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center tabular-nums shadow-xs">
                {confirmedAlarmCount ?? 0}
              </span>
            </button>

            {bellOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-lg p-4 z-40">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Confirmed Priority Alarms
                  </span>
                  <span className="text-xs font-semibold text-rose-600 tabular-nums">
                    {confirmedAlarmCount ?? 0} active
                  </span>
                </div>
                {priorityAlarms.length === 0 ? (
                  <p className="py-4 text-xs text-slate-500 text-center">
                    No confirmed alarms in the active window. Run a fault simulation to inspect ISA-18.2 alerts.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100 max-h-60 overflow-y-auto my-1">
                    {priorityAlarms.map((alarm) => (
                      <li key={`${alarm.tag}-${alarm.first_step}`} className="py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[#0F172A] truncate">
                            {alarm.label || alarm.tag}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {alarm.tag} • step {alarm.first_step} • |z|={alarm.peak_z.toFixed(1)}
                          </div>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${getSeverityBadgeClass(alarm.severity)}`}>
                          {alarm.severity}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setBellOpen(false);
                    onNavigateAlarms();
                  }}
                  className="mt-2 w-full py-2 rounded-xl bg-[#F4F8FB] hover:bg-slate-100 text-xs font-semibold text-[#008B96] transition-colors cursor-pointer"
                >
                  Open Alarm Analysis →
                </button>
              </div>
            )}
          </div>

          {/* User Badge */}
          <div
            title="Team Synaptix (SK)"
            className="w-9 h-9 rounded-xl bg-[#0F172A] text-white text-xs font-bold flex items-center justify-center tracking-wide shrink-0 select-none"
          >
            TS
          </div>
        </div>
      </div>
    </header>
  );
}
