import { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import { useTranslation } from "react-i18next";
import { inr, Pipeline } from "../components/ui";
import * as api from "../lib/api";
import { useImpact } from "../lib/impact";
import How from "./How";
import Prices from "./Prices";

type Tab = "how" | "model" | "under";

const STREAMS = [
  { k: "free", phase: "now" }, { k: "saas", phase: "P2" }, { k: "epr", phase: "P3" }, { k: "market", phase: "P3" }, { k: "data", phase: "P4" },
];

function Model() {
  const { t } = useTranslation();
  const imp = useImpact();
  const avg = imp && imp.stats.scans ? Math.round((imp.stats.value_low + imp.stats.value_high) / 2 / imp.stats.scans) : 400;
  const [boards, setBoards] = useState(1000);
  const [take, setTake] = useState(3);
  const gmv = boards * avg, rev = gmv * take / 100;
  return (
    <div className="space-y-8">
      <section>
        <p className="eyebrow">{t("bm.eyebrow")}</p><h1 className="text-4xl md:text-5xl">{t("bm.title")}</h1><p className="mt-2 max-w-2xl text-mute">{t("bm.lead")}</p>
      </section>

      <section>
        <p className="eyebrow mb-3">01 · {t("bm.flow")}</p>
        <div className="grid items-stretch gap-3 md:grid-cols-4">
          {["users", "platform", "recyclers", "producers"].map((k, i) => (
            <div key={k} className="relative">
              <div className={`h-full rounded-2xl border p-4 ${k === "platform" ? "border-orange bg-ink text-cream" : "border-line bg-white"}`}>
                <p className="display text-lg uppercase text-orange">{t(`bm.actor.${k}.t`)}</p><p className="mt-1 text-sm opacity-80">{t(`bm.actor.${k}.d`)}</p>
                <p className="mt-2 text-xs font-semibold">{t(`bm.actor.${k}.pays`)}</p>
              </div>
              {i < 3 && <span className="absolute -bottom-3 left-1/2 z-10 -translate-x-1/2 text-orange md:-right-3 md:bottom-auto md:left-auto md:top-1/2 md:-translate-y-1/2 md:translate-x-0"><Icon name="arrow" size={16} /></span>}
            </div>))}
        </div>
      </section>

      <section>
        <p className="eyebrow mb-3">02 · {t("bm.streams")}</p>
        <div className="card divide-y divide-line !p-0">
          {STREAMS.map((s) => (
            <div key={s.k} className="flex items-start gap-3 p-3">
              <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${s.phase === "now" ? "bg-orange text-white" : "bg-cream text-ember"}`}>{s.phase === "now" ? t("bm.live") : s.phase}</span>
              <div><p className="font-semibold">{t(`bm.stream.${s.k}.t`)} <span className="font-normal text-mute">· {t(`bm.stream.${s.k}.who`)}</span></p><p className="text-sm text-mute">{t(`bm.stream.${s.k}.d`)}</p></div>
            </div>))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-4">
          <p className="eyebrow">03 · {t("bm.calc")}</p>
          <label className="block text-sm font-semibold">{t("bm.boards")}: <b className="text-ember">{boards.toLocaleString("en-IN")}</b>
            <input type="range" min={100} max={20000} step={100} value={boards} onChange={(e) => setBoards(+e.target.value)} className="mt-1 w-full accent-orange" /></label>
          <label className="block text-sm font-semibold">{t("bm.take")}: <b className="text-ember">{take}%</b>
            <input type="range" min={2} max={5} step={0.5} value={take} onChange={(e) => setTake(+e.target.value)} className="mt-1 w-full accent-orange" /></label>
          <p className="text-xs text-mute">{t("bm.avg")}: <b>₹{avg}</b> {imp?.stats.scans ? t("bm.fromScans", { n: imp.stats.scans }) : t("bm.placeholder")}</p>
        </div>
        <div className="card-dark flex flex-col justify-center">
          <p className="text-sm text-cream/70">{t("bm.gmv")}</p><p className="display text-3xl">{inr(gmv, gmv)}</p>
          <p className="mt-3 text-sm text-cream/70">{t("bm.rev")}</p><p className="display text-5xl text-orange">₹{Math.round(rev).toLocaleString("en-IN")}</p>
          <p className="mt-3 text-xs text-cream/60">{t("bm.caveat")}</p>
        </div>
      </section>
    </div>
  );
}

function Under() {
  const { t } = useTranslation();
  const [sys, setSys] = useState<any>(null);
  useEffect(() => { api.getSystem().then(setSys).catch(() => {}); }, []);
  const inf = sys?.inference;
  const w = inf?.weights ?? {};
  const rows = useMemo(() => [["ouroboros_pcb_classifier.pt", w["ouroboros_pcb_classifier.pt"]], ["detector.pt", w["detector.pt"]], ["board_classifier.pt", w["board_classifier.pt"]], ["classes.json", w["classes.json"]]], [w]);
  return (
    <div className="space-y-8">
      <section><p className="eyebrow">{t("under.eyebrow")}</p><h1 className="text-4xl">{t("under.title")}</h1><p className="mt-2 max-w-2xl text-mute">{t("under.lead")}</p></section>
      <Pipeline />
      <section className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <p className="eyebrow">{t("under.model")}</p>
          <p className="mt-2 flex items-center gap-2"><span className={`h-3 w-3 rounded-full ${inf?.reachable ? "bg-orange" : "bg-ink/30"}`} />
            <b>{inf?.reachable ? `${t("under.service")}: ${inf.mode}` : t("under.down")}</b></p>
          {inf?.test_metrics && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">{[["mAP", inf.test_metrics.mAP], ["micro-F1", inf.test_metrics.micro_F1], ["precision", inf.test_metrics.micro_precision]].map(([k, v]) => (
              <div key={String(k)} className="rounded-xl bg-cream p-2"><b className="display text-xl text-ember">{Number(v).toFixed(2)}</b><p className="text-[11px] text-mute">test {k}</p></div>))}</div>)}
          {inf?.kind === "presence" && <p className="mt-2 text-xs text-mute">{t("result.presenceNote")}</p>}
          {inf?.mode === "mock" && <p className="mt-1 text-sm text-mute">{t("under.mockNote")}</p>}
          <ul className="mt-3 space-y-1 text-sm">{rows.map(([f, ok]) => <li key={String(f)}>models/{f}: <span className={ok ? "font-semibold text-ember" : "text-mute"}>{ok ? "present" : "not added"}</span></li>)}</ul>
        </div>
        <div className="card">
          <p className="eyebrow">{t("under.plug")}</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-mute"><li>{t("under.s1")}</li><li>{t("under.s2")}</li><li>{t("under.s3")}</li></ol>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-ink p-3 text-xs text-cream">INFERENCE_MODE=yolo INSTALL_ML=1 \{"\n"}docker compose up -d --build inference</pre>
        </div>
      </section>
      <section className="card"><p className="eyebrow">{t("under.registry")}</p><p className="mt-1 text-sm text-mute">{t("under.registryText")}</p>
        <a className="mt-2 inline-block text-sm font-semibold text-ember" href="/v1/docs" onClick={(e) => { e.preventDefault(); window.open("/docs", "_blank"); }}>API docs </a></section>
      <Prices embedded />
    </div>
  );
}

export default function About() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("how");
  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="inline-flex rounded-full bg-cream p-1" role="tablist">
        {(["how", "model", "under"] as Tab[]).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === k ? "bg-ink text-cream" : "text-ink/70"}`}>{t(`about.${k}`)}</button>))}
      </div>
      {tab === "how" ? <How /> : tab === "model" ? <Model /> : <Under />}
    </div>
  );
}
