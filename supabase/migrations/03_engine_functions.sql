-- ========================================================
-- GoldenHour — Database Schema Migration 03: Engine Functions
-- Implements state machine and atomic concurrency rules (PRD Section 4.4)
-- ========================================================

-- A. Atomically claim a preparation task (Prevents race conditions)
CREATE OR REPLACE FUNCTION claim_task(
    p_task_id UUID,
    p_staff_name TEXT,
    p_staff_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_task RECORD;
BEGIN
    -- Select for update to lock the row
    SELECT * INTO v_task 
    FROM preparation_tasks 
    WHERE task_id = p_task_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Task not found');
    END IF;

    IF v_task.task_status = 'Claimed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Task already claimed by ' || v_task.claimed_by);
    END IF;

    -- Update atomically
    UPDATE preparation_tasks
    SET 
        task_status = 'Claimed',
        claimed_by = p_staff_name,
        claimed_at = NOW()
    WHERE task_id = p_task_id;

    -- Record in audit log
    INSERT INTO request_audit_log (request_id, action, actor, details)
    VALUES (
        v_task.request_id,
        'TASK_CLAIMED',
        p_staff_name,
        jsonb_build_object('task_id', p_task_id, 'role', p_staff_role, 'description', v_task.task_description)
    );

    RETURN jsonb_build_object('success', true, 'claimed_by', p_staff_name, 'claimed_at', NOW());
END;
$$;

-- B. Validate and advance request state
CREATE OR REPLACE FUNCTION next_state(
    p_request_id TEXT,
    p_new_state TEXT,
    p_actor TEXT,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_req RECORD;
    v_valid_transition BOOLEAN := false;
BEGIN
    SELECT * INTO v_req 
    FROM emergency_requests 
    WHERE request_id = p_request_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not found');
    END IF;

    -- State transition checks
    IF v_req.request_status = 'CREATED' AND p_new_state IN ('NOTIFIED', 'HOSPITAL_PREPARING', 'CANCELLED') THEN
        v_valid_transition := true;
    ELSIF v_req.request_status IN ('NOTIFIED', 'HOSPITAL_PREPARING') AND p_new_state IN ('READY_FOR_ARRIVAL', 'ARRIVED', 'REJECTED', 'CANCELLED', 'ESCALATED') THEN
        v_valid_transition := true;
    ELSIF v_req.request_status = 'ESCALATED' AND p_new_state IN ('READY_FOR_ARRIVAL', 'ARRIVED', 'REJECTED', 'CANCELLED') THEN
        v_valid_transition := true;
    ELSIF v_req.request_status IN ('READY_FOR_ARRIVAL', 'ARRIVED') AND p_new_state = 'COMPLETED' THEN
        v_valid_transition := true;
    END IF;

    IF NOT v_valid_transition THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Illegal transition from ' || v_req.request_status || ' to ' || p_new_state
        );
    END IF;

    UPDATE emergency_requests
    SET 
        request_status = p_new_state,
        arrived_at = CASE WHEN p_new_state = 'ARRIVED' THEN NOW() ELSE arrived_at END,
        closed_at = CASE WHEN p_new_state = 'COMPLETED' THEN NOW() ELSE closed_at END,
        escalated_at = CASE WHEN p_new_state = 'ESCALATED' THEN NOW() ELSE escalated_at END,
        rejection_reason = CASE WHEN p_new_state = 'REJECTED' THEN p_reason ELSE rejection_reason END
    WHERE request_id = p_request_id;

    INSERT INTO request_audit_log (request_id, action, actor, details)
    VALUES (
        p_request_id,
        'STATE_TRANSITION',
        p_actor,
        jsonb_build_object('from', v_req.request_status, 'to', p_new_state, 'reason', p_reason)
    );

    RETURN jsonb_build_object('success', true, 'new_state', p_new_state);
END;
$$;

-- C. Idempotent Escalation for Overdue Alerts (PRD Section 8.2)
CREATE OR REPLACE FUNCTION escalate_overdue()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- Identify active requests older than 90 seconds without full claims
    WITH overdue_alerts AS (
        SELECT r.request_id
        FROM emergency_requests r
        JOIN preparation_tasks t ON r.request_id = t.request_id
        WHERE r.request_status IN ('CREATED', 'NOTIFIED', 'HOSPITAL_PREPARING')
          AND r.escalated_at IS NULL
          AND t.task_status = 'Pending'
          AND r.created_at < NOW() - INTERVAL '90 seconds'
        GROUP BY r.request_id
    )
    UPDATE emergency_requests
    SET 
        request_status = 'ESCALATED',
        escalated_at = NOW()
    WHERE request_id IN (SELECT request_id FROM overdue_alerts);

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;
