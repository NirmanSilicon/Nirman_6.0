"""Browser cameras: frames pushed to the server over a WebSocket.

A hosted server cannot open a camera plugged into someone's laptop or phone.
The browser can, so the ``/send`` page captures the camera the user picks and
posts JPEG frames to ``/ws/push/<belt>``. Each belt gets a channel here; the
pipeline reads it through :class:`PushSource`, exactly as it reads any other
camera, so detection, incidents and the belt's QR page work unchanged.

The channel is one frame deep, like the frame slot in pipeline/capture.py: a
newer frame replaces one nobody has read yet, so a slow detector drops frames
instead of building a backlog.
"""
from __future__ import annotations

import threading
import time

import numpy as np

from .base import FrameSource, SourceError, SourceInfo

SCHEME = "push"
# How long opening a push source waits for the sender's first frame.
FIRST_FRAME_TIMEOUT = 15.0
# How long one read() waits before reporting "no frame yet". The capture
# thread tolerates 30 misses in a row, so a sender can stall ~30 s (a phone
# switching networks) before the session is declared over.
READ_TIMEOUT = 1.0


class PushChannel:
    """The hand-off between one sender's WebSocket and one belt's pipeline."""

    def __init__(self, belt_id: str, label: str) -> None:
        self.belt_id = belt_id
        self.label = label
        self.connected_at = time.time()
        self._cond = threading.Condition()
        self._image: np.ndarray | None = None
        self._seq = 0
        self._closed = False
        self._arrivals: list[float] = []

    def put(self, image: np.ndarray) -> None:
        with self._cond:
            self._image = image
            self._seq += 1
            now = time.monotonic()
            self._arrivals.append(now)
            while self._arrivals and self._arrivals[0] < now - 3.0:
                self._arrivals.pop(0)
            self._cond.notify_all()

    def close(self) -> None:
        with self._cond:
            self._closed = True
            self._cond.notify_all()

    @property
    def closed(self) -> bool:
        return self._closed

    @property
    def fps(self) -> float:
        with self._cond:
            if len(self._arrivals) < 2:
                return 0.0
            span = self._arrivals[-1] - self._arrivals[0]
            return (len(self._arrivals) - 1) / span if span > 0 else 0.0

    def wait(self, last_seq: int, timeout: float) -> tuple[int, np.ndarray] | None:
        deadline = time.monotonic() + timeout
        with self._cond:
            while not self._closed and (self._image is None or self._seq <= last_seq):
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    return None
                self._cond.wait(remaining)
            if self._closed or self._image is None:
                return None
            return self._seq, self._image


_channels: dict[str, PushChannel] = {}
_lock = threading.Lock()


def open_channel(belt_id: str, label: str) -> PushChannel:
    """Register a sender for a belt, displacing any earlier one."""
    channel = PushChannel(belt_id, label)
    with _lock:
        previous = _channels.get(belt_id)
        _channels[belt_id] = channel
    if previous is not None:
        previous.close()
    return channel


def release_channel(channel: PushChannel) -> bool:
    """Close a sender's channel. True if it was still the belt's current one."""
    channel.close()
    with _lock:
        if _channels.get(channel.belt_id) is channel:
            del _channels[channel.belt_id]
            return True
    return False


def get_channel(belt_id: str) -> PushChannel | None:
    with _lock:
        return _channels.get(belt_id)


def uri_for(belt_id: str) -> str:
    return f"{SCHEME}://{belt_id}"


class PushSource(FrameSource):
    def __init__(self, belt_id: str) -> None:
        self._belt_id = belt_id
        self._channel: PushChannel | None = None
        self._info: SourceInfo | None = None
        self._last = 0

    def open(self) -> SourceInfo:
        channel = get_channel(self._belt_id)
        if channel is None:
            raise SourceError(
                f"No browser is sending a camera for {self._belt_id}. "
                "Open the Camera sender page on the device with the camera.")
        first = channel.wait(0, FIRST_FRAME_TIMEOUT)
        if first is None:
            raise SourceError("The browser camera sent no frames")
        self._last, image = first
        self._channel = channel
        h, w = image.shape[:2]
        self._info = SourceInfo(
            uri=uri_for(self._belt_id), kind="browser",
            label=channel.label or "Browser camera",
            fps=10.0, width=int(w), height=int(h), is_live=True,
        )
        return self._info

    def read(self) -> np.ndarray | None:
        channel = self._channel
        if channel is None:
            return None
        if channel.closed:
            raise SourceError("The browser camera disconnected")
        got = channel.wait(self._last, READ_TIMEOUT)
        if got is None:
            if channel.closed:
                raise SourceError("The browser camera disconnected")
            return None
        self._last, image = got
        return image

    def close(self) -> None:
        self._channel = None

    @property
    def info(self) -> SourceInfo:
        if self._info is None:
            raise SourceError("Source has not been opened")
        return self._info
