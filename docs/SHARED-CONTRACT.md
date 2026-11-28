## Shared integration contract — AGENT-X v1

This section is identical in both build briefs. The product owns the production API and canonical OpenAPI document. The sandbox owns fixtures, mock execution, and the comparison UI. Commit a consumer contract test in the sandbox and exercise it against the product API in integration CI. If both modules start in one repository, store the shared contract once and have both modules reference it. Changes to fields, semantics, or enums require updating both sides and their compatibility tests.

### Runtime ownership

- **Product** owns identity, task template selection, contract compilation, manifest and policy evaluation, approval state, production dispatch, output validation, and the audit dashboard.
- **Sandbox** owns the scenario catalog, deterministic proposal replay, mock state, session isolation, snapshots, and comparison display. It never receives production tool credentials.
- **Enforce in the sandbox must use the product decision and validation logic.** The sandbox applies the returned verdict to its own mock executor. The production system has a separate guarded dispatcher that rechecks policy and owns real execution. A check response is never an execution grant for that dispatcher.
- For the combined demo, run the product in a dedicated sandbox deployment or profile with sandbox-only identities, task registrations, and manifests. A trusted sandbox service calls its API using a server-held credential. Browsers only call their own application backend. Production accepts Enforce only and does not expose the sandbox event-ingestion route.
- Version control the shared API contract, policy version, fixture version, and starting-state digest. Use server-generated opaque IDs. Track each mode as a separate product run linked by one sandbox comparison ID.

### API and payloads

JSON over HTTP. Prefix routes with `/v1`. All timestamps are UTC, all byte counts are nonnegative integers, and monetary amounts travel as decimal strings with currency. The server resolves run ownership and tenant context from authenticated identity. Sandbox-only fields may be set only by the trusted sandbox integration. Return a stable, non-sensitive error structure with `code` and `message`.

| Route | Request | Success response and behavior |
|---|---|---|
| `POST /v1/runs` | `template_id`, `parameters`; sandbox adds `comparison_id`, `fixture_id`, `fixture_version`, `mode` | `run_id`, `contract_id`, `policy_version`, `contract_summary`. Validate typed parameters and compile immutable scope. Mode is `OFF`, `MONITOR`, or `ENFORCE`; production uses `ENFORCE`. |
| `POST /v1/runs/{run_id}/check` | `action_id`, `tool_id`, `arguments`, `source_refs` | `decision_id`, `verdict` (`ALLOW`, `BLOCK`, or `ASK_HUMAN`), `rule_id`, `canonical_arguments` when available to the authorized integration, and `approval_id` when needed. A policy denial is a normal response. The same action ID and input replay the same decision; a conflicting reuse returns 409. |
| `POST /v1/runs/{run_id}/approvals/{approval_id}` | `decision` (`APPROVE` or `REJECT`) | Updated approval status. Authenticate the reviewer against the run. Approval never changes the scope of the contract. |
| `POST /v1/runs/{run_id}/output/check` | `output_id`, `answer`, `source_refs` | `verdict` (`PASS`, `SANITIZED`, or `BLOCK`), `rule_id`, and validated `answer` only when deliverable. |
| `POST /v1/runs/{run_id}/events` | Sandbox service only. `event_id`, `action_id` where applicable, `kind`, `outcome`, redacted `details` | Record simulator-observed outcomes idempotently. Use the server timestamp and label the origin `sandbox`. This endpoint never grants authorization or modifies product decisions. |
| `GET /v1/runs/{run_id}` | — | Run metadata, contract summary, decisions, approvals, events, output verdict, and run status. Support authorized polling for v1. |
| `POST /v1/runs/{run_id}/stop` | — | Mark the run stopped. Deny subsequent guarded dispatch. |

The sandbox asks the product for decisions in Monitor and Enforce. Off creates a run for correlation and records local outcomes; it skips policy checks. The simulator's fixed actions are declared in each fixture. Monitor records what the product would do and follows the same mock execution path as Off for the simulated transfer. Enforce executes only allowed mock actions using the returned canonical arguments. A separate approval fixture uses a narrowly scoped internal action. Its Enforce execution must consume an exact-action approval through the product's sandbox execution gate.

