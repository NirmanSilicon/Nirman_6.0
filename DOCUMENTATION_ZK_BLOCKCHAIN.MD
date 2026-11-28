# Cryptographic Provenance & Verification Extension (3-Tier Architecture)

### 📝 Architecture Changelog
- **2026-09-04**: **Decoupled 3-Tier Verification & Sovereign Offline Operation**:
  - **Tier 1 (Default Normal Operation)**: Local cryptographic audit & SHA-256 integrity signatures computed offline with zero external network egress (100% functional in air-gapped Sovereign Mode).
  - **Tier 2 (Optional Advanced Verification)**: Groth16 Zero-Knowledge proof generation via `causal_verdict.circom` validating that an approved causal verdict was produced under public model weights and confidence policy threshold without revealing internal model weights or proprietary flight telemetry. The circuit remains compact and focused—it does not put raw telemetry streams, full causal graphs, or ML models in-circuit.
  - **Tier 3 (Optional External Provenance)**: Best-effort asynchronous on-chain notary anchoring (`AuditAnchor.sol`), parametric insurance claim submission (`ParametricPolicy.sol`), and 3-of-4 multi-party threshold sign-off (`MultiSigSignOff.sol`) completely decoupled from the core investigative loop.
  - **Decoupled Incident Finality**: Standard incident transitions to `RESOLVED` operate reliably offline without blockchain stalls or dependencies. Multi-party on-chain consensus is strictly optional (`require_multisig=True`).
  - **Cached Reachability Probing**: `zk_client.py` performs cached service availability checks with 0.5s timeout and 15s TTL, eliminating network latency and connection error spam during local offline operations.
- **2026-09-02**: Implemented the initial Zero-Knowledge Causal Scoring & Multi-Party Verification Extension (Tasks A - D).

---

## 1. Architectural Overview & System Boundary

The AXYRA core causal genealogy, telemetry inference, and incident investigation pipeline operates **100% locally and offline**. Cryptographic provenance is provided via a 3-tier model where ZK proofs and blockchain anchoring serve as optional auxiliary extensions rather than blocking dependencies.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     SATELLITE / EDGE LAYER                                       │
│   Flight Telemetry Bus ──► Feature Extractor ──► Caelis Causal Engine                            │
│   (Private scores: S_temporal, S_dependency, S_intermediate evaluated locally and offline)       │
└──────────────────────────────────────────────────┬───────────────────────────────────────────────┘
                                                   │
                                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             PYTHON / DJANGO BACKEND LAYER (:8000)                                │
│   • Core Investigation Loop: 100% Offline (Sovereign Air-Gapped Mode Default)                   │
│   • Local Cryptographic Integrity: SHA-256 hash chains and deterministic signatures             │
│   • Optional ZK & Chain Client: backend/app/core/zk_client.py (cached non-blocking bridge)      │
│   • Status Transitions: Immediate local resolution; multi-sig gating is strictly optional        │
└──────────────────────────────────────────────────┬───────────────────────────────────────────────┘
                                                   │
                Optional Extension Boundary        │  (POST /zk/commit, POST /zk/prove)
                (Cached reachability probe)        │  (POST /chain/anchor, POST /chain/submit-claim)
                                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│              OPTIONAL PROVENANCE MICROSERVICE (:3001) [zk_chain_service] (Tier 2 & 3)             │
│   • Express + ethers.js v6 + snarkjs + hardhat                                                   │
│   • redactLogMiddleware: strips private inputs (s_temporal, s_dependency, etc.) from console     │
│   • circuits/causal_verdict.circom: Compact Groth16 zk-SNARK constraint system                   │
│   • contracts/: AuditAnchor.sol, ParametricPolicy.sol, MultiSigSignOff.sol, Verifier.sol         │
└───────────────────────────────────┬──────────────────────────────┬───────────────────────────────┘
                                    │                              │
                                    ▼                              ▼
