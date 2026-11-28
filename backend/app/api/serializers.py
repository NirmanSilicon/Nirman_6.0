from rest_framework import serializers

class TelemetryRecordSerializer(serializers.Serializer):
    timestamp = serializers.CharField()
    mission_time_seconds = serializers.FloatField(required=False, default=0.0)
    component = serializers.CharField()
    parameter = serializers.CharField()
    value = serializers.FloatField(allow_null=True, required=False)
    raw_status = serializers.CharField(required=False, default="NOMINAL")
    msg_id = serializers.IntegerField(allow_null=True, required=False)
    ap_id = serializers.IntegerField(allow_null=True, required=False)
    sequence_count = serializers.IntegerField(allow_null=True, required=False)
    is_anomaly = serializers.BooleanField(required=False, default=False)

class EventSerializer(serializers.Serializer):
    id = serializers.CharField()
    timestamp = serializers.CharField()
    component = serializers.CharField()
    event_type = serializers.ChoiceField(choices=["threshold", "state_change", "alarm", "reboot"])
    value = serializers.FloatField(allow_null=True, required=False)
    description = serializers.CharField()
    parameter = serializers.CharField(required=False, allow_null=True, allow_blank=True, default=None)
    severity = serializers.ChoiceField(choices=["info", "warning", "critical"], required=False, default="warning")
    confidence = serializers.FloatField(required=False, default=0.85)
    timing_confidence = serializers.ChoiceField(choices=["documented", "estimated"], required=False, default="documented")
    notes = serializers.CharField(allow_null=True, required=False, allow_blank=True)
    predicted_value = serializers.FloatField(allow_null=True, required=False)
    residual = serializers.FloatField(allow_null=True, required=False)
    normalized_residual = serializers.FloatField(allow_null=True, required=False)
    anomaly_classification = serializers.CharField(required=False, default="statistically_abnormal")
    is_statistical_anomaly = serializers.BooleanField(required=False, default=True)
    is_physical_anomaly = serializers.BooleanField(required=False, default=False)
    physics_evidence = serializers.DictField(required=False, default=dict)

class CausalNodeSerializer(serializers.Serializer):
    event_id = serializers.CharField()
    component = serializers.CharField()
    role = serializers.ChoiceField(choices=["primary", "propagation", "secondary", "independent", "unknown"])
    confidence = serializers.FloatField(min_value=0.0, max_value=1.0)
    confidence_label = serializers.ChoiceField(choices=["high", "moderate", "low", "insufficient_evidence"])
    confidence_tier = serializers.CharField(required=False, default="HIGH CONFIDENCE")
    is_out_of_distribution = serializers.BooleanField(required=False, default=False)
    upstream_edge_ids = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    timestamp = serializers.CharField(required=False, allow_blank=True)
    timestamp_epoch = serializers.FloatField(required=False, default=0.0)
    event_type = serializers.CharField(required=False, allow_blank=True)
    state_transition = serializers.CharField(required=False, allow_blank=True)
    telemetry_evidence = serializers.DictField(required=False, default=dict)
    predicted_value = serializers.FloatField(allow_null=True, required=False)
    residual = serializers.FloatField(allow_null=True, required=False)
    normalized_residual = serializers.FloatField(allow_null=True, required=False)
    anomaly_classification = serializers.CharField(required=False, default="statistically_abnormal")
    is_statistical_anomaly = serializers.BooleanField(required=False, default=True)
    is_physical_anomaly = serializers.BooleanField(required=False, default=False)
    physics_evidence = serializers.DictField(required=False, default=dict)
    subsystem = serializers.CharField(required=False, allow_blank=True)
    metadata = serializers.DictField(required=False, default=dict)

