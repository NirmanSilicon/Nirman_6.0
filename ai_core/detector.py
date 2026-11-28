# ai_core/detector.py
from ultralytics import YOLO

PERSON_CLASS = 0
VEHICLE_CLASSES = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}


class BorderCoreDetector:
    """Tracks persons + vehicles. Pass an exported model (e.g. 'yolov8n_openvino_model')
    for much faster CPU inference."""

    def __init__(self, model_path="yolov8n.pt", imgsz=416, conf=0.40, min_person_h=60, min_vehicle_w=100):
        self.model = YOLO(model_path, task="detect")
        self.imgsz = imgsz
        self.conf = conf
        self.min_person_h = min_person_h
        self.min_vehicle_w = min_vehicle_w

    def process_frame(self, frame):
        res = self.model.track(
            frame,
            persist=True,
            classes=[PERSON_CLASS, *VEHICLE_CLASSES.keys()],
            conf=self.conf,
            imgsz=self.imgsz,  # small input = fast; boxes still come back in full-frame coordinates
            verbose=False,
        )[0]
        if res.boxes is None or res.boxes.id is None:
            return []

        H, W = frame.shape[:2]
        tracks = []
        for xyxy, tid, cls in zip(res.boxes.xyxy.tolist(), res.boxes.id.tolist(), res.boxes.cls.tolist()):
            cls = int(cls)
            x1, y1, x2, y2 = (int(v) for v in xyxy)
            x1, y1, x2, y2 = max(0, x1), max(0, y1), min(W, x2), min(H, y2)
            if x2 - x1 <= 0 or y2 - y1 <= 0:
                continue
            if cls == PERSON_CLASS:
                target, vtype, usable = "person", None, (y2 - y1) >= self.min_person_h
            else:
                target, vtype, usable = "vehicle", VEHICLE_CLASSES[cls], (x2 - x1) >= self.min_vehicle_w
            tracks.append({"track_id": int(tid), "target_class": target, "vehicle_type": vtype,
                           "bbox": [x1, y1, x2, y2], "usable": usable})
        return tracks
