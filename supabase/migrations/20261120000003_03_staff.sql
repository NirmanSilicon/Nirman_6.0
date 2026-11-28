-- Migration 03: Staff table
-- GoldenHour Blueprint §7.3 / NIRMAN 2026

CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE,                         -- links to auth.users.id if using Supabase Auth
    facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN (
        'doctor', 'nurse', 'counter', 'medicine', 'equipment',
        'stretcher', 'supervisor', 'operator'
    )),
    team TEXT CHECK (team IN ('counter', 'medicine', 'equipment', 'stretcher') OR team IS NULL),
    pin_hash TEXT NOT NULL DEFAULT '1234',       -- PIN for quick demo login
    is_on_shift BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_staff_facility_role ON staff(facility_id, role);
CREATE INDEX IF NOT EXISTS idx_staff_pin ON staff(pin_hash);
