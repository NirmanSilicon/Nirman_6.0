-- ========================================================
-- GoldenHour — Database Schema Migration 02: Core Tables
-- Aligned with PRD Section 14 (Database Requirements)
-- ========================================================

-- 1. Hospitals Registry
CREATE TABLE IF NOT EXISTS hospitals (
    hospital_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    hospital_name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    address TEXT NOT NULL,
    district TEXT NOT NULL,
    landmark TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    emergency_phone TEXT NOT NULL,
    level TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'accepting' CHECK (status IN ('accepting', 'limited', 'divert')),
    status_reason TEXT,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Hospital Availability & Capabilities
CREATE TABLE IF NOT EXISTS hospital_availability (
    availability_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES hospitals(hospital_id) ON DELETE CASCADE,
    emergency_beds_available BOOLEAN NOT NULL DEFAULT true,
    icu_beds_available BOOLEAN NOT NULL DEFAULT true,
    ventilators_available BOOLEAN NOT NULL DEFAULT true,
    oxygen_support_available BOOLEAN NOT NULL DEFAULT true,
    blood_bank_available BOOLEAN NOT NULL DEFAULT true,
    cardiac_cath_lab_available BOOLEAN NOT NULL DEFAULT true,
    stroke_ct_unit_available BOOLEAN NOT NULL DEFAULT true,
    trauma_bay_available BOOLEAN NOT NULL DEFAULT true,
    supported_categories TEXT[] NOT NULL DEFAULT '{"Chest Pain", "Stroke Symptoms", "Serious Bleeding", "Severe Breathing", "Not Sure / Other Emergency"}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Emergency Requests (Family / Inbound Dispatch)
CREATE TABLE IF NOT EXISTS emergency_requests (
    request_id TEXT PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('Chest Pain', 'Stroke Symptoms', 'Serious Bleeding', 'Severe Breathing', 'Not Sure / Other Emergency')),
    custom_description TEXT,
    user_location TEXT NOT NULL,
    selected_hospital_id UUID NOT NULL REFERENCES hospitals(hospital_id),
    request_status TEXT NOT NULL DEFAULT 'CREATED' CHECK (request_status IN ('CREATED', 'NOTIFIED', 'HOSPITAL_PREPARING', 'READY_FOR_ARRIVAL', 'ARRIVED', 'COMPLETED', 'REJECTED', 'CANCELLED', 'ESCALATED')),
    eta_minutes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    escalated_at TIMESTAMPTZ,
    arrived_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    rejection_reason TEXT
);

-- 4. Preparation Tasks (Configurable protocols per inbound alert)
CREATE TABLE IF NOT EXISTS preparation_tasks (
    task_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id TEXT NOT NULL REFERENCES emergency_requests(request_id) ON DELETE CASCADE,
    task_description TEXT NOT NULL,
    assigned_role TEXT NOT NULL,
    task_status TEXT NOT NULL DEFAULT 'Pending' CHECK (task_status IN ('Pending', 'Claimed', 'Completed')),
    claimed_by TEXT,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Audit Log (Append-only)
CREATE TABLE IF NOT EXISTS request_audit_log (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id TEXT NOT NULL REFERENCES emergency_requests(request_id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_emergency_requests_status ON emergency_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_hospital ON emergency_requests(selected_hospital_id);
CREATE INDEX IF NOT EXISTS idx_preparation_tasks_request ON preparation_tasks(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_request ON request_audit_log(request_id);
