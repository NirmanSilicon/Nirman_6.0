# GoldenHour: Database Architecture & Engine Specification
**Prepared by Member E (Data & Platform) for Member A (Technical Lead / Engine)**
**Conforms to Blueprint v1.2 & Handbook v2.0**

This document delivers the complete specification answering all 9 alignment requests from the Technical Lead.

---

### 1. Final Database Schema for All Engine Tables

The schema is divided into 11 timestamped migration files under `supabase/migrations/`:
1. `facilities`: Facility registry, coordinates, bed capacity (`ed_beds_total`, `ed_beds_free`), and capabilities array.
2. `staff`: Staff authentication profile (`user_id`), facility linkage, operational `role`, `team`, and `pin_hash`.
3. `playbooks`: Standard clinical emergency protocols (`cardiac`, `stroke`, `trauma`).
4. `playbook_tasks`: Protocol task templates with team assignment (`counter`, `medicine`, `equipment`, `stretcher`) and SLA.
5. `alerts`: Main emergency alert entity, tracking `temp_id`, `state`, timestamps, capability requirements, and expiry.
6. `alert_tasks`: Active task instances generated per alert, storing `sla_seconds`, `deadline_at`, `state`, `claimed_by`, and `escalated_at`.
7. `bed_holds`: Ephemeral 30-minute bed reservations, with partial unique index to prevent duplicate holds.
8. `records`: Minimum viable clinical record. Doctor writes diagnosis & notes; nurse reads only `safe_summary`.
9. `events`: Append-only immutable task history and audit trail (`trg_events_immutable` strictly blocks UPDATE/DELETE).
10. `cancellations`: Waste ledger recording reason and duration for every cancelled/diverted alert.
11. `notification_outbox`: Real-time notification queue for dispatching in-app chimes, wall banners, and SMS/push.

---

### 2. `task_status` Enum Values & Lifecycle States

* **`task_state` enum values**:
  * `'OPEN'`: Initial state when alert is generated.
  * `'CLAIMED'`: Claimed by an authenticated staff member.
  * `'DONE'`: Task action completed.
  * `'ESCALATED'`: SLA elapsed without claim (`escalated_at IS NOT NULL`).
* **`alert_state` enum values**:
  * `'DRAFT'` $\to$ `'SENT'` $\to$ `'ACKNOWLEDGED'` $\to$ `'CLAIMING'` $\to$ `'ALL_CLAIMED'` $\to$ `'ARRIVED'` $\to$ `'CLOSED'`.
  * Terminal edge states: `'CANCELLED'` (one-tap cancel), `'EXPIRED'` (ETA + 5 min no-show).

---

### 3. Table Relationships and Foreign Keys

* `facilities (1) ── (N) staff` (`facility_id REFERENCES facilities(id) ON DELETE CASCADE`)
* `facilities (1) ── (N) alerts` (`facility_id REFERENCES facilities(id) ON DELETE RESTRICT`)
* `facilities (1) ── (N) bed_holds` (`facility_id REFERENCES facilities(id) ON DELETE CASCADE`)
* `playbooks (1) ── (N) playbook_tasks` (`playbook_id REFERENCES playbooks(id) ON DELETE CASCADE`)
* `alerts (1) ── (N) alert_tasks` (`alert_id REFERENCES alerts(id) ON DELETE CASCADE`)
* `playbook_tasks (1) ── (N) alert_tasks` (`task_id REFERENCES playbook_tasks(id) ON DELETE SET NULL`)
* `staff (1) ── (N) alert_tasks` (`claimed_by REFERENCES staff(id) ON DELETE SET NULL`)
* `alerts (1) ── (1) records` (`alert_id REFERENCES alerts(id) ON DELETE CASCADE UNIQUE`)
* `alerts (1) ── (N) events` (`alert_id REFERENCES alerts(id) ON DELETE CASCADE`)
* `alerts (1) ── (N) notification_outbox` (`alert_id REFERENCES alerts(id) ON DELETE CASCADE`)

---

### 4. RLS Policies and Permissions Matrix

Located in `supabase/policies/all-policies.sql` and `supabase/policies/rls-matrix.md`:
* **`alerts`**:
  * Public/Patient: Can `INSERT` without auth; can `SELECT` and `UPDATE` (cancel) only own alert via `access_token` or `temp_id`.
  * Staff: Can `SELECT` and `UPDATE` alerts where `facility_id = current_user_facility()`.
* **`alert_tasks`**:
  * Staff: Can `SELECT` and `UPDATE` (claim) tasks belonging to their facility's alerts.
* **`records` vs `nurse_safe_view`**:
  * Base table `records` is restricted to `doctor` role and `service_role`.
  * `nurse_safe_view` is granted to the `nurse` role, omitting `diagnosis`, `private_notes`, and patient identity.
