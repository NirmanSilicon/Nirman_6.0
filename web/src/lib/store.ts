import { del, get, set, keys } from "idb-keyval";
import type { ScanResult } from "../types";
import * as api from "./api";

const HIST = "history", MAX = 60;
export interface Pending { id: string; blob: Blob; consent: boolean; lat?: number; lng?: number; preset: string; createdAt: number }

export const history = (): ScanResult[] => JSON.parse(localStorage.getItem(HIST) || "[]");
export const setHistory = (h: ScanResult[]) => localStorage.setItem(HIST, JSON.stringify(h.slice(0, MAX)));

export async function saveResult(r: ScanResult, blob: Blob) {
  const h = [r, ...history().filter((x) => x.scan_id !== r.scan_id)];
  const dropped = h.slice(MAX);
  setHistory(h);
  await set(`img:${r.scan_id}`, blob);
  for (const d of dropped) await del(`img:${d.scan_id}`);
}
export const localImage = (id: string) => get<Blob>(`img:${id}`);
export async function removeLocal(id: string) { setHistory(history().filter((x) => x.scan_id !== id)); await del(`img:${id}`); }

const notify = () => window.dispatchEvent(new Event("queue-changed"));
export async function enqueue(p: Omit<Pending, "id" | "createdAt">) {
  const id = crypto.randomUUID();
  await set(`q:${id}`, { ...p, id, createdAt: Date.now() });
  notify();
}
export async function pending(): Promise<Pending[]> {
  const ks = (await keys()).filter((k) => String(k).startsWith("q:"));
  const items = await Promise.all(ks.map((k) => get<Pending>(k)));
  return (items.filter(Boolean) as Pending[]).sort((a, b) => a.createdAt - b.createdAt);
}
export async function dropPending(id: string) { await del(`q:${id}`); notify(); }

let flushing = false;
/** Upload queued scans (offline-first, PRD s10). Stops at the first network failure. */
export async function flush(): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  let done = 0;
  try {
    for (const p of await pending()) {
      try {
        const r = await api.postScan(p.blob, { consent: p.consent, lat: p.lat, lng: p.lng, preset: p.preset, force: true });
        await saveResult(r, p.blob);
        await dropPending(p.id);
        done++;
      } catch (e) {
        if (e instanceof api.NetworkError) break;
        await dropPending(p.id); // permanent failure (bad image etc.): don't retry forever
      }
    }
  } finally { flushing = false; }
  if (done) window.dispatchEvent(new Event("history-changed"));
  return done;
}

export function cachedPos(): { lat: number; lng: number } | null {
  try { return JSON.parse(localStorage.getItem("pos") || "null"); } catch { return null; }
}
export function locate(): Promise<{ lat: number; lng: number }> {
  return new Promise((res, rej) => navigator.geolocation
    ? navigator.geolocation.getCurrentPosition((p) => {
        const v = { lat: p.coords.latitude, lng: p.coords.longitude };
        localStorage.setItem("pos", JSON.stringify(v)); res(v);
      }, rej, { timeout: 8000, maximumAge: 600000 })
    : rej(new Error("no geolocation")));
}
