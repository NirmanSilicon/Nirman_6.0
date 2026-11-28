# Ashvin

An accident management system for cities, built to save lives. The unit sits in the vehicle, so detection does not depend on the phone a person carries.

Nirmaan 6.0 / HackNation 2026, Team Golden Hour Squad, Silicon University, Bhubaneswar.

## The problem this addresses

On Indian roads a crash is usually reported by whoever happens to be passing. In a study of 920 road-injury victims, 74.5 percent of the calls for help came from a bystander and only 25.5 percent from the injured person, with a mean 25 minutes to first medical contact.

India recorded 4,80,583 road accidents in 2023, with 1,72,890 deaths and 4,62,825 people injured. Odisha recorded 12,052 accidents and 5,696 deaths in the same year.

## What this repository contains

A working, connected demonstration of the system: one event bus, three screens, and a scenario runner that drives them.

| Path | What it is |
|---|---|
| `server/main.py` | FastAPI event bus. One WebSocket hub, SQLite log, REST push endpoint. |
| `tools/scenarios.py` | The five scenarios and their sub-modes, with timings in one place. |
| `tools/run_scenario.py` | CLI that posts a scenario, with `--loop` for unattended demo runs. |
| `tools/push_event.py` | Shortcut that fires a full incident, a pothole, or a citizen report. |
| `web/index.html` | Raw event stream, with the 5-second countdown. |
| `web/sim/` | Map of Bhubaneswar with five scenario pins, the control panel, and the 3D impact scene. |
| `web/hospital/` | Receiving end: incident card, red pin, live notices. |
| `web/dossier/` | Hospital record screen with the victim, vehicle, medical and timeline cards. |
| `web/family/` | Phone app for the registered contact. Installable, alerts on the impact. |
| `SPEC.md` | The contract. Event envelope, event types, scenario table, acceptance criteria. |

## Run it

```
python -m venv .venv
.venv\Scripts\activate
pip install -r server/requirements.txt
python -m uvicorn server.main:app --host 0.0.0.0 --port 8000
```

Then open:

- `http://127.0.0.1:8000/` the raw stream
- `http://127.0.0.1:8000/sim` the map, panel and 3D scene
- `http://127.0.0.1:8000/hospital` the receiving end
- `http://127.0.0.1:8000/dossier` the hospital record
- `http://<laptop-ip>:8000/family` the phone app, from a device on the same network

## Run an incident

```
python tools\run_scenario.py --list
python tools\run_scenario.py --scenario dispatch --mode high_risk
python tools\run_scenario.py --scenario confirmation --mode silence
python tools\run_scenario.py --loop --pause 8
```

Or press **Run full incident** in the panel on `/sim`, which posts the same six events and starts the 3D scene.

## How the screens connect

Every client opens the same WebSocket and renders the same JSON envelope. Nothing talks to anything else directly.

```
{ "seq": 12, "event_id": "e-1042", "type": "impact_detected",
  "t_server": "2026-11-28T17:04:11.402+05:30", "source": "sim",
  "device_id": "ASH-07", "data": { "peak_g": 18.4, "speed_after": 0 } }
```

The event types are listed in `SPEC.md`. The numbers the demo quotes, 18.4 g for an impact, 3.8 g for a pothole, the 5 second window, the 2 to 3 km search radius, live in `tools/scenarios.py` and nowhere else.

## Hardware

The carrier board was designed for this project: schematic with 21 parts and 24 nets, a two-layer PCB of 68 by 41 mm with mounting holes matched to a printed enclosure of 74 by 47 by 26 mm, and 3D renders. The modules are ESP32, MPU6050, NEO-6M GPS and SIM800L, with a separate 4.0 V rail for the modem.

## What is not built

- No physical unit. Nothing has been soldered or tested in a moving vehicle.
- Detection thresholds are theoretical. No detection rate or alert latency has been measured.
- Handover to 112/108 is proposed, not integrated. No API is used.
- DigiLocker, the licence parser, the live doctor link and the zero-signal relay are planned.
- The no-response rule is still open inside the team.

Readiness is TRL 2 today. TRL 3 is the target after the 75-day plan.

## Team

Bhavya Dutta (lead, software), Subham Kumar Prusty (hardware and integrated systems), Debdutt Panda (simulation and designs), Akshay.
