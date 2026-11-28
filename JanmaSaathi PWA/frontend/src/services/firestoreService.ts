import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { auth, db, storage } from '../lib/firebase';
import { ensureSessionToken } from './companionService';
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
  HospitalFacility,
  EmergencyAlert,
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

// Collection references
export const COLLECTIONS = {
  USERS: 'users',
  MOTHERS: 'mothers',
  HEALTH_WORKERS: 'healthWorkers',
  SUPERVISORS: 'supervisors',
  ASSIGNMENTS: 'assignments',
  ASSESSMENTS: 'assessments',
  HEALTH_UPDATES: 'healthUpdates',
  REFERRALS: 'referrals',
  REPORTS: 'reports',
  MESSAGES: 'messages',
  APPOINTMENTS: 'appointments',
  AUDIT_LOGS: 'auditLogs',
  COMPANION_MEMORIES: 'companionMemories',
  HOSPITALS: 'hospitals',
  EMERGENCY_ALERTS: 'emergencyAlerts',
} as const;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface SubscriptionScopeOptions {
  role?: 'mother' | 'worker' | 'supervisor' | null;
  motherId?: string | null;
  workerId?: string | null;
  isFirebaseAuthenticated?: boolean;
}

const LOCAL_METADATA_KEYS = new Set([
  'localRecordId',
  'recordType',
  'owningUid',
  'relatedMotherId',
  'creatingWorkerId',
  'localRevision',
  'operationId',
  'recordOrigin',
  'syncState',
  'syncError',
  'queuedAt',
]);

