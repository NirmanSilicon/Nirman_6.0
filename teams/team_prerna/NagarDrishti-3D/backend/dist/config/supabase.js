import { createClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from './env.js';
let adminClient = null;
let anonClient = null;
export function getSupabaseAdmin() {
    if (!isSupabaseConfigured())
        return null;
    if (!adminClient) {
        const secretKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
        adminClient = createClient(env.SUPABASE_URL, secretKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });
    }
    return adminClient;
}
export function getSupabaseAnon() {
    if (!isSupabaseConfigured())
        return null;
    if (!anonClient) {
        const publishableKey = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
        anonClient = createClient(env.SUPABASE_URL, publishableKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });
    }
    return anonClient;
}
