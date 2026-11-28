import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { api, describeApiError, openStream } from "../api/client";
import {
  AvailabilityOut,
  BayOut,
  CrowdCurrentOut,
  FacilityOut,
  LiveEvent,
  ParkingReservationCreate,
  ReservationOut,
  VehicleCategory,
  ZoneLiveOut,
  ZoneOut,
} from "../api/types";
import { ArrivalTimeSelector } from "../components/ArrivalTimeSelector";
import { CrowdChip, DataBadge } from "../components/DataBadge";

const CATEGORY_LABEL: Record<VehicleCategory, string> = {
  two_wheeler: "Two-wheelers",
  car: "Cars",
  van: "Vans",
  truck: "Trucks",
  bus: "Buses",
};

/** Hours come only from the server's operating_schedule; no fallback invented here. */
function formatSchedule(zone: ZoneOut): string {
  const first = zone.operating_schedule?.all?.[0];
  if (!first || first.length < 2 || !first[0] || !first[1]) return "Schedule not available";
  return `${first[0]} – ${first[1]} (Daily)`;
}

/** Union of bay.permitted_vehicle_categories; falls back to the zone kind when bays are not available. */
function formatVehicles(zone: ZoneOut, bays: BayOut[] | null): string {
  const cats = new Set<VehicleCategory>();
  (bays ?? []).forEach((b) => b.permitted_vehicle_categories.forEach((c) => cats.add(c)));
  if (cats.size > 0) return [...cats].map((c) => CATEGORY_LABEL[c]).join(", ");
  return `${zone.kind[0]?.toUpperCase()}${zone.kind.slice(1)} zone — categories not listed`;
}

