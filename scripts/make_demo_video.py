"""
ParkSMART - Demo Parking Video Generator

Creates a realistic synthetic parking lot video:
- Top-down parking bay layout (4 bays matching roi_mapping.example.json)
- Cars drawn as coloured rectangles moving in and out of bays
- People walking across the scene
- Saved as data/parking_demo.mp4

Usage:
    python scripts/make_demo_video.py
    python scripts/make_demo_video.py --out data/my_video.mp4 --seconds 15
"""
from __future__ import annotations

import argparse
import math
import os
import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

try:
    import cv2
    import numpy as np
except ImportError:
    print("ERROR: opencv-python-headless and numpy are required.")
    print("Run: pip install opencv-python-headless numpy")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Scene constants (must match roi_mapping.example.json proportions)
# ---------------------------------------------------------------------------
W, H = 1280, 720   # frame size
FPS  = 15          # output fps

# Bay polygons (top-left x,y  width, height) — approximate centres of bays
# from roi_mapping.example.json (which uses 1920×1080 coords → scale to 1280×720)
SX, SY = W / 1920, H / 1080

BAYS = [
    # bay_id, (x1,y1,x2,y2) in 1280×720 space
    ("A01", (int(100*SX), int(400*SX), int(300*SX), int(850*SX))),
    ("A02", (int(320*SX), int(400*SX), int(520*SX), int(850*SX))),
    ("A03", (int(540*SX), int(400*SX), int(740*SX), int(850*SX))),
    ("A04", (int(760*SX), int(400*SX), int(960*SX), int(850*SX))),
]

# Colours
COL_ASPHALT   = (50,  50,  50)
COL_MARKING   = (220, 220, 220)
COL_CAR       = [(0, 180, 240), (0, 240, 120), (200, 80, 0), (160, 0, 220)]
COL_PERSON    = (30,  30,  200)
COL_LABEL     = (255, 255, 255)
COL_OCCUPIED  = (0,   60,  0)
COL_FREE      = (0,   40,  80)


def draw_scene(frame: "np.ndarray", t: float, occupied: list[bool]) -> None:
    """Draw the parking lot scene at time t (seconds)."""
    frame[:] = COL_ASPHALT

    # Ground markings (lane)
    cv2.rectangle(frame, (80, 350), (W - 80, H - 20), (40, 40, 40), -1)

    for i, (bay_id, (x1, y1, x2, y2)) in enumerate(BAYS):
        # Bay floor
        col_bg = COL_OCCUPIED if occupied[i] else COL_FREE
        cv2.rectangle(frame, (x1, y1), (x2, y2), col_bg, -1)
        # Bay border
        cv2.rectangle(frame, (x1, y1), (x2, y2), COL_MARKING, 2)
        # Bay label
        cv2.putText(frame, bay_id, (x1 + 8, y1 + 28),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, COL_LABEL, 2)

        # Draw car if occupied
        if occupied[i]:
            cx1 = x1 + 10
            cy1 = y1 + 40
            cx2 = x2 - 10
            cy2 = y2 - 10
            cv2.rectangle(frame, (cx1, cy1), (cx2, cy2), COL_CAR[i], -1)
            # Windshield
            ww = (cx2 - cx1) // 3
            cv2.rectangle(frame, (cx1 + ww, cy1 + 10), (cx2 - ww, cy1 + 50),
                          (200, 240, 255), -1)

    # Pedestrians — two walkers on a sine path along the driving lane
    for j in range(2):
        px = int((W * 0.1) + (W * 0.8) * ((t * 0.08 + j * 0.5) % 1.0))
        py = int(290 + 20 * math.sin(t * 1.2 + j * math.pi))
        # Body
        cv2.circle(frame, (px, py - 30), 14, COL_PERSON, -1)
        cv2.rectangle(frame, (px - 10, py - 15), (px + 10, py + 25), COL_PERSON, -1)

    # Overlay: timestamp + status bar
    cv2.rectangle(frame, (0, 0), (W, 44), (20, 20, 20), -1)
    status = "  ".join(
        f"{bid}: {'OCC' if occ else 'FREE'}"
        for (bid, _), occ in zip(BAYS, occupied)
    )
    cv2.putText(frame, f"ParkSMART DEMO  |  {status}  |  t={t:.1f}s",
                (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 180), 1)


def build_occupancy_sequence(total_frames: int, fps: int) -> list[list[bool]]:
    """Returns per-frame occupancy for each bay, animated over time."""
    seq = []
    for f in range(total_frames):
        t = f / fps
        occ = [
            True,                           # A01 always has a car
            True if t < 5 or t > 10 else False,  # A02 leaves at t=5, returns at t=10
            False if t < 3 else True,       # A03 car arrives at t=3
            (int(t) % 4) < 2,              # A04 alternates every 2s
        ]
        seq.append(occ)
    return seq


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate ParkSMART demo video")
    parser.add_argument("--out", default="data/parking_demo.mp4", help="Output video path")
    parser.add_argument("--seconds", type=int, default=15, help="Video duration in seconds")
    args = parser.parse_args()

    out_path = root_dir / args.out
    out_path.parent.mkdir(parents=True, exist_ok=True)

    total_frames = args.seconds * FPS
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(out_path), fourcc, FPS, (W, H))
    if not writer.isOpened():
        print(f"ERROR: Cannot open VideoWriter for {out_path}")
        sys.exit(1)

    occupancy_seq = build_occupancy_sequence(total_frames, FPS)
    frame = np.zeros((H, W, 3), dtype=np.uint8)

    print(f"Generating {total_frames} frames ({args.seconds}s @ {FPS}fps) → {out_path}")
    for f_idx in range(total_frames):
        t = f_idx / FPS
        draw_scene(frame, t, occupancy_seq[f_idx])
        writer.write(frame)
        if f_idx % FPS == 0:
            print(f"  {f_idx}/{total_frames} frames written...")

    writer.release()
    size_kb = out_path.stat().st_size // 1024
    print(f"\n✅ Demo video written: {out_path}  ({size_kb} KB)")
    print(f"   Resolution : {W}x{H}")
    print(f"   Duration   : {args.seconds}s at {FPS} FPS")
    print(f"   Bays       : A01 (always occupied), A02 (leaves/returns), A03 (arrives at 3s), A04 (alternating)")


if __name__ == "__main__":
    main()
