"""Saarthi laptop link: receives the phone's feed, relays it to displays, records it.

Phone -> laptop: TCP 127.0.0.1:8765 (the phone reaches it through `adb reverse tcp:8765 tcp:8765`),
one JSON message per line (feed v1, shared/feed/v1/README.md). The server acks at once on connect
and then every 500 ms; the phone treats 2 s without an ack as a lost link.

Laptop -> displays: http://127.0.0.1:8000/ serves the blueprint; ws://127.0.0.1:8000/feed relays
every phone message unchanged plus "rx" (laptop receive time, ms since the Unix epoch). A display
that joins late first gets the latest message of each type. A slow display loses messages; it can
never slow the phone.

Every received line is also written to recordings/feed_<time>.jsonl (gitignored), labelled RECORDED
when replayed.

Run (Windows, from the repo root):
    adb reverse tcp:8765 tcp:8765
    laptop\\.venv\\Scripts\\python laptop/link/feed_server.py
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "laptop" / "online"))
import cloud_brain  # noqa: E402  (optional online brain, D51)
from memory import Memory  # noqa: E402  (online session memory, D53)
sys.path.insert(0, str(ROOT / "laptop" / "analysis"))
import insights  # noqa: E402  (the telemetry page's two analyses, D56)
BLUEPRINT = ROOT / "laptop" / "blueprint"
RECORDINGS = ROOT / "recordings"
ACK_PERIOD_S = 0.5
CLIENT_QUEUE = 256


class Hub:
    """Latest message per type, the connected displays, and the recording file."""

    def __init__(self) -> None:
        self.latest: dict[str, dict] = {}
        self.clients: set[asyncio.Queue] = set()
        self.phone_connected = False
        self.received = 0
        self.dropped_to_displays = 0
        RECORDINGS.mkdir(exist_ok=True)
        self.memory = Memory()
        self.record = (RECORDINGS / time.strftime("feed_%Y%m%d_%H%M%S.jsonl")).open("a", encoding="utf-8")

    def publish(self, msg: dict) -> None:
        self.latest[msg.get("type", "?")] = msg
        self.received += 1
        text = json.dumps(msg, separators=(",", ":"))
        self.record.write(text + "\n")
        for q in self.clients:
            if q.full():
                q.get_nowait()          # drop the oldest for this display only
                self.dropped_to_displays += 1
            q.put_nowait(text)

    def status(self, state: str) -> None:
        """The laptop's own view of the phone link, sent to displays like a feed message."""
        self.phone_connected = state == "connected"
        self.publish({"v": 1, "type": "laptop", "phone": state, "rx": now_ms()})


hub: Hub | None = None


def now_ms() -> int:
    return int(time.time() * 1000)


