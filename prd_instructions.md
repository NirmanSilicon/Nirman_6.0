Version: 1.0
Project: GoldenHour
Document Type: Technical Blueprint, Repository Structure & Implementation Instructions
Based on: GoldenHour PRD v1.0 and Tools & Responsibilities v1.2
Architecture: Next.js + TypeScript + Supabase + PostgreSQL
Deployment: Vercel
Audience: Developers, AI coding assistants, technical leads, project members and reviewers.

IMPORTANT — READ BEFORE DEVELOPMENT
This document defines the approved technical architecture for GoldenHour.
The structure and instruction style follow a general full-stack project blueprint, but the technology stack is exclusively based on GoldenHour's own technical documents.
Non-negotiable technology rules
Use Next.js App Router for the application.
Use TypeScript for application code.
Use Tailwind CSS for styling and design tokens.
Use Supabase as the primary backend platform.
Use PostgreSQL and SQL for database design, matching rules, task state transitions and escalation logic.
Use Supabase Auth for hospital staff authentication.
Use Supabase Realtime for live emergency updates.
Use Vercel for application deployment.
Use GitHub for source control, pull requests and code reviews.
Use GitHub Actions for the agreed CI checks.
Use Python and pandas for data validation and pilot reporting.
Use AWS S3, IAM and CloudWatch for the designated backup and operational infrastructure.
Use Antigravity and Kilo Code as AI-assisted development tools, not as runtime components.
Technologies that must NOT be introduced
The following are not part of the approved GoldenHour build:
Express.js
MongoDB
MongoDB Atlas
Mongoose
Firebase / Firestore
Java / Spring Boot
Separate Node.js backend
Socket.IO
Docker as a required development or deployment layer
Third-party AI APIs for clinical or routing decisions
OCR APIs
SMS gateways
Separate mapping APIs unless explicitly approved in a future architecture revision
Important: Do not create a second backend using Express or another framework. Next.js route handlers should remain thin API entry points, while PostgreSQL functions and Supabase own the important data and workflow rules.
The database is the source of truth for emergency request state, task claims, deadlines and escalations.

1. TECHNOLOGY STACK
1.1 Approved stack
Layer
Technology
Responsibility
Application Framework
Next.js App Router
Family, hospital, operator and public interfaces
Programming Language
TypeScript
Application logic and type safety
Styling
Tailwind CSS
Responsive layouts, design tokens and UI consistency
UI Components
React components
Reusable interface elements
Backend / Platform
Supabase
Database, authentication, security and realtime
Database
PostgreSQL
Persistent application data
Database Logic
SQL / PLpgSQL
Matching, task claims, state transitions and escalation
Authentication
Supabase Auth
Hospital staff sessions
Authorization
Supabase Row Level Security
Access restrictions at database level
Live Updates
Supabase Realtime
Incoming alerts and status changes
API Layer
Next.js Route Handlers
Thin server-side endpoints
Deployment
Vercel
Application hosting, previews and production releases
Version Control
Git + GitHub
Branching, pull requests and reviews
CI
GitHub Actions
Automated checks
Data Validation
Python
Duplicate alerts, clock drift and missing capability checks
Analytics
pandas
Pilot metrics and exported data analysis
Backup
pg_dump + AWS S3
Database export and backup storage
Cloud Operations
AWS IAM + CloudWatch + Budgets
Access control, monitoring and cost management
Database Management
Supabase CLI + psql
Migrations, SQL execution and type generation
AI Development
Antigravity + Kilo Code
Assisted coding, scaffolding and debugging
Documentation / Presentation
Markdown + Canva
Project documentation and presentation

