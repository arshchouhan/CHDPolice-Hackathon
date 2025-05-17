const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/login', authController.login);  // Single route to handle both roles
router.post('/signup', authController.signup); // Route for user registration
router.get('/google/callback', authController.googleSignIn);
router.get('/google', (req, res) => {
    const redirectUri = 'https://chdpolice-hackathon.vercel.app/auth/google/callback';
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=email%20profile`;
    res.redirect(googleAuthUrl);
}); // Route for Google Sign-In
router.post('/logout', authController.logout); // Route for logout

module.exports = router;
