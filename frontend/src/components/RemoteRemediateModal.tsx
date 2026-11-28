import React, { useMemo, useState } from "react";
import {
    applyRemoteRemediation,
    type RemediateResponse,
    type ScanResponse,
} from "../lib/api";

interface PatchOption {
    id: string;
    label: string;
    codes: string[];
}

const AGENT_PATCH_CATALOG: PatchOption[] = [
    { id: "block_dotenv", label: "Block public access to /.env and sensitive dotfiles", codes: ["EXPOSED_SENSITIVE_FILE"] },
    { id: "hsts", label: "Enable Strict-Transport-Security (HSTS)", codes: ["MISSING_HSTS", "WEAK_HSTS"] },
    { id: "csp", label: "Deploy Content-Security-Policy (CSP)", codes: ["MISSING_CSP"] },
    {
        id: "security_headers",
        label: "Enable X-Frame-Options, X-Content-Type-Options & Referrer-Policy",
        codes: ["MISSING_X_FRAME_OPTIONS", "MISSING_X_CONTENT_TYPE_OPTIONS", "MISSING_REFERRER_POLICY"],
    },
    { id: "secure_cookies", label: "Harden cookies with HttpOnly, Secure & SameSite", codes: ["INSECURE_COOKIE"] },
    { id: "hide_banner", label: "Suppress Server / X-Powered-By version headers", codes: ["SERVER_BANNER_LEAK"] },
    { id: "fix_html", label: "Upgrade plaintext HTML form & remove mixed-content script", codes: ["INSECURE_FORM_ACTION", "MIXED_CONTENT_ACTIVE"] },
];

interface Props {
    scan: ScanResponse;
    onClose: () => void;
    onSuccess: (response: RemediateResponse, agentKeyUsed: string) => void;
}

export const RemoteRemediateModal: React.FC<Props> = ({ scan, onClose, onSuccess }) => {
    const failedCodes = useMemo(() => new Set(scan.findings.map((f) => f.code)), [scan.findings]);

    const initialSelected = useMemo(() => {
        const matched = AGENT_PATCH_CATALOG.filter((p) =>
            p.codes.some((c) => failedCodes.has(c))
        ).map((p) => p.id);
        return matched.length > 0 ? matched : AGENT_PATCH_CATALOG.map((p) => p.id);
    }, [failedCodes]);

    const manualOnlyFindings = useMemo(
        () => scan.findings.filter((f) => f.module === "dns" || f.module === "tls"),
        [scan.findings]
    );

    const [selectedPatches, setSelectedPatches] = useState<string[]>(initialSelected);
    const [agentKey, setAgentKey] = useState("cg-demo-sharma-2026");
    const [approvedBy, setApprovedBy] = useState("Enterprise Owner");
    const [approved, setApproved] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const togglePatch = (id: string) => {
        setSelectedPatches((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!approved || selectedPatches.length === 0) return;
        setSubmitting(true);
        setError(null);
        try {
            const response = await applyRemoteRemediation({
                url: scan.normalized_url,
                agent_key: agentKey.trim(),
                approved: true,
                patches: selectedPatches,
                approved_by: approvedBy.trim() || "Enterprise Owner",
                before_score: scan.score,
            });
            onSuccess(response, agentKey.trim());
        } catch (err) {
            setError(err instanceof Error ? err.message : "Remote remediation failed.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                        <span className="inline-block rounded bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">
                            Human-in-the-Loop Remote Patching
                        </span>
                        <h3 className="mt-1.5 text-lg font-bold text-slate-900">
                            Authorize CyberGuard Agent on {scan.domain}
                        </h3>
                        <p className="text-xs text-slate-600">
                            Select the server-side controls to patch via the installed CyberGuard Agent, then verify ownership with your Scoped Agent Key.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md px-2.5 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100"
                    >
                        Close
                    </button>
                </div>

                <form onSubmit={handleApply} className="mt-4 space-y-5">
                    <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
                            1. Remotely Fixable Server Controls ({selectedPatches.length} selected)
                        </div>
                        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            {AGENT_PATCH_CATALOG.map((item) => {
                                const detected = item.codes.some((c) => failedCodes.has(c));
                                return (
                                    <label
                                        key={item.id}
                                        className="flex cursor-pointer items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm shadow-2xs"
                                    >
                                        <span className="flex items-center gap-2.5">
                                            <input
                                                type="checkbox"
                                                checked={selectedPatches.includes(item.id)}
                                                onChange={() => togglePatch(item.id)}
                                                className="h-4 w-4 rounded border-slate-300"
                                            />
                                            <span className="text-slate-800">{item.label}</span>
                                        </span>
                                        {detected && (
                                            <span className="rounded bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                                                Detected
                                            </span>
                                        )}
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {manualOnlyFindings.length > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5">
                            <div className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                                2. Registrar / TLS Controls (Manual — Outside Web Server Agent Scope)
                            </div>
                            <p className="mt-1 text-xs text-amber-800">
                                DNS records (SPF, DMARC, CAA) and TLS certificates must be updated at your domain registrar or DNS provider. Use the generated DNS patch tab after remote server hardening completes:
                            </p>
                            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-amber-900">
                                {manualOnlyFindings.map((f) => (
                                    <li key={f.code}>
                                        <strong>{f.code}</strong>: {f.title}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">
                                Scoped CyberGuard Agent Key
                            </label>
                            <input
                                type="password"
                                required
                                value={agentKey}
                                onChange={(e) => setAgentKey(e.target.value)}
                                placeholder="Enter target agent secret key"
                                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">
                                Approving Operator Name (Audit Log)
                            </label>
                            <input
                                type="text"
                                value={approvedBy}
                                onChange={(e) => setApprovedBy(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                            />
                        </div>
                    </div>

                    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                        <input
                            type="checkbox"
                            checked={approved}
                            onChange={(e) => setApproved(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300"
                        />
                        <span>
                            I am the authorized owner/administrator of <strong>{scan.domain}</strong> and grant explicit permission for CyberGuard to push the selected configuration patches via the authenticated Remediation Agent and run an immediate verification re-scan.
                        </span>
                    </label>

                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800">
                            {error}
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !approved || selectedPatches.length === 0 || !agentKey.trim()}
                            className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                        >
                            {submitting ? "Patching & Re-Scanning..." : "Approve, Apply & Verify"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};