-- View: nurse_safe_view
-- GoldenHour Blueprint §7.4 / NIRMAN 2026
-- Enforces privacy at the database layer: nurse sees NO private_notes, NO diagnosis, NO phone number.

CREATE OR REPLACE VIEW nurse_safe_view AS
SELECT 
    r.alert_id,
    a.temp_id,
    bh.bed_label,
    t.title AS current_task,
    t.state AS task_state,
    GREATEST(0, EXTRACT(EPOCH FROM (t.deadline_at - timezone('utc', now())))::INT / 60) AS minutes_remaining,
    r.safe_summary->'medicines' AS medicines,
    r.safe_summary->'allergies' AS allergies,
    r.safe_summary->'watch_for' AS watch_for
FROM records r
JOIN alerts a ON r.alert_id = a.id
LEFT JOIN bed_holds bh ON bh.alert_id = a.id AND bh.released_at IS NULL
LEFT JOIN alert_tasks t ON t.alert_id = a.id AND t.team = 'medicine';
