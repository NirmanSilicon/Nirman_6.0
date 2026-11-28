"""
ParkSMART - Edge Vision Client Configuration (File 148 / M2 Ownership)

Responsibility:
Typed configuration for the edge vision and detection pipeline.
All numeric detection and classification thresholds are explicit UNVALIDATED placeholders.
No accuracy is claimed for Bhubaneswar municipal or physical environments.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

# ============================================================================
# Honesty & Disclaimer Notice
# ============================================================================
UNVALIDATED_NOTICE = (
    "UNVALIDATED THRESHOLDS: All confidence, intersection, and timing thresholds "
    "are exploratory engineering placeholders. No real-world camera accuracy "
    "or validation data has been collected or measured for Bhubaneswar."
)


@dataclass
class VideoSourceConfig:
    """Video input source configuration."""

    # Path to recorded video file or camera stream URL / device index
    source: str = "/data/parking_sample.mp4"
    # When True, loops the recorded video file upon reaching end-of-file
    loop: bool = True
    # Target frame sampling rate (frames per second) # UNVALIDATED
    target_fps: float = 5.0  # UNVALIDATED: arbitrary frame subsampling rate
    # Read timeout in seconds
    timeout_s: float = 10.0


@dataclass
class ModelConfig:
    """YOLO model and inference configuration."""

    # Model weights location: must be mounted read-only under /models
    model_path: str = "/models/yolo26n.pt"
    # Model architecture / version descriptor
    model_version: str = "yolo26n"
    # Inference image resolution (pixels, square dimension) # UNVALIDATED
    imgsz: int = 640  # UNVALIDATED: standard COCO input size
    # Confidence threshold for object detections # UNVALIDATED
    conf_threshold: float = 0.25  # UNVALIDATED: placeholder detection cutoff
    # Device: 'cpu', 'cuda', 'mps', or device id (e.g. '0')
    device: str = "cpu"
    # Strict privacy requirement: frame/crop persistence must remain disabled
    save_frames: bool = False  # NEVER enable in production
    save_crops: bool = False   # NEVER enable in production
    save_txt: bool = False     # NEVER enable in production


@dataclass
class RoiMappingConfig:
    """ROI polygon mapping configuration for parking bays."""

    # Path to ROI definition JSON file
    roi_file: str = "docs/contracts/roi_mapping.example.json"
    # Minimum overlap ratio to mark a bay as occupied # UNVALIDATED
    occupancy_overlap_threshold: float = 0.30  # UNVALIDATED: placeholder overlap threshold
    # Default confidence for unoccupied bay readings # UNVALIDATED
    unoccupied_confidence: float = 1.0  # UNVALIDATED


@dataclass
class AggregatorConfig:
    """Aggregation intervals and rolling window parameters."""

    # Publishing interval for occupancy telemetry (seconds) # UNVALIDATED
    occupancy_interval_s: int = 10  # UNVALIDATED
    # Publishing interval for crowd telemetry (seconds); must divide 900s (15 min)
    crowd_interval_s: int = 60  # UNVALIDATED: 60 divides 900 evenly
    # Publishing interval for health telemetry (seconds) # UNVALIDATED
    health_interval_s: int = 30  # UNVALIDATED
    # Monitored area in square meters for crowd density calculation
    area_m2: float | None = 150.0  # UNVALIDATED: illustrative monitored scene area


@dataclass
class MqttConfig:
    """MQTT broker connection settings."""

    broker_host: str = "localhost"
    broker_port: int = 8883
    username: str | None = None
    password: str | None = None
    tls: bool = True
    ca_cert: str | None = None
    client_cert: str | None = None
    client_key: str | None = None
    insecure_tls: bool = False
    qos: int = 1  # Mandatory QoS 1 for all ParkSMART telemetry


@dataclass
class EdgeConfig:
    """Root configuration for the ParkSMART Edge AI client."""

    camera_id: str = "c1a1a1a1-1111-4111-8111-111111111111"
    zone_id: str = "a1a1a1a1-1111-4111-8111-111111111111"
    video: VideoSourceConfig = field(default_factory=VideoSourceConfig)
    model: ModelConfig = field(default_factory=ModelConfig)
    roi: RoiMappingConfig = field(default_factory=RoiMappingConfig)
    aggregator: AggregatorConfig = field(default_factory=AggregatorConfig)
    mqtt: MqttConfig = field(default_factory=MqttConfig)

    @classmethod
    def load(cls, config_path: str | Path | None = None) -> EdgeConfig:
        """
        Loads edge configuration from YAML file and environment variable overrides.
        """
        data: dict[str, Any] = {}
        target_path = config_path or os.getenv("EDGE_CONFIG_PATH", "edge/config.yaml")
        p = Path(target_path)
        if p.is_file():
            with open(p, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}

        # Allow top-level overrides from environment
        camera_id = os.getenv("CAMERA_ID", data.get("camera_id", "c1a1a1a1-1111-4111-8111-111111111111"))
        zone_id = os.getenv("ZONE_ID", data.get("zone_id", "a1a1a1a1-1111-4111-8111-111111111111"))

        # Video
        video_data = data.get("video", {})
        video = VideoSourceConfig(
            source=os.getenv("VIDEO_SOURCE", video_data.get("source", "/data/parking_sample.mp4")),
            loop=os.getenv("VIDEO_LOOP", str(video_data.get("loop", "true"))).lower() in ("true", "1", "yes"),
            target_fps=float(os.getenv("TARGET_FPS", video_data.get("target_fps", 5.0))),
            timeout_s=float(os.getenv("VIDEO_TIMEOUT_S", video_data.get("timeout_s", 10.0))),
        )

        # Model
        model_data = data.get("model", {})
        model = ModelConfig(
            model_path=os.getenv("MODEL_PATH", model_data.get("model_path", "/models/yolo26n.pt")),
            model_version=os.getenv("MODEL_VERSION", model_data.get("model_version", "yolo26n")),
            imgsz=int(os.getenv("MODEL_IMGSZ", model_data.get("imgsz", 640))),
            conf_threshold=float(os.getenv("CONF_THRESHOLD", model_data.get("conf_threshold", 0.25))),
            device=os.getenv("TORCH_DEVICE", model_data.get("device", "cpu")),
            save_frames=False,  # Privacy lock: never write frames to disk
            save_crops=False,   # Privacy lock: never write crops to disk
            save_txt=False,     # Privacy lock: never write detection text to disk
        )

        # ROI
        roi_data = data.get("roi", {})
        roi = RoiMappingConfig(
            roi_file=os.getenv("ROI_FILE", roi_data.get("roi_file", "docs/contracts/roi_mapping.example.json")),
            occupancy_overlap_threshold=float(
                os.getenv("OCCUPANCY_OVERLAP_THRESHOLD", roi_data.get("occupancy_overlap_threshold", 0.30))
            ),
            unoccupied_confidence=float(
                os.getenv("UNOCCUPIED_CONFIDENCE", roi_data.get("unoccupied_confidence", 1.0))
            ),
        )

        # Aggregator
        agg_data = data.get("aggregator", {})
        aggregator = AggregatorConfig(
            occupancy_interval_s=int(os.getenv("OCCUPANCY_INTERVAL_S", agg_data.get("occupancy_interval_s", 10))),
            crowd_interval_s=int(os.getenv("CROWD_INTERVAL_S", agg_data.get("crowd_interval_s", 60))),
            health_interval_s=int(os.getenv("HEALTH_INTERVAL_S", agg_data.get("health_interval_s", 30))),
            area_m2=float(os.getenv("CAMERA_AREA_M2", agg_data["area_m2"]))
            if os.getenv("CAMERA_AREA_M2") or "area_m2" in agg_data
            else None,
        )

        # MQTT
        mqtt_data = data.get("mqtt", {})
        mqtt = MqttConfig(
            broker_host=os.getenv("MQTT_HOST", mqtt_data.get("broker_host", "localhost")),
            broker_port=int(os.getenv("MQTT_PORT", mqtt_data.get("broker_port", 8883))),
            username=os.getenv("MQTT_USER", mqtt_data.get("username")),
            password=os.getenv("MQTT_PASSWORD", mqtt_data.get("password")),
            tls=os.getenv("MQTT_TLS", str(mqtt_data.get("tls", "true"))).lower() in ("true", "1", "yes"),
            ca_cert=os.getenv("MQTT_CA_CERT", mqtt_data.get("ca_cert")),
            client_cert=os.getenv("MQTT_CLIENT_CERT", mqtt_data.get("client_cert")),
            client_key=os.getenv("MQTT_CLIENT_KEY", mqtt_data.get("client_key")),
            insecure_tls=os.getenv("MQTT_INSECURE_TLS", str(mqtt_data.get("insecure_tls", "false"))).lower()
            in ("true", "1", "yes"),
            qos=1,  # Strictly QoS 1
        )

        return cls(
            camera_id=camera_id,
            zone_id=zone_id,
            video=video,
            model=model,
            roi=roi,
            aggregator=aggregator,
            mqtt=mqtt,
        )
