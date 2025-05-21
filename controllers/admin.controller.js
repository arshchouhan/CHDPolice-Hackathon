const Email = require('../models/Email');
const User = require('../models/Users');

exports.dashboard = (req, res) => {
  res.status(200).json({ message: 'Welcome to the Admin Dashboard' });
};

// Get all analyzed emails
exports.getAllEmails = async (req, res) => {
  try {
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
    console.log('Admin triggering email sync for user:', userId);
    
    // Check if user exists
    const user = await User.findById(userId, 'gmail_connected gmail_tokens');
    if (!user) {
      console.error('User not found for email sync:', userId);
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if Gmail is connected
    if (!user.gmail_connected) {
      console.error('Gmail not connected for user:', userId);
      return res.status(400).json({ message: 'Gmail not connected for this user' });
    }
    
    // We need to import the Gmail controller to use its fetchEmails functionality
    const gmailController = require('./gmail.controller');
    
    // Create a mock request object with the user ID
    const mockReq = {
      user: { id: userId }
    };
    
    // Create a mock response object to capture the result
    let emailCount = 0;
    const mockRes = {
      status: function(statusCode) {
        this.statusCode = statusCode;
        return this;
      },
      json: function(data) {
        this.data = data;
        if (data.emails) {
          emailCount = data.emails.length;
        }
        return this;
      }
    };
    
    // Call the fetchEmails function from the Gmail controller
    await gmailController.fetchEmails(mockReq, mockRes);
    
    // Check if the fetch was successful
    if (mockRes.statusCode !== 200) {
      console.error('Failed to fetch emails:', mockRes.data);
      return res.status(mockRes.statusCode || 500).json(mockRes.data || { message: 'Failed to fetch emails' });
    }
    
    // Update last_email_sync in the database
    await User.findByIdAndUpdate(userId, { last_email_sync: new Date() });
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Emails synced successfully',
      emailCount,
      lastSync: new Date()
    });
  } catch (error) {
    console.error('Error syncing emails:', error);
    res.status(500).json({ message: 'Failed to sync emails', error: error.message });
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