# Row-Level Security (RLS) Permissions Matrix
**GoldenHour Blueprint §7.4 / NIRMAN 2026**

| Table / View | Patient / Family (Anon / Token) | Staff (Target Facility) | Doctor (Target Facility) | Nurse (Target Facility) | Supervisor / Admin | Service Role (Engine Tick) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`facilities`** | `SELECT` (Public info only: name, area, distance, capabilities) | `SELECT` (includes `ed_beds_free`) | `SELECT` | `SELECT` | `ALL` | `ALL` |
| **`staff`** | None | `SELECT` (teammates) | `SELECT` | `SELECT` | `ALL` | `ALL` |
| **`playbooks` / `playbook_tasks`** | `SELECT` | `SELECT` | `SELECT` | `SELECT` | `ALL` | `ALL` |
| **`alerts`** | `INSERT` (new), `SELECT` & `UPDATE` (own alert via `access_token` or `temp_id`) | `SELECT`, `UPDATE` (own facility) | `ALL` (own facility) | `SELECT` (safe slice) | `ALL` (own facility) | `ALL` |
| **`alert_tasks`** | `SELECT` (readiness progress: `state`) | `SELECT`, `UPDATE` (`claim_task`) | `ALL` (own facility) | `SELECT`, `UPDATE` (medicine team) | `ALL` (own facility) | `ALL` |
| **`bed_holds`** | None | `SELECT` (counter) | `SELECT` | None | `ALL` | `ALL` |
| **`records`** | None | None | `ALL` (Doctor only) | `DENIED` at DB table level | `SELECT` | `ALL` |
| **`nurse_safe_view`** | None | None | `SELECT` | `SELECT` (safe summary: meds, allergies, vitals; NO private notes, NO diagnosis) | `SELECT` | `ALL` |
| **`events`** | `INSERT` | `INSERT` | `SELECT`, `INSERT` | `INSERT` | `SELECT`, `INSERT` | `ALL` (Insert-only for everyone; UPDATE/DELETE blocked) |
| **`cancellations`** | `INSERT` | `INSERT` | `SELECT`, `INSERT` | `INSERT` | `SELECT`, `INSERT` | `ALL` |
| **`notification_outbox`** | None | `SELECT` (own notifications) | `SELECT` | `SELECT` | `SELECT` | `ALL` (engine dispatcher) |
