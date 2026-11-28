"""
Embedded Multi-Camera Live MJPEG & Telemetry HTTP Server (`app/video/web_streamer.py`)

Supports simultaneous multi-camera YOLOv11 PPE + Fire/Smoke AI streaming:
- `CAM_001` : Laptop Webcam (`Webcam 0`) in Zone A
- `CAM_002` : Smartphone Wi-Fi IP Camera (`http://10.68.3.28:8080/video`) in Zone B

Endpoints exposed on `http://127.0.0.1:8765`:
- `GET  /stream.mjpg?cam=CAM_001`  (or `/stream.mjpg?cam=CAM_002`)
- `GET  /snapshot.jpg?cam=CAM_001` (or `/snapshot.jpg?cam=CAM_002`)
- `GET  /status.json`              (returns both `cameras: {CAM_001: {...}, CAM_002: {...}}` and top-level aggregate telemetry)
- `POST /control`                  :
  - `{"action": "start_webcam", "cam": "CAM_001", "index": 0}`
  - `{"action": "start_stream", "cam": "CAM_002", "url": "http://10.68.3.28:8080/video"}`
  - `{"action": "start_dual",   "url": "http://10.68.3.28:8080/video"}`
  - `{"action": "stop",         "cam": "CAM_001" | "CAM_002" | "ALL"}`
"""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse
import json
import sys
import threading
import time
from pathlib import Path
from typing import Any, Callable, Dict, Optional, Tuple
import cv2
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.utils.logger import get_logger

log = get_logger("video.streamer")


