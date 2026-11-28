import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertNotificationEventType,
  AlertNotificationItem,
  EmergencyAlert,
  NotificationPreferences,
} from '../types';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import {
  isUrgentChimeRepeating,
  playAlertSound,
  readNotificationPreferences,
  saveNotificationPreferences,
  startUrgentRepeatChime,
  stopUrgentRepeatChime,
  unlockAlertAudio,
} from '../utils/alertSound';
import {
  enableAndRegisterPushToken,
  getPushStatusSnapshot,
  PushStatusSnapshot,
  subscribeForegroundFcmMessages,
  syncExistingPushTokenIfGranted,
  unregisterDevicePushToken,
} from '../services/fcmService';
import { isAlertTerminalStatus } from '../components/emergency/alertConstants';

interface AlertNotificationContextType {
  notifications: AlertNotificationItem[];
  unreadCount: number;
  activeBanner: AlertNotificationItem | null;
  prefs: NotificationPreferences;
  pushStatus: PushStatusSnapshot;
  autoplayBlocked: boolean;
  isChimeRepeating: boolean;
  updatePrefs: (updates: Partial<NotificationPreferences>) => void;
  enableSoundAlerts: () => Promise<boolean>;
  testAlertSound: () => Promise<boolean>;
  silenceActiveChime: () => void;
  enablePushNotifications: () => Promise<PushStatusSnapshot>;
  disablePushNotifications: () => Promise<void>;
  dismissBanner: () => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
}

const AlertNotificationContext = createContext<AlertNotificationContextType | undefined>(undefined);

function isAlertRelevantToCurrentUser(
  alert: EmergencyAlert,
  role: 'mother' | 'worker' | 'supervisor' | null,
  actorId: string
): boolean {
  if (!role) return false;
  if (role === 'mother') {
    return alert.motherId === actorId;
  }
  if (role === 'worker') {
    return alert.assignedWorkerId === actorId || alert.raisedById === actorId;
  }
  return true; // supervisor sees block jurisdiction alerts
}

function buildGenericNotificationCopy(
  eventType: AlertNotificationEventType
): { title: string; body: string } {
  if (eventType === 'escalated') {
    return {
      title: 'JanmaSaathi Alert Escalated',
      body: 'A maternal alert has been escalated for urgent hospital review.',
    };
  }
  if (eventType === 'resolved') {
    return {
      title: 'JanmaSaathi Alert Resolved',
      body: 'Maternal emergency alert has been resolved by the care team.',
    };
  }
  if (eventType === 'status_updated') {
    return {
      title: 'JanmaSaathi Alert Update',
      body: 'Maternal emergency alert status updated.',
    };
  }
  return {
    title: 'JanmaSaathi Maternal Alert',
    body: 'New maternal health alert requires attention.',
  };
}

