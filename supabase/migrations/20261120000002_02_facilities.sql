-- Migration 02: Facilities table
-- GoldenHour Blueprint §7.3 / NIRMAN 2026

CREATE TABLE IF NOT EXISTS facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    area TEXT,
    phone TEXT,
    distance_min INT DEFAULT 8,                  -- precomputed for demo
    capabilities TEXT[] NOT NULL DEFAULT '{}',   -- ecg, defib, oxygen, ct, usg, blood, ot, icu, ventilator, etc.
    ed_beds_total INT DEFAULT 10 CHECK (ed_beds_total >= 0),
    ed_beds_free INT DEFAULT 5 CHECK (ed_beds_free >= 0),
    night_doctor BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_facilities_capabilities ON facilities USING gin(capabilities);
CREATE INDEX IF NOT EXISTS idx_facilities_active ON facilities(is_active);
