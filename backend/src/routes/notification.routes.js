const express = require('express');
const {
  subscribePushSchema,
  getVapidPublicKey,
  subscribePush,
} = require('../controllers/notification.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();

router.use(requireAuth);

router.get('/vapid-public-key', getVapidPublicKey);
router.post('/subscribe', validate(subscribePushSchema), subscribePush);

module.exports = router;
