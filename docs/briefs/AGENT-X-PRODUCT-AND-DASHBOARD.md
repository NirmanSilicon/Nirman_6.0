# AGENT-X product and dashboard — harness brief

Build the application, integrations, and operator dashboard. This brief can be assigned to a harness working independently of the sandbox. Use the shared contract below as the boundary. Inspect the repository and follow its established stack, instructions, and tests. If starting empty, default to Python, FastAPI, Pydantic, SQLite, and a small web dashboard. Keep the enforcement core independent of HTTP, frontend, and model-provider code.

## 1. Deliverables

### Core

1. **Trusted request and Task Contract.** Register versioned templates with typed parameters. Resolve resources against the caller's authorized records. Show the compiled scope to the user. Store it immutably for each run. Start with `extract_invoice` and `compare_quotes`. Support the three sandbox task templates and the approval template listed in the shared fixture catalog below.
2. **Tool Capability Manifests.** Import MCP and OpenAPI schemas into draft manifests. Require explicit review of argument types, side effects, data labels, required privileges, and sinks. Deny unknown or unapproved tools. Support reviewed connector allowlisting and fingerprints of tool identity, description, and schema.
3. **Deterministic policy engine and dispatch.** Validate the typed call, canonicalize and resolve arguments, check the compiled contract and data flow, then evaluate budgets and approval requirements. Use the same checked values for dispatch. Fail closed on missing or unavailable policy and on ambiguous inputs. Return stable rule IDs. Agent or source text never changes authorization.
4. **Ingestion and final-output gates.** Support image OCR, PDF, webpage content, and tool results via adapters. Preserve extracted and normalized representations, source spans, provenance, trust and sensitivity labels. Expose visible-versus-extracted differences where the adapter supports them. Validate output schemas, apply configured sensitive-data and rendering rules, and recompute task-specific arithmetic or rankings. Verify any sanitized output again before release.
5. **Approval service.** Generate prompts from the checked action and trusted metadata. Bind each request to the run, contract version, tool identity, and canonical argument digest. Expire approvals and consume them once atomically. Show the affected record and destination as a before/after change. Recheck policy and actor authorization at dispatch.
6. **Audit and dashboard.** Provide run lookup and timeline, contract summary, rule-level decision detail, redacted evidence, approval queue, source spans, missing-manifest and connector alerts, frequently approved rules, and a report export. Separate evaluated actions from dispatched actions and observed effects. Role-check reviewer and operator controls. Redact ahead of persistence and export. Preserve event order and make stored audit events tamper-evident.

### Product completion

7. **Integration paths.** Ship an MCP proxy, Python decorator, and the check API below. Wire one real tool-calling agent through the proxy with a final-answer hook. Keep all credential-bearing tool access behind the guarded dispatcher. Ensure the live integration can complete both benign core tasks.
8. **Additional controls.** Implement cumulative call and byte limits, repeat-call limits, an optional tighten-only intent signal, read-only quarantine, a scoped credential-broker stub, provenance and quarantine on persistent memory writes, agent inventory, baseline deviation alerts, and operator stop. Enforce approved manifests and connector pinning before execution.
9. **Operator experience.** Provide a view-only run link with an expiring, revocable view credential if sharing is implemented. Keep ingestion and operator credentials separate. Provide links between decision detail and observed simulator outcomes. Show out-of-scope and partial coverage honestly when displaying OWASP coverage.

### Scope

Cover ASI01, ASI02, ASI03, ASI04, ASI05, ASI06, ASI09, and ASI10. Exclude ASI07 and ASI08, including peer messaging and a cascading-failure circuit breaker. Keep call and byte budgets under ASI02 and operator stop under ASI10. Demonstrate ASI05 through tool denial with zero mock executor calls; runtime isolation for arbitrary code and GUI agents is outside this scope. Label the broker as a stub. Document semantic manipulation of unstructured output and reviewer persuasion as limitations. Learning mode and broader benchmark work are deferred.

## 2. Functions and data

| Interface | Behavior |
|---|---|
| `register_template`, `compile_contract` | Validate parameters, resolve authorized record IDs, and pin template and policy versions. Store the exact scope used for decisions and evaluation replay. |
| `import_manifest`, `approve_manifest`, `verify_manifest_pin` | Manage schema review, exposure labels, connector allowlists, and fingerprints. Prevent execution when the manifest or connector is unrecognized or altered. |
| `ingest` | Attach source trust and sensitivity metadata and record available spans. Keep normalized text attached to its source, with a separate risk signal. Use optional detection signals only to tighten permissions. |
| `canonicalize`, `evaluate` | Resolve typed arguments, validate scope and flows, and return a decision with rule ID. Unknown manifests, invalid arguments, and unauthorized destinations have distinct reasons. |
| `dispatch_guarded` | Own real execution. Revalidate the canonical action and run state, atomically reserve budget and consume approval, and ingest the result before returning it. Record actual outcomes. Keep credentials off the agent surface. |
| `create_approval`, `resolve_approval`, `consume_approval` | Implement pending, approved, rejected, expired and consumed states. Replays must not cause duplicate state changes. |
| `validate_output` | Apply schema, data-flow, rendering, and integrity checks. Use decimal arithmetic and a documented currency and rounding policy. Return a validated result or a structured failure. |
| `append_event`, `get_run_report`, `stop_run` | Persist redacted ordered events, build run and comparison evidence, and prevent subsequent dispatch for stopped runs. |

Core entities are template, immutable contract, manifest, run, proposed action, decision, approval, dispatch reservation, and audit event. Persist identifiers and versions. Use transactional state transitions for budgets, approvals, and reservations. Document failure and retry behavior around external side effects. If an executor returns an uncertain outcome, record it explicitly and only retry a side-effecting operation with an executor-supported idempotency mechanism.

## 3. Execution plan

1. **Policy first.** Set up the core types, versioned rule catalog, manifest registry and mock executor. Verify allowed reads, denial for out-of-scope reads and unknown tools, destination validation, and zero execution on deny.
2. **Complete the two core tasks.** Extract a selected invoice with validated structured totals. Compare approved quotes, recompute totals and rank by a declared comparison rule, and return an incomplete result when required fields are missing. Connect ingestion and output validation.
3. **Ship runtime integration and approvals.** Wire MCP and final-output handling, the decorator and API. Verify fail-closed and approval semantics, including concurrency and idempotency. Add fallback errors for unavailable extraction or policy.
4. **Build audit, dashboard and P1 controls.** Verify both user and operator flows. Show the source-to-decision timeline, why each action was allowed or blocked, approval status, and whether an effect was observed. Add testable examples for pinning, broker scope, memory quarantine, and stopping a run.
5. **Publish the integration contract.** Generate OpenAPI for shared routes, provide one command to start the sandbox profile, and run the shared acceptance gates with the sandbox. Include setup, migrations, sample config, and verification results. Deliver a standalone product smoke test even if the sandbox module is still being built.


The shared integration contract, fixture catalog, and release checklist are maintained in [SHARED-CONTRACT.md](../SHARED-CONTRACT.md).

