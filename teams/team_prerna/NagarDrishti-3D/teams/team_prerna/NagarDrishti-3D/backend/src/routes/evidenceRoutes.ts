import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { env, isCopernicusConfigured } from '../config/env.js';
import { getSupabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { sensitiveActionLimiter, validateUploadedFile } from '../middleware/security.js';
import { createNotification, recordAuditLog } from '../services/auditService.js';
import { computeProjectComparisons } from '../services/comparisonService.js';

export const evidenceRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

evidenceRouter.get('/', requireAuth, async (req, res) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({
      error: 'Supabase database is unavailable. Evidence records were not loaded.',
      code: 'DATABASE_UNAVAILABLE',
    });
    return;
  }

  const projectId = String(req.query.projectId ?? '').trim();
  let query = admin
    .from('evidence')
    .select('id, project_id, section_id, uploaded_by, capture_timestamp, uploaded_at, latitude, longitude, gps_accuracy_m, within_boundary, distance_to_boundary_m, file_name, mime_type, file_size_bytes, sha256_hash, notes, verification_status, review_notes, reviewed_at, is_demo')
    .order('created_at', { ascending: false });

  if (projectId) query = query.eq('project_id', projectId);

  // Non-staff can only inspect their own submitted evidence (or verified demo evidence)
  if (req.user!.role !== 'officer' && req.user!.role !== 'admin') {
    query = query.or(`uploaded_by.eq.${req.user!.id},and(is_demo.eq.true,verification_status.eq.verified)`);
  }

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ evidence: data ?? [], mode: 'database' });
});

evidenceRouter.post('/', requireAuth, sensitiveActionLimiter, upload.single('photo'), async (req, res) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({ error: 'Database not configured.' });
    return;
  }

  const fileCheck = validateUploadedFile(req.file, 'image', 10 * 1024 * 1024);
  if (!fileCheck.ok) {
    res.status(400).json({ error: fileCheck.error });
    return;
  }

  const schema = z.object({
    project_id: z.string().uuid(),
    section_id: z.string().uuid().optional().or(z.literal('')),
    capture_timestamp: z.string().datetime(),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    gps_accuracy_m: z.coerce.number().nonnegative().optional(),
    notes: z.string().max(1000).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid GPS/evidence fields', details: parsed.error.flatten() });
    return;
  }

  const d = parsed.data;
  const { data: boundaryRows, error: boundaryErr } = await admin.rpc('check_point_in_project_boundary', {
    p_project_id: d.project_id,
    p_lng: d.longitude,
    p_lat: d.latitude,
  });

  if (boundaryErr) {
    res.status(400).json({ error: `Boundary check failed: ${boundaryErr.message}` });
    return;
  }

  const boundaryInfo = Array.isArray(boundaryRows) ? boundaryRows[0] : boundaryRows;
  const storagePath = `${d.project_id}/${req.user!.id}/${fileCheck.safeName}`;
  const file = req.file!;

  const { error: uploadErr } = await admin.storage
    .from('evidence-photos')
    .upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: false });

  if (uploadErr) {
    res.status(500).json({ error: `Failed to store evidence photo: ${uploadErr.message}` });
    return;
  }

  const { data: inserted, error: insErr } = await admin
    .from('evidence')
    .insert({
      project_id: d.project_id,
      section_id: d.section_id || null,
      uploaded_by: req.user!.id,
      capture_timestamp: d.capture_timestamp,
      latitude: d.latitude,
      longitude: d.longitude,
      gps_accuracy_m: d.gps_accuracy_m ?? null,
      point_geom: `SRID=4326;POINT(${d.longitude} ${d.latitude})`,
      within_boundary: boundaryInfo?.within_boundary ?? null,
      distance_to_boundary_m: boundaryInfo?.distance_m ?? null,
      storage_path: storagePath,
      file_name: file.originalname,
      mime_type: file.mimetype,
      file_size_bytes: file.size,
      sha256_hash: fileCheck.sha256,
      notes: d.notes || null,
      verification_status: 'pending_review',
    })
    .select('*')
    .single();

  if (insErr) {
    res.status(500).json({ error: insErr.message });
    return;
  }

  await recordAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: 'evidence_uploaded',
    entityType: 'evidence',
    entityId: inserted.id,
    metadata: {
      project_id: d.project_id,
      within_boundary: inserted.within_boundary,
      sha256: fileCheck.sha256,
    },
    ipAddress: req.ip,
  });

  res.status(201).json({
    evidence: inserted,
    authenticity_notice:
      'GPS coordinates, timestamps, and SHA-256 hashes record upload integrity only and do NOT prove real-world authenticity. Human officer review is required.',
  });
});

