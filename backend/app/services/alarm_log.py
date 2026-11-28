"""Uploaded alarm event log parser and flood consolidation service."""

from collections import Counter, defaultdict
from collections.abc import Iterable
import io
import json
import math
from pathlib import Path
import re
from typing import Any, Final, Literal

import pandas as pd

from app.config import get_sensor_label

ALARM_LOG_COLUMN_ALIASES: Final[dict[str, tuple[str, ...]]] = {
    "tag": ("tag", "sensor", "source", "variable"),
    "timestamp": ("timestamp", "time", "ts", "datetime"),
    "severity": ("severity", "priority", "level"),
    "value": ("value",),
    "threshold": ("threshold",),
    "unit": ("unit",),
    "message": ("message", "description"),
}

CRITICAL_LOG_SEVERITIES: Final[frozenset[str]] = frozenset(
    {"HIGH_HIGH", "LOW_LOW", "CRITICAL"}
)
WARNING_LOG_SEVERITIES: Final[frozenset[str]] = frozenset({"HIGH", "LOW"})

TimestampSortKey = tuple[int, float, int, str]


def _detect_alarm_log_format(
    raw_bytes: bytes,
    filename: str | None = None,
) -> Literal["csv", "json"]:
    """Determine alarm log format ('csv' or 'json') from extension or content."""
    suffix = Path(filename).suffix.lower() if filename else ""
    if suffix == ".csv":
        return "csv"
    if suffix == ".json":
        return "json"
    if suffix:
        raise ValueError(
            f"Unsupported alarm log file extension '{suffix}'. Upload a .csv or .json file."
        )

    stripped = raw_bytes.decode("utf-8-sig", errors="replace").lstrip()
    return "json" if stripped.startswith(("{", "[")) else "csv"


def _parse_json_alarm_rows(text: str) -> list[dict[str, Any]]:
    """Parse JSON alarm log text into a list of event objects."""
    try:
        payload = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON alarm log: {exc.msg}.") from exc

    records = payload.get("alarms") if isinstance(payload, dict) else payload
    if not isinstance(records, list) or not records:
        raise ValueError(
            "JSON alarm log must be a non-empty array or an object containing a non-empty 'alarms' array."
        )
    if not all(isinstance(item, dict) for item in records):
        raise ValueError("Each entry in a JSON alarm log must be a JSON object.")
    return records


def _parse_csv_alarm_rows(text: str) -> list[dict[str, Any]]:
    """Parse comma- or semicolon-delimited CSV alarm log text into event dicts."""
    first_non_empty = next(
        (line.strip() for line in text.splitlines() if line.strip()),
        "",
    )
    separator = (
        ";"
        if first_non_empty.count(";") > first_non_empty.count(",")
        else ","
    )
    try:
        df = pd.read_csv(
            io.StringIO(text),
            sep=separator,
            dtype=str,
            keep_default_na=False,
        )
    except (pd.errors.EmptyDataError, pd.errors.ParserError, ValueError) as exc:
        raise ValueError(f"Unable to parse CSV alarm log: {exc}") from exc

    if df.empty:
        raise ValueError("Uploaded CSV alarm log contains no event rows.")
    return df.to_dict(orient="records")


def _parse_alarm_log_rows(
    raw_bytes: bytes,
    file_format: Literal["csv", "json"],
) -> list[dict[str, Any]]:
    """Decode uploaded UTF-8 bytes and parse raw alarm event dictionaries."""
    try:
        text = raw_bytes.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError("Alarm log must be valid UTF-8 text.") from exc

    if not text.strip():
        raise ValueError("Uploaded alarm log file is empty.")

    if file_format == "json":
        return _parse_json_alarm_rows(text)
    return _parse_csv_alarm_rows(text)


def _resolve_alarm_columns(columns: Iterable[Any]) -> dict[str, list[str]]:
    """Map canonical alarm fields to ordered matching columns case-insensitively."""
    lower_to_actual: dict[str, str] = {}
    for col in columns:
        normalized = str(col).strip().lower()
        if normalized and normalized not in lower_to_actual:
            lower_to_actual[normalized] = str(col)

    resolved: dict[str, list[str]] = {}
    for canonical, aliases in ALARM_LOG_COLUMN_ALIASES.items():
        matches = [
            lower_to_actual[alias]
            for alias in aliases
            if alias in lower_to_actual
        ]
        if matches:
            resolved[canonical] = matches

    if "tag" not in resolved:
        raise ValueError(
            "Alarm log is missing a required tag column "
            "(accepted names: tag, sensor, source, variable)."
        )
    return resolved


