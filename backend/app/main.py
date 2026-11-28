import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from .config import get_settings
from .db import SessionLocal, engine, init_db
from .routers import journey, misc, scan
from .seed import seed
from .services import storage


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    with SessionLocal() as db:
        seed(db)
    try:
        storage.ensure_bucket()
    except Exception as e:  # API still serves; scans just won't keep images
        print("object store not ready:", e)
    yield


app = FastAPI(title="Ouroboros API", version="1.0.0", lifespan=lifespan,
              description="One phone photo in -> value and next step out.")
app.add_middleware(CORSMiddleware, allow_origins=get_settings().cors_list, allow_methods=["*"], allow_headers=["*"])
app.include_router(scan.router)
app.include_router(misc.router)
app.include_router(journey.router)


@app.get("/healthz", tags=["meta"])
def healthz():
    with engine.connect() as c:
        c.execute(text("SELECT 1"))
    return {"ok": True}


# Serve the built PWA from the same process (single deployable). Registered last so API routes win.
_static = Path(os.getenv("STATIC_DIR", "/srv/static"))
if _static.is_dir():
    app.mount("/assets", StaticFiles(directory=_static / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        f = (_static / path).resolve()
        if path and f.is_file() and _static.resolve() in f.parents:
            headers = {"Cache-Control": "no-cache"} if path in ("sw.js", "index.html") else {}
            return FileResponse(f, headers=headers)
        return FileResponse(_static / "index.html", headers={"Cache-Control": "no-cache"})
