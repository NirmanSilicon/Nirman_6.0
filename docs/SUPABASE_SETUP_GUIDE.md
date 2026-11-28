# Step-by-Step Supabase Setup Guide for GoldenHour

This guide walks you through setting up Supabase for **GoldenHour** (`NIRMAN 2026`), applying the database schema, enabling Realtime updates for hospital screens, applying seed data, and testing the system.

---

## 1. Create Your Supabase Project

1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New Project**.
3. Choose an organization and set:
   * **Name**: `golden-hour` (or your preferred name)
   * **Database Password**: Choose a strong password and save it securely.
   * **Region**: Select **India (Mumbai) - ap-south-1** for lowest latency in Odisha.
4. Click **Create new project** and wait ~1-2 minutes for provisioning.

---

## 2. Apply Migrations in the Supabase SQL Editor

In your Supabase project dashboard, navigate to **SQL Editor** in the left sidebar. Run the migration scripts in the exact sequence below:

### Step 2.1: Run Initial Schema
1. Open [20261122000001_initial_schema.sql](file:///c:/Users/micro/Documents/golden-hour/supabase/migrations/20261122000001_initial_schema.sql).
2. Copy all contents, paste into the SQL Editor, and click **Run** (or `Ctrl+Enter`).
3. *Expected output*: `Success. No rows returned.` (Enums, tables, and indexes created).

### Step 2.2: Run Functions, Stored Procedures & Triggers
1. Open [20261122000002_functions_and_triggers.sql](file:///c:/Users/micro/Documents/golden-hour/supabase/migrations/20261122000002_functions_and_triggers.sql).
2. Copy all contents, paste into the SQL Editor, and click **Run**.
3. *Expected output*: Functions (`claim_task`, `generate_unique_alert_code`, `evaluate_alert_escalations`), triggers, and the dynamic view `v_active_alerts_escalation` are compiled.

### Step 2.3: Run Row Level Security (RLS) Policies
1. Open [20261122000003_row_level_security.sql](file:///c:/Users/micro/Documents/golden-hour/supabase/migrations/20261122000003_row_level_security.sql).
2. Copy all contents, paste into the SQL Editor, and click **Run**.
3. *Expected output*: RLS enabled across all 8 tables with role-scoped isolation policies.

### Step 2.4: Seed Initial Pilot Data (Bhubaneswar & Cuttack)
1. Open [seed.sql](file:///c:/Users/micro/Documents/golden-hour/supabase/seed.sql).
2. Copy all contents, paste into the SQL Editor, and click **Run**.
3. *Expected output*: Capital Hospital, AIIMS, SCB, and SUM Ultimate inserted with live capabilities, 4-task templates in English and Odia, staff PINs, and 4 test alerts in varying operational states.

---

## 3. Enable Supabase Realtime Replication

GoldenHour's hospital Ops Wall requires $< 2$s updates when a family raises an alert or a staff member claims a task.

1. In the Supabase Dashboard, go to **Database** $\to$ **Replication** (or **Project Settings** $\to$ **API** $\to$ **Realtime**).
2. Find the **Source** section and click on **`supabase_realtime`** publication.
3. Toggle the switches to **ON** for the following tables:
   * ✅ **`alerts`** (Pushes new arrivals, cancellations, and status changes)
   * ✅ **`alert_tasks`** (Pushes instant task claims and amber/red escalations)
   * ✅ **`hospital_resources`** (Pushes live bed hold updates)
4. Click **Save**.

Alternatively, you can run this single SQL snippet in the SQL Editor:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE alert_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE hospital_resources;
```

---

## 4. Set Up Environment Variables

Create a file named `.env.local` in `c:\Users\micro\Documents\golden-hour`:

```env
# Supabase Public API (Accessible by client screens)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Service Role Key (Server-only operations, if needed)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

To find these credentials:
1. Go to **Project Settings** (gear icon) $\to$ **API**.
2. Copy the **Project URL**.
3. Copy the **anon / public** key.

---

## 5. Verify the Implementation with Test Queries

Run these verification tests directly in the Supabase SQL Editor:

### Test 1: Check Dynamic Escalation View on the 4 Demo Alerts
```sql
SELECT 
    alert_code,
    hospital_name,
    category,
    alert_status,
    elapsed_seconds,
    claimed_tasks_count || ' of ' || total_tasks AS progress,
    visual_status,
    display_badge
FROM v_active_alerts_escalation;
```
*You should see:*
* `A3F2C1` showing `3 of 4 TAKEN` (Normal).
* `B71D09` showing `AMBER: UNCLAIMED` (elapsed > 90s).
* `C90E44` showing `ALL TAKEN` or `READY`.
* `D18A20` showing `RED: CRITICAL` (elapsed > 180s).

### Test 2: Test Atomic Task Claiming (Nurse Claims Task)
```sql
-- Replace with an actual unclaimed task_id from alert_tasks
DO $$
DECLARE
    v_task_id UUID;
    v_staff_id UUID := 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; -- Nurse Sneha Rout
    v_result JSONB;
BEGIN
    SELECT id INTO v_task_id FROM alert_tasks WHERE status = 'unclaimed' LIMIT 1;
    
    -- Attempt atomic claim
    v_result := claim_task(v_task_id, v_staff_id);
    RAISE NOTICE 'Claim Result: %', v_result;
END $$;
```

### Test 3: Verify Append-Only Audit Trail Protection
```sql
-- Try to illegally update or delete an audit log row:
UPDATE audit_logs SET action = 'TAMPERED' WHERE id = 1;
-- RESULT: Must FAIL with error:
-- "Audit log entries are immutable and cannot be updated or deleted. (GoldenHour Rule #5)"
```

### Test 4: Verify "Arriving Always Wins"
```sql
-- When patient arrives, status update to 'arrived' freezes clock and releases bed
UPDATE alerts 
SET status = 'arrived' 
WHERE alert_code = 'A3F2C1';

-- Check the audit log for automatic entry
SELECT * FROM audit_logs WHERE alert_id = 'e1111111-1111-1111-1111-111111111111' ORDER BY id DESC LIMIT 2;
```

---

## 6. TypeScript Client Integration Quickstart

In your frontend application (Next.js / Vite / React), you can now use strongly-typed queries using [types/database.ts](file:///c:/Users/micro/Documents/golden-hour/types/database.ts):

```typescript
import { createClient } from '@supabase/supabase-js'
import { Database } from './types/database'

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Example: Claim a preparation task atomically
export async function claimPreparationTask(taskId: string, staffId: string) {
  const { data, error } = await supabase.rpc('claim_task', {
    p_task_id: taskId,
    p_staff_id: staffId
  })
  
  if (error) throw error
  return data // Contains { success: boolean, already_claimed?: boolean, task?: ... }
}

// Example: Listen to live Ops Wall updates
export function subscribeToOpsWall(hospitalId: string, onUpdate: () => void) {
  return supabase
    .channel('ops-wall-live')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'alerts', filter: `hospital_id=eq.${hospitalId}` },
      onUpdate
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'alert_tasks' },
      onUpdate
    )
    .subscribe()
}
```
