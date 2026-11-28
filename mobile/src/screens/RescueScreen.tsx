import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatIstTime } from '../config/apiConfig';
import { getStationsForCorridor } from '../services/mockFallback';
import { useRailStore } from '../stores/useRailStore';

const BUFFERS = [10, 15, 20, 30];

export const RescueScreen: React.FC = () => {
  const {
    activeCorridorId,
    selectedTrain,
    passengerStatus,
    destinationCode,
    transferBufferMins,
    rescue,
    setPassengerStatus,
    setDestinationCode,
    setTransferBufferMins,
  } = useRailStore();
  const [cabBooked, setCabBooked] = useState(false);

  const isKolkata = activeCorridorId === 'SER_HWH_KGP';
  const destinations = getStationsForCorridor(activeCorridorId);
  const highwayLabel = isKolkata ? 'Kona Expressway' : 'NH-16';

  const survival = rescue?.survival_probability_pct ?? 0;
  const riskColor =
    rescue?.risk_level === 'SAFE'
      ? '#059669'
      : rescue?.risk_level === 'WATCH'
        ? '#D97706'
        : '#D92D20';

  const handleBookCab = () => {
    setCabBooked(true);
    const deboardStation =
      rescue?.bailout_plan?.deboard_station_name ??
      (activeCorridorId === 'SER_HWH_KGP' ? 'Santragachi Junction' : 'Cuttack Junction');
    const targetDest =
      rescue?.bailout_plan?.destination_station_name ??
      (activeCorridorId === 'SER_HWH_KGP'
        ? destinationCode === 'KGP'
          ? 'Kharagpur Junction'
          : 'Howrah Junction'
        : destinationCode === 'PURI'
          ? 'Puri Terminus'
          : 'Bhubaneswar');
    const highway =
      activeCorridorId === 'SER_HWH_KGP' ? 'NH-116 / Kona Expressway' : 'NH-16';
    Alert.alert(
      `${highway} Rescue Cab Reserved (Demo)`,
      `Pickup arranged at ${deboardStation} to ${targetDest}.`
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.label}>CONNECTION GUARD · TRAIN {selectedTrain}</Text>
        <Text style={styles.heading}>Target Destination</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
          <View style={styles.destRow}>
            {destinations.map((stn) => (
              <Pressable
                key={stn.station_code}
                onPress={() => {
                  setCabBooked(false);
                  setDestinationCode(stn.station_code);
                }}
                style={[
                  styles.destChip,
                  { paddingHorizontal: 12, flex: 0 },
                  destinationCode === stn.station_code && styles.destChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.destChipText,
                    destinationCode === stn.station_code && styles.destChipTextActive,
                  ]}
                >
                  {stn.station_name} ({stn.station_code})
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Text style={[styles.heading, { marginTop: 12 }]}>Transfer Buffer</Text>
        <View style={styles.destRow}>
          {BUFFERS.map((mins) => (
            <Pressable
              key={mins}
              onPress={() => setTransferBufferMins(mins)}
              style={[
                styles.destChip,
                transferBufferMins === mins && styles.destChipActive,
              ]}
            >
              <Text
                style={[
                  styles.destChipText,
                  transferBufferMins === mins && styles.destChipTextActive,
                ]}
              >
                {mins}m
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.heading, { marginTop: 12 }]}>Boarding Status</Text>
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setPassengerStatus('PRE_BOARDING')}
            style={[
              styles.toggleBtn,
              passengerStatus === 'PRE_BOARDING' && styles.toggleBtnActive,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                passengerStatus === 'PRE_BOARDING' && styles.toggleTextActive,
              ]}
            >
              At Station
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setPassengerStatus('ON_BOARD')}
            style={[
              styles.toggleBtn,
              passengerStatus === 'ON_BOARD' && styles.toggleBtnActive,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                passengerStatus === 'ON_BOARD' && styles.toggleTextActive,
              ]}
            >
              On Board
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Survival Meter */}
      <View style={styles.card}>
        <Text style={styles.label}>CONNECTION SURVIVAL PROBABILITY</Text>
        <View style={styles.survivalRow}>
          <Text style={[styles.survivalPct, { color: riskColor }]}>
            {survival.toFixed(1)}%
          </Text>
          <Text style={[styles.riskBadge, { color: riskColor }]}>
            {rescue?.risk_level ?? 'EVALUATING'}
          </Text>
        </View>
        <View style={styles.barBg}>
          <View
            style={[
              styles.barFill,
              { width: `${Math.min(100, Math.max(4, survival))}%`, backgroundColor: riskColor },
            ]}
          />
        </View>
        {rescue?.boarding_advisory && (
          <Text style={styles.advisory}>{rescue.boarding_advisory}</Text>
        )}
      </View>

      {/* Safe-Boarding Lock Banner */}
      {rescue?.safe_boarding_lock && (
        <View style={styles.lockCard}>
          <Text style={styles.lockTitle}>Safe-Boarding Guardrail Active</Text>
          <Text style={styles.lockBody}>
            Reach your boarding station by official timetable so you never miss a train that recovers time via slack. Road bailout unlocks once you are On Board.
          </Text>
        </View>
      )}

      {/* Early-Junction Multimodal Bailout */}
      {!rescue?.safe_boarding_lock && rescue?.bailout_recommended && rescue.bailout_plan && (
        <View style={styles.rescueCard}>
          <Text style={styles.rescueTag}>EARLY-JUNCTION MULTIMODAL RESCUE</Text>
          <Text style={styles.rescueHeadline}>
            Save ~{Math.round(rescue.bailout_plan.minutes_saved)} mins — Deboard at{' '}
            {rescue.bailout_plan.deboard_station_name}
          </Text>
          <Text style={styles.rescueBody}>{rescue.bailout_plan.human_guidance}</Text>

          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>
                {formatIstTime(rescue.bailout_plan.deboard_eta_epoch)}
              </Text>
              <Text style={styles.metricLbl}>Deboard ETA</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>
                {Math.round(rescue.bailout_plan.road_drive_mins)} min
              </Text>
              <Text style={styles.metricLbl}>
                {rescue.bailout_plan.highway_name ?? highwayLabel}
              </Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={[styles.metricVal, { color: '#059669' }]}>
                {Math.round(rescue.bailout_plan.road_survival_pct)}%
              </Text>
              <Text style={styles.metricLbl}>Road Survival</Text>
            </View>
          </View>

          <View style={styles.detailStrip}>
            <Text style={styles.detailStripText}>
              Walk exit: {rescue.bailout_plan.station_exit_mins}m · Distance:{' '}
              {rescue.bailout_plan.road_distance_km ?? 28.4} km · Road ETA:{' '}
              {formatIstTime(rescue.bailout_plan.final_road_arrival_epoch)}
            </Text>
          </View>

          <Pressable
            onPress={handleBookCab}
            style={[styles.cabBtn, cabBooked && styles.cabBtnDone]}
          >
            <Text style={styles.cabBtnText}>
              {cabBooked
                ? `${highwayLabel} Rescue Cab Reserved ✓`
                : `Reserve ${highwayLabel} Rescue Cab`}
            </Text>
          </Pressable>
        </View>
      )}

      {rescue?.disclaimer && <Text style={styles.disclaimer}>{rescue.disclaimer}</Text>}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  label: { fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 0.7, marginBottom: 8 },
  heading: { fontSize: 13, fontWeight: '700', color: '#0F294A', marginBottom: 8 },
  destRow: { flexDirection: 'row', gap: 8 },
  destChip: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#F8FAFC' },
  destChipActive: { backgroundColor: '#0F294A', borderColor: '#0F294A' },
  destChipText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  destChipTextActive: { color: '#FFFFFF' },
  toggleRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 3 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#FFFFFF' },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  toggleTextActive: { color: '#0F294A', fontWeight: '800' },
  survivalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  survivalPct: { fontSize: 30, fontWeight: '800' },
  riskBadge: { fontSize: 12, fontWeight: '800' },
  barBg: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  advisory: { fontSize: 12, color: '#475569', marginTop: 10, lineHeight: 17 },
  lockCard: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1, borderRadius: 14, padding: 14 },
  lockTitle: { fontSize: 14, fontWeight: '800', color: '#1E40AF', marginBottom: 4 },
  lockBody: { fontSize: 12, color: '#1E3A8A', lineHeight: 17 },
  rescueCard: { backgroundColor: '#ECFDF5', borderColor: '#059669', borderWidth: 1.5, borderRadius: 16, padding: 14 },
  rescueTag: { fontSize: 11, fontWeight: '800', color: '#059669', letterSpacing: 0.7 },
  rescueHeadline: { fontSize: 17, fontWeight: '800', color: '#065F46', marginTop: 4, marginBottom: 6 },
  rescueBody: { fontSize: 13, color: '#064E3B', marginBottom: 12, lineHeight: 18 },
  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  metricBox: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 10, alignItems: 'center' },
  metricVal: { fontSize: 14, fontWeight: '800', color: '#0F294A' },
  metricLbl: { fontSize: 11, color: '#64748B', marginTop: 2 },
  detailStrip: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: 8, marginBottom: 12, alignItems: 'center' },
  detailStripText: { fontSize: 11, fontWeight: '700', color: '#065F46' },
  cabBtn: { backgroundColor: '#059669', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cabBtnDone: { backgroundColor: '#065F46' },
  cabBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  disclaimer: { fontSize: 11, color: '#64748B', textAlign: 'center', marginTop: 4 },
});
