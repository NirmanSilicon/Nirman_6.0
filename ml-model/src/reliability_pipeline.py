"""
SmartPPE — Warden's Eye: 6-Stage Python False-Detection Reduction Pipeline
(`ml-model/src/reliability_pipeline.py`)

Implements Task 4.3 of `IMPLEMENTATION_PLAN.md`:
- Stage 1 (Model Inference & Canonical Normalization):
    Wraps the trained YOLO PPE model (`ml-model/models/ppe_best.pt`) and companion
    person/fire models without modifying trained weights. Normalizes raw labels to
    canonical identifiers (`person`, `helmet`, `no_helmet`, `safety_vest`,
    `no_safety_vest`, `safety_boots`, `no_safety_boots`, `person_fall`, `fire`, `smoke`).
- Stage 2 (Person Tracking via ByteTrack / IoU Track Association):
    Assigns a stable `trackId` (e.g., `TRK-001`) to each detected worker across video frames.
- Stage 3 (Head-Region & Torso Visibility Check):
    Computes the head sub-region (top 25% of person box). If `y1 <= 5px` (clipped by
    top frame border) or head box width/height `< 28px` (too distant/occluded), sets
    `headRegionVisible = False` and forces `detectionState = "UNCERTAIN"` rather than
    falsely escalating `MISSING_HELMET`.
- Stage 4 (Dual Confidence Thresholds `T_low` & `T_high`):
    Predictions with confidence between `T_low` (default `0.40`) and `T_high` (default `0.68`)
    are classified as `"UNCERTAIN"` (`safetyStatus = "REVIEW_REQUIRED"`).
- Stage 5 (Multi-Frame Temporal Verification per `trackId`):
    Maintains a `collections.deque(maxlen=7)` per `trackId`:
    * Transitions to `"VIOLATION"` only when at least 5 out of 7 recent frames confirm
      the same missing PPE above `T_high` with `headRegionVisible == True` (or immediately
      on critical fire/smoke hazard).
    * Transitions to `"SAFE"` recovery when 4 consecutive frames confirm full PPE compliance.
- Stage 6 (Annotated Snapshot Evidence SHA-256 Hashing & Canonical Payload Dispatch):
    On confirmed `"VIOLATION"`, saves an annotated JPEG snapshot to `storage/evidence/`,
    computes its SHA-256 hex digest (`evidenceFileHash`), and formats the canonical
    `POST /api/detections` payload.
"""

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
import hashlib
from pathlib import Path
import time
from typing import Any, Deque, Dict, List, Optional, Tuple
import cv2


@dataclass
class TrackHistoryState:
    """Per-worker temporal verification state across frames (`collections.deque(maxlen=7)`)."""

    track_id: str
    last_box: Tuple[int, int, int, int]
    last_seen_ts: float
    window: Deque[Dict[str, Any]] = field(default_factory=lambda: deque(maxlen=7))
    confirmed_state: str = "UNCERTAIN"  # "SAFE" | "VIOLATION" | "UNCERTAIN"
    consecutive_safe: int = 0
    last_snapshot_ts: float = 0.0
    last_evidence_url: Optional[str] = None
    last_evidence_hash: Optional[str] = None


