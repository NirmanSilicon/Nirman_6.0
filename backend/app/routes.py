"""FastAPI v1 route handlers for AlarmSense diagnosis, simulation, and catalog endpoints."""

from datetime import datetime, timezone
import json
from pathlib import Path
import tempfile
import time
from typing import Any
from fastapi import APIRouter, Body, File, Form, HTTPException, Query, Request, UploadFile, status
import numpy as np
import pandas as pd

from app.config import (
    DEFAULT_WINDOW_SIZE,
    FAULT_METADATA,
    SENSOR_COLS,
    TARGET_FAULTS,
    get_sensor_label,
    get_sensor_unit,
)
from app.schemas import (
    ActivatePlantResponse,
    AnalyzeRequest,
    AnalyzeResponse,
    FaultCatalogItem,
    FaultCatalogResponse,
    FeedbackRequest,
    FeedbackResponse,
    FeedbackSummaryResponse,
    HealthResponse,
    PlantInfo,
    PlantListResponse,
    RetrainResponse,
    SimulateRequest,
    SimulateResponse,
)
from app.services.alarm_engine import consolidate_alarm_flood
from app.services.causality import compute_causal_links
from app.services.features import extract_single_window
from app.services.playbooks import get_playbook
from app.services.predictor import DEFAULT_ARTIFACTS_DIR, PredictorService, _split_feature_name
from training.retrain_custom import train_custom_plant_csv, validate_plant_id

router = APIRouter(tags=["AlarmSense API v1"])


def _get_predictor(request: Request) -> PredictorService:
    """Retrieve preloaded PredictorService from application state."""
    predictor: PredictorService | None = getattr(request.app.state, "predictor", None)
    if predictor is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PredictorService is not initialized.",
        )
    return predictor


def _resolve_fault_context(
    fault_id: int,
    predictor: PredictorService,
) -> tuple[str, str, str, str, list[str]]:
    """Return (name, equipment_unit, severity_level, summary, recommended_actions)."""
    if predictor.plant_id == "tep" and fault_id in FAULT_METADATA:
        meta = FAULT_METADATA[fault_id]
        playbook = get_playbook(fault_id)
        return (
            meta["name"],
            playbook["equipment_unit"],
            playbook["severity_level"],
            playbook["summary"],
            playbook["recommended_actions"],
        )

    name = predictor.fault_names.get(
        fault_id,
        "Normal" if fault_id == 0 else f"Fault {fault_id}",
    )
    is_normal = fault_id == 0 or name.lower() == "normal"
    if is_normal:
        return (
            name,
            predictor.plant_name,
            "NORMAL",
            f"{predictor.plant_name} operating within learned normal baseline envelopes.",
            [
                "Continue routine monitoring of plant process variables.",
                "Verify automated control loops remain stable around nominal setpoints.",
                "Log steady-state snapshot for shift handover records.",
            ],
        )

    return (
        name,
        predictor.plant_name,
        "HIGH",
        f"Detected abnormal operating condition '{name}' (class {fault_id}) on {predictor.plant_name}.",
        [
            "Inspect the top SHAP-driving sensors and priority alarm tags highlighted in the panel.",
            "Verify field instrumentation and actuator positions for abnormal process drift.",
            "Follow site standard operating procedures to stabilize affected equipment.",
        ],
    )


