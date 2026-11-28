# ai_triggered/recognizer.py
import os
import re
import threading
import urllib.request

import cv2
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_EXT = (".jpg", ".jpeg", ".png", ".bmp", ".webp")

YUNET = ("face_detection_yunet_2023mar.onnx",
         "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx")
SFACE = ("face_recognition_sface_2021dec.onnx",
         "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx")


def _model_path(spec):
    fname, url = spec
    for d in (os.path.join(BASE_DIR, "models"), os.path.join(os.path.expanduser("~"), ".deepface", "weights")):
        p = os.path.join(d, fname)
        if os.path.exists(p) and os.path.getsize(p) > 100_000:
            return p
    os.makedirs(os.path.join(BASE_DIR, "models"), exist_ok=True)
    p = os.path.join(BASE_DIR, "models", fname)
    print(f"[FRS] downloading {fname} ...")
    urllib.request.urlretrieve(url, p)
    return p


def _unit(v):
    v = np.asarray(v, dtype=np.float32).flatten()
    n = np.linalg.norm(v)
    return v / n if n > 0 else None


class _CvEngine:
    """Edge engine: OpenCV YuNet (detect) + SFace (embed), ONNX, no TensorFlow. ~10-30 ms per face on CPU."""

    def __init__(self):
        self.det = cv2.FaceDetectorYN.create(_model_path(YUNET), "", (320, 320), 0.6, 0.3, 5000)
        self.rec = cv2.FaceRecognizerSF.create(_model_path(SFACE), "")
        self.lock = threading.Lock()

    def embed(self, img, reference=False):
        h, w = img.shape[:2]
        if reference and max(h, w) > 1280:
            s = 1280 / max(h, w)
            img = cv2.resize(img, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
            h, w = img.shape[:2]
        with self.lock:
            self.det.setScoreThreshold(0.3 if reference else 0.6)
            self.det.setInputSize((w, h))
            _, faces = self.det.detect(img)
            if faces is None or len(faces) == 0:
                return None
            face = max(faces, key=lambda f: f[2] * f[3])
            if face[2] < 20 or face[3] < 20:  # too tiny to identify
                return None
            aligned = self.rec.alignCrop(img, face)
            return _unit(self.rec.feature(aligned))


class _DeepFaceEngine:
    """Fallback if the OpenCV engine cannot start (needs tensorflow + deepface)."""

    def __init__(self, detector_backend="yunet"):
        from deepface import DeepFace

        self.DF = DeepFace
        self.backend = detector_backend

    def _rep(self, img, backend, enforce):
        reps = self.DF.represent(img_path=img, model_name="SFace", detector_backend=backend,
                                 enforce_detection=enforce, align=True)
        if not reps:
            return None
        best = max(reps, key=lambda r: r.get("facial_area", {}).get("w", 0) * r.get("facial_area", {}).get("h", 0))
        return _unit(best["embedding"])

    def embed(self, img, reference=False):
        h, w = img.shape[:2]
        if w < 160:
            img = cv2.resize(img, None, fx=160 / w, fy=160 / w, interpolation=cv2.INTER_CUBIC)
        backends = [self.backend] + ([b for b in ("mtcnn", "retinaface", "opencv") if b != self.backend] if reference else [])
        for be in backends:
            try:
                e = self._rep(img, be, True)
                if e is not None:
                    return e
            except Exception:
                continue
        if reference:
            try:
                return self._rep(img, "skip", False)
            except Exception:
                pass
        return None


class BorderTriggeredRecognizer:
    def __init__(
        self,
        accepted_dir=os.path.join(BASE_DIR, "shared", "accepted"),
        watchlist_dir=os.path.join(BASE_DIR, "shared", "watchlist"),
        accept_threshold=0.42,  # cosine similarity: stricter for "authorized" (false accept is dangerous)
        watch_threshold=0.36,   # more sensitive for watchlist (an operator verifies the alert)
    ):
        os.makedirs(accepted_dir, exist_ok=True)
        os.makedirs(watchlist_dir, exist_ok=True)
        self.accept_threshold = accept_threshold
        self.watch_threshold = watch_threshold

        try:
            self.engine = _CvEngine()
            print("[FRS] Engine: OpenCV YuNet + SFace (no TensorFlow)")
        except Exception as e:
            print(f"[FRS] OpenCV engine unavailable ({e}); falling back to DeepFace")
            self.engine = _DeepFaceEngine()

        self.accepted_db = self._load_folder(accepted_dir)
        self.watchlist_db = self._load_folder(watchlist_dir)
        print(f"[FRS LOADED] Accepted: {list(self.accepted_db)} | Watchlist: {list(self.watchlist_db)}")

    def embed(self, img_bgr, reference=False):
        if img_bgr is None or img_bgr.size == 0:
            return None
        try:
            return self.engine.embed(img_bgr, reference)
        except Exception as e:
            print(f"[FRS EMBEDDING ERROR] {e}")
            return None

    @staticmethod
    def _person_name(fname):
        stem = re.sub(r"[_\- ]?\d+$", "", os.path.splitext(fname)[0])  # ravi_2.jpg -> RAVI
        return stem.upper()

    def _load_folder(self, folder):
        db = {}
        for fname in sorted(os.listdir(folder)):
            if not fname.lower().endswith(IMG_EXT):
                continue
            emb = self.embed(cv2.imread(os.path.join(folder, fname)), reference=True)
            if emb is None:
                print(f"[FRS WARNING] No face found in reference photo: {fname}  (use a clear, front-facing photo)")
                continue
            db.setdefault(self._person_name(fname), []).append(emb)
        return db

    @staticmethod
    def _closest(emb, db):
        best_name, best = None, -1.0
        for name, refs in db.items():
            s = max(float(np.dot(emb, r)) for r in refs)
            if s > best:
                best_name, best = name, s
        return best_name, best

    def analyze_target(self, target_class, crop_img):
        if target_class != "person":
            return None
        h = crop_img.shape[0]
        emb = self.embed(crop_img[: max(1, int(h * 0.6)), :])  # head/shoulders first (faster)
        if emb is None:
            emb = self.embed(crop_img)
        if emb is None:
            return {"readable": False, "name": None, "event_type": "UNKNOWN_PERSON",
                    "frs_match": "UNREADABLE_FACE", "watchlist_hit": False, "scores": "no face"}

        wn, ws = self._closest(emb, self.watchlist_db)
        an, a_s = self._closest(emb, self.accepted_db)
        scores = f"watch {wn}:{ws:.2f} | accepted {an}:{a_s:.2f}"

        if wn and ws >= self.watch_threshold:  # watchlist always wins
            return {"readable": True, "name": wn, "event_type": "WATCHLIST_HIT",
                    "frs_match": f"SUSPECT: {wn} ({ws:.2f})", "watchlist_hit": True, "scores": scores}
        if an and a_s >= self.accept_threshold:
            return {"readable": True, "name": an, "event_type": "ACCEPTED_PERSON",
                    "frs_match": f"AUTHORIZED: {an} ({a_s:.2f})", "watchlist_hit": False, "scores": scores}

        near = max([(ws, wn), (a_s, an)], key=lambda x: x[0])
        hint = f" (closest {near[1]} {near[0]:.2f})" if near[1] else ""
        return {"readable": True, "name": None, "event_type": "UNKNOWN_PERSON",
                "frs_match": f"UNREGISTERED_SUBJECT{hint}", "watchlist_hit": False, "scores": scores}
