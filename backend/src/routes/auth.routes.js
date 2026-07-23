const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { requireAdmin } = require('../middlewares/auth.middleware');
const { loginLimiter } = require('../middlewares/rate-limit.middleware');

// Public login (rate limited)
router.post('/login', loginLimiter, authController.login);

// Public logout (does not strictly block if not authenticated, clears session)
router.post('/logout', authController.logout);

// Protected profile retrieval
router.get('/me', requireAdmin, authController.me);

// Protected password change
router.post('/change-password', requireAdmin, authController.changePassword);

module.exports = router;
