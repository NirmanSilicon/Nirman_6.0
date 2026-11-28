import os
import cv2
import numpy as np
from datetime import datetime
from typing import List, Dict, Any, Tuple
from backend.app.schemas.telemetry import WorkerSafetyStatus
from backend.app.config import settings

class WorkerSafetyEngine:
    def __init__(self):
        # Default hazardous zone polygon (normalized 0.0 - 1.0 coordinates relative to frame)
        # e.g. A zone representing the area directly around the conveyor belt
        self.hazard_zone_poly = np.array([
            [0.40, 0.45],
            [0.85, 0.45],
            [0.95, 0.95],
            [0.35, 0.95]
        ], np.float32)

        # State storage
        self.current_status = WorkerSafetyStatus(
            persons_detected=0,
            missing_ppe=[],
            zone_violation=False,
            unsafe_proximity=False,
            details=[]
        )
        self.latest_frame = None

    def update_manual_or_simulated_safety(
        self,
        persons: int = 1,
        missing_ppe: List[str] = None,
        zone_violation: bool = False,
        unsafe_proximity: bool = False,
        scenario: str = "custom",
        worker_details: List[Dict[str, Any]] = None
    ) -> WorkerSafetyStatus:
        if worker_details is None:
            if persons == 1:
                worker_details = [
                    {
                        "person_id": 1,
                        "label": "Worker #01",
                        "helmet": "helmet" not in (missing_ppe or []),
                        "vest": "vest" not in (missing_ppe or []),
                        "in_zone": zone_violation,
                        "fallen": scenario == "WORKER_FALLEN",
                        "proximity_m": 0.4 if zone_violation else 2.6
                    }
                ]
            elif persons == 2:
                worker_details = [
                    {
                        "person_id": 1,
                        "label": "Worker #01",
                        "helmet": True,
                        "vest": True,
                        "in_zone": True,
                        "fallen": False,
                        "proximity_m": 0.5
                    },
                    {
                        "person_id": 2,
                        "label": "Worker #02",
                        "helmet": False,
                        "vest": True,
                        "in_zone": False,
                        "fallen": False,
                        "proximity_m": 1.8
                    }
                ]
            else:
                worker_details = []

        self.current_status = WorkerSafetyStatus(
            persons_detected=persons,
            missing_ppe=missing_ppe or [],
            zone_violation=zone_violation,
            unsafe_proximity=unsafe_proximity,
            details=worker_details
        )
        return self.current_status

    def check_point_in_zone(self, x_norm: float, y_norm: float) -> bool:
        """Point-in-polygon check using OpenCV measureDist."""
        pt = (float(x_norm), float(y_norm))
        # PointPolygonTest expects points in contour format
        contour = (self.hazard_zone_poly * 1000).astype(np.int32)
        pt_scaled = (int(x_norm * 1000), int(y_norm * 1000))
        return cv2.pointPolygonTest(contour, pt_scaled, False) >= 0

    def capture_evidence_frame(self, alert_id: str) -> str:
        """
        Saves the current video frame (or draws an annotated snapshot) into static/incidents.
        Returns the relative URL to the image.
        """
        filename = f"incident_{alert_id}_{int(datetime.utcnow().timestamp())}.jpg"
        save_path = os.path.join(settings.INCIDENTS_DIR, filename)

        if self.latest_frame is not None:
            cv2.imwrite(save_path, self.latest_frame)
        else:
            # Generate an annotated synthetic evidence frame for demo verification
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            # Dark industrial backdrop
            frame[:] = (27, 24, 19)
            # Draw hazard zone polygon (Yellow translucent)
            poly_pts = (self.hazard_zone_poly * [640, 480]).astype(np.int32)
            cv2.polylines(frame, [poly_pts], isClosed=True, color=(0, 215, 255), thickness=2)
            cv2.putText(frame, "HAZARD ZONE PERIMETER", (poly_pts[0][0], poly_pts[0][1] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 215, 255), 1)

            # Draw simulated worker box
            if self.current_status.persons_detected > 0:
                box_color = (0, 0, 255) if (self.current_status.zone_violation or self.current_status.missing_ppe) else (0, 255, 0)
                cv2.rectangle(frame, (320, 180), (460, 440), box_color, 2)
                
                labels = ["Worker 1"]
                if "helmet" in self.current_status.missing_ppe:
                    labels.append("MISSING HELMET")
                if "vest" in self.current_status.missing_ppe:
                    labels.append("MISSING VEST")
                if self.current_status.zone_violation:
                    labels.append("ZONE BREACH")

                for i, text in enumerate(labels):
                    cv2.putText(frame, text, (325, 205 + i * 22),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.55, box_color, 2)

            # Timestamp watermark
            cv2.putText(frame, f"MECHGUARD CCTV [CAM-01] {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}",
                        (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 200, 200), 1)

            cv2.imwrite(save_path, frame)

        return f"/static/incidents/{filename}"

safety_engine = WorkerSafetyEngine()
