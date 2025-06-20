const jwt = require('jsonwebtoken');
const User = require('../models/Users');
const Admin = require('../models/Admin');

const requireAdmin = async (req, res, next) => {
    try {
        // Get token from header or cookie
        const token = req.header('Authorization')?.replace('Bearer ', '') || 
                     req.cookies?.token || 
                     req.query?.token;

        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: 'No token provided',
                code: 'NO_TOKEN'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if user is admin
        const admin = await Admin.findById(decoded.id);
        if (!admin) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required',
                code: 'ADMIN_ACCESS_REQUIRED'
            });
        }

        // Add admin to request object for both admin and user properties
        req.admin = admin;
        // Also set req.user for compatibility with existing code
        req.user = {
          id: admin._id,
          _id: admin._id,
          email: admin.email,
          username: admin.username,
          role: 'admin',
          ...admin._doc // Include all other admin properties
        };
        
        console.log('Admin authenticated:', {
          id: admin._id,
          email: admin.email,
          role: 'admin'
        });
        
        next();
    } catch (error) {
        console.error('Admin auth error:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
            code: 'INVALID_TOKEN',
            error: error.message
        });
    }
};

module.exports = requireAdmin;
