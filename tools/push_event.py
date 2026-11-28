"""Thin compatibility wrapper around tools/run_scenario.py."""

from __future__ import annotations

import argparse
import sys

try:
    from tools.run_scenario import main as run_scenario_main
    from tools.scenarios import DEFAULT_HOST
except ImportError:
    from run_scenario import main as run_scenario_main
    from scenarios import DEFAULT_HOST

KIND_MAP = {
    "crash": ("dispatch", "high_risk"),
    "pothole": ("detection", "pothole"),
    "citizen": ("citizen", "populated"),
}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--kind", default="crash", choices=sorted(KIND_MAP))
    parser.add_argument("--gap", type=float, default=None, help="Deprecated; timings live in scenarios.py")
    args = parser.parse_args(argv)

    scenario, mode = KIND_MAP[args.kind]
    return run_scenario_main(["--host", args.host, "--scenario", scenario, "--mode", mode])


if __name__ == "__main__":
    sys.exit(main())
