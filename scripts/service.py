"""Local presentation service entrypoint; loads server configuration without printing it."""

import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

import uvicorn


def configure():
    path = ROOT / ".env"
    if path.exists():
        for line in path.read_text(encoding="utf-8-sig").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                key, value = line.split("=", 1)
                if key.strip().startswith(("AGENT_X_", "OPENAI_")):
                    os.environ.setdefault(key.strip(), value.strip().strip("\"'"))
    defaults = {
        "AGENT_X_PROFILE": "sandbox", "AGENT_X_OPERATOR_TOKEN": "local-operator-change-me",
        "AGENT_X_SANDBOX_TOKEN": "local-sandbox-change-me",
        "AGENT_X_DATABASE": str(ROOT / "data/presentation.sqlite3"),
        "AGENT_X_PRODUCT_URL": "http://127.0.0.1:18000",
        "AGENT_X_DASHBOARD_URL": "http://localhost:18000",
    }
    for key, value in defaults.items():
        os.environ.setdefault(key, value)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("service", choices=["product", "sandbox", "evaluation"])
    args = parser.parse_args()
    configure()
    module, port = {
        "product": ("agent_x_product", 18000), "sandbox": ("agent_x_sandbox", 18081),
        "evaluation": ("agent_x_evaluation", 18082),
    }[args.service]
    uvicorn.run(f"{module}.app:create_app", factory=True, host="127.0.0.1", port=port)