1.2 Technology responsibilities
Next.js
Use Next.js App Router for:
Family emergency request flow.
Hospital dashboard.
Operator interface.
Public landing page.
Hospital administration pages.
API route handlers.
TypeScript
Use TypeScript for:
UI components.
Application-level business logic.
API request and response types.
Supabase client integration.
Realtime event handling.
Matching result presentation.
Form interactions.
Keep TypeScript thin around the database engine. Do not duplicate the PostgreSQL state machine in TypeScript.
Supabase
Supabase is the central backend platform.
Use it for:
PostgreSQL database.
Hospital staff authentication.
Row Level Security.
Realtime subscriptions.
Database migrations.
Database-generated types.
Database views.
Secure data access.
PostgreSQL / SQL
All important workflow rules must be implemented in the database.
This includes:
Emergency request state.
Preparation task state.
Task ownership.
Task claim race handling.
Escalation deadlines.
Exactly-once escalation.
Cancellation.
Arrival and closure.
Hospital matching.
Data access restrictions.
Vercel
Use Vercel for:
Production deployment.
Preview deployments.
Environment variable configuration.
Release management.
Live application URL.
Python and pandas
Use Python for validation and analysis, not as a replacement application backend.
Use pandas to analyse exported pilot records and calculate the agreed operational metrics.
AWS
AWS is used for the designated operational support functions:
S3: Store approved database backups and exports.
IAM: Restrict access to AWS resources.
CloudWatch: Monitor configured operational events and backup activity.
Budgets: Monitor cloud expenditure.
Do not introduce an additional AWS-hosted application backend.
1.3 Version safety
Do not hardcode dependency versions from this document.
Before adding or updating a dependency:
Check the official package documentation.
Verify compatibility with the current Next.js version.
Check security advisories.
Use the latest suitable stable release.
Commit the lockfile.
Run the available security and build checks.
Never upgrade major dependencies automatically during an unrelated feature task.

