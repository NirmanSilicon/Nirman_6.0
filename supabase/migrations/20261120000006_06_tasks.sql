-- Migration 06: Alert Tasks (Task Instances)
-- GoldenHour Blueprint §7.3 / NIRMAN 2026

CREATE TABLE IF NOT EXISTS alert_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
    task_id UUID REFERENCES playbook_tasks(id) ON DELETE SET NULL,
    team TEXT NOT NULL CHECK (team IN ('counter', 'medicine', 'equipment', 'stretcher')),
    title TEXT NOT NULL,
    detail TEXT,
    sla_seconds INT NOT NULL,
    deadline_at TIMESTAMPTZ NOT NULL,            -- Calculated on server: created_at + sla_seconds
    claimed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    claimed_at TIMESTAMPTZ,
    done_at TIMESTAMPTZ,
    escalated_at TIMESTAMPTZ,                    -- Idempotency field: non-null means escalated
    escalation_n INT DEFAULT 0,
    state TEXT DEFAULT 'OPEN' CHECK (state IN ('OPEN', 'CLAIMED', 'DONE', 'ESCALATED')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_alert_tasks_alert ON alert_tasks(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_tasks_open ON alert_tasks(state) WHERE state = 'OPEN';
CREATE INDEX IF NOT EXISTS idx_alert_tasks_deadline ON alert_tasks(deadline_at) WHERE state = 'OPEN' AND escalated_at IS NULL;
