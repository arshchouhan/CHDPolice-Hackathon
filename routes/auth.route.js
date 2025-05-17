const express = require('express');
const router = express.Router();
const { login, signup } = require('../controllers/authController');

router.post('/login', login);  // Single route to handle both roles
router.post('/signup', signup); // Route for user registration

module.exports = router;
