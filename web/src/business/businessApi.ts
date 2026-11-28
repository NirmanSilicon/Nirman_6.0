// Live data layer for the business portal.
import { useEffect, useRef } from "react";
import { getAccessToken } from "../api/client";
import type {
  BayOut,
  LiveEvent,
  ReservationOut,
  ReservationStatus,
} from "../api/types";
import { useLiveStream } from "../realtime/useLiveStream";

// TEMP until types.ts updated
export type BusinessVehicleCategory =
  | "two_wheeler"
  | "car"
  | "auto_rickshaw"
  | "lcv"
  | "hcv"
  | "bus";

// TEMP until types.ts updated
export interface BusinessBayOut extends Omit<BayOut, "permitted_vehicle_categories"> {
  permitted_vehicle_categories: BusinessVehicleCategory[];
}

// TEMP until types.ts updated
export interface BusinessLoadingReservationCreate {
  zone_id: string;
  bay_id?: string | null;
  vehicle_category: BusinessVehicleCategory;
  start: string;
  end: string;
  delivery_info?: {
    description?: string | null;
    expected_arrival?: string | null;
    goods_type?: string | null;
  };
}

// TEMP until types.ts updated
export interface BusinessReservationOut extends Omit<ReservationOut, "vehicle_category"> {
  vehicle_category: BusinessVehicleCategory;
}

const API_BASE = "/api/v1";

export const theme = {
  bg: "#0F172A",
  panel: "#1E293B",
  border: "#334155",
  text: "#F8FAFC",
  muted: "#94A3B8",
  accent: "#0284C7",
  accentText: "#38BDF8",
  danger: "#FCA5A5",
  dangerBg: "#450A0A",
};

// ---------- errors ----------
export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** Same wording as the driver app: one translator, one 409 message. */
export function describeApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409 && err.code === "BOOKING_OVERLAP") return "No bay is free for that time — choose another slot";
    if (err.status === 409) return err.message || "Conflict: the slot or status is no longer available.";
    if (err.status === 401) return "Session expired. Please sign in again.";
    if (err.status === 403) return "Access denied.";
    if (err.status === 404) return err.message || "Resource not found.";
    if (err.status === 422) return err.message || "Invalid input.";
    if (err.status === 429) return "Too many requests. Please wait a moment.";
    return err.message || "Server error occurred.";
  }
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred.";
}

// ---------- IST helpers (storage is UTC, display is Asia/Kolkata) ----------
export const IST = "Asia/Kolkata";
export const istYmd = (d: Date): string => d.toLocaleDateString("en-CA", { timeZone: IST });
export const istInstant = (ymd: string, hhmm: string): string => new Date(`${ymd}T${hhmm}:00+05:30`).toISOString();
export const fmtIstTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString("en-GB", { timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: false });
export const fmtIstDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short" });
export const fmtIstRange = (s: string, e: string): string => `${fmtIstTime(s)} – ${fmtIstTime(e)}`;

// ---------- status helpers ----------
export const ACTIVE_STATUSES: ReservationStatus[] = ["pending", "confirmed", "checked_in", "in_progress"];
export const CANCELLED_STATUSES: ReservationStatus[] = ["cancelled", "no_show", "expired"];
export const VEHICLE_CATEGORIES: BusinessVehicleCategory[] = [
  "two_wheeler",
  "car",
  "auto_rickshaw",
  "lcv",
  "hcv",
  "bus",
];

// ---------- transport ----------
let tokenGetter: () => string | null = getAccessToken;
/** Optional: let the host app hand over its in-memory access token. */
export function configureBusinessApi(opts: { getToken: () => string | null }): void {
  tokenGetter = opts.getToken;
}

interface Opts {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
}

export async function bizApi<T>(path: string, opts: Opts = {}): Promise<T> {
  const q = opts.query
    ? "?" +
      Object.entries(opts.query)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";

  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const token = tokenGetter();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}${q}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: "include",
    });
  } catch (netErr) {
    throw new ApiError(0, "NETWORK_ERROR", netErr instanceof Error ? netErr.message : "Network error");
  }

  if (res.status === 204) return undefined as T;
  const json = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
  if (!res.ok) {
    throw new ApiError(res.status, json?.error?.code ?? `HTTP_${res.status}`, json?.error?.message ?? res.statusText);
  }
  return json as T;
}

// ---------- reservation_changed fan-out ----------
type Listener = () => void;
const listeners = new Set<Listener>();
export const notifyReservationChanged = (): void => listeners.forEach((l) => l());

/**
 * Calls `onChange` when a reservation changes.
 * Integrates live SSE stream via useLiveStream hook for reservation_changed events,
 * and maintains local emitter + 15s polling fallback.
 */
export function useReservationEvents(onChange: () => void): void {
  const ref = useRef(onChange);
  ref.current = onChange;

  // Bind live SSE stream hook when available
  useLiveStream({
    onEvent: (event: LiveEvent) => {
      if (event.event === "reservation_changed") {
        ref.current();
      }
    },
    onResync: () => {
      ref.current();
    },
    enabled: true,
  });

  useEffect(() => {
    const l: Listener = () => ref.current();
    listeners.add(l);
    const timer = window.setInterval(l, 15000);
    return () => {
      listeners.delete(l);
      window.clearInterval(timer);
    };
  }, []);
}
