const express = require('express');
const router = express.Router();

// GET all users
router.get('/', (req, res) => {
    res.json({ message: 'Get all users' });
});

// POST new user
router.post('/', (req, res) => {
    res.json({ message: 'Create new user' });
});

module.exports = router;