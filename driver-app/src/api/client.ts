import { AppState, AppStateStatus } from "react-native";
import EventSource from "react-native-sse";
import { SessionStore } from "../auth/SessionStore";
import {
  ApiErrorBody,
  LiveEvent,
  TokenPair,
} from "./types";

/**
 * Live FastAPI backend configuration.
 * Set EXPO_PUBLIC_API_URL (or EXPO_PUBLIC_API_BASE) in .env.local to target your backend.
 */
export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE ||
  process.env.EXPO_PUBLIC_API_URL ||
  "http://10.0.2.2:8000/api/v1";

function assertHttpsInProd(): void {
  if (!__DEV__ && !API_BASE.startsWith("https://")) {
    throw new ApiError(0, "INSECURE_TRANSPORT", "HTTPS is required outside development.");
  }
}

export class ApiError extends Error {
  status: number;
  code: string;
  details: unknown;
  requestId: string | null;
  endpoint: string | null;

  constructor(status: number, code: string, message: string, details: unknown = null, requestId: string | null = null, endpoint: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
    this.endpoint = endpoint;
  }
}

/**
 * Single shared error translator across screens.
 * Mandated architectural rule: Map HTTP 409 BOOKING_OVERLAP to
 * "No bay is free for that time — choose another slot"
 */
export function describeApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409 && err.code === "BOOKING_OVERLAP") {
      return "No bay is free for that time — choose another slot";
    }
    if (err.status === 409) {
      return err.message || "Conflict: The slot or status is no longer available.";
    }
    if (err.status === 401) {
      if (err.code === "AUTH_INVALID_CREDENTIALS") {
        return "Invalid email or password.";
      }
      if (err.code === "AUTH_TOKEN_EXPIRED") {
        return "Session expired. Please log in again.";
      }
      if (__DEV__ && err.endpoint) {
        return `401 on ${err.endpoint}: ${err.message || "Authentication required."}`;
      }
      return "Authentication required.";
    }
    if (err.status === 403) {
      if (err.code === "ACCOUNT_PENDING_APPROVAL") {
        return "Your account is waiting for approval.";
      }
      return "Access denied.";
    }
    if (err.status === 404) {
      return err.message || "Resource not found.";
    }
    if (err.status === 422) {
      return err.message || "Invalid input data.";
    }
    if (err.status === 429) {
      const detailsObj =
        typeof err.details === "object" && err.details !== null
          ? (err.details as { retry_after_s?: number })
          : null;
      const retryAfter = detailsObj?.retry_after_s ? ` (retry in ${detailsObj.retry_after_s}s)` : "";
      return `Too many requests. Please wait a moment${retryAfter}.`;
    }
    if (err.status === 0 || err.code === "NETWORK_ERROR") {
      return `Unable to reach server (${API_BASE}). ${err.message}`;
    }
    if (err.status >= 500) {
      return err.message || `Server error (${err.status}). Please try again later.`;
    }
    return err.message || "Server error occurred.";
  }

  if (err instanceof Error) {
    if (err.message.includes("Network request failed") || err.message.includes("network")) {
      return "Unable to reach server. Please check your internet connection.";
    }
    return err.message;
  }

  return "An unexpected error occurred.";
}

// In-memory token storage (Access token NEVER stored in persistent storage)
let inMemoryAccessToken: string | null = null;
let inMemoryAccessExpiry: number | null = null;
let refreshPromise: Promise<boolean> | null = null;

const authLostListeners: Array<() => void> = [];

export function onAuthLost(listener: () => void): () => void {
  authLostListeners.push(listener);
  return () => {
    const idx = authLostListeners.indexOf(listener);
    if (idx >= 0) authLostListeners.splice(idx, 1);
  };
}

async function notifyAuthLost(): Promise<void> {
  inMemoryAccessToken = null;
  inMemoryAccessExpiry = null;
  await SessionStore.clear();
  authLostListeners.forEach((fn) => fn());
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setAccessToken(token: string | null, expiresInSec = 900): void {
  inMemoryAccessToken = token;
  if (token) {
    inMemoryAccessExpiry = Date.now() + expiresInSec * 1000;
  } else {
    inMemoryAccessExpiry = null;
  }
}

/**
 * Single-flight token refresh rotation
 */
export async function refreshTokens(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const storedRefresh = await SessionStore.load();
      if (!storedRefresh) {
        await notifyAuthLost();
        return false;
      }

      assertHttpsInProd();
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: storedRefresh }),
      });

      if (!res.ok) {
        await notifyAuthLost();
        return false;
      }

      const data: TokenPair = await res.json();
      setAccessToken(data.access_token, data.expires_in);
      await SessionStore.save(data.refresh_token);
      return true;
    } catch {
      await notifyAuthLost();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

interface RequestInitOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean;
  timeoutMs?: number;
  retries?: number;
}

/**
 * Main typed REST API client
 */
