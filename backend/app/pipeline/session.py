"""Stream session: owns the source, the two threads, and the incident record.

One session runs per belt. Each physical belt (see ``belts`` in store/db.py)
has its own source, detector and incident engine, so several belts can be
watched at once and each belt's QR page reads only its own pipeline. Starting a
new session on a belt replaces that belt's old one, so a user switching one
belt from a test video to a live camera never ends up with two pipelines
fighting over the same slots.
"""
from __future__ import annotations

import logging
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import cv2

from ..bus import bus
from ..config import settings
from ..sources import FrameSource, SourceError, from_uri
from ..store import storage
from ..store.db import get_db
from .annotate import draw
from .capture import CaptureThread, LatestFrame
from .detector import Detector, build_detector
from .events import Incident, IncidentEngine
from .types import CLASS_LABELS, Detection, FrameResult

log = logging.getLogger(__name__)

# The belt a session belongs to when the caller names none -- the original
# single-belt dashboard, which still starts streams without a belt id.
DEFAULT_BELT = "BELT-01"

# One worker: uploads are rare and ordering them behind each other costs
# nothing, while an unbounded pool could pile up threads if Supabase is slow.
_uploads = ThreadPoolExecutor(max_workers=1, thread_name_prefix="snapshot")


def _upload_snapshot(key: str, jpeg: bytes) -> None:
    try:
        storage.upload(key, jpeg)
    except Exception:  # noqa: BLE001 - evidence is worth less than the stream
        log.exception("Failed to upload snapshot %s", key)


