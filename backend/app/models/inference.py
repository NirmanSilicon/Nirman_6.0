"""Tomato ripeness inference engine backed by Roboflow hosted API."""

from typing import Any, Optional

import cv2
import numpy as np
from inference_sdk import InferenceConfiguration, InferenceHTTPClient

from app.config import (
    DETECTION_CONFIDENCE_THRESHOLD,
    LIGHTING_MAX_BRIGHTNESS,
    LIGHTING_MIN_BRIGHTNESS,
    ROBOFLOW_API_KEY,
    ROBOFLOW_API_URL,
    TOMATO_MODEL_ID,
    UNCERTAIN_PREDICTION_THRESHOLD,
)

RIPENESS_METADATA: dict[str, dict[str, str]] = {
    "unripe": {
        "display_label": "UNRIPE",
        "action_text": "Leave to grow",
        "pattern_type": "diagonal_crosshatch",
    },
    "near_ripe": {
        "display_label": "NEAR RIPE",
        "action_text": "Check again soon",
        "pattern_type": "polka_dots",
    },
    "ripe": {
        "display_label": "RIPE",
        "action_text": "Ready to harvest",
        "pattern_type": "vertical_stripes",
    },
}

UNCERTAIN_METADATA: dict[str, str] = {
    "display_label": "PLEASE INSPECT",
    "action_text": "Unclear maturity - check closely",
    "pattern_type": "dashed_question",
}


class RoboflowRipenessEngine:
    """Runs tomato ripeness detection via Roboflow's hosted serverless API."""

    def __init__(self) -> None:
        if not ROBOFLOW_API_KEY:
            raise ValueError(
                "Missing ROBOFLOW_API_KEY configuration. Set ROBOFLOW_API_KEY in backend/.env."
            )
        if not TOMATO_MODEL_ID:
            raise ValueError(
                "Missing TOMATO_MODEL_ID configuration. Set ROBOFLOW_MODEL_ID in backend/.env."
            )

        self.api_key: str = ROBOFLOW_API_KEY
        self.model_id: str = TOMATO_MODEL_ID
        self.client = InferenceHTTPClient(
            api_url=ROBOFLOW_API_URL,
            api_key=self.api_key,
        )
        # Send the API key via Authorization header instead of URL query parameters.
        self.client.configure(
            InferenceConfiguration(api_key_transport="header")
        )

    @staticmethod
    def normalize_class(class_name: Optional[str]) -> Optional[str]:
        """Map raw Roboflow class labels to canonical ripeness stages or None."""
        if not class_name:
            return None

        normalized = class_name.strip().lower().replace("_", " ").replace("-", " ")

         # Check unripe labels first, including "not_ripe".
        if (
             "unripe" in normalized
            or "not ripe" in normalized
            or "green" in normalized
        ):
            return "unripe"

        # Check intermediate ripeness stages.
        if any(
            token in normalized
            for token in ("half", "semi", "near", "turning", "breaker", "pink")
        ):
            return "near_ripe"

        # Check fully ripe labels.
        if "ripe" in normalized or "red" in normalized:
            return "ripe"

        return None

    @staticmethod
    def _clamp_unit(value: float) -> float:
        """Clamp a normalized coordinate to [0.0, 1.0]."""
        return round(max(0.0, min(1.0, value)), 4)

    def predict(
        self, jpeg_bytes: bytes, frame_id: int = 0
    ) -> tuple[list[dict[str, Any]], bool]:
        """Decode JPEG bytes, check scene lighting, and run tomato ripeness inference."""
        if not jpeg_bytes:
            raise ValueError("Uploaded image payload is empty.")

        np_buffer = np.frombuffer(jpeg_bytes, dtype=np.uint8)
        image = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Could not decode uploaded JPEG image.")

        img_height, img_width = image.shape[:2]
        if img_height <= 0 or img_width <= 0:
            raise ValueError("Decoded image has invalid dimensions.")

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        mean_brightness = float(np.mean(gray))
        lighting_warning = (
            mean_brightness < LIGHTING_MIN_BRIGHTNESS
            or mean_brightness > LIGHTING_MAX_BRIGHTNESS
        )

        response = self.client.infer(image, model_id=self.model_id)
        raw_predictions = (
            response.get("predictions", []) if isinstance(response, dict) else []
        )

        detections: list[dict[str, Any]] = []
        for idx, pred in enumerate(raw_predictions):
            confidence = float(pred.get("confidence", 0.0))
            if confidence < DETECTION_CONFIDENCE_THRESHOLD:
                continue

            normalized_label = self.normalize_class(pred.get("class"))
            is_uncertain = (
                normalized_label is None
                or confidence < UNCERTAIN_PREDICTION_THRESHOLD
            )

            if is_uncertain:
                meta = UNCERTAIN_METADATA
                label = "uncertain"
            else:
                meta = RIPENESS_METADATA[normalized_label]
                label = normalized_label

            x_center = float(pred.get("x", 0.0))
            y_center = float(pred.get("y", 0.0))
            box_width = float(pred.get("width", 0.0))
            box_height = float(pred.get("height", 0.0))

            x1 = self._clamp_unit((x_center - box_width / 2.0) / img_width)
            y1 = self._clamp_unit((y_center - box_height / 2.0) / img_height)
            x2 = self._clamp_unit((x_center + box_width / 2.0) / img_width)
            y2 = self._clamp_unit((y_center + box_height / 2.0) / img_height)

            detections.append(
                {
                    "id": f"tomato_{frame_id}_{idx}",
                    "category": "tomato",
                    "label": label,
                    "display_label": meta["display_label"],
                    "action_text": meta["action_text"],
                    "pattern_type": meta["pattern_type"],
                    "confidence": round(max(0.0, min(1.0, confidence)), 4),
                    "is_uncertain": is_uncertain,
                    "bbox_norm": [x1, y1, x2, y2],
                }
            )

        return detections, lighting_warning