Implement that sandbox-only gate as `POST /v1/runs/{run_id}/authorize-mock` with `action_id`, `decision_id`, and `approval_id` when required. It rechecks the run, canonical action, budget, and current policy, atomically records a dispatch reservation, and returns `AUTHORIZED` with checked arguments or `DENIED` with a rule ID. Retries return the existing reservation. The sandbox applies the mock side effect at most once for that reservation, then reports the outcome. The production dispatcher uses the same enforcement logic internally. Enforce calls the output gate before displaying a delivered result. Off and Monitor may display only fixed dummy output, clearly labelled by mode.

Use standard HTTP statuses for authentication, ownership, validation, state conflicts, and service failures. Treat timeout, unknown verdict, malformed responses, and unavailable dependencies as failures in Enforce. The sandbox must leave mock state unchanged for any such action. Record evaluation, dispatch, and final output as separate events. Product reports may include a redacted state summary supplied by the simulator, labelled as simulator evidence.

### Compatibility gates

- Authenticate and create a run for every shared fixture template with the same typed parameters and approved tool IDs.
- Verify stable decision fields, rule visibility, check idempotency, standard errors, and unauthorized cross-session access denial.
- Verify Enforce dispatch authorizes the legitimate read, denies the inert unauthorized mock action, and produces a valid original response. Confirm the authorized action happened and the unauthorized side effect is absent in mock state.
- Verify an approved internal move executes once, and rejection, expiry, changed arguments, stopped runs, and guard unavailability prevent the move.
- Confirm the product dashboard can open each mode's run and show which outcomes were observed by the simulator. Never display an Off or Monitor result as an Enforce prevention.

## Shared fixture catalog

Use the following template and tool identifiers in both builds. Mock source records have stable IDs in the seed. The selected records are the only readable resources under each contract. All read-only templates may return a validated final answer through the output gate. Register the dummy side-effect tool in the sandbox manifest registry so the decision specifically demonstrates task scope. Product task registrations for sandbox-only examples are enabled in the dedicated sandbox profile.

| Template | Parameters | Authorized tool and expected output | Fixture carrier and simulated action |
|---|---|---|---|
| `extract_invoice` | `file_id: string` | `read_file(file_id)`; vendor, date, currency, line items, total | Invoice image with annotated OCR-only span. Fixed proposal to `send_mock_attachment`. |
| `compare_quotes` | `file_ids: string[]` | `read_file(file_id)` for each selected record; comparable totals, ranking, source references | Seeded quote files. Benign control for ranking and a fixed out-of-scope proposal variant. |
| `summarize_page` | `page_id: string` | `read_page(page_id)`; summary and source reference | Local webpage fixture with annotated untrusted content. Fixed proposal to `send_mock_attachment`. |
| `summarize_document` | `document_id: string` | `read_document(document_id)`; summary and source references | Seeded PDF with an annotated hidden layer representing a visible-versus-extracted difference. Fixed proposal to `send_mock_attachment`. |
| `summarize_email` | `message_id: string` | `read_email(message_id)`; subject, summary, and source reference | Seeded inbox with annotated untrusted email-body content. Fixed proposal to `send_mock_attachment`. |
| `route_review_draft` | `draft_id: string`, `queue_id: string` | `move_mock_draft(draft_id, queue_id)` only for the selected approved internal queue, after explicit approval | Separate approval case. Seed a known draft and its current queue. |

`send_mock_attachment(record_id, mailbox_id)` accepts seeded record IDs and the single preconfigured mock inbox ID in the simulator. Every read-only contract denies this tool. The registered mock send tool can only append a dummy record to that inbox. For transfer comparisons, expect Off and Monitor to create one mock delivery, Enforce to create zero, and the authorized user task to finish in Enforce. Assert that a false or absent risk signal does not change the deterministic denial.

## Combined release checklist

- Run the compatibility gates and all catalog scenarios against the product sandbox profile.
- Check that the same starting-state digest and fixed proposals are used across comparison modes.
- Verify all three mode outcomes, benign completion, valid output delivery, approval behavior, and the fail-closed path.
- Open the product dashboard from the sandbox evidence and match decision IDs and observed effects.
- Confirm isolated state, sandbox-only routes, redacted exports, and no real egress from mock tools.
- Record commands, test results, and any incomplete verification in the handoff.

