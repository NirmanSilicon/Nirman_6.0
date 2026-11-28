"""
ParkSMART - Background Worker Scheduler Engine (File 143 / M2 Ownership)

Responsibility:
Periodic scheduling and dispatch engine for ParkSMART background workers:
- Aggregation worker: periodic aggregation of raw MQTT observations into hourly buckets.
- Forecasting worker: periodic generation and caching of zone occupancy forecasts.
- Manages job registrations, intervals, execution tracking, and error resilience.
- Provides manual single-run hooks (run_once) for unit testing and deterministic CI execution.
- Graceful shutdown handling for container termination (SIGINT / SIGTERM).
"""

from __future__ import annotations

import argparse
import asyncio
import inspect
import logging
import signal
import sys
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

# Ensure backend and root directory in sys.path
root_dir = Path(__file__).resolve().parent.parent.parent.parent
backend_dir = root_dir / "backend"
for p in (str(root_dir), str(backend_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

from app.workers.aggregation_job import run_aggregation_job
from app.workers.forecast_job import run_forecast_job_for_zones

logger = logging.getLogger("parksmart.workers.scheduler")


@dataclass
class ScheduledJob:
    """Descriptor and state tracking for a registered background worker job."""

    name: str
    func: Callable[[], Any]
    interval_s: float
    last_run_at: datetime | None = None
    run_count: int = 0
    is_async: bool = False
    enabled: bool = True
    last_error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "interval_s": self.interval_s,
            "last_run_at": self.last_run_at.strftime("%Y-%m-%dT%H:%M:%SZ") if self.last_run_at else None,
            "run_count": self.run_count,
            "enabled": self.enabled,
            "last_error": self.last_error,
        }


class WorkerScheduler:
    """
    Manages background scheduled jobs and periodic loop execution.
    """

    def __init__(self, register_defaults: bool = True):
        self._jobs: dict[str, ScheduledJob] = {}
        self._stop_event = asyncio.Event()

        if register_defaults:
            self._register_default_jobs()

    def _register_default_jobs(self) -> None:
        """Registers the canonical ParkSMART background worker jobs."""
        # 1. Aggregation job: default interval 60s
        self.register_job(
            name="aggregation_job",
            func=run_aggregation_job,
            interval_s=60.0,
            enabled=True,
        )

        # 2. Forecast job: default interval 3600s (hourly)
        self.register_job(
            name="forecast_job",
            func=run_forecast_job_for_zones,
            interval_s=3600.0,
            enabled=True,
        )

    def register_job(
        self,
        name: str,
        func: Callable[[], Any],
        interval_s: float,
        enabled: bool = True,
    ) -> None:
        """Registers or replaces a scheduled job."""
        is_async = inspect.iscoroutinefunction(func)
        self._jobs[name] = ScheduledJob(
            name=name,
            func=func,
            interval_s=max(1.0, float(interval_s)),
            is_async=is_async,
            enabled=enabled,
        )
        logger.info("Registered scheduled job '%s' (interval=%.1fs, async=%s)", name, interval_s, is_async)

    def get_job(self, name: str) -> ScheduledJob | None:
        """Returns job metadata by name."""
        return self._jobs.get(name)

    def list_jobs(self) -> list[dict[str, Any]]:
        """Lists all registered jobs and their status."""
        return [job.to_dict() for job in self._jobs.values()]

    async def execute_job(self, name: str, **kwargs: Any) -> Any:
        """Executes a single job by name safely, catching exceptions."""
        job = self._jobs.get(name)
        if not job:
            raise KeyError(f"Job '{name}' is not registered")

        logger.debug("Executing scheduled job '%s'...", name)
        now = datetime.now(UTC)
        job.last_run_at = now
        job.run_count += 1

        try:
            if job.is_async:
                res = await job.func(**kwargs)
            else:
                res = job.func(**kwargs)
            job.last_error = None
            return res
        except Exception as e:
            job.last_error = str(e)
            logger.exception("Error executing job '%s'", name)
            return None

    async def run_due_jobs(self, now: datetime | None = None) -> list[str]:
        """Checks registered jobs and executes those whose interval has elapsed."""
        curr_now = now or datetime.now(UTC)
        executed: list[str] = []

        for name, job in list(self._jobs.items()):
            if not job.enabled:
                continue

            is_due = False
            if job.last_run_at is None:
                is_due = True
            else:
                elapsed = (curr_now - job.last_run_at).total_seconds()
                if elapsed >= job.interval_s:
                    is_due = True

            if is_due:
                await self.execute_job(name)
                executed.append(name)

        return executed

    async def run_once(self) -> dict[str, Any]:
        """Executes all enabled jobs once immediately (useful for testing and deterministic runs)."""
        results: dict[str, Any] = {}
        for name, job in list(self._jobs.items()):
            if job.enabled:
                results[name] = await self.execute_job(name)
        return results

    def stop(self) -> None:
        """Signals the scheduler loop to terminate gracefully."""
        self._stop_event.set()
        logger.info("Scheduler stop signal received.")

    async def start(self, poll_interval_s: float = 1.0) -> None:
        """Runs the main scheduler dispatch loop until stopped."""
        logger.info("Starting ParkSMART Worker Scheduler (%d registered jobs)...", len(self._jobs))
        self._stop_event.clear()

        while not self._stop_event.is_set():
            try:
                await self.run_due_jobs()
            except Exception:
                logger.exception("Unhandled scheduler loop error")

            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=poll_interval_s)
            except TimeoutError:
                pass

        logger.info("ParkSMART Worker Scheduler terminated cleanly.")


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    )
    parser = argparse.ArgumentParser(description="ParkSMART background worker scheduler daemon")
    parser.add_argument("--once", action="store_true", help="Run all enabled jobs once and exit")
    parser.add_argument("--poll", type=float, default=1.0, help="Loop polling interval in seconds (default: 1.0)")
    args = parser.parse_args()

    scheduler = WorkerScheduler(register_defaults=True)

    if args.once:
        logger.info("Running all scheduled jobs once...")
        asyncio.run(scheduler.run_once())
        logger.info("Single run completed.")
        return

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    def _handle_exit() -> None:
        logger.info("Termination signal caught. Stopping scheduler...")
        scheduler.stop()

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, _handle_exit)
        except NotImplementedError:
            # Windows signal handling fallback
            pass

    try:
        loop.run_until_complete(scheduler.start(poll_interval_s=args.poll))
    finally:
        loop.close()


if __name__ == "__main__":
    main()
