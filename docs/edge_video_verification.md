# ParkSMART Edge AI Video Pipeline & YOLO26 Verification Procedure

**Module**: Edge AI Vision Client (M2 Ownership)  
**Applicability**: Day 4 Recorded Video Verification & Production Deployment  
**Honesty Disclaimer**: All confidence thresholds, detection cutoffs, and frame rates are developmental heuristics. No accuracy is claimed for physical Bhubaneswar deployments without empirical field validation.

---

## 1. Overview & Pipeline Architecture

The ParkSMART Edge AI Vision pipeline processes real-time or recorded camera streams on edge nodes, detecting vehicles and pedestrians, mapping detections onto registered parking bay Region of Interest (ROI) polygons, and producing schema-compliant MQTT telemetry for backend ingestion.

```
[ Recorded Video (.mp4) / RTSP ]
               │
               ▼
   [ VideoCaptureSource ] (edge/capture.py)
               │ (frames)
               ▼
      [ YoloDetector ] (edge/detector.py, YOLO26 NMS-free)
               │ (detections: vehicles, pedestrians)
               ├─────────────────────────────────────────┐
               ▼                                         ▼
       [ BayMapper ]                             [ ObjectCounter ]
   (edge/bay_mapper.py)                          (edge/counter.py)
   Spatial ROI intersection                      Category separation:
   Vehicle -> Bay occupied/free                  car, two_wheeler, bus, truck,
   Pedestrians strictly isolated                 pedestrians separate, density
               │ (bay readings)                          │ (crowd counts)
               └────────────────────┬────────────────────┘
                                    ▼
                         [ TelemetryAggregator ] (edge/aggregator.py)
                         Buffers readings, tracks measured FPS, uptime, errors
                         Builds OccupancyMessage, CrowdMessage, HealthMessage
                         Provenance: "observed"
                                    │
                                    ▼
                       [ EdgeTelemetryPublisher ] (edge/publisher.py)
                       Async MQTT 3.1.1, QoS 1, TLS (port 8883)
                       LWT on health topic, dry-run mode support
```

---

## 2. Configuration & Pinned Contracts

