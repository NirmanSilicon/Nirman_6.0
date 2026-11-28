import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { computeProjectComparisons } from '../services/comparisonService.js';
import { calculateImpactAnalysis } from '../services/impactService.js';
import { sanitizeFilename, validateUploadedFile } from '../middleware/security.js';

describe('Comparison Engine', () => {
  it('computes difference, coverage %, and possible_discrepancy accurately', () => {
    const res = computeProjectComparisons(
      { length_m: 2000 },
      { measured_length_m: 1400, survey_date: '2026-10-12', method: 'dgps' }
    );
    expect(res).toHaveLength(1);
    expect(res[0].official_value).toBe(2000);
    expect(res[0].measured_value).toBe(1400);
    expect(res[0].difference_value).toBe(-600);
    expect(res[0].coverage_pct).toBe(70);
    expect(res[0].result_status).toBe('possible_discrepancy');
  });

  it('marks within +/-5% as consistent', () => {
    const res = computeProjectComparisons({ area_sqm: 10000 }, { measured_area_sqm: 9800 });
    expect(res[0].result_status).toBe('consistent');
    expect(res[0].coverage_pct).toBe(98);
  });

  it('marks missing official or measured side as insufficient_evidence', () => {
    const res = computeProjectComparisons({ length_m: 1450 }, {});
    expect(res[0].result_status).toBe('insufficient_evidence');
  });
});

describe('Impact Analysis Calculator', () => {
  it('calculates road area, green space, GFA cost, and preserves simulation disclaimer', () => {
    const report = calculateImpactAnalysis({
      existingRoadAreaSqm: 5000,
      existingGreenAreaSqm: 2000,
      models: [
        {
          model_type: 'new_road',
          label: 'Link Road',
          width_m: 10,
          length_m: 100,
          height_m: 0.5,
          scale_x: 1,
          scale_y: 1,
          scale_z: 1,
        },
        {
          model_type: 'park',
          label: 'Pocket Park',
          width_m: 20,
          length_m: 30,
          height_m: 1,
          scale_x: 1,
          scale_y: 1,
          scale_z: 1,
        },
      ],
    });
    expect(report.is_simulation).toBe(true);
    expect(report.proposed_additional_road_area_sqm).toBe(1000);
    expect(report.total_proposed_road_area_sqm).toBe(6000);
    expect(report.proposed_green_space_change_sqm).toBe(600);
    expect(report.estimated_cost_inr).toBe(1000 * 3200 + 600 * 1400);
    expect(report.unavailable_data_notices.length).toBeGreaterThan(0);
  });
});

describe('Upload & Security Validation', () => {
  it('rejects executable extensions and spoofed MIME types', () => {
    const fakeExe = {
      originalname: 'payload.exe',
      mimetype: 'application/octet-stream',
      size: 100,
      buffer: Buffer.from('MZtest'),
    } as Express.Multer.File;
    expect(validateUploadedFile(fakeExe, 'image').ok).toBe(false);

    const spoofedJpg = {
      originalname: 'spoof.jpg',
      mimetype: 'image/jpeg',
      size: 16,
      buffer: Buffer.from('<script>alert(1)</script>'),
    } as Express.Multer.File;
    expect(validateUploadedFile(spoofedJpg, 'image').ok).toBe(false);
  });

  it('accepts valid PNG magic bytes and sanitizes filenames', () => {
    const validPng = {
      originalname: '../../bad name!.png',
      mimetype: 'image/png',
      size: 8,
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    } as Express.Multer.File;
    const result = validateUploadedFile(validPng, 'image');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.safeName).not.toContain('..');
      expect(result.sha256).toHaveLength(64);
    }
    expect(sanitizeFilename('a/b/c test?.pdf')).toMatch(/\.pdf$/);
  });
});

describe('API Security & Unauthenticated Rejection', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function createUnconfiguredApp() {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('SUPABASE_ANON_KEY', '');
    vi.stubEnv('SUPABASE_SECRET_KEY', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    vi.resetModules();
    const { createApp } = await import('../app.js');
    return createApp();
  }

  it('reports database unavailability and never substitutes bundled demo data', async () => {
    const app = await createUnconfiguredApp();
    const health = await request(app).get('/api/health');
    expect(health.status).toBe(503);
    expect(health.body.service).toBe('nagardrishti-backend');
    expect(health.body.status).toBe('degraded');
    expect(health.body.mode).toBe('unavailable');
    expect(health.body.databaseConnected).toBe(false);
    expect(JSON.stringify(health.body)).not.toContain('SERVICE_ROLE');

    const projects = await request(app).get('/api/projects');
    expect(projects.status).toBe(503);
    expect(projects.body.code).toBe('DATABASE_UNAVAILABLE');
    expect(projects.body.projects).toBeUndefined();

    const lookups = await request(app).get('/api/projects/meta/lookups');
    expect(lookups.status).toBe(503);
    expect(lookups.body.departments).toBeUndefined();

    const comparisons = await request(app).get('/api/evidence/comparisons');
    expect(comparisons.status).toBe(503);
    expect(comparisons.body.comparisons).toBeUndefined();
  });

  it('rejects unauthenticated requests to protected endpoints with 401', async () => {
    const app = await createUnconfiguredApp();
    const protectedEndpoints = [
      request(app).get('/api/auth/me'),
      request(app).post('/api/auth/bootstrap-admin').send({ bootstrapToken: '1234567890123456' }),
      request(app).post('/api/projects').send({ name: 'Unauth' }),
      request(app).get('/api/complaints'),
      request(app).post('/api/complaints').send({ title: 'Test' }),
      request(app).get('/api/admin/users'),
      request(app).get('/api/admin/audit-logs'),
    ];
    const responses = await Promise.all(protectedEndpoints);
    for (const r of responses) {
      expect(r.status).toBe(401);
    }
  });
});
