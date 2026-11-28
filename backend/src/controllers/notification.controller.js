const { z } = require('zod');
const webpush = require('web-push');
const { Incident } = require('../models/Incident.model');
const { PushSubscription } = require('../models/PushSubscription.model');
const { getVapidKeys, saveUserPushSubscription } = require('../services/push.service');
const { eventBus } = require('../services/eventBus');
const { sendSuccess } = require('../utils/apiResponse');

const subscribePushSchema = z
  .object({
    endpoint: z.string({ required_error: 'Push endpoint URL is required' }).trim().url(),
    keys: z
      .object({
        p256dh: z.string().trim().min(1),
        auth: z.string().trim().min(1),
      })
      .strict(),
  })
  .strict();

const getVapidPublicKey = (_req, res) => {
  const { publicKey } = getVapidKeys();
  return sendSuccess(res, 200, 'VAPID public key retrieved', { publicKey });
};

const subscribePush = async (req, res, next) => {
  try {
    const sub = await saveUserPushSubscription({
      userId: req.user.userId,
      role: req.user.role,
      endpoint: req.body.endpoint,
      keys: req.body.keys,
    });
    return sendSuccess(res, 201, 'Web Push subscription saved', {
      subscriptionId: sub.subscriptionId,
      endpoint: sub.endpoint,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/notifications
 * Returns role- and zone-scoped safety notifications derived from real MongoDB Atlas incidents,
 * including live 120-second grace countdown telemetry and Web Push subscription status.
 */
const getNotifications = async (req, res, next) => {
  try {
    const { userId, role, assignedZoneIds, workerId } = req.user;
    const filter = {};

    if (role === 'WORKER') {
      if (!workerId) {
        return sendSuccess(res, 200, 'Notifications retrieved', {
          notifications: [],
          pushSubscribed: false,
          total: 0,
        });
      }
      filter.workerId = workerId;
    } else if (role === 'SUPERVISOR') {
      if (!assignedZoneIds || assignedZoneIds.length === 0) {
        return sendSuccess(res, 200, 'Notifications retrieved', {
          notifications: [],
          pushSubscribed: false,
          total: 0,
        });
      }
      filter.zoneId = { $in: assignedZoneIds };
    }

    const limit = Math.min(60, Math.max(1, parseInt(req.query.limit || '35', 10) || 35));
    const [incidents, subCount] = await Promise.all([
      Incident.find(filter)
        .populate('zoneId', 'zoneCode zoneName')
        .populate('workerId', 'employeeCode name')
        .sort({ createdAt: -1 })
        .limit(limit),
      PushSubscription.countDocuments({ userId }),
    ]);

    const nowMs = Date.now();
    const notifications = incidents.map((inc) => {
      const iid = inc.incidentId || String(inc._id);
      const zoneName = inc.zoneId?.zoneName || 'Workplace Zone';
      const zoneCode = inc.zoneId?.zoneCode || '';
      const graceExpMs = inc.graceExpiresAt ? new Date(inc.graceExpiresAt).getTime() : 0;
      const remainingGraceSeconds =
        inc.status === 'WARNING_GRACE_PERIOD' && graceExpMs > nowMs
          ? Math.max(0, Math.ceil((graceExpMs - nowMs) / 1000))
          : 0;

      let category = 'ESCALATED';
      let title = `PPE Violation (${inc.incidentType})`;
      if (inc.isEmergency || inc.severity === 'CRITICAL') {
        category = 'EMERGENCY';
        title = `🚨 CRITICAL EMERGENCY: ${inc.incidentType}`;
      } else if (inc.status === 'WARNING_GRACE_PERIOD') {
        category = 'GRACE_WARNING';
        title = `⚠️ 120s Grace Warning: ${inc.incidentType}`;
      } else if (inc.incidentType === 'UNKNOWN_RFID') {
        category = 'RFID_ALERT';
        title = `🪪 Unregistered RFID Card Alert`;
      } else if (inc.status === 'RESOLVED' || inc.status === 'SELF_RESOLVED_IN_GRACE') {
        category = 'RESOLVED';
        title = `✓ Resolved: ${inc.incidentType}`;
      }

      return {
        notificationId: `notif-${iid}-${inc.status}`,
        incidentId: iid,
        category,
        title,
        message: inc.description,
        incidentType: inc.incidentType,
        severity: inc.severity,
        status: inc.status,
        isEmergency: Boolean(inc.isEmergency),
        zoneName,
        zoneCode,
        workerName: inc.workerId?.name || null,
        source: inc.deviceOrCameraCode || 'CAM_001',
        graceExpiresAt: inc.graceExpiresAt,
        remainingGraceSeconds,
        acknowledged: Boolean(inc.acknowledgedAt),
        createdAt: inc.createdAt,
      };
    });

    return sendSuccess(res, 200, 'Notifications retrieved', {
      notifications,
      pushSubscribed: subCount > 0,
      pushSubscriptionCount: subCount,
      total: notifications.length,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/notifications/test
 * Emits a live test alert via Socket.IO and Web Push for the authenticated Higher Authority or Supervisor.
 */
const sendTestNotification = async (req, res, next) => {
  try {
    const { userId, name, role, assignedZoneIds } = req.user;
    const roleLabel = role === 'ADMINISTRATOR' ? 'Higher Authority' : 'Supervisor';
    const payload = {
      notificationId: `test-${Date.now()}`,
      category: 'TEST_ALERT',
      title: `🔔 Live Safety Alert Verified (${roleLabel})`,
      message: `Real-time Socket.IO + Browser Push notification triggered by ${name} at ${new Date().toLocaleTimeString('en-GB')}.`,
      severity: 'HIGH',
      status: 'OPEN',
      zoneName: 'All Active Zones',
      source: 'WEB_CONSOLE',
      targetZoneId: assignedZoneIds && assignedZoneIds.length > 0 ? assignedZoneIds[0] : null,
      createdAt: new Date().toISOString(),
    };

    eventBus.emit('notification:test', payload);

    const subs = await PushSubscription.find({ userId }).lean();
    let pushSent = 0;
    if (subs.length > 0 && process.env.NODE_ENV !== 'test') {
      getVapidKeys();
      const pushBody = JSON.stringify({
        title: payload.title,
        body: payload.message,
        urgency: 'high',
        timestamp: payload.createdAt,
      });
      for (const s of subs) {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, pushBody, { urgency: 'high' });
          pushSent += 1;
        } catch (_e) {}
      }
    }

    return sendSuccess(res, 200, 'Live test notification dispatched', {
      alert: payload,
      pushSent,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  subscribePushSchema,
  getVapidPublicKey,
  subscribePush,
  getNotifications,
  sendTestNotification,
};
