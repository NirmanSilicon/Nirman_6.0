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
exports.onEmergencyAlertUpdated = exports.onEmergencyAlertCreated = void 0;
const crypto_1 = __importDefault(require("crypto"));
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
const firestore_2 = require("firebase-functions/v2/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const NAMED_DATABASE_ID = 'ai-studio-janmasaathi-8e8b2a1f-7b17-42e6-bc8e-284c5c28d2df';
const FUNCTIONS_REGION = 'asia-south1';
const CANONICAL_SUPERVISOR_ID = 'SUP-2025-012';
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_1.getFirestore)(NAMED_DATABASE_ID);
const messaging = (0, messaging_1.getMessaging)();
const INVALID_FCM_TOKEN_CODES = new Set([
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
]);
function normalizeRole(rawRole) {
    if (typeof rawRole !== 'string')
        return null;
    if (rawRole === 'hospital_staff' || rawRole === 'hospital' || rawRole === 'facility') {
        return 'hospital_staff';
    }
    if (rawRole === 'mother' || rawRole === 'worker' || rawRole === 'supervisor') {
        return rawRole;
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
function resolveRecipients(alert, eventType, actorRole) {
    const hospitalIds = new Set();
    const workerIds = new Set();
    const motherIds = new Set();
    const supervisorIds = new Set();
    if (alert.targetHospitalId) {
        hospitalIds.add(alert.targetHospitalId);
    }
    if (alert.escalationTargetHospitalId) {
        hospitalIds.add(alert.escalationTargetHospitalId);
    }
    const effectiveSupervisorId = alert.supervisorId || CANONICAL_SUPERVISOR_ID;
    if (eventType === 'alert_created') {
        if (alert.raisedByRole === 'mother') {
            if (alert.assignedWorkerId)
                workerIds.add(alert.assignedWorkerId);
            supervisorIds.add(effectiveSupervisorId);
        }
        else if (alert.raisedByRole === 'worker') {
            if (alert.motherId)
                motherIds.add(alert.motherId);
            supervisorIds.add(effectiveSupervisorId);
        }
        else if (alert.raisedByRole === 'supervisor') {
            if (alert.assignedWorkerId)
                workerIds.add(alert.assignedWorkerId);
            if (alert.motherId)
                motherIds.add(alert.motherId);
        }
    }
    else {
        if (alert.motherId)
            motherIds.add(alert.motherId);
        if (alert.assignedWorkerId)
            workerIds.add(alert.assignedWorkerId);
        supervisorIds.add(effectiveSupervisorId);
    }
    // Never notify the triggering actor for their own action
    if (actorRole === 'mother' && alert.motherId)
        motherIds.delete(alert.motherId);
    if (actorRole === 'worker' && alert.assignedWorkerId)
        workerIds.delete(alert.assignedWorkerId);
    if (actorRole === 'supervisor')
        supervisorIds.delete(effectiveSupervisorId);
    if (actorRole === 'hospital_staff' && alert.targetHospitalId) {
        hospitalIds.delete(alert.targetHospitalId);
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
async function collectAuthorizedTokens(recipients) {
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
async function processAlertDispatch(alert, eventType, actorRole, eventTimestampMs) {
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
            dispatchedAtMs: Date.now(),
        });
        return true;
    });
    if (!claimed) {
        logger.info('Deduplicated alert push dispatch', { alertId: alert.id, dispatchId, eventType });
        return;
    }
    const recipients = resolveRecipients(alert, eventType, actorRole);
    const tokens = await collectAuthorizedTokens(recipients);
    if (tokens.length === 0) {
        await deliveryRef.update({
            status: 'no_registered_tokens',
            targetRecipientsCount: 0,
        });
        return;
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
    if (staleRefs.length > 0) {
        await Promise.allSettled(staleRefs.map((ref) => ref.delete()));
    }
    await deliveryRef.update({
        status: response.successCount > 0 ? 'dispatched' : 'failed',
        targetRecipientsCount: tokens.length,
        deliveredCount: response.successCount,
        failedCount: response.failureCount,
        dispatchedAtMs: Date.now(),
    });
}
exports.onEmergencyAlertCreated = (0, firestore_2.onDocumentCreated)({
    document: 'emergencyAlerts/{alertId}',
    database: NAMED_DATABASE_ID,
    region: FUNCTIONS_REGION,
    ...(process.env.FUNCTIONS_RUNTIME_SA ? { serviceAccount: process.env.FUNCTIONS_RUNTIME_SA } : {}),
}, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const alert = snap.data();
    const eventTs = alert.createdAtMs || Date.now();
    await processAlertDispatch(alert, 'alert_created', normalizeRole(alert.raisedByRole), eventTs);
});
exports.onEmergencyAlertUpdated = (0, firestore_2.onDocumentUpdated)({
    document: 'emergencyAlerts/{alertId}',
    database: NAMED_DATABASE_ID,
    region: FUNCTIONS_REGION,
    ...(process.env.FUNCTIONS_RUNTIME_SA ? { serviceAccount: process.env.FUNCTIONS_RUNTIME_SA } : {}),
}, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    const statusChanged = before.status !== after.status;
    const updatesGrew = (after.hospitalUpdates?.length || 0) > (before.hospitalUpdates?.length || 0);
    if (!statusChanged && !updatesGrew)
        return;
    const eventType = after.status === 'escalated' || (!before.escalated && after.status === 'referred')
        ? 'escalated'
        : after.status === 'resolved' || after.status === 'closed'
            ? 'resolved'
            : 'status_updated';
    const latestUpdate = after.hospitalUpdates && after.hospitalUpdates.length > 0
        ? after.hospitalUpdates[after.hospitalUpdates.length - 1]
        : undefined;
    const actorRole = normalizeRole(latestUpdate?.actorRole);
    await processAlertDispatch(after, eventType, actorRole, after.updatedAtMs || Date.now());
});
//# sourceMappingURL=index.js.map