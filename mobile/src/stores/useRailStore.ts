import { create } from 'zustand';
import { getDefaultBackendOrigin } from '../config/apiConfig';
import { switchCorridorApi } from '../services/api';
import {
  getMockSnapshot,
  getStationsForCorridor,
  MOCK_SNAPSHOT,
} from '../services/mockFallback';
import type {
  CorridorId,
  CorridorSnapshot,
  ForecastResponse,
  RescueEvaluationResponse,
} from '../types/corridor';

export type MobileTab = 'search' | 'timeline' | 'map' | 'rescue';

function interpolateLatLon(
  chainageKm: number,
  corridorId: CorridorId
): { lat: number; lon: number } {
  const stations = getStationsForCorridor(corridorId);
  if (chainageKm <= stations[0].chainage_km) {
    return { lat: stations[0].lat, lon: stations[0].lon };
  }
  const last = stations[stations.length - 1];
  if (chainageKm >= last.chainage_km) {
    return { lat: last.lat, lon: last.lon };
  }
  for (let i = 0; i < stations.length - 1; i++) {
    const a = stations[i];
    const b = stations[i + 1];
    if (chainageKm >= a.chainage_km && chainageKm <= b.chainage_km) {
      const span = b.chainage_km - a.chainage_km;
      const r = span > 0 ? (chainageKm - a.chainage_km) / span : 0;
      return {
        lat: Number((a.lat + r * (b.lat - a.lat)).toFixed(5)),
        lon: Number((a.lon + r * (b.lon - a.lon)).toFixed(5)),
      };
    }
  }
  return { lat: last.lat, lon: last.lon };
}

interface RailMobileStore {
  backendOrigin: string;
  activeCorridorId: CorridorId;
  activeTab: MobileTab;
  selectedTrain: string;
  passengerStatus: 'PRE_BOARDING' | 'ON_BOARD';
  destinationCode: string;
  transferBufferMins: number;

  activeSnapshot: CorridorSnapshot;
  forecast: ForecastResponse | null;
  rescue: RescueEvaluationResponse | null;

  wsConnected: boolean;
  wsStatusText: string;

  setBackendOrigin: (url: string) => void;
  switchCorridor: (corridorId: CorridorId) => Promise<void>;
  setActiveTab: (tab: MobileTab) => void;
  selectTrainAndOpen: (trainNo: string) => void;
  setPassengerStatus: (status: 'PRE_BOARDING' | 'ON_BOARD') => void;
  setDestinationCode: (code: string) => void;
  setTransferBufferMins: (mins: number) => void;
  updateSnapshot: (snapshot: CorridorSnapshot) => void;
  advanceOfflineSim: (elapsedSecs?: number) => void;
  injectLocalDelay: (trainNo: string, addedMins: number) => void;
  resetLocalSim: () => void;
  setForecast: (forecast: ForecastResponse) => void;
  setRescue: (rescue: RescueEvaluationResponse) => void;
  setWsStatus: (connected: boolean, text: string) => void;
}

export const useRailStore = create<RailMobileStore>((set, get) => ({
  backendOrigin: getDefaultBackendOrigin(),
  activeCorridorId: 'ECoR_BHC_PURI',
  activeTab: 'search',
  selectedTrain: '12821',
  passengerStatus: 'ON_BOARD',
  destinationCode: 'BBS',
  transferBufferMins: 15,

  activeSnapshot: MOCK_SNAPSHOT,
  forecast: null,
  rescue: null,

  wsConnected: false,
  wsStatusText: 'Demo Mode',

  setBackendOrigin: (url) => set({ backendOrigin: url.replace(/\/+$/, '') }),
  switchCorridor: async (corridorId) => {
    const isKolkata = corridorId === 'SER_HWH_KGP';
    set({
      activeCorridorId: corridorId,
      selectedTrain: '12821',
      destinationCode: isKolkata ? 'HWH' : 'BBS',
      activeSnapshot: getMockSnapshot(corridorId),
    });
    if (get().wsConnected) {
      try {
        await switchCorridorApi(get().backendOrigin, corridorId);
      } catch {
        // Offline fallback already applied above
      }
    }
  },
  setActiveTab: (tab) => set({ activeTab: tab }),
  selectTrainAndOpen: (trainNo) =>
    set({ selectedTrain: trainNo, activeTab: 'timeline' }),
  setPassengerStatus: (status) => set({ passengerStatus: status }),
  setDestinationCode: (code) => set({ destinationCode: code }),
  setTransferBufferMins: (mins) => set({ transferBufferMins: mins }),
  updateSnapshot: (snapshot) => set({ activeSnapshot: snapshot }),
  advanceOfflineSim: (elapsedSecs = 15) =>
    set((state) => {
      const maxKm = state.activeCorridorId === 'SER_HWH_KGP' ? 115 : 206;
      const deltaHours = elapsedSecs / 3600;
      const trains = state.activeSnapshot.trains.map((t) => {
        const speed = t.speed_kmph > 0 ? t.speed_kmph : 65;
        const deltaKm = speed * deltaHours;
        let nextKm =
          t.direction === 'DN' ? t.chainage_km + deltaKm : t.chainage_km - deltaKm;
        if (nextKm >= maxKm) nextKm = 0;
        if (nextKm <= 0) nextKm = maxKm;
        const { lat, lon } = interpolateLatLon(nextKm, state.activeCorridorId);
        return {
          ...t,
          speed_kmph: t.speed_kmph > 0 ? t.speed_kmph : 65,
          status: t.speed_kmph > 0 ? t.status : 'RUNNING_NORMAL',
          chainage_km: Number(nextKm.toFixed(2)),
          lat,
          lon,
          last_updated_epoch: state.activeSnapshot.tick_utc + elapsedSecs,
        };
      });
      return {
        activeSnapshot: {
          ...state.activeSnapshot,
          mode: 'DEMO_OFFLINE',
          tick_utc: state.activeSnapshot.tick_utc + elapsedSecs,
          trains,
        },
      };
    }),
  injectLocalDelay: (trainNo, addedMins) =>
    set((state) => ({
      activeSnapshot: {
        ...state.activeSnapshot,
        trains: state.activeSnapshot.trains.map((t) =>
          t.train_no === trainNo
            ? { ...t, current_delay_mins: t.current_delay_mins + addedMins }
            : t
        ),
      },
    })),
  resetLocalSim: () =>
    set((state) => ({
      activeSnapshot: getMockSnapshot(state.activeCorridorId),
    })),
  setForecast: (forecast) => set({ forecast }),
  setRescue: (rescue) => set({ rescue }),
  setWsStatus: (connected, text) =>
    set({ wsConnected: connected, wsStatusText: text }),
}));
