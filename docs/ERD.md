# GoldenHour: Database Relationship Diagram (ERD)

This document specifies the database relationships, foreign keys, cardinality, and constraints for **GoldenHour** (`NIRMAN 2026`).

---

## 1. Mermaid Entity-Relationship Diagram

```mermaid
erDiagram
    HOSPITALS ||--o{ HOSPITAL_CAPABILITIES : "declares capabilities"
    HOSPITALS ||--|| HOSPITAL_RESOURCES : "tracks bed capacity"
    HOSPITALS ||--o{ STAFF_MEMBERS : "employs staff"
    HOSPITALS ||--o{ TASK_TEMPLATES : "customizes preparation tasks"
    HOSPITALS ||--o{ ALERTS : "receives incoming emergencies"
    
    ALERTS ||--|{ ALERT_TASKS : "spawns exactly 4 preparation tasks"
    ALERTS ||--o{ AUDIT_LOGS : "generates append-only history"
    
    STAFF_MEMBERS ||--o{ ALERT_TASKS : "claims and owns task"
    STAFF_MEMBERS ||--o{ ALERTS : "closes arrival record"

    HOSPITALS {
        uuid id PK
        varchar code UK "CAPITAL_HOSP_BBS"
        varchar name "Capital Hospital, Bhubaneswar"
        varchar short_name
        numeric latitude
        numeric longitude
        varchar phone_number
        varchar emergency_phone
        text entrance_notes
        boolean is_active
        timestamptz created_at
    }

    HOSPITAL_CAPABILITIES {
        uuid id PK
        uuid hospital_id FK
        emergency_category category "chest_pain, stroke, bleeding, breathlessness"
        boolean is_available
        boolean ct_scanner_active
        boolean cath_lab_active
        boolean blood_bank_active
        boolean ventilator_active
        timestamptz last_confirmed_at
        varchar confirmed_by
    }

    HOSPITAL_RESOURCES {
        uuid id PK
        uuid hospital_id FK,UK
        integer total_emergency_beds
        integer available_emergency_beds
        integer held_beds "Ephemeral 30m reservation"
        integer active_teams_count
        timestamptz last_updated_at
        varchar updated_by
    }

    STAFF_MEMBERS {
        uuid id PK
        uuid hospital_id FK
        varchar name
        task_role role "doctor, nurse, pharmacy, equipment, transport, counter, in_charge"
        varchar pin_hash "4-digit demo PIN hash"
        boolean is_duty_lead
        boolean is_active
    }

    TASK_TEMPLATES {
        uuid id PK
        uuid hospital_id FK "Nullable (system default if null)"
        emergency_category category
        integer task_sequence "1 to 4"
        task_role role_required
        varchar title_en
        varchar title_or "Odia title"
        text instructions_en
        text instructions_or
    }

    ALERTS {
        uuid id PK
        varchar alert_code UK "6-char code e.g. A3F2C1"
        uuid access_token UK "Family status URL bearer token"
        uuid hospital_id FK
        emergency_category category
        alert_status status "created, acknowledged, ready, arrived, closed, diverted, cancelled"
        numeric origin_latitude
        numeric origin_longitude
        varchar origin_area_name
        numeric estimated_distance_km
        integer estimated_drive_minutes
        boolean bed_held
        timestamptz bed_held_expires_at
        refusal_reason diversion_reason
        timestamptz created_at "Server clock origin"
        timestamptz acknowledged_at
        timestamptz all_tasks_claimed_at
        timestamptz arrived_at "Arriving always wins"
        timestamptz closed_at
        uuid closed_by FK
        text closure_summary
    }

    ALERT_TASKS {
        uuid id PK
        uuid alert_id FK
        integer task_sequence "1 to 4"
        task_role role_required
        varchar title_en
        varchar title_or
        task_status status "unclaimed, claimed, completed"
        uuid claimed_by FK
        varchar claimed_by_name
        timestamptz claimed_at
        escalation_level escalation_level "normal, amber, red"
        timestamptz amber_escalated_at "Fired at 90s"
        timestamptz red_escalated_at "Fired at 180s"
    }

    AUDIT_LOGS {
        bigserial id PK
        uuid alert_id FK
        varchar action "ALERT_CREATED, TASK_CLAIMED, PATIENT_ARRIVED, etc."
        varchar actor_type "family, staff, system, admin"
        varchar actor_id
        varchar actor_role
        jsonb details
        timestamptz created_at "Append-only timestamp"
    }
```

---

## 2. Table Relationships & Cardinality

| Parent Table | Child Table | Cardinality | Cascade Action | Reason |
| :--- | :--- | :--- | :--- | :--- |
| `hospitals` | `hospital_capabilities` | 1 to Many | `ON DELETE CASCADE` | Hospital manages up to 4 red-flag emergency capability records. |
| `hospitals` | `hospital_resources` | 1 to 1 | `ON DELETE CASCADE` | Exactly one capacity record per hospital (beds, held beds, teams). |
| `hospitals` | `staff_members` | 1 to Many | `ON DELETE CASCADE` | Staff members belong strictly to their hospital account. |
| `hospitals` | `task_templates` | 1 to Many | `ON DELETE CASCADE` | Optional customized task descriptions (4 tasks per category). |
| `hospitals` | `alerts` | 1 to Many | `ON DELETE RESTRICT` | Alerts are matched and dispatched to a selected hospital. |
| `alerts` | `alert_tasks` | 1 to 4 | `ON DELETE CASCADE` | Each alert automatically spawns exactly 4 preparation tasks. |
| `alerts` | `audit_logs` | 1 to Many | `ON DELETE CASCADE` | All actions, state changes, and escalations generate immutable audit entries. |
| `staff_members` | `alert_tasks` | 1 to Many | `ON DELETE SET NULL` | When a task is claimed, staff member's ID and name are recorded. |

---

## 3. Strict Database Constraints

1. **Exactly 4 Tasks per Alert**:
   * `alert_tasks` enforces `CHECK (task_sequence BETWEEN 1 AND 4)`.
   * Composite unique key `UNIQUE (alert_id, task_sequence)` prevents duplicates or omissions.
2. **Short 6-Character Alert ID**:
   * `alerts.alert_code` is a 6-character unique constraint (`UNIQUE NOT NULL`).
   * Collision-free generator (`generate_unique_alert_code()`) selects characters from a safe alphabet omitting ambiguous letters (`I`, `O`, `0`, `1`).
3. **Multi-Tenant Hospital Isolation**:
   * Row-Level Security (RLS) ensures staff from Hospital A cannot view or manipulate Hospital B's incoming alerts or escalations.
4. **Append-Only Audit Guarantee**:
   * PostgreSQL trigger `prevent_audit_log_modification()` strictly blocks any `UPDATE` or `DELETE` on `audit_logs`.
