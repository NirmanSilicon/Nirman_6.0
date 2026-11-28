import React, { useMemo } from "react";
import type { ReservationStatus } from "../api/types";
import type { BusinessBayOut, BusinessReservationOut } from "./businessApi";
import { fmtIstRange, istInstant, istYmd, theme } from "./businessApi";

export interface BookingCalendarProps {
  bays: BusinessBayOut[];
  reservations: BusinessReservationOut[];
  selectedDate: Date;
  onSelectSlot: (bayId: string, startIso: string, endIso: string) => void;
}

const FIRST_MIN = 8 * 60;
const LAST_MIN = 22 * 60;
const STEP = 30;

const hhmm = (mins: number): string => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

const COLORS: Record<ReservationStatus, string> = {
  pending: "#7C3AED",
  confirmed: "#2563EB",
  checked_in: "#0D9488",
  in_progress: "#16A34A",
  completed: "#475569",
  cancelled: "rgba(239,68,68,0.28)",
  no_show: "rgba(239,68,68,0.28)",
  expired: "rgba(239,68,68,0.28)",
};
// Released reservations are drawn faded but do not block the slot (the server frees them).
const RELEASED: ReservationStatus[] = ["cancelled", "no_show", "expired"];

const cell: React.CSSProperties = { minWidth: 58, height: 36, padding: 0, border: `1px solid ${theme.border}`, fontSize: 10, color: theme.text, background: "transparent" };

export function BookingCalendar({ bays, reservations, selectedDate, onSelectSlot }: BookingCalendarProps): JSX.Element {
  const ymd = istYmd(selectedDate);

  const slots = useMemo(() => {
    const list: { startIso: string; endIso: string; label: string }[] = [];
    for (let m = FIRST_MIN; m < LAST_MIN; m += STEP) {
      list.push({ startIso: istInstant(ymd, hhmm(m)), endIso: istInstant(ymd, hhmm(m + STEP)), label: hhmm(m) });
    }
    return list;
  }, [ymd]);

  const rows = useMemo(() => [...bays].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })), [bays]);

  return (
    <div style={{ overflowX: "auto", border: `1px solid ${theme.border}`, borderRadius: 10, background: theme.panel }}>
      <table style={{ borderCollapse: "collapse", width: "max-content", minWidth: "100%" }}>
        <thead>
          <tr>
            <th style={{ ...cell, position: "sticky", left: 0, background: theme.panel, zIndex: 1, minWidth: 130, textAlign: "left", paddingLeft: 10 }}>
              Bay · {ymd} IST
            </th>
            {slots.map((s) => (
              <th key={s.label} style={{ ...cell, color: theme.muted, fontWeight: 600 }}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((bay) => {
            const own = reservations.filter((r) => r.bay_id === bay.id);
            return (
              <tr key={bay.id} style={bay.out_of_service ? { background: "#334155" } : undefined}>
                <th style={{ ...cell, position: "sticky", left: 0, zIndex: 1, textAlign: "left", paddingLeft: 10, background: bay.out_of_service ? "#334155" : theme.panel }}>
                  {bay.code}
                  {bay.out_of_service && (
                    <span style={{ marginLeft: 8, padding: "1px 6px", borderRadius: 8, background: "#0F172A", color: theme.muted, fontSize: 9 }}>
                      Out of Service
                    </span>
                  )}
                </th>
                {slots.map((s) => {
                  if (bay.out_of_service) {
                    return <td key={s.label} style={{ ...cell, background: "#334155", cursor: "not-allowed" }} aria-disabled="true" />;
                  }
                  // half-open [s, e): occupied iff res.start < e && res.end > s
                  const hit = own.filter((r) => new Date(r.start).getTime() < new Date(s.endIso).getTime() && new Date(r.end).getTime() > new Date(s.startIso).getTime());
                  const blocking = hit.find((r) => !RELEASED.includes(r.status));
                  const shown = blocking ?? hit[0];
                  const startsHere = shown ? new Date(shown.start).getTime() >= new Date(s.startIso).getTime() : false;
                  const isPast = new Date(s.startIso).getTime() < Date.now();

                  if (blocking) {
                    return (
                      <td key={s.label} style={{ ...cell, background: COLORS[blocking.status], cursor: "default", textAlign: "center" }} title={`${blocking.reference} · ${blocking.status.replace(/_/g, " ")} · ${fmtIstRange(blocking.start, blocking.end)} IST`}>
                        {startsHere ? blocking.reference.slice(-6) : ""}
                      </td>
                    );
                  }
                  if (isPast) {
                    return (
                      <td
                        key={s.label}
                        style={{ ...cell, background: shown ? COLORS[shown.status] : "rgba(15,23,42,0.45)", cursor: "not-allowed" }}
                        aria-disabled="true"
                        title="Past time slot"
                      />
                    );
                  }
                  return (
                    <td key={s.label} style={{ ...cell, background: shown ? COLORS[shown.status] : undefined }} title={shown ? `${shown.reference} · ${shown.status} (released)` : "Available"}>
                      <button
                        type="button"
                        aria-label={`Book ${bay.code} ${s.label}`}
                        onClick={() => onSelectSlot(bay.id, s.startIso, s.endIso)}
                        style={{ width: "100%", height: "100%", border: 0, background: "transparent", cursor: "pointer", color: theme.accentText }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(56,189,248,0.18)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        +
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", padding: 10, fontSize: 11, color: theme.muted }}>
        {(["confirmed", "checked_in", "in_progress", "completed", "cancelled"] as ReservationStatus[]).map((st) => (
          <span key={st}>
            <span style={{ display: "inline-block", width: 10, height: 10, background: COLORS[st], marginRight: 4, borderRadius: 2 }} />
            {st.replace(/_/g, " ")}
          </span>
        ))}
      </div>
    </div>
  );
}
