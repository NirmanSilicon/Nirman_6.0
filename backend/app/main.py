"""FastAPI entrypoint for the IshiLens tomato ripeness detection backend."""

from contextlib import asynccontextmanager
import logging
import os
import time
from typing import Any, Optional

import cv2
from fastapi import FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
import numpy as np

from app.models.inference import RoboflowRipenessEngine
from app.schemas import DetectResponseSchema, DetectionSchema, DetectionSummarySchema

logger = logging.getLogger(__name__)

DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
]

# Supported image formats: JPEG and PNG
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png"}

# High-contrast BGR color styles (box/badge color, text color) per ripeness label
LABEL_COLORS: dict[str, tuple[tuple[int, int, int], tuple[int, int, int]]] = {
    "ripe": ((40, 40, 220), (255, 255, 255)),
    "near_ripe": ((0, 165, 255), (0, 0, 0)),
    "unripe": ((50, 160, 50), (255, 255, 255)),
}
UNCERTAIN_COLOR: tuple[tuple[int, int, int], tuple[int, int, int]] = (
    (0, 220, 255),
    (0, 0, 0),
)


def _get_cors_origins() -> list[str]:
    """Parse comma-separated CORS origins from CORS_ORIGINS or return local defaults."""
    raw_origins = os.getenv("CORS_ORIGINS", "")
    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    return origins or list(DEFAULT_CORS_ORIGINS)


def _build_summary(detections: list[dict[str, Any]]) -> DetectionSummarySchema:
    """Aggregate tomato ripeness counts and choose the primary voice guidance cue."""
    ripe_count = 0
    near_ripe_count = 0
    unripe_count = 0
    uncertain_count = 0

    for det in detections:
        if det.get("is_uncertain") or det.get("label") == "uncertain":
            uncertain_count += 1
        elif det.get("label") == "ripe":
            ripe_count += 1
        elif det.get("label") == "near_ripe":
            near_ripe_count += 1
        elif det.get("label") == "unripe":
            unripe_count += 1

    if uncertain_count > 0:
        primary_voice_cue = "Please inspect the detected tomatoes"
    elif ripe_count > 0:
        primary_voice_cue = "Ready to harvest"
    elif near_ripe_count > 0:
        primary_voice_cue = "Check again soon"
    elif unripe_count > 0:
        primary_voice_cue = "Leave to grow"
    else:
        primary_voice_cue = "No tomatoes detected"

    return DetectionSummarySchema(
        ripe_count=ripe_count,
        near_ripe_count=near_ripe_count,
        unripe_count=unripe_count,
        uncertain_count=uncertain_count,
        leaf_alert_count=0,
        primary_voice_cue=primary_voice_cue,
    )


async def _validate_and_read_upload(
    request: Request, file: UploadFile
) -> tuple[bytes, RoboflowRipenessEngine]:
    """Validate uploaded JPEG/PNG content type, non-empty payload, and engine readiness."""
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Unsupported media type. Please upload a JPEG or PNG image (image/jpeg, image/png).",
        )

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image file is empty.",
        )

    engine: Optional[RoboflowRipenessEngine] = getattr(request.app.state, "engine", None)
    if engine is None:
        raise HTTPException(
            status_code=503,
            detail="Inference engine is currently unavailable.",
        )

    return image_bytes, engine