// Helper to remove undefined fields and IndexedDB local-sync metadata before saving to Firestore
function cleanData<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (LOCAL_METADATA_KEYS.has(key)) continue;
    if (value !== undefined) {
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[key] = cleanData(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * Bootstrap baseline records into Firestore if the database collections are currently empty.
 * Ensures the connected database has initial operational data for Mother, Health Worker, and Supervisor.
 */
export async function seedInitialDataIfEmpty(): Promise<boolean> {
  try {
    const mothersSnap = await getDocs(collection(db, COLLECTIONS.MOTHERS));
    if (!mothersSnap.empty) {
      return false; // Already populated
    }

    console.info('Seeding initial clinical and administrative records into Firestore...');
    const batch = writeBatch(db);

    // 1. Supervisor
    const supRef = doc(db, COLLECTIONS.SUPERVISORS, DEMO_SUPERVISOR.id);
    batch.set(supRef, {
      ...cleanData(DEMO_SUPERVISOR),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 2. Health Workers
    for (const w of DEMO_WORKERS) {
      const wRef = doc(db, COLLECTIONS.HEALTH_WORKERS, w.id);
      batch.set(wRef, {
        ...cleanData(w),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // 3. Mothers
    for (const m of DEMO_MOTHERS) {
      const mRef = doc(db, COLLECTIONS.MOTHERS, m.id);
      batch.set(mRef, {
        ...cleanData(m),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // 4. Assessments
    for (const a of DEMO_ASSESSMENTS) {
      const aRef = doc(db, COLLECTIONS.ASSESSMENTS, a.id);
      batch.set(aRef, {
        ...cleanData(a),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // 5. Health Updates
    for (const u of DEMO_HEALTH_UPDATES) {
      const uRef = doc(db, COLLECTIONS.HEALTH_UPDATES, u.healthUpdateId);
      batch.set(uRef, {
        ...cleanData(u),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // 6. Referrals
    for (const r of DEMO_REFERRALS) {
      const rRef = doc(db, COLLECTIONS.REFERRALS, r.id);
      batch.set(rRef, {
        ...cleanData(r),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // 7. Appointments
    for (const apt of DEMO_APPOINTMENTS) {
      const aptRef = doc(db, COLLECTIONS.APPOINTMENTS, apt.id);
      batch.set(aptRef, {
        ...cleanData(apt),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // 8. Messages
    for (const msg of DEMO_MESSAGES) {
      const msgRef = doc(db, COLLECTIONS.MESSAGES, msg.id);
      batch.set(msgRef, {
        ...cleanData(msg),
        createdAt: serverTimestamp(),
      });
    }

    // 9. Assignments
    for (const asgn of DEMO_VILLAGE_ALLOCATIONS) {
      const asgnRef = doc(db, COLLECTIONS.ASSIGNMENTS, asgn.id);
      batch.set(asgnRef, {
        ...cleanData(asgn),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // 10. Authorized Hospitals
    for (const hosp of AUTHORIZED_HOSPITALS) {
      const hospRef = doc(db, COLLECTIONS.HOSPITALS, hosp.id);
      batch.set(hospRef, {
        ...cleanData(hosp),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // 11. Demo Emergency Alerts
    for (const alt of DEMO_EMERGENCY_ALERTS) {
      const altRef = doc(db, COLLECTIONS.EMERGENCY_ALERTS, alt.id);
      batch.set(altRef, {
        ...cleanData(alt),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    console.info('Initial records successfully committed to Cloud Firestore.');
    return true;
  } catch (error) {
    console.warn('Initial seeding skipped or permission constrained:', error);
    return false;
  }
}

// ==========================================
// REAL-TIME FIRESTORE SUBSCRIPTIONS
// ==========================================

export function subscribeMothers(
  options: SubscriptionScopeOptions,
  onData: (mothers: Mother[]) => void,
  onError?: (err: Error) => void
) {
  if (!options.isFirebaseAuthenticated) {
    return () => {};
  }

  const sortByName = (list: Mother[]) =>
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  if (options.role === 'mother' && options.motherId) {
    return onSnapshot(
      doc(db, COLLECTIONS.MOTHERS, options.motherId),
      (snap) => {
        if (snap.exists()) {
          onData([{ id: snap.id, ...snap.data() } as Mother]);
        } else {
          onData([]);
        }
      },
      (err) => {
        console.warn('Firestore mother document subscription error:', err.message);
        onError?.(err);
      }
    );
  }

  if (options.role === 'worker' && options.workerId) {
    // Single-field equality query avoids needing a composite (assignedWorkerId, name) index
    const q = query(
      collection(db, COLLECTIONS.MOTHERS),
      where('assignedWorkerId', '==', options.workerId)
    );
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Mother));
        onData(sortByName(list));
      },
      (err) => {
        console.warn('Firestore worker mothers subscription error:', err.message);
        onError?.(err);
      }
    );
  }

  if (options.role === 'supervisor') {
    const q = query(collection(db, COLLECTIONS.MOTHERS), orderBy('name', 'asc'));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Mother));
        onData(list);
      },
      (err) => {
        console.warn('Firestore supervisor mothers subscription error:', err.message);
        onError?.(err);
      }
    );
  }

  return () => {};
}

export function subscribeWorkers(
  options: SubscriptionScopeOptions,
  onData: (workers: HealthWorker[]) => void,
  onError?: (err: Error) => void
) {
  if (!options.isFirebaseAuthenticated) {
    return () => {};
  }
  const q = query(collection(db, COLLECTIONS.HEALTH_WORKERS), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as HealthWorker));
      onData(list);
    },
    (err) => onError?.(err)
  );
}

export function subscribeHospitals(
  options: SubscriptionScopeOptions,
  onData: (hospitals: HospitalFacility[]) => void,
  onError?: (err: Error) => void
) {
  if (!options.isFirebaseAuthenticated) {
    return () => {};
  }
  return onSnapshot(
    collection(db, COLLECTIONS.HOSPITALS),
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as HospitalFacility));
      onData(list);
    },
    (err) => onError?.(err)
  );
}

export function subscribeEmergencyAlerts(
  options: SubscriptionScopeOptions,
  onData: (alerts: EmergencyAlert[]) => void,
  onError?: (err: Error) => void
) {
  if (!options.isFirebaseAuthenticated) {
    return () => {};
  }

  const path = COLLECTIONS.EMERGENCY_ALERTS;
  const alertsCol = collection(db, COLLECTIONS.EMERGENCY_ALERTS);

  const handleErr = (err: any) => {
    console.warn('Firestore emergencyAlerts subscription error:', err.message);
    try {
      handleFirestoreError(err, OperationType.LIST, path);
    } catch (wrapped: any) {
      onError?.(wrapped);
    }
  };

  if (options.role === 'supervisor') {
    return onSnapshot(
      alertsCol,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as EmergencyAlert));
        onData(list);
      },
      handleErr
    );
  }

  if (options.role === 'mother' && options.motherId) {
    const q = query(alertsCol, where('motherId', '==', options.motherId));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as EmergencyAlert));
        onData(list);
      },
      handleErr
    );
  }

  if (options.role === 'worker' && options.workerId) {
    const q = query(alertsCol, where('assignedWorkerId', '==', options.workerId));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as EmergencyAlert));
        onData(list);
      },
      handleErr
    );
  }

  return () => {};
}

export function subscribeSupervisors(
  options: SubscriptionScopeOptions,
  onData: (supervisors: Supervisor[]) => void,
  onError?: (err: Error) => void
) {
  if (!options.isFirebaseAuthenticated) {
    return () => {};
  }
  return onSnapshot(
    collection(db, COLLECTIONS.SUPERVISORS),
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Supervisor));
      onData(list);
    },
    (err) => onError?.(err)
  );
}

export function subscribeAssessments(
  options: SubscriptionScopeOptions,
  onData: (assessments: MaternalAssessment[]) => void,
  onError?: (err: Error) => void
) {
  if (!options.isFirebaseAuthenticated) {
    return () => {};
  }
  const col = collection(db, COLLECTIONS.ASSESSMENTS);
  let targetQuery: any = null;

  if (options.role === 'supervisor') {
    targetQuery = col;
  } else if (options.role === 'mother' && options.motherId) {
    targetQuery = query(col, where('motherId', '==', options.motherId));
  } else if (options.role === 'worker' && options.workerId) {
    targetQuery = query(col, where('workerId', '==', options.workerId));
  }

  if (!targetQuery) return () => {};

  return onSnapshot(
    targetQuery,
    (snap: any) => {
      const list = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as MaternalAssessment));
      list.sort((a: MaternalAssessment, b: MaternalAssessment) =>
        (b.assessedAt || b.recordedAt || '').localeCompare(a.assessedAt || a.recordedAt || '')
      );
      onData(list);
    },
    (err: any) => onError?.(err)
  );
}

export function subscribeHealthUpdates(
  options: SubscriptionScopeOptions,
  onData: (updates: HealthUpdate[]) => void,
  onError?: (err: Error) => void
) {
  if (!options.isFirebaseAuthenticated) {
    return () => {};
  }
  const col = collection(db, COLLECTIONS.HEALTH_UPDATES);
  let targetQuery: any = null;

  if (options.role === 'supervisor') {
    targetQuery = col;
  } else if (options.role === 'mother' && options.motherId) {
    targetQuery = query(col, where('motherId', '==', options.motherId));
  } else if (options.role === 'worker' && options.workerId) {
    targetQuery = query(col, where('assignedHealthWorkerId', '==', options.workerId));
  }

  if (!targetQuery) return () => {};

  return onSnapshot(
    targetQuery,
    (snap: any) => {
      const list = snap.docs.map((d: any) => ({ healthUpdateId: d.id, ...d.data() } as HealthUpdate));
      onData(list);
    },
    (err: any) => onError?.(err)
  );
}

export function subscribeReferrals(
  options: SubscriptionScopeOptions,
  onData: (referrals: Referral[]) => void,
  onError?: (err: Error) => void
) {
  if (!options.isFirebaseAuthenticated) {
    return () => {};
  }
  const col = collection(db, COLLECTIONS.REFERRALS);
  let targetQuery: any = null;

  if (options.role === 'supervisor') {
    targetQuery = col;
  } else if (options.role === 'mother' && options.motherId) {
    targetQuery = query(col, where('motherId', '==', options.motherId));
  } else if (options.role === 'worker' && options.workerId) {
    targetQuery = query(col, where('workerId', '==', options.workerId));
  }

  if (!targetQuery) return () => {};

  return onSnapshot(
    targetQuery,
    (snap: any) => {
      const list = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Referral));
      onData(list);
    },
    (err: any) => onError?.(err)
  );
}

