"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onEmergencyAlertUpdated = exports.onEmergencyAlertCreated = exports.NOTIFIER_SERVICE_ACCOUNT = exports.FUNCTIONS_REGION = exports.NAMED_DATABASE_ID = exports.PROJECT_ID = void 0;
exports.normalizeRole = normalizeRole;
exports.buildDispatchId = buildDispatchId;
exports.resolveDynamicSupervisorId = resolveDynamicSupervisorId;
exports.resolveRecipients = resolveRecipients;
exports.buildNonPiiPayload = buildNonPiiPayload;
exports.collectAuthorizedTokens = collectAuthorizedTokens;
exports.processAlertDispatch = processAlertDispatch;
exports.classifyAlertUpdate = classifyAlertUpdate;
const crypto_1 = __importDefault(require("crypto"));
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
const firestore_2 = require("firebase-functions/v2/firestore");
const logger = __importStar(require("firebase-functions/logger"));
exports.PROJECT_ID = 'outr-janmasaathi';
exports.NAMED_DATABASE_ID = 'ai-studio-janmasaathi-8e8b2a1f-7b17-42e6-bc8e-284c5c28d2df';
exports.FUNCTIONS_REGION = 'asia-south1';
exports.NOTIFIER_SERVICE_ACCOUNT = 'janmasaathi-notifier@outr-janmasaathi.iam.gserviceaccount.com';
const INVALID_FCM_TOKEN_CODES = new Set([
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
]);
function getAdminApp() {
    return (0, app_1.getApps)().length > 0 ? (0, app_1.getApp)() : (0, app_1.initializeApp)({ projectId: exports.PROJECT_ID });
}
function getDefaultDependencies() {
    const app = getAdminApp();
    return {
        db: (0, firestore_1.getFirestore)(app, exports.NAMED_DATABASE_ID),
        messaging: (0, messaging_1.getMessaging)(app),
    };
}
function normalizeRole(rawRole) {
    if (typeof rawRole !== 'string')
        return null;
    const trimmed = rawRole.trim();
    if (trimmed === 'hospital_staff' || trimmed === 'hospital' || trimmed === 'facility') {
        return 'hospital_staff';
    }
    if (trimmed === 'mother' || trimmed === 'worker' || trimmed === 'supervisor') {
        return trimmed;
    }
    return null;
}
function buildDispatchId(alertId, eventType, timestampMs) {
    return crypto_1.default
        .createHash('sha256')
        .update(`${alertId}|${eventType}|${timestampMs}`)
        .digest('hex')
        .slice(0, 24);
}
function cleanId(value) {
    if (typeof value !== 'string')
        return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}
/**
 * Dynamically resolves the authorized supervisor ID for an alert from:
 * 1. `alert.supervisorId`
 * 2. Assigned health worker profile (`healthWorkers/{assignedWorkerId}.supervisorId`)
 * 3. Maternal profile (`mothers/{motherId}.supervisorId`)
 * 4. Supervisor actor ID if raised directly by a supervisor
 * Never falls back to a hard-coded universal supervisor ID.
 */
