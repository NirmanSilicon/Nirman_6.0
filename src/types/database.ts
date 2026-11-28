export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AlertState =
  | 'DRAFT'
  | 'SENT'
  | 'ACKNOWLEDGED'
  | 'CLAIMING'
  | 'ALL_CLAIMED'
  | 'ARRIVED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'EXPIRED';

export type TaskState = 'OPEN' | 'CLAIMED' | 'DONE' | 'ESCALATED';

export type StaffRole =
  | 'doctor'
  | 'nurse'
  | 'counter'
  | 'medicine'
  | 'equipment'
  | 'stretcher'
  | 'supervisor'
  | 'operator';

export type TeamType = 'counter' | 'medicine' | 'equipment' | 'stretcher';

export type CancelReason =
  | 'changed_hospital'
  | 'not_coming'
  | 'duplicate'
  | 'no_arrival'
  | 'other';

export type NotificationChannel =
  | 'in_app_chime'
  | 'phone_push'
  | 'supervisor_wall'
  | 'sms';

export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface Database {
  public: {
    Tables: {
      facilities: {
        Row: {
          id: string;
          name: string;
          area: string | null;
          phone: string | null;
          distance_min: number;
          capabilities: string[];
          ed_beds_total: number;
          ed_beds_free: number;
          night_doctor: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          area?: string | null;
          phone?: string | null;
          distance_min?: number;
          capabilities?: string[];
          ed_beds_total?: number;
          ed_beds_free?: number;
          night_doctor?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          area?: string | null;
          phone?: string | null;
          distance_min?: number;
          capabilities?: string[];
          ed_beds_total?: number;
          ed_beds_free?: number;
          night_doctor?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      staff: {
        Row: {
          id: string;
          user_id: string | null;
          facility_id: string | null;
          full_name: string;
          role: StaffRole;
          team: TeamType | null;
          pin_hash: string;
          is_on_shift: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          facility_id?: string | null;
          full_name: string;
          role: StaffRole;
          team?: TeamType | null;
          pin_hash?: string;
          is_on_shift?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          facility_id?: string | null;
          full_name?: string;
          role?: StaffRole;
          team?: TeamType | null;
          pin_hash?: string;
          is_on_shift?: boolean;
          created_at?: string;
        };
      };
      playbooks: {
        Row: {
          id: string;
          key: string;
          name: string;
          version: number;
        };
        Insert: {
          id?: string;
          key: string;
          name: string;
          version?: number;
        };
        Update: {
          id?: string;
          key?: string;
          name?: string;
          version?: number;
        };
      };
      playbook_tasks: {
        Row: {
          id: string;
          playbook_id: string;
          team: TeamType;
          title: string;
          detail: string | null;
          position: number;
          sla_seconds: number;
          backup_staff: string | null;
        };
        Insert: {
          id?: string;
          playbook_id: string;
          team: TeamType;
          title: string;
          detail?: string | null;
          position: number;
          sla_seconds: number;
          backup_staff?: string | null;
        };
        Update: {
          id?: string;
          playbook_id?: string;
          team?: TeamType;
          title?: string;
          detail?: string | null;
          position?: number;
          sla_seconds?: number;
          backup_staff?: string | null;
        };
      };
      alerts: {
        Row: {
          id: string;
          temp_id: string;
          access_token: string;
          facility_id: string;
          patient_name: string | null;
          patient_age: number | null;
          patient_sex: string | null;
          patient_phone: string | null;
          flags: Json;
          capability_req: string[];
          playbook_key: string | null;
          eta_minutes: number | null;
          state: AlertState;
          created_at: string;
          acknowledged_at: string | null;
          all_claimed_at: string | null;
          arrived_at: string | null;
          closed_at: string | null;
          cancel_reason: string | null;
          created_by_operator: boolean;
          expires_at: string | null;
          client_request_id: string | null;
        };
        Insert: {
          id?: string;
          temp_id: string;
          access_token?: string;
          facility_id: string;
          patient_name?: string | null;
          patient_age?: number | null;
          patient_sex?: string | null;
          patient_phone?: string | null;
          flags?: Json;
          capability_req?: string[];
          playbook_key?: string | null;
          eta_minutes?: number | null;
          state?: AlertState;
          created_at?: string;
          acknowledged_at?: string | null;
          all_claimed_at?: string | null;
          arrived_at?: string | null;
          closed_at?: string | null;
          cancel_reason?: string | null;
          created_by_operator?: boolean;
          expires_at?: string | null;
          client_request_id?: string | null;
        };
        Update: {
          id?: string;
          temp_id?: string;
          access_token?: string;
          facility_id?: string;
          patient_name?: string | null;
          patient_age?: number | null;
          patient_sex?: string | null;
          patient_phone?: string | null;
          flags?: Json;
          capability_req?: string[];
          playbook_key?: string | null;
          eta_minutes?: number | null;
          state?: AlertState;
          created_at?: string;
          acknowledged_at?: string | null;
          all_claimed_at?: string | null;
          arrived_at?: string | null;
          closed_at?: string | null;
          cancel_reason?: string | null;
          created_by_operator?: boolean;
          expires_at?: string | null;
          client_request_id?: string | null;
        };
      };
      alert_tasks: {
        Row: {
          id: string;
          alert_id: string;
          task_id: string | null;
          team: TeamType;
          title: string;
          detail: string | null;
          sla_seconds: number;
          deadline_at: string;
          claimed_by: string | null;
          claimed_at: string | null;
          done_at: string | null;
          escalated_at: string | null;
          escalation_n: number;
          state: TaskState;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          alert_id: string;
          task_id?: string | null;
          team: TeamType;
          title: string;
          detail?: string | null;
          sla_seconds: number;
          deadline_at: string;
          claimed_by?: string | null;
          claimed_at?: string | null;
          done_at?: string | null;
          escalated_at?: string | null;
          escalation_n?: number;
          state?: TaskState;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          alert_id?: string;
          task_id?: string | null;
          team?: TeamType;
          title?: string;
          detail?: string | null;
          sla_seconds?: number;
          deadline_at?: string;
          claimed_by?: string | null;
          claimed_at?: string | null;
          done_at?: string | null;
          escalated_at?: string | null;
          escalation_n?: number;
          state?: TaskState;
          created_at?: string;
          updated_at?: string;
        };
      };
      bed_holds: {
        Row: {
          id: string;
          alert_id: string;
          facility_id: string;
          bed_label: string | null;
          held_by: string | null;
          held_at: string;
          released_at: string | null;
          expires_at: string;
        };
        Insert: {
          id?: string;
          alert_id: string;
          facility_id: string;
          bed_label?: string | null;
          held_by?: string | null;
          held_at?: string;
          released_at?: string | null;
          expires_at?: string;
        };
        Update: {
          id?: string;
          alert_id?: string;
          facility_id?: string;
          bed_label?: string | null;
          held_by?: string | null;
          held_at?: string;
          released_at?: string | null;
          expires_at?: string;
        };
      };
      records: {
        Row: {
          id: string;
          alert_id: string;
          facility_id: string;
          doctor_id: string | null;
          private_notes: string | null;
          diagnosis: string | null;
          safe_summary: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          alert_id: string;
          facility_id: string;
          doctor_id?: string | null;
          private_notes?: string | null;
          diagnosis?: string | null;
          safe_summary?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          alert_id?: string;
          facility_id?: string;
          doctor_id?: string | null;
          private_notes?: string | null;
          diagnosis?: string | null;
          safe_summary?: Json;
          created_at?: string;
        };
      };
      events: {
        Row: {
          id: number;
          alert_id: string;
          actor_id: string | null;
          actor_role: string | null;
          action: string;
          payload: Json;
          at: string;
        };
        Insert: {
          id?: number;
          alert_id: string;
          actor_id?: string | null;
          actor_role?: string | null;
          action: string;
          payload?: Json;
          at?: string;
        };
        Update: never;
      };
      cancellations: {
        Row: {
          id: number;
          alert_id: string;
          reason: string;
          actor_role: string | null;
          at: string;
        };
        Insert: {
          id?: number;
          alert_id: string;
          reason: string;
          actor_role?: string | null;
          at?: string;
        };
        Update: never;
      };
      notification_outbox: {
        Row: {
          id: string;
          alert_id: string;
          task_id: string | null;
          recipient_role: string;
          channel: NotificationChannel;
          status: NotificationStatus;
          payload: Json;
          created_at: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          alert_id: string;
          task_id?: string | null;
          recipient_role: string;
          channel: NotificationChannel;
          status?: NotificationStatus;
          payload?: Json;
          created_at?: string;
          sent_at?: string | null;
        };
        Update: {
          id?: string;
          alert_id?: string;
          task_id?: string | null;
          recipient_role?: string;
          channel?: NotificationChannel;
          status?: NotificationStatus;
          payload?: Json;
          created_at?: string;
          sent_at?: string | null;
        };
      };
    };
    Views: {
      nurse_safe_view: {
        Row: {
          alert_id: string;
          temp_id: string;
          bed_label: string | null;
          current_task: string | null;
          task_state: TaskState | null;
          minutes_remaining: number;
          medicines: Json | null;
          allergies: Json | null;
          watch_for: Json | null;
        };
      };
      ops_metrics_view: {
        Row: {
          facility_id: string;
          facility_name: string;
          total_alerts_today: number;
          successful_alerts: number;
          cancelled_alerts: number;
          cancellation_rate_pct: number;
          total_escalated_tasks: number;
          median_seconds_to_claim: number;
        };
      };
      cancelled_alerts_view: {
        Row: {
          cancellation_id: number;
          alert_id: string;
          temp_id: string;
          facility_id: string;
          facility_name: string;
          reason: string;
          actor_role: string | null;
          cancelled_at: string;
          bed_label: string | null;
          hold_duration_seconds: number | null;
        };
      };
    };
    Functions: {
      next_state: {
        Args: {
          p_task_id: string;
          p_action: string;
        };
        Returns: string;
      };
      next_task_state: {
        Args: {
          p_task_id: string;
          p_action: string;
        };
        Returns: Json;
      };
      next_alert_state: {
        Args: {
          p_alert_id: string;
          p_action: string;
        };
        Returns: string;
      };
      claim_task: {
        Args: {
          p_task_id: string;
        };
        Returns: Json;
      };
      escalate_overdue: {
        Args: {
          p_facility_id?: string | null;
        };
        Returns: {
          task_id: string;
          alert_id: string;
          team: string;
          title: string;
          escalation_n: number;
        }[];
      };
      cancel_alert: {
        Args: {
          p_alert_id: string;
          p_reason?: string;
          p_access_token?: string;
        };
        Returns: Json;
      };
      engine_tick: {
        Args: Record<string, never>;
        Returns: Json;
      };
    };
  };
}

// Domain model type exports
export type Facility = Database['public']['Tables']['facilities']['Row'];
export type Staff = Database['public']['Tables']['staff']['Row'];
export type Playbook = Database['public']['Tables']['playbooks']['Row'];
export type PlaybookTask = Database['public']['Tables']['playbook_tasks']['Row'];
export type Alert = Database['public']['Tables']['alerts']['Row'];
export type AlertTask = Database['public']['Tables']['alert_tasks']['Row'];
export type BedHold = Database['public']['Tables']['bed_holds']['Row'];
export type ClinicalRecord = Database['public']['Tables']['records']['Row'];
export type EventLog = Database['public']['Tables']['events']['Row'];
export type Cancellation = Database['public']['Tables']['cancellations']['Row'];
export type NotificationOutbox = Database['public']['Tables']['notification_outbox']['Row'];
export type NurseSafeView = Database['public']['Views']['nurse_safe_view']['Row'];
export type OpsMetricsView = Database['public']['Views']['ops_metrics_view']['Row'];
export type CancelledAlertsView = Database['public']['Views']['cancelled_alerts_view']['Row'];
