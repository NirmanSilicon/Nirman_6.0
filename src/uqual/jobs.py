"""SQLite-backed encrypted processing queue with leases and atomic completion."""

from __future__ import annotations

import hashlib
import json
import threading
import time
import uuid

from .accounts import AccountError
from .ingestion import IngestionError, kind
from .processing import process_statement

ACTIVE = ("queued", "running")


class Jobs:
    def __init__(self, accounts):
        self.accounts = accounts
        with accounts.db() as db:
            db.executescript("""
              CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL, request_hash TEXT NOT NULL,
                metadata BLOB NOT NULL, source BLOB, source_size INTEGER NOT NULL, worker_token TEXT,
                lease_until INTEGER NOT NULL DEFAULT 0, attempts INTEGER NOT NULL DEFAULT 0,
                statement_id TEXT, error_code TEXT, error_message TEXT);
              CREATE INDEX IF NOT EXISTS job_owner ON jobs(owner,created);
              CREATE INDEX IF NOT EXISTS job_claim ON jobs(status,created);
              CREATE TABLE IF NOT EXISTS workers(id TEXT PRIMARY KEY, heartbeat INTEGER NOT NULL);
            """)

    def submit(self, owner, filename, payload, date_format, statement_end):
        extension = kind(filename, payload)
        options = {
            "filename": filename[:255],
            "date_format": date_format,
            "statement_end": str(statement_end) if statement_end else None,
            "format": extension,
        }
        fingerprint = hashlib.sha256(
            payload
            + json.dumps({k: v for k, v in options.items() if k != "filename"}, sort_keys=True).encode()
        ).hexdigest()
        now, identifier = int(time.time()), uuid.uuid4().hex
        with self.accounts.db() as db:
            db.execute("BEGIN IMMEDIATE")
            prior = db.execute(
                "SELECT * FROM jobs WHERE owner=? AND request_hash=? AND status IN ('queued','running','completed') ORDER BY created DESC LIMIT 1",
                (owner, fingerprint),
            ).fetchone()
            if prior:
                return self.decode(prior)
            active = db.execute(
                "SELECT COUNT(*) FROM jobs WHERE owner=? AND status IN ('queued','running')", (owner,)
            ).fetchone()[0]
            global_count = db.execute(
                "SELECT COUNT(*) FROM jobs WHERE status IN ('queued','running')"
            ).fetchone()[0]
            used = db.execute(
                "SELECT COALESCE(SUM(LENGTH(document)+LENGTH(metadata)+COALESCE(LENGTH(normalized),0)),0) FROM statements WHERE owner=?",
                (owner,),
            ).fetchone()[0]
            pending = db.execute(
                "SELECT COALESCE(SUM(source_size),0) FROM jobs WHERE owner=? AND status IN ('queued','running')",
                (owner,),
            ).fetchone()[0]
            count = db.execute("SELECT COUNT(*) FROM statements WHERE owner=?", (owner,)).fetchone()[0]
            if count + active >= 100:
                raise AccountError(413, "Your private vault contains too many statements")
            if active >= 3 or global_count >= 100:
                raise AccountError(429, "Processing queue is full; wait for existing jobs to finish")
            if used + pending + len(payload) > 100 * 1024 * 1024:
                raise AccountError(413, "Your private vault storage limit is reached")
            db.execute(
                "INSERT INTO jobs(id,owner,status,created,updated,request_hash,metadata,source,source_size) VALUES(?,?,'queued',?,?,?,?,?,?)",
                (
                    identifier,
                    owner,
                    now,
                    now,
                    fingerprint,
                    self.accounts.seal(json.dumps(options).encode(), owner + ":" + identifier + ":job"),
                    self.accounts.seal(payload, owner + ":" + identifier + ":source"),
                    len(payload),
                ),
            )
            self.accounts.audit(db, owner, identifier, "queued_analysis_and_storage", now)
            row = db.execute("SELECT * FROM jobs WHERE id=?", (identifier,)).fetchone()
            return self.decode(row)

    def decode(self, row):
        options = json.loads(self.accounts.unseal(row["metadata"], row["owner"] + ":" + row["id"] + ":job"))
        return {
            "id": row["id"],
            "status": row["status"],
            "created_at": row["created"],
            "updated_at": row["updated"],
            "filename": options["filename"],
            "format": options["format"],
            "statement_id": row["statement_id"],
            "error": {"code": row["error_code"], "message": row["error_message"]}
            if row["error_code"]
            else None,
        }

    def get(self, owner, identifier):
        with self.accounts.db() as db:
            row = db.execute("SELECT * FROM jobs WHERE owner=? AND id=?", (owner, identifier)).fetchone()
        if row is None:
            raise AccountError(404, "Processing job not found")
        return self.decode(row)

    def history(self, owner):
        with self.accounts.db() as db:
            rows = db.execute(
                "SELECT * FROM jobs WHERE owner=? ORDER BY created DESC LIMIT 100", (owner,)
            ).fetchall()
        return [self.decode(row) for row in rows]

    def cancel(self, owner, identifier):
        with self.accounts.db() as db:
            result = db.execute(
                "UPDATE jobs SET status='cancelled',source=NULL,source_size=0,updated=?,lease_until=0 WHERE owner=? AND id=? AND status IN ('queued','running')",
                (int(time.time()), owner, identifier),
            )
            if not result.rowcount:
                raise AccountError(409, "Job cannot be cancelled or was not found")
            self.accounts.audit(db, owner, identifier, "processing_cancelled", int(time.time()))
        return self.get(owner, identifier)

    def heartbeat(self, identifier):
        with self.accounts.db() as db:
            db.execute(
                "INSERT INTO workers VALUES(?,?) ON CONFLICT(id) DO UPDATE SET heartbeat=excluded.heartbeat",
                (identifier, int(time.time())),
            )
            db.execute("DELETE FROM workers WHERE heartbeat<?", (int(time.time()) - 3600,))

    def ready(self):
        with self.accounts.db() as db:
            return bool(
                db.execute(
                    "SELECT 1 FROM workers WHERE heartbeat>? LIMIT 1", (int(time.time()) - 120,)
                ).fetchone()
            )

    def claim(self):
        now, token = int(time.time()), uuid.uuid4().hex
        with self.accounts.db() as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute(
                "UPDATE jobs SET status='queued',worker_token=NULL,lease_until=0 WHERE status='running' AND lease_until<? AND attempts<3",
                (now,),
            )
            db.execute(
                "UPDATE jobs SET status='failed',source=NULL,source_size=0,error_code='worker_interrupted',error_message='Processing was interrupted repeatedly; re-upload to retry',updated=? WHERE status='running' AND lease_until<? AND attempts>=3",
                (now, now),
            )
            row = db.execute(
                "SELECT * FROM jobs WHERE status='queued' ORDER BY created,id LIMIT 1"
            ).fetchone()
            if row is None:
                return None
            db.execute(
                "UPDATE jobs SET status='running',updated=?,worker_token=?,lease_until=?,attempts=attempts+1 WHERE id=?",
                (now, token, now + 120, row["id"]),
            )
            try:
                options = json.loads(
                    self.accounts.unseal(row["metadata"], row["owner"] + ":" + row["id"] + ":job")
                )
                source = self.accounts.unseal(row["source"], row["owner"] + ":" + row["id"] + ":source")
            except Exception:
                db.execute(
                    "UPDATE jobs SET status='failed',source=NULL,source_size=0,error_code='job_data_invalid',error_message='Encrypted job data could not be read; re-upload the statement',updated=? WHERE id=?",
                    (now, row["id"]),
                )
                return None
            return {
                "id": row["id"],
                "owner": row["owner"],
                "worker_token": token,
                "options": options,
                "source": source,
            }

    def fail(self, job, code, message):
        with self.accounts.db() as db:
            db.execute(
                "UPDATE jobs SET status='failed',source=NULL,source_size=0,updated=?,error_code=?,error_message=?,lease_until=0 WHERE id=? AND status='running' AND worker_token=?",
                (int(time.time()), code, message, job["id"], job["worker_token"]),
            )


