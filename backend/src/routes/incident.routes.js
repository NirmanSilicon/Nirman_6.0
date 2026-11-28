const express = require('express');
const {
  listIncidents,
  getIncidentById,
  verifyIncidentRecordIntegrity,
  getIncidentManualSos,
  getIncidentEvidenceFile,
} = require('../controllers/incident.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', listIncidents);
router.get('/:id/verify-integrity', verifyIncidentRecordIntegrity);
router.get('/:id/sos', getIncidentManualSos);
router.get('/:id/evidence/:evidenceId', getIncidentEvidenceFile);
router.get('/:id', getIncidentById);

module.exports = router;
