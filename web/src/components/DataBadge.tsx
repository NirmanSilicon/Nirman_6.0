import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { DataState, Provenance, Reliability, CrowdLevel } from "../api/types";


/**
 * Returns the provided provenance if present; otherwise "observed",
 * since the app now reads real data from the database.
 */
export function dataProvenance(provenance?: Provenance | null): Provenance {
  return provenance ?? "observed";
}

export interface SimulatedContextValue {
  simulatedCount: number;
  incrementSimulated: () => void;
  decrementSimulated: () => void;
}

export const SimulatedContext = createContext<SimulatedContextValue>({
  simulatedCount: 0,
  incrementSimulated: () => {},
  decrementSimulated: () => {},
});

export function SimulatedProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [count, setCount] = useState(0);
  const incrementSimulated = useCallback(() => setCount((c) => c + 1), []);
  const decrementSimulated = useCallback(() => setCount((c) => Math.max(0, c - 1)), []);

  return (
    <SimulatedContext.Provider value={{ simulatedCount: count, incrementSimulated, decrementSimulated }}>
      {children}
    </SimulatedContext.Provider>
  );
}

export const DATA_STATE_LABEL: Record<DataState, string> = {
  live: "Live",
  stale: "Stale (older than the live window)",
  unavailable: "No data (camera offline or data too old)",
  unknown: "Not observed yet",
};

const PROVENANCE_LABEL: Record<Provenance, string> = {
  observed: "Observed",
  historical: "Historical",
  forecast: "Forecast",
  manual: "Manual",
  simulated: "SIMULATED",
};

export interface DataBadgeProps {
  dataState?: DataState;
  provenance?: Provenance;
  reliability?: Reliability;
  observedAt?: string | null;
  compact?: boolean;
}

export function DataBadge({
  dataState,
  provenance,
  reliability,
  observedAt,
  compact = false,
}: DataBadgeProps): JSX.Element {
  const { incrementSimulated, decrementSimulated } = useContext(SimulatedContext);

  useEffect(() => {
    if (provenance === "simulated") {
      incrementSimulated();
      return () => {
        decrementSimulated();
      };
    }
  }, [provenance, incrementSimulated, decrementSimulated]);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        fontSize: compact ? "0.75rem" : "0.85rem",
        lineHeight: 1.2,
      }}
    >
      {dataState && (
        <span
          title={DATA_STATE_LABEL[dataState]}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.2rem",
            padding: "0.15rem 0.4rem",
            borderRadius: "4px",
            border: dataState === "unknown" ? "1px dashed #9ca3af" : "1px solid transparent",
            backgroundColor:
              dataState === "live"
                ? "#dcfce7"
                : dataState === "stale"
                  ? "#fef9c3"
                  : dataState === "unavailable"
                    ? "#f3f4f6"
                    : "#f9fafb",
            color:
              dataState === "live"
                ? "#15803d"
                : dataState === "stale"
                  ? "#a16207"
                  : dataState === "unavailable"
                    ? "#6b7280"
                    : "#4b5563",
            fontWeight: 500,
          }}
        >
          <span>{dataState === "live" ? "●" : dataState === "stale" ? "◐" : dataState === "unavailable" ? "○" : "?"}</span>
          <span>{compact ? DATA_STATE_LABEL[dataState].split(" ")[0] : DATA_STATE_LABEL[dataState]}</span>
        </span>
      )}

      {provenance && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.2rem",
            padding: "0.15rem 0.4rem",
            borderRadius: "4px",
            backgroundColor: provenance === "simulated" ? "#ede9fe" : "#e0f2fe",
            color: provenance === "simulated" ? "#6d28d9" : "#0369a1",
            fontWeight: provenance === "simulated" ? 700 : 500,
            border: provenance === "simulated" ? "1px solid #c4b5fd" : "1px solid transparent",
          }}
        >
          <span>{provenance === "simulated" ? "⚙" : provenance === "observed" ? "✓" : "⚡"}</span>
          <span>{PROVENANCE_LABEL[provenance]}</span>
        </span>
      )}

      {reliability && (
        <span
          title="Reliability is a heuristic label, not a measured accuracy"
          style={{
            padding: "0.15rem 0.4rem",
            borderRadius: "4px",
            backgroundColor: "#f1f5f9",
            color: "#334155",
            fontSize: "0.75rem",
          }}
        >
          rel: {reliability}
        </span>
      )}

      {observedAt !== undefined && (
        <span
          title={observedAt ?? "No live data"}
          style={{ color: "#64748b", fontSize: "0.75rem" }}
        >
          {observedAt ? new Date(observedAt).toLocaleTimeString() : "—"}
        </span>
      )}
    </span>
  );
}

export function CrowdChip({ level }: { level: CrowdLevel }): JSX.Element {
  const meta: Record<CrowdLevel, { label: string; icon: string; bg: string; color: string }> = {
    low: { label: "Low crowd", icon: "🟢", bg: "#dcfce7", color: "#166534" },
    moderate: { label: "Moderate crowd", icon: "🟡", bg: "#fef9c3", color: "#854d0e" },
    high: { label: "High crowd", icon: "🟠", bg: "#ffedd5", color: "#9a3412" },
    very_high: { label: "Very high crowd", icon: "🔴", bg: "#fee2e2", color: "#991b1b" },
    unknown: { label: "Crowd unknown", icon: "⚪", bg: "#f3f4f6", color: "#4b5563" },
  };

  const item = meta[level];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        padding: "0.2rem 0.5rem",
        borderRadius: "9999px",
        backgroundColor: item.bg,
        color: item.color,
        fontSize: "0.8rem",
        fontWeight: 600,
      }}
    >
      <span>{item.icon}</span>
      <span>{item.label}</span>
    </span>
  );
}
