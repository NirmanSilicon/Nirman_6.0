"""ParkSMART - Idempotent Smart City Demo Seeder (File 212)."""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import secrets
import sys
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.config import get_settings
from app.core.rbac import Role
from app.core.security import hash_device_secret, hash_password
from app.db.session import SessionFactory
from app.models.business import Business, BusinessMember
from app.models.infra import (
    Camera,
    CameraBayMapping,
    City,
    ParkingBay,
    ParkingFacility,
    Zone,
)
from app.models.occupancy import CurrentBayStatus
from app.models.user import RoleRow, User, UserRole

# Standard normalized box ROI for simulated camera coverage
DEFAULT_ROI = [[0.1, 0.1], [0.4, 0.1], [0.4, 0.5], [0.1, 0.5]]


async def seed(history_days: int = 0, seed_val: int = 42) -> dict[str, Any]:
    settings = get_settings()
    if settings.app_env == "production":
        print("ERROR: Refusing to seed demo data in production environment.", file=sys.stderr)
        sys.exit(2)

    admin_email = os.environ.get("SEED_ADMIN_EMAIL", "admin@parksmart.demo")
    admin_password = os.environ.get("SEED_ADMIN_PASSWORD", "correct-horse-battery-admin")
    demo_password = os.environ.get("SEED_DEMO_PASSWORD", "correct-horse-battery-demo")
    sim_secrets_path = os.environ.get("SIM_SECRETS_PATH", "/tmp/parksmart_sim_secrets.json")

    for p in (admin_password, demo_password):
        if "CHANGE_ME" in p or len(p) < 10:
            print("ERROR: Password must not contain CHANGE_ME and must be >= 10 chars.", file=sys.stderr)
            sys.exit(2)

    sim_secrets_data: dict[str, dict[str, Any]] = {}

    async with SessionFactory() as db:
        # 1. City: Bhubaneswar
        city_res = await db.execute(select(City).where(City.name == "Bhubaneswar", City.state == "Odisha"))
        city = city_res.scalar_one_or_none()
        if not city:
            city = City(name="Bhubaneswar", state="Odisha", tz="Asia/Kolkata")
            db.add(city)
            await db.flush()

        # 2. Roles verification
        roles_res = await db.execute(select(RoleRow))
        roles_map = {r.name: r.id for r in roles_res.scalars().all()}
        if not roles_map:
            print("ERROR: Roles must be seeded via alembic migration 0002 before running seed.", file=sys.stderr)
            sys.exit(1)

        # 3. Demo User Accounts
        demo_accounts = [
            (admin_email, admin_password, "System Administrator", Role.SYSTEM_ADMIN),
            ("municipal@parksmart.demo", demo_password, "Municipal Authority Lead", Role.MUNICIPAL_ADMIN),
            ("field@parksmart.demo", demo_password, "Senior Field Operator", Role.FIELD_OPERATOR),
            ("trader@parksmart.demo", demo_password, "Odisha Goods Transport", Role.BUSINESS_OPERATOR),
            ("driver@parksmart.demo", demo_password, "Citizen Driver", Role.DRIVER),
        ]

        created_users: dict[Role, User] = {}
        for email, pwd, name, role_enum in demo_accounts:
            u_res = await db.execute(select(User).where(User.email == email))
            u = u_res.scalar_one_or_none()
            if not u:
                u = User(
                    email=email,
                    password_hash=hash_password(pwd),
                    full_name=name,
                    status="approved",
                    is_active=True,
                )
                db.add(u)
                await db.flush()
                ur = UserRole(user_id=u.id, role_id=roles_map[role_enum.value], granted_by=u.id)
                db.add(ur)
                await db.flush()
            created_users[role_enum] = u

        # 4. Demo Business
        biz_owner = created_users[Role.BUSINESS_OPERATOR]
        biz_res = await db.execute(select(Business).where(Business.name == "Demo Traders"))
        business = biz_res.scalar_one_or_none()
        if not business:
            business = Business(
                name="Demo Traders",
                registration_no="OD-BBSR-2026-TRD01",
                status="approved",
                created_by=biz_owner.id,
            )
            db.add(business)
            await db.flush()
            bm = BusinessMember(business_id=business.id, user_id=biz_owner.id, member_role="owner")
            db.add(bm)
            await db.flush()

        # 5. 8 to 10 Bhubaneswar Zones
        from app.core import geo

        standard_rules = {
            "grace_min": 15,
            "pending_ttl_min": 15,
            "cancel_cutoff_min": 30,
            "overstay_grace_min": 15,
        }
        standard_thresholds = {
            "occupancy_pct": {"moderate": 50.0, "high": 75.0, "very_high": 90.0},
            "pedestrians": {"moderate": 25, "high": 60, "very_high": 100},
        }
        standard_schedule = {
            day: [["06:00", "22:00"]] for day in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        }

        demo_zones_spec = [
            ("DEMO Saheed Nagar Core", "mixed", 20.2885, 85.8450, standard_rules, standard_schedule, 8, 4),
            ("DEMO Master Canteen Station", "parking", 20.2660, 85.8415, standard_rules, standard_schedule, 10, 0),
            ("DEMO Janpath Retail Arcade", "parking", 20.2810, 85.8420, standard_rules, standard_schedule, 8, 0),
            ("DEMO Unit-1 Daily Haat Market", "loading", 20.2605, 85.8285, standard_rules, standard_schedule, 0, 8),
            ("DEMO Rasulgarh Transport Hub", "loading", 20.2980, 85.8650, standard_rules, standard_schedule, 0, 6),
            ("DEMO Patia Infocity Tech Park", "parking", 20.3540, 85.8190, standard_rules, standard_schedule, 10, 0),
            ("DEMO Nayapalli Jayadev Vihar", "parking", 20.3015, 85.8235, standard_rules, standard_schedule, 8, 0),
            ("DEMO Old Town Heritage Precinct", "parking", 20.2395, 85.8340, None, standard_schedule, 6, 0),  # Not bookable!
            ("DEMO Khandagiri Tourist Hub", "parking", 20.2610, 85.7870, standard_rules, standard_schedule, 8, 0),
        ]

        total_bays = 0
        for z_name, z_kind, z_lat, z_lon, rules, sched, n_reg, n_load in demo_zones_spec:
            z_res = await db.execute(select(Zone).where(Zone.city_id == city.id, Zone.name == z_name))
            zone = z_res.scalar_one_or_none()
            if not zone:
                zone = Zone(
                    city_id=city.id,
                    name=z_name,
                    kind=z_kind,
                    centroid=geo.point_expr_xy(z_lat, z_lon),
                    operating_schedule=sched,
                    crowd_thresholds=standard_thresholds,
                    reservation_rules=rules,
                    is_active=True,
                )
                db.add(zone)
                await db.flush()

            # Facility
            fac_name = f"{z_name} Main Facility"
            f_res = await db.execute(select(ParkingFacility).where(ParkingFacility.zone_id == zone.id, ParkingFacility.name == fac_name))
            facility = f_res.scalar_one_or_none()
            if not facility:
                facility = ParkingFacility(
                    zone_id=zone.id,
                    name=fac_name,
                    kind="facility",
                    location=geo.point_expr_xy(z_lat, z_lon),
                    supports_reservation=rules is not None,
                    is_active=True,
                )
                db.add(facility)
                await db.flush()

            # Regular Bays
            bay_ids_for_cam: list[str] = []
            for i in range(1, n_reg + 1):
                code = f"A{i:02d}"
                b_res = await db.execute(select(ParkingBay).where(ParkingBay.facility_id == facility.id, ParkingBay.code == code))
                bay = b_res.scalar_one_or_none()
                if not bay:
                    bay = ParkingBay(
                        facility_id=facility.id,
                        code=code,
                        bay_type="regular",
                        location=geo.point_expr_xy(z_lat, z_lon),
                        permitted_vehicle_categories=["two_wheeler", "car"],
                        out_of_service=False,
                    )
                    db.add(bay)
                    await db.flush()
                    # Initialize current_bay_status
                    stmt = pg_insert(CurrentBayStatus).values(bay_id=bay.id, occupancy="unknown", observed_at=None, source=None).on_conflict_do_nothing()
                    await db.execute(stmt)
                bay_ids_for_cam.append(str(bay.id))
                total_bays += 1

            # Loading Bays
            for j in range(1, n_load + 1):
                code = f"L{j:02d}"
                b_res = await db.execute(select(ParkingBay).where(ParkingBay.facility_id == facility.id, ParkingBay.code == code))
                bay = b_res.scalar_one_or_none()
                if not bay:
                    bay = ParkingBay(
                        facility_id=facility.id,
                        code=code,
                        bay_type="loading",
                        location=geo.point_expr_xy(z_lat, z_lon),
                        permitted_vehicle_categories=["van", "truck", "car"],
                        out_of_service=False,
                    )
                    db.add(bay)
                    await db.flush()
                    stmt = pg_insert(CurrentBayStatus).values(bay_id=bay.id, occupancy="unknown", observed_at=None, source=None).on_conflict_do_nothing()
                    await db.execute(stmt)
                bay_ids_for_cam.append(str(bay.id))
                total_bays += 1

            # Edge / Simulator Camera
            cam_name = f"SIM-{z_name.replace(' ', '-').upper()}"
            cam_res = await db.execute(select(Camera).where(Camera.zone_id == zone.id, Camera.name == cam_name))
            cam = cam_res.scalar_one_or_none()
            secret_raw = secrets.token_urlsafe(32)
            if not cam:
                cam = Camera(
                    zone_id=zone.id,
                    name=cam_name,
                    device_secret_hash=hash_device_secret(secret_raw),
                    status="online",
                    config={"interval_s": 60, "conf_threshold": 0.5, "area_m2": 250.0},
                    is_active=True,
                )
                db.add(cam)
                await db.flush()

                # Add mapping for first bay
                if bay_ids_for_cam:
                    mapping = CameraBayMapping(
                        camera_id=cam.id,
                        bay_id=uuid.UUID(bay_ids_for_cam[0]),
                        roi_polygon=DEFAULT_ROI,
                    )
                    db.add(mapping)
                    await db.flush()

            sim_secrets_data[str(cam.id)] = {
                "zone_id": str(zone.id),
                "camera_id": str(cam.id),
                "secret": secret_raw,
                "bay_ids": bay_ids_for_cam,
            }

        await db.commit()

    # Write SIM_SECRETS_PATH file
    os.makedirs(os.path.dirname(sim_secrets_path) or ".", exist_ok=True)
    with open(sim_secrets_path, "w", encoding="utf-8") as f:
        json.dump(sim_secrets_data, f, indent=2)

    try:
        os.chmod(sim_secrets_path, 0o600)
    except Exception:
        pass

    print(f"Successfully seeded {len(demo_zones_spec)} zones with {total_bays} bays.")
    print(f"Simulator credentials written to {sim_secrets_path}.")
    print("\n[SIMULATED DATA NOTICE]: All seeded infrastructure uses synthetic demo datasets.")
    return {"zones": len(demo_zones_spec), "bays": total_bays, "cameras": len(sim_secrets_data)}


def main() -> None:
    parser = argparse.ArgumentParser(description="ParkSMART Demo Data Seeder")
    parser.add_argument("--history-days", type=int, default=0, help="Days of simulated history to generate")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    args = parser.parse_args()

    asyncio.run(seed(history_days=args.history_days, seed_val=args.seed))


if __name__ == "__main__":
    main()
