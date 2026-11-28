import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, UrlTile } from "react-native-maps";
import * as Location from "expo-location";
import { useFocusEffect } from "@react-navigation/native";
import { api, describeApiError, openStream } from "../api/client";
import { DataState, LatLon, LiveEvent, NearbyZoneOut, VehicleCategory, ZoneLiveOut } from "../api/types";
import { DataBadge } from "../components/DataBadge";
import { getDayNightStatus } from "../utils/time";

// Default coordinate: Bhubaneswar City Center (Master Canteen / Station Square, Odisha)
const BHUBANESWAR_CENTER: LatLon = {
  lat: 20.2961,
  lon: 85.8245,
};

const MANUAL_AREA_PRESETS: { label: string; coords: LatLon }[] = [
  { label: "Janpath", coords: { lat: 20.2708, lon: 85.8436 } },
  { label: "Saheed Nagar", coords: { lat: 20.2922, lon: 85.8504 } },
  { label: "Patia", coords: { lat: 20.3541, lon: 85.8172 } },
  { label: "Old Town", coords: { lat: 20.2405, lon: 85.834 } },
];

const getMarkerColor = (dataState: DataState, available: number | null): string => {
  if (dataState === "unavailable" || dataState === "unknown" || available === null) return "#64748B"; // grey
  if (dataState === "stale") return "#F59E0B"; // amber
  if (available > 10) return "#10B981"; // green
  if (available > 0) return "#0284C7"; // blue
  return "#EF4444"; // full
};

interface ZoneRowProps {
  item: NearbyZoneOut;
  onPress: (zoneId: string) => void;
}

// Memoised row: only re-renders when its own item changes (SSE patches replace a single object).
const ZoneRow = React.memo(function ZoneRow({ item, onPress }: ZoneRowProps): JSX.Element {
  const isLive = item.data_state === "live";
  const availableText =
    item.available_bays !== null ? `${item.available_bays} bays free` : "No live data (estimate unavailable)";

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => onPress(item.zone.id)}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.zoneName} numberOfLines={1}>
            {item.zone.name}
          </Text>
          <Text style={styles.distanceText}>
            📍 {Math.round(item.distance_m)}m away • Capacity: {item.zone.capacity}
          </Text>
        </View>
        <View style={[styles.statusIndicator, { backgroundColor: getMarkerColor(item.data_state, item.available_bays) }]}>
          <Text style={styles.statusIndicatorText}>{item.available_bays !== null ? item.available_bays : "?"}</Text>
        </View>
      </View>

      <View style={styles.availabilityRow}>
        <Text style={[styles.availabilityText, !isLive && styles.availabilityTextMuted]}>{availableText}</Text>
      </View>

      <View style={styles.badgeRow}>
        <DataBadge dataState={item.data_state} provenance={item.provenance} observedAt={item.observed_at} compact />
      </View>
    </TouchableOpacity>
  );
});

// Self-contained TimeHeader with isolated timer so clock ticks never re-render the MapView or list
const TimeHeader = React.memo(function TimeHeader({ locationName }: { locationName: string }): JSX.Element {
  const [timeStatus, setTimeStatus] = useState(getDayNightStatus());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStatus(getDayNightStatus());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.timeHeader}>
      <View style={styles.timeHeaderLeft}>
        <Text style={styles.dayNightIcon}>{timeStatus.icon}</Text>
        <View>
          <Text style={styles.greetingText}>
            {timeStatus.greeting} • {timeStatus.label}
          </Text>
          <Text style={styles.locationText}>📍 {locationName}</Text>
        </View>
      </View>
      <View style={styles.timeHeaderRight}>
        <Text style={styles.clockText}>{timeStatus.timeStr}</Text>
        <Text style={styles.timezoneBadge}>IST (UTC+05:30)</Text>
      </View>
    </View>
  );
});

// Memoized ZoneMarker with tracksViewChanges management: turns off bitmap tracking after initial render to eliminate lag
const ZoneMarker = React.memo(function ZoneMarker({
  item,
  onPress,
}: {
  item: NearbyZoneOut;
  onPress: (zoneId: string) => void;
}): JSX.Element {
  const [tracksViewChanges, setTracksViewChanges] = useState<boolean>(true);

  useEffect(() => {
    setTracksViewChanges(true);
    const t = setTimeout(() => setTracksViewChanges(false), 300);
    return () => clearTimeout(t);
  }, [item.available_bays, item.data_state]);

  const markerColor = getMarkerColor(item.data_state, item.available_bays);
  const label = item.available_bays !== null ? `${item.available_bays}` : "—";

  return (
    <Marker
      coordinate={{
        latitude: item.zone.centroid.lat,
        longitude: item.zone.centroid.lon,
      }}
      tracksViewChanges={tracksViewChanges}
      title={item.zone.name}
      description={
        item.available_bays !== null
          ? `${item.available_bays} free / ${item.zone.capacity} total bays`
          : "Live data unavailable"
      }
      onCalloutPress={() => onPress(item.zone.id)}
    >
      <View style={[styles.customMarker, { backgroundColor: markerColor }]}>
        <Text style={styles.customMarkerText}>{label}</Text>
      </View>
    </Marker>
  );
});

