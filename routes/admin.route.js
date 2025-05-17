const express = require('express');
const router = express.Router();
const requireRole = require('../middlewares/requireRole');
const adminController = require('../controllers/adminController');

router.get('/dashboard', requireRole('admin'), adminController.dashboard);

module.exports = router;
