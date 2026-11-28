from django.urls import path
from app.api import views

urlpatterns = [
    # Health check & Platform telemetry
    path('health/', views.health_check_api, name='health-check'),

    # Telemetry and incident management
    path('incidents/generate/', views.generate_incident_api, name='incident-generate'),
    path('incidents/upload/', views.upload_incident_api, name='incident-upload'),
    path('incidents/<str:incident_id>/analyze/', views.analyze_incident_api, name='incident-analyze-nested'),
    path('incidents/analyze/', views.analyze_incident_api, name='incident-analyze'),
    path('incidents/<str:incident_id>/', views.get_incident_detail_api, name='incident-detail'),
    path('incidents/', views.list_incidents_api, name='incidents-list'),

    # Reports
    path('reports/<str:incident_id>/export/', views.export_report_api, name='report-export'),

    # Queries & simulations
    path('incidents/<str:incident_id>/next-best-evidence/', views.next_best_evidence_api, name='incident-next-best-evidence'),
    path('query/next-best-evidence/', views.next_best_evidence_api, name='query-next-best-evidence'),
    path('query/counterfactual/', views.counterfactual_query_api, name='query-counterfactual'),
    path('query/blast-radius/', views.blast_radius_query_api, name='query-blast-radius'),

    # CAELIS AI Engine
    path('caelis/score/', views.caelis_score_window_api, name='caelis-score'),
    path('caelis/validate/', views.caelis_validate_candidate_api, name='caelis-validate'),
    path('caelis/scenarios/', views.caelis_scenarios_api, name='caelis-scenarios'),
    path('scenarios/', views.caelis_scenarios_api, name='scenarios-list'),

    # Canonical Simulation Dataset & Ingestion APIs (Sections 2, 7, 8, 9, 10)
    path('simulations/generate/', views.simulations_collection_api, name='simulation-generate'),
    path('simulations/upload/', views.simulation_upload_api, name='simulation-upload'),
    # Hardware-in-the-loop capture. Backend-only: no frontend changes required.
    path('hardware/esp32/capture/', views.esp32_capture_api, name='esp32-capture'),
    path('simulations/<str:simulation_id>/telemetry/', views.simulation_telemetry_api, name='simulation-telemetry'),
    path('simulations/<str:simulation_id>/events/', views.simulation_events_api, name='simulation-events'),
    path('simulations/<str:simulation_id>/analyze/', views.simulation_analyze_api, name='simulation-analyze'),
    path('simulations/<str:simulation_id>/validate/', views.simulation_validate_api, name='simulation-validate'),
    path('simulations/<str:simulation_id>/', views.simulation_detail_api, name='simulation-detail'),
    path('simulations/', views.simulations_collection_api, name='simulations-collection'),

    # Engineer Feedback — Active Learning Data Flywheel & Drift Governance
    path('feedback/submit/', views.feedback_submit_api, name='feedback-submit'),
    path('feedback/stats/', views.feedback_stats_api, name='feedback-stats'),
    path('feedback/history/', views.feedback_history_api, name='feedback-history'),
    path('feedback/trigger-retrain/', views.feedback_trigger_retrain_api, name='feedback-trigger-retrain'),
    path('feedback/approve-model/', views.feedback_approve_model_api, name='feedback-approve-model'),
    path('feedback/reject-model/', views.feedback_reject_model_api, name='feedback-reject-model'),

    # Zero-Knowledge & Blockchain Verification Layer (Tasks A - D)
    path('incidents/<str:incident_id>/zk-proof/', views.generate_zk_proof_api, name='incident-zk-proof'),
    path('incidents/<str:incident_id>/zk-verify/', views.verify_zk_proof_api, name='incident-zk-verify'),
    path('zk/verify/', views.verify_zk_proof_api, name='zk-verify'),
    path('incidents/<str:incident_id>/anchor/', views.anchor_incident_api, name='incident-anchor'),
    path('incidents/<str:incident_id>/anchor-status/', views.get_incident_anchor_status_api, name='incident-anchor-status'),
    path('incidents/<str:incident_id>/claim/', views.submit_insurance_claim_api, name='incident-claim'),
    path('chain/policy-status/', views.get_policy_status_api, name='chain-policy-status'),
    path('incidents/<str:incident_id>/sign-off/', views.multi_sig_sign_off_api, name='incident-sign-off'),
    path('incidents/<str:incident_id>/status/', views.update_incident_status_api, name='incident-status-update'),
]



