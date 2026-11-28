import React, { useEffect, useState } from 'react';
import { X, ShieldAlert, RefreshCw, Bug, CheckCircle2 } from 'lucide-react';
import {
  TrackedErrorRecord,
  getLocalTrackedErrors,
  reportError,
} from '../utils/errorTracker';
import LatticeLoader from './LatticeLoader';
import SpecularButton from './SpecularButton';

interface DiagnosticsModalProps {
  onClose: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({ onClose }) => {
  const [errors, setErrors] = useState<TrackedErrorRecord[]>([]);
  const [sentryConfigured, setSentryConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadErrors = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/errors', { credentials: 'include' });
      if (resp.ok) {
        const data = await resp.json();
        setSentryConfigured(Boolean(data.sentryConfigured));
        const serverRows = (data.errors as TrackedErrorRecord[]) || [];
        setErrors(serverRows.length > 0 ? serverRows : getLocalTrackedErrors());
      } else {
        setErrors(getLocalTrackedErrors());
      }
    } catch {
      setErrors(getLocalTrackedErrors());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadErrors();
  }, []);

  const triggerTestEvent = () => {
    reportError({
      source: 'diagnostics.test',
      severity: 'warning',
      message: 'Sample diagnostic event triggered to verify EcoPulse error tracking.',
    });
    window.setTimeout(loadErrors, 350);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900">
                Error Tracking &amp; Diagnostics
              </h3>
              <p className="text-[11px] text-slate-500">
                Captures React crashes, unhandled promises &amp; camera/API errors
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-slate-800">
                Postgres Error Log: Active
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-600">
                Sentry Relay: {sentryConfigured || import.meta.env.VITE_SENTRY_DSN ? 'Connected' : 'Optional (DSN unset)'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <SpecularButton
                size="xs"
                radius={18}
                tint="#ffffff"
                tintOpacity={0.04}
                textColor="#f5f5f5"
                lineColor="#ffffff"
                baseColor="#525252"
                surfaceColor="#18181b"
                intensity={1}
                idleIntensity={0.35}
                shineSize={10}
                shineFade={34}
                thickness={1.2}
                glow={1}
                followMouse
                proximity={250}
                onClick={triggerTestEvent}
              >
                Send Test Event
              </SpecularButton>
              <button
                type="button"
                onClick={loadErrors}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2">
            {loading ? (
              <div className="flex justify-center py-6 text-slate-600">
                <LatticeLoader
                  status="working"
                  label="Loading telemetry"
                  doneLabel="Done in"
                  errorLabel="Failed after"
                  pattern="orbit"
                  grid={3}
                  shape="round"
                  doneColor="#22c55e"
                  errorColor="#ef4444"
                  cellSize={6}
                  gap={2}
                  fontSize={14}
                  step={90}
                  idleOpacity={0.15}
                  glow={false}
                  glowColor=""
                  showTimer
                />
              </div>
            ) : errors.length === 0 ? (
              <div className="text-center py-8 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-800">Zero runtime errors recorded</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  ErrorBoundary and global handlers are actively monitoring.
                </p>
              </div>
            ) : (
              errors.map((err, i) => (
                <div
                  key={err.id ?? `${err.created_at}-${i}`}
                  className="p-3 rounded-2xl border border-slate-200 bg-slate-50/60 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      {err.source}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {err.created_at ? new Date(err.created_at).toLocaleString() : 'just now'}
                    </span>
                  </div>
                  <p className="text-slate-700 break-words">{err.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