* **`events` & `cancellations`**:
  * Insert allowed for all authenticated and system operations.
  * Append-only: DB trigger blocks any `UPDATE` or `DELETE`.

---

### 5. `engine_owner` Role Setup & Alternatives

* **Recommended Production Pattern**: Supabase `service_role`.
  * The background engine tick endpoint (`/api/engine/tick`) and Edge Functions execute under the `service_role` key (bypassing RLS with full system privileges).
  * Route is guarded by `ENGINE_SHARED_SECRET` in request headers.
* **Database Function Alternative**: All 5 engine functions (`next_state`, `claim_task`, `escalate_overdue`, `cancel_alert`, `engine_tick`) are declared as `SECURITY DEFINER` in PostgreSQL, allowing API routes to invoke them reliably while maintaining row isolation.

---

### 6. How Task Deadlines & SLAs Are Stored

* Configured in `playbook_tasks`: `sla_seconds INT NOT NULL` (e.g., Stretcher: 90s, Medicine: 120s, Equipment: 120s, Bed: 180s).
* Stored on `alert_tasks`:
  * `sla_seconds INT NOT NULL`
  * `deadline_at TIMESTAMPTZ NOT NULL`: Calculated on alert creation as `created_at + (sla_seconds * INTERVAL '1 second')`.
  * `escalated_at TIMESTAMPTZ`: Set to `timezone('utc', now())` upon SLA breach.
  * `escalation_n INT DEFAULT 0`: Counter incremented when escalated.
* **Idempotency Guarantee**:
  `UPDATE alert_tasks SET state = 'ESCALATED', escalated_at = now() WHERE deadline_at < now() AND state = 'OPEN' AND escalated_at IS NULL;`
  Calling `engine_tick()` 10 times in one second produces exactly one escalation row.

---

### 7. Notification Outbox and Task History Table Structure

#### Task History & Audit Trail (`events` table):
```sql
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
    actor_id UUID,
    actor_role TEXT,
    action TEXT NOT NULL,       -- ALERT_CREATED, ACK, CLAIM, ESCALATE, CANCEL
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    at TIMESTAMPTZ DEFAULT timezone('utc', now())
);
```

#### Notification Outbox (`notification_outbox` table):
```sql
CREATE TABLE notification_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE NOT NULL,
    task_id UUID REFERENCES alert_tasks(id) ON DELETE CASCADE,
    recipient_role TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('in_app_chime', 'phone_push', 'supervisor_wall', 'sms')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    sent_at TIMESTAMPTZ
);
```

---

### 8. Generated Database Types

* Strongly-typed definitions generated and committed in:
  * `src/types/database.ts` (consumed by Next.js app)
  * `supabase/types/db.generated.ts` (consumed by Supabase scripts and tests)
* Provides full interfaces for all tables, row inserts, updates, views (`nurse_safe_view`, `ops_metrics_view`), and RPC functions (`next_state`, `claim_task`, `engine_tick`, `cancel_alert`).

---

### 9. Timeline for Sharing the Schema

* **Status**: Complete & Ready Now.
* **Target Delivery**: Delivered in Branch `e-platform` ahead of Block 1 deadline (T+0:20).
* **Next Action**: Submitted via Pull Request from `e-platform` into `main` for Member A review and merge.


---

# PR Review Verification & Hardening Report
**Addressed to Technical Lead (Member A / Bisu-1909a)**
**All 9 Review Verification Checks: Passed and Implemented**

### Check 1: `claim_task` Identity Verification via `auth.uid()`
* **Resolution**: Hardened in `supabase/migrations/20261120000011_11_engine_functions.sql` and `supabase/master_setup.sql`.
* **Logic**:
  1. When called from an authenticated client session, `claim_task` queries `staff WHERE user_id = auth.uid()`.
  2. If no active staff record matches `auth.uid()`, the RPC rejects immediately with error code `STAFF_NOT_FOUND`.
  3. If caller explicitly passed `p_staff_id`, the function asserts that `v_staff.id = p_staff_id`, preventing any caller from spoofing another staff member's claim (`FORBIDDEN`).
  4. Cross-hospital boundary check: Asserts `v_staff.facility_id = v_alert.facility_id`, blocking staff from Hospital B from claiming Hospital A's emergency tasks (`FACILITY_MISMATCH`).
  5. Atomic compare-and-set (`WHERE id = p_task_id AND state = 'OPEN'`) guarantees that concurrent claims result in exactly one winner and one `already_claimed` response.

---

