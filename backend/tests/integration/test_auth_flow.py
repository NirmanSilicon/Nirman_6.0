"""
ParkSMART Integration Tests: Authentication, User Lifecycle, and Session Security (File 203)

Covers M1 Authentication & Session Management:
1. Registration:
   - Driver self-registration (status=approved, role=driver)
   - Business operator self-registration (status=pending, auto-creates pending business)
   - Disallowed roles (municipal_admin, system_admin) fail with 403 Forbidden
   - Duplicate email fails with 409 Conflict
2. Login & Credentials:
   - Successful login returns TokenPair (access_token, refresh_token, token_type, expires_in)
   - Invalid password fails with 401 InvalidCredentials
   - Non-existent user fails with 401 InvalidCredentials (timing-safe dummy hash)
   - Pending user cannot login (403 AccountPending)
   - Suspended user cannot login (403 Forbidden)
3. Refresh Token Rotation & Theft / Family Revocation:
   - Valid refresh token rotates (old revoked, new pair issued)
   - Token reuse detection: presenting an already-revoked token revokes entire family of tokens and returns 401
   - Expired refresh token returns 401 TokenInvalid
4. Logout:
   - Idempotently revokes the refresh token
5. Role Guards & RBAC:
   - Endpoint authorization verification across roles (driver vs operator vs admin)
6. Rate Limiting:
   - Sliding window rate limit enforces burst thresholds and returns 429 Too Many Requests
"""

from __future__ import annotations

import asyncio
import sys
import unittest
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

