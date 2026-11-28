"""End-to-end check of a running Node 4 instance.

Usage, from the ``node4_council`` directory::

    python -m app.main                       # terminal 1
    python scripts/test_local_council.py     # terminal 2
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

import httpx
from websockets.asyncio.client import ClientConnection, connect

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.config import get_settings  # noqa: E402
from app.graph_rag import (  # noqa: E402
    MOCK_CONTEXT_PATH,
    SAFE_FALLBACK_BOUNDS,
    SAFE_FALLBACK_MARKER,
    close_neo4j_driver,
    get_graph_rag_context,
)
from app.schemas import (  # noqa: E402
    CopilotRecommendation,
    DriftAlert,
    GraphRagContext,
    OemSafetyBounds,
)

HTTP_BASE_URL = "http://127.0.0.1:8004"
WS_URL = "ws://127.0.0.1:8004/ws/recommendations"
ALERT_PATH = BASE_DIR / "mocks" / "sample_drift_alert.json"


def check(condition: bool, message: str) -> None:
    """Assert that cannot be disabled by ``python -O``."""
    if not condition:
        raise AssertionError(message)


async def receive_recommendation(socket: ClientConnection, alert_id: str) -> dict:
    """Wait for this alert's broadcast, skipping traffic for other alerts."""
    while True:
        payload = json.loads(await socket.recv())
        if payload.get("alert_id") == alert_id:
            return payload


async def resolve_expected_bounds(
    recommendation: CopilotRecommendation, alert: DriftAlert, server_uses_mock: bool
) -> OemSafetyBounds:
    """Find the OEM bounds independently of the recommendation's own text."""
    if SAFE_FALLBACK_MARKER in recommendation.graph_trace:
        print("NOTE: server used the safe fallback Graph-RAG policy")
        return SAFE_FALLBACK_BOUNDS
    if server_uses_mock:
        context = GraphRagContext.model_validate_json(
            MOCK_CONTEXT_PATH.read_text(encoding="utf-8")
        )
        return context.oem_safety_bounds
    try:
        context = await get_graph_rag_context(alert)
    finally:
        await close_neo4j_driver()
    check(
        context.graph_trace == recommendation.graph_trace,
        "could not retrieve the same Neo4j context as the server to verify bounds",
    )
    return context.oem_safety_bounds


async def run() -> None:
    alert_payload = json.loads(ALERT_PATH.read_text(encoding="utf-8"))
    alert = DriftAlert.model_validate(alert_payload)
    settings = get_settings()
    # Covers a slow Graph-RAG lookup plus two LLM calls.
    deadline_sec = (
        settings.node3_query_timeout_ms + 2 * settings.ollama_timeout_ms
    ) / 1000 + 10

    # Loopback traffic must bypass any system HTTP proxy.
    async with httpx.AsyncClient(
        base_url=HTTP_BASE_URL, timeout=deadline_sec, trust_env=False
    ) as client:
        health_response = await client.get("/health")
        health_response.raise_for_status()
        health = health_response.json()
        print(f"Health: {json.dumps(health)}")

        async with connect(WS_URL, proxy=None) as socket:
            response = await client.post("/api/v1/trigger-council", json=alert_payload)
            check(response.status_code == 200, f"HTTP {response.status_code}: {response.text}")
            streamed = await asyncio.wait_for(
                receive_recommendation(socket, alert.alert_id), timeout=deadline_sec
            )

    print("\nReceived over WebSocket:")
    print(json.dumps(streamed, indent=2))

    recommendation = CopilotRecommendation.model_validate(streamed)
    check(streamed == response.json(), "WebSocket and HTTP payloads differ")

    params = streamed["execution_parameters"]
    check(params["requires_human_approval"] is True, "requires_human_approval must be true")

    bounds = await resolve_expected_bounds(recommendation, alert, health["use_mock_graph_rag"])
    valve_low, valve_high = sorted((0.0, bounds.max_valve_adjustment_pct))
    flow_low, flow_high = bounds.purge_flow_range_sccm
    valve = params["target_valve_adjustment_pct"]
    flow = params["purge_flow_sccm"]
    duration = params["purge_duration_sec"]

    check(valve_low <= valve <= valve_high, f"valve trim {valve}% outside OEM bounds")
    check(flow_low <= flow <= flow_high, f"purge flow {flow} sccm outside OEM bounds")
    check(
        0 <= duration <= bounds.max_purge_duration_sec,
        f"purge duration {duration} s outside OEM bounds",
    )

    print("\nPASS: human approval is required and all parameters respect OEM safety bounds")


def main() -> int:
    try:
        asyncio.run(run())
    except httpx.ConnectError:
        print(
            f"FAIL: cannot reach {HTTP_BASE_URL}. Start the server with: python -m app.main",
            file=sys.stderr,
        )
        return 1
    except (AssertionError, TimeoutError, httpx.HTTPError, OSError) as exc:
        print(f"FAIL: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
