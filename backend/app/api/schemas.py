"""
schemas.py

Pydantic v2 data models for the CubeSat Failure Genealogy Tracer.
Matches tech_stack.md §5 Data Contracts exactly.
"""

from datetime import datetime
from typing import Literal, Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ---------------------------------------------------------
# Telemetry Record Model (Raw / Simulator stream)
# ---------------------------------------------------------
class TelemetryRecord(BaseModel):
    """Raw telemetry record emitted by the CubeSat simulator or log reader."""
    timestamp: str = Field(description="ISO 8601 timestamp string or mission-relative time")
    mission_time_seconds: float = Field(description="Elapsed mission time in seconds (T+Xs)")
    component: str = Field(description="Component name matching a node in the dependency graph")
    parameter: str = Field(description="Telemetry channel/parameter name")
    value: Optional[float] = Field(default=None, description="Numerical sensor value")
    raw_status: Optional[str] = Field(default="NOMINAL", description="Status code or flag")
    
    # CCSDS space-packet metadata fields (from CuCD-ID structural reference)
    msg_id: Optional[int] = Field(default=None, description="CCSDS Message ID")
    ap_id: Optional[int] = Field(default=None, description="Application Process ID")
    sequence_count: Optional[int] = Field(default=None, description="Packet sequence counter")
    is_anomaly: Optional[bool] = Field(default=False, description="Ground-truth anomaly flag for evaluation")


# ---------------------------------------------------------
# Event Object (Stage 2 Output / Stage 3 Input)
# ---------------------------------------------------------
class Event(BaseModel):
    """Structured incident event extracted from raw telemetry logs."""
    id: str = Field(description="Unique event ID (e.g. evt_01)")
    timestamp: datetime = Field(description="Timestamp of event occurrence")
    component: str = Field(description="Must match a node id in the dependency graph")
    event_type: Literal["threshold", "state_change", "alarm", "reboot"] = Field(
        description="Category of the detected event"
    )
    value: Optional[float] = Field(default=None, description="Telemetry value at time of event")
    description: str = Field(description="Human-readable description of the event")
    parameter: Optional[str] = Field(default=None, description="Telemetry parameter/channel name")
    severity: Optional[Literal["info", "warning", "critical"]] = Field(
        default="warning", description="Severity level"
    )
    confidence: Optional[float] = Field(default=0.85, description="Detection confidence score")
    timing_confidence: Optional[Literal["documented", "estimated"]] = Field(
        default="documented", description="Whether timing is documented or estimated"
    )
    notes: Optional[str] = Field(default=None, description="Investigation notes")
    predicted_value: Optional[float] = Field(default=None, description="Physics predicted value")
    residual: Optional[float] = Field(default=None, description="Physics prediction residual")
    normalized_residual: Optional[float] = Field(default=None, description="Normalized physics residual")
    anomaly_classification: Optional[str] = Field(default="statistically_abnormal", description="Anomaly classification")
    is_statistical_anomaly: Optional[bool] = Field(default=True, description="Whether statistical anomaly")
    is_physical_anomaly: Optional[bool] = Field(default=False, description="Whether physics anomaly")
    physics_evidence: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Physics evidence")


# ---------------------------------------------------------
# Causal Graph Objects (Stage 3 & Stage 4)
# ---------------------------------------------------------
class CausalNode(BaseModel):
    """Causal classification and confidence for an event node."""
    event_id: str
    component: str
    role: Literal["primary", "propagation", "secondary", "independent", "unknown"]
    confidence: float = Field(ge=0.0, le=1.0, description="Computed confidence score between 0.0 and 1.0")
    confidence_label: Literal["high", "moderate", "low", "insufficient_evidence"]
    confidence_tier: Optional[str] = Field(default="HIGH CONFIDENCE", description="4-tier confidence rating")
    is_out_of_distribution: Optional[bool] = Field(default=False, description="Whether event pattern is anomalous/OOD")
    upstream_edge_ids: List[str] = Field(default_factory=list)


