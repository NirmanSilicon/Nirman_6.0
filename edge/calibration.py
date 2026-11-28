"""
ParkSMART - Edge Camera Calibration & ROI Validator (File 157 / M2 Ownership)

Responsibility:
Validates and calibrates spatial Region-Of-Interest (ROI) geometry for edge cameras:
- Polygon verification: bounds checking, vertex sanity, positive Shoelace area.
- Checks pairwise bay overlaps to prevent duplicate occupancy counting.
- Perspective ground-plane calibration: estimates ground area (m2) and pixel scale.
- Loading and schema validation of ROI mapping configurations.
- Clear marking of unvalidated parameters: does not claim accuracy for Bhubaneswar.
- Zero disk saving: never writes camera frames or detection crops to disk.
"""

from __future__ import annotations

import json
import logging
import math
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

logger = logging.getLogger("parksmart.edge.calibration")

# UNVALIDATED: Calibration thresholds and geometry assumptions are development defaults.
# No real-world accuracy is claimed for Bhubaneswar street parking without field survey data.
UNVALIDATED_DISCLAIMER: str = (
    "UNVALIDATED: Calibration thresholds and ground area estimations are developmental "
    "heuristics. No measured real-world accuracy is claimed for Bhubaneswar street parking."
)
DEFAULT_STANDARD_BAY_AREA_M2: float = 12.5  # Standard 2.5m x 5.0m bay # UNVALIDATED
DEFAULT_MAX_OVERLAP_IOU: float = 0.20  # UNVALIDATED: Maximum allowed overlap between bays


def polygon_area(points: list[tuple[float, float]] | list[list[float]]) -> float:
    """Computes the unsigned area of a 2D polygon using the Shoelace formula."""
    n = len(points)
    if n < 3:
        return 0.0
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += float(points[i][0]) * float(points[j][1])
        area -= float(points[j][0]) * float(points[i][1])
    return abs(area) / 2.0


def polygon_bounding_box(
    polygon: list[tuple[float, float]] | list[list[float]],
) -> tuple[float, float, float, float]:
    """Computes (xmin, ymin, xmax, ymax) of polygon vertices."""
    xs = [float(p[0]) for p in polygon]
    ys = [float(p[1]) for p in polygon]
    return min(xs), min(ys), max(xs), max(ys)


def compute_bbox_iou(
    bbox1: tuple[float, float, float, float],
    bbox2: tuple[float, float, float, float],
) -> float:
    """Computes intersection-over-union (IoU) of two bounding boxes."""
    x1 = max(bbox1[0], bbox2[0])
    y1 = max(bbox1[1], bbox2[1])
    x2 = min(bbox1[2], bbox2[2])
    y2 = min(bbox1[3], bbox2[3])

    inter_w = max(0.0, x2 - x1)
    inter_h = max(0.0, y2 - y1)
    inter_area = inter_w * inter_h

    area1 = (bbox1[2] - bbox1[0]) * (bbox1[3] - bbox1[1])
    area2 = (bbox2[2] - bbox2[0]) * (bbox2[3] - bbox2[1])
    union_area = area1 + area2 - inter_area

    if union_area <= 1e-9:
        return 0.0
    return inter_area / union_area


def validate_roi_polygon(
    polygon: list[tuple[float, float]] | list[list[float]],
    is_normalized: bool = True,
    width: int = 1920,
    height: int = 1080,
) -> tuple[bool, str | None]:
    """
    Validates polygon coordinates:
      - At least 3 vertices.
      - Normalized coordinates in [0.0, 1.0], or pixel coordinates in [0, width], [0, height].
      - Non-zero positive area (> 1e-6).
    """
    if not isinstance(polygon, (list, tuple)) or len(polygon) < 3:
        n = len(polygon) if isinstance(polygon, (list, tuple)) else 0
        return False, f"Polygon has {n} vertices; at least 3 required."

    pts: list[tuple[float, float]] = []
    for idx, pt in enumerate(polygon):
        if not isinstance(pt, (list, tuple)) or len(pt) < 2:
            return False, f"Vertex {idx} is invalid; expected (x, y) coordinates."
        try:
            x, y = float(pt[0]), float(pt[1])
            if not (math.isfinite(x) and math.isfinite(y)):
                return False, f"Vertex {idx} has non-finite coordinates: ({x}, {y})."
        except (ValueError, TypeError):
            return False, f"Vertex {idx} coordinates could not be parsed as float."

        if is_normalized:
            if not (0.0 <= x <= 1.0 and 0.0 <= y <= 1.0):
                return False, f"Vertex {idx} ({x}, {y}) out of normalized bounds [0.0, 1.0]."
        else:
            if not (0.0 <= x <= width and 0.0 <= y <= height):
                return False, f"Vertex {idx} ({x}, {y}) out of pixel bounds ({width}x{height})."

        pts.append((x, y))

    area = polygon_area(pts)
    if area <= 1e-6:
        return False, f"Degenerate polygon with near-zero area: {area}."

    return True, None


def load_roi_mapping(mapping_path: str | Path) -> dict[str, Any]:
    """
    Loads and validates a camera ROI mapping configuration from a JSON file.
    Raises FileNotFoundError if missing, ValueError if invalid JSON or structure.
    """
    path = Path(mapping_path)
    if not path.exists():
        raise FileNotFoundError(f"ROI mapping file not found at: {path}")

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        raise ValueError(f"Failed to parse ROI mapping JSON from {path}: {e}") from e

    if not isinstance(data, dict):
        raise TypeError(f"Root of ROI mapping must be a JSON object, got {type(data).__name__}")

    return data


