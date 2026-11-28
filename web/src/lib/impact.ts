import { useEffect, useState } from "react";
import * as api from "./api";

const KEY = "impact";
export const toast = (msg: string, kind: "points" | "badge" | "info" = "info") =>
  window.dispatchEvent(new CustomEvent("toast", { detail: { msg, kind } }));

const cached = (): api.Impact | null => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } };

/** Re-fetch impact; announce points, level-ups and new badges (the gamification feedback loop). */
export async function refreshImpact(announce = true): Promise<api.Impact | null> {
  try {
    const prev = cached();
    const cur = await api.getImpact();
    localStorage.setItem(KEY, JSON.stringify(cur));
    if (announce && prev) {
      const d = cur.points - prev.points;
      if (d > 0) toast(`+${d} points`, "points");
      if (cur.level.index > prev.level.index) toast(`Level up: ${cur.level.name}`, "badge");
      const had = new Set(prev.badges.filter((b) => b.earned).map((b) => b.id));
      cur.badges.filter((b) => b.earned && !had.has(b.id)).forEach((b) => toast(`Badge: ${b.title}`, "badge"));
    }
    window.dispatchEvent(new Event("impact-changed"));
    return cur;
  } catch { return cached(); }
}

export function useImpact() {
  const [i, setI] = useState<api.Impact | null>(cached());
  useEffect(() => {
    const on = () => setI(cached());
    window.addEventListener("impact-changed", on);
    refreshImpact(false);
    return () => window.removeEventListener("impact-changed", on);
  }, []);
  return i;
}
