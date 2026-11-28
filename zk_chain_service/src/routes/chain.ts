/**
 * chain.ts
 *
 * Express routes for On-Chain Audit Anchoring (Task B),
 * Parametric Insurance Payout (Task C), and Multi-Party Co-Signing (Task D).
 */

import { Router, Request, Response } from "express";
import * as path from "path";
import * as fs from "fs";
import { ethers } from "ethers";

export const chainRouter = Router();

function getDeployedAddresses(): Record<string, string> {
  const addrPath = path.resolve(__dirname, "../../deployed_addresses.json");
  if (fs.existsSync(addrPath)) {
    try {
      return JSON.parse(fs.readFileSync(addrPath, "utf-8"));
    } catch {
      return {};
    }
  }
  return {};
}

function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  return new ethers.JsonRpcProvider(rpcUrl);
}

function getDeployerWallet(): ethers.Wallet {
  const provider = getProvider();
  const pk = process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  return new ethers.Wallet(pk, provider);
}

function getRoleWallet(role: string): ethers.Wallet {
  const provider = getProvider();
  const roleKeys: Record<string, string> = {
    manufacturer: process.env.MANUFACTURER_PRIVATE_KEY || "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    operator: process.env.OPERATOR_PRIVATE_KEY || "0x5de4111afa1a4b94908f83103eb2f9580808c0195f7463f2b104928307297e29",
    insurer: process.env.INSURER_PRIVATE_KEY || "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    launch_provider: process.env.LAUNCH_PROVIDER_PRIVATE_KEY || "0x47e179ec197488593b124f80053e117362a6c85e91a540821e34e8e0e7a60743",
  };

  const key = roleKeys[role.toLowerCase()];
  if (!key) {
    throw new Error(`Unknown stakeholder role: '${role}'. Expected one of: manufacturer, operator, insurer, launch_provider.`);
  }
  return new ethers.Wallet(key, provider);
}

function toBytes32(str: string): string {
  if (str.startsWith("0x") && str.length === 66) {
    return str;
  }
  if (/^[a-fA-F0-9]{64}$/.test(str)) {
    return "0x" + str;
  }
  return ethers.id(str);
}

// -----------------------------------------------------------------------------
// TASK B: Audit Anchor Endpoints
// -----------------------------------------------------------------------------

const AUDIT_ANCHOR_ABI = [
  "function anchor(bytes32 entryHash, string calldata eventType) external",
  "function isAnchored(bytes32 entryHash) external view returns (bool, uint256)",
  "function anchoredAt(bytes32 entryHash) external view returns (uint256)",
  "event Anchored(bytes32 indexed entryHash, string eventType, uint256 timestamp, address submitter)",
];

chainRouter.post("/anchor", async (req: Request, res: Response) => {
  try {
    const { entryHash, eventType = "audit_log_entry" } = req.body;
    if (!entryHash) {
      return res.status(400).json({ error: "Missing entryHash" });
    }

    const addresses = getDeployedAddresses();
    const contractAddr = addresses.AuditAnchor;
    if (!contractAddr) {
      return res.status(503).json({ error: "AuditAnchor contract not deployed. Run deploy.ts first." });
    }

    const signer = getDeployerWallet();
    const contract = new ethers.Contract(contractAddr, AUDIT_ANCHOR_ABI, signer);

    const b32Hash = toBytes32(entryHash);

    // Check if already anchored
    const [alreadyAnchored, existingTs] = await contract.isAnchored(b32Hash);
    if (alreadyAnchored) {
      return res.json({
        anchored: true,
        alreadyExisted: true,
        timestamp: Number(existingTs),
        entryHash: b32Hash,
        contractAddress: contractAddr,
      });
    }

    const tx = await contract.anchor(b32Hash, eventType);
    const receipt = await tx.wait(1);

    const block = await signer.provider!.getBlock(receipt.blockNumber);
    const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);

    return res.json({
      anchored: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      timestamp,
      entryHash: b32Hash,
      contractAddress: contractAddr,
    });
  } catch (err: any) {
    console.error("[Chain] Anchor error:", err);
    return res.status(500).json({ error: err.message || "Failed to anchor on-chain" });
  }
});