async def handle_phone(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    peer = writer.get_extra_info("peername")
    print(f"phone connected from {peer}")
    hub.status("connected")

    async def acks() -> None:
        while True:
            writer.write(json.dumps({"v": 1, "type": "ack", "t": now_ms()}).encode() + b"\n")
            await writer.drain()
            await asyncio.sleep(ACK_PERIOD_S)

    ack_task = asyncio.create_task(acks())
    try:
        while True:
            line = await reader.readline()
            if not line:
                break
            try:
                msg = json.loads(line)
            except json.JSONDecodeError:
                continue
            msg["rx"] = now_ms()
            if msg.get("type") == "online" and msg.get("event") == "on":
                cloud_brain.warm()   # open the connections before the first question (D58)
            if msg.get("type") == "online" and msg.get("event") == "answer" and hub.memory:
                hub.memory.verdict(msg.get("id"), msg.get("verdict"), msg.get("reason"))
            if msg.get("type") == "ask":
                # Optional online brain (D51): the frame goes to the cloud only; it is never recorded or relayed.
                image = msg.pop("image", None)
                msg["imageBytes"] = len(image or "")
                hub.publish(msg)
                asyncio.create_task(answer_ask(msg, image, writer))
                continue
            hub.publish(msg)
    except (ConnectionResetError, asyncio.IncompleteReadError, OSError):
        pass
    finally:
        ack_task.cancel()
        writer.close()
        hub.status("lost")
        print(f"phone disconnected ({hub.received} messages so far)")


async def answer_ask(msg: dict, image: str | None, writer: asyncio.StreamWriter) -> None:
    """Ask the cloud in a worker thread; send the answer text back to the phone (it checks and speaks)."""
    q = msg.get("question", "")
    notes = "\n".join(x for x in (hub.memory.context(), msg.get("notes") or "") if x)   # online memory + the user's diary (D56)
    out = {"error": "no frame"} if not image else await asyncio.to_thread(cloud_brain.ask, q, image, 6.0, notes)
    hub.memory.add(msg.get("id"), q, out)
    reply = {"v": 1, "type": "answer", "id": msg.get("id"), "t": now_ms(), **out}
    try:
        writer.write(json.dumps(reply).encode() + b"\n")
        await writer.drain()
    except (ConnectionResetError, OSError):
        pass
    hub.publish({**reply, "rx": now_ms()})


@asynccontextmanager
async def lifespan(app: FastAPI):
    global hub
    hub = Hub()
    server = await asyncio.start_server(handle_phone, app.state.phone_host, app.state.phone_port)
    print(f"phone link on {app.state.phone_host}:{app.state.phone_port}; blueprint on http://127.0.0.1:{app.state.http_port}/")
    print(f"recording to {hub.record.name}")
    async with server:
        yield
    hub.record.close()


app = FastAPI(lifespan=lifespan)


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(BLUEPRINT / "index.html")


@app.get("/telemetry")
async def telemetry() -> FileResponse:
    """Mind telemetry and the session card (D48)."""
    return FileResponse(BLUEPRINT / "telemetry.html")


RECORDING_NAME = re.compile(r"^feed_\d{8}_\d{6}\.jsonl$")


@app.get("/recordings")
async def recordings() -> JSONResponse:
    """The recordings on this laptop, newest first (replayed on the telemetry page, labelled RECORDED)."""
    names = sorted((p.name for p in RECORDINGS.glob("feed_*.jsonl") if RECORDING_NAME.match(p.name)), reverse=True)
    return JSONResponse(names)


@app.get("/recordings/{name}")
async def recording(name: str) -> PlainTextResponse:
    if not RECORDING_NAME.match(name) or not (RECORDINGS / name).is_file():
        raise HTTPException(404, "no such recording")
    return PlainTextResponse((RECORDINGS / name).read_text(encoding="utf-8", errors="replace"))


@app.get("/insights")
async def insight_data() -> JSONResponse:
    """Spatial decay curves and the co-occurrence graph from every recording (D56); cached."""
    return JSONResponse(await asyncio.to_thread(insights.compute))


@app.get("/state.json")
async def state() -> JSONResponse:
    return JSONResponse({"phoneConnected": hub.phone_connected, "received": hub.received,
                         "droppedToDisplays": hub.dropped_to_displays, "latest": hub.latest})


@app.websocket("/feed")
async def feed(ws: WebSocket) -> None:
    await ws.accept()
    q: asyncio.Queue = asyncio.Queue(CLIENT_QUEUE)
    for msg in list(hub.latest.values()):
        q.put_nowait(json.dumps(msg, separators=(",", ":")))
    if not hub.latest:
        q.put_nowait(json.dumps({"v": 1, "type": "laptop", "phone": "waiting", "rx": now_ms()}))
    hub.clients.add(q)
    try:
        while True:
            await ws.send_text(await q.get())
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        hub.clients.discard(q)


app.mount("/static", StaticFiles(directory=BLUEPRINT), name="static")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--phone-host", default="127.0.0.1")
    ap.add_argument("--phone-port", type=int, default=8765)
    ap.add_argument("--http-port", type=int, default=8000)
    a = ap.parse_args()
    app.state.phone_host, app.state.phone_port, app.state.http_port = a.phone_host, a.phone_port, a.http_port
    uvicorn.run(app, host="127.0.0.1", port=a.http_port, log_level="warning")
