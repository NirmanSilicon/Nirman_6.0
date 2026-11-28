import type {
  CorridorId,
  CorridorSnapshot,
  ForecastResponse,
  RescueEvaluationResponse,
  Station,
} from '../types/corridor';

export const ECOR_STATIONS: Station[] = [
  { station_code: 'BHC', station_name: 'Bhadrak', chainage_km: 0.0, lat: 21.0583, lon: 86.495, has_750m_goods_loop: true, passenger_loops_dn: 2, passenger_loops_up: 2, is_major_junction: true, road_exit_penalty_m: 10 },
  { station_code: 'JJKR', station_name: 'Jajpur Keonjhar Rd', chainage_km: 44.0, lat: 20.95, lon: 86.1333, has_750m_goods_loop: true, passenger_loops_dn: 1, passenger_loops_up: 1, is_major_junction: false, road_exit_penalty_m: 8 },
  { station_code: 'JKPR', station_name: 'Jakhapura Jn', chainage_km: 51.0, lat: 20.94, lon: 86.06, has_750m_goods_loop: true, passenger_loops_dn: 2, passenger_loops_up: 2, is_major_junction: true, road_exit_penalty_m: 10 },
  { station_code: 'NRG', station_name: 'Nergundi Jn', chainage_km: 106.0, lat: 20.55, lon: 85.92, has_750m_goods_loop: true, passenger_loops_dn: 1, passenger_loops_up: 1, is_major_junction: false, road_exit_penalty_m: 8 },
  { station_code: 'CTC', station_name: 'Cuttack Jn', chainage_km: 115.0, lat: 20.4625, lon: 85.8829, has_750m_goods_loop: true, passenger_loops_dn: 3, passenger_loops_up: 3, is_major_junction: true, road_exit_penalty_m: 12 },
  { station_code: 'BRAG', station_name: 'Barang Jn', chainage_km: 128.0, lat: 20.4, lon: 85.83, has_750m_goods_loop: true, passenger_loops_dn: 2, passenger_loops_up: 2, is_major_junction: true, road_exit_penalty_m: 8 },
  { station_code: 'BBS', station_name: 'Bhubaneswar', chainage_km: 143.0, lat: 20.2667, lon: 85.8333, has_750m_goods_loop: false, passenger_loops_dn: 4, passenger_loops_up: 4, is_major_junction: true, road_exit_penalty_m: 12 },
  { station_code: 'KUR', station_name: 'Khurda Road Jn', chainage_km: 162.0, lat: 20.1833, lon: 85.7333, has_750m_goods_loop: true, passenger_loops_dn: 3, passenger_loops_up: 3, is_major_junction: true, road_exit_penalty_m: 12 },
  { station_code: 'PURI', station_name: 'Puri Terminal', chainage_km: 206.0, lat: 19.8133, lon: 85.8314, has_750m_goods_loop: false, passenger_loops_dn: 4, passenger_loops_up: 4, is_major_junction: true, road_exit_penalty_m: 15 },
];

export const SER_STATIONS: Station[] = [
  { station_code: 'HWH', station_name: 'Howrah Jn', chainage_km: 0.0, lat: 22.583, lon: 88.3426, has_750m_goods_loop: true, passenger_loops_dn: 4, passenger_loops_up: 4, is_major_junction: true, road_exit_penalty_m: 15 },
  { station_code: 'SRC', station_name: 'Santragachi Jn', chainage_km: 7.0, lat: 22.58, lon: 88.283, has_750m_goods_loop: true, passenger_loops_dn: 3, passenger_loops_up: 3, is_major_junction: true, road_exit_penalty_m: 10 },
  { station_code: 'ULB', station_name: 'Uluberia', chainage_km: 32.0, lat: 22.47, lon: 88.11, has_750m_goods_loop: true, passenger_loops_dn: 2, passenger_loops_up: 2, is_major_junction: false, road_exit_penalty_m: 8 },
  { station_code: 'BZN', station_name: 'Bagnan', chainage_km: 45.0, lat: 22.46, lon: 87.97, has_750m_goods_loop: true, passenger_loops_dn: 2, passenger_loops_up: 2, is_major_junction: false, road_exit_penalty_m: 8 },
  { station_code: 'MCA', station_name: 'Mecheda Jn', chainage_km: 58.0, lat: 22.42, lon: 87.86, has_750m_goods_loop: true, passenger_loops_dn: 2, passenger_loops_up: 2, is_major_junction: true, road_exit_penalty_m: 10 },
  { station_code: 'PKU', station_name: 'Panskura Jn', chainage_km: 71.0, lat: 22.41, lon: 87.72, has_750m_goods_loop: true, passenger_loops_dn: 3, passenger_loops_up: 3, is_major_junction: true, road_exit_penalty_m: 10 },
  { station_code: 'BCK', station_name: 'Balichak', chainage_km: 91.0, lat: 22.37, lon: 87.55, has_750m_goods_loop: true, passenger_loops_dn: 1, passenger_loops_up: 1, is_major_junction: false, road_exit_penalty_m: 8 },
  { station_code: 'KGP', station_name: 'Kharagpur Jn', chainage_km: 115.0, lat: 22.33, lon: 87.32, has_750m_goods_loop: true, passenger_loops_dn: 4, passenger_loops_up: 4, is_major_junction: true, road_exit_penalty_m: 12 },
];

