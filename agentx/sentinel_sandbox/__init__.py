"""SENTINEL Sandbox & Attack Simulator package."""

from .client import ProductClient, ProductClientError
from .fixtures import (
    BASE_RECORDS,
    FIXTURES,
    FIXTURE_CATALOG_VERSION,
    MOCK_MAILBOX_ID,
    STARTING_STATE_DIGEST,
)
from .simulator import (
    apply_mock_effect,
    build_report,
    diff_state,
    load_fixture,
    read_mock_record,
    replay_proposals,
    reset_session,
    resolve_approval_in_comparison,
    run_comparison,
    score_comparison,
    seed_session,
    verify_approval_edge_cases,
)

__all__ = [
    "BASE_RECORDS",
    "FIXTURES",
    "FIXTURE_CATALOG_VERSION",
    "MOCK_MAILBOX_ID",
    "ProductClient",
    "ProductClientError",
    "STARTING_STATE_DIGEST",
    "apply_mock_effect",
    "build_report",
    "diff_state",
    "load_fixture",
    "read_mock_record",
    "replay_proposals",
    "reset_session",
    "resolve_approval_in_comparison",
    "run_comparison",
    "score_comparison",
    "seed_session",
    "verify_approval_edge_cases",
]