export function ZoneDetailScreen({ navigation }: { navigation: any }): JSX.Element {
  const route = useRoute<any>();
  const zoneId: string = route.params?.zoneId || "zone-1-janpath";

  const [zone, setZone] = useState<ZoneOut | null>(null);
  const [live, setLive] = useState<ZoneLiveOut | null>(null);
  const [facilities, setFacilities] = useState<FacilityOut[]>([]);
  const [crowd, setCrowd] = useState<CrowdCurrentOut | null>(null);
  const [estimate, setEstimate] = useState<AvailabilityOut | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [bays, setBays] = useState<BayOut[] | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Time & travel options
  const [arrival, setArrival] = useState<string | null>(null);
  const [useTravelTime, setUseTravelTime] = useState<boolean>(false);
  const [selectedCategory] = useState<VehicleCategory>("car");

  // Load zone metadata, live stats, facilities and bays. `silent` = background SSE refresh (no spinner).
  const fetchZoneData = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const [zoneData, liveData, facData, crowdData, bayData] = await Promise.all([
          api<ZoneOut>(`/zones/${zoneId}`),
          api<ZoneLiveOut>(`/zones/${zoneId}/live`),
          api<FacilityOut[]>(`/zones/${zoneId}/facilities`),
          api<CrowdCurrentOut>(`/crowd/zones/${zoneId}/current`).catch(() => null),
          api<BayOut[]>(`/zones/${zoneId}/bays`).catch(() => null),
        ]);

        setZone(zoneData);
        setLive(liveData);
        setFacilities(facData);
        setCrowd(crowdData);
        setBays(bayData);
      } catch (err) {
        if (!silent) setError(describeApiError(err));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [zoneId]
  );

  // Load AI availability probability estimate
  const fetchEstimate = useCallback(async () => {
    try {
      const est = await api<AvailabilityOut>("/availability/estimate", {
        method: "POST",
        body: {
          zone_id: zoneId,
          arrival_time: arrival,
          origin: { lat: 20.2961, lon: 85.8245 },
          use_travel_time: useTravelTime,
          vehicle_category: selectedCategory,
        },
      });
      setEstimate(est);
      setEstimateError(null);
    } catch (err) {
      setEstimate(null); // never leave a stale probability on screen after a failed request
      setEstimateError(describeApiError(err));
    }
  }, [zoneId, arrival, useTravelTime, selectedCategory]);

  useEffect(() => {
    fetchZoneData();
  }, [fetchZoneData]);

  useEffect(() => {
    fetchEstimate();
  }, [fetchEstimate]);

  // SSE lifecycle independent of callback identities (latest callbacks held in refs)
  const refreshRef = useRef({ zone: fetchZoneData, estimate: fetchEstimate });
  refreshRef.current = { zone: fetchZoneData, estimate: fetchEstimate };

  useFocusEffect(
    useCallback(() => {
      const refresh = () => {
        void refreshRef.current.zone(true);
        void refreshRef.current.estimate();
      };
      const closeStream = openStream({
        onEvent: (event: LiveEvent) => {
          if (
            (event.event === "bay_changed" || event.event === "zone_summary" || event.event === "crowd_changed") &&
            event.data.zone_id === zoneId
          ) {
            refresh();
          }
        },
        onResync: refresh,
      });
      return () => {
        closeStream();
      };
    }, [zoneId])
  );

  // Navigate to external Maps app
  const handleNavigate = () => {
    if (!zone) return;
    const { lat, lon } = zone.centroid;
    const label = encodeURIComponent(zone.name);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lon}`,
      android: `geo:0,0?q=${lat},${lon}(${label})`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
    });

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`);
      }
    });
  };

  // Instant Parking Reservation Creation via POST /parking-reservations
  const handleCreateReservation = async () => {
    const targetFacility = facilities.find((f) => f.supports_reservation) || facilities[0];
    if (!targetFacility) {
      Alert.alert("Reservation Error", "No reservation-supported facility in this zone.");
      return;
    }

    if (zone && !zone.reservations_enabled) {
      Alert.alert("Notice", "Advance reservations are not currently enabled for this zone.");
      return;
    }

    const startTime = arrival ? new Date(arrival) : new Date(Date.now() + 5 * 60000);
    const endTime = new Date(startTime.getTime() + 60 * 60000); // 1-hour booking slot

    const createPayload: ParkingReservationCreate = {
      facility_id: targetFacility.id,
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      vehicle_category: selectedCategory,
    };

    setSubmitting(true);
    try {
      const res = await api<ReservationOut>("/parking-reservations", {
        method: "POST",
        body: createPayload,
      });

      Alert.alert(
        "Parking Reserved!",
        `Booking Reference: ${res.reference}\nValid until: ${new Date(res.end).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        [
          {
            text: "View My Bookings",
            onPress: () => navigation.navigate("Bookings"),
          },
          { text: "OK" },
        ]
      );
    } catch (err) {
      Alert.alert("Reservation Failed", describeApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0284C7" />
        <Text style={styles.loadingText}>Loading parking zone details...</Text>
      </View>
    );
  }

  if (error || !zone) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>⚠️ {error || "Zone details could not be loaded"}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => void fetchZoneData()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const primaryFacility = facilities[0];
  const scheduleText = formatSchedule(zone);
  const vehiclesText = formatVehicles(zone, bays);
  const isLive = live?.data_state === "live";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* 1. Header & Quick Actions */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.zoneTitle}>{zone.name}</Text>
            <Text style={styles.zoneSubtitle}>
              {zone.kind.toUpperCase()} ZONE • {zone.capacity} REGISTERED BAYS
            </Text>
          </View>
          <TouchableOpacity style={styles.navButton} onPress={handleNavigate} activeOpacity={0.8}>
            <Text style={styles.navButtonText}>🗺️ Navigate</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metaRow}>
          <DataBadge
            dataState={live?.data_state}
            provenance={live?.provenance}
            observedAt={live?.observed_at}
          />
        </View>
      </View>

      {/* 2. Live Bay Occupancy Status (Data Truth Enforced) */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>CURRENT LIVE OCCUPANCY</Text>
        <View style={styles.liveGrid}>
          <View style={[styles.liveBox, styles.liveBoxFree]}>
            <Text style={styles.liveCount}>
              {live?.available_bays !== null && live?.available_bays !== undefined
                ? live.available_bays
                : "—"}
            </Text>
            <Text style={styles.liveLabel}>
              {live?.available_bays !== null ? "Available Bays" : "No Live Data"}
            </Text>
          </View>

          <View style={[styles.liveBox, styles.liveBoxOccupied]}>
            <Text style={styles.liveCount}>
              {live?.occupied_bays !== null && live?.occupied_bays !== undefined
                ? live.occupied_bays
                : "—"}
            </Text>
            <Text style={styles.liveLabel}>Occupied Bays</Text>
          </View>
        </View>

        {!isLive && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Real-time camera observations are currently delayed. Numbers reflect last known state.
            </Text>
          </View>
        )}

        {crowd && (
          <View style={styles.crowdRow}>
            <CrowdChip level={crowd.level} />
            <Text style={styles.crowdDetails}>
              {crowd.vehicles ?? "—"} vehicles • {crowd.pedestrians ?? "—"} pedestrians in area
            </Text>
          </View>
        )}
      </View>

      {/* 3. AI Predictive Parking Availability (Module 7 Contract) */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>AI PARKING AVAILABILITY ESTIMATE</Text>
        <Text style={styles.sectionSubtitle}>
          Predicts probability of finding parking based on Monte Carlo arrivals
        </Text>

        <ArrivalTimeSelector value={arrival} onChange={setArrival} />

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Consider Live Travel Time in Prediction</Text>
          <Switch
            value={useTravelTime}
            onValueChange={setUseTravelTime}
            trackColor={{ false: "#334155", true: "#0284C7" }}
            thumbColor={useTravelTime ? "#38BDF8" : "#94A3B8"}
          />
        </View>

        {!estimate && estimateError && (
          <View style={styles.estimateBox}>
            <Text style={styles.probabilityText}>Estimate unavailable</Text>
            <Text style={styles.estimateSubLabel}>{estimateError}</Text>
          </View>
        )}

        {estimate && (
          <View style={styles.estimateBox}>
            <View style={styles.estimateMainRow}>
              <View>
                <Text style={styles.probabilityText}>
                  {estimate.probability !== null
                    ? `${Math.round(estimate.probability * 100)}%`
                    : "Estimate unavailable"}
                </Text>
                <Text style={styles.estimateSubLabel}>
                  {estimate.probability !== null
                    ? "Probability of Finding a Free Bay"
                    : estimate.reason || "No reason provided by the server"}
                </Text>
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <DataBadge
                  reliability={estimate.reliability}
                  provenance={estimate.provenance}
                  compact
                />
              </View>
            </View>

            {estimate.expected_available !== null && estimate.expected_available !== undefined && (
              <View style={styles.estimateStatsRow}>
                <Text style={styles.estimateStat}>
                  Expected Free Bays:{" "}
                  <Text style={styles.boldWhite}>{estimate.expected_available.toFixed(1)}</Text>
                </Text>
                <Text style={styles.estimateStat}>
                  Expected Occupancy:{" "}
                  <Text style={styles.boldWhite}>{estimate.expected_occupancy_pct != null ? `${estimate.expected_occupancy_pct.toFixed(0)}%` : "—"}</Text>
                </Text>
              </View>
            )}

            {estimate.uncertainty?.lower != null && estimate.uncertainty?.upper != null && (
              <Text style={styles.uncertaintyText}>
                Uncertainty range: [{estimate.uncertainty.lower} – {estimate.uncertainty.upper} bays free]
              </Text>
            )}
          </View>
        )}
      </View>

      {/* 4. Operating Schedule & Fee Configuration */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>SCHEDULE & TARIFF</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>🕒 Operating Hours:</Text>
          <Text style={styles.infoVal}>{scheduleText}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>💳 Parking Fee:</Text>
          <Text style={styles.infoVal}>
            {primaryFacility?.fee ? `₹${primaryFacility.fee.rate_per_hour} / hr` : "Fee not available"}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>🚗 Permitted Vehicles:</Text>
          <Text style={styles.infoVal}>{vehiclesText}</Text>
        </View>
      </View>

      {/* 5. Advance Parking Reservation Action */}
      <View style={styles.actionCard}>
        {(() => {
          const bookingDisabled =
            !zone.reservations_enabled || !facilities.some((f) => f.supports_reservation);
          return (
            <>
              <TouchableOpacity
                style={[styles.reserveButton, (submitting || bookingDisabled) && styles.reserveButtonDisabled]}
                onPress={handleCreateReservation}
                disabled={submitting || bookingDisabled}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.reserveButtonText}>
                    {bookingDisabled ? "Reservations Disabled for This Zone" : "⚡ Reserve Parking Slot Now"}
                  </Text>
                )}
              </TouchableOpacity>
              <Text style={styles.disclaimerText}>
                {bookingDisabled
                  ? "Advance reservations are not enabled at this zone."
                  : "Exclusion constraints guarantee anti-overlap. Cancel up to 15m prior without penalty."}
              </Text>
            </>
          );
        })()}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 14,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  zoneTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  zoneSubtitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#38BDF8",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  navButton: {
    backgroundColor: "#0284C7",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 10,
  },
  navButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  metaRow: {
    marginTop: 12,
  },
  sectionCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 12,
  },
  liveGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  liveBox: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  liveBoxFree: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "#10B981",
  },
  liveBoxOccupied: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "#EF4444",
  },
  liveCount: {
    fontSize: 28,
    fontWeight: "900",
    color: "#F8FAFC",
  },
  liveLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
    marginTop: 2,
  },
  warningBox: {
    backgroundColor: "#451A03",
    borderColor: "#B45309",
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  warningText: {
    fontSize: 11,
    color: "#FDE68A",
  },
  crowdRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  crowdDetails: {
    fontSize: 12,
    color: "#94A3B8",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
  },
  toggleLabel: {
    fontSize: 13,
    color: "#CBD5E1",
    fontWeight: "500",
  },
  estimateBox: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#334155",
    marginTop: 8,
  },
  estimateMainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  probabilityText: {
    fontSize: 32,
    fontWeight: "900",
    color: "#38BDF8",
  },
  estimateSubLabel: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  estimateStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
  },
  estimateStat: {
    fontSize: 12,
    color: "#94A3B8",
  },
  boldWhite: {
    color: "#F8FAFC",
    fontWeight: "700",
  },
  uncertaintyText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 6,
    fontStyle: "italic",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  infoKey: {
    fontSize: 13,
    color: "#94A3B8",
  },
  infoVal: {
    fontSize: 13,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  actionCard: {
    marginTop: 8,
    marginBottom: 20,
  },
  reserveButton: {
    backgroundColor: "#0284C7",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0284C7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  reserveButtonDisabled: {
    opacity: 0.6,
  },
  reserveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  disclaimerText: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    color: "#94A3B8",
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: "#F87171",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#0284C7",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
