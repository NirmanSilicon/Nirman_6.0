import 'dotenv/config';
import express from 'express';
import http, { type IncomingMessage } from 'http';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import config from '../firebase-applet-config.json' with { type: 'json' };
import { initializeApp as initializeAdminApp, getApps as getAdminApps, applicationDefault } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { companionAiService } from './companion/service';
import { normalizeLanguage } from './companion/prompts';
import {
  dispatchEmergencyAlertNotification,
  removeRegisteredToken,
  upsertRegisteredToken,
  type DispatchEventType,
} from './notifications/alertNotificationRouter';

function getAdminServices() {
  try {
    const existing = getAdminApps().find((a) => a.name === 'janmasaathi-server');
    const app =
      existing ||
      initializeAdminApp(
        {
          credential: applicationDefault(),
          projectId: config.projectId,
        },
        'janmasaathi-server'
      );
    return {
      auth: getAdminAuth(app),
    };
  } catch {
    return null;
  }
}

async function tryMintFirebaseCustomToken(
  uid: string,
  claims: Record<string, string>
): Promise<{ customToken: string | null; unavailableReason?: string }> {
  const services = getAdminServices();
  if (!services) {
    return { customToken: null, unavailableReason: 'Firebase Admin SDK is not initialized.' };
  }
  try {
    const customToken = await services.auth.createCustomToken(uid, claims);
    return { customToken };
  } catch (err: any) {
    return {
      customToken: null,
      unavailableReason:
        err?.message || 'Service account lacks iam.serviceAccounts.signBlob permission for custom token minting.',
    };
  }
}

async function tryLookupUserDocFromFirestore(
  _uid: string
): Promise<{ role?: SessionRole; motherId?: string | null; staffId?: string | null } | null> {
  return null;
}

async function resolveVerifiedMotherAssignment(
  motherId: string
): Promise<{ workerId: string; workerName: string; supervisorId: string } | null> {
  if (KNOWN_MATERNAL_ASSIGNMENTS[motherId]) {
    return KNOWN_MATERNAL_ASSIGNMENTS[motherId];
  }
  return null;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '16mb' }));

function resolveSessionSecret(): string {
  const fromEnv = process.env.JANMASAATHI_SESSION_SECRET?.trim();
  if (fromEnv) return fromEnv;
  const secretPath = path.join(os.tmpdir(), '.janmasaathi_session_secret');
  try {
    if (fs.existsSync(secretPath)) {
      const existing = fs.readFileSync(secretPath, 'utf8').trim();
      if (existing.length >= 32) return existing;
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secretPath, generated, { mode: 0o600 });
    return generated;
  } catch {
    return crypto.randomBytes(32).toString('hex');
  }
}

// Signed server-side session token configuration (persisted CSPRNG secret across dev restarts)
const SESSION_SECRET = resolveSessionSecret();
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const VOICE_STORE_DIR = path.join(os.tmpdir(), 'janmasaathi-voice-audio');

type SessionRole = 'mother' | 'worker' | 'supervisor';

interface ServerSessionPayload {
  uid: string;
  role: SessionRole;
  motherId?: string;
  staffId?: string;
  exp: number;
}

function timingSafeTextEqual(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function signSessionToken(payload: Omit<ServerSessionPayload, 'exp'>): string {
  const fullPayload: ServerSessionPayload = {
    ...payload,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySessionToken(rawToken: string | undefined | null): ServerSessionPayload | null {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const parts = rawToken.trim().split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as ServerSessionPayload;
    if (!parsed || typeof parsed.exp !== 'number' || parsed.exp <= Date.now()) {
      return null;
    }
    if (parsed.role !== 'mother' && parsed.role !== 'worker' && parsed.role !== 'supervisor') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function extractBearerToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

// Cache Google public certs for Firebase ID token RS256 verification
let cachedGoogleCerts: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getGoogleSecureTokenCerts(): Promise<Record<string, string>> {
  if (cachedGoogleCerts && cachedGoogleCerts.expiresAt > Date.now()) {
    return cachedGoogleCerts.certs;
  }
  const resp = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!resp.ok) {
    throw new Error(`Unable to fetch Firebase verification certificates (${resp.status}).`);
  }
  const cacheControl = resp.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const ttlSec = maxAgeMatch ? Math.max(60, parseInt(maxAgeMatch[1], 10)) : 3600;
  const certs = (await resp.json()) as Record<string, string>;
  cachedGoogleCerts = { certs, expiresAt: Date.now() + ttlSec * 1000 };
  return certs;
}

async function verifyFirebaseIdToken(
  idToken: string
): Promise<{
  uid: string;
  email?: string;
  name?: string;
  role?: string;
  staffId?: string;
  motherId?: string;
} | null> {
  const parts = idToken.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  let header: { alg?: string; kid?: string };
  let payload: {
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    iat?: number;
    email?: string;
    name?: string;
    role?: string;
    staffId?: string;
    motherId?: string;
  };
  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (header.alg !== 'RS256' || !header.kid) return null;
  const expectedIssuer = `https://securetoken.google.com/${config.projectId}`;
  const nowSec = Math.floor(Date.now() / 1000);
  if (
    payload.aud !== config.projectId ||
    payload.iss !== expectedIssuer ||
    !payload.sub ||
    typeof payload.exp !== 'number' ||
    payload.exp <= nowSec
  ) {
    return null;
  }

  const certs = await getGoogleSecureTokenCerts();
  const cert = certs[header.kid];
  if (!cert) return null;

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const signature = Buffer.from(sigB64, 'base64url');
  const isValid = verifier.verify(cert, signature);
  if (!isValid) return null;

  return {
    uid: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    staffId: payload.staffId,
    motherId: payload.motherId,
  };
}

interface AuthenticatedMotherRequest extends express.Request {
  motherSession?: ServerSessionPayload;
}

interface AuthenticatedUserRequest extends express.Request {
  userSession?: ServerSessionPayload;
}

function requireMotherAuth(
  req: AuthenticatedMotherRequest,
  res: express.Response,
  next: express.NextFunction
) {
  const token = extractBearerToken(req);
  const session = verifySessionToken(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      error: 'Mother authentication is required to access JanmaSaathi AI Companion.',
    });
  }
  if (session.role !== 'mother' || !session.motherId) {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN_ROLE',
      error: 'JanmaSaathi AI Companion is restricted to authenticated Mother accounts.',
    });
  }
  req.motherSession = session;
  return next();
}

function requireChatParticipantAuth(
  req: AuthenticatedUserRequest,
  res: express.Response,
  next: express.NextFunction
) {
  const token = extractBearerToken(req);
  const session = verifySessionToken(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      error: 'Authentication is required to access direct voice messages.',
    });
  }
  req.userSession = session;
  return next();
}

function enforceMotherContextOwnership(
  motherContext: any,
  session: ServerSessionPayload
): { ok: true; scopedContext: any } | { ok: false; error: string } {
  if (!motherContext || typeof motherContext !== 'object') {
    return { ok: true, scopedContext: { motherId: session.motherId } };
  }
  if (
    motherContext.motherId !== undefined &&
    motherContext.motherId !== null &&
    String(motherContext.motherId).trim() !== '' &&
    String(motherContext.motherId).trim() !== session.motherId
  ) {
    return { ok: false, error: 'Unauthorized maternal profile access.' };
  }
  return {
    ok: true,
    scopedContext: {
      ...motherContext,
      motherId: session.motherId,
    },
  };
}

// API: Health & Connected Project Metadata
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    firebase: {
      projectId: config.projectId,
      firestoreDatabaseId: config.firestoreDatabaseId,
      authDomain: config.authDomain,
      storageBucket: config.storageBucket,
    },
  });
});

