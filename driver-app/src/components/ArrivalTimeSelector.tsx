import React, { useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { formatIstDateTime } from "../utils/time";

interface ArrivalTimeSelectorProps {
  value: string | null; // ISO UTC or null for 'Now'
  onChange: (iso: string | null) => void;
  maxHorizonHours?: number;
}

interface PresetOption {
  label: string;
  offsetMinutes: number | null; // null represents "Now"
}

const PRESETS: PresetOption[] = [
  { label: "Now", offsetMinutes: null },
  { label: "+15m", offsetMinutes: 15 },
  { label: "+30m", offsetMinutes: 30 },
  { label: "+1h", offsetMinutes: 60 },
  { label: "+2h", offsetMinutes: 120 },
  { label: "+4h", offsetMinutes: 240 },
];

const CUSTOM = "Custom";

export const ArrivalTimeSelector: React.FC<ArrivalTimeSelectorProps> = ({
  value,
  onChange,
  maxHorizonHours = 168,
}) => {
  const [selectedLabel, setSelectedLabel] = useState<string>("Now");
  const [customOpen, setCustomOpen] = useState(false);
  const [customHours, setCustomHours] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);

  const handleSelectPreset = (preset: PresetOption) => {
    setSelectedLabel(preset.label);
    onChange(preset.offsetMinutes === null ? null : new Date(Date.now() + preset.offsetMinutes * 60000).toISOString());
  };

  const applyCustom = () => {
    const hours = Number(customHours.replace(",", "."));
    if (!Number.isFinite(hours) || hours <= 0) {
      setCustomError("Enter a number of hours greater than 0.");
      return;
    }
    if (hours > maxHorizonHours) {
      setCustomError(`Maximum is ${maxHorizonHours} hours (${Math.round(maxHorizonHours / 24)} days).`);
      return;
    }
    setCustomError(null);
    setSelectedLabel(CUSTOM);
    onChange(new Date(Date.now() + Math.round(hours * 60) * 60000).toISOString());
    setCustomOpen(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>EXPECTED ARRIVAL</Text>
      </View>

      <View style={styles.presetsRow}>
        {PRESETS.map((p) => {
          const isSelected = selectedLabel === p.label;
          return (
            <TouchableOpacity
              key={p.label}
              style={[styles.presetButton, isSelected && styles.presetButtonActive]}
              onPress={() => handleSelectPreset(p)}
              activeOpacity={0.7}
            >
              <Text style={[styles.presetText, isSelected && styles.presetTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[styles.presetButton, selectedLabel === CUSTOM && styles.presetButtonActive]}
          onPress={() => setCustomOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.presetText, selectedLabel === CUSTOM && styles.presetTextActive]}>Custom…</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.currentTimeLabel}>
        {value ? `Target: ${formatIstDateTime(value)}` : "Immediate arrival (now)"}
      </Text>

      <Modal visible={customOpen} transparent animationType="fade" onRequestClose={() => setCustomOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Arrive in how many hours?</Text>
            <Text style={styles.modalSub}>Up to {maxHorizonHours} hours ahead. Decimals allowed (e.g. 1.5).</Text>
            <TextInput
              style={styles.input}
              value={customHours}
              onChangeText={setCustomHours}
              keyboardType="decimal-pad"
              placeholder="e.g. 6"
              placeholderTextColor="#64748B"
            />
            {customError && <Text style={styles.errorText}>{customError}</Text>}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setCustomOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalApply} onPress={applyCustom}>
                <Text style={styles.modalApplyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: "#1E293B", borderRadius: 12, padding: 12, marginVertical: 8 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  title: { fontSize: 11, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.5 },
  currentTimeLabel: { fontSize: 12, fontWeight: "600", color: "#38BDF8", marginTop: 10 },
  presetsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  presetButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#334155",
    borderWidth: 1,
    borderColor: "#475569",
  },
  presetButtonActive: { backgroundColor: "#0284C7", borderColor: "#38BDF8" },
  presetText: { fontSize: 12, fontWeight: "600", color: "#E2E8F0" },
  presetTextActive: { color: "#FFFFFF", fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { backgroundColor: "#1E293B", borderRadius: 16, padding: 20, width: "100%", maxWidth: 340, borderWidth: 1, borderColor: "#334155" },
  modalTitle: { fontSize: 17, fontWeight: "800", color: "#F8FAFC" },
  modalSub: { fontSize: 12, color: "#94A3B8", marginTop: 4, marginBottom: 12 },
  input: { backgroundColor: "#0F172A", borderRadius: 10, borderWidth: 1, borderColor: "#334155", paddingHorizontal: 14, paddingVertical: 10, color: "#F8FAFC", fontSize: 15 },
  errorText: { color: "#FCA5A5", fontSize: 12, marginTop: 8 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 16 },
  modalCancel: { paddingHorizontal: 14, paddingVertical: 9 },
  modalCancelText: { color: "#94A3B8", fontWeight: "600" },
  modalApply: { backgroundColor: "#0284C7", paddingHorizontal: 18, paddingVertical: 9, borderRadius: 8 },
  modalApplyText: { color: "#FFFFFF", fontWeight: "800" },
});
