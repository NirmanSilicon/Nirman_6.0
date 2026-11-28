// ParkSMART Shared API Type Contracts
// Strict TypeScript types mirroring backend schemas (Files 42-50, router sections, and spec Section 167)

export type Uuid = string;
export type IsoUtc = string;

export type DataState = "live" | "stale" | "unavailable" | "unknown";
export type Provenance = "observed" | "historical" | "forecast" | "manual" | "simulated";
export type CrowdLevel = "low" | "moderate" | "high" | "very_high" | "unknown";
export type Occupancy = "occupied" | "free" | "unknown";
export type Reliability = "unavailable" | "low" | "medium" | "high";
export type PredictionStatus = "ok" | "low_reliability" | "unavailable";
export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show"
  | "expired";
export type Role =
  | "driver"
  | "business_operator"
  | "municipal_admin"
  | "field_operator"
  | "system_admin";
export type BayType = "regular" | "loading";
export type VehicleCategory = "two_wheeler" | "car" | "van" | "truck" | "bus";

// --- Common Models (Section 42) ---

export interface LatLon {
  lat: number;
  lon: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details: unknown | null;
  request_id: string;
}

export interface ErrorEnvelope {
  error: ApiErrorBody;
}

export interface ProvenanceTag {
  provenance: Provenance;
}

// --- Auth Models (Section 43) ---

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  role?: Role;
  business_name?: string | null;
}

export type RegisterBody = RegisterRequest;

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface LogoutRequest {
  refresh_token: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
}

export interface UserOut {
  id: Uuid;
  email: string;
  full_name: string;
  phone: string | null;
  status: "pending" | "approved" | "suspended" | string;
  roles: Role[];
  created_at: IsoUtc;
}

export interface UserUpdate {
  full_name?: string | null;
  phone?: string | null;
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  new_password: string;
}

// --- Parking Models (Section 44) ---

export interface ZoneOut {
  id: Uuid;
  city_id: Uuid;
  name: string;
  kind: "parking" | "loading" | "mixed";
  centroid: LatLon;
  operating_schedule: Record<string, [string, string][]> | null;
  crowd_thresholds_configured: boolean;
  reservations_enabled: boolean;
  capacity: number;
  is_active: boolean;
}

export interface FacilityOut {
  id: Uuid;
  zone_id: Uuid;
  name: string;
  kind: "facility" | "roadside";
  location: LatLon;
  supports_reservation: boolean;
  address: string | null;
  fee: FeeOut | null;
}

export interface FeeOut {
  rate_per_hour: number | string;
  currency: string;
  bay_type: BayType;
}

export interface BayOut {
  id: Uuid;
  facility_id: Uuid;
  code: string;
  bay_type: BayType;
  location: LatLon;
  permitted_vehicle_categories: VehicleCategory[];
  restrictions: Record<string, unknown> | null;
  out_of_service: boolean;
}

export interface BayStatusOut {
  bay_id: Uuid;
  occupancy: Occupancy;
  reserved: boolean;
  observed_at: IsoUtc | null;
  data_state: DataState;
  provenance: Provenance;
}

export interface BayWithStatus {
  bay: BayOut;
  status: BayStatusOut;
}

export interface NearbyQuery {
  lat: number;
  lon: number;
  radius_m: number;
  vehicle_category?: VehicleCategory | null;
  only_available?: boolean;
  limit?: number;
}

export interface NearbyZoneOut {
  zone: ZoneOut;
  distance_m: number;
  available_bays: number | null;
  occupied_bays: number | null;
  unknown_bays: number;
  data_state: DataState;
  observed_at: IsoUtc | null;
  provenance: Provenance;
}

export interface ZoneLiveOut {
  zone_id: Uuid;
  available_bays: number | null;
  occupied_bays: number | null;
  unknown_bays: number;
  data_state: DataState;
  observed_at: IsoUtc | null;
  provenance: Provenance;
}

// --- Reservation Models (Section 45) ---

export interface DeliveryInfo {
  description?: string | null;
  expected_arrival?: IsoUtc | null;
  goods_type?: string | null;
}

