import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getMetadata, getStorage, ref } from 'firebase/storage';
import { JANMASAATHI_FIREBASE_CONFIG, JanmaSaathiFirebaseConfig } from './firebaseConfig';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  code?: string;
  operationType: OperationType;
  path: string | null;
  projectId: string;
  databaseId: string;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export type FirebaseRuntimeConfig = JanmaSaathiFirebaseConfig;

export const firebaseRuntimeConfig: Readonly<FirebaseRuntimeConfig> = JANMASAATHI_FIREBASE_CONFIG;

export const firebaseConfig: Readonly<FirebaseOptions> = Object.freeze({
  apiKey: JANMASAATHI_FIREBASE_CONFIG.apiKey,
  authDomain: JANMASAATHI_FIREBASE_CONFIG.authDomain,
  projectId: JANMASAATHI_FIREBASE_CONFIG.projectId,
  storageBucket: JANMASAATHI_FIREBASE_CONFIG.storageBucket,
  messagingSenderId: JANMASAATHI_FIREBASE_CONFIG.messagingSenderId,
  appId: JANMASAATHI_FIREBASE_CONFIG.appId,
});

export const isFirebaseConfigured = true;

// Single guarded Firebase Web SDK initialization using getApps() / getApp()
export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);

// CRITICAL: Explicitly bind to the exact existing named Firestore database.
// Never fall back to "(default)" and never provision a new database.
export const db: Firestore = getFirestore(app, JANMASAATHI_FIREBASE_CONFIG.databaseId);

// Bind to the existing project's Firebase Storage bucket.
export const storage: FirebaseStorage = getStorage(
  app,
  `gs://${JANMASAATHI_FIREBASE_CONFIG.storageBucket}`
);

export function extractFirestoreErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && typeof (error as { code?: unknown }).code === 'string') {
    return (error as { code: string }).code;
  }
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  if (lower.includes('permission-denied') || lower.includes('missing or insufficient permissions')) {
    return 'permission-denied';
  }
  if (lower.includes('unavailable') || lower.includes('offline')) {
    return 'unavailable';
  }
  if (lower.includes('not-found') || lower.includes('does not exist')) {
    return 'not-found';
  }
  if (lower.includes('failed-precondition') || lower.includes('index')) {
    return 'failed-precondition';
  }
  if (lower.includes('resource-exhausted') || lower.includes('quota')) {
    return 'resource-exhausted';
  }
  return 'unknown';
}

export function buildFirestoreErrorInfo(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const user = auth.currentUser;
  const sanitizedPath = path ? path.split('/')[0] : null;
  return {
    error: error instanceof Error ? error.message : String(error),
    code: extractFirestoreErrorCode(error),
    operationType,
    path: sanitizedPath,
    projectId: firebaseRuntimeConfig.projectId,
    databaseId: firebaseRuntimeConfig.databaseId,
    authInfo: {
      userId: user?.uid ? `${user.uid.slice(0, 6)}…` : null,
      email: null,
      emailVerified: user?.emailVerified ?? null,
      isAnonymous: user?.isAnonymous ?? null,
      tenantId: user?.tenantId ?? null,
      providerInfo: [],
    },
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo = buildFirestoreErrorInfo(error, operationType, path);
  if (import.meta.env.DEV) {
    console.error('Firestore Error:', errInfo.code, errInfo.operationType, errInfo.path);
  }
  throw new Error(JSON.stringify(errInfo));
}

export interface ConnectionCheckResult {
  status: 'connected' | 'offline' | 'not-found' | 'idle' | 'error';
  message: string;
  checkedAt: string;
}

export interface StorageCheckResult {
  status: 'connected' | 'not-initialized' | 'offline' | 'not-found' | 'idle' | 'error';
  bucket: string;
  message: string;
  checkedAt: string;
}

/**
 * Validates reachability to the exact named Firestore database.
 * A permission-denied response on the probe document confirms the named
 * database endpoint is online and actively enforcing Firestore security rules.
 */
export async function testFirestoreConnection(): Promise<ConnectionCheckResult> {
  const checkedAt = new Date().toISOString();

  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return {
      status: 'connected',
      message: `Connected to ${firebaseRuntimeConfig.projectId} / ${firebaseRuntimeConfig.databaseId}`,
      checkedAt,
    };
  } catch (error) {
    const code = extractFirestoreErrorCode(error);
    const rawMsg = error instanceof Error ? error.message : String(error);

    if (code === 'permission-denied') {
      return {
        status: 'connected',
        message: `Connected to ${firebaseRuntimeConfig.projectId} / ${firebaseRuntimeConfig.databaseId} (security rules active)`,
        checkedAt,
      };
    }

    if (
      rawMsg.toLowerCase().includes('the client is offline') ||
      code === 'unavailable'
    ) {
      if (import.meta.env.DEV) {
        console.error('Firestore connectivity check reported offline/unavailable.');
      }
      return {
        status: 'offline',
        message: `Unable to reach Firestore database "${firebaseRuntimeConfig.databaseId}". Check network connectivity.`,
        checkedAt,
      };
    }

    if (code === 'not-found' && rawMsg.toLowerCase().includes('database')) {
      return {
        status: 'not-found',
        message: `Named Firestore database "${firebaseRuntimeConfig.databaseId}" was not found in project "${firebaseRuntimeConfig.projectId}".`,
        checkedAt,
      };
    }

    return {
      status: 'error',
      message: rawMsg,
      checkedAt,
    };
  }
}

/**
 * Validates reachability to the existing Firebase Storage bucket.
 * If the Storage bucket has not been initialized in Firebase Console (404 / bucket-not-found),
 * reports 'not-initialized' cleanly without breaking clinical workflows or PWA /api/voice-messages.
 */
export async function testStorageConnection(): Promise<StorageCheckResult> {
  const checkedAt = new Date().toISOString();
  const bucket = firebaseRuntimeConfig.storageBucket;

  try {
    await getMetadata(ref(storage, '__janmasaathi_probe__'));
    return {
      status: 'connected',
      bucket,
      message: `Storage bucket ${bucket} reachable`,
      checkedAt,
    };
  } catch (error) {
    const code = extractFirestoreErrorCode(error);
    const rawMsg = error instanceof Error ? error.message : String(error);
    const lower = rawMsg.toLowerCase();

    if (code === 'storage/unauthorized' || code === 'storage/unauthenticated') {
      return {
        status: 'connected',
        bucket,
        message: `Storage bucket ${bucket} reachable (security rules active)`,
        checkedAt,
      };
    }

    if (code === 'storage/object-not-found') {
      return {
        status: 'connected',
        bucket,
        message: `Storage bucket ${bucket} reachable`,
        checkedAt,
      };
    }

    if (
      code === 'storage/bucket-not-found' ||
      code === 'storage/project-not-found' ||
      lower.includes('bucket does not exist') ||
      lower.includes('404')
    ) {
      return {
        status: 'not-initialized',
        bucket,
        message: `Firebase Storage bucket "${bucket}" is not initialized in project "${firebaseRuntimeConfig.projectId}". Voice messages use the PWA /api/voice-messages endpoint; initialize Storage in Firebase Console (Production mode) only if direct Storage uploads are required.`,
        checkedAt,
      };
    }

    if (code === 'storage/retry-limit-exceeded' || lower.includes('network')) {
      return {
        status: 'offline',
        bucket,
        message: `Unable to reach Storage bucket "${bucket}". Check network connectivity.`,
        checkedAt,
      };
    }

    return {
      status: 'error',
      bucket,
      message: rawMsg,
      checkedAt,
    };
  }
}
