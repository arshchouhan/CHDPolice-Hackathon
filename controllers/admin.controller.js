import Admin from '../models/Admin.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import config from '../config/config.js';

const { jwtSecret: JWT_SECRET, googleClientId: GOOGLE_CLIENT_ID } = config;

// Initialize Google OAuth2 client
const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Handle Google Sign-In for admin
 */
export const googleSignIn = async (req, res) => {
  try {
    const { credential } = req.query;

    if (!credential) {
      return res.status(400).json({ success: false, message: 'Missing credential' });
    }

    // Verify the Google ID token
    const ticket = await oauth2Client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // Check if admin with this email exists
    let admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(403).json({
        success: false,
        message: 'No admin account found with this email',
      });
    }

    // Update last login time
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error('Google sign-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during Google Sign-In',
      error: error.message,
    });
  }
};

/**
 * Verify admin token
 */
/**
 * Admin login with email and password
 */
export const login = async (req, res) => {
  try {
    console.log('Login request body:', req.body);
    console.log('Raw request body:', req.rawBody);

    if (!req.body) {
      return res.status(400).json({ success: false, message: 'Request body is missing' });
    }

    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required',
        received: { email: !!email, password: !!password }
      });
    }

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Check if admin exists
    const admin = await Admin.findOne({ email });
    if (!admin) {
      console.log('Admin not found for email:', email);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      console.log('Invalid password for admin:', email);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Update last login time
    admin.lastLogin = new Date();
    await admin.save();

    // Set cookie and send response
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const verifyToken = async (req, res) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.json({ authenticated: false });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const admin = await Admin.findById(decoded.id).select('-password');
    
    if (!admin) {
      return res.json({ authenticated: false });
    }

    res.json({
      authenticated: true,
      user: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.json({ authenticated: false });
  }
};
