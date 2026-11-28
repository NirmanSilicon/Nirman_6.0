import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  injectTrainDelay,
  resetCorridor,
  spawnGoodsTrainApi,
} from '../services/api';
import { useRailStore } from '../stores/useRailStore';

export const DemoModal: React.FC = () => {
  const {
    drawerOpen,
    setDrawerOpen,
    backendOrigin,
    selectedTrain,
    activeCorridorId,
    wsConnected,
    injectLocalDelay,
    resetLocalSim,
  } = useRailStore();
  const [statusMsg, setStatusMsg] = useState('');

  const handleInjectDelay = async (mins: number) => {
    injectLocalDelay(selectedTrain, mins);
    setStatusMsg(`Injected +${mins}m delay on ${selectedTrain}`);
    if (wsConnected) {
      try {
        await injectTrainDelay(backendOrigin, selectedTrain, mins);
      } catch {
        /* local fallback applied */
      }
    }
  };

  const handleSpawnGoods = async () => {
    setStatusMsg('Spawning phantom goods rake ahead...');
    if (wsConnected) {
      try {
        await spawnGoodsTrainApi(backendOrigin);
        setStatusMsg('Goods rake injected into corridor');
      } catch {
        setStatusMsg('Offline mode: simulated goods rake active');
      }
    } else {
      setStatusMsg('Offline mode: simulated goods rake active');
    }
  };

  const handleReset = async () => {
    resetLocalSim();
    setStatusMsg(`Reset ${activeCorridorId} simulation`);
    if (wsConnected) {
      try {
        await resetCorridor(backendOrigin);
      } catch {
        /* local reset applied */
      }
    }
  };

  return (
    <Modal
      visible={drawerOpen}
      transparent
      animationType="slide"
      onRequestClose={() => setDrawerOpen(false)}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Demo & Simulation Controls</Text>
              <Text style={styles.sub}>
                Train {selectedTrain} · {activeCorridorId}
              </Text>
            </View>
            <Pressable onPress={() => setDrawerOpen(false)}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          {statusMsg ? (
            <View style={styles.statusBanner}>
              <Text style={styles.statusText}>{statusMsg}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionLabel}>INJECT DELAY ON {selectedTrain}</Text>
          <View style={styles.btnRow}>
            {[10, 20, 30].map((m) => (
              <Pressable
                key={m}
                onPress={() => void handleInjectDelay(m)}
                style={styles.amberBtn}
              >
                <Text style={styles.amberBtnText}>+{m}m Delay</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 14 }]}>CORRIDOR ACTIONS</Text>
          <View style={styles.btnRow}>
            <Pressable onPress={() => void handleSpawnGoods()} style={styles.navyBtn}>
              <Text style={styles.navyBtnText}>+ Spawn Goods Rake</Text>
            </Pressable>
            <Pressable onPress={() => void handleReset()} style={styles.resetBtn}>
              <Text style={styles.resetBtnText}>↺ Reset Corridor</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 16, fontWeight: '800', color: '#0F294A' },
  sub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  close: { fontSize: 18, fontWeight: '700', color: '#64748B', padding: 4 },
  statusBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  statusText: { fontSize: 12, fontWeight: '700', color: '#065F46' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  btnRow: { flexDirection: 'row', gap: 8 },
  amberBtn: {
    flex: 1,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  amberBtnText: { fontSize: 12.5, fontWeight: '800', color: '#92400E' },
  navyBtn: {
    flex: 1,
    backgroundColor: '#0F294A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  navyBtnText: { fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' },
  resetBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetBtnText: { fontSize: 12.5, fontWeight: '800', color: '#334155' },
});
