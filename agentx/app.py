"""Unified launcher for SENTINEL Attack Playground, Product API, and Sandbox."""

from __future__ import annotations

import argparse
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
import uvicorn

from sentinel_playground.api import create_playground_router
from sentinel_playground.vault import ensure_sandbox_vault
from sentinel_product import ProductEngine, ProductStore, create_product_app, create_product_router
from sentinel_sandbox import ProductClient
from sentinel_sandbox.api import create_sandbox_router

BASE_DIR = Path(__file__).resolve().parent
PLAYGROUND_HTML = BASE_DIR / "ui" / "playground.html"
SANDBOX_HTML = BASE_DIR / "ui" / "sandbox.html"
DASHBOARD_HTML = BASE_DIR / "ui" / "dashboard.html"


def create_app(*, profile: str = "sandbox", db_path: str = ":memory:") -> FastAPI:
    """Build the FastAPI app for either 'sandbox' (Attack Playground + API) or 'production'."""
    is_sandbox = profile.strip().lower() == "sandbox"
    store = ProductStore(db_path=db_path)
    engine = ProductEngine(store=store, sandbox_profile=is_sandbox)

    app = FastAPI(
        title=f"AgentX ({'Attack Playground & Sandbox' if is_sandbox else 'Production Enforce Profile'})",
        version="1.0.0",
        description="AgentX Attack Playground, Task-Scoped Execution Guard, and Product API.",
    )

    @app.exception_handler(HTTPException)
    async def _http_err_handler(_req: Request, exc: HTTPException) -> JSONResponse:
        if isinstance(exc.detail, dict) and "code" in exc.detail:
            return JSONResponse(status_code=exc.status_code, content=exc.detail)
        return JSONResponse(
            status_code=exc.status_code,
            content={"code": "HTTP_ERROR", "message": str(exc.detail)},
        )

    app.include_router(create_product_router(engine))

    @app.get("/dashboard", response_class=HTMLResponse)
    def dashboard_page() -> HTMLResponse:
        return HTMLResponse(content=DASHBOARD_HTML.read_text(encoding="utf-8"))

    if is_sandbox:
        ensure_sandbox_vault()
        product_asgi = create_product_app(engine=engine, sandbox_profile=True)
        product_client = ProductClient(app=product_asgi)
        app.include_router(create_sandbox_router(product_client=product_client, product_engine=engine))
        app.include_router(create_playground_router())

        @app.get("/", response_class=HTMLResponse)
        def home_playground() -> HTMLResponse:
            return HTMLResponse(content=PLAYGROUND_HTML.read_text(encoding="utf-8"))

        @app.get("/sandbox", response_class=HTMLResponse)
        def sandbox_legacy_page() -> HTMLResponse:
            return HTMLResponse(content=SANDBOX_HTML.read_text(encoding="utf-8"))
    else:
        @app.get("/", response_class=HTMLResponse)
        def prod_root() -> HTMLResponse:
            return HTMLResponse(content=DASHBOARD_HTML.read_text(encoding="utf-8"))

    return app


app = create_app(profile=os.environ.get("SENTINEL_PROFILE", "sandbox"))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Launch SENTINEL Attack Playground & Guard server.")
    parser.add_argument("--profile", choices=["sandbox", "production"], default=os.environ.get("SENTINEL_PROFILE", "sandbox"))
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8000")))
    args = parser.parse_args()

    selected_app = create_app(profile=args.profile)
    uvicorn.run(selected_app, host=args.host, port=args.port, log_level="info")