// API: Mother Demo Credential Verification (issues Mother-scoped Bearer token & optional Firebase Custom Token)
app.post('/api/auth/mother-login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Missing required credentials.' });
  }
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanPassword = String(password).trim();
  const expectedPass = process.env.JANMASAATHI_DEMO_PASS || 'demo1234';

  if (
    timingSafeTextEqual(cleanEmail, 'priya.sharma@example.com') &&
    timingSafeTextEqual(cleanPassword, expectedPass)
  ) {
    const uid = 'auth-user-priya-sharma';
    const token = signSessionToken({
      uid,
      role: 'mother',
      motherId: 'MCP-2026-0894',
    });
    const customTokenResult = await tryMintFirebaseCustomToken(uid, {
      role: 'mother',
      motherId: 'MCP-2026-0894',
    });
    return res.json({
      success: true,
      token,
      firebaseCustomToken: customTokenResult.customToken,
      firebaseCustomTokenUnavailableReason: customTokenResult.unavailableReason || null,
      user: {
        id: 'MCP-2026-0894',
        uid,
        motherId: 'MCP-2026-0894',
        mcpId: 'MCP-2026-0894',
        role: 'mother',
        name: 'Priya Sharma',
        email: 'priya.sharma@example.com',
        phone: '+91 98765 43210',
        assignedWorkerId: 'HW-44120',
        assignedWorkerName: 'Sunita Devi',
        assignedSubCentre: 'Sub-Centre Rampur Health Post',
        village: 'Village Rampur',
        hamlet: 'Sector 4',
      },
    });
  }

  return res.status(401).json({ success: false, error: 'Invalid Mother email or password.' });
});

// API: Staff Credential Verification
app.post('/api/auth/staff-login', async (req, res) => {
  const { staffId, password, role } = req.body || {};
  if (!staffId || !password || !role) {
    return res.status(400).json({ success: false, error: 'Missing required credentials.' });
  }

  const cleanId = String(staffId).trim().toUpperCase();
  const cleanPassword = String(password).trim();
  const expectedPass = process.env.JANMASAATHI_DEMO_PASS || 'demo1234';

  // Role validation
  if (role === 'worker') {
    if (
      (cleanId === 'HW-44120' || cleanId === 'HW-002') &&
      timingSafeTextEqual(cleanPassword, expectedPass)
    ) {
      const uid = `staff-${cleanId.toLowerCase()}`;
      const token = signSessionToken({
        uid,
        role: 'worker',
        staffId: cleanId,
      });
      const customTokenResult = await tryMintFirebaseCustomToken(uid, {
        role: 'worker',
        staffId: cleanId,
      });
      const isKabita = cleanId === 'HW-002';
      return res.json({
        success: true,
        token,
        firebaseCustomToken: customTokenResult.customToken,
        firebaseCustomTokenUnavailableReason: customTokenResult.unavailableReason || null,
        user: {
          id: cleanId,
          uid,
          staffId: cleanId,
          role: 'worker',
          name: isKabita ? 'Kabita Soren' : 'Sunita Devi',
          phone: isKabita ? '+91 97762 33119' : '+91 98451 22340',
          designation: 'Community Health Worker',
          assignedSubCentre: isKabita ? 'Sub-Centre Pipili' : 'Sub-Centre Rampur Health Post',
          village: isKabita ? 'Village Pipili' : 'Village Rampur',
          hamlet: isKabita ? 'Pipili Ward 1' : 'Sector 4',
        },
      });
    }
  } else if (role === 'supervisor') {
    if (cleanId === 'SUP-2025-012' && timingSafeTextEqual(cleanPassword, expectedPass)) {
      const uid = 'staff-sup-2025-012';
      const token = signSessionToken({
        uid,
        role: 'supervisor',
        staffId: 'SUP-2025-012',
      });
      const customTokenResult = await tryMintFirebaseCustomToken(uid, {
        role: 'supervisor',
        staffId: 'SUP-2025-012',
      });
      return res.json({
        success: true,
        token,
        firebaseCustomToken: customTokenResult.customToken,
        firebaseCustomTokenUnavailableReason: customTokenResult.unavailableReason || null,
        user: {
          id: 'SUP-2025-012',
          uid,
          staffId: 'SUP-2025-012',
          role: 'supervisor',
          name: 'Dr. Rajesh Kumar',
          phone: '+91 94370 11984',
          designation: 'Medical Officer In-Charge (MOIC)',
          assignedSubCentre: 'Rampur Block Medical Headquarters',
          village: 'District Khordha',
          district: 'Puri',
        },
      });
    }
  }

  return res.status(401).json({ success: false, error: 'Invalid staff code or password.' });
});

// API: Exchange Verified Firebase ID Token (Google Sign-In / Custom Token) for Scoped Server Session Token
app.post('/api/auth/firebase-session', async (req, res) => {
  try {
    const { idToken, role, requestedStaffId, requestedMotherId } = req.body || {};
    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing Firebase ID token.' });
    }
    const verified = await verifyFirebaseIdToken(idToken);
    if (!verified) {
      return res.status(401).json({ success: false, error: 'Invalid or expired Firebase ID token.' });
    }

    const fsUserDoc = await tryLookupUserDocFromFirestore(verified.uid);
    const verifiedClaimRole =
      verified.role === 'mother' || verified.role === 'worker' || verified.role === 'supervisor'
        ? verified.role
        : fsUserDoc?.role;
    const cleanRole: SessionRole =
      verifiedClaimRole || (role === 'worker' || role === 'supervisor' ? role : 'mother');

    const resolvedMotherId =
      cleanRole === 'mother'
        ? verified.motherId ||
          fsUserDoc?.motherId ||
          (typeof requestedMotherId === 'string' && requestedMotherId.trim()
            ? requestedMotherId.trim()
            : 'MCP-2026-0894')
        : undefined;

    const validWorkers = new Set(['HW-44120', 'HW-002', 'HW-003', 'HW-004', 'HW-005', 'HW-006']);
    const candidateStaffId =
      verified.staffId ||
      fsUserDoc?.staffId ||
      (typeof requestedStaffId === 'string' ? requestedStaffId.trim().toUpperCase() : '');

    const resolvedStaffId =
      cleanRole === 'worker'
        ? validWorkers.has(candidateStaffId)
          ? candidateStaffId
          : 'HW-44120'
        : cleanRole === 'supervisor'
        ? candidateStaffId === 'SUP-2025-012'
          ? candidateStaffId
          : 'SUP-2025-012'
        : undefined;

    const token = signSessionToken({
      uid: verified.uid,
      role: cleanRole,
      ...(resolvedMotherId ? { motherId: resolvedMotherId } : {}),
      ...(resolvedStaffId ? { staffId: resolvedStaffId } : {}),
    });
    return res.json({
      success: true,
      token,
      role: cleanRole,
      motherId: resolvedMotherId || null,
      staffId: resolvedStaffId || null,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Unable to verify Firebase session.',
    });
  }
});

// API: Verify and Sliding-Refresh Active Server Session Token
app.post('/api/auth/verify-session', (req, res) => {
  const token = extractBearerToken(req);
  const session = verifySessionToken(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      error: 'Session expired or invalid.',
    });
  }
  const refreshedToken = signSessionToken({
    uid: session.uid,
    role: session.role,
    ...(session.motherId ? { motherId: session.motherId } : {}),
    ...(session.staffId ? { staffId: session.staffId } : {}),
  });
  return res.json({
    success: true,
    token: refreshedToken,
    uid: session.uid,
    role: session.role,
    motherId: session.motherId || null,
    staffId: session.staffId || null,
  });
});

