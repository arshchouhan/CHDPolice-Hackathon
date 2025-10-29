import { Router } from 'express';
import bcrypt from 'bcryptjs';
import Admin from '../models/admin.model.js';
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

// Admin login with enhanced logging and refresh token
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);

    const admin = await Admin.findOne({ email });
    
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

    // Generate tokens
    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET || 'jwt-secret',
      { expiresIn: '7d' } // Extend token validity
    );

    // Store more data in session
    req.session.adminId = admin._id;
    req.session.adminEmail = admin.email;
    req.session.token = token;
    await req.session.save();

    // Set cookie with extended expiry
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Force logout - clear all sessions and tokens
router.post('/force-logout', (req, res) => {
  try {
    // Clear session
    req.session.destroy();
    
    // Clear cookies
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    res.clearCookie('connect.sid');
    
    res.status(200).json({
      success: true,
      message: 'Successfully logged out from all sessions'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
});

// Update verify-token to handle token refresh
router.get('/verify-token', async (req, res) => {
  try {
    const token = 
      req.headers.authorization?.split(' ')[1] ||
      req.cookies.token ||
      req.session?.token;

    if (!token) {
      throw new Error('No token found');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jwt-secret');
    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      throw new Error('Admin not found');
    }

    // Refresh token if needed
    const newToken = jwt.sign(
      { id: admin._id, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET || 'jwt-secret',
      { expiresIn: '7d' }
    );

    res.cookie('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      authenticated: true,
      token: newToken,
      admin: {
        id: admin._id,
        email: admin.email,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({
      success: false,
      authenticated: false,
      message: 'Token verification failed'
    });
  }
});

// Refresh token endpoint
router.post('/refresh-token', async (req, res) => {
  try {
    const token = req.cookies?.token || req.session?.token;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token available'
      });
    }

    // Verify the existing token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jwt-secret', { ignoreExpiration: true });
    
    // Check if the admin still exists
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Issue a new token
    const newToken = jwt.sign(
      { id: admin._id, email: admin.email },
      process.env.JWT_SECRET || 'jwt-secret',
      { expiresIn: '24h' }
    );

    // Update the token in the session and cookies
    req.session.token = newToken;
    await req.session.save();

    res.cookie('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Changed from 'none' to 'lax' for better compatibility
      path: '/',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      success: true,
      token: newToken,
      admin: {
        id: admin._id,
        email: admin.email
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    
    // Clear invalid tokens
    if (req.session) {
      req.session.destroy();
    }
    res.clearCookie('token');
    
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
      error: error.message
    });
  }
});

// Protected admin route example
router.get('/dashboard', requireAdmin, (req, res) => {
  res.json({ success: true, message: 'Welcome to admin dashboard' });
});

export default router;
