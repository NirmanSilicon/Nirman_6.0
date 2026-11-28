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
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { HOSPITAL_FACILITIES, findFacilityByIdentifier } from '../data/facilities';
import {
  DEMO_ALERTS,
  DEMO_APPOINTMENTS,
  DEMO_ASSESSMENTS,
  DEMO_AUDIT_LOGS,
  DEMO_HEALTH_WORKERS,
  DEMO_MOTHERS,
  DEMO_REFERRALS,
  JANMASAATHI_DEMO_PERSONAS,
} from '../data/janmasaathiDemoFixtures';
import {
  ConnectionCheckResult,
  OperationType,
  StorageCheckResult,
  auth,
  buildFirestoreErrorInfo,
  db,
  extractFirestoreErrorCode,
  firebaseRuntimeConfig,
  handleFirestoreError,
  testFirestoreConnection,
  testStorageConnection,
} from '../lib/firebase';
import {
  SOURCE_ROLE_LABELS,
  canRoleManageAlerts,
  findActiveDuplicateAlert,
  formatReturnCommunicationMessage,
  isActiveAlertStatus,
  validateAlertTransition,
} from '../services/alertProtocol';
import {
  CANONICAL_DEMO_PERSONAS,
  ClinicalMutationAction,
  NormalizedRoleCategory,
  canAccessFacility,
  canAccessSection,
  canCallerViewAlert,
  canPerformMutation,
  getPermittedNavSections,
  normalizeUserRole,
} from '../services/rbacPolicy';
import {
  adaptAppointment,
  adaptAssessment,
  adaptAuditLog,
  adaptEmergencyAlert,
  adaptHealthUpdate,
  adaptHealthWorker,
  adaptMother,
  adaptReferral,
  adaptReportDocument,
  adaptSupervisor,
} from '../services/firestoreAdapters';
import {
  AlertCategory,
  AlertPriority,
  AlertReferralCoordination,
  AlertSourceRole,
  AlertStatus,
  AlertSyncChannelState,
  AppMode,
  AppointmentRecord,
  AppointmentStatus,
  AssessmentRecord,
  AuditLogEntry,
  ClinicalDocument,
  CollectionKey,
  CollectionStatusMap,
  DateRangeKey,
  DemoPersonaId,
  EmergencyAlert,
  HealthWorker,
  HospitalFacility,
  HospitalUser,
  MotherRecord,
  NavSection,
  NotificationItem,
  ReferralRecord,
  ReferralStatus,
  SupervisorRecord,
  SymptomLog,
  VitalRecord,
} from '../types/hospital';
import {
  AudioPlaybackResult,
  markHistoricalAlertsAsSounded,
  playAlertNotificationSound,
  resetSoundedAlertHistory,
  silenceAlertReminder as stopAlertReminderTimer,
  silenceAllAlertReminders,
  startAlertReminder,
  testAlertNotificationSound,
  unlockAlertAudio,
} from '../utils/alertSound';
import {
  BrowserNotificationPermission,
  FcmRegistrationStatus,
  disableFcmNotifications,
  enableFcmNotifications,
  getBrowserNotificationPermission,
  getOrCreateHospitalDeviceId,
  isVapidKeyConfigured,
  showPrivacySafeSystemNotification,
  subscribeForegroundFcmMessages,
} from '../services/fcmNotificationService';

export interface IncomingAlertToast {
  id: string;
  alertId: string;
  motherId: string;
  motherName: string;
  priority: AlertPriority;
  sourceRole: AlertSourceRole;
  title: string;
  isDuplicate: boolean;
  arrivedAt: string;
}

export interface AlertTriageUpdatePayload {
  status?: AlertStatus;
  note?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  assignedStaffRole?: string;
  referralCoordination?: Partial<AlertReferralCoordination>;
  resolutionSummary?: string;
  notifyRecipients?: AlertSourceRole[];
  actionLabel?: string;
}

export interface SubmitEmergencyAlertPayload {
  motherId: string;
  sourceRole: AlertSourceRole;
  reportedByUserId?: string;
  reportedByName?: string;
  alertCategory: AlertCategory;
  priority: AlertPriority;
  triggerTitle: string;
  symptomDescription: string;
  symptoms: string[];
  protocolReference?: string;
  vitalsSnapshot?: {
    bp?: string;
    pulse?: number;
    spo2?: number;
    hemoglobin?: number;
    fetalHeartRate?: number;
    temperatureC?: number;
  };
}

interface DashboardContextValue {
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  activeDemoPersonaId: DemoPersonaId | null;

  authReady: boolean;
  isAuthenticated: boolean;
  firebaseUser: FirebaseUser | null;
  currentUser: HospitalUser;
  currentFacility: HospitalFacility;
  setSelectedFacilityId: (facilityId: string) => void;
  roleCategory: NormalizedRoleCategory;
  permittedSections: NavSection[];
  canManageAlerts: boolean;
  canMutate: (action: ClinicalMutationAction) => boolean;

  connectionCheck: ConnectionCheckResult;
  storageCheck: StorageCheckResult;
  retryConnection: () => void;
  refreshAllSubscriptions: () => void;
  collectionStatuses: CollectionStatusMap;

  alertSyncState: AlertSyncChannelState;
  manualSyncAlerts: () => Promise<void>;
  alertSoundEnabled: boolean;
  setAlertSoundEnabled: (enabled: boolean) => void;
  enableAlertSound: () => Promise<AudioPlaybackResult>;
  disableAlertSound: () => void;
  testAlertSound: () => Promise<AudioPlaybackResult>;
  alertSoundStatusMessage: string | null;
  alertAudioBlocked: boolean;
  activeReminderAlertIds: string[];
  silenceAlertReminder: (alertId: string) => void;
  notificationPermission: BrowserNotificationPermission;
  fcmStatus: FcmRegistrationStatus;
  fcmMessage: string;
  fcmDeviceId: string;
  fcmTokenPreview: string | null;
  fcmVapidConfigured: boolean;
  fcmBusy: boolean;
  enableBrowserPushNotifications: () => Promise<void>;
  disableBrowserPushNotifications: () => Promise<void>;
  incomingAlertToast: IncomingAlertToast | null;
  dismissIncomingAlertToast: () => void;

  mutationError: string | null;
  clearMutationError: () => void;

  enterDemoPersona: (personaId: DemoPersonaId, facilityId?: string) => void;
  resetDemoFixtures: () => void;
  signInWithEmail: (email: string, password: string, facilityId: string) => Promise<void>;
  logout: () => Promise<void>;

  activeSection: NavSection;
  setActiveSection: (section: NavSection) => void;

  selectedMotherId: string | null;
  openMotherProfile: (motherId: string) => void;
  closeMotherProfile: () => void;

  selectedAlertId: string | null;
  setSelectedAlertId: (id: string | null) => void;

  selectedReferralId: string | null;
  setSelectedReferralId: (id: string | null) => void;

  selectedHealthWorkerId: string | null;
  setSelectedHealthWorkerId: (id: string | null) => void;

  dateRange: DateRangeKey;
  setDateRange: (range: DateRangeKey) => void;

  globalSearch: string;
  setGlobalSearch: (q: string) => void;

  mothers: MotherRecord[];
  healthWorkers: HealthWorker[];
  supervisors: SupervisorRecord[];
  assessments: AssessmentRecord[];
  alerts: EmergencyAlert[];
  referrals: ReferralRecord[];
  appointments: AppointmentRecord[];
  auditLogs: AuditLogEntry[];
  notifications: NotificationItem[];

