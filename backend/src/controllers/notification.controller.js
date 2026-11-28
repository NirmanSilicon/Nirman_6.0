const { z } = require('zod');
const { getVapidKeys, saveUserPushSubscription } = require('../services/push.service');
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

module.exports = {
  subscribePushSchema,
  getVapidPublicKey,
  subscribePush,
};
