import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { env, isSupabaseConfigured } from '../config/env.js';
import { getSupabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateUploadedFile } from '../middleware/security.js';
import { recordAuditLog } from '../services/auditService.js';

export const projectsRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

projectsRouter.get('/meta/lookups', async (_req, res) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({
      error: 'Supabase database is unavailable. Configure backend credentials and apply the database migrations.',
      code: 'DATABASE_UNAVAILABLE',
    });
    return;
  }

  const [deps, cons] = await Promise.all([
    admin.from('departments').select('*').order('name'),
    admin.from('contractors').select('*').order('name'),
  ]);

  if (deps.error || cons.error) {
    res.status(500).json({ error: 'Failed to fetch departments and contractors.' });
    return;
  }

  res.json({
    departments: deps.data ?? [],
    contractors: cons.data ?? [],
    mode: 'database',
  });
});

projectsRouter.get('/', async (req, res) => {
  const q = String(req.query.q ?? '').trim().toLowerCase();
  const departmentId = String(req.query.departmentId ?? '').trim();
  const category = String(req.query.category ?? '').trim();
  const status = String(req.query.status ?? '').trim();

  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({
      error: 'Supabase database is unavailable. Project records were not loaded.',
      code: 'DATABASE_UNAVAILABLE',
    });
    return;
  }

  const { data, error } = await admin.rpc('get_projects_geojson');
  if (error) {
    res.status(500).json({ error: `Failed to query projects: ${error.message}` });
    return;
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const filtered = rows.filter((p) => {
    if (departmentId && p.department_id !== departmentId) return false;
    if (category && p.category !== category) return false;
    if (status && p.status !== status) return false;
    if (q) {
      const hay = `${p.name} ${p.project_code} ${p.city} ${p.ward} ${p.locality} ${p.pin_code ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  res.json({ projects: filtered, mode: 'database' });
});

projectsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({
      error: 'Supabase database is unavailable. Project details were not loaded.',
      code: 'DATABASE_UNAVAILABLE',
    });
    return;
  }

  const { data: allProjects, error: projErr } = await admin.rpc('get_projects_geojson');
  if (projErr) {
    res.status(500).json({ error: projErr.message });
    return;
  }
  const project = (allProjects as Array<Record<string, unknown>> | null)?.find((p) => p.id === id);
  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const [sections, progress, docs, inspections] = await Promise.all([
    admin.from('project_sections').select('*').eq('project_id', id).order('section_code'),
    admin.from('project_progress').select('*').eq('project_id', id).order('reported_at', { ascending: false }),
    admin.from('project_documents').select('id, title, document_type, file_name, mime_type, file_size_bytes, sha256_hash, extracted_text, source_name, source_url, retrieved_at, created_at, is_demo').eq('project_id', id).order('created_at', { ascending: false }),
    admin.from('inspection_records').select('*').eq('project_id', id).order('created_at', { ascending: false }),
  ]);

  if (sections.error || progress.error || docs.error || inspections.error) {
    res.status(500).json({
      error: 'Failed to load all project details from Supabase.',
      code: 'DATABASE_QUERY_FAILED',
    });
    return;
  }

  res.json({
    project,
    sections: sections.data ?? [],
    progress_history: progress.data ?? [],
    documents: docs.data ?? [],
    inspections: inspections.data ?? [],
    mode: 'database',
  });
});

const createProjectSchema = z.object({
  project_code: z.string().min(3).max(40),
  name: z.string().min(4).max(200),
  description: z.string().min(10).max(2000),
  department_id: z.string().uuid(),
  contractor_id: z.string().uuid().nullable().optional(),
  category: z.enum(['road', 'drainage', 'streetlight', 'water_supply', 'park', 'building', 'public_transport', 'other']),
  status: z.enum(['planned', 'in_progress', 'completed_claimed', 'under_verification', 'verified', 'halted']).default('planned'),
  city: z.string().min(2).max(80).default('Bhubaneswar'),
  ward: z.string().min(1).max(80),
  locality: z.string().min(2).max(120),
  pin_code: z.string().regex(/^\d{6}$/).optional().or(z.literal('')),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  boundary_ring: z.array(z.tuple([z.number(), z.number()])).min(4).optional(),
  approved_specs: z.object({
    length_m: z.number().nonnegative().optional(),
    width_m: z.number().nonnegative().optional(),
    area_sqm: z.number().nonnegative().optional(),
    thickness_mm: z.number().nonnegative().optional(),
    surface: z.string().max(120).optional(),
  }).default({}),
  budget_inr: z.number().nonnegative().nullable().optional(),
  start_date: z.string().optional(),
  expected_end_date: z.string().optional(),
  official_progress_pct: z.number().min(0).max(100).default(0),
  source_name: z.string().min(2).max(200),
  source_url: z.string().url().optional().or(z.literal('')),
  data_classification: z.enum(['official', 'demo', 'community']).default('community'),
});

projectsRouter.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  if (!isSupabaseConfigured()) {
    res.status(503).json({ error: 'Database not configured.' });
    return;
  }

  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const d = parsed.data;
  const locationWkt = `SRID=4326;POINT(${d.lng} ${d.lat})`;
  let boundaryWkt: string | null = null;
  if (d.boundary_ring && d.boundary_ring.length >= 4) {
    const ring = [...d.boundary_ring];
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push(first);
    }
    boundaryWkt = `SRID=4326;POLYGON((${ring.map(([lng, lat]) => `${lng} ${lat}`).join(', ')}))`;
  }

  const admin = getSupabaseAdmin()!;
  const { data: created, error } = await admin
    .from('projects')
    .insert({
      project_code: d.project_code,
      name: d.name,
      description: d.description,
      department_id: d.department_id,
      contractor_id: d.contractor_id ?? null,
      category: d.category,
      status: d.status,
      city: d.city,
      ward: d.ward,
      locality: d.locality,
      pin_code: d.pin_code || null,
      location: locationWkt,
      boundary: boundaryWkt,
      approved_specs: d.approved_specs,
      budget_inr: d.budget_inr ?? null,
      start_date: d.start_date || null,
      expected_end_date: d.expected_end_date || null,
      official_progress_pct: d.official_progress_pct,
      source_name: d.source_name,
      source_url: d.source_url || null,
      retrieved_at: new Date().toISOString(),
      data_classification: d.data_classification,
      is_demo: d.data_classification === 'demo',
      created_by: req.user!.id,
    })
    .select('id, project_code, name')
    .single();

  if (error || !created) {
    res.status(400).json({ error: error?.message || 'Could not create project.' });
    return;
  }

  await recordAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: 'project_created',
    entityType: 'projects',
    entityId: created.id,
    metadata: { project_code: created.project_code },
    ipAddress: req.ip,
  });

  res.status(201).json({ project: created });
});

const progressUpdateSchema = z.object({
  reported_progress_pct: z.number().min(0).max(100),
  summary: z.string().min(5).max(1000),
  status: z.enum(['planned', 'in_progress', 'completed_claimed', 'under_verification', 'verified', 'halted']).optional(),
});

projectsRouter.post('/:id/progress', requireAuth, requireRole('admin', 'officer', 'contractor'), async (req, res) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({ error: 'Database not configured.' });
    return;
  }
  const { id } = req.params;
  const parsed = progressUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid progress payload', details: parsed.error.flatten() });
    return;
  }

  const { data: project } = await admin.from('projects').select('id, contractor_id').eq('id', id).single();
  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  if (req.user!.role === 'contractor' && project.contractor_id !== req.user!.contractorId) {
    res.status(403).json({ error: 'Contractors may only update progress on their own assigned projects.' });
    return;
  }

  const sourceType =
    req.user!.role === 'contractor' ? 'contractor_report' : req.user!.role === 'officer' ? 'officer_update' : 'official_portal';

  const { data: entry, error: insErr } = await admin
    .from('project_progress')
    .insert({
      project_id: id,
      reported_by: req.user!.id,
      reported_progress_pct: parsed.data.reported_progress_pct,
      summary: parsed.data.summary,
      source_type: sourceType,
    })
    .select('*')
    .single();

  if (insErr) {
    res.status(500).json({ error: insErr.message });
    return;
  }

  // Contractors cannot mark a project 'verified'—only officers/admins can
  let nextStatus = parsed.data.status;
  if (req.user!.role === 'contractor' && nextStatus === 'verified') {
    nextStatus = 'completed_claimed';
  }

  await admin
    .from('projects')
    .update({
      official_progress_pct: parsed.data.reported_progress_pct,
      ...(nextStatus ? { status: nextStatus } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  await recordAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: 'project_progress_updated',
    entityType: 'projects',
    entityId: String(id),
    metadata: { reported_progress_pct: parsed.data.reported_progress_pct, nextStatus },
    ipAddress: req.ip,
  });

  res.status(201).json({ progress: entry });
});

projectsRouter.post('/:id/documents', requireAuth, requireRole('admin', 'officer'), upload.single('file'), async (req, res) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({ error: 'Database not configured.' });
    return;
  }

  const check = validateUploadedFile(req.file, 'document', 20 * 1024 * 1024);
  if (!check.ok) {
    res.status(400).json({ error: check.error });
    return;
  }

  const metaSchema = z.object({
    title: z.string().min(2).max(200),
    document_type: z.enum(['dpr', 'tender', 'work_order', 'specification', 'progress_report', 'inspection_report', 'other']),
    source_name: z.string().max(200).optional(),
    source_url: z.string().url().optional().or(z.literal('')),
  });

  const parsed = metaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid document metadata', details: parsed.error.flatten() });
    return;
  }

  const file = req.file!;
  const storagePath = `${req.params.id}/${check.safeName}`;

  const { error: uploadErr } = await admin.storage
    .from('project-documents')
    .upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: false });

  if (uploadErr) {
    res.status(500).json({ error: `Storage upload failed: ${uploadErr.message}` });
    return;
  }

  // Optional PyMuPDF extraction via Python service if PDF
  let extractedText: string | null = null;
  if (file.mimetype === 'application/pdf') {
    try {
      const formData = new FormData();
      formData.append('file', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), check.safeName);
      const pyRes = await fetch(`${env.PYTHON_SERVICE_URL}/documents/extract`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(8000),
      });
      if (pyRes.ok) {
        const pyJson = (await pyRes.json()) as { text?: string };
        extractedText = pyJson.text?.slice(0, 8000) ?? null;
      }
    } catch {
      // Python extraction is optional; document upload still succeeds cleanly
    }
  }

  const { data: docRow, error: dbErr } = await admin
    .from('project_documents')
    .insert({
      project_id: req.params.id,
      title: parsed.data.title,
      document_type: parsed.data.document_type,
      storage_path: storagePath,
      file_name: file.originalname,
      mime_type: file.mimetype,
      file_size_bytes: file.size,
      sha256_hash: check.sha256,
      extracted_text: extractedText,
      source_name: parsed.data.source_name || 'Manual Upload',
      source_url: parsed.data.source_url || null,
      retrieved_at: new Date().toISOString(),
      uploaded_by: req.user!.id,
    })
    .select('*')
    .single();

  if (dbErr) {
    res.status(500).json({ error: dbErr.message });
    return;
  }

  await recordAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: 'project_document_uploaded',
    entityType: 'project_documents',
    entityId: docRow.id,
    metadata: { sha256: check.sha256 },
    ipAddress: req.ip,
  });

  res.status(201).json({ document: docRow });
});

projectsRouter.get('/:id/documents/:docId/url', requireAuth, async (req, res) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({ error: 'Database not configured.' });
    return;
  }
  const { data: doc, error } = await admin
    .from('project_documents')
    .select('storage_bucket, storage_path')
    .eq('id', req.params.docId)
    .eq('project_id', req.params.id)
    .single();

  if (error || !doc) {
    res.status(404).json({ error: 'Document not found.' });
    return;
  }

  const { data: signed, error: signErr } = await admin.storage
    .from(doc.storage_bucket)
    .createSignedUrl(doc.storage_path, 120);

  if (signErr || !signed) {
    res.status(500).json({ error: 'Failed to issue signed document URL.' });
    return;
  }

  res.json({ signedUrl: signed.signedUrl, expiresInSeconds: 120 });
});
