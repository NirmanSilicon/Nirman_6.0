# Ashvin, Nirmaan build spec

This file is the contract for the build. Feed it to the coding agent before it writes anything, and keep it updated when a decision changes. Every screen reads the same event schema, and every number the demo quotes comes from the table below, so no two screens can disagree in front of a judge.

## What is being built

A connected demonstration of Ashvin, the in-vehicle crash detection and dispatch system. Three clients share one live event stream: a browser simulation of the crash, a hospital and dispatch dashboard, and a citizen reporting app on an Android phone. A local server on the laptop holds the stream and the event log.

The demonstration is a simulation. No physical unit exists. Where a number is simulated it must be labelled as simulated on screen, and where it comes from the phone's own sensor it must be labelled as live sensor data.

## Fixed values

One source of truth. Change a value here and every screen follows.

| Name | Value | Used by |
|---|---|---|
| Crash peak acceleration | 18.4 G | Simulation HUD, detector threshold |
| Pothole and speed breaker jolt | 3.8 G | Simulation HUD, false trigger path |
| Impact speed before | 72 km/h | Simulation HUD |
| Speed after a real impact | 0 km/h | Detector second condition |
| Confirmation window | 5 s | Simulation, dashboard countdown |
| Hospital and help site radius | 2 to 3 km | Dashboard map |
| Remote area report threshold | 1 to 2 reports | Citizen app |
| Populated area report threshold | 5 to 10 reports | Citizen app |
| Detection rule | peak above threshold and speed falls below 5 km/h within 2 s | Detector |
| False trigger rule | peak above threshold and speed stays above 30 km/h | Detector |

## Screens

Simulation, the browser PWA. Opens on a Leaflet map of Bhubaneswar with one pin per scenario. Selecting a pin opens the 3D scene and runs that scenario on a fixed timeline.

Dashboard, the hospital and dispatch view. Shows the incoming incident, the confirmation countdown, the alert level, the nearest hospital and help site, and the dispatch record.

Citizen app, native Android. Shows a report form with accident types and a photo, then the confirmation count and the outcome.

## Event envelope

Every message on the stream has this shape. The server adds `seq` and `t_server` and rebroadcasts unchanged otherwise.

```json
{
  "seq": 12,
  "event_id": "e-1042",
  "type": "impact_detected",
  "t_client": "2026-11-28T17:04:11.250+05:30",
  "t_server": "2026-11-28T17:04:11.402+05:30",
  "source": "sim",
  "device_id": "ASH-07",
  "data": { }
}
```

`source` is one of `sim`, `phone`, `dashboard`, `server`.

## Event types

| type | data keys | notes |
|---|---|---|
| `impact_detected` | lat, lon, peak_g, speed_before, speed_after, kind | kind is `crash`, `pothole` or `hard_brake` |
| `false_trigger_filtered` | reason, peak_g, speed_after | sent when the second condition fails |
| `alert_call_started` | countdown_s, numbers | countdown_s is 5 |
| `alert_confirmed` | level | `high`, `low` or `no_response` |
| `dispatched` | service, eta_s | service is `112` or `108` |
| `hospital_notified` | hospital_id, name, distance_km | pre-arrival notice, not a dispatch |
| `help_site_alerted` | site_id, name, distance_km | petrol pump or similar |
| `citizen_report` | report_id, accident_type, photo_url, lat, lon, zone | zone is `remote` or `populated` |
| `report_confirmed` | report_id, confirmations, threshold | |
| `report_rejected` | report_id, reason | false report, fine applies |
| `sensor_sample` | g, speed_kmh, source_note | live phone accelerometer, throttled to 10 per second |
| `identity_resolved` | licence_verified, unit_code | |
| `first_aid_shown` | steps | |
| `sms_fallback_started` | reason, to_number | |
| `sms_sent` | to, body, chars | |
| `sms_received` | gateway, latency_s | |

## Scenario list

Each scenario is one entry with a mode switch where it applies.

1. Detection. Modes: real impact, pothole and hard brake. Impact sends `impact_detected`, the other two send `false_trigger_filtered`.
2. Confirmation. Modes: silence, confirmed low alert, no answer after the window. Countdown visible on all three screens.
3. Dispatch. Modes: high risk, lower risk. High risk hands to 108 with an ETA and notifies the nearest hospital. Lower risk alerts the nearest help site first.
4. Citizen report. Modes: remote forest, populated city daytime, false report. Confirmation thresholds differ per mode.
5. Identity and first aid. Modes: identity card, first aid steps. DigiLocker and the licence parser are marked as planned, not built.

## Acceptance criteria

Two browser tabs and one phone show the same `event_id` within one second of it being raised.

The five second countdown reaches zero at the same moment on all three screens.

Every screen that shows a simulated number says so. The phone sensor screen says live sensor.

The whole demo runs with the laptop server and no internet, after the map tiles are cached.

One full run, from scenario selection to dispatch, takes under 90 seconds and can be replayed without a page refresh.

## Repository layout

```
server/     fastapi app, websocket hub, sqlite log
web/        PWA, three.js scene, leaflet map, dashboard
android/    native app, one screen
tools/      push_event.py, scripts for testing
SPEC.md     this file
```

## Run

```
python -m venv .venv && . .venv/bin/activate
pip install -r server/requirements.txt
python -m uvicorn server.main:app --host 0.0.0.0 --port 8000
```

Open `http://localhost:8000` for the test page, and `http://<laptop-ip>:8000` from the phone on the same hotspot.

## Out of scope tonight

Physics engine. Rigid body crash dynamics. EasyEDA board. DigiLocker. Live doctor link. Any claim that a physical unit exists.
