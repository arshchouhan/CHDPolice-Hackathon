import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/admin.model.js';
import { generateToken } from '../utils/generateTokens.js';
import config from '../config/config.js';

const router = Router();

/**
 * @route   POST /api/admin/login
 * @desc    Authenticate admin and get token
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt with email:', req.body.email);
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // 1️⃣ Find admin by email
    console.log('Looking for admin with email:', email);
    const admin = await Admin.findOne({ email }).select('+password');
    
    if (!admin) {
      console.log('No admin found with email:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials',
        details: 'No admin found with this email'
      });
    }

    console.log('Admin found, comparing passwords...');
    
    // 2️⃣ Compare password using the model method
    const isMatch = await admin.comparePassword(password);
    
    if (!isMatch) {
      console.log('Password does not match');
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials',
        details: 'Incorrect password'
      });
    }

    // 3️⃣ Generate JWT
    const token = generateToken(admin);

    // 4️⃣ Send success response
    res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: 'admin',
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Server error during admin login' });
  }
});

/**
 * @route   GET /api/admin/verify-token
 * @desc    Verify admin token and return admin data
 * @access  Private
 */
router.get('/verify-token', async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided, authorization denied' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token, authorization denied' 
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, config.jwtSecret);
      
      // Check if user exists and is admin
      const admin = await Admin.findById(decoded.user.id).select('-password');
      
      if (!admin || admin.role !== 'admin') {
        return res.status(401).json({ 
          success: false, 
          message: 'Not authorized as admin' 
        });
      }

      // Return success with admin data
      return res.json({
        success: true,
        authenticated: true,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role
        }
      });
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ 
        success: false, 
        message: 'Token is not valid',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Error in verify-token route:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during token verification',
      error: error.message
    });
  }
});

export default router;
