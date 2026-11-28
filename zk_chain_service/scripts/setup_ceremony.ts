/**
 * setup_ceremony.ts
 *
 * Local Powers-of-Tau and Groth16 Setup Ceremony for AXYRA Causal Verdict Circuit.
 *
 * SECURITY NOTICE:
 * This script runs a LOCAL, single-contributor, developer-mode trusted setup.
 * It is intended exclusively for hackathon evaluation, testnet demonstrations,
 * and automated CI verification.
 * In a true production deployment, Groth16 requires a distributed Multi-Party
 * Computation (MPC) ceremony with public toxic-waste destruction to prevent
 * any single participant from computing false proofs.
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const rootDir = path.resolve(__dirname, "..");
const buildDir = path.join(rootDir, "build");
const contractsDir = path.join(rootDir, "contracts");
const binDir = path.join(rootDir, "bin");
const circomBin = process.platform === "win32"
  ? path.join(binDir, "circom.exe")
  : "circom";

async function main() {
  console.log("==================================================================");
  console.log("  AXYRA Zero-Knowledge Trusted Setup Ceremony (Dev Mode)          ");
  console.log("==================================================================");

  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // 1. Compile Circom Circuit
  console.log("\n>>> Step 1/5: Compiling Circom Circuit...");
  const circuitFile = path.join(rootDir, "circuits", "causal_verdict.circom");
  const compileCmd = `"${circomBin}" "${circuitFile}" --r1cs --wasm --sym -o "${buildDir}" -l "${path.join(rootDir, "node_modules")}"`;
  console.log(compileCmd);
  execSync(compileCmd, { stdio: "inherit" });

  const r1csFile = path.join(buildDir, "causal_verdict.r1cs");
  if (!fs.existsSync(r1csFile)) {
    throw new Error(`Circuit compilation failed: ${r1csFile} not found.`);
  }

  // 2. Powers-of-Tau Ceremony (Phase 1)
  console.log("\n>>> Step 2/5: Initializing Powers-of-Tau Ceremony (Phase 1)...");
  const pot0 = path.join(buildDir, "pot12_0000.ptau");
  const pot1 = path.join(buildDir, "pot12_0001.ptau");
  const potFinal = path.join(buildDir, "pot12_final.ptau");

  if (!fs.existsSync(potFinal)) {
    console.log("Creating new bn128 12 ptau...");
    execSync(`npx snarkjs powersoftau new bn128 12 "${pot0}" -v`, { stdio: "inherit" });

    console.log("Contributing random entropy (single-party dev mode)...");
    execSync(`npx snarkjs powersoftau contribute "${pot0}" "${pot1}" --name="Axyra Local Dev" -v -e="axyra_cubesat_dev_entropy_seed_9981"`, { stdio: "inherit" });

    console.log("Preparing Phase 2 beacon...");
    execSync(`npx snarkjs powersoftau prepare phase2 "${pot1}" "${potFinal}" -v`, { stdio: "inherit" });
  } else {
    console.log(`Reusing existing Powers-of-Tau file: ${potFinal}`);
  }

  // 3. Groth16 Circuit Setup (Phase 2)
  console.log("\n>>> Step 3/5: Groth16 Circuit Setup (Phase 2)...");
  const zkey0 = path.join(buildDir, "causal_verdict_0000.zkey");
  const zkeyFinal = path.join(buildDir, "causal_verdict_final.zkey");

  execSync(`npx snarkjs groth16 setup "${r1csFile}" "${potFinal}" "${zkey0}"`, { stdio: "inherit" });

  console.log("Contributing circuit-specific entropy...");
  execSync(`npx snarkjs zkey contribute "${zkey0}" "${zkeyFinal}" --name="Axyra Verifier Contributor" -v -e="axyra_causal_circuit_entropy_seed_4412"`, { stdio: "inherit" });

  // 4. Export Verification Key (JSON)
  console.log("\n>>> Step 4/5: Exporting Verification Key...");
  const vkeyFile = path.join(buildDir, "verification_key.json");
  execSync(`npx snarkjs zkey export verificationkey "${zkeyFinal}" "${vkeyFile}"`, { stdio: "inherit" });
  console.log(`Saved verification key to: ${vkeyFile}`);

  // 5. Export Solidity Verifier Contract
  console.log("\n>>> Step 5/5: Exporting Solidity Verifier Contract...");
  const verifierSol = path.join(contractsDir, "CausalVerdictVerifier.sol");
  execSync(`npx snarkjs zkey export solidityverifier "${zkeyFinal}" "${verifierSol}"`, { stdio: "inherit" });
  console.log(`Saved Solidity Verifier contract to: ${verifierSol}`);

  // Adjust pragma in exported contract to match project ^0.8.20 if needed
  let verifierCode = fs.readFileSync(verifierSol, "utf-8");
  verifierCode = verifierCode.replace(/pragma solidity \^?[0-9\.]+;/, "pragma solidity ^0.8.20;");
  // Ensure contract name is standard CausalVerdictVerifier
  verifierCode = verifierCode.replace(/contract Groth16Verifier/, "contract CausalVerdictVerifier");
  fs.writeFileSync(verifierSol, verifierCode, "utf-8");

  console.log("\n==================================================================");
  console.log("  Ceremony and Contract Export Completed Successfully!            ");
  console.log("==================================================================");
}

main().catch((err) => {
  console.error("Ceremony setup failed:", err);
  process.exit(1);
});