class StreamSession:
    """A running pipeline over one source."""

    def __init__(self, uri: str, belt_id: str = DEFAULT_BELT) -> None:
        self.uri = uri
        self.belt_id = belt_id
        # Set by the manager: the belt the main dashboard follows.
        self.primary = False
        self.raw = LatestFrame()
        self.annotated = LatestFrame()
        self.started_at = time.time()
        self.stopped_at: float | None = None
        self.error: str | None = None

        self._source: FrameSource | None = None
        self._capture: CaptureThread | None = None
        self._worker = None
        self._detector: Detector | None = None
        self._db_ids: dict[int, int] = {}   # in-memory incident id -> DB row id
        self._session_id: int | None = None
        self._lock = threading.Lock()

        self.incidents = IncidentEngine(
            confirm_frames=settings.confirm_frames,
            confidence_threshold=settings.incident_confidence_threshold,
            on_open=self._on_incident_open,
            on_update=self._on_incident_update,
            on_close=self._on_incident_close,
        )

    # -- lifecycle -----------------------------------------------------------

    def start(self) -> None:
        from .worker import InferenceWorker  # local import avoids a cycle

        source = from_uri(self.uri)
        info = source.open()          # raises SourceError; caller maps to HTTP 400
        self._source = source

        self._detector = build_detector()
        self._session_id = get_db().start_session(
            source_uri=info.uri, source_kind=info.kind, label=info.label,
            detector=self._detector.name, belt_id=self.belt_id,
        )

        self._capture = CaptureThread(source, self.raw, on_end=self._on_source_end)
        # No burned-in status block: the dashboard's telemetry strip already
        # carries source, frame rate and skip count, and printing them into the
        # frame as well both duplicates the information and covers the belt.
        self._worker = InferenceWorker(
            raw=self.raw,
            annotated=self.annotated,
            detector=self._detector,
            incidents=self.incidents,
            on_result=self._on_result,
        )
        self._capture.start()
        self._worker.start()

        log.info("Session started: %s (%s)", info.label, self._detector.description)
        bus.publish("stream.status", self.status())

    def stop(self) -> None:
        with self._lock:
            if self.stopped_at is not None:
                return
            self.stopped_at = time.time()

        if self._worker is not None:
            self._worker.stop()
        if self._capture is not None:
            self._capture.stop()
        # Join briefly: threads are daemons, so a stuck driver read cannot
        # prevent shutdown, but a clean join avoids a torn final frame.
        for t in (self._worker, self._capture):
            if t is not None and t.is_alive():
                t.join(timeout=2.0)
        if self._source is not None:
            self._source.close()

        self.incidents.reset()

        if self._session_id is not None:
            get_db().end_session(
                self._session_id,
                frames_read=self._capture.frames_read if self._capture else 0,
                frames_processed=self._worker.frames_processed if self._worker else 0,
                frames_skipped=self._worker.frames_skipped if self._worker else 0,
            )

        log.info("Session stopped: %s", self.uri)
        bus.publish("stream.status", self.status())

    def latest_detections(self, max_age: float = 1.0) -> list[Detection]:
        """The detector's most recent boxes, if they are fresh enough to draw.

        The viewer's video is composed from the *camera* frames plus these
        boxes, rather than from the detector's own output. On a slow server the
        detector may manage 2-3 fps; tying the video to it made the picture
        itself crawl. Now the video runs at the camera's rate and only the
        boxes update at the detector's.
        """
        worker = self._worker
        result = worker.last_result if worker is not None else None
        if result is None or time.time() - result.timestamp > max_age:
            return []
        return list(result.detections)

    @property
    def session_id(self) -> int | None:
        """The database row for this run, or None before ``start()`` completes."""
        return self._session_id

    @property
    def running(self) -> bool:
        return (self.stopped_at is None
                and self._capture is not None
                and self._capture.is_alive())

    # -- status --------------------------------------------------------------

    def status(self) -> dict:
        info = self._source.info if self._source is not None else None
        capture, worker = self._capture, self._worker
        return {
            "belt_id": self.belt_id,
            "primary": self.primary,
            "running": self.running,
            "uri": self.uri,
            "label": info.label if info else self.uri,
            "kind": info.kind if info else "unknown",
            "is_live": info.is_live if info else False,
            "source_fps": round(info.fps, 2) if info else 0.0,
            "width": info.width if info else 0,
            "height": info.height if info else 0,
            "detector": self._detector.description if self._detector else "none",
            "started_at": self.started_at,
            "stopped_at": self.stopped_at,
            "uptime": round((self.stopped_at or time.time()) - self.started_at, 1),
            "capture_fps": round(capture.fps, 2) if capture else 0.0,
            "inference_fps": round(worker.fps, 2) if worker else 0.0,
            "inference_ms": round(worker.inference_ms, 1) if worker else 0.0,
            "frames_read": capture.frames_read if capture else 0,
            "frames_processed": worker.frames_processed if worker else 0,
            "frames_skipped": worker.frames_skipped if worker else 0,
            "clahe": settings.enable_clahe,
            "open_incidents": len(self.incidents.open_incidents),
            "counts": dict(self.incidents.counts),
            "error": self.error,
        }

    def status_lines(self) -> list[str]:
        """Compact overlay text, for frames leaving the dashboard.

        Used when a still is exported or the stream is shown on a wall display
        with no surrounding HUD to give it context.
        """
        capture, worker = self._capture, self._worker
        label = self._source.info.label if self._source else self.uri
        if not (capture and worker):
            return [f"SRC {label}"]
        return [
            f"SRC {label}",
            f"CAP {capture.fps:5.1f} fps   INF {worker.fps:5.1f} fps   "
            f"SKIP {worker.frames_skipped}",
        ]

    # -- callbacks -----------------------------------------------------------

    def _on_result(self, result: FrameResult) -> None:
        bus.publish("frame", {
            "belt_id": self.belt_id,
            "frame_id": result.frame_id,
            "timestamp": result.timestamp,
            "width": result.width,
            "height": result.height,
            "detections": [d.to_dict(result.width, result.height)
                           for d in result.detections],
            "inference_ms": round(result.inference_ms, 1),
            "stats": self.status(),
        })

    def _on_incident_open(self, incident: Incident, det: Detection) -> None:
        snapshot = self._save_snapshot(incident, det)
        incident.snapshot = snapshot
        try:
            row_id = get_db().insert_incident(self._session_id, incident, snapshot,
                                              belt_id=self.belt_id)
            self._db_ids[incident.id] = row_id
            # Set before publishing: the payload carries this id, and the client
            # uses it to request the snapshot thumbnail.
            incident.db_id = row_id
        except Exception:  # noqa: BLE001 - never let a DB error kill the pipeline
            log.exception("Failed to persist incident %d", incident.id)
        bus.publish("incident.opened", self._incident_payload(incident))

    def _on_incident_update(self, incident: Incident) -> None:
        row_id = self._db_ids.get(incident.id)
        if row_id is not None:
            try:
                get_db().update_incident(row_id, incident.severity.value,
                                         incident.label, incident.cls)
            except Exception:  # noqa: BLE001
                log.exception("Failed to update incident %d", incident.id)
        bus.publish("incident.updated", self._incident_payload(incident))

    def _on_incident_close(self, incident: Incident) -> None:
        row_id = self._db_ids.pop(incident.id, None)
        if row_id is not None:
            try:
                get_db().close_incident(row_id, incident.closed_at or time.time(),
                                        incident.duration, incident.last_frame)
            except Exception:  # noqa: BLE001
                log.exception("Failed to close incident %d", incident.id)
        bus.publish("incident.closed", self._incident_payload(incident))

    def _incident_payload(self, incident: Incident) -> dict:
        return {**incident.to_dict(), "belt_id": self.belt_id}

    def _on_source_end(self, error: str | None) -> None:
        """Called from the capture thread when the source stops producing."""
        self.error = error
        bus.publish("stream.status", {**self.status(), "running": False,
                                      "ended": True, "error": error})

    def _save_snapshot(self, incident: Incident, det: Detection) -> str | None:
        """Persist a cropped-in still of the defect for the incident record.

        The object key is derived locally and returned at once, so the incident
        row is written complete; the upload itself runs on ``_uploads`` because
        a round trip to Supabase must not stall inference.
        """
        frame = self.raw.get()
        if frame is None:
            return None
        try:
            image = draw(frame.image, [det])
            ok, buf = cv2.imencode(".jpg", image,
                                   [int(cv2.IMWRITE_JPEG_QUALITY), 85])
            if not ok:
                return None
            key = (f"incident_{self.belt_id}_{int(incident.opened_at)}_"
                   f"{incident.id}_{incident.cls}.jpg")
            _uploads.submit(_upload_snapshot, key, buf.tobytes())
            return key
        except Exception:  # noqa: BLE001
            log.exception("Failed to encode snapshot for incident %d", incident.id)
            return None