export const AlertNotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { role, user, firebaseUid } = useAuth();
  const { emergencyAlerts, isLoading } = useData();

  const [prefs, setPrefs] = useState<NotificationPreferences>(() => readNotificationPreferences());
  const [notifications, setNotifications] = useState<AlertNotificationItem[]>([]);
  const [activeBanner, setActiveBanner] = useState<AlertNotificationItem | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [chimeRepeating, setChimeRepeating] = useState(false);
  const [pushStatus, setPushStatus] = useState<PushStatusSnapshot>({
    status: 'permission_default',
    permission: typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported',
    vapidKeyConfigured: false,
    tokenRegistered: false,
  });

  const sessionKey = role && user ? `${role}:${user.mcpId || user.staffId || user.id}` : null;
  const actorId = user?.mcpId || user?.staffId || user?.id || '';

  const sessionStartMsRef = useRef<number>(Date.now());
  const baselineSnapshotsRef = useRef<
    Map<string, { status: string; updatedAtMs: number; updatesCount: number }>
  >(new Map());
  const processedEventsRef = useRef<Set<string>>(new Set());
  const baselineReadyRef = useRef<boolean>(false);

  // Reset baseline whenever authenticated session changes
  useEffect(() => {
    sessionStartMsRef.current = Date.now();
    baselineSnapshotsRef.current = new Map();
    processedEventsRef.current = new Set();
    baselineReadyRef.current = false;
    setNotifications([]);
    setActiveBanner(null);
    stopUrgentRepeatChime();
    setChimeRepeating(false);

    if (!sessionKey || !role || !user) return;

    const timer = window.setTimeout(() => {
      baselineReadyRef.current = true;
    }, 1000);

    getPushStatusSnapshot().then(setPushStatus).catch(() => {});
    syncExistingPushTokenIfGranted({
      role,
      uid: firebaseUid || user.id,
      motherId: role === 'mother' ? user.mcpId || user.id : null,
      staffId: role !== 'mother' ? user.staffId || user.id : null,
    })
      .then((synced) => {
        if (synced) {
          getPushStatusSnapshot().then(setPushStatus).catch(() => {});
        }
      })
      .catch(() => {});

    return () => {
      window.clearTimeout(timer);
    };
  }, [sessionKey, role, user, firebaseUid]);

  const triggerIncomingNotification = useCallback(
    async (
      alert: EmergencyAlert,
      eventType: AlertNotificationEventType
    ) => {
      const dedupeKey = `${alert.id}:${eventType}:${alert.updatedAtMs || alert.createdAtMs}`;
      if (processedEventsRef.current.has(dedupeKey)) return;
      processedEventsRef.current.add(dedupeKey);

      const copy = buildGenericNotificationCopy(eventType);
      const item: AlertNotificationItem = {
        id: `NOTIF-${alert.id}-${Date.now()}`,
        alertId: alert.id,
        eventType,
        title: copy.title,
        body: copy.body,
        urgency: alert.urgency,
        status: alert.status,
        targetHospitalId: alert.targetHospitalId,
        createdAtMs: Date.now(),
        read: false,
        silenced: false,
        soundPlayed: false,
      };

      const soundSeverity =
        eventType === 'alert_created' || eventType === 'escalated'
          ? alert.urgency
          : 'update';

      const soundRes = await playAlertSound(soundSeverity);
      item.soundPlayed = soundRes.played;
      if (soundRes.blockedByAutoplay) {
        setAutoplayBlocked(true);
      } else if (soundRes.played) {
        setAutoplayBlocked(false);
      }

      if (
        (eventType === 'alert_created' || eventType === 'escalated') &&
        (alert.urgency === 'critical' || alert.urgency === 'urgent') &&
        role !== 'mother' &&
        !isAlertTerminalStatus(alert.status)
      ) {
        startUrgentRepeatChime(alert.id, alert.urgency, () => setAutoplayBlocked(true));
        setChimeRepeating(isUrgentChimeRepeating());
      }

      setNotifications((prev) => [item, ...prev].slice(0, 30));
      setActiveBanner(item);
    },
    [role]
  );

  // Foreground Firestore real-time listener processor (never chimes on historical load)
  useEffect(() => {
    if (!role || !user || isLoading) return;

    const relevant = emergencyAlerts.filter((a) => isAlertRelevantToCurrentUser(a, role, actorId));
    const currentMap = baselineSnapshotsRef.current;

    // First hydration pass or historical records created well before current session
    if (!baselineReadyRef.current) {
      for (const alert of relevant) {
        currentMap.set(alert.id, {
          status: alert.status,
          updatedAtMs: alert.updatedAtMs || alert.createdAtMs || 0,
          updatesCount: alert.hospitalUpdates?.length || 0,
        });
      }
      return;
    }

    for (const alert of relevant) {
      const prev = currentMap.get(alert.id);
      const updatesCount = alert.hospitalUpdates?.length || 0;
      const latestUpdate = updatesCount > 0 ? alert.hospitalUpdates[updatesCount - 1] : null;
      const alertTouchMs = alert.updatedAtMs || alert.createdAtMs || 0;

      if (!prev) {
        currentMap.set(alert.id, {
          status: alert.status,
          updatedAtMs: alertTouchMs,
          updatesCount,
        });

        // Ignore pre-session historical records that just finished syncing from Firestore
        const isRecentLiveAlert = alertTouchMs >= sessionStartMsRef.current - 15000;
        const raisedByCurrentUser =
          alert.raisedByRole === role && alert.raisedById === actorId;

        if (isRecentLiveAlert && !raisedByCurrentUser && alert.syncStatus !== 'pending_sync') {
          triggerIncomingNotification(alert, 'alert_created');
        }
        continue;
      }

      const statusChanged = prev.status !== alert.status;
      const updatesIncreased = updatesCount > prev.updatesCount;

      if (statusChanged || updatesIncreased) {
        currentMap.set(alert.id, {
          status: alert.status,
          updatedAtMs: alertTouchMs,
          updatesCount,
        });

        // Stop repeating chime if alert was acknowledged or resolved
        if (!['new', 'pending_acknowledgement'].includes(alert.status)) {
          stopUrgentRepeatChime(alert.id);
          setChimeRepeating(isUrgentChimeRepeating());
        }

        const updatedByCurrentUser =
          latestUpdate && latestUpdate.actorRole === role;

        if (!updatedByCurrentUser) {
          const eventType: AlertNotificationEventType =
            alert.status === 'escalated'
              ? 'escalated'
              : isAlertTerminalStatus(alert.status)
              ? 'resolved'
              : 'status_updated';
          triggerIncomingNotification(alert, eventType);
        }
      }
    }
  }, [emergencyAlerts, isLoading, role, user, actorId, triggerIncomingNotification]);

  // Foreground FCM push listener (deduplicated against Firestore listener)
  useEffect(() => {
    if (!role || !user) return;
    let unsub = () => {};
    let cancelled = false;

    subscribeForegroundFcmMessages((payload) => {
      if (!payload.alertId) return;
      const matching = emergencyAlerts.find((a) => a.id === payload.alertId);
      if (matching && isAlertRelevantToCurrentUser(matching, role, actorId)) {
        const evt: AlertNotificationEventType =
          payload.eventType === 'escalated'
            ? 'escalated'
            : payload.eventType === 'resolved'
            ? 'resolved'
            : payload.eventType === 'status_updated'
            ? 'status_updated'
            : 'alert_created';
        triggerIncomingNotification(matching, evt);
      }
    }).then((fn) => {
      if (cancelled) fn();
      else unsub = fn;
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [role, user, actorId, emergencyAlerts, triggerIncomingNotification]);

  const updatePrefs = useCallback((updates: Partial<NotificationPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...updates };
      saveNotificationPreferences(next);
      if (!next.soundEnabled || !next.repeatUrgentChime) {
        stopUrgentRepeatChime();
        setChimeRepeating(false);
      }
      return next;
    });
  }, []);

  const enableSoundAlerts = useCallback(async (): Promise<boolean> => {
    const unlocked = await unlockAlertAudio();
    updatePrefs({ soundEnabled: true });
    if (unlocked) {
      setAutoplayBlocked(false);
    }
    return unlocked;
  }, [updatePrefs]);

  const testAlertSound = useCallback(async (): Promise<boolean> => {
    await unlockAlertAudio();
    const res = await playAlertSound('urgent', { ignoreSoundDisabled: true });
    if (res.played) {
      setAutoplayBlocked(false);
    } else if (res.blockedByAutoplay) {
      setAutoplayBlocked(true);
    }
    return res.played;
  }, []);

  const silenceActiveChime = useCallback(() => {
    stopUrgentRepeatChime();
    setChimeRepeating(false);
    setActiveBanner((prev) => (prev ? { ...prev, silenced: true } : null));
  }, []);

  const enablePushNotifications = useCallback(async (): Promise<PushStatusSnapshot> => {
    await unlockAlertAudio();
    if (!role || !user) {
      return pushStatus;
    }
    const snapshot = await enableAndRegisterPushToken({
      role,
      uid: firebaseUid || user.id,
      motherId: role === 'mother' ? user.mcpId || user.id : null,
      staffId: role !== 'mother' ? user.staffId || user.id : null,
    });
    setPushStatus(snapshot);
    if (snapshot.status === 'ready') {
      updatePrefs({ pushEnabled: true });
    }
    return snapshot;
  }, [role, user, firebaseUid, pushStatus, updatePrefs]);

  const disablePushNotifications = useCallback(async () => {
    await unregisterDevicePushToken({ revokeBrowserToken: true });
    updatePrefs({ pushEnabled: false });
    const snapshot = await getPushStatusSnapshot();
    setPushStatus(snapshot);
  }, [updatePrefs]);

  const dismissBanner = useCallback(() => {
    stopUrgentRepeatChime();
    setChimeRepeating(false);
    setActiveBanner(null);
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  return (
    <AlertNotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        activeBanner,
        prefs,
        pushStatus,
        autoplayBlocked,
        isChimeRepeating: chimeRepeating,
        updatePrefs,
        enableSoundAlerts,
        testAlertSound,
        silenceActiveChime,
        enablePushNotifications,
        disablePushNotifications,
        dismissBanner,
        markNotificationRead,
        markAllRead,
      }}
    >
      {children}
    </AlertNotificationContext.Provider>
  );
};

export const useAlertNotifications = () => {
  const ctx = useContext(AlertNotificationContext);
  if (!ctx) {
    throw new Error('useAlertNotifications must be used within an AlertNotificationProvider');
  }
  return ctx;
};
