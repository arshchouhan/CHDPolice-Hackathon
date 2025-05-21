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

// User management routes
router.get('/users', requireRole('admin'), adminController.getUsers);
router.get('/users/:id', requireRole('admin'), adminController.getUserById);
router.delete('/users/:id', requireRole('admin'), adminController.deleteUser);

// Gmail connection verification
router.get('/verify-connection/:id', adminController.verifyGmailConnection);

// Sync emails for a specific user
router.post('/sync-emails/:id', requireRole('admin'), adminController.syncUserEmails);
router.get('/sync-emails/:id', adminController.syncUserEmails);

// Email statistics route
router.get('/email-stats', adminController.getEmailStats);

module.exports = router;
