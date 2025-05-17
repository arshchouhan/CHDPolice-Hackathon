const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Error handling wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
        console.error('Route Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    });
};

// Apply error handling to routes
router.post('/login', asyncHandler(authController.login));  // Single route to handle both roles
router.post('/signup', asyncHandler(authController.signup)); // Route for user registration
router.post('/google', asyncHandler(authController.googleSignIn)); // Route for Google Sign-In
router.post('/logout', asyncHandler(authController.logout)); // Route for logout

module.exports = router;
