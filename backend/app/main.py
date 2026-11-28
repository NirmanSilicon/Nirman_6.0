from __future__ import annotations
from app.routers.rul import router as rul_router

import hashlib
import json
import os
import shutil
import tempfile
import subprocess
import sys
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pandas as pd
from app.routers.rul import router as rul_router

from app.services.cmapss import DatasetError, EXPECTED_FILES, preprocess_fd001, validate_fd001
from app.services.telemetry import TelemetryController, TelemetryDataError, load_engine_rows
from app.services.phase3_anomaly import (
    AnomalyModelError, analyze_historical_engine, calculate_scores, get_bundle,
    list_engines as list_fd001_anomaly_engines, model_status as phase3_model_status,
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = Path(os.getenv("AEROSENTRY_FD001_DIR", PROJECT_ROOT / "data" / "raw" / "FD001"))
OUTPUT_DIR = Path(os.getenv("AEROSENTRY_FD001_OUTPUT", PROJECT_ROOT / "data" / "processed" / "FD001"))
TELEMETRY_CSV_PATH = Path(os.getenv(
    "AEROSENTRY_TELEMETRY_CSV", PROJECT_ROOT / "data" / "telemetry" / "telemetry_sample.csv"
))
NCMAPSS_ROOT = PROJECT_ROOT / "phase4_ncmapss"
NCMAPSS_FILE = NCMAPSS_ROOT / "data" / "raw" / "N-CMAPSS_DS05.h5"
NCMAPSS_REPORT = NCMAPSS_ROOT / "outputs" / "ncmapss_ds05_inspection.json"
NCMAPSS_DEV_FLIGHTS = NCMAPSS_ROOT / "data" / "processed" / "ncmapss_ds05_dev_flights.csv"
NCMAPSS_TEST_FLIGHTS = NCMAPSS_ROOT / "data" / "processed" / "ncmapss_ds05_test_flights.csv"
telemetry_controller = TelemetryController()
MAX_UPLOAD_BYTES = int(os.getenv("AEROSENTRY_MAX_UPLOAD_BYTES", 50 * 1024 * 1024))

app = FastAPI(
    title="AEROSENTRY Dataset API",
    version="1.0.0",
    description=(
        "AEROSENTRY local research API: FD001 ingestion, Phase 3 anomaly inference, "
        "Phase 4 N-CMAPSS DS05 inspection/preprocessing and TELESENTRY replay."
    ),
)
app.include_router(rul_router)

_default_origins = (
    "http://localhost:5500,http://127.0.0.1:5500,"
    "http://localhost:5501,http://127.0.0.1:5501,"
    "http://localhost:5502,http://127.0.0.1:5502,"
    "http://localhost:8000,http://127.0.0.1:8000"
)
_origins = [x.strip() for x in os.getenv("AEROSENTRY_CORS_ORIGINS", _default_origins).split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class TelemetryStartRequest(BaseModel):
    engine_id: str | None = None
    data_source: str = Field(default="sample", pattern="^(sample|ncmapss)$")
    interval_seconds: float = Field(default=1.0, ge=0.0, le=60.0)


class AnomalyRequest(BaseModel):
    engine_id: str = Field(..., min_length=1, max_length=64)
    baseline: list[dict[str, float]] = Field(..., min_length=8)
    window: list[dict[str, float]] = Field(..., min_length=6, max_length=6)


class PreprocessRequest(BaseModel):
    window_size: int = Field(default=30, ge=2, le=500)
    rul_cap: int = Field(default=125, ge=1, le=10000)
    validation_fraction: float = Field(default=0.2, ge=0.05, le=0.5)
    random_state: int = Field(default=42, ge=0, le=2_147_483_647)
    variance_threshold: float = Field(default=1e-8, ge=0, le=1e6)


def _validation_path() -> Path:
    return OUTPUT_DIR / "validation_report.json"


def _summary_path() -> Path:
    return OUTPUT_DIR / "preprocessing_summary.json"


def _file_status() -> dict:
    results = {}
    for name in EXPECTED_FILES:
        path = DATA_DIR / name
        results[name] = {
            "present": path.is_file(),
            "size_bytes": path.stat().st_size if path.is_file() else 0,
        }
    return results


def _status_payload() -> dict:
    files = _file_status()
    all_present = all(item["present"] for item in files.values())
    current_hashes = {}
    if all_present:
        for name in EXPECTED_FILES:
            digest = hashlib.sha256()
            with (DATA_DIR / name).open("rb") as handle:
                for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                    digest.update(chunk)
            current_hashes[name] = digest.hexdigest()

    validated = False
    current_fingerprint = None
    if all_present:
        current_fingerprint = hashlib.sha256(
            "|".join(current_hashes[name] for name in EXPECTED_FILES).encode("ascii")
        ).hexdigest()
    if all_present and _validation_path().is_file():
        try:
            report = json.loads(_validation_path().read_text(encoding="utf-8"))
            report_hashes = {name: report.get("files", {}).get(name, {}).get("sha256") for name in EXPECTED_FILES}
            validated = report_hashes == current_hashes
        except (OSError, json.JSONDecodeError):
            validated = False

    preprocessed = False
    if validated and _summary_path().is_file():
        try:
            summary = json.loads(_summary_path().read_text(encoding="utf-8"))
            source_fingerprint = summary.get("source_validation", {}).get("dataset_fingerprint_sha256")
            preprocessed = source_fingerprint == current_fingerprint
        except (OSError, json.JSONDecodeError):
            preprocessed = False

    return {
        "dataset": "NASA C-MAPSS FD001",
        "data_directory": str(DATA_DIR.resolve()),
        "files": files,
        "dataset_available": all_present,
        "ready_for_validation": all_present,
        "validated": validated,
        "preprocessed": preprocessed,
        "dataset_fingerprint_sha256": current_fingerprint,
    }


def _safe_upload_name(filename: str | None) -> str:
    # Normalize Windows and POSIX separators before reducing to a basename.
    normalized = (filename or "").replace("\\", "/")
    return normalized.rsplit("/", 1)[-1]


@app.get("/", tags=["system"])
def root():
    return {"application": "AEROSENTRY Integrated Phase 3/4 API", "phase": "3-4", "docs": "/docs"}


@app.get("/api/v1/health", tags=["system"])
def health():
    model = phase3_model_status()
    return {
        "status": "ok", "service": "aerosentry-api", "phase": 4,
        "capabilities": {
            "fd001_ingestion": True, "phase3_anomaly_model": bool(model.get("model_available")),
            "ncmapss_ds05_file": NCMAPSS_FILE.is_file(), "telesentry_replay": TELEMETRY_CSV_PATH.is_file(),
        },
    }


@app.get("/api/v1/datasets/fd001/status", tags=["FD001 dataset"])
def fd001_status():
    return _status_payload()


@app.post("/api/v1/datasets/fd001/upload", tags=["FD001 dataset"])
async def upload_fd001(
    files: Annotated[list[UploadFile], File(description="Upload exactly the three original FD001 text files.")]
):
    names = [_safe_upload_name(file.filename) for file in files]
    received = {name: upload for name, upload in zip(names, files)}
    duplicates = sorted({name for name in names if names.count(name) > 1})
    unexpected = sorted(set(names) - set(EXPECTED_FILES))
    missing = sorted(set(EXPECTED_FILES) - set(names))

    if len(files) != 3 or duplicates or unexpected or missing:
        for upload in files:
            await upload.close()
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Upload exactly one copy of each FD001 file.",
                "missing": missing,
                "unexpected": unexpected,
                "duplicates": duplicates,
            },
        )

    DATA_DIR.parent.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix=".fd001-upload-", dir=DATA_DIR.parent))
    backup = DATA_DIR.with_name(DATA_DIR.name + ".previous")
    try:
        upload_manifest = {}
        for name in EXPECTED_FILES:
            upload = received[name]
            target = stage / name
            total = 0
            import hashlib
            digest = hashlib.sha256()
            with target.open("wb") as handle:
                while True:
                    chunk = await upload.read(1024 * 1024)
                    if not chunk:
                        break
                    total += len(chunk)
                    if total > MAX_UPLOAD_BYTES:
                        raise HTTPException(
                            status_code=413,
                            detail=f"{name} exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MB upload limit.",
                        )
                    digest.update(chunk)
                    handle.write(chunk)
            if total == 0:
                raise HTTPException(status_code=400, detail=f"{name} is empty.")
            upload_manifest[name] = {"size_bytes": total, "sha256": digest.hexdigest()}

        (stage / "upload_manifest.json").write_text(
            json.dumps({"source": "browser_upload", "files": upload_manifest}, indent=2),
            encoding="utf-8",
        )
        try:
            staged_report = validate_fd001(stage).report
        except DatasetError as exc:
            raise HTTPException(status_code=422, detail=f"Uploaded files failed validation: {exc}") from exc

        if backup.exists():
            shutil.rmtree(backup)
        if DATA_DIR.exists():
            DATA_DIR.rename(backup)
        try:
            stage.rename(DATA_DIR)
        except Exception:
            if backup.exists() and not DATA_DIR.exists():
                backup.rename(DATA_DIR)
            raise
        if backup.exists():
            shutil.rmtree(backup)

        # Do not let preprocessing results from an older upload appear current.
        if OUTPUT_DIR.exists():
            shutil.rmtree(OUTPUT_DIR)
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        _validation_path().write_text(json.dumps(staged_report, indent=2), encoding="utf-8")
        return {
            "message": "FD001 files uploaded and structurally validated.",
            "saved_files": list(EXPECTED_FILES),
            "validation": staged_report,
            "next_step": "POST /api/v1/datasets/fd001/preprocess",
        }
    finally:
        if stage.exists():
            shutil.rmtree(stage, ignore_errors=True)
        for upload in files:
            await upload.close()


