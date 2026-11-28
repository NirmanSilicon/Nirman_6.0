import crypto from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { getSupabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { sensitiveActionLimiter, validateUploadedFile } from '../middleware/security.js';
import { createNotification, recordAuditLog } from '../services/auditService.js';

export const complaintsRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

async function canAccessComplaint(
  user: NonNullable<Express.Request['user']>,
  complaint: { id: string; citizen_id: string }
): Promise<boolean> {
  if (user.accountStatus === 'active' && (user.role === 'officer' || user.role === 'admin')) {
    return true;
  }
  if (complaint.citizen_id === user.id) {
    return true;
  }
  if (user.accountStatus === 'active' && user.role === 'contractor' && user.contractorId) {
    const admin = getSupabaseAdmin()!;
    const { data } = await admin
      .from('complaint_assignments')
      .select('id')
      .eq('complaint_id', complaint.id)
      .eq('contractor_id', user.contractorId)
      .eq('active', true)
      .maybeSingle();
    return Boolean(data);
  }
  return false;
}

complaintsRouter.get('/', requireAuth, async (req, res) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({
      error: 'Supabase database is unavailable. Complaint records were not loaded.',
      code: 'DATABASE_UNAVAILABLE',
    });
    return;
  }

  const user = req.user!;
  if (user.accountStatus === 'active' && (user.role === 'officer' || user.role === 'admin')) {
    const { data, error } = await admin
      .from('complaints')
      .select('*, complaint_assignments(id, contractor_id, deadline_at, active, contractors(name))')
      .order('created_at', { ascending: false });
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ complaints: data ?? [], mode: 'database' });
    return;
  }

  if (user.accountStatus === 'active' && user.role === 'contractor') {
    if (!user.contractorId) {
      res.json({ complaints: [], mode: 'database' });
      return;
    }
    const { data: assignments, error: aErr } = await admin
      .from('complaint_assignments')
      .select('complaint_id')
      .eq('contractor_id', user.contractorId)
      .eq('active', true);
    if (aErr) {
      res.status(500).json({ error: aErr.message });
      return;
    }
    const ids = (assignments ?? []).map((a) => a.complaint_id);
    if (ids.length === 0) {
      res.json({ complaints: [], mode: 'database' });
      return;
    }
    const { data, error } = await admin
      .from('complaints')
      .select('*, complaint_assignments(id, contractor_id, deadline_at, active)')
      .in('id', ids)
      .order('created_at', { ascending: false });
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ complaints: data ?? [], mode: 'database' });
    return;
  }

  // Citizens strictly see ONLY their own private complaints
  const { data, error } = await admin
    .from('complaints')
    .select('*, complaint_assignments(id, contractor_id, deadline_at, active, contractors(name))')
    .eq('citizen_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ complaints: data ?? [], mode: 'database' });
});

complaintsRouter.get('/:id', requireAuth, async (req, res) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({ error: 'Database not configured.' });
    return;
  }

  const { data: complaint, error } = await admin
    .from('complaints')
    .select('*, complaint_assignments(id, contractor_id, officer_id, deadline_at, instructions, active, contractors(name))')
    .eq('id', req.params.id)
    .single();

  if (error || !complaint) {
    res.status(404).json({ error: 'Complaint not found.' });
    return;
  }

  const permitted = await canAccessComplaint(req.user!, complaint);
  if (!permitted) {
    res.status(403).json({ error: 'You do not have permission to view this private complaint.' });
    return;
  }

  const { data: updates } = await admin
    .from('complaint_updates')
    .select('*')
    .eq('complaint_id', complaint.id)
    .order('created_at', { ascending: true });

  res.json({ complaint, updates: updates ?? [] });
});

