-- Migration 08: Clinical Records table
-- GoldenHour Blueprint §7.3 / NIRMAN 2026

CREATE TABLE IF NOT EXISTS records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE UNIQUE,
    facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    private_notes TEXT,                          -- Doctor only: unreachable by nurse or family
    diagnosis TEXT,                              -- Doctor only: clinical diagnosis
    safe_summary JSONB NOT NULL DEFAULT '{}'::jsonb, -- What nurse sees: meds, allergies, vitals
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_records_alert ON records(alert_id);
CREATE INDEX IF NOT EXISTS idx_records_facility ON records(facility_id);
