const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Google Sign-In route
router.post('/google', authController.googleSignIn);

// Regular authentication routes
router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.get('/logout', authController.logout);

// Redirect after successful login
router.get('/success', (req, res) => {
    res.redirect('/index.html');
});

module.exports = router;
