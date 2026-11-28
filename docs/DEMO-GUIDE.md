# Presenting Agent-X

## Initial evaluation — the required flow

Launch with `python scripts/present.py` and open **http://localhost:18082**. This path is deliberately independent of model access, authentication, persistent storage, the Next.js build, and the larger service stack.

1. **Task and scope, 15 seconds.** “Our trusted request is to extract this invoice. This immutable contract permits `read_invoice` for exactly the selected record and a structured invoice answer. Sending attachments is outside that scope.” Show the two line items and USD 40.00 total.
2. **Same proposals, 20 seconds.** Select **Simulated incident**, then **Compare Off vs Enforce**. “The simulator supplies identical fixed proposals to both runs, from identical empty mock stores. The source annotation tells the story; it does not decide authorization.”
3. **Decision and actual effect, 25 seconds.** “Off executes the dummy transfer and records one attachment. Enforce returns `TOOL_OUTSIDE_CONTRACT` before dispatch.” Expand the blocked action and mock inbox. Show the attachment record in Off and empty inbox in Enforce.
4. **Original task completed, 15 seconds.** Show the validated result. “The allowed invoice read succeeded. The structured answer passed schema and Decimal arithmetic checks; the correct total is still USD 40.00.”
5. **Controls, 15 seconds.** Hide the synthetic annotation and rerun: the denial remains. Select **Benign invoice** and compare: both modes complete with zero deliveries. Reset, or download the evidence JSON.

## How evaluation works

The trusted invoice selection compiles the exact scope. The policy function validates argument types and selected-record membership and denies unrecognized tools. The dummy send tool is registered, so the incident demonstrates a contract violation rather than merely an unknown tool. `check_call` delegates authorization to the product's deterministic policy core and maps the rule name to the initial brief's required `TOOL_OUTSIDE_CONTRACT` identifier.

The executor receives the checked arguments. A blocked Enforce action never calls `send_mock_attachment`; tests assert zero calls. The local mock inbox is an actual list with dummy attachment records, and displayed counts come from that list. Final answers require the invoice fields and mathematically correct line-item totals. Each comparison receives new opaque IDs and fresh stores.

## Fixed versus computed

| Fixed for repeatability | Computed at runtime |
| --- | --- |
| Seeded dummy invoices, two line items, source annotation | Contract compiled from the selected record |
| Benign/incident proposal sequences | Typed policy decisions and stable rule IDs |
| One fixed local mock destination | Whether the mock executor is called |
| Structured fixture extraction | Inbox contents, attachment counts, reads, and state digests |
| Expected legitimate task | Output schema and arithmetic validation |

This is deterministic replay, not evidence that a real model followed an injected instruction. Do not describe the fixed incident as a measured live-agent attack or the mock transfer as real email exfiltration.

## Optional extended demonstration

Run `.\scripts\start-presentation.ps1` and open **http://localhost:13080/lab**. The imported landing page is at port 13080, and its demo widget calls the evaluation backend.

- Run invoice, quote, webpage, document, or email comparisons through the real product API.
- For `approval-move`, enter the local operator token, then approve or reject the exact move and inspect draft queue state and product evidence.
- Run either local task-agent core task, or select the configured live model. Live model tool calls traverse the MCP JSON-RPC proxy and guarded mock gate, and final output traverses the product output gate.
- The explicit extra test probe is injected by the demo runner and labelled accordingly. It is not represented as model-generated behavior. Live-model runs carry `live-model-over-mock-tools`; fixture replay carries `deterministic-replay`.

The larger product's production identity, real connectors, remote MCP transport, extraction adapters, and advanced controls are later milestones. Keep them separate from the initial evaluation claims.

## Rehearsal checks

```powershell
$env:PYTHONPATH='src'
python -m unittest discover -s tests -v
python scripts/check_presentation.py
python scripts/check_presentation.py --live
```

The last command makes actual calls using your server-side provider configuration. Evidence is saved under `reports/presentation/evidence.json`; local logs and process IDs are in the same directory.