┌──────────────────────────────────────────────────┐ ┌──────────────────────────────────────────────┐
│           LOCAL HARDHAT NODE (:8545)             │ │           POLYGON AMOY TESTNET               │
│   • Fast, deterministic demo execution           │ │   • Chain ID: 80002                          │
│   • Pre-seeded accounts for 4 roles              │ │   • RPC: https://rpc-amoy.polygon.technology │
│   • Instant block mining & zero-gas latency      │ │   • Polygonscan immutable verification       │
```

---

## 2. Mathematical Formulation of Zero-Knowledge Causal Scoring (Task A)

### 2.1 The Causal Scoring Function
The AXYRA causal engine scores causal propagation between candidate anomalies $u$ and $v$ using the calibrated consensus ensemble formula:

$$\text{Confidence}(u, v) = w_T \cdot S_{\text{temporal}} + w_D \cdot \text{PathStrength}(u,v) + w_I \cdot S_{\text{intermediate}}$$

Where:
- $w_T = 0.0475$ (Temporal precedence weight)
- $w_D = 0.6320$ (Dependency topology weight)
- $w_I = 0.3205$ (Intermediate telemetry consistency weight)
- $\text{Threshold} = 0.40$ (Default minimum causal threshold)

### 2.2 Fixed-Point Arithmetic in Prime Field $\mathbb{F}_p$
Circom circuits operate over the scalar field $\mathbb{F}_p$ of the BN128 elliptic curve, where:

$$p = 21888242871839275222246405745257275088548364400416034343698204186575808495617$$

Because floating-point numbers cannot be represented natively, all scores and weights are scaled by an integer factor $M = 10^6$:

$$\hat{S}_{\text{temporal}} = \lfloor S_{\text{temporal}} \cdot 10^6 \rfloor, \quad \hat{w}_T = \lfloor w_T \cdot 10^6 \rfloor$$

The scaled sum is:

$$\text{ScaledSum} = \hat{w}_T \cdot \hat{S}_{\text{temporal}} + \hat{w}_D \cdot \hat{S}_{\text{dependency}} + \hat{w}_I \cdot \hat{S}_{\text{intermediate}}$$

Since each term has scale $10^{12}$, computing the normalized confidence requires dividing by $10^6$:

$$\text{ScaledSum} = \text{Confidence} \cdot 10^6 + \text{Remainder}$$

Subject to the strict range constraint:

$$0 \le \text{Remainder} < 10^6$$

This division is verified inside the circuit using Circom witness computation with a 64-bit `LessThan(64)` constraint on the remainder, guaranteeing zero truncation overflow.

### 2.3 Poseidon Telemetry Commitment
To prove that the telemetry scores evaluated by the prover correspond to the actual observed satellite events without disclosing their magnitudes, the circuit enforces a 4-input Poseidon hash commitment:

$$\text{Commitment} = \text{Poseidon}(\hat{S}_{\text{temporal}}, \hat{S}_{\text{dependency}}, \hat{S}_{\text{intermediate}}, \text{Salt})$$

If an adversary attempts to prove a verdict using altered telemetry scores, the circuit constraint:

$$\text{Commitment}_{\text{circuit}} === \text{private\_input\_commitment}$$

fails immediately, aborting witness generation.

### 2.4 Groth16 zk-SNARK Verification Equation
The compiled circuit generates a Groth16 zero-knowledge proof consisting of three group elements:
- $\pi_a \in G_1$
- $\pi_b \in G_2$
- $\pi_c \in G_1$

Verification checks the pairing equality over the BN128 curve:

$$e(\pi_a, \pi_b) = e(\alpha, \beta) \cdot e\left(\sum_{i=0}^l x_i \gamma_i, \delta\right) \cdot e(\pi_c, \delta)$$

Where $x_i$ is the vector of 6 public signals:
$$x = [\text{verdict\_confirmed}, \hat{w}_T, \hat{w}_D, \hat{w}_I, \hat{\text{threshold}}, \text{Commitment}]$$

---

## 3. Smart Contract Specifications

### 3.1 `AuditAnchor.sol` (Task B)
Anchors cryptographic hash-chained audit log entries and Master Incident Dossier signatures to the blockchain.

```solidity
function anchor(bytes32 entryHash, string calldata eventType) external;
function isAnchored(bytes32 entryHash) external view returns (bool anchored, uint256 timestamp);
```
- **Guarantees**:
  - Idempotent and tamper-evident: Re-anchoring an existing hash reverts with `"Entry already anchored"`.
  - Immutable timestamp: Uses `block.timestamp` as non-repudiable proof of record creation.

### 3.2 `ParametricPolicy.sol` (Task C)
Automated parametric insurance policy escrowing funds and paying claims upon verified Groth16 proofs.

```solidity
constructor(
    address _policyholder,
    address _insurer,
    uint256 _payoutAmount,
    bool _requiredVerdict,
    uint256 _minConfidenceScaled,
    address _verifier
);
function submitClaim(
    uint[2] calldata a,
    uint[2][2] calldata b,
    uint[2] calldata c,
    uint[6] calldata input
) external returns (bool);
function fund() external payable;
```
- **Guarantees**:
  - Verification on-chain: Calls `ICausalVerdictVerifier(_verifier).verifyProof(a, b, c, input)`.
  - Double-claim protection: Sets `claimed = true` before transferring payout to prevent re-entrancy.
  - Policy enforcement: Reverts if `verdict_confirmed != 1` or confidence is sub-threshold.

### 3.3 `MultiSigSignOff.sol` (Task D)
Enforces distributed stakeholder consensus before an incident can achieve finality.

```solidity
function registerIncident(bytes32 incidentId, address[] calldata initialSigners, uint256 _threshold) external;
function signOff(bytes32 incidentId) external;
function isFinalized(bytes32 incidentId) external view returns (bool);
function getIncidentSigners(bytes32 incidentId) external view returns (address[] memory, bool[] memory, uint256);
```
- **Quorum Rules**:
  - 4 Stakeholder Roles: Satellite Manufacturer, Mission Operator, Space Insurer, Launch Provider.
  - Threshold: 3 of 4 required signatures to set `isFinalized = true`.
  - **Decoupled Incident Finality**: Standard flight operations resolve incidents locally and offline with SHA-256 signatures. The smart contract gate is evaluated only when the client explicitly requests multi-party on-chain consensus (`require_multisig=True`).

---

## 4. REST API Reference

| Method | Endpoint | Description | Privacy Redaction |
|---|---|---|---|
| `POST` | `/zk/commit` | Generates Poseidon commitment and cryptographic salt | Returns commitment & salt |
| `POST` | `/zk/prove` | Synthesizes witness and generates Groth16 proof bundle | Private scores redacted from logs |
| `POST` | `/zk/verify` | Verifies Groth16 proof against `verification_key.json` | Public signals only |
| `POST` | `/chain/anchor` | Submits hash to `AuditAnchor.sol` | Records block tx |
| `GET` | `/chain/verify/:hash` | Queries `AuditAnchor.sol` for entry timestamp | View function |
| `GET` | `/chain/policy-status` | Returns terms and live escrow balance of `ParametricPolicy.sol` | Read-only |
| `POST` | `/chain/submit-claim` | Submits Groth16 proof to policy contract for payout | Executes on-chain |
| `POST` | `/chain/sign-off` | Records caller's multi-sig sign-off for incident | Checks quorum |
| `POST` | `/api/incidents/<id>/zk-proof/` | High-level Django API exporting causal edge to ZK proof | Raw scores never returned |
| `POST` | `/api/incidents/<id>/status/` | Transitions lifecycle status (`INVESTIGATING` -> `RESOLVED`) | Local SHA-256 by default; multi-sig gated with `require_multisig=True` |

---

## 5. Verification & Test Suite

### 5.1 Circom Circuit & Smart Contract Unit Tests
The test suite is located in `zk_chain_service/tests/`:

```bash
cd zk_chain_service
npm test
```

**Results (15 of 15 Passing)**:
- `causal_verdict.test.ts`:
  1. Scenario 1 (Thermal Cascade): Groth16 proof generated and verified (`verdict_confirmed = 1`).
  2. Public Signal Tampering: Reject verification when public verdict is maliciously flipped.
  3. Private Witness Tampering: Constraint failure when private scores mismatch commitment.
  4. Scenario 2 (NASA Dellingr Replay): Causal link proven with `verdict_confirmed = 1`.
  5. Scenario 3 (Non-Causal Noise): Sub-threshold link generates proof confirming `verdict_confirmed = 0`.
- `contracts.test.ts`:
  6. AuditAnchor: Successful hash anchoring and event emission.
  7. AuditAnchor: Rejection of duplicate anchor attempts.
  8. ParametricPolicy: Verification of live escrow funding (1.0 ETH).
  9. ParametricPolicy: Rejection of claim with sub-threshold verdict.
  10. ParametricPolicy: Payout of 0.25 ETH to policyholder upon valid Groth16 proof submission.
  11. ParametricPolicy: Reversion on double-claim attempt.
  12. MultiSigSignOff: Incident registration with 4 signers and threshold of 3.
  13. MultiSigSignOff: Rejection of unauthorized signers.
  14. MultiSigSignOff: Rejection of duplicate signatures from the same role.
  15. MultiSigSignOff: Finalization triggered when 3-of-4 quorum is met.

### 5.2 Python/Django Integration Tests
```bash
cd backend
python manage.py test tests.test_zk_chain
```

**Results (4 of 4 Passing)**:
1. `test_zk_proof_generation_privacy_redaction`: Confirms `s_temporal`, `s_dependency`, `s_intermediate` are excluded from API responses.
2. `test_zk_proof_verification_endpoint`: Confirms circuit verification integration.
3. `test_anchor_incident_endpoint`: Confirms SHA-256 anchoring.
4. `test_resolved_status_gated_by_multisig`: Confirms offline local SHA-256 signature resolution for standard operations, and on-chain quorum gating when `require_multisig=True` is explicitly specified.

### 5.3 Audit Log Hash Chain Verification CLI
```bash
python ai_model/drift_monitor.py --verify-chain --check-onchain
```
Verifies both the local SHA-256 hash pointers and checks that every entry has an immutable on-chain record in `AuditAnchor.sol`.

---

## 6. Deployment & Configuration Switch

### 6.1 Local Hardhat Network (Default)
To run a local node and microservice:
```bash
# Terminal 1: Local Hardhat blockchain node
cd zk_chain_service
npm run hardhat:node

# Terminal 2: Deploy contracts and start microservice
npm run deploy
npm run deploy:policy
npm run start
```

### 6.2 Switching to Polygon Amoy Testnet
To switch from local development to the live Polygon Amoy public testnet:
1. Update `zk_chain_service/.env`:
   ```ini
   NETWORK_NAME=polygonAmoy
   RPC_URL=https://rpc-amoy.polygon.technology
   CHAIN_ID=80002
   DEPLOYER_PRIVATE_KEY=<your_funded_amoy_private_key>
   ```
2. Deploy to Amoy:
   ```bash
   npx hardhat run scripts/deploy.ts --network polygonAmoy
   npx hardhat run scripts/deploy_policy.ts --network polygonAmoy
   ```
Contract addresses will automatically be recorded in `deployed_addresses.json` and utilized across all services without code changes.
