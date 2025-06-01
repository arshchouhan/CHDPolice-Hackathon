const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const rateLimit = require('express-rate-limit');

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { 
        success: false,
        message: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Error handling wrapper with enhanced logging
const asyncHandler = (fn) => async (req, res, next) => {
    const requestId = req.id || Date.now().toString(36);
    console.log(`[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.originalUrl}`);
    
    try {
        await fn(req, res, next);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] [${requestId}] Error:`, {
            message: error.message,
            stack: error.stack,
            url: req.originalUrl,
            method: req.method,
            body: req.body,
            params: req.params,
            query: req.query,
            headers: req.headers
        });
        
        const statusCode = error.statusCode || 500;
        const response = {
            success: false,
            message: error.message || 'Server error. Please try again later.',
            code: error.code || 'INTERNAL_SERVER_ERROR',
            ...(process.env.NODE_ENV === 'development' && {
                stack: error.stack,
                details: error.details
            })
        };
        
        res.status(statusCode).json(response);
    }
};

// Apply rate limiting to auth routes
router.use(authLimiter);

// Auth routes
router.post('/login', asyncHandler(authController.login));
router.get('/check-auth', asyncHandler(authController.checkAuth));
router.post('/logout', asyncHandler(authController.logout));

// Google OAuth routes (if needed)
router.post('/google', asyncHandler(authController.googleSignIn));
router.get('/google', asyncHandler(authController.googleSignIn));

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
    });
});

module.exports = router;
