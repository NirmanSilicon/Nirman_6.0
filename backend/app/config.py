"""Configuration constants for the IshiLens backend."""

import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

# Resolve backend/.env relative to this file (backend/app/config.py -> backend/.env)
# so environment variables load regardless of the current working directory.
ENV_PATH: Path = Path(__file__).resolve().parent.parent / ".env"

# Load environment variables from backend/.env before reading any settings.
load_dotenv(dotenv_path=ENV_PATH)

# Roboflow hosted inference configuration
# API key is read from the ROBOFLOW_API_KEY environment variable and must never be hardcoded.
ROBOFLOW_API_KEY: Optional[str] = os.getenv("ROBOFLOW_API_KEY")
ROBOFLOW_API_URL: str = "https://serverless.roboflow.com"

# Tomato ripeness model ID read from ROBOFLOW_MODEL_ID; remains None if not configured.
TOMATO_MODEL_ID: Optional[str] = os.getenv("ROBOFLOW_MODEL_ID")

# Optional leaf health model ID read from LEAF_MODEL_ID for future integration; remains None if unset.
LEAF_MODEL_ID: Optional[str] = os.getenv("LEAF_MODEL_ID")

# Confidence thresholds
# Minimum detection score required to keep a model prediction.
DETECTION_CONFIDENCE_THRESHOLD: float = 0.30
# Retained detections below this score are flagged as uncertain.
UNCERTAIN_PREDICTION_THRESHOLD: float = 0.55

# Application-level target image size (longest side / square reference in pixels).
# Note: The hosted Roboflow model may have its own server-side input size requirements.
INFERENCE_IMAGE_SIZE: int = 640

# Lighting configuration (OpenCV mean grayscale brightness bounds)
# Mean grayscale brightness below 45.0 indicates a dim scene; above 225.0 indicates overexposure.
LIGHTING_MIN_BRIGHTNESS: float = 45.0
LIGHTING_MAX_BRIGHTNESS: float = 225.0
