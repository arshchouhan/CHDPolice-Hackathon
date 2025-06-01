const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Simple error handler
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Auth routes
router.post('/login', asyncHandler(authController.login));
router.post('/signup', asyncHandler(authController.signup));
router.post('/google', asyncHandler(authController.googleSignIn));
router.post('/logout', asyncHandler(authController.logout));
router.get('/check-auth', asyncHandler(authController.checkAuth));

module.exports = router;