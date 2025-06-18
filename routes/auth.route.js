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

// Login route with explicit method handling
router.route('/login')
    .post(asyncHandler(authController.login))  // Allow POST for login
    .all(asyncHandler((req, res) => {  // Reject all other methods
        res.status(405).json({
            success: false,
            message: 'Method not allowed. Use POST for login.'
        });
    }));

// Other routes
router.post('/signup', asyncHandler(authController.signup));
router.post('/google', asyncHandler(authController.googleSignIn));
router.get('/google', asyncHandler(authController.googleSignIn));
router.post('/logout', asyncHandler(authController.logout));
router.get('/check-auth', asyncHandler(authController.checkAuth));
router.post('/refresh', asyncHandler(authController.refresh));

module.exports = router;
