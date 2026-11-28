# Agent-X

Runnable Python scaffold for the two supplied AGENT-X briefs: an enforcement product and a deterministic, isolated attack simulator. Uses Python 3.13, FastAPI, Pydantic, SQLite, and small browser dashboards, as requested by the briefs. No Node build, external database, or model-provider credential is required for the seeded demo.

This is a foundation for development, not the completed security product. See [implementation status](docs/IMPLEMENTATION.md) for the implemented slice, explicit stubs, and remaining deliverables.

## Start with Docker

From the repository root, with Docker Desktop running Linux containers:

```powershell
Copy-Item .env.example .env
docker compose --profile sandbox up --build --wait
```

Use independent token values in `.env`. The example values are local development credentials. The browser does not receive the sandbox integration token.

If ports 8000 or 8080 are occupied, change `AGENT_X_PRODUCT_PORT` and `AGENT_X_SANDBOX_PORT` in `.env`. Dashboard links follow the configured product host port automatically.

| Address | Purpose |
| --- | --- |
| http://localhost:8080 | Judge-facing scenario comparison |
| http://localhost:8000 | Product operator dashboard; enter your operator token |
| http://localhost:8000/docs | Product sandbox-profile OpenAPI UI |
| http://localhost:8080/docs | Sandbox backend OpenAPI UI |
| http://localhost:8000/healthz | Product health and profile |

Choose **invoice-transfer**, then **Run / reset comparison**. Expected mock deliveries: Off **1**, Monitor **1**, Enforce **0**, with the legitimate invoice answer delivered in Enforce. All effects stay inside seeded local state. Repeat with **invoice-no-risk-signal** to demonstrate that policy does not depend on a detection signal.

For **approval-move**, open the Enforce product-run link, enter the operator token, and approve or reject the pending action. Return to the sandbox and select **Resume approved Enforce move**. Approval causes one mock move; repeated resume does not duplicate it. Rejection leaves the draft in its initial queue.

```powershell
# Live-reload development using the same containers
docker compose -f compose.yaml -f compose.dev.yaml --profile sandbox up --build

# Stop the demo; preserve its product database
docker compose --profile sandbox down

# Run tests in a non-root container, without runtime network access
docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from tests
```

The product database is stored in the `sandbox-product-data` named volume. Simulator comparisons are bounded, process-local state; export evidence before restarting the sandbox. Resetting a comparison creates fresh run IDs and equivalent seed snapshots; it preserves previous product audit evidence.

## Production profile

```powershell
docker compose --profile production up --build --wait
```

Stop the sandbox profile first: both profiles use host port 8000. Production has its own database volume, allows Enforce only, omits event-ingestion and mock-authorization routes, and has no seeded records or approved connectors. Its dashboard and health check work; creating a task fails closed until an authorized resource provider and reviewed real integrations are implemented. This profile is configuration separation, not a claim of production readiness.

## Run locally on Windows

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -c requirements.lock -e .
Copy-Item .env.example .env

# Terminal 1
.\scripts\dev.ps1 product

# Terminal 2
.\scripts\dev.ps1 sandbox
```

The development script imports the supported `.env` values and starts one service with reload. The default local ports match Docker. On other platforms, install the package, export the values in `.env.example`, and run:

```bash
uvicorn agent_x_product.app:create_app --factory --host 127.0.0.1 --port 8000 --reload
uvicorn agent_x_sandbox.app:create_app --factory --host 127.0.0.1 --port 8080 --reload
```

## Final architecture

The following target architecture comes from the supplied [AGENT-X-FINAL-ARCHITECTURE.md](docs/AGENT-X-FINAL-ARCHITECTURE.md), which is the architectural reference for this scaffold. Working components and remaining integrations are distinguished in [implementation status](docs/IMPLEMENTATION.md). The broker remains a stub; live agent, MCP transport, real extraction, and production tool dispatch are planned.

AGENT-X mediates tool execution and final output for tool-calling agents. A trusted request selects a versioned Task Contract. The gateway checks every proposed tool call against that contract and validates every final answer before delivery. The dashboard shows the decisions and their observed outcomes. The sandbox uses the same policy implementation to compare outcomes in an isolated mock world.

**Deployment decision:** start with one Python product service and a separately runnable sandbox. Keep the policy core independent of hosting and the UI. Use SQLite for local development and the initial integrated demo. Move to Postgres if concurrent workers or deployment requirements warrant it. The initial evaluation may run the policy core and mock executor together in one process.

### 1. System map

```mermaid
flowchart TB
    U[Trusted user] --> APP[Product application]
    APP --> C[Task Contract compiler]
    C --> REG[(Templates and approved manifests)]
    APP --> A[Agent runtime]
    A -->|Proposed call| G[Guarded execution service]
    REG --> G
    C --> G
    G --> P[Policy core]
    G <-->|Action review| H[Approval service]
    G -->|Authorized call| X[Tool executor and scoped broker]
    X --> I[Ingestion and provenance]
    I --> A
    A -->|Draft answer| O[Output gate]
    C --> O
    O -->|Validated answer| APP
    G --> L[(Run state and audit)]
    H --> L
    O --> L
    L --> D[Operator dashboard]
    D -->|Authorized stop or review| G
    J[Judge] --> S[Sandbox application]
    S --> M[(Local fixtures and mock state)]
    S -->|Dedicated sandbox profile| API[Sandbox integration API]
    API --> P
    API --> O
    API --> L
