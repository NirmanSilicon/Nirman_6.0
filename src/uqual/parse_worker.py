"""Single-use parser subprocess. No model loading, network calls or disk output."""

from __future__ import annotations

import json
import logging
import sys


def main():
    logging.disable(logging.CRITICAL)
    try:
        import resource

        resource.setrlimit(resource.RLIMIT_CPU, (30, 35))
        if sys.platform.startswith("linux"):
            resource.setrlimit(resource.RLIMIT_AS, (2 * 1024**3, 2 * 1024**3))
    except (ImportError, ValueError, OSError):
        pass
    from .ingestion import MAX_BYTES, IngestionError, parse_statement

    try:
        payload = sys.stdin.buffer.read(MAX_BYTES + 1)
        parsed = parse_statement(sys.argv[1], payload, sys.argv[2])
        frame = parsed.transactions.copy()
        frame["date"] = frame.date.dt.strftime("%Y-%m-%d")
        response = {
            "records": json.loads(frame.to_json(orient="records")),
            "report": parsed.report,
            "declared_end": parsed.declared_end,
        }
    except IngestionError as exc:
        response = {"error": {"code": exc.code, "message": str(exc)}}
    except Exception:
        response = {
            "error": {
                "code": "invalid_statement",
                "message": "This statement could not be parsed safely. Export a supported CSV/XLSX or text PDF.",
            }
        }
    sys.stdout.write(json.dumps(response, allow_nan=False))


if __name__ == "__main__":
    main()
