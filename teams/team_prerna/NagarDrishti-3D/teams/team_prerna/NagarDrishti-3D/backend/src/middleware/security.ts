import crypto from 'node:crypto';
import path from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in a few minutes.' },
});

export const sensitiveActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded for sensitive action. Please wait before retrying.' },
});

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_DOC_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png', 'text/csv']);

const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.msi', '.dll', '.js', '.mjs', '.cjs', '.html', '.htm', '.svg', '.php', '.py',
]);

export function sanitizeFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48) || 'file';
  return `${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${base}${ext}`;
}

export function computeSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function hasValidMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false;
  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }
  if (mimeType === 'image/webp') {
    return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  if (mimeType === 'application/pdf') {
    return buffer.subarray(0, 4).toString('ascii') === '%PDF';
  }
  if (mimeType === 'text/csv') {
    return !buffer.includes(0);
  }
  return false;
}

export function validateUploadedFile(
  file: Express.Multer.File | undefined,
  kind: 'image' | 'document',
  maxBytes = 10 * 1024 * 1024
): { ok: true; sha256: string; safeName: string } | { ok: false; error: string } {
  if (!file) {
    return { ok: false, error: 'No file provided.' };
  }
  const ext = path.extname(file.originalname).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return { ok: false, error: `Rejected unsafe file extension (${ext}).` };
  }
  const allowedMimes = kind === 'image' ? ALLOWED_IMAGE_MIME : ALLOWED_DOC_MIME;
  if (!allowedMimes.has(file.mimetype)) {
    return { ok: false, error: `Unsupported MIME type: ${file.mimetype}.` };
  }
  if (file.size <= 0 || file.size > maxBytes) {
    return { ok: false, error: `File size must be between 1 byte and ${Math.round(maxBytes / (1024 * 1024))} MB.` };
  }
  if (!hasValidMagicBytes(file.buffer, file.mimetype)) {
    return { ok: false, error: 'File contents do not match the declared MIME type.' };
  }
  return {
    ok: true,
    sha256: computeSha256(file.buffer),
    safeName: sanitizeFilename(file.originalname),
  };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const message = err instanceof Error ? err.message : 'Unexpected server error';
  const status = (err as { status?: number })?.status || 500;
  if (status >= 500) {
    console.error('[API Error]', err);
  }
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : message,
  });
}
