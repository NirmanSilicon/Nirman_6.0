/**
 * redactLog.ts
 *
 * Privacy-preserving request logging middleware for AXYRA ZK service.
 *
 * ZERO-KNOWLEDGE PRIVACY GUARANTEE:
 * Proprietary and secret parameters (s_temporal, s_dependency, s_intermediate, salt)
 * MUST NEVER appear in stdout, disk logs, error traces, or monitoring streams.
 *
 * This middleware sanitizes and redacts all telemetry feature scores and cryptographic
 * blinding salts from request and response logging before anything reaches the console or disk.
 */

import { Request, Response, NextFunction } from "express";

const SENSITIVE_KEYS = new Set([
  "s_temporal",
  "s_dependency",
  "s_intermediate",
  "salt",
  "private_key",
  "privateKey",
]);

function sanitizeData(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeData(item));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key)) {
      sanitized[key] = "[REDACTED_ZERO_KNOWLEDGE_SECRET]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function redactLogMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const method = req.method;
  const path = req.path;

  // Clone and sanitize request body for safe logging
  const safeBody = req.body ? sanitizeData(req.body) : {};

  console.log(`[ZK_SERVICE] --> ${method} ${path} payload:`, JSON.stringify(safeBody));

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[ZK_SERVICE] <-- ${method} ${path} [${res.statusCode}] (${duration}ms)`);
  });

  next();
}
