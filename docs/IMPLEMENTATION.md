# Implementation status

The supplied briefs are the target specification, and [AGENT-X-FINAL-ARCHITECTURE.md](AGENT-X-FINAL-ARCHITECTURE.md) is the architectural reference. This repository implements a runnable scaffold and deterministic vertical slice, not all target deliverables. It uses one product service and a separately runnable sandbox, keeps the enforcement core independent of hosting and UI, and starts with SQLite as directed by the final architecture.

## Working scaffold

### Initial evaluation and frontend integration

The independent initial-evaluation screen is now implemented in `agent_x_evaluation`: two-line seeded invoices, typed exact-record contracts, benign/incident replay, Off/Enforce comparison, product-core-backed policy, mock inbox inspection, Decimal output validation, annotation-free checks, reset, and JSON export. Launch it with `python scripts/present.py`; no model or other backend is required.

The imported Next.js frontend originally contained a landing page and hard-coded verdict examples. Its demo now calls real evaluation routes. `/evaluation` serves the same studio through a server proxy, and `/lab` supports the existing scenario catalog, reviewer authorization, product timeline lookup, evidence downloads, and guarded agents. New operational screens use the supplied light editorial design reference; the original landing remains.

The agent path includes an in-process MCP 2025-11-25 JSON-RPC tool proxy, an injected guarded mock dispatcher, bounded OpenAI-compatible function-calling loop, and mandatory final-output hook. Local and actual provider-driven invoice/quote tasks are supported. Evidence distinguishes live-model-over-mock-tools from deterministic replay. Remote MCP hosting and production connectors remain future work.

### Uploaded sources and corrected execution views

The evaluation studio now accepts PDF, PNG/JPG, TXT, CSV, JSON, DOCX and pasted text/JSON. Local adapters preserve original bytes, SHA-256, extraction method, page/logical-line spans and value references. PDFium renders PDF previews; optional consent-based model OCR handles images/scans. Missing fields are not replaced by fixture values. Original data and suggested extraction remain distinct from the immutable user-confirmed task record.

Reviewed uploads are session-owned, expire after one hour, and have bounded local memory retention. They can run fixed Off/Enforce comparisons and real local/live agent tasks over the same policy core. The uploaded-agent output must match the reviewed record as well as pass schema/Decimal checks. Eight explicit benign/negative cases cover scope, wrong records, argument types, unknown tools, tampered output, stop and guard outage. Reports label injected probes and whether the model was invoked.

The lab now has separate scenario, agent and draft-routing tabs. Draft boards are shown only for routing; inbox panels show actual attachment records for read/transfer scenarios. Approval and execution phases are separate. Approve moves once, reject leaves the draft, repeated resume is idempotent, and a later stop does not erase an already observed move. The full screen/architecture/code mapping is in `DEMO-GUIDE.md` and the on-screen architecture explainer.

| Area | Current behavior |
| --- | --- |
| Task contracts | All six templates, strict parameters, authorized local record/type checks, immutable scope snapshot, template/policy versions |
| Policy | Approved seeded mock manifests, schema fingerprints pinned per run, typed arguments, resource/tool/destination scope denial, stable rule IDs |
| Runs | SQLite persistence, opaque IDs, separate product/sandbox credentials, ownership checks, operator stop |
| Approvals | Pending/approved/rejected/expired/consumed states, operator-only resolution, exact action/arguments, five-minute expiry, atomic reservation and consumption |
| Budgets | Cumulative reserved call and argument-byte counts; reservation replay does not double-charge |
| Output | Seed-backed expected answers, Decimal invoice arithmetic, deterministic quote ranking, source matching, no answer returned on block |
| Audit | Ordered redacted-key events and unanchored hash chain; distinct evaluations, reservations, and mock observations |
| Sandbox | Eight fixtures covering six templates, fixed proposals, Off/Monitor/Enforce, absent-signal and benign cases, equivalent state digests, mock idempotency, session isolation, reset, report export |
| Dashboards | Source representations, contract/timeline JSON, rule detail, inbox and state differences, observed-effect score, operator approval/stop, correlated run links |
| Packaging | Python package, generated OpenAPI per profile, multi-stage Docker image, dev/test Compose files, profile-separated volumes, CI and consumer tests |

## Explicit stubs and remaining product work

- Replace static shared development tokens with tenant/user identity, per-record authorization, reviewer roles, revocation, and separate ingestion credentials. Current operator is a local administrative identity; sandbox service identity owns simulator-created runs.
- Implement versioned template administration and an authorized production resource provider. Production currently has no resource provider and therefore cannot compile real tasks.
- Implement MCP/OpenAPI manifest import, review workflow, connector allowlists, descriptions/data labels/privileges/sinks, and full identity/schema fingerprint lifecycle. Current fingerprints cover local mock connector ID, tool ID, and argument schema.
- Implement the production guarded dispatcher, executor-supported idempotency/uncertain outcomes, Python decorator, and remote MCP transport. The extended lab now has a real model loop and final-answer hook over a guarded local mock dispatcher and MCP JSON-RPC proxy. It does not execute production tools; legacy production transport/broker stubs remain explicit.
- Extend the implemented bounded local PDF/image/text/CSV/JSON/DOCX adapters into production ingestion, including richer trust/sensitivity classification, robust layout-specific extraction, independent semantic source verification, webpage/tool-result integrations and broader OCR coverage. The original sandbox carriers remain fixed annotations; actual uploads use the separate source/review workflow.
- Extend output validation into a production schema registry with data-flow/rendering rules, sensitive-data filtering, sanitation followed by revalidation, and incomplete/missing-field quote comparisons. Uploaded invoice outputs already support schema/arithmetic checks and equality to the user-reviewed record.
- Add repeat-call limits, full byte accounting for returned data, tighten-only intent signals, quarantine, persistent-memory controls, inventory, and baseline deviation alerts. Current byte budget covers canonical arguments only.
- Implement scoped credential issuance; `CredentialBrokerStub` explicitly cannot issue credentials.
- Expand dashboard reporting, connector/missing-manifest alerts, frequently-approved rules, richer rule/effect visualization, reviewer before/after record resolution, robust export redaction, audit verification UI, and externally anchored audit integrity.
- Optional sharing requires separate expiring, revocable, view-only credentials. Current run links require operator authentication; there is no public sharing feature.
- Add durable simulator persistence, lifecycle cleanup, fuller startup fixture validation, consumer failure/rejection/expiry coverage over live HTTP, and a complete release evidence artifact.

## Coverage labels and exclusions

| OWASP scope in brief | Scaffold evidence | Status |
| --- | --- | --- |
| ASI01 | Compiled scope unaffected by inert source annotations | Partial |
| ASI02 | Tool/resource scope, mock reservation gate, cumulative argument/call budgets | Partial |
| ASI03 | Separate local service/operator identities and role checks | Partial |
| ASI04 | Seeded reviewed mock manifests and pin check | Partial |
| ASI05 | Denied mock calls receive no reservation/effect | Partial; no arbitrary-code runtime isolation |
| ASI06 | Port/stub boundaries only; memory quarantine not implemented | Unimplemented |
| ASI09 | Seed-backed structured output integrity | Partial |
| ASI10 | Operator stop checked before mock reservation | Partial |
| ASI07 / ASI08 | Peer messaging and cascading-failure circuit breaker | Excluded by brief |

These are specification labels, not an independently validated OWASP compliance claim. Semantic manipulation of unstructured output and reviewer persuasion remain limitations. Learning mode, broad benchmarks, arbitrary-code isolation, and GUI-agent containment remain outside this scaffold's implementation.
