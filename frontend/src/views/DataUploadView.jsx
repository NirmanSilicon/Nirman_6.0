
import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FlaskConical,
  Play,
  UploadCloud,
} from "lucide-react";

import { analyzeWindow, retrainPlant } from "../api/client";
import { AlarmLogAnalyzerCard } from "../components/AlarmLogAnalyzerCard";
import {
  formatNumber,
  formatPct,
  getSeverityBadgeClass,
} from "../utils/formatters";

// ======================================================
// SAMPLE CSV GENERATOR
// ======================================================

function buildSamplePlantCsv() {
  const header = "TEMP_A,PRESS_B,FLOW_C,LEVEL_D,STATUS";
  const rows = [header];

  for (let episode = 0; episode < 2; episode += 1) {
    // 25 normal rows + 25 fault 1 rows + 25 fault 2 rows.
    for (let index = 0; index < 75; index += 1) {
      const status =
        index < 25 ? 0 : index < 50 ? 1 : 2;

      const noise =
        ((index * 7 + episode * 3) % 11) * 0.03 - 0.15;

      const temp = status === 1 ? 142 + noise : 100 + noise;
      const press = status === 2 ? 78 + noise : 50 + noise;
      const flow = status === 1 ? 18 + noise : 30 + noise;
      const level = status === 2 ? 65 + noise : 45 + noise;

      rows.push(
        `${temp.toFixed(3)},${press.toFixed(3)},${flow.toFixed(3)},${level.toFixed(3)},${status}`
      );
    }
  }

  return rows.join("\n");
}

// ======================================================
// SENSOR TREND GENERATOR
// ======================================================

function buildLocalSensorTrends(rows, analysis) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {};
  }

  const keys = Object.keys(rows[0] || {});

  // Keep only columns containing numeric readings.
  const numericKeys = keys.filter((key) =>
    rows.some((row) => {
      const value = row?.[key];

      return (
        value !== null &&
        value !== undefined &&
        value !== "" &&
        Number.isFinite(Number(value))
      );
    })
  );

  const candidates = [];

  if (
    analysis?.first_triggered_tag &&
    numericKeys.includes(analysis.first_triggered_tag)
  ) {
    candidates.push(analysis.first_triggered_tag);
  }

  const shapEvidence = Array.isArray(analysis?.shap_evidence)
    ? analysis.shap_evidence
    : [];

  for (const evidence of shapEvidence) {
    if (
      evidence?.sensor &&
      numericKeys.includes(evidence.sensor) &&
      !candidates.includes(evidence.sensor)
    ) {
      candidates.push(evidence.sensor);
    }
  }

  const priorityAlarms = Array.isArray(analysis?.priority_alarms)
    ? analysis.priority_alarms
    : [];

  for (const alarm of priorityAlarms) {
    if (
      alarm?.tag &&
      numericKeys.includes(alarm.tag) &&
      !candidates.includes(alarm.tag)
    ) {
      candidates.push(alarm.tag);
    }
  }

  for (const key of numericKeys) {
    if (!candidates.includes(key)) {
      candidates.push(key);
    }
  }

  const trends = {};

  for (const tag of candidates.slice(0, 5)) {
    trends[tag] = rows.map((row) => {
      const value = row?.[tag];

      return (
        value !== null &&
        value !== undefined &&
        value !== "" &&
        Number.isFinite(Number(value))
      )
        ? Number(value)
        : null;
    });
  }

  return trends;
}

// ======================================================
// JSON WINDOW VALIDATION
// ======================================================

function validateWindowRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return "Provide a non-empty array of sensor readings.";
  }

  if (!rows.every(
    (row) =>
      row !== null &&
      typeof row === "object" &&
      !Array.isArray(row)
  )) {
    return "Every window entry must be a JSON object containing sensor readings.";
  }

  const firstRowKeys = Object.keys(rows[0]);

  if (firstRowKeys.length === 0) {
    return "Sensor reading objects cannot be empty.";
  }

  const hasNumericSensor = rows.some((row) =>
    Object.values(row).some(
      (value) =>
        value !== null &&
        value !== undefined &&
        value !== "" &&
        Number.isFinite(Number(value))
    )
  );

  if (!hasNumericSensor) {
    return "At least one numeric sensor reading is required.";
  }

  return null;
}

// ======================================================
// DATA UPLOAD VIEW
// ======================================================

