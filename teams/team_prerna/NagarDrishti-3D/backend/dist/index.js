import { createApp } from './app.js';
import { env, isSupabaseConfigured } from './config/env.js';
const app = createApp();
app.listen(env.PORT, () => {
    console.log(`[NagarDrishti 3D API] Listening on http://localhost:${env.PORT} | Supabase configured: ${isSupabaseConfigured()}`);
});