export function MapScreen({ navigation }: { navigation: any }): JSX.Element {
  const [userLocation, setUserLocation] = useState<LatLon>(BHUBANESWAR_CENTER);
  const [zones, setZones] = useState<NearbyZoneOut[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [streamConnected, setStreamConnected] = useState<boolean>(false);
  const [selectedCategory] = useState<VehicleCategory>("car");
  const [locationName, setLocationName] = useState("Bhubaneswar (Central)");
  const [locationDenied, setLocationDenied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const mapRef = useRef<MapView | null>(null);

  // 1. Request location on mount with accurate reverse geocoding fallback
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          setLocationDenied(false);
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const coords: LatLon = {
            lat: loc.coords.latitude,
            lon: loc.coords.longitude,
          };
          setUserLocation(coords);

          // Animate map smoothly to accurate location
          mapRef.current?.animateToRegion(
            {
              latitude: coords.lat,
              longitude: coords.lon,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            },
            1000
          );

          // Resolve friendly area name if available
          try {
            const places = await Location.reverseGeocodeAsync({
              latitude: coords.lat,
              longitude: coords.lon,
            });
            if (places && places[0]) {
              const p = places[0];
              const name = p.district || p.subregion || p.city || p.name || "Bhubaneswar";
              setLocationName(`${name}, Odisha`);
            }
          } catch {
            setLocationName("Bhubaneswar, Odisha");
          }
        } else {
          setLocationDenied(true);
          setLocationName("Bhubaneswar Central (Manual)");
        }
      } catch {
        // Keep Bhubaneswar center on denied or simulated environment
        setLocationDenied(true);
        setLocationName("Bhubaneswar Central, Odisha");
      }
    })();
  }, []);

  // 2. Fetch nearby zones
  const fetchNearbyZones = useCallback(async () => {
    setError(null);
    try {
      const data = await api<NearbyZoneOut[]>("/zones/nearby", {
        query: {
          lat: userLocation.lat,
          lon: userLocation.lon,
          radius_m: 5000,
          vehicle_category: selectedCategory,
        },
      });
      // Sort by distance ascending
      const sorted = [...data].sort((a, b) => a.distance_m - b.distance_m);
      setZones(sorted);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userLocation.lat, userLocation.lon, selectedCategory]);

  useEffect(() => {
    fetchNearbyZones();
  }, [fetchNearbyZones]);

  // Stable handles so effects/rows never depend on changing function identities
  const fetchRef = useRef(fetchNearbyZones);
  fetchRef.current = fetchNearbyZones;
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;
  const inflightZones = useRef<Set<string>>(new Set());

  const openZone = useCallback((zoneId: string) => {
    navigationRef.current.navigate("ZoneDetail", { zoneId });
  }, []);

  // 3. In-place patch of one zone from /zones/{id}/live (no spinner, no list reload)
  const patchZoneLive = useCallback(async (zoneId: string) => {
    if (inflightZones.current.has(zoneId)) return;
    inflightZones.current.add(zoneId);
    try {
      const live = await api<ZoneLiveOut>(`/zones/${zoneId}/live`);
      setZones((prev) =>
        prev.map((z) =>
          z.zone.id === zoneId
            ? {
                ...z,
                available_bays: live.available_bays,
                occupied_bays: live.occupied_bays,
                unknown_bays: live.unknown_bays,
                data_state: live.data_state,
                observed_at: live.observed_at,
                provenance: live.provenance,
              }
            : z
        )
      );
    } catch {
      // keep last known values; the badge age keeps ticking so staleness stays visible
    } finally {
      inflightZones.current.delete(zoneId);
    }
  }, []);

  // 4. SSE lifecycle is independent of fetchNearbyZones identity
  useFocusEffect(
    useCallback(() => {
      const closeStream = openStream({
        onEvent: (event: LiveEvent) => {
          if (event.event === "bay_changed" || event.event === "zone_summary") {
            void patchZoneLive(event.data.zone_id);
          }
        },
        onResync: () => {
          void fetchRef.current();
        },
        onState: (connected: boolean) => {
          setStreamConnected(connected);
        },
      });
      return () => {
        closeStream();
      };
    }, [patchZoneLive])
  );

  const renderZoneItem = useCallback(
    ({ item }: { item: NearbyZoneOut }) => <ZoneRow item={item} onPress={openZone} />,
    [openZone]
  );

  const selectManualArea = (label: string, coords: LatLon) => {
    setUserLocation(coords);
    setLocationName(`${label}, Bhubaneswar`);
    mapRef.current?.animateToRegion(
      {
        latitude: coords.lat,
        longitude: coords.lon,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      },
      600
    );
  };

  const filteredZones = searchQuery.trim()
    ? zones.filter((z) => z.zone.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : zones;
  const recenterMap = () => {
    mapRef.current?.animateToRegion(
      {
        latitude: userLocation.lat,
        longitude: userLocation.lon,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      },
      600
    );
  };

  return (
    <View style={styles.container}>
      {/* Real-time Day/Night & Location Banner Header (Isolated memoized component) */}
      <TimeHeader locationName={locationName} />

      {/* 1. Map Section with Robust Fallback and Dual Tiles */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          /* Standard mapType allows native Google/Apple vector tiles when UrlTile is loading */
          mapType={Platform.OS === "android" ? "standard" : "standard"}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          initialRegion={{
            latitude: userLocation.lat,
            longitude: userLocation.lon,
            latitudeDelta: 0.06,
            longitudeDelta: 0.06,
          }}
        >
          {/* OpenStreetMap Raster Tile Layer for open cartography */}
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
            shouldReplaceMapContent={false}
            tileSize={256}
          />

          {/* User Location Marker */}
          <Marker
            coordinate={{
              latitude: userLocation.lat,
              longitude: userLocation.lon,
            }}
            title="My Current Location"
            description={locationName}
            pinColor="#3B82F6"
          />

          {/* Optimized Zone Markers with managed tracksViewChanges */}
          {zones.map((item) => (
            <ZoneMarker key={item.zone.id} item={item} onPress={openZone} />
          ))}
        </MapView>

        {/* Live SSE Stream Status Overlay */}
        <View style={styles.streamStatusBadge}>
          <View style={[styles.pulseDot, { backgroundColor: streamConnected ? "#22C55E" : "#EAB308" }]} />
          <Text style={styles.streamStatusText}>
            {streamConnected ? "Live SSE Stream Active" : "Connecting Live Feed..."}
          </Text>
        </View>

        {/* Recenter Button */}
        <TouchableOpacity style={styles.recenterButton} onPress={recenterMap} activeOpacity={0.8}>
          <Text style={styles.recenterButtonText}>🎯</Text>
        </TouchableOpacity>

        {/* Map Attribution */}
        <View style={styles.attributionBadge}>
          <Text style={styles.attributionText}>© OpenStreetMap contributors • ParkSMART</Text>
        </View>
      </View>

      {/* 2. Zone List Section */}
      <View style={styles.listContainer}>
        {locationDenied && (
          <View style={styles.manualSearchBox}>
            <Text style={styles.manualSearchTitle}>Location access denied — search or pick an area</Text>
            <TextInput
              style={styles.manualSearchInput}
              placeholder="Search zone name (e.g. Janpath, Patia)"
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <View style={styles.presetChipsRow}>
              {MANUAL_AREA_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={styles.presetChip}
                  onPress={() => selectManualArea(preset.label, preset.coords)}
                >
                  <Text style={styles.presetChipText}>{preset.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.listHeaderRow}>
          <Text style={styles.listTitle}>NEARBY PARKING ZONES</Text>
          <Text style={styles.zoneCountText}>{filteredZones.length} Found</Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#0284C7" />
            <Text style={styles.loadingText}>Searching nearby parking...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredZones}
            keyExtractor={(item) => item.zone.id}
            renderItem={renderZoneItem}
            contentContainerStyle={styles.listContent}
            initialNumToRender={5}
            maxToRenderPerBatch={6}
            windowSize={5}
            removeClippedSubviews={Platform.OS === "android"}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  void fetchNearbyZones();
                }}
                tintColor="#0284C7"
              />
            }
            ListEmptyComponent={
              <View style={styles.centerBox}>
                <Text style={styles.emptyText}>No parking zones found in this area.</Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  timeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  timeHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  dayNightIcon: {
    fontSize: 22,
  },
  greetingText: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "700",
  },
  locationText: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  timeHeaderRight: {
    alignItems: "flex-end",
  },
  clockText: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  timezoneBadge: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "600",
  },
  mapContainer: {
    height: "44%",
    width: "100%",
    position: "relative",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  customMarker: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  customMarkerText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  streamStatusBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  streamStatusText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "600",
  },
  recenterButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#1E293B",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#475569",
    elevation: 3,
  },
  recenterButtonText: {
    fontSize: 16,
  },
  attributionBadge: {
    position: "absolute",
    bottom: 6,
    right: 8,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  attributionText: {
    fontSize: 9,
    color: "#94A3B8",
  },
  listContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 12,
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  listTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.6,
  },
  zoneCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#38BDF8",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  zoneName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 2,
  },
  distanceText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  statusIndicator: {
    minWidth: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  statusIndicatorText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  availabilityRow: {
    marginTop: 8,
    marginBottom: 8,
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#38BDF8",
  },
  availabilityTextMuted: {
    color: "#94A3B8",
    fontWeight: "500",
  },
  badgeRow: {
    marginTop: 2,
  },
  errorBanner: {
    backgroundColor: "#450A0A",
    borderColor: "#991B1B",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 12,
    fontWeight: "600",
  },
  centerBox: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
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
  manualSearchBox: {
    backgroundColor: "#1E293B",
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  manualSearchTitle: {
    color: "#FDE68A",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6,
  },
  manualSearchInput: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: "#F8FAFC",
    fontSize: 12,
    marginBottom: 8,
  },
  presetChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  presetChip: {
    backgroundColor: "#334155",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  presetChipText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "600",
  },
});
