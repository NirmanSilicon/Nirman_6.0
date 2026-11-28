"""Domain enums for AFTERSHOCK."""
from enum import StrEnum


class AssetType(StrEnum):
    POWER_SUBSTATION = "power_substation"
    WATER_PUMP = "water_pump"
    HOSPITAL = "hospital"
    ROAD_SEGMENT = "road_segment"
    TELECOM_TOWER = "telecom_tower"


class LogicalState(StrEnum):
    OPERATIONAL = "operational"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"
    REPAIRING = "repairing"
    RECOVERED = "recovered"


class DependencyType(StrEnum):
    ELECTRICITY = "electricity"
    WATER = "water"
    ACCESS = "access"
    COMMUNICATION = "communication"


class DependencyMode(StrEnum):
    HARD = "hard"
    SOFT = "soft"
    ALTERNATIVE = "alternative"


class InterventionType(StrEnum):
    PROTECT_ASSET = "protect_asset"
    DEPLOY_BACKUP = "deploy_backup"
    TEMPORARY_SERVICE = "temporary_service"
    REPAIR_ASSET = "repair_asset"
    CLEAR_ACCESS = "clear_access"