```

### 2. Component ownership

| Component | Owns | Key boundary |
|---|---|---|
| **Product application** | Authentication, task selection, resource authorization, showing the compiled contract, validated result delivery | User identity and tenant context come from the authenticated channel. |
| **Task registry and compiler** | Typed task templates, template and policy versions, allowed tools and records, readable data classes, sinks, limits, approval rules, output schema | Each run has an immutable contract. A new trusted request can create a new contract. |
| **Manifest registry** | Tool schemas, declared side effects, typed arguments, data and sink labels, approved connectors and fingerprints | Unknown tools, unapproved connectors, and changed pins fail closed. |
| **Ingestion** | Extracted and normalized text, OCR and document adapters, source spans, trust and sensitivity labels, visible-versus-extracted comparison where supported | External documents, pages, email, memory, and tool results enter as data. Risk signals can only tighten access. |
| **Policy core** | Canonicalization, contract and sink checks, rule IDs, deterministic verdict, and optional tighten-only signals | No tool dispatch, frontend, or model-provider dependency. |
| **Guarded execution service** | Run-state checks, approvals, budget reservations, authorized dispatch, tool result handling | Only this service can start mediated execution with the executor's credential. |
| **Output gate** | Schema checks, sensitive-data and rendering rules, deterministic task integrity checks | Every result delivery path runs through this gate, including streamed responses if supported. Buffer until checks pass. |
| **Audit and dashboard** | Redacted run timeline, approvals, stop controls, inventory, alerts, coverage and evidence exports | Dashboard failure cannot grant tool access. Each operator action is authenticated and audited. |
| **Sandbox application** | Fixture catalog, per-mode local mock state, replay, comparison UI, and evidence reports | Uses sandbox identities and mock tools only. The product owns policy decisions and the sandbox records observed effects. |

### 3. Run lifecycle

1. **Compile.** A trusted user selects a registered task and supplies typed record IDs. The compiler validates access and persists the immutable contract with its template and policy versions.
2. **Ingest.** Input adapters extract content and preserve provenance. The agent receives task data with source annotations. The guard resolves source references and sensitivity labels from trusted metadata.
3. **Evaluate.** The agent proposes a tool and arguments. The guard verifies the manifest and connector pin, canonicalizes the arguments, checks the selected records and sink, and applies the contract and remaining budgets. Optional intent and risk signals may tighten the decision.
4. **Authorize and dispatch.** `BLOCK` ends the action before dispatch. `ASK_HUMAN` pauses it for a trusted reviewer. `ALLOW`, or a matching approval, proceeds to a final run and policy check. Approval consumption and relevant budget reservation are committed together. The executor uses the exact checked arguments. Tool results return through ingestion.
5. **Deliver.** Validate structured output, screen configured sensitive values, sanitize rendering, and verify arithmetic or ranking when applicable. Deliver a passing result or a structured failure.
6. **Record.** Store the decision, any approval, dispatch outcome, and output verdict as distinct events. Reports label simulator-observed effects explicitly.

```mermaid
sequenceDiagram
    participant U as User
    participant A as Agent runtime
    participant G as AGENT-X guard
    participant H as Reviewer
    participant T as Tool executor
    U->>G: Select task and typed records
    G-->>U: Show compiled Task Contract
    G-->>A: Start scoped task
    A->>G: Propose a tool call
    G->>G: Canonicalize and evaluate policy
    alt Blocked
        G-->>A: Denial and rule ID
    else Approval required
        G->>H: Show the exact action and effect
        H-->>G: Approve or reject
        opt Valid approval and current policy allow dispatch
            G->>T: Dispatch checked arguments
            T-->>G: Result
            G-->>A: Tagged result
        end
    else Allowed
        G->>T: Dispatch checked arguments
        T-->>G: Result
        G-->>A: Tagged result
    end
    A->>G: Draft final answer
    G->>G: Validate or block output
    G-->>U: Validated result or structured failure
