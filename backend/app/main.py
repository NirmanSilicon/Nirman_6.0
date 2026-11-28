"""FastAPI application entrypoint with lifespan preloading for AlarmSense."""

from collections import defaultdict
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

from app.config import PARQUET_PATH, TARGET_FAULTS
from app.routes import router as api_v1_router
from app.services.predictor import DEFAULT_ARTIFACTS_DIR, PredictorService
from app.services.tep_loader import load_tep_parquet, split_episodes


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Preload ML artifacts, TreeSHAP explainer, and unseen test episodes at startup."""
    predictor = PredictorService()

    df = load_tep_parquet(path=PARQUET_PATH, target_faults=TARGET_FAULTS)
    _, _, test_df = split_episodes(df, train_ratio=0.70, val_ratio=0.15, seed=42)

    test_episodes_by_fault: dict[int, list[pd.DataFrame]] = defaultdict(list)
    for _, ep_df in test_df.groupby("episode_id", sort=True):
        fault_status = int(ep_df["STATUS"].iloc[0])
        test_episodes_by_fault[fault_status].append(ep_df.reset_index(drop=True))

    # Precompute up to 100 contiguous preceding STATUS == 0 rows for each test fault episode
    test_ep_ids = set(int(ep_id) for ep_id in test_df["episode_id"].unique())
    natural_normal_prefix_by_ep_id: dict[int, pd.DataFrame] = {}
    prev_ep_df: pd.DataFrame | None = None
    for ep_id_val, full_ep_df in df.groupby("episode_id", sort=True):
        ep_int = int(ep_id_val)
        ep_status = int(full_ep_df["STATUS"].iloc[0])
        if (
            ep_int in test_ep_ids
            and ep_status != 0
            and prev_ep_df is not None
            and int(prev_ep_df["STATUS"].iloc[0]) == 0
        ):
            natural_normal_prefix_by_ep_id[ep_int] = prev_ep_df.iloc[-100:].reset_index(drop=True)
        prev_ep_df = full_ep_df

    app.state.predictor = predictor
    app.state.test_df = test_df
    app.state.test_episodes_by_fault = dict(test_episodes_by_fault)
    app.state.natural_normal_prefix_by_ep_id = natural_normal_prefix_by_ep_id
    if not getattr(app.state, "feedback_log_path", None):
        app.state.feedback_log_path = Path("data/feedback.jsonl")
    if not getattr(app.state, "tep_artifacts_dir", None):
        app.state.tep_artifacts_dir = DEFAULT_ARTIFACTS_DIR
    if not getattr(app.state, "plants_artifacts_root", None):
        app.state.plants_artifacts_root = DEFAULT_ARTIFACTS_DIR / "plants"

    yield

    app.state.predictor = None
    app.state.test_df = None
    app.state.test_episodes_by_fault = {}
    app.state.natural_normal_prefix_by_ep_id = {}


def create_app() -> FastAPI:
    """Create and configure the AlarmSense FastAPI application."""
    application = FastAPI(
        title="AlarmSense API",
        description=(
            "ISA-18.2 Alarm Flood Consolidation, XGBoost Root-Cause Diagnosis, "
            "and TreeSHAP Explainability API for the Tennessee Eastman Process."
        ),
        version="1.0.0",
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(api_v1_router, prefix="/api/v1")
    return application


app = create_app()
