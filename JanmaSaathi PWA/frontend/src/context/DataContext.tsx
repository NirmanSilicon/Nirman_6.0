import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Mother,
  HealthWorker,
  Supervisor,
  MaternalAssessment,
  HealthUpdate,
  Referral,
  Appointment,
  DirectMessage,
  VillageAllocation,
  CompanionMemory,
  CompanionMemorySettings,
  HospitalFacility,
  EmergencyAlert,
  EmergencyAlertConcernCategory,
  EmergencyAlertUrgency,
  EmergencyAlertVitals,
  EmergencyAlertUpdateEntry,
} from '../types';
import {
  DEMO_SUPERVISOR,
  DEMO_WORKERS,
  DEMO_MOTHERS,
  DEMO_HEALTH_UPDATES,
  DEMO_APPOINTMENTS,
  DEMO_MESSAGES,
  DEMO_ASSESSMENTS,
  DEMO_REFERRALS,
  DEMO_VILLAGE_ALLOCATIONS,
  AUTHORIZED_HOSPITALS,
  DEMO_EMERGENCY_ALERTS,
} from '../data/centralDemoData';
import {
  seedInitialDataIfEmpty,
  subscribeMothers,
  subscribeWorkers,
  subscribeSupervisors,
  subscribeAssessments,
  subscribeHealthUpdates,
  subscribeReferrals,
  subscribeAppointments,
  subscribeMessages,
  subscribeAssignments,
  subscribeHospitals,
  subscribeEmergencyAlerts,
  ensureAuthorizedHospitalsSeeded,
  createMotherRecord,
  createAssessmentRecord,
  updateAssessmentReview,
  createHealthUpdateRecord,
  updateHealthUpdateReview,
  createReferralRecord,
  updateReferralStatusRecord,
  createEmergencyAlertRecord,
  authorizeEmergencyAlertWithServer,
  authorizeEscalationWithServer,
  EmergencyAlertAuthorizationError,
  updateEmergencyAlertRecord,
  escalateEmergencyAlertRecord,
  dispatchEmergencyAlertNotificationWithServer,
  updateEmergencyAlertWithServer,
  createDirectMessage,
  markDirectMessagesReadInFirestore,
  uploadVoiceMessageAudio,
  deleteVoiceMessageAudio,
  createOrUpdateAssignment,
  logAuditEvent,
  subscribeCompanionMemories,
  createCompanionMemoryRecord,
  deleteCompanionMemoryRecord,
} from '../services/firestoreService';
import { saveLocalDraft, getLocalDrafts, updateLocalSyncState, deleteLocalDraft } from '../utils/indexedDB';
import { queueOfflineEmergencyAlert, removeQueuedEmergencyAlert } from '../utils/offlineQueue';
import {
  triggerBackgroundSync,
  initAutoSyncTriggers,
  markRecordUploadInFlight,
  clearRecordUploadInFlight,
} from '../utils/syncManager';
import { evaluateMaternalRiskLocally } from '../ml/mlEngine';
import { evaluateClinicalObservations } from '../ml/clinicalScreening';
import { localizeDynamicText } from '../utils/dynamicLocalization';
import { auth } from '../lib/firebase';
import { useAuth } from './AuthContext';

interface DataContextType {
  supervisor: Supervisor;
  workers: HealthWorker[];
  mothers: Mother[];
  healthUpdates: HealthUpdate[];
  appointments: Appointment[];
  messages: DirectMessage[];
  assessments: MaternalAssessment[];
  referrals: Referral[];
  villageAllocations: VillageAllocation[];
  hospitals: HospitalFacility[];
  emergencyAlerts: EmergencyAlert[];
  isLoading: boolean;
  dbError: string | null;

  // Real Database Mutations
  addHealthUpdate: (data: {
    motherId: string;
    motherName: string;
    observations: string;
    symptoms: string[];
    notes: string;
    submittedBy?: string;
  }) => Promise<HealthUpdate>;

  reviewHealthUpdate: (
    healthUpdateId: string,
    reviewedBy: string,
    reviewNotes: string
  ) => Promise<void>;

  addAssessment: (
    assessment: Omit<MaternalAssessment, 'id' | 'recordedAt' | 'isSynthetic'>
  ) => Promise<MaternalAssessment>;

  reviewAssessment: (
    id: string,
    status: 'signed_off' | 'clarification_requested',
    notes: string,
    reviewedBy?: string
  ) => Promise<void>;

  addReferral: (
    referral: Omit<Referral, 'id' | 'createdAt' | 'status' | 'isSynthetic'>
  ) => Promise<Referral>;

  updateReferralStatus: (
    id: string,
    status: Referral['status'],
    supervisorRemarks?: string
  ) => Promise<void>;

  allocateWorker: (
    allocationId: string,
    workerId: string,
    allocatedMotherIds?: string[]
  ) => Promise<void>;

  sendMessage: (
    text: string,
    senderRole: 'mother' | 'worker',
    senderId: string,
    senderName: string,
    motherId?: string,
    options?: {
      sourceLanguage?: 'en' | 'hi' | 'or';
      receiverId?: string;
      workerId?: string;
    }
  ) => Promise<void>;

  sendVoiceMessage: (params: {
    audioBlob: Blob;
    mimeType: string;
    durationSeconds: number;
    senderRole: 'mother' | 'worker';
    senderId: string;
    senderName: string;
    motherId?: string;
    workerId?: string;
    receiverId?: string;
    onProgress?: (percent: number) => void;
  }) => Promise<DirectMessage>;

  markMessagesAsRead: (motherId: string, readerRole?: 'mother' | 'worker', workerId?: string) => Promise<void>;

  registerMother: (data: Omit<Mother, 'id' | 'isSynthetic'>) => Promise<Mother>;

  // Consented Mother AI Companion Memory & Privacy Controls
  companionMemories: CompanionMemory[];
  companionMemorySettings: CompanionMemorySettings;
  saveCompanionMemory: (data: {
    motherId: string;
    title: string;
    summary: string;
    topic: CompanionMemory['topic'];
    language: CompanionMemory['language'];
    gestationalWeek: number;
  }) => Promise<CompanionMemory>;
  deleteCompanionMemory: (memoryId: string) => Promise<void>;
  clearAllCompanionMemories: (motherId: string) => Promise<void>;
  updateCompanionMemorySettings: (updates: Partial<CompanionMemorySettings>) => void;

  // Shared Real-Time Maternal Emergency Alerts (Mother <-> Worker <-> Supervisor <-> Hospital)
  raiseEmergencyAlert: (data: {
    motherId: string;
    motherName?: string;
    motherPhone?: string;
    motherAge?: number;
    gestationalAgeWeeks?: number;
    village?: string;
    hamlet?: string;
    assignedWorkerId?: string;
    assignedWorkerName?: string;
    raisedByRole: 'mother' | 'worker' | 'supervisor';
    raisedById: string;
    raisedByName: string;
    targetHospitalId: string;
    concernCategory: EmergencyAlertConcernCategory;
    concernLabel: string;
    urgency: EmergencyAlertUrgency;
    symptoms: string[];
    description: string;
    additionalHealthInfo?: string;
    attachedAssessmentId?: string;
    attachedAssessmentSummary?: string;
    vitals?: EmergencyAlertVitals;
    dangerSigns?: string[];
    transportRequested?: boolean;
  }) => Promise<EmergencyAlert>;

  escalateEmergencyAlert: (params: {
    alertId: string;
    escalatedBy: string;
    escalationReason: string;
    escalationTargetHospitalId: string;
  }) => Promise<void>;

  updateEmergencyAlertStatus: (params: {
    alertId: string;
    status: EmergencyAlert['status'];
    actorName: string;
    actorRole: 'hospital' | 'supervisor' | 'worker' | 'mother';
    note: string;
  }) => Promise<void>;

