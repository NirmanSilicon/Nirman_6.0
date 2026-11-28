import React, { useState } from "react";
import { checkCitizenLink, type LinkCheckResponse } from "../lib/api";

const DEMO_SAMPLES = [
    { label: "SBI Lookalike (SBl)", url: "https://SBl.co.in/login" },
    { label: "Fake KYC Link", url: "https://onlinesbl.com/kyc-verify" },
    { label: "Cyrillic Punycode", url: "https://xn--pple-43d.com" },
    { label: "Self-Defense (SSRF)", url: "http://169.254.169.254/latest/meta-data/" },
    { label: "Self-Defense (XSS)", url: "javascript:alert(1)" },
    { label: "Official SBI", url: "https://onlinesbi.sbi" },
];

const VERDICT_STYLES: Record<
    LinkCheckResponse["verdict"],
    { border: string; bg: string; badge: string; label: string }
> = {
    SAFE: {
        border: "border-emerald-300",
        bg: "bg-emerald-50",
        badge: "bg-emerald-600 text-white",
        label: "SAFE TO OPEN",
    },
    SUSPICIOUS: {
        border: "border-amber-300",
        bg: "bg-amber-50",
        badge: "bg-amber-600 text-white",
        label: "SUSPICIOUS — VERIFY FIRST",
    },
    DANGEROUS: {
        border: "border-red-300",
        bg: "bg-red-50",
        badge: "bg-red-600 text-white",
        label: "DANGEROUS — SCAM / PHISHING",
    },
    BLOCKED: {
        border: "border-slate-800",
        bg: "bg-slate-900 text-slate-100",
        badge: "bg-rose-600 text-white",
        label: "INPUT REJECTED — SELF-DEFENSE ACTIVE",
    },
};

interface CitizenLinkShieldProps {
    variant?: "citizen" | "enterprise";
}

