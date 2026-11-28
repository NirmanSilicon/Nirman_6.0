import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import pg from 'pg';
import * as Sentry from '@sentry/node';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const NEON_AUTH_BASE_URL = (process.env.NEON_AUTH_BASE_URL || '').replace(/\/$/, '');
const NEON_AUTH_JWKS_URL = process.env.NEON_AUTH_JWKS_URL || '';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.2,
  });
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));

// Postgres connection pool (created by Antideploy Auth/Database)
const pool = process.env.DATABASE_URL
  ? new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 8,
    })
  : null;

let dbReady = false;
async function ensureTables() {
  if (!pool || dbReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS eco_profiles (
      user_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      state_json JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS eco_errors (
      id SERIAL PRIMARY KEY,
      source TEXT NOT NULL DEFAULT 'client',
      severity TEXT NOT NULL DEFAULT 'error',
      message TEXT NOT NULL,
      stack TEXT,
      url TEXT,
      user_id TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  dbReady = true;
}

const jwks = NEON_AUTH_JWKS_URL
  ? createRemoteJWKSet(new URL(NEON_AUTH_JWKS_URL))
  : null;

function resolveOriginHeader(req) {
  if (process.env.APP_URL) return process.env.APP_URL;
  const host = req.get('host') || `localhost:${PORT}`;
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  return `${proto}://${host}`;
}

async function resolveAuthenticatedUser(req) {
  const authHeader = req.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ') && jwks) {
    try {
      const token = authHeader.slice(7).trim();
      const { payload } = await jwtVerify(token, jwks);
      if (payload?.sub) {
        return {
          id: String(payload.sub),
          email: String(payload.email || ''),
          name: String(payload.name || payload.email || 'EcoPulse User'),
        };
      }
    } catch {
      // Fall through to session cookie lookup
    }
  }

  if (NEON_AUTH_BASE_URL && req.headers.cookie) {
    try {
      const resp = await fetch(`${NEON_AUTH_BASE_URL}/get-session`, {
        method: 'GET',
        headers: {
          cookie: req.headers.cookie,
          origin: resolveOriginHeader(req),
        },
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.user?.id) {
          return {
            id: String(data.user.id),
            email: String(data.user.email || ''),
            name: String(data.user.name || data.user.email || 'EcoPulse User'),
          };
        }
      }
    } catch {
      // Ignore upstream errors here
    }
  }

  return null;
}

function rewriteSetCookieForLocalOrProxy(rawCookie, req) {
  const isHttps =
    (req.get('x-forwarded-proto') || req.protocol) === 'https';
  let cleaned = rawCookie
    .replace(/;\s*Domain=[^;]+/gi, '')
    .replace(/;\s*SameSite=None/gi, '; SameSite=Lax');
  if (!isHttps) {
    cleaned = cleaned.replace(/;\s*Secure/gi, '');
  }
  return cleaned;
}

// Same-origin Better Auth / Neon Auth proxy so cookies work reliably on all browsers
app.use('/api/auth', async (req, res) => {
  if (!NEON_AUTH_BASE_URL) {
    return res.status(503).json({
      error: 'Authentication is not configured on this environment yet.',
    });
  }

  const subPath = req.originalUrl.replace(/^\/api\/auth/, '');
  const targetUrl = `${NEON_AUTH_BASE_URL}${subPath}`;

  try {
    const forwardHeaders = {
      origin: resolveOriginHeader(req),
      'content-type': 'application/json',
    };
    if (req.headers.cookie) {
      forwardHeaders.cookie = req.headers.cookie;
    }

    const fetchOpts = {
      method: req.method,
      headers: forwardHeaders,
    };

    if (!['GET', 'HEAD'].includes(req.method) && req.body !== undefined) {
      fetchOpts.body = JSON.stringify(req.body);
    }

    const upstream = await fetch(targetUrl, fetchOpts);

    // Forward Set-Cookie headers safely
    const getSetCookie = upstream.headers.getSetCookie?.bind(upstream.headers);
    const rawCookies = getSetCookie ? getSetCookie() : [];
    if (rawCookies.length > 0) {
      res.setHeader(
        'Set-Cookie',
        rawCookies.map((c) => rewriteSetCookieForLocalOrProxy(c, req))
      );
    }

    const retryAfter = upstream.headers.get('x-retry-after');
    if (retryAfter) {
      res.setHeader('x-retry-after', retryAfter);
    }

    const text = await upstream.text();
    const contentType = upstream.headers.get('content-type') || 'application/json';
    res.status(upstream.status).type(contentType).send(text);
  } catch (err) {
    if (process.env.SENTRY_DSN) Sentry.captureException(err);
    res.status(502).json({ error: 'Unable to reach authentication service.' });
  }
});

app.get('/api/health', async (_req, res) => {
  let dbOk = false;
  if (pool) {
    try {
      await ensureTables();
      await pool.query('SELECT 1');
      dbOk = true;
    } catch {
      dbOk = false;
    }
  }
  res.json({
    ok: true,
    authConfigured: Boolean(NEON_AUTH_BASE_URL),
    databaseConnected: dbOk,
    sentryConfigured: Boolean(process.env.SENTRY_DSN),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Sync user EcoPulse points, streak, badges, and disposal history to Postgres
app.get('/api/eco-state', async (req, res) => {
  const user = await resolveAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not signed in.' });
  }
  if (!pool) {
    return res.json({ user, state: null });
  }
  try {
    await ensureTables();
    const { rows } = await pool.query(
      'SELECT state_json FROM eco_profiles WHERE user_id = $1',
      [user.id]
    );
    return res.json({
      user,
      state: rows[0]?.state_json ?? null,
    });
  } catch (err) {
    if (process.env.SENTRY_DSN) Sentry.captureException(err);
    return res.status(500).json({ error: 'Failed to load profile state.' });
  }
});

app.put('/api/eco-state', async (req, res) => {
  const user = await resolveAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not signed in.' });
  }
  if (!pool) {
    return res.json({ ok: true, persisted: false });
  }
  try {
    await ensureTables();
    const state = req.body?.state;
    if (!state || typeof state !== 'object') {
      return res.status(400).json({ error: 'Invalid state payload.' });
    }
    await pool.query(
      `INSERT INTO eco_profiles (user_id, display_name, email, state_json, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         display_name = EXCLUDED.display_name,
         email = EXCLUDED.email,
         state_json = EXCLUDED.state_json,
         updated_at = NOW()`,
      [user.id, user.name, user.email, JSON.stringify(state)]
    );
    return res.json({ ok: true, persisted: true });
  } catch (err) {
    if (process.env.SENTRY_DSN) Sentry.captureException(err);
    return res.status(500).json({ error: 'Failed to save profile state.' });
  }
});

// Live community leaderboard backed by Postgres
app.get('/api/leaderboard', async (_req, res) => {
  if (!pool) {
    return res.json({ entries: [] });
  }
  try {
    await ensureTables();
    const { rows } = await pool.query(
      `SELECT
         user_id,
         NULLIF(display_name, '') AS display_name,
         (state_json->>'lifetimePoints')::int AS points,
         (state_json->>'streakDays')::int AS streak,
         (state_json->>'totalItemsSorted')::int AS sorted
       FROM eco_profiles
       ORDER BY (state_json->>'lifetimePoints')::int DESC NULLS LAST
       LIMIT 10`
    );
    return res.json({
      entries: rows.map((r) => ({
        userId: r.user_id,
        name: r.display_name || 'EcoPulse Member',
        team: `${r.sorted ?? 0} items sorted`,
        points: r.points ?? 0,
        streak: r.streak ?? 1,
      })),
    });
  } catch (err) {
    if (process.env.SENTRY_DSN) Sentry.captureException(err);
    return res.json({ entries: [] });
  }
});

// Client & server error tracking endpoint (Postgres + optional Sentry)
app.post('/api/errors', async (req, res) => {
  const { source, severity, message, stack, url } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing error message.' });
  }

  const user = await resolveAuthenticatedUser(req);
  const safeMsg = message.slice(0, 500);
  const safeStack = typeof stack === 'string' ? stack.slice(0, 2500) : null;
  const safeSource = typeof source === 'string' ? source.slice(0, 60) : 'client';
  const safeSeverity = typeof severity === 'string' ? severity.slice(0, 20) : 'error';

  if (process.env.SENTRY_DSN) {
    Sentry.captureMessage(`[${safeSource}] ${safeMsg}`, {
      level: safeSeverity === 'warning' ? 'warning' : 'error',
      extra: { stack: safeStack, url, userId: user?.id },
    });
  }

  if (pool) {
    try {
      await ensureTables();
      await pool.query(
        `INSERT INTO eco_errors (source, severity, message, stack, url, user_id, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          safeSource,
          safeSeverity,
          safeMsg,
          safeStack,
          typeof url === 'string' ? url.slice(0, 300) : null,
          user?.id ?? null,
          String(req.get('user-agent') || '').slice(0, 250),
        ]
      );
    } catch {
      // Do not fail client reporting if DB insert fails
    }
  }

  return res.status(201).json({ recorded: true });
});

app.get('/api/errors', async (_req, res) => {
  if (!pool) {
    return res.json({ errors: [], sentryConfigured: Boolean(process.env.SENTRY_DSN) });
  }
  try {
    await ensureTables();
    const { rows } = await pool.query(
      `SELECT id, source, severity, message, url, created_at
       FROM eco_errors
       ORDER BY created_at DESC
       LIMIT 20`
    );
    return res.json({
      errors: rows,
      sentryConfigured: Boolean(process.env.SENTRY_DSN),
    });
  } catch {
    return res.json({ errors: [], sentryConfigured: Boolean(process.env.SENTRY_DSN) });
  }
});

const GEMINI_VISION_MODELS = [
  {
    name: 'gemini-3-flash-preview',
    timeoutMs: 4500,
    generationConfig: {
      thinkingConfig: { thinkingLevel: 'MINIMAL' },
      maxOutputTokens: 20,
      temperature: 0.1,
    },
  },
  {
    name: 'gemini-3.5-flash-lite',
    timeoutMs: 4000,
    generationConfig: {
      maxOutputTokens: 20,
      temperature: 0.1,
    },
  },
  {
    name: 'gemini-3.5-flash',
    timeoutMs: 4000,
    generationConfig: {
      maxOutputTokens: 20,
      temperature: 0.1,
    },
  },
];

// Server-side Gemini Vision classification proxy so API keys never reach browser code
app.post('/api/vision/gemini', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Gemini Vision is not configured.' });
  }

  const { imageBase64, mimeType } = req.body || {};
  if (typeof imageBase64 !== 'string' || imageBase64.length < 32 || imageBase64.length > 2_000_000) {
    return res.status(400).json({ error: 'Invalid image payload.' });
  }

  const safeMime =
    mimeType === 'image/png' || mimeType === 'image/webp' ? mimeType : 'image/jpeg';

  const contents = [
    {
      parts: [
        {
          text: 'Identify the primary waste object in this photo in 2-5 lowercase keywords (e.g., "plastic water bottle", "banana peel", "lithium battery", "smartphone", "cardboard box", "glass bottle", "aluminum can", "chip wrapper", "aerosol spray"). Reply with ONLY the keywords.',
        },
        { inline_data: { mime_type: safeMime, data: imageBase64 } },
      ],
    },
  ];

  for (const modelCfg of GEMINI_VISION_MODELS) {
    try {
      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelCfg.name}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: modelCfg.generationConfig,
          }),
          signal: AbortSignal.timeout(modelCfg.timeoutMs),
        }
      );

      if (upstream.ok) {
        const data = await upstream.json();
        const label = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (label) {
          return res.json({ label, model: modelCfg.name });
        }
      }

      if (![404, 408, 429, 500, 502, 503, 504].includes(upstream.status)) {
        break;
      }
    } catch (err) {
      if (process.env.SENTRY_DSN && err?.name !== 'TimeoutError' && err?.name !== 'AbortError') {
        Sentry.captureException(err);
      }
    }
  }

  return res.status(502).json({ error: 'Gemini Vision temporarily unavailable.' });
});

// Serve built Vite SPA safely without stale HTML revalidation or MIME-type fallback errors
const distDir = path.join(__dirname, 'dist');
app.use(
  '/assets',
  express.static(path.join(distDir, 'assets'), {
    maxAge: '30d',
    immutable: true,
  })
);
app.use(
  express.static(distDir, {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    },
  })
);
app.use((req, res) => {
  if (
    req.path.startsWith('/api/') ||
    req.path.startsWith('/assets/') ||
    req.path.startsWith('/models/') ||
    req.path.startsWith('/images/') ||
    /\.[a-z0-9]{1,8}$/i.test(req.path)
  ) {
    return res.status(404).end();
  }
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(distDir, 'index.html'), {
    lastModified: false,
    etag: false,
    cacheControl: false,
  });
});

app.use((err, req, res, _next) => {
  if (process.env.SENTRY_DSN) Sentry.captureException(err);
  if (pool) {
    ensureTables()
      .then(() =>
        pool.query(
          `INSERT INTO eco_errors (source, severity, message, stack, url)
           VALUES ('server', 'error', $1, $2, $3)`,
          [String(err?.message || 'Server error').slice(0, 500), String(err?.stack || '').slice(0, 2000), req.originalUrl]
        )
      )
      .catch(() => {});
  }
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`EcoPulse server listening on port ${PORT}`);
});
