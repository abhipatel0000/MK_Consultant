const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const leadController = require('../controllers/lead.controller');
const Service = require('../models/service.model');
const { enquiryLimiter, apiLimiter } = require('../middlewares/rate-limit.middleware');
const response = require('../utils/response');

// 1. Health check
router.get('/health', (req, res) => {
  return response.success(res, { uptime: process.uptime() }, 'Server is healthy.');
});

// 2. Event tracking
router.post('/events', apiLimiter, eventController.trackEvent);

// 3. Lead submission
router.post('/leads', enquiryLimiter, leadController.submitLead);

// 4. Services list
router.get('/services', async (req, res, next) => {
  try {
    const services = await Service.findAllActive();
    return response.success(res, { services }, 'Active services retrieved.');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
