import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api, describeApiError } from "../api/client";
import { Page, ReservationOut, ReservationStatus } from "../api/types";
import { formatIstDate, formatIstRange, parseIstInput, toIstInputParts } from "../utils/time";

type Filter = "all" | "active" | "completed" | "cancelled";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const ACTIVE: ReservationStatus[] = ["pending", "confirmed", "checked_in", "in_progress"];
const CANCELLED: ReservationStatus[] = ["cancelled", "no_show", "expired"];

function matchesFilter(status: ReservationStatus, f: Filter): boolean {
  if (f === "all") return true;
  if (f === "active") return ACTIVE.includes(status);
  if (f === "completed") return status === "completed";
  return CANCELLED.includes(status);
}

export function BookingsScreen(): JSX.Element {
  const [bookings, setBookings] = useState<ReservationOut[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  // Reschedule state
  const [rescheduleTarget, setRescheduleTarget] = useState<ReservationOut | null>(null);
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setError(null);
    try {
      const data = await api<Page<ReservationOut>>("/parking-reservations");
      setBookings(data.items);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchBookings();
  }, [fetchBookings]);

  const visible = useMemo(() => bookings.filter((b) => matchesFilter(b.status, filter)), [bookings, filter]);

  // Status transitions: never DELETE, always PATCH .../status
  const handleTransition = async (id: string, toStatus: ReservationStatus) => {
    setBusyId(id);
    try {
      await api<ReservationOut>(`/parking-reservations/${id}/status`, { method: "PATCH", body: { to_status: toStatus } });
      await fetchBookings();
    } catch (err) {
      Alert.alert("Action Failed", describeApiError(err));
    } finally {
      setBusyId(null);
    }
  };

  const confirmCancel = (item: ReservationOut) => {
    Alert.alert("Cancel reservation?", `Cancel ${item.reference}? This frees the bay for other drivers.`, [
      { text: "Keep it", style: "cancel" },
      { text: "Cancel reservation", style: "destructive", onPress: () => void handleTransition(item.id, "cancelled") },
    ]);
  };

  const openReschedule = (item: ReservationOut) => {
    const parts = toIstInputParts(item.start);
    setCustomDate(parts.date);
    setCustomTime(parts.time);
    setRescheduleError(null);
    setRescheduleTarget(item);
  };

  // PUT .../schedule with {start, end}; duration is preserved
  const submitReschedule = async (newStart: Date) => {
    if (!rescheduleTarget) return;
    const target = rescheduleTarget;
    const durationMs = new Date(target.end).getTime() - new Date(target.start).getTime();
    if (newStart.getTime() < Date.now()) {
      setRescheduleError("Choose a start time in the future.");
      return;
    }
    const newEnd = new Date(newStart.getTime() + durationMs);
    setBusyId(target.id);
    setRescheduleTarget(null);
    try {
      await api<ReservationOut>(`/parking-reservations/${target.id}/schedule`, {
        method: "PUT",
        body: { start: newStart.toISOString(), end: newEnd.toISOString() },
      });
      await fetchBookings();
      Alert.alert("Success", "Reservation rescheduled successfully.");
    } catch (err) {
      Alert.alert("Reschedule Conflict", describeApiError(err));
    } finally {
      setBusyId(null);
    }
  };

  const shiftBy = (mins: number) => {
    if (!rescheduleTarget) return;
    void submitReschedule(new Date(new Date(rescheduleTarget.start).getTime() + mins * 60000));
  };

  const applyCustom = () => {
    const d = parseIstInput(customDate.trim(), customTime.trim());
    if (!d) {
      setRescheduleError("Use date YYYY-MM-DD and time HH:MM (IST).");
      return;
    }
    void submitReschedule(d);
  };

  const getStatusColor = (status: ReservationStatus) => {
    switch (status) {
      case "confirmed":
        return { bg: "#0369A1", text: "#E0F2FE" };
      case "checked_in":
        return { bg: "#0D9488", text: "#CCFBF1" };
      case "in_progress":
        return { bg: "#16A34A", text: "#DCFCE7" };
      case "completed":
        return { bg: "#334155", text: "#94A3B8" };
      case "cancelled":
      case "expired":
      case "no_show":
        return { bg: "#450A0A", text: "#FCA5A5" };
      default:
        return { bg: "#1E293B", text: "#E2E8F0" };
    }
  };

  const renderBooking = ({ item }: { item: ReservationOut }) => {
    const statusTheme = getStatusColor(item.status);
    const isBusy = busyId === item.id;
    const isTerminal = ["completed", "cancelled", "no_show", "expired"].includes(item.status);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.referenceText}>{item.reference}</Text>
            <Text style={styles.bayText}>Bay: {item.bay_id} • Vehicle: {item.vehicle_category.replace(/_/g, " ")}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusTheme.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusTheme.text }]}>
              {item.status.replace(/_/g, " ").toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.timeBox}>
          <Text style={styles.timeDate}>{formatIstDate(item.start)}</Text>
          <Text style={styles.timeHours}>{formatIstRange(item.start, item.end)} IST</Text>
        </View>

        {item.status === "pending" && <Text style={styles.pendingNote}>⏳ Awaiting operator confirmation</Text>}

        {!isTerminal && item.status !== "pending" && (
          <View style={styles.actionRow}>
            {item.status === "confirmed" && (
              <>
                <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => void handleTransition(item.id, "checked_in")} disabled={isBusy}>
                  <Text style={styles.btnText}>Check In</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => openReschedule(item)} disabled={isBusy}>
                  <Text style={styles.btnOutlineText}>Reschedule</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={() => confirmCancel(item)} disabled={isBusy}>
                  <Text style={styles.btnDangerText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}

            {item.status === "checked_in" && (
              <>
                <TouchableOpacity style={[styles.btn, styles.btnSuccess]} onPress={() => void handleTransition(item.id, "in_progress")} disabled={isBusy}>
                  <Text style={styles.btnText}>Start Parking</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={() => confirmCancel(item)} disabled={isBusy}>
                  <Text style={styles.btnDangerText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}

            {item.status === "in_progress" && (
              <TouchableOpacity style={[styles.btn, styles.btnSuccess]} onPress={() => void handleTransition(item.id, "completed")} disabled={isBusy}>
                <Text style={styles.btnText}>Complete & Depart</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabsRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f.key} style={[styles.tab, filter === f.key && styles.tabActive]} onPress={() => setFilter(f.key)}>
            <Text style={[styles.tabText, filter === f.key && styles.tabTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0284C7" />
          <Text style={styles.loadingText}>Fetching your parking reservations...</Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          renderItem={renderBooking}
          contentContainerStyle={styles.listContent}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void fetchBookings();
              }}
              tintColor="#0284C7"
            />
          }
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyTitle}>{filter === "all" ? "No Reservations" : "Nothing in this tab"}</Text>
              <Text style={styles.emptySub}>
                {filter === "all"
                  ? "Explore nearby zones on the Map tab to book your legal parking bay in advance."
                  : "No reservations match this filter."}
              </Text>
            </View>
          }
        />
      )}

      {/* Reschedule Modal */}
      <Modal visible={!!rescheduleTarget} transparent animationType="fade" onRequestClose={() => setRescheduleTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reschedule Parking Slot</Text>
            <Text style={styles.modalSub}>
              Shift your booking or pick a new start time. Duration is kept; the server checks for overlaps.
            </Text>

            <View style={styles.modalOptions}>
              {[30, 60, 120].map((m) => (
                <TouchableOpacity key={m} style={styles.modalOptBtn} onPress={() => shiftBy(m)}>
                  <Text style={styles.modalOptText}>{m === 30 ? "+30 Minutes" : m === 60 ? "+1 Hour" : "+2 Hours"}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>OR PICK A START (IST)</Text>
            <View style={styles.inputRow}>
              <TextInput style={styles.input} value={customDate} onChangeText={setCustomDate} placeholder="YYYY-MM-DD" placeholderTextColor="#64748B" />
              <TextInput style={styles.input} value={customTime} onChangeText={setCustomTime} placeholder="HH:MM" placeholderTextColor="#64748B" />
            </View>
            {rescheduleError && <Text style={styles.modalError}>{rescheduleError}</Text>}
            <TouchableOpacity style={[styles.modalOptBtn, { marginTop: 10 }]} onPress={applyCustom}>
              <Text style={styles.modalOptText}>Apply custom time</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setRescheduleTarget(null)}>
              <Text style={styles.modalCancelText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tabsRow: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: "#1E293B", borderWidth: 1, borderColor: "#334155" },
  tabActive: { backgroundColor: "#0284C7", borderColor: "#38BDF8" },
  tabText: { color: "#CBD5E1", fontSize: 12, fontWeight: "600" },
  tabTextActive: { color: "#FFFFFF", fontWeight: "800" },
  pendingNote: { marginTop: 12, color: "#FDE68A", fontSize: 12, fontWeight: "600" },
  input: { backgroundColor: "#0F172A", borderRadius: 8, borderWidth: 1, borderColor: "#334155", paddingHorizontal: 12, paddingVertical: 9, color: "#F8FAFC", fontSize: 14, flex: 1 },
  inputRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  inputLabel: { color: "#94A3B8", fontSize: 11, fontWeight: "700", marginTop: 14, letterSpacing: 0.5 },
  modalError: { color: "#FCA5A5", fontSize: 12, marginTop: 8 },
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  referenceText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  bayText: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  timeBox: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  timeDate: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  timeHours: {
    fontSize: 15,
    fontWeight: "800",
    color: "#38BDF8",
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: {
    backgroundColor: "#0284C7",
  },
  btnSuccess: {
    backgroundColor: "#16A34A",
  },
  btnOutline: {
    backgroundColor: "#334155",
    borderWidth: 1,
    borderColor: "#475569",
  },
  btnDanger: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  btnOutlineText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "600",
  },
  btnDangerText: {
    color: "#FCA5A5",
    fontSize: 12,
    fontWeight: "600",
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
  emptyTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySub: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderColor: "#334155",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  modalSub: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 16,
  },
  modalOptions: {
    gap: 8,
  },
  modalOptBtn: {
    backgroundColor: "#0F172A",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#0284C7",
    alignItems: "center",
  },
  modalOptText: {
    color: "#38BDF8",
    fontWeight: "700",
    fontSize: 14,
  },
  modalCancelBtn: {
    marginTop: 14,
    paddingVertical: 8,
    alignItems: "center",
  },
  modalCancelText: {
    color: "#94A3B8",
    fontSize: 13,
  },
});
