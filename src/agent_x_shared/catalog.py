"""Only local, finite seeded records may be used by the scaffold."""

import copy
import hashlib
import json
from importlib.resources import files


def digest(value: object) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(payload.encode()).hexdigest()


def load_catalog() -> dict:
    catalog = json.loads(files("agent_x_shared").joinpath("fixtures/catalog.json").read_text())
    ids = [fixture["id"] for fixture in catalog["fixtures"]]
    if len(set(ids)) != len(ids):
        raise ValueError("Duplicate fixture ID")
    for fixture in catalog["fixtures"]:
        for resource in fixture["source_refs"]:
            if resource not in catalog["records"]:
                raise ValueError("Unknown fixture source")
    return catalog


def load_fixture(fixture_id: str) -> dict:
    for fixture in load_catalog()["fixtures"]:
        if fixture["id"] == fixture_id:
            return copy.deepcopy(fixture)
    raise KeyError(fixture_id)