export function subscribeAppointments(
  options: SubscriptionScopeOptions,
  onData: (appointments: Appointment[]) => void,
  onError?: (err: Error) => void
) {
  if (!options.isFirebaseAuthenticated) {
    return () => {};
  }
  const col = collection(db, COLLECTIONS.APPOINTMENTS);
  let targetQuery: any = null;

  if (options.role === 'supervisor') {
    targetQuery = col;
  } else if (options.role === 'mother' && options.motherId) {
    targetQuery = query(col, where('motherId', '==', options.motherId));
  } else if (options.role === 'worker' && options.workerId) {
    targetQuery = query(col, where('workerId', '==', options.workerId));
  }

  if (!targetQuery) return () => {};

  return onSnapshot(
    targetQuery,
    (snap: any) => {
      const list = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Appointment));
      onData(list);
    },
    (err: any) => onError?.(err)
  );
}

export function subscribeMessages(
  options: SubscriptionScopeOptions,
  onData: (messages: DirectMessage[]) => void,
  onError?: (err: Error) => void
) {
  if (!options.isFirebaseAuthenticated) {
    return () => {};
  }

  const messagesCol = collection(db, COLLECTIONS.MESSAGES);
  const handleErr = (err: any) => {
    console.warn('Firestore messages subscription error:', err?.message || err);
    onError?.(err);
  };

  if (options.role === 'supervisor') {
    return onSnapshot(
      messagesCol,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DirectMessage));
        onData(list);
      },
      handleErr
    );
  }

  if (options.role === 'mother' && options.motherId) {
    const q = query(messagesCol, where('motherId', '==', options.motherId));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DirectMessage));
        onData(list);
      },
      handleErr
    );
  }

  if (options.role === 'worker' && options.workerId) {
    const q = query(messagesCol, where('workerId', '==', options.workerId));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DirectMessage));
        onData(list);
      },
      handleErr
    );
  }

  return () => {};
}

