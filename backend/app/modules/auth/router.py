"""ParkSMART - Authentication Endpoints Router (File 53)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.errors import AppError
from app.modules.auth import service
from app.schemas.auth import (
    LoginRequest,
    LogoutRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
    UserOut,
)

router = APIRouter()


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    """Registers a new user account."""
    return await service.register(db, body)


@router.post("/login", response_model=TokenPair, status_code=status.HTTP_200_OK)
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenPair:
    """Authenticates credentials and returns JWT access + rotating refresh tokens."""
    return await service.login(db, body)


@router.post("/refresh", response_model=TokenPair, status_code=status.HTTP_200_OK)
async def refresh_tokens(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenPair:
    """Exchanges an active refresh token for a newly rotated token pair."""
    return await service.refresh(db, body.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def logout(
    body: LogoutRequest,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Revokes the given refresh token."""
    await service.logout(db, body.refresh_token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/password-reset/request", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def password_reset_request(body: PasswordResetRequest) -> None:
    """Placeholder for password reset request (unconfigured in hackathon prototype)."""
    raise AppError(
        status=501,
        code="NOT_IMPLEMENTED",
        message="Password reset is not available in this prototype: no email or SMS channel is configured",
    )


@router.post("/password-reset/confirm", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def password_reset_confirm(body: PasswordResetConfirm) -> None:
    """Placeholder for password reset confirmation."""
    raise AppError(
        status=501,
        code="NOT_IMPLEMENTED",
        message="Password reset is not available in this prototype: no email or SMS channel is configured",
    )