complaintsRouter.post('/', requireAuth, sensitiveActionLimiter, upload.single('photo'), async (req, res) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({ error: 'Database not configured.' });
    return;
  }

  const schema = z.object({
    category: z.enum([
      'potholes_damaged_roads',
      'broken_streetlights',
      'garbage',
      'water_leakage',
      'blocked_drains',
      'waterlogging',
      'damaged_infrastructure',
      'other',
    ]),
    title: z.string().min(5).max(160),
    description: z.string().min(10).max(2000),
    address_text: z.string().max(240).optional(),
    ward: z.string().max(80).optional(),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    related_project_id: z.string().uuid().optional().or(z.literal('')),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid complaint data', details: parsed.error.flatten() });
    return;
  }

  let photoPath: string | null = null;
  let photoSha256: string | null = null;

  if (req.file) {
    const check = validateUploadedFile(req.file, 'image', 10 * 1024 * 1024);
    if (!check.ok) {
      res.status(400).json({ error: check.error });
      return;
    }
    photoPath = `${req.user!.id}/${check.safeName}`;
    photoSha256 = check.sha256;
    const { error: upErr } = await admin.storage
      .from('complaint-photos')
      .upload(photoPath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (upErr) {
      res.status(500).json({ error: `Photo upload failed: ${upErr.message}` });
      return;
    }
  }

  const d = parsed.data;
  const year = new Date().getUTCFullYear();
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const complaintCode = `ND-BBI-${year}-${suffix}`;

  const { data: created, error: insErr } = await admin
    .from('complaints')
    .insert({
      complaint_code: complaintCode,
      citizen_id: req.user!.id,
      related_project_id: d.related_project_id || null,
      category: d.category,
      title: d.title,
      description: d.description,
      address_text: d.address_text || null,
      ward: d.ward || null,
      latitude: d.latitude,
      longitude: d.longitude,
      location_geom: `SRID=4326;POINT(${d.longitude} ${d.latitude})`,
      photo_storage_path: photoPath,
      photo_sha256: photoSha256,
      status: 'Submitted',
      priority: d.priority,
    })
    .select('*')
    .single();

  if (insErr || !created) {
    res.status(500).json({ error: insErr?.message || 'Failed to create complaint.' });
    return;
  }

  await admin.from('complaint_updates').insert({
    complaint_id: created.id,
    actor_id: req.user!.id,
    actor_role: req.user!.role,
    old_status: null,
    new_status: 'Submitted',
    comment: 'Complaint submitted by citizen.',
  });

  await recordAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: 'complaint_submitted',
    entityType: 'complaints',
    entityId: created.id,
    metadata: { complaint_code: complaintCode },
    ipAddress: req.ip,
  });

  res.status(201).json({ complaint: created });
});

complaintsRouter.get('/:id/photo-url', requireAuth, async (req, res) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({ error: 'Database not configured.' });
    return;
  }

  const { data: complaint, error } = await admin
    .from('complaints')
    .select('id, citizen_id, photo_storage_path')
    .eq('id', req.params.id)
    .single();

  if (error || !complaint) {
    res.status(404).json({ error: 'Complaint not found.' });
    return;
  }

  const permitted = await canAccessComplaint(req.user!, complaint);
  if (!permitted) {
    res.status(403).json({ error: 'Access denied to private complaint photo.' });
    return;
  }

  const pathParam = String(req.query.path ?? complaint.photo_storage_path ?? '');
  if (!pathParam) {
    res.status(404).json({ error: 'No photo attached.' });
    return;
  }

  // Ensure requested path actually belongs to this complaint or its updates
  if (pathParam !== complaint.photo_storage_path) {
    const { data: updateRow } = await admin
      .from('complaint_updates')
      .select('id')
      .eq('complaint_id', complaint.id)
      .eq('attachment_storage_path', pathParam)
      .maybeSingle();
    if (!updateRow) {
      res.status(403).json({ error: 'Photo path does not belong to this complaint.' });
      return;
    }
  }

  const { data: signed, error: signErr } = await admin.storage
    .from('complaint-photos')
    .createSignedUrl(pathParam, 120);

  if (signErr || !signed) {
    res.status(500).json({ error: 'Could not generate signed URL.' });
    return;
  }

  res.json({ signedUrl: signed.signedUrl, expiresInSeconds: 120 });
});

