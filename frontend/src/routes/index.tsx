import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Copy,
  Download,
  FileText,
  Globe2,
  History,
  KeyRound,
  Link2,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Network,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  Wifi,
  WifiOff,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { AuthModal } from "../components/AuthModal";
import { CitizenLinkShield } from "../components/CitizenLinkShield";
import { RemoteRemediateModal } from "../components/RemoteRemediateModal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { canSubmitAudit } from "@/lib/audit-permissions";
import {
  ApiError,
  checkApiHealth,
  clearAuthToken,
  createScan,
  getAuthToken,
  getCurrentUser,
  getRecentScans,
  getScan,
  getUserActivity,
  rollbackRemoteRemediation,
  type AuditFinding,
  type AuditModule,
  type AuditSeverity,
  type AuthResponse,
  type ModuleSummary,
  type RemediateResponse,
  type ScanListItem,
  type ScanResponse,
  type UserActivitySummary,
  type UserProfile,
} from "../lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CyberGuard MSME | Website Security Audits" },
      {
        name: "description",
        content:
          "Passive website security audits and practical hardening guidance for small businesses.",
      },
      { property: "og:title", content: "CyberGuard MSME | Website Security Audits" },
      {
        property: "og:description",
        content:
          "Review website security findings, understand business impact, and apply practical hardening guidance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type ApiStatus = "checking" | "connected" | "offline";
type AppMode = "enterprise" | "citizen";
type SeverityFilter = "ALL" | AuditSeverity;
type PatchTab = "nginx" | "apache" | "dns";

type RemediationVerification = {
  response: RemediateResponse;
  beforeScore: number;
  agentKey: string;
  targetUrl: string;
};

const modules: Array<{ key: AuditModule; title: string; icon: LucideIcon }> = [
  { key: "tls", title: "TLS / SSL", icon: LockKeyhole },
  { key: "headers", title: "HTTP headers", icon: ShieldCheck },
  { key: "dns", title: "DNS / email", icon: Network },
  { key: "surface", title: "Surface exposure", icon: Globe2 },
];

const severityFilters: Array<{ value: SeverityFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

const severityClasses: Record<AuditSeverity, string> = {
  CRITICAL: "severity-critical",
  HIGH: "severity-high",
  MEDIUM: "severity-medium",
  LOW: "severity-low",
  INFO: "severity-info",
};

const patchTabs: Array<{ value: PatchTab; label: string; file: string }> = [
  { value: "nginx", label: "Nginx config", file: "nginx.conf" },
  { value: "apache", label: "Apache .htaccess", file: ".htaccess" },
  { value: "dns", label: "DNS zone", file: "dns-zone.txt" },
];

function Index() {
  const [activeMode, setActiveMode] = useState<AppMode>("enterprise");
  const [target, setTarget] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [loadingScanId, setLoadingScanId] = useState<number | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");
  const [audit, setAudit] = useState<ScanResponse | null>(null);
  const [recentScans, setRecentScans] = useState<ScanListItem[]>([]);
  const [historyUnavailable, setHistoryUnavailable] = useState(false);
  const [scanError, setScanError] = useState<ApiError | null>(null);
  const [filter, setFilter] = useState<SeverityFilter>("ALL");
  const [patchTab, setPatchTab] = useState<PatchTab>("nginx");
  const [notice, setNotice] = useState("");
  const [isRemediateModalOpen, setIsRemediateModalOpen] = useState(false);
  const [remediationVerification, setRemediationVerification] =
    useState<RemediationVerification | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackError, setRollbackError] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityData, setActivityData] = useState<UserActivitySummary | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void checkApiHealth()
      .then(() => {
        if (mounted) setApiStatus("connected");
      })
      .catch(() => {
        if (mounted) setApiStatus("offline");
      });

    const token = getAuthToken();
    if (!token) {
      setAuthChecking(false);
    } else {
      void getCurrentUser()
        .then((user) => {
          if (mounted) {
            setCurrentUser(user);
            setActiveMode(user.role === "enterprise" ? "enterprise" : "citizen");
          }
        })
        .catch(() => {
          clearAuthToken();
          if (mounted) setCurrentUser(null);
        })
        .finally(() => {
          if (mounted) setAuthChecking(false);
        });
    }
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setAudit(null);
    setRecentScans([]);
    setRemediationVerification(null);
    setRollbackError(null);
    setScanError(null);
    setHistoryUnavailable(false);
    setIsRemediateModalOpen(false);

    if (currentUser?.role !== "enterprise") {
      return () => {
        cancelled = true;
      };
    }

    void getRecentScans()
      .then((items) => {
        if (!cancelled) {
          setRecentScans(items);
          setHistoryUnavailable(false);
        }
      })
      .catch(() => {
        if (!cancelled) setHistoryUnavailable(true);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, currentUser?.role]);

  const visibleFindings = useMemo(() => {
    if (!audit) return [];
    return filter === "ALL"
      ? audit.findings
      : audit.findings.filter((finding) => finding.severity === filter);
  }, [audit, filter]);

  async function refreshHistory() {
    if (currentUser?.role !== "enterprise") return;
    try {
      const items = await getRecentScans();
      setRecentScans(items);
      setHistoryUnavailable(false);
    } catch {
      setHistoryUnavailable(true);
    }
  }

  async function handleScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmitAudit(authorized, target, isScanning)) return;

    const trimmedTarget = target.trim();
    const scanUrl = /^https?:\/\//i.test(trimmedTarget)
      ? trimmedTarget
      : `https://${trimmedTarget}`;
    setScanError(null);
    setRemediationVerification(null);
    setRollbackError(null);
    setIsScanning(true);
    try {
      const result = await createScan(scanUrl, true);
      setAudit(result);
      setFilter("ALL");
      setPatchTab("nginx");
      await refreshHistory();
    } catch (error) {
      setScanError(
        error instanceof ApiError
          ? error
          : new ApiError("The audit could not be completed. Please try again.", 0),
      );
    } finally {
      setIsScanning(false);
    }
  }

  async function openSavedScan(item: ScanListItem) {
    setLoadingScanId(item.scan_id);
    setScanError(null);
    setRemediationVerification(null);
    setRollbackError(null);
    try {
      setAudit(await getScan(item.scan_id));
      setFilter("ALL");
      setPatchTab("nginx");
    } catch (error) {
      setScanError(
        error instanceof ApiError
          ? error
          : new ApiError("This saved audit could not be opened.", 0),
      );
    } finally {
      setLoadingScanId(null);
    }
  }

  function handleRemediationSuccess(remediateRes: RemediateResponse, agentKeyUsed: string) {
    const beforeScore = remediateRes.before_score ?? audit?.score ?? remediateRes.after_score;
    setAudit(remediateRes.verified_scan);
    setFilter("ALL");
    setPatchTab("nginx");
    setIsRemediateModalOpen(false);
    setRollbackError(null);
    setRemediationVerification({
      response: remediateRes,
      beforeScore,
      agentKey: agentKeyUsed,
      targetUrl: remediateRes.verified_scan.normalized_url,
    });
    void refreshHistory();
  }

  async function handleRollback() {
    if (!remediationVerification || isRollingBack) return;
    setIsRollingBack(true);
    setRollbackError(null);
    try {
      const rolledBackScan = await rollbackRemoteRemediation({
        url: remediationVerification.targetUrl,
        agent_key: remediationVerification.agentKey,
        approved: true,
      });
      setAudit(rolledBackScan);
      setFilter("ALL");
      setPatchTab("nginx");
      setRemediationVerification(null);
      await refreshHistory();
      setNotice("Patch rolled back and verified");
      window.setTimeout(() => setNotice(""), 2800);
    } catch (error) {
      setRollbackError(
        error instanceof Error ? error.message : "Could not roll back the applied patches.",
      );
    } finally {
      setIsRollingBack(false);
    }
  }

  function handleAuthSuccess(auth: AuthResponse) {
    setAudit(null);
    setRecentScans([]);
    setRemediationVerification(null);
    setRollbackError(null);
    setScanError(null);
    setHistoryUnavailable(false);
    setCurrentUser(auth.user);
    setActiveMode(auth.user.role === "enterprise" ? "enterprise" : "citizen");
    setNotice(`Signed in as ${auth.user.full_name}`);
    window.setTimeout(() => setNotice(""), 2400);
  }

  function handleSignOut() {
    clearAuthToken();
    setCurrentUser(null);
    setAudit(null);
    setRecentScans([]);
    setRemediationVerification(null);
    setRollbackError(null);
    setScanError(null);
    setHistoryUnavailable(false);
    setIsActivityModalOpen(false);
    setActivityData(null);
    setIsRemediateModalOpen(false);
    setNotice("Signed out");
    window.setTimeout(() => setNotice(""), 2400);
  }

  async function openActivityModal() {
    setIsActivityModalOpen(true);
    setActivityLoading(true);
    setActivityError(null);
    try {
      const summary = await getUserActivity();
      setActivityData(summary);
    } catch (error) {
      setActivityError(
        error instanceof Error ? error.message : "Could not load your activity history.",
      );
    } finally {
      setActivityLoading(false);
    }
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`${label} copied`);
    } catch {
      setNotice("Clipboard access is unavailable in this browser.");
    }
    window.setTimeout(() => setNotice(""), 2400);
  }

  function downloadPatch(text: string, filename: string) {
    const file = new Blob([text], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    const objectUrl = URL.createObjectURL(file);
    link.href = objectUrl;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(objectUrl);
  }

  const activePatch = patchTabs.find((item) => item.value === patchTab);
  const activePatchText = audit?.patch_bundle[patchTab] ?? "";

  if (authChecking) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-8 py-7 text-center shadow-sm">
          <div className="grid size-11 place-items-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <LoaderCircle className="size-4 animate-spin text-primary" aria-hidden="true" />
            <span>Verifying CyberGuard session...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthModal standalone onAuthSuccess={handleAuthSuccess} />;
  }

  const isEnterprise = currentUser.role === "enterprise";
  const effectiveMode: AppMode = isEnterprise ? activeMode : "citizen";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="topbar no-print border-b border-border bg-background">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold leading-tight">CyberGuard MSME</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                Passive Website Security &amp; Auto-Remediation Engine
              </p>
            </div>
          </div>

          {isEnterprise ? (
            <div
              className="inline-flex rounded-lg border border-border bg-muted/60 p-1"
              role="tablist"
              aria-label="CyberGuard mode switcher"
            >
              <button
                type="button"
                role="tab"
                aria-selected={effectiveMode === "enterprise"}
                onClick={() => setActiveMode("enterprise")}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                  effectiveMode === "enterprise"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ShieldCheck className="size-4" aria-hidden="true" />
                Enterprise Auditor
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={effectiveMode === "citizen"}
                onClick={() => setActiveMode("citizen")}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                  effectiveMode === "citizen"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Link2 className="size-4" aria-hidden="true" />
                Link Checker
              </button>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <ApiConnectionStatus status={apiStatus} />
            {isEnterprise && effectiveMode === "enterprise" ? (
              <>
                {audit ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 gap-2 bg-emerald-700 px-3.5 font-semibold text-white shadow-xs hover:bg-emerald-800"
                    onClick={() => setIsRemediateModalOpen(true)}
                  >
                    <Wrench className="size-4" aria-hidden="true" />
                    Auto-Fix Remotely
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2 px-3"
                  onClick={() => window.print()}
                >
                  <FileText className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Export PDF Report</span>
                  <span className="sm:hidden">Export PDF</span>
                </Button>
              </>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <UserCheck className="size-3.5 text-primary" aria-hidden="true" />
                <span className="max-w-[130px] truncate">{currentUser.full_name}</span>
              </span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  currentUser.role === "enterprise"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {currentUser.role.toUpperCase()}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => void openActivityModal()}
              >
                <History className="size-3.5" aria-hidden="true" />
                My Activity
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleSignOut}
              >
                <LogOut className="size-3.5" aria-hidden="true" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 pb-12 pt-7 sm:px-6 sm:pt-9 lg:px-8">
        {!isEnterprise ? (
          <CitizenLinkShield />
        ) : effectiveMode === "citizen" ? (
          <CitizenLinkShield variant="enterprise" />
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-primary">
                  Security workspace
                </p>
                <h1 className="text-2xl font-bold sm:text-[28px]">Website audit overview</h1>
              </div>
              {audit ? (
                <p className="text-sm text-muted-foreground">
                  Last audit{" "}
                  <span className="font-medium text-foreground">{formatDate(audit.scanned_at)}</span>
                </p>
              ) : null}
            </div>

            {remediationVerification ? (
              <div
                className="mb-6 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 shadow-xs sm:p-5"
                role="status"
                aria-live="polite"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <CheckCircle2 className="size-5 shrink-0 text-emerald-700" aria-hidden="true" />
                      <span className="text-sm font-bold text-emerald-900">
                        Remote Remediation Verified
                      </span>
                      <span className="rounded-md bg-emerald-700 px-2.5 py-0.5 text-xs font-bold text-white">
                        Before: {remediationVerification.beforeScore}/100 → After:{" "}
                        {remediationVerification.response.after_score}/100
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-900">
                      <span>
                        <strong>{remediationVerification.response.applied_patches.length}</strong>{" "}
                        {remediationVerification.response.applied_patches.length === 1
                          ? "patch"
                          : "patches"}{" "}
                        applied
                      </span>
                      <span>
                        Agent timestamp:{" "}
                        <span className="font-mono font-medium">
                          {formatDate(remediationVerification.response.agent_timestamp)}
                        </span>
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isRollingBack}
                    onClick={() => void handleRollback()}
                    className="no-print h-9 shrink-0 gap-2 border-emerald-400 bg-white text-emerald-900 hover:bg-emerald-100"
                  >
                    {isRollingBack ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                        Rolling back...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="size-4" aria-hidden="true" />
                        Rollback Patch
                      </>
                    )}
                  </Button>
                </div>
                {rollbackError ? (
                  <p className="mt-2 text-xs font-medium text-red-700" role="alert">
                    {rollbackError}
                  </p>
                ) : null}
              </div>
            ) : null}

            <form
              className="scan-input mb-6 rounded-md border border-border bg-card p-4 shadow-sm sm:p-5"
              onSubmit={handleScan}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Start a security audit</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Passive checks only. An authorized owner must approve each audit.
                  </p>
                </div>
                <div className="hidden size-9 shrink-0 place-items-center rounded-md bg-secondary text-primary sm:grid">
                  <Activity className="size-4" aria-hidden="true" />
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="relative min-w-0 flex-1">
                  <Globe2
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    value={target}
                    onChange={(event) => setTarget(event.target.value)}
                    placeholder="Enter domain, e.g. mybakery.in"
                    aria-label="Website domain to audit"
                    className="h-11 pl-10"
                  />
                </label>
                <Button
                  type="submit"
                  disabled={!canSubmitAudit(authorized, target, isScanning)}
                  className="h-11 shrink-0 px-5"
                >
                  {isScanning ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                      Auditing website…
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-4" aria-hidden="true" />
                      Run Security Audit
                    </>
                  )}
                </Button>
              </div>
              <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm leading-5 text-muted-foreground">
                <Checkbox
                  id="audit-authorization"
                  checked={authorized}
                  onCheckedChange={(checked) => setAuthorized(checked === true)}
                  className="mt-0.5"
                />
                <span>
                  I own this domain or have explicit written authorization to run passive security
                  checks.
                </span>
              </label>

              {scanError ? (
                <div
                  className="mt-4 flex items-start gap-3 rounded-md border border-severity-high/30 bg-severity-high/5 p-3.5 text-sm"
                  role="alert"
                >
                  <CircleAlert
                    className="mt-0.5 size-4 shrink-0 text-severity-high"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-semibold text-foreground">
                      {scanError.status === 400 || scanError.status === 403
                        ? "Audit request was blocked"
                        : "The audit could not be completed"}
                    </p>
                    <p className="mt-1 break-words text-muted-foreground">{scanError.message}</p>
                  </div>
                </div>
              ) : null}

              {isScanning ? <ScanProgress /> : null}
            </form>

            <div className="workspace-grid grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">
              <div className="min-w-0">
                {audit ? (
                  <AuditReport
                    audit={audit}
                    filter={filter}
                    setFilter={setFilter}
                    findings={visibleFindings}
                    patchTab={patchTab}
                    setPatchTab={setPatchTab}
                    patchTabs={patchTabs}
                    patchText={activePatchText}
                    patchFilename={activePatch?.file ?? "patch.txt"}
                    onCopy={copyText}
                    onDownload={downloadPatch}
                  />
                ) : (
                  <EmptyState onSelectTarget={setTarget} />
                )}
              </div>

              <aside className="audit-sidebar rounded-md border border-border bg-card shadow-sm">
                <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4">
                  <div>
                    <h2 className="text-sm font-semibold">Recent audits</h2>
                    <p className="mt-1 text-xs text-muted-foreground">Your latest saved reports</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label="Refresh recent audits"
                    title="Refresh recent audits"
                    onClick={() => void refreshHistory()}
                  >
                    <RefreshCw className="size-4" aria-hidden="true" />
                  </Button>
                </div>
                <div className="divide-y divide-border">
                  {recentScans.map((item) => (
                    <Button
                      key={item.scan_id}
                      type="button"
                      variant="ghost"
                      disabled={loadingScanId === item.scan_id}
                      onClick={() => void openSavedScan(item)}
                      className="h-auto w-full justify-start rounded-none px-4 py-3.5 text-left hover:bg-muted/70"
                    >
                      <div className="flex w-full min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {item.domain}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(item.scanned_at)}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {item.findings_count}{" "}
                            {item.findings_count === 1 ? "finding" : "findings"}
                          </p>
                        </div>
                        <span className={`grade-chip ${scoreClass(item.score)}`}>{item.grade}</span>
                      </div>
                    </Button>
                  ))}
                  {recentScans.length === 0 ? (
                    <div className="px-4 py-7 text-center">
                      <Clock3 className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
                      <p className="mt-2 text-sm font-medium">No saved audits yet</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Completed reports will appear here.
                      </p>
                    </div>
                  ) : null}
                  {historyUnavailable ? (
                    <p className="px-4 py-3 text-xs text-severity-high" role="status">
                      Audit history is unavailable. Check the service connection and refresh.
                    </p>
                  ) : null}
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      {isEnterprise && isRemediateModalOpen && audit ? (
        <RemoteRemediateModal
          scan={audit}
          onClose={() => setIsRemediateModalOpen(false)}
          onSuccess={handleRemediationSuccess}
        />
      ) : null}

      {isActivityModalOpen ? (
        <UserActivityModal
          activity={activityData}
          loading={activityLoading}
          error={activityError}
          onRetry={() => void openActivityModal()}
          onClose={() => setIsActivityModalOpen(false)}
        />
      ) : null}

      {notice ? (
        <div className="copy-notice" role="status" aria-live="polite">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {notice}
        </div>
      ) : null}
    </div>
  );
}

