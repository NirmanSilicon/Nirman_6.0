-- View: cancelled_alerts_view
-- GoldenHour Blueprint §6.3 / NIRMAN 2026
-- Waste ledger view: track cancellations, reasons, and duration bed was held

CREATE OR REPLACE VIEW cancelled_alerts_view AS
SELECT 
    c.id AS cancellation_id,
    c.alert_id,
    a.temp_id,
    a.facility_id,
    f.name AS facility_name,
    c.reason,
    c.actor_role,
    c.at AS cancelled_at,
    bh.bed_label,
    EXTRACT(EPOCH FROM (c.at - a.created_at))::INT AS hold_duration_seconds
FROM cancellations c
JOIN alerts a ON c.alert_id = a.id
JOIN facilities f ON a.facility_id = f.id
LEFT JOIN bed_holds bh ON bh.alert_id = a.id;