def _run_full_analysis(
    window_df: pd.DataFrame,
    predictor: PredictorService,
) -> dict[str, Any]:
    """Execute alarm flood consolidation, XGBoost + TreeSHAP diagnosis, and playbook lookup."""
    t0 = time.perf_counter()

    alarm_report = consolidate_alarm_flood(
        window_df=window_df,
        baseline=predictor.baseline,
        top_k=5,
        sensor_cols=predictor.sensor_cols,
    )
    prediction = predictor.predict_window(window_df=window_df, top_k=3)

    fault_id = prediction["predicted_fault_id"]
    fault_name, equipment_unit, severity_level, summary, recommended_actions = (
        _resolve_fault_context(fault_id, predictor)
    )

    first_tag = alarm_report["first_triggered_tag"]
    first_triggered_label = get_sensor_label(first_tag) if first_tag else None
    candidate_sensors = (
        ([first_tag] if first_tag else [])
        + [alarm["tag"] for alarm in alarm_report["priority_alarms"]]
        + [ev["sensor"] for ev in prediction["shap_evidence"]]
    )
    causal_links = compute_causal_links(
        window_df=window_df,
        candidate_sensors=candidate_sensors,
        max_links=5,
    )

    latency_ms = round((time.perf_counter() - t0) * 1000.0, 3)

    return {
        "raw_alarm_count": alarm_report["raw_alarm_count"],
        "confirmed_alarm_count": alarm_report["confirmed_alarm_count"],
        "priority_alarms": alarm_report["priority_alarms"],
        "first_triggered_tag": first_tag,
        "first_triggered_label": first_triggered_label,
        "reduction_pct": alarm_report["reduction_pct"],
        "root_cause": {
            "fault_id": fault_id,
            "name": fault_name,
            "equipment_unit": equipment_unit,
            "severity_level": severity_level,
            "confidence": prediction["confidence"],
            "summary": summary,
        },
        "top_causes": prediction["top_causes"],
        "shap_evidence": prediction["shap_evidence"],
        "causal_links": causal_links,
        "recommended_actions": recommended_actions,
        "latency_ms": latency_ms,
    }


@router.get("/health", response_model=HealthResponse)
def health_check(request: Request) -> HealthResponse:
    """Return service readiness, active plant model status, and supported fault classes."""
    predictor: PredictorService | None = getattr(request.app.state, "predictor", None)
    model_loaded = predictor is not None
    classes = list(predictor.classes) if predictor is not None else list(TARGET_FAULTS)
    return HealthResponse(
        status="ok" if model_loaded else "degraded",
        model_loaded=model_loaded,
        supported_faults=len(classes),
        fault_ids=classes,
        active_plant_id=predictor.plant_id if predictor is not None else "tep",
        active_plant_name=(
            predictor.plant_name if predictor is not None else "Tennessee Eastman Process"
        ),
    )


@router.get("/faults", response_model=FaultCatalogResponse)
def list_faults() -> FaultCatalogResponse:
    """Return metadata and operator playbooks for Normal (0) and all 11 supported faults."""
    items: list[FaultCatalogItem] = []
    for fault_id in TARGET_FAULTS:
        meta = FAULT_METADATA[fault_id]
        playbook = get_playbook(fault_id)
        items.append(
            FaultCatalogItem(
                fault_id=fault_id,
                name=meta["name"],
                unit=meta["unit"],
                type=meta["type"],
                description=meta["description"],
                equipment_unit=playbook["equipment_unit"],
                severity_level=playbook["severity_level"],
                summary=playbook["summary"],
                recommended_actions=playbook["recommended_actions"],
            )
        )
    return FaultCatalogResponse(total=len(items), faults=items)