### Pinned ROI Contract
The reference contract is located at [`docs/contracts/roi_mapping.example.json`](file:///c:/Users/Trishala%20Tripathi/SMART/docs/contracts/roi_mapping.example.json):
* **Camera ID**: `c1a1a1a1-1111-4111-8111-111111111111`
* **Zone ID**: `a1a1a1a1-1111-4111-8111-111111111111`
* **Bays (4 bays, normalized polygon coordinates `[0.0..1.0]`)**:
  * `b1a1a1a1-1111-4111-8111-111111111111` (`BAY-A01`)
  * `b2a2a2a2-2222-4222-8222-222222222222` (`BAY-A02`)
  * `b3a3a3a3-3333-4333-8333-333333333333` (`BAY-A03`)
  * `b4a4a4a4-4444-4444-8444-444444444444` (`BAY-A04`)

### Telemetry Topic Contract
* Occupancy: `parksmart/{zone_id}/{camera_id}/occupancy`
* Crowd: `parksmart/{zone_id}/{camera_id}/crowd`
* Health: `parksmart/{zone_id}/{camera_id}/health`

### Provenance Contract
* Model-derived edge vision observations: `provenance: "observed"`
* Synthetic simulator profiles: labeled with `SIMULATED_NOTICE` (`provenance: "simulated"`)

---

## 3. Real Video Verification Procedure

### Prerequisites
1. **Model Weights**: Physical YOLO26 weights (`yolo26n.pt`) mounted read-only at `/models/yolo26n.pt`. Model weights must never be committed to Git.
2. **Video File**: Recorded test video (`parking_sample.mp4`) mounted at `/data/parking_sample.mp4`.
3. **Environment**: Python environment with `opencv-python-headless` and `ultralytics` installed, or the ParkSMART edge Docker container (`edge/Dockerfile`).

### Step 1: Running in Docker (Recommended)
Mount weights and video as read-only volumes:
```bash
docker run --rm \
  -v /path/to/weights:/models:ro \
  -v /path/to/videos:/data:ro \
  -e VIDEO_SOURCE=/data/parking_sample.mp4 \
  -e MODEL_PATH=/models/yolo26n.pt \
  -e CAMERA_ID=c1a1a1a1-1111-4111-8111-111111111111 \
  -e ZONE_ID=a1a1a1a1-1111-4111-8111-111111111111 \
  -e MQTT_HOST=mosquitto \
  -e MQTT_PORT=8883 \
  -e MQTT_TLS=true \
  parksmart-edge:latest
```

### Step 2: Running via Verification CLI (Dry-Run or Live)
To test frame decoding, model loading, and backend envelope validation without connecting to an external broker:
```bash
python scripts/verify_edge_pipeline.py \
  --real \
  --video /data/parking_sample.mp4 \
  --weights /models/yolo26n.pt \
  --frames 10 \
  --dry-run
```

### Step 3: Expected Output Verification Checklist
When real inference executes successfully:
1. **Startup Class Assertion**:
   ```
   [PASS] Startup class assertion succeeded: IDs 0, 2, 3, 5, 7 verified against model '/models/yolo26n.pt'.
   ```
2. **OpenCV Video Capture**:
   ```
   [CAPTURE] Successfully opened recorded video file: /data/parking_sample.mp4
   ```
3. **Frame Processing**:
   ```
   Frame 01: N detections -> vehicles: X, pedestrians: Y, occupied bays: K/4
   ```
4. **Backend Payload Validation**:
   ```
   [PASS] All edge telemetry payloads passed backend envelope validation.
   [PASS] OccupancyMessage provenance: 'observed'
   [PASS] CrowdMessage provenance:     'observed'
   [PASS] HealthMessage provenance:    'observed'
   ```
5. **Zero Disk Storage Assertion**:
   ```
   [PASS] Privacy preservation verified: Zero camera frames or detection crops written to disk.
   ```
6. **Execution Summary**:
   ```
   [SUMMARY] Real-video inference verified successfully!
             Processed 10 real video frames via loaded model weights.
   ```

---

## 4. Error Handling & Invariant Enforcement

| Condition | Edge Pipeline Behavior | Ingestion / System Guarantee |
| :--- | :--- | :--- |
| **Missing video file** | Fails with `FileNotFoundError`. Never silently falls back to synthetic frames when `--real` or `--video` is given. | No false observations emitted. |
| **Empty video file (0 bytes)** | Fails with `ValueError: Video file is empty (0 bytes)`. | Process halts safely before allocating buffers. |
| **Empty video stream (0 frames read)** | Emits `HealthMessage` with `state="degraded"`. Bays default to `state="unknown"`. | **Never infers bays are free.** |
| **Missing model weights** | Fails with `FileNotFoundError`. | Process halts at startup. |
| **Mismatched model classes** | Fails with `ValueError: Model class name mismatch`. | Prevents misclassification of pedestrians as vehicles. |
| **Camera offline / network disconnect** | Last Will and Testament (LWT) publishes `state="offline"`. | Bays transition to `unavailable`, **never marked free**. |
| **Broker unreachable in dry-run** | Telemetry is validated locally without network connection. | `delivered: False` recorded; does not pretend delivery succeeded. |

---

## 5. Simulator Fallback Mode

To test downstream systems when real camera hardware or recorded video is unavailable:
1. **Interactive Mock Verification**:
   ```bash
   python scripts/verify_edge_pipeline.py --mock --frames 5
   ```
   Uses in-memory synthetic frames and `MockTestModel` simulating vehicle in Bay A01.
2. **Synthetic Demand Profile Simulator**:
   ```bash
   python -m simulator.live_publisher \
     --zone-id a1a1a1a1-1111-4111-8111-111111111111 \
     --camera-id c1a1a1a1-1111-4111-8111-111111111111 \
     --profile commercial_core \
     --dry-run
   ```
   Emits realistic synthetic diurnal demand curves explicitly labeled with `SIMULATED_NOTICE`.
