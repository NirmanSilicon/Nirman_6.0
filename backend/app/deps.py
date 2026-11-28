"""ParkSMART - FastAPI Dependency Injection and Security Guards (File 15)."""

from __future__ import annotations

import logging
import uuid
from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass

logger = logging.getLogger("parksmart.deps")

try:
    from fastapi import Depends
    from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
    bearer_scheme = HTTPBearer(auto_error=False)
except ImportError:
    def Depends(f=None):  # type: ignore
        return f
    class HTTPBearer:  # type: ignore
        def __init__(self, *args, **kwargs):
            pass
    class HTTPAuthorizationCredentials:  # type: ignore
        pass
    bearer_scheme = HTTPBearer()

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Role, parse_role
from app.core.security import decode_access_token
from app.db.session import get_session
from app.errors import AccountPending, Forbidden, Unauthorized


@dataclass(frozen=True)
class CurrentUser:
    """Authenticated user context containing immutable ID, approved roles, and account status."""

    id: uuid.UUID
    roles: frozenset[Role]
    status: str


async def get_db() -> AsyncIterator[AsyncSession]:
    """Provides an asynchronous database session for the request scope."""
    async for s in get_session():
        yield s


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    """Authenticates the Bearer JWT token and retrieves fresh user roles from DB."""
    if creds is None:
        raise Unauthorized("Missing bearer token")

    claims = decode_access_token(creds.credentials)

    # Lazy import repository to avoid circular dependency
    from app.modules.users import repository as user_repo

    user = await user_repo.get_user_by_id(db, claims.sub)
    if user is None or not getattr(user, "is_active", True):
        raise Unauthorized("User inactive or account does not exist")

    status = getattr(user, "status", "pending")
    if status == "suspended":
        raise Forbidden("Account suspended")
    if status != "approved":
        raise AccountPending("Account awaiting approval")

    # Roles are always loaded fresh from the database (authoritative check)
    raw_roles = getattr(user, "role_names", frozenset())
    parsed_roles: set[Role] = set()
    for r in raw_roles:
        try:
            parsed_roles.add(parse_role(r))
        except (ValueError, TypeError) as exc:
            logger.debug("Ignoring unrecognized role %r for user %s: %s", r, user.id, exc)

    return CurrentUser(
        id=user.id,
        roles=frozenset(parsed_roles),
        status=status,
    )


def require_roles(*allowed: Role) -> Callable:
    """Returns a dependency ensuring the caller has at least one of the specified roles."""
    allowed_set = frozenset(allowed)

    async def _guard(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.roles.isdisjoint(allowed_set):
            raise Forbidden(
                "Insufficient role",
                {"required": sorted([r.value for r in allowed_set])},
            )
        return user

    return _guard
