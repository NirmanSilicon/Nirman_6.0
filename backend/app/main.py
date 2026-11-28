from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .config import get_settings
from .db import SessionLocal, engine, init_db
from .routers import misc, scan
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


@app.get("/healthz", tags=["meta"])
def healthz():
    with engine.connect() as c:
        c.execute(text("SELECT 1"))
    return {"ok": True}
