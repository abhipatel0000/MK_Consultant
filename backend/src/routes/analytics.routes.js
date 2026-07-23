const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { requireAdmin } = require('../middlewares/auth.middleware');

// Apply admin authentication to all routes
router.use(requireAdmin);

// Analytics routes
router.get('/visitors', analyticsController.getVisitorAnalytics);
router.get('/interactions', analyticsController.getInteractionAnalytics);
router.get('/services', analyticsController.getServiceAnalytics);
router.get('/partners', analyticsController.getPartnerAnalytics);
router.get('/documents', analyticsController.getDocumentAnalytics);

module.exports = router;
