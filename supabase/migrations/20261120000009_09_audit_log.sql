-- Migration 09: Append-Only Event Log, Cancellation Ledger, and Notification Outbox
-- GoldenHour Blueprint §7.3 & Team Leader Engine Spec

-- 1. Append-only event log (Task History & Audit Log)
CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
    actor_id UUID,
    actor_role TEXT,
    action TEXT NOT NULL,                        -- ALERT_CREATED, ACK, CLAIM, ESCALATE, etc.
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- Immutable Trigger: Append-only guarantee (Rule #5)
CREATE OR REPLACE FUNCTION prevent_event_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Event / Audit log entries are strictly immutable. (GoldenHour Rule #5)';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_events_immutable ON events;
CREATE TRIGGER trg_events_immutable
BEFORE UPDATE OR DELETE ON events
FOR EACH ROW
EXECUTE FUNCTION prevent_event_log_modification();

-- 2. Cancellation ledger (So false alerts are countable)
CREATE TABLE IF NOT EXISTS cancellations (
    id BIGSERIAL PRIMARY KEY,
    alert_id UUID NOT NULL,
    reason TEXT NOT NULL,                        -- changed_hospital / not_coming / duplicate / no_arrival / other
    actor_role TEXT,
    at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- 3. Notification Outbox (For dispatching in-app chimes, push, supervisor alerts)
CREATE TABLE IF NOT EXISTS notification_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE NOT NULL,
    task_id UUID REFERENCES alert_tasks(id) ON DELETE CASCADE,
    recipient_role TEXT NOT NULL,                -- e.g. 'supervisor', 'counter', 'medicine'
    channel TEXT NOT NULL CHECK (channel IN ('in_app_chime', 'phone_push', 'supervisor_wall', 'sms')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_events_alert ON events(alert_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_cancellations_alert ON cancellations(alert_id);
CREATE INDEX IF NOT EXISTS idx_notifications_pending ON notification_outbox(status) WHERE status = 'PENDING';
