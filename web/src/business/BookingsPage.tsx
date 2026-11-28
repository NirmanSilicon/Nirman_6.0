import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Page, ReservationStatus, ZoneOut } from "../api/types";
import type { BusinessBayOut, BusinessReservationOut } from "./businessApi";
import {
  ACTIVE_STATUSES,
  CANCELLED_STATUSES,
  bizApi,
  describeApiError,
  fmtIstDate,
  fmtIstRange,
  theme,
  useReservationEvents,
} from "./businessApi";

type Filter = "all" | "active" | "completed" | "cancelled";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const matches = (s: ReservationStatus, f: Filter): boolean =>
  f === "all" || (f === "active" && ACTIVE_STATUSES.includes(s)) || (f === "completed" && s === "completed") || (f === "cancelled" && CANCELLED_STATUSES.includes(s));

const BADGE: Record<ReservationStatus, string> = {
  pending: "#7C3AED", confirmed: "#2563EB", checked_in: "#0D9488", in_progress: "#16A34A",
  completed: "#475569", cancelled: "#7F1D1D", no_show: "#7F1D1D", expired: "#7F1D1D",
};

const th: React.CSSProperties = { textAlign: "left", padding: "10px 12px", fontSize: 11, color: theme.muted, letterSpacing: 0.5, borderBottom: `1px solid ${theme.border}` };
const td: React.CSSProperties = { padding: "10px 12px", fontSize: 13, borderBottom: `1px solid ${theme.border}`, verticalAlign: "top" };
const btn = (bg: string): React.CSSProperties => ({ background: bg, color: "#fff", border: 0, borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", marginRight: 6 });

export function BookingsPage(): JSX.Element {
  const [items, setItems] = useState<BusinessReservationOut[]>([]);
  const [bayLabels, setBayLabels] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const page = await bizApi<Page<BusinessReservationOut>>("/loading/reservations");
      setItems(page.items);
      setError(null);
    } catch (e) {
      setError(describeApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Bay code lookup (reservations only carry bay_id)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const zones = (await bizApi<ZoneOut[]>("/loading/zones")).filter((z) => z.kind === "loading" || z.kind === "mixed");
        const lists = await Promise.all(zones.map((z) => bizApi<BusinessBayOut[]>(`/loading/zones/${z.id}/bays`).then((b) => ({ z, b }))));
        if (!alive) return;
        const map: Record<string, string> = {};
        lists.forEach(({ z, b }) => b.forEach((bay) => (map[bay.id] = `${bay.code} · ${z.name}`)));
        setBayLabels(map);
      } catch {
        /* fall back to raw bay ids */
      }
    })();
    void load();
    return () => {
      alive = false;
    };
  }, [load]);

  useReservationEvents(() => void load()); // reservation_changed → refetch (falls back to polling/mock emitter)

  const visible = useMemo(() => items.filter((r) => matches(r.status, filter)), [items, filter]);

  const transition = async (r: BusinessReservationOut, to: ReservationStatus) => {
    if (to === "cancelled" && !window.confirm(`Cancel ${r.reference}? This frees the bay.`)) return;
    setBusyId(r.id);
    try {
      const updated = await bizApi<BusinessReservationOut>(`/loading/reservations/${r.id}/status`, { method: "POST", body: { to_status: to } });
      setItems((prev) => prev.map((x) => (x.id === r.id ? updated : x))); // local update; SSE/poll reconciles
      setError(null);
    } catch (e) {
      setError(describeApiError(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ color: theme.text, background: theme.bg, padding: 20 }}>
      <h2 style={{ marginTop: 0 }}>Loading Bookings</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{ ...btn(filter === f.key ? theme.accent : theme.panel), border: `1px solid ${theme.border}`, borderRadius: 14 }}>
            {f.label}
          </button>
        ))}
      </div>

      {error && <div role="alert" style={{ background: theme.dangerBg, color: theme.danger, padding: 10, borderRadius: 8, marginBottom: 12 }}>⚠️ {error}</div>}
      {loading && <div style={{ color: theme.muted }}>Loading…</div>}

      <div style={{ overflowX: "auto", background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 10 }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              {["REFERENCE", "BAY", "VEHICLE", "SCHEDULE (IST)", "STATUS", "ACTIONS"].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const busy = busyId === r.id;
              return (
                <tr key={r.id}>
                  <td style={{ ...td, fontWeight: 800 }}>{r.reference}</td>
                  <td style={td}>{bayLabels[r.bay_id] ?? r.bay_id}</td>
                  <td style={td}>{r.vehicle_category.replace(/_/g, " ")}</td>
                  <td style={td}>
                    <div style={{ color: theme.muted, fontSize: 11 }}>{fmtIstDate(r.start)}</div>
                    {fmtIstRange(r.start, r.end)}
                  </td>
                  <td style={td}>
                    <span style={{ background: BADGE[r.status], padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                      {r.status.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </td>
                  <td style={td}>
                    {r.status === "pending" && <span style={{ color: "#FDE68A", fontSize: 12 }}>⏳ Awaiting confirmation</span>}
                    {r.status === "confirmed" && (
                      <>
                        <button disabled={busy} style={btn(theme.accent)} onClick={() => void transition(r, "checked_in")}>Check In</button>
                        <button disabled={busy} style={btn("#991B1B")} onClick={() => void transition(r, "cancelled")}>Cancel</button>
                      </>
                    )}
                    {r.status === "checked_in" && (
                      <>
                        <button disabled={busy} style={btn("#15803D")} onClick={() => void transition(r, "in_progress")}>Start</button>
                        <button disabled={busy} style={btn("#991B1B")} onClick={() => void transition(r, "cancelled")}>Cancel</button>
                      </>
                    )}
                    {r.status === "in_progress" && (
                      <button disabled={busy} style={btn("#15803D")} onClick={() => void transition(r, "completed")}>Complete</button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && visible.length === 0 && (
              <tr><td style={{ ...td, color: theme.muted }} colSpan={6}>No loading reservations in this view.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BookingsPage;