function getVoiceExtension(mimeType: string): 'webm' | 'm4a' | 'mp4' | 'ogg' | 'wav' {
  const lower = (mimeType || '').toLowerCase();
  if (lower.includes('mp4') || lower.includes('m4a') || lower.includes('aac')) return 'm4a';
  if (lower.includes('ogg')) return 'ogg';
  if (lower.includes('wav')) return 'wav';
  return 'webm';
}

function parseConversationParticipants(conversationId: string): { motherId: string; workerId: string } | null {
  const match = /^conv_(MCP-[A-Za-z0-9-]+|[^_]+)_(HW-[A-Za-z0-9-]+|[^_]+)$/.exec(conversationId);
  if (!match) return null;
  return { motherId: match[1], workerId: match[2] };
}

function safeResolveVoicePath(conversationId: string, fileName: string): string | null {
  const baseDir = path.resolve(VOICE_STORE_DIR);
  const resolved = path.resolve(VOICE_STORE_DIR, conversationId, fileName);
  if (!resolved.startsWith(baseDir + path.sep)) {
    return null;
  }
  return resolved;
}

// API: Authenticated Direct Voice Message Audio Upload (Original audio only, never transcribed)
app.post('/api/voice-messages/upload', requireChatParticipantAuth, async (req: AuthenticatedUserRequest, res) => {
  try {
    const session = req.userSession!;
    const {
      audioBase64,
      mimeType,
      conversationId,
      messageId,
      motherId,
      workerId,
      senderId,
      senderRole,
    } = req.body || {};

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ success: false, error: 'Audio data is required.' });
    }
    const cleanConv = String(conversationId || '').trim();
    const cleanMsgId = String(messageId || '').trim();
    const cleanMotherId = String(motherId || '').trim();
    const cleanWorkerId = String(workerId || '').trim();
    const cleanSenderId = String(senderId || '').trim();
    const cleanSenderRole = senderRole === 'worker' ? 'worker' : senderRole === 'mother' ? 'mother' : '';

    if (!/^conv_[A-Za-z0-9_-]+_[A-Za-z0-9_-]+$/.test(cleanConv)) {
      return res.status(400).json({ success: false, error: 'Invalid conversation identifier.' });
    }
    if (!/^MSG-[A-Za-z0-9_-]+$/.test(cleanMsgId)) {
      return res.status(400).json({ success: false, error: 'Invalid message identifier.' });
    }
    if (!cleanSenderRole || !cleanMotherId || !cleanWorkerId) {
      return res.status(400).json({ success: false, error: 'Missing participant metadata.' });
    }

    const expectedConv = `conv_${cleanMotherId}_${cleanWorkerId}`;
    const parsedConv = parseConversationParticipants(cleanConv);
    if (
      cleanConv !== expectedConv ||
      !parsedConv ||
      parsedConv.motherId !== cleanMotherId ||
      parsedConv.workerId !== cleanWorkerId
    ) {
      return res.status(400).json({
        success: false,
        error: `Conversation ID mismatch: expected "${expectedConv}".`,
      });
    }

    // Strict caller identity verification
    if (session.role === 'mother') {
      if (cleanSenderRole !== 'mother' || cleanMotherId !== session.motherId || cleanSenderId !== session.motherId) {
        return res.status(403).json({ success: false, error: 'Unauthorized mother voice upload.' });
      }
    } else if (session.role === 'worker') {
      if (cleanSenderRole !== 'worker' || cleanWorkerId !== session.staffId || cleanSenderId !== session.staffId) {
        return res.status(403).json({ success: false, error: 'Unauthorized health worker voice upload.' });
      }
    } else {
      return res.status(403).json({ success: false, error: 'Only Mother or Health Worker accounts can send voice messages.' });
    }

    // Strict patient-assignment isolation verification
    const assignment = await resolveVerifiedMotherAssignment(cleanMotherId);
    if (assignment && assignment.workerId !== cleanWorkerId) {
      return res.status(403).json({
        success: false,
        error: `Unauthorized: Mother ${cleanMotherId} is not assigned to Health Worker ${cleanWorkerId}.`,
      });
    }

    const rawMime = String(mimeType || 'audio/webm').trim();
    const cleanContentType = rawMime.split(';')[0].trim() || 'audio/webm';
    if (!cleanContentType.startsWith('audio/')) {
      return res.status(400).json({ success: false, error: `Unsupported audio MIME type "${cleanContentType}".` });
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    if (audioBuffer.length <= 0) {
      return res.status(400).json({ success: false, error: 'Recorded audio is empty.' });
    }
    if (audioBuffer.length > 10 * 1024 * 1024) {
      return res.status(413).json({ success: false, error: 'Voice message exceeds the 10 MB size limit.' });
    }

    const ext = getVoiceExtension(rawMime);
    const fileName = `${cleanMsgId}.${ext}`;
    const filePath = safeResolveVoicePath(cleanConv, fileName);
    const metaPath = safeResolveVoicePath(cleanConv, `${fileName}.meta.json`);
    if (!filePath || !metaPath) {
      return res.status(400).json({ success: false, error: 'Invalid voice storage path.' });
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    fs.writeFileSync(filePath, audioBuffer);
    fs.writeFileSync(
      metaPath,
      JSON.stringify({
        conversationId: cleanConv,
        messageId: cleanMsgId,
        motherId: cleanMotherId,
        workerId: cleanWorkerId,
        senderId: cleanSenderId,
        senderRole: cleanSenderRole,
        uploaderAuthUid: session.uid,
        mimeType: cleanContentType,
        size: audioBuffer.length,
        createdAt: new Date().toISOString(),
      })
    );

    const audioStoragePath = `voiceMessages/${cleanConv}/${fileName}`;
    const audioDownloadUrl = `/api/voice-messages/audio/${encodeURIComponent(cleanConv)}/${encodeURIComponent(fileName)}`;

    return res.json({
      success: true,
      audioStoragePath,
      audioDownloadUrl,
      audioFileSize: audioBuffer.length,
      audioMimeType: rawMime,
      uploaderAuthUid: session.uid,
    });
  } catch (err: any) {
    console.error('Direct voice upload error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to store voice message audio.',
    });
  }
});

// API: Authenticated Direct Voice Message Audio Retrieval (with HTTP Range support)
app.get('/api/voice-messages/audio/:conversationId/:fileName', requireChatParticipantAuth, async (req: AuthenticatedUserRequest, res) => {
  const session = req.userSession!;
  const cleanConv = String(req.params.conversationId || '').trim();
  const cleanFile = String(req.params.fileName || '').trim();

  if (
    !/^conv_[A-Za-z0-9_-]+_[A-Za-z0-9_-]+$/.test(cleanConv) ||
    !/^MSG-[A-Za-z0-9_-]+\.(webm|m4a|mp4|ogg|wav)$/.test(cleanFile)
  ) {
    return res.status(400).json({ success: false, error: 'Invalid voice message path.' });
  }

  const filePath = safeResolveVoicePath(cleanConv, cleanFile);
  const metaPath = safeResolveVoicePath(cleanConv, `${cleanFile}.meta.json`);
  if (!filePath || !metaPath) {
    return res.status(400).json({ success: false, error: 'Invalid voice message path.' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'Voice message audio not found.' });
  }

  let motherId = '';
  let workerId = '';
  let mimeType = 'audio/webm';
  try {
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      motherId = String(meta.motherId || '');
      workerId = String(meta.workerId || '');
      mimeType = String(meta.mimeType || 'audio/webm');
    } else {
      const parsed = parseConversationParticipants(cleanConv);
      if (parsed) {
        motherId = parsed.motherId;
        workerId = parsed.workerId;
      }
    }
  } catch {
    // ignore malformed meta
  }

  const assignment = motherId ? await resolveVerifiedMotherAssignment(motherId) : null;
  const assignmentMatches = !assignment || assignment.workerId === workerId;

  const isAuthorized =
    session.role === 'supervisor' ||
    (session.role === 'mother' && Boolean(session.motherId) && session.motherId === motherId && assignmentMatches) ||
    (session.role === 'worker' && Boolean(session.staffId) && session.staffId === workerId && assignmentMatches);

  if (!isAuthorized) {
    return res.status(403).json({ success: false, error: 'Unauthorized access to voice message audio.' });
  }

  const stat = fs.statSync(filePath);
  const totalSize = stat.size;
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'private, max-age=3600');

  const rangeHeader = req.headers.range;
  if (typeof rangeHeader === 'string' && rangeHeader.startsWith('bytes=')) {
    const [startStr, endStr] = rangeHeader.replace(/^bytes=/, '').split('-');
    const start = startStr ? parseInt(startStr, 10) : 0;
    const end = endStr ? parseInt(endStr, 10) : totalSize - 1;
    if (
      Number.isNaN(start) ||
      Number.isNaN(end) ||
      start < 0 ||
      end >= totalSize ||
      start > end
    ) {
      res.setHeader('Content-Range', `bytes */${totalSize}`);
      return res.status(416).end();
    }
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
    res.setHeader('Content-Length', end - start + 1);
    return fs.createReadStream(filePath, { start, end }).pipe(res);
  }

  res.setHeader('Content-Length', totalSize);
  return fs.createReadStream(filePath).pipe(res);
});

