"""Receive browser camera frames: ``/ws/push/<belt id>``.

Protocol, deliberately small:

* client -> server: binary messages, each one JPEG frame.
* server -> client: JSON text.
    ``{"type": "ack"}``                  after every frame; the client sends the
                                         next frame only once it has this, so a
                                         slow link or server never queues video.
    ``{"type": "started", "status": …}`` the belt's pipeline is running.
    ``{"type": "error", "detail": …}``   the pipeline could not start.

The pipeline starts on the first frame and stops when the sender goes away --
unless a newer sender has taken the belt over in the meantime.
"""
from __future__ import annotations

import asyncio
import logging

import cv2
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool

from ..pipeline.session import manager
from ..sources import SourceError
from ..sources import push
from ..store.db import get_db

log = logging.getLogger(__name__)
router = APIRouter(tags=["push"])

# Refuse absurd frames rather than decoding them: 8 MB is far beyond any JPEG
# the sender page produces.
MAX_FRAME_BYTES = 8 * 1024 * 1024
# The pipeline is sized for one camera per belt; frames larger than this are
# scaled down on arrival so a 4K phone camera cannot starve the detector.
MAX_WIDTH = 1280
RETRY_SECONDS = 5.0


def _decode(data: bytes) -> np.ndarray | None:
    image = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        return None
    h, w = image.shape[:2]
    if w > MAX_WIDTH:
        image = cv2.resize(image, (MAX_WIDTH, max(1, int(h * MAX_WIDTH / w))),
                           interpolation=cv2.INTER_AREA)
    return image


@router.websocket("/ws/push/{belt_id}")
async def push_camera(websocket: WebSocket, belt_id: str, label: str = "") -> None:
    belt = await run_in_threadpool(get_db().get_belt, belt_id.upper())
    # Accept before refusing: a close sent before the handshake reaches the
    # browser as a bare HTTP 403, and the sender page could not tell "no such
    # belt" (stop) from a network drop (reconnect).
    await websocket.accept()
    if belt is None:
        await websocket.close(code=4404, reason="No such belt")
        return
    bid = belt["id"]

    channel = push.open_channel(bid, (label or "Browser camera")[:80])
    uri = push.uri_for(bid)
    log.info("Browser camera connected for %s (%s)", bid, channel.label)

    async def start_pipeline() -> None:
        try:
            session = await asyncio.to_thread(manager.start, uri, bid)
            await websocket.send_json({"type": "started", "status": session.status()})
        except SourceError as exc:
            await websocket.send_json({"type": "error", "detail": str(exc)})
        except Exception as exc:  # noqa: BLE001
            log.exception("Could not start %s from a browser camera", bid)
            await websocket.send_json({"type": "error", "detail": str(exc)})

    starter: asyncio.Task | None = None
    loop = asyncio.get_running_loop()
    last_attempt = -RETRY_SECONDS
    try:
        while True:
            message = await websocket.receive()
            if message["type"] == "websocket.disconnect":
                break
            data = message.get("bytes")
            if not data:
                continue  # text keep-alives
            if len(data) <= MAX_FRAME_BYTES:
                image = await asyncio.to_thread(_decode, data)
                if image is not None:
                    channel.put(image)
                    # Start on the first frame; restart if the belt's pipeline
                    # has since stopped (and nothing else took the belt over),
                    # at most every few seconds so a failing start is not
                    # retried on every frame.
                    session = manager.get(bid)
                    idle = session is None or not session.running
                    now = loop.time()
                    if (idle and (starter is None or starter.done())
                            and now - last_attempt >= RETRY_SECONDS):
                        last_attempt = now
                        starter = asyncio.create_task(start_pipeline())
            await websocket.send_json({"type": "ack"})
    except WebSocketDisconnect:
        pass
    except Exception:  # noqa: BLE001
        log.debug("Push socket for %s closed with error", bid, exc_info=True)
    finally:
        current = push.release_channel(channel)
        log.info("Browser camera for %s disconnected", bid)
        session = manager.get(bid)
        if current and session is not None and session.uri == uri:
            await asyncio.to_thread(manager.stop, bid)
