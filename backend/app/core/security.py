"""ParkSMART - Cryptography, Tokens, and Secret Primitives (File 17)."""

from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import Argon2Error, InvalidHashError, VerifyMismatchError

from app.config import get_settings
from app.core.clock import utcnow
from app.errors import TokenExpired, TokenInvalid, ValidationFailed

PASSWORD_MIN_LEN = 10
PASSWORD_MAX_LEN = 128
_ph = PasswordHasher()


@dataclass(frozen=True)
class TokenClaims:
    sub: uuid.UUID
    roles: list[str]
    exp: datetime
    iat: datetime
    jti: str


def hash_password(plain: str) -> str:
    """Hashes a plaintext password using Argon2id."""
    if len(plain) < PASSWORD_MIN_LEN or len(plain) > PASSWORD_MAX_LEN:
        raise ValidationFailed(f"Password must be between {PASSWORD_MIN_LEN} and {PASSWORD_MAX_LEN} characters")
    return _ph.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Verifies a password against an Argon2id hash. Never raises."""
    try:
        return _ph.verify(hashed, plain)
    except (VerifyMismatchError, InvalidHashError, Argon2Error, ValueError, TypeError):
        return False


def needs_rehash(hashed: str) -> bool:
    """Checks whether the password hash needs updating to newer parameters."""
    try:
        return _ph.check_needs_rehash(hashed)
    except (Argon2Error, ValueError, TypeError):
        return False


def create_access_token(user_id: uuid.UUID | str, roles: list[str]) -> str:
    """Creates a signed JWT access token."""
    settings = get_settings()
    now = utcnow()
    expire = now + timedelta(minutes=settings.access_ttl_min)
    jti = uuid.uuid4().hex

    payload: dict[str, Any] = {
        "sub": str(user_id),
        "roles": sorted(roles),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "jti": jti,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> TokenClaims:
    """Decodes and validates a JWT access token."""
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            options={"require": ["exp", "iat", "sub"]},
        )
        sub_uuid = uuid.UUID(str(payload["sub"]))
        exp_dt = datetime.fromtimestamp(payload["exp"], tz=UTC)
        iat_dt = datetime.fromtimestamp(payload["iat"], tz=UTC)
        roles = payload.get("roles", [])
        jti = payload.get("jti", "")
        return TokenClaims(sub=sub_uuid, roles=roles, exp=exp_dt, iat=iat_dt, jti=jti)
    except jwt.ExpiredSignatureError:
        raise TokenExpired("Access token expired")
    except (jwt.PyJWTError, ValueError, TypeError, KeyError, OverflowError) as e:
        raise TokenInvalid("Access token invalid") from e


def new_refresh_token() -> tuple[str, str]:
    """Generates an opaque refresh token and its SHA-256 hash. Returns (raw, hash)."""
    raw = secrets.token_urlsafe(48)
    return raw, hash_refresh_token(raw)


def hash_refresh_token(raw: str) -> str:
    """Returns SHA-256 hex digest of a refresh token."""
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def hash_device_secret(raw: str) -> str:
    """Returns SHA-256 hex digest of an edge device secret."""
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def verify_device_secret(raw: str, stored_hash: str) -> bool:
    """Verifies a device secret against stored hash using constant-time comparison."""
    computed_hash = hash_device_secret(raw)
    return hmac.compare_digest(computed_hash, stored_hash)
