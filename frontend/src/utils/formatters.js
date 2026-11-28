/**
 * Shared formatting, badge styles, and chart color tokens for AlarmSense UI.
 */

export const CHART_COLORS = [
  "#00A8B5", // Primary teal
  "#6366F1", // Indigo
  "#F59E0B", // Amber
  "#EC4899", // Coral / Rose
  "#10B981", // Emerald
];

export const SEVERITY_STYLES = {
  CRITICAL: {
    pill: "bg-rose-50 text-rose-700 border border-rose-200",
    dot: "bg-rose-500",
  },
  HIGH_HIGH: {
    pill: "bg-rose-50 text-rose-700 border border-rose-200",
    dot: "bg-rose-500",
  },
  HIGH: {
    pill: "bg-amber-50 text-amber-800 border border-amber-200",
    dot: "bg-amber-500",
  },
  MEDIUM: {
    pill: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
  },
  LOW: {
    pill: "bg-sky-50 text-sky-700 border border-sky-200",
    dot: "bg-sky-500",
  },
  LOW_LOW: {
    pill: "bg-orange-50 text-orange-700 border border-orange-200",
    dot: "bg-orange-500",
  },
  NORMAL: {
    pill: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
  },
};

export function getSeverityBadgeClass(level) {
  const key = String(level || "MEDIUM").toUpperCase();
  return SEVERITY_STYLES[key]?.pill || "bg-slate-100 text-slate-700 border border-slate-200";
}

export function formatPct(ratioOrPct, isRatio = false) {
  if (ratioOrPct === null || ratioOrPct === undefined || Number.isNaN(Number(ratioOrPct))) {
    return "—";
  }
  const value = isRatio ? Number(ratioOrPct) * 100 : Number(ratioOrPct);
  return `${value.toFixed(1)}%`;
}

export function formatNumber(val, decimals = 2) {
  if (val === null || val === undefined || Number.isNaN(Number(val))) {
    return "—";
  }
  return Number(val).toFixed(decimals);
}

export function formatTimestamp(isoString) {
  if (!isoString) return "Just now";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return String(isoString);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
