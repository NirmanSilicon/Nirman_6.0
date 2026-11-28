/**
 * Secure one-time CLI procedure to promote the first verified user account to Administrator.
 * Usage: npm --prefix backend run bootstrap-admin -- owner@example.com
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run bootstrap-admin -- <verified-owner-email>');
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || url.includes('your-project-ref')) {
  console.error('Set SUPABASE_URL and SUPABASE_SECRET_KEY (or the legacy SUPABASE_SERVICE_ROLE_KEY) in backend/.env.');
  process.exit(1);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin');
  if ((count ?? 0) > 0) {
    console.error('Aborted: An administrator account already exists.');
    process.exit(1);
  }

  const { data: profile, error } = await admin
    .from('profiles')
    .select('id, email, role')
    .ilike('email', email)
    .single();

  if (error || !profile) {
    console.error(`No profile found for ${email}. Register and verify your email first.`);
    process.exit(1);
  }

  const { error: upErr } = await admin
    .from('profiles')
    .update({ role: 'admin', account_status: 'active', updated_at: new Date().toISOString() })
    .eq('id', profile.id);

  if (upErr) {
    console.error('Failed to promote user:', upErr.message);
    process.exit(1);
  }

  await admin.from('audit_logs').insert({
    actor_id: profile.id,
    actor_role: 'admin',
    action: 'admin_cli_bootstrap',
    entity_type: 'profiles',
    entity_id: profile.id,
    metadata: { email: profile.email },
  });

  console.log(`Success: ${profile.email} is now the active Administrator.`);
}

main();
