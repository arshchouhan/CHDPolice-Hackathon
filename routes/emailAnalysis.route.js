const express = require('express');
const router = express.Router();
const emailAnalysisController = require('../controllers/emailAnalysis.controller');
const { authenticateToken } = require('../middlewares/requireRole');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Route to analyze a specific email
router.get('/analyze/:emailId', emailAnalysisController.analyzeEmail);

// Route to analyze all emails for a user
router.get('/analyze-all', emailAnalysisController.analyzeAllEmails);

// Route to get analysis results for an email
router.get('/results/:emailId', emailAnalysisController.getAnalysisResults);

module.exports = router;
