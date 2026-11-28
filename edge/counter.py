"""
ParkSMART - Edge Object & Crowd Counter (File 153 / M2 Ownership)

Responsibility:
Aggregates object detections into separate vehicle and pedestrian counts,
categorizes vehicles into classes (car, two_wheeler, bus, truck, van),
computes crowd density when monitored area is configured, and preserves
vehicle counts strictly separate from pedestrian counts.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from edge.detector import PERSON_CLASS, Detection

logger = logging.getLogger("parksmart.edge.counter")


@dataclass(frozen=True)
class CrowdCounts:
    """Structured count payload for crowd monitoring."""

    vehicle_count: int
    vehicle_by_category: dict[str, int]
    pedestrian_count: int
    density_per_m2: float | None
    quality: str = "ok"

    def to_dict(self) -> dict[str, Any]:
        return {
            "vehicle_count": self.vehicle_count,
            "vehicle_by_category": dict(self.vehicle_by_category),
            "pedestrian_count": self.pedestrian_count,
            "density_per_m2": self.density_per_m2,
            "quality": self.quality,
        }


class ObjectCounter:
    """
    Counts and categorizes detections across frames.
    Preserves vehicle_count strictly separate from pedestrian_count.
    """

    def __init__(self, area_m2: float | None = None):
        self.area_m2 = float(area_m2) if area_m2 is not None and area_m2 > 0 else None

    def count(self, detections: list[Detection]) -> CrowdCounts:
        """
        Calculates separate vehicle counts and pedestrian counts from detections.

        Categories:
          - car (class 2)
          - two_wheeler (class 3 motorcycle)
          - bus (class 5)
          - truck (class 7)
          - van: always 0 (COCO dataset has no separate van class)
          - pedestrian: class 0 (person)
        """
        car_count = 0
        two_wheeler_count = 0
        bus_count = 0
        truck_count = 0
        pedestrian_count = 0

        for d in detections:
            if d.class_id == PERSON_CLASS:
                pedestrian_count += 1
            elif d.class_id == 2:
                car_count += 1
            elif d.class_id == 3:
                two_wheeler_count += 1
            elif d.class_id == 5:
                bus_count += 1
            elif d.class_id == 7:
                truck_count += 1

        vehicle_by_category = {
            "car": car_count,
            "two_wheeler": two_wheeler_count,
            "bus": bus_count,
            "truck": truck_count,
            "van": 0,  # Explicit 0 for COCO
        }
        vehicle_count = sum(vehicle_by_category.values())

        # Density per square meter: based on pedestrians in the monitored zone area
        density_per_m2 = None
        if self.area_m2 is not None and self.area_m2 > 0:
            density_per_m2 = round(float(pedestrian_count) / self.area_m2, 4)

        return CrowdCounts(
            vehicle_count=vehicle_count,
            vehicle_by_category=vehicle_by_category,
            pedestrian_count=pedestrian_count,
            density_per_m2=density_per_m2,
            quality="ok",
        )
