"""Start the local Android-development API without embedding a key in the app."""
import argparse
import os
from pathlib import Path
import secrets

import uvicorn

parser = argparse.ArgumentParser()
parser.add_argument("--host", default="127.0.0.1")
parser.add_argument("--port", default=8000, type=int)
args = parser.parse_args()
keyfile = Path("data/private/mobile_access.key")
keyfile.parent.mkdir(parents=True, exist_ok=True)
if not keyfile.exists():
    descriptor = os.open(keyfile, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w") as handle:
        handle.write(secrets.token_urlsafe(32))
os.environ["UQUAL_API_KEY"] = keyfile.read_text().strip()
os.environ.setdefault("UQUAL_ACCOUNT_DIR", "data/private/personal-accounts")
print(f"Developer API key file: {keyfile.resolve()} (not required in the personal app)")
print("Personal app: create an email/password account on this server.")
uvicorn.run("uqual.api:app", host=args.host, port=args.port)
