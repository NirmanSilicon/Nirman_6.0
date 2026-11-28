# pipeline.py  - edge pipeline: live capture thread + tracker on main thread + AI workers + sender thread
import os
import sys

if sys.platform.startswith("linux"):
    os.environ.setdefault("QT_QPA_PLATFORM", "xcb")
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")

import argparse
import json
import queue
import threading
import time
import uuid
from collections import Counter
from datetime import datetime, timezone

import cv2
import requests

from ingest.gatekeeper import VideoGatekeeper
from ai_core.detector import BorderCoreDetector
from ai_triggered.recognizer import BorderTriggeredRecognizer
from ai_triggered.anpr import PlateReader

BACKEND = "http://localhost:8000"
EVENTS_URL = f"{BACKEND}/api/events"

PERSON_INTERVAL_S, PERSON_MAX_ATTEMPTS, ACCEPT_VOTES = 0.20, 6, 2
VEHICLE_INTERVAL_S, VEHICLE_MAX_ATTEMPTS, PLATE_VOTES, PLATE_STRONG_CONF = 0.8, 6, 2, 0.75
COOLDOWN_S = 30

RED, GREEN, AMBER, GREY = (0, 0, 255), (0, 255, 0), (0, 165, 255), (160, 160, 160)


class Worker(threading.Thread):
    """Runs a slow AI function off the main loop. Queue is tiny: if busy, new jobs are skipped."""

    def __init__(self, fn, maxsize=3):
        super().__init__(daemon=True)
        self.fn, self.q, self.out = fn, queue.Queue(maxsize), queue.Queue()
        self.start()

    def submit(self, tid, payload):
        try:
            self.q.put_nowait((tid, payload))
            return True
        except queue.Full:
            return False

    def run(self):
        while True:
            tid, payload = self.q.get()
            try:
                res = self.fn(payload)
            except Exception as e:
                print(f"[WORKER ERROR] {e}")
                res = None
            self.out.put((tid, res))


class TrackState:
    def __init__(self):
        self.attempts = 0
        self.pending = False
        self.last_submit = 0.0
        self.last_seen = 0.0
        self.done = False
        self.label, self.color = "ANALYSING...", GREY
        self.votes, self.info, self.recs = Counter(), {}, {}
        self.unknown_reads, self.last_unknown = 0, "UNREGISTERED_SUBJECT"
        self.vtype = None


def crop_box(frame, bbox):
    x1, y1, x2, y2 = bbox
    return frame[y1:y2, x1:x2]


def check_plate(plate):
    try:
        r = requests.get(f"{BACKEND}/api/vehicles/check/{plate}", timeout=2)
        r.raise_for_status()
        return r.json()
    except requests.RequestException as e:
        print(f"[RECORDS OFFLINE] {e}")
        return None


