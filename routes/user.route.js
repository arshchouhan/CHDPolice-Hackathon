const express = require('express');
const router = express.Router();
const requireRole = require('../middlewares/requireRole');
const userController = require('../controllers/user.controller');

router.get('/dashboard', requireRole('user'), userController.dashboard);

module.exports = router;
