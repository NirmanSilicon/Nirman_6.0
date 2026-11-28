# ingest/gatekeeper.py
import threading
import time
import cv2
import numpy as np


class VideoGatekeeper:
    """Live sources (webcam / RTSP / phone HTTP) are read in a background thread that
    keeps ONLY the newest frame -> no growing lag when the AI is slower than the camera.
    Video files are read normally (every frame)."""

    def __init__(self, source=0, max_width=1280):
        self.source = source
        self.max_width = max_width
        self.is_live = isinstance(source, int) or str(source).startswith(("http://", "https://", "rtsp://"))
        self.clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        self.cap = self._open()
        if not self.cap.isOpened():
            raise RuntimeError(f"Failed to open camera/video stream: {self.source}")

        self._lock = threading.Lock()
        self._latest = None
        self._stamp = 0
        self._stop = False
        if self.is_live:
            threading.Thread(target=self._reader, daemon=True).start()

    def _open(self):
        cap = cv2.VideoCapture(self.source)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        return cap

    def _reader(self):
        while not self._stop:
            ok, frame = self.cap.read()
            if not ok:
                if self._stop:
                    break
                print("[STREAM] Frame dropped, reconnecting...")
                self.cap.release()
                time.sleep(1.0)
                self.cap = self._open()
                continue
            with self._lock:
                self._latest, self._stamp = frame, self._stamp + 1

    def _prep(self, frame):
        h, w = frame.shape[:2]
        if w > self.max_width:  # keep detail for faces/plates, but cap the cost
            frame = cv2.resize(frame, (self.max_width, int(h * self.max_width / w)), interpolation=cv2.INTER_AREA)
        thumb = cv2.cvtColor(cv2.resize(frame, (64, 48), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)
        is_night_ir = bool(np.mean(thumb) < 65)
        if is_night_ir:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            frame = cv2.cvtColor(self.clahe.apply(gray), cv2.COLOR_GRAY2BGR)
        return frame, is_night_ir

    def get_frames(self):
        try:
            if self.is_live:
                last = -1
                while True:
                    with self._lock:
                        frame, stamp = self._latest, self._stamp
                    if frame is None or stamp == last:
                        time.sleep(0.003)
                        continue
                    last = stamp
                    yield self._prep(frame)
            else:
                while True:
                    ok, frame = self.cap.read()
                    if not ok:
                        break
                    yield self._prep(frame)
        finally:
            self._stop = True
            self.cap.release()
