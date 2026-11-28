import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRailStore } from '../stores/useRailStore';

export const CabModal: React.FC = () => {
  const {
    cabModalOpen,
    setCabModalOpen,
    activeCorridorId,
    destinationCode,
    rescue,
  } = useRailStore();
  const [booked, setBooked] = useState(false);

  const isKolkata = activeCorridorId === 'SER_HWH_KGP';
  const deboardStation =
    rescue?.bailout_plan?.deboard_station_name ??
    (isKolkata ? 'Santragachi Junction (SRC)' : 'Cuttack Junction (CTC)');
  const targetDest =
    rescue?.bailout_plan?.destination_station_name ??
    (isKolkata
      ? destinationCode === 'KGP'
        ? 'Kharagpur Junction (KGP)'
        : 'Howrah Junction (HWH)'
      : destinationCode === 'PURI'
        ? 'Puri Terminal (PURI)'
        : 'Bhubaneswar (BBS)');
  const highway =
    rescue?.bailout_plan?.highway_name ??
    (isKolkata ? 'NH-116 / Kona Expressway' : 'NH-16');
  const roadEta = Math.round(rescue?.bailout_plan?.road_drive_mins ?? 35);
  const savedMins = Math.round(rescue?.bailout_plan?.minutes_saved ?? 48);

  const handleClose = () => {
    setBooked(false);
    setCabModalOpen(false);
  };

  return (
    <Modal
      visible={cabModalOpen}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>MULTIMODAL RESCUE</Text>
            </View>
            <Pressable onPress={handleClose}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.title}>{highway} Rescue Transfer</Text>
          <Text style={styles.subtitle}>
            Bypass rail loop-line congestion with a pre-staged station cab.
          </Text>

          <View style={styles.routeBox}>
            <View style={styles.routeRow}>
              <Text style={styles.routeLabel}>DEBOARD AT</Text>
              <Text style={styles.routeVal}>{deboardStation}</Text>
            </View>
            <View style={styles.routeRow}>
              <Text style={styles.routeLabel}>DROP AT</Text>
              <Text style={styles.routeVal}>{targetDest}</Text>
            </View>
            <View style={styles.metricsRow}>
              <View style={styles.metricPill}>
                <Text style={styles.metricLabel}>Road ETA</Text>
                <Text style={styles.metricVal}>{roadEta} mins</Text>
              </View>
              <View style={[styles.metricPill, styles.metricPillGreen]}>
                <Text style={[styles.metricLabel, { color: '#065F46' }]}>
                  Time Saved
                </Text>
                <Text style={[styles.metricVal, { color: '#059669' }]}>
                  ~{savedMins} mins
                </Text>
              </View>
            </View>
          </View>

          {booked ? (
            <View style={styles.confirmedBox}>
              <Text style={styles.confirmedTitle}>✓ Rescue Cab Reserved (Demo)</Text>
              <Text style={styles.confirmedSub}>
                Driver dispatched to {deboardStation} via {highway}.
              </Text>
            </View>
          ) : (
            <Pressable onPress={() => setBooked(true)} style={styles.confirmBtn}>
              <Text style={styles.confirmBtnText}>
                Confirm {highway} Rescue Cab
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#312E81', letterSpacing: 0.6 },
  close: { fontSize: 18, fontWeight: '700', color: '#64748B', padding: 4 },
  title: { fontSize: 19, fontWeight: '800', color: '#0F294A' },
  subtitle: { fontSize: 13, color: '#475569', marginTop: 4, lineHeight: 19 },
  routeBox: {
    marginTop: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 10,
  },
  routeRow: { gap: 2 },
  routeLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.7 },
  routeVal: { fontSize: 13.5, fontWeight: '700', color: '#0F172A' },
  metricsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  metricPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
  },
  metricPillGreen: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  metricLabel: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  metricVal: { fontSize: 15, fontWeight: '900', color: '#0F294A', marginTop: 2 },
  confirmBtn: {
    marginTop: 16,
    backgroundColor: '#0F294A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  confirmedBox: {
    marginTop: 16,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 14,
  },
  confirmedTitle: { fontSize: 14, fontWeight: '800', color: '#065F46' },
  confirmedSub: { fontSize: 12.5, color: '#047857', marginTop: 4 },
});
