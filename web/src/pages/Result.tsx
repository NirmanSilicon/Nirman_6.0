import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import BBoxOverlay from "../components/BBoxOverlay";
import Nearby from "../components/Nearby";
import { Dots, Pipeline, inr } from "../components/ui";
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

  const hero = top && r.warning !== "unseen_board";
  return (
    <div className="space-y-5 p-4 md:p-8">
      {r.model.mode === "mock" && <p className="rounded-xl bg-amber/30 p-3 text-sm font-semibold">{t("result.mock")}</p>}
      <Pipeline compact active={5} />

      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        <div className="space-y-5">
          {!hero ? (
            <section className="card border-amber bg-cream">
              <h1 className="text-2xl">{t("result.notSure")}</h1>
              <p className="mt-1">{r.recommendation_i18n[lang]}</p>
              <button className="btn btn-primary mt-3 w-full" onClick={() => nav("/")}>{t("scan.retake")}</button>
            </section>
          ) : (
            <>
              <section className="rounded-3xl bg-orange p-6 text-white">
                <p className="eyebrow !text-white/80">{t("result.value")} · {t("result.range")}</p>
                <h1 className="mt-1 text-5xl md:text-6xl">{inr(top.value_range.low, top.value_range.high)}</h1>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-ink/25 px-3 py-1">{t("result.reuse")} {inr(...top.breakdown.reuse)}</span>
                  <span className="rounded-full bg-ink/25 px-3 py-1">{t("result.metals")} {inr(...top.breakdown.metals)}</span>
                </div>
              </section>

              <section className="space-y-3">
                <p className="eyebrow">{t("result.whatToDo")}</p>
                <div className="flex gap-2" role="tablist">
                  {(["default", "max_profit", "greenest"] as Preset[]).map((p) => (
                    <button key={p} role="tab" aria-selected={p === preset} onClick={() => setPreset(p)}
                      className={`flex-1 rounded-full border px-2 py-1.5 text-xs font-semibold ${p === preset ? "border-ink bg-ink text-cream" : "border-ink/30 bg-white"}`}>
                      {t(`result.preset.${p}`)}</button>))}
                </div>
                <div className="card-dark">
                  <p className="eyebrow !text-orange">#1 · {t(`routes.${top.route}`)}</p>
                  <p className="mt-1 text-lg font-semibold leading-snug">{top.reason[lang]}</p>
                  {top.authorised_only && <p className="mt-2 text-sm text-cream/70">🛡 {t("result.authorisedOnly")}. {t("result.unsafe")}</p>}
                </div>
                <ul className="space-y-2">
                  {routes.map((rt, i) => (
                    <li key={rt.route} className={`card ${rt.eligible ? "" : "opacity-50"}`}>
                      <div className="flex items-baseline justify-between">
                        <b className="display text-lg uppercase">{i + 1} · {t(`routes.${rt.route}`)}</b>
                        <span className="text-xs text-mute">{rt.eligible ? `${t("crit.score")} ${rt.score.toFixed(2)} · ${inr(rt.value_range.low, rt.value_range.high)}` : t("result.notEligible")}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
                        {(["value", "cost", "energy", "co2"] as const).map((c) => <Dots key={c} n={rt[c]} label={t(`crit.${c}`)} />)}
                      </div>
                    </li>))}
                </ul>
                <p className="text-xs text-mute">● {t("crit.moreBetter")}</p>
              </section>
            </>
          )}

          <section className="space-y-2">
            <p className="eyebrow">{t("result.whereToGo")}</p>
            {hero && <Link to={`/map?scan=${r.scan_id}`} className="card-dark block">
              <p className="eyebrow !text-orange">{t("result.nextStep")}</p>
              <p className="mt-1 text-lg font-semibold">{t("result.nextText")}</p>
              <span className="btn btn-accent mt-3 inline-block">{t("result.openMap")} →</span></Link>}
            <Nearby />
          </section>
        </div>

        <section className="space-y-3">
          <p className="eyebrow">{t("result.details")}</p>
          <BBoxOverlay r={r} />
          <p className="text-sm">{t("result.boardConf")}: <b>{pct}%</b>{r.board.type ? ` · ${r.board.type}` : ""}</p>
          {r.components.length > 0 && (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-mute"><th className="font-semibold">{t("result.components")}</th><th>{t("result.count")}</th><th>{t("result.conf")}</th></tr></thead>
              <tbody>{r.components.map((c) => (
                <tr key={c.class} className="border-t border-line">
                  <td className="py-1.5">{cls(c.class)}{c.reusable && <span className="ml-1 text-xs text-ember">♻ {t("result.reusable")}</span>}</td>
                  <td>{c.count}</td><td>{Math.round(c.avg_conf * 100)}%</td></tr>))}</tbody>
            </table>)}
          {r.trace && (
            <details className="card text-sm">
              <summary className="cursor-pointer font-semibold">{t("result.how")}</summary>
              <div className="mt-2 space-y-2">
                {r.trace.reuse.map((x) => (
                  <p key={x.class}>{x.count} × {cls(x.class)} × ₹{x.price[0]}–{x.price[1]} × {x.reuse_prob[0]}–{x.reuse_prob[1]} = <b>₹{x.subtotal[0]}–{x.subtotal[1]}</b><br /><span className="text-xs text-mute">{x.source}</span></p>))}
                {r.trace.metals.map((x) => (
                  <p key={x.metal}>{x.metal}: {x.grams[0]}–{x.grams[1]} g × ₹{x.price[0]}–{x.price[1]}/g × {Math.round(x.recovery * 100)}% = <b>₹{x.subtotal[0]}–{x.subtotal[1]}</b></p>))}
              </div>
            </details>)}
          <p className="text-xs text-mute">{t("result.asOf")}: {r.prices_as_of?.slice(0, 10)} · {r.disclaimer}</p>
          <div className="flex gap-2 pb-4">
            <button className="btn btn-primary flex-1" onClick={share}>{t("result.share")}</button>
            <a className="btn btn-ghost flex-1 text-center" href={api.reportUrl(r.scan_id, "pdf")} target="_blank" rel="noreferrer">PDF</a>
            <a className="btn btn-ghost flex-1 text-center" href={api.recordUrl(r.scan_id)} target="_blank" rel="noreferrer" title={t("result.recordHint")}>EPR/DPP</a>
            <button className="btn btn-ghost" onClick={remove} aria-label={t("result.delete")}>🗑</button>
          </div>
        </section>
      </div>
    </div>
  );
}
