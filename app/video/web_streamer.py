"""
Embedded Live MJPEG & Telemetry HTTP Server (`app/video/web_streamer.py`)

Allows the Web Frontend (`frontend/index.html`) to view the real-time annotated
YOLO detection feed (Person + Helmet/No-Helmet + Fire/Smoke bounding boxes)
and live telemetry JSON directly in the browser without blocking the desktop UI.

Endpoints exposed on `http://127.0.0.1:8765`:
- `GET /stream.mjpg` : Multipart MJPEG video stream of the annotated YOLO frames
- `GET /snapshot.jpg`: Latest annotated frame as a single JPEG image (with CORS)
- `GET /status.json` : Real-time JSON telemetry (active status, FPS, workers count,
                       no_helmet_count, fire_detected, smoke_detected, safety level)
"""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import threading
import time
from typing import Any, Dict, Optional
import cv2
import numpy as np

from app.utils.logger import get_logger

log = get_logger("video.streamer")


class WebStreamPublisher:
    """
    Thread-safe frame and telemetry publisher that serves live annotated YOLO
    frames over HTTP (`MJPEG`, `snapshot.jpg`, and `status.json`) to the frontend.
    """

    def __init__(self, host: str = "127.0.0.1", port: int = 8765):
        self.host = host
        self.port = port
        self._lock = threading.Lock()
        self._latest_jpeg: Optional[bytes] = None
        self._placeholder_jpeg: bytes = self._create_placeholder_jpeg()
        self._latest_status: Dict[str, Any] = {
            "active": False,
            "source": "STANDBY",
            "fps": 0.0,
            "safetyLevel": "STANDBY",
            "safetyMessage": "ML Engine Standby — Start Webcam or Stream",
            "totalPersons": 0,
            "helmetCount": 0,
            "noHelmetCount": 0,
            "noVestCount": 0,
            "noBootsCount": 0,
            "fireDetected": False,
            "smokeDetected": False,
            "modelReady": False,
            "timestamp": time.time(),
        }
        self._server: Optional[ThreadingHTTPServer] = None
        self._thread: Optional[threading.Thread] = None

    @staticmethod
    def _create_placeholder_jpeg() -> bytes:
        img = np.zeros((360, 640, 3), dtype=np.uint8)
        img[:] = (24, 27, 32)
        cv2.putText(
            img,
            "WARDEN'S EYE - AI ML ENGINE READY",
            (75, 165),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (80, 200, 120),
            2,
        )
        cv2.putText(
            img,
            "Start Webcam / Stream in Python App or Browser Mode",
            (65, 205),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.58,
            (160, 170, 180),
            1,
        )
        ok, buf = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        return buf.tobytes() if ok else b""

    def start(self):
        """Start the background ThreadingHTTPServer on `127.0.0.1:8765`."""
        if self._server is not None:
            return

        publisher = self

        class StreamHandler(BaseHTTPRequestHandler):
            def log_message(self, format, *args):
                # Suppress per-frame console HTTP access logs
                pass

            def _send_cors_headers(self):
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
                self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
                self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")

            def do_OPTIONS(self):
                self.send_response(204)
                self._send_cors_headers()
                self.end_headers()

            def do_GET(self):
                path = self.path.split("?", 1)[0]

                if path == "/status.json":
                    data = publisher.get_status()
                    body = json.dumps(data).encode("utf-8")
                    self.send_response(200)
                    self._send_cors_headers()
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                    return

                if path == "/snapshot.jpg":
                    jpg = publisher.get_jpeg()
                    self.send_response(200)
                    self._send_cors_headers()
                    self.send_header("Content-Type", "image/jpeg")
                    self.send_header("Content-Length", str(len(jpg)))
                    self.end_headers()
                    self.wfile.write(jpg)
                    return

                if path in ("/stream.mjpg", "/video"):
                    self.send_response(200)
                    self._send_cors_headers()
                    self.send_header(
                        "Content-Type",
                        "multipart/x-mixed-replace; boundary=frame",
                    )
                    self.end_headers()
                    try:
                        while True:
                            jpg = publisher.get_jpeg()
                            self.wfile.write(b"--frame\r\n")
                            self.wfile.write(b"Content-Type: image/jpeg\r\n")
                            self.wfile.write(f"Content-Length: {len(jpg)}\r\n\r\n".encode("utf-8"))
                            self.wfile.write(jpg)
                            self.wfile.write(b"\r\n")
                            time.sleep(0.08)  # ~12.5 FPS web stream
                    except Exception:
                        return

                self.send_response(404)
                self._send_cors_headers()
                self.end_headers()

        try:
            self._server = ThreadingHTTPServer((self.host, self.port), StreamHandler)
            self._thread = threading.Thread(
                target=self._server.serve_forever, daemon=True
            )
            self._thread.start()
            log.info(
                "Frontend ML Live Stream server active at http://%s:%d/stream.mjpg",
                self.host,
                self.port,
            )
        except Exception as exc:
            log.warning("Could not bind Frontend ML Stream server on port %d: %s", self.port, exc)
            self._server = None

    def stop(self):
        if self._server is not None:
            try:
                self._server.shutdown()
                self._server.server_close()
            except Exception:
                pass
            self._server = None

    def update_frame(
        self,
        frame: Any,
        ppe_results: Dict[str, Any],
        fire_results: Dict[str, Any],
        safety_level: str,
        safety_message: str,
        fps: float,
        source_name: str,
        model_ready: bool = True,
    ):
        """Encode the latest annotated frame and update telemetry snapshot."""
        jpeg_bytes = None
        if frame is not None:
            try:
                ok, encoded = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                if ok:
                    jpeg_bytes = encoded.tobytes()
            except Exception:
                jpeg_bytes = None

        helmets = sum(
            1 for d in ppe_results.get("head_detections", []) if d.get("label") == "helmet"
        )

        with self._lock:
            if jpeg_bytes is not None:
                self._latest_jpeg = jpeg_bytes
            self._latest_status = {
                "active": frame is not None,
                "source": source_name,
                "fps": round(float(fps), 1),
                "safetyLevel": safety_level,
                "safetyMessage": safety_message,
                "totalPersons": int(ppe_results.get("total_persons", 0)),
                "helmetCount": helmets,
                "noHelmetCount": int(ppe_results.get("no_helmet_count", 0)),
                "noVestCount": int(ppe_results.get("no_vest_count", 0)),
                "noBootsCount": int(ppe_results.get("no_boots_count", 0)),
                "fireDetected": bool(fire_results.get("fire_detected", False)),
                "smokeDetected": bool(fire_results.get("smoke_detected", False)),
                "modelReady": model_ready,
                "timestamp": time.time(),
            }

    def set_standby(self, model_ready: bool = True):
        with self._lock:
            self._latest_jpeg = None
            self._latest_status["active"] = False
            self._latest_status["source"] = "STANDBY"
            self._latest_status["fps"] = 0.0
            self._latest_status["safetyLevel"] = "STANDBY"
            self._latest_status["safetyMessage"] = "ML Engine Standby — Ready"
            self._latest_status["modelReady"] = model_ready
            self._latest_status["timestamp"] = time.time()

    def get_jpeg(self) -> bytes:
        with self._lock:
            return self._latest_jpeg if self._latest_jpeg is not None else self._placeholder_jpeg

    def get_status(self) -> Dict[str, Any]:
        with self._lock:
            return dict(self._latest_status)