async def _run_inference(
    engine: RoboflowRipenessEngine, image_bytes: bytes, frame_id: int = 0
) -> tuple[list[dict[str, Any]], bool, float]:
    """Run blocking Roboflow inference in a thread pool and map errors to HTTP status codes."""
    start_time = time.perf_counter()
    try:
        raw_detections, lighting_warning = await run_in_threadpool(
            engine.predict, image_bytes, frame_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Roboflow inference call failed.")
        raise HTTPException(
            status_code=502,
            detail="External inference service failed. Please try again.",
        ) from exc

    inference_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
    return raw_detections, lighting_warning, inference_ms


def _draw_dashed_rect(
    image: np.ndarray,
    pt1: tuple[int, int],
    pt2: tuple[int, int],
    color: tuple[int, int, int],
    thickness: int,
    dash_length: int = 12,
) -> None:
    """Draw a dashed rectangle to visually distinguish uncertain detections."""
    x1, y1 = pt1
    x2, y2 = pt2
    edges = [
        ((x1, y1), (x2, y1)),
        ((x2, y1), (x2, y2)),
        ((x2, y2), (x1, y2)),
        ((x1, y2), (x1, y1)),
    ]
    for start, end in edges:
        dx = end[0] - start[0]
        dy = end[1] - start[1]
        length = int(np.hypot(dx, dy))
        if length == 0:
            continue
        for dist in range(0, length, dash_length * 2):
            t_start = dist / length
            t_end = min(dist + dash_length, length) / length
            p_start = (int(round(start[0] + dx * t_start)), int(round(start[1] + dy * t_start)))
            p_end = (int(round(start[0] + dx * t_end)), int(round(start[1] + dy * t_end)))
            cv2.line(image, p_start, p_end, color, thickness, lineType=cv2.LINE_AA)


def _annotate_detections_to_jpeg(
    image_bytes: bytes, detections: list[dict[str, Any]]
) -> bytes:
    """Decode image bytes, draw normalized bounding boxes and labels, and encode as JPEG."""
    np_buffer = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode uploaded image for visualization.")

    img_height, img_width = image.shape[:2]
    # Scale stroke and font sizes proportionally so annotations remain legible at any resolution.
    scale_ref = min(img_width, img_height)
    thickness = max(2, int(round(scale_ref / 300)))
    font_scale = max(0.5, scale_ref / 900.0)
    font = cv2.FONT_HERSHEY_SIMPLEX

    for det in detections:
        bbox_norm = det.get("bbox_norm", [0.0, 0.0, 0.0, 0.0])
        if len(bbox_norm) != 4:
            continue

        # Convert normalized [0.0, 1.0] coordinates into clamped pixel coordinates.
        x1 = max(0, min(img_width - 1, int(round(bbox_norm[0] * img_width))))
        y1 = max(0, min(img_height - 1, int(round(bbox_norm[1] * img_height))))
        x2 = max(0, min(img_width - 1, int(round(bbox_norm[2] * img_width))))
        y2 = max(0, min(img_height - 1, int(round(bbox_norm[3] * img_height))))

        is_uncertain = bool(det.get("is_uncertain", False))
        label = str(det.get("label", ""))
        display_label = str(det.get("display_label", label.upper() or "UNKNOWN"))
        confidence_pct = float(det.get("confidence", 0.0)) * 100.0
        caption = f"{display_label} | {confidence_pct:.2f}%"

        if is_uncertain:
            box_color, text_color = UNCERTAIN_COLOR
            caption = f"[?] {caption}"
            _draw_dashed_rect(image, (x1, y1), (x2, y2), box_color, thickness)
        else:
            box_color, text_color = LABEL_COLORS.get(
                label, ((200, 200, 200), (0, 0, 0))
            )
            cv2.rectangle(image, (x1, y1), (x2, y2), box_color, thickness)

        (text_w, text_h), baseline = cv2.getTextSize(caption, font, font_scale, thickness)
        pad_x = 6
        pad_y = 6
        badge_h = text_h + baseline + pad_y * 2
        badge_w = text_w + pad_x * 2

        # Place label badge above the box when space permits; otherwise place it inside top edge.
        badge_y2 = y1 if y1 - badge_h >= 0 else min(img_height - 1, y1 + badge_h)
        badge_y1 = max(0, badge_y2 - badge_h)
        badge_x1 = max(0, min(x1, img_width - badge_w))
        badge_x2 = min(img_width - 1, badge_x1 + badge_w)

        cv2.rectangle(image, (badge_x1, badge_y1), (badge_x2, badge_y2), box_color, -1)
        if is_uncertain:
            cv2.rectangle(
                image, (badge_x1, badge_y1), (badge_x2, badge_y2), (0, 0, 0), 1
            )

        text_org = (badge_x1 + pad_x, badge_y2 - baseline - pad_y)
        cv2.putText(
            image,
            caption,
            text_org,
            font,
            font_scale,
            text_color,
            max(1, thickness - 1),
            lineType=cv2.LINE_AA,
        )

    encode_ok, encoded_jpeg = cv2.imencode(
        ".jpg", image, [int(cv2.IMWRITE_JPEG_QUALITY), 92]
    )
    if not encode_ok:
        raise RuntimeError("Failed to encode annotated image as JPEG.")

    return encoded_jpeg.tobytes()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the Roboflow ripeness engine on startup and store it in app.state."""
    try:
        app.state.engine = RoboflowRipenessEngine()
    except Exception:
        # Keep the server running so /health can report degraded readiness without leaking secrets.
        app.state.engine = None
        logger.warning(
            "RoboflowRipenessEngine failed to initialize at startup; engine marked unavailable."
        )
    yield
    app.state.engine = None


app = FastAPI(
    title="IshiLens Backend API",
    description="AI-powered tomato ripeness detection API for the IshiLens farming assistant.",
    lifespan=lifespan,
)

cors_origins = _get_cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials="*" not in cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check(request: Request) -> dict[str, Any]:
    """Report server status and whether the inference engine is ready."""
    engine: Optional[RoboflowRipenessEngine] = getattr(request.app.state, "engine", None)
    engine_available = engine is not None
    return {
        "status": "ok" if engine_available else "degraded",
        "engine_available": engine_available,
    }


@app.post("/detect", response_model=DetectResponseSchema)
async def detect_tomatoes(
    request: Request,
    file: UploadFile = File(...),
    frame_id: int = Form(0),
) -> DetectResponseSchema:
    """Run tomato ripeness detection on an uploaded JPEG or PNG frame."""
    image_bytes, engine = await _validate_and_read_upload(request, file)
    raw_detections, lighting_warning, inference_ms = await _run_inference(
        engine, image_bytes, frame_id
    )

    detections = [DetectionSchema(**det) for det in raw_detections]
    summary = _build_summary(raw_detections)

    return DetectResponseSchema(
        frame_id=frame_id,
        inference_ms=inference_ms,
        lighting_warning=lighting_warning,
        detections=detections,
        summary=summary,
    )


@app.post(
    "/detect/visualize",
    response_class=Response,
    responses={
        200: {
            "content": {
                "image/jpeg": {
                    "schema": {
                        "type": "string",
                        "format": "binary",
                    }
                }
            },
            "description": "Downloadable annotated JPEG image with detection bounding boxes and confidence labels.",
        }
    },
)
async def visualize_detections(
    request: Request,
    file: UploadFile = File(...),
) -> Response:
    """Run tomato ripeness detection and return a downloadable annotated JPEG image."""
    image_bytes, engine = await _validate_and_read_upload(request, file)
    raw_detections, _, _ = await _run_inference(engine, image_bytes, frame_id=0)

    try:
        annotated_bytes = await run_in_threadpool(
            _annotate_detections_to_jpeg, image_bytes, raw_detections
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed to render annotated detection image.")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate annotated image.",
        ) from exc

    return Response(
        content=annotated_bytes,
        media_type="image/jpeg",
        headers={
            "Content-Disposition": 'attachment; filename="ishilens_annotated.jpg"'
        },
    )
