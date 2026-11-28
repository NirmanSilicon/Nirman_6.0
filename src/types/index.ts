export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}

export type {
  Database,
  Hospital,
  HospitalCapability,
  HospitalResource,
  StaffMember,
  TaskTemplate,
  Alert,
  AlertTask,
  AuditLog,
  ActiveAlertEscalation,
  EmergencyCategory,
  AlertStatus,
  TaskStatus,
  TaskRole,
  EscalationLevel,
  RefusalReason,
} from "./database";
