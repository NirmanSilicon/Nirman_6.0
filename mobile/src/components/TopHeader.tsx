import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { setSpeedMultiplierApi } from '../services/api';
import { useRailStore } from '../stores/useRailStore';

function formatEpochClockIST(epochSecs: number): string {
  const istSecs = (Math.floor(epochSecs) + 19800) % 86400;
  const pos = istSecs < 0 ? istSecs + 86400 : istSecs;
  const h24 = Math.floor(pos / 3600);
  const mins = Math.floor((pos % 3600) / 60);
  const secs = pos % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')} ${period}`;
}

export const TopHeader: React.FC = () => {
  const {
    backendOrigin,
    selectedTrain,
    activeCorridorId,
    activeSnapshot,
    updateSnapshot,
    setCurrentView,
    switchCorridor,
    setDrawerOpen,
  } = useRailStore();

  const isKolkata = activeCorridorId === 'SER_HWH_KGP';
  const simSpeed = activeSnapshot.speed_multiplier || 1;
  const liveTrain = activeSnapshot.trains?.find((t) => t.train_no === selectedTrain);
  const fallbackDefault = isKolkata ? 'Steel Express' : 'Dhauli Express';
  const trainName = liveTrain?.train_name ?? fallbackDefault;

  const clockAnchorRef = useRef({
    tickUtc: activeSnapshot.tick_utc || 1795067700,
    syncedAtMs: Date.now(),
    speed: simSpeed,
  });
  const [displayEpoch, setDisplayEpoch] = useState(activeSnapshot.tick_utc || 1795067700);

  useEffect(() => {
    const tick = activeSnapshot.tick_utc || 1795067700;
    clockAnchorRef.current = {
      tickUtc: tick,
      syncedAtMs: Date.now(),
      speed: activeSnapshot.speed_multiplier || 1,
    };
    setDisplayEpoch(tick);
  }, [activeSnapshot.tick_utc, activeSnapshot.speed_multiplier]);

  useEffect(() => {
    const id = setInterval(() => {
      const { tickUtc, syncedAtMs, speed } = clockAnchorRef.current;
      const elapsedSec = (Date.now() - syncedAtMs) / 1000;
      setDisplayEpoch(tickUtc + elapsedSec * speed);
    }, 250);
    return () => clearInterval(id);
  }, []);

  const handleCorridorToggle = () => {
    const nextId = isKolkata ? 'ECoR_BHC_PURI' : 'SER_HWH_KGP';
    void switchCorridor(nextId);
  };

  const handleQuickSpeed = async (newSpeed: number) => {
    updateSnapshot({ ...activeSnapshot, speed_multiplier: newSpeed });
    try {
      await setSpeedMultiplierApi(backendOrigin, newSpeed);
    } catch {
      /* optimistic local update */
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <View style={styles.leftGroup}>
          <Pressable
            onPress={() => setCurrentView('landing')}
            style={styles.backBtn}
            accessibilityLabel="Return to Landing Page"
          >
            <Text style={styles.backArrow}>←</Text>
          </Pressable>

          <Pressable
            onPress={() => setCurrentView('landing')}
            style={styles.brandBtn}
          >
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>RP</Text>
            </View>
            <Text style={styles.brandText}>RAIL-PULSE</Text>
          </Pressable>

          <Pressable
            onPress={handleCorridorToggle}
            style={[
              styles.corridorPill,
              isKolkata ? styles.corridorPillSer : styles.corridorPillEcor,
            ]}
          >
            <Text
              style={[
                styles.corridorText,
                isKolkata ? { color: '#78350F' } : { color: '#312E81' },
              ]}
            >
              {isKolkata ? 'SER' : 'ECoR'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.rightGroup}>
          <View style={styles.speedGroup}>
            {[1, 10, 30].map((spd) => {
              const active = simSpeed === spd;
              return (
                <Pressable
                  key={spd}
                  onPress={() => void handleQuickSpeed(spd)}
                  style={[styles.speedBtn, active && styles.speedBtnActive]}
                >
                  <Text style={[styles.speedText, active && styles.speedTextActive]}>
                    {spd}x
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => setDrawerOpen(true)}
            style={styles.demoBtn}
          >
            <Text style={styles.demoBtnText}>⚙</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.subRow}>
        <View style={styles.trainPill}>
          <Text style={styles.trainNo}>{selectedTrain}</Text>
          <Text style={styles.dotSep}>•</Text>
          <Text style={styles.trainName} numberOfLines={1}>
            {trainName}
          </Text>
        </View>
        <Text style={styles.clockText}>{formatEpochClockIST(displayEpoch)} IST</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: 'rgba(250, 249, 246, 0.96)',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  leftGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  backBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 15, fontWeight: '800', color: '#334155' },
  brandBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0F294A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#00C4DC', fontWeight: '900', fontSize: 10 },
  brandText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#0F294A',
  },
  corridorPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  corridorPillEcor: { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' },
  corridorPillSer: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  corridorText: { fontSize: 11, fontWeight: '800' },

  rightGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  speedGroup: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    padding: 2,
  },
  speedBtn: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  speedBtnActive: { backgroundColor: '#0F294A' },
  speedText: { fontSize: 10.5, fontWeight: '700', color: '#475569' },
  speedTextActive: { color: '#FFFFFF' },
  demoBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoBtnText: { fontSize: 14, color: '#0F294A' },

  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  trainPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 1,
  },
  trainNo: { fontSize: 12, fontWeight: '900', color: '#0F294A' },
  dotSep: { fontSize: 12, color: '#94A3B8' },
  trainName: { fontSize: 12, fontWeight: '600', color: '#475569', flexShrink: 1 },
  clockText: { fontSize: 11, fontWeight: '700', color: '#475569' },
});
