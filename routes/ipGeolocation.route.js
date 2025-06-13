/**
 * IP Geolocation Routes
 * Routes for IP resolution, geolocation, and data center detection
 */

const express = require('express');
const router = express.Router();
const ipGeolocationController = require('../controllers/ipGeolocation.controller');
const authenticateUser = require('../middlewares/auth.middleware');

// Apply authentication middleware to all routes
router.use(authenticateUser);

// Resolve domain to IP address
router.get('/resolve-domain', ipGeolocationController.resolveDomain);

// Get geolocation data for an IP address
router.get('/ip-info', ipGeolocationController.getIpGeolocation);

// Analyze a URL for IP and geolocation data
router.post('/analyze-url', ipGeolocationController.analyzeUrl);

// Get URL IP analysis history
router.get('/history', ipGeolocationController.getAnalysisHistory);

module.exports = router;