def _clean_optional_text(raw_value: Any) -> str | None:
    """Convert a scalar cell value to a trimmed string, or None when blank/missing."""
    if raw_value is None or isinstance(raw_value, (bool, dict, list, tuple, set)):
        return None
    if isinstance(raw_value, float) and math.isnan(raw_value):
        return None
    if pd.isna(raw_value):
        return None
    text = str(raw_value).strip()
    return text or None


def _normalize_log_severity(raw_severity: Any) -> str:
    """Normalize alarm severity labels into uppercase underscore keys."""
    text = _clean_optional_text(raw_severity)
    if text is None:
        return "UNKNOWN"
    return re.sub(r"[\s-]+", "_", text.upper())


def _parse_optional_float(raw_value: Any) -> float | None:
    """Safely parse a finite float measurement/threshold or return None."""
    if raw_value is None or isinstance(raw_value, (bool, dict, list, tuple, set)):
        return None
    if isinstance(raw_value, str) and not raw_value.strip():
        return None
    try:
        if pd.isna(raw_value):
            return None
        parsed = float(raw_value)
    except (TypeError, ValueError):
        return None
    return parsed if math.isfinite(parsed) else None


def _build_timestamp_sort_key(
    ts_text: str | None,
    row_index: int,
) -> TimestampSortKey:
    """Build deterministic chronological sort key preserving row order on ties."""
    if not ts_text:
        return (1, 0.0, row_index, "")
    parsed = pd.to_datetime(ts_text, errors="coerce", utc=True)
    if pd.notna(parsed):
        return (0, float(parsed.timestamp()), row_index, ts_text)
    return (1, 0.0, row_index, ts_text)


def _severity_priority_weight(severity: str) -> int:
    """Return ranking tier: critical (0) < high/low warning (1) < other (2)."""
    if severity in CRITICAL_LOG_SEVERITIES:
        return 0
    if severity in WARNING_LOG_SEVERITIES:
        return 1
    return 2


def _first_present_field(row: dict[str, Any], candidates: list[str]) -> Any:
    """Return the first non-empty alias value present in a parsed event row."""
    for col in candidates:
        if col in row and row[col] is not None:
            if isinstance(row[col], str) and not row[col].strip():
                continue
            return row[col]
    return None


