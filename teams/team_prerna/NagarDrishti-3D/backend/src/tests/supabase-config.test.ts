import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('Supabase environment key aliases', () => {
  it('accepts publishable and secret keys from current Supabase projects', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test');
    const { isSupabaseConfigured } = await import('../config/env.js');

    expect(isSupabaseConfigured()).toBe(true);
  });

  it('continues supporting legacy anon and service-role key names', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_ANON_KEY', 'legacy-anon-test');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'legacy-service-role-test');
    const { isSupabaseConfigured } = await import('../config/env.js');

    expect(isSupabaseConfigured()).toBe(true);
  });

  it('does not report server database access as configured without a private key', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
    vi.stubEnv('SUPABASE_SECRET_KEY', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const { isSupabaseConfigured } = await import('../config/env.js');

    expect(isSupabaseConfigured()).toBe(false);
  });
});
