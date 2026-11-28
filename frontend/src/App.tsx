import "./index.css";

export default function App() {
  return (
    <main className="min-h-screen bg-[#0b0e14] text-zinc-100 px-8 py-16 font-sans">
      <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
        NIRMAN 6.0 — Team Unplayed
      </p>
      <h1 className="mt-4 text-4xl font-semibold">
        CARRY — Conveyor Anomaly Recognition and Reliability Yield
      </h1>
      <p className="mt-4 max-w-2xl text-zinc-300 leading-relaxed">
        Progress snapshot. The FastAPI backend, detection pipeline, persistence
        layer, launch scripts, and this frontend scaffold are in the repo.
        Live monitor, sources, incidents, analytics, 3D model, and digital twin
        UI will land in the final submission.
      </p>
      <p className="mt-8 text-sm text-zinc-500">
        Backend default: http://127.0.0.1:8000. Frontend dev server:
        http://127.0.0.1:5173 (proxies /api and /ws). Copy backend/.env.example
        and frontend/.env.example to .env locally. YOLO weights are not
        committed; DETECTOR=mock runs without them.
      </p>
    </main>
  );
}