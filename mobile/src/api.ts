import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { DocumentPickerAsset } from "expo-document-picker";

export type Connection = { url: string; token: string };
export type Profile = {
  status: "observed_cashflow_only";
  transaction_count: number;
  observed_history_days: number;
  total_credits: number;
  total_debits: number;
  net_cashflow: number;
  closing_balance: number;
  observed_daily_mean_balance: number;
  unidentified_credits: number;
  monthly: Record<
    string,
    { credits: number; debits: number; net_cashflow: number }
  >;
};
export type Analysis = {
  assessment_id: string;
  status: string;
  synthetic_risk_index?: number | null;
  simulated_stress_probability?: number | null;
  approved_for_lending: false;
  model_name: string;
  feature_version: string;
  cashflow_profile: Profile | { status: "no_history"; score: null };
  evidence?: Record<string, number>;
  outside_training_range_features?: string[];
  reasons: (string | { feature: string; value: number; direction: string })[];
  statement_source: string;
  statement_period: { start: string; end: string };
  financial_behaviour?: Behaviour;
  previous_synthetic_risk_index?: number | null;
  score_change_context?: { transaction_id: string; old_category: string; new_category: string; previous_index: number | null; current_index: number | null };
  score_explanation?: {
    method: string;
    risk_increasing_features: ModelReason[];
    risk_decreasing_features: ModelReason[];
    supporting_transactions: EvidenceTransaction[];
    evidence_note: string;
  };
  classification?: { total: number; auto_applied: number; needs_review: number; possible_duplicates: number; possible_refunds: number; method: string };
};
export type ModelReason = { feature: string; value: number; shap_contribution: number; direction: string; scope: string };
export type EvidenceTransaction = { transaction_id: string; date: string; category: string; direction: string; amount: number; description: string };
export type Behaviour = {
  status: "descriptive_only" | "insufficient_data";
  index: number | null;
  complete_months?: number;
  reason?: string;
  meaning?: string;
  limits?: string[];
  factors: { key: string; label: string; weight: number; observed_ratio: number; measure: string; factor_score: number; contribution: number; better_direction: string }[];
  coach: { factor: string; observed_ratio: number; message: string }[];
  monthly?: { month: string; confirmed_income: number; spending: number; obligations: number; surplus: number }[];
};
export type BehaviourWhatIf = { baseline: Behaviour; projected: Behaviour | null; delta?: number; discretionary_cut_pct?: number; scope?: string; reason?: string };
export type PassportLink = { id: string; recipient: string; created_at: number; expires_at: number; revoked: boolean; path?: string };
export type ClassificationPage = {
  total: number; offset: number; limit: number; revision: number;
  summary: NonNullable<Analysis["classification"]>;
  categories: string[];
  transactions: (EvidenceTransaction & { balance: string; suggested_category: string; classification_status: string; classification_confidence: number; classification_basis: string; possible_duplicate: boolean; possible_refund: boolean })[];
};
export type Passport = {
  report_type: string;
  generated_at: string;
  recipient_entered_by_user: string;
  statement_period: { start: string; end: string };
  behaviour: Behaviour;
  synthetic_demo_index: number | null;
  notices: string[];
};
export function observedProfile(analysis: Analysis | null): Profile | null {
  const profile = analysis?.cashflow_profile;
  return profile && "monthly" in profile ? profile : null;
}
export type Simulation = {
  monthly_emi: number;
  total_repayment_excluding_fees: number;
  scenarios: {
    income_reduction: number;
    expense_increase: number;
    monthly_surplus_after_emi: number;
  }[];
};
export const DEFAULT_URL = process.env.EXPO_PUBLIC_API_URL?.trim() ||
  (Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000");

export function validConnection(connection: Connection) {
  let url: URL;
  try {
    url = new URL(connection.url);
  } catch {
    throw new Error("Enter a complete server address.");
  }
  const local =
    /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(
      url.hostname,
    );
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local))
    throw new Error("Use HTTPS, or HTTP on your local development network.");
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !["", "/"].includes(url.pathname)
  )
    throw new Error(
      "Use the server origin only, without a path or embedded credentials.",
    );
  if (connection.token.trim().length < 32)
    throw new Error("Your server access key needs at least 32 characters.");
  return { url: url.origin, token: connection.token.trim() };
}
export async function loadConnection(): Promise<Connection | null> {
  if (Platform.OS === "web") return null;
  const saved = await SecureStore.getItemAsync("uqual.connection");
  if (!saved) return null;
  try {
    return validConnection(JSON.parse(saved));
  } catch {
    return null;
  }
}
export async function saveConnection(connection: Connection | null) {
  if (Platform.OS === "web") return;
  if (!connection) await SecureStore.deleteItemAsync("uqual.connection");
  else
    await SecureStore.setItemAsync(
      "uqual.connection",
      JSON.stringify(connection),
    );
}
export async function request<T>(
  connection: Connection,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch(connection.url + path, {
      ...options,
      signal: controller.signal,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${connection.token}`,
      },
    });
    const body = await response.json();
    if (!response.ok) {
      const detail =
        typeof body.detail === "string"
          ? body.detail
          : typeof body.detail?.message === "string"
            ? body.detail.message
            : Array.isArray(body.detail)
              ? body.detail.slice(0,3).map((item: {loc?: string[];msg?: string})=>`${item.loc?.slice(1).join(" / ") || "Input"}: ${item.msg || "Invalid value"}`).join("\n")
              : "The server could not process this request.";
      throw new Error(detail);
    }
    return body as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError")
      throw new Error(
        "The server took too long. Check the connection and try again.",
      );
    if (error instanceof TypeError)
      throw new Error(
        "Cannot reach the server. Check the address, Wi-Fi and backend.",
      );
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
export async function upload(
  connection: Connection,
  asset: DocumentPickerAsset,
  format: string,
  statementEnd: string,
) {
  const form = new FormData();
  if (Platform.OS === "web" && asset.file)
    form.append("file", asset.file, asset.name);
  else
    form.append("file", {
      uri: asset.uri,
      name: asset.name,
      type: "text/csv",
    } as unknown as Blob);
  form.append("consent", "true");
  form.append("date_format", format);
  form.append("statement_end", statementEnd);
  return request<Analysis>(connection, "/statements/analyze", {
    method: "POST",
    body: form,
  });
}
