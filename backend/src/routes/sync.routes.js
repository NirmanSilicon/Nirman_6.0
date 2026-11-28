const express = require('express');
const {
  receiveSyncBatch,
  triggerSyncCycle,
  getSyncStatus,
} = require('../controllers/sync.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

// Edge-to-Cloud batch ingestion endpoint (authenticated via X-Edge-Node-Key)
router.post('/batch', receiveSyncBatch);

// Authenticated status & manual sync trigger endpoints
router.get('/status', requireAuth, getSyncStatus);
router.post('/run', requireAuth, requireRole(['ADMINISTRATOR', 'SUPERVISOR']), triggerSyncCycle);

module.exports = router;