### Check 2: `cancel_alert` Idempotency & Verified Bed Hold Release
* **Resolution**: Hardened in `supabase/migrations/20261120000011_11_engine_functions.sql` and `supabase/master_setup.sql`.
* **Logic**:
  1. **Idempotency Guard**: If an alert is already in state `CANCELLED`, repeated calls return `{"success": true, "already_cancelled": true}` immediately without modifying bed counts or creating duplicate cancellation rows.
  2. **Verified Bed Hold Release**: Rather than blindly incrementing `facilities.ed_beds_free`, the function uses a conditional CTE:
     ```sql
     WITH released AS (
         UPDATE bed_holds SET released_at = timezone('utc', now())
         WHERE alert_id = p_alert_id AND released_at IS NULL
         RETURNING facility_id
     )
     UPDATE facilities f
     SET ed_beds_free = LEAST(f.ed_beds_total, f.ed_beds_free + 1)
     FROM released r
     WHERE f.id = r.facility_id;
     ```
     `ed_beds_free` is ONLY incremented if an active hold (`released_at IS NULL`) was found and released.
  3. **Capacity Ceiling**: Capped using `LEAST(f.ed_beds_total, ...)`, mathematically preventing bed counts from exceeding physical capacity.
  4. **Authorization**: Patients must supply `p_access_token` matching `alerts.access_token`. Staff can only cancel alerts belonging to their own facility.

---

### Check 3: Strict Cross-Hospital RLS Policies
* **Resolution**: Defined in `supabase/policies/all-policies.sql` and `master_setup.sql`.
* **Logic**:
  * Added `auth_staff_facility_id()` and `auth_staff_role()` security definer functions reading directly from `staff WHERE user_id = auth.uid()`.
  * **Alerts & Tasks**: Staff can only view or update rows where `facility_id = auth_staff_facility_id()`.
  * **Bed Holds**: Bed hold queries and reservations strictly filtered by `facility_id = auth_staff_facility_id()`.
  * **Records**: Only staff with `auth_staff_role() = 'doctor'` within that exact facility can select or mutate clinical records. Nurses, stretchers, and counters are blocked at the table level and must read `nurse_safe_view`.

---

### Check 4: Grants & Permissions (Privileged Functions vs Normal Users)
* **Resolution**: Added explicit `REVOKE` and `GRANT` statements:
  * `engine_tick()` and `escalate_overdue()`: Execution strictly **REVOKED from `PUBLIC`, `anon`, and `authenticated`**. Granted exclusively to `service_role` and `postgres`.
  * `claim_task()`: Revoked from `PUBLIC` and `anon`. Allowed only for `authenticated` staff and `service_role`.
  * `cancel_alert()`: Allowed for `anon` (patient access token verification enforced inside function), `authenticated` staff (hospital match enforced), and `service_role`.

---

### Check 5: Engine RPCs vs Phase 2 Contract
* **Verification**: All 5 RPC signatures match the contract:
  1. `claim_task(p_task_id UUID, p_staff_id UUID DEFAULT NULL) RETURNS JSONB`
  2. `escalate_overdue() RETURNS TABLE(task_id UUID, alert_id UUID, team TEXT, title TEXT, escalation_n INT)`
  3. `cancel_alert(p_alert_id UUID, p_reason TEXT, p_access_token UUID) RETURNS JSONB`
  4. `next_state(p_alert_id UUID, p_action TEXT) RETURNS TEXT`
  5. `engine_tick() RETURNS JSONB`
* Transitions follow strict order: `DRAFT` $\to$ `SENT` $\to$ `ACKNOWLEDGED` $\to$ `CLAIMING` $\to$ `ALL_CLAIMED` $\to$ `ARRIVED` $\to$ `CLOSED`, with reversible `CANCELLED` and timeout `EXPIRED`.

---

### Check 6: Foreign Keys, Constraints, and Enums
* **Verification**:
  * All 7 enums (`alert_state`, `task_state`, `staff_role`, `team_type`, `cancel_reason`, `notification_channel`, `notification_status`) strictly validated.
  * All foreign keys configured with explicit cascade or restrict policies (`alerts.facility_id` has `ON DELETE RESTRICT` to protect hospital integrity).
  * Bed holds have deterministic partial unique index: `uq_active_bed_hold ON bed_holds(facility_id, bed_label) WHERE released_at IS NULL`.

---

### Check 7: Audit Log and Notification Outbox Reliability
* **Verification**:
  * Events recorded for all critical lifecycle moments: `ALERT_CREATED`, `ACK`, `CLAIM`, `ESCALATE`, `CANCEL`, `ALERT_EXPIRED`, `ARRIVED`, `CLOSED`.
  * `escalate_overdue()` uses `WHERE state = 'OPEN' AND escalated_at IS NULL` to ensure retried engine ticks never produce duplicate escalation events or duplicate notifications in `notification_outbox`.
  * Task claim and alert cancellation queue real-time outbox notifications (`in_app_chime`, `supervisor_wall`).

---

### Check 8: Synchronized TypeScript Types
* **Verification**:
  * Updated in `src/types/database.ts` and `supabase/types/db.generated.ts`.
  * Includes updated RPC parameter signatures (`p_staff_id?: string`, `p_access_token?: string`).

