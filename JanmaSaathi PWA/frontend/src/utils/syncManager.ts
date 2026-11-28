import {
  createMotherRecord,
  createAssessmentRecord,
  createHealthUpdateRecord,
  createReferralRecord,
  createEmergencyAlertRecord,
  authorizeEmergencyAlertWithServer,
  EmergencyAlertAuthorizationError,
  createDirectMessage,
  createAppointmentRecord,
  createCompanionMemoryRecord,
} from '../services/firestoreService';
import { removeQueuedEmergencyAlert } from './offlineQueue';
import {
  getAllPendingSyncRecords,
  updateLocalSyncState,
  saveLocalDraft,
  StoreName,
} from './indexedDB';
import { auth, validateFirestoreConnection } from '../lib/firebase';
import { evaluateMaternalRiskLocally } from '../ml/mlEngine';

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
  syncErrors: string[];
}

let syncListeners: ((status: SyncStatus) => void)[] = [];
let currentSyncStatus: SyncStatus = {
  isSyncing: false,
  lastSyncedAt: null,
  pendingCount: 0,
  syncErrors: [],
};

function notifyListeners() {
  syncListeners.forEach((listener) => listener(currentSyncStatus));
}

export function subscribeSyncStatus(listener: (status: SyncStatus) => void): () => void {
  syncListeners.push(listener);
  listener(currentSyncStatus);
  return () => {
    syncListeners = syncListeners.filter((l) => l !== listener);
  };
}

/**
 * Verify genuine backend reachability before attempting synchronization.
 */
