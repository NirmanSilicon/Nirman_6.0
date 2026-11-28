"""
Embedded Live MJPEG & Telemetry HTTP Server (`app/video/web_streamer.py`)

Allows the Web Frontend (`frontend/index.html`) to view AND directly control
the real-time annotated YOLO detection feed (Person + Helmet/No-Helmet + Fire/Smoke
bounding boxes) and live telemetry JSON directly in the browser!

Endpoints exposed on `http://127.0.0.1:8765`:
- `GET  /stream.mjpg`  : Multipart MJPEG video stream of the annotated YOLO frames
- `GET  /snapshot.jpg` : Latest annotated frame as a single JPEG image (with CORS)
- `GET  /status.json`  : Real-time JSON telemetry (active status, FPS, workers count,
                         no_helmet_count, fire_detected, smoke_detected, safety level)
- `POST /control`      : Start/Stop camera directly from the browser:
                         `{"action": "start_webcam"}`
                         `{"action": "start_stream", "url": "http://192.168.1.50:8080/video"}`
                         `{"action": "stop"}`
"""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import sys
import threading
import time
from pathlib import Path
from typing import Any, Callable, Dict, Optional
import cv2
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.utils.logger import get_logger

log = get_logger("video.streamer")


class WebStreamPublisher:
    """
    Thread-safe frame and telemetry publisher that serves live annotated YOLO
    frames over HTTP (`MJPEG`, `snapshot.jpg`, `status.json`, and `POST /control`)
    to the frontend.
    """

    def __init__(
        self,
        host: str = "127.0.0.1",
        port: int = 8765,
        control_callback: Optional[Callable[[Dict[str, Any]], Dict[str, Any]]] = None,
    ):
        self.host = host
        self.port = port
        self.control_callback = control_callback
        self._lock = threading.Lock()
        self._latest_jpeg: Optional[bytes] = None
        self._placeholder_jpeg: bytes = self._create_placeholder_jpeg()
        self._latest_status: Dict[str, Any] = {
            "active": False,
            "source": "STANDBY",
            "fps": 0.0,
            "safetyLevel": "STANDBY",
            "safetyMessage": "ML Engine Standby — Click 'Start Webcam' to begin live detection",
            "totalPersons": 0,
            "helmetCount": 0,
            "noHelmetCount": 0,
            "noVestCount": 0,
            "noBootsCount": 0,
            "fireDetected": False,
            "smokeDetected": False,
            "modelReady": True,
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
            "Click 'Start Webcam' or 'Smartphone Stream' in Dashboard",
            (60, 205),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
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
                pass

            def _send_cors_headers(self):
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
                self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
                self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")

            def do_OPTIONS(self):
                self.send_response(204)
                self._send_cors_headers()
                self.end_headers()

            def do_POST(self):
                path = self.path.split("?", 1)[0]
                if path == "/control":
                    length = int(self.headers.get("Content-Length", "0"))
                    raw = self.rfile.read(length) if length > 0 else b"{}"
                    try:
                        cmd = json.loads(raw.decode("utf-8"))
                    except Exception:
                        cmd = {}

                    result = {"ok": False, "message": "No control handler attached"}
                    if publisher.control_callback is not None:
                        try:
                            result = publisher.control_callback(cmd)
                        except Exception as exc:
                            result = {"ok": False, "message": str(exc)}

                    body = json.dumps(result).encode("utf-8")
                    self.send_response(200)
                    self._send_cors_headers()
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                    return

                self.send_response(404)
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
                            time.sleep(0.035)
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


class HeadlessMLWebDaemon:
    """
    Runs the complete YOLOv11 PPE + Fire/Smoke + 6-Stage Reliability Pipeline
    as a background web service on `http://127.0.0.1:8765`, controllable
    directly from the browser dashboard (`POST /control`) and auto-starting
    Webcam 0 on launch!
    """

    def __init__(self, auto_start_webcam: bool = True):
        from app.detection.ppe_detector import PPEDetector, EMPTY_PPE_RESULT
        from app.detection.fire_detector import FireSmokeDetector, EMPTY_FIRE_RESULT
        from app.safety.engine import SafetyEngine
        from app.ui.overlay import OverlayRenderer
        from app.video.source import VideoSource
        from app.events.backend_client import BackendAPIClient

        self.EMPTY_PPE = EMPTY_PPE_RESULT
        self.EMPTY_FIRE = EMPTY_FIRE_RESULT
        self.ppe_detector = PPEDetector()
        self.fire_detector = FireSmokeDetector()
        self.safety_engine = SafetyEngine()
        self.overlay_renderer = OverlayRenderer()
        self.video_source = VideoSource()
        self.backend_client = BackendAPIClient()

        self.ppe_ok = self.ppe_detector.load()
        self.fire_ok = self.fire_detector.load()
        self._stop_event = threading.Event()
        self._worker_thread: Optional[threading.Thread] = None
        self._infer_thread: Optional[threading.Thread] = None
        self._state_lock = threading.Lock()
        self._latest_raw_frame = None
        self._cached_ppe = self.EMPTY_PPE
        self._cached_fire = self.EMPTY_FIRE
        self._cached_status = self.safety_engine.evaluate(self.EMPTY_PPE, self.EMPTY_FIRE)

        self.publisher = WebStreamPublisher(
            host="127.0.0.1",
            port=8765,
            control_callback=self.handle_control,
        )
        self.publisher.start()

        if auto_start_webcam:
            self.start_webcam()

    def handle_control(self, cmd: Dict[str, Any]) -> Dict[str, Any]:
        action = str(cmd.get("action", "")).lower()
        if action == "start_webcam":
            ok = self.start_webcam(int(cmd.get("index", 0)))
            return {"ok": ok, "message": "Webcam started" if ok else "Webcam unavailable"}
        if action == "start_stream":
            url = str(cmd.get("url", "")).strip()
            ok = self.start_stream(url)
            return {"ok": ok, "message": f"Stream started: {url}" if ok else "Stream unreachable"}
        if action == "stop":
            self.stop_capture()
            return {"ok": True, "message": "Capture stopped"}
        return {"ok": False, "message": f"Unknown action: {action}"}

    def start_webcam(self, index: int = 0) -> bool:
        self.stop_capture()
        if self.video_source.open_webcam(index):
            self._start_loop()
            return True
        return False

    def start_stream(self, url: str) -> bool:
        self.stop_capture()
        if self.video_source.open_stream(url):
            self.backend_client.send_camera_heartbeat(status="ONLINE", stream_url=url, force=True)
            self._start_loop()
            return True
        return False

    def stop_capture(self):
        self._stop_event.set()
        if self._worker_thread and self._worker_thread.is_alive():
            self._worker_thread.join(timeout=2.0)
        if self._infer_thread and self._infer_thread.is_alive():
            self._infer_thread.join(timeout=2.0)
        self.video_source.release()
        self.publisher.set_standby(model_ready=(self.ppe_ok and self.fire_ok))

    def _start_loop(self):
        self._stop_event.clear()
        with self._state_lock:
            self._latest_raw_frame = None
            self._cached_ppe = self.EMPTY_PPE
            self._cached_fire = self.EMPTY_FIRE
            self._cached_status = self.safety_engine.evaluate(self.EMPTY_PPE, self.EMPTY_FIRE)
        self._worker_thread = threading.Thread(target=self._render_loop, daemon=True)
        self._infer_thread = threading.Thread(target=self._inference_loop, daemon=True)
        self._worker_thread.start()
        self._infer_thread.start()

    def _inference_loop(self):
        """
        Asynchronous AI Inference Thread:
        Runs YOLOv11 PPE + Fire/Smoke on the latest frame in the background
        so video streaming stays smooth at ~25 FPS with zero lag!
        """
        infer_idx = 0
        fire_cache = self.EMPTY_FIRE
        while not self._stop_event.is_set():
            with self._state_lock:
                frame = self._latest_raw_frame.copy() if self._latest_raw_frame is not None else None

            if frame is None:
                time.sleep(0.02)
                continue

            infer_idx += 1
            ppe_results = self.ppe_detector.detect(frame) if self.ppe_ok else self.EMPTY_PPE
            # Run Fire/Smoke every 2nd inference cycle unless fire/smoke is active
            if self.fire_ok and (infer_idx % 2 == 1 or fire_cache.get("fire_detected") or fire_cache.get("smoke_detected")):
                fire_cache = self.fire_detector.detect(frame)
            fire_results = fire_cache
            status = self.safety_engine.evaluate(ppe_results, fire_results)

            with self._state_lock:
                self._cached_ppe = ppe_results
                self._cached_fire = fire_results
                self._cached_status = status

            self.backend_client.process_frame_results(
                ppe_results, fire_results, status.level, status.detail, frame=frame
            )

    def _render_loop(self):
        """
        High-FPS Zero-Lag Stream Loop (~25 FPS):
        Reads the newest camera frame immediately, draws the latest YOLO bounding boxes,
        and pushes to `/stream.mjpg` and `/snapshot.jpg` without waiting for CPU inference.
        """
        fps_counter = 0
        fps_start = time.time()
        display_fps = 24.0

        while not self._stop_event.is_set():
            loop_t0 = time.time()
            ret, frame = self.video_source.read()
            if not ret or frame is None:
                time.sleep(0.02)
                continue

            # Normalize high-res phone streams (e.g. 1080p/4K) to 640px width for fast encoding & zero network lag
            h, w = frame.shape[:2]
            if w > 640:
                scale = 640.0 / float(w)
                frame = cv2.resize(frame, (640, int(h * scale)), interpolation=cv2.INTER_AREA)

            with self._state_lock:
                self._latest_raw_frame = frame.copy()
                ppe_results = self._cached_ppe
                fire_results = self._cached_fire
                status = self._cached_status

            self.overlay_renderer.render(frame, ppe_results, fire_results)

            fps_counter += 1
            elapsed = time.time() - fps_start
            if elapsed >= 1.0:
                display_fps = fps_counter / elapsed
                fps_counter = 0
                fps_start = time.time()

            self.publisher.update_frame(
                frame=frame,
                ppe_results=ppe_results,
                fire_results=fire_results,
                safety_level=status.level,
                safety_message=status.message,
                fps=display_fps,
                source_name=self.video_source.source_name,
                model_ready=(self.ppe_ok and self.fire_ok),
            )

            # Cap render loop to ~25 FPS (~0.04s per frame)
            dt = time.time() - loop_t0
            if dt < 0.038:
                time.sleep(0.038 - dt)


if __name__ == "__main__":
    print("[WebStreamer] Starting Headless YOLOv11 ML Web Daemon on http://127.0.0.1:8765 ...")
    daemon = HeadlessMLWebDaemon(auto_start_webcam=True)
    try:
        while True:
            time.sleep(1.0)
    except KeyboardInterrupt:
        daemon.stop_capture()
        daemon.publisher.stop()
