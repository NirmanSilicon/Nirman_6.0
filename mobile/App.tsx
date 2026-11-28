import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { CabModal } from './src/components/CabModal';
import { DemoModal } from './src/components/DemoModal';
import { TopHeader } from './src/components/TopHeader';
import { MapScreen } from './src/screens/MapScreen';
import { OverviewScreen } from './src/screens/OverviewScreen';
import { RescueScreen } from './src/screens/RescueScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { TimelineScreen } from './src/screens/TimelineScreen';
import { evaluateRescue, fetchCorridorState, fetchForecast } from './src/services/api';
import { wsClient } from './src/services/wsClient';
import { type MobileTab, useRailStore } from './src/stores/useRailStore';

const DASHBOARD_TABS: Array<{ id: MobileTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'map', label: 'Live Map' },
  { id: 'rescue', label: 'Rescue' },
];

export default function App() {
  const {
    backendOrigin,
    currentView,
    activeCorridorId,
    activeTab,
    selectedTrain,
    passengerStatus,
    destinationCode,
    transferBufferMins,
    activeSnapshot,
    wsConnected,
    setActiveTab,
    updateSnapshot,
    advanceOfflineSim,
    setForecast,
    setRescue,
  } = useRailStore();

  useEffect(() => {
    fetchCorridorState(backendOrigin).then(updateSnapshot).catch(() => {});
    wsClient.connect(backendOrigin);
    return () => {
      wsClient.disconnect();
    };
  }, [backendOrigin, updateSnapshot]);

  // Run local simulation tick when offline so standalone APKs animate smoothly
  useEffect(() => {
    if (wsConnected) return;
    const timer = setInterval(() => {
      advanceOfflineSim(15);
    }, 1500);
    return () => clearInterval(timer);
  }, [wsConnected, advanceOfflineSim]);

  const simBucket = Math.floor((activeSnapshot.tick_utc || 0) / 30);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const fc = await fetchForecast(backendOrigin, selectedTrain, activeCorridorId);
      if (!mounted) return;
      setForecast(fc);

      const targetStop =
        fc.station_timeline.find((s) => s.station_code === destinationCode) ??
        fc.station_timeline[fc.station_timeline.length - 1];
      const deadlineEpoch = targetStop?.sched_arr_epoch
        ? targetStop.sched_arr_epoch + (transferBufferMins + 15) * 60
        : (activeSnapshot.tick_utc || 1795071480) + 3600;

      const res = await evaluateRescue(backendOrigin, {
        train_no: selectedTrain,
        destination_code: targetStop?.station_code ?? destinationCode,
        connection_deadline_utc: deadlineEpoch,
        transfer_buffer_mins: transferBufferMins,
        passenger_status: passengerStatus,
      });
      if (mounted) setRescue(res);
    };

    load().catch(() => {});
    return () => {
      mounted = false;
    };
  }, [
    backendOrigin,
    activeCorridorId,
    selectedTrain,
    passengerStatus,
    destinationCode,
    transferBufferMins,
    simBucket,
    setForecast,
    setRescue,
  ]);

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[
          styles.safeArea,
          currentView === 'landing' && { backgroundColor: '#F4F7FA' },
        ]}
        edges={['top', 'bottom']}
      >
        <StatusBar style="dark" />
        {currentView === 'landing' ? (
          <SearchScreen />
        ) : (
          <View style={styles.dashboardRoot}>
            <TopHeader />
            <View style={styles.screenArea}>
              {activeTab === 'overview' && <OverviewScreen />}
              {activeTab === 'timeline' && <TimelineScreen />}
              {activeTab === 'map' && <MapScreen />}
              {activeTab === 'rescue' && <RescueScreen />}
            </View>

            <View style={styles.tabBar}>
              {DASHBOARD_TABS.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <Pressable
                    key={tab.id}
                    onPress={() => setActiveTab(tab.id)}
                    style={styles.tabItem}
                  >
                    <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                      {tab.label}
                    </Text>
                    {active && <View style={styles.tabIndicator} />}
                  </Pressable>
                );
              })}
            </View>

            <DemoModal />
            <CabModal />
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAF9F6' },
  dashboardRoot: { flex: 1 },
  screenArea: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 12.5, fontWeight: '600', color: '#64748B' },
  tabLabelActive: { color: '#0F294A', fontWeight: '800' },
  tabIndicator: {
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#0F294A',
    marginTop: 4,
  },
});
