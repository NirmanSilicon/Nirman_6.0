# Scaffold verification

Date: 2026-11-28. Project: **Agent-X**. Architecture reference: [AGENT-X-FINAL-ARCHITECTURE.md](AGENT-X-FINAL-ARCHITECTURE.md). Policy: `scaffold-1`; fixtures: `1.0.0`.

## Upload, provenance, negative-agent and screen-fix update

The work was based on the shared merge commit `63bff09` (the merge of the earlier backend wiring). No functional changes were missing from that merge.

- **36 Python tests pass locally and inside the Linux Docker test image.** Real PDF parsing/rasterization, TXT/CSV/JSON/DOCX contents, original-byte hash/download fidelity, session isolation, expiry/removal, immutable review versions, malformed files and upload limits are exercised. Uploaded-agent tests cover all eight selectable cases and source-mismatched answers. The final frontend Docker image also builds successfully.
- **6 isolated headless Edge browser tests pass.** They cover source provenance and real Off/Enforce results, binary PDF upload through the frontend proxy, field review, all eight negative agent cases, invalid-total rejection before authorization, approval/rejection/repeat-resume/stop queue transitions, inbox/queue separation, agent execution and mobile overflow checks. Desktop/mobile screenshots were inspected. The PDF sample was rendered and visually inspected.
- **Actual provider checks pass:** model OCR of the synthetic invoice image, live uploaded-record agent with a blocked transfer probe, and live uploaded-record agent with an intentionally altered final total. The first completed the task without delivery; the second withheld the answer at `OUTPUT_TOTAL_MISMATCH`. These are explicit test injections, not claims of naturally generated model attacks.
- Browser tests found an asset-proxy defect: dots in the two approved workflow asset names were being rejected. The route now allows exactly `workflow.js` and `workflow.css` while retaining path validation for other segments.
- The lab was rewritten around actual state: routing boards show where the selected draft resides, read-only scenarios no longer display unrelated draft queues, approval/execution states are distinct, and a post-execution stop no longer clears a previously observed effect.
- The running local demo remains at ports 18082 and 13080. Uploads are temporary in-memory data and expire on restart; original user files are not modified. Original filenames, hashes and references are visible, and built-in data is explicitly labelled synthetic with repository links.

Reproduction: `python scripts/check_documents.py`, optional `--live`, and `npm.cmd run test:e2e --prefix web`. Upload evidence is in `reports/presentation/upload-evidence.json`; actual model/OCR evidence is preserved separately in `reports/presentation/upload-live-evidence.json`. Browser screenshots are in `reports/ui/`.

## Initial evaluation and connected frontend update

The shared `outliers` branch was fast-forwarded to include the team's frontend (`7dda389`). The imported UI had a landing page and hard-coded verdict examples, without backend wiring. It now calls the evaluation API and links to the standalone studio and extended lab.

- **22/22 Python tests passed locally and inside the non-root Docker test container.** New tests cover the initial two-line invoice, 1-vs-0 observed deliveries, benign mode, annotation-free enforcement, reset isolation, scoped second-record denial, zero send-executor calls on denial, invalid-total rejection, guarded agents, and reviewer authentication.
- **Next.js production build and TypeScript checks passed.** The frontend standalone Docker image built successfully.
- **Full four-container presentation stack passed HTTP checks** on isolated verification ports: initial evaluation, eight scenarios, product evidence and export routes, reviewer authentication, approval/rejection, repeat resume, and both local agents. Those temporary containers were shut down after verification; the local presentation processes remain running.
- **HTTP checks through the frontend passed:** landing/studio/lab pages, benign/incident/annotation-free evaluation, all eight catalog scenarios, product evidence lookup, exports, and both local task agents.
- **Actual provider calls passed for both core tasks:** invoice extraction (~6.1 seconds) and quote comparison (~3.5 seconds), using `gpt-4.1-mini`. Both completed guarded reads and passed the final-output gate; the explicit demo probe caused no mock delivery. The model credential was read only server-side and was not printed or committed.
- The initial evaluation remains one Python process with in-memory state and no dependency on a model key, the product/sandbox stack, or Node. The two-line initial fixture totals USD 40.00; the original extended invoice fixture remains USD 25.00.
- Browser automation was attempted but stopped because the Windows browser URL could not be determined confidently. No visual-browser verification is claimed. The app is running for the user to inspect directly.

Presentation URLs: `http://localhost:18082` (independent initial evaluation), `http://localhost:13080` (landing), `/evaluation` (same studio through the frontend), and `/lab` (extended agent/scenario lab). Start with `.\scripts\start-presentation.ps1`, or use `python scripts/present.py` for the initial evaluation alone. See [DEMO-GUIDE.md](DEMO-GUIDE.md) for the judge script.

Local actual-model evidence was preserved in `reports/presentation/live-evidence.json`. Container HTTP-check evidence is in `reports/presentation/docker-evidence.json`. These files contain seeded demo data and no model credentials.

