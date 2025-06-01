const Email = require('../models/Email');
const User = require('../models/Users');
const Admin = require('../models/Admin');
const { google } = require('googleapis');

// Helper function to check if user is admin
const isAdmin = async (userId) => {
  try {
    const admin = await Admin.findById(userId);
    return !!admin;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Admin dashboard with stats
exports.dashboard = async (req, res) => {
  try {
    // Verify admin role
    const adminCheck = await isAdmin(req.user.id);
    if (!adminCheck) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Get counts for dashboard
    const [usersCount, emailsCount, highRiskCount, pendingReviewCount] = await Promise.all([
      User.countDocuments(),
      Email.countDocuments(),
      Email.countDocuments({ phishingRisk: 'high' }),
      Email.countDocuments({ status: 'New' })
    ]);

    res.status(200).json({
      success: true,
      message: 'Welcome to the Admin Dashboard',
      stats: {
        totalUsers: usersCount,
        totalEmails: emailsCount,
        highRiskEmails: highRiskCount,
        pendingReview: pendingReviewCount
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all analyzed emails
exports.getAllEmails = async (req, res) => {
  try {
    // Verify admin role
    const adminCheck = await isAdmin(req.user.id);
    if (!adminCheck) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { risk, userId, status, flagged, sort = '-analyzedAt', page = 1, limit = 20 } = req.query;
    
    // Build query
    const query = {};
    
    if (risk) query.phishingRisk = risk;
    if (userId) query.userId = userId;
    if (status) query.status = status;
    if (flagged === 'true') query.flagged = true;
    
    // Count total documents for pagination
    const total = await Email.countDocuments(query);
    
    // Get emails with pagination and sorting
    const emails = await Email.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('userId', 'username email');
    
    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      emails
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ message: 'Failed to fetch emails' });
  }
};

// Get email by ID
exports.getEmailById = async (req, res) => {
  try {
    const email = await Email.findById(req.params.id)
      .populate('userId', 'username email')
      .populate('actionedBy', 'username email');
    
    if (!email) {
      return res.status(404).json({ message: 'Email not found' });
    }
    
    res.status(200).json({ success: true, email });
  } catch (error) {
    console.error('Error fetching email:', error);
    res.status(500).json({ message: 'Failed to fetch email' });
  }
};

// Update email status (mark as safe, quarantine, etc.)
exports.updateEmailStatus = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    
    if (!['New', 'Reviewed', 'Quarantined', 'Safe'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const email = await Email.findByIdAndUpdate(
      req.params.id,
      {
        status,
        adminNote,
        actionedBy: req.user.id
      },
      { new: true }
    );
    
    if (!email) {
      return res.status(404).json({ message: 'Email not found' });
    }
    
    res.status(200).json({ 
      success: true, 
      message: `Email marked as ${status}`,
      email 
    });
  } catch (error) {
    console.error('Error updating email status:', error);
    res.status(500).json({ message: 'Failed to update email status' });
  }
};

// Get email statistics
exports.getEmailStats = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Get count by risk level
    const riskStats = await Email.aggregate([
      { $group: { _id: '$phishingRisk', count: { $sum: 1 } } }
    ]);
    
    // Get count by status
    const statusStats = await Email.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Get count of flagged emails
    const flaggedCount = await Email.countDocuments({ flagged: true });
    
    // Get count by user
    const userStats = await Email.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { _id: 1, username: '$user.username', email: '$user.email', count: 1 } }
    ]);
    
    res.status(200).json({
      success: true,
      stats: {
        byRisk: riskStats,
        byStatus: statusStats,
        flagged: flaggedCount,
        byUser: userStats
      }
    });
  } catch (error) {
    console.error('Error fetching email statistics:', error);
    res.status(500).json({ message: 'Failed to fetch email statistics' });
  }
};

// Get all users with Gmail connection status
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}, 'username email gmail_connected last_email_sync');
    
    res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id, 'username email gmail_connected last_email_sync');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
};