chainRouter.get("/verify/:entryHash", async (req: Request, res: Response) => {
  try {
    const { entryHash } = req.params;
    const addresses = getDeployedAddresses();
    const contractAddr = addresses.AuditAnchor;
    if (!contractAddr) {
      return res.status(503).json({ error: "AuditAnchor contract not deployed" });
    }

    const provider = getProvider();
    const contract = new ethers.Contract(contractAddr, AUDIT_ANCHOR_ABI, provider);

    const b32Hash = toBytes32(entryHash);
    const [anchored, timestamp] = await contract.isAnchored(b32Hash);

    return res.json({
      anchored: Boolean(anchored),
      timestamp: Number(timestamp),
      entryHash: b32Hash,
      contractAddress: contractAddr,
    });
  } catch (err: any) {
    console.error("[Chain] Verify error:", err);
    return res.status(500).json({ error: err.message || "Failed to verify on-chain" });
  }
});

// -----------------------------------------------------------------------------
// TASK C: Parametric Insurance Policy Endpoints
// -----------------------------------------------------------------------------

const POLICY_ABI = [
  "function submitClaim(uint[2] calldata a, uint[2][2] calldata b, uint[2] calldata c, uint[6] calldata publicSignals) external",
  "function getPolicyStatus() external view returns (uint256, bool, uint256, bool, uint256, address, address, uint256, bytes32)",
  "function fund() external payable",
];

chainRouter.get("/policy-status", async (_req: Request, res: Response) => {
  try {
    const addresses = getDeployedAddresses();
    const contractAddr = addresses.ParametricPolicy;
    if (!contractAddr) {
      return res.status(503).json({ error: "ParametricPolicy contract not deployed" });
    }

    const provider = getProvider();
    const contract = new ethers.Contract(contractAddr, POLICY_ABI, provider);

    const [
      escrowBalance,
      isClaimed,
      payout,
      triggerVerdict,
      minConfidence,
      holder,
      underwriter,
      claimedAt,
      commitment,
    ] = await contract.getPolicyStatus();

    return res.json({
      contractAddress: contractAddr,
      escrowBalanceWei: escrowBalance.toString(),
      escrowBalanceEth: ethers.formatEther(escrowBalance),
      isClaimed: Boolean(isClaimed),
      payoutAmountEth: ethers.formatEther(payout),
      requiredVerdict: Boolean(triggerVerdict),
      minConfidenceScaled: Number(minConfidence),
      minConfidencePct: Number(minConfidence) / 10_000,
      policyholder: holder,
      insurer: underwriter,
      claimedAt: Number(claimedAt),
      claimCommitment: commitment,
    });
  } catch (err: any) {
    console.error("[Chain] Policy status error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch policy status" });
  }
});

chainRouter.post("/submit-claim", async (req: Request, res: Response) => {
  try {
    const { proof, publicSignals } = req.body;
    if (!proof || !publicSignals) {
      return res.status(400).json({ error: "Missing proof or publicSignals" });
    }

    const addresses = getDeployedAddresses();
    const contractAddr = addresses.ParametricPolicy;
    if (!contractAddr) {
      return res.status(503).json({ error: "ParametricPolicy contract not deployed" });
    }

    const signer = getDeployerWallet();
    const contract = new ethers.Contract(contractAddr, POLICY_ABI, signer);

    // Format Groth16 proof points for Solidity contract
    const a: [string, string] = [proof.pi_a[0], proof.pi_a[1]];
    const b: [[string, string], [string, string]] = [
      [proof.pi_b[0][1], proof.pi_b[0][0]],
      [proof.pi_b[1][1], proof.pi_b[1][0]],
    ];
    const c: [string, string] = [proof.pi_c[0], proof.pi_c[1]];

    const tx = await contract.submitClaim(a, b, c, publicSignals);
    const receipt = await tx.wait(1);

    return res.json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      claimed: true,
    });
  } catch (err: any) {
    console.error("[Chain] Claim submission error:", err);
    return res.status(400).json({ error: err.reason || err.message || "Failed to submit claim" });
  }
});

// -----------------------------------------------------------------------------
// TASK D: Multi-Party Co-Signing Endpoints
// -----------------------------------------------------------------------------

const MULTISIG_ABI = [
  "function registerIncident(bytes32 incidentId, address[] memory requiredSigners, uint256 threshold) external",
  "function signOff(bytes32 incidentId) external",
  "function isFinalized(bytes32 incidentId) external view returns (bool)",
  "function isRegistered(bytes32 incidentId) external view returns (bool)",
  "function getIncidentSigners(bytes32 incidentId) external view returns (address[], bool[], uint256, uint256, bool)",
];

