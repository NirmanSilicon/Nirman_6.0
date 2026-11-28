"""
backend/app/core/mission_model/mission_schema.py

Mission Configuration Schema & Validation Engine.
Provides schema dataclasses, loader (JSON/YAML/dict), and validation rules:
- Missing required fields
- Duplicate module / component IDs
- Invalid dependency references (referencing non-existent module IDs)
- Directed cycles (cycle detection where DAG is required)
- Invalid parameters (out-of-range thresholds, negative delays/weights)
- Structural rule verification against canonical templates
"""

import os
import json
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Set, Union
import networkx as nx

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False

from .canonical_templates import (
    CausalModuleTemplate,
    get_canonical_template,
)


class MissionValidationError(Exception):
    """Raised when a mission configuration fails semantic or structural validation."""
    def __init__(self, message: str, errors: Optional[List[str]] = None):
        super().__init__(message)
        self.errors = errors or [message]


@dataclass
class ModuleParameterConfig:
    """Configured parameter overrides or specific thresholds for a module."""
    parameter_name: str
    nominal_value: Optional[float] = None
    min_threshold: Optional[float] = None
    max_threshold: Optional[float] = None
    unit: Optional[str] = None
    extra_properties: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MissionModuleConfig:
    """Specification of a module instance within a mission spacecraft."""
    module_id: str
    module_type: str
    name: str = ""
    description: str = ""
    parameters: Dict[str, Any] = field(default_factory=dict)
    telemetry_channels: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if not self.name:
            self.name = self.module_id.replace("_", " ").title()


@dataclass
class MissionDependencyConfig:
    """Specification of a directed dependency between two modules."""
    source_module_id: str
    target_module_id: str
    dependency_type: str = "functional"  # power, thermal, data, control, software, functional
    weight: float = 0.8
    propagation_delay_seconds: float = 0.5
    description: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MissionRuleConfig:
    """Mission-specific or subsystem-level operational rule."""
    rule_id: str
    rule_type: str
    target_module_id: str
    description: str = ""
    parameters: Dict[str, Any] = field(default_factory=dict)


from datetime import datetime, timezone


@dataclass
class MissionConfig:
    """Top-level schema representing a complete mission spacecraft architecture."""
    mission_id: str = "mission_cubesat_standard"
    spacecraft_name: str = ""
    name: str = ""
    craft_class: str = "CubeSat 3U"
    orbit_type: str = "LEO_550KM_SSO"
    orbit_profile: str = ""
    template_id: str = "canonical_cubesat_demo"
    version: str = "1.0.0"
    duration_seconds: int = 600
    cascade_offset_seconds: int = 300
    baseline_noise_sigma: float = 0.05
    environment_params: Dict[str, Any] = field(default_factory=lambda: {
        "eclipse_duration_minutes": 35.0,
        "solar_flux_w_m2": 1361.0,
        "thermal_sink_k": 4.0,
    })
    modules: List[MissionModuleConfig] = field(default_factory=list)
    dependencies: List[MissionDependencyConfig] = field(default_factory=list)
    rules: List[MissionRuleConfig] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def __post_init__(self):
        if not self.spacecraft_name:
            self.spacecraft_name = self.name or self.mission_id
        if not self.name:
            self.name = self.spacecraft_name
        if not self.orbit_profile:
            self.orbit_profile = self.orbit_type

    def get_module_ids(self) -> Set[str]:
        return {m.module_id for m in self.modules}

    def get_module(self, module_id: str) -> Optional[MissionModuleConfig]:
        for m in self.modules:
            if m.module_id == module_id:
                return m
        return None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "mission_id": self.mission_id,
            "spacecraft_name": self.spacecraft_name,
            "name": self.name,
            "craft_class": self.craft_class,
            "orbit_type": self.orbit_type,
            "orbit_profile": self.orbit_profile,
            "template_id": self.template_id,
            "version": self.version,
            "duration_seconds": self.duration_seconds,
            "cascade_offset_seconds": self.cascade_offset_seconds,
            "baseline_noise_sigma": self.baseline_noise_sigma,
            "environment_params": self.environment_params,
            "modules": [
                {
                    "module_id": m.module_id,
                    "module_type": m.module_type,
                    "name": m.name,
                    "description": m.description,
                    "parameters": m.parameters,
                    "telemetry_channels": m.telemetry_channels,
                    "metadata": m.metadata,
                }
                for m in self.modules
            ],
            "dependencies": [
                {
                    "source_module_id": d.source_module_id,
                    "target_module_id": d.target_module_id,
                    "dependency_type": d.dependency_type,
                    "weight": d.weight,
                    "propagation_delay_seconds": d.propagation_delay_seconds,
                    "description": d.description,
                    "metadata": d.metadata,
                }
                for d in self.dependencies
            ],
            "rules": [
                {
                    "rule_id": r.rule_id,
                    "rule_type": r.rule_type,
                    "target_module_id": r.target_module_id,
                    "description": r.description,
                    "parameters": r.parameters,
                }
                for r in self.rules
            ],
            "metadata": self.metadata,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MissionConfig":
        return parse_mission_config_dict(data)



