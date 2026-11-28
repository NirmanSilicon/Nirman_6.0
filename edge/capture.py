"""
ParkSMART - Video Stream and File Capture (File 150 / M2 Ownership)

Responsibility:
Safely opens and decodes recorded video files (or RTSP streams), handles looping,
throttles to target FPS, gracefully handles missing or unreadable video sources,
and guarantees clean resource release without memory or file descriptor leaks.
Privacy rule: No camera frames are ever written to disk.
"""

from __future__ import annotations

import logging
import time
from collections.abc import Iterator
from pathlib import Path
from types import TracebackType
from typing import Any, Self

logger = logging.getLogger("parksmart.edge.capture")

try:
    import cv2
    HAS_OPENCV = True
except ImportError:
    cv2 = None  # type: ignore
    HAS_OPENCV = False


class VideoCaptureSource:
    """
    Encapsulates video capture from a local recorded file or RTSP stream.
    Safely releases video resources and handles looping.
    """

    def __init__(
        self,
        source: str | int,
        loop: bool = True,
        target_fps: float = 5.0,  # UNVALIDATED frame sampling rate
    ):
        self.source = source
        self.loop = loop
        self.target_fps = max(0.1, float(target_fps))
        self._cap: Any = None
        self._frame_count: int = 0
        self._is_opened: bool = False
        self._total_frames: int = 0
        self._fps: float = 30.0
        self._custom_frame_provider: Iterator[Any] | None = None

    def set_custom_frame_provider(self, provider: Iterator[Any]) -> None:
        """Allows injecting synthetic/mock frames for testing without OpenCV."""
        self._custom_frame_provider = provider
        self._is_opened = True

    def open(self) -> None:
        """
        Opens the video source.
        Raises FileNotFoundError if source is a file path that does not exist.
        Raises ValueError if the video source file is empty (0 bytes).
        Raises RuntimeError if the video file or stream cannot be opened.
        """
        if self._custom_frame_provider is not None:
            self._is_opened = True
            return

        # Check if source is a synthetic/simulator keyword
        if isinstance(self.source, str) and self.source.lower() in ("synthetic", "simulator", "mock"):
            self._is_opened = True
            return

        # Check if source is a file path
        if isinstance(self.source, str) and not self.source.startswith(("rtsp://", "http://", "https://")):
            src_path = Path(self.source)
            if not src_path.is_file():
                raise FileNotFoundError(
                    f"Video source file not found: {self.source}. "
                    "Ensure the video file is mounted and readable."
                )
            if src_path.stat().st_size == 0:
                raise ValueError(
                    f"Video source file is empty (0 bytes): {self.source}. "
                    "Ensure a valid non-empty recorded video file is supplied."
                )

        if not HAS_OPENCV:
            raise RuntimeError(
                "OpenCV (cv2) is not installed in the current environment. "
                "Install opencv-python-headless or provide a custom frame provider for testing."
            )

        self._cap = cv2.VideoCapture(self.source)
        if not self._cap.isOpened():
            self.release()
            raise RuntimeError(
                f"Failed to open video source: {self.source}. "
                "File may be corrupt, unreadable, or encoded with an unsupported codec."
            )

        self._is_opened = True
        self._total_frames = int(self._cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        detected_fps = float(self._cap.get(cv2.CAP_PROP_FPS) or 0.0)
        if detected_fps > 0:
            self._fps = detected_fps
        logger.info(
            "Opened video source: %s (total_frames=%d, fps=%.2f, target_fps=%.2f, loop=%s)",
            self.source,
            self._total_frames,
            self._fps,
            self.target_fps,
            self.loop,
        )

    def is_opened(self) -> bool:
        """Returns True if the capture source is actively open."""
        return self._is_opened

    def read_frame(self) -> tuple[bool, Any | None, int]:
        """
        Reads the next frame from the video source.

        Returns:
            (success, frame_data, frame_index)
            If EOF is reached and loop is True, restarts from frame 0.
            If EOF is reached and loop is False, returns (False, None, frame_index).
        """
        if not self._is_opened:
            return False, None, self._frame_count

        # Custom frame provider (used for test harness)
        if self._custom_frame_provider is not None:
            try:
                frame = next(self._custom_frame_provider)
                self._frame_count += 1
                return True, frame, self._frame_count
            except StopIteration:
                if self.loop:
                    # In a loop, test provider should either cycle or stop
                    return False, None, self._frame_count
                return False, None, self._frame_count

        if not HAS_OPENCV or self._cap is None:
            return False, None, self._frame_count

        ret, frame = self._cap.read()
        if not ret:
            if self.loop and self._total_frames > 0:
                logger.info("Reached EOF on video source %s; looping back to frame 0.", self.source)
                self._cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = self._cap.read()
                if not ret:
                    logger.warning("Failed to reread video frame after loop reset.")
                    return False, None, self._frame_count
            else:
                logger.info("Reached end of video stream %s.", self.source)
                return False, None, self._frame_count

        self._frame_count += 1
        return True, frame, self._frame_count

    def frames(self) -> Iterator[tuple[Any, int]]:
        """
        Generator yielding (frame, frame_idx) throttled according to target_fps.
        """
        frame_interval_s = 1.0 / self.target_fps
        last_yield_time = 0.0

        while self._is_opened:
            now = time.time()
            elapsed = now - last_yield_time
            if elapsed < frame_interval_s:
                time.sleep(max(0.001, frame_interval_s - elapsed))

            success, frame, idx = self.read_frame()
            if not success or frame is None:
                break

            last_yield_time = time.time()
            yield frame, idx

    def release(self) -> None:
        """Safely closes and releases the video capture resource."""
        if self._cap is not None:
            try:
                self._cap.release()
                logger.info("Released VideoCapture resource for source: %s", self.source)
            except (OSError, RuntimeError, AttributeError) as e:
                logger.error("Error releasing VideoCapture resource: %s", e)
            finally:
                self._cap = None
        self._is_opened = False
        self._custom_frame_provider = None

    def __enter__(self) -> Self:
        self.open()
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        self.release()
