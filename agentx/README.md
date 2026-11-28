# SENTINEL — Product, Sandbox Simulator & Guarded Agent

Complete SENTINEL v1 implementation combining:
- **`sentinel_shared/`**: Canonical SENTINEL v1 contracts, enums, and error schemas.
- **`sentinel_product/`**: Deterministic policy engine, SQLite store with hash-chained audit events, manifest pinning, ingestion adapters, approvals, output gate, P1 controls, and `/v1/*` FastAPI API.
- **`sentinel_sandbox/`**: Full shared fixture catalog (`extract_invoice`, `extract_invoice_no_signal`, `compare_quotes_benign`, `compare_quotes_incident`, `summarize_page`, `summarize_document`, `summarize_email`, `route_review_draft`), isolated mock world, `ProductClient`, scoreboard, and evidence export.
- **`sentinel_agent/`**: `@sentinel_guarded` decorator, `SentinelMCPProxy`, and `LiveGuardedAgent` (supports `OPENAI_API_KEY`, free-tier `GEMINI_API_KEY` / `GROQ_API_KEY`, and offline deterministic driver).
- **`ui/`**: Judge-facing Sandbox Simulator (`/`) and Product Audit & Governance Dashboard (`/dashboard`).

## Launch Commands

### Sandbox + Product Combined Demo (default)
```powershell
python C:\Users\HP\.gemini\antigravity\scratch\sentinel\app.py --profile sandbox --port 8000
```
- Sandbox Simulator UI: `http://127.0.0.1:8000/`
- Product Audit Dashboard: `http://127.0.0.1:8000/dashboard`
- Canonical OpenAPI spec: `http://127.0.0.1:8000/openapi.json`

### Production Enforce-Only Profile
```powershell
python C:\Users\HP\.gemini\antigravity\scratch\sentinel\app.py --profile production --port 8001
```
Production profile accepts `ENFORCE` mode only and rejects sandbox-only routes (`/v1/runs/{run_id}/events`, `/v1/runs/{run_id}/authorize-mock`).

## Tests

```powershell
pytest C:\Users\HP\.gemini\antigravity\scratch\sentinel\tests -v
```
