const API_BASE_URL = (import.meta.env["VITE_API_BASE_URL"] || "http://127.0.0.1:8000").replace(
  /\/+$/,
  "",
);

export type AuditSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type AuditGrade = "A" | "B" | "C" | "D" | "F";
export type AuditModule = "tls" | "headers" | "dns" | "surface";

export type ModuleSummary = {
  status: "ok" | "warning" | "error";
  checks_passed: number;
  checks_failed: number;
  error_message?: string | null;
};

export type AuditFinding = {
  module: string;
  code: string;
  cwe_id: string;
  owasp_category: string;
  severity: AuditSeverity;
  title: string;
  technical_detail: string;
  business_impact: string;
  remediation: {
    nginx?: string | null;
    apache?: string | null;
    dns?: string | null;
    general: string;
  };
};

export type ScanResponse = {
  scan_id: number | null;
  domain: string;
  normalized_url: string;
  resolved_ip: string;
  score: number;
  grade: AuditGrade;
  duration_ms: number;
  scanned_at: string;
  module_summary: Record<AuditModule, ModuleSummary>;
  findings: AuditFinding[];
  patch_bundle: {
    nginx: string;
    apache: string;
    dns: string;
  };
};

export type ScanListItem = {
  scan_id: number;
  domain: string;
  score: number;
  grade: string;
  findings_count: number;
  scanned_at: string;
};

export const AUTH_TOKEN_KEY = "cyberguard_token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // ignore storage errors
  }
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
}

function buildAuthHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  const token = getAuthToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: buildAuthHeaders(init?.headers),
    });
  } catch {
    throw new ApiError("Could not reach the audit service. Check the connection and try again.", 0);
  }

  const contentType = response.headers.get("content-type") ?? "";
  let body: unknown;
  if (contentType.includes("application/json")) {
    body = await response.json().catch(() => null);
  } else {
    body = await response.text().catch(() => "");
  }

  if (!response.ok) {
    let message = typeof body === "string" ? body : "";
    if (body && typeof body === "object") {
      const detail = (body as Record<string, unknown>)["detail"];
      if (typeof detail === "string") {
        message = detail;
      } else if (Array.isArray(detail)) {
        message = detail
          .map((item) => {
            if (item && typeof item === "object") {
              const text = (item as Record<string, unknown>)["msg"];
              return typeof text === "string" ? text : "";
            }
            return "";
          })
          .filter(Boolean)
          .join(" ");
      }
    }
    throw new ApiError(
      message || `The audit service returned an error (${response.status}).`,
      response.status,
    );
  }

  return body as T;
}

export async function checkApiHealth(): Promise<void> {
  await request<unknown>("/health");
}

export function createScan(url: string, authorized: boolean): Promise<ScanResponse> {
  return request<ScanResponse>("/api/v1/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, authorized }),
  });
}

export const runScan = createScan;

export function getRecentScans(): Promise<ScanListItem[]> {
  return request<ScanListItem[]>("/api/v1/scans?limit=10");
}

export function getScan(scanId: number): Promise<ScanResponse> {
  return request<ScanResponse>(`/api/v1/scans/${scanId}`);
}
export interface CharacterDiff {
  position: number;
  typed_char: string;
  expected_char: string;
  explanation: string;
}

export interface LinkSignal {
  code: string;
  severity: string;
  title: string;
  detail: string;
}
export interface LiveLinkTelemetry {
  dns_resolved: boolean | null;
  domain_age_days: number | null;
  registered_on: string | null;
  tls_valid: boolean | null;
  tls_issuer: string | null;
  redirect_chain: string[];
  final_url: string | null;
}
export interface LinkCheckResponse {
  input_url: string;
  normalized_host: string;
  decoded_host: string;
  verdict: "SAFE" | "SUSPICIOUS" | "DANGEROUS" | "BLOCKED";
  risk_score: number;
  summary: string;
  matched_brand: string | null;
  official_domain: string | null;
  character_diffs: CharacterDiff[];
  signals: LinkSignal[];
  live_telemetry?: LiveLinkTelemetry | null;
  recommendations?: string[];
}

export interface RemediateRequest {
  url: string;
  agent_key: string;
  approved: boolean;
  patches: string[];
  approved_by?: string;
  before_score?: number | null;
}

export interface RemediateResponse {
  domain: string;
  status: string;
  applied_patches: string[];
  manual_only_notes: string[];
  agent_timestamp: string;
  before_score: number | null;
  after_score: number;
  verified_scan: ScanResponse;
}

export interface RollbackRequest {
  url: string;
  agent_key: string;
  approved: boolean;
}

const DUAL_MODE_API_BASE =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined)?.replace(/\/+$/, "") ||
  "http://127.0.0.1:8000";

export async function checkCitizenLink(url: string): Promise<LinkCheckResponse> {
  const res = await fetch(`${DUAL_MODE_API_BASE}/api/v1/check-link`, {
    method: "POST",
    headers: buildAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Link check failed (${res.status})`);
  }
  return res.json();
}

export async function applyRemoteRemediation(
  payload: RemediateRequest
): Promise<RemediateResponse> {
  const res = await fetch(`${DUAL_MODE_API_BASE}/api/v1/remediate`, {
    method: "POST",
    headers: buildAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Remote remediation failed (${res.status})`);
  }
  return res.json();
}

export async function rollbackRemoteRemediation(
  payload: RollbackRequest
): Promise<ScanResponse> {
  const res = await fetch(`${DUAL_MODE_API_BASE}/api/v1/rollback`, {
    method: "POST",
    headers: buildAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Rollback failed (${res.status})`);
  }
  return res.json();
}

export type UserRole = "citizen" | "enterprise";

export interface RegisterRequest {
  email: string;
  full_name: string;
  password: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export interface UserActivityItem {
  id: number;
  action_type: string;
  target: string;
  verdict_or_grade: string;
  score: number | null;
  detail: string;
  created_at: string;
}

export interface UserActivitySummary {
  user: UserProfile;
  total_actions: number;
  link_checks_count: number;
  enterprise_scans_count: number;
  remote_patches_count: number;
  recent_activities: UserActivityItem[];
}

export async function registerUser(payload: RegisterRequest): Promise<AuthResponse> {
  const data = await request<AuthResponse>("/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  setAuthToken(data.access_token);
  return data;
}

export async function loginUser(payload: LoginRequest): Promise<AuthResponse> {
  const data = await request<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  setAuthToken(data.access_token);
  return data;
}

export function getCurrentUser(): Promise<UserProfile> {
  return request<UserProfile>("/api/v1/auth/me");
}

export function getUserActivity(): Promise<UserActivitySummary> {
  return request<UserActivitySummary>("/api/v1/auth/activity");
}