export interface ParkingReservationCreate {
  facility_id: Uuid;
  start: IsoUtc;
  end: IsoUtc;
  vehicle_category: VehicleCategory;
  vehicle_id?: Uuid | null;
}

export interface LoadingReservationCreate {
  zone_id: Uuid;
  bay_id?: Uuid | null;
  start: IsoUtc;
  end: IsoUtc;
  vehicle_category: VehicleCategory;
  vehicle_id?: Uuid | null;
  delivery_info: DeliveryInfo;
}

export interface ReservationOut {
  id: Uuid;
  reference: string;
  kind: "parking" | "loading";
  bay_id: Uuid;
  status: ReservationStatus;
  start: IsoUtc;
  end: IsoUtc;
  vehicle_category: VehicleCategory;
  business_id: Uuid | null;
  delivery_info: DeliveryInfo | null;
  created_at: IsoUtc;
  updated_at: IsoUtc;
  checked_in_at: IsoUtc | null;
  started_at: IsoUtc | null;
  completed_at: IsoUtc | null;
  cancelled_at: IsoUtc | null;
}

export interface ReservationReschedule {
  start: IsoUtc;
  end: IsoUtc;
}

export interface StatusUpdate {
  to_status: ReservationStatus;
  reason?: string | null;
}

export interface SlotQuery {
  zone_id: Uuid;
  date: string;
  vehicle_category: VehicleCategory;
  duration_min: number;
}

export interface SlotOut {
  bay_id: Uuid;
  start: IsoUtc;
  end: IsoUtc;
}

export interface StatusHistoryOut {
  from_status: string | null;
  to_status: string;
  changed_by: Uuid | null;
  reason: string | null;
  changed_at: IsoUtc;
}

// --- Device Models (Section 46) ---

export interface CameraConfig {
  interval_s: number;
  conf_threshold: number;
  area_m2: number | null;
}

export interface CameraCreate {
  zone_id: Uuid;
  name: string;
  config: CameraConfig;
}

export interface CameraOut {
  id: Uuid;
  zone_id: Uuid;
  name: string;
  status: "provisioned" | "online" | "degraded" | "offline" | "maintenance";
  last_seen_at: IsoUtc | null;
  config: CameraConfig;
  is_active: boolean;
}

export interface CameraCreated {
  camera: CameraOut;
  device_secret: string;
}

export interface MappingCreate {
  bay_id: Uuid;
  roi_polygon: [number, number][];
}

export interface MappingOut {
  id: Uuid;
  camera_id: Uuid;
  bay_id: Uuid;
  roi_polygon: [number, number][];
}

export interface HealthMessage {
  schema_version: 1;
  msg_id: Uuid;
  ts: IsoUtc;
  camera_id: Uuid;
  state: "online" | "degraded" | "offline";
  fps: number | null;
  errors: string[];
  model_version: string | null;
  uptime_s: number | null;
}

export interface DeviceHealthOut {
  camera_id: Uuid;
  state: "online" | "degraded" | "offline" | "maintenance";
  observed_at: IsoUtc;
  detail: Record<string, unknown> | null;
}

export interface MaintenanceEventOut {
  id: Uuid;
  camera_id: Uuid | null;
  zone_id: Uuid | null;
  kind: "camera_down" | "stale_data" | "repair" | "calibration" | "other" | string;
  description: string;
  opened_by: Uuid | null;
  resolved_by: Uuid | null;
  opened_at: IsoUtc;
  resolved_at: IsoUtc | null;
}

// --- Occupancy Models (Section 47) ---

export interface BayReading {
  bay_id: Uuid;
  state: Occupancy;
  confidence: number;
}

export interface OccupancyMessage {
  schema_version: 1;
  msg_id: Uuid;
  ts: IsoUtc;
  camera_id: Uuid;
  bays: BayReading[];
}

export interface OccupancyHistoryItem {
  bay_id: Uuid;
  state: "occupied" | "free";
  from_ts: IsoUtc;
  to_ts: IsoUtc | null;
}

export interface BayHistoryOut {
  items: OccupancyHistoryItem[];
  provenance: Provenance;
}

// --- Crowd Models (Section 48) ---

