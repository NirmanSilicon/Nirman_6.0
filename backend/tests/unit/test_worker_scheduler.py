"""
Unit Tests for ParkSMART Background Worker Scheduler (File 143 / M2 Ownership)

Verifies:
1. Default job registration: aggregation_job and forecast_job.
2. Custom sync and async job registration and interval tracking.
3. run_once: immediate execution of all registered enabled jobs.
4. run_due_jobs: only triggers jobs whose elapsed time >= interval_s.
5. Error resilience: single job exception does not crash scheduler or block other jobs.
6. Graceful shutdown: stop() stops the main dispatch loop cleanly.
"""

from __future__ import annotations

import asyncio
import sys
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path

# Ensure backend and root in sys.path
root_dir = Path(__file__).resolve().parent.parent.parent.parent
backend_dir = root_dir / "backend"
for p in (str(root_dir), str(backend_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

from app.workers.scheduler import WorkerScheduler


class TestWorkerScheduler(unittest.TestCase):
    """Test suite for background worker job scheduling engine."""

    def test_default_jobs_registration(self) -> None:
        """WorkerScheduler initializes with canonical aggregation_job and forecast_job."""
        scheduler = WorkerScheduler(register_defaults=True)

        job_agg = scheduler.get_job("aggregation_job")
        self.assertIsNotNone(job_agg)
        self.assertEqual(job_agg.interval_s, 60.0)
        self.assertTrue(job_agg.enabled)

        job_fc = scheduler.get_job("forecast_job")
        self.assertIsNotNone(job_fc)
        self.assertEqual(job_fc.interval_s, 3600.0)
        self.assertTrue(job_fc.enabled)

        jobs_list = scheduler.list_jobs()
        self.assertGreaterEqual(len(jobs_list), 2)
        names = [j["name"] for j in jobs_list]
        self.assertIn("aggregation_job", names)
        self.assertIn("forecast_job", names)

    def test_custom_job_registration(self) -> None:
        """Scheduler registers sync and async custom jobs with configured intervals."""
        scheduler = WorkerScheduler(register_defaults=False)

        def sync_task() -> str:
            return "sync_done"

        async def async_task() -> str:
            await asyncio.sleep(0.01)
            return "async_done"

        scheduler.register_job("sync_job", sync_task, interval_s=10.0)
        scheduler.register_job("async_job", async_task, interval_s=20.0)

        j_sync = scheduler.get_job("sync_job")
        self.assertIsNotNone(j_sync)
        self.assertFalse(j_sync.is_async)
        self.assertEqual(j_sync.interval_s, 10.0)

        j_async = scheduler.get_job("async_job")
        self.assertIsNotNone(j_async)
        self.assertTrue(j_async.is_async)
        self.assertEqual(j_async.interval_s, 20.0)

    def test_run_once_execution(self) -> None:
        """run_once immediately executes all enabled jobs and returns their results."""
        scheduler = WorkerScheduler(register_defaults=False)

        counts = {"sync": 0, "async": 0}

        def sync_fn() -> int:
            counts["sync"] += 1
            return counts["sync"]

        async def async_fn() -> int:
            counts["async"] += 1
            return counts["async"]

        scheduler.register_job("job_s", sync_fn, interval_s=100.0)
        scheduler.register_job("job_a", async_fn, interval_s=200.0)

        results = asyncio.run(scheduler.run_once())
        self.assertEqual(results["job_s"], 1)
        self.assertEqual(results["job_a"], 1)

        # Inspect updated job tracking
        j_s = scheduler.get_job("job_s")
        self.assertEqual(j_s.run_count, 1)
        self.assertIsNotNone(j_s.last_run_at)
        self.assertIsNone(j_s.last_error)

    def test_run_due_jobs_interval_filtering(self) -> None:
        """run_due_jobs only executes jobs whose interval has elapsed."""
        scheduler = WorkerScheduler(register_defaults=False)

        executed_jobs: list[str] = []

        def job1() -> None:
            executed_jobs.append("job1")

        def job2() -> None:
            executed_jobs.append("job2")

        scheduler.register_job("job1", job1, interval_s=10.0)
        scheduler.register_job("job2", job2, interval_s=60.0)

        now = datetime.now(UTC)

        # 1. First run: both are unrun, so both are due
        due1 = asyncio.run(scheduler.run_due_jobs(now=now))
        self.assertIn("job1", due1)
        self.assertIn("job2", due1)

        # 2. 15 seconds later: only job1 (interval=10s) is due; job2 (interval=60s) is NOT due
        later_15s = now + timedelta(seconds=15)
        due2 = asyncio.run(scheduler.run_due_jobs(now=later_15s))
        self.assertIn("job1", due2)
        self.assertNotIn("job2", due2)

        # 3. 65 seconds later: both are due
        later_65s = now + timedelta(seconds=65)
        due3 = asyncio.run(scheduler.run_due_jobs(now=later_65s))
        self.assertIn("job1", due3)
        self.assertIn("job2", due3)

    def test_error_resilience(self) -> None:
        """A crashing job does not bring down the scheduler and logs error cleanly."""
        scheduler = WorkerScheduler(register_defaults=False)

        def failing_job() -> None:
            raise RuntimeError("Database connection timed out")

        def passing_job() -> str:
            return "ok"

        scheduler.register_job("failing", failing_job, interval_s=10.0)
        scheduler.register_job("passing", passing_job, interval_s=10.0)

        results = asyncio.run(scheduler.run_once())
        self.assertIsNone(results["failing"])
        self.assertEqual(results["passing"], "ok")

        job_fail = scheduler.get_job("failing")
        self.assertIn("Database connection timed out", str(job_fail.last_error))

    def test_graceful_stop(self) -> None:
        """stop() terminates the background scheduler loop cleanly."""
        scheduler = WorkerScheduler(register_defaults=False)

        def noop() -> None:
            pass

        scheduler.register_job("noop", noop, interval_s=1.0)

        async def run_and_stop() -> None:
            task = asyncio.create_task(scheduler.start(poll_interval_s=0.05))
            await asyncio.sleep(0.1)
            scheduler.stop()
            await task

        asyncio.run(run_and_stop())
        self.assertTrue(scheduler._stop_event.is_set())


if __name__ == "__main__":
    unittest.main()
