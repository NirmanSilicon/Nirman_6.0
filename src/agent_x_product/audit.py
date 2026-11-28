from datetime import UTC, datetime

from agent_x_shared.catalog import digest

SENSITIVE_KEYS = {"authorization", "token", "password", "secret", "api_key", "credentials"}


def redact(value):
    if isinstance(value, dict):
        return {key: "[REDACTED]" if key.lower() in SENSITIVE_KEYS else redact(item)
                for key, item in value.items()}
    if isinstance(value, list):
        return [redact(item) for item in value]
    return value


def append_event(run: dict, kind: str, details: dict, origin: str = "product"):
    event = {
        "sequence": len(run["events"]) + 1,
        "timestamp": datetime.now(UTC).isoformat(), "kind": kind,
        "origin": origin, "details": redact(details),
        "previous_hash": run["events"][-1]["hash"] if run["events"] else "0" * 64,
    }
    event["hash"] = digest(event)
    run["events"].append(event)