complaintsRouter.patch('/:id/review', requireAuth, requireRole('officer', 'admin'), async (req, res) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({ error: 'Database not configured.' });
    return;
  }

  const schema = z.object({
    status: z.enum(['Under Review', 'Verified', 'Rejected']),
    comment: z.string().min(3).max(1000),
    rejection_reason: z.string().max(1000).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid review payload', details: parsed.error.flatten() });
    return;
  }

  if (parsed.data.status === 'Rejected' && !parsed.data.rejection_reason?.trim()) {
    res.status(400).json({ error: 'A rejection reason is required when rejecting a complaint.' });
    return;
  }

  const { data: existing, error: getErr } = await admin
    .from('complaints')
    .select('id, status, citizen_id, complaint_code')
    .eq('id', req.params.id)
    .single();
  if (getErr || !existing) {
    res.status(404).json({ error: 'Complaint not found.' });
    return;
  }

  const { data: updated, error: upErr } = await admin
    .from('complaints')
    .update({
      status: parsed.data.status,
      rejection_reason: parsed.data.status === 'Rejected' ? parsed.data.rejection_reason : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .select('*')
    .single();

  if (upErr) {
    res.status(500).json({ error: upErr.message });
    return;
  }

  await admin.from('complaint_updates').insert({
    complaint_id: existing.id,
    actor_id: req.user!.id,
    actor_role: req.user!.role,
    old_status: existing.status,
    new_status: parsed.data.status,
    comment: parsed.data.comment,
  });

  await createNotification({
    userId: existing.citizen_id,
    title: `Complaint ${existing.complaint_code}: ${parsed.data.status}`,
    body: parsed.data.comment,
    category: 'complaint_status',
    referenceType: 'complaints',
    referenceId: existing.id,
  });

  res.json({ complaint: updated });
});

complaintsRouter.post('/:id/assign', requireAuth, requireRole('officer', 'admin'), async (req, res) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({ error: 'Database not configured.' });
    return;
  }

  const schema = z.object({
    contractor_id: z.string().uuid(),
    deadline_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    instructions: z.string().min(3).max(1000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid assignment payload', details: parsed.error.flatten() });
    return;
  }

  const { data: existing } = await admin
    .from('complaints')
    .select('id, status, citizen_id, complaint_code')
    .eq('id', req.params.id)
    .single();
  if (!existing) {
    res.status(404).json({ error: 'Complaint not found.' });
    return;
  }

  await admin.from('complaint_assignments').update({ active: false }).eq('complaint_id', existing.id);

  const { data: assignment, error: aErr } = await admin
    .from('complaint_assignments')
    .insert({
      complaint_id: existing.id,
      officer_id: req.user!.id,
      contractor_id: parsed.data.contractor_id,
      assigned_by: req.user!.id,
      deadline_at: parsed.data.deadline_at,
      instructions: parsed.data.instructions,
      active: true,
    })
    .select('*')
    .single();

  if (aErr) {
    res.status(500).json({ error: aErr.message });
    return;
  }

  await admin
    .from('complaints')
    .update({ status: 'Assigned', updated_at: new Date().toISOString() })
    .eq('id', existing.id);

  await admin.from('complaint_updates').insert({
    complaint_id: existing.id,
    actor_id: req.user!.id,
    actor_role: req.user!.role,
    old_status: existing.status,
    new_status: 'Assigned',
    comment: `Assigned to contractor with deadline ${parsed.data.deadline_at}: ${parsed.data.instructions}`,
  });

  await createNotification({
    userId: existing.citizen_id,
    title: `Complaint ${existing.complaint_code} Assigned`,
    body: `Work assigned to contractor. Target completion: ${parsed.data.deadline_at}.`,
    category: 'complaint_status',
    referenceType: 'complaints',
    referenceId: existing.id,
  });

  // Notify active contractor users belonging to that contractor_id
  const { data: contractorUsers } = await admin
    .from('profiles')
    .select('id')
    .eq('contractor_id', parsed.data.contractor_id)
    .eq('account_status', 'active');

  for (const cu of contractorUsers ?? []) {
    await createNotification({
      userId: cu.id,
      title: `New Complaint Assigned: ${existing.complaint_code}`,
      body: `Deadline ${parsed.data.deadline_at} — ${parsed.data.instructions}`,
      category: 'assignment',
      referenceType: 'complaints',
      referenceId: existing.id,
    });
  }

  await recordAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: 'complaint_assigned',
    entityType: 'complaints',
    entityId: existing.id,
    metadata: { contractor_id: parsed.data.contractor_id, deadline_at: parsed.data.deadline_at },
    ipAddress: req.ip,
  });

  res.status(201).json({ assignment });
});

