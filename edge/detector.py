"""
ParkSMART - YOLO26 Edge Object Detector (File 151 / M2 Ownership)

Responsibility:
Loads YOLO26 end-to-end weights, verifies class dictionary mappings at startup,
runs inference on input frames without writing to disk, and outputs structured detections.

Strict Rules & Requirements:
1. Load model with configured model_path, model_version, imgsz, conf_threshold.
2. Mark all numeric thresholds as UNVALIDATED; do not claim accuracy for Bhubaneswar.
3. At startup, assert model class names for:
   - 0: person
   - 2: car
   - 3: motorcycle
   - 5: bus
   - 7: truck
   Fail clearly with ValueError if names do not match.
4. Do not rely on NMS or IoU settings (YOLO26 is natively end-to-end and NMS-free).
5. Forced privacy lock: save=False, save_txt=False, save_crop=False.
   Zero camera frames or detection crops are ever written to disk.
6. Missing weights must raise FileNotFoundError pointing to read-only /models.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

logger = logging.getLogger("parksmart.edge.detector")

try:
    from ultralytics import YOLO  # type: ignore
    HAS_ULTRALYTICS = True
except ImportError:
    YOLO = None  # type: ignore
    HAS_ULTRALYTICS = False


# ============================================================================
# COCO Class Mapping Contracts
# ============================================================================
PERSON_CLASS: int = 0
PERSON_NAME: str = "person"

VEHICLE_CLASSES: dict[int, str] = {
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
}

# Set of all tracked class IDs
TRACKED_CLASS_IDS: set[int] = {PERSON_CLASS, *VEHICLE_CLASSES.keys()}


@dataclass(frozen=True)
class Detection:
    """Represents a validated object detection on an image frame."""

    box: tuple[float, float, float, float]  # (xmin, ymin, xmax, ymax) in pixels
    class_id: int
    class_name: str
    confidence: float

    @property
    def is_vehicle(self) -> bool:
        """Returns True if the detection is a vehicle (car, motorcycle, bus, truck)."""
        return self.class_id in VEHICLE_CLASSES

    @property
    def is_pedestrian(self) -> bool:
        """Returns True if the detection is a pedestrian."""
        return self.class_id == PERSON_CLASS

    @property
    def center(self) -> tuple[float, float]:
        """Calculates center coordinate (cx, cy) of the bounding box."""
        xmin, ymin, xmax, ymax = self.box
        return (xmin + xmax) / 2.0, (ymin + ymax) / 2.0

    @property
    def bottom_center(self) -> tuple[float, float]:
        """Calculates the bottom-center contact point of the bounding box."""
        xmin, _ymin, xmax, ymax = self.box
        return (xmin + xmax) / 2.0, ymax


def verify_model_classes(names: dict[int, str] | list[str] | Any) -> None:
    """
    Asserts model class names for required COCO IDs:
      - 0: person
      - 2: car
      - 3: motorcycle
      - 5: bus
      - 7: truck

    Raises ValueError with a clear error message if names do not match.
    """
    # Normalize names to dict[int, str]
    if isinstance(names, list):
        names_dict = {i: name for i, name in enumerate(names)}
    elif isinstance(names, dict):
        names_dict = {int(k): str(v) for k, v in names.items()}
    else:
        raise TypeError(f"Unrecognized model class names container type: {type(names).__name__}")

    # 1. Assert Person class
    actual_person = names_dict.get(PERSON_CLASS)
    if actual_person != PERSON_NAME:
        raise ValueError(
            f"Model class name mismatch for ID {PERSON_CLASS}: expected '{PERSON_NAME}', got '{actual_person}'. "
            "Startup aborted to prevent silent mis-mapping of pedestrian detections."
        )

    # 2. Assert Vehicle classes
    for cid, expected_name in VEHICLE_CLASSES.items():
        actual_name = names_dict.get(cid)
        if actual_name != expected_name:
            raise ValueError(
                f"Model class name mismatch for ID {cid}: expected '{expected_name}', got '{actual_name}'. "
                "Startup aborted to prevent silent mis-mapping of vehicle detections."
            )

    logger.info("Successfully validated model class names for COCO IDs: 0, 2, 3, 5, 7.")


class YoloDetector:
    """
    YOLO26 object detector implementation.
    NMS-free end-to-end inference with strict disk-saving locks.
    """

    def __init__(
        self,
        model_path: str = "/models/yolo26n.pt",
        model_version: str = "yolo26n",
        imgsz: int = 640,  # UNVALIDATED resolution
        conf_threshold: float = 0.25,  # UNVALIDATED confidence threshold
        device: str = "cpu",
        mock_model: Any | None = None,
    ):
        self.model_path = model_path
        self.model_version = model_version
        self.imgsz = imgsz
        self.conf_threshold = conf_threshold
        self.device = device
        self._model: Any = None

        if mock_model is not None:
            # Use mock model (for testing without weights or ultralytics)
            self._model = mock_model
            verify_model_classes(self._model.names)
        else:
            self._load_and_verify_model()

    def _load_and_verify_model(self) -> None:
        """Loads weights, checks existence, and verifies class dictionary."""
        p = Path(self.model_path)
        if not p.is_file():
            raise FileNotFoundError(
                f"Model weights not found at path: {self.model_path}. "
                "Model weights belong under /models and must be mounted read-only. "
                "Do not commit model weights to git."
            )

        if not HAS_ULTRALYTICS:
            raise RuntimeError(
                "Ultralytics library is not installed in the current environment. "
                "Install ultralytics to execute YOLO26 inference."
            )

        logger.info(
            "Loading YOLO model from %s (version=%s, imgsz=%d, conf_threshold=%.2f, device=%s)",
            self.model_path,
            self.model_version,
            self.imgsz,
            self.conf_threshold,
            self.device,
        )

        try:
            self._model = YOLO(self.model_path)
        except Exception as e:
            raise RuntimeError(f"Failed to initialize YOLO model from {self.model_path}: {e}") from e

        # Assert class names at startup
        names = getattr(self._model, "names", {})
        verify_model_classes(names)

    def detect(self, frame: Any) -> list[Detection]:
        """
        Runs object detection on a single frame.

        Enforces:
          - NMS-free inference (no iou parameter).
          - Privacy locks: save=False, save_txt=False, save_crop=False.
          - Returns only tracked classes (person, car, motorcycle, bus, truck).
        """
        if self._model is None:
            return []

        # Predict with Ultralytics or mock model
        # NOTE: Do NOT pass iou or nms parameters; YOLO26 is natively end-to-end
        try:
            results = self._model.predict(
                source=frame,
                imgsz=self.imgsz,
                conf=self.conf_threshold,
                device=self.device,
                verbose=False,
                save=False,      # Privacy lock
                save_txt=False,  # Privacy lock
                save_crop=False, # Privacy lock
            )
        except (RuntimeError, ValueError, TypeError, AttributeError, IndexError) as e:
            logger.error("Inference failed on frame: %s", e)
            return []

        detections: list[Detection] = []
        if not results:
            return detections

        first_res = results[0]
        boxes = getattr(first_res, "boxes", None)
        if boxes is None:
            return detections

        # Extract coordinates, confidences, and classes
        # Support both PyTorch/Ultralytics tensor boxes and numpy mock boxes
        try:
            coords = boxes.xyxy.cpu().numpy() if hasattr(boxes.xyxy, "cpu") else boxes.xyxy
            confs = boxes.conf.cpu().numpy() if hasattr(boxes.conf, "cpu") else boxes.conf
            clss = boxes.cls.cpu().numpy() if hasattr(boxes.cls, "cpu") else boxes.cls
        except (RuntimeError, ValueError, TypeError, AttributeError, IndexError) as e:
            logger.error("Failed to parse detection boxes: %s", e)
            return detections

        names = getattr(self._model, "names", {})
        if isinstance(names, list):
            names = {i: n for i, n in enumerate(names)}

        for box, conf, cls_id in zip(coords, confs, clss):
            cid = int(cls_id)
            if cid in TRACKED_CLASS_IDS:
                class_name = names.get(cid, "unknown")
                detections.append(
                    Detection(
                        box=(float(box[0]), float(box[1]), float(box[2]), float(box[3])),
                        class_id=cid,
                        class_name=class_name,
                        confidence=float(conf),
                    )
                )

        return detections