class CausalEdgeSerializer(serializers.Serializer):
    id = serializers.CharField()
    source_event_id = serializers.CharField()
    target_event_id = serializers.CharField()
    source_component = serializers.CharField(required=False, allow_blank=True)
    target_component = serializers.CharField(required=False, allow_blank=True)
    dependency_type = serializers.CharField()
    dependency_strength = serializers.CharField()
    temporal_gap_seconds = serializers.FloatField(required=False)
    temporal_distance_seconds = serializers.FloatField(required=False)
    evidence = serializers.CharField()
    allowed_propagation_window = serializers.DictField(required=False, allow_null=True)
    s_temporal = serializers.FloatField(required=False, default=0.0)
    s_dependency = serializers.FloatField(required=False, default=0.0)
    s_intermediate = serializers.FloatField(required=False, default=0.0)
    confidence = serializers.FloatField(required=False, default=0.0)
    confidence_tier = serializers.CharField(required=False, default="HIGH CONFIDENCE")
    is_uncertain = serializers.BooleanField(required=False, default=False)
    missing_evidence_notes = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    physical_consistency = serializers.FloatField(required=False, default=1.0)
    predicted_probability = serializers.FloatField(required=False, allow_null=True)
    causal_features = serializers.DictField(required=False, default=dict)
    hard_constraints_passed = serializers.BooleanField(required=False, default=True)
    scorer_type = serializers.CharField(required=False, default="learned")
    metadata = serializers.DictField(required=False, default=dict)

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'temporal_gap_seconds' not in data and 'temporal_distance_seconds' in data:
            data['temporal_gap_seconds'] = data['temporal_distance_seconds']
        elif 'temporal_distance_seconds' not in data and 'temporal_gap_seconds' in data:
            data['temporal_distance_seconds'] = data['temporal_gap_seconds']
        return super().to_internal_value(data)


class NextBestEvidenceSerializer(serializers.Serializer):
    recommended_observation = serializers.CharField()
    target_signal = serializers.CharField()
    target_component = serializers.CharField()
    rationale = serializers.CharField()
    hypothesis_ids = serializers.ListField(child=serializers.CharField())
    expected_outcomes = serializers.ListField(child=serializers.DictField())
    expected_information_gain = serializers.FloatField()
    telemetry_cost = serializers.CharField()
    priority = serializers.CharField(required=False, default="HIGH")
    sampling_cadence = serializers.CharField(required=False, default="10 Hz")
    observation_window = serializers.CharField(required=False, default="T-15s to T+45s")


class GenealogyResponseSerializer(serializers.Serializer):
    incident_id = serializers.CharField()
    analysis_id = serializers.CharField(required=False)
    status = serializers.CharField(required=False, default="ANALYZED")
    created_at = serializers.CharField(required=False)
    summary = serializers.CharField(required=False)
    telemetry_window = serializers.DictField(required=False)
    detected_events = serializers.ListField(child=serializers.DictField(), required=False)
    hypotheses = serializers.ListField(child=serializers.DictField(), required=False)
    causal_graph = serializers.DictField(required=False)
    cascade = serializers.DictField(required=False)
    physics = serializers.DictField(required=False)
    next_best_evidence = serializers.DictField(required=False)
    counterfactual = serializers.DictField(required=False, allow_null=True)
    warnings = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    provenance = serializers.DictField(required=False)

    nodes = CausalNodeSerializer(many=True)
    edges = CausalEdgeSerializer(many=True)
    primary_cause_event_id = serializers.CharField(allow_null=True, required=False)
    is_ambiguous_root = serializers.BooleanField(required=False, default=False)
    confidence_tier = serializers.CharField(required=False, default="HIGH CONFIDENCE")
    pattern_status = serializers.CharField(required=False, default="KNOWN PATTERN")
    competing_hypotheses = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    missing_evidence = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    uncertain_edges = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    independent_events = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    minimum_explanation_event_ids = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    raw_events = EventSerializer(many=True, required=False, default=list)

class IncidentSummarySerializer(serializers.Serializer):
    incident_id = serializers.CharField()
    created_at = serializers.CharField()
    events_count = serializers.IntegerField()
    primary_cause_event_id = serializers.CharField(allow_null=True, required=False)

class CounterfactualRequestSerializer(serializers.Serializer):
    incident_id = serializers.CharField(required=False, default="inc_001")
    target_event_id = serializers.CharField(required=False, default="")
    intervention_minutes_earlier = serializers.FloatField(required=False, default=10.0)
    intervention_offset_s = serializers.FloatField(required=False, allow_null=True)
    intervention_type = serializers.CharField(required=False, allow_null=True)
    intervention_component = serializers.CharField(required=False, allow_null=True)
    intervention_parameter = serializers.CharField(required=False, allow_null=True)
    clamped_value = serializers.FloatField(required=False, allow_null=True)
    method = serializers.CharField(required=False, default="structural")

