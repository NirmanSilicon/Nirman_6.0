-- Migration 01: Extensions and Enums
-- GoldenHour Blueprint v1.2 / NIRMAN 2026

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Alert lifecycle states
DO $$ BEGIN
    CREATE TYPE alert_state AS ENUM (
        'DRAFT',
        'SENT',
        'ACKNOWLEDGED',
        'CLAIMING',
        'ALL_CLAIMED',
        'ARRIVED',
        'CLOSED',
        'CANCELLED',
        'EXPIRED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Task instance states
DO $$ BEGIN
    CREATE TYPE task_state AS ENUM (
        'OPEN',
        'CLAIMED',
        'DONE',
        'ESCALATED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Hospital staff operational roles (The 7 hospital roles + operator)
DO $$ BEGIN
    CREATE TYPE staff_role AS ENUM (
        'doctor',
        'nurse',
        'counter',
        'medicine',
        'equipment',
        'stretcher',
        'supervisor',
        'operator'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- The 4 preparation hospital teams
DO $$ BEGIN
    CREATE TYPE team_type AS ENUM (
        'counter',
        'medicine',
        'equipment',
        'stretcher'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Cancellation reasons for audit & waste ledger
DO $$ BEGIN
    CREATE TYPE cancel_reason_enum AS ENUM (
        'changed_hospital',
        'not_coming',
        'duplicate',
        'no_arrival',
        'other'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Notification channel and status for outbox
DO $$ BEGIN
    CREATE TYPE notification_channel AS ENUM (
        'in_app_chime',
        'phone_push',
        'supervisor_wall',
        'sms'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_status AS ENUM (
        'PENDING',
        'SENT',
        'FAILED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