def _build_normal_prefix(
    ep_id: int,
    natural_prefixes: dict[int, pd.DataFrame],
    normal_episodes: list[pd.DataFrame],
    pre_fault_steps: int,
) -> pd.DataFrame:
    """Prefer real preceding STATUS == 0 rows for ep_id; fall back to normal_episodes[0]."""
    natural_ep = natural_prefixes.get(ep_id)
    if natural_ep is not None and len(natural_ep) >= pre_fault_steps:
        return natural_ep.iloc[-pre_fault_steps:]

    if not normal_episodes:
        if natural_ep is not None and not natural_ep.empty:
            repeats = (pre_fault_steps // len(natural_ep)) + 1
            return pd.concat([natural_ep] * repeats, ignore_index=True).iloc[-pre_fault_steps:]
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="No unseen Normal (STATUS=0) episodes available for pre_fault_steps replay.",
        )

    normal_ep = normal_episodes[0]
    if len(normal_ep) >= pre_fault_steps:
        return normal_ep.iloc[-pre_fault_steps:]
    repeats = (pre_fault_steps // len(normal_ep)) + 1
    repeated = pd.concat([normal_ep] * repeats, ignore_index=True)
    return repeated.iloc[-pre_fault_steps:]


def _compute_alarm_trend(window_df: pd.DataFrame, baseline: pd.DataFrame) -> list[int]:
    """Count raw threshold breaches (|z| >= 3.0) across SENSOR_COLS at each row."""
    cols = [c for c in SENSOR_COLS if c in window_df.columns and c in baseline.index]
    if not cols or window_df.empty:
        return [0] * len(window_df)

    means = baseline.loc[cols, "mean"].to_numpy(dtype=np.float64)
    stds = baseline.loc[cols, "std"].to_numpy(dtype=np.float64)
    stds_safe = np.where((stds > 1e-9) & np.isfinite(stds), stds, 1e-9)
    values = window_df[cols].to_numpy(dtype=np.float64)
    z_abs = np.abs((values - means) / stds_safe)
    counts = (z_abs >= 3.0).sum(axis=1)
    return [int(c) for c in counts]


def _apply_probability_smoothing(
    analysis: dict[str, Any],
    combined_df: pd.DataFrame,
    start_idx: int,
    effective_window: int,
    smooth_steps: int,
    predictor: PredictorService,
) -> None:
    """Average predict_proba over trailing windows and refresh root_cause/top_causes."""
    trailing_starts = [
        start_idx - offset
        for offset in range(smooth_steps)
        if start_idx - offset >= 0
    ]
    if len(trailing_starts) <= 1:
        return

    t_smooth_start = time.perf_counter()
    x_batch = np.vstack(
        [
            extract_single_window(
                combined_df.iloc[s : s + effective_window],
                sensor_cols=SENSOR_COLS,
                window_size=predictor.window_size,
            )
            for s in trailing_starts
        ]
    )
    x_scaled = predictor.scaler.transform(x_batch).astype(np.float32)
    mean_probs = predictor.model.predict_proba(x_scaled).mean(axis=0)
    sorted_indices = np.argsort(mean_probs)[::-1]

    pred_idx = int(sorted_indices[0])
    smoothed_fault_id = predictor.idx_to_fault[pred_idx]
    smoothed_confidence = round(float(mean_probs[pred_idx]), 4)

    top_causes = []
    for idx in sorted_indices[:3]:
        c_idx = int(idx)
        f_id = predictor.idx_to_fault[c_idx]
        meta = FAULT_METADATA[f_id]
        top_causes.append(
            {
                "fault_id": f_id,
                "name": meta["name"],
                "unit": meta["unit"],
                "probability": round(float(mean_probs[c_idx]), 4),
            }
        )

    prev_fault_id = analysis["root_cause"]["fault_id"]
    if smoothed_fault_id != prev_fault_id:
        fault_meta = FAULT_METADATA[smoothed_fault_id]
        playbook = get_playbook(smoothed_fault_id)
        analysis["root_cause"] = {
            "fault_id": smoothed_fault_id,
            "name": fault_meta["name"],
            "equipment_unit": playbook["equipment_unit"],
            "severity_level": playbook["severity_level"],
            "confidence": smoothed_confidence,
            "summary": playbook["summary"],
        }
        analysis["recommended_actions"] = playbook["recommended_actions"]

        # Refresh SHAP evidence for the smoothed predicted class on the current window
        x_curr = x_scaled[0:1]
        x_curr_raw = x_batch[0:1]
        raw_shap = predictor.explainer.shap_values(x_curr)
        class_shap = predictor._extract_class_shap(raw_shap, pred_idx)
        top_feat_indices = np.argsort(np.abs(class_shap))[::-1][:3]
        analysis["shap_evidence"] = [
            {
                "feature": predictor.feature_names[int(f_idx)],
                "sensor": (sensor := _split_feature_name(predictor.feature_names[int(f_idx)])[0]),
                "label": get_sensor_label(sensor),
                "unit": get_sensor_unit(sensor),
                "stat": _split_feature_name(predictor.feature_names[int(f_idx)])[1],
                "shap_value": round(float(class_shap[int(f_idx)]), 4),
                "feature_value": round(float(x_curr_raw[0, int(f_idx)]), 4),
                "impact_direction": "positive" if float(class_shap[int(f_idx)]) >= 0.0 else "negative",
            }
            for f_idx in top_feat_indices
        ]
    else:
        analysis["root_cause"]["confidence"] = smoothed_confidence

    analysis["top_causes"] = top_causes
    extra_ms = (time.perf_counter() - t_smooth_start) * 1000.0
    analysis["latency_ms"] = round(float(analysis["latency_ms"]) + extra_ms, 3)


@router.post("/simulate/{fault_id}", response_model=SimulateResponse)
def simulate_fault(
    fault_id: int,
    request: Request,
    step_index: int | None = Query(default=None, ge=0),
    window_size: int | None = Query(default=None, ge=DEFAULT_WINDOW_SIZE, le=500),
    episode_index: int | None = Query(default=None, ge=0),
    pre_fault_steps: int | None = Query(default=None, ge=0, le=100),
    smooth_steps: int | None = Query(default=None, ge=1, le=5),
    body: SimulateRequest | None = Body(default=None),
) -> SimulateResponse:
    """Slice an unseen test episode window for fault_id and run full diagnosis."""
    if fault_id not in FAULT_METADATA:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unsupported fault_id {fault_id}. Supported: {TARGET_FAULTS}",
        )

    predictor = _get_predictor(request)
    if predictor.plant_id != "tep":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Active plant is '{predictor.plant_id}'. TEP episode simulation requires active "
                "plant 'tep'; call POST /api/v1/plants/tep/activate first."
            ),
        )
    episodes_by_fault: dict[int, list[pd.DataFrame]] = getattr(
        request.app.state, "test_episodes_by_fault", {}
    )
    natural_prefixes: dict[int, pd.DataFrame] = getattr(
        request.app.state, "natural_normal_prefix_by_ep_id", {}
    )
    fault_episodes = episodes_by_fault.get(fault_id, [])

    effective_step = step_index if step_index is not None else (body.step_index if body else 0)
    effective_window = (
        window_size
        if window_size is not None
        else (body.window_size if body else DEFAULT_WINDOW_SIZE)
    )
    effective_episode_index = (
        episode_index
        if episode_index is not None
        else (body.episode_index if body else 0)
    )
    effective_pre_fault = (
        pre_fault_steps
        if pre_fault_steps is not None
        else (body.pre_fault_steps if body else 0)
    )
    effective_smooth = (
        smooth_steps
        if smooth_steps is not None
        else (body.smooth_steps if body else 1)
    )

    eligible_episodes = [ep for ep in fault_episodes if len(ep) >= effective_window]
    if not eligible_episodes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"No test episodes available for fault_id={fault_id} with length >= {effective_window}.",
        )

    if effective_episode_index >= len(eligible_episodes):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                f"episode_index={effective_episode_index} out of range for fault_id={fault_id} "
                f"(available_episodes={len(eligible_episodes)})."
            ),
        )

    ep_df = eligible_episodes[effective_episode_index]
    ep_id = int(ep_df["episode_id"].iloc[0])

    if effective_pre_fault > 0 and fault_id != 0:
        normal_episodes = episodes_by_fault.get(0, [])
        normal_prefix = _build_normal_prefix(
            ep_id=ep_id,
            natural_prefixes=natural_prefixes,
            normal_episodes=normal_episodes,
            pre_fault_steps=effective_pre_fault,
        )
        combined_df = pd.concat([normal_prefix, ep_df], ignore_index=True)
        fault_onset_step: int | None = effective_pre_fault
    else:
        combined_df = ep_df
        fault_onset_step = None if fault_id == 0 else 0

    max_start = len(combined_df) - effective_window
    start_idx = min(effective_step, max_start)
    in_fault_regime = (
        False
        if (fault_id == 0 or fault_onset_step is None)
        else (start_idx + effective_window) > fault_onset_step
    )
    onset_offset_in_window: int | None = None
    if fault_onset_step is not None:
        offset = fault_onset_step - start_idx
        if 0 <= offset < effective_window:
            onset_offset_in_window = offset

    window_df = combined_df.iloc[start_idx : start_idx + effective_window].reset_index(drop=True)
    analysis = _run_full_analysis(window_df=window_df, predictor=predictor)

    if effective_smooth > 1:
        _apply_probability_smoothing(
            analysis=analysis,
            combined_df=combined_df,
            start_idx=start_idx,
            effective_window=effective_window,
            smooth_steps=effective_smooth,
            predictor=predictor,
        )

    alarm_trend = _compute_alarm_trend(window_df=window_df, baseline=predictor.baseline)

    # Collect trend snippet for key driving sensors (first-triggered + SHAP + priority alarms)
    candidate_tags: list[str] = []
    if analysis["first_triggered_tag"]:
        candidate_tags.append(analysis["first_triggered_tag"])
    for ev in analysis["shap_evidence"]:
        if ev["sensor"] not in candidate_tags and ev["sensor"] in window_df.columns:
            candidate_tags.append(ev["sensor"])
    for alarm in analysis["priority_alarms"]:
        if alarm["tag"] not in candidate_tags and alarm["tag"] in window_df.columns:
            candidate_tags.append(alarm["tag"])
    for fallback_col in SENSOR_COLS[:3]:
        if fallback_col not in candidate_tags:
            candidate_tags.append(fallback_col)

    trend_tags = candidate_tags[:5]
    sensor_trends: dict[str, list[float]] = {
        tag: [round(float(val), 4) for val in window_df[tag].tolist()]
        for tag in trend_tags
    }

    return SimulateResponse(
        **analysis,
        simulated_fault_id=fault_id,
        episode_id=ep_id,
        step_index=start_idx,
        window_size=effective_window,
        episode_total_steps=len(combined_df),
        available_episodes=len(eligible_episodes),
        fault_onset_step=fault_onset_step,
        in_fault_regime=in_fault_regime,
        alarm_trend=alarm_trend,
        onset_offset_in_window=onset_offset_in_window,
        sensor_trends=sensor_trends,
    )


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze_window(
    request: Request,
    payload: AnalyzeRequest | list[dict[str, float]] = Body(...),
) -> AnalyzeResponse:
    """Analyze a sensor window dynamically against the active plant's schema."""
    predictor = _get_predictor(request)
    required_cols = predictor.sensor_cols
    required_window = predictor.window_size

    rows = payload.window if isinstance(payload, AnalyzeRequest) else payload
    if len(rows) < required_window:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                f"Window must contain at least {required_window} rows for active plant "
                f"'{predictor.plant_id}', got {len(rows)}."
            ),
        )

    required_set = set(required_cols)
    for idx, row in enumerate(rows):
        missing = required_set.difference(row.keys())
        if missing:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=(
                    f"Row {idx} missing {len(missing)} required sensor columns for plant "
                    f"'{predictor.plant_id}' (e.g. {sorted(missing)[:5]})."
                ),
            )

    window_df = pd.DataFrame(rows, columns=required_cols, dtype=np.float32)
    analysis = _run_full_analysis(window_df=window_df, predictor=predictor)
    return AnalyzeResponse(**analysis)


