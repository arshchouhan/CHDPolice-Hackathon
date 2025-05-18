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