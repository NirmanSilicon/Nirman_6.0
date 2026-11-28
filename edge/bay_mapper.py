"""
ParkSMART - ROI Bay Mapper (File 152 / M2 Ownership)

Responsibility:
Loads bay Region-Of-Interest (ROI) polygons from contracts/configuration,
tests spatial intersections between detected vehicles and bay boundaries,
and produces per-bay state classifications ('occupied' vs 'free').

All spatial thresholds and intersection cutoffs are explicit UNVALIDATED placeholders.
Zero camera frames or cropped images are ever written to disk.
"""

from __future__ import annotations

import json
import logging
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from edge.detector import Detection

logger = logging.getLogger("parksmart.edge.bay_mapper")


def point_in_polygon(x: float, y: float, polygon: list[tuple[float, float]]) -> bool:
    """
    Standard Ray-Casting algorithm to test if point (x, y) is inside a polygon.
    Works for arbitrary convex or non-convex polygons.
    """
    n = len(polygon)
    if n < 3:
        return False

    inside = False
    p1x, p1y = polygon[0]
    for i in range(1, n + 1):
        p2x, p2y = polygon[i % n]
        if min(p1y, p2y) < y <= max(p1y, p2y) and x <= max(p1x, p2x):
            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x if p1y != p2y else p1x
            if p1x == p2x or x <= xinters:
                inside = not inside
        p1x, p1y = p2x, p2y

    return inside


def box_intersects_polygon(
    box: tuple[float, float, float, float],
    polygon: list[tuple[float, float]],
) -> bool:
    """
    Evaluates whether a detection bounding box (xmin, ymin, xmax, ymax) intersects
    or occupies a bay polygon:
      1. Bottom-center of bounding box is inside the polygon (wheels / road contact).
      2. Center point of bounding box is inside the polygon.
      3. Any corner of the bounding box is inside the polygon.
      4. Any polygon vertex is inside the bounding box.
    """
    xmin, ymin, xmax, ymax = box
    cx, cy = (xmin + xmax) / 2.0, (ymin + ymax) / 2.0
    bcx, bcy = (xmin + xmax) / 2.0, ymax

    # 1. Wheels / contact point test
    if point_in_polygon(bcx, bcy, polygon):
        return True

    # 2. Centroid test
    if point_in_polygon(cx, cy, polygon):
        return True

    # 3. Corners test
    corners = [(xmin, ymin), (xmax, ymin), (xmax, ymax), (xmin, ymax)]
    for px, py in corners:
        if point_in_polygon(px, py, polygon):
            return True

    # 4. Inverse test: check if any polygon vertex is contained inside the box
    for px, py in polygon:
        if xmin <= px <= xmax and ymin <= py <= ymax:
            return True

    return False


@dataclass
class BayRoi:
    """Represents a monitored parking bay and its spatial ROI polygon."""

    bay_id: str
    bay_identifier: str
    polygon: list[tuple[float, float]]  # Points in normalized or pixel coordinates
    is_normalized: bool = True

    def get_pixel_polygon(self, frame_width: int, frame_height: int) -> list[tuple[float, float]]:
        """Converts normalized (0.0..1.0) polygon points to pixel dimensions if needed."""
        if not self.is_normalized:
            return self.polygon
        return [(x * frame_width, y * frame_height) for x, y in self.polygon]


class BayMapper:
    """
    Loads ROI definitions and maps vehicle detections to parking bays.
    """

    def __init__(
        self,
        roi_mapping_path: str = "docs/contracts/roi_mapping.example.json",
        overlap_threshold: float = 0.30,  # UNVALIDATED threshold
        unoccupied_confidence: float = 1.0,  # UNVALIDATED default free confidence
    ):
        self.roi_mapping_path = roi_mapping_path
        self.overlap_threshold = overlap_threshold
        self.unoccupied_confidence = unoccupied_confidence
        self.bays: list[BayRoi] = []
        self.camera_id: str | None = None
        self.zone_id: str | None = None
        self._load_roi_file()

    def _load_roi_file(self) -> None:
        """Parses and validates the ROI configuration JSON file."""
        p = Path(self.roi_mapping_path)
        if not p.is_file():
            raise FileNotFoundError(
                f"ROI mapping contract file not found at: {self.roi_mapping_path}. "
                "Ensure docs/contracts/roi_mapping.example.json exists or configure a valid path."
            )

        with open(p, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.camera_id = data.get("camera_id")
        self.zone_id = data.get("zone_id")
        coord_type = data.get("coordinate_type", "normalized")
        is_normalized = coord_type == "normalized"

        raw_bays = data.get("bays", [])
        if not raw_bays:
            raise ValueError(f"ROI mapping file {self.roi_mapping_path} contains no bays.")

        self.bays = []
        for b in raw_bays:
            bid = str(uuid.UUID(str(b["bay_id"])))  # Validates UUID
            ident = b.get("bay_identifier", bid[:8])
            raw_poly = b.get("polygon", [])
            if len(raw_poly) < 3:
                raise ValueError(f"Bay {bid} polygon must have at least 3 vertices, got {len(raw_poly)}")

            poly = [(float(pt[0]), float(pt[1])) for pt in raw_poly]
            self.bays.append(
                BayRoi(
                    bay_id=bid,
                    bay_identifier=ident,
                    polygon=poly,
                    is_normalized=is_normalized,
                )
            )

        logger.info(
            "Loaded %d bay ROIs from %s (camera_id=%s, zone_id=%s)",
            len(self.bays),
            self.roi_mapping_path,
            self.camera_id,
            self.zone_id,
        )

    def map_detections(
        self,
        detections: list[Detection],
        frame_width: int = 1920,
        frame_height: int = 1080,
    ) -> list[dict[str, Any]]:
        """
        Maps vehicle detections to bay ROIs.

        Filters:
          - Only considers vehicle detections (car, motorcycle, bus, truck).
          - Pedestrians are strictly ignored for bay occupancy.

        Returns:
          List of BayReading dicts conforming to the telemetry contract:
          [
            {"bay_id": "...", "state": "occupied" | "free", "confidence": float},
            ...
          ]
        """
        # Filter only vehicles
        vehicle_detections = [d for d in detections if d.is_vehicle]

        bay_readings: list[dict[str, Any]] = []

        for bay in self.bays:
            pixel_polygon = bay.get_pixel_polygon(frame_width, frame_height)

            # Find all overlapping vehicle detections
            matching_vehicles: list[Detection] = []
            for v in vehicle_detections:
                if box_intersects_polygon(v.box, pixel_polygon):
                    matching_vehicles.append(v)

            if matching_vehicles:
                # Bay is occupied; assign max detection confidence
                best_conf = max(v.confidence for v in matching_vehicles)
                bay_readings.append({
                    "bay_id": bay.bay_id,
                    "state": "occupied",
                    "confidence": round(float(best_conf), 4),
                })
            else:
                # Bay is free
                bay_readings.append({
                    "bay_id": bay.bay_id,
                    "state": "free",
                    "confidence": round(float(self.unoccupied_confidence), 4),
                })

        return bay_readings
