"""Register the operator-supplied SAMPLE ACCIDENTS corpus in the demo tenant.

The corpus is a folder of simulated (CARLA) collision clips, one directory per
accident category. This script is the only place it enters the platform:

* it probes each selected clip with OpenCV (duration, resolution, frame rate);
* it copies the bytes into the configured *private* object storage, using the
  same adapter the API and worker use;
* it creates ``videos`` rows, one imported ``collision_candidate`` incident per
  clip and one ``source_video`` evidence artefact so a reviewer can play the
  footage from the incident page.

Honesty rules baked into the rows
---------------------------------
* ``source_kind`` is ``imported``: the category label comes from the dataset
  folder name, **not** from this platform's detector. No model ran.
* ``model_name`` / ``model_score`` stay empty.
* ``limitations`` records that the footage is simulated, the label is supplied
  and the event time is the import time.
* ``review_status`` is ``pending`` so a human still decides what the clip shows.

The script is idempotent: deterministic UUIDs, stable storage keys and an
existence check before any upload. Re-running it updates the same rows.

Usage::

    python scripts/seed_sample_accident_videos.py
    python scripts/seed_sample_accident_videos.py --per-category 3 --dry-run
    python scripts/seed_sample_accident_videos.py --all

Inside the Compose stack::

    docker compose run --rm --no-deps \\
      -v ./datasets:/app/datasets:ro -v ./scripts:/app/scripts:ro \\
      api python /app/scripts/seed_sample_accident_videos.py

Extract the supplied archive first::

    unzip -q -n "datasets/sample_accidents/SAMPLE ACCIDENTS VIDEOS.zip" \\
      -d datasets/sample_accidents
"""

from __future__ import annotations

import argparse
import hashlib
import sys
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "apps" / "api"))

from app.core.config import settings  # noqa: E402
from app.db.session import privileged_session  # noqa: E402
from app.models import (  # noqa: E402
    Evidence,
    EvidenceType,
    Incident,
    IncidentSourceKind,
    IncidentType,
    LocationQuality,
    Organization,
    ReviewStatus,
    Severity,
    User,
    Video,
    VideoSourceType,
    VideoStatus,
)
from app.services.storage import build_storage_key, get_storage  # noqa: E402
from sqlalchemy import select  # noqa: E402

NAMESPACE = uuid.UUID("6f9619ff-8b86-d011-b42d-00c04fc964ff")
DATASET_DIR = REPO_ROOT / "datasets" / "sample_accidents" / "videos"
DEMO_ORG_SLUG = "demo-city"
DEMO_UPLOADER_EMAIL = "ops@demo.roadguard.ai"

# Folder name -> (human label, severity, one-line description).
CATEGORIES: dict[str, tuple[str, Severity, str]] = {
    "head-on": ("head-on collision", Severity.HIGH, "two vehicles meeting front to front"),
    "t-bone": ("t-bone (side impact) collision", Severity.HIGH, "one vehicle striking the side of another"),
    "rear-end": ("rear-end collision", Severity.MEDIUM, "one vehicle striking the rear of the vehicle ahead"),
    "sideswipe": ("sideswipe collision", Severity.MEDIUM, "vehicles colliding while travelling in parallel"),
    "single": ("single-vehicle loss of control", Severity.LOW, "one vehicle leaving the carriageway"),
}

SEVERITY_BY_CATEGORY = {name: meta[1] for name, meta in CATEGORIES.items()}
CATEGORY_ORDER = ("head-on", "t-bone", "rear-end", "sideswipe", "single")


def stable_id(kind: str, relative_path: str) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE, f"sample-accident-{kind}:{relative_path}")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def probe(path: Path) -> dict | None:
    """Return media metadata, or None when OpenCV cannot decode the clip."""
    import cv2

    capture = cv2.VideoCapture(str(path))
    if not capture.isOpened():
        capture.release()
        return None
    fps = float(capture.get(cv2.CAP_PROP_FPS) or 0)
    frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    capture.release()
    return {
        "width": width,
        "height": height,
        "frame_rate": round(fps, 3) if fps else None,
        "duration_seconds": round(frames / fps, 3) if fps and frames else None,
    }


