export type UserRole = 'citizen' | 'officer' | 'contractor' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  requestedRole: string | null;
  accountStatus: 'active' | 'pending_approval' | 'suspended';
  departmentId: string | null;
  contractorId: string | null;
}

export interface Project {
  id: string;
  project_code: string;
  name: string;
  description: string;
  department_id: string;
  department_name?: string;
  contractor_id: string | null;
  contractor_name?: string | null;
  category: string;
  status: string;
  city: string;
  ward: string;
  locality: string;
  pin_code: string | null;
  lat: number;
  lng: number;
  boundary_geojson?: {
    type: 'Polygon';
    coordinates: number[][][];
  } | null;
  approved_specs: {
    length_m?: number;
    width_m?: number;
    area_sqm?: number;
    thickness_mm?: number;
    surface?: string;
    [key: string]: unknown;
  };
  budget_inr: number | null;
  start_date: string | null;
  expected_end_date: string | null;
  official_progress_pct: number;
  source_name: string;
  source_url: string | null;
  retrieved_at: string | null;
  data_classification: 'official' | 'demo' | 'community';
  is_demo: boolean;
}

export interface ComparisonResult {
  id: string;
  project_id: string;
  project_name?: string;
  metric_name: string;
  official_value: number | null;
  measured_value: number | null;
  unit: string;
  difference_value: number | null;
  coverage_pct: number | null;
  result_status:
    | 'consistent'
    | 'possible_discrepancy'
    | 'insufficient_evidence'
    | 'requires_inspection'
    | 'verified_by_officer';
  limitations: string;
  source_summary: string;
  review_notes?: string | null;
  reviewed_at?: string | null;
  is_demo: boolean;
}

export interface EvidenceRecord {
  id: string;
  project_id: string;
  capture_timestamp: string;
  uploaded_at: string;
  latitude: number;
  longitude: number;
  gps_accuracy_m: number | null;
  within_boundary: boolean | null;
  distance_to_boundary_m: number | null;
  file_name: string;
  sha256_hash: string;
  notes: string | null;
  verification_status: 'pending_review' | 'verified' | 'flagged' | 'rejected';
  review_notes: string | null;
  is_demo: boolean;
}

export type ComplaintStatus =
  | 'Submitted'
  | 'Under Review'
  | 'Verified'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved Awaiting Verification'
  | 'Closed'
  | 'Rejected';

export interface Complaint {
  id: string;
  complaint_code: string;
  citizen_id: string;
  related_project_id: string | null;
  category: string;
  title: string;
  description: string;
  address_text: string | null;
  ward: string | null;
  latitude: number;
  longitude: number;
  photo_storage_path: string | null;
  photo_sha256: string | null;
  status: ComplaintStatus;
  rejection_reason: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  complaint_assignments?: Array<{
    id: string;
    contractor_id: string;
    deadline_at: string | null;
    instructions?: string | null;
    active: boolean;
    contractors?: { name: string } | null;
  }>;
}

export type ScenarioModelType =
  | 'road_widening'
  | 'new_road'
  | 'park'
  | 'residential_building'
  | 'commercial_building'
  | 'hospital'
  | 'school'
  | 'drainage'
  | 'public_transport';

export interface ScenarioModelItem {
  id?: string;
  localId: string;
  model_type: ScenarioModelType;
  label: string;
  position_x: number;
  position_y: number;
  position_z: number;
  rotation_y: number;
  scale_x: number;
  scale_y: number;
  scale_z: number;
  width_m: number;
  length_m: number;
  height_m: number;
}

export interface FutureScenario {
  id: string;
  title: string;
  description: string | null;
  city: string;
  ward: string;
  center_lat: number;
  center_lng: number;
  existing_road_area_sqm: number;
  existing_green_area_sqm: number;
  is_simulation: true;
  is_public: boolean;
  scenario_models: ScenarioModelItem[];
  updated_at: string;
}

export interface ImpactReport {
  is_simulation: true;
  disclaimer: string;
  existing_road_area_sqm: number;
  proposed_additional_road_area_sqm: number;
  total_proposed_road_area_sqm: number;
  existing_green_area_sqm: number;
  proposed_green_space_change_sqm: number;
  total_proposed_green_area_sqm: number;
  proposed_built_up_footprint_sqm: number;
  proposed_drainage_length_m: number;
  additional_land_requirement_sqm: number;
  estimated_cost_inr: number;
  cost_breakdown: Array<{
    category: string;
    quantity: number;
    unit: string;
    unit_rate_inr: number;
    subtotal_inr: number;
  }>;
  nearest_facilities: Array<{
    facility_type: string;
    facility_name: string;
    distance_m: number;
    source_name: string;
  }>;
  unavailable_data_notices: string[];
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  category: string;
  is_read: boolean;
  created_at: string;
}
