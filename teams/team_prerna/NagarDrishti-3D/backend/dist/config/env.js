import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();
const envSchema = z.object({
    PORT: z.coerce.number().int().positive().default(4000),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
    SUPABASE_URL: z.string().optional().default(''),
    SUPABASE_PUBLISHABLE_KEY: z.string().optional().default(''),
    SUPABASE_ANON_KEY: z.string().optional().default(''),
    SUPABASE_SECRET_KEY: z.string().optional().default(''),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
    PYTHON_SERVICE_URL: z.string().default('http://localhost:8000'),
    ADMIN_BOOTSTRAP_TOKEN: z.string().optional().default(''),
    COPERNICUS_CLIENT_ID: z.string().optional().default(''),
    COPERNICUS_CLIENT_SECRET: z.string().optional().default(''),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
    process.exit(1);
}
export const env = parsed.data;
export function isSupabaseConfigured() {
    const publishableKey = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
    const secretKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
    return Boolean(env.SUPABASE_URL &&
        publishableKey &&
        secretKey &&
        !env.SUPABASE_URL.includes('your-project-ref'));
}
export function isCopernicusConfigured() {
    return Boolean(env.COPERNICUS_CLIENT_ID && env.COPERNICUS_CLIENT_SECRET);
}
export function getAllowedOrigins() {
    return env.FRONTEND_ORIGIN.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
}
