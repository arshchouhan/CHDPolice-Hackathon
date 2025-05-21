const express = require('express');
const router = express.Router();
const { requireRole } = require('../middlewares/requireRole');
const userController = require('../controllers/user.controller');

// Dashboard route
router.get('/dashboard', requireRole('user'), userController.dashboard);

// User profile and Gmail status
router.get('/profile', requireRole('user'), userController.getProfile);
router.get('/gmail-status', requireRole('user'), userController.getGmailStatus);

// Get current user info - used for authentication verification
router.get('/me', requireRole('user'), userController.getCurrentUser);

// User emails
router.get('/emails', requireRole('user'), userController.getUserEmails);
router.get('/email-stats', requireRole('user'), userController.getUserEmailStats);

module.exports = router;
