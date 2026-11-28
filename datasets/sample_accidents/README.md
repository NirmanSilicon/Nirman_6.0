# SAMPLE ACCIDENTS — simulated collision corpus (demo only)

Operator-supplied archive of **simulated** collision clips, used to give judges a
realistic video library without processing anyone's real CCTV. The filenames name
CARLA towns (`Town05`, `Town06`, `Town07`, `Town10HD`), the accident category and
the weather, e.g. `Town06_head-on_wet_05.mp4`. The footage is computer-generated;
it contains no real people, plates or locations.

The archive itself (`SAMPLE ACCIDENTS VIDEOS.zip`, ~2.0 GB) and the extracted
clips are **never committed** — see `.gitignore`. Only this note and the
`demo_accidents.csv` fixture are tracked.

## Contents

| Folder | Accident category | Clips | Severity used when imported |
| --- | --- | ---: | --- |
| `videos/head-on/` | head-on collision | 119 | high |
| `videos/t-bone/` | t-bone / side impact | 71 | high |
| `videos/rear-end/` | rear-end collision | 144 | medium |
| `videos/sideswipe/` | sideswipe collision | 83 | medium |
| `videos/single/` | single-vehicle loss of control | 12 | low |
| **Total** | | **429** | |

## Extract

```bash
unzip -q -n "datasets/sample_accidents/SAMPLE ACCIDENTS VIDEOS.zip" \
  -d datasets/sample_accidents
```

This creates `datasets/sample_accidents/videos/<category>/*.mp4` (~2.0 GB).

## Load into the demo tenant

The seeder copies the selected clips into private object storage (local directory
or MinIO, whichever the API uses), creates `videos` rows, and creates one
`collision_candidate` incident plus a playable `source_video` evidence artefact
per clip. By default it registers **5 clips per category (25 total)**, spread
evenly through each folder so towns and weather vary.

```bash
# Whole stack (recommended; uses the same DB and bucket as the running API)
docker compose run --rm --no-deps \
  -v ./datasets:/app/datasets:ro -v ./scripts:/app/scripts:ro \
  api python /app/scripts/seed_sample_accident_videos.py

# Or on the host, against the environment in .env
python scripts/seed_sample_accident_videos.py

# Preview the selection, register everything, or register a different count
python scripts/seed_sample_accident_videos.py --dry-run
python scripts/seed_sample_accident_videos.py --all
python scripts/seed_sample_accident_videos.py --per-category 3
```

Re-running is safe: deterministic UUIDs and stable storage keys mean rows and
objects are reused, not duplicated.

Then sign in as `ops@demo.roadguard.ai` (demo password from
`DEMO_SEED_PASSWORD`) and open:

* **Command Center → Videos & Jobs** — press **Play** on any seeded clip.
* **Command Center → Incidents** — each clip is an imported
  `collision_candidate` with the footage attached; review decisions work as
  usual.

## What the platform does and does not claim

- `source_kind = imported` and `model_name` stays empty: **the platform did not
  detect these accidents**. The category label comes from the dataset folder.
- `review_status = pending`, severity is a demo mapping from the category, and
  the event time is the import time, not the original recording time.
- The default detector (`synthetic_scene`) is tuned for the generated colour
  markers and is not run on these clips; running it would produce no candidates.

The clips are suitable for demonstrating ingestion, evidence review, governance
workflow and the audit trail. They are **not** accuracy evidence and must not be
presented as real city statistics. Confirm the corpus licence with its supplier
before redistributing it.
