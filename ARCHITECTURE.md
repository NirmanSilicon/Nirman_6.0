# ARCHITECTURE.md — System Architecture (`algoryxz` — DocuReady for NIRMAN 6.0)

**Baseline (`VERIFIED`):** `algoryxz` (`06c65b4`) contains only `.gitignore` and `algoryxz.txt`. The application topology below is **`PROPOSED`** per ADR-001.

---

## 1. Proposed NIRMAN Application Architecture (`PROPOSED`)

```mermaid
flowchart TD
    subgraph Desktop["Electron Desktop App (Windows x64) [PROPOSED]"]
        UI["React + PDF.js Renderer\n(Intake, EvidenceViewer, Findings, Replace)"]
        Preload["Context-Isolated Preload Bridge"]
        Main["Electron Main + IPC + Ephemeral Workspace"]
        SidecarMgr["Sidecar Process Manager"]
    end

    subgraph Engine["Python Sidecar (PyInstaller + Tesseract) [PROPOSED]"]
        RPC["NDJSON stdio Protocol\n(health, audit_packet, replace_document, shutdown)"]
        Ingest["Vector + Local OCR Extraction"]
        Norm["Normalizers & Confidence Calibration"]
        Rules["Deterministic Slot & Cross-Doc Rules"]
        Redact["PII Redaction & Report Export"]
    end

    UI <--> Preload <--> Main <--> SidecarMgr <--> RPC
    RPC --> Ingest --> Norm --> Rules --> Redact
```