evidenceRouter.get('/:id/url', requireAuth, async (req, res) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({ error: 'Database not configured.' });
    return;
  }

  const { data: ev, error } = await admin
    .from('evidence')
    .select('id, uploaded_by, storage_bucket, storage_path, verification_status, is_demo')
    .eq('id', req.params.id)
    .single();

  if (error || !ev) {
    res.status(404).json({ error: 'Evidence record not found.' });
    return;
  }

  const allowed =
    ev.uploaded_by === req.user!.id ||
    (req.user!.accountStatus === 'active' && (req.user!.role === 'officer' || req.user!.role === 'admin')) ||
    (ev.is_demo && ev.verification_status === 'verified');

  if (!allowed) {
    res.status(403).json({ error: 'You do not have permission to view this private evidence file.' });
    return;
  }

  const { data: signed, error: signErr } = await admin.storage
    .from(ev.storage_bucket)
    .createSignedUrl(ev.storage_path, 120);

  if (signErr || !signed) {
    res.status(500).json({ error: 'Could not generate signed URL.' });
    return;
  }

  res.json({ signedUrl: signed.signedUrl, expiresInSeconds: 120 });
});

evidenceRouter.patch('/:id/review', requireAuth, requireRole('officer', 'admin'), async (req, res) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({ error: 'Database not configured.' });
    return;
  }

  const schema = z.object({
    verification_status: z.enum(['verified', 'flagged', 'rejected']),
    review_notes: z.string().min(3).max(1000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid review payload', details: parsed.error.flatten() });
    return;
  }

  const { data: updated, error } = await admin
    .from('evidence')
    .update({
      verification_status: parsed.data.verification_status,
      review_notes: parsed.data.review_notes,
      reviewed_by: req.user!.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select('*')
    .single();

  if (error || !updated) {
    res.status(404).json({ error: error?.message || 'Evidence record not found.' });
    return;
  }

  await createNotification({
    userId: updated.uploaded_by,
    title: `Evidence ${parsed.data.verification_status}`,
    body: `An officer reviewed your evidence upload: ${parsed.data.review_notes}`,
    category: 'evidence_review',
    referenceType: 'evidence',
    referenceId: updated.id,
  });

  await recordAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: 'evidence_reviewed',
    entityType: 'evidence',
    entityId: updated.id,
    metadata: { verification_status: parsed.data.verification_status },
    ipAddress: req.ip,
  });

  res.json({ evidence: updated });
});

// Survey measurements & automated Comparison Engine
evidenceRouter.get('/surveys', async (req, res) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({
      error: 'Supabase database is unavailable. Survey records were not loaded.',
      code: 'DATABASE_UNAVAILABLE',
    });
    return;
  }
  const projectId = String(req.query.projectId ?? '').trim();
  let query = admin.from('survey_measurements').select('*').order('survey_date', { ascending: false });
  if (projectId) query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ surveys: data ?? [], mode: 'database' });
});

evidenceRouter.post('/surveys', requireAuth, requireRole('officer', 'admin'), async (req, res) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({ error: 'Database not configured.' });
    return;
  }

  const schema = z.object({
    project_id: z.string().uuid(),
    section_id: z.string().uuid().optional().or(z.literal('')),
    surveyor_name: z.string().min(2).max(120),
    survey_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    method: z.enum(['total_station', 'dgps', 'measuring_wheel', 'core_cut_test', 'laser_distometer', 'manual_tape', 'other']),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    measured_length_m: z.number().nonnegative().nullable().optional(),
    measured_width_m: z.number().nonnegative().nullable().optional(),
    measured_area_sqm: z.number().nonnegative().nullable().optional(),
    measured_thickness_mm: z.number().nonnegative().nullable().optional(),
    material_test_summary: z.string().max(1000).optional(),
    notes: z.string().max(1000).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid survey measurement', details: parsed.error.flatten() });
    return;
  }

  const d = parsed.data;
  const { data: project, error: projErr } = await admin
    .from('projects')
    .select('id, approved_specs')
    .eq('id', d.project_id)
    .single();

  if (projErr || !project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const { data: survey, error: insErr } = await admin
    .from('survey_measurements')
    .insert({
      project_id: d.project_id,
      section_id: d.section_id || null,
      surveyor_id: req.user!.id,
      surveyor_name: d.surveyor_name,
      survey_date: d.survey_date,
      method: d.method,
      latitude: d.latitude ?? null,
      longitude: d.longitude ?? null,
      location_geom:
        typeof d.latitude === 'number' && typeof d.longitude === 'number'
          ? `SRID=4326;POINT(${d.longitude} ${d.latitude})`
          : null,
      measured_length_m: d.measured_length_m ?? null,
      measured_width_m: d.measured_width_m ?? null,
      measured_area_sqm: d.measured_area_sqm ?? null,
      measured_thickness_mm: d.measured_thickness_mm ?? null,
      material_test_summary: d.material_test_summary || null,
      notes: d.notes || null,
    })
    .select('*')
    .single();

  if (insErr || !survey) {
    res.status(500).json({ error: insErr?.message || 'Failed to save survey.' });
    return;
  }

  const computed = computeProjectComparisons((project.approved_specs || {}) as Record<string, number>, {
    measured_length_m: d.measured_length_m,
    measured_width_m: d.measured_width_m,
    measured_area_sqm: d.measured_area_sqm,
    measured_thickness_mm: d.measured_thickness_mm,
    survey_date: d.survey_date,
    method: d.method,
  });

  const rowsToInsert = computed.map((c) => ({
    ...c,
    project_id: d.project_id,
    section_id: d.section_id || null,
    survey_id: survey.id,
  }));

  const { data: comparisons, error: compErr } = await admin
    .from('comparison_results')
    .insert(rowsToInsert)
    .select('*');

  if (compErr) {
    res.status(500).json({ error: compErr.message });
    return;
  }

  await recordAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: 'survey_measurement_recorded',
    entityType: 'survey_measurements',
    entityId: survey.id,
    metadata: { project_id: d.project_id, comparisons_count: comparisons?.length ?? 0 },
    ipAddress: req.ip,
  });

  res.status(201).json({ survey, comparisons: comparisons ?? [] });
});