class CausalEdge(BaseModel):
    """Directed causal relationship connecting cause -> effect."""
    id: str
    source_event_id: str
    target_event_id: str
    dependency_type: Literal["power", "thermal", "control", "data", "software", "watchdog", "kinematic", "indirect"]
    dependency_strength: Literal["critical", "strong", "moderate", "weak"]
    temporal_gap_seconds: float
    evidence: str = Field(description="Plain-English explanation sentence shown in the evidence trace panel")
    confidence: Optional[float] = Field(default=0.85, description="Edge confidence score")
    confidence_tier: Optional[str] = Field(default="HIGH CONFIDENCE", description="4-tier confidence rating")
    is_uncertain: Optional[bool] = Field(default=False, description="Flagged if edge score is near or below threshold")
    missing_evidence_notes: Optional[str] = Field(default=None, description="Notes on missing intermediate telemetry")


class NextBestEvidence(BaseModel):
    """Next Best Evidence recommendation to resolve causal hypotheses."""
    recommended_observation: str
    target_signal: str
    target_component: str
    rationale: str
    hypothesis_ids: List[str]
    expected_outcomes: List[Dict[str, Any]]
    expected_information_gain: float
    telemetry_cost: str
    priority: Optional[str] = "HIGH"
    sampling_cadence: Optional[str] = "10 Hz"
    observation_window: Optional[str] = "T-15s to T+45s"


class GenealogyResponse(BaseModel):
    """Top-level response object for an analyzed CubeSat incident."""
    incident_id: str
    analysis_id: Optional[str] = None
    status: Optional[str] = "ANALYZED"
    created_at: Optional[str] = None
    summary: Optional[str] = None
    telemetry_window: Optional[Dict[str, Any]] = None
    detected_events: Optional[List[Dict[str, Any]]] = None
    hypotheses: Optional[List[Dict[str, Any]]] = None
    causal_graph: Optional[Dict[str, Any]] = None
    cascade: Optional[Dict[str, Any]] = None
    physics: Optional[Dict[str, Any]] = None
    next_best_evidence: Optional[Dict[str, Any]] = None
    counterfactual: Optional[Dict[str, Any]] = None
    warnings: Optional[List[str]] = Field(default_factory=list)
    provenance: Optional[Dict[str, Any]] = None

    nodes: List[CausalNode]
    edges: List[CausalEdge]
    primary_cause_event_id: Optional[str] = None
    is_ambiguous_root: Optional[bool] = Field(default=False, description="True if top candidate roots are within ambiguity margin")
    confidence_tier: Optional[str] = Field(default="HIGH CONFIDENCE", description="Overall incident diagnostic confidence tier")
    pattern_status: Optional[str] = Field(default="KNOWN PATTERN", description="KNOWN PATTERN or UNKNOWN / OUT-OF-DISTRIBUTION")
    competing_hypotheses: List[Dict[str, Any]] = Field(default_factory=list, description="Top competing candidate root causes")
    missing_evidence: List[Dict[str, Any]] = Field(default_factory=list, description="Expected intermediate telemetry not observed")
    uncertain_edges: List[Dict[str, Any]] = Field(default_factory=list, description="Causal edges with moderate or low confidence")
    independent_events: List[str] = Field(default_factory=list, description="Event IDs that occurred independently without upstream trigger")
    minimum_explanation_event_ids: List[str] = Field(default_factory=list)
    raw_events: List[Event] = Field(default_factory=list)


# ---------------------------------------------------------
# Counterfactual Simulation ("What If" Engine - Stage 6)
# ---------------------------------------------------------
class CounterfactualRequest(BaseModel):
    incident_id: str = "inc_001"
    target_event_id: str = Field(default="", description="The failure event being prevented/intervened")
    intervention_minutes_earlier: float = Field(
        default=10.0, description="How many minutes prior the intervention took place"
    )
    intervention_offset_s: Optional[float] = Field(default=None, description="Direct lead time offset in seconds")
    intervention_type: Optional[str] = Field(default=None, description="Action type: clamp, prevent_trip, etc.")
    intervention_component: Optional[str] = Field(default=None, description="Target component name")
    intervention_parameter: Optional[str] = Field(default=None, description="Target parameter name")
    clamped_value: Optional[float] = Field(default=None, description="Clamped override value")
    method: str = Field(default="structural", description="'structural' forward simulation or 'reachability' baseline")


