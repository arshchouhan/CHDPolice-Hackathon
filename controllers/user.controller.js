const User = require('../models/Users');
const Email = require('../models/Email');
const mongoose = require('mongoose');

exports.dashboard = (req, res) => {
  res.status(200).json({ message: 'Welcome to the User Dashboard' });
};

// Get user profile with Gmail connection status
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId, 'username email gmail_connected last_email_sync');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
};

// Get current user information - used for authentication verification
exports.getCurrentUser = async (req, res) => {
  try {
    // req.user should be available from the authentication middleware
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }
    
    const userId = req.user.id;
    const user = await User.findById(userId, 'username email role gmail_connected');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    // Return minimal user information for security
    res.status(200).json({
      success: true,
      _id: user._id,
      email: user.email,
      username: user.username,
      role: user.role,
      gmail_connected: user.gmail_connected
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch user information',
      error: error.message 
    });
  }
};

// Get user's analyzed emails
exports.getUserEmails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { risk, status, flagged, sort = '-analyzedAt', page = 1, limit = 10 } = req.query;
    
    // Build query
    const query = { userId };
    
    if (risk) query.phishingRisk = risk;
    if (status) query.status = status;
    if (flagged === 'true') query.flagged = true;
    
    // Count total documents for pagination
    const total = await Email.countDocuments(query);
    
    // Get emails with pagination and sorting
    const emails = await Email.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      emails
    });
  } catch (error) {
    console.error('Error fetching user emails:', error);
    res.status(500).json({ message: 'Failed to fetch emails' });
  }
};

// Get Gmail connection status
exports.getGmailStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId, 'gmail_connected last_email_sync');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({
      success: true,
      gmailConnected: user.gmail_connected,
      lastSync: user.last_email_sync
    });
  } catch (error) {
    console.error('Error fetching Gmail status:', error);
    res.status(500).json({ message: 'Failed to fetch Gmail status' });
  }
};

// Get email statistics for the user
exports.getUserEmailStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get count by risk level
    const riskStats = await Email.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$phishingRisk', count: { $sum: 1 } } }
    ]);
    
    // Get count by status
    const statusStats = await Email.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Get count of flagged emails
    const flaggedCount = await Email.countDocuments({ userId, flagged: true });
    
    // Get total emails
    const totalEmails = await Email.countDocuments({ userId });
    
    res.status(200).json({
      success: true,
      stats: {
        byRisk: riskStats,
        byStatus: statusStats,
        flagged: flaggedCount,
        total: totalEmails
      }
    });
  } catch (error) {
    console.error('Error fetching user email statistics:', error);
    res.status(500).json({ message: 'Failed to fetch email statistics' });
  }
};