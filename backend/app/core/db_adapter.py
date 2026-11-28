"""
backend/app/core/db_adapter.py

Unified Database Storage Adapter for AXYRA SpaceTech.
Implements the full database specification from db_help.md:
- Primary Cloud/PostgreSQL Layer: Supabase Postgres via PostgREST REST API.
- Resilient Embedded Layer: SQLite3 (with WAL mode) for zero-config offline execution.
"""

import os
import uuid
import json
import sqlite3
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any, Union

# Determine base dir
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / 'db.sqlite3'

# Supabase configuration (Strictly gated by DEPLOYMENT_MODE == "CLOUD")
DEPLOYMENT_MODE = os.environ.get("DEPLOYMENT_MODE", "SOVEREIGN").strip().upper()
SUPABASE_URL = os.environ.get("SUPABASE_URL", "") if DEPLOYMENT_MODE == "CLOUD" else ""
SUPABASE_KEY = (os.environ.get("SUPABASE_SECRET_KEY", "") or os.environ.get("SUPABASE_PUBLISHABLE_KEY", "")) if DEPLOYMENT_MODE == "CLOUD" else ""


def _sync_to_supabase(table: str, data: Dict[str, Any], method: str = "POST", on_conflict: Optional[str] = None):
    """
    Sync a record to Supabase via its high-performance PostgREST HTTP endpoint.
    Strictly disabled and bypassed when DEPLOYMENT_MODE != 'CLOUD' to enforce zero egress.
    """
    if DEPLOYMENT_MODE != "CLOUD":
        return False  # Zero outbound network calls in SOVEREIGN mode

    if not SUPABASE_URL or not SUPABASE_KEY:
        return False

    try:
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{table}"
        if on_conflict:
            url += f"?on_conflict={on_conflict}"

        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal"
        }

        payload = json.dumps(data).encode("utf-8")
        req = urllib.request.Request(url, data=payload, headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=4.0) as resp:
            return resp.status in (200, 201, 204)
    except Exception as e:
        # Graceful fallback to SQLite
        return False