// Sync emails for a specific user
exports.syncUserEmails = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if Gmail is connected
    if (!user.gmail_connected) {
      console.error('Gmail not connected for user:', userId);
      return res.status(400).json({ message: 'Gmail not connected for this user' });
    }
    
    // Create a modified request object to pass to fetchEmails
    const modifiedReq = {
      user: user  // Set the user object directly
    };
    
    // Create a response handler
    let fetchResult = [];
    const responseHandler = {
      status: function(code) {
        return {
          json: function(data) {
            if (code === 200 && data.emails) {
              fetchResult = data.emails;
            }
            return data;
          }
        };
      }
    };
    
    // Call the fetchEmails function from the Gmail controller
    const gmailController = require('./gmail.controller');
    await gmailController.fetchEmails(modifiedReq, responseHandler);
    
    // Update last sync time
    user.last_email_sync = new Date();
    await user.save();
    
    return res.status(200).json({ 
      message: 'Emails synced successfully',
      lastSync: user.last_email_sync,
      emailsProcessed: fetchResult.length || 0
    });
  } catch (error) {
    console.error('Error syncing emails:', error);
    return res.status(500).json({ message: 'Error syncing emails', error: error.message });
  }
};

// Get email statistics for analytics
exports.getEmailStats = async (req, res) => {
  try {
    // Check if req.user exists before accessing properties
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Get the user ID from the authenticated request
    const userId = req.user.id;
    
    // For admin users, get stats for all emails
    // For regular users, get stats only for their emails
    let query = {};
    
    if (req.user.role !== 'admin') {
      query.userId = userId; // Make sure this matches your schema field name
    }
    
    // Get total count of analyzed emails
    const totalEmails = await Email.countDocuments(query);
    
    // Get count by risk level
    const byRisk = await Email.aggregate([
      { $match: query },
      { $group: { _id: '$phishingRisk', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    // Get count by day for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const byDay = await Email.aggregate([
      { 
        $match: { 
          ...query,
          createdAt: { $gte: sevenDaysAgo } 
        } 
      },
      {
        $group: {
          _id: { 
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } 
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Get average scores
    const avgScores = await Email.aggregate([
      { $match: query },
      { 
        $group: { 
          _id: null, 
          avgHeaderScore: { $avg: '$scores.header' },
          avgTextScore: { $avg: '$scores.text' },
          avgMetadataScore: { $avg: '$scores.metadata' },
          avgAttachmentsScore: { $avg: '$scores.attachments' },
          avgTotalScore: { $avg: '$scores.total' }
        } 
      }
    ]);
    
    // Return statistics
    return res.status(200).json({
      success: true,
      stats: {
        total: totalEmails,
        byRisk: byRisk,
        byDay: byDay,
        avgScores: avgScores.length > 0 ? avgScores[0] : {
          avgHeaderScore: 0,
          avgTextScore: 0,
          avgMetadataScore: 0,
          avgAttachmentsScore: 0,
          avgTotalScore: 0
        }
      }
    });
  } catch (error) {
    console.error('Error getting email statistics:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error getting email statistics', 
      error: error.message 
    });
  }
};

// Verify Gmail connection status
exports.verifyGmailConnection = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId, 'gmail_connected gmail_tokens');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Basic check if user has connection data in DB
    let isConnected = user.gmail_connected;
    
    // If user is marked as connected, perform additional verification
    if (isConnected && user.gmail_tokens) {
      try {
        // Check if token is still valid by making a simple request
        // This is a placeholder - in a real implementation, you would
        // make a lightweight API call to Gmail to verify the token
        // For example:
        // const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
        //   headers: { Authorization: `Bearer ${user.gmail_tokens.access_token}` }
        // });
        // isConnected = response.ok;
        
        // For now, we'll just return the stored status
        // In a real implementation, you would update the user record if verification fails
        // if (!isConnected) {
        //   await User.findByIdAndUpdate(userId, { gmail_connected: false });
        // }
      } catch (verifyError) {
        console.error('Error verifying Gmail token:', verifyError);
        // If verification fails, we'll still return the stored status
        // but log the error for debugging
      }
    }
    
    res.status(200).json({
      success: true,
      isConnected,
      lastVerified: new Date()
    });
  } catch (error) {
    console.error('Error verifying Gmail connection:', error);
    res.status(500).json({ message: 'Failed to verify Gmail connection' });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete all emails associated with this user
    await Email.deleteMany({ userId: req.params.id });
    
    // Delete the user
    await User.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'User and associated data deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};