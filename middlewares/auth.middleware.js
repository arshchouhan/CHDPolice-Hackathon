const jwt = require('jsonwebtoken');

// Authentication middleware
const authenticateUser = (req, res, next) => {
  // Try to get token from multiple sources
  let token = null;
  let tokenSource = '';
  
  // Check Authorization header first
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
    tokenSource = 'Authorization header';
  } 
  // Then check cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
    tokenSource = 'Cookie';
  }
  // Finally check query string (for redirect scenarios)
  else if (req.query && req.query.token) {
    token = req.query.token;
    tokenSource = 'Query string';
  }
  
  // Check if accessing auth-related pages
  const isAuthPage = req.path.includes('/login') || req.path.includes('/signup');
  
  if (!token) {
    console.log('No token found in request');
    if (isAuthPage) {
      // Allow access to auth pages without token
      return next();
    }
    return res.status(401).json({ 
      message: 'Authentication required', 
      redirectTo: '/login.html'
    });
  }

  try {
    // Validate token format before verification
    if (typeof token !== 'string' || token.trim() === '') {
      throw new Error('Invalid token format');
    }
    
    console.log(`Verifying token from ${tokenSource} (first 10 chars): ${token.substring(0, 10)}...`);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    console.log('Token verified successfully for user ID:', decoded.id);
    
    // If user is authenticated and trying to access auth pages, redirect to dashboard
    if (isAuthPage) {
      const redirectPath = decoded.role === 'admin' ? '/admin-dashboard.html' : '/index.html';
      return res.redirect(redirectPath);
    }
    
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    
    // Clear invalid token from cookie
    res.clearCookie('token');
    
    // Send specific error message based on error type
    let errorMessage = 'Invalid or expired token';
    if (err.name === 'JsonWebTokenError' && err.message === 'jwt malformed') {
      errorMessage = 'Token format is invalid. Please log in again.';
      console.log('JWT malformed error detected. Token cleared.');
    } else if (err.name === 'TokenExpiredError') {
      errorMessage = 'Your session has expired. Please log in again.';
    }
    
    if (isAuthPage) {
      // Allow access to auth pages if token is invalid
      return next();
    }
    
    res.status(401).json({ 
      message: errorMessage,
      error: err.name,
      redirectTo: '/login.html?error=' + encodeURIComponent(err.name)
    });
  }
};

module.exports = authenticateUser;
