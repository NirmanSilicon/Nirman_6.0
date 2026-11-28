"""CLI runner that posts Ashvin demo scenarios to the event bus."""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from uuid import uuid4

try:
    from tools.scenarios import DEFAULT_HOST, SCENARIOS
except ImportError:
    from scenarios import DEFAULT_HOST, SCENARIOS

IST = timezone(timedelta(hours=5, minutes=30))


def post_event(host: str, body: dict) -> dict:
    """Post one event envelope to the server and return the stored response."""
    req = urllib.request.Request(
        f"http://{host}/event",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=5) as resp:
        return json.loads(resp.read())


def find_scenario(key: str) -> dict | None:
    """Look up a scenario by slug key (or numeric id string)."""
    for scenario in SCENARIOS:
        if scenario["key"] == key or str(scenario["id"]) == key:
            return scenario
    return None


def find_mode(scenario: dict, mode_key: str | None) -> tuple[dict, list[str]]:
    """Return the selected mode and a list of other available mode keys."""
    modes = scenario["modes"]
    if mode_key is None:
        return modes[0], [m["key"] for m in modes[1:]]
    for mode in modes:
        if mode["key"] == mode_key:
            return mode, []
    available = ", ".join(m["key"] for m in modes)
    raise ValueError(f"Unknown mode '{mode_key}' for scenario '{scenario['key']}'. Available: {available}")


def print_table(speed: float) -> None:
    """Print every scenario and mode with step counts and total duration."""
    header = f"{'ID':<3} {'SCENARIO':<14} {'MODE':<15} {'STEPS':>5}  {'DURATION':>8}  LABEL"
    print(header)
    print("-" * len(header))
    for scenario in SCENARIOS:
        for mode in scenario["modes"]:
            total_s = sum(step[2] for step in mode["steps"]) * speed
            print(
                f"{scenario['id']:<3} {scenario['key']:<14} {mode['key']:<15} "
                f"{len(mode['steps']):>5}  {total_s:>7.1f}s  {mode['label']}"
            )


def run_mode(
    host: str,
    scenario: dict,
    mode: dict,
    speed: float,
    dry_run: bool,
) -> None:
    """Execute all steps of a single scenario/mode with one shared event_id."""
    event_id = f"e-{uuid4().hex[:8]}"
    print(f"scenario={scenario['key']} mode={mode['key']} event_id={event_id}", flush=True)
    started = time.monotonic()

    for event_type, data, delay_s in mode["steps"]:
        wait_s = delay_s * speed
        if dry_run:
            print(
                f"  delay {wait_s:>5.2f}s  {event_type:<24}  {json.dumps(data)}",
                flush=True,
            )
            continue

        if wait_s > 0:
            time.sleep(wait_s)

        body = {
            "type": event_type,
            "event_id": event_id,
            "source": "sim",
            "device_id": "ASH-07",
            "t_client": datetime.now(IST).isoformat(timespec="milliseconds"),
            "data": data,
        }
        try:
            stored = post_event(host, body)
        except (urllib.error.URLError, urllib.error.HTTPError, OSError, json.JSONDecodeError) as exc:
            print(f"ERROR posting {event_type} to http://{host}/event: {exc}", file=sys.stderr, flush=True)
            sys.exit(1)

        elapsed = time.monotonic() - started
        print(f"  seq {stored['seq']:>3}  {stored['type']:<24}  +{elapsed:5.2f}s", flush=True)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run Ashvin demo scenarios against the event bus.")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--scenario", help="Scenario key (e.g. detection, confirmation, dispatch, citizen, identity)")
    parser.add_argument("--mode", help="Mode key within the scenario")
    parser.add_argument("--speed", type=float, default=1.0, help="Multiplier on every step delay (default: 1.0)")
    parser.add_argument("--loop", action="store_true", help="Cycle every scenario's first mode forever")
    parser.add_argument("--pause", type=float, default=8.0, help="Seconds between scenarios in loop mode (default: 8)")
    parser.add_argument("--list", action="store_true", help="Print scenarios and modes table and exit")
    parser.add_argument("--dry-run", action="store_true", help="Print planned steps and delays without posting")
    args = parser.parse_args(argv)

    if args.list:
        print_table(args.speed)
        return 0

    if args.loop:
        cycle = 1
        try:
            while True:
                print(f"\n=== LOOP CYCLE {cycle} ===", flush=True)
                for scenario in SCENARIOS:
                    mode = scenario["modes"][0]
                    run_mode(args.host, scenario, mode, args.speed, args.dry_run)
                    if args.dry_run:
                        print(f"  [pause {args.pause:.1f}s]", flush=True)
                    elif args.pause > 0:
                        time.sleep(args.pause)
                cycle += 1
        except KeyboardInterrupt:
            print("\nStopped loop.", flush=True)
            return 0

    if not args.scenario:
        parser.error("--scenario is required unless --list or --loop is set")

    scenario = find_scenario(args.scenario)
    if scenario is None:
        valid = ", ".join(s["key"] for s in SCENARIOS)
        print(f"ERROR: Unknown scenario '{args.scenario}'. Valid scenarios: {valid}", file=sys.stderr)
        return 1

    try:
        mode, others = find_mode(scenario, args.mode)
    except ValueError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    if others:
        print(f"Note: --mode omitted, using '{mode['key']}'. Other modes: {', '.join(others)}", flush=True)

    run_mode(args.host, scenario, mode, args.speed, args.dry_run)
    return 0


if __name__ == "__main__":
    sys.exit(main())