---

### Check 9: Safe Migration Sequence & Setup Instructions
* **Verification**:
  * Migrations 01 through 11 apply cleanly in strict numerical order on any blank PostgreSQL database.
  * `supabase/master_setup.sql` provides a single-file idempotent runner for the entire setup.
  * Background cron runner instructions documented below:
    * Background scheduler / Edge function calls `/rest/v1/rpc/engine_tick` using `SUPABASE_SERVICE_ROLE_KEY` every 10–30 seconds.

---

# Post-Merge SQL Security Audit Resolution (V2.0 Hardening)
**Addressed to Technical Lead (Member A / Bisu-1909a)**
**Date**: November 2026 | **Branch**: `e-platform`

### Architectural Decisions Confirmed

1. **Task-Level Contract vs Alert-Level Schema**:
   * **Decision**: We maintain the **task-level contract** requested by Member A (`next_task_state` / `next_state`), while preserving the alert-level progression (`next_alert_state`).
   * `claim_task(p_task_id UUID)`: Moves `OPEN` or `ESCALATED` task to `CLAIMED` via atomic compare-and-set, derives staff strictly from `auth.uid()`, logs audit events, sends chimes, and automatically checks if all tasks for the alert are claimed (auto-progressing the alert to `ALL_CLAIMED`).
   * `next_task_state(p_task_id UUID, p_action TEXT)`: Moves task between `CLAIMED` and `DONE`.
   * `next_alert_state(p_alert_id UUID, p_action TEXT)`: Transitions alert lifecycle (`ACKNOWLEDGE` -> `ARRIVED` -> `CLOSE`).
   * `next_state(p_task_id UUID, p_action TEXT)`: Polymorphic dispatcher. Whether Member A calls it with a `task_id` (task contract) or an `alert_id` (alert contract), the function automatically dispatches to the correct state machine without throwing type errors.

2. **`service_role` vs `engine_owner` Role**:
   * **Decision**: We natively utilize **Supabase `service_role`**.
   * Standard Supabase environments run API route handlers, Edge Functions, and cron tickers via the `SUPABASE_SERVICE_ROLE_KEY`. Creating a custom Postgres role adds operational overhead and connection-pooling complexity without security advantages.
   * Privileged engine functions (`engine_tick`, `escalate_overdue`) grant execute to `service_role, postgres`.
   * Table UPDATE policies on `alerts` and `alert_tasks` permit direct updates exclusively for `service_role`, blocking unauthorized client-side tampering.

---

### Audit Resolution Checklist (All 8 Points Implemented)

| # | Audit Requirement | Implementation Details |
|---|---|---|
| **1** | **Advisory Lock in `engine_tick`** | Added `pg_catalog.pg_try_advisory_xact_lock(424242)` to prevent overlapping concurrent cron ticks. Returns `{"success": false, "locked": true}` immediately if another transaction is running. |
| **2** | **Finalize `next_state`** | Implemented task-level `next_task_state(p_task_id, p_action)` and alert-level `next_alert_state(p_alert_id, p_action)`. Standardized `next_state(p_task_id, p_action)` to satisfy Member A's route handlers. |
| **3** | **Remove `p_staff_id` from `claim_task`** | Signature is strictly `claim_task(p_task_id UUID)`. Staff identity is extracted exclusively via `auth.uid()` (`SELECT * FROM staff WHERE user_id = auth.uid()`), eliminating any staff ID spoofing vector. |
| **4** | **Facility/Role Scope for `escalate_overdue`** | Updated signature to `escalate_overdue(p_facility_id UUID DEFAULT NULL)`. When called by authenticated staff, asserts role is `supervisor`/`doctor` and confines scope to caller's facility. `service_role` can run globally or scoped. |
| **5** | **Purge Old Duplicate Overloads** | Added explicit `DROP FUNCTION IF EXISTS ... CASCADE` before all function declarations in `master_setup.sql` and migration 11 to eliminate conflicting parameter overloads. |
| **6** | **Strict `SET search_path = ''`** | All `SECURITY DEFINER` functions explicitly set `search_path = ''` and qualify every schema object (`public.alerts`, `public.alert_tasks`, `public.staff`, `pg_catalog.now()`, etc.) to prevent search-path hijacking attacks. |
| **7** | **Function Ownership & Event RLS** | All functions explicitly executed with `ALTER FUNCTION ... OWNER TO postgres;`. Insert policies on `events`, `cancellations`, and `notification_outbox` allow system/authenticated inserts without RLS blocking. |
| **8** | **Restrict Direct Authenticated Updates** | Direct client `UPDATE` on `alerts` and `alert_tasks` is restricted to `auth.role() = 'service_role'`. All client state changes MUST pass through the validated RPCs (`claim_task`, `next_state`, `cancel_alert`). |