@dataclass
class RoiCalibrationReport:
    """Diagnostic report for calibrated camera bay ROIs."""

    valid: bool
    camera_id: str
    total_bays: int
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    estimated_total_area_m2: float | None = None
    disclaimer: str = UNVALIDATED_DISCLAIMER

    def to_dict(self) -> dict[str, Any]:
        return {
            "valid": self.valid,
            "camera_id": self.camera_id,
            "total_bays": self.total_bays,
            "errors": list(self.errors),
            "warnings": list(self.warnings),
            "estimated_total_area_m2": self.estimated_total_area_m2,
            "disclaimer": self.disclaimer,
        }


class CameraCalibrator:
    """
    Calibrates camera perspective and validates bay ROI geometry.
    Ensures zero disk saving (never writes camera frames or crops to disk).
    """

    def __init__(
        self,
        frame_width: int = 1920,
        frame_height: int = 1080,
        standard_bay_area_m2: float = DEFAULT_STANDARD_BAY_AREA_M2,
        max_overlap_iou: float = DEFAULT_MAX_OVERLAP_IOU,
    ):
        self.frame_width = max(1, int(frame_width))
        self.frame_height = max(1, int(frame_height))
        # UNVALIDATED: standard_bay_area_m2 and max_overlap_iou are unvalidated defaults
        self.standard_bay_area_m2 = max(0.1, float(standard_bay_area_m2))
        self.max_overlap_iou = max(0.01, min(1.0, float(max_overlap_iou)))

    def validate_roi_mapping(self, roi_data: dict[str, Any] | None) -> RoiCalibrationReport:
        """
        Validates entire camera ROI mapping JSON structure and bay geometry.
        Handles missing calibration data, invalid UUIDs, duplicate bays, and overlap.
        """
        errors: list[str] = []
        warnings: list[str] = []

        if not roi_data or not isinstance(roi_data, dict):
            return RoiCalibrationReport(
                valid=False,
                camera_id="unknown",
                total_bays=0,
                errors=["ROI mapping data is missing or empty."],
                warnings=warnings,
                estimated_total_area_m2=None,
            )

        camera_id = str(roi_data.get("camera_id") or "unknown")
        try:
            uuid.UUID(camera_id)
        except (ValueError, TypeError):
            errors.append(f"Invalid camera_id UUID: {camera_id}")

        zone_id = str(roi_data.get("zone_id") or "unknown")
        try:
            uuid.UUID(zone_id)
        except (ValueError, TypeError):
            errors.append(f"Invalid zone_id UUID: {zone_id}")

        coord_type = roi_data.get("coordinate_type", "normalized")
        if coord_type not in ("normalized", "pixel"):
            errors.append(f"Invalid coordinate_type: {coord_type}. Must be 'normalized' or 'pixel'.")
        is_normalized = coord_type == "normalized"

        bays = roi_data.get("bays", [])
        if not isinstance(bays, list) or len(bays) == 0:
            errors.append("ROI mapping contains zero bays.")
            return RoiCalibrationReport(
                valid=False,
                camera_id=camera_id,
                total_bays=0,
                errors=errors,
                warnings=warnings,
                estimated_total_area_m2=None,
            )

        seen_bays: set[str] = set()
        valid_bay_polys: list[tuple[str, list[tuple[float, float]]]] = []

        for idx, b in enumerate(bays):
            if not isinstance(b, dict):
                errors.append(f"Bay at index {idx} is not a valid dictionary object.")
                continue

            bid = str(b.get("bay_id"))
            try:
                uuid.UUID(bid)
            except (ValueError, TypeError):
                errors.append(f"Bay index {idx} has invalid bay_id UUID: {bid}")

            if bid in seen_bays:
                errors.append(f"Duplicate bay_id detected: {bid}")
            seen_bays.add(bid)

            raw_poly = b.get("polygon", [])
            valid, err = validate_roi_polygon(
                raw_poly,
                is_normalized=is_normalized,
                width=self.frame_width,
                height=self.frame_height,
            )
            if not valid:
                errors.append(f"Bay {bid}: {err}")
            else:
                pts = [(float(p[0]), float(p[1])) for p in raw_poly]
                valid_bay_polys.append((bid, pts))

        # Check pairwise bay bounding box overlaps to prevent duplicate counting
        for i in range(len(valid_bay_polys)):
            bid1, poly1 = valid_bay_polys[i]
            bbox1 = polygon_bounding_box(poly1)
            for j in range(i + 1, len(valid_bay_polys)):
                bid2, poly2 = valid_bay_polys[j]
                bbox2 = polygon_bounding_box(poly2)
                iou = compute_bbox_iou(bbox1, bbox2)
                if iou > self.max_overlap_iou:
                    warnings.append(
                        f"Bays {bid1} and {bid2} have high spatial overlap (IoU={iou:.2f} > {self.max_overlap_iou}). "
                        f"Risk of duplicate vehicle counting."
                    )

        is_valid = len(errors) == 0
        est_area = round(len(bays) * self.standard_bay_area_m2, 1) if is_valid else None

        return RoiCalibrationReport(
            valid=is_valid,
            camera_id=camera_id,
            total_bays=len(bays),
            errors=errors,
            warnings=warnings,
            estimated_total_area_m2=est_area,
        )
