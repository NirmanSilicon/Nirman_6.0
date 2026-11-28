# ARCHITECTURE.md — System Architecture (`algoryxz`)

**Baseline Verification (`VERIFIED`):** As of commit `06c65b4` on `algoryxz`, the branch contains only `.gitignore` and `algoryxz.txt`. No application components exist yet.

---

## 1. Current Repository & Collaboration Topology (`VERIFIED`)

```mermaid
flowchart TD
    Upstream["NirmanSilicon/Nirman_6.0\n(upstream/main & upstream/algoryxz)"]
    Fork["Smarak-padhi/Nirman_6.0\n(origin/algoryxz)"]
    Local["Local Clone: C:/Users/smara/Desktop/NIRMAN_6.0\n(branch: docs/governance-and-kickoff-baseline -> algoryxz)"]
    Members["Teammate Feature Branches\n(feature/member-name-feature)"]

    Members -->|"PRs reviewed by Smarak Padhi"| Fork
    Local -->|"PR after validation"| Fork
    Fork -->|"Final PR: algoryxz -> upstream/algoryxz\n(NEVER main)"| Upstream
```

## 2. Target Application Architecture (`PROPOSED` — Placeholder Until ADR-001)
*(Do not treat this placeholder as implemented code.)*

```mermaid
flowchart LR
    Client["Client / UI\n[PROPOSED]"] <-->|"REST / IPC / RPC\n[PROPOSED]"| Service["Backend / Core Logic\n[PROPOSED]"]
    Service <-->|"Read/Write\n[PROPOSED]"| Store["Data / Model Layer\n[PROPOSED]"]
```

Once ADR-001 is approved in `DECISIONS.md`, update this diagram with exact verified modules, protocols, and file paths.