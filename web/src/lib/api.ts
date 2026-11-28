import type { Recycler, ScanResult } from "../types";

export class ApiError extends Error {
  constructor(public status: number, public body: any) { super(body?.detail || body?.code || `HTTP ${status}`); }
}
export class NetworkError extends Error {}

export function deviceId(): string {
  let id = localStorage.getItem("device_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("device_id", id); }
  return id;
}
const headers = (): Record<string, string> => {
  const h: Record<string, string> = { "X-Device-Id": deviceId() };
  const t = localStorage.getItem("token");
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
};

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let r: Response;
  try { r = await fetch(path, { ...init, headers: { ...headers(), ...(init.headers || {}) } }); }
  catch { throw new NetworkError("offline"); }
  if (r.status === 204) return undefined as T;
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new ApiError(r.status, body);
  return body as T;
}

export interface ScanOpts { consent: boolean; lat?: number; lng?: number; preset?: string; force?: boolean }
export function postScan(img: Blob, o: ScanOpts) {
  const f = new FormData();
  f.append("image", img, "scan.jpg");
  f.append("consent", String(o.consent));
  f.append("preset", o.preset ?? "default");
  f.append("force", String(!!o.force));
  if (o.lat != null && o.lng != null) { f.append("lat", String(o.lat)); f.append("lng", String(o.lng)); }
  return call<ScanResult>("/v1/scan", { method: "POST", body: f });
}
export const getScan = (id: string) => call<ScanResult>(`/v1/scan/${id}`);
export const deleteScan = (id: string) => call<void>(`/v1/scan/${id}`, { method: "DELETE" });
export const listScans = () => call<{ items: any[]; total: number }>("/v1/scans?user=me");
export const getRecyclers = (lat: number, lng: number, radius = 100) =>
  call<{ items: Recycler[]; expanded: boolean }>(`/v1/recyclers?lat=${lat}&lng=${lng}&radius=${radius}`);
export const getPrices = () => call<any>("/v1/prices");
export const otpRequest = (phone: string) => call<{ sent: boolean; dev_code?: string }>("/v1/auth/otp/request", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
export const otpVerify = (phone: string, code: string) => call<{ token: string; user: any }>("/v1/auth/otp/verify", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, code }) });
export const reportUrl = (id: string, fmt: "png" | "pdf") => `/v1/scan/${id}/report?format=${fmt}`;
export const imageUrl = (id: string) => `/v1/scan/${id}/image`;
