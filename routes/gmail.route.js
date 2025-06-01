const express = require('express');
const router = express.Router();
const gmailController = require('../controllers/gmail.controller');
const { authenticateToken } = require('../middlewares/requireRole');
const logger = require('../utils/logger');

// Public route for OAuth callback
router.get('/callback', gmailController.handleCallback);

// Protected routes (require authentication)
router.get('/auth-url', authenticateToken, gmailController.getAuthUrl);

// Enhanced status endpoint with better error handling
router.get('/status', authenticateToken, async (req, res, next) => {
  try {
    logger.info('Gmail status check started', { userId: req.user?.id });
    await gmailController.getStatus(req, res, next);
  } catch (error) {
    logger.error('Gmail status check failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get Gmail status',
      code: 'GMAIL_STATUS_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
router.get('/emails', authenticateToken, gmailController.fetchEmails);
router.post('/scan', authenticateToken, gmailController.scanEmails);
router.post('/scan/:userId', authenticateToken, gmailController.scanEmails); // Admin endpoint
router.post('/disconnect', authenticateToken, gmailController.disconnectGmail);

// Error handling middleware
router.use((err, req, res, next) => {
  logger.error('Gmail route error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });
  
  res.status(500).json({ 
    success: false, 
    message: 'An error occurred while processing your request',
    code: 'INTERNAL_SERVER_ERROR',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = router;
