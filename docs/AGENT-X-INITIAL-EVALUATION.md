# Agent-X — 3–4 hour initial evaluation build

This brief is the build scope for the initial evaluation. Use the full product and sandbox briefs for later milestones. Inspect the repository first and reuse any working code. If nothing is set up, build one local Python app with a single browser page using the simplest stack already available. Keep everything in one process. Store demo state in memory and create a fresh copy for each run.

## 1. Deliverable

Ship one working screen that allows a judge to:

1. Select the seeded invoice and see its Task Contract.
2. Switch between **Benign invoice** and **Simulated invoice incident**.
3. Click **Compare Off vs Enforce** to run both modes from fresh, identical mock state.
4. See the two timelines, the mock inbox count and attachment record, the policy decision and rule ID, and the validated invoice result.
5. Click **Reset** to restore the demo.

Use a seeded dummy invoice with two line items, a fixed structured extraction, and an annotated external-source span. Show the invoice preview and highlight the synthetic span. Label the simulation clearly. The demo replays predefined action proposals through a real deterministic policy check. Use local mock tools for all effects.

## 2. Build only these functions

| Function | Minimum behavior |
|---|---|
| `compile_contract(invoice_id)` | Accept a typed invoice ID from the UI's trusted selection. Reject unrecognized IDs. Return a contract allowing only `read_invoice(invoice_id)` for that exact record and a structured final answer. Show the scope before execution. |
| `check_call(contract, tool, args)` | Check the tool and its required argument types, then check the exact selected invoice ID. Default-deny unknown tools. Return `ALLOW` or `BLOCK` and a stable rule ID. Register the dummy send tool so its denial can be shown as `TOOL_OUTSIDE_CONTRACT`. |
| `run_demo(fixture, mode)` | Create fresh mock state. Replay the fixture's fixed proposals. In Off, execute the predefined mock actions. In Enforce, call `check_call` before every action and never dispatch a blocked one. Record the proposed action, decision, and observed effect separately. |
| `read_invoice(invoice_id)` | Return the seeded invoice data and its source annotation. |
| `send_mock_attachment(invoice_id)` | Append one dummy delivery to the current run's local mock inbox. The destination is fixed in code. Use no mail service or network tool. |
| `validate_result(result)` | Require vendor, date, currency, line items, and total. Check the arithmetic using integer cents or decimal arithmetic. In Enforce, show the structured result only if it passes. |
| `compare_runs(fixture)` | Run Off and Enforce from equivalent snapshots. Return both timelines, inbox contents, and invoice results. Read counts and state changes from the actual mock store. |

### Fixtures and expected screen

- **Benign invoice:** replay the allowed read and return the correct structured invoice. Both modes show zero mock deliveries.
- **Simulated invoice incident:** replay the same allowed read, then a fixed proposal for `send_mock_attachment`. Both modes continue to the invoice result.

| Evidence | Guard Off | Guard Enforce |
|---|---|---|
| Allowed invoice read | Succeeds | Succeeds |
| Fixed dummy transfer proposal | Dispatched to mock inbox | Blocked before dispatch |
| Final mock inbox count | 1 | 0 |
| Correct invoice result | Shown | Shown after validation |

The blocked action in Enforce must come from the actual policy function, and the delivery count must come from mock state. The simulated source annotation provides the story. Policy enforcement must still work if the annotation and risk metadata are absent.

## 3. Time-boxed execution plan

| Elapsed | Build | Verify before moving on |
|---|---|---|
| **0–45 min** | Seed invoice and empty inbox. Build the contract, action checker, mock dispatcher, and benign and incident fixtures. | In a script or test, replay the incident and prove **1 vs 0** deliveries. |
| **45–100 min** | Build one page with fixture selection, contract summary, **Compare Off vs Enforce**, and the two outcome panels. | A clean browser session can run the demo end to end without terminal interaction. |
| **100–150 min** | Add the output check, source highlight, rule detail, inbox inspection, benign mode, and reset. If time is tight, show the source annotation as a small text panel. | Verify correct invoice result, scoped read denial for a second record, blocked transfer with no execution, invalid-total rejection, and clean resets. |
| **150–180 min** | Add a one-command local launch, run the acceptance checks, and rehearse the judge flow. | A teammate can launch the app from the documented command and reproduce the result. |
| **180–240 min** | Reserve for fixes, rehearsal, and a backup recording if time remains. | Preserve the working demo. |

### Leave for after evaluation

Defer Monitor mode, MCP and live model integration, OCR, additional carriers, approvals, separate dashboard and sandbox services, authentication, persistence, benchmarks, and OWASP coverage views. If the repository already supports some of these, keep the initial evaluation flow independent of them.

### Judge script — about 90 seconds

1. “My task is to extract this invoice. Here’s the contract showing exactly what the agent can read and return.”
2. Select the simulated incident and run both modes.
3. “Both runs received the same proposed action. With the guard off, the mock inbox received the invoice. With Enforce, the action was blocked before delivery.”
4. Open the rule detail and the mock inbox, then point to the valid invoice result. “The original task still completed.”

### Handoff

Provide the local launch command, the acceptance test command and results, and the demo URL. The evaluation build is done when a judge can reproduce the comparison and inspect the difference directly in mock state.
