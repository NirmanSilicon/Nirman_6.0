# AGENT-X sandbox and attack simulator — harness brief

Build a judge-facing sandbox that makes AGENT-X's enforcement visible. Use seeded data, predefined source annotations, fixed action proposals, and mock tools. The simulation injects a fixed proposal into the test runner so judges can reproduce the same action in every mode. The combined test uses actual AGENT-X policy decisions. Inspect the repository first and follow its instructions. If starting empty, use a small browser UI with a Python backend and isolated local state.

## 1. Deliverables

1. **Scenario catalog and task-specific tool sets.** Implement every scenario in the shared fixture catalog. Seed source records, approved task inputs, expected legitimate outputs, and isolated mock destinations. Pair each task with its actual required read tool and a registered dummy side-effect tool that is outside the task's contract.
2. **Fixed simulator.** Replay predetermined legitimate and unauthorized proposals for each fixture. Show the source carrier, technique label, and goal. Include an image extraction example, hidden document layer, simulated webpage content, and an email body example. Represent hidden or embedded content with inert spans or fixture annotations. Display it as escaped text. Keep all tool effects inside the mock world.
3. **Comparison UI.** Offer carrier, technique, and goal filters over supported combinations in the catalog. Display the task, compiled contract, extracted source highlight, mode-by-mode timeline, rule, mock inbox and state diff. Add a scoreboard computed from observed effects. Reset restores the same fixture state and starts fresh matched runs. Include a benign case and an absent-risk-signal case.
4. **Approval mini-demo.** Show a guarded internal queue move. A judge can reject it and see the draft stay put, or approve it and see a single move. Show changed arguments and repeated submission as verification checks.
5. **Combined integration and evidence report.** Link the mock comparison to the product dashboard using run IDs or authorized links. Export fixture and policy versions, starting-state digest, per-mode observed effects, and policy decisions. Label evidence from deterministic replay and from any separately measured live-agent runs.

## 2. Functions and behavior

| Interface | Behavior |
|---|---|
| `load_fixture(id)` | Return the versioned template and parameters, typed inputs, source annotations, fixed proposals, expected outputs and initial snapshot. Validate the fixture at startup. |
| `seed_session(fixture, mode)` and `reset_session` | Create isolated copies of state for each session and mode. Reset to the immutable seed, use new run IDs, and prevent old approvals or reservations affecting the new run. |
| `replay_proposals(fixture)` | Emit the same action IDs and proposals in the same order across modes. Use a controlled signal override for the absent-signal fixture while keeping the unauthorized action unchanged. |
| `read_mock_record` and `apply_mock_effect` | Read only seeded local data. Apply the predefined effect to isolated mock state using the authorization reservation as the idempotency key in Enforce. Mock send writes one record to the mock inbox. Mock queue move changes one draft's state. |
| `run_comparison` | Run Off, Monitor, and Enforce from equivalent snapshots. Use the shared API for product decisions and approvals. Persist product IDs and redact display evidence. Surface integration errors and stop the affected Enforce path without applying the pending effect. |
| `diff_state` and `score_comparison` | Compute observed reads, deliveries, draft moves, valid user output, and enforcement outcomes. Count prevention only when the matching decision denies the action and its effect is absent. |
| `build_report` | Export mode, fixture version, state digests, decision and rule IDs, observed changes, and original task completion. Include any unavailable evidence or interrupted runs. |

Keep test fixture selection finite. The public UI accepts fixture IDs and typed task parameters from the seeded world. Mock dataset identifiers resolve to local records. Webpage fixtures are local documents. There are no arbitrary targets, external destinations, commands, or network-capable fixture tools. Keep service credentials and integration errors with sensitive data on the backend. A standalone component test can use a contract-compatible stub; label its results as fixture checks and require the real product for combined validation.

## 3. Execution plan

1. **Create fixtures and mock state first.** Implement the catalog, versioned immutable seed snapshots, scenario-specific tools, deterministic replay and state diffs. Test duplicate effects, session separation, reset, and source rendering.
2. **Build the judge UI.** Start with invoice extraction. Show the task and contract before the run. Then show the source span, proposal, rule, and observed mock inbox state across modes. Add the webpage, document, email, quote, and approval scenarios once the vertical slice works.
3. **Integrate with the product.** Implement the shared client behind the sandbox backend. Run contract tests against the sandbox-profile API. Wire approvals, output checks, idempotent mock authorization, and report correlation. Run failure tests for timeout, malformed response, and unavailable policy.
4. **Rehearse the combined demo.** Start from a clean state. Run invoice extraction, inspect the mock inbox and authorized invoice result, and repeat with the risk signal absent. Switch to the webpage, document, and email scenarios to demonstrate different input channels with their own read tools. Finish by rejecting a draft move and opening its recorded product timeline.
5. **Ship a repeatable validation entry point.** Supply setup commands for sandbox-only tests and the combined run. In combined verification report per-scenario benign completion, incorrect blocks of allowed calls, and confirmed prevention with counts and denominators. Include a judge script and a reproducible evidence export.


The shared integration contract, fixture catalog, and release checklist are maintained in [SHARED-CONTRACT.md](../SHARED-CONTRACT.md).

