"""State observation space for the factory environment under Dec-POMDP."""

from datetime import datetime, timedelta
from typing import Any
from pydantic import BaseModel, Field

from src.models.schemas import ShiftType, WorkOrderSnapshot


class WorkOrder(BaseModel):
    order_id: str
    machine_id: str
    part_type: str
    duration_minutes: int
    deadline_utc: datetime
    priority: int = 1
    nominal_power_kw: float = 40.0
    preheat_required: bool = False
    status: str = "IN_PROGRESS"
    actual_start_utc: datetime | None = None

    def to_snapshot(self) -> WorkOrderSnapshot:
        return WorkOrderSnapshot(
            order_id=self.order_id,
            machine_id=self.machine_id,
            part_type=self.part_type,
            duration_minutes=self.duration_minutes,
            deadline_utc=self.deadline_utc,
            priority=self.priority,
            nominal_power_kw=self.nominal_power_kw,
            preheat_required=self.preheat_required,
        )


class FactoryState(BaseModel):
    """Complete observation state of the manufacturing microgrid."""

    timestamp: datetime = Field(default_factory=datetime.utcnow)

    # Grid & Market Telemetry
    grid_carbon_intensity_gco2: float = 380.0
    forecast_carbon_intensity_4h: list[float] = Field(default_factory=lambda: [350.0, 320.0, 290.0, 310.0])
    grid_tou_tariff_usd_kwh: float = 0.18
    grid_demand_charge_usd_kw: float = 18.5
    current_grid_draw_kw: float = 450.0
    grid_guarantee_present: bool = False

    # Renewable & Storage Telemetry
    solar_irradiance_ghi: float = 450.0
    pv_generation_kw: float = 65.0
    bess_soc_pct: float = 55.0
    bess_capacity_kwh: float = 500.0
    bess_current_kw: float = 0.0  # + charge, - discharge
    regenerative_braking_kw: float = 12.0

    # Machinery & Thermal State
    thermal_oven_temp_c: float = 850.0
    oven_thermal_decay_rate_c_hr: float = 45.0
    active_orders: list[WorkOrder] = Field(default_factory=list)

    # Ergonomic & Environmental Telemetry
    factory_ambient_temp_c: float = 22.5
    ambient_noise_db: float = 73.0
    active_worker_count: int = 14
    current_shift: ShiftType = ShiftType.DAY
    minutes_to_handover: int = 90
    is_handover: bool = False

    # Overrides
    active_operator_overrides: dict[str, Any] = Field(default_factory=dict)

    @classmethod
    def create_default(cls) -> "FactoryState":
        """Factory method for initial test / baseline state."""
        now = datetime.utcnow()
        default_orders = [
            WorkOrder(
                order_id="WO-501",
                machine_id="CNC_MILL_5AXIS_01",
                part_type="Turbine_Housing_6061Al",
                duration_minutes=90,
                deadline_utc=now + timedelta(hours=3),
                nominal_power_kw=45.0,
            ),
            WorkOrder(
                order_id="WO-502",
                machine_id="VACUUM_OVEN_01",
                part_type="Steel_Pinion_Carburizing",
                duration_minutes=180,
                deadline_utc=now + timedelta(hours=5),
                nominal_power_kw=110.0,
                preheat_required=True,
            ),
        ]
        return cls(
            timestamp=now,
            active_orders=default_orders,
        )