@app.post("/api/v1/datasets/fd001/validate", tags=["FD001 dataset"])
def validate_dataset():
    try:
        loaded = validate_fd001(DATA_DIR)
    except DatasetError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    _validation_path().write_text(json.dumps(loaded.report, indent=2), encoding="utf-8")
    return loaded.report


@app.get("/api/v1/datasets/fd001/report", tags=["FD001 dataset"])
def fd001_report():
    path = _validation_path()
    if not path.is_file():
        raise HTTPException(status_code=404, detail="FD001 has not been validated yet.")
    return json.loads(path.read_text(encoding="utf-8"))


@app.post("/api/v1/datasets/fd001/preprocess", tags=["FD001 dataset"])
def preprocess_dataset(request: PreprocessRequest):
    try:
        result = preprocess_fd001(
            data_dir=DATA_DIR,
            output_dir=OUTPUT_DIR,
            window_size=request.window_size,
            rul_cap=request.rul_cap,
            validation_fraction=request.validation_fraction,
            random_state=request.random_state,
            variance_threshold=request.variance_threshold,
        )
    except DatasetError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return result


@app.get("/api/v1/datasets/fd001/metadata", tags=["FD001 dataset"])
def fd001_metadata():
    path = _summary_path()
    if not path.is_file():
        raise HTTPException(status_code=404, detail="FD001 has not been preprocessed yet.")
    return json.loads(path.read_text(encoding="utf-8"))


