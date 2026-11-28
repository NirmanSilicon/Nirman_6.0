"""
NagarDrishti 3D — Python Geospatial & Document Processing Service (FastAPI)
- Digital PDF text extraction using PyMuPDF (fitz) when installed
- Optional Copernicus Sentinel-2 before/after comparison when credentials are configured
Never fabricates satellite imagery or unavailable geospatial results.
"""
import io
import os
from typing import List, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

try:
    import rasterio
    HAS_RASTERIO = True
except ImportError:
    HAS_RASTERIO = False

try:
    import geopandas
    HAS_GEOPANDAS = True
except ImportError:
    HAS_GEOPANDAS = False

app = FastAPI(title="NagarDrishti 3D Geospatial & Document Service", version="1.0.0")

allowed = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:4000").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class SatelliteCompareRequest(BaseModel):
    project_id: Optional[str] = None
    bbox: List[float] = Field(..., min_length=4, max_length=4)
    before_date: str
    after_date: str
    max_cloud_pct: float = Field(default=20.0, ge=0, le=100)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "capabilities": {
            "pymupdf": HAS_PYMUPDF,
            "rasterio": HAS_RASTERIO,
            "geopandas": HAS_GEOPANDAS,
            "copernicus_configured": bool(
                os.getenv("COPERNICUS_CLIENT_ID") and os.getenv("COPERNICUS_CLIENT_SECRET")
            ),
        },
    }


@app.post("/documents/extract")
async def extract_document_text(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported for text extraction.")

    data = await file.read()
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="PDF exceeds 20 MB limit.")

    if not HAS_PYMUPDF:
        return {
            "extracted": False,
            "text": "",
            "note": "PyMuPDF is not installed in the Python environment; manual metadata entry remains available.",
        }

    try:
        doc = fitz.open(stream=io.BytesIO(data), filetype="pdf")
        pages_text = [page.get_text("text") for page in doc]
        combined = "\n".join(pages_text).strip()
        return {
            "extracted": True,
            "page_count": len(doc),
            "text": combined[:15000],
            "note": "Digital text extracted via PyMuPDF. Scanned image-only PDFs require Tesseract OCR.",
        }
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Failed to parse PDF: {exc}") from exc


@app.post("/satellite/compare")
async def compare_sentinel2(payload: SatelliteCompareRequest):
    client_id = os.getenv("COPERNICUS_CLIENT_ID", "").strip()
    client_secret = os.getenv("COPERNICUS_CLIENT_SECRET", "").strip()

    if not client_id or not client_secret:
        return {
            "configured": False,
            "status": "unconfigured",
            "message": "Copernicus Sentinel-2 credentials are not configured. No imagery was fabricated.",
            "limitations": [
                "Sentinel-2 resolution (~10m/pixel) cannot verify narrow roads, potholes, or pavement thickness.",
                "Satellite imagery never proves project completion.",
            ],
        }

    # Authenticate against Copernicus Data Space Ecosystem OAuth token endpoint
    import httpx

    token_url = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
    catalog_url = "https://sh.dataspace.copernicus.eu/api/v1/catalog/1.0.0/search"

    async with httpx.AsyncClient(timeout=20.0) as client:
        token_resp = await client.post(
            token_url,
            data={
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": client_secret,
            },
        )
        if token_resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to authenticate with Copernicus Data Space.")

        access_token = token_resp.json().get("access_token")
        headers = {"Authorization": f"Bearer {access_token}"}

        search_body = {
            "bbox": payload.bbox,
            "datetime": f"{payload.before_date}T00:00:00Z/{payload.after_date}T23:59:59Z",
            "collections": ["sentinel-2-l2a"],
            "filter": f"eo:cloud_cover <= {payload.max_cloud_pct}",
            "limit": 10,
        }
        cat_resp = await client.post(catalog_url, json=search_body, headers=headers)
        if cat_resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Copernicus catalog query failed.")

        features = cat_resp.json().get("features", [])
        scenes = [
            {
                "id": f.get("id"),
                "datetime": f.get("properties", {}).get("datetime"),
                "cloud_cover_pct": f.get("properties", {}).get("eo:cloud_cover"),
            }
            for f in features
        ]

        return {
            "configured": True,
            "status": "scenes_found" if scenes else "no_cloud_free_scenes",
            "scenes_count": len(scenes),
            "scenes": scenes,
            "raster_analysis_available": HAS_RASTERIO and HAS_GEOPANDAS,
            "limitations": [
                "Sentinel-2 10m resolution is unsuitable for narrow roads or construction thickness/quality.",
                "Cloud-free optical scenes indicate surface reflectance changes only and do NOT prove project completion.",
            ],
        }
