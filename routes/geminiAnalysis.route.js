/**
 * Gemini Analysis Routes
 * 
 * API routes for email analysis using Google's Gemini API
 */

const express = require('express');
const router = express.Router();
const geminiController = require('../controllers/geminiAnalysis.controller');

// Analyze an email using Gemini API
router.post('/analyze-email', geminiController.analyzeEmail);

// Analyze an email using local analysis only (no Gemini API)
router.post('/analyze-email-local', geminiController.analyzeEmailLocal);

// Analyze a URL using Gemini API
router.post('/analyze-url', geminiController.analyzeUrl);

// Get suspicious URLs from an email
router.get('/suspicious-urls/:emailId', geminiController.getSuspiciousUrls);

// Submit suspicious URLs to sandbox for analysis
router.post('/submit-to-sandbox/:emailId', geminiController.submitUrlsToSandbox);

module.exports = router;