def select_clips(per_category: int, take_all: bool) -> list[tuple[str, Path]]:
    """Pick clips evenly across each category so towns/weather are spread out."""
    if not DATASET_DIR.is_dir():
        raise SystemExit(
            f"Dataset not found at {DATASET_DIR}. Extract the archive first:\n"
            '  unzip -q -n "datasets/sample_accidents/SAMPLE ACCIDENTS VIDEOS.zip" '
            "-d datasets/sample_accidents"
        )
    selected: list[tuple[str, Path]] = []
    for category in CATEGORY_ORDER:
        folder = DATASET_DIR / category
        if not folder.is_dir():
            continue
        files = sorted(path for path in folder.glob("*.mp4") if path.is_file())
        if not files:
            continue
        if take_all or per_category >= len(files):
            chosen = files
        elif per_category <= 1:
            chosen = [files[0]]
        else:
            step = len(files) / per_category
            chosen = [files[min(len(files) - 1, int(index * step))] for index in range(per_category)]
        selected.extend((category, path) for path in chosen)
    return selected


def parse_name(path: Path) -> dict[str, str]:
    """Town06_head-on_wet_05.mp4 -> town/weather/index (best effort, never fabricated)."""
    parts = path.stem.split("_")
    return {
        "town": parts[0] if parts else "",
        "weather": parts[2] if len(parts) > 2 else "",
    }