  submitEmergencyAlert: (
    payload: SubmitEmergencyAlertPayload
  ) => Promise<{ ok: boolean; alertId?: string; duplicatePreserved?: boolean; error?: string }>;
  updateAlertTriage: (
    alertId: string,
    payload: AlertTriageUpdatePayload
  ) => Promise<{ ok: boolean; error?: string }>;
  updateAlertStatus: (alertId: string, newStatus: AlertStatus, note: string) => Promise<void>;
  updateReferralStatus: (
    referralId: string,
    newStatus: ReferralStatus,
    followUpNote?: string
  ) => Promise<void>;
  createReferral: (payload: Omit<ReferralRecord, 'id' | 'referralDate' | 'isDemo'>) => Promise<void>;
  addAssessmentNote: (
    motherId: string,
    payload: {
      assessmentType: AssessmentRecord['assessmentType'];
      riskClassification: AssessmentRecord['riskClassification'];
      bpReading: string;
      hemoglobin: number;
      summary: string;
      recommendations: string;
    }
  ) => Promise<void>;
  updateAppointmentStatus: (
    appointmentId: string,
    status: AppointmentStatus,
    newDate?: string
  ) => Promise<void>;
  createAppointment: (payload: Omit<AppointmentRecord, 'id' | 'isDemo'>) => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  logAuditAction: (
    category: AuditLogEntry['category'],
    action: string,
    targetEntity: string,
    authorizationBasis: string
  ) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

const COLLECTION_KEYS: CollectionKey[] = [
  'users',
  'mothers',
  'healthWorkers',
  'supervisors',
  'assignments',
  'assessments',
  'healthUpdates',
  'referrals',
  'appointments',
  'reports',
  'emergencyAlerts',
  'alerts',
  'auditLogs',
];

function createInitialStatuses(status: 'idle' | 'ready' = 'idle'): CollectionStatusMap {
  return COLLECTION_KEYS.reduce((acc, key) => {
    acc[key] = { status, count: 0, path: key };
    return acc;
  }, {} as CollectionStatusMap);
}

function buildDefaultUser(fbUser: FirebaseUser | null, facilityId: string): HospitalUser {
  return {
    id: fbUser?.uid ?? '',
    uid: fbUser?.uid ?? '',
    name: fbUser?.displayName || fbUser?.email?.split('@')[0] || 'Hospital Staff',
    designation: 'Authenticated Staff',
    department: 'Maternal Healthcare',
    role: 'Authenticated User',
    staffId: fbUser?.uid ? fbUser.uid.slice(0, 8).toUpperCase() : '—',
    email: fbUser?.email ?? '',
    facilityId,
    shift: 'Live Session',
  };
}

function nowFormatted(): string {
  const d = new Date();
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
}

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appMode, setAppModeState] = useState<AppMode>('demo');
  const [activeDemoPersonaId, setActiveDemoPersonaId] = useState<DemoPersonaId | null>(null);
  const [demoAuthenticated, setDemoAuthenticated] = useState<boolean>(false);

  const [authReady, setAuthReady] = useState<boolean>(false);
  const [firebaseProfileResolved, setFirebaseProfileResolved] = useState<boolean>(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [facilityId, setFacilityId] = useState<string>(HOSPITAL_FACILITIES[0].id);
  const [firebaseAllowedFacilities, setFirebaseAllowedFacilities] = useState<string[]>([]);
  const [firebaseFacilityField, setFirebaseFacilityField] = useState<
    'facilityId' | 'hospitalId' | 'facilityCode'
  >('facilityId');
  const [firebaseProfileUser, setFirebaseProfileUser] = useState<HospitalUser>(() =>
    buildDefaultUser(null, '')
  );
  const [demoUser, setDemoUser] = useState<HospitalUser>(JANMASAATHI_DEMO_PERSONAS[3].user);
  const demoAuthenticatedRef = useRef<boolean>(false);
  useEffect(() => {
    demoAuthenticatedRef.current = demoAuthenticated;
  }, [demoAuthenticated]);

  // Server-issued signed demo Bearer token held strictly in memory (never localStorage)
  const demoSessionTokenRef = useRef<string | null>(null);

  const [connectionCheck, setConnectionCheck] = useState<ConnectionCheckResult>({
    status: 'idle',
    message: `Configured for ${firebaseRuntimeConfig.projectId} / ${firebaseRuntimeConfig.databaseId}`,
    checkedAt: new Date().toISOString(),
  });
  const [storageCheck, setStorageCheck] = useState<StorageCheckResult>({
    status: 'idle',
    bucket: firebaseRuntimeConfig.storageBucket,
    message: `Configured for ${firebaseRuntimeConfig.storageBucket}`,
    checkedAt: new Date().toISOString(),
  });

  const [liveCollectionStatuses, setLiveCollectionStatuses] = useState<CollectionStatusMap>(() =>
    createInitialStatuses('idle')
  );
  const [subscriptionEpoch, setSubscriptionEpoch] = useState<number>(0);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Real-time alert reception state, sound preference (opt-in default false), & live toast
  const [alertSyncState, setAlertSyncState] = useState<AlertSyncChannelState>({
    channel: 'offline',
    connected: false,
    lastSyncedAt: null,
    pollingIntervalMs: null,
  });
  const [alertSoundEnabled, setAlertSoundEnabledState] = useState<boolean>(false);
  const alertSoundEnabledRef = useRef<boolean>(false);
  useEffect(() => {
    alertSoundEnabledRef.current = alertSoundEnabled;
  }, [alertSoundEnabled]);
  const [alertSoundStatusMessage, setAlertSoundStatusMessage] = useState<string | null>(null);
  const [alertAudioBlocked, setAlertAudioBlocked] = useState<boolean>(false);
  const [activeReminderAlertIds, setActiveReminderAlertIds] = useState<string[]>([]);

  // Browser notification permission & FCM device registration state
  const [notificationPermission, setNotificationPermission] =
    useState<BrowserNotificationPermission>(() => getBrowserNotificationPermission());
  const fcmVapidConfigured = useMemo(() => isVapidKeyConfigured(), []);
  const fcmDeviceId = useMemo(() => getOrCreateHospitalDeviceId(), []);
  const [fcmStatus, setFcmStatus] = useState<FcmRegistrationStatus>(() => {
    const perm = getBrowserNotificationPermission();
    if (perm === 'unsupported') return 'unsupported';
    if (perm === 'denied') return 'permission-denied';
    return 'idle';
  });
  const [fcmMessage, setFcmMessage] = useState<string>(
    'Background browser push notifications are opt-in. Click "Enable Background Notifications" to register this hospital device.'
  );
  const [fcmTokenPreview, setFcmTokenPreview] = useState<string | null>(null);
  const [fcmBusy, setFcmBusy] = useState<boolean>(false);
  const [pendingDeepLinkAlertId, setPendingDeepLinkAlertId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const param = new URLSearchParams(window.location.search).get('alertId');
    return param && param.trim() ? param.trim() : null;
  });

  const [incomingAlertToast, setIncomingAlertToast] = useState<IncomingAlertToast | null>(null);
  const seenAlertIdsRef = useRef<Set<string>>(new Set());
  const hasHydratedAlertsRef = useRef<boolean>(false);

  const [activeSection, setActiveSectionState] = useState<NavSection>('overview');
  const [selectedMotherId, setSelectedMotherId] = useState<string | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [selectedReferralId, setSelectedReferralId] = useState<string | null>(null);
  const [selectedHealthWorkerId, setSelectedHealthWorkerId] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<DateRangeKey>('all');
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(new Set());

  // =========================================================================
  // ISOLATED DEMO STATE (Original JanmaSaathi fixtures + real Express SSE)
  // =========================================================================
  const [demoMothers, setDemoMothers] = useState<MotherRecord[]>(() => DEMO_MOTHERS);
  const [demoHealthWorkers, setDemoHealthWorkers] = useState<HealthWorker[]>(
    () => DEMO_HEALTH_WORKERS
  );
  const [demoAssessments, setDemoAssessments] = useState<AssessmentRecord[]>(
    () => DEMO_ASSESSMENTS
  );
  const [demoAlerts, setDemoAlerts] = useState<EmergencyAlert[]>(() => DEMO_ALERTS);
  const [demoReferrals, setDemoReferrals] = useState<ReferralRecord[]>(() => DEMO_REFERRALS);
  const [demoAppointments, setDemoAppointments] = useState<AppointmentRecord[]>(
    () => DEMO_APPOINTMENTS
  );
  const [demoAuditLogs, setDemoAuditLogs] = useState<AuditLogEntry[]>(() => DEMO_AUDIT_LOGS);

  // =========================================================================
  // ISOLATED LIVE FIREBASE STATE (outr-janmasaathi named Firestore database)
  // =========================================================================
  const [rawMothers, setRawMothers] = useState<{ id: string; data: Record<string, unknown> }[]>([]);
  const [rawHealthWorkers, setRawHealthWorkers] = useState<HealthWorker[]>([]);
  const [liveSupervisors, setLiveSupervisors] = useState<SupervisorRecord[]>([]);
  const [rawAssignments, setRawAssignments] = useState<
    { motherId: string; healthWorkerId: string }[]
  >([]);
  const [liveAssessments, setLiveAssessments] = useState<AssessmentRecord[]>([]);
  const [healthUpdateVitals, setHealthUpdateVitals] = useState<
    { motherId: string; vital: VitalRecord }[]
  >([]);
  const [healthUpdateSymptoms, setHealthUpdateSymptoms] = useState<
    { motherId: string; symptom: SymptomLog }[]
  >([]);
  const [healthUpdateAlerts, setHealthUpdateAlerts] = useState<EmergencyAlert[]>([]);
  const [emergencyAlertsLive, setEmergencyAlertsLive] = useState<EmergencyAlert[]>([]);
  const [dedicatedAlerts, setDedicatedAlerts] = useState<EmergencyAlert[]>([]);
  const [liveReferrals, setLiveReferrals] = useState<ReferralRecord[]>([]);
  const [liveAppointments, setLiveAppointments] = useState<AppointmentRecord[]>([]);
  const [reportDocs, setReportDocs] = useState<{ motherId: string; doc: ClinicalDocument }[]>([]);
  const [liveAuditLogs, setLiveAuditLogs] = useState<AuditLogEntry[]>([]);

  const currentFacility = useMemo<HospitalFacility>(() => {
    const matched = findFacilityByIdentifier(facilityId);
    if (matched) return matched;
    if (appMode === 'firebase') {
      if (facilityId && facilityId.trim()) {
        return {
          ...HOSPITAL_FACILITIES[0],
          id: facilityId.trim(),
          name: `JanmaSaathi Facility (${facilityId.trim()})`,
          shortName: facilityId.trim(),
          facilityCode: facilityId.trim().toUpperCase(),
        };
      }
      // Fail-closed: never invent a default hospital ID in Firebase mode
      return {
        id: '',
        name: 'Unassigned Hospital Facility',
        shortName: 'Unassigned',
        facilityCode: 'UNASSIGNED',
        district: '—',
        state: '—',
        tier: 'Unassigned Facility',
        obgynBeds: 0,
        emergencyDeskPhone: '—',
        catchmentBlocks: [],
      };
    }
    return HOSPITAL_FACILITIES[0];
  }, [appMode, facilityId]);

  const currentUser = appMode === 'demo' ? demoUser : firebaseProfileUser;
  const isAuthenticated = appMode === 'demo' ? demoAuthenticated : Boolean(firebaseUser);
  const roleCategory = useMemo(
    () => normalizeUserRole(currentUser.role),
    [currentUser.role]
  );
  const permittedSections = useMemo(
    () => getPermittedNavSections(currentUser.role),
    [currentUser.role]
  );
  const canManageAlerts = useMemo(() => canRoleManageAlerts(currentUser.role), [currentUser.role]);
  const canMutate = useCallback(
    (action: ClinicalMutationAction) => canPerformMutation(currentUser.role, action),
    [currentUser.role]
  );
  const allowedFacilityIds = useMemo<string[]>(() => {
    if (appMode === 'demo' && activeDemoPersonaId && activeDemoPersonaId in CANONICAL_DEMO_PERSONAS) {
      return [...CANONICAL_DEMO_PERSONAS[activeDemoPersonaId].allowedFacilityIds];
    }
    if (appMode === 'firebase') {
      // Fail-closed: strictly use verified Firebase claims / users/{uid} facilities (never a fallback default)
      return firebaseAllowedFacilities;
    }
    return [currentFacility.id];
  }, [appMode, activeDemoPersonaId, firebaseAllowedFacilities, currentFacility.id]);

  const allowedFacilityIdsRef = useRef<string[]>(allowedFacilityIds);
  useEffect(() => {
    allowedFacilityIdsRef.current = allowedFacilityIds;
  }, [allowedFacilityIds]);

  const silenceAlertReminder = useCallback((alertId: string) => {
    stopAlertReminderTimer(alertId);
    setActiveReminderAlertIds((prev) => prev.filter((id) => id !== alertId));
  }, []);

  const enableAlertSound = useCallback(async (): Promise<AudioPlaybackResult> => {
    const res = await unlockAlertAudio();
    setAlertSoundEnabledState(true);
    setAlertAudioBlocked(!res.ok);
    setAlertSoundStatusMessage(res.message);
    return res;
  }, []);

  const disableAlertSound = useCallback(() => {
    setAlertSoundEnabledState(false);
    setAlertAudioBlocked(false);
    silenceAllAlertReminders();
    setActiveReminderAlertIds([]);
    setAlertSoundStatusMessage('Alert sound muted. Visual alert banners remain active.');
  }, []);

  const setAlertSoundEnabled = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        void enableAlertSound();
      } else {
        disableAlertSound();
      }
    },
    [enableAlertSound, disableAlertSound]
  );

  const testAlertSound = useCallback(async (): Promise<AudioPlaybackResult> => {
    const res = await testAlertNotificationSound();
    setAlertAudioBlocked(!res.ok);
    setAlertSoundStatusMessage(res.message);
    return res;
  }, []);

  const enableBrowserPushNotifications = useCallback(async () => {
    setFcmBusy(true);
    try {
      const uid = appMode === 'firebase' ? firebaseUser?.uid || currentUser.uid : currentUser.uid;
      const result = await enableFcmNotifications({
        appMode,
        uid,
        role: currentUser.role,
        facilityId: currentFacility.id,
        allowedFacilityIds,
      });
      setNotificationPermission(result.permission);
      setFcmStatus(result.status);
      setFcmTokenPreview(result.tokenPreview);
      setFcmMessage(result.message);
    } finally {
      setFcmBusy(false);
    }
  }, [appMode, firebaseUser?.uid, currentUser.uid, currentUser.role, currentFacility.id, allowedFacilityIds]);

  const disableBrowserPushNotifications = useCallback(async () => {
    setFcmBusy(true);
    try {
      const uid = appMode === 'firebase' ? firebaseUser?.uid || currentUser.uid : undefined;
      const result = await disableFcmNotifications({ appMode, uid });
      setNotificationPermission(result.permission);
      setFcmStatus(result.status);
      setFcmTokenPreview(null);
      setFcmMessage(result.message);
    } finally {
      setFcmBusy(false);
    }
  }, [appMode, firebaseUser?.uid, currentUser.uid]);

  // Keep browser notification permission status refreshed when tab regains focus
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncPerm = () => {
      const perm = getBrowserNotificationPermission();
      setNotificationPermission(perm);
      if (perm === 'denied') {
        setFcmStatus('permission-denied');
      }
    };
    window.addEventListener('focus', syncPerm);
    document.addEventListener('visibilitychange', syncPerm);
    return () => {
      window.removeEventListener('focus', syncPerm);
      document.removeEventListener('visibilitychange', syncPerm);
    };
  }, []);

  // Listen for background notification click messages from /firebase-messaging-sw.js
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const handleSwMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; alertId?: string } | null;
      if (data?.type === 'JANMASAATHI_OPEN_ALERT' && typeof data.alertId === 'string' && data.alertId.trim()) {
        setPendingDeepLinkAlertId(data.alertId.trim());
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    };
  }, []);

  // Open deep-linked emergency alert once user is authenticated and authorized
  useEffect(() => {
    if (!pendingDeepLinkAlertId || !isAuthenticated || roleCategory === 'unauthorized') return;
    if (canAccessSection(currentUser.role, 'alerts')) {
      setActiveSectionState('alerts');
      setSelectedAlertId(pendingDeepLinkAlertId);
    }
    setPendingDeepLinkAlertId(null);
    if (typeof window !== 'undefined' && window.location.search.includes('alertId=')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('alertId');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, [pendingDeepLinkAlertId, isAuthenticated, roleCategory, currentUser.role]);

  const notifyNewAlertArrival = useCallback(
    (alert: EmergencyAlert, isDuplicate = false) => {
      setIncomingAlertToast({
        id: `toast-${alert.id}-${Date.now()}`,
        alertId: alert.id,
        motherId: alert.motherId,
        motherName: alert.motherName,
        priority: alert.severity,
        sourceRole: alert.sourceRole,
        title: isDuplicate
          ? `Duplicate submission preserved on ${alert.id}`
          : alert.triggerTitle,
        isDuplicate,
        arrivedAt: nowFormatted(),
      });

      if (alertSoundEnabledRef.current) {
        void playAlertNotificationSound(
          alert.severity,
          isDuplicate ? undefined : alert.id
        ).then((res) => {
          if (!res.ok) {
            setAlertAudioBlocked(true);
            setAlertSoundStatusMessage(res.message);
          } else {
            setAlertAudioBlocked(false);
          }
        });

        // Bounded calm repeating reminder for unacknowledged Critical / High Priority alerts
        if (
          !isDuplicate &&
          alert.status === 'NEW' &&
          (alert.severity === 'Critical' || alert.severity === 'High Priority')
        ) {
          startAlertReminder(
            alert.id,
            alert.severity,
            () => alertSoundEnabledRef.current,
            (clearedId) => {
              setActiveReminderAlertIds((prev) => prev.filter((id) => id !== clearedId));
            }
          );
          setActiveReminderAlertIds((prev) =>
            prev.includes(alert.id) ? prev : [...prev, alert.id]
          );
        }
      }

      // Privacy-safe system notification if tab is currently hidden and permission is granted
      if (
        typeof document !== 'undefined' &&
        document.hidden &&
        getBrowserNotificationPermission() === 'granted'
      ) {
        showPrivacySafeSystemNotification({
          alertId: alert.id,
          priority: alert.severity,
          onSelectAlert: (alertId) => {
            setActiveSectionState('alerts');
            setSelectedAlertId(alertId);
          },
        });
      }
    },
    []
  );

  // Open-dashboard real-time emergency alerts rely strictly on Firestore onSnapshot()
  // with zero automatic FCM or background push dependency.

  // Foreground FCM listener in Firebase Mode (deduplicated against Firestore onSnapshot)
  useEffect(() => {
    if (
      !isAuthenticated ||
      appMode !== 'firebase' ||
      (roleCategory !== 'hospital_staff' && roleCategory !== 'supervisor')
    ) {
      return;
    }
    let active = true;
    let unsubscribe: (() => void) | null = null;

    void subscribeForegroundFcmMessages((payload) => {
      if (!active) return;
      if (seenAlertIdsRef.current.has(payload.alertId)) {
        return;
      }
      if (
        payload.facilityId &&
        !canAccessFacility(allowedFacilityIdsRef.current, payload.facilityId)
      ) {
        return;
      }
      seenAlertIdsRef.current.add(payload.alertId);
      const placeholder: EmergencyAlert = {
        id: payload.alertId,
        motherId: payload.alertId,
        motherName: 'Incoming Maternal Alert',
        gestationalAgeLabel: '—',
        block: '',
        sourceRole: 'mother',
        reportedByUserId: '—',
        reportedByName: 'JanmaSaathi Alert',
        assignedHealthWorkerId: '',
        assignedHealthWorkerName: '—',
        assignedHealthWorkerPhone: '—',
        reportingSource: 'JanmaSaathi Real-Time Alert',
        elapsedMinutes: 0,
        isDemo: false,
        facilityId: payload.facilityId || currentFacility.id,
        facilityName: currentFacility.name,
        alertCategory: 'Obstetric Emergency',
        triggerTitle: 'New maternal health alert requires attention.',
        symptomDescription: 'Open the Emergency Alert Centre to view full details.',
        symptoms: [],
        vitalsSnapshot: { bp: '—', pulse: 0 },
        severity: payload.priority,
        priorityBasis: 'Health Worker Assessment',
        timestamp: nowFormatted(),
        submittedAtIso: new Date().toISOString(),
        status: 'NEW',
        duplicateSubmissionCount: 0,
        duplicateSubmissions: [],
        hospitalResponse: {},
        returnCommunication: {
          recipients: { mother: false, healthWorker: false, supervisor: false },
        },
        responseHistory: [],
      };
      notifyNewAlertArrival(placeholder, false);
    }).then((unsub) => {
      if (!active) {
        unsub();
      } else {
        unsubscribe = unsub;
      }
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [
    isAuthenticated,
    appMode,
    roleCategory,
    currentFacility.id,
    currentFacility.name,
    notifyNewAlertArrival,
  ]);

  const runConnectionCheck = useCallback(async () => {
    const [firestoreResult, storageResult] = await Promise.all([
      testFirestoreConnection(),
      testStorageConnection(),
    ]);
    setConnectionCheck(firestoreResult);
    setStorageCheck(storageResult);
  }, []);

  // Only probe live Firebase endpoints when Firebase Integration Mode is active
  // so DEMO MODE remains 100% independent of live Firebase connectivity.
  useEffect(() => {
    if (appMode === 'firebase') {
      void runConnectionCheck();
    }
  }, [appMode, runConnectionCheck]);

  // Listen to existing Firebase Auth state (only used when in Firebase Integration Mode)
  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        hasHydratedAlertsRef.current = false;
        seenAlertIdsRef.current = new Set();
        setReadNotifIds(new Set());
        setFirebaseProfileResolved(false);
        setFirebaseFacilityField('facilityId');
        setFirebaseProfileUser(buildDefaultUser(null, ''));
        setFirebaseAllowedFacilities([]);
        setLiveCollectionStatuses(createInitialStatuses('idle'));
        setRawMothers([]);
        setRawHealthWorkers([]);
        setLiveSupervisors([]);
        setRawAssignments([]);
        setLiveAssessments([]);
        setHealthUpdateVitals([]);
        setHealthUpdateSymptoms([]);
        setHealthUpdateAlerts([]);
        setEmergencyAlertsLive([]);
        setDedicatedAlerts([]);
        setLiveReferrals([]);
        setLiveAppointments([]);
        setReportDocs([]);
        setLiveAuditLogs([]);
        setAuthReady(true);
        return;
      }

      // Restore live Firebase Integration Mode automatically when a real Firebase Auth session exists
      // and the user has not explicitly entered isolated Demo Mode.
      if (!demoAuthenticatedRef.current) {
        setAppModeState('firebase');
      }

      // Hold live Firestore subscriptions until claims + users/{uid} resolution completes
      setFirebaseProfileResolved(false);
      hasHydratedAlertsRef.current = false;
      seenAlertIdsRef.current = new Set();

      const fallbackUser = buildDefaultUser(user, '');
      setFirebaseProfileUser(fallbackUser);

      // Step 1: Inspect verified Firebase Auth custom claims (never trust unsigned client hints)
      let claimRole = '';
      let claimFacilityId = '';
      let claimFacilityField: 'facilityId' | 'hospitalId' | 'facilityCode' = 'facilityId';
      let claimAllowedFacilities: string[] = [];
      let claimStaffId = '';
      try {
        const tokenResult = await user.getIdTokenResult();
        const claims = (tokenResult?.claims ?? {}) as Record<string, unknown>;
        if (typeof claims.role === 'string' && claims.role.trim()) {
          claimRole = claims.role.trim();
        } else if (typeof claims.userRole === 'string' && claims.userRole.trim()) {
          claimRole = claims.userRole.trim();
        }
        if (typeof claims.facilityId === 'string' && claims.facilityId.trim()) {
          claimFacilityId = claims.facilityId.trim();
          claimFacilityField = 'facilityId';
        } else if (typeof claims.hospitalId === 'string' && claims.hospitalId.trim()) {
          claimFacilityId = claims.hospitalId.trim();
          claimFacilityField = 'hospitalId';
        } else if (typeof claims.facilityCode === 'string' && claims.facilityCode.trim()) {
          claimFacilityId = claims.facilityCode.trim();
          claimFacilityField = 'facilityCode';
        } else if (typeof claims.hospitalCode === 'string' && claims.hospitalCode.trim()) {
          claimFacilityId = claims.hospitalCode.trim();
          claimFacilityField = 'facilityCode';
        } else if (typeof claims.assignedFacilityId === 'string' && claims.assignedFacilityId.trim()) {
          claimFacilityId = claims.assignedFacilityId.trim();
          claimFacilityField = 'facilityId';
        }
        const rawClaimList = Array.isArray(claims.allowedFacilityIds)
          ? claims.allowedFacilityIds
          : Array.isArray(claims.facilityIds)
          ? claims.facilityIds
          : Array.isArray(claims.hospitalIds)
          ? claims.hospitalIds
          : Array.isArray(claims.facilityCodes)
          ? claims.facilityCodes
          : [];
        claimAllowedFacilities = rawClaimList
          .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
          .map((x) => x.trim());
        if (typeof claims.staffId === 'string' && claims.staffId.trim()) {
          claimStaffId = claims.staffId.trim();
        }
      } catch {
        // Proceed to users/{uid} resolution; fail-closed if neither provides verified role/facility
      }

      // Step 2: Resolve authoritative hospital profile & facility scope from users/{uid}
      if (db) {
        try {
          const userSnap = await getDoc(doc(db, 'users', user.uid));
          if (userSnap.exists()) {
            const raw = userSnap.data() as Record<string, unknown>;
            const strVal = (keys: string[], fb: string) => {
              for (const k of keys) {
                if (typeof raw[k] === 'string' && String(raw[k]).trim()) return String(raw[k]).trim();
              }
              return fb;
            };
            const hasExplicitFacilityId =
              typeof raw.facilityId === 'string' && raw.facilityId.trim().length > 0;
            const hasExplicitHospitalId =
              typeof raw.hospitalId === 'string' && raw.hospitalId.trim().length > 0;
            const hasExplicitFacilityCode =
              typeof raw.facilityCode === 'string' && raw.facilityCode.trim().length > 0;
            const resolvedField: 'facilityId' | 'hospitalId' | 'facilityCode' = hasExplicitFacilityId
              ? 'facilityId'
              : hasExplicitHospitalId
              ? 'hospitalId'
              : hasExplicitFacilityCode
              ? 'facilityCode'
              : claimFacilityField;
            setFirebaseFacilityField(resolvedField);

            const resolvedFacilityId = strVal(
              ['facilityId', 'hospitalId', 'facilityCode', 'hospitalCode', 'assignedFacilityId', 'facility'],
              claimFacilityId
            );
            const rawAllowed = Array.isArray(raw.allowedFacilityIds)
              ? raw.allowedFacilityIds
              : Array.isArray(raw.facilityIds)
              ? raw.facilityIds
              : Array.isArray(raw.hospitalIds)
              ? raw.hospitalIds
              : Array.isArray(raw.facilityCodes)
              ? raw.facilityCodes
              : [];
            const parsedAllowed = rawAllowed
              .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
              .map((x) => x.trim());
            const mergedAllowed = Array.from(
              new Set([
                ...(resolvedFacilityId ? [resolvedFacilityId] : []),
                ...parsedAllowed,
                ...claimAllowedFacilities,
              ])
            );
            setFirebaseAllowedFacilities(mergedAllowed);
            setFirebaseProfileUser({
              id: user.uid,
              uid: user.uid,
              name: strVal(['name', 'fullName', 'displayName'], fallbackUser.name),
              designation: strVal(['designation', 'title'], fallbackUser.designation),
              department: strVal(['department'], fallbackUser.department),
              role: strVal(['role', 'userRole'], claimRole || fallbackUser.role),
              staffId: strVal(['staffId', 'employeeId', 'workerId'], claimStaffId || fallbackUser.staffId),
              email: user.email ?? strVal(['email'], ''),
              facilityId: resolvedFacilityId,
              shift: strVal(['shift'], 'Live Session'),
            });
            setFacilityId(resolvedFacilityId);
            setLiveCollectionStatuses((prev) => ({
              ...prev,
              users: {
                status: 'ready',
                count: 1,
                path: `users/${user.uid}`,
                lastSyncedAt: new Date().toISOString(),
              },
            }));
          } else {
            // No users/{uid} document — fall back strictly to verified Firebase Auth custom claims (if any)
            setFirebaseFacilityField(claimFacilityField);
            const mergedClaimFacilities = Array.from(
              new Set([...(claimFacilityId ? [claimFacilityId] : []), ...claimAllowedFacilities])
            );
            setFirebaseAllowedFacilities(mergedClaimFacilities);
            setFacilityId(claimFacilityId);
            if (claimRole || claimFacilityId) {
              setFirebaseProfileUser({
                ...fallbackUser,
                role: claimRole || fallbackUser.role,
                staffId: claimStaffId || fallbackUser.staffId,
                facilityId: claimFacilityId,
              });
            }
            setLiveCollectionStatuses((prev) => ({
              ...prev,
              users: {
                status: 'ready',
                count: 0,
                path: `users/${user.uid}`,
                lastSyncedAt: new Date().toISOString(),
              },
            }));
          }
        } catch (err) {
          const code = extractFirestoreErrorCode(err);
          setFirebaseFacilityField(claimFacilityField);
          const mergedClaimFacilities = Array.from(
            new Set([...(claimFacilityId ? [claimFacilityId] : []), ...claimAllowedFacilities])
          );
          setFirebaseAllowedFacilities(mergedClaimFacilities);
          setFacilityId(claimFacilityId);
          if (claimRole || claimFacilityId) {
            setFirebaseProfileUser({
              ...fallbackUser,
              role: claimRole || fallbackUser.role,
              staffId: claimStaffId || fallbackUser.staffId,
              facilityId: claimFacilityId,
            });
          }
          setLiveCollectionStatuses((prev) => ({
            ...prev,
            users: {
              status: code === 'permission-denied' ? 'permission-denied' : 'error',
              count: 0,
              errorCode: code,
              errorMessage: err instanceof Error ? err.message : String(err),
              path: `users/${user.uid}`,
            },
          }));
        }
      }
      setFirebaseProfileResolved(true);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const setCollectionReady = useCallback((key: CollectionKey, count: number) => {
    setLiveCollectionStatuses((prev) => ({
      ...prev,
      [key]: {
        status: 'ready',
        count,
        path: key,
        lastSyncedAt: new Date().toISOString(),
      },
    }));
  }, []);

  const setCollectionError = useCallback((key: CollectionKey, err: unknown) => {
    const code = extractFirestoreErrorCode(err);
    const info = buildFirestoreErrorInfo(err, OperationType.LIST, key);
    if (import.meta.env.DEV) {
      console.error('Firestore Error:', info.code, info.path);
    }
    setLiveCollectionStatuses((prev) => ({
      ...prev,
      [key]: {
        status: code === 'permission-denied' ? 'permission-denied' : 'error',
        count: 0,
        errorCode: code,
        errorMessage: err instanceof Error ? err.message : String(err),
        path: key,
      },
    }));
  }, []);

  // =========================================================================
  // REAL-TIME ALERT STREAM (Authenticated SSE + Automatic Polling Fallback)
  // =========================================================================
  const getAuthBearerToken = useCallback(async (): Promise<string | null> => {
    if (appMode === 'demo') {
      if (demoSessionTokenRef.current) return demoSessionTokenRef.current;
      const personaId = activeDemoPersonaId ?? 'hospital-demo';
      try {
        const resp = await fetch('/api/demo/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personaId,
            facilityId,
          }),
        });
        if (!resp.ok) return null;
        const json = (await resp.json()) as { token?: string };
        if (json.token) {
          demoSessionTokenRef.current = json.token;
          return json.token;
        }
      } catch {
        return null;
      }
      return null;
    }
    if (!auth?.currentUser) return null;
    try {
      return await auth.currentUser.getIdToken();
    } catch {
      return null;
    }
  }, [appMode, activeDemoPersonaId, facilityId]);

  // Reset demo token whenever demo persona or facility changes so server-side RBAC always matches active persona
  useEffect(() => {
    demoSessionTokenRef.current = null;
  }, [appMode, activeDemoPersonaId, demoUser.uid, demoUser.role, facilityId]);

  const pollAlertsOnce = useCallback(async () => {
    if (roleCategory === 'unauthorized') return;
    const token = await getAuthBearerToken();
    if (!token) return;
    try {
      const resp = await fetch('/api/alerts', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-janmasaathi-facility': facilityId,
        },
      });
      if (!resp.ok) return;
      const json = (await resp.json()) as {
        mode: AppMode;
        alerts?: EmergencyAlert[];
        lastSyncedAt?: string;
      };
      if (json.mode === 'demo' && Array.isArray(json.alerts)) {
        if (hasHydratedAlertsRef.current) {
          json.alerts.forEach((incoming) => {
            if (!seenAlertIdsRef.current.has(incoming.id)) {
              seenAlertIdsRef.current.add(incoming.id);
              notifyNewAlertArrival(incoming, false);
            }
            if (incoming.status !== 'NEW') {
              silenceAlertReminder(incoming.id);
            }
          });
        } else {
          const initialIds = json.alerts.map((a) => a.id);
          initialIds.forEach((id) => seenAlertIdsRef.current.add(id));
          markHistoricalAlertsAsSounded(initialIds);
          hasHydratedAlertsRef.current = true;
        }
        setDemoAlerts(json.alerts);
      } else if (json.mode === 'firebase' && Array.isArray(json.alerts)) {
        setEmergencyAlertsLive(json.alerts);
      }
      setAlertSyncState((prev) => ({
        ...prev,
        lastSyncedAt: json.lastSyncedAt || new Date().toISOString(),
        errorMessage: undefined,
      }));
    } catch {
      // Handled gracefully by reconnect/polling state
    }
  }, [getAuthBearerToken, currentUser.role, facilityId, notifyNewAlertArrival]);

  // Establish SSE stream + automatic polling fallback for Demo Mode.
  // In Firebase Integration Mode, real-time Firestore onSnapshot() is the authoritative live channel.
  useEffect(() => {
    if (!isAuthenticated || roleCategory === 'unauthorized') {
      setAlertSyncState({
        channel: 'offline',
        connected: false,
        lastSyncedAt: null,
        pollingIntervalMs: null,
      });
      hasHydratedAlertsRef.current = false;
      seenAlertIdsRef.current = new Set();
      return;
    }

    if (appMode === 'firebase') {
      return;
    }

    let cancelled = false;
    let eventSource: EventSource | null = null;
    let pollTimer: number | null = null;
    let reconnectTimer: number | null = null;

    const startPollingFallback = (reason: string) => {
      if (cancelled) return;
      setAlertSyncState((prev) => ({
        ...prev,
        channel: 'polling-fallback',
        connected: true,
        pollingIntervalMs: 5000,
        errorMessage: reason,
      }));
      void pollAlertsOnce();
      if (pollTimer === null) {
        pollTimer = window.setInterval(() => {
          void pollAlertsOnce();
        }, 5000);
      }
    };

    const stopPollingFallback = () => {
      if (pollTimer !== null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const connectSse = async () => {
      if (cancelled) return;
      const token = await getAuthBearerToken();
      if (!token || cancelled) {
        startPollingFallback('Session token pending; using polling fallback.');
        return;
      }

      try {
        const ticketResp = await fetch('/api/alerts/stream-token', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'x-janmasaathi-facility': facilityId,
          },
        });
        if (!ticketResp.ok || cancelled) {
          startPollingFallback('SSE stream ticket unavailable; polling every 5s.');
          return;
        }
        const { ticket } = (await ticketResp.json()) as { ticket?: string };
        if (!ticket || cancelled) {
          startPollingFallback('SSE ticket missing; polling every 5s.');
          return;
        }

        eventSource = new EventSource(`/api/alerts/stream?ticket=${encodeURIComponent(ticket)}`);

        eventSource.addEventListener('sync', (ev) => {
          if (cancelled) return;
          stopPollingFallback();
          try {
            const payload = JSON.parse((ev as MessageEvent).data) as {
              mode: AppMode;
              alerts?: EmergencyAlert[];
              lastSyncedAt?: string;
            };
            if (payload.mode === 'demo' && Array.isArray(payload.alerts)) {
              const initialIds = payload.alerts.map((a) => a.id);
              initialIds.forEach((id) => seenAlertIdsRef.current.add(id));
              markHistoricalAlertsAsSounded(initialIds);
              hasHydratedAlertsRef.current = true;
              setDemoAlerts(payload.alerts);
            }
            setAlertSyncState({
              channel: 'sse',
              connected: true,
              lastSyncedAt: payload.lastSyncedAt || new Date().toISOString(),
              pollingIntervalMs: null,
            });
          } catch {
            // Ignore malformed sync payload
          }
        });

        eventSource.addEventListener('heartbeat', (ev) => {
          if (cancelled) return;
          try {
            const payload = JSON.parse((ev as MessageEvent).data) as { lastSyncedAt?: string };
            setAlertSyncState((prev) => ({
              ...prev,
              channel: 'sse',
              connected: true,
              lastSyncedAt: payload.lastSyncedAt || new Date().toISOString(),
              pollingIntervalMs: null,
              errorMessage: undefined,
            }));
          } catch {
            // Ignore
          }
        });

        eventSource.addEventListener('alert:created', (ev) => {
          if (cancelled) return;
          try {
            const payload = JSON.parse((ev as MessageEvent).data) as {
              alert: EmergencyAlert;
              lastSyncedAt?: string;
            };
            if (!payload.alert) return;
            const isBrandNew = !seenAlertIdsRef.current.has(payload.alert.id);
            seenAlertIdsRef.current.add(payload.alert.id);
            if (appMode === 'demo') {
              setDemoAlerts((prev) => {
                if (prev.some((a) => a.id === payload.alert.id)) {
                  return prev.map((a) => (a.id === payload.alert.id ? payload.alert : a));
                }
                return [payload.alert, ...prev];
              });
            }
            if (isBrandNew) {
              notifyNewAlertArrival(payload.alert, false);
            }
            setAlertSyncState((prev) => ({
              ...prev,
              lastSyncedAt: payload.lastSyncedAt || new Date().toISOString(),
            }));
          } catch {
            // Ignore
          }
        });

        eventSource.addEventListener('alert:duplicate_recorded', (ev) => {
          if (cancelled) return;
          try {
            const payload = JSON.parse((ev as MessageEvent).data) as {
              alert: EmergencyAlert;
              lastSyncedAt?: string;
            };
            if (!payload.alert) return;
            if (appMode === 'demo') {
              setDemoAlerts((prev) =>
                prev.map((a) => (a.id === payload.alert.id ? payload.alert : a))
              );
            }
            notifyNewAlertArrival(payload.alert, true);
            setAlertSyncState((prev) => ({
              ...prev,
              lastSyncedAt: payload.lastSyncedAt || new Date().toISOString(),
            }));
          } catch {
            // Ignore
          }
        });

        eventSource.addEventListener('alert:updated', (ev) => {
          if (cancelled) return;
          try {
            const payload = JSON.parse((ev as MessageEvent).data) as {
              alert: EmergencyAlert;
              lastSyncedAt?: string;
            };
            if (!payload.alert) return;
            if (appMode === 'demo') {
              setDemoAlerts((prev) =>
                prev.map((a) => (a.id === payload.alert.id ? payload.alert : a))
              );
            }
            if (payload.alert.status !== 'NEW') {
              silenceAlertReminder(payload.alert.id);
            }
            setAlertSyncState((prev) => ({
              ...prev,
              lastSyncedAt: payload.lastSyncedAt || new Date().toISOString(),
            }));
          } catch {
            // Ignore
          }
        });

        eventSource.addEventListener('alerts:reset', (ev) => {
          if (cancelled) return;
          try {
            const payload = JSON.parse((ev as MessageEvent).data) as {
              alerts: EmergencyAlert[];
              lastSyncedAt?: string;
            };
            if (Array.isArray(payload.alerts) && appMode === 'demo') {
              const resetIds = payload.alerts.map((a) => a.id);
              seenAlertIdsRef.current = new Set(resetIds);
              resetSoundedAlertHistory();
              markHistoricalAlertsAsSounded(resetIds);
              setActiveReminderAlertIds([]);
              setDemoAlerts(payload.alerts);
              setAlertSyncState((prev) => ({
                ...prev,
                lastSyncedAt: payload.lastSyncedAt || new Date().toISOString(),
              }));
            }
          } catch {
            // Ignore
          }
        });

        eventSource.onerror = () => {
          if (cancelled) return;
          eventSource?.close();
          eventSource = null;
          startPollingFallback('Real-time SSE interrupted — polling fallback active (every 5s).');
          if (reconnectTimer === null) {
            reconnectTimer = window.setTimeout(() => {
              reconnectTimer = null;
              if (!cancelled) {
                setAlertSyncState((prev) => ({ ...prev, channel: 'reconnecting' }));
                void connectSse();
              }
            }, 12000);
          }
        };
      } catch {
        startPollingFallback('Unable to open SSE stream — polling fallback active.');
      }
    };

    void connectSse();

    return () => {
      cancelled = true;
      eventSource?.close();
      stopPollingFallback();
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
    };
  }, [
    isAuthenticated,
    appMode,
    currentUser.uid,
    currentUser.role,
    facilityId,
    getAuthBearerToken,
    pollAlertsOnce,
    notifyNewAlertArrival,
  ]);

  // =========================================================================
  // LIVE FIRESTORE SUBSCRIPTIONS (ONLY ACTIVE IN FIREBASE INTEGRATION MODE)
  // Strictly Hospital Staff & Supervisor roles only (fail-closed for other roles).
  // Uses canonical emergencyAlerts exclusively (never subscribes to legacy `alerts`)
  // and enforces facility-level query constraints compatible with strict firestore.rules.
  // =========================================================================
  useEffect(() => {
    if (
      appMode !== 'firebase' ||
      !authReady ||
      !firebaseProfileResolved ||
      !firebaseUser ||
      !db
    ) {
      return;
    }
    if (roleCategory !== 'hospital_staff' && roleCategory !== 'supervisor') {
      // Fail-closed: open zero clinical Firestore listeners for unauthorized or non-hospital roles
      return;
    }

    const canReadAuditLogs = canPerformMutation(currentUser.role, 'view_audit_logs');
    const scopedFacilities = allowedFacilityIds.filter((id) => id && id !== '*').slice(0, 10);

    const activeCollections: CollectionKey[] = [
      'mothers',
      'healthWorkers',
      'supervisors',
      'assignments',
      'assessments',
      'healthUpdates',
      'referrals',
      'appointments',
      'reports',
      'emergencyAlerts',
      ...(canReadAuditLogs ? (['auditLogs'] as CollectionKey[]) : []),
    ];

    setLiveCollectionStatuses((prev) => {
      const next = { ...prev };
      activeCollections.forEach((k) => {
        next[k] = { ...next[k], status: 'loading', path: k };
      });
      // Legacy `alerts` collection is intentionally deprecated in favor of canonical `emergencyAlerts`
      next.alerts = {
        status: 'idle',
        count: 0,
        path: 'alerts (deprecated — canonical: emergencyAlerts)',
      };
      return next;
    });

    const unsubscribers: (() => void)[] = [];
    let effectDisposed = false;

    const buildFacilityScopedQuery = (
      colName: string,
      field: 'facilityId' | 'hospitalId' | 'facilityCode',
      maxDocs: number
    ) => {
      if (scopedFacilities.length === 1) {
        return query(collection(db, colName), where(field, '==', scopedFacilities[0]), limit(maxDocs));
      }
      if (scopedFacilities.length > 1) {
        return query(collection(db, colName), where(field, 'in', scopedFacilities), limit(maxDocs));
      }
      return query(collection(db, colName), limit(maxDocs));
    };

    /**
     * Subscribes to a clinical collection across facilityId / hospitalId (and facilityCode if configured),
     * merging deduplicated records by document ID. For non-audit legacy collections, also falls back
     * silently to an unscoped read only if all scoped queries return 0 records and rules permit it.
     */
    const subscribeWithFacilityFallback = (
      colKey: CollectionKey,
      maxDocs: number,
      onSnap: (snap: { docs: { id: string; data: () => Record<string, unknown> }[]; size: number }) => void,
      onCleared: () => void,
      strictFacilityOnly = false
    ) => {
      const localUnsubs: (() => void)[] = [];
      const docsByField = new Map<string, Map<string, Record<string, unknown>>>();
      const succeededFields = new Set<string>();
      const failedErrors = new Map<string, unknown>();
      let unscopedFallbackStarted = false;

      const emitMerged = () => {
        if (effectDisposed) return;
        const merged = new Map<string, Record<string, unknown>>();
        docsByField.forEach((fieldMap) => {
          fieldMap.forEach((docData, docId) => {
            merged.set(docId, docData);
          });
        });
        const docs = Array.from(merged.entries()).map(([id, dataObj]) => ({
          id,
          data: () => dataObj,
        }));
        onSnap({ size: docs.length, docs });
      };

      if (scopedFacilities.length === 0) {
        if (strictFacilityOnly) {
          onCleared();
          return;
        }
        const unsub = onSnapshot(
          query(collection(db, colKey), limit(maxDocs)),
          (snap) => {
            if (effectDisposed) return;
            const fieldMap = new Map<string, Record<string, unknown>>();
            snap.docs.forEach((d) => fieldMap.set(d.id, d.data() as Record<string, unknown>));
            docsByField.set('unscoped', fieldMap);
            emitMerged();
          },
          (err) => {
            if (effectDisposed) return;
            onCleared();
            setCollectionError(colKey, err);
          }
        );
        unsubscribers.push(unsub);
        return;
      }

      const fieldsToWatch: ('facilityId' | 'hospitalId' | 'facilityCode')[] = Array.from(
        new Set<'facilityId' | 'hospitalId' | 'facilityCode'>([
          firebaseFacilityField,
          'facilityId',
          'hospitalId',
        ])
      );

      const startUnscopedLegacyFallback = () => {
        if (effectDisposed || strictFacilityOnly || unscopedFallbackStarted) return;
        unscopedFallbackStarted = true;
        const unsub = onSnapshot(
          query(collection(db, colKey), limit(maxDocs)),
          (snap) => {
            if (effectDisposed) return;
            const fieldMap = new Map<string, Record<string, unknown>>();
            snap.docs.forEach((d) => fieldMap.set(d.id, d.data() as Record<string, unknown>));
            docsByField.set('unscoped', fieldMap);
            succeededFields.add('unscoped');
            emitMerged();
          },
          () => {
            // Strict security rules block unscoped queries; keep existing scoped results intact
          }
        );
        localUnsubs.push(unsub);
      };

      fieldsToWatch.forEach((field) => {
        const unsub = onSnapshot(
          buildFacilityScopedQuery(colKey, field, maxDocs),
          (snap) => {
            if (effectDisposed) return;
            const fieldMap = new Map<string, Record<string, unknown>>();
            snap.docs.forEach((d) => fieldMap.set(d.id, d.data() as Record<string, unknown>));
            docsByField.set(field, fieldMap);
            succeededFields.add(field);
            failedErrors.delete(field);
            emitMerged();

            // If all active scoped queries completed with 0 docs, check legacy unscoped docs once
            if (
              !strictFacilityOnly &&
              succeededFields.size >= fieldsToWatch.length &&
              Array.from(docsByField.values()).every((m) => m.size === 0)
            ) {
              startUnscopedLegacyFallback();
            }
          },
          (err) => {
            if (effectDisposed) return;
            failedErrors.set(field, err);
            if (succeededFields.size === 0 && failedErrors.size >= fieldsToWatch.length) {
              if (!strictFacilityOnly) {
                startUnscopedLegacyFallback();
              } else {
                onCleared();
                setCollectionError(colKey, err);
              }
            }
          }
        );
        localUnsubs.push(unsub);
      });

      unsubscribers.push(() => localUnsubs.forEach((u) => u()));
    };

    // 1. Mothers
    subscribeWithFacilityFallback(
      'mothers',
      200,
      (snap) => {
        setRawMothers(snap.docs.map((d) => ({ id: d.id, data: d.data() })));
        setCollectionReady('mothers', snap.size);
      },
      () => setRawMothers([])
    );

    // 2. Health Workers
    subscribeWithFacilityFallback(
      'healthWorkers',
      100,
      (snap) => {
        setRawHealthWorkers(snap.docs.map((d) => adaptHealthWorker(d.id, d.data())));
        setCollectionReady('healthWorkers', snap.size);
      },
      () => setRawHealthWorkers([])
    );

    // 3. Supervisors
    subscribeWithFacilityFallback(
      'supervisors',
      50,
      (snap) => {
        setLiveSupervisors(snap.docs.map((d) => adaptSupervisor(d.id, d.data())));
        setCollectionReady('supervisors', snap.size);
      },
      () => setLiveSupervisors([])
    );

    // 4. Assignments
    subscribeWithFacilityFallback(
      'assignments',
      300,
      (snap) => {
        const list = snap.docs
          .map((d) => {
            const raw = d.data();
            const motherId = String(raw.motherId ?? raw.patientId ?? '');
            const healthWorkerId = String(
              raw.healthWorkerId ?? raw.workerId ?? raw.ashaId ?? raw.anmId ?? ''
            );
            const active = raw.active !== false && raw.status !== 'inactive';
            return active && motherId && healthWorkerId ? { motherId, healthWorkerId } : null;
          })
          .filter((x): x is { motherId: string; healthWorkerId: string } => x !== null);
        setRawAssignments(list);
        setCollectionReady('assignments', snap.size);
      },
      () => setRawAssignments([])
    );

    // 5. Assessments
    subscribeWithFacilityFallback(
      'assessments',
      250,
      (snap) => {
        const adapted = snap.docs
          .map((d) => adaptAssessment(d.id, d.data()))
          .sort((a, b) => b.date.localeCompare(a.date));
        setLiveAssessments(adapted);
        setCollectionReady('assessments', snap.size);
      },
      () => setLiveAssessments([])
    );

    // 6. Referrals
    subscribeWithFacilityFallback(
      'referrals',
      200,
      (snap) => {
        const adapted = snap.docs
          .map((d) => adaptReferral(d.id, d.data()))
          .sort((a, b) => b.referralDate.localeCompare(a.referralDate));
        setLiveReferrals(adapted);
        setCollectionReady('referrals', snap.size);
      },
      () => setLiveReferrals([])
    );

    // 7. Appointments
    subscribeWithFacilityFallback(
      'appointments',
      200,
      (snap) => {
        const adapted = snap.docs
          .map((d) => adaptAppointment(d.id, d.data()))
          .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
        setLiveAppointments(adapted);
        setCollectionReady('appointments', snap.size);
      },
      () => setLiveAppointments([])
    );

    // 8. Reports
    subscribeWithFacilityFallback(
      'reports',
      150,
      (snap) => {
        setReportDocs(snap.docs.map((d) => adaptReportDocument(d.id, d.data())));
        setCollectionReady('reports', snap.size);
      },
      () => setReportDocs([])
    );

    // 9. Health Updates (vitals & symptom timeline; never duplicates canonical emergencyAlerts)
    subscribeWithFacilityFallback(
      'healthUpdates',
      250,
      (snap) => {
        const vitalsList: { motherId: string; vital: VitalRecord }[] = [];
        const symptomsList: { motherId: string; symptom: SymptomLog }[] = [];

        snap.docs.forEach((d) => {
          const parsed = adaptHealthUpdate(d.id, d.data());
          if (parsed.vital && parsed.motherId) {
            vitalsList.push({ motherId: parsed.motherId, vital: parsed.vital });
          }
          if (parsed.symptom && parsed.motherId) {
            symptomsList.push({ motherId: parsed.motherId, symptom: parsed.symptom });
          }
        });

        setHealthUpdateVitals(vitalsList);
        setHealthUpdateSymptoms(symptomsList);
        setHealthUpdateAlerts([]);
        setCollectionReady('healthUpdates', snap.size);
      },
      () => {
        setHealthUpdateVitals([]);
        setHealthUpdateSymptoms([]);
        setHealthUpdateAlerts([]);
      }
    );

    // 10. Canonical Emergency Alerts collection ONLY
    // Facility-filtered real-time onSnapshot() listener supporting facilityId, hospitalId,
    // and facilityCode routing keys while deduplicating strictly by canonical alert document ID.
    setDedicatedAlerts([]);
    if (scopedFacilities.length === 0) {
      setEmergencyAlertsLive([]);
      setLiveCollectionStatuses((prev) => ({
        ...prev,
        emergencyAlerts: {
          status: 'permission-denied',
          count: 0,
          errorCode: 'permission-denied',
          errorMessage:
            'Hospital facility authorization missing: no verified facilityId, hospitalId, or facilityCode found in Firebase Auth claims or users/{uid}.',
          path: 'emergencyAlerts',
        },
      }));
      setAlertSyncState({
        channel: 'offline',
        connected: false,
        lastSyncedAt: null,
        pollingIntervalMs: null,
        errorMessage:
          'Hospital facility authorization missing (no verified facilityId/hospitalId/facilityCode in claims or users/{uid}).',
      });
    } else {
      const buildFieldFacilityQuery = (field: 'facilityId' | 'hospitalId' | 'facilityCode') =>
        scopedFacilities.length === 1
          ? query(collection(db, 'emergencyAlerts'), where(field, '==', scopedFacilities[0]), limit(100))
          : query(collection(db, 'emergencyAlerts'), where(field, 'in', scopedFacilities), limit(100));

      const alertFieldsToWatch: ('facilityId' | 'hospitalId' | 'facilityCode')[] = Array.from(
        new Set<'facilityId' | 'hospitalId' | 'facilityCode'>([
          firebaseFacilityField,
          'facilityId',
          'hospitalId',
        ])
      );
      const alertUnsubs: (() => void)[] = [];
      const alertsByField = new Map<string, Map<string, EmergencyAlert>>();
      const succeededAlertFields = new Set<string>();
      const alertFieldErrors = new Map<string, unknown>();
      let startedFacilityCodeFallback = alertFieldsToWatch.includes('facilityCode');

      const emitMergedAlerts = () => {
        if (effectDisposed) return;
        const byId = new Map<string, EmergencyAlert>();
        alertsByField.forEach((fieldMap) => {
          fieldMap.forEach((al, id) => {
            byId.set(id, al);
          });
        });

        const adapted = Array.from(byId.values()).sort((a, b) =>
          b.submittedAtIso.localeCompare(a.submittedAtIso)
        );

        if (hasHydratedAlertsRef.current) {
          adapted.forEach((al) => {
            if (!seenAlertIdsRef.current.has(al.id)) {
              seenAlertIdsRef.current.add(al.id);
              notifyNewAlertArrival(al, false);
            }
            if (al.status !== 'NEW') {
              silenceAlertReminder(al.id);
            }
          });
        } else {
          const initialIds = adapted.map((a) => a.id);
          initialIds.forEach((id) => seenAlertIdsRef.current.add(id));
          markHistoricalAlertsAsSounded(initialIds);
          hasHydratedAlertsRef.current = true;
        }

        setEmergencyAlertsLive(adapted);
        setCollectionReady('emergencyAlerts', adapted.length);
        setAlertSyncState({
          channel: 'firestore-realtime',
          connected: true,
          lastSyncedAt: new Date().toISOString(),
          pollingIntervalMs: null,
        });
      };

      const subscribeAlertField = (
        field: 'facilityId' | 'hospitalId' | 'facilityCode',
        optionalProbe = false
      ) => {
        if (effectDisposed) return;
        const unsub = onSnapshot(
          buildFieldFacilityQuery(field),
          (snap) => {
            if (effectDisposed) return;
            const fieldMap = new Map<string, EmergencyAlert>();
            snap.docs.forEach((d) => {
              fieldMap.set(
                d.id,
                adaptEmergencyAlert(d.id, d.data() as Record<string, unknown>, 'emergencyAlerts')
              );
            });
            alertsByField.set(field, fieldMap);
            succeededAlertFields.add(field);
            alertFieldErrors.delete(field);
            emitMergedAlerts();

            // If primary facilityId + hospitalId queries both succeeded with 0 docs, silently try facilityCode
            if (
              !startedFacilityCodeFallback &&
              succeededAlertFields.size >= alertFieldsToWatch.length &&
              Array.from(alertsByField.values()).every((m) => m.size === 0)
            ) {
              startedFacilityCodeFallback = true;
              subscribeAlertField('facilityCode', true);
            }
          },
          (err) => {
            if (effectDisposed) return;
            if (optionalProbe) {
              return;
            }
            alertFieldErrors.set(field, err);
            if (succeededAlertFields.size === 0 && alertFieldErrors.size >= alertFieldsToWatch.length) {
              const code = extractFirestoreErrorCode(err);
              setEmergencyAlertsLive([]);
              setCollectionError('emergencyAlerts', err);
              setAlertSyncState((prev) => ({
                ...prev,
                channel: 'offline',
                connected: false,
                errorMessage:
                  code === 'permission-denied'
                    ? 'Real-time alert listener denied by Firestore security rules on "emergencyAlerts" for this hospital facility.'
                    : err instanceof Error
                    ? `Real-time alert listener error: ${err.message}`
                    : 'Real-time alert listener disconnected.',
              }));
            }
          }
        );
        alertUnsubs.push(unsub);
      };

      alertFieldsToWatch.forEach((field) => subscribeAlertField(field, false));
      unsubscribers.push(() => {
        alertUnsubs.forEach((u) => u());
      });
    }

    // 11. Audit Logs (facility-scoped, Hospital/Supervisor roles permitted to view audit trails)
    if (canReadAuditLogs) {
      subscribeWithFacilityFallback(
        'auditLogs',
        150,
        (snap) => {
          const adapted = snap.docs
            .map((d) => adaptAuditLog(d.id, d.data()))
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
          setLiveAuditLogs(adapted);
          setCollectionReady('auditLogs', snap.size);
        },
        () => setLiveAuditLogs([]),
        true
      );
    }

    return () => {
      effectDisposed = true;
      unsubscribers.forEach((u) => u());
    };
  }, [
    appMode,
    authReady,
    firebaseProfileResolved,
    firebaseUser,
    roleCategory,
    currentUser.role,
    currentUser.staffId,
    allowedFacilityIds,
    firebaseFacilityField,
    subscriptionEpoch,
    setCollectionReady,
    setCollectionError,
    notifyNewAlertArrival,
    silenceAlertReminder,
  ]);

  // Canonical live emergency alerts directly from `emergencyAlerts` (exact PWA document IDs, zero duplicates)
  const rawMergedLiveAlerts = useMemo<EmergencyAlert[]>(() => {
    const byId = new Map<string, EmergencyAlert>();
    emergencyAlertsLive.forEach((a) => byId.set(a.id, a));
    return Array.from(byId.values()).sort((a, b) =>
      b.submittedAtIso.localeCompare(a.submittedAtIso)
    );
  }, [emergencyAlertsLive]);

  const liveMothers = useMemo<MotherRecord[]>(() => {
    const hwById = new Map<string, HealthWorker>();
    rawHealthWorkers.forEach((hw) => hwById.set(hw.id, hw));

    const assignmentByMother = new Map<string, string>();
    rawAssignments.forEach((a) => assignmentByMother.set(a.motherId, a.healthWorkerId));

    const assessmentsByMother = new Map<string, AssessmentRecord[]>();
    liveAssessments.forEach((a) => {
      if (!a.motherId) return;
      const list = assessmentsByMother.get(a.motherId) ?? [];
      list.push(a);
      assessmentsByMother.set(a.motherId, list);
    });

    const vitalsByMother = new Map<string, VitalRecord[]>();
    healthUpdateVitals.forEach(({ motherId, vital }) => {
      const list = vitalsByMother.get(motherId) ?? [];
      list.push(vital);
      vitalsByMother.set(motherId, list);
    });
    liveAssessments.forEach((a) => {
      if (!a.motherId || a.bpReading === '—') return;
      const [s, d] = a.bpReading.split('/').map(Number);
      if (!Number.isNaN(s) && !Number.isNaN(d) && s > 0 && d > 0) {
        const list = vitalsByMother.get(a.motherId) ?? [];
        list.push({
          id: `asm-${a.id}`,
          date: a.date.slice(0, 10),
          systolicBp: s,
          diastolicBp: d,
          pulse: 0,
          hemoglobin: a.hemoglobin,
          weightKg: 0,
          recordedBy: a.assessorName,
          source: 'Hospital OPD',
        });
        vitalsByMother.set(a.motherId, list);
      }
    });
    vitalsByMother.forEach((list, k) => {
      list.sort((a, b) => a.date.localeCompare(b.date));
      vitalsByMother.set(k, list);
    });

    const symptomsByMother = new Map<string, SymptomLog[]>();
    healthUpdateSymptoms.forEach(({ motherId, symptom }) => {
      const list = symptomsByMother.get(motherId) ?? [];
      list.push(symptom);
      symptomsByMother.set(motherId, list);
    });

    const alertsByMother = new Map<string, EmergencyAlert[]>();
    rawMergedLiveAlerts.forEach((al) => {
      if (!al.motherId) return;
      const list = alertsByMother.get(al.motherId) ?? [];
      list.push(al);
      alertsByMother.set(al.motherId, list);
    });

    const referralsByMother = new Map<string, ReferralRecord[]>();
    liveReferrals.forEach((ref) => {
      if (!ref.motherId) return;
      const list = referralsByMother.get(ref.motherId) ?? [];
      list.push(ref);
      referralsByMother.set(ref.motherId, list);
    });

    const docsByMother = new Map<string, ClinicalDocument[]>();
    reportDocs.forEach(({ motherId, doc: cDoc }) => {
      if (!motherId) return;
      const list = docsByMother.get(motherId) ?? [];
      list.push(cDoc);
      docsByMother.set(motherId, list);
    });

    return rawMothers.map(({ id, data }) =>
      adaptMother(id, data, {
        healthWorkersById: hwById,
        assignmentByMotherId: assignmentByMother,
        assessmentsByMotherId: assessmentsByMother,
        vitalsByMotherId: vitalsByMother,
        symptomsByMotherId: symptomsByMother,
        alertsByMotherId: alertsByMother,
        referralsByMotherId: referralsByMother,
        documentsByMotherId: docsByMother,
      })
    );
  }, [
    rawMothers,
    rawHealthWorkers,
    rawAssignments,
    liveAssessments,
    healthUpdateVitals,
    healthUpdateSymptoms,
    rawMergedLiveAlerts,
    liveReferrals,
    reportDocs,
  ]);

  // Resolve Mother display name & gestational age dynamically via motherId reference
  // so alert documents never duplicate full maternal profiles!
  const liveAlerts = useMemo<EmergencyAlert[]>(() => {
    const motherMap = new Map<string, MotherRecord>();
    liveMothers.forEach((m) => motherMap.set(m.id, m));
    return rawMergedLiveAlerts.map((al) => {
      const m = motherMap.get(al.motherId);
      if (!m) return al;
      return {
        ...al,
        motherName: m.fullName,
        gestationalAgeLabel: `${m.gestationalWeeks}w ${m.gestationalDays}d`,
        block: al.block === '—' ? m.block : al.block,
        assignedHealthWorkerId: al.assignedHealthWorkerId || m.assignedHealthWorkerId,
        assignedHealthWorkerName:
          al.assignedHealthWorkerName === 'Unassigned'
            ? m.assignedHealthWorkerName
            : al.assignedHealthWorkerName,
      };
    });
  }, [rawMergedLiveAlerts, liveMothers]);

  const liveHealthWorkers = useMemo<HealthWorker[]>(() => {
    return rawHealthWorkers.map((hw) => {
      const linkedMothers = liveMothers.filter((m) => m.assignedHealthWorkerId === hw.id);
      const linkedAssessments = liveAssessments.filter(
        (a) => a.assessorName === hw.name || linkedMothers.some((m) => m.id === a.motherId)
      );
      const linkedReferrals = liveReferrals.filter(
        (r) =>
          r.sourceContact.includes(hw.name) ||
          linkedMothers.some((m) => m.id === r.motherId)
      );
      const linkedAppointments = liveAppointments.filter(
        (ap) =>
          ap.assignedHealthWorkerName === hw.name ||
          linkedMothers.some((m) => m.id === ap.motherId)
      );
      const pendingFollowUps = linkedAppointments.filter(
        (ap) => ap.status === 'Upcoming' || ap.status === 'Follow-up Due'
      ).length;
      const completedFollowUps = linkedAppointments.filter(
        (ap) => ap.status === 'Completed'
      ).length;
      const computedRate =
        linkedAppointments.length > 0
          ? Math.round((completedFollowUps / linkedAppointments.length) * 100)
          : hw.followUpCompletionRate;
      const linkedAlerts = liveAlerts.filter(
        (al) =>
          al.assignedHealthWorkerId === hw.id ||
          linkedMothers.some((m) => m.id === al.motherId)
      );

      const activities = linkedAssessments.slice(0, 5).map((a) => ({
        id: `hw-act-${a.id}`,
        timestamp: a.date,
        action: a.assessmentType,
        motherId: a.motherId,
        motherName: a.motherName,
        details: a.summary,
      }));

      return {
        ...hw,
        assignedMothersCount: linkedMothers.length || hw.assignedMothersCount,
        recentAssessments30d: linkedAssessments.length || hw.recentAssessments30d,
        referralsSubmitted: linkedReferrals.length || hw.referralsSubmitted,
        pendingFollowUps: pendingFollowUps || hw.pendingFollowUps,
        emergencyAlertsRaised: linkedAlerts.length || hw.emergencyAlertsRaised,
        followUpCompletionRate: computedRate,
        activities,
      };
    });
  }, [rawHealthWorkers, liveMothers, liveAssessments, liveReferrals, liveAppointments, liveAlerts]);

  // Active mode projection — Demo Mode and Firebase Integration Mode stay strictly separated,
  // and all records are role-scoped & facility-scoped to match backend RBAC enforcement.
  const rawModeMothers = appMode === 'demo' ? demoMothers : liveMothers;
  const rawModeHealthWorkers = appMode === 'demo' ? demoHealthWorkers : liveHealthWorkers;
  const rawModeAssessments = appMode === 'demo' ? demoAssessments : liveAssessments;
  const rawModeAlerts = appMode === 'demo' ? demoAlerts : liveAlerts;
  const rawModeReferrals = appMode === 'demo' ? demoReferrals : liveReferrals;
  const rawModeAppointments = appMode === 'demo' ? demoAppointments : liveAppointments;
  const rawModeAuditLogs = appMode === 'demo' ? demoAuditLogs : liveAuditLogs;

  const callerScope = useMemo(
    () => ({
      uid: currentUser.uid,
      role: currentUser.role,
      roleCategory,
      facilityId: currentFacility.id,
      allowedFacilityIds,
      staffId: currentUser.staffId,
      motherId: roleCategory === 'mother' ? currentUser.staffId : undefined,
      healthWorkerId: roleCategory === 'health_worker' ? currentUser.staffId : undefined,
    }),
    [currentUser, roleCategory, currentFacility.id, allowedFacilityIds]
  );

  const mothers = useMemo<MotherRecord[]>(() => {
    if (roleCategory === 'unauthorized') return [];
    if (roleCategory === 'mother') {
      return rawModeMothers.filter(
        (m) => m.id === currentUser.staffId || m.id === currentUser.uid
      );
    }
    if (roleCategory === 'health_worker') {
      return rawModeMothers.filter(
        (m) =>
          m.assignedHealthWorkerId === currentUser.staffId ||
          m.assignedHealthWorkerName === currentUser.name
      );
    }
    return rawModeMothers;
  }, [rawModeMothers, roleCategory, currentUser.staffId, currentUser.uid, currentUser.name]);

  const allowedMotherIds = useMemo(() => new Set(mothers.map((m) => m.id)), [mothers]);

  const healthWorkers = useMemo<HealthWorker[]>(() => {
    if (roleCategory === 'unauthorized' || roleCategory === 'mother') return [];
    if (roleCategory === 'health_worker') {
      return rawModeHealthWorkers.filter(
        (hw) => hw.id === currentUser.staffId || hw.name === currentUser.name
      );
    }
    return rawModeHealthWorkers;
  }, [rawModeHealthWorkers, roleCategory, currentUser.staffId, currentUser.name]);

  const demoSupervisors = useMemo<SupervisorRecord[]>(() => {
    const sup = JANMASAATHI_DEMO_PERSONAS.find((p) => p.id === 'supervisor-rajesh');
    if (!sup) return [];
    return [
      {
        id: sup.user.staffId,
        name: sup.user.name,
        designation: sup.user.designation,
        block: 'Khordha & Rampur',
        district: 'Khordha',
        facilityId: sup.user.facilityId,
        phone: 'Not recorded in demo fixture',
        email: sup.user.email,
        status: 'Active',
        isDemo: true,
      },
    ];
  }, []);

  const supervisors = useMemo<SupervisorRecord[]>(() => {
    if (roleCategory === 'unauthorized' || roleCategory === 'mother') return [];
    return appMode === 'demo' ? demoSupervisors : liveSupervisors;
  }, [appMode, roleCategory, demoSupervisors, liveSupervisors]);

  const alerts = useMemo<EmergencyAlert[]>(
    () => rawModeAlerts.filter((al) => canCallerViewAlert(al, callerScope)),
    [rawModeAlerts, callerScope]
  );

  const assessments = useMemo<AssessmentRecord[]>(() => {
    if (roleCategory === 'unauthorized') return [];
    if (roleCategory === 'mother' || roleCategory === 'health_worker') {
      return rawModeAssessments.filter((a) => allowedMotherIds.has(a.motherId));
    }
    return rawModeAssessments;
  }, [rawModeAssessments, roleCategory, allowedMotherIds]);

  const referrals = useMemo<ReferralRecord[]>(() => {
    if (roleCategory === 'unauthorized' || roleCategory === 'mother') return [];
    if (roleCategory === 'health_worker') {
      return rawModeReferrals.filter((r) => allowedMotherIds.has(r.motherId));
    }
    return rawModeReferrals;
  }, [rawModeReferrals, roleCategory, allowedMotherIds]);

  const appointments = useMemo<AppointmentRecord[]>(() => {
    if (roleCategory === 'unauthorized' || roleCategory === 'mother') return [];
    if (roleCategory === 'health_worker') {
      return rawModeAppointments.filter((ap) => allowedMotherIds.has(ap.motherId));
    }
    return rawModeAppointments;
  }, [rawModeAppointments, roleCategory, allowedMotherIds]);

  const auditLogs = useMemo<AuditLogEntry[]>(() => {
    if (!canPerformMutation(currentUser.role, 'view_audit_logs')) return [];
    return rawModeAuditLogs;
  }, [rawModeAuditLogs, currentUser.role]);

  const demoCollectionStatuses = useMemo<CollectionStatusMap>(() => {
    const base = createInitialStatuses('ready');
    base.users = { status: 'ready', count: JANMASAATHI_DEMO_PERSONAS.length, path: 'demo/users' };
    base.mothers = { status: 'ready', count: demoMothers.length, path: 'demo/mothers' };
    base.healthWorkers = {
      status: 'ready',
      count: demoHealthWorkers.length,
      path: 'demo/healthWorkers',
    };
    base.supervisors = {
      status: 'ready',
      count: demoSupervisors.length,
      path: 'demo/supervisors',
    };
    base.assessments = { status: 'ready', count: demoAssessments.length, path: 'demo/assessments' };
    base.emergencyAlerts = {
      status: 'ready',
      count: demoAlerts.length,
      path: 'demo/emergencyAlerts',
      lastSyncedAt: alertSyncState.lastSyncedAt ?? undefined,
    };
    base.alerts = {
      status: 'ready',
      count: demoAlerts.length,
      path: 'demo/alerts',
      lastSyncedAt: alertSyncState.lastSyncedAt ?? undefined,
    };
    base.healthUpdates = { status: 'ready', count: 3, path: 'demo/healthUpdates' };
    base.referrals = { status: 'ready', count: demoReferrals.length, path: 'demo/referrals' };
    base.appointments = {
      status: 'ready',
      count: demoAppointments.length,
      path: 'demo/appointments',
    };
    base.auditLogs = { status: 'ready', count: demoAuditLogs.length, path: 'demo/auditLogs' };
    return base;
  }, [
    demoMothers.length,
    demoHealthWorkers.length,
    demoAssessments.length,
    demoAlerts.length,
    demoReferrals.length,
    demoAppointments.length,
    demoAuditLogs.length,
    alertSyncState.lastSyncedAt,
  ]);

  const collectionStatuses = appMode === 'demo' ? demoCollectionStatuses : liveCollectionStatuses;

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];
    alerts
      .filter((a) => isActiveAlertStatus(a.status))
      .slice(0, 6)
      .forEach((a) => {
        const id = `notif-alert-${a.id}`;
        items.push({
          id,
          title: `${a.severity} Alert (${a.status}): ${a.motherName}`,
          description: `${SOURCE_ROLE_LABELS[a.sourceRole]} · ${a.triggerTitle}`,
          timestamp: a.timestamp,
          priority: a.severity,
          type: 'alert',
          targetSection: 'alerts',
          targetId: a.id,
          read: readNotifIds.has(id),
        });
      });

    referrals
      .filter((r) => r.status === 'Pending' || r.status === 'In Transit')
      .slice(0, 4)
      .forEach((r) => {
        const id = `notif-ref-${r.id}`;
        items.push({
          id,
          title: `${r.status} Referral: ${r.motherName}`,
          description: r.reason,
          timestamp: r.referralDate,
          type: 'referral',
          targetSection: 'referrals',
          targetId: r.id,
          read: readNotifIds.has(id),
        });
      });

    appointments
      .filter((ap) => ap.status === 'Follow-up Due' || ap.status === 'Upcoming')
      .slice(0, 3)
      .forEach((ap) => {
        const id = `notif-apt-${ap.id}`;
        items.push({
          id,
          title: `${ap.appointmentType}: ${ap.motherName}`,
          description: `${ap.scheduledDate} ${ap.scheduledTime} · ${ap.department}`,
          timestamp: ap.scheduledDate,
          type: 'appointment',
          targetSection: 'appointments',
          targetId: ap.id,
          read: readNotifIds.has(id),
        });
      });

    return items;
  }, [alerts, referrals, appointments, readNotifIds]);

  const logAuditAction = useCallback(
    async (
      category: AuditLogEntry['category'],
      action: string,
      targetEntity: string,
      authorizationBasis: string
    ) => {
      if (appMode === 'demo') {
        const entry: AuditLogEntry = {
          id: `AUD-DEMO-${Date.now().toString().slice(-4)}`,
          timestamp: nowFormatted(),
          actorName: currentUser.name,
          actorRole: currentUser.role,
          category,
          action,
          targetEntity,
          authorizationBasis: `${authorizationBasis} (Demo Mode)`,
          isDemo: true,
        };
        setDemoAuditLogs((prev) => [entry, ...prev]);
        return;
      }

      if (!db || !auth?.currentUser) return;
      try {
        await addDoc(collection(db, 'auditLogs'), {
          actorUid: auth.currentUser.uid,
          actorId: auth.currentUser.uid,
          actorName: currentUser.name,
          actorEmail: auth.currentUser.email,
          actorRole: currentUser.role,
          facilityId: currentFacility.id,
          hospitalId: currentFacility.id,
          facilityCode: currentFacility.facilityCode,
          facilityName: currentFacility.name,
          category,
          action,
          targetEntity,
          authorizationBasis,
          timestamp: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        const info = buildFirestoreErrorInfo(err, OperationType.CREATE, 'auditLogs');
        if (import.meta.env.DEV) {
          console.error('Firestore Error:', info.code, info.path);
        }
      }
    },
    [appMode, currentUser, currentFacility]
  );

  const setAppMode = (mode: AppMode) => {
    setMutationError(null);
    setSelectedMotherId(null);
    setSelectedAlertId(null);
    setSelectedReferralId(null);
    setSelectedHealthWorkerId(null);
    hasHydratedAlertsRef.current = false;
    seenAlertIdsRef.current = new Set();
    setAppModeState(mode);
    if (mode === 'firebase') {
      void runConnectionCheck();
    }
  };

  const enterDemoPersona = (personaId: DemoPersonaId, selectedFacId?: string) => {
    const persona =
      JANMASAATHI_DEMO_PERSONAS.find((p) => p.id === personaId) ?? JANMASAATHI_DEMO_PERSONAS[3];
    setMutationError(null);
    demoSessionTokenRef.current = null;
    setAppModeState('demo');
    setActiveDemoPersonaId(persona.id);
    setDemoUser(persona.user);
    setFacilityId(selectedFacId || persona.user.facilityId);
    setDemoAuthenticated(true);
    setSelectedAlertId(null);
    setSelectedReferralId(null);

    if (persona.id === 'mother-priya') {
      setActiveSectionState('mothers');
      setSelectedMotherId('MCP-2026-0894');
      setSelectedHealthWorkerId(null);
    } else if (persona.id === 'hw-sunita') {
      setSelectedMotherId(null);
      setActiveSectionState('health-workers');
      setSelectedHealthWorkerId('HW-44120');
    } else {
      setSelectedMotherId(null);
      setSelectedHealthWorkerId(null);
      setActiveSectionState('overview');
    }

    setDemoAuditLogs((prev) => [
      {
        id: `AUD-DEMO-${Date.now().toString().slice(-4)}`,
        timestamp: nowFormatted(),
        actorName: persona.user.name,
        actorRole: persona.user.role,
        category: 'Authentication',
        action: `Entered DEMO MODE as ${persona.title}`,
        targetEntity: persona.identifier,
        authorizationBasis: 'JanmaSaathi Demo Access (Isolated Local Session)',
        isDemo: true,
      },
      ...prev,
    ]);
  };

  const resetDemoFixtures = () => {
    if (!canPerformMutation(currentUser.role, 'reset_demo')) {
      setMutationError(
        `Access restricted: role "${currentUser.role}" is not permitted to reset demo fixtures.`
      );
      return;
    }
    setDemoMothers(DEMO_MOTHERS);
    setDemoHealthWorkers(DEMO_HEALTH_WORKERS);
    setDemoAssessments(DEMO_ASSESSMENTS);
    setDemoAlerts(DEMO_ALERTS);
    setDemoReferrals(DEMO_REFERRALS);
    setDemoAppointments(DEMO_APPOINTMENTS);
    setDemoAuditLogs(DEMO_AUDIT_LOGS);
    setReadNotifIds(new Set());
    void (async () => {
      const token = await getAuthBearerToken();
      if (!token) return;
      await fetch('/api/demo/alerts/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    })();
  };

  // Email/Password Firebase Auth strictly for Firebase Integration Mode (zero Google OAuth)
  const signInWithEmail = async (email: string, password: string, _selectedFacId: string) => {
    if (!auth) {
      throw new Error('Firebase Authentication is not configured in this environment.');
    }
    setAppModeState('firebase');
    setFirebaseProfileResolved(false);
    setFacilityId('');
    setFirebaseAllowedFacilities([]);
    setMutationError(null);
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const logout = async () => {
    silenceAllAlertReminders();
    resetSoundedAlertHistory();
    hasHydratedAlertsRef.current = false;
    seenAlertIdsRef.current = new Set();
    setReadNotifIds(new Set());
    setActiveReminderAlertIds([]);
    setIncomingAlertToast(null);

    if (appMode === 'demo') {
      setDemoAuthenticated(false);
      setActiveDemoPersonaId(null);
      demoSessionTokenRef.current = null;
      setSelectedMotherId(null);
      setSelectedAlertId(null);
      setSelectedReferralId(null);
      setSelectedHealthWorkerId(null);
      return;
    }

    if (auth?.currentUser) {
      await disableFcmNotifications({ appMode: 'firebase', uid: auth.currentUser.uid });
      setFcmStatus('idle');
      setFcmTokenPreview(null);
      await logAuditAction(
        'Authentication',
        'Signed out of Hospital Dashboard',
        currentUser.staffId,
        'User Initiated Logout'
      );
      await signOut(auth);
    }
    setEmergencyAlertsLive([]);
    setSelectedMotherId(null);
    setSelectedAlertId(null);
    setSelectedReferralId(null);
    setSelectedHealthWorkerId(null);
  };

  const setActiveSection = (section: NavSection) => {
    if (!canAccessSection(currentUser.role, section)) {
      setMutationError(
        `Access restricted: role "${currentUser.role}" cannot open the "${section}" hospital section.`
      );
      return;
    }
    if (roleCategory === 'mother' && section === 'mothers') {
      const ownId = currentUser.staffId;
      setSelectedMotherId(ownId && ownId !== '—' ? ownId : null);
      setActiveSectionState('mothers');
      return;
    }
    setSelectedMotherId(null);
    setActiveSectionState(section);
  };

  const openMotherProfile = (motherId: string) => {
    const mother = mothers.find((m) => m.id === motherId);
    if (!mother) {
      setMutationError(
        'Access restricted: you are not authorized to open this maternal record.'
      );
      return;
    }
    setSelectedMotherId(motherId);
    setActiveSectionState('mothers');
    void logAuditAction(
      'Record Access',
      'Opened Mother Health Profile',
      `${mother.id} (${mother.fullName})`,
      `${mother.consentLevel}`
    );
  };

  const closeMotherProfile = () => {
    if (roleCategory === 'mother') return;
    setSelectedMotherId(null);
  };

  const manualSyncAlerts = useCallback(async () => {
    if (appMode === 'firebase') {
      setSubscriptionEpoch((n) => n + 1);
      await pollAlertsOnce();
      return;
    }
    await pollAlertsOnce();
  }, [appMode, pollAlertsOnce]);

  // =========================================================================
  // SUBMIT NEW EMERGENCY ALERT (Mother / Health Worker / Supervisor)
  // Never discards duplicate submissions silently!
  // =========================================================================
  const submitEmergencyAlert: DashboardContextValue['submitEmergencyAlert'] = async (payload) => {
    setMutationError(null);
    const mother = mothers.find((m) => m.id === payload.motherId);
    const body = {
      ...payload,
      motherName: mother?.fullName || payload.motherId,
      gestationalAgeLabel: mother ? `${mother.gestationalWeeks}w ${mother.gestationalDays}d` : '—',
      assignedHealthWorkerId: mother?.assignedHealthWorkerId || 'HW-44120',
      assignedHealthWorkerName: mother?.assignedHealthWorkerName || 'Sunita Devi',
      block: mother?.block || currentFacility.district,
      facilityId: currentFacility.id,
      facilityName: currentFacility.name,
      reportedByUserId:
        payload.reportedByUserId ||
        (payload.sourceRole === 'mother'
          ? payload.motherId
          : payload.sourceRole === 'health_worker'
          ? mother?.assignedHealthWorkerId || 'HW-44120'
          : currentUser.staffId),
      reportedByName:
        payload.reportedByName ||
        (payload.sourceRole === 'mother'
          ? mother?.fullName || payload.motherId
          : payload.sourceRole === 'health_worker'
          ? mother?.assignedHealthWorkerName || 'Sunita Devi'
          : currentUser.name),
    };

    if (appMode === 'demo') {
      const token = await getAuthBearerToken();
      if (!token) {
        const msg = 'Demo session token could not be issued by the server.';
        setMutationError(msg);
        return { ok: false, error: msg };
      }
      try {
        const resp = await fetch('/api/alerts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        const json = (await resp.json()) as {
          error?: string;
          duplicatePreserved?: boolean;
          alert?: EmergencyAlert;
        };
        if (!resp.ok || !json.alert) {
          const errMsg = json.error || `Alert submission failed (HTTP ${resp.status}).`;
          setMutationError(errMsg);
          return { ok: false, error: errMsg };
        }
        // Sync demo mother alertStatus badge
        setDemoMothers((prev) =>
          prev.map((m) =>
            m.id === json.alert!.motherId ? { ...m, alertStatus: json.alert!.severity } : m
          )
        );
        await logAuditAction(
          'Alert Triage',
          json.duplicatePreserved
            ? `Preserved Duplicate Emergency Alert Submission on ${json.alert.id}`
            : `Received ${json.alert.severity} Emergency Alert ${json.alert.id} (${SOURCE_ROLE_LABELS[json.alert.sourceRole]})`,
          `${json.alert.motherId} (${json.alert.motherName})`,
          `${SOURCE_ROLE_LABELS[json.alert.sourceRole]} Reporting Protocol`
        );
        return {
          ok: true,
          alertId: json.alert.id,
          duplicatePreserved: Boolean(json.duplicatePreserved),
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unable to reach emergency alert API.';
        setMutationError(msg);
        return { ok: false, error: msg };
      }
    }

    // Firebase Integration Mode: write directly to emergencyAlerts (referencing motherId only!)
    if (!db || !auth?.currentUser) {
      return { ok: false, error: 'Authenticated Firebase session required.' };
    }

    try {
      const activeDuplicate = findActiveDuplicateAlert(
        liveAlerts,
        payload.motherId,
        payload.alertCategory
      );
      const nowIso = new Date().toISOString();
      const opId = `OP-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

      if (activeDuplicate && activeDuplicate.sourceCollection === 'emergencyAlerts') {
        const dupRecord = {
          submissionId: `DUP-${Date.now().toString().slice(-6)}`,
          submittedAt: nowIso,
          reportedByUserId: body.reportedByUserId,
          reportedByName: body.reportedByName,
          sourceRole: payload.sourceRole,
          operationId: opId,
          symptomDescription: payload.symptomDescription,
          note: `Duplicate submission preserved on active alert ${activeDuplicate.id}.`,
        };
        await updateDoc(doc(db, 'emergencyAlerts', activeDuplicate.id), {
          duplicateSubmissionCount: (activeDuplicate.duplicateSubmissionCount || 0) + 1,
          duplicateSubmissions: arrayUnion(dupRecord),
          responseHistory: arrayUnion({
            id: `resp-dup-${Date.now()}`,
            timestamp: nowIso,
            actorId: body.reportedByUserId,
            actor: body.reportedByName,
            role: SOURCE_ROLE_LABELS[payload.sourceRole],
            action: 'Duplicate Submission Preserved',
            note: payload.symptomDescription,
          }),
          updatedAt: serverTimestamp(),
        });
        await logAuditAction(
          'Alert Triage',
          `Preserved Duplicate Alert Submission on ${activeDuplicate.id}`,
          `${payload.motherId} (${body.motherName})`,
          `${SOURCE_ROLE_LABELS[payload.sourceRole]} Reporting Protocol`
        );
        return { ok: true, alertId: activeDuplicate.id, duplicatePreserved: true };
      }

      const alertId = `EMRG-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      await setDoc(doc(db, 'emergencyAlerts', alertId), {
        id: alertId,
        alertId,
        recordType: 'emergencyAlert',
        motherId: payload.motherId,
        relatedMotherId: payload.motherId,
        sourceRole: payload.sourceRole,
        reportedByUserId: body.reportedByUserId,
        reportedByName: body.reportedByName,
        assignedHealthWorkerId: body.assignedHealthWorkerId,
        assignedHealthWorkerName: body.assignedHealthWorkerName,
        facilityId: currentFacility.id,
        hospitalId: currentFacility.id,
        facilityCode: currentFacility.facilityCode,
        facilityName: currentFacility.name,
        alertCategory: payload.alertCategory,
        triggerTitle: payload.triggerTitle,
        symptomDescription: payload.symptomDescription,
        symptoms: payload.symptoms,
        vitals: payload.vitalsSnapshot ?? {},
        priority: payload.priority,
        priorityBasis:
          payload.sourceRole === 'mother'
            ? 'Mother Emergency Report'
            : payload.sourceRole === 'supervisor'
            ? 'Supervisor Escalation'
            : 'Health Worker Assessment',
        protocolReference:
          payload.protocolReference ||
          `Approved ${SOURCE_ROLE_LABELS[payload.sourceRole]} Emergency Reporting Protocol`,
        submittedAt: serverTimestamp(),
        status: 'NEW',
        duplicateOfAlertId: null,
        duplicateSubmissionCount: 0,
        duplicateSubmissions: [],
        hospitalResponse: {},
        returnCommunication: {
          recipients: { mother: false, healthWorker: false, supervisor: false },
        },
        responseHistory: [
          {
            id: `resp-init-${Date.now()}`,
            timestamp: nowIso,
            actorId: body.reportedByUserId,
            actor: body.reportedByName,
            role: SOURCE_ROLE_LABELS[payload.sourceRole],
            action: 'Alert Submitted',
            nextStatus: 'NEW',
            note: payload.symptomDescription,
          },
        ],
        owningUid: auth.currentUser.uid,
        operationId: opId,
        localRecordId: alertId,
        localRevision: 1,
        recordOrigin: 'online',
        syncState: 'synced',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await logAuditAction(
        'Alert Triage',
        `Submitted ${payload.priority} Emergency Alert ${alertId}`,
        `${payload.motherId} (${body.motherName})`,
        `${SOURCE_ROLE_LABELS[payload.sourceRole]} Reporting Protocol`
      );
      return { ok: true, alertId, duplicatePreserved: false };
    } catch (err) {
      const code = extractFirestoreErrorCode(err);
      const msg =
        code === 'permission-denied'
          ? 'Firestore security rules denied write to "emergencyAlerts". See JANMASAATHI_ALERT_CONTRACT.md for the additive security rules.'
          : err instanceof Error
          ? err.message
          : String(err);
      setMutationError(msg);
      return { ok: false, error: msg };
    }
  };

  // =========================================================================
  // AUTHORIZED HOSPITAL ALERT TRIAGE UPDATE
  // Enforces RBAC, workflow validation, return communication & audit logs
  // =========================================================================
  const updateAlertTriage: DashboardContextValue['updateAlertTriage'] = async (
    alertId,
    payload
  ) => {
    setMutationError(null);
    const target = alerts.find((a) => a.id === alertId);
    if (!target) {
      return { ok: false, error: `Alert "${alertId}" not found.` };
    }

    if (!canRoleManageAlerts(currentUser.role)) {
      const msg = `Unauthorized action blocked: role "${currentUser.role}" cannot modify hospital alert triage status.`;
      setMutationError(msg);
      return { ok: false, error: msg };
    }

    const nextStatus = payload.status ?? target.status;
    const effectiveResolution =
      payload.resolutionSummary?.trim() || target.hospitalResponse.resolutionSummary || '';

    if (nextStatus !== target.status) {
      const validation = validateAlertTransition({
        currentStatus: target.status,
        nextStatus,
        priority: target.severity,
        actorRole: currentUser.role,
        resolutionSummary: effectiveResolution,
      });
      if (!validation.allowed) {
        const msg = validation.reason || 'Invalid alert status transition.';
        setMutationError(msg);
        return { ok: false, error: msg };
      }
    }

    const recipients: AlertSourceRole[] =
      payload.notifyRecipients && payload.notifyRecipients.length > 0
        ? payload.notifyRecipients
        : ['mother', 'health_worker', 'supervisor'];

    if (appMode === 'demo') {
      const token = await getAuthBearerToken();
      if (!token) {
        const msg = 'Unable to obtain authenticated demo session token.';
        setMutationError(msg);
        return { ok: false, error: msg };
      }
      try {
        const resp = await fetch(`/api/alerts/${encodeURIComponent(alertId)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...payload,
            notifyRecipients: recipients,
          }),
        });
        const json = (await resp.json()) as { error?: string; alert?: EmergencyAlert };
        if (!resp.ok || !json.alert) {
          const msg = json.error || `Failed to update alert (HTTP ${resp.status}).`;
          setMutationError(msg);
          return { ok: false, error: msg };
        }
        setDemoAlerts((prev) => prev.map((a) => (a.id === alertId ? json.alert! : a)));
        setDemoMothers((prev) =>
          prev.map((m) =>
            m.id === target.motherId
              ? {
                  ...m,
                  alertStatus:
                    json.alert!.status === 'RESOLVED' || json.alert!.status === 'CLOSED'
                      ? 'Resolved'
                      : json.alert!.status === 'IN PROGRESS' ||
                        json.alert!.status === 'REFERRED / ACTION TAKEN'
                      ? 'Under Review'
                      : json.alert!.severity,
                }
              : m
          )
        );
        if (json.alert.status !== 'NEW') {
          silenceAlertReminder(alertId);
        }
        await logAuditAction(
          'Alert Triage',
          payload.actionLabel ||
            (nextStatus !== target.status
              ? `Transitioned Alert ${alertId} (${target.status} → ${nextStatus})`
              : `Updated Hospital Response on Alert ${alertId}`),
          `${target.motherId} (${target.motherName})`,
          `${currentUser.role} · Return Sync (${recipients.join(', ')})`
        );
        return { ok: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to reach alert triage API.';
        setMutationError(msg);
        return { ok: false, error: msg };
      }
    }

    // Firebase Integration Mode: write to emergencyAlerts (or fallback collection) + messages return communication
    if (!db || !auth?.currentUser) {
      return { ok: false, error: 'Authenticated Firebase session required.' };
    }

    const colName = target.sourceCollection || 'emergencyAlerts';
    const docPath = `${colName}/${alertId}`;
    const nowIso = new Date().toISOString();
    const nowStr = nowFormatted();

    const assignedStaffId = payload.assignedStaffId || target.hospitalResponse.assignedStaffId;
    const assignedStaffName = payload.assignedStaffName || target.hospitalResponse.assignedStaffName;
    const assignedStaffRole = payload.assignedStaffRole || target.hospitalResponse.assignedStaffRole;

    const mergedReferral: AlertReferralCoordination | undefined = payload.referralCoordination
      ? {
          ...target.hospitalResponse.referralCoordination,
          ...payload.referralCoordination,
          updatedAt: nowStr,
        }
      : target.hospitalResponse.referralCoordination;

    const statusMessage = formatReturnCommunicationMessage({
      alertId,
      status: nextStatus,
      actorName: currentUser.name,
      facilityName: currentFacility.name,
      assignedStaffName,
      note: payload.note?.trim() || undefined,
      referralSummary: mergedReferral?.treatmentSummary || mergedReferral?.destinationFacility,
      resolutionSummary:
        nextStatus === 'RESOLVED' || nextStatus === 'CLOSED' ? effectiveResolution : undefined,
    });

    const linkedMessageId = `MSG-ALERT-${Date.now().toString().slice(-6)}`;

    const nextHospitalResponse = {
      ...target.hospitalResponse,
      ...(nextStatus === 'ACKNOWLEDGED' && !target.hospitalResponse.acknowledgedAt
        ? {
            acknowledgedAt: nowIso,
            acknowledgedById: auth.currentUser.uid,
            acknowledgedByName: currentUser.name,
          }
        : {}),
      ...(assignedStaffId ? { assignedStaffId } : {}),
      ...(assignedStaffName ? { assignedStaffName } : {}),
      ...(assignedStaffRole ? { assignedStaffRole } : {}),
      ...(mergedReferral ? { referralCoordination: mergedReferral } : {}),
      ...(effectiveResolution ? { resolutionSummary: effectiveResolution } : {}),
      ...(nextStatus === 'RESOLVED'
        ? {
            resolvedAt: nowIso,
            resolvedById: auth.currentUser.uid,
            resolvedByName: currentUser.name,
          }
        : {}),
      ...(nextStatus === 'CLOSED'
        ? {
            closedAt: nowIso,
            closedById: auth.currentUser.uid,
            closedByName: currentUser.name,
          }
        : {}),
    };

    const nextReturnCommunication = {
      lastDispatchedAt: nowIso,
      latestStatusMessage: statusMessage,
      linkedMessageId,
      recipients: {
        mother: target.returnCommunication.recipients.mother || recipients.includes('mother'),
        healthWorker:
          target.returnCommunication.recipients.healthWorker || recipients.includes('health_worker'),
        supervisor:
          target.returnCommunication.recipients.supervisor || recipients.includes('supervisor'),
      },
    };

    try {
      await updateDoc(doc(db, colName, alertId), {
        status: nextStatus,
        triageStatus: nextStatus,
        hospitalResponse: nextHospitalResponse,
        returnCommunication: nextReturnCommunication,
        updatedAt: serverTimestamp(),
        responseHistory: arrayUnion({
          id: `resp-${Date.now()}`,
          timestamp: nowIso,
          actorId: auth.currentUser.uid,
          actor: currentUser.name,
          role: currentUser.role,
          action:
            payload.actionLabel ||
            (nextStatus !== target.status
              ? `Status Updated to ${nextStatus}`
              : 'Hospital Response Updated'),
          ...(nextStatus !== target.status
            ? { previousStatus: target.status, nextStatus }
            : {}),
          ...(assignedStaffName ? { assignedTo: assignedStaffName } : {}),
          note: payload.note?.trim() || effectiveResolution || `Updated to ${nextStatus}`,
          notifiedRecipients: recipients,
        }),
      });

      // Return communication dispatch into existing JanmaSaathi `messages` collection (best-effort)
      if (target.motherId && recipients.length > 0) {
        try {
          await setDoc(doc(db, 'messages', linkedMessageId), {
            id: linkedMessageId,
            motherId: target.motherId,
            relatedMotherId: target.motherId,
            relatedAlertId: alertId,
            facilityId: target.facilityId || currentFacility.id,
            hospitalId: target.facilityId || currentFacility.id,
            senderId: auth.currentUser.uid,
            senderRole: 'hospital',
            senderName: `${currentUser.name} (${currentFacility.shortName})`,
            text: statusMessage,
            originalText: statusMessage,
            sourceLanguage: 'en',
            translations: {
              text: { en: statusMessage, hi: statusMessage, or: statusMessage },
            },
            delivered: true,
            read: false,
            syncStatus: 'delivered',
            syncState: 'synced',
            recordType: 'alertStatusMessage',
            recordOrigin: 'online',
            owningUid: auth.currentUser.uid,
            timestamp: nowStr.slice(11, 16),
            lastAttemptAt: nowIso,
            retryCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch {
          // Do not fail the primary alert update if messages rule differs
        }
      }

      if (nextStatus !== 'NEW') {
        silenceAlertReminder(alertId);
      }
      await logAuditAction(
        'Alert Triage',
        payload.actionLabel ||
          (nextStatus !== target.status
            ? `Transitioned Alert ${alertId} (${target.status} → ${nextStatus})`
            : `Updated Hospital Response on Alert ${alertId}`),
        `${target.motherId} (${target.motherName})`,
        `${currentUser.role} · Hospital Triage & Return Sync`
      );
      return { ok: true };
    } catch (err) {
      const code = extractFirestoreErrorCode(err);
      const msg = `Failed to update alert (${docPath}): ${
        code === 'permission-denied'
          ? 'Missing or insufficient Firestore permissions.'
          : err instanceof Error
          ? err.message
          : String(err)
      }`;
      setMutationError(msg);
      try {
        handleFirestoreError(err, OperationType.UPDATE, docPath);
      } catch {
        // Logged structurally
      }
      return { ok: false, error: msg };
    }
  };

  const updateAlertStatus = async (alertId: string, newStatus: AlertStatus, note: string) => {
    await updateAlertTriage(alertId, { status: newStatus, note });
  };

  const updateReferralStatus = async (
    referralId: string,
    newStatus: ReferralStatus,
    followUpNote?: string
  ) => {
    if (!canPerformMutation(currentUser.role, 'manage_referrals')) {
      setMutationError(
        `Unauthorized referral action blocked: role "${currentUser.role}" cannot update referral status.`
      );
      return;
    }
    const target = referrals.find((r) => r.id === referralId);
    if (!target) {
      setMutationError('Referral record not found within your authorized scope.');
      return;
    }
    if (appMode === 'demo') {
      setDemoReferrals((prev) =>
        prev.map((r) =>
          r.id === referralId
            ? {
                ...r,
                status: newStatus,
                assignedDoctor: currentUser.name,
                followUpDetails: followUpNote?.trim() ? followUpNote.trim() : r.followUpDetails,
              }
            : r
        )
      );
      if (target) {
        setDemoMothers((prev) =>
          prev.map((m) => (m.id === target.motherId ? { ...m, referralStatus: newStatus } : m))
        );
        await logAuditAction(
          'Referral Action',
          `Updated Referral ${referralId} to ${newStatus}`,
          `${target.motherId} (${target.motherName})`,
          `${currentUser.role} · Referral Coordination`
        );
      }
      return;
    }

    if (!db || !auth?.currentUser) return;
    const docPath = `referrals/${referralId}`;
    setMutationError(null);

    try {
      const updates: Record<string, unknown> = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        assignedDoctor: currentUser.name,
      };
      if (followUpNote?.trim()) {
        updates.followUpDetails = followUpNote.trim();
      }
      await updateDoc(doc(db, 'referrals', referralId), updates);
      if (target) {
        await logAuditAction(
          'Referral Action',
          `Updated Referral ${referralId} to ${newStatus}`,
          `${target.motherId} (${target.motherName})`,
          `${currentUser.role} · Hospital Referral Desk`
        );
      }
    } catch (err) {
      const code = extractFirestoreErrorCode(err);
      setMutationError(
        `Failed to update referral (${docPath}): ${
          code === 'permission-denied'
            ? 'Missing or insufficient Firestore permissions.'
            : err instanceof Error
            ? err.message
            : String(err)
        }`
      );
      try {
        handleFirestoreError(err, OperationType.UPDATE, docPath);
      } catch {
        // Logged structurally
      }
    }
  };

  const createReferral = async (
    payload: Omit<ReferralRecord, 'id' | 'referralDate' | 'isDemo'>
  ) => {
    if (!canPerformMutation(currentUser.role, 'create_referral')) {
      setMutationError(
        `Unauthorized referral creation blocked: role "${currentUser.role}" cannot raise hospital referrals.`
      );
      return;
    }
    if (!allowedMotherIds.has(payload.motherId)) {
      setMutationError('Access restricted: target mother record is outside your authorized scope.');
      return;
    }
    if (appMode === 'demo') {
      const id = `REF-DEMO-${Date.now().toString().slice(-5)}`;
      const created: ReferralRecord = {
        ...payload,
        id,
        referralDate: new Date().toISOString().slice(0, 10),
        isDemo: true,
      };
      setDemoReferrals((prev) => [created, ...prev]);
      setDemoMothers((prev) =>
        prev.map((m) => (m.id === payload.motherId ? { ...m, referralStatus: payload.status } : m))
      );
      await logAuditAction(
        'Referral Action',
        `Created Referral ${id} to ${payload.destinationHospital}`,
        `${payload.motherId} (${payload.motherName})`,
        `${currentUser.role} · Demo Referral Desk`
      );
      return;
    }

    if (!db || !auth?.currentUser) return;
    setMutationError(null);
    try {
      const docRef = await addDoc(collection(db, 'referrals'), {
        ...payload,
        facilityId: currentFacility.id,
        hospitalId: currentFacility.id,
        facilityCode: currentFacility.facilityCode,
        createdByUid: auth.currentUser.uid,
        referralDate: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      await logAuditAction(
        'Referral Action',
        `Created Referral ${docRef.id} to ${payload.destinationHospital}`,
        `${payload.motherId} (${payload.motherName})`,
        `${currentUser.role} · Hospital Referral Desk`
      );
    } catch (err) {
      const code = extractFirestoreErrorCode(err);
      setMutationError(
        `Failed to create referral: ${
          code === 'permission-denied'
            ? 'Missing or insufficient Firestore permissions on "referrals".'
            : err instanceof Error
            ? err.message
            : String(err)
        }`
      );
      try {
        handleFirestoreError(err, OperationType.CREATE, 'referrals');
      } catch {
        // Logged structurally
      }
    }
  };

  const addAssessmentNote: DashboardContextValue['addAssessmentNote'] = async (
    motherId,
    payload
  ) => {
    if (!canPerformMutation(currentUser.role, 'add_assessment')) {
      setMutationError(
        `Unauthorized assessment entry blocked: role "${currentUser.role}" cannot record clinical assessments.`
      );
      return;
    }
    const mother = mothers.find((m) => m.id === motherId);
    if (!mother) {
      setMutationError('Access restricted: mother record is outside your authorized scope.');
      return;
    }

    if (appMode === 'demo') {
      const id = `ASMT-DEMO-${Date.now().toString().slice(-5)}`;
      const created: AssessmentRecord = {
        id,
        motherId,
        motherName: mother.fullName,
        date: nowFormatted(),
        gestationalWeek: mother.gestationalWeeks,
        assessorName: currentUser.name,
        assessorRole: currentUser.role,
        facilityOrLocation: currentFacility.name,
        assessmentType: payload.assessmentType,
        riskClassification: payload.riskClassification,
        summary: payload.summary,
        recommendations: payload.recommendations,
        bpReading: payload.bpReading,
        hemoglobin: payload.hemoglobin,
        isDemo: true,
      };
      setDemoAssessments((prev) => [created, ...prev]);
      setDemoMothers((prev) =>
        prev.map((m) =>
          m.id === motherId
            ? {
                ...m,
                riskLevel: payload.riskClassification,
                latestAssessmentDate: created.date.slice(0, 10),
                latestAssessmentSummary: payload.summary,
                latestBp: payload.bpReading,
                latestHb: payload.hemoglobin,
              }
            : m
        )
      );
      await logAuditAction(
        'Clinical Note',
        `Recorded ${payload.assessmentType} (${id})`,
        `${mother.id} (${mother.fullName})`,
        `${currentUser.role} · Demo Clinical Record`
      );
      return;
    }

    if (!db || !auth?.currentUser) return;
    setMutationError(null);
    try {
      const docRef = await addDoc(collection(db, 'assessments'), {
        motherId,
        motherName: mother.fullName,
        gestationalWeek: mother.gestationalWeeks,
        assessorId: auth.currentUser.uid,
        assessorName: currentUser.name,
        assessorRole: currentUser.role,
        facilityId: currentFacility.id,
        hospitalId: currentFacility.id,
        facilityCode: currentFacility.facilityCode,
        facilityOrLocation: currentFacility.name,
        assessmentType: payload.assessmentType,
        riskClassification: payload.riskClassification,
        summary: payload.summary,
        recommendations: payload.recommendations,
        bpReading: payload.bpReading,
        hemoglobin: payload.hemoglobin,
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      await logAuditAction(
        'Clinical Note',
        `Recorded ${payload.assessmentType} (${docRef.id})`,
        `${mother.id} (${mother.fullName})`,
        `${currentUser.role} · Hospital Clinical Record`
      );
    } catch (err) {
      const code = extractFirestoreErrorCode(err);
      setMutationError(
        `Failed to save clinical assessment: ${
          code === 'permission-denied'
            ? 'Missing or insufficient Firestore permissions on "assessments".'
            : err instanceof Error
            ? err.message
            : String(err)
        }`
      );
      try {
        handleFirestoreError(err, OperationType.CREATE, 'assessments');
      } catch {
        // Logged structurally
      }
    }
  };

  const updateAppointmentStatus = async (
    appointmentId: string,
    status: AppointmentStatus,
    newDate?: string
  ) => {
    if (!canPerformMutation(currentUser.role, 'manage_appointments')) {
      setMutationError(
        `Unauthorized appointment action blocked: role "${currentUser.role}" cannot modify hospital appointments.`
      );
      return;
    }
    const target = appointments.find((a) => a.id === appointmentId);
    if (!target) {
      setMutationError('Appointment record not found within your authorized scope.');
      return;
    }
    if (appMode === 'demo') {
      setDemoAppointments((prev) =>
        prev.map((a) =>
          a.id === appointmentId
            ? { ...a, status, scheduledDate: newDate ?? a.scheduledDate }
            : a
        )
      );
      if (target) {
        await logAuditAction(
          'Clinical Note',
          `Updated Appointment ${appointmentId} to ${status}`,
          `${target.motherId} (${target.motherName})`,
          'Demo ANC Scheduling'
        );
      }
      return;
    }

    if (!db || !auth?.currentUser) return;
    const docPath = `appointments/${appointmentId}`;
    setMutationError(null);
    try {
      const updates: Record<string, unknown> = {
        status,
        updatedAt: serverTimestamp(),
      };
      if (newDate) {
        updates.scheduledDate = newDate;
      }
      await updateDoc(doc(db, 'appointments', appointmentId), updates);
      if (target) {
        await logAuditAction(
          'Clinical Note',
          `Updated Appointment ${appointmentId} to ${status}`,
          `${target.motherId} (${target.motherName})`,
          'Hospital ANC Scheduling'
        );
      }
    } catch (err) {
      const code = extractFirestoreErrorCode(err);
      setMutationError(
        `Failed to update appointment (${docPath}): ${
          code === 'permission-denied'
            ? 'Missing or insufficient Firestore permissions.'
            : err instanceof Error
            ? err.message
            : String(err)
        }`
      );
      try {
        handleFirestoreError(err, OperationType.UPDATE, docPath);
      } catch {
        // Logged structurally
      }
    }
  };

  const createAppointment = async (payload: Omit<AppointmentRecord, 'id' | 'isDemo'>) => {
    if (!canPerformMutation(currentUser.role, 'manage_appointments')) {
      setMutationError(
        `Unauthorized scheduling blocked: role "${currentUser.role}" cannot schedule hospital appointments.`
      );
      return;
    }
    if (!allowedMotherIds.has(payload.motherId)) {
      setMutationError('Access restricted: target mother record is outside your authorized scope.');
      return;
    }
    if (appMode === 'demo') {
      const id = `APT-DEMO-${Date.now().toString().slice(-5)}`;
      setDemoAppointments((prev) => [{ ...payload, id, isDemo: true }, ...prev]);
      await logAuditAction(
        'Clinical Note',
        `Scheduled ${payload.appointmentType} (${id})`,
        `${payload.motherId} (${payload.motherName})`,
        'Demo Clinic Scheduling'
      );
      return;
    }

    if (!db || !auth?.currentUser) return;
    setMutationError(null);
    try {
      const docRef = await addDoc(collection(db, 'appointments'), {
        ...payload,
        facilityId: currentFacility.id,
        hospitalId: currentFacility.id,
        facilityCode: currentFacility.facilityCode,
        createdByUid: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
      await logAuditAction(
        'Clinical Note',
        `Scheduled ${payload.appointmentType} (${docRef.id})`,
        `${payload.motherId} (${payload.motherName})`,
        'Hospital Clinic Scheduling'
      );
    } catch (err) {
      const code = extractFirestoreErrorCode(err);
      setMutationError(
        `Failed to schedule appointment: ${
          code === 'permission-denied'
            ? 'Missing or insufficient Firestore permissions on "appointments".'
            : err instanceof Error
            ? err.message
            : String(err)
        }`
      );
      try {
        handleFirestoreError(err, OperationType.CREATE, 'appointments');
      } catch {
        // Logged structurally
      }
    }
  };

  const markNotificationRead = (id: string) => {
    setReadNotifIds((prev) => new Set(prev).add(id));
  };

  const markAllNotificationsRead = () => {
    setReadNotifIds(new Set(notifications.map((n) => n.id)));
  };

  const refreshAllSubscriptions = () => {
    if (appMode === 'firebase') {
      void runConnectionCheck();
      setSubscriptionEpoch((n) => n + 1);
    }
    void manualSyncAlerts();
  };

  const value: DashboardContextValue = {
    appMode,
    setAppMode,
    activeDemoPersonaId,
    authReady: appMode === 'demo' ? true : authReady,
    isAuthenticated,
    firebaseUser,
    currentUser,
    currentFacility,
    setSelectedFacilityId: (nextFacId: string) => {
      if (canAccessFacility(allowedFacilityIds, nextFacId)) {
        setFacilityId(nextFacId);
      }
    },
    roleCategory,
    permittedSections,
    canManageAlerts,
    canMutate,
    connectionCheck,
    storageCheck,
    retryConnection: () => void runConnectionCheck(),
    refreshAllSubscriptions,
    collectionStatuses,
    alertSyncState,
    manualSyncAlerts,
    alertSoundEnabled,
    setAlertSoundEnabled,
    enableAlertSound,
    disableAlertSound,
    testAlertSound,
    alertSoundStatusMessage,
    alertAudioBlocked,
    activeReminderAlertIds,
    silenceAlertReminder,
    notificationPermission,
    fcmStatus,
    fcmMessage,
    fcmDeviceId,
    fcmTokenPreview,
    fcmVapidConfigured,
    fcmBusy,
    enableBrowserPushNotifications,
    disableBrowserPushNotifications,
    incomingAlertToast,
    dismissIncomingAlertToast: () => setIncomingAlertToast(null),
    mutationError,
    clearMutationError: () => setMutationError(null),
    enterDemoPersona,
    resetDemoFixtures,
    signInWithEmail,
    logout,
    activeSection,
    setActiveSection,
    selectedMotherId,
    openMotherProfile,
    closeMotherProfile,
    selectedAlertId,
    setSelectedAlertId,
    selectedReferralId,
    setSelectedReferralId,
    selectedHealthWorkerId,
    setSelectedHealthWorkerId,
    dateRange,
    setDateRange,
    globalSearch,
    setGlobalSearch,
    mothers,
    healthWorkers,
    supervisors,
    assessments,
    alerts,
    referrals,
    appointments,
    auditLogs,
    notifications,
    submitEmergencyAlert,
    updateAlertTriage,
    updateAlertStatus,
    updateReferralStatus,
    createReferral,
    addAssessmentNote,
    updateAppointmentStatus,
    createAppointment,
    markNotificationRead,
    markAllNotificationsRead,
    logAuditAction,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return ctx;
}
