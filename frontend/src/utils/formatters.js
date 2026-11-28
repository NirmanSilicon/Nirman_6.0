
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

const DEFAULT_SEVERITY_STYLE = {
  pill: "bg-slate-100 text-slate-700 border border-slate-200",
  dot: "bg-slate-400",
};

/**
 * Normalises severity names into supported keys.
 * Examples: "high high", "HIGH-HIGH" -> "HIGH_HIGH".
 */
export function normalizeSeverity(level) {
  return String(level || "MEDIUM")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

/**
 * Returns the Tailwind badge classes for a severity.
 */
export function getSeverityBadgeClass(level) {
  const key = normalizeSeverity(level);
  return SEVERITY_STYLES[key]?.pill || DEFAULT_SEVERITY_STYLE.pill;
}

/**
 * Returns the Tailwind dot classes for a severity.
 */
export function getSeverityDotClass(level) {
  const key = normalizeSeverity(level);
  return SEVERITY_STYLES[key]?.dot || DEFAULT_SEVERITY_STYLE.dot;
}

/**
 * Safely converts a value into a finite number.
 */
function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

/**
 * Formats a percentage.
 * Pass isRatio=true when the input is a ratio between 0 and 1.
 */
export function formatPct(ratioOrPct, isRatio = false) {
  const value = toFiniteNumber(ratioOrPct);

  if (value === null) return "—";

  const percentage = isRatio ? value * 100 : value;

  return `${percentage.toFixed(1)}%`;
}

/**
 * Formats a numeric value with configurable decimal places.
 */
export function formatNumber(val, decimals = 2) {
  const value = toFiniteNumber(val);
  const precision = Number.isInteger(decimals)
    ? Math.min(10, Math.max(0, decimals))
    : 2;

  if (value === null) return "—";

  return value.toFixed(precision);
}

/**
 * Formats a timestamp for dashboard display.
 */
export function formatTimestamp(isoString, options = {}) {
  if (!isoString) return "Just now";

  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return String(isoString);
  }

  return date.toLocaleTimeString(
    options.locale,
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      ...options,
    }
  );
}