def _default_cam_status(cam_id: str, label: str) -> Dict[str, Any]:
    return {
        "camId": cam_id,
        "active": False,
        "source": "STANDBY",
        "fps": 0.0,
        "safetyLevel": "STANDBY",
        "safetyMessage": f"{label} Standby — Ready",
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


class WebStreamPublisher:
    """
    Thread-safe multi-camera frame and telemetry publisher that serves live
    annotated YOLO frames for `CAM_001` (Webcam) and `CAM_002` (Smartphone IP Stream)
    simultaneously over HTTP (`MJPEG`, `snapshot.jpg`, `status.json`, and `POST /control`).
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
        self._jpegs: Dict[str, Optional[bytes]] = {"CAM_001": None, "CAM_002": None}
        self._frame_ids: Dict[str, int] = {"CAM_001": 0, "CAM_002": 0}
        self._placeholders: Dict[str, bytes] = {
            "CAM_001": self._create_placeholder_jpeg("CAM_001 - LAPTOP WEBCAM AI READY", "Click 'Start Webcam AI' in Dashboard"),
            "CAM_002": self._create_placeholder_jpeg("CAM_002 - SMARTPHONE WI-FI AI READY", "Click 'Connect Phone AI' (http://10.68.3.28:8080/video)"),
        }
        self._cam_status: Dict[str, Dict[str, Any]] = {
            "CAM_001": _default_cam_status("CAM_001", "Laptop Webcam"),
            "CAM_002": _default_cam_status("CAM_002", "Smartphone Stream"),
        }
        self._server: Optional[ThreadingHTTPServer] = None
        self._thread: Optional[threading.Thread] = None

    @staticmethod
    def _create_placeholder_jpeg(title: str, subtitle: str) -> bytes:
        img = np.zeros((360, 640, 3), dtype=np.uint8)
        img[:] = (24, 27, 32)
        cv2.putText(
            img,
            title,
            (55, 165),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.72,
            (80, 200, 120),
            2,
        )
        cv2.putText(
            img,
            subtitle,
            (55, 205),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.52,
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
                parsed = urlparse(self.path)
                if parsed.path == "/control":
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
                parsed = urlparse(self.path)
                path = parsed.path
                qs = parse_qs(parsed.query)
                cam_id = str(qs.get("cam", ["CAM_001"])[0]).upper()
                if cam_id not in ("CAM_001", "CAM_002"):
                    cam_id = "CAM_001"

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
                    jpg = publisher.get_jpeg(cam_id)
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
                    last_frame_id = -1
                    last_sent_at = 0.0
                    try:
                        while True:
                            jpg, fid = publisher.get_jpeg_with_id(cam_id)
                            now_t = time.time()
                            if fid == last_frame_id and (now_t - last_sent_at) < 0.5:
                                time.sleep(0.015)
                                continue
                            last_frame_id = fid
                            last_sent_at = now_t
                            self.wfile.write(b"--frame\r\n")
                            self.wfile.write(b"Content-Type: image/jpeg\r\n")
                            self.wfile.write(f"Content-Length: {len(jpg)}\r\n\r\n".encode("utf-8"))
                            self.wfile.write(jpg)
                            self.wfile.write(b"\r\n")
                            self.wfile.flush()
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
                "Frontend Multi-Camera ML Stream server active at http://%s:%d/stream.mjpg",
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
        cam_id: str = "CAM_001",
    ):
        """Encode the latest annotated frame and update telemetry snapshot for `cam_id`."""
        cam_key = cam_id if cam_id in ("CAM_001", "CAM_002") else "CAM_001"
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
                self._jpegs[cam_key] = jpeg_bytes
                self._frame_ids[cam_key] = self._frame_ids.get(cam_key, 0) + 1
            self._cam_status[cam_key] = {
                "camId": cam_key,
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

    def set_standby(self, model_ready: bool = True, cam_id: str = "CAM_001"):
        cam_key = cam_id if cam_id in ("CAM_001", "CAM_002") else "CAM_001"
        with self._lock:
            self._jpegs[cam_key] = None
            self._frame_ids[cam_key] = self._frame_ids.get(cam_key, 0) + 1
            st = self._cam_status[cam_key]
            st["active"] = False
            st["source"] = "STANDBY"
            st["fps"] = 0.0
            st["safetyLevel"] = "STANDBY"
            st["safetyMessage"] = f"{cam_key} Standby — Ready"
            st["totalPersons"] = 0
            st["helmetCount"] = 0
            st["noHelmetCount"] = 0
            st["fireDetected"] = False
            st["smokeDetected"] = False
            st["modelReady"] = model_ready
            st["timestamp"] = time.time()

    def get_jpeg(self, cam_id: str = "CAM_001") -> bytes:
        cam_key = cam_id if cam_id in ("CAM_001", "CAM_002") else "CAM_001"
        with self._lock:
            jpg = self._jpegs.get(cam_key)
            return jpg if jpg is not None else self._placeholders[cam_key]

    def get_jpeg_with_id(self, cam_id: str = "CAM_001") -> Tuple[bytes, int]:
        cam_key = cam_id if cam_id in ("CAM_001", "CAM_002") else "CAM_001"
        with self._lock:
            jpg = self._jpegs.get(cam_key)
            if jpg is None:
                jpg = self._placeholders[cam_key]
            return jpg, self._frame_ids.get(cam_key, 0)

    def get_status(self) -> Dict[str, Any]:
        with self._lock:
            c1 = dict(self._cam_status["CAM_001"])
            c2 = dict(self._cam_status["CAM_002"])
            active_cams = [c for c in (c1, c2) if c["active"]]
            any_active = len(active_cams) > 0
            total_persons = sum(c["totalPersons"] for c in active_cams)
            helmet_count = sum(c["helmetCount"] for c in active_cams)
            no_helmet_count = sum(c["noHelmetCount"] for c in active_cams)
            fire_detected = any(c["fireDetected"] for c in active_cams)
            smoke_detected = any(c["smokeDetected"] for c in active_cams)

            if not any_active:
                agg_level = "STANDBY"
                agg_msg = "All AI Cameras Standby"
            elif fire_detected or smoke_detected or any(c["safetyLevel"] == "DANGER" for c in active_cams):
                agg_level = "DANGER"
                agg_msg = "CRITICAL HAZARD DETECTED across live AI cameras"
            elif no_helmet_count > 0 or any(c["safetyLevel"] == "WARNING" for c in active_cams):
                agg_level = "WARNING"
                agg_msg = f"Helmet violation — {no_helmet_count} worker(s) without helmet"
            else:
                agg_level = "SAFE"
                agg_msg = f"All {len(active_cams)} active AI camera(s) SAFE"

            avg_fps = round(sum(c["fps"] for c in active_cams) / len(active_cams), 1) if active_cams else 0.0
            sources = " + ".join(f"{c['camId']}({c['source']})" for c in active_cams) if active_cams else "STANDBY"

            return {
                "active": any_active,
                "activeCameraCount": len(active_cams),
                "source": sources,
                "fps": avg_fps,
                "safetyLevel": agg_level,
                "safetyMessage": agg_msg,
                "totalPersons": total_persons,
                "helmetCount": helmet_count,
                "noHelmetCount": no_helmet_count,
                "noVestCount": 0,
                "noBootsCount": 0,
                "fireDetected": fire_detected,
                "smokeDetected": smoke_detected,
                "modelReady": c1["modelReady"] and c2["modelReady"],
                "timestamp": time.time(),
                "cameras": {
                    "CAM_001": c1,
                    "CAM_002": c2,
                },
            }


class CameraPipelineSlot:
    """
    Independent high-FPS capture + rendering slot for a single camera (`CAM_001` or `CAM_002`).
    """

    def __init__(self, cam_id: str, publisher: WebStreamPublisher):
        from app.safety.engine import SafetyEngine
        from app.ui.overlay import OverlayRenderer
        from app.video.source import VideoSource
        from app.events.backend_client import BackendAPIClient
        from app.detection.ppe_detector import EMPTY_PPE_RESULT
        from app.detection.fire_detector import EMPTY_FIRE_RESULT

        self.cam_id = cam_id
        self.publisher = publisher
        self.EMPTY_PPE = EMPTY_PPE_RESULT
        self.EMPTY_FIRE = EMPTY_FIRE_RESULT
        self.safety_engine = SafetyEngine()
        self.overlay_renderer = OverlayRenderer()
        self.video_source = VideoSource()
        self.backend_client = BackendAPIClient(camera_code=cam_id)

        self._stop_event = threading.Event()
        self._render_thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        self._latest_raw_frame = None
        self._cached_ppe = self.EMPTY_PPE
        self._cached_fire = self.EMPTY_FIRE
        self._cached_status = self.safety_engine.evaluate(self.EMPTY_PPE, self.EMPTY_FIRE)

    @property
    def is_active(self) -> bool:
        return self.video_source.is_opened and not self._stop_event.is_set()

    def start_webcam(self, index: int = 0) -> bool:
        self.stop()
        if self.video_source.open_webcam(index):
            self.backend_client.send_camera_heartbeat(status="ONLINE", stream_url=f"webcam://{index}", force=True)
            self._start_render_thread()
            return True
        return False

    def start_stream(self, url: str) -> bool:
        self.stop()
        if self.video_source.open_stream(url):
            self.backend_client.send_camera_heartbeat(status="ONLINE", stream_url=url, force=True)
            self._start_render_thread()
            return True
        return False

    def stop(self):
        self._stop_event.set()
        if self._render_thread and self._render_thread.is_alive():
            self._render_thread.join(timeout=1.5)
        self._render_thread = None
        self.video_source.release()
        with self._lock:
            self._latest_raw_frame = None
            self._cached_ppe = self.EMPTY_PPE
            self._cached_fire = self.EMPTY_FIRE
        self.publisher.set_standby(model_ready=True, cam_id=self.cam_id)

    def get_latest_raw_frame(self):
        with self._lock:
            return self._latest_raw_frame.copy() if self._latest_raw_frame is not None else None

    def update_inference_results(self, ppe_results: Dict[str, Any], fire_results: Dict[str, Any], frame_ref: Any):
        status = self.safety_engine.evaluate(ppe_results, fire_results)
        with self._lock:
            self._cached_ppe = ppe_results
            self._cached_fire = fire_results
            self._cached_status = status
        self.backend_client.process_frame_results(
            ppe_results, fire_results, status.level, status.detail, frame=frame_ref
        )

    def _start_render_thread(self):
        self._stop_event.clear()
        with self._lock:
            self._latest_raw_frame = None
            self._cached_ppe = self.EMPTY_PPE
            self._cached_fire = self.EMPTY_FIRE
            self._cached_status = self.safety_engine.evaluate(self.EMPTY_PPE, self.EMPTY_FIRE)
        self._render_thread = threading.Thread(target=self._render_loop, daemon=True)
        self._render_thread.start()

    def _render_loop(self):
        fps_counter = 0
        fps_start = time.time()
        display_fps = 25.0

        while not self._stop_event.is_set():
            loop_t0 = time.time()
            ret, frame = self.video_source.read()
            if not ret or frame is None:
                time.sleep(0.02)
                continue

            h, w = frame.shape[:2]
            if w > 640:
                scale = 640.0 / float(w)
                frame = cv2.resize(frame, (640, int(h * scale)), interpolation=cv2.INTER_AREA)

            with self._lock:
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
                model_ready=True,
                cam_id=self.cam_id,
            )

            dt = time.time() - loop_t0
            if dt < 0.038:
                time.sleep(0.038 - dt)


class HeadlessMLWebDaemon:
    """
    Multi-Camera YOLOv11 AI Vision Daemon on `http://127.0.0.1:8765`.
    Simultaneously runs:
      - `CAM_001` (Laptop Webcam 0)
      - `CAM_002` (Smartphone Wi-Fi Stream, e.g. `http://10.68.3.28:8080/video`)
    Both render at ~25 FPS with zero lag while a shared round-robin YOLOv11
    inference scheduler annotates both feeds in real time.
    """

    def __init__(self, auto_start_webcam: bool = True, default_phone_url: Optional[str] = "http://10.68.3.28:8080/video"):
        from app.detection.ppe_detector import PPEDetector, EMPTY_PPE_RESULT
        from app.detection.fire_detector import FireSmokeDetector, EMPTY_FIRE_RESULT

        self.EMPTY_PPE = EMPTY_PPE_RESULT
        self.EMPTY_FIRE = EMPTY_FIRE_RESULT
        self.ppe_detector = PPEDetector()
        self.fire_detector = FireSmokeDetector()
        self.ppe_ok = self.ppe_detector.load()
        self.fire_ok = self.fire_detector.load()

        self.publisher = WebStreamPublisher(
            host="0.0.0.0",
            port=8765,
            control_callback=self.handle_control,
        )
        self.publisher.start()

        self.slots: Dict[str, CameraPipelineSlot] = {
            "CAM_001": CameraPipelineSlot("CAM_001", self.publisher),
            "CAM_002": CameraPipelineSlot("CAM_002", self.publisher),
        }

        self._stop_infer = threading.Event()
        self._infer_thread = threading.Thread(target=self._shared_inference_loop, daemon=True)
        self._infer_thread.start()

        if auto_start_webcam:
            self.slots["CAM_001"].start_webcam(0)

        if default_phone_url:
            threading.Thread(
                target=lambda: self.slots["CAM_002"].start_stream(default_phone_url),
                daemon=True,
            ).start()

    def _shared_inference_loop(self):
        """
        Round-robin YOLOv11 PPE + Fire/Smoke inference across all active cameras
        (`CAM_001` and `CAM_002`) so PyTorch thread-safety is guaranteed and both
        cameras receive real-time bounding boxes simultaneously.
        """
        cycle = 0
        fire_caches: Dict[str, Dict[str, Any]] = {
            "CAM_001": self.EMPTY_FIRE,
            "CAM_002": self.EMPTY_FIRE,
        }
        while not self._stop_infer.is_set():
            did_work = False
            for cam_id in ("CAM_001", "CAM_002"):
                slot = self.slots[cam_id]
                if not slot.is_active:
                    continue
                frame = slot.get_latest_raw_frame()
                if frame is None:
                    continue

                did_work = True
                cycle += 1
                ppe_results = self.ppe_detector.detect(frame) if self.ppe_ok else self.EMPTY_PPE
                prev_fire = fire_caches[cam_id]
                if self.fire_ok and (cycle % 2 == 1 or prev_fire.get("fire_detected") or prev_fire.get("smoke_detected")):
                    prev_fire = self.fire_detector.detect(frame)
                    fire_caches[cam_id] = prev_fire

                slot.update_inference_results(ppe_results, prev_fire, frame)

            if not did_work:
                time.sleep(0.03)

    def handle_control(self, cmd: Dict[str, Any]) -> Dict[str, Any]:
        action = str(cmd.get("action", "")).lower()
        target_cam = str(cmd.get("cam", "")).upper()

        if action == "start_webcam":
            cam_id = target_cam if target_cam in self.slots else "CAM_001"
            ok = self.slots[cam_id].start_webcam(int(cmd.get("index", 0)))
            return {"ok": ok, "cam": cam_id, "message": f"{cam_id} Webcam started" if ok else "Webcam unavailable"}

        if action == "start_stream":
            cam_id = target_cam if target_cam in self.slots else "CAM_002"
            url = str(cmd.get("url", "http://10.68.3.28:8080/video")).strip()
            ok = self.slots[cam_id].start_stream(url)
            return {"ok": ok, "cam": cam_id, "message": f"{cam_id} Stream started: {url}" if ok else f"Stream unreachable: {url}"}

        if action == "start_dual":
            url = str(cmd.get("url", "http://10.68.3.28:8080/video")).strip()
            ok1 = self.slots["CAM_001"].start_webcam(int(cmd.get("index", 0)))
            ok2 = self.slots["CAM_002"].start_stream(url)
            return {
                "ok": ok1 or ok2,
                "cam1": ok1,
                "cam2": ok2,
                "message": f"CAM_001 Webcam={'ON' if ok1 else 'OFF'}, CAM_002 Phone={'ON' if ok2 else 'OFF'}",
            }

        if action == "stop":
            if target_cam in self.slots:
                self.slots[target_cam].stop()
                return {"ok": True, "cam": target_cam, "message": f"{target_cam} stopped"}
            for s in self.slots.values():
                s.stop()
            return {"ok": True, "message": "All AI cameras stopped"}

        return {"ok": False, "message": f"Unknown action: {action}"}

    def stop_capture(self):
        self._stop_infer.set()
        for s in self.slots.values():
            s.stop()


if __name__ == "__main__":
    print("[WebStreamer] Starting Multi-Camera YOLOv11 ML Web Daemon on http://127.0.0.1:8765 ...")
    daemon = HeadlessMLWebDaemon(
        auto_start_webcam=True,
        default_phone_url="http://10.68.3.28:8080/video",
    )
    try:
        while True:
            time.sleep(1.0)
    except KeyboardInterrupt:
        daemon.stop_capture()
        daemon.publisher.stop()
