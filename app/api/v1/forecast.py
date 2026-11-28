from typing import Any

from fastapi import APIRouter, Depends

from app.api.deps import CorridorStateStore, get_state_store, get_topology
from app.engine.forecast_service import build_cascade_prediction, build_train_forecast
from app.models.schemas import (
    ForecastResponse,
    PredictCascadeRequest,
    PredictCascadeResponse,
)

router = APIRouter(tags=["Forecast"])


@router.get("/trains/{train_no}/forecast", response_model=ForecastResponse)
async def get_train_forecast(
    train_no: str,
    state_store: CorridorStateStore = Depends(get_state_store),
    topology: dict[str, Any] = Depends(get_topology),
) -> ForecastResponse:
    """
    Returns full predictive intelligence breakdown for a train:
    Naive NTES baseline, P10/P50/P90 Quantile ETAs, usable slack,
    Causal Cards explaining every minute of delay, and overtake schedule.
    """
    return await build_train_forecast(train_no, state_store, topology)


@router.post("/predict-cascade", response_model=PredictCascadeResponse)
async def predict_cascade_unified(
    request: PredictCascadeRequest,
    state_store: CorridorStateStore = Depends(get_state_store),
    topology: dict[str, Any] = Depends(get_topology),
) -> PredictCascadeResponse:
    """
    Unified Section 7.2 Specification Parity Endpoint:
    Accepts train number, injected delay, and connection target.
    Returns composite prediction: Naive NTES ETA, P10/P50/P90 Quantile Bands,
    Overtake Alerts, Freight Shadow status, and Connection Audit.
    """
    return await build_cascade_prediction(request, state_store, topology)
