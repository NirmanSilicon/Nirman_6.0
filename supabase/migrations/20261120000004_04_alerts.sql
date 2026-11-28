-- Migration 04: Alerts table
-- GoldenHour Blueprint §7.3 / NIRMAN 2026

CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    temp_id TEXT UNIQUE NOT NULL,                -- e.g. 'GH-4F7K' or 6-char public ID
    access_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE, -- family secret tracking token
    facility_id UUID REFERENCES facilities(id) ON DELETE RESTRICT,
    patient_name TEXT,
    patient_age INT,
    patient_sex TEXT,
    patient_phone TEXT,
    flags JSONB NOT NULL DEFAULT '{}'::jsonb,    -- the four lay answers
    capability_req TEXT[] NOT NULL DEFAULT '{}', -- e.g. [ecg, defib, cardiac_team, oxygen]
    playbook_key TEXT,                           -- 'cardiac', 'stroke', 'trauma'
    eta_minutes INT,
    state TEXT NOT NULL DEFAULT 'SENT' CHECK (state IN (
        'DRAFT', 'SENT', 'ACKNOWLEDGED', 'CLAIMING', 'ALL_CLAIMED',
        'ARRIVED', 'CLOSED', 'CANCELLED', 'EXPIRED'
    )),
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    acknowledged_at TIMESTAMPTZ,
    all_claimed_at TIMESTAMPTZ,
    arrived_at TIMESTAMPTZ,                      -- "Arriving always wins" freezes clock
    closed_at TIMESTAMPTZ,
    cancel_reason TEXT,
    created_by_operator BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ,
    client_request_id TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_alerts_facility_created ON alerts(facility_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_state ON alerts(state);
CREATE INDEX IF NOT EXISTS idx_alerts_temp_id ON alerts(temp_id);
CREATE INDEX IF NOT EXISTS idx_alerts_access_token ON alerts(access_token);
