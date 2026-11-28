import { useEffect, useState } from "react";
import type { ScanResult } from "../types";
import { localImage } from "../lib/store";
import { imageUrl } from "../lib/api";

const COLORS: Record<string, string> = { RAM_IC: "#16a34a", IC: "#2563eb", CAPACITOR: "#d97706", RESISTOR: "#9333ea", CONNECTOR: "#0891b2", CRYSTAL: "#db2777" };

export default function BBoxOverlay({ r }: { r: ScanResult }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null, alive = true;
    localImage(r.scan_id).then((b) => {
      if (!alive) return;
      if (b) { url = URL.createObjectURL(b); setSrc(url); } else if (r.image.stored) setSrc(imageUrl(r.scan_id));
    });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [r.scan_id]);
  if (!src) return null;
  const { width: W, height: H } = r.image;
  return (
    <div className="relative overflow-hidden rounded-xl bg-black">
      <img src={src} alt="" className="block w-full" />
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        {r.detections.map((d, i) => (
          <rect key={i} x={d.bbox[0]} y={d.bbox[1]} width={d.bbox[2]} height={d.bbox[3]} fill="none"
            stroke={COLORS[d.class] ?? "#fff"} strokeWidth={Math.max(2, W / 300)} />
        ))}
      </svg>
    </div>
  );
}