class CounterfactualResponse(BaseModel):
    incident_id: str
    target_event_id: str
    simulation_method: str = "structural"
    prevented_event_ids: List[str] = Field(description="Event IDs that would no longer occur")
    remaining_event_ids: List[str] = Field(description="Event IDs that still occur independently")
    prevented_count: int
    remaining_count: int = 0
    prevented_events: List[Dict[str, Any]] = Field(default_factory=list)
    remaining_events: List[Dict[str, Any]] = Field(default_factory=list)
    shifted_events: List[Dict[str, Any]] = Field(default_factory=list)
    mission_impact_difference: Optional[Dict[str, Any]] = None
    intervention_timing: Optional[Dict[str, Any]] = None
    simulation_confidence: float = 0.94
    confidence_tier: Optional[str] = Field(default="HIGH CONFIDENCE", description="4-tier counterfactual confidence rating")
    assumptions: List[str] = Field(default_factory=list)
    baseline_reachability: Optional[Dict[str, Any]] = None
    total_failures: Optional[int] = None
    summary: str = Field(
        description="e.g. 'Structural counterfactual intervention simulated forward...'"
    )



# ---------------------------------------------------------
# Zero-Knowledge & Blockchain Verification Layer (Tasks A - D)
# ---------------------------------------------------------

class ZKProofBundle(BaseModel):
    """
    Zero-Knowledge Proof bundle certifying that a specific causal edge
    verdict was produced by the causal scoring formula under production weights,
    without disclosing the private telemetry scores (S_temporal, S_dependency, S_intermediate).
    """
    edge_id: str = Field(description="Causal edge identifier proven by circuit")
    commitment: str = Field(description="Poseidon hash binding private scores: Poseidon(s_t, s_d, s_i, salt)")
    proof: Dict[str, Any] = Field(description="Groth16 cryptographic proof points (pi_a, pi_b, pi_c)")
    public_signals: List[str] = Field(
        description="Public circuit outputs and inputs [verdict_confirmed, w_t, w_d, w_i, threshold, commitment]"
    )
    scaling_factor: int = Field(default=1000000, description="Fixed-point scaling multiplier (10^6)")
    generated_at: str = Field(description="ISO 8601 generation timestamp")
    verdict_confirmed: bool = Field(description="Whether confidence >= threshold was proven")
    threshold: float = Field(default=0.40, description="Minimum confidence threshold evaluated")


class MasterIncidentDossier(BaseModel):
    """
    Comprehensive Master Incident Dossier linking AI diagnosis, Causal Genealogy DAG,
    Counterfactual 'What If' results, cryptographic SHA-256 hash, on-chain anchor,
    Zero-Knowledge proof bundle, and multi-party sign-offs.
    """
    incident_id: str
    mission_time: str
    status: Literal["INVESTIGATING", "ROOT_CAUSE_ISOLATED", "RESOLVED"]
    primary_root_cause: str
    caelis_ai: Dict[str, Any] = Field(description="AI diagnosis, model confidence, and SHAP vectors")
    genealogy_nodes: List[CausalNode]
    genealogy_edges: List[CausalEdge]
    what_if_analysis: CounterfactualResponse
    telemetry_proofs: List[Dict[str, Any]] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    sha256_signature: str = Field(description="Deterministic cryptographic integrity hash")
    zk_proof: Optional[ZKProofBundle] = Field(default=None, description="Groth16 Zero-Knowledge proof of primary verdict")
    chain_tx_hash: Optional[str] = Field(default=None, description="On-chain anchor transaction hash in AuditAnchor.sol")
    on_chain_anchored: bool = Field(default=False, description="True if verified anchored on-chain")
    multi_sig_finalized: bool = Field(default=False, description="True if threshold signatures recorded on-chain")


class ZKVerifyRequest(BaseModel):
    proof: Dict[str, Any]
    public_signals: List[str]


class ZKVerifyResponse(BaseModel):
    valid: bool
    verdict_confirmed: bool
    public_signals: List[str]


class ChainAnchorRequest(BaseModel):
    entry_hash: str
    event_type: str = "incident_dossier"


class ChainAnchorResponse(BaseModel):
    anchored: bool
    tx_hash: Optional[str] = None
    block_number: Optional[int] = None
    timestamp: Optional[int] = None
    contract_address: Optional[str] = None


class InsuranceClaimRequest(BaseModel):
    incident_id: str


class InsuranceClaimResponse(BaseModel):
    success: bool
    tx_hash: Optional[str] = None
    claimed: bool
    error: Optional[str] = None


class MultiSigSignOffRequest(BaseModel):
    role: Literal["manufacturer", "operator", "insurer", "launch_provider"]


class MultiSigSignOffResponse(BaseModel):
    success: bool
    tx_hash: Optional[str] = None
    role: str
    signer_address: Optional[str] = None
    finalized: bool
    error: Optional[str] = None

