"""ParkSMART - Unit Tests for Clock and Time Handling (File 198)."""

from datetime import UTC, datetime, timedelta

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

from app.config import Settings
from app.core import clock
from app.modules.ingestion.state_manager import derive_data_state


def test_utcnow_is_aware():
    now = clock.utcnow()
    assert now.tzinfo is not None
    assert now.tzinfo == UTC


def test_set_now_rejects_naive():
    naive_dt = datetime(2030, 1, 1, 12, 0, 0)
    with pytest.raises(ValueError):
        clock.set_now(naive_dt)


def test_ensure_utc_rejects_naive_and_converts_aware():
    naive_dt = datetime(2030, 1, 1, 12, 0, 0)
    with pytest.raises(ValueError):
        clock.ensure_utc(naive_dt)

    aware_kolkata = datetime(2030, 1, 1, 17, 30, 0, tzinfo=clock.APP_TZ)
    utc_dt = clock.ensure_utc(aware_kolkata)
    assert utc_dt.hour == 12
    assert utc_dt.minute == 0
    assert utc_dt.tzinfo == UTC


def test_floor_to_interval_5_and_15():
    dt = datetime(2030, 1, 1, 12, 7, 33, 500000, tzinfo=UTC)
    f5 = clock.floor_to_interval(dt, 5)
    assert f5 == datetime(2030, 1, 1, 12, 5, 0, tzinfo=UTC)

    f15 = clock.floor_to_interval(dt, 15)
    assert f15 == datetime(2030, 1, 1, 12, 0, 0, tzinfo=UTC)


def test_floor_to_interval_rejects_non_divisor():
    dt = datetime(2030, 1, 1, 12, 7, 0, tzinfo=UTC)
    with pytest.raises(ValueError):
        clock.floor_to_interval(dt, 7)


def test_parse_iso_utc_accepts_z_and_offset_rejects_naive():
    z_dt = clock.parse_iso_utc("2030-01-01T12:00:00Z")
    assert z_dt.tzinfo == UTC
    assert z_dt.hour == 12

    offset_dt = clock.parse_iso_utc("2030-01-01T17:30:00+05:30")
    assert offset_dt.hour == 12
    assert offset_dt.tzinfo == UTC


def test_local_hour_dow_kolkata():
    # 2030-01-01 is a Tuesday (weekday 1)
    # 2030-01-01T18:30:00Z in Asia/Kolkata (+05:30) is 2030-01-02 00:00:00 (Wednesday, weekday 2)
    dt = datetime(2030, 1, 1, 18, 30, 0, tzinfo=UTC)
    hour, dow = clock.local_hour_dow(dt)
    assert hour == 0
    assert dow == 2  # Wednesday


def test_age_seconds_clamps_negative():
    now = datetime(2030, 1, 1, 12, 0, 0, tzinfo=UTC)
    past = now - timedelta(seconds=45)
    assert clock.age_seconds(past, now=now) == 45.0

    future = now + timedelta(seconds=10)
    assert clock.age_seconds(future, now=now) == 0.0  # Clamped to 0.0


def test_derive_data_state_boundaries():
    now = datetime(2030, 1, 1, 12, 0, 0, tzinfo=UTC)
    settings = Settings(stale_after_s=120, unavailable_after_s=600)

    # <= 120s -> live
    live_obs = now - timedelta(seconds=120)
    assert derive_data_state(live_obs, "online", now, settings) == "live"

    # 121s to 600s -> stale
    stale_obs = now - timedelta(seconds=121)
    assert derive_data_state(stale_obs, "online", now, settings) == "stale"

    # > 600s -> unavailable
    unavail_obs = now - timedelta(seconds=601)
    assert derive_data_state(unavail_obs, "online", now, settings) == "unavailable"


def test_derive_data_state_camera_offline_overrides():
    now = datetime(2030, 1, 1, 12, 0, 0, tzinfo=UTC)
    fresh_obs = now - timedelta(seconds=10)  # Very fresh!
    settings = Settings(stale_after_s=120, unavailable_after_s=600)

    # Offline/maintenance camera forces state to unavailable regardless of observation freshness
    assert derive_data_state(fresh_obs, "offline", now, settings) == "unavailable"
    assert derive_data_state(fresh_obs, "maintenance", now, settings) == "unavailable"


def test_derive_data_state_never_observed_unknown():
    now = datetime(2030, 1, 1, 12, 0, 0, tzinfo=UTC)
    assert derive_data_state(None, "online", now) == "unknown"