// API: Authenticated Direct Voice Message Cleanup (if Firestore write fails)
app.delete('/api/voice-messages/audio/:conversationId/:fileName', requireChatParticipantAuth, (req: AuthenticatedUserRequest, res) => {
  const session = req.userSession!;
  const cleanConv = String(req.params.conversationId || '').trim();
  const cleanFile = String(req.params.fileName || '').trim();

  if (
    !/^conv_[A-Za-z0-9_-]+_[A-Za-z0-9_-]+$/.test(cleanConv) ||
    !/^MSG-[A-Za-z0-9_-]+\.(webm|m4a|mp4|ogg|wav)$/.test(cleanFile)
  ) {
    return res.status(400).json({ success: false, error: 'Invalid voice message path.' });
  }

  const filePath = safeResolveVoicePath(cleanConv, cleanFile);
  const metaPath = safeResolveVoicePath(cleanConv, `${cleanFile}.meta.json`);
  if (!filePath || !metaPath) {
    return res.status(400).json({ success: false, error: 'Invalid voice message path.' });
  }
  try {
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      if (meta.uploaderAuthUid && meta.uploaderAuthUid !== session.uid) {
        return res.status(403).json({ success: false, error: 'Forbidden.' });
      }
      fs.unlinkSync(metaPath);
    }
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // ignore
  }
  return res.json({ success: true });
});

// ============================================================================
// TRUSTED EMERGENCY ALERT VALIDATION & SERVER PROVENANCE
// ============================================================================

const AUTHORIZED_HOSPITALS_REGISTRY: Record<
  string,
  { id: string; name: string; facilityType: 'PHC' | 'CHC' | 'District Hospital' }
> = {
  'HOSP-RAMPUR-PHC': {
    id: 'HOSP-RAMPUR-PHC',
    name: 'Rampur Primary Health Centre (PHC)',
    facilityType: 'PHC',
  },
  'HOSP-PIPILI-CHC': {
    id: 'HOSP-PIPILI-CHC',
    name: 'Pipili Community Health Centre (CHC)',
    facilityType: 'CHC',
  },
  'HOSP-KHORDHA-DH': {
    id: 'HOSP-KHORDHA-DH',
    name: 'District Hospital Khordha',
    facilityType: 'District Hospital',
  },
  'OD-KH-DH-001': {
    id: 'HOSP-KHORDHA-DH',
    name: 'District Hospital Khordha',
    facilityType: 'District Hospital',
  },
};

const KNOWN_MATERNAL_ASSIGNMENTS: Record<
  string,
  { workerId: string; workerName: string; supervisorId: string }
> = {
  'MCP-2026-0894': { workerId: 'HW-44120', workerName: 'Sunita Devi', supervisorId: 'SUP-2025-012' },
  'MCP-2026-0412': { workerId: 'HW-44120', workerName: 'Sunita Devi', supervisorId: 'SUP-2025-012' },
  'MCP-2026-0689': { workerId: 'HW-44120', workerName: 'Sunita Devi', supervisorId: 'SUP-2025-012' },
  'MCP-2026-0914': { workerId: 'HW-44120', workerName: 'Sunita Devi', supervisorId: 'SUP-2025-012' },
  'MCP-2026-0551': { workerId: 'HW-44120', workerName: 'Sunita Devi', supervisorId: 'SUP-2025-012' },
  'MCP-2026-0723': { workerId: 'HW-44120', workerName: 'Sunita Devi', supervisorId: 'SUP-2025-012' },
  'MCP-2026-9042': { workerId: 'HW-44120', workerName: 'Sunita Devi', supervisorId: 'SUP-2025-012' },
  'MCP-2026-1275': { workerId: 'HW-44120', workerName: 'Sunita Devi', supervisorId: 'SUP-2025-012' },
  'MCP-2026-5000': { workerId: 'HW-002', workerName: 'Kabita Soren', supervisorId: 'SUP-2025-012' },
};

const SUPERVISOR_JURISDICTION: Record<string, string[]> = {
  'SUP-2025-012': ['HW-44120', 'HW-002', 'HW-003', 'HW-004', 'HW-005', 'HW-006'],
};

const VALID_CONCERN_CATEGORIES = new Set([
  'bleeding',
  'severe_headache_vision',
  'high_bp',
  'reduced_fetal_movement',
  'severe_abdominal_pain',
  'high_fever',
  'swelling',
  'breathing_difficulty',
  'labor_contractions',
  'other',
]);