export async function api<T>(path: string, options: RequestInitOptions = {}): Promise<T> {
  assertHttpsInProd();

  const { method = "GET", body, query, auth = true, timeoutMs = 10000, retries = 0 } = options;

  // Pre-expiry rotation check (10 seconds margin)
  if (auth && inMemoryAccessToken && inMemoryAccessExpiry && Date.now() > inMemoryAccessExpiry - 10000) {
    await refreshTokens();
  }

  const queryString = query
    ? "?" +
      Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (auth && inMemoryAccessToken) {
    headers["Authorization"] = `Bearer ${inMemoryAccessToken}`;
  }

  const url = `${API_BASE}${path}${queryString}`;

  let res!: Response;
  let lastErr: ApiError | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
      res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller?.signal,
      });
      if (timeoutId) clearTimeout(timeoutId);
      lastErr = null;
      break;
    } catch (networkErr) {
      if (timeoutId) clearTimeout(timeoutId);
      const msg =
        networkErr instanceof Error && networkErr.name === "AbortError"
          ? `Request timed out after ${Math.round(timeoutMs / 1000)}s`
          : networkErr instanceof Error
            ? networkErr.message
            : "Network request failed";
      if (__DEV__) {
        console.warn(`[API] Network/Timeout error on ${method} ${url} (attempt ${attempt + 1}):`, msg);
      }
      lastErr = new ApiError(0, "NETWORK_ERROR", msg);
    }
  }
  if (lastErr) {
    throw lastErr;
  }

  // Handle 401 expired rotation retry
  if (res.status === 401 && auth) {
    let errBody: { error?: { code?: string } } | null = null;
    try {
      errBody = (await res.clone().json()) as { error?: { code?: string } };
    } catch {
      // ignore
    }

    if (errBody?.error?.code === "AUTH_TOKEN_EXPIRED") {
      const refreshed = await refreshTokens();
      if (refreshed && inMemoryAccessToken) {
        headers["Authorization"] = `Bearer ${inMemoryAccessToken}`;
        res = await fetch(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
      }
    }
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const resJson = await res.json().catch(() => null);

  if (!res.ok) {
    const errorBody: ApiErrorBody = resJson?.error || {
      code: "HTTP_" + res.status,
      message: res.statusText || "Request failed",
      details: null,
      request_id: "client-generated",
    };
    const details =
      errorBody.details && typeof errorBody.details === "object" && !Array.isArray(errorBody.details)
        ? (errorBody.details as Record<string, any>)
        : null;
    if (__DEV__) {
      console.warn(`[API] HTTP ${res.status} on ${method} ${url}:`, errorBody.code, errorBody.message);
    }
    throw new ApiError(res.status, errorBody.code, errorBody.message, details, errorBody.request_id, `${method} ${path}`);
  }

  return resJson as T;
}

type SseCustomEvent =
  | "bay_changed"
  | "zone_summary"
  | "crowd_changed"
  | "forecast_updated"
  | "device_health"
  | "maintenance_changed"
  | "reservation_changed"
  | "notification"
  | "auth_expired"
  | "resync";

const SSE_EVENTS: SseCustomEvent[] = [
  "bay_changed",
  "zone_summary",
  "crowd_changed",
  "forecast_updated",
  "device_health",
  "maintenance_changed",
  "reservation_changed",
  "notification",
  "auth_expired",
  "resync",
];

/**
 * SSE Live Stream connection manager using react-native-sse
 * Subscribes while focused, pauses on background, auto-reconnects with Last-Event-ID
 */
export function openStream(opts: {
  onEvent: (event: LiveEvent) => void;
  onResync?: () => void;
  onState?: (connected: boolean) => void;
}): () => void {
  let isClosed = false;
  let eventSource: EventSource<SseCustomEvent> | null = null;
  let lastEventId: string | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let retryCount = 0;

  function connect() {
    if (isClosed) return;
    if (!__DEV__ && !API_BASE.startsWith("https://")) {
      opts.onState?.(false);
      return;
    }

    const token = getAccessToken();
    const headers: Record<string, string> = {
      Accept: "text/event-stream",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (lastEventId) {
      headers["Last-Event-ID"] = lastEventId;
    }

    try {
      eventSource = new EventSource<SseCustomEvent>(`${API_BASE}/stream`, {
        headers,
        pollingInterval: 0,
      });

      eventSource.addEventListener("open", () => {
        retryCount = 0;
        opts.onState?.(true);
      });

      const handleIncoming = (e: { type?: string; data?: string | null; lastEventId?: string | null }) => {
        if (e.lastEventId) {
          lastEventId = e.lastEventId;
        }
        try {
          const payload = e.data ? JSON.parse(e.data) : {};
          if (e.type === "auth_expired") {
            disconnect();
            refreshTokens().then((ok) => {
              if (ok) connect();
            });
            return;
          }
          if (e.type === "resync") {
            opts.onResync?.();
            return;
          }
          opts.onEvent({ event: e.type, data: payload } as LiveEvent);
        } catch {
          // ignore malformed
        }
      };

      SSE_EVENTS.forEach((evName) => {
        eventSource?.addEventListener(evName, handleIncoming);
      });

      eventSource.addEventListener("error", () => {
        opts.onState?.(false);
        disconnect();
        if (!isClosed) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000) + Math.random() * 500;
          retryCount++;
          reconnectTimeout = setTimeout(connect, delay);
        }
      });
    } catch {
      opts.onState?.(false);
    }
  }

  function disconnect() {
    if (eventSource) {
      eventSource.removeAllEventListeners();
      eventSource.close();
      eventSource = null;
    }
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  }

  // Handle AppState: pause stream when backgrounded, reconnect on active
  const appStateSub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
    if (nextState === "active" && !isClosed) {
      if (!eventSource) connect();
    } else if (nextState === "background" || nextState === "inactive") {
      disconnect();
      opts.onState?.(false);
    }
  });

  connect();

  return () => {
    isClosed = true;
    appStateSub.remove();
    disconnect();
    opts.onState?.(false);
  };
}
