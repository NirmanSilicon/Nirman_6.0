import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getRecyclers } from "../lib/api";
import { cachedPos, locate } from "../lib/store";
import type { Recycler } from "../types";

export default function Nearby({ limit = 3 }: { limit?: number }) {
  const { t } = useTranslation();
  const [pos, setPos] = useState(cachedPos());
  const [items, setItems] = useState<Recycler[] | null>(null);
  const load = useCallback((p: { lat: number; lng: number }) => getRecyclers(p.lat, p.lng).then((r) => setItems(r.items)).catch(() => setItems([])), []);
  useEffect(() => { if (pos) load(pos); }, [pos, load]);
  if (!pos) return <button className="btn btn-ghost w-full" onClick={() => locate().then(setPos).catch(() => {})}>📍 {t("result.useLocation")}</button>;
  if (!items) return <p className="text-sm text-mute">{t("common.loading")}</p>;
  if (!items.length) return <p className="text-sm text-mute">{t("result.noRecyclers")}</p>;
  return (
    <div className="space-y-2">
      {items.slice(0, limit).map((r) => (
        <RecyclerCard key={r.id} r={r} />
      ))}
      <Link to="/recyclers" className="block text-center text-sm font-semibold text-ember">{t("result.seeMap")} →</Link>
    </div>
  );
}

export function RecyclerCard({ r }: { r: Recycler }) {
  const { t } = useTranslation();
  return (
    <div className="card">
      <div className="flex justify-between gap-2"><b>{r.name}</b><span className="whitespace-nowrap font-semibold text-ember">{r.distance_km} km</span></div>
      <p className="text-sm text-mute">{r.address}{r.cpcb_reg_no ? ` · ${r.cpcb_reg_no}` : ""}</p>
      <p className="mt-1 flex flex-wrap gap-1 text-[11px] font-semibold">
        <span className="rounded-full bg-cream px-2 py-0.5">{r.state}</span>
        {r.capacity_mta ? <span className="rounded-full bg-cream px-2 py-0.5">{r.capacity_mta.toLocaleString("en-IN")} t/yr</span> : null}
        {r.geocode_level && r.geocode_level !== "address" && <span className="rounded-full bg-amber/30 px-2 py-0.5">{t("result.approx")}</span>}
      </p>
      <p className="mt-1 text-xs text-mute">{r.validity_note ?? t("result.listed")}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-sm font-semibold">
        <a className="btn btn-primary !py-1.5" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`}>{t("result.directions")}</a>
        {r.phone && <a className="btn btn-ghost !py-1.5" href={`tel:${r.phone.replace(/\s/g, "")}`}>{t("result.call")}</a>}
        {r.source_url && <a className="btn btn-ghost !py-1.5" target="_blank" rel="noreferrer" href={r.source_url}>{t("result.source")}</a>}
      </div>
    </div>
  );
}
