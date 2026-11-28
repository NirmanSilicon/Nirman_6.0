import { Router } from 'express';
import { z } from 'zod';
import { getSupabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createNotification, recordAuditLog } from '../services/auditService.js';
export const dashboardRouter = Router();
dashboardRouter.get('/summary', requireAuth, async (req, res) => {
    const admin = getSupabaseAdmin();
    if (!admin) {
        res.status(503).json({
            error: 'Supabase database is unavailable. Dashboard data was not loaded.',
            code: 'DATABASE_UNAVAILABLE',
        });
        return;
    }
    const user = req.user;
    const [projectsRes, evidenceRes, comparisonsRes, departmentsRes] = await Promise.all([
        admin.from('projects').select('id, status, department_id, official_progress_pct, is_demo, data_classification'),
        admin.from('evidence').select('id, verification_status, uploaded_by'),
        admin.from('comparison_results').select('id, result_status'),
        admin.from('departments').select('id, code, name'),
    ]);
    if (projectsRes.error || evidenceRes.error || comparisonsRes.error || departmentsRes.error) {
        res.status(500).json({
            error: 'Failed to load dashboard data from Supabase.',
            code: 'DATABASE_QUERY_FAILED',
        });
        return;
    }
    const projects = projectsRes.data ?? [];
    const evidence = evidenceRes.data ?? [];
    const comparisons = comparisonsRes.data ?? [];
    const departments = departmentsRes.data ?? [];
    let complaintsCount = 0;
    let openComplaints = 0;
    const complaintStatusMap = {};
    if (user.role === 'admin' || user.role === 'officer') {
        const { data: allComplaints, error } = await admin.from('complaints').select('id, status');
        if (error) {
            res.status(500).json({ error: 'Failed to load dashboard complaints.', code: 'DATABASE_QUERY_FAILED' });
            return;
        }
        complaintsCount = allComplaints?.length ?? 0;
        for (const c of allComplaints ?? []) {
            complaintStatusMap[c.status] = (complaintStatusMap[c.status] ?? 0) + 1;
            if (c.status !== 'Closed' && c.status !== 'Rejected')
                openComplaints += 1;
        }
    }
    else if (user.role === 'contractor' && user.contractorId) {
        const { data: assigned, error } = await admin
            .from('complaint_assignments')
            .select('complaint_id, complaints(status)')
            .eq('contractor_id', user.contractorId)
            .eq('active', true);
        if (error) {
            res.status(500).json({ error: 'Failed to load dashboard assignments.', code: 'DATABASE_QUERY_FAILED' });
            return;
        }
        complaintsCount = assigned?.length ?? 0;
        for (const row of assigned ?? []) {
            const st = row.complaints?.status ?? 'Assigned';
            complaintStatusMap[st] = (complaintStatusMap[st] ?? 0) + 1;
            if (st !== 'Closed' && st !== 'Rejected')
                openComplaints += 1;
        }
    }
    else {
        const { data: own, error } = await admin
            .from('complaints')
            .select('id, status')
            .eq('citizen_id', user.id);
        if (error) {
            res.status(500).json({ error: 'Failed to load dashboard complaints.', code: 'DATABASE_QUERY_FAILED' });
            return;
        }
        complaintsCount = own?.length ?? 0;
        for (const c of own ?? []) {
            complaintStatusMap[c.status] = (complaintStatusMap[c.status] ?? 0) + 1;
            if (c.status !== 'Closed' && c.status !== 'Rejected')
                openComplaints += 1;
        }
    }
    res.json({
        mode: 'database',
        stats: {
            totalProjects: projects.length,
            demoProjects: projects.filter((p) => p.is_demo).length,
            officialProjects: projects.filter((p) => p.data_classification === 'official').length,
            evidenceAwaitingReview: evidence.filter((e) => e.verification_status === 'pending_review').length,
            possibleDiscrepancies: comparisons.filter((c) => c.result_status === 'possible_discrepancy').length,
            complaintsCount,
            openComplaints,
        },
        departmentBreakdown: departments.map((d) => {
            const deptProjects = projects.filter((p) => p.department_id === d.id);
            const avgProgress = deptProjects.length > 0
                ? Math.round(deptProjects.reduce((acc, p) => acc + Number(p.official_progress_pct || 0), 0) / deptProjects.length)
                : 0;
            return {
                department: d.code,
                projects: deptProjects.length,
                avgProgress,
            };
        }),
        complaintStatusBreakdown: Object.entries(complaintStatusMap).map(([status, count]) => ({ status, count })),
    });
});
dashboardRouter.get('/notifications', requireAuth, async (req, res) => {
    const admin = getSupabaseAdmin();
    if (!admin) {
        res.status(503).json({
            error: 'Supabase database is unavailable. Notifications were not loaded.',
            code: 'DATABASE_UNAVAILABLE',
        });
        return;
    }
    const { data, error } = await admin
        .from('notifications')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .limit(40);
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.json({ notifications: data ?? [], mode: 'database' });
});
dashboardRouter.patch('/notifications/:id/read', requireAuth, async (req, res) => {
    const admin = getSupabaseAdmin();
    if (!admin) {
        res.status(503).json({ error: 'Database not configured.' });
        return;
    }
    const { data, error } = await admin
        .from('notifications')
        .update({ is_read: true })
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .select('*')
        .single();
    if (error || !data) {
        res.status(404).json({ error: 'Notification not found.' });
        return;
    }
    res.json({ notification: data });
});
// Admin endpoints
dashboardRouter.get('/admin/users', requireAuth, requireRole('admin'), async (_req, res) => {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
        .from('profiles')
        .select('id, email, full_name, phone, ward, role, requested_role, account_status, department_id, contractor_id, created_at')
        .order('created_at', { ascending: false });
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.json({ users: data ?? [] });
});
dashboardRouter.patch('/admin/users/:id/role', requireAuth, requireRole('admin'), async (req, res) => {
    const admin = getSupabaseAdmin();
    const schema = z.object({
        role: z.enum(['citizen', 'officer', 'contractor', 'admin']),
        account_status: z.enum(['active', 'pending_approval', 'suspended']),
        department_id: z.string().uuid().nullable().optional(),
        contractor_id: z.string().uuid().nullable().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid user role update', details: parsed.error.flatten() });
        return;
    }
    const { data: updated, error } = await admin
        .from('profiles')
        .update({
        role: parsed.data.role,
        account_status: parsed.data.account_status,
        department_id: parsed.data.department_id ?? null,
        contractor_id: parsed.data.contractor_id ?? null,
        updated_at: new Date().toISOString(),
    })
        .eq('id', req.params.id)
        .select('*')
        .single();
    if (error || !updated) {
        res.status(404).json({ error: error?.message || 'User not found.' });
        return;
    }
    await createNotification({
        userId: updated.id,
        title: 'Account Role & Status Updated',
        body: `An administrator updated your role to ${updated.role} (${updated.account_status}).`,
        category: 'account',
        referenceType: 'profiles',
        referenceId: updated.id,
    });
    await recordAuditLog({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'admin_updated_user_role',
        entityType: 'profiles',
        entityId: updated.id,
        metadata: { new_role: updated.role, account_status: updated.account_status },
        ipAddress: req.ip,
    });
    res.json({ user: updated });
});
dashboardRouter.post('/admin/departments', requireAuth, requireRole('admin'), async (req, res) => {
    const admin = getSupabaseAdmin();
    const schema = z.object({
        code: z.string().min(2).max(24),
        name: z.string().min(3).max(160),
        jurisdiction: z.string().default('Bhubaneswar'),
        contact_email: z.string().email().optional().or(z.literal('')),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid department payload', details: parsed.error.flatten() });
        return;
    }
    const { data, error } = await admin
        .from('departments')
        .insert({ ...parsed.data, contact_email: parsed.data.contact_email || null, is_demo: false })
        .select('*')
        .single();
    if (error) {
        res.status(400).json({ error: error.message });
        return;
    }
    res.status(201).json({ department: data });
});
dashboardRouter.post('/admin/contractors', requireAuth, requireRole('admin'), async (req, res) => {
    const admin = getSupabaseAdmin();
    const schema = z.object({
        registration_code: z.string().min(2).max(40),
        name: z.string().min(3).max(160),
        license_class: z.string().max(40).optional(),
        contact_person: z.string().max(100).optional(),
        contact_email: z.string().email().optional().or(z.literal('')),
        phone: z.string().max(24).optional(),
        is_verified: z.boolean().default(true),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid contractor payload', details: parsed.error.flatten() });
        return;
    }
    const { data, error } = await admin
        .from('contractors')
        .insert({ ...parsed.data, contact_email: parsed.data.contact_email || null, is_demo: false })
        .select('*')
        .single();
    if (error) {
        res.status(400).json({ error: error.message });
        return;
    }
    res.status(201).json({ contractor: data });
});
dashboardRouter.get('/admin/audit-logs', requireAuth, requireRole('admin'), async (_req, res) => {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.json({ logs: data ?? [] });
});
dashboardRouter.post('/inspections', requireAuth, requireRole('officer', 'admin'), async (req, res) => {
    const admin = getSupabaseAdmin();
    const schema = z.object({
        project_id: z.string().uuid().optional(),
        complaint_id: z.string().uuid().optional(),
        scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        status: z.enum(['requested', 'scheduled', 'completed', 'cancelled']).default('requested'),
        findings: z.string().max(2000).optional(),
        recommendation: z.string().max(1000).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid inspection payload', details: parsed.error.flatten() });
        return;
    }
    const { data, error } = await admin
        .from('inspection_records')
        .insert({
        ...parsed.data,
        requested_by: req.user.id,
        inspector_id: req.user.id,
        completed_date: parsed.data.status === 'completed' ? new Date().toISOString().slice(0, 10) : null,
    })
        .select('*')
        .single();
    if (error) {
        res.status(400).json({ error: error.message });
        return;
    }
    await recordAuditLog({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'inspection_recorded',
        entityType: 'inspection_records',
        entityId: data.id,
        ipAddress: req.ip,
    });
    res.status(201).json({ inspection: data });
});
