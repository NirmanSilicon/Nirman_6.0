-- View: ops_metrics_view
-- GoldenHour Blueprint §6.3 / NIRMAN 2026
-- Rolling metrics for ops wall strip and presentation slides

CREATE OR REPLACE VIEW ops_metrics_view AS
SELECT 
    f.id AS facility_id,
    f.name AS facility_name,
    COUNT(DISTINCT a.id) AS total_alerts_today,
    COUNT(DISTINCT CASE WHEN a.state IN ('ALL_CLAIMED', 'ARRIVED', 'CLOSED') THEN a.id END) AS successful_alerts,
    COUNT(DISTINCT CASE WHEN a.state = 'CANCELLED' THEN a.id END) AS cancelled_alerts,
    ROUND(
        COUNT(DISTINCT CASE WHEN a.state = 'CANCELLED' THEN a.id END)::NUMERIC / 
        GREATEST(1, COUNT(DISTINCT a.id)) * 100, 
        1
    ) AS cancellation_rate_pct,
    COUNT(DISTINCT CASE WHEN at.escalated_at IS NOT NULL THEN at.id END) AS total_escalated_tasks,
    COALESCE(
        (
            SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (t.claimed_at - a.created_at)))
            FROM alerts a
            JOIN alert_tasks t ON t.alert_id = a.id
            WHERE a.facility_id = f.id
              AND a.created_at >= timezone('utc', now() - INTERVAL '24 hours')
              AND t.claimed_at IS NOT NULL
        ),
        45
    )::INT AS median_seconds_to_claim
FROM facilities f
LEFT JOIN alerts a ON a.facility_id = f.id AND a.created_at >= timezone('utc', now() - INTERVAL '24 hours')
LEFT JOIN alert_tasks at ON at.alert_id = a.id
GROUP BY f.id, f.name;