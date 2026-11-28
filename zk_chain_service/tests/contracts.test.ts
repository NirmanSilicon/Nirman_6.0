/**
 * contracts.test.ts
 *
 * Automated tests for AXYRA Smart Contracts:
 *   - Task B: AuditAnchor (anchoring, idempotency, verification)
 *   - Task C: ParametricPolicy (funding, real Groth16 claim payout, negative case, double-claim protection)
 *   - Task D: MultiSigSignOff (registration, authorized role signing, threshold finality)
 */

import { expect } from "chai";
import { ethers } from "hardhat";
import * as path from "path";
import * as fs from "fs";
// @ts-ignore
import { buildPoseidon } from "circomlibjs";
// @ts-ignore
import * as snarkjs from "snarkjs";

const SCALE = 1_000_000;

describe("AXYRA Smart Contracts Suite", function () {
  this.timeout(120000);

  let deployer: any;
  let policyholder: any;
  let insurer: any;
  let manufacturer: any;
  let operator: any;
  let launchProvider: any;
  let outsider: any;

  let auditAnchor: any;
  let verifier: any;
  let policy: any;
  let multiSig: any;

  let poseidon: any;
  const wasmPath = path.resolve(__dirname, "../build/causal_verdict_js/causal_verdict.wasm");
  const zkeyPath = path.resolve(__dirname, "../build/causal_verdict_final.zkey");

  before(async () => {
    [deployer, policyholder, insurer, manufacturer, operator, launchProvider, outsider] =
      await ethers.getSigners();
    poseidon = await buildPoseidon();

    // 1. Deploy AuditAnchor
    const AuditAnchor = await ethers.getContractFactory("AuditAnchor");
    auditAnchor = await AuditAnchor.deploy();
    await auditAnchor.waitForDeployment();

    // 2. Deploy CausalVerdictVerifier
    const Verifier = await ethers.getContractFactory("CausalVerdictVerifier");
    verifier = await Verifier.deploy();
    await verifier.waitForDeployment();

    // 3. Deploy MultiSigSignOff
    const MultiSig = await ethers.getContractFactory("MultiSigSignOff");
    multiSig = await MultiSig.deploy();
    await multiSig.waitForDeployment();

    // 4. Deploy ParametricPolicy
    const payoutAmount = ethers.parseEther("0.5");
    const requiredVerdict = true;
    const minConfidenceScaled = 800000; // 80%
    const verifierAddr = await verifier.getAddress();

    const Policy = await ethers.getContractFactory("ParametricPolicy");
    policy = await Policy.deploy(
      policyholder.address,
      insurer.address,
      payoutAmount,
      requiredVerdict,
      minConfidenceScaled,
      verifierAddr
    );
    await policy.waitForDeployment();

    // Fund policy with 1.0 ETH
    await policy.connect(insurer).fund({ value: ethers.parseEther("1.0") });
  });

  // ---------------------------------------------------------------------------
  // TASK B: AuditAnchor Tests
  // ---------------------------------------------------------------------------
  describe("Task B — AuditAnchor Contract", () => {
    const testHash = ethers.keccak256(ethers.toUtf8Bytes("incident_fmg_024_dossier_data"));

    it("should successfully anchor an audit entry and emit event", async () => {
      const tx = await auditAnchor.anchor(testHash, "incident_finalized");
      await expect(tx)
        .to.emit(auditAnchor, "Anchored")
        .withArgs(testHash, "incident_finalized", (val: any) => val > 0, deployer.address);

      const [isAnchored, timestamp] = await auditAnchor.isAnchored(testHash);
      expect(isAnchored).to.be.true;
      expect(Number(timestamp)).to.be.greaterThan(0);
    });

    it("should return false for unanchored entries", async () => {
      const unknownHash = ethers.keccak256(ethers.toUtf8Bytes("random_unknown_entry"));
      const [isAnchored, timestamp] = await auditAnchor.isAnchored(unknownHash);
      expect(isAnchored).to.be.false;
      expect(Number(timestamp)).to.equal(0);
    });

    it("should revert if attempting to re-anchor the same hash", async () => {
      await expect(
        auditAnchor.anchor(testHash, "duplicate_attempt")
      ).to.be.revertedWith("Entry already anchored");
    });
  });

  // ---------------------------------------------------------------------------
  // TASK C: ParametricPolicy Tests
  // ---------------------------------------------------------------------------
  describe("Task C — ParametricPolicy Contract", () => {
    it("should verify live escrow balance is funded", async () => {
      const balance = await ethers.provider.getBalance(await policy.getAddress());
      expect(balance).to.equal(ethers.parseEther("1.0"));
    });

    it("should reject claim when given a proof with verdict_confirmed = 0", async () => {
      // Generate a valid proof with low scores (sub-threshold)
      const s_temporal = Math.round(0.20 * SCALE);
      const s_dependency = Math.round(0.10 * SCALE);
      const s_intermediate = Math.round(0.10 * SCALE);
      const salt = BigInt(ethers.hexlify(ethers.randomBytes(31)));

      const hash = poseidon([BigInt(s_temporal), BigInt(s_dependency), BigInt(s_intermediate), salt]);
      const commitment = poseidon.F.toString(hash);

      const inputs = {
        s_temporal: s_temporal.toString(),
        s_dependency: s_dependency.toString(),
        s_intermediate: s_intermediate.toString(),
        salt: salt.toString(),
        w_temporal: Math.round(0.0475 * SCALE).toString(),
        w_dependency: Math.round(0.632 * SCALE).toString(),
        w_intermediate: Math.round(0.3205 * SCALE).toString(),
        threshold: Math.round(0.80 * SCALE).toString(),
        private_input_commitment: commitment,
      };

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(inputs, wasmPath, zkeyPath);
      expect(publicSignals[0]).to.equal("0", "Sub-threshold inputs yield verdict 0");

      const a: [string, string] = [proof.pi_a[0], proof.pi_a[1]];
      const b: [[string, string], [string, string]] = [
        [proof.pi_b[0][1], proof.pi_b[0][0]],
        [proof.pi_b[1][1], proof.pi_b[1][0]],
      ];
      const c: [string, string] = [proof.pi_c[0], proof.pi_c[1]];

      await expect(
        policy.submitClaim(a, b, c, publicSignals)
      ).to.be.revertedWith("Verdict does not satisfy policy criteria");
    });

    it("should verify a valid high-confidence ZK proof and pay out escrow to policyholder", async () => {
      // High-confidence scores (1.0, 1.0, 1.0) -> confidence = 1.0 >= 0.80
      const s_temporal = Math.round(1.0 * SCALE);
      const s_dependency = Math.round(1.0 * SCALE);
      const s_intermediate = Math.round(1.0 * SCALE);
      const salt = BigInt(ethers.hexlify(ethers.randomBytes(31)));

      const hash = poseidon([BigInt(s_temporal), BigInt(s_dependency), BigInt(s_intermediate), salt]);
      const commitment = poseidon.F.toString(hash);

      const inputs = {
        s_temporal: s_temporal.toString(),
        s_dependency: s_dependency.toString(),
        s_intermediate: s_intermediate.toString(),
        salt: salt.toString(),
        w_temporal: Math.round(0.0475 * SCALE).toString(),
        w_dependency: Math.round(0.632 * SCALE).toString(),
        w_intermediate: Math.round(0.3205 * SCALE).toString(),
        threshold: Math.round(0.80 * SCALE).toString(),
        private_input_commitment: commitment,
      };

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(inputs, wasmPath, zkeyPath);
      expect(publicSignals[0]).to.equal("1");

      const a: [string, string] = [proof.pi_a[0], proof.pi_a[1]];
      const b: [[string, string], [string, string]] = [
        [proof.pi_b[0][1], proof.pi_b[0][0]],
        [proof.pi_b[1][1], proof.pi_b[1][0]],
      ];
      const c: [string, string] = [proof.pi_c[0], proof.pi_c[1]];

      const initialPolicyholderBalance = await ethers.provider.getBalance(policyholder.address);

      const tx = await policy.submitClaim(a, b, c, publicSignals);
      await expect(tx).to.emit(policy, "ClaimPaid");

      const postPolicyholderBalance = await ethers.provider.getBalance(policyholder.address);
      expect(postPolicyholderBalance - initialPolicyholderBalance).to.equal(ethers.parseEther("0.5"));

      const policyBalanceAfter = await ethers.provider.getBalance(await policy.getAddress());
      expect(policyBalanceAfter).to.equal(ethers.parseEther("0.5"));
    });

    it("should revert if double-claiming the same policy", async () => {
      // Re-submitting any claim must revert
      await expect(
        policy.submitClaim(
          ["0", "0"],
          [["0", "0"], ["0", "0"]],
          ["0", "0"],
          ["0", "0", "0", "0", "0", "0"]
        )
      ).to.be.revertedWith("Policy already claimed");
    });
  });

  // ---------------------------------------------------------------------------
  // TASK D: MultiSigSignOff Tests
  // ---------------------------------------------------------------------------
  describe("Task D — MultiSigSignOff Contract", () => {
    const incidentId = ethers.id("inc_orbit_cascade_001");
    let signersList: string[];

    before(() => {
      signersList = [
        manufacturer.address,
        operator.address,
        insurer.address,
        launchProvider.address,
      ];
    });

    it("should register incident with 4 signers and threshold of 3", async () => {
      const tx = await multiSig.registerIncident(incidentId, signersList, 3);
      await expect(tx).to.emit(multiSig, "IncidentRegistered");

      const isFinal = await multiSig.isFinalized(incidentId);
      expect(isFinal).to.be.false;
    });

    it("should reject sign-off from unauthorized address", async () => {
      await expect(
        multiSig.connect(outsider).signOff(incidentId)
      ).to.be.revertedWith("Caller is not a registered signer for this incident");
    });

    it("should record authorized signers and finalize when threshold (3-of-4) is met", async () => {
      // Signer 1: Manufacturer
      await multiSig.connect(manufacturer).signOff(incidentId);
      expect(await multiSig.isFinalized(incidentId)).to.be.false;

      // Duplicate sign from manufacturer must revert
      await expect(
        multiSig.connect(manufacturer).signOff(incidentId)
      ).to.be.revertedWith("Signer has already signed off on this incident");

      // Signer 2: Operator
      await multiSig.connect(operator).signOff(incidentId);
      expect(await multiSig.isFinalized(incidentId)).to.be.false;

      // Signer 3: Insurer -> Threshold (3) reached!
      const finalTx = await multiSig.connect(insurer).signOff(incidentId);
      await expect(finalTx).to.emit(multiSig, "IncidentFinalized");

      expect(await multiSig.isFinalized(incidentId)).to.be.true;
    });
  });
});
