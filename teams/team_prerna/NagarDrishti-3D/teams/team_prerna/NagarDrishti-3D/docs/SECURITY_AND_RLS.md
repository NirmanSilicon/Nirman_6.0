# Security, RBAC & Row Level Security (RLS) Design

## Defense-in-Depth Architecture
1. **Frontend (`frontend/`)**:
   - Holds ONLY `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_API_BASE_URL`.
   - Never contains `SUPABASE_SERVICE_ROLE_KEY` or admin credentials.
2. **Express Backend (`backend/`)**:
   - Verifies every user session via `supabaseAnon.auth.getUser(token)` and loads `profiles` (`role`, `account_status`).
   - Enforces `requireRole(...)` and `account_status === 'active'` before privileged operations.
   - Validates all request bodies with Zod schemas.
   - Validates file uploads by extension blocklist, MIME allowlist, size limit, and binary magic bytes (`JPEG`, `PNG`, `WEBP`, `PDF`, `CSV`), sanitizes filenames, computes SHA-256 hashes, and uploads to **private** Supabase Storage buckets.
   - Serves private files only via permission-checked 120-second signed URLs.
   - Applies Helmet security headers, strict CORS allowlisting, and Express rate limiting.
   - Records immutable `audit_logs` on sensitive actions.
3. **PostgreSQL Row Level Security (`database/migrations/003_rls_and_storage.sql`)**:
   - Enforces RLS on all 19 tables.
   - Trigger `prevent_profile_privilege_escalation` blocks direct non-service-role updates to `profiles.role`, `profiles.account_status`, `department_id`, or `contractor_id`.
   - Citizens can read/create only their own private complaints.
   - Contractors can read/update only complaints assigned to their `contractor_id`.

## Known Security & Verification Limitations
- GPS coordinates, device timestamps, and client photographs do not guarantee real-world authenticity; human officer inspection is mandatory.
- Full end-to-end penetration testing and live Supabase RLS cross-user verification must be run after you configure your Supabase project credentials in `.env`.
