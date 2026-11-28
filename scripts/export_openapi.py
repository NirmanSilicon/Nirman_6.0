"""Publish canonical OpenAPI and check for accidental API drift in CI."""

import argparse
import json
import tempfile
from pathlib import Path

from agent_x_product.app import create_app
from agent_x_product.config import Settings


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    with tempfile.TemporaryDirectory() as temporary:
        for profile in ("production", "sandbox"):
            app = create_app(Settings(profile, str(Path(temporary) / f"{profile}.db"),
                                      "schema-operator", "schema-sandbox"))
            rendered = json.dumps(app.openapi(), indent=2, sort_keys=True) + "\n"
            path = root / "contracts" / f"openapi.{profile}.json"
            if args.check:
                if not path.exists() or path.read_text(encoding="utf-8") != rendered:
                    raise SystemExit(f"OpenAPI drift: run python scripts/export_openapi.py ({path.name})")
            else:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(rendered, encoding="utf-8")
            print(f"{profile}: {'verified' if args.check else 'exported'}")


if __name__ == "__main__":
    main()
