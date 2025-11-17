// src/routes/auth.route.js
import { Router } from 'express';
import User from '../models/User.js';
import { generateToken } from '../utils/generateTokens.js';
import formatUser from '../utils/formatUser.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });

    let user = await User.findOne({ email });
    if (user)
      return res.status(400).json({ success: false, message: 'User already exists' });

    user = new User({ name, email, password });
    await user.save();

    const token = generateToken(user);
    res.json({ success: true, token, user: formatUser(user) });
  } catch (err) {
    console.error('Error in registration:', err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
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

    const user = await User.findOne({ email }).select('+password');
    if (!user)
      return res.status(400).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(400).json({ success: false, message: 'Invalid credentials' });

    const token = generateToken(user);
    res.json({ success: true, token, user: formatUser(user) });
  } catch (err) {
    console.error('Error in login:', err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

/**
 * @route   GET /api/auth/user
 * @desc    Get current user data
 * @access  Private
 */
router.get('/user', authMiddleware, (req, res) => {
  res.json({ success: true, user: formatUser(req.user) });
});

/**
 * @route   GET /api/auth/verify-token
 * @desc    Verify JWT token and return user data
 * @access  Private
 */
router.get('/verify-token', authMiddleware, async (req, res) => {
  try {
    // If we get here, the token is valid and user is attached to req by authMiddleware
    res.json({
      authenticated: true,
      user: formatUser(req.user)
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ authenticated: false, message: 'Invalid or expired token' });
  }
});

export default router;
