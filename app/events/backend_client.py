"""
Non-blocking Backend API Client for SmartPPE — Warden's Eye.

Connects the Python ML detection pipeline (`app/`) to the Node.js + Local MongoDB
Backend (`POST /api/detections` and `POST /api/cameras/heartbeat`) using
standard library `urllib.request` on a background daemon queue thread so video
inference FPS is never blocked by network I/O.
"""

import json
import os
import queue
import sys
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.utils.logger import get_logger

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT / "ml-model" / "src") not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT / "ml-model" / "src"))

try:
    from reliability_pipeline import FalseDetectionReductionPipeline
except Exception:
    FalseDetectionReductionPipeline = None

log = get_logger("events.backend")


def _load_env_file(env_path: Path) -> Dict[str, str]:
    """Read key=value pairs from a .env file without external dependencies."""
    values: Dict[str, str] = {}
    if not env_path.exists():
        return values
    try:
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            values[key.strip()] = val.strip().strip('"').strip("'")
    except Exception as exc:
        log.debug("Could not parse %s: %s", env_path, exc)
    return values


class BackendAPIClient:
    """
    Asynchronous HTTP bridge from the Python ML application to the Node.js Backend.

    - Authenticates with `X-ML-Service-Key` loaded from `backend/.env` or environment.
    - Sends real ML detections (`isMockDetection: False`) to `POST /api/detections`
      on safety state changes or periodic compliance heartbeats.
    - Sends camera online/offline heartbeats to `POST /api/cameras/heartbeat`.
    """

    def __init__(self, camera_code: Optional[str] = None):
        project_root = Path(__file__).resolve().parent.parent.parent
        env_vars = {
            **_load_env_file(project_root / ".env"),
            **_load_env_file(project_root / "backend" / ".env"),
            **os.environ,
        }

        port = env_vars.get("PORT", "5000")
        self.api_base_url = env_vars.get(
            "API_BASE_URL", f"http://127.0.0.1:{port}/api"
        ).rstrip("/")
        self.ml_service_key = env_vars.get("ML_SERVICE_API_KEY", "")
        self.camera_code = (
            camera_code or env_vars.get("CAMERA_CODE", "CAM_001")
        ).upper()
        self.model_version = "yolo11n-ppe-fire-v1"

        self.reliability_pipeline = (
            FalseDetectionReductionPipeline(
                camera_code=self.camera_code,
                model_version=self.model_version,
            )
            if FalseDetectionReductionPipeline is not None
            else None
        )

        self._queue: "queue.Queue[Dict[str, Any]]" = queue.Queue(maxsize=100)
        self._last_sent_state: Optional[str] = None
        self._last_sent_time: float = 0.0
        self._last_heartbeat_time: float = 0.0
        self._connected: bool = False

        # Minimum interval (seconds) between identical state transmissions
        self._min_repeat_interval_sec = 10.0
        self._heartbeat_interval_sec = 25.0

        self._worker_thread = threading.Thread(
            target=self._worker_loop, daemon=True
        )
        self._worker_thread.start()

    @property
    def is_configured(self) -> bool:
        return bool(
            self.ml_service_key
            and self.ml_service_key
            != "REPLACE_WITH_LOCAL_ML_SERVICE_API_KEY_PLACEHOLDER"
        )

    @property
    def is_connected(self) -> bool:
        return self._connected

    def send_camera_heartbeat(
        self,
        status: str = "ONLINE",
        stream_url: Optional[str] = None,
        force: bool = False,
    ):
        """Queue a camera heartbeat to `POST /api/cameras/heartbeat`."""
        if not self.is_configured:
            return
        now = time.time()
        if not force and (now - self._last_heartbeat_time) < self._heartbeat_interval_sec:
            return
        self._last_heartbeat_time = now

        payload: Dict[str, Any] = {
            "cameraCode": self.camera_code,
            "status": status,
        }
        if stream_url:
            payload["streamUrl"] = stream_url

        self._enqueue("POST", f"{self.api_base_url}/cameras/heartbeat", payload)

    def process_frame_results(
        self,
        ppe_results: Dict[str, Any],
        fire_results: Dict[str, Any],
        safety_level: str,
        safety_detail: str,
        frame: Any = None,
    ):
        """
        Convert raw `PPEDetector` and `FireSmokeDetector` outputs into the canonical
        `POST /api/detections` contract (through the 6-stage false-detection reduction
        pipeline) and enqueue when a state transition occurs or the periodic emission
        window elapses.
        """
        if not self.is_configured:
            return

        now = time.time()
        # Periodic camera heartbeat while actively processing frames
        self.send_camera_heartbeat(status="ONLINE", force=False)

        fire_detected = bool(fire_results.get("fire_detected", False))
        smoke_detected = bool(fire_results.get("smoke_detected", False))
        total_persons = int(ppe_results.get("total_persons", 0))

        # Ignore completely empty frames with no person and no fire/smoke
        if total_persons == 0 and not fire_detected and not smoke_detected:
            return

        payload = self.build_canonical_payload(
            ppe_results, fire_results, frame=None, single_image_mode=False
        )

        det_state = payload["detectionState"]
        head_vis = int(bool(payload["headRegionVisible"]))
        missing_sig = ",".join(sorted(payload["missingPPE"]))
        state_signature = f"{det_state}:{safety_level}:F{int(fire_detected)}:S{int(smoke_detected)}:HV{head_vis}:M[{missing_sig}]"

        state_changed = state_signature != self._last_sent_state
        time_elapsed = (now - self._last_sent_time) >= self._min_repeat_interval_sec

        if not state_changed and not time_elapsed:
            return

        self._last_sent_state = state_signature
        self._last_sent_time = now

        self._enqueue("POST", f"{self.api_base_url}/detections", payload)

    def build_canonical_payload(
        self,
        ppe_results: Dict[str, Any],
        fire_results: Dict[str, Any],
        frame: Any = None,
        single_image_mode: bool = True,
    ) -> Dict[str, Any]:
        """
        Build a canonical `POST /api/detections` JSON payload from `ppe_results` and `fire_results`,
        enriched with 6-stage reliability verification (`trackId`, `headRegionVisible`,
        `detectionState`, `evidenceUrl`, and SHA-256 `evidenceFileHash`).
        """
        detections_list: List[Dict[str, Any]] = []
        confidences: List[float] = []

        # 1. Persons
        for p in ppe_results.get("persons", []):
            conf = round(float(p.get("conf", 0.85)), 4)
            confidences.append(conf)
            detections_list.append({
                "classLabel": "person",
                "confidence": conf,
                "bbox": list(p.get("box", (0, 0, 0, 0))),
            })

        # 2. Head detections (helmet / no_helmet)
        for h in ppe_results.get("head_detections", []):
            conf = round(float(h.get("conf", 0.80)), 4)
            confidences.append(conf)
            detections_list.append({
                "classLabel": str(h.get("label", "helmet")).lower(),
                "confidence": conf,
                "bbox": list(h.get("box", (0, 0, 0, 0))),
            })

        # 3. Vests (mapped to canonical `safety_vest`)
        for v in ppe_results.get("vests", []):
            conf = round(float(v.get("conf", 0.80)), 4)
            confidences.append(conf)
            detections_list.append({
                "classLabel": "safety_vest",
                "confidence": conf,
                "bbox": list(v.get("box", (0, 0, 0, 0))),
            })

        # 4. Boots (mapped to canonical `safety_boots`)
        for b in ppe_results.get("boots", []):
            conf = round(float(b.get("conf", 0.80)), 4)
            confidences.append(conf)
            detections_list.append({
                "classLabel": "safety_boots",
                "confidence": conf,
                "bbox": list(b.get("box", (0, 0, 0, 0))),
            })

        # 5. Vision Fire / Smoke detections
        for f in fire_results.get("detections", []):
            conf = round(float(f.get("conf", 0.85)), 4)
            confidences.append(conf)
            detections_list.append({
                "classLabel": str(f.get("label", "fire")).lower(),
                "confidence": conf,
                "bbox": list(f.get("box", (0, 0, 0, 0))),
            })

        # Evaluate 6-Stage False-Detection Reduction Pipeline if available
        track_id: Optional[str] = None
        head_region_visible: bool = True
        evidence_url: Optional[str] = None
        evidence_hash: Optional[str] = None

        if self.reliability_pipeline is not None:
            rel_out = self.reliability_pipeline.process_frame(
                frame=frame,
                ppe_results=ppe_results,
                fire_results=fire_results,
                single_image_mode=single_image_mode,
                save_evidence=(frame is not None),
            )
            track_id = rel_out["trackId"]
            head_region_visible = rel_out["headRegionVisible"]
            detection_state = rel_out["detectionState"]
            safety_status = rel_out["safetyStatus"]
            missing_ppe = rel_out["missingPPE"]
            overall_conf = rel_out["overallConfidence"]
            evidence_url = rel_out["evidenceUrl"]
            evidence_hash = rel_out["evidenceFileHash"]
        else:
            missing_ppe = []
            if int(ppe_results.get("no_helmet_count", 0)) > 0:
                missing_ppe.append("helmet")
            if int(ppe_results.get("no_vest_count", 0)) > 0:
                missing_ppe.append("safety_vest")
            if int(ppe_results.get("no_boots_count", 0)) > 0:
                missing_ppe.append("safety_boots")

            fire_detected = bool(fire_results.get("fire_detected", False))
            smoke_detected = bool(fire_results.get("smoke_detected", False))
            overall_conf = round(min(confidences) if confidences else 0.85, 4)

            if fire_detected or smoke_detected or len(missing_ppe) > 0:
                if not fire_detected and not smoke_detected and overall_conf < 0.40:
                    detection_state = "UNCERTAIN"
                    safety_status = "REVIEW_REQUIRED"
                else:
                    detection_state = "VIOLATION"
                    safety_status = "UNSAFE"
            else:
                detection_state = "SAFE"
                safety_status = "SAFE"

        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        epoch_ms = int(time.time() * 1000)

        return {
            "cameraCode": self.camera_code,
            "occurredAt": now_iso,
            "modelVersion": self.model_version,
            "idempotencyKey": f"{self.camera_code}-{epoch_ms}",
            "isMockDetection": False,
            "verifyWorkerByRfid": True,
            "trackId": track_id,
            "detections": detections_list,
            "missingPPE": missing_ppe,
            "detectionState": detection_state,
            "safetyStatus": safety_status,
            "overallConfidence": max(0.01, min(1.0, overall_conf)),
            "headRegionVisible": head_region_visible,
            "evidenceUrl": evidence_url,
            "evidenceFileHash": evidence_hash,
        }

    def _enqueue(self, method: str, url: str, payload: Dict[str, Any]):
        try:
            self._queue.put_nowait({"method": method, "url": url, "payload": payload})
        except queue.Full:
            log.warning("Backend API queue full; dropping oldest event.")

    def _worker_loop(self):
        while True:
            item = self._queue.get()
            try:
                body_bytes = json.dumps(item["payload"]).encode("utf-8")
                req = urllib.request.Request(
                    item["url"],
                    data=body_bytes,
                    method=item["method"],
                    headers={
                        "Content-Type": "application/json",
                        "X-ML-Service-Key": self.ml_service_key,
                    },
                )
                with urllib.request.urlopen(req, timeout=3.0) as resp:
                    self._connected = 200 <= resp.status < 300
            except urllib.error.HTTPError as http_err:
                self._connected = False
                log.debug("Backend API HTTP %d on %s", http_err.code, item["url"])
            except Exception as exc:
                self._connected = False
                log.debug("Backend API unreachable (%s): %s", item["url"], exc)
            finally:
                self._queue.task_done()
