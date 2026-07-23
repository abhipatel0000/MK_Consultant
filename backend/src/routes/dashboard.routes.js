const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { requireAdmin } = require('../middlewares/auth.middleware');

// Apply admin authentication to all routes
router.use(requireAdmin);

// Dashboard routes
router.get('/summary', dashboardController.getSummary);
router.get('/visitor-trends', dashboardController.getVisitorTrends);
router.get('/interaction-trends', dashboardController.getInteractionTrends);
router.get('/lead-trends', dashboardController.getLeadTrends);
router.get('/recent-activity', dashboardController.getRecentActivity);

module.exports = router;
