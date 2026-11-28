-- Migration 10: Hot Query Indexes & Auto-Update Triggers
-- GoldenHour Blueprint §7.3 / NIRMAN 2026

-- Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_facilities_updated_at ON facilities;
CREATE TRIGGER trg_facilities_updated_at
BEFORE UPDATE ON facilities
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_alert_tasks_updated_at ON alert_tasks;
CREATE TRIGGER trg_alert_tasks_updated_at
BEFORE UPDATE ON alert_tasks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Automatic 4 tasks generator when an alert is created
CREATE OR REPLACE FUNCTION spawn_alert_tasks_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_rec RECORD;
    v_task_count INT := 0;
    v_p_key TEXT;
BEGIN
    -- Determine playbook key from capability_req
    v_p_key := COALESCE(NEW.playbook_key, 
        CASE 
            WHEN 'thrombolysis' = ANY(NEW.capability_req) OR 'ct' = ANY(NEW.capability_req) THEN 'stroke'
            WHEN 'blood' = ANY(NEW.capability_req) OR 'ot' = ANY(NEW.capability_req) THEN 'trauma'
            ELSE 'cardiac'
        END
    );

    FOR v_rec IN 
        SELECT pt.id, pt.team, pt.title, pt.detail, pt.sla_seconds, pt.backup_staff
        FROM playbook_tasks pt
        JOIN playbooks p ON pt.playbook_id = p.id
        WHERE p.key = v_p_key
        ORDER BY pt.position ASC
    LOOP
        INSERT INTO alert_tasks (
            alert_id,
            task_id,
            team,
            title,
            detail,
            sla_seconds,
            deadline_at,
            state
        ) VALUES (
            NEW.id,
            v_rec.id,
            v_rec.team,
            v_rec.title,
            v_rec.detail,
            v_rec.sla_seconds,
            NEW.created_at + (v_rec.sla_seconds * INTERVAL '1 second'),
            'OPEN'
        );
        v_task_count := v_task_count + 1;
    END LOOP;

    -- Fallback safety: generate 4 standard tasks if playbook not yet populated
    IF v_task_count < 4 THEN
        INSERT INTO alert_tasks (alert_id, team, title, detail, sla_seconds, deadline_at) VALUES
        (NEW.id, 'counter', 'Hold ED bed', 'Reserve intake bed in resus bay', 180, NEW.created_at + INTERVAL '180 seconds'),
        (NEW.id, 'medicine', 'Prepare emergency medicines', 'Draw up urgent medication tray', 120, NEW.created_at + INTERVAL '120 seconds'),
        (NEW.id, 'equipment', 'Prepare critical equipment', 'ECG, Defibrillator, O2 to bay', 120, NEW.created_at + INTERVAL '120 seconds'),
        (NEW.id, 'stretcher', 'Trolley & stretcher to gate', 'Meet vehicle at emergency gate', 90, NEW.created_at + INTERVAL '90 seconds');
    END IF;

    -- Ephemeral Bed Hold
    UPDATE facilities
    SET ed_beds_free = GREATEST(0, ed_beds_free - 1)
    WHERE id = NEW.facility_id AND ed_beds_free > 0;

    INSERT INTO bed_holds (alert_id, facility_id, bed_label, expires_at)
    VALUES (NEW.id, NEW.facility_id, 'ED-HOLD', timezone('utc', now()) + INTERVAL '30 minutes');

    -- Log ALERT_CREATED event
    INSERT INTO events (alert_id, actor_role, action, payload)
    VALUES (NEW.id, 'patient', 'ALERT_CREATED', jsonb_build_object(
        'temp_id', NEW.temp_id,
        'facility_id', NEW.facility_id,
        'capability_req', NEW.capability_req,
        'eta_minutes', NEW.eta_minutes
    ));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_alerts_spawn_tasks ON alerts;
CREATE TRIGGER trg_alerts_spawn_tasks
AFTER INSERT ON alerts
FOR EACH ROW
EXECUTE FUNCTION spawn_alert_tasks_trigger();
