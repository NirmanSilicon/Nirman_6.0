from pydantic import BaseModel
from typing import Optional


class BorderAlertEvent(BaseModel):
    event_id: str
    timestamp: str
    bop_id: str = "BOP_SECTOR_01"
    camera_id: str = "PERIMETER_CAM_01"
    # ACCEPTED_PERSON | UNKNOWN_PERSON | WATCHLIST_HIT |
    # VEHICLE_REGISTERED | UNKNOWN_VEHICLE | VEHICLE_FLAGGED | FENCE_INTRUSION | LOITERING
    event_type: str
    target_class: str  # "person" | "vehicle"
    track_id: int
    is_night_ir: bool = False
    frs_match: Optional[str] = None
    anpr_plate: Optional[str] = None  # e.g. "OD02AB1234"
    watchlist_hit: bool = False
    details: Optional[str] = None  # record status / owner / notes
    snapshot_url: Optional[str] = None  # filled in by the backend
    synced_to_hq: bool = False
