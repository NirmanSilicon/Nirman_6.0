import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Page, ZoneOut } from "../api/types";
import { BookingCalendar } from "./BookingCalendar";
import type {
  BusinessBayOut,
  BusinessLoadingReservationCreate,
  BusinessReservationOut,
  BusinessVehicleCategory,
} from "./businessApi";
import { VEHICLE_CATEGORIES, bizApi, describeApiError, fmtIstRange, istYmd, theme, useReservationEvents } from "./businessApi";

interface Slot {
  bayId: string;
  startIso: string;
}

const DURATIONS = [30, 60, 90, 120, 180, 240];
const field: React.CSSProperties = { background: theme.bg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 14 };
const label: React.CSSProperties = { display: "grid", gap: 4, fontSize: 11, color: theme.muted, fontWeight: 700, letterSpacing: 0.4 };

export function LoadingZonesPage(): JSX.Element {
  const [zones, setZones] = useState<ZoneOut[]>([]);
  const [zoneId, setZoneId] = useState<string>("");
  const [date, setDate] = useState<string>(istYmd(new Date()));
  const [bays, setBays] = useState<BusinessBayOut[]>([]);
  const [reservations, setReservations] = useState<BusinessReservationOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [slot, setSlot] = useState<Slot | null>(null);
  const [mode, setMode] = useState<"auto" | "specific">("specific");
  const [duration, setDuration] = useState(60);
  const [category, setCategory] = useState<BusinessVehicleCategory>("lcv");
  const [manifestRef, setManifestRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 1. Zones (kind loading or mixed only)
  useEffect(() => {
    let alive = true;
    bizApi<ZoneOut[]>("/loading/zones")
      .then((all) => {
        if (!alive) return;
        const usable = all.filter((z) => z.kind === "loading" || z.kind === "mixed");
        setZones(usable);
        setZoneId((cur) => cur || usable[0]?.id || "");
        if (usable.length === 0) setLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        setLoadError(describeApiError(e));
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // 2. Bays + reservations of the selected zone
  const loadReservations = useCallback(async () => {
    if (!zoneId) return;
    const page = await bizApi<Page<BusinessReservationOut>>("/loading/reservations", { query: { zone_id: zoneId } });
    setReservations(page.items);
  }, [zoneId]);

  useEffect(() => {
    if (!zoneId) return;
    let alive = true;
    setLoading(true);
    setLoadError(null);
    setSlot(null);
    Promise.all([bizApi<BusinessBayOut[]>(`/loading/zones/${zoneId}/bays`), loadReservations()])
      .then(([b]) => alive && setBays(b))
      .catch((e) => alive && setLoadError(describeApiError(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [zoneId, loadReservations]);

  useReservationEvents(() => {
    void loadReservations().catch(() => undefined);
  });

  const selectedDate = useMemo(() => new Date(`${date}T12:00:00+05:30`), [date]);
  const startIso = slot?.startIso ?? null;
  const endIso = startIso ? new Date(new Date(startIso).getTime() + duration * 60000).toISOString() : null;
  const clickedBay = bays.find((b) => b.id === slot?.bayId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slot || !startIso || !endIso) return;
    const trimmedManifest = manifestRef.trim();
    const body: BusinessLoadingReservationCreate = {
      zone_id: zoneId,
      bay_id: mode === "specific" ? slot.bayId : null,
      start: startIso,
      end: endIso,
      vehicle_category: category,
      delivery_info: trimmedManifest ? { description: trimmedManifest } : {},
    };
    setSubmitting(true);
    setSubmitError(null);
    setSuccess(null);
    try {
      const res = await bizApi<BusinessReservationOut>("/loading/reservations", { method: "POST", body });
      setSuccess(`Booked ${res.reference} · ${fmtIstRange(res.start, res.end)} IST`);
      setSlot(null);
      setManifestRef("");
      await loadReservations();
    } catch (err) {
      setSubmitError(describeApiError(err)); // 409 BOOKING_OVERLAP → shared wording
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ color: theme.text, background: theme.bg, padding: 20, display: "grid", gap: 16 }}>
      <h2 style={{ margin: 0 }}>Loading Zones</h2>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <label style={label}>
          ZONE
          <select style={field} value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name} ({z.kind})
              </option>
            ))}
          </select>
        </label>
        <label style={label}>
          DATE (IST)
          <input style={field} type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
      </div>

      {loadError && <div role="alert" style={{ background: theme.dangerBg, color: theme.danger, padding: 10, borderRadius: 8 }}>⚠️ {loadError}</div>}
      {loading && <div style={{ color: theme.muted }}>Loading…</div>}
      {!loading && zones.length === 0 && !loadError && <div style={{ color: theme.muted }}>No loading or mixed zones available.</div>}

      {zoneId && !loading && (
        <BookingCalendar
          bays={bays}
          reservations={reservations}
          selectedDate={selectedDate}
          onSelectSlot={(bayId, start) => {
            setSlot({ bayId, startIso: start });
            setSuccess(null);
            setSubmitError(null);
          }}
        />
      )}

      {success && <div role="status" style={{ background: "#052E16", color: "#86EFAC", padding: 10, borderRadius: 8 }}>✓ {success}</div>}

      {slot && startIso && endIso && (
        <form onSubmit={submit} style={{ background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, display: "grid", gap: 12, maxWidth: 560 }}>
          <strong>Book loading slot</strong>
          <div style={{ color: theme.accentText, fontWeight: 700 }}>
            {fmtIstRange(startIso, endIso)} IST · {date}
          </div>

          <fieldset style={{ border: 0, padding: 0, display: "flex", gap: 16, color: theme.text }}>
            <label>
              <input type="radio" checked={mode === "auto"} onChange={() => setMode("auto")} /> Auto-assign best bay
            </label>
            <label>
              <input type="radio" checked={mode === "specific"} onChange={() => setMode("specific")} /> Select specific bay
            </label>
          </fieldset>
          {mode === "specific" && (
            <label style={label}>
              BAY
              <select style={field} value={slot.bayId} onChange={(e) => setSlot({ ...slot, bayId: e.target.value })}>
                {bays.filter((b) => !b.out_of_service).map((b) => (
                  <option key={b.id} value={b.id}>{b.code}</option>
                ))}
              </select>
            </label>
          )}
          {mode === "auto" && clickedBay && <div style={{ fontSize: 12, color: theme.muted }}>The server picks any free bay; {clickedBay.code} is not guaranteed.</div>}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <label style={label}>
              DURATION (END TIME)
              <select style={field} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </select>
            </label>
            <label style={label}>
              VEHICLE CATEGORY
              <select
                style={field}
                value={category}
                onChange={(e) => {
                  const next = VEHICLE_CATEGORIES.find((c) => c === e.target.value);
                  if (next) setCategory(next);
                }}
              >
                {VEHICLE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                ))}
              </select>
            </label>
          </div>
          <label style={label}>
            DELIVERY MANIFEST REF (OPTIONAL)
            <input style={field} value={manifestRef} onChange={(e) => setManifestRef(e.target.value)} placeholder="e.g. MAN-2026-001" />
          </label>

          {submitError && <div role="alert" style={{ background: theme.dangerBg, color: theme.danger, padding: 10, borderRadius: 8 }}>⚠️ {submitError}</div>}

          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" disabled={submitting} style={{ background: theme.accent, color: "#fff", border: 0, borderRadius: 8, padding: "10px 18px", fontWeight: 800, cursor: "pointer", opacity: submitting ? 0.6 : 1 }}>
              {submitting ? "Booking…" : "Confirm booking"}
            </button>
            <button type="button" onClick={() => setSlot(null)} style={{ background: "transparent", color: theme.muted, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "10px 14px", cursor: "pointer" }}>
              Clear
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default LoadingZonesPage;