# Phase 3 — FD001 anomaly model endpoints. The training script is run separately.
@app.get("/api/v1/anomaly/fd001/status", tags=["Phase 3 anomaly detection"])
def fd001_anomaly_status():
    return phase3_model_status()


@app.get("/api/v1/anomaly/fd001/engines", tags=["Phase 3 anomaly detection"])
def fd001_anomaly_engines():
    try:
        return list_fd001_anomaly_engines()
    except AnomalyModelError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/api/v1/anomaly/fd001/analyze", tags=["Phase 3 anomaly detection"])
def fd001_anomaly_analyze(engine_id: int = 1, end_cycle: int = 26):
    try:
        return analyze_historical_engine(engine_id, end_cycle)
    except AnomalyModelError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/api/v1/anomaly/fd001/score", tags=["Phase 3 anomaly detection"])
def fd001_anomaly_score(payload: AnomalyRequest):
    try:
        bundle = get_bundle()
        return calculate_scores(bundle, payload.baseline, payload.window, payload.engine_id)
    except AnomalyModelError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except (ValueError, KeyError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


def _ncmapss_status_payload() -> dict:
    dev_exists = NCMAPSS_DEV_FLIGHTS.is_file()
    test_exists = NCMAPSS_TEST_FLIGHTS.is_file()
    report_exists = NCMAPSS_REPORT.is_file()
    report = None
    if report_exists:
        try:
            report = json.loads(NCMAPSS_REPORT.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            report = None
    archive_path = NCMAPSS_ROOT / "data" / "raw" / "ncmapss_full.zip"
    processed_summary_path = NCMAPSS_ROOT / "data" / "processed" / "ncmapss_ds05_preprocessing_summary.json"
    processed_summary = None
    if processed_summary_path.is_file():
        try:
            processed_summary = json.loads(processed_summary_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            processed_summary = None
    return {
        "dataset": "NASA N-CMAPSS DS05",
        "dataset_file": NCMAPSS_FILE.name,
        "dataset_available": NCMAPSS_FILE.is_file(),
        "file_size_bytes": NCMAPSS_FILE.stat().st_size if NCMAPSS_FILE.is_file() else 0,
        "partial_archive_available": archive_path.is_file(),
        "partial_archive_size_bytes": archive_path.stat().st_size if archive_path.is_file() else 0,
        "inspection_complete": bool(report and report.get("validation_status") == "passed" and not report.get("warnings")),
        "inspection_report_available": report_exists,
        "preprocessed": dev_exists and test_exists and processed_summary is not None,
        "development_flights_available": dev_exists,
        "test_flights_available": test_exists,
        "development_flights_bytes": NCMAPSS_DEV_FLIGHTS.stat().st_size if dev_exists else 0,
        "test_flights_bytes": NCMAPSS_TEST_FLIGHTS.stat().st_size if test_exists else 0,
        "report": report,
        "preprocessing_summary": processed_summary,
    }


@app.get("/api/v1/datasets/ncmapss/ds05/status", tags=["Phase 4 N-CMAPSS DS05"])
def ncmapss_ds05_status():
    return _ncmapss_status_payload()


@app.get("/api/v1/datasets/ncmapss/ds05/report", tags=["Phase 4 N-CMAPSS DS05"])
def ncmapss_ds05_report():
    if not NCMAPSS_REPORT.is_file():
        raise HTTPException(status_code=404, detail="N-CMAPSS DS05 has not been inspected yet.")
    try:
        return json.loads(NCMAPSS_REPORT.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=500, detail=f"Could not read inspection report: {exc}") from exc


@app.post("/api/v1/datasets/ncmapss/ds05/inspect", tags=["Phase 4 N-CMAPSS DS05"])
def inspect_ncmapss_ds05():
    if not NCMAPSS_FILE.is_file():
        raise HTTPException(status_code=409, detail=f"N-CMAPSS DS05 HDF5 file is missing. Expected: {NCMAPSS_FILE}")
    script = NCMAPSS_ROOT / "scripts" / "inspect_ncmapss.py"
    command = [sys.executable, str(script), "--file", str(NCMAPSS_FILE), "--output", str(NCMAPSS_REPORT)]
    try:
        result = subprocess.run(command, cwd=PROJECT_ROOT, capture_output=True, text=True, timeout=7200, check=False)
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(status_code=504, detail="N-CMAPSS inspection exceeded the two-hour limit.") from exc
    if not NCMAPSS_REPORT.is_file():
        raise HTTPException(status_code=500, detail=(result.stderr or result.stdout or "Inspection did not create a report.")[-4000:])
    report = json.loads(NCMAPSS_REPORT.read_text(encoding="utf-8"))
    report["process_return_code"] = result.returncode
    report["process_output_tail"] = (result.stdout or "")[-4000:]
    if result.returncode != 0 or report.get("warnings"):
        raise HTTPException(status_code=422, detail={"message": "N-CMAPSS inspection completed with warnings; review the report.", "report": report, "stderr": (result.stderr or "")[-4000:]})
    return report


@app.post("/api/v1/datasets/ncmapss/ds05/preprocess", tags=["Phase 4 N-CMAPSS DS05"])
def preprocess_ncmapss_ds05(chunk_rows: int = 250000):
    if not NCMAPSS_FILE.is_file():
        raise HTTPException(status_code=409, detail="N-CMAPSS DS05 HDF5 file is missing.")
    if not NCMAPSS_REPORT.is_file():
        raise HTTPException(status_code=409, detail="Inspect the N-CMAPSS file successfully before preprocessing.")
    try:
        report = json.loads(NCMAPSS_REPORT.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=500, detail=f"Inspection report is unreadable: {exc}") from exc
    if report.get("warnings") or report.get("validation_status") != "passed":
        raise HTTPException(status_code=409, detail="N-CMAPSS inspection report contains warnings or is not marked passed.")
    script = NCMAPSS_ROOT / "scripts" / "preprocess_to_flights.py"
    command = [sys.executable, str(script), "--file", str(NCMAPSS_FILE), "--output-dir", str(NCMAPSS_ROOT / "data" / "processed"), "--chunk-rows", str(chunk_rows)]
    try:
        result = subprocess.run(command, cwd=PROJECT_ROOT, capture_output=True, text=True, timeout=14400, check=False)
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(status_code=504, detail="N-CMAPSS preprocessing exceeded the four-hour limit.") from exc
    if result.returncode != 0:
        raise HTTPException(status_code=422, detail={"message": "N-CMAPSS preprocessing failed.", "stdout": (result.stdout or "")[-4000:], "stderr": (result.stderr or "")[-4000:]})
    status = _ncmapss_status_payload()
    if not status["preprocessed"]:
        raise HTTPException(status_code=500, detail="Preprocessing process ended, but the expected output files/summary are missing.")
    status["process_output_tail"] = (result.stdout or "")[-4000:]
    return status


# TELESENTRY telemetry simulation endpoints.
@app.get("/api/v1/telemetry/status", tags=["TELESENTRY"])
def telemetry_status():
    return {
        **telemetry_controller.status(),
        "configured_csv": str(TELEMETRY_CSV_PATH.resolve()),
        "csv_available": TELEMETRY_CSV_PATH.is_file(),
    }


def _telemetry_path_for_source(source: str) -> Path:
    if source == "sample":
        return TELEMETRY_CSV_PATH
    if source == "ncmapss":
        if not (NCMAPSS_DEV_FLIGHTS.is_file() and NCMAPSS_TEST_FLIGHTS.is_file()):
            raise TelemetryDataError("N-CMAPSS flight summaries are not available. Inspect and preprocess DS05 first.")
        return NCMAPSS_DEV_FLIGHTS
    raise TelemetryDataError(f"Unsupported telemetry data source: {source}")


@app.get("/api/v1/telemetry/engines", tags=["TELESENTRY"])
def telemetry_engines(data_source: str = "sample"):
    try:
        source_path = _telemetry_path_for_source(data_source)
        frame = pd.read_csv(source_path)
        engine_col = next((c for c in ("engine_id", "unit_nr", "unit", "engine") if c in frame.columns), None)
        cycle_col = next((c for c in ("cycle", "time_cycles", "cycle_number", "time") if c in frame.columns), None)
        if engine_col is None or cycle_col is None:
            raise TelemetryDataError("Telemetry source is missing an engine or cycle column.")
        engines = [{"engine_id": str(engine), "max_cycle": int(group[cycle_col].max())} for engine, group in frame.groupby(engine_col, sort=True)]
        return {"data_source": data_source, "engines": engines}
    except (TelemetryDataError, OSError, pd.errors.ParserError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/api/v1/telemetry/start", tags=["TELESENTRY"])
async def telemetry_start(request: TelemetryStartRequest):
    try:
        source_path = _telemetry_path_for_source(request.data_source)
        rows = load_engine_rows(source_path, request.engine_id)
        selected_engine = rows[0]["engine_id"]
        await telemetry_controller.start(rows, selected_engine, request.interval_seconds, source=f"{request.data_source.upper()}_HISTORICAL_REPLAY")
    except TelemetryDataError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return {
        "message": "TELESENTRY simulation started.",
        "rows_loaded": len(rows),
        "data_source": request.data_source,
        **telemetry_controller.status(),
    }


@app.post("/api/v1/telemetry/pause", tags=["TELESENTRY"])
async def telemetry_pause():
    try:
        await telemetry_controller.pause()
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return telemetry_controller.status()


@app.post("/api/v1/telemetry/resume", tags=["TELESENTRY"])
async def telemetry_resume():
    try:
        await telemetry_controller.resume()
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return telemetry_controller.status()


@app.post("/api/v1/telemetry/stop", tags=["TELESENTRY"])
async def telemetry_stop():
    await telemetry_controller.stop()
    return telemetry_controller.status()


@app.websocket("/api/v1/telemetry/ws")
async def telemetry_websocket(websocket: WebSocket):
    await websocket.accept()
    queue = await telemetry_controller.subscribe()
    try:
        await websocket.send_json({"type": "connection", "message": "Connected to TELESENTRY stream."})
        while True:
            message = await queue.get()
            await websocket.send_json(message)
    except WebSocketDisconnect:
        pass
    finally:
        telemetry_controller.unsubscribe(queue)
