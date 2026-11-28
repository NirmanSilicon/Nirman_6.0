# Ashvin, Nirmaan kit

Skeleton for the connected demo. Read SPEC.md first, then run this.

## Install and run

```
python -m venv .venv
. .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r server/requirements.txt
python -m uvicorn server.main:app --host 0.0.0.0 --port 8000
```

Open http://localhost:8000 in two tabs. Both must show the same seq numbers.

From the phone on the same hotspot, open http://LAPTOP_IP:8000

## Push a test incident

```
python tools/push_event.py                  # full crash sequence
python tools/push_event.py --kind pothole   # false trigger path
python tools/push_event.py --kind citizen   # report path
```

## What to build next, in order

1. Replace web/index.html with the simulation shell: Leaflet map of Bhubaneswar, one pin per scenario, route to a Three.js scene.
2. Add the scenario timeline so the five events fire in order on a fixed clock.
3. Build the dashboard view from the same event stream.
4. Build the Android screen: connect to /ws, show the incident card.
5. Cache map tiles and install the PWA, so it runs without internet.

## Notes

The event log lives in events.db, which is created on first run. Delete it to reset the demo.
