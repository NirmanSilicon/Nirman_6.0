import React, { useState } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { loginUser, registerUser, type AuthResponse, type UserRole } from "../lib/api";

interface AuthModalProps {
  onClose?: () => void;
  onAuthSuccess: (auth: AuthResponse) => void;
  standalone?: boolean;
}

type AuthTab = "signin" | "signup";
type LoadingAction = "signin" | "signup" | "demo-citizen" | "demo-enterprise" | null;

export const AuthModal: React.FC<AuthModalProps> = ({
  onClose,
  onAuthSuccess,
  standalone = false,
}) => {
  const [tab, setTab] = useState<AuthTab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("citizen");
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [error, setError] = useState<string | null>(null);

  const submitting = loadingAction !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(tab === "signin" ? "signin" : "signup");
    setError(null);
    try {
      const auth =
        tab === "signin"
          ? await loginUser({ email: email.trim(), password })
          : await registerUser({
              email: email.trim(),
              full_name: fullName.trim(),
              password,
              role,
            });
      onAuthSuccess(auth);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDemoLogin = async (
    demoRole: "demo-citizen" | "demo-enterprise",
    demoEmail: string,
    demoPassword: string,
  ) => {
    setLoadingAction(demoRole);
    setError(null);
    try {
      const auth = await loginUser({ email: demoEmail, password: demoPassword });
      onAuthSuccess(auth);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo login failed.");
    } finally {
      setLoadingAction(null);
    }
  };

  const card = (
    <div
      className={`w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl ${
        standalone ? "" : "max-h-[90vh] overflow-y-auto"
      }`}
      role={standalone ? "region" : "dialog"}
      aria-modal={standalone ? undefined : true}
      aria-labelledby="auth-modal-title"
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-md bg-slate-900 text-white">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 id="auth-modal-title" className="text-lg font-bold leading-tight text-slate-900">
              CyberGuard
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              Citizen Phishing Link Shield &amp; Enterprise Auto-Remediation Platform
            </p>
          </div>
        </div>
        {!standalone && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2.5 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        ) : null}
      </div>

      <div
        className="mt-4 grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-100 p-1"
        role="tablist"
        aria-label="Authentication mode"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "signin"}
          onClick={() => {
            setTab("signin");
            setError(null);
          }}
          className={`rounded-md py-1.5 text-xs font-semibold transition ${
            tab === "signin"
              ? "bg-white text-slate-900 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "signup"}
          onClick={() => {
            setTab("signup");
            setError(null);
          }}
          className={`rounded-md py-1.5 text-xs font-semibold transition ${
            tab === "signup"
              ? "bg-white text-slate-900 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {tab === "signup" && (
          <div>
            <label className="block text-xs font-semibold text-slate-700" htmlFor="auth-full-name">
              Full Name
            </label>
            <input
              id="auth-full-name"
              type="text"
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700" htmlFor="auth-email">
            Email Address
          </label>
          <input
            id="auth-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700" htmlFor="auth-password">
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            required
            minLength={tab === "signup" ? 6 : 1}
            autoComplete={tab === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={tab === "signup" ? "Minimum 6 characters" : "Enter password"}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
          />
        </div>

        {tab === "signup" && (
          <div>
            <span className="block text-xs font-semibold text-slate-700">Account Role</span>
            <div className="mt-1.5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRole("citizen")}
                className={`rounded-lg border p-3 text-left transition ${
                  role === "citizen"
                    ? "border-blue-600 bg-blue-50 text-blue-950"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="text-xs font-bold">Citizen</div>
                <div className="mt-0.5 text-[11px] opacity-80">Link Shield &amp; scam checks</div>
              </button>
              <button
                type="button"
                onClick={() => setRole("enterprise")}
                className={`rounded-lg border p-3 text-left transition ${
                  role === "enterprise"
                    ? "border-emerald-700 bg-emerald-50 text-emerald-950"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="text-xs font-bold">Enterprise</div>
                <div className="mt-0.5 text-[11px] opacity-80">Website audits &amp; auto-fix</div>
              </button>
            </div>
          </div>
        )}

        {error && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800"
            role="alert"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting && (loadingAction === "signin" || loadingAction === "signup") ? (
            <>
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              {loadingAction === "signin" ? "Signing in..." : "Creating account..."}
            </>
          ) : tab === "signin" ? (
            "Sign In"
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            One-Click Demo Access
          </p>
          {loadingAction === "demo-citizen" || loadingAction === "demo-enterprise" ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
              Signing in...
            </span>
          ) : null}
        </div>
        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() =>
              void handleDemoLogin("demo-citizen", "citizen@cyberguard.in", "Citizen@2026")
            }
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-left transition hover:bg-blue-100 disabled:opacity-50"
          >
            <div className="text-xs font-bold text-blue-900">
              {loadingAction === "demo-citizen" ? "Signing in..." : "Demo Citizen"}
            </div>
            <div className="truncate font-mono text-[10px] text-blue-700">
              citizen@cyberguard.in
            </div>
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() =>
              void handleDemoLogin("demo-enterprise", "owner@sharmabakery.in", "Enterprise@2026")
            }
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-left transition hover:bg-emerald-100 disabled:opacity-50"
          >
            <div className="text-xs font-bold text-emerald-900">
              {loadingAction === "demo-enterprise" ? "Signing in..." : "Demo Enterprise"}
            </div>
            <div className="truncate font-mono text-[10px] text-emerald-700">
              owner@sharmabakery.in
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  if (standalone) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10 text-foreground">
        {card}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      {card}
    </div>
  );
};