def _extract_normalized_events(raw_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Normalize column names/values, drop blank tags, and sort chronologically."""
    all_keys: list[str] = []
    seen_keys: set[str] = set()
    for row in raw_rows:
        for key in row:
            key_str = str(key)
            if key_str not in seen_keys:
                seen_keys.add(key_str)
                all_keys.append(key_str)

    col_candidates = _resolve_alarm_columns(all_keys)
    tag_cols = col_candidates["tag"]
    ts_cols = col_candidates.get("timestamp", [])
    sev_cols = col_candidates.get("severity", [])
    val_cols = col_candidates.get("value", [])
    thr_cols = col_candidates.get("threshold", [])
    unit_cols = col_candidates.get("unit", [])
    msg_cols = col_candidates.get("message", [])

    events: list[dict[str, Any]] = []
    for row_index, row in enumerate(raw_rows):
        tag = _clean_optional_text(_first_present_field(row, tag_cols))
        if tag is None:
            continue

        ts_text = (
            _clean_optional_text(_first_present_field(row, ts_cols))
            if ts_cols
            else None
        )
        events.append(
            {
                "row_index": row_index,
                "tag": tag,
                "timestamp": ts_text,
                "sort_key": _build_timestamp_sort_key(ts_text, row_index),
                "severity": (
                    _normalize_log_severity(_first_present_field(row, sev_cols))
                    if sev_cols
                    else "UNKNOWN"
                ),
                "value": (
                    _parse_optional_float(_first_present_field(row, val_cols))
                    if val_cols
                    else None
                ),
                "threshold": (
                    _parse_optional_float(_first_present_field(row, thr_cols))
                    if thr_cols
                    else None
                ),
                "unit": (
                    (_clean_optional_text(_first_present_field(row, unit_cols)) or "")
                    if unit_cols
                    else ""
                ),
                "message": (
                    (_clean_optional_text(_first_present_field(row, msg_cols)) or "")
                    if msg_cols
                    else ""
                ),
            }
        )

    if not events:
        raise ValueError(
            "Uploaded alarm log contains no valid rows with a non-empty tag."
        )

    events.sort(key=lambda item: item["sort_key"])
    return events


def _build_alarm_timeline(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Aggregate chronologically ordered raw events into per-timestamp counts."""
    buckets: dict[str, dict[str, Any]] = {}
    for item in events:
        bucket_key = item["timestamp"] or "Unstamped"
        bucket = buckets.get(bucket_key)
        if bucket is None:
            bucket = {
                "timestamp": bucket_key,
                "sort_key": item["sort_key"],
                "count": 0,
                "critical_count": 0,
            }
            buckets[bucket_key] = bucket
        bucket["count"] += 1
        if item["severity"] in CRITICAL_LOG_SEVERITIES:
            bucket["critical_count"] += 1

    return [
        {
            "timestamp": bucket["timestamp"],
            "count": bucket["count"],
            "critical_count": bucket["critical_count"],
        }
        for bucket in sorted(buckets.values(), key=lambda b: b["sort_key"])
    ]


def _rank_priority_alarms(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Group events by (tag, severity) and rank by weight, count, and earliest onset."""
    grouped: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for item in events:
        grouped[(item["tag"], item["severity"])].append(item)

    ranked_pairs: list[
        tuple[tuple[int, int, TimestampSortKey, str, str], dict[str, Any]]
    ] = []

    for (tag, severity), group_events in grouped.items():
        first_item = group_events[0]
        count = len(group_events)
        resolved_label = get_sensor_label(tag)
        last_timestamp = next(
            (ev["timestamp"] for ev in reversed(group_events) if ev["timestamp"] is not None),
            None,
        )

        summary = {
            "tag": tag,
            "label": resolved_label if resolved_label != tag else "",
            "severity": severity,
            "event_count": count,
            "suppressed_count": count - 1,
            "first_timestamp": first_item["timestamp"],
            "last_timestamp": last_timestamp,
            "latest_value": next(
                (ev["value"] for ev in reversed(group_events) if ev["value"] is not None),
                None,
            ),
            "threshold": next(
                (
                    ev["threshold"]
                    for ev in reversed(group_events)
                    if ev["threshold"] is not None
                ),
                None,
            ),
            "unit": next(
                (ev["unit"] for ev in reversed(group_events) if ev["unit"]),
                "",
            ),
            "message": next(
                (ev["message"] for ev in reversed(group_events) if ev["message"]),
                "",
            ),
        }
        sort_key = (
            _severity_priority_weight(severity),
            -count,
            first_item["sort_key"],
            tag,
            severity,
        )
        ranked_pairs.append((sort_key, summary))

    ranked_pairs.sort(key=lambda pair: pair[0])
    return [pair[1] for pair in ranked_pairs]


def consolidate_alarm_log(
    raw_bytes: bytes,
    filename: str | None = None,
) -> dict[str, Any]:
    """Parse raw CSV or JSON alarm events and produce flood consolidation summary."""
    if not raw_bytes:
        raise ValueError("Uploaded alarm log file is empty.")

    normalized_name = (filename or "").replace("\\", "/")
    safe_filename = Path(normalized_name).name or "alarm_log"
    file_format = _detect_alarm_log_format(raw_bytes, safe_filename)
    raw_rows = _parse_alarm_log_rows(raw_bytes, file_format)
    events = _extract_normalized_events(raw_rows)

    raw_event_count = len(events)
    first_event = events[0]
    severity_counts = Counter(item["severity"] for item in events)
    severity_breakdown = dict(
        sorted(
            severity_counts.items(),
            key=lambda kv: (_severity_priority_weight(kv[0]), -kv[1], kv[0]),
        )
    )
    priority_alarms = _rank_priority_alarms(events)
    consolidated_alarm_count = len(priority_alarms)
    suppressed_event_count = raw_event_count - consolidated_alarm_count
    reduction_pct = (
        round((suppressed_event_count / raw_event_count) * 100.0, 2)
        if raw_event_count > 0
        else 0.0
    )

    return {
        "filename": safe_filename,
        "format": file_format,
        "raw_event_count": raw_event_count,
        "consolidated_alarm_count": consolidated_alarm_count,
        "suppressed_event_count": suppressed_event_count,
        "reduction_pct": reduction_pct,
        "first_triggered_tag": first_event["tag"],
        "first_triggered_timestamp": first_event["timestamp"],
        "severity_breakdown": severity_breakdown,
        "alarm_timeline": _build_alarm_timeline(events),
        "priority_alarms": priority_alarms,
    }
