from dataclasses import asdict
from importlib.resources import files
from typing import Literal
from urllib.parse import quote, urlparse
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, Request, Response, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse

from agent_x_evaluation.core import ANNOTATION, INVOICES, compare_runs, compile_contract
from agent_x_shared.models import StrictModel
from agent_x_evaluation.documents import DocumentLibrary, sample_bytes, seed_source
from agent_x_evaluation.ingestion import DocumentError, MAX_BYTES, field_evidence, model_extract, render_pdf_page, review_status
from agent_x_evaluation.limits import BodyLimitMiddleware
from agent_x_sandbox.agents import model_settings
from agent_x_evaluation.agent import NEGATIVE_CASES, run_uploaded_agent


class ComparisonRequest(StrictModel):
    invoice_id: str = "invoice-001"
    fixture: Literal["benign", "incident"] = "incident"
    include_annotation: bool = True


class ExtractionRequest(StrictModel):
    consent_to_model: bool = False


class ConfirmRequest(StrictModel):
    invoice: dict
    revision: int


class UploadedAgentRequest(StrictModel):
    record_id: str
    provider: Literal["local", "live"] = "local"
    negative_case: Literal["none", "transfer", "other_record", "invalid_arguments", "unknown_tool", "tampered_total", "stopped", "guard_unavailable"] = "none"
    consent_to_model: bool = False