def get_sqlite_connection():
    """Create a SQLite connection with row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_database():
    """
    Initialize all database tables defined in db_help.md schema:
    1. incidents
    2. incident_events
    3. causal_graphs
    4. counterfactual_runs
    5. diagnostic_reports
    6. ai_inference_logs
    """
    conn = get_sqlite_connection()
    cursor = conn.cursor()

    # Enable WAL mode for high concurrency
    try:
        cursor.execute("PRAGMA journal_mode=WAL;")
    except Exception:
        pass

    # 1. Incidents Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS incidents (
            incident_id TEXT PRIMARY KEY,
            title TEXT,
            status TEXT DEFAULT 'analyzed',
            duration_seconds INTEGER DEFAULT 600,
            primary_cause_event_id TEXT,
            events_json TEXT,
            metadata_json TEXT,
            created_at TEXT
        );
    """)

    # 2. Incident Events Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS incident_events (
            id TEXT PRIMARY KEY,
            incident_id TEXT,
            timestamp TEXT,
            component TEXT,
            event_type TEXT,
            value REAL,
            z_score REAL,
            description TEXT,
            source TEXT,
            confidence REAL,
            is_anomaly INTEGER DEFAULT 0,
            feature_vector_json TEXT,
            FOREIGN KEY (incident_id) REFERENCES incidents (incident_id) ON DELETE CASCADE
        );
    """)

    # 3. Causal Graphs Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS causal_graphs (
            incident_id TEXT PRIMARY KEY,
            primary_cause_event_id TEXT,
            nodes_json TEXT,
            edges_json TEXT,
            minimum_explanation_ids_json TEXT,
            analyzed_at TEXT,
            FOREIGN KEY (incident_id) REFERENCES incidents (incident_id) ON DELETE CASCADE
        );
    """)

    # 4. Counterfactual Runs Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS counterfactual_runs (
            query_id TEXT PRIMARY KEY,
            incident_id TEXT,
            target_event_id TEXT,
            lead_time_minutes REAL,
            prevented_event_ids_json TEXT,
            remaining_event_ids_json TEXT,
            prevented_count INTEGER,
            remaining_count INTEGER,
            summary_text TEXT,
            executed_at TEXT,
            FOREIGN KEY (incident_id) REFERENCES incidents (incident_id) ON DELETE CASCADE
        );
    """)

    # 5. Diagnostic Reports Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS diagnostic_reports (
            report_id TEXT PRIMARY KEY,
            incident_id TEXT,
            report_format TEXT,
            summary TEXT,
            primary_cause_event_id TEXT,
            events_count INTEGER,
            evidence_trace_json TEXT,
            exported_at TEXT,
            FOREIGN KEY (incident_id) REFERENCES incidents (incident_id) ON DELETE CASCADE
        );
    """)

    # 6. AI Inference Logs Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ai_inference_logs (
            log_id TEXT PRIMARY KEY,
            incident_id TEXT,
            component TEXT,
            timestamp TEXT,
            anomaly_probability REAL,
            is_anomaly INTEGER,
            feature_vector_json TEXT,
            shap_attributions_json TEXT,
            model_version TEXT,
            created_at TEXT
        );
    """)

    # 7. Engineer Feedback Table — Active Learning Data Flywheel
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS engineer_feedback (
            feedback_id TEXT PRIMARY KEY,
            incident_id TEXT NOT NULL,
            event_id TEXT NOT NULL,
            component TEXT NOT NULL,
            engineer_verdict TEXT NOT NULL,
            corrected_cause TEXT,
            confidence_override REAL,
            feature_vector_json TEXT,
            model_prediction TEXT,
            model_confidence REAL,
            engineer_notes TEXT,
            created_at TEXT,
            incorporated_in_retrain INTEGER DEFAULT 0
        );
    """)

    # 8. Simulations Table (Canonical Simulation Architecture)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS simulations (
            simulation_id TEXT PRIMARY KEY,
            scenario_id TEXT,
            name TEXT,
            description TEXT,
            random_seed INTEGER,
            configuration_version TEXT,
            parameters_json TEXT,
            ground_truth_json TEXT,
            events_json TEXT,
            summary_json TEXT,
            status TEXT,
            created_at TEXT
        );
    """)

    # 9. Simulation Telemetry Records Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS simulation_telemetry (
            packet_id TEXT,
            simulation_id TEXT,
            timestamp TEXT,
            mission_elapsed_time REAL,
            subsystem TEXT,
            channel_id TEXT,
            signal_name TEXT,
            value REAL,
            unit TEXT,
            quality TEXT,
            source_type TEXT,
            packet_sequence INTEGER,
            expected_value REAL,
            metadata_json TEXT,
            PRIMARY KEY (simulation_id, packet_id)
        );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sim_tel_chan ON simulation_telemetry (simulation_id, channel_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sim_tel_seq ON simulation_telemetry (simulation_id, packet_sequence);")

    # Dynamic Column Migration for SQLite
    def _ensure_columns(table_name: str, required_cols: Dict[str, str]):
        cursor.execute(f"PRAGMA table_info({table_name});")
        existing_cols = {row["name"] for row in cursor.fetchall()}
        for col_name, col_type in required_cols.items():
            if col_name not in existing_cols:
                try:
                    cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type};")
                except Exception:
                    pass

    _ensure_columns("incidents", {
        "title": "TEXT",
        "status": "TEXT DEFAULT 'analyzed'",
        "duration_seconds": "INTEGER DEFAULT 600",
        "primary_cause_event_id": "TEXT",
        "events_json": "TEXT",
        "metadata_json": "TEXT",
        "created_at": "TEXT",
        "zk_proof_json": "TEXT",
        "chain_tx_hash": "TEXT",
        "sha256_signature": "TEXT"
    })

    _ensure_columns("incident_events", {
        "id": "TEXT",
        "incident_id": "TEXT",
        "timestamp": "TEXT",
        "component": "TEXT",
        "event_type": "TEXT",
        "value": "REAL",
        "z_score": "REAL",
        "description": "TEXT",
        "source": "TEXT",
        "confidence": "REAL DEFAULT 1.0",
        "is_anomaly": "INTEGER DEFAULT 0",
        "feature_vector_json": "TEXT"
    })

    _ensure_columns("engineer_feedback", {
        "feedback_id": "TEXT",
        "incident_id": "TEXT",
        "event_id": "TEXT",
        "component": "TEXT",
        "engineer_verdict": "TEXT",
        "corrected_cause": "TEXT",
        "confidence_override": "REAL",
        "feature_vector_json": "TEXT",
        "model_prediction": "TEXT",
        "model_confidence": "REAL",
        "engineer_notes": "TEXT",
        "created_at": "TEXT",
        "incorporated_in_retrain": "INTEGER DEFAULT 0"
    })

    conn.commit()
    conn.close()



# Run initialization on import
init_database()


# -------------------------------------------------------------------------
# CRUD Methods with Supabase Sync & SQLite Fallback
# -------------------------------------------------------------------------

def save_incident(incident_id: str, events: List[Any], metadata: Optional[Dict[str, Any]] = None, title: Optional[str] = None) -> bool:
    """Save an incident and its extracted events to SQLite and Supabase."""
    metadata = metadata or {}
    title = title or f"Incident {incident_id}"
    duration_s = metadata.get("duration", 600)
    now_iso = datetime.now(timezone.utc).isoformat()

    # Convert events to serializable dicts
    events_data = []
    for ev in events:
        if hasattr(ev, 'to_dict'):
            events_data.append(ev.to_dict())
        elif isinstance(ev, dict):
            events_data.append(ev)
        else:
            events_data.append({
                "id": getattr(ev, 'id', str(ev)),
                "component": getattr(ev, 'component', 'unknown'),
                "timestamp": getattr(ev, 'timestamp', ''),
                "event_type": getattr(ev, 'event_type', 'anomaly'),
                "value": getattr(ev, 'value', 0.0),
                "z_score": getattr(ev, 'z_score', 0.0),
                "description": getattr(ev, 'description', ''),
                "source": getattr(ev, 'source', 'simulation'),
            })

    # Save to SQLite
    conn = get_sqlite_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO incidents (incident_id, title, status, duration_seconds, primary_cause_event_id, events_json, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        incident_id,
        title,
        "analyzed",
        duration_s,
        None,
        json.dumps(events_data),
        json.dumps(metadata),
        now_iso
    ))

    for ev in events_data:
        cursor.execute("""
            INSERT OR REPLACE INTO incident_events (
                id, incident_id, timestamp, component, event_type, value, z_score, description, source, confidence, is_anomaly, feature_vector_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            ev.get("id"),
            incident_id,
            ev.get("timestamp", ""),
            ev.get("component", ""),
            ev.get("event_type", ""),
            ev.get("value", 0.0),
            ev.get("z_score", 0.0),
            ev.get("description", ""),
            ev.get("source", ""),
            ev.get("confidence", 1.0),
            1 if ev.get("is_anomaly", False) else 0,
            json.dumps(ev.get("feature_vector", {}))
        ))

    conn.commit()
    conn.close()

    # Sync to Supabase
    _sync_to_supabase("incidents", {
        "incident_id": incident_id,
        "title": title,
        "status": "analyzed",
        "duration_seconds": duration_s,
        "events_json": json.dumps(events_data),
        "metadata_json": json.dumps(metadata),
        "created_at": now_iso
    }, on_conflict="incident_id")

    return True


