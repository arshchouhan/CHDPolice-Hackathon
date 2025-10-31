import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import config from '../config/config.js';

const { jwtSecret } = config;

/**
 * Middleware to verify admin token
 */
export const requireAdmin = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token, authorization denied' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, jwtSecret);
    
    // Check if admin exists and is active
    const admin = await Admin.findOne({ 
      _id: decoded.id, 
      isActive: true 
    }).select('-password');

    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Admin not found or inactive' 
      });
    }

    // Add admin to request object
    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    
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
      message: 'Server error' 
    });
  }
};

/**
 * Middleware to check if user is superadmin
 */
export const requireSuperAdmin = [
  requireAdmin,
  (req, res, next) => {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Superadmin access required' 
      });
    }
    next();
  }
];