evidenceRouter.get('/comparisons', async (req, res) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({
      error: 'Supabase database is unavailable. Comparison records were not loaded.',
      code: 'DATABASE_UNAVAILABLE',
    });
    return;
  }

  const projectId = String(req.query.projectId ?? '').trim();
  let query = admin
    .from('comparison_results')
    .select('*, projects(name, project_code)')
    .order('computed_at', { ascending: false });
  if (projectId) query = query.eq('project_id', projectId);

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const normalized = (data ?? []).map((row) => ({
    ...row,
    project_name: (row.projects as { name?: string } | null)?.name ?? 'Project',
  }));

  res.json({ comparisons: normalized, mode: 'database' });
});

evidenceRouter.patch('/comparisons/:id/verify', requireAuth, requireRole('officer', 'admin'), async (req, res) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({ error: 'Database not configured.' });
    return;
  }

  const schema = z.object({
    result_status: z.enum(['verified_by_officer', 'possible_discrepancy', 'requires_inspection', 'consistent']),
    review_notes: z.string().min(3).max(1000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid verification payload', details: parsed.error.flatten() });
    return;
  }

  const { data, error } = await admin
    .from('comparison_results')
    .update({
      result_status: parsed.data.result_status,
      review_notes: parsed.data.review_notes,
      reviewed_by: req.user!.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select('*')
    .single();

  if (error || !data) {
    res.status(404).json({ error: error?.message || 'Comparison record not found.' });
    return;
  }

  await recordAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: 'comparison_verified',
    entityType: 'comparison_results',
    entityId: data.id,
    metadata: { result_status: parsed.data.result_status },
    ipAddress: req.ip,
  });

  res.json({ comparison: data });
});

// Optional Copernicus Sentinel-2 comparison proxy
evidenceRouter.post('/satellite/compare', requireAuth, async (req, res) => {
  const schema = z.object({
    project_id: z.string().uuid().optional(),
    bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
    before_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    after_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    max_cloud_pct: z.number().min(0).max(100).default(20),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid satellite query parameters', details: parsed.error.flatten() });
    return;
  }

  if (!isCopernicusConfigured()) {
    res.json({
      configured: false,
      status: 'unconfigured',
      message:
        'Copernicus Sentinel-2 credentials (COPERNICUS_CLIENT_ID / COPERNICUS_CLIENT_SECRET) are not configured. No satellite imagery was fabricated.',
      limitations: [
        'Sentinel-2 10m spatial resolution is unsuitable for narrow roads, streetlights, or construction thickness/quality checks.',
        'Satellite observation alone never proves project completion.',
      ],
    });
    return;
  }

  try {
    const pyRes = await fetch(`${env.PYTHON_SERVICE_URL}/satellite/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(20000),
    });
    const pyData = await pyRes.json();
    res.status(pyRes.status).json(pyData);
  } catch (err) {
    res.status(502).json({
      configured: true,
      error: 'Python satellite service is unreachable.',
      detail: err instanceof Error ? err.message : 'Connection error',
    });
  }
});