def _get_tep_artifacts_dir(request: Request) -> Path:
    """Resolve default TEP artifacts directory from app.state."""
    configured = getattr(request.app.state, "tep_artifacts_dir", None)
    return Path(configured) if configured else DEFAULT_ARTIFACTS_DIR


def _get_plants_artifacts_root(request: Request) -> Path:
    """Resolve custom plants artifacts root directory from app.state."""
    configured = getattr(request.app.state, "plants_artifacts_root", None)
    return Path(configured) if configured else DEFAULT_ARTIFACTS_DIR / "plants"


def _read_plant_info(plant_dir: Path, active_plant_id: str, default_id: str | None = None) -> PlantInfo | None:
    """Load PlantInfo metadata from an artifacts directory if complete."""
    label_map_path = plant_dir / "label_map.json"
    model_path = plant_dir / "xgb_model.json"
    if not label_map_path.is_file() or not model_path.is_file():
        return None

    with open(label_map_path, encoding="utf-8") as f:
        label_map = json.load(f)

    p_id = str(label_map.get("plant_id", default_id or plant_dir.name))
    p_name = str(
        label_map.get(
            "plant_name",
            "Tennessee Eastman Process" if p_id == "tep" else p_id,
        )
    )
    sensor_cols = list(label_map.get("sensor_cols", SENSOR_COLS))
    classes = [int(c) for c in label_map.get("classes", TARGET_FAULTS)]
    window_size = int(label_map.get("window_size", DEFAULT_WINDOW_SIZE))

    return PlantInfo(
        plant_id=p_id,
        plant_name=p_name,
        is_active=(p_id == active_plant_id),
        n_sensors=len(sensor_cols),
        sensor_cols=sensor_cols,
        classes=classes,
        window_size=window_size,
    )


