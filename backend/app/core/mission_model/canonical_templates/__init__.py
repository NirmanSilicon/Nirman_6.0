"""
backend/app/core/mission_model/canonical_templates/__init__.py

Canonical CubeSat Causal Template Library registry.
Exports templates for the 8 core CubeSat subsystems:
- EPS / Power
- Battery
- Thermal
- ADCS
- OBC
- Communications
- Payload
- Flight Software
"""

from typing import Dict, List, Optional
from .module_spec import (
    CausalModuleTemplate,
    VariableDefinition,
    InterfaceDefinition,
    PropagationDelayRange,
    StructuralRule,
    StateEvolutionRule,
    FailureTransitionRule,
    RecoveryProtectionRule,
    StateTransitionSpec,
)
from .eps_power import EPS_POWER_TEMPLATE
from .battery import BATTERY_TEMPLATE
from .thermal import THERMAL_TEMPLATE
from .adcs import ADCS_TEMPLATE
from .obc import OBC_TEMPLATE
from .comms import COMMS_TEMPLATE
from .payload import PAYLOAD_TEMPLATE
from .flight_software import FLIGHT_SOFTWARE_TEMPLATE

CANONICAL_MODULE_TEMPLATES: Dict[str, CausalModuleTemplate] = {
    "EPS": EPS_POWER_TEMPLATE,
    "Power": EPS_POWER_TEMPLATE,
    "EPS_Power": EPS_POWER_TEMPLATE,
    "eps_power": EPS_POWER_TEMPLATE,
    "Battery": BATTERY_TEMPLATE,
    "battery": BATTERY_TEMPLATE,
    "Thermal": THERMAL_TEMPLATE,
    "thermal": THERMAL_TEMPLATE,
    "ADCS": ADCS_TEMPLATE,
    "adcs": ADCS_TEMPLATE,
    "OBC": OBC_TEMPLATE,
    "obc": OBC_TEMPLATE,
    "Communications": COMMS_TEMPLATE,
    "Comms": COMMS_TEMPLATE,
    "comms": COMMS_TEMPLATE,
    "Payload": PAYLOAD_TEMPLATE,
    "payload": PAYLOAD_TEMPLATE,
    "FlightSoftware": FLIGHT_SOFTWARE_TEMPLATE,
    "Flight_Software": FLIGHT_SOFTWARE_TEMPLATE,
    "flight_software": FLIGHT_SOFTWARE_TEMPLATE,
}

__all__ = [
    "CausalModuleTemplate",
    "VariableDefinition",
    "InterfaceDefinition",
    "PropagationDelayRange",
    "StructuralRule",
    "StateEvolutionRule",
    "FailureTransitionRule",
    "RecoveryProtectionRule",
    "StateTransitionSpec",
    "EPS_POWER_TEMPLATE",
    "BATTERY_TEMPLATE",
    "THERMAL_TEMPLATE",
    "ADCS_TEMPLATE",
    "OBC_TEMPLATE",
    "COMMS_TEMPLATE",
    "PAYLOAD_TEMPLATE",
    "FLIGHT_SOFTWARE_TEMPLATE",
    "CANONICAL_MODULE_TEMPLATES",
    "get_canonical_template",
    "list_canonical_templates",
]


def get_canonical_template(module_type: str) -> Optional[CausalModuleTemplate]:
    """Look up a canonical subsystem template by module type string or alias."""
    if not module_type:
        return None
    # Direct match or case-insensitive match
    if module_type in CANONICAL_MODULE_TEMPLATES:
        return CANONICAL_MODULE_TEMPLATES[module_type]
    lower = module_type.lower().replace(" ", "_").replace("-", "_")
    return CANONICAL_MODULE_TEMPLATES.get(lower)


def list_canonical_templates() -> List[CausalModuleTemplate]:
    """Return unique list of canonical subsystem templates."""
    seen = set()
    templates = []
    for tmpl in CANONICAL_MODULE_TEMPLATES.values():
        if tmpl.module_type not in seen:
            seen.add(tmpl.module_type)
            templates.append(tmpl)
    return templates
