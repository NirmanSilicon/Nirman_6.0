import type { CorridorSnapshot, ForecastResponse, RescueEvaluationResponse } from '../types/corridor';
import {
  MOCK_FORECAST_12821,
  MOCK_FORECAST_18410,
  MOCK_FORECAST_22895,
  MOCK_RESCUE_ONBOARD,
  MOCK_SNAPSHOT,
} from './mockDataEcor';
import {
  MOCK_FORECAST_SER_12821,
  MOCK_FORECAST_SER_12822,
  MOCK_FORECAST_SER_22895,
  MOCK_RESCUE_ONBOARD_SER,
  MOCK_SNAPSHOT_SER,
} from './mockDataSer';

export { MOCK_SNAPSHOT };

export function getMockSnapshot(corridorId?: string): CorridorSnapshot {
  return corridorId === 'SER_HWH_KGP' ? MOCK_SNAPSHOT_SER : MOCK_SNAPSHOT;
}

export function getMockForecast(trainNo: string, corridorId?: string): ForecastResponse {
  if (corridorId === 'SER_HWH_KGP') {
    if (trainNo === '22895') return MOCK_FORECAST_SER_22895;
    if (trainNo === '12822') return MOCK_FORECAST_SER_12822;
    return MOCK_FORECAST_SER_12821;
  }
  if (trainNo === '22895') return MOCK_FORECAST_22895;
  if (trainNo === '18410') return MOCK_FORECAST_18410;
  return MOCK_FORECAST_12821;
}

export function getMockRescue(
  passengerStatus: 'PRE_BOARDING' | 'ON_BOARD',
  corridorId?: string,
): RescueEvaluationResponse {
  if (passengerStatus === 'PRE_BOARDING') {
    return {
      passenger_status: 'PRE_BOARDING',
      survival_probability_pct: 18.0,
      risk_level: 'HIGH_RISK_MISS',
      safe_boarding_lock: true,
      boarding_advisory:
        'Report to your boarding station as per official schedule. Delayed trains can recover slack.',
      bailout_recommended: false,
      disclaimer: "Deboarding remains passenger's voluntary decision.",
    };
  }
  return corridorId === 'SER_HWH_KGP' ? MOCK_RESCUE_ONBOARD_SER : MOCK_RESCUE_ONBOARD;
}
