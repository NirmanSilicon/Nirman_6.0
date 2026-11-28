import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatIstTime } from '../config/apiConfig';
import { useRailStore } from '../stores/useRailStore';

export const OverviewScreen: React.FC = () => {
  const {
    activeCorridorId,
    selectedTrain,
    activeSnapshot,
    forecast,
    rescue,
    passengerStatus,
    destinationCode,
    transferBufferMins,
    setPassengerStatus,
    setCabModalOpen,
    setActiveTab,
    setActiveMapView,
  } = useRailStore();

  const [quantile, setQuantile] = useState<'p10' | 'p50' | 'p90'>('p50');

  useEffect(() => {
    setQuantile('p50');
  }, [selectedTrain]);

  const isKolkata = activeCorridorId === 'SER_HWH_KGP';
  const deboardStation = isKolkata ? 'Santragachi' : 'Cuttack';
  const highwayName = isKolkata ? 'Kona Expressway' : 'NH-16';

  const liveTrain = activeSnapshot.trains?.find((t) => t.train_no === selectedTrain);
  const timeline = forecast?.station_timeline ?? [];
  const targetStop =
    timeline.find((s) => s.station_code === destinationCode) ??
    timeline[timeline.length - 1];

  const selectedEtaEpoch =
    quantile === 'p10'
      ? forecast?.p10_eta_epoch
      : quantile === 'p90'
        ? forecast?.p90_eta_epoch
        : forecast?.p50_eta_epoch;

  const selectedDelayMins = Math.round(
    quantile === 'p10'
      ? forecast?.p10_delay_mins ?? 0
      : quantile === 'p90'
        ? forecast?.p90_delay_mins ?? 0
        : forecast?.p50_delay_mins ?? liveTrain?.current_delay_mins ?? 0
  );

  const schedTime = targetStop?.sched_arr_epoch
    ? formatIstTime(targetStop.sched_arr_epoch)
    : '11:45 AM';
  const p10Time = forecast?.p10_eta_epoch ? formatIstTime(forecast.p10_eta_epoch) : '11:52 AM';
  const p50Time = forecast?.p50_eta_epoch ? formatIstTime(forecast.p50_eta_epoch) : '12:18 PM';
  const p90Time = forecast?.p90_eta_epoch ? formatIstTime(forecast.p90_eta_epoch) : '12:41 PM';
  const activeTime = selectedEtaEpoch ? formatIstTime(selectedEtaEpoch) : p50Time;

  const deadlineEpoch = targetStop?.sched_arr_epoch
    ? targetStop.sched_arr_epoch + (transferBufferMins + 15) * 60
    : (activeSnapshot.tick_utc || 1795071480) + 3600;
  const deadlineTime = formatIstTime(deadlineEpoch);

  const marginMins = selectedEtaEpoch
    ? Math.round((deadlineEpoch - selectedEtaEpoch) / 60)
    : Math.round((rescue?.survival_probability_pct ?? 50) > 60 ? 18 : -12);

  const isTightOrMissed = marginMins < 10 || rescue?.risk_level === 'HIGH_RISK_MISS';
  const survivalPct = Math.round(rescue?.survival_probability_pct ?? (isTightOrMissed ? 18 : 84));
  const causalCards = forecast?.causal_cards ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Arrival & Connection Card (matching ArrivalConnectionCard.tsx) */}
      <View style={styles.card}>
        <View style={styles.cardTopRow}>
          <View>
            <Text style={styles.eyebrow}>EXPECTED ARRIVAL</Text>
            <Text style={styles.destTitle}>
              {targetStop?.station_name ?? destinationCode} ({targetStop?.station_code ?? destinationCode})
            </Text>
          </View>
          <View
            style={[
              styles.delayBadge,
              selectedDelayMins <= 5 ? styles.delayBadgeSafe : styles.delayBadgeWarn,
            ]}
          >
            <Text
              style={[
                styles.delayBadgeText,
                { color: selectedDelayMins <= 5 ? '#065F46' : '#92400E' },
              ]}
            >
              {selectedDelayMins <= 0 ? 'On Time' : `+${selectedDelayMins}m late`}
            </Text>
          </View>
        </View>

        {/* Big Arrival Time + Scheduled */}
        <View style={styles.etaHeroRow}>
          <Text style={styles.etaHeroTime}>{activeTime}</Text>
          <Text style={styles.schedSub}>Scheduled: {schedTime}</Text>
        </View>

        {/* Quantile Selector (Best P10 / Likely P50 / Worst P90) */}
        <View style={styles.quantileRow}>
          {(
            [
              { key: 'p10', label: 'Best (P10)', time: p10Time },
              { key: 'p50', label: 'Likely (P50)', time: p50Time },
              { key: 'p90', label: 'Worst (P90)', time: p90Time },
            ] as const
          ).map((q) => {
            const active = quantile === q.key;
            return (
              <Pressable
                key={q.key}
                onPress={() => setQuantile(q.key)}
                style={[styles.qPill, active && styles.qPillActive]}
              >
                <Text style={[styles.qLabel, active && styles.qLabelActive]}>
                  {q.label}
                </Text>
                <Text style={[styles.qTime, active && styles.qTimeActive]}>
                  {q.time}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Confidence Window Bar */}
        <View style={styles.windowBox}>
          <View style={styles.windowHeader}>
            <Text style={styles.windowTitle}>ARRIVAL WINDOW (P10 – P90)</Text>
            <Text style={styles.windowSpan}>
              {p10Time} → {p90Time}
            </Text>
          </View>
          <View style={styles.windowTrack}>
            <View
              style={[
                styles.windowFill,
                {
                  width: quantile === 'p10' ? '33%' : quantile === 'p50' ? '66%' : '95%',
                  backgroundColor:
                    quantile === 'p10'
                      ? '#059669'
                      : quantile === 'p50'
                        ? '#0F294A'
                        : '#D97706',
                },
              ]}
            />
          </View>
        </View>

        {/* Connection Evaluation */}
        <View
          style={[
            styles.connBox,
            isTightOrMissed ? styles.connBoxRisk : styles.connBoxSafe,
          ]}
        >
          <View style={styles.connTop}>
            <Text style={styles.connHeading}>CONNECTION GUARD</Text>
            <View
              style={[
                styles.connStatusPill,
                isTightOrMissed ? styles.connPillRisk : styles.connPillSafe,
              ]}
            >
              <Text
                style={[
                  styles.connStatusText,
                  { color: isTightOrMissed ? '#991B1B' : '#065F46' },
                ]}
              >
                {marginMins >= 10 ? 'SAFE' : marginMins >= 0 ? 'TIGHT' : 'MISSED'} · {survivalPct}%
              </Text>
            </View>
          </View>
          <Text style={styles.connDetail}>
            Target connection departs at <Text style={{ fontWeight: '800' }}>{deadlineTime}</Text>.{' '}
            {marginMins >= 0
              ? `Estimated ${marginMins}m transfer margin.`
              : `Likely to miss by ${Math.abs(marginMins)}m.`}
          </Text>
        </View>

        {/* Boarding Status Toggle */}
        <View style={styles.boardingWrap}>
          <Text style={styles.boardingLabel}>PASSENGER STATUS</Text>
          <View style={styles.boardingSeg}>
            <Pressable
              onPress={() => setPassengerStatus('ON_BOARD')}
              style={[
                styles.boardingBtn,
                passengerStatus === 'ON_BOARD' && styles.boardingBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.boardingText,
                  passengerStatus === 'ON_BOARD' && styles.boardingTextActive,
                ]}
              >
                On Board
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setPassengerStatus('PRE_BOARDING')}
              style={[
                styles.boardingBtn,
                passengerStatus === 'PRE_BOARDING' && styles.boardingBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.boardingText,
                  passengerStatus === 'PRE_BOARDING' && styles.boardingTextActive,
                ]}
              >
                Pre-Boarding
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => {
              setActiveMapView('my_train');
              setActiveTab('map');
            }}
            style={styles.secondaryActionBtn}
          >
            <Text style={styles.secondaryActionText}>View on Live Map</Text>
          </Pressable>

          <Pressable
            onPress={() => setCabModalOpen(true)}
            style={styles.primaryActionBtn}
          >
            <Text style={styles.primaryActionText}>
              Book {highwayName} Cab ({deboardStation}) →
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Delay Causes & Live Telemetry Preview (matching VerticalTimeline.tsx) */}
      <View style={styles.card}>
        <View style={styles.cardTopRow}>
          <Text style={styles.sectionTitle}>Active Delay Factors</Text>
          <Pressable onPress={() => setActiveTab('timeline')}>
            <Text style={styles.linkText}>Full Timeline ({timeline.length} stops) →</Text>
          </Pressable>
        </View>

        {causalCards.length === 0 ? (
          <View style={styles.clearBox}>
            <Text style={styles.clearText}>
              ✓ Corridor track ahead is clear. Train {selectedTrain} is maintaining scheduled pace ({Math.round(liveTrain?.speed_kmph ?? 72)} km/h).
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {causalCards.slice(0, 3).map((c, idx) => (
              <View key={idx} style={styles.causeRow}>
                <View style={styles.causeHeader}>
                  <Text style={styles.causeTitle}>
                    {c.event} · {c.station_name}
                  </Text>
                  <Text style={styles.causeImpact}>
                    +{Math.round(c.added_delay_mins)}m
                  </Text>
                </View>
                <Text style={styles.causeDesc}>{c.human_message}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  content: { padding: 14, paddingBottom: 24, gap: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  destTitle: { fontSize: 16, fontWeight: '800', color: '#0F294A', marginTop: 2 },
  delayBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  delayBadgeSafe: { backgroundColor: '#D1FAE5' },
  delayBadgeWarn: { backgroundColor: '#FEF3C7' },
  delayBadgeText: { fontSize: 11.5, fontWeight: '800' },

  etaHeroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  etaHeroTime: { fontSize: 32, fontWeight: '900', color: '#0F294A' },
  schedSub: { fontSize: 12.5, fontWeight: '600', color: '#64748B' },

  quantileRow: { flexDirection: 'row', gap: 8 },
  qPill: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  qPillActive: {
    backgroundColor: '#0F294A',
    borderColor: '#0F294A',
  },
  qLabel: { fontSize: 10.5, fontWeight: '700', color: '#64748B' },
  qLabelActive: { color: '#CBD5E1' },
  qTime: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 2 },
  qTimeActive: { color: '#FFFFFF' },

  windowBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  windowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  windowTitle: { fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 0.6 },
  windowSpan: { fontSize: 11, fontWeight: '700', color: '#0F294A' },
  windowTrack: {
    height: 7,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  windowFill: { height: '100%', borderRadius: 999 },

  connBox: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 6 },
  connBoxSafe: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  connBoxRisk: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  connTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  connHeading: { fontSize: 11, fontWeight: '800', color: '#334155', letterSpacing: 0.7 },
  connStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  connPillSafe: { backgroundColor: '#D1FAE5' },
  connPillRisk: { backgroundColor: '#FEE2E2' },
  connStatusText: { fontSize: 11, fontWeight: '900' },
  connDetail: { fontSize: 12.5, color: '#1E293B', lineHeight: 18 },

  boardingWrap: { gap: 6 },
  boardingLabel: { fontSize: 10.5, fontWeight: '800', color: '#64748B', letterSpacing: 0.7 },
  boardingSeg: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  boardingBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  boardingBtnActive: { backgroundColor: '#FFFFFF' },
  boardingText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  boardingTextActive: { color: '#0F294A', fontWeight: '800' },

  actionRow: { gap: 8, marginTop: 2 },
  secondaryActionBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryActionText: { fontSize: 13, fontWeight: '700', color: '#0F294A' },
  primaryActionBtn: {
    borderRadius: 12,
    backgroundColor: '#0F294A',
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryActionText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0F294A' },
  linkText: { fontSize: 12, fontWeight: '700', color: '#0284C7' },
  clearBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  clearText: { fontSize: 12.5, color: '#065F46', lineHeight: 18, fontWeight: '600' },
  causeRow: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 11,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 3,
  },
  causeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  causeTitle: { fontSize: 13, fontWeight: '800', color: '#78350F', flex: 1 },
  causeImpact: { fontSize: 12, fontWeight: '900', color: '#B45309' },
  causeDesc: { fontSize: 12, color: '#92400E', lineHeight: 17 },
});
