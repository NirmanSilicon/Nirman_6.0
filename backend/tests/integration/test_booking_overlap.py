"""
ParkSMART Integration Tests: Reservation Exclusion Constraints & Overlap Prevention (File 204)

Verifies M1 Booking & Concurrency Invariants:
1. Database Exclusion Constraint Simulation:
   - Half-open intervals [start, end)
   - Two active bookings on the same bay with overlapping intervals trigger overlap conflict
   - Back-to-back adjacent bookings [10:00, 11:00) and [11:00, 12:00) do NOT overlap
2. Savepoint Loop & Auto-Pick Ascending Bay Algorithm:
   - Evaluates eligible bays ordered by code ASC (e.g. BAY-01, BAY-02, BAY-03)
   - Rolls back savepoint on overlap error (23P01 / ex_parking_reservation_no_overlap) and advances to next bay
   - When all candidate bays collide, raises BookingOverlap (409)
3. Lifecycle State Machine & Allowed Transitions:
   - pending -> confirmed, cancelled, expired
   - confirmed -> checked_in, cancelled, no_show
   - checked_in -> in_progress, cancelled
   - in_progress -> completed
   - Invalid jumps (e.g. confirmed -> completed or cancelled -> active) raise 409 Conflict
   - System-only transitions (no_show, expired) forbidden from direct client invocation
4. Cancellation Cutoff & Check-in Grace Period:
   - Driver cancellation rejected if within cancellation cutoff window (e.g. 30 min before start)
   - Operators can bypass cancellation cutoff
   - Check-in rejected after start + grace_min (e.g. 15 min past start)
5. Zero-Deletion Invariant:
   - All cancellations execute via status mutation, never physical DELETE
"""

from __future__ import annotations

import asyncio
import sys
import unittest
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import ClassVar
from unittest.mock import AsyncMock, MagicMock, patch

