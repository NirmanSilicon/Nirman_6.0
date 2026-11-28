"""Run a durable processing worker separately from the HTTP service."""

import argparse
from pathlib import Path
import signal
import threading

from .accounts import Accounts
from .jobs import Jobs, Runner
from .scoring import load_bundle


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--accounts-dir", type=Path, required=True)
    parser.add_argument("--model", type=Path, required=True)
    args = parser.parse_args()
    bundle = load_bundle(args.model)
    if bundle.get("dataset") != "synthetic_india":
        raise ValueError("The personal demo worker requires the explicitly synthetic model")
    runner = Runner(Jobs(Accounts(args.accounts_dir)), bundle)
    stop = threading.Event()
    signal.signal(signal.SIGTERM, lambda *_: stop.set())
    signal.signal(signal.SIGINT, lambda *_: stop.set())
    runner.start()
    try:
        while not stop.wait(1):
            pass
    finally:
        runner.stop()


if __name__ == "__main__":
    main()
