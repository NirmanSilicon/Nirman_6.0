-- Migration 11: The Engine in SQL (next_state, next_task_state, next_alert_state, claim_task, escalate_overdue, cancel_alert, engine_tick)
-- GoldenHour Blueprint §6.1 / §07 / §8.3 / NIRMAN 2026 / Security Hardened V2.0

-- Purge previous function signatures to avoid duplicate/stale overloads
DROP FUNCTION IF EXISTS public.next_state(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.next_task_state(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.next_alert_state(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.claim_task(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.claim_task(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.escalate_overdue() CASCADE;
DROP FUNCTION IF EXISTS public.escalate_overdue(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.cancel_alert(UUID, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.engine_tick() CASCADE;
DROP FUNCTION IF EXISTS public.auth_staff_facility_id() CASCADE;
DROP FUNCTION IF EXISTS public.auth_staff_role() CASCADE;

CREATE OR REPLACE FUNCTION auth_staff_facility_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT facility_id FROM public.staff WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION auth_staff_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT role::text FROM public.staff WHERE user_id = auth.uid() LIMIT 1;
$$;

-- -----------------------------------------------------------------------------
-- 1. NEXT_TASK_STATE (Contract for Staff Task Progression: CLAIM -> DONE)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION next_task_state(p_task_id UUID, p_action TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_task public.alert_tasks%ROWTYPE;
    v_alert public.alerts%ROWTYPE;
    v_staff public.staff%ROWTYPE;
    v_auth_uid UUID;
    v_new_state public.task_state;
BEGIN
    SELECT * INTO v_task FROM public.alert_tasks WHERE id = p_task_id;
    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'error', 'Task not found', 'code', 'TASK_NOT_FOUND');
    END IF;

    SELECT * INTO v_alert FROM public.alerts WHERE id = v_task.alert_id;
    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'error', 'Associated alert not found', 'code', 'ALERT_NOT_FOUND');
    END IF;

    v_auth_uid := auth.uid();
    IF v_auth_uid IS NOT NULL THEN
        SELECT * INTO v_staff FROM public.staff WHERE user_id = v_auth_uid;
    END IF;

    -- Facility isolation check
    IF v_staff.facility_id IS NOT NULL AND v_alert.facility_id IS NOT NULL AND v_staff.facility_id <> v_alert.facility_id THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'error', 'Cross-facility restriction: Staff cannot modify tasks for another hospital', 'code', 'FACILITY_MISMATCH');
    END IF;

    IF p_action = 'CLAIM' THEN
        IF v_task.state IN ('CLAIMED', 'DONE') THEN
            RETURN pg_catalog.jsonb_build_object('success', false, 'already_claimed', true, 'message', 'Task already claimed or done', 'current_state', v_task.state);
        END IF;

        IF v_staff.id IS NULL AND auth.role() <> 'service_role' THEN
            RETURN pg_catalog.jsonb_build_object('success', false, 'error', 'Active staff profile required to claim task', 'code', 'UNAUTHORIZED');
        END IF;

        v_new_state := 'CLAIMED'::public.task_state;
        UPDATE public.alert_tasks
        SET state = v_new_state,
            claimed_by = pg_catalog.coalesce(v_staff.id, claimed_by),
            claimed_at = pg_catalog.timezone('utc', pg_catalog.now()),
            updated_at = pg_catalog.timezone('utc', pg_catalog.now())
        WHERE id = p_task_id
        RETURNING * INTO v_task;

        INSERT INTO public.events (alert_id, actor_id, actor_role, action, payload)
        VALUES (v_task.alert_id, v_staff.id, pg_catalog.coalesce(v_staff.role::text, 'service_role'), 'CLAIM', pg_catalog.jsonb_build_object('task_id', v_task.id, 'team', v_task.team, 'title', v_task.title));

        -- Check if all tasks claimed
        IF NOT EXISTS (SELECT 1 FROM public.alert_tasks WHERE alert_id = v_task.alert_id AND state IN ('OPEN', 'ESCALATED')) THEN
            UPDATE public.alerts SET state = 'ALL_CLAIMED'::public.alert_state, all_claimed_at = pg_catalog.timezone('utc', pg_catalog.now()) WHERE id = v_task.alert_id AND state IN ('SENT', 'ACKNOWLEDGED', 'CLAIMING');
            INSERT INTO public.events (alert_id, actor_role, action, payload) VALUES (v_task.alert_id, 'system', 'ALL_CLAIMED', '{}'::jsonb);
        ELSE
            UPDATE public.alerts SET state = 'CLAIMING'::public.alert_state WHERE id = v_task.alert_id AND state = 'ACKNOWLEDGED';
        END IF;

    ELSIF p_action IN ('DONE', 'COMPLETE') THEN
        IF v_task.state = 'DONE' THEN
            RETURN pg_catalog.jsonb_build_object('success', true, 'already_done', true, 'task', pg_catalog.row_to_json(v_task));
        END IF;

        v_new_state := 'DONE'::public.task_state;
        UPDATE public.alert_tasks
        SET state = v_new_state,
            done_at = pg_catalog.timezone('utc', pg_catalog.now()),
            updated_at = pg_catalog.timezone('utc', pg_catalog.now())
        WHERE id = p_task_id
        RETURNING * INTO v_task;

        INSERT INTO public.events (alert_id, actor_id, actor_role, action, payload)
        VALUES (v_task.alert_id, v_staff.id, pg_catalog.coalesce(v_staff.role::text, 'service_role'), 'DONE', pg_catalog.jsonb_build_object('task_id', v_task.id, 'team', v_task.team, 'title', v_task.title));

    ELSE
        RETURN pg_catalog.jsonb_build_object('success', false, 'error', 'Illegal task action: ' || p_action, 'code', 'INVALID_ACTION');
    END IF;

    RETURN pg_catalog.jsonb_build_object('success', true, 'task', pg_catalog.row_to_json(v_task), 'new_state', v_new_state);
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. NEXT_ALERT_STATE (Contract for Alert Lifecycle Progression)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION next_alert_state(p_alert_id UUID, p_action TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_alert public.alerts%ROWTYPE;
    v_all_tasks_claimed BOOLEAN;
    v_new_state public.alert_state;
BEGIN
    SELECT * INTO v_alert FROM public.alerts WHERE id = p_alert_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Alert with id % not found', p_alert_id;
    END IF;

    -- Terminal states cannot transition
    IF v_alert.state IN ('CANCELLED', 'EXPIRED', 'CLOSED') THEN
        RETURN v_alert.state::text;
    END IF;

    IF p_action = 'ACKNOWLEDGE' THEN
        IF v_alert.state = 'SENT' THEN
            v_new_state := 'ACKNOWLEDGED'::public.alert_state;
            UPDATE public.alerts SET state = v_new_state, acknowledged_at = pg_catalog.timezone('utc', pg_catalog.now()) WHERE id = p_alert_id;
            INSERT INTO public.events (alert_id, actor_role, action, payload) VALUES (p_alert_id, 'supervisor', 'ACK', '{}'::jsonb);
        ELSE
            v_new_state := v_alert.state;
        END IF;

    ELSIF p_action = 'CHECK_CLAIM_PROGRESS' THEN
        SELECT NOT EXISTS(SELECT 1 FROM public.alert_tasks WHERE alert_id = p_alert_id AND state IN ('OPEN', 'ESCALATED'))
        INTO v_all_tasks_claimed;

        IF v_all_tasks_claimed THEN
            v_new_state := 'ALL_CLAIMED'::public.alert_state;
            UPDATE public.alerts SET state = v_new_state, all_claimed_at = pg_catalog.timezone('utc', pg_catalog.now()) WHERE id = p_alert_id;
            INSERT INTO public.events (alert_id, actor_role, action, payload) VALUES (p_alert_id, 'system', 'ALL_CLAIMED', '{}'::jsonb);
        ELSE
            IF v_alert.state = 'ACKNOWLEDGED' THEN
                v_new_state := 'CLAIMING'::public.alert_state;
                UPDATE public.alerts SET state = v_new_state WHERE id = p_alert_id;
            ELSE
                v_new_state := v_alert.state;
            END IF;
        END IF;

    ELSIF p_action = 'ARRIVED' THEN
        v_new_state := 'ARRIVED'::public.alert_state;
        UPDATE public.alerts SET state = v_new_state, arrived_at = pg_catalog.timezone('utc', pg_catalog.now()) WHERE id = p_alert_id;
        INSERT INTO public.events (alert_id, actor_role, action, payload) VALUES (p_alert_id, 'counter', 'ARRIVED', '{}'::jsonb);

    ELSIF p_action = 'CLOSE' THEN
        IF v_alert.state != 'ARRIVED' THEN
            RAISE EXCEPTION 'Cannot close alert before arrival is confirmed';
        END IF;
        v_new_state := 'CLOSED'::public.alert_state;
        UPDATE public.alerts SET state = v_new_state, closed_at = pg_catalog.timezone('utc', pg_catalog.now()) WHERE id = p_alert_id;
        INSERT INTO public.events (alert_id, actor_role, action, payload) VALUES (p_alert_id, 'doctor', 'CLOSED', '{}'::jsonb);

    ELSE
        RAISE EXCEPTION 'Illegal action % for alert state %', p_action, v_alert.state;
    END IF;

    RETURN v_new_state::text;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. NEXT_STATE (Polymorphic: Resolves both task and alert transition contracts)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION next_state(p_task_id UUID, p_action TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_task_res JSONB;
BEGIN
    -- If p_task_id points to an alert, execute alert transition
    IF EXISTS (SELECT 1 FROM public.alerts WHERE id = p_task_id) THEN
        RETURN public.next_alert_state(p_task_id, p_action);
    END IF;

    -- Otherwise execute task transition
    IF EXISTS (SELECT 1 FROM public.alert_tasks WHERE id = p_task_id) THEN
        v_task_res := public.next_task_state(p_task_id, p_action);
        IF (v_task_res->>'success')::boolean = true THEN
            RETURN pg_catalog.coalesce(v_task_res->>'new_state', (v_task_res->'task'->>'state')::text);
        ELSE
            RAISE EXCEPTION '%', pg_catalog.coalesce(v_task_res->>'error', v_task_res->>'message', 'Task transition failed');
        END IF;
    END IF;

    RAISE EXCEPTION 'Target ID % not found in alerts or alert_tasks', p_task_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. CLAIM_TASK (Strictly Derives Identity from auth.uid() — No p_staff_id Spoofing)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION claim_task(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_task public.alert_tasks%ROWTYPE;
    v_staff public.staff%ROWTYPE;
    v_alert public.alerts%ROWTYPE;
    v_auth_uid UUID;
BEGIN
    v_auth_uid := auth.uid();

    -- Identity Verification: Strictly from auth.uid()
    IF v_auth_uid IS NOT NULL THEN
        SELECT * INTO v_staff FROM public.staff WHERE user_id = v_auth_uid;
        IF NOT FOUND THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', false,
                'error', 'Caller has no active staff profile linked to authenticated user',
                'code', 'STAFF_NOT_FOUND'
            );
        END IF;
    ELSIF auth.role() = 'service_role' THEN
        SELECT * INTO v_staff FROM public.staff WHERE role = 'supervisor' LIMIT 1;
    ELSE
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'error', 'Authentication required to claim task',
            'code', 'UNAUTHORIZED'
        );
    END IF;

    -- Verify task existence
    SELECT * INTO v_task FROM public.alert_tasks WHERE id = p_task_id;
    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'error', 'Task not found', 'code', 'TASK_NOT_FOUND');
    END IF;

    -- Verify alert existence and facility isolation
    SELECT * INTO v_alert FROM public.alerts WHERE id = v_task.alert_id;
    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'error', 'Associated alert not found', 'code', 'ALERT_NOT_FOUND');
    END IF;

    IF v_staff.facility_id IS NOT NULL AND v_alert.facility_id IS NOT NULL AND v_staff.facility_id <> v_alert.facility_id THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'error', 'Cross-facility restriction: Staff cannot claim tasks for another hospital',
            'code', 'FACILITY_MISMATCH'
        );
    END IF;

    -- Atomic compare-and-set: can claim if OPEN or ESCALATED
    UPDATE public.alert_tasks
    SET state = 'CLAIMED'::public.task_state,
        claimed_by = v_staff.id,
        claimed_at = pg_catalog.timezone('utc', pg_catalog.now()),
        updated_at = pg_catalog.timezone('utc', pg_catalog.now())
    WHERE id = p_task_id
      AND state IN ('OPEN', 'ESCALATED')
    RETURNING * INTO v_task;

    IF NOT FOUND THEN
        SELECT * INTO v_task FROM public.alert_tasks WHERE id = p_task_id;
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'already_claimed', true,
            'message', 'Task already claimed',
            'claimed_by', v_task.claimed_by,
            'claimed_at', v_task.claimed_at,
            'current_state', v_task.state
        );
    END IF;

    -- Log audit event
    INSERT INTO public.events (alert_id, actor_id, actor_role, action, payload)
    VALUES (
        v_task.alert_id,
        v_staff.id,
        v_staff.role::text,
        'CLAIM',
        pg_catalog.jsonb_build_object(
            'task_id', v_task.id,
            'team', v_task.team,
            'title', v_task.title,
            'staff_id', v_staff.id,
            'staff_name', v_staff.full_name
        )
    );

    -- Queue outbox notification
    INSERT INTO public.notification_outbox (alert_id, task_id, recipient_role, channel, payload)
    VALUES (
        v_task.alert_id,
        v_task.id,
        v_task.team::text,
        'in_app_chime'::public.notification_channel,
        pg_catalog.jsonb_build_object(
            'event', 'TASK_CLAIMED',
            'task_id', v_task.id,
            'title', v_task.title,
            'claimed_by_name', v_staff.full_name
        )
    );

    -- Check if all tasks for this alert are claimed
    IF NOT EXISTS (
        SELECT 1 FROM public.alert_tasks
        WHERE alert_id = v_task.alert_id AND state IN ('OPEN', 'ESCALATED')
    ) THEN
        UPDATE public.alerts
        SET state = 'ALL_CLAIMED'::public.alert_state,
            all_claimed_at = pg_catalog.timezone('utc', pg_catalog.now())
        WHERE id = v_task.alert_id AND state IN ('SENT', 'ACKNOWLEDGED', 'CLAIMING');

        INSERT INTO public.events (alert_id, actor_role, action, payload)
        VALUES (v_task.alert_id, 'system', 'ALL_CLAIMED', '{}'::jsonb);
    ELSE
        UPDATE public.alerts
        SET state = 'CLAIMING'::public.alert_state
        WHERE id = v_task.alert_id AND state = 'ACKNOWLEDGED';
    END IF;

    RETURN pg_catalog.jsonb_build_object('success', true, 'task', pg_catalog.row_to_json(v_task));
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. ESCALATE_OVERDUE (Facility and Role Scoped Escalation Query)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION escalate_overdue(p_facility_id UUID DEFAULT NULL)
RETURNS TABLE (
    task_id UUID,
    alert_id UUID,
    team TEXT,
    title TEXT,
    escalation_n INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_facility UUID;
    v_caller_role TEXT;
BEGIN
    -- Authorization & Scope Check
    IF auth.role() = 'service_role' THEN
        NULL;
    ELSIF auth.uid() IS NOT NULL THEN
        SELECT s.facility_id, s.role::text INTO v_caller_facility, v_caller_role
        FROM public.staff s
        WHERE s.user_id = auth.uid();

        IF v_caller_facility IS NULL THEN
            RAISE EXCEPTION 'Caller is not an active staff member';
        END IF;

        IF v_caller_role NOT IN ('supervisor', 'doctor', 'operator') THEN
            RAISE EXCEPTION 'Insufficient permissions to invoke escalate_overdue';
        END IF;

        IF p_facility_id IS NOT NULL AND p_facility_id <> v_caller_facility THEN
            RAISE EXCEPTION 'Cannot escalate tasks outside assigned facility';
        END IF;

        p_facility_id := v_caller_facility;
    ELSE
        RAISE EXCEPTION 'Authentication required to invoke escalate_overdue';
    END IF;

    RETURN QUERY
    WITH updated_tasks AS (
        UPDATE public.alert_tasks t
        SET state = 'ESCALATED'::public.task_state,
            escalated_at = pg_catalog.timezone('utc', pg_catalog.now()),
            escalation_n = t.escalation_n + 1,
            updated_at = pg_catalog.timezone('utc', pg_catalog.now())
        FROM public.alerts a
        WHERE t.alert_id = a.id
          AND t.deadline_at < pg_catalog.timezone('utc', pg_catalog.now())
          AND t.state = 'OPEN'
          AND t.escalated_at IS NULL
          AND (p_facility_id IS NULL OR a.facility_id = p_facility_id)
        RETURNING t.id, t.alert_id, t.team::text, t.title, t.escalation_n
    ),
    logged_events AS (
        INSERT INTO public.events (alert_id, actor_role, action, payload)
        SELECT 
            ut.alert_id,
            'system',
            'ESCALATE',
            pg_catalog.jsonb_build_object(
                'task_id', ut.id,
                'team', ut.team,
                'title', ut.title,
                'escalation_n', ut.escalation_n
            )
        FROM updated_tasks ut
    ),
    queued_notifications AS (
        INSERT INTO public.notification_outbox (alert_id, task_id, recipient_role, channel, payload)
        SELECT 
            ut.alert_id,
            ut.id,
            'supervisor',
            'supervisor_wall'::public.notification_channel,
            pg_catalog.jsonb_build_object(
                'message', 'TASK ESCALATED: ' || ut.title || ' (' || ut.team || ')',
                'task_id', ut.id,
                'escalation_n', ut.escalation_n
            )
        FROM updated_tasks ut
    )
    SELECT ut.id, ut.alert_id, ut.team, ut.title, ut.escalation_n FROM updated_tasks ut;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. CANCEL_ALERT (Reversible Cancel with Verified Bed Hold Release & Idempotency)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cancel_alert(
    p_alert_id UUID,
    p_reason TEXT DEFAULT 'changed_hospital',
    p_access_token UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_alert public.alerts%ROWTYPE;
    v_staff public.staff%ROWTYPE;
    v_beds_released INT := 0;
    v_auth_uid UUID;
BEGIN
    SELECT * INTO v_alert FROM public.alerts WHERE id = p_alert_id;
    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'error', 'Alert not found', 'code', 'ALERT_NOT_FOUND');
    END IF;

    -- Idempotency: Already cancelled alerts return success without duplicate releases
    IF v_alert.state = 'CANCELLED' THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', true,
            'already_cancelled', true,
            'message', 'Alert has already been cancelled',
            'state', 'CANCELLED'
        );
    END IF;

    -- Cannot cancel after arrival or closure
    IF v_alert.state IN ('ARRIVED', 'CLOSED', 'EXPIRED') THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'error', 'Cannot cancel alert in state ' || v_alert.state,
            'code', 'INVALID_STATE_TRANSITION',
            'current_state', v_alert.state
        );
    END IF;

    -- Authorization check
    v_auth_uid := auth.uid();
    IF auth.role() = 'service_role' THEN
        NULL;
    ELSIF v_auth_uid IS NOT NULL THEN
        SELECT * INTO v_staff FROM public.staff WHERE user_id = v_auth_uid;
        IF FOUND AND v_staff.facility_id <> v_alert.facility_id THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', false,
                'error', 'Staff from another facility cannot cancel this alert',
                'code', 'FORBIDDEN'
            );
        END IF;
    ELSE
        -- Patient caller: verify access_token
        IF p_access_token IS NULL OR p_access_token <> v_alert.access_token THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', false,
                'error', 'Valid alert access_token required for patient cancellation',
                'code', 'UNAUTHORIZED'
            );
        END IF;
    END IF;

    -- Atomic transition to CANCELLED
    UPDATE public.alerts
    SET state = 'CANCELLED'::public.alert_state,
        cancel_reason = p_reason::public.cancel_reason
    WHERE id = p_alert_id
      AND state NOT IN ('CANCELLED', 'ARRIVED', 'CLOSED', 'EXPIRED');

    IF NOT FOUND THEN
        SELECT * INTO v_alert FROM public.alerts WHERE id = p_alert_id;
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'error', 'Concurrent state transition detected',
            'current_state', v_alert.state
        );
    END IF;

    -- Cancel all open or escalated tasks
    UPDATE public.alert_tasks
    SET state = 'DONE'::public.task_state,
        done_at = pg_catalog.timezone('utc', pg_catalog.now()),
        updated_at = pg_catalog.timezone('utc', pg_catalog.now())
    WHERE alert_id = p_alert_id
      AND state IN ('OPEN', 'ESCALATED');

    -- Release bed hold and increment facility bed count IF a hold was actually active
    WITH released AS (
        UPDATE public.bed_holds
        SET released_at = pg_catalog.timezone('utc', pg_catalog.now())
        WHERE alert_id = p_alert_id AND released_at IS NULL
        RETURNING facility_id
    )
    UPDATE public.facilities f
    SET ed_beds_free = pg_catalog.least(f.ed_beds_total, f.ed_beds_free + 1)
    FROM released r
    WHERE f.id = r.facility_id;

    GET DIAGNOSTICS v_beds_released = ROW_COUNT;

    -- Log cancellation to ledger
    INSERT INTO public.cancellations (alert_id, reason, actor_role)
    VALUES (p_alert_id, p_reason, pg_catalog.coalesce(v_staff.role::text, 'patient'));

    -- Log event
    INSERT INTO public.events (alert_id, actor_role, action, payload)
    VALUES (
        p_alert_id,
        pg_catalog.coalesce(v_staff.role::text, 'patient'),
        'CANCEL',
        pg_catalog.jsonb_build_object(
            'reason', p_reason,
            'bed_released', (v_beds_released > 0)
        )
    );

    -- Queue outbox notification to supervisor wall
    INSERT INTO public.notification_outbox (alert_id, recipient_role, channel, payload)
    VALUES (
        p_alert_id,
        'supervisor',
        'supervisor_wall'::public.notification_channel,
        pg_catalog.jsonb_build_object(
            'event', 'ALERT_CANCELLED',
            'reason', p_reason,
            'bed_released', (v_beds_released > 0)
        )
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'state', 'CANCELLED',
        'bed_released', (v_beds_released > 0)
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 7. ENGINE_TICK (Heartbeat with Advisory Transaction Lock)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION engine_tick()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_locked BOOLEAN;
    v_escalated_count INT := 0;
    v_expired_alerts_count INT := 0;
    v_released_holds_count INT := 0;
BEGIN
    -- Advisory transaction lock prevents concurrent engine_tick executions (key: 424242)
    SELECT pg_catalog.pg_try_advisory_xact_lock(424242) INTO v_locked;
    IF NOT v_locked THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'locked', true,
            'message', 'engine_tick is already running concurrently in another transaction'
        );
    END IF;

    -- 1. Escalate overdue tasks globally
    WITH esc AS (
        SELECT * FROM public.escalate_overdue(NULL)
    )
    SELECT COUNT(*) INTO v_escalated_count FROM esc;

    -- 2. Expire un-arrived alerts past ETA + 5 minutes and release their bed holds
    WITH exp_alerts AS (
        UPDATE public.alerts
        SET state = 'EXPIRED'::public.alert_state
        WHERE state IN ('SENT', 'ACKNOWLEDGED', 'CLAIMING', 'ALL_CLAIMED')
          AND expires_at IS NOT NULL
          AND expires_at < pg_catalog.timezone('utc', pg_catalog.now())
        RETURNING id, facility_id
    ),
    logged_exp AS (
        INSERT INTO public.events (alert_id, actor_role, action, payload)
        SELECT ea.id, 'system', 'ALERT_EXPIRED', pg_catalog.jsonb_build_object('expired_at', pg_catalog.timezone('utc', pg_catalog.now()))
        FROM exp_alerts ea
    ),
    rel_alert_holds AS (
        UPDATE public.bed_holds bh
        SET released_at = pg_catalog.timezone('utc', pg_catalog.now())
        FROM exp_alerts ea
        WHERE bh.alert_id = ea.id AND bh.released_at IS NULL
        RETURNING bh.facility_id
    ),
    -- 3. Release any remaining expired bed holds (e.g. 30 min hold timeout)
    rel_timeout_holds AS (
        UPDATE public.bed_holds
        SET released_at = pg_catalog.timezone('utc', pg_catalog.now())
        WHERE released_at IS NULL
          AND expires_at < pg_catalog.timezone('utc', pg_catalog.now())
        RETURNING facility_id
    ),
    all_released AS (
        SELECT facility_id FROM rel_alert_holds
        UNION ALL
        SELECT facility_id FROM rel_timeout_holds
    ),
    agg_released AS (
        SELECT facility_id, COUNT(*) as cnt
        FROM all_released
        GROUP BY facility_id
    )
    UPDATE public.facilities f
    SET ed_beds_free = pg_catalog.least(f.ed_beds_total, f.ed_beds_free + ar.cnt::int)
    FROM agg_released ar
    WHERE f.id = ar.facility_id;

    GET DIAGNOSTICS v_released_holds_count = ROW_COUNT;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'tick_at', pg_catalog.timezone('utc', pg_catalog.now()),
        'tasks_escalated', v_escalated_count,
        'alerts_expired', v_expired_alerts_count,
        'holds_released', v_released_holds_count
    );
