/** Level progress ring (the deck's orbit motif). */
export default function Ring({ progress, label, sub, size = 120 }: { progress: number; label: string; sub?: string; size?: number }) {
  const r = size / 2 - 8, c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`${label} ${Math.round(progress * 100)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity=".15" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f26a1b" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0.02, progress)))} style={{ transition: "stroke-dashoffset .8s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <b className="display text-2xl leading-none">{label}</b>{sub && <span className="text-[10px] uppercase tracking-widest opacity-70">{sub}</span>}
      </div>
    </div>
  );
}
