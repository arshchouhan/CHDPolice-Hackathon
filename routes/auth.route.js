const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/login', authController.login);  // Single route to handle both roles
router.post('/signup', authController.signup); // Route for user registration
router.post('/google', authController.googleSignIn); // Route for Google Sign-In
router.post('/logout', authController.logout); // Route for logout

module.exports = router;
