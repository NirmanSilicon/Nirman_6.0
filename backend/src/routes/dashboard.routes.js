const express = require('express');
const {
  getDashboardOverview,
  getDashboardAnalytics,
  getDashboardRecentActivities,
  getDashboardZones,
} = require('../controllers/dashboard.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);

router.get('/overview', getDashboardOverview);
router.get('/analytics', getDashboardAnalytics);
router.get('/recent-activities', getDashboardRecentActivities);
router.get('/zones', getDashboardZones);

module.exports = router;