@router.get("/plants", response_model=PlantListResponse)
def list_plants(request: Request) -> PlantListResponse:
    """List the built-in TEP model and all trained custom plant models."""
    predictor = _get_predictor(request)
    plants: list[PlantInfo] = []

    tep_info = _read_plant_info(
        _get_tep_artifacts_dir(request),
        active_plant_id=predictor.plant_id,
        default_id="tep",
    )
    if tep_info is not None:
        plants.append(tep_info)

    plants_root = _get_plants_artifacts_root(request)
    if plants_root.is_dir():
        for subdir in sorted(plants_root.iterdir()):
            if subdir.is_dir():
                info = _read_plant_info(subdir, active_plant_id=predictor.plant_id)
                if info is not None:
                    plants.append(info)

    return PlantListResponse(active_plant_id=predictor.plant_id, plants=plants)


@router.post(
    "/plants/retrain",
    response_model=RetrainResponse,
    status_code=status.HTTP_201_CREATED,
)
async def retrain_custom_plant(
    request: Request,
    file: UploadFile = File(...),
    plant_id: str = Form(...),
    plant_name: str | None = Form(default=None),
    status_col: str = Form(default="STATUS"),
    timestamp_col: str | None = Form(default=None),
    normal_label: int = Form(default=0),
    window_size: int = Form(default=DEFAULT_WINDOW_SIZE),
    activate: bool = Form(default=True),
) -> RetrainResponse:
    """Upload a labeled factory CSV, train an XGBoost model, and optionally activate it."""
    plants_root = _get_plants_artifacts_root(request)
    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Uploaded CSV file is empty.",
        )

    with tempfile.TemporaryDirectory() as tmpdir:
        csv_path = Path(tmpdir) / (file.filename or "upload.csv")
        csv_path.write_bytes(raw_bytes)
        try:
            summary = train_custom_plant_csv(
                csv_path=csv_path,
                plant_id=plant_id,
                plant_name=plant_name,
                status_col=status_col,
                timestamp_col=timestamp_col,
                normal_label=normal_label,
                window_size=window_size,
                artifacts_root=plants_root,
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=str(exc),
            ) from exc

    if activate:
        request.app.state.predictor = PredictorService(artifacts_dir=summary["artifacts_dir"])

    return RetrainResponse(
        status="trained",
        activated=activate,
        **summary,
    )