export const CitizenLinkShield: React.FC<CitizenLinkShieldProps> = ({ variant = "citizen" }) => {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<LinkCheckResponse | null>(null);

    const runCheck = async (targetUrl: string) => {
        const trimmed = targetUrl.trim();
        if (!trimmed) return;
        setLoading(true);
        setError(null);
        try {
            const data = await checkCitizenLink(trimmed);
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not verify link.");
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        runCheck(url);
    };

    const style = result ? VERDICT_STYLES[result.verdict] : null;
    const isBlocked = result?.verdict === "BLOCKED";

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4">
                    <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {variant === "enterprise"
                            ? "Quick Link Checker"
                            : "Zero-Touch Citizen Protection"}
                    </span>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900">
                        Verify Any Suspicious Link Before Clicking
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                        Paste a banking, UPI, KYC, or email link. CyberGuard inspects homoglyphs
                        (like <code className="rounded bg-slate-100 px-1">SBl</code> vs{" "}
                        <code className="rounded bg-slate-100 px-1">SBI</code>), Punycode spoofs,
                        and malicious payloads statically without ever opening the webpage.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Paste link here (e.g., https://SBl.co.in/login)"
                        className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                    <button
                        type="submit"
                        disabled={loading || !url.trim()}
                        className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                    >
                        {loading ? "Checking..." : "Verify Link"}
                    </button>
                </form>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">Quick test samples:</span>
                    {DEMO_SAMPLES.map((sample) => (
                        <button
                            key={sample.label}
                            type="button"
                            onClick={() => {
                                setUrl(sample.url);
                                runCheck(sample.url);
                            }}
                            className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                            {sample.label}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        {error}
                    </div>
                )}
            </div>

            {result && style && (
                <div className={`rounded-xl border-2 p-6 shadow-sm ${style.border} ${style.bg}`}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-2">
                            <span className={`inline-block rounded-md px-3 py-1 text-xs font-bold tracking-wide ${style.badge}`}>
                                {style.label}
                            </span>
                            <p className={`text-base font-semibold ${isBlocked ? "text-white" : "text-slate-900"}`}>
                                {result.summary}
                            </p>
                            {result.normalized_host && (
                                <div className={`text-xs ${isBlocked ? "text-slate-300" : "text-slate-600"}`}>
                                    Analyzed host:{" "}
                                    <code className="rounded bg-black/10 px-1.5 py-0.5 font-mono">
                                        {result.normalized_host}
                                    </code>
                                    {result.decoded_host && result.decoded_host !== result.normalized_host && (
                                        <span className="ml-2">
                                            Decoded Unicode:{" "}
                                            <code className="rounded bg-red-200/70 px-1.5 py-0.5 font-mono text-red-900">
                                                {result.decoded_host}
                                            </code>
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="text-right">
                            <div className={`text-xs font-medium uppercase ${isBlocked ? "text-slate-400" : "text-slate-500"}`}>
                                Risk Score
                            </div>
                            <div className={`text-3xl font-extrabold ${isBlocked ? "text-rose-400" : "text-slate-900"}`}>
                                {result.risk_score}
                                <span className="text-base font-normal opacity-70">/100</span>
                            </div>
                        </div>
                    </div>

                    {result.matched_brand && result.official_domain && (
                        <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4 text-slate-900">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Brand Verification
                            </div>
                            <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                                <span>
                                    Target brand: <strong>{result.matched_brand}</strong>
                                </span>
                                <span>
                                    Official verified domain:{" "}
                                    <code className="rounded bg-emerald-100 px-2 py-0.5 font-mono font-semibold text-emerald-900">
                                        https://{result.official_domain}
                                    </code>
                                </span>
                            </div>
                        </div>
                    )}

                    {result.character_diffs.length > 0 && (
                        <div className="mt-4 rounded-lg border border-red-200 bg-white p-4 text-slate-900">
                            <div className="text-xs font-semibold uppercase tracking-wide text-red-700">
                                Deceptive Character Substitution Detected
                            </div>
                            <div className="mt-2 space-y-2">
                                {result.character_diffs.map((diff, i) => (
                                    <div
                                        key={`${diff.position}-${i}`}
                                        className="flex flex-wrap items-center gap-3 rounded-md bg-red-50 px-3 py-2 text-sm"
                                    >
                                        <span className="font-mono text-xs text-slate-500">Pos #{diff.position + 1}</span>
                                        <span className="rounded bg-red-600 px-2 py-0.5 font-mono font-bold text-white">
                                            Typed: &quot;{diff.typed_char}&quot;
                                        </span>
                                        <span className="text-slate-400">vs</span>
                                        <span className="rounded bg-emerald-600 px-2 py-0.5 font-mono font-bold text-white">
                                            Official: &quot;{diff.expected_char}&quot;
                                        </span>
                                        <span className="text-slate-700">{diff.explanation}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {result.live_telemetry && (
                        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-slate-900">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Live Intelligence Telemetry
                            </div>
                            <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
                                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                        DNS Status
                                    </div>
                                    <div
                                        className={`mt-1 text-sm font-semibold ${
                                            result.live_telemetry.dns_resolved === true
                                                ? "text-emerald-700"
                                                : result.live_telemetry.dns_resolved === false
                                                  ? "text-red-700"
                                                  : "text-slate-600"
                                        }`}
                                    >
                                        {result.live_telemetry.dns_resolved === true
                                            ? "Resolved"
                                            : result.live_telemetry.dns_resolved === false
                                              ? "Unresolved"
                                              : "Unavailable"}
                                    </div>
                                </div>

                                <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
                                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                        Domain Age (RDAP)
                                    </div>
                                    <div className="mt-1 text-sm font-semibold text-slate-900">
                                        {result.live_telemetry.domain_age_days !== null &&
                                        result.live_telemetry.domain_age_days !== undefined
                                            ? result.live_telemetry.registered_on
                                                ? `${result.live_telemetry.domain_age_days} days (since ${result.live_telemetry.registered_on})`
                                                : `${result.live_telemetry.domain_age_days} days`
                                            : "Unavailable"}
                                    </div>
                                </div>

                                <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
                                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                        TLS Certificate
                                    </div>
                                    <div
                                        className={`mt-1 break-words text-sm font-semibold ${
                                            result.live_telemetry.tls_valid === true
                                                ? "text-emerald-700"
                                                : result.live_telemetry.tls_valid === false
                                                  ? "text-red-700"
                                                  : "text-amber-700"
                                        }`}
                                    >
                                        {result.live_telemetry.tls_valid === true
                                            ? result.live_telemetry.tls_issuer
                                                ? `Valid — ${result.live_telemetry.tls_issuer}`
                                                : "Valid"
                                            : result.live_telemetry.tls_valid === false
                                              ? "Invalid"
                                              : "No HTTPS"}
                                    </div>
                                </div>
                            </div>

                            {result.live_telemetry.redirect_chain.length > 1 && (
                                <div className="mt-3 rounded-md border border-slate-100 bg-slate-50 p-3">
                                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                        Redirect Path ({result.live_telemetry.redirect_chain.length} hops)
                                    </div>
                                    <ol className="mt-1.5 space-y-1 text-xs text-slate-700">
                                        {result.live_telemetry.redirect_chain.map((hop, idx) => (
                                            <li key={`${hop}-${idx}`} className="flex items-start gap-2 break-all">
                                                <span className="shrink-0 font-mono text-[11px] font-semibold text-slate-400">
                                                    {idx + 1}.
                                                </span>
                                                <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-800">
                                                    {hop}
                                                </code>
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            )}
                        </div>
                    )}

                    {result.signals.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <div
                                className={`text-xs font-semibold uppercase tracking-wide ${isBlocked ? "text-slate-300" : "text-slate-600"
                                    }`}
                            >
                                Detection Signals ({result.signals.length})
                            </div>
                            {result.signals.map((sig) => (
                                <div
                                    key={sig.code}
                                    className="rounded-lg border border-slate-200 bg-white p-3.5 text-slate-900"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-semibold">{sig.title}</span>
                                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                                            {sig.severity}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-600">{sig.detail}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {result.recommendations && result.recommendations.length > 0 && (
                        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-slate-900">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Recommended Action
                            </div>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-700">
                                {result.recommendations.map((rec, idx) => (
                                    <li key={idx}>{rec}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};