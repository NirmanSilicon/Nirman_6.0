"""
ParkSMART - Edge Vision Client Pipeline Runner (File 149 / M2 Ownership)

Responsibility:
Coordinates video capture, YOLO26 detection, bay ROI mapping, object counting,
telemetry aggregation, and MQTT publishing.
Zero camera frames or crops are ever saved to disk.
All numeric thresholds are explicit UNVALIDATED placeholders.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import signal
from typing import Any

from edge.aggregator import TelemetryAggregator
from edge.bay_mapper import BayMapper
from edge.capture import VideoCaptureSource
from edge.config import UNVALIDATED_NOTICE, EdgeConfig
from edge.counter import ObjectCounter
from edge.detector import YoloDetector
from edge.publisher import EdgeTelemetryPublisher

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
)
logger = logging.getLogger("parksmart.edge.main")


async def run_edge_pipeline(
    config: EdgeConfig,
    dry_run: bool = False,
    max_frames: int = 0,  # 0 = infinite
    mock_detector: Any | None = None,
) -> None:
    """
    Executes the edge pipeline loop.
    """
    logger.info("Initializing ParkSMART Edge AI Pipeline...")
    logger.info(UNVALIDATED_NOTICE)

    # 1. Initialize Video Capture
    capture = VideoCaptureSource(
        source=config.video.source,
        loop=config.video.loop,
        target_fps=config.video.target_fps,
    )

    # 2. Initialize YOLO Detector
    detector = YoloDetector(
        model_path=config.model.model_path,
        model_version=config.model.model_version,
        imgsz=config.model.imgsz,
        conf_threshold=config.model.conf_threshold,
        device=config.model.device,
        mock_model=mock_detector,
    )

    # 3. Initialize Bay Mapper
    bay_mapper = BayMapper(
        roi_mapping_path=config.roi.roi_file,
        overlap_threshold=config.roi.occupancy_overlap_threshold,
        unoccupied_confidence=config.roi.unoccupied_confidence,
    )

    # 4. Initialize Object Counter
    counter = ObjectCounter(area_m2=config.aggregator.area_m2)

    # 5. Initialize Aggregator
    aggregator = TelemetryAggregator(
        camera_id=config.camera_id,
        zone_id=config.zone_id,
        occupancy_interval_s=config.aggregator.occupancy_interval_s,
        crowd_interval_s=config.aggregator.crowd_interval_s,
        health_interval_s=config.aggregator.health_interval_s,
        model_version=config.model.model_version,
    )

    # 6. Initialize Telemetry Publisher
    publisher = EdgeTelemetryPublisher(
        config=config.mqtt,
        camera_id=config.camera_id,
        zone_id=config.zone_id,
        dry_run=dry_run,
    )

    shutdown_event = asyncio.Event()

    def handle_signal() -> None:
        logger.info("Shutdown signal received; initiating clean pipeline shutdown...")
        shutdown_event.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, handle_signal)
        except (NotImplementedError, AttributeError):
            # Windows signal handler fallback
            pass

    try:
        # Start capture and publisher
        capture.open()
        await publisher.start()

        # Publish initial online health message
        init_health = aggregator.build_health_payload(state="online")
        await publisher.publish_health(init_health)

        logger.info("Edge AI pipeline started. Entering frame inference loop...")
        frames_processed = 0

        while not shutdown_event.is_set():
            # Check frame limit if configured
            if max_frames > 0 and frames_processed >= max_frames:
                logger.info("Processed target maximum frames (%d); ending pipeline run.", max_frames)
                break

            success, frame, frame_idx = capture.read_frame()
            if not success or frame is None:
                if not config.video.loop:
                    logger.info("End of video stream reached.")
                    break
                # Transient wait before reread
                await asyncio.sleep(0.05)
                continue

            frames_processed += 1

            # 1. Run inference (NMS-free, zero disk saving)
            detections = detector.detect(frame)

            # 2. Map vehicle detections to bays
            # Standard resolution fallback if frame shape unavailable
            h, w = (getattr(frame, "shape", (1080, 1920))[:2]) if hasattr(frame, "shape") else (1080, 1920)
            bay_readings = bay_mapper.map_detections(detections, frame_width=w, frame_height=h)

            # 3. Count vehicles and pedestrians separately
            crowd_counts = counter.count(detections)

            # 4. Record observations in aggregator
            aggregator.record_frame(bay_readings, crowd_counts, frame_idx)

            # 5. Check and publish telemetry intervals
            if aggregator.should_publish_occupancy():
                occ_payload = aggregator.build_occupancy_payload()
                await publisher.publish_occupancy(occ_payload)

            if aggregator.should_publish_crowd():
                crowd_payload = aggregator.build_crowd_payload()
                await publisher.publish_crowd(crowd_payload)

            if aggregator.should_publish_health():
                health_payload = aggregator.build_health_payload(state="online")
                await publisher.publish_health(health_payload)

            # Yield control to event loop
            await asyncio.sleep(0.001)

    except Exception as e:
        logger.exception("Edge pipeline encountered unexpected exception")
        aggregator.record_error(str(e))
        err_health = aggregator.build_health_payload(state="degraded")
        await publisher.publish_health(err_health)
        raise
    finally:
        logger.info("Stopping edge pipeline and releasing resources...")
        capture.release()
        await publisher.stop()
        logger.info("Edge pipeline shutdown cleanly.")


def main() -> None:
    parser = argparse.ArgumentParser(description="ParkSMART Edge AI Vision Client Runner")
    parser.add_argument("--config", type=str, default=None, help="Path to edge config YAML file")
    parser.add_argument("--video", type=str, default=None, help="Path to video file or stream URL (overrides config)")
    parser.add_argument("--weights", "--model-path", dest="weights", type=str, default=None, help="Path to model weights (overrides config)")
    parser.add_argument("--mock", action="store_true", help="Run with mock YOLO detector adapter for testing")
    parser.add_argument("--dry-run", action="store_true", help="Run without connecting to MQTT broker")
    parser.add_argument("--frames", type=int, default=0, help="Stop after N frames (0 = infinite)")
    args = parser.parse_args()

    cfg = EdgeConfig.load(args.config)
    if args.video:
        cfg.video.source = args.video
    if args.weights:
        cfg.model.model_path = args.weights

    mock_detector = None
    if args.mock:
        try:
            from scripts.verify_edge_pipeline import MockTestModel
            mock_detector = MockTestModel()
        except ImportError:
            class _ContainerMockModel:
                def __init__(self) -> None:
                    self.names = {
                        0: "person",
                        1: "bicycle",
                        2: "car",
                        3: "motorcycle",
                        4: "airplane",
                        5: "bus",
                        6: "train",
                        7: "truck",
                    }

                def predict(self, **kwargs: object) -> list[Any]:
                    return []

            mock_detector = _ContainerMockModel()

    asyncio.run(run_edge_pipeline(cfg, dry_run=args.dry_run, max_frames=args.frames, mock_detector=mock_detector))


if __name__ == "__main__":
    main()
