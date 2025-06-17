const express = require('express');
const router = express.Router();
const gmailController = require('../controllers/gmail.controller');
const { authenticateToken } = require('../middlewares/requireRole');

// Protected routes (require authentication)
router.get('/auth-url', authenticateToken, gmailController.getAuthUrl);
router.get('/status', authenticateToken, gmailController.getStatus);
router.get('/emails', authenticateToken, gmailController.fetchEmails);
router.post('/scan', authenticateToken, gmailController.scanEmails);
router.post('/scan/:userId', authenticateToken, gmailController.scanEmails); // Admin endpoint
router.post('/disconnect', authenticateToken, gmailController.disconnectGmail);

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Gmail route error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'An error occurred while processing your request',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = router;
