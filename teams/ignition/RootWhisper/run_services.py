"""RootWhisper Unified Service Supervisor.

Runs the FastAPI backend (port 8000) and the React Vite frontend (port 3000)
simultaneously as managed background processes.
"""

import os
import sys
import time
import subprocess
import signal
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PYTHON_EXE = sys.executable


def main():
    print("=" * 65)
    print("🌿 STARTING ROOTWHISPER ENTERPRISE PLATFORM")
    print("=" * 65)

    env = os.environ.copy()
    env["PYTHONPATH"] = str(BASE_DIR)

    # 1. Start FastAPI Backend on Port 8000
    backend_cmd = [
        PYTHON_EXE, "-m", "uvicorn", "backend.app.main:app",
        "--host", "0.0.0.0",
        "--port", "8000",
        "--log-level", "info"
    ]
    print("1. Starting FastAPI Backend on http://0.0.0.0:8000 ...")
    backend_proc = subprocess.Popen(backend_cmd, cwd=str(BASE_DIR), env=env)
    time.sleep(2)

    # 2. Start React Vite Frontend on Port 3000
    frontend_dir = BASE_DIR / "frontend"
    frontend_proc = None
    if frontend_dir.exists():
        npm_cmd = ["cmd", "/c", "npm", "run", "dev"]
        print("2. Starting React Vite Frontend on http://0.0.0.0:3000 ...")
        frontend_proc = subprocess.Popen(npm_cmd, cwd=str(frontend_dir), env=env)
        time.sleep(2)

    print("\n" + "=" * 65)
    print("✅ RootWhisper Services Running:")
    print("   • React Enterprise Frontend: http://localhost:3000")
    print("   • FastAPI Backend API:       http://localhost:8000 (Interactive Docs: /docs)")
    print("=" * 65)
    print("Press Ctrl+C to terminate services.\n")

    def handle_exit(signum, frame):
        print("\nStopping RootWhisper services...")
        backend_proc.terminate()
        if frontend_proc:
            frontend_proc.terminate()
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_exit)
    signal.signal(signal.SIGTERM, handle_exit)

    # Keep alive and monitor child processes
    while True:
        b_poll = backend_proc.poll()
        if b_poll is not None:
            print(f"⚠️ FastAPI backend exited with code {b_poll}")
            break

        if frontend_proc:
            f_poll = frontend_proc.poll()
            if f_poll is not None:
                print(f"⚠️ Frontend exited with code {f_poll}")
                break

        time.sleep(1)


if __name__ == "__main__":
    main()
