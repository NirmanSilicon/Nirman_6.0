# ai_triggered/anpr.py  - Indian number plate reader (EasyOCR)
import os
import re
import cv2

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

STATE_CODES = set(
    "AN AP AR AS BR CG CH DD DL DN GA GJ HP HR JH JK KA KL LA LD MH ML MN MP MZ NL "
    "OD OR PB PY RJ SK TN TR TS UK UP WB".split()
)
PLATE_STD = re.compile(r"^[A-Z]{2}\d{2}[A-Z]{1,3}\d{4}$")  # OD02AB1234
PLATE_BH = re.compile(r"^\d{2}BH\d{4}[A-Z]{1,2}$")  # 22BH1234AA
DIGIT_TO_LETTER = {"0": "O", "1": "I", "2": "Z", "5": "S", "6": "G", "8": "B"}
LETTER_TO_DIGIT = {"O": "0", "Q": "0", "D": "0", "I": "1", "L": "1", "Z": "2", "S": "5", "G": "6", "B": "8"}


def _fix_window(s):
    n = len(s)
    chars = list(s)
    for i, c in enumerate(chars):
        letter_pos = i < 2 or 4 <= i < n - 4
        chars[i] = DIGIT_TO_LETTER.get(c, c) if letter_pos else LETTER_TO_DIGIT.get(c, c)
    fixed = "".join(chars)
    if PLATE_STD.match(fixed) and fixed[:2] in STATE_CODES:
        return fixed
    return None


def normalize_plate(text):
    """Raw OCR text -> valid Indian plate (with O/0, I/1, B/8, S/5 fixes by position) or None."""
    s = re.sub(r"[^A-Z0-9]", "", text.upper())
    if s.startswith("IND") and len(s) > 11:
        s = s[3:]
    if PLATE_BH.match(s):
        return s
    for L in (10, 9, 11):  # slide a window to drop junk characters at the ends
        for i in range(0, len(s) - L + 1):
            p = _fix_window(s[i : i + L])
            if p:
                return p
    return None


class PlateReader:
    def __init__(self, plate_model_path=os.path.join(BASE_DIR, "models", "plate_detector.pt"), gpu=False):
        import easyocr

        self.reader = easyocr.Reader(["en"], gpu=gpu, verbose=False)
        self.plate_model = None
        if os.path.exists(plate_model_path):
            from ultralytics import YOLO

            self.plate_model = YOLO(plate_model_path)
            print("[ANPR] Using plate detector model")
        else:
            print("[ANPR] No models/plate_detector.pt found - OCR on lower part of vehicle (less accurate)")

    def _candidates(self, vehicle_img):
        h, w = vehicle_img.shape[:2]
        if self.plate_model is not None:
            r = self.plate_model.predict(vehicle_img, conf=0.3, verbose=False)[0]
            crops = []
            for x1, y1, x2, y2 in r.boxes.xyxy.tolist():
                px, py = int((x2 - x1) * 0.08), int((y2 - y1) * 0.15)
                crops.append(
                    vehicle_img[max(0, int(y1) - py) : int(y2) + py, max(0, int(x1) - px) : int(x2) + px]
                )
            if crops:
                return crops
        return [vehicle_img[int(h * 0.40) :, :]]

    @staticmethod
    def _prep(img):
        h, w = img.shape[:2]
        if w < 480:
            s = 480 / w
            img = cv2.resize(img, None, fx=s, fy=s, interpolation=cv2.INTER_CUBIC)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        return cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)

    def read(self, vehicle_img):
        """Returns (plate or None, confidence 0-1)."""
        best_plate, best_conf = None, 0.0
        for cand in self._candidates(vehicle_img):
            if cand is None or cand.size == 0:
                continue
            ocr = self.reader.readtext(
                self._prep(cand),
                allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
                detail=1,
                paragraph=False,
            )
            if not ocr:
                continue
            ch = max(1, cand.shape[0])
            # reading order (handles 2-row plates): row bucket first, then x
            ocr.sort(key=lambda r: (int(min(p[1] for p in r[0]) // (ch / 3 + 1)), min(p[0] for p in r[0])))
            attempts = [(r[1], r[2]) for r in ocr]
            attempts.append(("".join(r[1] for r in ocr), sum(r[2] for r in ocr) / len(ocr)))
            for text, conf in attempts:
                plate = normalize_plate(text)
                if plate and conf > best_conf:
                    best_plate, best_conf = plate, float(conf)
        return best_plate, best_conf
