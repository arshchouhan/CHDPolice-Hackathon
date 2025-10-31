import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import User from '../models/User.js';

const router = Router();

// Helper function to get base URL
const getBaseUrl = (req) => {
  return `${req.protocol}://${req.get('host')}`;
};

/**
 * @route   GET /connection-status
 * @desc    Get current Gmail connection status
 * @access  Private
 */
router.get('/connection-status', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id, 'gmailStatus gmailConnected gmailEmail lastGmailSync name email');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            status: user.gmailStatus || 'disconnected',
            connected: user.gmailConnected || false,
            email: user.gmailEmail || user.email,
            lastSync: user.lastGmailSync,
            user: {
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Error getting Gmail connection status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get Gmail connection status',
            error: error.message
        });
    }
});

/**
 * @route   POST /connect
 * @desc    Initiate Gmail connection process
 * @access  Private
 */
router.post('/connect', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Update user's Gmail connection status to 'pending'
        user.gmailStatus = 'pending';
        user.gmailConnected = false;
        user.gmailConnectionInitiatedAt = new Date();
        await user.save();

        // In a real implementation, you would trigger the actual Gmail API connection here
        // For now, we'll simulate a successful connection after a delay
        setTimeout(async () => {
            try {
                const updatedUser = await User.findById(userId);
                if (updatedUser) {
                    updatedUser.gmailStatus = 'connected';
                    updatedUser.gmailConnected = true;
                    updatedUser.gmailEmail = updatedUser.email; // Use the user's email as Gmail
                    updatedUser.lastGmailSync = new Date();
                    await updatedUser.save();
                }
            } catch (error) {
                console.error('Error updating Gmail connection status:', error);
                await User.findByIdAndUpdate(userId, {
                    gmailStatus: 'failed',
                    gmailConnected: false,
                    lastGmailSync: new Date()
                });
            }
        }, 3000); // 3 second delay for demonstration

        res.status(202).json({
            success: true,
            message: 'Gmail connection request received. Processing...',
            status: 'pending',
            user: {
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Error initiating Gmail connection:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initiate Gmail connection',
            error: error.message
        });
    }
});

export default router;
