import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api, describeApiError } from "../api/client";
import { LatLon, RecommendationItem, RecommendationOut, VehicleCategory } from "../api/types";
import { ArrivalTimeSelector } from "../components/ArrivalTimeSelector";
import { CrowdChip, DataBadge } from "../components/DataBadge";
import { formatIstRange } from "../utils/time";

const CATEGORIES: { key: VehicleCategory; label: string }[] = [
  { key: "car", label: "Car" },
  { key: "two_wheeler", label: "Two-wheeler" },
  { key: "van", label: "Van" },
];

export function InsightsScreen({ navigation }: { navigation: any }): JSX.Element {
  const [origin] = useState<LatLon>({ lat: 20.2961, lon: 85.8245 });
  const [arrival, setArrival] = useState<string | null>(null);
  const [useTravelTime, setUseTravelTime] = useState<boolean>(true);
  const [category, setCategory] = useState<VehicleCategory>("car");

  const [recommendations, setRecommendations] = useState<RecommendationOut | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    setError(null);
    try {
      const data = await api<RecommendationOut>("/recommendations", {
        query: {
          lat: origin.lat,
          lon: origin.lon,
          vehicle_category: category,
          arrival_time: arrival,
          use_travel_time: useTravelTime,
          radius_m: 5000,
          limit: 5,
        },
      });
      setRecommendations(data);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [origin.lat, origin.lon, category, arrival, useTravelTime]);

  // Input changes (category, arrival, travel toggle) show the spinner; pull-to-refresh does not.
  useEffect(() => {
    setLoading(true);
    void fetchRecommendations();
  }, [fetchRecommendations]);

  const renderItem = useCallback(
    ({ item }: { item: RecommendationItem }) => {
      const hasProb = item.probability !== null;
      const probPercent = hasProb ? `${Math.round((item.probability as number) * 100)}%` : "N/A";

      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("ZoneDetail", { zoneId: item.zone.id })}
        >
          <View style={styles.cardTop}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{item.rank}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.zoneName}>{item.zone.name}</Text>
              <Text style={styles.subText}>
                📍 {item.distance_m !== null ? `${Math.round(item.distance_m)} m` : "Distance unknown"}
                {item.travel_time_s !== null ? ` • ~${Math.round(item.travel_time_s / 60)} min drive` : ""}
              </Text>
              <Text style={styles.subText}>Score {item.score.toFixed(2)}</Text>
            </View>
            <View style={styles.probBadge}>
              <Text style={styles.probText}>{probPercent}</Text>
              <Text style={styles.probLabel}>{hasProb ? "Chance" : "Estimate unavailable"}</Text>
            </View>
          </View>

          <View style={styles.reasonsBox}>
            {item.reasons.map((r, idx) => (
              <Text key={idx} style={styles.reasonText}>
                ✓ {r}
              </Text>
            ))}
          </View>

          <View style={styles.cardBottom}>
            <DataBadge provenance="forecast" compact />
          </View>
        </TouchableOpacity>
      );
    },
    [navigation]
  );

  return (
    <View style={styles.container}>
      <View style={styles.controlsSection}>
        <View style={styles.catRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[styles.catBtn, category === c.key && styles.catBtnActive]}
              onPress={() => setCategory(c.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.catText, category === c.key && styles.catTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ArrivalTimeSelector value={arrival} onChange={setArrival} />

        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>Account for Live Traffic & Travel Duration</Text>
          <Switch
            value={useTravelTime}
            onValueChange={setUseTravelTime}
            trackColor={{ false: "#334155", true: "#0284C7" }}
            thumbColor={useTravelTime ? "#38BDF8" : "#94A3B8"}
          />
        </View>
      </View>

      {recommendations && recommendations.status !== "ok" && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            {recommendations.status === "unavailable"
              ? "Estimates unavailable: not enough data for reliable recommendations."
              : "Low reliability: treat these estimates with caution."}
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0284C7" />
          <Text style={styles.loadingText}>Computing AI recommendations...</Text>
        </View>
      ) : (
        <FlatList
          data={recommendations?.items || []}
          keyExtractor={(item) => item.zone.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchRecommendations();
              }}
              tintColor="#0284C7"
            />
          }
          ListHeaderComponent={
            recommendations?.best_windows && recommendations.best_windows.length > 0 ? (
              <View style={styles.windowsSection}>
                <Text style={styles.windowsTitle}>🌟 RECOMMENDED TIME WINDOWS</Text>
                <View style={styles.windowsRow}>
                  {recommendations.best_windows.map((w, idx) => (
                    <View key={idx} style={styles.windowCard}>
                      <Text style={styles.windowTime}>{formatIstRange(w.start, w.end)} IST</Text>
                      <View style={{ marginTop: 4 }}>
                        <CrowdChip level={w.crowd_level} />
                      </View>
                      <Text style={styles.windowProb}>
                        {w.probability !== null ? `${Math.round(w.probability * 100)}% Free` : "Estimate unavailable"}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>No zone recommendations available right now.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  catRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  catBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: "#1E293B", borderWidth: 1, borderColor: "#334155" },
  catBtnActive: { backgroundColor: "#0284C7", borderColor: "#38BDF8" },
  catText: { color: "#CBD5E1", fontSize: 12, fontWeight: "600" },
  catTextActive: { color: "#FFFFFF", fontWeight: "800" },
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  controlsSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
  },
  toggleText: {
    fontSize: 12,
    color: "#CBD5E1",
    fontWeight: "500",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  windowsSection: {
    marginBottom: 16,
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  windowsTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#38BDF8",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  windowsRow: {
    flexDirection: "row",
    gap: 10,
  },
  windowCard: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  windowTime: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  windowProb: {
    fontSize: 12,
    fontWeight: "800",
    color: "#10B981",
    marginTop: 6,
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  rankBadge: {
    backgroundColor: "#0284C7",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },
  zoneName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  subText: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  probBadge: {
    backgroundColor: "rgba(2, 132, 199, 0.15)",
    borderWidth: 1,
    borderColor: "#0284C7",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
  },
  probText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#38BDF8",
  },
  probLabel: {
    fontSize: 9,
    color: "#94A3B8",
    fontWeight: "600",
  },
  reasonsBox: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    gap: 4,
  },
  reasonText: {
    fontSize: 12,
    color: "#CBD5E1",
  },
  cardBottom: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  loadingText: {
    color: "#94A3B8",
    marginTop: 10,
    fontSize: 13,
  },
  emptyText: {
    color: "#64748B",
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: "#450A0A",
    padding: 10,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#991B1B",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 12,
    fontWeight: "600",
  },
});
