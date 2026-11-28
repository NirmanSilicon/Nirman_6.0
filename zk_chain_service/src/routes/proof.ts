/**
 * proof.ts
 *
 * Express routes for Zero-Knowledge commitment, Groth16 witness generation,
 * and proof verification.
 */

import { Router, Request, Response } from "express";
import * as path from "path";
import * as fs from "fs";
import { ethers } from "ethers";
// @ts-ignore
import { buildPoseidon } from "circomlibjs";
// @ts-ignore
import * as snarkjs from "snarkjs";

export const proofRouter = Router();

export const SCALE_FACTOR = 1_000_000; // 10^6 fixed-point scaling

let poseidonInstance: any = null;
async function getPoseidon() {
  if (!poseidonInstance) {
    poseidonInstance = await buildPoseidon();
  }
  return poseidonInstance;
}

function getVerificationKey() {
  const vkeyPath = path.resolve(__dirname, "../../build/verification_key.json");
  if (!fs.existsSync(vkeyPath)) {
    throw new Error(`Verification key not found at ${vkeyPath}. Run setup_ceremony.ts first.`);
  }
  return JSON.parse(fs.readFileSync(vkeyPath, "utf-8"));
}

/**
 * POST /zk/commit
 * Takes raw private scores [0.0, 1.0], scales them by 10^6,
 * generates a random blinding salt, and returns {commitment, salt}.
 *
 * NOTE: Private scores and salt are NOT stored by this service.
 */
proofRouter.post("/commit", async (req: Request, res: Response) => {
  try {
    const { s_temporal, s_dependency, s_intermediate } = req.body;

    if (
      s_temporal === undefined ||
      s_dependency === undefined ||
      s_intermediate === undefined
    ) {
      return res.status(400).json({ error: "Missing required scores: s_temporal, s_dependency, s_intermediate" });
    }

    const sT = Math.round(Number(s_temporal) * SCALE_FACTOR);
    const sD = Math.round(Number(s_dependency) * SCALE_FACTOR);
    const sI = Math.round(Number(s_intermediate) * SCALE_FACTOR);

    // Generate random 248-bit blinding salt (within bn128 scalar field)
    const randomBytes = ethers.randomBytes(31);
    const saltBigInt = BigInt(ethers.hexlify(randomBytes));

    const poseidon = await getPoseidon();
    const hash = poseidon([BigInt(sT), BigInt(sD), BigInt(sI), saltBigInt]);
    const commitment = poseidon.F.toString(hash);

    return res.json({
      commitment,
      salt: saltBigInt.toString(),
      scalingFactor: SCALE_FACTOR,
    });
  } catch (err: any) {
    console.error("[ZK] Commitment error:", err);
    return res.status(500).json({ error: err.message || "Failed to generate commitment" });
  }
});

/**
 * POST /zk/prove
 * Given private inputs + salt + commitment + public weights/threshold,
 * generates Groth16 witness and proof.
 *
 * NOTE: Sensitive private inputs (s_temporal, s_dependency, s_intermediate, salt)
 * are used exclusively in-memory for witness synthesis and are never logged or stored.
 */
proofRouter.post("/prove", async (req: Request, res: Response) => {
  try {
    const {
      s_temporal,
      s_dependency,
      s_intermediate,
      salt,
      commitment,
      w_temporal,
      w_dependency,
      w_intermediate,
      threshold = 0.40,
    } = req.body;

    if (!commitment || !salt) {
      return res.status(400).json({ error: "Missing commitment or salt" });
    }

    const wasmPath = path.resolve(__dirname, "../../build/causal_verdict_js/causal_verdict.wasm");
    const zkeyPath = path.resolve(__dirname, "../../build/causal_verdict_final.zkey");

    if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
      return res.status(500).json({ error: "Compiled circuit artifacts not found. Run setup_ceremony.ts first." });
    }

    // Scale inputs to fixed-point integers
    const circuitInputs = {
      s_temporal: Math.round(Number(s_temporal) * SCALE_FACTOR).toString(),
      s_dependency: Math.round(Number(s_dependency) * SCALE_FACTOR).toString(),
      s_intermediate: Math.round(Number(s_intermediate) * SCALE_FACTOR).toString(),
      salt: salt.toString(),
      w_temporal: Math.round(Number(w_temporal) * SCALE_FACTOR).toString(),
      w_dependency: Math.round(Number(w_dependency) * SCALE_FACTOR).toString(),
      w_intermediate: Math.round(Number(w_intermediate) * SCALE_FACTOR).toString(),
      threshold: Math.round(Number(threshold) * SCALE_FACTOR).toString(),
      private_input_commitment: commitment.toString(),
    };

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      circuitInputs,
      wasmPath,
      zkeyPath
    );

    const verdictConfirmed = publicSignals[0] === "1";

    return res.json({
      proof,
      publicSignals,
      verdictConfirmed,
      scalingFactor: SCALE_FACTOR,
      commitment,
      threshold,
    });
  } catch (err: any) {
    console.error("[ZK] Proof generation error:", err.message);
    return res.status(400).json({
      error: `Proof generation failed: ${err.message || "Constraint mismatch or invalid commitment"}`,
    });
  }
});

/**
 * POST /zk/verify
 * Verifies a Groth16 proof using the verification key.
 */
proofRouter.post("/verify", async (req: Request, res: Response) => {
  try {
    const { proof, publicSignals } = req.body;

    if (!proof || !publicSignals) {
      return res.status(400).json({ error: "Missing proof or publicSignals" });
    }

    const vKey = getVerificationKey();
    const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);

    return res.json({
      valid: Boolean(isValid),
      verdictConfirmed: publicSignals[0] === "1",
      publicSignals,
    });
  } catch (err: any) {
    console.error("[ZK] Verification error:", err);
    return res.status(400).json({ valid: false, error: err.message });
  }
});
