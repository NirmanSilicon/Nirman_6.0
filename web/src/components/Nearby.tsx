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
      <Link to="/map" className="block text-center text-sm font-semibold text-ember">{t("result.seeMap")} →</Link>
    </div>
  );
}

const EPR_PORTAL = "https://eprewastecpcb.in";
const STATE_BOARD: Record<string, string> = { Odisha: "https://ospcboard.odisha.gov.in/divisions/waste-management-division/e-waste-management/" };

export function RecyclerCard({ r, saved, onSave, onDrop, dropped }: { r: Recycler; saved?: boolean; onSave?: () => void; onDrop?: () => void; dropped?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-2">
        <b>{r.name}</b>
        <span className="flex items-center gap-2 whitespace-nowrap">
          <span className="font-semibold text-ember">{r.distance_km} km</span>
          {onSave && <button onClick={onSave} aria-pressed={saved} aria-label={t("map.save")} className={`text-xl leading-none ${saved ? "text-amber" : "text-ink/30"}`}>★</button>}
        </span>
      </div>
      <p className="text-sm text-mute">{r.address}{r.cpcb_reg_no ? ` · ${r.cpcb_reg_no}` : ""}</p>
      <p className="mt-1 flex flex-wrap gap-1 text-[11px] font-semibold">
        <span className="rounded-full bg-cream px-2 py-0.5">{r.state}</span>
        {r.capacity_mta ? <span className="rounded-full bg-cream px-2 py-0.5">{r.capacity_mta.toLocaleString("en-IN")} t/yr</span> : null}
        {r.geocode_level && r.geocode_level !== "address" && <span className="rounded-full bg-amber/30 px-2 py-0.5">{t("result.approx")}</span>}
        {dropped && <span className="rounded-full bg-orange px-2 py-0.5 text-white">✓ {t("map.visited")}</span>}
      </p>
      <p className="mt-1 text-xs text-mute">{r.validity_note ?? t("result.listed")}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-sm font-semibold">
        <a className="btn btn-primary !py-1.5" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`}>{t("result.directions")}</a>
        {r.phone && <a className="btn btn-ghost !py-1.5" href={`tel:${r.phone.replace(/\s/g, "")}`}>{t("result.call")}</a>}
        {onDrop && <button className="btn btn-accent !py-1.5" onClick={onDrop}>✓ {t("map.drop")}</button>}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-3 text-xs font-semibold text-ember">
        <span className="text-mute">{t("map.verify")}:</span>
        <a href={EPR_PORTAL} target="_blank" rel="noreferrer">{t("map.epr")} ↗</a>
        {STATE_BOARD[r.state] && <a href={STATE_BOARD[r.state]} target="_blank" rel="noreferrer">{t("map.board", { state: r.state })} ↗</a>}
        {r.source_url && <a href={r.source_url} target="_blank" rel="noreferrer">{t("result.source")} ↗</a>}
      </p>
    </div>
  );
}
