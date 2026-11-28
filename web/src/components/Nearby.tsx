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
  if (!items) return <p className="text-sm text-zinc-500">{t("common.loading")}</p>;
  if (!items.length) return <p className="text-sm text-zinc-500">{t("result.noRecyclers")}</p>;
  return (
    <div className="space-y-2">
      {items.slice(0, limit).map((r) => (
        <div key={r.id} className="card">
          <div className="flex justify-between gap-2"><b>{r.name}</b><span className="whitespace-nowrap text-green-800">{r.distance_km} km</span></div>
          <p className="text-sm text-zinc-500">{r.address} · CPCB {r.cpcb_reg_no}</p>
          {!r.verified && <p className="text-xs text-amber-700">⚠ {t("result.sample")}</p>}
          <div className="mt-2 flex gap-2 text-sm font-semibold">
            <a className="btn btn-ghost !py-1.5" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`}>{t("result.directions")}</a>
            {r.phone && <a className="btn btn-ghost !py-1.5" href={`tel:${r.phone}`}>{t("result.call")}</a>}
          </div>
        </div>
      ))}
      <Link to="/recyclers" className="block text-center text-sm font-semibold text-green-800">{t("result.seeMap")} →</Link>
    </div>
  );
}
