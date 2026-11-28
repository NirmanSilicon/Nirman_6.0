-- Migration 05: Playbooks & Playbook Tasks
-- GoldenHour Blueprint §7.3 / NIRMAN 2026

CREATE TABLE IF NOT EXISTS playbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,                    -- 'cardiac', 'stroke', 'trauma'
    name TEXT NOT NULL,
    version INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS playbook_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playbook_id UUID REFERENCES playbooks(id) ON DELETE CASCADE,
    team TEXT NOT NULL CHECK (team IN ('counter', 'medicine', 'equipment', 'stretcher')),
    title TEXT NOT NULL,                         -- e.g. "Hold an ED bed"
    detail TEXT,                                 -- e.g. "ECG + defibrillator to bay 2"
    position INT NOT NULL CHECK (position BETWEEN 1 AND 4),
    sla_seconds INT NOT NULL,                    -- 60–180 seconds SLA
    backup_staff UUID REFERENCES staff(id) ON DELETE SET NULL,
    CONSTRAINT uq_playbook_task_pos UNIQUE (playbook_id, position)
);

CREATE INDEX IF NOT EXISTS idx_playbook_tasks_playbook ON playbook_tasks(playbook_id, position);