@router.post("/plants/{plant_id}/activate", response_model=ActivatePlantResponse)
def activate_plant(plant_id: str, request: Request) -> ActivatePlantResponse:
    """Switch the live PredictorService to 'tep' or a trained custom plant model."""
    if plant_id == "tep":
        target_dir = _get_tep_artifacts_dir(request)
    else:
        try:
            clean_id = validate_plant_id(plant_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=str(exc),
            ) from exc
        target_dir = _get_plants_artifacts_root(request) / clean_id

    if not (target_dir / "xgb_model.json").is_file() or not (target_dir / "label_map.json").is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trained artifacts for plant '{plant_id}' not found.",
        )

    new_predictor = PredictorService(artifacts_dir=target_dir)
    request.app.state.predictor = new_predictor

    return ActivatePlantResponse(
        status="activated",
        plant_id=new_predictor.plant_id,
        plant_name=new_predictor.plant_name,
        n_sensors=len(new_predictor.sensor_cols),
        sensor_cols=list(new_predictor.sensor_cols),
        classes=list(new_predictor.classes),
        window_size=new_predictor.window_size,
    )


def _get_feedback_log_path(request: Request) -> Path:
    """Resolve feedback JSONL log path from app.state with safe default."""
    configured = getattr(request.app.state, "feedback_log_path", None)
    return Path(configured) if configured else Path("data/feedback.jsonl")


