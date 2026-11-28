"""ParkSMART - User Profile and Directory Router (File 57)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Role
from app.deps import CurrentUser, get_current_user, get_db, require_roles
from app.modules.users import service
from app.schemas.auth import PasswordChange, UserOut, UserUpdate
from app.schemas.common import Page

router = APIRouter()


@router.get("/me", response_model=UserOut)
async def get_my_profile(
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    """Retrieves profile of the currently authenticated user."""
    return await service.get_profile(db, current.id)


@router.patch("/me", response_model=UserOut)
async def update_my_profile(
    body: UserUpdate,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    """Updates editable profile fields (full name, phone) of the current user."""
    return await service.update_profile(db, current.id, body)


@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def change_my_password(
    body: PasswordChange,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Changes password for the current user and invalidates all existing sessions."""
    await service.change_password(db, current.id, body)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("", response_model=Page[UserOut])
async def list_users_directory(
    status_filter: str | None = Query(default=None, alias="status"),
    role_filter: str | None = Query(default=None, alias="role"),
    q: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN)),
) -> Page[UserOut]:
    """Administrator endpoint to search and filter user accounts."""
    return await service.list_users(
        db,
        status=status_filter,
        role=role_filter,
        q=q,
        limit=limit,
        offset=offset,
    )


@router.get("/{user_id}", response_model=UserOut)
async def get_user_by_id(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN)),
) -> UserOut:
    """Administrator endpoint to retrieve user details by UUID."""
    return await service.get_profile(db, user_id)