class Pipeline:
    def __init__(self, model="yolov8n.pt", imgsz=416, debug=False):
        self.debug = debug
        self.detector = BorderCoreDetector(model_path=model, imgsz=imgsz)
        self.recognizer = BorderTriggeredRecognizer()
        self.plates = PlateReader()
        self.states, self.cooldown = {}, {}

        self.face_worker = Worker(lambda crop: self.recognizer.analyze_target("person", crop))
        self.plate_worker = Worker(self._read_plate)
        self.send_q = queue.Queue(maxsize=50)
        threading.Thread(target=self._sender, daemon=True).start()

    # ---------- background jobs ----------
    def _read_plate(self, crop):
        plate, conf = self.plates.read(crop)
        return plate, conf, (check_plate(plate) if plate else None)

    def _sender(self):
        while True:
            payload, jpg = self.send_q.get()
            try:
                requests.post(EVENTS_URL, data={"payload": json.dumps(payload)},
                              files={"image": ("alert.jpg", jpg, "image/jpeg")}, timeout=5)
                print(f"[EVENT] {payload['event_type']} | {payload.get('frs_match') or payload.get('anpr_plate')} | {payload.get('details')}")
            except requests.RequestException as e:
                print(f"[BACKEND OFFLINE] {e}")

    def _cooling(self, key):
        now = time.time()
        if key in self.cooldown and now - self.cooldown[key] < COOLDOWN_S:
            return True
        self.cooldown[key] = now
        return False

    # ---------- result handling (main thread) ----------
    def _person_final(self, st, event_type, frs, watch, color, label, key=None):
        st.done, st.color, st.label = True, color, label
        if key and self._cooling(key):
            return None
        return {"event_type": event_type, "target_class": "person", "frs_match": frs,
                "watchlist_hit": watch, "anpr_plate": None, "details": None}

    def apply_person(self, st, info):
        st.attempts += 1
        if self.debug and info:
            print(f"[DEBUG face] {info['event_type']} | {info.get('scores')}")
        if info and info["readable"]:
            if info["watchlist_hit"]:
                return self._person_final(st, "WATCHLIST_HIT", info["frs_match"], True, RED,
                                          f"WATCHLIST: {info['frs_match']}", key=f"P:{info['name']}")
            if info["event_type"] == "ACCEPTED_PERSON":
                st.votes[info["name"]] += 1
                st.info[info["name"]] = info
                st.label, st.color = f"VERIFYING {info['name']}", AMBER
                if st.votes[info["name"]] >= ACCEPT_VOTES:
                    return self._person_final(st, "ACCEPTED_PERSON", info["frs_match"], False, GREEN,
                                              info["frs_match"], key=f"P:{info['name']}")
            else:
                st.unknown_reads += 1
                st.last_unknown = info["frs_match"]

        if st.attempts >= PERSON_MAX_ATTEMPTS:
            if st.votes:
                name, n = st.votes.most_common(1)[0]
                if n > st.unknown_reads:
                    i = st.info[name]
                    return self._person_final(st, "ACCEPTED_PERSON", i["frs_match"], False, GREEN,
                                              i["frs_match"], key=f"P:{name}")
            frs = st.last_unknown if st.unknown_reads else "UNREADABLE_FACE"
            return self._person_final(st, "UNKNOWN_PERSON", frs, False, AMBER, f"UNKNOWN PERSON | {frs}")
        return None

    def _vehicle_final(self, st, plate):
        st.done = True
        rec = st.recs.get(plate) if plate else None
        ev = {"target_class": "vehicle", "frs_match": None, "anpr_plate": plate,
              "watchlist_hit": False, "details": None}
        if not plate:
            ev.update(event_type="UNKNOWN_VEHICLE", details=f"{st.vtype}: plate unreadable")
            st.color, st.label = AMBER, "VEHICLE | PLATE UNREADABLE"
        elif rec is None:
            ev.update(event_type="UNKNOWN_VEHICLE", details="Records check unavailable")
            st.color, st.label = AMBER, f"{plate} | UNVERIFIED"
        elif rec["found"] and rec["flagged"]:
            ev.update(event_type="VEHICLE_FLAGGED", watchlist_hit=True,
                      details=f"{rec['status']} | {rec['owner']} | {rec['notes']}")
            st.color, st.label = RED, f"{plate} | {rec['status']}"
        elif rec["found"]:
            ev.update(event_type="VEHICLE_REGISTERED", details=f"{rec['status']} | {rec['owner']}")
            st.color, st.label = GREEN, f"{plate} | {rec['status']}"
        else:
            ev.update(event_type="UNKNOWN_VEHICLE", details="NOT IN RECORDS")
            st.color, st.label = AMBER, f"{plate} | NOT IN RECORDS"
        if rec and rec["found"] and not rec["exact"]:
            ev["details"] += f" (fuzzy match of {rec['matched_plate']})"
        if plate and self._cooling(f"V:{plate}"):
            return None
        return ev

    def apply_vehicle(self, st, res):
        st.attempts += 1
        plate, conf, rec = res if res else (None, 0.0, None)
        if self.debug:
            print(f"[DEBUG plate] {plate} conf={conf:.2f}")
        if plate:
            st.votes[plate] += 1
            st.recs[plate] = rec
            st.label, st.color = f"READING {plate}", AMBER
            if st.votes[plate] >= PLATE_VOTES or conf >= PLATE_STRONG_CONF:
                return self._vehicle_final(st, plate)
        if st.attempts >= VEHICLE_MAX_ATTEMPTS:
            return self._vehicle_final(st, st.votes.most_common(1)[0][0] if st.votes else None)
        return None

    def _drain(self, worker, apply):
        events = []
        while True:
            try:
                tid, res = worker.out.get_nowait()
            except queue.Empty:
                return events
            st = self.states.get(tid)
            if st is None:
                continue
            st.pending = False
            if not st.done:
                ev = apply(st, res)
                if ev:
                    events.append((ev, tid))

    def _maybe_submit(self, frame, t, now):
        st = self.states.setdefault(t["track_id"], TrackState())
        st.last_seen = now
        if not t["usable"] or st.done or st.pending:
            return
        is_person = t["target_class"] == "person"
        if now - st.last_submit < (PERSON_INTERVAL_S if is_person else VEHICLE_INTERVAL_S):
            return
        st.vtype = t["vehicle_type"]
        worker = self.face_worker if is_person else self.plate_worker
        if worker.submit(t["track_id"], crop_box(frame, t["bbox"]).copy()):
            st.pending, st.last_submit = True, now

    def emit(self, ev, tid, display, is_night):
        payload = {"event_id": f"evt_{uuid.uuid4().hex[:8]}",
                   "timestamp": datetime.now(timezone.utc).isoformat(),
                   "bop_id": "BOP_SECTOR_01", "camera_id": "MOBILE_PATROL_CAM_01",
                   "track_id": tid, "is_night_ir": is_night, **ev}
        _, buf = cv2.imencode(".jpg", display, [cv2.IMWRITE_JPEG_QUALITY, 75])
        try:
            self.send_q.put_nowait((payload, buf.tobytes()))
        except queue.Full:
            print("[SEND QUEUE FULL] event dropped")

    # ---------- main loop ----------
    def run(self, source=0, show_preview=True, detect_every=1):
        if isinstance(source, str) and source.isdigit():
            source = int(source)
        gk = VideoGatekeeper(source)
        tracks, fps, t_prev = [], 0.0, time.monotonic()

        for idx, (frame, is_night) in enumerate(gk.get_frames()):
            now = time.monotonic()
            inst = 1.0 / max(now - t_prev, 1e-6)
            fps, t_prev = (inst if fps == 0 else 0.9 * fps + 0.1 * inst), now

            if idx % detect_every == 0:
                tracks = self.detector.process_frame(frame)
                for t in tracks:
                    self._maybe_submit(frame, t, now)

            events = self._drain(self.face_worker, self.apply_person) + \
                     self._drain(self.plate_worker, self.apply_vehicle)

            display = frame.copy()
            for t in tracks:
                st = self.states.get(t["track_id"])
                if not st:
                    continue
                x1, y1, x2, y2 = t["bbox"]
                cv2.rectangle(display, (x1, y1), (x2, y2), st.color, 2)
                cv2.putText(display, st.label, (x1, max(20, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, st.color, 2)
            cv2.putText(display, f"FPS {fps:.1f}", (8, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)

            for ev, tid in events:  # snapshot shows the verdict
                self.emit(ev, tid, display, is_night)

            if idx % 300 == 0:
                self.states = {k: v for k, v in self.states.items() if now - v.last_seen < 60}

            if show_preview:
                try:
                    cv2.imshow("IBVAP Border Surveillance (Press Q to quit)", display)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break
                except cv2.error:
                    print("[PREVIEW DISABLED] OpenCV has no GUI support. Fix: pip uninstall -y "
                          "opencv-python-headless opencv-python && pip install opencv-python")
                    show_preview = False
        try:
            cv2.destroyAllWindows()
        except cv2.error:
            pass


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", default="0", help="0 / video file / rtsp:// / http:// phone stream")
    ap.add_argument("--model", default="yolov8n.pt", help="e.g. yolov8n_openvino_model (faster on Intel CPU)")
    ap.add_argument("--imgsz", type=int, default=416, help="YOLO input size: 320 fastest, 640 most accurate")
    ap.add_argument("--detect-every", type=int, default=1, help="run YOLO every N frames (2-3 = faster)")
    ap.add_argument("--no-preview", action="store_true")
    ap.add_argument("--debug", action="store_true", help="print face/plate scores for tuning")
    a = ap.parse_args()
    Pipeline(a.model, a.imgsz, a.debug).run(a.source, not a.no_preview, a.detect_every)
