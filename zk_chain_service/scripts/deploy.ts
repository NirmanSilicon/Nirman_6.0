/**
 * deploy.ts
 *
 * Deploys AXYRA core smart contracts:
 *   1. AuditAnchor (Task B)
 *   2. CausalVerdictVerifier (Task A)
 *   3. MultiSigSignOff (Task D)
 *
 * Saves deployed contract addresses to deployed_addresses.json.
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("==================================================================");
  console.log("  AXYRA Smart Contract Deployment Suite                           ");
  console.log("==================================================================");

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH\n`);

  const deployedAddresses: Record<string, string> = {};
  const addrFilePath = path.resolve(__dirname, "../deployed_addresses.json");

  // Load existing addresses if available
  if (fs.existsSync(addrFilePath)) {
    try {
      Object.assign(deployedAddresses, JSON.parse(fs.readFileSync(addrFilePath, "utf-8")));
    } catch {}
  }

  // 1. Deploy AuditAnchor
  console.log(">>> [1/3] Deploying AuditAnchor...");
  const AuditAnchorFactory = await ethers.getContractFactory("AuditAnchor");
  const auditAnchor = await AuditAnchorFactory.deploy();
  await auditAnchor.waitForDeployment();
  const auditAnchorAddr = await auditAnchor.getAddress();
  deployedAddresses.AuditAnchor = auditAnchorAddr;
  console.log(`AuditAnchor deployed to: ${auditAnchorAddr}`);

  // 2. Deploy CausalVerdictVerifier (if compiled)
  console.log("\n>>> [2/3] Deploying CausalVerdictVerifier...");
  try {
    const VerifierFactory = await ethers.getContractFactory("CausalVerdictVerifier");
    const verifier = await VerifierFactory.deploy();
    await verifier.waitForDeployment();
    const verifierAddr = await verifier.getAddress();
    deployedAddresses.CausalVerdictVerifier = verifierAddr;
    console.log(`CausalVerdictVerifier deployed to: ${verifierAddr}`);
  } catch (err: any) {
    console.warn("Could not deploy CausalVerdictVerifier (ensure setup_ceremony.ts has been run):", err.message);
  }

  // 3. Deploy MultiSigSignOff
  console.log("\n>>> [3/3] Deploying MultiSigSignOff...");
  const MultiSigFactory = await ethers.getContractFactory("MultiSigSignOff");
  const multiSig = await MultiSigFactory.deploy();
  await multiSig.waitForDeployment();
  const multiSigAddr = await multiSig.getAddress();
  deployedAddresses.MultiSigSignOff = multiSigAddr;
  console.log(`MultiSigSignOff deployed to: ${multiSigAddr}`);

  // Save deployed addresses
  fs.writeFileSync(addrFilePath, JSON.stringify(deployedAddresses, null, 2), "utf-8");
  console.log(`\nAll addresses saved to: ${addrFilePath}`);
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
