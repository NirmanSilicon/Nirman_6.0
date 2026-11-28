"""ParkSMART - Role-Based Access Control Definitions (File 18)."""

from __future__ import annotations

from enum import Enum

from app.errors import ValidationFailed


class Role(str, Enum):
    DRIVER = "driver"
    BUSINESS_OPERATOR = "business_operator"
    MUNICIPAL_ADMIN = "municipal_admin"
    FIELD_OPERATOR = "field_operator"
    SYSTEM_ADMIN = "system_admin"


SELF_REGISTERABLE = frozenset({Role.DRIVER, Role.BUSINESS_OPERATOR, Role.MUNICIPAL_ADMIN})
NEEDS_APPROVAL = frozenset({
    Role.BUSINESS_OPERATOR,
    Role.MUNICIPAL_ADMIN,
    Role.FIELD_OPERATOR,
    Role.SYSTEM_ADMIN,
})


def parse_role(value: str | Role) -> Role:
    """Parses and validates a role string into a Role enum."""
    if isinstance(value, Role):
        return value
    try:
        return Role(str(value).lower())
    except ValueError:
        raise ValidationFailed(f"Unknown role: {value}")


def can_self_register(role: Role) -> bool:
    """Returns True if the role is allowed to be self-selected during registration."""
    return role in SELF_REGISTERABLE


def initial_status(role: Role) -> str:
    """Returns the default initial status: 'approved' for drivers, 'pending' for others."""
    return "approved" if role == Role.DRIVER else "pending"


def require_role_predicate(allowed_roles: set[Role] | frozenset[Role] | list[Role]):
    """Returns a predicate function checking if a user's roles intersect allowed_roles."""
    allowed = set(allowed_roles)

    def predicate(user_roles: set[Role] | frozenset[Role] | list[Role]) -> bool:
        return not set(user_roles).isdisjoint(allowed)

    return predicate