export interface CrowdMessage {
  schema_version: 1;
  msg_id: Uuid;
  ts: IsoUtc;
  camera_id: Uuid;
  interval_s: number;
  vehicle_count: number;
  vehicle_by_category: Record<VehicleCategory, number>;
  pedestrian_count: number;
  density_per_m2: number | null;
  quality: "ok" | "degraded" | "suspect";
}

export interface CrowdCurrentOut {
  zone_id: Uuid;
  level: CrowdLevel;
  occupancy_pct: number | null;
  vehicles: number | null;
  pedestrians: number | null;
  observed_at: IsoUtc | null;
  data_state: DataState;
  provenance: Provenance;
}

export interface SeriesPoint {
  ts: IsoUtc;
  value: number | null;
  quality: string;
}

export interface SeriesOut {
  zone_id: Uuid;
  metric: "vehicles" | "pedestrians" | "occupancy_pct" | "density";
  interval_min: number;
  points: SeriesPoint[];
  provenance: Provenance;
}

export interface HourStat {
  hour: number;
  mean: number | null;
  p90: number | null;
}

export interface WeekdayStat {
  weekday: number;
  mean: number | null;
}

export interface PeakHoursOut {
  zone_id: Uuid;
  metric: string;
  by_hour: HourStat[];
  by_weekday: WeekdayStat[];
  n_days: number;
  provenance: Provenance;
}

// --- Forecast & Availability Models (Section 49) ---

export interface ForecastPoint {
  target_ts: IsoUtc;
  mean: number;
  lower: number | null;
  upper: number | null;
}

export interface ForecastOut {
  zone_id: Uuid;
  target: "occupancy_pct" | "vehicle_count" | "pedestrian_count";
  status: PredictionStatus;
  reason: string | null;
  model_version: string | null;
  trained_on: "simulated" | "observed" | "mixed" | "none" | null;
  generated_at: IsoUtc | null;
  interval_level: number | null;
  points: ForecastPoint[];
  provenance: Provenance;
}

export interface AvailabilityRequest {
  zone_id: Uuid;
  arrival_time?: IsoUtc | null;
  origin?: LatLon | null;
  use_travel_time?: boolean;
}

export interface AvailabilityOut {
  zone_id: Uuid;
  status: PredictionStatus;
  reason: string | null;
  probability: number | null;
  expected_available: number | null;
  expected_occupancy_pct: number | null;
  crowd_level: CrowdLevel;
  requested_arrival_time: IsoUtc;
  estimated_arrival_time: IsoUtc;
  generated_at: IsoUtc;
  data_freshness_s: number | null;
  data_state: DataState;
  reliability: Reliability;
  uncertainty: { lower: number | null; upper: number | null } | null;
  method: string;
  n_simulations: number | null;
  provenance: Provenance;
}

export interface CompareRequest {
  zone_ids: Uuid[];
  arrival_time?: IsoUtc | null;
  origin?: LatLon | null;
}

export interface CompareOut {
  items: AvailabilityOut[];
}

export interface RecommendationItem {
  zone: ZoneOut;
  rank: number;
  probability: number | null;
  distance_m: number | null;
  travel_time_s: number | null;
  score: number;
  reasons: string[];
}

export interface TimeWindow {
  start: IsoUtc;
  end: IsoUtc;
  probability: number | null;
  crowd_level: CrowdLevel;
}

export interface RecommendationOut {
  origin: LatLon;
  arrival_time: IsoUtc;
  items: RecommendationItem[];
  best_windows: TimeWindow[];
  status: PredictionStatus;
}

// --- Admin Models (Section 50) ---

export interface ThresholdSet {
  moderate: number;
  high: number;
  very_high: number;
}

export interface CrowdThresholds {
  occupancy_pct: ThresholdSet;
  pedestrians: ThresholdSet;
}

export interface ReservationRules {
  grace_min: number;
  pending_ttl_min: number;
  cancel_cutoff_min: number;
  overstay_grace_min: number;
}

export interface ZoneUpsert {
  city_id: Uuid;
  name: string;
  kind: "parking" | "loading" | "mixed";
  centroid: LatLon;
  boundary?: LatLon[] | null;
  operating_schedule?: Record<string, [string, string][]> | null;
  crowd_thresholds?: CrowdThresholds | null;
  reservation_rules?: ReservationRules | null;
  is_active?: boolean;
}

