"""ParkSMART - Unit Tests for Cryptography and Token Primitives (File 197)."""

import uuid
from datetime import UTC, datetime, timedelta

import jwt

try:
    import pytest
except ImportError:
    import contextlib

    class _PytestShim:
        @staticmethod
        def raises(exc):
            @contextlib.contextmanager
            def _cm():
                try:
                    yield
                except exc:
                    pass
                else:
                    raise AssertionError(f"Expected {exc} but nothing was raised")
            return _cm()

    pytest = _PytestShim()  # type: ignore

from app.config import get_settings
from app.core import security
from app.errors import TokenExpired, TokenInvalid, ValidationFailed


def test_hash_password_is_argon2id():
    pwd = "correct-horse-battery"
    h = security.hash_password(pwd)
    assert h.startswith("$argon2id$")
    assert security.verify_password(pwd, h) is True
    assert security.verify_password("wrong-password", h) is False


def test_hash_password_rejects_short_and_long():
    with pytest.raises(ValidationFailed):
        security.hash_password("short")  # < 10 chars
    with pytest.raises(ValidationFailed):
        security.hash_password("a" * 129)  # > 128 chars


def test_verify_password_roundtrip_and_mismatch():
    pwd = "valid-length-password-123"
    h = security.hash_password(pwd)
    assert security.verify_password(pwd, h) is True
    assert security.verify_password("completely-wrong-one", h) is False


def test_verify_password_never_raises_on_garbage_hash():
    assert security.verify_password("any_pass", "not_a_valid_argon2_hash") is False
    assert security.verify_password("any_pass", "") is False


def test_needs_rehash_flag():
    pwd = "valid-password-test-123"
    h = security.hash_password(pwd)
    assert isinstance(security.needs_rehash(h), bool)


def test_access_token_roundtrip_claims():
    user_id = uuid.uuid4()
    roles = ["driver", "business_operator"]
    token = security.create_access_token(user_id, roles)

    claims = security.decode_access_token(token)
    assert claims.sub == user_id
    assert sorted(claims.roles) == sorted(roles)
    assert claims.exp > claims.iat
    assert claims.jti != ""


def test_access_token_expired_raises_token_expired():
    settings = get_settings()
    user_id = uuid.uuid4()
    now_ts = int(datetime.now(UTC).timestamp())
    expired_payload = {
        "sub": str(user_id),
        "roles": ["driver"],
        "iat": now_ts - 3600,
        "exp": now_ts - 1800,  # 30 mins in the past
        "jti": "test_jti",
    }
    expired_token = jwt.encode(expired_payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    with pytest.raises(TokenExpired):
        security.decode_access_token(expired_token)


def test_access_token_alg_none_rejected():
    user_id = uuid.uuid4()
    payload = {
        "sub": str(user_id),
        "roles": ["driver"],
        "iat": int(datetime.now(UTC).timestamp()),
        "exp": int((datetime.now(UTC) + timedelta(minutes=15)).timestamp()),
    }
    none_token = jwt.encode(payload, key="", algorithm="none")
    with pytest.raises(TokenInvalid):
        security.decode_access_token(none_token)


def test_access_token_wrong_secret_invalid():
    user_id = uuid.uuid4()
    payload = {
        "sub": str(user_id),
        "roles": ["driver"],
        "iat": int(datetime.now(UTC).timestamp()),
        "exp": int((datetime.now(UTC) + timedelta(minutes=15)).timestamp()),
        "jti": "jti_123",
    }
    wrong_token = jwt.encode(payload, "wrong-secret-key-that-does-not-match", algorithm="HS256")
    with pytest.raises(TokenInvalid):
        security.decode_access_token(wrong_token)


def test_access_token_missing_exp_invalid():
    settings = get_settings()
    user_id = uuid.uuid4()
    payload = {
        "sub": str(user_id),
        "roles": ["driver"],
        "iat": int(datetime.now(UTC).timestamp()),
        "jti": "jti_123",
    }
    no_exp_token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    with pytest.raises(TokenInvalid):
        security.decode_access_token(no_exp_token)


def test_refresh_token_pair_hash_matches():
    raw, h = security.new_refresh_token()
    assert len(h) == 64
    assert security.hash_refresh_token(raw) == h

    raw2, h2 = security.new_refresh_token()
    assert raw != raw2
    assert h != h2


def test_device_secret_hash_and_constant_time_verify():
    secret = "edge_device_test_secret_12345"
    h = security.hash_device_secret(secret)
    assert len(h) == 64
    assert security.verify_device_secret(secret, h) is True
    assert security.verify_device_secret("tampered_secret", h) is False
