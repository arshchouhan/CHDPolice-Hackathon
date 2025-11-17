import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { UnauthenticatedError, UnauthorizedError } from '../utils/errorHandler.js';

/**
 * Middleware to protect routes that require authentication
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Get token from cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      throw new UnauthenticatedError('Not authorized to access this route');
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        throw new UnauthenticatedError('User not found');
      }

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      throw new UnauthenticatedError('Not authorized, token failed');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to authorize specific roles
 * @param  {...String} roles - Roles that are allowed to access the route
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new UnauthorizedError(
        `User role ${req.user.role} is not authorized to access this route`
      );
    }
    next();
  };
};

export default { protect, authorize };