  resetToDefaultData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const LOCAL_CACHE_KEY = 'janmasaathi_firestore_cache_v3';

function getMessageSortTimeMs(msg: DirectMessage & { createdAt?: any }): number {
  if (typeof msg.sentAtMs === 'number' && Number.isFinite(msg.sentAtMs)) {
    return msg.sentAtMs;
  }
  if (msg.createdAt && typeof msg.createdAt.toMillis === 'function') {
    return msg.createdAt.toMillis();
  }
  if (msg.createdAt && typeof msg.createdAt.seconds === 'number') {
    return msg.createdAt.seconds * 1000;
  }
  if (msg.lastAttemptAt) {
    const parsed = Date.parse(msg.lastAttemptAt);
    if (Number.isFinite(parsed)) return parsed;
  }
  // Baseline seeded demo messages (MSG-001..MSG-005) stay ordered before runtime messages
  const demoMatch = /^MSG-0*(\d+)$/.exec(msg.id || '');
  if (demoMatch) {
    return Number(demoMatch[1]);
  }
  return 0;
}

export function sortAndDeduplicateMessages(list: DirectMessage[]): DirectMessage[] {
  const byId = new Map<string, DirectMessage>();
  for (const item of list) {
    if (item?.id) {
      byId.set(item.id, item);
    }
  }
  return Array.from(byId.values()).sort((a, b) => {
    const ta = getMessageSortTimeMs(a as any);
    const tb = getMessageSortTimeMs(b as any);
    if (ta !== tb) return ta - tb;
    return (a.id || '').localeCompare(b.id || '');
  });
}

export function sortAndDeduplicateEmergencyAlerts(list: EmergencyAlert[]): EmergencyAlert[] {
  const byId = new Map<string, EmergencyAlert>();
  for (const item of list) {
    if (item?.id) {
      byId.set(item.id, item);
    }
  }
  return Array.from(byId.values()).sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supervisor, setSupervisor] = useState<Supervisor>(DEMO_SUPERVISOR);
  const [workers, setWorkers] = useState<HealthWorker[]>(DEMO_WORKERS);
  const [mothers, setMothers] = useState<Mother[]>(DEMO_MOTHERS);
  const [healthUpdates, setHealthUpdates] = useState<HealthUpdate[]>(DEMO_HEALTH_UPDATES);
  const [appointments, setAppointments] = useState<Appointment[]>(DEMO_APPOINTMENTS);
  const [messages, setMessages] = useState<DirectMessage[]>(DEMO_MESSAGES);
  const [assessments, setAssessments] = useState<MaternalAssessment[]>(DEMO_ASSESSMENTS);
  const [referrals, setReferrals] = useState<Referral[]>(DEMO_REFERRALS);
  const [villageAllocations, setVillageAllocations] = useState<VillageAllocation[]>(DEMO_VILLAGE_ALLOCATIONS);
  const [hospitals, setHospitals] = useState<HospitalFacility[]>(AUTHORIZED_HOSPITALS);
  const [emergencyAlerts, setEmergencyAlerts] = useState<EmergencyAlert[]>(DEMO_EMERGENCY_ALERTS);
  const [companionMemories, setCompanionMemories] = useState<CompanionMemory[]>([]);
  const [companionMemorySettings, setCompanionMemorySettings] = useState<CompanionMemorySettings>(() => {
    try {
      const raw = localStorage.getItem('janmasaathi_companion_memory_settings_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          historyEnabled: parsed?.historyEnabled !== false,
          useProfileContext: parsed?.useProfileContext !== false,
          allowTimelineSavePrompt: parsed?.allowTimelineSavePrompt !== false,
        };
      }
    } catch {
      // ignore
    }
    return {
      historyEnabled: true,
      useProfileContext: true,
      allowTimelineSavePrompt: true,
    };
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const { user, firebaseUid, isFirebaseAuthenticated, firebaseAuthError } = useAuth();

  const activeMotherId =
    user?.role === 'mother' ? user.mcpId || user.id || null : null;
  const activeWorkerId =
    user?.role === 'worker' ? user.staffId || user.id || null : null;

  const isRecordInActiveScope = useCallback(
    (
      kind:
        | 'mother'
        | 'assessment'
        | 'healthUpdate'
        | 'referral'
        | 'appointment'
        | 'message'
        | 'assignment'
        | 'alert'
        | 'memory',
      item: any
    ): boolean => {
      if (!item) return false;
      if (!user?.role || user.role === 'supervisor') return true;
      if (user.role === 'mother') {
        if (!activeMotherId) return false;
        if (kind === 'mother') return item.id === activeMotherId;
        if (kind === 'assignment') return false;
        if (kind === 'message') {
          return item.motherId === activeMotherId || item.senderId === activeMotherId;
        }
        return item.motherId === activeMotherId;
      }
      if (user.role === 'worker') {
        if (!activeWorkerId) return false;
        if (kind === 'mother') return item.assignedWorkerId === activeWorkerId;
        if (kind === 'healthUpdate') return item.assignedHealthWorkerId === activeWorkerId;
        if (kind === 'assignment' || kind === 'alert') {
          return item.assignedWorkerId === activeWorkerId || item.raisedById === activeWorkerId;
        }
        if (kind === 'message') return item.workerId === activeWorkerId;
        if (kind === 'memory') return false;
        return item.workerId === activeWorkerId;
      }
      return false;
    },
    [user?.role, activeMotherId, activeWorkerId]
  );

  // 1. Restore role-scoped local IndexedDB drafts
  const restoreLocalData = useCallback(async () => {
    try {
      const [
        rawMothers,
        rawAssessments,
        rawUpdates,
        rawRefs,
        rawAlerts,
        rawMsgs,
        rawMemories,
      ] = await Promise.all([
        getLocalDrafts<Mother>('maternalProfiles'),
        getLocalDrafts<MaternalAssessment>('assessmentDrafts'),
        getLocalDrafts<HealthUpdate>('healthUpdateDrafts'),
        getLocalDrafts<Referral>('referralDrafts'),
        getLocalDrafts<EmergencyAlert>('emergencyAlertDrafts'),
        getLocalDrafts<DirectMessage>('messageDrafts'),
        getLocalDrafts<CompanionMemory>('companionMemories'),
      ]);

      const localMothers = rawMothers.filter((m) => isRecordInActiveScope('mother', m));
      const localAssessments = rawAssessments.filter((a) => isRecordInActiveScope('assessment', a));
      const localUpdates = rawUpdates.filter((u) => isRecordInActiveScope('healthUpdate', u));
      const localRefs = rawRefs.filter((r) => isRecordInActiveScope('referral', r));
      const localAlerts = rawAlerts.filter((a) => isRecordInActiveScope('alert', a));
      const localMsgs = rawMsgs.filter((m) => isRecordInActiveScope('message', m));
      const localMemories = rawMemories.filter((m) => isRecordInActiveScope('memory', m));

      if (localMothers.length > 0) {
        setMothers((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newDrafts = localMothers.filter((m) => !existingIds.has(m.id));
          return [...newDrafts, ...prev];
        });
      }

      if (localAssessments.length > 0) {
        setAssessments((prev) => {
          const existingIds = new Set(prev.map((a) => a.id));
          const newDrafts = localAssessments.filter((a) => !existingIds.has(a.id));
          return [...newDrafts, ...prev];
        });
      }

      if (localUpdates.length > 0) {
        setHealthUpdates((prev) => {
          const existingIds = new Set(prev.map((u) => u.healthUpdateId));
          const newDrafts = localUpdates.filter((u) => !existingIds.has(u.healthUpdateId));
          return [...newDrafts, ...prev];
        });
      }

      if (localRefs.length > 0) {
        setReferrals((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const newDrafts = localRefs.filter((r) => !existingIds.has(r.id));
          return [...newDrafts, ...prev];
        });
      }

      if (localAlerts.length > 0) {
        setEmergencyAlerts((prev) => {
          const merged = new Map<string, EmergencyAlert>();
          prev.forEach((a) => merged.set(a.id, a));
          localAlerts.forEach((a) => {
            const existing = merged.get(a.id);
            if (!existing || (a as any).syncState === 'pending_sync') {
              merged.set(a.id, {
                ...a,
                syncStatus: (a as any).syncState === 'synced' ? 'synced' : 'pending_sync',
              });
            }
          });
          return sortAndDeduplicateEmergencyAlerts(Array.from(merged.values()));
        });
      }

      if (localMsgs.length > 0) {
        setMessages((prev) => sortAndDeduplicateMessages([...prev, ...localMsgs]));
      }

      if (localMemories.length > 0) {
        setCompanionMemories((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const fresh = localMemories.filter((m) => !existingIds.has(m.id));
          return [...fresh, ...prev];
        });
      }
    } catch (err) {
      console.warn('IndexedDB local restoration notice:', err);
    }
  }, [isRecordInActiveScope]);

  useEffect(() => {
    initAutoSyncTriggers(() => user?.id);

    const handleSyncedEvent = () => {
      restoreLocalData();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('janmasaathi:synced', handleSyncedEvent);
      return () => {
        window.removeEventListener('janmasaathi:synced', handleSyncedEvent);
      };
    }
  }, [restoreLocalData, user]);

  useEffect(() => {
    if (user?.id && isFirebaseAuthenticated) {
      triggerBackgroundSync(user.id);
    }
  }, [user, isFirebaseAuthenticated]);

  // 2. Role-scoped real-time Firestore subscriptions (or strict role-scoped local fallback when Firebase Auth is unavailable)
  useEffect(() => {
    let cancelled = false;
    const hasFirebaseSession = Boolean(isFirebaseAuthenticated || firebaseUid || auth?.currentUser);
    const scopeOpts = {
      role: user?.role || null,
      motherId: activeMotherId,
      workerId: activeWorkerId,
      isFirebaseAuthenticated: hasFirebaseSession,
    };

    if (!hasFirebaseSession || !user?.role) {
      setIsLoading(true);
      setMothers(DEMO_MOTHERS.filter((m) => isRecordInActiveScope('mother', m)));
      setAssessments(DEMO_ASSESSMENTS.filter((a) => isRecordInActiveScope('assessment', a)));
      setHealthUpdates(DEMO_HEALTH_UPDATES.filter((u) => isRecordInActiveScope('healthUpdate', u)));
      setReferrals(DEMO_REFERRALS.filter((r) => isRecordInActiveScope('referral', r)));
      setAppointments(DEMO_APPOINTMENTS.filter((a) => isRecordInActiveScope('appointment', a)));
      setMessages(
        sortAndDeduplicateMessages(
          DEMO_MESSAGES.filter((m) => isRecordInActiveScope('message', m))
        )
      );
      setVillageAllocations(
        DEMO_VILLAGE_ALLOCATIONS.filter((a) => isRecordInActiveScope('assignment', a))
      );
      setEmergencyAlerts(
        sortAndDeduplicateEmergencyAlerts(
          DEMO_EMERGENCY_ALERTS.filter((a) => isRecordInActiveScope('alert', a))
        )
      );
      setCompanionMemories([]);
      setDbError(user?.role ? firebaseAuthError || null : null);
      restoreLocalData().finally(() => {
        if (!cancelled) setIsLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }

    // Authenticated Cloud Firestore session: clear stale cross-account state and subscribe strictly to live queries
    setIsLoading(true);
    setDbError(null);
    setMothers([]);
    setAssessments([]);
    setHealthUpdates([]);
    setReferrals([]);
    setAppointments([]);
    setMessages([]);
    setVillageAllocations([]);
    setEmergencyAlerts([]);
    setCompanionMemories([]);
    restoreLocalData();

    const unsubs: (() => void)[] = [];
    const handleSubError = (label: string) => (err: Error) => {
      console.error(`Firestore ${label} subscription failed:`, err.message);
      if (!cancelled) {
        setDbError(`Firestore ${label} query failed: ${err.message}`);
      }
    };

    try {
      unsubs.push(
        subscribeMothers(
          scopeOpts,
          (liveMothers) => {
            if (cancelled) return;
            setMothers((prev) => {
              const localDrafts = prev.filter((m) => (m as any).syncState === 'pending_sync');
              const liveIds = new Set(liveMothers.map((m) => m.id));
              const unSynced = localDrafts.filter((m) => !liveIds.has(m.id));
              return [...unSynced, ...liveMothers];
            });
            setIsLoading(false);
          },
          handleSubError('mothers')
        )
      );

      unsubs.push(
        subscribeWorkers(
          scopeOpts,
          (liveWorkers) => {
            if (!cancelled && liveWorkers.length > 0) setWorkers(liveWorkers);
          },
          handleSubError('healthWorkers')
        )
      );

      unsubs.push(
        subscribeSupervisors(
          scopeOpts,
          (liveSups) => {
            if (!cancelled && liveSups.length > 0) setSupervisor(liveSups[0]);
          },
          handleSubError('supervisors')
        )
      );

      unsubs.push(
        subscribeAssessments(
          scopeOpts,
          (liveAssessments) => {
            if (cancelled) return;
            setAssessments((prev) => {
              const localDrafts = prev.filter((a) => (a as any).syncState === 'pending_sync');
              const liveIds = new Set(liveAssessments.map((a) => a.id));
              const unSynced = localDrafts.filter((a) => !liveIds.has(a.id));
              return [...unSynced, ...liveAssessments];
            });
          },
          handleSubError('assessments')
        )
      );

      unsubs.push(
        subscribeHealthUpdates(
          scopeOpts,
          (liveUpdates) => {
            if (cancelled) return;
            setHealthUpdates((prev) => {
              const localDrafts = prev.filter((u) => (u as any).syncState === 'pending_sync');
              const liveIds = new Set(liveUpdates.map((u) => u.healthUpdateId));
              const unSynced = localDrafts.filter((u) => !liveIds.has(u.healthUpdateId));
              return [...unSynced, ...liveUpdates];
            });
          },
          handleSubError('healthUpdates')
        )
      );

      unsubs.push(
        subscribeReferrals(
          scopeOpts,
          (liveRefs) => {
            if (cancelled) return;
            setReferrals((prev) => {
              const localDrafts = prev.filter((r) => (r as any).syncState === 'pending_sync');
              const liveIds = new Set(liveRefs.map((r) => r.id));
              const unSynced = localDrafts.filter((r) => !liveIds.has(r.id));
              return [...unSynced, ...liveRefs];
            });
          },
          handleSubError('referrals')
        )
      );

      unsubs.push(
        subscribeAppointments(
          scopeOpts,
          (liveAppts) => {
            if (!cancelled) setAppointments(liveAppts);
          },
          handleSubError('appointments')
        )
      );

      unsubs.push(
        subscribeAssignments(
          scopeOpts,
          (liveAssignments) => {
            if (!cancelled) setVillageAllocations(liveAssignments);
          },
          handleSubError('assignments')
        )
      );

      if (user.role === 'supervisor') {
        ensureAuthorizedHospitalsSeeded().catch(() => {});
      }

      unsubs.push(
        subscribeHospitals(
          scopeOpts,
          (liveHospitals) => {
            if (cancelled) return;
            const liveById = new Map(liveHospitals.map((h) => [h.id, h]));
            const mergedHospitals = AUTHORIZED_HOSPITALS.map(
              (authHosp) => liveById.get(authHosp.id) || authHosp
            );
            setHospitals(mergedHospitals);
          },
          handleSubError('hospitals')
        )
      );

      unsubs.push(
        subscribeMessages(
          scopeOpts,
          (liveMsgs) => {
            if (cancelled) return;
            setMessages((prev) => {
              const localDrafts = prev.filter((m) => (m as any).syncState === 'pending_sync');
              const liveIds = new Set(liveMsgs.map((m) => m.id));
              const unSynced = localDrafts.filter((m) => !liveIds.has(m.id));
              return sortAndDeduplicateMessages([...unSynced, ...liveMsgs]);
            });
          },
          handleSubError('messages')
        )
      );

      if (user.role === 'mother' && activeMotherId) {
        unsubs.push(
          subscribeCompanionMemories(
            activeMotherId,
            (liveMemories) => {
              if (cancelled) return;
              setCompanionMemories((prev) => {
                const localOnly = prev.filter((m) => (m as any).syncState === 'pending_sync');
                const liveIds = new Set(liveMemories.map((m) => m.id));
                return [...localOnly.filter((m) => !liveIds.has(m.id)), ...liveMemories];
              });
            },
            handleSubError('companionMemories')
          )
        );
      }

      unsubs.push(
        subscribeEmergencyAlerts(
          scopeOpts,
          (liveAlerts) => {
            if (cancelled) return;
            setEmergencyAlerts((prev) => {
              const pendingDrafts = prev.filter(
                (a) => a.syncStatus === 'pending_sync' || (a as any).syncState === 'pending_sync'
              );
              const liveIds = new Set(liveAlerts.map((a) => a.id));
              const unSynced = pendingDrafts.filter((a) => !liveIds.has(a.id));
              const scopedDemoDefaults = DEMO_EMERGENCY_ALERTS.filter(
                (a) =>
                  isRecordInActiveScope('alert', a) &&
                  !liveIds.has(a.id) &&
                  !unSynced.some((d) => d.id === a.id)
              );
              return sortAndDeduplicateEmergencyAlerts([
                ...unSynced,
                ...liveAlerts.map((a) => ({ ...a, syncStatus: 'synced' as const })),
                ...scopedDemoDefaults,
              ]);
            });
          },
          handleSubError('emergencyAlerts')
        )
      );
    } catch (err: any) {
      console.error('Firestore live subscription initialization error:', err.message);
      setDbError(err.message || 'Failed to subscribe to Cloud Firestore');
    } finally {
      setIsLoading(false);
    }

    return () => {
      cancelled = true;
      unsubs.forEach((unsub) => unsub());
    };
  }, [
    user?.role,
    user?.id,
    activeMotherId,
    activeWorkerId,
    firebaseUid,
    isFirebaseAuthenticated,
    firebaseAuthError,
    isRecordInActiveScope,
    restoreLocalData,
  ]);

  // 3. Save snapshot to local cache for instant fallback
  useEffect(() => {
    try {
      localStorage.setItem(
        LOCAL_CACHE_KEY,
        JSON.stringify({
          mothers,
          workers,
          assessments,
          healthUpdates,
          referrals,
          emergencyAlerts,
          appointments,
          messages,
        })
      );
    } catch {
      // ignore
    }
  }, [mothers, workers, assessments, healthUpdates, referrals, emergencyAlerts, appointments, messages]);

  // MUTATIONS with Local-First IndexedDB Persistence

  const addHealthUpdate = useCallback(
    async (data: {
      motherId: string;
      motherName: string;
      observations: string;
      symptoms: string[];
      notes: string;
      submittedBy?: string;
    }): Promise<HealthUpdate> => {
      const mother = mothers.find((m) => m.id === data.motherId);
      const newUpdateId = `HUPD-${Date.now().toString().slice(-6)}`;
      const nowFormatted = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      const newUpdate: HealthUpdate = {
        healthUpdateId: newUpdateId,
        motherId: data.motherId,
        motherName: data.motherName,
        assignedHealthWorkerId: mother?.assignedWorkerId || user?.assignedWorkerId || 'HW-44120',
        assignedHealthWorkerName: mother?.assignedWorkerName || user?.assignedWorkerName || 'Sunita Devi',
        submittedAt: nowFormatted,
        observations: data.observations,
        symptoms: data.symptoms,
        notes: data.notes,
        reviewStatus: 'pending',
        submittedBy: data.submittedBy || 'mother-auth-user',
        isSynthetic: false,
        sourceLanguage: 'en',
        originalText: data.observations,
        translations: {
          observations: {
            en: data.observations,
            hi: localizeDynamicText(data.observations, 'hi'),
            or: localizeDynamicText(data.observations, 'or'),
          },
          notes: {
            en: data.notes,
            hi: localizeDynamicText(data.notes, 'hi'),
            or: localizeDynamicText(data.notes, 'or'),
          },
        },
      };

      // Save to IndexedDB object store
      await saveLocalDraft('healthUpdateDrafts', {
        ...newUpdate,
        id: newUpdateId,
        owningUid: user?.id || data.motherId,
        relatedMotherId: data.motherId,
        syncState: 'pending_sync',
      });

      if (typeof navigator !== 'undefined' && navigator.onLine && auth?.currentUser) {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Firestore write timeout')), 10000)
          );
          await Promise.race([createHealthUpdateRecord(newUpdate), timeoutPromise]);
          await updateLocalSyncState('healthUpdateDrafts', newUpdateId, 'synced');
          try {
            await logAuditEvent('CREATE_HEALTH_UPDATE', data.motherId, 'mother', 'healthUpdates', newUpdateId, {
              observations: data.observations,
            });
          } catch {
            // secondary
          }
        } catch (err: any) {
          console.warn('Health update saved locally (queued for offline sync):', err);
          const msg = err?.message || String(err);
          if (msg.toLowerCase().includes('permission') || msg.includes('PERMISSION_DENIED')) {
            setDbError(`Health update Firestore write rejected: ${msg}`);
          }
        }
      }

      setHealthUpdates((prev) => [newUpdate, ...prev]);
      if (auth?.currentUser) triggerBackgroundSync(user?.id);
      return newUpdate;
    },
    [mothers, user]
  );

  const reviewHealthUpdate = useCallback(
    async (healthUpdateId: string, reviewedBy: string, reviewNotes: string): Promise<void> => {
      try {
        await updateHealthUpdateReview(healthUpdateId, reviewedBy, reviewNotes);
        await logAuditEvent('REVIEW_HEALTH_UPDATE', reviewedBy, 'worker', 'healthUpdates', healthUpdateId, {
          reviewNotes,
        });
      } catch (err) {
        console.warn('Realtime Firestore write fallback:', err);
      }

      setHealthUpdates((prev) =>
        prev.map((u) =>
          u.healthUpdateId === healthUpdateId
            ? {
                ...u,
                reviewStatus: 'reviewed',
                reviewedBy,
                reviewNotes,
                reviewedAt: new Date().toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }),
              }
            : u
        )
      );
    },
    []
  );

  const addAssessment = useCallback(
    async (
      assessmentData: Omit<MaternalAssessment, 'id' | 'recordedAt' | 'isSynthetic'>
    ): Promise<MaternalAssessment> => {
      const newId = `ASMT-${assessmentData.motherId}-${Date.now().toString().slice(-4)}`;
      const recordedAtFormatted = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      const targetMother = mothers.find((m) => m.id === assessmentData.motherId);
      let newAssessment: MaternalAssessment = {
        ...assessmentData,
        id: newId,
        recordedAt: recordedAtFormatted,
        isSynthetic: targetMother?.isSynthetic || false,
      };

      // If prediction missing or calculated offline, evaluate local deterministic ML Decision Tree
      if (!newAssessment.modelPrediction) {
        const rawAge = newAssessment.originalMeasurements?.age;
        const ageNum = typeof rawAge === 'number' ? rawAge : typeof (rawAge as any)?.value === 'number' ? (rawAge as any).value : targetMother?.age || 24;

        const localEval = evaluateMaternalRiskLocally({
          age: ageNum,
          systolicBP: newAssessment.systolicBP,
          diastolicBP: newAssessment.diastolicBP,
          bloodSugar: newAssessment.bloodGlucose,
          bodyTemp: newAssessment.bodyTemp,
          heartRate: newAssessment.heartRate,
        });

        if (localEval.success && localEval.modelPrediction) {
          newAssessment.modelPrediction = localEval.modelPrediction as any;
          newAssessment.featureExplanations = localEval.modelPrediction.contributingFeatures;
        }
      }

      // Independent Clinical Danger-Sign Screening evaluation
      if (!newAssessment.clinicalScreeningResult) {
        newAssessment.clinicalScreeningResult = evaluateClinicalObservations(
          {
            gestationalWeek: newAssessment.gestationalWeek,
            systolicBP: newAssessment.systolicBP,
            diastolicBP: newAssessment.diastolicBP,
            heartRate: newAssessment.heartRate,
            bodyTemp: newAssessment.bodyTemp,
            hemoglobin: newAssessment.hemoglobin,
            fundalHeight: newAssessment.fundalHeight,
            fetalHeartRate: newAssessment.fetalHeartRate,
            fetalMovementStatus: newAssessment.fetalMovementStatus,
            dangerSigns: newAssessment.dangerSigns || [],
            symptomsNotes: newAssessment.symptomsNotes,
          },
          newAssessment.modelPrediction?.riskCategory || 'Low'
        );
      }

      // 1. Guaranteed local storage write in IndexedDB
      await saveLocalDraft('assessmentDrafts', {
        ...newAssessment,
        owningUid: assessmentData.workerId,
      });

      // 2. Online write attempt with Cloud Firestore
      if (typeof navigator !== 'undefined' && navigator.onLine && auth?.currentUser) {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Firestore write timeout')), 10000)
          );
          await Promise.race([createAssessmentRecord(newAssessment), timeoutPromise]);
          await updateLocalSyncState('assessmentDrafts', newId, 'synced');
          try {
            await logAuditEvent('CREATE_ASSESSMENT', assessmentData.workerId, 'worker', 'assessments', newId, {
              motherId: assessmentData.motherId,
            });
          } catch {
            // secondary
          }
        } catch (err: any) {
          console.warn('Assessment saved locally (queued for offline sync):', err?.message);
        }
      } else {
        console.log('Local-first draft mode: assessment saved in IndexedDB draft queue');
      }

      setAssessments((prev) => [newAssessment, ...prev]);

      // Update mother's last visit summary
      setMothers((prev) =>
        prev.map((m) =>
          m.id === assessmentData.motherId
            ? {
                ...m,
                lastVisitDate: recordedAtFormatted,
                lastVisitSummary: `Antenatal Assessment: BP ${assessmentData.systolicBP}/${assessmentData.diastolicBP}`,
              }
            : m
        )
      );

      if (auth?.currentUser) triggerBackgroundSync(user?.id);
      return newAssessment;
    },
    [mothers, user?.id]
  );

  const reviewAssessment = useCallback(
    async (
      id: string,
      status: 'signed_off' | 'clarification_requested',
      notes: string,
      reviewedBy: string = 'Dr. Rajesh Kumar'
    ): Promise<void> => {
      try {
        await updateAssessmentReview(id, status, notes, reviewedBy);
        await logAuditEvent('REVIEW_ASSESSMENT', reviewedBy, 'supervisor', 'assessments', id, {
          status,
          notes,
        });
      } catch (err) {
        console.warn('Realtime Firestore write fallback:', err);
      }

      setAssessments((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                supervisorReviewStatus: status,
                supervisorNotes: notes,
              }
            : a
        )
      );
    },
    []
  );

  const addReferral = useCallback(
    async (
      referralData: Omit<Referral, 'id' | 'createdAt' | 'status' | 'isSynthetic'>
    ): Promise<Referral> => {
      const newId = `REF-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const newReferral: Referral = {
        ...referralData,
        id: newId,
        status: 'initiated',
        createdAt: new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        isSynthetic: false,
      };

      await saveLocalDraft('referralDrafts', newReferral);

      if (typeof navigator !== 'undefined' && navigator.onLine && auth?.currentUser) {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Firestore write timeout')), 10000)
          );
          await Promise.race([createReferralRecord(newReferral), timeoutPromise]);
          await updateLocalSyncState('referralDrafts', newId, 'synced');
          try {
            await logAuditEvent('CREATE_REFERRAL', referralData.workerId, 'worker', 'referrals', newId, {
              motherId: referralData.motherId,
              priority: referralData.priority,
              facility: referralData.referredToFacility,
            });
          } catch {
            // secondary
          }
        } catch (err) {
          console.warn('Referral saved locally (queued for offline sync):', err);
        }
      }

      setReferrals((prev) => [newReferral, ...prev]);
      if (auth?.currentUser) triggerBackgroundSync(user?.id);
      return newReferral;
    },
    [user?.id]
  );

  const updateReferralStatus = useCallback(
    async (
      id: string,
      status: Referral['status'],
      supervisorRemarks?: string
    ): Promise<void> => {
      try {
        await updateReferralStatusRecord(id, status, supervisorRemarks);
        await logAuditEvent('UPDATE_REFERRAL_STATUS', 'supervisor', 'supervisor', 'referrals', id, {
          status,
          supervisorRemarks,
        });
      } catch (err) {
        console.warn('Realtime Firestore write fallback:', err);
      }

      setReferrals((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status,
                ...(supervisorRemarks ? { supervisorRemarks } : {}),
              }
            : r
        )
      );
    },
    []
  );

  const allocateWorker = useCallback(
    async (
      allocationId: string,
      workerId: string,
      allocatedMotherIds?: string[]
    ): Promise<void> => {
      const worker = workers.find((w) => w.id === workerId);
      if (!worker) return;

      const allocation = villageAllocations.find((a) => a.id === allocationId);
      if (!allocation) return;

      const updatedAllocation: VillageAllocation = {
        ...allocation,
        assignedWorkerId: workerId,
        assignedWorkerName: worker.name,
      };

      try {
        await createOrUpdateAssignment(updatedAllocation, allocatedMotherIds);
        await logAuditEvent('ALLOCATE_WORKER', 'supervisor', 'supervisor', 'assignments', allocationId, {
          workerId,
          allocatedMotherIds,
        });
      } catch (err) {
        console.warn('Realtime Firestore write fallback:', err);
      }

      setVillageAllocations((prev) =>
        prev.map((a) => (a.id === allocationId ? updatedAllocation : a))
      );

      if (allocatedMotherIds && allocatedMotherIds.length > 0) {
        setMothers((prev) =>
          prev.map((m) =>
            allocatedMotherIds.includes(m.id)
              ? {
                  ...m,
                  assignedWorkerId: workerId,
                  assignedWorkerName: worker.name,
                }
              : m
          )
        );
      }
    },
    [workers, villageAllocations]
  );

  const sendMessage = useCallback(
    async (
      text: string,
      senderRole: 'mother' | 'worker',
      senderId: string,
      senderName: string,
      motherId?: string,
      options?: {
        sourceLanguage?: 'en' | 'hi' | 'or';
        receiverId?: string;
        workerId?: string;
      }
    ): Promise<void> => {
      const nowMs = Date.now();
      const newMsgId = `MSG-${nowMs}-${Math.floor(100 + Math.random() * 900)}`;
      const targetMotherId = motherId || (senderRole === 'mother' ? senderId : 'MCP-2026-0894');
      const matchedMother = mothers.find((m) => m.id === targetMotherId);
      const targetWorkerId =
        options?.workerId ||
        (senderRole === 'worker' ? senderId : matchedMother?.assignedWorkerId || 'HW-44120');
      const targetReceiverId =
        options?.receiverId || (senderRole === 'mother' ? targetWorkerId : targetMotherId);
      const conversationId = `conv_${targetMotherId}_${targetWorkerId}`;

      const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
      const timeStr = new Date(nowMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const srcLang = options?.sourceLanguage || 'en';

      const newMsg: DirectMessage = {
        id: newMsgId,
        type: 'text',
        conversationId,
        senderId,
        senderName,
        senderRole,
        motherId: targetMotherId,
        workerId: targetWorkerId,
        receiverId: targetReceiverId,
        recipientId: targetReceiverId,
        text,
        timestamp: timeStr,
        sentAtMs: nowMs,
        delivered: false,
        read: false,
        syncStatus: 'pending_sync',
        retryCount: 0,
        lastAttemptAt: new Date(nowMs).toISOString(),
        sourceLanguage: srcLang,
        originalText: text,
        translations: {
          text: {
            en: srcLang === 'en' ? text : text,
            hi: srcLang === 'hi' ? text : srcLang === 'or' ? text : localizeDynamicText(text, 'hi'),
            or: srcLang === 'or' ? text : srcLang === 'hi' ? text : localizeDynamicText(text, 'or'),
          },
        },
      };

      // 1. Store locally in IndexedDB first before network attempt
      await saveLocalDraft('messageDrafts', {
        ...newMsg,
        owningUid: senderId,
        relatedMotherId: targetMotherId,
        syncState: 'pending_sync',
      });

      // 2. Immediately update local React state for instantaneous UI feedback
      setMessages((prev) => sortAndDeduplicateMessages([...prev, newMsg]));

      // 3. Attempt network transmission to Cloud Firestore when online & Firebase-authenticated
      if (isOnline && auth?.currentUser) {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Firestore write timeout')), 10000)
          );
          const syncedMessage: DirectMessage = {
            ...newMsg,
            delivered: true,
            syncStatus: 'delivered',
          };
          await Promise.race([createDirectMessage(syncedMessage), timeoutPromise]);

          // Mark synced in IndexedDB object store
          await saveLocalDraft('messageDrafts', {
            ...syncedMessage,
            owningUid: senderId,
            relatedMotherId: targetMotherId,
            syncState: 'synced',
          });

          // Update status in React state
          setMessages((prev) =>
            sortAndDeduplicateMessages(prev.map((m) => (m.id === newMsgId ? syncedMessage : m)))
          );
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          console.warn('Direct message Firestore write failed (preserved in local draft):', errMsg);
          if (errMsg.toLowerCase().includes('permission') || errMsg.includes('PERMISSION_DENIED')) {
            await updateLocalSyncState('messageDrafts', newMsgId, 'auth_error', errMsg);
            setMessages((prev) =>
              sortAndDeduplicateMessages(
                prev.map((m) => (m.id === newMsgId ? { ...m, syncStatus: 'failed' } : m))
              )
            );
            setDbError(`Message delivery rejected by Firestore rules: ${errMsg}`);
          } else {
            triggerBackgroundSync(user?.id);
          }
        }
      } else {
        if (firebaseAuthError) {
          setDbError(firebaseAuthError);
        }
      }
    },
    [mothers, user?.id, firebaseAuthError]
  );

  const inFlightVoiceUploadRef = React.useRef<boolean>(false);

  const sendVoiceMessage = useCallback(
    async (params: {
      audioBlob: Blob;
      mimeType: string;
      durationSeconds: number;
      senderRole: 'mother' | 'worker';
      senderId: string;
      senderName: string;
      motherId?: string;
      workerId?: string;
      receiverId?: string;
      onProgress?: (percent: number) => void;
    }): Promise<DirectMessage> => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new Error('Internet connection is required to send voice messages.');
      }

      if (inFlightVoiceUploadRef.current) {
        throw new Error('A voice message upload is already in progress.');
      }
      inFlightVoiceUploadRef.current = true;

      try {
        const nowMs = Date.now();
        const targetMotherId =
          params.motherId || (params.senderRole === 'mother' ? params.senderId : 'MCP-2026-0894');
        const matchedMother = mothers.find((m) => m.id === targetMotherId);
        const targetWorkerId =
          params.workerId ||
          (params.senderRole === 'worker' ? params.senderId : matchedMother?.assignedWorkerId || 'HW-44120');
        const matchedWorker = workers.find((w) => w.id === targetWorkerId);
        const targetReceiverId =
          params.receiverId || (params.senderRole === 'mother' ? targetWorkerId : targetMotherId);
        const recipientAuthUid =
          params.senderRole === 'mother'
            ? matchedWorker?.authUid || null
            : matchedMother?.authUid || null;
        const conversationId = `conv_${targetMotherId}_${targetWorkerId}`;
        const newMsgId = `MSG-${nowMs}-${Math.floor(100 + Math.random() * 900)}`;

        const uploaded = await uploadVoiceMessageAudio({
          blob: params.audioBlob,
          mimeType: params.mimeType,
          conversationId,
          messageId: newMsgId,
          motherId: targetMotherId,
          workerId: targetWorkerId,
          senderId: params.senderId,
          senderRole: params.senderRole,
          recipientAuthUid,
          onProgress: params.onProgress,
        });

        const timeStr = new Date(nowMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const hasFirebaseSession = Boolean(auth?.currentUser?.uid);
        const voiceMsg: DirectMessage = {
          id: newMsgId,
          type: 'audio',
          conversationId,
          senderId: params.senderId,
          senderName: params.senderName,
          senderRole: params.senderRole,
          ...(uploaded.uploaderAuthUid ? { senderAuthUid: uploaded.uploaderAuthUid } : {}),
          ...(recipientAuthUid ? { receiverAuthUid: recipientAuthUid } : {}),
          motherId: targetMotherId,
          workerId: targetWorkerId,
          receiverId: targetReceiverId,
          recipientId: targetReceiverId,
          text: 'Voice message',
          audioStoragePath: uploaded.audioStoragePath,
          audioDownloadUrl: uploaded.audioDownloadUrl,
          audioMimeType: uploaded.audioMimeType,
          audioDuration: Math.max(1, Math.round(params.durationSeconds || 1)),
          audioFileSize: uploaded.audioFileSize,
          timestamp: timeStr,
          sentAtMs: nowMs,
          uploadStatus: 'uploaded',
          delivered: hasFirebaseSession,
          read: false,
          syncStatus: hasFirebaseSession ? 'delivered' : 'pending_sync',
          lastAttemptAt: new Date(nowMs).toISOString(),
        };

        if (hasFirebaseSession) {
          try {
            await createDirectMessage(voiceMsg);
          } catch (err) {
            await deleteVoiceMessageAudio(uploaded.audioStoragePath);
            throw err;
          }
        } else if (firebaseAuthError) {
          setDbError(firebaseAuthError);
        }

        await saveLocalDraft('messageDrafts', {
          ...voiceMsg,
          owningUid: params.senderId,
          relatedMotherId: targetMotherId,
          syncState: hasFirebaseSession ? 'synced' : 'pending_sync',
        });

        setMessages((prev) => sortAndDeduplicateMessages([...prev, voiceMsg]));
        return voiceMsg;
      } finally {
        inFlightVoiceUploadRef.current = false;
      }
    },
    [mothers, workers, firebaseAuthError]
  );

  const markMessagesAsRead = useCallback(
    async (motherId: string, readerRole?: 'mother' | 'worker', workerId?: string): Promise<void> => {
      const unreadIds: string[] = [];
      setMessages((prev) =>
        prev.map((m) => {
          const belongsToThread =
            (m.motherId === motherId || m.senderId === motherId) &&
            (!workerId || !m.workerId || m.workerId === workerId);
          const isIncoming = readerRole ? m.senderRole !== readerRole : true;
          if (belongsToThread && isIncoming && !m.read) {
            unreadIds.push(m.id);
            return { ...m, read: true };
          }
          return m;
        })
      );

      if (unreadIds.length > 0 && typeof navigator !== 'undefined' && navigator.onLine && auth?.currentUser) {
        markDirectMessagesReadInFirestore(unreadIds).catch((err) => {
          console.warn('Read receipt update notice:', err);
        });
      }
    },
    []
  );

  const registerMother = useCallback(
    async (motherData: Omit<Mother, 'id' | 'isSynthetic'>): Promise<Mother> => {
      const newId = `MCP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const newMother: Mother = {
        ...motherData,
        id: newId,
        authUid: null,
        isSynthetic: false,
      };

      await saveLocalDraft('maternalProfiles', {
        ...newMother,
        owningUid: motherData.assignedWorkerId,
        creatingWorkerId: motherData.assignedWorkerId,
        syncState: 'pending_sync',
      });

      if (auth?.currentUser) {
        try {
          await createMotherRecord(newMother);
          await updateLocalSyncState('maternalProfiles', newId, 'synced');
          try {
            await logAuditEvent('REGISTER_MOTHER', motherData.assignedWorkerId, 'worker', 'mothers', newId, {
              mcpCardNumber: motherData.mcpCardNumber,
              name: motherData.name,
            });
          } catch {
            // audit log is secondary to registration
          }
        } catch (err: any) {
          console.warn('Mother registration saved locally (queued for offline sync):', err?.message);
        }
      }

      setMothers((prev) => [newMother, ...prev]);
      if (auth?.currentUser) triggerBackgroundSync(user?.id);
      return newMother;
    },
    [user?.id]
  );

  const saveCompanionMemory = useCallback(
    async (data: {
      motherId: string;
      title: string;
      summary: string;
      topic: CompanionMemory['topic'];
      language: CompanionMemory['language'];
      gestationalWeek: number;
    }): Promise<CompanionMemory> => {
      const nowIso = new Date().toISOString();
      const nowLabel = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const newMemory: CompanionMemory = {
        id: `MEM-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        motherId: data.motherId,
        title: data.title.slice(0, 160),
        summary: data.summary.slice(0, 2000),
        topic: data.topic,
        language: data.language,
        gestationalWeek: data.gestationalWeek,
        consentedByMother: true,
        consentedAt: nowIso,
        savedAt: nowLabel,
        sourceType: 'ai_companion_summary',
        isClinicalRecord: false,
      };

      await saveLocalDraft('companionMemories', {
        ...newMemory,
        owningUid: data.motherId,
        relatedMotherId: data.motherId,
        syncState: 'pending_sync',
      });
      setCompanionMemories((prev) => [newMemory, ...prev]);

      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Firestore write timeout')), 1800)
          );
          await Promise.race([createCompanionMemoryRecord(newMemory), timeoutPromise]);
          await updateLocalSyncState('companionMemories', newMemory.id, 'synced');
        } catch (err) {
          console.warn('Companion memory saved locally (queued/offline fallback):', err);
        }
      }

      return newMemory;
    },
    []
  );

  const deleteCompanionMemory = useCallback(async (memoryId: string): Promise<void> => {
    setCompanionMemories((prev) => prev.filter((m) => m.id !== memoryId));
    try {
      await deleteLocalDraft('companionMemories', memoryId);
    } catch {
      // ignore
    }
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        await deleteCompanionMemoryRecord(memoryId);
      } catch (err) {
        console.warn('Remote companion memory delete notice:', err);
      }
    }
  }, []);

  const clearAllCompanionMemories = useCallback(
    async (motherId: string): Promise<void> => {
      const toDelete = companionMemories.filter((m) => m.motherId === motherId);
      setCompanionMemories((prev) => prev.filter((m) => m.motherId !== motherId));
      for (const item of toDelete) {
        try {
          await deleteLocalDraft('companionMemories', item.id);
          if (typeof navigator !== 'undefined' && navigator.onLine) {
            await deleteCompanionMemoryRecord(item.id).catch(() => {});
          }
        } catch {
          // ignore
        }
      }
    },
    [companionMemories]
  );

  const updateCompanionMemorySettings = useCallback(
    (updates: Partial<CompanionMemorySettings>) => {
      setCompanionMemorySettings((prev) => {
        const next = { ...prev, ...updates };
        try {
          localStorage.setItem('janmasaathi_companion_memory_settings_v1', JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    []
  );

  const raiseEmergencyAlert = useCallback(
    async (data: {
      motherId: string;
      motherName?: string;
      motherPhone?: string;
      motherAge?: number;
      gestationalAgeWeeks?: number;
      village?: string;
      hamlet?: string;
      assignedWorkerId?: string;
      assignedWorkerName?: string;
      raisedByRole: 'mother' | 'worker' | 'supervisor';
      raisedById: string;
      raisedByName: string;
      targetHospitalId: string;
      concernCategory: EmergencyAlertConcernCategory;
      concernLabel: string;
      urgency: EmergencyAlertUrgency;
      symptoms: string[];
      description: string;
      additionalHealthInfo?: string;
      attachedAssessmentId?: string;
      attachedAssessmentSummary?: string;
      vitals?: EmergencyAlertVitals;
      dangerSigns?: string[];
      transportRequested?: boolean;
    }): Promise<EmergencyAlert> => {
      const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
      const clientNowMs = Date.now();
      let alertId = `ALT-${clientNowMs}-${Math.floor(100 + Math.random() * 900)}`;

      const matchedMother = mothers.find((m) => m.id === data.motherId);
      let matchedHospital =
        hospitals.find((h) => h.id === data.targetHospitalId) || AUTHORIZED_HOSPITALS[0];

      let resolvedWorkerId = data.assignedWorkerId || matchedMother?.assignedWorkerId || 'HW-44120';
      let resolvedWorkerName =
        data.assignedWorkerName || matchedMother?.assignedWorkerName || 'Sunita Devi';
      let resolvedSupervisorId = supervisor.id || 'SUP-2025-012';
      let resolvedRaisedByRole = data.raisedByRole;
      let resolvedRaisedById = data.raisedById;
      let provenanceVerifiedByServer = false;
      let serverCreatedAtMs: number | undefined;
      let serverCreatedAtIso: string | undefined;
      let serverProvenanceId: string | undefined;

      // 0. Trusted backend validation when online (blocks unauthorized cross-mother/worker/hospital requests)
      if (isOnline) {
        try {
          const serverAuth = await authorizeEmergencyAlertWithServer({
            alertId,
            motherId: data.motherId,
            assignedWorkerId: resolvedWorkerId,
            assignedWorkerName: resolvedWorkerName,
            targetHospitalId: matchedHospital.id,
            concernCategory: data.concernCategory,
            urgency: data.urgency,
            description: data.description,
            status: 'pending_acknowledgement',
          });
          if (serverAuth) {
            alertId = serverAuth.alertId;
            resolvedWorkerId = serverAuth.verifiedAssignedWorkerId;
            resolvedWorkerName = serverAuth.verifiedAssignedWorkerName;
            resolvedSupervisorId = serverAuth.verifiedSupervisorId;
            resolvedRaisedByRole = serverAuth.verifiedRaisedByRole;
            resolvedRaisedById = serverAuth.verifiedRaisedById;
            matchedHospital =
              hospitals.find((h) => h.id === serverAuth.verifiedHospital.id) || {
                ...matchedHospital,
                id: serverAuth.verifiedHospital.id,
                name: serverAuth.verifiedHospital.name,
                facilityType: serverAuth.verifiedHospital.facilityType,
              };
            provenanceVerifiedByServer = true;
            serverCreatedAtMs = serverAuth.serverTimestampMs;
            serverCreatedAtIso = serverAuth.serverTimestampIso;
            serverProvenanceId = serverAuth.serverProvenanceId;
          }
        } catch (authErr) {
          console.warn('Server alert authorization notice:', authErr);
        }
      }

      const nowMs = serverCreatedAtMs || clientNowMs;
      const timeLabel = new Date(nowMs).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const newAlert: EmergencyAlert = {
        id: alertId,
        motherId: data.motherId,
        motherName: (data.motherName || matchedMother?.name || 'Maternal Patient').slice(0, 160),
        motherPhone: data.motherPhone || matchedMother?.phone || '',
        motherAge: data.motherAge ?? matchedMother?.age,
        gestationalAgeWeeks: data.gestationalAgeWeeks ?? matchedMother?.gestationalAgeWeeks,
        village: data.village || matchedMother?.village || 'Village Rampur',
        hamlet: data.hamlet || matchedMother?.hamlet || 'Sector 4',
        assignedWorkerId: resolvedWorkerId,
        assignedWorkerName: resolvedWorkerName,
        supervisorId: resolvedSupervisorId,
        raisedByRole: resolvedRaisedByRole,
        raisedById: resolvedRaisedById,
        raisedByName: (data.raisedByName?.trim() || 'JanmaSaathi User').slice(0, 160),
        targetHospitalId: matchedHospital.id,
        targetHospitalName: matchedHospital.name.slice(0, 200),
        targetFacilityType: matchedHospital.facilityType,
        concernCategory: data.concernCategory.slice(0, 64) as EmergencyAlertConcernCategory,
        concernLabel: data.concernLabel.slice(0, 200),
        urgency: data.urgency,
        symptoms: (data.symptoms || []).slice(0, 20),
        description: data.description.slice(0, 3000),
        ...(data.additionalHealthInfo
          ? { additionalHealthInfo: data.additionalHealthInfo.slice(0, 1000) }
          : {}),
        ...(data.attachedAssessmentId ? { attachedAssessmentId: data.attachedAssessmentId } : {}),
        ...(data.attachedAssessmentSummary
          ? { attachedAssessmentSummary: data.attachedAssessmentSummary }
          : {}),
        ...(data.vitals ? { vitals: data.vitals } : {}),
        ...(data.dangerSigns && data.dangerSigns.length > 0
          ? { dangerSigns: data.dangerSigns }
          : {}),
        transportRequested: Boolean(data.transportRequested),
        status: 'pending_acknowledgement',
        createdAtMs: nowMs,
        createdAtIso: serverCreatedAtIso || new Date(nowMs).toISOString(),
        createdAtLabel: timeLabel,
        updatedAtMs: nowMs,
        provenanceVerifiedByServer,
        ...(serverCreatedAtMs ? { serverCreatedAtMs } : {}),
        ...(serverCreatedAtIso ? { serverCreatedAtIso } : {}),
        ...(serverProvenanceId ? { serverProvenanceId } : {}),
        acknowledgedAtMs: null,
        acknowledgedBy: null,
        hospitalResponse: null,
        hospitalUpdates: [],
        escalated: false,
        syncStatus: 'pending_sync',
        isSynthetic: Boolean(matchedMother?.isSynthetic && data.motherId.startsWith('MCP-2026-0')),
        translations: {
          concernLabel: {
            en: data.concernLabel,
            hi: localizeDynamicText(data.concernLabel, 'hi'),
            or: localizeDynamicText(data.concernLabel, 'or'),
          },
          description: {
            en: data.description,
            hi: localizeDynamicText(data.description, 'hi'),
            or: localizeDynamicText(data.description, 'or'),
          },
          targetHospitalName: matchedHospital.translations?.name || {
            en: matchedHospital.name,
            hi: localizeDynamicText(matchedHospital.name, 'hi'),
            or: localizeDynamicText(matchedHospital.name, 'or'),
          },
        },
      };

      // 1. Offline-first persistence in IndexedDB & localStorage fallback queue
      await saveLocalDraft('emergencyAlertDrafts', {
        ...newAlert,
        owningUid: resolvedRaisedById,
        relatedMotherId: data.motherId,
        creatingWorkerId: newAlert.assignedWorkerId,
        syncState: 'pending_sync',
      });
      queueOfflineEmergencyAlert(newAlert);

      // 2. Reflect immediately in UI state with honest pending_sync status
      setEmergencyAlerts((prev) => sortAndDeduplicateEmergencyAlerts([newAlert, ...prev]));

      let finalAlert = newAlert;

      if (isOnline) {
        markRecordUploadInFlight(alertId);
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Firestore write timeout')), 10000)
          );
          await Promise.race([createEmergencyAlertRecord(newAlert), timeoutPromise]);
          finalAlert = { ...newAlert, syncStatus: 'synced' };

          await saveLocalDraft('emergencyAlertDrafts', {
            ...finalAlert,
            owningUid: resolvedRaisedById,
            relatedMotherId: data.motherId,
            creatingWorkerId: finalAlert.assignedWorkerId,
            syncState: 'synced',
          });
          removeQueuedEmergencyAlert(alertId);
          setEmergencyAlerts((prev) =>
            sortAndDeduplicateEmergencyAlerts(
              prev.map((a) => (a.id === alertId ? finalAlert : a))
            )
          );

          logAuditEvent(
            'RAISE_EMERGENCY_ALERT',
            resolvedRaisedById,
            resolvedRaisedByRole,
            'emergencyAlerts',
            alertId,
            {
              motherId: data.motherId,
              targetHospitalId: matchedHospital.id,
              urgency: data.urgency,
              concernCategory: data.concernCategory,
              provenanceVerifiedByServer,
            }
          ).catch(() => {});

          dispatchEmergencyAlertNotificationWithServer({
            alertId,
            eventType: 'alert_created',
            motherId: data.motherId,
            assignedWorkerId: resolvedWorkerId,
            raisedByRole: resolvedRaisedByRole,
            raisedById: resolvedRaisedById,
            targetHospitalId: matchedHospital.id,
            urgency: data.urgency,
            status: 'pending_acknowledgement',
            eventTimestampMs: nowMs,
          }).catch(() => {});
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          const isPermissionOrValidation =
            errMsg.includes('permission') ||
            errMsg.includes('PERMISSION_DENIED') ||
            errMsg.includes('invalid-argument');
          if (isPermissionOrValidation) {
            setDbError(`Firestore emergency alert write rejected: ${errMsg}`);
            await updateLocalSyncState('emergencyAlertDrafts', alertId, 'auth_error', errMsg);
          } else {
            console.warn('Emergency alert queued offline for sync:', err);
            triggerBackgroundSync(user?.id);
          }
        } finally {
          clearRecordUploadInFlight(alertId);
        }
      } else {
        triggerBackgroundSync(user?.id);
      }

      return finalAlert;
    },
    [mothers, hospitals, supervisor.id, user?.id]
  );

  const escalateEmergencyAlert = useCallback(
    async (params: {
      alertId: string;
      escalatedBy: string;
      escalationReason: string;
      escalationTargetHospitalId: string;
    }): Promise<void> => {
      if (user?.role && user.role !== 'supervisor') {
        throw new EmergencyAlertAuthorizationError(
          'Only an authenticated Supervisor can escalate emergency alerts.',
          403,
          'FORBIDDEN_ESCALATION_ROLE'
        );
      }
      const existingAlert = emergencyAlerts.find((a) => a.id === params.alertId);
      let serverTimestampMs: number | undefined;
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const authRes = await authorizeEscalationWithServer({
          alertId: params.alertId,
          escalationReason: params.escalationReason,
          escalationTargetHospitalId: params.escalationTargetHospitalId,
          assignedWorkerId: existingAlert?.assignedWorkerId,
        });
        if (authRes) {
          serverTimestampMs = authRes.serverTimestampMs;
        }
      }

      const targetHosp =
        hospitals.find((h) => h.id === params.escalationTargetHospitalId) ||
        AUTHORIZED_HOSPITALS[2];
      const nowMs = serverTimestampMs || Date.now();
      const entry: EmergencyAlertUpdateEntry = {
        id: `UPD-${nowMs}-${Math.random().toString(36).slice(2, 6)}`,
        timestampIso: new Date(nowMs).toISOString(),
        timestampLabel: new Date(nowMs).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        actorName: params.escalatedBy,
        actorRole: 'supervisor',
        status: 'escalated',
        note: `Escalated to ${targetHosp.name}: ${params.escalationReason}`,
      };

      const updatedAlert: EmergencyAlert | undefined = existingAlert
        ? {
            ...existingAlert,
            status: 'escalated',
            escalated: true,
            escalatedAtMs: nowMs,
            escalatedBy: params.escalatedBy,
            escalationReason: params.escalationReason,
            escalationTargetHospitalId: targetHosp.id,
            escalationTargetHospitalName: targetHosp.name,
            targetHospitalId: targetHosp.id,
            targetHospitalName: targetHosp.name,
            targetFacilityType: targetHosp.facilityType,
            updatedAtMs: nowMs,
            hospitalUpdates: [...(existingAlert.hospitalUpdates || []), entry],
          }
        : undefined;

      if (updatedAlert) {
        setEmergencyAlerts((prev) =>
          sortAndDeduplicateEmergencyAlerts(
            prev.map((a) => (a.id === params.alertId ? updatedAlert : a))
          )
        );
      }

      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          await escalateEmergencyAlertRecord({
            alertId: params.alertId,
            escalatedBy: params.escalatedBy,
            escalationReason: params.escalationReason,
            escalationTargetHospital: targetHosp,
            existingUpdates: existingAlert?.hospitalUpdates || [],
            serverTimestampMs: nowMs,
          });
          logAuditEvent(
            'ESCALATE_EMERGENCY_ALERT',
            params.escalatedBy,
            'supervisor',
            'emergencyAlerts',
            params.alertId,
            {
              targetHospitalId: targetHosp.id,
              reason: params.escalationReason,
            }
          ).catch(() => {});

          if (existingAlert) {
            dispatchEmergencyAlertNotificationWithServer({
              alertId: params.alertId,
              eventType: 'escalated',
              motherId: existingAlert.motherId,
              assignedWorkerId: existingAlert.assignedWorkerId,
              raisedByRole: existingAlert.raisedByRole,
              raisedById: existingAlert.raisedById,
              targetHospitalId: existingAlert.targetHospitalId,
              escalationTargetHospitalId: targetHosp.id,
              urgency: existingAlert.urgency,
              status: 'escalated',
              eventTimestampMs: nowMs,
            }).catch(() => {});
          }
        } catch (err: any) {
          const msg = err?.message || String(err);
          console.warn('Emergency alert escalation notice:', err);
          if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
            setDbError(`Firestore escalation update rejected: ${msg}`);
          }
        }
      } else if (updatedAlert && updatedAlert.syncStatus === 'pending_sync') {
        await saveLocalDraft('emergencyAlertDrafts', {
          ...updatedAlert,
          owningUid: user?.id || updatedAlert.raisedById,
          relatedMotherId: updatedAlert.motherId,
          creatingWorkerId: updatedAlert.assignedWorkerId,
          syncState: 'pending_sync',
        }).catch(() => {});
      }
    },
    [hospitals, emergencyAlerts, user?.role, user?.id]
  );

  const updateEmergencyAlertStatus = useCallback(
    async (params: {
      alertId: string;
      status: EmergencyAlert['status'];
      actorName: string;
      actorRole: 'hospital' | 'supervisor' | 'worker' | 'mother';
      note: string;
    }): Promise<void> => {
      const existingAlert = emergencyAlerts.find((a) => a.id === params.alertId);
      const nowMs = Date.now();
      const canMutateStatus = params.actorRole === 'hospital' || params.actorRole === 'supervisor';
      const effectiveStatus = canMutateStatus
        ? params.status
        : existingAlert?.status || params.status;

      const entry: EmergencyAlertUpdateEntry = {
        id: `UPD-${nowMs}-${Math.random().toString(36).slice(2, 6)}`,
        timestampIso: new Date(nowMs).toISOString(),
        timestampLabel: new Date(nowMs).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        actorName: params.actorName,
        actorRole: params.actorRole,
        status: effectiveStatus,
        note: params.note,
      };

      const updates: Partial<EmergencyAlert> = {
        ...(canMutateStatus ? { status: params.status } : {}),
        updatedAtMs: nowMs,
        ...(canMutateStatus && params.status === 'acknowledged' && !existingAlert?.acknowledgedAtMs
          ? { acknowledgedAtMs: nowMs, acknowledgedBy: params.actorName }
          : {}),
        ...(params.actorRole === 'hospital' ? { hospitalResponse: params.note } : {}),
        ...(canMutateStatus && params.status === 'action_taken'
          ? { actionTakenSummary: params.note }
          : {}),
        ...(canMutateStatus && params.status === 'referred'
          ? { referredFacilityName: params.note }
          : {}),
        ...(canMutateStatus && params.status === 'resolved'
          ? {
              resolvedAtMs: nowMs,
              resolvedBy: params.actorName,
              resolutionNotes: params.note,
            }
          : {}),
        ...(canMutateStatus && params.status === 'closed'
          ? {
              closedAtMs: nowMs,
              closedBy: params.actorName,
            }
          : {}),
      };

      const nextAlert: EmergencyAlert | undefined = existingAlert
        ? {
            ...existingAlert,
            ...updates,
            status: effectiveStatus,
            hospitalUpdates: [...(existingAlert.hospitalUpdates || []), entry],
          }
        : undefined;

      if (nextAlert) {
        setEmergencyAlerts((prev) =>
          sortAndDeduplicateEmergencyAlerts(
            prev.map((a) => (a.id === params.alertId ? nextAlert : a))
          )
        );
      }

      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          await updateEmergencyAlertRecord(
            params.alertId,
            updates,
            entry,
            existingAlert?.hospitalUpdates || []
          );
          if (existingAlert) {
            dispatchEmergencyAlertNotificationWithServer({
              alertId: params.alertId,
              eventType:
                effectiveStatus === 'resolved' || effectiveStatus === 'closed'
                  ? 'resolved'
                  : 'status_updated',
              motherId: existingAlert.motherId,
              assignedWorkerId: existingAlert.assignedWorkerId,
              raisedByRole: existingAlert.raisedByRole,
              raisedById: existingAlert.raisedById,
              targetHospitalId: existingAlert.targetHospitalId,
              escalationTargetHospitalId: existingAlert.escalationTargetHospitalId || null,
              urgency: existingAlert.urgency,
              status: effectiveStatus,
              eventTimestampMs: nowMs,
            }).catch(() => {});
          }
        } catch (err: any) {
          const msg = err?.message || String(err);
          console.warn('Emergency alert update notice:', err);
          if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
            setDbError(`Firestore alert update rejected: ${msg}`);
          }
        }
      } else if (nextAlert && nextAlert.syncStatus === 'pending_sync') {
        await saveLocalDraft('emergencyAlertDrafts', {
          ...nextAlert,
          owningUid: user?.id || nextAlert.raisedById,
          relatedMotherId: nextAlert.motherId,
          creatingWorkerId: nextAlert.assignedWorkerId,
          syncState: 'pending_sync',
        }).catch(() => {});
      }
    },
    [emergencyAlerts, user?.id]
  );

  const resetToDefaultData = useCallback(async (): Promise<void> => {
    localStorage.removeItem(LOCAL_CACHE_KEY);
    setSupervisor(DEMO_SUPERVISOR);
    setWorkers(DEMO_WORKERS);
    setMothers(DEMO_MOTHERS.filter((m) => isRecordInActiveScope('mother', m)));
    setHealthUpdates(DEMO_HEALTH_UPDATES.filter((u) => isRecordInActiveScope('healthUpdate', u)));
    setAppointments(DEMO_APPOINTMENTS.filter((a) => isRecordInActiveScope('appointment', a)));
    setMessages(
      sortAndDeduplicateMessages(
        DEMO_MESSAGES.filter((m) => isRecordInActiveScope('message', m))
      )
    );
    setAssessments(DEMO_ASSESSMENTS.filter((a) => isRecordInActiveScope('assessment', a)));
    setReferrals(DEMO_REFERRALS.filter((r) => isRecordInActiveScope('referral', r)));
    setVillageAllocations(
      DEMO_VILLAGE_ALLOCATIONS.filter((a) => isRecordInActiveScope('assignment', a))
    );
    setHospitals(AUTHORIZED_HOSPITALS);
    setEmergencyAlerts(
      sortAndDeduplicateEmergencyAlerts(
        DEMO_EMERGENCY_ALERTS.filter((a) => isRecordInActiveScope('alert', a))
      )
    );

    if (auth?.currentUser) {
      try {
        await seedInitialDataIfEmpty();
      } catch {
        // ignore
      }
    }
  }, [isRecordInActiveScope]);

  return (
    <DataContext.Provider
      value={{
        supervisor,
        workers,
        mothers,
        healthUpdates,
        appointments,
        messages,
        assessments,
        referrals,
        villageAllocations,
        hospitals,
        emergencyAlerts,
        isLoading,
        dbError,
        addHealthUpdate,
        reviewHealthUpdate,
        addAssessment,
        reviewAssessment,
        addReferral,
        updateReferralStatus,
        allocateWorker,
        sendMessage,
        sendVoiceMessage,
        markMessagesAsRead,
        registerMother,
        companionMemories,
        companionMemorySettings,
        saveCompanionMemory,
        deleteCompanionMemory,
        clearAllCompanionMemories,
        updateCompanionMemorySettings,
        raiseEmergencyAlert,
        escalateEmergencyAlert,
        updateEmergencyAlertStatus,
        resetToDefaultData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