class Runner:
    def __init__(self, queue, bundle):
        self.queue, self.bundle = queue, bundle
        self.identifier = uuid.uuid4().hex
        self.stopped = threading.Event()
        self.thread = threading.Thread(target=self.run, name="uqual-processing-worker", daemon=True)

    def start(self):
        self.queue.heartbeat(self.identifier)
        self.thread.start()

    def run_once(self):
        self.queue.heartbeat(self.identifier)
        job = self.queue.claim()
        if job is None:
            return False
        try:
            options = job["options"]
            analysis, normalized = process_statement(
                self.bundle,
                options["filename"],
                job["source"],
                options["date_format"],
                options["statement_end"],
            )
            self.queue.accounts.save(
                job["owner"], options["filename"], job["source"], analysis, normalized, job
            )
        except IngestionError as exc:
            self.queue.fail(job, exc.code, str(exc))
        except AccountError as exc:
            self.queue.fail(job, "account_or_job_changed", exc.message)
        except Exception:
            self.queue.fail(
                job,
                "processing_failed",
                "Processing could not finish safely. Retry or export another supported format.",
            )
        return True

    def run(self):
        while not self.stopped.is_set():
            try:
                worked = self.run_once()
            except Exception:
                worked = False
            if not worked:
                self.stopped.wait(1)

    def stop(self):
        self.stopped.set()
        self.thread.join(timeout=50)
        with self.queue.accounts.db() as db:
            db.execute("DELETE FROM workers WHERE id=?", (self.identifier,))
