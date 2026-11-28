/**
 * deploy_policy.ts
 *
 * Deploys and pre-funds the ParametricPolicy insurance contract (Task C).
 * Links to the deployed CausalVerdictVerifier contract (Task A).
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("==================================================================");
  console.log("  AXYRA Parametric Insurance Policy Deployment Suite              ");
  console.log("==================================================================");

  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const policyholder = signers[1] ? signers[1].address : deployer.address;
  const insurer = deployer.address;

  const addrFilePath = path.resolve(__dirname, "../deployed_addresses.json");
  if (!fs.existsSync(addrFilePath)) {
    throw new Error("deployed_addresses.json not found. Run deploy.ts first.");
  }
  const deployedAddresses = JSON.parse(fs.readFileSync(addrFilePath, "utf-8"));

  const verifierAddr = deployedAddresses.CausalVerdictVerifier;
  if (!verifierAddr) {
    throw new Error("CausalVerdictVerifier address not found in deployed_addresses.json. Run setup_ceremony.ts and deploy.ts first.");
  }

  const payoutAmount = ethers.parseEther("0.25"); // 0.25 ETH payout per incident
  const requiredVerdict = true; // Verdict confirmed = 1
  const minConfidenceScaled = 800000; // 80% confidence (scaled by 10^6)

  console.log(`Deployer / Insurer: ${insurer}`);
  console.log(`Policyholder: ${policyholder}`);
  console.log(`Verifier Contract: ${verifierAddr}`);
  console.log(`Payout Amount: ${ethers.formatEther(payoutAmount)} ETH`);
  console.log(`Min Confidence: 80% (${minConfidenceScaled})`);

  const PolicyFactory = await ethers.getContractFactory("ParametricPolicy");
  const policy = await PolicyFactory.deploy(
    policyholder,
    insurer,
    payoutAmount,
    requiredVerdict,
    minConfidenceScaled,
    verifierAddr
  );
  await policy.waitForDeployment();
  const policyAddr = await policy.getAddress();
  console.log(`ParametricPolicy deployed to: ${policyAddr}`);

  // Pre-fund escrow with 1.0 ETH
  console.log("Pre-funding policy escrow with 1.0 ETH...");
  const fundTx = await policy.fund({ value: ethers.parseEther("1.0") });
  await fundTx.wait(1);

  const balance = await ethers.provider.getBalance(policyAddr);
  console.log(`Policy escrow balance: ${ethers.formatEther(balance)} ETH`);

  deployedAddresses.ParametricPolicy = policyAddr;
  fs.writeFileSync(addrFilePath, JSON.stringify(deployedAddresses, null, 2), "utf-8");
  console.log(`Updated deployed_addresses.json with ParametricPolicy: ${policyAddr}`);
}

main().catch((err) => {
  console.error("Policy deployment failed:", err);
  process.exit(1);
});
