import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import * as api from "../lib/api";
import { fileToBitmap, measure, toJpeg, type Quality } from "../lib/imaging";
import * as store from "../lib/store";

export default function Capture() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const video = useRef<HTMLVideoElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [cam, setCam] = useState(false);
  const [hint, setHint] = useState<Quality | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [consent, setConsent] = useState(localStorage.getItem("consent") === "1");
  const [review, setReview] = useState<{ blob: Blob; issues: string[] } | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null, timer = 0, alive = true;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } }, audio: false })
      .then((s) => {
        if (!alive) return s.getTracks().forEach((x) => x.stop());
        stream = s;
        const v = video.current!; v.srcObject = s; v.play().catch(() => {}); setCam(true);
        const c = document.createElement("canvas");
        timer = window.setInterval(() => { if (v.videoWidth) setHint(measure(v, v.videoWidth, v.videoHeight, c)); }, 700);
      }).catch(() => setCam(false));
    return () => { alive = false; clearInterval(timer); stream?.getTracks().forEach((x) => x.stop()); };
  }, []);

  const submit = useCallback(async (blob: Blob, force = false) => {
    setReview(null); setBusy(true); setMsg(t("scan.analysing"));
    const pos = store.cachedPos();
    const opts = { consent, lat: pos?.lat, lng: pos?.lng, force };
    try {
      if (!navigator.onLine) throw new api.NetworkError("offline");
      const r = await api.postScan(blob, opts);
      await store.saveResult(r, blob);
      nav(`/result/${r.scan_id}`);
    } catch (e) {
      setBusy(false);
      if (e instanceof api.NetworkError) { await store.enqueue({ blob, consent, lat: pos?.lat, lng: pos?.lng, preset: "default" }); setMsg(t("scan.queued")); nav("/history"); }
      else if (e instanceof api.ApiError && e.status === 422 && e.body?.code === "poor_quality") setReview({ blob, issues: e.body.issues });
      else setMsg(t("scan.failed"));
    }
  }, [consent, nav, t]);

  const handle = useCallback(async (blob: Blob, bmp: ImageBitmap | HTMLVideoElement, w: number, h: number) => {
    const q = measure(bmp, w, h);
    if (!q.ok) setReview({ blob, issues: q.issues }); else submit(blob);
  }, [submit]);

  const snap = async () => {
    const v = video.current!; if (!v.videoWidth) return;
    const blob = await toJpeg(v, v.videoWidth, v.videoHeight);
    handle(blob, v, v.videoWidth, v.videoHeight);
  };
  const pick = async (f?: File) => {
    if (!f) return;
    const bmp = await fileToBitmap(f);
    const blob = await toJpeg(bmp, bmp.width, bmp.height);
    handle(blob, bmp, bmp.width, bmp.height);
  };

  return (
    <div className="relative flex h-full flex-col bg-black">
      <div className="relative min-h-0 flex-1">
        <video ref={video} playsInline muted className="h-full w-full object-cover" />
        {!cam && <p className="absolute inset-0 flex items-center justify-center p-8 text-center text-white">{t("scan.noCamera")}</p>}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[28%] w-[92%] rounded-xl border-4 border-dashed border-white/80" />
        </div>
        <p className="absolute top-3 w-full text-center text-sm font-semibold text-white drop-shadow">{t("scan.hint")}</p>
        {hint && <span className={`absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-sm font-bold ${hint.ok ? "bg-green-600 text-white" : "bg-amber-400 text-amber-950"}`}>
          {hint.ok ? `✓ ${t("scan.good")}` : t(`scan.${hint.issues[0]}`)}</span>}
        {(busy || msg) && <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-8 text-center text-lg font-semibold text-white" onClick={() => !busy && setMsg("")}>{msg}</div>}
      </div>
      <div className="bg-zinc-900 p-3 text-white">
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-5 w-5" checked={consent} onChange={(e) => { setConsent(e.target.checked); localStorage.setItem("consent", e.target.checked ? "1" : "0"); }} />
          {t("scan.consent")}
        </label>
        <div className="flex items-center justify-around">
          <button className="btn btn-ghost !bg-zinc-800 !text-white !border-zinc-700" onClick={() => file.current?.click()} disabled={busy}>🖼 {t("scan.gallery")}</button>
          <button aria-label={t("scan.shutter")} onClick={snap} disabled={busy || !cam}
            className="h-20 w-20 rounded-full border-4 border-white bg-green-600 active:scale-90 disabled:opacity-40" />
          <span className="w-24" />
        </div>
        <input ref={file} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      {review && (
        <div className="absolute inset-0 flex items-end bg-black/70">
          <div className="w-full rounded-t-3xl bg-white p-5 text-zinc-900">
            <h2 className="text-lg font-bold">⚠ {t("scan.poor")}</h2>
            <ul className="my-2 list-disc pl-5 text-sm">{review.issues.map((i) => <li key={i}>{t(`scan.${i}`)}</li>)}</ul>
            <div className="mt-3 flex gap-3">
              <button className="btn btn-primary flex-1" onClick={() => setReview(null)}>{t("scan.retake")}</button>
              <button className="btn btn-ghost flex-1" onClick={() => submit(review.blob, true)}>{t("scan.useAnyway")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