class FalseDetectionReductionPipeline:
    """
    6-Stage False-Detection Reduction Wrapper for SmartPPE — Warden's Eye.
    """

    def __init__(
        self,
        t_low: float = 0.40,
        t_high: float = 0.68,
        window_size: int = 7,
        violation_min_frames: int = 5,
        safe_recovery_frames: int = 4,
        min_head_size_px: int = 28,
        top_edge_clip_px: int = 5,
        evidence_dir: Optional[Path] = None,
        camera_code: str = "CAM_001",
        model_version: str = "yolo11n-ppe-reliability-v1",
    ):
        self.t_low = t_low
        self.t_high = t_high
        self.window_size = window_size
        self.violation_min_frames = violation_min_frames
        self.safe_recovery_frames = safe_recovery_frames
        self.min_head_size_px = min_head_size_px
        self.top_edge_clip_px = top_edge_clip_px
        self.camera_code = camera_code.upper()
        self.model_version = model_version

        project_root = Path(__file__).resolve().parent.parent.parent
        self.evidence_dir = evidence_dir or (project_root / "storage" / "evidence")
        self.evidence_dir.mkdir(parents=True, exist_ok=True)

        self._tracks: Dict[str, TrackHistoryState] = {}
        self._next_track_num: int = 1
        self._track_ttl_sec: float = 4.0
        self._snapshot_cooldown_sec: float = 10.0

    def reset(self):
        """Clear all active track states."""
        self._tracks.clear()
        self._next_track_num = 1

    # ── Stage 1: Canonical Label Normalization ─────────────────────────────

    @staticmethod
    def normalize_class_label(raw_label: str) -> str:
        """Normalize raw YOLO class names to canonical SmartPPE identifiers."""
        lbl = str(raw_label).lower().strip().replace("-", "_").replace(" ", "_")
        mapping = {
            "person": "person",
            "worker": "person",
            "helmet": "helmet",
            "hardhat": "helmet",
            "hard_hat": "helmet",
            "head": "no_helmet",
            "no_helmet": "no_helmet",
            "no_hardhat": "no_helmet",
            "vest": "safety_vest",
            "safety_vest": "safety_vest",
            "no_vest": "no_safety_vest",
            "no_safety_vest": "no_safety_vest",
            "boots": "safety_boots",
            "boot": "safety_boots",
            "safety_boots": "safety_boots",
            "no_boots": "no_safety_boots",
            "no_safety_boots": "no_safety_boots",
            "fall": "person_fall",
            "person_fall": "person_fall",
            "fire": "fire",
            "flame": "fire",
            "smoke": "smoke",
        }
        return mapping.get(lbl, lbl)

    # ── Stage 2: Person Tracking (ByteTrack ID or IoU Track Matching) ───────

    def _assign_track_id(
        self,
        person_box: Tuple[int, int, int, int],
        explicit_track_id: Optional[str] = None,
        now: Optional[float] = None,
    ) -> TrackHistoryState:
        """Assign or match a persistent `trackId` across consecutive frames."""
        ts = now if now is not None else time.time()

        # Prune stale tracks
        stale_ids = [
            tid for tid, st in self._tracks.items()
            if (ts - st.last_seen_ts) > self._track_ttl_sec
        ]
        for tid in stale_ids:
            del self._tracks[tid]

        if explicit_track_id:
            tid_key = str(explicit_track_id)
            if tid_key not in self._tracks:
                self._tracks[tid_key] = TrackHistoryState(
                    track_id=tid_key,
                    last_box=person_box,
                    last_seen_ts=ts,
                    window=deque(maxlen=self.window_size),
                )
            else:
                self._tracks[tid_key].last_box = person_box
                self._tracks[tid_key].last_seen_ts = ts
            return self._tracks[tid_key]

        # Match by highest IoU with active tracks
        best_iou = 0.0
        best_track: Optional[TrackHistoryState] = None
        for st in self._tracks.values():
            iou = self._calculate_iou(person_box, st.last_box)
            if iou > best_iou:
                best_iou = iou
                best_track = st

        if best_track is not None and best_iou >= 0.30:
            best_track.last_box = person_box
            best_track.last_seen_ts = ts
            return best_track

        new_tid = f"TRK-{self._next_track_num:03d}"
        self._next_track_num += 1
        track_state = TrackHistoryState(
            track_id=new_tid,
            last_box=person_box,
            last_seen_ts=ts,
            window=deque(maxlen=self.window_size),
        )
        self._tracks[new_tid] = track_state
        return track_state

    # ── Stage 3: Head-Region & Torso Visibility Check ─────────────────────

    def check_head_region_visibility(
        self,
        person_box: Tuple[int, int, int, int],
        frame_shape: Optional[Tuple[int, ...]] = None,
    ) -> Tuple[bool, Tuple[int, int, int, int], str]:
        """
        Compute the head sub-region (top 25% of person box) and check visibility.
        Returns `(head_region_visible, head_box, reason)`.
        """
        px1, py1, px2, py2 = person_box
        person_w = max(1, px2 - px1)
        person_h = max(1, py2 - py1)

        head_x1 = px1 + int(person_w * 0.15)
        head_y1 = max(0, py1)
        head_x2 = px2 - int(person_w * 0.15)
        head_y2 = py1 + int(person_h * 0.25)
        head_box = (head_x1, head_y1, head_x2, head_y2)

        head_w = max(1, head_x2 - head_x1)
        head_h = max(1, head_y2 - head_y1)

        # Check top-edge clipping
        if py1 <= self.top_edge_clip_px:
            return False, head_box, "HEAD_CLIPPED_TOP_EDGE"

        # Check if person is clipped near bottom edge (only legs/feet visible)
        if frame_shape is not None and len(frame_shape) >= 2:
            fh = frame_shape[0]
            if py1 >= int(fh * 0.78):
                return False, head_box, "HEAD_OUTSIDE_LOWER_FRAME"

        # Check minimum head resolution (28px height & width)
        if head_w < self.min_head_size_px or head_h < self.min_head_size_px:
            return False, head_box, "HEAD_TOO_SMALL_OR_DISTANT"

        return True, head_box, "VISIBLE"

    # ── Stage 4 & Stage 5: Dual Confidence & Multi-Frame Verification ─────

    def process_frame(
        self,
        frame: Any,
        ppe_results: Dict[str, Any],
        fire_results: Optional[Dict[str, Any]] = None,
        single_image_mode: bool = False,
        save_evidence: bool = True,
    ) -> Dict[str, Any]:
        """
        Run Stages 2–6 on `ppe_results` and `fire_results` for a frame.

        When `single_image_mode=True` (for static image benchmarks), evaluates
        Stages 1–4 without requiring 5 consecutive video frames, while still
        enforcing Stage 3 (`headRegionVisible`) and Stage 4 (`T_low` / `T_high`).
        """
        fire_res = fire_results or {}
        fire_detected = bool(fire_res.get("fire_detected", False))
        smoke_detected = bool(fire_res.get("smoke_detected", False))
        frame_shape = frame.shape if (frame is not None and hasattr(frame, "shape")) else (640, 640, 3)
        now = time.time()

        worker_evaluations: List[Dict[str, Any]] = []
        any_head_invisible = False
        all_confidences: List[float] = []
        confirmed_missing_ppe: List[str] = []
        primary_track_id: Optional[str] = None

        worker_ppe_list = ppe_results.get("worker_ppe", [])
        supports_vest = bool(ppe_results.get("supports_vest", False))
        supports_boots = bool(ppe_results.get("supports_boots", False))

        for worker in worker_ppe_list:
            p_box = tuple(worker.get("person_box", (0, 0, 0, 0)))
            p_conf = float(worker.get("person_conf", 0.85))
            all_confidences.append(p_conf)

            # Stage 2: Track ID assignment
            track_state = self._assign_track_id(
                p_box,
                explicit_track_id=worker.get("track_id"),
                now=now,
            )
            if primary_track_id is None:
                primary_track_id = track_state.track_id

            # Stage 3: Head-Region Visibility Check
            head_visible, head_box, vis_reason = self.check_head_region_visibility(
                p_box, frame_shape
            )
            if not head_visible:
                any_head_invisible = True

            # Determine per-worker missing items and confidence
            helmet_found = bool(worker.get("helmet_found", False))
            missing_helmet = bool(worker.get("missing_helmet", not helmet_found))
            helmet_det = worker.get("helmet_detection")
            no_helmet_det = worker.get("no_helmet_detection")

            item_conf = p_conf
            if helmet_det and "conf" in helmet_det:
                item_conf = float(helmet_det["conf"])
            elif no_helmet_det and "conf" in no_helmet_det:
                item_conf = float(no_helmet_det["conf"])
            all_confidences.append(item_conf)

            worker_missing: List[str] = []
            if missing_helmet:
                worker_missing.append("helmet")
            if supports_vest and not worker.get("vest_found", False):
                worker_missing.append("safety_vest")
            if supports_boots and worker.get("no_boots_inferred", False):
                worker_missing.append("safety_boots")

            # Stage 4: Dual Confidence Threshold Evaluation (`T_low` .. `T_high`)
            effective_conf = min(p_conf, item_conf)
            if not head_visible and "helmet" in worker_missing:
                frame_state = "UNCERTAIN"
            elif effective_conf < self.t_low:
                frame_state = "UNCERTAIN"
            elif len(worker_missing) > 0:
                if effective_conf >= self.t_high:
                    frame_state = "VIOLATION"
                else:
                    frame_state = "UNCERTAIN"
            else:
                if effective_conf >= self.t_low:
                    frame_state = "SAFE"
                else:
                    frame_state = "UNCERTAIN"

            # Stage 5: Multi-Frame Temporal Verification per `trackId`
            track_state.window.append({
                "state": frame_state,
                "missing": list(worker_missing),
                "head_visible": head_visible,
                "conf": effective_conf,
            })

            if single_image_mode:
                verified_state = frame_state
            else:
                violation_frames = sum(
                    1 for entry in track_state.window
                    if entry["state"] == "VIOLATION" and entry["head_visible"]
                )
                if frame_state == "SAFE":
                    track_state.consecutive_safe += 1
                else:
                    track_state.consecutive_safe = 0

                if violation_frames >= self.violation_min_frames:
                    track_state.confirmed_state = "VIOLATION"
                elif track_state.consecutive_safe >= self.safe_recovery_frames:
                    track_state.confirmed_state = "SAFE"
                elif len(track_state.window) < self.violation_min_frames and frame_state == "VIOLATION":
                    # Still warming up temporal buffer -> hold as UNCERTAIN to prevent single-frame flicker
                    track_state.confirmed_state = "UNCERTAIN"
                elif frame_state == "SAFE" and track_state.confirmed_state != "VIOLATION":
                    track_state.confirmed_state = "SAFE"

                verified_state = track_state.confirmed_state

            if verified_state == "VIOLATION":
                for m_item in worker_missing:
                    if m_item not in confirmed_missing_ppe:
                        confirmed_missing_ppe.append(m_item)

            worker_evaluations.append({
                "trackId": track_state.track_id,
                "personBox": p_box,
                "headBox": head_box,
                "headRegionVisible": head_visible,
                "visibilityReason": vis_reason,
                "frameState": frame_state,
                "verifiedState": verified_state,
                "missingPPE": worker_missing,
                "confidence": round(effective_conf, 4),
            })

        # Also check standalone head_detections when no full person box was paired
        if not worker_ppe_list:
            for h_det in ppe_results.get("head_detections", []):
                h_conf = float(h_det.get("conf", 0.0))
                all_confidences.append(h_conf)
                if h_det.get("label") == "no_helmet":
                    if h_conf >= self.t_high:
                        if "helmet" not in confirmed_missing_ppe:
                            confirmed_missing_ppe.append("helmet")

        # Overall frame decision
        overall_conf = round(max(0.01, min(1.0, min(all_confidences) if all_confidences else 0.85)), 4)
        head_region_visible = not any_head_invisible if worker_evaluations else True

        if fire_detected or smoke_detected:
            overall_state = "VIOLATION"
            safety_status = "UNSAFE"
        elif any(w["verifiedState"] == "VIOLATION" for w in worker_evaluations) or len(confirmed_missing_ppe) > 0:
            overall_state = "VIOLATION"
            safety_status = "UNSAFE"
        elif any(w["verifiedState"] == "UNCERTAIN" or w["frameState"] == "UNCERTAIN" for w in worker_evaluations):
            overall_state = "UNCERTAIN"
            safety_status = "REVIEW_REQUIRED"
        else:
            overall_state = "SAFE"
            safety_status = "SAFE"

        # Stage 6: Snapshot Evidence Capture & SHA-256 Digest
        evidence_url: Optional[str] = None
        evidence_hash: Optional[str] = None
        if overall_state == "VIOLATION" and save_evidence and frame is not None:
            primary_track = self._tracks.get(primary_track_id) if primary_track_id else None
            can_save = (
                primary_track is None
                or (now - primary_track.last_snapshot_ts) >= self._snapshot_cooldown_sec
            )
            if can_save:
                evidence_url, evidence_hash = self.save_violation_snapshot(frame)
                if primary_track is not None:
                    primary_track.last_snapshot_ts = now
                    primary_track.last_evidence_url = evidence_url
                    primary_track.last_evidence_hash = evidence_hash
            elif primary_track is not None:
                evidence_url = primary_track.last_evidence_url
                evidence_hash = primary_track.last_evidence_hash

        return {
            "trackId": primary_track_id,
            "detectionState": overall_state,
            "safetyStatus": safety_status,
            "headRegionVisible": head_region_visible,
            "missingPPE": confirmed_missing_ppe,
            "overallConfidence": overall_conf,
            "evidenceUrl": evidence_url,
            "evidenceFileHash": evidence_hash,
            "workerEvaluations": worker_evaluations,
        }

    # ── Stage 6: Evidence File Saving & SHA-256 Hashing ──────────────────

    def save_violation_snapshot(self, frame: Any) -> Tuple[Optional[str], Optional[str]]:
        """
        Save an annotated JPEG snapshot to `storage/evidence/YYYY-MM-DD/` and compute
        its SHA-256 hex digest (`evidenceFileHash`).
        """
        try:
            date_folder = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            target_dir = self.evidence_dir / date_folder
            target_dir.mkdir(parents=True, exist_ok=True)

            epoch_ms = int(time.time() * 1000)
            filename = f"{self.camera_code.lower()}_{epoch_ms}.jpg"
            file_path = target_dir / filename

            ok, encoded = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
            if not ok:
                return None, None

            img_bytes = encoded.tobytes()
            sha256_hash = hashlib.sha256(img_bytes).hexdigest()
            file_path.write_bytes(img_bytes)

            rel_url = f"evidence/{date_folder}/{filename}"
            return rel_url, sha256_hash
        except Exception:
            return None, None

    @staticmethod
    def _calculate_iou(
        box1: Tuple[int, int, int, int],
        box2: Tuple[int, int, int, int],
    ) -> float:
        x1, y1, x2, y2 = box1
        a1, b1, a2, b2 = box2

        ix1 = max(x1, a1)
        iy1 = max(y1, b1)
        ix2 = min(x2, a2)
        iy2 = min(y2, b2)

        iw = max(0, ix2 - ix1)
        ih = max(0, iy2 - iy1)
        inter = iw * ih

        area1 = max(1, (x2 - x1) * (y2 - y1))
        area2 = max(1, (a2 - a1) * (b2 - b1))
        union = area1 + area2 - inter
        return inter / union if union > 0 else 0.0
