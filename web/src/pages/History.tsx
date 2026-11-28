import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { inr } from "../components/ui";
import * as api from "../lib/api";
import * as store from "../lib/store";

interface Item { scan_id: string; created_at: string; value_low: number | null; value_high: number | null; top_route: string | null; warning?: string | null }

export default function History() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Item[]>([]);
  const [pend, setPend] = useState(0);
  useEffect(() => {
    const load = async () => {
      const local: Item[] = store.history().map((r) => ({ scan_id: r.scan_id, created_at: r.created_at, value_low: r.value?.low ?? null, value_high: r.value?.high ?? null, top_route: r.value?.route ?? null, warning: r.warning }));
      setItems(local); setPend((await store.pending()).length);
      try {
        const srv = (await api.listScans()).items as Item[];
        const ids = new Set(local.map((l) => l.scan_id));
        setItems([...local, ...srv.filter((s) => !ids.has(s.scan_id))].sort((a, b) => b.created_at.localeCompare(a.created_at)));
      } catch { /* offline: local only */ }
    };
    load();
    window.addEventListener("history-changed", load); window.addEventListener("queue-changed", load);
    return () => { window.removeEventListener("history-changed", load); window.removeEventListener("queue-changed", load); };
  }, []);
  return (
    <div className="space-y-3 p-4">
      <h1 className="text-xl font-bold">{t("history.title")}</h1>
      {pend > 0 && (
        <div className="card flex items-center justify-between border-amber-300 bg-amber-50">
          <span>{pend} {t("history.pending")}</span>
          <button className="btn btn-primary !py-1.5" onClick={() => store.flush()}>{t("history.upload")}</button>
        </div>)}
      {!items.length && <p className="text-zinc-500">{t("history.empty")}</p>}
      {items.map((s) => (
        <Link key={s.scan_id} to={`/result/${s.scan_id}`} className="card block">
          <div className="flex justify-between">
            <b className="text-green-900">{s.value_low != null ? inr(s.value_low, s.value_high!) : t("result.notSure")}</b>
            <span className="text-sm text-zinc-500">{new Date(s.created_at).toLocaleString()}</span>
          </div>
          {s.top_route && <p className="text-sm text-zinc-600">{t(`routes.${s.top_route}`)}</p>}
        </Link>))}
    </div>
  );
}
