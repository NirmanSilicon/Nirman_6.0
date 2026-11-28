const express = require('express');
const {
  listIncidents,
  getIncidentById,
  verifyIncidentRecordIntegrity,
} = require('../controllers/incident.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', listIncidents);
router.get('/:id/verify-integrity', verifyIncidentRecordIntegrity);
router.get('/:id', getIncidentById);

module.exports = router;
