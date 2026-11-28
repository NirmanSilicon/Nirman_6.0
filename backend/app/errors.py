"""ParkSMART - Error Taxonomy and Response Envelope (File 14)."""

from __future__ import annotations

import logging
from typing import Any

try:
    from fastapi import FastAPI, Request
    from fastapi.exceptions import RequestValidationError
    from fastapi.responses import JSONResponse
except ImportError:
    class FastAPI:  # type: ignore
        pass
    class Request:  # type: ignore
        pass
    class RequestValidationError(Exception):  # type: ignore
        pass
    class JSONResponse:  # type: ignore
        def __init__(self, status_code: int, content: Any, headers: Any = None):
            self.status_code = status_code
            self.content = content
            self.headers = headers

from app.logging_config import request_id_var

logger = logging.getLogger(__name__)


def envelope(code: str, message: str, details: Any | None = None) -> dict[str, Any]:
    """Builds the canonical ParkSMART error envelope."""
    req_id = request_id_var.get()
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details,
            "request_id": req_id if req_id != "-" else "req_unknown",
        }
    }


class AppError(Exception):
    """Base application exception mapped to standard error envelope."""

    def __init__(
        self,
        status: int,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details


class ValidationFailed(AppError):
    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(422, "VALIDATION_ERROR", message, details)


class Unauthorized(AppError):
    def __init__(self, message: str = "Authentication required", details: dict[str, Any] | None = None) -> None:
        super().__init__(401, "AUTH_REQUIRED", message, details)


class InvalidCredentials(AppError):
    def __init__(self, message: str = "Invalid email or password", details: dict[str, Any] | None = None) -> None:
        super().__init__(401, "AUTH_INVALID_CREDENTIALS", message, details)


class TokenExpired(AppError):
    def __init__(self, message: str = "Access token expired", details: dict[str, Any] | None = None) -> None:
        super().__init__(401, "AUTH_TOKEN_EXPIRED", message, details)


class TokenInvalid(AppError):
    def __init__(self, message: str = "Access token invalid", details: dict[str, Any] | None = None) -> None:
        super().__init__(401, "AUTH_TOKEN_INVALID", message, details)


class Forbidden(AppError):
    def __init__(self, message: str = "Forbidden", details: dict[str, Any] | None = None) -> None:
        super().__init__(403, "FORBIDDEN", message, details)


class AccountPending(AppError):
    def __init__(self, message: str = "Account awaiting approval", details: dict[str, Any] | None = None) -> None:
        super().__init__(403, "ACCOUNT_PENDING_APPROVAL", message, details)


class NotFound(AppError):
    def __init__(self, message: str = "Resource not found", details: dict[str, Any] | None = None) -> None:
        super().__init__(404, "NOT_FOUND", message, details)


class Conflict(AppError):
    def __init__(self, message: str = "Resource conflict", details: dict[str, Any] | None = None) -> None:
        super().__init__(409, "CONFLICT", message, details)


class BookingOverlap(AppError):
    def __init__(self, message: str = "No bay available for requested time", details: dict[str, Any] | None = None) -> None:
        super().__init__(409, "BOOKING_OVERLAP", message, details)


class RateLimited(AppError):
    def __init__(self, message: str = "Too many requests", details: dict[str, Any] | None = None) -> None:
        super().__init__(429, "RATE_LIMITED", message, details)


class ServiceUnavailable(AppError):
    def __init__(self, message: str = "Service temporarily unavailable", details: dict[str, Any] | None = None, code: str = "SERVICE_UNAVAILABLE") -> None:
        super().__init__(503, code, message, details)


class NotImplemented(AppError):
    def __init__(self, message: str = "Feature not implemented in this prototype", details: dict[str, Any] | None = None) -> None:
        super().__init__(501, "NOT_IMPLEMENTED", message, details)


def register_handlers(app: FastAPI) -> None:
    """Registers exception handlers for custom errors, validation errors, and uncaught exceptions."""

    @app.exception_handler(AppError)
    async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
        headers = {}
        if exc.status == 429 and exc.details and "retry_after_s" in exc.details:
            headers["Retry-After"] = str(exc.details["retry_after_s"])
        return JSONResponse(
            status_code=exc.status,
            content=envelope(exc.code, exc.message, exc.details),
            headers=headers or None,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        fields = []
        for err in exc.errors():
            loc = [str(x) for x in err.get("loc", [])]
            msg = err.get("msg", "Invalid value")
            fields.append({"loc": loc, "msg": msg})
        return JSONResponse(
            status_code=422,
            content=envelope("VALIDATION_ERROR", "Request validation failed", {"fields": fields}),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled server exception occurred: %s", str(exc))
        return JSONResponse(
            status_code=500,
            content=envelope("INTERNAL_ERROR", "Internal server error", None),
        )
