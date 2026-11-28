"""
ParkSMART - Occupancy History Aggregation Worker Job (File 144 / M2 Ownership)

Responsibility:
Aggregates raw telemetry events and observations into standard hourly and 15-minute
occupancy aggregate time buckets (occupancy_aggregate / occupancy_history).
Computes mean occupancy percentage, vehicle counts, pedestrian counts, and preserves
data provenance (observed, simulated, mixed).
"""

from __future__ import annotations

import logging
import math
import sys
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import numpy as np

# Ensure project root in sys.path
root_dir = Path(__file__).resolve().parent.parent.parent.parent
backend_dir = root_dir / "backend"
for p in (str(root_dir), str(backend_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

logger = logging.getLogger("parksmart.workers.aggregation")


@dataclass
class AggregationBucket:
    """Represents an aggregated time bucket for a zone."""

    zone_id: str
    bucket_start: datetime
    bucket_end: datetime
    interval_min: int
    occupancy_pct: float
    vehicle_count: int
    pedestrian_count: int
    sample_count: int
    provenance: str  # "observed" | "simulated" | "mixed"
    data_quality: str = "nominal"  # "nominal" | "sparse" | "missing"

    def to_dict(self) -> dict[str, Any]:
        return {
            "zone_id": self.zone_id,
            "bucket_start": self.bucket_start.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "bucket_end": self.bucket_end.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "interval_min": self.interval_min,
            "occupancy_pct": round(float(self.occupancy_pct), 2),
            "vehicle_count": int(self.vehicle_count),
            "pedestrian_count": int(self.pedestrian_count),
            "sample_count": int(self.sample_count),
            "provenance": self.provenance,
            "data_quality": self.data_quality,
        }


def parse_observation_timestamp(
    raw_ts: Any,
    reference_time: datetime | None = None,
    max_future_seconds: float | None = None,
) -> datetime | None:
    """
    Safely parses timestamp into UTC datetime.
    Optionally rejects timestamps exceeding max_future_seconds relative to reference_time.
    """
    if not raw_ts:
        return None
    try:
        if isinstance(raw_ts, datetime):
            dt = raw_ts if raw_ts.tzinfo else raw_ts.replace(tzinfo=UTC)
        elif isinstance(raw_ts, str):
            clean_ts = raw_ts.strip().replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean_ts)
        else:
            return None
        dt_utc = dt.astimezone(UTC)
        if max_future_seconds is not None:
            ref_utc = reference_time if reference_time is not None else datetime.now(UTC)
            if ref_utc.tzinfo is None:
                ref_utc = ref_utc.replace(tzinfo=UTC)
            else:
                ref_utc = ref_utc.astimezone(UTC)
            if dt_utc > ref_utc + timedelta(seconds=max_future_seconds):
                logger.warning("Rejected future observation timestamp: %s (> %ss in future)", raw_ts, max_future_seconds)
                return None
        return dt_utc
    except (ValueError, TypeError, OverflowError) as e:
        logger.debug("Failed to parse observation timestamp '%s': %s", raw_ts, e)
        return None


class AggregationStore:
    """In-memory thread-safe storage for aggregated history during runs/tests."""

    def __init__(self) -> None:
        # Key: (zone_id, bucket_start_iso, interval_min)
        self._aggregates: dict[tuple[str, str, int], AggregationBucket] = {}

    def upsert(self, bucket: AggregationBucket) -> None:
        key = (bucket.zone_id, bucket.bucket_start.strftime("%Y-%m-%dT%H:%M:%SZ"), bucket.interval_min)
        self._aggregates[key] = bucket

    def get_zone_history(
        self,
        zone_id: str | uuid.UUID,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        interval_min: int = 60,
    ) -> list[AggregationBucket]:
        zid = str(uuid.UUID(str(zone_id)))
        results: list[AggregationBucket] = []
        for (z, bs, im), b in self._aggregates.items():
            if z == zid and im == interval_min:
                if start_time and b.bucket_start < start_time:
                    continue
                if end_time and b.bucket_end > end_time:
                    continue
                results.append(b)
        results.sort(key=lambda x: x.bucket_start)
        return results

    def clear(self) -> None:
        self._aggregates.clear()


# Default process-level store
_STORE = AggregationStore()


def get_aggregation_store() -> AggregationStore:
    return _STORE


def aggregate_raw_observations(
    observations: list[dict[str, Any]],
    interval_min: int = 60,
    default_zone_id: str | None = None,
    max_future_seconds: float | None = None,
    reference_time: datetime | None = None,
) -> list[AggregationBucket]:
    """
    Groups raw observation events into time buckets of interval_min minutes.
    Deduplicates incoming telemetry, handles missing and boundary readings safely,
    and computes mean occupancy percentage, vehicle count, pedestrian count,
    data quality, and provenance.
    """
    if not observations:
        return []

    interval_td = timedelta(minutes=interval_min)

    # 1. Deduplicate input observations by msg_id or (camera_id, raw_ts, topic)
    seen_msg_ids: set[str] = set()
    seen_camera_ts: set[tuple[str, str, str]] = set()
    deduped_observations: list[dict[str, Any]] = []

    for obs in observations:
        if not isinstance(obs, dict):
            continue
        msg_id = obs.get("msg_id")
        if msg_id:
            msg_str = str(msg_id)
            if msg_str in seen_msg_ids:
                logger.debug("Aggregation: dropped duplicate msg_id %s", msg_str)
                continue
            seen_msg_ids.add(msg_str)
        else:
            cam_id = str(obs.get("camera_id") or "")
            ts_str = str(obs.get("ts") or obs.get("observed_at") or obs.get("created_at") or "")
            topic = str(obs.get("topic") or "")
            if cam_id and ts_str:
                cam_key = (cam_id, ts_str, topic)
                if cam_key in seen_camera_ts:
                    logger.debug("Aggregation: dropped duplicate camera timestamp %s", cam_key)
                    continue
                seen_camera_ts.add(cam_key)

        deduped_observations.append(obs)

    # 2. Group deduplicated observations by (zone_id, bucket_start)
    buckets_map: dict[tuple[str, datetime], list[dict[str, Any]]] = {}

    for obs in deduped_observations:
        zid = str(obs.get("zone_id") or default_zone_id or "00000000-0000-0000-0000-000000000000")
        raw_ts = obs.get("ts") or obs.get("observed_at") or obs.get("created_at")
        ts_utc = parse_observation_timestamp(
            raw_ts,
            reference_time=reference_time,
            max_future_seconds=max_future_seconds,
        )
        if ts_utc is None:
            continue

        # Floor timestamp to interval boundary
        minute = (ts_utc.minute // interval_min) * interval_min
        bucket_start = ts_utc.replace(minute=minute, second=0, microsecond=0)

        key = (zid, bucket_start)
        if key not in buckets_map:
            buckets_map[key] = []
        buckets_map[key].append(obs)

    aggregated_buckets: list[AggregationBucket] = []

    for (zid, b_start), items in sorted(buckets_map.items()):
        b_end = b_start + interval_td

        # Extract occupancy fractions, vehicle counts, and pedestrian counts
        occ_samples: list[float] = []
        veh_samples: list[int] = []
        ped_samples: list[int] = []
        provenances: set[str] = set()

        for item in items:
            prov = item.get("provenance", "observed")
            provenances.add(prov)

            # Bays occupancy calculation if raw bays list provided
            if "bays" in item and isinstance(item["bays"], list):
                bays = item["bays"]
                if bays:
                    valid_bays = [b for b in bays if b.get("state") in ("occupied", "free")]
                    if valid_bays:
                        occ_count = sum(1 for b in valid_bays if b.get("state") == "occupied")
                        occ_samples.append((occ_count / len(valid_bays)) * 100.0)
            elif "occupancy_pct" in item and item["occupancy_pct"] is not None:
                try:
                    val = float(item["occupancy_pct"])
                    if math.isfinite(val):
                        occ_samples.append(max(0.0, min(100.0, val)))
                except (ValueError, TypeError):
                    pass

            if "vehicle_count" in item and item["vehicle_count"] is not None:
                try:
                    v_val = int(item["vehicle_count"])
                    if v_val >= 0:
                        veh_samples.append(v_val)
                except (ValueError, TypeError):
                    pass

            if "pedestrian_count" in item and item["pedestrian_count"] is not None:
                try:
                    p_val = int(item["pedestrian_count"])
                    if p_val >= 0:
                        ped_samples.append(p_val)
                except (ValueError, TypeError):
                    pass

        mean_occ = float(np.mean(occ_samples)) if occ_samples else 0.0
        mean_veh = round(float(np.mean(veh_samples))) if veh_samples else 0
        mean_ped = round(float(np.mean(ped_samples))) if ped_samples else 0

        # Provenance resolution
        if len(provenances) == 1:
            final_prov = next(iter(provenances))
        elif len(provenances) > 1:
            final_prov = "mixed"
        else:
            final_prov = "observed"

        # Data quality determination
        if not occ_samples:
            quality = "missing"
        elif len(occ_samples) < 6:
            quality = "sparse"
        else:
            quality = "nominal"

        bucket = AggregationBucket(
            zone_id=zid,
            bucket_start=b_start,
            bucket_end=b_end,
            interval_min=interval_min,
            occupancy_pct=round(mean_occ, 2),
            vehicle_count=mean_veh,
            pedestrian_count=mean_ped,
            sample_count=len(items),
            provenance=final_prov,
            data_quality=quality,
        )
        aggregated_buckets.append(bucket)

    return aggregated_buckets


def run_aggregation_job(
    raw_observations: list[dict[str, Any]] | None = None,
    interval_min: int = 60,
    store: AggregationStore | None = None,
) -> list[AggregationBucket]:
    """
    Executes the aggregation worker job.
    Saves aggregated buckets into the aggregation store.
    """
    target_store = store or _STORE
    observations = raw_observations or []
    buckets = aggregate_raw_observations(observations, interval_min=interval_min)

    for b in buckets:
        target_store.upsert(b)

    logger.info("Aggregation job completed: created %d buckets (interval=%d min)", len(buckets), interval_min)
    return buckets
