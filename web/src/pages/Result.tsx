import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import BBoxOverlay from "../components/BBoxOverlay";
import Nearby from "../components/Nearby";
import { Dots, inr } from "../components/ui";
import * as api from "../lib/api";
import * as store from "../lib/store";
import type { Preset, ScanResult } from "../types";

export default function Result() {
  const { id = "" } = useParams();
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const [r, setR] = useState<ScanResult | null>(store.history().find((x) => x.scan_id === id) ?? null);
  const [preset, setPreset] = useState<Preset>("default");
  const [err, setErr] = useState(false);
  useEffect(() => { if (!r) api.getScan(id).then(setR).catch(() => setErr(true)); }, [id, r]);
  const lang = i18n.language === "hi" ? "hi" : "en";
  const routes = r?.routes_by_preset?.[preset] ?? [];
  const top = routes[0];
  const cls = (c: string) => t(`cls.${c}`, c);

  const share = async () => {
    if (!r) return;
    const res = await fetch(api.reportUrl(r.scan_id, "png"));
    const file = new File([await res.blob()], `ouroboros-${r.scan_id}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "Ouroboros" }).catch(() => {});
    else window.open(api.reportUrl(r.scan_id, "png"), "_blank");
  };
  const remove = async () => {
    if (!r || !confirm(t("result.confirmDelete"))) return;
    await api.deleteScan(r.scan_id).catch(() => {});
    await store.removeLocal(r.scan_id); nav("/history");
  };
  const pct = useMemo(() => (r ? Math.round(r.board.confidence * 100) : 0), [r]);

  if (err) return <p className="p-6">{t("history.empty")}</p>;
  if (!r) return <p className="p-6">{t("common.loading")}</p>;

  return (
    <div className="space-y-5 p-4">
      {r.model.mode === "mock" && <p className="rounded-xl bg-amber-100 p-3 text-sm font-semibold text-amber-900">{t("result.mock")}</p>}

      {r.warning === "unseen_board" || !top ? (
        <section className="card border-amber-300 bg-amber-50">
          <h1 className="text-xl font-bold">{t("result.notSure")}</h1>
          <p className="mt-1">{r.recommendation_i18n[lang]}</p>
          <button className="btn btn-primary mt-3 w-full" onClick={() => nav("/")}>{t("scan.retake")}</button>
        </section>
      ) : (
        <>
          <section className="text-center">
            <p className="text-sm text-zinc-500">{t("result.value")} · {t("result.range")}</p>
            <h1 className="text-5xl font-extrabold text-green-900">{inr(top.value_range.low, top.value_range.high)}</h1>
            <p className="mt-1 text-sm text-zinc-600">
              {t("result.reuse")} {inr(...top.breakdown.reuse)} · {t("result.metals")} {inr(...top.breakdown.metals)}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-bold">{t("result.whatToDo")}</h2>
            <div className="flex gap-2" role="tablist">
              {(["default", "max_profit", "greenest"] as Preset[]).map((p) => (
                <button key={p} role="tab" aria-selected={p === preset} onClick={() => setPreset(p)}
                  className={`flex-1 rounded-full border px-2 py-1.5 text-sm font-semibold ${p === preset ? "border-green-800 bg-green-800 text-white" : "border-zinc-300 bg-white"}`}>
                  {t(`result.preset.${p}`)}</button>))}
            </div>
            <div className="card border-green-700 bg-green-50">
              <p className="text-xs font-bold uppercase text-green-800">#1 {t(`routes.${top.route}`)}</p>
              <p className="mt-1 text-lg font-semibold">{top.reason[lang]}</p>
              {top.authorised_only && <p className="mt-1 text-sm text-zinc-700">🛡 {t("result.authorisedOnly")}. {t("result.unsafe")}</p>}
            </div>
            <ul className="space-y-2">
              {routes.map((rt, i) => (
                <li key={rt.route} className={`card ${rt.eligible ? "" : "opacity-60"}`}>
                  <div className="flex items-baseline justify-between">
                    <b>{i + 1}. {t(`routes.${rt.route}`)}</b>
                    <span className="text-sm">{rt.eligible ? `${t("crit.score")} ${rt.score.toFixed(2)}` : t("result.notEligible")}</span>
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-x-2">
                    {(["value", "cost", "energy", "co2"] as const).map((c) => <Dots key={c} n={rt[c]} label={t(`crit.${c}`)} />)}
                  </div>
                  {rt.eligible && <p className="mt-1 text-xs text-zinc-500">{inr(rt.value_range.low, rt.value_range.high)}</p>}
                </li>))}
            </ul>
            <p className="text-xs text-zinc-500">● {t("crit.moreBetter")}</p>
          </section>
        </>
      )}

      <section className="space-y-2">
        <h2 className="font-bold">{t("result.whereToGo")}</h2>
        <Nearby />
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">{t("result.details")}</h2>
        <BBoxOverlay r={r} />
        <p className="text-sm">{t("result.boardConf")}: <b>{pct}%</b>{r.board.type ? ` · ${r.board.type}` : ""}</p>
        {r.components.length > 0 && (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-zinc-500"><th>{t("result.components")}</th><th>{t("result.count")}</th><th>{t("result.conf")}</th></tr></thead>
            <tbody>{r.components.map((c) => (
              <tr key={c.class} className="border-t border-zinc-200">
                <td className="py-1">{cls(c.class)}{c.reusable && <span className="ml-1 text-xs text-green-800">♻ {t("result.reusable")}</span>}</td>
                <td>{c.count}</td><td>{Math.round(c.avg_conf * 100)}%</td></tr>))}</tbody>
          </table>)}
        {r.trace && (
          <details className="card text-sm">
            <summary className="cursor-pointer font-semibold">{t("result.how")}</summary>
            <div className="mt-2 space-y-2">
              {r.trace.reuse.map((x) => (
                <p key={x.class}>{x.count} × {cls(x.class)} × ₹{x.price[0]}–{x.price[1]} × {x.reuse_prob[0]}–{x.reuse_prob[1]} = <b>₹{x.subtotal[0]}–{x.subtotal[1]}</b><br /><span className="text-xs text-zinc-500">{x.source}</span></p>))}
              {r.trace.metals.map((x) => (
                <p key={x.metal}>{x.metal}: {x.grams[0]}–{x.grams[1]} g × ₹{x.price[0]}–{x.price[1]}/g × {Math.round(x.recovery * 100)}% = <b>₹{x.subtotal[0]}–{x.subtotal[1]}</b></p>))}
            </div>
          </details>)}
        <p className="text-xs text-zinc-500">{t("result.asOf")}: {r.prices_as_of?.slice(0, 10)} · {r.disclaimer}</p>
      </section>

      <div className="flex gap-2 pb-4">
        <button className="btn btn-primary flex-1" onClick={share}>{t("result.share")}</button>
        <a className="btn btn-ghost flex-1 text-center" href={api.reportUrl(r.scan_id, "pdf")} target="_blank" rel="noreferrer">PDF</a>
        <button className="btn btn-ghost" onClick={remove} aria-label={t("result.delete")}>🗑</button>
      </div>
    </div>
  );
}
