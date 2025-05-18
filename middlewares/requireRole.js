const jwt = require('jsonwebtoken');

const requireRole = (role) => {
  return (req, res, next) => {
    // Try to get token from multiple sources
    let token = null;
    
    // Check Authorization header first
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } 
    // Then check cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    if (!token) {
      console.log('No token found in request');
      return res.status(401).json({ message: 'Authentication required' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check role if specified
      if (role && decoded.role !== role) {
        console.log(`User role ${decoded.role} does not match required role ${role}`);
        return res.status(403).json({ message: 'Access denied' });
      }
      
      req.user = decoded;
      next();
    } catch (err) {
      console.error('Token verification error:', err);
      res.status(401).json({ message: 'Invalid or expired token' });
    }
  };
};

// Middleware to authenticate token without role check
const authenticateToken = (req, res, next) => {
  // Try to get token from multiple sources
  let token = null;
  
  // Check Authorization header first
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } 
  // Then check cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  
  if (!token) {
    console.log('No token found in request');
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { requireRole, authenticateToken };
