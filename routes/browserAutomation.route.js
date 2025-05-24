/**
 * Browser Automation Routes
 * Handles routes for browser automation functionality
 */

const express = require('express');
const router = express.Router();
const browserAutomationController = require('../controllers/browserAutomation.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Queue a URL for browser automation analysis
router.post('/queue-url', browserAutomationController.queueUrl);

// Get URL analysis status
router.get('/status/:urlId', browserAutomationController.getUrlStatus);

// Analyze URLs from an email
router.post('/analyze-email/:emailId', browserAutomationController.analyzeEmailUrls);

// Get screenshot for a URL analysis
router.get('/screenshot/:urlId', browserAutomationController.getScreenshot);

// Receive browser automation results (no auth for internal communication)
router.post('/results', (req, res, next) => {
    // Skip auth middleware for internal API calls
    // This endpoint is called by the browser automation container
    next();
}, browserAutomationController.receiveResults);

module.exports = router;
