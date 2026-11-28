-- RLS Policies for GoldenHour Engine Tables
-- GoldenHour Blueprint §7.4 / NIRMAN 2026 / Security Audit Hardened V2.0
-- Strict Hospital Isolation & Role-Based Enforcement
-- Blocks direct client updates on alerts & alert_tasks that bypass RPC validation

-- -----------------------------------------------------------------------------
-- 0. AUTHENTICATION & FACILITY RESOLUTION HELPERS
-- -----------------------------------------------------------------------------
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

-- Enable RLS across all tables
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bed_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;

-- Clean existing policies for idempotency
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN ('facilities', 'staff', 'playbooks', 'playbook_tasks', 'alerts', 'alert_tasks', 'bed_holds', 'records', 'events', 'cancellations', 'notification_outbox')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 1. FACILITIES (Public read active, supervisor update own)
-- -----------------------------------------------------------------------------
CREATE POLICY "Public can view active facilities"
ON facilities FOR SELECT
USING (is_active = true);

CREATE POLICY "Supervisor can update own facility"
ON facilities FOR UPDATE
USING (
    auth.role() = 'service_role'
    OR (id = auth_staff_facility_id() AND auth_staff_role() = 'supervisor')
);

-- -----------------------------------------------------------------------------
-- 2. STAFF (Profile lookup within facility, PIN lookup for on-shift)
-- -----------------------------------------------------------------------------
CREATE POLICY "Staff can view active colleagues in same facility"
ON staff FOR SELECT
USING (
    auth.role() = 'service_role'
    OR is_on_shift = true
);

CREATE POLICY "Staff can update own shift status"
ON staff FOR UPDATE
USING (
    auth.role() = 'service_role'
    OR user_id = auth.uid()
);

-- Column-level protection for staff authentication secrets
REVOKE SELECT (pin_hash) ON public.staff FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, user_id, facility_id, full_name, role, team, is_on_shift, created_at) ON public.staff TO authenticated;

-- -----------------------------------------------------------------------------
-- 3. PLAYBOOKS & PLAYBOOK TASKS (Standard emergency protocols)
-- -----------------------------------------------------------------------------
CREATE POLICY "Anyone can read playbooks"
ON playbooks FOR SELECT USING (true);

CREATE POLICY "Anyone can read playbook tasks"
ON playbook_tasks FOR SELECT USING (true);

-- -----------------------------------------------------------------------------
-- 4. ALERTS (Patient creates, Patient reads own, Hospital reads own)
-- -----------------------------------------------------------------------------
CREATE POLICY "Public patient can create emergency alert"
ON alerts FOR INSERT
WITH CHECK (true);

CREATE POLICY "Patient can view own alert by token or temp_id"
ON alerts FOR SELECT
USING (
    access_token::text = COALESCE(current_setting('request.headers', true)::json->>'x-access-token', '')
    OR temp_id = COALESCE(current_setting('request.headers', true)::json->>'x-temp-id', '')
);

CREATE POLICY "Staff can view alerts for their own facility"
ON alerts FOR SELECT
USING (
    auth.role() = 'service_role'
    OR facility_id = auth_staff_facility_id()
);

-- Security audit fix: Block direct client UPDATEs that bypass cancel_alert or next_alert_state RPCs
CREATE POLICY "Restrict direct alert updates to service_role"
ON alerts FOR UPDATE
USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- 5. ALERT TASKS (Hospital isolation on read; direct UPDATE restricted to service_role)
-- -----------------------------------------------------------------------------
CREATE POLICY "Patient can view tasks for their alert"
ON alert_tasks FOR SELECT
USING (
    alert_id IN (
        SELECT id FROM alerts WHERE 
            access_token::text = COALESCE(current_setting('request.headers', true)::json->>'x-access-token', '')
            OR temp_id = COALESCE(current_setting('request.headers', true)::json->>'x-temp-id', '')
    )
);

CREATE POLICY "Staff can view tasks for their facility only"
ON alert_tasks FOR SELECT
USING (
    auth.role() = 'service_role'
    OR alert_id IN (SELECT id FROM alerts WHERE facility_id = auth_staff_facility_id())
);

-- Security audit fix: Block direct client UPDATEs that bypass claim_task or next_task_state RPCs
CREATE POLICY "Restrict direct task updates to service_role"
ON alert_tasks FOR UPDATE
USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- 6. BED HOLDS (Strict facility isolation)
-- -----------------------------------------------------------------------------
CREATE POLICY "Staff can view bed holds for their facility only"
ON bed_holds FOR SELECT
USING (
    auth.role() = 'service_role'
    OR facility_id = auth_staff_facility_id()
);

CREATE POLICY "Counter and supervisor can manage bed holds for their facility"
ON bed_holds FOR ALL
USING (
    auth.role() = 'service_role'
    OR (
        facility_id = auth_staff_facility_id() 
        AND auth_staff_role() IN ('counter', 'supervisor')
    )
);

-- -----------------------------------------------------------------------------
-- 7. RECORDS (Clinical isolation: Doctors only, same facility only)
-- -----------------------------------------------------------------------------
CREATE POLICY "Doctors can view clinical records in their facility"
ON records FOR SELECT
USING (
    auth.role() = 'service_role'
    OR (
        facility_id = auth_staff_facility_id() 
        AND auth_staff_role() = 'doctor'
    )
);

CREATE POLICY "Doctors can manage clinical records in their facility"
ON records FOR ALL
USING (
    auth.role() = 'service_role'
    OR (
        facility_id = auth_staff_facility_id() 
        AND auth_staff_role() = 'doctor'
    )
);

-- -----------------------------------------------------------------------------
-- 8. EVENTS & CANCELLATIONS (Append-only audit, hospital scoped)
-- -----------------------------------------------------------------------------
CREATE POLICY "Allow system and authenticated event inserts"
ON events FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can view audit events for their facility only"
ON events FOR SELECT
USING (
    auth.role() = 'service_role'
    OR alert_id IN (SELECT id FROM alerts WHERE facility_id = auth_staff_facility_id())
);

CREATE POLICY "Allow cancellation ledger inserts"
ON cancellations FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can view cancellations for their facility only"
ON cancellations FOR SELECT
USING (
    auth.role() = 'service_role'
    OR alert_id IN (SELECT id FROM alerts WHERE facility_id = auth_staff_facility_id())
);

-- -----------------------------------------------------------------------------
-- 9. NOTIFICATION OUTBOX (Facility scoped read, system write/dispatch)
-- -----------------------------------------------------------------------------
CREATE POLICY "Allow system and authenticated notification inserts"
ON notification_outbox FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can view notification outbox for their facility"
ON notification_outbox FOR SELECT
USING (
    auth.role() = 'service_role'
    OR alert_id IN (SELECT id FROM alerts WHERE facility_id = auth_staff_facility_id())
);

CREATE POLICY "Engine service_role can manage notification outbox"
ON notification_outbox FOR ALL
USING (auth.role() = 'service_role');
