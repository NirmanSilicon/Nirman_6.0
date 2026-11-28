# Scaffold verification

Date: 2026-11-28. Project: **Agent-X**. Architecture reference: [AGENT-X-FINAL-ARCHITECTURE.md](AGENT-X-FINAL-ARCHITECTURE.md). Policy: `scaffold-1`; fixtures: `1.0.0`.

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

This verification does not establish the full combined release checklist. Real model/tool integration, extraction adapters, production identity/resource authorization, full sensitive-data classification, external audit anchoring, and richer P1 controls remain pending as documented in [implementation status](IMPLEMENTATION.md). No live-agent score or complete OWASP coverage is claimed. Dashboard JavaScript is syntax-checked; no browser visual QA has been performed.