def load_incident(incident_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve an incident by ID from SQLite."""
    conn = get_sqlite_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM incidents WHERE incident_id = ?", (incident_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    incident_dict = dict(row)
    incident_dict["events"] = json.loads(incident_dict.get("events_json") or "[]")
    incident_dict["metadata"] = json.loads(incident_dict.get("metadata_json") or "{}")
    if incident_dict.get("zk_proof_json"):
        try:
            incident_dict["zk_proof"] = json.loads(incident_dict["zk_proof_json"])
        except Exception:
            incident_dict["zk_proof"] = None

    conn.close()
    return incident_dict


def save_incident_zk_proof(incident_id: str, zk_proof: Dict[str, Any]) -> bool:
    """Persist generated ZK Proof Bundle for an incident."""
    conn = get_sqlite_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE incidents SET zk_proof_json = ? WHERE incident_id = ?", (json.dumps(zk_proof), incident_id))
    conn.commit()
    conn.close()
    return True


def save_incident_anchor(incident_id: str, sha256_signature: str, chain_tx_hash: Optional[str] = None) -> bool:
    """Persist SHA256 integrity signature and on-chain tx hash."""
    conn = get_sqlite_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE incidents SET sha256_signature = ?, chain_tx_hash = ? WHERE incident_id = ?",
        (sha256_signature, chain_tx_hash, incident_id)
    )
    conn.commit()
    conn.close()
    return True


def update_incident_status(incident_id: str, status: str) -> bool:
    """Update lifecycle status of an incident (e.g. INVESTIGATING, ROOT_CAUSE_ISOLATED, RESOLVED)."""
    conn = get_sqlite_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE incidents SET status = ? WHERE incident_id = ?", (status, incident_id))
    conn.commit()
    conn.close()
    return True


def list_incidents(limit: int = 50) -> List[Dict[str, Any]]:
    """List recent incidents from SQLite."""
    conn = get_sqlite_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT incident_id, title, status, duration_seconds, primary_cause_event_id, created_at, events_json FROM incidents ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    results = []
    for r in rows:
        item = dict(r)
        events = json.loads(item.get("events_json") or "[]")
        item["event_count"] = len(events)
        item.pop("events_json", None)
        results.append(item)
    conn.close()
    return results


def save_causal_graph(incident_id: str, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]], primary_cause_id: Optional[str] = None, primary_cause_event_id: Optional[str] = None, min_exp_ids: Optional[List[str]] = None, minimum_explanation_ids: Optional[List[str]] = None) -> bool:
    """Save solved DAG nodes, edges, and minimum explanations."""
    target_primary_id = primary_cause_event_id or primary_cause_id
    target_min_exp = minimum_explanation_ids or min_exp_ids or []
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_sqlite_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO causal_graphs (incident_id, primary_cause_event_id, nodes_json, edges_json, minimum_explanation_ids_json, analyzed_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        incident_id,
        target_primary_id,
        json.dumps(nodes),
        json.dumps(edges),
        json.dumps(target_min_exp),
        now_iso
    ))

    if target_primary_id:
        cursor.execute("UPDATE incidents SET primary_cause_event_id = ? WHERE incident_id = ?", (target_primary_id, incident_id))

    conn.commit()
    conn.close()

    # Sync to Supabase
    _sync_to_supabase("causal_graphs", {
        "incident_id": incident_id,
        "primary_cause_event_id": target_primary_id,
        "nodes_json": json.dumps(nodes),
        "edges_json": json.dumps(edges),
        "minimum_explanation_ids_json": json.dumps(target_min_exp),
        "analyzed_at": now_iso
    }, on_conflict="incident_id")

    return True


def save_counterfactual_run(query_id: str, incident_id: str, target_event_id: str, lead_time_minutes: float, prevented_ids: List[str], remaining_ids: List[str], summary_text: Optional[str] = None, summary: Optional[str] = None) -> bool:
    """Save counterfactual simulation results."""
    final_summary = summary or summary_text or ""
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_sqlite_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO counterfactual_runs (
            query_id, incident_id, target_event_id, lead_time_minutes, prevented_event_ids_json, remaining_event_ids_json, prevented_count, remaining_count, summary_text, executed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        query_id,
        incident_id,
        target_event_id,
        lead_time_minutes,
        json.dumps(prevented_ids),
        json.dumps(remaining_ids),
        len(prevented_ids),
        len(remaining_ids),
        final_summary,
        now_iso
    ))
    conn.commit()
    conn.close()

    # Sync to Supabase
    _sync_to_supabase("counterfactual_runs", {
        "query_id": query_id,
        "incident_id": incident_id,
        "target_event_id": target_event_id,
        "lead_time_minutes": lead_time_minutes,
        "prevented_event_ids_json": json.dumps(prevented_ids),
        "remaining_event_ids_json": json.dumps(remaining_ids),
        "prevented_count": len(prevented_ids),
        "remaining_count": len(remaining_ids),
        "summary_text": final_summary,
        "executed_at": now_iso
    }, on_conflict="query_id")

    return True


def save_diagnostic_report(
    report_id: Union[str, Dict[str, Any]] = None,
    incident_id: str = None,
    report_format: str = "json",
    summary: str = "",
    primary_cause_id: str = None,
    events_count: int = 0,
    evidence_trace: Optional[List[Any]] = None
) -> bool:
    """Save generated diagnostic post-mortem report."""
    if isinstance(report_id, dict):
        d = report_id
        report_id = d.get("report_id") or f"rep_{uuid.uuid4().hex[:8]}"
        incident_id = d.get("incident_id", incident_id or "inc_001")
        report_format = d.get("format", d.get("report_format", report_format))
        summary = d.get("summary", summary)
        primary_cause_id = d.get("primary_cause_event_id", d.get("primary_cause_id", primary_cause_id))
        events_count = d.get("events_count", events_count)
        evidence_trace = d.get("evidence_trace", evidence_trace or [])
    else:
        if not report_id:
            report_id = f"rep_{uuid.uuid4().hex[:8]}"
        if evidence_trace is None:
            evidence_trace = []
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_sqlite_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO diagnostic_reports (
            report_id, incident_id, report_format, summary, primary_cause_event_id, events_count, evidence_trace_json, exported_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        report_id,
        incident_id,
        report_format,
        summary,
        primary_cause_id,
        events_count,
        json.dumps(evidence_trace),
        now_iso
    ))
    conn.commit()
    conn.close()

    # Sync to Supabase
    _sync_to_supabase("diagnostic_reports", {
        "report_id": report_id,
        "incident_id": incident_id,
        "report_format": report_format,
        "summary": summary,
        "primary_cause_event_id": primary_cause_id,
        "events_count": events_count,
        "evidence_trace_json": json.dumps(evidence_trace),
        "exported_at": now_iso
    }, on_conflict="report_id")

    return True


def save_ai_inference_log(log_id: str, incident_id: str = "stream_live", component: Optional[str] = None, timestamp: Optional[str] = None, anomaly_probability: Optional[float] = None, is_anomaly: Optional[bool] = None, feature_vector: Optional[Dict[str, float]] = None, shap_attributions: Optional[Dict[str, float]] = None, event: Optional[Dict[str, Any]] = None, feature_explanations: Optional[List[Dict[str, Any]]] = None, model_version: str = "ensemble-v4-consensus") -> bool:
    """Log an AI inference execution and its SHAP explanation."""
    now_iso = datetime.now(timezone.utc).isoformat()
    
    if event:
        component = component or event.get("component", "thermal_sensor")
        timestamp = timestamp or event.get("timestamp", now_iso)
        anomaly_probability = anomaly_probability if anomaly_probability is not None else event.get("confidence", 0.95)
        is_anomaly = is_anomaly if is_anomaly is not None else event.get("is_anomaly", True)
        feature_vector = feature_vector or event.get("feature_vector", {})

    component = component or "thermal_sensor"
    timestamp = timestamp or now_iso
    anomaly_probability = anomaly_probability if anomaly_probability is not None else 0.5
    is_anomaly_val = 1 if is_anomaly else 0
    feature_vector = feature_vector or {}

    shap_dict = shap_attributions or {}
    if feature_explanations:
        for fe in feature_explanations:
            shap_dict[fe.get("key", "")] = fe.get("contribution", 0.0)

    conn = get_sqlite_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO ai_inference_logs (
            log_id, incident_id, component, timestamp, anomaly_probability, is_anomaly, feature_vector_json, shap_attributions_json, model_version, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        log_id,
        incident_id,
        component,
        timestamp,
        anomaly_probability,
        is_anomaly_val,
        json.dumps(feature_vector),
        json.dumps(shap_dict),
        model_version,
        now_iso
    ))
    conn.commit()
    conn.close()

    # Sync to Supabase
    _sync_to_supabase("ai_inference_logs", {
        "log_id": log_id,
        "incident_id": incident_id,
        "component": component,
        "timestamp": timestamp,
        "anomaly_probability": anomaly_probability,
        "is_anomaly": is_anomaly_val,
        "feature_vector_json": json.dumps(feature_vector),
        "shap_attributions_json": json.dumps(shap_dict),
        "model_version": model_version,
        "created_at": now_iso
    }, on_conflict="log_id")

    return True


# -------------------------------------------------------------------------
# Engineer Feedback — Active Learning Data Flywheel
# -------------------------------------------------------------------------

def save_engineer_feedback(
    feedback_id: str,
    incident_id: str,
    event_id: str,
    component: str,
    engineer_verdict: str,  # 'confirmed' | 'overridden' | 'rejected'
    corrected_cause: Optional[str] = None,
    confidence_override: Optional[float] = None,
    feature_vector: Optional[Dict[str, float]] = None,
    model_prediction: Optional[str] = None,
    model_confidence: Optional[float] = None,
    engineer_notes: Optional[str] = None,
) -> bool:
    """
    Persist one engineer review verdict into the active-learning feedback table.
    Every confirmed/overridden record becomes a new labeled training example for
    incremental ensemble retraining.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    fv_json = json.dumps(feature_vector or {})

    conn = get_sqlite_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO engineer_feedback (
            feedback_id, incident_id, event_id, component, engineer_verdict,
            corrected_cause, confidence_override, feature_vector_json,
            model_prediction, model_confidence, engineer_notes,
            created_at, incorporated_in_retrain
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    """, (
        feedback_id, incident_id, event_id, component, engineer_verdict,
        corrected_cause, confidence_override, fv_json,
        model_prediction, model_confidence, engineer_notes,
        now_iso
    ))
    conn.commit()
    conn.close()

    # Sync to Supabase
    _sync_to_supabase("engineer_feedback", {
        "feedback_id": feedback_id,
        "incident_id": incident_id,
        "event_id": event_id,
        "component": component,
        "engineer_verdict": engineer_verdict,
        "corrected_cause": corrected_cause,
        "confidence_override": confidence_override,
        "feature_vector_json": fv_json,
        "model_prediction": model_prediction,
        "model_confidence": model_confidence,
        "engineer_notes": engineer_notes,
        "created_at": now_iso,
        "incorporated_in_retrain": 0,
    }, on_conflict="feedback_id")

    return True


def load_feedback_for_retraining(min_records: int = 1, only_pending: bool = True) -> List[Dict[str, Any]]:
    """
    Load engineer feedback records for incremental model retraining.
    Returns records with their 7-feature vectors and ground-truth labels.

    Parameters
    ----------
    min_records : int
        Minimum number of feedback records required to proceed with retraining.
    only_pending : bool
        If True, only return records not yet incorporated into a training run.

    Returns
    -------
    List of feedback records as dicts, or empty list if below min_records.
    """
    conn = get_sqlite_connection()
    cursor = conn.cursor()

    if only_pending:
        cursor.execute(
            "SELECT * FROM engineer_feedback WHERE incorporated_in_retrain = 0 ORDER BY created_at ASC"
        )
    else:
        cursor.execute("SELECT * FROM engineer_feedback ORDER BY created_at ASC")

    rows = cursor.fetchall()
    conn.close()

    records = []
    for row in rows:
        r = dict(row)
        r["feature_vector"] = json.loads(r.get("feature_vector_json") or "{}")
        records.append(r)

    if len(records) < min_records:
        return []
    return records


def mark_feedback_incorporated(feedback_ids: List[str]) -> bool:
    """Mark a list of feedback_ids as incorporated_in_retrain = 1."""
    if not feedback_ids:
        return True
    conn = get_sqlite_connection()
    cursor = conn.cursor()
    placeholders = ",".join("?" * len(feedback_ids))
    cursor.execute(
        f"UPDATE engineer_feedback SET incorporated_in_retrain = 1 WHERE feedback_id IN ({placeholders})",
        feedback_ids
    )
    conn.commit()
    conn.close()
    return True


def get_feedback_stats() -> Dict[str, Any]:
    """
    Return aggregate feedback statistics for the frontend health panel.

    Returns
    -------
    dict with keys: total, confirmed, overridden, rejected, pending, incorporated
    """
    conn = get_sqlite_connection()
    cursor = conn.cursor()

    stats: Dict[str, Any] = {
        "total": 0,
        "confirmed": 0,
        "overridden": 0,
        "rejected": 0,
        "pending": 0,
        "incorporated": 0,
        "unique_incidents": 0,
        "unique_components": 0,
        "last_feedback_at": None,
    }

    try:
        cursor.execute("SELECT COUNT(*) FROM engineer_feedback")
        stats["total"] = cursor.fetchone()[0] or 0

        for verdict in ("confirmed", "overridden", "rejected"):
            cursor.execute(
                "SELECT COUNT(*) FROM engineer_feedback WHERE engineer_verdict = ?", (verdict,)
            )
            stats[verdict] = cursor.fetchone()[0] or 0

        cursor.execute(
            "SELECT COUNT(*) FROM engineer_feedback WHERE incorporated_in_retrain = 0"
        )
        stats["pending"] = cursor.fetchone()[0] or 0

        cursor.execute(
            "SELECT COUNT(*) FROM engineer_feedback WHERE incorporated_in_retrain = 1"
        )
        stats["incorporated"] = cursor.fetchone()[0] or 0

        cursor.execute("SELECT COUNT(DISTINCT incident_id) FROM engineer_feedback")
        stats["unique_incidents"] = cursor.fetchone()[0] or 0

        cursor.execute("SELECT COUNT(DISTINCT component) FROM engineer_feedback")
        stats["unique_components"] = cursor.fetchone()[0] or 0

        cursor.execute(
            "SELECT MAX(created_at) FROM engineer_feedback"
        )
        stats["last_feedback_at"] = cursor.fetchone()[0]
    except Exception:
        pass

    conn.close()
    return stats


def list_feedback_history(limit: int = 50) -> List[Dict[str, Any]]:
    """Return recent feedback records for the history panel."""
    conn = get_sqlite_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT feedback_id, incident_id, event_id, component,
               engineer_verdict, corrected_cause, model_confidence,
               engineer_notes, created_at, incorporated_in_retrain
        FROM engineer_feedback
        ORDER BY created_at DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


# -------------------------------------------------------------------------
# Simulation Dataset Persistence & High-Throughput Telemetry Querying
# -------------------------------------------------------------------------

def save_simulation_dataset(dataset_dict: Dict[str, Any]) -> bool:
    """
    Persists a SimulationDataset and its CanonicalTelemetryRecord stream to SQLite.
    """
    conn = get_sqlite_connection()
    cursor = conn.cursor()

    sim_id = dataset_dict["simulation_id"]
    now_iso = dataset_dict.get("created_at") or datetime.now(timezone.utc).isoformat()

    cursor.execute("""
        INSERT OR REPLACE INTO simulations (
            simulation_id, scenario_id, name, description, random_seed,
            configuration_version, parameters_json, ground_truth_json,
            events_json, summary_json, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        sim_id,
        dataset_dict.get("scenario_id", "power_collapse"),
        dataset_dict.get("name", f"Simulation {sim_id}"),
        dataset_dict.get("description", ""),
        int(dataset_dict.get("random_seed", 42)),
        dataset_dict.get("configuration_version", "v2.4"),
        json.dumps(dataset_dict.get("parameters", {})),
        json.dumps(dataset_dict.get("ground_truth", {})),
        json.dumps(dataset_dict.get("events", [])),
        json.dumps(dataset_dict.get("summary", {})),
        dataset_dict.get("status", "GENERATED"),
        now_iso
    ))

    # Bulk insert telemetry records
    records = dataset_dict.get("records", [])
    if records:
        insert_rows = []
        for r in records:
            r_dict = r if isinstance(r, dict) else r.to_dict()
            insert_rows.append((
                r_dict.get("packet_id"),
                sim_id,
                r_dict.get("timestamp"),
                float(r_dict.get("mission_elapsed_time", 0.0)),
                r_dict.get("subsystem", "UNKNOWN"),
                r_dict.get("channel_id", "RAW"),
                r_dict.get("signal_name", ""),
                float(r_dict.get("value", 0.0)),
                r_dict.get("unit", ""),
                r_dict.get("quality", "VALID"),
                r_dict.get("source_type", "SIMULATED"),
                int(r_dict.get("packet_sequence", 0)),
                float(r_dict["expected_value"]) if r_dict.get("expected_value") is not None else None,
                json.dumps(r_dict.get("metadata", {}))
            ))

        cursor.executemany("""
            INSERT OR REPLACE INTO simulation_telemetry (
                packet_id, simulation_id, timestamp, mission_elapsed_time,
                subsystem, channel_id, signal_name, value, unit, quality,
                source_type, packet_sequence, expected_value, metadata_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, insert_rows)

    conn.commit()
    conn.close()
    return True


def load_simulation_dataset(simulation_id: str, include_records: bool = False) -> Optional[Dict[str, Any]]:
    """Load simulation metadata and summary."""
    conn = get_sqlite_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT simulation_id, scenario_id, name, description, random_seed,
               configuration_version, parameters_json, ground_truth_json,
               events_json, summary_json, status, created_at
        FROM simulations
        WHERE simulation_id = ?
    """, (simulation_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    res = {
        "simulation_id": row["simulation_id"],
        "scenario_id": row["scenario_id"],
        "name": row["name"],
        "description": row["description"],
        "random_seed": row["random_seed"],
        "configuration_version": row["configuration_version"],
        "parameters": json.loads(row["parameters_json"] or "{}"),
        "ground_truth": json.loads(row["ground_truth_json"] or "{}"),
        "events": json.loads(row["events_json"] or "[]"),
        "summary": json.loads(row["summary_json"] or "{}"),
        "status": row["status"],
        "created_at": row["created_at"],
    }

    # Query packet counts and available channels
    cursor.execute("SELECT COUNT(*) FROM simulation_telemetry WHERE simulation_id = ?", (simulation_id,))
    res["total_packets"] = cursor.fetchone()[0] or 0

    cursor.execute("SELECT DISTINCT subsystem FROM simulation_telemetry WHERE simulation_id = ?", (simulation_id,))
    res["subsystems"] = [r[0] for r in cursor.fetchall() if r[0]]

    cursor.execute("SELECT DISTINCT channel_id FROM simulation_telemetry WHERE simulation_id = ?", (simulation_id,))
    res["channels"] = [r[0] for r in cursor.fetchall() if r[0]]

    if include_records:
        cursor.execute("""
            SELECT packet_id, timestamp, mission_elapsed_time, subsystem,
                   channel_id, signal_name, value, unit, quality, source_type,
                   packet_sequence, expected_value, metadata_json
            FROM simulation_telemetry
            WHERE simulation_id = ?
            ORDER BY packet_sequence ASC
        """, (simulation_id,))
        records = []
        for r in cursor.fetchall():
            records.append({
                "packet_id": r["packet_id"],
                "timestamp": r["timestamp"],
                "mission_elapsed_time": r["mission_elapsed_time"],
                "subsystem": r["subsystem"],
                "channel_id": r["channel_id"],
                "signal_name": r["signal_name"],
                "value": r["value"],
                "unit": r["unit"],
                "quality": r["quality"],
                "source_type": r["source_type"],
                "packet_sequence": r["packet_sequence"],
                "expected_value": r["expected_value"],
                "metadata": json.loads(r["metadata_json"] or "{}"),
            })
        res["records"] = records

    conn.close()
    return res


def list_simulation_datasets(limit: int = 50) -> List[Dict[str, Any]]:
    """List recent simulations with packet counts."""
    conn = get_sqlite_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT s.simulation_id, s.scenario_id, s.name, s.description,
               s.random_seed, s.status, s.created_at,
               COUNT(t.packet_id) as total_packets
        FROM simulations s
        LEFT JOIN simulation_telemetry t ON s.simulation_id = t.simulation_id
        GROUP BY s.simulation_id
        ORDER BY s.created_at DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def query_simulation_telemetry(
    simulation_id: str,
    subsystem: Optional[str] = None,
    channel_id: Optional[str] = None,
    source_type: Optional[str] = None,
    limit: int = 200,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """Query paginated and filtered telemetry packets for a simulation."""
    conn = get_sqlite_connection()
    cursor = conn.cursor()

    query = """
        SELECT packet_id, timestamp, mission_elapsed_time, subsystem,
               channel_id, signal_name, value, unit, quality, source_type,
               packet_sequence, expected_value, metadata_json
        FROM simulation_telemetry
        WHERE simulation_id = ?
    """
    params: List[Any] = [simulation_id]

    if subsystem:
        query += " AND subsystem = ?"
        params.append(subsystem.upper())

    if channel_id:
        query += " AND channel_id = ?"
        params.append(channel_id)

    if source_type:
        query += " AND source_type = ?"
        params.append(source_type.upper())

    query += " ORDER BY packet_sequence ASC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    records = []
    for r in rows:
        records.append({
            "packet_id": r["packet_id"],
            "timestamp": r["timestamp"],
            "mission_elapsed_time": r["mission_elapsed_time"],
            "subsystem": r["subsystem"],
            "channel_id": r["channel_id"],
            "signal_name": r["signal_name"],
            "value": r["value"],
            "unit": r["unit"],
            "quality": r["quality"],
            "source_type": r["source_type"],
            "packet_sequence": r["packet_sequence"],
            "expected_value": r["expected_value"],
            "metadata": json.loads(r["metadata_json"] or "{}"),
        })
    return records