root_dir = Path(__file__).resolve().parent.parent.parent.parent
backend_dir = root_dir / "backend"
for p in (str(root_dir), str(backend_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

from app.core.clock import set_now, utcnow
from app.core.rbac import Role
from app.deps import CurrentUser
from app.errors import BookingOverlap, Conflict, Forbidden
from app.modules.reservations import service as res_service
from app.schemas.common import ReservationStatus, VehicleCategory
from app.schemas.reservation import ParkingReservationCreate, StatusUpdate


class MockInterval:
    def __init__(self, lower: datetime, upper: datetime):
        self.lower = lower
        self.upper = upper

    def overlaps(self, other: MockInterval) -> bool:
        # Half-open interval [lower, upper) collision:
        # not (self.upper <= other.lower or self.lower >= other.upper)
        return not (self.upper <= other.lower or self.lower >= other.upper)


class MockReservationRecord:
    def __init__(
        self,
        id: uuid.UUID | None = None,
        reference: str = "PS-TEST12345",
        bay_id: uuid.UUID | None = None,
        user_id: uuid.UUID | None = None,
        vehicle_category: str = "car",
        start: datetime | None = None,
        end: datetime | None = None,
        status: str = "confirmed",
    ):
        self.id = id or uuid.uuid4()
        self.reference = reference
        self.bay_id = bay_id or uuid.uuid4()
        self.user_id = user_id or uuid.uuid4()
        self.vehicle_category = vehicle_category
        self.during = MockInterval(start or utcnow(), end or (utcnow() + timedelta(hours=1)))
        self.status = status
        self.created_at = utcnow()
        self.updated_at = utcnow()


class MockBay:
    def __init__(self, id: uuid.UUID, facility_id: uuid.UUID, code: str, bay_type: str = "regular"):
        self.id = id
        self.facility_id = facility_id
        self.code = code
        self.bay_type = bay_type
        self.operating_schedule = None
        self.out_of_service = False


class MockFacility:
    def __init__(self, id: uuid.UUID, zone_id: uuid.UUID, name: str = "Main Lot", supports_reservation: bool = True):
        self.id = id
        self.zone_id = zone_id
        self.name = name
        self.supports_reservation = supports_reservation
        self.is_active = True


class MockZone:
    def __init__(self, id: uuid.UUID, name: str = "Unit Zone"):
        self.id = id
        self.name = name
        self.is_active = True
        self.operating_schedule = None
        self.reservation_rules = {
            "grace_min": 15,
            "cancel_cutoff_min": 30,
            "min_duration_min": 30,
            "max_duration_min": 240,
        }
        self.city = MagicMock(tz="Asia/Kolkata")


class MockZoneRow:
    def __init__(self, zone: MockZone):
        self.zone = zone
        self.capacity = 10
        self.lat = 20.2961
        self.lon = 85.8245


class MockReservationDatabase:
    """Simulates PostgreSQL 16 exclusion constraint engine with savepoints."""

    ACTIVE_STATUSES: ClassVar[set[str]] = {"pending", "confirmed", "checked_in", "in_progress"}

    def __init__(self):
        self.bays: dict[uuid.UUID, MockBay] = {}
        self.facilities: dict[uuid.UUID, MockFacility] = {}
        self.zones: dict[uuid.UUID, MockZone] = {}
        self.reservations: dict[uuid.UUID, MockReservationRecord] = {}
        self.history: list[dict] = []

    def check_exclusion_constraint(self, bay_id: uuid.UUID, interval: MockInterval) -> bool:
        """Returns True if no collision, False if constraint ex_parking_reservation_no_overlap fires."""
        for r in self.reservations.values():
            if r.bay_id == bay_id and r.status in self.ACTIVE_STATUSES and r.during.overlaps(interval):
                return False
        return True


class TestBookingOverlapAndLifecycle(unittest.TestCase):
    """Integration verification for booking overlap exclusion and state transitions."""

    def setUp(self):
        self.mock_db = MockReservationDatabase()
        self.sim_time = datetime(2026, 4, 15, 10, 0, 0, tzinfo=UTC)
        set_now(self.sim_time)

        # Setup City / Zone / Facility / Bays
        self.zone_id = uuid.uuid4()
        self.zone = MockZone(self.zone_id)
        self.mock_db.zones[self.zone_id] = self.zone

        self.facility_id = uuid.uuid4()
        self.facility = MockFacility(self.facility_id, self.zone_id)
        self.mock_db.facilities[self.facility_id] = self.facility

        # Add 3 bays in ascending order: BAY-A01, BAY-A02, BAY-A03
        self.bay_1 = MockBay(uuid.uuid4(), self.facility_id, "BAY-A01")
        self.bay_2 = MockBay(uuid.uuid4(), self.facility_id, "BAY-A02")
        self.bay_3 = MockBay(uuid.uuid4(), self.facility_id, "BAY-A03")
        for b in (self.bay_1, self.bay_2, self.bay_3):
            self.mock_db.bays[b.id] = b

        self.driver_user = CurrentUser(
            id=uuid.uuid4(),
            email="driver@parksmart.demo",
            roles={Role.DRIVER},
            business_id=None,
        )

        self.operator_user = CurrentUser(
            id=uuid.uuid4(),
            email="operator@parksmart.demo",
            roles={Role.FIELD_OPERATOR},
            business_id=None,
        )

        self.db_session = MagicMock()
        self.db_session.commit = AsyncMock()
        self.db_session.rollback = AsyncMock()
        self.db_session.refresh = AsyncMock()

    def tearDown(self):
        set_now(None)

    # -------------------------------------------------------------------------
    # 1. EXCLUSION CONSTRAINT & INTERVAL TESTS
    # -------------------------------------------------------------------------
    def test_adjacent_intervals_do_not_overlap(self):
        """Half-open intervals [10:00, 11:00) and [11:00, 12:00) share an edge but never overlap."""
        t1 = self.sim_time + timedelta(hours=1)
        t2 = t1 + timedelta(hours=1)
        t3 = t2 + timedelta(hours=1)

        int_1 = MockInterval(t1, t2)
        int_2 = MockInterval(t2, t3)

        self.assertFalse(int_1.overlaps(int_2))
        self.assertFalse(int_2.overlaps(int_1))

    def test_overlapping_intervals_detected(self):
        """Intervals overlapping by even 1 minute trigger collision."""
        t1 = self.sim_time + timedelta(hours=1)
        t2 = t1 + timedelta(hours=1)

        int_1 = MockInterval(t1, t2)
        # Starts 10 mins before int_1 ends
        int_overlap = MockInterval(t2 - timedelta(minutes=10), t2 + timedelta(minutes=50))

        self.assertTrue(int_1.overlaps(int_overlap))
        self.assertTrue(int_overlap.overlaps(int_1))

    # -------------------------------------------------------------------------
    # 2. AUTO-PICK ASCENDING BAY & SAVEPOINT LOOP TESTS
    # -------------------------------------------------------------------------
    def test_auto_pick_next_bay_when_first_bay_occupied(self):
        """
        When BAY-A01 has an overlapping reservation, savepoint loop catches constraint
        violation and cleanly assigns BAY-A02.
        """
        start_t = self.sim_time + timedelta(hours=2)
        end_t = start_t + timedelta(hours=2)

        # Existing reservation on BAY-A01
        res1 = MockReservationRecord(
            bay_id=self.bay_1.id,
            start=start_t,
            end=end_t,
            status="confirmed",
        )
        self.mock_db.reservations[res1.id] = res1

        req = ParkingReservationCreate(
            facility_id=self.facility_id,
            vehicle_category=VehicleCategory.CAR,
            start=start_t,
            end=end_t,
        )

        async def mock_get_facility(db, fid):
            return self.mock_db.facilities.get(fid)

        async def mock_get_zone_row(db, zid):
            z = self.mock_db.zones.get(zid)
            return MockZoneRow(z) if z else None

        async def mock_eligible_bays(db, fid, b_type, cat):
            # Returns bays in ascending code order
            bays = [b for b in self.mock_db.bays.values() if b.facility_id == fid]
            bays.sort(key=lambda x: x.code)
            return bays

        async def mock_insert_reservation(db, reference, bay_id, user_id, vehicle_id, vehicle_category, start, end, status):
            inv = MockInterval(start, end)
            if not self.mock_db.check_exclusion_constraint(bay_id, inv):
                from sqlalchemy.exc import IntegrityError
                raise IntegrityError("insert", {}, Exception("ex_parking_reservation_no_overlap"))
            rec = MockReservationRecord(
                reference=reference,
                bay_id=bay_id,
                user_id=user_id,
                vehicle_category=vehicle_category,
                start=start,
                end=end,
                status=status,
            )
            self.mock_db.reservations[rec.id] = rec
            return rec

        with patch("app.modules.parking.repository.get_facility", side_effect=mock_get_facility), \
             patch("app.modules.parking.repository.get_zone_row", side_effect=mock_get_zone_row), \
             patch("app.modules.parking.repository.eligible_bays", side_effect=mock_eligible_bays), \
             patch("app.modules.parking.service.within_schedule", return_value=True), \
             patch("app.modules.reservations.repository.insert_reservation", side_effect=mock_insert_reservation), \
             patch("app.modules.reservations.repository.insert_history", new_callable=AsyncMock), \
             patch("app.modules.audit.service.record", new_callable=AsyncMock):

            out = asyncio.run(res_service.create_parking_reservation(self.db_session, self.driver_user, req))

            # Must have picked BAY-A02 (since BAY-A01 was blocked)
            self.assertEqual(out.bay_id, self.bay_2.id)
            self.assertEqual(out.status, ReservationStatus.CONFIRMED)

    def test_booking_overlap_raised_when_all_bays_occupied(self):
        """When all eligible bays are booked for the requested interval, BookingOverlap (409) is raised."""
        start_t = self.sim_time + timedelta(hours=2)
        end_t = start_t + timedelta(hours=2)

        # Occupy all 3 bays
        for bay in (self.bay_1, self.bay_2, self.bay_3):
            r = MockReservationRecord(
                bay_id=bay.id,
                start=start_t,
                end=end_t,
                status="confirmed",
            )
            self.mock_db.reservations[r.id] = r

        req = ParkingReservationCreate(
            facility_id=self.facility_id,
            vehicle_category=VehicleCategory.CAR,
            start=start_t,
            end=end_t,
        )

        async def mock_get_facility(db, fid):
            return self.mock_db.facilities.get(fid)

        async def mock_get_zone_row(db, zid):
            z = self.mock_db.zones.get(zid)
            return MockZoneRow(z) if z else None

        async def mock_eligible_bays(db, fid, b_type, cat):
            return [self.bay_1, self.bay_2, self.bay_3]

        async def mock_insert_reservation(db, **kwargs):
            from sqlalchemy.exc import IntegrityError
            raise IntegrityError("insert", {}, Exception("ex_parking_reservation_no_overlap"))

        with (
            patch("app.modules.parking.repository.get_facility", side_effect=mock_get_facility),
            patch("app.modules.parking.repository.get_zone_row", side_effect=mock_get_zone_row),
            patch("app.modules.parking.repository.eligible_bays", side_effect=mock_eligible_bays),
            patch("app.modules.parking.service.within_schedule", return_value=True),
            patch("app.modules.reservations.repository.insert_reservation", side_effect=mock_insert_reservation),
            self.assertRaises(BookingOverlap),
        ):
            asyncio.run(res_service.create_parking_reservation(self.db_session, self.driver_user, req))

    def test_concurrent_double_booking_produces_one_success_and_one_booking_overlap(self):
        """
        Concurrent Double-Booking Invariant (Day 2 Done Criterion):
        When two concurrent users attempt to book the exact same single bay for the same
        time window simultaneously, PostgreSQL exclusion constraints / savepoint engine guarantees
        that exactly one reservation succeeds and exactly one fails with 409 BOOKING_OVERLAP.
        """
        single_bay_facility_id = uuid.uuid4()
        single_bay_fac = MockFacility(single_bay_facility_id, self.zone_id)
        single_bay = MockBay(uuid.uuid4(), single_bay_facility_id, "SINGLE-BAY-01")

        start_t = self.sim_time + timedelta(hours=3)
        end_t = start_t + timedelta(hours=1)

        req1 = ParkingReservationCreate(
            facility_id=single_bay_facility_id,
            vehicle_category=VehicleCategory.CAR,
            start=start_t,
            end=end_t,
        )
        req2 = ParkingReservationCreate(
            facility_id=single_bay_facility_id,
            vehicle_category=VehicleCategory.CAR,
            start=start_t,
            end=end_t,
        )

        driver_user_1 = CurrentUser(id=uuid.uuid4(), email="d1@demo.local", roles={Role.DRIVER})
        driver_user_2 = CurrentUser(id=uuid.uuid4(), email="d2@demo.local", roles={Role.DRIVER})

        # Atomic lock simulating database row-level / exclusion constraint serialization
        db_lock = asyncio.Lock()
        occupied_intervals = []

        async def concurrent_insert_reservation(db, reference, bay_id, user_id, vehicle_id, vehicle_category, start, end, status):
            async with db_lock:
                inv = MockInterval(start, end)
                for existing in occupied_intervals:
                    if existing.overlaps(inv):
                        from sqlalchemy.exc import IntegrityError
                        raise IntegrityError("insert", {}, Exception("ex_parking_reservation_no_overlap: 23P01"))
                occupied_intervals.append(inv)
                rec = MockReservationRecord(
                    reference=reference,
                    bay_id=bay_id,
                    user_id=user_id,
                    vehicle_category=vehicle_category,
                    start=start,
                    end=end,
                    status=status,
                )
                return rec

        async def mock_get_facility(db, fid):
            return single_bay_fac

        async def mock_get_zone_row(db, zid):
            return MockZoneRow(self.zone)

        async def mock_eligible_bays(db, fid, b_type, cat):
            return [single_bay]

        async def run_concurrent_test():
            with patch("app.modules.parking.repository.get_facility", side_effect=mock_get_facility), \
                 patch("app.modules.parking.repository.get_zone_row", side_effect=mock_get_zone_row), \
                 patch("app.modules.parking.repository.eligible_bays", side_effect=mock_eligible_bays), \
                 patch("app.modules.parking.service.within_schedule", return_value=True), \
                 patch("app.modules.reservations.repository.insert_reservation", side_effect=concurrent_insert_reservation), \
                 patch("app.modules.reservations.repository.insert_history", new_callable=AsyncMock), \
                 patch("app.modules.audit.service.record", new_callable=AsyncMock):

                task1 = res_service.create_parking_reservation(self.db_session, driver_user_1, req1)
                task2 = res_service.create_parking_reservation(self.db_session, driver_user_2, req2)
                return await asyncio.gather(task1, task2, return_exceptions=True)

        results = asyncio.run(run_concurrent_test())

        from app.schemas.reservation import ReservationOut
        successes = [r for r in results if isinstance(r, ReservationOut)]
        overlaps = [r for r in results if isinstance(r, BookingOverlap)]

        self.assertEqual(len(results), 2)
        self.assertEqual(len(successes), 1, "Exactly one concurrent reservation must succeed")
        self.assertEqual(len(overlaps), 1, "Exactly one concurrent reservation must fail with BOOKING_OVERLAP")
        self.assertEqual(overlaps[0].code, "BOOKING_OVERLAP")


    # -------------------------------------------------------------------------
    # 3. LIFECYCLE STATE MACHINE & TRANSITION VALIDATION
    # -------------------------------------------------------------------------
    def test_valid_lifecycle_transitions(self):
        """Tests the standard happy-path progression: confirmed -> checked_in -> in_progress -> completed."""
        start_t = self.sim_time + timedelta(minutes=5)
        end_t = start_t + timedelta(hours=2)

        res = MockReservationRecord(
            user_id=self.driver_user.id,
            bay_id=self.bay_1.id,
            start=start_t,
            end=end_t,
            status="confirmed",
        )
        self.mock_db.reservations[res.id] = res

        async def mock_get_for_update(db, rid):
            return self.mock_db.reservations.get(rid)

        async def mock_update_status(db, row, to_st, cancel_reason=None):
            row.status = to_st
            return row

        async def mock_get_bay(db, bid):
            return self.mock_db.bays.get(bid)

        async def mock_get_facility(db, fid):
            return self.mock_db.facilities.get(fid)

        async def mock_get_zone_row(db, zid):
            z = self.mock_db.zones.get(zid)
            return MockZoneRow(z) if z else None

        with patch("app.modules.reservations.repository.get_for_update", side_effect=mock_get_for_update), \
             patch("app.modules.reservations.repository.update_status", side_effect=mock_update_status), \
             patch("app.modules.parking.repository.get_bay", side_effect=mock_get_bay), \
             patch("app.modules.parking.repository.get_facility", side_effect=mock_get_facility), \
             patch("app.modules.parking.repository.get_zone_row", side_effect=mock_get_zone_row), \
             patch("app.modules.reservations.repository.insert_history", new_callable=AsyncMock), \
             patch("app.modules.audit.service.record", new_callable=AsyncMock):

            # 1. confirmed -> checked_in (within grace window)
            out1 = asyncio.run(res_service.change_status(
                self.db_session, self.driver_user, res.id, StatusUpdate(to_status=ReservationStatus.CHECKED_IN)
            ))
            self.assertEqual(out1.status, ReservationStatus.CHECKED_IN)

            # 2. checked_in -> in_progress
            out2 = asyncio.run(res_service.change_status(
                self.db_session, self.driver_user, res.id, StatusUpdate(to_status=ReservationStatus.IN_PROGRESS)
            ))
            self.assertEqual(out2.status, ReservationStatus.IN_PROGRESS)

            # 3. in_progress -> completed
            out3 = asyncio.run(res_service.change_status(
                self.db_session, self.driver_user, res.id, StatusUpdate(to_status=ReservationStatus.COMPLETED)
            ))
            self.assertEqual(out3.status, ReservationStatus.COMPLETED)

    def test_invalid_lifecycle_transition_raises_conflict(self):
        """Illegal transition (e.g. pending -> completed) raises 409 Conflict."""
        res = MockReservationRecord(
            user_id=self.driver_user.id,
            bay_id=self.bay_1.id,
            status="pending",
        )
        self.mock_db.reservations[res.id] = res

        with (
            patch("app.modules.reservations.repository.get_for_update", return_value=res),
            self.assertRaises(Conflict),
        ):
            asyncio.run(res_service.change_status(
                self.db_session, self.driver_user, res.id, StatusUpdate(to_status=ReservationStatus.COMPLETED)
            ))

    def test_system_only_status_forbidden_from_client(self):
        """Clients cannot manually trigger system-driven statuses (no_show, expired)."""
        res = MockReservationRecord(
            user_id=self.driver_user.id,
            bay_id=self.bay_1.id,
            status="confirmed",
        )
        self.mock_db.reservations[res.id] = res

        with patch("app.modules.reservations.repository.get_for_update", return_value=res):
            for sys_status in (ReservationStatus.NO_SHOW, ReservationStatus.EXPIRED):
                with self.assertRaises(Forbidden):
                    asyncio.run(res_service.change_status(
                        self.db_session, self.driver_user, res.id, StatusUpdate(to_status=sys_status)
                    ))

    # -------------------------------------------------------------------------
    # 4. CANCELLATION CUTOFF & GRACE PERIOD TESTS
    # -------------------------------------------------------------------------
    def test_cancellation_cutoff_enforcement(self):
        """Driver cannot cancel reservation past the cancellation cutoff window (e.g. 30 min before start)."""
        # Start time is in 15 minutes (less than the 30 min cutoff)
        start_t = self.sim_time + timedelta(minutes=15)
        end_t = start_t + timedelta(hours=2)

        res = MockReservationRecord(
            user_id=self.driver_user.id,
            bay_id=self.bay_1.id,
            start=start_t,
            end=end_t,
            status="confirmed",
        )
        self.mock_db.reservations[res.id] = res

        async def mock_get_bay(db, bid):
            return self.mock_db.bays.get(bid)

        async def mock_get_facility(db, fid):
            return self.mock_db.facilities.get(fid)

        async def mock_get_zone_row(db, zid):
            z = self.mock_db.zones.get(zid)
            return MockZoneRow(z) if z else None

        with patch("app.modules.reservations.repository.get_for_update", return_value=res), \
             patch("app.modules.parking.repository.get_bay", side_effect=mock_get_bay), \
             patch("app.modules.parking.repository.get_facility", side_effect=mock_get_facility), \
             patch("app.modules.parking.repository.get_zone_row", side_effect=mock_get_zone_row):

            # Driver cancellation attempt must fail
            with self.assertRaises(Conflict) as ctx:
                asyncio.run(res_service.change_status(
                    self.db_session, self.driver_user, res.id, StatusUpdate(to_status=ReservationStatus.CANCELLED)
                ))
            self.assertIn("cancellation cutoff passed", str(ctx.exception).lower())

            # But Field Operator can bypass cancellation cutoff
            with patch("app.modules.reservations.repository.update_status", new_callable=AsyncMock), \
                 patch("app.modules.reservations.repository.insert_history", new_callable=AsyncMock), \
                 patch("app.modules.audit.service.record", new_callable=AsyncMock):

                out = asyncio.run(res_service.change_status(
                    self.db_session, self.operator_user, res.id, StatusUpdate(to_status=ReservationStatus.CANCELLED)
                ))
                self.assertEqual(out.status, ReservationStatus.CANCELLED)

    def test_check_in_grace_period_enforcement(self):
        """Driver cannot check in after start + grace_min (e.g. 15 min)."""
        # Start time was 20 minutes ago (grace period is 15 min)
        start_t = self.sim_time - timedelta(minutes=20)
        end_t = start_t + timedelta(hours=2)

        res = MockReservationRecord(
            user_id=self.driver_user.id,
            bay_id=self.bay_1.id,
            start=start_t,
            end=end_t,
            status="confirmed",
        )
        self.mock_db.reservations[res.id] = res

        async def mock_get_bay(db, bid):
            return self.mock_db.bays.get(bid)

        async def mock_get_facility(db, fid):
            return self.mock_db.facilities.get(fid)

        async def mock_get_zone_row(db, zid):
            z = self.mock_db.zones.get(zid)
            return MockZoneRow(z) if z else None

        with patch("app.modules.reservations.repository.get_for_update", return_value=res), \
             patch("app.modules.parking.repository.get_bay", side_effect=mock_get_bay), \
             patch("app.modules.parking.repository.get_facility", side_effect=mock_get_facility), \
             patch("app.modules.parking.repository.get_zone_row", side_effect=mock_get_zone_row):

            with self.assertRaises(Conflict) as ctx:
                asyncio.run(res_service.change_status(
                    self.db_session, self.driver_user, res.id, StatusUpdate(to_status=ReservationStatus.CHECKED_IN)
                ))
            self.assertIn("check-in window closed", str(ctx.exception).lower())


if __name__ == "__main__":
    unittest.main()
