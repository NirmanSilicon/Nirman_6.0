# JanVikas Implementation Plan

## Product goal

JanVikas makes a public infrastructure issue traceable from citizen report to verified resolution. The first release will demonstrate one complete path for road and streetlight complaints, with synthetic data for government, contractor and worker records.

## Delivery strategy

Build a reliable vertical slice first. Add automation only after the manual workflow is visible and testable. Every phase must leave the application runnable and demoable.

## Phase 0 — Foundation and safety

**Outcome:** A shared, safe project skeleton.

- Agree on the MVP scope: complaints, public map, department queue, assignment, completion evidence and feedback.
- Use synthetic Aadhaar-like IDs and sample faces only; never commit real personal or biometric data.
- Define roles: citizen, verifier, contractor and administrator.
- Define complaint and asset states: `reported`, `triaged`, `assigned`, `in_progress`, `submitted`, `verified`, `rejected`, `resolved`.
- Set up a monorepo with frontend, backend, database migrations, seed data and `.env.example`.
- Add formatting, linting, validation and a basic CI check.

## Phase 1 — Citizen reporting MVP

**Outcome:** A citizen can create and track a complaint, including while offline.

- Mobile-friendly complaint form: category, description, photo/video, location and optional contact.
- Capture GPS, device time and upload time separately.
- Store drafts locally and sync them when connectivity returns.
- Generate a complaint ID and show a status timeline.
- Compress media before upload and validate file type and size.

## Phase 2 — Public map and triage

**Outcome:** Citizens and staff can see issues and organize incoming work.

- Display approved complaints on a map with privacy-safe location precision.
- Filter by category, status, date and area.
- Add a verifier queue with evidence preview and approve/reject/request-information actions.
- Add baseline duplicate detection using distance, category and time; keep AI suggestions reviewable by a human.

## Phase 3 — Assignment and small-repair workflow

**Outcome:** A verified complaint can be assigned and completed end to end.

- Create departments and registered service providers.
- Assign a complaint, set priority and due date, and notify the assignee.
- Contractor uploads completion video, photographs, notes and invoice.
- Extract representative frames from uploaded video and show them beside the original evidence.
- Verifier accepts, rejects or requests rework; citizen sees the result and can provide feedback.

## Phase 4 — AI assistance

**Outcome:** AI reduces triage effort without making final decisions.

- Classify complaint category from text and images.
- Rank likely duplicate complaints.
- Detect whether uploaded evidence appears to match the reported issue and location.
- Store model name, confidence and evidence for every suggestion.
- Require human confirmation for classification, duplicate merging and resolution.

## Phase 5 — Major-project monitoring

**Outcome:** A major infrastructure project can be tracked separately from a small repair.

- Create project records linked to one or more assets and complaints.
- Track milestones, technical measurements, estimated cost, expenditure, invoices and payment status.
- Add contractor progress updates with site media and verifier approval.
- Link project work to worker attendance records using synthetic worker profiles for the prototype.
- Add anomaly flags for impossible location, duplicate attendance or inconsistent timestamps; do not auto-reject.

## Phase 6 — Infrastructure registry and analytics

**Outcome:** The system explains recurring problems and spending patterns.

- Maintain asset history for roads, drains, streetlights and projects.
- Link complaints, repairs, contractors, invoices, payments and feedback to each asset.
- Add dashboards for resolution time, repeat complaints, unresolved issues and expenditure by area/category.
- Export an audit report for a selected asset or project.

## Phase 7 — Hardening and pilot readiness

**Outcome:** A credible pilot build.

- Add role-based access control, audit logs, rate limits, backups and encrypted storage.
- Define retention and deletion policies for media, identity data and face images.
- Test offline sync conflicts, duplicate submissions, poor GPS, large videos and rejected evidence.
- Run accessibility, mobile, security and performance checks.
- Prepare deployment, monitoring, demo seed data and an operator guide.

## Recommended MVP demo

The demo should follow one road-pothole complaint and one streetlight repair. It should show the citizen app, public map, verifier queue, assignment, contractor evidence submission, frame extraction, approval, feedback and asset history. AI should be presented as an explainable recommendation layer, while the workflow remains usable if AI is unavailable.

## Suggested technical shape

- **Frontend:** React/Next.js responsive PWA with IndexedDB for offline drafts and a map library.
- **Backend:** FastAPI service with REST endpoints, background jobs for media processing and role-based authorization.
- **Data:** PostgreSQL with geospatial support; object storage for media; Redis or a database-backed queue for jobs.
- **Media/AI:** FFmpeg for frame extraction; pluggable vision and text models behind an `AI service` interface.
- **Deployment:** One hosted frontend, API, database and object-storage bucket with environment-based configuration.

## First implementation sprint

1. Create the application skeleton and local development instructions.
2. Add the complaint, asset, user-role and evidence data models.
3. Implement complaint creation with photo upload and GPS metadata.
4. Add offline draft persistence and synchronization.
5. Seed sample complaints and build the verifier queue.
6. Add the public map and complaint status timeline.
7. Demonstrate the complete reported-to-verified path before adding advanced AI.