export function getStationsForCorridor(corridorId: CorridorId): Station[] {
  return corridorId === 'SER_HWH_KGP' ? SER_STATIONS : ECOR_STATIONS;
}

export const MOCK_SNAPSHOT: CorridorSnapshot = {
  tick_utc: 1795071480,
  mode: 'OFFLINE_FALLBACK',
  speed_multiplier: 1.0,
  trains: [
    {
      train_no: '12821',
      train_name: 'Dhauli Express',
      direction: 'DN',
      priority_rank: 2,
      chainage_km: 115.0,
      lat: 20.4625,
      lon: 85.8829,
      speed_kmph: 0.0,
      current_delay_mins: 28.0,
      current_station: 'CTC',
      next_station: 'BRAG',
      last_updated_epoch: 1795071480,
      status: 'AT_STATION_HALT',
    },
    {
      train_no: '22895',
      train_name: 'Howrah-Puri Vande Bharat Express',
      direction: 'DN',
      priority_rank: 1,
      chainage_km: 60.0,
      lat: 20.87,
      lon: 86.03,
      speed_kmph: 130.0,
      current_delay_mins: 2.0,
      current_station: null,
      next_station: 'NRG',
      last_updated_epoch: 1795071480,
      status: 'RUNNING_HIGH_SPEED',
    },
    {
      train_no: '18410',
      train_name: 'Sri Jagannath Express',
      direction: 'UP',
      priority_rank: 3,
      chainage_km: 155.0,
      lat: 20.22,
      lon: 85.78,
      speed_kmph: 85.0,
      current_delay_mins: 5.0,
      current_station: null,
      next_station: 'BBS',
      last_updated_epoch: 1795071480,
      status: 'RUNNING_NORMAL',
    },
  ],
  phantom_freights: [
    {
      block_id: 'DN_CTC_BRAG',
      direction: 'DN',
      str_value: 1.85,
      freight_probability: 0.88,
      status: 'PHANTOM_FREIGHT_SHADOW',
      clearance_station: 'BRAG',
      clearance_eta_mins: 20.0,
    },
  ],
  weather: {
    rain_mm_hr: 2.0,
    wind_speed_kmph: 14.0,
    condition: 'OVERCAST',
  },
};

export const MOCK_SNAPSHOT_SER: CorridorSnapshot = {
  tick_utc: 1795071480,
  mode: 'OFFLINE_FALLBACK',
  speed_multiplier: 1.0,
  trains: [
    {
      train_no: '12821',
      train_name: 'Steel Express',
      direction: 'DN',
      priority_rank: 2,
      chainage_km: 58.0,
      lat: 22.42,
      lon: 87.86,
      speed_kmph: 0.0,
      current_delay_mins: 28.0,
      current_station: 'MCA',
      next_station: 'PKU',
      last_updated_epoch: 1795071480,
      status: 'AT_STATION_HALT',
    },
    {
      train_no: '22895',
      train_name: 'Howrah–Ranchi Vande Bharat Express',
      direction: 'DN',
      priority_rank: 1,
      chainage_km: 7.0,
      lat: 22.58,
      lon: 88.283,
      speed_kmph: 130.0,
      current_delay_mins: 2.0,
      current_station: 'SRC',
      next_station: 'ULB',
      last_updated_epoch: 1795071480,
      status: 'RUNNING_HIGH_SPEED',
    },
    {
      train_no: '12822',
      train_name: 'Steel Express UP',
      direction: 'UP',
      priority_rank: 2,
      chainage_km: 71.0,
      lat: 22.41,
      lon: 87.72,
      speed_kmph: 92.0,
      current_delay_mins: 4.0,
      current_station: null,
      next_station: 'MCA',
      last_updated_epoch: 1795071480,
      status: 'RUNNING_NORMAL',
    },
  ],
  phantom_freights: [
    {
      block_id: 'DN_MCA_PKU',
      direction: 'DN',
      str_value: 1.78,
      freight_probability: 0.86,
      status: 'PHANTOM_FREIGHT_SHADOW',
      clearance_station: 'PKU',
      clearance_eta_mins: 16.0,
    },
  ],
  weather: {
    rain_mm_hr: 1.5,
    wind_speed_kmph: 12.0,
    condition: 'OVERCAST',
  },
};

