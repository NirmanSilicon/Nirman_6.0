import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getStationsForCorridor } from '../services/mockFallback';
import { wsClient } from '../services/wsClient';
import { useRailStore } from '../stores/useRailStore';

export const SearchScreen: React.FC = () => {
  const {
    activeCorridorId,
    activeSnapshot,
    backendOrigin,
    wsConnected,
    wsStatusText,
    selectedTrain,
    switchCorridor,
    setBackendOrigin,
    selectTrainAndOpen,
  } = useRailStore();

  const isKolkata = activeCorridorId === 'SER_HWH_KGP';
  const stations = useMemo(
    () => getStationsForCorridor(activeCorridorId),
    [activeCorridorId]
  );

  const [searchMode, setSearchMode] = useState<'find' | 'track'>('track');
  const [fromCode, setFromCode] = useState(isKolkata ? 'HWH' : 'BHC');
  const [toCode, setToCode] = useState(isKolkata ? 'KGP' : 'BBS');
  const [query, setQuery] = useState('');
  const [urlInput, setUrlInput] = useState(backendOrigin);
  const [showServerEdit, setShowServerEdit] = useState(false);

  const trains = activeSnapshot.trains ?? [];

  const handleCorridorSwitch = async (id: 'ECoR_BHC_PURI' | 'SER_HWH_KGP') => {
    await switchCorridor(id);
    if (id === 'SER_HWH_KGP') {
      setFromCode('HWH');
      setToCode('KGP');
    } else {
      setFromCode('BHC');
      setToCode('BBS');
    }
  };

  const handleSwap = () => {
    setFromCode(toCode);
    setToCode(fromCode);
  };

  const filteredTrains = useMemo(() => {
    if (searchMode === 'find') {
      const fromStn = stations.find((s) => s.station_code === fromCode);
      const toStn = stations.find((s) => s.station_code === toCode);
      if (!fromStn || !toStn || fromCode === toCode) return trains;
      const wantedDir = fromStn.chainage_km < toStn.chainage_km ? 'DN' : 'UP';
      return trains.filter((t) => t.direction === wantedDir);
    }
    const q = query.trim().toLowerCase();
    if (!q) return trains;
    const normalizedQ = q === 'bbsr' ? 'bhubaneswar' : q;
    const corridorMatchesCity = stations.some(
      (s) =>
        s.station_name.toLowerCase().includes(normalizedQ) ||
        s.station_code.toLowerCase().includes(normalizedQ)
    );
    if (corridorMatchesCity) return trains;
    return trains.filter(
      (t) =>
        t.train_no.toLowerCase().includes(q) ||
        t.train_name.toLowerCase().includes(q)
    );
  }, [searchMode, trains, stations, fromCode, toCode, query]);

  const handleSaveServer = () => {
    const trimmed = urlInput.trim();
    if (trimmed) {
      setBackendOrigin(trimmed);
      wsClient.connect(trimmed);
    }
    setShowServerEdit(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Navbar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>RAIL-PULSE</Text>
          <Text style={styles.subtitle}>
            {isKolkata
              ? 'SER Trunk · Howrah → Kharagpur (115 km)'
              : 'ECoR Trunk · Bhadrak → Puri (206 km)'}
          </Text>
        </View>
        <Pressable
          onPress={() => setShowServerEdit((v) => !v)}
          style={[
            styles.statusBadge,
            wsConnected ? styles.badgeOnline : styles.badgeOffline,
          ]}
        >
          <View
            style={[
              styles.dot,
              { backgroundColor: wsConnected ? '#059669' : '#D97706' },
            ]}
          />
          <Text style={styles.statusText}>{wsStatusText}</Text>
        </Pressable>
      </View>

      {showServerEdit && (
        <View style={styles.serverCard}>
          <Text style={styles.serverLabel}>
            Backend URL (PC LAN IP for phone, 10.0.2.2 for Emulator)
          </Text>
          <View style={styles.serverRow}>
            <TextInput
              style={styles.serverInput}
              value={urlInput}
              onChangeText={setUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://192.168.1.33:8000"
            />
            <Pressable style={styles.saveBtn} onPress={handleSaveServer}>
              <Text style={styles.saveBtnText}>Connect</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Hero Headline */}
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>
          Know when your train really arrives — before delays catch you off guard.
        </Text>
        <Text style={styles.heroSub}>
          Predicts loop-line overtakes, hidden goods trains, and timetable recovery slack with Best / Likely / Worst arrival windows.
        </Text>
      </View>

      {/* Corridor Selector */}
      <View style={styles.corridorRow}>
        <Pressable
          onPress={() => handleCorridorSwitch('ECoR_BHC_PURI')}
          style={[
            styles.corridorChip,
            !isKolkata && styles.corridorChipActive,
          ]}
        >
          <Text
            style={[
              styles.corridorChipText,
              !isKolkata && styles.corridorChipTextActive,
            ]}
          >
            Bhadrak – Puri (ECoR)
          </Text>
        </Pressable>
        <Pressable
          onPress={() => handleCorridorSwitch('SER_HWH_KGP')}
          style={[
            styles.corridorChip,
            isKolkata && styles.corridorChipActive,
          ]}
        >
          <Text
            style={[
              styles.corridorChipText,
              isKolkata && styles.corridorChipTextActive,
            ]}
          >
            Howrah – Kharagpur (SER)
          </Text>
        </Pressable>
      </View>

      {/* Live Corridor Pulse Strip */}
      <View style={styles.pulseStrip}>
        <View style={styles.pulsePill}>
          <Text style={styles.pulseValue}>{trains.length}</Text>
          <Text style={styles.pulseLabel}>Active Trains</Text>
        </View>
        <View style={styles.pulsePill}>
          <Text style={[styles.pulseValue, { color: '#D97706' }]}>
            {activeSnapshot.phantom_freights?.length ?? 0}
          </Text>
          <Text style={styles.pulseLabel}>Goods Shadows</Text>
        </View>
        <View style={styles.pulsePill}>
          <Text style={styles.pulseValue}>
            {activeSnapshot.weather?.rain_mm_hr ?? 0} mm
          </Text>
          <Text style={styles.pulseLabel}>
            {activeSnapshot.weather?.condition ?? 'CLEAR'}
          </Text>
        </View>
      </View>

      {/* Search Card (Find Trains | Track Train) */}
      <View style={styles.searchCard}>
        <View style={styles.modeTabs}>
          <Pressable
            onPress={() => setSearchMode('track')}
            style={[styles.modeTab, searchMode === 'track' && styles.modeTabActive]}
          >
            <Text
              style={[
                styles.modeTabText,
                searchMode === 'track' && styles.modeTabTextActive,
              ]}
            >
              Track Train
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSearchMode('find')}
            style={[styles.modeTab, searchMode === 'find' && styles.modeTabActive]}
          >
            <Text
              style={[
                styles.modeTabText,
                searchMode === 'find' && styles.modeTabTextActive,
              ]}
            >
              Find Route (From → To)
            </Text>
          </Pressable>
        </View>

        {searchMode === 'track' ? (
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search train no., name, or city (e.g. 12821, BBSR, Puri)"
            placeholderTextColor="#6B7280"
          />
        ) : (
          <View style={styles.routePickerBox}>
            <Text style={styles.routeLabel}>FROM STATION</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {stations.map((s) => (
                <Pressable
                  key={`from-${s.station_code}`}
                  onPress={() => setFromCode(s.station_code)}
                  style={[
                    styles.stnChip,
                    fromCode === s.station_code && styles.stnChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.stnChipText,
                      fromCode === s.station_code && styles.stnChipTextActive,
                    ]}
                  >
                    {s.station_name} ({s.station_code})
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.swapRow}>
              <Text style={styles.routeSummary}>
                {stations.find((s) => s.station_code === fromCode)?.station_name ?? fromCode} ({fromCode}) →{' '}
                {stations.find((s) => s.station_code === toCode)?.station_name ?? toCode} ({toCode})
              </Text>
              <Pressable onPress={handleSwap} style={styles.swapBtn}>
                <Text style={styles.swapBtnText}>⇄ Swap</Text>
              </Pressable>
            </View>

            <Text style={styles.routeLabel}>TO STATION</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {stations.map((s) => (
                <Pressable
                  key={`to-${s.station_code}`}
                  onPress={() => setToCode(s.station_code)}
                  style={[
                    styles.stnChip,
                    toCode === s.station_code && styles.stnChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.stnChipText,
                      toCode === s.station_code && styles.stnChipTextActive,
                    ]}
                  >
                    {s.station_name} ({s.station_code})
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Train Results */}
      <Text style={styles.sectionHeader}>
        ACTIVE TRAINS ON CORRIDOR ({filteredTrains.length})
      </Text>
      {filteredTrains.map((item) => {
        const isDelayed = item.current_delay_mins >= 10;
        const isSelected = item.train_no === selectedTrain;
        const routeText = isKolkata
          ? item.direction === 'DN'
            ? 'Howrah (HWH) → Kharagpur (KGP)'
            : 'Kharagpur (KGP) → Howrah (HWH)'
          : item.direction === 'DN'
            ? 'Bhadrak (BHC) → Puri (PURI)'
            : 'Puri (PURI) → Bhadrak (BHC)';

        return (
          <Pressable
            key={item.train_no}
            onPress={() => selectTrainAndOpen(item.train_no)}
            style={[styles.trainCard, isSelected && styles.trainCardSelected]}
          >
            <View style={styles.cardTop}>
              <View style={styles.trainTitleRow}>
                <Text style={styles.trainNo}>{item.train_no}</Text>
                <Text style={styles.dirBadge}>{item.direction}</Text>
                {item.priority_rank === 1 && (
                  <Text style={styles.priorityBadge}>PRIORITY</Text>
                )}
              </View>
              <View
                style={[
                  styles.delayPill,
                  { backgroundColor: isDelayed ? '#FEE2E2' : '#D1FAE5' },
                ]}
              >
                <Text
                  style={[
                    styles.delayText,
                    { color: isDelayed ? '#D92D20' : '#059669' },
                  ]}
                >
                  {item.current_delay_mins > 0
                    ? `+${Math.round(item.current_delay_mins)}m late`
                    : 'On Time'}
                </Text>
              </View>
            </View>

            <Text style={styles.trainName}>{item.train_name}</Text>
            <Text style={styles.routeSub}>{routeText}</Text>

            <View style={styles.cardBottom}>
              <Text style={styles.metaText}>
                {item.current_station
                  ? `Halted at ${item.current_station}`
                  : `Next: ${item.next_station ?? 'Enroute'}`}{' '}
                · {item.chainage_km.toFixed(1)} km
              </Text>
              <Text style={styles.ctaText}>
                {Math.round(item.speed_kmph)} km/h · View ETA →
              </Text>
            </View>
          </Pressable>
        );
      })}

      {/* Why Rail-Pulse vs Standard Trackers */}
      <View style={styles.compareCard}>
        <View style={styles.compareHalfOld}>
          <Text style={styles.compareTagOld}>STANDARD TRACKERS (NTES / WIMT)</Text>
          <Text style={styles.compareTitle}>Assumes your train runs on an empty track</Text>
          <Text style={styles.compareBody}>
            Shows Scheduled + Current Delay and misses loop-line overtakes and unscheduled goods trains until it is too late.
          </Text>
        </View>
        <View style={styles.compareHalfNew}>
          <Text style={styles.compareTagNew}>RAIL-PULSE INTELLIGENCE</Text>
          <Text style={styles.compareTitle}>Predicts overtakes, goods drag & road rescue</Text>
          <Text style={styles.compareBody}>
            Simulates trailing fast trains, infers goods congestion, deducts railway slack, and gives Best / Likely / Worst arrival windows.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontSize: 22, fontWeight: '800', color: '#0F294A', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  badgeOnline: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  badgeOffline: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: '700', color: '#0F294A' },
  serverCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  serverLabel: { fontSize: 11, color: '#64748B', marginBottom: 6 },
  serverRow: { flexDirection: 'row', gap: 8 },
  serverInput: { flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: '#0F294A' },
  saveBtn: { backgroundColor: '#0F294A', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  heroCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  heroTitle: { fontSize: 17, fontWeight: '800', color: '#0F294A', lineHeight: 23 },
  heroSub: { fontSize: 12.5, color: '#475569', marginTop: 6, lineHeight: 18 },
  corridorRow: { flexDirection: 'row', gap: 8 },
  corridorChip: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  corridorChipActive: { backgroundColor: '#0F294A', borderColor: '#0F294A' },
  corridorChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  corridorChipTextActive: { color: '#FFFFFF' },
  pulseStrip: { flexDirection: 'row', gap: 8 },
  pulsePill: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  pulseValue: { fontSize: 15, fontWeight: '800', color: '#0F294A' },
  pulseLabel: { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '600' },
  searchCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  modeTabs: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 3, marginBottom: 10 },
  modeTab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  modeTabActive: { backgroundColor: '#FFFFFF' },
  modeTabText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  modeTabTextActive: { color: '#0F294A' },
  searchInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0F294A' },
  routePickerBox: { gap: 6 },
  routeLabel: { fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 0.6 },
  chipScroll: { flexGrow: 0 },
  stnChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F1F5F9', marginRight: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  stnChipActive: { backgroundColor: '#0F294A', borderColor: '#0F294A' },
  stnChipText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  stnChipTextActive: { color: '#FFFFFF' },
  swapRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 2 },
  routeSummary: { fontSize: 13, fontWeight: '800', color: '#0F294A' },
  swapBtn: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  swapBtnText: { fontSize: 12, fontWeight: '700', color: '#1D4ED8' },
  sectionHeader: { fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 0.7, marginTop: 2 },
  trainCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  trainCardSelected: { borderColor: '#0F294A', borderWidth: 1.5 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  trainTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trainNo: { fontSize: 17, fontWeight: '800', color: '#0F294A' },
  dirBadge: { fontSize: 11, fontWeight: '700', color: '#475569', backgroundColor: '#F1F5F9', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  priorityBadge: { fontSize: 10, fontWeight: '800', color: '#B45309', backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  delayPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  delayText: { fontSize: 12, fontWeight: '700' },
  trainName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  routeSub: { fontSize: 12, color: '#64748B', marginTop: 2, marginBottom: 8 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8 },
  metaText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  ctaText: { fontSize: 12, fontWeight: '800', color: '#0F294A' },
  compareCard: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
  compareHalfOld: { padding: 14, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  compareHalfNew: { padding: 14, backgroundColor: '#ECFDF5' },
  compareTagOld: { fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 0.6 },
  compareTagNew: { fontSize: 10, fontWeight: '800', color: '#047857', letterSpacing: 0.6 },
  compareTitle: { fontSize: 14, fontWeight: '800', color: '#0F294A', marginTop: 4, marginBottom: 4 },
  compareBody: { fontSize: 12, color: '#475569', lineHeight: 17 },
});
