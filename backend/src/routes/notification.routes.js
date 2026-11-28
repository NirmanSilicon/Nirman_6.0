const express = require('express');
const {
  subscribePushSchema,
  getVapidPublicKey,
  subscribePush,
  getNotifications,
  getMobileConfig,
  saveMobileConfig,
  sendTestNotification,
} = require('../controllers/notification.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', getNotifications);
router.get('/vapid-public-key', getVapidPublicKey);
router.post('/subscribe', validate(subscribePushSchema), subscribePush);
router.get('/mobile-config', getMobileConfig);
router.post('/mobile-config', requireRole(['ADMINISTRATOR', 'SUPERVISOR']), saveMobileConfig);
router.post('/test', requireRole(['ADMINISTRATOR', 'SUPERVISOR']), sendTestNotification);

module.exports = router;
