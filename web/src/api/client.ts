import type { ApiErrorBody, ErrorEnvelope, TokenPair } from "./types";

export const API_BASE = "/api/v1";
export const USE_MOCK = false;

export class ApiError extends Error {
  status: number;
  code: string;
  details: unknown;
  requestId: string | null;

  constructor(
    status: number,
    code: string,
    message: string,
    details: unknown = null,
    requestId: string | null = null
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

export function describeApiError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "BOOKING_OVERLAP":
        return "No bay is free for that time - choose another slot";
      case "AUTH_INVALID_CREDENTIALS":
        return "Invalid email or password";
      case "ACCOUNT_PENDING_APPROVAL":
        return "Your account is waiting for approval";
      case "FORBIDDEN":
        return "Account suspended or insufficient permissions";
      case "RATE_LIMITED":
        return "Too many attempts, wait a minute";
      case "VALIDATION_ERROR": {
        const d = err.details as { fields?: Array<{ loc?: unknown[]; msg?: string }> } | null;
        if (d?.fields?.length) {
          return d.fields
            .map((f) => `${(f.loc ?? []).slice(-1)[0] ?? "field"}: ${f.msg ?? "invalid"}`)
            .join("; ");
        }
        return err.message;
      }
      default:
        return err.message;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "An unexpected error occurred";
}

const REFRESH_STORAGE_KEY = "parksmart_refresh";

let inMemoryAccessToken: string | null = null;
let tokenExpiresAt: number | null = null;

export const tokenStore = {
  get access(): string | null {
    return inMemoryAccessToken;
  },
  get exp(): number | null {
    return tokenExpiresAt;
  },
  get refresh(): string | null {
    try {
      return sessionStorage.getItem(REFRESH_STORAGE_KEY);
    } catch {
      return null;
    }
  },
  load(): void {
    // Access token is in-memory only; refresh token stays in sessionStorage
  },
  save(pair: TokenPair): void {
    inMemoryAccessToken = pair.access_token;
    tokenExpiresAt = Date.now() + pair.expires_in * 1000;
    try {
      sessionStorage.setItem(REFRESH_STORAGE_KEY, pair.refresh_token);
    } catch {
      // sessionStorage unavailable or threw error
    }
  },
  clear(): void {
    inMemoryAccessToken = null;
    tokenExpiresAt = null;
    try {
      sessionStorage.removeItem(REFRESH_STORAGE_KEY);
    } catch {
      // Ignore
    }
  },
};

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

let refreshPromise: Promise<boolean> | null = null;

export async function refreshTokens(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const currentRefreshToken = tokenStore.refresh;
    if (!currentRefreshToken) {
      tokenStore.clear();
      return false;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: currentRefreshToken }),
      });

      if (!response.ok) {
        tokenStore.clear();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth:lost"));
        }
        return false;
      }

      const pair = (await response.json()) as TokenPair;
      tokenStore.save(pair);
      return true;
    } catch {
      tokenStore.clear();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:lost"));
      }
      return false;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export interface ApiRequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  auth?: boolean;
}

export async function api<T>(path: string, init?: ApiRequestOptions): Promise<T> {
  // Check pre-expiry (10s skew)
  if (init?.auth !== false && tokenStore.access && tokenStore.exp) {
    if (tokenStore.exp - Date.now() < 10000) {
      await refreshTokens();
    }
  }

  // Construct query string
  let url = `${API_BASE}${path}`;
  if (init?.query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(init.query)) {
      if (v !== undefined && v !== null) {
        params.append(k, String(v));
      }
    }
    const qStr = params.toString();
    if (qStr) {
      url += `?${qStr}`;
    }
  }

  const headers: Record<string, string> = {};
  if (init?.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (init?.auth !== false && tokenStore.access) {
    headers["Authorization"] = `Bearer ${tokenStore.access}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: init?.method ?? "GET",
      headers,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init?.signal,
    });
  } catch (err) {
    throw new ApiError(0, "NETWORK_ERROR", err instanceof Error ? err.message : "Network failure", null, null);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    let errorData: ApiErrorBody | null = null;
    try {
      const parsed = (await response.json()) as ErrorEnvelope;
      if (parsed && parsed.error) {
        errorData = parsed.error;
      }
    } catch {
      // Non-JSON response
    }

    const status = response.status;
    const code = errorData?.code ?? (status === 503 ? "SERVICE_UNAVAILABLE" : "INTERNAL_ERROR");
    const message = errorData?.message ?? (response.statusText || "Unexpected error");
    let details: unknown = errorData?.details ?? null;
    const requestId = errorData?.request_id ?? response.headers.get("x-request-id");

    if (status === 429) {
      const retryAfter = response.headers.get("retry-after");
      if (retryAfter) {
        const retryAfterSec = parseInt(retryAfter, 10);
        if (!isNaN(retryAfterSec)) {
          details = { ...(typeof details === "object" && details !== null ? details : {}), retry_after_s: retryAfterSec };
        }
      }
    }

    // Refresh retry logic on AUTH_TOKEN_EXPIRED
    if (status === 401 && code === "AUTH_TOKEN_EXPIRED" && init?.auth !== false) {
      const refreshed = await refreshTokens();
      if (refreshed) {
        // Retry once
        return api<T>(path, init);
      }
    }

    throw new ApiError(status, code, message, details, requestId);
  }

  return (await response.json()) as T;
}
