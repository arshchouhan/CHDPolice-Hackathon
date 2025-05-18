const express = require('express');
const router = express.Router();
const gmailController = require('../controllers/gmail.controller');
const { authenticateToken } = require('../middlewares/requireRole');

// Get Gmail OAuth URL
router.get('/auth-url', authenticateToken, gmailController.getAuthUrl);

// Handle OAuth callback
router.get('/callback', gmailController.handleCallback);

// Fetch emails from Gmail
router.get('/fetch-emails', authenticateToken, gmailController.fetchEmails);

// Disconnect Gmail
router.post('/disconnect', authenticateToken, gmailController.disconnectGmail);

module.exports = router;
