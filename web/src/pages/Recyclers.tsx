import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RecyclerCard } from "../components/Nearby";
import RecyclerMap from "../components/RecyclerMap";
import * as api from "../lib/api";
import * as store from "../lib/store";
import type { Recycler } from "../types";

const BHUBANESWAR = { lat: 20.2961, lng: 85.8245 };

export default function Recyclers() {
  const { t } = useTranslation();
  const [pos, setPos] = useState(store.cachedPos());
  const [state, setState] = useState("");
  const [states, setStates] = useState<string[]>([]);
  const [items, setItems] = useState<Recycler[]>([]);
  const center = pos ?? BHUBANESWAR;
  useEffect(() => {
    api.getRecyclers(center.lat, center.lng, 3000, "", 200).then((r) => setStates([...new Set(r.items.map((x) => x.state))].sort())).catch(() => {});
  }, [center.lat, center.lng]);
  useEffect(() => {
    api.getRecyclers(center.lat, center.lng, state ? 3000 : 300, state, 50).then((r) => setItems(r.items)).catch(() => {});
  }, [center.lat, center.lng, state]);
  return (
    <div className="space-y-3 p-4 md:p-8">
      <p className="eyebrow">{t("rec.eyebrow")}</p>
      <h1 className="text-3xl">{t("rec.title")}</h1>
      <p className="max-w-2xl text-sm text-mute">{t("rec.note")}</p>
      <div className="flex flex-wrap gap-2">
        {!pos && <button className="btn btn-ghost" onClick={() => store.locate().then(setPos).catch(() => {})}>📍 {t("rec.allow")}</button>}
        <select value={state} onChange={(e) => setState(e.target.value)} className="rounded-full border border-ink/30 bg-white px-4 py-2 text-sm font-semibold" aria-label={t("rec.state")}>
          <option value="">{t("rec.nearMe")}</option>
          {states.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <div className="md:sticky md:top-0"><RecyclerMap center={center} items={items} /></div>
        <div className="space-y-3">{items.map((r) => <RecyclerCard key={r.id} r={r} />)}{!items.length && <p className="text-mute">{t("result.noRecyclers")}</p>}</div>
      </div>
    </div>
  );
}