END;
$$;

-- Function Ownership
ALTER FUNCTION public.auth_staff_facility_id() OWNER TO postgres;
ALTER FUNCTION public.auth_staff_role() OWNER TO postgres;
ALTER FUNCTION public.next_task_state(UUID, TEXT) OWNER TO postgres;
ALTER FUNCTION public.next_alert_state(UUID, TEXT) OWNER TO postgres;
ALTER FUNCTION public.next_state(UUID, TEXT) OWNER TO postgres;
ALTER FUNCTION public.claim_task(UUID) OWNER TO postgres;
ALTER FUNCTION public.escalate_overdue(UUID) OWNER TO postgres;
ALTER FUNCTION public.cancel_alert(UUID, TEXT, UUID) OWNER TO postgres;
ALTER FUNCTION public.engine_tick() OWNER TO postgres;

-- Privileged Grants
REVOKE EXECUTE ON FUNCTION public.engine_tick() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.escalate_overdue(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.next_alert_state(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.next_task_state(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.next_state(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_task(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_alert(UUID, TEXT, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.engine_tick() TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.escalate_overdue(UUID) TO authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.next_alert_state(UUID, TEXT) TO authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.next_task_state(UUID, TEXT) TO authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.next_state(UUID, TEXT) TO authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.claim_task(UUID) TO authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.cancel_alert(UUID, TEXT, UUID) TO anon, authenticated, service_role, postgres;
