/**
 * causal_verdict.test.ts
 *
 * Automated test suite for AXYRA Causal Verdict Zero-Knowledge circuit and Groth16 prover:
 *   1. Correct-witness proof generation & verification for 2 incident scenarios.
 *   2. Rejection of proof generation when private inputs are tampered (commitment mismatch).
 *   3. Proof verification failure when public signals are maliciously mutated.
 *   4. Low-confidence inputs generate proof confirming verdict = 0 (not confirmed).
 */

import { expect } from "chai";
import * as path from "path";
import * as fs from "fs";
import { ethers } from "ethers";
// @ts-ignore
import { buildPoseidon } from "circomlibjs";
// @ts-ignore
import * as snarkjs from "snarkjs";

const SCALE = 1_000_000;

describe("AXYRA Zero-Knowledge Causal Scoring Suite", function () {
  this.timeout(120000);

  let poseidon: any;
  const wasmPath = path.resolve(__dirname, "../build/causal_verdict_js/causal_verdict.wasm");
  const zkeyPath = path.resolve(__dirname, "../build/causal_verdict_final.zkey");
  const vkeyPath = path.resolve(__dirname, "../build/verification_key.json");

  // Production ensemble weights from weights.json:
  // w_temporal = 0.0475, w_dependency = 0.632, w_intermediate = 0.3205
  const W_TEMPORAL = Math.round(0.0475 * SCALE);
  const W_DEPENDENCY = Math.round(0.632 * SCALE);
  const W_INTERMEDIATE = Math.round(0.3205 * SCALE);
  const THRESHOLD = Math.round(0.40 * SCALE); // 40% confidence threshold

  before(async () => {
    poseidon = await buildPoseidon();
    expect(fs.existsSync(wasmPath), "Circuit WASM must exist").to.be.true;
    expect(fs.existsSync(zkeyPath), "ZKey must exist").to.be.true;
    expect(fs.existsSync(vkeyPath), "Verification key must exist").to.be.true;
  });

  function computeCommitment(sT: number, sD: number, sI: number, salt: bigint): string {
    const hash = poseidon([BigInt(sT), BigInt(sD), BigInt(sI), salt]);
    return poseidon.F.toString(hash);
  }

  describe("Scenario 1: Canonical Thermal Cascade (thermal_sensor -> heater_controller)", () => {
    it("should generate a valid Groth16 proof and verify successfully (verdict_confirmed = 1)", async () => {
      const s_temporal = Math.round(1.0 * SCALE);
      const s_dependency = Math.round(1.0 * SCALE);
      const s_intermediate = Math.round(1.0 * SCALE);
      const salt = BigInt(ethers.hexlify(ethers.randomBytes(31)));
      const commitment = computeCommitment(s_temporal, s_dependency, s_intermediate, salt);

      const inputs = {
        s_temporal: s_temporal.toString(),
        s_dependency: s_dependency.toString(),
        s_intermediate: s_intermediate.toString(),
        salt: salt.toString(),
        w_temporal: W_TEMPORAL.toString(),
        w_dependency: W_DEPENDENCY.toString(),
        w_intermediate: W_INTERMEDIATE.toString(),
        threshold: THRESHOLD.toString(),
        private_input_commitment: commitment,
      };

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(inputs, wasmPath, zkeyPath);
      expect(publicSignals[0]).to.equal("1", "High confidence must yield verdict_confirmed=1");
      expect(publicSignals[5]).to.equal(commitment, "Public signals must contain the commitment");

      const vKey = JSON.parse(fs.readFileSync(vkeyPath, "utf-8"));
      const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof);
      expect(verified).to.be.true;
    });

    it("should reject proof verification when public signals are tampered (mutated verdict)", async () => {
      const s_temporal = Math.round(1.0 * SCALE);
      const s_dependency = Math.round(1.0 * SCALE);
      const s_intermediate = Math.round(1.0 * SCALE);
      const salt = BigInt(ethers.hexlify(ethers.randomBytes(31)));
      const commitment = computeCommitment(s_temporal, s_dependency, s_intermediate, salt);

      const inputs = {
        s_temporal: s_temporal.toString(),
        s_dependency: s_dependency.toString(),
        s_intermediate: s_intermediate.toString(),
        salt: salt.toString(),
        w_temporal: W_TEMPORAL.toString(),
        w_dependency: W_DEPENDENCY.toString(),
        w_intermediate: W_INTERMEDIATE.toString(),
        threshold: THRESHOLD.toString(),
        private_input_commitment: commitment,
      };

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(inputs, wasmPath, zkeyPath);

      // Maliciously tamper with public signal: flip verdict from 1 to 0
      const tamperedSignals = [...publicSignals];
      tamperedSignals[0] = "0";

      const vKey = JSON.parse(fs.readFileSync(vkeyPath, "utf-8"));
      const verified = await snarkjs.groth16.verify(vKey, tamperedSignals, proof);
      expect(verified).to.be.false;
    });

    it("should reject proof generation when private score is tampered against original commitment", async () => {
      const s_temporal = Math.round(1.0 * SCALE);
      const s_dependency = Math.round(1.0 * SCALE);
      const s_intermediate = Math.round(1.0 * SCALE);
      const salt = BigInt(ethers.hexlify(ethers.randomBytes(31)));
      const commitment = computeCommitment(s_temporal, s_dependency, s_intermediate, salt);

      // Adversary attempts to use a different s_dependency than what was committed
      const tamperedDependency = Math.round(0.20 * SCALE);
      const inputs = {
        s_temporal: s_temporal.toString(),
        s_dependency: tamperedDependency.toString(), // Tampered!
        s_intermediate: s_intermediate.toString(),
        salt: salt.toString(),
        w_temporal: W_TEMPORAL.toString(),
        w_dependency: W_DEPENDENCY.toString(),
        w_intermediate: W_INTERMEDIATE.toString(),
        threshold: THRESHOLD.toString(),
        private_input_commitment: commitment, // Original commitment
      };

      let threw = false;
      try {
        await snarkjs.groth16.fullProve(inputs, wasmPath, zkeyPath);
      } catch (err) {
        threw = true;
      }
      expect(threw, "Witness generator must fail constraint check when commitment does not match inputs").to.be.true;
    });
  });

  describe("Scenario 2: Real Incident Replay — NASA Dellingr (UHF freeze -> EPS watchdog reset)", () => {
    it("should verify NASA Dellingr causal link with verdict_confirmed = 1", async () => {
      const s_temporal = Math.round(1.0 * SCALE);
      const s_dependency = Math.round(0.75 * SCALE);
      const s_intermediate = Math.round(1.0 * SCALE);
      const salt = BigInt(ethers.hexlify(ethers.randomBytes(31)));
      const commitment = computeCommitment(s_temporal, s_dependency, s_intermediate, salt);

      const inputs = {
        s_temporal: s_temporal.toString(),
        s_dependency: s_dependency.toString(),
        s_intermediate: s_intermediate.toString(),
        salt: salt.toString(),
        w_temporal: W_TEMPORAL.toString(),
        w_dependency: W_DEPENDENCY.toString(),
        w_intermediate: W_INTERMEDIATE.toString(),
        threshold: THRESHOLD.toString(),
        private_input_commitment: commitment,
      };

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(inputs, wasmPath, zkeyPath);
      expect(publicSignals[0]).to.equal("1");

      const vKey = JSON.parse(fs.readFileSync(vkeyPath, "utf-8"));
      const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof);
      expect(verified).to.be.true;
    });
  });

  describe("Scenario 3: Non-Causal Independent Noise / Low Confidence Link", () => {
    it("should generate a valid proof confirming verdict_confirmed = 0 (insufficient evidence)", async () => {
      const s_temporal = Math.round(0.20 * SCALE);
      const s_dependency = Math.round(0.05 * SCALE);
      const s_intermediate = Math.round(0.0 * SCALE);
      const salt = BigInt(ethers.hexlify(ethers.randomBytes(31)));
      const commitment = computeCommitment(s_temporal, s_dependency, s_intermediate, salt);

      const inputs = {
        s_temporal: s_temporal.toString(),
        s_dependency: s_dependency.toString(),
        s_intermediate: s_intermediate.toString(),
        salt: salt.toString(),
        w_temporal: W_TEMPORAL.toString(),
        w_dependency: W_DEPENDENCY.toString(),
        w_intermediate: W_INTERMEDIATE.toString(),
        threshold: THRESHOLD.toString(),
        private_input_commitment: commitment,
      };

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(inputs, wasmPath, zkeyPath);
      expect(publicSignals[0]).to.equal("0", "Sub-threshold confidence must output verdict_confirmed=0");

      const vKey = JSON.parse(fs.readFileSync(vkeyPath, "utf-8"));
      const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof);
      expect(verified).to.be.true;
    });
  });
});
