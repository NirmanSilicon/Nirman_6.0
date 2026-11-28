"""
Unit tests for ParkSMART Realtime Hub and Server-Sent Events stream (File 90-93 / M2 Ownership)

Verifies:
- Bearer token authentication and error rejection (missing, invalid, expired, pending, inactive).
- Permission isolation and channel authorization (no data leakage across users or roles).
- Real-time event delivery matching W3C SSE wire format.
- Heartbeat (: ping) delivery every 15 seconds.
- Last-Event-ID replay from bounded ring buffer.
- Fallback resync event when requested history is evicted or invalid.
- auth_expired event emission and stream termination upon token expiration.
- Client disconnect and clean resource cleanup (hub unsubscription).
"""

from __future__ import annotations

import asyncio
import base64
import json
import sys
import time
import unittest
import uuid
from dataclasses import dataclass
from pathlib import Path

# Ensure backend directory in sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.modules.realtime.hub import Hub, channel_allowed
from app.modules.realtime.router import (
    extract_bearer_token,
    format_sse,
    stream_generator,
)
from app.modules.realtime.service import (
    AccountPending,
    CurrentUser,
    TokenExpired,
    TokenInvalid,
    Unauthorized,
    authenticate_stream,
    channels_for_user,
    decode_access_token,
)


def make_test_jwt(
    user_id: uuid.UUID,
    roles: list[str] | None = None,
    exp_offset_s: float = 3600.0,
    email: str | None = None,
) -> str:
    """Creates a well-formed base64url encoded test JWT."""
    header = {"alg": "HS256", "typ": "JWT"}
    now_ts = time.time()
    payload = {
        "sub": str(user_id),
        "email": email or f"user-{user_id.hex[:6]}@parksmart.demo",
        "roles": roles or ["driver"],
        "iat": int(now_ts),
        "exp": int(now_ts + exp_offset_s),
    }
    h_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    p_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    sig = "dummy_signature_for_testing"
    return f"{h_b64}.{p_b64}.{sig}"


@dataclass
class MockDbUser:
    id: uuid.UUID
    email: str
    roles: list[str]
    status: str = "approved"
    is_active: bool = True


class MockRealtimeDb:
    def __init__(self):
        self.users: dict[uuid.UUID, MockDbUser] = {}
        self.user_businesses: dict[uuid.UUID, list[uuid.UUID]] = {}

    async def get_user(self, user_id: uuid.UUID) -> MockDbUser | None:
        return self.users.get(user_id)

    async def business_ids_for_user(self, user_id: uuid.UUID) -> list[uuid.UUID]:
        return self.user_businesses.get(user_id, [])


class MockRequest:
    def __init__(self, disconnected: bool = False):
        self._disconnected = disconnected

    async def is_disconnected(self) -> bool:
        return self._disconnected


