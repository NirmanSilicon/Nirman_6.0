import * as Sentry from '@sentry/react';

export interface TrackedErrorRecord {
  id?: number;
  source: string;
  severity: 'error' | 'warning';
  message: string;
  stack?: string;
  url?: string;
  created_at?: string;
}

const LOCAL_ERROR_KEY = 'ecopulse_error_log_v1';
let initialized = false;

function appendLocalError(entry: TrackedErrorRecord) {
  try {
    const raw = localStorage.getItem(LOCAL_ERROR_KEY);
    const list: TrackedErrorRecord[] = raw ? JSON.parse(raw) : [];
    const next = [entry, ...list].slice(0, 25);
    localStorage.setItem(LOCAL_ERROR_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

export function getLocalTrackedErrors(): TrackedErrorRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_ERROR_KEY);
    return raw ? (JSON.parse(raw) as TrackedErrorRecord[]) : [];
  } catch {
    return [];
  }
}

export function initErrorTracking() {
  if (initialized) return;
  initialized = true;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn) {
    Sentry.init({
      dsn,
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: 0.2,
    });
  }

  window.addEventListener('error', (event) => {
    reportError({
      source: 'window.onerror',
      severity: 'error',
      message: event.message || 'Unhandled runtime error',
      stack: event.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg =
      reason instanceof Error ? reason.message : String(reason || 'Unhandled promise rejection');
    reportError({
      source: 'unhandledrejection',
      severity: 'error',
      message: msg,
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}

export function reportError(params: {
  source: string;
  severity?: 'error' | 'warning';
  message: string;
  stack?: string;
  error?: unknown;
}) {
  const severity = params.severity ?? 'error';
  const errObj = params.error instanceof Error ? params.error : undefined;
  const stack = params.stack ?? errObj?.stack;
  const record: TrackedErrorRecord = {
    source: params.source,
    severity,
    message: params.message,
    stack,
    url: window.location.pathname,
    created_at: new Date().toISOString(),
  };

  appendLocalError(record);

  if (import.meta.env.VITE_SENTRY_DSN) {
    if (errObj) {
      Sentry.captureException(errObj, { tags: { source: params.source } });
    } else {
      Sentry.captureMessage(`[${params.source}] ${params.message}`, severity);
    }
  }

  fetch('/api/errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(record),
  }).catch(() => {
    // Non-blocking error telemetry
  });
}
