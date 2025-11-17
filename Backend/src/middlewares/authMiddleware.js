// src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import User from '../models/User.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('🔍 Incoming Auth Header:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ authenticated: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔹 Extracted Token:', token);

    // Verify token and handle different error cases
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
      console.log('✅ Decoded JWT:', decoded);
    } catch (verifyError) {
      console.error('❌ JWT Verification Error:', verifyError);
      if (verifyError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          authenticated: false, 
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({ 
        authenticated: false, 
        message: 'Invalid token',
        code: 'INVALID_TOKEN',
        details: verifyError.message
      });
    }

    // Find user by ID from token
    const user = await User.findById(decoded.user?.id).select('-password');
    if (!user) {
      console.error('❌ User not found for token');
      return res.status(401).json({ 
        authenticated: false, 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Auth Middleware Error:', error);

    if (error.name === 'JsonWebTokenError')
      return res.status(401).json({ authenticated: false, message: 'Invalid token format' });

    if (error.name === 'TokenExpiredError')
      return res.status(401).json({ authenticated: false, message: 'Token expired' });

    res.status(500).json({ authenticated: false, message: 'Server error during token verification' });
  }
};