def seed(per_category: int, take_all: bool, dry_run: bool) -> int:
    clips = select_clips(per_category, take_all)
    if not clips:
        print("No clips found to seed.", file=sys.stderr)
        return 2

    print(f"Selected {len(clips)} clip(s) from {DATASET_DIR.relative_to(REPO_ROOT)}")
    if dry_run:
        for category, path in clips:
            print(f"  [{category}] {path.name} ({path.stat().st_size} bytes)")
        return 0

    storage = get_storage()
    now = datetime.now(UTC)
    created = 0
    reused = 0

    with privileged_session() as session:
        organization = session.execute(
            select(Organization).where(Organization.slug == DEMO_ORG_SLUG)
        ).scalar_one_or_none()
        if organization is None:
            raise SystemExit(
                "DEMO organization 'demo-city' is missing. Run scripts/seed_database.py first."
            )
        uploader = session.execute(
            select(User).where(
                User.organization_id == organization.id, User.email == DEMO_UPLOADER_EMAIL
            )
        ).scalar_one_or_none()
        if uploader is None:
            raise SystemExit(
                f"DEMO user {DEMO_UPLOADER_EMAIL} is missing. Run scripts/seed_database.py first."
            )

        for category, path in clips:
            relative = f"{category}/{path.name}"
            size = path.stat().st_size
            metadata = probe(path)
            if metadata is None:
                print(f"  [skip] {relative}: not a decodable video")
                continue
            if size > settings.max_upload_bytes:
                print(f"  [skip] {relative}: {size} bytes exceeds the upload limit")
                continue

            video_id = stable_id("video", relative)
            incident_id = stable_id("incident", relative)
            evidence_id = stable_id("evidence", relative)
            storage_key = build_storage_key(
                str(organization.id), "videos", str(video_id), path.name
            )

            existing = session.get(Video, video_id)
            if existing is None:
                storage.put_bytes(storage_key, path.read_bytes(), "video/mp4")
                video = Video(
                    id=video_id,
                    organization_id=organization.id,
                    camera_id=None,
                    uploaded_by=uploader.id,
                    storage_key=storage_key,
                    original_filename=path.name,
                    content_type="video/mp4",
                    file_size_bytes=size,
                    checksum_sha256=sha256_file(path),
                    source_type=VideoSourceType.UPLOAD,
                    recorded_at=None,
                    duration_seconds=metadata["duration_seconds"],
                    width=metadata["width"],
                    height=metadata["height"],
                    frame_rate=metadata["frame_rate"],
                    status=VideoStatus.UPLOADED,
                    retention_expires_at=now + timedelta(days=settings.video_retention_days),
                    is_demo=True,
                )
                session.add(video)
                session.flush()
                created += 1
            else:
                video = existing
                reused += 1
                if not storage.stat(storage_key).exists:
                    storage.put_bytes(storage_key, path.read_bytes(), "video/mp4")

            label, severity, what = CATEGORIES[category]
            names = parse_name(path)
            description = (
                f"Imported sample clip from the operator-supplied SAMPLE ACCIDENTS corpus "
                f"(simulated CARLA footage): {what}. The '{category}' category is the dataset "
                "folder label, not an observation produced by this platform; no detector ran "
                "on this clip. The event time is the import time, not the original recording "
                "time. Human review is required before any governance action."
            )
            values = {
                "organization_id": organization.id,
                "camera_id": None,
                "video_id": video.id,
                "ai_job_id": None,
                "incident_type": IncidentType.COLLISION_CANDIDATE,
                "source_kind": IncidentSourceKind.IMPORTED,
                "severity": SEVERITY_BY_CATEGORY[category],
                "model_score": None,
                "event_time": now,
                "start_offset_seconds": None,
                "end_offset_seconds": None,
                "location": None,
                "latitude": None,
                "longitude": None,
                "location_quality": LocationQuality.UNKNOWN,
                "description": description,
                "review_status": ReviewStatus.PENDING,
                "reviewed_by": None,
                "reviewed_at": None,
                "review_notes": None,
                "model_name": None,
                "model_version": None,
                "rule_name": None,
                "rule_version": None,
                "track_ids": [],
                "features": {
                    "dataset": "sample_accidents",
                    "dataset_label": category,
                    "dataset_label_human": label,
                    "file": path.name,
                    "town": names["town"],
                    "weather": names["weather"],
                    "imported": True,
                },
                "reason_codes": ["DATASET_LABEL_SUPPLIED", "NOT_A_PLATFORM_DETECTION"],
                "limitations": [
                    "SIMULATED_CARLA_FOOTAGE",
                    "CATEGORY_LABEL_FROM_DATASET_FOLDER",
                    "NOT_ANALYSED_BY_PLATFORM_DETECTOR",
                    "IMPORT_TIME_NOT_RECORDING_TIME",
                ],
                "is_demo": True,
            }
            incident = session.get(Incident, incident_id)
            if incident is None:
                session.add(Incident(id=incident_id, **values))
            else:
                for field, value in values.items():
                    setattr(incident, field, value)

            if session.get(Evidence, evidence_id) is None:
                session.add(
                    Evidence(
                        id=evidence_id,
                        organization_id=organization.id,
                        incident_id=incident_id,
                        storage_key=storage_key,
                        evidence_type=EvidenceType.SOURCE_VIDEO,
                        label=f"Sample accident footage — {label} (simulated)",
                        content_type="video/mp4",
                        original_filename=path.name,
                        file_size_bytes=size,
                        checksum_sha256=sha256_file(path),
                        timestamp_in_video=None,
                        created_by=uploader.id,
                        is_demo=True,
                    )
                )
            session.flush()

    print(
        f"Seeded {created} new clip(s), reused {reused} existing row(s). "
        f"Private storage: {settings.storage_backend}."
    )
    print("Open Command Center → Videos & Jobs, or Command Center → Incidents to review the clips.")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Seed the simulated SAMPLE ACCIDENTS corpus")
    parser.add_argument(
        "--per-category",
        type=int,
        default=5,
        help="clips to register per accident category (default 5; spread evenly across the folder)",
    )
    parser.add_argument("--all", action="store_true", help="register every clip in the corpus")
    parser.add_argument("--dry-run", action="store_true", help="list the selection and exit")
    args = parser.parse_args(argv)
    if args.per_category < 1 and not args.all:
        parser.error("--per-category must be at least 1 (or pass --all)")
    return seed(args.per_category, args.all, args.dry_run)


if __name__ == "__main__":
    raise SystemExit(main())