export function DataUploadView({
  activePlant,
  onPlantRetrained,
  onAnalysisComplete,
  onAlarmLogAnalyzed,
}) {
  // --------------------------------------------------
  // RETRAIN FORM STATE
  // --------------------------------------------------

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

  // --------------------------------------------------
  // ANALYSIS FORM STATE
  // --------------------------------------------------

  const [jsonText, setJsonText] = useState("");

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  const [analyzeResult, setAnalyzeResult] = useState(null);

  const retrainAbortRef = useRef(null);
  const analyzeAbortRef = useRef(null);

  useEffect(() => {
    return () => {
      retrainAbortRef.current?.abort();
      analyzeAbortRef.current?.abort();
    };
  }, []);

  // --------------------------------------------------
  // FILE DOWNLOAD HELPER
  // --------------------------------------------------

  const downloadTextFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    // Allow the browser to begin the download before cleanup.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadSampleCsv = () => {
    downloadTextFile(
      buildSamplePlantCsv(),
      "sample_plant_telemetry.csv",
      "text/csv;charset=utf-8;"
    );
  };

  // --------------------------------------------------
  // FILE SELECTION
  // --------------------------------------------------

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;

    setFile(null);
    setRetrainError(null);
    setRetrainResult(null);

    if (!selectedFile) {
      return;
    }

    const isCsv =
      selectedFile.name.toLowerCase().endsWith(".csv") ||
      selectedFile.type === "text/csv";

    if (!isCsv) {
      setRetrainError("Please select a CSV file.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size === 0) {
      setRetrainError("The selected CSV file is empty.");
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
  };

  // --------------------------------------------------
  // CUSTOM PLANT RETRAIN
  // --------------------------------------------------

  const handleRetrainSubmit = async (event) => {
    event.preventDefault();

    setRetrainError(null);
    setRetrainResult(null);

    if (!file) {
      setRetrainError("Please select a labeled CSV file to upload.");
      return;
    }

    const cleanedPlantId = plantId.trim();
    const cleanedPlantName = plantName.trim();
    const cleanedStatusCol = statusCol.trim() || "STATUS";

    if (!cleanedPlantId) {
      setRetrainError("Plant ID is required.");
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(cleanedPlantId)) {
      setRetrainError(
        "Plant ID can contain only letters, numbers, underscores, and hyphens."
      );
      return;
    }

    const parsedWindowSize = Number(windowSize);
    const parsedNormalLabel = Number(normalLabel);

    if (
      !Number.isInteger(parsedWindowSize) ||
      parsedWindowSize < 5 ||
      parsedWindowSize > 200
    ) {
      setRetrainError("Window size must be an integer between 5 and 200.");
      return;
    }

    if (!Number.isFinite(parsedNormalLabel)) {
      setRetrainError("Normal class label must be a valid number.");
      return;
    }

    retrainAbortRef.current?.abort();
    const controller = new AbortController();
    retrainAbortRef.current = controller;

    setRetraining(true);

    try {
      const response = await retrainPlant(
        {
          file,
          plant_id: cleanedPlantId,
          plant_name: cleanedPlantName || undefined,
          status_col: cleanedStatusCol,
          timestamp_col: timestampCol.trim() || undefined,
          normal_label: parsedNormalLabel,
          window_size: parsedWindowSize,
          activate,
        },
        { signal: controller.signal }
      );

      setRetrainResult(response);

      if (typeof onPlantRetrained === "function") {
        onPlantRetrained(response);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setRetrainError(
        error?.message || "Failed to train custom plant model."
      );
    } finally {
      if (!controller.signal.aborted) {
        setRetraining(false);
      }
    }
  };

  // --------------------------------------------------
  // LOAD SAMPLE SENSOR WINDOW
  // --------------------------------------------------

  const handleLoadSampleWindow = () => {
    const configuredColumns = Array.isArray(activePlant?.sensor_cols)
      ? activePlant.sensor_cols
      : [];

    const columns =
      configuredColumns.length > 0
        ? configuredColumns
        : [
            ...Array.from({ length: 41 }, (_, index) =>
              `XMEAS(${index + 1})`
            ),
            ...Array.from({ length: 11 }, (_, index) =>
              `XMV(${index + 1})`
            ),
          ];

    const requestedWindow = Number(activePlant?.window_size);
    const safeWindowSize =
      Number.isInteger(requestedWindow) && requestedWindow > 0
        ? requestedWindow
        : 20;

    const sampleRows = Array.from(
      { length: safeWindowSize },
      (_, rowIndex) => {
        const row = {};

        columns.forEach((column, columnIndex) => {
          const base = 40 + (columnIndex % 7) * 8;

          const drift =
            rowIndex > safeWindowSize / 2 && columnIndex === 0
              ? 18
              : 0;

          row[column] = Number(
            (
              base +
              drift +
              Math.sin(rowIndex + columnIndex) * 0.6
            ).toFixed(4)
          );
        });

        return row;
      }
    );

    setJsonText(
      JSON.stringify({ window: sampleRows }, null, 2)
    );

    setAnalyzeError(null);
    setAnalyzeResult(null);
  };

  // --------------------------------------------------
  // RUN SENSOR WINDOW ANALYSIS
  // --------------------------------------------------

  const handleAnalyzeSubmit = async (event) => {
    event.preventDefault();

    setAnalyzeError(null);
    setAnalyzeResult(null);

    let parsed;

    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setAnalyzeError(
        'Invalid JSON syntax. Provide {"window": [...]} or a JSON array of rows.'
      );
      return;
    }

    const rows = Array.isArray(parsed)
      ? parsed
      : parsed?.window;

    const validationError = validateWindowRows(rows);

    if (validationError) {
      setAnalyzeError(validationError);
      return;
    }

    analyzeAbortRef.current?.abort();
    const controller = new AbortController();
    analyzeAbortRef.current = controller;

    setAnalyzing(true);

    try {
      const response = await analyzeWindow(rows, {
        signal: controller.signal,
      });

      if (!response || typeof response !== "object") {
        throw new Error("The API returned an invalid analysis response.");
      }

      const enriched = {
        ...response,
        window_size: rows.length,
        step_index: 0,
        sensor_trends: buildLocalSensorTrends(rows, response),
      };

      setAnalyzeResult(enriched);

      if (typeof onAnalysisComplete === "function") {
        onAnalysisComplete(
          enriched,
          `${activePlant?.plant_id || "active"} (${rows.length} rows)`
        );
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setAnalyzeError(
        error?.message || "Analysis request failed."
      );
    } finally {
      if (!controller.signal.aborted) {
        setAnalyzing(false);
      }
    }
  };

  // --------------------------------------------------
  // SAFE ANALYSIS RESULT VALUES
  // --------------------------------------------------

  const analysisRootCause = analyzeResult?.root_cause || {};

  const retrainedClasses = Array.isArray(retrainResult?.classes)
    ? retrainResult.classes
    : [];

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

      {/* ==================================================
          LEFT CARD — CUSTOM PLANT RETRAIN
      ================================================== */}

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

        <form
          onSubmit={handleRetrainSubmit}
          className="space-y-4"
        >

          {/* CSV FILE INPUT */}

          <div>

            <p
              id="csv-upload-label"
              className="block text-xs font-semibold text-[#0F172A] mb-1.5"
            >
              Labeled Telemetry CSV File
            </p>

            <label
              htmlFor="csv-upload-input"
              aria-labelledby="csv-upload-label"
              className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-[#00A8B5] focus-within:border-[#00A8B5] focus-within:ring-2 focus-within:ring-[#00A8B5]/30 rounded-2xl bg-[#F4F8FB]/60 p-5 cursor-pointer transition-colors"
            >

              <FileSpreadsheet className="w-7 h-7 text-[#00A8B5] mb-2" />

              <span className="text-xs font-semibold text-[#0F172A] text-center break-all">
                {file
                  ? file.name
                  : "Choose CSV file (comma or semicolon delimited)"}
              </span>

              <span className="text-[11px] text-slate-500 mt-1 text-center">
                Requires numeric sensor columns and labeled fault/normal classes
              </span>

              <input
                id="csv-upload-input"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="sr-only"
                disabled={retraining}
              />

            </label>

          </div>

          {/* PLANT CONFIGURATION */}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">

            <div>

              <label
                htmlFor="retrain-plant-id"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Plant ID <span className="text-rose-500">*</span>
              </label>

              <input
                id="retrain-plant-id"
                type="text"
                required
                value={plantId}
                onChange={(event) => setPlantId(event.target.value)}
                placeholder="e.g. alpha_refinery"
                disabled={retraining}
                className="w-full bg-[#F4F8FB] border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00A8B5] disabled:opacity-60"
              />

            </div>

            <div>

              <label
                htmlFor="retrain-plant-name"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Plant Display Name
              </label>

              <input
                id="retrain-plant-name"
                type="text"
                value={plantName}
                onChange={(event) => setPlantName(event.target.value)}
                placeholder="Alpha Refinery Unit"
                disabled={retraining}
                className="w-full bg-[#F4F8FB] border border-slate-200 rounded-xl px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00A8B5] disabled:opacity-60"
              />

            </div>

            <div>

              <label
                htmlFor="retrain-label-col"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Label Column (
                <code className="font-mono text-[#008B96]">
                  status_col
                </code>
                )
              </label>

              <input
                id="retrain-label-col"
                type="text"
                value={statusCol}
                onChange={(event) => setStatusCol(event.target.value)}
                disabled={retraining}
                className="w-full bg-[#F4F8FB] border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00A8B5] disabled:opacity-60"
              />

            </div>

            <div>

              <label
                htmlFor="retrain-window-size"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Window Size (steps)
              </label>

              <input
                id="retrain-window-size"
                type="number"
                min={5}
                max={200}
                step={1}
                value={windowSize}
                onChange={(event) =>
                  setWindowSize(
                    event.target.value === ""
                      ? ""
                      : Number(event.target.value)
                  )
                }
                disabled={retraining}
                className="w-full bg-[#F4F8FB] border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00A8B5] disabled:opacity-60"
              />

            </div>

            <div>

              <label
                htmlFor="retrain-timestamp-col"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Timestamp Column (optional)
              </label>

              <input
                id="retrain-timestamp-col"
                type="text"
                value={timestampCol}
                onChange={(event) => setTimestampCol(event.target.value)}
                placeholder="Optional"
                disabled={retraining}
                className="w-full bg-[#F4F8FB] border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00A8B5] disabled:opacity-60"
              />

            </div>

            <div>

              <label
                htmlFor="retrain-normal-label"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Normal Class Label
              </label>

              <input
                id="retrain-normal-label"
                type="number"
                value={normalLabel}
                onChange={(event) =>
                  setNormalLabel(
                    event.target.value === ""
                      ? ""
                      : Number(event.target.value)
                  )
                }
                disabled={retraining}
                className="w-full bg-[#F4F8FB] border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00A8B5] disabled:opacity-60"
              />

            </div>

          </div>

          {/* ACTIVATE MODEL */}

          <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer pt-1">

            <input
              type="checkbox"
              checked={activate}
              onChange={(event) => setActivate(event.target.checked)}
              disabled={retraining}
              className="w-4 h-4 rounded accent-[#00A8B5]"
            />

            Activate immediately after training completes

          </label>

          {/* RETRAIN ERROR */}

          {retrainError && (
            <div
              role="alert"
              className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700"
            >
              {retrainError}
            </div>
          )}

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={retraining}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00A8B5] hover:bg-[#008B96] text-white text-sm font-semibold shadow-xs disabled:opacity-60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] focus-visible:ring-offset-2"
          >

            <UploadCloud className="w-4 h-4" />

            {retraining
              ? "Training Custom XGBoost Model..."
              : "Upload & Train Plant Model"}

          </button>

        </form>

        {/* RETRAIN RESULT */}

        {retrainResult && (

          <div className="mt-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 p-4 space-y-2.5">

            <div className="flex items-center justify-between gap-2">

              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4" />
                Model Trained ({retrainResult.plant_id || plantId})
              </span>

              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white text-emerald-700 border border-emerald-200">
                {retrainResult.activated ? "Activated Live" : "Saved"}
              </span>

            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">

              <div className="bg-white rounded-xl p-2.5 border border-emerald-100">
                <div className="text-[11px] text-slate-500">
                  Accuracy
                </div>

                <div className="font-bold text-[#0F172A] tabular-nums">
                  {formatPct(retrainResult.sample_accuracy, true)}
                </div>
              </div>

              <div className="bg-white rounded-xl p-2.5 border border-emerald-100">
                <div className="text-[11px] text-slate-500">
                  Macro F1
                </div>

                <div className="font-bold text-[#0F172A] tabular-nums">
                  {formatNumber(retrainResult.sample_macro_f1, 4)}
                </div>
              </div>

              <div className="bg-white rounded-xl p-2.5 border border-emerald-100">
                <div className="text-[11px] text-slate-500">
                  Train Time
                </div>

                <div className="font-bold text-[#0F172A] tabular-nums">
                  {formatNumber(retrainResult.train_time_sec, 2)} s
                </div>
              </div>

              <div className="bg-white rounded-xl p-2.5 border border-emerald-100">
                <div className="text-[11px] text-slate-500">
                  Classes
                </div>

                <div className="font-mono font-semibold text-[#0F172A] truncate">
                  [{retrainedClasses.join(", ")}]
                </div>
              </div>

            </div>

          </div>

        )}

      </section>

      {/* ==================================================
          RIGHT CARD — SENSOR WINDOW ANALYZER
      ================================================== */}

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
                POST JSON telemetry to{" "}
                <code className="font-mono">/api/v1/analyze</code>{" "}
                for{" "}
                <strong className="font-mono text-[#0F172A]">
                  {activePlant?.plant_id || "tep"}
                </strong>{" "}
                ({activePlant?.n_sensors ?? 52} sensors, ≥
                {activePlant?.window_size ?? 20} rows)
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={handleLoadSampleWindow}
            disabled={analyzing}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-[#F4F8FB] hover:bg-slate-100 text-xs font-semibold text-[#0F172A] transition-colors cursor-pointer shrink-0 disabled:opacity-60"
          >
            Load Sample Window
          </button>

        </div>

        <form
          onSubmit={handleAnalyzeSubmit}
          className="space-y-4 flex-1 flex flex-col"
        >

          {/* JSON EDITOR */}

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
              onChange={(event) => {
                setJsonText(event.target.value);
                setAnalyzeError(null);
                setAnalyzeResult(null);
              }}
              placeholder={'{"window": [{"XMEAS(1)": 0.25}, ...]}'}
              disabled={analyzing}
              spellCheck={false}
              className="w-full h-64 bg-[#F4F8FB] border border-slate-200 rounded-xl p-3.5 text-xs font-mono text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00A8B5] disabled:opacity-60"
            />

          </div>

          {/* ANALYSIS ERROR */}

          {analyzeError && (
            <div
              role="alert"
              className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700"
            >
              {analyzeError}
            </div>
          )}

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={analyzing || !jsonText.trim()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-sm font-semibold shadow-xs disabled:opacity-60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] focus-visible:ring-offset-2"
          >

            <Play className="w-4 h-4 text-[#00A8B5]" />

            {analyzing
              ? "Analyzing Window..."
              : "Run Window Analysis"}

          </button>

        </form>

        {/* ANALYSIS RESULT */}

        {analyzeResult && (

          <div className="mt-5 rounded-2xl bg-[#F4F8FB] border border-slate-200 p-4 space-y-2">

            <div className="flex items-center justify-between gap-2">

              <div className="text-xs font-bold text-[#0F172A]">
                Diagnosis: Fault{" "}
                {analysisRootCause.fault_id ?? "—"} —{" "}
                {analysisRootCause.name || "Unknown"}
              </div>

              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getSeverityBadgeClass(
                  analysisRootCause.severity_level
                )}`}
              >
                {analysisRootCause.severity_level || "UNKNOWN"}
              </span>

            </div>

            <div className="flex flex-wrap gap-4 text-xs text-slate-600 tabular-nums">

              <span>
                Confidence:{" "}
                <strong className="text-[#0F172A]">
                  {formatPct(analysisRootCause.confidence, true)}
                </strong>
              </span>

              <span>
                Alarms:{" "}
                <strong className="text-[#0F172A]">
                  {analyzeResult.raw_alarm_count ?? "—"} →{" "}
                  {analyzeResult.confirmed_alarm_count ?? "—"}
                </strong>{" "}
                ({formatPct(analyzeResult.reduction_pct)} reduced)
              </span>

              <span>
                Latency:{" "}
                <strong className="font-mono text-[#0F172A]">
                  {formatNumber(analyzeResult.latency_ms, 1)} ms
                </strong>
              </span>

            </div>

          </div>

        )}

      </section>

      <AlarmLogAnalyzerCard
        onDownloadTextFile={downloadTextFile}
        onAlarmLogAnalyzed={onAlarmLogAnalyzed}
      />

    </div>
  );
}