export function subscribeAssignments(
  options: SubscriptionScopeOptions,
  onData: (assignments: VillageAllocation[]) => void,
  onError?: (err: Error) => void
) {
  if (!options.isFirebaseAuthenticated || options.role === 'mother') {
    return () => {};
  }

  const col = collection(db, COLLECTIONS.ASSIGNMENTS);
  const targetQuery =
    options.role === 'worker' && options.workerId
      ? query(col, where('assignedWorkerId', '==', options.workerId))
      : options.role === 'supervisor'
      ? col
      : null;

  if (!targetQuery) return () => {};

  return onSnapshot(
    targetQuery,
    (snap: any) => {
      const list = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as VillageAllocation));
      onData(list);
    },
    (err: any) => onError?.(err)
  );
}

// ==========================================
// REAL PERSISTENT DATABASE MUTATIONS
// ==========================================

export async function createMotherRecord(mother: Mother): Promise<Mother> {
  const docRef = doc(db, COLLECTIONS.MOTHERS, mother.id);
  const payload = {
    ...cleanData(mother),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(docRef, payload);
  return mother;
}

export async function updateMotherRecord(motherId: string, updates: Partial<Mother>): Promise<void> {
  const docRef = doc(db, COLLECTIONS.MOTHERS, motherId);
  await updateDoc(docRef, {
    ...cleanData(updates),
    updatedAt: serverTimestamp(),
  });
}

export async function createAssessmentRecord(
  assessment: MaternalAssessment
): Promise<MaternalAssessment> {
  const docRef = doc(db, COLLECTIONS.ASSESSMENTS, assessment.id);
  const payload = {
    ...cleanData(assessment),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(docRef, payload);
  return assessment;
}

export async function updateAssessmentReview(
  id: string,
  status: 'signed_off' | 'clarification_requested',
  notes: string,
  reviewedBy: string
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ASSESSMENTS, id);
  await updateDoc(docRef, {
    supervisorReviewStatus: status,
    supervisorNotes: notes,
    reviewedBy,
    reviewedAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
}

export async function createHealthUpdateRecord(update: HealthUpdate): Promise<HealthUpdate> {
  const docRef = doc(db, COLLECTIONS.HEALTH_UPDATES, update.healthUpdateId);
  const payload = {
    ...cleanData(update),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(docRef, payload);
  return update;
}

export async function updateHealthUpdateReview(
  healthUpdateId: string,
  reviewedBy: string,
  reviewNotes: string
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.HEALTH_UPDATES, healthUpdateId);
  await updateDoc(docRef, {
    reviewStatus: 'reviewed',
    reviewedBy,
    reviewNotes,
    reviewedAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
}

export async function createReferralRecord(referral: Referral): Promise<Referral> {
  const docRef = doc(db, COLLECTIONS.REFERRALS, referral.id);
  const payload = {
    ...cleanData(referral),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(docRef, payload);
  return referral;
}

export async function updateReferralStatusRecord(
  id: string,
  status: Referral['status'],
  supervisorRemarks?: string
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.REFERRALS, id);
  const payload: Record<string, any> = {
    status,
    updatedAt: serverTimestamp(),
  };
  if (supervisorRemarks !== undefined) {
    payload.supervisorRemarks = supervisorRemarks;
  }
  await updateDoc(docRef, payload);
}

export async function createDirectMessage(message: DirectMessage): Promise<DirectMessage> {
  const docRef = doc(db, COLLECTIONS.MESSAGES, message.id);
  const payload = cleanData(message);
  if (payload.type === 'audio') {
    if (auth.currentUser?.uid) {
      payload.senderAuthUid = auth.currentUser.uid;
    } else {
      delete payload.senderAuthUid;
    }
  }
  await setDoc(docRef, {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return message;
}

export async function markDirectMessagesReadInFirestore(messageIds: string[]): Promise<void> {
  if (!messageIds.length) return;
  const batch = writeBatch(db);
  for (const id of messageIds) {
    batch.update(doc(db, COLLECTIONS.MESSAGES, id), {
      read: true,
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function createAppointmentRecord(appointment: Appointment): Promise<Appointment> {
  const docRef = doc(db, COLLECTIONS.APPOINTMENTS, appointment.id);
  const payload = {
    ...cleanData(appointment),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(docRef, payload);
  return appointment;
}

export async function createOrUpdateAssignment(
  assignment: VillageAllocation,
  allocatedMotherIds?: string[]
): Promise<void> {
  const batch = writeBatch(db);

  // Update assignment doc
  const asgnRef = doc(db, COLLECTIONS.ASSIGNMENTS, assignment.id);
  batch.set(
    asgnRef,
    {
      ...cleanData(assignment),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // Reassign mothers if mother IDs provided
  if (allocatedMotherIds && allocatedMotherIds.length > 0) {
    for (const mId of allocatedMotherIds) {
      const mRef = doc(db, COLLECTIONS.MOTHERS, mId);
      batch.update(mRef, {
        assignedWorkerId: assignment.assignedWorkerId,
        assignedWorkerName: assignment.assignedWorkerName,
        updatedAt: serverTimestamp(),
      });
    }
  }

  await batch.commit();
}

export async function logAuditEvent(
  action: string,
  actorId: string,
  actorRole: string,
  targetResource: string,
  targetId: string,
  details: Record<string, any> = {}
): Promise<void> {
  try {
    const logId = `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const logRef = doc(db, COLLECTIONS.AUDIT_LOGS, logId);
    await setDoc(logRef, {
      id: logId,
      action,
      actorId,
      actorRole,
      targetResource,
      targetId,
      details: cleanData(details),
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Audit log write error:', err);
  }
}

/**
 * Upload clinical document attachment to Cloud Storage and return download URL
 */
export async function uploadClinicalDocument(
  file: File,
  motherId: string
): Promise<{ url: string; path: string }> {
  const storagePath = `documents/${motherId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);
  return { url, path: storagePath };
}

export interface UploadVoiceAudioParams {
  blob: Blob;
  mimeType: string;
  conversationId: string;
  messageId: string;
  motherId: string;
  workerId: string;
  senderId: string;
  senderRole: 'mother' | 'worker';
  recipientAuthUid?: string | null;
  onProgress?: (percent: number) => void;
}

export interface UploadVoiceAudioResult {
  audioStoragePath: string;
  audioDownloadUrl: string;
  audioFileSize: number;
  audioMimeType: string;
  uploaderAuthUid: string | null;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = res.indexOf(',');
      resolve(commaIdx >= 0 ? res.slice(commaIdx + 1) : res);
    };
    reader.onerror = () => reject(new Error('Failed to read recorded audio data.'));
    reader.readAsDataURL(blob);
  });
}

function parseVoiceStoragePath(audioStoragePath: string): { conversationId: string; fileName: string } | null {
  const match = /^voiceMessages\/([^/]+)\/([^/]+)$/.exec((audioStoragePath || '').trim());
  if (!match) return null;
  return { conversationId: match[1], fileName: match[2] };
}

/**
 * Upload raw recorded voice audio Blob via authenticated JanmaSaathi session
 * (never storing Base64 audio inside Firestore documents).
 */
export async function uploadVoiceMessageAudio(
  params: UploadVoiceAudioParams
): Promise<UploadVoiceAudioResult> {
  const {
    blob,
    mimeType,
    conversationId,
    messageId,
    motherId,
    workerId,
    senderId,
    senderRole,
    onProgress,
  } = params;

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Internet connection is required to send voice messages.');
  }

  if (!blob || blob.size <= 0) {
    throw new Error('Recorded audio is empty. Please record again.');
  }

  if (blob.size > 10 * 1024 * 1024) {
    throw new Error('Voice message exceeds the 10 MB size limit. Please record a shorter clip.');
  }

  if (typeof auth.authStateReady === 'function') {
    await Promise.race([
      auth.authStateReady(),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]).catch(() => {});
  }

  let sessionToken = await ensureSessionToken();
  if (!sessionToken) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    sessionToken = await ensureSessionToken();
  }
  if (!sessionToken) {
    throw new Error('Active JanmaSaathi session is required to send voice messages. Please sign in again.');
  }

  const rawMime = (mimeType || blob.type || 'audio/webm').trim();
  const cleanContentType = rawMime.split(';')[0].trim() || 'audio/webm';
  if (!cleanContentType.startsWith('audio/')) {
    throw new Error(`Unsupported recorded MIME type "${cleanContentType}". Audio format is required.`);
  }

  const safeConversationId = conversationId.replace(/[^A-Za-z0-9_-]/g, '_');
  const safeMessageId = messageId.replace(/[^A-Za-z0-9_-]/g, '_');

  onProgress?.(15);
  const audioBase64 = await blobToBase64(blob);
  onProgress?.(45);

  const uploadBody = JSON.stringify({
    audioBase64,
    mimeType: rawMime,
    conversationId: safeConversationId,
    messageId: safeMessageId,
    motherId,
    workerId,
    senderId,
    senderRole,
  });

  let resp = await fetch('/api/voice-messages/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    },
    body: uploadBody,
  });

  if (resp.status === 401) {
    const refreshed = await ensureSessionToken();
    if (refreshed) {
      sessionToken = refreshed;
      resp = await fetch('/api/voice-messages/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: uploadBody,
      });
    }
  }

  const data = await resp.json().catch(() => ({} as any));
  if (!resp.ok || !data?.success || !data?.audioStoragePath) {
    throw new Error(data?.error || `Failed to upload voice message audio (${resp.status}).`);
  }

  onProgress?.(100);

  return {
    audioStoragePath: data.audioStoragePath,
    audioDownloadUrl: data.audioDownloadUrl,
    audioFileSize: Number(data.audioFileSize) || blob.size,
    audioMimeType: data.audioMimeType || rawMime,
    uploaderAuthUid: auth.currentUser?.uid || null,
  };
}

export async function getVoiceMessageAudioUrl(
  audioStoragePath: string,
  audioDownloadUrl?: string
): Promise<string> {
  if (!audioStoragePath && !audioDownloadUrl) {
    throw new Error('Missing audio storage path.');
  }
  if (typeof auth.authStateReady === 'function') {
    await Promise.race([
      auth.authStateReady(),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]).catch(() => {});
  }

  const parsed = parseVoiceStoragePath(audioStoragePath);
  const serverEndpoint =
    audioDownloadUrl && audioDownloadUrl.startsWith('/api/voice-messages/audio/')
      ? audioDownloadUrl
      : parsed
      ? `/api/voice-messages/audio/${encodeURIComponent(parsed.conversationId)}/${encodeURIComponent(parsed.fileName)}`
      : null;

  if (serverEndpoint) {
    let token = await ensureSessionToken();
    if (!token) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      token = await ensureSessionToken();
    }
    if (!token) {
      throw new Error('401 Unauthorized: Active JanmaSaathi session required to load voice audio.');
    }

    let resp = await fetch(serverEndpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (resp.status === 401) {
      const refreshed = await ensureSessionToken();
      if (refreshed) {
        resp = await fetch(serverEndpoint, {
          headers: { Authorization: `Bearer ${refreshed}` },
        });
      }
    }

    if (resp.ok) {
      const audioBlob = await resp.blob();
      if (!audioBlob || audioBlob.size <= 0) {
        throw new Error('Audio stream was empty.');
      }
      return URL.createObjectURL(audioBlob);
    }

    if (resp.status === 404 && auth.currentUser && audioStoragePath) {
      try {
        return await getDownloadURL(ref(storage, audioStoragePath));
      } catch {
        // fall through to 404 error below
      }
    }

    const errBody = await resp.json().catch(() => ({} as any));
    throw new Error(errBody?.error || `Failed to load voice audio (${resp.status}).`);
  }

  if (audioDownloadUrl && /^https?:\/\//i.test(audioDownloadUrl)) {
    return audioDownloadUrl;
  }

  const fileRef = ref(storage, audioStoragePath);
  return getDownloadURL(fileRef);
}

export async function deleteVoiceMessageAudio(audioStoragePath: string): Promise<void> {
  if (!audioStoragePath) return;
  const parsed = parseVoiceStoragePath(audioStoragePath);
  if (parsed) {
    try {
      const token = await ensureSessionToken();
      if (token) {
        await fetch(
          `/api/voice-messages/audio/${encodeURIComponent(parsed.conversationId)}/${encodeURIComponent(parsed.fileName)}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }
    } catch {
      // Best-effort cleanup
    }
  }
  if (auth.currentUser) {
    try {
      const fileRef = ref(storage, audioStoragePath);
      await deleteObject(fileRef);
    } catch {
      // Best-effort cleanup
    }
  }
}

// ==========================================
// CONSENTED AI COMPANION MEMORIES (MOTHER-ONLY)
// ==========================================

export function subscribeCompanionMemories(
  motherId: string,
  onData: (memories: CompanionMemory[]) => void,
  onError?: (err: Error) => void
) {
  const path = `${COLLECTIONS.COMPANION_MEMORIES}/${motherId}`;
  const q = query(
    collection(db, COLLECTIONS.COMPANION_MEMORIES),
    where('motherId', '==', motherId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CompanionMemory));
      onData(list);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (wrapped: any) {
        onError?.(wrapped);
      }
    }
  );
}

export async function createCompanionMemoryRecord(
  memory: CompanionMemory
): Promise<CompanionMemory> {
  const path = `${COLLECTIONS.COMPANION_MEMORIES}/${memory.id}`;
  try {
    const docRef = doc(db, COLLECTIONS.COMPANION_MEMORIES, memory.id);
    const payload = {
      ...cleanData(memory),
      authUid: auth.currentUser?.uid ?? memory.authUid ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(docRef, payload);
    return memory;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteCompanionMemoryRecord(memoryId: string): Promise<void> {
  const path = `${COLLECTIONS.COMPANION_MEMORIES}/${memoryId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.COMPANION_MEMORIES, memoryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// EMERGENCY ALERTS & HOSPITAL COORDINATION
// ==========================================

export async function ensureAuthorizedHospitalsSeeded(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.HOSPITALS));
    if (snap.empty) {
      const batch = writeBatch(db);
      for (const hosp of AUTHORIZED_HOSPITALS) {
        batch.set(doc(db, COLLECTIONS.HOSPITALS, hosp.id), {
          ...cleanData(hosp),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }

    // Seed any missing baseline synthetic emergency alerts without overwriting existing ones
    const alertsSnap = await getDocs(
      query(collection(db, COLLECTIONS.EMERGENCY_ALERTS), where('assignedWorkerId', '==', 'HW-44120'))
    );
    const existingAlertIds = new Set(alertsSnap.docs.map((d) => d.id));
    const missingDemoAlerts = DEMO_EMERGENCY_ALERTS.filter((alt) => !existingAlertIds.has(alt.id));
    if (missingDemoAlerts.length > 0) {
      const alertBatch = writeBatch(db);
      for (const alt of missingDemoAlerts) {
        alertBatch.set(doc(db, COLLECTIONS.EMERGENCY_ALERTS, alt.id), {
          ...cleanData(alt),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await alertBatch.commit();
    }
  } catch (err) {
    console.warn('Authorized hospitals/alerts seed notice:', err);
  }
}

export interface ServerEmergencyAlertAuthorization {
  alertId: string;
  serverTimestampMs: number;
  serverTimestampIso: string;
  serverProvenanceId: string;
  verifiedRaisedByRole: 'mother' | 'worker' | 'supervisor';
  verifiedRaisedById: string;
  verifiedAssignedWorkerId: string;
  verifiedAssignedWorkerName: string;
  verifiedSupervisorId: string;
  verifiedHospital: {
    id: string;
    name: string;
    facilityType: 'PHC' | 'CHC' | 'District Hospital';
  };
  verifiedStatus: 'new' | 'pending_acknowledgement';
}

export class EmergencyAlertAuthorizationError extends Error {
  statusCode: number;
  code: string;
  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'EmergencyAlertAuthorizationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export async function authorizeEmergencyAlertWithServer(params: {
  alertId?: string;
  motherId: string;
  assignedWorkerId?: string;
  assignedWorkerName?: string;
  targetHospitalId: string;
  concernCategory: string;
  urgency: string;
  description: string;
  status?: 'new' | 'pending_acknowledgement';
}): Promise<ServerEmergencyAlertAuthorization | null> {
  const token = await ensureSessionToken();
  if (!token) {
    throw new EmergencyAlertAuthorizationError(
      'Authenticated JanmaSaathi session is required to submit an emergency alert.',
      401,
      'UNAUTHORIZED'
    );
  }

  let response: Response;
  try {
    response = await fetch('/api/emergency-alerts/authorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
  } catch {
    // Transient network outage — allow offline queue fallback
    return null;
  }

  const data = await response.json().catch(() => ({}));
  if (response.status === 400 || response.status === 401 || response.status === 403) {
    throw new EmergencyAlertAuthorizationError(
      data?.error || 'Emergency alert authorization denied.',
      response.status,
      data?.code || 'AUTHORIZATION_DENIED'
    );
  }

  if (!response.ok || !data?.success) {
    // Server busy / 5xx — allow offline queue fallback
    return null;
  }

  return data as ServerEmergencyAlertAuthorization;
}

export async function authorizeEscalationWithServer(params: {
  alertId: string;
  escalationReason: string;
  escalationTargetHospitalId: string;
  assignedWorkerId?: string;
}): Promise<{
  serverTimestampMs: number;
  serverTimestampIso: string;
  verifiedSupervisorId: string;
  targetHospital: { id: string; name: string; facilityType: 'PHC' | 'CHC' | 'District Hospital' };
} | null> {
  const token = await ensureSessionToken();
  if (!token) {
    throw new EmergencyAlertAuthorizationError(
      'Supervisor authentication is required to escalate alerts.',
      401,
      'UNAUTHORIZED'
    );
  }

  let response: Response;
  try {
    response = await fetch('/api/emergency-alerts/authorize-escalation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
  } catch {
    return null;
  }

  const data = await response.json().catch(() => ({}));
  if (response.status === 400 || response.status === 401 || response.status === 403) {
    throw new EmergencyAlertAuthorizationError(
      data?.error || 'Emergency alert escalation denied.',
      response.status,
      data?.code || 'ESCALATION_DENIED'
    );
  }

  if (!response.ok || !data?.success) {
    return null;
  }

  return data;
}

export async function createEmergencyAlertRecord(
  alert: EmergencyAlert
): Promise<EmergencyAlert> {
  const path = `${COLLECTIONS.EMERGENCY_ALERTS}/${alert.id}`;
  try {
    const docRef = doc(db, COLLECTIONS.EMERGENCY_ALERTS, alert.id);
    const cleanAlert = cleanData({
      ...alert,
      syncStatus: 'synced',
      raisedByAuthUid: auth.currentUser?.uid ?? alert.raisedByAuthUid ?? null,
    });
    // Remove IndexedDB metadata fields so Firestore strict keys check stays clean
    delete cleanAlert.localRecordId;
    delete cleanAlert.recordType;
    delete cleanAlert.owningUid;
    delete cleanAlert.relatedMotherId;
    delete cleanAlert.creatingWorkerId;
    delete cleanAlert.localRevision;
    delete cleanAlert.operationId;
    delete cleanAlert.recordOrigin;
    delete cleanAlert.syncState;
    delete cleanAlert.syncError;
    delete cleanAlert.queuedAt;

    await setDoc(docRef, {
      ...cleanAlert,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { ...alert, syncStatus: 'synced' };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateEmergencyAlertRecord(
  alertId: string,
  updates: Partial<EmergencyAlert>,
  appendUpdateEntry?: EmergencyAlertUpdateEntry,
  existingUpdates?: EmergencyAlertUpdateEntry[]
): Promise<void> {
  const path = `${COLLECTIONS.EMERGENCY_ALERTS}/${alertId}`;
  try {
    const docRef = doc(db, COLLECTIONS.EMERGENCY_ALERTS, alertId);
    const nowMs = Date.now();
    const payload = cleanData({
      ...updates,
      updatedAtMs: updates.updatedAtMs ?? nowMs,
      ...(appendUpdateEntry
        ? { hospitalUpdates: [...(existingUpdates || []), appendUpdateEntry].slice(-50) }
        : {}),
      updatedAt: serverTimestamp(),
    });
    await updateDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function escalateEmergencyAlertRecord(params: {
  alertId: string;
  escalatedBy: string;
  escalationReason: string;
  escalationTargetHospital: HospitalFacility;
  existingUpdates?: EmergencyAlertUpdateEntry[];
  serverTimestampMs?: number;
}): Promise<void> {
  const {
    alertId,
    escalatedBy,
    escalationReason,
    escalationTargetHospital,
    existingUpdates = [],
    serverTimestampMs,
  } = params;
  const nowMs = serverTimestampMs || Date.now();
  const entry: EmergencyAlertUpdateEntry = {
    id: `UPD-${nowMs}-${Math.random().toString(36).slice(2, 6)}`,
    timestampIso: new Date(nowMs).toISOString(),
    timestampLabel: new Date(nowMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    actorName: escalatedBy,
    actorRole: 'supervisor',
    status: 'escalated',
    note: `Escalated to ${escalationTargetHospital.name}: ${escalationReason}`,
  };

  await updateEmergencyAlertRecord(
    alertId,
    {
      status: 'escalated',
      escalated: true,
      escalatedAtMs: nowMs,
      escalatedBy,
      escalationReason,
      escalationTargetHospitalId: escalationTargetHospital.id,
      escalationTargetHospitalName: escalationTargetHospital.name,
      targetHospitalId: escalationTargetHospital.id,
      targetHospitalName: escalationTargetHospital.name,
      targetFacilityType: escalationTargetHospital.facilityType,
      updatedAtMs: nowMs,
    },
    entry,
    existingUpdates
  );
}

export async function dispatchEmergencyAlertNotificationWithServer(params: {
  alertId: string;
  eventType: 'alert_created' | 'status_updated' | 'escalated' | 'resolved';
  motherId: string;
  assignedWorkerId: string;
  raisedByRole: 'mother' | 'worker' | 'supervisor';
  raisedById: string;
  targetHospitalId: string;
  escalationTargetHospitalId?: string | null;
  urgency: 'moderate' | 'urgent' | 'critical';
  status: string;
  eventTimestampMs: number;
}): Promise<void> {
  try {
    const token = await ensureSessionToken();
    if (!token) return;
    await fetch('/api/emergency-alerts/dispatch-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
  } catch {
    // Non-blocking: Firestore real-time listeners already deliver foreground updates
  }
}

export async function updateEmergencyAlertWithServer(params: {
  alertId: string;
  status: string;
  actorName: string;
  actorRole: string;
  note: string;
}): Promise<boolean> {
  try {
    const token = await ensureSessionToken();
    if (!token) return false;
    const res = await fetch('/api/emergency-alerts/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok && data?.success;
  } catch {
    return false;
  }
}

