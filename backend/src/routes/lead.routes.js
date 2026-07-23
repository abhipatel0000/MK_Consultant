const express = require('express');
const router = express.Router();
const leadController = require('../controllers/lead.controller');
const { requireAdmin } = require('../middlewares/auth.middleware');

// Apply admin authentication to all routes
router.use(requireAdmin);

// Note: /export must come BEFORE /:id so it doesn't get treated as an ID parameter
router.get('/export', leadController.exportLeads);

// Lead management routes
router.get('/', leadController.getLeads);
router.get('/:id', leadController.getLeadById);
router.patch('/:id/status', leadController.updateLeadStatus);

// Timeline
router.get('/:id/timeline', leadController.getLeadTimeline);

// Private notes
router.get('/:id/notes', leadController.getLeadNotes);
router.post('/:id/notes', leadController.addLeadNote);
router.patch('/:id/notes/:noteId', leadController.updateLeadNote);

module.exports = router;
