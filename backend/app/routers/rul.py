from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services import rul_prediction as service

router = APIRouter(
    prefix="/api/v1/rul/ds05",
    tags=["Phase 8 DS05 RUL"]
)


class RULPredictionRequest(BaseModel):
    features: dict[str, float]


class RULBatchPredictionRequest(BaseModel):
    rows: list[dict[str, float]] = Field(..., min_length=1, max_length=100)


class RULExplanationRequest(BaseModel):
    rows: list[dict[str, float]] = Field(..., min_length=1, max_length=5)


@router.get("/status")
def rul_status():
    return service.model_status()


@router.get("/engines")
def rul_engines():
    try:
        return service.list_development_engines()
    except service.RULModelError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/predict")
def rul_predict(payload: RULPredictionRequest):
    try:
        result = service.predict_rows([payload.features])[0]
        return {
            "model": "XGBoost DS05 final development model",
            **result
        }
    except service.RULModelError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/predict/batch")
def rul_predict_batch(payload: RULBatchPredictionRequest):
    try:
        return {
            "model": "XGBoost DS05 final development model",
            "predictions": service.predict_rows(payload.rows)
        }
    except service.RULModelError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/engine/{engine_id}/history")
def rul_engine_history(engine_id: int):
    try:
        return service.predict_development_engine(engine_id)
    except service.RULModelError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/explain")
def rul_explain(payload: RULExplanationRequest):
    try:
        return service.explain_rows(payload.rows)
    except service.RULModelError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