export interface FacilityUpsert {
  zone_id: Uuid;
  name: string;
  kind: "facility" | "roadside";
  location: LatLon;
  supports_reservation: boolean;
  address?: string | null;
}

export interface BayUpsert {
  facility_id: Uuid;
  code: string;
  bay_type: BayType;
  location: LatLon;
  permitted_vehicle_categories: VehicleCategory[];
  operating_schedule?: Record<string, [string, string][]> | null;
  restrictions?: Record<string, unknown> | null;
  out_of_service?: boolean;
}

export interface FeeUpsert {
  facility_id: Uuid;
  bay_type: BayType;
  rate_per_hour: number | string;
  currency?: string;
  effective_from: IsoUtc;
  effective_to?: IsoUtc | null;
}

export interface UserApproval {
  status: "approved" | "suspended";
}

export interface RoleGrant {
  role: Role;
}

export interface AuditOut {
  id: number;
  actor_user_id: Uuid | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  request_id: string | null;
  created_at: IsoUtc;
}

export interface ModelVersionOut {
  id: Uuid;
  name: string;
  version: string;
  target: string;
  kind: string;
  trained_on: string;
  trained_at: IsoUtc | null;
  status: string;
  metrics: Record<string, unknown>;
  params: Record<string, unknown>;
}

export interface ModelPromote {
  model_version_id: Uuid;
}

export interface ManualOccupancyOverride {
  bay_id: Uuid;
  state: Occupancy;
  reason: string;
}

export interface BusinessAdminOut {
  id: Uuid;
  name: string;
  registration_no: string | null;
  status: "pending" | "approved" | "suspended" | string;
  owner_email: string | null;
  created_at: IsoUtc;
}

// --- Notifications (Section 119) ---

export interface NotificationOut {
  id: Uuid;
  kind: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  read_at: IsoUtc | null;
  created_at: IsoUtc;
}

// --- Businesses (Section 61) ---

export interface BusinessOut {
  id: Uuid;
  name: string;
  registration_no: string | null;
  status: string;
  member_role: "owner" | "staff" | null;
  created_at: IsoUtc;
}

export interface BusinessUpdate {
  name?: string | null;
  registration_no?: string | null;
}

export interface MemberAdd {
  user_email: string;
  member_role: "owner" | "staff";
}

export interface MemberOut {
  user_id: Uuid;
  email: string;
  full_name: string;
  member_role: "owner" | "staff";
}

export interface MemberRoleChange {
  member_role: "owner" | "staff";
}

export interface VehicleCreate {
  plate: string;
  category: VehicleCategory;
}

export interface VehicleOut {
  id: Uuid;
  business_id: Uuid;
  plate: string;
  category: VehicleCategory;
}

// --- Ingest (Section 77) ---

export interface IngestAck {
  accepted: boolean;
  duplicate: boolean;
  applied_bays: number | null;
}

// --- Reports (Section 128 / Change 2) ---
/**
 * Note: The real JSON shape of reports is not confirmed yet.
 */
export interface ReportTable {
  columns: string[];
  rows: unknown[][];
  notes: string[];
  provenance: Provenance;
}

// --- SSE Realtime LiveEvent Union (Section 167) ---

export type LiveEvent =
  | {
      event: "bay_changed";
      data: {
        bay_id: Uuid;
        zone_id: Uuid;
        occupancy: Occupancy;
        observed_at: IsoUtc | null;
      };
    }
  | {
      event: "zone_summary" | "crowd_changed" | "forecast_updated";
      data: {
        zone_id: Uuid;
      };
    }
  | {
      event: "device_health";
      data: {
        camera_id: Uuid;
        state: "online" | "degraded" | "offline" | "maintenance";
      };
    }
  | {
      event: "maintenance_changed";
      data: {
        camera_id: Uuid;
      };
    }
  | {
      event: "reservation_changed";
      data: {
        reservation_id: Uuid;
        kind: "parking" | "loading";
      };
    }
  | {
      event: "notification";
      data: {
        id: Uuid;
      };
    }
  | {
      event: "auth_expired" | "resync";
      data: Record<string, never>;
    };