export function getMockSnapshot(corridorId: CorridorId): CorridorSnapshot {
  return corridorId === 'SER_HWH_KGP' ? MOCK_SNAPSHOT_SER : MOCK_SNAPSHOT;
}

export function getMockForecast(
  trainNo: string,
  corridorId: CorridorId = 'ECoR_BHC_PURI'
): ForecastResponse {
  const snap = getMockSnapshot(corridorId);
  const stations = getStationsForCorridor(corridorId);
  const train = snap.trains.find((t) => t.train_no === trainNo) ?? snap.trains[0];
  const base = 1795071480;
  const isKolkata = corridorId === 'SER_HWH_KGP';

  return {
    train_no: train.train_no,
    train_name: train.train_name,
    direction: train.direction,
    current_chainage_km: train.chainage_km,
    current_delay_mins: train.current_delay_mins,
    naive_ntes_eta_epoch: base + 3600,
    naive_ntes_delay_mins: train.current_delay_mins,
    p10_eta_epoch: base + 3200,
    p50_eta_epoch: base + 4200,
    p90_eta_epoch: base + 5400,
    p10_delay_mins: Math.max(0, train.current_delay_mins - 6),
    p50_delay_mins: train.current_delay_mins + 12,
    p90_delay_mins: train.current_delay_mins + 30,
    usable_slack_mins: 12.0,
    overtakes_count: train.train_no === '12821' ? 1 : 0,
    causal_cards:
      train.train_no === '12821'
        ? [
            {
              event: 'OVERTAKE_HOLD',
              station_code: isKolkata ? 'MCA' : 'CTC',
              station_name: isKolkata ? 'Mecheda Junction' : 'Cuttack Junction',
              added_delay_mins: 14.0,
              caused_by_train: '22895',
              human_message: isKolkata
                ? 'Held ~14 mins at Mecheda Loop Line for 22895 Vande Bharat overtake.'
                : 'Held ~14 mins at Cuttack Loop Line for 22895 Vande Bharat overtake.',
            },
          ]
        : [],
    station_timeline: stations.map((s, idx) => ({
      station_code: s.station_code,
      station_name: s.station_name,
      chainage_km: s.chainage_km,
      sched_arr_epoch: base + idx * 900,
      sched_dep_epoch: base + idx * 900 + 120,
      projected_arr_epoch: base + idx * 900 + Math.round(train.current_delay_mins * 60),
      projected_dep_epoch: base + idx * 900 + 120 + Math.round(train.current_delay_mins * 60),
      raw_sim_delay_mins: train.current_delay_mins,
      net_delay_mins: train.current_delay_mins,
      is_commercial_halt: s.is_major_junction || s.station_code === 'JJKR',
      causal_cards: [],
    })),
  };
}

export const MOCK_RESCUE_ONBOARD: RescueEvaluationResponse = {
  passenger_status: 'ON_BOARD',
  survival_probability_pct: 28.5,
  risk_level: 'HIGH_RISK_MISS',
  safe_boarding_lock: false,
  boarding_advisory: 'High risk of missing connection due to rear overtake & Barang freight drag.',
  bailout_recommended: true,
  bailout_plan: {
    deboard_station_code: 'CTC',
    deboard_station_name: 'Cuttack Junction',
    deboard_eta_epoch: 1795072680,
    road_mode: 'CAB_NH16',
    station_exit_mins: 12,
    road_drive_mins: 32,
    final_road_arrival_epoch: 1795075320,
    minutes_saved: 21.0,
    road_survival_pct: 89.0,
    polyline: '',
    human_guidance: 'Deboard early at Cuttack (CTC) and take NH-16 cab to Bhubaneswar (BBS) to save ~21 mins.',
    destination_station_code: 'BBS',
    destination_station_name: 'Bhubaneswar',
    road_distance_km: 28.4,
    highway_name: 'NH-16',
  },
  disclaimer: "Deboarding remains passenger's voluntary decision.",
};
