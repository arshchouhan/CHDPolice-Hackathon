const express = require('express');
const router = express.Router();

// Import controller
const emailController = require('../controllers/email.controller');

// Route to analyze an email
router.post('/analyze', emailController.analyzeEmail);

// Route to get email analysis history
router.get('/history', emailController.getAnalysisHistory);

// Route to get a specific email analysis
router.get('/:id', emailController.getAnalysis);

module.exports = router;
