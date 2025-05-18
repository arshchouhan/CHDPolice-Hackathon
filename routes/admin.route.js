const express = require('express');
const router = express.Router();
const { requireRole } = require('../middlewares/requireRole');
const adminController = require('../controllers/admin.controller');

// Dashboard route
router.get('/dashboard', requireRole('admin'), adminController.dashboard);

// Email management routes
router.get('/emails', requireRole('admin'), adminController.getAllEmails);
router.get('/emails/:id', requireRole('admin'), adminController.getEmailById);
router.patch('/emails/:id', requireRole('admin'), adminController.updateEmailStatus);
router.get('/email-stats', requireRole('admin'), adminController.getEmailStats);

// User management routes
router.get('/users', requireRole('admin'), adminController.getUsers);

module.exports = router;
