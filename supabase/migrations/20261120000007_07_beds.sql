-- Migration 07: Bed holds table
-- GoldenHour Blueprint §7.3 / NIRMAN 2026

CREATE TABLE IF NOT EXISTS bed_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
    facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
    bed_label TEXT,                              -- e.g. 'ED-3'
    held_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    held_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    released_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT timezone('utc', now()) + INTERVAL '30 minutes'
);

-- Partial unique index to prevent double-holding the same bed while active
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_bed_hold 
ON bed_holds(facility_id, bed_label) 
WHERE released_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bed_holds_alert ON bed_holds(alert_id);
