from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.cmapss import DatasetError, preprocess_fd001, validate_fd001  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate and preprocess NASA C-MAPSS FD001.")
    parser.add_argument("--data-dir", type=Path, default=ROOT / "data" / "raw" / "FD001")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "data" / "processed" / "FD001")
    parser.add_argument("--window-size", type=int, default=30)
    parser.add_argument("--rul-cap", type=int, default=125)
    parser.add_argument("--validation-fraction", type=float, default=0.2)
    parser.add_argument("--random-state", type=int, default=42)
    parser.add_argument("--variance-threshold", type=float, default=1e-8)
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()

    try:
        if args.validate_only:
            result = validate_fd001(args.data_dir).report
        else:
            result = preprocess_fd001(
                args.data_dir,
                args.output_dir,
                window_size=args.window_size,
                rul_cap=args.rul_cap,
                validation_fraction=args.validation_fraction,
                random_state=args.random_state,
                variance_threshold=args.variance_threshold,
            )
        print(json.dumps(result, indent=2))
        return 0
    except DatasetError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
