import { Router } from 'express';
import { z } from 'zod';
import { env, isSupabaseConfigured } from '../config/env.js';
import { getSupabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { sensitiveActionLimiter } from '../middleware/security.js';
import { recordAuditLog } from '../services/auditService.js';

export const authRouter = Router();

authRouter.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

const bootstrapSchema = z.object({
  bootstrapToken: z.string().min(16),
});

// Secure one-time bootstrap: promotes the currently authenticated verified user to admin
// ONLY if zero admins exist in the database AND ADMIN_BOOTSTRAP_TOKEN matches.
authRouter.post('/bootstrap-admin', sensitiveActionLimiter, requireAuth, async (req, res) => {
  if (!isSupabaseConfigured()) {
    res.status(503).json({ error: 'Database is not configured yet.' });
    return;
  }

  if (!env.ADMIN_BOOTSTRAP_TOKEN || env.ADMIN_BOOTSTRAP_TOKEN.length < 16) {
    res.status(403).json({
      error: 'ADMIN_BOOTSTRAP_TOKEN is not configured on the server. Use the CLI script or SQL bootstrap instead.',
    });
    return;
  }

  const parsed = bootstrapSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid bootstrap payload.' });
    return;
  }

  if (parsed.data.bootstrapToken !== env.ADMIN_BOOTSTRAP_TOKEN) {
    await recordAuditLog({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: 'admin_bootstrap_rejected_bad_token',
      entityType: 'profiles',
      entityId: req.user!.id,
      ipAddress: req.ip,
    });
    res.status(403).json({ error: 'Invalid bootstrap token.' });
    return;
  }

  const admin = getSupabaseAdmin()!;
  const { count, error: countErr } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin');

  if (countErr) {
    res.status(500).json({ error: 'Failed to check existing administrators.' });
    return;
  }

  if ((count ?? 0) > 0) {
    res.status(403).json({ error: 'An administrator already exists. One-time bootstrap is permanently disabled.' });
    return;
  }

  const { data: updated, error: updateErr } = await admin
    .from('profiles')
    .update({ role: 'admin', account_status: 'active', updated_at: new Date().toISOString() })
    .eq('id', req.user!.id)
    .select('id, email, full_name, role, account_status')
    .single();

  if (updateErr || !updated) {
    res.status(500).json({ error: 'Failed to promote initial administrator.' });
    return;
  }

  await recordAuditLog({
    actorId: req.user!.id,
    actorRole: 'admin',
    action: 'admin_bootstrap_completed',
    entityType: 'profiles',
    entityId: req.user!.id,
    metadata: { email: req.user!.email },
    ipAddress: req.ip,
  });

  res.json({
    message: 'Initial administrator account activated. Remove ADMIN_BOOTSTRAP_TOKEN from your environment.',
    profile: updated,
  });
});
