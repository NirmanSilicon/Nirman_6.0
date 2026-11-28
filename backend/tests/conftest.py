"""ParkSMART - Pytest Fixtures and Entity Factories (File 196)."""

from __future__ import annotations

import os
import uuid
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

# Set test environment defaults
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://parksmart:CHANGE_ME@localhost:5432/parksmart_test")
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-jwt-signing-minimum-32-chars")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("MQTT_PASSWORD", "testpass")
os.environ.setdefault("MIN_HISTORY_DAYS", "14")

from app.core.clock import set_now, utcnow
from app.core.rbac import Role
from app.core.security import create_access_token, hash_password
from app.main import create_app
from app.models.infra import City, ParkingBay, ParkingFacility, Zone
from app.models.occupancy import CurrentBayStatus
from app.models.user import User, UserRole


class ClockControl:
    """Helper allowing tests to freeze and advance the global mock clock."""

    def __init__(self, start_dt: datetime) -> None:
        self.current_dt = start_dt
        set_now(self.current_dt)

    def advance(self, seconds: float) -> datetime:
        self.current_dt += timedelta(seconds=seconds)
        set_now(self.current_dt)
        return self.current_dt

    def reset(self) -> None:
        set_now(None)


@pytest.fixture
def now() -> Iterator[ClockControl]:
    """Provides an injectable, controllable mock clock fixture."""
    start_dt = datetime(2030, 1, 1, 12, 0, 0, tzinfo=UTC)
    ctrl = ClockControl(start_dt)
    yield ctrl
    ctrl.reset()


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


class EntityFactory:
    """Async entity factory helper for integration tests."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def user(
        self,
        role: Role = Role.DRIVER,
        email: str | None = None,
        password: str = "correct-horse-battery",
        status: str = "approved",
    ) -> User:
        u_email = email or f"user_{uuid.uuid4().hex[:8]}@parksmart.local"
        user = User(
            email=u_email,
            password_hash=hash_password(password),
            full_name="Test Citizen",
            status=status,
            is_active=True,
        )
        self.session.add(user)
        await self.session.flush()

        from app.modules.users.repository import ROLE_ID_MAP
        role_id = ROLE_ID_MAP[role]
        ur = UserRole(user_id=user.id, role_id=role_id, granted_by=user.id)
        self.session.add(ur)
        await self.session.flush()
        await self.session.refresh(user, attribute_names=["user_roles"])
        return user

    def login_headers(self, user: User) -> dict[str, str]:
        roles = [ur.role.name for ur in user.user_roles if ur.role]
        token = create_access_token(user.id, roles)
        return {"Authorization": f"Bearer {token}"}

    async def city(self, name: str = "Bhubaneswar") -> City:
        c = City(name=name, state="Odisha", tz="Asia/Kolkata")
        self.session.add(c)
        await self.session.flush()
        return c

    async def zone(
        self,
        city: City,
        name: str = "Demo Zone",
        kind: str = "parking",
        reservation_rules: dict[str, Any] | None = None,
    ) -> Zone:
        from app.core import geo
        z = Zone(
            city_id=city.id,
            name=name,
            kind=kind,
            centroid=geo.point_expr_xy(20.2961, 85.8245),
            operating_schedule={"mon": [["06:00", "22:00"]]},
            crowd_thresholds={
                "occupancy_pct": {"moderate": 50.0, "high": 75.0, "very_high": 90.0},
                "pedestrians": {"moderate": 25, "high": 60, "very_high": 100},
            },
            reservation_rules=reservation_rules,
            is_active=True,
        )
        self.session.add(z)
        await self.session.flush()
        return z

    async def facility(self, zone: Zone, name: str = "Demo Facility", supports_reservation: bool = True) -> ParkingFacility:
        from app.core import geo
        f = ParkingFacility(
            zone_id=zone.id,
            name=name,
            kind="facility",
            location=geo.point_expr_xy(20.2961, 85.8245),
            supports_reservation=supports_reservation,
            is_active=True,
        )
        self.session.add(f)
        await self.session.flush()
        return f

    async def bay(
        self,
        facility: ParkingFacility,
        code: str = "A01",
        bay_type: str = "regular",
        categories: list[str] | None = None,
    ) -> ParkingBay:
        from app.core import geo
        b = ParkingBay(
            facility_id=facility.id,
            code=code,
            bay_type=bay_type,
            location=geo.point_expr_xy(20.2961, 85.8245),
            permitted_vehicle_categories=categories or ["car", "two_wheeler"],
            out_of_service=False,
        )
        self.session.add(b)
        await self.session.flush()
        cbs = CurrentBayStatus(bay_id=b.id, occupancy="free", observed_at=utcnow(), source="edge")
        self.session.add(cbs)
        await self.session.flush()
        return b


@pytest_asyncio.fixture
async def app():
    """Builds test FastAPI application instance."""
    return create_app()


@pytest_asyncio.fixture
async def client(app):
    """Provides async HTTP client wired to FastAPI ASGI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
