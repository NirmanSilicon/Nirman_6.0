
"""FastAPI application entrypoint with lifespan preloading for AlarmSense."""

from collections import defaultdict
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import logging
from pathlib import Path

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import PARQUET_PATH, TARGET_FAULTS
from app.routes import router as api_v1_router
from app.services.predictor import DEFAULT_ARTIFACTS_DIR, PredictorService
from app.services.tep_loader import load_tep_parquet, split_episodes

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Preload ML artifacts, TreeSHAP explainer, and unseen test episodes at startup."""

    predictor: PredictorService | None = None
    try:
        predictor = PredictorService()
    except FileNotFoundError as exc:
        logger.warning(
            "PredictorService artifacts not found (%s); starting in degraded mode.",
            exc,
        )

    test_df: pd.DataFrame | None = None
    test_episodes_by_fault: dict[int, list[pd.DataFrame]] = defaultdict(list)
    natural_normal_prefix_by_ep_id: dict[int, pd.DataFrame] = {}

    try:
        df = load_tep_parquet(
            path=PARQUET_PATH,
            target_faults=TARGET_FAULTS,
        )

        _, _, test_df = split_episodes(
            df,
            train_ratio=0.70,
            val_ratio=0.15,
            seed=42,
        )

        # Group test episodes by fault status.
        for _, ep_df in test_df.groupby("episode_id", sort=True):
            fault_status = int(ep_df["STATUS"].iloc[0])
            test_episodes_by_fault[fault_status].append(
                ep_df.reset_index(drop=True)
            )

        # Precompute up to 100 contiguous preceding normal-operation rows
        # for each test fault episode.
        test_ep_ids = set(
            int(ep_id) for ep_id in test_df["episode_id"].unique()
        )

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
                natural_normal_prefix_by_ep_id[ep_int] = (
                    prev_ep_df.iloc[-100:].reset_index(drop=True)
                )

            prev_ep_df = full_ep_df
    except FileNotFoundError as exc:
        logger.warning(
            "TEP parquet dataset not found (%s); starting without TEP simulation episodes.",
            exc,
        )
        test_df = None
        test_episodes_by_fault = defaultdict(list)
        natural_normal_prefix_by_ep_id = {}

    # Store preloaded resources in application state.
    app.state.predictor = predictor
    app.state.test_df = test_df
    app.state.test_episodes_by_fault = dict(test_episodes_by_fault)
    app.state.natural_normal_prefix_by_ep_id = (
        natural_normal_prefix_by_ep_id
    )

    # Configure default application paths.
    if not getattr(app.state, "feedback_log_path", None):
        app.state.feedback_log_path = Path("data/feedback.jsonl")

    if not getattr(app.state, "tep_artifacts_dir", None):
        app.state.tep_artifacts_dir = DEFAULT_ARTIFACTS_DIR

    if not getattr(app.state, "plants_artifacts_root", None):
        app.state.plants_artifacts_root = (
            DEFAULT_ARTIFACTS_DIR / "plants"
        )

    yield

    # Release application state during shutdown.
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

    # CORS configuration for local frontend development.
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(
        api_v1_router,
        prefix="/api/v1",
    )

    return application


app = create_app()
