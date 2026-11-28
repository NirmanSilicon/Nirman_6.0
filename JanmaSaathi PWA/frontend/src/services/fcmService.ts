import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getMessaging, getToken, deleteToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { app, auth, db } from '../lib/firebase';
import { ensureSessionToken } from './companionService';
import { FcmDeviceTokenRecord, FcmTokenRole } from '../types';

const FCM_SW_URL = '/firebase-messaging-sw.js';
const FCM_SW_SCOPE = '/firebase-cloud-messaging-push-scope';
const TOKEN_CACHE_KEY = 'janmasaathi_fcm_token_cache_v1';

export type PushRegistrationStatus =
  | 'unsupported'
  | 'vapid_missing'
  | 'permission_default'
  | 'permission_denied'
  | 'ready'
  | 'error';

export interface PushStatusSnapshot {
  status: PushRegistrationStatus;
  permission: NotificationPermission | 'unsupported';
  vapidKeyConfigured: boolean;
  tokenRegistered: boolean;
  lastError?: string | null;
}

export interface RegisterPushParams {
  role: FcmTokenRole;
  uid: string;
  motherId?: string | null;
  staffId?: string | null;
  hospitalId?: string | null;
}

let cachedMessaging: Messaging | null = null;
let cachedRegistration: ServiceWorkerRegistration | null = null;

function getVapidKey(): string {
  const key = (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY;
  return typeof key === 'string' ? key.trim() : '';
}

export function isVapidKeyConfigured(): boolean {
  return getVapidKey().length > 0;
}

function detectBrowserName(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent || '';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Safari/')) return 'Safari';
  return 'Web';
}

async function computeTokenId(rawToken: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(rawToken);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `TOK-${hex.slice(0, 32)}`;
  }
  let acc = 0;
  for (let i = 0; i < rawToken.length; i++) {
    acc = (acc * 31 + rawToken.charCodeAt(i)) >>> 0;
  }
  return `TOK-${acc.toString(16)}-${rawToken.length}`;
}

function readCachedToken(): { tokenId: string; token: string } | null {
  try {
    const raw = localStorage.getItem(TOKEN_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.tokenId && parsed?.token) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function writeCachedToken(data: { tokenId: string; token: string } | null): void {
  try {
    if (!data) {
      localStorage.removeItem(TOKEN_CACHE_KEY);
    } else {
      localStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify(data));
    }
  } catch {
    // ignore
  }
}

export async function getPushStatusSnapshot(): Promise<PushStatusSnapshot> {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return {
      status: 'unsupported',
      permission: 'unsupported',
      vapidKeyConfigured: isVapidKeyConfigured(),
      tokenRegistered: false,
    };
  }

  const supported = await isSupported().catch(() => false);
  if (!supported) {
    return {
      status: 'unsupported',
      permission: Notification.permission,
      vapidKeyConfigured: isVapidKeyConfigured(),
      tokenRegistered: false,
    };
  }

  const vapidConfigured = isVapidKeyConfigured();
  const permission = Notification.permission;
  const cached = readCachedToken();

  if (permission === 'denied') {
    return {
      status: 'permission_denied',
      permission,
      vapidKeyConfigured: vapidConfigured,
      tokenRegistered: false,
    };
  }

  if (!vapidConfigured) {
    return {
      status: 'vapid_missing',
      permission,
      vapidKeyConfigured: false,
      tokenRegistered: false,
    };
  }

  if (permission !== 'granted') {
    return {
      status: 'permission_default',
      permission,
      vapidKeyConfigured: true,
      tokenRegistered: false,
    };
  }

  return {
    status: cached ? 'ready' : 'permission_default',
    permission,
    vapidKeyConfigured: true,
    tokenRegistered: Boolean(cached),
  };
}

async function getScopedPushRegistration(): Promise<ServiceWorkerRegistration> {
  if (cachedRegistration) return cachedRegistration;
  const reg = await navigator.serviceWorker.register(FCM_SW_URL, { scope: FCM_SW_SCOPE });
  cachedRegistration = reg;
  return reg;
}

async function getMessagingInstance(): Promise<Messaging | null> {
  if (cachedMessaging) return cachedMessaging;
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;
  cachedMessaging = getMessaging(app);
  return cachedMessaging;
}

/**
 * Registers device push notifications only after an explicit user interaction.
 */
export async function enableAndRegisterPushToken(
  params: RegisterPushParams
): Promise<PushStatusSnapshot> {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    !('serviceWorker' in navigator)
  ) {
    return {
      status: 'unsupported',
      permission: 'unsupported',
      vapidKeyConfigured: isVapidKeyConfigured(),
      tokenRegistered: false,
      lastError: 'This browser does not support Web Push notifications.',
    };
  }

  const vapidKey = getVapidKey();
  if (!vapidKey) {
    return {
      status: 'vapid_missing',
      permission: Notification.permission,
      vapidKeyConfigured: false,
      tokenRegistered: false,
      lastError:
        'VITE_FIREBASE_VAPID_KEY is not configured yet. Foreground alerts and sound chimes remain active.',
    };
  }

  try {
    const permission =
      Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();

    if (permission === 'denied') {
      return {
        status: 'permission_denied',
        permission,
        vapidKeyConfigured: true,
        tokenRegistered: false,
        lastError: 'Browser notification permission is blocked. Allow notifications in browser site settings.',
      };
    }

    if (permission !== 'granted') {
      return {
        status: 'permission_default',
        permission,
        vapidKeyConfigured: true,
        tokenRegistered: false,
      };
    }

    const messaging = await getMessagingInstance();
    if (!messaging) {
      return {
        status: 'unsupported',
        permission,
        vapidKeyConfigured: true,
        tokenRegistered: false,
        lastError: 'Firebase Cloud Messaging is not supported in this browser environment.',
      };
    }

    const serviceWorkerRegistration = await getScopedPushRegistration();
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration,
    });

    if (!token) {
      return {
        status: 'error',
        permission,
        vapidKeyConfigured: true,
        tokenRegistered: false,
        lastError: 'Unable to retrieve FCM registration token.',
      };
    }

    await persistDeviceToken(token, params);

    return {
      status: 'ready',
      permission,
      vapidKeyConfigured: true,
      tokenRegistered: true,
      lastError: null,
    };
  } catch (err: any) {
    return {
      status: 'error',
      permission: Notification.permission,
      vapidKeyConfigured: true,
      tokenRegistered: false,
      lastError: err?.message || 'Failed to enable Web Push notifications.',
    };
  }
}

