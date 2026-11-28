import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import RecyclerMap from "../components/RecyclerMap";
import * as api from "../lib/api";
import * as store from "../lib/store";
import type { Recycler } from "../types";

const DELHI = { lat: 28.6139, lng: 77.209 };

export default function Recyclers() {
  const { t } = useTranslation();
  const [pos, setPos] = useState(store.cachedPos());
  const [items, setItems] = useState<Recycler[]>([]);
  const center = pos ?? DELHI;
  useEffect(() => { api.getRecyclers(center.lat, center.lng, 300).then((r) => setItems(r.items)).catch(() => {}); }, [center.lat, center.lng]);
  return (
    <div className="space-y-3 p-4 md:p-8">
      <h1 className="text-3xl">{t("rec.title")}</h1>
      {!pos && <button className="btn btn-ghost w-full" onClick={() => store.locate().then(setPos).catch(() => {})}>📍 {t("rec.allow")}</button>}
      <RecyclerMap center={center} items={items} />
      {items.map((r) => (
        <div key={r.id} className="card">
          <div className="flex justify-between gap-2"><b>{r.name}</b><span className="whitespace-nowrap text-ember">{r.distance_km} km</span></div>
          <p className="text-sm text-mute">{r.address} · CPCB {r.cpcb_reg_no}</p>
          <p className="text-xs text-mute">{r.accepts.join(", ")}</p>
          {!r.verified && <p className="text-xs text-amber-700">⚠ {t("result.sample")}</p>}
          <div className="mt-2 flex gap-2 text-sm">
            <a className="btn btn-ghost !py-1.5" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`}>{t("result.directions")}</a>
            {r.phone && <a className="btn btn-ghost !py-1.5" href={`tel:${r.phone}`}>{t("result.call")}</a>}
          </div>
        </div>))}
    </div>
  );
}