## Completed checks

| Check | Result |
| --- | --- |
| Python 3.13 product and sandbox consumer tests | 14 passed |
| All eight scenarios against actual product ASGI app | Passed; all modes start with identical state digests |
| Transfer scenarios, including absent-risk signal | Off 1 / Monitor 1 / Enforce 0 dummy deliveries; Enforce output passes |
| Unknown tools, invalid arguments, out-of-scope records/destinations | Denied; no dispatch reservation |
| Approval rejection, expiry, changed inputs, concurrent approval consumption | Passed |
| Duplicate reservations and repeated mock moves | One reservation/charge and one mock effect |
| Guard timeout, unknown verdict, malformed authorization | Pending Enforce effect unapplied |
| Session ownership and reset | Cross-session access denied; new run IDs and equal seed digests |
| Invoice arithmetic tampering | Output blocked without returning an answer |
| Cumulative call budget and replay accounting | 20 distinct reservations allowed, next denied; retries do not double-charge |
| Operator stop and production-only route isolation | Passed |
| Generated production/sandbox OpenAPI drift check | Passed |
| Production, sandbox, and development Compose configuration | Validated |
| Browser JavaScript syntax | Both dashboard scripts parsed successfully |
| Python compile and tracked diff whitespace check | Passed |

The consumer tests use the actual product application through ASGI transport. They are deterministic fixture checks, not live-agent benchmark measurements. See `tests/test_product.py` and `tests/test_sandbox_contract.py` for exact assertions.

## Commands

```powershell
# With the package installed in your environment:
python -m unittest discover -s tests -v
python scripts/export_openapi.py --check
docker compose --env-file .env.example --profile sandbox config --quiet
docker compose --env-file .env.example --profile production config --quiet
docker compose --env-file .env.example -f compose.yaml -f compose.dev.yaml --profile sandbox config --quiet
docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from tests
```

## Container and live integration verification

The final **Agent-X** multi-stage Docker image built successfully, and all **14 tests passed inside the non-root test container**, with runtime networking disabled. A temporary package-index failure during the build succeeded on retry. The locked Starlette version emits a TestClient deprecation warning for HTTPX; tests complete successfully.

The combined product/sandbox deployment reached healthy status. The live HTTP smoke passed **8/8 fixtures**. All **7/7** non-approval scenarios completed their original task with a validated Enforce answer. All **6/6** transfer scenarios produced one dummy delivery in Off, one in Monitor, and zero in Enforce, with an explicit matching policy block. The nine legitimate read proposals completed in Enforce without incorrect blocks. The absent-risk-signal fixture retained the same deterministic denial.

Additional checks through the running sandbox HTTP backend passed: both dashboard pages returned successfully; product links used the configured host port; approved routing moved the draft once; rejected routing left it unchanged; repeated resume did not duplicate a move; another browser session could not read the comparison; and evidence export returned downloadable deterministic-replay JSON.

Host ports are configurable because other applications on the development machine already occupy 8000, 8080, and 18080. Verification used product port **18000** and sandbox port **18081** without changing those other applications. Verification containers were then shut down; their database volume was preserved.

```powershell
$env:AGENT_X_PRODUCT_PORT = '18000'
$env:AGENT_X_SANDBOX_PORT = '18081'
docker compose --env-file .env.example --profile sandbox up --build --wait
$env:AGENT_X_PRODUCT_URL = 'http://127.0.0.1:18000'
$env:AGENT_X_SANDBOX_TOKEN = 'local-sandbox-change-me'
python scripts/smoke.py
docker compose --env-file .env.example --profile sandbox down
```

The smoke comparison IDs for this run are recorded below; product run evidence persists separately in the local demo database.

| Fixture | Comparison ID |
| --- | --- |
| invoice-transfer | `f940d15e375d41c988eae202bca4f53f` |
| invoice-no-risk-signal | `8c4e1b7929ec4cb18bfd000970ea36ef` |
| quotes-benign | `c40a73c301af43b5b6d1436370bb0881` |
| quotes-transfer | `b79ed56a24254bfcb5855c8bf5b53725` |
| page-transfer | `1d57d2f397a248c0ba988c14acc48fb8` |
| document-transfer | `c515ea41d89d4fabaa6526d70e6fee4c` |
| email-transfer | `38d036f104f641bbafd944542290cde3` |
| approval-move | `6e4601256daf4c14815c6883d8795634` |

## Boundaries

This verification does not establish the full production release checklist. Real external tool connectors, production identity/resource authorization, comprehensive sensitive-data classification, independent semantic document verification, external audit anchoring and richer P1 controls remain pending. Local/model extraction and guarded agents are now exercised; browser workflow and visual checks are recorded in the newer section above. No broad live-agent benchmark or complete OWASP coverage is claimed.