def create_app() -> FastAPI:
    app = FastAPI(title="Agent-X Evaluation and Document Workflow", version="0.3.0")
    app.add_middleware(BodyLimitMiddleware)
    library = DocumentLibrary()
    app.state.documents = library

    @app.exception_handler(DocumentError)
    async def document_error(request, error):
        return JSONResponse(status_code=error.status, content={"code": error.code, "message": error.message})

    def owner(request: Request) -> str:
        return request.cookies.get("agent_x_documents", "")

    @app.get("/", response_class=HTMLResponse, include_in_schema=False)
    def index():
        return files("agent_x_evaluation").joinpath("web/index.html").read_text(encoding="utf-8")

    @app.get("/api/evaluation/assets/{asset}", include_in_schema=False)
    def asset_file(asset: Literal["workflow.js", "workflow.css"]):
        content = files("agent_x_evaluation").joinpath("web/" + asset).read_text(encoding="utf-8")
        return Response(content, media_type="text/javascript" if asset.endswith(".js") else "text/css",
                        headers={"Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff"})

    @app.get("/healthz")
    def health():
        return {"status": "ok", "profile": "initial-evaluation", "network_tools": False}

    @app.get("/api/evaluation/catalog")
    def catalog(request: Request):
        reviews = library.catalog(owner(request))
        return {"invoices": [*INVOICES.values(), *[item["invoice"] for item in reviews]],
                "annotation": ANNOTATION,
                "contracts": {**{key: asdict(compile_contract(key)) for key in INVOICES},
                              **{item["invoice"]["invoice_id"]: item["contract"] for item in reviews}},
                "sources": {**{key: seed_source(key) for key in INVOICES},
                            **{item["invoice"]["invoice_id"]: item["source"] for item in reviews}}}

    @app.get("/api/evaluation/capabilities")
    def capabilities():
        settings = model_settings()
        return {"formats": ["PDF", "PNG", "JPG", "TXT", "CSV", "JSON", "DOCX"],
                "max_upload_mb": 8, "max_pdf_pages": 20, "max_ocr_pages": 4,
                "model_configured": bool(settings["key"]), "model": settings["model"],
                "provider_host": urlparse(settings["base_url"]).hostname,
                "retention": "Temporary in-memory storage; expires after one hour or process restart.",
                "model_consent_required": True}

    @app.get("/api/evaluation/negative-cases")
    def negative_cases():
        return {"cases": NEGATIVE_CASES, "probe_origin": "Explicit test injections; not model-generated attacks"}

    @app.post("/api/evaluation/compare")
    def compare(payload: ComparisonRequest, request: Request):
        try:
            if payload.invoice_id in INVOICES:
                result = compare_runs(payload.invoice_id, payload.fixture, payload.include_annotation)
                result["source"] = seed_source(payload.invoice_id)
            else:
                if not payload.invoice_id.startswith("upload-"):
                    raise ValueError("Unknown selected invoice")
                reviewed = library.resolve(payload.invoice_id, owner(request))
                result = compare_runs(payload.invoice_id, payload.fixture, payload.include_annotation,
                                      {payload.invoice_id: reviewed["record"]})
                result["source"] = reviewed["source"]
                result["evidence_type"] = "user-upload-with-fixed-proposal-replay"
            return result
        except DocumentError:
            raise
        except ValueError:
            raise HTTPException(422, "Unknown invoice or invalid demo parameters") from None

    @app.get("/api/evaluation/samples/{invoice_id}/{extension}")
    def sample(invoice_id: str, extension: Literal["pdf", "png", "json", "csv", "txt"]):
        content, media = sample_bytes(invoice_id, extension)
        return Response(content, media_type=media, headers={
            "Content-Disposition": f'attachment; filename="agent-x-synthetic-{invoice_id}.{extension}"',
            "X-Content-Type-Options": "nosniff"})

    @app.get("/api/evaluation/negative-samples/{case}")
    def negative_sample(case: Literal["invalid-total", "source-instruction"]):
        content, media = sample_bytes("invoice-001", "pdf", case)
        return Response(content, media_type=media, headers={
            "Content-Disposition": f'attachment; filename="agent-x-negative-{case}.pdf"',
            "X-Content-Type-Options": "nosniff"})

    @app.post("/api/evaluation/documents", status_code=201)
    def upload(request: Request, response: Response, file: UploadFile = File(...)):
        session = owner(request) or uuid4().hex
        content = file.file.read(MAX_BYTES + 1)
        file.file.close()
        document = library.create(session, file.filename or "document", content)
        response.set_cookie("agent_x_documents", session, httponly=True, samesite="strict")
        response.headers["Cache-Control"] = "no-store"
        return document

    @app.get("/api/evaluation/documents/{document_id}")
    def document(document_id: str, request: Request):
        return library.public(library.owned(document_id, owner(request)))

    @app.get("/api/evaluation/documents/{document_id}/original")
    def original(document_id: str, request: Request):
        item = library.owned(document_id, owner(request))
        return Response(item["content"], media_type=item["media_type"], headers={
            "Content-Disposition": "attachment; filename*=UTF-8''" + quote(item["filename"], safe=""),
            "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"})

    @app.get("/api/evaluation/documents/{document_id}/preview/{page}")
    def preview(document_id: str, page: int, request: Request):
        item = library.owned(document_id, owner(request))
        if item["media_type"] == "application/pdf":
            return Response(render_pdf_page(item["content"], page), media_type="image/png",
                            headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"})
        if item["media_type"].startswith("image/") and page == 1:
            return Response(item["content"], media_type=item["media_type"],
                            headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"})
        raise DocumentError("PREVIEW_UNAVAILABLE", "Use the extracted text and original download for this format.", 404)

    @app.post("/api/evaluation/documents/{document_id}/extract")
    def extract(document_id: str, payload: ExtractionRequest, request: Request):
        item = library.owned(document_id, owner(request))
        if not payload.consent_to_model:
            raise DocumentError("MODEL_CONSENT_REQUIRED", "Confirm that document content may be sent to your configured model provider.", 400)
        extraction = model_extract(item, model_settings())
        return library.update_extraction(document_id, owner(request), extraction, item["revision"])

    @app.post("/api/evaluation/documents/{document_id}/confirm")
    def confirm(document_id: str, payload: ConfirmRequest, request: Request):
        return library.confirm(document_id, owner(request), payload.invoice, payload.revision)

    @app.post("/api/evaluation/documents/{document_id}/validate")
    def validate_fields(document_id: str, payload: ConfirmRequest, request: Request):
        item = library.owned(document_id, owner(request))
        return {**review_status(payload.invoice), "field_evidence": field_evidence(payload.invoice, item["spans"]),
                "authorizes_execution": False}

    @app.post("/api/evaluation/documents/{document_id}/agent")
    def uploaded_agent(document_id: str, payload: UploadedAgentRequest, request: Request):
        reviewed = library.resolve(payload.record_id, owner(request))
        if reviewed["document_id"] != document_id:
            raise DocumentError("SOURCE_MISMATCH", "The reviewed record belongs to a different upload.", 409)
        if payload.provider == "live" and not payload.consent_to_model:
            raise DocumentError("MODEL_CONSENT_REQUIRED", "Confirm sharing the reviewed invoice and supporting text with your model provider.", 400)
        if payload.provider == "live" and not model_settings()["key"]:
            raise DocumentError("MODEL_NOT_CONFIGURED", "Configure the server-side model provider first.", 503)
        return run_uploaded_agent(reviewed, payload.provider, payload.negative_case)

    @app.delete("/api/evaluation/documents/{document_id}")
    def remove(document_id: str, request: Request):
        library.remove(document_id, owner(request))
        return {"status": "REMOVED"}

    return app