def _read_feedback_entries(log_path: Path) -> list[dict[str, Any]]:
    """Read recorded operator feedback entries from a JSONL file."""
    if not log_path.is_file():
        return []
    entries: list[dict[str, Any]] = []
    with open(log_path, encoding="utf-8") as f:
        for line in f:
            stripped = line.strip()
            if stripped:
                entries.append(json.loads(stripped))
    return entries


def _summarize_feedback_counts(entries: list[dict[str, Any]]) -> tuple[int, int, int]:
    """Compute (total, confirmed, rejected) counts across feedback entries."""
    total = len(entries)
    confirmed = sum(1 for entry in entries if entry.get("action") == "confirm")
    rejected = sum(1 for entry in entries if entry.get("action") == "reject")
    return total, confirmed, rejected


@router.post(
    "/feedback",
    response_model=FeedbackResponse,
    status_code=status.HTTP_201_CREATED,
)
def record_feedback(
    request: Request,
    payload: FeedbackRequest,
) -> FeedbackResponse:
    """Append operator diagnosis feedback (confirm/reject) to the JSONL log."""
    log_path = _get_feedback_log_path(request)
    log_path.parent.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(timezone.utc).isoformat()
    record: dict[str, Any] = {
        "timestamp": timestamp,
        "fault_id": payload.fault_id,
        "fault_name": FAULT_METADATA[payload.fault_id]["name"],
        "episode_id": payload.episode_id,
        "step_index": payload.step_index,
        "action": payload.action,
        "corrected_fault_id": payload.corrected_fault_id,
        "notes": payload.notes,
    }

    with open(log_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")

    entries = _read_feedback_entries(log_path)
    total, confirmed, rejected = _summarize_feedback_counts(entries)

    return FeedbackResponse(
        status="recorded",
        timestamp=timestamp,
        total_feedback_count=total,
        confirmed_count=confirmed,
        rejected_count=rejected,
    )


@router.get("/feedback/summary", response_model=FeedbackSummaryResponse)
def get_feedback_summary(request: Request) -> FeedbackSummaryResponse:
    """Return aggregate operator feedback counts and up to the last 10 entries."""
    log_path = _get_feedback_log_path(request)
    entries = _read_feedback_entries(log_path)
    total, confirmed, rejected = _summarize_feedback_counts(entries)

    return FeedbackSummaryResponse(
        total_feedback_count=total,
        confirmed_count=confirmed,
        rejected_count=rejected,
        recent_entries=entries[-10:],
    )
