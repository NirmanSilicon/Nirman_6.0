"""ParkSMART - In-Process Rate Limiter Middleware (File 19)."""

from __future__ import annotations

import math
import time
from collections.abc import Callable
from typing import Any

try:
    from starlette.middleware.base import BaseHTTPMiddleware
    from starlette.requests import Request
    from starlette.responses import JSONResponse, Response
except ImportError:
    class BaseHTTPMiddleware:  # type: ignore
        def __init__(self, app: Any) -> None:
            self.app = app
    class Request:  # type: ignore
        pass
    class Response:  # type: ignore
        pass
    class JSONResponse:  # type: ignore
        pass

from app.errors import envelope

# Stricter route-specific rate limits (requests per minute)
ROUTE_LIMITS: dict[str, int] = {
    "/api/v1/auth/login": 10,
    "/api/v1/auth/register": 5,
}


class RateLimitExceeded(Exception):
    """Raised when request quota is exceeded."""

    def __init__(self, message: str = "Rate limit exceeded", retry_after: int = 1):
        super().__init__(message)
        self.retry_after = retry_after


class InMemoryRateLimiter:
    """Sliding-window in-memory rate limiter for testing and component enforcement."""

    def __init__(self) -> None:
        self.history: dict[str, list[float]] = {}

    def hit(self, key: str, max_requests: int = 60, window_seconds: float = 60.0) -> None:
        now = time.time()
        timestamps = self.history.get(key, [])
        cutoff = now - window_seconds
        valid_ts = [t for t in timestamps if t > cutoff]
        if len(valid_ts) >= max_requests:
            retry_after = max(1, math.ceil(window_seconds - (now - valid_ts[0])))
            raise RateLimitExceeded(retry_after=retry_after)
        valid_ts.append(now)
        self.history[key] = valid_ts


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Token-bucket rate limiter middleware enforcing per-IP quotas."""

    def __init__(self, app: Any, limit_per_min: int = 120) -> None:
        super().__init__(app)
        self.default_limit = limit_per_min
        # key -> (tokens: float, last_ts: float)
        self.buckets: dict[str, tuple[float, float]] = {}
        self.request_count = 0

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path

        # Exempt liveness and readiness probes
        if path in ("/healthz", "/readyz"):
            return await call_next(request)

        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            client_host = forwarded.split(",")[0].strip()
        else:
            client_host = request.client.host if request.client else "unknown"
        limit = ROUTE_LIMITS.get(path, self.default_limit)
        bucket_key = f"{client_host}:{path if path in ROUTE_LIMITS else 'global'}"

        now = time.monotonic()
        self.request_count += 1
        if self.request_count >= 1000:
            self._evict_stale(now)
            self.request_count = 0

        tokens, last_ts = self.buckets.get(bucket_key, (float(limit), now))
        # Refill tokens based on elapsed time
        elapsed = now - last_ts
        refill = elapsed * (limit / 60.0)
        tokens = min(float(limit), tokens + refill)

        if tokens >= 1.0:
            self.buckets[bucket_key] = (tokens - 1.0, now)
            return await call_next(request)

        # Rate limit exceeded
        retry_after = max(1, math.ceil((1.0 - tokens) * 60.0 / limit))
        resp_content = envelope(
            "RATE_LIMITED",
            "Too many requests, please slow down",
            {"retry_after_s": retry_after},
        )
        return JSONResponse(
            status_code=429,
            content=resp_content,
            headers={"Retry-After": str(retry_after)},
        )

    def _evict_stale(self, now: float) -> None:
        """Evicts entries idle for more than 10 minutes (600s) to bound memory."""
        stale_cutoff = now - 600.0
        keys_to_remove = [k for k, (_, last_ts) in self.buckets.items() if last_ts < stale_cutoff]
        for k in keys_to_remove:
            del self.buckets[k]