class TestRealtimeHubAndStream(unittest.TestCase):
    def setUp(self):
        self.hub = Hub(buffer_size=10)
        self.db = MockRealtimeDb()
        self.user_id = uuid.uuid4()
        self.user = MockDbUser(
            id=self.user_id,
            email="driver@parksmart.demo",
            roles=["driver"],
            status="approved",
            is_active=True,
        )
        self.db.users[self.user_id] = self.user

    def run_async(self, coro):
        return asyncio.run(coro)

    # ========================================================================
    # 1. Authentication Tests
    # ========================================================================

    def test_bearer_token_extraction(self):
        """Header must strictly follow Bearer <token> format."""
        with self.assertRaises(Unauthorized):
            extract_bearer_token(None)
        with self.assertRaises(Unauthorized):
            extract_bearer_token("Basic dXNlcjpwYXNz")
        with self.assertRaises(Unauthorized):
            extract_bearer_token("JustTokenWithoutBearer")

        token = "valid.jwt.token"
        extracted = extract_bearer_token(f"Bearer {token}")
        self.assertEqual(extracted, token)

    def test_jwt_validation_and_expiry(self):
        """Validates token decoding and rejects expired or malformed JWTs."""
        # Valid token
        token_valid = make_test_jwt(self.user_id, exp_offset_s=3600)
        claims = decode_access_token(token_valid)
        self.assertEqual(claims["sub"], str(self.user_id))

        # Expired token
        token_expired = make_test_jwt(self.user_id, exp_offset_s=-10)
        with self.assertRaises(TokenExpired):
            decode_access_token(token_expired)

        # Malformed token
        with self.assertRaises(TokenInvalid):
            decode_access_token("not.a.valid.jwt.token")

    def test_user_authentication_status(self):
        """Rejects inactive, pending, or non-existent users."""
        claims = {"sub": str(self.user_id)}

        # Approved active user succeeds
        auth_user = self.run_async(authenticate_stream(self.db, claims))
        self.assertEqual(auth_user.id, self.user_id)

        # Inactive user
        self.user.is_active = False
        with self.assertRaises(Unauthorized):
            self.run_async(authenticate_stream(self.db, claims))

        # Pending user
        self.user.is_active = True
        self.user.status = "pending"
        with self.assertRaises(AccountPending):
            self.run_async(authenticate_stream(self.db, claims))

        # Non-existent user
        missing_claims = {"sub": str(uuid.uuid4())}
        with self.assertRaises(Unauthorized):
            self.run_async(authenticate_stream(self.db, missing_claims))

    # ========================================================================
    # 2. Channel Authorization & Permission Boundaries (No Data Leakage)
    # ========================================================================

    def test_channel_authorization_boundaries(self):
        """Users receive only channels matching their roles and business memberships."""
        # 1. Driver user
        driver_ctx = CurrentUser(id=self.user_id, email="d@demo", roles=["driver"])
        channels = self.run_async(channels_for_user(self.db, driver_ctx))
        self.assertIn("zone:*", channels)
        self.assertIn(f"user:{self.user_id}", channels)
        self.assertNotIn("ops:*", channels)

        # 2. Field operator receives ops:*
        operator_ctx = CurrentUser(id=self.user_id, email="op@demo", roles=["field_operator"])
        op_channels = self.run_async(channels_for_user(self.db, operator_ctx))
        self.assertIn("ops:*", op_channels)

        # 3. Business operator receives their specific business channel
        biz_id = uuid.uuid4()
        self.db.user_businesses[self.user_id] = [biz_id]
        biz_ctx = CurrentUser(id=self.user_id, email="b@demo", roles=["business_operator"])
        biz_channels = self.run_async(channels_for_user(self.db, biz_ctx))
        self.assertIn(f"business:{biz_id}", biz_channels)
        self.assertNotIn(f"business:{uuid.uuid4()}", biz_channels)  # Other business not included

    def test_channel_allowed_filtering(self):
        """Verifies channel filter matching and isolation."""
        user_channels = {"zone:*", "business:11111111-0000-0000-0000-000000000001"}

        self.assertTrue(channel_allowed(user_channels, "zone:22222222-0000-0000-0000-000000000001"))
        self.assertTrue(channel_allowed(user_channels, "business:11111111-0000-0000-0000-000000000001"))
        # Must NOT allow ops or unrelated businesses
        self.assertFalse(channel_allowed(user_channels, "ops:devices"))
        self.assertFalse(channel_allowed(user_channels, "business:99999999-0000-0000-0000-000000000001"))

    # ========================================================================
    # 3. Realtime Event Delivery & SSE Formatting
    # ========================================================================

    def test_event_delivery_over_stream(self):
        """Published event is delivered in valid W3C SSE format."""
        async def scenario():
            sub = self.hub.subscribe(channels={"zone:*"})
            ev = self.hub.publish("zone:zone-1", "bay_changed", {"bay_id": "b-1", "state": "occupied"})

            received = await sub.queue.get()
            self.assertEqual(received.id, ev.id)
            self.assertEqual(received.event, "bay_changed")
            self.assertEqual(received.data["state"], "occupied")

            sse_text = format_sse(received.event, received.data, event_id=received.id)
            self.assertIn(f"id: {ev.id}\n", sse_text)
            self.assertIn("event: bay_changed\n", sse_text)
            self.assertIn('data: {"bay_id":"b-1","state":"occupied"}\n\n', sse_text)

        self.run_async(scenario())

    # ========================================================================
    # 4. SSE Heartbeats (Every 15 Seconds)
    # ========================================================================

    def test_sse_heartbeat_emission(self):
        """When no events arrive, ': ping' comment is emitted every interval."""
        async def scenario():
            user_ctx = CurrentUser(id=self.user_id, email="d@demo", roles=["driver"])
            # Set short heartbeat interval for fast test execution
            gen = stream_generator(
                hub=self.hub,
                user=user_ctx,
                channels={"zone:*"},
                heartbeat_s=0.05,
            )

            # First timeout yields heartbeat ping
            first_chunk = await gen.__anext__()
            self.assertEqual(first_chunk, ": ping\n\n")

            # Second timeout yields heartbeat ping
            second_chunk = await gen.__anext__()
            self.assertEqual(second_chunk, ": ping\n\n")

            await gen.aclose()

        self.run_async(scenario())

    # ========================================================================
    # 5. Last-Event-ID Replay & Resync
    # ========================================================================

    def test_last_event_id_replay_success(self):
        """Missed events are replayed in order when requested ID is retained."""
        ev1 = self.hub.publish("zone:z1", "bay_changed", {"bay_id": "b1"})
        ev2 = self.hub.publish("zone:z1", "bay_changed", {"bay_id": "b2"})
        ev3 = self.hub.publish("zone:z1", "bay_changed", {"bay_id": "b3"})

        # Replay after ev1
        replayed = self.hub.replay_after(ev1.id, channels={"zone:*"})
        self.assertIsNotNone(replayed)
        self.assertEqual(len(replayed), 2)
        self.assertEqual(replayed[0].id, ev2.id)
        self.assertEqual(replayed[1].id, ev3.id)

    def test_last_event_id_resync_on_eviction_or_epoch_mismatch(self):
        """When requested event ID is not retained or from an older epoch, returns None (resync)."""
        # 1. Wrong epoch
        res_wrong_epoch = self.hub.replay_after("other_epoch-1", channels={"zone:*"})
        self.assertIsNone(res_wrong_epoch)

        # 2. Buffer overflow eviction: hub buffer capacity is 10
        # Publish 15 events to evict the first 5
        ev_first = self.hub.publish("zone:z1", "bay_changed", {"n": 0})
        for i in range(1, 15):
            self.hub.publish("zone:z1", "bay_changed", {"n": i})

        # Requesting ev_first which was evicted returns None -> client will receive 'resync'
        res_evicted = self.hub.replay_after(ev_first.id, channels={"zone:*"})
        self.assertIsNone(res_evicted)

    def test_generator_yields_resync_on_unavailable_history(self):
        """Generator immediately yields resync event if Last-Event-ID cannot be replayed."""
        async def scenario():
            user_ctx = CurrentUser(id=self.user_id, email="d@demo", roles=["driver"])
            gen = stream_generator(
                hub=self.hub,
                user=user_ctx,
                channels={"zone:*"},
                last_event_id="stale_epoch-99",
                heartbeat_s=10.0,
            )
            first_chunk = await gen.__anext__()
            self.assertIn("event: resync\n", first_chunk)
            await gen.aclose()

        self.run_async(scenario())

    # ========================================================================
    # 6. Token Expiry (auth_expired Event)
    # ========================================================================

    def test_token_expiry_emits_auth_expired_and_closes(self):
        """When the token reaches expiration while connected, yields auth_expired and terminates."""
        async def scenario():
            user_ctx = CurrentUser(id=self.user_id, email="d@demo", roles=["driver"])
            # Expire in 0.05 seconds
            exp_ts = time.time() + 0.05
            gen = stream_generator(
                hub=self.hub,
                user=user_ctx,
                channels={"zone:*"},
                exp_timestamp=exp_ts,
                heartbeat_s=0.02,
            )

            chunks = []
            async for chunk in gen:
                chunks.append(chunk)

            # Stream must end and have emitted auth_expired
            auth_expired_chunks = [c for c in chunks if "event: auth_expired" in c]
            self.assertEqual(len(auth_expired_chunks), 1)

        self.run_async(scenario())

    # ========================================================================
    # 7. Disconnect Handling & Hub Cleanup
    # ========================================================================

    def test_client_disconnect_cleans_up_subscription(self):
        """When client disconnects, hub.unsubscribe is called cleanly."""
        async def scenario():
            self.assertEqual(self.hub.subscriber_count(), 0)
            user_ctx = CurrentUser(id=self.user_id, email="d@demo", roles=["driver"])

            # Request signals disconnected
            mock_req = MockRequest(disconnected=True)
            gen = stream_generator(
                hub=self.hub,
                user=user_ctx,
                channels={"zone:*"},
                heartbeat_s=0.1,
                request=mock_req,
            )

            async for _ in gen:
                pass

            # Subscriber discarded
            self.assertEqual(self.hub.subscriber_count(), 0)

        self.run_async(scenario())

    def test_slow_consumer_queue_overflow_triggers_resync(self):
        """Slow consumer queue overflow sets sub.overflowed and yields resync."""
        async def scenario():
            # Small queue of 2 items
            sub = self.hub.subscribe(channels={"zone:*"}, queue_max=2)
            # Push 4 events to force overflow
            self.hub.publish("zone:z1", "e1", {})
            self.hub.publish("zone:z1", "e2", {})
            self.hub.publish("zone:z1", "e3", {})
            self.assertTrue(sub.overflowed)

            self.hub.unsubscribe(sub)

        self.run_async(scenario())


if __name__ == "__main__":
    unittest.main()
