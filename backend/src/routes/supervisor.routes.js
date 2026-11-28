const express = require('express');
const {
  getSupervisorZones,
  acknowledgeIncident,
  verifyIncident,
  resolveIncident,
} = require('../controllers/supervisor.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { verifyIncidentSchema, resolveIncidentSchema } = require('../validators/supervisor.validator');

const router = express.Router();

router.use(requireAuth, requireRole(['SUPERVISOR', 'ADMINISTRATOR']));

router.get('/zones', getSupervisorZones);
router.post('/incidents/:id/acknowledge', acknowledgeIncident);
router.post('/incidents/:id/verify', validate(verifyIncidentSchema), verifyIncident);
router.post('/incidents/:id/resolve', validate(resolveIncidentSchema), resolveIncident);

module.exports = router;
