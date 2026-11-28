"""One-command initial evaluation. No dotenv, key, database, or Node process required."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
local_dependencies = Path(__file__).resolve().parents[1] / ".runtime-deps"
if local_dependencies.exists():
    sys.path.insert(0, str(local_dependencies))

import uvicorn


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Present the Agent-X initial evaluation")
    parser.add_argument("--port", type=int, default=18082)
    args = parser.parse_args()
    from service import configure
    configure()
    print(f"Agent-X evaluation: http://localhost:{args.port}", flush=True)
    uvicorn.run("agent_x_evaluation.app:create_app", factory=True, host="127.0.0.1", port=args.port)