/**
 * Refreshes an already-granted FCM token silently on login/session restore without prompting.
 */
export async function syncExistingPushTokenIfGranted(
  params: RegisterPushParams
): Promise<boolean> {
  try {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      Notification.permission !== 'granted' ||
      !isVapidKeyConfigured()
    ) {
      return false;
    }

    const messaging = await getMessagingInstance();
    if (!messaging) return false;

    const serviceWorkerRegistration = await getScopedPushRegistration();
    const token = await getToken(messaging, {
      vapidKey: getVapidKey(),
      serviceWorkerRegistration,
    });

    if (!token) return false;
    await persistDeviceToken(token, params);
    return true;
  } catch {
    return false;
  }
}

function normalizeFcmRole(role: FcmTokenRole): 'mother' | 'worker' | 'supervisor' | 'hospital_staff' {
  if (role === 'hospital' || role === 'hospital_staff' || role === 'facility') {
    return 'hospital_staff';
  }
  return role;
}

async function persistDeviceToken(
  token: string,
  params: RegisterPushParams
): Promise<void> {
  const tokenId = await computeTokenId(token);
  const nowMs = Date.now();
  const authUid = auth.currentUser?.uid || params.uid;
  const canonicalRole = normalizeFcmRole(params.role);

  const record: FcmDeviceTokenRecord = {
    id: tokenId,
    token,
    uid: authUid,
    role: canonicalRole,
    ...(params.motherId ? { motherId: params.motherId } : {}),
    ...(params.staffId ? { staffId: params.staffId } : {}),
    ...(params.hospitalId ? { hospitalId: params.hospitalId } : {}),
    platform: 'web',
    browser: detectBrowserName(),
    enabled: true,
    authMode: auth.currentUser ? 'firebase' : 'session',
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
    lastActiveAtMs: nowMs,
  };

  writeCachedToken({ tokenId, token });

  // 1a. Store in canonical user-scoped subcollection /users/{uid}/fcmTokens/{tokenId} when Firebase Auth is active
  if (auth.currentUser?.uid) {
    try {
      await setDoc(
        doc(db, 'users', auth.currentUser.uid, 'fcmTokens', tokenId),
        {
          ...record,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore user fcmTokens subcollection upsert notice:', err);
    }
  }

  // 1b. Maintain legacy top-level /fcmTokens/{tokenId} for PWA backward compatibility
  try {
    await setDoc(
      doc(db, 'fcmTokens', tokenId),
      {
        ...record,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore fcmTokens upsert notice:', err);
  }

  // 2. Register with trusted backend token registry for server-side dispatch
  try {
    const sessionToken = await ensureSessionToken();
    if (sessionToken) {
      await fetch('/api/notifications/register-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          tokenId,
          token,
          browser: record.browser,
          hospitalId: params.hospitalId || undefined,
        }),
      });
    }
  } catch {
    // non-fatal when offline
  }
}

/**
 * Unregisters the active device token on logout or when user disables push notifications.
 */
export async function unregisterDevicePushToken(options?: {
  revokeBrowserToken?: boolean;
}): Promise<void> {
  const cached = readCachedToken();
  writeCachedToken(null);

  if (cached?.tokenId) {
    try {
      const sessionToken = await ensureSessionToken();
      if (sessionToken) {
        await fetch('/api/notifications/unregister-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({ tokenId: cached.tokenId, token: cached.token }),
        });
      }
    } catch {
      // ignore
    }

    if (auth.currentUser?.uid) {
      try {
        await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'fcmTokens', cached.tokenId));
      } catch {
        // ignore
      }
    }

    try {
      await deleteDoc(doc(db, 'fcmTokens', cached.tokenId));
    } catch {
      // ignore
    }
  }

  if (options?.revokeBrowserToken) {
    try {
      const messaging = await getMessagingInstance();
      if (messaging) {
        await deleteToken(messaging);
      }
    } catch {
      // ignore
    }
  }
}

/**
 * Subscribe to foreground FCM Web Push messages (if push is active) for deduplicated handling.
 */
export async function subscribeForegroundFcmMessages(
  onPayload: (payload: { alertId?: string; eventType?: string; urgency?: string }) => void
): Promise<() => void> {
  try {
    if (!isVapidKeyConfigured()) return () => {};
    const messaging = await getMessagingInstance();
    if (!messaging) return () => {};
    return onMessage(messaging, (payload) => {
      const data = payload?.data || {};
      onPayload({
        alertId: typeof data.alertId === 'string' ? data.alertId : undefined,
        eventType: typeof data.eventType === 'string' ? data.eventType : undefined,
        urgency: typeof data.urgency === 'string' ? data.urgency : undefined,
      });
    });
  } catch {
    return () => {};
  }
}
