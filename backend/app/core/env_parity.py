"""ParkSMART - Environment Example and Settings Parity Verification."""

from __future__ import annotations

import re
import sys
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Any

if __package__ in (None, ""):
    _backend_dir = Path(__file__).resolve().parents[2]
    if str(_backend_dir) not in sys.path:
        sys.path.insert(0, str(_backend_dir))

# Infrastructure-only environment variables present in .env.example for Docker/PostGIS
# container initialization and compose healthchecks. The backend application connects
# exclusively via DATABASE_URL (Settings.database_url) rather than these raw variables.
INFRASTRUCTURE_ENV_VARS: dict[str, str] = {
    "POSTGRES_USER": "PostgreSQL container initialization user (postgis / docker-compose healthcheck)",
    "POSTGRES_PASSWORD": "PostgreSQL container initialization password (postgis)",
    "POSTGRES_DB": "PostgreSQL container initialization database name (postgis / docker-compose healthcheck)",
}

_ENV_KEY_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*(?==)", re.MULTILINE)


@dataclass(frozen=True)
class ParityResult:
    """Result of comparing .env.example keys against a Pydantic Settings class."""

    missing_in_settings: tuple[str, ...]
    missing_in_env: tuple[str, ...]
    excluded_infra_keys: tuple[str, ...]

    @property
    def is_ok(self) -> bool:
        return not self.missing_in_settings and not self.missing_in_env


def parse_env_example_keys(env_path: Path) -> set[str]:
    """Extracts declared variable names from a dotenv example file."""
    content = env_path.read_text(encoding="utf-8")
    return set(_ENV_KEY_RE.findall(content))


def _extract_alias_names(alias_obj: Any) -> list[str]:
    """Resolves string, AliasPath, or AliasChoices values into env variable names."""
    if isinstance(alias_obj, str):
        return [alias_obj]
    if hasattr(alias_obj, "choices"):
        names: list[str] = []
        for choice in alias_obj.choices:
            names.extend(_extract_alias_names(choice))
        return names
    if hasattr(alias_obj, "path") and alias_obj.path:
        first = alias_obj.path[0]
        if isinstance(first, str):
            return [first]
    return []


def _normalize(name: str, case_sensitive: bool) -> str:
    return name if case_sensitive else name.upper()


def extract_settings_env_keys(settings_cls: type[Any]) -> tuple[dict[str, set[str]], bool]:
    """
    Maps each Settings field to the set of environment variable names it accepts.

    Respects Pydantic v2 `model_fields` (including `validation_alias`, `AliasChoices`,
    `AliasPath`, `alias`, `env_prefix`, and `case_sensitive`), with a fallback to class
    annotations when `pydantic_settings` is unavailable in minimal local environments.
    """
    model_config = getattr(settings_cls, "model_config", None) or {}
    env_prefix = str(model_config.get("env_prefix", "") or "")
    case_sensitive = bool(model_config.get("case_sensitive", False))

    model_fields = getattr(settings_cls, "model_fields", None)
    field_to_keys: dict[str, set[str]] = {}

    if isinstance(model_fields, Mapping) and model_fields:
        for field_name, field_info in model_fields.items():
            alias_names = _extract_alias_names(getattr(field_info, "validation_alias", None))
            if not alias_names:
                alias_val = getattr(field_info, "alias", None)
                if isinstance(alias_val, str) and alias_val:
                    alias_names = [alias_val]
            if not alias_names:
                alias_names = [f"{env_prefix}{field_name}"]
            field_to_keys[field_name] = {_normalize(n, case_sensitive) for n in alias_names}
        return field_to_keys, case_sensitive

    annotations = getattr(settings_cls, "__annotations__", {}) or {}
    for field_name in annotations:
        if field_name == "model_config" or field_name.startswith("_"):
            continue
        field_to_keys[field_name] = {_normalize(f"{env_prefix}{field_name}", case_sensitive)}
    return field_to_keys, case_sensitive


def check_env_parity(
    env_path: Path,
    settings_cls: type[Any],
    *,
    excluded_env_vars: dict[str, str] | None = None,
) -> ParityResult:
    """Compares `.env.example` keys against the resolved Settings environment names."""
    field_to_keys, case_sensitive = extract_settings_env_keys(settings_cls)
    raw_env_keys = parse_env_example_keys(env_path)
    normalized_env_keys = {_normalize(k, case_sensitive) for k in raw_env_keys}

    exclusions = INFRASTRUCTURE_ENV_VARS if excluded_env_vars is None else excluded_env_vars
    normalized_exclusions = {_normalize(k, case_sensitive) for k in exclusions}

    present_infra = tuple(sorted(normalized_env_keys & normalized_exclusions))
    app_env_keys = normalized_env_keys - normalized_exclusions
    all_settings_env_keys = {k for aliases in field_to_keys.values() for k in aliases}

    missing_in_settings = tuple(sorted(app_env_keys - all_settings_env_keys))
    missing_in_env = tuple(
        sorted(
            next(iter(sorted(aliases))) if len(aliases) == 1 else f"{field} ({'|'.join(sorted(aliases))})"
            for field, aliases in field_to_keys.items()
            if aliases.isdisjoint(app_env_keys)
        )
    )

    return ParityResult(
        missing_in_settings=missing_in_settings,
        missing_in_env=missing_in_env,
        excluded_infra_keys=present_infra,
    )


def main(env_file: str | Path | None = None) -> int:
    from app.config import Settings

    repo_root = Path(__file__).resolve().parents[3]
    target_env = Path(env_file) if env_file is not None else repo_root / ".env.example"
    result = check_env_parity(target_env, Settings)

    if result.missing_in_settings:
        print("Keys in .env.example missing from Settings:", list(result.missing_in_settings))
    if result.missing_in_env:
        print("Settings env vars missing from .env.example:", list(result.missing_in_env))
    if not result.is_ok:
        return 1

    print(
        "Parity check passed "
        f"(excluded infrastructure keys: {', '.join(result.excluded_infra_keys) or 'none'})."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
