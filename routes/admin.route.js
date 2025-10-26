import { Router } from 'express';
import bcrypt from 'bcryptjs';
import Admin from '../models/admin.model.js';
import User from '../models/User.js';
import Email from '../models/Email.js';
import { requireAdmin } from '../middlewares/auth.js';
import jwt from 'jsonwebtoken';

const router = Router();

// Admin registration route
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Registration attempt for:', email);

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new Admin({
      email,
      password: hashedPassword
    });

    await admin.save();
    console.log('Admin registered successfully:', email);

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Admin login with enhanced logging
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);

    const admin = await Admin.findOne({ email });
    console.log('Admin found:', !!admin);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = password === admin.password || await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email },
      process.env.JWT_SECRET || 'jwt-secret',
      { expiresIn: '24h' }
    );

    // Set token in header first
    res.setHeader('Authorization', `Bearer ${token}`);

    // Then set in cookie
    res.cookie('token', token, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000
    });

    // Store in session
    req.session.token = token;
    req.session.adminId = admin._id;
    await req.session.save();

    console.log('Token set in:', {
      header: !!res.getHeader('Authorization'),
      cookie: !!token,
      session: !!req.session.token
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        email: admin.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed: ' + error.message
    });
  }
});

// Update verify-token to check multiple token locations
router.get('/verify-token', async (req, res) => {
  try {
    const token = 
      req.headers.authorization?.split(' ')[1] ||
      req.cookies.token ||
      req.session?.token;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: 'No token found'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jwt-secret');
    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: 'Invalid token'
      });
    }

    res.json({
      success: true,
      authenticated: true,
      admin: {
        id: admin._id,
        email: admin.email
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      authenticated: false,
      message: error.message
    });
  }
});

// Get admin dashboard data
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    // Get total users count
    const totalUsers = await User.countDocuments();
    
    // Get active users (users who logged in within the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: thirtyDaysAgo } });
    
    // Get email statistics (replace with your actual email model)
    const emailStats = await Email.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          phishing: {
            $sum: {
              $cond: [{ $eq: ['$isPhishing', true] }, 1, 0]
            }
          },
          clean: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$isPhishing', false] }, { $ne: ['$riskScore', null] }] },
                1,
                0
              ]
            }
          },
          suspicious: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$riskScore', null] }, { $gte: ['$riskScore', 50] }, { $lt: ['$riskScore', 80] }] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Get recent users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('-password');

    // Get recent emails (replace with your actual email model)
    const recentEmails = await Email.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email');

    // Format the response
    const stats = {
      totalUsers,
      activeUsers,
      emailsAnalyzed: emailStats[0]?.total || 0,
      threatsDetected: emailStats[0]?.phishing || 0,
      emailStats: {
        total: emailStats[0]?.total || 0,
        phishing: emailStats[0]?.phishing || 0,
        clean: emailStats[0]?.clean || 0,
        suspicious: emailStats[0]?.suspicious || 0
      },
      recentUsers,
      recentEmails: recentEmails.map(email => ({
        id: email._id,
        subject: email.subject || 'No Subject',
        from: email.from,
        riskScore: email.riskScore || 0,
        isPhishing: email.isPhishing || false,
        date: email.createdAt,
        user: email.user ? {
          id: email.user._id,
          name: email.user.name,
          email: email.user.email
        } : null
      }))
    };

    res.json({
      success: true,
      ...stats
    });
  } catch (error) {
    console.error('Error fetching admin dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
});

export default router;
