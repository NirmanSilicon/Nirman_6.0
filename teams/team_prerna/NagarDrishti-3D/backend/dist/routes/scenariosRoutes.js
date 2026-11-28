import { Router } from 'express';
import { z } from 'zod';
import { getSupabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { calculateImpactAnalysis, DEFAULT_COST_RATES } from '../services/impactService.js';
export const scenariosRouter = Router();
const modelSchema = z.object({
    model_type: z.enum([
        'road_widening',
        'new_road',
        'park',
        'residential_building',
        'commercial_building',
        'hospital',
        'school',
        'drainage',
        'public_transport',
    ]),
    label: z.string().min(1).max(100),
    position_x: z.number(),
    position_y: z.number(),
    position_z: z.number(),
    rotation_y: z.number(),
    scale_x: z.number().positive(),
    scale_y: z.number().positive(),
    scale_z: z.number().positive(),
    width_m: z.number().positive(),
    length_m: z.number().positive(),
    height_m: z.number().positive(),
});
const scenarioSchema = z.object({
    title: z.string().min(3).max(160),
    description: z.string().max(1000).optional(),
    city: z.string().min(2).max(80).default('Bhubaneswar'),
    ward: z.string().min(1).max(80),
    center_lat: z.number().min(-90).max(90),
    center_lng: z.number().min(-180).max(180),
    existing_road_area_sqm: z.number().nonnegative().default(0),
    existing_green_area_sqm: z.number().nonnegative().default(0),
    cost_rates: z
        .object({
        road_per_sqm_inr: z.number().positive(),
        park_per_sqm_inr: z.number().positive(),
        building_per_sqm_inr: z.number().positive(),
        drainage_per_m_inr: z.number().positive(),
        transit_unit_inr: z.number().positive(),
    })
        .optional(),
    is_public: z.boolean().default(false),
    models: z.array(modelSchema).max(200),
});
scenariosRouter.get('/', requireAuth, async (req, res) => {
    const admin = getSupabaseAdmin();
    if (!admin) {
        res.status(503).json({
            error: 'Supabase database is unavailable. Scenarios were not loaded.',
            code: 'DATABASE_UNAVAILABLE',
        });
        return;
    }
    let query = admin
        .from('future_scenarios')
        .select('*, scenario_models(*)')
        .order('updated_at', { ascending: false });
    if (req.user.role !== 'admin' && req.user.role !== 'officer') {
        query = query.or(`created_by.eq.${req.user.id},is_public.eq.true`);
    }
    const { data, error } = await query;
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.json({ scenarios: data ?? [], mode: 'database' });
});
scenariosRouter.post('/', requireAuth, async (req, res) => {
    const admin = getSupabaseAdmin();
    if (!admin) {
        res.status(503).json({ error: 'Database not configured.' });
        return;
    }
    const parsed = scenarioSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid scenario payload', details: parsed.error.flatten() });
        return;
    }
    const d = parsed.data;
    const { data: scenario, error: sErr } = await admin
        .from('future_scenarios')
        .insert({
        title: d.title,
        description: d.description || null,
        city: d.city,
        ward: d.ward,
        created_by: req.user.id,
        center_lat: d.center_lat,
        center_lng: d.center_lng,
        existing_road_area_sqm: d.existing_road_area_sqm,
        existing_green_area_sqm: d.existing_green_area_sqm,
        cost_rates: d.cost_rates || DEFAULT_COST_RATES,
        is_simulation: true,
        is_public: d.is_public,
    })
        .select('*')
        .single();
    if (sErr || !scenario) {
        res.status(500).json({ error: sErr?.message || 'Failed to save scenario.' });
        return;
    }
    if (d.models.length > 0) {
        const { error: mErr } = await admin
            .from('scenario_models')
            .insert(d.models.map((m) => ({ ...m, scenario_id: scenario.id })));
        if (mErr) {
            res.status(500).json({ error: mErr.message });
            return;
        }
    }
    const { data: full } = await admin
        .from('future_scenarios')
        .select('*, scenario_models(*)')
        .eq('id', scenario.id)
        .single();
    res.status(201).json({ scenario: full });
});
scenariosRouter.put('/:id', requireAuth, async (req, res) => {
    const admin = getSupabaseAdmin();
    if (!admin) {
        res.status(503).json({ error: 'Database not configured.' });
        return;
    }
    const { data: existing } = await admin
        .from('future_scenarios')
        .select('id, created_by')
        .eq('id', req.params.id)
        .single();
    if (!existing) {
        res.status(404).json({ error: 'Scenario not found.' });
        return;
    }
    if (existing.created_by !== req.user.id && req.user.role !== 'admin') {
        res.status(403).json({ error: 'You may only edit your own scenarios.' });
        return;
    }
    const parsed = scenarioSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid scenario payload', details: parsed.error.flatten() });
        return;
    }
    const d = parsed.data;
    await admin
        .from('future_scenarios')
        .update({
        title: d.title,
        description: d.description || null,
        city: d.city,
        ward: d.ward,
        center_lat: d.center_lat,
        center_lng: d.center_lng,
        existing_road_area_sqm: d.existing_road_area_sqm,
        existing_green_area_sqm: d.existing_green_area_sqm,
        cost_rates: d.cost_rates || DEFAULT_COST_RATES,
        is_public: d.is_public,
        updated_at: new Date().toISOString(),
    })
        .eq('id', existing.id);
    await admin.from('scenario_models').delete().eq('scenario_id', existing.id);
    if (d.models.length > 0) {
        await admin.from('scenario_models').insert(d.models.map((m) => ({ ...m, scenario_id: existing.id })));
    }
    const { data: full } = await admin
        .from('future_scenarios')
        .select('*, scenario_models(*)')
        .eq('id', existing.id)
        .single();
    res.json({ scenario: full });
});
scenariosRouter.delete('/:id', requireAuth, async (req, res) => {
    const admin = getSupabaseAdmin();
    if (!admin) {
        res.status(503).json({ error: 'Database not configured.' });
        return;
    }
    const { data: existing } = await admin
        .from('future_scenarios')
        .select('id, created_by')
        .eq('id', req.params.id)
        .single();
    if (!existing) {
        res.status(404).json({ error: 'Scenario not found.' });
        return;
    }
    if (existing.created_by !== req.user.id && req.user.role !== 'admin') {
        res.status(403).json({ error: 'You may only delete your own scenarios.' });
        return;
    }
    await admin.from('future_scenarios').delete().eq('id', existing.id);
    res.json({ deleted: true });
});
scenariosRouter.post('/impact', async (req, res) => {
    const impactReqSchema = z.object({
        center_lat: z.number().min(-90).max(90),
        center_lng: z.number().min(-180).max(180),
        existing_road_area_sqm: z.number().nonnegative().default(0),
        existing_green_area_sqm: z.number().nonnegative().default(0),
        cost_rates: z
            .object({
            road_per_sqm_inr: z.number().positive(),
            park_per_sqm_inr: z.number().positive(),
            building_per_sqm_inr: z.number().positive(),
            drainage_per_m_inr: z.number().positive(),
            transit_unit_inr: z.number().positive(),
        })
            .partial()
            .optional(),
        models: z.array(modelSchema),
    });
    const parsed = impactReqSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid impact calculation input', details: parsed.error.flatten() });
        return;
    }
    const d = parsed.data;
    const admin = getSupabaseAdmin();
    if (!admin) {
        res.status(503).json({
            error: 'Supabase database is unavailable. Impact analysis requires database facility data.',
            code: 'DATABASE_UNAVAILABLE',
        });
        return;
    }
    const { data, error } = await admin.rpc('nearest_public_facilities', {
        p_lng: d.center_lng,
        p_lat: d.center_lat,
    });
    if (error) {
        res.status(500).json({
            error: 'Failed to load public facility references from Supabase.',
            code: 'DATABASE_QUERY_FAILED',
        });
        return;
    }
    const nearestFacilities = Array.isArray(data) ? data : [];
    const report = calculateImpactAnalysis({
        existingRoadAreaSqm: d.existing_road_area_sqm,
        existingGreenAreaSqm: d.existing_green_area_sqm,
        models: d.models,
        costRates: d.cost_rates,
        nearestFacilities,
    });
    res.json({ impact: report });
});
