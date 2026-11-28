import { useEffect, useState } from "react";
import Icon from "./Icon";

interface T { id: number; msg: string; kind: string }
export default function Toasts() {
  const [list, setList] = useState<T[]>([]);
  useEffect(() => {
    let n = 0;
    const on = (e: Event) => {
      const { msg, kind } = (e as CustomEvent).detail; const id = ++n;
      setList((l) => [...l, { id, msg, kind }]);
      setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 3200);
    };
    window.addEventListener("toast", on); return () => window.removeEventListener("toast", on);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-[2000] flex flex-col items-center gap-2" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`toast-in rounded-full px-5 py-2 text-sm font-bold shadow-lg ${t.kind === "points" ? "bg-orange text-white" : t.kind === "badge" ? "bg-amber text-ink" : "bg-ink text-cream"}`}>
          <Icon name={t.kind === "points" ? "bolt" : t.kind === "badge" ? "medal" : "info"} size={14} className="mr-1.5 -mt-0.5" />{t.msg}
        </div>))}
    </div>
  );
}
