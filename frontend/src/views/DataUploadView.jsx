import { useState } from "react";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FlaskConical,
  Play,
  UploadCloud,
} from "lucide-react";
import { analyzeWindow, retrainPlant } from "../api/client";
import { formatNumber, formatPct, getSeverityBadgeClass } from "../utils/formatters";

function buildSamplePlantCsv() {
  const header = "TEMP_A,PRESS_B,FLOW_C,LEVEL_D,STATUS";
  const rows = [header];
  for (let ep = 0; ep < 2; ep += 1) {
    // 25 normal rows + 25 fault 1 rows + 25 fault 2 rows per episode
    for (let i = 0; i < 75; i += 1) {
      const status = i < 25 ? 0 : i < 50 ? 1 : 2;
      const noise = ((i * 7 + ep * 3) % 11) * 0.03 - 0.15;
      const temp = status === 1 ? 142 + noise : 100 + noise;
      const press = status === 2 ? 78 + noise : 50 + noise;
      const flow = status === 1 ? 18 + noise : 30 + noise;
      const level = status === 2 ? 65 + noise : 45 + noise;
      rows.push(`${temp.toFixed(3)},${press.toFixed(3)},${flow.toFixed(3)},${level.toFixed(3)},${status}`);
    }
  }
  return rows.join("\n");
}

function buildLocalSensorTrends(rows, analysis) {
  if (!rows || rows.length === 0) return {};
  const keys = Object.keys(rows[0]);
  const candidates = [];
  if (analysis.first_triggered_tag && keys.includes(analysis.first_triggered_tag)) {
    candidates.push(analysis.first_triggered_tag);
  }
  for (const ev of analysis.shap_evidence || []) {
    if (ev.sensor && keys.includes(ev.sensor) && !candidates.includes(ev.sensor)) {
      candidates.push(ev.sensor);
    }
  }
  for (const al of analysis.priority_alarms || []) {
    if (al.tag && keys.includes(al.tag) && !candidates.includes(al.tag)) {
      candidates.push(al.tag);
    }
  }
  for (const k of keys.slice(0, 5)) {
    if (!candidates.includes(k)) candidates.push(k);
  }
  const trends = {};
  for (const tag of candidates.slice(0, 5)) {
    trends[tag] = rows.map((r) => Number(r[tag] ?? 0));
  }
  return trends;
}

/**
 * View 2 — Data Upload & Quick Retrain.
 * Connects to POST /api/v1/plants/retrain (multipart CSV) and POST /api/v1/analyze (JSON window).
 */