class SessionManager:
    """Holds one session per belt and serialises start/stop.

    ``session`` and ``status()`` keep their single-stream meaning for the main
    dashboard: they refer to the *primary* belt, the one most recently started.
    Per-belt access goes through ``get()`` and ``sessions()``.
    """

    def __init__(self) -> None:
        self._sessions: dict[str, StreamSession] = {}
        self._primary: str | None = None
        self._lock = threading.Lock()

    @property
    def session(self) -> StreamSession | None:
        if self._primary is None:
            return None
        return self._sessions.get(self._primary)

    def get(self, belt_id: str) -> StreamSession | None:
        return self._sessions.get(belt_id)

    def sessions(self) -> list[StreamSession]:
        return list(self._sessions.values())

    def start(self, uri: str, belt_id: str | None = None) -> StreamSession:
        """Switch a belt to a new source, keeping its current one if the new one fails.

        The new session is opened *before* the old one is torn down. A mistyped
        RTSP URL or an unplugged camera then leaves live monitoring running,
        rather than taking down a working feed to replace it with nothing.
        Other belts are never touched.
        """
        belt_id = belt_id or DEFAULT_BELT
        with self._lock:
            session = StreamSession(uri, belt_id=belt_id)
            # Set before start() so the status it publishes already claims the
            # dashboard; a failed start never gets swapped in, so no harm done.
            session.primary = True
            try:
                session.start()
            except Exception:
                # Nothing was swapped in, so the existing session is untouched.
                session.stop()
                raise

            previous = self._sessions.get(belt_id)
            old_primary = self.session
            self._sessions[belt_id] = session
            self._primary = belt_id
            # Demote before stopping, so the replaced session's final "stopped"
            # status is not mistaken by the dashboard for the new one's.
            for old in (old_primary, previous):
                if old is not None:
                    old.primary = False
            if previous is not None:
                previous.stop()
            return session

    def stop(self, belt_id: str | None = None) -> None:
        """Stop one belt; with no belt given, the primary one."""
        with self._lock:
            belt_id = belt_id or self._primary
            if belt_id is None:
                return
            session = self._sessions.pop(belt_id, None)
            if session is not None:
                session.stop()
            if self._primary == belt_id:
                # Hand the dashboard to another running belt, if there is one.
                self._primary = next(iter(self._sessions), None)
                if self._primary is not None:
                    promoted = self._sessions[self._primary]
                    promoted.primary = True
                    bus.publish("stream.status", promoted.status())

    def stop_all(self) -> None:
        with self._lock:
            sessions, self._sessions, self._primary = (
                list(self._sessions.values()), {}, None)
        for session in sessions:
            session.stop()

    def status(self) -> dict:
        session = self.session
        if session is None:
            return {"running": False, "uri": None, "label": None,
                    "belt_id": None, "primary": True,
                    "detector": None, "counts": {}, "frames_skipped": 0,
                    "capture_fps": 0.0, "inference_fps": 0.0}
        return session.status()


manager = SessionManager()
