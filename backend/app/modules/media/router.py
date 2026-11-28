"""ParkSMART - Demo Media / Video Streaming Router."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.config import get_settings
from app.deps import get_current_user

router = APIRouter()

ALLOWED_EXTS = {".mp4", ".webm", ".mov"}


def _video_dir() -> Path:
    settings = get_settings()
    base = Path(__file__).resolve().parents[4]  # repo root
    return (base / settings.demo_videos).resolve()


def _list_video_files() -> list[Path]:
    vdir = _video_dir()
    if not vdir.exists():
        return []
    return sorted(
        [p for p in vdir.iterdir() if p.is_file() and p.suffix.lower() in ALLOWED_EXTS],
        key=lambda p: p.name,
    )


@router.get("/videos")
async def list_videos(
    _user=Depends(get_current_user),
) -> list[dict[str, Any]]:
    """List available demo videos from the configured data folder."""
    files = _list_video_files()
    return [
        {
            "id": f.stem,
            "name": f.name,
            "size_bytes": f.stat().st_size,
            "stream_url": f"/api/v1/media/videos/{f.stem}/stream",
        }
        for f in files
    ]


@router.get("/videos/{video_id}/stream")
async def stream_video(
    video_id: str,
    range_header: str | None = Header(default=None, alias="Range"),
    token: str | None = Query(default=None),
) -> StreamingResponse:
    """Stream a demo video with HTTP 206 Partial Content Range support."""
    settings = get_settings()
    if not settings.demo_mode and not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    if "/" in video_id or "\\" in video_id or ".." in video_id:
        raise HTTPException(status_code=403, detail="Invalid video id")

    files = {f.stem: f for f in _list_video_files()}
    target = files.get(video_id)
    if not target:
        raise HTTPException(status_code=404, detail="Video not found")

    file_size = target.stat().st_size
    start = 0
    end = file_size - 1
    status_code = 200

    if range_header and range_header.startswith("bytes="):
        status_code = 206
        byte_range = range_header.replace("bytes=", "").split(",")[0].strip()
        parts = byte_range.split("-")
        if parts[0]:
            start = int(parts[0])
        if len(parts) > 1 and parts[1]:
            end = min(int(parts[1]), file_size - 1)
        if start >= file_size or start > end:
            raise HTTPException(status_code=416, detail="Requested Range Not Satisfiable")

    chunk_size = end - start + 1

    def iterfile():
        with open(target, "rb") as f:
            f.seek(start)
            remaining = chunk_size
            while remaining > 0:
                data = f.read(min(65536, remaining))
                if not data:
                    break
                remaining -= len(data)
                yield data

    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(chunk_size),
        "Cache-Control": "public, max-age=3600",
    }
    if status_code == 206:
        headers["Content-Range"] = f"bytes {start}-{end}/{file_size}"

    return StreamingResponse(
        iterfile(),
        status_code=status_code,
        media_type="video/mp4",
        headers=headers,
    )
