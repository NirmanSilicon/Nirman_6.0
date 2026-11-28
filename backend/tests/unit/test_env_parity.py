"""ParkSMART - Unit Tests for .env.example and Settings Parity Checker."""

from __future__ import annotations

import tempfile
import unittest
from dataclasses import dataclass
from pathlib import Path
from types import SimpleNamespace
from typing import Any

from app.config import Settings
from app.core.env_parity import INFRASTRUCTURE_ENV_VARS, check_env_parity


@dataclass
class _MockFieldInfo:
    alias: str | None = None
    validation_alias: Any = None


@dataclass
class _MockAliasChoices:
    choices: tuple[Any, ...]


def _make_settings_stub(
    fields: dict[str, _MockFieldInfo],
    *,
    env_prefix: str = "",
    case_sensitive: bool = False,
) -> Any:
    return SimpleNamespace(
        model_config={"env_prefix": env_prefix, "case_sensitive": case_sensitive},
        model_fields=fields,
    )


class TestEnvParityChecker(unittest.TestCase):
    """Tests for environment variable and Settings parity verification."""

    def _write_env_file(self, directory: str, content: str) -> Path:
        env_path = Path(directory) / ".env.example"
        env_path.write_text(content, encoding="utf-8")
        return env_path

    def test_uppercase_env_matches_lowercase_fields(self) -> None:
        """Uppercase .env.example keys match lowercase Settings fields when case-insensitive."""
        sample_settings = _make_settings_stub(
            {
                "app_env": _MockFieldInfo(),
                "database_url": _MockFieldInfo(),
                "jwt_algorithm": _MockFieldInfo(),
                "free_bay_green_threshold": _MockFieldInfo(),
            }
        )

        with tempfile.TemporaryDirectory() as tmp:
            env_path = self._write_env_file(
                tmp,
                "APP_ENV=development\n"
                "DATABASE_URL=postgresql+asyncpg://user:pass@db:5432/app\n"
                "JWT_ALGORITHM=HS256\n"
                "FREE_BAY_GREEN_THRESHOLD=0.30\n",
            )
            res = check_env_parity(env_path, sample_settings, excluded_env_vars={})

        self.assertTrue(res.is_ok)
        self.assertEqual(res.missing_in_settings, ())
        self.assertEqual(res.missing_in_env, ())

    def test_explicit_aliases_and_prefix_supported(self) -> None:
        """Explicit validation_alias, AliasChoices, alias, and env_prefix map properly."""
        aliased_settings = _make_settings_stub(
            {
                "api_key": _MockFieldInfo(validation_alias="CUSTOM_API_KEY"),
                "broker": _MockFieldInfo(
                    validation_alias=_MockAliasChoices(("MQTT_BROKER", "LEGACY_BROKER"))
                ),
                "port": _MockFieldInfo(alias="SERVICE_PORT"),
                "mode": _MockFieldInfo(),
            },
            env_prefix="PARK_",
        )

        with tempfile.TemporaryDirectory() as tmp:
            env_path = self._write_env_file(
                tmp,
                "CUSTOM_API_KEY=placeholder\n"
                "MQTT_BROKER=mosquitto\n"
                "SERVICE_PORT=8000\n"
                "PARK_MODE=dev\n",
            )
            res = check_env_parity(env_path, aliased_settings, excluded_env_vars={})

        self.assertTrue(res.is_ok)
        self.assertEqual(res.missing_in_settings, ())
        self.assertEqual(res.missing_in_env, ())

    def test_genuine_unmatched_env_key_reported(self) -> None:
        """Unrecognized application env keys in .env.example are flagged."""
        sample_settings = _make_settings_stub({"app_env": _MockFieldInfo()})

        with tempfile.TemporaryDirectory() as tmp:
            env_path = self._write_env_file(
                tmp,
                "APP_ENV=development\nMETRIC_NAMESPACE=parksmart\n",
            )
            res = check_env_parity(env_path, sample_settings, excluded_env_vars={})

        self.assertFalse(res.is_ok)
        self.assertEqual(res.missing_in_settings, ("METRIC_NAMESPACE",))
        self.assertEqual(res.missing_in_env, ())

    def test_intentional_infrastructure_vars_excluded_explicitly(self) -> None:
        """Documented container initialization variables do not fail parity checks."""
        sample_settings = _make_settings_stub({"database_url": _MockFieldInfo()})

        with tempfile.TemporaryDirectory() as tmp:
            env_path = self._write_env_file(
                tmp,
                "DATABASE_URL=postgresql+asyncpg://parksmart:CHANGE_ME@db:5432/parksmart\n"
                "POSTGRES_USER=parksmart\n"
                "POSTGRES_PASSWORD=CHANGE_ME\n"
                "POSTGRES_DB=parksmart\n",
            )
            res = check_env_parity(
                env_path, sample_settings, excluded_env_vars=INFRASTRUCTURE_ENV_VARS
            )

        self.assertTrue(res.is_ok)
        self.assertEqual(
            res.excluded_infra_keys,
            ("POSTGRES_DB", "POSTGRES_PASSWORD", "POSTGRES_USER"),
        )

    def test_missing_required_settings_key_in_env_fails(self) -> None:
        """Settings fields absent from .env.example cause parity verification to fail."""
        sample_settings = _make_settings_stub(
            {
                "app_env": _MockFieldInfo(),
                "free_bay_green_threshold": _MockFieldInfo(),
            }
        )

        with tempfile.TemporaryDirectory() as tmp:
            env_path = self._write_env_file(tmp, "APP_ENV=development\n")
            res = check_env_parity(env_path, sample_settings, excluded_env_vars={})

        self.assertFalse(res.is_ok)
        self.assertEqual(res.missing_in_settings, ())
        self.assertEqual(res.missing_in_env, ("FREE_BAY_GREEN_THRESHOLD",))

    def test_repo_env_example_and_settings_parity(self) -> None:
        """Repository root .env.example matches backend Settings with documented infra exclusions."""
        repo_root = Path(__file__).resolve().parents[3]
        res = check_env_parity(repo_root / ".env.example", Settings)

        self.assertTrue(
            res.is_ok,
            f"Parity mismatch: missing_in_settings={res.missing_in_settings}, "
            f"missing_in_env={res.missing_in_env}",
        )
        self.assertEqual(
            res.excluded_infra_keys,
            ("POSTGRES_DB", "POSTGRES_PASSWORD", "POSTGRES_USER"),
        )


if __name__ == "__main__":
    unittest.main()
