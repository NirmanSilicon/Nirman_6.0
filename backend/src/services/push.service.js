const webpush = require('web-push');
const { PushSubscription } = require('../models/PushSubscription.model');
const { ZoneAssignment } = require('../models/ZoneAssignment.model');
const { User } = require('../models/User.model');
const { Incident } = require('../models/Incident.model');

let vapidKeys = null;

/**
 * Resolve or generate VAPID keys for Web Push notifications.
 */
const getVapidKeys = () => {
  if (vapidKeys) return vapidKeys;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    vapidKeys = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    };
  } else {
    vapidKeys = webpush.generateVAPIDKeys();
  }
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:safety@smartppe.local',
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );
  } catch (_err) {
    // Ignore in environments where VAPID setup is deferred
  }
  return vapidKeys;
};

/**
 * Save or update a browser Web Push subscription for an authenticated user.
 */
const saveUserPushSubscription = async ({ userId, role, endpoint, keys }) => {
  const sub = await PushSubscription.findOneAndUpdate(
    { endpoint },
    {
      $set: {
        userId,
        role,
        endpoint,
        keys,
      },
    },
    { upsert: true, new: true }
  );
  return sub;
};

/**
 * Dispatch a Web Push notification to all Administrators and Zone-Assigned Supervisors
 * when a 120s warning escalates to OPEN or when a CRITICAL emergency occurs.
 * Prevents duplicate push spam via `incident.lastPushSentAt`.
 */
const notifyZoneSupervisorsPush = async ({ incidentId, zoneId, title, body, urgency = 'high' }) => {
  if (!incidentId || !zoneId) return { sent: 0, skippedDuplicate: false };

  const incident = await Incident.findById(incidentId);
  if (incident && incident.lastPushSentAt && Date.now() - incident.lastPushSentAt.getTime() < 30000) {
    return { sent: 0, skippedDuplicate: true };
  }

  const [zoneAssignments, admins] = await Promise.all([
    ZoneAssignment.find({ zoneId, status: 'ACTIVE' }).select('userId').lean(),
    User.find({ role: 'ADMINISTRATOR', status: 'ACTIVE' }).select('_id').lean(),
  ]);

  const recipientUserIds = [
    ...new Set([
      ...zoneAssignments.map((a) => String(a.userId)),
      ...admins.map((u) => String(u._id)),
    ]),
  ];

  const subscriptions = await PushSubscription.find({
    userId: { $in: recipientUserIds },
  }).lean();

  if (incident) {
    incident.lastPushSentAt = new Date();
    await incident.save();
  }

  if (process.env.NODE_ENV === 'test' || subscriptions.length === 0) {
    return { sent: subscriptions.length, recipientUserIds, skippedDuplicate: false };
  }

  getVapidKeys();
  const payloadStr = JSON.stringify({
    title,
    body,
    incidentId: String(incidentId),
    zoneId: String(zoneId),
    urgency,
    timestamp: new Date().toISOString(),
  });

  let sentCount = 0;
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payloadStr,
        { urgency }
      );
      sentCount += 1;
    } catch (_err) {
      // Non-blocking: ignore unreachable browser push endpoints in offline LAN mode
    }
  }

  return { sent: sentCount, recipientUserIds, skippedDuplicate: false };
};

module.exports = {
  getVapidKeys,
  saveUserPushSubscription,
  notifyZoneSupervisorsPush,
};