chainRouter.post("/register-incident", async (req: Request, res: Response) => {
  try {
    const { incidentId, signers, threshold = 3 } = req.body;
    if (!incidentId) {
      return res.status(400).json({ error: "Missing incidentId" });
    }

    const addresses = getDeployedAddresses();
    const contractAddr = addresses.MultiSigSignOff;
    if (!contractAddr) {
      return res.status(503).json({ error: "MultiSigSignOff contract not deployed" });
    }

    const signer = getDeployerWallet();
    const contract = new ethers.Contract(contractAddr, MULTISIG_ABI, signer);
    const b32Id = toBytes32(incidentId);

    const isReg = await contract.isRegistered(b32Id);
    if (isReg) {
      return res.json({ registered: true, alreadyExisted: true, incidentId: b32Id });
    }

    // Default 4 role addresses if none provided
    const requiredSigners = signers || [
      getRoleWallet("manufacturer").address,
      getRoleWallet("operator").address,
      getRoleWallet("insurer").address,
      getRoleWallet("launch_provider").address,
    ];

    const tx = await contract.registerIncident(b32Id, requiredSigners, threshold);
    const receipt = await tx.wait(1);

    return res.json({
      registered: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      incidentId: b32Id,
      threshold,
      signers: requiredSigners,
    });
  } catch (err: any) {
    console.error("[Chain] Register incident error:", err);
    return res.status(500).json({ error: err.reason || err.message });
  }
});

chainRouter.post("/sign-off", async (req: Request, res: Response) => {
  try {
    const { incidentId, role } = req.body;
    if (!incidentId || !role) {
      return res.status(400).json({ error: "Missing incidentId or role" });
    }

    const addresses = getDeployedAddresses();
    const contractAddr = addresses.MultiSigSignOff;
    if (!contractAddr) {
      return res.status(503).json({ error: "MultiSigSignOff contract not deployed" });
    }

    const b32Id = toBytes32(incidentId);
    const roleSigner = getRoleWallet(role);
    const contract = new ethers.Contract(contractAddr, MULTISIG_ABI, roleSigner);

    // Auto-register with default quorum if not yet registered
    const isReg = await contract.isRegistered(b32Id);
    if (!isReg) {
      const deployer = getDeployerWallet();
      const adminContract = new ethers.Contract(contractAddr, MULTISIG_ABI, deployer);
      const defaultSigners = [
        getRoleWallet("manufacturer").address,
        getRoleWallet("operator").address,
        getRoleWallet("insurer").address,
        getRoleWallet("launch_provider").address,
      ];
      const regTx = await adminContract.registerIncident(b32Id, defaultSigners, 3);
      await regTx.wait(1);
    }

    const tx = await contract.signOff(b32Id);
    const receipt = await tx.wait(1);

    const finalized = await contract.isFinalized(b32Id);

    return res.json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      role,
      signerAddress: roleSigner.address,
      finalized,
    });
  } catch (err: any) {
    console.error("[Chain] Sign-off error:", err);
    return res.status(400).json({ error: err.reason || err.message });
  }
});

chainRouter.get("/incident-signers/:incidentId", async (req: Request, res: Response) => {
  try {
    const { incidentId } = req.params;
    const addresses = getDeployedAddresses();
    const contractAddr = addresses.MultiSigSignOff;
    if (!contractAddr) {
      return res.status(503).json({ error: "MultiSigSignOff contract not deployed" });
    }

    const provider = getProvider();
    const contract = new ethers.Contract(contractAddr, MULTISIG_ABI, provider);
    const b32Id = toBytes32(incidentId);

    const isReg = await contract.isRegistered(b32Id);
    if (!isReg) {
      return res.json({
        registered: false,
        incidentId: b32Id,
        signers: [],
        signed: [],
        signatureCount: 0,
        threshold: 3,
        finalized: false,
      });
    }

    const [signers, signed, signatureCount, threshold, finalized] =
      await contract.getIncidentSigners(b32Id);

    const roles = ["manufacturer", "operator", "insurer", "launch_provider"];
    const signersWithStatus = signers.map((addr: string, idx: number) => ({
      address: addr,
      role: roles[idx] || `role_${idx}`,
      hasSigned: signed[idx],
    }));

    return res.json({
      registered: true,
      incidentId: b32Id,
      signers: signersWithStatus,
      signatureCount: Number(signatureCount),
      threshold: Number(threshold),
      finalized: Boolean(finalized),
    });
  } catch (err: any) {
    console.error("[Chain] Incident signers fetch error:", err);
    return res.status(500).json({ error: err.message });
  }
});