app.post('/api/emergency-alerts/authorize', requireChatParticipantAuth, async (req: AuthenticatedUserRequest, res) => {
  const session = req.userSession!;
  const body = req.body || {};

  const requestedAlertId = typeof body.alertId === 'string' ? body.alertId.trim() : '';
  const motherId = typeof body.motherId === 'string' ? body.motherId.trim() : '';
  const requestedWorkerId = typeof body.assignedWorkerId === 'string' ? body.assignedWorkerId.trim() : '';
  const targetHospitalId = typeof body.targetHospitalId === 'string' ? body.targetHospitalId.trim() : '';
  const concernCategory = typeof body.concernCategory === 'string' ? body.concernCategory.trim() : '';
  const urgency = typeof body.urgency === 'string' ? body.urgency.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const requestedStatus = body.status === 'new' ? 'new' : 'pending_acknowledgement';

  if (!motherId || !/^[A-Za-z0-9_-]{3,128}$/.test(motherId)) {
    return res.status(400).json({ success: false, code: 'INVALID_MOTHER_ID', error: 'Valid Mother ID is required.' });
  }

  const verifiedHospital = AUTHORIZED_HOSPITALS_REGISTRY[targetHospitalId];
  if (!verifiedHospital) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_HOSPITAL',
      error: 'Selected hospital facility is not an authorized JanmaSaathi emergency facility.',
    });
  }

  if (!VALID_CONCERN_CATEGORIES.has(concernCategory)) {
    return res.status(400).json({ success: false, code: 'INVALID_CATEGORY', error: 'Invalid emergency concern category.' });
  }

  if (urgency !== 'moderate' && urgency !== 'urgent' && urgency !== 'critical') {
    return res.status(400).json({ success: false, code: 'INVALID_URGENCY', error: 'Invalid protocol urgency level.' });
  }

  if (!description || description.length > 3000) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_DESCRIPTION',
      error: 'Symptom or clinical reason description is required (max 3000 characters).',
    });
  }

  const knownAssignment = KNOWN_MATERNAL_ASSIGNMENTS[motherId];
  let verifiedAssignedWorkerId = knownAssignment?.workerId || requestedWorkerId || 'HW-44120';
  let verifiedAssignedWorkerName = knownAssignment?.workerName || (typeof body.assignedWorkerName === 'string' ? body.assignedWorkerName.trim() : '') || 'Sunita Devi';
  let verifiedSupervisorId = knownAssignment?.supervisorId || 'SUP-2025-012';
  let verifiedRaisedById = '';

  if (session.role === 'mother') {
    if (!session.motherId || session.motherId !== motherId) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_MOTHER_SCOPE',
        error: 'Mothers can only raise emergency alerts for their own authenticated maternal profile.',
      });
    }
    verifiedRaisedById = session.motherId;
  } else if (session.role === 'worker') {
    if (!session.staffId) {
      return res.status(403).json({ success: false, code: 'FORBIDDEN_WORKER_SCOPE', error: 'Verified Health Worker ID required.' });
    }
    if (knownAssignment && knownAssignment.workerId !== session.staffId) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_UNASSIGNED_MOTHER',
        error: `Health Worker ${session.staffId} is not assigned to mother ${motherId}.`,
      });
    }
    if (!knownAssignment && requestedWorkerId && requestedWorkerId !== session.staffId) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_WORKER_MISMATCH',
        error: 'Cannot submit an alert claiming another Health Worker assignment.',
      });
    }
    verifiedAssignedWorkerId = session.staffId;
    if (knownAssignment) {
      verifiedAssignedWorkerName = knownAssignment.workerName;
    }
    verifiedRaisedById = session.staffId;
  } else if (session.role === 'supervisor') {
    if (!session.staffId || !SUPERVISOR_JURISDICTION[session.staffId]) {
      return res.status(403).json({ success: false, code: 'FORBIDDEN_SUPERVISOR_SCOPE', error: 'Verified Supervisor jurisdiction required.' });
    }
    const allowedWorkers = SUPERVISOR_JURISDICTION[session.staffId];
    if (!allowedWorkers.includes(verifiedAssignedWorkerId)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_OUTSIDE_JURISDICTION',
        error: `Mother ${motherId} is outside supervisor ${session.staffId} jurisdiction.`,
      });
    }
    verifiedSupervisorId = session.staffId;
    verifiedRaisedById = session.staffId;
  }

  const serverTimestampMs = Date.now();
  const serverTimestampIso = new Date(serverTimestampMs).toISOString();
  const alertId =
    requestedAlertId && /^ALT-[A-Za-z0-9_-]{4,80}$/.test(requestedAlertId)
      ? requestedAlertId
      : `ALT-${serverTimestampMs}-${Math.floor(100 + Math.random() * 900)}`;

  const provenanceSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${alertId}|${session.uid}|${session.role}|${verifiedRaisedById}|${motherId}|${verifiedHospital.id}|${serverTimestampMs}`)
    .digest('hex')
    .slice(0, 24);
  const serverProvenanceId = `PROV-${provenanceSig}`;

  return res.json({
    success: true,
    alertId,
    serverTimestampMs,
    serverTimestampIso,
    serverProvenanceId,
    verifiedRaisedByRole: session.role,
    verifiedRaisedById,
    verifiedAssignedWorkerId,
    verifiedAssignedWorkerName,
    verifiedSupervisorId,
    verifiedHospital,
    verifiedStatus: requestedStatus,
    sanitizedNotification: {
      alertId,
      targetHospitalId: verifiedHospital.id,
      targetHospitalName: verifiedHospital.name,
      targetFacilityType: verifiedHospital.facilityType,
      concernCategory,
      urgency,
      status: requestedStatus,
      createdAtIso: serverTimestampIso,
    },
  });
});

app.post('/api/emergency-alerts/authorize-escalation', requireChatParticipantAuth, async (req: AuthenticatedUserRequest, res) => {
  const session = req.userSession!;
  if (session.role !== 'supervisor' || !session.staffId || !SUPERVISOR_JURISDICTION[session.staffId]) {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN_ESCALATION_ROLE',
      error: 'Only authenticated Block Medical Officers / Supervisors can perform protocol alert escalation.',
    });
  }

  const body = req.body || {};
  const alertId = typeof body.alertId === 'string' ? body.alertId.trim() : '';
  const escalationReason = typeof body.escalationReason === 'string' ? body.escalationReason.trim() : '';
  const targetHospitalId = typeof body.escalationTargetHospitalId === 'string' ? body.escalationTargetHospitalId.trim() : '';
  const assignedWorkerId = typeof body.assignedWorkerId === 'string' ? body.assignedWorkerId.trim() : '';

  if (!alertId || !/^[A-Za-z0-9_-]{3,128}$/.test(alertId)) {
    return res.status(400).json({ success: false, code: 'INVALID_ALERT_ID', error: 'Valid alert ID is required.' });
  }
  if (!escalationReason || escalationReason.length > 1000) {
    return res.status(400).json({ success: false, code: 'INVALID_REASON', error: 'Escalation reason is required.' });
  }

  const verifiedHospital = AUTHORIZED_HOSPITALS_REGISTRY[targetHospitalId];
  if (!verifiedHospital) {
    return res.status(400).json({ success: false, code: 'INVALID_HOSPITAL', error: 'Invalid escalation target hospital.' });
  }

  if (assignedWorkerId && !SUPERVISOR_JURISDICTION[session.staffId].includes(assignedWorkerId)) {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN_OUTSIDE_JURISDICTION',
      error: 'Cannot escalate alerts outside your supervisory block jurisdiction.',
    });
  }

  const serverTimestampMs = Date.now();
  const serverTimestampIso = new Date(serverTimestampMs).toISOString();

  return res.json({
    success: true,
    alertId,
    serverTimestampMs,
    serverTimestampIso,
    verifiedSupervisorId: session.staffId,
    targetHospital: verifiedHospital,
    sanitizedNotification: {
      alertId,
      targetHospitalId: verifiedHospital.id,
      targetHospitalName: verifiedHospital.name,
      targetFacilityType: verifiedHospital.facilityType,
      status: 'escalated',
      escalatedAtIso: serverTimestampIso,
    },
  });
});

app.post('/api/emergency-alerts/update-status', requireChatParticipantAuth, async (req: AuthenticatedUserRequest, res) => {
  const session = req.userSession!;
  const body = req.body || {};
  const alertId = typeof body.alertId === 'string' ? body.alertId.trim() : '';
  const status = typeof body.status === 'string' ? body.status.trim() : '';
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  const actorName = typeof body.actorName === 'string' && body.actorName.trim() ? body.actorName.trim() : session.staffId || session.motherId || 'User';
  const actorRole = typeof body.actorRole === 'string' && body.actorRole.trim() ? body.actorRole.trim() : session.role;

  if (!alertId || !/^[A-Za-z0-9_-]{3,128}$/.test(alertId)) {
    return res.status(400).json({ success: false, error: 'Valid alertId is required.' });
  }

  const serverTimestampMs = Date.now();
  const serverTimestampIso = new Date(serverTimestampMs).toISOString();
  const entry = {
    id: `UPD-${serverTimestampMs}-${Math.random().toString(36).slice(2, 6)}`,
    timestampIso: serverTimestampIso,
    timestampLabel: new Date(serverTimestampMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    actorName,
    actorRole,
    status: status || 'in_progress',
    note: note || 'Field update recorded.',
  };

  return res.json({ success: true, serverTimestampMs });
});

// ============================================================================
// REAL-TIME EMERGENCY NOTIFICATION ROUTING & FCM TOKEN MANAGEMENT
// ============================================================================

app.get('/api/notifications/config-status', (_req, res) => {
  const vapidConfigured = Boolean(process.env.VITE_FIREBASE_VAPID_KEY?.trim());
  res.json({
    success: true,
    projectId: config.projectId,
    messagingSenderId: config.messagingSenderId,
    vapidKeyConfigured: vapidConfigured,
  });
});

app.post('/api/notifications/register-token', requireChatParticipantAuth, (req: AuthenticatedUserRequest, res) => {
  const session = req.userSession!;
  const body = req.body || {};
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const requestedTokenId = typeof body.tokenId === 'string' ? body.tokenId.trim() : '';
  const browser = typeof body.browser === 'string' ? body.browser.trim().slice(0, 64) : 'Web';

  if (!token || token.length < 20 || token.length > 4096) {
    return res.status(400).json({ success: false, error: 'Valid FCM device token is required.' });
  }

  const tokenId =
    requestedTokenId && /^[A-Za-z0-9_-]{8,128}$/.test(requestedTokenId)
      ? requestedTokenId
      : `TOK-${crypto.createHash('sha256').update(token).digest('hex').slice(0, 32)}`;

  const rawHospitalId = typeof body.hospitalId === 'string' ? body.hospitalId.trim() : '';
  const validHospitalId = rawHospitalId && AUTHORIZED_HOSPITALS_REGISTRY[rawHospitalId] ? rawHospitalId : null;

  const entry = upsertRegisteredToken({
    tokenId,
    token,
    uid: session.uid,
    role: session.role,
    motherId: session.motherId || null,
    staffId: session.staffId || null,
    hospitalId: validHospitalId,
    browser,
    enabled: true,
    updatedAtMs: Date.now(),
  });

  return res.json({
    success: true,
    tokenId: entry.tokenId,
    role: entry.role,
  });
});

app.post('/api/notifications/unregister-token', requireChatParticipantAuth, (req: AuthenticatedUserRequest, res) => {
  const session = req.userSession!;
  const body = req.body || {};
  const tokenId = typeof body.tokenId === 'string' ? body.tokenId.trim() : undefined;
  const token = typeof body.token === 'string' ? body.token.trim() : undefined;
  const removed = removeRegisteredToken({ uid: session.uid, tokenId, token });
  return res.json({ success: true, removed });
});

app.post(
  '/api/emergency-alerts/dispatch-notification',
  requireChatParticipantAuth,
  async (req: AuthenticatedUserRequest, res) => {
    const session = req.userSession!;
    const body = req.body || {};

    const alertId = typeof body.alertId === 'string' ? body.alertId.trim() : '';
    const motherId = typeof body.motherId === 'string' ? body.motherId.trim() : '';
    const targetHospitalId = typeof body.targetHospitalId === 'string' ? body.targetHospitalId.trim() : '';
    const escalationTargetHospitalId =
      typeof body.escalationTargetHospitalId === 'string'
        ? body.escalationTargetHospitalId.trim()
        : null;
    const rawEventType = typeof body.eventType === 'string' ? body.eventType.trim() : 'alert_created';
    const eventType: DispatchEventType =
      rawEventType === 'escalated' || rawEventType === 'resolved' || rawEventType === 'status_updated'
        ? rawEventType
        : 'alert_created';

    if (!alertId || !/^[A-Za-z0-9_-]{3,128}$/.test(alertId)) {
      return res.status(400).json({ success: false, error: 'Valid alertId is required.' });
    }
    if (!motherId || !/^[A-Za-z0-9_-]{3,128}$/.test(motherId)) {
      return res.status(400).json({ success: false, error: 'Valid motherId is required.' });
    }
    if (!AUTHORIZED_HOSPITALS_REGISTRY[targetHospitalId]) {
      return res.status(400).json({ success: false, error: 'Authorized targetHospitalId is required.' });
    }

    const knownAssignment = KNOWN_MATERNAL_ASSIGNMENTS[motherId];
    const assignedWorkerId =
      knownAssignment?.workerId ||
      (typeof body.assignedWorkerId === 'string' ? body.assignedWorkerId.trim() : 'HW-44120');
    const supervisorId =
      knownAssignment?.supervisorId ||
      (typeof body.supervisorId === 'string' && body.supervisorId.trim()
        ? body.supervisorId.trim()
        : undefined);

    // Strict caller authorization matching alert scope
    if (session.role === 'mother' && session.motherId !== motherId) {
      return res.status(403).json({ success: false, error: 'Unauthorized mother alert notification scope.' });
    }
    if (session.role === 'worker' && session.staffId !== assignedWorkerId) {
      return res.status(403).json({ success: false, error: 'Unauthorized worker alert notification scope.' });
    }
    if (
      session.role === 'supervisor' &&
      (!session.staffId || !SUPERVISOR_JURISDICTION[session.staffId]?.includes(assignedWorkerId))
    ) {
      return res.status(403).json({ success: false, error: 'Unauthorized supervisor jurisdiction scope.' });
    }

    const rawUrgency = typeof body.urgency === 'string' ? body.urgency.trim() : 'urgent';
    const urgency =
      rawUrgency === 'critical' || rawUrgency === 'moderate' ? rawUrgency : 'urgent';
    const status = typeof body.status === 'string' ? body.status.trim() : 'pending_acknowledgement';
    const rawRaisedByRole = typeof body.raisedByRole === 'string' ? body.raisedByRole.trim() : session.role;
    const raisedByRole =
      rawRaisedByRole === 'mother' || rawRaisedByRole === 'worker' || rawRaisedByRole === 'supervisor'
        ? rawRaisedByRole
        : session.role;
    const raisedById =
      typeof body.raisedById === 'string' && body.raisedById.trim()
        ? body.raisedById.trim()
        : session.motherId || session.staffId || session.uid;
    const eventTimestampMs =
      typeof body.eventTimestampMs === 'number' && Number.isFinite(body.eventTimestampMs)
        ? body.eventTimestampMs
        : Date.now();

    const result = await dispatchEmergencyAlertNotification({
      alertId,
      eventType,
      motherId,
      assignedWorkerId,
      supervisorId,
      raisedByRole,
      raisedById,
      actorRole: session.role,
      actorId: session.motherId || session.staffId || session.uid,
      targetHospitalId,
      escalationTargetHospitalId,
      urgency,
      status,
      eventTimestampMs,
    });

    return res.json(result);
  }
);

// API: Mother Account Linking Verification
app.post('/api/auth/link-mother-account', (req, res) => {
  const { mcpCardNumber, dateOfBirth, authUid } = req.body;
  if (!mcpCardNumber || !dateOfBirth) {
    return res.status(400).json({ success: false, error: 'Missing MCP Card Number or Date of Birth.' });
  }

  // Verify against verified registry
  if (mcpCardNumber === 'MCP-2026-0894' && dateOfBirth === '1998-08-14') {
    return res.json({
      success: true,
      message: 'Mother and Child Protection record successfully verified and linked.',
      motherId: 'MCP-2026-0894',
      name: 'Priya Sharma',
      authUid: authUid || 'verified',
    });
  }

  return res.status(404).json({
    success: false,
    error: 'No unlinked maternal record found matching the provided MCP Card Number and Date of Birth.',
  });
});

// API: Secure Content Translation Endpoint
app.post('/api/translate', async (req, res) => {
  const { text, targetLang } = req.body;
  if (!text || !targetLang) {
    return res.status(400).json({ success: false, error: 'Missing text or targetLang parameter.' });
  }

  const cleanText = String(text).trim();
  const cleanLang = String(targetLang).trim().toLowerCase();

  if (cleanLang === 'en') {
    return res.json({ success: true, translatedText: cleanText, sourceLanguage: 'en', targetLang: 'en' });
  }

  try {
    const { localizeDynamicText } = await import('../frontend/src/utils/dynamicLocalization.ts');
    const translated = localizeDynamicText(cleanText, cleanLang as 'hi' | 'or');
    return res.json({
      success: true,
      translatedText: translated,
      sourceLanguage: 'en',
      targetLang: cleanLang,
      cached: true,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Translation processing failed.',
      fallback: cleanText,
    });
  }
});

// API: ML Explainable Risk Screening Endpoint
app.post('/api/predict', async (req, res) => {
  try {
    const {
      age,
      systolicBP,
      diastolicBP,
      bloodSugar,
      bloodSugarUnit,
      bodyTemp,
      bodyTempUnit,
      heartRate,
      supplementaryObservations,
    } = req.body;

    const validationErrors: string[] = [];

    // 1. Strict Input Validation & Range Boundaries
    const numAge = Number(age);
    if (isNaN(numAge) || numAge < 10 || numAge > 70) {
      validationErrors.push('Maternal age must be a valid number between 10 and 70 years.');
    }

    const numSystolic = Number(systolicBP);
    if (isNaN(numSystolic) || numSystolic < 60 || numSystolic > 220) {
      validationErrors.push('Systolic blood pressure must be between 60 and 220 mmHg.');
    }

    const numDiastolic = Number(diastolicBP);
    if (isNaN(numDiastolic) || numDiastolic < 30 || numDiastolic > 140) {
      validationErrors.push('Diastolic blood pressure must be between 30 and 140 mmHg.');
    }

    if (!isNaN(numSystolic) && !isNaN(numDiastolic) && numDiastolic >= numSystolic) {
      validationErrors.push('Diastolic pressure cannot exceed or equal systolic pressure.');
    }

    const numBS = Number(bloodSugar);
    if (isNaN(numBS) || numBS <= 0) {
      validationErrors.push('Blood glucose measurement is required and must be greater than 0.');
    }

    const numTemp = Number(bodyTemp);
    if (isNaN(numTemp) || numTemp <= 0) {
      validationErrors.push('Body temperature measurement is required.');
    }

    let numHR = Number(heartRate);
    if (isNaN(numHR) || numHR < 30 || numHR > 200) {
      validationErrors.push('Heart rate must be a valid physiological measurement between 30 and 200 bpm. Implausible measurements trigger remeasurement.');
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Clinical input validation failed.',
        validationErrors,
      });
    }

    // 2. Unit Normalization Audit (Prevent double conversion)
    const cleanBSUnit = bloodSugarUnit === 'mg/dL' ? 'mg/dL' : 'mmol/L';
    let normalizedBS = numBS;
    if (cleanBSUnit === 'mg/dL') {
      normalizedBS = Number((numBS / 18.0).toFixed(2)); // Convert mg/dL to mmol/L
    }

    const cleanTempUnit = bodyTempUnit === '°C' ? '°C' : '°F';
    let normalizedTemp = numTemp;
    if (cleanTempUnit === '°C') {
      normalizedTemp = Number(((numTemp * 9) / 5 + 32).toFixed(1)); // Convert °C to °F
    }

    // 3. Load Versioned Model Artifact
    const modelPath = path.resolve(__dirname, '../frontend/src/ml/model_v1.0.0.json');
    if (!fs.existsSync(modelPath)) {
      return res.status(503).json({
        success: false,
        error: 'Machine learning prediction model is currently unavailable.',
        modelUnavailable: true,
      });
    }

    const modelArtifact = JSON.parse(fs.readFileSync(modelPath, 'utf-8'));
    const { predictWithExplanation } = await import('../frontend/src/ml/mlEngine.ts');

    const prediction = predictWithExplanation(
      modelArtifact.treeRoot,
      {
        age: numAge,
        systolicBP: numSystolic,
        diastolicBP: numDiastolic,
        bloodSugar: normalizedBS,
        bodyTemp: normalizedTemp,
        heartRate: numHR,
      },
      modelArtifact.modelVersion
    );

    return res.json({
      success: true,
      modelPrediction: {
        riskCategory: prediction.predictedCategory,
        terminalLeafSamples: prediction.terminalLeafSamples,
        leafClassDistribution: prediction.leafClassDistribution,
        distributionNote: prediction.distributionNote,
        decisionPath: prediction.decisionPath,
        contributingFeatures: prediction.contributingFeatures,
        featuresContributingToIncreasedRisk: prediction.featuresContributingToIncreasedRisk,
        featuresContributingToDecreasedRisk: prediction.featuresContributingToDecreasedRisk,
        evaluatedModelFeatures: prediction.evaluatedModelFeatures,
        summaryExplanation: prediction.summaryExplanation,
        modelVersion: modelArtifact.modelVersion,
        preprocessingVersion: modelArtifact.preprocessingVersion,
        explanationMethod: prediction.explanationMethod,
        limitationsNote: prediction.limitationsNote,
      },
      originalMeasurements: {
        age: { value: numAge, unit: 'years' },
        systolicBP: { value: numSystolic, unit: 'mmHg' },
        diastolicBP: { value: numDiastolic, unit: 'mmHg' },
        bloodSugar: { value: numBS, unit: cleanBSUnit },
        bodyTemp: { value: numTemp, unit: cleanTempUnit },
        heartRate: { value: numHR, unit: 'bpm' },
        hemoglobin: { value: supplementaryObservations?.haemoglobinGdl ?? null, unit: 'g/dL' },
      },
      normalizedModelInputs: {
        age: numAge,
        systolicBP: numSystolic,
        diastolicBP: numDiastolic,
        bloodSugarMmolL: normalizedBS,
        bodyTempFahrenheit: normalizedTemp,
        heartRateBpm: numHR,
      },
      supplementaryObservations: {
        haemoglobinGdl: supplementaryObservations?.haemoglobinGdl ?? null,
        bleeding: !!supplementaryObservations?.bleeding,
        swelling: supplementaryObservations?.swelling || 'None',
        reducedFetalMovement: !!supplementaryObservations?.reducedFetalMovement,
        clinicalNotes: supplementaryObservations?.clinicalNotes || '',
      },
      evaluatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Prediction inference error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to process ML risk screening prediction.',
      message: err.message,
    });
  }
});

// API: Mother AI Pregnancy Companion - Model Capabilities & Language Support Probe
app.get('/api/companion/capabilities', requireMotherAuth, async (req, res) => {
  try {
    const forceProbe = req.query.probe === '1' || req.query.probe === 'true';
    const capabilities = await companionAiService.getCapabilities(forceProbe);
    return res.json({
      success: true,
      ...capabilities,
    });
  } catch (err: any) {
    console.error('Companion capabilities probe error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Unable to inspect companion capabilities.',
    });
  }
});

function sanitizeCompanionApiError(
  err: any,
  fallbackMessage: string
): { status: number; code: string; message: string } {
  const raw = String(err?.message || err || '');
  const lower = raw.toLowerCase();
  if (lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('quota')) {
    return {
      status: 429,
      code: 'QUOTA_EXHAUSTED',
      message: 'Voice or AI daily rate limit was reached. Please wait a bit and try again.',
    };
  }
  if (
    lower.includes('503') ||
    lower.includes('timed out') ||
    lower.includes('unavailable') ||
    lower.includes('overloaded')
  ) {
    return {
      status: 503,
      code: 'SERVICE_BUSY',
      message: 'JanmaSaathi service is temporarily busy. Please try again in a moment.',
    };
  }
  if (raw.trim().startsWith('{')) {
    return {
      status: 500,
      code: 'AI_REQUEST_FAILED',
      message: fallbackMessage,
    };
  }
  return {
    status: 500,
    code: 'AI_REQUEST_FAILED',
    message: raw || fallbackMessage,
  };
}

// API: Mother AI Pregnancy Companion - Conversational Chat (with structured safety triage)
app.post('/api/companion/chat', requireMotherAuth, async (req: AuthenticatedMotherRequest, res) => {
  try {
    const { message, language, history, motherContext } = req.body || {};
    const cleanMessage = typeof message === 'string' ? message.trim() : '';
    const lang = normalizeLanguage(language);

    if (!cleanMessage) {
      return res.status(400).json({
        success: false,
        error: 'Message text is required.',
      });
    }

    const ctxCheck = enforceMotherContextOwnership(motherContext, req.motherSession!);
    if (!ctxCheck.ok) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_CONTEXT',
        error: ctxCheck.error,
      });
    }

    if (!companionAiService.getClient()) {
      return res.status(503).json({
        success: false,
        error: 'JanmaSaathi AI service is not configured yet (missing server GEMINI_API_KEY).',
      });
    }

    const result = await companionAiService.chat({
      message: cleanMessage,
      language: lang,
      history,
      motherContext: ctxCheck.scopedContext,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('Companion chat error:', err);
    const clean = sanitizeCompanionApiError(
      err,
      'Unable to reach JanmaSaathi assistant right now.'
    );
    return res.status(clean.status).json({
      success: false,
      code: clean.code,
      error: clean.message,
    });
  }
});

// API: Speech-to-Text Transcription (Mother AI Pregnancy Companion only)
async function handleSpeechTranscription(req: AuthenticatedMotherRequest, res: express.Response) {
  try {
    const { audioBase64, mimeType, language, preferredLanguage } = req.body || {};

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'MISSING_AUDIO',
        error: 'Audio recording data is required.',
      });
    }

    if (audioBase64.length > 10 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        code: 'AUDIO_TOO_LARGE',
        error: 'Voice recording is too long. Please keep clips under 60 seconds.',
      });
    }

    const rawLang = language === undefined || language === null ? 'auto' : String(language).trim().toLowerCase();
    const allowedLanguages = new Set(['auto', 'or', 'hi', 'en']);
    if (!allowedLanguages.has(rawLang)) {
      return res.status(400).json({
        success: false,
        code: 'UNSUPPORTED_LANGUAGE',
        error: 'Unsupported speech recognition language. Supported languages are Odia, Hindi, and English.',
      });
    }

    if (!companionAiService.getClient()) {
      return res.status(503).json({
        success: false,
        code: 'NOT_CONFIGURED',
        error: 'Voice transcription service is not configured yet (missing server GEMINI_API_KEY).',
      });
    }

    const result = await companionAiService.transcribeAudio({
      audioBase64,
      mimeType,
      language: rawLang as 'or' | 'hi' | 'en' | 'auto',
      preferredLanguage: normalizeLanguage(preferredLanguage),
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('Speech transcription error:', err);
    const clean = sanitizeCompanionApiError(err, 'Voice transcription failed.');
    return res.status(clean.status).json({
      success: false,
      code: clean.code === 'AI_REQUEST_FAILED' ? 'TRANSCRIPTION_FAILED' : clean.code,
      error: clean.message,
    });
  }
}

app.post('/api/companion/transcribe', requireMotherAuth, handleSpeechTranscription);

// API: Mother AI Pregnancy Companion - Natural Voice Playback (TTS)
app.post('/api/companion/tts', requireMotherAuth, async (req, res) => {
  try {
    const { text, language } = req.body || {};
    const cleanText = typeof text === 'string' ? text.trim() : '';
    const lang = normalizeLanguage(language);

    if (!cleanText) {
      return res.status(400).json({
        success: false,
        error: 'Text is required for speech synthesis.',
      });
    }

    if (!companionAiService.getClient()) {
      return res.status(503).json({
        success: false,
        error: 'Voice playback service is not configured yet (missing server GEMINI_API_KEY).',
      });
    }

    const result = await companionAiService.synthesizeSpeech({
      text: cleanText,
      language: lang,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('Companion TTS error:', err);
    const clean = sanitizeCompanionApiError(err, 'Voice playback is unavailable right now.');
    return res.status(clean.status).json({
      success: false,
      code: clean.code,
      error: clean.message,
    });
  }
});

// API: Mother AI Pregnancy Companion - Consented Timeline Summary Generator
app.post('/api/companion/summarize', requireMotherAuth, async (req: AuthenticatedMotherRequest, res) => {
  try {
    const { messages, language, motherContext } = req.body || {};
    const lang = normalizeLanguage(language);

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Conversation messages are required to generate a summary.',
      });
    }

    const ctxCheck = enforceMotherContextOwnership(motherContext, req.motherSession!);
    if (!ctxCheck.ok) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_CONTEXT',
        error: ctxCheck.error,
      });
    }

    if (!companionAiService.getClient()) {
      return res.status(503).json({
        success: false,
        error: 'Summarization service is not configured yet (missing server GEMINI_API_KEY).',
      });
    }

    const result = await companionAiService.summarizeConversation({
      messages,
      language: lang,
      motherContext: ctxCheck.scopedContext,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('Companion summarize error:', err);
    const clean = sanitizeCompanionApiError(err, 'Unable to generate conversation summary.');
    return res.status(clean.status).json({
      success: false,
      code: clean.code,
      error: clean.message,
    });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  const distPath = path.resolve(__dirname, '../dist');
  const hasDist = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'));
  const isDevLifecycle = process.env.npm_lifecycle_event === 'dev';
  const isProduction = process.env.NODE_ENV === 'production' && !isDevLifecycle;

  if (isProduction && hasDist) {
    console.log(`[JanmaSaathi Server] Serving production application bundle from: ${distPath}`);
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('sw.js')) {
            // Never cache the service worker file itself so updates are recognized immediately
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          } else if (filePath.endsWith('manifest.webmanifest')) {
            res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
          } else if (filePath.includes('/assets/')) {
            // Hashed Vite assets can be safely cached long-term
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || /\.[a-z0-9]+$/i.test(req.path)) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.log('[JanmaSaathi Server] Mounting Vite development middleware...');
    // Heal any browser that previously cached /sw.js or /dev-sw.js with stale Workbox caches
    const sendSelfHealingSw = (_req: express.Request, res: express.Response) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.send(
        `self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',(event)=>{event.waitUntil((async()=>{await self.clients.claim();const keys=await caches.keys();await Promise.all(keys.map((k)=>caches.delete(k)));await self.registration.unregister();const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const c of clients){c.navigate(c.url);}})());});`
      );
    };
    app.get('/sw.js', sendSelfHealingSw);
    app.get('/dev-sw.js', sendSelfHealingSw);

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, '../vite.config.ts'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const httpServer = http.createServer(app);
  companionAiService.attachLiveWebSocketServer(httpServer, (request: IncomingMessage) => {
    const urlObj = new URL(request.url || '/api/companion/live', 'http://localhost');
    const authHeader = request.headers.authorization;
    const headerToken =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : null;
    const queryToken = urlObj.searchParams.get('token');
    const session = verifySessionToken(headerToken || queryToken);
    if (!session) {
      return { ok: false, statusCode: 401, error: 'Authentication required.' };
    }
    if (session.role !== 'mother' || !session.motherId) {
      return { ok: false, statusCode: 403, error: 'Mother role required.' };
    }
    return { ok: true, motherId: session.motherId };
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`JanmaSaathi full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
