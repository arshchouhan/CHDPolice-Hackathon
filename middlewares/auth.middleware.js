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
  const isAdminPage = req.path.includes('/admin');
  
  if (!token) {
    console.log('No token found in request');
    if (isAuthPage) {
      // Allow access to auth pages without token
      return next();
    }
    
    // Build redirect URL with proper parameters
    let redirectUrl = '/login.html';
    const params = new URLSearchParams();
    params.append('error', 'not_authenticated');
    
    // Add redirect parameter for admin pages
    if (isAdminPage) {
      params.append('redirect', 'admin');
    } else if (!isAuthPage) {
      // For non-admin, non-auth pages, store the current path
      params.append('redirect', req.path);
    }
    
    redirectUrl += '?' + params.toString();
    
    return res.status(401).json({ 
      message: 'Authentication required', 
      redirectTo: redirectUrl
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
    
    // If user is authenticated and trying to access auth pages, redirect to appropriate page
    if (isAuthPage) {
      // Check for redirect parameter
      const redirectTo = req.query.redirect;
      let redirectPath;
      
      if (redirectTo) {
        // Handle admin redirect
        if (redirectTo === 'admin') {
          redirectPath = decoded.role === 'admin' ? '/admin-dashboard.html' : '/index.html';
        } else {
          // For other redirects, ensure they start with /
          redirectPath = redirectTo.startsWith('/') ? redirectTo : '/' + redirectTo;
        }
      } else {
        // Default redirect based on role
        redirectPath = decoded.role === 'admin' ? '/admin-dashboard.html' : '/index.html';
      }
      
      return res.redirect(redirectPath);
    }
    
    // For admin pages, check if user has admin role
    if (isAdminPage && decoded.role !== 'admin') {
      return res.status(403).json({
        message: 'Not authorized to access admin area',
        redirectTo: '/login.html?error=not_authorized'
      });
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