class CounterfactualResponseSerializer(serializers.Serializer):
    incident_id = serializers.CharField()
    target_event_id = serializers.CharField()
    simulation_method = serializers.CharField(required=False, default="structural")
    prevented_event_ids = serializers.ListField(child=serializers.CharField())
    remaining_event_ids = serializers.ListField(child=serializers.CharField())
    prevented_count = serializers.IntegerField()
    remaining_count = serializers.IntegerField()
    prevented_events = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    remaining_events = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    shifted_events = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    mission_impact_difference = serializers.DictField(required=False, allow_null=True)
    intervention_timing = serializers.DictField(required=False, allow_null=True)
    simulation_confidence = serializers.FloatField(required=False, default=0.94)
    confidence_tier = serializers.CharField(required=False, default="HIGH CONFIDENCE")
    assumptions = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    baseline_reachability = serializers.DictField(required=False, allow_null=True)
    summary = serializers.CharField()

class ReportExportSerializer(serializers.Serializer):
    incident_id = serializers.CharField()
    exported_at = serializers.CharField()
    format = serializers.CharField()
    summary = serializers.CharField()
    primary_cause_event_id = serializers.CharField(allow_null=True, required=False)
    events_count = serializers.IntegerField()
    evidence_trace = serializers.ListField(child=serializers.CharField())

class IncidentGenerateRequestSerializer(serializers.Serializer):
    duration_seconds = serializers.IntegerField(required=False, default=600)
    cascade_offset_s = serializers.IntegerField(required=False, default=300)

class BlastRadiusRequestSerializer(serializers.Serializer):
    component = serializers.CharField()
    max_hops = serializers.IntegerField(required=False, default=3)

class BlastRadiusResponseSerializer(serializers.Serializer):
    component = serializers.CharField()
    upstream_candidates = serializers.ListField(child=serializers.DictField())
    downstream_dependents = serializers.ListField(child=serializers.CharField())


class EngineerFeedbackSerializer(serializers.Serializer):
    """Serializes a single engineer review verdict."""
    feedback_id = serializers.CharField(required=False)
    incident_id = serializers.CharField()
    event_id = serializers.CharField()
    component = serializers.CharField()
    engineer_verdict = serializers.ChoiceField(choices=["confirmed", "overridden", "rejected"])
    corrected_cause = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    confidence_override = serializers.FloatField(required=False, allow_null=True, min_value=0.0, max_value=1.0)
    feature_vector = serializers.DictField(child=serializers.FloatField(), required=False, default=dict)
    model_prediction = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    model_confidence = serializers.FloatField(required=False, allow_null=True, min_value=0.0, max_value=1.0)
    engineer_notes = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class FeedbackStatsSerializer(serializers.Serializer):
    """Aggregated feedback health stats for the frontend panel."""
    total = serializers.IntegerField()
    confirmed = serializers.IntegerField()
    overridden = serializers.IntegerField()
    rejected = serializers.IntegerField()
    pending = serializers.IntegerField()
    incorporated = serializers.IntegerField()
    unique_incidents = serializers.IntegerField()
    unique_components = serializers.IntegerField()
    last_feedback_at = serializers.CharField(allow_null=True, required=False)
    # Drift Governance & PSI Gate Stats
    last_drift_score = serializers.FloatField(allow_null=True, required=False)
    last_drift_classification = serializers.CharField(allow_null=True, required=False)
    pending_review_candidates_count = serializers.IntegerField(required=False, default=0)
    last_drift_check_at = serializers.CharField(allow_null=True, required=False)


class RetrainTriggerSerializer(serializers.Serializer):
    """Request body for triggering incremental retraining."""
    min_records = serializers.IntegerField(required=False, default=1)
    dry_run = serializers.BooleanField(required=False, default=False)


class ApproveModelSerializer(serializers.Serializer):
    """Request body for manually approving a held candidate model."""
    candidate_id = serializers.CharField(required=True)
    # TODO: approved_by is currently accepted as a plain string payload parameter.
    # This must be replaced with a real authenticated identity (e.g. request.user) once enterprise auth is configured.
    approved_by = serializers.CharField(required=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class RejectModelSerializer(serializers.Serializer):
    """Request body for explicitly rejecting a held candidate model."""
    candidate_id = serializers.CharField(required=True)
    rejected_by = serializers.CharField(required=False, default="Lead-Engineer")
    rejection_reason = serializers.CharField(required=False, allow_blank=True, default="Drift threshold exceeded")
    notes = serializers.CharField(required=False, allow_blank=True, default="")

