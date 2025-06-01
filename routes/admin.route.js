const express = require('express');
const router = express.Router();
const requireAdmin = require('../middlewares/requireAdmin');
const adminController = require('../controllers/admin.controller');

// Apply admin middleware to all routes
router.use(requireAdmin);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard statistics
 * @access  Private/Admin
 */
router.get('/dashboard', adminController.dashboard);

/**
 * @route   GET /api/admin/emails
 * @desc    Get all emails with filtering and pagination
 * @access  Private/Admin
 */
router.get('/emails', adminController.getAllEmails);

/**
 * @route   GET /api/admin/emails/:id
 * @desc    Get email by ID
 * @access  Private/Admin
 */
router.get('/emails/:id', adminController.getEmailById);

/**
 * @route   PATCH /api/admin/emails/:id
 * @desc    Update email status
 * @access  Private/Admin
 */
router.patch('/emails/:id', adminController.updateEmailStatus);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Private/Admin
 */
router.get('/users', adminController.getUsers);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID
 * @access  Private/Admin
 */
router.get('/users/:id', adminController.getUserById);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete a user
 * @access  Private/Admin
 */
router.delete('/users/:id', adminController.deleteUser);

/**
 * @route   GET /api/admin/verify-connection/:id
 * @desc    Verify Gmail connection for a user
 * @access  Private/Admin
 */
router.get('/verify-connection/:id', adminController.verifyGmailConnection);

/**
 * @route   POST /api/admin/sync-emails/:id
 * @desc    Sync emails for a specific user
 * @access  Private/Admin
 */
router.post('/sync-emails/:id', adminController.syncUserEmails);

/**
 * @route   GET /api/admin/email-stats
 * @desc    Get email statistics
 * @access  Private/Admin
 */
router.get('/email-stats', adminController.getEmailStats);

/**
 * @route   GET /api/admin/health
 * @desc    Health check endpoint for admin
 * @access  Private/Admin
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    user: req.user ? {
      id: req.user._id,
      email: req.user.email,
      role: 'admin'
    } : null
  });
});

// Handle 404 for admin routes
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Admin API endpoint not found',
    path: req.originalUrl
  });
});

// Error handling middleware for admin routes
router.use((err, req, res, next) => {
  console.error('Admin route error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = router;
