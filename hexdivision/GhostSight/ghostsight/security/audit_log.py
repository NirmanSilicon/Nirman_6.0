"""Audit log: an append-only record of what GhostSight was asked to do.

Rules:
- One JSON object per line. Each record holds the hash of the record before it,
  so a changed, removed or reordered record is detected by `verify_chain`.
- The chain is tamper-evident, not tamper-proof. Someone who can write the file
  can rebuild every hash. Removing the last record is also not detected.
- Nothing is stored except the event name, a cut target, the decision and a
  reason. Scan results, banners and AI text never go in.
- Fail closed: if the log cannot be read or written, `append_record` raises
  `AuditError`, and the caller must refuse the action.
- Known limits: no file locking (two processes writing at once could fork the
  chain, which `verify_chain` would report), and the whole file is read on every
  append.
"""

import hashlib
import json
import os
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path

from ghostsight.paths import get_home_dir

GENESIS_HASH = "0" * 64
EVENTS = frozenset(
    {
        "scan",
        "nvd-fetch",
        "analyse-save",
        "explain-save",
        "msf-query",
        "validate-check",
    }
)
MAX_TARGET_CHARS = 200
MAX_REASON_CHARS = 500
FIELDS = ("time", "event", "target", "allowed", "reason", "previous_hash", "hash")


class AuditError(Exception):
    """Raised when the audit log cannot be used. The action must not go ahead."""


@dataclass(frozen=True)
class AuditRecord:
    """One line of the audit log."""

    time: str
    event: str
    target: str
    allowed: bool
    reason: str
    previous_hash: str
    hash: str


@dataclass(frozen=True)
class ChainCheck:
    """The result of checking the log. `count` is the number of good records."""

    ok: bool
    count: int
    problem: str = ""


def _digest(
    time: str, event: str, target: str, allowed: bool, reason: str, previous_hash: str
) -> str:
    """Hash every field except the hash itself, in a fixed text form."""
    body = {
        "time": time,
        "event": event,
        "target": target,
        "allowed": allowed,
        "reason": reason,
        "previous_hash": previous_hash,
    }
    text = json.dumps(body, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _hash_of(record: AuditRecord) -> str:
    return _digest(
        record.time,
        record.event,
        record.target,
        record.allowed,
        record.reason,
        record.previous_hash,
    )


def _parse_line(line: str) -> AuditRecord:
    """Read one line strictly. Raises ValueError if it is not a valid record."""
    try:
        data = json.loads(line)
    except (ValueError, RecursionError):
        raise ValueError("not JSON") from None
    if not isinstance(data, dict) or set(data) != set(FIELDS):
        raise ValueError("wrong fields")
    for name in FIELDS:
        expected = bool if name == "allowed" else str
        if not isinstance(data[name], expected):
            raise ValueError("wrong type")
    return AuditRecord(**data)


def _walk(path: Path) -> tuple[ChainCheck, str]:
    """Check the whole file. Return the result and the last good hash."""
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ChainCheck(True, 0), GENESIS_HASH
    except (OSError, UnicodeDecodeError):
        return ChainCheck(False, 0, "The audit log cannot be read."), GENESIS_HASH

    previous = GENESIS_HASH
    count = 0
    for number, line in enumerate(text.splitlines(), start=1):
        try:
            record = _parse_line(line)
        except ValueError:
            problem = f"record {number} is not a valid audit record."
            return ChainCheck(False, count, problem), previous
        if record.previous_hash != previous:
            problem = f"record {number} does not follow the record before it."
            return ChainCheck(False, count, problem), previous
        if record.hash != _hash_of(record):
            problem = f"record {number} was changed."
            return ChainCheck(False, count, problem), previous
        previous = record.hash
        count += 1
    return ChainCheck(True, count), previous


def verify_chain(path: Path) -> ChainCheck:
    """Check every record. A missing file is fine: nothing has been recorded yet."""
    return _walk(path)[0]


def append_record(
    path: Path,
    event: str,
    target: str,
    allowed: bool,
    reason: str,
    now: datetime | None = None,
) -> AuditRecord:
    """Add one record. Raises AuditError, and writes nothing, if that is not safe."""
    if event not in EVENTS:
        raise AuditError("Unknown audit event.")

    check, previous = _walk(path)
    if not check.ok:
        raise AuditError("The audit log is damaged or unreadable, so nothing was recorded.")

    moment = now if now is not None else datetime.now(UTC)
    stamp = moment.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    clean_target = target[:MAX_TARGET_CHARS]
    clean_reason = reason[:MAX_REASON_CHARS]
    digest = _digest(stamp, event, clean_target, allowed, clean_reason, previous)
    record = AuditRecord(stamp, event, clean_target, allowed, clean_reason, previous, digest)

    line = json.dumps(asdict(record), sort_keys=True)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        descriptor = os.open(path, os.O_WRONLY | os.O_APPEND | os.O_CREAT, 0o600)
        with os.fdopen(descriptor, "a", encoding="utf-8") as handle:
            handle.write(line + "\n")
            handle.flush()
            os.fsync(handle.fileno())
    except OSError as error:
        raise AuditError("The audit log could not be written.") from error
    return record


def default_audit_path() -> Path:
    """Where the audit log lives: <home>/logs/audit.jsonl."""
    return get_home_dir() / "logs" / "audit.jsonl"
