import time

import pytest

from uqual.accounts import Accounts, AccountError
from uqual.ingestion import IngestionError
from uqual.jobs import Jobs, Runner

PASSWORD = "test-passphrase-long-enough"
SOURCE = b"Date,Description,Debit,Credit,Balance\n2026-01-01,private,0,1000,1000\n"


@pytest.fixture
def system(tmp_path):
    accounts = Accounts(tmp_path / "vault")
    queue = Jobs(accounts)
    user = accounts.register("Test", "jobs@example.test", PASSWORD, "one")["user"]
    return accounts, queue, user["id"]


def test_queue_survives_restart_and_completion_is_idempotent(system, monkeypatch):
    accounts, queue, owner = system
    first = queue.submit(owner, "s.csv", SOURCE, "%Y-%m-%d", "2026-01-31")
    assert queue.submit(owner, "s.csv", SOURCE, "%Y-%m-%d", "2026-01-31")["id"] == first["id"]
    assert SOURCE not in accounts.path.read_bytes()
    reopened = Jobs(Accounts(accounts.path.parent))

    def process(*args):
        return {"statement_period": {"end": "2026-01-31"}, "synthetic_risk_index": 45.49}, b"normalized"

    monkeypatch.setattr("uqual.jobs.process_statement", process)
    assert Runner(reopened, {}).run_once()
    done = reopened.get(owner, first["id"])
    assert done["status"] == "completed"
    assert accounts.document(owner, done["statement_id"]) == SOURCE
    assert accounts.normalized(owner, done["statement_id"]) == b"normalized"
    with accounts.db() as db:
        assert db.execute("SELECT source FROM jobs WHERE id=?", (first["id"],)).fetchone()[0] is None
    assert len(accounts.history(owner)) == 1


def test_cancelled_and_erased_jobs_cannot_save_results(system):
    accounts, queue, owner = system
    job = queue.submit(owner, "s.csv", SOURCE, "%Y-%m-%d", "2026-01-31")
    claimed = queue.claim()
    queue.cancel(owner, job["id"])
    with pytest.raises(AccountError, match="cancelled"):
        accounts.save(owner, "s.csv", SOURCE, {"statement_period": {"end": "2026-01-31"}}, job=claimed)
    assert not accounts.history(owner)
    job = queue.submit(owner, "s.csv", SOURCE, "%Y-%m-%d", "2026-01-31")
    claimed = queue.claim()
    accounts.delete_account(owner, PASSWORD)
    with pytest.raises(AccountError):
        accounts.save(owner, "s.csv", SOURCE, {"statement_period": {"end": "2026-01-31"}}, job=claimed)
    with accounts.db() as db:
        assert db.execute("SELECT COUNT(*) FROM jobs").fetchone()[0] == 0


def test_crashed_worker_lease_reclaimed_and_old_worker_cannot_commit(system):
    accounts, queue, owner = system
    queue.submit(owner, "s.csv", SOURCE, "%Y-%m-%d", "2026-01-31")
    old = queue.claim()
    with accounts.db() as db:
        db.execute("UPDATE jobs SET lease_until=?", (int(time.time()) - 1,))
    replacement = queue.claim()
    assert replacement["worker_token"] != old["worker_token"]
    with pytest.raises(AccountError):
        accounts.save(owner, "s.csv", SOURCE, {"statement_period": {"end": "2026-01-31"}}, job=old)
    accounts.save(owner, "s.csv", SOURCE, {"statement_period": {"end": "2026-01-31"}}, job=replacement)


def test_failure_clears_encrypted_source_and_is_owner_scoped(system, monkeypatch):
    accounts, queue, owner = system
    job = queue.submit(owner, "s.csv", SOURCE, "%Y-%m-%d", "2026-01-31")

    def fail(*args):
        raise IngestionError("needs_ocr", "Upload a text-based statement")

    monkeypatch.setattr("uqual.jobs.process_statement", fail)
    assert Runner(queue, {}).run_once()
    result = queue.get(owner, job["id"])
    assert result["status"] == "failed" and result["error"]["code"] == "needs_ocr"
    with pytest.raises(AccountError):
        queue.get("another-user", job["id"])
    with accounts.db() as db:
        assert db.execute("SELECT source FROM jobs").fetchone()[0] is None


def test_deleting_statement_allows_explicit_reupload(system):
    accounts, queue, owner = system
    job = queue.submit(owner, "s.csv", SOURCE, "%Y-%m-%d", "2026-01-31")
    claimed = queue.claim()
    record = accounts.save(owner, "s.csv", SOURCE, {"statement_period": {"end": "2026-01-31"}}, job=claimed)
    accounts.delete_statement(owner, record["id"])
    assert queue.get(owner, job["id"])["status"] == "cancelled"
    assert queue.submit(owner, "s.csv", SOURCE, "%Y-%m-%d", "2026-01-31")["id"] != job["id"]
