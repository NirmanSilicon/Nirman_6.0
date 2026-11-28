"""
backend/app/core/mission_model/mission_config.py

Mission configuration schema for the AXYRA architectural boundary.
Re-exports the unified MissionConfig dataclass from mission_schema.py.
"""

from .mission_schema import MissionConfig

__all__ = ["MissionConfig"]