```

### 4. Integration surfaces

| Surface | Role |
|---|---|
| **MCP proxy** | Primary live tool path. Receives typed proposals and routes authorized calls through guarded dispatch. One live agent integration also needs a final-output hook because MCP calls do not carry the user-facing answer. |
| **Python decorator** | Wraps locally registered tools with the same guarded execution path. |
| **Product HTTP API** | `POST /v1/runs`, `POST /v1/runs/{run_id}/check`, `POST /v1/runs/{run_id}/output/check`, approval and stop routes, and `GET /v1/runs/{run_id}`. A preflight check reports policy and carries no live execution authority. |
| **Sandbox-only API** | `.../authorize-mock` reserves an authorized mock dispatch and returns the checked arguments. `.../events` accepts idempotent observations from the trusted sandbox service. These routes are exposed only in the sandbox profile. |
| **Component contract** | The product publishes versioned OpenAPI. The sandbox consumer runs contract tests against it. The shared API and fixture catalog in the two harness briefs define the detailed payloads and identifiers. |

**Persisted state.** Store task templates, manifest versions, immutable contracts, runs, action and decision IDs, approval records, dispatch reservations and budgets, and a redacted, tamper-evident event sequence. The sandbox owns fixture versions, initial state digests, comparison IDs, mock effects, and session state. Audit and approval writes must be idempotent. Bind approval to the run, contract version, tool identity, and canonical arguments, with expiry and single use. A stopped run denies subsequent dispatch. Record uncertain executor outcomes explicitly and retry side-effecting calls only when the executor supports idempotency.

### 5. Sandbox and judge experience

Each scenario has a legitimate user task, seeded records, a task-specific read tool, a fixed simulated proposal, and expected outcomes. Use annotated inert source spans and fixed proposal replay so the comparison can be reproduced.

| Scenario | Authorized tool | Evidence |
|---|---|---|
| Invoice extraction | `read_file(file_id)` | Selected invoice and validated line-item total |
| Quote comparison | `read_file(file_id)` for each selected record | Deterministic totals, ranking, and source references |
| Webpage summary | `read_page(page_id)` | Summary of the seeded local page and source reference |
| PDF summary | `read_document(document_id)` | Summary plus annotated visible-versus-extracted difference |
| Email summary | `read_email(message_id)` | Selected message summary and source reference |
| Internal draft routing | `move_mock_draft(draft_id, queue_id)` after approval | Exactly one approved move, or unchanged state after rejection |

Run each comparison mode from the same fixture version and starting-state digest. **Off** runs a predefined mock effect. **Monitor** records the product's would-block decision and runs the same mock effect. **Enforce** uses product authorization for mock dispatch and validates the final answer. The acceptance condition for the transfer fixture is **one mock delivery in Off and Monitor, zero in Enforce, and a valid invoice result in Enforce**. Verify directly against mock state. A companion run with no detector signal must produce the same contract denial. Keep the replay results distinct from live-agent measurements.

### 6. Build and deployment path

1. **Initial evaluation — one process.** Ship the invoice contract, rule check, fixed mock executor, output arithmetic check, and one comparison page. Run Off and Enforce with an in-memory inbox. Use the evaluation brief's `read_invoice` helper internally or route it through the final `read_file` manifest when wiring the full lab.
2. **Core product.** Extract shared policy and output-validation modules. Add versioned manifests, provenance, guarded execution, SQLite state, approvals, audit queries, dashboard, and deploy the MCP integration with an explicit output hook.
3. **Integrate the sandbox.** Add the remaining fixtures, Monitor, and a dedicated sandbox profile. Run the consumer contract tests, compare state digests, and match decisions and observed effects across both UIs.
4. **Release checks.** Verify allowed calls, zero dispatch on denial, approval rejection and single use, output-integrity failure, guard outage, session isolation, and operator stop. Measure benign completion and confirmed prevention with denominators and fixture versions.

**Scope.** The final build targets ASI01, ASI02, ASI03, ASI04, ASI05, ASI06, ASI09, and ASI10. ASI07 and ASI08 are excluded. The ASI05 claim is limited to denying disallowed execution tools at the gateway. The credential broker is a prototype stub. Arbitrary code execution isolation, GUI automation, semantic manipulation of unstructured outputs, and reviewer persuasion beyond action-based approvals are outside the demonstrated guarantees.

## Repository structure

```text
.
├── src/
│   ├── agent_x_product/
│   │   ├── app.py                  # API composition, identity, approval and mock gate
│   │   ├── config.py               # Explicit runtime profile and credential settings
│   │   ├── audit.py                # Redaction helper and ordered hash-chain events
│   │   ├── core/                   # HTTP-independent contracts, policy, output checks
│   │   ├── integrations/           # Dispatcher/ingestion ports and explicit MCP/broker stubs
│   │   ├── storage/
│   │   │   └── migrations/         # Versioned SQLite schema
│   │   └── web/                    # Operator dashboard
│   ├── agent_x_sandbox/
│   │   ├── app.py                  # Browser backend and session-owned comparisons
│   │   ├── client.py               # Typed product client; server-held credential
│   │   ├── simulator.py            # Fixed replay, mock effects, state diffs and scoring
│   │   └── web/                    # Judge comparison UI
│   └── agent_x_shared/
│       ├── models.py               # Canonical v1 wire models
│       ├── catalog.py              # Fixture loading and stable digests
│       └── fixtures/catalog.json   # Versioned local records and eight scenarios
├── contracts/                     # Generated production/sandbox OpenAPI documents
├── docs/
│   ├── briefs/                    # Supplied briefs, with shared sections deduplicated
│   ├── SHARED-CONTRACT.md          # Shared integration contract and fixture catalog
│   ├── AGENT-X-FINAL-ARCHITECTURE.md # Supplied authoritative architecture reference
│   ├── ARCHITECTURE.md
│   ├── IMPLEMENTATION.md
│   └── VERIFICATION.md
├── tests/                         # Product tests and sandbox consumer contract tests
├── scripts/                       # Development launcher, OpenAPI export and live smoke
├── .github/workflows/ci.yaml
├── Dockerfile                     # Multi-stage builder, non-root runtime and test target
├── compose.yaml                   # Explicit production and sandbox profiles
├── compose.dev.yaml               # Read-only source mounts and reload
├── compose.test.yaml              # Containerized tests
├── .env.example
├── pyproject.toml
├── requirements.txt               # Direct package requirements
└── requirements.lock              # Verified runtime dependency versions
```

## Verify changes

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
.\.venv\Scripts\python.exe scripts/export_openapi.py --check
docker compose --env-file .env.example --profile sandbox config --quiet
```

