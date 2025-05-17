const express = require('express');
const router = express.Router();

// GET admin dashboard
router.get('/dashboard', (req, res) => {
    res.json({ message: 'Admin dashboard' });
});

// POST admin action
router.post('/action', (req, res) => {
    res.json({ message: 'Admin action' });
});

module.exports = router;