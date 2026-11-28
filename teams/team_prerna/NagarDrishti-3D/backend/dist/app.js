import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { getAllowedOrigins, isCopernicusConfigured, isSupabaseConfigured } from './config/env.js';
import { getSupabaseAdmin } from './config/supabase.js';
import { apiRateLimiter, errorHandler } from './middleware/security.js';
import { authRouter } from './routes/authRoutes.js';
import { complaintsRouter } from './routes/complaintsRoutes.js';
import { dashboardRouter } from './routes/dashboardRoutes.js';
import { evidenceRouter } from './routes/evidenceRoutes.js';
import { projectsRouter } from './routes/projectsRoutes.js';
import { scenariosRouter } from './routes/scenariosRoutes.js';
export function createApp() {
    const app = express();
    app.set('trust proxy', 1);
    app.use(helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    const allowedOrigins = getAllowedOrigins();
    app.use(cors({
        origin(origin, callback) {
            if (!origin)
                return callback(null, true);
            if (allowedOrigins.includes(origin))
                return callback(null, true);
            return callback(new Error('Origin not permitted by CORS policy'));
        },
        credentials: true,
    }));
    app.use(express.json({ limit: '2mb' }));
    app.use('/api', apiRateLimiter);
    app.get('/api/health', async (_req, res) => {
        const configured = isSupabaseConfigured();
        let databaseConnected = false;
        let databaseError = null;
        if (configured) {
            const admin = getSupabaseAdmin();
            if (admin) {
                const { error } = await admin.from('departments').select('id').limit(1);
                if (!error) {
                    databaseConnected = true;
                }
                else {
                    databaseError =
                        error.code === 'PGRST205'
                            ? 'Supabase tables are unavailable. Apply database migrations 001-005 in order.'
                            : 'Supabase database query failed. Check backend logs and database configuration.';
                }
            }
        }
        else {
            databaseError =
                'Backend Supabase credentials are incomplete. Configure SUPABASE_URL, a publishable key, and SUPABASE_SECRET_KEY (or the legacy service-role key).';
        }
        res.status(databaseConnected ? 200 : 503).json({
            status: databaseConnected ? 'ok' : 'degraded',
            service: 'nagardrishti-backend',
            supabaseConfigured: configured,
            databaseConnected,
            databaseError,
            copernicusConfigured: isCopernicusConfigured(),
            mode: databaseConnected ? 'database' : 'unavailable',
            timestamp: new Date().toISOString(),
        });
    });
    app.use('/api/auth', authRouter);
    app.use('/api/projects', projectsRouter);
    app.use('/api/evidence', evidenceRouter);
    app.use('/api/complaints', complaintsRouter);
    app.use('/api/scenarios', scenariosRouter);
    app.use('/api', dashboardRouter);
    app.use((_req, res) => {
        res.status(404).json({ error: 'API route not found' });
    });
    app.use(errorHandler);
    return app;
}