def parse_mission_config_dict(data: Dict[str, Any]) -> MissionConfig:
    """Parse raw dictionary into structured MissionConfig object."""
    if not isinstance(data, dict):
        raise MissionValidationError(f"Expected mission config root to be a dictionary/object, got {type(data).__name__}")

    mission_id = data.get("mission_id", "")
    spacecraft_name = data.get("spacecraft_name", data.get("name", data.get("mission_id", "Unnamed Spacecraft")))
    name = data.get("name", spacecraft_name)
    craft_class = data.get("craft_class", "CubeSat 3U")
    orbit_type = data.get("orbit_type", data.get("orbit_profile", "LEO_550KM_SSO"))
    orbit_profile = data.get("orbit_profile", orbit_type)
    template_id = data.get("template_id", "canonical_cubesat_demo")
    version = data.get("version", "1.0.0")
    duration_seconds = int(data.get("duration_seconds", 600))
    cascade_offset_seconds = int(data.get("cascade_offset_seconds", 300))
    baseline_noise_sigma = float(data.get("baseline_noise_sigma", 0.05))
    environment_params = data.get("environment_params", {})
    created_at = data.get("created_at", datetime.now(timezone.utc).isoformat())

    modules_raw = data.get("modules", [])
    dependencies_raw = data.get("dependencies", [])
    rules_raw = data.get("rules", [])
    metadata = data.get("metadata", {})

    modules: List[MissionModuleConfig] = []
    for idx, m in enumerate(modules_raw):
        if not isinstance(m, dict):
            raise MissionValidationError(f"Module at index {idx} must be a dictionary.")
        modules.append(
            MissionModuleConfig(
                module_id=m.get("module_id", ""),
                module_type=m.get("module_type", ""),
                name=m.get("name", ""),
                description=m.get("description", ""),
                parameters=m.get("parameters", {}),
                telemetry_channels=m.get("telemetry_channels", []),
                metadata=m.get("metadata", {}),
            )
        )

    dependencies: List[MissionDependencyConfig] = []
    for idx, d in enumerate(dependencies_raw):
        if not isinstance(d, dict):
            raise MissionValidationError(f"Dependency at index {idx} must be a dictionary.")
        dependencies.append(
            MissionDependencyConfig(
                source_module_id=d.get("source_module_id", d.get("source", "")),
                target_module_id=d.get("target_module_id", d.get("target", "")),
                dependency_type=d.get("dependency_type", "functional"),
                weight=float(d.get("weight", 0.8)),
                propagation_delay_seconds=float(d.get("propagation_delay_seconds", d.get("delay", 0.5))),
                description=d.get("description", ""),
                metadata=d.get("metadata", {}),
            )
        )

    rules: List[MissionRuleConfig] = []
    for idx, r in enumerate(rules_raw):
        if not isinstance(r, dict):
            continue
        rules.append(
            MissionRuleConfig(
                rule_id=r.get("rule_id", f"rule_{idx}"),
                rule_type=r.get("rule_type", "custom"),
                target_module_id=r.get("target_module_id", ""),
                description=r.get("description", ""),
                parameters=r.get("parameters", {}),
            )
        )

    return MissionConfig(
        mission_id=mission_id,
        spacecraft_name=spacecraft_name,
        name=name,
        craft_class=craft_class,
        orbit_type=orbit_type,
        orbit_profile=orbit_profile,
        template_id=template_id,
        version=version,
        duration_seconds=duration_seconds,
        cascade_offset_seconds=cascade_offset_seconds,
        baseline_noise_sigma=baseline_noise_sigma,
        environment_params=environment_params,
        modules=modules,
        dependencies=dependencies,
        rules=rules,
        metadata=metadata,
        created_at=created_at,
    )



def load_mission_config(source: Union[str, Dict[str, Any]]) -> MissionConfig:
    """
    Load MissionConfig from:
    - Absolute or relative file path (.json, .yaml, .yml)
    - JSON or YAML formatted string
    - Python dictionary
    """
    if isinstance(source, dict):
        return parse_mission_config_dict(source)

    if isinstance(source, str):
        # Check if it's a file path
        if os.path.exists(source):
            with open(source, "r", encoding="utf-8") as f:
                content = f.read()
        else:
            content = source

        # Attempt JSON parse first
        try:
            data = json.loads(content)
            return parse_mission_config_dict(data)
        except json.JSONDecodeError:
            if HAS_YAML:
                data = yaml.safe_load(content)
                return parse_mission_config_dict(data)
            raise MissionValidationError("Content is not valid JSON and PyYAML is not available to parse YAML.")

    raise MissionValidationError(f"Unsupported configuration source type: {type(source).__name__}")