async function resolveDynamicSupervisorId(alert, db) {
    const explicitSupervisorId = cleanId(alert.supervisorId);
    if (explicitSupervisorId) {
        return explicitSupervisorId;
    }
    const assignedWorkerId = cleanId(alert.assignedWorkerId);
    if (assignedWorkerId) {
        try {
            const workerSnap = await db.collection('healthWorkers').doc(assignedWorkerId).get();
            if (workerSnap.exists) {
                const workerSupervisorId = cleanId(workerSnap.data()?.supervisorId);
                if (workerSupervisorId) {
                    return workerSupervisorId;
                }
            }
        }
        catch (err) {
            logger.warn('Failed to look up worker supervisorId', {
                alertId: alert.id,
                assignedWorkerId,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
    const motherId = cleanId(alert.motherId);
    if (motherId) {
        try {
            const motherSnap = await db.collection('mothers').doc(motherId).get();
            if (motherSnap.exists) {
                const motherSupervisorId = cleanId(motherSnap.data()?.supervisorId);
                if (motherSupervisorId) {
                    return motherSupervisorId;
                }
            }
        }
        catch (err) {
            logger.warn('Failed to look up mother supervisorId', {
                alertId: alert.id,
                motherId,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
    if (alert.raisedByRole === 'supervisor') {
        return cleanId(alert.raisedById);
    }
    return null;
}
function resolveRecipients(alert, eventType, actorRole, options) {
    const hospitalIds = new Set();
    const workerIds = new Set();
    const motherIds = new Set();
    const supervisorIds = new Set();
    const targetHospitalId = cleanId(alert.targetHospitalId);
    const escalationTargetHospitalId = cleanId(alert.escalationTargetHospitalId);
    const motherId = cleanId(alert.motherId);
    const assignedWorkerId = cleanId(alert.assignedWorkerId);
    const effectiveSupervisorId = options && 'resolvedSupervisorId' in options
        ? cleanId(options.resolvedSupervisorId)
        : cleanId(alert.supervisorId);
    if (targetHospitalId) {
        hospitalIds.add(targetHospitalId);
    }
    if (escalationTargetHospitalId) {
        hospitalIds.add(escalationTargetHospitalId);
    }
    if (eventType === 'alert_created') {
        if (alert.raisedByRole === 'mother') {
            if (assignedWorkerId)
                workerIds.add(assignedWorkerId);
            if (effectiveSupervisorId)
                supervisorIds.add(effectiveSupervisorId);
        }
        else if (alert.raisedByRole === 'worker') {
            if (motherId)
                motherIds.add(motherId);
            if (effectiveSupervisorId)
                supervisorIds.add(effectiveSupervisorId);
        }
        else if (alert.raisedByRole === 'supervisor') {
            if (assignedWorkerId)
                workerIds.add(assignedWorkerId);
            if (motherId)
                motherIds.add(motherId);
        }
    }
    else {
        if (motherId)
            motherIds.add(motherId);
        if (assignedWorkerId)
            workerIds.add(assignedWorkerId);
        if (effectiveSupervisorId)
            supervisorIds.add(effectiveSupervisorId);
    }
    const actorId = cleanId(options?.actorId);
    const actorHospitalId = cleanId(options?.actorHospitalId);
    // Never notify the triggering actor for their own action
    if (actorRole === 'mother') {
        if (actorId)
            motherIds.delete(actorId);
        if (motherId)
            motherIds.delete(motherId);
    }
    else if (actorRole === 'worker') {
        if (actorId)
            workerIds.delete(actorId);
        if (assignedWorkerId && (!actorId || actorId === assignedWorkerId)) {
            workerIds.delete(assignedWorkerId);
        }
    }
    else if (actorRole === 'supervisor') {
        if (actorId)
            supervisorIds.delete(actorId);
        if (effectiveSupervisorId && (!actorId || actorId === effectiveSupervisorId)) {
            supervisorIds.delete(effectiveSupervisorId);
        }
    }
    else if (actorRole === 'hospital_staff') {
        if (actorHospitalId) {
            hospitalIds.delete(actorHospitalId);
        }
        else if (eventType === 'escalated') {
            if (targetHospitalId)
                hospitalIds.delete(targetHospitalId);
        }
        else if (alert.escalated && escalationTargetHospitalId) {
            hospitalIds.delete(escalationTargetHospitalId);
        }
        else if (targetHospitalId) {
            hospitalIds.delete(targetHospitalId);
        }
    }
    return { hospitalIds, workerIds, motherIds, supervisorIds };
}
function buildNonPiiPayload(alert, eventType, timestampMs) {
    const title = eventType === 'escalated'
        ? 'JanmaSaathi Alert Escalated'
        : eventType === 'resolved' || eventType === 'status_updated'
            ? 'JanmaSaathi Alert Update'
            : 'JanmaSaathi Maternal Alert';
    const body = eventType === 'escalated'
        ? 'A maternal alert has been escalated for urgent hospital review.'
        : eventType === 'resolved' || eventType === 'status_updated'
            ? 'Maternal emergency alert status updated.'
            : 'New maternal health alert requires attention.';
    return {
        title,
        body,
        data: {
            alertId: alert.id,
            eventType,
            urgency: alert.urgency || 'urgent',
            status: alert.status || 'pending_acknowledgement',
            targetHospitalId: alert.escalationTargetHospitalId || alert.targetHospitalId,
            targetRoute: `/?alertId=${encodeURIComponent(alert.id)}`,
            timestampIso: new Date(timestampMs).toISOString(),
        },
    };
}
async function collectAuthorizedTokens(recipients, db) {
    if (recipients.hospitalIds.size === 0 &&
        recipients.workerIds.size === 0 &&
        recipients.motherIds.size === 0 &&
        recipients.supervisorIds.size === 0) {
        return [];
    }
    // Query both canonical users/{uid}/fcmTokens subcollections and legacy top-level /fcmTokens
    const [groupSnap, rootSnap] = await Promise.all([
        db.collectionGroup('fcmTokens').where('enabled', '==', true).get(),
        db.collection('fcmTokens').where('enabled', '==', true).get(),
    ]);
    const seenTokenValues = new Set();
    const matched = [];
    for (const docSnap of [...groupSnap.docs, ...rootSnap.docs]) {
        const data = docSnap.data();
        const token = typeof data.token === 'string' ? data.token.trim() : '';
        if (!token || seenTokenValues.has(token))
            continue;
        const canonicalRole = normalizeRole(data.role);
        if (!canonicalRole)
            continue;
        const isMatched = (canonicalRole === 'mother' &&
            typeof data.motherId === 'string' &&
            recipients.motherIds.has(data.motherId)) ||
            (canonicalRole === 'worker' &&
                typeof data.staffId === 'string' &&
                recipients.workerIds.has(data.staffId)) ||
            (canonicalRole === 'supervisor' &&
                typeof data.staffId === 'string' &&
                recipients.supervisorIds.has(data.staffId)) ||
            (canonicalRole === 'hospital_staff' &&
                typeof data.hospitalId === 'string' &&
                recipients.hospitalIds.has(data.hospitalId));
        if (isMatched) {
            seenTokenValues.add(token);
            matched.push({
                id: docSnap.id,
                token,
                uid: String(data.uid || ''),
                role: canonicalRole,
                motherId: data.motherId || null,
                staffId: data.staffId || null,
                hospitalId: data.hospitalId || null,
                enabled: true,
                ref: docSnap.ref,
            });
        }
    }
    return matched;
}
async function processAlertDispatch(alert, eventType, actorRole, eventTimestampMs, options) {
    const { db, messaging } = options?.deps || getDefaultDependencies();
    const dispatchId = buildDispatchId(alert.id, eventType, eventTimestampMs);
    const deliveryRef = db.collection('alertNotificationDeliveries').doc(dispatchId);
    // Atomic idempotency claim
    const claimed = await db.runTransaction(async (tx) => {
        const existing = await tx.get(deliveryRef);
        if (existing.exists) {
            return false;
        }
        tx.set(deliveryRef, {
            id: dispatchId,
            alertId: alert.id,
            eventType,
            status: 'processing',
            targetHospitalId: alert.escalationTargetHospitalId || alert.targetHospitalId,
            targetRecipientsCount: 0,
            deliveredCount: 0,
            failedCount: 0,
            staleTokensRemovedCount: 0,
            dispatchedAtMs: Date.now(),
        });
        return true;
    });
    if (!claimed) {
        logger.info('Deduplicated alert push dispatch', { alertId: alert.id, dispatchId, eventType });
        return {
            dispatchId,
            deduplicated: true,
            status: 'deduplicated',
            targetRecipientsCount: 0,
            deliveredCount: 0,
            failedCount: 0,
            staleTokensRemovedCount: 0,
        };
    }
    try {
        const resolvedSupervisorId = await resolveDynamicSupervisorId(alert, db);
        const recipients = resolveRecipients(alert, eventType, actorRole, {
            resolvedSupervisorId,
            actorId: options?.actorId,
            actorHospitalId: options?.actorHospitalId,
        });
        const tokens = await collectAuthorizedTokens(recipients, db);
        if (tokens.length === 0) {
            await deliveryRef.update({
                status: 'no_registered_tokens',
                targetRecipientsCount: 0,
                deliveredCount: 0,
                failedCount: 0,
                staleTokensRemovedCount: 0,
                dispatchedAtMs: Date.now(),
            });
            return {
                dispatchId,
                deduplicated: false,
                status: 'no_registered_tokens',
                targetRecipientsCount: 0,
                deliveredCount: 0,
                failedCount: 0,
                staleTokensRemovedCount: 0,
            };
        }
        const payload = buildNonPiiPayload(alert, eventType, eventTimestampMs);
        const response = await messaging.sendEachForMulticast({
            tokens: tokens.map((t) => t.token),
            notification: {
                title: payload.title,
                body: payload.body,
            },
            data: payload.data,
            webpush: {
                headers: {
                    Urgency: alert.urgency === 'critical' ? 'high' : 'normal',
                },
                notification: {
                    title: payload.title,
                    body: payload.body,
                    icon: '/pwa-192x192.png',
                    tag: alert.id,
                },
                fcmOptions: {
                    link: payload.data.targetRoute,
                },
            },
        });
        const staleRefs = [];
        response.responses.forEach((res, idx) => {
            if (!res.success) {
                const code = res.error?.code || '';
                if (INVALID_FCM_TOKEN_CODES.has(code)) {
                    staleRefs.push(tokens[idx].ref);
                }
            }
        });
        let staleTokensRemovedCount = 0;
        if (staleRefs.length > 0) {
            const cleanupResults = await Promise.allSettled(staleRefs.map((ref) => ref.delete()));
            staleTokensRemovedCount = cleanupResults.filter((r) => r.status === 'fulfilled').length;
        }
        const finalStatus = response.successCount > 0 ? 'dispatched' : 'failed';
        await deliveryRef.update({
            status: finalStatus,
            targetRecipientsCount: tokens.length,
            deliveredCount: response.successCount,
            failedCount: response.failureCount,
            staleTokensRemovedCount,
            dispatchedAtMs: Date.now(),
        });
        return {
            dispatchId,
            deduplicated: false,
            status: finalStatus,
            targetRecipientsCount: tokens.length,
            deliveredCount: response.successCount,
            failedCount: response.failureCount,
            staleTokensRemovedCount,
        };
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error('Failed to dispatch alert notification', {
            alertId: alert.id,
            dispatchId,
            eventType,
            error: errorMessage,
        });
        await deliveryRef
            .update({
            status: 'failed',
            errorMessage: errorMessage.slice(0, 300),
            dispatchedAtMs: Date.now(),
        })
            .catch(() => undefined);
        throw err;
    }
}
function classifyAlertUpdate(before, after) {
    const statusChanged = before.status !== after.status;
    const updatesGrew = (after.hospitalUpdates?.length || 0) > (before.hospitalUpdates?.length || 0);
    const escalationChanged = (!before.escalated && Boolean(after.escalated)) ||
        cleanId(before.escalationTargetHospitalId) !== cleanId(after.escalationTargetHospitalId);
    if (!statusChanged && !updatesGrew && !escalationChanged) {
        return {
            shouldDispatch: false,
            eventType: 'status_updated',
            actorRole: null,
            actorId: null,
            actorHospitalId: null,
        };
    }
    const eventType = after.status === 'escalated' ||
        (!before.escalated && (Boolean(after.escalated) || after.status === 'referred'))
        ? 'escalated'
        : after.status === 'resolved' || after.status === 'closed'
            ? 'resolved'
            : 'status_updated';
    const latestUpdate = after.hospitalUpdates && after.hospitalUpdates.length > 0
        ? after.hospitalUpdates[after.hospitalUpdates.length - 1]
        : undefined;
    return {
        shouldDispatch: true,
        eventType,
        actorRole: normalizeRole(latestUpdate?.actorRole),
        actorId: cleanId(latestUpdate?.actorId),
        actorHospitalId: cleanId(latestUpdate?.actorHospitalId || latestUpdate?.hospitalId),
    };
}
exports.onEmergencyAlertCreated = (0, firestore_2.onDocumentCreated)({
    document: 'emergencyAlerts/{alertId}',
    database: exports.NAMED_DATABASE_ID,
    region: exports.FUNCTIONS_REGION,
    serviceAccount: exports.NOTIFIER_SERVICE_ACCOUNT,
}, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const rawAlert = snap.data();
    const alert = {
        ...rawAlert,
        id: cleanId(rawAlert.id) || snap.id,
    };
    const eventTs = alert.createdAtMs || Date.now();
    await processAlertDispatch(alert, 'alert_created', normalizeRole(alert.raisedByRole), eventTs, { actorId: cleanId(alert.raisedById) });
});
exports.onEmergencyAlertUpdated = (0, firestore_2.onDocumentUpdated)({
    document: 'emergencyAlerts/{alertId}',
    database: exports.NAMED_DATABASE_ID,
    region: exports.FUNCTIONS_REGION,
    serviceAccount: exports.NOTIFIER_SERVICE_ACCOUNT,
}, async (event) => {
    const before = event.data?.before.data();
    const rawAfter = event.data?.after.data();
    if (!before || !rawAfter)
        return;
    const after = {
        ...rawAfter,
        id: cleanId(rawAfter.id) || event.data.after.id,
    };
    const classification = classifyAlertUpdate(before, after);
    if (!classification.shouldDispatch)
        return;
    await processAlertDispatch(after, classification.eventType, classification.actorRole, after.updatedAtMs || Date.now(), {
        actorId: classification.actorId,
        actorHospitalId: classification.actorHospitalId,
    });
});
//# sourceMappingURL=index.js.map