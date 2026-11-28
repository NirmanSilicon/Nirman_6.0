import { useEffect, useState } from "react";

const KEY = "saved_stores";
const read = (): number[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };

export function useSaved() {
  const [ids, setIds] = useState<number[]>(read());
  useEffect(() => { const f = () => setIds(read()); window.addEventListener("saved-changed", f); return () => window.removeEventListener("saved-changed", f); }, []);
  const toggle = (id: number) => {
    const n = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    localStorage.setItem(KEY, JSON.stringify(n)); setIds(n); window.dispatchEvent(new Event("saved-changed"));
  };
  return { ids, toggle };
}
