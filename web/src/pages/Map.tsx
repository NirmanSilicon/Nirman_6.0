import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { RecyclerCard } from "../components/Nearby";
import * as api from "../lib/api";
import { refreshImpact, toast } from "../lib/impact";
import { useSaved } from "../lib/saved";
import * as store from "../lib/store";
import type { Recycler } from "../types";

const MapView = lazy(() => import("../components/MapView"));
const BHUBANESWAR = { lat: 20.2961, lng: 85.8245 };

export default function MapPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const scanParam = params.get("scan");
  const [pos, setPos] = useState(store.cachedPos());
  const [all, setAll] = useState<Recycler[]>([]);
  const [state, setState] = useState("");
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "saved">("all");
  const [sel, setSel] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [dropped, setDropped] = useState<{ scan_id: string; recycler_id: number }[]>([]);
  const { ids: saved, toggle } = useSaved();
  const center = pos ?? BHUBANESWAR;

  useEffect(() => { api.getRecyclers(center.lat, center.lng, 5000, "", 1000).then((r) => setAll(r.items)).catch(() => {}); }, [center.lat, center.lng]);
  useEffect(() => { api.getDropoffs().then((r) => setDropped(r.items)).catch(() => {}); }, []);
  useEffect(() => { if (all.length && params.get("focus")) { const id = Number(params.get("focus")); if (all.some((r) => r.id === id)) { setSel(id); setOpen(true); } } }, [all.length]); // eslint-disable-line

  const states = useMemo(() => [...new Set(all.map((r) => r.state))].sort(), [all]);
  const items = useMemo(() => all.filter((r) =>
    (!state || r.state === state) && (tab === "all" || saved.includes(r.id)) &&
    (!q || `${r.name} ${r.city} ${r.address}`.toLowerCase().includes(q.toLowerCase()))), [all, state, q, tab, saved]);
  const visited = useMemo(() => dropped.map((d) => d.recycler_id), [dropped]);
  const selected = all.find((r) => r.id === sel) ?? null;
  const pending = store.history().filter((h) => h.value && !dropped.some((d) => d.scan_id === h.scan_id));
  const scanForDrop = scanParam && !dropped.some((d) => d.scan_id === scanParam) ? scanParam : pending[0]?.scan_id;

  const drop = useCallback(async (r: Recycler) => {
    if (!scanForDrop) return toast(t("map.noScan"));
    try {
      await api.createDropoff(scanForDrop, r.id);
      setDropped((d) => [...d, { scan_id: scanForDrop, recycler_id: r.id }]);
      refreshImpact(); toast(t("map.thanks", { name: r.name }), "info");
    } catch (e: any) { toast(e?.status === 409 ? t("map.already") : t("scan.failed")); }
  }, [scanForDrop, t]);

  const locate = () => store.locate().then(setPos).catch(() => toast(t("rec.allow")));
  const fitKey = `${state}|${tab}|${q}|${pos?.lat}`;
  const select = (id: number) => { setSel(id); setOpen(true); };

  return (
    <div className="relative h-full overflow-hidden">
      <div className="absolute inset-0 md:left-[400px]">
        <Suspense fallback={<div className="flex h-full items-center justify-center bg-cream text-mute">{t("common.loading")}</div>}>
          <MapView items={items} selectedId={sel} savedIds={saved} visitedIds={visited} center={center} user={pos} fitKey={fitKey} onSelect={select} />
        </Suspense>
        <div className="absolute left-3 top-3 z-[500] flex gap-2 md:hidden">
          <button className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-cream shadow" onClick={() => setOpen(true)}>☰ {items.length} {t("map.stores")}</button>
        </div>
        <button onClick={locate} className="absolute right-3 top-3 z-[500] rounded-full bg-white px-3 py-2 text-xs font-semibold shadow">📍 {pos ? t("map.recenter") : t("result.useLocation")}</button>
        <div className="absolute bottom-3 left-3 z-[500] hidden gap-3 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold shadow sm:flex">
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full border-2 border-orange bg-ink" />{t("map.legend.listed")}</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-amber" />{t("map.legend.saved")}</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-orange" />{t("map.legend.visited")}</span>
        </div>
      </div>

      <aside className={`absolute inset-x-0 bottom-0 z-[600] flex max-h-[72%] flex-col rounded-t-3xl bg-paper shadow-2xl transition-transform md:inset-y-0 md:left-0 md:max-h-none md:w-[400px] md:translate-y-0 md:rounded-none md:border-r md:border-line ${open ? "translate-y-0" : "translate-y-full"}`}>
        <button className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-ink/20 md:hidden" aria-label="Close" onClick={() => setOpen(false)} />
        <div className="space-y-2 p-3">
          <p className="eyebrow">{t("rec.eyebrow")}</p>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("map.search")} className="w-full rounded-full border border-ink/20 bg-white px-4 py-2 text-sm" />
          <div className="flex gap-2">
            <select value={state} onChange={(e) => setState(e.target.value)} aria-label={t("rec.state")} className="min-w-0 flex-1 rounded-full border border-ink/20 bg-white px-3 py-2 text-sm font-semibold">
              <option value="">{t("map.allStates")}</option>{states.map((s) => <option key={s}>{s}</option>)}</select>
            {(["all", "saved"] as const).map((k) => (
              <button key={k} onClick={() => setTab(k)} className={`rounded-full px-3 py-2 text-xs font-semibold ${tab === k ? "bg-ink text-cream" : "border border-ink/20 bg-white"}`}>
                {k === "all" ? t("map.all") : `★ ${saved.length}`}</button>))}
          </div>
          <p className="text-xs text-mute">{items.length} {t("map.stores")} · {t("rec.note")}</p>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 pt-0">
          {selected && <div className="rounded-2xl ring-2 ring-orange"><RecyclerCard r={selected} saved={saved.includes(selected.id)} onSave={() => toggle(selected.id)}
            onDrop={() => drop(selected)} dropped={visited.includes(selected.id)} /></div>}
          {!scanForDrop && selected && <p className="text-xs text-mute">{t("map.noScan")} <Link to="/scan" className="font-semibold text-ember">{t("nav.scan")} →</Link></p>}
          {items.filter((r) => r.id !== sel).slice(0, 80).map((r) => (
            <button key={r.id} onClick={() => select(r.id)} className="card block w-full text-left !p-3">
              <div className="flex justify-between gap-2"><b className="text-sm">{r.name}</b><span className="whitespace-nowrap text-xs font-semibold text-ember">{r.distance_km} km</span></div>
              <p className="truncate text-xs text-mute">{r.city || r.address} · {r.state}{saved.includes(r.id) ? " · ★" : ""}{visited.includes(r.id) ? " · ✓" : ""}</p>
            </button>))}
          {!items.length && <p className="p-4 text-center text-mute">{t("result.noRecyclers")}</p>}
        </div>
      </aside>
    </div>
  );
}
