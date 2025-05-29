const express = require('express');
const router = express.Router();
const gmailController = require('../controllers/gmail.controller');
const { authenticateToken } = require('../middlewares/requireRole');

// Get Gmail OAuth URL
router.get('/auth-url', authenticateToken, gmailController.getAuthUrl);

// Handle OAuth callback
router.get('/callback', gmailController.handleCallback);

// Check Gmail connection status
router.get('/status', authenticateToken, gmailController.getStatus);

// Get Gmail profile information
router.get('/profile', authenticateToken, gmailController.getProfile);

// Fetch emails from Gmail
router.get('/fetch-emails', authenticateToken, gmailController.fetchEmails);

// Scan emails for phishing threats
router.post('/scan', authenticateToken, gmailController.scanEmails);

// Disconnect Gmail
router.post('/disconnect', authenticateToken, gmailController.disconnectGmail);

module.exports = router;
