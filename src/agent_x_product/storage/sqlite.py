import json
import sqlite3
from contextlib import closing, contextmanager
from importlib.resources import files
from pathlib import Path


class Store:
    """One aggregate per run; BEGIN IMMEDIATE serializes scaffold state transitions."""

    def __init__(self, path: str):
        self.path = path
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as connection:
            connection.execute("PRAGMA journal_mode=WAL")
            migration = files("agent_x_product").joinpath(
                "storage/migrations/001_initial.sql"
            ).read_text()
            connection.executescript(migration)

    @contextmanager
    def connect(self):
        # sqlite's own context manager commits/rolls back but does not close the connection.
        with closing(sqlite3.connect(self.path, timeout=10)) as connection:
            with connection:
                yield connection

    @contextmanager
    def transaction(self):
        with self.connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            yield connection

    def get(self, connection, run_id: str) -> dict | None:
        row = connection.execute("SELECT body FROM runs WHERE id = ?", (run_id,)).fetchone()
        return json.loads(row[0]) if row else None

    def save(self, connection, run: dict):
        connection.execute(
            "INSERT INTO runs(id, body) VALUES (?, ?) "
            "ON CONFLICT(id) DO UPDATE SET body = excluded.body",
            (run["run_id"], json.dumps(run, sort_keys=True)),
        )
