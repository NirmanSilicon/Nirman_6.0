"use client";
import { useState } from "react";

type DemoResult = {
  runs: Record<string, { inbox_count: number; output: { verdict: string }; timeline: { decision: { verdict: string; rule_id: string } | null; proposal: { tool: string } }[] }>;
};
export default function Demo() {
  const [scenario, setScenario] = useState("incident");
  const [result, setResult] = useState<DemoResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run() {
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/evaluation/compare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoice_id: "invoice-001", fixture: scenario }) });
      if (!response.ok) throw new Error("Evaluation service unavailable. Start the presentation services.");
      setResult(await response.json());
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Request failed"); }
    finally { setBusy(false); }
  }
  const decision = result?.runs.ENFORCE.timeline.at(-1)?.decision;
  return <div className="demo"><div className="demo-tabs">{[["benign", "Benign invoice"], ["incident", "Simulated incident"]].map(([value, label]) => <button key={value} className={value === scenario ? "chosen" : ""} onClick={() => { setScenario(value); setResult(null); }}>{label}</button>)}</div><div className="terminal"><span className="dim">task_contract: extract_invoice</span><br /><b>{scenario === "incident" ? "send_mock_attachment(invoice-001)" : "read_invoice(invoice-001)"}</b><br /><span className="dim">same proposal · fresh local state</span><div style={{ marginTop: 20 }}><button className="button primary" onClick={run} disabled={busy}>{busy ? "Evaluating…" : "Run real policy check ↗"}</button></div>{decision && <><div className={`verdict ${decision.verdict.toLowerCase()}`}>{decision.verdict}</div><p>{decision.rule_id}</p><div className="trace">Off inbox: {result?.runs.OFF.inbox_count} · Enforce inbox: {result?.runs.ENFORCE.inbox_count} · Output: {result?.runs.ENFORCE.output.verdict}</div></>}{error && <p role="alert">{error}</p>}<p><a href="/evaluation" style={{ textDecoration: "underline" }}>Open the full evaluation studio ↗</a></p><span className="dim" style={{ fontSize: 10 }}>Deterministic replay over local mock tools. No real transfer.</span></div></div>;
}
