/**
 * server.ts
 *
 * Main Express server for AXYRA Zero-Knowledge & Blockchain Verification Microservice.
 * Runs on port 3001 (configurable via PORT env var).
 */

import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import { redactLogMiddleware } from "./middleware/redactLog";
import { proofRouter } from "./routes/proof";
import { chainRouter } from "./routes/chain";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Global middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(redactLogMiddleware);

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "axyra-zk-chain-service",
    network: process.env.NETWORK_NAME || "localhost",
    timestamp: new Date().toISOString(),
  });
});

// Mount ZK proving & verification routes
app.use("/zk", proofRouter);

// Mount on-chain anchoring, policy & multi-sig routes
app.use("/chain", chainRouter);

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[ZK_SERVICE] Unhandled error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error in ZK/Chain service",
  });
});

app.listen(PORT, () => {
  console.log("==================================================================");
  console.log(`  AXYRA ZK & Blockchain Microservice LIVE on port ${PORT}`);
  console.log(`  Target Network: ${process.env.NETWORK_NAME || "localhost"} (${process.env.RPC_URL || "http://127.0.0.1:8545"})`);
  console.log("==================================================================");
});

export default app;
