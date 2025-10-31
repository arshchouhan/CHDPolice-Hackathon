import jwt from 'jsonwebtoken';
import User from '../../../models/User.js';
// import Admin from '../models/Admin.js';

// Middleware to verify JWT token
export const requireAuth = async (req, res, next) => {
  try {
    // Get token from header or cookie
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', JSON.stringify(decoded, null, 2));
    
    // Get user ID from token (support both direct ID and nested user object)
    const userId = decoded.id || (decoded.user && decoded.user.id);
    console.log('Extracted userId:', userId);
    
    if (!userId) {
      console.error('No user ID found in token');
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token format' 
      });
    }
    
    // Find user by ID from token
    console.log('Looking for user with ID:', userId);
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      console.error('User not found in database for ID:', userId);
      // Check if any users exist in the database at all
      const anyUser = await User.findOne();
      console.log('Any user in database?', anyUser ? 'Yes' : 'No');
      
      return res.status(401).json({ 
        success: false, 
        message: 'User not found',
        error: 'No user found with the provided ID',
        userId: userId.toString()
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error during authentication' 
    });
  }
};

// Middleware to check if user is admin
export const requireAdmin = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Find admin by user ID
    const admin = await Admin.findOne({ user: req.user._id });
    
    if (!admin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }

    // Attach admin to request object
    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during admin verification' 
    });
  }
};

// Generate JWT token
export const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Set JWT token as HTTP-only cookie
export const setAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};
