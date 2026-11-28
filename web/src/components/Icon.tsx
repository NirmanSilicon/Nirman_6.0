/** Minimal stroke icon set (24px grid) so the UI stays consistent and emoji-free. */
const P: Record<string, string> = {
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  map: "M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  scan: "M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M7 12h10",
  impact: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  info: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 8h.01",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
  pin: "M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  locate: "M12 3v3M12 18v3M3 12h3M18 12h3M12 16a4 4 0 100-8 4 4 0 000 8z",
  check: "M5 12.5l4.5 4.5L19 7.5",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7z",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5h.01",
  alert: "M12 4l9 16H3zM12 10v4M12 17h.01",
  shield: "M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z",
  recycle: "M7 19l-3-5 3-5M4 14h9M17 5l3 5-3 5M20 10h-9M10 4l3 0M14 20h-3",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6",
  bolt: "M13 3L5 14h6l-1 7 8-11h-6z",
  medal: "M8 3h8l-2 6h-4zM12 21a5 5 0 100-10 5 5 0 000 10z",
  lock: "M6 11h12v9H6zM8 11V8a4 4 0 018 0v3",
  flame: "M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z",
  list: "M4 6h16M4 12h16M4 18h16",
  rupee: "M7 5h10M7 9h10M7 5c5 0 7 2 7 4s-2 4-7 4l7 6",
  dot: "M12 12h.01",
  arrow: "M5 12h14M13 6l6 6-6 6",
  out: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5",
};

export default function Icon({ name, size = 18, className = "", fill = false }: { name: keyof typeof P | string; size?: number; className?: string; fill?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`inline-block shrink-0 ${className}`} aria-hidden>
      <path d={P[name] ?? P.dot} />
    </svg>
  );
}
