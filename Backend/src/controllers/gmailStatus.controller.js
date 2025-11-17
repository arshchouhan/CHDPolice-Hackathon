import User from '../models/User.js';
import { NotFoundError } from '../utils/errorHandler.js';

/**
 * @desc    Update user's Gmail connection status to 'pending'
 * @route   PUT /api/user/gmail/status/pending
 * @access  Private
 */
export const setGmailStatusToPending = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        gmailStatus: 'pending',
        gmailConnectionInitiatedAt: new Date(),
        $unset: { 
          gmailTokens: 1,
          gmailEmail: 1,
          lastGmailSync: 1
        }
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.status(200).json({
      success: true,
      data: {
        gmailStatus: user.gmailStatus,
        gmailConnectionInitiatedAt: user.gmailConnectionInitiatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's Gmail connection status
 * @route   GET /api/user/gmail/status
 * @access  Private
 */
export const getGmailStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('gmailStatus gmailEmail gmailConnectionInitiatedAt');

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.status(200).json({
      success: true,
      data: {
        gmailStatus: user.gmailStatus,
        gmailEmail: user.gmailEmail,
        gmailConnectionInitiatedAt: user.gmailConnectionInitiatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};