After an intentional API change, run `python scripts/export_openapi.py`, review both generated schemas, and update the consumer tests. For HTTP smoke verification against a running sandbox-profile product, set `AGENT_X_SANDBOX_TOKEN` in the shell and run `python scripts/smoke.py`. It verifies all eight scenarios and prints their comparison IDs.

CI runs the Python tests, checks OpenAPI drift, builds and runs the Docker test target, then starts the combined deployment and performs the live consumer smoke. [Verification notes](docs/VERIFICATION.md) record what was actually checked during scaffolding.

## Requirements and next work

- [Product and dashboard brief](docs/briefs/AGENT-X-PRODUCT-AND-DASHBOARD.md)
- [Sandbox and simulator brief](docs/briefs/AGENT-X-SANDBOX-AND-SIMULATOR.md)
- [Supplied final architecture](docs/AGENT-X-FINAL-ARCHITECTURE.md), reproduced above
- [Shared integration contract and release checklist](docs/SHARED-CONTRACT.md)
- [Architecture and failure behavior](docs/ARCHITECTURE.md)
- [Implementation boundaries and remaining work](docs/IMPLEMENTATION.md)

The container setup follows Docker's documented [profiles](https://docs.docker.com/compose/how-tos/profiles/) and [health-based dependency startup](https://docs.docker.com/compose/how-tos/startup-order/).