function UserActivityModal({
  activity,
  loading,
  error,
  onRetry,
  onClose,
}: {
  activity: UserActivitySummary | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 text-slate-900 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-modal-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <span className="inline-block rounded bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">
              Account Activity Log
            </span>
            <h3 id="activity-modal-title" className="mt-1.5 text-lg font-bold text-slate-900">
              My Security Activity
            </h3>
            {activity ? (
              <p className="mt-0.5 text-xs text-slate-600">
                {activity.user.full_name} ({activity.user.email}) ·{" "}
                <span className="font-semibold uppercase">{activity.user.role}</span>
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2.5 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-600">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Loading your activity...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <p className="font-semibold">Unable to load activity</p>
              <p className="mt-1 text-xs">{error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
              >
                Retry
              </button>
            </div>
          ) : activity ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[11px] font-semibold uppercase text-slate-500">Total</div>
                  <div className="mt-1 text-xl font-bold tabular-nums">{activity.total_actions}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[11px] font-semibold uppercase text-slate-500">
                    Link Checks
                  </div>
                  <div className="mt-1 text-xl font-bold tabular-nums">
                    {activity.link_checks_count}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[11px] font-semibold uppercase text-slate-500">
                    Site Audits
                  </div>
                  <div className="mt-1 text-xl font-bold tabular-nums">
                    {activity.enterprise_scans_count}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[11px] font-semibold uppercase text-slate-500">
                    Auto-Patches
                  </div>
                  <div className="mt-1 text-xl font-bold tabular-nums">
                    {activity.remote_patches_count}
                  </div>
                </div>
              </div>

              {activity.recent_activities.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-slate-800">No recorded activity yet</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Run a link check, security audit, or remote patch while signed in to see it
                    here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                  {activity.recent_activities.map((item) => (
                    <div key={item.id} className="p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-semibold text-white">
                            {item.action_type}
                          </span>
                          <span className="truncate text-sm font-semibold text-slate-900">
                            {item.target}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-800">
                            {item.verdict_or_grade}
                            {item.score !== null ? ` (${item.score}/100)` : ""}
                          </span>
                          <span className="text-slate-500">{formatDate(item.created_at)}</span>
                        </div>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-600">{item.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ApiConnectionStatus({ status }: { status: ApiStatus }) {
  const statusCopy: Record<ApiStatus, string> = {
    checking: "Checking service",
    connected: "Service connected",
    offline: "Service offline",
  };
  const Icon = status === "connected" ? Wifi : status === "offline" ? WifiOff : LoaderCircle;
  return (
    <div
      className={`connection-badge connection-${status}`}
      role="status"
      aria-label={statusCopy[status]}
    >
      <Icon
        className={`size-3.5 ${status === "checking" ? "animate-spin" : ""}`}
        aria-hidden="true"
      />
      <span className="hidden sm:inline">{statusCopy[status]}</span>
      <span className="sm:hidden">
        {status === "connected" ? "Online" : status === "offline" ? "Offline" : "Checking"}
      </span>
    </div>
  );
}

function ScanProgress() {
  return (
    <div
      className="scan-progress mt-4 rounded-md border border-border bg-muted/45 p-3.5"
      role="status"
      aria-live="polite"
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <LoaderCircle className="size-4 animate-spin text-primary" aria-hidden="true" />
        Running four passive checks in parallel
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {modules.map(({ key, title }) => (
          <div key={key} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="scan-dot" aria-hidden="true" />
            <span>{title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onSelectTarget }: { onSelectTarget: (value: string) => void }) {
  const examples = ["example.com", "expired.badssl.com", "github.com"];
  return (
    <section className="rounded-md border border-border bg-card p-5 shadow-sm sm:p-7">
      <div className="flex items-start gap-4">
        <div className="grid size-11 shrink-0 place-items-center rounded-md bg-secondary text-primary">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-primary">Ready when you are</p>
          <h2 className="mt-1 text-xl font-bold">A clearer picture of your website’s security.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Review common website safeguards and get practical fixes in plain language. Each audit
            is passive and requires the domain owner’s authorization.
          </p>
        </div>
      </div>

      <div className="mt-7 grid gap-4 border-y border-border py-5 sm:grid-cols-2">
        {modules.map(({ key, title, icon: Icon }) => (
          <div key={key} className="flex items-start gap-3">
            <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {moduleDescription(key)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-5">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Try a sample domain</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {examples.map((example) => (
            <Button
              key={example}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSelectTarget(example)}
            >
              <Globe2 className="size-3.5" aria-hidden="true" />
              {example}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}

function AuditReport({
  audit,
  filter,
  setFilter,
  findings,
  patchTab,
  setPatchTab,
  patchTabs: tabs,
  patchText,
  patchFilename,
  onCopy,
  onDownload,
}: {
  audit: ScanResponse;
  filter: SeverityFilter;
  setFilter: (filter: SeverityFilter) => void;
  findings: AuditFinding[];
  patchTab: PatchTab;
  setPatchTab: (tab: PatchTab) => void;
  patchTabs: Array<{ value: PatchTab; label: string; file: string }>;
  patchText: string;
  patchFilename: string;
  onCopy: (text: string, label: string) => void;
  onDownload: (text: string, filename: string) => void;
}) {
  const safeScore = Math.max(0, Math.min(100, audit.score));
  const circumference = 2 * Math.PI * 43;

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex shrink-0 items-center gap-4">
            <div className="score-ring-wrap">
              <svg viewBox="0 0 100 100" className="size-[92px] -rotate-90" aria-hidden="true">
                <circle
                  cx="50"
                  cy="50"
                  r="43"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="43"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - safeScore / 100)}
                  className={scoreClass(safeScore)}
                />
              </svg>
              <div className="score-ring-label">
                <span className="text-2xl font-bold tabular-nums">{safeScore}</span>
                <span className="text-[10px] text-muted-foreground">of 100</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Security score
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className={`grade-chip grade-large ${scoreClass(safeScore)}`}>
                  {audit.grade}
                </span>
                <span className="text-sm text-muted-foreground">Grade</span>
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1 border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
            <p className="break-all text-lg font-bold">{audit.domain}</p>
            <p className="mt-1 break-all text-sm text-muted-foreground">{audit.normalized_url}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Network className="size-3.5" aria-hidden="true" />
                IP {audit.resolved_ip || "Not resolved"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-3.5" aria-hidden="true" />
                {new Intl.NumberFormat("en-IN").format(audit.duration_ms)} ms
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Activity className="size-3.5" aria-hidden="true" />
                {formatDate(audit.scanned_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 border-t border-border pt-4 sm:grid-cols-4">
          {modules.map(({ key, title, icon: Icon }) => (
            <ModuleStatusCard
              key={key}
              title={title}
              icon={Icon}
              summary={audit.module_summary[key]}
            />
          ))}
        </div>
      </section>

      <section className="rounded-md border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-base font-bold">Findings</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {audit.findings.length} {audit.findings.length === 1 ? "item" : "items"} found in this
              audit
            </p>
          </div>
          <div
            className="flex max-w-full flex-wrap gap-1"
            role="group"
            aria-label="Filter findings by severity"
          >
            {severityFilters.map((item) => (
              <Button
                key={item.value}
                type="button"
                variant={filter === item.value ? "secondary" : "ghost"}
                size="sm"
                aria-pressed={filter === item.value}
                onClick={() => setFilter(item.value)}
                className="h-8 px-2.5 text-xs"
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-border">
          {findings.map((finding, index) => (
            <FindingItem key={`${finding.code}-${index}`} finding={finding} onCopy={onCopy} />
          ))}
          {findings.length === 0 ? (
            <div className="px-5 py-9 text-center">
              <CheckCircle2 className="mx-auto size-6 text-state-ok" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold">No findings in this category</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose another severity to review the rest of this report.
              </p>
            </div>
          ) : null}
          {audit.findings.length === 0 ? (
            <div className="px-5 py-9 text-center">
              <CheckCircle2 className="mx-auto size-6 text-state-ok" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold">No security findings returned</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The passive checks did not report any issues for this audit.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-md border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-base font-bold">Hardening patch bundle</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Configuration suggestions returned for this audit.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!patchText.trim()}
              onClick={() => void onCopy(patchText, "Patch")}
            >
              <Copy className="size-3.5" aria-hidden="true" />
              Copy patch
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!patchText.trim()}
              onClick={() => onDownload(patchText, patchFilename)}
            >
              <ArrowDownToLine className="size-3.5" aria-hidden="true" />
              Download
            </Button>
          </div>
        </div>
        <Tabs
          value={patchTab}
          onValueChange={(value) => {
            if (value === "nginx" || value === "apache" || value === "dns") setPatchTab(value);
          }}
          className="p-4 sm:p-5"
        >
          <TabsList className="h-auto max-w-full flex-wrap justify-start rounded-md bg-muted/70 p-1">
            {tabs.map((item) => (
              <TabsTrigger key={item.value} value={item.value} className="h-8 px-3 text-xs">
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((item) => (
            <TabsContent key={item.value} value={item.value} className="mt-3">
              <PatchCode text={audit.patch_bundle[item.value]} />
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </div>
  );
}

function ModuleStatusCard({
  title,
  icon: Icon,
  summary,
}: {
  title: string;
  icon: LucideIcon;
  summary: ModuleSummary;
}) {
  const statusCopy =
    summary.status === "ok" ? "Passed" : summary.status === "warning" ? "Needs review" : "Error";
  const statusClass =
    summary.status === "ok"
      ? "module-status-ok"
      : summary.status === "warning"
        ? "module-status-warning"
        : "module-status-error";
  return (
    <div className="min-w-0 rounded-sm border border-border bg-background px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold">{title}</span>
        <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className={`mt-1.5 text-xs font-semibold ${statusClass}`}>{statusCopy}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {summary.checks_passed} passed · {summary.checks_failed} failed
      </p>
      {summary.error_message ? (
        <p className="mt-1 break-words text-[11px] text-muted-foreground">
          {summary.error_message}
        </p>
      ) : null}
    </div>
  );
}

function FindingItem({
  finding,
  onCopy,
}: {
  finding: AuditFinding;
  onCopy: (text: string, label: string) => void;
}) {
  const fixes: Array<{ label: string; key: keyof AuditFinding["remediation"] }> = [
    { label: "Nginx", key: "nginx" },
    { label: "Apache", key: "apache" },
    { label: "DNS", key: "dns" },
    { label: "General", key: "general" },
  ];
  return (
    <details className="finding-details px-4 py-4 sm:px-5" open>
      <summary className="flex cursor-pointer list-none items-start gap-3">
        <span className={`severity-badge mt-0.5 ${severityClasses[finding.severity]}`}>
          {finding.severity}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{finding.title}</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {finding.module} · {finding.code}
          </span>
        </span>
        <ChevronDown
          className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform"
          aria-hidden="true"
        />
      </summary>
      <div className="finding-content ml-0 mt-4 space-y-4 sm:ml-[74px]">
        <div className={`impact-copy ${severityClasses[finding.severity]}`}>
          <p className="text-[11px] font-bold uppercase">Business impact</p>
          <p className="mt-1.5 text-sm leading-6 text-foreground">{finding.business_impact}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="metadata-chip">{finding.cwe_id}</span>
          <span className="metadata-chip">{finding.owasp_category}</span>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold">Technical evidence</p>
          <pre className="code-block whitespace-pre-wrap break-words">
            {finding.technical_detail}
          </pre>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold">Suggested fixes</p>
          <div className="space-y-3">
            {fixes.map(({ label, key }) => {
              const snippet = finding.remediation[key];
              if (typeof snippet !== "string" || !snippet.trim()) return null;
              return (
                <div key={key} className="min-w-0">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => void onCopy(snippet, `${label} fix`)}
                    >
                      <Copy className="size-3" aria-hidden="true" />
                      Copy
                    </Button>
                  </div>
                  <PatchCode text={snippet} compact />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </details>
  );
}

function PatchCode({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <pre className={`code-block ${compact ? "code-block-compact" : ""}`}>
      <code>{text.trim() || "No patch content was returned for this configuration."}</code>
    </pre>
  );
}

function moduleDescription(key: AuditModule) {
  const descriptions: Record<AuditModule, string> = {
    tls: "Checks encrypted connections and certificate configuration.",
    headers: "Reviews browser-facing protections on website responses.",
    dns: "Looks at DNS and email domain safeguards.",
    surface: "Checks for commonly exposed public services.",
  };
  return descriptions[key];
}

function scoreClass(score: number) {
  if (score >= 85) return "score-good";
  if (score >= 70) return "score-watch";
  return "score-needs-work";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
