"""Graph-RAG retrieval (mock file or Node 3 Neo4j) with a conservative fallback.

Expected Node 3 graph model used by ``CONTEXT_QUERY``::

    (:Chamber {id})-[:HAS_SUBSYSTEM]->(:Subsystem {id})
    (:Subsystem)-[:HAS_INCIDENT]->(:Incident {
        id, anomaly_signature, root_cause, resolution_summary, occurred_at })
    (:Subsystem)-[:GOVERNED_BY]->(:OEMSpec {
        id, anomaly_signature, max_valve_adjustment_pct,
        purge_flow_min_sccm, purge_flow_max_sccm, max_purge_duration_sec })

If Node 3 uses different labels or properties, change only ``CONTEXT_QUERY`` and
keep its returned column names.
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Any, Final

from neo4j import AsyncDriver, AsyncGraphDatabase, Query, RoutingControl

from app.config import MOCKS_DIR, Settings, get_settings
from app.schemas import DriftAlert, GraphRagContext, OemSafetyBounds

logger = logging.getLogger(__name__)

MOCK_CONTEXT_PATH: Final[Path] = MOCKS_DIR / "sample_graph_rag.json"
SAFE_FALLBACK_MARKER: Final[str] = "SAFE_FALLBACK_POLICY"
SAFE_FALLBACK_BOUNDS: Final[OemSafetyBounds] = OemSafetyBounds(
    max_valve_adjustment_pct=-4.0,
    purge_flow_range_sccm=(180.0, 240.0),
    max_purge_duration_sec=90,
)

CONTEXT_QUERY: Final = """
MATCH (c:Chamber {id: $chamber_id})-[:HAS_SUBSYSTEM]->(s:Subsystem {id: $suspected_subsystem})
MATCH (s)-[:HAS_INCIDENT]->(i:Incident {anomaly_signature: $anomaly_signature})
MATCH (s)-[:GOVERNED_BY]->(o:OEMSpec {anomaly_signature: $anomaly_signature})
RETURN i.root_cause               AS historical_root_cause,
       i.resolution_summary       AS prior_resolution_summary,
       o.max_valve_adjustment_pct AS max_valve_adjustment_pct,
       o.purge_flow_min_sccm      AS purge_flow_min_sccm,
       o.purge_flow_max_sccm      AS purge_flow_max_sccm,
       o.max_purge_duration_sec   AS max_purge_duration_sec,
       [c.id, s.id, i.id, o.id]   AS graph_trace
ORDER BY i.occurred_at DESC
LIMIT 1
"""

_driver: AsyncDriver | None = None


def build_safe_fallback_context(alert: DriftAlert) -> GraphRagContext:
    """Return the conservative context used when no verified knowledge exists."""
    return GraphRagContext(
        chamber_id=alert.chamber_id,
        suspected_subsystem=alert.suspected_subsystem,
        anomaly_signature=alert.anomaly_signature,
        historical_root_cause=(
            "Unconfirmed: no verified historical root cause was retrieved from "
            "Graph-RAG. Manual diagnosis of the suspected subsystem is required."
        ),
        oem_safety_bounds=SAFE_FALLBACK_BOUNDS.model_copy(),
        prior_resolution_summary=(
            "No verified prior resolution is available. The conservative safe "
            "fallback policy applies."
        ),
        graph_trace=[alert.chamber_id, alert.suspected_subsystem, SAFE_FALLBACK_MARKER],
    )


def _matches_alert(context: GraphRagContext, alert: DriftAlert) -> bool:
    return (
        context.chamber_id == alert.chamber_id
        and context.suspected_subsystem == alert.suspected_subsystem
        and context.anomaly_signature == alert.anomaly_signature
    )


def _load_mock_context(alert: DriftAlert) -> GraphRagContext | None:
    context = GraphRagContext.model_validate_json(
        MOCK_CONTEXT_PATH.read_text(encoding="utf-8")
    )
    # Bounds recorded for one tool must never be applied to another.
    return context if _matches_alert(context, alert) else None


def _get_driver(settings: Settings) -> AsyncDriver:
    global _driver
    if _driver is None:
        timeout_sec = settings.node3_query_timeout_ms / 1000
        _driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
            connection_timeout=timeout_sec,
            connection_acquisition_timeout=timeout_sec,
            max_transaction_retry_time=0,
        )
    return _driver


def _context_from_record(alert: DriftAlert, record: dict[str, Any]) -> GraphRagContext:
    return GraphRagContext.model_validate(
        {
            "chamber_id": alert.chamber_id,
            "suspected_subsystem": alert.suspected_subsystem,
            "anomaly_signature": alert.anomaly_signature,
            "historical_root_cause": record["historical_root_cause"],
            "oem_safety_bounds": {
                "max_valve_adjustment_pct": record["max_valve_adjustment_pct"],
                "purge_flow_range_sccm": (
                    record["purge_flow_min_sccm"],
                    record["purge_flow_max_sccm"],
                ),
                "max_purge_duration_sec": record["max_purge_duration_sec"],
            },
            "prior_resolution_summary": record["prior_resolution_summary"],
            "graph_trace": record["graph_trace"],
        }
    )


async def _query_neo4j(alert: DriftAlert, settings: Settings) -> GraphRagContext | None:
    result = await _get_driver(settings).execute_query(
        Query(CONTEXT_QUERY, timeout=settings.node3_query_timeout_ms / 1000),
        parameters_={
            "chamber_id": alert.chamber_id,
            "suspected_subsystem": alert.suspected_subsystem,
            "anomaly_signature": alert.anomaly_signature,
        },
        database_=settings.neo4j_database,
        routing_=RoutingControl.READ,
    )
    if not result.records:
        return None
    return _context_from_record(alert, result.records[0].data())


async def get_graph_rag_context(
    alert: DriftAlert, settings: Settings | None = None
) -> GraphRagContext:
    """Retrieve context for ``alert``. Always returns a usable context.

    Connection errors, timeouts, empty results and malformed data all resolve to
    the safe fallback context.
    """
    settings = settings or get_settings()
    source = "mock file" if settings.use_mock_graph_rag else "Neo4j"
    try:
        if settings.use_mock_graph_rag:
            context = _load_mock_context(alert)
        else:
            context = await asyncio.wait_for(
                _query_neo4j(alert, settings),
                timeout=settings.node3_query_timeout_ms / 1000,
            )
    except TimeoutError:
        logger.warning(
            "Graph-RAG %s lookup exceeded %d ms for %s; using safe fallback",
            source,
            settings.node3_query_timeout_ms,
            alert.alert_id,
        )
        return build_safe_fallback_context(alert)
    except Exception as exc:  # Retrieval must never take down the council.
        logger.warning(
            "Graph-RAG %s lookup failed for %s (%s: %s); using safe fallback",
            source,
            alert.alert_id,
            type(exc).__name__,
            exc,
        )
        return build_safe_fallback_context(alert)

    if context is None:
        logger.warning(
            "Graph-RAG %s has no match for %s/%s/%s; using safe fallback",
            source,
            alert.chamber_id,
            alert.suspected_subsystem,
            alert.anomaly_signature,
        )
        return build_safe_fallback_context(alert)
    return context


async def close_neo4j_driver() -> None:
    """Close the shared driver, if one was created."""
    global _driver
    driver, _driver = _driver, None
    if driver is not None:
        await driver.close()
