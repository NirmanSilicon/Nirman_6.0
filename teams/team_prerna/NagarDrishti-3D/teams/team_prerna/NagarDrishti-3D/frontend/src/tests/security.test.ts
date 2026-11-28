import { afterEach, describe, expect, it, vi } from 'vitest';
import { isFrontendSupabaseConfigured } from '../lib/supabase';

describe('Frontend Environment & Security Checks', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('never embeds service_role credentials in frontend config', () => {
    const metaEnvKeys = Object.keys(import.meta.env);
    for (const key of metaEnvKeys) {
      expect(key.toUpperCase()).not.toContain('SERVICE_ROLE');
    }
    expect(typeof isFrontendSupabaseConfigured).toBe('boolean');
  });

  it('accepts a Supabase publishable key as the public browser key', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
    const config = await import('../lib/supabase');

    expect(config.isFrontendSupabaseConfigured).toBe(true);
    expect(config.supabase).not.toBeNull();
  });
});
