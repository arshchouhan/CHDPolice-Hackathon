/**
 * IP Analysis Routes
 * 
 * API routes for IP address analysis and geolocation
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const ipAnalysisController = require('../controllers/ipAnalysis.controller');

// Get detailed information about an IP address
router.get('/details/:ipAddress', authMiddleware, ipAnalysisController.getIpDetails);

module.exports = router;
