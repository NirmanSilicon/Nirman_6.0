import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  Messaging,
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
} from 'firebase/messaging';
import { app, db, extractFirestoreErrorCode, firebaseRuntimeConfig } from '../lib/firebase';
import type { AlertPriority } from '../types/hospital';

export type BrowserNotificationPermission = NotificationPermission | 'unsupported';

export type FcmRegistrationStatus =
  | 'idle'
  | 'unsupported'
  | 'permission-denied'
  | 'vapid-missing'
  | 'demo-mode'
  | 'registered'
  | 'error';

export interface FcmRegistrationResult {
  status: FcmRegistrationStatus;
  permission: BrowserNotificationPermission;
  deviceId: string;
  tokenPreview: string | null;
  message: string;
}

export interface ForegroundFcmAlertPayload {
  alertId: string;
  priority: AlertPriority;
  facilityId?: string;
}

const DEVICE_ID_STORAGE_KEY = 'janmasaathi_hospital_web_device_id';
const ACTIVE_TOKEN_STORAGE_KEY = 'janmasaathi_hospital_web_fcm_token';
const FCM_SW_URL = '/firebase-messaging-sw.js';

let cachedMessaging: Messaging | null = null;
const shownSystemNotificationIds = new Set<string>();

export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export function isVapidKeyConfigured(): boolean {
  return Boolean(firebaseRuntimeConfig.vapidKey && firebaseRuntimeConfig.vapidKey.trim().length > 10);
}

export function getOrCreateHospitalDeviceId(): string {
  if (typeof window === 'undefined') return 'web-server';
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing && existing.trim()) return existing.trim();
    const randomPart =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const deviceId = `hosp-web-${randomPart}`;
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
    return deviceId;
  } catch {
    return `hosp-web-${Date.now().toString(36)}`;
  }
}

function summarizeUserAgent(): string {
  if (typeof navigator === 'undefined') return 'Unknown Browser';
  const ua = navigator.userAgent || '';
  if (ua.includes('Edg/')) return 'Microsoft Edge (Desktop Web)';
  if (ua.includes('Chrome/')) return 'Google Chrome (Desktop Web)';
  if (ua.includes('Firefox/')) return 'Mozilla Firefox (Desktop Web)';
  if (ua.includes('Safari/')) return 'Apple Safari (Web)';
  return 'Web Browser';
}

async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;
  if (!cachedMessaging) {
    cachedMessaging = getMessaging(app);
  }
  return cachedMessaging;
}

async function registerFcmServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const existing = await navigator.serviceWorker.getRegistration(FCM_SW_URL);
    if (existing) return existing;
    return await navigator.serviceWorker.register(FCM_SW_URL, { scope: '/' });
  } catch {
    return null;
  }
}

/**
 * Displays a strictly privacy-safe generic browser notification when the tab is hidden
 * and browser notification permission is granted. Never includes patient names,
 * symptoms, or medical history.
 */
