import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import config from '../config/config.js';
const { jwtSecret: JWT_SECRET } = config;

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if required fields are provided
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists' 
      });
    }

    // Create new user
    user = new User({
      name,
      email,
      password
    });

    await user.save();

    // Create and return JWT token
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: '5d' },
      (err, token) => {
        if (err) {
          console.error('JWT Error:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Error generating token' 
          });
        }
        res.json({ 
          success: true,
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            gmail_connected: user.gmail_connected || false
          }
        });
      }
    );
  } catch (err) {
    console.error('Error in user registration:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists and include password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Validate password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Create and return JWT token
    const payload = {
      user: {
        id: user._id,
        role: user.role || 'user'
      }
    };

    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: '5d' },
      (err, token) => {
        if (err) {
          console.error('JWT Sign Error:', err);
          return res.status(500).json({
            success: false,
            message: 'Error generating token'
          });
        }
        
        // Prepare user data for response (exclude sensitive fields)
        const userData = {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role || 'user',
          gmail_connected: user.gmail_connected || false
        };

        res.json({ 
          success: true,
          token,
          user: userData
        });
      }
    );
  } catch (err) {
    console.error('Error in user login:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

/**
 * @route   GET /api/auth/user
 * @desc    Get current user data
 * @access  Private
 */
router.get('/user', async (req, res) => {
  try {
    // User is already available in req.user due to the auth middleware
    const user = await User.findById(req.user.id).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

/**
 * @route   GET /api/auth/verify-token
 * @desc    Verify JWT token and return user data
 * @access  Private
 */
router.get('/verify-token', async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        authenticated: false, 
        message: 'No token provided' 
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ 
        authenticated: false, 
        message: 'No token provided' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.user.id).select('-password');
    if (!user) {
      return res.status(401).json({ 
        authenticated: false, 
        message: 'User not found' 
      });
    }

    // Return user data
    res.json({
      authenticated: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        gmail_connected: user.gmail_connected || false
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        authenticated: false, 
        message: 'Invalid token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        authenticated: false, 
        message: 'Token expired' 
      });
    }
    res.status(500).json({ 
      authenticated: false, 
      message: 'Server error during token verification' 
    });
  }
});

export default router;