complaintsRouter.patch(
  '/:id/contractor-progress',
  requireAuth,
  requireRole('contractor'),
  upload.single('photo'),
  async (req, res) => {
    const admin = getSupabaseAdmin();
    if (!admin) {
      res.status(503).json({ error: 'Database not configured.' });
      return;
    }

    if (!req.user!.contractorId) {
      res.status(403).json({ error: 'Your account is not linked to a verified contractor entity.' });
      return;
    }

    const { data: assignment } = await admin
      .from('complaint_assignments')
      .select('id')
      .eq('complaint_id', req.params.id)
      .eq('contractor_id', req.user!.contractorId)
      .eq('active', true)
      .maybeSingle();

    if (!assignment) {
      res.status(403).json({ error: 'You are not assigned to this complaint.' });
      return;
    }

    const schema = z.object({
      status: z.enum(['In Progress', 'Resolved Awaiting Verification']),
      comment: z.string().min(3).max(1000),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid progress update', details: parsed.error.flatten() });
      return;
    }

    let attachmentPath: string | null = null;
    let attachmentSha: string | null = null;
    if (req.file) {
      const check = validateUploadedFile(req.file, 'image', 10 * 1024 * 1024);
      if (!check.ok) {
        res.status(400).json({ error: check.error });
        return;
      }
      attachmentPath = `resolution/${req.params.id}/${check.safeName}`;
      attachmentSha = check.sha256;
      const { error: upErr } = await admin.storage
        .from('complaint-photos')
        .upload(attachmentPath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
      if (upErr) {
        res.status(500).json({ error: upErr.message });
        return;
      }
    }

    const { data: existing } = await admin
      .from('complaints')
      .select('id, status, citizen_id, complaint_code')
      .eq('id', req.params.id)
      .single();

    if (!existing) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }

    const { data: updated, error: upErr } = await admin
      .from('complaints')
      .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (upErr) {
      res.status(500).json({ error: upErr.message });
      return;
    }

    await admin.from('complaint_updates').insert({
      complaint_id: existing.id,
      actor_id: req.user!.id,
      actor_role: req.user!.role,
      old_status: existing.status,
      new_status: parsed.data.status,
      comment: parsed.data.comment,
      attachment_storage_path: attachmentPath,
      attachment_sha256: attachmentSha,
    });

    await createNotification({
      userId: existing.citizen_id,
      title: `Complaint ${existing.complaint_code}: ${parsed.data.status}`,
      body: parsed.data.comment,
      category: 'complaint_status',
      referenceType: 'complaints',
      referenceId: existing.id,
    });

    res.json({ complaint: updated });
  }
);

complaintsRouter.patch('/:id/verify-closure', requireAuth, requireRole('officer', 'admin'), async (req, res) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({ error: 'Database not configured.' });
    return;
  }

  const schema = z.object({
    status: z.enum(['Closed', 'In Progress']),
    comment: z.string().min(3).max(1000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid closure decision', details: parsed.error.flatten() });
    return;
  }

  const { data: existing } = await admin
    .from('complaints')
    .select('id, status, citizen_id, complaint_code')
    .eq('id', req.params.id)
    .single();

  if (!existing) {
    res.status(404).json({ error: 'Complaint not found.' });
    return;
  }

  const { data: updated, error } = await admin
    .from('complaints')
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq('id', existing.id)
    .select('*')
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  await admin.from('complaint_updates').insert({
    complaint_id: existing.id,
    actor_id: req.user!.id,
    actor_role: req.user!.role,
    old_status: existing.status,
    new_status: parsed.data.status,
    comment: parsed.data.comment,
  });

  await createNotification({
    userId: existing.citizen_id,
    title: `Complaint ${existing.complaint_code} ${parsed.data.status}`,
    body: parsed.data.comment,
    category: 'complaint_status',
    referenceType: 'complaints',
    referenceId: existing.id,
  });

  await recordAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: 'complaint_closure_verified',
    entityType: 'complaints',
    entityId: existing.id,
    metadata: { status: parsed.data.status },
    ipAddress: req.ip,
  });

  res.json({ complaint: updated });
});