def validate_mission_config(
    config: Union[Dict[str, Any], MissionConfig],
    require_dag: bool = False,
    check_templates: bool = True,
) -> List[str]:
    """
    Perform comprehensive validation on a mission configuration.
    Returns list of error messages (empty if valid).
    Raises MissionValidationError if any critical errors exist when called via assert_valid_mission_config.
    """
    if isinstance(config, dict):
        config = parse_mission_config_dict(config)

    # Allow configuration metadata to enforce strict DAG
    if config.metadata.get("strict_dag", False):
        require_dag = True


    errors: List[str] = []

    # 1. Missing required top-level fields
    if not config.mission_id or not config.mission_id.strip():
        errors.append("Mission configuration missing required 'mission_id'.")
    if not config.spacecraft_name or not config.spacecraft_name.strip():
        errors.append("Mission configuration missing required 'spacecraft_name'.")
    if not config.modules:
        errors.append("Mission configuration must define at least one module in 'modules'.")

    # 2. Duplicate module / component IDs & module field checks
    seen_module_ids: Set[str] = set()
    for m in config.modules:
        if not m.module_id or not m.module_id.strip():
            errors.append("Found module with empty or missing 'module_id'.")
            continue
        if m.module_id in seen_module_ids:
            errors.append(f"Duplicate module ID detected: '{m.module_id}'. Module IDs must be globally unique.")
        else:
            seen_module_ids.add(m.module_id)

        if not m.module_type or not m.module_type.strip():
            errors.append(f"Module '{m.module_id}' is missing required 'module_type'.")
        elif check_templates:
            # Verify if template exists in canonical library
            tmpl = get_canonical_template(m.module_type)
            if tmpl is None:
                # Warning or soft error depending on policy; we allow custom modules but record notice
                pass

    # 3. Invalid dependency references
    for idx, dep in enumerate(config.dependencies):
        if not dep.source_module_id:
            errors.append(f"Dependency at index {idx} has missing 'source_module_id'.")
        elif dep.source_module_id not in seen_module_ids:
            errors.append(
                f"Dependency source '{dep.source_module_id}' does not exist in declared modules."
            )

        if not dep.target_module_id:
            errors.append(f"Dependency at index {idx} has missing 'target_module_id'.")
        elif dep.target_module_id not in seen_module_ids:
            errors.append(
                f"Dependency target '{dep.target_module_id}' does not exist in declared modules."
            )

        if dep.source_module_id and dep.target_module_id and dep.source_module_id == dep.target_module_id:
            errors.append(
                f"Self-loop dependency detected on module '{dep.source_module_id}'. Causal DAGs do not permit self-loops."
            )

        # 4. Invalid parameter ranges / types
        if dep.weight < 0.0 or dep.weight > 1.0:
            errors.append(
                f"Dependency {dep.source_module_id} -> {dep.target_module_id} has invalid weight {dep.weight}. Weight must be between 0.0 and 1.0."
            )
        if dep.propagation_delay_seconds < 0.0:
            errors.append(
                f"Dependency {dep.source_module_id} -> {dep.target_module_id} has negative propagation delay: {dep.propagation_delay_seconds}s."
            )

    # 5. Check parameter ranges on modules
    for m in config.modules:
        for p_name, p_val in m.parameters.items():
            if isinstance(p_val, (int, float)):
                # If template exists, check against nominal min/max
                tmpl = get_canonical_template(m.module_type)
                if tmpl and p_name in tmpl.measurable_variables:
                    var_def = tmpl.measurable_variables[p_name]
                    if var_def.nominal_min is not None and p_val < var_def.nominal_min:
                        errors.append(
                            f"Module '{m.module_id}' parameter '{p_name}' value {p_val} is below minimum {var_def.nominal_min}."
                        )
                    if var_def.nominal_max is not None and p_val > var_def.nominal_max:
                        errors.append(
                            f"Module '{m.module_id}' parameter '{p_name}' value {p_val} is above maximum {var_def.nominal_max}."
                        )

    # 6. Cycle detection (Directed Acyclic Graph check)
    if require_dag and not errors:
        # Build temp networkx DiGraph
        G = nx.DiGraph()
        for m in config.modules:
            G.add_node(m.module_id)
        for dep in config.dependencies:
            if dep.source_module_id in seen_module_ids and dep.target_module_id in seen_module_ids:
                G.add_edge(dep.source_module_id, dep.target_module_id)

        try:
            cycles = list(nx.simple_cycles(G))
            if cycles:
                cycle_strs = [" -> ".join(c + [c[0]]) for c in cycles]
                errors.append(
                    f"Directed cycle(s) detected in mission dependency graph: {'; '.join(cycle_strs)}. A strict causal DAG must be acyclic."
                )
        except Exception as e:
            errors.append(f"Cycle detection error: {str(e)}")

    return errors


def assert_valid_mission_config(
    config: Union[Dict[str, Any], MissionConfig],
    require_dag: bool = True,
    check_templates: bool = True,
) -> MissionConfig:
    """
    Validates configuration and returns the parsed MissionConfig object.
    Raises MissionValidationError if any errors are found.
    """
    if isinstance(config, dict):
        cfg = parse_mission_config_dict(config)
    else:
        cfg = config

    errors = validate_mission_config(cfg, require_dag=require_dag, check_templates=check_templates)
    if errors:
        raise MissionValidationError(
            f"Mission configuration validation failed with {len(errors)} error(s):\n" + "\n".join(f"- {e}" for e in errors),
            errors=errors,
        )
    return cfg
