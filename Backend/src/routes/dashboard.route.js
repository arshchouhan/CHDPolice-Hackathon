import express from 'express';
import { requireAuth as auth } from '../middlewares/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Test route to verify authentication is working
router.get('/test-auth', auth, (req, res) => {
  console.log('Test auth route hit', { user: req.user });
  res.json({ success: true, user: req.user });
});

// @route   GET /stats
// @desc    Get dashboard statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  console.log('Dashboard stats endpoint hit', { user: req.user }); // Debug log
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    // Mock data - replace with actual data from your database
    const stats = {
      name: user.name || user.email.split('@')[0],
      email: user.email,
      emailsScanned: 0,
      threatsDetected: 0,
      securityScore: 85, // Example score
      recentActivity: [
        {
          title: 'Account Created',
          description: 'Your account was successfully created',
          timestamp: new Date().toLocaleString()
        }
      ]
    };

    res.json(stats);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/email/scan
// @desc    Scan email content for threats
// @access  Private
router.post('/scan', auth, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ msg: 'Email content is required' });
    }

    // Here you would implement your email scanning logic
    // This is a placeholder implementation
    const isThreat = content.toLowerCase().includes('phishing') || 
                     content.toLowerCase().includes('urgent') ||
                     content.toLowerCase().includes('password');

    // Log this scan in user's activity
    await User.findByIdAndUpdate(
      req.user.id,
      { $push: { activity: { action: 'email_scan', details: { threatDetected: isThreat } } } },
      { new: true }
    );

    res.json({
      isThreat,
      message: isThreat ? 'Potential threat detected' : 'No threats detected',
      scanDetails: {
        keywordsFound: isThreat ? ['suspicious_keyword'] : [],
        score: isThreat ? 75 : 10, // Example scores
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

export default router;
