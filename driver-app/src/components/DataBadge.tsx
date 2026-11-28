import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CrowdLevel, DataState, Provenance, Reliability } from "../api/types";

// -------------------------------------------------------------
// Simulated Data Context: Split into Value & Actions to prevent cascading re-renders
// -------------------------------------------------------------

interface SimulatedActionsType {
  incrementSimulated: () => void;
  decrementSimulated: () => void;
}

export const SimulatedValueContext = createContext<number>(0);
export const SimulatedActionContext = createContext<SimulatedActionsType>({
  incrementSimulated: () => {},
  decrementSimulated: () => {},
});

export const SimulatedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [simulatedCount, setSimulatedCount] = useState(0);

  const incrementSimulated = useCallback(() => setSimulatedCount((c) => c + 1), []);
  const decrementSimulated = useCallback(() => setSimulatedCount((c) => Math.max(0, c - 1)), []);
  const actions = useMemo(
    () => ({ incrementSimulated, decrementSimulated }),
    [incrementSimulated, decrementSimulated]
  );

  return (
    <SimulatedActionContext.Provider value={actions}>
      <SimulatedValueContext.Provider value={simulatedCount}>
        {children}
      </SimulatedValueContext.Provider>
    </SimulatedActionContext.Provider>
  );
};

export const useSimulatedValue = () => useContext(SimulatedValueContext);
export const useSimulatedActions = () => useContext(SimulatedActionContext);

// Backwards compatibility hook
export const useSimulatedContext = () => {
  const simulatedCount = useSimulatedValue();
  const { incrementSimulated, decrementSimulated } = useSimulatedActions();
  return { simulatedCount, incrementSimulated, decrementSimulated };
};

// -------------------------------------------------------------
// DataBadge Component
// -------------------------------------------------------------

interface DataBadgeProps {
  dataState?: DataState;
  provenance?: Provenance;
  reliability?: Reliability;
  observedAt?: string | null;
  compact?: boolean;
}

export const DATA_STATE_LABEL: Record<DataState, string> = {
  live: "Live",
  stale: "Stale Data",
  unavailable: "No Live Data",
  unknown: "Not Observed",
};

export const DataBadge: React.FC<DataBadgeProps> = React.memo(({
  dataState,
  provenance,
  reliability,
  observedAt,
  compact = false,
}) => {
  // Use actions only: DataBadge will NEVER re-render when other badges mount/unmount
  const { incrementSimulated, decrementSimulated } = useSimulatedActions();

  // Register with simulated data context
  useEffect(() => {
    if (provenance === "simulated") {
      incrementSimulated();
      return () => {
        decrementSimulated();
      };
    }
  }, [provenance, incrementSimulated, decrementSimulated]);

  // Format observed time relative text if provided
  const formatObserved = (iso: string): string => {
    try {
      const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
      if (diffSec < 0) return "just now";
      if (diffSec < 60) return `${diffSec}s ago`;
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      return `${Math.floor(diffSec / 3600)}h ago`;
    } catch {
      return "";
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Data State Badge */}
      {dataState && (
        <View
          style={[
            styles.badge,
            dataState === "live" && styles.badgeLive,
            dataState === "stale" && styles.badgeStale,
            dataState === "unavailable" && styles.badgeUnavailable,
            dataState === "unknown" && styles.badgeUnknown,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              dataState === "live" && styles.textLive,
              dataState === "stale" && styles.textStale,
              dataState === "unavailable" && styles.textUnavailable,
              dataState === "unknown" && styles.textUnknown,
            ]}
          >
            ● {DATA_STATE_LABEL[dataState]}
            {dataState === "live" && observedAt && !compact ? ` (${formatObserved(observedAt)})` : ""}
          </Text>
        </View>
      )}

      {/* 2. Provenance Badge */}
      {provenance && (
        <View
          style={[
            styles.badge,
            provenance === "simulated" ? styles.badgeSimulated : styles.badgeProvenanceDefault,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              provenance === "simulated" ? styles.textSimulated : styles.textProvenanceDefault,
            ]}
          >
            {provenance.toUpperCase()}
          </Text>
        </View>
      )}

      {/* 3. Reliability Badge */}
      {reliability && reliability !== "unavailable" && (
        <View
          style={[
            styles.badge,
            reliability === "high" && styles.badgeRelHigh,
            reliability === "medium" && styles.badgeRelMed,
            reliability === "low" && styles.badgeRelLow,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              reliability === "high" && styles.textRelHigh,
              reliability === "medium" && styles.textRelMed,
              reliability === "low" && styles.textRelLow,
            ]}
          >
            {reliability.toUpperCase()} RELIABILITY
          </Text>
        </View>
      )}
    </View>
  );
});

// -------------------------------------------------------------
// CrowdChip Component
// -------------------------------------------------------------

interface CrowdChipProps {
  level: CrowdLevel;
}

export const CrowdChip: React.FC<CrowdChipProps> = ({ level }) => {
  const getStyle = () => {
    switch (level) {
      case "low":
        return { bg: "#DCFCE7", text: "#166534", label: "Low Crowd" };
      case "moderate":
        return { bg: "#FEF3C7", text: "#92400E", label: "Moderate Crowd" };
      case "high":
        return { bg: "#FFEDD5", text: "#C2410C", label: "High Crowd" };
      case "very_high":
        return { bg: "#FEE2E2", text: "#991B1B", label: "Very High Crowd" };
      default:
        return { bg: "#F3F4F6", text: "#4B5563", label: "Crowd Unknown" };
    }
  };

  const config = getStyle();

  return (
    <View style={[styles.crowdChip, { backgroundColor: config.bg }]}>
      <Text style={[styles.crowdText, { color: config.text }]}>👥 {config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  // Data states
  badgeLive: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
  },
  textLive: {
    color: "#15803D",
  },
  badgeStale: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  textStale: {
    color: "#B45309",
  },
  badgeUnavailable: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  textUnavailable: {
    color: "#B91C1C",
  },
  badgeUnknown: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  textUnknown: {
    color: "#64748B",
  },
  // Provenance
  badgeSimulated: {
    backgroundColor: "#EFF6FF",
    borderColor: "#93C5FD",
  },
  textSimulated: {
    color: "#1D4ED8",
  },
  badgeProvenanceDefault: {
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1",
  },
  textProvenanceDefault: {
    color: "#475569",
  },
  // Reliability
  badgeRelHigh: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  textRelHigh: {
    color: "#065F46",
  },
  badgeRelMed: {
    backgroundColor: "#FEFCE8",
    borderColor: "#FEF08A",
  },
  textRelMed: {
    color: "#854D0E",
  },
  badgeRelLow: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },
  textRelLow: {
    color: "#9A3412",
  },
  // Crowd chip
  crowdChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  crowdText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
