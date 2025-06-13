const Email = require('../models/Email');
const User = require('../models/Users');
const Admin = require('../models/Admin');
const { google } = require('googleapis');

// Helper function to check if user is admin
const isAdmin = async (user) => {
  try {
    // If user is already an object with role
    if (user && user.role === 'admin') {
      return true;
    }
    
    // If user is an ID string, look up in database
    if (typeof user === 'string') {
      const admin = await Admin.findById(user);
      return !!admin;
    }
    
    // If user is an object with id property
    if (user && user.id) {
      const admin = await Admin.findById(user.id);
      return !!admin;
    }
    
    return false;
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
    // Debug log the request object to see what's available
    console.log('=== GET /api/admin/emails ===');
    console.log('Request user:', JSON.stringify(req.user, null, 2));
    console.log('Request query:', JSON.stringify(req.query, null, 2));
    
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      console.error('User not authenticated or missing user ID');
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.'
      });
    }

    // Verify admin role using the complete user object
    console.log('Verifying admin role for user:', req.user.id);
    const adminCheck = await isAdmin(req.user);
    if (!adminCheck) {
      console.error('Access denied - User is not an admin:', req.user.id);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    
    console.log('Admin verification successful for user:', req.user.id);

    const { risk, userId, status, flagged, sort = '-analyzedAt', page = 1, limit = 20 } = req.query;
    
    try {
      // Build query
      const query = {};
      
      // Add filters if provided
      if (risk) {
        query.phishingRisk = risk;
        console.log('Filtering by risk level:', risk);
      }
      
      if (userId) {
        query.userId = userId;
        console.log('Filtering by user ID:', userId);
      }
      
      if (status) {
        query.status = status;
        console.log('Filtering by status:', status);
      }
      
      if (flagged === 'true') {
        query.flagged = true;
        console.log('Filtering by flagged status: true');
      }
      
      console.log('Final query:', JSON.stringify(query, null, 2));
      
      // Count total documents for pagination
      console.log('Counting total emails matching query...');
      const total = await Email.countDocuments(query);
      console.log(`Found ${total} emails matching query`);
      
      // Calculate pagination values
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const skip = (pageNum - 1) * limitNum;
      
      console.log(`Fetching emails - page ${pageNum}, limit ${limitNum}, skip ${skip}`);
      
      // Get emails with pagination and sorting
      const emails = await Email.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'username email')
        .lean(); // Convert to plain JavaScript objects
      
      console.log(`Successfully fetched ${emails.length} emails`);
      
      // Ensure all emails have required fields
      const processedEmails = emails.map(email => ({
        ...email,
        id: email._id ? email._id.toString() : null,
        _id: email._id ? email._id.toString() : null,
        userId: email.userId ? {
          ...email.userId,
          id: email.userId._id ? email.userId._id.toString() : null,
          _id: email.userId._id ? email.userId._id.toString() : null
        } : null
      }));
      
      const response = {
        success: true,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum) || 1,
        limit: limitNum,
        emails: processedEmails
      };
      
      console.log('Sending response with email data');
      return res.status(200).json(response);
      
    } catch (dbError) {
      console.error('Database error in getAllEmails:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Database error occurred while fetching emails',
        error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }
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
exports.syncUserEmails = async (req, res) => {
  try {
    const userId = req.params.id;
    console.log(`Starting email sync for user: ${userId}`);
    
    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      console.log(`User not found: ${userId}`);
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if Gmail is connected for this user
    if (!user.gmail_connected) {
      console.log(`Gmail not connected for user: ${userId}`);
      return res.status(400).json({ message: 'Gmail not connected for this user' });
    }
    
    // Check if tokens exist
    if (!user.gmail_access_token || !user.gmail_refresh_token) {
      console.log(`Missing Gmail tokens for user: ${userId}`);
      user.gmail_connected = false;
      await user.save();
      return res.status(400).json({ 
        message: 'Gmail tokens are missing or invalid',
        needsReconnect: true
      });
    }
    
    // Create a modified request object to pass to fetchEmails
    const modifiedReq = {
      user: {
        id: user._id,
        _id: user._id
      }
    };
    
    // Create a response handler that captures the result
    let emailCount = 0;
    let success = false;
    let errorMessage = '';
    let errorCode = 400;
    let needsReconnect = false;
    
    const responseHandler = {
      status: function(code) {
        return {
          json: function(data) {
            errorCode = code;
            if (code >= 200 && code < 300) {
              success = true;
              emailCount = data.emailCount || (data.emails ? data.emails.length : 0);
              console.log(`Successfully processed ${emailCount} emails for user ${userId}`);
            } else {
              success = false;
              errorMessage = data.message || 'Unknown error';
              console.log(`Error syncing emails for user ${userId}: ${errorMessage}`);
              
              // Check if this is an authentication error requiring reconnection
              if (code === 401 && (data.action === 'reconnect' || data.action === 'reconnect_required')) {
                needsReconnect = true;
                console.log(`Authentication error requiring reconnection for user ${userId}`);
                
                // Mark user as disconnected
                user.gmail_connected = false;
                
                // If it's a permanent token issue (invalid_grant), clear the tokens
                if (data.action === 'reconnect_required' || data.error === 'invalid_grant') {
                  console.log(`Clearing Gmail tokens for user ${userId} due to invalid_grant`);
                  user.gmail_access_token = null;
                  user.gmail_refresh_token = null;
                  user.gmail_token_expiry = null;
                }
              }
            }
            return data;
          }
        };
      }
    };
    
    try {
      // Call the fetchEmails function from the Gmail controller
      console.log(`Calling fetchEmails for user ${userId}`);
      const gmailController = require('./gmail.controller');
      await gmailController.fetchEmails(modifiedReq, responseHandler);
    } catch (fetchError) {
      console.error(`Unhandled error in fetchEmails for user ${userId}:`, fetchError);
      // If there was an unhandled error, mark as failed
      success = false;
      errorMessage = fetchError.message || 'Unexpected error during email fetch';
      errorCode = 500;
      
      // Check if it's an OAuth error
      if (fetchError.response && fetchError.response.data && fetchError.response.data.error === 'invalid_grant') {
        console.log(`Invalid grant error caught in admin controller for user ${userId}`);
        needsReconnect = true;
        user.gmail_connected = false;
        user.gmail_access_token = null;
        user.gmail_refresh_token = null;
        user.gmail_token_expiry = null;
      }
    }
    
    // Update last sync time only on success or if not an auth error
    if (success || !needsReconnect) {
      console.log(`Updating last sync time for user ${userId}`);
      user.last_email_sync = new Date();
    }
    
    // Always save user changes
    await user.save();
    
    if (!success) {
      console.log(`Returning error response for user ${userId}: ${errorMessage}`);
      return res.status(errorCode).json({
        message: `Failed to sync emails: ${errorMessage}`,
        lastSync: user.last_email_sync,
        needsReconnect: needsReconnect,
        error: errorMessage
      });
    }
    
    // If we reached here, the sync was successful
    console.log(`Email sync successful for user ${userId}, processed ${emailCount} emails`);
    return res.status(200).json({
      message: 'Emails synced successfully',
      lastSync: user.last_email_sync,
      emailCount: emailCount,
      success: true
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