export async function isBackendReachable(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  try {
    const isFirestoreAvailable = await validateFirestoreConnection(3000);
    if (isFirestoreAvailable) return true;

    // Secondary reachability check via Express server /api/health
    const res = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

let syncInFlightPromise: Promise<{
  success: boolean;
  processedCount: number;
  errors: string[];
}> | null = null;
let autoSyncInitialized = false;
let latestOwningUidProvider: () => string | undefined = () => undefined;
const inFlightInlineUploadIds = new Set<string>();

export function markRecordUploadInFlight(recordId: string) {
  if (recordId) inFlightInlineUploadIds.add(recordId);
}

export function clearRecordUploadInFlight(recordId: string) {
  if (recordId) inFlightInlineUploadIds.delete(recordId);
}

/**
 * Perform synchronization in strict dependency order with idempotency and conflict preservation.
 */
export async function triggerBackgroundSync(owningUid?: string): Promise<{
  success: boolean;
  processedCount: number;
  errors: string[];
}> {
  if (syncInFlightPromise || currentSyncStatus.isSyncing) {
    return { success: false, processedCount: 0, errors: ['Sync already in progress'] };
  }

  // Acquire synchronous lock before any await so concurrent triggers cannot race
  currentSyncStatus.isSyncing = true;
  notifyListeners();

  syncInFlightPromise = (async () => {
    const errors: string[] = [];
    let processedCount = 0;

    try {
      const reachable = await isBackendReachable();
      if (!reachable) {
        return { success: false, processedCount: 0, errors: ['Backend unreachable'] };
      }

      // Ensure Firebase Auth state is ready before proceeding with Firestore sync
      if (auth && typeof auth.authStateReady === 'function') {
        try {
          await Promise.race([
            auth.authStateReady(),
            new Promise((resolve) => setTimeout(resolve, 2000)),
          ]);
        } catch {
          // Non-blocking timeout for auth state readiness
        }
      }

      if (!auth?.currentUser) {
        return {
          success: false,
          processedCount: 0,
          errors: ['Firebase Auth session inactive; pending drafts preserved locally.'],
        };
      }

    const pendingItems = await getAllPendingSyncRecords(owningUid);
    currentSyncStatus.pendingCount = pendingItems.length;
    notifyListeners();

    if (pendingItems.length === 0) {
      currentSyncStatus.isSyncing = false;
      currentSyncStatus.lastSyncedAt = new Date().toISOString();
      notifyListeners();
      return { success: true, processedCount: 0, errors: [] };
    }

    console.info(
      `[JanmaSaathi Sync] Sync cycle initiated. Found ${pendingItems.length} pending record(s) across local stores.`
    );

    // 1. Dependency Ordering: Mothers -> Assessments -> HealthUpdates -> EmergencyAlerts -> Referrals -> Appointments -> Messages
    const storePriority: Record<StoreName, number> = {
      maternalProfiles: 1,
      assessmentDrafts: 2,
      healthUpdateDrafts: 3,
      emergencyAlertDrafts: 4,
      referralDrafts: 5,
      appointmentDrafts: 6,
      messageDrafts: 7,
      companionMemories: 8,
      syncMetadata: 9,
      localPreferences: 10,
      translationCache: 11,
    };

    pendingItems.sort(
      (a, b) => (storePriority[a.storeName] || 99) - (storePriority[b.storeName] || 99)
    );

    for (const { storeName, record } of pendingItems) {
      const recordId = record.id || (record as any).healthUpdateId;
      if (recordId && inFlightInlineUploadIds.has(recordId)) {
        continue;
      }
      try {
        console.info(`[JanmaSaathi Sync] Uploading ${storeName} record [ID: ${recordId}]...`);

        if (storeName === 'maternalProfiles') {
          // Idempotent Mother registration write to Firestore
          await createMotherRecord(record);
          await updateLocalSyncState(storeName, recordId, 'synced');
          console.info(`[JanmaSaathi Sync] Upload succeeded for ${storeName} [ID: ${recordId}]. Marked as synced.`);
          processedCount++;
        } else if (storeName === 'assessmentDrafts') {
          // Check if prediction requires server re-validation
          let finalAssessment = { ...record };

          try {
            // Attempt server revalidation with /api/predict
            const res = await fetch('/api/predict', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                age: record.originalMeasurements?.age?.value || record.originalMeasurements?.age || 24,
                systolicBP: record.systolicBP,
                diastolicBP: record.diastolicBP,
                bloodSugar: record.bloodGlucose,
                bloodSugarUnit: 'mmol/L',
                bodyTemp: record.bodyTemp,
                bodyTempUnit: '°F',
                heartRate: record.heartRate,
                supplementaryObservations: record.supplementaryDangerObservations,
              }),
            });

            if (res.ok) {
              const resData = await res.json();
              if (resData.success && resData.modelPrediction) {
                finalAssessment.modelPrediction = {
                  ...resData.modelPrediction,
                  isProvisional: false,
                };
              }
            }
          } catch {
            // Re-evaluate locally if server prediction API fails during sync
            const localEval = evaluateMaternalRiskLocally({
              age: record.originalMeasurements?.age?.value || 24,
              systolicBP: record.systolicBP,
              diastolicBP: record.diastolicBP,
              bloodSugar: record.bloodGlucose,
              bodyTemp: record.bodyTemp,
              heartRate: record.heartRate,
            });
            if (localEval.success && localEval.modelPrediction) {
              finalAssessment.modelPrediction = localEval.modelPrediction;
            }
          }

          await createAssessmentRecord(finalAssessment);
          await updateLocalSyncState(storeName, recordId, 'synced');
          console.info(`[JanmaSaathi Sync] Upload succeeded for ${storeName} [ID: ${recordId}]. Marked as synced.`);
          processedCount++;
        } else if (storeName === 'healthUpdateDrafts') {
          await createHealthUpdateRecord(record);
          await updateLocalSyncState(storeName, recordId, 'synced');
          console.info(`[JanmaSaathi Sync] Upload succeeded for ${storeName} [ID: ${recordId}]. Marked as synced.`);
          processedCount++;
        } else if (storeName === 'emergencyAlertDrafts') {
          let syncedAlert = {
            ...record,
            syncStatus: 'synced' as const,
            syncState: 'synced' as const,
          };
          if (!record.provenanceVerifiedByServer) {
            const serverAuth = await authorizeEmergencyAlertWithServer({
              alertId: record.id,
              motherId: record.motherId,
              assignedWorkerId: record.assignedWorkerId,
              assignedWorkerName: record.assignedWorkerName,
              targetHospitalId: record.targetHospitalId,
              concernCategory: record.concernCategory,
              urgency: record.urgency,
              description: record.description,
              status: record.status === 'new' ? 'new' : 'pending_acknowledgement',
            });
            if (serverAuth) {
              syncedAlert = {
                ...syncedAlert,
                assignedWorkerId: serverAuth.verifiedAssignedWorkerId,
                assignedWorkerName: serverAuth.verifiedAssignedWorkerName,
                supervisorId: serverAuth.verifiedSupervisorId,
                raisedByRole: serverAuth.verifiedRaisedByRole,
                raisedById: serverAuth.verifiedRaisedById,
                targetHospitalId: serverAuth.verifiedHospital.id,
                targetHospitalName: serverAuth.verifiedHospital.name,
                targetFacilityType: serverAuth.verifiedHospital.facilityType,
                provenanceVerifiedByServer: true,
                serverCreatedAtMs: serverAuth.serverTimestampMs,
                serverCreatedAtIso: serverAuth.serverTimestampIso,
                serverProvenanceId: serverAuth.serverProvenanceId,
                updatedAtMs: serverAuth.serverTimestampMs,
              };
            }
          }
          await createEmergencyAlertRecord(syncedAlert);
          await updateLocalSyncState(storeName, recordId, 'synced');
          await saveLocalDraft(storeName, syncedAlert);
          removeQueuedEmergencyAlert(recordId);
          console.info(`[JanmaSaathi Sync] Upload succeeded for ${storeName} [ID: ${recordId}]. Marked as synced.`);
          processedCount++;
        } else if (storeName === 'referralDrafts') {
          await createReferralRecord(record);
          await updateLocalSyncState(storeName, recordId, 'synced');
          console.info(`[JanmaSaathi Sync] Upload succeeded for ${storeName} [ID: ${recordId}]. Marked as synced.`);
          processedCount++;
        } else if (storeName === 'appointmentDrafts') {
          await createAppointmentRecord(record);
          await updateLocalSyncState(storeName, recordId, 'synced');
          console.info(`[JanmaSaathi Sync] Upload succeeded for ${storeName} [ID: ${recordId}]. Marked as synced.`);
          processedCount++;
        } else if (storeName === 'messageDrafts') {
          const syncedRecord = {
            ...record,
            delivered: true,
            syncStatus: 'delivered' as const,
            syncState: 'synced' as const,
            lastAttemptAt: new Date().toISOString(),
          };
          await createDirectMessage(syncedRecord);
          await updateLocalSyncState(storeName, recordId, 'synced');
          await saveLocalDraft(storeName, syncedRecord);
          console.info(`[JanmaSaathi Sync] Upload succeeded for ${storeName} [ID: ${recordId}]. Marked as synced.`);
          processedCount++;
        } else if (storeName === 'companionMemories') {
          await createCompanionMemoryRecord(record);
          await updateLocalSyncState(storeName, recordId, 'synced');
          console.info(`[JanmaSaathi Sync] Upload succeeded for ${storeName} [ID: ${recordId}]. Marked as synced.`);
          processedCount++;
        }
      } catch (itemErr: any) {
        const errMsg = itemErr.message || String(itemErr);
        console.warn(
          `[JanmaSaathi Sync] Upload failed for ${storeName} [ID: ${recordId}]: ${errMsg}. Preserved local draft.`
        );
        errors.push(`Store ${storeName} record ${recordId}: ${errMsg}`);

        // Handle permanent permission / validation errors by marking as auth_error or conflict
        if (
          itemErr instanceof EmergencyAlertAuthorizationError ||
          errMsg.includes('permission') ||
          errMsg.includes('PERMISSION_DENIED')
        ) {
          await updateLocalSyncState(storeName, recordId, 'auth_error', errMsg);
        } else {
          await updateLocalSyncState(storeName, recordId, 'conflict', errMsg);
        }
      }
    }

    currentSyncStatus.lastSyncedAt = new Date().toISOString();
  } catch (err: any) {
    errors.push(err.message || String(err));
  } finally {
    syncInFlightPromise = null;
    currentSyncStatus.isSyncing = false;
    currentSyncStatus.syncErrors = errors;
    const remaining = await getAllPendingSyncRecords(owningUid);
    currentSyncStatus.pendingCount = remaining.length;
    notifyListeners();

    console.info(
      `[JanmaSaathi Sync] Sync cycle finished. ${processedCount} synced successfully, ${errors.length} failed. Total pending remaining: ${remaining.length}.`
    );

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('janmasaathi:synced', {
          detail: { processedCount, errors, remainingCount: remaining.length },
        })
      );
    }
  }

  return {
    success: errors.length === 0,
    processedCount,
    errors,
  };
  })();

  return syncInFlightPromise;
}

/**
 * Register automatic triggers for background synchronization (singleton listener registration).
 */
export function initAutoSyncTriggers(owningUidProvider: () => string | undefined) {
  latestOwningUidProvider = owningUidProvider;
  if (typeof window === 'undefined' || autoSyncInitialized) return;
  autoSyncInitialized = true;

  const runSync = () => {
    triggerBackgroundSync(latestOwningUidProvider()).catch(() => {});
  };

  // 1. Browser online event
  window.addEventListener('online', () => {
    console.info('[JanmaSaathi Sync Trigger] Network online event detected. Initiating sync...');
    runSync();
  });

  // 2. Visibility change event (when user switches back to application tab)
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.info('[JanmaSaathi Sync Trigger] Tab resumed/visible. Checking pending syncs...');
      runSync();
    }
  });

  // 3. Window focus event
  window.addEventListener('focus', () => {
    runSync();
  });

  // 4. Mobile / PWA pageshow event
  window.addEventListener('pageshow', () => {
    runSync();
  });

  // 5. Initial application startup sync checks
  setTimeout(runSync, 1500);
  setTimeout(runSync, 6000);
}