root_dir = Path(__file__).resolve().parent.parent.parent.parent
backend_dir = root_dir / "backend"
for p in (str(root_dir), str(backend_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

from app.core.clock import set_now, utcnow
from app.core.rate_limit import InMemoryRateLimiter, RateLimitExceeded
from app.core.rbac import Role
from app.core.security import (
    decode_access_token,
    hash_password,
    new_refresh_token,
)
from app.errors import (
    AccountPending,
    Conflict,
    Forbidden,
    InvalidCredentials,
    TokenInvalid,
)
from app.modules.auth import service as auth_service
from app.schemas.auth import LoginRequest, RegisterRequest, TokenPair


class MockUserRole:
    def __init__(self, role_name: str):
        self.role = MagicMock()
        self.role.name = role_name


class MockUser:
    def __init__(
        self,
        id: uuid.UUID | None = None,
        email: str = "test@parksmart.demo",
        password_hash: str = "",
        full_name: str = "Test User",
        phone: str | None = None,
        status: str = "approved",
        is_active: bool = True,
        roles: list[str] | None = None,
    ):
        self.id = id or uuid.uuid4()
        self.email = email
        self.password_hash = password_hash
        self.full_name = full_name
        self.phone = phone
        self.status = status
        self.is_active = is_active
        self.created_at = utcnow()
        self.updated_at = utcnow()
        role_names = roles or ["driver"]
        self.user_roles = [MockUserRole(r) for r in role_names]


class MockRefreshToken:
    def __init__(
        self,
        user_id: uuid.UUID,
        token_hash: str,
        expires_at: datetime,
        revoked_at: datetime | None = None,
    ):
        self.id = uuid.uuid4()
        self.user_id = user_id
        self.token_hash = token_hash
        self.expires_at = expires_at
        self.revoked_at = revoked_at
        self.created_at = utcnow()


class MockAuthDatabase:
    """In-memory database simulation for full authentication integration tests."""

    def __init__(self):
        self.users: dict[uuid.UUID, MockUser] = {}
        self.users_by_email: dict[str, MockUser] = {}
        self.refresh_tokens: dict[str, MockRefreshToken] = {}  # token_hash -> row
        self.businesses: dict[uuid.UUID, Any] = {}
        self.audit_logs: list[dict] = []

    def add_user(self, user: MockUser):
        self.users[user.id] = user
        self.users_by_email[user.email.lower()] = user

    async def get_user_by_email(self, db, email: str):
        return self.users_by_email.get(email.lower())

    async def get_user_by_id(self, db, user_id: uuid.UUID):
        return self.users.get(user_id)

    async def create_user(self, db, email: str, password_hash: str, full_name: str, status: str, role: Role):
        if email.lower() in self.users_by_email:
            raise Conflict("Email already registered")
        user = MockUser(
            email=email,
            password_hash=password_hash,
            full_name=full_name,
            status=status,
            roles=[role.value],
        )
        self.add_user(user)
        return user

    async def insert_refresh_token(self, db, user_id: uuid.UUID, token_hash: str, expires_at: datetime):
        row = MockRefreshToken(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
        self.refresh_tokens[token_hash] = row
        return row

    async def get_refresh_token_for_update(self, db, token_hash: str):
        return self.refresh_tokens.get(token_hash)

    async def revoke_refresh_token(self, db, row: MockRefreshToken, now: datetime | None = None):
        row.revoked_at = now or utcnow()

    async def revoke_all_for_user(self, db, user_id: uuid.UUID, now: datetime | None = None):
        ts = now or utcnow()
        for row in self.refresh_tokens.values():
            if row.user_id == user_id and row.revoked_at is None:
                row.revoked_at = ts


class TestAuthIntegrationFlow(unittest.TestCase):
    """End-to-end integration test suite for authentication, tokens, and RBAC."""

    def setUp(self):
        self.mock_db = MockAuthDatabase()
        self.db_session = MagicMock()
        self.db_session.commit = AsyncMock()
        self.db_session.rollback = AsyncMock()
        self.db_session.refresh = AsyncMock()
        set_now(datetime(2026, 4, 15, 10, 0, 0, tzinfo=UTC))

    def tearDown(self):
        set_now(None)

    # -------------------------------------------------------------------------
    # 1. REGISTRATION TESTS
    # -------------------------------------------------------------------------
    def test_driver_registration_auto_approved(self):
        """Driver registration succeeds immediately with approved status."""
        req = RegisterRequest(
            email="driver@parksmart.demo",
            password="SecurePassword123!",
            full_name="Rajesh Mohanty",
            role=Role.DRIVER,
        )

        with patch("app.modules.users.repository.get_user_by_email", side_effect=self.mock_db.get_user_by_email), \
             patch("app.modules.users.repository.create_user", side_effect=self.mock_db.create_user), \
             patch("app.modules.audit.service.record", new_callable=AsyncMock):

            user_out = asyncio.run(auth_service.register(self.db_session, req))
            self.assertEqual(user_out.email, "driver@parksmart.demo")
            self.assertEqual(user_out.status, "approved")
            self.assertIn(Role.DRIVER, user_out.roles)

    def test_business_operator_registration_pending(self):
        """Business operator registration creates user and business in pending status."""
        req = RegisterRequest(
            email="biz@parksmart.demo",
            password="SecurePassword123!",
            full_name="Priyanka Dash",
            role=Role.BUSINESS_OPERATOR,
            business_name="Dash Logistics Ltd",
        )

        created_biz = []
        async def mock_create_biz(db, name, registration_no, created_by, status):
            biz = MagicMock()
            biz.id = uuid.uuid4()
            biz.name = name
            biz.status = status
            created_biz.append(biz)
            return biz

        with patch("app.modules.users.repository.get_user_by_email", side_effect=self.mock_db.get_user_by_email), \
             patch("app.modules.users.repository.create_user", side_effect=self.mock_db.create_user), \
             patch("app.modules.businesses.repository.create_business", side_effect=mock_create_biz), \
             patch("app.modules.businesses.repository.add_member", new_callable=AsyncMock), \
             patch("app.modules.audit.service.record", new_callable=AsyncMock):

            user_out = asyncio.run(auth_service.register(self.db_session, req))
            self.assertEqual(user_out.status, "pending")
            self.assertEqual(len(created_biz), 1)
            self.assertEqual(created_biz[0].name, "Dash Logistics Ltd")
            self.assertEqual(created_biz[0].status, "pending")

    def test_disallowed_role_self_registration(self):
        """Privileged roles (system_admin, field_operator) cannot self-register."""
        for disallowed in (Role.SYSTEM_ADMIN, Role.FIELD_OPERATOR):
            req = RegisterRequest(
                email=f"admin_{disallowed.value}@parksmart.demo",
                password="SecurePassword123!",
                full_name="Unauthorized Admin",
                role=disallowed,
            )
            with self.assertRaises(Forbidden):
                asyncio.run(auth_service.register(self.db_session, req))

    def test_duplicate_email_registration_rejected(self):
        """Registration with an already existing email returns 409 Conflict."""
        existing_user = MockUser(
            email="dup@parksmart.demo",
            password_hash=hash_password("Existing123"),
            status="approved",
        )
        self.mock_db.add_user(existing_user)

        req = RegisterRequest(
            email="dup@parksmart.demo",
            password="NewPassword123!",
            full_name="Duplicate Attempt",
            role=Role.DRIVER,
        )

        with (
            patch("app.modules.users.repository.get_user_by_email", side_effect=self.mock_db.get_user_by_email),
            self.assertRaises(Conflict),
        ):
            asyncio.run(auth_service.register(self.db_session, req))

    # -------------------------------------------------------------------------
    # 2. LOGIN TESTS
    # -------------------------------------------------------------------------
    def test_successful_login_returns_token_pair(self):
        """Approved user logs in with valid credentials and receives JWT pair."""
        pwd = "ValidPassw0rd!"
        user = MockUser(
            email="valid@parksmart.demo",
            password_hash=hash_password(pwd),
            status="approved",
            roles=["driver"],
        )
        self.mock_db.add_user(user)

        req = LoginRequest(email="valid@parksmart.demo", password=pwd)

        with patch("app.modules.users.repository.get_user_by_email", side_effect=self.mock_db.get_user_by_email), \
             patch("app.modules.auth.repository.insert_refresh_token", side_effect=self.mock_db.insert_refresh_token):

            tokens = asyncio.run(auth_service.login(self.db_session, req))
            self.assertIsInstance(tokens, TokenPair)
            self.assertIsNotNone(tokens.access_token)
            self.assertIsNotNone(tokens.refresh_token)
            self.assertEqual(tokens.token_type, "bearer")
            self.assertGreater(tokens.expires_in, 0)

            # Verify access token decodable and carries claims
            claims = decode_access_token(tokens.access_token)
            self.assertEqual(claims["sub"], str(user.id))
            self.assertIn("driver", claims["roles"])

    def test_invalid_password_rejected(self):
        """Invalid password raises InvalidCredentials."""
        user = MockUser(
            email="test@parksmart.demo",
            password_hash=hash_password("CorrectPassword1"),
            status="approved",
        )
        self.mock_db.add_user(user)

        req = LoginRequest(email="test@parksmart.demo", password="WrongPassword99")

        with (
            patch("app.modules.users.repository.get_user_by_email", side_effect=self.mock_db.get_user_by_email),
            self.assertRaises(InvalidCredentials),
        ):
            asyncio.run(auth_service.login(self.db_session, req))

    def test_nonexistent_email_timing_safe(self):
        """Nonexistent email executes dummy hash verify and raises InvalidCredentials."""
        req = LoginRequest(email="nonexistent@parksmart.demo", password="SomePassword123")

        with (
            patch("app.modules.users.repository.get_user_by_email", side_effect=self.mock_db.get_user_by_email),
            self.assertRaises(InvalidCredentials),
        ):
            asyncio.run(auth_service.login(self.db_session, req))

    def test_pending_user_login_rejected(self):
        """Pending user cannot log in before verification/approval."""
        pwd = "PassWord123!"
        user = MockUser(
            email="pending@parksmart.demo",
            password_hash=hash_password(pwd),
            status="pending",
        )
        self.mock_db.add_user(user)

        req = LoginRequest(email="pending@parksmart.demo", password=pwd)

        with (
            patch("app.modules.users.repository.get_user_by_email", side_effect=self.mock_db.get_user_by_email),
            self.assertRaises(AccountPending),
        ):
            asyncio.run(auth_service.login(self.db_session, req))

    def test_suspended_user_login_rejected(self):
        """Suspended user is forbidden from logging in."""
        pwd = "PassWord123!"
        user = MockUser(
            email="suspended@parksmart.demo",
            password_hash=hash_password(pwd),
            status="suspended",
        )
        self.mock_db.add_user(user)

        req = LoginRequest(email="suspended@parksmart.demo", password=pwd)

        with (
            patch("app.modules.users.repository.get_user_by_email", side_effect=self.mock_db.get_user_by_email),
            self.assertRaises(Forbidden),
        ):
            asyncio.run(auth_service.login(self.db_session, req))

    # -------------------------------------------------------------------------
    # 3. REFRESH TOKEN ROTATION & THEFT DETECTION
    # -------------------------------------------------------------------------
    def test_refresh_token_rotation(self):
        """Active refresh token is revoked and rotated with fresh pair."""
        user = MockUser(email="rot@parksmart.demo", status="approved", roles=["driver"])
        self.mock_db.add_user(user)

        raw_token, token_hash = new_refresh_token()
        exp = utcnow() + timedelta(days=14)
        asyncio.run(self.mock_db.insert_refresh_token(self.db_session, user.id, token_hash, exp))

        with patch("app.modules.auth.repository.get_for_update", side_effect=self.mock_db.get_refresh_token_for_update), \
             patch("app.modules.auth.repository.revoke", side_effect=self.mock_db.revoke_refresh_token), \
             patch("app.modules.auth.repository.insert_refresh_token", side_effect=self.mock_db.insert_refresh_token), \
             patch("app.modules.users.repository.get_user_by_id", side_effect=self.mock_db.get_user_by_id):

            new_tokens = asyncio.run(auth_service.refresh(self.db_session, raw_token))
            self.assertIsInstance(new_tokens, TokenPair)
            self.assertNotEqual(new_tokens.refresh_token, raw_token)

            # Old token must now be marked revoked
            old_row = self.mock_db.refresh_tokens[token_hash]
            self.assertIsNotNone(old_row.revoked_at)

    def test_refresh_token_theft_family_revocation(self):
        """Presenting an already revoked token revokes ALL tokens for that user (reuse detection)."""
        user = MockUser(email="theft@parksmart.demo", status="approved", roles=["driver"])
        self.mock_db.add_user(user)

        # Setup Token A (already rotated/revoked)
        raw_a, hash_a = new_refresh_token()
        exp = utcnow() + timedelta(days=14)
        row_a = asyncio.run(self.mock_db.insert_refresh_token(self.db_session, user.id, hash_a, exp))
        row_a.revoked_at = utcnow() - timedelta(minutes=5)

        # Setup Token B (currently active sibling in same family)
        _raw_b, hash_b = new_refresh_token()
        row_b = asyncio.run(self.mock_db.insert_refresh_token(self.db_session, user.id, hash_b, exp))
        self.assertIsNone(row_b.revoked_at)

        with patch("app.modules.auth.repository.get_for_update", side_effect=self.mock_db.get_refresh_token_for_update), \
             patch("app.modules.auth.repository.revoke_all_for_user", side_effect=self.mock_db.revoke_all_for_user):

            # Attempting to use Token A must trigger family revocation
            with self.assertRaises(TokenInvalid) as ctx:
                asyncio.run(auth_service.refresh(self.db_session, raw_a))
            self.assertIn("reuse detected", str(ctx.exception).lower())

            # Token B must now also be revoked
            self.assertIsNotNone(row_b.revoked_at)

    def test_expired_refresh_token_rejected(self):
        """Expired refresh token raises TokenInvalid."""
        user = MockUser(email="exp@parksmart.demo", status="approved")
        self.mock_db.add_user(user)

        raw_token, token_hash = new_refresh_token()
        exp = utcnow() - timedelta(minutes=1)  # already expired
        asyncio.run(self.mock_db.insert_refresh_token(self.db_session, user.id, token_hash, exp))

        with patch("app.modules.auth.repository.get_for_update", side_effect=self.mock_db.get_refresh_token_for_update):
            with self.assertRaises(TokenInvalid) as ctx:
                asyncio.run(auth_service.refresh(self.db_session, raw_token))
            self.assertIn("expired", str(ctx.exception).lower())

    # -------------------------------------------------------------------------
    # 4. LOGOUT TESTS
    # -------------------------------------------------------------------------
    def test_logout_idempotent(self):
        """Logout marks refresh token revoked; repeated calls do not raise error."""
        user = MockUser(email="logout@parksmart.demo", status="approved")
        self.mock_db.add_user(user)

        raw_token, token_hash = new_refresh_token()
        exp = utcnow() + timedelta(days=14)
        asyncio.run(self.mock_db.insert_refresh_token(self.db_session, user.id, token_hash, exp))

        with patch("app.modules.auth.repository.get_for_update", side_effect=self.mock_db.get_refresh_token_for_update), \
             patch("app.modules.auth.repository.revoke", side_effect=self.mock_db.revoke_refresh_token):

            # First logout
            asyncio.run(auth_service.logout(self.db_session, raw_token))
            self.assertIsNotNone(self.mock_db.refresh_tokens[token_hash].revoked_at)

            # Second logout (idempotent)
            asyncio.run(auth_service.logout(self.db_session, raw_token))

    # -------------------------------------------------------------------------
    # 5. ROLE GUARDS & RBAC
    # -------------------------------------------------------------------------
    def test_rbac_role_hierarchy(self):
        """Drivers cannot access admin roles; admins have elevated permissions."""
        from app.core.rbac import require_role_predicate

        # Test require_role_predicate logic
        is_admin = require_role_predicate({Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN})
        self.assertFalse(is_admin({Role.DRIVER}))
        self.assertFalse(is_admin({Role.BUSINESS_OPERATOR}))
        self.assertTrue(is_admin({Role.MUNICIPAL_ADMIN}))
        self.assertTrue(is_admin({Role.SYSTEM_ADMIN}))

        is_operator_or_driver = require_role_predicate({Role.DRIVER, Role.FIELD_OPERATOR})
        self.assertTrue(is_operator_or_driver({Role.DRIVER}))
        self.assertTrue(is_operator_or_driver({Role.FIELD_OPERATOR}))
        self.assertFalse(is_operator_or_driver({Role.BUSINESS_OPERATOR}))

    # -------------------------------------------------------------------------
    # 6. RATE LIMITING TESTS
    # -------------------------------------------------------------------------
    def test_rate_limiter_sliding_window(self):
        """Rate limiter allows requests within limit and raises RateLimitExceeded upon exceeding."""
        limiter = InMemoryRateLimiter()
        client_key = "192.168.1.100"

        # Allow 5 requests per 10 seconds
        for i in range(5):
            limiter.hit(client_key, max_requests=5, window_seconds=10)

        # 6th request within window must be rejected
        with self.assertRaises(RateLimitExceeded) as ctx:
            limiter.hit(client_key, max_requests=5, window_seconds=10)
        self.assertGreater(ctx.exception.retry_after, 0)


if __name__ == "__main__":
    unittest.main()
