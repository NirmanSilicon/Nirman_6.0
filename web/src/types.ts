export type Preset = "default" | "max_profit" | "greenest";
export interface Breakdown { reuse: [number, number]; metals: [number, number]; processing_cost: [number, number] }
export interface Route {
  route: "Reuse" | "Desolder" | "Hydromet" | "Pyromet"; eligible: boolean; ineligible_reason: string | null;
  score: number; value: number; cost: number; energy: number; co2: number;
  value_range: { low: number; high: number }; breakdown: Breakdown; authorised_only: boolean;
  reason: { en: string; hi: string };
}
export interface Component { class: string; count: number; count_range?: [number, number]; count_unknown?: boolean; avg_conf: number; reusable: boolean; reusable_confident: number }
export interface Detection { class: string; confidence: number; bbox: [number, number, number, number]; ocr_text: string | null }
export interface ScanResult {
  scan_id: string; created_at: string; warning: "unseen_board" | null;
  board: { type: string | null; confidence: number };
  image: { width: number; height: number; stored: boolean };
  quality: { sharpness: number; brightness: number; ok: boolean; issues: string[] };
  model: { name?: string; version?: string; mode?: string; kind?: string };
  presence?: { class: string; probability: number; threshold: number; confidence: number }[];
  components: Component[]; detections: Detection[];
  value: { currency: string; low: number; high: number; breakdown: Breakdown; route: string } | null;
  preset: Preset; routes: Route[]; routes_by_preset: Record<Preset, Route[]>;
  recommendation: string; recommendation_i18n: { en: string; hi: string };
  trace: null | {
    reuse: { class: string; count: number; count_range?: number[]; price: number[]; unit: string; reuse_prob: number[]; subtotal: number[]; source: string }[];
    metals: { metal: string; grams: number[]; price: number[]; unit: string; recovery: number; subtotal: number[]; source: string }[];
  };
  prices_as_of: string | null; disclaimer: string;
}
export interface Recycler {
  id: number; name: string; cpcb_reg_no: string; address: string; city: string; state: string;
  lat: number; lng: number; phone: string | null; accepts: string[]; verified: boolean; distance_km: number;
  capacity_mta: number | null; geocode_level: string | null; list_date: string | null; source_url: string | null; validity_note: string | null;
}