2. REPOSITORY STRUCTURE
2.1 Recommended project structure
The repository should be organised by application responsibility and GoldenHour team ownership.
GoldenHour/
│
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── loading.tsx
│   ├── error.tsx
│   ├── not-found.tsx
│   │
│   ├── (public)/
│   │   └── page.tsx
│   │
│   ├── (patient)/
│   │   └── start/
│   │       ├── page.tsx
│   │       ├── match/
│   │       │   └── page.tsx
│   │       ├── eta/
│   │       │   └── page.tsx
│   │       └── status/
│   │           └── [id]/
│   │               └── page.tsx
│   │
│   ├── (hospital)/
│   │   └── hospital/
│   │       ├── inbox/
│   │       │   └── page.tsx
│   │       ├── alert/
│   │       │   └── [id]/
│   │       │       └── page.tsx
│   │       ├── counter/
│   │       │   └── page.tsx
│   │       └── record/
│   │           └── [id]/
│   │               └── page.tsx
│   │
│   ├── (operator)/
│   │   └── operator/
│   │       ├── page.tsx
│   │       └── requests/
│   │           └── page.tsx
│   │
│   ├── (admin)/
│   │   └── admin/
│   │       ├── page.tsx
│   │       ├── hospitals/
│   │       │   └── page.tsx
│   │       ├── capabilities/
│   │       │   └── page.tsx
│   │       └── availability/
│   │           └── page.tsx
│   │
│   └── api/
│       ├── alerts/
│       │   └── route.ts
│       ├── claims/
│       │   └── route.ts
│       └── engine/
│           └── tick/
│               └── route.ts
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Modal.tsx
│   │   ├── StatusIndicator.tsx
│   │   └── LoadingState.tsx
│   │
│   ├── hospital/
│   │   ├── EmergencyCard.tsx
│   │   ├── IncomingQueue.tsx
│   │   ├── PreparationTask.tsx
│   │   ├── EscalationTimer.tsx
│   │   ├── TaskProgress.tsx
│   │   └── RecentCases.tsx
│   │
│   ├── patient/
│   │   ├── EmergencyCategory.tsx
│   │   ├── LocationSelector.tsx
│   │   ├── HospitalCard.tsx
│   │   ├── RequestConfirmation.tsx
│   │   └── RequestTimeline.tsx
│   │
│   └── admin/
│       ├── HospitalProfileForm.tsx
│       ├── CapabilityEditor.tsx
│       └── AvailabilityEditor.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   ├── middleware.ts
│   │   └── types.ts
│   │
│   ├── auth/
│   │   ├── session.ts
│   │   └── permissions.ts
│   │
│   ├── matching/
│   │   ├── match.ts
│   │   └── eta.ts
│   │
│   ├── engine/
│   │   ├── types.ts
│   │   └── call-engine.ts
│   │
│   ├── urls/
│   │   └── app-routes.ts
│   │
│   └── utils/
│       ├── format-time.ts
│       ├── format-distance.ts
│       └── request-id.ts
│
├── content/
│   ├── playbooks/
│   ├── questions/
│   └── labels/
│
├── lib/
│   └── i18n/
│       └── strings/
│           ├── en.ts
│           ├── od.ts
│           └── hi.ts
│
├── supabase/
│   ├── config.toml
│   │
│   ├── migrations/
│   │   ├── 01_extensions.sql
│   │   ├── 02_core_tables.sql
│   │   ├── 03_relationships_indexes.sql
│   │   ├── 04_constraints.sql
│   │   ├── 05_rls_policies.sql
│   │   ├── 06_views.sql
│   │   ├── 07_seed_functions.sql
│   │   ├── 08_realtime.sql
│   │   ├── 09_reporting.sql
│   │   └── 10_engine_functions.sql
│   │
│   ├── policies/
│   │   ├── hospital-access.rls.sql
│   │   └── rls-matrix.md
│   │
│   ├── views/
│   │   ├── nurse-safe-view.sql
│   │   └── ops-metrics-view.sql
│   │
│   ├── seed/
│   │   ├── 00_hospitals.sql
│   │   ├── 01_capabilities.sql
│   │   ├── 02_availability.sql
│   │   ├── 03_staff.sql
│   │   └── 04_demo_alerts.sql
│   │
│   ├── sql/
│   │   ├── matching.sql
│   │   ├── reporting.sql
│   │   └── engine-tests.sql
│   │
│   └── types/
│       └── db.generated.ts
│
├── scripts/
│   ├── validation/
│   │   ├── check-duplicate-alerts.py
│   │   ├── check-clock-drift.py
│   │   └── check-capability-flags.py
│   │
│   ├── analytics/
│   │   └── pilot-metrics.py
│   │
│   ├── backup.sh
│   ├── restore.sh
│   ├── reset-demo.sql
│   └── aws/
│       ├── iam-policy.json
│       └── backup-upload.sh
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── database/
│   ├── realtime/
│   └── manual/
│       ├── final-qa.md
│       └── test-log.md
│
├── docs/
│   ├── product/
│   │   └── PRD.md
│   ├── engineering/
│   │   ├── architecture.md
│   │   ├── database-schema.md
│   │   ├── api-contracts.md
│   │   └── deployment.md
│   ├── safety/
│   │   └── privacy-and-scope.md
│   ├── demo/
│   │   └── demo-script.md
│   └── PROJECT_BLUEPRINT.md
│
├── public/
│   └── brand/
│
├── .github/
│   ├── CODEOWNERS
│   └── workflows/
│       └── ci.yml
│
├── .env.example
├── .gitignore
├── middleware.ts
├── next.config.ts
├── package.json
├── tsconfig.json
├── README.md
└── vercel.json
Repository note: This is the logical target structure. Avoid creating empty folders or unnecessary files simply to match the diagram. Add each module when its implementation begins. Keep one canonical lib/ directory; the repeated lib/ grouping above represents its matching and language subdirectories.
2.2 Folder ownership
Member
Main folders
Responsibility
A — Technical Lead
supabase/migrations/, lib/engine/, lib/auth/, app/api/
Database engine, authentication, API, state transitions and escalation
B — Hospital Screens
app/(hospital)/, components/hospital/, components/ui/
Hospital dashboard and design system
C — Patient Side & Deployment
app/(patient)/, app/(operator)/, app/(public)/, lib/matching/, lib/urls/
Family flow, matching interface and deployment
D — Content & QA
content/, lib/i18n/, docs/, tests/manual/, public/brand/
Language, documentation, demo and final quality checks
E — Data & Platform
supabase/, scripts/, .github/, backup and reporting files
Schema, migrations, seed data, policies, backups and CI

2.3 Repository rules
Do not commit .env or any real secret.
Commit .env.example with placeholders.
Do not commit node_modules/, .next/, build output or private backup files.
Commit database migrations.
Commit generated database types only according to the agreed regeneration workflow.
Do not allow multiple team members to independently push conflicting database migrations.
E owns pushing shared database migrations.
A reviews engine SQL before it is pushed.
Every feature must have a clear owner.

3. ENVIRONMENT VARIABLES AND CONFIGURATION
3.1 Environment setup
GoldenHour uses Supabase and Vercel configuration.
Create a root .env.example.
# ==========================================
# APPLICATION
# ==========================================

NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# ==========================================
# SUPABASE
# ==========================================

NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url

NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

SUPABASE_SERVICE_ROLE_KEY=server_only_service_role_key

# ==========================================
# OPTIONAL OPERATIONAL CONFIGURATION
# ==========================================

# Configure only if the related AWS backup workflow is enabled.

AWS_REGION=your_aws_region
AWS_BACKUP_BUCKET=your_backup_bucket
AWS_ACCESS_KEY_ID=server_side_access_key
AWS_SECRET_ACCESS_KEY=server_side_secret_key

# ==========================================
# FEATURE CONFIGURATION
# ==========================================

NEXT_PUBLIC_ENABLE_REALTIME=true
Important environment rules
NEXT_PUBLIC_ variables are exposed to the browser.
Never put a Supabase service role key in a public variable.
Never expose AWS credentials in client-side code.
Do not commit actual credentials.
Configure production variables in Vercel.
Use separate development and production Supabase environments where available.
Do not use production data for local demonstrations.
3.2 Supabase client separation
Use separate Supabase client configurations.
Browser client
lib/supabase/client.ts
Responsibilities:
Browser-side authentication.
Realtime subscriptions.
User-authorised database reads.
User-authorised actions.
Server client
lib/supabase/server.ts
Responsibilities:
Server-side session handling.
Protected database operations.
Server-side route handlers.
Secure access to authorised records.
Service role
The service role key must remain server-side and should only be used for narrowly scoped administrative operations that cannot safely be performed through a user's normal RLS-protected session.
Never use it as a shortcut around access-control design.

4. BACKEND AND DATABASE ARCHITECTURE
4.1 Core architecture
GoldenHour does not use a separate Express backend.
The architecture is:
Family Browser / Hospital Browser
             |
             v
        Next.js App
             |
       Next.js Route Handlers
             |
             v
          Supabase
             |
     PostgreSQL Database
             |
       SQL / PLpgSQL
             |
   State + Tasks + Escalation
Supabase Realtime distributes authorised database changes to connected interfaces.
4.2 Backend responsibility rules
Responsibility
Correct location
UI interactions
Next.js / React
Page routing
Next.js App Router
Request validation
Thin TypeScript boundary and database constraints
Hospital matching
SQL function / database query
Task claim
PostgreSQL function
Task state transition
PostgreSQL function
Escalation
PostgreSQL function
Exactly-once escalation
Atomic SQL update
Authentication
Supabase Auth
Authorization
Supabase RLS
Live updates
Supabase Realtime
Pilot data analysis
Python + pandas
Hosting
Vercel

4.3 The emergency state machine
The emergency lifecycle must be defined explicitly.
CREATED
   |
   v
NOTIFIED
   |
   v
ACKNOWLEDGED / PREPARING
   |
   v
ARRIVED
   |
   v
CLOSED
Additional permitted states:
REJECTED
CANCELLED
ESCALATED
Do not allow arbitrary status changes.
Every transition must be validated by the database.
4.4 Required PostgreSQL functions
The engine should contain the following core functions.
Function
Purpose
next_state()
Validates permitted task or request state transitions
claim_task()
Atomically claims a preparation task
escalate_overdue()
Escalates overdue tasks exactly once
engine_tick()
Runs the required engine checks in a transaction
cancel_alert()
Cancels an alert and performs related cleanup

A. next_state()
Must:
Read the current state.
Check whether the requested transition is legal.
Reject illegal transitions.
Update the record only when valid.
Record the transition in the audit log.
B. claim_task()
Must:
Confirm that the task exists.
Confirm that the user is authorised for the hospital.
Confirm that the task is still pending.
Claim the task atomically.
Prevent two staff members from claiming the same task.
Return a clear success or conflict result.
Use a database constraint or atomic update to arbitrate simultaneous claims. Do not rely on a button being disabled in the browser.
C. escalate_overdue()
Must:
Identify overdue tasks.
Check that they have not already been escalated.
Set the escalation timestamp once.
Record the escalation event.
Return the records changed.
The implementation must be idempotent.
Running the function multiple times must not create multiple escalation records for the same task.
D. engine_tick()
Must:
Run the required state

