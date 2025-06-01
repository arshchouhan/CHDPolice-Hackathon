const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Enhanced error handling wrapper
const asyncHandler = (fn, routeName = '') => (req, res, next) => {
    const requestId = Math.random().toString(36).substring(2, 10);
    console.log(`[${new Date().toISOString()}] [${requestId}] [${routeName}] Request started`);
    
    Promise.resolve(fn(req, res, next))
        .then(result => {
            console.log(`[${new Date().toISOString()}] [${requestId}] [${routeName}] Request completed successfully`);
            return result;
        })
        .catch((error) => {
            console.error(`[${new Date().toISOString()}] [${requestId}] [${routeName}] Error:`, error);
            console.error('Error stack:', error.stack);
            
            // Handle specific error types
            if (error.name === 'ValidationError') {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors,
                    requestId
                });
            }
            
            // Handle JWT errors
            if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication error',
                    error: error.message,
                    code: 'AUTH_ERROR',
                    requestId
                });
            }
            
            // Default error response
            res.status(500).json({
                success: false,
                message: 'An unexpected error occurred. Please try again later.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
                code: 'SERVER_ERROR',
                requestId
            });
        });
};

// Apply error handling to routes with route names for better logging
router.post('/login', asyncHandler(authController.login, 'LOGIN'));
router.post('/signup', asyncHandler(authController.signup, 'SIGNUP'));
router.post('/google', asyncHandler(authController.googleSignIn, 'GOOGLE_AUTH'));
router.get('/google', asyncHandler(authController.googleSignIn, 'GOOGLE_REDIRECT'));
router.post('/logout', asyncHandler(authController.logout, 'LOGOUT'));
router.get('/check-auth', asyncHandler(authController.checkAuth, 'CHECK_AUTH'));

module.exports = router;
