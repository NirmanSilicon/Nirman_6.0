"""Pydantic response schemas for the IshiLens detection API."""

from typing import Annotated, Optional

from pydantic import BaseModel, Field

# Reusable type for normalized bounding-box coordinates in [0.0, 1.0]
NormalizedCoord = Annotated[float, Field(ge=0.0, le=1.0)]


class DetectionSchema(BaseModel):
    """Represents a single detected tomato or leaf object."""

    id: str
    category: str
    label: str
    display_label: str
    action_text: str
    nhb_stage_hint: Optional[str] = None
    pattern_type: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    is_uncertain: bool
    # Normalized [x1, y1, x2, y2] bounding box coordinates, each between 0.0 and 1.0
    bbox_norm: list[NormalizedCoord] = Field(..., min_length=4, max_length=4)


class DetectionSummarySchema(BaseModel):
    """Represents aggregated counts and the primary guidance cue for a frame."""

    ripe_count: int = Field(..., ge=0)
    near_ripe_count: int = Field(..., ge=0)
    unripe_count: int = Field(..., ge=0)
    uncertain_count: int = Field(..., ge=0)
    leaf_alert_count: int = Field(..., ge=0)
    primary_voice_cue: str


class DetectResponseSchema(BaseModel):
    """Represents the complete JSON response returned by POST /detect."""

    frame_id: int
    inference_ms: float = Field(..., ge=0.0)
    lighting_warning: bool
    detections: list[DetectionSchema]
    summary: DetectionSummarySchema
