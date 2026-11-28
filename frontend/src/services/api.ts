import type {
  CorridorSnapshot,
  ForecastResponse,
  RescueEvaluationResponse,
} from '../types/corridor';
import { getMockForecast, getMockRescue } from './mockFallback';

const API_BASE = '/api/v1';

interface CorridorConfig {
  mapbox_access_token?: string | null;
  corridor_name: string;
  corridor_start_km: number;
  corridor_end_km: number;
}

interface ApiResponseStatus {
  status: string;
  message?: string;
  [key: string]: unknown;
}

interface DisruptionCausesResponse {
  catalog: Array<{
    id: string;
    label: string;
    added_delay_mins: number;
    freight_penalty_mins: number;
    rain_mm_hr: number;
    message: string;
  }>;
  active_causes: string[];
}

interface ApplyCausesResponse {
  status: string;
  active_causes: string[];
  new_delay_mins: number;
}

interface LiveOvertakeResponse {
  status: string;
  hold_station_code: string;
  hold_station_name: string;
  hold_km: number;
  dhauli_km: number;
  vande_km: number;
}

interface SpawnRandomGoodsResponse {
  status: string;
  rake_id: string;
  block_id: string;
  chainage_km: number;
}

async function requestJson<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

function postJson<T>(
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>
): Promise<T> {
  return requestJson<T>(path, {
    method: 'POST',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...extraHeaders,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

let configCachePromise: Promise<CorridorConfig> | null = null;

export async function fetchCorridorState(): Promise<CorridorSnapshot | null> {
  try {
    const data = await requestJson<CorridorSnapshot>('/corridor/state');
    if (data && Array.isArray(data.trains)) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchCorridorConfig(): Promise<CorridorConfig> {
  if (!configCachePromise) {
    configCachePromise = requestJson<CorridorConfig>('/corridor/config').catch((err) => {
      configCachePromise = null;
      console.warn('Corridor config fetch failed', err);
      return {
        corridor_name: 'ECoR_BHC_PURI',
        corridor_start_km: 0.0,
        corridor_end_km: 206.0,
      };
    });
  }
  return configCachePromise;
}

export async function switchCorridorApi(
  corridorId: string,
  speedMultiplier: number
): Promise<CorridorSnapshot | null> {
  try {
    const snap = await postJson<CorridorSnapshot>('/corridor/switch', {
      corridor_id: corridorId,
      speed_multiplier: speedMultiplier,
    });
    return snap && Array.isArray(snap.trains) && snap.trains.length > 0 ? snap : null;
  } catch (err) {
    console.warn('Corridor switch network error:', err);
    return null;
  }
}

export async function fetchForecast(
  trainNo: string,
  corridorId?: string,
): Promise<ForecastResponse> {
  try {
    return await requestJson<ForecastResponse>(`/trains/${encodeURIComponent(trainNo)}/forecast`);
  } catch (err) {
    console.warn(`Forecast fetch for ${trainNo} failed, using mock data`, err);
    return getMockForecast(trainNo, corridorId);
  }
}

export async function evaluateRescue(
  payload: {
    train_no: string;
    destination_code: string;
    connection_deadline_utc: number;
    transfer_buffer_mins: number;
    passenger_status: 'PRE_BOARDING' | 'ON_BOARD';
  },
  corridorId?: string,
): Promise<RescueEvaluationResponse> {
  try {
    return await postJson<RescueEvaluationResponse>('/rescue/evaluate', payload);
  } catch (err) {
    console.warn('Rescue evaluation failed, using fallback', err);
    return getMockRescue(payload.passenger_status, corridorId);
  }
}

export function injectTrainDelay(trainNo: string, addedDelayMins: number): Promise<ApiResponseStatus> {
  return postJson<ApiResponseStatus>('/demo/inject-delay', {
    train_no: trainNo,
    added_delay_mins: addedDelayMins,
  });
}

export function startDemoScenario(name = 'DHAULI_CASCADE', speed = 1): Promise<ApiResponseStatus> {
  return postJson<ApiResponseStatus>('/demo/scenario/start', {
    scenario_name: name,
    speed_multiplier: speed,
  });
}

export function setSpeedMultiplier(multiplier: number): Promise<ApiResponseStatus> {
  return postJson<ApiResponseStatus>('/demo/speed', {
    speed_multiplier: multiplier,
  });
}

export function injectFreightShadow(
  blockId = 'DN_CTC_BRAG',
  penaltyMins = 20.0,
  confidence = 0.88
): Promise<ApiResponseStatus> {
  return postJson<ApiResponseStatus>('/demo/inject-freight', {
    block_id: blockId,
    penalty_mins: penaltyMins,
    confidence,
  });
}

export function spawnRandomGoodsTrain(
  targetTrainNo?: string,
  blockId?: string
): Promise<SpawnRandomGoodsResponse> {
  return postJson<SpawnRandomGoodsResponse>('/demo/random-freight', {
    target_train_no: targetTrainNo ?? null,
    block_id: blockId ?? null,
  });
}

export function resetCorridor(): Promise<ApiResponseStatus> {
  return postJson<ApiResponseStatus>('/demo/reset');
}

export function fetchDisruptionCauses(trainNo: string): Promise<DisruptionCausesResponse> {
  return requestJson<DisruptionCausesResponse>(
    `/demo/causes?train_no=${encodeURIComponent(trainNo)}`
  );
}

export function applyDisruptionCauses(
  trainNo: string,
  causes: string[]
): Promise<ApplyCausesResponse> {
  return postJson<ApplyCausesResponse>('/demo/apply-causes', {
    train_no: trainNo,
    causes,
  });
}

export function triggerLiveOvertake(): Promise<LiveOvertakeResponse> {
  return postJson<LiveOvertakeResponse>('/demo/trigger-overtake');
}

export function injectULIPFreight(
  blockId: string = 'DN_CTC_BRAG',
  rakeId: string = 'BOXN_COAL_CONFIRMED'
): Promise<ApiResponseStatus> {
  return postJson<ApiResponseStatus>(
    '/webhooks/ulip-fois',
    {
      rake_id: rakeId,
      block_id: blockId,
      direction: 'DN',
      speed_kmph: 28.0,
      cargo_type: 'COAL',
    },
    { 'X-ULIP-API-Key': 'railpulse-enterprise-ulip-key' }
  );
}