export function DataUploadView({
  activePlant,
  onPlantRetrained,
  onAnalysisComplete,
}) {
  // Retrain form state
  const [file, setFile] = useState(null);
  const [plantId, setPlantId] = useState("custom_unit_1");
  const [plantName, setPlantName] = useState("Custom Plant Unit 1");
  const [statusCol, setStatusCol] = useState("STATUS");
  const [timestampCol, setTimestampCol] = useState("");
  const [normalLabel, setNormalLabel] = useState(0);
  const [windowSize, setWindowSize] = useState(20);
  const [activate, setActivate] = useState(true);

  const [retraining, setRetraining] = useState(false);
  const [retrainError, setRetrainError] = useState(null);
  const [retrainResult, setRetrainResult] = useState(null);

  // Custom JSON /analyze state
  const [jsonText, setJsonText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  const [analyzeResult, setAnalyzeResult] = useState(null);

  const handleDownloadSampleCsv = () => {
    const csvContent = buildSamplePlantCsv();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sample_plant_telemetry.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRetrainSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setRetrainError("Please select a labeled CSV file to upload.");
      return;
    }
    setRetraining(true);
    setRetrainError(null);
    try {
      const response = await retrainPlant({
        file,
        plant_id: plantId.trim(),
        plant_name: plantName.trim() || undefined,
        status_col: statusCol.trim() || "STATUS",
        timestamp_col: timestampCol.trim() || undefined,
        normal_label: Number(normalLabel) || 0,
        window_size: Number(windowSize) || 20,
        activate,
      });
      setRetrainResult(response);
      onPlantRetrained?.(response);
    } catch (err) {
      setRetrainError(err?.message || "Failed to train custom plant model.");
    } finally {
      setRetraining(false);
    }
  };

  const handleLoadSampleWindow = () => {
    const cols =
      activePlant?.sensor_cols && activePlant.sensor_cols.length > 0
        ? activePlant.sensor_cols
        : [
            ...Array.from({ length: 41 }, (_, i) => `XMEAS(${i + 1})`),
            ...Array.from({ length: 11 }, (_, i) => `XMV(${i + 1})`),
          ];
    const reqWindow = activePlant?.window_size || 20;
    const sampleRows = Array.from({ length: reqWindow }, (_, rIdx) => {
      const row = {};
      cols.forEach((col, cIdx) => {
        const base = 40 + (cIdx % 7) * 8;
        const drift = rIdx > reqWindow / 2 && cIdx === 0 ? 18 : 0;
        row[col] = Number((base + drift + Math.sin(rIdx + cIdx) * 0.6).toFixed(4));
      });
      return row;
    });
    setJsonText(JSON.stringify({ window: sampleRows }, null, 2));
    setAnalyzeError(null);
  };

  const handleAnalyzeSubmit = async (e) => {
    e.preventDefault();
    setAnalyzeError(null);
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setAnalyzeError("Invalid JSON syntax. Provide {\"window\": [...]} or a JSON array of rows.");
      return;
    }

    const rows = Array.isArray(parsed) ? parsed : parsed?.window;
    if (!Array.isArray(rows) || rows.length === 0) {
      setAnalyzeError("JSON must include a non-empty array under \"window\" (or be a raw array).");
      return;
    }

    setAnalyzing(true);
    try {
      const response = await analyzeWindow(rows);
      const enriched = {
        ...response,
        window_size: rows.length,
        step_index: 0,
        sensor_trends: buildLocalSensorTrends(rows, response),
      };
      setAnalyzeResult(enriched);
      onAnalysisComplete?.(
        enriched,
        `${activePlant?.plant_id || "active"} (${rows.length} rows)`,
      );
    } catch (err) {
      setAnalyzeError(err?.message || "Analysis request failed.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Left Card: Multi-Plant CSV Quick Retrain */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00A8B5]/12 text-[#00A8B5] flex items-center justify-center shrink-0">
              <UploadCloud className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                Custom Plant Quick Retrain
              </h2>
              <p className="text-xs text-slate-500">
                Upload a labeled factory CSV to train and activate an XGBoost model
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadSampleCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-[#F4F8FB] hover:bg-slate-100 text-xs font-semibold text-[#0F172A] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#00A8B5]" />
            Sample CSV
          </button>
        </div>

        <form onSubmit={handleRetrainSubmit} className="space-y-4">
          {/* File Dropzone */}
          <div>
            <label
              htmlFor="csv-upload-input"
              className="block text-xs font-semibold text-[#0F172A] mb-1.5"
            >
              Labeled Telemetry CSV File
            </label>
            <label
              htmlFor="csv-upload-input"
              className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-[#00A8B5] rounded-2xl bg-[#F4F8FB]/60 p-5 cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-7 h-7 text-[#00A8B5] mb-2" />
              <span className="text-xs font-semibold text-[#0F172A]">
                {file ? file.name : "Choose CSV file (comma or semicolon delimited)"}
              </span>
              <span className="text-[11px] text-slate-500 mt-1">
                Requires ≥2 numeric sensor columns and ≥2 fault/normal classes
              </span>
              <input
                id="csv-upload-input"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="sr-only"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="retrain-plant-id" className="block text-xs font-semibold text-slate-700 mb-1">
                Plant ID <span className="text-rose-500">*</span>
              </label>
              <input
                id="retrain-plant-id"
                type="text"
                required
                value={plantId}
                onChange={(e) => setPlantId(e.target.value)}
                placeholder="e.g. alpha_refinery"
                className="w-full bg-[#F4F8FB] border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00A8B5]"
              />
            </div>

            <div>
              <label htmlFor="retrain-plant-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Plant Display Name
              </label>
              <input
                id="retrain-plant-name"
                type="text"
                value={plantName}
                onChange={(e) => setPlantName(e.target.value)}
                placeholder="Alpha Refinery Unit"
                className="w-full bg-[#F4F8FB] border border-slate-200 rounded-xl px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00A8B5]"
              />
            </div>

            <div>
              <label htmlFor="retrain-label-col" className="block text-xs font-semibold text-slate-700 mb-1">
                Label Column (<code className="font-mono text-[#008B96]">status_col</code>)
              </label>
              <input
                id="retrain-label-col"
                type="text"
                value={statusCol}
                onChange={(e) => setStatusCol(e.target.value)}
                className="w-full bg-[#F4F8FB] border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00A8B5]"
              />
            </div>

            <div>
              <label htmlFor="retrain-window-size" className="block text-xs font-semibold text-slate-700 mb-1">
                Window Size (steps)
              </label>
              <input
                id="retrain-window-size"
                type="number"
                min={5}
                max={200}
                value={windowSize}
                onChange={(e) => setWindowSize(Number(e.target.value) || 20)}
                className="w-full bg-[#F4F8FB] border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00A8B5]"
              />
            </div>

            <div>
              <label htmlFor="retrain-timestamp-col" className="block text-xs font-semibold text-slate-700 mb-1">
                Timestamp Column (optional)
              </label>
              <input
                id="retrain-timestamp-col"
                type="text"
                value={timestampCol}
                onChange={(e) => setTimestampCol(e.target.value)}
                placeholder="Optional"
                className="w-full bg-[#F4F8FB] border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00A8B5]"
              />
            </div>

            <div>
              <label htmlFor="retrain-normal-label" className="block text-xs font-semibold text-slate-700 mb-1">
                Normal Class Label
              </label>
              <input
                id="retrain-normal-label"
                type="number"
                value={normalLabel}
                onChange={(e) => setNormalLabel(Number(e.target.value) || 0)}
                className="w-full bg-[#F4F8FB] border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00A8B5]"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={activate}
              onChange={(e) => setActivate(e.target.checked)}
              className="w-4 h-4 rounded accent-[#00A8B5]"
            />
            Activate immediately after training completes
          </label>

          {retrainError && (
            <div role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700">
              {retrainError}
            </div>
          )}

          <button
            type="submit"
            disabled={retraining}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00A8B5] hover:bg-[#008B96] text-white text-sm font-semibold shadow-xs disabled:opacity-60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] focus-visible:ring-offset-2"
          >
            <UploadCloud className="w-4 h-4" />
            {retraining ? "Training Custom XGBoost Model..." : "Upload & Train Plant Model"}
          </button>
        </form>

        {retrainResult && (
          <div className="mt-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4" />
                Model Trained ({retrainResult.plant_id})
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white text-emerald-700 border border-emerald-200">
                {retrainResult.activated ? "Activated Live" : "Saved"}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-white rounded-xl p-2.5 border border-emerald-100">
                <div className="text-[11px] text-slate-500">Accuracy</div>
                <div className="font-bold text-[#0F172A] tabular-nums">
                  {formatPct(retrainResult.sample_accuracy, true)}
                </div>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-emerald-100">
                <div className="text-[11px] text-slate-500">Macro F1</div>
                <div className="font-bold text-[#0F172A] tabular-nums">
                  {formatNumber(retrainResult.sample_macro_f1, 4)}
                </div>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-emerald-100">
                <div className="text-[11px] text-slate-500">Train Time</div>
                <div className="font-bold text-[#0F172A] tabular-nums">
                  {formatNumber(retrainResult.train_time_sec, 2)} s
                </div>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-emerald-100">
                <div className="text-[11px] text-slate-500">Classes</div>
                <div className="font-mono font-semibold text-[#0F172A] truncate">
                  [{retrainResult.classes.join(", ")}]
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Right Card: Custom JSON Sensor Window Tester */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <FlaskConical className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                Custom Sensor Window Analyzer
              </h2>
              <p className="text-xs text-slate-500">
                POST JSON telemetry to <code className="font-mono">/api/v1/analyze</code> for{" "}
                <strong className="font-mono text-[#0F172A]">{activePlant?.plant_id || "tep"}</strong>{" "}
                ({activePlant?.n_sensors ?? 52} sensors, ≥{activePlant?.window_size ?? 20} rows)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLoadSampleWindow}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-[#F4F8FB] hover:bg-slate-100 text-xs font-semibold text-[#0F172A] transition-colors cursor-pointer shrink-0"
          >
            Load Sample Window
          </button>
        </div>

        <form onSubmit={handleAnalyzeSubmit} className="space-y-4 flex-1 flex flex-col">
          <div className="flex-1">
            <label
              htmlFor="analyze-json-textarea"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Sensor Window Payload (JSON)
            </label>
            <textarea
              id="analyze-json-textarea"
              rows={12}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='{"window": [{"XMEAS(1)": 0.25, ...}, ...]}'
              className="w-full h-64 bg-[#F4F8FB] border border-slate-200 rounded-xl p-3.5 text-xs font-mono text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00A8B5]"
            />
          </div>

          {analyzeError && (
            <div role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700">
              {analyzeError}
            </div>
          )}

          <button
            type="submit"
            disabled={analyzing || !jsonText.trim()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-sm font-semibold shadow-xs disabled:opacity-60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] focus-visible:ring-offset-2"
          >
            <Play className="w-4 h-4 text-[#00A8B5]" />
            {analyzing ? "Analyzing Window..." : "Run Window Analysis"}
          </button>
        </form>

        {analyzeResult && (
          <div className="mt-5 rounded-2xl bg-[#F4F8FB] border border-slate-200 p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-bold text-[#0F172A]">
                Diagnosis: Fault {analyzeResult.root_cause.fault_id} — {analyzeResult.root_cause.name}
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getSeverityBadgeClass(
                  analyzeResult.root_cause.severity_level,
                )}`}
              >
                {analyzeResult.root_cause.severity_level}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-slate-600 tabular-nums">
              <span>
                Confidence: <strong className="text-[#0F172A]">{formatPct(analyzeResult.root_cause.confidence, true)}</strong>
              </span>
              <span>
                Alarms: <strong className="text-[#0F172A]">{analyzeResult.raw_alarm_count} → {analyzeResult.confirmed_alarm_count}</strong> ({formatPct(analyzeResult.reduction_pct)} reduced)
              </span>
              <span>
                Latency: <strong className="font-mono text-[#0F172A]">{formatNumber(analyzeResult.latency_ms, 1)} ms</strong>
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