export function showPrivacySafeSystemNotification(params: {
  alertId: string;
  priority: AlertPriority;
  onSelectAlert?: (alertId: string) => void;
}): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;
  if (shownSystemNotificationIds.has(params.alertId)) return false;

  try {
    shownSystemNotificationIds.add(params.alertId);
    const title =
      params.priority === 'Critical'
        ? 'Critical Maternal Alert — JanmaSaathi'
        : 'JanmaSaathi Emergency Alert';

    const notification = new Notification(title, {
      body: 'New maternal health alert requires attention.',
      icon: '/assets/aistudio/JanmaSaathi_593643c1.png',
      tag: `janmasaathi-alert-${params.alertId}`,
      requireInteraction: params.priority === 'Critical',
      data: {
        alertId: params.alertId,
        url: `/?alertId=${encodeURIComponent(params.alertId)}`,
      },
    });

    notification.onclick = () => {
      window.focus();
      params.onSelectAlert?.(params.alertId);
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}

/**
 * Requests browser notification permission on explicit user action, registers the
 * minimal FCM-only service worker, obtains the FCM Web Push token, and saves the
 * device registration under users/{uid}/fcmTokens/{deviceId} for multi-device support.
 */
export async function enableFcmNotifications(params: {
  appMode: 'demo' | 'firebase';
  uid: string;
  role: string;
  facilityId: string;
  allowedFacilityIds: string[];
}): Promise<FcmRegistrationResult> {
  const deviceId = getOrCreateHospitalDeviceId();
  const currentPermission = getBrowserNotificationPermission();

  if (currentPermission === 'unsupported') {
    return {
      status: 'unsupported',
      permission: 'unsupported',
      deviceId,
      tokenPreview: null,
      message: 'This browser does not support Web Push or system notifications.',
    };
  }

  let permission: BrowserNotificationPermission = currentPermission;
  if (permission === 'default') {
    try {
      permission = await Notification.requestPermission();
    } catch {
      permission = 'denied';
    }
  }

  if (permission !== 'granted') {
    return {
      status: 'permission-denied',
      permission,
      deviceId,
      tokenPreview: null,
      message:
        'Browser notification permission was denied. Enable notifications in browser site settings to receive background alerts.',
    };
  }

  if (params.appMode === 'demo') {
    return {
      status: 'demo-mode',
      permission,
      deviceId,
      tokenPreview: null,
      message:
        'Browser notification permission granted. Foreground and hidden-tab alerts are active in Demo Mode; FCM device token registration applies when signed in to the live hospital account.',
    };
  }

  if (!isVapidKeyConfigured()) {
    await registerFcmServiceWorker();
    return {
      status: 'vapid-missing',
      permission,
      deviceId,
      tokenPreview: null,
      message:
        'Browser notification permission granted, but the Firebase Cloud Messaging Web Push VAPID public key is not yet configured in src/lib/firebaseConfig.ts (vapidKey). Add that single public key to complete closed-browser FCM push registration.',
    };
  }

  const messaging = await getMessagingInstance();
  if (!messaging) {
    return {
      status: 'unsupported',
      permission,
      deviceId,
      tokenPreview: null,
      message: 'Firebase Cloud Messaging is not supported in this browser context (HTTPS or localhost required).',
    };
  }

  const swReg = await registerFcmServiceWorker();
  if (!swReg) {
    return {
      status: 'error',
      permission,
      deviceId,
      tokenPreview: null,
      message: 'Unable to register the FCM background notification service worker (/firebase-messaging-sw.js).',
    };
  }

  try {
    const token = await getToken(messaging, {
      vapidKey: firebaseRuntimeConfig.vapidKey.trim(),
      serviceWorkerRegistration: swReg,
    });

    if (!token) {
      return {
        status: 'error',
        permission,
        deviceId,
        tokenPreview: null,
        message: 'Firebase Cloud Messaging did not return a device token. Check VAPID key and network connectivity.',
      };
    }

    try {
      window.localStorage.setItem(ACTIVE_TOKEN_STORAGE_KEY, token);
    } catch {
      // Non-fatal
    }

    // Store device registration securely tied to authenticated UID, role, and authorized facility
    try {
      await setDoc(
        doc(db, 'users', params.uid, 'fcmTokens', deviceId),
        {
          token,
          deviceId,
          uid: params.uid,
          role: params.role,
          facilityId: params.facilityId,
          allowedFacilityIds: params.allowedFacilityIds,
          platform: 'hospital-web',
          browser: summarizeUserAgent(),
          active: true,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      const code = extractFirestoreErrorCode(err);
      return {
        status: 'error',
        permission,
        deviceId,
        tokenPreview: `${token.slice(0, 10)}…${token.slice(-6)}`,
        message:
          code === 'permission-denied'
            ? `FCM token obtained, but Firestore security rules denied writing users/${params.uid}/fcmTokens/${deviceId}.`
            : `FCM token obtained, but storing device registration failed (${code}).`,
      };
    }

    return {
      status: 'registered',
      permission,
      deviceId,
      tokenPreview: `${token.slice(0, 10)}…${token.slice(-6)}`,
      message: 'Background browser notifications registered for this hospital device.',
    };
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    return {
      status: 'error',
      permission,
      deviceId,
      tokenPreview: null,
      message: `FCM token registration failed: ${rawMsg}`,
    };
  }
}

/**
 * Unregisters and cleans up the current device's FCM token on disable or sign-out.
 */
export async function disableFcmNotifications(params: {
  appMode: 'demo' | 'firebase';
  uid?: string;
}): Promise<FcmRegistrationResult> {
  const deviceId = getOrCreateHospitalDeviceId();
  const permission = getBrowserNotificationPermission();

  if (params.appMode === 'firebase') {
    const messaging = await getMessagingInstance();
    if (messaging) {
      await deleteToken(messaging).catch(() => {});
    }
    if (params.uid) {
      await deleteDoc(doc(db, 'users', params.uid, 'fcmTokens', deviceId)).catch(() => {});
    }
  }

  try {
    window.localStorage.removeItem(ACTIVE_TOKEN_STORAGE_KEY);
  } catch {
    // Non-fatal
  }

  return {
    status: 'idle',
    permission,
    deviceId,
    tokenPreview: null,
    message: 'Background push registration disabled and cleaned up for this device.',
  };
}

/**
 * Subscribes to foreground FCM messages so alerts arriving via push while the tab is open
 * route cleanly into the Hospital Dashboard's deduplicated alert handler.
 */
export async function subscribeForegroundFcmMessages(
  onAlertReceived: (payload: ForegroundFcmAlertPayload) => void
): Promise<() => void> {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};

  const unsubscribe = onMessage(messaging, (payload) => {
    const data = payload.data ?? {};
    const alertId = typeof data.alertId === 'string' && data.alertId.trim() ? data.alertId.trim() : '';
    if (!alertId) return;

    const rawPriority = String(data.priority ?? '').toLowerCase();
    const priority: AlertPriority = rawPriority.includes('critical')
      ? 'Critical'
      : rawPriority.includes('high')
      ? 'High Priority'
      : rawPriority.includes('low')
      ? 'Low'
      : 'Moderate';

    onAlertReceived({
      alertId,
      priority,
      facilityId: typeof data.facilityId === 'string' ? data.facilityId : undefined,
    });
  });

  return unsubscribe;
}
