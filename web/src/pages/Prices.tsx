import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import * as api from "../lib/api";

export default function Prices({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const [d, setD] = useState<any>(null);
  useEffect(() => { api.getPrices().then(setD).catch(() => {}); }, []);
  if (!d) return <p className="p-6">{t("common.loading")}</p>;
  return (
    <div className={embedded ? "space-y-4 text-sm" : "space-y-4 p-4 text-sm md:p-8"}>
      <h1 className="text-3xl">{t("prices.title")}</h1>
      <p>{t("prices.intro")} {t("result.asOf")}: {d.as_of?.slice(0, 10)}</p>
      <h2 className="font-bold">Prices</h2>
      {d.prices.map((p: any) => (
        <div key={p.item} className="card"><b>{p.item}</b> ₹{p.price_low}–{p.price_high} {p.unit}
          {p.reuse_prob_high > 0 && <span> · P(reusable) {p.reuse_prob_low}–{p.reuse_prob_high}</span>}
          <p className="text-xs text-mute">{p.source}</p></div>))}
      <h2 className="font-bold">Metal content per board</h2>
      {d.materials.map((m: any) => <div key={m.board_type + m.metal} className="card"><b>{m.board_type} · {m.metal}</b> {m.grams_low}–{m.grams_high} g<p className="text-xs text-mute">{m.source}</p></div>)}
      <h2 className="font-bold">Routes</h2>
      {d.route_params.map((r: any) => <div key={r.route} className="card"><b>{r.route}</b> reuse ×{r.reuse_factor} · metals ×{r.metal_recovery} · cost ₹{r.cost_low}–{r.cost_high}<p className="text-xs text-mute">{r.source}</p></div>)}
      <h2 className="font-bold">Score weights</h2>
      {Object.entries(d.weights).map(([k, w]: any) => <div key={k} className="card"><b>{k}</b> {Object.entries(w).map(([c, v]) => `${c} ${v}`).join(" · ")}</div>)}
    </div>
  );
}
