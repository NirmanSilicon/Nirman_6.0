"""Dump JSON Schema 2020-12 drafts for domain models."""
import json
from pathlib import Path
from packages.domain.models import Asset, Dependency, Scenario, Intervention, SimulationEvent

schemas_dir = Path("schemas")
schemas_dir.mkdir(parents=True, exist_ok=True)

models = {
    "asset.schema.json": Asset,
    "dependency.schema.json": Dependency,
    "scenario.schema.json": Scenario,
    "intervention.schema.json": Intervention,
    "event.schema.json": SimulationEvent,
}

for filename, model_cls in models.items():
    schema = model_cls.model_json_schema()
    schema["$schema"] = "https://json-schema.org/draft/2020-12/schema"
    with open(schemas_dir / filename, "w") as f:
        json.dump(schema, f, indent=2)
    print(f"Generated {filename}")
