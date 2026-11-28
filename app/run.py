"""One-command launcher for MineAudit (mineaudit.ai) backend + frontend."""
from __future__ import annotations

import os
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def main() -> None:
    env = os.environ.copy()
    env.setdefault("DEMO_MODE", "true")
    env["PYTHONPATH"] = str(ROOT / "backend")

    print("=" * 64)
    print("  mineaudit.ai — Team NEXORA | Odisha Satellite Audit Platform")
    print("  DEMO_MODE =", env["DEMO_MODE"])
    print("=" * 64)

    backend_cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        "0.0.0.0",
        "--port",
        "8000",
    ]
    npm_bin = "npm.cmd" if os.name == "nt" else "npm"
    frontend_cmd = [npm_bin, "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

    procs: list[subprocess.Popen] = []
    try:
        p_back = subprocess.Popen(backend_cmd, cwd=str(ROOT / "backend"), env=env)
        procs.append(p_back)
        time.sleep(1.5)
        p_front = subprocess.Popen(frontend_cmd, cwd=str(ROOT / "frontend"), env=env)
        procs.append(p_front)

        print("\n  Localhost URLs:")
        print("  -> Web App (mineaudit.ai): http://localhost:5173")
        print("  -> API Docs (Swagger):     http://localhost:8000/docs\n")

        while all(p.poll() is None for p in procs):
            time.sleep(1.0)
    except KeyboardInterrupt:
        print("\nShutting down MineAudit...")
    finally:
        for p in procs:
            if p.poll() is None:
                p.terminate()
        for p in procs:
            try:
                p.wait(timeout=5)
            except subprocess.TimeoutExpired:
                p.kill()


if __name__ == "__main__":
    main()

