import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatIstTime } from '../config/apiConfig';
import { useRailStore } from '../stores/useRailStore';

export const TimelineScreen: React.FC = () => {
  const {
    activeCorridorId,
    selectedTrain,
    activeSnapshot,
    forecast,
    rescue,
    passengerStatus,
    destinationCode,
    setPassengerStatus,
    setActiveTab,
  } = useRailStore();

  const [subTab, setSubTab] = useState<'journey' | 'delay'>('journey');
  const [quantile, setQuantile] = useState<'p10' | 'p50' | 'p90'>('p50');

  const isKolkata = activeCorridorId === 'SER_HWH_KGP';
  const liveTrain = activeSnapshot.trains?.find((t) => t.train_no === selectedTrain);
  const rawTimeline = forecast?.station_timeline ?? [];
  const freights = activeSnapshot.phantom_freights ?? [];
  const causalCards = forecast?.causal_cards ?? [];

  const dir = liveTrain?.direction ?? forecast?.direction ?? 'DN';
  const currentKm = liveTrain?.chainage_km ?? forecast?.current_chainage_km ?? 0;
  const speedKmph = liveTrain?.speed_kmph ?? 0;

  // Order timeline in travel direction (top -> bottom)
  const timeline = useMemo(() => {
    if (rawTimeline.length < 2) return rawTimeline;
    const isAscending = rawTimeline[0].chainage_km < rawTimeline[rawTimeline.length - 1].chainage_km;
    if (dir === 'UP' && isAscending) {
      return [...rawTimeline].reverse();
    }
    if (dir === 'DN' && !isAscending) {
      return [...rawTimeline].reverse();
    }
    return rawTimeline;
  }, [rawTimeline, dir]);

  // Determine exact position: AT a station or BETWEEN two stations
  const positionInfo = useMemo(() => {
    if (timeline.length === 0) {
      return { atStationCode: null as string | null, afterIdx: -1, summary: 'Locating train...', nextEtaMins: 0 };
    }

    const atIdx = timeline.findIndex(
      (s) =>
        (liveTrain?.current_station && s.station_code === liveTrain.current_station) ||
        Math.abs(s.chainage_km - currentKm) <= 1.5
    );

    if (atIdx !== -1) {
      const stn = timeline[atIdx];
      const nextStn = timeline[atIdx + 1];
      const distNext = nextStn ? Math.abs(nextStn.chainage_km - stn.chainage_km) : 0;
      const minsNext = nextStn ? Math.max(1, Math.round((distNext / Math.max(speedKmph, 65)) * 60)) : 0;
      return {
        atStationCode: stn.station_code,
        afterIdx: -1,
        summary: nextStn
          ? `At ${stn.station_name} (${stn.station_code}) · Next: ${nextStn.station_name} in ~${minsNext} min`
          : `Reached ${stn.station_name} (${stn.station_code})`,
        nextEtaMins: minsNext,
      };
    }

    for (let i = 0; i < timeline.length - 1; i++) {
      const a = timeline[i];
      const b = timeline[i + 1];
      const between =
        dir === 'DN'
          ? currentKm > a.chainage_km + 1.5 && currentKm < b.chainage_km - 1.5
          : currentKm < a.chainage_km - 1.5 && currentKm > b.chainage_km + 1.5;

      if (between) {
        const distLeft = Math.abs(b.chainage_km - currentKm);
        const minsLeft = Math.max(1, Math.round((distLeft / Math.max(speedKmph, 60)) * 60));
        return {
          atStationCode: null,
          afterIdx: i,
          summary: `Between ${a.station_name} & ${b.station_name} · ${distLeft.toFixed(1)} km to ${b.station_code} (~${minsLeft} min)`,
          nextEtaMins: minsLeft,
        };
      }
    }

    return {
      atStationCode: null,
      afterIdx: -1,
      summary: `Running at ${currentKm.toFixed(1)} km`,
      nextEtaMins: 0,
    };
  }, [timeline, currentKm, dir, speedKmph, liveTrain?.current_station]);

  const activeEtaEpoch =
    quantile === 'p10'
      ? forecast?.p10_eta_epoch
      : quantile === 'p90'
        ? forecast?.p90_eta_epoch
        : forecast?.p50_eta_epoch;

  const activeDelayMins =
    quantile === 'p10'
      ? forecast?.p10_delay_mins
      : quantile === 'p90'
        ? forecast?.p90_delay_mins
        : forecast?.p50_delay_mins;

  // Approximate minutes remaining to destination
  const destStop =
    timeline.find((s) => s.station_code === destinationCode) ??
    timeline[timeline.length - 1];
  const distToDestKm = destStop ? Math.max(0, Math.abs(destStop.chainage_km - currentKm)) : 0;
  const minsToDest =
    activeEtaEpoch && activeSnapshot.tick_utc
      ? Math.max(0, Math.round((activeEtaEpoch - activeSnapshot.tick_utc) / 60))
      : Math.max(0, Math.round((distToDestKm / Math.max(speedKmph, 60)) * 60));

  const delayCount = causalCards.length + freights.length;
  const isAtRisk = rescue?.risk_level === 'HIGH_RISK_MISS';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Live "Where Is My Train" Location Hero Banner */}
      <View style={styles.liveLocationBanner}>
        <View style={styles.rowBetween}>
          <Text style={styles.liveLocationTag}>LIVE TRAIN LOCATION</Text>
          <Text style={styles.liveSpeedTag}>{Math.round(speedKmph)} km/h</Text>
        </View>
        <Text style={styles.liveLocationText}>{positionInfo.summary}</Text>
      </View>

      {/* Train Identity & Safe-Boarding Header */}
      <View style={styles.headerCard}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.trainNo}>
              {liveTrain?.train_no ?? selectedTrain} · {dir} · {isKolkata ? 'SER' : 'ECoR'}
            </Text>
            <Text style={styles.trainName}>
              {liveTrain?.train_name ?? forecast?.train_name ?? 'Loading...'}
            </Text>
          </View>
          <View style={styles.delayBadge}>
            <Text style={styles.delayBadgeText}>
              +{Math.round(liveTrain?.current_delay_mins ?? forecast?.current_delay_mins ?? 0)}m late
            </Text>
          </View>
        </View>

        <View style={[styles.toggleRow, { marginTop: 10 }]}>
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

      {/* Arrival & Countdown Card */}
      {forecast && (
        <View style={styles.arrivalCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>
              ARRIVAL AT {destStop?.station_name?.toUpperCase() ?? destinationCode}
            </Text>
            <Text style={styles.slackPill}>
              Slack -{forecast.usable_slack_mins.toFixed(0)}m
            </Text>
          </View>

          <View style={styles.etaHeroRow}>
            <View style={styles.rowBetween}>
              <Text style={styles.etaHeroTime}>
                {formatIstTime(activeEtaEpoch ?? 0)}
              </Text>
              <View style={styles.countdownPill}>
                <Text style={styles.countdownText}>
                  {minsToDest > 0 ? `In ~${minsToDest} min` : 'Arriving Now'}
                </Text>
              </View>
            </View>
            <Text style={styles.etaHeroDelay}>
              +{Math.round(activeDelayMins ?? 0)}m vs sched · {distToDestKm.toFixed(1)} km away · Naive NTES{' '}
              {formatIstTime(forecast.naive_ntes_eta_epoch)}
            </Text>
          </View>

          {/* Interactive P10 / P50 / P90 Selector */}
          <View style={styles.quantileRow}>
            {(
              [
                { id: 'p10', label: 'Best (P10)', epoch: forecast.p10_eta_epoch, delay: forecast.p10_delay_mins, color: '#059669' },
                { id: 'p50', label: 'Likely (P50)', epoch: forecast.p50_eta_epoch, delay: forecast.p50_delay_mins, color: '#0F294A' },
                { id: 'p90', label: 'Worst (P90)', epoch: forecast.p90_eta_epoch, delay: forecast.p90_delay_mins, color: '#D92D20' },
              ] as const
            ).map((q) => {
              const active = quantile === q.id;
              return (
                <Pressable
                  key={q.id}
                  onPress={() => setQuantile(q.id)}
                  style={[styles.qBox, active && styles.qBoxActive]}
                >
                  <Text style={styles.qLabel}>{q.label}</Text>
                  <Text style={[styles.qTime, { color: q.color }]}>
                    {formatIstTime(q.epoch)}
                  </Text>
                  <Text style={styles.qDelay}>+{Math.round(q.delay)}m</Text>
                </Pressable>
              );
            })}
          </View>

          {rescue && (
            <Pressable
              onPress={() => setActiveTab('rescue')}
              style={[
                styles.rescueStrip,
                isAtRisk ? styles.rescueStripRisk : styles.rescueStripSafe,
              ]}
            >
              <Text
                style={[
                  styles.rescueStripText,
                  { color: isAtRisk ? '#065F46' : '#0F294A' },
                ]}
              >
                {rescue.safe_boarding_lock
                  ? 'Safe-Boarding Lock: Arrive by official schedule.'
                  : rescue.bailout_recommended && rescue.bailout_plan
                    ? `Connection at risk (${rescue.survival_probability_pct.toFixed(0)}%) · Save ~${Math.round(rescue.bailout_plan.minutes_saved)}m via ${rescue.bailout_plan.deboard_station_code} →`
                    : `Connection survival: ${rescue.survival_probability_pct.toFixed(0)}% (${rescue.risk_level})`}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Segmented Sub-Tab: Journey Details | Delay Cause */}
      <View style={styles.timelineCard}>
        <View style={styles.subTabRow}>
          <Pressable
            onPress={() => setSubTab('journey')}
            style={[styles.subTabBtn, subTab === 'journey' && styles.subTabBtnActive]}
          >
            <Text
              style={[
                styles.subTabText,
                subTab === 'journey' && styles.subTabTextActive,
              ]}
            >
              Journey Details ({timeline.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSubTab('delay')}
            style={[styles.subTabBtn, subTab === 'delay' && styles.subTabBtnActive]}
          >
            <Text
              style={[
                styles.subTabText,
                subTab === 'delay' && styles.subTabTextActive,
              ]}
            >
              Delay Cause ({delayCount})
            </Text>
          </Pressable>
        </View>

        {subTab === 'journey' ? (
          <View>
            {timeline.map((stop, idx) => {
              const isAtThisStation = positionInfo.atStationCode === stop.station_code;
              const isBetweenAfterThis = positionInfo.afterIdx === idx;
              const isPassed =
                !isAtThisStation &&
                (dir === 'DN'
                  ? stop.chainage_km < currentKm - 1.5
                  : stop.chainage_km > currentKm + 1.5);

              const nextStop = timeline[idx + 1];
              const blockFreight = nextStop
                ? freights.find(
                    (f) =>
                      f.block_id.includes(stop.station_code) &&
                      f.block_id.includes(nextStop.station_code)
                  )
                : undefined;

              const segmentSpan = nextStop ? Math.abs(nextStop.chainage_km - stop.chainage_km) : 1;
              const distFromStop = Math.abs(currentKm - stop.chainage_km);
              const distToNext = nextStop ? Math.abs(nextStop.chainage_km - currentKm) : 0;
              const minsToNext = Math.max(
                1,
                Math.round((distToNext / Math.max(speedKmph, 60)) * 60)
              );
              const segPct = Math.min(92, Math.max(8, Math.round((distFromStop / Math.max(segmentSpan, 1)) * 100)));

              return (
                <View key={stop.station_code}>
                  {/* Station Platform Row */}
                  <View style={[styles.stopRow, isAtThisStation && styles.stopRowActive]}>
                    <View style={styles.trackCol}>
                      <View
                        style={[
                          styles.nodeDot,
                          isAtThisStation
                            ? styles.nodeDotTrainHere
                            : isPassed
                              ? styles.nodeDotPassed
                              : styles.nodeDotFuture,
                        ]}
                      />
                      {idx < timeline.length - 1 && (
                        <View
                          style={[
                            styles.trackLine,
                            isPassed && styles.trackLinePassed,
                          ]}
                        />
                      )}
                    </View>

                    <View style={styles.stopBody}>
                      <View style={styles.rowBetween}>
                        <Text
                          style={[
                            styles.stopName,
                            isPassed && { color: '#64748B' },
                            isAtThisStation && { color: '#0F294A', fontWeight: '800' },
                          ]}
                        >
                          {stop.station_name} ({stop.station_code})
                        </Text>
                        {isAtThisStation ? (
                          <View style={styles.platformPointerBadge}>
                            <Text style={styles.platformPointerText}>🚂 ON PLATFORM</Text>
                          </View>
                        ) : (
                          <Text style={styles.stopKm}>
                            {isPassed ? 'Departed ✓' : `${stop.chainage_km.toFixed(0)} km`}
                          </Text>
                        )}
                      </View>

                      <View style={styles.timeRow}>
                        <Text style={styles.schedTime}>
                          Sched {formatIstTime(stop.sched_arr_epoch)}
                        </Text>
                        <Text
                          style={[
                            styles.projTime,
                            { color: stop.net_delay_mins > 5 ? '#D92D20' : '#059669' },
                          ]}
                        >
                          Est {formatIstTime(stop.projected_arr_epoch)} (
                          {stop.net_delay_mins > 0
                            ? `+${Math.round(stop.net_delay_mins)}m`
                            : 'On Time'}
                          )
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Live In-Between Track Pointer when train is between two stations */}
                  {isBetweenAfterThis && nextStop && (
                    <View style={styles.betweenPointerRow}>
                      <View style={styles.trackCol}>
                        <View style={styles.trackLinePassed} />
                        <View style={styles.betweenTrainDot}>
                          <Text style={styles.betweenTrainIcon}>🚂</Text>
                        </View>
                        <View style={styles.trackLine} />
                      </View>
                      <View style={styles.betweenPointerCard}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.betweenPointerTitle}>
                            Train is here ({segPct}% to {nextStop.station_code})
                          </Text>
                          <Text style={styles.betweenEtaBadge}>~{minsToNext} min</Text>
                        </View>
                        <Text style={styles.betweenPointerSub}>
                          {distFromStop.toFixed(1)} km past {stop.station_code} · {distToNext.toFixed(1)} km before {nextStop.station_name}
                        </Text>
                      </View>
                    </View>
                  )}

                  {blockFreight && (
                    <View style={styles.freightPill}>
                      <Text style={styles.freightText}>
                        ⚠ Goods Train Ahead ({blockFreight.block_id}) ·{' '}
                        {Math.round((blockFreight.freight_probability ?? 0.85) * 100)}% AI Conf · Clears at{' '}
                        {blockFreight.clearance_station ?? nextStop?.station_code} (~
                        {Math.round(blockFreight.clearance_eta_mins ?? 15)}m)
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.delayList}>
            {causalCards.map((card, idx) => (
              <View key={`${card.station_code}-${idx}`} style={styles.causalCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.causalTitle}>
                    Loop-Line Hold at {card.station_name}
                  </Text>
                  <Text style={styles.causalBadge}>+{Math.round(card.added_delay_mins)}m</Text>
                </View>
                <Text style={styles.causalMsg}>{card.human_message}</Text>
              </View>
            ))}

            {freights.map((f) => (
              <View key={f.block_id} style={styles.freightDetailCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.freightDetailTitle}>
                    Goods Train Shadow ({f.block_id})
                  </Text>
                  <Text style={styles.freightDetailBadge}>
                    {Math.round((f.freight_probability ?? 0.85) * 100)}% Conf
                  </Text>
                </View>
                <Text style={styles.freightDetailMsg}>
                  Unscheduled freight slowing block ahead; expected to clear onto 750m loop at{' '}
                  {f.clearance_station ?? 'next junction'} in ~{Math.round(f.clearance_eta_mins ?? 15)} mins.
                </Text>
              </View>
            ))}

            {delayCount === 0 && (
              <View style={styles.clearBox}>
                <Text style={styles.clearTitle}>Clear Track Ahead</Text>
                <Text style={styles.clearSub}>
                  No overtakes or goods train shadows currently detected ahead of this train.
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  liveLocationBanner: {
    backgroundColor: '#0F294A',
    borderRadius: 14,
    padding: 13,
  },
  liveLocationTag: { fontSize: 10, fontWeight: '800', color: '#93C5FD', letterSpacing: 0.8 },
  liveSpeedTag: { fontSize: 12, fontWeight: '800', color: '#34D399' },
  liveLocationText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginTop: 4 },
  headerCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trainNo: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  trainName: { fontSize: 18, fontWeight: '800', color: '#0F294A', marginTop: 2 },
  delayBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  delayBadgeText: { color: '#D92D20', fontWeight: '800', fontSize: 12 },
  toggleRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 3 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#FFFFFF' },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  toggleTextActive: { color: '#0F294A', fontWeight: '800' },
  arrivalCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 0.7 },
  slackPill: { fontSize: 11, fontWeight: '700', color: '#047857', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  etaHeroRow: { gap: 4 },
  etaHeroTime: { fontSize: 28, fontWeight: '800', color: '#0F294A' },
  countdownPill: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  countdownText: { fontSize: 12, fontWeight: '800', color: '#1D4ED8' },
  etaHeroDelay: { fontSize: 12, color: '#475569', fontWeight: '600' },
  quantileRow: { flexDirection: 'row', gap: 8 },
  qBox: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  qBoxActive: { borderColor: '#0F294A', borderWidth: 1.5, backgroundColor: '#FFFFFF' },
  qLabel: { fontSize: 11, color: '#64748B', fontWeight: '700' },
  qTime: { fontSize: 14, fontWeight: '800', marginTop: 3 },
  qDelay: { fontSize: 11, color: '#64748B', marginTop: 2 },
  rescueStrip: { borderRadius: 10, padding: 10, borderWidth: 1 },
  rescueStripRisk: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  rescueStripSafe: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  rescueStripText: { fontSize: 12, fontWeight: '700' },
  timelineCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  subTabRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 3, marginBottom: 14 },
  subTabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  subTabBtnActive: { backgroundColor: '#FFFFFF' },
  subTabText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  subTabTextActive: { color: '#0F294A' },
  stopRow: { flexDirection: 'row', minHeight: 54, paddingHorizontal: 4, borderRadius: 10 },
  stopRowActive: { backgroundColor: '#EFF6FF', paddingVertical: 6 },
  trackCol: { width: 26, alignItems: 'center' },
  nodeDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  nodeDotTrainHere: { backgroundColor: '#2563EB', width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: '#BFDBFE' },
  nodeDotPassed: { backgroundColor: '#059669' },
  nodeDotFuture: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#0F294A' },
  trackLine: { flex: 1, width: 2.5, backgroundColor: '#E2E8F0', marginVertical: 2 },
  trackLinePassed: { flex: 1, width: 2.5, backgroundColor: '#059669', marginVertical: 2 },
  stopBody: { flex: 1, paddingBottom: 12, paddingLeft: 8 },
  stopName: { fontSize: 14, fontWeight: '700', color: '#0F294A', flex: 1, paddingRight: 6 },
  stopKm: { fontSize: 11, color: '#64748B', fontWeight: '700' },
  platformPointerBadge: { backgroundColor: '#1D4ED8', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  platformPointerText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  schedTime: { fontSize: 12, color: '#64748B' },
  projTime: { fontSize: 12, fontWeight: '700' },
  betweenPointerRow: { flexDirection: 'row', minHeight: 58, paddingHorizontal: 4 },
  betweenTrainDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0F294A',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  betweenTrainIcon: { fontSize: 12 },
  betweenPointerCard: {
    flex: 1,
    marginLeft: 8,
    marginVertical: 4,
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
    borderWidth: 1,
    borderRadius: 10,
    padding: 9,
  },
  betweenPointerTitle: { fontSize: 12, fontWeight: '800', color: '#1E3A8A' },
  betweenEtaBadge: { fontSize: 11, fontWeight: '800', color: '#1D4ED8' },
  betweenPointerSub: { fontSize: 11, color: '#1E40AF', marginTop: 2 },
  freightPill: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderWidth: 1, borderRadius: 8, padding: 8, marginLeft: 32, marginBottom: 10 },
  freightText: { fontSize: 11, fontWeight: '600', color: '#B45309' },
  delayList: { gap: 10 },
  causalCard: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FECACA' },
  causalTitle: { fontSize: 13, fontWeight: '800', color: '#991B1B' },
  causalBadge: { fontSize: 12, fontWeight: '800', color: '#D92D20' },
  causalMsg: { fontSize: 12, color: '#7F1D1D', marginTop: 4 },
  freightDetailCard: { backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FDE68A' },
  freightDetailTitle: { fontSize: 13, fontWeight: '800', color: '#92400E' },
  freightDetailBadge: { fontSize: 11, fontWeight: '800', color: '#B45309' },
  freightDetailMsg: { fontSize: 12, color: '#78350F', marginTop: 4 },
  clearBox: { backgroundColor: '#ECFDF5', borderRadius: 12, padding: 14, alignItems: 'center' },
  clearTitle: { fontSize: 14, fontWeight: '800', color: '#065F46' },
  clearSub: { fontSize: 12, color: '#047857', marginTop: 4, textAlign: 'center' },
});
