"""
PPE Detection module.

Wraps the custom YOLO PPE model and implements the spatial
association logic that links PPE items to individual workers.

Detection classes:
    person, helmet, no_helmet, vest, boots

Association logic (preserved from validated prototype):
    - Vest: center of vest box within person's upper body region (20%-65%)
    - Boots: center of boot box within person's lower body region (45%-100%)
    - No vest: inferred when no vest found in upper body region
    - No boots: inferred when person height > 180px and no boot in lower body
    - Helmet / No helmet: IoU-based NMS keeps highest confidence detection
"""

from typing import Any, Dict, List, Optional

from app.utils.logger import get_logger
from app.config import (
    PPE_MODEL_PATH,
    PERSON_MODEL_PATH,
    PPE_CONFIDENCE,
    PPE_IMAGE_SIZE,
    PPE_IOU_THRESHOLD,
    UPPER_BODY_START,
    UPPER_BODY_END,
    LOWER_BODY_START,
    MIN_PERSON_HEIGHT_BOOTS,
    HEAD_IOU_THRESHOLD,
)

log = get_logger("detection.ppe")


class PPEDetector:
    """
    PPE detection and per-worker association.

    Supports both:
    - 3-Class Custom PPE Model (`PPE_Tiny_3Class` in `Models/best.pt`: `{0: 'head', 1: 'helmet', 2: 'person'}`),
      using `head` as an uncovered head (`no_helmet`) and pairing with `yolo11n.pt` (classes=[0])
      for high-recall person bounding boxes and spatial helmet-to-person matching (`ppe_matching.py`).
    - 5/6-Class Custom PPE Model (`person, helmet, no_helmet, vest, boots, no_boots`), enabling
      vest and boot checks ONLY when those classes actually exist in the loaded model.
    """

    def __init__(self):
        self.model = None
        self.person_model = None
        self.model_path: str = ""
        self.class_names: Dict[int, str] = {}
        self.has_custom_ppe_classes: bool = False
        self.supports_helmet: bool = False
        self.supports_vest: bool = False
        self.supports_boots: bool = False
        self._confidence = PPE_CONFIDENCE

    @property
    def confidence(self) -> float:
        return self._confidence

    @confidence.setter
    def confidence(self, value: float):
        self._confidence = max(0.05, min(0.95, value))

    def load(self, custom_model_path: Optional[str] = None) -> bool:
        """
        Load the custom PPE YOLO model (and companion person detector if available).

        Returns True ONLY if a valid custom PPE model containing helmet/PPE classes is loaded.
        Never silently falls back to a base COCO model as the primary PPE model.
        """
        model_path = str(custom_model_path) if custom_model_path else str(PPE_MODEL_PATH)
        log.info("Loading PPE model from: %s", model_path)

        try:
            from pathlib import Path
            from ultralytics import YOLO

            if not Path(model_path).exists():
                log.error("PPE model file not found: %s", model_path)
                return False

            loaded_model = YOLO(model_path)
            raw_names = loaded_model.names
            known_labels = {str(v).lower().strip() for v in raw_names.values()}

            # Verify this model actually contains PPE / helmet classes (do not accept base 80-class COCO!)
            supports_helmet = bool({"helmet", "hardhat", "no_helmet", "no-helmet", "head"} & known_labels)
            supports_vest = bool({"vest", "safety_vest", "no_vest", "no-vest"} & known_labels)
            supports_boots = bool({"boots", "safety_boots", "no_boots", "no-boots"} & known_labels)

            if not (supports_helmet or supports_vest or supports_boots):
                log.error(
                    "Model at %s does not contain any PPE classes (found %d non-PPE classes). "
                    "Refusing to use non-PPE model as primary PPE detector.",
                    model_path,
                    len(known_labels),
                )
                return False

            self.model = loaded_model
            self.model_path = str(Path(model_path).resolve())
            self.class_names = raw_names
            self.supports_helmet = supports_helmet
            self.supports_vest = supports_vest
            self.supports_boots = supports_boots
            self.has_custom_ppe_classes = True

            # Load companion person detector (yolo11n.pt) for dual-detector person recall
            # as validated in Arpit's ppe_matching.py and ppe_tracking.py
            person_path = Path(PERSON_MODEL_PATH)
            if person_path.exists() and person_path.resolve() != Path(model_path).resolve():
                try:
                    self.person_model = YOLO(str(person_path))
                    log.info("Companion person detector loaded from: %s", person_path)
                except Exception as p_exc:
                    log.warning("Companion person detector could not be loaded: %s", p_exc)
                    self.person_model = None

            log.info(
                "PPE model loaded successfully from %s | Classes: %s | Capabilities: helmet=%s, vest=%s, boots=%s",
                self.model_path,
                self.class_names,
                self.supports_helmet,
                self.supports_vest,
                self.supports_boots,
            )
            return True

        except FileNotFoundError:
            log.error("PPE model file not found: %s", model_path)
            return False
        except Exception as e:
            log.error("Failed to load PPE model: %s", e)
            return False

    def detect(self, frame) -> Dict[str, Any]:
        """
        Run PPE detection on a single frame.

        Returns a dictionary with:
            persons: list of person detections
            head_detections: cleaned helmet/no_helmet detections
            worker_ppe: per-worker PPE status
            total_persons: int
            no_helmet_count: int
            no_vest_count: int
            no_boots_count: int
            supports_helmet: bool
            supports_vest: bool
            supports_boots: bool
        """
        if self.model is None:
            return EMPTY_PPE_RESULT

        try:
            results = self.model.predict(
                source=frame,
                conf=self._confidence,
                imgsz=PPE_IMAGE_SIZE,
                iou=PPE_IOU_THRESHOLD,
                verbose=False,
            )
        except Exception as e:
            log.error("PPE inference error: %s", e)
            return EMPTY_PPE_RESULT

        # ── Extract and normalize all detections from custom PPE model ──
        detections = []
        for result in results:
            for box in result.boxes:
                cls = int(box.cls[0])
                conf = float(box.conf[0])
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                raw_label = str(self.class_names[cls]).lower().strip()

                # Canonical class label normalization:
                # In PPE_Tiny_3Class ({0: 'head', 1: 'helmet', 2: 'person'}),
                # class 0 ('head') is an bare/uncovered head -> 'no_helmet'
                if raw_label in ("head", "no_helmet", "no-helmet", "no helmet"):
                    norm_label = "no_helmet"
                elif raw_label in ("helmet", "hardhat", "hard_hat"):
                    norm_label = "helmet"
                elif raw_label in ("vest", "safety_vest", "safety-vest"):
                    norm_label = "vest"
                elif raw_label in ("no_vest", "no-vest", "no vest"):
                    norm_label = "no_vest"
                elif raw_label in ("boots", "safety_boots", "safety-boots", "boot"):
                    norm_label = "boots"
                elif raw_label in ("no_boots", "no-boots", "no boots"):
                    norm_label = "no_boots"
                elif raw_label in ("person", "worker"):
                    norm_label = "person"
                else:
                    norm_label = raw_label

                detections.append({
                    "label": norm_label,
                    "raw_label": raw_label,
                    "cls_id": cls,
                    "conf": conf,
                    "box": (x1, y1, x2, y2),
                })

        # ── Separate by canonical class ────────────────────────────
        ppe_persons = [d for d in detections if d["label"] == "person"]
        helmets = [d for d in detections if d["label"] == "helmet"]
        no_helmets = [d for d in detections if d["label"] == "no_helmet"]
        vests = [d for d in detections if d["label"] == "vest"]
        explicit_no_vests = [d for d in detections if d["label"] == "no_vest"]
        boots = [d for d in detections if d["label"] == "boots"]
        explicit_no_boots = [d for d in detections if d["label"] == "no_boots"]

        # ── Companion Dual-Detector Person Detection (from ppe_matching.py) ──
        companion_persons = []
        if self.person_model is not None:
            try:
                p_results = self.person_model.predict(
                    source=frame,
                    conf=max(0.30, self._confidence),
                    classes=[0],
                    imgsz=PPE_IMAGE_SIZE,
                    verbose=False,
                )
                for r in p_results:
                    for box in r.boxes:
                        conf = float(box.conf[0])
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        companion_persons.append({
                            "label": "person",
                            "raw_label": "person",
                            "cls_id": 0,
                            "conf": conf,
                            "box": (x1, y1, x2, y2),
                        })
            except Exception as exc:
                log.debug("Companion person inference error: %s", exc)

        # Merge person boxes from custom PPE model and companion person detector via IoU NMS
        persons = self._merge_person_detections(companion_persons, ppe_persons)

        # ── Clean helmet / no_helmet via IoU NMS ───────────────────
        head_detections = self._clean_head_detections(helmets, no_helmets)
        cleaned_helmets = [d for d in head_detections if d["label"] == "helmet"]
        cleaned_no_helmets = [d for d in head_detections if d["label"] == "no_helmet"]

        # ── Associate PPE (Helmet, Vest, Boots) to each Worker ─────
        worker_ppe = []
        no_helmet_count = 0
        no_vest_count = 0
        no_boots_count = 0
        matched_no_helmet_indices = set()

        for person in persons:
            px1, py1, px2, py2 = person["box"]
            person_width = max(1, px2 - px1)
            person_height = max(1, py2 - py1)

            # 1. Helmet association (spatial head region matching from ppe_matching.py)
            helmet_found = False
            helmet_detection = None
            for h_det in cleaned_helmets:
                if self._head_belongs_to_person(person["box"], h_det["box"]):
                    helmet_found = True
                    helmet_detection = h_det
                    break

            no_helmet_detection = None
            if not helmet_found:
                for idx, nh_det in enumerate(cleaned_no_helmets):
                    if idx not in matched_no_helmet_indices and self._head_belongs_to_person(person["box"], nh_det["box"]):
                        no_helmet_detection = nh_det
                        matched_no_helmet_indices.add(idx)
                        break

            # A person lacks a helmet if:
            # (a) an explicit 'head'/'no_helmet' box was matched to their head region, OR
            # (b) the model supports helmet detection, no helmet was matched, and the person's
            #     upper/head region is visible in the frame (py1 < 75% of frame height).
            fh = frame.shape[0] if frame is not None and hasattr(frame, "shape") else 640
            head_region_visible = py1 < int(fh * 0.75) and person_height >= 60
            person_missing_helmet = False

            if self.supports_helmet and not helmet_found:
                if no_helmet_detection is not None or head_region_visible:
                    person_missing_helmet = True
                    no_helmet_count += 1
                    if no_helmet_detection is None:
                        head_box = (
                            px1 + int(person_width * 0.20),
                            max(0, py1),
                            px2 - int(person_width * 0.20),
                            py1 + int(person_height * 0.28),
                        )
                        inferred_head = {
                            "label": "no_helmet",
                            "raw_label": "inferred_no_helmet",
                            "conf": person["conf"],
                            "box": head_box,
                            "inferred": True,
                        }
                        head_detections.append(inferred_head)
                        no_helmet_detection = inferred_head

            # 2. Vest check (ONLY evaluated if loaded model has vest classes!)
            vest_found = False
            vest_detection = None
            if self.supports_vest:
                upper_y1 = py1 + int(person_height * UPPER_BODY_START)
                upper_y2 = py1 + int(person_height * UPPER_BODY_END)
                for vest in vests:
                    vx1, vy1, vx2, vy2 = vest["box"]
                    cx = (vx1 + vx2) / 2
                    cy = (vy1 + vy2) / 2
                    if px1 <= cx <= px2 and upper_y1 <= cy <= upper_y2:
                        vest_found = True
                        vest_detection = vest
                        break
                if not vest_found:
                    no_vest_count += 1

            # 3. Boots check (ONLY evaluated if loaded model has boots classes!)
            boot_found = False
            boot_detection = None
            no_boots_inferred = False
            if self.supports_boots:
                lower_y1 = py1 + int(person_height * LOWER_BODY_START)
                lower_y2 = py2
                for boot in boots:
                    bx1, by1, bx2, by2 = boot["box"]
                    cx = (bx1 + bx2) / 2
                    cy = (by1 + by2) / 2
                    if px1 <= cx <= px2 and lower_y1 <= cy <= lower_y2:
                        boot_found = True
                        boot_detection = boot
                        break
                no_boots_inferred = (
                    person_height > MIN_PERSON_HEIGHT_BOOTS and not boot_found
                )
                if no_boots_inferred:
                    no_boots_count += 1

            worker_ppe.append({
                "person_box": person["box"],
                "person_conf": person["conf"],
                "helmet_found": helmet_found,
                "helmet_detection": helmet_detection,
                "no_helmet_detection": no_helmet_detection,
                "missing_helmet": person_missing_helmet,
                "vest_found": vest_found,
                "vest_detection": vest_detection,
                "boot_found": boot_found,
                "boot_detection": boot_detection,
                "no_boots_inferred": no_boots_inferred,
            })

        # Also count any standalone 'head'/'no_helmet' detections that were not matched to a full person box
        for idx, nh_det in enumerate(cleaned_no_helmets):
            if idx not in matched_no_helmet_indices:
                no_helmet_count += 1

        # If no full person box was detected at all, estimate total_persons from distinct head/helmet detections
        total_persons = max(len(persons), len(cleaned_helmets) + len(cleaned_no_helmets))

        return {
            "persons": persons,
            "head_detections": head_detections,
            "vests": vests,
            "boots": boots,
            "worker_ppe": worker_ppe,
            "total_persons": total_persons,
            "no_helmet_count": no_helmet_count,
            "no_vest_count": no_vest_count,
            "no_boots_count": no_boots_count,
            "has_custom_ppe_classes": self.has_custom_ppe_classes,
            "supports_helmet": self.supports_helmet,
            "supports_vest": self.supports_vest,
            "supports_boots": self.supports_boots,
        }

    @staticmethod
    def _head_belongs_to_person(person_box, head_box) -> bool:
        """
        Check whether a helmet or bare-head bounding box belongs to a person's
        upper body / head region (preserved from Arpit's validated ppe_matching.py).
        """
        px1, py1, px2, py2 = person_box
        hx1, hy1, hx2, hy2 = head_box

        hx = (hx1 + hx2) / 2.0
        hy = (hy1 + hy2) / 2.0

        person_width = max(1, px2 - px1)
        person_height = max(1, py2 - py1)
        upper_y = py1 + person_height * 0.48

        inside_x = (px1 - person_width * 0.20) <= hx <= (px2 + person_width * 0.20)
        inside_y = (py1 - person_height * 0.20) <= hy <= upper_y
        return inside_x and inside_y

    def _merge_person_detections(
        self,
        primary_persons: List[Dict],
        secondary_persons: List[Dict],
    ) -> List[Dict]:
        """Merge person detections from dual detectors using IoU deduplication."""
        combined = primary_persons + secondary_persons
        combined.sort(key=lambda d: d["conf"], reverse=True)

        merged = []
        for det in combined:
            overlap = False
            for existing in merged:
                if self._calculate_iou(det["box"], existing["box"]) > 0.45:
                    overlap = True
                    break
            if not overlap:
                merged.append(det)
        return merged

    def _clean_head_detections(
        self,
        helmets: List[Dict],
        no_helmets: List[Dict],
    ) -> List[Dict]:
        """
        Merge helmet and no_helmet detections, removing overlaps.

        Keeps the higher-confidence detection when two overlap
        by more than HEAD_IOU_THRESHOLD.

        This is the same logic from the validated prototype.
        """
        combined = helmets + no_helmets
        combined.sort(key=lambda d: d["conf"], reverse=True)

        cleaned = []
        for det in combined:
            overlap = False
            for existing in cleaned:
                if self._calculate_iou(det["box"], existing["box"]) > HEAD_IOU_THRESHOLD:
                    overlap = True
                    break
            if not overlap:
                cleaned.append(det)

        return cleaned

    @staticmethod
    def _calculate_iou(box1, box2) -> float:
        """Calculate Intersection over Union for two bounding boxes."""
        x1, y1, x2, y2 = box1
        a1, b1, a2, b2 = box2

        ix1 = max(x1, a1)
        iy1 = max(y1, b1)
        ix2 = min(x2, a2)
        iy2 = min(y2, b2)

        iw = max(0, ix2 - ix1)
        ih = max(0, iy2 - iy1)
        intersection = iw * ih

        area1 = max(1, (x2 - x1) * (y2 - y1))
        area2 = max(1, (a2 - a1) * (b2 - b1))
        union = area1 + area2 - intersection

        return intersection / union if union > 0 else 0


# Module-level empty result constant (avoids re-creating dicts per frame)
EMPTY_PPE_RESULT: Dict[str, Any] = {
    "persons": [],
    "head_detections": [],
    "vests": [],
    "boots": [],
    "worker_ppe": [],
    "total_persons": 0,
    "no_helmet_count": 0,
    "no_vest_count": 0,
    "no_boots_count": 0,
}
