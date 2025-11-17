import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { setGmailStatusToPending, getGmailStatus } from '../controllers/gmailStatus.controller.js';

const router = express.Router();

// Protected routes (require authentication)
router.use(protect);

/**
 * @route   PUT /api/user/gmail/status/pending
 * @desc    Update user's Gmail connection status to 'pending'
 * @access  Private
 */
router.put('/pending', setGmailStatusToPending);

/**
 * @route   GET /api/user/gmail/status
 * @desc    Get user's Gmail connection status
 * @access  Private
 */
router.get('/', getGmailStatus);

export default router;
