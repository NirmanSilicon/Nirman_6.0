import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  getDefaultRecentForCorridor,
  getPilotStationsForCorridor,
  getPilotTrainsForCorridor,
  type RecentItem,
} from '../constants/searchConstants';
import { type Lang, TRANSLATIONS } from '../constants/translations';
import { wsClient } from '../services/wsClient';
import { useRailStore } from '../stores/useRailStore';
import type { CorridorId } from '../types/corridor';

const LANG_OPTIONS: { code: Lang; label: string }[] = [
  { code: 'EN', label: 'EN' },
  { code: 'HI', label: 'हिं' },
  { code: 'OR', label: 'ଓଡ଼ି' },
];

function formatCurrentTimeIST(date: Date): string {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const ist = new Date(utcMs + 19800000);
  const h24 = ist.getHours();
  const mins = ist.getMinutes().toString().padStart(2, '0');
  const secs = ist.getSeconds().toString().padStart(2, '0');
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = (h24 % 12 === 0 ? 12 : h24 % 12).toString().padStart(2, '0');
  return `${h12}:${mins}:${secs} ${period}`;
}

export const SearchScreen: React.FC = () => {
  const {
    activeCorridorId,
    backendOrigin,
    wsConnected,
    wsStatusText,
    language,
    setLanguage,
    switchCorridor,
    setBackendOrigin,
    selectTrainAndOpen,
  } = useRailStore();

  const t = TRANSLATIONS[language];
  const isKolkata = activeCorridorId === 'SER_HWH_KGP';

  const ecorStations = useMemo(() => getPilotStationsForCorridor('ECoR_BHC_PURI'), []);
  const serStations = useMemo(() => getPilotStationsForCorridor('SER_HWH_KGP'), []);
  const corridorStations = useMemo(
    () => getPilotStationsForCorridor(activeCorridorId),
    [activeCorridorId]
  );

  const allAvailableTrains = useMemo(
    () => [
      ...getPilotTrainsForCorridor('ECoR_BHC_PURI').map((tr) => ({
        ...tr,
        corridorId: 'ECoR_BHC_PURI' as CorridorId,
        corridorName: 'ECoR • Odisha',
      })),
      ...getPilotTrainsForCorridor('SER_HWH_KGP').map((tr) => ({
        ...tr,
        corridorId: 'SER_HWH_KGP' as CorridorId,
        corridorName: 'SER • Kolkata',
      })),
    ],
    []
  );

  const [nowClock, setNowClock] = useState(() => formatCurrentTimeIST(new Date()));
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [fromStation, setFromStation] = useState('');
  const [toStation, setToStation] = useState('');
  const [trainQuery, setTrainQuery] = useState('');
  const [selectedRouteTrain, setSelectedRouteTrain] = useState<string | null>(null);
  const [unmatchedNotice, setUnmatchedNotice] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentItem[]>(() =>
    getDefaultRecentForCorridor(activeCorridorId)
  );

  const [stationPickerTarget, setStationPickerTarget] = useState<'from' | 'to' | null>(null);
  const [showServerModal, setShowServerModal] = useState(false);
  const [urlInput, setUrlInput] = useState(backendOrigin);

  useEffect(() => {
    const id = setInterval(() => {
      setNowClock(formatCurrentTimeIST(new Date()));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setRecent(getDefaultRecentForCorridor(activeCorridorId));
    setSelectedRouteTrain(null);
    setUnmatchedNotice(null);
  }, [activeCorridorId]);

  const switchCorridorForStation = async (code: string, isFrom: boolean) => {
    const isSer = serStations.some((s) => s.code === code);
    const targetCorridor: CorridorId = isSer ? 'SER_HWH_KGP' : 'ECoR_BHC_PURI';
    if (targetCorridor === activeCorridorId) return;

    if (isSer) {
      if (isFrom && toStation && !serStations.some((s) => s.code === toStation)) {
        setToStation('');
      } else if (!isFrom && fromStation && !serStations.some((s) => s.code === fromStation)) {
        setFromStation('');
      }
    } else {
      if (isFrom && toStation && !ecorStations.some((s) => s.code === toStation)) {
        setToStation('');
      } else if (!isFrom && fromStation && !ecorStations.some((s) => s.code === fromStation)) {
        setFromStation('');
      }
    }
    await switchCorridor(targetCorridor);
  };

  const handleSelectStation = (code: string) => {
    const target = stationPickerTarget;
    setStationPickerTarget(null);
    if (target === 'from') {
      setFromStation(code);
      void switchCorridorForStation(code, true);
    } else if (target === 'to') {
      setToStation(code);
      void switchCorridorForStation(code, false);
    }
  };

  const handleSwap = () => {
    const temp = fromStation;
    setFromStation(toStation);
    setToStation(temp);
  };

  const routeTrains = useMemo(() => {
    if (!fromStation || !toStation || fromStation === toStation) {
      return getPilotTrainsForCorridor(activeCorridorId);
    }
    const routeCorridorId: CorridorId = serStations.some((s) => s.code === fromStation)
      ? 'SER_HWH_KGP'
      : 'ECoR_BHC_PURI';
    const stations = getPilotStationsForCorridor(routeCorridorId);
    const trains = getPilotTrainsForCorridor(routeCorridorId);
    const fromKm = stations.find((s) => s.code === fromStation)?.km ?? 0;
    const toKm = stations.find((s) => s.code === toStation)?.km ?? 0;
    return fromKm < toKm
      ? trains.filter((tr) => tr.direction === 'DN')
      : trains.filter((tr) => tr.direction === 'UP');
  }, [fromStation, toStation, activeCorridorId, serStations]);

  const autocompleteSuggestions = useMemo(() => {
    const q = trainQuery.trim().toLowerCase();
    if (!q) return [];
    return allAvailableTrains.filter(
      (tr) =>
        tr.no.toLowerCase().includes(q) ||
        tr.name.toLowerCase().includes(q) ||
        tr.origin.toLowerCase().includes(q) ||
        tr.destination.toLowerCase().includes(q)
    );
  }, [allAvailableTrains, trainQuery]);

  const displayedTrains = trainQuery.trim()
    ? autocompleteSuggestions
    : routeTrains.map((tr) => ({
        ...tr,
        corridorId: activeCorridorId,
        corridorName: isKolkata ? 'SER • Kolkata' : 'ECoR • Odisha',
      }));

  const handleGoToStep2 = () => {
    setUnmatchedNotice(null);
    if (fromStation && toStation && fromStation !== toStation) {
      const fromStn = corridorStations.find((s) => s.code === fromStation);
      const toStn = corridorStations.find((s) => s.code === toStation);
      const label = `${fromStn?.name ?? fromStation} (${fromStation}) → ${toStn?.name ?? toStation} (${toStation})`;
      setRecent((prev) => {
        const filtered = prev.filter(
          (r) => !(r.fromCode === fromStation && r.toCode === toStation)
        );
        return [{ id: String(Date.now()), label, fromCode: fromStation, toCode: toStation }, ...filtered].slice(0, 2);
      });
    }
    setSelectedRouteTrain(routeTrains[0]?.no ?? null);
    setCurrentStep(2);
  };

  const handleRecentClick = (item: RecentItem) => {
    setFromStation(item.fromCode);
    setToStation(item.toCode);
    void switchCorridorForStation(item.fromCode, true);
    setUnmatchedNotice(null);
    setCurrentStep(2);
  };

  const handleSelectTrainAndNavigate = async (
    trainNo: string,
    targetCorridorId?: CorridorId
  ) => {
    if (targetCorridorId && targetCorridorId !== activeCorridorId) {
      await switchCorridor(targetCorridorId);
    }
    selectTrainAndOpen(trainNo);
  };

  const handleTrackSubmit = () => {
    const q = trainQuery.trim();
    if (!q) {
      if (selectedRouteTrain) {
        void handleSelectTrainAndNavigate(selectedRouteTrain);
      } else if (displayedTrains[0]) {
        void handleSelectTrainAndNavigate(displayedTrains[0].no, displayedTrains[0].corridorId);
      }
      return;
    }

    const qLower = q.toLowerCase();
    const match =
      allAvailableTrains.find((tr) => tr.no === q && tr.corridorId === activeCorridorId) ||
      allAvailableTrains.find((tr) => tr.no === q) ||
      allAvailableTrains.find((tr) => tr.name.toLowerCase() === qLower && tr.corridorId === activeCorridorId) ||
      allAvailableTrains.find((tr) => tr.name.toLowerCase() === qLower) ||
      (q.length >= 2
        ? allAvailableTrains.find(
            (tr) =>
              (tr.no.includes(q) ||
                tr.name.toLowerCase().includes(qLower) ||
                qLower.includes(tr.name.toLowerCase())) &&
              tr.corridorId === activeCorridorId
          ) ||
          allAvailableTrains.find(
            (tr) =>
              tr.no.includes(q) ||
              tr.name.toLowerCase().includes(qLower) ||
              qLower.includes(tr.name.toLowerCase())
          )
        : null);

    if (match) {
      setUnmatchedNotice(null);
      void handleSelectTrainAndNavigate(match.no, match.corridorId);
    } else {
      setUnmatchedNotice(q);
    }
  };

  const handleSaveServer = () => {
    const trimmed = urlInput.trim();
    if (trimmed) {
      setBackendOrigin(trimmed);
      wsClient.connect(trimmed);
    }
    setShowServerModal(false);
  };

  const getStationLabel = (code: string) => {
    const found = [...ecorStations, ...serStations].find((s) => s.code === code);
    return found ? `${found.name} (${found.code})` : '';
  };

  const searchDisabled = !fromStation || !toStation || fromStation === toStation;
  const trackDisabled = !trainQuery.trim() && displayedTrains.length === 0;

  return (
    <View style={styles.root}>
      {/* Sticky Landing Nav Bar (matching LandingNav.tsx) */}
      <View style={styles.navBar}>
        <View style={styles.navBrandPill}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>RP</Text>
          </View>
          <Text style={styles.navBrand}>{t.nav.brand}</Text>
        </View>

        <View style={styles.navRightGroup}>
          <Pressable
            onPress={() => setShowServerModal(true)}
            style={[
              styles.statusPill,
              wsConnected ? styles.statusPillOnline : styles.statusPillOffline,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: wsConnected ? '#059669' : '#D97706' },
              ]}
            />
            <Text style={styles.statusPillText}>{wsConnected ? 'LIVE' : 'DEMO'}</Text>
          </Pressable>

          <View style={styles.clockPill}>
            <Text style={styles.clockText}>{nowClock}</Text>
          </View>

          <View style={styles.langPillGroup}>
            {LANG_OPTIONS.map((opt) => {
              const active = language === opt.code;
              return (
                <Pressable
                  key={opt.code}
                  onPress={() => setLanguage(opt.code)}
                  style={[styles.langBtn, active && styles.langBtnActive]}
                >
                  <Text style={[styles.langBtnText, active && styles.langBtnTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HeroSection (matching HeroSection.tsx) */}
        <View style={styles.heroWrap}>
          <Text style={styles.heroHeadline}>{t.hero.headline}</Text>
          <Text style={styles.heroSubtitle}>{t.hero.subtitle}</Text>
        </View>

        {/* Dedicated Pilot Corridor Selector Bar (matching SearchCard.tsx) */}
        <View style={styles.corridorBar}>
          <Text style={styles.corridorBarLabel}>PILOT CORRIDOR:</Text>
          <View style={styles.corridorSeg}>
            <Pressable
              onPress={() => void switchCorridor('ECoR_BHC_PURI')}
              style={[styles.corridorSegBtn, !isKolkata && styles.corridorSegBtnActive]}
            >
              <Text
                style={[
                  styles.corridorSegText,
                  !isKolkata && styles.corridorSegTextEcorActive,
                ]}
              >
                ECoR • Odisha (BHC–PURI)
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void switchCorridor('SER_HWH_KGP')}
              style={[styles.corridorSegBtn, isKolkata && styles.corridorSegBtnActive]}
            >
              <Text
                style={[
                  styles.corridorSegText,
                  isKolkata && styles.corridorSegTextSerActive,
                ]}
              >
                SER • Kolkata (HWH–KGP)
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 2-Step Stepper Card (matching Stepper.tsx + SearchCard.tsx) */}
        <View style={styles.stepperCard}>
          {/* Step Indicator Row */}
          <View style={styles.stepIndicatorRow}>
            <Pressable
              onPress={() => setCurrentStep(1)}
              style={styles.stepItem}
            >
              <View
                style={[
                  styles.stepCircle,
                  currentStep >= 1 && styles.stepCircleActive,
                ]}
              >
                <Text style={styles.stepCircleText}>
                  {currentStep > 1 ? '✓' : '1'}
                </Text>
              </View>
              <Text
                style={[
                  styles.stepTitle,
                  currentStep === 1 && styles.stepTitleActive,
                ]}
              >
                {t.search.tabFind}
              </Text>
            </Pressable>

            <View
              style={[
                styles.stepConnector,
                currentStep === 2 && styles.stepConnectorActive,
              ]}
            />

            <Pressable
              onPress={() => setCurrentStep(2)}
              style={styles.stepItem}
            >
              <View
                style={[
                  styles.stepCircle,
                  currentStep === 2 && styles.stepCircleActive,
                ]}
              >
                <Text
                  style={[
                    styles.stepCircleText,
                    currentStep !== 2 && styles.stepCircleTextInactive,
                  ]}
                >
                  2
                </Text>
              </View>
              <Text
                style={[
                  styles.stepTitle,
                  currentStep === 2 && styles.stepTitleActive,
                ]}
              >
                {t.search.tabTrack}
              </Text>
            </Pressable>
          </View>

          {currentStep === 1 ? (
            <View style={styles.stepBody}>
              {/* FROM */}
              <View>
                <Text style={styles.inputLabel}>FROM</Text>
                <Pressable
                  onPress={() => setStationPickerTarget('from')}
                  style={styles.selectBox}
                >
                  <Text
                    style={[
                      styles.selectText,
                      !fromStation && styles.selectPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {fromStation ? getStationLabel(fromStation) : t.search.fromPlaceholder}
                  </Text>
                  <Text style={styles.chevron}>▾</Text>
                </Pressable>
              </View>

              {/* SWAP */}
              <View style={styles.swapRow}>
                <Pressable onPress={handleSwap} style={styles.swapCircle}>
                  <Text style={styles.swapIcon}>⇅</Text>
                </Pressable>
              </View>

              {/* TO */}
              <View>
                <Text style={styles.inputLabel}>TO</Text>
                <Pressable
                  onPress={() => setStationPickerTarget('to')}
                  style={styles.selectBox}
                >
                  <Text
                    style={[
                      styles.selectText,
                      !toStation && styles.selectPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {toStation ? getStationLabel(toStation) : t.search.toPlaceholder}
                  </Text>
                  <Text style={styles.chevron}>▾</Text>
                </Pressable>
              </View>

              {/* Recent Routes Strip */}
              <View style={styles.recentStrip}>
                <View style={styles.recentLeft}>
                  <Text style={styles.recentLabel}>Recent:</Text>
                  {recent.length === 0 ? (
                    <Text style={styles.recentEmpty}>No recent routes</Text>
                  ) : (
                    recent.map((item) => (
                      <Pressable
                        key={item.id}
                        onPress={() => handleRecentClick(item)}
                        style={styles.recentPill}
                      >
                        <Text style={styles.recentPillText} numberOfLines={1}>
                          {item.label}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </View>
                {recent.length > 0 && (
                  <Pressable onPress={() => setRecent([])}>
                    <Text style={styles.clearText}>Clear</Text>
                  </Pressable>
                )}
              </View>

              {/* Step 1 Footer */}
              <View style={styles.stepperFooterRight}>
                <Pressable
                  onPress={() => setCurrentStep(2)}
                  style={styles.ghostBtn}
                >
                  <Text style={styles.ghostBtnText}>Browse All Trains</Text>
                </Pressable>
                <Pressable
                  disabled={searchDisabled}
                  onPress={handleGoToStep2}
                  style={[
                    styles.primaryBtn,
                    searchDisabled && styles.primaryBtnDisabled,
                  ]}
                >
                  <Text style={styles.primaryBtnText}>{t.search.btnSearch} →</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.stepBody}>
              <View>
                <Text style={styles.inputLabel}>TRAIN NUMBER OR NAME</Text>
                <TextInput
                  style={styles.textInput}
                  value={trainQuery}
                  onChangeText={(val) => {
                    setTrainQuery(val);
                    setUnmatchedNotice(null);
                  }}
                  placeholder={isKolkata ? "Enter train no. or name (e.g. 12821, Steel Express)" : "Enter train no. or name (e.g. 12821, Vande Bharat)"}
                  placeholderTextColor="#94A3B8"
                  returnKeyType="search"
                  onSubmitEditing={handleTrackSubmit}
                />
              </View>

              {unmatchedNotice && (
                <View style={styles.noticeBanner}>
                  <Text style={styles.noticeText}>
                    Live telemetry is currently active for{' '}
                    <Text style={{ fontWeight: '700' }}>
                      {isKolkata ? 'Howrah–Kharagpur' : 'Bhadrak–Puri'}
                    </Text>
                    . Choose one of the live trains below:
                  </Text>
                </View>
              )}

              <Text style={styles.listSectionLabel}>
                {trainQuery.trim()
                  ? `MATCHING TRAINS (${displayedTrains.length})`
                  : fromStation && toStation && fromStation !== toStation
                    ? `TRAINS ON ${fromStation} → ${toStation} (${displayedTrains.length})`
                    : `ACTIVE CORRIDOR TRAINS (${displayedTrains.length})`}
              </Text>

              {displayedTrains.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyBoxText}>
                    No matching trains found. Clear the search or switch corridor above.
                  </Text>
                </View>
              ) : (
                <View style={styles.trainList}>
                  {displayedTrains.map((tr) => {
                    const isSelected = selectedRouteTrain === tr.no && !trainQuery.trim();
                    const isAmber = tr.statusColor === 'amber';
                    return (
                      <Pressable
                        key={`${tr.no}-${tr.corridorId}`}
                        onPress={() => {
                          setSelectedRouteTrain(tr.no);
                          void handleSelectTrainAndNavigate(tr.no, tr.corridorId);
                        }}
                        style={[
                          styles.trainCard,
                          isSelected && styles.trainCardSelected,
                        ]}
                      >
                        <View style={styles.trainCardLeft}>
                          <View style={styles.trainIconBox}>
                            <Text style={styles.trainIconGlyph}>🚆</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={styles.trainTitleRow}>
                              <Text style={styles.trainNo}>{tr.no}</Text>
                              <Text style={styles.trainName} numberOfLines={1}>
                                {tr.name}
                              </Text>
                            </View>
                            <Text style={styles.trainSub} numberOfLines={1}>
                              {tr.subtitle}
                            </Text>
                            <View style={styles.trainBadgeRow}>
                              <View
                                style={[
                                  styles.corridorTag,
                                  tr.corridorId === 'SER_HWH_KGP'
                                    ? styles.corridorTagSer
                                    : styles.corridorTagEcor,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.corridorTagText,
                                    tr.corridorId === 'SER_HWH_KGP'
                                      ? { color: '#78350F' }
                                      : { color: '#312E81' },
                                  ]}
                                >
                                  {tr.corridorName}
                                </Text>
                              </View>
                              <View
                                style={[
                                  styles.delayTag,
                                  isAmber ? styles.delayTagAmber : styles.delayTagEmerald,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.delayTagText,
                                    { color: isAmber ? '#92400E' : '#065F46' },
                                  ]}
                                >
                                  {tr.delayStatus}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                        <Text style={styles.cardArrow}>→</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* Step 2 Footer */}
              <View style={styles.stepperFooterSplit}>
                <Pressable
                  onPress={() => setCurrentStep(1)}
                  style={styles.backBtn}
                >
                  <Text style={styles.backBtnText}>← Back</Text>
                </Pressable>
                <Pressable
                  disabled={trackDisabled}
                  onPress={handleTrackSubmit}
                  style={[
                    styles.primaryBtn,
                    trackDisabled && styles.primaryBtnDisabled,
                  ]}
                >
                  <Text style={styles.primaryBtnText}>{t.search.btnTrack} →</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* ValueComparison (matching ValueComparison.tsx) */}
        <View style={styles.comparisonCard}>
          <View style={styles.compStandard}>
            <Text style={styles.compStandardLabel}>{t.comparison.standardLabel}</Text>
            <Text style={styles.compTitle}>{t.comparison.standardTitle}</Text>
            <Text style={styles.compDesc}>{t.comparison.standardDesc}</Text>
          </View>
          <View style={styles.compDivider} />
          <View style={styles.compRp}>
            <Text style={styles.compRpLabel}>✓ {t.comparison.rpLabel}</Text>
            <Text style={styles.compTitle}>{t.comparison.rpTitle}</Text>
            <Text style={styles.compDesc}>{t.comparison.rpDesc}</Text>
          </View>
        </View>

        {/* HowItWorks (matching HowItWorks.tsx) */}
        <View style={styles.stepsGrid}>
          {[
            { badge: t.steps.s1Badge, title: t.steps.s1Title, desc: t.steps.s1Desc, icon: '🔍' },
            { badge: t.steps.s2Badge, title: t.steps.s2Title, desc: t.steps.s2Desc, icon: '📈' },
            { badge: t.steps.s3Badge, title: t.steps.s3Title, desc: t.steps.s3Desc, icon: '🛡️' },
          ].map((step, i) => (
            <View key={i} style={styles.howCard}>
              <View style={styles.howCardHeader}>
                <Text style={styles.howBadge}>{step.badge}</Text>
                <View style={styles.howIconBox}>
                  <Text style={{ fontSize: 14 }}>{step.icon}</Text>
                </View>
              </View>
              <Text style={styles.howTitle}>{step.title}</Text>
              <Text style={styles.howDesc}>{step.desc}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Station Picker Modal */}
      <Modal
        visible={stationPickerTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setStationPickerTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {stationPickerTarget === 'from'
                  ? 'Select Departure Station'
                  : 'Select Destination Station'}
              </Text>
              <Pressable onPress={() => setStationPickerTarget(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={styles.groupHeader}>Bhadrak – Puri (ECoR)</Text>
              {ecorStations.map((s) => (
                <Pressable
                  key={`ecor-${s.code}`}
                  onPress={() => handleSelectStation(s.code)}
                  style={styles.stationOption}
                >
                  <Text style={styles.stationOptName}>{s.name}</Text>
                  <Text style={styles.stationOptCode}>{s.code}</Text>
                </Pressable>
              ))}
              <Text style={[styles.groupHeader, { marginTop: 12 }]}>
                Howrah – Kharagpur (SER)
              </Text>
              {serStations.map((s) => (
                <Pressable
                  key={`ser-${s.code}`}
                  onPress={() => handleSelectStation(s.code)}
                  style={styles.stationOption}
                >
                  <Text style={styles.stationOptName}>{s.name}</Text>
                  <Text style={styles.stationOptCode}>{s.code}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Backend Connection Modal */}
      <Modal
        visible={showServerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowServerModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.serverModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Backend Telemetry Server</Text>
              <Pressable onPress={() => setShowServerModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.serverHint}>
              Status: {wsStatusText}. Enter PC LAN IP for physical phone or http://10.0.2.2:8000 for Android Emulator.
            </Text>
            <TextInput
              style={styles.textInput}
              value={urlInput}
              onChangeText={setUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://192.168.1.33:8000"
            />
            <View style={[styles.stepperFooterSplit, { marginTop: 14 }]}>
              <Pressable
                onPress={() => setShowServerModal(false)}
                style={styles.backBtn}
              >
                <Text style={styles.backBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSaveServer} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Connect</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F7FA' },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  navBrandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  logoCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0F294A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#00C4DC', fontWeight: '900', fontSize: 11 },
  navBrand: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.1,
    color: '#0F294A',
  },
  navRightGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillOnline: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  statusPillOffline: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 10, fontWeight: '800', color: '#1E293B' },
  clockPill: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  clockText: { fontSize: 10, fontWeight: '700', color: '#475569' },
  langPillGroup: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    padding: 2,
  },
  langBtn: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 999 },
  langBtnActive: { backgroundColor: '#0F294A' },
  langBtnText: { fontSize: 10, fontWeight: '700', color: '#475569' },
  langBtnTextActive: { color: '#FFFFFF' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32, gap: 14 },

  heroWrap: { alignItems: 'center', paddingTop: 6, paddingHorizontal: 6 },
  heroHeadline: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F294A',
    textAlign: 'center',
    lineHeight: 30,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 13.5,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },

  corridorBar: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 8,
  },
  corridorBarLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  corridorSeg: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  corridorSegBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 9,
    alignItems: 'center',
  },
  corridorSegBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  corridorSegText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  corridorSegTextEcorActive: { color: '#1E1B4B' },
  corridorSegTextSerActive: { color: '#451A03' },

  stepperCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: { backgroundColor: '#0F294A' },
  stepCircleText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  stepCircleTextInactive: { color: '#475569' },
  stepTitle: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  stepTitleActive: { color: '#0F294A' },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 10,
    borderRadius: 2,
  },
  stepConnectorActive: { backgroundColor: '#0F294A' },

  stepBody: { gap: 10 },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  selectBox: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: { fontSize: 14, fontWeight: '600', color: '#0F172A', flex: 1 },
  selectPlaceholder: { color: '#94A3B8', fontWeight: '400' },
  chevron: { fontSize: 14, color: '#64748B', marginLeft: 8 },
  swapRow: { alignItems: 'center', marginVertical: -4, zIndex: 2 },
  swapCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapIcon: { fontSize: 16, fontWeight: '800', color: '#475569' },

  recentStrip: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  recentLeft: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  recentLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8' },
  recentEmpty: { fontSize: 11, color: '#94A3B8', fontStyle: 'italic' },
  recentPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    maxWidth: '100%',
  },
  recentPillText: { fontSize: 11, fontWeight: '600', color: '#334155' },
  clearText: { fontSize: 11, fontWeight: '600', color: '#94A3B8' },

  stepperFooterRight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    gap: 10,
  },
  stepperFooterSplit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    gap: 10,
  },
  ghostBtn: { paddingVertical: 10, paddingHorizontal: 10 },
  ghostBtnText: { fontSize: 12.5, fontWeight: '700', color: '#475569' },
  backBtn: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  backBtnText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  primaryBtn: {
    backgroundColor: '#0F294A',
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },

  textInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
  },
  noticeBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 10,
  },
  noticeText: { fontSize: 12, color: '#334155', lineHeight: 17 },
  listSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  emptyBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  emptyBoxText: { fontSize: 12, color: '#64748B', textAlign: 'center' },
  trainList: { gap: 8 },
  trainCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  trainCardSelected: {
    borderColor: '#0F294A',
    backgroundColor: '#F8FAFC',
  },
  trainCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  trainIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainIconGlyph: { fontSize: 18 },
  trainTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trainNo: { fontSize: 14, fontWeight: '900', color: '#0F294A' },
  trainName: { fontSize: 13.5, fontWeight: '700', color: '#1E293B', flex: 1 },
  trainSub: { fontSize: 11.5, color: '#64748B', marginTop: 2 },
  trainBadgeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  corridorTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  corridorTagEcor: { backgroundColor: '#EEF2FF' },
  corridorTagSer: { backgroundColor: '#FEF3C7' },
  corridorTagText: { fontSize: 10, fontWeight: '800' },
  delayTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  delayTagAmber: { backgroundColor: '#FEF3C7' },
  delayTagEmerald: { backgroundColor: '#D1FAE5' },
  delayTagText: { fontSize: 10, fontWeight: '800' },
  cardArrow: { fontSize: 16, fontWeight: '800', color: '#0F294A', marginLeft: 8 },

  comparisonCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  compStandard: { backgroundColor: '#F8FAFC', padding: 16, gap: 4 },
  compDivider: { height: 1, backgroundColor: '#E2E8F0' },
  compRp: { backgroundColor: '#ECFDF5', padding: 16, gap: 4 },
  compStandardLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.7,
  },
  compRpLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.7,
  },
  compTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  compDesc: { fontSize: 13, color: '#475569', lineHeight: 19 },

  stepsGrid: { gap: 10 },
  howCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 15,
  },
  howCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  howBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F294A',
    opacity: 0.75,
    letterSpacing: 0.8,
  },
  howIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  howTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  howDesc: { fontSize: 13, color: '#475569', marginTop: 4, lineHeight: 19 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: 28,
  },
  serverModalCard: {
    backgroundColor: '#FFFFFF',
    margin: 18,
    marginBottom: 'auto',
    marginTop: 'auto',
    borderRadius: 20,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0F294A' },
  modalClose: { fontSize: 18, fontWeight: '700', color: '#64748B', padding: 4 },
  groupHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  stationOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stationOptName: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  stationOptCode: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F294A',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  serverHint: { fontSize: 12, color: '#475569', marginBottom: 10, lineHeight: 17 },
});
